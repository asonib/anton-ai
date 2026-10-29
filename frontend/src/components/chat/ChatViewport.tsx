import { ReactNode, useRef } from 'react';
import styled from 'styled-components';
import type { UiMessage } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { MessageBubble } from './MessageBubble';
import { MessagesSkeleton } from './SkeletonLoader';
import { TypingIndicator } from './TypingIndicator';

const Scroll = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.chatMaxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space.xl} ${theme.space.lg} ${theme.space.xxl}`};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xl};
  flex: 1;
`;

interface Props {
  messages: UiMessage[];
  loading: boolean;
  sending: boolean;
  providerLabel: string;
  empty: ReactNode;
}

export function ChatViewport({ messages, loading, sending, providerLabel, empty }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoScroll(ref, [messages.length, sending, loading]);

  return (
    <Scroll ref={ref}>
      <Inner>
        {loading ? (
          <MessagesSkeleton />
        ) : messages.length === 0 && !sending ? (
          empty
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {sending && <TypingIndicator label={`${providerLabel} is thinking`} />}
          </>
        )}
      </Inner>
    </Scroll>
  );
}
