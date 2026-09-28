# Java Arena runner: a JVM in WebAssembly

This folder builds the runner half of Java Arena's in-browser Java engine. The compiler half (javac 21) turns the learner's code into `.class` files; the runner executes them.

- **runner.core.wasm** (plus two tiny helper modules and `runner.js`): [Ristretto](https://github.com/theseus-rs/ristretto), a Java virtual machine written in Rust, compiled to a WebAssembly component and transpiled by jco into core modules and JavaScript glue. It interprets bytecode and runs the real OpenJDK class library.
- **jdk.zip**: a `java.base`-only runtime image made by `jlink` from the reference JDK (OpenJDK 21.0.10, Ubuntu package `openjdk-21-jdk-headless 21.0.10+7-1~24.04`). This is the same JDK that the site uses to compute expected outputs, and the same one the compiler's platform classes come from.
- **runner-host.mjs** and **wasi-host.mjs**: plain ES modules that load the files, mount the JDK image and the program's files in an in-memory file system, and run a program. They work in a browser Worker and in Node 22.

`build.sh` writes everything to `engine/dist/runner/` with `manifest.json` (size, gzip -9 size and SHA-256 of each file, pinned sources) and `licenses/`.

## Use

```js
import { createRunner } from './runner-host.mjs';   // from engine/dist/runner/

const runner = await createRunner({ fetchAsset: (name) => fetch(name) });
const r = await runner.run({
  classes: [{ path: 'Main.class', bytes }],   // every class of the program
  mainClass: 'Main',
  stdin: '5\nAda\n',                         // supplied up front, then end of input
  args: ['one', 'two'],
  files: { 'data.txt': 'apples, 3\n' },       // created in the working directory
});
// r.stdout, r.stderr, r.exitCode, r.outputTruncated, r.files, r.durationMs
```

The full API is at the top of `runner-host.mjs`. One runner instance serves many runs, each on a fresh JVM. `runner.modules` holds the compiled WebAssembly modules; they can be posted to another Worker and passed as `createRunner({ modules })`, which skips the slowest start-up step. Time limits are enforced by the page terminating the Worker.

## Rebuild

```sh
engine/runner/build.sh           # add --clean to start from nothing, --test to run the tests
```

Requirements: Rust with `rustup` (the script adds the `wasm32-wasip2` target), Node 22 and npm, git, and the reference JDK 21 with `jmods/` at `/usr/lib/jvm/java-21-openjdk-amd64` (set `ARENA_JDK` to use another). The work folder is `/home/user/build/runner` (set `ARENA_RUNNER_WORK`). The steps are:

1. Fetch Ristretto at the pinned commit and apply `patches/ristretto.patch`.
2. Build the `ristretto_playground` crate for `wasm32-wasip2` with the same settings as Ristretto's own web build (`RUSTC_BOOTSTRAP=1`, an 8 MB stack).
3. Transpile the component with `@bytecodealliance/jco-transpile` 0.12.1 (`scripts/transpile.mjs`, Ristretto's options).
4. Make the JDK image: `jlink --add-modules java.base --no-header-files --no-man-pages`, zipped with fixed timestamps by `scripts/pack-jdk.mjs` (fflate 0.8.3). The `lib/modules` file is byte-identical to a second `jlink` run.
5. Collect licenses (`scripts/licenses.mjs`, adapted from Ristretto's): Ristretto's, OpenJDK's `legal/java.base`, and the license files of every Rust crate in the build.
6. Copy the files to `dist/runner/` and write `manifest.json`.

Network hosts used: github.com (git), index.crates.io and static.crates.io, static.rust-lang.org (the Rust target), registry.npmjs.org.

## Pinned sources

| Component | Source | Version | License |
|---|---|---|---|
| Ristretto | https://github.com/theseus-rs/ristretto | commit `8448588ecfcedf79a59d697939493f289c1c6ad7` (2026-09-27), crate version 0.34.0 | MIT OR Apache-2.0 |
| Rust crates | crates.io, pinned by Ristretto's `Cargo.lock` | | see `licenses/THIRD_PARTY_LICENSES.txt` |
| JDK image | `jmods/java.base.jmod` of the reference JDK | OpenJDK 21.0.10, Ubuntu `openjdk-21-jdk-headless 21.0.10+7-1~24.04` | GPL-2.0 with the Classpath Exception |
| jco-transpile (build tool; its runtime helpers end up in `runner.js`) | npm `@bytecodealliance/jco-transpile` | 0.12.1 | Apache-2.0 WITH LLVM-exception |
| fflate (build tool only) | npm `fflate` | 0.8.3 | MIT |

## What the patch changes, and why

`patches/ristretto.patch` is applied to the pinned commit. Every change serves one goal: the browser must print exactly what HotSpot 21 prints for the same class files.

- **A run request for precompiled classes** (`web/runner/src/arena.rs`, `wit/playground.wit`, `lib.rs`): a new `run-classes` export takes the class files, main class, arguments and stdin as JSON and returns the exit code and whether output was cut off. stdin is the given bytes, then end of input; `System.in.available()` reports what is left, as HotSpot does for redirected input.
- **Output limit**: stdout and stderr together stop at 64 KB. The program is halted at the limit (instead of `PrintStream` silently swallowing the error and looping on), and what was printed up to the limit is kept.
- **Exit codes and uncaught exceptions**: `System.exit(n)` reports `n` to the host instead of ending the WebAssembly instance, so the instance can serve the next run; shutdown hooks still run. Uncaught exceptions print `Exception in thread "main" ...` with the stack trace as HotSpot formats it, and give exit code 1.
- **Stack traces like HotSpot's**: hidden frames (lambda proxies, `@Hidden` methods) are left out, at most 1,024 frames are kept (HotSpot's `MaxJavaStackTraceDepth`), and JDK frames print as `java.base/...` without a version.
- **Helpful NullPointerException messages** (JEP 358): rewritten from the JEP's description and HotSpot's observable output, so messages such as `Cannot invoke "String.length()" because "<local1>" is null` match HotSpot, including for `synchronized` on null.
- **`ArrayStoreException`**: the interpreter's `aastore` now checks the element type (upstream had a TODO), with HotSpot's message.
- **`ClassCastException` messages** end with HotSpot's module and loader suffix, for example `(java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')`.
- **Files** (`java.io` and `java.nio.file` on WASI): `Files.writeString` and other NIO calls no longer hang. A WASI `LinuxNativeDispatcher` answers the natives `LinuxFileSystem` needs, and file dispatch, attributes and error codes behave like Linux, so missing files give HotSpot's exceptions (`NoSuchFileException: data.txt`, `FileNotFoundException: data.txt (No such file or directory)`).
- **Start-up speed**: on WASI the JDK image (`lib/modules`) is read into memory once, instead of a seek, read and stat host call for every class lookup (WASI has no memory mapping).
- **Java threads started during JDK start-up** (Reference Handler, Common-Cleaner) stay alive for the whole run, so a class whose initializer waits on them no longer blocks.

## Tests

`node test/run-tests.mjs` compiles each program in `test/programs/` with the reference `javac --release 21`, runs it on HotSpot with the site's reference flags, and runs the same class files on the runner in Node and in headless Chromium. It compares stdout byte for byte, the first line of stderr, the learner's stack frames, the exit code, and the files left in the working directory. The 30 cases cover:

- Scanner with mixed input, end of input and mismatches;
- `HashMap` and `HashSet` order, doubles, `printf`/`String.format`, seeded `Random`, streams, `java.time`;
- non-ASCII command-line arguments;
- caught exceptions and helpful `NullPointerException` messages;
- uncaught exceptions: index out of bounds, `NullPointerException`, causes, inside lambdas and streams, `ClassCastException`, custom exceptions, stack overflow;
- `System.exit` and shutdown hooks, programs with several classes, reading and writing files;
- a typical course program, 10 million loop steps;
- output over 64 KB, and endless output.

Options: `--no-node`, `--no-browser`, `--only a,b`, `--timing` (start-up and per-run times), `--dist DIR`.

Results on the final build (`build.sh` from the pinned commit and the patch; its `runner.core.wasm` and `jdk.zip` were byte-identical to the build the tests were developed on): **60 of 60 checks passed** (30 cases, each in Node 22 and in headless Chromium 141).

Timings from `--timing` on this machine (4 CPUs), in milliseconds:

| | Node 22 | Chromium 141, module Worker |
|---|---|---|
| Start a runner (compile the modules, mount the JDK image, instantiate) | 385 | 230 to 285 |
| Start another Worker with the compiled modules passed in | | 214 to 249 |
| Hello World, per run | 59 to 71 | 49 to 56 |
| A typical course program (Scanner, list, loop), per run | 388 to 456 | 337 to 354 |
| 10 million loop steps | 1,915 to 2,246 | 1,173 to 1,277 |
| `terminate()` of a Worker | | 0.1 |

Phones were not measured here; the site's prototype page has a benchmark for that.

## Sizes (dist, gzip -9 measured by `build.sh`)

| File | Bytes | gzip -9 |
|---|---|---|
| runner.core.wasm | 7,761,789 | 1,932,971 |
| runner.core2.wasm, runner.core3.wasm | 1,089 and 495 | 529 and 323 |
| jdk.zip (already compressed) | 10,570,098 | 10,541,012 |
| runner.js (bundled into the site's run worker) | 830,749 | 60,381 |
| runner-host.mjs, wasi-host.mjs (bundled) | 8,981 and 15,030 | 3,335 and 4,334 |

A clean `build.sh` run took 2 minutes 21 seconds here with the Cargo dependencies already compiled; a first build also compiles every dependency.

## Known gaps

- **Speed.** The runner interprets bytecode, so tight loops are far slower than HotSpot (see the timings). Course programs are small; the site's run limit is generous for this reason.
- **`Math.sin`, `log`, `pow` and similar** compute the `StrictMath` result, which can differ from HotSpot's default `Math` in the last digit. The site's reference runs HotSpot with `-XX:-UseLibmIntrinsic`, which gives the same results.
- **Identity hash codes** (`Object.toString()` without an override) differ between runs and engines, as they do between HotSpot runs.
- **No GUI**: AWT, Swing and JavaFX are not available (only `java.base` is in the image).
- **Browser requirements**: WebAssembly with the component model transpiled to core modules; the minimum browser versions were not measured.
