// Figures for the Reports page. Every query takes the same inclusive date range.
import { db } from './db.ts';
import type { Group } from './report-periods.ts';

/** Money received: paid invoices by the date they were paid, one row per day, week or month (zeros included). */
export async function takingsSeries(from: string, to: string, group: Group) {
  const { rows } = await db.query<{ bucket: string; pence: number; n: number }>(
    `WITH b AS (
       SELECT generate_series(date_trunc($3::text, $1::date), date_trunc($3::text, $2::date), ('1 ' || $3::text)::interval)::date AS b
     )
     SELECT to_char(b.b, 'YYYY-MM-DD') AS bucket, coalesce(sum(i.total_pence), 0)::int AS pence, count(i.id)::int AS n
     FROM b LEFT JOIN invoices i
       ON i.status = 'paid' AND i.paid_at BETWEEN $1::date AND $2::date AND date_trunc($3::text, i.paid_at)::date = b.b
     GROUP BY b.b ORDER BY b.b`, [from, to, group]);
  return rows;
}

export async function takingsSummary(from: string, to: string) {
  const [paid, byMethod, invoiced] = await Promise.all([
    db.query<{ pence: number; n: number }>(
      `SELECT coalesce(sum(total_pence), 0)::int AS pence, count(*)::int AS n FROM invoices
       WHERE status = 'paid' AND paid_at BETWEEN $1::date AND $2::date`, [from, to]),
    db.query<{ method: string; pence: number; n: number }>(
      `SELECT coalesce(payment_method, 'other') AS method, sum(total_pence)::int AS pence, count(*)::int AS n FROM invoices
       WHERE status = 'paid' AND paid_at BETWEEN $1::date AND $2::date GROUP BY 1 ORDER BY 2 DESC`, [from, to]),
    db.query<{ pence: number; n: number }>(
      `SELECT coalesce(sum(total_pence), 0)::int AS pence, count(*)::int AS n FROM invoices
       WHERE status IN ('issued', 'paid') AND issue_date BETWEEN $1::date AND $2::date`, [from, to]),
  ]);
  return { paid: paid.rows[0], byMethod: byMethod.rows, invoiced: invoiced.rows[0] };
}

/** Booked work by service (from the diary), and invoiced amounts by line type. */
export async function workByService(from: string, to: string) {
  const [booked, invoiced] = await Promise.all([
    db.query<{ service: string; n: number }>(
      `SELECT service, count(*)::int AS n FROM bookings
       WHERE cancelled_at IS NULL AND slot_date BETWEEN $1::date AND $2::date GROUP BY service ORDER BY n DESC`, [from, to]),
    db.query<{ kind: string; pence: number; qty: number }>(
      `SELECT it.kind, sum(round(it.quantity * it.unit_pence))::int AS pence, sum(it.quantity)::float AS qty
       FROM invoice_items it JOIN invoices i ON i.id = it.invoice_id
       WHERE i.status IN ('issued', 'paid') AND i.issue_date BETWEEN $1::date AND $2::date
       GROUP BY it.kind ORDER BY pence DESC`, [from, to]),
  ]);
  return { booked: booked.rows, invoiced: invoiced.rows };
}

/** Every issued, unpaid invoice (whatever the period), oldest first. */
export async function unpaidInvoices(today: string) {
  const { rows } = await db.query<{ id: number; number: number; billName: string; billPhone: string; reg: string; issueDate: string; days: number; pence: number }>(
    `SELECT id, number, bill_name AS "billName", bill_phone AS "billPhone", reg, to_char(issue_date, 'YYYY-MM-DD') AS "issueDate",
       ($1::date - issue_date)::int AS days, total_pence AS pence
     FROM invoices WHERE status = 'issued' ORDER BY issue_date, number`, [today]);
  return rows;
}

/** Bookings in the period by how they were made, with cancellations. */
export async function bookingSources(from: string, to: string) {
  const { rows } = await db.query<{ source: string; kept: number; cancelled: number }>(
    `SELECT source, count(*) FILTER (WHERE cancelled_at IS NULL)::int AS kept, count(*) FILTER (WHERE cancelled_at IS NOT NULL)::int AS cancelled
     FROM bookings WHERE slot_date BETWEEN $1::date AND $2::date GROUP BY source`, [from, to]);
  const get = (s: string) => rows.find(r => r.source === s) ?? { source: s, kept: 0, cancelled: 0 };
  return { online: get('online'), phone: get('phone') };
}

/** How long after a reminder a booking or invoice for the same vehicle counts as the reminder working. */
export const CONVERSION_DAYS = 60;

/**
 * Reminders sent in the period, and how many "came back": the same vehicle was booked
 * (not cancelled) or invoiced within CONVERSION_DAYS of the reminder.
 */
export async function reminderConversion(from: string, to: string) {
  const { rows } = await db.query<{ kind: string; sent: number; converted: number; open: number }>(
    `WITH r AS (
       SELECT r.*, (
         EXISTS (SELECT 1 FROM bookings b WHERE b.vehicle_id = r.vehicle_id AND b.cancelled_at IS NULL
                   AND b.created_at > r.sent_at AND b.created_at <= r.sent_at + make_interval(days => $3))
         OR EXISTS (SELECT 1 FROM invoices i WHERE i.vehicle_id = r.vehicle_id AND i.status IN ('issued', 'paid')
                   AND i.created_at > r.sent_at AND i.created_at <= r.sent_at + make_interval(days => $3))
       ) AS converted
       FROM reminder_sends r WHERE (r.sent_at AT TIME ZONE 'Europe/London')::date BETWEEN $1::date AND $2::date
     )
     SELECT kind, count(*)::int AS sent, count(*) FILTER (WHERE converted)::int AS converted,
       count(*) FILTER (WHERE NOT converted AND sent_at > now() - make_interval(days => $3))::int AS open
     FROM r GROUP BY kind ORDER BY kind`, [from, to, CONVERSION_DAYS]);
  return rows;
}

/** Paid invoices in the period, for the accountant's CSV. */
export async function paidInvoicesForExport(from: string, to: string) {
  const { rows } = await db.query<{ number: number; issueDate: string; paidAt: string; method: string; name: string; reg: string; net: number; vat: number; total: number }>(
    `SELECT number, to_char(issue_date, 'YYYY-MM-DD') AS "issueDate", to_char(paid_at, 'YYYY-MM-DD') AS "paidAt",
       coalesce(payment_method, '') AS method, bill_name AS name, reg, net_pence AS net, vat_pence AS vat, total_pence AS total
     FROM invoices WHERE status = 'paid' AND paid_at BETWEEN $1::date AND $2::date ORDER BY paid_at, number`, [from, to]);
  return rows;
}
