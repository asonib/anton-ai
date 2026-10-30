import type { ActivitySettings } from '../config/activity.config';
import type {
  ActivityOutputDTO,
  ActivityRunDTO,
  ActivityRunStatus,
  ActivityStepDTO,
  ActivityStepKey,
} from '../models/types';

/**
 * What a service uses to report progress for one prompt. Every method is safe to call in any
 * order and never throws — progress reporting must not be able to break a chat request.
 */
export interface ActivityReporter {
  /** Completes the active step (if any) and starts a new one. */
  step(key: ActivityStepKey, label: string, detail?: string | null): void;
  /** Replaces the detail of the active step. */
  detail(detail: string | null): void;
  /** Completes the active step, optionally with a final detail. */
  complete(detail?: string | null): void;
  /** Model output chunk (from the provider's internal stream). */
  token(chunk: string): void;
  finish(): void;
  fail(message: string): void;
}

interface StepState {
  key: ActivityStepKey;
  label: string;
  detail: string | null;
  status: ActivityStepDTO['status'];
  startedAt: number;
  finishedAt: number | null;
}

interface RunState {
  runId: string;
  userId: string;
  status: ActivityRunStatus;
  startedAt: number;
  finishedAt: number | null;
  steps: StepState[];
  /** Model output so far (null until the model step starts). Never sent to the client — only counted. */
  output: string | null;
  error: string | null;
}

const NOOP_REPORTER: ActivityReporter = Object.freeze({
  step: () => undefined,
  detail: () => undefined,
  complete: () => undefined,
  token: () => undefined,
  finish: () => undefined,
  fail: () => undefined,
});

const FILE_OPEN = '<<<FILE';
const FILE_CLOSE = '<<<END FILE>>>';
const PATH_ATTR = /path\s*=\s*"([^"\n]*)"/;

const iso = (ms: number | null) => (ms === null ? null : new Date(ms).toISOString());

/** Counters for the live output, including the project file currently being written. */
export function summariseOutput(text: string): ActivityOutputDTO {
  const open = text.lastIndexOf(FILE_OPEN);
  const close = text.lastIndexOf(FILE_CLOSE);
  let currentFile: string | null = null;
  if (open !== -1 && open > close) {
    const header = text.slice(open, text.indexOf('\n', open) === -1 ? undefined : text.indexOf('\n', open));
    currentFile = PATH_ATTR.exec(header)?.[1] ?? null;
  }
  return {
    chars: text.length,
    words: text.match(/\S+/g)?.length ?? 0,
    currentFile,
    filesWritten: text.split(FILE_CLOSE).length - 1,
  };
}

/**
 * In-memory tracker of what the assistant is doing for each in-flight prompt, keyed by user + a
 * client-generated run id. The client polls `GET /chats/activity/:runId` while it waits for the
 * (request/response) prompt call. Lookups are always scoped to the user, so a run id is useless
 * to anybody else.
 */
export class ActivityService {
  private readonly runs = new Map<string, RunState>();

  constructor(private readonly settings: ActivitySettings) {}

  /** Starts tracking a run. Without a run id the caller gets a reporter that does nothing. */
  start(userId: string, runId?: string | null): ActivityReporter {
    if (!runId) return NOOP_REPORTER;
    this.runs.delete(this.key(userId, runId));
    this.prune(userId, 1);
    const run: RunState = {
      runId,
      userId,
      status: 'running',
      startedAt: Date.now(),
      finishedAt: null,
      steps: [],
      output: null,
      error: null,
    };
    this.runs.set(this.key(userId, runId), run);
    return this.reporterFor(run);
  }

  /** Current state of one of the user's runs, or null when unknown / not started yet / expired. */
  get(userId: string, runId: string): ActivityRunDTO | null {
    this.prune(userId);
    const run = this.runs.get(this.key(userId, runId));
    return run ? this.toDTO(run) : null;
  }

  /* ------------------------------ internals ------------------------------ */

  private key(userId: string, runId: string): string {
    return `${userId}:${runId}`;
  }

  private reporterFor(run: RunState): ActivityReporter {
    const active = () => {
      const last = run.steps[run.steps.length - 1];
      return last && last.status === 'active' ? last : null;
    };
    const close = (status: StepState['status'], detail?: string | null) => {
      const step = active();
      if (!step) return;
      step.status = status;
      step.finishedAt = Date.now();
      if (detail !== undefined) step.detail = detail;
    };
    const running = () => run.status === 'running';

    return {
      step: (key, label, detail = null) => {
        if (!running()) return;
        close('done');
        run.steps.push({ key, label, detail, status: 'active', startedAt: Date.now(), finishedAt: null });
        if (key === 'model') run.output = '';
      },
      detail: (detail) => {
        const step = running() ? active() : null;
        if (step) step.detail = detail;
      },
      complete: (detail) => {
        if (running()) close('done', detail);
      },
      token: (chunk) => {
        if (running() && run.output !== null && typeof chunk === 'string') run.output += chunk;
      },
      finish: () => {
        if (!running()) return;
        close('done');
        run.status = 'done';
        run.finishedAt = Date.now();
      },
      fail: (message) => {
        if (!running()) return;
        close('error');
        run.status = 'error';
        run.error = message;
        run.finishedAt = Date.now();
      },
    };
  }

  /** Drops expired runs everywhere and keeps at most `maxRunsPerUser - room` runs for this user. */
  private prune(userId: string, room = 0): void {
    const now = Date.now();
    const mine: string[] = [];
    for (const [key, run] of this.runs) {
      if (run.finishedAt !== null && now - run.finishedAt > this.settings.retainMs) this.runs.delete(key);
      else if (run.userId === userId) mine.push(key);
    }
    // Map iteration order = insertion order, so the first keys are the oldest runs.
    for (const key of mine.slice(0, Math.max(0, mine.length - Math.max(0, this.settings.maxRunsPerUser - room)))) this.runs.delete(key);
  }

  private toDTO(run: RunState): ActivityRunDTO {
    return {
      runId: run.runId,
      status: run.status,
      startedAt: new Date(run.startedAt).toISOString(),
      finishedAt: iso(run.finishedAt),
      steps: run.steps.map((s) => ({
        key: s.key,
        label: s.label,
        detail: s.detail,
        status: s.status,
        startedAt: new Date(s.startedAt).toISOString(),
        finishedAt: iso(s.finishedAt),
      })),
      output: run.output === null ? null : summariseOutput(run.output),
      error: run.error,
    };
  }
}
