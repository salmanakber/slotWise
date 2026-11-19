/**
 * Writes public/embed/widget.js.map (version-3) next to the runtime file
 * so Marketplace preflight can trace widget.js to readable source.
 */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const widgetPath = join(root, "public", "embed", "widget.js");
const mapPath = join(root, "public", "embed", "widget.js.map");
const sriPath = join(root, "public", "embed", "widget.sri.txt");

const source = readFileSync(widgetPath, "utf8");
// Strip the sourceMappingURL line for sourcesContent so the map points at readable source body.
const sourcesContent = source.replace(/\n?\/\/[#@]\s*sourceMappingURL=.*$/m, "\n");
const lineCount = Math.max(1, sourcesContent.split(/\n/).length);
const mappings = Array.from({ length: lineCount }, (_, i) => (i === 0 ? "AAAA" : "AACA")).join(";");

const map = {
  version: 3,
  file: "widget.js",
  sourceRoot: "",
  sources: ["widget.js"],
  sourcesContent: [sourcesContent],
  names: [],
  mappings,
};

writeFileSync(mapPath, `${JSON.stringify(map)}\n`);

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

console.log("Wrote", mapPath);
console.log("Wrote", sriPath);
console.log(integrity);
