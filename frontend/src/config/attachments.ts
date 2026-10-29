import type { AttachmentKind } from '../api/types';

/**
 * Client-side mirror of the backend attachment rules (`backend/src/config/attachments.config.ts`).
 * Used for the file pickers and for instant feedback; the API re-validates everything.
 * Keep the limits in sync with ATTACHMENT_MAX_FILES / ATTACHMENT_MAX_FILE_MB.
 */
export const ATTACHMENT_LIMITS = {
  maxFiles: 5,
  maxFileBytes: 10 * 1024 * 1024,
} as const;

export interface AttachmentCategory {
  kind: AttachmentKind;
  label: string;
  description: string;
  /** Lower-case extensions without the dot. */
  extensions: readonly string[];
  /** Value for <input type="file" accept>. */
  accept: string;
}

const IMAGE_EXT = ['png', 'jpg', 'jpeg', 'gif', 'webp'] as const;
const DOCUMENT_EXT = ['pdf', 'docx', 'txt', 'md', 'markdown', 'csv', 'tsv', 'log'] as const;
const CODE_EXT = [
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rb', 'php', 'java', 'kt', 'kts', 'scala', 'go', 'rs',
  'c', 'h', 'cpp', 'cc', 'hpp', 'cs', 'swift', 'm', 'dart', 'lua', 'r', 'pl', 'ex', 'exs',
  'sh', 'bash', 'zsh', 'ps1', 'bat', 'cmd', 'sql', 'prisma', 'graphql', 'gql', 'proto',
  'html', 'htm', 'css', 'scss', 'sass', 'less', 'vue', 'svelte',
  'json', 'jsonc', 'yaml', 'yml', 'toml', 'ini', 'xml', 'env', 'gradle', 'tf', 'dockerfile', 'makefile',
] as const;
/** Extension-less files the backend recognises as code. */
const CODE_FILE_NAMES = ['dockerfile', 'makefile', '.gitignore', '.editorconfig', '.env.example'] as const;

const toAccept = (exts: readonly string[]) => exts.map((e) => `.${e}`).join(',');

export const ATTACHMENT_CATEGORIES: readonly AttachmentCategory[] = [
  {
    kind: 'image',
    label: 'Image',
    description: 'PNG, JPEG, GIF or WebP',
    extensions: IMAGE_EXT,
    accept: `${toAccept(IMAGE_EXT)},image/png,image/jpeg,image/gif,image/webp`,
  },
  {
    kind: 'document',
    label: 'Document',
    description: 'PDF, Word, text, Markdown or CSV',
    extensions: DOCUMENT_EXT,
    accept: toAccept(DOCUMENT_EXT),
  },
  {
    kind: 'code',
    label: 'Code',
    description: 'Source, config & data files',
    extensions: CODE_EXT,
    // Extension-less names (Dockerfile…) can't be expressed in `accept`; drag-and-drop still works.
    accept: toAccept(CODE_EXT),
  },
];

export const ALL_ACCEPT = ATTACHMENT_CATEGORIES.map((c) => c.accept).join(',');

export const fileExtension = (name: string): string => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
};

/** Best-effort classification (the server decides for real, by content). */
export function classifyFile(file: File): AttachmentKind | null {
  const ext = fileExtension(file.name);
  const lower = file.name.toLowerCase();
  if ((IMAGE_EXT as readonly string[]).includes(ext) || /^image\/(png|jpe?g|gif|webp)$/.test(file.type)) return 'image';
  if ((DOCUMENT_EXT as readonly string[]).includes(ext)) return 'document';
  if ((CODE_EXT as readonly string[]).includes(ext) || (CODE_FILE_NAMES as readonly string[]).includes(lower)) return 'code';
  if (file.type.startsWith('text/')) return 'document';
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
