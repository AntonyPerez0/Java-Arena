// Replays every program of the lessons and drills in the browser engine (headless Chromium, the built site's
// own worker code) and compares with the reference JDK's results, which scripts/build-content.mjs
// wrote to fidelity/out/content-checks.json: every solution on every test input, every example,
// and javac's exact message for every example that must not compile. Where a test checks the
// files a program writes, every file the run leaves in its folder is compared too, and a JavaFX
// program's window (.arena/window.json, after a test's clicks and typing or an example's events
// block) is compared byte for byte. An image of content/assets that a test or an example gives the
// program is fetched from the built site, as the grader fetches it.
// Usage: npm run build && node scripts/content-browser.mjs
// CONTENT_ONLY=<regular expression> replays only the programs whose place matches (while working on something).
// A program whose runs with frames (a game) take more than 3 seconds each is listed as SLOW at the end, without failing.
import { readFileSync, existsSync } from "node:fs";
import { launchChromium } from "./browser.mjs";
import { serve } from "./serve.mjs";
import { normalizeOutput } from "../src/grader/assemble.js";
import { WINDOW_FILE, withoutArenaFiles } from "../src/grader/javafx.js";
import { librariesFor } from "../src/grader/libraries.js";
import { TEST_FRAMES_WARN, framesInEvents, withEventsFile } from "../src/grader/window.ts";
import { stderrKey } from "./fidelity/suite.mjs";

const file = new URL("../fidelity/out/content-checks.json", import.meta.url).pathname;
if (!existsSync(file)) {
  console.error("content-browser: run scripts/build-content.mjs first");
  process.exit(1);
}
const all = JSON.parse(readFileSync(file, "utf8"));
const only = process.env.CONTENT_ONLY ? new RegExp(process.env.CONTENT_ONLY, "i") : null;
const { jdk } = all;
const checks = only ? all.checks.filter((c) => only.test(c.where)) : all.checks;

const { server, url } = await serve();
const browser = await launchChromium();
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
await page.goto(url + "harness/?nosw");
await page.evaluate(() => window.javaArena.engineReady());

