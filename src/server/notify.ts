import dns from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import { hmacHex, webhookSecret } from "./crypto";
import { getIntegrations } from "./repo";
import { sendTelegram, tgEscape } from "./telegram";
import { CHANNEL_KEYS, type ChannelKey, type User } from "@/lib/types";

/*
 * One dispatch() for every alert. Each channel is an adapter; they run in
 * parallel with a 5s timeout, so a slow Slack never delays Telegram.
 */

export type NotifyEvent =
  | { type: "lead.created"; id: string; name: string; email: string; budgetUsd: number; score: number; intent: string; message: string; source: string }
  | { type: "payment.succeeded"; id: string; amountUsd: number; currency: string; gateway: string; mode: string; description: string };

export type ChannelStatus = "sent" | "failed" | "simulated" | "disabled" | "not_configured";
export type DispatchResult = Record<ChannelKey, { status: ChannelStatus; error?: string }>;

const isProd = process.env.NODE_ENV === "production";
export const SLACK_RE = /^https:\/\/hooks\.slack\.com\/(services|triggers|workflows)\/[A-Za-z0-9/_-]{10,}$/;

/* ---------- message formatting ---------- */
function telegramText(biz: string, e: NotifyEvent) {
  if (e.type === "lead.created") {
    return [
      `🔥 <b>New lead — ${tgEscape(biz)}</b>`,
      `👤 ${tgEscape(e.name)}`,
      `✉️ ${tgEscape(e.email)}`,
      `💰 ~$${e.budgetUsd.toLocaleString("en-US")}`,
      `🧠 AI score: <b>${e.score}/100</b> · ${e.intent.replace("intent_", "")}`,
      e.message ? `💬 “${tgEscape(e.message)}”` : ""
    ].filter(Boolean).join("\n");
  }
  return `💳 <b>Payment received — ${tgEscape(biz)}</b>\n$${e.amountUsd.toFixed(2)} · ${tgEscape(e.gateway)} (${e.mode})\n#${e.id}`;
}

const slackEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
function slackPayload(biz: string, e: NotifyEvent) {
  const text = e.type === "lead.created"
    ? `:fire: *New lead — ${slackEsc(biz)}*\n*${slackEsc(e.name)}* · ${slackEsc(e.email)}\nBudget ~$${e.budgetUsd.toLocaleString("en-US")} · AI score *${e.score}/100* · ${e.intent.replace("intent_", "")}${e.message ? `\n> ${slackEsc(e.message)}` : ""}`
    : `:credit_card: *Payment received — ${slackEsc(biz)}*\n$${e.amountUsd.toFixed(2)} via ${slackEsc(e.gateway)} (${e.mode}) · \`${e.id}\``;
  return { text, blocks: [{ type: "section", text: { type: "mrkdwn", text } }] };
}

/* ---------- SSRF guard for user-supplied webhook URLs ---------- */
const BLOCKED = new net.BlockList();
for (const [a, p] of [["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["224.0.0.0", 3]] as const) BLOCKED.addSubnet(a, p, "ipv4");
for (const [a, p] of [["::", 96], ["fc00::", 7], ["fe80::", 10], ["ff00::", 8], ["64:ff9b::", 96]] as const) BLOCKED.addSubnet(a, p, "ipv6");

/** IPv4-mapped IPv6 (::ffff:169.254.169.254 in any spelling) → the IPv4 address it reaches. */
function mappedV4(ip: string): string | null {
  const h = new URL(`http://[${ip}]`).hostname.slice(1, -1).toLowerCase();
  const m = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (!m) return null;
  const a = parseInt(m[1], 16), b = parseInt(m[2], 16);
  return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
}

export function privateIp(ip: string) {
  if (net.isIPv4(ip)) return BLOCKED.check(ip, "ipv4");
  if (!net.isIPv6(ip)) return true;
  const v4 = mappedV4(ip);
  return v4 ? BLOCKED.check(v4, "ipv4") : BLOCKED.check(ip, "ipv6");
}

type LookupCb = (err: NodeJS.ErrnoException | null, address: string | { address: string; family: number }[], family?: number) => void;
/** Resolves for the actual connection and refuses private addresses, so DNS rebinding after the check cannot reach them. */
function guardedLookup(hostname: string, options: { all?: boolean }, cb: LookupCb) {
  dns.lookup(hostname, { all: true }).then(addrs => {
    if (isProd && (!addrs.length || addrs.some(a => privateIp(a.address)))) return cb(new Error("private network addresses are not allowed"), "");
    if (options.all) cb(null, addrs);
    else cb(null, addrs[0].address, addrs[0].family);
  }, err => cb(err, ""));
}

/** Returns an error string, or null when the URL is safe to call. */
export async function checkWebhookUrl(raw: string): Promise<string | null> {
  let u: URL;
  try { u = new URL(raw); } catch { return "invalid URL"; }
  if (u.username || u.password) return "credentials in URL are not allowed";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && !isProd)) return "URL must use https";
  if (!isProd) return null; // local development may target localhost receivers
  if (u.hostname === "localhost" || u.hostname.endsWith(".local") || u.hostname.endsWith(".internal")) return "private hosts are not allowed";
  try {
    const addrs = net.isIP(u.hostname) ? [{ address: u.hostname }] : await dns.lookup(u.hostname, { all: true });
    if (addrs.some(a => privateIp(a.address))) return "private network addresses are not allowed";
  } catch {
    return "host could not be resolved";
  }
  return null;
}

function post(url: string, body: string, headers: Record<string, string> = {}): Promise<void> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = (u.protocol === "https:" ? https : http).request(u, {
      method: "POST",
      headers: { "content-type": "application/json", "user-agent": "ChameleonEngine-Webhook/1.0", "content-length": String(Buffer.byteLength(body)), ...headers },
      lookup: guardedLookup as never
    }, res => {
      res.resume(); // redirects are not followed
      const code = res.statusCode ?? 0;
      if (code >= 200 && code < 300) resolve(); else reject(new Error(`HTTP ${code}`));
    });
    const timer = setTimeout(() => req.destroy(new Error("timeout")), 5000);
    req.on("close", () => clearTimeout(timer));
    req.on("error", reject);
    req.end(body);
  });
}

