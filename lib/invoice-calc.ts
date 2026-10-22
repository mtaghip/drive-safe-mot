// Invoice arithmetic and MOT dates. Pure, so every rule is tested directly.
// Money is held in whole pence to avoid rounding drift.

export type LineKind = 'labour' | 'part' | 'mot' | 'other';
export const LINE_KINDS: { value: LineKind; label: string }[] = [
  { value: 'labour', label: 'Labour' },
  { value: 'part', label: 'Part' },
  { value: 'mot', label: 'MOT test' },
  { value: 'other', label: 'Other' },
];
export const PAYMENT_METHODS = [
  { value: 'card', label: 'Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'other', label: 'Other' },
];
export const paymentLabel = (m: string | null) => PAYMENT_METHODS.find(p => p.value === m)?.label ?? m ?? '';

export type Line = { kind: LineKind; description: string; quantity: number; unitPence: number; vatRate: number | null };

export const lineNet = (l: Line) => Math.round(l.quantity * l.unitPence);
export const lineVat = (l: Line) => (l.vatRate == null ? 0 : Math.round((lineNet(l) * l.vatRate) / 100));

export function totals(lines: Line[]) {
  let net = 0, vat = 0;
  const byRate = new Map<string, { rate: number | null; net: number; vat: number }>();
  for (const l of lines) {
    const n = lineNet(l), v = lineVat(l);
    net += n; vat += v;
    const key = String(l.vatRate);
    const r = byRate.get(key) ?? { rate: l.vatRate, net: 0, vat: 0 };
    r.net += n; r.vat += v;
    byRate.set(key, r);
  }
  return { net, vat, total: net + vat, byRate: [...byRate.values()] };
}

/** "£1,234.50"; negative amounts as "−£5.00". */
export function gbp(pence: number) {
  const s = (Math.abs(pence) / 100).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (pence < 0 ? '−£' : '£') + s;
}

/** "45", "45.5", "£1,045.50" → pence. Null if it isn't an amount. */
export function parsePence(input: string): number | null {
  const s = input.replace(/[£,\s]/g, '');
  if (!/^-?\d+(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(Number(s) * 100);
}

const toUtc = (iso: string) => new Date(iso + 'T00:00:00Z');
const iso = (d: Date) => d.toISOString().slice(0, 10);
function addYears(isoDate: string, n: number) {
  const d = toUtc(isoDate), day = d.getUTCDate();
  d.setUTCFullYear(d.getUTCFullYear() + n);
  if (d.getUTCDate() !== day) d.setUTCDate(0); // 29 Feb → 28 Feb
  return iso(d);
}
function addDays(isoDate: string, n: number) {
  const d = toUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
}
function minusMonthPlusDay(isoDate: string) {
  const d = toUtc(isoDate), day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() - 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return addDays(iso(d), 1);
}

/**
 * Expiry of a new MOT certificate (DVSA rule): tested up to a month minus a day
 * before the old one runs out, it keeps the old renewal date a year on;
 * otherwise it runs for a year less a day from the test.
 */
export function nextMotDue(testDate: string, currentExpiry: string | null): string {
  if (currentExpiry && testDate <= currentExpiry && testDate >= minusMonthPlusDay(currentExpiry)) {
    return addYears(currentExpiry, 1);
  }
  return addDays(addYears(testDate, 1), -1);
}
