import fs from "node:fs";
import { createClient, type Client, type InStatement, type InValue, type Row } from "@libsql/client";

/*
 * libSQL (SQLite-compatible):
 *   - local dev:  DATABASE_URL unset → file:data/chameleon.db
 *   - production: DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN (Turso free tier)
 * Same SQL in both places. All queries live in src/server/repo.ts.
 *
 * Migrations are tracked in _migrations and applied atomically (one batch per version).
 * Every statement is idempotent-safe or guarded, so concurrent serverless cold starts are fine.
 */

const MIGRATIONS: string[][] = [
  /* v1 — initial schema */ [
    `CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
      name          TEXT NOT NULL,
      business      TEXT NOT NULL,
      industry      TEXT NOT NULL DEFAULT 'service',
      locale        TEXT NOT NULL DEFAULT 'en',
      password_hash TEXT NOT NULL,
      public_key    TEXT NOT NULL UNIQUE,
      created_at    INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id         TEXT PRIMARY KEY,
      user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      user_agent TEXT,
      ip         TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
    `CREATE TABLE IF NOT EXISTS leads (
      id         TEXT PRIMARY KEY,
      user_id    TEXT REFERENCES users(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      email      TEXT NOT NULL,
      budget_usd INTEGER NOT NULL,
      message    TEXT NOT NULL DEFAULT '',
      score      INTEGER NOT NULL,
      intent     TEXT NOT NULL,
      status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','qual','won','lost')),
      source     TEXT NOT NULL,
      industry   TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS leads_user_time ON leads(user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS orders (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      gateway     TEXT NOT NULL,
      provider_id TEXT,
      amount_usd  REAL NOT NULL,
      currency    TEXT NOT NULL,
      status      TEXT NOT NULL,
      mode        TEXT NOT NULL DEFAULT 'test',
      created_at  INTEGER NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS orders_user_time ON orders(user_id, created_at DESC)`,
    `CREATE TABLE IF NOT EXISTS integrations (
      user_id          TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      telegram_token   TEXT,
      telegram_chat_id TEXT,
      channels         TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS auth_attempts (key TEXT NOT NULL, at INTEGER NOT NULL)`,
    `CREATE INDEX IF NOT EXISTS auth_attempts_key ON auth_attempts(key, at)`
  ],
  /* v2 — Slack + generic webhook (Zapier / Make) alerts, both stored encrypted */ [
    `ALTER TABLE integrations ADD COLUMN slack_webhook TEXT`,
    `ALTER TABLE integrations ADD COLUMN webhook_url TEXT`
  ]
];

const g = globalThis as unknown as { __ceDb?: Promise<Client> };

export function db(): Promise<Client> {
  if (!g.__ceDb) {
    g.__ceDb = init().catch(e => {
      g.__ceDb = undefined; // allow a retry on the next request
      throw e;
    });
  }
  return g.__ceDb;
}

async function init(): Promise<Client> {
  // TURSO_* / DATABASE_TURSO_* are what Vercel's Turso integration injects (with or without a custom prefix)
  const env = (...keys: string[]) => keys.map(k => process.env[k]).find(Boolean);
  const url = env("DATABASE_URL", "DATABASE_TURSO_DATABASE_URL", "TURSO_DATABASE_URL") || "file:data/chameleon.db";
  const authToken = env("DATABASE_AUTH_TOKEN", "DATABASE_TURSO_AUTH_TOKEN", "TURSO_AUTH_TOKEN");
  if (url.startsWith("file:")) {
    if (process.env.VERCEL) throw new Error("No database configured: set DATABASE_URL or connect Turso to this Vercel project");
    fs.mkdirSync("data", { recursive: true });
  }
  const c = createClient({ url, authToken });
  if (url.startsWith("file:")) await c.execute("PRAGMA journal_mode = WAL");
  await migrate(c);
  return c;
}

async function migrate(c: Client) {
  await c.execute("CREATE TABLE IF NOT EXISTS _migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const done = new Set((await c.execute("SELECT version FROM _migrations")).rows.map(r => Number(r.version)));
  for (let v = 1; v <= MIGRATIONS.length; v++) {
    if (done.has(v)) continue;
    try {
      await c.batch([...MIGRATIONS[v - 1], { sql: "INSERT INTO _migrations (version, applied_at) VALUES (?, ?)", args: [v, Date.now()] }], "write");
    } catch (e) {
      // another instance may have applied it in the meantime
      const again = await c.execute({ sql: "SELECT 1 FROM _migrations WHERE version = ?", args: [v] });
      if (!again.rows.length) throw e;
    }
  }
}

/* ---------- tiny query helpers ---------- */
export async function run(sql: string, args: InValue[] = []) {
  return (await db()).execute({ sql, args });
}
export async function one(sql: string, args: InValue[] = []): Promise<Row | undefined> {
  return (await run(sql, args)).rows[0];
}
export async function all(sql: string, args: InValue[] = []): Promise<Row[]> {
  return (await run(sql, args)).rows;
}
/** Several writes, atomically. */
export async function batch(stmts: InStatement[]) {
  return (await db()).batch(stmts, "write");
}
