// "Next free slot" for the public pages. Never throws: a database problem shows "Call us to check".
import { bookingRange, fmtHour, fmtShort, nextFreeSlot } from './schedule.ts';
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
