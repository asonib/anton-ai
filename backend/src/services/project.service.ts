import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Project } from '@prisma/client';
import type { ProjectSettings } from '../config/projects.config';
import { ConflictException, ProjectWorkspaceException, ResourceNotFoundException, ValidationException } from '../exceptions';
import { toProjectChangeDTO, toProjectDTO } from '../models/mappers';
import type { ProjectRepository } from '../models/repositories/project.repository';
import type {
  CreateProjectChangeInput,
  ProjectChangeRepository,
  ProjectChangeWithProject,
} from '../models/repositories/projectChange.repository';
import type {
  ProjectChangeConflictDTO,
  ProjectChangeDetailDTO,
  ProjectChangeDTO,
  ProjectChangesResultDTO,
  FolderListingDTO,
  ProjectDetailDTO,
  ProjectDTO,
  ProjectsConfigDTO,
} from '../models/types';
import { logger } from '../utils/logger';
import { parseProjectChanges } from '../utils/projectChangeParser';
import { isInsideDir, matchLineEndings, sha256 } from '../utils/projectPaths';
import type { ProjectContext, ProjectContextService } from './projectContext.service';
import type { ProjectFileService } from './projectFiles.service';

export interface AddGithubProjectInput {
  url: string;
  ref?: string;
  name?: string;
}

export interface AddLocalProjectInput {
  path: string;
  name?: string;
}

export interface CreateProjectInput {
  name: string;
}

/** Parsed assistant reply, ready to be stored: cleaned Markdown + change rows (without messageId). */
export interface ProposedChanges {
  content: string;
  rows: Omit<CreateProjectChangeInput, 'messageId' | 'userId' | 'createdAt'>[];
}

/** Max sub-folders returned by the folder picker. */
export const FOLDER_LIST_LIMIT = 500;

/** Comparable form of a path (Windows paths are case-insensitive). */
const samePathKey = (p: string) => {
  const resolved = path.resolve(p);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
};

const GITHUB_URL = /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/i;
const GITHUB_SHORTHAND = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?$/;
const GIT_REF = /^(?!-)(?!.*\.\.)(?!.*\/\/)[A-Za-z0-9._/-]{1,200}(?<![./])$/;

/**
 * Projects attached to the chat: registers local folders (inside WORKSPACE_ROOTS) and GitHub clones,
 * builds model context, turns model replies into reviewable changes and applies / discards / reverts them.
 * All methods take `userId` first; other users' projects and changes are reported as 404.
 */
export class ProjectService {
  constructor(
    private readonly projects: ProjectRepository,
    private readonly changes: ProjectChangeRepository,
    private readonly files: ProjectFileService,
    private readonly context: ProjectContextService,
    private readonly settings: ProjectSettings,
  ) {}

  getConfig(): ProjectsConfigDTO {
    return {
      localEnabled: this.settings.workspaceRoots.length > 0,
      workspaceRoots: [...this.settings.workspaceRoots],
      projectsDir: this.settings.projectsDir,
      contextMaxChars: this.settings.contextMaxChars,
    };
  }

  async list(userId: string): Promise<ProjectDTO[]> {
    return (await this.projects.listForUser(userId)).map(toProjectDTO);
  }

  async get(userId: string, projectId: string): Promise<ProjectDetailDTO> {
    return this.withStats(await this.requireProject(userId, projectId));
  }

  /**
   * Folder picker: the sub-folders of `requested` (default: PROJECTS_DIR, else the first workspace root).
   * Only folders inside WORKSPACE_ROOTS can be browsed; hidden, dependency and build folders are skipped.
   * Each entry says whether it is a git repo and which of the user's projects already points at it.
   */
  async browse(userId: string, requested?: string): Promise<FolderListingDTO> {
    const roots = await this.realRoots();
    const start =
      requested?.trim() ||
      (roots.some((r) => isInsideDir(r, this.settings.projectsDir)) ? this.settings.projectsDir : roots[0]);
    const { real, root } = await this.resolveWorkspaceDir(start, 'path');
    const [folders, projects] = await Promise.all([this.files.listSubfolders(real, FOLDER_LIST_LIMIT), this.projects.listForUser(userId)]);
    const byRoot = new Map(projects.map((p) => [samePathKey(p.rootPath), p.id]));
    return {
      roots,
      root,
      path: real,
      parent: samePathKey(real) === samePathKey(root) ? null : path.dirname(real),
      projectId: byRoot.get(samePathKey(real)) ?? null,
      entries: folders.map((f) => {
        const full = path.join(real, f.name);
        return { name: f.name, path: full, isGitRepo: f.isGitRepo, projectId: byRoot.get(samePathKey(full)) ?? null };
      }),
      truncated: folders.length >= FOLDER_LIST_LIMIT,
    };
  }

