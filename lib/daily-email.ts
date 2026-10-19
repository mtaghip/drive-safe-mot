// The garage's morning email: today's timetable plus a glance at the week ahead.
import { addDays, closureLabel, fmtHour, fmtLong, fmtShort } from './schedule.ts';
import { BOOKING, EMAIL, serviceById, siteUrl } from './site.ts';
import type { Block, StoredBooking } from './store.ts';

export type DaySchedule = {
  date: string;
  /** Why the day is closed (weekend, bank holiday or a staff note), or null when open. */
  closed: string | null;
  bookings: StoredBooking[];
  /** Single blocked slots on the day. */
  blocks: Block[];
  week: { date: string; booked: number; closed: string | null }[];
};

type Store = {
  dayBookings(date: string): Promise<StoredBooking[]>;
  blocks(from: string, to: string): Promise<Block[]>;
  countsByDay(from: string, to: string): Promise<Record<string, number>>;
};

const staffClosure = (b: Block) => 'Closed by staff' + (b.note ? `: ${b.note}` : '');

export async function loadDaySchedule(s: Store, date: string): Promise<DaySchedule> {
  const from = addDays(date, 1), to = addDays(date, 7);
  const [bookings, dayBlocks, counts, weekBlocks] = await Promise.all([
    s.dayBookings(date), s.blocks(date, date), s.countsByDay(from, to), s.blocks(from, to),
  ]);
  const dayClosed = dayBlocks.find(b => b.hour == null);
  const week = Array.from({ length: 7 }, (_, i) => addDays(from, i)).map(d => {
    const staff = weekBlocks.find(b => b.date === d && b.hour == null);
    return { date: d, booked: counts[d] ?? 0, closed: closureLabel(d) ?? (staff ? staffClosure(staff) : null) };
  });
  return {
    date, bookings, week,
    closed: closureLabel(date) ?? (dayClosed ? staffClosure(dayClosed) : null),
    blocks: dayBlocks.filter(b => b.hour != null),
  };
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const serviceName = (id: string) => serviceById(id)?.name ?? id;

export function buildDailyEmail(d: DaySchedule): { subject: string; text: string; html: string } {
  const total = BOOKING.hours.length, booked = d.bookings.length;
  const adminUrl = `${siteUrl()}/admin?date=${d.date}`;
  const subject = d.closed
    ? `Closed today (${d.closed.split(':')[0]}) · ${fmtShort(d.date)}${booked ? ` · ${booked} booking${booked > 1 ? 's' : ''} still on the diary` : ''}`
    : `Today's bookings · ${fmtShort(d.date)} · ${booked} of ${total} slots booked`;

  // One row per hour, plus any booking outside opening hours (e.g. made before the hours changed).
  const hours = [...new Set([...BOOKING.hours, ...d.bookings.map(b => b.hour)])].sort((a, b) => a - b);
  const rows = hours.map(h => {
    const b = d.bookings.find(x => x.hour === h), block = d.blocks.find(x => x.hour === h);
    return { h, b, block };
  });

  // ---- Plain text ----
  const lines = [`${fmtLong(d.date)}`, ''];
  if (d.closed) lines.push(`CLOSED: ${d.closed}`, '');
  if (booked && d.closed) lines.push('These bookings are still on the diary. Call the customers to move or cancel:', '');
  for (const { h, b, block } of rows) {
    if (d.closed && !b) continue;
    const t = `${fmtHour(h)}–${fmtHour(h + 1)}`;
    if (b) lines.push(`${t}  ${serviceName(b.service)} · ${b.reg} · ${b.name} · ${b.phone}${b.source === 'phone' ? ' · phone booking' : ''} · ${b.ref}`);
    else if (block) lines.push(`${t}  Blocked${block.note ? `: ${block.note}` : ''}`);
    else lines.push(`${t}  Free`);
  }
  lines.push('', 'Next 7 days:');
  for (const w of d.week) lines.push(`  ${fmtShort(w.date)}: ${w.closed ? `closed (${w.closed})` : `${w.booked} of ${total} booked`}`);
  lines.push('', `Open the staff page: ${adminUrl}`);
  const text = lines.join('\n');

  // ---- HTML (inline styles, table layout: what email apps handle reliably) ----
  const cell = 'padding:10px 12px;border-bottom:1px solid #e6e1d6;vertical-align:top;font-size:15px;';
  const slotRows = rows.filter(r => !d.closed || r.b).map(({ h, b, block }) => {
    const time = `<td style="${cell}white-space:nowrap;font-weight:800;color:#0f2340;">${fmtHour(h)}</td>`;
    if (b) {
      return `<tr>${time}<td style="${cell}"><strong>${esc(serviceName(b.service))}</strong> &nbsp;<span style="background:#f7d117;border:1px solid #111;border-radius:3px;padding:1px 6px;font-weight:800;letter-spacing:.04em;">${esc(b.reg)}</span>`
        + `<br><span style="color:#3a4558;">${esc(b.name)} · <a href="tel:${esc(b.phone.replace(/[^\d+]/g, ''))}" style="color:#0f2340;">${esc(b.phone)}</a>`
        + `${b.source === 'phone' ? ' · phone booking' : ''} · ${esc(b.ref)}</span></td></tr>`;
    }
    const label = block ? `Blocked${block.note ? `: ${esc(block.note)}` : ''}` : 'Free';
    return `<tr>${time}<td style="${cell}color:#a3a8b3;">${label}</td></tr>`;
  }).join('');
  const weekRows = d.week.map(w => `<tr><td style="padding:6px 12px 6px 0;font-size:14px;">${fmtShort(w.date)}</td>`
    + `<td style="padding:6px 0;font-size:14px;color:${w.closed ? '#a3a8b3' : '#0e1a2c'};">${w.closed ? `Closed (${esc(w.closed)})` : `${w.booked} of ${total} booked`}</td></tr>`).join('');

  const html = `<!doctype html><html><body style="margin:0;background:#f6f4ee;font-family:Arial,Helvetica,sans-serif;color:#0e1a2c;">
<div style="max-width:640px;margin:0 auto;padding:20px 12px;">
  <div style="background:#0f2340;color:#fff;border-radius:12px 12px 0 0;padding:20px 22px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#f4b324;">Drive Safe MOT Centre · Daily diary</div>
    <div style="font-size:24px;font-weight:800;margin-top:6px;">${fmtLong(d.date)}</div>
    <div style="font-size:15px;color:#c9d2e2;margin-top:4px;">${d.closed ? `Closed: ${esc(d.closed)}` : `${booked} of ${total} slots booked`}</div>
  </div>
  <div style="background:#fff;border-radius:0 0 12px 12px;padding:6px 10px 18px;">
    ${d.closed && booked ? `<p style="margin:12px;padding:10px 12px;background:#fbe3de;color:#b4321f;border-radius:8px;font-weight:700;">These bookings are still on the diary. Call the customers to move or cancel.</p>` : ''}
    ${d.closed && !booked ? '<p style="margin:14px 12px;color:#586377;">No bookings today.</p>' : `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">${slotRows}</table>`}
    <div style="margin:22px 12px 0;font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#586377;">Next 7 days</div>
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 12px 0;border-collapse:collapse;">${weekRows}</table>
    <p style="margin:22px 12px 0;"><a href="${esc(adminUrl)}" style="display:inline-block;background:#f4b324;color:#0f2340;font-weight:800;text-decoration:none;padding:12px 18px;border-radius:8px;">Open the staff page</a></p>
  </div>
  <p style="font-size:12px;color:#586377;text-align:center;margin:14px 0 0;">Sent automatically every morning at 8:30.</p>
</div></body></html>`;

  return { subject, text, html };
}

export const dailyEmailTo = () => process.env.GARAGE_EMAIL || EMAIL;
