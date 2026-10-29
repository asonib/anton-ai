import { Code2, Lightbulb, PenLine, Sparkles } from 'lucide-react';
import styled from 'styled-components';
import { appEnv } from '../../config/env';
import { messageEnter } from '../../styles/animations';

const Wrap = styled.div`
  margin: auto;
  max-width: 620px;
  width: 100%;
  text-align: center;
  padding: ${({ theme }) => theme.space.xxl} ${({ theme }) => theme.space.lg};
  animation: ${messageEnter} 420ms ease both;
`;

const Logo = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.lg};
  display: grid;
  place-items: center;
  color: ${({ theme }) => theme.colors.onPrimary};
  background: linear-gradient(135deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
  box-shadow: ${({ theme }) => theme.shadows.lg};
  ${({ theme }) => theme.shadows.glow !== 'none' && `box-shadow: ${theme.shadows.lg}, ${theme.shadows.glow};`}
`;

const Title = styled.h1`
  margin: 0 0 ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.xxl};
  letter-spacing: -0.02em;
`;

const Sub = styled.p`
  margin: 0 0 ${({ theme }) => theme.space.xxl};
  color: ${({ theme }) => theme.colors.textMuted};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: ${({ theme }) => theme.space.md};
`;

const Suggestion = styled.button`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  align-items: flex-start;
  text-align: left;
  padding: ${({ theme }) => theme.space.lg};
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  transition: border-color ${({ theme }) => theme.transitions.fast}, transform ${({ theme }) => theme.transitions.fast}, background ${({ theme }) => theme.transitions.fast};

  svg { color: ${({ theme }) => theme.colors.primary}; flex-shrink: 0; margin-top: 2px; }
  &:hover { border-color: ${({ theme }) => theme.colors.primary}; transform: translateY(-2px); background: ${({ theme }) => theme.colors.surfaceHover}; }
`;

const SUGGESTIONS = [
  { icon: Code2, text: 'Write a TypeScript debounce function with generics and tests' },
  { icon: Lightbulb, text: 'Explain the Strategy pattern with a real-world example' },
  { icon: PenLine, text: 'Draft a concise release note for a new chat feature' },
  { icon: Sparkles, text: 'Compare REST and GraphQL in a markdown table' },
];

export function EmptyState({ providerLabel, onPick }: { providerLabel: string; onPick: (text: string) => void }) {
  return (
    <Wrap>
      <Logo>
        <Sparkles size={26} />
      </Logo>
      <Title>How can {appEnv.appName} help today?</Title>
      <Sub>You're chatting with {providerLabel}. Switch providers anytime from the sidebar.</Sub>
      <Grid>
        {SUGGESTIONS.map(({ icon: Icon, text }) => (
          <Suggestion key={text} type="button" onClick={() => onPick(text)}>
            <Icon size={16} />
            <span>{text}</span>
          </Suggestion>
        ))}
      </Grid>
    </Wrap>
  );
}
