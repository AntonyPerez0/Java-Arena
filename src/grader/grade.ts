// Checks a learner's program: compile with javac 21, run every test in the browser's JVM, and
// compare with the expected output (which came from a real JDK at build time).
import { compile, runClasses, DEFAULT_TIME_LIMIT_MS, type Diagnostic, type RunResult } from "../engine/client";
import { explainCrash, explainDiagnostic } from "../engine/friendly";
import type { Exercise } from "../content/types";
import { CHECK_CLASS, CHECK_FILE, checkRules, checkSource, normalizeOutput } from "./assemble.js";
import { explainCalls, withoutCheckFrames } from "./calls";
import { splitFiles } from "./files.js";
import { JUNIT_LIBRARY, TEST_RUNNER_CLASS, TEST_RUNNER_FILE, TEST_RUNNER_SOURCE, parseTestReport, testClassesOf, usesJUnit } from "./junit.js";
import { indentMessages } from "./style.js";

export type FriendlyDiagnostic = Diagnostic & { friendly: string | null };

export type TestResult = {
  name: string;
  pass: boolean;
  hidden?: boolean;
  stdin?: string;
  /** The code the check ran to call the learner's methods. */
  call?: string;
  /** Files the program could read in this test. */
  files?: Record<string, string>;
  expected?: string;
  got?: string;
  /** Why the run went wrong, in plain English (a crash, the time limit, an exit code). */
  note?: string;
  /** The crash's own message, as Java printed it. */
  stderr?: string;
  /** A test that ran the learner's JUnit tests: what they had to do on this version of the program. */
  junit?: { outcome: "pass" | "fail" };
};

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
  compileMs: number;
  /** The program has several files, so each message names its file. */
  multiFile?: boolean;
};


export function friendlyDiagnostics(list: Diagnostic[]): FriendlyDiagnostic[] {
  return list.map((d) => ({ ...d, friendly: explainDiagnostic(d) }));
}

/** A sentence about what went wrong in a run, or undefined when it ended normally. `sources` are
 * the learner's file names, where the crash's line is looked for. */
export function describeRun(r: RunResult | undefined, sources: string[] = ["Main.java"]): string | undefined {
  if (!r) return "This test didn't run.";
  if (r.internalError) return `The Java engine couldn't run the program (${r.internalError}). Try again; if it keeps happening, reload the page.`;
  if (r.timedOut) return `Time limit: the program ran for more than ${DEFAULT_TIME_LIMIT_MS / 1000} seconds and was stopped. Look for a loop that never ends. What it printed until then is shown.`;
  const crash = explainCrash(r.stderr, sources);
  if (crash && crash.line == null && /^(no main method|main is not static|no main class)$/.test(crash.exception)) return `The program didn't start. ${crash.explanation}`;
  if (crash) {
    const file = sources.length > 1 && crash.file ? `${crash.file}, ` : "";
    const where = crash.line ? ` (${file}line ${crash.line}${crash.method && crash.method !== "main" ? `, in ${crash.method}` : ""})` : "";
    return `The program crashed with ${crash.exception}${where}. ${crash.explanation}`;
  }
  if (r.truncated) return "The program printed more than 64 KB, so it was stopped. Probably a loop that never stops printing.";
  if (r.exitCode !== 0 && r.exitCode != null) return `The program ended with exit code ${r.exitCode} (System.exit). A program that finishes normally ends with 0.`;
  if (r.stderr.trim()) return "The program printed an error message.";
  return undefined;
}

/** Indentation problems in each file, named by file when there are several. */
function indentProblems(files: { path: string; text: string }[]): string[] {
  return files.flatMap((f) => (indentMessages(f.text) as string[]).map((m) => (files.length > 1 ? `${f.path}: ${m}` : m)));
}

/** A JUnit run gets longer than a plain program: JUnit's own classes load first. */
const JUNIT_TIME_LIMIT_MS = 30_000;

