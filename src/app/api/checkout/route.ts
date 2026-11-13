import type { NextRequest } from "next/server";
import { ALL_GATEWAYS } from "@/lib/gateways";
import { isCur } from "@/lib/money";
import { getCurrentUser } from "@/server/auth";
import { ipOf, json, readJson, str } from "@/server/http";
import { dispatch } from "@/server/notify";
import { pickAdapter } from "@/server/payments";
import { hit, insertOrder, pruneDemo } from "@/server/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/checkout — charges through the gateway's adapter and records the order. */
export async function POST(req: NextRequest) {
  if (!(await hit(`checkout:${ipOf(req)}`, 20, 60_000))) return json({ error: "rate_limited" }, 429);
  const body = await readJson(req);
  if (!body) return json({ error: "invalid_json" }, 400);

  const amountUsd = Number(body.amountUsd);
  const currency = isCur(body.currency) ? body.currency : "USD";
  const gatewayId = str(body.gateway, 20);
  const description = str(body.description, 200) || "Demo transaction";
  if (!Number.isFinite(amountUsd) || amountUsd < 0.5 || amountUsd > 100_000) return json({ error: "invalid_amount" }, 422);
  if (!ALL_GATEWAYS[gatewayId]) return json({ error: "unknown_gateway" }, 422);

  const owner = await getCurrentUser();
  const result = await pickAdapter(gatewayId, ALL_GATEWAYS[gatewayId]).charge({ amountUsd, currency, description, gateway: gatewayId, customerEmail: owner?.email });
  const order = await insertOrder(owner?.id ?? null, {
    id: result.id, description, gateway: result.gateway, providerId: result.providerId,
    amountUsd: Math.round(amountUsd * 100) / 100, currency, status: result.status, mode: result.mode
  });
  if (!owner) await pruneDemo();

  // only signed-in owners get payment alerts; anonymous demo payments stay silent
  if (owner && result.status === "succeeded") {
    await dispatch(owner, { type: "payment.succeeded", id: order.id, amountUsd: order.amountUsd, currency, gateway: order.gateway, mode: order.mode, description });
  }

  return json({ id: order.id, providerId: order.providerId, mode: order.mode, status: order.status, error: result.error, saved: owner ? "account" : "demo" },
    result.status === "succeeded" ? 201 : 402);
}
