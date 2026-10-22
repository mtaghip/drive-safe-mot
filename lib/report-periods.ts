// Report periods: presets, custom ranges and how to group them. Pure, so tested directly.
import { addDays } from './schedule.ts';

export type Group = 'day' | 'week' | 'month';
export const PRESETS = [
  { value: 'this-month', label: 'This month' },
  { value: 'last-month', label: 'Last month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'this-year', label: 'This year' },
  { value: 'last-12-months', label: 'Last 12 months' },
] as const;
export type Period = { from: string; to: string; group: Group; preset: string; label: string };

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const monthStart = (iso: string, back = 0) => {
  const [y, m] = iso.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 - back, 1));
  return d.toISOString().slice(0, 10);
};
const monthEnd = (iso: string) => addDays(monthStart(iso, -1), -1);
export const spanDays = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000) + 1;

/** Day for a month or less, week up to about three months, month beyond. */
export const defaultGroup = (from: string, to: string): Group => (spanDays(from, to) <= 31 ? 'day' : spanDays(from, to) <= 92 ? 'week' : 'month');

export function resolvePeriod(q: { preset?: string; from?: string; to?: string; group?: string }, today: string): Period {
  let from: string, to: string, preset = q.preset ?? 'this-month';
  if (preset === 'custom' && q.from && q.to && ISO.test(q.from) && ISO.test(q.to) && q.from <= q.to && spanDays(q.from, q.to) <= 3 * 366) {
    ({ from, to } = q as { from: string; to: string });
  } else {
    if (!PRESETS.some(p => p.value === preset)) preset = 'this-month';
    switch (preset) {
      case 'last-month': from = monthStart(today, 1); to = monthEnd(from); break;
      case 'last-3-months': from = monthStart(today, 2); to = today; break;
      case 'this-year': from = today.slice(0, 4) + '-01-01'; to = today; break;
      case 'last-12-months': from = monthStart(today, 11); to = today; break;
      default: from = monthStart(today); to = today;
    }
  }
  const group = (['day', 'week', 'month'] as const).find(g => g === q.group) ?? defaultGroup(from, to);
  const label = PRESETS.find(p => p.value === preset)?.label ?? 'Custom dates';
  return { from, to, group, preset, label };
}

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { ...o, timeZone: 'UTC' });
/** Label for a bucket starting on `iso`. Weeks start on Monday. */
export function bucketLabel(iso: string, group: Group, long = false) {
  if (group === 'month') return fmt(iso, { month: long ? 'long' : 'short', year: 'numeric' });
  if (group === 'week') return (long ? 'Week of ' : 'w/c ') + fmt(iso, { day: 'numeric', month: 'short' });
  return fmt(iso, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' });
}
