// Job cards: one car's visit from booking-in to collection, then an invoice.
import { db, type Db } from './db.ts';
import { getCustomer } from './customers.ts';
import { createDraft, defaultVatRate, getInvoice } from './invoices.ts';
import { canMove, type JobStatus } from './job-status.ts';
import { serviceById } from './site.ts';
import { store } from './store.ts';

export type Job = {
  id: number; status: JobStatus; bookingId: number | null; customerId: number; vehicleId: number | null; reg: string;
  requested: string; mileageIn: number | null; mechanicId: number | null; notes: string; invoiceId: number | null;
  createdAt: string; statusAt: string;
  customerName: string; customerPhone: string; customerEmail: string; vehicleDesc: string; mechanicName: string | null;
  bookingDate: string | null; bookingHour: number | null; bookingService: string | null; bookingRef: string | null;
  invoiceNumber: number | null; invoiceStatus: string | null;
  tasksDone: number; tasksTotal: number; photos: number;
};
export type JobTask = { id: number; description: string; done: boolean };
export type JobPhoto = { id: number; bytes: number; createdAt: string };
export type JobEvent = { at: string; staffName: string; status: string; note: string };

const COLS = `j.id, j.status, j.booking_id AS "bookingId", j.customer_id AS "customerId", j.vehicle_id AS "vehicleId", j.reg,
  j.requested, j.mileage_in AS "mileageIn", j.mechanic_id AS "mechanicId", j.notes, j.invoice_id AS "invoiceId",
  to_char(j.created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "createdAt",
  to_char(j.status_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "statusAt",
  c.name AS "customerName", c.phone AS "customerPhone", c.email AS "customerEmail",
  trim(concat_ws(' ', v.year::text, v.make, v.model)) AS "vehicleDesc", s.name AS "mechanicName",
  to_char(b.slot_date, 'YYYY-MM-DD') AS "bookingDate", b.slot_hour AS "bookingHour", b.service AS "bookingService", b.ref AS "bookingRef",
  i.number AS "invoiceNumber", i.status AS "invoiceStatus",
  (SELECT count(*)::int FROM job_tasks t WHERE t.job_id = j.id AND t.done) AS "tasksDone",
  (SELECT count(*)::int FROM job_tasks t WHERE t.job_id = j.id) AS "tasksTotal",
  (SELECT count(*)::int FROM job_photos p WHERE p.job_id = j.id) AS photos`;
const FROM = `FROM jobs j JOIN customers c ON c.id = j.customer_id LEFT JOIN vehicles v ON v.id = j.vehicle_id
  LEFT JOIN staff s ON s.id = j.mechanic_id LEFT JOIN bookings b ON b.id = j.booking_id LEFT JOIN invoices i ON i.id = j.invoice_id`;

type Who = { id: number; name: string } | null;
const event = (tx: Db, jobId: number, me: Who, status: string, note = '') =>
  tx.query('INSERT INTO job_events (job_id, staff_name, status, note) VALUES ($1, $2, $3, $4)', [jobId, me?.name ?? '', status, note]);

/** A note on the job's timeline, keeping its current status. */
export async function logJobNote(jobId: number, me: Who, note: string) {
  await db.query(`INSERT INTO job_events (job_id, staff_name, status, note) SELECT id, $2, status, $3 FROM jobs WHERE id = $1`, [jobId, me?.name ?? '', note]);
}

export async function getJob(id: number) {
  const { rows } = await db.query<Job>(`SELECT ${COLS} ${FROM} WHERE j.id = $1`, [id]);
  if (!rows[0]) return null;
  const [tasks, photos, events] = await Promise.all([
    db.query<JobTask>('SELECT id, description, done FROM job_tasks WHERE job_id = $1 ORDER BY position, id', [id]),
    db.query<JobPhoto>(`SELECT id, bytes, to_char(created_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "createdAt"
      FROM job_photos WHERE job_id = $1 ORDER BY id`, [id]),
    db.query<JobEvent>(`SELECT to_char(at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS at, staff_name AS "staffName", status, note
      FROM job_events WHERE job_id = $1 ORDER BY at, id`, [id]),
  ]);
  return { ...rows[0], tasks: tasks.rows, photoList: photos.rows, events: events.rows };
}

