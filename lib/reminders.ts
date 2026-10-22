// Customer MOT and service reminder emails, sent each morning by the daily scheduler.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { appSecret } from './secrets.ts';
import { db } from './db.ts';
import { send } from './email.ts';
import { REMINDER_RULES, type ReminderRule } from './reminder-rules.ts';
import { addDays, fmtLong } from './schedule.ts';
import { COMPANY, EMAIL, PHONE_DISPLAY, siteUrl } from './site.ts';

type Due = { vehicleId: number; reg: string; make: string; model: string; due: string; customerId: number; name: string; email: string };

async function dueFor(rule: ReminderRule, today: string): Promise<Due[]> {
  // rule.field is one of two fixed column names, never user input.
  const { rows } = await db.query<Due>(
    `SELECT v.id AS "vehicleId", v.reg, v.make, v.model, to_char(v.${rule.field}, 'YYYY-MM-DD') AS due,
       c.id AS "customerId", c.name, c.email
     FROM vehicles v JOIN customers c ON c.id = v.customer_id
     WHERE c.reminders_ok AND c.email <> '' AND v.${rule.field} BETWEEN $1::date AND $2::date
       AND NOT EXISTS (SELECT 1 FROM reminder_sends r WHERE r.vehicle_id = v.id AND r.kind = $3 AND r.due_date = v.${rule.field})`,
    [addDays(today, rule.to), addDays(today, rule.from), rule.kind]);
  return rows;
}

