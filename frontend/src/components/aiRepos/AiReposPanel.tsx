import { Check, CircleAlert, ExternalLink, FolderPlus, GitFork, Globe, RefreshCw, Scale, Star, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { AiRepo, AiRepoList, Project } from '../../api/types';
import type { AiReposState } from '../../hooks/useAiRepos';
import type { NormalisedError } from '../../utils/errors';
import { fadeIn, gradientText, messageEnter, skeletonShimmer } from '../../styles/animations';
import { media } from '../../styles/theme';
import { formatCount, formatRelative } from '../../utils/format';
import { Button, IconButton, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';

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
  max-width: 960px;
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
  gap: ${({ theme }) => theme.space.sm};
`;

const RoundButton = styled(IconButton)`
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
    color: ${({ theme }) => theme.colors.textMuted};
    font-size: ${({ theme }) => theme.fontSizes.md};
  }
`;

const Headline = styled.span`
  ${gradientText('8s')}
`;

const Chips = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};

  ${media.mobile} {
    flex-wrap: nowrap;
    justify-content: flex-start;
    overflow-x: auto;
    scrollbar-width: none;
    &::-webkit-scrollbar { display: none; }
  }
`;

const Chip = styled.button<{ $active: boolean }>`
  flex-shrink: 0;
  height: 34px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  white-space: nowrap;
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ theme }) => theme.colors.text}; border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }

  ${({ $active, theme }) =>
    $active &&
    css`
      color: ${theme.colors.primary};
      border-color: ${theme.colors.primary};
      background: ${theme.colors.primarySoft};
      &:hover { color: ${theme.colors.primary}; border-color: ${theme.colors.primary}; }
    `}
`;

const Status = styled.p<{ $warn?: boolean }>`
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $warn }) => ($warn ? theme.colors.warning : theme.colors.textSubtle)};
  text-align: center;
  svg { flex-shrink: 0; }
`;

const List = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

const Card = styled.li`
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: ${({ theme }) => theme.space.lg};
  align-items: start;
  padding: ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.xl};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
  transition: border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base};
  animation: ${messageEnter} 260ms ease both;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: ${({ theme }) => theme.shadows.md};
  }

  ${media.mobile} {
    grid-template-columns: auto 1fr;
    padding: ${({ theme }) => theme.space.lg};
    gap: ${({ theme }) => theme.space.md};
  }

  @media (prefers-reduced-motion: reduce) { animation: none; }
`;

const Rank = styled.span<{ $top: boolean }>`
  min-width: 2ch;
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: 800;
  line-height: 40px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $top }) => ($top ? theme.colors.primary : theme.colors.textSubtle)};

  ${media.mobile} { display: none; }
`;

const Avatar = styled.span`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 700;
  text-transform: uppercase;

  img { width: 100%; height: 100%; object-fit: cover; }
`;

const Main = styled.div`
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
`;

const NameRow = styled.div`
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
  min-width: 0;
`;

const MobileRank = styled.span`
  display: none;
  ${media.mobile} {
    display: inline;
    font-weight: 800;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

const RepoLink = styled.a`
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  color: ${({ theme }) => theme.colors.text};
  text-decoration: none;
  word-break: break-word;

  span { color: ${({ theme }) => theme.colors.textMuted}; font-weight: 500; }
  &:hover { color: ${({ theme }) => theme.colors.primary}; text-decoration: underline; }
  &:focus-visible { outline: none; border-radius: ${({ theme }) => theme.radii.sm}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
`;

const Description = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textMuted};
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const Meta = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => `${theme.space.xs} ${theme.space.lg}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};

  span { display: inline-flex; align-items: center; gap: ${({ theme }) => theme.space.xs}; }
  strong { color: ${({ theme }) => theme.colors.text}; font-weight: 600; }
`;

const Topics = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.xs};
`;

const Topic = styled.span`
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  padding-top: ${({ theme }) => theme.space.xs};

  ${media.mobile} { grid-column: 1 / -1; }
`;

const LinkButton = styled.a`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  height: 32px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  text-decoration: none;
  transition: background ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast};

  &:hover { background: ${({ theme }) => theme.colors.surfaceHover}; border-color: ${({ theme }) => theme.colors.borderStrong}; }
  &:focus-visible { outline: none; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
`;

const PillButton = styled(Button)`
  height: 32px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const SkeletonRow = styled.li`
  height: 132px;
  border-radius: ${({ theme }) => theme.radii.lg};
  ${skeletonShimmer}
`;

const Empty = styled.div`
  padding: ${({ theme }) => `${theme.space.xxl} ${theme.space.lg}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
`;

/** `https://github.com/Owner/Repo.git/` → `github.com/owner/repo` for matching existing projects. */
const repoKey = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/+$/, '')
    .replace(/\.git$/, '');

function OwnerAvatar({ repo }: { repo: AiRepo }) {
  const [failed, setFailed] = useState(false);
  return (
    <Avatar aria-hidden>
      {repo.ownerAvatarUrl && !failed ? (
        <img src={`${repo.ownerAvatarUrl}${repo.ownerAvatarUrl.includes('?') ? '&' : '?'}s=80`} alt="" loading="lazy" onError={() => setFailed(true)} />
      ) : (
        repo.owner.charAt(0) || '?'
      )}
    </Avatar>
  );
}

function statusLine(list: AiRepoList): { text: string; warn: boolean } {
  switch (list.source) {
    case 'fallback':
      return {
        text: `GitHub is unreachable${list.notice ? ` — ${list.notice}` : ''} Showing a built-in snapshot without live star counts.`,
        warn: true,
      };
    case 'stale':
      return {
        text: `${list.notice ?? 'GitHub is unreachable.'} Showing results from ${list.fetchedAt ? formatRelative(list.fetchedAt) : 'earlier'}.`,
        warn: true,
      };
    default:
      return { text: `Live from GitHub · updated ${list.fetchedAt ? formatRelative(list.fetchedAt) : 'just now'}`, warn: false };
  }
}

interface Props {
  state: AiReposState;
  /** The user's projects, to show "Attached" / "Attach" instead of cloning a repo twice. */
  projects: Project[];
  activeProjectId: string | null;
  /** Repo URL currently being cloned (only one at a time). */
  cloningUrl: string | null;
  cloneError: NormalisedError | null;
  onDismissCloneError: () => void;
  /** Clone the repo as a project (or reuse an existing one) and attach it to the chat. */
  onAddProject: (repo: AiRepo, existing: Project | null) => void;
  onClose: () => void;
}

/** "Top AI repos": the 10 most-starred public AI projects on GitHub, by category. Esc closes. */
export function AiReposPanel({ state, projects, activeProjectId, cloningUrl, cloneError, onDismissCloneError, onAddProject, onClose }: Props) {
  const { category, categories, list, loading, error, dismissError, selectCategory, refresh } = state;
  const headingId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const projectByRepo = new Map(projects.filter((p) => p.repoUrl).map((p) => [repoKey(p.repoUrl!), p]));

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const status = list ? statusLine(list) : null;
  const showSkeleton = loading && (!list || list.category !== category);

  return (
    <Panel role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={onKeyDown}>
      <Scroll>
        <Inner>
          <TopRow>
            <RoundButton type="button" aria-label="Refresh" title="Refresh" onClick={refresh} disabled={loading}>
              {loading ? <Spinner $size={14} aria-hidden /> : <RefreshCw size={16} />}
            </RoundButton>
            <RoundButton ref={closeRef} type="button" aria-label="Close top AI repos" title="Close (Esc)" onClick={onClose}>
              <X size={18} />
            </RoundButton>
          </TopRow>

          <Hero>
            <h1 id={headingId}>
              <Headline>Top 10 AI projects on GitHub</Headline>
            </h1>
            <p>The most-starred public AI repositories. Open one on GitHub or add it as a project to chat about its code.</p>
          </Hero>

          {categories.length > 0 && (
            <Chips role="tablist" aria-label="Category">
              {categories.map((c) => (
                <Chip
                  key={c.id}
                  type="button"
                  role="tab"
                  aria-selected={category === c.id}
                  $active={category === c.id}
                  onClick={() => selectCategory(c.id)}
                >
                  {c.name}
                </Chip>
              ))}
            </Chips>
          )}

          {status && !showSkeleton && (
            <Status $warn={status.warn} aria-live="polite">
              {status.warn && <CircleAlert size={14} aria-hidden />}
              {status.text}
            </Status>
          )}

          {error && <ErrorBanner message={error.message} details={error.details} onDismiss={dismissError} />}
          {cloneError && <ErrorBanner message={cloneError.message} details={cloneError.details} onDismiss={onDismissCloneError} />}

          {showSkeleton ? (
            <List aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <SkeletonRow key={i} />
              ))}
            </List>
          ) : !list || list.items.length === 0 ? (
            !error && <Empty>No repositories found for this category.</Empty>
          ) : (
            <List aria-label={`Top ${list.items.length} AI repositories`}>
              {list.items.map((repo) => {
                const existing = projectByRepo.get(repoKey(repo.url)) ?? null;
                const attached = Boolean(existing && existing.id === activeProjectId);
                const cloning = cloningUrl === repo.url;
                return (
                  <Card key={repo.fullName}>
                    <Rank $top={repo.rank <= 3} aria-label={`Rank ${repo.rank}`}>
                      {repo.rank}
                    </Rank>
                    <OwnerAvatar repo={repo} />
                    <Main>
                      <NameRow>
                        <MobileRank>#{repo.rank}</MobileRank>
                        <RepoLink href={repo.url} target="_blank" rel="noopener noreferrer">
                          <span>{repo.owner}/</span>
                          {repo.name}
                        </RepoLink>
                      </NameRow>
                      {repo.description && <Description title={repo.description}>{repo.description}</Description>}
                      <Meta>
                        {repo.stars !== null && (
                          <span title={`${repo.stars.toLocaleString()} stars`}>
                            <Star size={13} aria-hidden /> <strong>{formatCount(repo.stars)}</strong>
                          </span>
                        )}
                        {repo.forks !== null && (
                          <span title={`${repo.forks.toLocaleString()} forks`}>
                            <GitFork size={13} aria-hidden /> {formatCount(repo.forks)}
                          </span>
                        )}
                        {repo.language && <span>{repo.language}</span>}
                        {repo.license && (
                          <span>
                            <Scale size={13} aria-hidden /> {repo.license}
                          </span>
                        )}
                        {repo.pushedAt && <span>Updated {formatRelative(repo.pushedAt)}</span>}
                      </Meta>
                      {repo.topics.length > 0 && (
                        <Topics>
                          {repo.topics.map((t) => (
                            <Topic key={t}>{t}</Topic>
                          ))}
                        </Topics>
                      )}
                      <Actions>
                        <LinkButton href={repo.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink size={14} aria-hidden /> Open on GitHub
                        </LinkButton>
                        {repo.homepage && (
                          <LinkButton href={repo.homepage} target="_blank" rel="noopener noreferrer">
                            <Globe size={14} aria-hidden /> Website
                          </LinkButton>
                        )}
                        {attached ? (
                          <PillButton type="button" $variant="subtle" disabled>
                            <Check size={14} aria-hidden /> Attached to chat
                          </PillButton>
                        ) : (
                          <PillButton
                            type="button"
                            $variant={existing ? 'ghost' : 'primary'}
                            disabled={Boolean(cloningUrl)}
                            title={existing ? 'Attach this project to the chat' : 'Shallow-clone the repo into your projects folder and attach it'}
                            onClick={() => onAddProject(repo, existing)}
                          >
                            {cloning ? <Spinner $size={14} aria-hidden /> : <FolderPlus size={14} aria-hidden />}
                            {cloning ? 'Cloning…' : existing ? 'Attach project' : 'Add as project'}
                          </PillButton>
                        )}
                      </Actions>
                    </Main>
                  </Card>
                );
              })}
            </List>
          )}
        </Inner>
      </Scroll>
    </Panel>
  );
}
