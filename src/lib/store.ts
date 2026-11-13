"use client";

import { useSyncExternalStore } from "react";
import { IND, IND_KEYS, defaultCalc, isIndKey, type CalcValues } from "./industries";
import { isCur } from "./money";
import { hash, rng } from "./rng";
import type { Channels, Cur, IndKey, Intent, LeadStatus } from "./types";
import { DEFAULT_CHANNELS } from "./types";

/*
 * Tiny external store (useSyncExternalStore). It lives outside the React tree,
 * so switching locale (/ → /ru → /uz) keeps every lead, order and setting.
 */

export interface DemoLead { id: string; name: string; source: string; score: number; status: LeadStatus; time: string; ind: IndKey; fresh?: boolean }
export interface DemoOrder { id: string; item: string; gw: string; amount: number; ind: IndKey; time: string; fresh?: boolean }
export type TgMsg =
  | { id: string; kind: "lead"; time: string; biz: string; name: string; email: string; budget: number; score: number; intent: Intent; msg: string }
  | { id: string; kind: "paid"; time: string; biz: string; amount: number; gw: string; receipt: string };
export interface Receipt { id: string; gw: string; amount: number; date: number; item: string; ind: IndKey; providerId: string | null; mode: string }
export interface Checkout { phase: "form" | "proc" | "done"; amount: number; custom: string | null; customEn: string | null; sub: "pay_item_sub" | "pay_dep_sub"; receipt: Receipt | null }
export interface Toast { id: number; title: string; sub?: string; out?: boolean }

export interface State {
  hydrated: boolean;
  cur: Cur;
  ind: IndKey;
  calc: Record<IndKey, CalcValues>;
  visitors: number;
  checkout: Checkout;
  gw: string | null;
  leads: DemoLead[];
  orders: DemoOrder[];
  tg: TgMsg[];
  cms: Partial<Record<IndKey, { h?: string; s?: string }>>;
  integrations: Channels;
  rev: Record<IndKey, number>;
  spark: Record<IndKey, number[]>;
  toasts: Toast[];
}

export const freshCheckout = (): Checkout => ({ phase: "form", amount: 1, custom: null, customEn: null, sub: "pay_item_sub", receipt: null });

function initialSpark(k: IndKey) {
  const r = rng(hash(k));
  let v = 50;
  return Array.from({ length: 26 }, () => (v += (r() - 0.38) * 14));
}

const initial: State = {
  hydrated: false,
  cur: "USD",
  ind: "service",
  calc: Object.fromEntries(IND_KEYS.map(k => [k, defaultCalc(k)])) as Record<IndKey, CalcValues>,
  visitors: 4000,
  checkout: freshCheckout(),
  gw: null,
  leads: [],
  orders: [],
  tg: [],
  cms: {},
  integrations: { ...DEFAULT_CHANNELS },
  rev: Object.fromEntries(IND_KEYS.map(k => [k, IND[k].revBase])) as Record<IndKey, number>,
  spark: Object.fromEntries(IND_KEYS.map(k => [k, initialSpark(k)])) as Record<IndKey, number[]>,
  toasts: []
};

let state = initial;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

export const getState = () => state;
export function setState(patch: Partial<State> | ((s: State) => Partial<State>)) {
  const p = typeof patch === "function" ? patch(state) : patch;
  state = { ...state, ...p };
  if ("cur" in p || "ind" in p) persist();
  listeners.forEach(l => l());
}
export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(initial));
}

/* ---------- persistence of preferences ---------- */
function persist() {
  try { localStorage.setItem("ce_prefs", JSON.stringify({ cur: state.cur, ind: state.ind })); } catch { /* storage blocked */ }
}
export function hydrate() {
  if (state.hydrated) return;
  let saved: { cur?: unknown; ind?: unknown } = {};
  try { saved = JSON.parse(localStorage.getItem("ce_prefs") || "{}"); } catch { /* ignore */ }
  setState({ hydrated: true, cur: isCur(saved.cur) ? saved.cur : state.cur, ind: isIndKey(saved.ind) ? saved.ind : state.ind });
}

/* ---------- actions ---------- */
export const clock = (d = new Date()) => d.toTimeString().slice(0, 5);
export const clockS = (d = new Date()) => d.toTimeString().slice(0, 8);

export function setIndustry(k: IndKey) {
  if (k === state.ind) return;
  setState(s => ({ ind: k, checkout: s.checkout.phase === "proc" ? s.checkout : freshCheckout() }));
}

export function addRevenue(usd: number, k: IndKey = state.ind) {
  setState(s => {
    const sp = [...s.spark[k]];
    sp.push(sp[sp.length - 1] + 3 + Math.random() * 9);
    sp.shift();
    return { rev: { ...s.rev, [k]: s.rev[k] + usd }, spark: { ...s.spark, [k]: sp } };
  });
}

export function setCalc(k: IndKey, id: string, v: number | number[]) {
  setState(s => ({ calc: { ...s.calc, [k]: { ...s.calc[k], [id]: v } } }));
}

let toastSeq = 0;
export function toast(title: string, sub?: string) {
  const id = ++toastSeq;
  setState(s => ({ toasts: [...s.toasts, { id, title, sub }] }));
  setTimeout(() => setState(s => ({ toasts: s.toasts.map(t => (t.id === id ? { ...t, out: true } : t)) })), 3600);
  setTimeout(() => setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
}

export function pushTg(m: TgMsg) {
  setState(s => ({ tg: [...s.tg, m].slice(-12) }));
}

export function clearFresh() {
  setTimeout(() => setState(s => ({ leads: s.leads.map(l => ({ ...l, fresh: false })), orders: s.orders.map(o => ({ ...o, fresh: false })) })), 2600);
}
