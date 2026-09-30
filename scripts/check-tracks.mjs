#!/usr/bin/env node
/**
 * Sanity-checks src/data/manifest.json:
 *   - every entry parses into a track (no unrecognised folders / file names)
 *   - track ids are unique
 *   - each cell line has the expected 19 files
 *
 * With --head it also sends a HEAD request to every URL and reports anything
 * that does not answer 200 (needs network access; ~114 requests).
 *
 *   node scripts/check-tracks.mjs
 *   node scripts/check-tracks.mjs --head
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(readFileSync(resolve(here, "../src/data/manifest.json"), "utf8"));

const EXPECTED_PER_CELL_LINE = 19;
const EXPECTED_FOLDERS = ["abc", "atac_seq", "delta", "hic", "mustache", "rna_seq"];

let failures = 0;
const fail = (msg) => {
  failures += 1;
  console.error("✗ " + msg);
};

// --- structural checks -----------------------------------------------------
const byCell = new Map();
for (const f of manifest.files) {
  if (!byCell.has(f.cellLine)) byCell.set(f.cellLine, []);
  byCell.get(f.cellLine).push(f);

  const [cell, folder] = f.path.split("/");
  if (cell !== f.cellLine) fail(`cellLine mismatch: ${f.path}`);
  if (!EXPECTED_FOLDERS.includes(folder)) fail(`unexpected folder in ${f.path}`);
  if (!/\.(bw|bigwig|bb|bigbed)$/i.test(f.path)) fail(`unexpected extension: ${f.path}`);
  if (folder === "atac_seq") {
    const rep = f.path.split("/")[2];
    if (!["pooled", "rep1", "rep2", "rep3"].includes(rep)) fail(`unexpected ATAC replicate folder: ${f.path}`);
    const name = f.path.split("/").pop();
    if (!(name.includes(".fc.signal") || name.includes(".pval.signal") || /narrowpeak/i.test(name)))
      fail(`ATAC file of unknown kind: ${f.path}`);
  }
  if (folder === "rna_seq" && !/^rep\d/i.test(f.path.split("/").pop())) fail(`RNA file without repN prefix: ${f.path}`);
}

for (const [cell, files] of byCell) {
  if (files.length !== EXPECTED_PER_CELL_LINE)
    fail(`${cell}: expected ${EXPECTED_PER_CELL_LINE} files, found ${files.length}`);
}

const paths = new Set(manifest.files.map((f) => f.path));
if (paths.size !== manifest.files.length) fail("duplicate paths in manifest");

console.log(`Manifest: ${manifest.files.length} files across ${byCell.size} cell lines (root ${manifest.root})`);
for (const [cell, files] of byCell) console.log(`  ${cell.padEnd(9)} ${files.length} files`);

// --- optional HEAD check -----------------------------------------------------
if (process.argv.includes("--head")) {
  console.log("\nHEAD-checking every URL…");
  const results = await Promise.allSettled(
    manifest.files.map(async (f) => {
      const url = manifest.root + f.path;
      const res = await fetch(url, { method: "HEAD" });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      const ranges = res.headers.get("accept-ranges");
      if (ranges && ranges !== "bytes") throw new Error(`no byte-range support (${ranges}) ${url}`);
      return url;
    }),
  );
  let ok = 0;
  for (const r of results) {
    if (r.status === "fulfilled") ok += 1;
    else fail(r.reason.message);
  }
  console.log(`${ok}/${results.length} URLs answered 200`);
}

if (failures) {
  console.error(`\n${failures} problem(s) found`);
  process.exit(1);
}
console.log("\n✓ manifest looks good");
