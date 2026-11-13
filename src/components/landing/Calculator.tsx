"use client";

import type { CSSProperties } from "react";
import { useTranslations } from "next-intl";
import en from "@messages/en.json";
import { IND, fmtNum, quote, summary, type IndustryMessages } from "@/lib/industries";
import { useMoney, useTween } from "@/lib/hooks";
import { setCalc, setState, toast, useStore } from "@/lib/store";
import { Ico, Reveal } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

const pct = (v: number, min: number, max: number) => ({ "--p": `${((v - min) / (max - min)) * 100}%` }) as CSSProperties;

export default function Calculator() {
  const t = useTranslations("ui");
  const tm = useTranslations("misc");
  const ind = useStore(s => s.ind);
  const s = useStore(s => s.calc[s.ind]);
  const visitors = useStore(s => s.visitors);
  const im = useTranslations("industries").raw(ind) as IndustryMessages;
  const { m, exact } = useMoney();
  const I = IND[ind];

  const total = quote(ind, s);
  const totalShown = useTween(total);
  const depShown = useTween(total * I.dep);

  const extraRev = visitors * (0.032 - 0.011) * 0.15 * total;
  const extraShown = useTween(extraRev);
  const hours = Math.round((visitors * 0.032 * 20) / 60);
  const payback = 650 / (extraRev / 30);

  const unitNote = (n?: string) => (!n ? "" : n === "h" || n === "m2" || n === "seat" ? tm(`unitNotes.${n}`) : n);

  function book() {
    const amount = Math.round(total * I.dep * 100) / 100;
    setState({ checkout: { phase: "form", amount, custom: summary(ind, s, im), customEn: summary(ind, s, en.industries[ind] as IndustryMessages), sub: "pay_dep_sub", receipt: null } });
    document.getElementById("payments")?.scrollIntoView({ behavior: "smooth" });
    toast(t("toast_book"), exact(amount));
  }

  return (
    <section className="sec" id="calculator">
      <div className="wrap">
        <SecHeadClient k="calc_kicker" title="calc_title" sub="calc_sub" />
        <Reveal className="calc">
          <div className="panel calc-left">
            <div className="panel-tag"><span className="tag-dot" /><span>{t("calc_customer")}</span> · <b>{I.biz}</b></div>
            <div className="fields">
              {I.fields.map(f => {
                const fm = im.fields[f.id];
                if (f.t === "range") {
                  const v = s[f.id] as number;
                  return (
                    <div className="field" key={f.id}>
                      <div className="f-top"><label htmlFor={`r_${f.id}`}>{fm.label}</label><output>{fmtNum(v)} {fm.unit}</output></div>
                      <input type="range" id={`r_${f.id}`} min={f.min} max={f.max} step={f.step} value={v} style={pct(v, f.min, f.max)}
                        onChange={e => setCalc(ind, f.id, +e.target.value)} />
                    </div>
                  );
                }
                if (f.t === "chips") {
                  return (
                    <div className="field" key={f.id}>
                      <span className="f-lbl">{fm.label}</span>
                      <div className="chips">
                        {f.opts.map((o, i) => (
                          <button key={i} className={`chip ${s[f.id] === i ? "on" : ""}`} onClick={() => setCalc(ind, f.id, i)}>
                            {fm.opts![i]} <small>{o.n && ["h", "m2", "seat"].includes(o.n) ? m(o.v) + unitNote(o.n) : unitNote(o.n)}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                const set = s[f.id] as number[];
                return (
                  <div className="field" key={f.id}>
                    <span className="f-lbl">{fm.label}</span>
                    <div className="chips">
                      {f.opts.map((o, i) => (
                        <button key={i} className={`chip add ${set.includes(i) ? "on" : ""}`}
                          onClick={() => setCalc(ind, f.id, set.includes(i) ? set.filter(x => x !== i) : [...set, i])}>
                          {fm.opts![i]} <small>{o.pct ? `+${Math.round(o.pct * 100)}%` : "+" + m(o.flat ?? 0) + (o.per ? tm("unitNotes.seat") : "")}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="quote">
              <div>
                <small>{t("calc_total")}</small>
                <div className="quote-num"><span>{m(totalShown)}</span><em>{I.perMonth ? tm("perMonth") : ""}</em></div>
                <div className="quote-sum">{summary(ind, s, im)}</div>
              </div>
              <div className="dep"><small>{im.depLabel}</small><b>{m(depShown)}</b></div>
            </div>
            <button className="btn btn-acc wide" onClick={book}><span>{t("calc_book")}</span><Ico d="M4 10h12m0 0-5-5m5 5-5 5" /></button>
          </div>

          <div className="panel calc-right">
            <div className="panel-tag"><span className="tag-dot" /><span>{t("calc_owner")}</span></div>
            <div className="field">
              <div className="f-top"><label htmlFor="visitors">{t("calc_visitors")}</label><output>{visitors.toLocaleString("en-US")}</output></div>
              <input type="range" id="visitors" min={500} max={50000} step={500} value={visitors} style={pct(visitors, 500, 50000)}
                onChange={e => setState({ visitors: +e.target.value })} />
            </div>
            <div className="roi-big"><small>{t("calc_extra")}</small><div>{m(extraShown)}</div></div>
            <div className="roi-row">
              <div><small>{t("calc_hours")}</small><b>{hours.toLocaleString("en-US")} {tm("hoursUnit")}</b></div>
              <div><small>{t("calc_payback")}</small><b>{payback < 1 ? "< 1" : Math.ceil(payback)} {t("calc_days")}</b></div>
            </div>
            <div className="conv-bars">
              <div className="cb"><span>{t("calc_static")}</span><div className="cb-bar"><i style={{ width: "34%" }} /></div><b>1.1%</b></div>
              <div className="cb acc"><span>{t("calc_engine")}</span><div className="cb-bar"><i style={{ width: "100%" }} /></div><b>3.2%</b></div>
            </div>
            <p className="note">{t("calc_note")}</p>
            <a className="custom-cta" href="#pricing"><span>{t("calc_custom")}</span><b>{t("calc_custom_btn")}</b></a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
