export type IndKey = "service" | "production" | "logistics" | "saas";
export type Cur = "USD" | "EUR" | "RUB" | "UZS";
export type LeadStatus = "new" | "qual" | "won" | "lost";
export type Intent = "intent_buy" | "intent_price" | "intent_disc";
/** Notification channels that really dispatch (webhook = Zapier / Make / any URL). */
export type ChannelKey = "telegram" | "slack" | "webhook";
export type Channels = Record<ChannelKey, boolean>;

export const CHANNEL_KEYS: ChannelKey[] = ["telegram", "slack", "webhook"];
export const DEFAULT_CHANNELS: Channels = { telegram: true, slack: true, webhook: true };
export const CHANNEL_NAMES: Record<ChannelKey, string> = { telegram: "Telegram", slack: "Slack", webhook: "Zapier / Make webhook" };

export interface User {
  id: string;
  email: string;
  name: string;
  business: string;
  industry: IndKey;
  locale: string;
  publicKey: string;
  createdAt: number;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  budgetUsd: number;
  message: string;
  score: number;
  intent: Intent;
  status: LeadStatus;
  source: string;
  industry: IndKey;
  createdAt: number;
}

export interface Order {
  id: string;
  description: string;
  gateway: string;
  providerId: string | null;
  amountUsd: number;
  currency: Cur;
  status: string;
  mode: "test" | "live";
  createdAt: number;
}

/** What the browser needs to know about the signed-in user. */
export interface PublicUser {
  name: string;
  email: string;
  business: string;
}