let failures = 0;
let runs = 0;
/** Programs whose runs with frames took longer than a game's test should here (see "slow" below). */
const slow = [];
/** A file's contents for a message: its text, or how many bytes a binary one has. */
const shown = (v) => (typeof v === "string" ? v : `(${Buffer.from(v?.binary ?? "", "base64").length} bytes that aren't text)\n`);
const t0 = Date.now();
for (const c of checks) {
  const got = await page.evaluate(async ({ files, mainClass, inputs, libraries, base }) => {
    const r = await window.javaArena.compile(files, { libraries });
    if (!r.ok || !inputs) return { compile: { ok: r.ok, output: r.output, internalError: r.internalError }, runs: [] };
    // An image (an AssetFile: { asset, url, ... }) is fetched from the site; text stays as it is.
    const bytes = async (v) => {
      const res = await fetch(base + v.url);
      if (!res.ok) throw new Error(`the image ${v.url} isn't on the built site (HTTP ${res.status})`);
      return new Uint8Array(await res.arrayBuffer());
    };
    const given = await Promise.all(inputs.map(async (input) => (input.files ? { ...input, files: Object.fromEntries(await Promise.all(Object.entries(input.files).map(async ([n, v]) => [n, typeof v === "string" ? v : await bytes(v)]))) } : input)));
    // Only the runs are timed (not the compile, the images' fetches or the way back to Node): that is what a test's frames cost.
    const runStarted = performance.now();
    const runs = await window.javaArena.runClasses(r.classes, mainClass, given, 30_000, { libraries });
    const runMs = performance.now() - runStarted;
    // A file that isn't text comes back as its bytes: as base64, which crosses to Node as text.
    const b64 = (u8) => {
      let s = "";
      for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000));
      return btoa(s);
    };
    const left = (fs) => fs && Object.fromEntries(Object.entries(fs).map(([n, v]) => [n, typeof v === "string" ? v : { binary: b64(v) }]));
    return { compile: { ok: r.ok, output: r.output }, runMs, runs: runs.map((x) => ({ stdout: x.stdout, stderr: x.stderr, exitCode: x.exitCode, timedOut: x.timedOut, internalError: x.internalError, files: left(x.files) })) };
  }, { files: c.files, mainClass: c.mainClass ?? "Main", inputs: c.kind === "run" ? c.tests.map((t) => ({ stdin: t.stdin, ...(t.args ? { args: t.args } : {}), ...(t.events ? { files: withEventsFile(t.files, t.events) } : t.files ? { files: t.files } : {}) })) : null, libraries: librariesFor(c.files), base: url });
  // A game's test runs in the learner's browser every time it's checked: its frames should take
  // seconds, not more (TEST_FRAMES_WARN frames of a small game take about 3 seconds here). Timed in
  // the page around the runs alone, so the compile (once per check) doesn't count.
  const frames = c.kind === "run" ? c.tests.reduce((n, t) => n + framesInEvents(t.events ?? []), 0) : 0;
  const seconds = (got.runMs ?? 0) / 1000;
  if (frames && seconds / c.tests.length > 3) slow.push(`${c.where}: ${c.tests.length} run${c.tests.length > 1 ? "s" : ""} with ${frames} frames in all took ${seconds.toFixed(1)}s, not counting the compile (keep a test to ${TEST_FRAMES_WARN} frames of a small game, about 3 seconds)`);
  const problems = [];
  if (got.compile.internalError) problems.push(`engine error: ${got.compile.internalError}`);
  else if (c.kind === "error") {
    if (got.compile.ok) problems.push("compiles in the browser, but not on the JDK");
    else if (got.compile.output !== c.javac) problems.push(`javac prints\n${c.javac}\nbut the browser compiler prints\n${got.compile.output}`);
  } else if (!got.compile.ok) problems.push(`does not compile in the browser:\n${got.compile.output}`);
  else if (c.kind === "compiles") {
    // Compiling is the whole check ("Will it compile?" drills whose answer is yes).
  } else {
    c.tests.forEach((t, i) => {
      const r = got.runs[i];
      runs++;
      if (!r || r.internalError) problems.push(`input ${i + 1}: engine error ${r?.internalError}`);
      else if (r.timedOut) problems.push(`input ${i + 1}: timed out`);
      else {
        if (r.exitCode !== t.exitCode) problems.push(`input ${i + 1}: exit code ${r.exitCode}, the JDK gives ${t.exitCode}`);
        if (r.stdout !== t.stdout) problems.push(`input ${i + 1}: output differs${normalizeOutput(r.stdout) === normalizeOutput(t.stdout) ? " (only in trailing spaces or blank lines)" : ""}\n--- JDK\n${t.stdout}--- browser\n${r.stdout}`);
        // A lesson example that crashes on purpose must crash the same way: the exception line and the program's own frames.
        if (t.stderrKey != null) {
          if (stderrKey(r.stderr) !== t.stderrKey) problems.push(`input ${i + 1}: crashes differently\n--- JDK\n${t.stderrKey}\n--- browser\n${stderrKey(r.stderr)}`);
        } else if (r.stderr) problems.push(`input ${i + 1}: printed an error in the browser:\n${r.stderr}`);
        // A JavaFX program's window, as the library wrote it (null: none), must be the same bytes.
        if (t.window !== undefined) {
          const got = r.files?.[WINDOW_FILE] ?? null;
          if (got !== t.window) problems.push(`input ${i + 1}: the window differs${t.events?.length ? ` (after ${t.events.length} event${t.events.length > 1 ? "s" : ""})` : ""}\n--- JDK\n${t.window}\n--- browser\n${got}`);
        }
        // A test that checks written files: the folder must hold the same files, with the same text
        // (not counting Java Arena's own files in .arena/, which are never compared as written files).
        if (t.written) {
          r.files = withoutArenaFiles(r.files ?? {});
          const want = Object.keys(t.written).sort();
          const have = Object.keys(r.files).sort();
          if (want.join("\n") !== have.join("\n")) problems.push(`input ${i + 1}: leaves the files ${have.join(", ") || "(none)"} in its folder, the JDK ${want.join(", ") || "(none)"}`);
          // Text as it is, and a file that isn't text as its bytes in base64 ({ binary }), on both sides.
          else for (const name of want) if (JSON.stringify(r.files[name]) !== JSON.stringify(t.written[name])) problems.push(`input ${i + 1}: the file ${name} differs\n--- JDK\n${shown(t.written[name])}--- browser\n${shown(r.files[name])}`);
        }
      }
    });
  }
  if (problems.length) {
    failures++;
    console.log(`FAIL ${c.where}\n  ${problems.join("\n  ")}`);
  }
}
await browser.close();
server.close();
// Not a failure (a busy machine is slower), but worth a look.
for (const s of slow) console.log(`SLOW ${s}`);
console.log(`${checks.length - failures} of ${checks.length} lesson programs (${runs} runs) behave the same in the browser engine as on ${jdk}, in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
process.exit(failures ? 1 : 0);
