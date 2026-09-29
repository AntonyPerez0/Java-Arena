# Runtime option: TeaVM + teavm-javac (javac and TeaVM compiled to Wasm GC, running in the browser)

Research date: 2026-09-28. Researcher scratch area: `/home/user/ref/research/rt-teavm/`.
Everything marked "measured" was run in this container (Intel Xeon 2.1 GHz, 4 cores, Node 22.22.2 with V8 12.4, headless Chromium 141.0.7390.37 via Playwright 1.56.1). Anything not measured is marked "unverified" or "estimate".

## 1. Verdict (short)

Technically the closest thing to "Clang in Wasm" for Java: a real OpenJDK javac (JDK 25 GA) plus the TeaVM AOT compiler both run inside one Wasm GC module, fully offline, and it runs unchanged in Node for CI. Download is about 4.3 MB compressed; a typical course program compiles in about 1 to 2 s on a desktop and runs in a Worker that can be killed instantly.

It is **not usable as-is for this course**. The problem is the TeaVM class library, not javac: it is an independent re-implementation, not OpenJDK, and the build-time "verify with a real JDK" requirement collides with it everywhere. Measured against JDK 21 output:

- there is no `java.util.Scanner` and `System.in` always returns EOF;
- `HashMap`/`HashSet` iteration order differs;
- seeded `Random` is ignored in TeaVM 0.13.1 (the version teavm-javac pins) and still differs for `nextInt(bound)` in 0.15.0;
- exception messages differ;
- array-index and divide-by-zero errors are uncatchable WebAssembly traps;
- `String.format("%.2f")` crashes in the in-browser pipeline;
- the upstream javac SDK stubs are broken so `e.getMessage()` and `obj.getClass()` do not compile.

Two small community forks (wasm-oj, WorldEditAxe) show that Scanner and stdin can be added. Getting to OpenJDK-identical output would still mean maintaining a fork of the TeaVM class library.

Recommended status: **reject as primary engine**; keep as a fallback idea only if the project is willing to own a TeaVM class-library fork.

## 2. Versions examined

