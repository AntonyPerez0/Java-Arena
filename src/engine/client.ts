// Main-thread API for compiling and running Java.
// A persistent compile worker owns javac. Each run gets its own run worker (one is kept started in
// advance), which the page kills when a test case exceeds the time limit (infinite loops); the
// remaining cases then continue in a new worker.
import { CACHE_PREFIX, downloadSize, fetchManifest, type Manifest } from "./manifest";
import { engineSupported } from "./support";
import type { ClassFile, CompileResult, EngineStatus, RunInput, RunResult, SourceFile } from "./types";

export type { ClassFile, CompileResult, Diagnostic, EngineStatus, RunInput, RunResult, SourceFile } from "./types";
export { engineSupported } from "./support";

/** Default per-test time limit. The runner interprets bytecode, so it is more generous than C/C++ Arena's 3 s. */
export const DEFAULT_TIME_LIMIT_MS = 10_000;
/** How long a new run worker may take to start before the run is reported as failed. */
const STARTUP_LIMIT_MS = 60_000;

let compileWorker: Worker | null = null;
let status: EngineStatus = { state: "idle" };
const listeners = new Set<() => void>();
let nextId = 1;
const pending = new Map<number, (m: CompileResult) => void>();

// Handed over by the compile worker once the engine is ready: the manifest it used, the compiled
// runner modules and the JDK image, so run workers start fast and never fetch anything.
let runnerManifest: Manifest | null = null;
let runnerModules: Record<string, WebAssembly.Module> | null = null;
let jdkZip: Uint8Array | null = null;

type RunWorker = { worker: Worker; failed: string | null };
/** A run worker started in advance, so a Run click doesn't wait for the JVM's WebAssembly to start. */
let spare: RunWorker | null = null;

function setStatus(s: EngineStatus) {
  status = s;
  listeners.forEach((l) => l());
}

export function getEngineStatus() {
  return status;
}

export function subscribeEngine(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

const engineBase = () => new URL(import.meta.env.BASE_URL + "engine/", location.origin).href;

/**
 * Whether the learner is on mobile data: "yes" when the browser reports a cellular or
 * data-saving connection (Chrome on Android does), "no" when it reports another connection,
 * and "unknown" when it can't tell (Safari and Firefox don't report the connection type).
 */
export function mobileData(): "yes" | "no" | "unknown" {
  const c = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean; effectiveType?: string } }).connection;
  if (!c) return "unknown";
  if (c.saveData === true || c.type === "cellular" || c.effectiveType === "2g" || c.effectiveType === "slow-2g") return "yes";
  return "no";
}

/** A phone or tablet (a touch screen as the main pointer), where "unknown" may well mean mobile data. */
const touchDevice = () => typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;

let manifestPromise: Promise<Manifest | null> | null = null;
export function loadManifest(): Promise<Manifest | null> {
  if (!manifestPromise) {
    const p = fetchManifest(engineBase() + "manifest.json");
    manifestPromise = p;
    // A failed fetch is not remembered: the next call tries again.
    p.then((m) => {
      if (!m && manifestPromise === p) manifestPromise = null;
    });
  }
  return manifestPromise;
}

/** Megabytes the one-time engine download costs, once the manifest has loaded. */
export async function downloadMegabytes(): Promise<number | null> {
  const m = await loadManifest();
  if (!m) return null;
  const total = [...m.compiler, ...m.runner].reduce((a, f) => a + downloadSize(m, f), 0);
  return Math.round(total / 1e5) / 10;
}

/** Whether this version of the engine is already saved in the browser, so loading it costs no data. */
export async function engineCached(): Promise<boolean> {
  try {
    const m = await loadManifest();
    if (!m) return false;
    if (!(await caches.keys()).includes(CACHE_PREFIX + m.version)) return false;
    const cache = await caches.open(CACHE_PREFIX + m.version);
    const keys = new Set((await cache.keys()).map((r) => r.url));
    return [...m.compiler, ...m.runner].every((f) => keys.has(engineBase() + f));
  } catch {
    return false;
  }
}

