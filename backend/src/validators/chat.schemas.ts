import { z } from 'zod';
import { LLM_PROVIDERS } from '../config/env';

/** Multipart fields always arrive as strings; treat '' as "not provided". */
const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const numberish = (v: unknown) => {
  const value = emptyToUndefined(v);
  return typeof value === 'string' ? Number(value) : value;
};

/**
 * Accepts both JSON bodies and multipart/form-data fields (files are validated by
 * AttachmentService). `prompt` may be empty only when files are attached — that
 * cross-field rule lives in ChatService because files are not part of the body.
 */
export const promptSchema = z.object({
  conversationId: z.preprocess(emptyToUndefined, z.string().uuid('conversationId must be a UUID').optional()),
  prompt: z
    .string({ invalid_type_error: 'Prompt must be a string' })
    .trim()
    .max(32_000, 'Prompt is too long (max 32,000 characters)')
    .default(''),
  provider: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.enum(LLM_PROVIDERS, { errorMap: () => ({ message: `provider must be one of: ${LLM_PROVIDERS.join(', ')}` }) }))
      .optional(),
  ),
  /** Skill id from `config/skills.config.ts`; unknown ids are rejected by SkillService. */
  skill: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .toLowerCase()
      .max(64)
      .regex(/^[a-z0-9-]+$/, 'skill must be a kebab-case id')
      .optional(),
  ),
  /** Attached project (see /projects). Omit for a normal chat; the conversation remembers the last one. */
  projectId: z.preprocess(emptyToUndefined, z.string().uuid('projectId must be a UUID').optional()),
  model: z.preprocess(emptyToUndefined, z.string().trim().min(1).max(128).optional()),
  temperature: z.preprocess(numberish, z.number({ invalid_type_error: 'temperature must be a number' }).min(0).max(2).optional()),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID'),
});

export const attachmentIdParamSchema = z.object({
  attachmentId: z.string().uuid('attachmentId must be a UUID'),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PromptInput = z.infer<typeof promptSchema>;