  async addLocal(userId: string, input: AddLocalProjectInput): Promise<ProjectDetailDTO> {
    const { real } = await this.resolveWorkspaceDir(input.path, 'path');
    if (await this.projects.findByRootForUser(real, userId)) {
      throw new ConflictException('This folder is already in your projects');
    }
    const project = await this.projects.create({
      userId,
      name: input.name?.trim() || path.basename(real) || real,
      source: 'local',
      rootPath: real,
    });
    return this.withStats(project);
  }

  async addGithub(userId: string, input: AddGithubProjectInput): Promise<ProjectDetailDTO> {
    const match = GITHUB_URL.exec(input.url.trim()) ?? GITHUB_SHORTHAND.exec(input.url.trim());
    if (!match) {
      throw new ValidationException('Request validation failed', [
        { field: 'url', message: 'Use a GitHub repository URL like https://github.com/owner/repo' },
      ]);
    }
    const [, owner, repo] = match;
    const ref = input.ref?.trim() || null;
    if (ref && !GIT_REF.test(ref)) {
      throw new ValidationException('Request validation failed', [{ field: 'ref', message: 'Invalid branch or tag name' }]);
    }
    const repoUrl = `https://github.com/${owner}/${repo}`;
    // Readable folder: <PROJECTS_DIR>/<repo> (or <repo>-2 … if that name is taken).
    const dest = await this.files.reserveFolder(repo);

    await this.files.clone(`${repoUrl}.git`, ref, dest);
    try {
      const project = await this.projects.create({
        userId,
        name: input.name?.trim() || `${owner}/${repo}`,
        source: 'github',
        rootPath: dest,
        repoUrl,
        gitRef: ref,
      });
      return this.withStats(project);
    } catch (error) {
      await this.files.removeClone(dest);
      throw error;
    }
  }

  /**
   * Starts a project from scratch: an empty folder `<PROJECTS_DIR>/<name>` registered as a local project.
   * The model can then create files in it (still reviewed + applied by the user).
   */
  async createEmpty(userId: string, input: CreateProjectInput): Promise<ProjectDetailDTO> {
    const name = input.name.trim();
    const dir = await this.files.reserveFolder(name);
    try {
      const project = await this.projects.create({ userId, name, source: 'local', rootPath: dir });
      return this.withStats(project);
    } catch (error) {
      await this.files.removeClone(dir);
      throw error;
    }
  }

  /**
   * Removes the project (and its proposed changes) from the app. Files are only deleted for GitHub clones
   * that live in the app's private PROJECTS_DIR; anything inside WORKSPACE_ROOTS is the user's and stays on disk.
   */
  async remove(userId: string, projectId: string): Promise<{ deletedFiles: boolean }> {
    const project = await this.requireProject(userId, projectId);
    await this.projects.deleteForUser(project.id, userId);
    const deleteFiles = project.source === 'github' && !this.files.isInWorkspace(project.rootPath);
    if (deleteFiles) await this.files.removeClone(project.rootPath);
    return { deletedFiles: deleteFiles };
  }

  /** Workspace roots with symlinks/junctions resolved. Throws when local projects are disabled. */
  private async realRoots(): Promise<string[]> {
    if (this.settings.workspaceRoots.length === 0) {
      throw new ProjectWorkspaceException(
        'Local projects are disabled. Ask the operator to set WORKSPACE_ROOTS in backend/.env.',
        'PROJECT_PATH_FORBIDDEN',
      );
    }
    return Promise.all(this.settings.workspaceRoots.map((r) => fs.realpath(r).catch(() => r)));
  }

