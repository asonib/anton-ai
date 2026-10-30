import { http } from './httpClient';
import type { ApiSuccess, FolderListing, Project, ProjectChangeDetail, ProjectChangesResult, ProjectDetail, ProjectsConfig } from './types';

const projectPath = (id: string) => `/projects/${encodeURIComponent(id)}`;

/** Attached projects and the file changes the model proposes for them. */
export const projectApi = {
  async getConfig(): Promise<ProjectsConfig> {
    const { data } = await http.get<ApiSuccess<ProjectsConfig>>('/projects/config');
    return data.data;
  },
  async list(): Promise<Project[]> {
    const { data } = await http.get<ApiSuccess<Project[]>>('/projects');
    return data.data;
  },
  /** Sub-folders of `path` inside the workspace (default: the projects folder). */
  async browse(path?: string): Promise<FolderListing> {
    const { data } = await http.get<ApiSuccess<FolderListing>>('/projects/browse', { params: { path: path || undefined } });
    return data.data;
  },
  async get(id: string): Promise<ProjectDetail> {
    const { data } = await http.get<ApiSuccess<ProjectDetail>>(projectPath(id));
    return data.data;
  },
  /** Creates an empty folder `<projectsDir>/<name>` and registers it as a project. */
  async create(input: { name: string }): Promise<ProjectDetail> {
    const { data } = await http.post<ApiSuccess<ProjectDetail>>('/projects/new', input);
    return data.data;
  },
  async addLocal(input: { path: string; name?: string }): Promise<ProjectDetail> {
    const { data } = await http.post<ApiSuccess<ProjectDetail>>('/projects/local', input);
    return data.data;
  },
  /** Clones a public repo on the server — can take a while for big repos. */
  async addGithub(input: { url: string; ref?: string; name?: string }): Promise<ProjectDetail> {
    const { data } = await http.post<ApiSuccess<ProjectDetail>>('/projects/github', input);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await http.delete(projectPath(id));
  },
  async getChange(changeId: string): Promise<ProjectChangeDetail> {
    const { data } = await http.get<ApiSuccess<ProjectChangeDetail>>(`/projects/changes/${encodeURIComponent(changeId)}`);
    return data.data;
  },
  async apply(changeIds: string[], force = false): Promise<ProjectChangesResult> {
    const { data } = await http.post<ApiSuccess<ProjectChangesResult>>('/projects/changes/apply', { changeIds, force });
    return data.data;
  },
  async discard(changeIds: string[]): Promise<ProjectChangesResult> {
    const { data } = await http.post<ApiSuccess<ProjectChangesResult>>('/projects/changes/discard', { changeIds });
    return data.data;
  },
  async revert(changeIds: string[], force = false): Promise<ProjectChangesResult> {
    const { data } = await http.post<ApiSuccess<ProjectChangesResult>>('/projects/changes/revert', { changeIds, force });
    return data.data;
  },
};
