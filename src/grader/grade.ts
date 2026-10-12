// Checks a learner's program: compile with javac 21, run every test in the browser's JVM, and
// compare with the expected output (which came from a real JDK at build time).
import { compile, runClasses, DEFAULT_TIME_LIMIT_MS, type ClassFile, type Diagnostic, type RunResult, type SourceFile } from "../engine/client";
import { explainCrash, explainDiagnostic } from "../engine/friendly";
import type { Exercise } from "../content/types";
import { CHECK_CLASS, CHECK_FILE, checkRules, checkSource, normalizeOutput } from "./assemble.js";
import { AssetLoadError, programFiles, type GivenFile } from "./assets";
import { explainCalls, withoutCheckFrames } from "./calls";
import { splitFiles } from "./files.js";
import { JAVAFX_LIBRARY, WINDOW_FILE, withoutArenaFiles } from "./javafx.js";
import { JUNIT_LIBRARY, TEST_RUNNER_CLASS, TEST_RUNNER_FILE, TEST_RUNNER_SOURCE, parseTestReport, testClassesOf } from "./junit.js";
import { librariesFor } from "./libraries.js";
import { indentMessages } from "./style.js";
import { checkWindow, parseWindow, windowNote, withEventsFile, type WindowCheck, type WindowState } from "./window";
import { changedFiles, compareWrites, writesNote } from "./writes.js";

export type FriendlyDiagnostic = Diagnostic & { friendly: string | null };

export type TestResult = {
  name: string;
  pass: boolean;
  hidden?: boolean;
  stdin?: string;
  /** The command-line arguments main got. */
  args?: string[];
  /** The code the check ran to call the learner's methods. */
  call?: string;
  /** Files the program could read in this test: text, or an image of content/assets. */
  files?: Record<string, GivenFile>;
  /** Files the test wanted the program to write, each with what it should hold and what it holds (null: not created). */
  writes?: WrittenFileCheck[];
  expected?: string;
  got?: string;
  /** Why the run went wrong, in plain English (a crash, the time limit, an exit code). */
  note?: string;
  /** The crash's own message, as Java printed it. */
  stderr?: string;
  /**
   * When the run crashed: the crash's sentence as it is in `note`, a key that is the same for tests that crashed the
   * same way (the exception and its explanation, not the line, which can differ between runs of the same code), and a
   * short line that stands for it under a later test (see notesShown).
   */
  crash?: { text: string; key: string; short: string };
  /** A test that ran the learner's JUnit tests: what they had to do on this version of the program. */
  junit?: { outcome: "pass" | "fail" };
  /**
   * A test with clicks and typing (a JavaFX program): its events, the problems they met and, for a
   * visible test, the expected window and the learner's, with their outlines and the lines that
   * differ (see WindowCheck in ./window.ts). A hidden test gives only its events and whether the
   * window is right.
   */
  window?: WindowCheck;
};

/** One file a test wanted written: its text as expected and as the program left it (normalized like output). */
export type WrittenFileCheck = { name: string; expected: string; got: string | null; pass: boolean };

export type GradeResult = {
  /** "call-error": the learner's code compiles, but the check couldn't call its methods. */
  status: "pass" | "fail" | "compile-error" | "call-error" | "internal-error";
  diagnostics: FriendlyDiagnostic[];
  /** Everything javac printed. */
  javacOutput: string;
  tests: TestResult[];
  ruleProblems: string[];
  /** Indentation problems on a challenge that grades style (these fail it). */
  styleProblems: string[];
  /** Indentation notes on a challenge that doesn't grade style (shown, but not failing). */
  styleNotes: string[];
  /** Why the check couldn't call the learner's methods (status "call-error"). */
  callProblems: string[];
  internalError?: string;
  /**
   * An image the tests give the program couldn't be downloaded from the site (status
   * "internal-error" too, so it counts as no attempt): the sentence to show and announce instead of
   * the engine's message.
   */
  assetError?: string;
  compileMs: number;
  /** The program has several files, so each message names its file. */
  multiFile?: boolean;
};


/** `sources` are the learner's files, so that notes can name the program's own classes. */
export function friendlyDiagnostics(list: Diagnostic[], sources: SourceFile[] = []): FriendlyDiagnostic[] {
  return list.map((d) => ({ ...d, friendly: explainDiagnostic(d, sources) }));
}

