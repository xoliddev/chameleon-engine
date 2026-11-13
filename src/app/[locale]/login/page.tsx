import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import AuthShell from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/AuthForms";
import { redirectIfAuthed } from "@/server/actions/auth";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth" });
  return { title: t("login_btn"), robots: { index: false } };
}

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await redirectIfAuthed(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("login_title")} sub={t("login_sub")} footer={<>{t("no_account")} <Link href="/signup">{t("to_signup")}</Link></>}>
      <LoginForm />
    </AuthShell>
  );
}
