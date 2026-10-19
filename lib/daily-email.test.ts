import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDailyEmail, type DaySchedule } from './daily-email.ts';
import { ukHour } from './schedule.ts';
import type { StoredBooking } from './store.ts';

const booking = (hour: number, extra: Partial<StoredBooking> = {}): StoredBooking => ({
  id: hour, ref: 'DS-AAAA' + hour, service: 'mot', date: '2026-10-20', hour, name: 'Sarah Miles', phone: '07700 900123',
  email: 's@example.com', reg: 'AB12 CDE', source: 'online', createdAt: '2026-10-19 10:00', ...extra,
});
const week = Array.from({ length: 7 }, (_, i) => ({ date: `2026-10-2${1 + i}`, booked: i, closed: i === 3 ? 'Saturday' : null }));
const base: DaySchedule = { date: '2026-10-20', closed: null, bookings: [], blocks: [], week };

test('lists every slot with bookings, blocks and free hours', () => {
  const m = buildDailyEmail({ ...base, bookings: [booking(9), booking(14, { service: 'dpf', source: 'phone' })], blocks: [{ id: 1, date: '2026-10-20', hour: 10, note: 'Courtesy car' }] });
  assert.equal(m.subject, "Today's bookings · Tue 20 Oct · 2 of 8 slots booked");
  assert.match(m.text, /09:00–10:00 {2}MOT test · AB12 CDE · Sarah Miles · 07700 900123 · DS-AAAA9/);
  assert.match(m.text, /10:00–11:00 {2}Blocked: Courtesy car/);
  assert.match(m.text, /11:00–12:00 {2}Free/);
  assert.match(m.text, /14:00–15:00 {2}DPF clean .* phone booking/);
  assert.match(m.text, /Sat 24 Oct: closed \(Saturday\)/);
  assert.match(m.html, /2 of 8 slots booked/);
});

test('escapes customer details in the HTML version', () => {
  const m = buildDailyEmail({ ...base, bookings: [booking(9, { name: '<script>alert(1)</script>' })] });
  assert.ok(!m.html.includes('<script>'));
  assert.ok(m.html.includes('&lt;script&gt;'));
});

test('closed day says so, and flags bookings still on the diary', () => {
  const empty = buildDailyEmail({ ...base, closed: 'Bank holiday' });
  assert.equal(empty.subject, 'Closed today (Bank holiday) · Tue 20 Oct');
  assert.match(empty.html, /No bookings today/);
  const stuck = buildDailyEmail({ ...base, closed: 'Closed by staff: Training', bookings: [booking(11)] });
  assert.equal(stuck.subject, 'Closed today (Closed by staff) · Tue 20 Oct · 1 booking still on the diary');
  assert.match(stuck.text, /Call the customers/);
  assert.ok(!/Free/.test(stuck.text), 'free slots are not listed on a closed day');
});

test('8:30 UK falls in the sending hour from either UTC trigger, across clock changes', () => {
  // Summer (BST): the 07:30 UTC trigger is 08:30 UK; the 08:30 UTC one is 09:30 and is ignored.
  assert.equal(ukHour(new Date('2026-07-01T07:30:00Z')), 8);
  assert.equal(ukHour(new Date('2026-07-01T08:30:00Z')), 9);
  // Winter (GMT): the 07:30 UTC trigger is ignored; the 08:30 UTC one is 08:30 UK.
  assert.equal(ukHour(new Date('2026-12-01T07:30:00Z')), 7);
  assert.equal(ukHour(new Date('2026-12-01T08:30:00Z')), 8);
});
