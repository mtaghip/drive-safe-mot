'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireStaff } from '@/lib/auth.ts';
import { getVehicle } from '@/lib/customers.ts';
import { send } from '@/lib/email.ts';
import { gbp, LINE_KINDS, type Line, type LineKind } from '@/lib/invoice-calc.ts';
import { renderInvoiceHtml, renderInvoiceText } from '@/lib/invoice-document.ts';
import {
  createDraft, deleteDraft, getInvoice, invoiceLabel, issueInvoice, markPaid, markUnpaid, PAYMENT_METHODS, saveDraft, voidInvoice,
  type DraftInput,
} from '@/lib/invoices.ts';
import { isIsoDate, todayIso } from '@/lib/schedule.ts';
import { COMPANY, EMAIL, VAT_REGISTERED } from '@/lib/site.ts';
import { store } from '@/lib/store.ts';

export type InvoiceState = { error?: string; ok?: string } | undefined;
const num = (f: FormData, k: string) => Number(f.get(k));
const page = (id: number) => `/admin/invoices/${id}`;

/** New draft for a customer (optionally a vehicle), or from a diary booking. */
export async function createInvoiceAction(form: FormData) {
  const me = await requireStaff('write');
  const booking = form.get('bookingId') ? await store().byId(num(form, 'bookingId')) : null;
  const customerId = booking?.customerId ?? num(form, 'customerId');
  if (!customerId) throw new Error('No customer for this invoice.');
  const id = await createDraft({ customerId, vehicleId: form.get('vehicleId') ? num(form, 'vehicleId') : null, booking, staffId: me.id });
  await audit(me, 'Started invoice', 'invoice', id, booking ? `from booking ${booking.ref}` : '');
  redirect(page(id));
}

const KINDS = new Set(LINE_KINDS.map(k => k.value));
const VAT_RATES = [20, 5, 0];

function parseDraft(raw: string): { ok: true; value: DraftInput } | { ok: false; error: string } {
  let d: Record<string, unknown>;
  try { d = JSON.parse(raw); } catch { return { ok: false, error: 'Couldn’t read the form. Reload and try again.' }; }
  const s = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max);
  const lines: Line[] = [];
  for (const [i, l] of ((d.lines as Record<string, unknown>[]) ?? []).entries()) {
    const kind = String(l.kind) as LineKind, quantity = Number(l.quantity), unitPence = Number(l.unitPence);
    const vatRate = l.vatRate == null || l.vatRate === '' ? null : Number(l.vatRate);
    if (!KINDS.has(kind)) return { ok: false, error: `Line ${i + 1}: choose a type.` };
    if (!(quantity > 0 && quantity <= 10000) || Math.abs(Math.round(quantity * 100) - quantity * 100) > 1e-6) return { ok: false, error: `Line ${i + 1}: quantity must be a number above 0, up to 2 decimal places.` };
    if (!Number.isInteger(unitPence) || Math.abs(unitPence) > 100_000_00) return { ok: false, error: `Line ${i + 1}: enter a price.` };
    if (vatRate != null && !VAT_RATES.includes(vatRate)) return { ok: false, error: `Line ${i + 1}: choose a VAT rate.` };
    lines.push({ kind, description: s(l.description, 300), quantity, unitPence, vatRate: VAT_REGISTERED ? vatRate : null });
  }
  if (lines.length > 100) return { ok: false, error: 'Too many lines.' };
  const mileage = d.mileage === '' || d.mileage == null ? null : Number(d.mileage);
  if (mileage != null && !(Number.isInteger(mileage) && mileage >= 0 && mileage < 2_000_000)) return { ok: false, error: 'Mileage must be a whole number.' };
  const nextMotDue = s(d.nextMotDue, 10);
  if (nextMotDue && !isIsoDate(nextMotDue)) return { ok: false, error: 'Check the next MOT date.' };
  return {
    ok: true,
    value: {
      vehicleId: d.vehicleId ? Number(d.vehicleId) : null,
      billName: s(d.billName, 120), billAddress: s(d.billAddress, 500), billPhone: s(d.billPhone, 40), billEmail: s(d.billEmail, 200),
      reg: s(d.reg, 12).toUpperCase(), vehicleDesc: s(d.vehicleDesc, 120), mileage, notes: s(d.notes, 2000),
      nextMotDue: nextMotDue || null, lines,
    },
  };
}

