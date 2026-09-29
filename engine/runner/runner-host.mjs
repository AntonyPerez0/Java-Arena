// Java Arena runner host: runs precompiled Java classes on Ristretto (a JVM in WebAssembly) with a
// JDK 21 java.base image, inside a browser Worker or in Node 22.
//
// API
//   const runner = await createRunner({ fetchAsset, modules, freshInstance })
//     fetchAsset(name) -> Promise<Uint8Array | ArrayBuffer | Response>
//       Loads a file that sits next to this module in dist/runner/: 'runner.core.wasm',
//       'runner.core2.wasm', 'runner.core3.wasm' and 'jdk.zip'. Defaults to fetch() relative to
//       this module's URL (browser) or reading the file (Node).
//     modules: optional { 'runner.core.wasm': WebAssembly.Module, ... } compiled earlier, for example
//       runner.modules posted from another Worker. Skips the slowest start-up step.
//     freshInstance: when true, every run gets a new WebAssembly instance (still from the compiled
//       modules). Default false: one instance serves many runs, each on a fresh JVM.
//   runner.modules      compiled WebAssembly.Module objects (structured-cloneable to other Workers)
//   runner.timings      { compileMs, instantiateMs, mountMs, readyMs } for the start-up
//   await runner.run({ classes, mainClass, stdin, args, files, outputLimit, onOutput })
//     classes: [{ path: 'Main.class', bytes: Uint8Array }]  (all classes of the program)
//     mainClass: binary name, for example 'Main' or 'pkg.Main'
//     stdin: string or Uint8Array, read until EOF (default empty)
//     args: string[] for main(String[] args)
//     files: { 'data.txt': string | Uint8Array, 'dir/x.txt': ... } created in the working
//       directory (/workspace, which is also user.dir) before main starts
//     outputLimit: bytes of stdout plus stderr before the program is stopped (default 65536)
//     onOutput(stream, text): optional, called while the program runs with 'stdout' or 'stderr'
//       and the text of each chunk the host receives (UTF-8 decoded in streaming mode, so a
//       character split between chunks arrives whole in the later call). The runner sends a
//       chunk at 16 KB, at a newline 50 ms or more after the previous chunk, every 50 ms while
//       output waits, and at the end. A Worker can post these to the page, so output printed
//       before a timeout is not lost when the page terminates the Worker.
//   -> { stdout, stderr, exitCode, outputTruncated, files, durationMs, error? }
//     stdout, stderr: the full text, including what onOutput already received
//     exitCode: the process status HotSpot's java launcher reports: 0 after a normal end,
//       n & 0xFF after System.exit(n) or Runtime.halt(n) on any thread (so -1 gives 255),
//       1 after an uncaught exception in main or a launcher error (no main class or method),
//       null when the output limit stopped the program (outputTruncated is then true)
//     outputTruncated: the output limit was reached; the text is cut before any incomplete
//       UTF-8 character at the limit
//     files: every file left in the working directory, { name: Uint8Array }
//     error: set only when the VM itself failed (not for Java exceptions or launcher errors)
//
// The site enforces time limits by terminating the Worker; nothing here can be interrupted.
//
// Parts of this file are adapted from Ristretto's web/shared/engine.ts
// (https://github.com/theseus-rs/ristretto), Copyright (c) the Ristretto authors,
// licensed under MIT OR Apache-2.0.

import { instantiate } from './runner.js';
import { createWasiImports, dirNode, filesFromTree, treeFromFiles } from './wasi-host.mjs';

const CORE_MODULES = ['runner.core.wasm', 'runner.core2.wasm', 'runner.core3.wasm'];
const DEFAULT_OUTPUT_LIMIT = 64 * 1024;
const utf8 = new TextEncoder();

async function toBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (typeof Response !== 'undefined' && value instanceof Response) {
    if (!value.ok) throw new Error(`Could not load runner asset (${value.status})`);
    return new Uint8Array(await value.arrayBuffer());
  }
  throw new TypeError('fetchAsset must return bytes or a Response');
}

async function defaultFetchAsset(name) {
  const url = new URL(name, import.meta.url);
  if (url.protocol === 'file:') {
    const { readFile } = await import('node:fs/promises');
    return new Uint8Array(await readFile(url));
  }
  return fetch(url);
}

async function inflateRaw(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read a zip archive (stored or deflated entries) into { path: Uint8Array }. */
export async function unzip(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let end = bytes.byteLength - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('Not a zip archive');
  const count = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const decoder = new TextDecoder();
  const jobs = [];
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Bad zip directory');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith('/')) continue;
    const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const data = bytes.subarray(dataStart, dataStart + compressedSize);
    if (method === 0) jobs.push(Promise.resolve([name, data.slice()]));
    else if (method === 8) jobs.push(inflateRaw(data).then((out) => [name, out]));
    else throw new Error(`Unsupported zip method ${method} for ${name}`);
  }
  return Object.fromEntries(await Promise.all(jobs));
}

