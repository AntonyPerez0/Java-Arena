// The real-JavaFX check (npm run fx-check): runs every program that uses Java Arena's practice
// version of JavaFX on real OpenJFX 21 (headless, with Monocle) and on Java Arena's JavaFX (the
// engine's javafx library, on the reference JDK), with the same input, arguments, files and clicks
// and typing, and compares what they print and the windows they leave (as the canonical outline
// of src/grader/window.ts, plus the events that couldn't happen). See scripts/fx-check/README.md.
//
// The programs: every lesson program that uses JavaFX (from fidelity/out/content-checks.json, which
// the content build writes: run npm run content or npm run build first), the fidelity programs that
// use it (fidelity/programs) and the probes in scripts/fx-check/probes, which go through the API.
//
// Usage: node scripts/fx-check/fx-check.mjs
//   FX_CHECK_ONLY=<regular expression>  check only the programs whose place matches
//   FX_CHECK_CHECKS=<file>              read the lesson programs from this file instead
//   FX_CHECK_CACHE=<folder>             where the OpenJFX jars are kept (default node_modules/.cache/java-arena-fx)
//   FX_CHECK_VERBOSE=1                  also print what each run printed and its window, on real JavaFX
// It exits with 1 when anything differs, and writes fidelity/out/fx-check.json.
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpus, tmpdir } from "node:os";
import { delimiter, dirname, join, relative } from "node:path";
import { EVENTS_FILE, JAVAFX_LIBRARY, WINDOW_FILE, withoutArenaFiles } from "../../src/grader/javafx.js";
import { librariesFor } from "../../src/grader/libraries.js";
// TypeScript, which Node runs as it is (it has only types to strip): shared with the browser's grader.
import { compareOutlines, eventsFileText, parseEventLine, parseWindow, windowOutline } from "../../src/grader/window.ts";
import { loadSuite, REFERENCE_JVM_FLAGS, referenceJavaHome } from "../fidelity/suite.mjs";
import { javaRunArgs } from "../javafx/reference.mjs";
import { libraryDir } from "../libraries.mjs";

const ROOT = new URL("../../", import.meta.url).pathname;
const HERE = new URL("./", import.meta.url).pathname;

// ---------------------------------------------------------------- real OpenJFX 21

/**
 * The pinned jars (scripts/fx-check/jars.json): OpenJFX's base, graphics and controls modules (the
 * newest 21.0.x, for Linux) and Monocle, which runs JavaFX without a screen. The SHA-256 of each
 * is checked.
 */
const PINNED = JSON.parse(readFileSync(join(HERE, "jars.json"), "utf8"));
export const OPENJFX_VERSION = PINNED.openjfx;
export const MONOCLE_VERSION = PINNED.monocle;
const JARS = PINNED.jars;
/** Maven Central, then Google's mirror of it (Maven Central answers 429 to an address that asks too often). */
const MAVEN = ["https://repo1.maven.org/maven2/", "https://maven-central.storage-download.googleapis.com/maven2/"];
const CACHE = process.env.FX_CHECK_CACHE || join(ROOT, "node_modules", ".cache", "java-arena-fx");

const sha256 = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");

/** The jars' paths in the cache, downloaded first when missing (with curl, which uses a proxy set in the environment). */
function openjfxJars() {
  mkdirSync(CACHE, { recursive: true });
  return JARS.map(({ path, sha256: want }) => {
    const file = join(CACHE, path.slice(path.lastIndexOf("/") + 1));
    if (existsSync(file) && sha256(file) === want) return file;
    const part = file + ".part";
    const tried = [];
    for (const base of MAVEN) {
      const r = spawnSync("curl", ["-fsSL", "--retry", "3", "--retry-delay", "3", "--retry-all-errors", "-o", part, base + path], { encoding: "utf8" });
      if (r.status !== 0) {
        tried.push(`${base + path}: ${(r.stderr || "").trim().split("\n").pop()}`);
        continue;
      }
      const got = sha256(part);
      if (got === want) {
        renameSync(part, file);
        return file;
      }
      tried.push(`${base + path}: SHA-256 ${got}, not the pinned ${want}`);
    }
    rmSync(part, { force: true });
    throw new Error(`fx-check: couldn't download ${path}:\n  ${tried.join("\n  ")}`);
  });
}

