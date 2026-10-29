import { AlertTriangle, X } from 'lucide-react';
import styled from 'styled-components';
import { messageEnter, shake } from '../../styles/animations';
import type { ApiErrorDetail } from '../../api/types';

const Wrapper = styled.div`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.dangerSoft};
  border: 1px solid ${({ theme }) => theme.colors.danger}40;
  color: ${({ theme }) => theme.colors.danger};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  animation: ${messageEnter} 240ms ease both, ${shake} 420ms 120ms ease both;

  svg { flex-shrink: 0; margin-top: 2px; }
`;

const Body = styled.div`
  flex: 1;
  min-width: 0;
  strong { display: block; font-weight: 600; }
  ul { margin: ${({ theme }) => theme.space.xs} 0 0; padding-left: ${({ theme }) => theme.space.lg}; }
`;

const Close = styled.button`
  background: none;
  border: none;
  color: inherit;
  padding: 0;
  opacity: 0.7;
  &:hover { opacity: 1; }
`;

interface Props {
  message: string;
  details?: ApiErrorDetail[];
  onDismiss?: () => void;
}

export function ErrorBanner({ message, details, onDismiss }: Props) {
  return (
    <Wrapper role="alert">
      <AlertTriangle size={16} />
      <Body>
        <strong>{message}</strong>
        {details && details.length > 0 && (
          <ul>
            {details.map((d, i) => (
              <li key={i}>{d.field ? `${d.field}: ` : ''}{d.message}</li>
            ))}
          </ul>
        )}
      </Body>
      {onDismiss && (
        <Close type="button" aria-label="Dismiss error" onClick={onDismiss}>
          <X size={16} />
        </Close>
      )}
    </Wrapper>
  );
}
