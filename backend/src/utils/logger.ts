import { env } from '../config/env';

type Level = 'debug' | 'info' | 'warn' | 'error';
const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const threshold = ORDER[env.LOG_LEVEL];

function write(level: Level, message: string, meta?: Record<string, unknown>): void {
  if (ORDER[level] < threshold) return;
  const entry = { ts: new Date().toISOString(), level, msg: message, ...meta };
  const line = env.NODE_ENV === 'production'
    ? JSON.stringify(entry)
    : `${entry.ts} ${level.toUpperCase().padEnd(5)} ${message}${meta && Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''}`;
  // eslint-disable-next-line no-console
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

/** Minimal structured logger (JSON in production, readable lines in dev). */
export const logger = {
  debug: (msg: string, meta?: Record<string, unknown>) => write('debug', msg, meta),
  info: (msg: string, meta?: Record<string, unknown>) => write('info', msg, meta),
  warn: (msg: string, meta?: Record<string, unknown>) => write('warn', msg, meta),
  error: (msg: string, meta?: Record<string, unknown>) => write('error', msg, meta),
};
