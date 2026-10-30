import { ArrowUpRight, Heart, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import styled, { css } from 'styled-components';
import type { LibraryPrompt, PromptCategory } from '../../api/types';
import { messageEnter } from '../../styles/animations';
import { PromptCategoryIcon } from './PromptCategoryIcon';

const Card = styled.article`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
  min-height: 220px;
  padding: ${({ theme }) => theme.space.xl};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
  transition: border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base},
    transform ${({ theme }) => theme.transitions.base};
  animation: ${messageEnter} 260ms ease both;

  &:hover,
  &:focus-within {
    border-color: ${({ theme }) => theme.colors.borderStrong};
    box-shadow: ${({ theme }) => theme.shadows.md};
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &:hover, &:focus-within { transform: none; }
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
`;

const CategoryLabel = styled.span`
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

/** The whole card body is the "use" button; the stretched ::after makes the card clickable. */
const UseArea = styled.button`
  all: unset;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.sm};
  flex: 1;
  min-width: 0;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }
  &:focus-visible::after {
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
`;

const Title = styled.h3`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  line-height: 1.3;
  color: ${({ theme }) => theme.colors.text};
`;

const Body = styled.p`
  margin: 0;
  font-size: ${({ theme }) => theme.fontSizes.sm};
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.textMuted};
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
`;

const Foot = styled.div`
  position: relative; /* above the stretched click area */
  z-index: 1;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding-top: ${({ theme }) => theme.space.sm};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
`;

const Author = styled.span`
  flex: 1;
  min-width: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Action = styled.button<{ $active?: boolean; $danger?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xxs};
  height: 30px;
  min-width: 30px;
  justify-content: center;
  padding: 0 ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid transparent;
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme, $danger }) => ($danger ? theme.colors.danger : theme.colors.text)};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      color: ${theme.colors.danger};
      svg { fill: currentColor; }
      &:hover:not(:disabled) { color: ${theme.colors.danger}; }
    `}

  ${({ $danger, theme }) =>
    $danger &&
    css`
      color: ${theme.colors.danger};
      background: ${theme.colors.dangerSoft};
    `}
`;

interface Props {
  prompt: LibraryPrompt;
  category?: PromptCategory;
  onUse: (prompt: LibraryPrompt) => void;
  onToggleFavorite: (prompt: LibraryPrompt) => void;
  onEdit: (prompt: LibraryPrompt) => void;
  onDelete: (prompt: LibraryPrompt) => void;
}

/** One prompt in the library grid. Click anywhere on it to put it in the composer. */
export function PromptCard({ prompt, category, onUse, onToggleFavorite, onEdit, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const author = prompt.isOwner ? 'You' : prompt.authorName;

  return (
    <Card>
      <Head>
        <PromptCategoryIcon name={category?.icon} />
        <CategoryLabel>{category?.name ?? prompt.category}</CategoryLabel>
      </Head>

      <UseArea type="button" onClick={() => onUse(prompt)} aria-label={`Use prompt: ${prompt.title}`}>
        <Title>{prompt.title}</Title>
        <Body>{prompt.content}</Body>
      </UseArea>

      <Foot>
        {confirming ? (
          <>
            <Author>Delete this prompt for everyone?</Author>
            <Action type="button" onClick={() => setConfirming(false)}>
              Cancel
            </Action>
            <Action
              type="button"
              $danger
              onClick={() => {
                setConfirming(false);
                onDelete(prompt);
              }}
            >
              Delete
            </Action>
          </>
        ) : (
          <>
            <Author title={prompt.isBuiltIn ? 'Built-in prompt' : `Shared by ${author}`}>by {author}</Author>
            <Action
              type="button"
              $active={prompt.isFavorite}
              aria-pressed={prompt.isFavorite}
              aria-label={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              title={prompt.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              onClick={() => onToggleFavorite(prompt)}
            >
              <Heart size={14} aria-hidden />
              {prompt.favoriteCount > 0 && <span>{prompt.favoriteCount}</span>}
            </Action>
            {prompt.isOwner && (
              <>
                <Action type="button" aria-label="Edit prompt" title="Edit" onClick={() => onEdit(prompt)}>
                  <Pencil size={14} aria-hidden />
                </Action>
                <Action type="button" aria-label="Delete prompt" title="Delete" onClick={() => setConfirming(true)}>
                  <Trash2 size={14} aria-hidden />
                </Action>
              </>
            )}
            <Action type="button" title="Use this prompt" onClick={() => onUse(prompt)}>
              Use <ArrowUpRight size={14} aria-hidden />
            </Action>
          </>
        )}
      </Foot>
    </Card>
  );
}
