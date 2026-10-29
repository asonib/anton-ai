---
name: enterprise-ts-layered-multi-llm
description: Reusable reference for building Node.js/TypeScript layered APIs with a Strategy + Factory LLM layer, standard error contracts, JWT multi-tenant isolation, and React styled-components theming. Use when replicating or extending this architecture.
---

# Skill: Enterprise TypeScript Layered Architecture with Multi-LLM Strategy

This document is a **portable pattern reference**. Follow it to scaffold a new service with the same shape, or to extend this repository without eroding its boundaries.

---

## 1. Backend layering (Node.js · Express · TypeScript)

### 1.1 Folder contract

```
src/
  config/        env.ts (zod-validated, sole reader of process.env), <domain>.config.ts
  exceptions/    AppException + typed subclasses, index.ts barrel
  models/        prisma.client.ts, types.ts (DTOs), mappers.ts, repositories/*.repository.ts
  strategies/    I<X>Strategy.ts, Base<X>Strategy.ts, <Impl>Strategy.ts, <X>StrategyFactory.ts
  services/      <domain>.service.ts — business rules, orchestration
  controllers/   <domain>.controller.ts — HTTP adapter only
  validators/    <domain>.schemas.ts (zod) + validate.ts
  middlewares/   auth, requestLogger, errorHandler (+ notFound)
  routes/        <domain>.routes.ts + index.ts (versioned mount: /api/v1)
  utils/         logger, asyncHandler, apiResponse
  container.ts   composition root
  app.ts         express factory (no listen)
  server.ts      bootstrap, DB connect, graceful shutdown
```

### 1.2 Dependency direction (never reverse)

```
routes → controllers → services → { strategies, repositories } → { SDKs, Prisma }
                 ↘ validators     ↘ exceptions (any layer may throw)
```

- Controllers know HTTP; services do not. Repositories know SQL/ORM; services do not.
- Construction only in `container.ts` (constructor injection). This keeps every class unit-testable with fakes.

### 1.3 Canonical snippets

**Controller** — validate, delegate, envelope:

```ts
export class ChatController {
  constructor(private readonly chats: ChatService) {}
  prompt = async (req: Request, res: Response) => {
    const user = currentUser(req);                       // from JWT only
    const input = validate(promptSchema, req.body);      // throws ValidationException
    return ApiResponse.ok(res, await this.chats.sendPrompt(user.id, input));
  };
}
// routes: router.post('/prompt', asyncHandler(controllers.chat.prompt));
```

**Repository** — always scoped by owner, optional transaction client:

```ts
findByIdForUser(id: string, userId: string, db: DbClient = this.prisma) {
  return db.conversation.findFirst({ where: { id, userId } });
}
```

**Service** — business flow, external call before the transaction:

```ts
const llm = await this.llm.generate(prompt, history, provider, opts);   // may throw LLMProviderException
const saved = await this.prisma.$transaction(async (tx) => { /* create conv, user msg, assistant msg */ });
```

**Env loader** — fail fast:

```ts
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) { console.error(...); process.exit(1); }
export const env = Object.freeze(parsed.data);
```

---

## 2. Strategy + Factory for multi-LLM switching

### 2.1 Contract

```ts
export interface ILLMStrategy {
  readonly provider: LLMProvider;          // 'ollama' | 'openai' | 'anthropic' | 'gemini'
  readonly label: string;
  readonly defaultModel: string;
  isConfigured(): boolean;
  generateResponse(prompt: string, history?: Message[], options?: LLMOptions): Promise<LLMResponse>;
}
// LLMResponse = { content, provider, model, usage?, latencyMs, finishReason? }
```

Request/response only. If streaming is ever required, add a *separate* `IStreamingLLMStrategy` rather than changing this signature.

### 2.2 Template-method base (LangChain)

```ts
export abstract class BaseLangChainStrategy implements ILLMStrategy {
  protected static readonly promptTemplate = ChatPromptTemplate.fromMessages([
    ['system', '{systemPrompt}'],
    new MessagesPlaceholder('history'),
    ['human', '{input}'],
  ]);
  protected abstract createModel(o: ResolvedLLMOptions): BaseChatModel;   // the only provider-specific bit

  async generateResponse(prompt, history = [], options = {}) {
    if (!this.isConfigured()) throw new LLMProviderException(this.provider, '...', 'LLM_PROVIDER_NOT_CONFIGURED');
    const chain = BaseLangChainStrategy.promptTemplate.pipe(this.createModel(resolved));
    try {
      const msg = await chain.invoke({ systemPrompt, history: toLangChain(history), input: prompt },
                                     { signal: AbortSignal.timeout(resolved.timeoutMs) });
      return { content: extractText(msg), usage: extractUsage(msg), ... };
    } catch (e) { throw this.normaliseError(e, resolved); }    // → timeout/unavailable/auth/rate-limit/…
  }
}
```

A concrete provider is ~15 lines:

```ts
export class GeminiStrategy extends BaseLangChainStrategy {
  constructor(settings = providerSettings.gemini) { super(settings); }
  protected createModel(o: ResolvedLLMOptions): BaseChatModel {
    return new ChatGoogleGenerativeAI({ apiKey: this.settings.apiKey, model: o.model,
      temperature: o.temperature, maxOutputTokens: o.maxTokens, maxRetries: 1 });
  }
}
```

Native SDKs are equally valid: implement `ILLMStrategy` directly and keep the same `LLMResponse` + error normalisation.

