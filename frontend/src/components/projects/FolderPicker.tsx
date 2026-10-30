import { Check, ChevronRight, CornerLeftUp, Folder, FolderGit2, House, Link2, RefreshCw, Search } from 'lucide-react';
import { Fragment, useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import type { FolderListing } from '../../api/types';
import type { FolderBrowserState } from '../../hooks/useFolderBrowser';
import { skeletonShimmer } from '../../styles/animations';
import { media } from '../../styles/theme';
import { Button, IconButton, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';

const Box = styled.div`
  display: flex;
  flex-direction: column;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.bgElevated};
  overflow: hidden;
`;

const Toolbar = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => theme.space.xs};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  ${media.mobile} { flex-wrap: wrap; }
`;

const Crumbs = styled.nav`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 2px;
  overflow-x: auto;
  white-space: nowrap;
  font-size: ${({ theme }) => theme.fontSizes.sm};

  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.textSubtle}; }
`;

const Crumb = styled.button<{ $current: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.xs}`};
  border: none;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: none;
  color: ${({ theme, $current }) => ($current ? theme.colors.text : theme.colors.textMuted)};
  font-weight: ${({ $current }) => ($current ? 600 : 400)};
  font-size: inherit;
  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.surfaceHover}; color: ${({ theme }) => theme.colors.text}; }
  &:disabled { cursor: default; }
  svg { color: ${({ theme }) => theme.colors.primary}; }
`;

const Filter = styled.label`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  height: 30px;
  width: 180px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textSubtle};

  input {
    flex: 1;
    min-width: 0;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    &:focus { outline: none; }
  }
  &:focus-within { border-color: ${({ theme }) => theme.colors.primary}; }

  ${media.mobile} { width: 100%; }
`;

const RootSelect = styled.select`
  height: 30px;
  max-width: 200px;
  padding: 0 ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  option { background: ${({ theme }) => theme.colors.surface}; }
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => theme.space.xs};
  height: 280px;
  overflow-y: auto;
`;

const Row = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `0 ${theme.space.xs} 0 ${theme.space.sm}`};
  min-height: 38px;
  border-radius: ${({ theme }) => theme.radii.md};
  transition: background ${({ theme }) => theme.transitions.fast};
  ${({ $active, theme }) => $active && css`background: ${theme.colors.primarySoft};`}

  &:hover { background: ${({ theme }) => theme.colors.surfaceHover}; }
`;

const Open = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} 0`};
  border: none;
  background: none;
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;

  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  > svg:first-child { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary}; }
  .chev { margin-left: auto; flex-shrink: 0; color: ${({ theme }) => theme.colors.textSubtle}; opacity: 0; }
  &:hover .chev, &:focus-visible .chev { opacity: 1; }
`;

const Tag = styled.span<{ $tone: 'muted' | 'success' }>`
  flex-shrink: 0;
  padding: 1px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 11px;
  font-weight: 600;
  ${({ $tone, theme }) =>
    $tone === 'success'
      ? css`color: ${theme.colors.success}; background: ${theme.colors.successSoft};`
      : css`color: ${theme.colors.textMuted}; background: ${theme.colors.surfaceHover};`}
`;

const AttachButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xxs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  &:hover:not(:disabled) { border-color: ${({ theme }) => theme.colors.primary}; background: ${({ theme }) => theme.colors.primarySoft}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Placeholder = styled.li`
  height: 34px;
  margin: ${({ theme }) => `${theme.space.xxs} 0`};
  border-radius: ${({ theme }) => theme.radii.md};
  ${skeletonShimmer}
`;

const Empty = styled.li`
  padding: ${({ theme }) => theme.space.xl};
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Footer = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  code {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    direction: rtl;
    text-align: left;
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textSubtle};
  }

  ${media.mobile} { flex-direction: column; align-items: stretch; code { direction: ltr; } }
`;

const baseName = (p: string) => p.split(/[\\/]/).filter(Boolean).pop() ?? p;

/** Breadcrumb segments from the workspace root down to `listing.path`. */
function crumbsFor(listing: FolderListing): { label: string; path: string }[] {
  const sep = listing.root.includes('\\') ? '\\' : '/';
  const rest = listing.path.slice(listing.root.length).split(/[\\/]/).filter(Boolean);
  const crumbs = [{ label: baseName(listing.root), path: listing.root }];
  rest.forEach((part, i) => {
    crumbs.push({ label: part, path: `${listing.root.replace(/[\\/]+$/, '')}${sep}${rest.slice(0, i + 1).join(sep)}` });
  });
  return crumbs;
}

interface Props {
  browser: FolderBrowserState;
  /** Project currently attached to the chat. */
  activeId: string | null;
  /** True while a project is being added (disables the buttons). */
  busy: boolean;
  /** Attach a folder: `projectId` is set when it is already one of the user's projects. */
  onPick: (folderPath: string, projectId: string | null) => void;
}

/**
 * Browses the server's workspace folders (WORKSPACE_ROOTS) — click a folder to open it, "Attach" to use it
 * as the project. The browser can't hand a real folder path to a web page, so the picker lists folders on the API side.
 */
export function FolderPicker({ browser, activeId, busy, onPick }: Props) {
  const { listing, loading, error } = browser;
  const [filter, setFilter] = useState('');
  const crumbs = useMemo(() => (listing ? crumbsFor(listing) : []), [listing]);
  const entries = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (listing?.entries ?? []).filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [listing, filter]);

  const navigate = (target: string) => {
    setFilter('');
    void browser.open(target);
  };

  const attachLabel = (projectId: string | null) => (projectId && projectId === activeId ? 'Attached' : 'Attach');

  return (
    <Box>
      <Toolbar>
        <IconButton
          type="button"
          aria-label="Up one folder"
          title="Up one folder"
          disabled={!listing?.parent || loading}
          onClick={() => listing?.parent && navigate(listing.parent)}
        >
          <CornerLeftUp size={15} />
        </IconButton>
        {listing && listing.roots.length > 1 && (
          <RootSelect aria-label="Workspace folder" value={listing.root} onChange={(e) => navigate(e.target.value)}>
            {listing.roots.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </RootSelect>
        )}
        <Crumbs aria-label="Current folder">
          {crumbs.map((c, i) => (
            <Fragment key={c.path}>
              {i > 0 && <ChevronRight size={13} aria-hidden />}
              <Crumb type="button" $current={i === crumbs.length - 1} disabled={i === crumbs.length - 1} onClick={() => navigate(c.path)} title={c.path}>
                {i === 0 && <House size={13} aria-hidden />}
                {c.label}
              </Crumb>
            </Fragment>
          ))}
        </Crumbs>
        {loading && listing && <Spinner $size={13} aria-label="Loading" />}
        <IconButton type="button" aria-label="Refresh" title="Refresh" disabled={loading} onClick={() => void browser.refresh()}>
          <RefreshCw size={14} />
        </IconButton>
        <Filter>
          <Search size={13} aria-hidden />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter folders" aria-label="Filter folders" />
        </Filter>
      </Toolbar>

      {error && <ErrorBanner message={error.message} details={error.details} onDismiss={browser.dismissError} />}

      <List aria-label="Folders" aria-busy={loading}>
        {!listing && loading ? (
          Array.from({ length: 5 }, (_, i) => <Placeholder key={i} aria-hidden />)
        ) : entries.length === 0 ? (
          <Empty>{filter ? 'No folders match.' : 'No sub-folders here.'}</Empty>
        ) : (
          entries.map((entry) => {
            const Icon = entry.isGitRepo ? FolderGit2 : Folder;
            const attached = entry.projectId !== null && entry.projectId === activeId;
            return (
              <Row key={entry.path} $active={attached}>
                <Open type="button" onClick={() => navigate(entry.path)} title={`Open ${entry.path}`}>
                  <Icon size={17} aria-hidden />
                  <span className="name">{entry.name}</span>
                  <ChevronRight size={14} className="chev" aria-hidden />
                </Open>
                {entry.isGitRepo && <Tag $tone="muted">git</Tag>}
                {entry.projectId && !attached && <Tag $tone="muted">In projects</Tag>}
                <AttachButton
                  type="button"
                  disabled={busy || attached}
                  onClick={() => onPick(entry.path, entry.projectId)}
                  aria-label={`${attachLabel(entry.projectId)} ${entry.name}`}
                >
                  {attached ? <Check size={12} /> : <Link2 size={12} />} {attachLabel(entry.projectId)}
                </AttachButton>
              </Row>
            );
          })
        )}
        {listing?.truncated && <Empty>Only the first {listing.entries.length} folders are shown — use the filter or open a sub-folder.</Empty>}
      </List>

      {listing && (
        <Footer>
          <code title={listing.path}>{listing.path}</code>
          <Button
            type="button"
            $size="sm"
            $variant="ghost"
            disabled={busy || (listing.projectId !== null && listing.projectId === activeId)}
            onClick={() => onPick(listing.path, listing.projectId)}
          >
            <Link2 size={14} /> {listing.projectId === activeId && listing.projectId ? 'Attached' : 'Attach this folder'}
          </Button>
        </Footer>
      )}
    </Box>
  );
}
