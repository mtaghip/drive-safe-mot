import { requireStaff } from '@/lib/auth.ts';
import { db } from '@/lib/db.ts';

export const dynamic = 'force-dynamic';

export default async function ActivityPage() {
  await requireStaff('viewActivity');
  const { rows } = await db.query<{ id: number; at: string; who: string; action: string; detail: string }>(
    `SELECT id, to_char(at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS at, staff_name AS who, action, detail
     FROM audit_log ORDER BY at DESC, id DESC LIMIT 300`);
  return (
    <div className="wrap page-body adm-page">
      <h1 className="adm-h1">Activity</h1>
      <p className="adm-muted" style={{ margin: 0 }}>Who did what in the staff pages, newest first (last 300).</p>
      <div className="card adm-table-wrap">
        <table className="adm-table">
          <thead><tr><th>When</th><th>Who</th><th>What</th><th>Details</th></tr></thead>
          <tbody>
            {rows.map(r => <tr key={r.id}><td className="adm-nowrap">{r.at}</td><td>{r.who}</td><td>{r.action}</td><td className="adm-muted">{r.detail}</td></tr>)}
            {rows.length === 0 && <tr><td colSpan={4} className="adm-muted">Nothing yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
