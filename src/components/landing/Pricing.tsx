"use client";

import { useTranslations } from "next-intl";
import { FIVERR_URL } from "@/lib/config";
import { useMoney } from "@/lib/hooks";
import { Reveal } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

const PLANS = [{ usd: 250, days: 5, rev: 2 }, { usd: 650, days: 10, rev: 5, pop: true }, { usd: 1800, days: 21, rev: 0, plus: true }];

export default function Pricing() {
  const t = useTranslations("ui");
  const root = useTranslations();
  const plans = root.raw("plans") as { tag: string; name: string; desc: string; f: string[] }[];
  const terms = root.raw("priceTerms") as string[];
  const extras = root.raw("priceExtras") as { usd: number; l: string }[];
  const { m } = useMoney();
  return (
    <section className="sec" id="pricing">
      <div className="wrap">
        <SecHeadClient k="price_kicker" title="price_title" sub="price_sub" />
        <Reveal className="pricing">
          {PLANS.map((p, i) => {
            const price = m(p.usd);
            return (
              <article key={i} className={`plan ${p.pop ? "pop" : ""}`}>
                {p.pop && <span className="badge-pop">★ {t("price_pop")}</span>}
                <span className="tagline">{plans[i].tag}</span>
                <div><h3>{plans[i].name}</h3><p className="desc">{plans[i].desc}</p></div>
                <div className="price"><small>{t("price_from")}</small><b className={price.length > 9 ? "long" : ""}>{price}{p.plus ? "+" : ""}</b></div>
                <ul>{plans[i].f.map(f => <li key={f}>{f}</li>)}</ul>
                <div className="meta"><span>{t("price_delivery")}: <b>{p.days} {t("days")}</b></span><span>{t("price_rev")}: <b>{p.rev || t("unlimited")}</b></span></div>
                <a className={`btn ${p.pop ? "" : "btn-ghost"}`} href={FIVERR_URL} target="_blank" rel="noopener">{t("price_btn")} →</a>
              </article>
            );
          })}
        </Reveal>
        <Reveal className="price-more">
          <div className="panel">
            <h4>{t("price_extras_title")}</h4>
            <ul className="extras">
              {extras.map(e => <li key={e.l}><span>{e.l}</span><b>{t("price_from")} {m(e.usd)}</b></li>)}
            </ul>
          </div>
          <div className="panel">
            <h4>{t("price_terms_title")}</h4>
            <ul className="terms-list">{terms.map(x => <li key={x}>{x}</li>)}</ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
