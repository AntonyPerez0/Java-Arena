# Java Arena: choosing the in-browser Java engine (judgment)

Date: 2026-09-28. Inputs: `/home/user/ref/research/rt-teavm.md`, `/home/user/ref/research/rt-cheerpj.md`, `/home/user/ref/research/rt-others.md` (read in full), plus spot checks of their scratch areas noted below. Nothing new was measured for this judgment except where it says "checked here". Section references such as "rt-teavm §8" point into those reports. Estimates are labelled "estimate".

## 1. Decision in one paragraph

Recommended engine: a **self-hosted hybrid**. **teavm-javac is used only as the compiler**: real OpenJDK javac compiled to Wasm GC, with the TeaVM code generator not used at all. It compiles against the real JDK 21 platform classes. The **Ristretto JVM (Rust compiled to Wasm) runs the resulting class files on its Corretto JDK 21 class library**. javac, the runtime and the build-time reference are all pinned to Java 21.

This is the only combination whose parts, each measured by the researchers, meet every hard requirement:

- **Output:** Ristretto JDK 21 printed stdout byte-identical to HotSpot 21 for HashMap order, `Double.toString`, `String.format`, seeded `Random`, exception messages and helpful NPE text (rt-others §3).
- **Compile speed:** the Wasm javac compiles in tens of milliseconds (rt-teavm §5).
- **Licences and offline:** both are Apache/MIT with GPLv2+CE parts, so they can be self-hosted and cached offline.
- **Killing:** both run in Workers that can be terminated.
- **CI:** both ran in headless Chromium here.

TraceJVM already ships this exact architecture (teavm-javac feeding an interpreter JVM on a real JDK image) and it worked here (rt-others §4), so the shape is proven. Our specific pairing has not been run end to end yet, which is why the prototype below has hard gates.

Runner-up: **CheerpJ 4.3 on Java 8 with a trimmed javac 8**, as an online-only engine. Section 5 gives the exact conditions for switching to it.

Rejected:

- **Full TeaVM pipeline:** its class library breaks output fidelity.
- **Ristretto alone:** compiles take 11 to 24 s.
- **TraceJVM as a product:** AGPL-3.0, pre-release, and measured fidelity bugs.
- **Everything else:** dead, unlicensed, CDN-only, or has no in-browser compiler.

## 2. Hard-requirement scorecard (the four serious candidates)

"Yes (measured)" means one of the three researchers ran it in this container. "Third-party" means another project reported it.

| Requirement | Hybrid: teavm-javac + Ristretto 21 (recommended) | CheerpJ 4.3, Java 8 + javac 8 | TeaVM + teavm-javac (full) | TraceJVM 0.4.1 |
|---|---|---|---|---|
| Real javac diagnostics | Yes (measured). javac 25 on TeaVM matched the CLI's first line in 12 of 18 cases, 5 more differ only by `java.lang.` (rt-teavm §8). A javac 21 build exists in wasm-oj (rt-teavm §13) | Yes (real javac 8; JavaFiddle does it, rt-cheerpj §4.1) | Yes (same javac as the hybrid) | Yes, but no source line or caret, and types are qualified (rt-others §4) |
| Output identical to OpenJDK | **Yes (measured)**: Ristretto JDK 21 stdout byte-identical to HotSpot 21; only `Math` last digits differ (rt-others §3, §2.2) | Library: likely yes vs JDK 8. VM-level: no line numbers in traces, `/ by zero` message missing, recursion reported as ArithmeticException (third-party, rt-cheerpj §6) | **No (measured)**: HashMap order, Random, format, messages, traps (rt-teavm §8) | Mostly; AIOOBE text, NPE text, `Double.MIN_VALUE` and Math differ (measured, rt-others §4) |
| Scanner from stdin supplied up front | Needs a small runner fork (`io::empty()` at `web/runner/src/lib.rs` line 141) or a `System.setIn` launcher; real `java.util.Scanner` | Launcher with `System.setIn` (third-party proven) | Not upstream; needs a classlib fork | Launcher works (measured) |
| Kill runaway program | Worker.terminate. Measured 0-5 ms for teavm-javac program workers (rt-teavm §10). Ristretto already runs in a module Worker with a 30 s limit (rt-others §3); its terminate latency is not separately timed | Worker.terminate 0.5-0.8 ms (third-party) | 0-5 ms (measured) | Hard abort measured (rt-others §4) |
| Offline via Cache Storage | Yes; self-hosted. The Ristretto playground already caches assets with SHA-256 checks (`clones/ristretto/web/shared/runtime.ts`, checked here) | **No** under the free licence: CDN-only, self-hosting needs a Commercial License, client caching not addressed (rt-cheerpj §3, §13) | Yes | Yes |
| Same engine in CI | Headless Chromium measured for both halves; teavm-javac also in Node 22 (rt-teavm §11) | Chromium only, needs the CDN; blocked here | Node and Chromium (measured) | Chromium (measured) |
| Licence adds obligations beyond notices/source offer | No | Yes: visible credit, CDN-only, "individual" status | No | AGPL source offer |
| Phone performance | Unmeasured (risk: interpreter speed) | Unmeasured | Unmeasured; TeaVM codegen 1.5-5 s on desktop | Unmeasured |

