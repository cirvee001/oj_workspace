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

const daysFromNow = (str: string): number =>
  Math.round((new Date(str + 'T00:00:00').getTime() - new Date(TODAY + 'T00:00:00').getTime()) / DAY_MS);
const shortDate = (str: string): string => new Date(str + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/**
 * A date relative to today, for anything that happened or will happen:
 * "Today", "Yesterday", "3 days ago", "Tomorrow", "in 4 days", "12 Mar".
 * For deadlines, where the past means overdue, use dueDate().
 */
export function niceDate(str: string | null | undefined): string {
  if (!str) return '—';
  const days = daysFromNow(str);
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days < 0 && days > -7) return Math.abs(days) + ' days ago';
  if (days > 0 && days < 7) return 'in ' + days + ' days';
  return shortDate(str);
}

/** A deadline relative to today: "Today", "Tomorrow", "in 4 days", "3 days late", "12 Mar". */
export function dueDate(str: string | null | undefined): string {
  if (!str) return '—';
  const days = daysFromNow(str);
  if (days === -1) return '1 day late';
  if (days < 0) return Math.abs(days) + ' days late';
  return niceDate(str);
}

/**
 * How long ago a past date was: "Today", "Yesterday", "3 days ago", "5 weeks ago",
 * "4 months ago", "2 years ago". Use this for history (customer since, last order),
 * never niceDate, which treats the past as overdue ("12 days late").
 */
export function ago(str: string | null | undefined): string {
  if (!str) return '—';
  const days = Math.round((new Date(TODAY + 'T00:00:00').getTime() - new Date(str + 'T00:00:00').getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return days + ' days ago';
  if (days < 60) return Math.round(days / 7) + ' weeks ago';
  if (days < 365) return Math.round(days / 30) + ' months ago';
  const years = Math.floor(days / 365);
  return years === 1 ? 'A year ago' : years + ' years ago';
}

/** "21 March 2025". */
export const longDate = (str: string | null | undefined): string =>
  str ? new Date(str + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

/** Current wall-clock time as `HH:MM`. */
export const clockTime = (): string =>
  new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** `HH:MM` for an epoch timestamp. */
export const timeOf = (ms: number): string =>
  new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const isBirthdayToday = (birthday: string | undefined): boolean =>
  !!birthday && birthday.slice(5) === TODAY.slice(5);
