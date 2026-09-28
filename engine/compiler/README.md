# Java Arena compiler: javac 21 in WebAssembly

This folder builds the compiler half of Java Arena's in-browser Java engine:

- **javac.wasm**: the real OpenJDK javac from `openjdk/jdk21u` tag `jdk-21.0.10+7`, compiled to a WebAssembly GC module by TeaVM 0.13.1 through teavm-javac. TeaVM only runs javac here. The learner's program is not translated by TeaVM: javac's `.class` files go to the runner (Ristretto).
- **java-base-sdk.bin**: the platform classes javac compiles against. It is the whole `java.base` module of the reference JDK (OpenJDK 21.0.10, Ubuntu package `openjdk-21-jdk-headless 21.0.10+7-1~24.04`), with method bodies removed.
- **javac-host.mjs**: a plain ES module that loads both files and exposes `compile(files)`. It runs in a browser module Worker and in Node 22.

`build.sh` writes the built files to `engine/dist/compiler/`, together with `manifest.json` (size, gzip -9 size and SHA-256 of each file, plus the pinned sources) and `licenses/`.

## Use

```js
import { createJavac } from './javac-host.mjs';   // from engine/dist/compiler/

const javac = await createJavac({
  wasm: fetch('javac.wasm'),          // URL, bytes, Response, or a Promise of one
  sdk: fetch('java-base-sdk.bin'),
});
const r = javac.compile([
  { path: 'Main.java', text: mainSource },
  { path: 'shop/Item.java', text: itemSource },
]);
// r.success, r.classes [{ path: 'shop/Item.class', bytes }], r.diagnostics, r.output
```

