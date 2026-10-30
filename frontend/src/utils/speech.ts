/**
 * Helpers for reading assistant responses aloud (see `hooks/useTextToSpeech`).
 * Responses are Markdown, so we strip the syntax before handing text to the speech engine.
 */

const CODE_PLACEHOLDER = 'Code block omitted.';

/** Convert a Markdown response into plain, speakable prose. */
export function markdownToSpeech(markdown: string): string {
  const text = markdown
    .replace(/\r\n?/g, '\n')
    // Fenced code blocks are noise when spoken — announce them instead.
    .replace(/(^|\n)\s*(```|~~~)[\s\S]*?(\n\s*\2[^\n]*|$)/g, `\n${CODE_PLACEHOLDER}\n`)
    // Images → alt text, links → link text, autolinks/HTML tags → removed.
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<(https?:[^>]+)>/g, '')
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ')
    // Inline code keeps its content.
    .replace(/`([^`]+)`/g, '$1')
    // Block-level markers.
    .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '')
    .replace(/^[ \t]*>[ \t]?/gm, '')
    .replace(/^[ \t]*([-*_])([ \t]*\1){2,}[ \t]*$/gm, '') // horizontal rules
    .replace(/^[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*(\|[ \t]*:?-{3,}:?[ \t]*)*\|?[ \t]*$/gm, '') // table separator rows
    .replace(/^[ \t]*([-*+]|\d+[.)])[ \t]+(\[[ xX]\][ \t]+)?/gm, '') // list bullets / task boxes
    // Inline emphasis.
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(^|[^\w*])\*(?!\s)(.+?)\*(?!\w)/g, '$1$2')
    .replace(/(^|\W)_(?!\s)(.+?)_(?!\w)/g, '$1$2')
    .replace(/~~(.+?)~~/g, '$1');

  // Table rows → comma-separated cells; every line gets a sentence break so headings and
  // list items don't run into each other.
  return text
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*\|/, '')
        .replace(/\|\s*$/, '')
        .replace(/\s*\|\s*/g, ', ')
        .trim(),
    )
    .filter(Boolean)
    .map((line) => (/[.!?:;,]["')\]]*$/.test(line) ? line : `${line}.`))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Split text into utterance-sized pieces. Chromium silently stops speaking a single
 * utterance after ~15 seconds, so long responses are queued as several short ones.
 */
export function splitForSpeech(text: string, maxLength = 220): string[] {
  const sentences = text.match(/[^.!?]+(?:[.!?]+["')\]]*|$)/g) ?? [];
  const chunks: string[] = [];
  let current = '';

  const push = (piece: string) => {
    const trimmed = piece.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    if (sentence.length > maxLength) {
      push(current);
      current = '';
      // Break very long sentences at commas, then at word boundaries.
      let rest = sentence;
      while (rest.length > maxLength) {
        const window = rest.slice(0, maxLength);
        let cut = Math.max(window.lastIndexOf(', '), window.lastIndexOf('; '));
        if (cut < maxLength / 3) cut = window.lastIndexOf(' ');
        if (cut <= 0) cut = maxLength;
        push(rest.slice(0, cut + 1));
        rest = rest.slice(cut + 1);
      }
      current = rest;
      continue;
    }

    if ((current + ' ' + sentence).trim().length > maxLength) {
      push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  push(current);
  return chunks;
}
