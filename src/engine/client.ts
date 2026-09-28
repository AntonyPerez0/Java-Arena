// Main-thread API for compiling and running Java.
// A persistent compile worker owns javac; each run gets a fresh run worker that the page kills
// when a test case exceeds the time limit (infinite loops).
import { CACHE_PREFIX, downloadSize, fetchManifest, type Manifest } from "./manifest";
import type { ClassFile, CompileResult, EngineStatus, RunInput, RunResult, SourceFile } from "./types";

export type { ClassFile, CompileResult, Diagnostic, EngineStatus, RunInput, RunResult, SourceFile } from "./types";

/** Default per-test time limit. The runner interprets bytecode, so it is more generous than C/C++ Arena's 3 s. */
export const DEFAULT_TIME_LIMIT_MS = 10_000;
/** How long a new run worker may take to start before the run is reported as failed. */
const STARTUP_LIMIT_MS = 60_000;

let compileWorker: Worker | null = null;
let status: EngineStatus = { state: "idle" };
const listeners = new Set<() => void>();
let nextId = 1;
const pending = new Map<number, (m: CompileResult) => void>();
/** Compiled runner modules handed over by the compile worker, so run workers start faster. */
let runnerModules: Record<string, WebAssembly.Module> | null = null;

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
 * True when the browser reports a metered or data-saving connection. Chrome on Android
 * reports mobile data as type "cellular"; Data Saver sets saveData. Other browsers say nothing.
 */
export function onMobileData(): boolean {
  const c = (navigator as Navigator & { connection?: { type?: string; saveData?: boolean; effectiveType?: string } }).connection;
  return !!c && (c.saveData === true || c.type === "cellular" || c.effectiveType === "2g" || c.effectiveType === "slow-2g");
}

let manifestPromise: Promise<Manifest | null> | null = null;
export function loadManifest() {
  manifestPromise ??= fetchManifest(engineBase() + "manifest.json");
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

/** Download the engine on its own only when that can't cost the learner mobile data (or they said it may). */
export async function mayAutoDownload(allowOnMobileData: boolean): Promise<boolean> {
  if (allowOnMobileData || !onMobileData()) return true;
  return engineCached();
}

/** Start downloading and starting the engine (no-op if already started). */
export function ensureEngine() {
  if (!compileWorker) {
    compileWorker = new Worker(new URL("./compile.worker.ts", import.meta.url), { type: "module" });
    compileWorker.onmessage = (e) => {
      const m = e.data;
      if (m.type === "progress") setStatus({ state: "loading", loaded: m.loaded, total: m.total, stage: m.stage });
      else if (m.type === "ready") {
        runnerModules = m.runnerModules ?? null;
        setStatus({ state: "ready" });
      } else if (m.type === "error") setStatus({ state: "error", message: m.message });
      else if (m.type === "compiled") {
        const cb = pending.get(m.id);
        pending.delete(m.id);
        cb?.(m.result);
      }
    };
    compileWorker.onerror = (e) => setStatus({ state: "error", message: e.message || "The Java engine stopped unexpectedly" });
    setStatus({ state: "loading", loaded: 0, total: 1, stage: "download" });
  }
  if (status.state === "error") setStatus({ state: "loading", loaded: 0, total: 1, stage: "download" });
  compileWorker.postMessage({ type: "init", base: engineBase() });
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

/** Compile Java source files with javac 21. */
export function compile(files: SourceFile[]): Promise<CompileResult> {
  ensureEngine();
  const id = nextId++;
  return new Promise((resolve) => {
    pending.set(id, resolve);
    compileWorker!.postMessage({ type: "compile", id, files });
  });
}

const failed = (message: string): RunResult => ({ stdout: "", stderr: "", exitCode: null, timedOut: false, truncated: false, ms: 0, files: {}, internalError: message });

/** Run compiled classes once per input in a fresh worker, killing any case that exceeds timeLimitMs. */
export async function runClasses(classes: ClassFile[], mainClass: string, inputs: RunInput[], timeLimitMs = DEFAULT_TIME_LIMIT_MS): Promise<RunResult[]> {
  await engineReady();
  const manifest = await loadManifest();
  const cases = inputs.length ? inputs : [{}];
  return new Promise((resolve) => {
    const results: RunResult[] = [];
    const runner = new Worker(new URL("./run.worker.ts", import.meta.url), { type: "module" });
    let timer: ReturnType<typeof setTimeout> | null = null;
    let current = -1;
    let started = 0;
    const asked = performance.now();
    let workerStartMs: number | undefined;
    const finish = () => {
      if (timer) clearTimeout(timer);
      runner.terminate();
      for (let i = 0; i < cases.length; i++) results[i] ??= failed("not run, because an earlier case stopped the runner");
      resolve(results);
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
        if (m.index === 0) workerStartMs = started - asked;
        arm(timeLimitMs, () => {
          results[current] = { stdout: "", stderr: "", exitCode: null, timedOut: true, truncated: false, ms: performance.now() - started, files: {}, workerStartMs: current === 0 ? workerStartMs : undefined };
          finish();
        });
      } else if (m.type === "result") {
        results[m.index] = m.index === 0 ? { ...m.result, workerStartMs } : m.result;
      } else if (m.type === "done") {
        finish();
      } else if (m.type === "fatal") {
        results[Math.max(current, 0)] = failed(m.message);
        finish();
      }
    };
    runner.onerror = (e) => {
      results[Math.max(current, 0)] = failed(e.message || "the runner stopped unexpectedly");
      finish();
    };
    arm(STARTUP_LIMIT_MS, () => {
      results[0] = failed("the Java runner took too long to start");
      finish();
    });
    runner.postMessage({ type: "run", base: engineBase(), manifest, modules: runnerModules, classes, mainClass, inputs: cases });
  });
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
