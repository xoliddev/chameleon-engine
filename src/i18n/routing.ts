import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["en", "ru", "uz"],
  defaultLocale: "en",
  // English is the default market: "/" is always EN, "/ru" and "/uz" are explicit
  localePrefix: "as-needed",
  localeDetection: false
});

export type Locale = (typeof routing.locales)[number];
