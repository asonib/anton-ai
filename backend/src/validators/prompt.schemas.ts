import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);

const categoryId = z
  .string({ required_error: 'category is required' })
  .trim()
  .toLowerCase()
  .max(32)
  .regex(/^[a-z0-9-]+$/, 'category must be a kebab-case id');

export const promptIdParamSchema = z.object({
  promptId: z.string().uuid('promptId must be a UUID'),
});

export const promptListQuerySchema = z.object({
  search: z.preprocess(emptyToUndefined, z.string().trim().max(200, 'search is too long (max 200 characters)').optional()),
  category: z.preprocess(emptyToUndefined, categoryId.optional()),
  scope: z.preprocess(emptyToUndefined, z.enum(['all', 'built-in', 'mine', 'favorites']).default('all')),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createPromptSchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .trim()
    .min(3, 'title must be at least 3 characters')
    .max(120, 'title is too long (max 120 characters)'),
  category: categoryId,
  content: z
    .string({ required_error: 'content is required' })
    .trim()
    .min(10, 'prompt must be at least 10 characters')
    .max(20_000, 'prompt is too long (max 20,000 characters)'),
});

export const updatePromptSchema = createPromptSchema
  .partial()
  .refine((v) => Object.values(v).some((x) => x !== undefined), { message: 'Provide at least one of title, category, content' });

export type PromptListQueryInput = z.infer<typeof promptListQuerySchema>;
export type CreatePromptInput = z.infer<typeof createPromptSchema>;
export type UpdatePromptInput = z.infer<typeof updatePromptSchema>;
