import {
  BINARY_DOCUMENT_EXTENSIONS,
  CODE_FILE_NAMES,
  CODE_LANGUAGES,
  IMAGE_MIME_TYPES,
  TEXT_DOCUMENT_EXTENSIONS,
} from '../config/attachments.config';

/**
 * Pure helpers for classifying uploads. No I/O, no framework imports —
 * safe to unit-test in isolation.
 */

export type ImageMime = (typeof IMAGE_MIME_TYPES)[number];

export type FileClass =
  | { kind: 'image'; mimeType: ImageMime }
  | { kind: 'document'; format: 'pdf' | 'docx' | 'text'; mimeType: string }
  | { kind: 'code'; language: string; mimeType: string };

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const TEXT_DOC_MIME: Readonly<Record<string, string>> = {
  md: 'text/markdown',
  markdown: 'text/markdown',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
};

/** Strip any path, control characters and reserved characters; cap at 255 chars. */
export function sanitizeFileName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? '';
  // eslint-disable-next-line no-control-regex
  const cleaned = base.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned || cleaned === '.' || cleaned === '..') return 'file';
  if (cleaned.length <= 255) return cleaned;
  const dot = cleaned.lastIndexOf('.');
  const ext = dot > 0 && cleaned.length - dot <= 16 ? cleaned.slice(dot) : '';
  return cleaned.slice(0, 255 - ext.length) + ext;
}

/** Multipart filenames arrive latin1-decoded from busboy; recover UTF-8 when that's what was sent. */
export function decodeMultipartFileName(name: string): string {
  // eslint-disable-next-line no-control-regex
  if (!/[\u0080-\u00ff]/.test(name) || /[^\u0000-\u00ff]/.test(name)) return name;
  const utf8 = Buffer.from(name, 'latin1').toString('utf8');
  return utf8.includes('\ufffd') ? name : utf8;
}

export function fileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? fileName.slice(dot + 1).toLowerCase() : '';
}

/** Detect allowed image formats from their magic bytes (never trust the client MIME). */
export function sniffImageMime(buf: Buffer): ImageMime | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return 'image/gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'image/webp';
  return null;
}

export const isPdf = (buf: Buffer): boolean => buf.length >= 5 && buf.subarray(0, 5).toString('latin1') === '%PDF-';
export const isZip = (buf: Buffer): boolean => buf.length >= 4 && buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04;

/** Heuristic: text files contain no NUL bytes in their first 8 KB. */
export const looksLikeText = (buf: Buffer): boolean => !buf.subarray(0, 8192).includes(0);

/** UTF-8 decode (lenient), strip BOM, normalise newlines. */
export function decodeText(buf: Buffer): string {
  return buf.toString('utf8').replace(/^\ufeff/, '').replace(/\r\n?/g, '\n');
}

/** Fenced-code language for a file name, or undefined if it's not a recognised code file. */
export function codeLanguageFor(fileName: string): string | undefined {
  const lower = fileName.toLowerCase();
  return CODE_FILE_NAMES[lower] ?? CODE_LANGUAGES[fileExtension(lower)];
}

/**
 * Decide what an upload is. Images are recognised by content; everything else by
 * extension (with a content sanity check). Returns null for unsupported files.
 */
export function classifyFile(fileName: string, buf: Buffer, clientMime: string): FileClass | null {
  const image = sniffImageMime(buf);
  if (image) return { kind: 'image', mimeType: image };

  const ext = fileExtension(fileName);
  if ((BINARY_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    if (ext === 'pdf' && isPdf(buf)) return { kind: 'document', format: 'pdf', mimeType: 'application/pdf' };
    if (ext === 'docx' && isZip(buf)) return { kind: 'document', format: 'docx', mimeType: DOCX_MIME };
    return null; // extension lies about the content
  }

  if (!looksLikeText(buf)) return null;

  if ((TEXT_DOCUMENT_EXTENSIONS as readonly string[]).includes(ext)) {
    return { kind: 'document', format: 'text', mimeType: TEXT_DOC_MIME[ext] ?? 'text/plain' };
  }
  const language = codeLanguageFor(fileName);
  if (language) return { kind: 'code', language, mimeType: 'text/plain' };

  // Unknown extension but the browser says it's text → treat as a plain document.
  if (clientMime.startsWith('text/')) return { kind: 'document', format: 'text', mimeType: 'text/plain' };
  return null;
}
