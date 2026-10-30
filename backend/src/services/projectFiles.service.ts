import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { childProcessEnv } from '../config/env';
import { IGNORED_DIRS, ProjectSettings } from '../config/projects.config';
import { ProjectWorkspaceException } from '../exceptions';
import { logger } from '../utils/logger';
import { GitIgnore, isInsideDir, looksBinary, resolveInsideRoot, safeFolderName } from '../utils/projectPaths';

export interface ProjectFileEntry {
  /** Forward-slash path relative to the project root. */
  path: string;
  sizeBytes: number;
}

export interface ProjectScan {
  files: ProjectFileEntry[];
  /** True when PROJECT_MAX_FILES was reached. */
  truncated: boolean;
}

export type FileReadResult =
  | { state: 'missing' }
  | { state: 'binary'; sizeBytes: number }
  | { state: 'text'; content: string; sizeBytes: number };

/**
 * All file-system and git access for attached projects. Every path is resolved with
 * `resolveInsideRoot` and checked for symlinks, so nothing outside the project root can be read or written.
 */
export class ProjectFileService {
  constructor(private readonly settings: ProjectSettings) {}

  /** Throws PROJECT_UNAVAILABLE when the root is gone (e.g. folder deleted or drive unplugged). */
  async assertDirectory(root: string): Promise<void> {
    const stat = await fs.stat(root).catch(() => null);
    if (!stat?.isDirectory()) {
      throw new ProjectWorkspaceException(`The project folder is no longer available: ${root}`, 'PROJECT_UNAVAILABLE');
    }
  }

