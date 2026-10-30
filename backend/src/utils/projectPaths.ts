import { createHash } from 'node:crypto';
import path from 'node:path';

/**
 * Pure helpers for working safely with project paths. Nothing here touches the file system,
 * so these are the rules that keep a model-proposed path from escaping the project root.
 */

/**
 * Normalises a project-relative path coming from the model or the client:
 * backslashes → '/', leading './' and duplicate slashes removed. Returns null when the path is
 * absolute, contains '..', NUL or control characters, or points into a `.git` folder.
 */
export function normaliseRelativePath(input: string): string | null {
  const raw = input.trim().replace(/\\/g, '/');
  if (!raw || raw.length > 1024) return null;
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(raw)) return null;
  if (raw.startsWith('/') || /^[a-zA-Z]:/.test(raw)) return null;
  const segments = raw.split('/').filter((s) => s !== '' && s !== '.');
  if (segments.length === 0) return null;
  if (segments.some((s) => s === '..' || s.toLowerCase() === '.git')) return null;
  return segments.join('/');
}

/** True when `child` is `parent` itself or somewhere below it (case-insensitive on Windows). */
export function isInsideDir(parent: string, child: string): boolean {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  if (rel === '') return true;
  if (path.isAbsolute(rel)) return false; // different drive on Windows
  return rel !== '..' && !rel.startsWith(`..${path.sep}`);
}

/** Absolute path of a project-relative path, guaranteed to stay inside `root` (null otherwise). */
export function resolveInsideRoot(root: string, relativePath: string): string | null {
  const rel = normaliseRelativePath(relativePath);
  if (!rel) return null;
  const abs = path.resolve(root, ...rel.split('/'));
  return isInsideDir(root, abs) && abs !== path.resolve(root) ? abs : null;
}

export const sha256 = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');

/** Heuristic used by git: a NUL byte in the first 8 KB means binary. */
export const looksBinary = (buf: Buffer): boolean => buf.subarray(0, 8000).includes(0);

/** Makes `next` use CRLF when `original` did (models almost always answer with LF). */
export function matchLineEndings(original: string | null, next: string): string {
  if (!original || !original.includes('\r\n')) return next;
  return next.replace(/\r?\n/g, '\r\n');
}

/* ------------------------------ .gitignore ------------------------------ */

interface IgnoreRule {
  regex: RegExp;
  negate: boolean;
  dirOnly: boolean;
}

const escapeRegex = (s: string) => s.replace(/[.+^${}()|[\]\\]/g, '\\$&');

function globToRegex(glob: string): string {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        const atSegmentStart = i === 0 || glob[i - 1] === '/';
        const atSegmentEnd = i + 2 === glob.length || glob[i + 2] === '/';
        if (atSegmentStart && atSegmentEnd) {
          if (glob[i + 2] === '/') {
            out += '(?:.*/)?';
            i += 2;
          } else {
            out += '.*';
            i += 1;
          }
          continue;
        }
        i += 1;
      }
      out += '[^/]*';
    } else if (c === '?') {
      out += '[^/]';
    } else {
      out += escapeRegex(c);
    }
  }
  return out;
}

/**
 * Small `.gitignore` matcher (root file only): comments, negation, directory-only rules,
 * anchored rules, `*`, `?` and `**`. Character classes are matched literally.
 */
export class GitIgnore {
  private readonly rules: IgnoreRule[];

  constructor(text = '') {
    this.rules = text
      .split(/\r?\n/)
      .map((l) => l.replace(/(?<!\\)\s+$/, ''))
      .filter((l) => l && !l.startsWith('#'))
      .map((line) => {
        let pattern = line;
        const negate = pattern.startsWith('!');
        if (negate) pattern = pattern.slice(1);
        if (pattern.startsWith('\\')) pattern = pattern.slice(1);
        const dirOnly = pattern.endsWith('/');
        if (dirOnly) pattern = pattern.slice(0, -1);
        const anchored = pattern.includes('/');
        if (pattern.startsWith('/')) pattern = pattern.slice(1);
        const body = globToRegex(pattern);
        return { regex: new RegExp(`${anchored ? '^' : '^(?:.*/)?'}${body}(?:/.*)?$`), negate, dirOnly };
      })
      .filter((r) => r.regex.source.length > 0);
  }

  /** `relPath` uses forward slashes, relative to the project root. Last matching rule wins. */
  ignores(relPath: string, isDir: boolean): boolean {
    let ignored = false;
    for (const rule of this.rules) {
      if (rule.dirOnly && !isDir && !this.matchesParent(rule, relPath)) continue;
      if (rule.regex.test(relPath)) ignored = !rule.negate;
    }
    return ignored;
  }

  /** A directory-only rule still matches files below the directory it names. */
  private matchesParent(rule: IgnoreRule, relPath: string): boolean {
    const parts = relPath.split('/');
    for (let i = parts.length - 1; i > 0; i--) {
      if (rule.regex.test(parts.slice(0, i).join('/'))) return true;
    }
    return false;
  }
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com\d|lpt\d)$/i;

/**
 * Turns a project or repo name into a folder name that is valid on Windows, macOS and Linux:
 * no path separators or reserved characters, no leading/trailing dots or spaces, no reserved device names.
 */
export function safeFolderName(name: string): string {
  const cleaned = name
    // eslint-disable-next-line no-control-regex
    .replace(/[<>:"/\\|?*\x00-\x1f]+/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-{2,}/g, '-')
    .trim()
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 80)
    .trim();
  if (!cleaned) return 'project';
  return WINDOWS_RESERVED.test(cleaned) ? `${cleaned}-project` : cleaned;
}
