# Reference core: how C/C++ Arena builds, verifies, runs and ships (and what changes for Java Arena)

Research date: 2026-09-28. Researcher: ref-core. Scratch folder: `/home/user/ref/research/ref-core/` (small Java probes `Main.java`, `Bad.java`, `Unnamed.java` used for the measured JDK 21 facts in section 15).

Source studied: `/home/user/antonyperez0/cpp-arena` at commit `f90cc1ceadfb65b5a96f2ad410c9ba07ff968be9` (2026-09-28, "Merge pull request #22"). All paths below are relative to that folder unless they start with `/`. Every claim was verified by reading the named file; numbers marked "measured" were computed here from `src/generated/content.json` (committed in the repo) or, in section 15, by running the local OpenJDK 21.0.10. Anything else is marked "estimate" or "unverified".

---

## 1. The pipeline in one picture

`package.json` scripts:

| Script | Command | Role |
|---|---|---|
| `postinstall` | `node scripts/copy-toolchain.mjs` | Copies/patches the Clang toolchain into `public/toolchain` (gitignored, `.gitignore`) |
| `content` | `node scripts/content.mjs` | Runs `build-content.mjs` then `build-visuals.mjs` with the same args (`scripts/content.mjs`) |
| `verify:wasm` | `node scripts/verify-wasm.mjs` | Re-runs all content through the exact browser toolchain in Node |
| `verify` | `npm run content && npm run verify:wasm` | Local full check |
| `build` | `copy-toolchain && tsc --noEmit && vite build && pack-pro && prerender` | Type-check, bundle, pack the Pro starter, pre-render every route |
| `test:e2e` | `node scripts/e2e.mjs` | Playwright + axe against `dist/` |

Order in CI (`.github/workflows/deploy.yml`): `npm ci` (runs postinstall) -> compute `BASE_PATH`/`SITE_URL` -> install gdb -> `npm run content -- --no-cache` (GCC/G++ verify + visuals) -> `npm run build` -> `npx playwright install --with-deps chromium` -> `npm run test:e2e` -> Lighthouse (PR only) -> upload Pages artifact and deploy (non-PR only). Note: `verify:wasm` is NOT a CI step (checked `deploy.yml`); the browser-toolchain cross-check is a manual/local step.

Stack (`package.json`): React 18, react-router-dom 6, Vite 5, TypeScript 5.9, CodeMirror 6, `marked`, `yaml`, `browsercc` 0.1.1 (MIT per `npm view`), `@bjorn3/browser_wasi_shim` 0.4.2 (MIT OR Apache-2.0 per `npm view`), Playwright, `@axe-core/playwright`, `@lhci/cli@0.15.1` via npx (`deploy.yml`).

---

## 2. Content YAML schemas (every field)

### 2.1 Lesson module: `content/lessons/NN-id.yaml`

Module keys (validated in `scripts/build-content.mjs` `buildLessons`): `id`, `title`, `lang` (`c` or `cpp`), `steps` are required; `phase` (group heading such as `"C: Foundations"`) and `summary` are optional. Files are read in sorted filename order, which is the curriculum order (`readYamlDir` sorts).

Step keys (`buildLessons` + `buildExercise`):

- `id` (required, permanent; progress is keyed by it; missing id is an error), `title` (must be a non-empty string, bare YAML words like `NULL` are rejected), `text` (Markdown, required), optional `lang` override.
- Exercise body, one of:
  - `fill:` a program with `[[answer]]` blanks; alternatives separated by U+2016, e.g. `[[a‖b]]` (`src/grader/assemble.js` `BLANK_RE`, `parseTemplate`). The solution is the template with each first alternative (`templateSolution`). Errors: no blanks, or an empty blank answer.
  - `seed:` (starter code) + `solution:` (reference). Missing solution is an error.
