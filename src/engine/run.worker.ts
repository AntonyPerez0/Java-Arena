/// <reference lib="webworker" />
// Short-lived worker that runs compiled classes on the JVM (Ristretto), one test case after
// another, each on a fresh JVM. It starts the JVM's WebAssembly as soon as it is created ("init"),
// so the page can keep one ready in advance. Output is sent to the page as it is printed, so a
// program that runs too long still shows what it printed before the page killed this worker.
// @ts-ignore - plain JavaScript module without types
import { createRunner as createRunnerJs } from "../../engine/dist/runner/runner-host.mjs";
import { fetchCached, libraryClasses, type Manifest } from "./manifest";
import type { RunInput, RunResult } from "./types";

// runner-host.mjs is plain JavaScript; its options are documented at the top of the file.
const createRunner = createRunnerJs as (options: { fetchAsset: (name: string) => Promise<Uint8Array>; modules?: Record<string, WebAssembly.Module> }) => Promise<any>;
const decoder = new TextDecoder();
const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

let runnerPromise: Promise<any> | null = null;
let assetBase = "";
let assetManifest: Manifest | null = null;
const libraryCache = new Map<string, Promise<{ path: string; bytes: Uint8Array }[]>>();

/** A library's class files (such as JUnit's), from the engine cache. */
function library(name: string) {
  let p = libraryCache.get(name);
  if (!p) {
    p = fetchCached(assetBase, assetManifest!, `${name}.bin`, () => {}).then(libraryClasses);
    libraryCache.set(name, p);
  }
  return p;
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    const { base, manifest, modules, jdkZip } = msg as { base: string; manifest: Manifest; modules: Record<string, WebAssembly.Module> | null; jdkZip: Uint8Array | null };
    assetBase = base;
    assetManifest = manifest;
    // The JDK image comes from the page when it has one (no Cache Storage round trip, and no
    // download when the browser can't cache); the wasm modules come compiled.
    const fetchAsset = (name: string) => (name === "jdk.zip" && jdkZip ? Promise.resolve(jdkZip) : fetchCached(base, manifest, name, () => {}));
    runnerPromise = createRunner({ fetchAsset, modules: modules ?? undefined });
    runnerPromise.then(
      () => post({ type: "ready" }),
      (err) => post({ type: "fatal", message: String(err?.message ?? err) }),
    );
    return;
  }
  if (msg.type !== "run") return;
  const { mainClass, inputs, first, libraries = [] } = msg as { classes: { path: string; bytes: Uint8Array }[]; mainClass: string; inputs: RunInput[]; first: number; libraries?: string[] };
  let classes = msg.classes as { path: string; bytes: Uint8Array }[];
  let runner: any;
  try {
    if (!runnerPromise) throw new Error("the runner wasn't started");
    runner = await runnerPromise;
    // The program's own classes come first, as on a class path.
    for (const name of libraries) classes = [...classes, ...(await library(name))];
  } catch (err: any) {
    post({ type: "fatal", message: String(err?.message ?? err) });
    return;
  }
  for (let i = first; i < inputs.length; i++) {
    post({ type: "start", index: i });
    const t = performance.now();
    let result: RunResult;
    try {
      const r = await runner.run({
        classes,
        mainClass,
        stdin: inputs[i].stdin ?? "",
        args: inputs[i].args ?? [],
        files: inputs[i].files ?? {},
        onOutput: (stream: "stdout" | "stderr", text: string) => post({ type: "output", index: i, stream, text }),
      });
      const files: Record<string, string> = {};
      for (const [name, bytes] of Object.entries(r.files ?? {})) files[name] = decoder.decode(bytes as Uint8Array);
      result = { stdout: r.stdout, stderr: r.stderr, exitCode: r.exitCode, timedOut: false, truncated: !!r.outputTruncated, ms: r.durationMs ?? performance.now() - t, files, internalError: r.error ? String(r.error) : undefined };
    } catch (err: any) {
      result = { stdout: "", stderr: "", exitCode: null, timedOut: false, truncated: false, ms: performance.now() - t, files: {}, internalError: String(err?.message ?? err) };
    }
    post({ type: "result", index: i, result });
  }
  post({ type: "done" });
};
