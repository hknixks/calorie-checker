/** Local calendar day as YYYY-MM-DD. Never use toISOString here — that is UTC. */
export function dateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, days: number): string {
  const date = parseDateKey(key);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function isToday(key: string): boolean {
  return key === dateKey();
}

export function dayLabel(key: string): string {
  if (key === dateKey()) return 'Today';
  if (key === addDays(dateKey(), -1)) return 'Yesterday';
  if (key === addDays(dateKey(), 1)) return 'Tomorrow';
  return parseDateKey(key).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function shortLabel(key: string): string {
  return parseDateKey(key).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

/** Oldest first, ending on endKey inclusive. */
export function lastNDays(n: number, endKey: string = dateKey()): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i -= 1) out.push(addDays(endKey, -i));
  return out;
}

/** Monday of the week containing key. */
export function weekStart(key: string): string {
  const date = parseDateKey(key);
  const shift = (date.getDay() + 6) % 7;
  return addDays(key, -shift);
}

export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/** "07:30" -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
