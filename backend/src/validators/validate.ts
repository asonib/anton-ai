import type { ZodTypeAny, z } from 'zod';
import { ValidationException } from '../exceptions';

/** Parses `data` with `schema` or throws a ValidationException with field-level details. */
export function validate<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationException(
      'Request validation failed',
      result.error.issues.map((i) => ({ field: i.path.join('.') || undefined, message: i.message })),
    );
  }
  return result.data;
}
