import { Check } from 'lucide-react';
import { KeyboardEvent, useCallback, useEffect, useId, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import type { Skill } from '../../api/types';
import { useClickOutside } from '../../hooks/useClickOutside';
import { bubbleReveal, gradientFill, orbitItemEnter } from '../../styles/animations';
import { media } from '../../styles/theme';
import { SkillIcon } from './SkillIcon';

const Root = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const Trigger = styled.button<{ $open: boolean }>`
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: 0 ${({ theme }) => theme.space.lg} 0 5px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  /* Translucent HUD fill so the chat area (and its aurora) shows through. */
  background: ${({ theme, $open }) => ($open ? theme.colors.primarySoft : theme.colors.panel)};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.glow : theme.shadows.sm)};
  transition: background ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.base};

  &:hover:not(:disabled) {
    border-color: ${({ theme }) => theme.colors.primary};
    background: ${({ theme }) => theme.colors.primarySoft};
  }
  &:focus-visible {
    outline: none;
    box-shadow: 0 0 0 3px ${({ theme }) => theme.colors.focusRing};
  }
  &:disabled { opacity: 0.45; cursor: not-allowed; }

  ${media.mobile} {
    width: 38px;
    padding: 0;
    justify-content: center;
    .label { display: none; }
  }
`;

const TriggerTile = styled.span`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  ${gradientFill}
`;

const Bubble = styled.div`
  --size: min(320px, calc(100vw - 24px));
  position: absolute;
  top: calc(100% + ${({ theme }) => theme.space.sm});
  right: 0;
  z-index: ${({ theme }) => theme.zIndex.toast};
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.borderStrong};
  background: ${({ theme }) => theme.colors.panel};
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: ${({ theme }) => theme.shadows.lg};
  ${({ theme }) => theme.shadows.glow !== 'none' && `box-shadow: ${theme.shadows.lg}, ${theme.shadows.glow};`}
  /* backwards (not both): once revealed, drop the clip-path so it can't crop the shadow/glow */
  animation: ${bubbleReveal} 380ms cubic-bezier(0.22, 1, 0.36, 1) backwards;

  /* On phones the trigger isn't at the screen edge, so pin the bubble to the viewport instead. */
  ${media.mobile} {
    position: fixed;
    top: 64px;
    right: 12px;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/** The circular track the options sit on — shows the menu is a ring you can cycle through. */
const Orbit = styled.div`
  position: absolute;
  inset: 12%;
  border-radius: 50%;
  border: 1px dashed ${({ theme }) => theme.colors.border};
  pointer-events: none;
`;

const Hub = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 46%;
  transform: translate(-50%, -50%);
  text-align: center;
  pointer-events: none;
`;

const HubName = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  font-weight: 700;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.text};
`;

const HubTagline = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.35;
  color: ${({ theme }) => theme.colors.textMuted};
`;

const HubState = styled.div`
  margin-top: ${({ theme }) => theme.space.sm};
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xxs};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.primary};
`;

