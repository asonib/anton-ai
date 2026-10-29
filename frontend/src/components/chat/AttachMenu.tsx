import { FileCode2, FileText, ImageIcon, Paperclip } from 'lucide-react';
import { ChangeEvent, KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { AttachmentKind } from '../../api/types';
import { ATTACHMENT_CATEGORIES, ATTACHMENT_LIMITS, formatBytes } from '../../config/attachments';
import { useClickOutside } from '../../hooks/useClickOutside';
import { dropupEnter } from '../../styles/animations';

const Root = styled.div`
  position: relative;
  flex-shrink: 0;
  align-self: flex-end;
`;

const Trigger = styled.button<{ $open: boolean }>`
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme, $open }) => ($open ? theme.colors.primarySoft : theme.colors.bgElevated)};
  color: ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.textMuted)};
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.glow : 'none')};
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast},
    border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base};

  svg {
    transform: rotate(${({ $open }) => ($open ? '-45deg' : '0deg')});
    transition: transform ${({ theme }) => theme.transitions.slow};
  }

  &:hover:not(:disabled) {
    color: ${({ theme }) => theme.colors.primary};
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: ${({ theme }) => theme.radii.pill};
  display: grid;
  place-items: center;
  font-size: 0.6875rem;
  font-weight: 700;
  pointer-events: none;
  background: ${({ theme }) => theme.colors.primary};
  color: ${({ theme }) => theme.colors.onPrimary};
  box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.surface};
`;

const Menu = styled.div`
  position: absolute;
  bottom: calc(100% + ${({ theme }) => theme.space.md});
  left: -${({ theme }) => theme.space.xs};
  z-index: ${({ theme }) => theme.zIndex.toast};
  width: 284px;
  padding: ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.bgElevated};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  ${({ theme }) => theme.shadows.glow !== 'none' && `box-shadow: ${theme.shadows.lg}, ${theme.shadows.glow};`}
  transform-origin: bottom left;
  animation: ${dropupEnter} 170ms ease both;

  &:focus { outline: none; }
`;

const MenuHeader = styled.div`
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md} ${theme.space.xs}`};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Option = styled.li<{ $active: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  transition: background ${({ theme }) => theme.transitions.fast};

  .tile {
    flex-shrink: 0;
    width: 34px;
    height: 34px;
    display: grid;
    place-items: center;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.textMuted};
    transition: color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast},
      border-color ${({ theme }) => theme.transitions.fast}, transform ${({ theme }) => theme.transitions.base};
  }
  .text { min-width: 0; }
  .label { font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600; }
  .desc {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textSubtle};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.surfaceHover};
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
      .tile {
        color: ${theme.colors.primary};
        background: ${theme.colors.primarySoft};
        border-color: ${theme.colors.primary};
        transform: scale(1.04);
      }
    `}
`;

const Footer = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const HiddenInput = styled.input`
  display: none;
`;

const ICONS: Record<AttachmentKind, typeof ImageIcon> = {
  image: ImageIcon,
  document: FileText,
  code: FileCode2,
};

interface Props {
  onFiles: (files: File[]) => void;
  count: number;
  disabled?: boolean;
}

/** Paperclip button on the left of the composer; opens an upward menu of attachment types. */
export function AttachMenu({ onFiles, count, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRefs = useRef<Partial<Record<AttachmentKind, HTMLInputElement | null>>>({});
  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;
  const full = count >= ATTACHMENT_LIMITS.maxFiles;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const closeQuietly = useCallback(() => close(false), [close]);
  useClickOutside(rootRef, open, closeQuietly);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    menuRef.current?.focus();
  }, [open]);

  const pick = (kind: AttachmentKind) => {
    close(false);
    inputRefs.current[kind]?.click(); // still inside the user gesture
  };

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = ''; // allow re-selecting the same file later
    if (files.length) onFiles(files);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = ATTACHMENT_CATEGORIES.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + n) % n);
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(n - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(ATTACHMENT_CATEGORIES[activeIndex].kind);
        break;
      case 'Escape':
        e.preventDefault();
        e.stopPropagation();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  const title = full ? `Attachment limit reached (${ATTACHMENT_LIMITS.maxFiles})` : 'Attach files';

  return (
    <Root ref={rootRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        disabled={disabled || full}
        aria-label={title}
        title={title}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <Paperclip size={17} />
      </Trigger>
      {count > 0 && <Badge aria-hidden>{count}</Badge>}

      {open && (
        <Menu
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label="Attach"
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onMenuKeyDown}
        >
          <MenuHeader>Attach</MenuHeader>
          <List role="none">
            {ATTACHMENT_CATEGORIES.map((c, i) => {
              const Icon = ICONS[c.kind];
              return (
                <Option
                  key={c.kind}
                  id={optionId(i)}
                  role="menuitem"
                  $active={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(c.kind)}
                >
                  <span className="tile">
                    <Icon size={17} />
                  </span>
                  <span className="text">
                    <div className="label">{c.label}</div>
                    <div className="desc">{c.description}</div>
                  </span>
                </Option>
              );
            })}
          </List>
          <Footer>
            Up to {ATTACHMENT_LIMITS.maxFiles} files · {formatBytes(ATTACHMENT_LIMITS.maxFileBytes)} each · or drag, drop &amp; paste
          </Footer>
        </Menu>
      )}

      {ATTACHMENT_CATEGORIES.map((c) => (
        <HiddenInput
          key={c.kind}
          ref={(el) => {
            inputRefs.current[c.kind] = el;
          }}
          type="file"
          multiple
          accept={c.accept}
          tabIndex={-1}
          aria-hidden
          onChange={onInputChange}
        />
      ))}
    </Root>
  );
}
