// Request helpers for spam protection and the staff login.
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

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

// ---- Staff sessions: a signed, expiring cookie. Changing ADMIN_PASSWORD signs everyone out. ----

export const ADMIN_COOKIE = 'ds_admin';
export const ADMIN_SESSION_DAYS = 14;

const sha = (s: string) => createHash('sha256').update(s).digest();
const sign = (payload: string, password: string) => createHmac('sha256', sha('ds-admin:' + password)).update(payload).digest('base64url');

export function passwordMatches(attempt: string, password: string): boolean {
  return timingSafeEqual(sha(attempt), sha(password));
}

export function makeSession(password: string, now = Date.now()): string {
  const exp = String(now + ADMIN_SESSION_DAYS * 86_400_000);
  return exp + '.' + sign(exp, password);
}

export function sessionValid(value: string | undefined, password: string, now = Date.now()): boolean {
  if (!value) return false;
  const [exp, sig] = value.split('.');
  if (!exp || !sig || Number(exp) < now) return false;
  const expected = Buffer.from(sign(exp, password)), given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}
