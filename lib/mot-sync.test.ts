// Automatic MOT dates from DVLA, against a fake DVLA.
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.PGLITE_DIR = 'memory://';
process.env.DVLA_VES_API_KEY = 'test-key';
const { db } = await import('./db.ts');
const { changesFrom, syncDueVehicles, syncVehicle, vehiclesToCheck } = await import('./mot-sync.ts');

const facts = (f: Partial<{ make: string; colour: string; year: number | null; motExpiry: string | null }>) =>
  ({ make: 'Ford', colour: 'Blue', year: 2015, motExpiry: '2027-03-10', motStatus: 'Valid', taxStatus: 'Taxed', ...f });

test('fills blanks, keeps staff edits, and only moves the MOT date forward', () => {
  assert.deepEqual(changesFrom({ make: '', colour: '', year: null, motDue: null }, facts({})), { make: 'Ford', colour: 'Blue', year: 2015, motDue: '2027-03-10' });
  assert.deepEqual(changesFrom({ make: 'FORD', colour: 'Navy', year: 2016, motDue: '2027-03-10' }, facts({})), {});
  assert.deepEqual(changesFrom({ make: 'Ford', colour: 'Blue', year: 2015, motDue: '2027-05-01' }, facts({})), {}, 'never backwards');
  assert.deepEqual(changesFrom({ make: 'Ford', colour: 'Blue', year: 2015, motDue: '2026-03-10' }, facts({})), { motDue: '2027-03-10' }, 'new test moves it on');
});

const dvla: Record<string, unknown> = {
  AB12CDE: { make: 'FORD', colour: 'BLUE', yearOfManufacture: 2015, motExpiryDate: '2027-01-20', motStatus: 'Valid' },
  NEW25CAR: { make: 'KIA', colour: 'WHITE', yearOfManufacture: 2025, motStatus: 'No details held by DVLA' },
};
let calls = 0;
globalThis.fetch = (async (_url: string, init?: RequestInit) => {
  calls++;
  const reg = JSON.parse(String(init?.body)).registrationNumber;
  return dvla[reg] ? Response.json(dvla[reg]) : new Response('{}', { status: 404 });
}) as typeof fetch;

async function car(reg: string, motDue: string | null = null) {
  const c = await db.query<{ id: number }>(`INSERT INTO customers (name) VALUES ('Test') RETURNING id`);
  const v = await db.query<{ id: number }>('INSERT INTO vehicles (customer_id, reg, mot_due) VALUES ($1, $2, $3) RETURNING id', [c.rows[0].id, reg, motDue]);
  return v.rows[0].id;
}
const row = async (id: number) => (await db.query<{ make: string; mot: string | null; note: string }>(
  `SELECT make, to_char(mot_due, 'YYYY-MM-DD') AS mot, dvla_note AS note FROM vehicles WHERE id = $1`, [id])).rows[0];

test('a booked car gets its make and MOT date', async () => {
  const id = await car('AB12 CDE');
  assert.equal(await syncVehicle(id), 'updated');
  assert.deepEqual(await row(id), { make: 'Ford', mot: '2027-01-20', note: '' });
  assert.equal(await syncVehicle(id), 'unchanged');
});

test('newer cars and unknown plates are noted, not retried every day', async () => {
  const fresh = await car('NEW25CAR'), bad = await car('ZZ99ZZZ');
  const r = await syncDueVehicles(10, '2026-11-02');
  assert.equal(r.counts['no MOT'], 1);
  assert.equal(r.counts['not found'], 1);
  assert.equal((await row(fresh)).note, 'No MOT yet (newer car)');
  assert.equal((await row(bad)).note, 'Not found at DVLA');
  assert.equal(r.remaining, 0);
  const before = calls;
  await syncDueVehicles(10, '2026-11-02');
  assert.equal(calls, before, 'nothing due again the same day');
});

test('cars close to their MOT are re-checked weekly', async () => {
  const id = await car('AB12CDE', '2026-11-20');
  await db.query(`UPDATE vehicles SET dvla_checked_at = now() - interval '8 days' WHERE id = $1`, [id]);
  assert.ok((await vehiclesToCheck('2026-11-02', 50)).includes(id));
  await db.query(`UPDATE vehicles SET dvla_checked_at = now() - interval '2 days' WHERE id = $1`, [id]);
  assert.ok(!(await vehiclesToCheck('2026-11-02', 50)).includes(id));
});
