// Booking storage. Postgres when DATABASE_URL is set; otherwise an in-memory store
// for local development only (everything is lost on restart).
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import type { Availability, Taken } from './schedule.ts';
import type { BookingRequest } from './validation.ts';

export type Source = 'online' | 'phone';
export type Booking = BookingRequest & { ref: string };
export type NewBooking = BookingRequest & { source: Source };
export type StoredBooking = Booking & { id: number; source: Source; createdAt: string };
/** A closed day (hour null) or a single blocked slot. */
export type Block = { id: number; date: string; hour: number | null; note: string };

/** The slot is booked, blocked, or its day has been closed. */
export class SlotTakenError extends Error {
  constructor() { super('Slot not available'); }
}

interface Store {
  availability(from: string, to: string): Promise<Availability>;
  insert(b: NewBooking & { ref: string }): Promise<void>;
  upcomingCount(phoneDigits: string, email: string, today: string): Promise<number>;
  /** Records one event under `key` and returns how many it has had in the last `windowSec` seconds. */
  hit(key: string, windowSec: number): Promise<number>;
  dayBookings(date: string): Promise<StoredBooking[]>;
  countsByDay(from: string, to: string): Promise<Record<string, number>>;
  blocks(from: string, to: string): Promise<Block[]>;
  addBlock(date: string, hour: number | null, note: string): Promise<void>;
  removeBlock(id: number): Promise<void>;
  cancel(id: number): Promise<void>;
  /** Throws SlotTakenError when the new slot is booked or blocked. */
  move(id: number, date: string, hour: number): Promise<void>;
  findByRef(ref: string): Promise<StoredBooking | null>;
}

// Applied on first use, so a fresh database needs no manual setup.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS bookings (
  id          serial PRIMARY KEY,
  ref         text NOT NULL UNIQUE,
  service     text NOT NULL,
  slot_date   date NOT NULL,
  slot_hour   smallint NOT NULL CHECK (slot_hour BETWEEN 0 AND 23),
  name        text NOT NULL,
  phone       text NOT NULL,
  email       text NOT NULL,
  reg         text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  cancelled_at timestamptz
);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'online';

-- One live booking per one-hour slot. Cancelling a booking (setting cancelled_at) frees the slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (slot_date, slot_hour) WHERE cancelled_at IS NULL;

