# Other ways to run Java in the browser (September 2026 survey)

Research report, 2026-09-28. Scope: every realistic option for compiling and running learner Java programs on a static GitHub Pages site **other than CheerpJ and TeaVM** (those have their own reports: `/home/user/ref/research/rt-cheerpj.md`, `/home/user/ref/research/rt-teavm.md`). Scratch files, clones and harnesses are in `/home/user/ref/research/rt-others/`.

## 0. How this was researched

- **Measured here** (marked "measured"): container with an Intel Xeon @ 2.10 GHz, 4 cores (`lscpu`, `nproc`), Node 22.22.2, headless Chromium 141.0.7390.37 driven by Playwright 1.56.1 (`/opt/node22/lib/node_modules/playwright`), JDK 21.0.10 as the HotSpot reference, Temurin 8u482 / 11.0.30 / 17.0.16 borrowed read-only from `/home/user/ref/research/rt-cheerpj/jdks/`. Desktop-class numbers only: **nothing was measured on a phone**; phone figures below are estimates.
- **Test programs**: `doppio-test/work/Main.java` (Scanner on stdin, HashMap/HashSet order, `Double.toString`, `String.format`, seeded `Random` including `nextGaussian`, streams, `Collectors.groupingBy`, a default interface method, `Math`, `LocalDate`, four caught exceptions and an uncaught NPE), `NoIn.java` (same program with the two stdin lines hard-coded, for engines without stdin), `Bad.java` (two compile errors), `Loop.java` (10 million iterations plus a 200,000-element list sort), `mathfid/MathFid.java` (400 lines of `Math.sin/cos/tan/exp/log/log10/pow/sqrt/cbrt/atan2/hypot` plus float/format/collection lines).
- **Maintenance facts** come from shallow `git clone`s (paths under `rt-others/clones/`), the GitHub search API through the GitHub MCP tool (the per-repository REST endpoints were not enabled for this session, so stars/pushed_at come from search results), `npm view`, Maven Central `maven-metadata.xml` and crates.io.
- **Blocked**: `javabox-demo.brian-fec.workers.dev`, `graalvm.github.io`, `www.answeroverflow.com` (curl `CONNECT tunnel failed, response 403` or WebFetch `EGRESS_BLOCKED`, 2026-09-28). CheerpX's CDN was not tried (sibling report found `cjrtnc.leaningtech.com` blocked). Oracle GraalVM downloads were not attempted. Statements from those sites come from WebSearch snippets and are marked as such.

## 1. Summary table

"First visit" is what a learner downloads before the first compile, compressed as it would travel with gzip (brotli where noted). Compile and run times are desktop Chromium on the machine above unless marked Node.

