import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, bookingRange, isIsoDate, isOpenDay, monthsInRange, nextFreeSlot, todayIso } from './schedule.ts';
import { validateBooking } from './validation.ts';

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
  assert.deepEqual(nextFreeSlot(r, { '2026-10-23': full, '2026-10-26': [9] }), { date: '2026-10-26', hour: 10 });
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
