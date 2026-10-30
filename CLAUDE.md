# CLAUDE.md — Anton AI (layered TypeScript monorepo)

Guidance for Claude Code sessions working in this repository. Read this before editing.

## Commands

| Purpose | Command (run from repo root unless noted) |
| --- | --- |
| First-time bootstrap | `npm run setup` (add `-- --skip-docker` to use an existing MySQL) |
| Run everything (API :4000 + Web :5173) | `npm run dev` |
| Backend only / frontend only | `npm run dev:backend` / `npm run dev:frontend` |
| Type-check both apps | `npm run typecheck` |
| Production build | `npm run build` then `npm start` (serves API from `backend/dist`) |
| MySQL container | `npm run db:up`, `npm run db:down`, `npm run db:logs` |
| Sync DB after editing `backend/prisma/schema.prisma` | `npm run db:push` (also regenerates the client) |
| Reset DB — drop all tables and recreate (destroys data) | `npm run db:reset` |
| Regenerate Prisma client | `npm --prefix backend run prisma:generate` |
| Prisma Studio | `npm run db:studio` |

Always run `npm run typecheck` after changes. Both apps use `strict` TS with `noUnusedLocals`/`noUnusedParameters`.

## Environment

- Template: `.env.example` (root). `setup` copies it to `.env` (read by docker compose) and `backend/.env` (read by the API and Prisma CLI). Frontend: `frontend/.env` from `frontend/.env.example`.
- **Only `backend/src/config/env.ts` may read `process.env`.** It validates with zod and exits on bad config. Add new variables there (with defaults) and to `.env.example`.
- Provider settings live in `backend/src/config/llm.config.ts` (`providerSettings`, `llmDefaults`).
- `DEFAULT_LLM_PROVIDER` ∈ `ollama | openai | anthropic | gemini | grok` (default `ollama`).

## Backend architecture — strict boundaries

```
HTTP → routes → middlewares (requestLogger → auth) → Controller → Service → Strategy (LLM)
                                                                   ↘ Repository → Prisma → MySQL
errors anywhere → throw AppException subclass → errorHandler middleware → standard envelope
```

| Layer | Folder | May depend on | Must NOT |
| --- | --- | --- | --- |
| Routes | `src/routes` | controllers, middlewares (via `Container`) | contain logic |
| Controllers | `src/controllers` | services, `validators`, `utils/apiResponse` | touch Prisma, call strategies, build error JSON |
| Services | `src/services` | repositories, `LLMService`/factory, exceptions | import `express`, read `req`/`res` |
| Strategies | `src/strategies` | `config`, LangChain, exceptions | touch the DB or HTTP |
| Repositories | `src/models/repositories` | Prisma client / `DbClient` | contain business rules or throw HTTP errors |
| Middlewares | `src/middlewares` | services (token), exceptions | contain business logic |

Rules:

1. **Wiring happens only in `src/container.ts`** (manual constructor injection). Never `new` a service/repository elsewhere.
2. **Controllers** are classes with arrow-function handlers, wrapped by `asyncHandler` in routes. Pattern: `validate(schema, req.body)` → service call → `ApiResponse.ok|created|noContent`.
3. **Validation** uses zod schemas in `src/validators/*.schemas.ts`; `validate()` throws `ValidationException` with `details[]`.
4. **Exceptions**: throw from `src/exceptions` only — `AppException` (base), `ValidationException` 400, `UnauthorizedException` 401, `ResourceNotFoundException` 404, `ConflictException` 409, `PayloadTooLargeException` 413, `UnsupportedMediaTypeException` 415, `LLMProviderException` (429/502/503/504 by code). Never `res.status(...).json` for errors; `errorHandler.middleware.ts` is the single writer of error responses.
5. **Multi-user isolation**: user identity comes **only** from `req.user` set by `createAuthMiddleware` (JWT `sub`). Every service method takes `userId` first and every repository query filters by `userId`. Return 404 (not 403) for other users' resources. Never accept `userId` from the body/query.
6. **Persistence**: use repositories; pass `tx` (`DbClient`) for multi-write operations inside `prisma.$transaction`. `ChatService.sendPrompt` calls the LLM *before* opening the transaction, then writes conversation + user message + assistant message atomically.
7. **DTOs**: map entities via `src/models/mappers.ts`; never return Prisma entities (e.g. `passwordHash`) directly.
8. **Attachments**: `POST /chats/prompt` accepts JSON or `multipart/form-data` (`files[]`). `uploadMiddleware` (multer, memory storage, limits from `config/attachments.config.ts`) runs only for multipart; the controller maps multer files to plain `UploadedFile`s so services never see Express types. `AttachmentService.prepare()` classifies by content (`utils/fileTypes.ts`), extracts text (pdf-parse / mammoth / UTF-8) and runs *before* the LLM call; rows are written in the same transaction as the user message. Bytes are only served by `GET /attachments/:id/content` (owner-scoped, images inline, everything else forced download). Never return `data` blobs in message DTOs — use `attachmentMetaSelect`.
9. **Response envelope**: `{ success: true, data, meta? }` / `{ success: false, error: { code, message, details?, path, timestamp, requestId } }`.

