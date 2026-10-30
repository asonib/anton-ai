import { Check, FolderOpen, FolderPlus, Github, Keyboard, Link2, Trash2, Unlink, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { Project } from '../../api/types';
import type { FolderBrowserState } from '../../hooks/useFolderBrowser';
import type { ProjectsState } from '../../hooks/useProjects';
import { fadeIn, gradientText, skeletonShimmer } from '../../styles/animations';
import { media } from '../../styles/theme';
import { formatDate } from '../../utils/format';
import { Button, IconButton, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { FolderPicker } from './FolderPicker';

/** Covers the chat area (desktop) or the whole screen (mobile), like the prompt library. */
const Panel = styled.section`
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  animation: ${fadeIn} 180ms ease both;

  ${media.mobile} {
    position: fixed;
    z-index: ${({ theme }) => theme.zIndex.toast};
  }
`;

const Scroll = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
`;

const Inner = styled.div`
  width: 100%;
  max-width: 1000px;
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.xl} ${theme.space.xxxl}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};

  ${media.mobile} { padding: ${({ theme }) => `${theme.space.sm} ${theme.space.lg} ${theme.space.xxl}`}; }
`;

const TopRow = styled.div`
  display: flex;
  justify-content: flex-end;
`;

const CloseButton = styled(IconButton)`
  height: 38px;
  min-width: 38px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
`;

const Hero = styled.header`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};

  h1 {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizes.xxl};
    letter-spacing: -0.02em;
    line-height: 1.2;
  }
  p {
    margin: 0;
    max-width: 620px;
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.fontSizes.md};
  }
`;

const Headline = styled.span`
  ${gradientText('8s')}
`;

const AddGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space.lg};
  ${media.mobile} { grid-template-columns: 1fr; }
`;

const cardBase = css`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const AddCard = styled.form`
  ${cardBase}

  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
    font-size: ${({ theme }) => theme.fontSizes.md};
    svg { color: ${({ theme }) => theme.colors.primary}; }
  }
`;

const PickCard = styled.section`
  ${cardBase}
`;

const PickHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
    font-size: ${({ theme }) => theme.fontSizes.md};
    svg { color: ${({ theme }) => theme.colors.primary}; }
  }
`;

const TextButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: none;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  &:hover { color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.surfaceHover}; }
`;

const ManualForm = styled.form`
  display: flex;
  gap: ${({ theme }) => theme.space.sm};
  ${media.mobile} { flex-direction: column; }
`;

const Hint = styled.p`
  margin: 0;
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.5;

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    color: ${({ theme }) => theme.colors.textMuted};
    overflow-wrap: anywhere;
  }
`;

const Input = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgElevated};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  &::placeholder { color: ${({ theme }) => theme.colors.textSubtle}; }
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
  &:disabled { opacity: 0.6; }
`;

const SubmitRow = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: auto;
`;

const SectionTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.lg};

  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: 400;
  }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const ProjectRow = styled.li<{ $active: boolean }>`
  ${cardBase}
  flex-direction: row;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-color: ${({ theme, $active }) => ($active ? theme.colors.primary : theme.colors.border)};
  box-shadow: ${({ theme, $active }) => ($active ? theme.shadows.glow : theme.shadows.sm)};

  ${media.mobile} { flex-wrap: wrap; }
`;

const SourceIcon = styled.span`
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
`;

const Info = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;

  strong {
    font-size: ${({ theme }) => theme.fontSizes.md};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  code, span {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textSubtle};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  code { font-family: ${({ theme }) => theme.fonts.mono}; }
`;

const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  flex-shrink: 0;
`;

const AttachedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xxs};
  padding: 2px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.successSoft};
  color: ${({ theme }) => theme.colors.success};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
`;

