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
  /** Binary download. Only images are ever served inline; everything else is forced to download. */
  file(res: Response, file: { fileName: string; mimeType: string; data: Buffer }, { inline = false } = {}): Response {
    const ascii = file.fileName.replace(/[^\x20-\x7e]/g, '_').replace(/["\\]/g, '_');
    const encoded = encodeURIComponent(file.fileName).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    res.setHeader('Content-Type', inline ? file.mimeType : 'application/octet-stream');
    res.setHeader('Content-Length', String(file.data.length));
    res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${ascii}"; filename*=UTF-8''${encoded}`);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self'; sandbox");
    return res.status(200).end(file.data);
  },
};
