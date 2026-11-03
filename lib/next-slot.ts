// "Next free slot" for the public pages. Never throws: a database problem shows "Call us to check".
import { addDays, bookingRange, closedReason, fmtHour, fmtShort, freeHours, nextFreeSlot, weekday } from './schedule.ts';
import { availability } from './store.ts';

export async function nextSlotLabel() {
  try {
    const range = bookingRange();
    const slot = nextFreeSlot(range, await availability(range.start, range.end));
    return slot ? `${fmtShort(slot.date)}, ${fmtHour(slot.hour)}` : 'Call us to check';
  } catch (err) {
    console.error('[next-slot] could not load availability', err);
    return 'Call us to check';
  }
}

export type SaturdaySlots = { date: string; hours: number[]; closed: boolean };

/** Every Saturday that can be booked online, with its free hours. Null if availability can't be loaded. */
export async function saturdaySlots(): Promise<SaturdaySlots[] | null> {
  try {
    const range = bookingRange();
    const a = await availability(range.start, range.end);
    const out: SaturdaySlots[] = [];
    for (let d = range.start; d <= range.end; d = addDays(d, 1)) {
      if (weekday(d) !== 6) continue;
      const closed = closedReason(d, a.closed) !== null;
      out.push({ date: d, closed, hours: closed ? [] : freeHours(d, a.taken) });
    }
    return out;
  } catch (err) {
    console.error('[next-slot] could not load Saturday availability', err);
    return null;
  }
}
