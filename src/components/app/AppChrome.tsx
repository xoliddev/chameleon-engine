"use client";

import { useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { money } from "@/lib/money";
import { RevenueChart } from "../landing/DemoDashboard";
import { setLeadStatusAction, deleteLeadAction } from "@/server/actions/app";
import type { LeadStatus } from "@/lib/types";

const NAV = [
  { href: "/dashboard", key: "overview", d: "M3 13h8V3H3zM13 21h8V11h-8zM3 21h8v-6H3zM13 3v6h8V3z" },
  { href: "/dashboard/leads", key: "leads", d: "M9 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c0-4 3-6 7-6s7 2 7 6M17 11l2 2 4-4" },
  { href: "/dashboard/orders", key: "orders", d: "M3 6h18l-2 12H5zM8 6V4h8v2" },
  { href: "/dashboard/settings", key: "settings", d: "M4 7h10M18 7h2M4 17h2M10 17h10M14 7a2 2 0 1 0 4 0 2 2 0 0 0-4 0M6 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0" }
] as const;

export function AppNav({ counts }: { counts: { leads: number; orders: number } }) {
  const t = useTranslations("app");
  const path = usePathname();
  return (
    <nav className="app-nav">
      {NAV.map(n => {
        const on = n.href === "/dashboard" ? path === "/dashboard" : path.startsWith(n.href);
        const c = n.key === "leads" ? counts.leads : n.key === "orders" ? counts.orders : 0;
        return (
          <Link key={n.href} href={n.href} className={on ? "on" : ""}>
            <svg viewBox="0 0 24 24"><path d={n.d} /></svg>{t(n.key)}
            {c > 0 && <em className="badge" style={{ marginLeft: "auto", fontStyle: "normal", fontFamily: "var(--mono)", fontSize: 11 }}>{c}</em>}
          </Link>
        );
      })}
    </nav>
  );
}

export function LangLinks() {
  const locale = useLocale();
  const path = usePathname();
  return (
    <div className="app-langs">
      {routing.locales.map(l => <Link key={l} href={path} locale={l} className={l === locale ? "on" : ""}>{l.toUpperCase()}</Link>)}
    </div>
  );
}

export function DashChart({ data }: { data: number[] }) {
  const locale = useLocale();
  return <RevenueChart data={data} locale={locale} fmt={n => money(n, "USD", locale, 0)} height={240} />;
}

export function LeadStatusSelect({ id, status }: { id: string; status: LeadStatus }) {
  const t = useTranslations("app");
  const [v, setV] = useState(status);
  return (
    <select className="status-sel" value={v} aria-label={t("th_status")}
      onChange={e => { const s = e.target.value as LeadStatus; setV(s); setLeadStatusAction(id, s); }}>
      {(["new", "qual", "won", "lost"] as const).map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
    </select>
  );
}

export function DeleteLead({ id, name }: { id: string; name: string }) {
  const t = useTranslations("app");
  return (
    <button className="iconbtn" title={t("delete")} aria-label={`${t("delete")} ${name}`}
      onClick={() => { if (confirm(`${t("delete")}: ${name}?`)) deleteLeadAction(id); }}>
      <svg viewBox="0 0 20 20"><path d="M5 6h10M8 6V4h4v2M6 6l1 11h6l1-11" /></svg>
    </button>
  );
}

export function Copy({ text, children }: { text: string; children?: ReactNode }) {
  const [done, setDone] = useState(false);
  return (
    <button className="abtn ghost" type="button" onClick={() => navigator.clipboard?.writeText(text).then(() => { setDone(true); setTimeout(() => setDone(false), 1500); })}>
      {done ? "✓" : children ?? "Copy"}
    </button>
  );
}
