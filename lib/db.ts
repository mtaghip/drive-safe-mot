// Database access. Postgres when DATABASE_URL is set (required in production).
// Otherwise PGlite, an embedded Postgres, so development and tests need no
// server: it keeps its data in .data/pglite (or in memory for tests).
import { Pool, type PoolClient } from 'pg';
import { SCHEMA } from './schema.ts';

export type Row = Record<string, unknown>;
export type Result<T> = { rows: T[]; rowCount: number };
export interface Db {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<Result<T>>;
}
interface Engine extends Db {
  exec(sql: string): Promise<void>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

function pgEngine(url: string): Engine {
  const pool = new Pool({ connectionString: url, max: 5 });
  const wrap = (c: Pool | PoolClient): Db => ({
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const r = await c.query(sql, params);
      return { rows: r.rows as T[], rowCount: r.rowCount ?? 0 };
    },
  });
  return {
    ...wrap(pool),
    async exec(sql) { await pool.query(sql); },
    async tx(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const out = await fn(wrap(client));
        await client.query('COMMIT');
        return out;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function pgliteEngine(dataDir: string): Promise<Engine> {
  const { PGlite } = await import('@electric-sql/pglite');
  if (!dataDir.includes('://')) (await import('node:fs')).mkdirSync(dataDir, { recursive: true });
  const lite = new PGlite(dataDir);
  type Q = { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[]; affectedRows?: number }> };
  const wrap = (c: Q): Db => ({
    async query<T extends Row>(sql: string, params: unknown[] = []) {
      const r = await c.query(sql, params);
      return { rows: r.rows as T[], rowCount: r.affectedRows ?? r.rows.length };
    },
  });
  return {
    ...wrap(lite),
    async exec(sql) { await lite.exec(sql); },
    tx: fn => lite.transaction(t => fn(wrap(t))),
  };
}

const g = globalThis as unknown as { __db?: Promise<Engine> };

async function open(): Promise<Engine> {
  const url = process.env.DATABASE_URL;
  let engine: Engine;
  if (url) engine = pgEngine(url);
  else if (process.env.NODE_ENV === 'production') {
    throw new Error('DATABASE_URL is not set. The site needs a Postgres database in production.');
  } else {
    // Tests pass PGLITE_DIR=memory:// for a throwaway database.
    const dir = process.env.PGLITE_DIR ?? '.data/pglite';
    console.warn(`[db] DATABASE_URL not set, using embedded PGlite (${dir}).`);
    engine = await pgliteEngine(dir);
  }
  await engine.exec(SCHEMA);
  return engine;
}

function engine(): Promise<Engine> {
  // Retry on the next request if the database was unreachable.
  return (g.__db ??= open().catch(err => { g.__db = undefined; throw err; }));
}

export const db: Db & { tx<T>(fn: (db: Db) => Promise<T>): Promise<T> } = {
  query: async (sql, params) => (await engine()).query(sql, params),
  tx: async fn => (await engine()).tx(fn),
};

/** Postgres error helpers. */
export const constraintOf = (err: unknown) => (err as { constraint?: string })?.constraint;
