import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // libSQL ships a native driver for local files; keep it out of the server bundle
  serverExternalPackages: ["@libsql/client", "libsql"],
  // render <title>/<meta> inside <head> for every client (not streamed into <body>), so every crawler and audit sees them
  htmlLimitedBots: /.*/,
  async headers() {
    return [{
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ]
    }];
  }
};

export default withNextIntl(nextConfig);
