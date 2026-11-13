import type { Cur } from "./types";

export const CURRENCIES: Cur[] = ["USD", "EUR", "RUB", "UZS"];
export const RATES: Record<Cur, number> = { USD: 1, EUR: 0.92, RUB: 92, UZS: 12650 };
export const isCur = (c: unknown): c is Cur => typeof c === "string" && c in RATES;

/** Base amounts are USD; display converts. */
export function money(usd: number, cur: Cur, locale: string, dec = 0): string {
  const v = usd * RATES[cur];
  let n = Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  if (cur !== "USD") n = n.replace(/,/g, " ");
  const s = { USD: "$" + n, EUR: "€" + n, RUB: n + " ₽", UZS: n + (locale === "ru" ? " сум" : " so'm") }[cur];
  return (v < 0 ? "−" : "") + s;
}

export const exactDec = (cur: Cur) => (cur === "USD" || cur === "EUR" ? 2 : 0);

export function moneyIso(usd: number, cur: Cur): string {
  const d = exactDec(cur);
  return cur + " " + (usd * RATES[cur]).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
}
