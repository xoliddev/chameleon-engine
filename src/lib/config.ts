/** Set NEXT_PUBLIC_FIVERR_URL to your Fiverr profile/gig before building — it's baked into the page. */
export const FIVERR_URL = process.env.NEXT_PUBLIC_FIVERR_URL || "https://www.fiverr.com/s/9ddalgY";

/** Public base URL. On Vercel it falls back to the project's production domain automatically. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3010");