/** A sentence about what went wrong in a run, or undefined when it ended normally. `sources` are
 * the learner's files (or their names), where the crash's line is looked for. */
export function describeRun(r: RunResult | undefined, sources: (string | SourceFile)[] = ["Main.java"], limitMs = DEFAULT_TIME_LIMIT_MS): string | undefined {
  if (!r) return "This test didn't run.";
  if (r.internalError) return `The Java engine couldn't run the program (${r.internalError}). Try again; if it keeps happening, reload the page.`;
  if (r.timedOut) return `Time limit: the program ran for more than ${limitMs / 1000} seconds and was stopped. Look for a loop that never ends. What it printed until then is shown.`;
  const crash = crashOf(r, sources);
  if (crash) return crash.text;
  if (r.truncated) {
    // A recursive method that prints on each call and never reaches its base case fills 64 KB before the call stack runs out.
    const self = selfCallingMethod(sources);
    if (self) return `The program printed more than 64 KB, so it was stopped. Probably a loop, or a method that keeps calling itself without reaching its base case (${self} calls itself), never stops printing.`;
    return "The program printed more than 64 KB, so it was stopped. Probably a loop that never stops printing.";
  }
  if (r.exitCode !== 0 && r.exitCode != null) return `The program ended with exit code ${r.exitCode} (System.exit). A program that finishes normally ends with 0.`;
  const handler = handlerException(r.stderr, sources);
  if (handler) return handler;
  if (r.stderr.trim()) return "The program printed an error message.";
  return undefined;
}

/** The sentence describeRun gives for a run that crashed (or didn't start), with its key and short line (see TestResult.crash). */
export function crashOf(r: RunResult, sources: (string | SourceFile)[] = ["Main.java"]): { text: string; key: string; short: string } | undefined {
  const crash = explainCrash(r.stderr, sources);
  if (!crash) return undefined;
  const key = `${crash.exception}\n${crash.explanation}`;
  if (crash.line == null && /^(no main method|main is not static|no main class)$/.test(crash.exception)) {
    const text = `The program didn't start. ${crash.explanation}`;
    return { text, key, short: "The program didn't start, for the same reason as in the test above." };
  }
  const file = sources.length > 1 && crash.file ? `${crash.file}, ` : "";
  const at = crash.line && !crash.placed ? `${file}line ${crash.line}` : "";
  const where = at ? ` (${at}${crash.method && crash.method !== "main" ? `, in ${crash.method}` : ""})` : "";
  return { text: `The program crashed with ${crash.exception}${where}. ${crash.explanation}`, key, short: `Crashed the same way as the test above (${crash.exception}${at ? `, ${at}` : ""}).` };
}

/** The name of the first method in the learner's files that calls itself, or null. */
export function selfCallingMethod(sources: (string | SourceFile)[]): string | null {
  for (const f of sources) {
    if (typeof f === "string") continue;
    // Comments and text in quotes don't count.
    const code = f.text.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\\n])*"/g, (m) => m.replace(/[^\n]/g, " "));
    const header = /(?<![\w$.])(?:[\w$<>\[\],.?]+\s+)+?([\w$]+)\s*\([^()]*\)\s*(?:throws\s[^{;]*)?\{/g;
    for (let m; (m = header.exec(code)); ) {
      const name = m[1];
      if (/^(?:if|for|while|switch|catch|synchronized|return|new|else)$/.test(name) || /\b(?:new|return|else)\s/.test(m[0])) continue;
      // The method's body: from its { to the matching }.
      let depth = 0;
      let end = code.length;
      for (let k = m.index + m[0].length - 1; k < code.length; k++) {
        if (code[k] === "{") depth++;
        else if (code[k] === "}" && --depth === 0) {
          end = k;
          break;
        }
      }
      const body = code.slice(m.index + m[0].length, end);
      if (new RegExp(`(?<![\\w$.])(?:this\\s*\\.\\s*)?${name.replace(/\$/g, "\\$")}\\s*\\(`).test(body)) return name;
    }
  }
  return null;
}

/** How JavaFX prints an exception that escapes an event handler (the program then goes on). */
const FX_THREAD_EXCEPTION = 'Exception in thread "JavaFX Application Thread" ';

