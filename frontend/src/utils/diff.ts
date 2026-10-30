/** Line-based diff for the change review (no dependency). */

export type DiffLineType = 'context' | 'add' | 'del';

export interface DiffLine {
  type: DiffLineType;
  text: string;
  oldNo?: number;
  newNo?: number;
}

/** A run of lines to show, or a collapsed block of unchanged lines between hunks. */
export type DiffRow = { kind: 'line'; line: DiffLine } | { kind: 'gap'; count: number };

export interface DiffResult {
  rows: DiffRow[];
  added: number;
  removed: number;
  /** True when the files were too large for a line-by-line diff (shown as remove-all/add-all). */
  coarse: boolean;
}

/** LCS table cells allowed (~10 MB as Uint32). Larger inputs fall back to a whole-file replace. */
const MAX_CELLS = 2_500_000;

export function splitLines(text: string | null): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

function lineDiff(a: string[], b: string[]): { lines: DiffLine[]; coarse: boolean } {
  const lines: DiffLine[] = [];
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  for (let i = 0; i < start; i++) lines.push({ type: 'context', text: a[i], oldNo: i + 1, newNo: i + 1 });

  const n = endA - start;
  const m = endB - start;
  let coarse = false;

  if (n > 0 && m > 0 && (n + 1) * (m + 1) <= MAX_CELLS) {
    // table[i][j] = LCS length of a[start+i..endA) and b[start+j..endB)
    const w = m + 1;
    const table = new Uint32Array((n + 1) * w);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        table[i * w + j] =
          a[start + i] === b[start + j] ? table[(i + 1) * w + j + 1] + 1 : Math.max(table[(i + 1) * w + j], table[i * w + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n || j < m) {
      if (i < n && j < m && a[start + i] === b[start + j]) {
        lines.push({ type: 'context', text: a[start + i], oldNo: start + i + 1, newNo: start + j + 1 });
        i++;
        j++;
      } else if (i < n && (j === m || table[(i + 1) * w + j] >= table[i * w + j + 1])) {
        // Removals before additions, like `git diff`.
        lines.push({ type: 'del', text: a[start + i], oldNo: start + i + 1 });
        i++;
      } else {
        lines.push({ type: 'add', text: b[start + j], newNo: start + j + 1 });
        j++;
      }
    }
  } else {
    coarse = n > 0 && m > 0;
    for (let i = start; i < endA; i++) lines.push({ type: 'del', text: a[i], oldNo: i + 1 });
    for (let j = start; j < endB; j++) lines.push({ type: 'add', text: b[j], newNo: j + 1 });
  }

  for (let k = 0; endA + k < a.length; k++) {
    lines.push({ type: 'context', text: a[endA + k], oldNo: endA + k + 1, newNo: endB + k + 1 });
  }
  return { lines, coarse };
}

/** Unified diff with `context` unchanged lines around each change; longer unchanged runs collapse into gaps. */
export function diffText(original: string | null, next: string | null, context = 3): DiffResult {
  const { lines, coarse } = lineDiff(splitLines(original), splitLines(next));
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((l, idx) => {
    if (l.type === 'context') return;
    for (let k = Math.max(0, idx - context); k <= Math.min(lines.length - 1, idx + context); k++) keep[k] = true;
  });

  const rows: DiffRow[] = [];
  let gap = 0;
  lines.forEach((line, idx) => {
    if (keep[idx]) {
      if (gap > 0) rows.push({ kind: 'gap', count: gap });
      gap = 0;
      rows.push({ kind: 'line', line });
    } else {
      gap++;
    }
  });
  if (gap > 0) rows.push({ kind: 'gap', count: gap });

  return {
    rows,
    added: lines.filter((l) => l.type === 'add').length,
    removed: lines.filter((l) => l.type === 'del').length,
    coarse,
  };
}
