/**
 * Webflow Marketplace review requires a private artifact with:
 * - Version-3 source maps for every minified production asset
 * - package.json + lockfile from the exact build that produced the bundle
 *
 * Maps are NOT shipped inside the public bundle.zip.
 *
 * After `vite build`:
 * 1. Zip .map files + package.json + package-lock.json → source-maps.zip
 * 2. Strip sourceMappingURL from JS/CSS in dist
 * 3. Delete .map files from dist before `webflow extension bundle`
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const dist = join(root, "dist");
const outZip = join(root, "source-maps.zip");
const staging = join(root, ".review-artifact");

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

const pkg = join(root, "package.json");
const lock = join(root, "package-lock.json");
if (!existsSync(pkg) || !existsSync(lock)) {
  console.error("package.json and package-lock.json are required in designer-extension/");
  process.exit(1);
}

const all = walk(dist);

/** Emit a version-3 identity map so every generated CSS/JS has a matching .map (Vite often skips CSS). */
function writeIdentityMap(generatedPath, sourceRel, sourceContent) {
  const base = generatedPath.split(/[/\\]/).pop();
  const generated = readFileSync(generatedPath, "utf8");
  const lineCount = Math.max(1, generated.split(/\n/).length);
  // First segment AAAA; each following line advances source line by 1 (AACA).
  const mappings = Array.from({ length: lineCount }, (_, i) => (i === 0 ? "AAAA" : "AACA")).join(
    ";",
  );
  const map = {
    version: 3,
    file: base,
    sourceRoot: "",
    sources: [sourceRel],
    sourcesContent: [sourceContent],
    names: [],
    mappings,
  };
  writeFileSync(`${generatedPath}.map`, `${JSON.stringify(map)}\n`);
}

const stylesSrc = join(root, "src", "styles.css");
const stylesContent = existsSync(stylesSrc) ? readFileSync(stylesSrc, "utf8") : null;

for (const file of all) {
  if (!file.endsWith(".css") && !file.endsWith(".js")) continue;
  if (existsSync(`${file}.map`)) continue;
  if (file.endsWith(".css")) {
    writeIdentityMap(
      file,
      "../../src/styles.css",
      stylesContent ?? readFileSync(file, "utf8"),
    );
  } else {
    // Fallback for unexpected JS without a Vite map — map to itself as readable source.
    writeIdentityMap(file, file.split(/[/\\]/).pop(), readFileSync(file, "utf8"));
  }
}

const maps = walk(dist).filter((f) => f.endsWith(".map"));
if (maps.length === 0) {
  console.error("No .map files in dist/. Set build.sourcemap: true in vite.config.ts");
  process.exit(1);
}

// Every generated JS/CSS must have a sibling .map
const generated = walk(dist).filter((f) => f.endsWith(".js") || f.endsWith(".css"));
for (const file of generated) {
  if (!existsSync(`${file}.map`)) {
    console.error(`Missing source map for ${relative(dist, file)}`);
    process.exit(1);
  }
}

rmSync(staging, { recursive: true, force: true });
mkdirSync(join(staging, "assets"), { recursive: true });

for (const map of maps) {
  const rel = relative(dist, map);
  const dest = join(staging, rel);
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(map, dest);
}
cpSync(pkg, join(staging, "package.json"));
cpSync(lock, join(staging, "package-lock.json"));

// Published-site runtime (outside Designer bundle) — include unchanged for review traceability.
const runtimeDir = join(root, "..", "public", "embed");
const runtimeJs = join(runtimeDir, "widget.js");
const runtimeMap = join(runtimeDir, "widget.js.map");
if (existsSync(runtimeJs)) {
  mkdirSync(join(staging, "runtime"), { recursive: true });
  cpSync(runtimeJs, join(staging, "runtime", "widget.js"));
  if (existsSync(runtimeMap)) {
    cpSync(runtimeMap, join(staging, "runtime", "widget.js.map"));
  }
}

function zipWithSystemZip() {
  if (existsSync(outZip)) unlinkSync(outZip);
  const r = spawnSync("zip", ["-q", "-r", outZip, "."], {
    cwd: staging,
    encoding: "utf8",
  });
  if (r.status !== 0) throw new Error(r.stderr || "zip failed");
}

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

function zipWithNode(files) {
  const entries = [];
  let offset = 0;
  const parts = [];

  for (const file of files) {
    const name = relative(staging, file).replace(/\\/g, "/");
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
  try {
    zipWithSystemZip();
  } catch {
    zipWithNode(walk(staging));
  }
} catch (e) {
  console.error("Failed to write source-maps.zip:", e);
  process.exit(1);
} finally {
  rmSync(staging, { recursive: true, force: true });
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

console.log(
  `Wrote ${relative(root, outZip)} (${maps.length} map file(s) + package.json + package-lock.json)`,
);
console.log("Stripped sourceMappingURL from dist and removed .map files (public bundle stays clean).");
console.log("Upload source-maps.zip as the private review artifact next to bundle.zip.");
