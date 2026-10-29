import type { RequestHandler } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { TokenService } from '../services/token.service';

/**
 * JWT Bearer authentication filter.
 * On success sets `req.user = { id, email }`; downstream code MUST use
 * `req.user.id` (never a client-supplied user id) to scope data access.
 */
export const createAuthMiddleware =
  (tokens: TokenService): RequestHandler =>
  (req, _res, next) => {
    const header = req.headers.authorization;
    if (!header) return next(new UnauthorizedException('Missing Authorization header'));

    const [scheme, token] = header.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return next(new UnauthorizedException('Authorization header must be: Bearer <token>'));
    }

    try {
      req.user = tokens.verify(token.trim());
      return next();
    } catch (error) {
      return next(error);
    }
  };
