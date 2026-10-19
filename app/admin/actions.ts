'use server';

import { cookies, headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { adminPassword, requireAdmin } from '@/lib/admin.ts';
import { buildDailyEmail, dailyEmailTo, loadDaySchedule } from '@/lib/daily-email.ts';
import { send, sendBookingEmails } from '@/lib/email.ts';
import { isIsoDate, isOpenDay, isSlotHour, todayIso } from '@/lib/schedule.ts';
import { ADMIN_COOKIE, ADMIN_SESSION_DAYS, clientIp, hashIp, makeSession, passwordMatches } from '@/lib/security.ts';
import { createBooking, SlotTakenError, store } from '@/lib/store.ts';
import { validatePhoneBooking, type FieldErrors } from '@/lib/validation.ts';

export type FormState = { error?: string; errors?: FieldErrors; ok?: boolean } | undefined;

const text = (f: FormData, k: string) => String(f.get(k) ?? '').trim();
const int = (f: FormData, k: string) => (f.get(k) === null || f.get(k) === '' ? NaN : Number(f.get(k)));
const done = () => { revalidatePath('/admin'); return { ok: true }; };

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const pw = adminPassword();
  if (!pw) return { error: 'Staff sign-in is not set up yet.' };
  const ip = hashIp(clientIp(await headers()));
  if (await store().hit('login:' + ip, 15 * 60) > 10) return { error: 'Too many attempts. Wait 15 minutes and try again.' };
  if (!passwordMatches(text(form, 'password'), pw)) return { error: 'Wrong password.' };
  (await cookies()).set(ADMIN_COOKIE, makeSession(pw), {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: ADMIN_SESSION_DAYS * 86_400,
  });
  redirect('/admin');
}

export async function logout() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect('/admin/login');
}

export async function addPhoneBooking(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const r = validatePhoneBooking({
    service: text(form, 'service'), date: text(form, 'date'), hour: int(form, 'hour'),
    name: text(form, 'name'), phone: text(form, 'phone'), email: text(form, 'email'), reg: text(form, 'reg'),
  });
  if (!r.ok) return { errors: r.errors };
  try {
    const booking = await createBooking({ ...r.value, source: 'phone' });
    await sendBookingEmails(booking, { notifyGarage: false });
  } catch (err) {
    if (err instanceof SlotTakenError) return { error: 'That slot has just been taken or blocked.' };
    throw err;
  }
  return done();
}

export async function moveBooking(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const id = int(form, 'id'), date = text(form, 'date'), hour = int(form, 'hour');
  if (!isIsoDate(date) || !isSlotHour(hour)) return { error: 'Choose a day and time.' };
  if (date < todayIso() || !isOpenDay(date)) return { error: 'That day is closed or in the past.' };
  try {
    await store().move(id, date, hour);
  } catch (err) {
    if (err instanceof SlotTakenError) return { error: 'That slot is already booked or blocked.' };
    throw err;
  }
  return done();
}

export async function cancelBooking(form: FormData) {
  await requireAdmin();
  await store().cancel(int(form, 'id'));
  revalidatePath('/admin');
}

/** Blocks one slot (hour set) or closes the whole day (hour empty). */
export async function addBlock(form: FormData) {
  await requireAdmin();
  const date = text(form, 'date'), hour = int(form, 'hour');
  if (!isIsoDate(date)) return;
  await store().addBlock(date, isSlotHour(hour) ? hour : null, text(form, 'note').slice(0, 200));
  revalidatePath('/admin');
}

export async function removeBlock(form: FormData) {
  await requireAdmin();
  await store().removeBlock(int(form, 'id'));
  revalidatePath('/admin');
}

/** Sends a day's schedule email now, e.g. to check it or after making changes. */
export async function emailDaySchedule(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
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
  await requireAdmin();
  const b = await store().findByRef(text(form, 'ref'));
  if (!b) return { error: 'No booking with that reference.' };
  redirect(`/admin?date=${b.date}#b${b.id}`);
}
