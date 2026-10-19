// Booking emails via the Resend HTTP API. Without RESEND_API_KEY they are logged instead.
import { ADDRESS_ONE_LINE, EMAIL, PHONE_DISPLAY, serviceById } from './site.ts';
import { fmtHour, fmtLong } from './schedule.ts';
import type { Booking } from './store.ts';

type Mail = { to: string; subject: string; text: string; replyTo?: string };

async function send(mail: Mail) {
  const key = process.env.RESEND_API_KEY, from = process.env.BOOKING_FROM_EMAIL;
  if (!key || !from) {
    console.info('[email] RESEND_API_KEY or BOOKING_FROM_EMAIL not set; would send:\n' + JSON.stringify(mail, null, 2));
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [mail.to], subject: mail.subject, text: mail.text, reply_to: mail.replyTo }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}

/** Customer confirmation (when there's an email address) and, for online bookings, a notice to the garage. */
export async function sendBookingEmails(b: Booking, { notifyGarage }: { notifyGarage: boolean }) {
  const service = serviceById(b.service)!;
  const when = `${fmtLong(b.date)}, ${fmtHour(b.hour)} – ${fmtHour(b.hour + 1)}`;
  const details = [
    `Reference: ${b.ref}`, `Service: ${service.name} (${service.summaryPrice})`, `When: ${when}`,
    `Vehicle: ${b.reg}`, `Where: ${ADDRESS_ONE_LINE}`,
  ].join('\n');

  const customer = !b.email ? Promise.resolve() : send({
    to: b.email,
    subject: `You're booked in: ${service.name}, ${fmtLong(b.date)} at ${fmtHour(b.hour)}`,
    text: `Hi ${b.name.split(' ')[0]},\n\nThanks for booking with Drive Safe MOT Centre.\n\n${details}\n\n` +
      `Pay on the day. Need to change your slot? Call us on ${PHONE_DISPLAY} or reply to this email.\n\nDrive Safe MOT Centre`,
    // Customer replies go to the garage's inbox, whatever address the email is sent from.
    replyTo: EMAIL,
  });
  const garage = notifyGarage ? send({
    to: process.env.GARAGE_EMAIL || EMAIL,
    replyTo: b.email,
    subject: `New booking ${b.ref}: ${service.name}, ${fmtLong(b.date)} ${fmtHour(b.hour)}, ${b.reg}`,
    text: `${details}\n\nName: ${b.name}\nPhone: ${b.phone}\nEmail: ${b.email}`,
  }) : Promise.resolve();

  // The booking is already saved, so a failed email is logged rather than shown to the customer.
  for (const r of await Promise.allSettled([customer, garage])) {
    if (r.status === 'rejected') console.error('[email] failed to send booking email', b.ref, r.reason);
  }
}
