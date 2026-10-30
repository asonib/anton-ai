import type { Request, Response } from 'express';
import { UnauthorizedException } from '../exceptions';
import type { AuthUser } from '../models/types';
import type { ProjectService } from '../services/project.service';
import { ApiResponse } from '../utils/apiResponse';
import {
  addGithubProjectSchema,
  browseQuerySchema,
  addLocalProjectSchema,
  changeIdParamSchema,
  changeIdsSchema,
  createProjectSchema,
  projectIdParamSchema,
} from '../validators/project.schemas';
import { validate } from '../validators/validate';

const currentUser = (req: Request): AuthUser => {
  if (!req.user) throw new UnauthorizedException();
  return req.user;
};

/** HTTP adapter for attached projects and their proposed changes. The user id ALWAYS comes from the verified JWT. */
export class ProjectController {
  constructor(private readonly projects: ProjectService) {}

  config = async (_req: Request, res: Response) => ApiResponse.ok(res, this.projects.getConfig());

  list = async (req: Request, res: Response) => ApiResponse.ok(res, await this.projects.list(currentUser(req).id));

  get = async (req: Request, res: Response) => {
    const { projectId } = validate(projectIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.projects.get(currentUser(req).id, projectId));
  };

  browse = async (req: Request, res: Response) => {
    const { path } = validate(browseQuerySchema, req.query);
    return ApiResponse.ok(res, await this.projects.browse(currentUser(req).id, path));
  };

  create = async (req: Request, res: Response) => {
    const input = validate(createProjectSchema, req.body ?? {});
    return ApiResponse.created(res, await this.projects.createEmpty(currentUser(req).id, input));
  };

  addLocal = async (req: Request, res: Response) => {
    const input = validate(addLocalProjectSchema, req.body ?? {});
    return ApiResponse.created(res, await this.projects.addLocal(currentUser(req).id, input));
  };

  addGithub = async (req: Request, res: Response) => {
    const input = validate(addGithubProjectSchema, req.body ?? {});
    return ApiResponse.created(res, await this.projects.addGithub(currentUser(req).id, input));
  };

  remove = async (req: Request, res: Response) => {
    const { projectId } = validate(projectIdParamSchema, req.params);
    await this.projects.remove(currentUser(req).id, projectId);
    return ApiResponse.noContent(res);
  };

  change = async (req: Request, res: Response) => {
    const { changeId } = validate(changeIdParamSchema, req.params);
    return ApiResponse.ok(res, await this.projects.getChange(currentUser(req).id, changeId));
  };

  apply = async (req: Request, res: Response) => {
    const { changeIds, force } = validate(changeIdsSchema, req.body ?? {});
    return ApiResponse.ok(res, await this.projects.apply(currentUser(req).id, changeIds, force));
  };

  discard = async (req: Request, res: Response) => {
    const { changeIds } = validate(changeIdsSchema, req.body ?? {});
    return ApiResponse.ok(res, await this.projects.discard(currentUser(req).id, changeIds));
  };

  revert = async (req: Request, res: Response) => {
    const { changeIds, force } = validate(changeIdsSchema, req.body ?? {});
    return ApiResponse.ok(res, await this.projects.revert(currentUser(req).id, changeIds, force));
  };
}
