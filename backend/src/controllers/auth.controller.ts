import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthService } from '../services/auth.service';
import { ApiResponse } from '../utils/apiResponse';
import { loginSchema, registerSchema } from '../validators/auth.schemas';
import { validate } from '../validators/validate';

/** HTTP adapter for authentication. Validate → delegate to service → envelope. */
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  register = async (req: Request, res: Response) => {
    const { email, password } = validate(registerSchema, req.body);
    return ApiResponse.created(res, await this.auth.register(email, password));
  };

  login = async (req: Request, res: Response) => {
    const { email, password } = validate(loginSchema, req.body);
    return ApiResponse.ok(res, await this.auth.login(email, password));
  };

  me = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedException();
    return ApiResponse.ok(res, await this.auth.getProfile(req.user.id));
  };
}
