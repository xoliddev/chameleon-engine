"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IND, quote, summary, type IndustryMessages } from "@/lib/industries";
import { useMoney, useMounted } from "@/lib/hooks";
import { hash, rid, rng } from "@/lib/rng";
import { setState, toast, useStore } from "@/lib/store";
import { CHANNEL_KEYS, CHANNEL_NAMES, type IndKey, type LeadStatus, type PublicUser } from "@/lib/types";
import { Reveal } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

const NAMES = ["Emily Carter", "Jonas Weber", "Aziza Karimova", "Dmitry Orlov", "Olivia Brown", "Mateo Rossi", "Sophie Martin", "Bekzod Tursunov", "Liam O'Connor", "Anna Petrova", "Noah Fischer", "Madina Yusupova"];
const SOURCES = ["Calculator", "Booking", "Google Ads", "Instagram", "Telegram", "Referral"];
const GWS = ["Stripe", "PayPal", "Apple Pay", "Payme", "Click", "ЮKassa", "Uzum Bank"];
const TABS = ["overview", "leads", "orders", "cms", "settings"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = { overview: "d_overview", leads: "d_leads", orders: "d_orders", cms: "d_cms", settings: "d_settings" };
const TAB_ICON: Record<Tab, string> = {
  overview: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z",
  leads: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c0-4 3-6 7-6s7 2 7 6M17 11l2 2 4-4",
  orders: "M3 6h18l-2 12H5zM8 6V4h8v2",
  cms: "M4 20h4L19 9l-4-4L4 16zM13 7l4 4",
  settings: "M4 7h10M18 7h2M4 17h2M10 17h10M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0"
};
const DEST_NAMES = CHANNEL_NAMES;
const DEST_DESC = { telegram: "Bot API · instant", slack: "Incoming webhook · #sales", webhook: "Sheets, HubSpot, email, 6000+ apps" };

function seed(k: IndKey) {
  const r = rng(hash(k) + 99);
  const leads = Array.from({ length: 8 }, (_, i) => ({
    id: "seed" + i, name: NAMES[Math.floor(r() * NAMES.length)], source: SOURCES[Math.floor(r() * SOURCES.length)],
    score: 52 + Math.floor(r() * 46), status: (["won", "qual", "new", "qual"] as LeadStatus[])[Math.floor(r() * 4)],
    time: `${String(Math.max(0, 9 - i)).padStart(2, "0")}:${String(Math.floor(r() * 60)).padStart(2, "0")}`
  }));
  const orders = Array.from({ length: 6 }, (_, i) => ({
    id: "ch_" + rid(r), card: Math.floor(r() * 3), gw: GWS[Math.floor(r() * GWS.length)],
    amount: Math.round(IND[k].revBase / (22 + r() * 30)), time: `${String(Math.max(0, 8 - i)).padStart(2, "0")}:00`
  }));
  let v = 0.6;
  const chart = Array.from({ length: 30 }, (_, i) => { v += (r() - 0.4) * 0.22; return Math.max(0.25, v) * (0.75 + i / 60); });
  const sum = chart.reduce((a, b) => a + b, 0);
  return { leads, orders, chart: chart.map(c => (c / sum) * IND[k].revBase), leadsBase: 96 + (Math.abs(hash(k)) % 70), orderCount: 34 + (Math.abs(hash(k)) % 40) };
}

export default function DemoDashboard({ user }: { user: PublicUser | null }) {
  const t = useTranslations("ui");
  const ta = useTranslations("app");
  const tAuth = useTranslations("auth");
  const [view, setView] = useState<"client" | "admin">("client");
  const ind = useStore(s => s.ind);
  const I = IND[ind];
  return (
    <section className="sec" id="dashboard">
      <div className="wrap">
        <SecHeadClient k="dash_kicker" title="dash_title" sub="dash_sub" />
        <Reveal className={`view-toggle ${view === "admin" ? "admin" : ""}`}>
          <button className={view === "client" ? "on" : ""} onClick={() => setView("client")}>{t("dash_client")}</button>
          <button className={view === "admin" ? "on" : ""} onClick={() => setView("admin")}>{t("dash_admin")}</button>
          <span className="vt-ind" />
        </Reveal>
        <Reveal className={`device ${view === "admin" ? "admin" : ""}`}>
          <div className="device-bar"><span /><span /><span /><div className="url">https://{I.url}{view === "admin" ? "/admin" : ""}</div></div>
          <div className="device-screen">
            <div className="v-client"><ClientSite /></div>
            <div className="v-admin"><Admin onView={() => setView("client")} /></div>
          </div>
        </Reveal>
        <div className="real-cta">
          <p>{user ? ta("landing_logged", { name: user.name }) : <><b>{ta("landing_cta")}</b><br />{ta("landing_cta_sub")}</>}</p>
          <Link className="btn btn-acc sm" href={user ? "/dashboard" : "/signup"}>{user ? tAuth("nav_dashboard") : tAuth("nav_signup")} →</Link>
        </div>
      </div>
    </section>
  );
}

function ClientSite() {
  const t = useTranslations("ui");
  const tm = useTranslations("misc");
  const ind = useStore(s => s.ind);
  const cms = useStore(s => s.cms[s.ind]);
  const calc = useStore(s => s.calc[s.ind]);
  const im = useTranslations("industries").raw(ind) as IndustryMessages;
  const pains = useTranslations().raw("pains") as { n: string }[];
  const { m } = useMoney();
  const I = IND[ind];
  const total = quote(ind, calc);
  return (
    <>
      <div className="mini-nav">
        <b><span className="ec-logo sm">{I.mono}</span>{I.biz}</b>
        <nav>{im.cards.map(c => <span key={c}>{c}</span>)}</nav>
        <span className="btn btn-acc sm">{t("mini_cta")}</span>
      </div>
      <div className="mini-hero">
        <div>
          <h3>{cms?.h || im.headline}</h3>
          <p>{cms?.s || im.sub}</p>
          <span className="btn btn-acc sm">{t("mini_cta")} →</span>
        </div>
        <div className="mini-widget">
          <div className="mw-row"><span>{t("calc_total")}</span><b>{I.biz}</b></div>
          <div className="mw-total">{m(total)}{I.perMonth && <small style={{ fontSize: 14, color: "var(--muted)" }}>{tm("perMonth")}</small>}</div>
          <div className="mw-row"><span>{summary(ind, calc, im)}</span></div>
          <div className="mini-bar"><i /></div>
          <div className="mw-row"><span>{im.depLabel}</span><b>{m(total * I.dep)}</b></div>
          <span className="btn btn-acc sm" style={{ width: "100%" }}>{t("calc_book")}</span>
        </div>
      </div>
      <div className="mini-cards">
        {im.cards.map((c, i) => <div key={c}><b>{c}</b>{pains[i].n.split(".")[0]}.</div>)}
      </div>
    </>
  );
}

function Admin({ onView }: { onView: () => void }) {
  const t = useTranslations("ui");
  const tm = useTranslations("misc");
  const locale = useLocale();
  const mounted = useMounted();
  const [tab, setTab] = useState<Tab>("overview");
  const ind = useStore(s => s.ind);
  const rev = useStore(s => s.rev[s.ind]);
  const userLeads = useStore(s => s.leads);
  const userOrders = useStore(s => s.orders);
  const cms = useStore(s => s.cms[s.ind]);
  const integrations = useStore(s => s.integrations);
  const im = useTranslations("industries").raw(ind) as IndustryMessages;
  const { m, exact, cur } = useMoney();
  const I = IND[ind];
  const sd = useMemo(() => seed(ind), [ind]);
  const leads = [...userLeads.filter(l => l.ind === ind), ...sd.leads];
  const myOrders = userOrders.filter(o => o.ind === ind);
  const orders = [...myOrders.map(o => ({ ...o, card: -1 })), ...sd.orders.map(o => ({ ...o, item: "", fresh: false }))];
  const badge = (s: LeadStatus) => <span className={`st ${s}`}>{t(`st_${s === "lost" ? "new" : s}`)}</span>;
  const date = mounted ? new Date().toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" }) : "";
  const head = (title: string, sub?: string) => (
    <div className="adm-h"><div><h4>{title}</h4>{sub && <small>{sub}</small>}</div><span className="pill">{date}</span></div>
  );
  const headline = cms?.h ?? im.headline, sub = cms?.s ?? im.sub;

  return (
    <>
      <aside className="adm-side">
        <div className="adm-logo"><span className="ec-logo sm">{I.mono}</span><span>{I.biz}</span></div>
        {TABS.map(k => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)} aria-label={t(TAB_LABEL[k])}>
            <svg viewBox="0 0 24 24"><path d={TAB_ICON[k]} /></svg><span>{t(TAB_LABEL[k])}</span>
            {k === "leads" && <em className="badge">{leads.length}</em>}
            {k === "orders" && <em className="badge">{orders.length}</em>}
          </button>
        ))}
        <div className="adm-user"><i /><span>{tm("owner")} · {locale.toUpperCase()}</span></div>
      </aside>
      <div className="adm-main" key={tab}>
        {tab === "overview" && (
          <>
            {head(`${t("d_hello")}, ${I.biz.split(" ")[0]} 👋`, t("d_today"))}
            <div className="kpis">
              <div className="kpi"><small>{t("k_rev")}</small><b>{m(rev)}</b><em>+18.2%</em></div>
              <div className="kpi"><small>{t("k_leads")}</small><b>{sd.leadsBase + userLeads.filter(l => l.ind === ind).length}</b><em>+{12 + userLeads.length}%</em></div>
              <div className="kpi"><small>{t("k_conv")}</small><b>3.{4 + (userLeads.length % 5)}%</b><em>+2.1pp</em></div>
              <div className="kpi"><small>{t("k_aov")}</small><b>{m(rev / (sd.orderCount + myOrders.length))}</b><em>+6.4%</em></div>
            </div>
            <div className="adm-grid">
              <div className="card-w"><h5>{t("d_chart")}<span>{cur}</span></h5>
                <RevenueChart data={sd.chart.map((v, i) => (i === 29 ? v + myOrders.reduce((a, o) => a + o.amount, 0) : v))} locale={locale} fmt={m} />
              </div>
              <div className="card-w"><h5>{t("d_recent")}<span>AI</span></h5>
                <div className="mini-list">
                  {leads.slice(0, 5).map(l => (
                    <div key={l.id} className={"fresh" in l && l.fresh ? "fresh" : ""}>
                      <span>{l.name}<br /><small style={{ color: "#8A8C84" }}>{tm(`sources.${l.source}`)} · {l.time}</small></span>
                      <span><b className="score">{l.score}</b> {badge(l.status)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
        {tab === "leads" && (
          <>
            {head(t("d_leads"), t("set_hint"))}
            <div className="card-w"><table className="tbl"><thead><tr><th>{t("th_name")}</th><th>{t("th_source")}</th><th>{t("th_score")}</th><th>{t("th_status")}</th><th /></tr></thead>
              <tbody>{leads.map(l => (
                <tr key={l.id} className={"fresh" in l && l.fresh ? "fresh" : ""}><td><b>{l.name}</b></td><td>{tm(`sources.${l.source}`)}</td><td className="score">{l.score}</td><td>{badge(l.status)}</td><td style={{ color: "#8A8C84" }}>{l.time}</td></tr>
              ))}</tbody></table></div>
          </>
        )}
        {tab === "orders" && (
          <>
            {head(t("d_orders"))}
            <div className="card-w"><table className="tbl"><thead><tr><th>ID</th><th>{t("th_item")}</th><th>{t("th_gw")}</th><th>{t("th_amount")}</th><th>{t("th_status")}</th></tr></thead>
              <tbody>{orders.map(o => (
                <tr key={o.id} className={o.fresh ? "fresh" : ""}><td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{o.id}</td><td>{o.item || im.cards[o.card]}</td><td>{o.gw}</td><td><b>{exact(o.amount)}</b></td><td>{badge("won")}</td></tr>
              ))}</tbody></table>
              {myOrders.length === 0 && <p className="empty">{t("d_empty")}</p>}
            </div>
          </>
        )}
        {tab === "cms" && (
          <>
            {head(t("d_cms"))}
            <div className="cms">
              <label htmlFor="cmsH">{t("cms_label")}</label>
              <input id="cmsH" value={headline} onChange={e => setState(s => ({ cms: { ...s.cms, [ind]: { ...s.cms[ind], h: e.target.value } } }))} />
              <label htmlFor="cmsS">{t("cms_sub_label")}</label>
              <textarea id="cmsS" rows={2} value={sub} onChange={e => setState(s => ({ cms: { ...s.cms, [ind]: { ...s.cms[ind], s: e.target.value } } }))} />
              <label>{t("cms_preview")}</label>
              <div className="cms-preview">{headline}<div style={{ fontSize: 14, fontWeight: 400, color: "#9C9E95", marginTop: 8 }}>{sub}</div></div>
              <div className="cms-actions">
                <button className="pri" onClick={() => toast(t("toast_cms"), t("toast_cms_sub"))}>{t("cms_publish")}</button>
                <button className="sec2" onClick={onView}>{t("cms_view")} →</button>
              </div>
            </div>
          </>
        )}
        {tab === "settings" && (
          <>
            {head(t("d_settings"), t("set_hint"))}
            <div className="toggles">
              {CHANNEL_KEYS.map(k => (
                <div className="tg" key={k}>
                  <div><b>{DEST_NAMES[k]}</b><small>{DEST_DESC[k]}</small></div>
                  <button className={`sw-t ${integrations[k] ? "on" : ""}`} aria-label={DEST_NAMES[k]} aria-pressed={integrations[k]}
                    onClick={() => setState(s => ({ integrations: { ...s.integrations, [k]: !s.integrations[k] } }))} />
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export function RevenueChart({ data, locale, fmt, height = 270 }: { data: number[]; locale: string; fmt: (n: number) => string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data) * 1.15;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * 600, 180 - (v / max) * 165]);
  const line = "M" + pts.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L");
  const day = (i: number) => new Date(Date.now() - (data.length - 1 - i) * 864e5).toLocaleDateString(locale, { day: "numeric", month: "short" });
  return (
    <div className="chart-wrap"
      onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.round(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * (data.length - 1))); }}
      onMouseLeave={() => setHover(null)}>
      <svg className="chart" viewBox="0 0 600 190" preserveAspectRatio="none" style={{ height }}>
        <defs><linearGradient id="chG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--acc)", stopOpacity: 0.55 }} /><stop offset="1" style={{ stopColor: "var(--acc)", stopOpacity: 0 }} /></linearGradient></defs>
        {[45, 90, 135].map(y => <line key={y} x1={0} x2={600} y1={y} y2={y} stroke="#ECEBE4" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
        <path d={`${line} L600,190 L0,190 Z`} fill="url(#chG)" />
        <path d={line} fill="none" stroke="#151614" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      {hover !== null && (
        <>
          <div className="chart-line" style={{ left: `${(pts[hover][0] / 600) * 100}%`, opacity: 0.25 }} />
          <div className="chart-tip" style={{ left: `${(pts[hover][0] / 600) * 100}%`, top: `${(pts[hover][1] / 190) * 100}%`, opacity: 1 }}>{day(hover)} · {fmt(data[hover])}</div>
        </>
      )}
    </div>
  );
}
