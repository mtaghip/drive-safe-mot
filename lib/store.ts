// Booking storage. Postgres when DATABASE_URL is set; otherwise an in-memory store
// for local development only (bookings are lost on restart).
import { randomBytes } from 'node:crypto';
import { Pool } from 'pg';
import type { Taken } from './schedule.ts';
import type { BookingRequest } from './validation.ts';

export type Booking = BookingRequest & { ref: string };

export class SlotTakenError extends Error {
  constructor() { super('Slot already booked'); }
}

interface Store {
  taken(from: string, to: string): Promise<Taken>;
  insert(b: Booking): Promise<void>;
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

-- One live booking per one-hour slot. Cancelling a booking (setting cancelled_at) frees the slot.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_slot_unique
  ON bookings (slot_date, slot_hour) WHERE cancelled_at IS NULL;
`;

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newRef = () => 'DS-' + Array.from(randomBytes(5), b => REF_CHARS[b % REF_CHARS.length]).join('');

class PgStore implements Store {
  private schema?: Promise<unknown>;
  constructor(private pool: Pool) {}
  private get ready() {
    // Retry on the next request if the database was unreachable.
    return (this.schema ??= this.pool.query(SCHEMA).catch(err => { this.schema = undefined; throw err; }));
  }
  async taken(from: string, to: string) {
    await this.ready;
    const { rows } = await this.pool.query<{ d: string; h: number }>(
      `SELECT to_char(slot_date, 'YYYY-MM-DD') AS d, slot_hour AS h FROM bookings
       WHERE cancelled_at IS NULL AND slot_date BETWEEN $1 AND $2`, [from, to]);
    const out: Taken = {};
    for (const r of rows) (out[r.d] ??= []).push(r.h);
    return out;
  }
  async insert(b: Booking) {
    await this.ready;
    try {
      await this.pool.query(
        `INSERT INTO bookings (ref, service, slot_date, slot_hour, name, phone, email, reg)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [b.ref, b.service, b.date, b.hour, b.name, b.phone, b.email, b.reg]);
    } catch (err) {
      if ((err as { constraint?: string }).constraint === 'bookings_slot_unique') throw new SlotTakenError();
      throw err;
    }
  }
}

class MemoryStore implements Store {
  private rows: Booking[] = [];
  async taken(from: string, to: string) {
    const out: Taken = {};
    for (const r of this.rows) if (r.date >= from && r.date <= to) (out[r.date] ??= []).push(r.hour);
    return out;
  }
  async insert(b: Booking) {
    if (this.rows.some(r => r.date === b.date && r.hour === b.hour)) throw new SlotTakenError();
    this.rows.push(b);
  }
}

const g = globalThis as unknown as { __bookingStore?: Store };

function store(): Store {
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

export const takenSlots = (from: string, to: string) => store().taken(from, to);

export async function createBooking(req: BookingRequest): Promise<Booking> {
  // Retry only on the (very unlikely) chance of a duplicate reference.
  for (let attempt = 0; ; attempt++) {
    const booking = { ...req, ref: newRef() };
    try {
      await store().insert(booking);
      return booking;
    } catch (err) {
      const dupRef = (err as { code?: string; constraint?: string }).constraint === 'bookings_ref_key';
      if (!dupRef || attempt >= 3) throw err;
    }
  }
}
