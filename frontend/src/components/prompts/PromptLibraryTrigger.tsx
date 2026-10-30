import { LibraryBig } from 'lucide-react';
import styled from 'styled-components';
import { media } from '../../styles/theme';

const Trigger = styled.button<{ $open: boolean }>`
  height: 38px;
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  padding: 0 ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme, $open }) => ($open ? theme.colors.primary : theme.colors.border)};
  /* Same translucent HUD pill as the skills launcher. */
  background: ${({ theme, $open }) => ($open ? theme.colors.primarySoft : theme.colors.panel)};
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 600;
  box-shadow: ${({ theme, $open }) => ($open ? theme.shadows.glow : theme.shadows.sm)};
  transition: background ${({ theme }) => theme.transitions.fast}, border-color ${({ theme }) => theme.transitions.fast},
    box-shadow ${({ theme }) => theme.transitions.base};

  svg { color: ${({ theme }) => theme.colors.primary}; }

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

interface Props {
  open: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/** Top-right pill that opens the shared prompt library (Ctrl/Cmd+K). */
export function PromptLibraryTrigger({ open, onClick, disabled }: Props) {
  return (
    <Trigger
      type="button"
      $open={open}
      disabled={disabled}
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-label="Prompt library"
      title="Prompt library (Ctrl+K)"
      onClick={onClick}
    >
      <LibraryBig size={16} aria-hidden />
      <span className="label">Prompt Library</span>
    </Trigger>
  );
}
