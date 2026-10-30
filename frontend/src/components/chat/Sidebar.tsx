import { LogOut, MessageSquare, Moon, PanelLeftClose, PanelLeftOpen, Plus, Sun, Trash2 } from 'lucide-react';
import { useMemo } from 'react';
import styled, { css, type RuleSet } from 'styled-components';
import type { ConversationSummary, LLMProvider, ProviderInfo } from '../../api/types';
import { appEnv } from '../../config/env';
import { useThemeMode } from '../../context/ThemeModeContext';
import { gradientText, slideInLeft } from '../../styles/animations';
import { media } from '../../styles/theme';
import { relativeBucket } from '../../utils/format';
import { Button, IconButton } from '../common/Button';
import { ProviderSelect } from './ProviderSelect';
import { ConversationsSkeleton } from './SkeletonLoader';

/** Styles applied only on desktop while the sidebar is collapsed (mobile always uses the full drawer). */
const whenCollapsed = (collapsed: boolean, rules: RuleSet<object>) =>
  collapsed &&
  css`
    ${media.desktop} {
      ${rules}
    }
  `;

const Aside = styled.aside<{ $open: boolean; $collapsed: boolean }>`
  width: ${({ theme, $collapsed }) => ($collapsed ? theme.layout.sidebarCollapsedWidth : theme.layout.sidebarWidth)};
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.panel};
  backdrop-filter: blur(12px);
  border-right: 1px solid ${({ theme }) => theme.colors.border};
  transition: transform ${({ theme }) => theme.transitions.slow}, width ${({ theme }) => theme.transitions.slow};

  ${media.mobile} {
    position: fixed;
    inset: 0 auto 0 0;
    width: ${({ theme }) => theme.layout.sidebarWidth};
    z-index: ${({ theme }) => theme.zIndex.sidebar};
    background: ${({ theme }) => theme.colors.bgElevated};
    box-shadow: ${({ theme }) => theme.shadows.lg};
    transform: translateX(${({ $open }) => ($open ? '0' : '-105%')});
  }
`;

const Top = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.lg};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};

  ${({ $collapsed, theme }) =>
    whenCollapsed(
      $collapsed,
      css`
        align-items: center;
        padding: ${theme.space.lg} ${theme.space.sm};
      `,
    )}
`;

const BrandRow = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  min-height: 30px;

  ${({ $collapsed, theme }) =>
    whenCollapsed(
      $collapsed,
      css`
        flex-direction: column;
        justify-content: center;
        gap: ${theme.space.md};
      `,
    )}
`;

/** The app logo — visible in both the expanded sidebar and the collapsed icon rail. */
const Logo = styled.img<{ $collapsed: boolean }>`
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: block;
  border-radius: ${({ theme }) => theme.radii.sm};
  box-shadow: ${({ theme }) => theme.shadows.glow};
  user-select: none;
  transition: width ${({ theme }) => theme.transitions.slow}, height ${({ theme }) => theme.transitions.slow};

  ${({ $collapsed }) =>
    whenCollapsed(
      $collapsed,
      css`
        width: 36px;
        height: 36px;
      `,
    )}
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  min-width: 0;
  font-weight: 700;
  font-size: ${({ theme }) => theme.fontSizes.lg};
  letter-spacing: 0.02em;
  white-space: nowrap;
`;

/** App name with the same flowing gradient as the welcome headline (`EmptyState`). */
const BrandName = styled.span<{ $collapsed: boolean }>`
  overflow: hidden;
  text-overflow: ellipsis;
  ${gradientText('6s')}

  ${({ $collapsed }) =>
    whenCollapsed(
      $collapsed,
      css`
        display: none;
      `,
    )}
`;

const CollapseBtn = styled(IconButton)`
  ${media.mobile} {
    display: none;
  }
`;

const NewChatButton = styled(Button)<{ $collapsed: boolean }>`
  white-space: nowrap;
  ${({ $collapsed, theme }) =>
    whenCollapsed(
      $collapsed,
      css`
        width: auto;
        padding: ${theme.space.md};
        .label {
          display: none;
        }
      `,
    )}
`;

const ProviderWrap = styled.div<{ $collapsed: boolean }>`
  ${({ $collapsed }) =>
    whenCollapsed(
      $collapsed,
      css`
        display: none;
      `,
    )}
`;

const List = styled.nav<{ $collapsed: boolean }>`
  flex: 1;
  overflow-y: auto;
  padding: ${({ theme }) => theme.space.sm};

  ${({ $collapsed }) =>
    whenCollapsed(
      $collapsed,
      css`
        visibility: hidden;
      `,
    )}
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
      svg { color: ${theme.colors.primary}; }
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 8px;
        bottom: 8px;
        width: 3px;
        border-radius: 3px;
        background: ${theme.colors.primary};
        box-shadow: ${theme.shadows.glow};
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

const Bottom = styled.div<{ $collapsed: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.md} ${({ theme }) => theme.space.lg};
  border-top: 1px solid ${({ theme }) => theme.colors.border};

  ${({ $collapsed, theme }) =>
    whenCollapsed(
      $collapsed,
      css`
        flex-direction: column;
        padding: ${theme.space.md} ${theme.space.sm};
      `,
    )}
`;

const Email = styled.div<{ $collapsed: boolean }>`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  ${({ $collapsed }) =>
    whenCollapsed(
      $collapsed,
      css`
        display: none;
      `,
    )}
`;

interface Props {
  open: boolean;
  /** Desktop-only: shrink the sidebar to an icon rail. Ignored on mobile (drawer). */
  collapsed: boolean;
  onToggleCollapse: () => void;
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
  const { collapsed } = props;

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
    <Aside $open={props.open} $collapsed={collapsed} aria-label="Conversations">
      <Top $collapsed={collapsed}>
        <BrandRow $collapsed={collapsed}>
          <Brand title={appEnv.appName}>
            <Logo $collapsed={collapsed} src={appEnv.logoUrl} alt={`${appEnv.appName} logo`} draggable={false} />
            <BrandName $collapsed={collapsed}>{appEnv.appName}</BrandName>
          </Brand>
          <CollapseBtn
            type="button"
            onClick={props.onToggleCollapse}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </CollapseBtn>
        </BrandRow>
        <NewChatButton $block $collapsed={collapsed} onClick={props.onNewChat} title="New chat" aria-label="New chat">
          <Plus size={16} /> <span className="label">New chat</span>
        </NewChatButton>
        <ProviderWrap $collapsed={collapsed}>
          <ProviderSelect providers={props.providers} value={props.provider} onChange={props.onProviderChange} disabled={props.sending} />
        </ProviderWrap>
      </Top>

      <List $collapsed={collapsed}>
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

      <Bottom $collapsed={collapsed}>
        <Email $collapsed={collapsed} title={props.userEmail}>{props.userEmail}</Email>
        <IconButton type="button" onClick={toggle} aria-label="Toggle dark/light mode" title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
          {mode === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </IconButton>
        <IconButton type="button" onClick={props.onLogout} aria-label="Log out" title="Log out">
          <LogOut size={16} />
        </IconButton>
      </Bottom>
    </Aside>
  );
}
