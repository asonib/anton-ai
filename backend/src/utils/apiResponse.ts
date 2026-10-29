import type { Response } from 'express';
import type { ErrorDetail } from '../exceptions';

/** Standard success envelope: { success: true, data, meta? } */
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: Record<string, unknown>;
}

/** Standard error envelope: { success: false, error: { code, message, details?, ... } } */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ErrorDetail[];
    path: string;
    timestamp: string;
    requestId?: string;
    stack?: string;
  };
}

export const ApiResponse = {
  ok<T>(res: Response, data: T, meta?: Record<string, unknown>): Response<ApiSuccess<T>> {
    return res.status(200).json({ success: true, data, ...(meta ? { meta } : {}) });
  },
  created<T>(res: Response, data: T): Response<ApiSuccess<T>> {
    return res.status(201).json({ success: true, data });
  },
  noContent(res: Response): Response {
    return res.status(204).send();
  },
};
