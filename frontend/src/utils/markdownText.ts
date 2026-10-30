/**
 * Convert a Markdown response into readable plain text (used for ".txt" downloads).
 * Unlike `utils/speech.ts`, code is kept verbatim and line structure is preserved.
 */
export function markdownToPlainText(markdown: string): string {
  const codeBlocks: string[] = [];
  const stash = (code: string) => `\u0000${codeBlocks.push(code) - 1}\u0000`;

  let text = markdown
    .replace(/\r\n?/g, '\n')
    // Fenced code → keep the code itself, drop the fences; protect it from the rules below.
    .replace(/^[ \t]*(```|~~~)[^\n]*\n([\s\S]*?)(?:\n[ \t]*\1[ \t]*(?=\n|$)|(?![\s\S]))/gm, (_m, _f, code: string) =>
      stash(code.replace(/\n$/, '')),
    )
    // Inline code → keep content (also protected).
    .replace(/`([^`\n]+)`/g, (_m, code: string) => stash(code));

  text = text
    .replace(/!\[([^\]]*)\]\(([^)\s]*)[^)]*\)/g, (_m, alt: string, url: string) => (alt ? `${alt} (${url})` : url))
    .replace(/\[([^\]]+)\]\(([^)\s]*)[^)]*\)/g, (_m, label: string, url: string) => (label === url ? url : `${label} (${url})`))
    .replace(/<(https?:[^>]+)>/g, '$1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '')
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+(.*?)[ \t]*#*[ \t]*$/gm, '$1')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, '────────')
    .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*(\n|$)/gm, '') // table separator rows (incl. their line break)
    .replace(/^([ \t]*)[-*+][ \t]+\[([ xX])\][ \t]+/gm, (_m, indent: string, mark: string) => `${indent}${mark.trim() ? '[x]' : '[ ]'} `)
    .replace(/^([ \t]*)[-*+][ \t]+/gm, '$1• ')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|\W)_(?!\s)(.+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1')
    // Table rows "| a | b |" → "a | b"
    .replace(/^[ \t]*\|(.*)\|[ \t]*$/gm, (_m, cells: string) => cells.split('|').map((c) => c.trim()).join('  |  '))
    .replace(/\n{3,}/g, '\n\n');

  return text.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => codeBlocks[Number(i)]).trim() + '\n';
}
