# Fact-check of the in-browser Java recommendation (adversarial)

Date: 2026-09-28. Target: `/home/user/ref/research/runtime-judgment.md` (hybrid of teavm-javac as compiler plus a forked Ristretto JDK 21 runner; CheerpJ 4.3 as runner-up) and its inputs `rt-teavm.md`, `rt-others.md`, `rt-cheerpj.md`.
Scratch files: `/home/user/ref/research/runtime-factcheck/` (`cf/` literal tests, `rist/` Ristretto runs, `mf/` Math runs, `labs/` fresh CheerpJ docs clone).
Method: every claim below was re-checked against a primary source (licence file, source code, registry API, fresh clone) or re-run locally. "Measured" means I ran it in this container (Node 22.22.2, headless Chromium from `/opt/pw-browsers` via Playwright, HotSpot 21.0.10, OpenJDK 25.0.4.1 from `rt-teavm/jdk25`).

## Summary

The recommendation holds up on licences, self-hosting, maintenance data, sizes and compile speed. Two things need correcting:

1. **"Ristretto JDK 21 is byte-identical to HotSpot 21" was true only for the one 18-line test program.** My wider program found three VM-level gaps in the same playground build (main `8448588`):
   - no `ArrayStoreException`: the interpreter's `aastore` has a `// TODO: validate object type is compatible with array type` (`rt-others/clones/ristretto/ristretto_vm/src/instruction/object.rs` line 252);
   - the `ClassCastException` message is missing HotSpot's `(... are in module java.base of loader 'bootstrap')` suffix;
   - `Files.writeString` (NIO) never returned within 80 s, while java.io file I/O worked.

   The NIO problem hits MOOC part 11 file exercises (`Files.lines`, `new Scanner(Paths.get(...))`). All other lines matched.
2. **The compiler half misparses some floating-point literals.** This is broader than the "16777217f and subnormals" note in the judgment, and the "constant folding" item that was an untested inference is now confirmed.
   - `1e23` compiles to the wrong double.
   - Hex float literals compile to NaN.
   - `Float.MIN_NORMAL` written as a literal is rejected.
   - About 0.3% of 16-17-digit literals are 1 ulp off.
   - Folding `"x" + 5e-324` gives HotSpot-different text.

   Short course-style literals were all correct (0 failures).

One of the judgment's "unverified ideas" is now verified. `-XX:+UnlockDiagnosticVMOptions -XX:-UseLibmIntrinsic` makes HotSpot 21 `Math` output identical to `StrictMath`, and so to Ristretto, on all 408 lines of `MathFid`.

## Claims checked

