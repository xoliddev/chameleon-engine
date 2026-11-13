"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { currentSessionId, destroySession, getCurrentUser } from "../auth";
import { hashPassword, verifyPassword } from "../crypto";
import { SLACK_RE, checkWebhookUrl, sendSlack, sendWebhook, type NotifyEvent } from "../notify";
import * as repo from "../repo";
import { sendTelegram, tgEscape } from "../telegram";
import { between, field, strongPassword, type FormState } from "../validate";
import { isIndKey } from "@/lib/industries";
import { CHANNEL_KEYS, type Channels, type LeadStatus } from "@/lib/types";

async function requireUser() {
  const u = await getCurrentUser();
  if (!u) throw new Error("Unauthorized");
  return u;
}
const refresh = () => revalidatePath("/[locale]/dashboard", "layout");
const asLocale = (v: string): Locale => ((routing.locales as readonly string[]).includes(v) ? (v as Locale) : routing.defaultLocale);
const sample = (): NotifyEvent => ({
  type: "lead.created", id: "ld_test", name: "Test Lead", email: "test@example.com", budgetUsd: 5000, score: 92,
  intent: "intent_buy", message: "This is a test notification from Chameleon Engine.", source: "Test"
});

export async function updateProfileAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const name = field(fd, "name", 60), business = field(fd, "business", 80), industry = field(fd, "industry", 20);
  const locale = asLocale(field(fd, "locale", 5));
  if (!between(name, 2, 60)) return { error: "err_name" };
  if (!between(business, 2, 80)) return { error: "err_business" };
  await repo.updateProfile(u.id, { name, business, industry: isIndKey(industry) ? industry : u.industry, locale });
  refresh();
  return { ok: "saved" };
}

/* ---------- Telegram ---------- */
export async function saveTelegramAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const token = field(fd, "token", 120);
  const chatId = field(fd, "chatId", 40);
  if (fd.get("remove")) {
    await repo.saveIntegrations(u.id, { telegramToken: null, telegramChatId: null });
    refresh();
    return { ok: "saved" };
  }
  if (token && !/^\d+:[A-Za-z0-9_-]{30,}$/.test(token)) return { error: "ch_fail", params: { error: "invalid token format" } };
  if (chatId && !/^-?\d{3,20}$|^@[A-Za-z0-9_]{4,40}$/.test(chatId)) return { error: "ch_fail", params: { error: "invalid chat ID" } };
  await repo.saveIntegrations(u.id, { telegramToken: token || undefined, telegramChatId: chatId || null });
  refresh();
  return { ok: "saved" };
}

export async function testTelegramAction(_p: FormState): Promise<FormState> {
  const u = await requireUser();
  const i = await repo.getIntegrations(u.id);
  if (!i.telegramToken || !i.telegramChatId) return { error: "ch_missing" };
  const r = await sendTelegram(i.telegramToken, i.telegramChatId,
    `✅ <b>Chameleon Engine</b>\n${tgEscape(u.business)} is connected. New leads will arrive here in under 2 seconds.`);
  return r.ok ? { ok: "ch_ok" } : { error: "ch_fail", params: { error: r.error } };
}

/* ---------- Slack ---------- */
export async function saveSlackAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (fd.get("remove")) {
    await repo.saveIntegrations(u.id, { slackWebhook: null });
    refresh();
    return { ok: "saved" };
  }
  const url = field(fd, "slack", 300);
  if (!url) return { ok: "saved" };
  if (!SLACK_RE.test(url)) return { error: "ch_fail", params: { error: "must be an https://hooks.slack.com/… incoming webhook URL" } };
  await repo.saveIntegrations(u.id, { slackWebhook: url });
  refresh();
  return { ok: "saved" };
}

export async function testSlackAction(_p: FormState): Promise<FormState> {
  const u = await requireUser();
  const i = await repo.getIntegrations(u.id);
  if (!i.slackWebhook) return { error: "ch_missing" };
  try { await sendSlack(i.slackWebhook, u.business, sample()); return { ok: "ch_ok" }; }
  catch (e) { return { error: "ch_fail", params: { error: e instanceof Error ? e.message : "error" } }; }
}

/* ---------- Generic webhook (Zapier / Make / n8n / any URL) ---------- */
export async function saveWebhookAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (fd.get("remove")) {
    await repo.saveIntegrations(u.id, { webhookUrl: null });
    refresh();
    return { ok: "saved" };
  }
  const url = field(fd, "webhook", 500);
  if (!url) return { ok: "saved" };
  const bad = await checkWebhookUrl(url);
  if (bad) return { error: "ch_fail", params: { error: bad } };
  await repo.saveIntegrations(u.id, { webhookUrl: url });
  refresh();
  return { ok: "saved" };
}

export async function testWebhookAction(_p: FormState): Promise<FormState> {
  const u = await requireUser();
  const i = await repo.getIntegrations(u.id);
  if (!i.webhookUrl) return { error: "ch_missing" };
  try { await sendWebhook(i.webhookUrl, u.id, u.business, sample()); return { ok: "ch_ok" }; }
  catch (e) { return { error: "ch_fail", params: { error: e instanceof Error ? e.message : "error" } }; }
}

export async function saveChannelsAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const channels = Object.fromEntries(CHANNEL_KEYS.map(k => [k, fd.get(k) === "on"])) as Channels;
  await repo.saveIntegrations(u.id, { channels });
  refresh();
  return { ok: "saved" };
}

export async function rotateKeyAction(): Promise<FormState> {
  const u = await requireUser();
  await repo.rotatePublicKey(u.id);
  refresh();
  return { ok: "saved" };
}

export async function changePasswordAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  const current = String(fd.get("current") ?? ""), next = String(fd.get("next") ?? "");
  const hash = await repo.findPasswordHash(u.id);
  if (!hash || !(await verifyPassword(current, hash))) return { error: "err_current" };
  if (!strongPassword(next)) return { error: "err_password" };
  await repo.updatePasswordHash(u.id, await hashPassword(next));
  await repo.deleteOtherSessions(u.id, await currentSessionId());
  refresh();
  return { ok: "pw_changed" };
}

export async function logoutOthersAction(): Promise<FormState> {
  const u = await requireUser();
  await repo.deleteOtherSessions(u.id, await currentSessionId());
  refresh();
  return { ok: "others_out" };
}

export async function deleteAccountAction(_p: FormState, fd: FormData): Promise<FormState> {
  const u = await requireUser();
  if (field(fd, "confirm", 254).toLowerCase() !== u.email.toLowerCase()) return { error: "err_confirm" };
  const locale = asLocale(field(fd, "locale", 5));
  await repo.deleteUser(u.id);
  await destroySession();
  redirect({ href: "/", locale });
  return {};
}

const STATUSES: LeadStatus[] = ["new", "qual", "won", "lost"];

export async function setLeadStatusAction(leadId: string, status: string) {
  const u = await requireUser();
  if (!STATUSES.includes(status as LeadStatus)) return;
  await repo.setLeadStatus(u.id, leadId, status as LeadStatus);
  refresh();
}

export async function deleteLeadAction(leadId: string) {
  const u = await requireUser();
  await repo.deleteLead(u.id, leadId);
  refresh();
}
