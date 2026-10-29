import { ArrowUp } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Spinner } from '../common/Button';

const Form = styled.form`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm};
  padding-left: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.fast};

  &:focus-within {
    border-color: ${({ theme }) => theme.colors.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.focusRing}, ${({ theme }) => theme.shadows.md};
  }
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  padding: ${({ theme }) => `${theme.space.sm} 0`};
  max-height: 220px;
  line-height: 1.5;
  color: ${({ theme }) => theme.colors.text};

  &::placeholder { color: ${({ theme }) => theme.colors.textSubtle}; }
  &:disabled { cursor: progress; }
`;

const Send = styled.button`
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  transition: background ${({ theme }) => theme.transitions.fast}, transform ${({ theme }) => theme.transitions.fast}, opacity ${({ theme }) => theme.transitions.fast};

  &:hover:not(:disabled) { background: ${({ theme }) => theme.colors.primaryHover}; transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Hint = styled.p`
  margin: ${({ theme }) => theme.space.sm} 0 0;
  text-align: center;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  kbd {
    font-family: ${({ theme }) => theme.fonts.mono};
    padding: 0 4px;
    border: 1px solid ${({ theme }) => theme.colors.border};
    border-radius: 4px;
  }
`;

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  placeholder?: string;
}

/** Auto-growing textarea. Enter = send, Shift+Enter = newline. */
export function PromptInput({ value, onChange, onSubmit, disabled, placeholder }: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const canSend = !disabled && value.trim().length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (canSend) onSubmit();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <div>
      <Form onSubmit={handleSubmit}>
        <TextArea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder ?? 'Message the assistant…'}
          disabled={disabled}
          aria-label="Prompt"
        />
        <Send type="submit" disabled={!canSend} aria-label="Send message">
          {disabled ? <Spinner $size={16} /> : <ArrowUp size={18} />}
        </Send>
      </Form>
      <Hint>
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line
      </Hint>
    </div>
  );
}
