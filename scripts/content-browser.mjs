// Replays every program of the lessons in the browser engine (headless Chromium, the built site's
// own worker code) and compares with the reference JDK's results, which scripts/build-content.mjs
// wrote to fidelity/out/content-checks.json: every solution on every test input, every example,
// and javac's exact message for every example that must not compile.
// Usage: npm run build && node scripts/content-browser.mjs
import { readFileSync, existsSync } from "node:fs";
import { launchChromium } from "./browser.mjs";
import { serve } from "./serve.mjs";
import { normalizeOutput } from "../src/grader/assemble.js";

const file = new URL("../fidelity/out/content-checks.json", import.meta.url).pathname;
if (!existsSync(file)) {
  console.error("content-browser: run scripts/build-content.mjs first");
  process.exit(1);
}
const { jdk, checks } = JSON.parse(readFileSync(file, "utf8"));

const { server, url } = await serve();
const browser = await launchChromium();
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.error("[page]", m.text()));
await page.goto(url + "harness/?nosw");
await page.evaluate(() => window.javaArena.engineReady());

let failures = 0;
let runs = 0;
const t0 = Date.now();
for (const c of checks) {
  const got = await page.evaluate(async ({ files, inputs }) => {
    const r = await window.javaArena.compile(files);
    if (!r.ok || !inputs) return { compile: { ok: r.ok, output: r.output, internalError: r.internalError }, runs: [] };
    const runs = await window.javaArena.runClasses(r.classes, "Main", inputs, 30_000);
    return { compile: { ok: r.ok, output: r.output }, runs: runs.map((x) => ({ stdout: x.stdout, stderr: x.stderr, exitCode: x.exitCode, timedOut: x.timedOut, internalError: x.internalError })) };
  }, { files: c.files, inputs: c.kind === "run" ? c.tests.map((t) => ({ stdin: t.stdin })) : null });
  const problems = [];
  if (got.compile.internalError) problems.push(`engine error: ${got.compile.internalError}`);
  else if (c.kind === "error") {
    if (got.compile.ok) problems.push("compiles in the browser, but not on the JDK");
    else if (got.compile.output !== c.javac) problems.push(`javac prints\n${c.javac}\nbut the browser compiler prints\n${got.compile.output}`);
  } else if (!got.compile.ok) problems.push(`does not compile in the browser:\n${got.compile.output}`);
  else {
    c.tests.forEach((t, i) => {
      const r = got.runs[i];
      runs++;
      if (!r || r.internalError) problems.push(`input ${i + 1}: engine error ${r?.internalError}`);
      else if (r.timedOut) problems.push(`input ${i + 1}: timed out`);
      else {
        if (r.exitCode !== t.exitCode) problems.push(`input ${i + 1}: exit code ${r.exitCode}, the JDK gives ${t.exitCode}`);
        if (r.stdout !== t.stdout) problems.push(`input ${i + 1}: output differs${normalizeOutput(r.stdout) === normalizeOutput(t.stdout) ? " (only in trailing spaces or blank lines)" : ""}\n--- JDK\n${t.stdout}--- browser\n${r.stdout}`);
        if (r.stderr) problems.push(`input ${i + 1}: printed an error in the browser:\n${r.stderr}`);
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
console.log(`${checks.length - failures} of ${checks.length} lesson programs (${runs} runs) behave the same in the browser engine as on ${jdk}, in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
process.exit(failures ? 1 : 0);
