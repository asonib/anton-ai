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
