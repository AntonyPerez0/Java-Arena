# CheerpJ as the in-browser Java engine for Java Arena

Research report, 2026-09-28. Scope: CheerpJ by Leaning Technologies (a WebAssembly JVM that runs the real OpenJDK class library), evaluated against the Java Arena requirements (static GitHub Pages site, real javac, stdin via Scanner, stdout/stderr capture, stack traces, time limit, Android Chrome, mobile-data prompt, offline caching, CI verification with the exact browser runtime).

## How this was researched, and what could not be done here

- **Documentation source**: cloned `https://github.com/leaningtech/labs` (commit `2218f66`, 2026-09-28), which holds the source of cheerpj.com/docs and labs.leaningtech.com. Paths below starting with `labs/` are inside `/home/user/ref/research/rt-cheerpj/labs/`. The CheerpJ docs live in `labs/sites/cheerpj/src/content/docs/`, the blog in `labs/sites/labs/src/content/blog/`.
- **JavaFiddle source**: cloned `https://github.com/leaningtech/javafiddle` (commit `741b8ab`, 2026-06-05) into `/home/user/ref/research/rt-cheerpj/javafiddle/`.
- **cheerpj-meta** (official examples/issues repo): cloned `https://github.com/leaningtech/cheerpj-meta` (commit `2fd8033`, 2026-06-12).
- **Third-party projects that measured CheerpJ 4.3** (found with GitHub code search for `cheerpjRunMain System.setIn`; files fetched from raw.githubusercontent.com into `/home/user/ref/research/rt-cheerpj/gh/`): Saad5400/warsha (Warsha, the most thorough: a spike plus a production integration with timings), dataslope/dataslope, shwetankg07/loopback, frc4451/garagedocs, lexuanbach/41039 (a university subject site on GitHub Pages), Entkenntnis/PurpleJ, gangdol2012/Codin. Their numbers are **reported by them, not re-measured by me**; they are labelled "third-party" below.
- **Local experiments** (JDK/javac only, HotSpot, not CheerpJ): downloaded Temurin 8u482, 11.0.30 and 17.0.16 from github.com/adoptium release assets into `/home/user/ref/research/rt-cheerpj/jdks/`, built trimmed javac jars, tested them on runtimes with the compiler module removed, and diffed output fidelity across JDK 8, 11, 17 and 21.
- **Blocked here**: `curl https://cjrtnc.leaningtech.com/4.3/loader.js` fails with `CONNECT tunnel failed, response 403` (verified 2026-09-28), and cheerpj.com, leaningtech.com, plantuml.com, github.io and web.archive.org are blocked for WebFetch. So **no CheerpJ timing, size or behaviour was measured in this environment**. A prototype must run where `cjrtnc.leaningtech.com` is reachable (for example GitHub Actions or a developer machine). Statements from cheerpj.com pages that are not in the labs repo come from WebSearch snippets and are marked as such.

## 1. Verdict in one paragraph

CheerpJ is the most faithful "real JVM" option: it runs an unmodified OpenJDK class library, so pure-Java library behaviour (HashMap order, `Double.toString`, `Random`, `String.format`, collections, streams, `LocalDate`) should match HotSpot of the **same Java major version**, and real `javac` runs inside it (JavaFiddle does exactly this). It works on a static host without cross-origin isolation, runs in a classic Web Worker, and a runaway program can be killed with `worker.terminate()` (third-party measured). But under the free Community License it **cannot be self-hosted**, the runtime must load from `cjrtnc.leaningtech.com`, and caching it for offline use is at best a legal grey area, which conflicts with the "cache everything for offline use" requirement. Two fidelity gaps are reported by independent projects: **stack traces carry no line numbers** and **VM-generated exception messages can be missing** (for example `ArithmeticException` without `/ by zero`). JavaFX is not supported (MOOC parts 13 and 14), CI must use a real browser with network access to the CDN (no Node build exists), and nothing is known about compile speed or memory on Android phones. Recommendation: viable as an online-only engine with the caveats above; a blocker if offline Java is mandatory, unless Leaning Technologies confirms in writing that Cache Storage caching is allowed or a commercial licence is bought.

## 2. Current version and Java support

| Fact | Value | Source |
|---|---|---|
| Latest release | **CheerpJ 4.3, April 21, 2026**; loader `https://cjrtnc.leaningtech.com/4.3/loader.js` | `labs/sites/cheerpj/src/content/docs/22-changelog.md` lines 5-8; `labs/sites/labs/src/content/blog/CJ-4-3.mdx` (pubDate "April 21 2026") |
| No newer release found | No 4.4 or 5.0 in the changelog at labs commit 2218f66 (2026-09-28); WebSearch found none | changelog above; WebSearch "CheerpJ 4.4 OR CheerpJ 5.0 released" |
| Supported Java versions | "Java `8`, `11` and `17` are currently supported. Default version is Java `8` if not specified." (`cheerpjInit({version})`) | `labs/.../docs/12-reference/00-cheerpjInit.md` line 53 |
| Applets | "Applets are supported on Java 8 only." | same file, line 56 |
| Next | "Support for Java 21 is also planned for later this year" and "CheerpJ 5.0 on the horizon" | `CJ-4-3.mdx` lines 41 and 258 |
| Runtime versions reported inside the JVM | `1.8.0_492-internal` (Java 8), `11.0.31-internal`, `17.0.19-internal` | third-party: warsha `docs/engineering/java-runtime-spike.md` section 2; dataslope `tools-jar/JAVA-VERSION.md` |
| History | 3.0 Feb 1 2024; 3.1 Feb 5 2025; 4.0 (Java 11) Apr 22 2025; 4.1 (Java 17 preview) May 28 2025; 4.2 (improved 17) Jun 26 2025; 4.3 Apr 21 2026 | `22-changelog.md` |

