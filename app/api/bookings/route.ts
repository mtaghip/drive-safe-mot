import { NextResponse } from 'next/server';
import { sendBookingEmails } from '@/lib/email.ts';
import { todayIso } from '@/lib/schedule.ts';
import { clientIp, hashIp, verifyTurnstile } from '@/lib/security.ts';
import { BOOKING, PHONE_DISPLAY } from '@/lib/site.ts';
import { createBooking, SlotTakenError, store } from '@/lib/store.ts';
import { phoneDigits, validateBooking } from '@/lib/validation.ts';

export const dynamic = 'force-dynamic';

const fail = (status: number, error: string) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return fail(400, 'Invalid request.');
  }
  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === 'string' && body.website) return fail(400, 'Invalid request.');

  const result = validateBooking(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });
  const b = result.value;

  try {
    const ip = clientIp(req.headers), ipHash = hashIp(ip);
    if (await store().hit('book:' + ipHash, 3600) > BOOKING.maxAttemptsPerHour) {
      return fail(429, `Too many booking attempts. Please try again later or call us on ${PHONE_DISPLAY}.`);
    }
    if (!(await verifyTurnstile(body.turnstileToken, ip))) {
      return NextResponse.json({ error: 'Please complete the security check and try again.', turnstile: true }, { status: 400 });
    }
    if (await store().upcomingCount(phoneDigits(b.phone), b.email, todayIso()) >= BOOKING.maxUpcomingPerCustomer) {
      return fail(429, `You already have ${BOOKING.maxUpcomingPerCustomer} upcoming bookings with us. Please call ${PHONE_DISPLAY} to book more.`);
    }

    const booking = await createBooking({ ...b, source: 'online' });
    await sendBookingEmails(booking, { notifyGarage: true });
    return NextResponse.json({ ref: booking.ref }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json({ errors: { when: 'Sorry, that slot is no longer available. Please choose another time.' } }, { status: 409 });
    }
    console.error('[bookings] failed to create booking', err);
    return fail(500, 'We couldn’t save your booking. Please try again or give us a call.');
  }
}
