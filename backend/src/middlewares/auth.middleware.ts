import type { RequestHandler } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthService } from '../services/auth.service';

/**
 * JWT Bearer authentication filter (signature, expiry AND that the user still exists).
 * On success sets `req.user = { id, email }`; downstream code MUST use
 * `req.user.id` (never a client-supplied user id) to scope data access.
 */
export const createAuthMiddleware =
  (auth: AuthService): RequestHandler =>
  async (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) return next(new UnauthorizedException('Missing Authorization header'));

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return next(new UnauthorizedException('Authorization header must be: Bearer <token>'));
    }

    try {
      req.user = await auth.authenticate(token.trim());
      return next();
    } catch (error) {
      return next(error);
    }
  };
