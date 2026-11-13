import type { NextRequest } from "next/server";
import { isIndKey } from "@/lib/industries";
import { BUDGETS, qualify } from "@/lib/qualify";
import { CHANNEL_KEYS, type ChannelKey } from "@/lib/types";
import { getCurrentUser } from "@/server/auth";
import { CORS, ipOf, json, readJson, str } from "@/server/http";
import { dispatch } from "@/server/notify";
import { findUserByPublicKey, hit, insertLead, pruneDemo } from "@/server/repo";
import { validEmail } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * POST /api/leads
 * Auth: x-api-key header (embed on any site) or the session cookie (this site).
 * Without either the lead is stored in the public demo workspace.
 * Body: { name, email, budget: 0-3, message?, industry?, channels?: { telegram?: false, … } }
 */
export async function POST(req: NextRequest) {
  if (!(await hit(`lead:${ipOf(req)}`, 30, 60_000))) return json({ error: "rate_limited" }, 429, CORS);
  const body = await readJson(req);
  if (!body) return json({ error: "invalid_json" }, 400, CORS);

  const name = str(body.name, 80);
  const email = str(body.email, 254).toLowerCase();
  const message = str(body.message, 1000);
  const budget = Number.isInteger(body.budget) && (body.budget as number) >= 0 && (body.budget as number) < BUDGETS.length ? (body.budget as number) : 0;
  const fields: Record<string, string> = {};
  if (!name) fields.name = "required";
  if (!validEmail(email)) fields.email = "invalid";
  if (Object.keys(fields).length) return json({ error: "validation", fields }, 422, CORS);

  const apiKey = req.headers.get("x-api-key");
  const owner = apiKey ? await findUserByPublicKey(apiKey) : await getCurrentUser();
  if (apiKey && !owner) return json({ error: "invalid_api_key" }, 401, CORS);
  const industry = isIndKey(body.industry) ? body.industry : owner?.industry ?? "service";

  const q = qualify(budget, message);
  const t0 = performance.now();
  const source = apiKey ? "API" : "Website form";
  const lead = await insertLead(owner?.id ?? null, {
    name, email, message, budgetUsd: BUDGETS[budget].usd, score: q.score, intent: q.intent,
    status: q.score >= 80 ? "qual" : "new", source, industry
  });
  const dbMs = Math.max(1, Math.round(performance.now() - t0));
  if (!owner) await pruneDemo();

  const asked = body.channels && typeof body.channels === "object" ? (body.channels as Record<string, unknown>) : {};
  const requested = Object.fromEntries(CHANNEL_KEYS.map(k => [k, asked[k] !== false])) as Record<ChannelKey, boolean>;
  const sent = await dispatch(owner, { type: "lead.created", id: lead.id, name, email, budgetUsd: lead.budgetUsd, score: q.score, intent: q.intent, message, source }, requested);

  return json({ id: lead.id, score: q.score, intent: q.intent, saved: owner ? "account" : "demo", dbMs, dispatch: sent }, 201, CORS);
}
