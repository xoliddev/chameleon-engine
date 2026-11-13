"use client";

import { useEffect } from "react";
import { IND } from "@/lib/industries";
import { hydrate, useStore } from "@/lib/store";

/** Restores saved preferences and morphs the accent colour when the industry changes. */
export default function EngineRuntime() {
  const ind = useStore(s => s.ind);
  useEffect(() => { hydrate(); }, []);
  useEffect(() => {
    const c = IND[ind].color;
    document.documentElement.style.setProperty("--acc", c);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", c);
  }, [ind]);
  return null;
}
