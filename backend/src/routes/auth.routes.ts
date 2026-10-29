import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import type { Container } from '../container';
import { asyncHandler } from '../utils/asyncHandler';

export function authRoutes({ controllers, authMiddleware }: Container): Router {
  const router = Router();
  const credentialsLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 50,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts, try again later' } },
  });

  router.post('/register', credentialsLimiter, asyncHandler(controllers.auth.register));
  router.post('/login', credentialsLimiter, asyncHandler(controllers.auth.login));
  router.get('/me', authMiddleware, asyncHandler(controllers.auth.me));
  return router;
}
