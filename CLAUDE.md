# CLAUDE.md — AI Chat (layered TypeScript monorepo)

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
| New migration after editing `backend/prisma/schema.prisma` | `npm run db:migrate -- --name <change_name>` |
| Apply committed migrations | `npm run db:deploy` |
| Reset DB (destroys data, dev only) | `npm run db:reset` |
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
4. **Exceptions**: throw from `src/exceptions` only — `AppException` (base), `ValidationException` 400, `UnauthorizedException` 401, `ResourceNotFoundException` 404, `ConflictException` 409, `LLMProviderException` (429/502/503/504 by code). Never `res.status(...).json` for errors; `errorHandler.middleware.ts` is the single writer of error responses.
5. **Multi-user isolation**: user identity comes **only** from `req.user` set by `createAuthMiddleware` (JWT `sub`). Every service method takes `userId` first and every repository query filters by `userId`. Return 404 (not 403) for other users' resources. Never accept `userId` from the body/query.
6. **Persistence**: use repositories; pass `tx` (`DbClient`) for multi-write operations inside `prisma.$transaction`. `ChatService.sendPrompt` calls the LLM *before* opening the transaction, then writes conversation + user message + assistant message atomically.
7. **DTOs**: map entities via `src/models/mappers.ts`; never return Prisma entities (e.g. `passwordHash`) directly.
8. **Response envelope**: `{ success: true, data, meta? }` / `{ success: false, error: { code, message, details?, path, timestamp, requestId } }`.

### LLM Strategy layer

- Contract: `ILLMStrategy.generateResponse(prompt, history?, options?) → Promise<LLMResponse>` (request/response, **no SSE/streaming**).
- `BaseLangChainStrategy` implements the template: `ChatPromptTemplate(system → MessagesPlaceholder('history') → human)`, abort-timeout, content/usage extraction, and error normalisation to `LLMProviderException`.
- Concrete strategies (`OllamaStrategy`, `OpenAIStrategy`, `AnthropicStrategy`, `GeminiStrategy`) only implement `createModel()` (and `isConfigured()` when no API key is needed).
- `LLMStrategyFactory.resolve(provider?)` → request `provider` field, else `DEFAULT_LLM_PROVIDER`. Unknown → `ValidationException`; unconfigured → `LLMProviderException(LLM_PROVIDER_NOT_CONFIGURED)`.
- Conversation memory: `LLMService.buildMemory()` windows the last `CHAT_HISTORY_WINDOW` messages from the DB.

**Adding a provider**: (1) add id to `LLM_PROVIDERS` in `config/env.ts` + env vars, (2) add entry to `providerSettings`, (3) create `strategies/XStrategy.ts extends BaseLangChainStrategy`, (4) export from `strategies/index.ts`, (5) register in `container.ts`, (6) add to `LLMProvider` union in `frontend/src/api/types.ts`. No controller/service changes.

### Database

- Schema: `backend/prisma/schema.prisma` → tables `users`, `conversations`, `messages` (snake_case columns via `@map`, UUID `CHAR(36)` ids, cascading FKs).
- Never edit an applied migration; create a new one with `npm run db:migrate -- --name ...`.

## Frontend conventions

- **Styling: `styled-components` only.** No CSS/SCSS files, no Tailwind, no inline `style` except for third-party props (e.g. SyntaxHighlighter `customStyle`).
- Theme tokens in `src/styles/theme.ts` (`darkTheme`, `lightTheme`); typed via `styles/styled.d.ts` (`DefaultTheme extends AppTheme`). Read every color/spacing/radius from `theme` — no hard-coded hex inside components.
- Global styles only in `styles/GlobalStyle.ts`; keyframes/mixins only in `styles/animations.ts`; media queries via `media.mobile`.
- Use **transient props** (`$active`, `$isUser`) for styled-only props so they don't hit the DOM.
- `AppThemeProvider` (ThemeModeContext) wraps `ThemeProvider` + `GlobalStyle`; toggle with `useThemeMode()`.
- HTTP only through `src/api/*Api.ts` using the shared `http` axios instance (auth header interceptor; 401 → `aichat:unauthorized` event → logout). Never call `fetch`/`axios` from components.
- localStorage only via `src/utils/storage.ts`.
- State/side-effects in hooks (`useChat`), components stay presentational. Errors → `toNormalisedError()` → `<ErrorBanner/>`.
- Markdown via `MarkdownRenderer` (react-markdown + remark-gfm); fenced code renders `CodeBlock` (Prism + "Copy code"); every assistant bubble has "Copy response".

## Gotchas

- `bcrypt` is native; if install fails on Windows, ensure Node LTS and reinstall (`npm rebuild bcrypt`).
- `@types/jsonwebtoken` types `expiresIn` narrowly — `TokenService` casts `env.JWT_EXPIRES_IN`.
- First Ollama call can be slow while the model loads; `LLM_TIMEOUT_MS` (default 120s) and the axios timeout (180s) account for this.
- `prisma migrate dev` needs a shadow DB; `docker/mysql/init/01-grant-dev-privileges.sh` grants that on first container start. If you changed `MYSQL_USER` after the volume existed, run `docker compose down -v`.