  /**
   * Absolute, existing folder inside a workspace root. realpath resolves symlinks/junctions, so a link
   * inside a root can't point outside it. Returns the folder and the (deepest) root that contains it.
   */
  private async resolveWorkspaceDir(requested: string, field: string): Promise<{ real: string; root: string }> {
    const roots = await this.realRoots();
    const input = requested.trim();
    if (!path.isAbsolute(input)) {
      throw new ValidationException('Request validation failed', [{ field, message: 'Use an absolute folder path' }]);
    }
    const real = await fs.realpath(path.resolve(input)).catch(() => null);
    const stat = real ? await fs.stat(real).catch(() => null) : null;
    if (!real || !stat?.isDirectory()) {
      throw new ValidationException('Request validation failed', [{ field, message: `Folder not found on the server: ${input}` }]);
    }
    const root = roots.filter((r) => isInsideDir(r, real)).sort((a, b) => b.length - a.length)[0];
    if (!root) {
      throw new ProjectWorkspaceException(
        `"${input}" is outside the allowed workspace folders (${this.settings.workspaceRoots.join('; ')})`,
        'PROJECT_PATH_FORBIDDEN',
      );
    }
    return { real, root };
  }

  async requireProject(userId: string, projectId: string): Promise<Project> {
    const project = await this.projects.findByIdForUser(projectId, userId);
    if (!project) throw new ResourceNotFoundException('Project', projectId);
    return project;
  }

  /* ------------------------------ chat integration ------------------------------ */

  /** Files + instructions for the system prompt. `conversationId` keeps earlier edited files in focus. */
  async buildContext(userId: string, project: Project, prompt: string, conversationId?: string): Promise<ProjectContext> {
    const focusPaths = conversationId
      ? await this.changes.recentPathsForConversation(conversationId, project.id, userId)
      : [];
    const context = await this.context.build(project, { prompt, focusPaths });
    await this.projects.touch(project.id, userId);
    return context;
  }

  /**
   * Extracts file blocks from the model reply. For each one the current file is read so the
   * change carries the original (diff + revert) and its hash (conflict detection). create/modify
   * are corrected to match reality, and deleting a file that does not exist is dropped.
   */
  async proposeChanges(project: Project, reply: string): Promise<ProposedChanges> {
    const parsed = parseProjectChanges(reply);
    const rows: ProposedChanges['rows'] = [];
    const notes = [...parsed.warnings];

    for (const change of parsed.changes) {
      let current: string | null = null;
      try {
        const read = await this.files.read(project.rootPath, change.path);
        if (read.state === 'binary') {
          notes.push(`Skipped \`${change.path}\`: it is a binary file.`);
          continue;
        }
        current = read.state === 'text' ? read.content : null;
      } catch (error) {
        notes.push(`Skipped \`${change.path}\`: ${(error as Error).message}.`);
        continue;
      }

      if (change.action === 'delete') {
        if (current === null) continue;
        rows.push({ projectId: project.id, path: change.path, action: 'delete', originalContent: current, newContent: null, baseHash: sha256(current) });
        continue;
      }

      let next = matchLineEndings(current, change.content ?? '');
      // Keep a missing final newline missing, so the diff only shows real edits.
      if (current !== null && !/\r?\n$/.test(current)) next = next.replace(/\r?\n$/, '');
      if (current !== null && current === next) continue; // no-op edit
      rows.push({
        projectId: project.id,
        path: change.path,
        action: current === null ? 'create' : 'modify',
        originalContent: current,
        newContent: next,
        baseHash: current === null ? null : sha256(current),
      });
    }

    let content = parsed.content;
    if (notes.length) content = `${content}\n\n> **Note**\n${notes.map((n) => `> - ${n}`).join('\n')}`.trim();
    if (!content) content = rows.length ? `Proposed changes to ${rows.length} file${rows.length === 1 ? '' : 's'}.` : '(No changes proposed.)';
    return { content, rows };
  }

  /* ------------------------------ review / apply ------------------------------ */

  async getChange(userId: string, changeId: string): Promise<ProjectChangeDetailDTO> {
    const change = await this.changes.findByIdForUser(changeId, userId);
    if (!change) throw new ResourceNotFoundException('Change', changeId);
    let diskState: ProjectChangeDetailDTO['diskState'] = 'in-sync';
    try {
      const hash = await this.currentHash(change);
      const expected = change.status === 'applied' ? this.appliedHash(change) : change.baseHash;
      if (change.status !== 'discarded' && hash !== expected) diskState = 'changed';
    } catch {
      diskState = 'unavailable';
    }
    return {
      ...toProjectChangeDTO(change),
      originalContent: change.originalContent,
      newContent: change.newContent,
      diskState,
    };
  }

