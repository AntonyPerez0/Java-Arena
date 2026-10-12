# Java Arena

A free, non-commercial site for learning Java in the browser, with **real compiling and running on your own device**. It follows the order and topics of the University of Helsinki's [Java Programming MOOC](https://java-programming.mooc.fi) (parts 1 to 14), with its own lessons and exercises, modeled on [C/C++ Arena](https://cpparena.com).

Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark and JavaFX a trademark of Oracle and/or its affiliates.

## Status

The site is built in batches, one pull request per batch.

| Batch | What | Status |
|---|---|---|
| 1 | Java engine prototype: javac 21 and a JVM running in the browser, fidelity suite, CI | done |
| 2 | Site foundation: design, lesson content pipeline, lesson pages, modules 1 and 2 | done |
| 3 | Rest of MOOC part 1 (modules 3 to 6), the Playground, "What does it print?" challenges, an indentation check | done |
| 4 | MOOC part 2 (modules 7 to 11), challenges whose tests call your methods | done |
| 5 | Practice: Deathmatch drills for parts 1 and 2, interview prep, daily challenge, placement quiz | done |
| 6 | MOOC part 3 (modules 12 to 16) and its drills, lessons that show a crash, plainer crash explanations | done |
| 7 | MOOC part 4 (modules 17 to 20: objects, classes, reading files), an editor for programs of several files | done |
| 8 | MOOC part 5 (modules 21 to 23: designing classes and overloading, references and null, objects working together), undo history per file | done |
| 9 | MOOC part 6 (modules 24 to 26: lists inside objects, a text user interface, troubleshooting and unit testing), JUnit 4 in the browser | done |
| 10 | MOOC part 7 (modules 27 to 29: procedural and object-oriented programs, sorting and searching, larger programs), the end of Java Programming I; lesson pages load only their own step | done |
| 11 | MOOC part 8 (modules 30 to 33: a recap of parts 1 to 7, hash maps, equals and hashCode, grouping data), the start of Java Programming II; Continue buttons open their lesson at once, a keyboard user keeps their place when the app starts | done |
| 12 | MOOC part 9 (modules 34 to 36: inheritance and abstract classes, interfaces, polymorphism), plain-English explanations for part 9 mistakes | done |
| 13 | MOOC part 10 (modules 37 to 39: streams and lambdas, Comparable and Comparator, StringBuilder, regular expressions, enums and iterators); plain-English explanations for part 10 mistakes | done |
| 13b | Java colors: Java red and blue instead of orange, a new logo of our own (a red and blue tile with a white J, clearly not Oracle's cup logo), and small fixes found on the way | done |
| 14 | MOOC part 11 (modules 40 to 43: class diagrams, packages, exceptions, writing files); class diagrams in lessons, package folders in the editor, checks on the files a program writes; plain-English explanations for part 11 mistakes, files written by a program shown after a run, output shown in the order it was printed | done |
| 15 | MOOC part 12 (modules 44 to 47: generics, your own list and hash map, random numbers, two-dimensional arrays); plain-English explanations for part 12 mistakes, and a browser engine fix for grids of true and false values | done |
| 16 | MOOC part 13 (modules 48 to 50: windows and layouts, events, multiple views) with Java Arena's own practice version of JavaFX: the page draws your window and runs your program again for each click; checked against real OpenJFX 21 on every model solution; plain-English explanations for part 13 mistakes | done |
| 17a | MOOC part 14.1 and 14.2 (modules 51 and 52: charts, a slider, drawing on a canvas, the mouse, images as pixels; sound is shown but not played) with the practice JavaFX extended to match: the page draws charts, canvases and images; Java Arena's own PNG images for the lessons | done |
| 17b | MOOC part 14.3 to 14.5 (modules 53 and 54): the Asteroids game drawn with shapes, keys and frames in the practice JavaFX; module 54 with an in-memory DAO that you write, and Maven, `pom.xml`, JDBC and H2 shown only as code to read and run on your own computer; the end of the course, with a link to the MOOC's conclusion | done |
| 18 | Extra modules 55 to 59, not part of the MOOC and marked "Extra" on the site: recursion, records, switch with var and text blocks, pattern matching and sealed types, linked lists, stacks, queues and trees; plain-English explanations for their mistakes; CI split into jobs that run side by side | this batch |
| 19 | Progress sync between devices (transfer link, file export and import, optional GitHub Gist), multi-step projects, certificates | planned |
| 20 | Pro Track (projects on your own computer, graded by GitHub Actions with Maven and JUnit), a topics reference, a final polish and accessibility pass | planned |

The plan and the research behind it are in [`docs/research/`](docs/research/README.md), including the full curriculum map.

## The site

- **Pages**: a home page, the course plan (all 59 planned modules; the ones not written yet are marked), a page per module, a lesson page per step, settings and about. React 18 with React Router; every page is also pre-rendered as plain HTML for search engines and link previews (`scripts/prerender.mjs`), with a sitemap. The design is adapted from C/C++ Arena's: light and dark themes, four text sizes, and a desktop layout where the lesson and the editor fill the window.
- **Lessons**: each step has a short lesson and three challenges: fill-in blanks, programs to fix, programs to write, or "What does it print?" (read a program and type each line it prints). Programs are graded by input and output tests (some hidden, so answers can't be typed in directly), or by tests that call the learner's methods directly (such as `countdown(3);`), plus optional rules about the code (for example "use exactly three println statements"). An indentation check fails the challenges that teach indentation and shows a note everywhere else. Hints unlock one at a time and a solution after all hints or three checks. Compile errors and crashes get plain-English explanations. On phones a row of symbol keys (including `sout` for `System.out.println();`) sits under the editor. Every challenge has a "Report a problem" link that opens a GitHub issue with the code filled in.
- **Practice**: Deathmatch, endless quick drills (predict the output, fill the blank, spot the bug, will it compile, pick one, and a "boss rep" program to write every 8th rep) that unlock as lesson steps are finished, in four modes: one life, three lives, spaced review of due drills (Leitner boxes), and interview prep, which is open to everyone. Also a daily challenge (the same drill for everyone on a date) and a placement quiz that can skip modules. Every drill's code is compiled and run on the reference JDK at build time. Predict-the-output and will-it-compile answers are what the JDK really prints or says; the fixed line of a spot-the-bug drill must change what the program does; pick-one answers are written by hand, and the ones about output are checked against it.
- **Playground**: write and run any program with your own input, with classes in files of their own if you like, and sample images in its folder ("Add a sample image"); it's saved in the browser and can be shared as a link that carries the program, its input and the names of its sample images.
- **Programs of several files**: from part 4 on, a challenge can have a class in its own file next to `Main.java`. The editor shows a tab per file and marks javac's errors in each; tests can create objects and call their methods, and can give the program files to read.
- **Unit tests with JUnit**: part 6's lessons use JUnit 4.13.2, which the browser downloads the first time a program uses it. A challenge can run the learner's tests on the class as it is and on versions with bugs (the tests must pass on the first and catch the others), or check the learner's class with given tests. Results show a report of every test, with JUnit's own failure messages.
- **Content**: lessons are YAML files in [`content/`](content/README.md). The build compiles and runs every solution and example with the reference JDK, so the expected outputs are real, and then CI replays them in the browser engine. The image files that part 14's programs read are Java Arena's own, drawn pixel by pixel by [`scripts/assets/make-images.mjs`](scripts/assets/make-images.mjs) into [`content/assets/`](content/assets/README.md); a file that isn't text is never shown as text anywhere on the site. Maven and databases need your own computer, so module 54's in-page programs use a data access object kept in memory.
- **Progress** is saved in the browser (localStorage). The site works offline once visited (a service worker keeps the pages; the engine keeps its own copy) and can be installed as an app.

## How the engine works

- **Compiler**: OpenJDK's javac 21 compiled to WebAssembly (Wasm GC) with [teavm-javac](https://github.com/konsoletyper/teavm-javac) and TeaVM. It compiles against the real Java 21 class library, so it accepts exactly the APIs a real JDK 21 has. See [`engine/compiler/`](engine/compiler/).
- **Runner**: a fork of [Ristretto](https://github.com/theseus-rs/ristretto), a Java virtual machine written in Rust and compiled to WebAssembly, running the real OpenJDK 21 class library. See [`engine/runner/`](engine/runner/).
- **In the page**: a persistent compile worker and a fresh run worker per run, killed when a test case exceeds the time limit. Engine files are downloaded once (asking first when the browser reports mobile data, and on phones and tablets whose browser can't tell), unpacked with `DecompressionStream`, and kept in Cache Storage, so the engine also works offline. See [`src/engine/`](src/engine/).
- **Libraries**: a program that uses `org.junit` gets JUnit 4.13.2 on its class path, and one that uses `javafx.` gets Java Arena's practice version of JavaFX: a small implementation written for this site (not OpenJFX's code) of only the classes and methods the GUI lessons use (real JavaFX doesn't run on Java Arena's engine, Ristretto, or on the other browser Java engines that [`docs/research/`](docs/research/) looked at). `Application.launch` builds the window, replays the event lines listed in `.arena/events.txt` (clicks and typing, and for games `press key X`, `release key X`, `key X` and `frames N`, where frames run the started AnimationTimers), writes the windows as JSON to `.arena/window.json` and ends the program as if its windows were closed. The page draws the windows approximately from that JSON, as a plain desktop window in light colors ([`src/components/window-drawing.ts`](src/components/window-drawing.ts), shared with the pre-rendered pages): in a lesson's `java window` example, on the task card and in the results (the expected window next to the learner's), and in a free run (the Playground, a lesson's "Run with my input"), where the buttons and fields work: each click or typing runs the compiled program again from the start with all the events so far. Part 14's nodes are drawn too: charts as SVG in JavaFX's default colors, each series with a symbol shape of its own ([`window-charts.ts`](src/components/window-charts.ts)), canvases by replaying their recorded calls on an HTML canvas (as SVG in the pre-rendered pages, [`window-canvas.ts`](src/components/window-canvas.ts)), image views from their pixels, and sliders; in a free run a slider is a real one that sends its value when let go, and a canvas with mouse handlers takes a gesture of the mouse, a finger or the keyboard and sends it as one batch when the finger lifts. Part 14.3's shapes (polygons, circles, rectangles, lines and text) are drawn as SVG at their real coordinates, and the frames a game ran are played back by an animation player under the window ([`window-player.ts`](src/components/window-player.ts)): play and pause, step, a slider to scrub, restart and a speed choice, with no autoplay when the user prefers reduced motion. A game doesn't run live: a free run of a program with key handlers gets a key row where each key is held or not, Run 30, 60 or 120 frames buttons and a Tap menu, and one line under it says the game doesn't run live here. The browser downloads a library the first time a program uses it. See [`engine/libraries/`](engine/libraries/).
- **Fidelity**: the site's expected outputs come from a real JDK 21 at build time, so the browser engine must behave identically. [`fidelity/`](fidelity/) holds 52 programs (four of them JavaFX programs whose window JSON must match byte for byte, one with charts, a canvas, the mouse and PNG images, one a game with shapes, keys, timers and the frames of its animation, and one that also guards the engine's speed with a time ceiling; one covers the topics of the extra modules: newer Java features (records, sealed types, switch patterns and text blocks) and recursion and linked structures) and 92 compile errors; CI runs them on the JDK and in the browser engine and fails on any difference, including cross-checks of each half (browser javac on HotSpot, and CLI javac on the browser runner).
- **Real JavaFX**: `npm run fx-check` runs every program that uses JavaFX (each lesson's model solutions and examples with their clicks and typing, the JavaFX fidelity program, and probes that go through the whole API) on real OpenJFX 21 without a screen and on Java Arena's JavaFX, and fails when the output or the window differs. CI runs it on every pull request. See [`scripts/fx-check/`](scripts/fx-check/).

Measured locally when the engine was built in Batch 1 (CI runs the fidelity suite again on every pull request and keeps its report, `fidelity/out/report.md`, as a build artifact; see also the READMEs in `engine/`): all 35 fidelity programs and all 18 compile errors identical to JDK 21 (Temurin 21.0.10+7), also when each half of the engine is checked on its own; 118 of 118 runner checks pass in Node and Chromium; the engine download is about 15.2 MB compressed (then cached); in headless Chromium on a 4-core machine a warm compile takes about 10 to 90 ms and Hello World runs in about 0.4 s from click to output. On one real phone (Android, Firefox 155, 8 cores, the engine test page's benchmark, 29 September 2026): engine start 2.0 s on the first visit including the download, a warm compile about 20 ms, Hello World 0.5 s from tap to output, a typical lesson program 0.8 s from Check to output, 10 million loop steps 1.3 s, and an endless loop stopped 12 ms after the time limit. That is one device; other phones and browsers will differ.

Licenses and the source offer for the GPL parts are in [`engine/SOURCES.md`](engine/SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Run locally

Needs Node 22.18 or newer (the build scripts import `src/grader/window.ts`, `src/grader/assets.ts` and `src/components/window-drawing.ts` as they are, which Node runs by stripping their types). The reference JDK (Eclipse Temurin 21.0.10+7) is fetched by `scripts/get-jdk.sh` when a script needs it; set `JAVA_HOME` to use another JDK 21.

```bash
npm install        # also copies the built engine into public/engine
npm run dev        # checks the lessons, then serves http://localhost:5173/
```

| Script | What it does |
|---|---|
| `npm run content` | Checks every lesson on the reference JDK and writes `src/generated/` and the lesson files in `public/lessons/` (one per step, loaded when the step is opened) |
| `npm run build` | Checks the lessons, type-checks and builds `dist/` (pre-rendered pages, service worker, sitemap) |
| `npm run content:browser` | Replays every lesson program in the built site's engine in headless Chromium and compares with the JDK |
| `npm run fidelity:jdk` | Runs the fidelity suite on the local JDK (`fidelity/out/jdk.json`) |
| `npm run fidelity:browser` | Runs the suite through the built site's engine in headless Chromium and compares (`fidelity/out/report.md`) |
| `npm run fx-check` | Runs every program that uses JavaFX on real OpenJFX 21 (headless) and on Java Arena's JavaFX and compares the output and the windows (after `npm run content`, which lists the lesson programs; downloads the pinned jars once) |
| `npm run test:e2e` | Browser tests of the built site: pre-rendered pages, lessons (fill-ins, code, hidden tests, rules, hints, progress), the engine, errors and crashes, endless loops, the mobile-data question, offline, axe (WCAG 2.2 AA) on every page type in both themes and at phone widths. `-- --shots dir` saves screenshots |
| `node scripts/assets/make-images.mjs` | Draws the lessons' images into `content/assets/` (`--check` only checks that they're up to date) |
| `npm run test:unit` | Unit tests without a browser (`scripts/**/*.test.mjs`): the class diagrams drawn from lesson text, the check of the files a program writes, the lessons' images (the script makes exactly the committed bytes), and the plain-English explanations of mistakes with exceptions, packages and files and in JavaFX programs (with a check that their list of the practice version's classes and methods matches its class files) |

Rebuilding the engine itself is only needed when changing it: see `engine/compiler/README.md` and `engine/runner/README.md`.

## Deploy

`.github/workflows/deploy.yml` builds and tests every pull request, and publishes to GitHub Pages when a pull request merges into `main`. Its jobs:

| Job | What it does | Runs |
|---|---|---|
| `build` | `npm ci`, the unit tests, the fidelity suite on the reference JDK, then `npm run build` (every lesson program checked on the JDK, tsc, the site build, the pre-rendered pages); uploads `dist`, `src/generated`, `public/lessons`, `public/images` and `fidelity/out` (with the content check list) as the artifact `site-build`, and on `main` `dist` as the Pages artifact | first |
| `fx-check` | every JavaFX program on real OpenJFX 21, compared with Java Arena's JavaFX (starts no browser: it installs only Chromium's system libraries, for real JavaFX's fonts and text) | after `build` |
| `fidelity-browser` | the fidelity suite in the browser engine, compared with the JDK; report in the artifact `fidelity-report` | after `build` |
| `content-replay` | every lesson program replayed in the browser engine and compared with the JDK, in 3 shards side by side (`CONTENT_SHARD=k/3`: each program in exactly one shard) | after `build` |
| `e2e` | the browser tests, with screenshots in the artifact `screenshots` (one job: its tests depend on each other) | after `build` |
| `lighthouse` | Lighthouse scores against `lighthouserc.cjs` | pull requests, after `build` |
| `deploy` | publishes exactly the `dist` the build job made | `main`, after all of the above |

The check jobs run side by side, so a run takes about as long as the build job plus the longest check, the browser tests. From the step times of the last runs before the split (one job: 52 minutes on `main`, 67 on a pull request), that is about 34 minutes for a pull request and 29 on `main`: the build about 22 (the content build about 20 of them), then the browser tests about 11 with their setup, while each content shard takes about 9. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions** once. The site is then at `https://<owner>.github.io/<repo>/`; set `CUSTOM_DOMAIN` in the workflow to use your own domain instead.

## License

Site code: MIT (see [LICENSE](LICENSE) for what it covers). Lesson content in `content/` is licensed CC BY-NC-SA 4.0 ([content/README.md](content/README.md)), as it follows the CC BY-NC-SA 4.0 licensed MOOC. Third-party components keep their own licenses ([THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)).
