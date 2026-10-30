import { AlertTriangle, Check, ChevronDown, ChevronRight, FileDiff, Undo2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import styled, { css } from 'styled-components';
import type { ProjectChange, ProjectChangeAction, ProjectChangeStatus } from '../../api/types';
import { useProjectChanges } from '../../hooks/useProjectChanges';
import { messageEnter } from '../../styles/animations';
import { Button, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { DiffView } from './DiffView';

const Card = styled.section`
  margin-top: ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
  overflow: hidden;
  animation: ${messageEnter} ${({ theme }) => theme.transitions.slow} both;
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  h3 {
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: ${({ theme }) => theme.space.sm};
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: 600;
    svg { color: ${({ theme }) => theme.colors.primary}; }
  }
  small {
    color: ${({ theme }) => theme.colors.textSubtle};
    font-size: ${({ theme }) => theme.fontSizes.xs};
  }
`;

const HeaderActions = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.space.xs};
  margin-left: auto;
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled.li`
  & + & { border-top: 1px solid ${({ theme }) => theme.colors.border}; }
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.xs} ${theme.space.md}`};
  min-height: 38px;
`;

const Checkbox = styled.input`
  width: 15px;
  height: 15px;
  accent-color: ${({ theme }) => theme.colors.primary};
  flex-shrink: 0;
`;

const actionColor = (action: ProjectChangeAction) =>
  action === 'create' ? 'success' : action === 'delete' ? 'danger' : 'primary';

const ActionBadge = styled.span<{ $action: ProjectChangeAction }>`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 11px;
  font-weight: 700;
  font-family: ${({ theme }) => theme.fonts.mono};
  ${({ $action, theme }) => {
    const key = actionColor($action);
    return css`
      color: ${theme.colors[key]};
      background: ${key === 'primary' ? theme.colors.primarySoft : key === 'success' ? theme.colors.successSoft : theme.colors.dangerSoft};
    `;
  }}
`;

const PathButton = styled.button<{ $muted: boolean }>`
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: 0;
  border: none;
  background: none;
  color: ${({ theme, $muted }) => ($muted ? theme.colors.textSubtle : theme.colors.text)};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  text-align: left;
  text-decoration: ${({ $muted }) => ($muted ? 'line-through' : 'none')};

  span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.textSubtle}; }
  &:hover span { text-decoration: underline; }
`;

const StatusChip = styled.span<{ $status: ProjectChangeStatus }>`
  flex-shrink: 0;
  padding: 1px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  ${({ $status, theme }) =>
    $status === 'applied'
      ? css`color: ${theme.colors.success}; background: ${theme.colors.successSoft};`
      : $status === 'discarded'
        ? css`color: ${theme.colors.textSubtle}; background: ${theme.colors.surfaceHover};`
        : css`color: ${theme.colors.primary}; background: ${theme.colors.primarySoft};`}
`;

const SmallButton = styled.button`
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xxs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.text}; background: ${({ theme }) => theme.colors.surfaceHover}; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const Notice = styled.div<{ $tone: 'warning' | 'muted' }>`
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $tone }) => ($tone === 'warning' ? theme.colors.warning : theme.colors.textMuted)};

  svg { flex-shrink: 0; margin-top: 1px; }
  ul { margin: 0; padding-left: ${({ theme }) => theme.space.lg}; }
  code { font-family: ${({ theme }) => theme.fonts.mono}; }
`;

const NoticeBody = styled.div`
  flex: 1;
  min-width: 200px;
`;

const NoticeActions = styled.div`
  display: inline-flex;
  gap: ${({ theme }) => theme.space.xs};
`;

const Loading = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const ErrorSlot = styled.div`
  padding: ${({ theme }) => theme.space.sm};
`;

const ACTION_LETTER: Record<ProjectChangeAction, string> = { create: 'A', modify: 'M', delete: 'D' };
const ACTION_LABEL: Record<ProjectChangeAction, string> = { create: 'New file', modify: 'Modified', delete: 'Deleted' };
const STATUS_LABEL: Record<ProjectChangeStatus, string> = { pending: 'Pending', applied: 'Applied', discarded: 'Discarded' };

/**
 * Review card under an assistant reply that proposed file edits: pick files, expand diffs,
 * apply / discard, and revert applied files. Nothing is written until the user clicks Apply.
 */
