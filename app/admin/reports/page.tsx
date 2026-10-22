import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { gbp, LINE_KINDS, paymentLabel } from '@/lib/invoice-calc.ts';
import { bucketLabel, PRESETS, resolvePeriod, type Group } from '@/lib/report-periods.ts';
import { bookingSources, CONVERSION_DAYS, reminderConversion, takingsSeries, takingsSummary, unpaidInvoices, workByService } from '@/lib/reports.ts';
import { fmtDate, todayIso } from '@/lib/schedule.ts';
import { serviceById } from '@/lib/site.ts';
import { ColumnChart, HBarChart, ShareBar } from './Charts.tsx';

export const dynamic = 'force-dynamic';

const SERIES = { online: '#2a78d6', phone: '#eb6834' };
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');
const reminderName = (k: string) => (k === 'mot-30' ? 'MOT, 30 days before' : k === 'mot-7' ? 'MOT, 7 days before' : k === 'service-14' ? 'Service, 14 days before' : k);

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return <div className="card adm-stat"><span>{label}</span><strong>{value}</strong>{note && <span>{note}</span>}</div>;
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await requireStaff('viewReports');
  const q = await searchParams, today = todayIso();
  const p = resolvePeriod(q, today);
  const [series, summary, work, unpaid, sources, reminders] = await Promise.all([
    takingsSeries(p.from, p.to, p.group), takingsSummary(p.from, p.to), workByService(p.from, p.to),
    unpaidInvoices(today), bookingSources(p.from, p.to), reminderConversion(p.from, p.to),
  ]);
  const link = (o: Record<string, string>) => `/admin/reports?${new URLSearchParams(o)}`;
  const keep: Record<string, string> = p.preset === 'custom' ? { preset: 'custom', from: p.from, to: p.to } : { preset: p.preset };
  const owed = unpaid.reduce((s, u) => s + u.pence, 0);
  const kept = sources.online.kept + sources.phone.kept;
  const sent = reminders.reduce((s, r) => s + r.sent, 0), converted = reminders.reduce((s, r) => s + r.converted, 0);
  const open = reminders.reduce((s, r) => s + r.open, 0);
  const groupLabel: Record<Group, string> = { day: 'Day', week: 'Week', month: 'Month' };

  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">Reports</h1>

      <section className="card">
        <div className="adm-section-head">
          <h2 className="adm-h2">Unpaid right now</h2>
          <span className="adm-strong">{gbp(owed)} · {unpaid.length} invoice{unpaid.length === 1 ? '' : 's'}</span>
        </div>
        {unpaid.length === 0 ? <p className="adm-muted">Nothing outstanding.</p> : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead><tr><th>Invoice</th><th>Issued</th><th>Waiting</th><th>Customer</th><th>Vehicle</th><th className="adm-num">Total</th></tr></thead>
              <tbody>
                {unpaid.map(u => (
                  <tr key={u.id}>
                    <td><Link href={`/admin/invoices/${u.id}`} className="adm-strong">{u.number}</Link></td>
                    <td className="adm-nowrap">{fmtDate(u.issueDate)}</td>
                    <td><span className={'adm-badge' + (u.days > 30 ? ' adm-badge--alert' : u.days > 7 ? '' : ' adm-badge--off')}>{u.days === 0 ? 'Today' : `${u.days} day${u.days === 1 ? '' : 's'}`}</span></td>
                    <td>{u.billName}{u.billPhone && <div className="adm-muted"><a href={`tel:${u.billPhone.replace(/[^\d+]/g, '')}`}>{u.billPhone}</a></div>}</td>
                    <td className="adm-nowrap">{u.reg}</td>
                    <td className="adm-num adm-strong">{gbp(u.pence)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="adm-filters">
        <nav className="adm-tabs" aria-label="Period">
          {PRESETS.map(x => <Link key={x.value} href={link({ preset: x.value })} aria-current={p.preset === x.value ? 'page' : undefined}>{x.label}</Link>)}
        </nav>
        <form className="adm-inline" action="/admin/reports">
          <input type="hidden" name="preset" value="custom" />
          <input type="date" name="from" defaultValue={p.from} aria-label="From" className="adm-input" required />
          <span className="adm-muted">to</span>
          <input type="date" name="to" defaultValue={p.to} aria-label="To" className="adm-input" required />
          <button className="adm-btn adm-btn--ghost">Show</button>
        </form>
      </div>
      <p className="adm-muted" style={{ margin: 0 }}>{p.label}: {fmtDate(p.from)} to {fmtDate(p.to)}. Everything below covers these dates.</p>

      <section className="card">
        <div className="adm-section-head">
          <h2 className="adm-h2">Takings</h2>
          <a className="adm-btn adm-btn--ghost adm-btn--sm" href={`/admin/reports/takings?${new URLSearchParams(keep)}`}>Download CSV for the accountant</a>
        </div>
        <div className="adm-stats" style={{ marginTop: 14 }}>
          <Stat label="Money taken" value={gbp(summary.paid.pence)} note={`${summary.paid.n} paid invoice${summary.paid.n === 1 ? '' : 's'}`} />
          <Stat label="Average invoice" value={summary.paid.n ? gbp(Math.round(summary.paid.pence / summary.paid.n)) : '—'} />
          <Stat label="Invoiced" value={gbp(summary.invoiced.pence)} note={`${summary.invoiced.n} issued in the period`} />
        </div>
        <div className="adm-section-head" style={{ marginTop: 18 }}>
          <h3 className="adm-h3">Money taken by {groupLabel[p.group].toLowerCase()}</h3>
          <nav className="adm-tabs adm-tabs--sm" aria-label="Group by">
            {(['day', 'week', 'month'] as const).map(g => <Link key={g} href={link({ ...keep, group: g })} aria-current={p.group === g ? 'page' : undefined}>{groupLabel[g]}</Link>)}
          </nav>
        </div>
        <ColumnChart caption={`Money taken by ${p.group}`} data={series.map(r => ({
          key: r.bucket, label: bucketLabel(r.bucket, p.group), longLabel: bucketLabel(r.bucket, p.group, true),
          value: r.pence, display: gbp(r.pence), note: r.n ? `${r.n} invoice${r.n === 1 ? '' : 's'}` : 'No payments',
        }))} />
        {summary.byMethod.length > 0 && (
          <ul className="adm-list adm-methods">
            {summary.byMethod.map(m => (
              <li key={m.method} className="adm-row"><span>{paymentLabel(m.method)}</span><span className="adm-muted">{m.n} invoice{m.n === 1 ? '' : 's'}</span><span className="adm-strong" style={{ marginLeft: 'auto' }}>{gbp(m.pence)}</span></li>
            ))}
          </ul>
        )}
      </section>

      <div className="adm-two">
        <section className="card">
          <h2 className="adm-h2">Jobs booked by service</h2>
          <p className="adm-muted" style={{ margin: '4px 0 12px' }}>Online and phone bookings in the diary, not cancelled.</p>
          <HBarChart caption="Jobs booked by service" empty="No bookings in this period." data={work.booked.map(w => ({
            key: w.service, label: serviceById(w.service)?.name ?? w.service, value: w.n, display: String(w.n),
            note: `${pct(w.n, work.booked.reduce((s, x) => s + x.n, 0))} of bookings`,
          }))} />
        </section>
        <section className="card">
          <h2 className="adm-h2">Invoiced by type of work</h2>
          <p className="adm-muted" style={{ margin: '4px 0 12px' }}>Issued and paid invoices; voided ones left out.</p>
          <HBarChart caption="Invoiced amount by type of work" empty="No invoices issued in this period." data={work.invoiced.map(w => ({
            key: w.kind, label: LINE_KINDS.find(k => k.value === w.kind)?.label ?? w.kind, value: w.pence, display: gbp(w.pence),
            note: w.kind === 'mot' ? `${w.qty} MOT${w.qty === 1 ? '' : 's'}` : `${pct(w.pence, work.invoiced.reduce((s, x) => s + x.pence, 0))} of invoiced work`,
          }))} />
        </section>
      </div>

      <section className="card">
        <h2 className="adm-h2">Online or phone bookings</h2>
        <p className="adm-muted" style={{ margin: '4px 0 12px' }}>Bookings for days in this period, by how they were made.</p>
        <ShareBar caption="Bookings made online versus by phone" parts={[
          { key: 'online', label: 'Online', value: sources.online.kept, color: SERIES.online },
          { key: 'phone', label: 'Phone', value: sources.phone.kept, color: SERIES.phone },
        ]} />
        <p className="adm-muted" style={{ margin: '10px 0 0' }}>
          {kept} booking{kept === 1 ? '' : 's'} kept. Cancelled: {sources.online.cancelled} online, {sources.phone.cancelled} phone.
        </p>
      </section>

      <section className="card">
        <h2 className="adm-h2">Did reminders bring customers back?</h2>
        <p className="adm-muted" style={{ margin: '4px 0 0', maxWidth: 760 }}>
          A reminder counts as working if the same car was booked in (and not cancelled) or invoiced within {CONVERSION_DAYS} days of it.
        </p>
        <div className="adm-stats" style={{ marginTop: 14 }}>
          <Stat label="Reminders sent" value={String(sent)} />
          <Stat label="Came back" value={String(converted)} note={sent ? `${pct(converted, sent)} of reminders` : undefined} />
          <Stat label="Still within the window" value={String(open)} note="may yet come back" />
        </div>
        {reminders.length > 0 && (
          <div className="adm-table-wrap" style={{ marginTop: 12 }}>
            <table className="adm-table">
              <thead><tr><th>Reminder</th><th className="adm-num">Sent</th><th className="adm-num">Came back</th><th className="adm-num">Rate</th></tr></thead>
              <tbody>{reminders.map(r => <tr key={r.kind}><td>{reminderName(r.kind)}</td><td className="adm-num">{r.sent}</td><td className="adm-num">{r.converted}</td><td className="adm-num">{pct(r.converted, r.sent)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
