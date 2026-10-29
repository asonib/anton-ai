import { ArrowUp, X } from 'lucide-react';
import { FormEvent, KeyboardEvent, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { fadeIn, flowingBorder, gradientFill } from '../../styles/animations';
import { Spinner } from '../common/Button';

const Form = styled.form`
  position: relative;
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => theme.space.sm};
  padding-left: ${({ theme }) => theme.space.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1.5px solid transparent;
  border-radius: ${({ theme }) => theme.radii.xl};
  box-shadow: ${({ theme }) => theme.shadows.md};
  transition: box-shadow ${({ theme }) => theme.transitions.fast};
  ${flowingBorder('1.5px')}

  &:focus-within {
    box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.focusRing}, ${({ theme }) => theme.shadows.md};
  }
  &:focus-within::before { opacity: 1; }
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
  ${gradientFill}

  &:hover:not(:disabled) { transform: translateY(-1px); }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const Clear = styled.button`
  flex-shrink: 0;
  align-self: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  display: grid;
  place-items: center;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSubtle};
  animation: ${fadeIn} 150ms ease both;
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceHover};
    color: ${({ theme }) => theme.colors.text};
  }
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

  const canClear = !disabled && value.length > 0;

  const clear = () => {
    onChange('');
    ref.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && canClear) {
      e.preventDefault();
      clear();
      return;
    }
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
        {canClear && (
          <Clear type="button" onClick={clear} aria-label="Clear prompt" title="Clear (Esc)">
            <X size={16} />
          </Clear>
        )}
        <Send type="submit" disabled={!canSend} aria-label="Send message">
          {disabled ? <Spinner $size={16} /> : <ArrowUp size={18} />}
        </Send>
      </Form>
      <Hint>
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line · <kbd>Esc</kbd> to clear
      </Hint>
    </div>
  );
}
