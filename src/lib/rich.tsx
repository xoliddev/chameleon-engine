import type { ReactNode } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RichT = { rich: (...args: any[]) => ReactNode };

/** Messages may contain <em>…</em> for the serif-italic accent words. */
export const rich = (t: RichT, key: string) => t.rich(key, { em: (chunks: ReactNode) => <em>{chunks}</em> });
