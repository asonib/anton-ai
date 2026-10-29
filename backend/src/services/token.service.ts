import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedException } from '../exceptions';
import type { AuthUser } from '../models/types';

interface AccessTokenClaims extends JwtPayload {
  sub: string;
  email: string;
}

const ISSUER = 'anton-ai-api';
const AUDIENCE = 'anton-ai-web';

/** Issues and verifies HS256 access tokens. */
export class TokenService {
  constructor(
    private readonly secret: string = env.JWT_SECRET,
    private readonly expiresIn: string = env.JWT_EXPIRES_IN,
  ) {}

  get ttl(): string {
    return this.expiresIn;
  }

  sign(user: AuthUser): string {
    const options: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.expiresIn as SignOptions['expiresIn'],
      issuer: ISSUER,
      audience: AUDIENCE,
      subject: user.id,
    };
    return jwt.sign({ email: user.email }, this.secret, options);
  }

  verify(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
      });
      if (typeof decoded === 'string') throw new Error('Unexpected token payload');
      const claims = decoded as AccessTokenClaims;
      if (!claims.sub || typeof claims.email !== 'string') throw new Error('Missing claims');
      return { id: claims.sub, email: claims.email };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Session expired — please sign in again', 'TOKEN_EXPIRED');
      }
      throw new UnauthorizedException('Invalid authentication token', 'INVALID_TOKEN');
    }
  }
}
