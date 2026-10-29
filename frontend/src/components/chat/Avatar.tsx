import { Bot, User } from 'lucide-react';
import styled, { css } from 'styled-components';
import { pulseRing } from '../../styles/animations';

export const AvatarCircle = styled.div<{ $kind: 'user' | 'assistant'; $pulse?: boolean }>`
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: ${({ $kind, theme }) => ($kind === 'assistant' ? theme.colors.onPrimary : theme.colors.text)};
  background: ${({ $kind, theme }) =>
    $kind === 'assistant'
      ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`
      : theme.colors.borderStrong};
  ${({ $pulse, theme }) =>
    $pulse &&
    css`
      animation: ${pulseRing(theme.colors.glow)} 1.6s ease-out infinite;
    `}
`;

export function Avatar({ kind, pulse }: { kind: 'user' | 'assistant'; pulse?: boolean }) {
  return (
    <AvatarCircle $kind={kind} $pulse={pulse} aria-hidden>
      {kind === 'assistant' ? <Bot size={17} /> : <User size={16} />}
    </AvatarCircle>
  );
}
