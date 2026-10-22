// Bookings, diary blocks, rate limits and the daily-email record.
import { randomBytes } from 'node:crypto';
import { constraintOf, db, type Db } from './db.ts';
import { findOrCreateCustomer, findOrCreateVehicle } from './customers.ts';
import type { Availability, Taken } from './schedule.ts';
import type { BookingRequest } from './validation.ts';

export type Source = 'online' | 'phone';
export type Booking = BookingRequest & { ref: string };
export type NewBooking = BookingRequest & { source: Source };
export type StoredBooking = Booking & {
  id: number; source: Source; createdAt: string; customerId: number | null; vehicleId: number | null;
};
/** A closed day (hour null) or a single blocked slot. */
export type Block = { id: number; date: string; hour: number | null; note: string };

/** The slot is booked, blocked, or its day has been closed. */
export class SlotTakenError extends Error {
  constructor() { super('Slot not available'); }
}

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DS-' + Array.from(randomBytes(5), b => REF_CHARS[b % REF_CHARS.length]).join('');

export const BOOKING_COLS = `b.id, b.ref, b.service, to_char(b.slot_date, 'YYYY-MM-DD') AS date, b.slot_hour AS hour, b.name, b.phone,
  b.email, b.reg, b.source, b.customer_id AS "customerId", b.vehicle_id AS "vehicleId",
  to_char(b.created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "createdAt"`;

