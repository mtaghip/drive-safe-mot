import { NextResponse } from 'next/server';
import { bookingRange } from '@/lib/schedule.ts';
import { availability } from '@/lib/store.ts';

export const dynamic = 'force-dynamic';

/** Booked or blocked slots and staff-closed days across the bookable range. */
export async function GET() {
  const range = bookingRange();
  const a = await availability(range.start, range.end);
  return NextResponse.json({ ...range, ...a }, { headers: { 'Cache-Control': 'no-store' } });
}
