import type { Intent } from "./types";

/* Lead scoring shared by the API (source of truth) and the UI (instant preview). */

export const BUDGETS = [
  { lo: 0, hi: 500, usd: 300, pts: 5 },
  { lo: 500, hi: 2000, usd: 1200, pts: 15 },
  { lo: 2000, hi: 10000, usd: 5000, pts: 28 },
  { lo: 10000, hi: 0, usd: 15000, pts: 38 }
];

export function qualify(budgetIdx: number, msg: string): { score: number; intent: Intent; urgent: boolean } {
  const b = BUDGETS[budgetIdx] ?? BUDGETS[0];
  let score = 48 + b.pts;
  if (msg.length > 40) score += 6;
  const urgent = /urgent|asap|today|this week|срочно|сегодня|недел|tez|shoshilinch|bugun|hafta/i.test(msg);
  const buy = /buy|order|ready|purchase|book|купить|заказ|готов|sotib|buyurtma|tayyor/i.test(msg);
  const price = /price|quote|cost|how much|цен|стоим|расч|narx|qancha/i.test(msg);
  if (urgent) score += 8;
  if (buy) score += 6;
  const intent: Intent = buy ? "intent_buy" : price ? "intent_price" : "intent_disc";
  return { score: Math.min(99, score), intent, urgent };
}
