import { newId } from "./crypto";
import type { Cur } from "@/lib/types";

/*
 * Adapter pattern: one PaymentService interface, one adapter per gateway.
 * Business code calls pickAdapter(gateway).charge(order) and never knows
 * which provider is behind it.
 */
export interface ChargeRequest {
  amountUsd: number;
  currency: Cur;
  description: string;
  gateway: string;
  customerEmail?: string;
}

export interface ChargeResult {
  id: string;
  providerId: string | null;
  gateway: string;
  status: "succeeded" | "failed";
  mode: "test" | "live";
  error?: string;
}

export interface PaymentService {
  readonly name: string;
  charge(req: ChargeRequest): Promise<ChargeResult>;
}

/** Deterministic sandbox — used for every gateway that has no credentials configured. */
class SandboxAdapter implements PaymentService {
  constructor(readonly name: string) {}
  async charge(): Promise<ChargeResult> {
    await new Promise(r => setTimeout(r, 350));
    return { id: newId("ch"), providerId: null, gateway: this.name, status: "succeeded", mode: "test" };
  }
}

/** Real Stripe call in TEST mode (sk_test_ keys only) using Stripe's test card pm_card_visa. */
class StripeTestAdapter implements PaymentService {
  readonly name = "Stripe";
  constructor(private key: string) {}
  async charge(req: ChargeRequest): Promise<ChargeResult> {
    const body = new URLSearchParams({
      amount: String(Math.max(50, Math.round(req.amountUsd * 100))),
      currency: "usd",
      description: req.description.slice(0, 200),
      payment_method: "pm_card_visa",
      confirm: "true",
      "automatic_payment_methods[enabled]": "true",
      "automatic_payment_methods[allow_redirects]": "never"
    });
    try {
      const res = await fetch("https://api.stripe.com/v1/payment_intents", {
        method: "POST",
        headers: { authorization: `Bearer ${this.key}`, "content-type": "application/x-www-form-urlencoded" },
        body,
        signal: AbortSignal.timeout(10000),
        cache: "no-store"
      });
      const pi = (await res.json()) as { id?: string; status?: string; error?: { message?: string } };
      if (!res.ok || pi.status !== "succeeded") {
        return { id: newId("ch"), providerId: pi.id ?? null, gateway: this.name, status: "failed", mode: "test", error: pi.error?.message || pi.status };
      }
      return { id: newId("ch"), providerId: pi.id!, gateway: this.name, status: "succeeded", mode: "test" };
    } catch (e) {
      return { id: newId("ch"), providerId: null, gateway: this.name, status: "failed", mode: "test", error: e instanceof Error ? e.message : "Network error" };
    }
  }
}

export function pickAdapter(gatewayId: string, gatewayName: string): PaymentService {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (gatewayId === "stripe" && stripeKey?.startsWith("sk_test_")) return new StripeTestAdapter(stripeKey);
  return new SandboxAdapter(gatewayName);
}