/**
 * Whether to start the download without asking: not when it could cost the learner mobile data,
 * unless they said it may or the engine is already saved on this device.
 */
export async function mayAutoDownload(allowOnMobileData: boolean): Promise<boolean> {
  if (!engineSupported()) return false;
  const data = mobileData();
  if (allowOnMobileData || data === "no" || (data === "unknown" && !touchDevice())) return true;
  return engineCached();
}

function failPending(message: string) {
  for (const [id, cb] of pending) {
    pending.delete(id);
    cb({ ok: false, diagnostics: [], classes: [], ms: 0, internalError: message });
  }
}

function failEngine(message: string) {
  setStatus({ state: "error", message });
  failPending(message);
  compileWorker?.terminate();
  compileWorker = null;
}

/** Start downloading and starting the engine (no-op if already started or ready). */
export function ensureEngine() {
  if (!engineSupported()) {
    setStatus({ state: "error", message: "unsupported browser" });
    return;
  }
  if (compileWorker && status.state !== "error") return;
  compileWorker?.terminate();
  const worker = new Worker(new URL("./compile.worker.ts", import.meta.url), { type: "module" });
  compileWorker = worker;
  worker.onmessage = (e) => {
    if (worker !== compileWorker) return;
    const m = e.data;
    if (m.type === "progress") {
      if (status.state !== "error") setStatus({ state: "loading", loaded: m.loaded, total: m.total, stage: m.stage });
    } else if (m.type === "ready") {
      runnerManifest = m.manifest;
      runnerModules = m.runnerModules ?? null;
      jdkZip = m.jdkZip ?? null;
      setStatus({ state: "ready" });
      prepareSpare();
    } else if (m.type === "error") {
      failEngine(m.message);
    } else if (m.type === "compiled") {
      const cb = pending.get(m.id);
      pending.delete(m.id);
      cb?.(m.result);
    }
  };
  worker.onerror = (e) => {
    if (worker === compileWorker) failEngine(e.message || "The Java engine stopped unexpectedly");
  };
  setStatus({ state: "loading", loaded: 0, total: 1, stage: "download" });
  worker.postMessage({ type: "init", base: engineBase() });
}

/** Resolves once the engine is ready, or rejects with its error. */
export function engineReady(): Promise<void> {
  ensureEngine();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (status.state === "ready") {
        off();
        resolve();
      } else if (status.state === "error") {
        off();
        reject(new Error(status.message));
      }
    };
    const off = subscribeEngine(check);
    check();
  });
}

/** Compile Java source files with javac 21, with any named libraries (such as junit4) on the class path. */
export async function compile(files: SourceFile[], options: { libraries?: string[] } = {}): Promise<CompileResult> {
  ensureEngine();
  if (!compileWorker) return { ok: false, diagnostics: [], classes: [], ms: 0, internalError: status.state === "error" ? status.message : "the engine isn't running" };
  const id = nextId++;
  const worker = compileWorker;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    worker.postMessage({ type: "compile", id, files, libraries: options.libraries ?? [] });
  });
}

function startRunWorker(): RunWorker {
  const rw: RunWorker = { worker: new Worker(new URL("./run.worker.ts", import.meta.url), { type: "module" }), failed: null };
  // Until a run takes this worker over, remember a failure so the run doesn't wait for it.
  rw.worker.onmessage = (e) => {
    if (e.data?.type === "fatal") rw.failed = e.data.message;
  };
  rw.worker.onerror = (e) => {
    rw.failed = e.message || "the runner stopped unexpectedly";
  };
  rw.worker.postMessage({ type: "init", base: engineBase(), manifest: runnerManifest, modules: runnerModules, jdkZip });
  return rw;
}

function takeRunWorker(): RunWorker {
  let rw = spare;
  spare = null;
  if (!rw || rw.failed) {
    rw?.worker.terminate();
    rw = startRunWorker();
  }
  return rw;
}

function prepareSpare() {
  if (!spare && status.state === "ready" && runnerManifest) spare = startRunWorker();
}

