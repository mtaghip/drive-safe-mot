// Invoices: drafts are editable; issuing numbers them (no gaps) and freezes them.
import { constraintOf, db, type Db } from './db.ts';
import { getCustomer, getVehicle } from './customers.ts';
import { totals, type Line, type LineKind } from './invoice-calc.ts';
export { PAYMENT_METHODS, paymentLabel } from './invoice-calc.ts';
import { todayIso } from './schedule.ts';
import { COMPANY, serviceById, STANDARD_VAT_RATE, VAT_REGISTERED } from './site.ts';
import type { StoredBooking } from './store.ts';

export type InvoiceStatus = 'draft' | 'issued' | 'paid' | 'void';

export type Invoice = {
  id: number; number: number | null; status: InvoiceStatus;
  customerId: number | null; vehicleId: number | null; bookingId: number | null;
  billName: string; billAddress: string; billPhone: string; billEmail: string;
  reg: string; vehicleDesc: string; mileage: number | null;
  issueDate: string | null; notes: string;
  netPence: number; vatPence: number; totalPence: number;
  nextMotDue: string | null; paidAt: string | null; paymentMethod: string | null;
  createdAt: string; lines: Line[];
};

const COLS = `i.id, i.number, i.status, i.customer_id AS "customerId", i.vehicle_id AS "vehicleId", i.booking_id AS "bookingId",
  i.bill_name AS "billName", i.bill_address AS "billAddress", i.bill_phone AS "billPhone", i.bill_email AS "billEmail",
  i.reg, i.vehicle_desc AS "vehicleDesc", i.mileage, to_char(i.issue_date, 'YYYY-MM-DD') AS "issueDate", i.notes,
  i.net_pence AS "netPence", i.vat_pence AS "vatPence", i.total_pence AS "totalPence",
  to_char(i.next_mot_due, 'YYYY-MM-DD') AS "nextMotDue", to_char(i.paid_at, 'YYYY-MM-DD') AS "paidAt",
  i.payment_method AS "paymentMethod", to_char(i.created_at, 'YYYY-MM-DD') AS "createdAt"`;

export const invoiceLabel = (i: { number: number | null; id: number }) => (i.number ? `Invoice ${i.number}` : `Draft #${i.id}`);

/** The VAT rate a new line of this kind gets. The MOT fee is outside the scope of VAT. */
export const defaultVatRate = (kind: LineKind) => (!VAT_REGISTERED || kind === 'mot' ? null : STANDARD_VAT_RATE);

export async function getInvoice(id: number, tx: Db = db): Promise<Invoice | null> {
  const { rows } = await tx.query<Omit<Invoice, 'lines'>>(`SELECT ${COLS} FROM invoices i WHERE i.id = $1`, [id]);
  if (!rows[0]) return null;
  const items = await tx.query<{ kind: LineKind; description: string; quantity: string; unit_pence: number; vat_rate: string | null }>(
    'SELECT kind, description, quantity, unit_pence, vat_rate FROM invoice_items WHERE invoice_id = $1 ORDER BY position', [id]);
  const lines = items.rows.map(r => ({
    kind: r.kind, description: r.description, quantity: Number(r.quantity), unitPence: r.unit_pence,
    vatRate: r.vat_rate == null ? null : Number(r.vat_rate),
  }));
  return { ...rows[0], lines };
}

export type InvoiceListItem = Pick<Invoice, 'id' | 'number' | 'status' | 'billName' | 'reg' | 'issueDate' | 'totalPence' | 'customerId' | 'createdAt' | 'paidAt'>;

export async function listInvoices(f: { status?: string; q?: string; customerId?: number } = {}): Promise<InvoiceListItem[]> {
  const q = (f.q ?? '').trim();
  const { rows } = await db.query<InvoiceListItem>(
    `SELECT i.id, i.number, i.status, i.bill_name AS "billName", i.reg, to_char(i.issue_date, 'YYYY-MM-DD') AS "issueDate",
       i.total_pence AS "totalPence", i.customer_id AS "customerId", to_char(i.created_at, 'YYYY-MM-DD') AS "createdAt",
       to_char(i.paid_at, 'YYYY-MM-DD') AS "paidAt"
     FROM invoices i
     WHERE ($1 = '' OR i.status = $1)
       AND ($2::integer IS NULL OR i.customer_id = $2)
       AND ($3 = '' OR i.bill_name ILIKE '%' || $3 || '%' OR replace(upper(i.reg), ' ', '') LIKE '%' || replace(upper($3), ' ', '') || '%'
            OR i.number::text = $3)
     ORDER BY i.status = 'draft' DESC, i.number DESC NULLS LAST, i.id DESC LIMIT 200`,
    [f.status ?? '', f.customerId ?? null, q]);
  return rows;
}

/** Outstanding (issued, unpaid) total and count, for the list page. */
export async function outstanding() {
  const { rows } = await db.query<{ n: number; pence: number }>(
    `SELECT count(*)::int AS n, coalesce(sum(total_pence), 0)::int AS pence FROM invoices WHERE status = 'issued'`);
  return rows[0];
}

const vehicleDescription = (v: { make: string; model: string; colour: string; year: number | null }) =>
  [v.year, v.make, v.model, v.colour && `(${v.colour.toLowerCase()})`].filter(Boolean).join(' ');

/** A line for a booked service: MOT and DPF at their fixed prices, anything else to be priced. */
function bookingLine(service: string): Line {
  const s = serviceById(service);
  const kind: LineKind = service === 'mot' ? 'mot' : service === 'tyres' ? 'part' : 'labour';
  const fixed: Record<string, number> = { mot: 4500, dpf: 15000 };
  return { kind, description: s?.name ?? service, quantity: 1, unitPence: fixed[service] ?? 0, vatRate: defaultVatRate(kind) };
}