/* ---------- adapters ---------- */
export async function sendSlack(url: string, biz: string, e: NotifyEvent) {
  if (!SLACK_RE.test(url)) throw new Error("not a Slack incoming webhook URL");
  await post(url, JSON.stringify(slackPayload(biz, e)));
}

export async function sendWebhook(url: string, userId: string, biz: string, e: NotifyEvent) {
  const bad = await checkWebhookUrl(url);
  if (bad) throw new Error(bad);
  const { type, ...data } = e;
  const body = JSON.stringify({ event: type, account: biz, sentAt: new Date().toISOString(), data });
  const ts = Math.floor(Date.now() / 1000).toString();
  await post(url, body, { "x-chameleon-event": type, "x-chameleon-timestamp": ts, "x-chameleon-signature": "sha256=" + hmacHex(webhookSecret(userId), `${ts}.${body}`) });
}

/**
 * owner = account the event belongs to (null = anonymous visitor on the public demo,
 * which may use the optional DEMO_* env channels). `requested` lets the landing demo
 * switch channels off for a single run.
 */
export async function dispatch(owner: User | null, e: NotifyEvent, requested: Partial<Record<ChannelKey, boolean>> = {}): Promise<DispatchResult> {
  const i = owner ? await getIntegrations(owner.id) : null;
  const biz = owner?.business ?? "Chameleon demo";
  const cfg = {
    telegram: i ? (i.telegramToken && i.telegramChatId ? [i.telegramToken, i.telegramChatId] : null)
      : process.env.DEMO_TELEGRAM_BOT_TOKEN && process.env.DEMO_TELEGRAM_CHAT_ID ? [process.env.DEMO_TELEGRAM_BOT_TOKEN, process.env.DEMO_TELEGRAM_CHAT_ID] : null,
    slack: i ? i.slackWebhook : process.env.DEMO_SLACK_WEBHOOK_URL ?? null,
    webhook: i ? i.webhookUrl : null
  };
  const out = {} as DispatchResult;
  await Promise.all(CHANNEL_KEYS.map(async k => {
    if (requested[k] === false || (i && !i.channels[k])) { out[k] = { status: "disabled" }; return; }
    if (!cfg[k]) { out[k] = { status: owner ? "not_configured" : "simulated" }; return; }
    try {
      if (k === "telegram") {
        const [token, chat] = cfg.telegram as string[];
        const r = await sendTelegram(token, chat, telegramText(biz, e));
        out[k] = r.ok ? { status: "sent" } : { status: "failed", error: r.error };
      } else if (k === "slack") {
        await sendSlack(cfg.slack as string, biz, e);
        out[k] = { status: "sent" };
      } else {
        await sendWebhook(cfg.webhook as string, owner!.id, biz, e);
        out[k] = { status: "sent" };
      }
    } catch (err) {
      out[k] = { status: "failed", error: err instanceof Error ? err.message : "error" };
    }
  }));
  return out;
}