/** JVM flags for real JavaFX without a screen: Monocle's headless platform and software rendering. */
const headless = () => ["-Dglass.platform=Monocle", "-Dmonocle.platform=Headless", "-Dprism.order=sw", `-Djavafx.cachedir=${join(CACHE, "native")}`];

// ---------------------------------------------------------------- the programs

/**
 * The programs to check, each { group, where, files, mainClass, runs }: its source files and main
 * class, and its runs, each with its standard input, arguments, files and the text of its events
 * file (null: none). `group` is "content" (lessons and drills) or "library" (the probes and the
 * fidelity programs, which test the library itself).
 */
function probes() {
  const dir = join(HERE, "probes");
  const list = (d) => readdirSync(d).flatMap((n) => (statSync(join(d, n)).isDirectory() ? list(join(d, n)) : [join(d, n)]));
  return readdirSync(dir)
    .filter((n) => statSync(join(dir, n)).isDirectory())
    .sort()
    .map((name) => {
      const folder = join(dir, name);
      const all = list(folder);
      const files = all.filter((f) => f.endsWith(".java")).map((f) => ({ path: relative(folder, f), text: readFileSync(f, "utf8") }));
      const meta = existsSync(join(folder, "meta.json")) ? JSON.parse(readFileSync(join(folder, "meta.json"), "utf8")) : {};
      const stdin = existsSync(join(folder, "stdin.txt")) ? readFileSync(join(folder, "stdin.txt"), "utf8") : "";
      // Each <name>.events file is one run with those events; a probe without one runs once, with none.
      const eventFiles = all.filter((f) => f.endsWith(".events")).sort();
      const runs = eventFiles.length ? eventFiles.map((f) => ({ name: relative(folder, f), stdin, args: meta.args ?? [], files: {}, eventsText: readFileSync(f, "utf8") })) : [{ name: "no events", stdin, args: meta.args ?? [], files: {}, eventsText: null }];
      return { group: "library", where: `scripts/fx-check/probes/${name}`, files, mainClass: meta.mainClass ?? "Main", runs };
    });
}

function fidelityPrograms() {
  return loadSuite()
    .programs.filter((p) => p.libraries.includes(JAVAFX_LIBRARY))
    .map((p) => ({ group: "library", where: `fidelity/programs/${p.id}`, files: p.sources, mainClass: p.mainClass, runs: [{ name: "run", stdin: p.stdin, args: p.args, files: withoutArenaFiles(p.files), eventsText: p.files[EVENTS_FILE] ?? null }] }));
}

function contentPrograms() {
  const file = process.env.FX_CHECK_CHECKS || join(ROOT, "fidelity", "out", "content-checks.json");
  if (!existsSync(file)) throw new Error(`fx-check: ${relative(ROOT, file)} is missing: run npm run content (or npm run build) first, so the lesson programs can be checked`);
  // The list must be as new as the lessons: a lesson changed later may have programs it doesn't list.
  const written = statSync(file).mtimeMs;
  const newer = [];
  const walk = (d) => readdirSync(d).forEach((n) => (statSync(join(d, n)).isDirectory() ? walk(join(d, n)) : /\.ya?ml$/.test(n) && statSync(join(d, n)).mtimeMs > written && newer.push(relative(ROOT, join(d, n)))));
  walk(join(ROOT, "content"));
  if (newer.length && !process.env.FX_CHECK_CHECKS) console.warn(`fx-check: warning: ${newer.join(", ")} changed after ${relative(ROOT, file)} was written; run npm run content first to check them as they are now`);
  const { checks } = JSON.parse(readFileSync(file, "utf8"));
  return checks
    .filter((c) => c.kind === "run" && librariesFor(c.files).includes(JAVAFX_LIBRARY))
    .map((c) => ({
      group: "content",
      where: c.where,
      files: c.files,
      mainClass: c.mainClass ?? "Main",
      runs: c.tests.map((t, i) => ({ name: c.tests.length > 1 ? `test ${i + 1}` : "run", stdin: t.stdin ?? "", args: t.args ?? [], files: t.files ?? {}, eventsText: t.events ? eventsFileText(t.events) : null })),
    }));
}

