import { setRequestLocale } from "next-intl/server";
import EngineRuntime from "@/components/EngineRuntime";
import Nav from "@/components/Nav";
import { StatusPill, Toasts } from "@/components/Overlay";
import { Ambient } from "@/components/ui";
import Calculator from "@/components/landing/Calculator";
import DemoDashboard from "@/components/landing/DemoDashboard";
import Engineering from "@/components/landing/Engineering";
import Hero from "@/components/landing/Hero";
import LeadBridge from "@/components/landing/LeadBridge";
import Payments from "@/components/landing/Payments";
import Pricing from "@/components/landing/Pricing";
import { Faq, Final, Footer, Marquee, Pains, Process } from "@/components/landing/Static";
import { getCurrentUser } from "@/server/auth";
import type { PublicUser } from "@/lib/types";

// reads the session cookie on every request
export const dynamic = "force-dynamic";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const u = await getCurrentUser();
  const user: PublicUser | null = u ? { name: u.name, email: u.email, business: u.business } : null;

  return (
    <>
      <Ambient />
      <EngineRuntime />
      <Nav user={user} />
      <main id="top">
        <Hero />
        <Marquee />
        <Pains />
        <Calculator />
        <Payments signedIn={!!user} />
        <LeadBridge />
        <DemoDashboard user={user} />
        <Engineering />
        <Process />
        <Pricing />
        <Faq />
        <Final />
      </main>
      <Footer />
      <StatusPill />
      <Toasts />
    </>
  );
}
