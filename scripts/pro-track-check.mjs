// Checks the Pro Track's projects (pro-track/<id>/, model solutions in pro-track-solutions/<id>/)
// with real Maven, as the CI job pro-track does:
//   1. the folder rules (scripts/pro-track/project.mjs: pom.xml, README.md, the workflow, TODOs,
//      the solution's files), without Maven;
//   2. the starter, in a copy: mvn -B -q test must compile the code and the tests and then fail
//      some tests (the learner has work to do);
//   3. the starter with the solution's files copied over it, in another copy: mvn -B test must
//      pass, with no test failed, erred or skipped, and at least as many tests run as in 2.
// Copies go in a temporary folder, so the project folders never get a target/.
//
// Usage: npm run pro-track-check [-- <id> ...] [-- --offline]
// Maven: $MVN, else mvn on the PATH, else /opt/maven/bin/mvn. Java: $JAVA_HOME (a JDK 21).
// It runs on Linux and macOS; on Windows, it runs mvn.cmd through cmd.exe (the CI job runs on Linux).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { folderProblems, layoutProblems, projectIds, readSurefire } from "./pro-track/project.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const offline = args.includes("--offline");
const wanted = args.filter((a) => !a.startsWith("--"));

function findMaven() {
  if (process.env.MVN) return process.env.MVN;
  const onPath = spawnSync(process.platform === "win32" ? "where" : "which", ["mvn"], { encoding: "utf8" });
  const found = onPath.status === 0 ? onPath.stdout.trim().split(/\r?\n/).filter(Boolean) : [];
  // On Windows, where lists the extensionless shell script (for Git Bash) before mvn.cmd.
  const pick = process.platform === "win32" ? found.find((f) => /\.(cmd|bat)$/i.test(f)) : found[0];
  if (pick) return pick;
  if (fs.existsSync("/opt/maven/bin/mvn")) return "/opt/maven/bin/mvn";
  return null;
}

const ids = projectIds(ROOT);
const unknown = wanted.filter((w) => !ids.includes(w));
if (unknown.length) {
  console.error(`pro-track-check: no project ${unknown.join(", ")} in pro-track/ (there ${ids.length === 1 ? "is" : "are"}: ${ids.join(", ") || "none"})`);
  process.exit(1);
}
const todo = wanted.length ? wanted : ids;

// 1. The folders, without Maven.
const problems = [...layoutProblems(ROOT), ...todo.flatMap((id) => folderProblems(ROOT, id))];
if (problems.length) {
  console.error(`pro-track-check: ${problems.length} problem${problems.length === 1 ? "" : "s"} in the project folders:\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
if (!todo.length) {
  console.log("pro-track-check: no projects in pro-track/ yet; nothing to run");
  process.exit(0);
}
const mvn = findMaven();
if (!mvn) {
  console.error("pro-track-check: Maven not found: put mvn on the PATH or set MVN to its path");
  process.exit(1);
}

/** Runs Maven in dir; returns its exit status and output. */
function maven(dir, goals) {
  const t = Date.now();
  const argv = ["-B", ...(offline ? ["-o"] : []), ...goals];
  const options = { cwd: dir, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: process.env };
  // Node runs a .cmd or .bat only through cmd.exe (spawning it directly fails with EINVAL); quoted, for a path with spaces.
  const r = /\.(cmd|bat)$/i.test(mvn) ? spawnSync(`"${mvn}"`, argv, { ...options, shell: true }) : spawnSync(mvn, argv, options);
  if (r.error) throw r.error;
  return { status: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}`, seconds: ((Date.now() - t) / 1000).toFixed(1) };
}
/** What to show of Maven's output: javac's errors when there are some, else the last lines. */
function tail(out, n = 40) {
  const lines = out.trimEnd().split("\n").filter((l) => !/^Picked up JAVA_TOOL_OPTIONS/.test(l));
  const javac = lines.filter((l) => /\[ERROR\].*\.java:\[\d+/.test(l));
  return (javac.length ? javac.slice(0, n) : lines.slice(-n)).join("\n    ");
}
const copyStarter = (id, to) => fs.cpSync(path.join(ROOT, "pro-track", id), to, { recursive: true, filter: (src) => !/[\\/]target([\\/]|$)/.test(path.relative(path.join(ROOT, "pro-track", id), src)) });

const work = fs.mkdtempSync(path.join(os.tmpdir(), "pro-track-check-"));
let failed = 0;
for (const id of todo) {
  // 2. The starter compiles, and some of its tests fail.
  const starter = path.join(work, id, "starter");
  copyStarter(id, starter);
  const a = maven(starter, ["-q", "test"]);
  const ra = readSurefire(starter);
  const compiled = fs.existsSync(path.join(starter, "target", "classes")) && fs.existsSync(path.join(starter, "target", "test-classes"));
  if (!ra || !compiled) {
    failed++;
    console.error(`FAIL ${id}: the starter doesn't compile (or its tests never ran), so the learner can't start from it:\n    ${tail(a.out)}`);
    continue;
  }
  if (a.status === 0 || ra.failures + ra.errors === 0) {
    failed++;
    console.error(`FAIL ${id}: every test passes on the starter (${ra.tests} tests), so there's nothing to do; the starter's methods must leave tests failing`);
    continue;
  }
  // 3. The starter with the solution's files passes every test.
  const solved = path.join(work, id, "solved");
  copyStarter(id, solved);
  fs.cpSync(path.join(ROOT, "pro-track-solutions", id), solved, { recursive: true });
  const b = maven(solved, ["test"]);
  const rb = readSurefire(solved);
  if (b.status !== 0 || !rb || rb.failures + rb.errors + rb.skipped > 0 || rb.tests === 0) {
    failed++;
    const why = !rb ? "it doesn't compile, or the tests never ran" : `${rb.failures} failed, ${rb.errors} erred, ${rb.skipped} skipped of ${rb.tests}${rb.failed.length ? `: ${rb.failed.join(", ")}` : ""}`;
    console.error(`FAIL ${id}: the model solution doesn't pass (${why}):\n    ${tail(b.out)}`);
    continue;
  }
  if (rb.tests < ra.tests) {
    failed++;
    console.error(`FAIL ${id}: ${rb.tests} tests ran on the solution but ${ra.tests} on the starter; they must be the same tests`);
    continue;
  }
  console.log(`  ok  ${id}: the starter compiles and fails ${ra.failures + ra.errors} of ${ra.tests} tests (${a.seconds} s); with the solution all ${rb.tests} pass (${b.seconds} s)`);
}
fs.rmSync(work, { recursive: true, force: true });
if (failed) {
  console.error(`pro-track-check: ${failed} of ${todo.length} project${todo.length === 1 ? "" : "s"} failed`);
  process.exit(1);
}
console.log(`pro-track-check: ${todo.length} project${todo.length === 1 ? "" : "s"} ok`);
