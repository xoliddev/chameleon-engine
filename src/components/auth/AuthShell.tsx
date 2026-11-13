import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { rich } from "@/lib/rich";
import { Ambient, Logo } from "../ui";

export default function AuthShell({ title, sub, children, footer }: { title: string; sub: string; children: ReactNode; footer: ReactNode }) {
  const t = useTranslations("auth");
  return (
    <>
      <Ambient />
      <div className="auth">
        <aside className="auth-side">
          <div className="auth-top"><Link className="logo" href="/" aria-label="Chameleon Engine"><Logo /></Link></div>
          <div>
            <span className="kicker">{t("side_kicker")}</span>
            <h1>{rich(t, "side_title")}</h1>
            <ul className="auth-points">
              <li>{t("side_1")}</li>
              <li>{t("side_2")}</li>
              <li>{t("side_3")}</li>
            </ul>
          </div>
          <p className="auth-note">🔒 {t("secure_note")}</p>
        </aside>
        <main className="auth-main">
          <div className="auth-card">
            <div className="auth-top" style={{ marginBottom: 36 }}>
              <Link className="logo" href="/" aria-label="Chameleon Engine"><Logo text={false} /></Link>
              <Link className="back" href="/">{t("back_home")}</Link>
            </div>
            <h2>{title}</h2>
            <p>{sub}</p>
            {children}
            <p className="auth-switch">{footer}</p>
          </div>
        </main>
      </div>
    </>
  );
}
