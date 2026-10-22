import Link from 'next/link';
import { notFound } from 'next/navigation';
import { listStaff, requireStaff } from '@/lib/auth.ts';
import { gbp } from '@/lib/invoice-calc.ts';
import { getInvoice } from '@/lib/invoices.ts';
import { isOpen, moveLabel, nextStatuses, statusLabel } from '@/lib/job-status.ts';
import { getJob, invoiceState } from '@/lib/jobs.ts';
import { can } from '@/lib/roles.ts';
import { fmtDate, fmtHour, todayIso } from '@/lib/schedule.ts';
import { COMPANY, serviceById } from '@/lib/site.ts';
import { ConfirmButton } from '../../Forms.tsx';
import { deletePhotoAction, invoiceFromJobAction, setStatusAction } from '../actions.ts';
import { AddTaskForm, EmailReadyButton, JobDetailsForm, PhotoUploader, TaskList } from '../JobForms.tsx';
import { PrintButton } from '../../invoices/[id]/InvoiceActions.tsx';

export const dynamic = 'force-dynamic';

const when = (dt: string) => { const [d, t] = dt.split(' '); return `${fmtDate(d)} ${t}`; };

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireStaff();
  const id = Number((await params).id);
  const job = Number.isInteger(id) ? await getJob(id) : null;
  if (!job) notFound();
  const write = can(me.role, 'write');
  const [staff, payState, invoice] = await Promise.all([
    listStaff(), invoiceState(job), job.invoiceId ? getInvoice(job.invoiceId) : null,
  ]);
  const mechanics = staff.filter(s => s.active && s.role !== 'viewer').map(s => ({ id: s.id, name: s.name }));
  const moves = nextStatuses(job.status);
  const collectWarning = payState === 'paid' ? '' : payState === 'none' ? 'There’s no invoice for this job yet. ' : payState === 'draft' ? 'The invoice is still a draft. ' : 'The invoice isn’t paid yet. ';

  return (
    <div className="wrap page-body adm-page">
      <p className="print-only adm-muted" style={{ margin: 0 }}>{COMPANY.tradingName} · Job sheet · printed {fmtDate(todayIso())}</p>
      <div className="adm-top">
        <div>
          <Link href="/admin/workshop" className="adm-muted no-print">← Workshop</Link>
          <h1 className="adm-h1">Job {job.id}{job.reg && <> · <span className="done__plate adm-plate-lg">{job.reg}</span></>}</h1>
          <div className="adm-slot__meta">
            <span className={`adm-jobstatus adm-jobstatus--${job.status}`}>{statusLabel(job.status)}</span>
            <span>since {when(job.statusAt)}</span>
            {job.bookingDate && <Link href={`/admin?date=${job.bookingDate}#b${job.bookingId}`} className="no-print">Booked {fmtDate(job.bookingDate)} {fmtHour(job.bookingHour!)}</Link>}
          </div>
        </div>
        <div className="adm-inline no-print"><PrintButton label="Print job sheet" /></div>
      </div>

      {write && (
        <section className="card adm-invoice-actions no-print" aria-label="Move this job on">
          {moves.map((to, i) => (
            <form key={to} action={setStatusAction}>
              <input type="hidden" name="id" value={job.id} /><input type="hidden" name="to" value={to} />
              {to === 'cancelled' ? <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--danger" message="Cancel this job?">{moveLabel(job.status, to)}</ConfirmButton>
                : to === 'collected' && collectWarning ? <ConfirmButton className="adm-btn" message={`${collectWarning}Mark as collected anyway?`}>{moveLabel(job.status, to)}</ConfirmButton>
                : <button className={i === 0 ? 'adm-btn' : 'adm-btn adm-btn--ghost'}>{moveLabel(job.status, to)}</button>}
            </form>
          ))}
          {job.status === 'ready' && job.customerEmail && <EmailReadyButton jobId={job.id} email={job.customerEmail} />}
        </section>
      )}

      <div className="adm-two">
        <section className="card">
          <h2 className="adm-h2">Customer and vehicle</h2>
          <dl className="adm-dl" style={{ marginTop: 12 }}>
            <dt>Customer</dt><dd><Link href={`/admin/customers/${job.customerId}`}>{job.customerName}</Link></dd>
            {job.customerPhone && <><dt>Phone</dt><dd><a href={`tel:${job.customerPhone.replace(/[^\d+]/g, '')}`}>{job.customerPhone}</a></dd></>}
            <dt>Vehicle</dt><dd>{job.reg} {job.vehicleDesc && <span className="adm-muted">{job.vehicleDesc}</span>}</dd>
            {job.bookingService && <><dt>Booked for</dt><dd>{serviceById(job.bookingService)?.name ?? job.bookingService} <span className="adm-muted">{job.bookingRef}</span></dd></>}
            <dt>Opened</dt><dd>{when(job.createdAt)}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 className="adm-h2">Invoice</h2>
          {invoice && invoice.status !== 'void' ? (
            <p style={{ margin: '12px 0 0' }}>
              <Link href={`/admin/invoices/${invoice.id}`} className="adm-strong">{invoice.number ? `Invoice ${invoice.number}` : `Draft #${invoice.id}`}</Link>{' '}
              <span className={`adm-status adm-status--${invoice.status}`}>{invoice.status === 'issued' ? 'unpaid' : invoice.status}</span>{' '}
              <span className="adm-strong">{gbp(invoice.totalPence)}</span>
            </p>
          ) : <p className="adm-muted" style={{ margin: '12px 0 0' }}>No invoice yet. It starts with the booked service at its price and each other task as a line to price.</p>}
          {write && (!invoice || invoice.status === 'void') && (
            <form action={invoiceFromJobAction} className="no-print" style={{ marginTop: 12 }}>
              <input type="hidden" name="id" value={job.id} /><button className="adm-btn">Create invoice</button>
            </form>
          )}
        </section>
      </div>

      <section className="card">
        <h2 className="adm-h2">Work to do <span className="adm-muted adm-count">{job.tasksDone} of {job.tasksTotal} done</span></h2>
        <TaskList tasks={job.tasks} readOnly={!write} />
        {write && isOpen(job.status) && <div className="no-print"><AddTaskForm jobId={job.id} /></div>}
      </section>

      <section className="card">
        <h2 className="adm-h2">Details</h2>
        <JobDetailsForm job={job} mechanics={mechanics} readOnly={!write} />
      </section>

      <section className="card no-print">
        <h2 className="adm-h2">Photos <span className="adm-muted adm-count">{job.photoList.length}</span></h2>
        <p className="adm-muted" style={{ margin: '4px 0 0' }}>Damage on arrival, worn parts, anything worth showing the customer. On a phone, this opens the camera.</p>
        {job.photoList.length > 0 && (
          <ul className="adm-photos">
            {job.photoList.map(p => (
              <li key={p.id}>
                <a href={`/admin/jobs/photo/${p.id}`} target="_blank" rel="noopener"><img src={`/admin/jobs/photo/${p.id}`} alt={`Job photo, ${when(p.createdAt)}`} loading="lazy" /></a>
                {write && <form action={deletePhotoAction}><input type="hidden" name="photoId" value={p.id} />
                  <ConfirmButton className="adm-btn adm-btn--ghost adm-btn--sm" message="Delete this photo?">Delete</ConfirmButton></form>}
              </li>
            ))}
          </ul>
        )}
        {write && <PhotoUploader jobId={job.id} />}
      </section>

      <section className="card">
        <h2 className="adm-h2">Timeline</h2>
        <ol className="adm-timeline">
          {job.events.map((e, i) => (
            <li key={i}><span className="adm-muted adm-nowrap">{when(e.at)}</span> <strong>{statusLabel(e.status)}</strong>{e.note && <> · {e.note}</>}{e.staffName && <span className="adm-muted"> · {e.staffName}</span>}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
