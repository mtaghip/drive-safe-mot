// Staff sign-in. Each person has their own email and password; a signed cookie
// carries their id. Every request re-reads the staff row, so disabling someone
// or changing their password takes effect immediately.
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { db } from './db.ts';
import { DUMMY_HASH, hashPassword, passwordProblem, verifyPassword } from './passwords.ts';
import { can, type Cap, type Role } from './roles.ts';
import { appSecret } from './secrets.ts';

export type Staff = { id: number; email: string; name: string; role: Role; active: boolean; lastLoginAt: string | null; createdAt: string };

const COOKIE = 'ds_staff';
const SESSION_DAYS = 14;
const STAFF_COLS = `id, email, name, role, active, to_char(last_login_at AT TIME ZONE 'Europe/London', 'YYYY-MM-DD HH24:MI') AS "lastLoginAt",
  to_char(created_at, 'YYYY-MM-DD') AS "createdAt"`;

const sign = async (payload: string) => createHmac('sha256', await appSecret('session_key')).update(payload).digest('base64url');

async function readSession(value: string | undefined): Promise<{ id: number; version: number } | null> {
  const [id, version, exp, sig] = (value ?? '').split('.');
  if (!id || !version || !exp || !sig || Number(exp) < Date.now()) return null;
  const expected = Buffer.from(await sign(`${id}.${version}.${exp}`)), given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return { id: Number(id), version: Number(version) };
}

async function startSession(id: number, version: number) {
  const exp = Date.now() + SESSION_DAYS * 86_400_000;
  const value = `${id}.${version}.${exp}.${await sign(`${id}.${version}.${exp}`)}`;
  (await cookies()).set(COOKIE, value, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: SESSION_DAYS * 86_400,
  });
}

/** The signed-in staff member, or null. Cached for the rest of the request. */
export const currentStaff = cache(async (): Promise<Staff | null> => {
  const s = await readSession((await cookies()).get(COOKIE)?.value);
  if (!s) return null;
  const { rows } = await db.query<Staff>(
    `SELECT ${STAFF_COLS} FROM staff WHERE id = $1 AND session_version = $2 AND active`, [s.id, s.version]);
  return rows[0] ?? null;
});

/** For pages and actions: the signed-in staff member, sent to the sign-in page if there's none. */
export async function requireStaff(cap?: Cap): Promise<Staff> {
  const me = await currentStaff();
  if (!me) redirect('/admin/login');
  // Pages and buttons hide what a role can't do, so this only happens via an old link or a changed role.
  if (cap && !can(me.role, cap)) redirect('/admin?denied=1');
  return me;
}

export async function hasStaff() {
  const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM staff');
  return rows[0].n > 0;
}

/** Signs in and returns who it was, or null for a wrong email or password. */
export async function signIn(email: string, password: string): Promise<{ id: number; name: string } | null> {
  const { rows } = await db.query<{ id: number; name: string; password_hash: string; session_version: number }>(
    'SELECT id, name, password_hash, session_version FROM staff WHERE lower(email) = lower($1) AND active', [email.trim()]);
  const ok = await verifyPassword(password, rows[0]?.password_hash ?? DUMMY_HASH);
  if (!ok || !rows[0]) return null;
  await db.query('UPDATE staff SET last_login_at = now() WHERE id = $1', [rows[0].id]);
  await startSession(rows[0].id, rows[0].session_version);
  return { id: rows[0].id, name: rows[0].name };
}

export async function signOut() {
  (await cookies()).delete(COOKIE);
}

/** The setup code that lets the first owner account be created: the old shared staff password. */
export const setupCode = () => process.env.ADMIN_PASSWORD ?? '';

export function staffProblem(s: { name: string; email: string }) {
  if (!s.name.trim()) return 'Enter a name.';
  if (!/^\S+@\S+\.\S+$/.test(s.email.trim())) return 'Enter a valid email address.';
  return null;
}

/** Creates the first account as owner. Refused once any account exists. */
export async function createOwner(s: { name: string; email: string; password: string }) {
  const problem = staffProblem(s) ?? passwordProblem(s.password);
  if (problem) return problem;
  const hash = await hashPassword(s.password);
  const { rows } = await db.query<{ id: number; session_version: number }>(
    `INSERT INTO staff (name, email, role, password_hash)
     SELECT $1, $2, 'owner', $3 WHERE NOT EXISTS (SELECT 1 FROM staff) RETURNING id, session_version`,
    [s.name.trim(), s.email.trim(), hash]);
  if (!rows[0]) return 'An owner account already exists. Sign in instead.';
  await startSession(rows[0].id, rows[0].session_version);
  return null;
}

export async function listStaff() {
  return (await db.query<Staff>(`SELECT ${STAFF_COLS} FROM staff ORDER BY active DESC, role = 'owner' DESC, name`)).rows;
}

export async function addStaff(s: { name: string; email: string; role: Role; password: string }) {
  const problem = staffProblem(s) ?? passwordProblem(s.password);
  if (problem) return problem;
  try {
    await db.query('INSERT INTO staff (name, email, role, password_hash) VALUES ($1, $2, $3, $4)',
      [s.name.trim(), s.email.trim(), s.role, await hashPassword(s.password)]);
  } catch (err) {
    if ((err as { constraint?: string }).constraint === 'staff_email_unique') return 'Someone already uses that email.';
    throw err;
  }
  return null;
}

/** Changes role or active state, never leaving the team without an active owner. */
export async function updateStaff(id: number, change: { role: Role; active: boolean }) {
  return db.tx(async tx => {
    await tx.query('UPDATE staff SET role = $2, active = $3 WHERE id = $1', [id, change.role, change.active]);
    const { rows } = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM staff WHERE role = 'owner' AND active`);
    if (rows[0].n === 0) throw new Error('There must always be at least one active owner.');
  }).then(() => null, (err: Error) => err.message);
}

/** Sets a new password and signs that person out everywhere. */
export async function setPassword(id: number, password: string) {
  const problem = passwordProblem(password);
  if (problem) return problem;
  await db.query('UPDATE staff SET password_hash = $2, session_version = session_version + 1 WHERE id = $1', [id, await hashPassword(password)]);
  return null;
}

export async function changeOwnPassword(me: Staff, current: string, next: string) {
  const { rows } = await db.query<{ password_hash: string }>('SELECT password_hash FROM staff WHERE id = $1', [me.id]);
  if (!(await verifyPassword(current, rows[0].password_hash))) return 'Your current password isn’t right.';
  const problem = await setPassword(me.id, next);
  if (problem) return problem;
  // Stay signed in here; every other device is signed out.
  const v = await db.query<{ session_version: number }>('SELECT session_version FROM staff WHERE id = $1', [me.id]);
  await startSession(me.id, v.rows[0].session_version);
  return null;
}

export async function audit(me: { id: number; name: string } | null, action: string, entity = '', entityId: number | null = null, detail = '') {
  await db.query('INSERT INTO audit_log (staff_id, staff_name, action, entity, entity_id, detail) VALUES ($1, $2, $3, $4, $5, $6)',
    [me?.id ?? null, me?.name ?? 'System', action, entity, entityId, detail.slice(0, 500)]);
}
