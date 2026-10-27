import { NextResponse } from 'next/server';
import { forwardReceived, verifyWebhook } from '@/lib/inbound-email.ts';

export const dynamic = 'force-dynamic';

/**
 * Resend's `email.received` webhook: forwards mail sent to the garage's domain
 * to the garage inbox. Requests must be signed with RESEND_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'RESEND_WEBHOOK_SECRET is not set.' }, { status: 503 });
  const body = await req.text();
  const h = (name: string) => req.headers.get(`svix-${name}`) ?? req.headers.get(`webhook-${name}`);
  if (!verifyWebhook(body, { id: h('id'), timestamp: h('timestamp'), signature: h('signature') }, secret)) {
    return NextResponse.json({ error: 'Bad signature.' }, { status: 401 });
  }
  let event: { type?: string; data?: { email_id?: string } };
  try { event = JSON.parse(body); } catch { return NextResponse.json({ error: 'Bad JSON.' }, { status: 400 }); }
  if (event.type !== 'email.received' || !event.data?.email_id) return NextResponse.json({ ignored: event.type ?? 'unknown' });
  try {
    const result = await forwardReceived(event.data.email_id);
    console.info('[inbound-email]', event.data.email_id, result);
    return NextResponse.json({ result });
  } catch (err) {
    console.error('[inbound-email] forward failed', event.data.email_id, err);
    // A 500 makes Resend retry later.
    return NextResponse.json({ error: 'Forward failed.' }, { status: 500 });
  }
}
