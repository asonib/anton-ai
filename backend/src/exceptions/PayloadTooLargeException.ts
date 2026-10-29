import { AppException, ErrorDetail } from './AppException';

/** 413 — an uploaded file (or the request) exceeds the configured size limit. */
export class PayloadTooLargeException extends AppException {
  constructor(message = 'Payload too large', details?: ErrorDetail[]) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', details);
  }
}