| Option | License (self-host?) | First visit | Java | Compile (cold / warm) | Fidelity vs HotSpot (measured) | Maintenance | Verdict |
|---|---|---|---|---|---|---|---|
| **Ristretto** (JVM in Rust to Wasm + real javac) | MIT OR Apache-2.0; JDK is GPLv2+CE (Corretto). Self-host yes | ~16.8 MB (JDK 21) | 8, 11, 17, 21, 25 runtimes | 11-24 s / 13-18 s (real javac interpreted) | JDK 21: stdout identical, NPE text identical; Math = StrictMath; JDK 11/17 lambda bug | Very active, v0.34.0 on 2026-09-27, one main author | Best fidelity found; compile far too slow for phones as-is. Strong candidate as the **runner** half of a hybrid |
| **TraceJVM** (b-jvm C JVM + teavm-javac) | AGPL-3.0-only (own code) + MIT + Apache-2.0 + GPLv2+CE. Self-host required by design | ~25.7 MB gzip (core) | 23 | 0.28 s / 0.08-0.10 s | Close; AIOOBE text, NPE text, stack frames, `Double.MIN_VALUE`, Math differ; `Files.readAllLines` failed | Pre-release 0.4.1 (2026-08-10), public repo 9 commits, 0 stars | Fastest real-JDK option; AGPL and immaturity are the risks. Prototype-worthy |
| **GraalVM Web Image** (javac AOT-compiled to Wasm GC) | GPLv2+CE source in oracle/graal; docs require Oracle GraalVM 25.1+ (GFTC) to build | ~9.6 MB gzip / 7.3 MB brotli (javac only) | javac 25 | 0.29 s / 0.12-0.13 s (javac timer) | javac diagnostics real but types printed fully qualified | Experimental, very active repo | Compiler only: **cannot run** the compiled classes. Useful as the compile half |
| **DoppioJVM** | MIT. Self-host yes | ~29 MB gzip of jars + 0.4 MB JS (untrimmed) | 8 (OpenJDK 8u72) | 17.9 s / 10.6-11.6 s (Node) | Java 8 library identical; VM messages, exit code and Math differ | Dead: last release 2016, last human commit 2018-02-08 | Reject |
| **CheerpX / WebVM** (x86 Linux VM) | Proprietary; individuals free; self-host needs commercial licence | Hundreds of MB disk image, streamed (not measured) | whatever i386 Debian ships | not measured | Real HotSpot (if it runs) | Active, npm 1.3.9 on 2026-08-17 | Reject: CDN-only, i386-only, needs COOP/COEP, Java reportedly hits unsupported syscalls |
| **JavaBox** (HotSpot Zero via Emscripten) | **No licence file** (all rights reserved); issue asking about it is unanswered | ~76 MB (author's figure) | 21 | author claims sub-second compile+run (unverified) | Real HotSpot Zero (unverified here) | Hobby project, 9 commits, last 2026-07-27 | Cannot be reused legally; proves the approach is possible |
| **Bytecoder** | Apache-2.0 | n/a (AOT at build time) | 8-20 bytecode | no in-browser compiler | Substituted classes (`TRandom`, `TFormatter`) | Stalled: last release 2024-05-10 | Reject |
| **JWebAssembly** | Apache-2.0 | n/a (AOT) | bytecode | no in-browser compiler | No exceptions, no reflection yet | Active commits in 2026, last release 0.4 (2022) | Reject |
| **J2CL / GWT** | Apache-2.0 | n/a (AOT) | Java 21-ish source | no in-browser compiler | JRE emulation lacks `Scanner`, `java.time`, `java.nio.file` | Active (J2CL tag v20260402) | Reject |
| **Janino** | BSD-3-Clause | 0.95 MB jar + a JVM | ~Java 7 | n/a | Lambdas "NYI" | Archived repo, last release 3.1.12 (2024) | Reject |
| **ECJ** | EPL-2.0 | 3.4 MB jar + a JVM | up to Java 25 source | 70 s on Doppio (Node) | Different error wording than javac | Active, 3.46.100 (2026-08) | Only with a fast JVM; wording differs from javac |
| **v86, container2wasm, QEMU-wasm** | BSD-2 / Apache-2.0 / GPL | 100s of MB | any Linux JDK | not measured; QEMU route reported at 55 s for Hello World | Real HotSpot | Active | Reject: too slow and too big |
| **Other JVMs in Rust/Go/C** (rjvm, douchuan/jvm, RustJava, Jacobin, Rise JVM) | various | n/a | partial | n/a | Incomplete (no invokedynamic, Java 1.2 classlib, etc.) | mixed | Reject |
| **Judge0, Piston, JDoodle** | GPL-3.0 / MIT / commercial | n/a | any | server | real JDK | active | Out of scope: needs a server or a secret key |

## 2. Cross-cutting findings (apply to every engine)

1. **Pick one Java major version and use it at build time and in the browser.** Output text changes between majors: JDK 8 prints `java.lang.IndexOutOfBoundsException: Index: 3, Size: 0` and `ArrayIndexOutOfBoundsException: 2`, JDK 21 prints `Index 3 out of bounds for length 0` and `Index 2 out of bounds for length 2`; JDK 8 prints `2e23` as `1.9999999999999998E23`, JDK 21 as `2.0E23`; JDK 21 adds helpful NPE messages (`Cannot invoke "String.length()" because "<local9>" is null`). All measured with the test program (`doppio-test/work/out21.txt`, `out8.txt`).
2. **`Math.sin/tan/log/log10/pow` differ in the last digit between HotSpot and interpreters** (measured, `mathfid/`). On this x86-64 machine HotSpot's `Math` results differed from `StrictMath` in 134 of 400 lines (`-Xint` gave the same as JIT). Ristretto's `Math` equals HotSpot's `StrictMath` exactly (0 differing lines); TraceJVM differed from both (42 lines vs `StrictMath`); Doppio differed in 352 lines (it uses JavaScript `Math`). `sqrt`, `cbrt`, `hypot` style correctly-rounded results matched. In the MOOC, `Math.sin`/`Math.cos` appear only in the JavaFX Asteroids project (`data/part-14/3-larger-application-asteroids.md`), `Math.pow`/`Math.log`/`Math.exp` do not appear (grep counts: 12, 12, 0, 0, 0). Consequence: build-time verification should run on the **same engine** as the browser, or lesson content must avoid printing transcendental results at full precision.
3. **stdin supplied up front works on any real JVM with a launcher class**, even when the host has no stdin API: a hidden `Launcher.main` calls `System.setIn(new ByteArrayInputStream(input))` and then invokes the learner's `main` by reflection (the launcher must unwrap `InvocationTargetException` to print the learner's own stack trace). Measured on TraceJVM: `Scanner.nextLine()` read `5` and `Ada` from a system property (`tracejvm/pw-worker.mjs`).
4. **Killing runaway programs**: every Wasm engine that runs in a dedicated Worker can be stopped with `worker.terminate()`. Measured: TraceJVM's hard abort stopped `while (true) {}` at 3002 ms and a fresh worker was ready 432 ms later; Ristretto's playground already runs each session in a Worker with a 30 s run limit (`clones/ristretto/web/shared/protocol.ts`: `RUN_TIMEOUT = 30_000`).
5. **Cross-origin isolation**: GitHub Pages cannot set COOP/COEP headers. Ristretto, TraceJVM (without a host adapter), the Web Image javac demo and Doppio all ran here from a plain `python3 -m http.server` (no COOP/COEP), so they do not need `SharedArrayBuffer`. CheerpX and JavaBox do need it (see their sections); WebVM works around this on GitHub Pages with a service worker that rewrites response headers (`clones/webvm/serviceWorker.js`).

## 3. Ristretto (theseus-rs/ristretto): JVM in Rust, compiled to Wasm, running real javac

