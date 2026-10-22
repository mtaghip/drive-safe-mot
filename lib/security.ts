// Request helpers for spam protection and the staff login.
import { createHash } from 'node:crypto';

/** First address in X-Forwarded-For (set by the host's proxy), else X-Real-IP. */
export function clientIp(headers: Headers): string {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || 'unknown';
}

/** Addresses are only ever stored hashed. */
export const hashIp = (ip: string) => createHash('sha256').update('drive-safe:' + ip).digest('hex').slice(0, 24);

export const turnstileEnabled = () => !!process.env.TURNSTILE_SECRET_KEY;

/** Cloudflare Turnstile check. Passes automatically when Turnstile isn't configured. */
export async function verifyTurnstile(token: unknown, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (typeof token !== 'string' || !token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification request failed', err);
    return false;
  }
}
