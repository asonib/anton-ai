import type { AttachmentKind, Prisma, PrismaClient } from '@prisma/client';
import type { DbClient } from '../prisma.client';

/** Columns safe to load with message lists (no blob, no extracted text). */
export const attachmentMetaSelect = {
  id: true,
  kind: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  createdAt: true,
} satisfies Prisma.AttachmentSelect;

/** Metadata + extracted text — what the LLM memory window needs. */
export const attachmentMemorySelect = {
  ...attachmentMetaSelect,
  extractedText: true,
} satisfies Prisma.AttachmentSelect;

export type AttachmentMeta = Prisma.AttachmentGetPayload<{ select: typeof attachmentMetaSelect }>;
export type AttachmentMemory = Prisma.AttachmentGetPayload<{ select: typeof attachmentMemorySelect }>;

export interface CreateAttachmentInput {
  messageId: string;
  userId: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  data: Buffer;
  extractedText: string | null;
  createdAt?: Date;
}

/** Data-access for attachments. Every read is scoped by userId. */
export class AttachmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /** Inserts the row but only returns metadata (never echo the blob back). */
  create(data: CreateAttachmentInput, db: DbClient = this.prisma): Promise<AttachmentMeta> {
    return db.attachment.create({ data, select: attachmentMetaSelect });
  }

  findContentForUser(id: string, userId: string, db: DbClient = this.prisma) {
    return db.attachment.findFirst({
      where: { id, userId },
      select: { fileName: true, mimeType: true, kind: true, data: true },
    });
  }

  /** Raw image bytes for the given ids (used to rebuild visual memory). */
  findImageDataForUser(ids: string[], userId: string, db: DbClient = this.prisma) {
    if (ids.length === 0) return Promise.resolve([]);
    return db.attachment.findMany({
      where: { id: { in: ids }, userId, kind: 'image' },
      select: { id: true, mimeType: true, data: true },
    });
  }
}
