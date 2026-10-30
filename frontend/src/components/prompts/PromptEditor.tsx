import { X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from 'react';
import styled from 'styled-components';
import type { LibraryPrompt, PromptCategory, PromptDraft } from '../../api/types';
import { dropdownEnter, fadeIn } from '../../styles/animations';
import { media } from '../../styles/theme';
import type { NormalisedError } from '../../utils/errors';
import { Button, IconButton, Spinner } from '../common/Button';
import { ErrorBanner } from '../common/ErrorBanner';

const TITLE_MAX = 120;
const CONTENT_MAX = 20_000;

const Backdrop = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  display: grid;
  place-items: center;
  padding: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.overlay};
  animation: ${fadeIn} 160ms ease both;
`;

const Dialog = styled.form`
  width: min(620px, 100%);
  max-height: 100%;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.lg};
  padding: ${({ theme }) => theme.space.xl};
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.bgElevated};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  animation: ${dropdownEnter} 200ms ease both;

  ${media.mobile} { padding: ${({ theme }) => theme.space.lg}; }
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};

  h2 {
    margin: 0;
    font-size: ${({ theme }) => theme.fontSizes.lg};
  }
`;

const Field = styled.label`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.text};
`;

const Hint = styled.span`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 400;
  color: ${({ theme }) => theme.colors.textSubtle};

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    color: ${({ theme }) => theme.colors.primary};
  }
`;

const controlStyles = `
  width: 100%;
  font-weight: 400;
`;

const Input = styled.input`
  ${controlStyles}
  height: 42px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
`;

const Select = styled.select`
  ${controlStyles}
  height: 42px;
  padding: 0 ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
  option { background: ${({ theme }) => theme.colors.surface}; color: ${({ theme }) => theme.colors.text}; }
`;

const TextArea = styled.textarea`
  ${controlStyles}
  min-height: 200px;
  resize: vertical;
  padding: ${({ theme }) => theme.space.md};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  line-height: 1.5;
  &:focus { outline: none; border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: ${({ theme }) => theme.space.sm};
`;

interface Props {
  categories: PromptCategory[];
  /** Prompt being edited; omit to add a new one. */
  initial?: LibraryPrompt;
  defaultCategory?: string | null;
  onSave: (draft: PromptDraft, id?: string) => Promise<unknown>;
  onClose: () => void;
}

/** Add / edit form, shown over the library. Esc or Cancel closes; errors from the API show inline. */
export function PromptEditor({ categories, initial, defaultCategory, onSave, onClose }: Props) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [category, setCategory] = useState(initial?.category ?? defaultCategory ?? categories[0]?.id ?? 'other');
  const [content, setContent] = useState(initial?.content ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<NormalisedError | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const headingId = useId();

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  // Categories may arrive after the editor opened.
  useEffect(() => {
    if (!categories.some((c) => c.id === category) && categories[0]) setCategory(categories[0].id);
  }, [categories, category]);

  const valid = title.trim().length >= 3 && content.trim().length >= 10;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ title: title.trim(), category, content: content.trim() }, initial?.id);
      onClose();
    } catch (err) {
      setError(err as NormalisedError);
      setSaving(false);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    }
  };

  return (
    <Backdrop
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <Dialog role="dialog" aria-modal="true" aria-labelledby={headingId} onSubmit={submit} onKeyDown={onKeyDown}>
        <Header>
          <h2 id={headingId}>{initial ? 'Edit prompt' : 'Add a prompt'}</h2>
          <IconButton type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Header>

        <Field>
          Title
          <Input
            ref={titleRef}
            value={title}
            maxLength={TITLE_MAX}
            placeholder="e.g. Weekly status update"
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>

        <Field>
          Category
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field>
          Prompt
          <TextArea
            value={content}
            maxLength={CONTENT_MAX}
            placeholder="Write the prompt exactly as it should be sent…"
            onChange={(e) => setContent(e.target.value)}
          />
          <Hint>
            <span>
              Use <code>[PLACEHOLDERS]</code> for the parts people fill in — the first one is selected when the prompt is used.
            </span>
            <span>
              {content.length.toLocaleString()}/{CONTENT_MAX.toLocaleString()}
            </span>
          </Hint>
        </Field>

        <Hint>Prompts in the library are visible to every user.</Hint>

        {error && <ErrorBanner message={error.message} details={error.details} onDismiss={() => setError(null)} />}

        <Actions>
          <Button type="button" $variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid || saving}>
            {saving && <Spinner $size={14} />}
            {initial ? 'Save changes' : 'Add prompt'}
          </Button>
        </Actions>
      </Dialog>
    </Backdrop>
  );
}
