#!/usr/bin/env node
// Self-test for detect.js: run it against fixtures/defects.html via
// agent-browser, assert every seeded defect is found and no negative
// control is flagged. Usage: node scripts/selftest.mjs
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const fixture = pathToFileURL(join(here, "..", "fixtures", "defects.html")).href;
const detect = readFileSync(join(here, "detect.js"), "utf8");

const ab = (args, input) =>
  execFileSync("agent-browser", args, {
    input, encoding: "utf8", shell: process.platform === "win32",
  });

// A cold agent-browser daemon is forked by the first command and inherits its
// stdio pipes — execFileSync then hangs waiting for EOF. Warm it with ignored
// stdio so the real calls below get clean pipes.
try {
  execFileSync("agent-browser", ["open", "about:blank"], {
    stdio: "ignore", shell: process.platform === "win32",
  });
} catch { /* warmup only */ }

ab(["open", fixture]);
ab(["wait", "--load", "networkidle"]);
const raw = ab(["eval", "--stdin"], detect);
ab(["close"]);

let result = JSON.parse(raw.trim());
if (typeof result === "string") result = JSON.parse(result); // double-encoded

const MUST_FIND = {
  offenders: "#wide",
  clippedText: "#clipped",
  overlaps: "#overlap-a",
  tinyTapTargets: "#tiny",
  brokenImages: "missing.png",
  distortedImages: "#distorted",
  overflowingMedia: "#overflow-img",
  smallText: "#small",
  wrappedControls: "#wrapped",
  placeholderText: "#placeholder",
};
const NEVER_FLAG = ["#neg-ellipsis", "#neg-scroll", "#neg-inline-link", "#neg-iconbtn"];

const fails = [];
if (!result.viewportMetaMissing) fails.push("viewportMetaMissing: not detected");
if (!result.horizontalScroll) fails.push("horizontalScroll: not detected");
for (const [cat, marker] of Object.entries(MUST_FIND)) {
  const got = JSON.stringify(result[cat] ?? []);
  if (!got.includes(marker)) fails.push(`${cat}: expected ${marker}, got ${got}`);
}
if (!JSON.stringify(result.smallText).includes("#shadow-small"))
  fails.push("shadow DOM not pierced: #shadow-small missing from smallText");
if (!(result.fixedOverlays && result.fixedOverlays.pct >= 5))
  fails.push(`fixedOverlays: expected pct >= 5, got ${JSON.stringify(result.fixedOverlays)}`);
const dump = JSON.stringify(result);
for (const id of NEVER_FLAG)
  if (dump.includes(id)) fails.push(`false positive: ${id} was flagged`);

if (fails.length) {
  console.error("detect.js selftest FAIL\n- " + fails.join("\n- "));
  process.exit(1);
}
console.log("detect.js selftest OK: 12 categories + shadow DOM verified, 0 false positives");