**What it is.** "Embeddable Java Virtual Machine and Java compiler implementation" in Rust (`clones/ristretto/README.md`). The runtime classes are real OpenJDK classes: "Standard runtime classes backed by LTS versions of AWS Corretto"; "Interpreter support for all Java byte codes including invokedynamic"; "WebAssembly (WASM) compilation support for single-threaded edge and browser deployments" (same README). `ristretto_javac` is "a `javac` command-line program backed by the JDK compiler hosted by the Ristretto virtual machine" (`ristretto_javac/README.md`), i.e. real javac bytecode interpreted by Ristretto. A public playground compiles and runs Java in the browser; its built files are on the `playground-pages` branch (commit `4a4b586`, 2026-09-27, built from main `8448588`), which I checked out to `rt-others/ristretto/pgp/` and served locally.

**License.** "Licensed under either of Apache License, Version 2.0 ... MIT license" (`README.md`, files `LICENSE-APACHE`, `LICENSE-MIT`). The shipped JDK images are Corretto (GPLv2 with Classpath Exception); the playground ships a 4,505,118-byte `runtime/THIRD_PARTY_LICENSES.txt`. Self-hosting on GitHub Pages is what the project itself does. Qualifies for an individual's free educational site: yes (permissive).

**Versions and maintenance.** crates.io `ristretto_vm` 0.34.0, updated 2026-09-27, created 2024-10-10, 19,715 downloads (crates.io API). Repo created 2024-07-08, 66 stars (GitHub search). The shallow clone holds 227 commits from 2026-04-18 to 2026-09-27, 53 of them in September 2026; 221 of 227 are by Brian Heineman under three spellings (`git log`), so **bus factor 1**. Java runtimes offered: 8, 11, 17, 21, 25 (`web/jdks.json`: Corretto 8.504.01.1, 11.0.32.12.1, 17.0.20.12.1, 21.0.12.12.1, 25.0.4.10.1).

**Download size (measured, `ristretto/pgp/runtime/`).** `runner.core.wasm` 7,627,823 B (gzip -9: 1,896,806; brotli 11: 1,267,694) plus two tiny wasm files (1,089 and 495 B); JDK zips (already compressed, gzip gains under 2%): JDK 11 12,669,922 B, JDK 17 13,055,378 B, JDK 21 14,766,513 B, JDK 25 22,214,759 B, JDK 8 38,176,161 B. The JDK 21 zip holds a jlink image whose `lib/modules` is 48,645,257 B uncompressed. JS bundles about 0.97 MB raw. **First visit with JDK 21: about 16.8 MB gzip; with JDK 11 about 14.7 MB.** The playground caches assets in Cache Storage and verifies SHA-256 (`web/shared/runtime.ts`).

