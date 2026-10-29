import { LogOut, MessageSquare, Moon, Plus, Sun, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { ConversationSummary, LLMProvider, ProviderInfo } from '../../api/types';
import { useThemeMode } from '../../context/ThemeModeContext';
import { slideInLeft } from '../../styles/animations';
import { media } from '../../styles/theme';
import { relativeBucket } from '../../utils/format';
import { Button, IconButton } from '../common/Button';
import { ProviderSelect } from './ProviderSelect';
import { ConversationsSkeleton } from './SkeletonLoader';

const Aside = styled.aside<{ $open: boolean }>`
  width: ${({ theme }) => theme.layout.sidebarWidth};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  background: ${({ theme }) => theme.colors.bgElevated};
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  transition: transform ${({ theme }) => theme.transitions.slow};

  ${media.mobile} {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: ${({ theme }) => theme.zIndex.sidebar};
    box-shadow: ${({ theme }) => theme.shadows.lg};
    transform: translateX(${({ $open }) => ($open ? '0' : '-105%')});
  }
`;

const Top = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  letter-spacing: -0.01em;

  span.dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
  }
`;

const List = styled.nav`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space.sm};
`;

const Group = styled.div`
  margin-bottom: ${({ theme }) => theme.space.md};
`;

const GroupTitle = styled.div`
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md} ${theme.space.xs}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const Item = styled.div<{ $active: boolean; $index: number }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.textMuted};
  animation: ${slideInLeft} 260ms ease both;
  animation-delay: ${({ $index }) => Math.min($index, 12) * 25}ms;
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};

  &:hover { background: ${({ theme }) => theme.colors.surfaceHover}; color: ${({ theme }) => theme.colors.text}; }
  &:hover .delete { opacity: 1; }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.primarySoft};
      color: ${theme.colors.text};
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 3px;
        border-radius: 3px;
        background: ${theme.colors.primary};
      }
    `}

  svg { flex-shrink: 0; }
`;

const ItemText = styled.div`
  flex: 1;
  min-width: 0;
  .title {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .preview {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textSubtle};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const DeleteBtn = styled(IconButton)`
  opacity: 0;
  height: 26px;
  min-width: 26px;
  padding: 0;
  &:hover:not(:disabled) { color: ${({ theme }) => theme.colors.danger}; }
  ${media.mobile} { opacity: 1; }
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.space.xl} ${({ theme }) => theme.space.lg};
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const Bottom = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Email = styled.div`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

interface Props {
  open: boolean;
  conversations: ConversationSummary[];
  loading: boolean;
  activeId: string | null;
  providers: ProviderInfo[];
  provider: LLMProvider;
  sending: boolean;
  userEmail?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onProviderChange: (p: LLMProvider) => void;
  onLogout: () => void;
}

export function Sidebar(props: Props) {
  const { mode, toggle } = useThemeMode();

  const groups = useMemo(() => {
    const map = new Map<string, ConversationSummary[]>();
    props.conversations.forEach((c) => {
      const key = relativeBucket(c.updatedAt);
      map.set(key, [...(map.get(key) ?? []), c]);
    });
    return [...map.entries()];
  }, [props.conversations]);

  let index = 0;

  return (
    <Aside $open={props.open} aria-label="Conversations">
      <Top>
        <Brand>
          <span className="dot" /> AI Chat
        </Brand>
        <Button $block onClick={props.onNewChat}>
          <Plus size={16} /> New chat
        </Button>
        <ProviderSelect providers={props.providers} value={props.provider} onChange={props.onProviderChange} disabled={props.sending} />
      </Top>

      <List>
        {props.loading ? (
          <ConversationsSkeleton />
        ) : props.conversations.length === 0 ? (
          <Empty>No conversations yet.<br />Start one with your first prompt.</Empty>
        ) : (
          groups.map(([label, items]) => (
            <Group key={label}>
              <GroupTitle>{label}</GroupTitle>
              {items.map((c) => (
                <Item
                  key={c.id}
                  $active={c.id === props.activeId}
                  $index={index++}
                  role="button"
                  tabIndex={0}
                  onClick={() => props.onSelect(c.id)}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && props.onSelect(c.id)}
                  aria-current={c.id === props.activeId ? 'page' : undefined}
                >
                  <MessageSquare size={15} />
                  <ItemText>
                    <div className="title" title={c.title}>{c.title}</div>
                    {c.lastMessagePreview && <div className="preview">{c.lastMessagePreview}</div>}
                  </ItemText>
                  <DeleteBtn
                    className="delete"
                    type="button"
                    aria-label={`Delete conversation ${c.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this conversation? This cannot be undone.')) props.onDelete(c.id);
                    }}
                  >
                    <Trash2 size={14} />
                  </DeleteBtn>
                </Item>
              ))}
            </Group>
          ))
        )}
      </List>

      <Bottom>
        <Email title={props.userEmail}>{props.userEmail}</Email>
        <IconButton type="button" onClick={toggle} aria-label="Toggle theme" title="Toggle theme">
          {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <IconButton type="button" onClick={props.onLogout} aria-label="Log out" title="Log out">
          <LogOut size={16} />
        </IconButton>
      </Bottom>
    </Aside>
  );
}