/** Jobs still in the workshop, plus those collected or cancelled today. */
export async function boardJobs(today: string) {
  const { rows } = await db.query<Job>(
    `SELECT ${COLS} ${FROM}
     WHERE j.status IN ('booked', 'in_progress', 'waiting_parts', 'ready')
        OR (j.status = 'collected' AND (j.status_at AT TIME ZONE 'Europe/London')::date = $1::date)
     ORDER BY j.status_at`, [today]);
  return rows;
}

export async function customerJobs(customerId: number) {
  return (await db.query<Job>(`SELECT ${COLS} ${FROM} WHERE j.customer_id = $1 ORDER BY j.created_at DESC LIMIT 50`, [customerId])).rows;
}

/** For the diary: the job (if any) on each booking. */
export async function jobsForBookings(ids: number[]) {
  if (!ids.length) return {} as Record<number, { id: number; status: JobStatus }>;
  const { rows } = await db.query<{ id: number; status: JobStatus; bookingId: number }>(
    'SELECT id, status, booking_id AS "bookingId" FROM jobs WHERE booking_id = ANY($1::int[])', [ids]);
  return Object.fromEntries(rows.map(r => [r.bookingId, { id: r.id, status: r.status }]));
}

/** The booking's job card, created the first time it's opened. */
export async function jobFromBooking(bookingId: number, me: Who): Promise<number> {
  const existing = await db.query<{ id: number }>('SELECT id FROM jobs WHERE booking_id = $1', [bookingId]);
  if (existing.rows[0]) return existing.rows[0].id;
  const b = await store().byId(bookingId);
  if (!b || !b.customerId) throw new Error('Booking not found.');
  const service = serviceById(b.service)?.name ?? b.service;
  return db.tx(async tx => {
    const { rows } = await tx.query<{ id: number }>(
      `INSERT INTO jobs (booking_id, customer_id, vehicle_id, reg, requested, created_by) VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (booking_id) DO NOTHING RETURNING id`,
      [b.id, b.customerId, b.vehicleId, b.reg, service, me?.id ?? null]);
    if (!rows[0]) return (await tx.query<{ id: number }>('SELECT id FROM jobs WHERE booking_id = $1', [bookingId])).rows[0].id;
    await tx.query('INSERT INTO job_tasks (job_id, position, description) VALUES ($1, 0, $2)', [rows[0].id, service]);
    await event(tx, rows[0].id, me, 'booked', `From booking ${b.ref}`);
    return rows[0].id;
  });
}

