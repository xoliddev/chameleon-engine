import type { IndKey } from "./types";

/*
 * Numeric configuration for each industry "mode". All human text for these
 * (labels, option names, units, events) lives in messages/*.json under
 * industries.<key>.
 */

export type ChipsField = { t: "chips"; id: string; def: number; opts: { v: number; n?: string }[] };
export type RangeField = { t: "range"; id: string; min: number; max: number; step: number; def: number };
export type AddonsField = { t: "addons"; id: string; def: number[]; opts: { flat?: number; pct?: number; per?: string }[] };
export type Field = ChipsField | RangeField | AddonsField;
export type CalcValues = Record<string, number | number[]>;

export interface Industry {
  color: string;
  mono: string;
  biz: string;
  url: string;
  revBase: number;
  /** USD amount injected into each event string ({amount}), 0 = none */
  amounts: number[];
  fields: Field[];
  base: (s: CalcValues, o: (id: string) => number) => number;
  dep: number;
  perMonth?: boolean;
}

const num = (v: number | number[]) => v as number;

export const IND: Record<IndKey, Industry> = {
  service: {
    color: "#C8F45A", mono: "A", biz: "Atlas Advisory", url: "atlas-advisory.com", revBase: 48210,
    amounts: [0, 66, 0, 0, 0],
    fields: [
      { t: "chips", id: "svc", def: 1, opts: [{ v: 120, n: "h" }, { v: 220, n: "h" }, { v: 380, n: "h" }] },
      { t: "range", id: "hours", min: 1, max: 20, step: 1, def: 3 },
      { t: "addons", id: "add", def: [1], opts: [{ flat: 40 }, { flat: 150 }, { pct: 0.25 }] }
    ],
    base: (s, o) => o("svc") * num(s.hours),
    dep: 0.3
  },
  production: {
    color: "#FF8A4C", mono: "O", biz: "Oakline Furniture Co.", url: "oakline.co", revBase: 86440,
    amounts: [0, 2140, 0, 860, 0],
    fields: [
      { t: "chips", id: "mat", def: 1, opts: [{ v: 180, n: "m2" }, { v: 420, n: "m2" }, { v: 610, n: "m2" }] },
      { t: "range", id: "w", min: 80, max: 320, step: 10, def: 200 },
      { t: "range", id: "h", min: 60, max: 260, step: 10, def: 220 },
      { t: "addons", id: "add", def: [0, 2], opts: [{ flat: 90 }, { flat: 120 }, { flat: 150 }] }
    ],
    base: (s, o) => 150 + ((num(s.w) * num(s.h)) / 10000) * o("mat"),
    dep: 0.3
  },
  logistics: {
    color: "#4FD8F0", mono: "N", biz: "Northbound Freight", url: "northbound.cargo", revBase: 132900,
    amounts: [0, 1480, 0, 0, 0],
    fields: [
      { t: "chips", id: "mode", def: 0, opts: [{ v: 1, n: "×1" }, { v: 1.45, n: "×1.45" }, { v: 1.65, n: "×1.65" }] },
      { t: "range", id: "dist", min: 50, max: 3000, step: 50, def: 850 },
      { t: "range", id: "wt", min: 0.5, max: 20, step: 0.5, def: 6 },
      { t: "addons", id: "add", def: [1], opts: [{ pct: 0.03 }, { flat: 45 }, { flat: 120 }] }
    ],
    base: (s, o) => (90 + num(s.dist) * (0.62 + num(s.wt) * 0.085)) * o("mode"),
    dep: 0.2
  },
  saas: {
    color: "#B49CFF", mono: "P", biz: "Pulse Analytics", url: "pulse-analytics.io", revBase: 71350,
    amounts: [0, 725, 0, 0, 940],
    fields: [
      { t: "chips", id: "plan", def: 1, opts: [{ v: 12, n: "seat" }, { v: 29, n: "seat" }, { v: 59, n: "seat" }] },
      { t: "chips", id: "bill", def: 0, opts: [{ v: 1 }, { v: 0.8, n: "−20%" }] },
      { t: "range", id: "seats", min: 1, max: 200, step: 1, def: 25 },
      { t: "addons", id: "add", def: [], opts: [{ flat: 99 }, { flat: 8, per: "seats" }, { flat: 149 }] }
    ],
    base: (s, o) => num(s.seats) * o("plan") * o("bill"),
    dep: 1,
    perMonth: true
  }
};

export const IND_KEYS = Object.keys(IND) as IndKey[];
export const isIndKey = (k: unknown): k is IndKey => typeof k === "string" && k in IND;

export function defaultCalc(k: IndKey): CalcValues {
  return Object.fromEntries(IND[k].fields.map(f => [f.id, f.t === "addons" ? [...f.def] : f.def]));
}

export function quote(k: IndKey, s: CalcValues): number {
  const I = IND[k];
  const o = (id: string) => {
    const f = I.fields.find(x => x.id === id) as ChipsField;
    return f.opts[num(s[id])].v;
  };
  let flat = 0, pct = 0;
  I.fields.forEach(f => {
    if (f.t !== "addons") return;
    (s[f.id] as number[]).forEach(i => {
      const a = f.opts[i];
      if (a.pct) pct += a.pct;
      else flat += a.per ? (a.flat ?? 0) * num(s[a.per]) : a.flat ?? 0;
    });
  });
  return Math.round((I.base(s, o) + flat) * (1 + pct));
}

export type IndustryMessages = {
  name: string;
  short: string;
  headline: string;
  sub: string;
  cards: string[];
  events: string[];
  depLabel: string;
  fields: Record<string, { label: string; unit?: string; opts?: string[] }>;
};

export const fmtNum = (n: number) => (n % 1 ? n.toFixed(1) : n.toLocaleString("en-US"));

/** "Oak · 200 cm · 220 cm" in whichever language the messages are in. */
export function summary(k: IndKey, s: CalcValues, m: IndustryMessages): string {
  return IND[k].fields
    .filter(f => f.t !== "addons")
    .map(f => (f.t === "chips" ? m.fields[f.id].opts![num(s[f.id])] : `${fmtNum(num(s[f.id]))} ${m.fields[f.id].unit ?? ""}`.trim()))
    .join(" · ");
}
