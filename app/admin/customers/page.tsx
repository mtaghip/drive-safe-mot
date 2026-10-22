import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { searchCustomers } from '@/lib/customers.ts';
import { can } from '@/lib/roles.ts';
import { fmtDate } from '@/lib/schedule.ts';

export const dynamic = 'force-dynamic';

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireStaff();
  const { q = '' } = await searchParams;
  const customers = await searchCustomers(q);
  return (
    <div className="wrap page-body adm-page">
      <div className="adm-top">
        <h1 className="adm-h1">Customers</h1>
        {can(me.role, 'write') && <Link href="/admin/customers/new" className="adm-btn">New customer</Link>}
      </div>
      <form className="adm-inline" action="/admin/customers">
        <input name="q" defaultValue={q} placeholder="Search name, phone, email or registration" aria-label="Search customers" className="adm-input adm-search" />
        <button className="adm-btn adm-btn--ghost">Search</button>
        {q && <Link href="/admin/customers" className="adm-muted">Clear</Link>}
      </form>
      <p className="adm-muted" style={{ margin: 0 }}>
        {q ? `${customers.length} match${customers.length === 1 ? '' : 'es'}` : 'Most recently active first.'} Customers who book online or by phone are added automatically.
      </p>
      <div className="card adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Name</th><th>Vehicles</th><th>Phone</th><th>Email</th><th>Last booking</th><th>Invoices</th></tr></thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id}>
                <td><Link href={`/admin/customers/${c.id}`} className="adm-strong">{c.name}</Link>{!c.remindersOk && <span className="adm-badge adm-badge--off" title="Opted out of reminders">No reminders</span>}</td>
                <td>{c.regs}</td>
                <td className="adm-nowrap">{c.phone}</td>
                <td className="adm-break">{c.email}</td>
                <td className="adm-nowrap">{c.lastVisit ? fmtDate(c.lastVisit) : ''}</td>
                <td>{c.invoices || ''}</td>
              </tr>
            ))}
            {customers.length === 0 && <tr><td colSpan={6} className="adm-muted">{q ? 'No customers match.' : 'No customers yet.'}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
