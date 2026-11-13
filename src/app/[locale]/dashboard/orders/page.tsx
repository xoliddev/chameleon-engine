import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { LangLinks } from "@/components/app/AppChrome";
import { exactDec, money } from "@/lib/money";
import { getCurrentUser } from "@/server/auth";
import { listOrders } from "@/server/repo";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const user = (await getCurrentUser())!;
  const t = await getTranslations("app");
  const orders = await listOrders(user.id);
  const total = orders.filter(o => o.status === "succeeded").reduce((a, o) => a + o.amountUsd, 0);

  return (
    <>
      <div className="app-head">
        <div><h1>{t("orders")}</h1><p>{orders.length} · {money(total, "USD", locale, 2)}</p></div>
        <LangLinks />
      </div>
      <div className="card-w tbl-wrap">
        {orders.length === 0 ? <div className="empty-box">{t("empty_orders")}</div> : (
          <table className="tbl">
            <thead><tr><th>ID</th><th>{t("th_desc")}</th><th>{t("th_gateway")}</th><th>{t("th_amount")}</th><th>{t("th_mode")}</th><th>{t("th_status")}</th><th>{t("th_date")}</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: 12 }}>{o.id}{o.providerId && <><br /><small style={{ color: "#8A8C84" }}>{o.providerId}</small></>}</td>
                  <td>{o.description}</td>
                  <td>{o.gateway}</td>
                  <td><b>{money(o.amountUsd, o.currency, locale, exactDec(o.currency))}</b>{o.currency !== "USD" && <><br /><small style={{ color: "#8A8C84" }}>{money(o.amountUsd, "USD", locale, 2)}</small></>}</td>
                  <td><span className={`mode-tag ${o.mode === "live" ? "live" : ""}`}>{t(o.mode === "live" ? "mode_live" : "mode_test")}</span></td>
                  <td><span className={`st ${o.status === "succeeded" ? "won" : "lost"}`}>{o.status}</span></td>
                  <td style={{ color: "#8A8C84" }}>{new Date(o.createdAt).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
