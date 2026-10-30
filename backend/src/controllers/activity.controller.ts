import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { ActivityService } from '../services/activity.service';
import { ApiResponse } from '../utils/apiResponse';
import { runIdParamSchema } from '../validators/chat.schemas';
import { validate } from '../validators/validate';

/** Live progress of an in-flight prompt. `data` is null until the run starts (or after it expired). */
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  get = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedException();
    const { runId } = validate(runIdParamSchema, req.params);
    return ApiResponse.ok(res, this.activity.get(req.user.id, runId));
  };
}