async function token(customerId: number) {
  return createHmac('sha256', await appSecret('reminder_key')).update(String(customerId)).digest('base64url').slice(0, 24);
}
export async function stopLink(customerId: number) {
  return `${siteUrl()}/reminders/stop?c=${customerId}&t=${await token(customerId)}`;
}
export async function tokenValid(customerId: number, t: string) {
  const expected = Buffer.from(await token(customerId)), given = Buffer.from(t);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function reminderEmail(d: Due, rule: ReminderRule, today: string, stop: string) {
  const car = [d.make, d.model].filter(Boolean).join(' ');
  const carText = car ? `${car} (${d.reg})` : d.reg;
  const first = d.name.trim().split(/\s+/)[0] || 'there';
  const when = fmtLong(d.due);
  const soon = d.due <= addDays(today, 7);
  const book = `${siteUrl()}/book?service=${rule.what === 'MOT' ? 'mot' : 'service'}`;
  const subject = rule.what === 'MOT'
    ? `${soon ? 'MOT reminder: ' : ''}Your MOT for ${d.reg} is due on ${when}`
    : `Your ${d.reg} is due a service on ${when}`;
  const intro = rule.what === 'MOT'
    ? `This is a reminder from ${COMPANY.tradingName} that the MOT for your ${carText} runs out on ${when}.`
    : `This is a reminder from ${COMPANY.tradingName} that your ${carText} is due a service on ${when}.`;
  const extra = rule.what === 'MOT'
    ? `You can have the MOT up to a month (less a day) before it runs out and keep the same renewal date. Our MOT is £45, fixed price.`
    : '';
  const text = [`Hi ${first},`, '', intro, '', `Book a one-hour slot online: ${book}`, `Or call us on ${PHONE_DISPLAY}.`,
    ...(extra ? ['', extra] : []), '', COMPANY.tradingName, '', `Don't want these reminders? ${stop}`].join('\n');
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#0e1a2c;max-width:560px;margin:0 auto;padding:24px 16px;">
  <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#a87a0c;">${esc(COMPANY.tradingName)}</div>
  <h1 style="font-size:22px;margin:8px 0 16px;">${rule.what === 'MOT' ? 'Your MOT is due' : 'Your service is due'} on ${esc(when)}</h1>
  <p style="font-size:16px;line-height:1.5;">Hi ${esc(first)},</p>
  <p style="font-size:16px;line-height:1.5;">${esc(intro)}</p>
  <p style="margin:22px 0;"><a href="${esc(book)}" style="background:#f4b324;color:#0f2340;font-weight:800;text-decoration:none;padding:13px 20px;border-radius:8px;display:inline-block;">Book online</a>
    &nbsp; or call <a href="tel:01582729943" style="color:#0f2340;font-weight:700;">${esc(PHONE_DISPLAY)}</a></p>
  ${extra ? `<p style="font-size:14px;line-height:1.5;color:#3a4558;">${esc(extra)}</p>` : ''}
  <p style="font-size:12px;color:#586377;margin-top:28px;">You're getting this because you've used ${esc(COMPANY.tradingName)}.
    <a href="${esc(stop)}" style="color:#586377;">Stop these reminders</a></p>
</div>`;
  return { subject, text, html };
}

export type SentReminder = { reg: string; name: string; email: string; kind: string; due: string };

/** Sends today's due reminders. Safe to run repeatedly: each goes once. */
export async function sendDueReminders(today: string): Promise<{ sent: SentReminder[]; failed: SentReminder[] }> {
  const sent: SentReminder[] = [], failed: SentReminder[] = [];
  for (const rule of REMINDER_RULES) {
    for (const d of await dueFor(rule, today)) {
      const claim = await db.query('INSERT INTO reminder_sends (vehicle_id, kind, due_date, sent_to) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING',
        [d.vehicleId, rule.kind, d.due, d.email]);
      if (claim.rowCount === 0) continue;
      const item = { reg: d.reg, name: d.name, email: d.email, kind: rule.kind, due: d.due };
      try {
        const stop = await stopLink(d.customerId);
        await send({ to: d.email, replyTo: EMAIL, ...reminderEmail(d, rule, today, stop), headers: { 'List-Unsubscribe': `<${stop}>` } });
        sent.push(item);
      } catch (err) {
        console.error('[reminders] failed', d.reg, err);
        await db.query('DELETE FROM reminder_sends WHERE vehicle_id = $1 AND kind = $2 AND due_date = $3', [d.vehicleId, rule.kind, d.due]);
        failed.push(item);
      }
    }
  }
  return { sent, failed };
}

export type UpcomingDue = {
  vehicleId: number; customerId: number; name: string; phone: string; email: string; remindersOk: boolean;
  reg: string; make: string; model: string; what: 'MOT' | 'service'; due: string; lastSent: string | null;
};

/** MOTs and services due from `from` to `to`, with when each was last reminded. */
export async function upcomingDue(from: string, to: string): Promise<UpcomingDue[]> {
  const { rows } = await db.query<UpcomingDue>(
    `SELECT * FROM (
       SELECT v.id AS "vehicleId", c.id AS "customerId", c.name, c.phone, c.email, c.reminders_ok AS "remindersOk",
         v.reg, v.make, v.model, 'MOT' AS what, to_char(v.mot_due, 'YYYY-MM-DD') AS due,
         (SELECT to_char(max(r.sent_at) AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') FROM reminder_sends r
           WHERE r.vehicle_id = v.id AND r.due_date = v.mot_due AND r.kind LIKE 'mot-%') AS "lastSent"
       FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.mot_due BETWEEN $1::date AND $2::date
       UNION ALL
       SELECT v.id, c.id, c.name, c.phone, c.email, c.reminders_ok, v.reg, v.make, v.model, 'service', to_char(v.service_due, 'YYYY-MM-DD'),
         (SELECT to_char(max(r.sent_at) AT TIME ZONE 'Europe/London', 'YYYY-MM-DD') FROM reminder_sends r
           WHERE r.vehicle_id = v.id AND r.due_date = v.service_due AND r.kind LIKE 'service-%')
       FROM vehicles v JOIN customers c ON c.id = v.customer_id WHERE v.service_due BETWEEN $1::date AND $2::date
     ) x ORDER BY due, reg`, [from, to]);
  return rows;
}

export async function recentSends(limit = 50) {
  const { rows } = await db.query<{ reg: string; name: string; customerId: number; kind: string; due: string; sentTo: string; sentAt: string }>(
    `SELECT v.reg, c.name, c.id AS "customerId", r.kind, to_char(r.due_date, 'YYYY-MM-DD') AS due, r.sent_to AS "sentTo",
       to_char(r.sent_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "sentAt"
     FROM reminder_sends r JOIN vehicles v ON v.id = r.vehicle_id JOIN customers c ON c.id = v.customer_id
     ORDER BY r.sent_at DESC LIMIT $1`, [limit]);
  return rows;
}
