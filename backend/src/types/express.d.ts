import type { AuthUser } from '../models/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Populated by authMiddleware from the verified JWT. */
      user?: AuthUser;
      /** Populated by requestLogger for log/trace correlation. */
      requestId?: string;
    }
  }
}

export {};
