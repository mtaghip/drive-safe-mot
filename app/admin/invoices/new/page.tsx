import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { searchCustomers, vehiclesFor } from '@/lib/customers.ts';
import { fmtDate } from '@/lib/schedule.ts';
import { createInvoiceAction } from '../actions.ts';
import NewCustomerInvoiceForm from './NewCustomerInvoiceForm.tsx';

export const dynamic = 'force-dynamic';

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff('write');
  const q = ((await searchParams).q ?? '').trim();
  const found = q ? await searchCustomers(q, 20) : [];
  const vehicles = await vehiclesFor(found.map(c => c.id));
  return (
    <div className="wrap page-body adm-page">
      <div>
        <Link href="/admin/invoices" className="adm-muted">‹ Invoices</Link>
        <h1 className="adm-h1">New invoice</h1>
      </div>

      <section className="card">
        <h2 className="adm-h2">Existing customer</h2>
        <form className="adm-inline" action="/admin/invoices/new" style={{ marginTop: 10 }}>
          <input name="q" defaultValue={q} placeholder="Name, phone, email or registration" aria-label="Find a customer" className="adm-input" autoFocus />
          <button className="adm-btn adm-btn--ghost">Find</button>
        </form>
        {q && (
          <div className="adm-table-wrap" style={{ marginTop: 12 }}>
            <table className="adm-table">
              <tbody>
                {found.map(c => {
                  const cars = vehicles.get(c.id) ?? [];
                  return (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.name}</strong>
                        <div className="adm-muted">
                          {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
                          {c.lastVisit ? ` · last booking ${fmtDate(c.lastVisit)}` : ''}
                        </div>
                      </td>
                      <td>
                        <div className="adm-actions">
                          {cars.map(v => (
                            <form key={v.id} action={createInvoiceAction}>
                              <input type="hidden" name="customerId" value={c.id} /><input type="hidden" name="vehicleId" value={v.id} />
                              <button className="adm-btn adm-btn--sm">Invoice {v.reg}</button>
                            </form>
                          ))}
                          <form action={createInvoiceAction}>
                            <input type="hidden" name="customerId" value={c.id} />
                            <button className={'adm-btn adm-btn--sm' + (cars.length ? ' adm-btn--ghost' : '')}>{cars.length ? 'Other vehicle' : 'Start invoice'}</button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {found.length === 0 && <tr><td className="adm-muted">No customer matches “{q}”. Add them below.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="adm-h2">New customer</h2>
        <p className="adm-muted" style={{ margin: '6px 0 12px' }}>
          They’re added to Customers too. If the phone number or email matches someone already on file, the invoice goes to them instead.
        </p>
        <NewCustomerInvoiceForm />
      </section>
    </div>
  );
}
