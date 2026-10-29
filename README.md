# Anton AI — Enterprise Layered Full-Stack Template

Anton AI is a multi-provider AI chat application written in TypeScript end-to-end.

| Layer | Tech |
| --- | --- |
| API | Node.js · Express 4 · TypeScript (strict) · Prisma 6 · MySQL 8 · JWT (`jsonwebtoken` + `bcrypt`) · Zod |
| LLM | LangChain (`@langchain/core` prompt templates + chat models) behind a **Strategy + Factory** layer — Ollama (default), OpenAI, Anthropic Claude, Google Gemini |
| Web | React 18 · Vite 5 · `styled-components` 6 (env-selected colour palette, each with dark/light) · `react-markdown` + GFM + Prism highlighting · Lucide icons |
| Infra | `docker-compose.yml` (MySQL 8 + optional Ollama) · root runner with `concurrently` |

## Quick start

Prerequisites: **Node 18.18+** (20 LTS recommended), **Docker Desktop**, and for the default provider **[Ollama](https://ollama.com)** with a model pulled.

```bash
npm run setup          # env files → npm install (root/backend/frontend) → MySQL up → prisma generate + migrate deploy
ollama pull llama3.2   # default model (or set API keys in backend/.env)
npm run dev            # API on :4000 + Web on :5173, one terminal
```

Open http://localhost:5173, register an account and start chatting.

> No Docker? Point `DATABASE_URL` in `backend/.env` to any MySQL 8 server and run `npm run setup -- --skip-docker`.
> No local Ollama? `npm run ollama:up` starts it in Docker, then `docker exec -it anton-ai-ollama ollama pull llama3.2`.

### Enabling cloud providers

Edit `backend/.env`:

```dotenv
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AIza...
DEFAULT_LLM_PROVIDER=ollama   # or openai | anthropic | gemini
```

Unconfigured providers appear disabled in the sidebar dropdown. Model names are configurable (`*_MODEL`).

### Theme palette

The colour palette is set by the operator in `frontend/.env` — users cannot change it, they can only toggle dark/light mode:

```dotenv
VITE_THEME_PALETTE=jarvis   # jarvis (default, holographic HUD) | classic (original violet) | matrix (green terminal) | cyberpunk (neon magenta)
```

Every palette ships both a dark and a light variant (`frontend/src/styles/palettes.ts`). Restart `npm run dev` (or rebuild) after changing it.

The left sidebar can be collapsed to an icon rail on desktop (button in the sidebar header, or `Ctrl/Cmd + B`); the choice is remembered per browser.

## Scripts (root)

| Command | What it does |
| --- | --- |
| `npm run setup` | Full bootstrap (idempotent) |
| `npm run dev` | Backend (`tsx watch`) + frontend (Vite) concurrently |
| `npm run build` | `tsc` backend → `backend/dist`, Vite build → `frontend/dist` |
| `npm run typecheck` | Type-check both apps |
| `npm run db:up` / `db:down` | Start/stop MySQL container |
| `npm run db:migrate` | `prisma migrate dev` (create a new migration after editing `schema.prisma`) |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:reset` | Drop + re-apply (dev only) |
| `npm run db:studio` | Prisma Studio |

## REST API (`/api/v1`)

All responses use one envelope: `{ success: true, data, meta? }` or `{ success: false, error: { code, message, details?, path, timestamp, requestId } }`.

| Method | Path | Auth | Body / notes |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | `{ email, password }` → `{ token, tokenType, expiresIn, user }` |
| POST | `/auth/login` | – | `{ email, password }` → same as above |
| GET | `/auth/me` | Bearer | Current profile |
| GET | `/chats?limit&offset` | Bearer | Conversations of the logged-in user (newest first) |
| GET | `/chats/:conversationId/messages` | Bearer | Full thread history |
| POST | `/chats/prompt` | Bearer | `{ conversationId?, prompt, provider?, model?, temperature? }` → `{ conversation, userMessage, assistantMessage, provider, model, usage, latencyMs }` |
| DELETE | `/chats/:conversationId` | Bearer | Delete a thread |
| GET | `/providers` | Bearer | Registered LLM providers + configured/default flags |
| GET | `/health` | – | DB liveness |

Example:

```bash
TOKEN=$(curl -s localhost:4000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}' | jq -r .data.token)

curl -s localhost:4000/api/v1/chats/prompt -H "authorization: Bearer $TOKEN" \
  -H 'content-type: application/json' -d '{"prompt":"Explain the Strategy pattern","provider":"ollama"}' | jq
```

## Project layout

```
.
├── backend/
│   ├── prisma/                  schema.prisma + migrations
│   └── src/
│       ├── config/              env loader (zod) + provider settings
│       ├── controllers/         HTTP adapters (validate → service → envelope)
│       ├── services/            business logic (auth, chat, llm orchestration, tokens)
│       ├── strategies/          ILLMStrategy, BaseLangChainStrategy, 4 providers, LLMStrategyFactory
│       ├── models/              prisma client, DTOs, mappers, repositories/
│       ├── middlewares/         JWT auth, request logger, global error handler
│       ├── exceptions/          AppException + domain exceptions
│       ├── validators/          zod request schemas
│       ├── routes/              routers (wired from the container)
│       ├── utils/               logger, asyncHandler, ApiResponse
│       ├── container.ts         composition root (manual DI)
│       ├── app.ts               express app factory
│       └── server.ts            bootstrap + graceful shutdown
├── frontend/src/
│   ├── api/                     axios client + interceptors, typed endpoints
│   ├── context/                 AuthContext, ThemeModeContext (ThemeProvider)
│   ├── hooks/                   useChat, useCopyToClipboard, useAutoScroll
│   ├── components/{common,chat,markdown}
│   ├── pages/                   AuthPage, ChatPage
│   └── styles/                  palettes (dark+light each), theme tokens, GlobalStyle, keyframes
├── docker-compose.yml
├── scripts/setup.mjs
├── CLAUDE.md                    agent guide for this repo
└── GEMINI_SKILL.md              reusable architecture pattern reference
```

See **CLAUDE.md** for architectural rules and **GEMINI_SKILL.md** for the reusable pattern.