const bookings = {
  async availability(from: string, to: string): Promise<Availability> {
    const { rows } = await db.query<{ d: string; h: number | null }>(
      `SELECT to_char(slot_date, 'YYYY-MM-DD') AS d, slot_hour AS h FROM bookings
         WHERE cancelled_at IS NULL AND slot_date BETWEEN $1 AND $2
       UNION ALL
       SELECT to_char(slot_date, 'YYYY-MM-DD'), slot_hour FROM blocks WHERE slot_date BETWEEN $1 AND $2`, [from, to]);
    const taken: Taken = {}, closed: string[] = [];
    for (const r of rows) {
      if (r.h == null) closed.push(r.d);
      else (taken[r.d] ??= []).push(r.h);
    }
    return { taken, closed };
  },
  async upcomingCount(digits: string, email: string, today: string) {
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM bookings WHERE cancelled_at IS NULL AND slot_date >= $1
         AND (regexp_replace(phone, '\\D', '', 'g') = $2 OR ($3 <> '' AND lower(email) = lower($3)))`, [today, digits, email]);
    return rows[0].n;
  },
  /** Records one event under `key` and returns how many it has had in the last `windowSec` seconds. */
  async hit(key: string, windowSec: number) {
    // The privacy notice promises these are kept for a day at most.
    await db.query(`DELETE FROM rate_events WHERE at < now() - interval '1 day'`);
    await db.query('INSERT INTO rate_events (key) VALUES ($1)', [key]);
    const { rows } = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM rate_events WHERE key = $1 AND at > now() - make_interval(secs => $2)`, [key, windowSec]);
    return rows[0].n;
  },
  async dayBookings(date: string) {
    const { rows } = await db.query<StoredBooking>(
      `SELECT ${BOOKING_COLS} FROM bookings b WHERE b.cancelled_at IS NULL AND b.slot_date = $1 ORDER BY b.slot_hour`, [date]);
    return rows;
  },
  async countsByDay(from: string, to: string) {
    const { rows } = await db.query<{ d: string; n: number }>(
      `SELECT to_char(slot_date, 'YYYY-MM-DD') AS d, count(*)::int AS n FROM bookings
       WHERE cancelled_at IS NULL AND slot_date BETWEEN $1 AND $2 GROUP BY slot_date`, [from, to]);
    return Object.fromEntries(rows.map(r => [r.d, r.n])) as Record<string, number>;
  },
  async blocks(from: string, to: string) {
    const { rows } = await db.query<Block>(
      `SELECT id, to_char(slot_date, 'YYYY-MM-DD') AS date, slot_hour AS hour, note FROM blocks
       WHERE slot_date BETWEEN $1 AND $2 ORDER BY slot_date, slot_hour NULLS FIRST`, [from, to]);
    return rows;
  },
  async addBlock(date: string, hour: number | null, note: string) {
    await db.query(`INSERT INTO blocks (slot_date, slot_hour, note) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [date, hour, note]);
  },
  async removeBlock(id: number) {
    await db.query('DELETE FROM blocks WHERE id = $1', [id]);
  },
  async cancel(id: number) {
    await db.query('UPDATE bookings SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL', [id]);
  },
  /** Throws SlotTakenError when the new slot is booked or blocked. */
  async move(id: number, date: string, hour: number) {
    let res;
    try {
      res = await db.query(
        `UPDATE bookings SET slot_date = $2::date, slot_hour = $3::smallint WHERE id = $1 AND cancelled_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE slot_date = $2::date AND (slot_hour IS NULL OR slot_hour = $3::smallint))`,
        [id, date, hour]);
    } catch (err) {
      if (constraintOf(err) === 'bookings_slot_unique') throw new SlotTakenError();
      throw err;
    }
    if (res.rowCount === 0) throw new SlotTakenError();
  },
  async findByRef(ref: string) {
    const { rows } = await db.query<StoredBooking>(
      `SELECT ${BOOKING_COLS} FROM bookings b WHERE upper(b.ref) = upper($1) AND b.cancelled_at IS NULL`, [ref]);
    return rows[0] ?? null;
  },
  async byId(id: number) {
    const { rows } = await db.query<StoredBooking>(`SELECT ${BOOKING_COLS} FROM bookings b WHERE b.id = $1`, [id]);
    return rows[0] ?? null;
  },
  /** Marks the daily schedule email for `day` as sent. False if it already was, so retries never send twice. */
  async claimDailyEmail(day: string) {
    const res = await db.query('INSERT INTO daily_emails (day) VALUES ($1) ON CONFLICT DO NOTHING', [day]);
    return res.rowCount === 1;
  },
  /** Undoes claimDailyEmail after a failed send, so the next trigger tries again. */
  async releaseDailyEmail(day: string) {
    await db.query('DELETE FROM daily_emails WHERE day = $1', [day]);
  },
};

export const store = () => bookings;
export const availability = (from: string, to: string) => bookings.availability(from, to);

async function insertBooking(tx: Db, b: NewBooking & { ref: string }) {
  // Every booking is filed under a customer and vehicle, matched by phone, email and registration.
  const customerId = await findOrCreateCustomer(tx, { name: b.name, phone: b.phone, email: b.email });
  const vehicleId = await findOrCreateVehicle(tx, customerId, b.reg);
  // Refuses the insert when the slot or its whole day is blocked.
  const res = await tx.query(
    `INSERT INTO bookings (ref, service, slot_date, slot_hour, name, phone, email, reg, source, customer_id, vehicle_id)
     SELECT $1::text, $2::text, $3::date, $4::smallint, $5::text, $6::text, $7::text, $8::text, $9::text, $10::integer, $11::integer
     WHERE NOT EXISTS (SELECT 1 FROM blocks WHERE slot_date = $3::date AND (slot_hour IS NULL OR slot_hour = $4::smallint))`,
    [b.ref, b.service, b.date, b.hour, b.name, b.phone, b.email, b.reg, b.source, customerId, vehicleId]);
  if (res.rowCount === 0) throw new SlotTakenError();
}

export async function createBooking(req: NewBooking): Promise<Booking> {
  // Retry only on the (very unlikely) chance of a duplicate reference.
  for (let attempt = 0; ; attempt++) {
    const booking = { ...req, ref: newRef() };
    try {
      // One transaction, so a refused slot leaves no stray customer behind.
      await db.tx(tx => insertBooking(tx, booking));
      const { source: _, ...rest } = booking;
      return rest;
    } catch (err) {
      if (constraintOf(err) === 'bookings_slot_unique') throw new SlotTakenError();
      if (constraintOf(err) !== 'bookings_ref_key' || attempt >= 3) throw err;
    }
  }
}
