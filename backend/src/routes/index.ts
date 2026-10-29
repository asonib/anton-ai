import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';
import { authRoutes } from './auth.routes';
import { chatRoutes } from './chat.routes';

/** Mounted at /api/v1 */
export function apiRoutes(container: Container): Router {
  const router = Router();
  router.get('/health', asyncHandler(container.controllers.health.check));
  router.use('/auth', authRoutes(container));
  router.use('/chats', chatRoutes(container));
  router.get('/providers', container.authMiddleware, asyncHandler(container.controllers.provider.list));
  router.get('/attachments/:attachmentId/content', container.authMiddleware, asyncHandler(container.controllers.attachment.content));
  return router;
}