/**
 * An exception that escaped a JavaFX event handler (a click or typing), explained as a crash is,
 * with its line: JavaFX prints it and goes on with the next event, so the program still ends normally.
 */
function handlerException(stderr: string, sources: (string | SourceFile)[]): string | undefined {
  const at = stderr.indexOf(FX_THREAD_EXCEPTION);
  if (at < 0) return undefined;
  // The first one, read as if it had ended main (that's the form explainCrash knows), explained as
  // one that ended only the handler.
  const next = stderr.indexOf(FX_THREAD_EXCEPTION, at + 1);
  const crash = explainCrash('Exception in thread "main" ' + stderr.slice(at + FX_THREAD_EXCEPTION.length, next < 0 ? undefined : next), sources, { handler: true });
  if (!crash) return undefined;
  const file = sources.length > 1 && crash.file ? `${crash.file}, ` : "";
  const where = crash.line && !crash.placed ? ` (${file}line ${crash.line})` : "";
  const trace = stderr.slice(at, next < 0 ? undefined : next);
  if (callerOfOwn(trace, sources) === "frames")
    return `An AnimationTimer's handle threw ${crash.exception}${where}. ${crash.explanation} JavaFX printed it and went on with the next frame, as it does (the timers after it skipped the frame it threw in), so the window shows what the frames had done before it.`;
  if (!throughHandler(trace, sources))
    return `JavaFX reported ${crash.exception}${where}. ${crash.explanation} JavaFX found it while a list it watches changed, such as a chart's list of series, so it printed the exception and went on with the program, as it does.`;
  return `An event handler threw ${crash.exception}${where}. ${crash.explanation} JavaFX printed it and went on with the next click or typing, as it does, so the window shows what the handler had done before it.`;
}

/**
 * Whether an exception printed on the JavaFX Application Thread went through an event handler or a
 * listener of the program's own. The outermost frame in the learner's files of the first exception's
 * trace (before any "Caused by") says, by what called it: when JavaFX's start-up of the program
 * (arena.fx.Session$Launch) called it, it is start (or a method or lambda start called), and JavaFX's
 * own list listener threw it while start changed a list, as a chart does for a series added twice.
 * Anything else that called it (a button's fire, a slider's listeners, a mouse event) ran a handler,
 * however many of the program's own methods it then called.
 */
function throughHandler(trace: string, sources: (string | SourceFile)[]): boolean {
  return callerOfOwn(trace, sources) !== "start";
}

/**
 * What called the outermost frame in the learner's files of the first exception's trace: JavaFX's
 * start-up of the program ("start"), the frames that run the started AnimationTimers ("frames"), or
 * anything else, such as a button's fire or a key event ("other", also when no frame is the learner's).
 */
function callerOfOwn(trace: string, sources: (string | SourceFile)[]): "start" | "frames" | "other" {
  const names = new Set(sources.map((s) => (typeof s === "string" ? s : s.path).split("/").pop()));
  const top = trace.split(/\nCaused by: /)[0];
  const frames = [...top.matchAll(/\n\s*at (?:[\w$.]+\/)?([\w$.]+)\.([\w$<>]+)\(([^)]*)\)/g)].map((m) => ({ cls: m[1], file: (m[3].match(/^([\w$]+\.java):\d+$/) ?? [])[1] }));
  const own = (f: { cls: string; file?: string }) => !!f.file && names.has(f.file) && !/^(?:java|javax|javafx|jdk|sun|arena)\./.test(f.cls);
  let outer = -1;
  frames.forEach((f, i) => {
    if (own(f)) outer = i;
  });
  if (outer < 0) return "other";
  const caller = frames[outer + 1];
  if (caller && /^arena\.fx\.Session\$Launch\b/.test(caller.cls)) return "start";
  if (caller && /^arena\.fx\.Frames$/.test(caller.cls)) return "frames";
  return "other";
}

/** Indentation problems in each file, named by file when there are several. */
function indentProblems(files: { path: string; text: string }[]): string[] {
  return files.flatMap((f) => (indentMessages(f.text) as string[]).map((m) => (files.length > 1 ? `${f.path}: ${m}` : m)));
}

