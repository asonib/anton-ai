import { AppException } from './AppException';

export class ConflictException extends AppException {
  constructor(message = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}