### LLM Strategy layer

- Contract: `ILLMStrategy.generateResponse(prompt, history?, options?, images?) → Promise<LLMResponse>` (request/response, **no SSE/streaming**). `images` (`LLMImage[]`) and `Message.images` become LangChain `image_url` data-URL parts.
- `BaseLangChainStrategy` implements the template: `ChatPromptTemplate(system → MessagesPlaceholder('history') → MessagesPlaceholder('input'))`, optional abort-timeout (`LLM_TIMEOUT_MS`, 0 = unlimited), content/usage extraction, and error normalisation to `LLMProviderException`.
- Concrete strategies (`OllamaStrategy`, `OpenAIStrategy`, `AnthropicStrategy`, `GeminiStrategy`, `GrokStrategy` — xAI via `ChatOpenAI` + `XAI_BASE_URL`) only implement `createModel()` (and `isConfigured()` when no API key is needed).
- Anthropic thinking: `ANTHROPIC_THINKING` (`auto` default | `adaptive` | `enabled` | `disabled`), `ANTHROPIC_THINKING_BUDGET` (enabled only), `ANTHROPIC_EFFORT` (→ `output_config.effort`), exposed as `anthropicSettings` in `llm.config.ts`. The installed `@langchain/anthropic` always sends `thinking: {type:'disabled'}` + sampling params and doesn't know `adaptive`, so `AnthropicStrategy` overrides them via `invocationKwargs` (spread last; `undefined` keys drop out). In `auto` it sends the classic request, and when a 400 mentions "adaptive" (or rejects temperature/top_p/top_k) it remembers that per model and retries (max 2). Thinking blocks are ignored by `extractText()`.
- `LLMStrategyFactory.resolve(provider?)` → request `provider` field, else `DEFAULT_LLM_PROVIDER`. Unknown → `ValidationException`; unconfigured → `LLMProviderException(LLM_PROVIDER_NOT_CONFIGURED)`.
- Conversation memory: `LLMService.buildMemory()` windows the last `CHAT_HISTORY_WINDOW` messages from the DB; `composeUserContent()` folds document/code attachment text into user turns as `<attachment>` blocks, and the last `CHAT_HISTORY_IMAGE_LIMIT` history images are re-sent.

**Adding a provider**: (1) add id to `LLM_PROVIDERS` in `config/env.ts` + env vars, (2) add entry to `providerSettings`, (3) create `strategies/XStrategy.ts extends BaseLangChainStrategy`, (4) export from `strategies/index.ts`, (5) register in `container.ts`, (6) add to `LLMProvider` union in `frontend/src/api/types.ts`. No controller/service changes.

### Skills

- Defined only in `backend/src/config/skills.config.ts` (`SKILLS`: `id`, `name`, `icon` ∈ `SKILL_ICONS`, `tagline`, `description`, `samplePrompts`, `instructions`). `SkillService` (wired in `container.ts`) serves the public fields at `GET /skills` and turns `promptSchema.skill` into `LLM_SYSTEM_PROMPT + instructions` (unknown id → 400) before the LLM call; `instructions` never leave the server. Skill is per request (like `provider`), not stored in the DB.
- Frontend: `useSkills` (list + choice persisted via `storage.getSkill`) owned by `ChatPage`. `SkillLauncher` is the pill at the top right (desktop: floats over the chat area in the same layer — `TopBar` is absolute and `ChatViewport reserveTop` pads the content; translucent `colors.panel` fill; mobile: top bar beside New chat) that opens a circular bubble with options on a ring and a hub describing the focused one (arrows cycle, Enter picks, Esc closes; on mobile it is `position: fixed`). Picking a skill starts a new chat (draft kept). `EmptyState` shows the skill's icon/name/description/sample prompts; clicking a sample **fills** the composer (never sends) and selects the first `[PLACEHOLDER]` via `PromptInput`'s `selection` prop. Icons map in `SkillIcon.tsx` — keep it in sync with `SKILL_ICONS`.
- Adding a skill: append to `SKILLS` (new icon → add to `SKILL_ICONS` and `SkillIcon.tsx`). No other changes.