- `harness:` hidden test `main` appended after the learner code. With `compare: stdout` the harness is still appended, but grading compares stdout instead of counting checks (`mode = raw.harness && raw.compare !== "stdout" ? "harness" : "stdout"`). Example: `content/lessons/07-c-funcs.yaml` step `c-funcs-3`.
- `tests:` list; each test: `name`, `stdin`, `expect` (optional; if present it is checked against the real output, otherwise it is computed), `hidden: true`, `files:` (name -> text, placed in the run's working folder), `args:` (argv list, stringified), `exit:` (expected exit code, default 0), `allowEmpty: true` (silences the empty-output warning). Missing or empty `tests` becomes one test with empty stdin.
- `hints:` list (warning if empty).
- `require:` / `forbid:` list of `{pattern, flags?, message}` regex rules (`checkRules`); example with `flags: m` in `content/lessons/18-c-program.yaml` (~line 346).
- `seedMayPass: true` disables the "starter must not pass" check (used twice: `12-c-memory.yaml`, `41-dsa-complexity.yaml`).
- `more:` extra challenges; each needs `task` plus `fill` or `seed`, and takes all exercise fields above. The step counts as done only when every challenge passed (`src/pages/StepPage.tsx` `challengesOf`, `challengeDone`).

Text conventions (`buildLessons`, `checkExamples`):
- `text` must contain `**Your turn:**`. Everything before it becomes `text`; everything after becomes `task` (first letter upper-cased), shown in the task card with the first visible test's stdin/expected output, or for harness steps the list of check names (`checkNames`) (`src/components/TaskCard.tsx`).
- Worked examples are fenced ```` ```c run ```` or ```` ```cpp run ````, optionally followed by ```` ```input ```` (stdin) and ```` ```output ```` (must match). ```` ```cpp native ```` is thread code compiled with `-pthread` and run three times; the output must be identical each run. After checking, info strings are rewritten to plain `c`/`cpp`/`text`.

Samples read: `01-c-hello.yaml` (fill steps with `more:` including a write-it-yourself seed/solution challenge), `07-c-funcs.yaml` (harness with `CHECK_INT`, `compare: stdout`, `require`/`forbid`, hidden test), `18-c-program.yaml` step `c-program-6` (`args`, `files`, `exit: 1`/`exit: 2`, `allowEmpty`, hidden test), `21-cpp-vector.yaml` (`CHECK_EQ` with `std::vector`).

### 2.2 Project: `content/projects/NN-id.yaml`

`id`, `title`, `lang`, `level`, `after` (module id; warning if unknown), `summary`, `seed`, `milestones[]`. Each milestone: `title`, `text` (examples checked), `solution` (the full program at that point) plus any exercise field (`tests`, `hints`, `harness`, rules). Milestone 1's starter is the project `seed`; milestone N's starter is milestone N-1's solution, and `seedMayPass` is forced true for N > 1 (`buildProjects`). Sample: `content/projects/01-calculator.yaml`.

### 2.3 Drill file: `content/drills/<module-id>.yaml`

File keys: `topic` (a module id, or `interview`), `lang`, `drills[]`. Drill keys: `type`, optional `id` (default `<topic>-<n>`, or `<file>-<n>` for interview), `lang`, `why` (explanation; warning if missing), `pre` (code above `main`), `body` (inside `main`), `stdin`, `files`, `args`, `after: <step id>` (manual unlock step), `prompt`.

Per type (`buildDrill`):
- `predict`: answer = real output; author `answer` (optional) compared loosely (whitespace collapsed, `looseOutput`); error if it prints nothing; warning over 4 lines.
- `fill`: exactly one blank; optional `expect` checked; stores `answer`, `accept` alternatives and `output`.
- `bug`: mark the line with `// BUG` and give `fix:`; the fixed program must compile and exit 0; buggy and fixed must behave differently unless `ub: true`; a lone brace cannot be the bug line. `answer` is the 1-based line number.
- `compiles`: answer `yes`/`no` from GCC; an author `answer` must agree; if no `why`, the first GCC error becomes the explanation.
- `choice`: 2 to 4 `choices`, 1-based `answer`, required `prompt` and `why`; code shown must compile unless `compiles: false`; `verify: output` checks the right choice equals the program's output and that no other choice also matches.
- `boss`: a full exercise (same fields as a lesson step), compiled in the browser; every 8th rep (`src/deathmatch/engine.ts` `BOSS_EVERY = 8`).

Sample read: `content/drills/c-pointers.yaml`, `content/drills/interview-c.yaml`.

### 2.4 Placement, topics, visuals, next, pro, step URLs

- `content/placement.yaml`: `questions[]`, each a drill plus `module`; must be in curriculum order (error otherwise); ids `placement-<n>`.
- `content/topics/*.yaml`: `topics[]` with `slug` (`^[a-z0-9-]+$`, unique), `title`, `lang`, `description` (warning over 160 chars), `modules[]` (must exist), optional `visual` (must exist), `body` (Markdown), `example` (must compile with `-Werror`, exit 0; output recorded), optional `stdin`, `native: true` (cpp threads, run three times). Sample: `content/topics/1-c.yaml`.
- `content/visuals/*.yaml`: `id`, `title`, `lang`, `module`, `steps[]` (lesson step ids that link to it), `summary`, `text`, `code`, optional `stdin`. Sample: `content/visuals/17-list-push.yaml`.
- `content/next.yaml`: `title`, `description`, `body` (all required). `content/pro.yaml`: `projects[]` of `dir`, `title`, `hours`, `skills`, `summary`; every folder in `pro-track/starter/projects` must be listed and have a README.
- `content/step-urls.yaml`: generated, committed; see section 5.

Authoring helpers: `scripts/set-text.mjs` replaces step texts from a Markdown file with `=== <step-id>` sections, editing YAML via `YAML.parseDocument` so the rest of the file is preserved; `scripts/yaml-quote-fix.py` quotes prose lines with `: `.

---

## 3. The content build (`scripts/build-content.mjs`)

### 3.1 Execution engine

- `execute(lang, source, inputs, {werror})` writes the source to a temp dir, compiles with `gcc`/`g++`, then runs each input. Flags (`FLAGS`): C `-std=c17 -O1 -Wall -Wextra -Wno-unused-result -U_FORTIFY_SOURCE -Werror=int-conversion -Werror=implicit-function-declaration -Werror=incompatible-pointer-types -Werror=implicit-int`; C++ `-std=c++20 -O2 -Wall -Wextra ...`; `cppnative` adds `-pthread`. The extra `-Werror=` flags make GCC reject what Clang rejects by default (comment in file).
- Reference solutions, worked examples and topic examples compile with `-Werror` (`werror: true`); starters and drills do not.
- Each run gets a fresh empty working directory holding only the test's `files`, with `args` as argv, mirroring the browser's in-memory folder. Compile timeout 60 s, run timeout 5 s (browser is 3 s).
- Concurrency limit `max(2, os.cpus().length)`. Results cached by SHA-1 of `[lang, source, inputs, werror, flags]` in `node_modules/.cache/cpp-arena-content.json`; CI passes `--no-cache`.
- Diagnostics have the temp path replaced by `main.c`/`main.cpp`.

### 3.2 What is verified per exercise (`buildExercise`)

1. The solution (plus harness if any) compiles with `-Werror`; otherwise error.
2. Rules: the solution must satisfy its own `require`/`forbid`.
3. Harness mode: the run must exit 0, print at least one check, and every check must pass. `checks` (count) and `checkNames` are stored.
4. Stdout mode: every test must not time out and must exit with `exit` (default 0). Expected output is the solution's normalized stdout (`normalizeOutput`: CRLF to LF, trailing spaces/tabs per line removed, trailing newlines removed). If an author pinned `expect`, a mismatch is an error. Empty output warns unless `allowEmpty`.
5. Starter must NOT pass (code steps only, unless `seedMayPass`): the seed is compiled and run the same way; if it compiles, passes every test (and exit codes), and satisfies the rules, the build fails with "the starter code already passes".
6. Fill steps are not starter-checked (the blanks are empty), but they are graded in the browser by compiling the filled program, not by comparing blank text; the "wrong blank" highlight is only a hint (`src/components/Workbench.tsx` `wrongBlanks`).

Global checks: duplicate module ids, duplicate step ids, unknown drill topics, duplicate drill ids, `after` validity, project `after` validity. Any error exits 1; warnings are printed.

### 3.3 Harness helpers and the `@@PASS/@@FAIL` protocol (`src/grader/assemble.js`)

`harnessSource(lang, userCode, harness)` = learner code + helper block + harness. C helpers are macros `CHECK(name, cond)`, `CHECK_INT(name, got, want)` (as `long long`), `CHECK_DBL` (tolerance 1e-6), `CHECK_STR` (strcmp, null-safe). C++ helpers are `CHECK(name, bool)` and template `CHECK_EQ(name, got, want)` with a `show()` that quotes strings and chars, prints bools and `{a, b}` vectors; `-Wsign-compare` is silenced. Each prints `\n@@PASS name\n` or `\n@@FAIL name|want|got\n`. `parseChecks` splits stdout into checks and the learner's own output (shown to the learner).

### 3.4 Output: `src/generated/content.json`

Shape (`src/content/types.ts` `Content`): `generatedAt`, `modules` (with steps carrying `kind`, `mode`, `lang`, `seed`, `solution`, `harness`, `tests`, `checks`, `checkNames`, `hints`, `require`, `forbid`, `slug`, `task`, `more`, optional `numbered`), `projects`, `drills` (with `step`), `pro`, `placement`, `topics`, `next`. It is committed and imported directly into the app bundle (`src/content/index.ts`), with no route-level code splitting (only `qrcode-generator` is dynamically imported, `src/lib/sync.ts`).

Measured from the committed file: 48 modules, 318 steps, 244 extra challenges, 224 harness-mode steps, 48 fill steps, 41 hidden step tests, 657 drills (294 predict, 96 compiles, 85 choice, 76 fill, 69 bug, 37 boss), 595 drills with a computed unlock step, 11 projects, 52 topics, 16 placement questions. File size 2,292,422 bytes, 567,710 bytes with `gzip -9`.

---

## 4. Drill unlocking (`scripts/drill-steps.mjs`, `src/state/derived.ts`)

`assignDrillSteps(modules, drills, errors)` gives each module drill a `step`:
1. `features(code)` extracts "features": `#include` headers, qualified names (`std::x`), C/C++ keywords, ALL_CAPS macros, member calls (`.push_back`), free calls (`strlen()`), `memory_order_*`, plus syntax ideas ("pointer to pointer", "const pointer", `->`). Names the code defines itself are excluded, and a COMMON set (`int`, `printf`, `main`, `cout`, `for`, ...) is dropped.
2. For the whole course, each feature is "introduced" at the first step (text code blocks, inline code, seed, solution) that uses it. Only features introduced in the drill's own module count.
3. The drill's step is the latest step introducing any feature it uses (for fill drills the blank is filled in; fix, boss solution, prompt and choices included).
4. No features: pick the step whose words best match the drill's prompt, choices and `why`, scoring shared words by `log(n/df)`; drills with code move off step 1 only if the score is at least 4.
5. `after: <step id>` overrides and is validated.

Runtime (`drillUnlocked`): a drill is playable if "unlock all" is on, it has no step (interview), its step is done, its module was skipped via placement, or it was already practiced.

---

## 5. Permanent step URLs (`scripts/step-urls.mjs`)

- Address is `/learn/<module>/<slug>`. `slugify(title)` lowercases, `c++` -> `cpp`, `&` -> `and`, drops apostrophes, non-alphanumerics to `-`. On first build a new step's slug is pinned in `content/step-urls.yaml` under `slugs:` (keyed by step id) and never recomputed, so title edits never move a page. Collisions get `-2`, `-3`; a purely numeric slug is an error.
- `numbered:` keeps the old numeric addresses: per module, item n is the step id that `/learn/<module>/<n>` used to open; new positions append; a deleted step becomes `null`. If numbering differs from today's order, the module gets a `numbered` array in content.json.
- `applyStepUrls` returns "changed" and the build rewrites the file, printing "commit this file". Stale ids only warn.
- Runtime: `findStep` (`src/content/index.ts`) resolves a slug or an old number; `src/main.tsx` converts old `#/` hash links with `history.replaceState`; `prerender.mjs` writes a tiny page at each `/learn/<module>/<n>/` with `noindex`, a canonical link to the new address, `meta refresh` and `location.replace(to + location.hash)`. The e2e SEO test checks that the sitemap has no numbered addresses and that `/learn/cpp-generic/6/#hints` lands on the right slug with the hash kept.

---

## 6. The in-browser compiler

### 6.1 Toolchain preparation (`scripts/copy-toolchain.mjs`)

Copies `clang.wasm` and `lld.wasm` from `browsercc/dist`, rewrites `sysroot.tar` to swap `libc++.a`/`libc++abi.a` for WebAssembly-exception builds and add `libunwind.a`, `libarena.a` (`vendor/libcxx-eh`), rebuilds the C++ precompiled header (`stdc++.h.pch`) with the exact flags `-O2 -std=c++20 -fwasm-exceptions` (a PCH only loads with identical flags), and writes gzip level 9 copies of the four files (tracked by SHA-256 in `gz.keys`). `manifest.json` = `{ version: "<browsercc version>+eh.<12-hex key>", files: {name: bytes}, gzip: {name: bytes} }`; the key hashes the sysroot, clang.wasm and PCH flags, so any change makes browsers refetch once. README sizes: about 27 MB (C) and 38 MB (C++) downloaded compressed, 88 and 107 MB uncompressed (`README.md` "How it works"; not re-measured, `node_modules` is not installed here).

`vite.config.ts` strips browsercc's `new URL("clang.wasm", import.meta.url)` so Vite does not copy 65 MB of wasm into `/assets` (comment in file); workers are ES modules (`worker.format: "es"`).

### 6.2 Loading and caching (`src/compiler/client.ts`, `compiler.worker.ts`, `manifest.ts`)

- One persistent module worker (`compiler.worker.ts`) owns Clang and LLD. `ensureCompiler({warmCpp})` creates it and posts `init` with the toolchain base URL.
- Manifest: `fetch(url, {cache: "no-cache"})`; offline fallback is the manifest copy saved in Cache Storage next to the files.
- `fetchCached(file)`: look up Cache Storage cache `cpp-arena-toolchain-<version>`; on a miss, fetch `<file>.gz` when `DecompressionStream` exists and the manifest lists a gzip size, count compressed bytes through a `TransformStream` for progress, pipe through `DecompressionStream("gzip")`, store the decompressed bytes, delete caches of other versions. Quota errors are ignored (works, just downloads again). After `clang.wasm`, `lld.wasm` and `sysroot.tar` are saved, the manifest is saved into the same cache.
- `WebAssembly.compile` runs once per module; `Toolchain` (`src/compiler/core.js`) re-instantiates Emscripten per compile with a fresh in-memory FS, discovers the real `-cc1` and `wasm-ld` command lines once via a `-###` dry run (cached per file name and flags), writes headers (and PCH), compiles `main.c`/`main.cpp`, links, and returns the program wasm. A tiny C compile warms the JIT. The PCH is fetched lazily only for C++.
- Flags in the browser (`core.js`): C `-std=c17 -O1 -Wall -Wextra`; C++ `-O2 -std=c++20 -fwasm-exceptions -Wall -Wextra -include-pch ...` plus link flags for the unwinder and uncaught-exception reporter.

### 6.3 Mobile-data prompt

`onMobileData()` is true when `navigator.connection` reports `saveData`, `type === "cellular"`, or `effectiveType` `2g`/`slow-2g`. `mayAutoDownload(allow)` returns true if the user allowed mobile downloads, if not on mobile data, or if this version is already cached (`compilerCached`: cache exists with at least 3 entries). Otherwise `MobileDataCard` (`src/components/MobileDataCard.tsx`) shows "You're on mobile data", the size from the manifest (gzip sizes when `DecompressionStream` exists), a "Download compiler" button and an "Always download on mobile data" setting. Pressing Check also starts the download. The e2e test fakes `navigator.connection` and asserts nothing under `/toolchain/` is requested before the click, that every fetched file ends in `.gz`, and that the next page does not ask again.

### 6.4 Running: time limit, output cap, files, args

- `compileAndRun(source, lang, inputs, timeoutMs = 3000)`: compile in the persistent worker, then `runAll` spawns a new short-lived `runner.worker.ts` per Check. The runner compiles the program module once and runs inputs sequentially, posting `start` before each; the main thread re-arms a 3 s timer on every `start`, so the limit is per test case. On timeout the worker is terminated, that test is `timedOut`, and later tests get no result ("The program did not run (a previous test stopped the run)").
- `runWasi` (`core.js`): stdin is a pre-filled `File`; stdout/stderr go to `ConsoleStdout` sinks; the combined stdout+stderr is capped at 64 KB (`OUTPUT_LIMIT = 64 * 1024`), after which an `OutputLimit` error stops the run (`crash = "output-limit"`, `truncated`). A `PreopenDirectory(".")` holds the test `files`; argv is `["main", ...args]`. `WASIProcExit` gives the exit code; a `WebAssembly.Exception` escaping `main` becomes `uncaught-exception` with a libstdc++-style `terminate called after throwing an instance of 'T'` line (type demangled by `demangleType`); other traps become `crash` with the engine's message.

---

## 7. Explaining compiler errors and crashes

- `src/grader/friendly.ts` has 48 regex rules mapping Clang messages to plain English (missing `;`, unclosed braces, undeclared identifier, wrong argument count, printf format mismatch, `=` vs `==`, missing `main`, private member, deleted copy, and so on). `parseDiagnostics(raw, userLines)` parses `main.c:L:C: severity: message` and `wasm-ld ... undefined symbol:` lines; `inTests` is set when the line number is beyond the learner's line count, i.e. inside the appended harness.
- `src/components/Results.tsx` shows at most 4 diagnostics (errors first), labels harness errors "in the hidden test code" and adds "usually means a function name, parameter list or return type doesn't match what the step asks for"; "Show full compiler output" reveals the raw text. The editor lint only marks diagnostics that are in the learner's lines (`CodeEditor.tsx`).
- `describeRun` (`src/grader/grade.ts`) turns run results into sentences: time limit (mentions infinite loops and a `scanf` waiting for input), output limit, "out of bounds" as a segfault analogue, uncaught exception with the `terminate` text, `unreachable` as abort/UB, stack overflow, and non-zero exit codes.

---

## 8. Grading (`src/grader/grade.ts`)

1. `checkRules` on the learner code after `stripForRules` removes comments and string/char literals (so a comment cannot satisfy `require`).
2. If the step has a harness and the code contains `int main(`, a rule problem is added ("Remove your main() ...").
3. Build the source (learner code + harness), compile and run: harness mode runs once with the first test's input; stdout mode runs every test.
4. Status `internal-error` (compiler failed to run), `compile-error`, otherwise per-test results.
5. Harness mode: checks come from `@@PASS/@@FAIL` lines; if fewer checks than `ex.checks` were printed, a failing pseudo-test "N more test(s)" carries the crash/timeout note.
6. Stdout mode: a test passes if a result exists, no timeout or crash, normalized output equals `expect`, and the exit code matches `exit` when set. Hidden tests are listed as "Hidden test (hidden so you can't hard-code the answer)".
7. Pass = at least one test, all tests pass, no rule problems.

Observation (from reading the code, not exercised): the protocol trusts any stdout line matching `^@@(PASS|FAIL) ...`. Learner code in a harness step could print the expected number of `@@PASS` lines and call `exit(0)` before the harness runs, which would pass. Low stakes for a free course, but a Java design can close it cheaply (section 15.4).

---

## 9. `verify-wasm` cross-check (`scripts/verify-wasm.mjs`, `scripts/node-toolchain.mjs`)

Loads the browsercc Clang/LLD modules from `node_modules` and the site's own patched `public/toolchain/sysroot.tar` and PCH into the same `Toolchain` class the browser uses, then for every lesson step, every `more` challenge, every project milestone, boss drill and placement item re-compiles the reference solution and runs it with `runWasi`. It fails on: compile failure, any Clang warning on a solution, a harness check count or result mismatch, a wrong exit code, a crash, or stdout different from the GCC-computed `expect`. Predict/fill/bug drills are compared with the stored answers; `compiles` drills must get the same yes/no from Clang as from GCC; `choice` drills are skipped. Optional filter argument. As noted, CI does not run it.

---

## 10. Service worker and offline (`public/sw.js`, `scripts/prerender.mjs`, `src/main.tsx`)

- Registered in production only, on `load`, scope `BASE_URL` (`src/main.tsx`).
- `prerender.mjs` fills the placeholder `const BUILD = { version: "dev", files: [] };` in `dist/sw.js` with the `assets/*` list and a 12-hex SHA-256 version over those names plus `index.html` (throws if the placeholder is missing).
- Install caches (`cpp-arena-app-<version>`) the scope root (pre-rendered home, used as app shell), the web manifest and every asset, then `skipWaiting()`; activate deletes older app caches and `clients.claim()`.
- Fetch: skip non-GET, cross-origin and `toolchain/`. Navigations network-first with offline fallback to the cached page (`ignoreSearch`) or the shell; `assets/` cache-first; everything else stale-while-revalidate.
- `public/manifest.webmanifest`: name, short_name, description, `start_url`/`scope` `"./"`, `standalone`, colors, categories, icons 192, 512 and maskable 512.
- The e2e offline test visits the playground once, runs a program, goes offline, opens never-visited pages and runs again.

---

## 11. Prerendering and SEO (`scripts/prerender.mjs`)

- Env `SITE_URL` (default `https://cpparena.com`, host lower-cased) and `BASE_PATH` (default `/`).
- Uses the built `dist/index.html` as a template: per-page `<title>`, description, canonical (or `robots noindex`), Open Graph tags, `twitter:card`, JSON-LD (`<` escaped), and a static nav plus `<main id="main" class="main prerendered md">` with real content inside `#root`, which React replaces on start.
- Routes: home, `/learn`, every step (breadcrumb, "Step i of n", text, task, challenge tasks, prev/next), every project, Pro project, topic and visual plus their index pages, `/deathmatch`, `/daily`, `/placement`, `/playground`, `/next`; `/certificate` and `/profile` are `noindex`. Headings are shifted (`mdAt`) to keep the outline gap-free; descriptions are 155-char summaries.
- JSON-LD: `Course` + `WebSite` on home, `LearningResource` (`Exercise`, `programmingLanguage`) per step, `TechArticle` per topic.
- Also writes the numbered redirect pages, `404.html`, `sitemap.xml` (indexed pages, `lastmod` = build date) and `robots.txt`.
- `index.html` applies the saved theme and text size from `localStorage["cpp-arena-v1"]` before paint; `vite.config.ts` preloads the Inter font and adds a Cloudflare beacon only when `CF_BEACON_TOKEN` is set.

---

## 12. The e2e suite (`scripts/e2e.mjs`, 40 `test()` calls)

Harness: a Node HTTP server that mimics GitHub Pages under `BASE_PATH` (directory -> `index.html`, unknown -> `404.html` with status 404); full Chromium (`/opt/pw-browsers/chromium` or channel `chromium`, because the headless shell crashed the tab on the out-of-bounds test, per comment); `Math.random` replaced by seeded mulberry32 in every context (`E2E_SEED`, default 1) so drill order is repeatable; service workers blocked except in the offline test; `--shots dir` saves screenshots, and failures screenshot automatically. Browser console errors are printed but do not fail the run.

Coverage:
- Learning flow: fill pass (first compile incl. download timed), challenge tracker, wrong fill shows expected vs got, friendly compile error plus hint, code pass, infinite loop killed by the time limit, C++ exceptions caught and uncaught, crash message, C++ PCH compile times, C++ harness (seed fails, solution passes), file-reading step, argv plus exit-code grading.
- Drills and features: deathmatch death/respawn and an 18-rep correct streak over all types incl. boss; interview prep; placement skip; daily streak; project milestones; Pro pages and tarball; playground (stdin, compile error, uncaught exception, share link in a fresh context); mobile-data prompt; localStorage progress; theme and text size; phone symbol bar; "Report a problem" link; visualizer; topic output; transfer sync; certificate; offline.
- Layout: no sideways scroll at 390 px (12 routes); at 360 px (`isMobile`, `hasTouch`) 14 routes need a non-empty h1, no overflow and zero axe violations.
- Accessibility (axe tags `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa, best-practice`; any violation fails): 20 routes in dark; failed fill with hint open, results announced via `role="status"`, compile error; deathmatch lobby, each rep type, review screen; 10 routes plus interactive states in light; keyboard (skip link first, focus to new h1, Escape then Tab leaves the editor).
- SEO: step page title, description, canonical, og:image, `LearningResource` JSON-LD and pre-rendered h1; `Course` on home; sitemap has at least 380 URLs and excludes profile and numbered addresses; `TechArticle` on topics; manifest icons; distinct titles; hash and numbered links forward; unknown path returns HTTP 404.

---

## 13. Lighthouse CI (`lighthouserc.json`, `scripts/lighthouse-summary.mjs`)

`staticDistDir: ./dist`, 5 URLs (`/`, one lesson step, one topic, `/playground/`, `/deathmatch/`), 3 runs each, Chrome flags `--no-sandbox --headless=new`. Assertions (median run): performance >= 0.8, accessibility >= 0.95, best-practices >= 0.95, SEO >= 0.95, `resource-summary:script:size` <= 921600 bytes (900 KB). Reports go to `lhci/` and are uploaded as the `lighthouse-reports` artifact; `lighthouse-summary.mjs` appends a Markdown table (median scores and script KB per page) to `$GITHUB_STEP_SUMMARY`. It runs only on pull requests and only when `BASE_PATH == '/'`, "so a noisy score never blocks a deploy" (comment in `deploy.yml`).

---

## 14. Workflows

- `deploy.yml`: triggers `push` to `main`, `pull_request`, `workflow_dispatch`; permissions `contents: read`, `pages: write`, `id-token: write`; concurrency group `pages`, no cancel. `env.CUSTOM_DOMAIN: cpparena.com`. If set: `BASE_PATH=/`, `SITE_URL=https://$CUSTOM_DOMAIN`; if empty: `BASE_PATH=/<repo>/`, `SITE_URL=https://<owner>.github.io/<repo>`. Node 22 with npm cache. Upload (`actions/upload-pages-artifact@v3`) only for non-PR runs; job `deploy` (`needs: build`, environment `github-pages`) runs `actions/configure-pages@v5` and `actions/deploy-pages@v4`. No CNAME file is generated (none in `public/`); the README says to enter the domain under Settings > Pages. So PRs get the full content verify, build, e2e and Lighthouse; merges to main get verify, build, e2e and deploy.
- `links.yml`: weekly (Mon 06:23 UTC); `check-links.mjs` checks every outside URL in content, src, the Pro starter and `index.html` (4 at a time, 3 tries, 20 s timeout; 401/403/429 count as "blocked") and keeps one "Broken outside links" issue open or closed.
- `pro-track.yml`: `pro-track/check.sh` asserts each untouched starter fails its grader and starter + solution passes.
- Visualizations (`scripts/build-visuals.mjs`, `scripts/trace/*`): examples are compiled with `-Werror`, rebuilt with `-g -O0` and malloc/new wrappers, and stepped under gdb by `tracer.py` (3 to 400 steps; output must equal a normal run). Output: `public/visuals/<id>.json` (gitignored) and `src/generated/visuals.json`. A Java equivalent would need a JDI/jdb tracer (not researched here).

---

## 15. Java adaptation notes

### 15.1 Content build: javac + java instead of gcc

- Keep the Node orchestrator, YAML, cache and error/warning lists. Replace `execute()` with a JDK backend. Starting a JVM per compile and per run would be slow for over a thousand programs (estimate, not measured). Better: a long-lived Java helper process (reads JSON jobs on stdin) that compiles with `javax.tools.JavaCompiler` in memory and runs each test in a fresh `ClassLoader` with `System.in/out/err` redirected, a per-test time limit (thread + timeout, then kill the helper if it will not stop), and a fresh temp working directory for `files`. Keep a plain `java` subprocess path for tests that call `System.exit` or need a clean JVM.
- Use the same Java major version as the browser runtime and `--release N`. The runtime studies in `/home/user/ref/research/rt-cheerpj.md` (CheerpJ supports Java 8, 11 and 17) and `rt-teavm.md` (TeaVM class library diverges from OpenJDK) mean expected output must come from the same JDK version the browser runs, or it will not match (exception messages and formatting differ by version per those reports).
- Flags: an analogue of `-Werror` for solutions, e.g. `-Xlint:all -Werror` minus noisy lints (suggestion; tune on real content). Starters compile without it.
- Force `Locale.US` (or `-Duser.language=en -Duser.country=US`) and UTF-8 in both build and browser. Measured with the local OpenJDK 21.0.10: `String.format("%.2f", 3.14159)` prints `3,14` under `-Duser.language=fi -Duser.country=FI` and `3.14` by default (test program in `/home/user/ref/research/ref-core/Main.java`).
- This container sets `JAVA_TOOL_OPTIONS`, so every `java`/`javac` prints a "Picked up JAVA_TOOL_OPTIONS" line on stderr (observed); CI runners may differ. The build must not treat stderr noise as program output, and any stderr check should strip that line.
- Determinism: run every solution at least twice (like `cpp native` runs three times) and fail on differing output, to catch unseeded `Random`, `HashSet` iteration assumptions and time-dependent code. Add an explicit `nondeterministic: true` escape hatch that switches the step to harness mode.

### 15.2 Schema changes

- `lang` becomes `java` (maybe also `javaVersion` per site, not per step).
- Multi-file programs (MOOC parts 4 onward use several classes; part 11 teaches packages, `data/part-11/2-packages.md`): allow `seed`/`solution`/`fill` to be either a string (single file) or a map `path -> source`, e.g. `Main.java`, `Person.java`, `library/Program.java`. Keep test data under `tests[].files` (runtime working folder) to avoid a name clash; call source maps `sources:` if a separate key is clearer. `require`/`forbid` get an optional `file:`.
- Add `main:` (fully qualified main class) with a default computed from the file containing `public static void main`.
- Tests: keep `stdin`, `expect`, `hidden`, `files`, `args`, `exit`, `allowEmpty`; consider `stderr:` (substring match) and `exception:` (expected uncaught exception class) for exception lessons.
- Worked examples: ```` ```java run ````, ```` ```input ````, ```` ```output ````. Many MOOC examples are fragments; support ```` ```java run-snippet ```` that is wrapped like a drill (imports + `public class Main { public static void main(String[] args) throws Exception { ... } }`).
- Drills: `pre` = members of `Main` (static methods, fields, nested static classes), a new `types:` block for extra top-level classes, `body` inside `main`. `drillProgram` gets a Java head (`import java.util.*;` and similar; list chosen to cover MOOC topics) and wrapping. `bug` keeps the `// BUG` marker (Java uses `//` comments too). `compiles` answers come from javac; the browser javac must agree (see 15.8).
- Keep `step-urls.yaml`, `placement.yaml`, `topics`, projects (with multi-file seeds carrying forward), `more:`.

### 15.3 Class-name and file-name rules

- javac requires a public top-level class to live in `<Name>.java` ("class X is public, should be declared in a file named X.java"). For single-file steps, name the file after the first `public class|interface|enum|record` found (fallback `Main.java`), and pick the main class by finding `public static void main(String[] ...)` (regex before compile, or reflection after). Add a friendly rule for that message.
- For packages, the in-memory file system needs directories and the run command needs the fully qualified name.
- Do not use "unnamed classes / instance main": JDK 21 javac rejects `void main() {...}` with "unnamed classes are a preview feature and are disabled by default" (measured locally). Keep classic `public static void main`.
- Measured javac 21 output for a mismatched file name plus a narrowing assignment: `Bad.java:1: error: class Program is public, should be declared in a file named Program.java`, then `error: incompatible types: possible lossy conversion from double to int`, each followed by the source line and a caret, then `2 errors`, exit 1.

### 15.4 Hidden harness vs JUnit

- Recommended: a JUnit-free harness compiled as its own file, e.g. `ArenaTests.java` in the default package, whose `main` calls the learner's classes/static methods, with a helper class `Check` providing `check(name, cond)`, `eq(name, got, want)` (`Objects.equals`, `Arrays.deepEquals` for arrays, 1e-6 for doubles) and a `show()` that quotes strings/chars and prints arrays with `Arrays.toString`/`deepToString` and lists with `toString()`. Unlike C, wrap each check in `try/catch (Throwable)` so a thrown exception fails only that check with its class and message, and the remaining checks still run.
- Because the harness is a separate file, the learner may keep their own `main`, so the "remove your main()" rule is unnecessary. "In the hidden test code" becomes "diagnostic in `ArenaTests.java`" (simpler and more exact than the C line-count trick). A signature mismatch surfaces as `cannot find symbol` or `method X cannot be applied to given types` there.
- Harden the protocol: generate a random nonce per run, pass it to the harness (argv or a system property the learner does not see), print `@@<nonce> PASS name`, and end with `@@<nonce> DONE <count>`; treat a missing DONE as "tests stopped early". This closes the spoofing gap noted in section 8.
- JUnit: MOOC part 6 teaches JUnit 4 (`import org.junit.Test;` in `data/part-6/3-introduction-to-testing.md`). Keep JUnit for those lessons only, where the learner writes tests; grade them with the harness (for example run the learner's test methods by reflection against a correct and a mutated implementation, like the Pro Track's mutation grading). Licence per `/home/user/ref/research/license.md`: JUnit 4 is EPL 1.0; TMC edu-test-utils is LGPL 3.0 and should not be bundled. Shipping the JUnit jar into the browser adds download size (not measured).

### 15.5 Scanner, stdin and transcripts

- Keep "stdin supplied up front". Reading past the end fails: measured on JDK 21, `scanner.nextLine()` with empty stdin prints `Exception in thread "main" java.util.NoSuchElementException: No line found` and exits 1. Add a friendly explanation ("your program asked for more input than the test gives"). Advise one Scanner per program: a second Scanner on `System.in` can miss input the first one already buffered (Scanner reads ahead; not measured here).
- MOOC sample outputs interleave the user's typed input in bold (`data/part-1/3-reading-input.md` lines 70-76). Piped stdin is not echoed, so the computed expected output will not contain it. Either show stdin and stdout separately (as C/C++ Arena does), or have the runtime record which stdin bytes were consumed between outputs and render a terminal-style transcript for display only (grading still compares stdout).

### 15.6 Exceptions instead of segfaults; exit codes

- Uncaught exceptions print `Exception in thread "main" <class>: <message>` plus `at` lines to stderr and exit 1. Measured on JDK 21: `java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5` then `at Main.main(Main.java:7)`, exit 1; `System.exit(3)` gives exit 3.
- Helpful NullPointerException messages name local variables only when the class has debug info: measured, without `-g` the message says `because "<local2>" is null`, with `javac -g` it says `because "x" is null`. Compile learner code with `-g` in both build and browser.
- `describeRun` becomes a table keyed on exception class: `ArrayIndexOutOfBoundsException`, `IndexOutOfBoundsException`, `NullPointerException`, `ArithmeticException` (`/ by zero`), `NumberFormatException`, `InputMismatchException`, `NoSuchElementException`, `ClassCastException`, `ConcurrentModificationException`, `StackOverflowError`, `OutOfMemoryError`. Map the first `at <LearnerClass>.method(File.java:N)` frame to a clickable line in the learner's file.
- `rt-cheerpj.md` reports that CheerpJ stack traces have no line numbers and some VM exception messages are missing (third-party reports there). So grade on stdout plus exit code (and exception class if needed), never on the stack trace text.
- `System.exit(n)` must be intercepted by the in-browser runtime and reported as the exit code instead of killing the worker. `exit:` tests work unchanged. In harness mode a learner `System.exit` ends the run early and becomes "N more test(s) did not run".
- Output cap: wrap `System.out`/`System.err` in a counting stream; on overflow throw an `Error` subclass (not an `Exception`, so a learner `catch (Exception e)` cannot swallow it) or terminate the worker.

### 15.7 Compiler errors (friendly.ts for javac)

javac prints `Main.java:12: error: <message>`, then the source line, a caret line and sometimes `symbol:`/`location:` lines; `javax.tools.Diagnostic` gives line and column directly. First rules to write: `';' expected`, `cannot find symbol`, `incompatible types: possible lossy conversion ...`, `incompatible types: X cannot be converted to Y`, `missing return statement`, `variable x might not have been initialized`, `unreachable statement`, `reached end of file while parsing`, `illegal start of expression`, `'else' without 'if'`, `unclosed string literal`, `method m in class C cannot be applied to given types`, `non-static ... cannot be referenced from a static context`, `x has private access in C`, `C is abstract; cannot be instantiated`, `does not override abstract method`, `unreported exception X; must be caught or declared to be thrown`, `bad operand types for binary operator`, the public-class file-name error, and `cannot return a value from method whose result type is void`. String `==` misuse is a `forbid` rule, not a compiler error. Take message wording from the exact javac version the browser runs.

### 15.8 In-browser runtime loading, caching, verify-in-browser

- The manifest + versioned Cache Storage + gzip + `DecompressionStream` + mobile-data prompt pattern transfers as is, if the runtime files are self-hosted (TeaVM-style, per `rt-teavm.md`: about 4.3 MB compressed, measured there). If the runtime must load from a vendor CDN (CheerpJ Community License per `rt-cheerpj.md`), the SW and Cache Storage strategy for the runtime may not be allowed; keep the mobile-data prompt and the "compiler ready" status, and treat offline as unsupported for running code until the licence question is answered.
- Keep the compile worker persistent and warm. The C runner is a cheap fresh worker per Check; a JVM-in-a-worker is expensive to boot (estimate), so prefer one warm runner that is terminated only on timeout and re-created in the background. Run each test with fresh class state (new class loader or new JVM instance), because Java static fields would otherwise leak between tests.
- The 3 s limit should measure program execution only, not runtime boot or class loading; confirm on a mid-range Android phone before fixing the number.
- `verify-wasm` equivalent ("verify-browser") is more important for Java than it was for C, because the runtime's class library or version can diverge from HotSpot. If the runtime runs in Node (TeaVM), mirror `verify-wasm.mjs`; if it needs a browser and network (CheerpJ, per `rt-cheerpj.md`), drive every solution through Playwright. Unlike cpp-arena, run it in CI (at least nightly, or on content changes).

### 15.9 Drill unlocking for Java

Rewrite `features()`: Java keywords instead of C keywords; `import` lines instead of `#include`; capitalized type names (`ArrayList`, `HashMap`, `Scanner`) as features (in C only ALL_CAPS names counted); qualified calls (`Math.max`, `Integer.valueOf`, `System.out.printf`); member calls (`.equals(`, `.size(`); `new X<>`; lambdas `->` and method references `::`; annotations (`@Override`). COMMON set: `public`, `class`, `static`, `void`, `main`, `String`, `args`, `System.out.println`, `int`, `if`, `else`, `for`, `while`, `return`. The word-matching fallback and `after:` override stay.

### 15.10 Prerender, SEO, e2e, Lighthouse, deploy

- Prerender: same script with `programmingLanguage: "Java"`, and a visible attribution and licence line on every page derived from the MOOC (CC BY-NC-SA 4.0 per `/home/user/ref/research/license.md`), plus the runtime credit if CheerpJ is used.
- Bundle budget: cpp-arena ships all content in the main bundle (568 KB gzipped content alone, measured above) against a 900 KB script budget. The MOOC has 262 visible exercises (`/home/user/ref/mooc-outline.txt`) plus long texts; split `content.json` per module (lazy `fetch` or dynamic import) from the start.
- e2e: keep every category; replace C-specific cases with Java ones (uncaught exception message, `System.exit` code, Scanner EOF, multi-file step, package step, harness exception isolation, locale-safe `printf`).
- Lighthouse thresholds and the PR-only rule can be copied; recheck the script budget once the runtime loader is on the page.
- Deploy: copy `deploy.yml` (CUSTOM_DOMAIN/BASE_PATH logic), replacing gdb with `actions/setup-java` pinned to the runtime's Java version.

---

## 16. Gaps in cpp-arena that Java Arena can close

1. `verify:wasm` is not in CI (section 9).
2. The `@@PASS` protocol is spoofable (section 8).
3. Browser console errors are printed but do not fail e2e (section 12).
4. All content ships in the main bundle (section 3.4).
