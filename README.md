# Java Arena

A free, non-commercial site for learning Java in the browser, with **real compiling and running on your own device**. It follows the order and topics of the University of Helsinki's [Java Programming MOOC](https://java-programming.mooc.fi) (parts 1 to 14), with its own lessons and exercises, modeled on [C/C++ Arena](https://cpparena.com).

Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.

## Status

The site is built in batches, one pull request per batch.

| Batch | What | Status |
|---|---|---|
| 1 | Java engine prototype: javac 21 and a JVM running in the browser, fidelity suite, CI | this batch |
| 2 | Site foundation: design, content pipeline, lesson pages, modules 1 and 2 | next |
| 3 to 20 | Parts 1 to 14 of the course, practice, projects, Pro Track, tools, polish | planned |

The plan and the research behind it are in [`docs/research/`](docs/research/README.md), including the full curriculum map.

## How the engine works

- **Compiler**: OpenJDK's javac 21 compiled to WebAssembly (Wasm GC) with [teavm-javac](https://github.com/konsoletyper/teavm-javac) and TeaVM. It compiles against the real Java 21 class library, so it accepts exactly the APIs a real JDK 21 has. See [`engine/compiler/`](engine/compiler/).
- **Runner**: a fork of [Ristretto](https://github.com/theseus-rs/ristretto), a Java virtual machine written in Rust and compiled to WebAssembly, running the real OpenJDK 21 class library. See [`engine/runner/`](engine/runner/).
- **In the page**: a persistent compile worker and a fresh run worker per run, killed when a test case exceeds the time limit. Engine files are downloaded once (asking first when the browser reports mobile data, and on phones and tablets whose browser can't tell), unpacked with `DecompressionStream`, and kept in Cache Storage, so the engine also works offline. See [`src/engine/`](src/engine/).
- **Fidelity**: the site's expected outputs come from a real JDK 21 at build time, so the browser engine must behave identically. [`fidelity/`](fidelity/) holds 35 programs and 18 compile errors; CI runs them on the JDK and in the browser engine and fails on any difference, including cross-checks of each half (browser javac on HotSpot, and CLI javac on the browser runner).

Measured locally in this batch (CI produces the same report, `fidelity/out/report.md`, as a build artifact; see also the READMEs in `engine/`): all 35 fidelity programs and all 18 compile errors identical to JDK 21 (Temurin 21.0.10+7), also when each half of the engine is checked on its own; 118 of 118 runner checks pass in Node and Chromium; the engine download is about 15.2 MB compressed (then cached); in headless Chromium on a 4-core machine a warm compile takes about 10 to 90 ms and Hello World runs in about 0.4 s from click to output. Phone numbers are not measured yet: the prototype page has a benchmark for that.

Licenses and the source offer for the GPL parts are in [`engine/SOURCES.md`](engine/SOURCES.md) and [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md).

## Run locally

Needs Node 22. The reference JDK (Eclipse Temurin 21.0.10+7) is fetched by `scripts/get-jdk.sh` when a script needs it; set `JAVA_HOME` to use another JDK 21.

```bash
npm install        # also copies the built engine into public/engine
npm run dev        # http://localhost:5173/ and /bench/
```

| Script | What it does |
|---|---|
| `npm run build` | Type-checks and builds `dist/` (service worker file list, sitemap) |
| `npm run fidelity:jdk` | Runs the fidelity suite on the local JDK (`fidelity/out/jdk.json`) |
| `npm run fidelity:browser` | Runs the suite through the built site's engine in headless Chromium and compares (`fidelity/out/report.md`) |
| `npm run test:e2e` | Browser tests of the built site: engine, errors and crashes, endless loops, mobile-data prompt, offline, axe (WCAG 2.2 AA) in both themes and at phone widths. `-- --shots dir` saves screenshots |

Rebuilding the engine itself is only needed when changing it: see `engine/compiler/README.md` and `engine/runner/README.md`.

## Deploy

`.github/workflows/deploy.yml` builds and tests every pull request, and publishes to GitHub Pages when a pull request merges into `main`. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions** once. The site is then at `https://<owner>.github.io/<repo>/`; set `CUSTOM_DOMAIN` in the workflow to use your own domain instead.

## License

Site code: MIT (see [LICENSE](LICENSE) for what it covers). Lesson content, once added under `content/`, will be licensed CC BY-NC-SA 4.0, as it follows the CC BY-NC-SA 4.0 licensed MOOC. Third-party components keep their own licenses.
