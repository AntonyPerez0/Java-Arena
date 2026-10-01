// Replays every program of the lessons and drills in the browser engine (headless Chromium, the built site's
// own worker code) and compares with the reference JDK's results, which scripts/build-content.mjs
// wrote to fidelity/out/content-checks.json: every solution on every test input, every example,
// and javac's exact message for every example that must not compile. Where a test checks the
// files a program writes, every file the run leaves in its folder is compared too.
// Usage: npm run build && node scripts/content-browser.mjs
// CONTENT_ONLY=<regular expression> replays only the programs whose place matches (while working on something).
import { readFileSync, existsSync } from "node:fs";
import { launchChromium } from "./browser.mjs";
import { serve } from "./serve.mjs";
import { normalizeOutput } from "../src/grader/assemble.js";
import { JUNIT_LIBRARY, usesJUnit } from "../src/grader/junit.js";
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
const t0 = Date.now();
for (const c of checks) {
  const got = await page.evaluate(async ({ files, mainClass, inputs, libraries }) => {
    const r = await window.javaArena.compile(files, { libraries });
    if (!r.ok || !inputs) return { compile: { ok: r.ok, output: r.output, internalError: r.internalError }, runs: [] };
    const runs = await window.javaArena.runClasses(r.classes, mainClass, inputs, 30_000, { libraries });
    return { compile: { ok: r.ok, output: r.output }, runs: runs.map((x) => ({ stdout: x.stdout, stderr: x.stderr, exitCode: x.exitCode, timedOut: x.timedOut, internalError: x.internalError, files: x.files })) };
  }, { files: c.files, mainClass: c.mainClass ?? "Main", inputs: c.kind === "run" ? c.tests.map((t) => ({ stdin: t.stdin, ...(t.args ? { args: t.args } : {}), ...(t.files ? { files: t.files } : {}) })) : null, libraries: usesJUnit(c.files) ? [JUNIT_LIBRARY] : [] });
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
        // A test that checks written files: the folder must hold the same files, with the same text.
        if (t.written) {
          const want = Object.keys(t.written).sort();
          const have = Object.keys(r.files ?? {}).sort();
          if (want.join("\n") !== have.join("\n")) problems.push(`input ${i + 1}: leaves the files ${have.join(", ") || "(none)"} in its folder, the JDK ${want.join(", ") || "(none)"}`);
          else for (const name of want) if (r.files[name] !== t.written[name]) problems.push(`input ${i + 1}: the file ${name} differs\n--- JDK\n${t.written[name]}--- browser\n${r.files[name]}`);
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
console.log(`${checks.length - failures} of ${checks.length} lesson programs (${runs} runs) behave the same in the browser engine as on ${jdk}, in ${((Date.now() - t0) / 1000).toFixed(1)}s.`);
process.exit(failures ? 1 : 0);
