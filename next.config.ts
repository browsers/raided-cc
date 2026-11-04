import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` see the D1 binding (a local copy of the database).
initOpenNextCloudflareForDev();

const isProd = process.env.NODE_ENV === "production";

// Content-Security-Policy. Allowed outside hosts:
//  - challenges.cloudflare.com  Turnstile (script, iframe, verify calls)
//  - cdn.discordapp.com         Discord avatar on the dock
//  - the r2.dev host            public R2 images (uploads themselves come from /api/media)
// 'unsafe-inline' is needed for Next's inline bootstrap scripts and styles;
// 'unsafe-eval' is only added in dev (React refresh needs it).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"} https://challenges.cloudflare.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.discordapp.com https://pub-2571b04268934180bb7b28f6991abd5f.r2.dev",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self' https://challenges.cloudflare.com${isProd ? "" : " ws: wss:"}`,
  "frame-src https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Only meaningful over https, so skipped in local dev.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pub-2571b04268934180bb7b28f6991abd5f.r2.dev",
      },
    ],
  },
};

export default nextConfig;