  /** Writes pending changes to disk. Files edited since the proposal are reported as conflicts unless `force`. */
  async apply(userId: string, changeIds: string[], force = false): Promise<ProjectChangesResultDTO> {
    return this.process(userId, changeIds, async (change) => {
      if (change.status !== 'pending') return null;
      if (!force && (await this.currentHash(change)) !== change.baseHash) {
        return 'The file changed on disk since this edit was proposed';
      }
      if (change.action === 'delete') await this.files.remove(change.project.rootPath, change.path);
      else await this.files.write(change.project.rootPath, change.path, change.newContent ?? '');
      return { status: 'applied', appliedAt: new Date() };
    });
  }

  /** Marks pending changes as discarded (nothing is written). */
  async discard(userId: string, changeIds: string[]): Promise<ProjectChangesResultDTO> {
    return this.process(userId, changeIds, async (change) =>
      change.status === 'pending' ? { status: 'discarded', appliedAt: null } : null,
    );
  }

  /** Restores the original content of applied changes; they become pending again. */
  async revert(userId: string, changeIds: string[], force = false): Promise<ProjectChangesResultDTO> {
    return this.process(userId, changeIds, async (change) => {
      if (change.status !== 'applied') return null;
      if (!force && (await this.currentHash(change)) !== this.appliedHash(change)) {
        return 'The file changed on disk after this edit was applied';
      }
      if (change.originalContent === null) await this.files.remove(change.project.rootPath, change.path);
      else await this.files.write(change.project.rootPath, change.path, change.originalContent);
      return { status: 'pending', appliedAt: null };
    });
  }

  /* ------------------------------ helpers ------------------------------ */

  private async process(
    userId: string,
    changeIds: string[],
    step: (change: ProjectChangeWithProject) => Promise<{ status: 'pending' | 'applied' | 'discarded'; appliedAt: Date | null } | string | null>,
  ): Promise<ProjectChangesResultDTO> {
    const ids = [...new Set(changeIds)];
    const rows = await this.changes.findManyForUser(ids, userId);
    if (rows.length !== ids.length) {
      const missing = ids.find((id) => !rows.some((r) => r.id === id));
      throw new ResourceNotFoundException('Change', missing);
    }
    const conflicts: ProjectChangeConflictDTO[] = [];
    const updated: ProjectChangeDTO[] = [];
    for (const change of rows) {
      let outcome: Awaited<ReturnType<typeof step>>;
      try {
        await this.files.assertDirectory(change.project.rootPath);
        outcome = await step(change);
      } catch (error) {
        logger.warn('Project change failed', { changeId: change.id, path: change.path, error: (error as Error).message });
        outcome = (error as Error).message;
      }
      if (typeof outcome === 'string') {
        conflicts.push({ id: change.id, path: change.path, reason: outcome });
        updated.push(toProjectChangeDTO(change));
      } else if (outcome) {
        updated.push(toProjectChangeDTO(await this.changes.setStatus(change.id, userId, outcome.status, outcome.appliedAt)));
      } else {
        updated.push(toProjectChangeDTO(change));
      }
    }
    return { changes: updated, conflicts };
  }

  /** SHA-256 of the file now (null = missing). Throws for unreadable/unsafe paths. */
  private async currentHash(change: ProjectChangeWithProject): Promise<string | null> {
    const read = await this.files.read(change.project.rootPath, change.path);
    if (read.state === 'missing') return null;
    if (read.state === 'binary') return 'binary';
    return sha256(read.content);
  }

  private appliedHash(change: ProjectChangeWithProject): string | null {
    return change.action === 'delete' || change.newContent === null ? null : sha256(change.newContent);
  }

  private async withStats(project: Project): Promise<ProjectDetailDTO> {
    const scan = await this.files.scan(project.rootPath);
    return {
      ...toProjectDTO(project),
      stats: {
        fileCount: scan.files.length,
        totalBytes: scan.files.reduce((sum, f) => sum + f.sizeBytes, 0),
        truncated: scan.truncated,
      },
    };
  }
}
