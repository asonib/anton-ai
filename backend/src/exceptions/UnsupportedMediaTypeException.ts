import { AppException, ErrorDetail } from './AppException';

/** 415 — an uploaded file type is not on the attachment allow-list. */
export class UnsupportedMediaTypeException extends AppException {
  constructor(message = 'Unsupported file type', details?: ErrorDetail[]) {
    super(message, 415, 'UNSUPPORTED_MEDIA_TYPE', details);
  }
}