### C1. Ristretto is MIT OR Apache-2.0 and may be self-hosted. CONFIRMED
- `LICENSE-MIT` and `LICENSE-APACHE` are at the repo root. The README "License" section (line 128ff) says "Licensed under either of Apache License, Version 2.0 ... MIT license". `Cargo.toml` line 43 has `license = "Apache-2.0 OR MIT"` (`rt-others/clones/ristretto`, commit `8448588`).
- The crates.io API lists `ristretto_vm` 0.34.0 with licence `Apache-2.0 OR MIT` (https://crates.io/api/v1/crates/ristretto_vm, fetched 2026-09-28).
- `web/package.json` is `"private": true` with no separate licence, so the root licence covers the web runner.

### C2. The JDK 21 image is Corretto 21.0.12 under GPLv2 with the Classpath Exception, and the legal files ship with it. CONFIRMED, with a nuance
- `web/jdks.json` pins Corretto `21.0.12.12.1` with a sha256.
- The shipped `1ba0017da5738949-jdk-21.zip` has `release` `JAVA_VERSION="21.0.12.1"` and `legal/java.base/LICENSE` (GPLv2, with `"CLASSPATH" EXCEPTION TO THE GPL` at line 326) plus `ASSEMBLY_EXCEPTION`. Checked with `unzip -l` and `unzip -p`.
- Nuance: the image also contains `jdk.compiler`, `jdk.jshell`, `jdk.jdi` and more (the `release` MODULES line). A runner-only image can be trimmed, which supports the judgment's "jlink java.base" mitigation. The trimmed size was not measured.

### C3. teavm-javac is Apache-2.0. CONFIRMED, with a nuance
- The repo has **no LICENSE file**. `LICENSE`, `LICENSE.txt`, `LICENSE.md` and `COPYING` all return 404 on raw.githubusercontent.com at master `2ddcf02`, and none is in the full clone.
- The grant rests on README lines 279-289 ("licensed under the Apache License 2.0", added 2025-06-15) and on Apache headers in all 50 of 50 `.java` files (grep).
- Consequence: the site must ship the Apache-2.0 text itself. TeaVM's own `LICENSE` (Apache-2.0) and `NOTICE` (Alexey Andreev, ASF, Joda.org) are confirmed in `rt-teavm/teavm`.

### C4. Versions and maintenance. CONFIRMED
| Item | Checked value | Source |
|---|---|---|
| Ristretto 0.34.0 | published 2026-09-27T16:10Z; 0.33.0 2026-08-19; 19,715 downloads | crates.io API |
| Ristretto bus factor | 221 of 227 commits in the shallow clone by Brian Heineman (3 spellings) | `git log` in `clones/ristretto` |
| teavm-javac | 59 commits, HEAD `2ddcf02` 2026-09-04, pins TeaVM 0.13.1 | full clone, `gradle/libs.versions.toml`, `git ls-remote` |
| TeaVM 0.15.0 | tag exists; `teavm-core-0.15.0.pom` Last-Modified 2026-06-14; 0.13.1 on 2026-02-21 | repo1.maven.org |
| b-jvm | MIT, last commit `3fd56c7` 2025-04-10, which is still upstream HEAD | `git ls-remote https://github.com/anematode/b-jvm` |
| TraceJVM | npm 0.4.1, `AGPL-3.0-only`, modified 2026-08-10 | `npm view @tracecode/tracejvm` |
| CheerpJ 4.3 | 2026-04-21; Java 8, 11 and 17 only | fresh clone of leaningtech/labs `2218f66`, `22-changelog.md`, `00-cheerpjInit.md` line 53 |

### C5. CheerpJ free tier: credit required, CDN only, self-hosting needs a Commercial License. CONFIRMED
In a fresh clone of leaningtech/labs `2218f66`, `sites/cheerpj/src/content/docs/23-licensing.md` says:
- line 15: "educational applications";
- lines 22-24: "Give appropriate credits";
- line 27: "unlimited, unmetered use of CheerpJ from the `cjrtnc.leaningtech.com` domain";
- line 68: "If you wish to self-host CheerpJ, you will need a Commercial License".

Whether storing CDN responses in a visitor's Cache Storage counts as self-hosting: **UNCERTAIN**. No text I found addresses it.

### C6. Offline works for the hybrid: the Ristretto playground caches in Cache Storage with SHA-256. CONFIRMED
- `web/shared/runtime.ts` calls `caches.open`, `cache.match`, then `crypto.subtle.digest('SHA-256')`, compares size and hash, and `cache.put`s (lines 40-90).
- `web/shared/protocol.ts` line 54 has `RUN_TIMEOUT = 30_000`. `playground/main.ts` calls `worker.terminate()` in `finish()` (line 237) and arms that timeout per phase (line 321).
- stdin is `io::empty()` at `web/runner/src/lib.rs` line 141, as the judgment says.

### C7. Ristretto JDK 21 output is byte-identical to HotSpot 21 (HashMap order, Double.toString, format, Random, exception messages, helpful NPE). PARTLY REFUTED
- **Reproduced:** `r21.json` stdout equals `NoIn.21.out` exactly (`diff` clean, 18 lines), and the stderr NPE text is identical.
- **Wider test (measured):** `rist/Fid2.java` was run in Chromium through the playground worker (`rist/run2.mjs`) against HotSpot 21.0.10 with UTF-8. The following all matched byte for byte:
  - `Random(42)`: 10 `nextInt(10)` calls, then `nextDouble`, `nextBoolean`, `nextGaussian`, `nextLong`, `nextFloat` and `nextInt`;
  - `Collections.shuffle(Random(7))`;
  - `%.0f` of 2.5 and 3.5, `%.1f` of 1.05, `%.2f` of 2.675, `%e`, `%,d`, `%x`, `%n`;
  - `Double.MIN_VALUE`, `Float.MIN_VALUE`, 1e23 and 2e23;
  - `Math.round(-2.5)` and `Math.rint(2.5)`;
  - a 14-key HashMap with Finnish/Swedish keys, an Integer-key HashMap and a HashSet;
  - `groupingBy`, `Optional`, record and `Enum.compareTo`, overflow and casts;
  - the messages for SIOOBE, NSEE, UOE, NFE (twice), NegativeArraySize and InputMismatch;
  - a caught StackOverflowError (depth 21,841 in 378 ms).
- **Differences:**
  1. `ClassCastException`. Ristretto prints `class java.lang.String cannot be cast to class java.lang.Integer`. HotSpot adds ` (java.lang.String and java.lang.Integer are in module java.base of loader 'bootstrap')`. The message template is `ristretto_types/src/java_error.rs` line 50.
  2. `Object[] oa = new String[1]; oa[0] = 1;` throws **no ArrayStoreException** on Ristretto; it printed `no ASE, oa[0]=1` (`rist/r21-fid4.json`). The interpreter source has `// TODO: validate object type is compatible with array type` in `aastore` (`ristretto_vm/src/instruction/object.rs` line 252). Only the JIT helper checks it, and the browser runner sets `.interpreted(true)` (`web/runner/src/lib.rs` line 140).
  3. NIO file I/O: `Files.writeString(Paths.get("/tmp/y.txt"), ...)` did not return within 80 s (`rist/r21-fid5.json`: output stops after "D path /tmp/y.txt"). Before that, `FileWriter`/`FileReader` on `/tmp` worked. A retry with a 500 s budget ended with no output, because the outer shell timeout closed the browser first. The cause is unknown: a hang or an extremely slow path. Ristretto has native NIO tests (`tests/file/nio/*`), so this may be specific to the WASI build.
- Verdict: G2 as written ("29/29 byte-identical") would fail today on programs 23 (CCE text) and 26 (Files). A fix or workaround in the fork is needed. The ArrayStore fix is small; the NIO fix is unknown.

### C8. Ristretto `Math` equals StrictMath, and HotSpot x86 `Math` differs in 134/400 lines. CONFIRMED; the mitigation idea is VERIFIED
- I re-ran `MathFid`/`MathFidS` on HotSpot 21.0.10: 134 lines differ. Ristretto's saved output (`rmf.json`, identical to `mathfid/rist21.out`) equals StrictMath except two lines that differ only because of my shell encoding.
- New: `java -XX:+UnlockDiagnosticVMOptions -XX:-UseLibmIntrinsic MathFid` gives 0 differing lines against StrictMath. `-Xint` alone still gives 134. This is measured on this x86-64 host only; other CPUs are unverified.

### C9. The Wasm javac mis-parses some numeric literals (judgment risk 4). CONFIRMED AND BROADER
The test compiled `cf/CF.java` with upstream teavm-javac `compiler.wasm` (TeaVM 0.13.1) in Node, ran the resulting class on HotSpot 25, and diffed against class files from the javac 25 CLI (`cf/hotspot.out` vs `cf/wasmjavac.out`).

- `16777217f` compiles to bits `1266679809` instead of `1266679808` (confirms the judgment).
- **New:** the literal `1e23` compiles to the next double up. At run time, `double x = 1e23` prints `1.0000000000000001E23`; HotSpot javac gives `1.0E23`.
- **New:** `1.00000000000000011102230246251565404236316680908203125` (a round-half-even case) is 1 ulp off.
- **New:** `0x1.fffffffffffffp-1` compiles to NaN (`9221120237041090560`).
- **New:** `1.17549435E-38f`, which is `Float.MIN_NORMAL` and a normal float, is rejected with "floating-point number too small".
- **New, confirming the judgment's inference:** constant folding uses TeaVM's `Double.toString`. `"c13 " + 5e-324` is folded to `4.940656458412465E-324` (HotSpot `4.9E-324`), and `9.999999999999999e22` is folded to `9.999999999999999E22` (HotSpot `1.0E23`).
- **Random sweep:** 3,018 double and 2,005 float literals (`cf/Lits.java`). 9 doubles (all 16-17 significant digits) and 1 float (8 digits) came out 1 ulp off. All 23 short course-style literals (0.1, 2.5, 19.99, 1.05, 4.35, 2.675 ...) were correct.
- The TeaVM 0.15.0 build (`build/teavm-javac-015`) gives the same diff.

wasm-oj's README says it applied an upstream TeaVM float-parser fix (`c209dd4`, `TDouble.java`; `rt-teavm/forge/tools/java-client/README.md`). Its effect was not tested.

### C10. "TraceJVM already ships this exact architecture (teavm-javac against a real JDK image)". CONFIRMED, with a nuance
- TraceJVM's worker calls `setSdk(compile-classlib-teavm.bin)` (the TeaVM stubs) **and then** `addPlatformJarFile(jdk23.jar)`.
- `addPlatformJarFile` is not in upstream teavm-javac; `Compiler.java` has only `setSdk`, which reads TeaVM's own ArchiveReader format. It comes from TraceJVM's 17-line patch `compiler/teavm-javac/patches/0003-platform-archive.patch`, which overwrites the stub entries in `sdkFiles` with real JDK classes.
- TraceJVM also patches the javac build to use jdk23u (`0001-configurable-jdk-build.patch`).
- So the architecture is proven, but it needs that patch (or an ArchiveWriter-format SDK) and a javac rebuild. It does not work on stock teavm-javac.

### C11. wasm-oj built teavm-javac with OpenJDK 21 javac at commit `890adb6...`. CONFIRMED
- `rt-teavm/forge/tools/java-client/README.md` line 25 names the commit.
- A `git fetch` of that SHA from github.com/openjdk/jdk21u gives a 2023-08-09 commit tagged `jdk-21+35` and `jdk-21-ga` (`git ls-remote --tags`).
- Nuance: that is javac 21 GA, while the runner's library is 21.0.12. Diagnostic wording may differ in rare cases (unverified).

### C12. Sizes. CONFIRMED (one minor discrepancy)
- `compiler.wasm`: 4,299,338 B; GNU `gzip -9` gives 1,644,798 B (exact match).
- `jdk-21.zip`: 14,766,513 B (match).
- `runner.core.wasm`: 7,627,823 B raw; my `gzip -9` gives **1,889,302 B**, against the reported 1,896,806 B. That is 0.4% lower and immaterial.
- The 19-23 MB total remains an estimate.

### C13. Compile speed of the Wasm javac is in the tens of milliseconds. CONFIRMED (Node)
- `cf/timing.mjs` compiled `NoIn.java` in Node 22 with no flags: ready in 291 ms, first compile 200 ms, then 48-89 ms.
- This used the TeaVM stub SDK. With a real JDK SDK, the TraceJVM figures (79-277 ms) are the better proxy; I did not re-run them.

### C14. Runaway programs can be killed with Worker.terminate. CONFIRMED for feasibility; latency UNCERTAIN
- In my runs, the Ristretto worker stuck in NIO was terminated at the page timer. `terminate()` returned in 0.1-0.3 ms and the harness closed normally.
- Time until the worker actually dies, and time to the next ready run, were not measured for Ristretto.

### C15. CheerpJ loses stack-trace line numbers and the `/ by zero` message. UNCERTAIN (third-party only)
- The quote exists in `rt-cheerpj/gh/Saad5400_warsha_HEAD_docs_engineering_java-runtime-spike.md` lines 460-466.
- cheerpj-meta issue #162 could not be read: GitHub API access to that repo is not enabled here, and the CheerpJ CDN is blocked. Not independently confirmed.

### C16. Java 21 is sufficient and the MOOC needs only Java 8-11 features. Not re-checked
This was out of scope for runtime facts, and the reports cite grep counts. Left as is.

## Required changes to the recommendation
1. Rationale item 1 and the table's "Best measured" cell should say "byte-identical on the tested 18-line program". Add the known gaps: CCE message suffix, no ArrayStoreException, NIO `Files` not completing in the browser build.
2. Add to the prototype:
   - a fork fix for `aastore` type checking;
   - a CCE message fix;
   - an investigation of NIO in the WASI build, because MOOC part 11 depends on it.

   Until NIO works, gate G2 cannot pass on suite program 26.
3. Replace risk 4's "inference, untested" with the measured findings in C9. Also consider pinning the compiler's `Double`/`Float` parsing and `toString` to OpenJDK code, for example by porting the fix wasm-oj names.
4. Replace the "unverified idea" in risk 5 with the verified flag, `-XX:+UnlockDiagnosticVMOptions -XX:-UseLibmIntrinsic`.
5. Note that teavm-javac has no LICENSE file, so the site must ship the Apache-2.0 text itself. Also note that feeding a real java.base needs TraceJVM's `addPlatformJarFile`-style patch.