/** A new draft for a customer (and vehicle), optionally started from a booking. */
export async function createDraft(o: { customerId: number; vehicleId?: number | null; booking?: StoredBooking | null; staffId: number }) {
  const customer = await getCustomer(o.customerId);
  if (!customer) throw new Error('Customer not found');
  const vehicleId = o.vehicleId ?? o.booking?.vehicleId ?? customer.vehicles[0]?.id ?? null;
  const vehicle = vehicleId ? await getVehicle(vehicleId) : null;
  return db.tx(async tx => {
    const { rows } = await tx.query<{ id: number }>(
      `INSERT INTO invoices (customer_id, vehicle_id, booking_id, bill_name, bill_address, bill_phone, bill_email, reg, vehicle_desc, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [customer.id, vehicle?.id ?? null, o.booking?.id ?? null, customer.name, customer.address, customer.phone, customer.email,
        vehicle?.reg ?? o.booking?.reg ?? '', vehicle ? vehicleDescription(vehicle) : '', o.staffId]);
    const id = rows[0].id;
    if (o.booking) await writeLines(tx, id, [bookingLine(o.booking.service)]);
    return id;
  });
}

async function writeLines(tx: Db, id: number, lines: Line[]) {
  await tx.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
  for (const [i, l] of lines.entries()) {
    await tx.query(
      'INSERT INTO invoice_items (invoice_id, position, kind, description, quantity, unit_pence, vat_rate) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, i, l.kind, l.description, l.quantity, l.unitPence, VAT_REGISTERED ? l.vatRate : null]);
  }
  const t = totals(lines.map(l => ({ ...l, vatRate: VAT_REGISTERED ? l.vatRate : null })));
  await tx.query('UPDATE invoices SET net_pence = $2, vat_pence = $3, total_pence = $4, updated_at = now() WHERE id = $1',
    [id, t.net, t.vat, t.total]);
}

export type DraftInput = {
  vehicleId: number | null; billName: string; billAddress: string; billPhone: string; billEmail: string;
  reg: string; vehicleDesc: string; mileage: number | null; notes: string; nextMotDue: string | null; lines: Line[];
};

/** Saves a draft. False if it's no longer a draft (issued meanwhile). */
export async function saveDraft(id: number, d: DraftInput): Promise<boolean> {
  return db.tx(async tx => {
    const res = await tx.query(
      `UPDATE invoices SET vehicle_id = $2, bill_name = $3, bill_address = $4, bill_phone = $5, bill_email = $6, reg = $7,
         vehicle_desc = $8, mileage = $9, notes = $10, next_mot_due = $11, updated_at = now()
       WHERE id = $1 AND status = 'draft'`,
      [id, d.vehicleId, d.billName, d.billAddress, d.billPhone, d.billEmail, d.reg, d.vehicleDesc, d.mileage, d.notes, d.nextMotDue]);
    if (res.rowCount === 0) return false;
    await writeLines(tx, id, d.lines);
    return true;
  });
}

/** Problems that stop a draft being issued, or null. */
export function issueProblem(i: Invoice): string | null {
  if (i.status !== 'draft') return 'Only drafts can be issued.';
  if (!i.billName.trim()) return 'Add the customer’s name.';
  if (i.lines.length === 0) return 'Add at least one line.';
  if (i.lines.some(l => !l.description.trim())) return 'Every line needs a description.';
  if (i.totalPence <= 0) return 'The total must be more than £0.00.';
  return null;
}

/**
 * Issues a draft: next invoice number, today's date, and the new MOT date saved to the vehicle.
 * Returns an error message, or null when issued.
 */
export async function issueInvoice(id: number): Promise<string | null> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.tx(async tx => {
        const inv = await getInvoice(id, tx);
        if (!inv) return 'Invoice not found.';
        const problem = issueProblem(inv);
        if (problem) return problem;
        const { rows } = await tx.query<{ n: number }>('SELECT coalesce(max(number), $1 - 1)::int + 1 AS n FROM invoices', [COMPANY.firstInvoiceNumber]);
        await tx.query(`UPDATE invoices SET number = $2, status = 'issued', issue_date = $3, updated_at = now() WHERE id = $1 AND status = 'draft'`,
          [id, rows[0].n, todayIso()]);
        if (inv.nextMotDue && inv.vehicleId) {
          // Never moves an MOT date backwards (e.g. reissuing an old job).
          await tx.query('UPDATE vehicles SET mot_due = $2 WHERE id = $1 AND (mot_due IS NULL OR mot_due < $2)', [inv.vehicleId, inv.nextMotDue]);
        }
        return null;
      });
    } catch (err) {
      // Two invoices issued at the same moment: try the next number.
      if (constraintOf(err) !== 'invoices_number_key') throw err;
    }
  }
  return 'Couldn’t allocate an invoice number. Please try again.';
}

export async function markPaid(id: number, method: string, date: string) {
  await db.query(`UPDATE invoices SET status = 'paid', payment_method = $2, paid_at = $3, updated_at = now() WHERE id = $1 AND status = 'issued'`,
    [id, method, date]);
}

export async function markUnpaid(id: number) {
  await db.query(`UPDATE invoices SET status = 'issued', payment_method = NULL, paid_at = NULL, updated_at = now() WHERE id = $1 AND status = 'paid'`, [id]);
}

/** Voids an issued or paid invoice. It keeps its number, so the sequence has no gaps. */
export async function voidInvoice(id: number) {
  await db.query(`UPDATE invoices SET status = 'void', updated_at = now() WHERE id = $1 AND status IN ('issued', 'paid')`, [id]);
}

export async function deleteDraft(id: number) {
  await db.query(`DELETE FROM invoices WHERE id = $1 AND status = 'draft'`, [id]);
}
