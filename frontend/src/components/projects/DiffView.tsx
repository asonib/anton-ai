import { useMemo } from 'react';
import styled, { css } from 'styled-components';
import type { DiffLineType } from '../../utils/diff';
import { diffText } from '../../utils/diff';

const Wrapper = styled.div`
  max-height: 420px;
  overflow: auto;
  border-top: 1px solid ${({ theme }) => theme.colors.border};
  background: ${({ theme }) => theme.colors.codeBg};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  line-height: 1.55;
`;

const Table = styled.div`
  display: table;
  min-width: 100%;
`;

const Line = styled.div<{ $type: DiffLineType }>`
  display: table-row;
  ${({ $type, theme }) =>
    $type === 'add'
      ? css`background: ${theme.colors.successSoft};`
      : $type === 'del'
        ? css`background: ${theme.colors.dangerSoft};`
        : ''}
`;

const Num = styled.span`
  display: table-cell;
  min-width: 3.2em;
  padding: 0 ${({ theme }) => theme.space.sm};
  text-align: right;
  color: ${({ theme }) => theme.colors.textSubtle};
  user-select: none;
  border-right: 1px solid ${({ theme }) => theme.colors.border};
`;

const Sign = styled.span<{ $type: DiffLineType }>`
  display: table-cell;
  width: 1.6em;
  text-align: center;
  user-select: none;
  color: ${({ $type, theme }) =>
    $type === 'add' ? theme.colors.success : $type === 'del' ? theme.colors.danger : theme.colors.textSubtle};
`;

const Code = styled.span`
  display: table-cell;
  padding-right: ${({ theme }) => theme.space.lg};
  white-space: pre;
  color: ${({ theme }) => theme.colors.text};
`;

const Gap = styled.div`
  display: table-row;
  color: ${({ theme }) => theme.colors.textSubtle};
  background: ${({ theme }) => theme.colors.bgSunken};

  span {
    display: table-cell;
    padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
    font-style: italic;
  }
`;

const Note = styled.div`
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  color: ${({ theme }) => theme.colors.textMuted};
  font-family: ${({ theme }) => theme.fonts.body};
`;

interface Props {
  original: string | null;
  next: string | null;
}

/** Unified line diff (old/new line numbers, +/- gutter, collapsed unchanged runs). */
export function DiffView({ original, next }: Props) {
  const diff = useMemo(() => diffText(original, next), [original, next]);

  if (diff.added + diff.removed === 0) return <Note>No line changes (only line endings differ).</Note>;

  return (
    <Wrapper>
      {diff.coarse && <Note>The file is too large for a line-by-line diff; showing the old and new versions.</Note>}
      <Table role="table" aria-label={`${diff.added} lines added, ${diff.removed} removed`}>
        {diff.rows.map((row, i) =>
          row.kind === 'gap' ? (
            <Gap key={`g${i}`}>
              <span />
              <span />
              <span />
              <span>
                ⋯ {row.count} unchanged line{row.count === 1 ? '' : 's'}
              </span>
            </Gap>
          ) : (
            <Line key={i} $type={row.line.type}>
              <Num>{row.line.oldNo ?? ''}</Num>
              <Num>{row.line.newNo ?? ''}</Num>
              <Sign $type={row.line.type}>{row.line.type === 'add' ? '+' : row.line.type === 'del' ? '−' : ''}</Sign>
              <Code>{row.line.text || ' '}</Code>
            </Line>
          ),
        )}
      </Table>
    </Wrapper>
  );
}
