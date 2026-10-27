// Forwarding mail received at the garage's domain, against a fake Resend API.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

process.env.PGLITE_DIR = 'memory://';
process.env.RESEND_API_KEY = 're_test';
process.env.BOOKING_FROM_EMAIL = 'Drive Safe MOT Centre <bookings@drivesafemot.co.uk>';
const { buildForward, forwardReceived, parseAddress, verifyWebhook } = await import('./inbound-email.ts');

const secret = 'whsec_' + Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
const sign = (body: string, id: string, ts: string) =>
  'v1,' + createHmac('sha256', Buffer.from(secret.slice(6), 'base64')).update(`${id}.${ts}.${body}`).digest('base64');

test('accepts a correctly signed webhook and refuses anything else', () => {
  const now = 1_800_000_000_000, ts = String(now / 1000), body = '{"type":"email.received"}';
  const ok = { id: 'msg_1', timestamp: ts, signature: `v1,bm9wZQ== ${sign(body, 'msg_1', ts)}` };
  assert.equal(verifyWebhook(body, ok, secret, now), true);
  assert.equal(verifyWebhook(body + ' ', ok, secret, now), false, 'body changed');
  assert.equal(verifyWebhook(body, ok, secret, now + 10 * 60_000), false, 'too old');
  assert.equal(verifyWebhook(body, { ...ok, signature: null }, secret, now), false);
});

test('parses names and addresses', () => {
  assert.deepEqual(parseAddress('"Jane Smith" <jane@example.com>'), { name: 'Jane Smith', address: 'jane@example.com' });
  assert.deepEqual(parseAddress('jane@example.com'), { name: '', address: 'jane@example.com' });
});

test('forward replies to the sender and comes from our own address', () => {
  const m = buildForward({ id: 'e1', from: 'Jane Smith <jane@example.com>', to: ['bookings@drivesafemot.co.uk'], subject: 'MOT on Friday?', html: null, text: 'Can I come at 10?', reply_to: null, created_at: '' },
    { from: 'Drive Safe MOT Centre <bookings@drivesafemot.co.uk>', to: 'drivesafeltd@outlook.com' });
  assert.equal(m.from, 'Jane Smith via Drive Safe <bookings@drivesafemot.co.uk>');
  assert.equal(m.reply_to, 'Jane Smith <jane@example.com>');
  assert.deepEqual(m.to, ['drivesafeltd@outlook.com']);
  assert.equal(m.subject, 'MOT on Friday?');
  assert.match(m.text, /Can I come at 10\?/);
});

test('fetches, forwards with attachments, and only once', async () => {
  const sent: Record<string, unknown>[] = [];
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const u = String(url);
    if (u.endsWith('/emails') && init?.method === 'POST') { sent.push(JSON.parse(String(init.body))); return Response.json({ id: 'out_1' }); }
    if (u.endsWith('/attachments')) return Response.json({ data: [{ filename: 'photo.jpg', size: 3, content_type: 'image/jpeg', download_url: 'https://files/1' }] });
    if (u === 'https://files/1') return new Response(new Uint8Array([1, 2, 3]));
    return Response.json({ id: 'e1', from: 'jane@example.com', to: ['bookings@drivesafemot.co.uk'], subject: 'Photo of my car', html: '<p>Here</p>', text: 'Here', reply_to: null, created_at: '' });
  }) as typeof fetch;
  assert.equal(await forwardReceived('e1'), 'forwarded to drivesafeltd@outlook.com');
  assert.equal(sent.length, 1);
  assert.deepEqual((sent[0].attachments as { filename: string; content: string }[]).map(a => [a.filename, a.content]), [['photo.jpg', 'AQID']]);
  assert.equal(await forwardReceived('e1'), 'skipped: already forwarded');
  assert.equal(sent.length, 1);
});
