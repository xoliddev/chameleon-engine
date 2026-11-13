import type { Row } from "@libsql/client";
import { all, batch, one, run } from "./db";
import { decrypt, encrypt, newId, randomToken } from "./crypto";
import type { Channels, Cur, IndKey, Intent, Lead, LeadStatus, Order, User } from "@/lib/types";
import { DEFAULT_CHANNELS } from "@/lib/types";

/* All SQL in one place. Rows come back as plain objects; map them to domain types. */

const toUser = (r: Row): User => ({
  id: r.id as string,
  email: r.email as string,
  name: r.name as string,
  business: r.business as string,
  industry: r.industry as IndKey,
  locale: r.locale as string,
  publicKey: r.public_key as string,
  createdAt: Number(r.created_at)
});

const toLead = (r: Row): Lead => ({
  id: r.id as string,
  name: r.name as string,
  email: r.email as string,
  budgetUsd: Number(r.budget_usd),
  message: r.message as string,
  score: Number(r.score),
  intent: r.intent as Intent,
  status: r.status as LeadStatus,
  source: r.source as string,
  industry: r.industry as IndKey,
  createdAt: Number(r.created_at)
});

const toOrder = (r: Row): Order => ({
  id: r.id as string,
  description: r.description as string,
  gateway: r.gateway as string,
  providerId: (r.provider_id as string | null) ?? null,
  amountUsd: Number(r.amount_usd),
  currency: r.currency as Cur,
  status: r.status as string,
  mode: r.mode as "test" | "live",
  createdAt: Number(r.created_at)
});

/* ---------------- users ---------------- */

