"use client";

import { useTranslations } from "next-intl";
import { rich } from "@/lib/rich";
import { Reveal } from "../ui";

export function SecHeadClient({ k, title, sub }: { k: string; title: string; sub?: string }) {
  const t = useTranslations("ui");
  return (
    <Reveal className="sec-head">
      <span className="kicker">{t(k)}</span>
      <h2>{rich(t, title)}</h2>
      {sub && <p>{t(sub)}</p>}
    </Reveal>
  );
}
