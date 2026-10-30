/**
 * Live agent activity (the "what is the assistant doing" bubble). Runs are kept in memory only —
 * they are progress telemetry, not data — and dropped a little while after they finish.
 */
export interface ActivitySettings {
  /** How long a finished run stays readable so the last poll sees its final state. */
  retainMs: number;
  /** Runs kept per user (oldest dropped first) — bounds memory if a client never stops sending. */
  maxRunsPerUser: number;
}

export const activitySettings: ActivitySettings = Object.freeze({
  retainMs: 2 * 60_000,
  maxRunsPerUser: 10,
});
