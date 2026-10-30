import { http } from './httpClient';
import type {
  ApiSuccess,
  ChatMessage,
  Conversation,
  ConversationSummary,
  PromptRequest,
  PromptResult,
  ProviderInfo,
  Skill,
} from './types';

export const chatApi = {
  async listConversations(limit = 100): Promise<ConversationSummary[]> {
    const { data } = await http.get<ApiSuccess<ConversationSummary[]>>('/chats', { params: { limit } });
    return data.data;
  },
  async getMessages(conversationId: string): Promise<{ conversation: Conversation; messages: ChatMessage[] }> {
    const { data } = await http.get<ApiSuccess<{ conversation: Conversation; messages: ChatMessage[] }>>(
      `/chats/${encodeURIComponent(conversationId)}/messages`,
    );
    return data.data;
  },
  async sendPrompt({ files, ...fields }: PromptRequest): Promise<PromptResult> {
    if (!files?.length) {
      const { data } = await http.post<ApiSuccess<PromptResult>>('/chats/prompt', fields);
      return data.data;
    }
    const form = new FormData();
    form.append('prompt', fields.prompt);
    if (fields.conversationId) form.append('conversationId', fields.conversationId);
    if (fields.provider) form.append('provider', fields.provider);
    if (fields.skill) form.append('skill', fields.skill);
    if (fields.projectId) form.append('projectId', fields.projectId);
    files.forEach((file) => form.append('files', file, file.name));
    // Explicit multipart type stops axios from JSON-serialising the FormData (the instance default
    // is application/json); the browser then fills in the boundary.
    const { data } = await http.post<ApiSuccess<PromptResult>>('/chats/prompt', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data.data;
  },
  /** Raw bytes of a stored attachment (authorised via the shared axios instance). */
  async getAttachmentBlob(attachmentId: string): Promise<Blob> {
    const { data } = await http.get<Blob>(`/attachments/${encodeURIComponent(attachmentId)}/content`, {
      responseType: 'blob',
    });
    return data;
  },
  async deleteConversation(conversationId: string): Promise<void> {
    await http.delete(`/chats/${encodeURIComponent(conversationId)}`);
  },
  async listProviders(): Promise<ProviderInfo[]> {
    const { data } = await http.get<ApiSuccess<ProviderInfo[]>>('/providers');
    return data.data;
  },
  async listSkills(): Promise<Skill[]> {
    const { data } = await http.get<ApiSuccess<Skill[]>>('/skills');
    return data.data;
  },
};
