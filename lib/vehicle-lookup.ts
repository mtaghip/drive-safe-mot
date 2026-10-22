// DVLA Vehicle Enquiry Service: make, colour, year and MOT expiry from a number plate.
// Needs DVLA_VES_API_KEY (free from DVLA: https://register-for-ves.driver-vehicle-licensing.api.gov.uk/).
import { compactReg } from './customers.ts';

export type VehicleFacts = { make: string; colour: string; year: number | null; motExpiry: string | null; motStatus: string; taxStatus: string };

export const lookupConfigured = () => Boolean(process.env.DVLA_VES_API_KEY?.trim());

export async function dvlaLookup(reg: string): Promise<{ ok: true; facts: VehicleFacts } | { ok: false; error: string }> {
  const key = process.env.DVLA_VES_API_KEY?.trim().replace(/^["']|["']$/g, '');
  if (!key) return { ok: false, error: 'Number plate lookup isn’t set up (DVLA_VES_API_KEY).' };
  let res: Response;
  try {
    res = await fetch('https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ registrationNumber: compactReg(reg) }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch {
    return { ok: false, error: 'DVLA didn’t answer. Try again in a moment.' };
  }
  if (res.status === 404) return { ok: false, error: 'DVLA has no vehicle with that registration.' };
  if (res.status === 403) return { ok: false, error: 'DVLA refused the API key. Check DVLA_VES_API_KEY.' };
  if (!res.ok) return { ok: false, error: `DVLA lookup failed (${res.status}).` };
  const v = await res.json() as Record<string, unknown>;
  const title = (s: unknown) => String(s ?? '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  return {
    ok: true,
    facts: {
      make: title(v.make), colour: title(v.colour),
      year: typeof v.yearOfManufacture === 'number' ? v.yearOfManufacture : null,
      motExpiry: typeof v.motExpiryDate === 'string' ? v.motExpiryDate : null,
      motStatus: String(v.motStatus ?? ''), taxStatus: String(v.taxStatus ?? ''),
    },
  };
}