export function ProjectChanges({ changes: initial }: { changes: ProjectChange[] }) {
  const review = useProjectChanges(initial);
  const { changes, selected, details, loadingIds, busy, conflicts } = review;
  const [expanded, setExpanded] = useState<Set<string>>(() => (initial.length === 1 ? new Set([initial[0].id]) : new Set()));

  // Load diffs for expanded rows (and reload after apply/revert dropped the cached copy).
  useEffect(() => {
    expanded.forEach((id) => {
      if (!details[id] && !loadingIds.has(id)) void review.loadDetail(id);
    });
  }, [expanded, details]);

  const toggleExpanded = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const pending = changes.filter((c) => c.status === 'pending');
  const applied = changes.filter((c) => c.status === 'applied');
  const selectedPending = pending.filter((c) => selected.has(c.id)).map((c) => c.id);
  const working = busy !== null;

  return (
    <Card aria-label="Proposed file changes">
      <Header>
        <h3>
          <FileDiff size={15} aria-hidden /> Proposed changes
        </h3>
        <small>
          {changes.length} file{changes.length === 1 ? '' : 's'}
          {applied.length > 0 && ` · ${applied.length} applied`}
        </small>
        <HeaderActions>
          {pending.length > 0 && (
            <>
              <Button type="button" $size="sm" $variant="ghost" disabled={working || selectedPending.length === 0} onClick={() => void review.discard(selectedPending)}>
                {busy === 'discard' ? <Spinner $size={12} /> : <X size={13} />} Discard
              </Button>
              <Button type="button" $size="sm" disabled={working || selectedPending.length === 0} onClick={() => void review.apply(selectedPending)}>
                {busy === 'apply' ? <Spinner $size={12} /> : <Check size={13} />}
                Apply {selectedPending.length === pending.length ? 'all' : `${selectedPending.length}`}
              </Button>
            </>
          )}
          {pending.length === 0 && applied.length > 0 && (
            <Button type="button" $size="sm" $variant="ghost" disabled={working} onClick={() => void review.revert(applied.map((c) => c.id))}>
              {busy === 'revert' ? <Spinner $size={12} /> : <Undo2 size={13} />} Revert all
            </Button>
          )}
        </HeaderActions>
      </Header>

      <List>
        {changes.map((change) => {
          const open = expanded.has(change.id);
          const detail = details[change.id];
          return (
            <Item key={change.id}>
              <Row>
                <Checkbox
                  type="checkbox"
                  aria-label={`Select ${change.path}`}
                  checked={change.status === 'pending' && selected.has(change.id)}
                  disabled={change.status !== 'pending' || working}
                  onChange={() => review.toggle(change.id)}
                />
                <ActionBadge $action={change.action} title={ACTION_LABEL[change.action]}>
                  {ACTION_LETTER[change.action]}
                </ActionBadge>
                <PathButton
                  type="button"
                  $muted={change.status === 'discarded'}
                  aria-expanded={open}
                  title={open ? 'Hide diff' : 'Show diff'}
                  onClick={() => toggleExpanded(change.id)}
                >
                  {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span>{change.path}</span>
                </PathButton>
                <StatusChip $status={change.status}>{STATUS_LABEL[change.status]}</StatusChip>
                {change.status === 'applied' && (
                  <SmallButton type="button" disabled={working} onClick={() => void review.revert([change.id])} title="Restore the previous version">
                    <Undo2 size={12} /> Revert
                  </SmallButton>
                )}
              </Row>
              {open &&
                (detail ? (
                  <>
                    {detail.diskState === 'changed' && detail.status !== 'discarded' && (
                      <Notice $tone="warning">
                        <AlertTriangle size={14} aria-hidden />
                        <NoticeBody>
                          {detail.status === 'applied'
                            ? 'This file was edited after the change was applied.'
                            : 'This file changed on disk since the edit was proposed — the diff is against the version the model saw.'}
                        </NoticeBody>
                      </Notice>
                    )}
                    {detail.diskState === 'unavailable' && (
                      <Notice $tone="muted">
                        <AlertTriangle size={14} aria-hidden />
                        <NoticeBody>The project folder or file can’t be read right now.</NoticeBody>
                      </Notice>
                    )}
                    <DiffView original={detail.originalContent} next={detail.newContent} />
                  </>
                ) : (
                  <Loading>
                    <Spinner $size={12} /> Loading diff…
                  </Loading>
                ))}
            </Item>
          );
        })}
      </List>

      {conflicts && (
        <Notice $tone="warning" role="alert">
          <AlertTriangle size={14} aria-hidden />
          <NoticeBody>
            {conflicts.operation === 'apply' ? 'Not applied' : 'Not reverted'}:
            <ul>
              {conflicts.items.map((c) => (
                <li key={c.id}>
                  <code>{c.path}</code> — {c.reason}
                </li>
              ))}
            </ul>
          </NoticeBody>
          <NoticeActions>
            <SmallButton type="button" onClick={review.dismissConflicts}>
              Keep my version
            </SmallButton>
            <SmallButton
              type="button"
              disabled={working}
              onClick={() => {
                const ids = conflicts.items.map((c) => c.id);
                void (conflicts.operation === 'apply' ? review.apply(ids, true) : review.revert(ids, true));
              }}
            >
              Overwrite anyway
            </SmallButton>
          </NoticeActions>
        </Notice>
      )}

      {review.error && (
        <ErrorSlot>
          <ErrorBanner message={review.error.message} details={review.error.details} onDismiss={review.dismissError} />
        </ErrorSlot>
      )}
    </Card>
  );
}