## 3. Comparison table

Sizes are compressed transfer sizes unless noted. "Measured" means measured in this container by the named report.

| Option | License | First-download size | Compile speed | Java version | Class-library fidelity | Offline | Time limit / kill | CI verification | Maintenance |
|---|---|---|---|---|---|---|---|---|---|
| **A. Hybrid (recommended): teavm-javac as compiler only + forked Ristretto JDK 21 runner** | Apache-2.0 (TeaVM, teavm-javac; `teavm/LICENSE`, teavm-javac README) + MIT OR Apache-2.0 (Ristretto README) + GPLv2+CE (javac sources; Corretto 21 image) + BSD notices (ThreeTen, ASM, jzlib). Self-hosting allowed; no field-of-use limits | About 19-23 MB (estimate). Parts: compiler.wasm 1,644,798 B gzip (measured, rt-teavm §4); jdk-21.zip 14,766,513 B; runner.core.wasm 1,896,806 B gzip (measured, rt-others §3); a signature-only JDK 21 compile SDK, 1-3 MB (estimate); JS under 0.3 MB (estimate). TeaVM's 2.39 MB runtime classlib is not needed | Measured, teavm-javac in Chromium 141: javac 68-92 ms cold, 9-61 ms warm; compiler ready in 343-377 ms (rt-teavm §5). With a real-JDK SDK, TraceJVM's teavm-javac took 277 ms cold and 79-96 ms warm (rt-others §4). Ristretto VM start plus run overhead is about 0.45-0.6 s on desktop (estimate derived from `rt-others/ristretto/harness/r21.json`: 16,428 vs 15,812 ms and 14,272 vs 10,176 ms) | Language: javac 21 (wasm-oj built one, `rt-teavm/forge/tools/java-client/README.md` line 25) or javac 25. Runtime: JDK 21 (Corretto 21.0.12) | Best found. JDK 21 stdout byte-identical to HotSpot 21, including HashMap/HashSet order, `Double.toString`, format, seeded Random and `nextGaussian`, LocalDate, AIOOBE/IOOBE/NFE/ArithmeticException messages and helpful NPE (measured, rt-others §3). `Math.sin/tan/log/pow` equal StrictMath, not HotSpot x86 Math (134/400 lines, rt-others §2) | Yes: static, self-hosted files in Cache Storage | Program in its own Worker; `terminate()` | Headless Chromium measured for both halves; teavm-javac in Node 22 without flags (measured). Ristretto in Node is unverified; a native CLI and a Wasmtime smoke script exist | TeaVM active (0.15.0 released 2026-06, master 2026-09-15). teavm-javac low activity (59 commits, last 2026-09-04). Ristretto very active (0.34.0 on 2026-09-27) but one author wrote 221 of 227 recent commits |
| B. CheerpJ 4.3, Java 8 + trimmed javac 8 (runner-up) | Proprietary Community License: free for individuals incl. "educational applications"; "Give appropriate credits"; use only "from the cjrtnc.leaningtech.com domain"; self-hosting needs a Commercial License (`labs/.../23-licensing.md` lines 5-68) | 12-23 MB decoded (estimate). Engine 1,046,334 B and runtime 18.7 MB fetched (third-party, warsha); javac8-min.jar 2,081,984 B (measured). Compressed size unknown | Third-party only: per-call javac 11.8 s first and 2.2-4.4 s warm; about 0.95 s warm (loopback); a resident compiler server 0.2-0.5 s warm (ECJ on Java 17) | Java 8 (also 11 and 17) | OpenJDK 8 library, so it should match Temurin 8. Third-party reports: no line numbers in stack traces, null `/ by zero` message, deep recursion shown as ArithmeticException | No under the free licence (CDN-only; caching not addressed; 206 Range chunks complicate a SW) | `terminate()` killed the JVM in 0.5-0.8 ms (third-party); classic Worker only | No Node build (npm 404, verified). Playwright Chromium needs CDN access, which is blocked here | Active vendor: 4.3 on 2026-04-21; closed source; 5.0 slipped; Java 21 "planned" |
| C. TeaVM + teavm-javac, full pipeline | Apache-2.0 + GPLv2+CE (javac) + BSD | About 4.25 MB as shipped (measured); about 3.0 MB re-packed (estimate) | javac 38-61 ms plus TeaVM codegen 1.46-1.64 s for a typical program in Chromium; up to 5.1 s for java.time (measured) | javac 25; TeaVM's own classlib subset | Poor (measured): HashMap order, `Random.nextInt(bound)`, Formatter rounding and `%.2f` trap, exception messages, AIOOBE and `/0` as uncatchable traps, no Scanner | Yes | 0-5 ms (measured) | Node 22 and Chromium (measured) | TeaVM active, one main maintainer; teavm-javac pinned to 0.13.1 |
| D. TraceJVM (b-jvm + teavm-javac + Temurin 23) | AGPL-3.0-only (own code) + MIT + Apache-2.0 + GPLv2+CE | About 25.7 MB gzip (measured) | 277 ms cold, 79-96 ms warm; warm run 18 ms (measured) | Java 23 | Close, but measured gaps: AIOOBE text, NPE text, `Double.MIN_VALUE`, Math, and `Files.readAllLines` failed | Yes | Hard abort; respawn 432 ms (measured) | Chromium measured; Node attempt failed | Pre-release 0.4.1 (2026-08-10); 9 public commits, anonymous maintainers; b-jvm last commit 2025-04-10 |
| E. Ristretto alone (interpreted real javac) | MIT OR Apache-2.0 + GPLv2+CE | About 16.8 MB with JDK 21 (measured) | 11-24 s first, 13-18 s warm (measured) | Runtimes 8/11/17/21/25 | Same as A on JDK 21. JDK 11/17 runtimes break the first lambda (measured) | Yes | Module Worker, 30 s limit | Chromium (measured) | Same as A |
| F. GraalVM Web Image javac | GPLv2+CE source; building needs Oracle GraalVM 25.1+ (GFTC) per `web-image/docs/get-started.md` | 9,645,805 B gzip / 7,339,190 B brotli (measured) | 291 ms cold, 116-131 ms warm (measured) | javac 25 | Compiler only; cannot run classes | Yes | Unverified (demo runs on the main thread) | Node with `--experimental-wasm-exnref` per demo (not run) | Experimental; oracle/graal very active |
| G. DoppioJVM | MIT | About 29 MB gzip of jars (measured, untrimmed) | 17.9 s cold, 10.6-11.6 s warm in Node (measured) | Java 8 | Library same as JDK 8; VM messages, exit code and Math differ (measured) | Yes | Unverified | Node (measured) | Dead: last human commit 2018-02-08 |
| H. CheerpX/WebVM, JavaBox, v86/QEMU | CheerpX CDN-only proprietary; JavaBox has no licence file; v86 BSD-2 | Hundreds of MB; about 76 MB for JavaBox (author) | Not measured; 55 s Hello World via QEMU (author blog, WebSearch) | Varies / 21 | Real HotSpot in principle | CheerpX no; others yes | Unverified | Browser only | CheerpX active; JavaBox hobby project |
| I. Bytecoder, JWebAssembly, J2CL/GWT, Janino, ECJ | Apache-2.0 / BSD-3 / EPL-2.0 | n/a | No in-browser compiler (AOT tools). Janino cannot compile lambdas. ECJ wording differs from javac | Various | Substituted classlibs / not applicable | n/a | n/a | n/a | Bytecoder stalled, Janino archived, ECJ active |

