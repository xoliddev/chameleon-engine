import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import AuthShell from "@/components/auth/AuthShell";
import { SignupForm } from "@/components/auth/AuthForms";
import { redirectIfAuthed } from "@/server/actions/auth";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getTranslations({ locale: (await params).locale, namespace: "auth" });
  return { title: t("signup_btn"), robots: { index: false } };
}

export default async function SignupPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  await redirectIfAuthed(locale);
  const t = await getTranslations("auth");
  return (
    <AuthShell title={t("signup_title")} sub={t("signup_sub")} footer={<>{t("have_account")} <Link href="/login">{t("to_login")}</Link></>}>
      <SignupForm />
    </AuthShell>
  );
}
