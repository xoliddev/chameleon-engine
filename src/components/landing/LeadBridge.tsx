"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { IND } from "@/lib/industries";
import { useMoney } from "@/lib/hooks";
import { BUDGETS, qualify } from "@/lib/qualify";
import { clearFresh, clock, getState, pushTg, setState, toast, useStore } from "@/lib/store";
import { CHANNEL_KEYS, CHANNEL_NAMES, type ChannelKey, type Intent } from "@/lib/types";
import { Reveal } from "../ui";
import { SecHeadClient } from "./SecHeadClient";

/* What a lead actually reaches. Database + dashboard always; the rest are real channels
   (Google Sheets, HubSpot, email… are reached through the Zapier/Make webhook). */
type Dest = "db" | "dashboard" | ChannelKey;
const DESTS: { k: Dest; name: string }[] = [
  { k: "db", name: "Database" },
  { k: "dashboard", name: "Dashboard" },
  { k: "telegram", name: "Telegram" },
  { k: "slack", name: "Slack" },
  { k: "webhook", name: "Zapier / Make" },
  { k: "webhook", name: "Sheets · CRM · Email" }
];

type Status = "sent" | "failed" | "simulated" | "disabled" | "not_configured";
type ApiLead = { id: string; score: number; intent: Intent; saved: "account" | "demo"; dbMs: number; dispatch: Record<ChannelKey, { status: Status; error?: string }> };
type LogLine = { key: number; ts: string; node: ReactNode };