## 4. Recommendation and rationale

**Choose option A:** teavm-javac as a compile-only Wasm javac plus a forked Ristretto JDK 21 runner. Pin Java 21 everywhere: the javac source level and target, the runtime, and Temurin 21 as the build-time reference.

Rationale, in the order the brief asked me to weigh things:

1. **Exact output fidelity with OpenJDK.**
   - Ristretto is the only engine measured byte-identical to HotSpot on the full test program: HashMap and HashSet order, `Double.toString` (including `2.0E23`), `String.format`, seeded `Random` and `nextGaussian`, streams, `groupingBy`, `LocalDate`, and the AIOOBE, IOOBE, NFE, ArithmeticException and helpful NPE messages (`rt-others/ristretto/harness/r21.json` against `NoIn.21.out`; rt-others §3).
   - It gets there because it executes the real Corretto class library, not a re-implementation.
   - The TeaVM classlib fails exactly these checks (rt-teavm §8), and CheerpJ is reported to lose line numbers and VM exception messages (rt-cheerpj §6).
2. **Licence fit.**
   - Every component is under a permissive or GPLv2+Classpath Exception licence that allows self-hosting, with no restriction on who runs the site or how.
   - The engine adds only standard obligations:
     - ship licence texts and NOTICE files (TeaVM NOTICE: Alexey Andreev, ASF, Joda.org);
     - ship BSD notices for ThreeTen, ASM and jzlib;
     - ship Ristretto's MIT/Apache notice;
     - offer the corresponding source for the GPLv2+CE parts: the javac source tag, the teavm-javac commit and patches, and the Corretto 21 tag.
   - There is no required UI credit, no mandatory CDN, no telemetry to a third party, and no "individual only" condition. This is my reading of the cited licence texts, not legal advice.
   - By contrast, CheerpJ's free tier requires a credit, requires loading from Leaning's CDN, and depends on web prose that can change (rt-cheerpj §3).