// ---------------------------------------------------------------- compiling

const JAVA_HOME = referenceJavaHome();
const bin = (tool) => join(JAVA_HOME, "bin", tool);
const env = { ...process.env, LC_ALL: "C.UTF-8" };
delete env.JAVA_TOOL_OPTIONS;
delete env._JAVA_OPTIONS;
delete env.JDK_JAVA_OPTIONS;

/**
 * Compiles every program twice in one JVM (scripts/content/JavaCheck.java, as the content build
 * does): against Java Arena's JavaFX and against the real jars. Returns, for each side, the
 * classes folder or javac's messages.
 */
function compileAll(programs, tmp, jars) {
  const jobs = [];
  programs.forEach((p, i) => {
    for (const side of ["ours", "real"]) {
      const job = join(tmp, "jobs", `${side}-${i}`);
      for (const f of p.files) {
        mkdirSync(dirname(join(job, "src", f.path)), { recursive: true });
        writeFileSync(join(job, "src", f.path), f.text);
      }
      mkdirSync(join(job, "classes"), { recursive: true });
      const libraries = librariesFor(p.files);
      const others = libraries.filter((l) => l !== JAVAFX_LIBRARY).map(libraryDir);
      writeFileSync(join(job, "classpath.txt"), [...others, ...(side === "ours" ? [libraryDir(JAVAFX_LIBRARY)] : jars)].join(delimiter));
      jobs.push(`${side}-${i}`);
    }
  });
  const r = spawnSync(bin("java"), ["-XX:-UsePerfData", join(ROOT, "scripts", "content", "JavaCheck.java"), join(tmp, "jobs"), ...jobs], { env, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`fx-check: the javac batch failed:\n${r.stdout}${r.stderr}`);
  programs.forEach((p, i) => {
    for (const side of ["ours", "real"]) {
      const job = join(tmp, "jobs", `${side}-${i}`);
      const text = readFileSync(join(job, "result.txt"), "utf8");
      const nl = text.indexOf("\n");
      p[side] = text.slice(0, nl) === "0" ? { classes: join(job, "classes") } : { error: text.slice(nl + 1) };
    }
  });
}

function compileDriver(tmp, jars) {
  const out = join(tmp, "driver");
  const r = spawnSync(bin("javac"), ["-encoding", "UTF-8", "-cp", jars.join(delimiter), "-d", out, join(HERE, "RealFxDriver.java")], { env, encoding: "utf8" });
  if (r.status !== 0) throw new Error(`fx-check: couldn't compile RealFxDriver.java:\n${r.stdout}${r.stderr}`);
  return out;
}

// ---------------------------------------------------------------- running

const TIME_LIMIT_MS = 30_000;
const MAX = Math.max(2, Math.min(4, cpus().length));
let active = 0;
const waiting = [];
function limit(fn) {
  return new Promise((resolve, reject) => {
    const go = () => {
      active++;
      fn()
        .then(resolve, reject)
        .finally(() => {
          active--;
          if (waiting.length) waiting.shift()();
        });
    };
    if (active < MAX) go();
    else waiting.push(go);
  });
}

/** Every file in a folder and its subfolders, by its path in it, except Java Arena's own (.arena/). */
function folderFiles(dir, prefix = "", out = {}) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) folderFiles(full, `${prefix}${e.name}/`, out);
    else if (e.isFile()) out[prefix + e.name] = readFileSync(full, "utf8");
  }
  return withoutArenaFiles(out);
}

/** Runs `java args` in a new folder holding `files`; returns stdout, stderr, the exit code, the window file (or null) and the files left in the folder. */
function runJava(args, { stdin, files, windowFile }) {
  return limit(
    () =>
      new Promise((resolve) => {
        const cwd = mkdtempSync(join(tmpdir(), "fx-check-run-"));
        for (const [name, text] of Object.entries(files)) {
          mkdirSync(dirname(join(cwd, name)), { recursive: true });
          writeFileSync(join(cwd, name), text);
        }
        const p = spawn(bin("java"), args, { cwd, env, stdio: ["pipe", "pipe", "pipe"] });
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
          const wf = windowFile(cwd);
          const window = existsSync(wf) ? readFileSync(wf, "utf8") : null;
          const written = folderFiles(cwd);
          rmSync(cwd, { recursive: true, force: true });
          resolve({ stdout, stderr, exitCode: timedOut ? null : code, timedOut, window, written });
        });
      }),
  );
}

