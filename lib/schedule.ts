// Date rules for the booking calendar. Days are ISO strings ("2026-10-20") in UK time,
// so the server and every browser agree on what "tomorrow" is.
import { BOOKING } from './site.ts';

export const pad = (n: number) => String(n).padStart(2, '0');

const toUtc = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const fromUtc = (d: Date) => d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());

export const isIsoDate = (s: unknown): s is string =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && fromUtc(toUtc(s)) === s;

export function todayIso(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: BOOKING.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function addDays(iso: string, n: number): string {
  const d = toUtc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

/** 0 = Sunday … 6 = Saturday. */
export const weekday = (iso: string) => toUtc(iso).getUTCDay();

export function bookingRange(now = new Date()) {
  const start = addDays(todayIso(now), 1);
  return { start, end: addDays(start, BOOKING.weeks * 7 - 1) };
}

export function isOpenDay(iso: string): boolean {
  const w = weekday(iso);
  if (w === 0) return false;
  if (w === 6) return BOOKING.openSaturday;
  return true;
}

export const inRange = (iso: string, r: { start: string; end: string }) => iso >= r.start && iso <= r.end;

export const isSlotHour = (h: unknown): h is number => typeof h === 'number' && BOOKING.hours.includes(h);

/** First day of each month the range touches, as ISO strings. */
export function monthsInRange(r: { start: string; end: string }): string[] {
  const out: string[] = [];
  let [y, m] = r.start.split('-').map(Number);
  while (true) {
    const first = y + '-' + pad(m) + '-01';
    if (first > r.end) break;
    out.push(first);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

export const daysInMonth = (firstIso: string) => {
  const [y, m] = firstIso.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) => toUtc(iso).toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
export const fmtLong = (iso: string) => fmt(iso, { weekday: 'long', day: 'numeric', month: 'long' });
export const fmtShort = (iso: string) => fmt(iso, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtMonth = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' });
export const fmtHour = (h: number) => pad(h) + ':00';

export type Taken = Record<string, number[]>;

export const freeHours = (iso: string, taken: Taken) => BOOKING.hours.filter(h => !taken[iso]?.includes(h));

/** Earliest bookable slot in the range, or null when everything is full. */
export function nextFreeSlot(r: { start: string; end: string }, taken: Taken): { date: string; hour: number } | null {
  for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
    if (!isOpenDay(d)) continue;
    const h = freeHours(d, taken)[0];
    if (h != null) return { date: d, hour: h };
  }
  return null;
}
