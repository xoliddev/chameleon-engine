import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { DeleteLead, LangLinks, LeadStatusSelect } from "@/components/app/AppChrome";
import { money } from "@/lib/money";
import type { LeadStatus } from "@/lib/types";
import { getCurrentUser } from "@/server/auth";
import { listLeads } from "@/server/repo";

const STATUSES: LeadStatus[] = ["new", "qual", "won", "lost"];
const BUDGET_LABEL = (usd: number, locale: string) => usd >= 15000 ? money(10000, "USD", locale) + "+" : "~" + money(usd, "USD", locale);

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export default async function LeadsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ status?: string; q?: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as LeadStatus) ? (sp.status as LeadStatus) : undefined;
  const q = (sp.q ?? "").slice(0, 80);
  const user = (await getCurrentUser())!;
  const t = await getTranslations("app");
  const ti = await getTranslations("ui");
  const leads = await listLeads(user.id, { status, q: q || undefined });
  const qs = (st?: string) => ({ pathname: "/dashboard/leads", query: { ...(st ? { status: st } : {}), ...(q ? { q } : {}) } });

  return (
    <>
      <div className="app-head">
        <div><h1>{t("leads")}</h1><p>{leads.length} · SQLite</p></div>
        <LangLinks />
      </div>
      <div className="toolbar">
        <form method="get" style={{ display: "flex", gap: 8 }}>
          {status && <input type="hidden" name="status" value={status} />}
          <input name="q" defaultValue={q} placeholder={t("search_ph")} aria-label={t("search_ph")} />
        </form>
        <div className="pills">
          <Link href={qs()} className={!status ? "on" : ""}>{t("all")}</Link>
          {STATUSES.map(s => <Link key={s} href={qs(s)} className={status === s ? "on" : ""}>{t(`status_${s}`)}</Link>)}
        </div>
        <a className="abtn ghost" href="/api/leads/export" style={{ marginLeft: "auto" }}>⤓ {t("export_csv")}</a>
      </div>
      <div className="card-w tbl-wrap">
        {leads.length === 0 ? <div className="empty-box">{t("empty_leads")}</div> : (
          <table className="tbl">
            <thead><tr><th>{t("th_name")}</th><th>{t("th_budget")}</th><th>{t("th_score")}</th><th>{t("th_intent")}</th><th>{t("th_source")}</th><th>{t("th_status")}</th><th>{t("th_date")}</th><th /></tr></thead>
            <tbody>
              {leads.map(l => (
                <tr key={l.id}>
                  <td><b>{l.name}</b><br /><small style={{ color: "#8A8C84" }}>{l.email}</small>{l.message && <div className="msg" style={{ maxWidth: 280, whiteSpace: "normal", color: "#6B6D66", fontSize: 12.5, marginTop: 2 }}>“{l.message}”</div>}</td>
                  <td>{BUDGET_LABEL(l.budgetUsd, locale)}</td>
                  <td className="score">{l.score}</td>
                  <td>{ti(l.intent)}</td>
                  <td>{l.source}</td>
                  <td><LeadStatusSelect id={l.id} status={l.status} /></td>
                  <td style={{ color: "#8A8C84" }}>{new Date(l.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td><DeleteLead id={l.id} name={l.name} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
