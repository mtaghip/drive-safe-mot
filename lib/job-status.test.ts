import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canMove, isOpen, moveLabel, nextStatuses, STATUSES } from './job-status.ts';

test('every status has somewhere to go, and the main path works', () => {
  for (const s of STATUSES) assert.ok(nextStatuses(s.value).length > 0, s.value);
  const path = ['booked', 'in_progress', 'waiting_parts', 'in_progress', 'ready', 'collected'] as const;
  for (let i = 1; i < path.length; i++) assert.ok(canMove(path[i - 1], path[i]), `${path[i - 1]} → ${path[i]}`);
});

test('no skipping straight to collected, and finished jobs reopen sensibly', () => {
  assert.ok(!canMove('booked', 'collected'));
  assert.ok(!canMove('in_progress', 'collected'));
  assert.ok(!canMove('collected', 'cancelled'));
  assert.deepEqual(nextStatuses('collected'), ['ready']);
  assert.deepEqual(nextStatuses('cancelled'), ['booked']);
  assert.equal(moveLabel('booked', 'in_progress'), 'Start work');
  assert.equal(moveLabel('waiting_parts', 'in_progress'), 'Parts arrived, carry on');
  assert.ok(isOpen('waiting_parts') && !isOpen('collected') && !isOpen('cancelled'));
});
