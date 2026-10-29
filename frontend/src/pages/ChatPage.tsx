import { Menu, Plus } from 'lucide-react';
import { useState } from 'react';
import styled from 'styled-components';
import { ChatViewport } from '../components/chat/ChatViewport';
import { EmptyState } from '../components/chat/EmptyState';
import { PromptInput } from '../components/chat/PromptInput';
import { Sidebar } from '../components/chat/Sidebar';
import { IconButton } from '../components/common/Button';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../hooks/useChat';
import { fadeIn } from '../styles/animations';
import { media } from '../styles/theme';

const Layout = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const Main = styled.main`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
`;

const TopBar = styled.header`
  display: none;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgElevated};
  font-weight: 600;

  ${media.mobile} { display: flex; }
`;

const Overlay = styled.div`
  display: none;
  ${media.mobile} {
    display: block;
    position: fixed;
    inset: 0;
    z-index: ${({ theme }) => theme.zIndex.overlay};
    background: ${({ theme }) => theme.colors.overlay};
    animation: ${fadeIn} 200ms ease both;
  }
`;

const Composer = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.chatMaxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => `0 ${theme.space.lg} ${theme.space.lg}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

export function ChatPage() {
  const { user, logout } = useAuth();
  const chat = useChat();
  const [draft, setDraft] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const providerInfo = chat.providers.find((p) => p.id === chat.provider);
  const providerLabel = providerInfo?.label ?? chat.provider;

  const submit = async (text = draft) => {
    const value = text.trim();
    if (!value) return;
    setDraft('');
    const ok = await chat.sendPrompt(value);
    if (!ok) setDraft(value); // restore so the user can retry
  };

  const closeSidebarThen = (fn: () => void) => () => {
    fn();
    setSidebarOpen(false);
  };

  return (
    <Layout>
      <Sidebar
        open={sidebarOpen}
        conversations={chat.conversations}
        loading={chat.loadingConversations}
        activeId={chat.activeId}
        providers={chat.providers}
        provider={chat.provider}
        sending={chat.sending}
        userEmail={user?.email}
        onSelect={(id) => closeSidebarThen(() => void chat.selectConversation(id))()}
        onNewChat={closeSidebarThen(chat.newChat)}
        onDelete={(id) => void chat.deleteConversation(id)}
        onProviderChange={chat.setProvider}
        onLogout={logout}
      />
      {sidebarOpen && <Overlay onClick={() => setSidebarOpen(false)} />}

      <Main>
        <TopBar>
          <IconButton type="button" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
            <Menu size={18} />
          </IconButton>
          <span>AI Chat</span>
          <IconButton type="button" aria-label="New chat" onClick={chat.newChat}>
            <Plus size={18} />
          </IconButton>
        </TopBar>

        <ChatViewport
          messages={chat.messages}
          loading={chat.loadingMessages}
          sending={chat.sending}
          providerLabel={providerLabel}
          empty={<EmptyState providerLabel={providerLabel} onPick={(text) => void submit(text)} />}
        />

        <Composer>
          {chat.error && <ErrorBanner message={chat.error.message} details={chat.error.details} onDismiss={chat.dismissError} />}
          <PromptInput
            value={draft}
            onChange={setDraft}
            onSubmit={() => void submit()}
            disabled={chat.sending}
            placeholder={`Message ${providerLabel}…`}
          />
        </Composer>
      </Main>
    </Layout>
  );
}
