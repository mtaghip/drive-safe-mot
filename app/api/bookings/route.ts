import { NextResponse } from 'next/server';
import { sendBookingEmails } from '@/lib/email.ts';
import { createBooking, SlotTakenError } from '@/lib/store.ts';
import { validateBooking } from '@/lib/validation.ts';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }
  // Honeypot: real visitors never see or fill this field.
  if (typeof body.website === 'string' && body.website) return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });

  const result = validateBooking(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  try {
    const booking = await createBooking(result.value);
    await sendBookingEmails(booking);
    return NextResponse.json({ ref: booking.ref }, { status: 201 });
  } catch (err) {
    if (err instanceof SlotTakenError) {
      return NextResponse.json({ errors: { when: 'Sorry, that slot has just been booked. Please choose another time.' } }, { status: 409 });
    }
    console.error('[bookings] failed to create booking', err);
    return NextResponse.json({ error: 'We couldn’t save your booking. Please try again or give us a call.' }, { status: 500 });
  }
}
