import { http } from './httpClient';
import type {
  ApiSuccess,
  ChatMessage,
  Conversation,
  ConversationSummary,
  PromptRequest,
  PromptResult,
  ProviderInfo,
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
  async sendPrompt(body: PromptRequest): Promise<PromptResult> {
    const { data } = await http.post<ApiSuccess<PromptResult>>('/chats/prompt', body);
    return data.data;
  },
  async deleteConversation(conversationId: string): Promise<void> {
    await http.delete(`/chats/${encodeURIComponent(conversationId)}`);
  },
  async listProviders(): Promise<ProviderInfo[]> {
    const { data } = await http.get<ApiSuccess<ProviderInfo[]>>('/providers');
    return data.data;
  },
};
