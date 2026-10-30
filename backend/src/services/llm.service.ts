import type { LLMProvider } from '../config/env';
import { llmDefaults } from '../config/llm.config';
import type { MessageWithMemory } from '../models/repositories/message.repository';
import type { AttachmentKindValue } from '../models/types';
import type { LLMImage, LLMOptions, LLMResponse, Message, ProviderInfo } from '../strategies/llm.types';
import type { LLMStrategyFactory } from '../strategies/LLMStrategyFactory';
import { codeLanguageFor } from '../utils/fileTypes';
import { logger } from '../utils/logger';

/** What the prompt composer needs to know about an attachment. */
export interface PromptAttachment {
  kind: AttachmentKindValue;
  fileName: string;
  extractedText: string | null;
}

export interface GenerateInput {
  prompt: string;
  attachments: PromptAttachment[];
  images: LLMImage[];
}

/** Used when the user sends files without typing anything. */
export const DEFAULT_ATTACHMENT_PROMPT = 'Please review the attached file(s) and summarise the key points.';

/**
 * LLM orchestration service: picks the strategy (via the factory), converts
 * persisted messages into the windowed conversation memory, and invokes the model.
 * Knows nothing about HTTP or about how messages are stored.
 */
export class LLMService {
  constructor(
    private readonly factory: LLMStrategyFactory,
    private readonly historyWindow: number = llmDefaults.historyWindow,
    private readonly historyImageLimit: number = llmDefaults.historyImageLimit,
  ) {}

  get memoryWindow(): number {
    return this.historyWindow;
  }

  listProviders(): ProviderInfo[] {
    return this.factory.listProviders();
  }

  /** Validates the provider early (before any DB writes) and returns the resolved id/model. */
  resolveProvider(provider?: string | null, model?: string): { provider: LLMProvider; model: string; label: string } {
    const strategy = this.factory.resolve(provider);
    return { provider: strategy.provider, model: model?.trim() || strategy.defaultModel, label: strategy.label };
  }

  /**
   * Text sent to the model for one user turn: the typed prompt followed by every
   * document/code attachment wrapped in an <attachment> block. Images are listed
   * by name here and sent separately as image parts.
   */
  composeUserContent(prompt: string, attachments: PromptAttachment[]): string {
    const text = prompt.trim() || (attachments.length > 0 ? DEFAULT_ATTACHMENT_PROMPT : '');
    if (attachments.length === 0) return text;

    const blocks = attachments.map((a) => {
      const name = a.fileName.replace(/"/g, "'");
      if (a.kind === 'image') return `<attachment name="${name}" type="image" />`;
      const body = a.extractedText ?? '';
      const fenced = a.kind === 'code' ? `\`\`\`${codeLanguageFor(a.fileName) ?? ''}\n${body}\n\`\`\`` : body;
      return `<attachment name="${name}" type="${a.kind}">\n${fenced}\n</attachment>`;
    });
    return `${text}\n\n${blocks.join('\n\n')}`;
  }

  /** Ids of the most recent history images that should be re-sent to the model. */
  pickHistoryImageIds(history: MessageWithMemory[]): string[] {
    if (this.historyImageLimit <= 0) return [];
    const ids = this.windowed(history)
      .filter((m) => m.role === 'user')
      .flatMap((m) => m.attachments.filter((a) => a.kind === 'image').map((a) => a.id));
    return ids.slice(-this.historyImageLimit);
  }

  /** DB history → provider-agnostic memory (attachments folded into user turns). */
  buildMemory(history: MessageWithMemory[], historyImages: Map<string, LLMImage> = new Map()): Message[] {
    return this.windowed(history).map((m) => {
      if (m.role === 'assistant') return { role: m.role, content: this.describeChanges(m.content, m.projectChanges) };
      if (m.attachments.length === 0) return { role: m.role, content: m.content };
      const images = m.attachments.flatMap((a) => {
        const img = historyImages.get(a.id);
        return img ? [img] : [];
      });
      return {
        role: m.role,
        content: this.composeUserContent(m.content, m.attachments),
        ...(images.length ? { images } : {}),
      };
    });
  }

  /**
   * File blocks are stripped from stored replies, so the memory notes which edits were proposed
   * and what the user did with them (the current file contents come from the project context).
   */
  private describeChanges(content: string, changes: { path: string; action: string; status: string }[] = []): string {
    if (changes.length === 0) return content;
    const list = changes.map((c) => `${c.path} (${c.action}, ${c.status})`).join(', ');
    return `${content}\n\n[Proposed file changes: ${list}]`;
  }

  async generate(
    input: GenerateInput,
    history: MessageWithMemory[],
    provider?: string | null,
    options: LLMOptions = {},
    historyImages: Map<string, LLMImage> = new Map(),
  ): Promise<LLMResponse> {
    const strategy = this.factory.resolve(provider);
    logger.info('Invoking LLM', {
      provider: strategy.provider,
      model: options.model ?? strategy.defaultModel,
      historySize: history.length,
      attachments: input.attachments.length,
      images: input.images.length + historyImages.size,
    });
    return strategy.generateResponse(
      this.composeUserContent(input.prompt, input.attachments),
      this.buildMemory(history, historyImages),
      options,
      input.images,
    );
  }

  private windowed<T>(history: T[]): T[] {
    return history.slice(-this.historyWindow);
  }
}