export default function LeadBridge() {
  const t = useTranslations("ui");
  const ta = useTranslations("app");
  const tm = useTranslations("misc");
  const { m } = useMoney();
  const tg = useStore(s => s.tg);
  const integrations = useStore(s => s.integrations);
  const [form, setForm] = useState({ name: "Emily Carter", email: "emily@northwind.co", budget: 2, msg: "" });
  const [running, setRunning] = useState(false);
  const [nodes, setNodes] = useState<("" | "run" | "done")[]>(["", "", ""]);
  const [wires, setWires] = useState([false, false]);
  const [hits, setHits] = useState<Partial<Record<Dest, boolean>>>({});
  const [log, setLog] = useState<LogLine[]>([]);
  const [timer, setTimer] = useState("0.00s");
  const [typing, setTyping] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const chatRef = useRef<HTMLDivElement>(null);
  const sample = tm("sampleMsg");

  // keep the sample message in the current language until the user types their own
  useEffect(() => { setForm(f => (!f.msg || SAMPLE_RE.test(f.msg) ? { ...f, msg: sample } : f)); }, [sample]);
  useEffect(() => { logRef.current?.scrollTo(0, 1e6); }, [log]);
  useEffect(() => { chatRef.current?.scrollTo(0, 1e6); }, [tg, typing]);

  const budgetLabel = (i: number) => { const b = BUDGETS[i]; return b.lo === 0 ? "< " + m(b.hi) : b.hi === 0 ? m(b.lo) + "+" : `${m(b.lo)} – ${m(b.hi)}`; };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (running) return;
    setRunning(true);
    const k = getState().ind, I = IND[k];
    const channels = getState().integrations;
    const lead = { ...form, name: form.name.trim() || "Anonymous", email: form.email.trim() };
    const local = qualify(lead.budget, lead.msg);
    setNodes(["run", "", ""]); setWires([false, false]); setHits({}); setLog([]);

    const t0 = performance.now();
    let seq = 0;
    const ts = () => `[+${((performance.now() - t0) / 1000).toFixed(2)}s]`;
    const push = (node: ReactNode) => setLog(l => [...l, { key: ++seq, ts: ts(), node }]);
    const at = (ms: number) => new Promise(r => setTimeout(r, Math.max(0, ms - (performance.now() - t0))));
    let timing = true;
    const tick = () => { if (!timing) return; setTimer(((performance.now() - t0) / 1000).toFixed(2) + "s"); requestAnimationFrame(tick); };
    tick();

    const api = fetch("/api/leads", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: lead.name, email: lead.email, budget: lead.budget, message: lead.msg, industry: k, channels })
    }).then(r => (r.ok ? (r.json() as Promise<ApiLead>) : null)).catch(() => null);

    push(<><span className="k">POST</span> /api/leads · {I.url}</>);
    await at(200);
    const res = await api; // the API stores the lead and dispatches the real alerts
    setNodes(["done", "run", ""]); setWires([true, false]);
    setHits({ db: true, dashboard: true });
    push(res
      ? <><span className="ok">201</span> db.leads.insert → <span className="ok">{res.id}</span> · {res.dbMs}ms · {res.saved === "account" ? "your account" : "demo workspace"}</>
      : <>db.leads.insert → <span className="w">offline · kept in this browser only</span></>);
    await at(420);
    push(<>ai.qualify(lead) → budget, intent, urgency…</>);
    setTyping(channels.telegram);
    await at(800);
    const final: ApiLead = res ?? {
      id: "ld_local", score: local.score, intent: local.intent, saved: "demo", dbMs: 0,
      dispatch: { telegram: { status: "simulated" }, slack: { status: "simulated" }, webhook: { status: "simulated" } }
    };
    setNodes(["done", "done", "run"]); setWires([true, true]);
    push(<>score=<span className="ok">{final.score}/100</span> · intent={t(final.intent)} · priority={final.score >= 80 ? "HIGH" : "normal"}</>);

    let ms = 950;
    for (const ch of CHANNEL_KEYS) {
      await at(ms); ms += 90;
      const d = final.dispatch[ch];
      if (d.status === "disabled") { push(<span className="w">↷ {CHANNEL_NAMES[ch]} · {ta("st_disabled")}</span>); continue; }
      if (d.status === "not_configured") { push(<span className="w">○ {CHANNEL_NAMES[ch]} · {ta("st_not_configured")}</span>); continue; }
      if (d.status === "failed") { push(<span className="w">✕ {CHANNEL_NAMES[ch]} · {d.error}</span>); continue; }
      setHits(h => ({ ...h, [ch]: true }));
      push(<>→ {CHANNEL_NAMES[ch]} <span className="ok">✓</span> {d.status === "sent" ? <span className="ok">{ta("st_sent")}</span> : <span className="ts">{ta("st_simulated")}</span>}</>);
      if (ch === "telegram") {
        setTyping(false);
        pushTg({ id: final.id, kind: "lead", time: clock(), biz: I.biz, name: lead.name, email: lead.email, budget: lead.budget, score: final.score, intent: final.intent, msg: lead.msg });
      }
    }
    setTyping(false);
    await at(1450);
    timing = false;
    const total = ((performance.now() - t0) / 1000).toFixed(2);
    setTimer(total + "s");
    setNodes(["done", "done", "done"]);
    push(<span className="ok">✓ pipeline complete in {total}s</span>);
    setState(s => ({ leads: [{ id: final.id, name: lead.name, source: "Website form", score: final.score, status: final.score >= 80 ? "qual" : "new", time: clock(), ind: k, fresh: true }, ...s.leads] }));
    clearFresh();
    toast(`${t("toast_lead")} ${total}s`, final.saved === "account" ? ta("saved_db") : t("toast_lead_sub"));
    setRunning(false);
  }

  const tgText = (msg: (typeof tg)[number]) =>
    msg.kind === "lead"
      ? <><b>🔥 {t("tg_new")} — {msg.biz}</b>{"\n"}👤 {msg.name}{"\n"}✉️ {msg.email}{"\n"}💰 {budgetLabel(msg.budget)}{"\n"}🧠 {t("tg_score")}: <b>{msg.score}/100</b> · {t(msg.intent)}{msg.msg ? <>{"\n"}💬 “{msg.msg}”</> : null}</>
      : <><b>💳 {t("tg_paid")} — {msg.biz}</b>{"\n"}{m(msg.amount, 2)} · {msg.gw}{"\n"}#{msg.receipt}</>;

  return (
    <section className="sec" id="automation">
      <div className="wrap">
        <SecHeadClient k="auto_kicker" title="auto_title" sub="auto_sub" />
        <Reveal className="auto">
          <form className="panel lead-form" onSubmit={submit} autoComplete="off">
            <div className="panel-tag"><span className="tag-dot" /><span>{t("auto_form")}</span></div>
            <label><span>{t("f_name")}</span><input required maxLength={80} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
            <label><span>Email</span><input required type="email" maxLength={254} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
            <label><span>{t("f_budget")}</span>
              <select value={form.budget} onChange={e => setForm({ ...form, budget: +e.target.value })}>
                {BUDGETS.map((_, i) => <option key={i} value={i}>{budgetLabel(i)}</option>)}
              </select>
            </label>
            <label><span>{t("f_msg")}</span><textarea rows={3} maxLength={1000} value={form.msg} onChange={e => setForm({ ...form, msg: e.target.value })} /></label>
            <button className="btn btn-acc wide" type="submit" disabled={running}>
              <svg viewBox="0 0 20 20" className="ico"><path d="M11 2 4 11h5l-1 7 7-9h-5z" /></svg><span>{t("f_btn")}</span>
            </button>
          </form>

          <div className="panel pipeline">
            <div className="nodes">
              {["st1", "st2", "st3"].map((k, i) => (
                <FragmentNode key={k} i={i} state={nodes[i]} label={t(k)} wire={i < 2 ? wires[i] : null} />
              ))}
            </div>
            <div className="log">
              <div className="log-bar"><span /><span /><span /><b>engine.log</b><em>{timer}</em></div>
              <div className="log-body" ref={logRef}>
                {log.length === 0 && <div className="log-idle">{t("log_idle")}</div>}
                {log.map(l => <div key={l.key}><span className="ts">{l.ts}</span> {l.node}</div>)}
              </div>
            </div>
            <div className="dests">
              {DESTS.map(d => {
                const off = d.k !== "db" && d.k !== "dashboard" && !integrations[d.k];
                return <div key={d.name} className={`dest ${off ? "off" : ""} ${hits[d.k] ? "hit" : ""}`}><i />{d.name}</div>;
              })}
            </div>
          </div>

          <div className="phone">
            <div className="ph-notch" />
            <div className="ph-head"><span className="ph-av">LB</span><div><b>LeadBridge Bot</b><small>{t("tg_online")}</small></div></div>
            <div className="ph-chat" ref={chatRef}>
              <div className="bub sys">{t("tg_hello")}</div>
              {tg.map(msg => (
                <div key={msg.id + msg.kind} style={{ display: "contents" }}>
                  <div className="bub">{tgText(msg)}<span className="meta">{msg.time} ✓✓</span></div>
                  {msg.kind === "lead" && <div className="bub-btns"><span>{t("tg_open")}</span><span>{t("tg_reply")}</span></div>}
                </div>
              ))}
              {typing && <div className="typing"><i /><i /><i /></div>}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const SAMPLE_RE = /^(Need a quote asap|Нужен расчёт срочно|Narxni tez bilishim)/;

function FragmentNode({ i, state, label, wire }: { i: number; state: string; label: string; wire: boolean | null }) {
  return (
    <>
      <div className={`node ${state}`}><i>0{i + 1}</i><b>{label}</b><small>{["0.2s", "0.8s", "1.4s"][i]}</small></div>
      {wire !== null && <div className={`wire ${wire ? "on" : ""}`}><span /></div>}
    </>
  );
}
