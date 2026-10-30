import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

/** Shared prompt library. All routes are protected by the JWT filter. */
export function promptRoutes({ controllers, authMiddleware }: Container): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/categories', asyncHandler(controllers.prompt.categories));
  router.get('/', asyncHandler(controllers.prompt.list));
  router.post('/', asyncHandler(controllers.prompt.create));
  router.get('/:promptId', asyncHandler(controllers.prompt.get));
  router.patch('/:promptId', asyncHandler(controllers.prompt.update));
  router.delete('/:promptId', asyncHandler(controllers.prompt.remove));
  router.put('/:promptId/favorite', asyncHandler(controllers.prompt.favorite));
  router.delete('/:promptId/favorite', asyncHandler(controllers.prompt.unfavorite));
  return router;
}
