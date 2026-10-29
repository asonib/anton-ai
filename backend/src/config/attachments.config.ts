import { env } from './env';

/**
 * Attachment limits + the allow-list of file types. The frontend mirrors these
 * lists in `frontend/src/config/attachments.ts` for the file picker; the
 * backend is authoritative and re-checks everything (including magic bytes).
 */
export interface AttachmentLimits {
  maxFiles: number;
  maxFileBytes: number;
  maxTextChars: number;
}

export const attachmentLimits: AttachmentLimits = Object.freeze({
  maxFiles: env.ATTACHMENT_MAX_FILES,
  maxFileBytes: Math.floor(env.ATTACHMENT_MAX_FILE_MB * 1024 * 1024),
  maxTextChars: env.ATTACHMENT_MAX_TEXT_CHARS,
});

/** Images are sent to the model as image input. SVG is deliberately excluded (scriptable). */
export const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'] as const;

/** Binary documents that need a text extractor. */
export const BINARY_DOCUMENT_EXTENSIONS = ['pdf', 'docx'] as const;

/** Plain-text documents (decoded as UTF-8). */
export const TEXT_DOCUMENT_EXTENSIONS = ['txt', 'md', 'markdown', 'csv', 'tsv', 'log'] as const;

/** Source / config files → extension: language tag used for the fenced block in the prompt. */
export const CODE_LANGUAGES: Readonly<Record<string, string>> = Object.freeze({
  ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
  py: 'python', rb: 'ruby', php: 'php', java: 'java', kt: 'kotlin', kts: 'kotlin', scala: 'scala',
  go: 'go', rs: 'rust', c: 'c', h: 'c', cpp: 'cpp', cc: 'cpp', hpp: 'cpp', cs: 'csharp',
  swift: 'swift', m: 'objectivec', dart: 'dart', lua: 'lua', r: 'r', pl: 'perl', ex: 'elixir', exs: 'elixir',
  sh: 'bash', bash: 'bash', zsh: 'bash', ps1: 'powershell', bat: 'batch', cmd: 'batch',
  sql: 'sql', prisma: 'prisma', graphql: 'graphql', gql: 'graphql', proto: 'protobuf',
  html: 'html', htm: 'html', css: 'css', scss: 'scss', sass: 'sass', less: 'less', vue: 'vue', svelte: 'svelte',
  json: 'json', jsonc: 'json', yaml: 'yaml', yml: 'yaml', toml: 'toml', ini: 'ini', xml: 'xml',
  env: 'bash', gradle: 'groovy', tf: 'hcl', dockerfile: 'dockerfile', makefile: 'makefile',
});

/** Extension-less files recognised as code by their (lower-cased) name. */
export const CODE_FILE_NAMES: Readonly<Record<string, string>> = Object.freeze({
  dockerfile: 'dockerfile',
  makefile: 'makefile',
  '.gitignore': 'gitignore',
  '.editorconfig': 'ini',
  '.env.example': 'bash',
});
