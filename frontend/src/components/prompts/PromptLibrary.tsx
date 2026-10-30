import { Plus, Search, X } from 'lucide-react';
import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { LibraryPrompt, PromptScope } from '../../api/types';
import { appEnv } from '../../config/env';
import type { usePromptLibrary } from '../../hooks/usePromptLibrary';
import { fadeIn, flowingBorder, gradientText, skeletonShimmer } from '../../styles/animations';
import { media } from '../../styles/theme';
import { Button, IconButton, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';
import { PromptCard } from './PromptCard';
import { PromptEditor } from './PromptEditor';

/** Covers the chat area (desktop) or the whole screen (mobile). The editor dialog is layered inside it. */
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
  max-width: 1200px;
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
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
`;

const CloseButton = styled(IconButton)`
  height: 38px;
  min-width: 38px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border-color: ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.panel};
`;

const AddButton = styled(Button)`
  border-radius: ${({ theme }) => theme.radii.pill};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.lg}`};
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

/** Same flowing gradient border as the composer (`PromptInput`): animated ring, brighter + focus ring on focus. */
const SearchBox = styled.label`
  position: relative;
  width: min(640px, 100%);
  margin: ${({ theme }) => theme.space.md} auto 0;
  height: 48px;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: 0 ${({ theme }) => theme.space.sm} 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1.5px solid transparent;
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: box-shadow ${({ theme }) => theme.transitions.fast};
  ${flowingBorder('1.5px')}

  &:focus-within {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.focusRing}, ${({ theme }) => theme.shadows.md};
  }
  &:focus-within::before { opacity: 1; }

  input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: none;
    background: transparent;
    color: ${({ theme }) => theme.colors.text};
    font-size: ${({ theme }) => theme.fontSizes.md};
    &:focus { outline: none; }
    &::placeholder { color: ${({ theme }) => theme.colors.textSubtle}; }
    &::-webkit-search-cancel-button { display: none; }
  }
`;

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.md};
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  overflow-x: auto;
  padding-bottom: ${({ theme }) => theme.space.xxs};
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

const Chip = styled.button<{ $active: boolean; $strong?: boolean }>`
  flex-shrink: 0;
  height: 34px;
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: transparent;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $strong }) => ($strong ? 600 : 500)};
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

const Divider = styled.span`
  flex-shrink: 0;
  width: 1px;
  height: 20px;
  background: ${({ theme }) => theme.colors.border};
`;

const SectionTitle = styled.h2`
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.lg};

  small {
    font-size: ${({ theme }) => theme.fontSizes.sm};
    font-weight: 500;
    color: ${({ theme }) => theme.colors.textSubtle};
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: ${({ theme }) => theme.space.lg};

  ${media.mobile} { grid-template-columns: 1fr; }
`;

const SkeletonCard = styled.div`
  height: 220px;
  border-radius: ${({ theme }) => theme.radii.lg};
  ${skeletonShimmer}
`;

const Empty = styled.div`
  padding: ${({ theme }) => `${theme.space.xxl} ${theme.space.lg}`};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  line-height: 1.6;

  strong { display: block; color: ${({ theme }) => theme.colors.text}; margin-bottom: ${({ theme }) => theme.space.xs}; }
`;

type Library = ReturnType<typeof usePromptLibrary>;

const SCOPES: { id: PromptScope; label: string }[] = [
  { id: 'all', label: 'All prompts' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'built-in', label: `Created by ${appEnv.appName}` },
  { id: 'mine', label: 'My prompts' },
];

const EMPTY_COPY: Record<PromptScope, { title: string; body: string }> = {
  all: { title: 'No prompts yet', body: 'Be the first to add one — every user will see it here.' },
  favorites: { title: "You haven't added any favorites yet", body: 'Tap the heart on a prompt to add it to your favorites.' },
  'built-in': { title: 'No built-in prompts', body: 'Built-in prompts are configured by the operator.' },
  mine: { title: "You haven't shared a prompt yet", body: 'Use "Add prompt" to save one for yourself and everyone else.' },
};

interface Props {
  library: Library;
  onClose: () => void;
  /** Put a prompt in the composer (it is not sent). */
  onUse: (prompt: LibraryPrompt) => void;
}

