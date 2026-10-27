// Mail sent to the garage's own domain (e.g. bookings@drivesafemot.co.uk) arrives at
// Resend, which calls /api/inbound-email. We fetch the message and send it on to
// the garage inbox, with Reply-To set to the sender so replying from Outlook
// goes straight back to them.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db.ts';
import { garageEmail } from './email.ts';

const API = 'https://api.resend.com';
/** Resend accepts up to 40MB per email; leave room for the encoding. */
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
/** Signed requests older (or newer) than this are refused, so a captured one can't be replayed. */
const TOLERANCE_S = 5 * 60;

/**
 * Checks a Standard Webhooks / Svix signature, as Resend sends them.
 * `secret` is the webhook's signing secret ("whsec_…").
 */
export function verifyWebhook(body: string, h: { id: string | null; timestamp: string | null; signature: string | null }, secret: string, now = Date.now()) {
  if (!h.id || !h.timestamp || !h.signature) return false;
  const ts = Number(h.timestamp);
  if (!Number.isFinite(ts) || Math.abs(now / 1000 - ts) > TOLERANCE_S) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = createHmac('sha256', key).update(`${h.id}.${h.timestamp}.${body}`).digest();
  return h.signature.split(' ').some(part => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig, 'base64');
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}

/** "Jane Smith <jane@example.com>" → { name: 'Jane Smith', address: 'jane@example.com' }. */
export function parseAddress(s: string) {
  const m = s.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  return m ? { name: m[1].trim(), address: m[2].trim() } : { name: '', address: s.trim() };
}

type Received = {
  id: string; from: string; to: string[]; subject: string; html: string | null; text: string | null;
  reply_to: string[] | null; created_at: string;
};
type Attachment = { filename?: string; size: number; content_type: string; content_id?: string; download_url: string };

async function api<T>(path: string, key: string): Promise<T> {
  const res = await fetch(API + path, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Resend ${path} responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** The email we send to the garage, built from the received one. */
export function buildForward(e: Received, o: { from: string; to: string }) {
  const sender = parseAddress(e.from);
  const replyTo = e.reply_to?.[0] || e.from;
  const fromAddress = parseAddress(o.from).address;
  const label = sender.name || sender.address;
  const note = `Sent to ${e.to.join(', ')} by ${e.from}. Reply to this email to answer them.`;
  return {
    // Our own verified address, so the email is delivered, showing who it's from.
    from: `${label.replace(/["<>]/g, '')} via Drive Safe <${fromAddress}>`,
    to: [o.to],
    reply_to: replyTo,
    subject: e.subject || '(no subject)',
    text: `${note}\n\n${e.text ?? (e.html ? e.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '')}`,
    html: `<p style="font-family:Arial,sans-serif;font-size:12px;color:#586377;margin:0 0 12px;padding:8px 10px;background:#f2f4f7;border-radius:6px;">${esc(note)}</p>`
      + (e.html ?? `<pre style="font-family:inherit;white-space:pre-wrap;">${esc(e.text ?? '')}</pre>`),
  };
}

/** Forwards one received email. Returns what happened, for the log. Each email is forwarded once. */
export async function forwardReceived(emailId: string): Promise<string> {
  const key = process.env.RESEND_API_KEY, from = process.env.BOOKING_FROM_EMAIL;
  if (!key || !from) return 'skipped: RESEND_API_KEY or BOOKING_FROM_EMAIL not set';
  const to = process.env.INBOUND_FORWARD_TO || garageEmail();

  // Resend retries a webhook that didn't get a 2xx; this makes the retry harmless.
  const claim = await db.query('INSERT INTO inbound_forwards (email_id) VALUES ($1) ON CONFLICT DO NOTHING', [emailId]);
  if (claim.rowCount === 0) return 'skipped: already forwarded';
  try {
    const e = await api<Received>(`/emails/receiving/${encodeURIComponent(emailId)}`, key);
    // Never forward our own mail back to ourselves.
    const sender = parseAddress(e.from).address.toLowerCase();
    if (sender === parseAddress(from).address.toLowerCase() || sender === to.toLowerCase()) return 'skipped: from our own address';

    const mail: Record<string, unknown> = buildForward(e, { from, to });
    const list = await api<{ data: Attachment[] }>(`/emails/receiving/${encodeURIComponent(emailId)}/attachments`, key).catch(() => ({ data: [] }));
    const total = list.data.reduce((s, a) => s + (a.size || 0), 0);
    if (list.data.length && total <= MAX_ATTACHMENT_BYTES) {
      mail.attachments = await Promise.all(list.data.map(async a => {
        const res = await fetch(a.download_url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) throw new Error(`attachment download responded ${res.status}`);
        return { filename: a.filename || 'attachment', content: Buffer.from(await res.arrayBuffer()).toString('base64'), content_type: a.content_type, content_id: a.content_id };
      }));
    } else if (list.data.length) {
      mail.text = `[${list.data.length} attachment(s), ${(total / 1048576).toFixed(1)}MB, too large to forward: open the email in Resend → Receiving.]\n\n${mail.text}`;
    }

    const res = await fetch(`${API}/emails`, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify(mail),
    });
    if (!res.ok) throw new Error(`Resend send responded ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return `forwarded to ${to}`;
  } catch (err) {
    // Let Resend's retry try again.
    await db.query('DELETE FROM inbound_forwards WHERE email_id = $1', [emailId]).catch(() => {});
    throw err;
  }
}
