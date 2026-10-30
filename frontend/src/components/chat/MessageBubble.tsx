import { Check, Copy, Square, Volume2 } from 'lucide-react';
import { memo } from 'react';
import styled from 'styled-components';
import type { UiMessage } from '../../hooks/useChat';
import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useTextToSpeech } from '../../hooks/useTextToSpeech';
import { messageEnter, popIn } from '../../styles/animations';
import { formatTime } from '../../utils/format';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MessageAttachments } from './Attachments';
import { Avatar } from './Avatar';
import { DownloadMenu } from './DownloadMenu';

const Row = styled.div<{ $isUser: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  flex-direction: ${({ $isUser }) => ($isUser ? 'row-reverse' : 'row')};
  align-items: flex-start;
  animation: ${messageEnter} ${({ theme }) => theme.transitions.slow} both;
`;

const Column = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: ${({ $isUser }) => ($isUser ? 'flex-end' : 'stretch')};
  min-width: 0;
  max-width: ${({ $isUser }) => ($isUser ? '78%' : 'calc(100% - 44px)')};
  flex: ${({ $isUser }) => ($isUser ? '0 1 auto' : '1 1 auto')};
`;

const UserBubble = styled.div<{ $pending?: boolean }>`
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-radius: ${({ theme }) => `${theme.radii.lg} ${theme.radii.sm} ${theme.radii.lg} ${theme.radii.lg}`};
  background: ${({ theme }) => theme.colors.userBubble};
  color: ${({ theme }) => theme.colors.userBubbleText};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  box-shadow: ${({ theme }) => theme.shadows.sm};
  opacity: ${({ $pending }) => ($pending ? 0.8 : 1)};
  transition: opacity ${({ theme }) => theme.transitions.base};
`;

const AssistantBubble = styled.div`
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.lg}`};
  border-radius: ${({ theme }) => `${theme.radii.sm} ${theme.radii.lg} ${theme.radii.lg} ${theme.radii.lg}`};
  background: ${({ theme }) => theme.colors.assistantBubble};
  border: 1px solid ${({ theme }) => theme.colors.border};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

const Footer = styled.div<{ $isUser: boolean }>`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.space.sm};
  margin-top: ${({ theme }) => theme.space.xs};
  padding: 0 ${({ theme }) => theme.space.xs};
  justify-content: ${({ $isUser }) => ($isUser ? 'flex-end' : 'flex-start')};
  color: ${({ theme }) => theme.colors.textSubtle};
  font-size: ${({ theme }) => theme.fontSizes.xs};
`;

const Chip = styled.span`
  padding: 1px ${({ theme }) => theme.space.sm};
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.primarySoft};
  color: ${({ theme }) => theme.colors.primary};
  font-weight: 600;
  letter-spacing: 0.01em;
`;

const Actions = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  margin-left: auto;
`;

const SpeakResponse = styled.button<{ $speaking: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $speaking, theme }) => ($speaking ? 'transparent' : theme.colors.border)};
  background: ${({ $speaking, theme }) => ($speaking ? theme.colors.primarySoft : 'transparent')};
  color: ${({ $speaking, theme }) => ($speaking ? theme.colors.primary : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ $speaking, theme }) => ($speaking ? theme.colors.primary : theme.colors.text)}; background: ${({ $speaking, theme }) => ($speaking ? theme.colors.primarySoft : theme.colors.surfaceHover)}; }
  svg { animation: ${({ $speaking }) => ($speaking ? popIn : 'none')} 280ms ease; }
`;

const CopyResponse = styled.button<{ $copied: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.xxs} ${theme.space.sm}`};
  border-radius: ${({ theme }) => theme.radii.sm};
  border: 1px solid ${({ $copied, theme }) => ($copied ? 'transparent' : theme.colors.border)};
  background: ${({ $copied, theme }) => ($copied ? theme.colors.successSoft : 'transparent')};
  color: ${({ $copied, theme }) => ($copied ? theme.colors.success : theme.colors.textMuted)};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 500;
  transition: all ${({ theme }) => theme.transitions.fast};

  &:hover { color: ${({ $copied, theme }) => ($copied ? theme.colors.success : theme.colors.text)}; background: ${({ $copied, theme }) => ($copied ? theme.colors.successSoft : theme.colors.surfaceHover)}; }
  svg { animation: ${({ $copied }) => ($copied ? popIn : 'none')} 280ms ease; }
`;

function MessageBubbleImpl({ message }: { message: UiMessage }) {
  const isUser = message.role === 'user';
  const { copied, copy } = useCopyToClipboard();
  const tts = useTextToSpeech(message.id);

  return (
    <Row $isUser={isUser}>
      <Avatar kind={isUser ? 'user' : 'assistant'} />
      <Column $isUser={isUser}>
        {message.attachments?.length > 0 && <MessageAttachments attachments={message.attachments} alignEnd={isUser} />}
        {isUser ? (
          message.content && <UserBubble $pending={message.pending}>{message.content}</UserBubble>
        ) : (
          <AssistantBubble>
            <MarkdownRenderer content={message.content} />
          </AssistantBubble>
        )}
        <Footer $isUser={isUser}>
          {!isUser && message.provider && <Chip title={message.modelName ?? undefined}>{message.provider}</Chip>}
          {!isUser && message.modelName && <span>{message.modelName}</span>}
          <span>{message.pending ? 'Sending…' : formatTime(message.createdAt)}</span>
          {!isUser && (
            <Actions>
              {tts.supported && message.content.trim() && (
                <SpeakResponse
                  type="button"
                  $speaking={tts.speaking}
                  onClick={() => tts.toggle(message.content)}
                  aria-label={tts.speaking ? 'Stop reading response' : 'Read response aloud'}
                  aria-pressed={tts.speaking}
                >
                  {tts.speaking ? <Square size={12} /> : <Volume2 size={13} />}
                  {tts.speaking ? 'Stop' : 'Listen'}
                </SpeakResponse>
              )}
              {message.content.trim() && <DownloadMenu content={message.content} createdAt={message.createdAt} />}
              <CopyResponse type="button" $copied={copied} onClick={() => void copy(message.content)} aria-label="Copy response">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copied!' : 'Copy response'}
              </CopyResponse>
            </Actions>
          )}
        </Footer>
      </Column>
    </Row>
  );
}

export const MessageBubble = memo(MessageBubbleImpl);