export async function createUser(u: { email: string; name: string; business: string; industry: IndKey; locale: string; passwordHash: string }): Promise<User> {
  const id = newId("usr");
  await batch([
    {
      sql: `INSERT INTO users (id, email, name, business, industry, locale, password_hash, public_key, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [id, u.email, u.name, u.business, u.industry, u.locale, u.passwordHash, "pk_" + randomToken(18), Date.now()]
    },
    { sql: "INSERT INTO integrations (user_id, channels) VALUES (?, ?)", args: [id, JSON.stringify(DEFAULT_CHANNELS)] }
  ]);
  return (await findUserById(id))!;
}

export async function findUserById(id: string): Promise<User | null> {
  const r = await one("SELECT * FROM users WHERE id = ?", [id]);
  return r ? toUser(r) : null;
}

export async function findAuthByEmail(email: string): Promise<{ user: User; passwordHash: string } | null> {
  const r = await one("SELECT * FROM users WHERE email = ?", [email]);
  return r ? { user: toUser(r), passwordHash: r.password_hash as string } : null;
}

export async function findPasswordHash(userId: string): Promise<string | null> {
  const r = await one("SELECT password_hash FROM users WHERE id = ?", [userId]);
  return r ? (r.password_hash as string) : null;
}

export async function findUserByPublicKey(key: string): Promise<User | null> {
  const r = await one("SELECT * FROM users WHERE public_key = ?", [key]);
  return r ? toUser(r) : null;
}

export async function updateProfile(userId: string, p: { name: string; business: string; industry: IndKey; locale: string }) {
  await run("UPDATE users SET name = ?, business = ?, industry = ?, locale = ? WHERE id = ?", [p.name, p.business, p.industry, p.locale, userId]);
}

export async function updatePasswordHash(userId: string, hash: string) {
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [hash, userId]);
}

export async function rotatePublicKey(userId: string): Promise<string> {
  const key = "pk_" + randomToken(18);
  await run("UPDATE users SET public_key = ? WHERE id = ?", [key, userId]);
  return key;
}

/** Explicit child deletes: don't rely on FK enforcement being on for every connection. */
export async function deleteUser(userId: string) {
  await batch(["sessions", "leads", "orders", "integrations"].map(t => ({ sql: `DELETE FROM ${t} WHERE user_id = ?`, args: [userId] }))
    .concat([{ sql: "DELETE FROM users WHERE id = ?", args: [userId] }]));
}

/* ---------------- sessions ---------------- */

export async function insertSession(s: { id: string; userId: string; expiresAt: number; userAgent: string | null; ip: string | null }) {
  await run("INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent, ip) VALUES (?, ?, ?, ?, ?, ?)",
    [s.id, s.userId, s.expiresAt, Date.now(), s.userAgent, s.ip]);
}

export async function findSessionUser(sessionId: string): Promise<User | null> {
  const r = await one(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                       WHERE s.id = ? AND s.expires_at > ?`, [sessionId, Date.now()]);
  return r ? toUser(r) : null;
}

export async function deleteSession(sessionId: string) {
  await run("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

export async function deleteOtherSessions(userId: string, keepId: string | null) {
  await run("DELETE FROM sessions WHERE user_id = ? AND id IS NOT ?", [userId, keepId]);
}

export async function countSessions(userId: string): Promise<number> {
  const r = await one("SELECT COUNT(*) AS n FROM sessions WHERE user_id = ? AND expires_at > ?", [userId, Date.now()]);
  return Number(r?.n ?? 0);
}

/* ---------------- rate limiting (sliding window) ---------------- */

export async function hit(key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  await run("DELETE FROM auth_attempts WHERE at < ?", [now - 24 * 3600_000]);
  const r = await one("SELECT COUNT(*) AS n FROM auth_attempts WHERE key = ? AND at > ?", [key, now - windowMs]);
  if (Number(r?.n ?? 0) >= max) return false;
  await run("INSERT INTO auth_attempts (key, at) VALUES (?, ?)", [key, now]);
  return true;
}

export async function clearHits(key: string) {
  await run("DELETE FROM auth_attempts WHERE key = ?", [key]);
}

/* ---------------- leads ---------------- */

export async function insertLead(userId: string | null, l: Omit<Lead, "id" | "createdAt" | "status"> & { status?: LeadStatus }): Promise<Lead> {
  const id = newId("ld");
  const now = Date.now();
  const status = l.status ?? "new";
  await run(`INSERT INTO leads (id, user_id, name, email, budget_usd, message, score, intent, status, source, industry, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, l.name, l.email, l.budgetUsd, l.message, l.score, l.intent, status, l.source, l.industry, now]);
  return { ...l, id, status, createdAt: now };
}

export async function listLeads(userId: string, opts: { status?: LeadStatus; q?: string; limit?: number } = {}): Promise<Lead[]> {
  const where = ["user_id = ?"];
  const args: (string | number)[] = [userId];
  if (opts.status) { where.push("status = ?"); args.push(opts.status); }
  if (opts.q) { where.push("(name LIKE ? OR email LIKE ? OR message LIKE ?)"); const q = `%${opts.q}%`; args.push(q, q, q); }
  args.push(opts.limit ?? 500);
  return (await all(`SELECT * FROM leads WHERE ${where.join(" AND ")} ORDER BY created_at DESC LIMIT ?`, args)).map(toLead);
}

export async function setLeadStatus(userId: string, leadId: string, status: LeadStatus): Promise<boolean> {
  const r = await run("UPDATE leads SET status = ? WHERE id = ? AND user_id = ?", [status, leadId, userId]);
  return r.rowsAffected > 0;
}

export async function deleteLead(userId: string, leadId: string) {
  await run("DELETE FROM leads WHERE id = ? AND user_id = ?", [leadId, userId]);
}

/** Public demo rows (user_id NULL) are kept for 7 days. */
export async function pruneDemo() {
  const cutoff = Date.now() - 7 * 864e5;
  await batch([
    { sql: "DELETE FROM leads WHERE user_id IS NULL AND created_at < ?", args: [cutoff] },
    { sql: "DELETE FROM orders WHERE user_id IS NULL AND created_at < ?", args: [cutoff] }
  ]);
}

/* ---------------- orders ---------------- */

export async function insertOrder(userId: string | null, o: Omit<Order, "id" | "createdAt"> & { id?: string }): Promise<Order> {
  const id = o.id ?? newId("ch");
  const now = Date.now();
  await run(`INSERT INTO orders (id, user_id, description, gateway, provider_id, amount_usd, currency, status, mode, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, o.description, o.gateway, o.providerId, o.amountUsd, o.currency, o.status, o.mode, now]);
  return { ...o, id, createdAt: now };
}

export async function listOrders(userId: string, limit = 500): Promise<Order[]> {
  return (await all("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", [userId, limit])).map(toOrder);
}

/* ---------------- analytics ---------------- */

export async function counts(userId: string): Promise<{ leads: number; orders: number }> {
  const r = await one(`SELECT (SELECT COUNT(*) FROM leads WHERE user_id = ?) AS leads,
                              (SELECT COUNT(*) FROM orders WHERE user_id = ?) AS orders`, [userId, userId]);
  return { leads: Number(r?.leads ?? 0), orders: Number(r?.orders ?? 0) };
}

export async function stats(userId: string) {
  const since = Date.now() - 30 * 864e5;
  const [rev, leads, won, days] = await Promise.all([
    one("SELECT COALESCE(SUM(amount_usd),0) AS s, COUNT(*) AS n FROM orders WHERE user_id = ? AND status = 'succeeded' AND created_at > ?", [userId, since]),
    one("SELECT COUNT(*) AS n, COALESCE(AVG(score),0) AS avg FROM leads WHERE user_id = ? AND created_at > ?", [userId, since]),
    one("SELECT COUNT(*) AS n FROM leads WHERE user_id = ? AND status = 'won' AND created_at > ?", [userId, since]),
    all(`SELECT CAST((created_at - ?) / 86400000 AS INTEGER) AS day, SUM(amount_usd) AS s
         FROM orders WHERE user_id = ? AND status = 'succeeded' AND created_at > ? GROUP BY day`, [since, userId, since])
  ]);
  const series = Array.from({ length: 30 }, () => 0);
  days.forEach(r => { const i = Math.min(29, Math.max(0, Number(r.day))); series[i] += Number(r.s); });
  const leadCount = Number(leads?.n ?? 0), orderCount = Number(rev?.n ?? 0), revenue = Number(rev?.s ?? 0);
  return {
    revenue,
    orders: orderCount,
    leads: leadCount,
    avgScore: Math.round(Number(leads?.avg ?? 0)),
    winRate: leadCount ? Number(won?.n ?? 0) / leadCount : 0,
    aov: orderCount ? revenue / orderCount : 0,
    series
  };
}

/* ---------------- integrations ---------------- */

export interface Integrations {
  telegramToken: string | null;
  telegramChatId: string | null;
  slackWebhook: string | null;
  webhookUrl: string | null;
  channels: Channels;
}

export async function getIntegrations(userId: string): Promise<Integrations> {
  const r = await one("SELECT * FROM integrations WHERE user_id = ?", [userId]);
  let channels: Channels = { ...DEFAULT_CHANNELS };
  if (r) {
    try {
      const saved = JSON.parse(r.channels as string) as Partial<Channels>;
      channels = { telegram: saved.telegram ?? true, slack: saved.slack ?? true, webhook: saved.webhook ?? true };
    } catch { /* keep defaults */ }
  }
  return {
    telegramToken: decrypt(r?.telegram_token as string | null),
    telegramChatId: (r?.telegram_chat_id as string | null) || null,
    slackWebhook: decrypt(r?.slack_webhook as string | null),
    webhookUrl: decrypt(r?.webhook_url as string | null),
    channels
  };
}

/** undefined = keep current value, null = clear it. Secrets are encrypted at rest. */
export async function saveIntegrations(userId: string, i: Partial<Integrations>) {
  const cur = await getIntegrations(userId);
  const pick = <K extends keyof Integrations>(k: K) => (i[k] === undefined ? cur[k] : i[k]);
  const enc = (v: string | null | undefined) => (v ? encrypt(v) : null);
  await run(`INSERT INTO integrations (user_id, telegram_token, telegram_chat_id, slack_webhook, webhook_url, channels)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id) DO UPDATE SET telegram_token = excluded.telegram_token, telegram_chat_id = excluded.telegram_chat_id,
               slack_webhook = excluded.slack_webhook, webhook_url = excluded.webhook_url, channels = excluded.channels`,
    [userId, enc(pick("telegramToken") as string | null), pick("telegramChatId") as string | null,
      enc(pick("slackWebhook") as string | null), enc(pick("webhookUrl") as string | null), JSON.stringify(pick("channels"))]);
}
