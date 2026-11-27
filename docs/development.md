# Development

Running Java Arena on your own computer, every npm script, and what CI does on each pull request. For how the site and the engine work, see [Architecture](architecture.md).

Paths written as code (such as `engine/compiler/README.md`) are relative to the root of the repository.

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
| `npm run pro-track-check` | The Pro Track's projects with real Maven (on the PATH, or `MVN`) and a JDK 21: each starter in `pro-track/` compiles and fails its tests, and with its model solution from `pro-track-solutions/` every test passes. `-- <id>` checks one; see [`pro-track/README.md`](../pro-track/README.md) |
| `npm run check-links` | After a build: every internal link in the pre-rendered pages, the sitemap, the manifest and the lesson files resolves (a #fragment to an id on its page, a link to this repository's files to a file that is in it), and every external link there and in `content/` and `pro-track/` goes to a host on the list in [`scripts/check-links.mjs`](../scripts/check-links.mjs) (the MOOC, Oracle, OpenJDK, GitHub, Maven Central, OpenJFX, Adoptium and the like; never a link shortener) |
| `npm run test:e2e` | Browser tests of the built site: pre-rendered pages, lessons (fill-ins, code, hidden tests, rules, hints, progress), the engine, errors and crashes, endless loops, the mobile-data question, offline, moving progress between two phone-sized browsers, projects, the record page, the Pro Track and the topics reference, and the phone pass: every page type at 320, 360, 390 and 412 px in both themes with axe (WCAG 2.2 AA), no sideways scrolling, tap targets of at least 24 x 24 px and a visible focus on everything the Tab key reaches. `-- --shots dir` saves screenshots |
| `node scripts/assets/make-images.mjs` | Draws the lessons' images into `content/assets/` (`--check` only checks that they're up to date) |
| `npm run test:unit` | Unit tests without a browser (`scripts/**/*.test.mjs`): the class diagrams drawn from lesson text, the check of the files a program writes, the lessons' images (the script makes exactly the committed bytes), and the plain-English explanations of mistakes with exceptions, packages and files and in JavaFX programs (with a check that their list of the practice version's classes and methods matches its class files), and moving progress (transfer links and progress files, every merging rule, and QR codes read back by a QR decoder), and the personal record (modules and parts finished, dates, totals, the notice it shows), and the Pro Track's tools (the zip gives the same bytes for the same files, the pom.xml, README and folder rules, Surefire's reports, the site's data), the topics reference's check and search, and the link check |

Rebuilding the engine itself is only needed when changing it: see `engine/compiler/README.md` and `engine/runner/README.md`.

## CI and deploy

`.github/workflows/deploy.yml` builds and tests every pull request, and publishes to GitHub Pages when a pull request merges into `main`. Its jobs:

| Job | What it does | Runs |
|---|---|---|
| `build` | `npm ci`, the unit tests, the fidelity suite on the reference JDK, then `npm run build` (every lesson program checked on the JDK, tsc, the site build, the pre-rendered pages) and the link check (`npm run check-links`); uploads `dist`, `src/generated`, `public/lessons`, `public/images` and `fidelity/out` (with the content check list) as the artifact `site-build`, and on `main` `dist` as the Pages artifact | first |
| `fx-check` | every JavaFX program on real OpenJFX 21, compared with Java Arena's JavaFX (starts no browser: it installs only Chromium's system libraries, for real JavaFX's fonts and text) | after `build` |
| `fidelity-browser` | the fidelity suite in the browser engine, compared with the JDK; report in the artifact `fidelity-report` | after `build` |
| `content-replay` | every lesson program replayed in the browser engine and compared with the JDK, in 3 shards side by side (`CONTENT_SHARD=k/3`: each program in exactly one shard) | after `build` |
| `e2e` | the browser tests, with screenshots in the artifact `screenshots` (one job: its tests depend on each other), except the phone pass | after `build` |
| `phone-pass` | the browser tests of the phone pass (every page type at 320, 360, 390 and 412 px in both themes), which need nothing from the others, with screenshots in `phone-pass-screenshots` | after `build` |
| `pro-track` | `npm run pro-track-check` with a JDK 21 and the runner's Maven, Maven's repository cached; needs nothing from the build | first, beside `build` |
| `lighthouse` | Lighthouse scores against `lighthouserc.cjs` | pull requests, after `build` |
| `deploy` | publishes exactly the `dist` the build job made | `main`, after all of the above |

The check jobs run side by side, so a run takes about as long as the build job plus the longest check, the browser tests. From the step times of the last runs before the split (one job: 52 minutes on `main`, 67 on a pull request), that is about 34 minutes for a pull request and 29 on `main`: the build about 22 (the content build about 20 of them), then the browser tests about 11 with their setup, while each content shard takes about 9. In the repository's **Settings > Pages**, set **Source** to **GitHub Actions** once. The site is then at `https://<owner>.github.io/<repo>/`; set `CUSTOM_DOMAIN` in the workflow to use your own domain instead.
