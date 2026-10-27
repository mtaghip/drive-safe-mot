import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { can } from '@/lib/roles.ts';
import { gbp } from '@/lib/invoice-calc.ts';
import { invoiceLabel, listInvoices, outstanding } from '@/lib/invoices.ts';
import { fmtDate } from '@/lib/schedule.ts';

export const dynamic = 'force-dynamic';

const TABS = [
  { value: '', label: 'All' }, { value: 'draft', label: 'Drafts' }, { value: 'issued', label: 'Unpaid' },
  { value: 'paid', label: 'Paid' }, { value: 'void', label: 'Void' },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const me = await requireStaff();
  const { status = '', q = '' } = await searchParams;
  const tab = TABS.some(t => t.value === status) ? status : '';
  const [invoices, owed] = await Promise.all([listInvoices({ status: tab, q }), outstanding()]);
  const href = (s: string) => `/admin/invoices?${new URLSearchParams({ ...(s ? { status: s } : {}), ...(q ? { q } : {}) })}`;
  return (
    <div className="wrap page-body adm-page">
      <div className="adm-top">
        <h1 className="adm-h1">Invoices</h1>
        {can(me.role, 'write') && <Link href="/admin/invoices/new" className="adm-btn">New invoice</Link>}
      </div>
      <div className="adm-stats">
        <div className="card adm-stat"><span>Unpaid</span><strong>{gbp(owed.pence)}</strong><span>{owed.n} invoice{owed.n === 1 ? '' : 's'}</span></div>
      </div>
      <div className="adm-top">
        <nav className="adm-tabs" aria-label="Filter">
          {TABS.map(t => <Link key={t.value} href={href(t.value)} aria-current={tab === t.value ? 'page' : undefined}>{t.label}</Link>)}
        </nav>
        <form className="adm-inline" action="/admin/invoices">
          {tab && <input type="hidden" name="status" value={tab} />}
          <input name="q" defaultValue={q} placeholder="Name, registration or number" aria-label="Search invoices" className="adm-input" />
          <button className="adm-btn adm-btn--ghost">Search</button>
        </form>
      </div>
      <div className="card adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th>Vehicle</th><th>Status</th><th className="adm-num">Total</th></tr></thead>
          <tbody>
            {invoices.map(i => (
              <tr key={i.id}>
                <td><Link href={`/admin/invoices/${i.id}`} className="adm-strong">{invoiceLabel(i)}</Link></td>
                <td className="adm-nowrap">{fmtDate(i.issueDate ?? i.createdAt)}</td>
                <td>{i.billName}</td><td className="adm-nowrap">{i.reg}</td>
                <td><span className={`adm-status adm-status--${i.status}`}>{i.status === 'issued' ? 'unpaid' : i.status}</span></td>
                <td className="adm-num adm-strong">{gbp(i.totalPence)}</td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={6} className="adm-muted">No invoices{tab || q ? ' match' : ' yet'}.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
