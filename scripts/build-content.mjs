// Builds src/generated/ (course.json and modules/<id>.json) from content/course.yaml and content/modules/*.yaml.
//
// Every reference solution and every example program in the lessons is compiled and run with the
// reference JDK (Eclipse Temurin 21.0.10+7, or JAVA_HOME). The expected outputs the site grades
// against come from those real runs, or are checked against them where the author wrote them down,
// so nothing is hand-typed guesswork. It also checks that starter code doesn't already pass, that
// every step has three challenges, and that solutions follow their own require/forbid rules.
//
// It also writes fidelity/out/content-checks.json: every program with its inputs and the JDK's
// results, which scripts/content-browser.mjs replays in the browser engine.
//
// Usage: node scripts/build-content.mjs [--no-cache] [--dry] [--drill-file <name>.yaml]
//   --dry         check only: write nothing (no cache, no generated files), so several checks can run at once
//   --drill-file  check only this file of content/drills, or placement.yaml (with --dry, for writing drills)
//   --module-file check only this file of content/modules and its drills (with --dry, for writing a module)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import YAML from "yaml";
import { CHECK_CLASS, CHECK_FILE, checkRules, checkSource, mainProgram, normalizeOutput, parseTemplate, templateSolution } from "../src/grader/assemble.js";
import { indentMessages } from "../src/grader/style.js";
import { FILE_MARK, joinFiles, splitFiles } from "../src/grader/files.js";
import { JUNIT_LIBRARY, TEST_RUNNER_CLASS, TEST_RUNNER_FILE, TEST_RUNNER_SOURCE, parseTestReport, testClassesOf, usesJUnit } from "../src/grader/junit.js";
import { REFERENCE_JVM_FLAGS, referenceJavaHome, stderrKey } from "./fidelity/suite.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const CACHE_FILE = path.join(ROOT, "node_modules", ".cache", "java-arena-content.json");
const GENERATED = path.join(ROOT, "src", "generated");
const CHECKS_JSON = path.join(ROOT, "fidelity", "out", "content-checks.json");
const TIME_LIMIT_MS = 10_000;
const CHALLENGES_PER_STEP = 3;

const JAVA_HOME = referenceJavaHome();
const bin = (tool) => path.join(JAVA_HOME, "bin", tool);
const release = fs.readFileSync(path.join(JAVA_HOME, "release"), "utf8");
const jdkVersion = /^JAVA_RUNTIME_VERSION="([^"]+)"/m.exec(release)?.[1] ?? "unknown";
if (!/^21\./.test(jdkVersion)) {
  console.error(`build-content: ${JAVA_HOME} is Java ${jdkVersion}; the content needs a JDK 21 (unset JAVA_HOME to use the pinned Temurin build).`);
  process.exit(1);
}
const env = { ...process.env, LC_ALL: "C.UTF-8" };
delete env.JAVA_TOOL_OPTIONS;
delete env._JAVA_OPTIONS;
delete env.JDK_JAVA_OPTIONS;

const useCache = !process.argv.includes("--no-cache");
const dry = process.argv.includes("--dry");
const drillFileArg = process.argv.includes("--drill-file") ? process.argv[process.argv.indexOf("--drill-file") + 1] : null;
const moduleFileArg = process.argv.includes("--module-file") ? process.argv[process.argv.indexOf("--module-file") + 1] : null;
if (process.argv.includes("--module-file") && !/\.ya?ml$/.test(moduleFileArg ?? "")) {
  console.error("--module-file needs a file name, such as 13-lists.yaml.");
  process.exit(2);
}
if ((drillFileArg || moduleFileArg) && !dry) {
  console.error("--drill-file and --module-file check part of the content, so they need --dry.");
  process.exit(2);
}
const CACHE_VERSION = 2;
let cache = {};
if (useCache && fs.existsSync(CACHE_FILE)) {
  const c = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  if (c.version === CACHE_VERSION && c.jdk === jdkVersion) cache = c.entries;
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "java-arena-content-"));

/**
 * A library a program may use (such as JUnit), unpacked once from engine/dist/libraries for the
 * reference JDK's class path: the same class files the site's engine loads. `sha` identifies the
 * archive in cache keys.
 */
const libraryDirs = new Map();
function library(name) {
  if (!libraryDirs.has(name)) {
    const archive = fs.readFileSync(path.join(ROOT, "engine", "dist", "libraries", `${name}.bin`));
    const data = gunzipSync(archive);
    const dir = path.join(TMP, "libraries", name);
    for (let p = 0; p < data.length; ) {
      const n = data.readUInt16BE(p);
      const file = data.toString("utf8", p + 2, p + 2 + n);
      p += 2 + n;
      const length = data.readUInt32BE(p);
      p += 4;
      fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
      fs.writeFileSync(path.join(dir, file), data.subarray(p, p + length));
      p += length;
    }
    libraryDirs.set(name, { dir, sha: crypto.createHash("sha256").update(archive).digest("hex").slice(0, 16) });
  }
  return libraryDirs.get(name);
}
/** The libraries a program needs: JUnit when it uses org.junit. */
const librariesFor = (files) => (usesJUnit(files) ? [JUNIT_LIBRARY] : []);
const errors = [];
const warnings = [];
const checks = []; // for the browser replay
const t0 = Date.now();

// ---------------------------------------------------------------- compiling and running
const sha = (x) => crypto.createHash("sha256").update(JSON.stringify(x)).digest("hex").slice(0, 24);

/**
 * Compiles are batched: every compile asked for in the same tick goes to one JVM running
 * scripts/content/JavaCheck.java, which runs the JDK's javac on each program in turn.
 * Results are cached by source; class files only exist for this build, so a cached program is
 * compiled again only when one of its runs isn't cached.
 */
let batch = null;
const javacJobs = new Map();
function javacBatch(files, libraries, id) {
  if (javacJobs.has(id)) return javacJobs.get(id);
  if (!batch) {
    batch = new Map();
    const b = batch;
    setImmediate(() => {
      batch = null;
      runBatch(b);
    });
  }
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  batch.set(id, { files, libraries, resolve, dir: path.join(TMP, "jobs", id) });
  javacJobs.set(id, promise);
  return promise;
}

function runBatch(b) {
  for (const job of b.values()) {
    for (const f of job.files) {
      const target = path.join(job.dir, "src", f.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.text);
    }
    fs.mkdirSync(path.join(job.dir, "classes"), { recursive: true });
    // Libraries go on javac's class path, as "javac -cp .:junit.jar:hamcrest.jar" would put them.
    if (job.libraries.length) fs.writeFileSync(path.join(job.dir, "classpath.txt"), job.libraries.map((l) => library(l).dir).join(path.delimiter));
  }
  const r = spawnSync(bin("java"), ["-XX:-UsePerfData", path.join(ROOT, "scripts", "content", "JavaCheck.java"), path.join(TMP, "jobs"), ...b.keys()], { env, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) {
    console.error(r.stdout, r.stderr);
    console.error("build-content: the javac batch failed");
    process.exit(1);
  }
  for (const [id, job] of b) {
    const text = fs.readFileSync(path.join(job.dir, "result.txt"), "utf8");
    const nl = text.indexOf("\n");
    const res = { ok: text.slice(0, nl) === "0", output: text.slice(nl + 1) };
    cache[id] = res;
    job.resolve({ ...res, classes: path.join(job.dir, "classes") });
  }
}

/** javac's verdict and messages for a program: { ok, output, files, libraries }. */
async function compile(files) {
  const libraries = librariesFor(files);
  const id = sha(["compile", files, ...libraries.map((l) => library(l).sha)]);
  const res = cache[id] ?? (await javacBatch(files, libraries, id));
  return { ok: res.ok, output: res.output, files, libraries };
}

// A few JVMs at a time: each run is a separate `java` process, like the browser's fresh runner.
const MAX = Math.max(2, Math.min(8, os.cpus().length));
let active = 0;
const queue = [];
function limit(fn) {
  return new Promise((resolve, reject) => {
    const go = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          if (queue.length) queue.shift()();
        });
    };
    if (active < MAX) go();
    else queue.push(go);
  });
}

