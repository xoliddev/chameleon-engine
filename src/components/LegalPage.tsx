import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Ambient, Logo } from "./ui";

type Doc = { title: string; intro: string; sections: { h: string; p: string }[] };

/** Privacy / Terms — server-rendered, text from messages/*.json → legal.<doc>. */
export default function LegalPage({ doc }: { doc: "privacy" | "terms" }) {
  const d = useTranslations("legal").raw(doc) as Doc;
  const ta = useTranslations("auth");
  return (
    <>
      <Ambient />
      <main className="wrap legal">
        <div className="legal-nav">
          <Link className="logo" href="/" aria-label="Chameleon Engine"><Logo /></Link>
          <Link href="/" className="nav-link-btn">{ta("back_home")}</Link>
        </div>
        <h1>{d.title}</h1>
        <p className="intro">{d.intro}</p>
        {d.sections.map(s => (
          <section key={s.h}><h2>{s.h}</h2><p>{s.p}</p></section>
        ))}
        <p className="mono" style={{ marginTop: 30 }}>Last updated: 2026-10-23</p>
      </main>
    </>
  );
}
