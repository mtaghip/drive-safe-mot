import { NextResponse } from 'next/server';
import { bookingRange } from '@/lib/schedule.ts';
import { takenSlots } from '@/lib/store.ts';

export const dynamic = 'force-dynamic';

/** Booked slots across the whole bookable range: { start, end, taken: { "2026-10-20": [9, 13] } }. */
export async function GET() {
  const range = bookingRange();
  const taken = await takenSlots(range.start, range.end);
  return NextResponse.json({ ...range, taken }, { headers: { 'Cache-Control': 'no-store' } });
}