const hex = (s) => (s == null ? "-" : s === "" ? "=" : [...Array(s.length).keys()].map((i) => s.charCodeAt(i).toString(16).padStart(4, "0")).join(""));

/** The events for the driver (see RealFxDriver.java), read as the library reads .arena/events.txt. */
function driverEvents(eventsText) {
  const rows = [];
  for (const raw of (eventsText ?? "").split("\n")) {
    const e = parseEventLine(raw);
    if (!e) continue;
    if (e.problem !== undefined) {
      rows.push(["P", hex(e.line), hex(e.problem)].join(" "));
      continue;
    }
    const t = e.target;
    const [kind, type, value] = !t ? ["none", null, null] : t.kind === "number" ? ["number", null, String(t.n)] : t.kind === "id" ? ["id", null, t.id] : t.kind === "text" ? ["text", t.type, t.text] : ["index", t.type, String(t.index)];
    rows.push(["E", hex(e.line), hex(e.command), hex(kind), hex(type), hex(value), hex(e.text ?? null)].join(" "));
  }
  return rows.join("\n") + "\n";
}

async function runBoth(program, run, tmp, jars, driver, key) {
  const libraries = librariesFor(program.files);
  const others = libraries.filter((l) => l !== JAVAFX_LIBRARY).map(libraryDir);
  // Java Arena's JavaFX on the reference JDK, as the content build runs it (.arena/events.txt in its folder).
  const oursFiles = { ...run.files, ...(run.eventsText != null ? { [EVENTS_FILE]: run.eventsText } : {}) };
  const ours = runJava([...REFERENCE_JVM_FLAGS, ...javaRunArgs({ javaHome: JAVA_HOME, libraries, classPath: [program.ours.classes, ...others, libraryDir(JAVAFX_LIBRARY)].join(delimiter), mainClass: program.mainClass, args: run.args })], {
    stdin: run.stdin,
    files: oursFiles,
    windowFile: (cwd) => join(cwd, WINDOW_FILE),
  });
  // Real JavaFX through the driver, with the same files in its folder (the events too, though only the driver reads them).
  const spec = join(tmp, `events-${key}.txt`);
  const out = join(tmp, `window-${key}.json`);
  writeFileSync(spec, driverEvents(run.eventsText));
  const real = runJava([...REFERENCE_JVM_FLAGS, ...headless(), "-cp", [program.real.classes, ...others, ...jars, driver].join(delimiter), "arena.fxcheck.RealFxDriver", spec, out, program.mainClass, ...run.args], {
    stdin: run.stdin,
    files: oursFiles,
    windowFile: () => out,
  });
  return { ours: await ours, real: await real };
}

// ---------------------------------------------------------------- comparing

/**
 * What stderr says without stack frames (which differ: JavaFX's own frames, and the driver's) and
 * without what real JavaFX logs about itself: java.util.logging's two lines (a time and a class of
 * JavaFX's own, then the level and the message, such as its warning that it runs from the class
 * path) and fontconfig's warnings.
 */
function stderrHeads(s) {
  const lines = s.split("\n");
  const kept = [];
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (/^\w{3} \d{1,2}, \d{4} \d{1,2}:\d{2}:\d{2} [AP]M (com\.sun\.|javafx\.)\S+ \S+$/.test(l) && /^(SEVERE|WARNING|INFO|CONFIG|FINE|FINER|FINEST): /.test(lines[i + 1] ?? "")) {
      i++;
      continue;
    }
    if (!l || /^\s+at |^\s+\.\.\. \d+ more$/.test(l) || /^Fontconfig (error|warning):/.test(l)) continue;
    kept.push(l);
  }
  return kept.join("\n");
}
/** Identity hash codes, as in Label@1b6d3586, differ between any two runs. */
const withoutHashes = (s) => s.replace(/@[0-9a-f]{4,8}\b/g, "@HASH");
/** JavaFX's own font families, which every computer has. Another family gives what that computer has. */
const LOGICAL_FAMILIES = new Set(["System", "Serif", "SansSerif", "Monospaced"]);
function fontFamilies(node, out = new Set()) {
  if (!node) return out;
  if (node.font?.family != null && !LOGICAL_FAMILIES.has(node.font.family)) out.add(node.font.family);
  for (const r of ["top", "left", "center", "right", "bottom"]) fontFamilies(node[r], out);
  for (const c of node.children ?? []) fontFamilies(c, out);
  return out;
}