**Speed (measured, headless Chromium, own harness `ristretto/harness/run.mjs` posting the playground's worker protocol).**

| Test | JDK 21 | JDK 17 | JDK 11 |
|---|---|---|---|
| `Main.java` compile, first (includes engine start) | 24,451 ms | | |
| `Main.java` compile, second | 18,146 ms | | |
| `NoIn.java` compile first / second | 23,250 / 15,812 ms | 19,644 / 13,157 ms | 22,282 / 14,123 ms |
| `Bad.java` compile (first) | 11,185 ms | | |
| `Loop.java`: 10 M iterations / 200k list sort | 1,567 / 2,081 ms (HotSpot: 15 / 15 ms) | | |

The project's own README agrees: "Compilation is interpreted and typically takes tens of seconds in Chromium and WebKit, or several minutes in Firefox" (`web/README.md`). On a mid-range Android phone I estimate (unverified) 2 to 4 times longer, so 30 to 100 s per compile: not acceptable as the compiler for a lesson site.

**Fidelity (measured).**
- JDK 21: stdout of `NoIn.java` is **byte-identical to HotSpot 21** (HashMap/HashSet order, `Double.toString`, `String.format`, seeded `Random` including `nextGaussian`, streams, `groupingBy`, `LocalDate`, AIOOBE/IOOBE/NFE/ArithmeticException messages); the uncaught NPE message is identical including the helpful-NPE text. `MathFid.java`: all non-Math lines identical; Math lines equal HotSpot `StrictMath`.
- Stack traces: user frames have line numbers (`at Main.main(Main.java:8)`); JDK frames print as `at java.base@21.0.12.1/java.util.Scanner.nextLine(Unknown Source)` where HotSpot prints `at java.base/java.util.Scanner.nextLine(Scanner.java:...)`. The playground prints uncaught exceptions without the `Exception in thread "main"` prefix (runner formatting, fixable in a fork).
- **Bug on JDK 11 and 17 runtimes**: the first lambda in a default-package class fails with `java.lang.invoke.LambdaConversionException: Exception instantiating lambda object ... Caused by: java.lang.IllegalAccessException: class module java.base cannot access class NoIn$$Lambda$14 (in module unnamed module) because module unnamed module does not export  to module java.base`. JDK 21 is fine.
- javac diagnostics are real javac 21 output, identical to HotSpot's javac except the path (`/Bad.java:3: error: incompatible types: String cannot be converted to int` with source line and caret).

**Requirements check.** stdin: the playground closes it ("Standard input returns EOF", `web/README.md`), explicitly in `web/runner/src/lib.rs` line 141 `.stdin(Arc::new(Mutex::new(io::empty())))`, so a fork can pass a byte buffer instead, or use the launcher trick from section 2. VFS: in-memory `/jdk`, `/workspace`, `/tmp` via the WASI preview2 shim (`web/shared/engine.ts`); file tests were not tried. Worker and kill: yes (module Worker, terminated on limits). GUI: "GUI ... unavailable" (`web/README.md`). Mobile: not tested; the README lists Chromium, WebKit and Firefox. CI: the same VM runs natively (`cargo install ristretto_java`), there is a Wasmtime smoke script (`web/scripts/smoke-wasi.mjs`), and headless Chromium works (measured here). Exact-browser-runtime verification of hundreds of programs at ~15 s per compile would take hours unless compilation is moved elsewhere.

**Verdict.** The most faithful open-source option found (identical output to HotSpot 21 on everything tested except `Math` last digits) and properly licensed for self-hosting and offline use. Its weakness is compile time, because javac itself is interpreted. Worth prototyping as the **runner** paired with a Wasm-native javac (section 5 or TraceJVM's teavm-javac), which requires a fork of the runner to accept class files instead of source.

## 4. TraceJVM (tracecodeapp/tracejvm, npm `@tracecode/tracejvm`): b-jvm plus teavm-javac

**What it is.** "It pairs a genuine OpenJDK 23 `javac` with a real JVM, both compiled to WebAssembly" and "ships as one npm package containing the JavaScript API and the exact runtime bytes ... You serve those bytes yourself" (`clones/tracejvm/README.md`). The runner "derives from" b-jvm (section 9) and the compiler is TeaVM-javac (same README). Runtime profile `core` contains `java.base` from Temurin 23.0.2+7 (paths `legal/TEMURIN-23.0.2+7/` in the release manifest).

**License.** "TraceJVM's own code is licensed under **AGPL-3.0-only**" (README; npm `license = 'AGPL-3.0-only'`); b-jvm MIT, TeaVM-javac Apache-2.0, Temurin GPLv2+CE (README "License and attribution"). Self-hosting is the only deployment mode. For a free educational site the AGPL is usable, but it obliges the site to offer the corresponding source of TraceJVM (and, depending on how tightly the site's own code is combined with it, possibly the site's code) under AGPL; the README also warns that the npm archive "omits the much larger corresponding-source archives". Needs a legal reading before adoption (see `license.md` sibling report for the site's licence).

**Versions and maintenance.** npm 0.1.4 (2026-08-01), 0.3.0 and 0.4.0 (2026-08-04), 0.4.1 (2026-08-10) (`npm view ... time`). Public GitHub repo created 2026-08-14 with 9 commits, 0 stars, 8 open issues (GitHub search; `git rev-list --count`). "TraceJVM 0.4 is **pre-release**" (README). Maintainers are anonymous ("TraceJVM Maintainers", one commit by "Obinna"). High adoption risk.

**Download size (measured, extracted runtime in `rt-others/tracejvm/serve/tracejvm/`).** Core profile: `compiler/compiler.wasm` 4,281,714 B (gzip 1,668,258), `bjvm_main.wasm` 804,771 B (gzip 253,913), `profiles/core/jdk23.jar` 12,818,890 B (gzip 11,705,883), `profiles/core/jdk23/lib/modules` 12,077,450 B (gzip 11,619,511), `compile-classlib-teavm.bin` 200,626 B, JS client/worker about 0.6 MB each (gzip ~0.12 MB). **Total about 25.7 MB gzip (24.7 MB brotli).** The class library ships twice (jar for javac, jimage for the VM); `docs/runtime-profiles.md` calls this "a future optimization target" and reports core cold assets 29.2 MB and 212.6 MB Chromium RSS over the page (their measurement).

**Speed (measured, headless Chromium, `tracejvm/pw-run.mjs`, main-thread API).** Initialisation 2.2 s (compiler 1.57 s, runner 2.19 s in parallel, local server); in a Worker a later re-init took 432-480 ms. Compile `NoIn.java`: 277 ms first, then 96 and 79 ms; `Bad.java` 29 ms; `Loop.java` 38-53 ms. Run `NoIn`: 441 ms first, 18 ms second. `Loop`: 861-906 ms for 10 M iterations (HotSpot 15 ms), list sort 184-213 ms.

**Fidelity (measured against HotSpot 21).**
- stdout identical except `ArrayIndexOutOfBoundsException: Index 2 out of bounds for array of length 2` (HotSpot: `... for length 2`).
- NPE: `Cannot invoke "java.lang.String.length()" because "<local9>" is null` (HotSpot: `"String.length()"`). Stack traces include the runner's own frames (`java/lang/invoke/MethodHandle.linkToStatic(linkToStatic)`, `jdk/internal/tracecode/TraceJVMRunner.runCompiled(TraceJVMRunner.java:40)`), slash-separated JDK names and no line numbers for JDK frames.
- `Double.MIN_VALUE` printed as `4.940656458412465E-324` (HotSpot `4.9E-324`): a VM bug in subnormal handling or a native helper (cause not investigated).
- `Math`: differs from HotSpot `Math` and from `StrictMath` (42 of 400 lines vs `StrictMath`).
- File I/O: `Files.readAllLines(Paths.get("data.txt"))` on a `processFiles` entry failed with `java.io.IOException: Underlying input stream returned zero bytes`.
- javac diagnostics: `Bad.java:3:17: error: incompatible types: java.lang.String cannot be converted to int` with no source line or caret (real javac prints `String` and shows the line); structured diagnostics are returned (`compile()` "returns ... structured `diagnostics`", `docs/getting-started.md`).

**Requirements check.** stdin: not in the API ("no interactive stdin", README; `TraceJVMRunRequest` has no stdin field, `package/dist/worker-protocol-*.d.ts`), but the `System.setIn` launcher works (measured). Worker and kill: `TraceJVMWorkerClient` with `hardAbort` (default) terminates the Worker (measured, 3,002 ms abort). VFS: `processFiles` exists but read failed as above. GUI: "no GUI, audio, or desktop stack" (README). Cross-origin isolation only needed for a host adapter (README "Status and safety"); measured working without it. Mobile: README claims tests in "Chromium, Firefox, WebKit, and WebKit under iPad emulation"; not verified. CI: headless Chromium works (measured); Node use failed in my quick attempt because the TeaVM runtime opens `file://` paths with `fs` (`tracejvm/node-run.mjs`), probably fixable by serving over HTTP with a fetch shim (unverified).

**Verdict.** Technically the closest to the C/C++ Arena experience (sub-second compile, real OpenJDK library, self-hostable, killable), but pre-release, AGPL, anonymous maintainers, and several fidelity bugs that the build-time HotSpot check would flag. Its design (Wasm-native javac + interpreter JVM on a real JDK image) is the right shape; a fork or a clean-room equivalent using b-jvm (MIT) directly is an option if the AGPL is unacceptable.

## 5. GraalVM Web Image (oracle/graal `web-image/`): javac AOT-compiled to WebAssembly

**What it is.** "Web Image is an experimental backend for Native Image that produces a WebAssembly module from JVM bytecode" (`clones/graal/web-image/README.md`), enabled with `native-image --tool:svm-wasm`, using Wasm GC, exception handling and typed function references (same file). Oracle's demo compiles **javac itself** to Wasm: `graalvm/graalvm-demos` `web-image/javac` (README: "compile the `javac` tool into a Wasm module that can then run on the command-line or in the browser"). The built demo is on the `gh-pages` branch (commit `5e75248`, 2026-02-12), which I checked out to `rt-others/webimage/ghp/web-image/javac/`.

**Can it host an interpreter for learner code?** No, not today. Native Image is closed-world; runtime class loading ("Crema", `-H:+RuntimeClassLoading`, `substratevm/docs/crema-onboarding.md`) builds on interpreter stubs for AMD64 and AArch64 (`AMD64InterpreterStubs.java`, `AArch64InterpreterStubs.java` in the tree); I found no Wasm support for it (repo file names, WebSearch). So Web Image gives a fast **compiler**, and the compiled `.class` files still need a JVM (Ristretto, b-jvm, CheerpJ, Doppio).

**License.** `web-image/LICENSE` is GPLv2 with the Classpath Exception; the demo sources are UPL (`WebMain.java` header). The docs say "Oracle GraalVM 25.1 or later" is required (`web-image/docs/get-started.md`), and a WebSearch summary states Web Image is not in Community builds (unverified beyond that snippet; building it from source with `mx` should be possible in principle but was not tried). Oracle GraalVM is under the GraalVM Free Terms and Conditions; per WebSearch snippets of oracle.com and the GraalVM FAQ, redistribution is allowed when no fee is charged and native-image output is deemed unmodified (not read first-hand, blocked).

**Size (measured).** `javac.js.wasm` 27,416,253 B; gzip -9 9,645,805 B; brotli 11 7,339,190 B; `javac.js` 97,465 B. The module embeds javac 25 and preloaded platform class files (strings in the wasm: `Oracle GraalVM 25-dev+15.1`, `25+15-LTS-jvmci-b01`, `2025-09-16`).

**Speed (measured, headless Chromium, `webimage/harness/run.mjs` driving the demo page).** Page load to ready: 933 ms and 2,197 ms in two runs (preloading class files 325-403 ms). Compiling `NoIn.java` (renamed class): javac's own timer 291 ms first, then 131 and 116 ms (wall 410, 190, 181 ms); `Bad.java` 25 ms. `performance.memory.usedJSHeapSize` about 131-139 MB afterwards.

**Fidelity of diagnostics (measured).** Real javac text and caret lines, but types are printed fully qualified: `error: incompatible types: java.lang.String cannot be converted to int` (javac 21 on HotSpot: `String cannot be converted to int`). Probably a diagnostic-formatter setting in the demo wrapper (not investigated).

**Other checks.** The demo runs on the page's main thread and touches the DOM (`WebMain.java` uses `document.getElementById`), so a Worker build needs a different entry point (Web Image supports Node, so a Worker build is plausible but unverified). CI: `node --experimental-wasm-exnref target/javac.js HelloWasm.java` per the demo README and workflow `.github/workflows/web-image-javac.yml` (not run here). Maintenance: oracle/graal HEAD `3ad9212` on 2026-09-28; Web Image is "experimental technology and under active development" (docs).

**Verdict.** Excellent **compile half** (real javac 25, 7-10 MB, ~0.1-0.3 s per compile on desktop) with two caveats: building requires Oracle GraalVM under GFTC (or an unproven source build), and the javac version (25) must be paired with a matching platform API (for example `--release 21` needs `ct.sym` or JDK 21 class files as the compile-time platform, which the demo does not include). Not a runtime.

## 6. DoppioJVM (plasma-umass/doppio)

**Facts.** JVM in TypeScript (README "doppio: A JVM in TypeScript v0.5.0"). MIT (`LICENSE`, GitHub license field). npm `doppiojvm` 0.5.0 published 2016-10-30; default branch last commit 2021-08-04 (Dependabot merges); last non-bot commit 2018-02-08 ("Modified Travis CI script to actually run tests"); pushed_at 2022-12-06; 2,180 stars, 55 open issues, not archived (GitHub search). Class library: Ubuntu `openjdk-8-jdk_8u72-b05-1ubuntu1_i386.deb` (`clones/doppio_jcl/Grunttasks.ts` lines 5-9), packaged as `java_home.tar.gz` (39,555,339 B, Last-Modified 2021-12-07, doppio_jcl release v3.2). Jars are stored uncompressed: `rt.jar` 64,680,821 B, `tools.jar` 18,225,423 B; rt+tools+charsets+resources gzip to 29,365,179 B (measured). `doppio.js` release build 397,690 B.

**Measured in Node 22 (`doppio-test/`).** javac 8 compiling `Main.java`: 21.35 s as a separate process; inside one JVM 17,896 ms, then 11,602 and 10,646 ms. Hello World run: 1.59 s. `Loop.java`: 3,053 ms for 10 M iterations (HotSpot 8: 16 ms), list sort 1,363 ms. ECJ 3.26.0 on Doppio: 69.96 s for the same file.

**Fidelity (measured against Temurin 8u482).** Identical stdout except `ArrayIndexOutOfBoundsException: 2 not in length 2 array of type [I` (HotSpot 8: `...: 2`); uncaught NPE printed as `java.lang.NullPointerException: ` (extra colon and space); process exit code 0 after an uncaught exception (HotSpot 1); `Math` lines differ in 352 of 400 (JavaScript `Math`). javac 8 error messages identical to HotSpot's javac 8. Stdin via `process.stdin` emulation (`src/natives/java_io.ts`), files via BrowserFS.

**Verdict.** Reject: abandoned for eight years, Java 8 only, 10-18 s compiles on desktop, ~30 MB of jars, and VM-level message differences.

## 7. CheerpX and WebVM (Leaning Technologies)

**What it is.** CheerpX is "an x86 virtualisation technology for running executables and operating systems on web browsers" (npm `@leaningtech/cheerpx` 1.3.9 `LICENSE.txt`, Definitions). WebVM (`leaningtech/webvm`) is the open front end: Apache-2.0, 17,408 stars, pushed 2026-09-24 (GitHub search), CheerpX bumped to 1.3.9 on 2026-08-17 (`git log`).

**License (npm pack, `rt-others/npm/package/LICENSE.txt`).** Clause 1.4(a): permitted "If You are an individual, for any purpose (including but not limited to: personal projects that do or don't generate revenue, open-source projects, public-facing applications)"; 1.4(b) businesses only for evaluation. Clause 2.1(f): "not to disassemble, decompile, reverse-engineer or create derivative works"; 2.1(i): not to make the Software available "to any person other than your employees without prior written consent". The npm package contains only a 581-byte `index.js` that imports `https://cxrtnc.leaningtech.com/${version}/cx.esm.js`. Licensing docs (`rt-cheerpj/labs/sites/cheerpx/src/content/docs/23-licensing.md`): "The **CheerpX Community License** allows unlimited, unmetered use of CheerpX from the `cxrtnc.leaningtech.com` domain. For self-hosted options, see the CheerpX Commercial License" (line 27) and "If you wish to self-host CheerpX, you will need a Commercial License" (line 68). So: an individual's educational site qualifies for free use, but **only from Leaning's CDN**; caching for offline use is the same grey area as CheerpJ.

**Technical constraints.** Needs `SharedArrayBuffer`, hence COOP/COEP (`11-guides/nginx.md` line 8; `20-faq.md` lines 43-56); images must be 32-bit x86: "The base image's architecture must be 32-bit x86 (for example, `i386` or `i686`)" (`11-guides/custom-images.md` line 32). WebVM's images are Debian buster i386 (EOL) ext2 images up to 950 MB (`dockerfiles/`, `.github/workflows/deploy.yml` "Image size, 950M max"), streamed on demand. Java specifically: a WebSearch snippet of a Leaning support thread ("Java Compilation on CheerpX and not CheerpJ", answeroverflow.com, blocked here) says both java and javac "can be made to work on CheerpX, but they are using some syscalls that are not yet supported by CheerpX" (unverified, date unknown). No measurements possible here.

**Verdict.** Reject: CDN-only under the free licence, needs cross-origin isolation, huge image, 32-bit only, Java support unconfirmed, and no Node/CI story (browser only).

## 8. OpenJDK HotSpot (Zero) compiled with Emscripten: JavaBox (bmarti44/javabox)

**What it is.** "JavaBox runs OpenJDK 21 (Zero interpreter) directly in WebAssembly via Emscripten" with a resident `CompileServer` that compiles with `javax.tools.JavaCompiler` and runs classes in-process (`clones/javabox/README.md`). OpenJDK fork: submodule `https://github.com/bmarti44/openjdk.git` branch `wasm-emscripten` (`.gitmodules`; branch head `e339656`). This is the only public HotSpot-on-Emscripten port I found (WebSearch for Zero plus Emscripten found nothing else).

**Claims (from its README, not verified: the prebuilt host was blocked).** "~3MB code + ~72MB data", prebuilt "~76MB"; "~3-5s boot, sub-second compile+run"; needs `SharedArrayBuffer` and COOP/COEP; "`PROXY_TO_PTHREAD` runs main() on a Web Worker"; memory "256MB initial, 512MB max"; stdin through a SharedArrayBuffer ring buffer; "JVM internal threads (Finalizer, GC) may fail to start". An earlier version booted Alpine in QEMU-wasm and, per the author's blog (WebSearch snippet of bmarti44.substack.com), took 55 seconds to print Hello World.

**License and maintenance.** **No LICENSE file** in the repo; issue #3 "Licence" ("There seems to be no licence - is any kind of reuse permitted?") opened 2026-09-20, 0 comments, open (GitHub issue search). 9 commits, 2026-03-02 to 2026-07-27; 14 stars (GitHub search). The HotSpot fork itself is GPLv2 (+CE for the class library) as OpenJDK, but the build scripts, `CompileServer` and glue have no licence.

**Verdict.** Proof that real HotSpot can run in a tab, with the best possible fidelity in principle (VM messages, helpful NPEs, even `Math` intrinsics may differ though, because Zero does not use the x86 stubs: unverified). Not usable: unlicensed, 76 MB, needs cross-origin isolation (possible on GitHub Pages only through a header-rewriting service worker), 256-512 MB of memory is risky on phones. Doing our own Zero port from scratch would be a multi-month project (estimate).

## 9. Other JVMs written in C, Rust or Go

| Project | Facts | Assessment |
|---|---|---|
| **b-jvm** (anematode/b-jvm) | MIT (`LICENSE`); C, compiled to Wasm; "JDK 23 support", "all bytecodes are implemented (besides deprecated jsr/ret)", "Line numbers in backtraces", interpreter "~2-3x slower on WASM" than interpreter-only HotSpot native (README, author's figures). Last commit 2025-04-10; 34 stars (GitHub search). | Engine inside TraceJVM. Unmaintained upstream for 17 months; usable as an MIT base for a custom runner. |
| **rjvm** (andreabergia/rjvm) | "A tiny JVM written in Rust. Learning project" (GitHub description), 1,580 stars | Not a class-library-complete JVM. Reject. |
| **douchuan/jvm** | MIT; Rust with an LLVM JIT, "~30 native method implementations" (README); last commit 2026-04-23; 536 stars | Native only, no Wasm target described. Reject. |
| **RustJava** (dlunch/RustJava) | "Embeddable jvm and java runtime implementation, targetting running on webassembly, java 1.2" (GitHub description) | Own Java 1.2-level class library. Reject. |
| **Jacobin** (platypusguy/jacobin) | MPL-2.0 (`LICENSE`); Go; "Executes all bytecodes except INVOKEDYNAMIC" (README), so no lambdas or Java 9+ string concatenation; no Wasm build described; 755 stars | Reject. |
| **Rise JVM** (AmazingRise/rise-jvm) | GPL-3.0; "a minimal Java VM based on WASM"; last commit 2022-05-03; 14 stars | Reject. |
| **Ristretto** | see section 3 | Best of this group. |

## 10. Java-to-Wasm/JS ahead-of-time compilers (no in-browser compiler)

These run at build time on a JVM, so learners' free-form code cannot be compiled in the page unless the compiler itself is also ported to the browser (only TeaVM has done that, via teavm-javac: see the TeaVM report).

- **Bytecoder** (mirkosertic/Bytecoder): Apache-2.0 (GitHub license); "Supports Java 8 up to Java 20", "Backed by OpenJDK 20 as JRE Classlib" (README) but with substituted classes such as `TRandom.java`, `TFormatter.java`, `TLocale.java` (`classlib/java.base/.../classlib/java/util/`). Last Maven release `2024-05-10` (maven-metadata lastUpdated 20240510151353); last non-bot commit 2025-05-16 ("Maven central migration"); 2026 commits are Dependabot only; 961 stars. Reject.
- **JWebAssembly** (i-net-software/JWebAssembly): Apache-2.0; last Maven release 0.4 (maven-metadata lastUpdated 20220320185307 for `jwebassembly-compiler`); active again: 50 commits between 2026-06-27 and 2026-09-27 by Volker Berlin (`git log`), pushed 2026-09-27; roadmap still lists "Exception handling", "Reflection" and built-in GC as undone Milestone 3 items (README). Reject.
- **J2CL** (google/j2cl): Apache-2.0; pushed 2026-09-28, latest tag v20260402 (`git ls-remote`), 1,381 stars; has a Wasm GC backend (topics `wasm`, `wasmgc`). The JRE emulation in `jre/java/java/util/` has no `Scanner`, and there is no `java/time` or `java/nio/file` emulation (tree listing); HashMap is built on internal JS maps (`InternalJsMap.java`, `InternalStringMap.java`), so iteration order is not OpenJDK's (inferred from the implementation, not measured). Bazel-based build. Reject. **GWT** (gwtproject/gwt, 1,628 stars) shares the emulation approach. Reject.
- **TeaVM**: covered in `rt-teavm.md` (independent class library, no Scanner, different HashMap order). TraceJVM uses only TeaVM's compilation of javac, not TeaVM's class library for learner code.

## 11. Alternative compilers paired with a browser JVM

- **Eclipse ECJ**: EPL-2.0; latest 3.46.100 (Maven lastUpdated 2026-09-07; `Bundle-Version: 3.46.100.v20260826-1225`); jar 3,384,534 B; `Bundle-RequiredExecutionEnvironment: JavaSE-17` and class file major 61, so it needs a Java 17 JVM (the last Java 8 compatible release I checked, 3.26.0 from 2021, is class major 52). Diagnostics differ from javac (measured): `Type mismatch: cannot convert from String to int` and `y cannot be resolved to a variable` versus javac's `incompatible types: String cannot be converted to int` and `cannot find symbol`. On Doppio it took 70 s (measured). Only sensible if a fast JVM already exists, and the friendly-error layer would have to be written for ECJ's wording.
- **Janino**: BSD-3-Clause (`LICENSE`); last release 3.1.12 (maven-metadata lastUpdated 20240206121122), last commit 2024-02-15, **repository archived** (GitHub search `archived: true`). Measured with 3.1.12: `Compilation of lambda expression NYI`; default interface methods and static interface calls rejected unless the target is set to 8. Reject.

## 12. Full x86 emulation

- **v86** (copy/v86): BSD-2-Clause (`LICENSE`), "x86 PC emulator and x86-to-wasm JIT", 23,540 stars (GitHub search). 32-bit x86 guest; would need an i386 Linux image with a JDK (hundreds of MB) and HotSpot's own JIT would run under emulation. Not measured; I expect boot plus JVM start in tens of seconds (estimate).
- **container2wasm** (ktock/container2wasm): Apache-2.0; converts containers to Wasm "with emulation by Bochs (for x86_64 containers), TinyEMU (for riscv64 containers) and QEMU" (README line 15). The QEMU route is what JavaBox first used (55 s Hello World, author's blog via WebSearch). Reject.

## 13. Server-based runners and hybrids (out of scope for a static site)

- **Judge0** (judge0/judge0): GPL-3.0 (`LICENSE`), 4,453 stars; needs its own server fleet.
- **Piston** (engineer-man/piston): MIT (`license`); "The Piston API is no longer freely available to the public (as of Feb 15, 2026) ... Authorization is only granted for good cause non-commercial educational projects" (`readme.md` line 92). Self-hosting needs a server.
- **JDoodle API**: commercial with "free, credits based and custom plans" (WebSearch summary of jdoodle.com, figures not verified). Any API secret embedded in a static site is public, so it cannot be used safely without a proxy server.
- **Hybrids.** (a) Precompiled answers only (run the reference solutions at build time and ship their outputs): cannot grade free-form learner code, so not acceptable. (b) In-scope hybrid worth testing: a Wasm-native javac (Web Image javac 25, or teavm-javac as in TraceJVM) for sub-second compiles, plus an interpreter JVM on a real JDK image (Ristretto JDK 21 for fidelity, or b-jvm for speed) for execution, both self-hosted and cached in Cache Storage like C/C++ Arena's 27-38 MB toolchain (`/home/user/antonyperez0/cpp-arena/README.md` line 58).

## 14. Recommendation

1. None of the "other" options is ready to drop in. The two that meet the hard constraints (self-hostable, offline-cacheable, real OpenJDK library, killable in a Worker, no COOP/COEP) are **Ristretto** and **TraceJVM**.
2. Ristretto has the fidelity (HotSpot-21-identical output in every non-`Math` test) and a clean licence, but 11-25 s compiles on a desktop. TraceJVM has the speed (0.1-0.3 s compiles, ~20 ms warm runs) but AGPL, pre-release status and measured fidelity bugs.
3. Suggested prototype, in order: (a) Ristretto runner fork that accepts class files and stdin bytes, fed by TraceJVM's or Web Image's javac; measure on a real Android phone; (b) if AGPL is acceptable, TraceJVM with a launcher class for stdin, and file bug reports for the AIOOBE text, `Double.MIN_VALUE`, and `Files.readAllLines`.
4. Whatever engine is chosen, verify lesson outputs with **that engine** in CI (headless Chromium via Playwright worked for Ristretto, TraceJVM and Web Image here), not only with HotSpot, because of the `Math` last-digit differences and engine-specific exception texts.

## 15. Reproduction pointers (scratch area)

- Doppio: `rt-others/doppio-test/` (`package/` npm tarball, `work/` programs and outputs).
- Web Image javac: `rt-others/webimage/ghp/web-image/javac/` (built demo), harness `rt-others/webimage/harness/run.mjs`.
- Ristretto: `rt-others/ristretto/pgp/` (built playground), harness `rt-others/ristretto/harness/run.mjs`, outputs `r21.json`, `r17.json`, `r11.json`, `rbad.json`, `rmf.json`.
- TraceJVM: `rt-others/tracejvm/package/` (npm), `serve/tracejvm/` (extracted runtime), harnesses `pw-run.mjs`, `pw-worker.mjs`, output `pw-out.json`.
- Math fidelity: `rt-others/mathfid/` (`hs21.out`, `hs21strict.out`, `rist21.out`, `tjvm.out`, `hs8.out`, `dop.out`).
- Janino/ECJ: `rt-others/janino/`. CheerpX npm: `rt-others/npm/package/`. Notes: `rt-others/notes.txt`.
