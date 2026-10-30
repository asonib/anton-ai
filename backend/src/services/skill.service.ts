import { llmDefaults } from '../config/llm.config';
import type { SkillDefinition } from '../config/skills.config';
import { ValidationException } from '../exceptions';
import type { SkillDTO } from '../models/types';

/**
 * Skills catalogue: lists the public part of each skill and turns a skill id into the
 * system prompt for the model. Skills are static config, so there is no repository.
 */
export class SkillService {
  private readonly byId: ReadonlyMap<string, SkillDefinition>;

  constructor(
    private readonly skills: readonly SkillDefinition[],
    private readonly baseSystemPrompt: string = llmDefaults.systemPrompt,
  ) {
    this.byId = new Map(skills.map((s) => [s.id, s]));
  }

  list(): SkillDTO[] {
    return this.skills.map(({ id, name, icon, tagline, description, samplePrompts }) => ({
      id,
      name,
      icon,
      tagline,
      description,
      samplePrompts: [...samplePrompts],
    }));
  }

  /** Display name of a skill (null when none / unknown). */
  nameOf(skillId?: string | null): string | null {
    return (skillId && this.byId.get(skillId)?.name) || null;
  }

  /**
   * System prompt for a request: the base prompt plus the skill's instructions.
   * Returns `undefined` when no skill is selected so the strategy falls back to its default.
   * Throws 400 for an unknown id (call this before any DB writes or LLM calls).
   */
  systemPromptFor(skillId?: string | null): string | undefined {
    if (!skillId) return undefined;
    const skill = this.byId.get(skillId);
    if (!skill) {
      throw new ValidationException('Request validation failed', [
        { field: 'skill', message: `Unknown skill "${skillId}". Expected one of: ${[...this.byId.keys()].join(', ')}` },
      ]);
    }
    return `${this.baseSystemPrompt.trim()}\n\n${skill.instructions.trim()}`;
  }
}