3. **Killing runaway programs.** Both halves run in Workers. The run worker is disposable and the page-side timer calls `terminate()`. This matches the C/C++ Arena design (short-lived run worker, 3 s kill; `/home/user/antonyperez0/cpp-arena/README.md` line 61).
4. **Offline.**
   - Every byte is self-hosted, so it can go into Cache Storage exactly as C/C++ Arena does with its 27-38 MB toolchain (same README, lines 58 and 65).
   - Ristretto's own playground already caches its assets with SHA-256 verification (`clones/ristretto/web/shared/runtime.ts`, checked here).
5. **CI with the exact browser engine.**
   - The same compiler.wasm, runner.core.wasm and jdk-21.zip can run in Playwright Chromium in GitHub Actions; both halves were measured there by the researchers.
   - teavm-javac also runs in plain Node 22.
   - No third-party host is needed at CI time.
6. **Phone performance.** This is the main open question for option A, as it is for every option; nobody measured a phone.
   - The compile half is cheap (tens of ms on desktop).
   - The run half is an interpreter: 10 M loop iterations took 1,567 ms against 15 ms on HotSpot (rt-others §3).
   - MOOC programs are small and mostly I/O-bound, so I expect this to be fine, but it must be proven on a real device (success criteria in section 7).
7. **Size.** About 19-23 MB (estimate) sits below C/C++ Arena's 27-38 MB, which already ships with a mobile-data prompt.

Why not simply adopt TraceJVM, which already is this architecture? Three reasons:

- it is AGPL-3.0-only;
- it is pre-release with anonymous maintainers (9 commits, 0 stars);
- its b-jvm runner showed measured fidelity bugs that the site's "matches a real JDK" bar would flag (AIOOBE text, NPE text, `Double.MIN_VALUE`, `Files.readAllLines`).

Ristretto is the more faithful runner. b-jvm (MIT) stays as the component fallback if Ristretto is too slow on phones (section 5).

Why Java 21 and not Java 8?

- The course needs only Java 8 to 11 features, and JDK 21 runs all of them.
- Ristretto's JDK 21 is the runtime measured byte-identical. Its JDK 11 and 17 runtimes break lambdas in the default package (measured), and its JDK 8 zip is 38 MB.
- JDK 21 gives learners helpful NPE messages.
- The cost: exception texts differ from the MOOC's Java 8 sample output (for example `Index 2 out of bounds for length 2` instead of `2`; rt-cheerpj §9, rt-others §2). Java Arena regenerates every expected output with its own reference JDK anyway, so the lesson text must quote JDK 21 output, not the MOOC's.

## 5. Runner-up and exactly when to switch

**Runner-up: CheerpJ 4.3, Java 8 runtime, trimmed Temurin javac 8** (the configuration in rt-cheerpj §17), with:

- a resident compile worker and a disposable run worker;
- Temurin 8 as the CI reference;
- the runtime loaded only from `cjrtnc.leaningtech.com`;
- a visible "Powered by CheerpJ (Leaning Technologies)" credit.

Switch to CheerpJ **only if all three of the following hold**:

1. **The hybrid fails a gate** in the prototype (section 7) and the failure survives the listed component fallbacks:
   - **G1 (compiler) fails:** the Wasm javac cannot compile the 30-program suite against real JDK 21 platform classes, or its class files do not produce identical output on HotSpot 21. First try the fallbacks: teavm-javac with javac 25 and `-source 21 -target 21` against the JDK 21 SDK, then GraalVM Web Image javac.
   - **G2 (runner fidelity) fails:** fewer than 30/30 stdout-identical results or fewer than 10/10 exception first lines identical against Temurin 21, with root causes in Ristretto, not fixed within 2 weeks of work or by an upstream fix.
   - **G3 (phone) fails:** on a mid-range Android phone a warm "Run" of a typical program takes more than 4 s, a cold first run after caching takes more than 10 s, or the tab crashes in 20 consecutive runs. It must also still fail after swapping the runner for b-jvm (MIT) and trimming the JDK image.
