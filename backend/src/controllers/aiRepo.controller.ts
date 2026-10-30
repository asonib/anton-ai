import type { Request, Response } from 'express';
import type { AiRepoService } from '../services/aiRepo.service';
import { ApiResponse } from '../utils/apiResponse';
import { aiRepoListQuerySchema } from '../validators/aiRepo.schemas';
import { validate } from '../validators/validate';

/** HTTP adapter for the "Top AI repos" panel. */
export class AiRepoController {
  constructor(private readonly repos: AiRepoService) {}

  list = async (req: Request, res: Response) => {
    const { category } = validate(aiRepoListQuerySchema, req.query);
    return ApiResponse.ok(res, await this.repos.list(category));
  };
}
