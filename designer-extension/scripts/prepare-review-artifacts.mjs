/**
 * Webflow Marketplace review requires:
 * - Version-3 source maps for every minified production asset
 * - Maps uploaded as a *private* artifact next to bundle.zip (NOT inside the public bundle)
 *
 * This script runs after `vite build`:
 * 1. Zips all .map files from dist → source-maps.zip
 * 2. Strips sourceMappingURL comments from JS/CSS in dist
 * 3. Deletes .map files from dist so `webflow extension bundle` stays clean
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { finished } from "node:stream/promises";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const outZip = join(root, "source-maps.zip");

function walk(dir, acc = []) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, name.name);
    if (name.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

if (!existsSync(dist)) {
  console.error("dist/ missing — run vite build first");
  process.exit(1);
}

const all = walk(dist);
const maps = all.filter((f) => f.endsWith(".map"));
if (maps.length === 0) {
  console.error("No .map files in dist/. Set build.sourcemap: true in vite.config.ts");
  process.exit(1);
}

// Prefer system `zip` when available; fall back to a tiny store-only zip via Node.
async function zipWithSystemZip() {
  const { spawnSync } = await import("node:child_process");
  const relMaps = maps.map((f) => relative(dist, f));
  const r = spawnSync("zip", ["-q", "-r", outZip, ...relMaps], {
    cwd: dist,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(r.stderr || "zip failed");
}

async function zipWithNode() {
  // Minimal ZIP (store only) — good enough for small source maps.
  const { deflateSync } = await import("node:zlib");
  const entries = [];
  let offset = 0;
  const parts = [];

  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      c ^= buf[i];
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
    }
    return ~c >>> 0;
  }

  function u16(n) {
    const b = Buffer.alloc(2);
    b.writeUInt16LE(n, 0);
    return b;
  }
  function u32(n) {
    const b = Buffer.alloc(4);
    b.writeUInt32LE(n >>> 0, 0);
    return b;
  }

  for (const file of maps) {
    const name = relative(dist, file).replace(/\\/g, "/");
    const data = readFileSync(file);
    const compressed = deflateSync(data);
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);
    const local = Buffer.concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(data.length),
      u16(nameBuf.length),
      u16(0),
      nameBuf,
      compressed,
    ]);
    entries.push({
      nameBuf,
      crc,
      comp: compressed.length,
      raw: data.length,
      offset,
    });
    parts.push(local);
    offset += local.length;
  }

  const centralParts = [];
  let centralSize = 0;
  for (const e of entries) {
    const hdr = Buffer.concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(8),
      u16(0),
      u16(0),
      u32(e.crc),
      u32(e.comp),
      u32(e.raw),
      u16(e.nameBuf.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(e.offset),
      e.nameBuf,
    ]);
    centralParts.push(hdr);
    centralSize += hdr.length;
  }
  const end = Buffer.concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralSize),
    u32(offset),
    u16(0),
  ]);
  writeFileSync(outZip, Buffer.concat([...parts, ...centralParts, end]));
}

try {
  if (existsSync(outZip)) unlinkSync(outZip);
  try {
    await zipWithSystemZip();
  } catch {
    await zipWithNode();
  }
} catch (e) {
  console.error("Failed to write source-maps.zip:", e);
  process.exit(1);
}

const stripRe = /\n?\/\/[#@]\s*sourceMappingURL=.*$/gm;
const cssStripRe = /\n?\/\*#\s*sourceMappingURL=.*?\*\//gm;

for (const file of all) {
  if (file.endsWith(".js") || file.endsWith(".css")) {
    const before = readFileSync(file, "utf8");
    const after = before.replace(stripRe, "").replace(cssStripRe, "");
    if (after !== before) writeFileSync(file, after);
  }
}

for (const map of maps) unlinkSync(map);

console.log(`Wrote ${relative(root, outZip)} (${maps.length} map file(s))`);
console.log("Stripped sourceMappingURL from dist and removed .map files (public bundle stays clean).");
console.log("Upload source-maps.zip as the private source-map artifact next to bundle.zip.");