| Item | Value | Source |
|---|---|---|
| teavm-javac HEAD | `2ddcf02` (2026-09-04), "Add options to configure strict mode and obfuscation" | `git log` in `/home/user/ref/research/rt-teavm/teavm-javac` |
| teavm-javac history | 59 commits: 30 in 2017, 1 in 2019, 1 in 2020, 1 in 2023, 24 in 2025, 2 in 2026; last TeaVM bump to 0.13.1 on 2026-03-21 (PR #19 by a contributor) | same |
| TeaVM version pinned by teavm-javac | 0.13.1 | `teavm-javac/gradle/libs.versions.toml` |
| Bundled javac | OpenJDK `jdk25u` revision `6c48f4ed707bf0b15f9b6098de30db8aae6fa40f`, which is tag `jdk-25+36` / `jdk-25-ga` (commit date 2025-08-12) | `teavm-javac/gradle.properties` (`jdk.revision`), `git ls-remote https://github.com/openjdk/jdk25u` |
| javac source modules compiled | `jdk.compiler`, `java.compiler`, `jdk.internal.opt`, plus `java.base/.../jdk/internal/jmod` | `teavm-javac/javac/build.gradle` |
| Build requirement | Java source/target 25 (README says Java 21, but `settings.gradle` sets `VERSION_25`); Gradle 9.1.0 wrapper | `teavm-javac/settings.gradle`, `gradle/wrapper/gradle-wrapper.properties` |
| TeaVM releases (tags) | 0.13.0 (tag commit 2025-11-02), 0.13.1 (2026-02-21), 0.14.0 (2026-05-02), 0.14.1 (2026-05-24), 0.15.0 (2026-06-04; Maven Central metadata lastUpdated 2026-06-14) | `git ls-remote --tags https://github.com/konsoletyper/teavm`, tag commit dates via `git fetch --depth 1 origin tag X`, `repo.maven.apache.org/maven2/org/teavm/teavm-core/maven-metadata.xml` |
| TeaVM master | `fd78e03` (2026-09-15); version bumped to 0.17.0-SNAPSHOT on 2026-09-13; no 0.16.0 on Maven Central (404) | `teavm/gradle.properties`, `git log`, Maven Central |
| TeaVM activity | 200 commits Apr-Sep 2026 (17/62/56/12/15/38 per month); 181 of the fetched commits by Alexey Andreev (single main maintainer) | `git log` on a 200-commit fetch |
| Licenses | TeaVM: Apache-2.0 (`teavm/LICENSE`, `teavm/NOTICE`); teavm-javac: Apache-2.0 (README "License" section); javac: GPLv2 + Classpath Exception (all 537 compiled OpenJDK source files carry the CE designation, checked with grep); java.time in TeaVM is a ThreeTen-backport derivative with BSD-3-Clause text (`teavm/classlib/src/main/java/org/threeten/bp/LocalDate.java` header) | files cited |

## 3. How the pipeline works end to end (from source)

1. `compiler.wasm` is one Wasm GC module produced by TeaVM from: javac (OpenJDK sources compiled to bytecode), TeaVM's own compiler (`teavm-core`, `teavm-tooling`), ASM 9.8, jzlib, and a thin API (`org.teavm.javac.Compiler`, `CompilerLib`). Source: `teavm-javac/compiler/build.gradle` (`teavm { wasmGC { ... } }`, mainClass `org.teavm.javac.CompilerLib`).
2. At runtime the page (or Worker) loads `compiler.wasm` with TeaVM's JS runtime `compiler.wasm-runtime.js`. It then calls:
   - `setSdk(compile-classlib-teavm.bin)`: the "platform classpath" javac compiles against;
   - `setTeaVMClasslib(runtime-classlib-teavm.bin)`: the class files TeaVM links into the output.

   Source: `teavm-javac/README.md`, `compiler/src/main/java/org/teavm/javac/Compiler.java`.
3. The SDK is not OpenJDK's `java.base`. The build tool `StdlibConverter` generates it from the TeaVM class library by renaming `org/teavm/classlib/java/.../TFoo` to `java/.../Foo`, stripping code and keeping public/protected members. Consequences:
   - an API missing in TeaVM surfaces as a javac error such as "cannot find symbol: class Scanner";
   - a missing overload silently changes overload resolution.

   Source: `teavm-javac/compiler/src/main/java/org/teavm/javac/StdlibConverter.java`, `build.gradle` task `generateClassLib`.
4. `compile()` runs javac's parse, enter, attribute, flow, desugar and generate phases on in-memory files (`FileManagerImpl`). Annotation processing, plugins and doclint are patched out (`Patches.java`).
5. `generateWebAssembly({mainClass})` runs TeaVM (Wasm GC target, optimization ADVANCED, debug info EMBEDDED, strict mode default true) on the class files and returns `app.wasm`. Source: `Compiler.java` lines around `generateWebAssembly`.
6. `app.wasm` is loaded with the same `compiler.wasm-runtime.js`. `System.out`/`System.err` go char by char to the imports `teavmConsole.putcharStdout`/`putcharStderr` (UTF-16 code units, so non-ASCII such as "äö" prints correctly, measured). Then `exports.main([])` is called.

   The upstream playground runs the program in an iframe and the compiler in a Worker (`ui/src/main/webapp/frame.js`, `worker.js`, `ui/.../Client.java`).
7. Output backend: Wasm GC only in upstream teavm-javac. TeaVM itself also has a JS backend; the WorldEditAxe fork (section 11) exposes it and also ships the compiler itself as JS for browsers without Wasm GC.

## 4. Artifact sizes (measured; built locally)

I built upstream teavm-javac `2ddcf02` with TeaVM 0.13.1 using a locally extracted Ubuntu OpenJDK 25.0.4.1, Gradle 9.1.0 wrapper. `:compiler:createDist` took 1 m 12 s wall.

Changes needed only to get through this sandbox's network (not code changes):

- removed the unreachable `teavm.org` repository and added a Maven Central mirror;
- supplied the jdk25u sources from a sparse `git clone` of tag `jdk-25-ga` instead of the blocked GitHub archive download.

Log: `/home/user/ref/research/rt-teavm/build/gradle-build5.log`.

| File (upstream build, TeaVM 0.13.1) | Raw bytes | gzip -9 | brotli q11 |
|---|---|---|---|
| `compiler.wasm` | 4,299,338 | 1,644,798 | 1,191,276 |
| `compiler.wasm-runtime.js` | 13,936 | 4,778 | 4,329 |
| `compiler.wasm-deobfuscator.wasm` (stack traces) | 36,608 | 17,228 | 15,309 |
| `runtime-classlib-teavm.bin` (already a gzip stream; 8,787,772 bytes inside) | 2,386,674 | no gain | 1,646,278 if the payload were stored raw and brotli-compressed |
| `compile-classlib-teavm.bin` (already gzip; 1,197,623 inside) | 200,623 | no gain | 145,261 if stored raw |
| **First-visit total** | 6.94 MB raw | **about 4.25 MB** as shipped (gzip on wasm/js) | about 3.0 MB with re-packed archives and brotli (estimate of a possible optimization; GitHub Pages brotli support unverified) |

Largest items inside the runtime archive (measured by parsing it):

| Item | Bytes |
|---|---|
| TeaVM `java.*` emulation classes | 3.43 MB |
| `UnicodeData.txt` | 2.18 MB |
| ThreeTen `java.time` | about 0.6 MB |
| JSO impl | 0.43 MB |
| CLDR JSON (trimmed to `en` + supplemental by `compiler/build.gradle` task `repackCldr`) | 57 KB |

Other builds for comparison (measured):

| Build | compiler | runtime classlib | compile classlib |
|---|---|---|---|
| teavm-javac ported by me to TeaVM 0.15.0 (section 9) | `compiler.wasm` 4,398,298 (gzip 1,747,141, brotli 1,235,392) | 2,316,563 | 201,785 |
| WorldEditAxe/Vsprocessing fork `dist/` (TeaVM 0.14.1) | `compiler.wasm` 5,456,983 (gzip 1,862,046); `compiler.js` 4,556,385 (gzip 1,441,416) | 2,337,410 | 216,518 |
| wasm-oj `@wasm-oj/toolchain-java@0.2.0` (npm) | `compiler.wasm` 7,854,442 (gzip 2,356,438) | 23,709,664 (gzip 17,003,533; ships full CLDR) | 1,261,778 |

Generated program sizes (`app.wasm`, measured, in-browser pipeline):

| Program content | Size |
|---|---|
| Hello world | 20 to 32 KB |
| Typical course program (classes, ArrayList, HashMap, a stream) | 45 to 96 KB |
| Anything using `String.format` or regex plus formatting | 415 to 427 KB |
| Streams + records test | 535 KB |
| `java.time` | 734 to 743 KB |

## 5. Timings (measured)

Node 22.22.2, same machine; harness `/home/user/ref/research/rt-teavm/harness/run.mjs`, `fidelity.mjs`, `mem.mjs`:

| Step | TeaVM 0.13.1 build | TeaVM 0.15.0 build |
|---|---|---|
| Load + compile `compiler.wasm` | 200-330 ms | 250-330 ms |
| `setSdk` + `setTeaVMClasslib` (gunzip + index in Wasm) | 140-190 ms | 140-190 ms |
| javac, first compile after load | 64-180 ms | 90-170 ms |
| javac, warm | 8-50 ms (hello to typical), up to 170 ms for stream-heavy code | similar |
| TeaVM to Wasm, hello | 0.65-1.0 s | 1.2-1.4 s |
| TeaVM to Wasm, typical course program (`M01_Mooc.java`), 10 repeated compiles | first 1.68 s, then 0.92-1.17 s | first 2.03 s, then 1.50-1.70 s |
| TeaVM to Wasm, String.format / regex / java.time programs | 2.0 s / n.a. / 3.6-4.2 s | 2.5 s / 4.9 s / 5.1 s |
| Instantiate `app.wasm` | 2-50 ms | 2-50 ms |
| Memory (process RSS) | 142 MB after init, 556 MB after 10 compiles | 154 MB, 582 MB |

Headless Chromium 141, TeaVM 0.15.0 build, compiler in a module Worker, program in a second Worker (`/home/user/ref/research/rt-teavm/harness/browser.mjs`, `web/`):

| Step | Time |
|---|---|
| Compiler ready (load + classlibs, local server) | 343-377 ms |
| Hello, cold | javac 68-92 ms, TeaVM 1.74 s |
| Hello, warm | javac 9-14 ms, TeaVM 1.15-1.25 s |
| Typical course program | javac 38-61 ms, TeaVM 1.46-1.64 s |
| Instantiate + start | 5-15 ms |

CPU-heavy run (sieve of 5M + 1M HashMap merges + sorting 200k strings, `T13_Perf.java`): 324-396 ms in Wasm vs 95 ms on HotSpot JDK 21 for the same code (measured).

TeaVM optimization level made little difference warm (fork API, ADVANCED 0.86 s vs SIMPLE 0.85 s, measured with `harness/fork-speed.mjs`).

Phones: not measured. CDP CPU throttling does not apply to Workers, so the throttled run was identical. Estimate only: a mid-range Android phone could be 3-6x slower, that is roughly 4-10 s per "Run" for a typical program. Treat this as unverified.

## 6. Licensing

- TeaVM and teavm-javac: Apache-2.0. The TeaVM NOTICE requires attribution to Alexey Andreev, the Apache Software Foundation (Harmony-derived code) and Joda.org (`teavm/NOTICE`). Redistribution, self-hosting and non-commercial or commercial use are allowed under Apache-2.0.
- java.time in TeaVM: ThreeTen backport code under BSD-3-Clause. Binary redistribution must reproduce the copyright notice (`teavm/classlib/src/main/java/org/threeten/bp/LocalDate.java` header).
- ASM (BSD-3-Clause), jzlib (BSD-style) and CLDR/Unicode data (`UnicodeData.txt`, `cldr-json.zip` inside `runtime-classlib-teavm.bin`) also end up in the shipped files. Their notices should be shipped too. These licenses were not re-read here; this is from general knowledge, unverified.
- javac: GPLv2 with the Classpath Exception. The exception text (fetched from `raw.githubusercontent.com/openjdk/jdk25u/jdk-25-ga/LICENSE`) allows linking the library with independent modules and distributing the resulting executable under terms of your choice. It does not remove GPLv2 obligations for the OpenJDK code itself. teavm-javac's README frames the inclusion "as permitted by the Classpath Exception" (`teavm-javac/README.md`).
- Conservative reading for a free educational GitHub Pages site (my interpretation, not legal advice). Hosting `compiler.wasm` means distributing object code of GPLv2+CE code, so:
  - ship the GPLv2+CE text;
  - offer the complete corresponding source from the same place (GPLv2 section 3, last paragraph): the exact `jdk25u` tag `jdk-25-ga` sources, the teavm-javac commit and any patches, and the build scripts.

  wasm-oj does this with a pinned-source inventory (`/home/user/ref/research/rt-teavm/forge/tools/java-client/README.md`, `THIRD_PARTY_NOTICES.md`).
- An individual's free non-commercial site qualifies without any special permission; none of these licenses discriminate by use.

## 7. JDK API usage in the MOOC and TeaVM coverage

I scanned 1003 Java code blocks in `/home/user/ref/java-programming/data/part-*/*.md` with HTML comments removed (`/home/user/ref/research/rt-teavm/scan/`). Counts are code blocks:

| Feature | Blocks |
|---|---|
| `Scanner(System.in)` | 93 |
| `Integer.valueOf`/`parseInt` | 70 |
| double arithmetic printed | 27 |
| Random | 17 |
| HashMap/HashSet iterated or printed | 9 |
| Files/Paths | 9 |
| `getMessage`/`getClass` | 7 |
| LocalDate | 1 |
| JavaFX | 31 |
| printf/String.format | 0 |
| Math.round | 0 |

The exercise outline flags (`/home/user/ref/mooc-outline.txt`) include SCANNER 17, TXTFILE 9, HASHMAP 8, RANDOM 4, JAVAFX 2 (first flag group per exercise only).

Coverage below means: present in the TeaVM classlib source (`teavm/classlib/src/main/java/org/teavm/classlib/java/...`) and/or measured by running a test through the in-browser pipeline against JDK 21 output. Tests are in `/home/user/ref/research/rt-teavm/harness/tests/`; results are in `harness/final-013.json`, `final-015.json`, `f015*.json`.

| API | Status | Evidence |
|---|---|---|
| `java.util.Scanner` | **Missing** (no `TScanner` in 0.13.1, 0.15.0 or master). javac reports "cannot find symbol class Scanner" | `ls classlib/.../java/util`, `git ls-tree`, test `T09_Scanner` |
| `System.in` | Always throws EOF (`TConsoleInputStream.read()` throws `TEOFException`); no `System.setIn` | `classlib/.../java/lang/TConsoleInputStream.java`, `TSystem.java` |
| String methods (trim, strip, isBlank, substring, indexOf, lastIndexOf, charAt, startsWith, endsWith, replace, replaceAll, equalsIgnoreCase, compareTo(IgnoreCase), contains, isEmpty, join, split(regex), matches, repeat, toUpper/LowerCase incl. ä/ö) | Present, output identical | `T16_Strings` 15/16 lines, `T06`, `T15b` |
| `Character.toString(int)` (Java 11) | Missing (javac error "possible lossy conversion") | `T16` first run |
| `StringJoiner` | Missing | `T15_MissingApis` |
| StringBuilder (append, insert, deleteCharAt, setCharAt, reverse, indexOf) | Present, identical | `T16` |
| Integer/Double parse and valueOf | Present; exception messages differ (section 8) | `T04b` |
| `Integer.sum` (used as `Integer::sum` in `merge`, `reduce`) | **Missing in 0.13.1**, present in 0.15.0 | `T13`, `T06` on each build |
| Math (abs, sqrt, pow, sin, cos, tan, log, exp, atan2, cbrt, hypot, floor, ceil, max, toRadians, PI) | Present; `log10(7)` differs in the last digit on 0.15.0; `Math.round(-2.5)` gives -3 (JDK -2) and `Math.rint(2.5)` gives 3.0 (JDK 2.0) | `T02`; source `TMath.java`: `round(double)` is `(long)(a + signum(a) * 0.5)` and `rint` calls `round` |
| ArrayList, LinkedList, ArrayDeque, PriorityQueue, TreeMap, LinkedHashMap, Iterator (incl. remove), List.of, subList, removeIf, sort | Present, identical | `T06`, `T16` |
| HashMap/HashSet (getOrDefault, putIfAbsent, merge, computeIfAbsent, keySet, values, entrySet) | Present, **iteration order differs** | `T01` 2/8 lines identical |
| Collections.sort/max/frequency/shuffle(Random) | Present; shuffle differs because Random differs | `T06`, `T15b` |
| Arrays.toString/sort/asList/stream/binarySearch/equals/copyOf/deepToString | Present, identical | `T16`, `T15b` |
| Comparable, Comparator.comparing/thenComparing/reverseOrder/comparingInt, String.CASE_INSENSITIVE_ORDER | Present, identical | `T06`, `T16` |
| Streams: filter, map, mapToInt, average, sum, max, min, sorted, distinct, reduce, forEach, findFirst, count, limit, boxed, IntStream.range(Closed), Stream.of, Stream.iterate | Present, identical | `T06`, `T15b` |
| Collectors: toList, toCollection, joining, groupingBy (+TreeMap factory, counting, mapping), partitioningBy, toMap, averagingInt, summingInt, toUnmodifiableList | Present; output identical except where a HashMap is involved | `T06` 31/36 lines |
| Optional | Present; `toString` gives `Optional.empty()` / `Optional.of(x)` (JDK: `Optional.empty` / `Optional[x]`) | `T06`; source `TOptional.java` line 151 |
| Records, enums, switch expressions, text blocks, `var`, pattern `instanceof`, lambdas, method refs, anonymous and inner classes, interfaces with default methods, generics | Compile (javac 25) and run correctly | `T06` |
| `Enum.compareTo` | Returns -1/0/1 (JDK returns the ordinal difference) | `T06`; source `TEnum.java` line 70 |
| `Integer.valueOf(127) == Integer.valueOf(127)` caching, String/record/List hashCode | Identical | `T06` |
| Random | Present, **not JDK-compatible** (section 8) | `T03` |
| LocalDate / LocalDateTime / Period / Duration / ChronoUnit | Present via ThreeTen backport. `LocalDate.of/plusMonths/getDayOfWeek/parse` identical. **`LocalDate.now()` crashes** in the in-browser pipeline (Wasm trap "dereferencing a null pointer") on both builds; works when TeaVM runs on the JVM | `T07` 3/8 in-browser, 8/8 JVM-hosted |
| `java.nio.file` Files.write/lines/readAllLines/newBufferedReader/Writer, Paths.get, Path.of, java.io.File | Present with an **in-memory VFS** (`teavm/core/src/main/java/org/teavm/runtime/fs/memory/InMemoryVirtualFileSystem.java`), 8/8 identical when TeaVM runs on the JVM. **In the in-browser pipeline TeaVM refuses to compile it**: "TByteBuffer ... marked with @JSByRef, which is not supported in Wasm GC" (both builds) | `T08b` |
| `new PrintWriter(String)`, `new FileWriter(String)` | PrintWriter(String/File) constructors missing; FileWriter compiles fail with "class file for java.io.FileDescriptor not found" | `T08`; source `TPrintWriter.java` constructors |
| `String.format`/`printf` | See section 8: `%.2f` crashes in-browser; `%n`, `%e`, `%g` unsupported; rounding differs | `T05`; source `TFormatter.java` `formatValue` switch |
| `System.nanoTime`, `currentTimeMillis`, `Thread.sleep`, `new Thread().start()/join()`, AtomicInteger, `synchronized` | Work (green threads via TeaVM coroutines). `main` returns before the program finishes when it sleeps, so the host needs a completion signal | `T10` 6/6 after waiting |
| `Object.getClass()`, `Throwable.getMessage()/getLocalizedMessage()/getStackTrace()`, `wait/notify` | **Do not compile** with upstream SDK stubs (see section 8, bug 1) | `/tmp` probes, fixed by a 35-line patch |
| AWT/Swing/JavaFX | Only `java.awt.Color`, `Point`, `Dimension` stubs; no Swing, no JavaFX | `ls classlib/.../java/awt` |

## 8. Fidelity findings (the blocking part)

**Bug 1: SDK stubs ignore TeaVM `@Rename`/`@Remove`.**

- TeaVM's classlib declares `getMessage0()` with `@Rename("getMessage")`, `getClass0()` with `@Rename("getClass")`, and so on (`TThrowable.java`, `TObject.java`). `StdlibConverter` does not apply these renames. So `javap` on the generated `java/lang/Throwable.class` shows `getMessage0()`, `getClass0()`, `toString0()`, and `Object` shows `wait0`, `notify0`, `equals0`.
- Result: `catch (Exception e) { e.getMessage(); }` fails to compile with "cannot find symbol: method getMessage()". Measured on my upstream build and on the wasm-oj and WorldEditAxe prebuilt compilers, so the public playground very likely has the same bug (unverified, teavm.org is blocked here).
- My research patch fixes it: honour the annotations, skip constructors, dedupe. It is saved at `/home/user/ref/research/rt-teavm/stdlibconverter-rename.patch` and makes these programs compile and print JDK-identical results.

**HashMap/HashSet order differs.**

- TeaVM `THashMap` indexes buckets with `hashCode() & (n-1)` and no `h ^ (h >>> 16)` spreading. It inserts new entries at the head of the bucket chain and rebuilds chains in reverse on resize. OpenJDK spreads the hash and appends at the tail (source: `classlib/.../java/util/THashMap.java` `putImpl`, `createHashedEntry`, `rehash`).
- Measured: 6 of 8 lines of `T01_HashOrder` differ, e.g. JDK `{auto=car, ohjelmointi=programming, kirja=book}` vs TeaVM `{ohjelmointi=programming, kirja=book, auto=car}`. `groupingBy` into a HashMap differs too. Small-hash keys (chars) matched.

**Random.**

- **TeaVM 0.13.1 (the version teavm-javac pins) ignores the seed.** The constructor and `setSeed` are empty and `nextDouble()` returns `Math.random()`, so `new Random(123).nextInt(1000) == new Random(123).nextInt(1000)` printed `false` (source `git show 0.13.1:.../TRandom.java`, test `T03`).
- TeaVM commit `1d78c4a` (2026-04-15, first in 0.14.0) added the JDK LCG (`0x5DEECE66DL`, `0xBL`, 48 bits), and `nextInt()`/`nextLong()`/`nextDouble()` now match. But `nextInt(bound)` comes from the `RandomGenerator` default (mask-and-reject over `nextInt()`), not `java.util.Random`'s `next(31)` modulo algorithm. `nextFloat` and `nextBoolean` also use generator defaults (`classlib/.../java/util/random/TRandomGenerator.java`).
- Measured on 0.15.0: `new Random(42)` then `nextInt(10)` x10 gives JDK `0 3 8 4 0 5 5 8 9 3` vs TeaVM `5 7 1 8 4 3 9 8 8 0`. Every later value diverges; 2/11 lines identical. `new Random(7).nextDouble()` sequences matched on 0.15.0.

**Double/Float toString.**

- TeaVM uses its own `DoubleAnalyzer` (18-digit fixed-point search), not Raffaello Giulietti's Schubfach algorithm used by JDK 19+ (`classlib/.../impl/text/DoubleAnalyzer.java`, `TAbstractStringBuilder.insert(int, double)`).
- Measured, JVM-hosted TeaVM 0.15.0: 69/74 lines identical, and all common course values matched (0.1+0.2, 1.0/3, 100.0/7, averages, 1e7, 0.001, 1.0E-5, 4.35*100, 1.1*1.1). Differences:

  | Value | JDK | TeaVM |
  |---|---|---|
  | 1e23 | `1.0E23` | `9.999999999999999E22` |
  | Double.MIN_VALUE | `4.9E-324` | `4.940656458412465E-324` |
  | Float.MIN_VALUE | `1.4E-45` | `1.4012985E-45` |

- In-browser only, javac itself runs on TeaVM's number parsing, so literals can be compiled wrong:
  - `16777217f` was compiled as `16777218f` (printed `1.6777218E7`, JDK `1.6777216E7`);
  - subnormal literals (`4.9E-324`, `1.4E-45f`) are rejected with "floating-point number too small" (measured).
- `Double.compare(0.0, -0.0)` returned 0 (JDK 1), measured in `T16`.

**String.format.**

- In-browser pipeline, both builds: `String.format("%.2f", ...)`, `DecimalFormat("0.00").format(...)` and `String.format(Locale.US, "%.2f", ...)` all trap with "dereferencing a null pointer" inside `DecimalFormat.forDigit`. That kills the program; `try/catch (Throwable)` does not help.
- JVM-hosted TeaVM 0.15.0 formats `%.2f`, but with rounding different from the JDK:

  | Call | JDK | TeaVM |
  |---|---|---|
  | `%-8.1f` of 1.05 | `1.1` | `1.0` |
  | `%.0f` of 2.5 | `3` | `2` |

- `%n` throws `UnknownFormatConversionException: n`. `%e`, `%g`, `%a` and `%t` are not in `TFormatter.formatValue` (source).

**Exceptions** (measured, in-browser):

| Situation | JDK | TeaVM |
|---|---|---|
| `Integer.parseInt("abc")` | `For input string: "abc"` | `String contains digits out of radix 10: abc` |
| `Integer.valueOf("")` | `For input string: ""` | `String is empty` |
| `Double.parseDouble("x1")` | `For input string: "x1"` | message `null` |
| `list.get(5)` | `Index 5 out of bounds for length 3` | message `null` |
| NPE | helpful NPE text | message `null` (0.15.0 only; in 0.13.1 a null dereference is a Wasm trap even inside try/catch) |
| `"abc".substring(5)` | StringIndexOutOfBoundsException | IndexOutOfBoundsException |
| `iterator().next()` on an empty list | NoSuchElementException | IndexOutOfBoundsException |
| Unused `(Integer) "x"` cast | ClassCastException | no exception (optimized away) |

**Traps instead of Java exceptions** (both builds, strict mode on):

- `arr[5]` out of bounds: trap "array element access out of bounds", or "dereferencing a null pointer" when a `catch` exists;
- integer `/ 0` and `% 0`: trap "divide by zero". TeaVM core has no ArithmeticException for integer division; grep finds none in `core/src/main/java`;
- `new int[-1]`: trap "requested new array is too large".

A trap ends the whole program, so the course's own lessons on ArrayIndexOutOfBoundsException and try/catch would behave differently. When an array error is uncaught, the host only gets a JS error whose message reads "(could not fetch message)".

**Compiler crash.**

- `int z = 0; System.out.println(10 / z);` crashes TeaVM itself inside `compiler.wasm` with `RuntimeError: divide by zero`, presumably during constant folding (both builds, measured).
- The compiler instance must be re-created afterwards (about 0.4 s).

**Uncaught exceptions and stack traces.**

- Nothing is printed to stderr. The error surfaces to JS as `JavaError`/`T` with only the Java message.
- `e.printStackTrace()` with the deobfuscator (`compiler.wasm-deobfuscator.wasm` path passed to the runtime) gives real class, method and line numbers:

  ```
  at Main.f(Main.java:2) ... at Main.main(Main.java:4)
  ```

  It is surrounded by TeaVM frames (`Throwable.fillInStackTrace`, exception constructors, `org.teavm.runtime.Fiber...`), so the host must filter them and must print `Exception in thread "main"` itself.
- Without the deobfuscator, frames are `java.lang.Throwable$FakeClass.fakeMethod`.

**javac diagnostics are real javac 25.**

18 single-error programs were compared against the real javac 25.0.4.1 CLI (`harness/errcmp.mjs`, `harness/errs/`):

- 12/18 first lines are identical (`';' expected`, `cannot find symbol`, `variable n might not have been initialized`, `incompatible types: possible lossy conversion from double to int`, `unexpected return value`, `not a statement`, `cannot assign a value to final variable f`, ...);
- 5 differ only by fully qualified names (`java.lang.String cannot be converted to int` vs `String cannot be converted to int`), which is easy to post-process;
- 1 differs because Scanner is missing.

So "real javac messages to explain in friendly words" does work.

**What worked well.** Records, enums (except compareTo), lambdas, streams, TreeMap/LinkedHashMap, string handling, StringBuilder, integer overflow, casts, `Integer` caching and hash codes all printed identical output. `M01_Mooc` (a typical course program) was 8/8 identical on both builds.

## 9. Does a newer TeaVM fix it?

I ported teavm-javac to TeaVM 0.15.0. The patch is `/home/user/ref/research/rt-teavm/teavm-0.15.0-port.patch`: `ClasspathClassHolderSource` now needs a substitution mapping, and `ServiceLoader.stream()` is not supported by TeaVM itself, so the policy list is passed explicitly. The build succeeded in 50 s.

**Improved in 0.15.0:**

- seeds honoured;
- `Integer.sum` present;
- String NPE catchable;
- Double output closer.

**Not fixed in 0.15.0:**

- HashMap order;
- `Random.nextInt(bound)`;
- exception messages;
- array/division traps;
- `%.2f` crash in-browser;
- `LocalDate.now()` crash in-browser;
- nio Files rejected in-browser;
- Scanner/stdin absent.

**New cost:** TeaVM is about 50% slower per compile (section 5).

TeaVM 0.14.1+ also switched Wasm exception handling from legacy `try` (opcode 0x06) to `try_table` (0x1F, exnref) (`core/.../wasm/render/WasmBinaryRenderingVisitor.java` at tags 0.14.0 vs 0.14.1). That raises the minimum browser version. It ran in Node 22.22.2 and Chromium 141 here; exact minimum Android Chrome version unverified.

As a control, I also compiled the same tests with JVM-hosted TeaVM 0.15.0 (Gradle plugin, Wasm GC, `strict = true`; `/home/user/ref/research/rt-teavm/jvmtea/`). The in-browser-only failures disappear there:

- LocalDate.now 8/8;
- Files 8/8;
- `%.2f` works.

These failures therefore come from running TeaVM inside Wasm with the reduced classlib and resources (for example the trimmed CLDR data and metadata generators), not from TeaVM in general. HashMap, Random, messages, traps, Math.round and Enum.compareTo remain the same in both.

## 10. Runtime capabilities

| Capability | Finding |
|---|---|
| **Web Worker + kill** | Compiler runs in a module Worker. Programs run in a separate Worker; `Worker.terminate()` stopped an infinite loop in 0-5 ms, measured in Chromium 141 and Node `worker_threads`. The upstream playground uses an iframe instead (`ui/.../Client.java` `executeCode`). |
| **Stdin** | None upstream. Adding it is proven feasible without touching `compiler.wasm`: override `TConsoleInputStream` with an `@Import("readStdin")` and add a `TScanner` into the runtime classlib and SDK archives. The WorldEditAxe fork did exactly this (`vsp-teavm-javac/compiler/src/runtimeClasslibEmu/.../TConsoleInputStream.java`, 944-line Apache-2.0 `TScanner.java`); its prebuilt dist ran `T09_Scanner` with stdin `"21\n"` and printed `Doubled: 42` (measured). wasm-oj vendored AOSP libcore Scanner (GPLv2+CE) instead (`forge/tools/java-client/README.md`). Input must be supplied up front; interactive input would need JSPI or Atomics (not tested). |
| **Virtual file system** | TeaVM has `InMemoryVirtualFileSystem` as the default for `java.io.File` and `java.nio.file`. The host could pre-create data files via a generated launcher. Currently blocked in-browser by the `@JSByRef` error (section 7). |
| **GUI** | No Swing or JavaFX. WebFX announced TeaVM support for JavaFX apps (blog.webfx.dev 2025-11-17, WebSearch result), but using it inside an in-browser compile is unverified and would be a large project. |
| **Mobile** | Needs Wasm GC in the browser. The Chrome stable release with Wasm GC on by default was announced on the TeaVM Google group (WebSearch result, "Chrome is now released with Wasm GC enabled by default"); exact Android versions unverified. Download is about 4.25 MB; memory can reach about 0.5 GB after several compiles (Node RSS, measured), a risk on low-end phones. The fork's `compiler.js` (4.56 MB, 1.44 MB gzip) offers a non-Wasm-GC fallback (not measured here). |
| **Offline** | All assets are static files (1 wasm, 1 js, 2 archives, optional deobfuscator). They are cacheable in Cache Storage. The upstream Worker fetches with XHR; a custom worker using `fetch` works with a service worker (not tested). |
| **Program start** | Instantiate 2-50 ms; output is streamed char by char through the imports. |
| **Threads** | Supported via coroutines. The host needs an end-of-program callback; the fork adds one: `main(args, callback)` in `teavm-javac.js` `JavaProgram.execute`. |

## 11. CI

Verified: the identical `compiler.wasm`, archives and generated `app.wasm` run in plain Node 22 (no flags). `harness/fidelity.mjs` compiles with the Wasm compiler, runs in `worker_threads` with a timeout, and diffs against `java File.java` output. Playwright + Chromium also works (`harness/browser.mjs`).

Throughput estimate for this machine: 1-2 s per program single-threaded, about 500 MB RSS per compiler instance. Hundreds of programs means a few minutes with 3-4 parallel workers (estimate).

Important: CI must use the in-browser `compiler.wasm`, not the TeaVM Gradle plugin. The two differ (LocalDate.now, format, Files), as section 9 shows.

## 12. What it would take to make this option viable (estimates, unverified)

1. Fix the SDK `@Rename` bug: done here as a proof; small.
2. Add Scanner + stdin + end-of-program callback: port from the WorldEditAxe fork (Apache-2.0); small to medium.
3. Make HashMap/HashSet, Random.nextInt(bound)/nextFloat/nextBoolean, Math.round/rint, Enum.compareTo, Optional.toString, Formatter (HALF_UP, %n, %e) and exception messages byte-identical to OpenJDK. This means replacing TeaVM classlib classes with OpenJDK-faithful ports.
   - Copying OpenJDK code brings GPLv2+CE into the runtime archive, which is fine legally if source is offered.
   - This is a continuing medium-to-large maintenance fork, re-applied on every TeaVM bump.
4. Make array bounds, null and division errors real Java exceptions (TeaVM Wasm GC backend work: upstream issue territory; large and not under the project's control).
5. Fix the in-browser-only failures (CLDR/format, tz data for `LocalDate.now`, nio `@JSByRef`, the constant-folding division crash); medium.
6. Accept that TeaVM compile time is about 1-2 s on desktop and likely several seconds on phones.

## 13. Related third-party builds found

- **wasm-oj/forge** `@wasm-oj/toolchain-java@0.2.0` (npm, published about 2026-09-10).
  - Patched teavm-javac and TeaVM 0.13.1, OpenJDK 21 javac, output as WASI modules, full CLDR, AOSP Scanner.
  - Its own README lists the same class of problems: "TeaVM exception stderr formatting differs from JVM output and optimized traces can omit exception class/message text".
  - Its test corpus is 19 parity cases.
  - Sources: `/home/user/ref/research/rt-teavm/forge/tools/java-client/README.md`, `npm/package/`.
- **WorldEditAxe / Vsprocessing teavm-javac fork** (GitHub `Vsprocessing/teavm-javac`, last commit 2026-09-15, TeaVM 0.14.1, Apache-2.0).
  - Adds a JS backend and a JS compiler build, Scanner/stdin, file-system bridge, Processing support.
  - Not on npm (404 for `@worldeditaxe/teavm-javac`). Its prebuilt dist still has the getMessage bug and the `%.2f` crash (measured).

## 14. Key files produced

| Path | Contents |
|---|---|
| `/home/user/ref/research/rt-teavm/build/teavm-javac/compiler/build/` | Upstream build outputs (TeaVM 0.13.1) |
| `/home/user/ref/research/rt-teavm/build/teavm-javac-015/compiler/build/` | TeaVM 0.15.0 port |
| `/home/user/ref/research/rt-teavm/harness/` | Node and Chromium harnesses, tests, JSON results |
| `/home/user/ref/research/rt-teavm/jvmtea/` | JVM-hosted TeaVM 0.15.0 control build (`jvm015-results.json`) |
| `/home/user/ref/research/rt-teavm/stdlibconverter-rename.patch` | The `@Rename` fix |
| `/home/user/ref/research/rt-teavm/teavm-0.15.0-port.patch` | TeaVM 0.15.0 port |
| `/home/user/ref/research/rt-teavm/scan/` | MOOC API scan |

Blocked or not checked:

- teavm.org, including the live playground and its prebuilt `compiler.wasm`, was unreachable (HTTP 403 from the proxy), so the playground's own behavior is inferred from source and from the two forks;
- GitHub issues and the releases API for konsoletyper repos were not accessible in this session.
