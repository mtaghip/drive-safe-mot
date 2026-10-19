import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, bankHolidays, bookingRange, closedReason, isIsoDate, isOpenDay, monthsInRange, nextFreeSlot, todayIso } from './schedule.ts';
import { makeSession, sessionValid } from './security.ts';
import { validateBooking, validatePhoneBooking } from './validation.ts';

test('today uses UK time, not UTC', () => {
  // 23:30 UTC on 19 Oct is 00:30 on 20 Oct in London (BST).
  assert.equal(todayIso(new Date('2026-10-19T23:30:00Z')), '2026-10-20');
  // In winter (GMT) the two agree.
  assert.equal(todayIso(new Date('2026-12-01T23:30:00Z')), '2026-12-01');
});

test('booking range starts tomorrow and lasts four weeks', () => {
  const r = bookingRange(new Date('2026-10-19T10:00:00Z'));
  assert.deepEqual(r, { start: '2026-10-20', end: '2026-11-16' });
});

test('addDays crosses month and year ends', () => {
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29');
});

test('Sundays and Saturdays are closed', () => {
  assert.equal(isOpenDay('2026-10-24'), false); // Saturday
  assert.equal(isOpenDay('2026-10-25'), false); // Sunday
  assert.equal(isOpenDay('2026-10-26'), true);  // Monday
});

test('isIsoDate rejects impossible dates', () => {
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026-2-3'), false);
  assert.equal(isIsoDate('2026-10-20'), true);
});

test('monthsInRange lists each month touched', () => {
  assert.deepEqual(monthsInRange({ start: '2026-10-20', end: '2026-11-16' }), ['2026-10-01', '2026-11-01']);
  assert.deepEqual(monthsInRange({ start: '2026-12-10', end: '2027-01-06' }), ['2026-12-01', '2027-01-01']);
});

test('nextFreeSlot skips closed and full days', () => {
  const r = { start: '2026-10-23', end: '2026-11-19' }; // Friday
  const full = [9, 10, 11, 12, 13, 14, 15, 16];
  assert.deepEqual(nextFreeSlot(r, { taken: { '2026-10-23': full, '2026-10-26': [9] }, closed: [] }), { date: '2026-10-26', hour: 10 });
  // A day closed by staff is skipped too.
  assert.deepEqual(nextFreeSlot(r, { taken: { '2026-10-23': full }, closed: ['2026-10-26'] }), { date: '2026-10-27', hour: 9 });
});

const now = new Date('2026-10-19T10:00:00Z');
const good = { service: 'mot', date: '2026-10-20', hour: 9, name: ' Sarah Miles ', phone: '07700 900123', email: 'sarah@example.com', reg: 'ab12  cde' };

test('valid booking is normalised', () => {
  const r = validateBooking(good, now);
  assert.ok(r.ok);
  assert.equal(r.value.reg, 'AB12 CDE');
  assert.equal(r.value.name, 'Sarah Miles');
});

test('rejects today, closed days, out-of-range days and bad hours', () => {
  for (const patch of [{ date: '2026-10-19' }, { date: '2026-10-25' }, { date: '2026-11-17' }, { hour: 17 }, { hour: '9' }]) {
    const r = validateBooking({ ...good, ...patch }, now);
    assert.ok(!r.ok && r.errors.when, JSON.stringify(patch));
  }
});

test('reports each bad field', () => {
  const r = validateBooking({ service: 'x', date: null, hour: null, name: '', phone: '123', email: 'nope', reg: '' }, now);
  assert.ok(!r.ok);
  assert.deepEqual(Object.keys(r.errors).sort(), ['email', 'name', 'phone', 'reg', 'service', 'when']);
});

// Published England and Wales dates (gov.uk/bank-holidays).
const PUBLISHED: Record<number, string[]> = {
  2026: ['2026-01-01', '2026-04-03', '2026-04-06', '2026-05-04', '2026-05-25', '2026-08-31', '2026-12-25', '2026-12-28'],
  2027: ['2027-01-01', '2027-03-26', '2027-03-29', '2027-05-03', '2027-05-31', '2027-08-30', '2027-12-27', '2027-12-28'],
  2028: ['2028-01-03', '2028-04-14', '2028-04-17', '2028-05-01', '2028-05-29', '2028-08-28', '2028-12-25', '2028-12-26'],
};

test('bank holidays match the published dates, including weekend substitutes', () => {
  for (const [y, days] of Object.entries(PUBLISHED)) assert.deepEqual([...bankHolidays(Number(y))].sort(), days, y);
});

test('bank holidays are closed and labelled', () => {
  assert.equal(isOpenDay('2026-12-25'), false);
  assert.equal(isOpenDay('2026-12-28'), false);
  assert.equal(closedReason('2026-12-28', []), 'Holiday');
  assert.equal(closedReason('2026-12-26', []), 'Closed'); // Saturday
  assert.equal(closedReason('2026-12-29', ['2026-12-29']), 'Closed');
  assert.equal(closedReason('2026-12-29', []), null);
});

test('online booking refuses a bank holiday', () => {
  const r = validateBooking({ ...good, date: '2026-12-28' }, new Date('2026-12-10T10:00:00Z'));
  assert.ok(!r.ok && r.errors.when);
});

test('phone bookings allow today, beyond 4 weeks, and no email', () => {
  for (const date of ['2026-10-19', '2027-03-01']) {
    const r = validatePhoneBooking({ ...good, date, email: '' }, now);
    assert.ok(r.ok, date);
  }
  assert.ok(!validatePhoneBooking({ ...good, date: '2026-10-18' }, now).ok);
  assert.ok(!validatePhoneBooking({ ...good, email: 'bad' }, now).ok);
});

test('staff sessions are signed and expire', () => {
  const t = Date.now(), s = makeSession('correct horse battery', t);
  assert.ok(sessionValid(s, 'correct horse battery', t));
  assert.ok(!sessionValid(s, 'a different password', t));
  assert.ok(!sessionValid(s.replace(/^\d+/, String(t + 1e12)), 'correct horse battery', t));
  assert.ok(!sessionValid(s, 'correct horse battery', t + 15 * 86_400_000));
  assert.ok(!sessionValid(undefined, 'correct horse battery', t));
});
