export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Groups sidebar items: Today / Yesterday / Previous 7 days / Older */
export function relativeBucket(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const day = 24 * 60 * 60 * 1000;
  const t = d.getTime();
  if (t >= startOfToday) return 'Today';
  if (t >= startOfToday - day) return 'Yesterday';
  if (t >= startOfToday - 7 * day) return 'Previous 7 days';
  if (t >= startOfToday - 30 * day) return 'Previous 30 days';
  return 'Older';
}

/** Short date, e.g. "30 Oct 2026". */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Compact count, e.g. 152300 → "152.3k". */
export function formatCount(n: number): string {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** "just now", "5 min ago", "3 h ago", "2 days ago", else a short date. */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60_000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return d === 1 ? 'yesterday' : `${d} days ago`;
  return formatDate(iso);
}