/** The styles in a window that set what the outline shows, which real JavaFX applies and Java Arena's JavaFX only stores. */
const OUTLINE_CSS = /-fx-(font|padding|spacing|hgap|vgap|alignment|pref-width|pref-height|wrap-text|visibility)\b/;
function layoutStyles(node, out = new Set()) {
  if (!node) return out;
  if (node.style != null && OUTLINE_CSS.test(node.style)) out.add(node.style);
  for (const r of ["top", "left", "center", "right", "bottom"]) layoutStyles(node[r], out);
  for (const c of node.children ?? []) layoutStyles(c, out);
  return out;
}

const indent = (s, by = "    ") => s.replace(/\n$/, "").split("\n").map((l) => by + l).join("\n");

/** The differences between the two runs, each as text (none: the same). */
function differences(ours, real) {
  const out = [];
  if (real.timedOut || ours.timedOut) out.push(`timed out (after ${TIME_LIMIT_MS / 1000} s) with ${real.timedOut ? "real JavaFX" : "Java Arena's JavaFX"}`);
  if (withoutHashes(ours.stdout) !== withoutHashes(real.stdout)) out.push(`the output differs\n  --- real JavaFX\n${indent(real.stdout || "(nothing)")}\n  --- Java Arena's JavaFX\n${indent(ours.stdout || "(nothing)")}`);
  const oe = withoutHashes(stderrHeads(ours.stderr));
  const re = withoutHashes(stderrHeads(real.stderr));
  if (oe !== re) out.push(`stderr differs (stack frames left out)\n  --- real JavaFX\n${indent(re || "(nothing)")}\n  --- Java Arena's JavaFX\n${indent(oe || "(nothing)")}`);
  if (!real.timedOut && !ours.timedOut && ours.exitCode !== real.exitCode) out.push(`the exit code differs: real JavaFX ${real.exitCode}, Java Arena's JavaFX ${ours.exitCode}`);
  if (!real.timedOut && !ours.timedOut) {
    const names = [...new Set([...Object.keys(ours.written), ...Object.keys(real.written)])].sort();
    for (const name of names) {
      if (!(name in real.written) || !(name in ours.written)) out.push(`only ${name in ours.written ? "Java Arena's JavaFX" : "real JavaFX"} left the file ${name}`);
      else if (ours.written[name] !== real.written[name]) out.push(`the file ${name} differs\n  --- real JavaFX\n${indent(real.written[name] || "(empty)")}\n  --- Java Arena's JavaFX\n${indent(ours.written[name] || "(empty)")}`);
    }
  }
  const ow = parseWindow(ours.window);
  const rw = parseWindow(real.window);
  if ((ow == null) !== (rw == null)) out.push(ow ? "only Java Arena's JavaFX left a window file" : "only real JavaFX left a window file");
  else if (ow && rw) {
    const oo = windowOutline(ow);
    const ro = windowOutline(rw);
    if (oo !== ro) {
      const { expected, got } = compareOutlines(ro, oo);
      const mark = (lines) => lines.map((l) => `${l.differs ? "  > " : "    "}${l.text}`).join("\n");
      let text = `the window differs (lines marked >)\n  --- real JavaFX\n${mark(expected)}\n  --- Java Arena's JavaFX\n${mark(got)}`;
      const families = [...ow.windows.reduce((set, w) => fontFamilies(w.scene?.root, set), new Set())];
      if (families.length) text += `\n  (The font famil${families.length > 1 ? "ies" : "y"} ${families.join(", ")} isn't one of JavaFX's own (System, Serif, SansSerif, Monospaced): real JavaFX shows it only on a computer that has it, and falls back to System elsewhere.)`;
      const styles = [...ow.windows.reduce((set, w) => layoutStyles(w.scene?.root, set), new Set())];
      if (styles.length) text += `\n  (Real JavaFX applies a style such as ${JSON.stringify(styles[0])} to the font, padding, spacing, gaps, alignment or sizes; Java Arena's JavaFX only stores it. Set those with setFont, setPadding and the like instead.)`;
      out.push(text);
    }
    if (JSON.stringify(ow.problems) !== JSON.stringify(rw.problems)) out.push(`the events that couldn't happen differ\n  --- real JavaFX\n${indent(rw.problems.join("\n") || "(none)")}\n  --- Java Arena's JavaFX\n${indent(ow.problems.join("\n") || "(none)")}`);
  }
  return out;
}