/**
 * "Explore Prompt Library": shared prompts every user can search, favourite, use and add to.
 * Only the author can edit or delete their prompts. Esc closes (the editor first, if open).
 */
export function PromptLibrary({ library, onClose, onUse }: Props) {
  const {
    categories,
    prompts,
    total,
    search,
    setSearch,
    searching,
    scope,
    setScope,
    category,
    setCategory,
    loading,
    error,
    dismissError,
    toggleFavorite,
    save,
    remove,
  } = library;
  const [editor, setEditor] = useState<{ prompt?: LibraryPrompt } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const headingId = useId();
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !editor) {
      e.preventDefault();
      if (search) setSearch('');
      else onClose();
    }
  };

  const filtered = Boolean(search.trim() || category);
  const heading = search.trim() ? 'Search results' : (SCOPES.find((s) => s.id === scope)?.label ?? 'Prompts');
  const empty = filtered
    ? { title: 'No prompts match', body: 'Try a different search or category.' }
    : EMPTY_COPY[scope];

  return (
    <Panel role="dialog" aria-modal="true" aria-labelledby={headingId} onKeyDown={onKeyDown}>
      <Scroll>
        <Inner>
          <TopRow>
            <AddButton type="button" onClick={() => setEditor({})}>
              <Plus size={16} aria-hidden /> Add prompt
            </AddButton>
            <CloseButton type="button" aria-label="Close prompt library" title="Close (Esc)" onClick={onClose}>
              <X size={18} />
            </CloseButton>
          </TopRow>

          <Hero>
            <h1 id={headingId}>
              <Headline>Explore Prompt Library</Headline>
            </h1>
            <p>Discover and create custom prompts designed for reusability.</p>
            <SearchBox>
              <Search size={18} aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={search}
                placeholder="Search prompts"
                aria-label="Search prompts"
                onChange={(e) => setSearch(e.target.value)}
              />
              {(searching || (loading && Boolean(search))) && <Spinner $size={14} aria-hidden />}
              {search && (
                <IconButton type="button" aria-label="Clear search" onClick={() => setSearch('')}>
                  <X size={16} />
                </IconButton>
              )}
            </SearchBox>
          </Hero>

          <Toolbar>
            <Row role="tablist" aria-label="Show">
              {SCOPES.map((s) => (
                <Chip
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === s.id}
                  $active={scope === s.id}
                  $strong
                  onClick={() => setScope(s.id)}
                >
                  {s.label}
                </Chip>
              ))}
            </Row>
            {categories.length > 0 && (
              <Row aria-label="Category">
                <Chip type="button" aria-pressed={category === null} $active={category === null} onClick={() => setCategory(null)}>
                  All categories
                </Chip>
                <Divider />
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    type="button"
                    aria-pressed={category === c.id}
                    $active={category === c.id}
                    onClick={() => setCategory(category === c.id ? null : c.id)}
                  >
                    {c.name}
                  </Chip>
                ))}
              </Row>
            )}
          </Toolbar>

          {error && <ErrorBanner message={error.message} details={error.details} onDismiss={dismissError} />}

          <SectionTitle aria-live="polite">
            {heading}
            {!loading && <small>{total === 1 ? '1 prompt' : `${total} prompts`}</small>}
          </SectionTitle>

          {loading && prompts.length === 0 ? (
            <Grid aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <SkeletonCard key={i} />
              ))}
            </Grid>
          ) : prompts.length === 0 ? (
            <Empty>
              <strong>{empty.title}</strong>
              {empty.body}
            </Empty>
          ) : (
            <Grid>
              {prompts.map((p) => (
                <PromptCard
                  key={p.id}
                  prompt={p}
                  category={categoryById.get(p.category)}
                  onUse={onUse}
                  onToggleFavorite={(x) => void toggleFavorite(x)}
                  onEdit={(x) => setEditor({ prompt: x })}
                  onDelete={(x) => void remove(x)}
                />
              ))}
            </Grid>
          )}
        </Inner>
      </Scroll>

      {editor && (
        <PromptEditor
          categories={categories}
          initial={editor.prompt}
          defaultCategory={category}
          onSave={save}
          onClose={() => {
            setEditor(null);
            searchRef.current?.focus({ preventScroll: true });
          }}
        />
      )}
    </Panel>
  );
}