export async function saveDraftAction(_: InvoiceState, form: FormData): Promise<InvoiceState> {
  const me = await requireStaff('write');
  const id = num(form, 'id');
  const parsed = parseDraft(String(form.get('data') ?? ''));
  if (!parsed.ok) return { error: parsed.error };
  const inv = await getInvoice(id);
  if (!inv) return { error: 'Invoice not found.' };
  if (parsed.value.vehicleId) {
    const v = await getVehicle(parsed.value.vehicleId);
    if (!v || v.customerId !== inv.customerId) parsed.value.vehicleId = null;
  }
  if (!(await saveDraft(id, parsed.value))) return { error: 'This invoice has already been issued, so it can’t be changed.' };
  revalidatePath(page(id));
  if (form.get('intent') !== 'issue') return { ok: 'Draft saved.' };
  const problem = await issueInvoice(id);
  if (problem) return { error: problem };
  const issued = await getInvoice(id);
  await audit(me, 'Issued invoice', 'invoice', id, `${invoiceLabel(issued!)} · ${issued!.billName} · ${gbp(issued!.totalPence)}`);
  redirect(page(id));
}

export async function deleteDraftAction(form: FormData) {
  const me = await requireStaff('write');
  const id = num(form, 'id');
  await deleteDraft(id);
  await audit(me, 'Deleted draft invoice', 'invoice', id);
  redirect('/admin/invoices');
}

export async function markPaidAction(_: InvoiceState, form: FormData): Promise<InvoiceState> {
  const me = await requireStaff('write');
  const id = num(form, 'id'), method = String(form.get('method')), date = String(form.get('date'));
  if (!PAYMENT_METHODS.some(m => m.value === method)) return { error: 'Choose how they paid.' };
  if (!isIsoDate(date) || date > todayIso()) return { error: 'Choose the date they paid (not in the future).' };
  await markPaid(id, method, date);
  const inv = await getInvoice(id);
  await audit(me, 'Marked invoice paid', 'invoice', id, `${inv ? invoiceLabel(inv) : ''} · ${method}`);
  revalidatePath(page(id));
  return { ok: 'Marked as paid.' };
}

export async function markUnpaidAction(form: FormData) {
  const me = await requireStaff('write');
  const id = num(form, 'id');
  await markUnpaid(id);
  await audit(me, 'Marked invoice unpaid', 'invoice', id);
  revalidatePath(page(id));
}

export async function voidAction(form: FormData) {
  const me = await requireStaff('manage');
  const id = num(form, 'id');
  await voidInvoice(id);
  const inv = await getInvoice(id);
  await audit(me, 'Voided invoice', 'invoice', id, inv ? `${invoiceLabel(inv)} · ${gbp(inv.totalPence)}` : '');
  revalidatePath(page(id));
}

export async function emailInvoiceAction(_: InvoiceState, form: FormData): Promise<InvoiceState> {
  const me = await requireStaff('write');
  const inv = await getInvoice(num(form, 'id'));
  if (!inv || inv.status === 'draft') return { error: 'Issue the invoice before emailing it.' };
  if (!inv.billEmail) return { error: 'There’s no email address on this invoice.' };
  try {
    await send({
      to: inv.billEmail, replyTo: EMAIL,
      subject: `${inv.status === 'paid' ? 'Receipt' : 'Invoice'} ${inv.number} from ${COMPANY.tradingName}`,
      html: `<div style="background:#f6f4ee;padding:16px 0;">${renderInvoiceHtml(inv)}</div>`,
      text: renderInvoiceText(inv),
    });
  } catch (err) {
    console.error('[invoice] email failed', err);
    return { error: 'Couldn’t send the email. Check the email settings.' };
  }
  await audit(me, 'Emailed invoice', 'invoice', inv.id, `${invoiceLabel(inv)} to ${inv.billEmail}`);
  return { ok: `Sent to ${inv.billEmail}.` };
}
