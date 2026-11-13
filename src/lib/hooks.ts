"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { exactDec, money } from "./money";
import { useStore } from "./store";

/** Currency-aware formatter bound to the current locale + selected currency. */
export function useMoney() {
  const cur = useStore(s => s.cur);
  const locale = useLocale();
  return {
    cur,
    m: (usd: number, dec = 0) => money(usd, cur, locale, dec),
    exact: (usd: number) => money(usd, cur, locale, exactDec(cur))
  };
}

/** Animated number that eases from its previous value. */
export function useTween(target: number, dur = 650) {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const start = from.current;
    if (start === target) return;
    const t0 = performance.now();
    cancelAnimationFrame(raf.current);
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const cur = start + (target - start) * e;
      from.current = cur;
      setV(cur);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, dur]);
  return v;
}

/** Fires once when the element scrolls into view. */
export function useInView<T extends Element>(threshold = 0.12) {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || seen) return;
    const io = new IntersectionObserver(([en]) => { if (en.isIntersecting) { setSeen(true); io.disconnect(); } }, { threshold });
    io.observe(el);
    return () => io.disconnect();
  }, [seen, threshold]);
  return [ref, seen] as const;
}

export function useMounted() {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}
