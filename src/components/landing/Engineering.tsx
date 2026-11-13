"use client";

import { useTranslations } from "next-intl";
import { useInView } from "@/lib/hooks";
import { CountUp } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

/* Real Lighthouse 12 results measured on the live site (chameleonengine.vercel.app, 2026-10-23). Re-measure after big changes. */
const GAUGES: [string, number][] = [["g_perf", 95], ["g_a11y", 100], ["g_bp", 100], ["g_seo", 100]];
const VITALS: [string, string][] = [["LCP", "1.0s"], ["CLS", "0.00"], ["TBT", "0ms"], ["TTFB", "250ms"]];
const MOBILE = "85 · 100 · 100 · 100";
const STACK = ["Next.js 15", "TypeScript", "next-intl", "React 19", "Server Actions", "SQLite (node:sqlite)", "scrypt + sessions", "AES-256-GCM", "Stripe API", "Telegram Bot API", "Vercel / Node", "Zero UI deps"];

export default function Engineering() {
  const t = useTranslations("ui");
  const [ref, seen] = useInView<HTMLDivElement>();
  return (
    <section className="sec" id="engineering">
      <div className="wrap">
        <SecHeadClient k="engx_kicker" title="engx_title" sub="engx_sub" />
        <div ref={ref} className={`engx reveal ${seen ? "in" : ""}`}>
          <div className="panel gauges-panel">
            <div className="gauges">
              {GAUGES.map(([k, v]) => (
                <div className="gauge" key={k}>
                  <div className="gauge-num">
                    <svg viewBox="0 0 100 100"><circle className="g-bg" cx="50" cy="50" r="45" /><circle className="g-fg" cx="50" cy="50" r="45" style={seen ? { strokeDashoffset: 283 * (1 - v / 100) } : undefined} /></svg>
                    <b>{seen ? <CountUp to={v} dur={1600} /> : 0}</b>
                  </div>
                  <span>{t(k)}</span>
                </div>
              ))}
            </div>
            <div className="vitals">
              {VITALS.map(([k, v]) => <div key={k}><small>{k}</small><b>{v}</b><i className="ok" /></div>)}
            </div>
            <p className="mono" style={{ marginBottom: 18 }}>{t("engx_measured")} · desktop · mobile (4G): {MOBILE}</p>
            <a className="link-arrow" href="https://pagespeed.web.dev/" target="_blank" rel="noopener">{t("engx_check")}</a>
          </div>
          <div className="panel code-panel">
            <div className="code-head"><span>src/server/payments.ts</span><em>{t("engx_adapter")}</em></div>
            <pre className="code"><code>
              <span className="k">interface</span> <span className="ty">PaymentService</span> {"{\n"}
              {"  "}<span className="f">charge</span>(req: <span className="ty">ChargeRequest</span>): <span className="ty">Promise</span>&lt;<span className="ty">ChargeResult</span>&gt;{"\n}\n\n"}
              <span className="c">{"// region-aware: same business logic, any gateway"}</span>{"\n"}
              <span className="k">export function</span> <span className="f">pickAdapter</span>(id: <span className="ty">string</span>) {"{\n"}
              {"  "}<span className="k">if</span> (id === <span className="p">&quot;stripe&quot;</span> && key) <span className="k">return new</span> <span className="ty">StripeTestAdapter</span>(key){"\n"}
              {"  "}<span className="k">return new</span> <span className="ty">SandboxAdapter</span>(id) <span className="c">{"// Payme, Click, ЮKassa…"}</span>{"\n}\n\n"}
              <span className="k">const</span> res = <span className="k">await</span> <span className="f">pickAdapter</span>(gw).<span className="f">charge</span>(order){"\n"}
              repo.<span className="f">insertOrder</span>(user?.id, res) <span className="c">{"// ✓ SQLite + Telegram + invoice"}</span>
            </code></pre>
            <div className="stack">{STACK.map(s => <span key={s}>{s}</span>)}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
