import { http } from './httpClient';
import type { ApiSuccess, LibraryPrompt, PromptCategory, PromptDraft, PromptListParams } from './types';

const path = (id: string) => `/prompts/${encodeURIComponent(id)}`;

/** Shared prompt library. */
export const promptApi = {
  async listCategories(): Promise<PromptCategory[]> {
    const { data } = await http.get<ApiSuccess<PromptCategory[]>>('/prompts/categories');
    return data.data;
  },
  async list({ search, category, scope = 'all', limit = 200 }: PromptListParams = {}): Promise<{ items: LibraryPrompt[]; total: number }> {
    const { data } = await http.get<ApiSuccess<LibraryPrompt[]>>('/prompts', {
      params: { search: search || undefined, category: category || undefined, scope, limit },
    });
    const total = typeof data.meta?.total === 'number' ? data.meta.total : data.data.length;
    return { items: data.data, total };
  },
  async create(draft: PromptDraft): Promise<LibraryPrompt> {
    const { data } = await http.post<ApiSuccess<LibraryPrompt>>('/prompts', draft);
    return data.data;
  },
  async update(id: string, draft: Partial<PromptDraft>): Promise<LibraryPrompt> {
    const { data } = await http.patch<ApiSuccess<LibraryPrompt>>(path(id), draft);
    return data.data;
  },
  async remove(id: string): Promise<void> {
    await http.delete(path(id));
  },
  async setFavorite(id: string, favorite: boolean): Promise<LibraryPrompt> {
    const { data } = favorite
      ? await http.put<ApiSuccess<LibraryPrompt>>(`${path(id)}/favorite`)
      : await http.delete<ApiSuccess<LibraryPrompt>>(`${path(id)}/favorite`);
    return data.data;
  },
};
