import { Check, Copy } from 'lucide-react';
import { memo } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import styled, { useTheme } from 'styled-components';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { popIn } from '../../styles/animations';

const Frame = styled.div`
  margin: ${({ theme }) => theme.space.md} 0;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radii.md};
  overflow: hidden;
  background: ${({ theme }) => theme.colors.codeBg};
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${({ theme }) => `${theme.space.xs} ${theme.space.sm} ${theme.space.xs} ${theme.space.md}`};
  background: ${({ theme }) => theme.colors.codeHeader};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  text-transform: lowercase;
`;

const CopyButton = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid transparent;
  background: ${({ $copied, theme }) => ($copied ? theme.colors.successSoft : 'transparent')};
  color: ${({ $copied, theme }) => ($copied ? theme.colors.success : theme.colors.textMuted)};
  font-family: ${({ theme }) => theme.fonts.body};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  text-transform: none;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ $copied, theme }) => ($copied ? theme.colors.success : theme.colors.text)}; border-color: ${({ theme }) => theme.colors.border}; }
  svg { animation: ${({ $copied }) => ($copied ? popIn : 'none')} 280ms ease; }
`;

interface Props {
  code: string;
  language?: string;
}

/** Fenced code block with syntax highlighting + "Copy code" action. */
function CodeBlockImpl({ code, language }: Props) {
  const theme = useTheme();
  const { copied, copy } = useCopyToClipboard();

  return (
    <Frame>
      <Header>
        <span>{language ?? 'text'}</span>
        <CopyButton type="button" $copied={copied} onClick={() => void copy(code)} aria-label="Copy code">
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? 'Copied!' : 'Copy code'}
        </CopyButton>
      </Header>
      <SyntaxHighlighter
        language={language ?? 'text'}
        style={theme.mode === 'dark' ? oneDark : oneLight}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: '14px 16px',
          background: 'transparent',
          fontSize: '0.8125rem',
          lineHeight: 1.6,
        }}
        codeTagProps={{ style: { fontFamily: theme.fonts.mono, background: 'transparent' } }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </Frame>
  );
}

export const CodeBlock = memo(CodeBlockImpl);
