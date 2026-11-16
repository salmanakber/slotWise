import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 4096,
  },
  server: {
    port: 1337,
    cors: true,
  },
});
