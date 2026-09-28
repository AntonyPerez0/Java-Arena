/// <reference lib="webworker" />
// Short-lived worker that runs compiled classes on the JVM (Ristretto) once per input.
// The page kills it if a case runs too long (infinite loops).
// @ts-ignore - plain JavaScript module without types
import { createRunner } from "../../engine/dist/runner/runner-host.mjs";
import { fetchCached, type Manifest } from "./manifest";
import type { RunInput, RunResult } from "./types";

const decoder = new TextDecoder();
const post = (msg: unknown) => (self as unknown as Worker).postMessage(msg);

self.onmessage = async (e: MessageEvent) => {
  const { base, manifest, modules, classes, mainClass, inputs } = e.data as {
    base: string;
    manifest: Manifest;
    modules: Record<string, WebAssembly.Module> | null;
    classes: { path: string; bytes: Uint8Array }[];
    mainClass: string;
    inputs: RunInput[];
  };
  let runner: any;
  try {
    runner = await createRunner({ fetchAsset: (name: string) => fetchCached(base, manifest, name, () => {}), modules: modules ?? undefined });
  } catch (err: any) {
    post({ type: "fatal", message: String(err?.message ?? err) });
    return;
  }
  for (let i = 0; i < inputs.length; i++) {
    post({ type: "start", index: i });
    const t = performance.now();
    let result: RunResult;
    try {
      const r = await runner.run({ classes, mainClass, stdin: inputs[i].stdin ?? "", args: inputs[i].args ?? [], files: inputs[i].files ?? {} });
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
