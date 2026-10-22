'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { audit, requireStaff } from '@/lib/auth.ts';
import { buildDailyEmail, dailyEmailTo, loadDaySchedule } from '@/lib/daily-email.ts';
import { send, sendBookingEmails } from '@/lib/email.ts';
import { isIsoDate, isOpenDay, isSlotHour, todayIso } from '@/lib/schedule.ts';
import { fmtHour, fmtShort } from '@/lib/schedule.ts';
import { cancelJobForBooking } from '@/lib/jobs.ts';
import { createBooking, SlotTakenError, store } from '@/lib/store.ts';
import { validatePhoneBooking, type FieldErrors } from '@/lib/validation.ts';

export type FormState = { error?: string; errors?: FieldErrors; ok?: boolean } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const int = (f: FormData, k: string) => (f.get(k) === null || f.get(k) === '' ? NaN : Number(f.get(k)));
const done = () => { revalidatePath('/admin'); return { ok: true }; };

export async function addPhoneBooking(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff('write');
  const r = validatePhoneBooking({
    service: text(form, 'service'), date: text(form, 'date'), hour: int(form, 'hour'),
    name: text(form, 'name'), phone: text(form, 'phone'), email: text(form, 'email'), reg: text(form, 'reg'),
  });
  if (!r.ok) return { errors: r.errors };
  try {
    const booking = await createBooking({ ...r.value, source: 'phone' });
    await audit(me, 'Added phone booking', 'booking', null, `${booking.ref} · ${booking.reg} · ${fmtShort(booking.date)} ${fmtHour(booking.hour)}`);
    await sendBookingEmails(booking, { notifyGarage: false });
  } catch (err) {
    if (err instanceof SlotTakenError) return { error: 'That slot has just been taken or blocked.' };
    throw err;
  }
  return done();
}

export async function moveBooking(_: FormState, form: FormData): Promise<FormState> {
  const me = await requireStaff('write');
  const id = int(form, 'id'), date = text(form, 'date'), hour = int(form, 'hour');
  if (!isIsoDate(date) || !isSlotHour(hour)) return { error: 'Choose a day and time.' };
  if (date < todayIso() || !isOpenDay(date)) return { error: 'That day is closed or in the past.' };
  try {
    await store().move(id, date, hour);
    await audit(me, 'Moved booking', 'booking', id, `to ${fmtShort(date)} ${fmtHour(hour)}`);
  } catch (err) {
    if (err instanceof SlotTakenError) return { error: 'That slot is already booked or blocked.' };
    throw err;
  }
  return done();
}

export async function cancelBooking(form: FormData) {
  const me = await requireStaff('write');
  const b = await store().byId(int(form, 'id'));
  await store().cancel(int(form, 'id'));
  await cancelJobForBooking(int(form, 'id'), me);
  if (b) await audit(me, 'Cancelled booking', 'booking', b.id, `${b.ref} · ${b.reg} · ${fmtShort(b.date)} ${fmtHour(b.hour)}`);
  revalidatePath('/admin');
}

/** Blocks one slot (hour set) or closes the whole day (hour empty). */
export async function addBlock(form: FormData) {
  const me = await requireStaff('write');
  const date = text(form, 'date'), hour = int(form, 'hour');
  if (!isIsoDate(date)) return;
  await store().addBlock(date, isSlotHour(hour) ? hour : null, text(form, 'note').slice(0, 200));
  await audit(me, isSlotHour(hour) ? 'Blocked slot' : 'Closed day', 'diary', null, `${fmtShort(date)}${isSlotHour(hour) ? ' ' + fmtHour(hour) : ''}`);
  revalidatePath('/admin');
}

export async function removeBlock(form: FormData) {
  const me = await requireStaff('write');
  await store().removeBlock(int(form, 'id'));
  await audit(me, 'Reopened slot or day', 'diary', int(form, 'id'));
  revalidatePath('/admin');
}

/** Sends a day's schedule email now, e.g. to check it or after making changes. */
export async function emailDaySchedule(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const date = text(form, 'date');
  if (!isIsoDate(date)) return { error: 'Choose a day.' };
  try {
    await send({ to: dailyEmailTo(), ...buildDailyEmail(await loadDaySchedule(store(), date)) });
  } catch (err) {
    console.error('[daily-email] manual send failed', err);
    return { error: 'Couldn’t send the email. Check the email settings.' };
  }
  return { ok: true };
}

export async function findRef(_: FormState, form: FormData): Promise<FormState> {
  await requireStaff();
  const b = await store().findByRef(text(form, 'ref'));
  if (!b) return { error: 'No booking with that reference.' };
  redirect(`/admin?date=${b.date}#b${b.id}`);
}