/**
 * Runs a compiled program on one input with the reference JVM flags. Cached by program and input.
 * `mainClass` and `args` are for the check program of tests that call methods.
 */
async function run(compiled, stdin, opts = {}, tries = 3) {
  const res = await runOnce(compiled, stdin, opts);
  // A line the JVM itself logged (such as "[0.001s][warning]...") isn't the program's output: run it again.
  if (!JVM_LOG.test(res.stdout + res.stderr)) return res;
  if (tries > 1) return run(compiled, stdin, opts, tries - 1);
  errors.push(`the reference JVM kept logging into a program's output:\n${(res.stdout + res.stderr).match(JVM_LOG)[0]}`);
  return res;
}
const JVM_LOG = /^\[\d+\.\d+s\]\[(warning|error)\].*$/m;

async function runOnce(compiled, stdin, { mainClass = "Main", args = [], files = null } = {}) {
  const libraries = compiled.libraries ?? [];
  const id = sha(["run", compiled.files, stdin, mainClass, args, REFERENCE_JVM_FLAGS, ...(files ? [files] : []), ...libraries.map((l) => library(l).sha)]);
  if (cache[id]) return cache[id];
  const { classes } = await javacBatch(compiled.files, libraries, sha(["compile", compiled.files, ...libraries.map((l) => library(l).sha)]));
  const classPath = [classes, ...libraries.map((l) => library(l).dir)].join(path.delimiter);
  return limit(
    () =>
      new Promise((resolve) => {
        const cwd = fs.mkdtempSync(path.join(TMP, "run-"));
        // Files the program reads sit in its working folder, as they would next to a real program.
        for (const [name, text] of Object.entries(files ?? {})) fs.writeFileSync(path.join(cwd, name), text);
        const p = spawn(bin("java"), [...REFERENCE_JVM_FLAGS, "-cp", classPath, mainClass, ...args], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
        let stdout = "";
        let stderr = "";
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          p.kill("SIGKILL");
        }, TIME_LIMIT_MS);
        p.stdout.setEncoding("utf8").on("data", (d) => (stdout += d));
        p.stderr.setEncoding("utf8").on("data", (d) => (stderr += d));
        p.stdin.on("error", () => {});
        p.stdin.end(stdin);
        p.on("close", (code) => {
          clearTimeout(timer);
          fs.rmSync(cwd, { recursive: true, force: true });
          const res = { stdout, stderr, exitCode: timedOut ? null : code, timedOut };
          if (!timedOut && !JVM_LOG.test(stdout + stderr)) cache[id] = res;
          resolve(res);
        });
      }),
  );
}

// ---------------------------------------------------------------- helpers
function readYaml(file) {
  try {
    return YAML.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${path.relative(ROOT, file)}: YAML error: ${e.message}`);
    return null;
  }
}

// Text ends with exactly one line break, except that an empty last line typed on purpose (input that
// ends with an empty line, written with YAML's |+ or a quoted "\n\n") is kept.
const ensureNl = (s) => (s == null ? s : String(s).replace(/\s*$/, "") + (/\n[ \t]*\n\s*$/.test(String(s)) ? "\n\n" : "\n"));
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
/** The source files of a program (one Main.java, or several files joined with file markers). */
const mainFile = (text) => splitFiles(text);
/** Indentation problems in every file of a program, named by file when there are several. */
const indentProblems = (text) => {
  const files = splitFiles(text);
  return files.flatMap((f) => indentMessages(f.text).map((m) => (files.length > 1 ? `${f.path}: ${m}` : m)));
};
/**
 * A program given in YAML: text (Main.java), or a map of file names to their text, such as
 * { Person.java: ..., Main.java: ... }, which becomes one string with file markers.
 */
function codeOf(where, value) {
  if (value == null || typeof value === "string") return ensureNl(value ?? "");
  if (typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${where}: code must be text, or a map of file names to text`);
    return "";
  }
  const files = Object.entries(value).map(([p, text]) => ({ path: p, text: ensureNl(String(text ?? "")) }));
  for (const f of files) {
    if (!/^[A-Z][A-Za-z0-9]*\.java$/.test(f.path)) errors.push(`${where}: "${f.path}" isn't a Java file name (like Person.java)`);
    const cls = /^\s*public\s+(?:final\s+|abstract\s+)?(?:class|interface|record|enum)\s+(\w+)/m.exec(f.text)?.[1];
    if (cls && `${cls}.java` !== f.path) errors.push(`${where}: ${f.path} holds public class ${cls}, which must be in ${cls}.java`);
  }
  // A program runs from Main, except one of classes and their JUnit tests, which the tests run.
  if (!files.some((f) => f.path === "Main.java") && !(usesJUnit(files) && testClassesOf(files).length)) errors.push(`${where}: a program of several files needs a Main.java (or a JUnit test class)`);
  return joinFiles(files);
}

/** Imports a ```java main example gets automatically, when it uses these classes. */
const AUTO_IMPORTS = { Scanner: "java.util.Scanner", ArrayList: "java.util.ArrayList", Arrays: "java.util.Arrays", HashMap: "java.util.HashMap", Random: "java.util.Random" };
function importsFor(code) {
  const lines = Object.entries(AUTO_IMPORTS)
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(code))
    .map(([, full]) => `import ${full};\n`);
  return lines.length ? lines.join("") + "\n" : "";
}

// Every key a lesson file may use. A misspelled key (for example "requires") is an error, not ignored.
const KEYS = {
  module: ["id", "summary", "steps"],
  step: ["id", "slug", "title", "text", "fill", "seed", "solution", "predict", "style", "hints", "tests", "require", "forbid", "seedMayPass", "more"],
  challenge: ["task", "fill", "seed", "solution", "predict", "style", "hints", "tests", "require", "forbid", "seedMayPass"],
  rule: ["pattern", "flags", "message", "min", "max", "raw"],
  test: ["name", "stdin", "call", "files", "expect", "hidden", "junit", "replace", "outcome"],
  drillFile: ["topic", "drills"],
  drill: ["id", "type", "prompt", "pre", "body", "classes", "stdin", "answer", "expect", "fix", "choices", "compiles", "verify", "why", "after", "seed", "solution", "hints", "tests", "require", "forbid", "style", "module"],
};
function checkKeys(where, obj, kind) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    errors.push(`${where}: expected a ${kind} (a set of keys)`);
    return;
  }
  for (const k of Object.keys(obj)) if (!KEYS[kind].includes(k)) errors.push(`${where}: unknown ${kind} key "${k}" (allowed: ${KEYS[kind].join(", ")})`);
}

