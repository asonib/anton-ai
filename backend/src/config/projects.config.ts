import path from 'node:path';
import { env } from './env';

/** Runtime settings for attached projects (see the "Projects" block in `.env.example`). */
export interface ProjectSettings {
  /** Absolute, normalised directories local projects must live in. Empty = local projects disabled. */
  workspaceRoots: string[];
  /** Folder that holds GitHub clones and new projects (`<projectsDir>/<folder-name>`). */
  projectsDir: string;
  gitBinary: string;
  cloneTimeoutMs: number;
  contextMaxChars: number;
  maxFileBytes: number;
  maxFiles: number;
  llmMaxTokens: number;
}

const workspaceRoots = (env.WORKSPACE_ROOTS ?? '')
  .split(';')
  .map((p) => p.trim())
  .filter((p) => p.length > 0 && path.isAbsolute(p))
  .map((p) => path.resolve(p));

export const projectSettings: ProjectSettings = Object.freeze({
  workspaceRoots,
  // One folder for everything by default: clones and new projects land in the first workspace root.
  projectsDir: path.resolve(env.PROJECTS_DIR ?? workspaceRoots[0] ?? path.resolve(__dirname, '../../data/projects')),
  gitBinary: env.GIT_BINARY,
  cloneTimeoutMs: env.GIT_CLONE_TIMEOUT_MS,
  contextMaxChars: env.PROJECT_CONTEXT_MAX_CHARS,
  maxFileBytes: env.PROJECT_MAX_FILE_KB * 1024,
  maxFiles: env.PROJECT_MAX_FILES,
  llmMaxTokens: env.PROJECT_LLM_MAX_TOKENS,
});

/** Directory names that are never scanned (build output, dependencies, VCS data, caches). */
export const IGNORED_DIRS: ReadonlySet<string> = new Set([
  '.git', '.hg', '.svn', 'node_modules', 'bower_components', 'jspm_packages', 'dist', 'build', 'out', 'coverage',
  '.next', '.nuxt', '.svelte-kit', '.turbo', '.cache', '.parcel-cache', '.vite', '.angular', '.expo',
  'vendor', 'target', 'obj', '__pycache__', '.pytest_cache', '.mypy_cache', '.tox', '.venv', 'venv',
  '.gradle', '.idea', '.vs', 'Pods', 'DerivedData', '.terraform', '.serverless',
]);

/**
 * Files that are listed in the tree but whose content is NEVER sent to the model
 * (secrets and machine-generated lock files). Matched against the file name.
 */
export const SECRET_FILE_PATTERNS: readonly RegExp[] = [
  /^\.env(\..*)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore|crt|cer|der)$/i,
  /^id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /^\.npmrc$/i,
  /^\.pypirc$/i,
  /^\.netrc$/i,
  /^credentials(\.json)?$/i,
  /secrets?\.(json|ya?ml|toml)$/i,
];

/** `.env.example`-style templates are fine to share. */
export const SECRET_FILE_ALLOW: readonly RegExp[] = [/^\.env\.(example|sample|template|dist)$/i];

export const LOCK_FILES: ReadonlySet<string> = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'npm-shrinkwrap.json', 'Cargo.lock', 'poetry.lock',
  'Pipfile.lock', 'composer.lock', 'Gemfile.lock', 'go.sum', 'pubspec.lock', 'mix.lock', 'flake.lock', 'packages.lock.json',
]);

/** Extensions treated as binary without reading the file. */
export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.icns', '.webp', '.avif', '.tif', '.tiff', '.psd', '.ai', '.sketch', '.fig',
  '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.mp4', '.mov', '.avi', '.mkv', '.webm',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.zip', '.gz', '.tgz', '.bz2', '.xz', '.7z', '.rar', '.tar', '.jar', '.war', '.ear',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.odt',
  '.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.o', '.obj', '.class', '.pyc', '.pyo', '.wasm', '.node',
  '.db', '.sqlite', '.sqlite3', '.mdb', '.bin', '.dat', '.iso', '.dmg', '.apk', '.ipa', '.map',
]);

/** Files that explain a project; they are sent before other files when the budget is tight. */
export const KEY_FILES: ReadonlySet<string> = new Set([
  'readme.md', 'readme', 'readme.txt', 'claude.md', 'agents.md', 'contributing.md',
  'package.json', 'tsconfig.json', 'vite.config.ts', 'next.config.js', 'next.config.mjs', 'angular.json',
  'pyproject.toml', 'requirements.txt', 'setup.py', 'setup.cfg', 'cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
  'build.gradle.kts', 'gemfile', 'composer.json', 'makefile', 'dockerfile', 'docker-compose.yml', 'schema.prisma',
]);

/** Format the model must use for edits; parsed by `utils/projectChangeParser.ts`. */
export const PROJECT_EDIT_INSTRUCTIONS = `You are working inside the user's code project shown below in <project>. Answer questions about it, and when the user asks for changes, propose them as file edits.

How to propose edits:
- Start with a short Markdown explanation of what you are changing and why.
- Then output every changed file as a block in EXACTLY this format (no code fences around it):
<<<FILE path="relative/path/from/project/root.ext" action="modify">>>
the COMPLETE new content of the file
<<<END FILE>>>
- action is "create" for a new file, "modify" for an existing file, "delete" to remove a file (leave the body empty).
- Always write the whole file. Never abbreviate with "...", "rest unchanged" or partial snippets — the block replaces the file on disk.
- Paths are relative to the project root and use forward slashes. Never touch .git, dependency folders or secret files.
- Only modify files whose content is shown in <project>. If you need a file that is listed but not shown, ask the user to mention its path in their next message instead of guessing its content.
- Keep the existing code style, indentation and line endings. Change only what the request needs.
- The user reviews a diff and decides what to apply, so do not claim that files have already been changed.
- If no file changes are needed, just answer normally without any blocks.`;