### 2.3 Factory resolution

```ts
resolve(provider?: string | null): ILLMStrategy {
  const key = (provider ?? this.defaultProvider).trim().toLowerCase();   // request field > .env default
  if (!isLLMProvider(key)) throw new ValidationException(`Unknown LLM provider '${provider}'`, [...]);
  const s = this.registry.get(key);
  if (!s) throw new LLMProviderException(key, 'No strategy registered', 'LLM_PROVIDER_NOT_CONFIGURED');
  return s;
}
listProviders(): ProviderInfo[]   // { id, label, model, configured, isDefault } → drives the UI dropdown
```

### 2.4 Extension checklist (Open/Closed)

1. `LLM_PROVIDERS` tuple + env vars (`config/env.ts`, `.env.example`)
2. `providerSettings[<id>]` (`config/llm.config.ts`)
3. `strategies/<Name>Strategy.ts` extending the base
4. Barrel export + `new <Name>Strategy()` in `container.ts`
5. Frontend `LLMProvider` union
No changes to controllers, services, routes or the DB.

---

## 3. Standardised error contract

### 3.1 Exception hierarchy

| Class | HTTP | `code` |
| --- | --- | --- |
| `AppException(message, status, code, details?)` | any | base |
| `ValidationException` | 400 | `VALIDATION_ERROR` (+ `details[{ field, message }]`) |
| `UnauthorizedException` | 401 | `UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED` / `INVALID_CREDENTIALS` |
| `ResourceNotFoundException` | 404 | `RESOURCE_NOT_FOUND` |
| `ConflictException` | 409 | `CONFLICT` |
| `LLMProviderException` | 429 / 502 / 503 / 504 | `LLM_PROVIDER_RATE_LIMITED` / `_ERROR` / `_AUTH_FAILED` / `_UNAVAILABLE` / `_NOT_CONFIGURED` / `_TIMEOUT` / `LLM_EMPTY_RESPONSE` |

Unknown errors → 500 `INTERNAL_ERROR` (stack only outside production). Body-parser and Prisma errors are mapped (`P2002`→409, `P2025`→404, init error→503).

### 3.2 Envelopes

```jsonc
// success
{ "success": true, "data": { ... }, "meta": { "total": 12, "limit": 50, "offset": 0 } }
// error
{ "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed",
             "details": [{ "field": "prompt", "message": "Prompt cannot be empty" }],
             "path": "/api/v1/chats/prompt", "timestamp": "2026-10-29T10:00:00.000Z", "requestId": "…" } }
```

Rules: one global `errorHandler` writes all errors; controllers never catch-and-format; `X-Request-Id` is echoed on every response for correlation.

---

## 4. Security & multi-tenancy

- `bcrypt` (configurable rounds) for password hashes; dummy-hash compare on unknown e-mails to equalise timing.
- JWT HS256 with `iss`/`aud`/`sub`, verified with an explicit `algorithms` allow-list.
- `authMiddleware` sets `req.user = { id, email }`; services take `userId` first; repositories filter by `userId` on **every** query; other users' resources → 404.
- `helmet`, CORS allow-list, JSON body limit, rate-limit on credential endpoints.

---

## 5. React + styled-components theming rules

1. **Single source of tokens**: `styles/theme.ts` exports `darkTheme` / `lightTheme` implementing `AppTheme` (`colors`, `fonts`, `fontSizes`, `space`, `radii`, `shadows`, `transitions`, `layout`, `zIndex`).
2. **Typed theme**: `styles/styled.d.ts` → `declare module 'styled-components' { export interface DefaultTheme extends AppTheme {} }`.
3. **One provider**: `AppThemeProvider` = context (mode + toggle, persisted) → `<ThemeProvider theme={themes[mode]}>` → `<GlobalStyle/>`.
4. **No CSS files, no Tailwind, no hard-coded colors.** Interpolate: `` color: ${({ theme }) => theme.colors.textMuted}; ``
5. **Transient props** for style switches: `styled.div<{ $isUser: boolean }>`.
6. **Motion lives in `styles/animations.ts`** (`messageEnter`, `shimmer` + `skeletonShimmer` mixin, `typingBounce`, `pulseRing`, `popIn`); respect `prefers-reduced-motion` in GlobalStyle.
7. **Responsive** via `media.mobile` helper from the theme module.
8. **Data access** through `api/*Api.ts` + shared axios instance with auth/401 interceptors; state in hooks; components presentational.
9. **Rich output**: `react-markdown` + `remark-gfm`; override `pre` to render a `CodeBlock` (Prism, theme-aware style, "Copy code" with `Copied!` state via `useCopyToClipboard`); assistant bubbles expose "Copy response".

---

## 6. Replication checklist

- [ ] `config/env.ts` with zod + fail-fast
- [ ] Exceptions + global `errorHandler` + `notFoundHandler`
- [ ] `ApiResponse` helpers + `asyncHandler`
- [ ] Repositories scoped by owner with optional `DbClient`
- [ ] Services with constructor injection; external calls outside DB transactions
- [ ] Strategy interface → base template → concrete providers → factory
- [ ] Controllers: `validate()` → service → envelope
- [ ] `container.ts` composition root; `app.ts` factory; `server.ts` bootstrap
- [ ] Frontend: theme tokens + typed DefaultTheme + AppThemeProvider + animations module
- [ ] Root runner with `concurrently`, `setup` script, docker-compose with healthchecks