const failed = (message: string): RunResult => ({ stdout: "", stderr: "", exitCode: null, timedOut: false, truncated: false, ms: 0, files: {}, internalError: message });

/**
 * Run cases from `first` on in one run worker. Resolves with the index of the next case still to
 * run: after a timeout the worker is killed and the caller continues in a new one.
 */
function runBatch(classes: ClassFile[], mainClass: string, cases: RunInput[], first: number, timeLimitMs: number, results: RunResult[], libraries: string[]): Promise<number> {
  return new Promise((resolve) => {
    const rw = takeRunWorker();
    const runner = rw.worker;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let current = -1;
    let started = 0;
    const asked = performance.now();
    let workerStartMs: number | undefined;
    const partial = { stdout: "", stderr: "" };
    let done = false;
    const finish = (next: number) => {
      if (done) return;
      done = true;
      if (timer) clearTimeout(timer);
      runner.terminate();
      resolve(next);
    };
    const arm = (ms: number, onTimeout: () => void) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(onTimeout, ms);
    };
    runner.onmessage = (e) => {
      const m = e.data;
      if (m.type === "start") {
        current = m.index;
        started = performance.now();
        partial.stdout = "";
        partial.stderr = "";
        if (current === first) workerStartMs = started - asked;
        arm(timeLimitMs, () => {
          // What the program printed before it was stopped is kept, so the learner can see where it got stuck.
          results[current] = { stdout: partial.stdout, stderr: partial.stderr, exitCode: null, timedOut: true, truncated: false, ms: performance.now() - started, files: {}, workerStartMs: current === first ? workerStartMs : undefined };
          finish(current + 1);
        });
      } else if (m.type === "output") {
        if (m.index === current) partial[m.stream as "stdout" | "stderr"] += m.text;
      } else if (m.type === "result") {
        results[m.index] = m.index === first ? { ...m.result, workerStartMs } : m.result;
      } else if (m.type === "done") {
        finish(cases.length);
      } else if (m.type === "fatal") {
        results[Math.max(current, first)] = failed(m.message);
        finish(cases.length);
      }
    };
    runner.onerror = (e) => {
      results[Math.max(current, first)] = failed(e.message || "the runner stopped unexpectedly");
      finish(cases.length);
    };
    if (rw.failed) {
      results[first] = failed(rw.failed);
      finish(cases.length);
      return;
    }
    arm(STARTUP_LIMIT_MS, () => {
      results[first] = failed("the Java runner took too long to start");
      finish(cases.length);
    });
    runner.postMessage({ type: "run", classes, mainClass, inputs: cases, first, libraries });
  });
}

/** Run compiled classes once per input, killing any case that exceeds timeLimitMs. Libraries (such as junit4) are loaded next to them. */
export async function runClasses(classes: ClassFile[], mainClass: string, inputs: RunInput[], timeLimitMs = DEFAULT_TIME_LIMIT_MS, options: { libraries?: string[] } = {}): Promise<RunResult[]> {
  await engineReady();
  const cases = inputs.length ? inputs : [{}];
  const results: RunResult[] = [];
  let next = 0;
  while (next < cases.length) {
    next = await runBatch(classes, mainClass, cases, next, timeLimitMs, results, options.libraries ?? []);
    prepareSpare();
  }
  for (let i = 0; i < cases.length; i++) results[i] ??= failed("this case was not run");
  return results;
}

export type CompileRunResult = { compile: CompileResult; runs: RunResult[] };

/** Compile, then run the main class on every input. */
export async function compileAndRun(files: SourceFile[], inputs: RunInput[], opts: { mainClass?: string; timeLimitMs?: number } = {}): Promise<CompileRunResult> {
  const c = await compile(files);
  if (!c.ok) return { compile: c, runs: [] };
  const runs = await runClasses(c.classes, opts.mainClass ?? "Main", inputs, opts.timeLimitMs);
  return { compile: c, runs };
}

export async function clearEngineCache() {
  for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX)) await caches.delete(k);
}
