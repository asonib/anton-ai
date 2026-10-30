import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';
import { authRoutes } from './auth.routes';
import { chatRoutes } from './chat.routes';
import { projectRoutes } from './project.routes';
import { promptRoutes } from './prompt.routes';

/** Mounted at /api/v1 */
export function apiRoutes(container: Container): Router {
  const router = Router();
  router.get('/health', asyncHandler(container.controllers.health.check));
  router.use('/auth', authRoutes(container));
  router.use('/chats', chatRoutes(container));
  router.use('/prompts', promptRoutes(container));
  router.use('/projects', projectRoutes(container));
  router.get('/providers', container.authMiddleware, asyncHandler(container.controllers.provider.list));
  router.get('/skills', container.authMiddleware, asyncHandler(container.controllers.skill.list));
  router.get('/ai-repos', container.authMiddleware, asyncHandler(container.controllers.aiRepo.list));
  router.get('/attachments/:attachmentId/content', container.authMiddleware, asyncHandler(container.controllers.attachment.content));
  return router;
}
