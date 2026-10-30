import path from 'node:path';
import {
  BINARY_EXTENSIONS,
  KEY_FILES,
  LOCK_FILES,
  PROJECT_EDIT_INSTRUCTIONS,
  ProjectSettings,
  SECRET_FILE_ALLOW,
  SECRET_FILE_PATTERNS,
} from '../config/projects.config';
import type { ProjectFileEntry, ProjectFileService, ProjectScan } from './projectFiles.service';

export interface ProjectContextSource {
  name: string;
  rootPath: string;
  source: 'local' | 'github';
  gitRef: string | null;
}

export interface ProjectContextRequest {
  prompt: string;
  /** Files touched earlier in the conversation — they stay in context so follow-ups can build on them. */
  focusPaths?: string[];
}

export interface ProjectContext {
  /** Instructions + <project> block appended to the system prompt. */
  systemBlock: string;
  /** Files whose full content was sent (the model may only edit these safely). */
  includedPaths: Set<string>;
  scan: ProjectScan;
}

type OmitReason = 'binary' | 'too large' | 'secret' | 'lock file' | 'not shown (context budget)';

const TREE_SHARE = 0.25;
const FILE_OVERHEAD = 40;

const xmlAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const formatSize = (bytes: number) => (bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`);

export function isSecretFile(fileName: string): boolean {
  if (SECRET_FILE_ALLOW.some((r) => r.test(fileName))) return false;
  return SECRET_FILE_PATTERNS.some((r) => r.test(fileName));
}

/**
 * Turns a project folder into model context: a file tree plus as many whole files as fit in
 * PROJECT_CONTEXT_MAX_CHARS. Files the user mentions, files changed earlier in the chat and key
 * files (README, manifests) go first; then shallow, small files. Files are never truncated —
 * a partial file would make a "complete file" edit destroy the rest of it.
 */
export class ProjectContextService {
  constructor(
    private readonly files: ProjectFileService,
    private readonly settings: ProjectSettings,
  ) {}

  async build(project: ProjectContextSource, request: ProjectContextRequest): Promise<ProjectContext> {
    const scan = await this.files.scan(project.rootPath);
    const budget = this.settings.contextMaxChars;
    const omitted = new Map<string, OmitReason>();
    const candidates: ProjectFileEntry[] = [];

    for (const file of scan.files) {
      const reason = this.staticOmitReason(file);
      if (reason) omitted.set(file.path, reason);
      else candidates.push(file);
    }

    const ranked = this.rank(candidates, request);
    const included: { path: string; content: string }[] = [];
    let used = 0;
    const fileBudget = Math.floor(budget * (1 - TREE_SHARE));

    for (const file of ranked) {
      if (used + file.sizeBytes + FILE_OVERHEAD > fileBudget) {
        omitted.set(file.path, 'not shown (context budget)');
        continue;
      }
      const read = await this.files.read(project.rootPath, file.path).catch(() => null);
      if (!read || read.state === 'missing') continue;
      if (read.state === 'binary') {
        omitted.set(file.path, 'binary');
        continue;
      }
      if (used + read.content.length + FILE_OVERHEAD > fileBudget) {
        omitted.set(file.path, 'not shown (context budget)');
        continue;
      }
      included.push({ path: file.path, content: read.content });
      used += read.content.length + FILE_OVERHEAD;
    }

    const tree = this.renderTree(scan, omitted, budget - used);
    included.sort((a, b) => a.path.localeCompare(b.path));
    const fileBlocks = included.map((f) => `<file path="${xmlAttr(f.path)}">\n${f.content}${f.content.endsWith('\n') ? '' : '\n'}</file>`);
    const ref = project.gitRef ? ` ref="${xmlAttr(project.gitRef)}"` : '';

    const systemBlock = [
      PROJECT_EDIT_INSTRUCTIONS,
      `<project name="${xmlAttr(project.name)}" source="${project.source}"${ref} files="${scan.files.length}" shown="${included.length}">`,
      '<tree>',
      tree,
      '</tree>',
      ...fileBlocks,
      '</project>',
    ].join('\n');

    return { systemBlock, includedPaths: new Set(included.map((f) => f.path)), scan };
  }

  private staticOmitReason(file: ProjectFileEntry): OmitReason | null {
    const base = path.posix.basename(file.path);
    if (isSecretFile(base)) return 'secret';
    if (LOCK_FILES.has(base)) return 'lock file';
    if (BINARY_EXTENSIONS.has(path.posix.extname(base).toLowerCase())) return 'binary';
    if (file.sizeBytes > this.settings.maxFileBytes) return 'too large';
    return null;
  }

  private rank(files: ProjectFileEntry[], request: ProjectContextRequest): ProjectFileEntry[] {
    const prompt = request.prompt.toLowerCase().replace(/\\/g, '/');
    const focus = new Set((request.focusPaths ?? []).map((p) => p.toLowerCase()));
    const score = (f: ProjectFileEntry): number => {
      const lower = f.path.toLowerCase();
      const base = path.posix.basename(lower);
      const depth = lower.split('/').length - 1;
      let s = 0;
      if (prompt.includes(lower)) s += 1000;
      if (focus.has(lower)) s += 500;
      if (base.length >= 5 && new RegExp(`(^|[^\\w.-])${base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\w-])`).test(prompt)) s += 300;
      if (KEY_FILES.has(base)) s += depth === 0 ? 200 : 60;
      s += 100 - Math.min(depth, 8) * 10 - Math.min(f.sizeBytes / 2000, 40);
      return s;
    };
    return files
      .map((f) => ({ f, s: score(f) }))
      .sort((a, b) => b.s - a.s || a.f.path.localeCompare(b.f.path))
      .map((x) => x.f);
  }

  /** One line per file; omitted files say why. Long trees are cut with a count of the rest. */
  private renderTree(scan: ProjectScan, omitted: Map<string, OmitReason>, remaining: number): string {
    const limit = Math.max(2_000, Math.floor(this.settings.contextMaxChars * TREE_SHARE), remaining);
    const lines: string[] = [];
    let size = 0;
    for (let i = 0; i < scan.files.length; i++) {
      const f = scan.files[i];
      const reason = omitted.get(f.path);
      const line = `${f.path} (${formatSize(f.sizeBytes)})${reason ? ` [${reason}]` : ''}`;
      if (size + line.length + 1 > limit) {
        lines.push(`… and ${scan.files.length - i} more files`);
        break;
      }
      lines.push(line);
      size += line.length + 1;
    }
    if (scan.truncated) lines.push(`… scan stopped after ${scan.files.length} files`);
    return lines.join('\n');
  }
}
