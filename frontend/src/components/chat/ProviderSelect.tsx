import { Check, ChevronDown, Cpu } from 'lucide-react';
import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { LLMProvider, ProviderInfo } from '../../api/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { dropdownEnter } from '../../styles/animations';
import { ProviderIcon } from './ProviderIcon';

const Label = styled.div`
  display: block;
  margin-bottom: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const Root = styled.div`
  position: relative;
`;

const Trigger = styled.button<{ $open: boolean }>`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  text-align: left;
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.glow : 'none')};
  transition: border-color ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base},
    background ${({ theme }) => theme.transitions.fast};

  > svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary}; }
  .value { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 500; }
  .chevron {
    color: ${({ theme }) => theme.colors.textMuted};
    transform: rotate(${({ $open }) => ($open ? '180deg' : '0deg')});
    transition: transform ${({ theme }) => theme.transitions.base};
  }

  &:hover:not(:disabled) {
    background: ${({ theme }) => theme.colors.surfaceHover};
    border-color: ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.borderStrong)};
  }
  &:focus-visible { outline: none; border-color: ${({ theme }) => theme.colors.primary}; box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing}; }
  &:disabled { opacity: 0.55; cursor: not-allowed; }
`;

const Menu = styled.ul`
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space.xs});
  left: 0;
  right: 0;
  z-index: 10;
  margin: 0;
  padding: ${({ theme }) => theme.space.xs};
  list-style: none;
  max-height: 320px;
  overflow-y: auto;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.bgElevated};
  box-shadow: ${({ theme }) => theme.shadows.lg};
  ${({ theme }) => theme.shadows.glow !== 'none' && `box-shadow: ${theme.shadows.lg}, ${theme.shadows.glow};`}
  transform-origin: top center;
  animation: ${dropdownEnter} 160ms ease both;

  &:focus { outline: none; }
`;

const Option = styled.li<{ $active: boolean; $selected: boolean; $disabled: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.sm} ${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  cursor: pointer;
  color: ${({ theme }) => theme.colors.text};
  transition: background ${({ theme }) => theme.transitions.fast};

  ${({ $active, theme }) => $active && css`background: ${theme.colors.surfaceHover};`}
  ${({ $selected, theme }) =>
    $selected &&
    css`
      background: ${theme.colors.primarySoft};
      &::before {
        content: '';
        position: absolute;
        left: 0;
        top: 6px;
        bottom: 6px;
        width: 3px;
        border-radius: 3px;
        background: ${theme.colors.primary};
        box-shadow: ${theme.shadows.glow};
      }
    `}
  ${({ $disabled }) =>
    $disabled &&
    css`
      cursor: not-allowed;
      opacity: 0.5;
    `}

  .brand {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme, $selected }) => ($selected ? theme.colors.primarySoft : theme.colors.surface)};
    border: 1px solid ${({ theme }) => theme.colors.border};
    color: ${({ theme, $selected }) => ($selected ? theme.colors.primary : theme.colors.textMuted)};
    transition: color ${({ theme }) => theme.transitions.fast};
  }
  &:hover:not([aria-disabled='true']) .brand { color: ${({ theme }) => theme.colors.primary}; }
  .text { flex: 1; min-width: 0; }
  .name { display: flex; align-items: center; gap: ${({ theme }) => theme.space.xs}; font-size: ${({ theme }) => theme.fontSizes.sm}; font-weight: 500; }
  .model {
    font-size: ${({ theme }) => theme.fontSizes.xs};
    color: ${({ theme }) => theme.colors.textSubtle};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .check { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary}; }
`;

const Badge = styled.span<{ $tone: 'primary' | 'muted' }>`
  padding: 1px ${({ theme }) => theme.space.xs};
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  ${({ $tone, theme }) =>
    $tone === 'primary'
      ? css`background: ${theme.colors.primarySoft}; color: ${theme.colors.primary};`
      : css`background: ${theme.colors.surfaceHover}; color: ${theme.colors.textSubtle};`}
`;

const ModelHint = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ORDER: LLMProvider[] = ['ollama', 'anthropic', 'gemini', 'openai', 'grok'];

interface Props {
  providers: ProviderInfo[];
  value: LLMProvider;
  onChange: (p: LLMProvider) => void;
  disabled?: boolean;
}

export function ProviderSelect({ providers, value, onChange, disabled }: Props) {
  const sorted = [...providers].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
  const current = providers.find((p) => p.id === value);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const listId = `${baseId}-list`;
  const optionId = (i: number) => `${baseId}-opt-${i}`;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const closeQuietly = useCallback(() => close(false), [close]);
  useClickOutside(rootRef, open, closeQuietly);

  // Close if the control becomes disabled (e.g. while a prompt is sending).
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // On open: highlight the selected option and move focus into the listbox.
  useEffect(() => {
    if (!open) return;
    setActiveIndex(Math.max(0, sorted.findIndex((p) => p.id === value)));
    menuRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (open && activeIndex >= 0) document.getElementById(optionId(activeIndex))?.scrollIntoView({ block: 'nearest' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, open]);

  const select = (p: ProviderInfo) => {
    if (!p.configured) return;
    onChange(p.id);
    close(true);
  };

  /** Next enabled option index in `dir`, wrapping around. */
  const step = (from: number, dir: 1 | -1) => {
    for (let n = 1; n <= sorted.length; n++) {
      const i = (from + dir * n + sorted.length) % sorted.length;
      if (sorted[i].configured) return i;
    }
    return from;
  };

  const onTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((i) => step(i, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((i) => step(i, -1));
        break;
      case 'Home':
        e.preventDefault();
        setActiveIndex(step(-1, 1));
        break;
      case 'End':
        e.preventDefault();
        setActiveIndex(step(sorted.length, -1));
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (sorted[activeIndex]) select(sorted[activeIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        close(true);
        break;
      case 'Tab':
        close(false);
        break;
    }
  };

  return (
    <Root ref={rootRef}>
      <Label id={labelId}>LLM provider</Label>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={labelId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        {current ? <ProviderIcon provider={current.id} /> : <Cpu size={15} />}
        <span className="value">{current?.label ?? 'Select a provider'}</span>
        <ChevronDown size={15} className="chevron" />
      </Trigger>

      {open && (
        <Menu
          ref={menuRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-labelledby={labelId}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          onKeyDown={onMenuKeyDown}
        >
          {sorted.map((p, i) => {
            const selected = p.id === value;
            return (
              <Option
                key={p.id}
                id={optionId(i)}
                role="option"
                aria-selected={selected}
                aria-disabled={!p.configured}
                $active={i === activeIndex}
                $selected={selected}
                $disabled={!p.configured}
                onMouseEnter={() => p.configured && setActiveIndex(i)}
                onClick={() => select(p)}
              >
                <span className="brand">
                  <ProviderIcon provider={p.id} size={16} />
                </span>
                <div className="text">
                  <div className="name">
                    {p.label}
                    {p.isDefault && <Badge $tone="primary">Default</Badge>}
                    {!p.configured && <Badge $tone="muted">Not configured</Badge>}
                  </div>
                  {p.model && <div className="model" title={p.model}>{p.model}</div>}
                </div>
                {selected && <Check size={15} className="check" />}
              </Option>
            );
          })}
        </Menu>
      )}

      {current?.model && <ModelHint title={current.model}>Model: {current.model}</ModelHint>}
    </Root>
  );
}
