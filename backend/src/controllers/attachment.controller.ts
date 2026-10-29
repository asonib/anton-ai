import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthUser } from '../models/types';
import type { AttachmentService } from '../services/attachment.service';
import { ApiResponse } from '../utils/apiResponse';
import { attachmentIdParamSchema } from '../validators/chat.schemas';
import { validate } from '../validators/validate';

const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
};

/** Serves stored attachment bytes to their owner (images inline, everything else as a download). */
export class AttachmentController {
  constructor(private readonly attachments: AttachmentService) {}

  content = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { attachmentId } = validate(attachmentIdParamSchema, req.params);
    const file = await this.attachments.getContent(user.id, attachmentId);
    return ApiResponse.file(res, file, { inline: file.kind === 'image' && req.query.download === undefined });
  };
}