const Skeleton = styled.li`
  height: 64px;
  border-radius: ${({ theme }) => theme.radii.xl};
  ${skeletonShimmer}
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.space.xl};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

interface Props {
  state: ProjectsState;
  /** Workspace folder picker (`useFolderBrowser`). */
  browser: FolderBrowserState;
  activeId: string | null;
  onAttach: (project: Project) => void;
  onDetach: () => void;
  onClose: () => void;
}

/**
 * Attach a local folder (inside the operator's WORKSPACE_ROOTS) or a public GitHub repo, and pick which
 * project the chat works on. Adding a project attaches it right away.
 */
export function ProjectPanel({ state, browser, activeId, onAttach, onDetach, onClose }: Props) {
  const { config, projects, loading, busy, error } = state;
  const [newName, setNewName] = useState('');
  const [localPath, setLocalPath] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoRef, setRepoRef] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const headingId = useId();
  const [manual, setManual] = useState(false);
  const manualInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (manual) manualInput.current?.focus();
  }, [manual]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const submitNew = async (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || busy) return;
    const project = await state.create(newName.trim());
    if (project) {
      setNewName('');
      void browser.refresh();
      onAttach(project);
    }
  };

  /** Folders that are already projects are attached directly; others are added first. */
  const pickFolder = async (dir: string, projectId: string | null) => {
    const existing = projectId ? projects.find((p) => p.id === projectId) : undefined;
    if (existing) {
      onAttach(existing);
      return;
    }
    const project = await state.addLocal(dir);
    if (project) onAttach(project);
  };

  const submitLocal = async (e: FormEvent) => {
    e.preventDefault();
    if (!localPath.trim() || busy) return;
    const project = await state.addLocal(localPath.trim());
    if (project) {
      setLocalPath('');
      onAttach(project);
    }
  };

  const submitGithub = async (e: FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim() || busy) return;
    const project = await state.addGithub(repoUrl.trim(), repoRef.trim());
    if (project) {
      void browser.refresh();
      setRepoUrl('');
      setRepoRef('');
      onAttach(project);
    }
  };

  const remove = async (project: Project) => {
    if (confirmDelete !== project.id) {
      setConfirmDelete(project.id);
      return;
    }
    setConfirmDelete(null);
    if ((await state.remove(project.id)) && project.id === activeId) onDetach();
  };

  const localEnabled = config?.localEnabled ?? false;
  const sep = config?.projectsDir.includes('\\') ? '\\' : '/';
  const inWorkspace = (dir: string) =>
    (config?.workspaceRoots ?? []).some((root) => dir.toLowerCase().startsWith(root.toLowerCase()));

  return (
    <Panel role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={onKeyDown}>
      <Scroll>
        <Inner>
          <TopRow>
            <CloseButton type="button" aria-label="Close projects" title="Close (Esc)" onClick={onClose}>
              <X size={18} />
            </CloseButton>
          </TopRow>

          <Hero>
            <h1 id={headingId}>
              <Headline>Work on a project</Headline>
            </h1>
            <p>
              Attach a codebase and its files go to the model with every prompt. When you ask for changes, you get a diff to
              review — nothing is written until you apply it.
            </p>
          </Hero>

          <PickCard aria-label="Open a folder from your workspace">
            <PickHeader>
              <h2>
                <FolderOpen size={18} aria-hidden /> Open a folder
              </h2>
              {localEnabled && (
                <TextButton type="button" onClick={() => setManual((m) => !m)} aria-expanded={manual}>
                  <Keyboard size={13} aria-hidden /> {manual ? 'Use the folder picker' : 'Enter a path instead'}
                </TextButton>
              )}
            </PickHeader>
            {!localEnabled ? (
              <Hint>
                Disabled on this server. To enable it, set <code>WORKSPACE_ROOTS</code> in <code>backend/.env</code> to the
                folders users may attach.
              </Hint>
            ) : manual ? (
              <ManualForm onSubmit={submitLocal}>
                <Input
                  ref={manualInput}
                  value={localPath}
                  onChange={(e) => setLocalPath(e.target.value)}
                  placeholder={config?.workspaceRoots[0] ? `${config.workspaceRoots[0]}${sep}my-app` : 'Absolute folder path'}
                  aria-label="Folder path"
                  disabled={busy !== null}
                  spellCheck={false}
                />
                <Button type="submit" $size="sm" disabled={!localPath.trim() || busy !== null}>
                  {busy === 'local' ? <Spinner $size={12} /> : <Link2 size={14} />} Attach folder
                </Button>
              </ManualForm>
            ) : (
              <>
                <Hint>Pick a project folder from your workspace. Applied changes are written straight into it.</Hint>
                <FolderPicker browser={browser} activeId={activeId} busy={busy !== null} onPick={(dir, id) => void pickFolder(dir, id)} />
              </>
            )}
          </PickCard>

          <AddGrid>
            <AddCard onSubmit={submitNew} aria-label="Start a new project">
              <h2>
                <FolderPlus size={18} aria-hidden /> New project
              </h2>
              <Hint>
                Creates an empty folder{' '}
                {config && (
                  <code>
                    {config.projectsDir}
                    {sep}
                    {newName.trim() || 'name'}
                  </code>
                )}{' '}
                and attaches it. Ask Anton to scaffold it; files are written when you apply them.
              </Hint>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Project name, e.g. todo-api"
                aria-label="Project name"
                maxLength={80}
                disabled={busy !== null}
                spellCheck={false}
              />
              <SubmitRow>
                <Button type="submit" $size="sm" disabled={!newName.trim() || busy !== null}>
                  {busy === 'new' ? <Spinner $size={12} /> : <FolderPlus size={14} />} Create & attach
                </Button>
              </SubmitRow>
            </AddCard>

            <AddCard onSubmit={submitGithub} aria-label="Add a GitHub repository">
              <h2>
                <Github size={18} aria-hidden /> GitHub repository
              </h2>
              <Hint>
                Public repos only. Cloned into {config ? <code>{config.projectsDir}{sep}&lt;repo&gt;</code> : 'the projects folder'};
                applied changes go into that clone — commit and push from there.
              </Hint>
              <Input
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                aria-label="Repository URL"
                disabled={busy !== null}
                spellCheck={false}
              />
              <Input
                value={repoRef}
                onChange={(e) => setRepoRef(e.target.value)}
                placeholder="Branch or tag (optional — default branch)"
                aria-label="Branch or tag"
                disabled={busy !== null}
                spellCheck={false}
              />
              <SubmitRow>
                <Button type="submit" $size="sm" disabled={!repoUrl.trim() || busy !== null}>
                  {busy === 'github' ? <Spinner $size={12} /> : <Github size={14} />}
                  {busy === 'github' ? 'Cloning…' : 'Clone & attach'}
                </Button>
              </SubmitRow>
            </AddCard>
          </AddGrid>

          {error && <ErrorBanner message={error.message} details={error.details} onDismiss={state.dismissError} />}

          <SectionTitle>
            Your projects
            {!loading && <small>{projects.length === 1 ? '1 project' : `${projects.length} projects`}</small>}
          </SectionTitle>

          {loading && projects.length === 0 ? (
            <List aria-hidden>
              <Skeleton />
              <Skeleton />
            </List>
          ) : projects.length === 0 ? (
            <Empty>No projects yet — attach a folder or a GitHub repo above.</Empty>
          ) : (
            <List>
              {projects.map((p) => {
                const active = p.id === activeId;
                const Icon = p.source === 'github' ? Github : FolderOpen;
                return (
                  <ProjectRow key={p.id} $active={active}>
                    <SourceIcon>
                      <Icon size={18} aria-hidden />
                    </SourceIcon>
                    <Info>
                      <strong title={p.name}>{p.name}</strong>
                      <code title={p.rootPath}>{p.rootPath}</code>
                      <span>
                        {p.source === 'github' ? `${p.repoUrl ?? ''}${p.gitRef ? ` @ ${p.gitRef}` : ''} · ` : ''}
                        last used {formatDate(p.updatedAt)}
                      </span>
                    </Info>
                    <RowActions>
                      {active ? (
                        <>
                          <AttachedBadge>
                            <Check size={12} aria-hidden /> Attached
                          </AttachedBadge>
                          <Button type="button" $size="sm" $variant="ghost" onClick={onDetach}>
                            <Unlink size={14} /> Detach
                          </Button>
                        </>
                      ) : (
                        <Button type="button" $size="sm" onClick={() => onAttach(p)}>
                          <Link2 size={14} /> Attach
                        </Button>
                      )}
                      <Button
                        type="button"
                        $size="sm"
                        $variant={confirmDelete === p.id ? 'danger' : 'ghost'}
                        aria-label={`Remove ${p.name}`}
                        title={
                          p.source === 'github' && !inWorkspace(p.rootPath)
                            ? 'Remove the project and delete its clone'
                            : 'Remove from the list (the folder stays on disk)'
                        }
                        onClick={() => void remove(p)}
                        onBlur={() => setConfirmDelete((id) => (id === p.id ? null : id))}
                      >
                        <Trash2 size={14} />
                        {confirmDelete === p.id && 'Remove?'}
                      </Button>
                    </RowActions>
                  </ProjectRow>
                );
              })}
            </List>
          )}
        </Inner>
      </Scroll>
    </Panel>
  );
}
