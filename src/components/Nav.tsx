"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { CURRENCIES, isCur } from "@/lib/money";
import { setState, useStore } from "@/lib/store";
import type { PublicUser } from "@/lib/types";
import { Logo } from "./ui";

const SECTIONS = ["calculator", "payments", "automation", "dashboard", "pricing"] as const;
const LABEL: Record<(typeof SECTIONS)[number], string> = { calculator: "nav_calc", payments: "nav_pay", automation: "nav_auto", dashboard: "nav_dash", pricing: "nav_price" };
const CUR_LABEL = { USD: "USD $", EUR: "EUR €", RUB: "RUB ₽", UZS: "UZS so'm" };

export default function Nav({ user }: { user: PublicUser | null }) {
  const t = useTranslations("ui");
  const ta = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const cur = useStore(s => s.cur);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 20);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && setActive(e.target.id)), { rootMargin: "-45% 0px -50% 0px" });
    SECTIONS.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
    return () => io.disconnect();
  }, []);

  return (
    <header className={`nav ${scrolled ? "scrolled" : ""}`}>
      <div className="wrap nav-in">
        <a className="logo" href="#top" aria-label="Chameleon Engine"><Logo /></a>
        <nav className="links" aria-label="Main">
          {SECTIONS.map(id => (
            <a key={id} href={`#${id}`} className={active === id ? "active" : ""}>{t(LABEL[id])}</a>
          ))}
        </nav>
        <div className="controls">
          <div className="seg" role="group" aria-label="Language">
            {routing.locales.map(l => (
              <button key={l} className={l === locale ? "on" : ""} onClick={() => l !== locale && router.replace(pathname, { locale: l, scroll: false })}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <label className="cur" aria-label="Currency">
            <select value={cur} onChange={e => isCur(e.target.value) && setState({ cur: e.target.value })}>
              {CURRENCIES.map(c => <option key={c} value={c}>{CUR_LABEL[c]}</option>)}
            </select>
          </label>
          <div className="nav-auth">
            {user ? (
              <Link className="btn btn-acc sm" href="/dashboard">{ta("nav_dashboard")} →</Link>
            ) : (
              <>
                <Link className="nav-link-btn" href="/login">{ta("nav_login")}</Link>
                <Link className="btn btn-acc sm" href="/signup">{ta("nav_signup")}</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
