import type { Request, Response } from 'express';
import type { SkillService } from '../services/skill.service';
import { ApiResponse } from '../utils/apiResponse';

export class SkillController {
  constructor(private readonly skills: SkillService) {}

  list = async (_req: Request, res: Response) => ApiResponse.ok(res, this.skills.list());
}
