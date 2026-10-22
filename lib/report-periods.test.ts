import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bucketLabel, defaultGroup, resolvePeriod } from './report-periods.ts';

const today = '2026-03-15';

test('presets', () => {
  assert.deepEqual(resolvePeriod({}, today), { from: '2026-03-01', to: '2026-03-15', group: 'day', preset: 'this-month', label: 'This month' });
  assert.equal(resolvePeriod({ preset: 'last-month' }, today).from, '2026-02-01');
  assert.equal(resolvePeriod({ preset: 'last-month' }, today).to, '2026-02-28');
  assert.equal(resolvePeriod({ preset: 'last-month' }, '2026-01-10').from, '2025-12-01', 'crosses the year');
  assert.equal(resolvePeriod({ preset: 'last-month' }, '2026-01-10').to, '2025-12-31');
  assert.equal(resolvePeriod({ preset: 'last-3-months' }, today).from, '2026-01-01');
  assert.equal(resolvePeriod({ preset: 'last-3-months' }, today).group, 'week');
  assert.equal(resolvePeriod({ preset: 'this-year' }, today).from, '2026-01-01');
  assert.equal(resolvePeriod({ preset: 'last-12-months' }, today).from, '2025-04-01');
  assert.equal(resolvePeriod({ preset: 'last-12-months' }, today).group, 'month');
});

test('custom ranges are checked; bad ones fall back to this month', () => {
  const c = resolvePeriod({ preset: 'custom', from: '2026-01-05', to: '2026-01-20', group: 'week' }, today);
  assert.deepEqual([c.from, c.to, c.group, c.label], ['2026-01-05', '2026-01-20', 'week', 'Custom dates']);
  assert.equal(resolvePeriod({ preset: 'custom', from: '2026-02-01', to: '2026-01-01' }, today).preset, 'this-month');
  assert.equal(resolvePeriod({ preset: 'custom', from: 'nope', to: '2026-01-01' }, today).from, '2026-03-01');
  assert.equal(resolvePeriod({ preset: 'bogus' }, today).preset, 'this-month');
  assert.equal(resolvePeriod({ group: 'year' }, today).group, 'day', 'unknown grouping ignored');
});

test('grouping and labels', () => {
  assert.equal(defaultGroup('2026-01-01', '2026-01-31'), 'day');
  assert.equal(defaultGroup('2026-01-01', '2026-03-31'), 'week');
  assert.equal(defaultGroup('2026-01-01', '2026-04-02'), 'week', '92 days');
  assert.equal(defaultGroup('2026-01-01', '2026-04-03'), 'month');
  assert.equal(bucketLabel('2026-03-02', 'week'), 'w/c 2 Mar');
  assert.equal(bucketLabel('2026-03-01', 'month', true), 'March 2026');
  assert.equal(bucketLabel('2026-03-02', 'day', true), 'Monday 2 March');
});
