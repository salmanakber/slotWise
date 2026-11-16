import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Avoid picking a parent workspace lockfile outside this repo
  outputFileTracingRoot: path.join(__dirname),
  images: {
    remotePatterns: [],
  },
};

export default nextConfig;
