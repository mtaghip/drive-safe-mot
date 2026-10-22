import { test } from 'node:test';
import assert from 'node:assert/strict';
import { firstReminderDay, ruleFor } from './reminder-rules.ts';

test('MOT reminders: 30-day window, then 7-day window, never overlapping', () => {
  const due = '2026-11-30';
  assert.equal(ruleFor('mot_due', due, '2026-10-30'), null, '31 days out: too early');
  assert.equal(ruleFor('mot_due', due, '2026-10-31')?.kind, 'mot-30');
  assert.equal(ruleFor('mot_due', due, '2026-11-22')?.kind, 'mot-30', '8 days out');
  assert.equal(ruleFor('mot_due', due, '2026-11-23')?.kind, 'mot-7');
  assert.equal(ruleFor('mot_due', due, '2026-11-30')?.kind, 'mot-7', 'on the day');
  assert.equal(ruleFor('mot_due', due, '2026-12-01'), null, 'after it ran out');
});

test('service reminder 14 days before', () => {
  assert.equal(ruleFor('service_due', '2026-11-30', '2026-11-15'), null);
  assert.equal(ruleFor('service_due', '2026-11-30', '2026-11-16')?.kind, 'service-14');
  assert.equal(firstReminderDay('service_due', '2026-11-30'), '2026-11-16');
  assert.equal(firstReminderDay('mot_due', '2026-11-30'), '2026-10-31');
});