-- Days closed by staff (slot_hour NULL) and single blocked slots.
CREATE TABLE IF NOT EXISTS blocks (
  id         serial PRIMARY KEY,
  slot_date  date NOT NULL,
  slot_hour  smallint CHECK (slot_hour BETWEEN 0 AND 23),
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS blocks_unique ON blocks (slot_date, coalesce(slot_hour, -1));

-- Rolling counters for rate limits (booking attempts, staff logins).
CREATE TABLE IF NOT EXISTS rate_events (
  key text NOT NULL,
  at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rate_events_key_at ON rate_events (key, at);
`;

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DS-' + Array.from(randomBytes(5), b => REF_CHARS[b % REF_CHARS.length]).join('');

const BOOKING_COLS = `id, ref, service, to_char(slot_date, 'YYYY-MM-DD') AS date, slot_hour AS hour, name, phone, email, reg, source,
  to_char(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "createdAt"`;

class PgStore implements Store {
  private schema?: Promise<unknown>;
  constructor(private pool: Pool) {}
  private get ready() {
    // Retry on the next request if the database was unreachable.
    return (this.schema ??= this.pool.query(SCHEMA).catch(err => { this.schema = undefined; throw err; }));
  }
  private async q<T extends object>(sql: string, params: unknown[] = []) {
    await this.ready;
    return this.pool.query<T>(sql, params);
  }

  async availability(from: string, to: string) {
    const { rows } = await this.q<{ d: string; h: number | null }>(
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
  }
  async insert(b: NewBooking & { ref: string }) {
    let res;
    try {
      // Refuses the insert when the slot or its whole day is blocked.
      res = await this.q(
        `INSERT INTO bookings (ref, service, slot_date, slot_hour, name, phone, email, reg, source)
         SELECT $1::text, $2::text, $3::date, $4::smallint, $5::text, $6::text, $7::text, $8::text, $9::text
         WHERE NOT EXISTS (SELECT 1 FROM blocks WHERE slot_date = $3::date AND (slot_hour IS NULL OR slot_hour = $4::smallint))`,
        [b.ref, b.service, b.date, b.hour, b.name, b.phone, b.email, b.reg, b.source]);
    } catch (err) {
      if ((err as { constraint?: string }).constraint === 'bookings_slot_unique') throw new SlotTakenError();
      throw err;
    }
    if (res.rowCount === 0) throw new SlotTakenError();
  }
  async upcomingCount(digits: string, email: string, today: string) {
    const { rows } = await this.q<{ n: number }>(
      `SELECT count(*)::int AS n FROM bookings WHERE cancelled_at IS NULL AND slot_date >= $1
         AND (regexp_replace(phone, '\\D', '', 'g') = $2 OR ($3 <> '' AND lower(email) = lower($3)))`, [today, digits, email]);
    return rows[0].n;
  }
  async hit(key: string, windowSec: number) {
    // The privacy notice promises these are kept for a day at most.
    await this.q(`DELETE FROM rate_events WHERE at < now() - interval '1 day'`);
    await this.q('INSERT INTO rate_events (key) VALUES ($1)', [key]);
    const { rows } = await this.q<{ n: number }>(
      `SELECT count(*)::int AS n FROM rate_events WHERE key = $1 AND at > now() - make_interval(secs => $2)`, [key, windowSec]);
    return rows[0].n;
  }
  async dayBookings(date: string) {
    const { rows } = await this.q<StoredBooking>(
      `SELECT ${BOOKING_COLS} FROM bookings WHERE cancelled_at IS NULL AND slot_date = $1 ORDER BY slot_hour`, [date]);
    return rows;
  }
  async countsByDay(from: string, to: string) {
    const { rows } = await this.q<{ d: string; n: number }>(
      `SELECT to_char(slot_date, 'YYYY-MM-DD') AS d, count(*)::int AS n FROM bookings
       WHERE cancelled_at IS NULL AND slot_date BETWEEN $1 AND $2 GROUP BY slot_date`, [from, to]);
    return Object.fromEntries(rows.map(r => [r.d, r.n]));
  }
  async blocks(from: string, to: string) {
    const { rows } = await this.q<Block>(
      `SELECT id, to_char(slot_date, 'YYYY-MM-DD') AS date, slot_hour AS hour, note FROM blocks
       WHERE slot_date BETWEEN $1 AND $2 ORDER BY slot_date, slot_hour NULLS FIRST`, [from, to]);
    return rows;
  }
  async addBlock(date: string, hour: number | null, note: string) {
    await this.q(`INSERT INTO blocks (slot_date, slot_hour, note) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`, [date, hour, note]);
  }
  async removeBlock(id: number) {
    await this.q('DELETE FROM blocks WHERE id = $1', [id]);
  }
  async cancel(id: number) {
    await this.q('UPDATE bookings SET cancelled_at = now() WHERE id = $1 AND cancelled_at IS NULL', [id]);
  }
  async move(id: number, date: string, hour: number) {
    let res;
    try {
      res = await this.q(
        `UPDATE bookings SET slot_date = $2::date, slot_hour = $3::smallint WHERE id = $1 AND cancelled_at IS NULL
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE slot_date = $2::date AND (slot_hour IS NULL OR slot_hour = $3::smallint))`,
        [id, date, hour]);
    } catch (err) {
      if ((err as { constraint?: string }).constraint === 'bookings_slot_unique') throw new SlotTakenError();
      throw err;
    }
    if (res.rowCount === 0) throw new SlotTakenError();
  }
  async findByRef(ref: string) {
    const { rows } = await this.q<StoredBooking>(`SELECT ${BOOKING_COLS} FROM bookings WHERE upper(ref) = upper($1) AND cancelled_at IS NULL`, [ref]);
    return rows[0] ?? null;
  }
}

class MemoryStore implements Store {
  private rows: (StoredBooking & { cancelled: boolean })[] = [];
  private blockRows: Block[] = [];
  private events: { key: string; at: number }[] = [];
  private nextId = 1;
  private live = () => this.rows.filter(r => !r.cancelled);

  async availability(from: string, to: string) {
    const taken: Taken = {}, closed: string[] = [];
    for (const r of this.live()) if (r.date >= from && r.date <= to) (taken[r.date] ??= []).push(r.hour);
    for (const b of this.blockRows) {
      if (b.date < from || b.date > to) continue;
      if (b.hour == null) closed.push(b.date);
      else (taken[b.date] ??= []).push(b.hour);
    }
    return { taken, closed };
  }
  async insert(b: NewBooking & { ref: string }) {
    const blocked = this.blockRows.some(x => x.date === b.date && (x.hour == null || x.hour === b.hour));
    if (blocked || this.live().some(r => r.date === b.date && r.hour === b.hour)) throw new SlotTakenError();
    this.rows.push({ ...b, id: this.nextId++, createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '), cancelled: false });
  }
  async upcomingCount(digits: string, email: string, today: string) {
    return this.live().filter(r => r.date >= today &&
      (r.phone.replace(/\D/g, '') === digits || (email && r.email.toLowerCase() === email.toLowerCase()))).length;
  }
  async hit(key: string, windowSec: number) {
    const now = Date.now();
    this.events = this.events.filter(e => e.at > now - 86_400_000);
    this.events.push({ key, at: now });
    return this.events.filter(e => e.key === key && e.at > now - windowSec * 1000).length;
  }
  async dayBookings(date: string) {
    return this.live().filter(r => r.date === date).sort((a, b) => a.hour - b.hour);
  }
  async countsByDay(from: string, to: string) {
    const out: Record<string, number> = {};
    for (const r of this.live()) if (r.date >= from && r.date <= to) out[r.date] = (out[r.date] ?? 0) + 1;
    return out;
  }
  async blocks(from: string, to: string) {
    return this.blockRows.filter(b => b.date >= from && b.date <= to)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.hour ?? -1) - (b.hour ?? -1));
  }
  async addBlock(date: string, hour: number | null, note: string) {
    if (!this.blockRows.some(b => b.date === date && b.hour === hour)) this.blockRows.push({ id: this.nextId++, date, hour, note });
  }
  async removeBlock(id: number) {
    this.blockRows = this.blockRows.filter(b => b.id !== id);
  }
  async cancel(id: number) {
    const r = this.rows.find(x => x.id === id);
    if (r) r.cancelled = true;
  }
  async move(id: number, date: string, hour: number) {
    const r = this.live().find(x => x.id === id);
    const blocked = this.blockRows.some(x => x.date === date && (x.hour == null || x.hour === hour));
    if (!r || blocked || this.live().some(x => x.id !== id && x.date === date && x.hour === hour)) throw new SlotTakenError();
    r.date = date; r.hour = hour;
  }
  async findByRef(ref: string) {
    return this.live().find(r => r.ref.toUpperCase() === ref.toUpperCase()) ?? null;
  }
}

const g = globalThis as unknown as { __bookingStore?: Store };

export function store(): Store {
  if (g.__bookingStore) return g.__bookingStore;
  const url = process.env.DATABASE_URL;
  if (url) {
    g.__bookingStore = new PgStore(new Pool({ connectionString: url, max: 5 }));
  } else if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. Online booking needs a Postgres database in production.');
  } else {
    console.warn('[bookings] DATABASE_URL not set, using an in-memory store. Bookings will be lost on restart.');
    g.__bookingStore = new MemoryStore();
  }
  return g.__bookingStore;
}

export const availability = (from: string, to: string) => store().availability(from, to);

export async function createBooking(req: NewBooking): Promise<Booking> {
  // Retry only on the (very unlikely) chance of a duplicate reference.
  for (let attempt = 0; ; attempt++) {
    const booking = { ...req, ref: newRef() };
    try {
      await store().insert(booking);
      const { source: _, ...rest } = booking;
      return rest;
    } catch (err) {
      const dupRef = (err as { constraint?: string }).constraint === 'bookings_ref_key';
      if (!dupRef || attempt >= 3) throw err;
    }
  }
}
