'use server';

import { revalidatePath } from 'next/cache';
import { audit, requireStaff } from '@/lib/auth.ts';
import { syncDueVehicles } from '@/lib/mot-sync.ts';

export type CheckState = { ok?: string; error?: string } | undefined;

/** Looks up MOT dates with DVLA now, for up to 50 cars. */
export async function checkMotDatesAction(): Promise<CheckState> {
  const me = await requireStaff('write');
  const r = await syncDueVehicles(50);
  if (!r.configured) return { error: 'DVLA lookup isn’t set up yet (DVLA_VES_API_KEY).' };
  const c = r.counts, done = Object.values(c).reduce((a, b) => a + b, 0);
  if (done > 0 && c.failed === done) return { error: 'DVLA didn’t answer or refused the key. Check DVLA_VES_API_KEY and try again later.' };
  await audit(me, 'Checked MOT dates with DVLA', 'vehicle', null, `${done} checked, ${c.updated} updated`);
  revalidatePath('/admin/reminders');
  const parts = [`${done} checked`, `${c.updated} updated`, c['no MOT'] && `${c['no MOT']} with no MOT date yet`, c['not found'] && `${c['not found']} not found`,
    c.failed && `${c.failed} couldn’t be checked`].filter(Boolean);
  return { ok: parts.join(', ') + '.' + (r.remaining ? ` ${r.remaining} more to check: press again, or they’re done over the next mornings.` : '') };
}
