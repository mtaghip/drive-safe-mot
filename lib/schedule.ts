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

/** Easter Sunday (Anonymous Gregorian algorithm). */
function easter(y: number): string {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return y + '-' + pad(month) + '-' + pad(day);
}

const isWeekend = (iso: string) => weekday(iso) === 0 || weekday(iso) === 6;

/** Monday on or after / before the given day. */
const mondayFrom = (iso: string, dir: 1 | -1) => { let d = iso; while (weekday(d) !== 1) d = addDays(d, dir); return d; };

const bankHolidayCache = new Map<number, Set<string>>();

/**
 * England and Wales bank holidays, including substitute days when one falls at a weekend.
 * One-off holidays (coronations, jubilees) aren't predictable: close those days from the staff page.
 */
export function bankHolidays(y: number): Set<string> {
  const cached = bankHolidayCache.get(y);
  if (cached) return cached;
  const days = new Set<string>();
  // Fixed-date holidays keep their weekday date; weekend ones move to the next free weekday.
  const placeFixed = (dates: string[]) => {
    const moving = dates.filter(isWeekend);
    for (const d of dates) if (!isWeekend(d)) days.add(d);
    for (const d of moving) {
      let s = d;
      while (isWeekend(s) || days.has(s)) s = addDays(s, 1);
      days.add(s);
    }
  };
  placeFixed([y + '-01-01']);
  const e = easter(y);
  days.add(addDays(e, -2)).add(addDays(e, 1));
  days.add(mondayFrom(y + '-05-01', 1)).add(mondayFrom(y + '-05-31', -1)).add(mondayFrom(y + '-08-31', -1));
  placeFixed([y + '-12-25', y + '-12-26']);
  bankHolidayCache.set(y, days);
  return days;
}

export const isBankHoliday = (iso: string) => bankHolidays(Number(iso.slice(0, 4))).has(iso);

/** Regular opening days. Days closed from the staff page are checked separately. */
export function isOpenDay(iso: string): boolean {
  const w = weekday(iso);
  if (w === 0) return false;
  if (w === 6 && !BOOKING.openSaturday) return false;
  if (BOOKING.closedOnBankHolidays && isBankHoliday(iso)) return false;
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
export const fmtDate = (iso: string) => fmt(iso, { day: 'numeric', month: 'short', year: 'numeric' });
export const fmtMonth = (iso: string) => fmt(iso, { month: 'long', year: 'numeric' });
export const fmtHour = (h: number) => pad(h) + ':00';

/** Hours already booked or blocked, by day. */
export type Taken = Record<string, number[]>;
/** What the calendar needs beyond the fixed rules: taken slots and days closed by staff. */
export type Availability = { taken: Taken; closed: string[] };

export const freeHours = (iso: string, taken: Taken) => BOOKING.hours.filter(h => !taken[iso]?.includes(h));

/** Why a regular closed day is closed, for staff-facing text. Staff-closed days are separate. */
export function closureLabel(iso: string): 'Bank holiday' | 'Saturday' | 'Sunday' | null {
  if (isOpenDay(iso)) return null;
  if (BOOKING.closedOnBankHolidays && isBankHoliday(iso)) return 'Bank holiday';
  return weekday(iso) === 0 ? 'Sunday' : 'Saturday';
}

/** Current hour (0–23) in UK time. */
export const ukHour = (now = new Date()) =>
  Number(new Intl.DateTimeFormat('en-GB', { timeZone: BOOKING.timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now));

/** Why a day can't be booked, or null when it can. */
export function closedReason(iso: string, closed: string[]): 'Closed' | 'Holiday' | null {
  if (BOOKING.closedOnBankHolidays && isBankHoliday(iso) && !isWeekend(iso)) return 'Holiday';
  if (!isOpenDay(iso) || closed.includes(iso)) return 'Closed';
  return null;
}

/** Earliest bookable slot in the range, or null when everything is full. */
export function nextFreeSlot(r: { start: string; end: string }, a: Availability): { date: string; hour: number } | null {
  for (let d = r.start; d <= r.end; d = addDays(d, 1)) {
    if (closedReason(d, a.closed)) continue;
    const h = freeHours(d, a.taken)[0];
    if (h != null) return { date: d, hour: h };
  }
  return null;
}
