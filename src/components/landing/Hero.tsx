"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { IND, IND_KEYS } from "@/lib/industries";
import { useMoney, useTween } from "@/lib/hooks";
import { hash } from "@/lib/rng";
import { rich } from "@/lib/rich";
import { addRevenue, clockS, getState, setIndustry, useStore } from "@/lib/store";
import type { IndKey } from "@/lib/types";
import { CountUp, Ico } from "../ui";

const ICONS: Record<IndKey, string> = {
  service: "M3 5h18v16H3zM3 10h18M8 3v4M16 3v4M8 15h3",
  production: "M4 20V9l8-5 8 5v11M4 20h16M9 20v-6h6v6",
  logistics: "M2 7h11v9H2zM13 10h4l4 3v3h-8M8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0M19 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0",
  saas: "M12 3l2.2 5.3L20 9l-4.4 3.8L17 19l-5-3-5 3 1.4-6.2L4 9l5.8-.7z"
};

export default function Hero() {
  const t = useTranslations("ui");
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div className="hero-copy">
          <div className="eyebrow"><span className="pulse" /><span>{t("hero_eyebrow")}</span></div>
          <h1 className="display">{rich(t, "hero_title")}</h1>
          <p className="lead">{t("hero_sub")}</p>
          <div className="hero-ctas">
            <a className="btn btn-acc" href="#calculator">{t("hero_cta1")}<Ico d="M10 4v12m0 0 5-5m-5 5-5-5" /></a>
            <a className="btn btn-ghost" href="#pricing">{t("hero_cta2")}</a>
          </div>
        </div>
        <EngineCard />
      </div>
      <div className="wrap">
        <div className="switch-label"><span>{t("hero_pick")}</span><span className="kbd">1 · 2 · 3 · 4</span></div>
        <Switcher />
        <div className="stats">
          <div><b><CountUp to={3} /></b><span>{t("stat1_l")}</span></div>
          <div><b>&lt;<CountUp to={2} />s</b><span>{t("stat2_l")}</span></div>
          <div><b><CountUp to={100} />%</b><span>{t("stat3_l")}</span></div>
          <div><b><CountUp to={14} /></b><span>{t("stat4_l")}</span></div>
        </div>
      </div>
    </section>
  );
}

function Switcher() {
  const ind = useStore(s => s.ind);
  const tAll = useTranslations("industries");
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input,textarea,select") || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = IND_KEYS[+e.key - 1];
      if (k) setIndustry(k);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, []);
  return (
    <div className="switcher" role="tablist">
      {IND_KEYS.map((k, i) => (
        <button key={k} className={`sw ${k === ind ? "on" : ""}`} role="tab" aria-selected={k === ind}
          style={{ "--sw": IND[k].color } as CSSProperties} onClick={() => setIndustry(k)}>
          <div className="sw-top">
            <span className="sw-ico"><svg viewBox="0 0 24 24"><path d={ICONS[k]} /></svg></span>
            <span className="sw-n">0{i + 1}</span>
          </div>
          <b>{tAll(`${k}.name`)}</b>
          <small>{tAll(`${k}.short`)}</small>
        </button>
      ))}
    </div>
  );
}

type FeedItem = { key: number; e: number; time: string };

function EngineCard() {
  const t = useTranslations("ui");
  const ind = useStore(s => s.ind);
  const rev = useStore(s => s.rev[ind]);
  const spark = useStore(s => s.spark[ind]);
  const tI = useTranslations(`industries.${ind}`);
  const events = tI.raw("events") as string[];
  const { m } = useMoney();
  const revShown = useTween(rev, 900);
  const I = IND[ind];
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const seq = useRef(0);
  const cursor = useRef(3);

  // seed the feed after mount (times are client-only) and restart it per industry
  useEffect(() => {
    const now = Date.now();
    cursor.current = 3;
    setFeed([2, 1, 0].map((e, i) => ({ key: ++seq.current, e, time: clockS(new Date(now - i * 47000)) })));
    const id = setInterval(() => {
      if (document.hidden) return;
      const k = getState().ind;
      const e = cursor.current++ % IND[k].amounts.length;
      setFeed(f => [{ key: ++seq.current, e, time: clockS() }, ...f].slice(0, 3));
      addRevenue(IND[k].amounts[e] || 40 + Math.round(Math.random() * 160), k);
    }, 2800);
    return () => clearInterval(id);
  }, [ind]);

  const max = Math.max(...spark), min = Math.min(...spark);
  const line = "M" + spark.map((v, i) => `${((i / (spark.length - 1)) * 300).toFixed(1)},${(64 - ((v - min) / (max - min || 1)) * 54).toFixed(1)}`).join(" L");
  const h = Math.abs(hash(ind));
  const fmt = (s: string, e: number) => s.replace("{amount}", m(I.amounts[e]));

  return (
    <div className="engine-card">
      <div className="ec-top">
        <div className="ec-brand"><span className="ec-logo">{I.mono}</span><div><b>{I.biz}</b><small>{I.url}</small></div></div>
        <span className="live"><i />LIVE</span>
      </div>
      <div className="ec-rev">
        <small>{t("eng_rev")}</small>
        <div className="ec-num">{m(revShown)}</div>
        <div className="ec-delta">+{14 + (h % 23)}.{h % 9}%</div>
        <svg viewBox="0 0 300 70" preserveAspectRatio="none" aria-hidden="true" style={{ width: "calc(100% + 36px)", margin: "4px -18px 0", height: 80, display: "block" }}>
          <defs><linearGradient id="spG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: "var(--acc)", stopOpacity: 0.4 }} /><stop offset="1" style={{ stopColor: "var(--acc)", stopOpacity: 0 }} /></linearGradient></defs>
          <path d={`${line} L300,70 L0,70 Z`} fill="url(#spG)" />
          <path d={line} fill="none" style={{ stroke: "var(--acc)" }} strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="ec-feed">
        <small>{t("eng_feed")}</small>
        <ul>
          {feed.map(it => (
            <li key={it.key}><i /><span>{fmt(events[it.e], it.e)}</span><em>{it.time}</em></li>
          ))}
        </ul>
      </div>
      <div className="ec-orbit" aria-hidden="true"><span>Stripe</span><span>Telegram</span><span>HubSpot</span><span>Payme</span><span>AI</span></div>
    </div>
  );
}