2. **The owner accepts CheerpJ's trade-offs in writing:**
   - Java runs online only; lessons still read offline, but programs do not run offline;
   - a visible credit;
   - a hard dependency on a third-party CDN at runtime and in CI;
   - stack traces without line numbers, unless a line-tracking workaround is prototyped;
   - no JavaFX (no option has JavaFX anyway);
   - the site must stay operated by an individual. An academic organisation must ask Leaning for a quote.
3. **A CheerpJ prototype passes the same gates G1-G3** on GitHub Actions or on a machine where `cjrtnc.leaningtech.com` is reachable, with Temurin 8 as the reference.

If Leaning Technologies confirms in writing that caching the CDN files in visitors' Cache Storage is allowed, CheerpJ's offline blocker goes away. That alone does **not** trigger a switch, because the missing line numbers and VM messages still miss the fidelity bar. It does make CheerpJ a stronger fallback.

TeaVM's full pipeline is not the runner-up: fixing it means owning a long-lived fork of the TeaVM class library plus Wasm backend work for trapping exceptions (rt-teavm §12).

## 6. Prototype plan

Pins:

- teavm-javac `2ddcf02` (TeaVM 0.13.1; this avoids the `try_table` browser-version bump that TeaVM 0.14.1+ brings, rt-teavm §9), rebuilt with jdk21u javac as wasm-oj did;
- Ristretto `main` `8448588` / `playground-pages` `4a4b586`;
- Temurin 21 as the reference.

Keep the prototype outside `/home/user/Java-Arena` until the gates pass.

1. **Compile half.**
   - Build teavm-javac with jdk21u javac, following wasm-oj's pinned commit `890adb6410dab4606a4f26a942aed02fb2f55387` (`rt-teavm/forge/tools/java-client/README.md` line 25). Fall back to the stock javac 25 build with `-source 21 -target 21`.
   - Replace the TeaVM stub SDK with a **signature-only java.base generated from the exact Corretto 21 image Ristretto ships**. Strip method bodies with ASM at build time so javac sees exactly the APIs the runtime has. This also removes the `@Rename` stub bug (rt-teavm §8).
   - Expose `compile(files) -> {classes, diagnostics[{line, col, code, message}]}` and skip TeaVM codegen entirely.
   - Record compiler.wasm and SDK sizes (raw, gzip, brotli).
2. **Run half.**
   - Fork `clones/ristretto/web/runner/src/lib.rs` (about 50 lines, estimate). The Run request should take `{mainClass, classes: {name: bytes}, stdin: bytes, files: {name: text}, args}`.
   - Replace `io::empty()` with a buffer over the stdin bytes.
   - Write the lesson files into the working directory before `VM::new`.
   - Print uncaught throwables in HotSpot format (`Exception in thread "main" ...` plus the trace), emit an exit code, and cap output at 64 KB.
   - Build with `cargo build --target wasm32-wasip2 --release` as `web/scripts/build-runtime.mjs` does.
3. **Page shell.**
   - Two Workers as in C/C++ Arena: a persistent compile Worker and a fresh run Worker per run.
   - Page-side timer with a 10 s limit (the interpreter is about 100x slower than HotSpot on tight loops, rt-others §3). Use 3 s once phone numbers are known, if they allow it.
   - Programs: Hello World, and a Scanner program (read a number and a name, print a derived line) with stdin `5\nAda\n`.
4. **Timings.**
   - Desktop: Playwright Chromium, 10 repetitions each. Measure:
     - first visit with an empty cache (download plus init);
     - cold run with the cache populated (compiler init, first compile, first run);
     - warm compile and warm run;
     - plus `performance.measureUserAgentSpecificMemory()` where available.
   - Phone: a **real mid-range Android phone** in Chrome stable, over remote debugging, using the same harness page. CDP CPU throttling does not slow Workers (measured, rt-teavm §5), so a "throttled profile" alone is not trustworthy.
   - As a throttled proxy, also run the same compile and run on the main thread of a benchmark page with CDP 4x and 6x CPU throttling and "Slow 4G" network, and report both numbers side by side.
5. **Kill a runaway loop.**
   - Programs: `while(true){}`, a loop that prints forever (output cap), and a loop that keeps adding to a list (memory).
   - Measure the time from deadline to worker death, main-thread input latency during the loop, and time until the next run works.
   - Check whether Ristretto's configuration allows a heap cap; otherwise rely on Worker memory failure and verify that the tab survives.
