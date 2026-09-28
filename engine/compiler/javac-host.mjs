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
//   ]);
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
//   fresh javac run (like one "javac -d out <files>" command). It never throws for
//   bad Java code. If the compiler itself crashes (a Wasm trap), compile() throws
//   and the next compile() call recreates the compiler instance first.
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

export async function createJavac(options = {}) {
  const t0 = performance.now();
  let runtime = options.runtime;
  if (!runtime) {
    runtime = options.loadRuntime
      ? await options.loadRuntime()
      : await import(new URL('./javac.wasm-runtime.js', import.meta.url).href);
  }
  const t1 = performance.now();
  // TeaVM's loader compiles bytes itself; a URL string would be fetched by it too,
  // but reading bytes here lets us re-instantiate after a crash without refetching.
  const [wasmBytes, sdkBytes] = await Promise.all([toBytes(options.wasm), toBytes(options.sdk)]);
  const sdk = new Int8Array(sdkBytes.buffer, sdkBytes.byteOffset, sdkBytes.byteLength);

  let exports = null;
  let instantiateMs = 0;
  let sdkMs = 0;
  async function start() {
    const a = performance.now();
    const instance = await runtime.load(wasmBytes, {
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
    });
    const b = performance.now();
    instance.exports.loadPlatform(sdk);
    const c = performance.now();
    instantiateMs = b - a;
    sdkMs = c - b;
    exports = instance.exports;
  }
  await start();
  let broken = false;

  const javac = {
    loadTimings: { runtimeMs: t1 - t0, instantiateMs, sdkMs },

    compile(files) {
      if (broken) {
        throw new Error('javac: the compiler crashed earlier; call recover() and await it first');
      }
      const s = performance.now();
      let json;
      try {
        exports.reset();
        for (const f of files) exports.addSource(String(f.path), String(f.text));
        json = exports.compile();
      } catch (e) {
        broken = true;
        throw e;
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
      broken = false;
    },

    get broken() {
      return broken;
    },
  };
  return javac;
}
