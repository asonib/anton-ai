import { ReactNode, useRef } from 'react';
import styled from 'styled-components';
import { media } from '../../styles/theme';
import type { UiMessage } from '../../hooks/useChat';
import { useAutoScroll } from '../../hooks/useAutoScroll';
import { AuroraBackdrop } from '../common/AuroraBackdrop';
import { MessageBubble } from './MessageBubble';
import { MessagesSkeleton } from './SkeletonLoader';
import { TypingIndicator } from './TypingIndicator';

const Stage = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
`;

const Scroll = styled.div`
  position: relative;
  z-index: 1;
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
`;

/** Height of the floating desktop skills button (38px) plus its top/bottom spacing. */
const TOP_CONTROLS_INSET = '62px';

const Inner = styled.div<{ $reserveTop: boolean }>`
  width: 100%;
  max-width: ${({ theme }) => theme.layout.chatMaxWidth};
  margin: 0 auto;
  padding: ${({ theme }) => `${theme.space.xl} ${theme.space.lg} ${theme.space.xxl}`};
  ${({ $reserveTop }) => $reserveTop && `${media.desktop} { padding-top: ${TOP_CONTROLS_INSET}; }`}
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
  /** Text next to the typing dots (defaults to "<provider> is thinking"). */
  statusLabel?: string;
  /** Floating overlay inside the chat area, e.g. the live activity bubble (right centre). */
  overlay?: ReactNode;
  /** Leave room at the top (desktop) for controls floating over the chat area, e.g. the skills button. */
  reserveTop?: boolean;
  empty: ReactNode;
}

export function ChatViewport({ messages, loading, sending, providerLabel, statusLabel, overlay, reserveTop = false, empty }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  useAutoScroll(ref, [messages.length, sending, loading]);
  const isEmpty = !loading && messages.length === 0 && !sending;

  return (
    <Stage>
      <AuroraBackdrop $visible={isEmpty} />
      <Scroll ref={ref}>
        <Inner $reserveTop={reserveTop}>
          {loading ? (
            <MessagesSkeleton />
          ) : isEmpty ? (
            empty
          ) : (
            <>
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {sending && <TypingIndicator label={statusLabel ?? `${providerLabel} is thinking`} />}
            </>
          )}
        </Inner>
      </Scroll>
      {overlay}
    </Stage>
  );
}
