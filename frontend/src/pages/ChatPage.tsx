import { Menu, Plus } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import styled from 'styled-components';
import { AiReposPanel } from '../components/aiRepos/AiReposPanel';
import { AiReposTrigger } from '../components/aiRepos/AiReposTrigger';
import { AgentActivityBubble } from '../components/chat/AgentActivityBubble';
import { ChatViewport } from '../components/chat/ChatViewport';
import { EmptyState } from '../components/chat/EmptyState';
import { PromptInput } from '../components/chat/PromptInput';
import { Sidebar } from '../components/chat/Sidebar';
import { SkillLauncher } from '../components/chat/SkillLauncher';
import { ProjectChip } from '../components/projects/ProjectChip';
import { ProjectPanel } from '../components/projects/ProjectPanel';
import { ProjectTrigger } from '../components/projects/ProjectTrigger';
import { PromptLibrary } from '../components/prompts/PromptLibrary';
import { PromptLibraryTrigger } from '../components/prompts/PromptLibraryTrigger';
import { IconButton } from '../components/common/Button';
import { ErrorBanner } from '../components/common/ErrorBanner';
import { useAuth } from '../context/AuthContext';
import { useAgentActivity } from '../hooks/useAgentActivity';
import { useAiRepos } from '../hooks/useAiRepos';
import { useAttachments } from '../hooks/useAttachments';
import { useChat } from '../hooks/useChat';
import { useFolderBrowser } from '../hooks/useFolderBrowser';
import { useProjects } from '../hooks/useProjects';
import { usePromptLibrary } from '../hooks/usePromptLibrary';
import { useSkills } from '../hooks/useSkills';
import { useSpeechToText } from '../hooks/useSpeechToText';
import type { AiRepo, LibraryPrompt, Project } from '../api/types';
import { appEnv } from '../config/env';
import { fadeIn } from '../styles/animations';
import { media } from '../styles/theme';
import { storage } from '../utils/storage';

const Layout = styled.div`
  display: flex;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
`;

const Main = styled.main`
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
`;

/**
 * Desktop: the prompt library + skills buttons float over the top-right of the chat area (same layer,
 * no strip of their own). Mobile: the full top bar — menu, app name, library, skills, new chat.
 */
const TopBar = styled.header`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};

  ${media.mobile} {
    position: relative;
    display: flex;
    justify-content: space-between;
    padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.bgElevated};
    font-weight: 600;
  }
`;

const MobileOnly = styled.div`
  display: none;
  ${media.mobile} { display: contents; }
`;

const MobileTitle = styled.span`
  display: none;
  ${media.mobile} {
    display: block;
    flex: 1;
    min-width: 0;
    text-align: center;
  }
`;

const TopBarActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
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
  const activity = useAgentActivity(chat.run, chat.sending);
  const attachments = useAttachments();
  const { skills, activeSkill, selectSkill } = useSkills();
  const [draft, setDraft] = useState('');
  /** Bumped to focus the composer and select a range (e.g. a sample prompt's first [PLACEHOLDER]). */
  const [selection, setSelection] = useState<{ start: number; end: number; key: number } | null>(null);
  const speech = useSpeechToText(draft, setDraft);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const library = usePromptLibrary(libraryOpen);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const projects = useProjects(chat.projectId);
  const folderBrowser = useFolderBrowser(projectsOpen && Boolean(projects.config?.localEnabled));
  const [reposOpen, setReposOpen] = useState(false);
  const aiRepos = useAiRepos(reposOpen);
  const [cloningUrl, setCloningUrl] = useState<string | null>(null);
  /** Show the projects error inside the repos panel only when it came from a clone started there. */
  const [repoCloneFailed, setRepoCloneFailed] = useState(false);

  // A thread can point at a project that was removed since — drop it instead of failing the next prompt.
  useEffect(() => {
    if (!projects.loading && !projects.error && chat.projectId && !projects.active) chat.setProjectId(null);
  }, [projects.loading, projects.error, projects.active, chat.projectId, chat.setProjectId]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(storage.getSidebarCollapsed);
  const toggleSidebarCollapsed = useCallback(() => setSidebarCollapsed((c) => !c), []);

  useEffect(() => {
    storage.setSidebarCollapsed(sidebarCollapsed);
  }, [sidebarCollapsed]);

  // Stop dictation while a prompt is in flight.
  useEffect(() => {
    if (chat.sending) speech.cancel();
  }, [chat.sending, speech.cancel]);

  // Ctrl/Cmd + Shift + M toggles voice input.
  useEffect(() => {
    if (!speech.supported) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && !e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        speech.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [speech.supported, speech.toggle]);

  // Typing by hand takes over from dictation.
  const onDraftChange = useCallback(
    (v: string) => {
      if (speech.listening) speech.cancel();
      setDraft(v);
    },
    [speech.listening, speech.cancel],
  );

  // Ctrl/Cmd + K toggles the prompt library.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setProjectsOpen(false);
        setReposOpen(false);
        setLibraryOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Ctrl/Cmd + B toggles the desktop sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapsed();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebarCollapsed]);

  const providerInfo = chat.providers.find((p) => p.id === chat.provider);
  const providerLabel = providerInfo?.label ?? chat.provider;
  /** The typing indicator follows the live activity: "Reading attachments", "… is writing", etc. */
  const statusLabel =
    activity.phase === 'running' && activity.current
      ? activity.current.key === 'model'
        ? `${providerLabel} is ${activity.output?.chars ? 'writing' : 'thinking'}`
        : activity.current.label
      : undefined;

  const submit = async (text = draft) => {
    const value = text.trim();
    const files = attachments.items;
    if (!value && files.length === 0) return;
    speech.cancel(); // drop any late dictation results so they can't refill the cleared box
    setDraft('');
    attachments.detach();
    attachments.dismissError();
    const ok = await chat.sendPrompt(value, files, activeSkill?.id);
    if (ok) {
      attachments.release(files);
    } else {
      // restore so the user can retry
      setDraft(value);
      attachments.restore(files);
    }
  };

  /** Sample prompts fill the composer (never send). The first [PLACEHOLDER] is selected for typing over. */
  const fillDraft = (text: string) => {
    speech.cancel();
    setDraft(text);
    const slot = /\[[^\]\n]+\]/.exec(text);
    const start = slot ? slot.index : text.length;
    const end = slot ? slot.index + slot[0].length : text.length;
    setSelection({ start, end, key: Date.now() });
  };

  /** A library prompt fills the composer (never sends) and closes the library. */
  const applyLibraryPrompt = (prompt: LibraryPrompt) => {
    setLibraryOpen(false);
    fillDraft(prompt.content);
  };

  /** Picking a skill opens a fresh chat so its welcome screen and examples show. The draft is kept. */
  const pickSkill = (id: string | null) => {
    selectSkill(id);
    chat.newChat();
    setSelection({ start: draft.length, end: draft.length, key: Date.now() });
  };

  /** Attaching a project applies to the next prompt in this chat (new or existing). */
  const attachProject = (project: Project) => {
    chat.setProjectId(project.id);
    setProjectsOpen(false);
    setSelection({ start: draft.length, end: draft.length, key: Date.now() });
  };

  /** "Add as project" in the top AI repos panel: reuse an existing clone or clone it now, then attach it. */
  const addRepoAsProject = async (repo: AiRepo, existing: Project | null) => {
    if (existing) {
      chat.setProjectId(existing.id);
      setReposOpen(false);
      setSelection({ start: draft.length, end: draft.length, key: Date.now() });
      return;
    }
    projects.dismissError();
    setRepoCloneFailed(false);
    setCloningUrl(repo.url);
    try {
      const project = await projects.addGithub(repo.url);
      if (project) {
        chat.setProjectId(project.id);
        setReposOpen(false);
        setSelection({ start: draft.length, end: draft.length, key: Date.now() });
      } else {
        setRepoCloneFailed(true);
      }
    } finally {
      setCloningUrl(null);
    }
  };

  const closeSidebarThen = (fn: () => void) => () => {
    fn();
    setSidebarOpen(false);
  };

  return (
    <Layout>
      <Sidebar
        open={sidebarOpen}
        collapsed={sidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapsed}
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
          <MobileOnly>
            <IconButton type="button" aria-label="Open sidebar" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </IconButton>
          </MobileOnly>
          <MobileTitle>{appEnv.appName}</MobileTitle>
          <TopBarActions>
            <AiReposTrigger
              open={reposOpen}
              onClick={() => {
                setLibraryOpen(false);
                setProjectsOpen(false);
                setReposOpen((o) => !o);
              }}
            />
            <ProjectTrigger
              open={projectsOpen}
              projectName={projects.active?.name}
              onClick={() => {
                setLibraryOpen(false);
                setReposOpen(false);
                setProjectsOpen((o) => !o);
              }}
            />
            <PromptLibraryTrigger
              open={libraryOpen}
              onClick={() => {
                setProjectsOpen(false);
                setReposOpen(false);
                setLibraryOpen((o) => !o);
              }}
            />
            {skills.length > 0 && (
              <SkillLauncher skills={skills} activeSkill={activeSkill} onSelect={pickSkill} disabled={chat.sending} />
            )}
            <MobileOnly>
              <IconButton type="button" aria-label="New chat" onClick={chat.newChat}>
                <Plus size={18} />
              </IconButton>
            </MobileOnly>
          </TopBarActions>
        </TopBar>

        <ChatViewport
          messages={chat.messages}
          loading={chat.loadingMessages}
          sending={chat.sending}
          providerLabel={providerLabel}
          statusLabel={statusLabel}
          overlay={<AgentActivityBubble view={activity} agentName={appEnv.appName} />}
          reserveTop
          empty={<EmptyState providerLabel={providerLabel} skill={activeSkill} onPick={fillDraft} />}
        />

        <Composer>
          {chat.error && <ErrorBanner message={chat.error.message} details={chat.error.details} onDismiss={chat.dismissError} />}
          {attachments.error && <ErrorBanner message={attachments.error} onDismiss={attachments.dismissError} />}
          {speech.error && <ErrorBanner message={speech.error} onDismiss={speech.dismissError} />}
          {projects.active && (
            <ProjectChip
              project={projects.active}
              detail={projects.activeDetail}
              onOpen={() => {
                setReposOpen(false);
                setLibraryOpen(false);
                setProjectsOpen(true);
              }}
              onDetach={() => chat.setProjectId(null)}
            />
          )}
          <PromptInput
            value={draft}
            onChange={onDraftChange}
            onSubmit={() => void submit()}
            disabled={chat.sending}
            placeholder={
              projects.active ? `Ask about ${projects.active.name} or describe a change…` : `Message ${providerLabel}…`
            }
            attachments={attachments.items}
            onAddFiles={attachments.add}
            onRemoveAttachment={attachments.remove}
            dictation={{ supported: speech.supported, listening: speech.listening, onToggle: speech.toggle }}
            selection={selection}
          />
        </Composer>

        {projectsOpen && (
          <ProjectPanel
            state={projects}
            browser={folderBrowser}
            activeId={chat.projectId}
            onAttach={attachProject}
            onDetach={() => chat.setProjectId(null)}
            onClose={() => setProjectsOpen(false)}
          />
        )}
        {reposOpen && (
          <AiReposPanel
            state={aiRepos}
            projects={projects.projects}
            activeProjectId={chat.projectId}
            cloningUrl={cloningUrl}
            cloneError={repoCloneFailed ? projects.error : null}
            onDismissCloneError={() => {
              setRepoCloneFailed(false);
              projects.dismissError();
            }}
            onAddProject={(repo, existing) => void addRepoAsProject(repo, existing)}
            onClose={() => setReposOpen(false)}
          />
        )}
        {libraryOpen && <PromptLibrary library={library} onClose={() => setLibraryOpen(false)} onUse={applyLibraryPrompt} />}
      </Main>
    </Layout>
  );
}
