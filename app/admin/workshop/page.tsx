import Link from 'next/link';
import { requireStaff } from '@/lib/auth.ts';
import { moveLabel, nextStatuses, STATUSES, type JobStatus } from '@/lib/job-status.ts';
import { boardJobs, jobsForBookings, type Job } from '@/lib/jobs.ts';
import { can } from '@/lib/roles.ts';
import { fmtHour, todayIso } from '@/lib/schedule.ts';
import { serviceById } from '@/lib/site.ts';
import { store } from '@/lib/store.ts';
import { openJobFromBookingAction, setStatusAction } from '../jobs/actions.ts';

export const dynamic = 'force-dynamic';

const COLUMNS: JobStatus[] = ['booked', 'in_progress', 'waiting_parts', 'ready', 'collected'];

/** "2h 10m" or "3 days" since the job reached its status. Both times are UK wall-clock, read the same way. */
function since(statusAt: string, now: number) {
  const mins = Math.max(0, Math.round((now - Date.parse(statusAt.replace(' ', 'T') + ':00Z')) / 60000));
  if (mins < 60) return `${mins}m`;
  if (mins < 24 * 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  const d = Math.floor(mins / 1440);
  return `${d} day${d === 1 ? '' : 's'}`;
}

function Card({ job, write, now }: { job: Job; write: boolean; now: number }) {
  const next = nextStatuses(job.status).find(s => s !== 'cancelled' && s !== 'booked');
  return (
    <li className="adm-jobcard">
      <Link href={`/admin/jobs/${job.id}`} className="adm-jobcard__link">
        <span className="adm-jobcard__head">
          <span className="done__plate">{job.reg || '—'}</span>
          <span className="adm-muted">Job {job.id}</span>
        </span>
        <span className="adm-jobcard__car">{job.vehicleDesc || job.customerName}</span>
        {job.vehicleDesc && <span className="adm-muted">{job.customerName}</span>}
        <span className="adm-jobcard__work">{job.requested}</span>
        <span className="adm-jobcard__meta">
          <span>{job.mechanicName ?? 'Unassigned'}</span>
          {job.tasksTotal > 0 && <span>✓ {job.tasksDone}/{job.tasksTotal}</span>}
          {job.photos > 0 && <span>{job.photos} photo{job.photos === 1 ? '' : 's'}</span>}
          <span title="Time in this column">{since(job.statusAt, now)}</span>
        </span>
      </Link>
      {write && next && job.status !== 'collected' && (
        <form action={setStatusAction}>
          <input type="hidden" name="id" value={job.id} /><input type="hidden" name="to" value={next} />
          <button className="adm-btn adm-btn--sm adm-jobcard__move">{moveLabel(job.status, next)} →</button>
        </form>
      )}
    </li>
  );
}

export default async function WorkshopPage({ searchParams }: { searchParams: Promise<{ mechanic?: string }> }) {
  const me = await requireStaff();
  const write = can(me.role, 'write');
  const { mechanic = '' } = await searchParams;
  const today = todayIso();
  const [all, todays] = await Promise.all([boardJobs(today), store().dayBookings(today)]);
  const carded = await jobsForBookings(todays.map(b => b.id));
  const waiting = todays.filter(b => !carded[b.id]);
  const jobs = all.filter(j => mechanic === 'me' ? j.mechanicId === me.id : mechanic === 'none' ? j.mechanicId == null : true);
  // statusAt is formatted as UK wall-clock time; compare against UK wall-clock now.
  const ukNow = Date.parse(new Date().toLocaleString('sv-SE', { timeZone: 'Europe/London' }).replace(' ', 'T') + 'Z');
  const filters = [{ v: '', l: 'Everyone' }, { v: 'me', l: 'My jobs' }, { v: 'none', l: 'Unassigned' }];

  return (
    <div className="wrap page-body adm-page adm-page--wide">
      <div className="adm-top">
        <h1 className="adm-h1">Workshop</h1>
        <nav className="adm-tabs" aria-label="Mechanic">
          {filters.map(f => <Link key={f.v} href={f.v ? `/admin/workshop?mechanic=${f.v}` : '/admin/workshop'} aria-current={mechanic === f.v ? 'page' : undefined}>{f.l}</Link>)}
        </nav>
      </div>

      {waiting.length > 0 && (
        <section className="card">
          <h2 className="adm-h2">Due in today, no job card yet</h2>
          <ul className="adm-list">
            {waiting.map(b => (
              <li key={b.id} className="adm-row">
                <span className="adm-strong adm-nowrap">{fmtHour(b.hour)}</span>
                <span className="done__plate">{b.reg}</span>
                <span>{serviceById(b.service)?.name ?? b.service}</span>
                <span className="adm-muted">{b.name}</span>
                {write && (
                  <form action={openJobFromBookingAction} style={{ marginLeft: 'auto' }}>
                    <input type="hidden" name="bookingId" value={b.id} /><button className="adm-btn adm-btn--sm">Book in</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="adm-board">
        {COLUMNS.map(col => {
          const list = jobs.filter(j => j.status === col);
          return (
            <section key={col} className={`adm-board__col adm-board__col--${col}`} aria-label={STATUSES.find(s => s.value === col)!.board}>
              <h2 className="adm-board__title">{col === 'collected' ? 'Collected today' : STATUSES.find(s => s.value === col)!.board} <span>{list.length}</span></h2>
              <ul className="adm-board__list">
                {list.map(j => <Card key={j.id} job={j} write={write} now={ukNow} />)}
                {list.length === 0 && <li className="adm-board__empty">None</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
