import { useEffect, useRef, useState } from 'react';
import { chatApi } from '../api/chatApi';
import type { ActivityOutput, ActivityRun, ActivityStepKey } from '../api/types';
import type { ActiveRun } from './useChat';

/** How often the server is asked what the assistant is doing. */
const POLL_MS = 700;
/** How long the finished state (done / failed) stays on screen. */
const LINGER_MS = 3500;
/** Exit animation length — `leaving` is set this long before the bubble unmounts. */
const LEAVE_MS = 320;

export type ActivityPhase = 'running' | 'done' | 'error';

/** One row of the timeline. `send` is the client-side step shown until the server picks the request up. */
export interface ActivityTimelineStep {
  key: ActivityStepKey | 'send';
  label: string;
  detail: string | null;
  status: 'active' | 'done' | 'error';
  durationMs: number | null;
}

export interface AgentActivityView {
  visible: boolean;
  leaving: boolean;
  phase: ActivityPhase;
  steps: ActivityTimelineStep[];
  current: ActivityTimelineStep | null;
  output: ActivityOutput | null;
  error: string | null;
  elapsedMs: number;
}

const ms = (iso: string | null) => (iso ? Date.parse(iso) : null);

function sendStep(run: ActiveRun, server: ActivityRun | null): ActivityTimelineStep {
  const label = run.fileCount > 0 ? `Uploading ${run.fileCount} file${run.fileCount === 1 ? '' : 's'}` : 'Sending the request';
  const pct = run.upload === null ? null : `${Math.round(run.upload * 100)}%`;
  // No duration: it would mix the browser's and the server's clocks.
  return { key: 'send', label, detail: server ? null : pct, status: server ? 'done' : 'active', durationMs: null };
}

function timeline(run: ActiveRun, server: ActivityRun | null): ActivityTimelineStep[] {
  const steps = (server?.steps ?? []).map<ActivityTimelineStep>((s) => {
    const start = ms(s.startedAt);
    const end = ms(s.finishedAt);
    return {
      key: s.key,
      label: s.label,
      detail: s.detail,
      status: s.status,
      durationMs: start !== null && end !== null ? end - start : null,
    };
  });
  return [sendStep(run, server), ...steps];
}

/**
 * Live view of what the assistant is doing for the prompt in flight. Polls
 * `GET /chats/activity/:runId` while `sending`, fetches once more when the response arrives, shows
 * the final state for a moment and then hides. Polling failures are ignored — the bubble then just
 * keeps showing the last known state (the prompt request itself reports real errors).
 */
export function useAgentActivity(run: ActiveRun | null, sending: boolean): AgentActivityView {
  const [serverState, setServer] = useState<ActivityRun | null>(null);
  const [finished, setFinished] = useState<{ runId: string; at: number } | null>(null);
  const [hiddenRunId, setHiddenRunId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const runId = run?.runId ?? null;
  // Ignore state left over from the previous run during the render before the reset effect runs.
  const server = serverState && serverState.runId === runId ? serverState : null;
  const serverRef = useRef(server);
  serverRef.current = server;

  // New run → reset.
  useEffect(() => {
    setServer(null);
    setFinished(null);
    setHiddenRunId(null);
    setLeaving(false);
  }, [runId]);

  // Poll while the request is in flight.
  useEffect(() => {
    if (!runId || !sending) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const next = await chatApi.getActivity(runId);
        if (!cancelled && next) setServer(next);
        if (!cancelled && next && next.status !== 'running') return; // server is done; wait for the response
      } catch {
        /* keep the last known state */
      }
      if (!cancelled) timer = setTimeout(() => void tick(), POLL_MS);
    };
    timer = setTimeout(() => void tick(), 250);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [runId, sending]);

  // Response arrived → one final read (so every step shows as finished), then linger and hide.
  useEffect(() => {
    if (!runId || sending) return;
    let cancelled = false;
    const finishedAt = Date.now();
    setFinished({ runId, at: finishedAt });
    if (serverRef.current?.status === 'running' || !serverRef.current) {
      chatApi
        .getActivity(runId)
        .then((next) => {
          if (!cancelled && next) setServer(next);
        })
        .catch(() => undefined);
    }
    const leave = setTimeout(() => !cancelled && setLeaving(true), LINGER_MS - LEAVE_MS);
    const hide = setTimeout(() => !cancelled && setHiddenRunId(runId), LINGER_MS);
    return () => {
      cancelled = true;
      clearTimeout(leave);
      clearTimeout(hide);
    };
  }, [runId, sending]);

  const active = Boolean(run) && hiddenRunId !== runId;
  const isFinished = finished?.runId === runId;

  // Elapsed-time ticker while running.
  useEffect(() => {
    if (!active || isFinished) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active, isFinished]);

  if (!run || !active) {
    return { visible: false, leaving: false, phase: 'running', steps: [], current: null, output: null, error: null, elapsedMs: 0 };
  }

  const steps = timeline(run, server);
  // The server may still say "running" if the final read failed; the response is what counts.
  const phase: ActivityPhase =
    run.outcome === 'error' || server?.status === 'error' ? 'error' : isFinished ? 'done' : 'running';
  if (phase !== 'running') {
    for (const s of steps) if (s.status === 'active') s.status = phase === 'error' ? 'error' : 'done';
  }
  const end = finished && isFinished ? finished.at : now;

  return {
    visible: true,
    leaving,
    phase,
    steps,
    current: steps.find((s) => s.status === 'active') ?? steps[steps.length - 1] ?? null,
    output: server?.output ?? null,
    error: server?.error ?? (run.outcome === 'error' ? 'The request failed' : null),
    elapsedMs: Math.max(0, end - run.startedAt),
  };
}
