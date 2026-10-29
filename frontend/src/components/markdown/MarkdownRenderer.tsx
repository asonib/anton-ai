import { Children, isValidElement, memo, ReactNode } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styled from 'styled-components';
import { CodeBlock } from './CodeBlock';

/** Recursively flattens React children to plain text (code blocks arrive as nested nodes). */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeToText(node.props.children);
  return '';
}

const Body = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.7;
  color: ${({ theme }) => theme.colors.text};
  overflow-wrap: anywhere;

  > *:first-child { margin-top: 0; }
  > *:last-child { margin-bottom: 0; }

  p { margin: 0 0 ${({ theme }) => theme.space.md}; }
  h1, h2, h3, h4 { margin: ${({ theme }) => theme.space.xl} 0 ${({ theme }) => theme.space.sm}; line-height: 1.3; font-weight: 650; }
  h1 { font-size: 1.45rem; }
  h2 { font-size: 1.25rem; }
  h3 { font-size: 1.1rem; }
  ul, ol { margin: 0 0 ${({ theme }) => theme.space.md}; padding-left: 1.4rem; }
  li { margin: ${({ theme }) => theme.space.xs} 0; }
  li > p { margin: 0; }
  a { color: ${({ theme }) => theme.colors.primary}; text-decoration: none; &:hover { text-decoration: underline; } }
  hr { border: none; border-top: 1px solid ${({ theme }) => theme.colors.border}; margin: ${({ theme }) => theme.space.xl} 0; }
  img { max-width: 100%; border-radius: ${({ theme }) => theme.radii.md}; }

  blockquote {
    margin: 0 0 ${({ theme }) => theme.space.md};
    padding: ${({ theme }) => `${theme.space.xs} ${theme.space.lg}`};
    border-left: 3px solid ${({ theme }) => theme.colors.primary};
    color: ${({ theme }) => theme.colors.textMuted};
    background: ${({ theme }) => theme.colors.primarySoft};
    border-radius: 0 ${({ theme }) => theme.radii.sm} ${({ theme }) => theme.radii.sm} 0;
  }

  :not(pre) > code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.85em;
    padding: 0.15em 0.4em;
    border-radius: ${({ theme }) => theme.radii.sm};
    background: ${({ theme }) => theme.colors.inlineCodeBg};
    color: ${({ theme }) => theme.colors.text};
  }

  .table-wrap { overflow-x: auto; margin: 0 0 ${({ theme }) => theme.space.md}; }
  table { border-collapse: collapse; width: 100%; font-size: ${({ theme }) => theme.fontSizes.sm}; }
  th, td { border: 1px solid ${({ theme }) => theme.colors.border}; padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`}; text-align: left; }
  th { background: ${({ theme }) => theme.colors.surfaceHover}; font-weight: 600; }

  input[type='checkbox'] { margin-right: ${({ theme }) => theme.space.xs}; }
`;

const components: Components = {
  // Block code: intercept <pre><code class="language-x"> and render our CodeBlock.
  pre({ children }) {
    const child = Children.toArray(children)[0];
    if (isValidElement<{ className?: string; children?: ReactNode }>(child)) {
      const language = /language-([\w+#-]+)/.exec(child.props.className ?? '')?.[1];
      const code = nodeToText(child.props.children).replace(/\n$/, '');
      return <CodeBlock code={code} language={language} />;
    }
    return <pre>{children}</pre>;
  },
  a({ children, href }) {
    return (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    );
  },
  table({ children }) {
    return (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    );
  },
};

function MarkdownRendererImpl({ content }: { content: string }) {
  return (
    <Body>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </Body>
  );
}

export const MarkdownRenderer = memo(MarkdownRendererImpl);
