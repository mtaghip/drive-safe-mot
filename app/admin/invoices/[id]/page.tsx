import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireStaff } from '@/lib/auth.ts';
import { getCustomer } from '@/lib/customers.ts';
import { companyDetailsMissing, renderInvoiceHtml } from '@/lib/invoice-document.ts';
import { getInvoice, invoiceLabel, paymentLabel } from '@/lib/invoices.ts';
import { can } from '@/lib/roles.ts';
import { fmtDate, todayIso } from '@/lib/schedule.ts';
import { STANDARD_VAT_RATE, VAT_REGISTERED } from '@/lib/site.ts';
import { ConfirmButton } from '../../Forms.tsx';
import { deleteDraftAction, markUnpaidAction, voidAction } from '../actions.ts';
import InvoiceEditor from '../InvoiceEditor.tsx';
import { EmailInvoiceForm, MarkPaidForm, PrintButton } from './InvoiceActions.tsx';

export const dynamic = 'force-dynamic';

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const inv = Number.isInteger(id) ? await getInvoice(id) : null;
  if (!inv) notFound();
  const write = can(me.role, 'write');
  const customer = inv.customerId ? await getCustomer(inv.customerId) : null;
  const missing = companyDetailsMissing();

  return (
    <div className="wrap page-body adm-page">
      <div className="adm-top no-print">
        <div>
          <Link href="/admin/invoices" className="adm-muted">← Invoices</Link>
          <h1 className="adm-h1">{invoiceLabel(inv)}</h1>
          <div className="adm-slot__meta">
            <span className={`adm-status adm-status--${inv.status}`}>{inv.status}</span>
            {customer && <Link href={`/admin/customers/${customer.id}`}>{customer.name}</Link>}
            {inv.issueDate && <span>Issued {fmtDate(inv.issueDate)}</span>}
            {inv.paidAt && <span>Paid {fmtDate(inv.paidAt)} · {paymentLabel(inv.paymentMethod)}</span>}
          </div>
        </div>
        {inv.status === 'draft' && write && (
          <form action={deleteDraftAction}>
            <input type="hidden" name="id" value={inv.id} />
            <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--danger" message="Delete this draft?">Delete draft</ConfirmButton>
          </form>
        )}
      </div>

      {missing.length > 0 && (
        <p className="adm-banner adm-banner--warn no-print">
          <span>Invoices are missing the company’s {missing.join(', ')}. A limited company must show these on its invoices. Add them in <code>lib/site.ts</code> (COMPANY).</span>
        </p>
      )}

      {inv.status === 'draft' && write ? (
        <>
          <InvoiceEditor inv={inv} vehicles={customer?.vehicles ?? []} vatRegistered={VAT_REGISTERED} standardRate={STANDARD_VAT_RATE} today={todayIso()} />
          <h2 className="adm-h2 no-print" style={{ marginTop: 12 }}>Preview (as last saved)</h2>
        </>
      ) : (
        <div className="card adm-invoice-actions no-print">
          <PrintButton />
          {write && inv.status !== 'draft' && inv.status !== 'void' && <EmailInvoiceForm id={inv.id} email={inv.billEmail} />}
          {write && inv.status === 'issued' && <MarkPaidForm id={inv.id} today={todayIso()} />}
          {write && inv.status === 'paid' && (
            <form action={markUnpaidAction}><input type="hidden" name="id" value={inv.id} />
              <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm" message="Mark this invoice as unpaid again?">Mark unpaid</ConfirmButton></form>
          )}
          {can(me.role, 'manage') && (inv.status === 'issued' || inv.status === 'paid') && (
            <form action={voidAction}><input type="hidden" name="id" value={inv.id} />
              <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--danger" message={`Void ${invoiceLabel(inv)}? It keeps its number but no longer counts. This can't be undone.`}>Void</ConfirmButton></form>
          )}
        </div>
      )}

      <div className="invoice-paper" dangerouslySetInnerHTML={{ __html: renderInvoiceHtml(inv) }} />
    </div>
  );
}
