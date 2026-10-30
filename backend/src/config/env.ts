import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

/**
 * Environment loader. This is the ONLY module that reads `process.env`.
 * Everything else imports the typed, validated `env` object.
 */
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback: current working directory

const optionalString = z
  .string()
  .optional()
  .transform((v) => (v && v.trim().length > 0 ? v.trim() : undefined));

export const LLM_PROVIDERS = ['ollama', 'openai', 'anthropic', 'gemini', 'grok'] as const;
export type LLMProvider = (typeof LLM_PROVIDERS)[number];

export const isLLMProvider = (value: unknown): value is LLMProvider =>
  typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);

export const ANTHROPIC_THINKING_MODES = ['auto', 'adaptive', 'enabled', 'disabled'] as const;
export type AnthropicThinkingMode = (typeof ANTHROPIC_THINKING_MODES)[number];
export const ANTHROPIC_EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'] as const;
export type AnthropicEffort = (typeof ANTHROPIC_EFFORTS)[number];

const DEV_JWT_SECRET = 'dev-only-insecure-secret-change-me-please-32+chars';

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(4000),
    CORS_ORIGIN: z.string().default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

    DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

    JWT_SECRET: z.string().default(DEV_JWT_SECRET),
    JWT_EXPIRES_IN: z.string().default('7d'),
    BCRYPT_SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),

    DEFAULT_LLM_PROVIDER: z.enum(LLM_PROVIDERS).default('ollama'),
    /** 0 (default) = no limit: a model call may run as long as it needs. */
    LLM_TIMEOUT_MS: z.coerce.number().int().nonnegative().default(0),
    LLM_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.7),
    LLM_MAX_TOKENS: z.coerce.number().int().positive().default(2048),
    LLM_SYSTEM_PROMPT: z
      .string()
      .default(
        'You are a helpful, precise AI assistant. Format answers in GitHub-flavored Markdown and use fenced code blocks with a language tag for any code.',
      ),
    CHAT_HISTORY_WINDOW: z.coerce.number().int().min(0).max(200).default(20),
    /** Max number of images from earlier turns re-sent to the model as visual memory (0 = text placeholders only). */
    CHAT_HISTORY_IMAGE_LIMIT: z.coerce.number().int().min(0).max(20).default(2),

    ATTACHMENT_MAX_FILES: z.coerce.number().int().min(1).max(20).default(5),
    ATTACHMENT_MAX_FILE_MB: z.coerce.number().positive().max(50).default(10),
    /** Per-file cap on extracted document/code text injected into the prompt. */
    ATTACHMENT_MAX_TEXT_CHARS: z.coerce.number().int().min(1_000).max(1_000_000).default(60_000),

    /**
     * Project workspaces. Local projects may only live inside one of these absolute directories
     * (separated by `;`). Empty = attaching local directories is disabled.
     */
    WORKSPACE_ROOTS: optionalString,
    /**
     * Where GitHub repos are cloned and new projects are created (`<dir>/<repo-name>`).
     * Defaults to the first WORKSPACE_ROOTS entry, else backend/data/projects.
     */
    PROJECTS_DIR: optionalString,
    GIT_BINARY: z.string().default('git'),
    GIT_CLONE_TIMEOUT_MS: z.coerce.number().int().positive().default(120_000),
    /** Max characters of project files (tree + contents) put into the system prompt per request. */
    PROJECT_CONTEXT_MAX_CHARS: z.coerce.number().int().min(5_000).max(2_000_000).default(120_000),
    /** Files bigger than this are listed in the tree but their content is never sent. */
    PROJECT_MAX_FILE_KB: z.coerce.number().int().min(1).max(5_000).default(200),
    /** Stop scanning a project after this many files. */
    PROJECT_MAX_FILES: z.coerce.number().int().min(10).max(100_000).default(5_000),
    /** Output budget for prompts with a project attached (edits are returned as whole files). */
    PROJECT_LLM_MAX_TOKENS: z.coerce.number().int().positive().default(16_384),

    OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
    OLLAMA_MODEL: z.string().default('llama3.2'),

    OPENAI_API_KEY: optionalString,
    OPENAI_MODEL: z.string().default('gpt-4o-mini'),
    OPENAI_BASE_URL: optionalString,

    ANTHROPIC_API_KEY: optionalString,
    ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-5'),
    /**
     * Extended thinking. `auto` (default) sends the classic request and, if the model answers that it needs
     * adaptive thinking, switches that model to `adaptive` and retries. `adaptive` / `enabled` / `disabled` force a mode.
     */
    ANTHROPIC_THINKING: z.enum(ANTHROPIC_THINKING_MODES).default('auto'),
    /** Thinking token budget, only used when ANTHROPIC_THINKING=enabled (older models). */
    ANTHROPIC_THINKING_BUDGET: z.coerce.number().int().min(1024).default(4096),
    /** Optional `output_config.effort` (low | medium | high | xhigh | max). Empty = model default. */
    ANTHROPIC_EFFORT: z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.enum(ANTHROPIC_EFFORTS).optional()),

    GEMINI_API_KEY: optionalString,
    GEMINI_MODEL: z.string().default('gemini-2.5-flash'),

    /** xAI Grok — OpenAI-compatible API. */
    XAI_API_KEY: optionalString,
    XAI_MODEL: z.string().default('grok-4'),
    XAI_BASE_URL: z.string().url().default('https://api.x.ai/v1'),
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === 'production' && (cfg.JWT_SECRET === DEV_JWT_SECRET || cfg.JWT_SECRET.length < 32)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_SECRET'],
        message: 'JWT_SECRET must be set to a random string of at least 32 characters in production',
      });
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  // eslint-disable-next-line no-console
  console.error(`\n[config] Invalid environment configuration:\n${details}\n`);
  process.exit(1);
}

export const env = Object.freeze(parsed.data);

/** Environment handed to child processes (git). Prompts are disabled so a clone can never hang on credentials. */
export const childProcessEnv: Readonly<NodeJS.ProcessEnv> = Object.freeze({
  ...process.env,
  GIT_TERMINAL_PROMPT: '0',
  GCM_INTERACTIVE: 'never',
});
export type Env = typeof env;
export const isProduction = env.NODE_ENV === 'production';
export const usingDevJwtSecret = env.JWT_SECRET === DEV_JWT_SECRET;
