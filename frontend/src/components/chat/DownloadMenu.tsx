import { Download, FileCode2, FileText } from 'lucide-react';
import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { appEnv } from '../../config/env';
import { useClickOutside } from '../../hooks/useClickOutside';
import { dropupEnter } from '../../styles/animations';
import { saveTextFile, slugify } from '../../utils/download';
import { markdownToPlainText } from '../../utils/markdownText';

const Root = styled.div`
  position: relative;
  display: inline-flex;
`;

const Trigger = styled.button<{ $open: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $open, theme }) => ($open ? 'transparent' : theme.colors.border)};
  background: ${({ $open, theme }) => ($open ? theme.colors.primarySoft : 'transparent')};
  color: ${({ $open, theme }) => ($open ? theme.colors.primary : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ $open, theme }) => ($open ? theme.colors.primary : theme.colors.text)}; background: ${({ $open, theme }) => ($open ? theme.colors.primarySoft : theme.colors.surfaceHover)}; }
`;

const Menu = styled.div`
  position: absolute;
  bottom: calc(100% + ${({ theme }) => theme.space.sm});
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.toast};
  width: 232px;
  padding: ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.bgElevated};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  ${({ theme }) => theme.shadows.glow !== 'none' && `box-shadow: ${theme.shadows.lg}, ${theme.shadows.glow};`}
  transform-origin: bottom right;
  animation: ${dropupEnter} 170ms ease both;

  &:focus { outline: none; }
`;

const List = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
`;

const Option = styled.li<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  transition: background ${({ theme }) => theme.transitions.fast};

  .tile {
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    display: grid;
    place-items: center;
    border-radius: ${({ theme }) => theme.radii.md};
    border: 1px solid ${({ theme }) => theme.colors.border};
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.textMuted};
    transition: color ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast},
      border-color ${({ theme }) => theme.transitions.fast};
  }
  .label { font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 600; }
  .desc { font-size: ${({ theme }) => theme.fontSizes.xs}; color: ${({ theme }) => theme.colors.textSubtle}; }

  ${({ $active, theme }) =>
    $active &&
    css`
      background: ${theme.colors.surfaceHover};
      .tile {
        color: ${theme.colors.primary};
        background: ${theme.colors.primarySoft};
        border-color: ${theme.colors.primary};
      }
    `}
`;

interface Format {
  id: 'md' | 'txt';
  label: string;
  description: string;
  icon: typeof FileText;
  mimeType: string;
  convert: (markdown: string) => string;
}

const FORMATS: Format[] = [
  {
    id: 'md',
    label: 'Markdown',
    description: '.md · keeps formatting & code',
    icon: FileCode2,
    mimeType: 'text/markdown',
    convert: (md) => (md.endsWith('\n') ? md : `${md}\n`),
  },
  {
    id: 'txt',
    label: 'Plain text',
    description: '.txt · formatting removed',
    icon: FileText,
    mimeType: 'text/plain',
    convert: markdownToPlainText,
  },
];

/** `anton-response-2026-10-30-1432.md` */
const buildFileName = (createdAt: string | undefined, ext: string) => {
  const date = createdAt ? new Date(createdAt) : new Date();
  const d = Number.isNaN(date.getTime()) ? new Date() : date;
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
  return `${slugify(appEnv.appName, 'assistant')}-response-${stamp}.${ext}`;
};

interface Props {
  content: string;
  createdAt?: string;
}

/** "Download" button in the assistant bubble footer; opens an upward menu of file formats. */
export function DownloadMenu({ content, createdAt }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const baseId = useId();
  const menuId = `${baseId}-menu`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const closeQuietly = useCallback(() => close(false), [close]);
  useClickOutside(rootRef, open, closeQuietly);

  useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    menuRef.current?.focus();
  }, [open]);

  const pick = (format: Format) => {
    saveTextFile(format.convert(content), buildFileName(createdAt, format.id), format.mimeType);
    close(true);
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = FORMATS.length;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % n);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + n) % n);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        pick(FORMATS[activeIndex]);
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

  return (
    <Root ref={rootRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        aria-label="Download response"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        <Download size={13} />
        Download
      </Trigger>

      {open && (
        <Menu
          ref={menuRef}
          id={menuId}
          role="menu"
          tabIndex={-1}
          aria-label="Download as"
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={onMenuKeyDown}
        >
          <List role="none">
            {FORMATS.map((f, i) => {
              const Icon = f.icon;
              return (
                <Option
                  key={f.id}
                  id={optionId(i)}
                  role="menuitem"
                  $active={i === activeIndex}
                  onMouseEnter={() => setActiveIndex(i)}
                  onClick={() => pick(f)}
                >
                  <span className="tile">
                    <Icon size={15} />
                  </span>
                  <span>
                    <div className="label">{f.label}</div>
                    <div className="desc">{f.description}</div>
                  </span>
                </Option>
              );
            })}
          </List>
        </Menu>
      )}
    </Root>
  );
}
