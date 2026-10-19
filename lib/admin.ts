// Staff sign-in, shared by the staff pages and their server actions.
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, sessionValid } from './security.ts';

export const MIN_PASSWORD_LENGTH = 10;

/** The staff password, or null when it's missing or too short to be safe. */
export function adminPassword(): string | null {
  const pw = process.env.ADMIN_PASSWORD ?? '';
  return pw.length >= MIN_PASSWORD_LENGTH ? pw : null;
}

export async function isAdmin(): Promise<boolean> {
  const pw = adminPassword();
  return !!pw && sessionValid((await cookies()).get(ADMIN_COOKIE)?.value, pw);
}

export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}
