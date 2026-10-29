import type { User } from '../api/types';

const TOKEN_KEY = 'aichat.token';
const USER_KEY = 'aichat.user';
const THEME_KEY = 'aichat.theme';
const PROVIDER_KEY = 'aichat.provider';

const safe = <T>(fn: () => T, fallback: T): T => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

/** Thin wrapper over localStorage so the rest of the app never touches it directly. */
export const storage = {
  getToken: () => safe(() => localStorage.getItem(TOKEN_KEY), null),
  getUser: (): User | null => safe(() => JSON.parse(localStorage.getItem(USER_KEY) ?? 'null') as User | null, null),
  setSession(token: string, user: User) {
    safe(() => {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }, undefined);
  },
  clearSession() {
    safe(() => {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    }, undefined);
  },
  getTheme: () => safe(() => localStorage.getItem(THEME_KEY), null),
  setTheme: (mode: string) => safe(() => localStorage.setItem(THEME_KEY, mode), undefined),
  getProvider: () => safe(() => localStorage.getItem(PROVIDER_KEY), null),
  setProvider: (p: string) => safe(() => localStorage.setItem(PROVIDER_KEY, p), undefined),
};
