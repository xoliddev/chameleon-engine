import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { Instrument_Serif, Inter_Tight, JetBrains_Mono, PT_Serif } from "next/font/google";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { SITE_URL } from "@/lib/config";
import "../globals.css";
import "../app.css";

const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });
const ptSerif = PT_Serif({ subsets: ["latin", "cyrillic"], weight: "400", style: ["normal", "italic"], variable: "--font-ptserif", display: "swap" });
const inter = Inter_Tight({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono", display: "swap" });

export const viewport: Viewport = { themeColor: "#0A0B0A", width: "device-width", initialScale: 1 };

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ui" });
  const title = "Chameleon Engine — Revenue & Automation Web Apps";
  const description = t("hero_sub");
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: title, template: "%s · Chameleon Engine" },
    description,
    alternates: { canonical: locale === "en" ? "/" : `/${locale}`, languages: { en: "/", ru: "/ru", uz: "/uz" } },
    openGraph: { title, description, type: "website", locale },
    robots: { index: true, follow: true }
  };
}

export default async function LocaleLayout({ children, params }: { children: ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  return (
    <html lang={locale} className={`${instrument.variable} ${ptSerif.variable} ${inter.variable} ${mono.variable}`}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
