'use server';

import { redirect } from 'next/navigation';
import { audit } from '@/lib/auth.ts';
import { setReminders } from '@/lib/customers.ts';
import { tokenValid } from '@/lib/reminders.ts';

// A button rather than the link itself, so email security scanners that open links don't unsubscribe people.
export async function stopRemindersAction(form: FormData) {
  const id = Number(form.get('c')), t = String(form.get('t') ?? '');
  if (!Number.isInteger(id) || !(await tokenValid(id, t))) redirect('/reminders/stop');
  await setReminders(id, false);
  await audit(null, 'Customer opted out of reminders', 'customer', id);
  redirect(`/reminders/stop?c=${id}&t=${encodeURIComponent(t)}&done=1`);
}
