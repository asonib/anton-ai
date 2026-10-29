import styled from 'styled-components';
import { messageEnter, typingBounce } from '../../styles/animations';
import { Avatar } from './Avatar';

const Row = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  align-items: center;
  animation: ${messageEnter} ${({ theme }) => theme.transitions.slow} both;
`;

const Bubble = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-radius: ${({ theme }) => `${theme.radii.sm} ${theme.radii.lg} ${theme.radii.lg} ${theme.radii.lg}`};
  background: ${({ theme }) => theme.colors.assistantBubble};
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.fontSizes.sm};
`;

const Dots = styled.span`
  display: inline-flex;
  gap: 5px;
`;

const Dot = styled.span<{ $delay: number }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.primary};
  animation: ${typingBounce} 1.2s ease-in-out ${({ $delay }) => $delay}s infinite;
`;

export function TypingIndicator({ label = 'Thinking' }: { label?: string }) {
  return (
    <Row role="status" aria-live="polite">
      <Avatar kind="assistant" pulse />
      <Bubble>
        <Dots aria-hidden>
          <Dot $delay={0} />
          <Dot $delay={0.15} />
          <Dot $delay={0.3} />
        </Dots>
        <span>{label}…</span>
      </Bubble>
    </Row>
  );
}