### Prompt library

- Shared library: **every user can read and search every prompt**, add prompts, and favourite any prompt; only the author can edit/delete (others get 404). This is the one deliberate exception to rule 5 — reads are not filtered by `userId`, but they are always evaluated for the viewer (`isFavorite`, `isOwner`) and writes are scoped by `authorId`. DTOs expose `authorName` (e-mail local part), never the author's id or full e-mail.
- Config in `backend/src/config/prompts.config.ts`: `PROMPT_CATEGORIES` (`id`, `name`, `icon` ∈ `PROMPT_CATEGORY_ICONS`, served at `GET /prompts/categories`) and `BUILT_IN_PROMPTS` (`authorId = null`, matched by `builtInKey`). `PromptService.syncBuiltIns()` upserts them on server start and deletes removed ones; a failure (e.g. table missing → run `npm run db:push`) only logs a warning.
- Routes `src/routes/prompt.routes.ts` → `PromptController` → `PromptService` → `PromptRepository` (search = every whitespace-separated term must appear in title or content; MySQL collation makes it case-insensitive). Validation in `validators/prompt.schemas.ts`.
- Frontend: `PromptLibraryTrigger` pill at the top right (left of `SkillLauncher`, Ctrl/Cmd+K) opens `PromptLibrary`, which covers the chat area (fixed full-screen on mobile): search (debounced), scope tabs (All / Favorites / Created by app / My prompts), category chips, card grid (`PromptCard`: heart, edit/delete for owners, Use) and `PromptEditor` dialog. State in `usePromptLibrary(open)` owned by `ChatPage`; HTTP in `api/promptApi.ts`. Using a prompt **fills** the composer (never sends) and selects the first `[PLACEHOLDER]`. Category icons map in `PromptCategoryIcon.tsx` — keep it in sync with `PROMPT_CATEGORY_ICONS`.

### Projects (codebase context + reviewed edits)

