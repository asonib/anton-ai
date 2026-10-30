import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthUser } from '../models/types';
import type { PromptService } from '../services/prompt.service';
import { ApiResponse } from '../utils/apiResponse';
import { createPromptSchema, promptIdParamSchema, promptListQuerySchema, updatePromptSchema } from '../validators/prompt.schemas';
import { validate } from '../validators/validate';

const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
};

/** HTTP adapter for the shared prompt library. The user id ALWAYS comes from the verified JWT. */
export class PromptController {
  constructor(private readonly prompts: PromptService) {}

  categories = async (_req: Request, res: Response) => ApiResponse.ok(res, this.prompts.listCategories());

  list = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const query = validate(promptListQuerySchema, req.query);
    const { items, total } = await this.prompts.list(user.id, query);
    return ApiResponse.ok(res, items, { total, limit: query.limit, offset: query.offset });
  };

  get = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { promptId } = validate(promptIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.prompts.get(user.id, promptId));
  };

  create = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const input = validate(createPromptSchema, req.body ?? {});
    return ApiResponse.created(res, await this.prompts.create(user.id, input));
  };

  update = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { promptId } = validate(promptIdParamSchema, req.params);
    const input = validate(updatePromptSchema, req.body ?? {});
    return ApiResponse.ok(res, await this.prompts.update(user.id, promptId, input));
  };

  remove = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { promptId } = validate(promptIdParamSchema, req.params);
    await this.prompts.remove(user.id, promptId);
    return ApiResponse.noContent(res);
  };

  favorite = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { promptId } = validate(promptIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.prompts.setFavorite(user.id, promptId, true));
  };

  unfavorite = async (req: Request, res: Response) => {
    const user = currentUser(req);
    const { promptId } = validate(promptIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.prompts.setFavorite(user.id, promptId, false));
  };
}
