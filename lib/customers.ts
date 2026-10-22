// Customers and their vehicles.
import { constraintOf, db as defaultDb, type Db } from './db.ts';
import { normaliseReg, phoneDigits } from './validation.ts';

export type Customer = {
  id: number; name: string; phone: string; email: string; address: string; notes: string;
  remindersOk: boolean; createdAt: string;
};
export type Vehicle = {
  id: number; customerId: number; reg: string; make: string; model: string; colour: string;
  year: number | null; motDue: string | null; serviceDue: string | null; notes: string;
};
export type CustomerInput = { name: string; phone: string; email: string; address: string; notes: string };
export type VehicleInput = Omit<Vehicle, 'id' | 'customerId'>;

export const CUSTOMER_COLS = `c.id, c.name, c.phone, c.email, c.address, c.notes, c.reminders_ok AS "remindersOk",
  to_char(c.created_at, 'YYYY-MM-DD') AS "createdAt"`;
export const VEHICLE_COLS = `v.id, v.customer_id AS "customerId", v.reg, v.make, v.model, v.colour, v.year,
  to_char(v.mot_due, 'YYYY-MM-DD') AS "motDue", to_char(v.service_due, 'YYYY-MM-DD') AS "serviceDue", v.notes`;

/** Registration without spaces, for matching "AB12CDE" to "AB12 CDE". */
export const compactReg = (reg: string) => normaliseReg(reg).replace(/ /g, '');

/** Formats a current-style plate as "AB12 CDE"; anything else is left as typed. */
export function formatReg(reg: string) {
  const c = compactReg(reg);
  return /^[A-Z]{2}\d{2}[A-Z]{3}$/.test(c) ? `${c.slice(0, 4)} ${c.slice(4)}` : normaliseReg(reg);
}

/**
 * The customer with this phone number (or, failing that, email), creating one if there's none.
 * Blank contact details on an existing customer are filled in from the new ones.
 */
export async function findOrCreateCustomer(tx: Db, c: { name: string; phone: string; email: string }): Promise<number> {
  const digits = phoneDigits(c.phone), email = c.email.trim();
  const { rows } = await tx.query<{ id: number }>(
    `SELECT id FROM customers
     WHERE (length($1) >= 10 AND regexp_replace(phone, '\\D', '', 'g') = $1) OR ($2 <> '' AND lower(email) = lower($2))
     ORDER BY (regexp_replace(phone, '\\D', '', 'g') = $1) DESC, id LIMIT 1`, [digits, email]);
  if (rows[0]) {
    await tx.query(
      `UPDATE customers SET email = CASE WHEN email = '' THEN $2 ELSE email END,
         phone = CASE WHEN phone = '' THEN $3 ELSE phone END, updated_at = now() WHERE id = $1`,
      [rows[0].id, email, c.phone.trim()]);
    return rows[0].id;
  }
  const ins = await tx.query<{ id: number }>(
    'INSERT INTO customers (name, phone, email) VALUES ($1, $2, $3) RETURNING id', [c.name.trim(), c.phone.trim(), email]);
  return ins.rows[0].id;
}

export async function findOrCreateVehicle(tx: Db, customerId: number, reg: string): Promise<number> {
  const { rows } = await tx.query<{ id: number }>(
    `SELECT id FROM vehicles WHERE customer_id = $1 AND replace(upper(reg), ' ', '') = $2 LIMIT 1`, [customerId, compactReg(reg)]);
  if (rows[0]) return rows[0].id;
  const ins = await tx.query<{ id: number }>('INSERT INTO vehicles (customer_id, reg) VALUES ($1, $2) RETURNING id', [customerId, formatReg(reg)]);
  return ins.rows[0].id;
}

export type CustomerListItem = Customer & { regs: string; invoices: number; lastVisit: string | null };

/** Search by name, phone, email or registration. Newest activity first. */
export async function searchCustomers(q: string, limit = 100, db: Db = defaultDb): Promise<CustomerListItem[]> {
  const term = q.trim(), digits = phoneDigits(term), reg = compactReg(term);
  const { rows } = await db.query<CustomerListItem>(
    `SELECT ${CUSTOMER_COLS},
       coalesce((SELECT string_agg(v.reg, ', ' ORDER BY v.id) FROM vehicles v WHERE v.customer_id = c.id), '') AS regs,
       (SELECT count(*)::int FROM invoices i WHERE i.customer_id = c.id AND i.status <> 'draft') AS invoices,
       (SELECT to_char(max(b.slot_date), 'YYYY-MM-DD') FROM bookings b WHERE b.customer_id = c.id AND b.cancelled_at IS NULL) AS "lastVisit"
     FROM customers c
     WHERE $1 = ''
        OR c.name ILIKE '%' || $1 || '%'
        OR c.email ILIKE '%' || $1 || '%'
        OR (length($2) >= 4 AND regexp_replace(c.phone, '\\D', '', 'g') LIKE '%' || $2 || '%')
        OR (length($3) >= 2 AND EXISTS (SELECT 1 FROM vehicles v WHERE v.customer_id = c.id AND replace(upper(v.reg), ' ', '') LIKE '%' || $3 || '%'))
     ORDER BY c.updated_at DESC, c.id DESC LIMIT $4`, [term, digits, reg, limit]);
  return rows;
}