const Item = styled.button<{ $x: number; $y: number; $index: number; $selected: boolean; $focused: boolean }>`
  position: absolute;
  left: calc(50% + ${({ $x }) => $x}%);
  top: calc(50% + ${({ $y }) => $y}%);
  width: 54px;
  height: 54px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transform: translate(-50%, -50%);
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.textMuted};
  animation: ${orbitItemEnter} 320ms cubic-bezier(0.22, 1, 0.36, 1) backwards;
  animation-delay: ${({ $index }) => 90 + $index * 35}ms;
  transition: color ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast},
    background ${({ theme }) => theme.transitions.fast}, box-shadow ${({ theme }) => theme.transitions.base},
    scale ${({ theme }) => theme.transitions.base};

  ${({ $selected }) =>
    $selected &&
    css`
      ${gradientFill}
      border-color: transparent;
    `}

  ${({ $focused, $selected, theme }) =>
    $focused &&
    css`
      scale: 1.1;
      border-color: ${$selected ? 'transparent' : theme.colors.primary};
      color: ${$selected ? theme.colors.onPrimary : theme.colors.primary};
      box-shadow: 0 0 0 4px ${theme.colors.focusRing};
    `}

  &:focus-visible { outline: none; }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

interface Option {
  id: string | null;
  name: string;
  tagline: string;
  icon: string | null;
}

const GENERAL: Option = { id: null, name: 'General', tagline: 'Everyday questions, code and writing', icon: null };
/** Distance of the option centres from the bubble centre, as a % of the bubble size (matches Orbit inset). */
const ORBIT_RADIUS = 38;

interface Props {
  skills: Skill[];
  activeSkill: Skill | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
}

/**
 * Top-right "Skills" button. Opens a circular bubble with the skills arranged on a ring; the hub in the
 * middle describes the hovered/focused one. Arrow keys cycle, Enter picks, Esc closes.
 */
export function SkillLauncher({ skills, activeSkill, onSelect, disabled }: Props) {
  const options: Option[] = [GENERAL, ...skills];
  const selectedIndex = Math.max(0, options.findIndex((o) => o.id === (activeSkill?.id ?? null)));

  const [open, setOpen] = useState(false);
  const [focusIndex, setFocusIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const bubbleId = `${useId()}-skills`;

  const close = useCallback((refocus = false) => {
    setOpen(false);
    if (refocus) triggerRef.current?.focus();
  }, []);
  const closeQuietly = useCallback(() => close(false), [close]);
  useClickOutside(rootRef, open, closeQuietly);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  // On open, start on the current skill.
  useEffect(() => {
    if (!open) return;
    setFocusIndex(selectedIndex);
    itemRefs.current[selectedIndex]?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const moveFocus = (index: number) => {
    const n = options.length;
    const next = (index + n) % n;
    setFocusIndex(next);
    itemRefs.current[next]?.focus({ preventScroll: true });
  };

  const pick = (option: Option) => {
    close(false);
    onSelect(option.id);
  };

  const onBubbleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(focusIndex + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(focusIndex - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveFocus(0);
        break;
      case 'End':
        e.preventDefault();
        moveFocus(options.length - 1);
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

  const focused = options[focusIndex] ?? options[selectedIndex];
  const triggerLabel = activeSkill?.name ?? 'Skills';

  return (
    <Root ref={rootRef}>
      <Trigger
        ref={triggerRef}
        type="button"
        $open={open}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? bubbleId : undefined}
        aria-label={activeSkill ? `Skills (current: ${activeSkill.name})` : 'Skills'}
        title={activeSkill ? `Skill: ${activeSkill.name}` : 'Choose a skill'}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        <TriggerTile>
          <SkillIcon name={activeSkill?.icon} size={15} />
        </TriggerTile>
        <span className="label">{triggerLabel}</span>
      </Trigger>

      {open && (
        <Bubble id={bubbleId} role="menu" aria-label="Skills" onKeyDown={onBubbleKeyDown}>
          <Orbit />
          {options.map((o, i) => {
            const angle = (-90 + (360 / options.length) * i) * (Math.PI / 180);
            return (
              <Item
                key={o.id ?? 'general'}
                ref={(el) => {
                  itemRefs.current[i] = el;
                }}
                type="button"
                role="menuitemradio"
                aria-checked={i === selectedIndex}
                aria-label={`${o.name}: ${o.tagline}`}
                tabIndex={i === focusIndex ? 0 : -1}
                $x={Math.cos(angle) * ORBIT_RADIUS}
                $y={Math.sin(angle) * ORBIT_RADIUS}
                $index={i}
                $selected={i === selectedIndex}
                $focused={i === focusIndex}
                onMouseEnter={() => setFocusIndex(i)}
                onFocus={() => setFocusIndex(i)}
                onClick={() => pick(o)}
              >
                <SkillIcon name={o.icon} size={21} />
              </Item>
            );
          })}
          <Hub aria-hidden>
            <HubName>{focused.name}</HubName>
            <HubTagline>{focused.tagline}</HubTagline>
            {focused.id === (activeSkill?.id ?? null) && (
              <HubState>
                <Check size={12} /> In use
              </HubState>
            )}
          </Hub>
        </Bubble>
      )}
    </Root>
  );
}
