// Keeps vehicles' MOT dates in step with DVLA, so reminders go out without anyone
// typing dates in. Runs for a car when it's booked, and each morning for cars
// that have no date yet or are close to their MOT (when a new test may have
// moved the date on). Needs DVLA_VES_API_KEY; without it, nothing happens.
import { db } from './db.ts';
import { addDays, todayIso } from './schedule.ts';
import { dvlaLookup, lookupConfigured, type VehicleFacts } from './vehicle-lookup.ts';

export type SyncResult = 'updated' | 'unchanged' | 'not found' | 'no MOT' | 'failed';

/**
 * What to save from DVLA's answer: make, colour and year only where we have none
 * (staff edits win), and the MOT date when we have none or DVLA's is later
 * (a new test moves it on; it never moves backwards).
 */
export function changesFrom(v: { make: string; colour: string; year: number | null; motDue: string | null }, f: VehicleFacts) {
  const c: { make?: string; colour?: string; year?: number; motDue?: string } = {};
  if (!v.make && f.make) c.make = f.make;
  if (!v.colour && f.colour) c.colour = f.colour;
  if (v.year == null && f.year != null) c.year = f.year;
  if (f.motExpiry && (!v.motDue || f.motExpiry > v.motDue)) c.motDue = f.motExpiry;
  return c;
}

/** Looks one vehicle up with DVLA and saves what's new. */
export async function syncVehicle(vehicleId: number): Promise<SyncResult> {
  const { rows } = await db.query<{ reg: string; make: string; colour: string; year: number | null; motDue: string | null }>(
    `SELECT reg, make, colour, year, to_char(mot_due, 'YYYY-MM-DD') AS "motDue" FROM vehicles WHERE id = $1`, [vehicleId]);
  const v = rows[0];
  if (!v) return 'failed';
  const r = await dvlaLookup(v.reg);
  if (!r.ok) {
    const notFound = r.error.startsWith('DVLA has no vehicle');
    // A refused key or DVLA being down isn't the car's fault: leave it to be tried again tomorrow.
    if (notFound) await db.query(`UPDATE vehicles SET dvla_checked_at = now(), dvla_note = 'Not found at DVLA' WHERE id = $1`, [vehicleId]);
    else console.error('[mot-sync]', v.reg, r.error);
    return notFound ? 'not found' : 'failed';
  }
  const c = changesFrom(v, r.facts);
  const note = r.facts.motExpiry ? '' : r.facts.motStatus === 'No details held by DVLA' ? 'No MOT yet (newer car)' : `No MOT date from DVLA${r.facts.motStatus ? ` (${r.facts.motStatus})` : ''}`;
  await db.query(
    `UPDATE vehicles SET make = coalesce($2, make), colour = coalesce($3, colour), year = coalesce($4, year), mot_due = coalesce($5::date, mot_due),
       dvla_checked_at = now(), dvla_note = $6 WHERE id = $1`,
    [vehicleId, c.make ?? null, c.colour ?? null, c.year ?? null, c.motDue ?? null, note]);
  if (!r.facts.motExpiry) return 'no MOT';
  return Object.keys(c).length ? 'updated' : 'unchanged';
}

/** Checks the car on a new booking. Never throws: a booking mustn't fail over this. */
export async function syncBookingVehicle(ref: string) {
  if (!lookupConfigured()) return;
  try {
    const { rows } = await db.query<{ vehicleId: number | null }>('SELECT vehicle_id AS "vehicleId" FROM bookings WHERE ref = $1', [ref]);
    if (rows[0]?.vehicleId) await syncVehicle(rows[0].vehicleId);
  } catch (err) {
    console.error('[mot-sync] booking', ref, err);
  }
}

/**
 * The cars worth checking today, most useful first: never checked; no MOT date
 * (monthly); MOT due within 45 days or run out in the last 60 (weekly, to catch
 * a new test before a reminder goes out).
 */
export async function vehiclesToCheck(today: string, limit: number): Promise<number[]> {
  const { rows } = await db.query<{ id: number }>(
    `SELECT id FROM vehicles
     WHERE dvla_checked_at IS NULL
        OR (mot_due IS NULL AND dvla_checked_at < now() - interval '30 days')
        OR (mot_due BETWEEN $1::date AND $2::date AND dvla_checked_at < now() - interval '7 days')
     ORDER BY dvla_checked_at NULLS FIRST, mot_due NULLS FIRST, id
     LIMIT $3`,
    [addDays(today, -60), addDays(today, 45), limit]);
  return rows.map(r => r.id);
}

/** Checks up to `limit` cars, one at a time so DVLA isn't flooded. */
export async function syncDueVehicles(limit = 40, today = todayIso()) {
  const counts: Record<SyncResult, number> = { updated: 0, unchanged: 0, 'not found': 0, 'no MOT': 0, failed: 0 };
  if (!lookupConfigured()) return { configured: false, counts, remaining: 0 };
  for (const id of await vehiclesToCheck(today, limit)) {
    counts[await syncVehicle(id)]++;
    // Stop early if DVLA is refusing every request (bad key, outage).
    if (counts.failed >= 3 && counts.failed === Object.values(counts).reduce((a, b) => a + b, 0)) break;
  }
  const remaining = (await vehiclesToCheck(today, 1000)).length;
  return { configured: true, counts, remaining };
}

/** For the Reminders page: how many cars have an MOT date, and what's still to check. */
export async function motDateStats() {
  const { rows } = await db.query<{ total: number; withDate: number; checked: number; lastCheck: string | null }>(
    `SELECT count(*)::int AS total, count(mot_due)::int AS "withDate", count(dvla_checked_at)::int AS checked,
       to_char(max(dvla_checked_at) AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "lastCheck"
     FROM vehicles`);
  return { ...rows[0], toCheck: (await vehiclesToCheck(todayIso(), 1000)).length };
}
