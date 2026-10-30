import { AppException } from './AppException';

export type ProjectWorkspaceErrorCode =
  /** git is not installed / not on the PATH (503). */
  | 'GIT_NOT_AVAILABLE'
  /** Clone failed: repo missing, private, bad branch, timeout (422). */
  | 'GIT_CLONE_FAILED'
  /** The project folder no longer exists or cannot be read (409). */
  | 'PROJECT_UNAVAILABLE'
  /** Local projects are disabled or the path is outside WORKSPACE_ROOTS (403). */
  | 'PROJECT_PATH_FORBIDDEN';

const STATUS: Record<ProjectWorkspaceErrorCode, number> = {
  GIT_NOT_AVAILABLE: 503,
  GIT_CLONE_FAILED: 422,
  PROJECT_UNAVAILABLE: 409,
  PROJECT_PATH_FORBIDDEN: 403,
};

/** Errors from the project workspace (file system + git). */
export class ProjectWorkspaceException extends AppException {
  constructor(message: string, code: ProjectWorkspaceErrorCode) {
    super(message, STATUS[code], code);
  }
}
