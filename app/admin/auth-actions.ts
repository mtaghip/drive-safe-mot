'use server';

import { createHash, timingSafeEqual } from 'node:crypto';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { audit, changeOwnPassword, createOwner, currentStaff, hasStaff, requireStaff, setupCode, signIn, signOut } from '@/lib/auth.ts';
import { clientIp, hashIp } from '@/lib/security.ts';
import { store } from '@/lib/store.ts';

export type AuthState = { error?: string; ok?: boolean } | undefined;
const text = (f: FormData, k: string) => String(f.get(k) ?? '');

async function tooManyAttempts(key: string) {
  const ip = hashIp(clientIp(await headers()));
  return (await store().hit(`login:${ip}`, 15 * 60)) > 10 || (await store().hit(`login:${key}`, 15 * 60)) > 10;
}

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  const email = text(form, 'email').trim().toLowerCase();
  if (await tooManyAttempts(email)) return { error: 'Too many attempts. Wait 15 minutes and try again.' };
  const who = await signIn(email, text(form, 'password'));
  if (!who) return { error: 'Wrong email or password.' };
  await audit(who, 'Signed in');
  redirect('/admin');
}

const same = (a: string, b: string) => timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export async function setupAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (await hasStaff()) redirect('/admin/login');
  const code = setupCode();
  if (!code) return { error: 'Set ADMIN_PASSWORD first.' };
  if (await tooManyAttempts('setup')) return { error: 'Too many attempts. Wait 15 minutes and try again.' };
  if (!same(text(form, 'code'), code)) return { error: 'The setup password isn’t right.' };
  const problem = await createOwner({ name: text(form, 'name'), email: text(form, 'email'), password: text(form, 'password') });
  if (problem) return { error: problem };
  redirect('/admin');
}

export async function signOutAction() {
  const me = await currentStaff();
  if (me) await audit(me, 'Signed out');
  await signOut();
  redirect('/admin/login');
}

export async function changePasswordAction(_: AuthState, form: FormData): Promise<AuthState> {
  const me = await requireStaff();
  if (text(form, 'next') !== text(form, 'confirm')) return { error: 'The new passwords don’t match.' };
  const problem = await changeOwnPassword(me, text(form, 'current'), text(form, 'next'));
  if (problem) return { error: problem };
  await audit(me, 'Changed own password');
  return { ok: true };
}
