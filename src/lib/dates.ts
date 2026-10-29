export const DAY_MS = 86_400_000;

/** "Today" is fixed at 09:00 local when the app loads, like the shop opening. */
export const today = (() => {
  const t = new Date();
  t.setHours(9, 0, 0, 0);
  return t;
})();

/** ISO `YYYY-MM-DD` for a date. */
export const iso = (dt: Date): string => dt.toISOString().slice(0, 10);

/** The date `n` days from today (negative for the past). */
export const daysFromToday = (n: number): Date => new Date(today.getTime() + n * DAY_MS);

/** ISO date `n` days from today. */
export const isoFromToday = (n: number): string => iso(daysFromToday(n));

/** Today's ISO date. */
export const TODAY = iso(today);

/** First day of the current month, as an ISO date. */
export const MONTH_START = TODAY.slice(0, 8) + '01';

/** Human relative date: "Today", "Tomorrow", "3 days late", "in 4 days", "12 Mar". */
export function niceDate(str: string | null | undefined): string {
  if (!str) return '—';
  const t = new Date(str + 'T00:00:00');
  const n = new Date(TODAY + 'T00:00:00');
  const days = Math.round((t.getTime() - n.getTime()) / DAY_MS);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0) return Math.abs(days) + ' days late';
  if (days < 7) return 'in ' + days + ' days';
  return t.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/** Current wall-clock time as `HH:MM`. */
export const clockTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** `HH:MM` for an epoch timestamp. */
export const timeOf = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const isBirthdayToday = (birthday: string | undefined): boolean =>
  !!birthday && birthday.slice(5) === TODAY.slice(5);
