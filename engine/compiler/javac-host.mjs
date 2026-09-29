// Java Arena: host module for the in-browser javac (OpenJDK javac 21 compiled to
// WebAssembly GC by TeaVM). Plain ES module; runs in a browser (module) Worker and
// in Node 22.
//
// API
//
//   const javac = await createJavac({
//     wasm,         // javac.wasm: URL string, ArrayBuffer, Uint8Array, Response, or a Promise of one
//     sdk,          // java-base-sdk.bin: ArrayBuffer, Uint8Array, Response, URL string, or a Promise of one
//     loadRuntime,  // optional: () => Promise<module>, the TeaVM runtime (javac.wasm-runtime.js).
//                   // Default: import('./javac.wasm-runtime.js') next to this file.
//     runtime,      // optional: the runtime module itself, instead of loadRuntime
//   });
//
//   const result = javac.compile([
//     { path: 'Main.java', text: '...' },
//     { path: 'shop/Item.java', text: '...' },   // files in packages use their directory path
//   ], { libraries: ['junit4'] });               // optional: libraries on the class path
//
//   await javac.loadLibrary('junit4', bytes);    // a library's class files, in the same
//                                                // archive format as the SDK (gzip or not);
//                                                // bytes like `sdk`. Returns the class count.
//   A compile sees only the libraries named in its `libraries` option, like
//   "javac -cp .:junit.jar:hamcrest.jar"; without it, a compile is a plain "javac".
//
//   result = {
//     success,        // true when javac reported no errors (same as javac's exit code 0)
//     classes,        // [{ path: 'Main.class' | 'shop/Item.class', bytes: Uint8Array }]
//     diagnostics,    // in the order javac printed them:
//                     // [{ kind: 'error' | 'warning' | 'note',
//                     //    code,          javac message key, e.g. 'compiler.err.expected'
//                     //    file,          source path as given, or null (e.g. for notes)
//                     //    line, column,  1-based (javac's own values; column counts a tab as
//                     //                   reaching the next multiple of 8), -1 when absent
//                     //    position, startPosition, endPosition,
//                     //                   0-based char offsets into the file, -1 when absent
//                     //    message,       javac's message text (may span several lines)
//                     //    formatted }]   exactly what javac 21 prints for it, e.g.
//                     //                   "Main.java:3: error: ';' expected\n<source line>\n<caret line>"
//     output,         // everything javac 21 would print for this compile (stderr), including
//                     // the "1 error" / "2 warnings" count lines, ending with a newline
//     errors, warnings,
//     timeMs,         // time spent in compile()
//   }
//
//   javac.compile() is synchronous and can be called many times; each call is a
//   fresh javac run (like one "javac -d out <files>" command). It does not throw
//   for bad Java code. If the compiler itself crashes (a Wasm trap, or a stack
//   overflow on extremely deeply nested code), it returns { success: false,
//   crashed: true, ... } with one diagnostic of code 'arena.compiler.crash', and
//   javac.broken becomes true: call `await javac.recover()` (a fresh instance,
//   about as long as the first load) before compiling again; compile() throws
//   while broken.
//
//   javac.loadTimings: { runtimeMs, instantiateMs, sdkMs } measured by createJavac.

const isNode = typeof process !== 'undefined' && !!(process.versions && process.versions.node);

async function toBytes(src) {
  src = await src;
  if (src instanceof Uint8Array) return src;
  if (src instanceof ArrayBuffer) return new Uint8Array(src);
  if (ArrayBuffer.isView(src)) return new Uint8Array(src.buffer, src.byteOffset, src.byteLength);
  if (typeof Response !== 'undefined' && src instanceof Response) {
    if (!src.ok) throw new Error(`javac: could not load ${src.url} (HTTP ${src.status})`);
    return new Uint8Array(await src.arrayBuffer());
  }
  if (typeof src === 'string' || src instanceof URL) {
    if (isNode && !/^https?:/.test(String(src))) {
      const fs = await import('node:fs/promises');
      const { fileURLToPath } = await import('node:url');
      const path = String(src).startsWith('file:') ? fileURLToPath(src) : String(src);
      return new Uint8Array(await fs.readFile(path));
    }
    return toBytes(fetch(src));
  }
  throw new TypeError('javac: expected bytes, a Response or a URL');
}