6. **Friendly uncaught exception.**
   - Cases: AIOOBE, helpful NPE, NumberFormatException from `Integer.valueOf("abc")`, `/ by zero`, `InputMismatchException` from Scanner, and a custom exception with a cause.
   - Show the first line and the user frames with line numbers. Ristretto prints `at NoIn.main(NoIn.java:35)`; measured, rt-others §3.
   - Hide `java.base@21.0.12.1/...(Unknown Source)` frames and add the plain-English explanation keyed on the exception class.
7. **Ask before downloading on mobile data.**
   - Read `navigator.connection.type`, `effectiveType` and `saveData`, and fetch no engine bytes before consent.
   - Show the size and a progress bar; fetch with streaming `DecompressionStream`, as C/C++ Arena does.
   - Test with Playwright request interception: zero engine requests before the click.
8. **Offline.**
   - A service worker precaches the app shell. The engine Worker stores its assets in Cache Storage with a manifest and SHA-256 checks (reuse the pattern in `ristretto/web/shared/runtime.ts`). Call `navigator.storage.persist()`.
   - Proof: in Playwright, visit, consent and run once, then `context.setOffline(true)`, reload, and compile and run both programs with zero failed requests. Repeat in airplane mode on the phone.
9. **Fidelity suite: 30 programs, 2x2 matrix.**
   - Run each program four ways and diff: (javac 21 CLI, HotSpot 21), (browser javac, HotSpot 21), (browser javac, browser runner), and (javac 21 CLI, browser runner). The matrix separates compiler differences from runtime differences.
   - Compare stdout byte for byte and the exit code. For stderr, compare the first line exactly and the user frames exactly.
   - The programs:
     1. Hello.
     2. Scanner `nextLine` plus `Integer.valueOf`.
     3. A Scanner loop until "end", printing the sum and average.
     4. `HashMap<String,Integer>` printed.
     5. HashMap iteration with Finnish keys (ä, ö).
     6. `HashSet<String>` printed.
     7. `groupingBy` into a HashMap.
     8. Double arithmetic (0.1+0.2, 1.0/3, 100.0/7, averages).
     9. Double edge values (1e7, 1.0E-5, 1e23, 2e23, `Double.MIN_VALUE`, NaN, Infinity, -0.0).
     10. Float printing, including the literal `16777217f` (a known javac-on-TeaVM parse bug, rt-teavm §8) and `1.4E-45f`.
     11. `printf`/`String.format` with `%.2f`, `%5d`, `%-8s`, `%n`, `%,d`, `%e`, `%08.3f`, `%.0f` of 2.5 and `%.1f` of 1.05.
     12. `new Random(42)`: `nextInt(10)` x10, `nextDouble`, `nextBoolean`, `nextGaussian`.
     13. `Collections.shuffle` with a seeded Random.
     14. Math: `round(-2.5)`, `rint`, `floor`, `ceil`, `abs(Integer.MIN_VALUE)`, `sqrt`, plus one `sin`/`log`/`pow` line, expected to differ unless handled per section 8.
     15. Integer overflow, casts, char arithmetic and integer division.
     16. String methods.
     17. StringBuilder.
     18. `ArrayList.remove(int)` vs `remove(Object)` and `toString`.
     19. Streams with `joining`, `averagingInt` and `partitioningBy`.
     20. `Optional.toString`, `Enum.compareTo`/`ordinal`, and a record's `toString`.
     21. Comparator with `thenComparing`.
     22. Interfaces with default methods and polymorphic `toString`.
     23. Caught exception messages: `parseInt("abc")`, `list.get(5)`, `arr[5]`, `10/0`, `substring(5)`, a bad cast, `next()` on an empty iterator, and a null `length()`.
     24. An uncaught exception through nested calls (stderr and exit code 1).
     25. A custom exception with "Caused by".
     26. `Files.readAllLines`, `Files.lines` and `new Scanner(Paths.get("data.txt"))` on a lesson file, plus write-then-read.
     27. `LocalDate.of`, `plusDays`, `getDayOfWeek`, `Period` and `ChronoUnit.DAYS.between`.
     28. Catching a `StackOverflowError` from deep recursion.
     29. Default `Object.toString()` or identity hash. It is expected to differ; the checker must flag it as nondeterministic, not pass it.
     30. A CPU program (sieve of 1M plus 100k HashMap merges) for timing, plus `System.exit(2)` for the exit code.
   - Also run the 18 compile-error cases from `rt-teavm/harness/errs/` against the javac 21 CLI.
10. **CI.**
    - A GitHub Actions job:
      - set up Temurin 21;
      - build or download the pinned engine assets and check their SHA-256;
      - `npx playwright install chromium`;
      - serve the built site;
      - run the suite through the site's own worker code with 4 parallel pages.
    - Also try teavm-javac in Node plus Ristretto through its WASI preview2 shim in Node, as a faster second path.
    - Record per-program time so it can be extrapolated to all lesson content.

