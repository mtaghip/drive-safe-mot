'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireStaff } from '@/lib/auth.ts';
import { garageEmail, send } from '@/lib/email.ts';
import { gbp } from '@/lib/invoice-calc.ts';
import { getInvoice } from '@/lib/invoices.ts';
import { isJobStatus, statusLabel } from '@/lib/job-status.ts';
import {
  addTask, deletePhoto, getJob, invoiceForJob, jobFromBooking, logJobNote, newJob, removeTask, setJobStatus, setTaskDone, taskJob, updateJob,
} from '@/lib/jobs.ts';
import { ADDRESS_ONE_LINE, COMPANY, EMAIL, OPEN_DAYS_TEXT, PHONE_DISPLAY } from '@/lib/site.ts';

export type JobState = { error?: string; ok?: string } | undefined;
const num = (f: FormData, k: string) => Number(f.get(k));
const text = (f: FormData, k: string, max = 2000) => String(f.get(k) ?? '').trim().slice(0, max);
const page = (id: number) => `/admin/jobs/${id}`;
const refresh = (id: number) => { revalidatePath(page(id)); revalidatePath('/admin/workshop'); };

export async function openJobFromBookingAction(form: FormData) {
  const me = await requireStaff('write');
  const id = await jobFromBooking(num(form, 'bookingId'), me);
  redirect(page(id));
}

export async function newJobAction(_: JobState, form: FormData): Promise<JobState> {
  const me = await requireStaff('write');
  const requested = text(form, 'requested', 500);
  if (!requested) return { error: 'Say what the customer wants done.' };
  const id = await newJob({ customerId: num(form, 'customerId'), vehicleId: form.get('vehicleId') ? num(form, 'vehicleId') : null, requested }, me);
  await audit(me, 'Opened job card', 'job', id, requested);
  redirect(page(id));
}

export async function saveJobAction(_: JobState, form: FormData): Promise<JobState> {
  await requireStaff('write');
  const id = num(form, 'id');
  const mileage = text(form, 'mileageIn').replace(/[,\s]/g, '');
  const mileageIn = mileage === '' ? null : Number(mileage);
  if (mileageIn != null && !(Number.isInteger(mileageIn) && mileageIn >= 0 && mileageIn < 2_000_000)) return { error: 'Mileage must be a whole number.' };
  const mechanic = text(form, 'mechanicId');
  await updateJob(id, { requested: text(form, 'requested', 1000), mileageIn, mechanicId: mechanic ? Number(mechanic) : null, notes: text(form, 'notes', 4000) });
  refresh(id);
  return { ok: 'Saved.' };
}

export async function setStatusAction(form: FormData) {
  const me = await requireStaff('write');
  const id = num(form, 'id'), to = String(form.get('to'));
  if (!isJobStatus(to)) return;
  const problem = await setJobStatus(id, to, me, text(form, 'note', 300));
  if (problem) throw new Error(problem);
  const job = await getJob(id);
  await audit(me, `Job ${statusLabel(to).toLowerCase()}`, 'job', id, job?.reg ?? '');
  refresh(id);
}

export async function addTaskAction(_: JobState, form: FormData): Promise<JobState> {
  await requireStaff('write');
  const id = num(form, 'id'), d = text(form, 'description', 300);
  if (!d) return { error: 'Describe the work.' };
  await addTask(id, d);
  refresh(id);
  return { ok: 'Added.' };
}

export async function toggleTaskAction(taskId: number, done: boolean) {
  await requireStaff('write');
  const jobId = await taskJob(taskId);
  if (!jobId) return;
  await setTaskDone(taskId, done);
  refresh(jobId);
}

export async function removeTaskAction(form: FormData) {
  await requireStaff('write');
  const taskId = num(form, 'taskId'), jobId = await taskJob(taskId);
  if (!jobId) return;
  await removeTask(taskId);
  refresh(jobId);
}

export async function deletePhotoAction(form: FormData) {
  const me = await requireStaff('write');
  const jobId = await deletePhoto(num(form, 'photoId'));
  if (jobId) { await audit(me, 'Deleted job photo', 'job', jobId); refresh(jobId); }
}

export async function invoiceFromJobAction(form: FormData) {
  const me = await requireStaff('write');
  const jobId = num(form, 'id');
  const invoiceId = await invoiceForJob(jobId, me);
  await audit(me, 'Started invoice from job', 'job', jobId);
  redirect(`/admin/invoices/${invoiceId}`);
}

/** "Your car is ready" email, with the invoice total if there is one. */
export async function emailReadyAction(_: JobState, form: FormData): Promise<JobState> {
  const me = await requireStaff('write');
  const job = await getJob(num(form, 'id'));
  if (!job) return { error: 'Job not found.' };
  if (!job.customerEmail) return { error: 'This customer has no email address. Give them a call.' };
  const inv = job.invoiceId ? await getInvoice(job.invoiceId) : null;
  const owed = inv && inv.status === 'issued' ? ` The bill comes to ${gbp(inv.totalPence)}, payable on collection.` : '';
  const car = [job.vehicleDesc, job.reg && `(${job.reg})`].filter(Boolean).join(' ') || 'car';
  const first = job.customerName.trim().split(/\s+/)[0];
  const text_ = `Hi ${first},\n\nYour ${car} is ready to collect from ${COMPANY.tradingName}, ${ADDRESS_ONE_LINE}.${owed}\n\n` +
    `We're open ${OPEN_DAYS_TEXT}. Any questions, call us on ${PHONE_DISPLAY}.\n\n${COMPANY.tradingName}`;
  try {
    await send({ to: job.customerEmail, bcc: garageEmail(), replyTo: EMAIL, subject: `Your ${job.reg || 'car'} is ready to collect`, text: text_ });
  } catch (err) {
    console.error('[jobs] ready email failed', err);
    return { error: 'Couldn’t send the email. Check the email settings.' };
  }
  await logJobNote(job.id, me, `Emailed ${job.customerEmail}: ready to collect`);
  refresh(job.id);
  return { ok: `Emailed ${job.customerEmail}.` };
}
