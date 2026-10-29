import { isAxiosError } from 'axios';
import type { ApiErrorBody, ApiErrorDetail } from '../api/types';

export interface NormalisedError {
  message: string;
  code: string;
  status?: number;
  details?: ApiErrorDetail[];
}

/** Turn any thrown value (Axios or otherwise) into a UI-friendly error. */
export function toNormalisedError(error: unknown): NormalisedError {
  if (isAxiosError<ApiErrorBody>(error)) {
    const body = error.response?.data;
    if (body && body.success === false && body.error) {
      return { message: body.error.message, code: body.error.code, status: error.response?.status, details: body.error.details };
    }
    if (error.code === 'ECONNABORTED') return { message: 'The request timed out. The model may still be loading — try again.', code: 'TIMEOUT' };
    if (!error.response) return { message: 'Cannot reach the server. Is the backend running?', code: 'NETWORK_ERROR' };
    return { message: `Request failed (${error.response.status})`, code: 'HTTP_ERROR', status: error.response.status };
  }
  if (error instanceof Error) return { message: error.message, code: 'UNKNOWN' };
  return { message: 'Something went wrong', code: 'UNKNOWN' };
}
