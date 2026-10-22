import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { firstReminderDay } from '@/lib/reminder-rules.ts';
import { recentSends, upcomingDue, type UpcomingDue } from '@/lib/reminders.ts';
import { addDays, fmtShort, todayIso } from '@/lib/schedule.ts';

export const dynamic = 'force-dynamic';

function status(u: UpcomingDue, today: string) {
  if (!u.email) return <span className="adm-badge adm-badge--alert">No email: call {u.phone || 'them'}</span>;
  if (!u.remindersOk) return <span className="adm-badge adm-badge--off">Opted out: call</span>;
  if (u.lastSent) return <span className="adm-badge adm-badge--ok">Emailed {fmtShort(u.lastSent)}</span>;
  const first = firstReminderDay(u.what === 'MOT' ? 'mot_due' : 'service_due', u.due);
  return <span className="adm-muted">{first > today ? `Email goes ${fmtShort(first)}` : u.due < today ? 'Not reminded' : 'Email goes at the next 8:30 run'}</span>;
}

function Table({ rows, today, empty }: { rows: UpcomingDue[]; today: string; empty: string }) {
  return (
    <div className="adm-table-wrap">
      <table className="adm-table">
        <thead><tr><th>Due</th><th>What</th><th>Vehicle</th><th>Customer</th><th>Reminder</th></tr></thead>
        <tbody>
          {rows.map(u => (
            <tr key={`${u.vehicleId}-${u.what}`}>
              <td className="adm-nowrap adm-strong">{fmtShort(u.due)}</td>
              <td>{u.what}</td>
              <td><span className="done__plate">{u.reg}</span> <span className="adm-muted">{[u.make, u.model].filter(Boolean).join(' ')}</span></td>
              <td><Link href={`/admin/customers/${u.customerId}`}>{u.name}</Link>{u.phone && <div className="adm-muted"><a href={`tel:${u.phone.replace(/[^\d+]/g, '')}`}>{u.phone}</a></div>}</td>
              <td>{status(u, today)}</td>
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={5} className="adm-muted">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function RemindersPage() {
  await requireStaff();
  const today = todayIso();
  const [upcoming, overdue, sends] = await Promise.all([
    upcomingDue(today, addDays(today, 45)), upcomingDue(addDays(today, -60), addDays(today, -1)), recentSends(30),
  ]);
  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">Reminders</h1>
      <p className="adm-muted" style={{ margin: 0, maxWidth: 760 }}>
        Each morning, customers are emailed about 30 and 7 days before their MOT runs out, and 14 days before a service is due,
        with a link to book. MOT dates come from the vehicle record: set them on the customer’s page, look them up from DVLA, or
        enter the new expiry on the MOT invoice. Customers without an email, or who opted out, are listed here to call.
      </p>

      <section className="card">
        <h2 className="adm-h2">Due in the next 45 days</h2>
        <Table rows={upcoming} today={today} empty="Nothing due." />
      </section>
      <section className="card">
        <h2 className="adm-h2">Ran out in the last 60 days</h2>
        <p className="adm-muted" style={{ margin: '6px 0 0' }}>Worth a call: driving without a valid MOT can mean a fine of up to £1,000.</p>
        <Table rows={overdue} today={today} empty="None." />
      </section>
      <section className="card">
        <h2 className="adm-h2">Recently sent</h2>
        <ul className="adm-list">
          {sends.map((s, i) => (
            <li key={i} className="adm-row">
              <span className="adm-nowrap adm-muted">{s.sentAt}</span>
              <span className="done__plate">{s.reg}</span>
              <Link href={`/admin/customers/${s.customerId}`}>{s.name}</Link>
              <span>{s.kind.startsWith('mot') ? `MOT, ${s.kind === 'mot-7' ? '7' : '30'} days` : 'Service'} · due {fmtShort(s.due)}</span>
              <span className="adm-muted">{s.sentTo}</span>
            </li>
          ))}
          {sends.length === 0 && <li className="adm-muted">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
