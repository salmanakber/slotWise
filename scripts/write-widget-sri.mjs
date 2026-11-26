/**
 * Writes public/embed/widget.sri.txt for the current widget.js bytes.
 * Does not rewrite widget.js.map (esbuild emits the reviewable map).
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const widgetPath = join(root, "public", "embed", "widget.js");
const sriPath = join(root, "public", "embed", "widget.sri.txt");

const bytes = readFileSync(widgetPath);
const sha256Hex = createHash("sha256").update(bytes).digest("hex");
const sha256B64 = createHash("sha256").update(bytes).digest("base64");
const integrity = `sha256-${sha256B64}`;
writeFileSync(
  sriPath,
  [
    `integrity=${integrity}`,
    `sha256-hex=${sha256Hex}`,
    `url=https://slotwise.hindaralabs.com/embed/widget.js`,
    `script=<script src="https://slotwise.hindaralabs.com/embed/widget.js" integrity="${integrity}" crossorigin="anonymous"></script>`,
    "",
  ].join("\n"),
);
console.log("Wrote", sriPath);
console.log(integrity);
console.log("sha256-hex=" + sha256Hex);