/** A JUnit run gets longer than a plain program: JUnit's own classes load first. */
const JUNIT_TIME_LIMIT_MS = 30_000;
/** A JavaFX run loads Java Arena's JavaFX classes and starts two threads before the program's start method. */
const JAVAFX_TIME_LIMIT_MS = 15_000;

/** The site's base address, where the images that tests give programs are served (see ./assets); "/" outside Vite (the unit tests bundle this file). */
const BASE: string = import.meta.env?.BASE_URL ?? "/";

/**
 * The files of each run as the engine takes them (an image's bytes fetched from the site), or the
 * sentence saying which image couldn't be downloaded.
 */
async function filesOfRuns(list: (Record<string, GivenFile> | undefined)[]): Promise<(Record<string, string | Uint8Array> | undefined)[] | string> {
  try {
    return await Promise.all(list.map((files) => programFiles(files, BASE)));
  } catch (e) {
    if (e instanceof AssetLoadError) return e.message;
    throw e;
  }
}

/** The time limit of a run with these libraries on its class path. */
export const timeLimitFor = (libraries: string[]) => (libraries.includes(JUNIT_LIBRARY) ? JUNIT_TIME_LIMIT_MS : libraries.length ? JAVAFX_TIME_LIMIT_MS : DEFAULT_TIME_LIMIT_MS);

export async function grade(ex: Exercise, code: string): Promise<GradeResult> {
  const own = splitFiles(code) as { path: string; text: string }[];
  const ruleProblems = checkRules(code, ex.require, ex.forbid) as string[];
  const style = indentProblems(own);
  const styleProblems = ex.style === "indent" ? style : [];
  const styleNotes = ex.style === "indent" ? [] : style;
  if (ex.tests.some((t) => t.junit)) return gradeJUnit(ex, own, { ruleProblems, styleProblems, styleNotes });
  const libraries = librariesFor(own);
  // Tests that call methods run a hidden check program next to the learner's Main.
  const check = ex.tests.some((t) => t.call != null) ? checkSource(ex.tests, own) : null;
  let c = await compile(check ? [...own, { path: CHECK_FILE, text: check.text }] : own, { libraries });
  let callProblems: string[] = [];
  if (check && !c.ok && !c.internalError) {
    if (c.diagnostics.some((d) => d.kind === "error" && d.file !== CHECK_FILE)) {
      // The learner's own errors come first, shown exactly as javac prints them for their files alone.
      const alone = await compile(own, { libraries });
      if (alone.ok) callProblems = explainCalls(c.diagnostics, check.ranges, ex.tests, code);
      else c = alone;
    } else callProblems = explainCalls(c.diagnostics, check.ranges, ex.tests, code);
  }
  const base = { diagnostics: friendlyDiagnostics(callProblems.length ? [] : c.diagnostics, own), javacOutput: callProblems.length ? "" : c.output ?? "", ruleProblems, styleProblems, styleNotes, callProblems, compileMs: c.ms, multiFile: own.length > 1 };
  if (c.internalError) return { ...base, status: "internal-error", tests: [], internalError: c.internalError };
  if (callProblems.length) return { ...base, status: "call-error", tests: [] };
  if (!c.ok) return { ...base, status: "compile-error", tests: [] };
  // A test's images come from the site; one that can't be loaded (offline before the site was saved) stops the check.
  const given = await filesOfRuns(ex.tests.map((t) => t.files));
  if (typeof given === "string") return { ...base, status: "internal-error", tests: [], internalError: given, assetError: given };
  // A test with events gives a JavaFX program its clicks and typing in .arena/events.txt, next to its files.
  const inputs = ex.tests.map((t, i) => ({ stdin: t.stdin, ...(check ? { args: [String(i)] } : t.args ? { args: t.args } : {}), ...(t.events ? { files: withEventsFile(given[i], t.events) } : given[i] ? { files: given[i] } : {}) }));
  const runs = await runClasses(c.classes, check ? CHECK_CLASS : "Main", inputs, timeLimitFor(libraries), { libraries });
  if (runs.every((r) => r.internalError)) return { ...base, status: "internal-error", tests: [], internalError: runs[0]?.internalError };
  const tests = ex.tests.map((t, i): TestResult => {
    const r = runs[i];
    const got = r ? normalizeOutput(r.stdout) : "";
    // The files the test wants written, once the run has ended by itself (a stopped run keeps none).
    const writes: WrittenFileCheck[] | undefined = t.writes && r && !r.internalError && !r.timedOut ? compareWrites(t.writes, r.files) : undefined;
    // The window a JavaFX program left after the test's clicks and typing (none when the run was stopped, which the check then says).
    const windowFile = r?.files?.[WINDOW_FILE];
    const window: WindowCheck | undefined = t.events && r && !r.internalError ? { ...checkWindow({ events: t.events, outline: t.outline ?? "", window: t.window, hidden: t.hidden }, r.timedOut || typeof windowFile !== "string" ? null : windowFile), ...(r.timedOut ? { stopped: true } : {}) } : undefined;
    const pass = !!r && !r.internalError && !r.timedOut && r.exitCode === 0 && got === t.expect && (!t.writes || !!writes?.every((f) => f.pass)) && (!t.events || !!window?.pass);
    let note = pass ? undefined : (describeRun(r, own, timeLimitFor(libraries)) ?? (writes && writesNote(writes, t.hidden)));
    // The crash part of the note, so that the same crash under several tests is explained once (notesShown).
    const crash = !pass && r && !r.internalError && !r.timedOut ? crashOf(r, own) : undefined;
    // A run that ended normally (perhaps after a handler printed an exception) also says what is wrong with its window.
    if (!pass && window && r && !r.timedOut && r.exitCode === 0) note = [note, windowNote(window, t.hidden)].filter(Boolean).join(" ") || undefined;
    const stderr = r?.stderr ? withoutCheckFrames(r.stderr) : "";
    return { name: t.name, pass, hidden: t.hidden, stdin: t.stdin, ...(t.args ? { args: t.args } : {}), call: t.call, files: withoutArenaFiles(t.files), writes, expected: t.expect, got, note, ...(crash && note?.includes(crash.text) ? { crash } : {}), stderr: !pass && stderr ? stderr : undefined, ...(window ? { window } : {}) };
  });
  const allPass = tests.every((t) => t.pass) && ruleProblems.length === 0 && styleProblems.length === 0;
  return { ...base, status: allPass ? "pass" : "fail", tests };
}

