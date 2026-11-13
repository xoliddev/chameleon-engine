import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { Copy, DashChart, LangLinks } from "@/components/app/AppChrome";
import { SITE_URL } from "@/lib/config";
import { money } from "@/lib/money";
import { getCurrentUser } from "@/server/auth";
import { getIntegrations, listLeads, stats } from "@/server/repo";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export default async function Overview({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const user = (await getCurrentUser())!;
  const t = await getTranslations("app");
  const ti = await getTranslations("ui");
  const [s, recent, integ, apiLeads] = await Promise.all([
    stats(user.id),
    listLeads(user.id, { limit: 6 }),
    getIntegrations(user.id),
    listLeads(user.id, { q: undefined, limit: 1000 }).then(l => l.some(x => x.source === "API"))
  ]);
  const usd = (n: number) => money(n, "USD", locale, 0);
  const fmtDate = (ms: number) => new Date(ms).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  const steps = [
    { done: !!((integ.telegramToken && integ.telegramChatId) || integ.slackWebhook || integ.webhookUrl), label: t("step_telegram"), href: "/dashboard/settings" },
    { done: s.leads > 0 || recent.length > 0, label: t("step_lead"), href: "/#automation" },
    { done: s.orders > 0, label: t("step_payment"), href: "/#payments" },
    { done: apiLeads, label: t("step_key"), href: "/dashboard/settings" }
  ];
  const curl = `curl -X POST ${SITE_URL}/api/leads \\
  -H "content-type: application/json" \\
  -H "x-api-key: ${user.publicKey}" \\
  -d '{"name":"Jane Doe","email":"jane@acme.com","budget":2,"message":"Ready to order this week"}'`;

  return (
    <>
      <div className="app-head">
        <div><h1>{t("greeting", { name: user.name.split(" ")[0] })} 👋</h1><p>{t("overview_sub")}</p></div>
        <LangLinks />
      </div>

      <div className="kpis">
        <div className="kpi"><small>{t("kpi_revenue")}</small><b>{usd(s.revenue)}</b></div>
        <div className="kpi"><small>{t("kpi_leads")}</small><b>{s.leads}</b></div>
        <div className="kpi"><small>{t("kpi_win")}</small><b>{(s.winRate * 100).toFixed(1)}%</b></div>
        <div className="kpi"><small>{t("kpi_score")}</small><b>{s.avgScore || "—"}</b></div>
        <div className="kpi"><small>{t("kpi_aov")}</small><b>{s.orders ? usd(s.aov) : "—"}</b></div>
      </div>

      <div className="app-grid">
        <div className="app-stack">
          <div className="card-w"><h3>{t("chart_title")}<span className="mode-tag">USD</span></h3><DashChart data={s.series} /></div>
          <div className="card-w">
            <h3>{t("endpoint_title")}<Copy text={curl}>Copy</Copy></h3>
            <p style={{ color: "#6B6D66", fontSize: 13.5, margin: "-6px 0 12px" }}>{t("endpoint_sub")}</p>
            <div className="codebox">{curl}</div>
          </div>
        </div>
        <div className="app-stack">
          <div className="card-w">
            <h3>{t("getting_started")}<span className="mode-tag live">{steps.filter(x => x.done).length}/4</span></h3>
            <ul className="steps">
              {steps.map(st => (
                <li key={st.label} className={st.done ? "done" : ""}><i>{st.done ? "✓" : ""}</i><span>{st.label}</span>{!st.done && <Link href={st.href}>→</Link>}</li>
              ))}
            </ul>
          </div>
          <div className="card-w">
            <h3>{t("recent_leads")}<Link href="/dashboard/leads">{t("view_all")}</Link></h3>
            {recent.length === 0 ? <div className="empty-box">{t("empty_leads")}</div> : (
              <div className="mini-list">
                {recent.map(l => (
                  <div key={l.id}>
                    <span><b>{l.name}</b><br /><small style={{ color: "#8A8C84" }}>{l.email} · {fmtDate(l.createdAt)}</small></span>
                    <span><b className="score">{l.score}</b> <span className={`st ${l.status}`}>{t(`status_${l.status}`)}</span><br /><small style={{ color: "#8A8C84" }}>{ti(l.intent)}</small></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
