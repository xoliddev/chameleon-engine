import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

/*
 * Secrets: AUTH_SECRET (>= 32 chars) in production. In development a random
 * secret is generated once into data/.auth-secret so sessions survive restarts.
 */
let cached: Buffer | null = null;
function secret(): Buffer {
  if (cached) return cached;
  const env = process.env.AUTH_SECRET;
  if (env && env.length >= 32) return (cached = Buffer.from(env));
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEV_SECRET) {
    throw new Error("AUTH_SECRET must be set (at least 32 characters) in production");
  }
  const file = path.join(process.cwd(), "data", ".auth-secret");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, crypto.randomBytes(48).toString("base64url"), { mode: 0o600 });
  return (cached = Buffer.from(fs.readFileSync(file, "utf8").trim()));
}

export const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("base64url");
export const newId = (prefix: string) => `${prefix}_${crypto.randomBytes(10).toString("base64url")}`;
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

/** Per-account signing secret for outgoing webhooks (receivers verify x-chameleon-signature). */
export const webhookSecret = (userId: string) =>
  "whsec_" + crypto.createHmac("sha256", secret()).update("whsec:" + userId).digest("base64url").slice(0, 32);

export const hmacHex = (key: string, body: string) => crypto.createHmac("sha256", key).update(body).digest("hex");

/* ---------- AES-256-GCM for third-party tokens at rest ---------- */
const encKey = () => crypto.createHash("sha256").update(Buffer.concat([secret(), Buffer.from(":enc")])).digest();

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return ["v1", iv.toString("base64url"), c.getAuthTag().toString("base64url"), ct.toString("base64url")].join(".");
}

export function decrypt(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const [v, iv, tag, ct] = blob.split(".");
    if (v !== "v1") return null;
    const d = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64url"));
    d.setAuthTag(Buffer.from(tag, "base64url"));
    return Buffer.concat([d.update(Buffer.from(ct, "base64url")), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/* ---------- password hashing: scrypt, per-user salt, constant-time compare ---------- */
const N = 16384, R = 8, P = 1, KEYLEN = 64;

function scrypt(pw: string, salt: Buffer, n: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(pw.normalize("NFKC"), salt, KEYLEN, { N: n, r, p, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key)))
  );
}

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(pw, salt, N, R, P);
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, n, r, p, salt, hash] = stored.split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(hash, "base64url");
  const key = await scrypt(pw, Buffer.from(salt, "base64url"), +n, +r, +p);
  return key.length === expected.length && crypto.timingSafeEqual(key, expected);
}

/** A real hash used to keep login timing identical for unknown emails. */
export const DUMMY_HASH = "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);