/**
 * A challenge whose tests run the learner's JUnit tests: on the program as written, and on other
 * versions of some of its files (such as one with a bug), each wanting every test to pass or at
 * least one to fail.
 */
async function gradeJUnit(ex: Exercise, own: { path: string; text: string }[], rest: { ruleProblems: string[]; styleProblems: string[]; styleNotes: string[] }): Promise<GradeResult> {
  const libraries = [JUNIT_LIBRARY, ...librariesFor(own).filter((l) => l !== JUNIT_LIBRARY)];
  // Files the challenge gives ready (the same in the starter code and the solution) are checked as
  // given: otherwise a learner could change the class under test to suit a wrong test.
  const solution = new Map((splitFiles(ex.solution) as { path: string; text: string }[]).map((f) => [f.path, f.text]));
  const given = new Map((splitFiles(ex.seed) as { path: string; text: string }[]).filter((f) => solution.get(f.path) === f.text).map((f) => [f.path, f.text]));
  const changedGiven = own.filter((f) => given.has(f.path) && given.get(f.path)!.trim() !== f.text.trim()).map((f) => f.path);
  const withRunner = (replace?: Record<string, string>) => [...own.map((f) => ({ path: f.path, text: replace?.[f.path] ?? given.get(f.path) ?? f.text })), { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }];
  const c = await compile(withRunner(), { libraries });
  const base = { diagnostics: friendlyDiagnostics(c.diagnostics, own), javacOutput: c.output ?? "", ...rest, callProblems: [], compileMs: c.ms, multiFile: own.length > 1 };
  if (c.internalError) return { ...base, status: "internal-error", tests: [], internalError: c.internalError };
  if (!c.ok) return { ...base, status: "compile-error", tests: [] };
  const tests: TestResult[] = [];
  for (const t of ex.tests) {
    const wanted = t.outcome === "fail" ? "At least one test fails" : "Every test passes";
    const result = (pass: boolean, got: string, note?: string, stderr?: string): TestResult => ({ name: t.name, pass, hidden: t.hidden, expected: wanted, got, note, stderr, junit: { outcome: t.outcome ?? "pass" } });
    let classes = c.classes;
    if (t.replace) {
      const v = await compile(withRunner(t.replace), { libraries });
      if (v.internalError) return { ...base, status: "internal-error", tests: [], internalError: v.internalError };
      if (!v.ok) {
        const first = v.diagnostics.find((d) => d.kind === "error");
        tests.push(result(false, "", `Your tests don't compile with this version of the program${first ? `: ${first.message.split("\n")[0]}` : ""}. Use only the methods the task names.`));
        continue;
      }
      classes = v.classes;
    }
    const [r] = await runClasses(classes, TEST_RUNNER_CLASS, [{ args: [t.junit!] }], JUNIT_TIME_LIMIT_MS, { libraries });
    if (r.internalError) return { ...base, status: "internal-error", tests: [], internalError: r.internalError };
    const report = parseTestReport(r.stdout);
    const ran = !r.timedOut && r.exitCode === 0 && report.complete && report.run > 0 && report.problems.length === 0;
    const pass = ran && (t.outcome === "fail" ? report.passed < report.run : report.passed === report.run);
    const failed = report.run - report.passed;
    const note = pass
      ? undefined
      : !ran
        ? report.problems.length
          ? `JUnit couldn't run the tests: ${report.problems[0]}. A test method needs @Test in front of it, and must be public void with no parameters.`
          : report.complete && report.run === 0
            ? "No test ran: a test method needs @Test in front of it, and must be public void with no parameters."
            : describeRun(r, own, JUNIT_TIME_LIMIT_MS) ?? "The tests stopped before the end."
        : t.outcome === "fail"
          ? "Every test passed, but this version has a bug your tests should catch. Add a test that fails on it."
          : `${failed} of ${report.run} ${report.run === 1 ? "test" : "tests"} failed on this version, which should pass every test. Check what those tests expect.`;
    tests.push(result(pass, normalizeOutput(r.stdout), note, !pass && r.stderr ? r.stderr : undefined));
  }
  // Say so on the first failed test when the learner changed a file that's checked as given.
  const firstFailed = tests.findIndex((t) => !t.pass);
  if (changedGiven.length && firstFailed >= 0) {
    const note = `${changedGiven.join(" and ")} ${changedGiven.length === 1 ? "is" : "are"} checked as given, so changes to ${changedGiven.length === 1 ? "it" : "them"} don't count here.`;
    const t = tests[firstFailed];
    tests[firstFailed] = { ...t, note: t.note ? `${note} ${t.note}` : note };
  }
  const allPass = tests.every((t) => t.pass) && rest.ruleProblems.length === 0 && rest.styleProblems.length === 0;
  return { ...base, status: allPass ? "pass" : "fail", tests };
}