## 7. Success criteria (numbers)

Desktop numbers are for a 4-core laptop-class CPU in Chromium stable. "Phone" means a real mid-range Android device in Chrome stable (for example a 2022-2023 mid-range model); name the model in the result.

| # | Criterion | Target |
|---|---|---|
| G1 | Browser javac compiles all 30 suite programs; its class files give output identical to CLI javac's on HotSpot 21 | 30/30 |
| G1b | Compile-error first lines identical to the javac 21 CLI after only path normalization and `java.lang.` stripping | at least 17/18 |
| G2 | Browser runner stdout identical to Temurin 21 (program 29 excluded as nondeterministic by design; program 14's transcendental line is handled by the section 8 policy) | 29/29 byte-identical, exit codes 30/30 |
| G2b | Uncaught and caught exception first lines identical to Temurin 21; user frames have correct line numbers | 10/10 |
| G3 | Phone, warm: click Run to last output line for a typical program (compile plus run) | at most 4 s |
| G3b | Phone, cold after caching (new tab, engine from Cache Storage): first output | at most 10 s |
| G3c | Phone: 20 consecutive runs without a tab crash or reload | 20/20 |
| D1 | Desktop, warm compile of a typical program | at most 300 ms (p95) |
| D2 | Desktop, warm Run to output for Hello | at most 1.0 s; typical program at most 1.5 s |
| D3 | Desktop, cold with cache populated (compiler and runner init, first compile, first run) | at most 3 s |
| S1 | First-visit engine download, compressed | at most 22 MB, and at most C/C++ Arena's 27 MB in any case |
| K1 | Runaway loop killed after the deadline | within 100 ms; next run ready within 2 s (desktop) or 4 s (phone) |
| K2 | Main thread stays responsive during a runaway loop | input latency under 100 ms |
| M1 | Engine requests before consent on emulated cellular or saveData | 0 |
| O1 | Offline after one consented visit (Playwright `setOffline(true)` plus phone airplane mode): both programs compile and run | 2/2, 0 failed requests |
| C1 | CI runs the same asset bytes (SHA-256 match); 30-program suite time in GitHub Actions | at most 3 min |
| C2 | Extrapolated time to verify all lesson content (about 500 programs, estimate), 4 parallel workers | at most 20 min |
| L1 | Licence bundle: NOTICE/LICENSE files and a source-offer page listing exact commits and tags | present before any public deploy |

## 8. Risks and mitigations

1. **Interpreter speed on phones.** Ristretto ran 10 M loop iterations in 1,567 ms (HotSpot: 15 ms) and a 200k list sort in 2,081 ms (measured).
   - Keep lesson programs small, and make CI fail any lesson program slower than 2 s on the desktop engine.
   - Use a generous 10 s run limit.
   - If the phone gates fail, swap the runner for b-jvm (MIT; 18 ms warm run and 861-906 ms for the same 10 M loop in TraceJVM) and re-run the fidelity suite.
2. **The hybrid has not been run end to end.**
   - TraceJVM proves the architecture (teavm-javac against a real JDK image feeding an interpreter JVM, measured working).
   - The G1 and G2 gates come first, before any site work.
3. **Ristretto bus factor of 1, pre-1.0 (0.34.0).**
   - Pin exact commits and vendor the built assets with SHA-256.
   - The licence permits forking, so the site never depends on upstream availability.
   - b-jvm is the component fallback.
4. **javac on TeaVM uses TeaVM's number parsing.** `16777217f` compiled as `16777218f` and subnormal literals were rejected (measured, rt-teavm §8). javac constant folding of string concatenation with doubles could also use TeaVM's `Double.toString` (my inference, untested).
   - Suite programs 9 and 10 target this.
   - CI compiles every lesson program with the browser javac, so any affected content is caught.
   - A fix belongs in the compiler build (for example the parsing classes in the TeaVM classlib used inside compiler.wasm).
5. **Math last digits.** Ristretto's `Math` equals StrictMath; HotSpot x86 `Math` intrinsics differ in 134/400 lines (measured).
   - Policy: lesson content does not print full-precision `sin/cos/tan/log/pow` results. The MOOC uses sin/cos only in the JavaFX Asteroids project (rt-others §2).
   - CI flags any difference.
   - Worth testing: running the HotSpot reference with `-XX:+UnlockDiagnosticVMOptions -XX:-UseLibmIntrinsic` so it matches fdlibm (unverified idea).
6. **Identity hash output is nondeterministic.** `Object.toString()` without an override, and HashSet/HashMap of objects without `hashCode`, print differently between engines and runs.
   - The checker runs the reference twice (for example with different `-XX:hashCode` settings) and marks such output as non-gradable.
   - Content avoids grading it.
7. **Stack-trace format for JDK frames** (`java.base@21.0.12.1/...(Unknown Source)`).
   - Grade stdout only.
   - Show only user frames, normalized, in the friendly error view.
8. **Download size (about 19-23 MB estimate) and memory.** teavm-javac RSS reached about 560 MB after 10 compiles in Node, but that included TeaVM codegen, which this design drops.
   - Trim the JDK image to java.base.
   - Ship gzip copies and decompress with `DecompressionStream`.
   - Recycle the compile Worker after N compiles.
   - Measure memory on the phone (G3c).
9. **Browser support.** compiler.wasm needs Wasm GC; the minimum Android Chrome version is unverified here. Ristretto needs whatever its wasm32-wasip2 build and preview2 shim use (unverified).
   - Feature-detect and show a clear message.
   - Stay on TeaVM 0.13.1 to avoid the `try_table` requirement until measured.
10. **GPLv2+CE source-offer duty** for javac inside compiler.wasm and for the Corretto image.
    - Publish a source page with exact tags and commits, and mirror the tarballs in a GitHub release.
    - wasm-oj's pinned-source inventory is a model (`rt-teavm/forge/tools/java-client/README.md`).
11. **JavaFX (MOOC parts 13-14, 23 exercises) runs nowhere.** No engine found supports it. Scope those parts as read-only or native-JDK exercises.
12. **Runner-up risk if a switch happens:** a CheerpJ CDN outage or licence change, no offline, and privacy disclosure for the CDN.

## 9. What I need from the user

1. **Network access in this cloud environment** (Settings, then network). The recommended path needs:
   - `static.crates.io` and `index.crates.io` (both answered 200 for crate downloads here, checked);
   - `static.rust-lang.org` (200, checked), to add the `wasm32-wasip2` Rust target;
   - `repo1.maven.org` and GitHub, already reachable.

   To evaluate the runner-up and the live reference pages, please allow `cjrtnc.leaningtech.com` (curl got no response here, checked), plus `teavm.org`, `*.github.io` (curl got no response, checked) and `java-programming.mooc.fi`. Otherwise I will run those parts in GitHub Actions.
2. **A real Android phone test.** Either run the prototype's benchmark page on your phone (a mid-range device, Chrome stable) and send me the numbers, or approve a device-cloud service. Emulated throttling does not slow Web Workers.
3. **Decisions:**
   - Java 21 as the single reference version. Lesson texts will show JDK 21 messages, not the MOOC's Java 8 ones.
   - An engine download of about 20 MB behind a mobile-data prompt.
   - A 10 s run limit, to be revisited after the phone numbers.
   - JavaFX parts not runnable in the browser.
   - Publishing the licence and source-offer page.
4. **Permission to create a prototype branch or repository** and to use GitHub Actions minutes for the fidelity and CI runs, including building the Ristretto fork and the teavm-javac rebuild.
5. **Status of the operator:** confirm the site is run by you as an individual, not by a school. This matters only if we ever fall back to CheerpJ. Also say whether you want me to draft a question to Leaning Technologies about Cache Storage caching, as insurance for the runner-up.

## 10. Sources

- Reports: `/home/user/ref/research/rt-teavm.md` (sections 4, 5, 8, 9, 10, 11, 12, 13), `/home/user/ref/research/rt-cheerpj.md` (sections 3, 4, 5, 6, 9, 13, 14, 17), `/home/user/ref/research/rt-others.md` (sections 1 to 5, 9, 13, 14).
- Checked here for this judgment:
  - `/home/user/ref/research/rt-others/ristretto/harness/r21.json`: compile-only vs compile+run timings, and the byte-identical output lines;
  - `/home/user/ref/research/rt-others/clones/ristretto/web/runner/src/lib.rs`: a new VM per run, `io::empty()` stdin at line 141, a memory classpath;
  - `.../web/shared/runtime.ts`: Cache Storage with SHA-256;
  - `.../web/scripts/build-runtime.mjs`: `wasm32-wasip2` build;
  - `/home/user/ref/research/rt-teavm/forge/tools/java-client/README.md` line 25: OpenJDK 21 javac commit used by wasm-oj;
  - `/home/user/antonyperez0/cpp-arena/README.md` lines 17, 58, 61 and 65: architecture, toolchain size, run worker and offline;
  - curl reachability checks on 2026-09-28: index.crates.io 200, static.crates.io crate file 200, static.rust-lang.org 200, theseus-rs.github.io and cjrtnc.leaningtech.com no response;
  - the local Rust toolchain: cargo, rustc and rustup present, only the `x86_64-unknown-linux-gnu` target installed.
