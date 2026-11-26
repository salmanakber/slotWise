/**
 * Builds the Marketplace-reviewed in-page runtime:
 *   public/embed/widget.js (+ .map via write-widget-sourcemap.mjs)
 *
 * No iframes — React mounts into [data-slotwise-widget] on the customer page.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const esbuild = require("esbuild");

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const embedDir = join(root, "src", "embed");
const outDir = join(root, "public", "embed");
const cssIn = join(embedDir, "embed.css");
const cssGenerated = join(embedDir, "embed.generated.css");
const entry = join(embedDir, "main.tsx");
const outJs = join(outDir, "widget.js");

mkdirSync(outDir, { recursive: true });

console.log("Building embed CSS…");
execSync(
  `npx @tailwindcss/cli -i "${cssIn}" -o "${cssGenerated}" --minify`,
  { cwd: root, stdio: "inherit" },
);

console.log("Bundling widget.js…");
await esbuild.build({
  absWorkingDir: root,
  entryPoints: [entry],
  outfile: outJs,
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  jsx: "automatic",
  minify: true,
  sourcemap: "external",
  legalComments: "none",
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  alias: {
    "@": join(root, "src"),
  },
  loader: {
    ".css": "text",
  },
  logLevel: "info",
});

// Keep esbuild's external map as the reviewable widget.js.map
if (!existsSync(`${outJs}.map`)) {
  throw new Error("esbuild did not emit widget.js.map");
}

let js = readFileSync(outJs, "utf8");
if (!/sourceMappingURL=widget\.js\.map/.test(js)) {
  js = `${js.replace(/\n?\/\/[#@]\s*sourceMappingURL=.*$/m, "")}\n//# sourceMappingURL=widget.js.map\n`;
  writeFileSync(outJs, js);
}

execSync(`node "${join(root, "scripts", "write-widget-sri.mjs")}"`, {
  cwd: root,
  stdio: "inherit",
});

console.log("Embed runtime ready:", outJs);
