import { AppException, ErrorDetail } from './AppException';

export class ValidationException extends AppException {
  constructor(message = 'Request validation failed', details?: ErrorDetail[]) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}
