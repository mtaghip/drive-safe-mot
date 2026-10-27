// Booking emails via the Resend HTTP API. Without RESEND_API_KEY they are logged instead.
import { calendarLinks, customerConfirmation, garageNotice } from './booking-email.ts';
import { EMAIL } from './site.ts';
import type { Booking } from './store.ts';

type Attachment = { filename: string; content: string; contentType?: string };
type Mail = {
  to: string; bcc?: string; subject: string; text: string; html?: string; replyTo?: string; headers?: Record<string, string>;
  /** Content is base64. */
  attachments?: Attachment[];
};

export async function send(mail: Mail) {
  const key = process.env.RESEND_API_KEY, from = process.env.BOOKING_FROM_EMAIL;
  if (!key || !from) {
    const { html, attachments, ...rest } = mail;
    console.info('[email] RESEND_API_KEY or BOOKING_FROM_EMAIL not set; would send:\n' + JSON.stringify({
      ...rest, html: html && `(${html.length} characters)`, attachments: attachments?.map(a => a.filename),
    }, null, 2));
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: [mail.to], bcc: mail.bcc && mail.bcc !== mail.to ? [mail.bcc] : undefined, subject: mail.subject, text: mail.text, html: mail.html, reply_to: mail.replyTo, headers: mail.headers,
      attachments: mail.attachments?.map(a => ({ filename: a.filename, content: a.content, content_type: a.contentType })) }),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${await res.text()}`);
}

/** The garage's inbox: booking notices, the daily diary, and copies of what customers are sent. */
export const garageEmail = () => process.env.GARAGE_EMAIL || EMAIL;

/** Customer confirmation (when there's an email address) and a notice to the garage for every booking. */
export async function sendBookingEmails(b: Booking, { addedBy }: { addedBy?: string } = {}) {
  const customer = !b.email ? Promise.resolve() : send({
    to: b.email,
    ...customerConfirmation(b),
    // Customer replies go to the garage's inbox, whatever address the email is sent from.
    replyTo: EMAIL,
    // Opens as a calendar event in Outlook, Apple Mail and most phones.
    attachments: [{ filename: `booking-${b.ref}.ics`, content: Buffer.from(calendarLinks(b).ics).toString('base64'), contentType: 'text/calendar' }],
  });
  const garage = send({ to: garageEmail(), replyTo: b.email || undefined, ...garageNotice(b, addedBy) });

  // The booking is already saved, so a failed email is logged rather than shown to the customer.
  for (const r of await Promise.allSettled([customer, garage])) {
    if (r.status === 'rejected') console.error('[email] failed to send booking email', b.ref, r.reason);
  }
}