  /** Lists the project's files (no symlinks, ignored folders or .gitignored paths), sorted by path. */
  async scan(root: string): Promise<ProjectScan> {
    await this.assertDirectory(root);
    const gitignoreText = await fs.readFile(path.join(root, '.gitignore'), 'utf8').catch(() => '');
    const ignore = new GitIgnore(gitignoreText);
    const files: ProjectFileEntry[] = [];
    const queue: string[] = [''];
    let truncated = false;

    while (queue.length > 0 && !truncated) {
      const dirRel = queue.shift() as string;
      const entries = await fs.readdir(path.join(root, ...dirRel.split('/').filter(Boolean)), { withFileTypes: true }).catch(() => []);
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const rel = dirRel ? `${dirRel}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          if (IGNORED_DIRS.has(entry.name) || ignore.ignores(rel, true)) continue;
          queue.push(rel);
        } else if (entry.isFile()) {
          if (ignore.ignores(rel, false)) continue;
          const stat = await fs.stat(path.join(root, ...rel.split('/'))).catch(() => null);
          if (!stat) continue;
          files.push({ path: rel, sizeBytes: stat.size });
          if (files.length >= this.settings.maxFiles) {
            truncated = true;
            break;
          }
        }
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return { files, truncated };
  }

  /** Reads a project file as UTF-8 text (refuses symlinks and binary files). */
  async read(root: string, relPath: string): Promise<FileReadResult> {
    const abs = await this.safePath(root, relPath);
    const stat = await fs.lstat(abs).catch(() => null);
    if (!stat) return { state: 'missing' };
    if (!stat.isFile()) throw this.unsafe(relPath, 'is not a regular file');
    const buf = await fs.readFile(abs);
    if (looksBinary(buf)) return { state: 'binary', sizeBytes: buf.length };
    return { state: 'text', content: buf.toString('utf8'), sizeBytes: buf.length };
  }

  async write(root: string, relPath: string, content: string): Promise<void> {
    const abs = await this.safePath(root, relPath);
    await fs.mkdir(path.dirname(abs), { recursive: true });
    // Re-check after mkdir: a parent created concurrently could be a symlink.
    await this.safePath(root, relPath);
    await fs.writeFile(abs, content, 'utf8');
  }

  async remove(root: string, relPath: string): Promise<void> {
    const abs = await this.safePath(root, relPath);
    await fs.rm(abs, { force: true });
  }

  /**
   * Sub-folders of `dir` for the folder picker (no symlinks, hidden or ignored folders), sorted by name.
   * `isGitRepo` = the folder contains `.git`.
   */
  async listSubfolders(dir: string, limit = 500): Promise<{ name: string; isGitRepo: boolean }[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => {
      throw new ProjectWorkspaceException(`Cannot read folder: ${dir}`, 'PROJECT_UNAVAILABLE');
    });
    const folders = entries
      .filter((e) => e.isDirectory() && !e.isSymbolicLink() && !e.name.startsWith('.') && !IGNORED_DIRS.has(e.name))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base', numeric: true }))
      .slice(0, limit);
    return Promise.all(
      folders.map(async (name) => ({
        name,
        isGitRepo: Boolean(await fs.stat(path.join(dir, name, '.git')).catch(() => null)),
      })),
    );
  }

  /**
   * Creates a new, empty folder `<PROJECTS_DIR>/<name>` (adding -2, -3 … when the name is taken)
   * and returns its absolute path. mkdir is atomic, so two requests can never get the same folder.
   */
  async reserveFolder(name: string): Promise<string> {
    const base = safeFolderName(name);
    await fs.mkdir(this.settings.projectsDir, { recursive: true });
    for (let i = 1; i <= 500; i++) {
      const dir = path.join(this.settings.projectsDir, i === 1 ? base : `${base}-${i}`);
      try {
        await fs.mkdir(dir);
        return dir;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }
    }
    throw new ProjectWorkspaceException(`Could not find a free folder name for "${base}"`, 'PROJECT_UNAVAILABLE');
  }

  /** True when `dir` is inside a WORKSPACE_ROOTS folder (i.e. the user's own files — never deleted by the app). */
  isInWorkspace(dir: string): boolean {
    return this.settings.workspaceRoots.some((root) => isInsideDir(root, dir));
  }

  /**
   * `git clone --depth 1` of a public repo into `dest` (inside PROJECTS_DIR; may be an empty folder from `reserveFolder`).
   * Symlinks are checked out as plain files and credential prompts are disabled.
   */
  async clone(url: string, ref: string | null, dest: string): Promise<void> {
    if (!isInsideDir(this.settings.projectsDir, dest)) throw new Error(`Refusing to clone outside PROJECTS_DIR: ${dest}`);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    const args = ['-c', 'core.symlinks=false', '-c', 'credential.helper=', 'clone', '--depth', '1', '--single-branch', '--no-tags'];
    if (ref) args.push('--branch', ref);
    args.push('--', url, dest);

    try {
      await new Promise<void>((resolve, reject) => {
        execFile(
          this.settings.gitBinary,
          args,
          { env: childProcessEnv, timeout: this.settings.cloneTimeoutMs, windowsHide: true, maxBuffer: 4 * 1024 * 1024 },
          (error, _stdout, stderr) => (error ? reject(Object.assign(error, { stderr: String(stderr) })) : resolve()),
        );
      });
    } catch (error) {
      await fs.rm(dest, { recursive: true, force: true }).catch(() => undefined);
      const err = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
      if (err.code === 'ENOENT') {
        throw new ProjectWorkspaceException(
          `git is not available on the server (tried "${this.settings.gitBinary}"). Install git or set GIT_BINARY.`,
          'GIT_NOT_AVAILABLE',
        );
      }
      logger.warn('git clone failed', { url, ref, stderr: err.stderr?.slice(0, 2000), message: err.message });
      if (err.killed) {
        throw new ProjectWorkspaceException(`Cloning timed out after ${this.settings.cloneTimeoutMs} ms`, 'GIT_CLONE_FAILED');
      }
      const stderr = err.stderr ?? '';
      const reason = /Remote branch .* not found/i.test(stderr)
        ? `Branch or tag "${ref}" was not found`
        : /not found|could not read Username|Authentication failed|terminal prompts disabled/i.test(stderr)
          ? 'Repository not found or not public'
          : /Could not resolve host|unable to access/i.test(stderr)
            ? 'GitHub is unreachable from the server'
            : 'git clone failed';
      throw new ProjectWorkspaceException(`${reason} (${url})`, 'GIT_CLONE_FAILED');
    }
  }

  /** Deletes a clone. Only ever removes folders inside PROJECTS_DIR. */
  async removeClone(dir: string): Promise<void> {
    if (!isInsideDir(this.settings.projectsDir, dir) || path.resolve(dir) === this.settings.projectsDir) {
      logger.warn('Refusing to delete a folder outside PROJECTS_DIR', { dir });
      return;
    }
    await fs.rm(dir, { recursive: true, force: true }).catch((error: Error) =>
      logger.warn('Could not delete project clone', { dir, error: error.message }),
    );
  }

  /** Resolves `relPath` inside `root` and rejects it when any existing segment is a symlink. */
  private async safePath(root: string, relPath: string): Promise<string> {
    const abs = resolveInsideRoot(root, relPath);
    if (!abs) throw this.unsafe(relPath, 'is outside the project');
    const segments = path.relative(root, abs).split(path.sep);
    let current = root;
    for (const segment of segments) {
      current = path.join(current, segment);
      const stat = await fs.lstat(current).catch(() => null);
      if (!stat) break; // the rest does not exist yet
      if (stat.isSymbolicLink()) throw this.unsafe(relPath, 'goes through a symbolic link');
    }
    return abs;
  }

  private unsafe(relPath: string, reason: string): ProjectWorkspaceException {
    return new ProjectWorkspaceException(`Path "${relPath}" ${reason}`, 'PROJECT_PATH_FORBIDDEN');
  }
}
