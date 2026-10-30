import type { BuiltInPromptDefinition, PromptCategoryDefinition } from '../config/prompts.config';
import { ResourceNotFoundException, ValidationException } from '../exceptions';
import { toPromptDTO } from '../models/mappers';
import type { PromptRepository, PromptWriteData } from '../models/repositories/prompt.repository';
import type { PromptCategoryDTO, PromptDTO, PromptListQuery } from '../models/types';

/**
 * Shared prompt library. Every user can browse/search all prompts and add their own; only the author
 * may edit or delete a prompt (others get 404, same as a missing prompt). Built-ins come from
 * `config/prompts.config.ts` and are read-only through the API. Favourites are per user.
 */
export class PromptService {
  private readonly categoryIds: ReadonlySet<string>;

  constructor(
    private readonly prompts: PromptRepository,
    private readonly categories: readonly PromptCategoryDefinition[],
    private readonly builtIns: readonly BuiltInPromptDefinition[],
  ) {
    this.categoryIds = new Set(categories.map((c) => c.id));
  }

  listCategories(): PromptCategoryDTO[] {
    return this.categories.map(({ id, name, icon }) => ({ id, name, icon }));
  }

  async list(userId: string, query: PromptListQuery): Promise<{ items: PromptDTO[]; total: number }> {
    if (query.category) this.assertCategory(query.category);
    const [rows, total] = await Promise.all([this.prompts.list(userId, query), this.prompts.count(userId, query)]);
    return { items: rows.map((p) => toPromptDTO(p, userId)), total };
  }

  async get(userId: string, promptId: string): Promise<PromptDTO> {
    const prompt = await this.prompts.findById(promptId, userId);
    if (!prompt) throw new ResourceNotFoundException('Prompt', promptId);
    return toPromptDTO(prompt, userId);
  }

  async create(userId: string, input: PromptWriteData): Promise<PromptDTO> {
    this.assertCategory(input.category);
    return toPromptDTO(await this.prompts.create(userId, input), userId);
  }

  async update(userId: string, promptId: string, input: Partial<PromptWriteData>): Promise<PromptDTO> {
    if (input.category !== undefined) this.assertCategory(input.category);
    const updated = await this.prompts.updateForAuthor(promptId, userId, input);
    if (!updated) throw new ResourceNotFoundException('Prompt', promptId);
    return this.get(userId, promptId);
  }

  async remove(userId: string, promptId: string): Promise<void> {
    const deleted = await this.prompts.deleteForAuthor(promptId, userId);
    if (!deleted) throw new ResourceNotFoundException('Prompt', promptId);
  }

  async setFavorite(userId: string, promptId: string, favorite: boolean): Promise<PromptDTO> {
    if (!(await this.prompts.exists(promptId))) throw new ResourceNotFoundException('Prompt', promptId);
    if (favorite) await this.prompts.addFavorite(userId, promptId);
    else await this.prompts.removeFavorite(userId, promptId);
    return this.get(userId, promptId);
  }

  /** Called once on startup: make the built-in rows match `BUILT_IN_PROMPTS`. */
  async syncBuiltIns(): Promise<number> {
    const bad = this.builtIns.filter((p) => !this.categoryIds.has(p.category));
    if (bad.length) throw new Error(`Built-in prompts with unknown category: ${bad.map((p) => p.key).join(', ')}`);
    await this.prompts.syncBuiltIns(this.builtIns.map(({ key, title, category, content }) => ({ key, title, category, content })));
    return this.builtIns.length;
  }

  private assertCategory(category: string): void {
    if (!this.categoryIds.has(category)) {
      throw new ValidationException('Request validation failed', [
        { field: 'category', message: `Unknown category "${category}". Expected one of: ${[...this.categoryIds].join(', ')}` },
      ]);
    }
  }
}
