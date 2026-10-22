import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from './passwords.ts';
import { can } from './roles.ts';

test('passwords hash and verify; wrong ones fail', async () => {
  const h = await hashPassword('correct horse battery');
  assert.match(h, /^scrypt\$16384\$8\$1\$/);
  assert.ok(await verifyPassword('correct horse battery', h));
  assert.ok(!(await verifyPassword('correct horse batterz', h)));
  assert.notEqual(h, await hashPassword('correct horse battery'), 'salted');
  assert.ok(!(await verifyPassword('anything', DUMMY_HASH)));
  assert.ok(!(await verifyPassword('anything', 'garbage')));
});

test('password rules', () => {
  assert.ok(passwordProblem('short'));
  assert.equal(passwordProblem('long enough!'), null);
});

test('roles', () => {
  assert.ok(can('owner', 'manageStaff'));
  assert.ok(!can('manager', 'manageStaff'));
  assert.ok(can('manager', 'manage'));
  assert.ok(can('staff', 'write'));
  assert.ok(!can('staff', 'manage'));
  assert.ok(!can('viewer', 'write'));
});