export async function grade(ex: Exercise, code: string): Promise<GradeResult> {
  const own = splitFiles(code) as { path: string; text: string }[];
  const sources = own.map((f) => f.path);
  const ruleProblems = checkRules(code, ex.require, ex.forbid) as string[];
  const style = indentProblems(own);
  const styleProblems = ex.style === "indent" ? style : [];
  const styleNotes = ex.style === "indent" ? [] : style;
  if (ex.tests.some((t) => t.junit)) return gradeJUnit(ex, own, { ruleProblems, styleProblems, styleNotes });
  const libraries = usesJUnit(own) ? [JUNIT_LIBRARY] : [];
  // Tests that call methods run a hidden check program next to the learner's Main.
  const check = ex.tests.some((t) => t.call != null) ? checkSource(ex.tests) : null;
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
  const base = { diagnostics: friendlyDiagnostics(callProblems.length ? [] : c.diagnostics), javacOutput: callProblems.length ? "" : c.output ?? "", ruleProblems, styleProblems, styleNotes, callProblems, compileMs: c.ms, multiFile: own.length > 1 };
  if (c.internalError) return { ...base, status: "internal-error", tests: [], internalError: c.internalError };
  if (callProblems.length) return { ...base, status: "call-error", tests: [] };
  if (!c.ok) return { ...base, status: "compile-error", tests: [] };
  const runs = await runClasses(c.classes, check ? CHECK_CLASS : "Main", ex.tests.map((t, i) => ({ stdin: t.stdin, ...(check ? { args: [String(i)] } : {}), ...(t.files ? { files: t.files } : {}) })), libraries.length ? JUNIT_TIME_LIMIT_MS : DEFAULT_TIME_LIMIT_MS, { libraries });
  if (runs.every((r) => r.internalError)) return { ...base, status: "internal-error", tests: [], internalError: runs[0]?.internalError };
  const tests = ex.tests.map((t, i): TestResult => {
    const r = runs[i];
    const got = r ? normalizeOutput(r.stdout) : "";
    const pass = !!r && !r.internalError && !r.timedOut && r.exitCode === 0 && got === t.expect;
    const note = pass ? undefined : describeRun(r, sources);
    const stderr = r?.stderr ? withoutCheckFrames(r.stderr) : "";
    return { name: t.name, pass, hidden: t.hidden, stdin: t.stdin, call: t.call, files: t.files, expected: t.expect, got, note, stderr: !pass && stderr ? stderr : undefined };
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
  const sources = own.map((f) => f.path);
  const libraries = [JUNIT_LIBRARY];
  const withRunner = (replace?: Record<string, string>) => [...own.map((f) => ({ path: f.path, text: replace?.[f.path] ?? f.text })), { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }];
  const c = await compile(withRunner(), { libraries });
  const base = { diagnostics: friendlyDiagnostics(c.diagnostics), javacOutput: c.output ?? "", ...rest, callProblems: [], compileMs: c.ms, multiFile: own.length > 1 };
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
    const ran = !r.timedOut && r.exitCode === 0 && report.complete && report.run > 0;
    const pass = ran && (t.outcome === "fail" ? report.passed < report.run : report.passed === report.run);
    const failed = report.run - report.passed;
    const note = pass
      ? undefined
      : !ran
        ? (report.complete && report.run === 0 ? "No test ran: a test method needs @Test in front of it, and must be public void with no parameters." : describeRun(r, sources) ?? "The tests stopped before the end.")
        : t.outcome === "fail"
          ? "Every test passed, but this version has a bug your tests should catch. Add a test that fails on it."
          : `${failed} of ${report.run} ${report.run === 1 ? "test" : "tests"} failed on this version, which should pass every test. Check what those tests expect.`;
    tests.push(result(pass, normalizeOutput(r.stdout), note, !pass && r.stderr ? r.stderr : undefined));
  }
  const allPass = tests.every((t) => t.pass) && rest.ruleProblems.length === 0 && rest.styleProblems.length === 0;
  return { ...base, status: allPass ? "pass" : "fail", tests };
}

export type FreeRun = {
  status: "ran" | "compile-error" | "internal-error";
  diagnostics: FriendlyDiagnostic[];
  javacOutput: string;
  run?: RunResult;
  note?: string;
  internalError?: string;
  /** The program has several files, so each message names its file. */
  multiFile?: boolean;
};

/**
 * Compile and run with the learner's own input (and any files the program reads), no grading. A
 * program with JUnit test classes and no main runs its tests instead.
 */
export async function runOnly(code: string, stdin: string, files?: Record<string, string>): Promise<FreeRun> {
  const own = splitFiles(code) as { path: string; text: string }[];
  const libraries = usesJUnit(own) ? [JUNIT_LIBRARY] : [];
  const testClasses = libraries.length && !/\bstatic\s+void\s+main\s*\(/.test(code) ? testClassesOf(own) : [];
  const c = await compile(testClasses.length ? [...own, { path: TEST_RUNNER_FILE, text: TEST_RUNNER_SOURCE }] : own, { libraries });
  const base = { diagnostics: friendlyDiagnostics(c.diagnostics), javacOutput: c.output ?? "", multiFile: own.length > 1 };
  if (c.internalError) return { ...base, status: "internal-error", internalError: c.internalError };
  if (!c.ok) return { ...base, status: "compile-error" };
  const [run] = testClasses.length
    ? await runClasses(c.classes, TEST_RUNNER_CLASS, [{ args: testClasses }], JUNIT_TIME_LIMIT_MS, { libraries })
    : await runClasses(c.classes, "Main", [{ stdin, ...(files ? { files } : {}) }], libraries.length ? JUNIT_TIME_LIMIT_MS : DEFAULT_TIME_LIMIT_MS, { libraries });
  if (run?.internalError) return { ...base, status: "internal-error", internalError: run.internalError };
  return { ...base, status: "ran", run, note: describeRun(run, own.map((f) => f.path)) };
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