const asBytes = (value) => (typeof value === 'string' ? utf8.encode(value) : new Uint8Array(value ?? []));

export async function createRunner({ fetchAsset = defaultFetchAsset, modules, freshInstance = false } = {}) {
  const started = performance.now();
  const timings = {};
  const load = async (name) => toBytes(await fetchAsset(name));
  const jdkPromise = load('jdk.zip').then(unzip);
  const compiled = { ...modules };
  await Promise.all(
    CORE_MODULES.filter((name) => !(compiled[name] instanceof WebAssembly.Module)).map(async (name) => {
      compiled[name] = await WebAssembly.compile(await load(name));
    }),
  );
  timings.compileMs = performance.now() - started;
  const mountStarted = performance.now();
  const jdk = treeFromFiles(await jdkPromise, true);
  timings.mountMs = performance.now() - mountStarted;

  const state = { root: dirNode(true), cwd: '/workspace', stdout: () => {}, stderr: () => {} };
  state.root.entries.set('jdk', jdk);
  const imports = createWasiImports(state);
  let component;
  const instantiateComponent = async () => {
    const begin = performance.now();
    component = await instantiate((name) => compiled[name], imports);
    timings.instantiateMs = performance.now() - begin;
  };
  await instantiateComponent();
  timings.readyMs = performance.now() - started;

  async function run({ classes = [], mainClass, stdin = '', args = [], files = {}, outputLimit = DEFAULT_OUTPUT_LIMIT, onOutput } = {}) {
    if (!mainClass) throw new TypeError('mainClass is required');
    if (!component) await instantiateComponent();
    const begin = performance.now();
    const workspace = treeFromFiles(Object.fromEntries(Object.entries(files).map(([name, value]) => [name, asBytes(value)])));
    // The component keeps its preopened root descriptor between runs, so swap the children.
    state.root.entries.set('workspace', workspace);
    state.root.entries.set('tmp', dirNode());
    const out = [];
    const err = [];
    const decoders = { stdout: new TextDecoder(), stderr: new TextDecoder() };
    const receive = (stream, chunks) => (bytes) => {
      chunks.push(bytes.slice());
      if (!onOutput) return;
      const text = decoders[stream].decode(bytes, { stream: true });
      if (text) onOutput(stream, text);
    };
    state.stdout = receive('stdout', out);
    state.stderr = receive('stderr', err);
    const request = JSON.stringify({
      mainClass,
      args: args.map(String),
      classes: classes.map((entry) => Array.from(entry.bytes ?? entry)),
      stdin: Array.from(asBytes(stdin)),
      outputLimit,
    });
    let result;
    try {
      result = JSON.parse(component.runClasses(request));
    } catch (error) {
      // A trap or a Rust exit leaves the instance unusable; the next run makes a new one.
      component = undefined;
      result = { exitCode: error?.exitError ? error.code : null, error: error?.message ?? String(error) };
    }
    if (freshInstance) component = undefined;
    state.stdout = state.stderr = () => {};
    const truncated = !!result.outputTruncated;
    if (onOutput && !truncated) {
      for (const stream of ['stdout', 'stderr']) {
        const rest = decoders[stream].decode();
        if (rest) onOutput(stream, rest);
      }
    }
    const decode = (chunks) => {
      const bytes = concat(chunks);
      return new TextDecoder().decode(truncated ? trimIncompleteUtf8(bytes) : bytes);
    };
    const response = {
      stdout: decode(out),
      stderr: decode(err),
      exitCode: truncated ? null : result.exitCode ?? null,
      outputTruncated: truncated,
      files: filesFromTree(workspace),
      durationMs: performance.now() - begin,
    };
    if (result.error && !truncated) response.error = result.error;
    return response;
  }

  return { run, modules: compiled, timings };
}

/** Drop an incomplete UTF-8 sequence at the end, where the output limit cut a character. */
function trimIncompleteUtf8(bytes) {
  let lead = bytes.length - 1;
  while (lead >= 0 && bytes.length - lead <= 3 && (bytes[lead] & 0xc0) === 0x80) lead--;
  if (lead < 0) return bytes;
  const byte = bytes[lead];
  const size = byte >= 0xf0 ? 4 : byte >= 0xe0 ? 3 : byte >= 0xc0 ? 2 : 1;
  return size > bytes.length - lead ? bytes.subarray(0, lead) : bytes;
}

function concat(chunks) {
  const size = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
