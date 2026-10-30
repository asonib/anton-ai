import { useCallback, useEffect, useRef, useState } from 'react';
import { chatApi } from '../api/chatApi';
import type { ChatMessage, ConversationSummary, LLMProvider, ProviderInfo } from '../api/types';
import { NormalisedError, toNormalisedError } from '../utils/errors';
import type { DisplayAttachment, PendingAttachment } from './useAttachments';
import { storage } from '../utils/storage';

const FALLBACK_PROVIDERS: ProviderInfo[] = [
  { id: 'ollama', label: 'Ollama', model: 'llama3.2', configured: true, isDefault: true },
  { id: 'anthropic', label: 'Anthropic (Claude)', model: '', configured: true, isDefault: false },
  { id: 'gemini', label: 'Google Gemini', model: '', configured: true, isDefault: false },
  { id: 'openai', label: 'OpenAI (ChatGPT)', model: '', configured: true, isDefault: false },
  { id: 'grok', label: 'xAI Grok', model: '', configured: true, isDefault: false },
];

const isProvider = (v: string | null): v is LLMProvider =>
  v === 'ollama' || v === 'openai' || v === 'anthropic' || v === 'gemini' || v === 'grok';

export interface UiMessage extends ChatMessage {
  pending?: boolean;
  attachments: DisplayAttachment[];
}

/**
 * All chat-screen state + side effects. Components stay presentational.
 */
export function useChat() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<NormalisedError | null>(null);
  const [providers, setProviders] = useState<ProviderInfo[]>(FALLBACK_PROVIDERS);
  const [provider, setProviderState] = useState<LLMProvider>(() => {
    const saved = storage.getProvider();
    return isProvider(saved) ? saved : 'ollama';
  });

  // Tracks the thread the user is looking at, so late responses don't render in the wrong view.
  const activeRef = useRef<string | null>(null);
  activeRef.current = activeId;

  const setProvider = useCallback((p: LLMProvider) => {
    storage.setProvider(p);
    setProviderState(p);
  }, []);

  const refreshConversations = useCallback(async () => {
    try {
      setConversations(await chatApi.listConversations());
    } catch (e) {
      setError(toNormalisedError(e));
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  useEffect(() => {
    void refreshConversations();
    chatApi
      .listProviders()
      .then((list) => {
        setProviders(list);
        if (!storage.getProvider()) {
          const def = list.find((p) => p.isDefault);
          if (def) setProviderState(def.id);
        }
      })
      .catch(() => undefined);
  }, [refreshConversations]);

  const selectConversation = useCallback(async (id: string) => {
    if (id === activeRef.current) return;
    setActiveId(id);
    setError(null);
    setMessages([]);
    setLoadingMessages(true);
    try {
      const res = await chatApi.getMessages(id);
      if (activeRef.current === id) setMessages(res.messages);
    } catch (e) {
      if (activeRef.current === id) setError(toNormalisedError(e));
    } finally {
      if (activeRef.current === id) setLoadingMessages(false);
    }
  }, []);

  const newChat = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setError(null);
    setLoadingMessages(false);
  }, []);

  const deleteConversation = useCallback(async (id: string) => {
    try {
      await chatApi.deleteConversation(id);
      setConversations((list) => list.filter((c) => c.id !== id));
      if (activeRef.current === id) newChat();
    } catch (e) {
      setError(toNormalisedError(e));
    }
  }, [newChat]);

  /** Returns true on success so the input can restore the draft on failure. */
  const sendPrompt = useCallback(
    async (prompt: string, files: PendingAttachment[] = []): Promise<boolean> => {
      const text = prompt.trim();
      if ((!text && files.length === 0) || sending) return false;

      const originId = activeRef.current;
      const tempId = `temp-${Date.now()}`;
      const optimistic: UiMessage = {
        id: tempId,
        conversationId: originId ?? 'new',
        role: 'user',
        content: text,
        provider,
        modelName: null,
        createdAt: new Date().toISOString(),
        pending: true,
        attachments: files.map((f) => ({
          id: `temp-${f.id}`,
          kind: f.kind,
          fileName: f.file.name,
          mimeType: f.file.type,
          sizeBytes: f.file.size,
          createdAt: new Date().toISOString(),
          localUrl: f.previewUrl ?? undefined,
        })),
      };

      setError(null);
      setSending(true);
      setMessages((m) => [...m, optimistic]);

      try {
        const res = await chatApi.sendPrompt({
          conversationId: originId ?? undefined,
          prompt: text,
          provider,
          files: files.map((f) => f.file),
        });

        // Only paint into the viewport if the user is still on the originating thread.
        if (activeRef.current === originId) {
          setMessages((m) => [...m.filter((x) => x.id !== tempId), res.userMessage, res.assistantMessage]);
          setActiveId(res.conversation.id);
          activeRef.current = res.conversation.id;
        }

        setConversations((list) => {
          const existing = list.find((c) => c.id === res.conversation.id);
          const updated: ConversationSummary = {
            ...res.conversation,
            messageCount: (existing?.messageCount ?? 0) + 2,
            lastMessagePreview: res.assistantMessage.content.slice(0, 140),
            lastProvider: res.provider,
          };
          return [updated, ...list.filter((c) => c.id !== res.conversation.id)];
        });
        return true;
      } catch (e) {
        if (activeRef.current === originId) {
          setMessages((m) => m.filter((x) => x.id !== tempId));
          setError(toNormalisedError(e));
        }
        return false;
      } finally {
        setSending(false);
      }
    },
    [provider, sending],
  );

  return {
    conversations,
    loadingConversations,
    activeId,
    messages,
    loadingMessages,
    sending,
    error,
    providers,
    provider,
    setProvider,
    selectConversation,
    newChat,
    deleteConversation,
    sendPrompt,
    dismissError: () => setError(null),
    refreshConversations,
  };
}
