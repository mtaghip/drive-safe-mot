import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ConfirmButton } from '../../Forms.tsx';
import { requireStaff } from '@/lib/auth.ts';
import { customerBookings, getCustomer } from '@/lib/customers.ts';
import { gbp } from '@/lib/invoice-calc.ts';
import { invoiceLabel, listInvoices } from '@/lib/invoices.ts';
import { can } from '@/lib/roles.ts';
import { addDays, fmtDate, fmtHour, todayIso } from '@/lib/schedule.ts';
import { serviceById } from '@/lib/site.ts';
import { lookupConfigured } from '@/lib/vehicle-lookup.ts';
import { createInvoiceAction } from '../../invoices/actions.ts';
import { deleteCustomerAction, deleteVehicleAction, setRemindersAction } from '../actions.ts';
import { EditCustomerForm, VehicleForm } from '../Forms.tsx';

export const dynamic = 'force-dynamic';

const due = (d: string | null, today: string) => {
  if (!d) return <span className="adm-muted">—</span>;
  const cls = d < today ? 'adm-due adm-due--late' : d <= addDays(today, 30) ? 'adm-due adm-due--soon' : 'adm-due';
  return <span className={cls}>{fmtDate(d)}</span>;
};

export default async function CustomerPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const c = Number.isInteger(id) ? await getCustomer(id) : null;
  if (!c) notFound();
  const { error } = await searchParams;
  const [bookings, invoices] = await Promise.all([customerBookings(id), listInvoices({ customerId: id })]);
  const write = can(me.role, 'write'), today = todayIso();

  return (
    <div className="wrap page-body adm-page">
      <div className="adm-top">
        <div>
          <Link href="/admin/customers" className="adm-muted">← Customers</Link>
          <h1 className="adm-h1">{c.name}</h1>
          <div className="adm-slot__meta">
            {c.phone && <a href={`tel:${c.phone.replace(/[^\d+]/g, '')}`}>{c.phone}</a>}
            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
            <span>Customer since {fmtDate(c.createdAt)}</span>
          </div>
        </div>
        {write && (
          <form action={createInvoiceAction}>
            <input type="hidden" name="customerId" value={c.id} />
            <button className="adm-btn">New invoice</button>
          </form>
        )}
      </div>
      {error === 'has-invoices' && <p className="adm-banner adm-banner--alert">This customer has invoices, which must be kept, so they can’t be deleted.</p>}

      <section className="card">
        <div className="adm-section-head">
          <h2 className="adm-h2">Vehicles</h2>
        </div>
        <ul className="adm-list">
          {c.vehicles.map(v => (
            <li key={v.id} className="adm-vehicle">
              <div className="adm-slot__head">
                <span className="done__plate">{v.reg}</span>
                <span>{[v.year, v.make, v.model, v.colour && `(${v.colour.toLowerCase()})`].filter(Boolean).join(' ') || <span className="adm-muted">No details yet</span>}</span>
              </div>
              <div className="adm-slot__meta">
                <span>MOT due {due(v.motDue, today)}</span>
                <span>Service due {due(v.serviceDue, today)}</span>
                {v.notes && <span>{v.notes}</span>}
              </div>
              {write && (
                <div className="adm-actions">
                  <details><summary className="adm-btn adm-btn--ghost adm-btn--sm">Edit</summary><VehicleForm customerId={c.id} v={v} lookup={lookupConfigured()} /></details>
                  <form action={createInvoiceAction}>
                    <input type="hidden" name="customerId" value={c.id} /><input type="hidden" name="vehicleId" value={v.id} />
                    <button className="adm-btn adm-btn--ghost adm-btn--sm">Invoice for this car</button>
                  </form>
                  <form action={deleteVehicleAction}>
                    <input type="hidden" name="vehicleId" value={v.id} />
                    <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm" message={`Remove ${v.reg} from ${c.name}?`}>Remove</ConfirmButton>
                  </form>
                </div>
              )}
            </li>
          ))}
          {c.vehicles.length === 0 && <li className="adm-muted">No vehicles yet.</li>}
        </ul>
        {write && <details className="adm-add"><summary className="adm-btn adm-btn--sm">Add vehicle</summary><VehicleForm customerId={c.id} lookup={lookupConfigured()} /></details>}
      </section>

      <section className="card">
        <h2 className="adm-h2">MOT and service reminders</h2>
        <p className="adm-muted" style={{ margin: '6px 0 0' }}>
          {!c.email ? 'No email address, so no reminders can be sent. Add one below, or call when the MOT is due (see Reminders).'
            : c.remindersOk ? `Reminder emails go to ${c.email} about 30 and 7 days before an MOT, and 14 days before a service.`
            : 'This customer has opted out of reminder emails.'}
        </p>
        {write && c.email && (
          <form action={setRemindersAction} style={{ marginTop: 10 }}>
            <input type="hidden" name="id" value={c.id} /><input type="hidden" name="ok" value={c.remindersOk ? '0' : '1'} />
            <button className="adm-btn adm-btn--ghost adm-btn--sm">{c.remindersOk ? 'Stop reminders' : 'Turn reminders back on'}</button>
          </form>
        )}
      </section>

      <section className="card">
        <h2 className="adm-h2">Invoices</h2>
        <ul className="adm-list">
          {invoices.map(i => (
            <li key={i.id} className="adm-row">
              <Link href={`/admin/invoices/${i.id}`} className="adm-strong">{invoiceLabel(i)}</Link>
              <span className="adm-muted">{i.issueDate ? fmtDate(i.issueDate) : `started ${fmtDate(i.createdAt)}`}</span>
              <span>{i.reg}</span><span className={`adm-status adm-status--${i.status}`}>{i.status}</span>
              <span className="adm-strong" style={{ marginLeft: 'auto' }}>{gbp(i.totalPence)}</span>
            </li>
          ))}
          {invoices.length === 0 && <li className="adm-muted">No invoices yet.</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="adm-h2">Bookings</h2>
        <ul className="adm-list">
          {bookings.map(b => (
            <li key={b.id} className="adm-row">
              <Link href={`/admin?date=${b.date}#b${b.id}`}>{fmtDate(b.date)} {fmtHour(b.hour)}</Link>
              <span>{serviceById(b.service)?.name ?? b.service}</span><span>{b.reg}</span>
              <span className="adm-muted">{b.ref}</span>{b.cancelled && <span className="adm-badge adm-badge--off">Cancelled</span>}
            </li>
          ))}
          {bookings.length === 0 && <li className="adm-muted">No bookings.</li>}
        </ul>
      </section>

      <section className="card">
        <h2 className="adm-h2">Details</h2>
        <EditCustomerForm c={c} readOnly={!write} />
        {can(me.role, 'manage') && (
          <form action={deleteCustomerAction} style={{ marginTop: 18 }}>
            <input type="hidden" name="id" value={c.id} />
            <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm adm-btn--danger" message={`Delete ${c.name} and their vehicles? Their bookings stay in the diary. This can't be undone.`}>Delete customer</ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}
