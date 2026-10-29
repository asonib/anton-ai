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
- `DEFAULT_LLM_PROVIDER` ∈ `ollama | openai | anthropic | gemini` (default `ollama`).

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
- `BaseLangChainStrategy` implements the template: `ChatPromptTemplate(system → MessagesPlaceholder('history') → MessagesPlaceholder('input'))`, abort-timeout, content/usage extraction, and error normalisation to `LLMProviderException`.
- Concrete strategies (`OllamaStrategy`, `OpenAIStrategy`, `AnthropicStrategy`, `GeminiStrategy`) only implement `createModel()` (and `isConfigured()` when no API key is needed).
- `LLMStrategyFactory.resolve(provider?)` → request `provider` field, else `DEFAULT_LLM_PROVIDER`. Unknown → `ValidationException`; unconfigured → `LLMProviderException(LLM_PROVIDER_NOT_CONFIGURED)`.
- Conversation memory: `LLMService.buildMemory()` windows the last `CHAT_HISTORY_WINDOW` messages from the DB; `composeUserContent()` folds document/code attachment text into user turns as `<attachment>` blocks, and the last `CHAT_HISTORY_IMAGE_LIMIT` history images are re-sent.

**Adding a provider**: (1) add id to `LLM_PROVIDERS` in `config/env.ts` + env vars, (2) add entry to `providerSettings`, (3) create `strategies/XStrategy.ts extends BaseLangChainStrategy`, (4) export from `strategies/index.ts`, (5) register in `container.ts`, (6) add to `LLMProvider` union in `frontend/src/api/types.ts`. No controller/service changes.

### Database

- Schema: `backend/prisma/schema.prisma` → tables `users`, `conversations`, `messages`, `attachments` (snake_case columns via `@map`, UUID `CHAR(36)` ids, cascading FKs).
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
- Markdown via `MarkdownRenderer` (react-markdown + remark-gfm); fenced code renders `CodeBlock` (Prism + "Copy code"); every assistant bubble has "Copy response".

## Gotchas

- `bcrypt` is native; if install fails on Windows, ensure Node LTS and reinstall (`npm rebuild bcrypt`).
- `@types/jsonwebtoken` types `expiresIn` narrowly — `TokenService` casts `env.JWT_EXPIRES_IN`.
- First Ollama call can be slow while the model loads; `LLM_TIMEOUT_MS` (default 120s) and the axios timeout (180s) account for this.
- After a DB reset, old browser JWTs point at users that no longer exist; the auth middleware checks the user row and returns 401 `ACCOUNT_NOT_FOUND`, which logs the frontend out. Sign up again.
- If you changed `MYSQL_USER`/`MYSQL_PASSWORD` after the Docker volume existed, run `docker compose down -v` to recreate it.
