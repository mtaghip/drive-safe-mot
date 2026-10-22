import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gbp, nextMotDue, parsePence, totals, type Line } from './invoice-calc.ts';

const line = (unitPence: number, quantity = 1, vatRate: number | null = 20, kind: Line['kind'] = 'part'): Line =>
  ({ kind, description: 'x', quantity, unitPence, vatRate });

test('totals: VAT per line, MOT outside VAT, pence rounding', () => {
  const t = totals([line(4500, 1, null, 'mot'), line(6000, 1.5, 20, 'labour'), line(1999, 3)]);
  // 45.00 + 90.00 + 59.97 = 194.97 net; VAT 18.00 + 11.99 (59.97 × 20% = 11.994)
  assert.equal(t.net, 19497);
  assert.equal(t.vat, 1800 + 1199);
  assert.equal(t.total, 19497 + 2999);
  assert.deepEqual(t.byRate.find(r => r.rate === null), { rate: null, net: 4500, vat: 0 });
});

test('not VAT registered: no VAT at all', () => {
  const t = totals([line(4500, 1, null), line(10000, 1, null)]);
  assert.equal(t.vat, 0);
  assert.equal(t.total, 14500);
});

test('money formatting and parsing', () => {
  assert.equal(gbp(123450), '£1,234.50');
  assert.equal(gbp(-500), '−£5.00');
  assert.equal(parsePence('45'), 4500);
  assert.equal(parsePence('£1,045.5'), 104550);
  assert.equal(parsePence('0.07'), 7);
  assert.equal(parsePence('abc'), null);
  assert.equal(parsePence('1.234'), null);
});

test('next MOT date follows the DVSA one-month rule', () => {
  // Tested 10 days early: keeps the renewal date.
  assert.equal(nextMotDue('2026-05-05', '2026-05-15'), '2027-05-15');
  // Earliest day that keeps it: a month minus a day before (16 Apr for 15 May).
  assert.equal(nextMotDue('2026-04-16', '2026-05-15'), '2027-05-15');
  // One day earlier: a fresh year from the test, less a day.
  assert.equal(nextMotDue('2026-04-15', '2026-05-15'), '2027-04-14');
  // Expired, or no previous MOT: a year less a day from the test.
  assert.equal(nextMotDue('2026-06-01', '2026-05-15'), '2027-05-31');
  assert.equal(nextMotDue('2026-06-01', null), '2027-05-31');
  // Short months and leap days.
  // 31 Mar expiry: the window opens 1 Mar (a month before is 28 Feb, plus a day).
  assert.equal(nextMotDue('2026-03-01', '2026-03-31'), '2027-03-31');
  assert.equal(nextMotDue('2026-02-28', '2026-03-31'), '2027-02-27');
  assert.equal(nextMotDue('2028-02-29', null), '2029-02-27');
});
