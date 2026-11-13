"use client";

import { useTranslations } from "next-intl";
import { useMoney } from "@/lib/hooks";
import { useStore } from "@/lib/store";

export function StatusPill() {
  const t = useTranslations("ui");
  const { m } = useMoney();
  const leads = useStore(s => s.leads.length);
  const orders = useStore(s => s.orders);
  const captured = 1240 + orders.reduce((a, o) => a + o.amount, 0);
  return (
    <div className="status">
      <i />
      <span><b>{t("status_online")}</b> · {3 + leads} {t("status_leads")} · {m(captured)} {t("status_cap")}</span>
    </div>
  );
}

export function Toasts() {
  const toasts = useStore(s => s.toasts);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.out ? "out" : ""}`}>
          <i>✓</i>
          <div><b>{t.title}</b>{t.sub && <span>{t.sub}</span>}</div>
        </div>
      ))}
    </div>
  );
}
