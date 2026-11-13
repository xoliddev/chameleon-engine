export type Region = "global" | "cis" | "uz";
export type GwMode = "card" | "wallet" | "phone" | "crypto";
export interface Gateway { id: string; name: string; mode: GwMode; c: string; l: string }

export const REGION_BY_LOCALE: Record<string, Region> = { en: "global", ru: "cis", uz: "uz" };

export const GW: Record<Region, Gateway[]> = {
  global: [
    { id: "stripe", name: "Stripe", mode: "card", c: "#8A84FF", l: "#635BFF" },
    { id: "paypal", name: "PayPal", mode: "wallet", c: "#4D9CFF", l: "#003087" },
    { id: "applepay", name: "Apple Pay", mode: "wallet", c: "#FFFFFF", l: "#000000" },
    { id: "gpay", name: "Google Pay", mode: "wallet", c: "#E8EAED", l: "#3C4043" },
    { id: "lemon", name: "LemonSqueezy", mode: "card", c: "#FFC233", l: "#B07800" },
    { id: "usdt", name: "USDT", mode: "crypto", c: "#26A17B", l: "#1B7F60" }
  ],
  cis: [
    { id: "yookassa", name: "ЮKassa", mode: "card", c: "#A98BFF", l: "#5B2EE0" },
    { id: "robokassa", name: "Robokassa", mode: "card", c: "#2FC6F6", l: "#0E87B0" },
    { id: "cloudpay", name: "CloudPayments", mode: "card", c: "#5AA2FF", l: "#1E5FC2" },
    { id: "stripe", name: "Stripe", mode: "card", c: "#8A84FF", l: "#635BFF" },
    { id: "usdt", name: "USDT", mode: "crypto", c: "#26A17B", l: "#1B7F60" },
    { id: "sbp", name: "СБП", mode: "phone", c: "#FF6A3D", l: "#D9481C" }
  ],
  uz: [
    { id: "payme", name: "Payme", mode: "phone", c: "#33CCCC", l: "#11A3A3" },
    { id: "click", name: "Click", mode: "phone", c: "#2D9BFF", l: "#0065D1" },
    { id: "uzum", name: "Uzum Bank", mode: "phone", c: "#A06BFF", l: "#7000FF" },
    { id: "visa", name: "Visa / MC", mode: "card", c: "#F7B600", l: "#1A1F71" },
    { id: "humo", name: "Humo / Uzcard", mode: "card", c: "#3DDC97", l: "#0A8F5A" },
    { id: "applepay", name: "Apple Pay", mode: "wallet", c: "#FFFFFF", l: "#000000" }
  ]
};

export const ALL_GATEWAYS: Record<string, string> = Object.fromEntries(
  Object.values(GW).flat().map(g => [g.id, g.name])
);
