// Random secrets created on first use and kept in the database: the keys that
// sign staff sessions and reminder opt-out links. Nothing to configure.
import { randomBytes } from 'node:crypto';
import { db } from './db.ts';

export async function appSecret(name: string): Promise<Buffer> {
  await db.query('INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT DO NOTHING', [name, randomBytes(32).toString('base64')]);
  const { rows } = await db.query<{ value: string }>('SELECT value FROM app_settings WHERE key = $1', [name]);
  return Buffer.from(rows[0].value, 'base64');
}
