import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link, redirect } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { AppNav } from "@/components/app/AppChrome";
import { Logo } from "@/components/ui";
import { IND } from "@/lib/industries";
import { getCurrentUser } from "@/server/auth";
import { logoutAction } from "@/server/actions/auth";
import { counts } from "@/server/repo";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/login", locale });
  const ta = await getTranslations("auth");
  const t = await getTranslations("app");
  const totals = await counts(user.id);

  return (
    <div className="app" style={{ "--acc": IND[user.industry].color } as CSSProperties}>
      <aside className="app-side">
        <Link className="app-brand" href="/dashboard">
          <span className="logo"><Logo text={false} /></span>
          <span>{user.business}<small>chameleon · {user.industry}</small></span>
        </Link>
        <AppNav counts={totals} />
        <div className="app-side-foot">
          <div className="app-user"><i>{user.name.slice(0, 1).toUpperCase()}</i><span><b>{user.name}</b><small>{user.email}</small></span></div>
          <Link href="/">{t("back_site")}</Link>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">⎋ {ta("logout")}</button>
          </form>
        </div>
      </aside>
      <main className="app-main">{children}</main>
    </div>
  );
}
