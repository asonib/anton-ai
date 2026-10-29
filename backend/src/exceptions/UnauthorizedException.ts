import { AppException } from './AppException';

export class UnauthorizedException extends AppException {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, code);
  }
}
