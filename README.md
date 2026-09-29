# Java Arena

A free, non-commercial site for learning Java in the browser, with **real compiling and running on your own device**. It follows the order and topics of the University of Helsinki's [Java Programming MOOC](https://java-programming.mooc.fi) (parts 1 to 14), with its own lessons and exercises, modeled on [C/C++ Arena](https://cpparena.com).

Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.

## Status

The site is built in batches, one pull request per batch.

| Batch | What | Status |
|---|---|---|
| 1 | Java engine prototype: javac 21 and a JVM running in the browser, fidelity suite, CI | done |
| 2 | Site foundation: design, lesson content pipeline, lesson pages, modules 1 and 2 | done |
| 3 | Rest of MOOC part 1 (modules 3 to 6), the Playground, "What does it print?" challenges, an indentation check | done |
| 4 | MOOC part 2 (modules 7 to 11), challenges whose tests call your methods | done |
| 5 | Practice: Deathmatch drills for parts 1 and 2, interview prep, daily challenge, placement quiz | this batch |
| 6 | MOOC part 3 (modules 12 to 16) and its drills | next |
| 7 to 20 | Parts 4 to 14 of the course, progress sync, projects, Pro Track, tools, polish | planned |

The plan and the research behind it are in [`docs/research/`](docs/research/README.md), including the full curriculum map.

## The site

- **Pages**: a home page, the course plan (all 59 planned modules; the ones not written yet are marked), a page per module, a lesson page per step, settings and about. React 18 with React Router; every page is also pre-rendered as plain HTML for search engines and link previews (`scripts/prerender.mjs`), with a sitemap. The design is adapted from C/C++ Arena's: light and dark themes, four text sizes, and a desktop layout where the lesson and the editor fill the window.
- **Lessons**: each step has a short lesson and three challenges: fill-in blanks, programs to fix, programs to write, or "What does it print?" (read a program and type each line it prints). Programs are graded by input and output tests (some hidden, so answers can't be typed in directly), or by tests that call the learner's methods directly (such as `countdown(3);`), plus optional rules about the code (for example "use exactly three println statements"). An indentation check fails the challenges that teach indentation and shows a note everywhere else. Hints unlock one at a time and a solution after all hints or three checks. Compile errors and crashes get plain-English explanations. On phones a row of symbol keys (including `sout` for `System.out.println();`) sits under the editor. Every challenge has a "Report a problem" link that opens a GitHub issue with the code filled in.
- **Practice**: Deathmatch, endless quick drills (predict the output, fill the blank, spot the bug, will it compile, pick one, and a "boss rep" program to write every 8th rep) that unlock as lesson steps are finished, in four modes: one life, three lives, spaced review of due drills (Leitner boxes), and interview prep, which is open to everyone. Also a daily challenge (the same drill for everyone on a date) and a placement quiz that can skip modules. Every drill's answer comes from the reference JDK at build time: the real output, or javac's verdict.
- **Playground**: write and run any program with your own input; it's saved in the browser and can be shared as a link that carries the program and its input.
- **Content**: lessons are YAML files in [`content/`](content/README.md). The build compiles and runs every solution and example with the reference JDK, so the expected outputs are real, and then CI replays them in the browser engine.
- **Progress** is saved in the browser (localStorage). The site works offline once visited (a service worker keeps the pages; the engine keeps its own copy) and can be installed as an app.

## How the engine works

- **Compiler**: OpenJDK's javac 21 compiled to WebAssembly (Wasm GC) with [teavm-javac](https://github.com/konsoletyper/teavm-javac) and TeaVM. It compiles against the real Java 21 class library, so it accepts exactly the APIs a real JDK 21 has. See [`engine/compiler/`](engine/compiler/).
- **Runner**: a fork of [Ristretto](https://github.com/theseus-rs/ristretto), a Java virtual machine written in Rust and compiled to WebAssembly, running the real OpenJDK 21 class library. See [`engine/runner/`](engine/runner/).
- **In the page**: a persistent compile worker and a fresh run worker per run, killed when a test case exceeds the time limit. Engine files are downloaded once (asking first when the browser reports mobile data, and on phones and tablets whose browser can't tell), unpacked with `DecompressionStream`, and kept in Cache Storage, so the engine also works offline. See [`src/engine/`](src/engine/).
- **Fidelity**: the site's expected outputs come from a real JDK 21 at build time, so the browser engine must behave identically. [`fidelity/`](fidelity/) holds 35 programs and 18 compile errors; CI runs them on the JDK and in the browser engine and fails on any difference, including cross-checks of each half (browser javac on HotSpot, and CLI javac on the browser runner).

Measured locally when the engine was built in Batch 1 (CI runs the fidelity suite again on every pull request and keeps its report, `fidelity/out/report.md`, as a build artifact; see also the READMEs in `engine/`): all 35 fidelity programs and all 18 compile errors identical to JDK 21 (Temurin 21.0.10+7), also when each half of the engine is checked on its own; 118 of 118 runner checks pass in Node and Chromium; the engine download is about 15.2 MB compressed (then cached); in headless Chromium on a 4-core machine a warm compile takes about 10 to 90 ms and Hello World runs in about 0.4 s from click to output. On one real phone (Android, Firefox 155, 8 cores, the engine test page's benchmark, 29 September 2026): engine start 2.0 s on the first visit including the download, a warm compile about 20 ms, Hello World 0.5 s from tap to output, a typical lesson program 0.8 s from Check to output, 10 million loop steps 1.3 s, and an endless loop stopped 12 ms after the time limit. That is one device; other phones and browsers will differ.

Licenses and the source offer for the GPL parts are in [`engine/SOURCES.md`](engine/SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Run locally

Needs Node 22. The reference JDK (Eclipse Temurin 21.0.10+7) is fetched by `scripts/get-jdk.sh` when a script needs it; set `JAVA_HOME` to use another JDK 21.

```bash
npm install        # also copies the built engine into public/engine
npm run dev        # checks the lessons, then serves http://localhost:5173/
```

| Script | What it does |
|---|---|
| `npm run content` | Checks every lesson on the reference JDK and writes `src/generated/` |
| `npm run build` | Checks the lessons, type-checks and builds `dist/` (pre-rendered pages, service worker, sitemap) |
| `npm run content:browser` | Replays every lesson program in the built site's engine in headless Chromium and compares with the JDK |
| `npm run fidelity:jdk` | Runs the fidelity suite on the local JDK (`fidelity/out/jdk.json`) |
| `npm run fidelity:browser` | Runs the suite through the built site's engine in headless Chromium and compares (`fidelity/out/report.md`) |
| `npm run test:e2e` | Browser tests of the built site: pre-rendered pages, lessons (fill-ins, code, hidden tests, rules, hints, progress), the engine, errors and crashes, endless loops, the mobile-data question, offline, axe (WCAG 2.2 AA) on every page type in both themes and at phone widths. `-- --shots dir` saves screenshots |

Rebuilding the engine itself is only needed when changing it: see `engine/compiler/README.md` and `engine/runner/README.md`.

## Deploy

`.github/workflows/deploy.yml` builds and tests every pull request, and publishes to GitHub Pages when a pull request merges into `main`. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions** once. The site is then at `https://<owner>.github.io/<repo>/`; set `CUSTOM_DOMAIN` in the workflow to use your own domain instead.

## License

Site code: MIT (see [LICENSE](LICENSE) for what it covers). Lesson content in `content/` is licensed CC BY-NC-SA 4.0 ([content/README.md](content/README.md)), as it follows the CC BY-NC-SA 4.0 licensed MOOC. Third-party components keep their own licenses ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
