import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Lets `next dev` see the D1 binding (a local copy of the database).
initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  reactStrictMode: true,
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