/** A job without a booking: a walk-in, or work agreed over the counter. */
export async function newJob(o: { customerId: number; vehicleId: number | null; requested: string }, me: Who): Promise<number> {
  const c = await getCustomer(o.customerId);
  if (!c) throw new Error('Customer not found.');
  const v = c.vehicles.find(x => x.id === o.vehicleId) ?? c.vehicles[0] ?? null;
  return db.tx(async tx => {
    const { rows } = await tx.query<{ id: number }>(
      'INSERT INTO jobs (customer_id, vehicle_id, reg, requested, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [c.id, v?.id ?? null, v?.reg ?? '', o.requested, me?.id ?? null]);
    await event(tx, rows[0].id, me, 'booked', 'Walk-in');
    return rows[0].id;
  });
}

export async function updateJob(id: number, d: { requested: string; mileageIn: number | null; mechanicId: number | null; notes: string }) {
  await db.query('UPDATE jobs SET requested = $2, mileage_in = $3, mechanic_id = $4, notes = $5, updated_at = now() WHERE id = $1',
    [id, d.requested, d.mileageIn, d.mechanicId, d.notes]);
}

/** Moves a job on. Returns an error message, or null. */
export async function setJobStatus(id: number, to: JobStatus, me: Who, note = ''): Promise<string | null> {
  return db.tx(async tx => {
    const { rows } = await tx.query<{ status: JobStatus }>('SELECT status FROM jobs WHERE id = $1 FOR UPDATE', [id]);
    if (!rows[0]) return 'Job not found.';
    if (!canMove(rows[0].status, to)) return 'That move isn’t allowed from the job’s current status. Reload and try again.';
    await tx.query('UPDATE jobs SET status = $2, status_at = now(), updated_at = now() WHERE id = $1', [id, to]);
    await event(tx, id, me, to, note.slice(0, 300));
    return null;
  });
}

/** When a booking is cancelled, a job that hasn't started is cancelled with it. */
export async function cancelJobForBooking(bookingId: number, me: Who) {
  const { rows } = await db.query<{ id: number }>(
    `UPDATE jobs SET status = 'cancelled', status_at = now(), updated_at = now() WHERE booking_id = $1 AND status = 'booked' RETURNING id`, [bookingId]);
  if (rows[0]) await event(db, rows[0].id, me, 'cancelled', 'Booking cancelled');
}

export async function addTask(jobId: number, description: string) {
  await db.query(
    `INSERT INTO job_tasks (job_id, position, description)
     VALUES ($1, coalesce((SELECT max(position) + 1 FROM job_tasks WHERE job_id = $1), 0), $2)`, [jobId, description]);
}
export async function setTaskDone(taskId: number, done: boolean) {
  await db.query('UPDATE job_tasks SET done = $2 WHERE id = $1', [taskId, done]);
}
export async function removeTask(taskId: number) {
  await db.query('DELETE FROM job_tasks WHERE id = $1', [taskId]);
}
export async function taskJob(taskId: number) {
  return (await db.query<{ jobId: number }>('SELECT job_id AS "jobId" FROM job_tasks WHERE id = $1', [taskId])).rows[0]?.jobId ?? null;
}

export const MAX_PHOTOS = 20;
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export async function addPhoto(jobId: number, mime: string, data: Uint8Array, me: Who): Promise<string | null> {
  if (!PHOTO_TYPES.includes(mime)) return 'Photos must be JPEG, PNG or WebP.';
  if (data.byteLength > MAX_PHOTO_BYTES) return 'That photo is too large.';
  const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM job_photos WHERE job_id = $1', [jobId]);
  if (rows[0].n >= MAX_PHOTOS) return `A job can have up to ${MAX_PHOTOS} photos.`;
  await db.query('INSERT INTO job_photos (job_id, mime, data, bytes, created_by) VALUES ($1, $2, $3, $4, $5)',
    [jobId, mime, data, data.byteLength, me?.id ?? null]);
  return null;
}
export async function getPhoto(id: number) {
  const { rows } = await db.query<{ mime: string; data: Uint8Array; jobId: number }>('SELECT mime, data, job_id AS "jobId" FROM job_photos WHERE id = $1', [id]);
  return rows[0] ?? null;
}
export async function deletePhoto(id: number) {
  const { rows } = await db.query<{ jobId: number }>('DELETE FROM job_photos WHERE id = $1 RETURNING job_id AS "jobId"', [id]);
  return rows[0]?.jobId ?? null;
}

/**
 * The job's invoice: the existing one, or a new draft with the booked service at its
 * price, each other task as a line to price, and the mileage. A voided invoice is replaced.
 */
export async function invoiceForJob(jobId: number, me: { id: number; name: string }): Promise<number> {
  const job = await getJob(jobId);
  if (!job) throw new Error('Job not found.');
  if (job.invoiceId && job.invoiceStatus !== 'void') return job.invoiceId;
  const booking = job.bookingId ? await store().byId(job.bookingId) : null;
  const bookedName = booking ? serviceById(booking.service)?.name ?? booking.service : null;
  const lines = job.tasks
    .filter(t => t.description !== bookedName)
    .map(t => ({ kind: 'labour' as const, description: t.description, quantity: 1, unitPence: 0, vatRate: defaultVatRate('labour') }));
  return db.tx(async tx => {
    const id = await createDraft({ customerId: job.customerId, vehicleId: job.vehicleId, booking, staffId: me.id, lines, mileage: job.mileageIn, tx });
    await tx.query('UPDATE jobs SET invoice_id = $2, updated_at = now() WHERE id = $1', [jobId, id]);
    await event(tx, jobId, me, job.status, `Invoice started`);
    return id;
  });
}

/** Whether the job's invoice is paid, unpaid or missing, for warnings at collection. */
export async function invoiceState(job: Pick<Job, 'invoiceId'>) {
  if (!job.invoiceId) return 'none' as const;
  const inv = await getInvoice(job.invoiceId);
  return !inv || inv.status === 'void' ? 'none' as const : inv.status === 'paid' ? 'paid' as const : inv.status === 'draft' ? 'draft' as const : 'unpaid' as const;
}
