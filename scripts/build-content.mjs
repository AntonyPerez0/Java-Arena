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
// Usage: node scripts/build-content.mjs [--no-cache]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import YAML from "yaml";
import { checkRules, mainProgram, normalizeOutput, parseTemplate, templateSolution } from "../src/grader/assemble.js";
import { REFERENCE_JVM_FLAGS, referenceJavaHome } from "./fidelity/suite.mjs";

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
const CACHE_VERSION = 1;
let cache = {};
if (useCache && fs.existsSync(CACHE_FILE)) {
  const c = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  if (c.version === CACHE_VERSION && c.jdk === jdkVersion) cache = c.entries;
}
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "java-arena-content-"));
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
function javacBatch(files) {
  const id = sha(["compile", files]);
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
  batch.set(id, { files, resolve, dir: path.join(TMP, "jobs", id) });
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
  }
  const r = spawnSync(bin("java"), [path.join(ROOT, "scripts", "content", "JavaCheck.java"), path.join(TMP, "jobs"), ...b.keys()], { env, encoding: "utf8", maxBuffer: 64 << 20 });
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

/** javac's verdict and messages for a program: { ok, output, files }. */
async function compile(files) {
  const id = sha(["compile", files]);
  const res = cache[id] ?? (await javacBatch(files));
  return { ok: res.ok, output: res.output, files };
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

/** Runs a compiled program on one input with the reference JVM flags. Cached by program and input. */
async function run(compiled, stdin) {
  const id = sha(["run", compiled.files, stdin, REFERENCE_JVM_FLAGS]);
  if (cache[id]) return cache[id];
  const { classes } = await javacBatch(compiled.files);
  return limit(
    () =>
      new Promise((resolve) => {
        const cwd = fs.mkdtempSync(path.join(TMP, "run-"));
        const p = spawn(bin("java"), [...REFERENCE_JVM_FLAGS, "-cp", classes, "Main"], { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
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
          if (!timedOut) cache[id] = res;
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

const ensureNl = (s) => (s == null ? s : String(s).replace(/\s*$/, "\n"));
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const KEBAB = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
const mainFile = (text) => [{ path: "Main.java", text }];

/** Imports a ```java main example gets automatically, when it uses these classes. */
const AUTO_IMPORTS = { Scanner: "java.util.Scanner", ArrayList: "java.util.ArrayList", HashMap: "java.util.HashMap", Random: "java.util.Random" };
function importsFor(code) {
  const lines = Object.entries(AUTO_IMPORTS)
    .filter(([name]) => new RegExp(`\\b${name}\\b`).test(code))
    .map(([, full]) => `import ${full};\n`);
  return lines.length ? lines.join("") + "\n" : "";
}

// Every key a lesson file may use. A misspelled key (for example "requires") is an error, not ignored.
const KEYS = {
  module: ["id", "summary", "steps"],
  step: ["id", "slug", "title", "text", "fill", "seed", "solution", "hints", "tests", "require", "forbid", "seedMayPass", "more"],
  challenge: ["task", "fill", "seed", "solution", "hints", "tests", "require", "forbid", "seedMayPass"],
  rule: ["pattern", "flags", "message", "min", "max", "raw"],
  test: ["name", "stdin", "expect", "hidden"],
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
 * Returns the text with plain ```java info strings.
 */
async function checkExamples(where, text) {
  if (!text) return text;
  const blocks = [...text.matchAll(/^```([^\n]*)\n([\s\S]*?)^```[ \t]*$/gm)];
  for (let i = 0; i < blocks.length; i++) {
    const info = blocks[i][1].trim();
    if (!/^java\b/.test(info)) continue;
    const kind = info.split(/\s+/)[1];
    const code = blocks[i][2];
    const w = `${where}, example ${i + 1}`;
    if (!["run", "main", "error", "fragment"].includes(kind)) {
      errors.push(`${w}: a java block must be "java run", "java main", "java error" or "java fragment"`);
      continue;
    }
    if (kind === "fragment") continue;
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
    const hasInput = blocks[i + 1]?.[1].trim() === "input";
    const stdin = hasInput ? blocks[i + 1][2] : "";
    const r = await run(c, stdin);
    if (r.timedOut || r.exitCode !== 0) errors.push(`${w}: exits with ${r.timedOut ? "a time out" : r.exitCode}\n${r.stderr}`);
    if (r.stderr) errors.push(`${w}: printed an error:\n${r.stderr}`);
    const out = blocks[i + (hasInput ? 2 : 1)];
    if (out && out[1].trim() === "output") {
      if (normalizeOutput(out[2]) !== normalizeOutput(r.stdout)) errors.push(`${w}: the output block says\n${out[2]}\nbut it prints\n${r.stdout}`);
    } else if (normalizeOutput(r.stdout)) warnings.push(`${w}: prints something but has no output block`);
    checks.push({ where: w, kind: "run", files: mainFile(source), tests: [{ stdin, stdout: r.stdout, exitCode: 0 }] });
  }
  return text.replace(/^```java (run|main|error|fragment)[ \t]*$/gm, "```java");
}

// ---------------------------------------------------------------- exercises
/**
 * Verifies one challenge and returns the shape the app uses. A challenge is either a fill-in
 * (`fill`: a program with [[blanks]]) or a code challenge (`seed`: starter code, `solution`).
 */
async function buildExercise(where, raw) {
  const kind = raw.fill != null ? "fill" : "code";
  if (kind === "code" && raw.seed == null) errors.push(`${where}: needs fill, or seed and solution`);
  const seed = ensureNl(kind === "fill" ? raw.fill : raw.seed ?? "");
  const solution = ensureNl(kind === "fill" ? templateSolution(raw.fill) : raw.solution);
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

  const testsRaw = raw.tests?.length ? raw.tests : [{}];
  for (const t of testsRaw) checkKeys(`${where} test`, t, "test");
  if (testsRaw.every((t) => t.hidden)) errors.push(`${where}: at least one test must be visible`);
  if (testsRaw.some((t) => t.stdin) && !testsRaw.some((t) => t.hidden)) warnings.push(`${where}: reads input but has no hidden test`);

  const c = await compile(mainFile(solution));
  if (!c.ok) {
    errors.push(`${where}: the solution does not compile:\n${c.output}`);
    return null;
  }
  if (c.output) errors.push(`${where}: javac printed warnings for the solution:\n${c.output}`);
  // Typed input ends with Enter, so every input line ends with a line break.
  const stdins = testsRaw.map((t) => (t.stdin == null || t.stdin === "" ? "" : ensureNl(String(t.stdin))));
  const runs = await Promise.all(stdins.map((stdin) => run(c, stdin)));
  const tests = testsRaw.map((t, i) => {
    const r = runs[i];
    const n = `${where} test ${i + 1}`;
    if (r.timedOut) errors.push(`${n}: timed out`);
    else if (r.exitCode !== 0) errors.push(`${n}: the solution exits with ${r.exitCode}\n${r.stderr}`);
    else if (r.stderr) errors.push(`${n}: the solution printed an error:\n${r.stderr}`);
    const actual = normalizeOutput(r.stdout);
    if (t.expect != null && normalizeOutput(String(t.expect)) !== actual) errors.push(`${n}: expected\n${t.expect}\nbut the solution prints\n${actual}`);
    if (!actual) errors.push(`${n}: the solution prints nothing`);
    return { name: t.name ?? (testsRaw.length > 1 ? `Test ${i + 1}` : "Output"), stdin: stdins[i], expect: actual, hidden: !!t.hidden };
  });
  checks.push({ where, kind: "run", files: mainFile(solution), tests: tests.map((t, i) => ({ stdin: t.stdin, stdout: runs[i].stdout, exitCode: 0 })) });

  // Starter code must not already pass, or the challenge would be free.
  if (kind === "code" && seed && !raw.seedMayPass) {
    const sc = await compile(mainFile(seed));
    if (sc.ok) {
      const sr = await Promise.all(tests.map((t) => run(sc, t.stdin)));
      const passes = tests.every((t, i) => sr[i].exitCode === 0 && !sr[i].timedOut && normalizeOutput(sr[i].stdout) === t.expect);
      if (passes && checkRules(seed, require, forbid).length === 0) errors.push(`${where}: the starter code already passes`);
    }
  }
  // A fill-in with all its blanks empty must not pass either.
  if (kind === "fill") {
    const empty = templateEmpty(raw.fill);
    const ec = await compile(mainFile(empty));
    if (ec.ok) {
      const er = await Promise.all(tests.map((t) => run(ec, t.stdin)));
      if (tests.every((t, i) => er[i].exitCode === 0 && normalizeOutput(er[i].stdout) === t.expect) && checkRules(empty, require, forbid).length === 0) errors.push(`${where}: the program passes with every blank left empty`);
    }
  }
  return { kind, seed, solution, hints, tests, require, forbid };
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
  const extra = await Promise.all(
    more.map(async (c, k) => {
      const w = `${where} challenge ${k + 2}`;
      checkKeys(w, c, "challenge");
      if (typeof c?.task !== "string" || !c.task) errors.push(`${w}: needs a task (as text)`);
      const cx = await buildExercise(w, c);
      return cx && { task: await checkExamples(w, String(c.task ?? "").trim() + "\n"), ...cx };
    }),
  );
  if (!ex) return null;
  return { id: s.id, slug, title: s.title, text, task, ...ex, more: extra.filter(Boolean) };
}

async function buildModules() {
  const dir = path.join(ROOT, "content", "modules");
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.ya?ml$/.test(f)).sort() : [];
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

const modules = await buildModules();

fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
fs.writeFileSync(CACHE_FILE, JSON.stringify({ version: CACHE_VERSION, jdk: jdkVersion, entries: cache }));
fs.rmSync(TMP, { recursive: true, force: true });

for (const w of warnings) console.warn("warn:", w);
if (errors.length) {
  for (const e of errors) console.error("\nERROR:", e);
  console.error(`\n${errors.length} content error(s).`);
  process.exit(1);
}

// The app loads a small index (every page needs it) and each module's lessons only when needed.
const live = new Set(modules.map((m) => m.id));
const plan = course.modules.map((m, i) => ({ id: m.id, number: i + 1, title: m.title, course: m.course, part: m.part ?? null, mooc: m.mooc ?? [], steps: m.steps, live: live.has(m.id) }));
const index = {
  jdk: jdkVersion,
  moocUrl: course.moocUrl,
  plan,
  modules: modules.map(({ steps, ...m }) => ({ ...m, steps: steps.map((s) => ({ id: s.id, slug: s.slug, title: s.title, challenges: 1 + s.more.length })) })),
};
fs.rmSync(GENERATED, { recursive: true, force: true });
fs.mkdirSync(path.join(GENERATED, "modules"), { recursive: true });
fs.writeFileSync(path.join(GENERATED, "course.json"), JSON.stringify(index));
for (const m of modules) fs.writeFileSync(path.join(GENERATED, "modules", `${m.id}.json`), JSON.stringify(m));
fs.mkdirSync(path.dirname(CHECKS_JSON), { recursive: true });
fs.writeFileSync(CHECKS_JSON, JSON.stringify({ jdk: jdkVersion, checks }, null, 1));
const steps = modules.reduce((a, m) => a + m.steps.length, 0);
const challenges = modules.reduce((a, m) => a + m.steps.reduce((b, s) => b + 1 + s.more.length, 0), 0);
const runs = checks.reduce((a, c) => a + (c.tests?.length ?? 0), 0);
console.log(`content ok: ${modules.length} modules, ${steps} steps, ${challenges} challenges; ${checks.length} programs and ${runs} runs checked on ${jdkVersion} in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