- A `Project` is a local folder (must resolve — via `realpath` — inside `projectSettings.workspaceRoots`, from `WORKSPACE_ROOTS`; none = local disabled) or a public GitHub repo shallow-cloned by `ProjectFileService.clone()` (`git` via `execFile`, `childProcessEnv` from `config/env.ts`, `core.symlinks=false`, no prompts) into `PROJECTS_DIR/<repo>`, or a new empty project (`POST /projects/new` → `PROJECTS_DIR/<name>`, stored as `local`). `PROJECTS_DIR` defaults to the first `WORKSPACE_ROOTS` entry so clones and new projects land in the user's workspace folder; `ProjectFileService.reserveFolder()` makes a Windows-safe readable name (`safeFolderName`) and adds `-2`, `-3` … via atomic `mkdir`. Removing a project never deletes files inside `WORKSPACE_ROOTS` (only app-private clones outside them). Settings, ignore lists (`IGNORED_DIRS`, `SECRET_FILE_PATTERNS`, `LOCK_FILES`, `BINARY_EXTENSIONS`, `KEY_FILES`) and the model's edit format (`PROJECT_EDIT_INSTRUCTIONS`) live in `config/projects.config.ts`.
- **All project file I/O goes through `ProjectFileService`** (`services/projectFiles.service.ts`): paths are normalised with `utils/projectPaths.ts` (`normaliseRelativePath` rejects absolute paths, `..`, `.git`), must stay inside the root, and any symlinked segment is refused. Scans skip symlinks, `IGNORED_DIRS` and the root `.gitignore` (`GitIgnore`). Never use `fs` on project paths elsewhere.
- Flow in `ChatService.sendPrompt` when `projectId` is sent: `ProjectService.buildContext()` (`ProjectContextService`: tree + whole files ranked by prompt mentions → files changed earlier in the conversation → `KEY_FILES` → shallow/small, within `PROJECT_CONTEXT_MAX_CHARS`; files are never truncated) is appended to the system prompt (after the skill prompt) and `maxTokens = PROJECT_LLM_MAX_TOKENS`; after the LLM call `ProjectService.proposeChanges()` parses `<<<FILE …>>>` blocks (`utils/projectChangeParser.ts`), reads the current files (original + SHA-256 `baseHash`, CRLF preserved, no-ops dropped) and returns cleaned Markdown + rows. Rows are inserted as `project_changes` in the same transaction as the assistant message; the conversation stores the last `projectId` (UI restores it). `LLMService.buildMemory()` appends `[Proposed file changes: …]` to assistant turns.
- Nothing touches disk until `POST /projects/changes/apply` (conflict if the file hash ≠ `baseHash`, unless `force`); `discard` marks pending rows; `revert` restores `originalContent` (conflict if the file ≠ applied content). Results are per file: `{ changes[], conflicts[] }`. Errors use `ProjectWorkspaceException` (`GIT_NOT_AVAILABLE` 503, `GIT_CLONE_FAILED` 422, `PROJECT_UNAVAILABLE` 409, `PROJECT_PATH_FORBIDDEN` 403).
- Folder picker: browsers can't expose real folder paths, so `GET /projects/browse?path=` (`ProjectService.browse` → `resolveWorkspaceDir` realpath check + `ProjectFileService.listSubfolders`, hidden/`IGNORED_DIRS`/symlinks skipped, max 500) lists sub-folders inside `WORKSPACE_ROOTS` with `isGitRepo` and the viewer's `projectId`. Frontend `FolderPicker` (breadcrumbs from the root, up, filter, refresh, per-row Attach, "Attach this folder") driven by `useFolderBrowser(enabled)` owned by `ChatPage`; "Enter a path instead" keeps the manual input.
- Frontend: `ProjectTrigger` pill (top right, left of `PromptLibraryTrigger`) opens `ProjectPanel` (same overlay pattern as the prompt library; "Open a folder" picker card full width, then New project + GitHub cards; attach/detach, remove). `useProjects(activeId)` holds the list/config; the attached id lives in `useChat` (`projectId`, sent with every prompt, restored from `conversation.projectId`, kept for New chat). `ProjectChip` above the composer shows/detaches it. Assistant bubbles with `message.changes` render `ProjectChanges` (state in `useProjectChanges`: selection, lazy `GET /projects/changes/:id`, apply/discard/revert, conflict "Overwrite anyway") with `DiffView` (`utils/diff.ts`, LCS line diff, falls back to whole-file replace for huge files).

### Database

- Schema: `backend/prisma/schema.prisma` → tables `users`, `conversations`, `messages`, `attachments`, `prompts`, `prompt_favorites`, `projects`, `project_changes` (snake_case columns via `@map`, UUID `CHAR(36)` ids, cascading FKs).
- **No migration files** (pre-production): the schema is the source of truth and is applied with `prisma db push`. Destructive changes need `npm run db:reset`. Introduce `prisma migrate` before the first production deploy.

## Frontend conventions

