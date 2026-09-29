/// <reference lib="webworker" />
// Persistent worker that owns javac. Downloads the whole engine once (kept in Cache Storage),
// starts javac, compiles the runner's WebAssembly modules, and hands those modules, the JDK image
// and the manifest it used to the page, so every run worker starts fast without fetching.
// @ts-ignore - plain JavaScript module without types
import { createJavac } from "../../engine/dist/compiler/javac-host.mjs";
// @ts-ignore - TeaVM's runtime loader, plain JavaScript
import * as teavmRuntime from "../../engine/dist/compiler/javac.wasm-runtime.js";
import { downloadSize, fetchCached, fetchManifest, saveManifest, type Manifest } from "./manifest";
import { engineSupported } from "./support";
import type { CompileResult, Diagnostic, SourceFile } from "./types";

type Javac = {
  compile(files: SourceFile[]): { success: boolean; crashed?: boolean; classes: { path: string; bytes: Uint8Array }[]; diagnostics: any[]; output?: string; timeMs: number };
  recover(): Promise<void>;
  broken: boolean;
};

let javac: Javac | null = null;
let readyPromise: Promise<void> | null = null;
let manifest: Manifest | null = null;
let failed = false;
const progress: Record<string, number> = {};
const fromCache: Record<string, boolean> = {};

function post(msg: unknown, transfer: Transferable[] = []) {
  (self as unknown as Worker).postMessage(msg, transfer);
}

function reportProgress() {
  if (!manifest || failed) return;
  const files = [...manifest.compiler, ...manifest.runner];
  const total = files.reduce((a, f) => a + downloadSize(manifest!, f), 0);
  const loaded = files.reduce((a, f) => a + Math.min(progress[f] || 0, downloadSize(manifest!, f)), 0);
  const stage = files.every((f) => fromCache[f] !== false) ? "cache" : "download";
  post({ type: "progress", loaded, total, stage });
}

async function init(base: string) {
  if (!engineSupported()) throw new Error("unsupported browser");
  const manifestUrl = new URL("manifest.json", base).href;
  manifest = await fetchManifest(manifestUrl);
  if (!manifest) throw new Error("couldn't download the Java engine (check your connection)");
  reportProgress();
  // Everything is fetched now, including the runner's files, so the engine also works offline later.
  const files = [...manifest.compiler, ...manifest.runner];
  const bytes = Object.fromEntries(
    await Promise.all(
      files.map(async (f) => [
        f,
        await fetchCached(base, manifest!, f, (n, cached) => {
          progress[f] = n;
          fromCache[f] = cached;
          reportProgress();
        }),
      ]),
    ),
  ) as Record<string, Uint8Array>;
  await saveManifest(manifestUrl, manifest);
  post({ type: "progress", loaded: 1, total: 1, stage: "start" });
  const wasmFiles = manifest.runner.filter((f) => f.endsWith(".wasm"));
  const [instance, modules] = await Promise.all([
    createJavac({ wasm: bytes["javac.wasm"], sdk: bytes["java-base-sdk.bin"], runtime: teavmRuntime }) as Promise<Javac>,
    Promise.all(wasmFiles.map(async (f) => [f, await WebAssembly.compile(bytes[f] as Uint8Array<ArrayBuffer>)] as const)),
  ]);
  javac = instance;
  // Warm up, so the learner's first compile is as fast as the later ones.
  javac.compile([{ path: "Main.java", text: 'public class Main { public static void main(String[] a) { System.out.println("ok"); } }' }]);
  const jdk = bytes["jdk.zip"];
  post({ type: "ready", runnerModules: Object.fromEntries(modules), manifest, jdkZip: jdk }, [jdk.buffer]);
}

function toDiagnostic(d: any): Diagnostic {
  return { kind: d.kind, code: d.code, file: d.file ?? "", line: d.line, column: d.column, message: d.message, formatted: d.formatted };
}

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data;
  if (msg.type === "init") {
    if (!readyPromise) {
      failed = false;
      readyPromise = init(msg.base).catch((err) => {
        failed = true;
        readyPromise = null;
        post({ type: "error", message: String(err?.message ?? err) });
        throw err;
      });
      readyPromise.catch(() => {});
    }
    return;
  }
  if (msg.type === "compile") {
    const t = performance.now();
    let result: CompileResult;
    try {
      if (!readyPromise) throw new Error("the engine hasn't started");
      await readyPromise;
      if (javac!.broken) await javac!.recover();
      const r = javac!.compile(msg.files);
      if (r.crashed) {
        // javac itself failed (for example extremely deep nesting overflowed its stack); the next
        // compile gets a fresh compiler.
        result = { ok: false, diagnostics: [], classes: [], ms: r.timeMs, internalError: r.diagnostics[0]?.message ?? "the compiler crashed" };
      } else {
        result = { ok: r.success, diagnostics: r.diagnostics.map(toDiagnostic), classes: r.classes, ms: r.timeMs, output: r.output ?? "" };
      }
    } catch (err: any) {
      result = { ok: false, diagnostics: [], classes: [], ms: performance.now() - t, internalError: String(err?.message ?? err) };
    }
    post({ type: "compiled", id: msg.id, result }, result.classes.map((c) => c.bytes.buffer));
  }
};
