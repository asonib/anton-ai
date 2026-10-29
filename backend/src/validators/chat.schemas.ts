import { z } from 'zod';
import { LLM_PROVIDERS } from '../config/env';

export const promptSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID').optional().nullable().transform((v) => v ?? undefined),
  prompt: z
    .string({ required_error: 'Prompt is required' })
    .trim()
    .min(1, 'Prompt cannot be empty')
    .max(32_000, 'Prompt is too long (max 32,000 characters)'),
  provider: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.enum(LLM_PROVIDERS, { errorMap: () => ({ message: `provider must be one of: ${LLM_PROVIDERS.join(', ')}` }) }))
    .optional(),
  model: z.string().trim().min(1).max(128).optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const conversationIdParamSchema = z.object({
  conversationId: z.string().uuid('conversationId must be a UUID'),
});

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export type PromptInput = z.infer<typeof promptSchema>;
