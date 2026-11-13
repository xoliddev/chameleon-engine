import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FIVERR_URL } from "@/lib/config";
import { rich } from "@/lib/rich";
import { Logo, Reveal } from "../ui";

/* Server-rendered sections: no client JS beyond the scroll reveal. */

const BRANDS = ["Stripe", "PayPal", "Apple Pay", "Google Pay", "LemonSqueezy", "USDT", "ЮKassa", "Robokassa", "Payme", "Click", "Uzum Bank", "Telegram", "WhatsApp", "Slack", "HubSpot", "Google Calendar", "OpenAI", "PostgreSQL"];

export function Marquee() {
  return (
    <div className="marquee" aria-hidden="true">
      <div className="mq-track">{[...BRANDS, ...BRANDS].map((b, i) => <span key={i}>{b}</span>)}</div>
    </div>
  );
}

export function SecHead({ k, title, sub }: { k: string; title: string; sub?: string }) {
  const t = useTranslations("ui");
  return (
    <Reveal className="sec-head">
      <span className="kicker">{k.startsWith("FAQ") ? "FAQ" : t(k)}</span>
      <h2>{rich(t, title)}</h2>
      {sub && <p>{t(sub)}</p>}
    </Reveal>
  );
}

export function Pains() {
  const t = useTranslations("ui");
  const pains = useTranslations().raw("pains") as { t: string; o: string; n: string }[];
  return (
    <section className="sec" id="engine">
      <div className="wrap">
        <SecHead k="pains_kicker" title="pains_title" sub="pains_sub" />
        <div className="pains">
          {pains.map((p, i) => (
            <Reveal as="article" className="pain" key={i}>
              <span className="pain-n">0{i + 1}</span>
              <h3>{p.t}</h3>
              <div className="old"><b>{t("pain_old")}</b><p>{p.o}</p></div>
              <div className="new"><b>✦ {t("pain_new")}</b><p>{p.n}</p></div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Process() {
  const steps = useTranslations().raw("process") as { d: string; t: string; p: string }[];
  return (
    <section className="sec" id="process">
      <div className="wrap">
        <SecHead k="proc_kicker" title="proc_title" />
        <Reveal as="ol" className="process">
          {steps.map((s, i) => <li key={i}><small>{s.d}</small><h3>{s.t}</h3><p>{s.p}</p></li>)}
        </Reveal>
      </div>
    </section>
  );
}

export function Faq() {
  const faq = useTranslations().raw("faq") as { q: string; a: string }[];
  return (
    <section className="sec" id="faq">
      <div className="wrap faq-wrap">
        <SecHead k="FAQ" title="faq_title" />
        <Reveal className="faq">
          {faq.map((f, i) => <details key={i} open={i === 0}><summary>{f.q}</summary><p>{f.a}</p></details>)}
        </Reveal>
      </div>
    </section>
  );
}

export function Final() {
  const t = useTranslations("ui");
  return (
    <section className="final">
      <div className="wrap">
        <h2 className="display">{rich(t, "foot_title")}</h2>
        <div className="hero-ctas center">
          <a className="btn btn-acc lg" href={FIVERR_URL} target="_blank" rel="noopener">{t("foot_btn")}</a>
          <a className="btn btn-ghost lg" href="#automation">{t("foot_msg")}</a>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const t = useTranslations("ui");
  return (
    <footer className="foot">
      <div className="wrap foot-in">
        <a className="logo" href="#top" aria-label="Chameleon Engine"><Logo /></a>
        <span>{t("foot_copy")}</span>
        <nav className="foot-links">
          <Link href="/privacy">{t("foot_privacy")}</Link>
          <Link href="/terms">{t("foot_terms")}</Link>
          <a href={FIVERR_URL} target="_blank" rel="noopener">Fiverr ↗</a>
        </nav>
      </div>
    </footer>
  );
}
