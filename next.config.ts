import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid picking a parent workspace lockfile outside this repo
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [],
  },
  // SRI on published Webflow pages needs CORS on the runtime script.
  async headers() {
    return [
      {
        source: "/embed/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, HEAD, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
          { key: "Timing-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default nextConfig;
