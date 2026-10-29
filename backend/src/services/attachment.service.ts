import mammoth from 'mammoth';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import type { AttachmentLimits } from '../config/attachments.config';
import {
  PayloadTooLargeException,
  ResourceNotFoundException,
  UnsupportedMediaTypeException,
  ValidationException,
} from '../exceptions';
import type { AttachmentRepository } from '../models/repositories/attachment.repository';
import type { AttachmentFile, PreparedAttachment, UploadedFile } from '../models/types';
import type { LLMImage } from '../strategies/llm.types';
import { classifyFile, decodeText, FileClass, sanitizeFileName } from '../utils/fileTypes';
import { logger } from '../utils/logger';

const formatMb = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(bytes < 1024 * 1024 ? 2 : 1)} MB`;

/**
 * Turns raw uploads into validated, LLM-ready attachments:
 *  - enforces count / size limits and the file-type allow-list (by content, not client MIME)
 *  - extracts text from PDF / DOCX / text / code files (capped per file)
 *  - serves stored bytes back to their owner only
 */
export class AttachmentService {
  constructor(
    private readonly attachments: AttachmentRepository,
    private readonly limits: AttachmentLimits,
  ) {}

  async prepare(files: UploadedFile[]): Promise<PreparedAttachment[]> {
    if (files.length > this.limits.maxFiles) {
      throw new ValidationException(`You can attach at most ${this.limits.maxFiles} files per message`, [
        { field: 'files', message: `Received ${files.length} files` },
      ]);
    }
    const prepared: PreparedAttachment[] = [];
    for (const file of files) prepared.push(await this.prepareOne(file));
    return prepared;
  }

  /** Images in the shape the LLM strategy expects. */
  toLLMImages(attachments: Array<{ kind: string; mimeType: string; data: Buffer }>): LLMImage[] {
    return attachments
      .filter((a) => a.kind === 'image')
      .map((a) => ({ mimeType: a.mimeType, base64: a.data.toString('base64') }));
  }

  /** Bytes for history images, keyed by attachment id (owner-scoped). */
  async loadHistoryImages(userId: string, ids: string[]): Promise<Map<string, LLMImage>> {
    const rows = await this.attachments.findImageDataForUser(ids, userId);
    return new Map(rows.map((r) => [r.id, { mimeType: r.mimeType, base64: Buffer.from(r.data).toString('base64') }]));
  }

  async getContent(userId: string, attachmentId: string): Promise<AttachmentFile> {
    const row = await this.attachments.findContentForUser(attachmentId, userId);
    // 404 (not 403) so we never reveal that another user's file exists.
    if (!row) throw new ResourceNotFoundException('Attachment', attachmentId);
    return { fileName: row.fileName, mimeType: row.mimeType, kind: row.kind, data: Buffer.from(row.data) };
  }

  /* ------------------------------ internals ------------------------------ */

  private async prepareOne(file: UploadedFile): Promise<PreparedAttachment> {
    const fileName = sanitizeFileName(file.originalName);
    const detail = [{ field: 'files', message: fileName }];

    if (file.sizeBytes === 0 || file.buffer.length === 0) {
      throw new ValidationException(`"${fileName}" is empty`, detail);
    }
    if (file.buffer.length > this.limits.maxFileBytes) {
      throw new PayloadTooLargeException(`"${fileName}" exceeds the ${formatMb(this.limits.maxFileBytes)} limit`, detail);
    }

    const cls = classifyFile(fileName, file.buffer, file.mimeType);
    if (!cls) {
      throw new UnsupportedMediaTypeException(
        `"${fileName}" is not a supported file type. Attach images (PNG, JPEG, GIF, WebP), documents (PDF, DOCX, TXT, MD, CSV) or source code files.`,
        detail,
      );
    }

    const base = { fileName, sizeBytes: file.buffer.length, data: file.buffer };
    if (cls.kind === 'image') return { ...base, kind: 'image', mimeType: cls.mimeType, extractedText: null };

    const text = await this.extractText(fileName, file.buffer, cls);
    return { ...base, kind: cls.kind, mimeType: cls.mimeType, extractedText: this.cap(text, fileName) };
  }

  private async extractText(fileName: string, buf: Buffer, cls: Exclude<FileClass, { kind: 'image' }>): Promise<string> {
    if (cls.kind === 'code' || cls.format === 'text') return decodeText(buf);
    try {
      const raw = cls.format === 'pdf' ? (await pdfParse(buf)).text : (await mammoth.extractRawText({ buffer: buf })).value;
      const text = raw.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
      if (!text) {
        return cls.format === 'pdf'
          ? '[No extractable text — this PDF appears to contain only scanned images.]'
          : '[The document contains no text.]';
      }
      return text;
    } catch (error) {
      logger.warn('Attachment text extraction failed', { fileName, format: cls.format, error: (error as Error)?.message });
      throw new ValidationException(`"${fileName}" could not be read — the file may be corrupted or password-protected`, [
        { field: 'files', message: fileName },
      ]);
    }
  }

  private cap(text: string, fileName: string): string {
    if (text.length <= this.limits.maxTextChars) return text;
    logger.info('Attachment text truncated', { fileName, chars: text.length, limit: this.limits.maxTextChars });
    return `${text.slice(0, this.limits.maxTextChars)}\n\n[… truncated: showing the first ${this.limits.maxTextChars.toLocaleString('en-US')} of ${text.length.toLocaleString('en-US')} characters]`;
  }
}
