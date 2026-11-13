import { cache } from "react";
import { cookies, headers } from "next/headers";
import { randomToken, sha256 } from "./crypto";
import { deleteSession, findSessionUser, hit, insertSession } from "./repo";
import type { User } from "@/lib/types";

/*
 * Database-backed sessions. The cookie holds a random 256-bit token;
 * the database only stores its SHA-256, so a leaked DB can't be replayed.
 */
export const SESSION_COOKIE = "ce_session";
const TTL_MS = 30 * 864e5;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "local").trim();
}

export async function createSession(userId: string) {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = Date.now() + TTL_MS;
  await insertSession({ id: sha256(token), userId, expiresAt, userAgent: h.get("user-agent")?.slice(0, 200) ?? null, ip: await clientIp() });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function currentSessionId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? sha256(token) : null;
}

/** Cached per request, safe to call from layouts, pages, actions and route handlers. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const id = await currentSessionId();
  return id ? findSessionUser(id) : null;
});

export async function destroySession() {
  const id = await currentSessionId();
  if (id) await deleteSession(id);
  (await cookies()).delete(SESSION_COOKIE);
}

/** Sliding-window limiter keyed by action + identity. Resolves false when blocked. */
export const rateLimit = (key: string, max: number, windowMs: number) => hit(key, max, windowMs);