/**
 * A free run's program, compiled, with the input it got: the window panel runs it again from the
 * start with more clicks and typing (rerun) without compiling it again.
 */
export type CompiledProgram = { classes: ClassFile[]; libraries: string[]; sources: SourceFile[]; stdin: string; files?: Record<string, string | Uint8Array>; args?: string[] };

export type FreeRun = {
  status: "ran" | "compile-error" | "internal-error";
  diagnostics: FriendlyDiagnostic[];
  javacOutput: string;
  run?: RunResult;
  /** The files the program created or changed in its folder (not the files it was given, unchanged): text, or the bytes of one that isn't text. */
  written?: WrittenFile[];
  /**
   * A JavaFX program's windows when its session ended (after the events given), as the library
   * wrote them to .arena/window.json; null when it wrote none (no launch, start failed, stopped).
   * Absent for a program that doesn't use JavaFX.
   */
  window?: WindowState | null;
  /** A JavaFX program: the clicks and typing it ran with, and the program, to run it again with more (rerun). */
  events?: string[];
  program?: CompiledProgram;
  note?: string;
  internalError?: string;
  /** An image given to the program couldn't be downloaded from the site: the sentence to show instead of the engine's message (see GradeResult). */
  assetError?: string;
  /** The program has several files, so each message names its file. */
  multiFile?: boolean;
};

/** A file a free run created or changed: its text, or its bytes when it isn't text. */
export type WrittenFile = { name: string; text?: string; bytes?: Uint8Array };

