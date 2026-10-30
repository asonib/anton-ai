import { http } from './httpClient';
import type { AiRepoList, ApiSuccess } from './types';

/** Most-starred public AI projects on GitHub (ranked and cached by the server). */
export const aiRepoApi = {
  async list(category?: string): Promise<AiRepoList> {
    const { data } = await http.get<ApiSuccess<AiRepoList>>('/ai-repos', { params: { category: category || undefined } });
    return data.data;
  },
};