For the MOOC: I grepped `/home/user/ref/java-programming/data/part-*` and found no Java 9+ APIs (`List.of`, `Map.of`, `.repeat(`, `.isBlank(`, `Files.readString`, `var x =`: 0 hits each), and the MOOC's own sample output uses Java 8 message formats (`IndexOutOfBoundsException: Index: 2, Size: 2` with `ArrayList.rangeCheck`, in `data/part-3/2-lists.md`). So the **Java 8 runtime is sufficient for the course text**, and matches its sample outputs.

## 3. Licensing (exact terms)

Source for all quotes in this section unless noted: `labs/sites/cheerpj/src/content/docs/23-licensing.md` (published as https://cheerpj.com/docs/licensing).

> "CheerpJ Core is distributed for _free_ with the **CheerpJ Community License**, which makes it free to use for _personal projects_, _FOSS projects_, and for _technical evaluations_." (line 5)

> "You can use CheerpJ for free if you fall into any of the following categories: Individuals, including one-person companies. For example: Any personal projects, whether they generate income or not; Public-facing applications (such as games, educational applications, etc.); Commercial applications developed by one-person companies; Free and Open-Source Software (FOSS) projects; Technical evaluations" (lines 11-18)

Table (lines 20-25): for "_You are an individual using CheerpJ for a personal project (including one generating revenue)_" and "_You are a team using CheerpJ in a FOSS project_" the action point is "**Give appropriate credits**".

> "The **CheerpJ Community License** allows unlimited, unmetered use of CheerpJ from the `cjrtnc.leaningtech.com` domain, such as its usage via npm package manager. For self-hosted options, see the CheerpJ Commercial License." (line 27)

> "The **CheerpJ Commercial License** allows its usage in a commercial setting in addition of: Self-hosting of the CheerpJ Core component; Redistribution and OEM uses; Priority Support and SLA" (lines 37-41)

> "If you wish to self-host CheerpJ, you will need a **Commercial License**." (line 68)

> "_You are a public sector, non-profit, or academic organisation and want to use CheerpJ for an internal or public-facing project_" : "Contact us for a special quote" (line 47)

Other licence-related facts:

- `cheerpjInit({licenseKey})`: "The non-commercial license message will be removed from the CheerpJ display if a valid license key is used." (`labs/.../12-reference/00-cheerpjInit.md` line 385). So free use shows a notice in the CheerpJ display; Warsha saw nothing in console-only (worker) runs (third-party, `java-runtime-spike.md` section 8.1).
- Architecture page: "CheerpJ assets are static, which makes it easily self-hostable, and we provide a cloud version under the CheerpJ Community Licence" (`labs/.../14-explanation/architecture.mdx` line 14).
- FAQ: "The CheerpJ runtime library is hosted by us on a dedicated CDN-backed domain, and we invite users to link to it" (`labs/.../20-faq.md` line 11).
- WebSearch snippets of https://cheerpj.com/faqs/ (not fetchable here): "you can self-host CheerpJ on an air-gapped environment with any commercial licence" and "You can self-host CheerpJ with any commercial licence, or if you are performing a technical evaluation for one."
- A legacy page, https://leaningtech.com/cheerpj-non-commercial-licence/ (WebSearch snippet only, date unknown), allowed self-hosting for services "open sourced by some license recognized by the Open Source Initiative", "completely free and not intended for any commercial usage", with "Powered by CheerpJ, a Leaning Technologies Java tool" and the logo visible. This **contradicts** the current docs (self-hosting needs a Commercial License); treat the current docs as authoritative.
- Pricing is not published in the docs. Warsha's legal note says "Commercial tiers begin at £100 per developer per month (teams up to 10)" citing cheerpj.com/licensing (third-party, unverified: `gh/Saad5400_warsha_HEAD_docs_legal_THIRD-PARTY.md` line 63). The same note says the published Customer License Agreement (Feb 2025) does not define the Community tier, so the free terms exist only as web prose that can change (lines 107-114, third-party reading).
- JavaFiddle's own code is Apache-2.0 (`javafiddle/LICENSE.txt`, `package.json` "license": "Apache-2.0"), so its integration patterns can be reused.

**Answers for Java Arena**

| Question | Answer | Confidence |
|---|---|---|
| Free for an individual's non-commercial educational website? | Yes, if the site is run by an individual (the "Individuals" category explicitly lists public-facing "educational applications"); also yes if the site is FOSS. Not automatically if a university/school operates it ("academic organisation": contact for a quote). | Verified from docs text; the definition of "individual" vs institution is the vendor's call |
| Attribution required? | Yes: "Give appropriate credits". The exact form is not defined; a visible "Powered by CheerpJ (Leaning Technologies)" credit with link is the safe reading. | Verified that credit is required; exact wording unverified |
| Self-hosting the runtime allowed? | No, not under the Community License. Requires a Commercial License. | Verified (docs) |
| Is the CDN mandatory? | Yes for free use: the unlimited use grant is "from the `cjrtnc.leaningtech.com` domain". | Verified (docs) |
| Usage limits? | "unlimited, unmetered use" from the CDN. | Verified (docs) |
| Our own assets (javac jar, launcher jar) | Not CheerpJ, so no CheerpJ restriction. OpenJDK javac is GPLv2 with Classpath Exception; take it from a Temurin/OpenJDK build (see section 4). | Likely |
| Privacy | The CDN necessarily sees visitor IP/user agent/referrer; Warsha flags this for its privacy notice. | Third-party reading (`THIRD-PARTY.md` lines 116-133) |

## 4. Running javac inside CheerpJ

### 4.1 What JavaFiddle does (official reference implementation)

From `javafiddle/src/lib/CheerpJ.svelte` and `src/app.html`:

- Loads `https://cjrtnc.leaningtech.com/4.3/loader.js`, calls `cheerpjInit({ status: 'none' })` (so Java 8, the default).
- Writes sources with `cheerpjAddStringFile('/str/' + file.path, bytes)`.
- Compiles with `cheerpjRunMain('com.sun.tools.javac.Main', '/app/tools.jar:/files/', ...sourceFiles, '-d', '/files/', '-Xlint')`, then if the exit code is 0 runs `cheerpjRunMain(mainClass, '/app/tools.jar:/files/')`.
- Output: `<pre id="console">`, with the comment "CheerpJ implicitly looks for a #console to write to" (`src/lib/repl/Output.svelte`). Compiler output is real javac text; `src/lib/repl/linter.ts` parses `^/str/([^:]+):(\d+): ([^:]+): ([^:]+)$` lines into editor diagnostics.
- `static/tools.jar`: **18,307,716 bytes**, 4994 entries, manifest `Created-By: 1.8.0_131 (Oracle Corporation)` (measured locally). The dataslope npm package `dataslope-tools-jar` ships a byte-identical copy (`cmp` verified), labelled "OpenJDK 8".

Note on provenance: the Temurin 8u482 `lib/tools.jar` (18,361,919 bytes) also says `Created-By: 1.7.0_261 (Oracle Corporation)` (measured), so the `Created-By` line only names the JDK that ran the `jar` tool and does not prove an Oracle binary. The provenance of JavaFiddle's jar is unknown; extract javac from a Temurin/OpenJDK build instead.

### 4.2 Which Java version can run javac

| Runtime | javac availability | Evidence |
|---|---|---|
| Java 8 | Works with an external `tools.jar` on the classpath (JavaFiddle, loopback, PurpleJ, dataslope all do this) | `javafiddle/src/lib/CheerpJ.svelte`; `gh/shwetankg07_loopback/SPIKE.md` line 45 |
| Java 11 / 17 | **No compiler in the image.** Probed: 42 boot modules including `java.compiler` and `jdk.zipfs` but no `jdk.compiler`; `ToolProvider.getSystemJavaCompiler()` returns null; `Class.forName("com.sun.tools.javac.Main")` throws `ClassNotFoundException`; `/lt/17/bin/javac` is 0 bytes; `/lt/17/lib` holds only `modules` (38 MB), `security/`, `tzdb.dat` | third-party: dataslope `tools-jar/JAVA-VERSION.md`; warsha `INTEGRATION.md` lines 16-20 |
| Java 11 / 17 with ECJ | Needs workarounds: ECJ fails with `invalid location for system libraries: /lt/17` (no `release` file) and `/lt/17/lib/jrt-fs.jar not exist`; Warsha and garagedocs work around it (fake `release` file under `/files/`, pre-seeded jrt filesystem or a copied `jrt-fs.jar`) | third-party: warsha `java-runtime-spike.md` section 11; garagedocs `README.md` "How Java 17 works in a browser" |

**Real javac on Java 11/17 looks feasible but is unverified on CheerpJ.** My local test (HotSpot, not CheerpJ): I extracted `jdk.compiler` classes from the Temurin jmods into a plain jar and ran `java --limit-modules java.base,java.compiler -cp javac17-min.jar com.sun.tools.javac.Main -cp <dir> -d <dir> Var.java Fidelity.java`: it compiled and the output ran (exit 0). Same for javac 11. Without an explicit `-cp`, javac tried to open its own jar from `java.class.path` and needed `jdk.zipfs` ("No file system provider is available to handle this file"); CheerpJ 17 does have `jdk.zipfs` (dataslope probe). javac 17 finds platform classes through `FileSystems.getFileSystem(URI.create("jrt:/"))` when the system home is the running JDK (`Locations.java` lines 1948-1963 in Temurin 17 `lib/src.zip`, `isCurrentPlatform` uses `Files.isSameFile`), and Warsha verified that exact call works on CheerpJ 17 ("50 modules", "20 521 class files", `java-runtime-spike.md` section 11.2). So javac does not need the missing `release`/`jrt-fs.jar` files. Do not use `--release N` (needs `lib/ct.sym`, absent).

### 4.3 Compiler jar sizes (measured locally)

| Jar | Contents | Bytes | gzip -9 |
|---|---|---|---|
| JavaFiddle `tools.jar` | whole JDK 8 tools.jar | 18,307,716 | 5,510,086 |
| Temurin 8u482 `lib/tools.jar` | whole | 18,361,919 | not measured |
| `javac8-min.jar` | `com/sun/tools/javac`, `com/sun/source`, `com/sun/tools/doclint` from Temurin 8u482 tools.jar (1219 classes) | **2,081,984** | 1,909,872 |
| `javac11-min.jar` | same packages from Temurin 11.0.30 `jdk.compiler.jmod` | **2,952,994** | not measured |
| `javac17-min.jar` | same packages from Temurin 17.0.16 `jdk.compiler.jmod` | **3,179,627** | 2,946,022 |
| `javac17.jar` | all of `jdk.compiler` minus `module-info` | 3,420,521 | 3,167,122 |
| ECJ 3.26.0 (Java 8 bytecode) | Eclipse compiler, EPL-2.0 | 3,133,846 | third-party (warsha spike section 8.3) |

All trimmed jars were tested on HotSpot: `javac8-min.jar` runs as `jre/bin/java -cp javac8-min.jar com.sun.tools.javac.Main` on a plain JRE 8, and the JSR-199 path `com.sun.tools.javac.api.JavacTool.create()` works from it with a `DiagnosticCollector` that yields line, column, message and a stable key such as `compiler.err.prob.found.req` (useful for friendly explanations). Also verified: javac 8 does not create a missing `-d` directory (`javac: directory not found`), javac 11+ does.

Note that CheerpJ reads `/app/` jars with HTTP Range in chunks, so only the parts of a jar that are touched are downloaded; the exact bytes fetched for javac have not been measured.

### 4.4 Compile and start times (all third-party, desktop Chrome; none measured here)

| Setup | Measurement | Source |
|---|---|---|
| Java 8, javac via `cheerpjRunMain` per compile (tools.jar) | first compile of a session 11.8 s cold; warm 3.0-4.4 s (8 files), 2.2-2.7 s (3 files) | warsha `java-runtime-spike.md` section 7 |
| Java 8, javac via `cheerpjRunMain` (tools.jar) | init ~1 s, harness compile 7 s cold, compile ~0.95 s warm, run ~0.35 s, 200k ints via BufferedReader 384 ms | loopback `SPIKE.md` line 51 |
| Java 17, ECJ in a resident compile server (one long-running `main`) | student compile warm 0.2-0.5 s; run phase ~10 ms; re-run unchanged 0.0-0.1 s; first visit ever Run to prompt ~12 s | warsha `INTEGRATION.md` lines 200-213 |
| Java 17, ECJ resident server | "first compile ~35 s, subsequent ones ~150 ms" | garagedocs `README.md` |
| `cheerpjInit` in a worker | Java 8: 1122 ms cold, 34-93 ms warm; warm Java 8/11/17: 43 / 164 / 161 ms | warsha spike sections 7 and 11.3 |
| JVM start to exit, empty `main`, settled | Java 8: 382-394 ms; 11: 653-738 ms; 17: 633-675 ms (first: 880 / 2117 / 2261 ms) | warsha spike section 11.3 |
| CPU work | 40M-iteration int loop 652 / 679 / 689 ms (8/11/17); 200k HashMap get/put 120 / 67 / 72 ms | same |
| Loading the compiler's own classes | identical ECJ bytes: 3.1 s on CheerpJ 8, 2.2 s on 11, ~12 s on 17 | warsha `INTEGRATION.md` lines 90-95 |

Key design facts behind these numbers (third-party, consistent across two projects): "Every `cheerpjRunMain` call gets a fresh classloader (a static set in one call reads `false` in the next)" (warsha `INTEGRATION.md` line 161), and "CheerpJ keeps no statics between `cheerpjRunMain` calls" (garagedocs README). So a warm compiler needs one long-running Java `main` that receives requests (async native or a polled `/str/` file). Library mode (`cheerpjRunLibrary("/app/javac.jar")` then calling a static compile helper from JS) might also keep javac warm; not tested by anyone I found.

## 5. First-visit download size

| Part | Size | Source / confidence |
|---|---|---|
| Engine: `loader.js` 7,521 B + `cj3.js` 666,055 B + `cj3.wasm` 372,758 B | **1,046,334 B** (decoded) | third-party measured, warsha `INTEGRATION.md` lines 517-520 |
| Runtime class library, fetched on demand in 128 KiB Range chunks | "typically **10-20MB** for many apps" | docs `11-guides/Startup-time-optimization.md` line 8 |
| Runtime bytes actually fetched | 18.7 MB (Java 8), 13.8 MB (11), 13.6 MB (17), decoded | third-party, warsha spike section 11.3 |
| Profiled chunk lists | Java 17 compile+run: ~8.8 MB of ranges, 8.1 MB of it from the 38 MB `/lt/17/lib/modules`; Java 8 PurpleJ preload: ~8.5 MB of `/lt/8/jre/lib/rt.jar` ranges | computed from garagedocs `src/lib/java-playground/cheerpjPreload.json` and PurpleJ `src/components/JavaRuntime.tsx` |
| javac | 2.1 MB (javac 8 trimmed) to 3.2 MB (javac 17 trimmed); 18.3 MB for an untrimmed tools.jar | measured locally (section 4.3) |
| **Estimated first visit total** | **roughly 12 to 23 MB** | my estimate from the rows above; compressed transfer size unknown (the CDN answers gzip/chunked without `content-length`, warsha `INTEGRATION.md` lines 473-482) |

`cheerpjInit({preloadResources, preloadProgress})` can fetch a profiled chunk list in parallel and report progress (`00-cheerpjInit.md` lines 91-123), which gives a real progress bar for the mobile-data prompt.

## 6. Running programs: API, stdin, output, exceptions

**APIs** (docs `12-reference/`): `cheerpjInit(options)` (once per page or worker: a second call throws "CheerpJ: Already initialized", third-party warsha spike section 6); `cheerpjRunMain(className, classPath, ...args): Promise<number>` resolves with the exit code; `cheerpjRunJar`; `cheerpjRunLibrary(classPath)` returns a `CJ3Library` for calling Java from JS (objects, static/instance methods, fields, exceptions as JS exceptions); `cheerpOSAddStringFile(path, string|Uint8Array)` writes to `/str/`; `cjFileBlob(path)` reads any mount; `natives: { Java_pkg_Class_method(lib, ...) }` implements Java `native` methods in JS, and such a function "returns a value or a Promise that resolves to a value" (`11-guides/implementing-native-methods.md`).

**stdin**: there is no stdin option in `cheerpjInit` (the options list in `00-cheerpjInit.md` has none; confirmed by warsha and lexuanbach). Two proven patterns:
1. Up-front input (what Java Arena needs): `cheerpOSAddStringFile("/str/stdin.txt", input)` and a prebuilt launcher that does `System.setIn(new FileInputStream("/str/stdin.txt"))` then calls the learner's `main` (third-party: loopback `spike/java.html`, lexuanbach `architecture.md` section "Java - CheerpJ 4.3").
2. Interactive input: an async JS native `readLine()` that CheerpJ awaits, so `Scanner` blocks until the page supplies a line; `read(byte[],off,len)` must be overridden to return only buffered bytes (third-party verified, warsha spike section 5).

**stdout/stderr capture**:
- Main thread: CheerpJ appends `System.out`/`System.err` to an element with `id="console"` (undocumented; JavaFiddle relies on it) with no stream separation; without such an element it writes to `console.log` (lexuanbach `architecture.md`).
- Worker (recommended): the launcher replaces `System.out`/`System.err` with `PrintStream`s backed by JS natives, giving real out/err separation (third-party verified, warsha). Warsha measured 2000 `println` in 203-614 ms with one native call per write; buffer Java-side when stdin is supplied up front. Alternative: write to `/files/stdout.txt` and read it with `cjFileBlob` (loopback).
- The compiler's own output bypasses redirected streams unless you call javac programmatically (JSR-199 with a `DiagnosticCollector`, or `com.sun.tools.javac.Main.compile(String[], PrintWriter)`), which is cleaner.

**Uncaught exceptions and stack traces** (third-party findings, important for the MOOC which teaches reading `at Program.main(Program.java:15)`):
- "`StackTraceElement.getFileName() == null` and `getLineNumber() == 0`", unchanged by `-g` and by `enableDebug` (warsha spike section 8.2; lexuanbach shows `at HelloAgain.main(Unknown Source)`). **No line numbers in stack traces.** An upstream issue, cheerpj-meta #162 "StackTraceElement#getFileName() returns null", is closed without a visible fix.
- "`ArithmeticException.getMessage()` is `null`, where a real JVM says `/ by zero`"; a bare `NullPointerException` (no helpful message) on 17 (warsha spike 8.2 and `INTEGRATION.md` lines 662-669). Warsha restores `/ by zero` by rule.
- Stack overflow: "Recursion 10000 already fails, and shows up as a bogus `ArithmeticException`" (loopback `SPIKE.md` line 53, Java 8).
- The thread that runs `cheerpjRunMain` is not named `main` ("Thread-0" in lexuanbach; warsha hardcodes `main`).
- Exit codes: warsha reports exit 1 on an uncaught exception; lexuanbach reports "Runtime exceptions still exit 0" with its launcher. Detect crashes in the launcher, not by exit code.
- `System.exit`: "`System.exit(0)` hangs the JVM" on the main thread (loopback, Java 8); in a worker `System.exit(3)` surfaced as exit code 3 but left the JVM unusable, so the worker was replaced (warsha `INTEGRATION.md` lines 735-738). Rewrite `System.exit` in the launcher or via source rewriting.

## 7. Killing runaway programs and time limits

- The loader exposes no terminate/interrupt API (warsha spike section 6 lists the whole surface). A busy loop never yields, so a Java watchdog thread cannot stop it (same source).
- On the main thread, `while(true) i++;` "hard-freezes the tab" (warsha spike section 6). A same-site iframe also froze the page; a cross-site iframe stayed responsive (loopback `SPIKE.md` lines 59-63), which GitHub Pages cannot easily provide.
- **Web Worker works**: official since 3.0rc2 ("Simply call `importScripts` from a worker to load CheerpJ", "Anything that requires DOM access (such as displaying a UI) is not supported in a worker", `labs/.../blog/cheerpj-3.0rc2.mdx` lines 75-91). On 4.3 it must be a **classic** worker, because `loader.js` defines `cheerpjInit` inside a block that only hoists in sloppy classic scripts (third-party, warsha `INTEGRATION.md` lines 294-299).
- `worker.terminate()` "killed the spinning JVM in 0.7 ms", respawn to ready 54 ms with warm HTTP cache (Java 8), ~0.6 s `cheerpjInit` on Java 17 (third-party, warsha spike section 6 and `INTEGRATION.md` line 142).
- Because a kill throws away the warm compiler, use **two workers**: a compile worker (resident javac) and a disposable run worker. Warsha verified "a second CheerpJ JVM in a second worker sees files the first wrote to `/files/`, live" (`INTEGRATION.md` lines 142-144); the cost is two resident JVMs, "a real question on a phone".
- Alternative without workers: rewrite loop bodies to call a guard (`Guard.tick()`) using the javac Tree API; 300M guarded iterations took 1.6 s (loopback `SPIKE.md` lines 67-72).

## 8. Virtual filesystem (file exercises)

From `labs/.../11-guides/filesystem.mdx` and `14-explanation/File-System-support.md`:

| Mount | Java | JS | Notes |
|---|---|---|---|
| `/app/` | read | read | HTTP filesystem mapped to the **web server root** (not the page folder); needs Range support |
| `/files/` | read/write | read (`cjFileBlob`) | IndexedDB, persistent; "the default mounting point for Java"; 4.3 adds `/files/uploads/` and `/files/downloads/` |
| `/str/` | read only | write (`cheerpOSAddStringFile`) | in memory, not persisted |

- The MOOC reads files by relative path (`new Scanner(Paths.get("file.txt"))`, found in `data/part-11/*`). The docs say relative names resolve under `/files/` ("You can also use "example.txt" since it defaults to the /files/ mount point", `filesystem.mdx` line 187). Since only Java can write `/files/`, the launcher should copy exercise files from `/str/` to `/files/` before `main` (Java can create directories there; warsha, dataslope).
- `/str/` is flat: `cheerpOSAddStringFile("/str/models/Person.java")` "succeeds" but Java cannot see it; staging directories under `/str/` fails with "CheerpOS: Directories are not supported" (third-party: warsha spike section 4, dataslope `JAVA-VERSION.md`).
- `/files/` persists across sessions, so stale `.class` files survive; use a fresh output directory per run (warsha spike section 4).
- For GitHub Pages project sites, `/app/` paths must include the repository path (`/app/<repo>/javac.jar`), a real bug hit by lexuanbach (`architecture.md` lines 18-24). Simpler: `fetch()` the jar yourself and `cheerpOSAddStringFile("/str/javac.jar", bytes)` (slidev-addon-java-runner and dataslope do this), which also avoids Range requests for our own assets and lets our service worker cache them normally.

## 9. Output fidelity versus OpenJDK

CheerpJ runs the OpenJDK class library of its Java version, so the build-time reference JDK must be **the same major version**. Local experiment (HotSpot; `jdks/src/Fidelity.java`, outputs in `jdks/fid8.txt`, `fid11.txt`, `fid17.txt`, `fid21.txt`):

| Behaviour | JDK 8 | JDK 11 / 17 | JDK 21 |
|---|---|---|---|
| `Double.toString(2e23)` | `1.9999999999999998E23` | same as 8 | `2.0E23` (changed in JDK 19) |
| `HashMap` of 10 String keys, seeded `Random(1234)`, `String.format`, `LocalDate`, `Math.sqrt` | identical across 8, 11, 17, 21 | | |
| `a[5]` on `new int[3]` | `ArrayIndexOutOfBoundsException: 5` | `Index 5 out of bounds for length 3` | same as 17 |
| `new ArrayList().get(2)` | `Index: 2, Size: 0` | `Index 2 out of bounds for length 0` | same |
| `(Integer) "x"` | `java.lang.String cannot be cast to java.lang.Integer` | `class java.lang.String cannot be cast to class java.lang.Integer (...)` | same |
| `s.length()` on null | bare `NullPointerException` | 11: bare; 17: helpful message `Cannot invoke "String.length()"...` | helpful |
| `"abc".substring(5)` | `String index out of range: -2` | 11: same as 8; 17: `begin 5, end 3, length 3` | `Range [5, 3) out of bounds for length 3` |

Implications: pick one Java version for runtime and build-time verification (for example Temurin 8 in CI if CheerpJ runs Java 8). On top of this, CheerpJ-specific differences reported by third parties (no line numbers, missing implicit exception messages, stack overflow shown as `ArithmeticException`, thread name) mean **exception output cannot match a real JDK byte for byte** without launcher-side rewriting. Unverified and worth a prototype test: VM-generated messages for array bounds and `ClassCastException`, last-digit results of `Math.pow/exp/log/sin` (HotSpot intrinsics versus CheerpJ), default `Locale` and charset (force `Locale.setDefault(Locale.US)` and UTF-8 streams in the launcher; `cheerpjInit` has a `javaProperties` option, but dataslope found it does not change `java.home`, so do not rely on it for everything).

javac diagnostics are real javac text. javac 8 and 17 wording differs in places (measured: `l.add(3)` on a `List<String>` gives "no suitable method found for add(int)" in javac 8, "incompatible types: int cannot be converted to String" in javac 17), so friendly-error rules should key on the diagnostic code (`compiler.err.*`) from the javac API.

## 10. GUI

- AWT/Swing: supported; the window manager converts Java windows "to a hierarchy of HTML elements and HTML5 canvases" (`14-explanation/architecture.mdx`). Needs `cheerpjCreateDisplay` and the main thread (no DOM in workers, 3.0rc2 blog).
- JavaFX: **not supported**. CheerpJ 4.0 lists "Support for JavaFX / SWT" under "What's next" ("We plan to compile all this code to WebAssembly", `blog/CJ-4-0.mdx` line 230); nothing in the 4.1 to 4.3 changelog. The MOOC's parts 13 and 14 use JavaFX (23 exercises in `/home/user/ref/mooc-outline.txt`), so those cannot run on CheerpJ.

## 11. Mobile (Android Chrome)

- Vendor claims: 4.0 and 4.1 "Improved mobile usability"; 4.3 adds long-press as hover and pointer improvements (`22-changelog.md`). A cheerpj.com article snippet (WebSearch) says "Android (Chrome) and iOS (Safari) devices can now enjoy excellent support for touchscreens, virtual keyboard, and resizing". These are about Swing UIs.
- **No measurement found of compile time, memory use or tab stability on phones.** Warsha lists memory as the main unverified risk ("a WASM JVM plus the compiler", "two resident JVMs ... a real question on a phone"). Treat mobile as unverified; test on a mid-range Android phone early.
- Mobile-data prompt: the runtime downloads start only when the page injects `loader.js` (or the worker calls `importScripts`) and calls `cheerpjInit`, so the site can defer both until consent.

## 12. Hosting constraints (GitHub Pages)

- No cross-origin isolation needed: the async-native design uses no `SharedArrayBuffer`; warsha ran it with `crossOriginIsolated === false`, and also under COEP `require-corp` because the CDN sends `access-control-allow-origin: *` and `cross-origin-resource-policy: cross-origin` (third-party measured, `INTEGRATION.md` lines 398-422).
- Range requests are required for `/app/` files: "the HTTP server hosting the Java application files must support "Range" headers"; Python's `http.server` does not (`11-guides/basic-server-setup.md`). GitHub Pages supports Range per warsha and lexuanbach (third-party; I could not reach github.io from here). lexuanbach runs CheerpJ 4.3 plus ECJ on GitHub Pages (`architecture.md` lines 14-24).
- Firefox can trigger "HTTP server returned compressed partial data" for compressed range responses of JS library files (`basic-server-setup.md` lines 39-45; cheerpj-meta issue #221 open).
- `file://` does not work: "if it starts with file:// CheerpJ will not work. You need to use a local web server during testing" (`20-faq.md` line 49). `http://localhost` with `npx serve` or `npx http-server` is documented as working (`basic-server-setup.md`).
- 404/403 console errors are expected ("CheerpJ will correctly interpret 404 errors as a file not found condition", `20-faq.md` line 43); warsha counted ~38 probe errors per session.

## 13. Offline use and service worker caching

Technical view:
- CDN responses carry `access-control-allow-origin: *` and `cache-control` with `max-age=31536000` (third-party measured, warsha `INTEGRATION.md` lines 410-411 and 519-520), so a service worker can fetch them in CORS mode and read the bodies.
- But the runtime is read in 128 KiB Range chunks (chunk offsets in the preload lists are multiples of 131072). The Cache Storage API cannot store `206 Partial Content` responses, so a service worker would have to store chunks under synthetic keys (or whole files) and synthesize 206 responses. Which chunks are needed depends on which classes a program touches, so full offline coverage means prefetching whole runtime files (the Java 17 `modules` file alone is 38 MB per dataslope) or a profiled set with a risk of misses. This is my analysis; nobody I found has built it.
- Our own assets (javac jar, launcher jar, lesson files) can be cached normally, especially if loaded with `fetch` and passed via `/str/`.

Licence view:
- The free grant covers use "from the `cjrtnc.leaningtech.com` domain"; self-hosting, including air-gapped use, needs a Commercial License (section 3). Whether storing CDN responses in the visitor's Cache Storage counts as self-hosting is **not addressed** in any text I found. Warsha's reading: "Mirroring, vendoring, proxying, or caching the runtime onto our own hosting would breach the free tier" and "true offline/PWA use is off the table"; garagedocs' offline PWA "never caches external websites or CheerpJ" (`docs/offline.md`). cheerpj-meta issue #219 "Support Offline Mode + LocalHost" (June 2025) was closed with no visible answer.
- Practical outcome: ordinary browser HTTP caching (1-year max-age) will often let a returning visitor run Java while offline, but it is not guaranteed (eviction, chunks never fetched before). **Offline Java is not reliably available under the Community License** unless Leaning Technologies confirms in writing that client-side caching is fine, or a commercial licence is bought.

## 14. CI verification with the exact browser runtime

- **Node**: no CheerpJ package or Node build exists (`npm view cheerpj` and `npm view @leaningtech/cheerpj` both 404, verified; Leaning Technologies publishes only `@leaningtech/cheerpx` and `@leaningtech/browserpod` on npm). The docs require an http(s) page. So the C/C++ Arena approach ("browsercc Clang in Node") has no CheerpJ equivalent.
- **Headless Chromium** works: warsha runs a 51-assertion harness and `tools/qa/verify-java.mjs` in "Chrome 150 headless/Linux" (`INTEGRATION.md` lines 829-830). Plan: build the site, serve `dist/` with a Range-capable server (`vite preview` answered `206 Partial Content`, warsha lines 385-387; or `npx http-server`), open a hidden verification page in Playwright Chromium that compiles and runs every lesson program in the same worker code the site uses, and diff against expected outputs produced by a real JDK of the same major version.
- Throughput estimate (mine, from third-party per-run numbers): with a resident compiler, ~0.3 to 1 s per program, so a few hundred programs in roughly 3 to 10 minutes; with one `cheerpjRunMain` per compile (javac reloaded each time), 2 to 4 s per program.
- CI needs network access to `cjrtnc.leaningtech.com` (a runtime dependency on a third-party CDN during builds). This cloud environment blocks that host (verified: CONNECT 403), so the prototype and CI must run on GitHub Actions or with the host allowed.

## 15. Maintenance status

- Active vendor: releases 3.0 (Feb 2024), 3.1 (Feb 2025), 4.0, 4.1, 4.2 (Apr to Jun 2025), 4.3 (Apr 21, 2026) (`22-changelog.md`); docs repo committed on 2026-09-28; JavaFiddle repo last commit 2026-06-05; cheerpj-meta issue #232 closed 2026-09-28 (GitHub issues page via WebFetch). The gap between 4.2 and 4.3 was 10 months, and 5.0 announced for "late 2025" (`CJ-4-0.mdx` line 225) has not shipped.
- Closed source runtime; the issue tracker is small (the issues page listed 3 open and 11 closed issues on the first page).
- The versioned loader path (`/4.3/`) pins behaviour, but availability of old versions on the CDN over years is not promised anywhere I found.

## 16. Risks and open questions (prototype checklist)

1. Licence: confirm with Leaning Technologies (a) that the operator counts as an "individual", (b) the credit wording, (c) whether Cache Storage caching of CDN files for offline use is allowed.
2. Line numbers in stack traces: missing (two independent reports). Decide whether lessons that teach `Program.java:15` can live with that, or prototype line tracking via javac Tree API instrumentation (cost unknown).
3. Implicit exception messages and `StackOverflowError`: measure on CheerpJ 8 for AIOOBE, NPE, CCE, `/ by zero`, deep recursion.
4. javac 11/17 extracted jar on CheerpJ 11/17: test (feasible on HotSpot, unverified on CheerpJ).
5. Android: compile time, memory, and tab survival with one and two JVM workers.
6. Offline: build a small service worker that caches CheerpJ chunks (only if the licence question is answered yes).
7. `Math` function last digits, default locale and charset versus the build-time JDK.
8. CDN availability and speed from CI; flakiness budget.

## 17. Suggested integration shape (if CheerpJ is chosen)

- Java 8 runtime (default, fastest to start per warsha 11.3, matches MOOC sample messages), javac from Temurin 8 `tools.jar` trimmed to 2.1 MB, reference outputs generated with Temurin 8 in CI.
- Classic compile worker: `importScripts(loader)`, `cheerpjInit({version: 8, status: "none", natives})`, one resident Java main that compiles with `JavacTool` into a fresh `/files/run-N/` and returns diagnostics through a native.
- Classic run worker per run (or reused until killed): launcher sets `System.in` from `/str/stdin.txt`, native-backed buffered `System.out/err`, `Locale.US`, copies exercise files into `/files/`, catches `System.exit` and uncaught exceptions, prints a filtered trace. Page-side timer calls `worker.terminate()` after the time limit and respawns.
- Defer `loader.js` until the mobile-data consent; use `preloadResources` + `preloadProgress` for a progress bar; show the CheerpJ credit.

## Sources

Local clones and files (all under `/home/user/ref/research/rt-cheerpj/`):
- `labs/sites/cheerpj/src/content/docs/23-licensing.md`, `20-faq.md`, `22-changelog.md`, `12-reference/00-cheerpjInit.md`, `01-cheerpjRunMain.md`, `03-cheerpjRunLibrary.md`, `20-cjFileBlob.md`, `21-cheerpOSAddStringFile.md`, `40-CJ3Library.md`, `11-guides/filesystem.mdx`, `library-mode.md`, `implementing-native-methods.md`, `basic-server-setup.md`, `Startup-time-optimization.md`, `14-explanation/File-System-support.md`, `architecture.mdx` (leaningtech/labs commit 2218f66)
- `labs/sites/labs/src/content/blog/CJ-4-3.mdx`, `CJ-4-0.mdx`, `cheerpj-3.0rc2.mdx`, `cheerpj-3-deep-dive.mdx`, `labs/sites/labs/src/content/showcase/javafiddle.md`
- `javafiddle/src/lib/CheerpJ.svelte`, `src/app.html`, `src/lib/repl/Output.svelte`, `src/lib/repl/linter.ts`, `static/tools.jar`, `LICENSE.txt` (leaningtech/javafiddle commit 741b8ab)
- `cheerpj-meta/README.md` (commit 2fd8033)
- `gh/Saad5400_warsha_HEAD_docs_engineering_java-runtime-spike.md`, `gh/Saad5400_warsha_HEAD_runtimes_java_INTEGRATION.md`, `gh/Saad5400_warsha_HEAD_docs_legal_THIRD-PARTY.md` (github.com/Saad5400/warsha)
- `gh/dataslope_dataslope/tools-jar/JAVA-VERSION.md`, `tools-jar/README.md`, `THIRD-PARTY-NOTICES.md`, `app/_components/runtime/cheerpj.ts` (github.com/dataslope/dataslope)
- `gh/shwetankg07_loopback/SPIKE.md`, `gh/shwetankg07_loopback_HEAD_spike_java.html` (github.com/shwetankg07/loopback)
- `gh/frc4451_garagedocs/README.md`, `docs/offline.md`, `src/lib/java-playground/cheerpjPreload.json`, `gh/frc4451_garagedocs_HEAD_scripts_java_JpServer.java` (github.com/frc4451/garagedocs)
- `gh/lexuanbach_41039_HEAD_architecture.md`, `gh/lexuanbach_41039_HEAD_assets_runtime.js` (github.com/lexuanbach/41039)
- `gh/Entkenntnis_PurpleJ_HEAD_src_components_JavaRuntime.tsx`, `gh/gangdol2012_Codin_HEAD_src_java-runner.worker.ts`
- `npm/slidev-addon-java-runner-0.1.1/package/setup/code-runners.ts` (npm package slidev-addon-java-runner 0.1.1)
- Local experiments: `jdks/javac8-min.jar`, `javac11-min.jar`, `javac17-min.jar`, `javac17.jar`, `jdks/src/*.java`, `jdks/fid8.txt`, `fid11.txt`, `fid17.txt`, `fid21.txt`, `jdks/Locations17.java` (from Temurin 17.0.16 `lib/src.zip`)

Web (WebSearch snippets or WebFetch of github.com):
- https://cheerpj.com/docs/licensing , https://cheerpj.com/licensing/ , https://cheerpj.com/faqs/ , https://leaningtech.com/cheerpj-non-commercial-licence/ , https://cheerpj.com/customer-license-agreement-february-2025/ (snippets only)
- https://github.com/leaningtech/cheerpj-meta/issues (issues #84, #138, #162, #219, #221, #232)
- https://github.com/ctnelson1997/_tutor/issues/11
