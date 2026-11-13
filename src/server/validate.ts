export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

export function field(fd: FormData, key: string, max = 500): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export const normEmail = (e: string) => e.trim().toLowerCase();
export const validEmail = (e: string) => e.length <= 254 && EMAIL_RE.test(e);
export const strongPassword = (p: string) => p.length >= 8 && p.length <= 200 && /\p{L}/u.test(p) && /\d/.test(p);
export const between = (s: string, min: number, max: number) => s.length >= min && s.length <= max;

export type FormState = { error?: string; ok?: string; params?: Record<string, string | number>; values?: Record<string, string> };
