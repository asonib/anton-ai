import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

/** All chat routes are protected by the JWT filter. */
export function chatRoutes({ controllers, authMiddleware }: Container): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/', asyncHandler(controllers.chat.list));
  router.post('/prompt', asyncHandler(controllers.chat.prompt));
  router.get('/:conversationId/messages', asyncHandler(controllers.chat.messages));
  router.delete('/:conversationId', asyncHandler(controllers.chat.remove));
  return router;
}
