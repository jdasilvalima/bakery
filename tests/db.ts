// Test database: PGlite (Postgres compiled to WASM) with the minimum of
// Supabase that the migrations rely on, so tests run without Docker.
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const migrationsDir = join(root, 'supabase', 'migrations');

const SUPABASE_STUB = `
  create role anon nologin;
  create role authenticated nologin;
  create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  grant usage on schema auth to anon, authenticated;
`;

export async function createDb({ seed = true } = {}): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
  }
  if (seed) {
    await db.exec(readFileSync(join(root, 'supabase', 'seed.sql'), 'utf8'));
  }
  return db;
}

// Run `fn` in a transaction that is always rolled back, so tests can write
// without affecting each other.
export async function inRollback<T>(db: PGlite, fn: () => Promise<T>): Promise<T> {
  await db.exec('begin');
  try {
    return await fn();
  } finally {
    await db.exec('rollback');
  }
}

// For the rest of the current transaction, behave like a Supabase API request:
// role `authenticated` with JWT claims for `userId`, or `anon` when null.
export async function actAs(db: PGlite, userId: string | null): Promise<void> {
  const claims = JSON.stringify(userId ? { sub: userId, role: 'authenticated' } : { role: 'anon' });
  await db.query(`select set_config('request.jwt.claims', $1, true)`, [claims]);
  await db.exec(`set local role ${userId ? 'authenticated' : 'anon'}`);
}

// Create an auth user and link it to an existing staff member.
export async function linkStaff(db: PGlite, displayName: string): Promise<string> {
  const userId = crypto.randomUUID();
  await db.query(`insert into auth.users (id) values ($1)`, [userId]);
  const { affectedRows } = await db.query(`update staff set user_id = $1 where display_name = $2`, [
    userId,
    displayName,
  ]);
  if (affectedRows !== 1) throw new Error(`No staff member named ${displayName}`);
  return userId;
}

export async function idOf(db: PGlite, sql: string, params: unknown[] = []): Promise<string> {
  const { rows } = await db.query<{ id: string }>(sql, params);
  if (rows.length !== 1) throw new Error(`Expected one row for: ${sql} ${JSON.stringify(params)}`);
  return rows[0].id;
}

export async function lotId(db: PGlite, code: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>(`select id from lots where lot_code = $1`, [code]);
  if (rows.length !== 1) throw new Error(`Expected one lot ${code}, found ${rows.length}`);
  return rows[0].id;
}