// ---------------------------------------------------------------- main

async function main() {
  const t0 = Date.now();
  const only = process.env.FX_CHECK_ONLY ? new RegExp(process.env.FX_CHECK_ONLY, "i") : null;
  const jars = openjfxJars();
  const programs = [...probes(), ...fidelityPrograms(), ...contentPrograms()].filter((p) => !only || only.test(p.where));
  const tmp = mkdtempSync(join(tmpdir(), "fx-check-"));
  process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));
  const driver = compileDriver(tmp, jars);
  compileAll(programs, tmp, jars);

  const results = await Promise.all(
    programs.map(async (p, i) => {
      // Lesson programs compile with Java Arena's JavaFX (the content build checks it); a probe that doesn't is broken.
      if (p.ours.error) return { program: p, runs: [], problems: [`doesn't compile with Java Arena's JavaFX:\n${indent(p.ours.error)}`] };
      if (p.real.error) return { program: p, runs: [], problems: [`doesn't compile with real JavaFX (it uses something real JavaFX doesn't have, or has differently):\n${indent(p.real.error)}`] };
      const runs = await Promise.all(p.runs.map(async (run, j) => ({ run, ...(await runBoth(p, run, tmp, jars, driver, `${i}-${j}`)) })));
      if (process.env.FX_CHECK_VERBOSE)
        for (const { run, real } of runs) console.log(`--- ${p.where} (${run.name}) on real JavaFX: exit code ${real.exitCode}\n${real.stdout}${stderrHeads(real.stderr) ? `stderr:\n${stderrHeads(real.stderr)}\n` : ""}${windowOutline(parseWindow(real.window))}${real.window ? "" : " (no window file)"}\n${parseWindow(real.window)?.problems.join("\n") ?? ""}`);
      const problems = runs.flatMap(({ run, ours, real }) => differences(ours, real).map((d) => (p.runs.length > 1 || run.eventsText ? `${run.name}: ${d}` : d)));
      return { program: p, runs, problems };
    }),
  );

  let failed = 0;
  const report = { openjfx: OPENJFX_VERSION, monocle: MONOCLE_VERSION, groups: {} };
  for (const group of ["library", "content"]) {
    const mine = results.filter((r) => r.program.group === group);
    const bad = mine.filter((r) => r.problems.length);
    failed += bad.length;
    const runs = mine.reduce((a, r) => a + r.runs.length, 0);
    report.groups[group] = { programs: mine.length, runs, differ: bad.map((r) => ({ where: r.program.where, problems: r.problems })) };
    const title = group === "library" ? "The library (probes and fidelity programs)" : "The lessons and drills";
    console.log(`\n${title}: ${mine.length - bad.length} of ${mine.length} programs (${runs} runs) behave the same on real OpenJFX ${OPENJFX_VERSION} as on Java Arena's JavaFX.`);
    for (const r of bad) console.log(`DIFF ${r.program.where}\n  ${r.problems.join("\n").replace(/\n/g, "\n  ")}`);
  }
  mkdirSync(join(ROOT, "fidelity", "out"), { recursive: true });
  writeFileSync(join(ROOT, "fidelity", "out", "fx-check.json"), JSON.stringify(report, null, 1));
  console.log(`\nfx-check: ${failed ? `${failed} program${failed > 1 ? "s differ" : " differs"}` : "no differences"} (${((Date.now() - t0) / 1000).toFixed(1)} s).`);
  process.exit(failed ? 1 : 0);
}

await main();
