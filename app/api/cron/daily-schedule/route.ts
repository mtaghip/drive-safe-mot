import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { buildDailyEmail, dailyEmailTo, loadDaySchedule } from '@/lib/daily-email.ts';
import { send } from '@/lib/email.ts';
import { todayIso, ukHour } from '@/lib/schedule.ts';
import { DAILY_EMAIL_HOUR } from '@/lib/site.ts';
import { store } from '@/lib/store.ts';

export const dynamic = 'force-dynamic';

function authorised(req: Request, secret: string) {
  const given = Buffer.from(req.headers.get('authorization') ?? ''), expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Emails today's schedule to the garage. Called by a scheduler at 8:30 UK time
 * (Vercel Cron, see vercel.json, or any cron service sending `Authorization: Bearer $CRON_SECRET`).
 * Calls outside 8:00–8:59 UK time are ignored, and each day is only ever sent once.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET is not set.' }, { status: 503 });
  if (!authorised(req, secret)) return NextResponse.json({ error: 'Unauthorised.' }, { status: 401 });

  if (ukHour() !== DAILY_EMAIL_HOUR) return NextResponse.json({ skipped: `Only sends between ${DAILY_EMAIL_HOUR}:00 and ${DAILY_EMAIL_HOUR}:59 UK time.` });
  const date = todayIso(), s = store();
  if (!(await s.claimDailyEmail(date))) return NextResponse.json({ skipped: `Already sent for ${date}.` });

  try {
    const mail = buildDailyEmail(await loadDaySchedule(s, date));
    await send({ to: dailyEmailTo(), ...mail });
    return NextResponse.json({ sent: date, to: dailyEmailTo() });
  } catch (err) {
    await s.releaseDailyEmail(date).catch(() => {});
    console.error('[daily-email] failed', err);
    return NextResponse.json({ error: 'Failed to send the daily schedule.' }, { status: 500 });
  }
}