- **Styling: `styled-components` only.** No CSS/SCSS files, no Tailwind, no inline `style` except for third-party props (e.g. SyntaxHighlighter `customStyle`).
- **Palettes** live in `src/styles/palettes.ts` (`jarvis` default, `classic`, `matrix`, `cyberpunk`). Each palette MUST define both `dark` and `light` variants (`colors` + `shadows`). The active palette is chosen by the operator via `VITE_THEME_PALETTE` in `frontend/.env`; users can only toggle dark/light (no palette picker in the UI). To add one: add an entry to `PALETTES`, then list the id in `frontend/.env.example`.
- Theme tokens in `src/styles/theme.ts`; `buildTheme(paletteId, mode)` merges shared tokens (spacing, radii, fonts, layout) with the palette variant. Typed via `styles/styled.d.ts` (`DefaultTheme extends AppTheme`). Read every color/spacing/radius/shadow from `theme` — no hard-coded hex inside components (palette files are the only place hex values live). Use `colors.onPrimary` for content on primary/gradient fills, `colors.panel` for HUD/sidebar containers, `shadows.glow` for active-state glow (`none` in palettes without glow).
- **Only `src/config/env.ts` may read `import.meta.env`** (exports `appEnv`: `appName`, `apiBaseUrl`, `themePalette`). Declare new `VITE_*` vars in `src/vite-env.d.ts` and `frontend/.env.example`.
- Sidebar is collapsible on desktop (icon rail, `layout.sidebarCollapsedWidth`; toggle button or Ctrl/Cmd+B; persisted via `storage.getSidebarCollapsed`). On mobile it remains a drawer — gate collapsed-only styles behind `media.desktop`.
- Global styles only in `styles/GlobalStyle.ts`; keyframes/mixins only in `styles/animations.ts`; media queries via `media.mobile` / `media.desktop`.
- Use **transient props** (`$active`, `$isUser`) for styled-only props so they don't hit the DOM.
- `AppThemeProvider` (ThemeModeContext) wraps `ThemeProvider` + `GlobalStyle`; toggle with `useThemeMode()`.
- HTTP only through `src/api/*Api.ts` using the shared `http` axios instance (auth header interceptor; 401 → `antonai:unauthorized` event → logout). Never call `fetch`/`axios` from components.
- localStorage only via `src/utils/storage.ts`.
- State/side-effects in hooks (`useChat`), components stay presentational. Errors → `toNormalisedError()` → `<ErrorBanner/>`.
- Attachments: `AttachMenu` (paperclip, left of the textarea, upward menu Image/Document/Code) + `AttachmentTray` in `PromptInput`; state in `useAttachments`; rendered in bubbles by `MessageAttachments`. Stored files are fetched as blobs via `chatApi.getAttachmentBlob` (`useAttachmentUrl`) because `<img src>` can't carry the JWT. Allowed types/limits mirror the backend in `src/config/attachments.ts`.
- Voice input: `useSpeechToText(draft, setDraft)` (Web Speech API, owned by `ChatPage`) drives the mic button between Clear and Send in `PromptInput` (Ctrl/Cmd+Shift+M). Speech is appended to existing text; typing, sending or Esc cancels dictation. Needs Chromium/Safari and a secure context (https or localhost) — over plain-http LAN URLs the button is disabled.
- Read aloud: every assistant bubble has a "Listen"/"Stop" button left of "Copy response", driven by `useTextToSpeech(message.id)` (browser `speechSynthesis`, no backend). It uses a female voice: the API doesn't report gender, so `pickFemaleVoice()` matches known female voice names, prefers the user's language and "Natural"/"Online" voices, and falls back to the browser default if none match. A module-level store means only one message speaks at a time, and speech stops when its bubble unmounts. `utils/speech.ts` turns the Markdown into plain prose (code blocks are announced, not read out) and splits it into chunks of about 220 characters, because Chromium cuts off long utterances.
- Download: assistant bubbles have a "Download" button (`DownloadMenu`, between Listen and Copy response). It opens an upward menu with Markdown (.md, the raw content) or Plain text (.txt, via `utils/markdownText.ts`, which keeps code verbatim). Files are saved client-side with `saveTextFile` in `utils/download.ts` and named `anton-response-YYYY-MM-DD-HHmm.<ext>`. Footer action order: Listen → Download → Copy response.
- Markdown via `MarkdownRenderer` (react-markdown + remark-gfm); fenced code renders `CodeBlock` (Prism + "Copy code"); every assistant bubble has "Copy response".

## Gotchas

- `bcrypt` is native; if install fails on Windows, ensure Node LTS and reinstall (`npm rebuild bcrypt`).
- `@types/jsonwebtoken` types `expiresIn` narrowly — `TokenService` casts `env.JWT_EXPIRES_IN`.
- Model calls have **no time limit** by default: `LLM_TIMEOUT_MS=0` means no abort signal, provider SDK timeouts are set to the max timer value (`sdkTimeoutMs()`), `server.requestTimeout = 0`, and `chatApi.sendPrompt` sends with axios `timeout: 0`. Set `LLM_TIMEOUT_MS` > 0 to bring a limit back. OpenAI/Grok/Anthropic/Gemini use `streaming: true` *internally* (still one response to the client), and Ollama always streams. That way Node's fetch never hits its 5-minute wait for response headers, and Anthropic doesn't refuse long non-streaming requests.
- After a DB reset, old browser JWTs point at users that no longer exist; the auth middleware checks the user row and returns 401 `ACCOUNT_NOT_FOUND`, which logs the frontend out. Sign up again.
- If you changed `MYSQL_USER`/`MYSQL_PASSWORD` after the Docker volume existed, run `docker compose down -v` to recreate it.