Each diagnostic has `kind` (`error`, `warning` or `note`), `code` (the javac key, such as `compiler.err.expected`), `file`, `line`, `column`, character offsets, `message` (javac's text) and `formatted`. `formatted` is exactly what `javac -d out <files>` prints for that diagnostic, for example `Main.java:3: error: ';' expected` followed by the source line and the caret line. `r.output` is javac's complete output for the compile, including notes and the `1 error` line. Each `compile()` is a fresh javac run with javac's default options (the same as the command line, so `-g:source,lines`), and the instance can be reused for any number of compiles. The full API is documented at the top of `javac-host.mjs`.

## Rebuild

```sh
engine/compiler/build.sh            # add --clean to start from nothing, --test to run the tests
```

Requirements: the reference JDK 21 at `/usr/lib/jvm/java-21-openjdk-amd64` (set `ARENA_JDK` to use another; it must have `jmods/`), git, curl, Node 22. The script uses JDK 21 for everything. It does not need JDK 25: switching from javac 25 to javac 21 also let the Gradle build target Java 21.

The script clones and builds under `/home/user/build/compiler` (set `ARENA_COMPILER_WORK`), including Gradle's home. The steps are:

1. **Sources.** It makes a shallow, sparse git clone of `openjdk/jdk21u` at the tag with only the directories javac needs. It also fetches teavm-javac at the pinned commit.
2. **Patches.** It applies `patches/teavm-javac.patch` and `patches/jdk21u-javac.patch`, and copies in `java/` (the wrapper) and `javac-src/` (helpers compiled into javac).
3. **Generated JDK code.** It copies JDK 21's `jdk.internal.math` into the package `javaarena.jdk`, with the small edits listed in `build.sh`. It then runs `tools/GenJdkChars.java` on the reference JDK to generate `JdkChars`.
4. **Gradle and TeaVM.** The Gradle wrapper (9.1.0, from services.gradle.org) builds javac and runs TeaVM (Wasm GC target, the teavm-javac settings). Dependencies come from Maven Central and the Gradle plugin portal.
5. **SDK.** `sdk-tool/SdkTool.java` (plain javac plus ASM 9.8 from Maven Central, SHA-256 checked) builds `java-base-sdk.bin` from `java.base.jmod`.
6. **Licenses.** It fetches the TeaVM and jzlib license texts (sparse git clones at their tags) and copies the OpenJDK license.
7. **dist.** It copies the files to `dist/compiler/` and writes `manifest.json`.

Measured on this machine (4 CPUs, parallel builds limited to 2 workers):

- `build.sh --clean` took 95 s, 83 s of it Gradle and TeaVM (including the Gradle and Maven downloads).
- An incremental rebuild takes 30 to 60 s.
- Two builds, one of them from a clean work directory, produced a byte-identical `javac.wasm` (same SHA-256). `java-base-sdk.bin` is written with a fixed gzip header, so it is reproducible for a given JDK.

Network hosts used: github.com (git), services.gradle.org, repo1.maven.org / repo.maven.apache.org, plugins.gradle.org. The unreachable teavm.org repository is removed from the build.

## Pinned sources

| Component | Source | Version | License |
|---|---|---|---|
| javac | https://github.com/openjdk/jdk21u | tag `jdk-21.0.10+7` = commit `97a3d2372d457c5a72413df14bf08cf99545c695` (same commit as `jdk-21.0.10-ga`) | GPL-2.0 with Classpath Exception |
| teavm-javac | https://github.com/konsoletyper/teavm-javac | commit `2ddcf02e4983e5c74d45b945c2fd41a829358828` | Apache-2.0 (stated in its README; the repo has no LICENSE file) |
| TeaVM | Maven Central `org.teavm:*:0.13.1`, https://github.com/konsoletyper/teavm | tag `0.13.1` = commit `b3a245b7d9034ff35cdfab2def057a3d4f256efb` | Apache-2.0 |
| jzlib (inside TeaVM's java.util.zip) | Maven Central `com.jcraft:jzlib:1.1.3`, https://github.com/ymnk/jzlib | tag `1.1.3` | BSD-style |
| java.base classes | the reference JDK's `jmods/java.base.jmod` | OpenJDK 21.0.10, Ubuntu `openjdk-21-jdk-headless 21.0.10+7-1~24.04` (source: Ubuntu source package `openjdk-21` of that version) | GPL-2.0 with Classpath Exception |
| ASM (build tool only, not shipped) | Maven Central `org.ow2.asm:asm:9.8` | SHA-256 `876eab6a...22051` | BSD-3-Clause |
| Gradle wrapper | teavm-javac's `gradle-wrapper.properties` | 9.1.0 | Apache-2.0 |

## Patches and why

`patches/teavm-javac.patch` (build only):
- Removes the `teavm.org` repository and the Node.js ivy repository, and drops the `ui` project. It sets Java 21 instead of 25.
- `javac/build.gradle` takes the OpenJDK sources from the local jdk21u checkout (`-Pjdk.sourceDir`) instead of downloading a GitHub archive. It adds the generated source folder, and skips `module-info.java` and the unused `javacserver` tool.
- `compiler/build.gradle` makes `javaarena.javac.JavacExports` the TeaVM entry point. Since `generateWebAssembly` (TeaVM compiling in the browser) is never used, TeaVM's own compiler becomes unreachable and is left out. This shrank `javac.wasm` from 4,284,516 bytes (1,649,224 gzip -9) to 2,712,107 bytes (1,042,272 gzip -9). That was measured by building the same sources with the upstream entry point `org.teavm.javac.CompilerLib`.
- `Patches.java`: javac 21's `AnnotationProxyMaker.generateAnnotation()` has a different signature than javac 25's.

`patches/jdk21u-javac.patch` (javac sources, each change marked `Java Arena`). javac runs on TeaVM's class library, not OpenJDK's, and TeaVM's Wasm output differs from the JVM in a few operations. Each difference found that changed javac's output is fixed at its call site:
- **Number literals** (`JavacParser`): TeaVM's `Float/Double.valueOf` misparsed some literals. For example `1e23` became the next double, hex floats became NaN, `16777217f` was off by one ulp, and `1.17549435E-38f` was rejected. javac now uses JDK 21's `FloatingDecimal`.
- **Number text** (`Type.stringValue`, `Constants`, `Pretty`, `AbstractDiagnosticFormatter`): constant folding such as `"x" + 5e-324` used TeaVM's `Double.toString` (`4.940656458412465E-324` instead of `4.9E-324`). javac now uses JDK 21's `DoubleToDecimal`/`FloatToDecimal`.
- **Constant folding** (`ConstFold`), three fixes:
  - An integer division by zero trapped (a compiler crash) instead of throwing the `ArithmeticException` javac catches, and so did `MIN_VALUE / -1`.
  - Float and double `%` were inexact (`2147483647 % 9.268e-237` folded to `2.147483647E9`, `x % 0.0` was not NaN). They now use an exact remainder, checked against HotSpot on 5 million random pairs.
  - `-0.0` folded to `0.0`. Negation now flips the sign bit.
- **Characters** (`JavaTokenizer`, `UnicodeReader`, `JavacParser`, `TextBlockSupport`): TeaVM's `Character` data rejected identifiers such as `数` ("illegal character"). The scanner now uses `JdkChars`, tables that the build computes from the reference JDK. They match `Character` on all 1,114,112 code points.
- **Strings** (`JavaTokenizer`): `stripIndent` and `translateEscapes` for text blocks and escapes use a copy of JDK 21's code (`JdkStrings`). It was checked against the JDK on 300,000 random strings.
- **Memory** (`Types`): two caches use `HashMap` instead of `WeakHashMap`. On TeaVM, a WeakHashMap entry is held by a JavaScript FinalizationRegistry together with its value, and the value refers back to the key. So no entry was ever freed, and every compile leaked all of its symbols (about 1.9 MB per compile of a 75-line program, measured in Chromium). The caches live inside one compile, so the output is unchanged.

The TeaVM transformer patches that teavm-javac already had are kept. They disable annotation processing, plugins, doclint, `JavacFileManager` registration and deferred file closing. Added sources:
- `java/javaarena/javac/`: the wrapper. It uses an in-memory file manager that models `javac -d out <files>` in a directory holding the sources. It records diagnostics as javac's `Log` prints them, so each `formatted` text is javac's own output, after javac drops duplicates and compacts some method errors.
- `javac-src/javaarena/jdk/`: `JdkNumbers`, `JdkStrings`, `MultiplyHigh` (TeaVM 0.13.1 lacks `Math.multiplyHigh`).

## Platform classes

`SdkTool` keeps every class of `java.base`, including internal packages, because public signatures and annotations refer to them. It removes method bodies, stack maps, bootstrap methods and debug attributes (`SourceFile`, line and local variable tables, `MethodParameters`). It also removes synthetic members that javac's `ClassReader` never enters (not bridges, not lambda bodies). Everything else is kept unchanged:
- signatures and generic `Signature` attributes, annotations, `ConstantValue`, `InnerClasses`;
- `PermittedSubclasses`, `Record`, `AnnotationDefault`, `Exceptions`;
- `module-info.class`;
- private members. Without them, `list.size` on an `ArrayList` gives "cannot find symbol" instead of javac 21's "size has private access in ArrayList", and the tests cover this.

The output is the TeaVM `ArchiveReader` format (a gzip stream of `short nameLength, name, int length, data`), sorted by name.

Sizes, measured with `SdkTool` on JDK 21.0.10 (29,196,238 bytes of class files in):

| Variant | Entries | Payload | gzip |
|---|---|---|---|
| shipped (all members) | 7,549 | 8,631,975 | 1,647,395 |
| `--drop-private` | 7,549 | 7,146,189 | 1,165,585 |
| `--drop-local` (anonymous and local classes) | 6,632 | 7,984,735 | 1,567,887 |
| both | 6,632 | 6,506,771 | 1,089,667 |

The two `--drop` flags exist only for this measurement.

## Sizes (dist, measured by build.sh with Node's zlib at level 9)

| File | Bytes | gzip -9 |
|---|---|---|
| javac.wasm | 2,712,107 | 1,042,272 |
| javac.wasm-runtime.js | 13,936 | 4,765 |
| java-base-sdk.bin (already gzip) | 1,647,395 | 1,643,672 |
| javac-host.mjs | 8,316 | 3,038 |
| **download total** | | **about 2.69 MB** |

## Tests

- `node test/run-tests.mjs` needs the reference JDK. It compiles everything with javac.wasm and with the `javac` 21 command line and compares the two:
  - **Programs** (`test/programs/`, 21 programs, 44 class files): hello, Scanner, classes in packages, records and sealed types with pattern switches, streams, lambdas, generics, text blocks, switch expressions, exceptions, OOP, collections, strings and arrays, `java.time` and `java.nio.file`, Unicode identifiers, a 75-line MOOC-style program, and warnings and notes. There are also three number programs:
    - `numbers-cf`: the research test;
    - `numbers-lits`: 5,000 random literals;
    - `numbers-fold`: 2,700 generated constant expressions, from `test/gen-fold.py`.

    Both sets of class files are run on HotSpot with the reference flags (`-Duser.language=en ... -XX:-UseLibmIntrinsic`, stdin from `input.txt`), and stdout, stderr and exit code are compared.
  - **Compile errors** (`test/errors/`, 34 cases): the 20 requested ones plus inference errors with `where` clauses, bad literals, unclosed comments, tabs, Unicode lines, errors in package files, warnings only, and 120 errors (javac stops at 100). The full javac output must be identical. Every diagnostic's `formatted` text must appear in order in the command line output. File, line, column and code must match `javac -XDrawDiagnostics -Xdiags:compact`.
  - Memory: the JS heap after 100 more compiles. Crash recovery: 5,000 nested parentheses overflow the Wasm stack, then `recover()`, then a compile.
- `node test/browser/run.mjs` runs the same 55 cases in headless Chromium, with javac.wasm in a module Worker. The results (class bytes, output, diagnostics) must equal Node's. It also measures the Chromium heap over 100 compiles. It uses the repository's `playwright` package and the Chromium under `/opt/pw-browsers` (or `CHROMIUM=<path>`).
- `node test/corpus.mjs <dir>` compiles every ```` ```java ```` block of a Markdown tree with both compilers, wrapping snippets in a class. On the MOOC material (`java-programming/data`, not in this repository) there were 1,064 blocks:
  - 394 compiled, and their class files were byte-identical;
  - the other 670 failed in both compilers with identical javac output;
  - 0 mismatches.
- `test/jvm/JvmDriver.java` runs the wrapper on HotSpot's own javac, to debug the wrapper apart from TeaVM. Build and run it with `--add-exports jdk.compiler/com.sun.tools.javac.{main,util,api,code,file}=ALL-UNNAMED`, leaving out `JavacExports.java`.

Results on the final build:
- all 21 programs byte-identical and run-identical;
- 34/34 error cases, with 177/177 diagnostics identical;
- Chromium gave the same results as Node in 55/55 cases.

Timings, measured by the test scripts. Each is the median of 10 compiles where it says "warm", on an otherwise idle machine:

| | Node 22.22 | Chromium 141, module Worker |
|---|---|---|
| Load: import runtime, compile javac.wasm, load SDK | 280 to 310 ms | 240 to 250 ms to "ready" |
| First compile (hello) | 75 to 100 ms | 88 to 96 ms |
| Warm compile, hello | 17 to 19 ms | 9 to 12 ms |
| Warm compile, 75-line program | 33 to 37 ms | 24 to 29 ms |
| JS heap after 100 more compiles | flat (about 56 to 67 MB) | flat (16 MB, main-thread copy) |
| Recover after a crash | 85 to 150 ms | not measured |

Phones were not measured.

## Known gaps

- **Only `java.base` is visible.** `import java.util.logging.Logger;`, `java.sql`, `java.awt` and similar fail with "package ... does not exist". The javac 21 command line would find them in its other modules. More modules could be added to the SDK archive; the file manager already models a module location.
- **Stack depth.** Extremely deep nesting overflows the Wasm stack before HotSpot's: 2,000 nested parentheses compile on the command line but crash javac.wasm. At 1,000 chained `+` string terms both fail. `compile()` then returns `crashed: true`, and `recover()` makes a fresh instance.
- **No command-line options.** Only javac's defaults are available (no `-Xlint`, `--release`, `-parameters`). Annotation processing, plugins and doclint are removed.
- **Browser requirements.** The runtime needs WebAssembly GC and exception handling (the legacy `try` form; TeaVM 0.13.1 does not use `try_table`). It uses JS string builtins when available. It also needs `new Function` (CSP `unsafe-eval`). The minimum browser versions were not tested here.
- **Rare crash output.** An internal javac exception is reported as one `arena.compiler.exception` diagnostic, not javac's long crash report.
- **TeaVM class library.** javac still runs on it for everything not listed under Patches. The test programs, the error cases and the 1,064-block corpus found no other difference. Code paths not covered (for example `-Xlint` categories, which are off by default) could still differ.
