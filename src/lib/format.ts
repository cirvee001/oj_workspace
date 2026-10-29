/** Naira from kobo: 15000000 → "₦150,000". */
export const naira = (kobo: number): string =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });

/** Compact naira: anything from ₦1m up shows as "₦1.5m". */
export const nairaShort = (kobo: number): string =>
  kobo >= 100_000_000
    ? '₦' + (kobo / 100_000_000).toFixed(1).replace(/\.0$/, '') + 'm'
    : naira(kobo);

/** Quantity with at most three decimals and no trailing zeros. */
export const qty = (n: number | null | undefined): string =>
  (Math.round((n ?? 0) * 1000) / 1000).toString();

/** Round to one decimal place. */
export const round1 = (n: number): number => Math.round(n * 10) / 10;

export const initials = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

export const firstName = (name: string): string => name.split(' ')[0] ?? name;

/** "1 post" / "3 posts". */
export const plural = (n: number, one: string, many = one + 's'): string =>
  n + ' ' + (n === 1 ? one : many);

/** Naira typed into a form → kobo. */
export const toKobo = (naira: string | number): number => Math.round(Number(naira || 0) * 100);
