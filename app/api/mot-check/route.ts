import { NextResponse } from 'next/server';
import { compactReg, formatReg } from '@/lib/customers.ts';
import { clientIp, hashIp } from '@/lib/security.ts';
import { store } from '@/lib/store.ts';
import { dvlaLookup, lookupConfigured } from '@/lib/vehicle-lookup.ts';

export const dynamic = 'force-dynamic';

/** Most lookups one network address can make per hour, so the free DVLA quota can't be drained. */
const MAX_PER_HOUR = 20;

/** The public MOT due date checker: make, colour and MOT expiry for a registration. */
export async function POST(req: Request) {
  if (!lookupConfigured()) return NextResponse.json({ error: 'unavailable' }, { status: 503 });
  let reg = '';
  try { reg = String((await req.json()).reg ?? ''); } catch { /* handled below */ }
  const compact = compactReg(reg);
  if (!/^[A-Z0-9]{2,8}$/.test(compact)) return NextResponse.json({ error: 'Enter a valid registration, for example AB12 CDE.' }, { status: 400 });
  try {
    if (await store().hit('motcheck:' + hashIp(clientIp(req.headers)), 3600) > MAX_PER_HOUR) {
      return NextResponse.json({ error: 'Too many checks. Please try again in an hour.' }, { status: 429 });
    }
  } catch (err) {
    console.error('[mot-check] rate limit unavailable', err);
  }
  const r = await dvlaLookup(compact);
  if (!r.ok) {
    const notFound = r.error.startsWith('DVLA has no vehicle');
    if (!notFound) console.error('[mot-check]', r.error);
    return NextResponse.json({ error: notFound ? 'We couldn’t find a vehicle with that registration. Check it and try again.' : 'The DVLA lookup isn’t answering right now. Please try again shortly.' }, { status: notFound ? 404 : 502 });
  }
  const f = r.facts;
  return NextResponse.json({ reg: formatReg(compact), make: f.make, colour: f.colour, year: f.year, motExpiry: f.motExpiry, motStatus: f.motStatus });
}
