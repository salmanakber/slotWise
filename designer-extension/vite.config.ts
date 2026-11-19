import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  css: {
    // Helps local/dev; production CSS maps are ensured in prepare-review-artifacts.mjs
    // because Vite often omits .css.map even when build.sourcemap is true.
    devSourcemap: true,
  },
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

