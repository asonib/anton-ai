import {
  AlertCircle,
  BrainCircuit,
  Check,
  ChevronRight,
  FileDiff,
  FolderSearch,
  History,
  Paperclip,
  PenLine,
  Save,
  Send,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import type { AgentActivityView, ActivityTimelineStep } from '../../hooks/useAgentActivity';
import { fadeIn, flowingBorder, gradientText, popIn, pulseRing, spin } from '../../styles/animations';
import { media } from '../../styles/theme';
import { storage } from '../../utils/storage';

const STEP_ICONS: Record<ActivityTimelineStep['key'], LucideIcon> = {
  send: Send,
  prepare: Sparkles,
  attachments: Paperclip,
  memory: History,
  project: FolderSearch,
  skill: Sparkles,
  model: BrainCircuit,
  changes: FileDiff,
  save: Save,
};

const enterFromRight = keyframes`
  from { opacity: 0; transform: translate(16px, -50%) scale(0.96); }
  to   { opacity: 1; transform: translate(0, -50%) scale(1); }
`;

const leaveToRight = keyframes`
  from { opacity: 1; transform: translate(0, -50%) scale(1); }
  to   { opacity: 0; transform: translate(16px, -50%) scale(0.96); }
`;

/** Right-centre of the chat area, floating over the messages. */
const Dock = styled.aside<{ $leaving: boolean }>`
  position: absolute;
  top: 50%;
  right: ${({ theme }) => theme.space.lg};
  z-index: 2;
  transform: translate(0, -50%);
  animation: ${({ $leaving }) => ($leaving ? leaveToRight : enterFromRight)} ${({ theme }) => theme.transitions.slow} both;
  pointer-events: none;
  > * { pointer-events: auto; }

  ${media.mobile} { right: ${({ theme }) => theme.space.sm}; }

  @media (prefers-reduced-motion: reduce) {
    animation: ${fadeIn} 1ms both;
  }
`;

const glass = css`
  background: ${({ theme }) => theme.colors.panel};
  backdrop-filter: blur(14px) saturate(1.2);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  box-shadow: ${({ theme }) => theme.shadows.lg};
`;

/* ------------------------------ expanded card ------------------------------ */

const Card = styled.section<{ $running: boolean }>`
  ${glass};
  position: relative;
  width: 300px;
  max-width: calc(100vw - 32px);
  border-radius: ${({ theme }) => theme.radii.xl};
  border: 1.5px solid ${({ theme, $running }) => ($running ? 'transparent' : theme.colors.border)};
  ${({ $running }) => $running && flowingBorder('1.5px')};
  animation: ${fadeIn} ${({ theme }) => theme.transitions.base} both;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.md} ${theme.space.md} ${theme.space.sm} ${theme.space.lg}`};
`;

const Titles = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const Title = styled.span<{ $running: boolean }>`
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: 650;
  color: ${({ theme }) => theme.colors.text};
  ${({ $running }) => $running && gradientText('5s')};
`;

const Sub = styled.span<{ $tone: 'muted' | 'success' | 'danger' }>`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === 'success' ? theme.colors.success : $tone === 'danger' ? theme.colors.danger : theme.colors.textSubtle};
`;

const IconBtn = styled.button`
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.colors.textSubtle};
  transition: background ${({ theme }) => theme.transitions.fast}, color ${({ theme }) => theme.transitions.fast};
  &:hover { background: ${({ theme }) => theme.colors.surfaceHover}; color: ${({ theme }) => theme.colors.text}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.focusRing}; outline-offset: 1px; }
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: ${({ theme }) => `${theme.space.xs} ${theme.space.lg} ${theme.space.md}`};
  max-height: min(52vh, 420px);
  overflow-y: auto;
`;

const Row = styled.li<{ $status: ActivityTimelineStep['status']; $last: boolean }>`
  position: relative;
  display: flex;
  gap: ${({ theme }) => theme.space.md};
  padding-bottom: ${({ theme, $last }) => ($last ? 0 : theme.space.md)};
  animation: ${fadeIn} ${({ theme }) => theme.transitions.base} both;

  /* connector line to the next step */
  &::after {
    content: '';
    display: ${({ $last }) => ($last ? 'none' : 'block')};
    position: absolute;
    left: 11px;
    top: 26px;
    bottom: 2px;
    width: 2px;
    border-radius: 1px;
    background: ${({ theme, $status }) => ($status === 'done' ? theme.colors.primarySoft : theme.colors.border)};
  }
