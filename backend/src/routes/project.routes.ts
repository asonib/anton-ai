import { Router } from 'express';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

/** Attached projects + proposed file changes. All routes are protected by the JWT filter. */
export function projectRoutes({ controllers, authMiddleware }: Container): Router {
  const router = Router();
  router.use(authMiddleware);

  router.get('/config', asyncHandler(controllers.project.config));
  router.get('/', asyncHandler(controllers.project.list));
  router.get('/browse', asyncHandler(controllers.project.browse));
  router.post('/new', asyncHandler(controllers.project.create));
  router.post('/local', asyncHandler(controllers.project.addLocal));
  router.post('/github', asyncHandler(controllers.project.addGithub));
  // Change routes come before '/:projectId' so "changes" is never parsed as a project id.
  router.post('/changes/apply', asyncHandler(controllers.project.apply));
  router.post('/changes/discard', asyncHandler(controllers.project.discard));
  router.post('/changes/revert', asyncHandler(controllers.project.revert));
  router.get('/changes/:changeId', asyncHandler(controllers.project.change));
  router.get('/:projectId', asyncHandler(controllers.project.get));
  router.delete('/:projectId', asyncHandler(controllers.project.remove));
  return router;
}
