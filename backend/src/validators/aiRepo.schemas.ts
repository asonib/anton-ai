import { z } from 'zod';

export const aiRepoListQuerySchema = z.object({
  category: z.preprocess(
    (v) => (v === '' || v === null ? undefined : v),
    z
      .string()
      .trim()
      .toLowerCase()
      .max(32)
      .regex(/^[a-z0-9-]+$/, 'category must be a kebab-case id')
      .optional(),
  ),
});
