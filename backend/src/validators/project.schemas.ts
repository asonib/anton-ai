import { z } from 'zod';

const emptyToUndefined = (v: unknown) => (v === '' || v === null ? undefined : v);
const optionalName = z.preprocess(emptyToUndefined, z.string().trim().min(1).max(120, 'name is too long (max 120 characters)').optional());

export const projectIdParamSchema = z.object({
  projectId: z.string().uuid('projectId must be a UUID'),
});

export const changeIdParamSchema = z.object({
  changeId: z.string().uuid('changeId must be a UUID'),
});

export const addLocalProjectSchema = z.object({
  path: z.string({ required_error: 'path is required' }).trim().min(1, 'path is required').max(1024, 'path is too long'),
  name: optionalName,
});

export const addGithubProjectSchema = z.object({
  url: z.string({ required_error: 'url is required' }).trim().min(3, 'url is required').max(300, 'url is too long'),
  /** Branch or tag; default branch when omitted. */
  ref: z.preprocess(emptyToUndefined, z.string().trim().max(200).optional()),
  name: optionalName,
});

export const browseQuerySchema = z.object({
  path: z.preprocess(emptyToUndefined, z.string().trim().max(1024, 'path is too long').optional()),
});

export const createProjectSchema = z.object({
  name: z
    .string({ required_error: 'name is required' })
    .trim()
    .min(1, 'name is required')
    .max(80, 'name is too long (max 80 characters)'),
});

export const changeIdsSchema = z.object({
  changeIds: z
    .array(z.string().uuid('every change id must be a UUID'), { required_error: 'changeIds is required' })
    .min(1, 'Select at least one change')
    .max(200, 'Too many changes at once (max 200)'),
  /** Apply / revert even when the file changed on disk since. */
  force: z.boolean().default(false),
});

export type AddLocalProjectInput = z.infer<typeof addLocalProjectSchema>;
export type AddGithubProjectInput = z.infer<typeof addGithubProjectSchema>;