`;

const Node = styled.span<{ $status: ActivityTimelineStep['status'] }>`
  position: relative;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  color: ${({ theme, $status }) =>
    $status === 'error' ? theme.colors.danger : $status === 'done' ? theme.colors.primary : theme.colors.onPrimary};
  background: ${({ theme, $status }) =>
    $status === 'error'
      ? theme.colors.dangerSoft
      : $status === 'done'
        ? theme.colors.primarySoft
        : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})`};
  ${({ $status, theme }) =>
    $status === 'active' &&
    css`
      animation: ${pulseRing(theme.colors.glow)} 1.6s ease-out infinite;
      /* orbiting arc */
      &::before {
        content: '';
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid transparent;
        border-top-color: ${theme.colors.primary};
        border-right-color: ${theme.colors.accent};
        animation: ${spin} 0.9s linear infinite;
      }
    `}
  ${({ $status }) =>
    $status !== 'active' &&
    css`
      svg { animation: ${popIn} 280ms ease both; }
    `}

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    &::before { animation: none; }
  }
`;

const Text = styled.div`
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-top: 3px;
`;

const Label = styled.span<{ $status: ActivityTimelineStep['status'] }>`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space.sm};
  font-size: ${({ theme }) => theme.fontSizes.sm};
  font-weight: ${({ $status }) => ($status === 'active' ? 600 : 500)};
  color: ${({ theme, $status }) =>
    $status === 'error' ? theme.colors.danger : $status === 'active' ? theme.colors.text : theme.colors.textMuted};
  line-height: 1.35;
`;

const Duration = styled.span`
  flex-shrink: 0;
  font-size: ${({ theme }) => theme.fontSizes.xs};
  font-weight: 400;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textSubtle};
`;

const Detail = styled.span`
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textSubtle};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Live = styled.div`
  margin-top: ${({ theme }) => theme.space.xs};
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space.xs};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.bgSunken};
  border: 1px solid ${({ theme }) => theme.colors.border};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`;

const LiveLine = styled.span`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space.xs};
  min-width: 0;
  svg { flex-shrink: 0; color: ${({ theme }) => theme.colors.primary}; }
  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    color: ${({ theme }) => theme.colors.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
`;

const meter = keyframes`
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(250%); }
`;

/** Indeterminate bar — the model gives no "percent done". */
const Meter = styled.span`
  position: relative;
  display: block;
  height: 3px;
  border-radius: ${({ theme }) => theme.radii.pill};
  background: ${({ theme }) => theme.colors.border};
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    width: 40%;
    border-radius: inherit;
    background: linear-gradient(90deg, ${({ theme }) => theme.colors.primary}, ${({ theme }) => theme.colors.accent});
    animation: ${meter} 1.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) { &::after { animation: none; } }
`;

const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
`;

const Footer = styled.footer<{ $tone: 'success' | 'danger' }>`
  display: flex;
  align-items: flex-start;
  gap: ${({ theme }) => theme.space.sm};
  margin: 0 ${({ theme }) => theme.space.lg} ${({ theme }) => theme.space.md};
  padding: ${({ theme }) => `${theme.space.sm} ${theme.space.md}`};
  border-radius: ${({ theme }) => theme.radii.md};
  font-size: ${({ theme }) => theme.fontSizes.xs};
  color: ${({ theme, $tone }) => ($tone === 'success' ? theme.colors.success : theme.colors.danger)};
  background: ${({ theme, $tone }) => ($tone === 'success' ? theme.colors.successSoft : theme.colors.dangerSoft)};
  animation: ${fadeIn} ${({ theme }) => theme.transitions.base} both;
  svg { flex-shrink: 0; margin-top: 1px; }
`;

/* ------------------------------ collapsed orb ------------------------------ */

const Orb = styled.button<{ $phase: AgentActivityView['phase'] }>`
  ${glass};
  position: relative;
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  padding: 0;
  border-radius: 50%;
  border: 1px solid ${({ theme }) => theme.colors.border};
  color: ${({ theme, $phase }) =>
    $phase === 'error' ? theme.colors.danger : $phase === 'done' ? theme.colors.success : theme.colors.primary};
  animation: ${popIn} ${({ theme }) => theme.transitions.slow} both;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.colors.focusRing}; outline-offset: 2px; }

  ${({ $phase, theme }) =>
    $phase === 'running' &&
    css`
      &::before {
        content: '';
        position: absolute;
        inset: 3px;
        border-radius: 50%;
        border: 2.5px solid transparent;
        border-top-color: ${theme.colors.primary};
        border-left-color: ${theme.colors.accent};
        animation: ${spin} 1s linear infinite;
      }
      &::after {
        content: '';
        position: absolute;
        inset: -1px;
        border-radius: 50%;
        animation: ${pulseRing(theme.colors.glow)} 1.8s ease-out infinite;
      }
      @media (prefers-reduced-motion: reduce) {
        &::before, &::after { animation: none; }
      }
    `}
`;

const Badge = styled.span`
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  display: grid;
  place-items: center;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 10px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.onPrimary};
  background: ${({ theme }) => theme.colors.primary};
  box-shadow: ${({ theme }) => theme.shadows.sm};
`;

