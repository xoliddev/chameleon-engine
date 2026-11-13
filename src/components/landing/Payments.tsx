"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { GW, REGION_BY_LOCALE, type Gateway, type Region } from "@/lib/gateways";
import { IND } from "@/lib/industries";
import { useMoney } from "@/lib/hooks";
import { download, invoicePdf } from "@/lib/pdf";
import { hash, rid, rng } from "@/lib/rng";
import { addRevenue, clearFresh, clock, freshCheckout, getState, pushTg, setState, toast, useStore, type Receipt } from "@/lib/store";
import { Ico, Reveal } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

const STEPS = ["pay_proc1", "pay_proc2", "pay_proc3", "pay_proc4"];

export default function Payments({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("ui");
  const ta = useTranslations("app");
  const tm = useTranslations("misc");
  const locale = useLocale();
  const [region, setRegion] = useState<Region>(REGION_BY_LOCALE[locale] ?? "global");
  const gwId = useStore(s => s.gw);
  const co = useStore(s => s.checkout);
  const ind = useStore(s => s.ind);
  const cur = useStore(s => s.cur);
  const { exact } = useMoney();
  const [step, setStep] = useState(0);
  const I = IND[ind];

  // the visible gateways follow the language (EN → Stripe/PayPal, RU → ЮKassa, UZ → Payme/Click)
  useEffect(() => { setRegion(REGION_BY_LOCALE[locale] ?? "global"); setState({ gw: null }); }, [locale]);

  const g: Gateway = GW[region].find(x => x.id === gwId) ?? GW[region][0];
  const amt = exact(co.amount);
  const item = co.custom ?? t("pay_item");

  async function pay() {
    const k = getState().ind;
    const c = getState().checkout;
    setState({ checkout: { ...c, phase: "proc" } });
    setStep(0);
    const req = fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ amountUsd: c.amount, currency: getState().cur, description: c.customEn ?? "Demo transaction", gateway: g.id })
    }).then(r => r.json()).catch(() => null) as Promise<null | { id?: string; providerId: string | null; mode: string; status?: string; error?: string; saved: "account" | "demo" }>;
    for (let i = 0; i < STEPS.length; i++) {
      setStep(i);
      await new Promise(r => setTimeout(r, 560 + Math.random() * 200));
    }
    const res = await req;
    if (res && res.status !== "succeeded") {
      // real gateway declined (e.g. Stripe test key) or the API rejected the request
      setState(s => ({ checkout: { ...s.checkout, phase: "form" } }));
      toast("✕ " + (res.error || res.status || "Payment failed"));
      return;
    }
    setStep(STEPS.length);
    await new Promise(r => setTimeout(r, 250));
    const receipt: Receipt = {
      id: res?.id ?? "ch_" + rid() + rid().slice(0, 3), gw: g.name, amount: c.amount, date: Date.now(),
      item: c.customEn ?? "Demo transaction", ind: k, providerId: res?.providerId ?? null, mode: res?.mode ?? "test"
    };
    setState(s => ({
      checkout: { ...s.checkout, phase: "done", receipt },
      orders: [{ id: receipt.id, item: c.custom ?? t("pay_item"), gw: g.name, amount: c.amount, ind: k, time: clock(), fresh: true }, ...s.orders]
    }));
    clearFresh();
    addRevenue(c.amount, k);
    pushTg({ id: receipt.id, kind: "paid", time: clock(), biz: IND[k].biz, amount: c.amount, gw: g.name, receipt: receipt.id });
    toast(t("toast_pay"), res ? ta(res.saved === "account" ? "saved_db" : "saved_demo") : t("toast_pay_sub"));
  }

  return (
    <section className="sec" id="payments">
      <div className="wrap">
        <SecHeadClient k="pay_kicker" title="pay_title" sub="pay_sub" />
        <Reveal className="pay">
          <div className="pay-left">
            <div className="tabs">
              {(["global", "cis", "uz"] as Region[]).map(r => (
                <button key={r} className={r === region ? "on" : ""} onClick={() => { setRegion(r); setState({ gw: null }); }}>{t(`pay_region_${r}`)}</button>
              ))}
            </div>
            <div className="gw-grid">
              {GW[region].map(x => (
                <button key={x.id} className={`gw ${x.id === g.id ? "on" : ""}`} style={{ "--gc": x.c } as CSSProperties}
                  onClick={() => { setState(s => ({ gw: x.id, checkout: s.checkout.phase === "proc" ? s.checkout : { ...s.checkout, phase: "form" } })); }}>
                  <span className="gw-name">{x.name}</span><span className="gw-type">{tm(`modes.${x.mode}`)}</span>
                </button>
              ))}
            </div>
            <ul className="pay-feats">
              {["pay_f1", "pay_f2", "pay_f3", "pay_f4"].map(k => <li key={k}>{t(k)}</li>)}
            </ul>
            <p className="pay-note">{t("pay_note")}</p>
            {signedIn && <p className="saved-chip" style={{ marginTop: 14 }}>● {ta("saved_db")}</p>}
          </div>

          <div className="checkout">
            <div className="co-head">
              <div className="co-brand"><span className="ec-logo sm">{I.mono}</span><b>{I.biz}</b></div>
              <span className="test-badge">{t("pay_testmode")}</span>
            </div>
            <div className="co-body">
              {co.phase === "form" && (
                <>
                  <div className="co-item"><div><b>{item}</b><small>{t(co.sub)}</small></div><div className="co-amt">{amt}</div></div>
                  <div className="co-gwline"><span>{t("pay_via")}</span><b style={{ "--gcx": g.l } as CSSProperties}>{g.name}</b></div>
                  <GatewayFields g={g} amount={co.amount} region={region} />
                  <button className="co-pay" onClick={pay} style={g.mode === "wallet" ? { background: "#000" } : undefined}>
                    <i />{g.mode === "wallet" ? `${g.name} · ${amt}` : `${t("pay_btn")} ${amt}`}
                  </button>
                </>
              )}
              {co.phase === "proc" && (
                <>
                  <div className="co-item"><div><b>{item}</b><small>{g.name}</small></div><div className="co-amt">{amt}</div></div>
                  <ul className="co-steps">
                    {STEPS.map((k, i) => (
                      <li key={k} className={i < step ? "done" : i === step ? "on" : ""}><i>{i < step ? "✓" : ""}</i>{t(k)}</li>
                    ))}
                  </ul>
                </>
              )}
              {co.phase === "done" && co.receipt && (
                <>
                  <div className="co-done">
                    <div className="co-check"><svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
                    <h4>{t("pay_ok")}</h4>
                    <small style={{ color: "#7B7D75" }}>{t("pay_ok_sub")}</small>
                    <div className="receipt">
                      <div><span>{t("pay_r_id")}</span><b>{co.receipt.id}</b></div>
                      <div><span>{t("pay_r_gw")}</span><b>{co.receipt.gw}</b></div>
                      <div><span>{t("pay_r_amt")}</span><b>{exact(co.receipt.amount)}</b></div>
                      <div><span>{t("pay_r_date")}</span><b>{new Date(co.receipt.date).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}</b></div>
                    </div>
                  </div>
                  <div className="co-actions">
                    <button className="co-pay" onClick={() => download(invoicePdf(co.receipt!, cur), `invoice-${co.receipt!.id}.pdf`)}>⤓ {t("pay_pdf")}</button>
                    <button className="co-ghost" onClick={() => setState({ checkout: freshCheckout() })}>↺ {t("pay_again")}</button>
                  </div>
                </>
              )}
            </div>
            <div className="co-foot"><Ico d="M5 9V7a5 5 0 0 1 10 0v2M4 9h12v8H4z" /><span>{t("pay_secure")}</span></div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function GatewayFields({ g, amount, region }: { g: Gateway; amount: number; region: Region }) {
  const t = useTranslations("ui");
  const qr = useMemo(() => {
    const n = 25, r = rng(hash(g.id + amount)), cells: string[] = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const inF = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inF && r() > 0.52) cells.push(`M${x} ${y}h1v1h-1z`);
    }
    return cells.join("");
  }, [g.id, amount]);

  if (g.mode === "card") {
    const num = region === "cis" ? "5555 5555 5555 4444" : g.id === "humo" ? "8600 0000 0000 0000" : "4242 4242 4242 4242";
    return (
      <>
        <label className="co-lbl">{t("pay_card")}</label>
        <div className="co-field"><span>{num}</span><div className="card-brands"><i /><i /></div></div>
        <div className="co-row">
          <div><label className="co-lbl">{t("pay_exp")}</label><div className="co-field"><span>12 / 34</span></div></div>
          <div><label className="co-lbl">CVC</label><div className="co-field"><span>•••</span></div></div>
        </div>
      </>
    );
  }
  if (g.mode === "phone") {
    return (
      <>
        <label className="co-lbl">{t("pay_phone")}</label>
        <div className="co-field"><span>{region === "cis" ? "+7 900 123-45-67" : "+998 90 123 45 67"}</span></div>
        <label className="co-lbl">SMS</label>
        <div className="co-field"><span>• • • • • •</span><small>auto</small></div>
        <p className="wallet-note">{t("pay_sms")}</p>
      </>
    );
  }
  if (g.mode === "crypto") {
    const finder = (x: number, y: number) => (
      <g key={`${x}-${y}`}><rect x={x} y={y} width={7} height={7} fill="#151614" /><rect x={x + 1} y={y + 1} width={5} height={5} fill="#fff" /><rect x={x + 2} y={y + 2} width={3} height={3} fill="#151614" /></g>
    );
    return (
      <div className="crypto">
        <svg className="qr" viewBox="0 0 25 25" shapeRendering="crispEdges"><path d={qr} fill="#151614" />{finder(0, 0)}{finder(18, 0)}{finder(0, 18)}</svg>
        <div><span className="co-lbl">{t("pay_crypto_note")}</span><b style={{ fontSize: 22 }}>{amount.toFixed(2)} USDT</b><code>TQ7nY4demoC4m3l30nEng1ne9xKf2</code></div>
      </div>
    );
  }
  return <p className="wallet-note">{t("pay_wallet_note")}</p>;
}
