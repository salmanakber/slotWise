import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Version-3 maps for Webflow Marketplace review. prepare-review-artifacts.mjs
    // zips them to source-maps.zip (private upload) and strips them from dist
    // before bundle.zip so maps are not shipped in the public extension.
    sourcemap: true,
    assetsInlineLimit: 4096,
  },
  server: {
    port: 1337,
    cors: true,
  },
});