/* ------------------------------ helpers ------------------------------ */

const seconds = (ms: number) => (ms < 10_000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 1000)} s`);
const clock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  return m > 0 ? `${m}:${String(total % 60).padStart(2, '0')}` : `${total}s`;
};
const n = (v: number) => v.toLocaleString();

function StepIcon({ step }: { step: ActivityTimelineStep }) {
  if (step.status === 'done') return <Check size={13} strokeWidth={3} />;
  if (step.status === 'error') return <AlertCircle size={14} />;
  const Icon = STEP_ICONS[step.key];
  return <Icon size={13} />;
}

function LiveOutput({ view }: { view: AgentActivityView }) {
  const out = view.output;
  const writing = out && out.chars > 0;
  return (
    <Live aria-live="off">
      <Meter />
      <LiveLine>{writing ? `Writing · ${n(out.words)} words` : 'Thinking…'}</LiveLine>
      {out?.currentFile && (
        <LiveLine>
          <PenLine size={12} />
          <code title={out.currentFile}>{out.currentFile}</code>
        </LiveLine>
      )}
      {out && out.filesWritten > 0 && (
        <LiveLine>
          <FileDiff size={12} />
          {out.filesWritten} file{out.filesWritten === 1 ? '' : 's'} drafted
        </LiveLine>
      )}
    </Live>
  );
}

interface Props {
  view: AgentActivityView;
  /** Shown in the header, e.g. the app name. */
  agentName: string;
}

const defaultCollapsed = () => {
  const saved = storage.getActivityCollapsed();
  if (saved !== null) return saved;
  return typeof window !== 'undefined' && window.matchMedia?.('(max-width: 768px)').matches;
};

/**
 * Live "what is the assistant doing" bubble at the right centre of the chat area: a timeline of
 * the server-side steps (attachments, memory, project scan, model, file changes, saving) with a
 * live word counter while the model writes. Collapses into a small orb; the choice is remembered.
 */
export function AgentActivityBubble({ view, agentName }: Props) {
  const [collapsed, setCollapsed] = useState<boolean>(defaultCollapsed);
  if (!view.visible) return null;

  const toggle = () =>
    setCollapsed((c) => {
      storage.setActivityCollapsed(!c);
      return !c;
    });

  const running = view.phase === 'running';
  const doneCount = view.steps.filter((s) => s.status === 'done').length;
  const headline = running ? `${agentName} is working` : view.phase === 'done' ? 'All done' : 'Something went wrong';
  const statusText = running ? `${view.current?.label ?? 'Working'} · ${clock(view.elapsedMs)}` : `Finished in ${seconds(view.elapsedMs)}`;

  return (
    <Dock $leaving={view.leaving} aria-label="Assistant activity">
      <VisuallyHidden role="status" aria-live="polite">
        {running ? view.current?.label : headline}
      </VisuallyHidden>
      {collapsed ? (
        <Orb type="button" $phase={view.phase} onClick={toggle} title={`${headline} — ${statusText}`} aria-label={`${headline}. Show details`}>
          {running && view.current ? (
            <StepIcon step={view.current} />
          ) : view.phase === 'done' ? (
            <Check size={20} strokeWidth={2.6} />
          ) : (
            <AlertCircle size={20} />
          )}
          {running && <Badge>{doneCount}</Badge>}
        </Orb>
      ) : (
        <Card $running={running}>
          <Header>
            <Titles>
              <Title $running={running}>{headline}</Title>
              <Sub $tone={running ? 'muted' : view.phase === 'done' ? 'success' : 'danger'}>{statusText}</Sub>
            </Titles>
            <IconBtn type="button" onClick={toggle} aria-label="Minimise activity" title="Minimise">
              <ChevronRight size={16} />
            </IconBtn>
          </Header>
          <Steps>
            {view.steps.map((step, i) => (
              <Row key={`${step.key}-${i}`} $status={step.status} $last={i === view.steps.length - 1}>
                <Node $status={step.status}>
                  <StepIcon step={step} />
                </Node>
                <Text>
                  <Label $status={step.status}>
                    <span>{step.label}</span>
                    {step.durationMs !== null && step.status === 'done' && <Duration>{seconds(step.durationMs)}</Duration>}
                  </Label>
                  {step.detail && <Detail title={step.detail}>{step.detail}</Detail>}
                  {step.key === 'model' && step.status === 'active' && <LiveOutput view={view} />}
                </Text>
              </Row>
            ))}
          </Steps>
          {view.phase === 'error' && (
            <Footer $tone="danger">
              <AlertCircle size={14} />
              <span>{view.error ?? 'The request failed'}</span>
            </Footer>
          )}
        </Card>
      )}
    </Dock>
  );
}
