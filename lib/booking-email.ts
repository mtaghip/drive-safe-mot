// The booking confirmation sent to the customer, and the notice sent to the garage.
// Built here (no sending) so the wording and layout can be tested.
import { formatReg } from './customers.ts';
import { fmtHour, fmtLong, pad } from './schedule.ts';
import { ADDRESS_LINES, ADDRESS_ONE_LINE, COMPANY, OPEN_DAYS_TEXT, DIRECTIONS_HREF, EMAIL, PHONE_DISPLAY, PHONE_HREF, serviceById, siteUrl } from './site.ts';
import type { Booking } from './store.ts';

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** "mohammad ali" → "Mohammad". */
export const firstName = (name: string) => {
  const f = name.trim().split(/\s+/)[0] ?? '';
  return f ? f[0].toUpperCase() + f.slice(1).toLowerCase() : 'there';
};

/** What the price line says for each service. */
const PRICE_NOTE: Record<string, string> = {
  mot: '£45, fixed price',
  dpf: 'From £150, confirmed before we start',
  repair: 'Quoted after inspection, before any work',
  tyres: 'Priced by tyre size, confirmed before fitting',
  service: 'Priced by vehicle, confirmed before we start',
  tuning: 'Priced by vehicle, confirmed before we start',
};

/** Local London time as iCalendar/Google Calendar wants it: 20261029T100000. */
const stamp = (iso: string, hour: number) => `${iso.replace(/-/g, '')}T${pad(hour)}0000`;

