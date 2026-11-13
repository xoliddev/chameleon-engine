"use client";

import { createElement, type ReactNode } from "react";
import { useInView } from "@/lib/hooks";
import { useEffect, useState } from "react";

export function Logo({ text = true }: { text?: boolean }) {
  return (
    <>
      <svg viewBox="0 0 32 32" className="logo-mark" aria-hidden="true">
        <circle cx="16" cy="16" r="15" className="lm-bg" />
        <path d="M9 21.5c-2.4-3.6-1.6-9 2.6-11.4 4.6-2.6 10.6-.4 11.6 4.9.8 4-2.2 7.3-5.8 7-2.9-.2-4.6-2.9-3.6-5.3.8-1.8 3.3-2.1 4.3-.5" className="lm-curl" />
        <circle cx="20.6" cy="12.2" r="1.3" className="lm-eye" />
      </svg>
      {text && <span>Chameleon<b>Engine</b></span>}
    </>
  );
}

/** Fades/slides its children in the first time they scroll into view. */
export function Reveal({ as = "div", className = "", children, id }: { as?: string; className?: string; children: ReactNode; id?: string }) {
  const [ref, seen] = useInView<HTMLElement>();
  return createElement(as, { ref, id, className: `reveal ${seen ? "in" : ""} ${className}`.trim() }, children);
}

export function CountUp({ to, dur = 1400 }: { to: number; dur?: number }) {
  const [ref, seen] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!seen) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      setV(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [seen, to, dur]);
  return <span ref={ref}>{v}</span>;
}

export function Ambient() {
  return (
    <>
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-glow" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
    </>
  );
}

export function Ico({ d }: { d: string }) {
  return <svg viewBox="0 0 20 20" className="ico" aria-hidden="true"><path d={d} /></svg>;
}
