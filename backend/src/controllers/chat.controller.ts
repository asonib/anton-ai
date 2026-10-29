import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthUser } from '../models/types';
import type { ChatService } from '../services/chat.service';
import { ApiResponse } from '../utils/apiResponse';
import { conversationIdParamSchema, paginationQuerySchema, promptSchema } from '../validators/chat.schemas';
import { validate } from '../validators/validate';

const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
};

/** HTTP adapter for chat. The user id ALWAYS comes from the verified JWT. */
export class ChatController {
  constructor(private readonly chats: ChatService) {}

  list = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const page = validate(paginationQuerySchema, req.query);
    const { items, total } = await this.chats.listConversations(user.id, page);
    return ApiResponse.ok(res, items, { total, limit: page.limit, offset: page.offset });
  };

  messages = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { conversationId } = validate(conversationIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.chats.getMessages(user.id, conversationId));
  };

  prompt = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const input = validate(promptSchema, req.body);
    return ApiResponse.ok(res, await this.chats.sendPrompt(user.id, input));
  };

  remove = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { conversationId } = validate(conversationIdParamSchema, req.params);
    await this.chats.deleteConversation(user.id, conversationId);
    return ApiResponse.noContent(res);
  };
}