export function calendarLinks(b: Booking) {
  const service = serviceById(b.service)!;
  const title = `${service.name} at ${COMPANY.tradingName}`;
  const details = `Booking reference ${b.ref}. Vehicle ${formatReg(b.reg)}. To change or cancel, call ${PHONE_DISPLAY}.`;
  const google = 'https://calendar.google.com/calendar/render?' + new URLSearchParams({
    action: 'TEMPLATE', text: title, dates: `${stamp(b.date, b.hour)}/${stamp(b.date, b.hour + 1)}`,
    ctz: 'Europe/London', location: ADDRESS_ONE_LINE, details,
  }).toString();
  // Escapes for iCalendar text values.
  const ical = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Drive Safe MOT Centre//Bookings//EN', 'METHOD:PUBLISH', 'BEGIN:VEVENT',
    `UID:${b.ref}@drivesafemot`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/London:${stamp(b.date, b.hour)}`, `DTEND;TZID=Europe/London:${stamp(b.date, b.hour + 1)}`,
    `SUMMARY:${ical(title)}`, `LOCATION:${ical(ADDRESS_ONE_LINE)}`, `DESCRIPTION:${ical(details)}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${ical(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return { google, ics };
}

export function customerConfirmation(b: Booking) {
  const service = serviceById(b.service)!;
  const first = firstName(b.name);
  const reg = formatReg(b.reg);
  const day = fmtLong(b.date);
  const time = `${fmtHour(b.hour)} – ${fmtHour(b.hour + 1)}`;
  const price = PRICE_NOTE[b.service] ?? service.summaryPrice;
  const { google } = calendarLinks(b);
  const isMot = b.service === 'mot';

  const before = [
    'Please arrive a few minutes before your slot so we can get started on time.',
    isMot
      ? 'The MOT takes around an hour. You’re welcome to wait, or drop the car off and we’ll call you when it’s done.'
      : 'You’re welcome to wait, or drop the car off and we’ll call you when it’s ready.',
    isMot
      ? 'You don’t need to bring any documents. We’ll explain the result and any advisories in plain English.'
      : 'We’ll always agree the price with you before doing any work.',
    'Payment is on the day, by card or cash.',
  ];

  const subject = `Booking confirmed: ${service.name}, ${day} at ${fmtHour(b.hour)} (${b.ref})`;

  const text = [
    `Hi ${first},`,
    '',
    `Your booking at ${COMPANY.tradingName} is confirmed. Here are the details:`,
    '',
    `  Reference:  ${b.ref}`,
    `  Service:    ${service.name}`,
    `  Price:      ${price}`,
    `  Date:       ${day}`,
    `  Time:       ${time}`,
    `  Vehicle:    ${reg}`,
    `  Address:    ${ADDRESS_ONE_LINE}`,
    '',
    `Directions: ${DIRECTIONS_HREF}`,
    `Add to Google Calendar: ${google}`,
    '',
    'BEFORE YOU ARRIVE',
    ...before.map(l => `- ${l}`),
    '',
    'NEED TO CHANGE OR CANCEL?',
    `Call us on ${PHONE_DISPLAY} or reply to this email, quoting ${b.ref}. We’re open ${OPEN_DAYS_TEXT}.`,
    '',
    'We look forward to seeing you.',
    '',
    'Kind regards,',
    `The team at ${COMPANY.tradingName}`,
    `${PHONE_DISPLAY} · ${EMAIL}`,
    siteUrl(),
    '',
    '--',
    `${COMPANY.tradingName} is a trading name of ${COMPANY.legalName}, registered in England and Wales, company no. ${COMPANY.companyNumber}.`,
    `Registered office: ${COMPANY.registeredOffice}.`,
  ].join('\n');

  const row = (label: string, value: string) =>
    `<tr><td style="padding:10px 0;border-bottom:1px solid #e6e9ef;color:#586377;font-size:14px;width:110px;vertical-align:top;">${label}</td>`
    + `<td style="padding:10px 0;border-bottom:1px solid #e6e9ef;color:#0e1a2c;font-size:15px;font-weight:700;">${value}</td></tr>`;
  const plate = `<span style="display:inline-block;background:#f7d117;border:1px solid #111;border-radius:4px;padding:2px 8px;font-family:Arial,Helvetica,sans-serif;font-weight:800;letter-spacing:.06em;color:#111;">${esc(reg)}</span>`;
  const button = (href: string, label: string, primary: boolean) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 18px;border-radius:8px;font-weight:800;font-size:14px;text-decoration:none;`
    + (primary ? 'background:#f4b324;color:#0f2340;' : 'background:#ffffff;color:#0f2340;border:1px solid #c9cfda;') + `">${label}</a>`;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f2f4f7;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(`${service.name} on ${day}, ${time}. Reference ${b.ref}.`)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f4f7;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;font-family:Arial,Helvetica,sans-serif;color:#0e1a2c;">
  <tr><td style="background:#0f2340;padding:22px 28px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:#f4b324;">${esc(COMPANY.tradingName)}</div>
    <div style="font-size:13px;color:#c5cede;margin-top:4px;">${esc(ADDRESS_ONE_LINE)} · ${esc(PHONE_DISPLAY)}</div>
  </td></tr>
  <tr><td style="padding:28px 28px 8px;">
    <div style="display:inline-block;background:#e7f4ea;color:#1d6b33;font-size:13px;font-weight:700;padding:5px 10px;border-radius:999px;">&#10003; Booking confirmed</div>
    <h1 style="font-size:24px;line-height:1.25;margin:14px 0 8px;">See you on ${esc(day)} at ${esc(fmtHour(b.hour))}</h1>
    <p style="font-size:16px;line-height:1.55;margin:0 0 18px;">Hi ${esc(first)}, thank you for booking with us. Your slot is reserved and there’s nothing else you need to do.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #e6e9ef;">
      ${row('Reference', esc(b.ref))}
      ${row('Service', esc(service.name))}
      ${row('Price', `<span style="font-weight:400;">${esc(price)}</span>`)}
      ${row('Date', esc(day))}
      ${row('Time', esc(time))}
      ${row('Vehicle', plate)}
      ${row('Address', ADDRESS_LINES.map(esc).join('<br>'))}
    </table>
    <p style="margin:22px 0 10px;">${button(DIRECTIONS_HREF, 'Get directions', true)}${button(google, 'Add to calendar', false)}</p>
  </td></tr>
  <tr><td style="padding:8px 28px 4px;">
    <h2 style="font-size:16px;margin:10px 0 8px;">Before you arrive</h2>
    <ul style="margin:0;padding-left:20px;font-size:15px;line-height:1.55;color:#3a4558;">
      ${before.map(l => `<li style="margin-bottom:6px;">${esc(l)}</li>`).join('\n      ')}
    </ul>
  </td></tr>
  <tr><td style="padding:12px 28px 26px;">
    <div style="background:#f6f7f9;border-radius:10px;padding:16px 18px;">
      <div style="font-size:15px;font-weight:700;margin-bottom:4px;">Need to change or cancel?</div>
      <div style="font-size:14px;line-height:1.55;color:#3a4558;">Call us on <a href="${PHONE_HREF}" style="color:#0f2340;font-weight:700;">${esc(PHONE_DISPLAY)}</a>
        or simply reply to this email, quoting <strong>${esc(b.ref)}</strong>. We’re open ${OPEN_DAYS_TEXT}.</div>
    </div>
    <p style="font-size:15px;line-height:1.55;margin:22px 0 0;">Kind regards,<br><strong>The team at ${esc(COMPANY.tradingName)}</strong></p>
  </td></tr>
  <tr><td style="background:#f6f7f9;padding:18px 28px;font-size:12px;line-height:1.6;color:#586377;">
    <a href="${PHONE_HREF}" style="color:#586377;">${esc(PHONE_DISPLAY)}</a> · <a href="mailto:${EMAIL}" style="color:#586377;">${esc(EMAIL)}</a> · <a href="${esc(siteUrl())}" style="color:#586377;">${esc(siteUrl().replace(/^https?:\/\//, ''))}</a><br>
    ${esc(COMPANY.tradingName)} is a trading name of ${esc(COMPANY.legalName)}, registered in England and Wales, company no. ${esc(COMPANY.companyNumber)}.
    Registered office: ${esc(COMPANY.registeredOffice)}.<br>
    You’re receiving this email because a booking was made using this address.
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

  return { subject, text, html };
}

/** The notice the garage gets for each booking: made online, or by staff (`addedBy`) for a phone booking. */
export function garageNotice(b: Booking, addedBy?: string) {
  const kind = addedBy ? 'New phone booking' : 'New online booking';
  const service = serviceById(b.service)!;
  const reg = formatReg(b.reg);
  const day = fmtLong(b.date);
  const time = `${fmtHour(b.hour)} – ${fmtHour(b.hour + 1)}`;
  const admin = `${siteUrl()}/admin?date=${b.date}`;
  const subject = `${kind}: ${reg}, ${service.name}, ${day} ${fmtHour(b.hour)} (${b.ref})`;
  const fields: [string, string][] = [
    ['Reference', b.ref], ['Service', service.name], ['Date', day], ['Time', time], ['Vehicle', reg],
    ['Customer', b.name], ['Phone', b.phone], ['Email', b.email || '—'],
  ];
  const text = [addedBy ? `${kind}, added by ${addedBy}.` : `${kind}.`, '', ...fields.map(([k, v]) => `${(k + ':').padEnd(11)} ${v}`), '', `Open the diary: ${admin}`,
    '', 'Reply to this email to write to the customer.'].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0e1a2c;max-width:560px;margin:0 auto;padding:20px 16px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a87a0c;">${kind}${addedBy ? ` · added by ${esc(addedBy)}` : ''}</div>
  <h1 style="font-size:20px;margin:6px 0 14px;">${esc(service.name)} · ${esc(day)} at ${esc(fmtHour(b.hour))}</h1>
  <table cellpadding="0" cellspacing="0" style="width:100%;border-top:1px solid #e6e9ef;font-size:14px;">
    ${fields.map(([k, v]) => `<tr><td style="padding:8px 0;border-bottom:1px solid #e6e9ef;color:#586377;width:100px;">${k}</td><td style="padding:8px 0;border-bottom:1px solid #e6e9ef;font-weight:700;">${
      k === 'Phone' ? `<a href="tel:${esc(v.replace(/[^\d+]/g, ''))}" style="color:#0f2340;">${esc(v)}</a>` : esc(v)}</td></tr>`).join('\n    ')}
  </table>
  <p style="margin:18px 0;"><a href="${esc(admin)}" style="background:#0f2340;color:#fff;font-weight:700;text-decoration:none;padding:11px 18px;border-radius:8px;display:inline-block;">Open the diary</a></p>
  <p style="font-size:12px;color:#586377;">Reply to this email to write to the customer.</p>
</div>`;
  return { subject, text, html };
}
