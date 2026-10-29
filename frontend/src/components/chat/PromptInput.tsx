import { ArrowUp, UploadCloud, X } from 'lucide-react';
import { ClipboardEvent, DragEvent, FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { PendingAttachment } from '../../hooks/useAttachments';
import { fadeIn, flowingBorder, gradientFill } from '../../styles/animations';
import { Spinner } from '../common/Button';
import { AttachMenu } from './AttachMenu';
import { AttachmentTray } from './Attachments';

const Form = styled.form`
  position: relative;
  display: flex;
  flex-direction: column;
  padding: ${({ theme }) => theme.space.sm};
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

const Row = styled.div`
  display: flex;
  align-items: flex-end;
  gap: ${({ theme }) => theme.space.sm};
`;

const TrayArea = styled.div`
  padding: 0 ${({ theme }) => theme.space.xs};
`;

const DropOverlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.space.sm};
  border-radius: inherit;
  border: 2px dashed ${({ theme }) => theme.colors.primary};
  background: ${({ theme }) => theme.colors.primarySoft};
  backdrop-filter: blur(2px);
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  pointer-events: none;
  animation: ${fadeIn} 120ms ease both;
`;

const TextArea = styled.textarea`
  flex: 1;
  resize: none;
  border: none;
  outline: none;
  background: transparent;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.xs}`};
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
  attachments: PendingAttachment[];
  onAddFiles: (files: File[]) => void;
  onRemoveAttachment: (id: string) => void;
}

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Auto-growing textarea with an attach menu on the left. Enter = send, Shift+Enter = newline.
 * Files can also be dropped onto the composer or pasted into the textarea.
 */
export function PromptInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  attachments,
  onAddFiles,
  onRemoveAttachment,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [dragging, setDragging] = useState(false);
  const dragDepth = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [value]);

  useEffect(() => {
    if (!disabled) ref.current?.focus();
  }, [disabled]);

  const canSend = !disabled && (value.trim().length > 0 || attachments.length > 0);

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

  const handlePaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files);
    if (files.length === 0) return;
    // Pasting a screenshot: attach it. Keep any text that came along with it.
    if (!e.clipboardData.getData('text')) e.preventDefault();
    onAddFiles(files);
  };

  const onDragEnter = (e: DragEvent<HTMLFormElement>) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current += 1;
    setDragging(true);
  };
  const onDragOver = (e: DragEvent<HTMLFormElement>) => {
    if (disabled || !hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };
  const onDragLeave = () => {
    dragDepth.current = Math.max(0, dragDepth.current - 1);
    if (dragDepth.current === 0) setDragging(false);
  };
  const onDrop = (e: DragEvent<HTMLFormElement>) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth.current = 0;
    setDragging(false);
    if (!disabled) onAddFiles(Array.from(e.dataTransfer.files));
    ref.current?.focus();
  };

  return (
    <div>
      <Form onSubmit={handleSubmit} onDragEnter={onDragEnter} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {dragging && (
          <DropOverlay>
            <UploadCloud size={18} /> Drop files to attach
          </DropOverlay>
        )}
        {attachments.length > 0 && (
          <TrayArea>
            <AttachmentTray items={attachments} onRemove={onRemoveAttachment} disabled={disabled} />
          </TrayArea>
        )}
        <Row>
          <AttachMenu onFiles={onAddFiles} count={attachments.length} disabled={disabled} />
          <TextArea
            ref={ref}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
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
        </Row>
      </Form>
      <Hint>
        <kbd>Enter</kbd> to send · <kbd>Shift</kbd>+<kbd>Enter</kbd> for a new line · <kbd>Esc</kbd> to clear · drop or paste files to attach
      </Hint>
    </div>
  );
}
