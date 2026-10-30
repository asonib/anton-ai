import { normaliseRelativePath } from './projectPaths';

export type ParsedChangeAction = 'create' | 'modify' | 'delete';

export interface ParsedChange {
  path: string;
  action: ParsedChangeAction;
  /** Full new file content; null for deletions. */
  content: string | null;
}

export interface ParsedResponse {
  /** The reply with every file block removed (what is stored and rendered as Markdown). */
  content: string;
  changes: ParsedChange[];
  /** Human-readable notes about blocks that were rejected or cut off. */
  warnings: string[];
}

const ATTR = /(\w+)\s*=\s*"([^"]*)"/g;
const OPEN = /<<<FILE\b([^\n>]*)>>>[ \t]*\r?\n?/g;
const CLOSE = /\r?\n?<<<END FILE>>>/;

/** Removes one pair of Markdown code fences wrapped around a whole file body. */
function stripFence(body: string): string {
  const m = /^[ \t]*(`{3,}|~{3,})[^\n]*\r?\n([\s\S]*?)\r?\n[ \t]*\1[ \t]*$/.exec(body);
  return m ? m[2] : body;
}

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of raw.matchAll(ATTR)) out[m[1].toLowerCase()] = m[2];
  return out;
}

/**
 * Extracts `<<<FILE path=".." action="..">>> … <<<END FILE>>>` blocks (see PROJECT_EDIT_INSTRUCTIONS).
 * Later blocks for the same path win. Unsafe paths and blocks cut off by the token limit are dropped
 * with a warning instead of producing a broken file.
 */
export function parseProjectChanges(text: string): ParsedResponse {
  const changes = new Map<string, ParsedChange>();
  const warnings: string[] = [];
  const kept: string[] = [];
  let cursor = 0;

  OPEN.lastIndex = 0;
  for (let open = OPEN.exec(text); open; open = OPEN.exec(text)) {
    kept.push(text.slice(cursor, open.index));
    const attrs = parseAttrs(open[1]);
    const bodyStart = open.index + open[0].length;
    const rest = text.slice(bodyStart);
    const close = CLOSE.exec(rest);
    const rawPath = attrs.path ?? '';

    if (!close) {
      warnings.push(
        `The response was cut off before \`${rawPath || 'a file'}\` was complete, so that edit was dropped. Ask me to continue or to change fewer files at once.`,
      );
      cursor = text.length;
      break;
    }

    const body = rest.slice(0, close.index);
    cursor = bodyStart + close.index + close[0].length;
    OPEN.lastIndex = cursor;

    const filePath = normaliseRelativePath(rawPath);
    if (!filePath) {
      warnings.push(`Ignored an edit with an invalid path: \`${rawPath || '(empty)'}\`.`);
      continue;
    }
    const action = (attrs.action ?? 'modify').toLowerCase();
    if (action !== 'create' && action !== 'modify' && action !== 'delete') {
      warnings.push(`Ignored \`${filePath}\`: unknown action "${action}".`);
      continue;
    }
    const content = action === 'delete' ? null : stripFence(body);
    changes.delete(filePath); // keep the order of the last occurrence
    changes.set(filePath, { path: filePath, action, content: content === null ? null : ensureTrailingNewline(content) });
  }
  kept.push(text.slice(cursor));

  const cleaned = kept
    .join('')
    // Fences left empty when the model wrapped a block in ``` anyway.
    .replace(/^[ \t]*(`{3,}|~{3,})[^\n]*\n\s*\1[ \t]*$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { content: cleaned, changes: [...changes.values()], warnings };
}

function ensureTrailingNewline(content: string): string {
  if (content.length === 0 || content.endsWith('\n')) return content;
  return `${content}\n`;
}