/**
 * Compile and run with the learner's own input (and any files the program reads: text, or images
 * of content/assets, fetched from the site), no grading. A program with JUnit test classes and no
 * main runs its tests instead. A JavaFX program gets `events` (clicks and typing, one event line
 * each) in .arena/events.txt, and main gets `args`.
 */
export async function runOnly(code: string, stdin: string, givenFiles?: Record<string, GivenFile>, options: { events?: string[]; args?: string[] } = {}): Promise<FreeRun> {
  const own = splitFiles(code) as { path: string; text: string }[];
  const libraries = librariesFor(own);
  const noMain = !/\bstatic\s+void\s+main\s*\(/.test(code);
  const found = testClassesOf(own);
  // Without a @Test, the classes that use JUnit are run, so the report says why no test ran.
  const testClasses = libraries.includes(JUNIT_LIBRARY) && noMain ? (found.length ? found : own.filter((f) => /\borg\s*\.\s*junit\b/.test(f.text)).map((f) => f.path.replace(/\.java$/, "").replace(/\//g, "."))) : [];
  const c = await compile(testClasses.length ? [...own, { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }] : own, { libraries });
  const base = { diagnostics: friendlyDiagnostics(c.diagnostics, own), javacOutput: c.output ?? "", multiFile: own.length > 1 };
  if (c.internalError) return { ...base, status: "internal-error", internalError: c.internalError };
  if (!c.ok) return { ...base, status: "compile-error" };
  const resolved = await filesOfRuns([givenFiles]);
  if (typeof resolved === "string") return { ...base, status: "internal-error", internalError: resolved, assetError: resolved };
  const files = resolved[0];
  if (testClasses.length) {
    const [run] = await runClasses(c.classes, TEST_RUNNER_CLASS, [{ args: testClasses, ...(files ? { files } : {}) }], JUNIT_TIME_LIMIT_MS, { libraries });
    if (run?.internalError) return { ...base, status: "internal-error", internalError: run.internalError };
    return { ...base, status: "ran", run, written: changedFiles(files, run?.files), note: describeRun(run, own, JUNIT_TIME_LIMIT_MS) };
  }
  const program: CompiledProgram = { classes: c.classes, libraries, sources: own, stdin, ...(files ? { files } : {}), ...(options.args ? { args: options.args } : {}) };
  return { ...base, ...(await runProgram(program, options.events)) };
}

/**
 * Runs a free run's compiled program again from the start (the window panel does, with each click
 * and typing added to the earlier ones), with the input it had. Nothing is compiled again.
 */
export async function rerun(program: CompiledProgram, events: string[]): Promise<FreeRun> {
  return { diagnostics: [], javacOutput: "", multiFile: program.sources.length > 1, ...(await runProgram(program, events)) };
}

async function runProgram(p: CompiledProgram, events?: string[]): Promise<Omit<FreeRun, "diagnostics" | "javacOutput" | "multiFile">> {
  const javafx = p.libraries.includes(JAVAFX_LIBRARY);
  // A JavaFX program always gets an events file (an empty one: no clicks yet), so the page's runs are all alike.
  const clicks = javafx ? (events ?? []) : undefined;
  const [run] = await runClasses(p.classes, "Main", [{ stdin: p.stdin, ...(clicks ? { files: withEventsFile(p.files, clicks) } : p.files ? { files: p.files } : {}), ...(p.args ? { args: p.args } : {}) }], timeLimitFor(p.libraries), { libraries: p.libraries });
  if (run?.internalError) return { status: "internal-error", internalError: run.internalError };
  const windowFile = run?.files?.[WINDOW_FILE];
  const fx = javafx ? { window: run?.timedOut || typeof windowFile !== "string" ? null : parseWindow(windowFile), events: clicks, program: p } : {};
  return { status: "ran", run, written: changedFiles(p.files, run?.files), note: describeRun(run, p.sources, timeLimitFor(p.libraries)), ...fx };
}

export type PredictResult = { pass: boolean; lines: { pass: boolean; got: string }[] };

/** "What does it print?": compares each typed line with the line the program really prints. */
export function gradePredict(ex: Exercise, answers: string[]): PredictResult {
  const want = ex.lines ?? [];
  const lines = want.map((w, i) => {
    const got = answers[i] ?? "";
    return { pass: got.trim() === w.trim(), got };
  });
  return { pass: lines.every((l) => l.pass), lines };
}