function checkRuleShape(where, list, kind) {
  if (!Array.isArray(list)) {
    errors.push(`${where}: ${kind} must be a list of rules`);
    return;
  }
  for (const r of list) {
    checkKeys(`${where} ${kind} rule`, r, "rule");
    if (!r || typeof r.pattern !== "string" || typeof r.message !== "string") errors.push(`${where}: each ${kind} rule needs a pattern and a message`);
    else {
      try {
        new RegExp(r.pattern, r.flags ?? "");
      } catch (e) {
        errors.push(`${where}: bad ${kind} pattern ${r.pattern}: ${e.message}`);
      }
      if (kind === "forbid" && (r.min != null || r.max != null)) errors.push(`${where}: forbid rules can't have min or max`);
      // Safari before 16.4 can't read a lookbehind, and the check would fail there.
      if (/\(\?<[=!]/.test(r.pattern)) errors.push(`${where}: ${kind} pattern ${r.pattern} uses a lookbehind, which older Safari can't read; match the text before it instead`);
    }
  }
}

// ---------------------------------------------------------------- worked examples in lesson text
/**
 * Every ```java block in lesson text must say what it is:
 *   ```java run       a complete program; compiled and run. An ```input block right after it is
 *                     what it reads; an ```output block after that must be exactly what it prints.
 *   ```java main      statements; run inside a main method (imports added when needed), same checks.
 *   ```java error     code that must NOT compile. A ```javac block after it must be exactly what
 *                     javac prints for it (the site's compiler prints the same).
 *   ```java fragment  a piece of code that can't run on its own (for example a class body); shown only.
 *   ```java run crash a complete program that must stop with an uncaught exception. After its
 *                     ```input and ```output blocks (both optional), a ```crash block must be what
 *                     Java prints: the exception line and the program's own "at" lines.
 *   ```file data.txt  a file that the next ```java run example reads (shown with its name). Several
 *                     can come before one example.
 * A ```java run example can hold several files: each one after the first starts with a line such as
 * `// ==== Person.java ====` (the page shows it as the file's name).
 * Returns the text with plain ```java info strings.
 */
async function checkExamples(where, text) {
  if (!text) return text;
  const blocks = [...text.matchAll(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)];
  for (let i = 0; i < blocks.length; i++) {
    const info = blocks[i][1].trim();
    if (!/^java\b/.test(info)) continue;
    const [, kind, extra, ...rest] = info.split(/\s+/);
    const code = blocks[i][2];
    const w = `${where}, example ${i + 1}`;
    if (!["run", "main", "error", "fragment", "test"].includes(kind) || (extra && !(kind === "run" && extra === "crash")) || rest.length) {
      errors.push(`${w}: a java block must be "java run", "java run crash", "java main", "java error", "java test" or "java fragment"`);
      continue;
    }
    const crash = extra === "crash";
    if (kind === "fragment") continue;
    if (kind === "test") {
      await checkTestExample(w, code, blocks[i + 1]);
      continue;
    }
    const source = kind === "main" ? mainProgram(code, importsFor(code)) : code;
    const c = await compile(mainFile(source));
    if (kind === "error") {
      if (c.ok) {
        errors.push(`${w}: marked "java error" but it compiles`);
        continue;
      }
      const next = blocks[i + 1];
      if (next && next[1].trim() === "javac") {
        if (normalizeOutput(next[2]) !== normalizeOutput(c.output)) errors.push(`${w}: the javac block says\n${next[2]}\nbut javac prints\n${c.output}`);
      } else warnings.push(`${w}: a "java error" block usually shows javac's message in a javac block after it`);
      checks.push({ where: w, kind: "error", files: mainFile(source), javac: c.output });
      continue;
    }
    if (!c.ok) {
      errors.push(`${w}: does not compile:\n${c.output}`);
      continue;
    }
    if (c.output) errors.push(`${w}: javac printed warnings:\n${c.output}`);
    for (const m of indentProblems(source)) errors.push(`${w}: indentation: ${m}`);
    const hasInput = blocks[i + 1]?.[1].trim() === "input";
    const stdin = hasInput ? blocks[i + 1][2] : "";
    // The ```file blocks since the previous java block are files this example reads.
    let files = null;
    for (let j = i - 1; j >= 0 && !/^java\b/.test(blocks[j][1].trim()); j--) {
      const f = /^file\s+([\w.-]+)$/.exec(blocks[j][1].trim());
      if (f) (files ??= {})[f[1]] = blocks[j][2];
    }
    const r = await run(c, stdin, files ? { files } : {});
    let key = null;
    if (crash) {
      key = stderrKey(r.stderr);
      if (r.timedOut || r.exitCode === 0 || !/^Exception in thread "main" /.test(key)) errors.push(`${w}: marked "java run crash", but it ${r.timedOut ? "times out" : r.exitCode === 0 ? "ends normally" : "doesn't stop with an exception"}\n${r.stderr}`);
    } else {
      if (r.timedOut || r.exitCode !== 0) errors.push(`${w}: exits with ${r.timedOut ? "a time out" : r.exitCode}\n${r.stderr}`);
      if (r.stderr) errors.push(`${w}: printed an error:\n${r.stderr}`);
    }
    let next = i + (hasInput ? 2 : 1);
    const out = blocks[next];
    if (out && out[1].trim() === "output") {
      next++;
      if (normalizeOutput(out[2]) !== normalizeOutput(r.stdout)) errors.push(`${w}: the output block says\n${out[2]}\nbut it prints\n${r.stdout}`);
    } else if (normalizeOutput(r.stdout)) warnings.push(`${w}: prints something but has no output block`);
    if (!crash && blocks[next]?.[1].trim() === "crash") errors.push(`${w}: a crash block follows it, but only a "java run crash" example is checked against one`);
    if (crash) {
      const shown = blocks[next];
      if (!shown || shown[1].trim() !== "crash") errors.push(`${w}: a "java run crash" block needs a crash block after it (and after its output block), with what Java prints:\n${key}`);
      else if (normalizeOutput(shown[2]) !== normalizeOutput(key)) errors.push(`${w}: the crash block says\n${shown[2]}\nbut Java prints\n${key}`);
    }
    checks.push({ where: w, kind: "run", files: mainFile(source), tests: [{ stdin, ...(files ? { files } : {}), stdout: r.stdout, exitCode: r.exitCode, ...(crash ? { stderrKey: key } : {}) }] });
  }
  return text.replace(/^```java[ \t]+(run|main|error|fragment|test)([ \t]+crash)?[ \t]*$/gm, "```java");
}

/**
 * A ```java test example: classes and their JUnit test classes, run the way the site runs tests
 * (ArenaTests, which uses JUnit's runner), followed by an ```output block with the report.
 */
async function checkTestExample(w, code, next) {
  const own = mainFile(code);
  const testClasses = testClassesOf(own);
  if (!testClasses.length) return errors.push(`${w}: a "java test" example needs a test class (a file with @Test)`);
  if (!usesJUnit(own)) return errors.push(`${w}: a "java test" example must import JUnit (org.junit)`);
  for (const m of indentProblems(code)) errors.push(`${w}: indentation: ${m}`);
  const files = [...own, { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }];
  const c = await compile(files);
  if (!c.ok) return errors.push(`${w}: does not compile:\n${c.output}`);
  if (c.output) errors.push(`${w}: javac printed warnings:\n${c.output}`);
  const r = await run(c, "", { mainClass: TEST_RUNNER_CLASS, args: testClasses });
  if (r.timedOut || r.exitCode !== 0 || r.stderr) errors.push(`${w}: the tests didn't run to the end:\n${r.stderr}`);
  if (!next || next[1].trim() !== "output") errors.push(`${w}: a "java test" example needs an output block after it, with the report:\n${r.stdout}`);
  else if (normalizeOutput(next[2]) !== normalizeOutput(r.stdout)) errors.push(`${w}: the output block says\n${next[2]}\nbut the tests print\n${r.stdout}`);
  checks.push({ where: w, kind: "run", files, mainClass: TEST_RUNNER_CLASS, tests: [{ stdin: "", args: testClasses, stdout: r.stdout, exitCode: r.exitCode }] });
}

// ---------------------------------------------------------------- exercises
/**
 * Verifies one challenge and returns the shape the app uses. A challenge is either a fill-in
 * (`fill`: a program with [[blanks]]) or a code challenge (`seed`: starter code, `solution`).
 */
/**
 * A "What does it print?" challenge: the learner reads `predict` (a complete program) and types each
 * line it prints. The answers are the program's real output.
 */
async function buildPredict(where, raw, hints) {
  const program = codeOf(where, raw.predict);
  for (const k of ["seed", "solution", "fill", "tests", "require", "forbid", "style"]) if (raw[k] != null) errors.push(`${where}: a predict challenge can't have ${k}`);
  for (const m of indentProblems(program)) errors.push(`${where}: the program's indentation: ${m}`);
  const c = await compile(mainFile(program));
  if (!c.ok) {
    errors.push(`${where}: the program does not compile:\n${c.output}`);
    return null;
  }
  if (c.output) errors.push(`${where}: javac printed warnings:\n${c.output}`);
  const r = await run(c, "");
  if (r.timedOut || r.exitCode !== 0 || r.stderr) errors.push(`${where}: the program fails: exit ${r.exitCode}\n${r.stderr}`);
  const out = normalizeOutput(r.stdout);
  const lines = out ? out.split("\n") : [];
  if (lines.length === 0 || lines.length > 8) errors.push(`${where}: a predict program should print 1 to 8 lines (it prints ${lines.length})`);
  if (lines.some((l) => !l.trim())) errors.push(`${where}: a predict program shouldn't print empty lines`);
  checks.push({ where, kind: "run", files: mainFile(program), tests: [{ stdin: "", stdout: r.stdout, exitCode: 0 }] });
  return { kind: "predict", seed: program, solution: program, hints, tests: [{ name: "Output", stdin: "", expect: out, hidden: false }], require: [], forbid: [], lines };
}

async function buildExercise(where, raw) {
  if (raw.predict != null) {
    const hints = raw.hints ?? [];
    if (!Array.isArray(hints) || hints.length === 0 || hints.some((h) => typeof h !== "string")) errors.push(`${where}: needs a list of hints (as text)`);
    return buildPredict(where, raw, hints);
  }
  const kind = raw.fill != null ? "fill" : "code";
  if (kind === "code" && raw.seed == null) errors.push(`${where}: needs fill, or seed and solution`);
  const style = raw.style;
  if (style != null && style !== "indent") errors.push(`${where}: style can only be "indent"`);
  if (kind === "fill" && typeof raw.fill !== "string") errors.push(`${where}: a fill challenge is one file of text`);
  const seed = kind === "fill" ? ensureNl(raw.fill) : codeOf(`${where} seed`, raw.seed);
  const solution = kind === "fill" ? ensureNl(templateSolution(raw.fill)) : raw.solution == null ? "" : codeOf(`${where} solution`, raw.solution);
  if (kind === "code" && raw.seed != null && splitFiles(seed).map((f) => f.path).join() !== splitFiles(solution).map((f) => f.path).join()) errors.push(`${where}: the seed and the solution must have the same files, in the same order`);
  if (!solution) {
    errors.push(`${where}: missing solution`);
    return null;
  }
  if (kind === "fill") {
    const { blanks } = parseTemplate(raw.fill);
    if (blanks.length === 0) errors.push(`${where}: fill challenge has no [[blanks]]`);
    if (blanks.some((b) => !b.answer.trim())) errors.push(`${where}: a blank has an empty answer`);
  }
  // YAML reads an unquoted line with ": " in it as a key and value, not as text: catch that.
  const hints = raw.hints ?? [];
  if (!Array.isArray(hints) || hints.length === 0) errors.push(`${where}: needs a list of hints`);
  else hints.forEach((h, i) => typeof h !== "string" && errors.push(`${where}: hint ${i + 1} isn't plain text (quote it: a ": " inside makes YAML read it as a key and value)`));
  const require = raw.require ?? [];
  const forbid = raw.forbid ?? [];
  checkRuleShape(where, require, "require");
  checkRuleShape(where, forbid, "forbid");
  const ruleProblems = checkRules(solution, require, forbid);
  if (ruleProblems.length) errors.push(`${where}: the solution breaks its own rules: ${ruleProblems.join("; ")}`);
  // Solutions show good style: every line indented to match its braces.
  for (const m of indentProblems(solution)) errors.push(`${where}: the solution's indentation: ${m}`);

  const testsRaw = raw.tests?.length ? raw.tests : [{}];
  for (const t of testsRaw) checkKeys(`${where} test`, t, "test");
  if (testsRaw.some((t) => t.junit != null)) {
    const tests = await buildJUnitTests(where, testsRaw, { kind, seed, solution, require, forbid, style, seedMayPass: raw.seedMayPass });
    return tests && { kind, seed, solution, hints, tests, require, forbid, ...(style ? { style } : {}) };
  }
  if (testsRaw.every((t) => t.hidden)) errors.push(`${where}: at least one test must be visible`);
  if (testsRaw.some((t) => t.stdin) && !testsRaw.some((t) => t.hidden)) warnings.push(`${where}: reads input but has no hidden test`);
  for (const t of testsRaw) if (t.call != null && (typeof t.call !== "string" || !t.call.trim())) errors.push(`${where}: a test's call must be Java code (as text)`);
  // Files a test's program reads: a map of file names to their text.
  const inputFiles = testsRaw.map((t, i) => {
    if (t.files == null) return null;
    if (typeof t.files !== "object" || Array.isArray(t.files) || Object.keys(t.files).some((n) => !/^[\w.-]+$/.test(n))) {
      errors.push(`${where} test ${i + 1}: files must be a map of plain file names (like scores.txt) to their text`);
      return null;
    }
    return Object.fromEntries(Object.entries(t.files).map(([n, text]) => [n, ensureNl(String(text ?? ""))]));
  });
  // Tests with a `call` run the check program (ArenaCheck), which calls the learner's methods.
  const calls = testsRaw.map((t) => (t.call == null ? undefined : ensureNl(String(t.call))));
  const check = calls.some((x) => x != null) ? checkSource(calls.map((call) => ({ call }))) : null;
  const filesFor = (text) => (check ? [...mainFile(text), { path: CHECK_FILE, text: check.text }] : mainFile(text));
  const how = (i) => ({ ...(check ? { mainClass: CHECK_CLASS, args: [String(i)] } : {}), ...(inputFiles[i] ? { files: inputFiles[i] } : {}) });

  const c = await compile(filesFor(solution));
  if (!c.ok) {
    errors.push(`${where}: the solution does not compile:\n${c.output}`);
    return null;
  }
  if (c.output) errors.push(`${where}: javac printed warnings for the solution:\n${c.output}`);
  // Typed input ends with Enter, so every input line ends with a line break.
  const stdins = testsRaw.map((t) => (t.stdin == null || t.stdin === "" ? "" : ensureNl(String(t.stdin))));
  const runs = await Promise.all(stdins.map((stdin, i) => run(c, stdin, how(i))));
  const tests = testsRaw.map((t, i) => {
    const r = runs[i];
    const n = `${where} test ${i + 1}`;
    if (r.timedOut) errors.push(`${n}: timed out`);
    else if (r.exitCode !== 0) errors.push(`${n}: the solution exits with ${r.exitCode}\n${r.stderr}`);
    else if (r.stderr) errors.push(`${n}: the solution printed an error:\n${r.stderr}`);
    const actual = normalizeOutput(r.stdout);
    if (t.expect != null && normalizeOutput(String(t.expect)) !== actual) errors.push(`${n}: expected\n${t.expect}\nbut the solution prints\n${actual}`);
    if (!actual) errors.push(`${n}: the solution prints nothing`);
    const call = calls[i];
    const name = t.name ?? (call && !call.trim().includes("\n") ? call.trim() : testsRaw.length > 1 ? `Test ${i + 1}` : "Output");
    return { name, stdin: stdins[i], ...(call ? { call } : {}), ...(inputFiles[i] ? { files: inputFiles[i] } : {}), expect: actual, hidden: !!t.hidden };
  });
  checks.push({ where, kind: "run", files: filesFor(solution), ...(check ? { mainClass: CHECK_CLASS } : {}), tests: tests.map((t, i) => ({ stdin: t.stdin, ...(check ? { args: [String(i)] } : {}), ...(inputFiles[i] ? { files: inputFiles[i] } : {}), stdout: runs[i].stdout, exitCode: 0 })) });

  // Starter code must not already pass, or the challenge would be free.
  if (kind === "code" && seed && !raw.seedMayPass) {
    const sc = await compile(filesFor(seed));
    if (sc.ok) {
      const sr = await Promise.all(tests.map((t, i) => run(sc, t.stdin, how(i))));
      const passes = tests.every((t, i) => sr[i].exitCode === 0 && !sr[i].timedOut && normalizeOutput(sr[i].stdout) === t.expect);
      const styleOk = style !== "indent" || indentProblems(seed).length === 0;
      if (passes && styleOk && checkRules(seed, require, forbid).length === 0) errors.push(`${where}: the starter code already passes`);
    }
  }
  // A fill-in with all its blanks empty must not pass either.
  if (kind === "fill") {
    const empty = templateEmpty(raw.fill);
    const ec = await compile(filesFor(empty));
    if (ec.ok) {
      const er = await Promise.all(tests.map((t, i) => run(ec, t.stdin, how(i))));
      if (tests.every((t, i) => er[i].exitCode === 0 && normalizeOutput(er[i].stdout) === t.expect) && checkRules(empty, require, forbid).length === 0) errors.push(`${where}: the program passes with every blank left empty`);
    }
  }
  return { kind, seed, solution, hints, tests, require, forbid, ...(style ? { style } : {}) };
}

/**
 * A task shows the expected output in its last plain ``` block. It must be what the first visible
 * test really prints (the task card shows that test's output too, and drops the task's copy only
 * when the two are the same).
 */
/**
 * Tests that run the learner's JUnit tests (`junit: GardenTest`), on the program as written or with
 * some files swapped for other versions (`replace: { Garden.java: ... }`, for example a version with
 * a bug). `outcome: pass` (the default) wants every test to pass; `outcome: fail` wants at least one
 * test to fail, so the tests catch the bug.
 */
async function buildJUnitTests(where, testsRaw, { kind, seed, solution, require, forbid, style, seedMayPass }) {
  if (kind !== "code") return errors.push(`${where}: tests with junit need seed and solution, not fill`), null;
  const names = splitFiles(solution).map((f) => f.path);
  const specs = [];
  testsRaw.forEach((t, i) => {
    const n = `${where} test ${i + 1}`;
    if (t.junit == null || t.stdin != null || t.call != null || t.files != null || t.expect != null) return errors.push(`${n}: in a challenge with junit tests, every test has junit (and no stdin, call, files or expect)`);
    if (typeof t.junit !== "string" || !names.includes(`${t.junit}.java`)) return errors.push(`${n}: junit must name a test class of the program (one of ${names.join(", ")})`);
    const outcome = t.outcome ?? "pass";
    if (!["pass", "fail"].includes(outcome)) return errors.push(`${n}: outcome is "pass" (every test passes) or "fail" (at least one fails)`);
    if (typeof t.name !== "string" || !t.name.trim()) errors.push(`${n}: a junit test needs a name that says which version of the program it tests`);
    let replace = null;
    if (t.replace != null) {
      if (typeof t.replace !== "object" || Array.isArray(t.replace) || Object.keys(t.replace).some((f) => !names.includes(f))) return errors.push(`${n}: replace maps files of the program (${names.join(", ")}) to other versions of them`);
      replace = Object.fromEntries(Object.entries(t.replace).map(([f, text]) => [f, ensureNl(String(text ?? ""))]));
    }
    specs.push({ i, junit: t.junit, outcome, replace, name: String(t.name ?? `Test ${i + 1}`), hidden: !!t.hidden });
  });
  if (specs.length !== testsRaw.length) return null;
  if (specs.every((t) => t.hidden)) errors.push(`${where}: at least one test must be visible`);
  const filesOf = (text, replace) => [...splitFiles(text).map((f) => ({ path: f.path, text: replace?.[f.path] ?? f.text })), { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }];
  // Runs one test on a version of the program: whether it gets the outcome it wants, and the report.
  const runTest = async (text, t) => {
    const files = filesOf(text, t.replace);
    const c = await compile(files);
    if (!c.ok) return { ok: false, compiled: false, output: c.output, files };
    const r = await run(c, "", { mainClass: TEST_RUNNER_CLASS, args: [t.junit] });
    const report = parseTestReport(r.stdout);
    const ok = !r.timedOut && r.exitCode === 0 && report.complete && report.run > 0 && (t.outcome === "pass" ? report.passed === report.run : report.passed < report.run);
    return { ok, compiled: true, r, report, files };
  };
  const results = await Promise.all(specs.map((t) => runTest(solution, t)));
  specs.forEach((t, k) => {
    const n = `${where} test ${t.i + 1} (${t.name})`;
    const res = results[k];
    if (!res.compiled) errors.push(`${n}: the solution doesn't compile:\n${res.output}`);
    else if (res.r.stderr && !res.ok) errors.push(`${n}: the tests didn't run to the end:\n${res.r.stderr}`);
    else if (!res.ok) errors.push(`${n}: the solution's tests should ${t.outcome === "pass" ? "all pass" : "catch this version (at least one test fails)"}, but they print\n${res.r.stdout}`);
    else checks.push({ where: n, kind: "run", files: res.files, mainClass: TEST_RUNNER_CLASS, tests: [{ stdin: "", args: [t.junit], stdout: res.r.stdout, exitCode: res.r.exitCode }] });
  });
  // Starter code must not already pass, or the challenge would be free.
  if (seed && !seedMayPass) {
    const sr = await Promise.all(specs.map((t) => runTest(seed, t)));
    const styleOk = style !== "indent" || indentProblems(seed).length === 0;
    if (sr.every((x) => x.ok) && styleOk && checkRules(seed, require, forbid).length === 0) errors.push(`${where}: the starter code already passes`);
  }
  return specs.map((t) => ({ name: t.name, stdin: "", junit: t.junit, outcome: t.outcome, ...(t.replace ? { replace: t.replace } : {}), expect: "", hidden: t.hidden }));
}

function checkTaskOutput(where, task, ex) {
  if (!ex || ex.kind === "predict" || typeof task !== "string") return;
  // Fences are read in order (an info string such as "java" opens a block too), then the plain ones kept.
  const blocks = [...task.matchAll(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)].filter((b) => !b[1].trim());
  const shown = ex.tests.find((t) => !t.hidden && t.expect);
  if (!blocks.length || !shown) return;
  const block = blocks[blocks.length - 1][2];
  const norm = (x) => normalizeOutput(x).trim();
  if (norm(block) !== norm(shown.expect)) errors.push(`${where}: the task shows the output\n${block}but the first visible test prints\n${shown.expect}`);
}

function templateEmpty(template) {
  const { parts } = parseTemplate(template);
  return parts.join("");
}

// ---------------------------------------------------------------- modules
const course = readYaml(path.join(ROOT, "content", "course.yaml"));
if (!course?.modules) {
  console.error("content/course.yaml is missing or has no modules");
  process.exit(1);
}
const planned = new Map(course.modules.map((m, i) => [m.id, { ...m, number: i + 1 }]));

async function buildStep(file, m, s, i, slugs, ids) {
  const where = `${file} step ${i + 1} (${s?.title ?? "untitled"})`;
  checkKeys(where, s, "step");
  if (typeof s?.title !== "string" || !s.title) errors.push(`${where}: title must be a non-empty string (quote it)`);
  // Saved progress is keyed by step id, so ids are explicit: a position-based id would shift when a step is inserted.
  if (!s?.id || !KEBAB.test(s.id)) errors.push(`${where}: needs an id in kebab-case (progress is saved by id)`);
  if (ids.has(s.id)) errors.push(`${where}: duplicate step id ${s.id}`);
  ids.add(s.id);
  const slug = s.slug ?? slugify(s.title ?? "");
  if (!KEBAB.test(slug)) errors.push(`${where}: bad slug ${slug}`);
  if (slugs.has(slug)) errors.push(`${where}: duplicate slug ${slug} in module ${m.id}`);
  slugs.add(slug);
  // The "**Your turn:**" paragraph and everything after it is the task, shown in its own card.
  for (const k of ["text", "title", "slug", "id"]) if (s?.[k] != null && typeof s[k] !== "string") errors.push(`${where}: ${k} must be text (quote it)`);
  const full = typeof s.text === "string" ? s.text : "";
  const at = full.indexOf("**Your turn:**");
  if (at < 0) errors.push(`${where}: the text needs a "**Your turn:**" paragraph (the task)`);
  const text = await checkExamples(where, at < 0 ? full : full.slice(0, at).trimEnd() + "\n");
  const rest = full.slice(at + "**Your turn:**".length).trim();
  const task = at < 0 ? "" : await checkExamples(`${where} task`, rest.charAt(0).toUpperCase() + rest.slice(1) + "\n");
  const more = s.more ?? [];
  if (more.length + 1 !== CHALLENGES_PER_STEP) errors.push(`${where}: has ${more.length + 1} challenges; every step has ${CHALLENGES_PER_STEP} (the step's own plus ${CHALLENGES_PER_STEP - 1} under "more")`);
  const ex = await buildExercise(`${where} challenge 1`, s);
  checkTaskOutput(`${where} challenge 1`, task, ex);
  const extra = await Promise.all(
    more.map(async (c, k) => {
      const w = `${where} challenge ${k + 2}`;
      checkKeys(w, c, "challenge");
      if (typeof c?.task !== "string" || !c.task) errors.push(`${w}: needs a task (as text)`);
      const cx = await buildExercise(w, c);
      checkTaskOutput(w, c.task, cx);
      return cx && { task: await checkExamples(w, String(c.task ?? "").trim() + "\n"), ...cx };
    }),
  );
  if (!ex) return null;
  return { id: s.id, slug, title: s.title, text, task, ...ex, more: extra.filter(Boolean) };
}

async function buildModules() {
  const dir = path.join(ROOT, "content", "modules");
  const files = (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort() : []).filter((f) => !moduleFileArg || f === moduleFileArg);
  if (moduleFileArg && !files.length) errors.push(`--module-file: no content/modules/${moduleFileArg}`);
  const ids = new Set();
  const out = [];
  for (const name of files) {
    const file = `content/modules/${name}`;
    const data = readYaml(path.join(dir, name));
    if (!data) continue;
    checkKeys(file, data, "module");
    const plan = planned.get(data.id);
    if (!plan) {
      errors.push(`${file}: module ${data.id} is not in content/course.yaml`);
      continue;
    }
    if (!name.startsWith(String(plan.number).padStart(2, "0") + "-")) errors.push(`${file}: the file name should start with ${String(plan.number).padStart(2, "0")}- (its place in the course)`);
    if (typeof data.summary !== "string" || !data.summary) errors.push(`${file}: needs a summary (as text)`);
    if (!Array.isArray(data.steps) || data.steps.length === 0) {
      errors.push(`${file}: needs steps`);
      continue;
    }
    if (data.steps.length !== plan.steps) warnings.push(`${file}: ${data.steps.length} steps, the plan says ${plan.steps}`);
    const slugs = new Set();
    const steps = [];
    // One step at a time keeps the compile batches large and the error list in order.
    const built = await Promise.all(data.steps.map((s, i) => buildStep(file, plan, s, i, slugs, ids)));
    for (const s of built) if (s) steps.push(s);
    out.push({ id: plan.id, number: plan.number, title: plan.title, course: plan.course, part: plan.part ?? null, mooc: plan.mooc ?? [], summary: String(data.summary ?? ""), steps });
  }
  return out;
}

// ---------------------------------------------------------------- drills
/**
 * Deathmatch drills: content/drills/<module id>.yaml, and interview-*.yaml (topic: interview).
 * `pre` holds methods, `body` the statements run in main; the learner sees only those two, and the
 * build runs the whole program on the JDK:
 *   predict   the answer is what the program really prints
 *   fill      one [[blank]]; the program with the answer must run, and its output is shown
 *   bug       one line marked // BUG and a `fix`; the fixed program must run and behave differently
 *   compiles  the answer (yes or no) is what javac says
 *   choice    2 to 4 choices; code shown must compile (unless `compiles: false`), and with
 *             `verify: output` the right choice must be exactly what it prints
 *   boss      a real coding challenge, checked like a lesson challenge
 * A drill unlocks when the learner finishes the step `after` names (a slug or id in its module),
 * or the module's last step when it names none. Interview drills are always open.
 */
const DRILL_TYPES = ["predict", "fill", "bug", "compiles", "choice", "boss"];
const indentBy = (s, n) => s.split("\n").map((l) => (l ? " ".repeat(n) + l : l)).join("\n");

/** A drill's complete program: `classes` (classes of its own) go after Main in the same file. */
function drillProgram(pre, body, classes = "") {
  const parts = [];
  if (pre) parts.push(indentBy(pre, 4));
  parts.push(`    public static void main(String[] args) {\n${body ? indentBy(body, 8) + "\n" : ""}    }`);
  return `${importsFor(`${pre}\n${body}\n${classes}`)}public class Main {\n${parts.join("\n\n")}\n}\n${classes ? `\n${classes}\n` : ""}`;
}

/** What a drill shows: its classes, then Main's methods, then the statements run in main. */
function drillDisplay(pre, body, classes = "") {
  const top = [classes, pre].filter(Boolean).join("\n\n");
  if (top && body) return `${top}\n\n// inside main:\n${body}`;
  return top || body;
}

/** The first error javac printed, without the file and line (they're of the whole program). */
const firstError = (output) => /error: (.*)/.exec(output ?? "")?.[1] ?? "";

async function runDrill(where, program, stdin) {
  for (const m of indentProblems(program)) errors.push(`${where}: indentation: ${m}`);
  const c = await compile(mainFile(program));
  if (!c.ok) {
    errors.push(`${where}: does not compile:\n${c.output}`);
    return null;
  }
  if (c.output) errors.push(`${where}: javac printed warnings:\n${c.output}`);
  const r = await run(c, stdin);
  if (r.timedOut || r.exitCode !== 0 || r.stderr) {
    errors.push(`${where}: the program fails (exit ${r.exitCode}):\n${r.stderr}`);
    return null;
  }
  checks.push({ where, kind: "run", files: mainFile(program), tests: [{ stdin, stdout: r.stdout, exitCode: 0 }] });
  return normalizeOutput(r.stdout);
}

/** True when Markdown text has something that looks like an HTML tag or comment outside code. */
const htmlLike = (text) => /<[a-zA-Z!\/?]/.test(text.replace(/```[\s\S]*?```/g, "").replace(/(`+)[\s\S]*?\1/g, ""));

async function buildDrill(where, id, topic, d, moduleSteps) {
  checkKeys(where, d, "drill");
  if (!DRILL_TYPES.includes(d?.type)) {
    errors.push(`${where}: type must be one of ${DRILL_TYPES.join(", ")}`);
    return null;
  }
  // Which step unlocks it: named by slug or id, or the module's last step.
  let after;
  if (moduleSteps) {
    const step = d.after == null ? moduleSteps[moduleSteps.length - 1] : moduleSteps.find((s) => s.slug === d.after || s.id === d.after);
    if (!step) errors.push(`${where}: after: no step ${d.after} in module ${topic}`);
    after = step?.id;
  } else if (d.after != null) errors.push(`${where}: interview drills are always open, so they can't have after`);
  if (d.why != null && typeof d.why !== "string") errors.push(`${where}: why must be text (quote it)`);
  if (!d.why && d.type !== "compiles" && d.type !== "boss") errors.push(`${where}: needs an explanation (why)`);
  // Drill text is Markdown, where <tag> or <!-- --> outside backticks would be read as HTML and vanish.
  for (const [key, text] of [["prompt", d.prompt], ["why", d.why], ...(d.choices ?? []).map((c, i) => [`choice ${i + 1}`, c])])
    if (typeof text === "string" && htmlLike(text)) errors.push(`${where}: ${key} has text that Markdown reads as HTML; put it in backticks: ${text}`);
  const base = { id, topic, type: d.type, why: d.why ?? "", ...(after ? { after } : {}) };
  const pre = d.pre ? String(d.pre).replace(/\s*$/, "") : "";
  const body = d.body ? String(d.body).replace(/\s*$/, "") : "";
  // Classes of the drill's own, such as `class Counter { ... }`: not public, since they share Main.java.
  const classes = d.classes ? String(d.classes).replace(/\s*$/, "") : "";
  if (/^\s*public\s+(?:final\s+|abstract\s+)?class\b/m.test(classes)) errors.push(`${where}: classes share Main.java with Main, so they can't be public (write class Counter, not public class Counter)`);
  const stdin = d.stdin == null || d.stdin === "" ? "" : ensureNl(String(d.stdin));
  const display = drillDisplay(pre, body, classes);
  switch (d.type) {
    case "predict": {
      const answer = await runDrill(where, drillProgram(pre, body, classes), stdin);
      if (answer == null) return null;
      if (!answer) errors.push(`${where}: prints nothing`);
      if (answer.split("\n").length > 4) errors.push(`${where}: prints ${answer.split("\n").length} lines; keep predict drills to 4`);
      if (d.answer != null && normalizeOutput(String(d.answer)) !== answer) errors.push(`${where}: the answer says\n${d.answer}\nbut the program prints\n${answer}`);
      return { ...base, prompt: d.prompt ?? "What does this print?", display, answer, ...(stdin ? { stdin } : {}) };
    }
    case "fill": {
      const { blanks } = parseTemplate(display);
      if (blanks.length !== 1 || !blanks[0].answer.trim()) {
        errors.push(`${where}: a fill drill needs exactly one [[blank]] with an answer`);
        return null;
      }
      const output = await runDrill(where, drillProgram(templateSolution(pre), templateSolution(body), templateSolution(classes)), stdin);
      if (output == null) return null;
      if (!output) errors.push(`${where}: the program prints nothing, so there's no output to aim for`);
      if (d.expect != null && normalizeOutput(String(d.expect)) !== output) errors.push(`${where}: expect says\n${d.expect}\nbut the program prints\n${output}`);
      return { ...base, prompt: d.prompt ?? "Fill the blank so the program prints the output shown.", display, answer: blanks[0].answer, accept: blanks[0].accept, output, ...(stdin ? { stdin } : {}) };
    }
    case "bug": {
      const lines = display.split("\n");
      const at = lines.findIndex((l) => /\/\/\s*BUG\s*$/.test(l));
      if (at < 0 || typeof d.fix !== "string" || !d.fix.trim()) {
        errors.push(`${where}: mark the buggy line with // BUG and give its fix`);
        return null;
      }
      if (lines.filter((l) => /\/\/\s*BUG\s*$/.test(l)).length > 1) errors.push(`${where}: only one line can be marked // BUG`);
      if (/^\s*[{}]\s*;?\s*\/\/\s*BUG\s*$/.test(lines[at])) errors.push(`${where}: the bug line can't be a lone brace`);
      const clean = (x) => x.split("\n").map((l) => l.replace(/\s*\/\/\s*BUG\s*$/, "")).join("\n");
      const fixed = (x) => x.split("\n").map((l) => (/\/\/\s*BUG\s*$/.test(l) ? l.match(/^\s*/)[0] + d.fix.trim() : l)).join("\n");
      const output = await runDrill(`${where} (fixed)`, drillProgram(fixed(pre), fixed(body), fixed(classes)), stdin);
      if (output == null) return null;
      const bc = await compile(mainFile(drillProgram(clean(pre), clean(body), clean(classes))));
      if (bc.ok) {
        const br = await run(bc, stdin);
        if (!br.timedOut && br.exitCode === 0 && !br.stderr && normalizeOutput(br.stdout) === output) errors.push(`${where}: the buggy and the fixed program behave the same`);
      }
      return { ...base, prompt: d.prompt ?? "One line has a bug. Which one?", display: clean(display), answer: String(at + 1), fix: d.fix.trim(), output, ...(stdin ? { stdin } : {}) };
    }
    case "compiles": {
      const program = drillProgram(pre, body, classes);
      const c = await compile(mainFile(program));
      const answer = c.ok ? "yes" : "no";
      if (d.answer != null && String(d.answer) !== answer) errors.push(`${where}: the answer says ${d.answer}, but javac says ${answer}:\n${c.output}`);
      checks.push(c.ok ? { where, kind: "compiles", files: mainFile(program) } : { where, kind: "error", files: mainFile(program), javac: c.output });
      const why = d.why || (c.ok ? "" : `javac says: \`${firstError(c.output)}\``);
      if (!why) errors.push(`${where}: needs an explanation (why)`);
      return { ...base, why, prompt: d.prompt ?? "Does this compile?", display, answer };
    }
    case "choice": {
      const choices = (d.choices ?? []).map(String);
      const answer = Number(d.answer);
      if (choices.length < 2 || choices.length > 4) return void errors.push(`${where}: a choice drill needs 2 to 4 choices`);
      if (new Set(choices).size !== choices.length) errors.push(`${where}: two choices are the same`);
      if (!(answer >= 1 && answer <= choices.length)) return void errors.push(`${where}: answer must be the number of the right choice (1 to ${choices.length})`);
      if (typeof d.prompt !== "string" || !d.prompt) errors.push(`${where}: a choice drill needs a prompt`);
      if (display) {
        const program = drillProgram(pre, body, classes);
        const c = await compile(mainFile(program));
        if (d.compiles === false) {
          if (c.ok) errors.push(`${where}: marked compiles: false, but it compiles`);
          else checks.push({ where, kind: "error", files: mainFile(program), javac: c.output });
        } else if (!c.ok) return void errors.push(`${where}: the code doesn't compile:\n${c.output}`);
        else if (d.verify === "output") {
          const out = await runDrill(where, program, stdin);
          if (out != null) {
            // A choice may be in backticks (as code), which aren't part of the output.
            const shown = (ch) => normalizeOutput(ch.replace(/^`([^`]*)`$/, "$1"));
            if (shown(choices[answer - 1]) !== out) errors.push(`${where}: the right choice is "${choices[answer - 1]}", but the program prints "${out}"`);
            choices.forEach((ch, i) => i !== answer - 1 && shown(ch) === out && errors.push(`${where}: choice ${i + 1} is also what it prints`));
          }
        } else checks.push({ where, kind: "compiles", files: mainFile(program) });
      } else if (d.verify) errors.push(`${where}: verify needs code to run`);
      return { ...base, prompt: d.prompt ?? "", display, answer: String(answer), choices };
    }
    case "boss": {
      if (typeof d.prompt !== "string" || !d.prompt) errors.push(`${where}: a boss drill needs a prompt (the task)`);
      const ex = await buildExercise(where, d);
      if (!ex) return null;
      checkTaskOutput(where, d.prompt, ex);
      return { ...base, prompt: d.prompt ?? "", display: "", answer: "", exercise: ex };
    }
  }
  return null;
}

async function buildDrills(modules) {
  const dir = path.join(ROOT, "content", "drills");
  const files = (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort() : []).filter((f) => (!drillFileArg || f === drillFileArg) && (!moduleFileArg || modules.some((m) => f === `${m.id}.yaml`)));
  const byId = new Map(modules.map((m) => [m.id, m]));
  const seen = new Set();
  const out = [];
  await Promise.all(
    files.map(async (name) => {
      const file = `content/drills/${name}`;
      const data = readYaml(path.join(dir, name));
      if (!data) return;
      checkKeys(file, data, "drillFile");
      const topic = data.topic;
      const interview = topic === "interview";
      if (!interview && !byId.has(topic)) return void errors.push(`${file}: topic ${topic} is not a written module (or "interview")`);
      if (!interview && name !== `${topic}.yaml`) errors.push(`${file}: the file should be named ${topic}.yaml`);
      if (!Array.isArray(data.drills) || !data.drills.length) return void errors.push(`${file}: needs drills`);
      const stem = name.replace(/\.ya?ml$/, "");
      const built = await Promise.all(
        data.drills.map((d, i) => {
          const id = d?.id ?? `${stem}-${i + 1}`;
          if (seen.has(id)) errors.push(`${file}: duplicate drill id ${id}`);
          seen.add(id);
          return buildDrill(`${file} drill ${i + 1} (${d?.type})`, id, topic, d, interview ? null : byId.get(topic).steps);
        }),
      );
      out.push({ file: name, drills: built.filter(Boolean) });
    }),
  );
  out.sort((a, b) => a.file.localeCompare(b.file));
  return out.flatMap((f) => f.drills);
}

/** content/placement.yaml: one drill per question, each naming the module it tests, in course order. */
async function buildPlacement(modules) {
  const file = path.join(ROOT, "content", "placement.yaml");
  if (!fs.existsSync(file)) return [];
  const data = readYaml(file);
  const order = modules.map((m) => m.id);
  let last = -1;
  const out = [];
  for (const [i, q] of (data?.questions ?? []).entries()) {
    const where = `content/placement.yaml question ${i + 1}`;
    const at = order.indexOf(q?.module);
    if (at < 0) {
      errors.push(`${where}: module ${q?.module} is not a written module`);
      continue;
    }
    if (at < last) errors.push(`${where}: the questions must follow the course order`);
    last = at;
    const { module, ...rest } = q;
    const d = await buildDrill(where, `placement-${i + 1}`, module, { ...rest, after: undefined }, modules[at].steps);
    if (d) out.push({ ...d, module });
  }
  return out;
}

const modules = await buildModules();
const drills = await buildDrills(modules);
const placement = moduleFileArg || (drillFileArg && drillFileArg !== "placement.yaml") ? [] : await buildPlacement(modules);

if (!dry) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify({ version: CACHE_VERSION, jdk: jdkVersion, entries: cache }));
}
fs.rmSync(TMP, { recursive: true, force: true });

for (const w of warnings) console.warn("warn:", w);
if (errors.length) {
  for (const e of errors) console.error("\nERROR:", e);
  console.error(`\n${errors.length} content error(s).`);
  process.exit(1);
}

if (dry) {
  console.log(`check ok (nothing written): ${modules.length} modules${moduleFileArg ? ` (${moduleFileArg})` : ""}, ${drills.length} drills${drillFileArg ? ` in ${drillFileArg}` : ""}, ${placement.length} placement questions`);
  process.exit(0);
}

// The app loads a small index (every page needs it) and each module's lessons only when needed.
const live = new Set(modules.map((m) => m.id));
const plan = course.modules.map((m, i) => ({ id: m.id, number: i + 1, title: m.title, course: m.course, part: m.part ?? null, mooc: m.mooc ?? [], steps: m.steps, live: live.has(m.id) }));
const index = {
  jdk: jdkVersion,
  moocUrl: course.moocUrl,
  plan,
  modules: modules.map(({ steps, ...m }) => ({ ...m, drills: drills.filter((d) => d.topic === m.id).length, steps: steps.map((s) => ({ id: s.id, slug: s.slug, title: s.title, challenges: 1 + s.more.length, drills: drills.filter((d) => d.after === s.id).length })) })),
  interviewDrills: drills.filter((d) => d.topic === "interview").length,
  placementQuestions: placement.length,
};
fs.rmSync(GENERATED, { recursive: true, force: true });
fs.mkdirSync(path.join(GENERATED, "modules"), { recursive: true });
fs.writeFileSync(path.join(GENERATED, "course.json"), JSON.stringify(index));
for (const m of modules) fs.writeFileSync(path.join(GENERATED, "modules", `${m.id}.json`), JSON.stringify(m));
// Drills and placement questions load only on the practice pages.
fs.writeFileSync(path.join(GENERATED, "drills.json"), JSON.stringify({ drills, placement }));
fs.mkdirSync(path.dirname(CHECKS_JSON), { recursive: true });
fs.writeFileSync(CHECKS_JSON, JSON.stringify({ jdk: jdkVersion, checks }, null, 1));
const steps = modules.reduce((a, m) => a + m.steps.length, 0);
const challenges = modules.reduce((a, m) => a + m.steps.reduce((b, s) => b + 1 + s.more.length, 0), 0);
const runs = checks.reduce((a, c) => a + (c.tests?.length ?? 0), 0);
console.log(`content ok: ${modules.length} modules, ${steps} steps, ${challenges} challenges, ${drills.length} drills, ${placement.length} placement questions; ${checks.length} programs and ${runs} runs checked on ${jdkVersion} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
