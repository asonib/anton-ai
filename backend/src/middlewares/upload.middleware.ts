import type { RequestHandler } from 'express';
import multer from 'multer';
import type { AttachmentLimits } from '../config/attachments.config';
import { AppException, PayloadTooLargeException, ValidationException } from '../exceptions';

export const UPLOAD_FIELD = 'files';

const toMb = (bytes: number) => Math.round((bytes / (1024 * 1024)) * 10) / 10;

/** Map multer/busboy failures onto our domain exceptions (errorHandler writes the response). */
function toUploadException(err: unknown, limits: AttachmentLimits): AppException {
  if (err instanceof multer.MulterError) {
    const field = err.field ?? UPLOAD_FIELD;
    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        return new PayloadTooLargeException(`Each file must be ${toMb(limits.maxFileBytes)} MB or smaller`, [{ field, message: err.message }]);
      case 'LIMIT_FILE_COUNT':
        return new ValidationException(`You can attach at most ${limits.maxFiles} files per message`, [{ field, message: err.message }]);
      case 'LIMIT_UNEXPECTED_FILE':
        return new ValidationException(`Files must be sent in the "${UPLOAD_FIELD}" field`, [{ field, message: err.message }]);
      default:
        return new ValidationException('Invalid multipart upload', [{ field, message: err.message }]);
    }
  }
  if (err instanceof AppException) return err;
  return new ValidationException('Malformed multipart request body', [{ message: (err as Error)?.message ?? String(err) }]);
}

/**
 * Parses `multipart/form-data` bodies (prompt fields + `files[]`) into memory.
 * JSON requests pass straight through, so the same route accepts both.
 */
export function createUploadMiddleware(limits: AttachmentLimits): RequestHandler {
  const parse = multer({
    storage: multer.memoryStorage(),
    limits: {
      files: limits.maxFiles,
      fileSize: limits.maxFileBytes,
      fields: 20,
      fieldSize: 512 * 1024, // prompt text (32k chars of UTF-8 fits comfortably)
      parts: limits.maxFiles + 20,
    },
  }).array(UPLOAD_FIELD, limits.maxFiles);

  return (req, res, next) => {
    if (!req.is('multipart/form-data')) return next();
    parse(req, res, (err?: unknown) => (err ? next(toUploadException(err, limits)) : next()));
  };
}
