export interface ErrorDetail {
  field?: string;
  message: string;
}

/**
 * Base class for every expected (domain) error. The global error middleware
 * converts any AppException into the standard error envelope using
 * `statusCode` + `code`. Anything that is NOT an AppException becomes a 500.
 */
export class AppException extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ErrorDetail[];
  public readonly isOperational = true;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: ErrorDetail[]) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, new.target);
  }
}