async function gunzip(bytes) {
  const gz = bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;
  if (!gz || typeof DecompressionStream === 'undefined') return bytes; // javac.wasm can gunzip too
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function createJavac(options = {}) {
  const t0 = performance.now();
  let runtime = options.runtime;
  if (!runtime) {
    runtime = options.loadRuntime
      ? await options.loadRuntime()
      : await import(new URL('./javac.wasm-runtime.js', import.meta.url).href);
  }
  const t1 = performance.now();
  // Bytes are kept so that recover() can re-instantiate without fetching again.
  // The SDK archive is gunzipped here with the platform's DecompressionStream when
  // available (faster than in Wasm, and it overlaps with compiling the module).
  const wasmBytesPromise = toBytes(options.wasm);
  const sdkPromise = toBytes(options.sdk).then(gunzip);

  let exports = null;
  let instantiateMs = 0;
  let sdkMs = 0;
  let sdk = null;
  async function start() {
    const a = performance.now();
    const wasmBytes = await wasmBytesPromise;
    const [instance, sdkBytes] = await Promise.all([
      runtime.load(wasmBytes, {
        stackDeobfuscator: { enabled: false },
        installImports(imports) {
          // javac prints nothing to System.out/err in normal operation; keep any
          // unexpected output visible for debugging.
          let out = '';
          let err = '';
          imports.teavmConsole.putcharStdout = (c) => {
            if (c === 10) { console.log(out); out = ''; } else out += String.fromCharCode(c);
          };
          imports.teavmConsole.putcharStderr = (c) => {
            if (c === 10) { console.error(err); err = ''; } else err += String.fromCharCode(c);
          };
        },
      }),
      sdkPromise,
    ]);
    const b = performance.now();
    sdk = new Int8Array(sdkBytes.buffer, sdkBytes.byteOffset, sdkBytes.byteLength);
    instance.exports.loadPlatform(sdk);
    const c = performance.now();
    instantiateMs = b - a;
    sdkMs = c - b;
    exports = instance.exports;
  }
  // Libraries are kept as bytes too, so that recover() can load them into the new instance.
  const libraries = new Map();
  function loadLibraryInto(name, bytes) {
    return exports.loadLibrary(name, new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength));
  }
  await start();
  let broken = false;

  const javac = {
    // instantiateMs: fetching and compiling javac.wasm (and gunzipping the SDK, in parallel);
    // sdkMs: handing the platform classes to javac.
    loadTimings: { runtimeMs: t1 - t0, instantiateMs, sdkMs },

    async loadLibrary(name, src) {
      const bytes = await toBytes(src).then(gunzip);
      libraries.set(String(name), bytes);
      return loadLibraryInto(String(name), bytes);
    },

    compile(files, options = {}) {
      if (broken) {
        throw new Error('javac: the compiler crashed earlier; call recover() and await it first');
      }
      const names = (options.libraries ?? []).map(String);
      const unknown = names.filter((n) => !libraries.has(n));
      if (unknown.length) throw new Error(`javac: library not loaded: ${unknown.join(', ')}`);
      const s = performance.now();
      let json;
      try {
        exports.reset();
        exports.useLibraries(names.join(','));
        for (const f of files) exports.addSource(String(f.path), String(f.text));
        json = exports.compile();
      } catch (e) {
        // A Wasm trap or a JS error such as RangeError (stack overflow on extremely
        // deeply nested code). The instance may be inconsistent now.
        broken = true;
        const message = `javac.wasm crashed: ${e && e.name}: ${e && e.message}`;
        return {
          success: false,
          crashed: true,
          classes: [],
          diagnostics: [{
            kind: 'error', code: 'arena.compiler.crash', file: null, line: -1, column: -1,
            position: -1, startPosition: -1, endPosition: -1, message, formatted: message,
          }],
          output: message + '\n',
          errors: 1,
          warnings: 0,
          timeMs: performance.now() - s,
        };
      }
      const r = JSON.parse(json);
      const classes = r.classes.map((path) => {
        const a = exports.classFile(path);
        return { path, bytes: new Uint8Array(a.buffer, a.byteOffset, a.byteLength) };
      });
      exports.reset();
      return {
        success: r.success,
        classes,
        diagnostics: r.diagnostics,
        output: r.output,
        errors: r.errors,
        warnings: r.warnings,
        timeMs: performance.now() - s,
      };
    },

    /** After a crash: makes a fresh compiler instance (about as long as the first load). */
    async recover() {
      await start();
      for (const [name, bytes] of libraries) loadLibraryInto(name, bytes);
      broken = false;
    },

    get broken() {
      return broken;
    },
  };
  return javac;
}
