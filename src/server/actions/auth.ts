"use server";

import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { clientIp, createSession, destroySession, getCurrentUser, rateLimit } from "../auth";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../crypto";
import { clearHits, createUser, findAuthByEmail } from "../repo";
import { between, field, normEmail, strongPassword, validEmail, type FormState } from "../validate";
import { isIndKey } from "@/lib/industries";

const asLocale = (v: string): Locale => ((routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale);

export async function signupAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const locale = asLocale(field(fd, "locale", 5));
  const email = normEmail(field(fd, "email", 254));
  const name = field(fd, "name", 60);
  const business = field(fd, "business", 80);
  const industry = field(fd, "industry", 20);
  const password = String(fd.get("password") ?? "");
  const values = { email, name, business, industry };

  if (!between(name, 2, 60)) return { error: "err_name", values };
  if (!between(business, 2, 80)) return { error: "err_business", values };
  if (!validEmail(email)) return { error: "err_email", values };
  if (!strongPassword(password)) return { error: "err_password", values };
  if (fd.get("terms") !== "on") return { error: "err_terms", values };
  if (!(await rateLimit(`signup:${await clientIp()}`, 10, 3600_000))) return { error: "err_rate", values };
  if (await findAuthByEmail(email)) return { error: "err_exists", values };

  try {
    const user = await createUser({ email, name, business, industry: isIndKey(industry) ? industry : "service", locale, passwordHash: await hashPassword(password) });
    await createSession(user.id);
  } catch (e) {
    console.error("signup failed", e);
    return { error: "err_generic", values };
  }
  redirect({ href: "/dashboard", locale });
  return {};
}

export async function loginAction(_prev: FormState, fd: FormData): Promise<FormState> {
  const locale = asLocale(field(fd, "locale", 5));
  const email = normEmail(field(fd, "email", 254));
  const password = String(fd.get("password") ?? "");
  const values = { email };
  const ip = await clientIp();

  if (!validEmail(email) || !password) return { error: "err_invalid", values };
  if (!(await rateLimit(`login:ip:${ip}`, 30, 15 * 60_000)) || !(await rateLimit(`login:email:${email}`, 8, 15 * 60_000))) {
    return { error: "err_rate", values };
  }

  const found = await findAuthByEmail(email);
  // always run scrypt so response time doesn't reveal whether the email exists
  const ok = await verifyPassword(password, found?.passwordHash ?? DUMMY_HASH);
  if (!found || !ok) return { error: "err_invalid", values };

  await clearHits(`login:email:${email}`);
  await createSession(found.user.id);
  redirect({ href: "/dashboard", locale });
  return {};
}

export async function logoutAction(fd: FormData) {
  const locale = asLocale(field(fd, "locale", 5));
  await destroySession();
  redirect({ href: "/", locale });
}

/** Used by auth pages to bounce signed-in users to their dashboard. */
export async function redirectIfAuthed(locale: Locale) {
  if (await getCurrentUser()) redirect({ href: "/dashboard", locale });
}