export async function getCustomer(id: number, db: Db = defaultDb) {
  const { rows } = await db.query<Customer>(`SELECT ${CUSTOMER_COLS} FROM customers c WHERE c.id = $1`, [id]);
  if (!rows[0]) return null;
  const vehicles = (await db.query<Vehicle>(`SELECT ${VEHICLE_COLS} FROM vehicles v WHERE v.customer_id = $1 ORDER BY v.id`, [id])).rows;
  return { ...rows[0], vehicles };
}

export async function getVehicle(id: number, db: Db = defaultDb) {
  const { rows } = await db.query<Vehicle>(`SELECT ${VEHICLE_COLS} FROM vehicles v WHERE v.id = $1`, [id]);
  return rows[0] ?? null;
}

export function validateCustomer(f: Partial<Record<keyof CustomerInput, unknown>>):
  { ok: true; value: CustomerInput } | { ok: false; error: string } {
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const value = { name: s(f.name, 120), phone: s(f.phone, 40), email: s(f.email, 200), address: s(f.address, 500), notes: s(f.notes, 2000) };
  if (!value.name) return { ok: false, error: 'Enter the customer’s name.' };
  if (value.email && !/^\S+@\S+\.\S+$/.test(value.email)) return { ok: false, error: 'That email address doesn’t look right.' };
  if (value.phone && phoneDigits(value.phone).length < 10) return { ok: false, error: 'That phone number looks too short.' };
  return { ok: true, value };
}

export async function createCustomer(c: CustomerInput, db: Db = defaultDb) {
  const { rows } = await db.query<{ id: number }>(
    'INSERT INTO customers (name, phone, email, address, notes) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [c.name, c.phone, c.email, c.address, c.notes]);
  return rows[0].id;
}

export async function updateCustomer(id: number, c: CustomerInput, db: Db = defaultDb) {
  await db.query(
    'UPDATE customers SET name = $2, phone = $3, email = $4, address = $5, notes = $6, updated_at = now() WHERE id = $1',
    [id, c.name, c.phone, c.email, c.address, c.notes]);
}

export async function setReminders(id: number, ok: boolean, db: Db = defaultDb) {
  await db.query('UPDATE customers SET reminders_ok = $2, updated_at = now() WHERE id = $1', [id, ok]);
}

/** Customers with invoices can't be deleted: invoices must be kept. Returns false in that case. */
export async function deleteCustomer(id: number, db: Db = defaultDb): Promise<boolean> {
  try {
    await db.query('DELETE FROM customers WHERE id = $1', [id]);
    return true;
  } catch (err) {
    if (constraintOf(err) === 'invoices_customer_id_fkey') return false;
    throw err;
  }
}

export function validateVehicle(f: Partial<Record<keyof VehicleInput, unknown>>):
  { ok: true; value: VehicleInput } | { ok: false; error: string } {
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const date = (v: unknown) => (/^\d{4}-\d{2}-\d{2}$/.test(String(v ?? '')) ? String(v) : null);
  const reg = formatReg(s(f.reg, 12));
  if (compactReg(reg).length < 2) return { ok: false, error: 'Enter the registration.' };
  const year = Number(f.year);
  return {
    ok: true,
    value: {
      reg, make: s(f.make, 40), model: s(f.model, 60), colour: s(f.colour, 30),
      year: Number.isInteger(year) && year > 1900 && year < 2100 ? year : null,
      motDue: date(f.motDue), serviceDue: date(f.serviceDue), notes: s(f.notes, 1000),
    },
  };
}

export async function addVehicle(customerId: number, v: VehicleInput, db: Db = defaultDb) {
  const { rows } = await db.query<{ id: number }>(
    `INSERT INTO vehicles (customer_id, reg, make, model, colour, year, mot_due, service_due, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
    [customerId, v.reg, v.make, v.model, v.colour, v.year, v.motDue, v.serviceDue, v.notes]);
  return rows[0].id;
}

export async function updateVehicle(id: number, v: VehicleInput, db: Db = defaultDb) {
  await db.query(
    `UPDATE vehicles SET reg = $2, make = $3, model = $4, colour = $5, year = $6, mot_due = $7, service_due = $8, notes = $9 WHERE id = $1`,
    [id, v.reg, v.make, v.model, v.colour, v.year, v.motDue, v.serviceDue, v.notes]);
}

export async function deleteVehicle(id: number, db: Db = defaultDb) {
  await db.query('DELETE FROM vehicles WHERE id = $1', [id]);
}

/** A customer's bookings, newest first. */
export async function customerBookings(customerId: number, db: Db = defaultDb) {
  const { rows } = await db.query<{ id: number; ref: string; service: string; date: string; hour: number; reg: string; cancelled: boolean }>(
    `SELECT id, ref, service, to_char(slot_date, 'YYYY-MM-DD') AS date, slot_hour AS hour, reg, cancelled_at IS NOT NULL AS cancelled
     FROM bookings WHERE customer_id = $1 ORDER BY slot_date DESC, slot_hour DESC LIMIT 50`, [customerId]);
  return rows;
}
