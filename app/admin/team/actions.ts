'use server';

import { revalidatePath } from 'next/cache';
import { addStaff, audit, requireStaff, setPassword, updateStaff } from '@/lib/auth.ts';
import { isRole, roleLabel } from '@/lib/roles.ts';

export type TeamState = { error?: string; ok?: string } | undefined;
const text = (f: FormData, k: string) => String(f.get(k) ?? '');

export async function addStaffAction(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireStaff('manageStaff');
  const role = text(form, 'role');
  if (!isRole(role)) return { error: 'Choose a role.' };
  const s = { name: text(form, 'name'), email: text(form, 'email'), role, password: text(form, 'password') };
  const problem = await addStaff(s);
  if (problem) return { error: problem };
  await audit(me, 'Added staff member', 'staff', null, `${s.name} (${s.email}) as ${roleLabel(role)}`);
  revalidatePath('/admin/team');
  return { ok: `${s.name.trim()} can now sign in with ${s.email.trim()} and the password you chose. Ask them to change it from their account page.` };
}

export async function updateStaffAction(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireStaff('manageStaff');
  const id = Number(text(form, 'id')), role = text(form, 'role'), active = text(form, 'active') === 'on';
  if (!isRole(role)) return { error: 'Choose a role.' };
  const problem = await updateStaff(id, { role, active });
  if (problem) return { error: problem };
  await audit(me, 'Changed staff member', 'staff', id, `${roleLabel(role)}, ${active ? 'active' : 'disabled'}`);
  revalidatePath('/admin/team');
  return { ok: 'Saved.' };
}

export async function resetPasswordAction(_: TeamState, form: FormData): Promise<TeamState> {
  const me = await requireStaff('manageStaff');
  const id = Number(text(form, 'id'));
  const problem = await setPassword(id, text(form, 'password'));
  if (problem) return { error: problem };
  await audit(me, 'Reset staff password', 'staff', id);
  return { ok: 'Password reset. They’ve been signed out everywhere.' };
}
