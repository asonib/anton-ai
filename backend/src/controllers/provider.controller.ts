import type { Request, Response } from 'express';
import type { LLMService } from '../services/llm.service';
import { ApiResponse } from '../utils/apiResponse';

export class ProviderController {
  constructor(private readonly llm: LLMService) {}

  list = async (_req: Request, res: Response) => ApiResponse.ok(res, this.llm.listProviders());
}
