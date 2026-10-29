import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

/** All chat routes are protected by the JWT filter. */
export function chatRoutes({ controllers, authMiddleware, uploadMiddleware }: Container): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', asyncHandler(controllers.chat.list));
  // Accepts JSON or multipart/form-data (prompt fields + up to ATTACHMENT_MAX_FILES `files`).
  router.post('/prompt', uploadMiddleware, asyncHandler(controllers.chat.prompt));
  router.get('/:conversationId/messages', asyncHandler(controllers.chat.messages));
  router.delete('/:conversationId', asyncHandler(controllers.chat.remove));
  return router;
}
