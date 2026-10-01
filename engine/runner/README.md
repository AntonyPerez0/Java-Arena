# Java Arena runner: a JVM in WebAssembly

This folder builds the runner half of Java Arena's in-browser Java engine. The compiler half (javac 21) turns the learner's code into `.class` files; the runner executes them.

- **runner.core.wasm** (plus two tiny helper modules and `runner.js`): [Ristretto](https://github.com/theseus-rs/ristretto), a Java virtual machine written in Rust, compiled to a WebAssembly component and transpiled by jco into core modules and JavaScript glue. It interprets bytecode and runs the real OpenJDK class library.
- **jdk.zip**: a `java.base`-only runtime image made by `jlink` from the project's reference JDK, Eclipse Temurin 21.0.10+7 (an OpenJDK build; `JAVA_RUNTIME_VERSION` 21.0.10+7-LTS). The site computes expected outputs with the same JDK.
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
  onOutput: (stream, text) => postMessage({ stream, text }),  // optional, while it runs
});
// r.stdout, r.stderr, r.output, r.exitCode, r.outputTruncated, r.files, r.durationMs
```

The full API is at the top of `runner-host.mjs`. One runner instance serves many runs, each on a fresh JVM. `runner.modules` holds the compiled WebAssembly modules; they can be posted to another Worker and passed as `createRunner({ modules })`, which skips the slowest start-up step. Time limits are enforced by the page terminating the Worker.

`onOutput(stream, text)` is called with `'stdout'` or `'stderr'` and the text of each chunk as the host receives it, decoded as UTF-8 in streaming mode (a character split between two chunks arrives whole in the second call), in the order the program wrote them. The runner sends a chunk when 16 KB are buffered, at a newline written 50 ms or more after the previous chunk, 50 ms after output starts waiting in the buffer (so the last lines before an endless loop arrive), when the program switches from one stream to the other, and at the end. A Worker that posts these chunks lets the page show what a program printed before the page terminated it for a timeout. The result still carries the full `stdout` and `stderr`, and `output`: both together in the order the program wrote them, as a terminal shows them (`java Main > out.txt 2>&1` gives the same text).

`exitCode` is the process status HotSpot's `java` launcher reports: `System.exit(n)` or `Runtime.halt(n)` on any thread gives `n & 0xFF` (so `System.exit(-1)` gives 255), an uncaught exception in `main` or a launcher error gives 1, and `null` means the output limit stopped the program. `error` is set only when the VM itself failed, for example a WebAssembly trap; the output printed before the trap is kept (see Known gaps for the one exception).

## Rebuild

```sh
engine/runner/build.sh           # add --clean to start from nothing, --test to run the tests
```

Requirements: Rust with `rustup` (the script adds the `wasm32-wasip2` target), Node 22 and npm, git, and the reference JDK: Eclipse Temurin 21.0.10+7 (`OpenJDK21U-jdk_x64_linux_hotspot_21.0.10_7.tar.gz`, checked against its SHA-256 when it is set up) extracted at `/home/user/build/jdk/jdk-21.0.10+7`. Set `ARENA_JDK` to its directory if it is elsewhere; the script stops unless it is a JDK 21 with `jmods/`. The work folder is `/home/user/build/runner` (set `ARENA_RUNNER_WORK`). The steps are:

1. Fetch Ristretto at the pinned commit and apply `patches/ristretto.patch`.
2. Build the `ristretto_playground` crate for `wasm32-wasip2` with the same settings as Ristretto's own web build (`RUSTC_BOOTSTRAP=1`, an 8 MB stack).
3. Transpile the component with `@bytecodealliance/jco-transpile` 0.12.1 (`scripts/transpile.mjs`, Ristretto's options).
4. Make the JDK image: `jlink --add-modules java.base --no-header-files --no-man-pages`, zipped with fixed timestamps by `scripts/pack-jdk.mjs` (fflate 0.8.3). The `lib/modules` file is byte-identical to a second `jlink` run.
5. Collect licenses (`scripts/licenses.mjs`, adapted from Ristretto's): Ristretto's, the JDK image's `legal/java.base` (as `licenses/OpenJDK-java.base/`), and the license files of every Rust crate in the build.
6. Copy the files to `dist/runner/` and write `manifest.json`. Its `jdk image` entry records the reference JDK's own `release` file: `IMPLEMENTOR`, `IMPLEMENTOR_VERSION`, `JAVA_RUNTIME_VERSION`, `JAVA_VERSION`, `SOURCE_REPO` and `SOURCE` (the source commit).

Network hosts used: github.com (git), index.crates.io and static.crates.io, static.rust-lang.org (the Rust target), registry.npmjs.org.

## Pinned sources

| Component | Source | Version | License |
|---|---|---|---|
| Ristretto | https://github.com/theseus-rs/ristretto | commit `8448588ecfcedf79a59d697939493f289c1c6ad7` (2026-09-27), crate version 0.34.0 | MIT OR Apache-2.0 |
| Rust crates | crates.io, pinned by Ristretto's `Cargo.lock` | | see `licenses/THIRD_PARTY_LICENSES.txt` |
| JDK image | `jmods/java.base.jmod` of Eclipse Temurin: binaries https://github.com/adoptium/temurin21-binaries release `jdk-21.0.10+7`; source https://github.com/adoptium/jdk21u tag `jdk-21.0.10+7-ga` (upstream: https://github.com/openjdk/jdk21u tag `jdk-21.0.10+7`) | 21.0.10+7 (`JAVA_RUNTIME_VERSION` 21.0.10+7-LTS, `IMPLEMENTOR` Eclipse Adoptium) | GPL-2.0 with the Classpath Exception; notices in `licenses/OpenJDK-java.base/` |
| jco-transpile (build tool; its runtime helpers end up in `runner.js`) | npm `@bytecodealliance/jco-transpile` | 0.12.1 | Apache-2.0 WITH LLVM-exception |
| fflate (build tool only) | npm `fflate` | 0.8.3 | MIT |

## What the patch changes, and why

`patches/ristretto.patch` is applied to the pinned commit. Every change serves one goal: the browser must print exactly what HotSpot 21 prints for the same class files.

- **A run request for precompiled classes** (`web/runner/src/arena.rs`, `wit/playground.wit`, `lib.rs`): a new `run-classes` export takes the class files, main class, arguments and stdin as JSON and returns the exit code and whether output was cut off. stdin is the given bytes, then end of input; `System.in.available()` reports what is left, as HotSpot does for redirected input.
- **Output limit**: stdout and stderr together stop at 64 KB. The program is halted at the limit (instead of `PrintStream` silently swallowing the error and looping on), and what was printed up to the limit is kept. `runner-host.mjs` drops a character the cut split in two, so the text is a clean prefix of HotSpot's.
- **Output while the program runs** (`arena.rs`): output is buffered in WebAssembly memory, because every host call is expensive in the browser, but the buffer goes to the host at 16 KB, at a newline 50 ms or more after the last drain, and 50 ms after output starts waiting (a timer that is armed only then, since an armed timer makes the scheduler read the clock at every yield). stdout and stderr share one buffer: writing to one stream first sends what the other has waiting, so the host gets the two in the order the program wrote them (an error message between two printed lines stays between them). A panic hook drains the buffer before a Rust panic traps the instance. So a trap or a timeout no longer loses what the program printed.
- **The `java` launcher's checks** (`arena.rs`): before `main` runs, a main class that cannot be loaded, or one without a `public static void main(String[])`, goes to the JDK's own `sun.launcher.LauncherHelper.checkAndLoadMain`, which prints HotSpot's exact message to stderr (`Error: Main method not found in class Main, please define the main method as: ...`, `Error: Main method is not static in class Main, ...`, `Error: Could not find or load main class Nope` with `Caused by: java.lang.ClassNotFoundException: Nope`) and exits with 1. These are program results, not runner errors. As with `java`, the main class is checked before its static initializer runs, and a `public static main` inherited from a superclass runs (after the main class is initialized).
- **Exit codes and uncaught exceptions**: `System.exit(n)` and `Runtime.halt(n)` report `n & 0xFF`, the process status `java` gives the shell, instead of ending the WebAssembly instance, so the instance can serve the next run; shutdown hooks still run. A halt on any thread ends the run: a worker thread calling `System.exit`, or a shutdown hook calling `halt`, while `main` waits (on WebAssembly a halt unwinds only its own thread, so it is recorded in `ristretto_types::halt`, and the run stops at the next scheduling point; output written after it is dropped, as it would never have appeared). `System.exit` inside a static initializer halts instead of becoming an `ExceptionInInitializerError`. Uncaught exceptions print `Exception in thread "main" ...` with the stack trace as HotSpot formats it, and give exit code 1.
- **Threads** (WASI): an exception that escapes a started thread goes to `Thread.dispatchUncaughtException`, which prints `Exception in thread "Thread-0" ...` as on HotSpot. Thread handles record the daemon flag, and after `main` returns (or throws) the run waits for every non-daemon thread before running shutdown hooks, as HotSpot's `DestroyJavaVM` does; the JDK's own start-up threads are daemons. `Thread.sleep` waits on the async runtime, so other threads keep running while one sleeps, and `interrupt()` ends the sleep with `InterruptedException` (upstream blocked the whole instance). As on HotSpot, `InterruptedException` from `sleep`, `wait` or `join` clears the thread's interrupt status (`isInterrupted()` is then false), and the one from `wait` or `join` has no message.
- **`Thread.sleep` in JDK 21**: `Thread.sleep0` receives nanoseconds in JDK 21 (upstream treated them as milliseconds, so `Thread.sleep(10)` lasted about 2.8 hours). Java 17 and earlier keep the millisecond intrinsic.
- **`System.nanoTime`** uses the monotonic clock, as HotSpot does, instead of the wall clock, which in the browser has only millisecond resolution.
- **Huge arrays throw `OutOfMemoryError`** instead of a Rust panic: `newarray`, `anewarray` and `multianewarray` check sizes with checked arithmetic. A length above HotSpot's maximum (`Integer.MAX_VALUE - 2`) gives `Requested array size exceeds VM limit`, as HotSpot does. An array whose elements would take more than 1 GiB in the runner gives `Java heap space`; the runner stores a `boolean` or `byte` element in 1 byte, `short` in 2, `char`, `int` and `float` in 4, `long` and `double` in 8, and a reference in 16 (so the limit is `long[134_217_728]` or `Object[67_108_864]`). A multidimensional array counts all of its levels. 1 GiB leaves room in wasm32's 4 GiB address space for the VM and the class library.
- **Stack traces like HotSpot's**: hidden frames (lambda proxies, `@Hidden` methods) are left out, at most 1,024 frames are kept (HotSpot's `MaxJavaStackTraceDepth`), and JDK frames print as `java.base/...` without a version.
- **Helpful NullPointerException messages** (JEP 358): rewritten from the JEP's description and HotSpot's observable output, so messages such as `Cannot invoke "String.length()" because "<local1>" is null` match HotSpot, including for `synchronized` on null.
- **`ArrayStoreException`**: the interpreter's `aastore` now checks the element type (upstream had a TODO), with HotSpot's message.
- **`ClassCastException` messages** end with HotSpot's module and loader suffix, for example `(java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')`.
- **Files** (`java.io` and `java.nio.file` on WASI): `Files.writeString` and other NIO calls no longer hang. A WASI `LinuxNativeDispatcher` answers the natives `LinuxFileSystem` needs, and file dispatch, attributes and error codes behave like Linux, so missing files give HotSpot's exceptions (`NoSuchFileException: data.txt`, `FileNotFoundException: data.txt (No such file or directory)`).
- **Start-up speed**: on WASI the JDK image (`lib/modules`) is read into memory once, instead of a seek, read and stat host call for every class lookup (WASI has no memory mapping).
- **Java threads started during JDK start-up** (Reference Handler, Common-Cleaner) stay alive for the whole run, so a class whose initializer waits on them no longer blocks.

`runner-host.mjs` adds the streaming `onOutput(stream, text)` callback described above.

## Tests

`node test/run-tests.mjs` compiles each program in `test/programs/` with the reference `javac --release 21` (`JAVA_HOME_21`, by default the Temurin JDK above), runs it on HotSpot with the site's reference flags, and runs the same class files on the runner in Node and in headless Chromium. It compares stdout byte for byte, the first line of stderr, the learner's stack frames, the "Caused by" lines, the exit code, and the files left in the working directory; cases marked `exactStderr` must match the whole of stderr. The 60 cases cover:

- Scanner with mixed input, end of input and mismatches;
- `HashMap` and `HashSet` order, doubles, `printf`/`String.format`, seeded `Random`, streams, `java.time`;
- non-ASCII command-line arguments;
- caught exceptions and helpful `NullPointerException` messages;
- uncaught exceptions: index out of bounds, `NullPointerException`, causes, inside lambdas and streams, `ClassCastException`, custom exceptions, stack overflow;
- `System.exit` and shutdown hooks, exit statuses -1, 256 and 300 (255, 0 and 44), `System.exit` in the main class's static initializer, in a helper class's, and in one whose use `main` wraps in `catch (Throwable)`;
- the launcher: a misspelled `main` (also in a class with a static initializer, which must not run), a non-static, a non-public, a parameterless and an `int` `main`, an inherited `main`, a missing main class, and a main class in a package;
- `Thread.sleep(10)`, `TimeUnit.MILLISECONDS.sleep(5)`, `Thread.sleep(Duration.ofNanos(1000))` in a loop and `Thread.sleep(0, 500000)` (whether each waited long enough, not the raw times); another thread running while `main` sleeps, and `interrupt()` of a sleeping thread;
- interrupts: `InterruptedException` from `wait`, `sleep` and `join` (also when the thread was interrupted before the call), and the interrupt status afterwards;
- threads: an uncaught exception in a started thread, `main` returning while a non-daemon thread (and a spinning daemon thread) still runs, `main` throwing while a thread runs, `System.exit` in a worker thread that `main` joins, and a shutdown hook calling `Runtime.halt(9)` after `System.exit(3)`;
- `OutOfMemoryError` for huge arrays (caught and uncaught, `Java heap space` and `Requested array size exceeds VM limit`, multidimensional);
- programs with several classes, reading and writing files, a typical course program, 10 million loop steps;
- output over 64 KB, endless output, and output cut at 64 KB inside a two-byte character (compared with HotSpot's output cut before that character);
- stdout and stderr in turn (lines, text without a line break, after a pause, then an uncaught exception): the result's `output` must be exactly what HotSpot writes with both streams going to one file (`2>&1`);
- runner-only checks: `onOutput` must deliver the two lines a program prints before an endless loop within 1 second of the run's start (the run is in a Node worker thread or a browser Worker, which is then terminated); and a program that fills the WebAssembly memory with `long[1_000_000]` blocks must trap with the lines it printed before the trap kept, after which the next run (Hello World) works.

Options: `--no-node`, `--no-browser`, `--only a,b`, `--timing` (start-up and per-run times, the runs on a separate runner and Worker), `--report FILE`, `--dist DIR`.

Results on the final build (`build.sh` from the pinned commit and the patch, `ARENA_JDK` the Temurin JDK): **118 of 118 checks passed** (59 cases, each in Node 22 and in headless Chromium 141). After stdout and stderr came to share one buffer (with the case of the two in turn added): 120 of 120. The whole run took 163 s, including the HotSpot references and the `--timing` runs; the heap exhaustion case alone took 7 s in Node and 10 s in Chromium.

Timings from `--timing` on this machine (4 CPUs), in milliseconds:

| | Node 22 | Chromium 141, module Worker |
|---|---|---|
| Start a runner (compile the modules, mount the JDK image, instantiate) | 412 | 245 to 356 |
| Start another Worker with the compiled modules passed in | | 223 to 238 |
| Hello World, per run (the first run on a new runner is slower) | 65 to 84 (first 216) | 49 to 56 (first 209) |
| A typical course program (Scanner, list, loop), per run | 431 to 540 | 362 to 408 |
| 10 million loop steps | 2,155 to 2,425 | 1,198 to 1,355 |
| `terminate()` of a Worker | | under 0.1 |

The same loop took 2,214 ms in Node as a test case; timings on this shared machine vary by about 20 percent. Launcher errors (a missing main class or `main`) took 190 to 293 ms, because the JDK's launcher code loads its message bundle; a normal start does not run that code. Phones were not measured here; the site's prototype page has a benchmark for that.

## Sizes (dist, gzip -9 measured by `build.sh`)

| File | Bytes | gzip -9 |
|---|---|---|
| runner.core.wasm | 7,793,759 | 1,944,697 |
| runner.core2.wasm, runner.core3.wasm | 1,089 and 495 | 529 and 323 |
| jdk.zip (already compressed) | 10,569,830 | 10,540,795 |
| runner.js (bundled into the site's run worker) | 830,749 | 60,381 |
| runner-host.mjs, wasi-host.mjs (bundled) | 10,794 and 15,030 | 4,006 and 4,334 |

A `build.sh` run took 2 minutes 12 seconds here with the Cargo dependencies already compiled (it re-checks out the pinned commit, so every Ristretto crate is rebuilt); a first build also compiles every dependency.

## Known gaps

- **Speed.** The runner interprets bytecode, so tight loops are far slower than HotSpot (see the timings). Course programs are small; the site's run limit is generous for this reason.
- **Memory.** One array may take at most 1 GiB in the runner (see above), while HotSpot's default maximum heap here is 3,588,227,072 bytes (a quarter of the RAM), so, for example, `new byte[1_500_000_000]` works on HotSpot but throws `OutOfMemoryError: Java heap space` here. Exhausting memory with many allocations, or with a few arrays near the limit (memory is not reclaimed at once), traps the WebAssembly instance instead of throwing `OutOfMemoryError`: the result has `exitCode: null`, `error: "unreachable"`, the output printed before the trap, and Rust's `memory allocation of N bytes failed` on stderr where HotSpot prints `Exception in thread "main" java.lang.OutOfMemoryError: Java heap space`. Filling the 4 GiB this way took 7 s in Node and 10 s in Chromium in the test case here, so the site's time limit usually ends such a run first. A failed allocation aborts without running the panic hook, so output printed in the last 50 ms before it can be missing. The next run gets a new instance. Browsers that cannot grow WebAssembly memory that far (phones) trap earlier.
- **`OutOfMemoryError` stack traces.** HotSpot fills in the stack trace of only the first four `OutOfMemoryError`s of a run (`PreallocatedOutOfMemoryErrorCount`); the runner fills in every one.
- **Thread scheduling.** Java threads take turns on one WebAssembly thread, switching every 256 bytecodes and at blocking calls, so the interleaving of output from threads that print at the same time without synchronization can differ from HotSpot's (it also varies between HotSpot runs). Sleeps use a 1 ms timer: 50 calls of `Thread.sleep(Duration.ofNanos(1000))` took 65 ms here against 3.7 ms on HotSpot, and 20 calls of `Thread.sleep(10)` took 226 ms against 204 ms.
- **`Math.sin`, `log`, `pow` and similar** compute the `StrictMath` result, which can differ from HotSpot's default `Math` in the last digit. The site's reference runs HotSpot with `-XX:-UseLibmIntrinsic`, which gives the same results.
- **Identity hash codes** (`Object.toString()` without an override) differ between runs and engines, as they do between HotSpot runs.
- **No GUI**: AWT, Swing and JavaFX are not available (only `java.base` is in the image).
- **Browser requirements**: WebAssembly with the component model transpiled to core modules; the minimum browser versions were not measured.
