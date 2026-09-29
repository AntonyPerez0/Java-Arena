# Reference UI: the user-facing side of C/C++ Arena (and what changes for Java Arena)

Prepared 2026-09-28 by the ref-ui research agent. Research only. Every claim about the reference site cites a file under `/home/user/antonyperez0/cpp-arena` (paths below are relative to that repo unless absolute). Build-side details (content build, compiler, grader internals, SEO, e2e, workflows) are covered in `/home/user/ref/research/ref-core.md`; runtime choices in `rt-cheerpj.md` and `rt-teavm.md` in the same folder. Numbers marked "counted" were counted in the repo with grep or ls during this research.

## 1. App shell and routes

`src/main.tsx` rewrites old `#/` hash links to real paths, calls `startAutoSync()` (Gist sync), registers `public/sw.js` in production, and renders `<App/>`. `src/App.tsx` uses `BrowserRouter` with `basename` from `import.meta.env.BASE_URL`.

Routes (`src/App.tsx` lines 216 to 234):

| Path | Page file |
|---|---|
| `/` | `src/pages/Home.tsx` (landing; full-width `main-full`) |
| `/learn` | `src/pages/Learn.tsx` (curriculum accordion) |
| `/learn/:moduleId/:stepKey` | `src/pages/StepPage.tsx` (slug, or old number that redirects) |
| `/deathmatch` | `src/pages/Deathmatch.tsx` |
| `/daily` | `src/pages/Daily.tsx` |
| `/projects`, `/projects/:projectId` | `Projects.tsx`, `ProjectPage.tsx` |
| `/pro`, `/pro/:projectId` | `Pro.tsx`, `ProPage.tsx` |
| `/profile` | `Profile.tsx` (stats, appearance, sync, reset, compiler) |
| `/placement` | `Placement.tsx` |
| `/certificate` | `Certificate.tsx` (also `#view=` shared view) |
| `/next` | `Next.tsx` |
| `/playground` | `Playground.tsx` (also `#code=` share links) |
| `/topics`, `/topics/:slug` | `Topics.tsx` (`TopicIndex`, `TopicPage`) |
| `/visualize`, `/visualize/:id` | `Visualize.tsx` (`VisualIndex`, `VisualPage`) |
| `*` | `NotFound.tsx` |

Header (`App.tsx` `Header`): brand, NAV of Learn, Deathmatch, Daily, Projects, Playground, Pro, Profile; a `nav-extra` block (Topics, Watch code run, Placement quiz, Theme) that is only shown inside the phone menu; right side has `CompilerBadge compact`, `ThemeToggle`, a "Start learning" button and a menu button (`aria-expanded`, `aria-controls="main-nav"`, Escape closes and returns focus to it). Footer has four columns (Learn, Practice, Tools, Project) with "Report a problem" linking to `${REPO_URL}/issues/new` and the line "Your progress stays in your browser unless you choose to sync it."

`src/lib/title.ts` sets `document.title` to `"<page> | C/C++ Arena"` on every page.

## 2. Design system (`src/styles.css`)

- Tokens (lines 23 to 161): shared `--sans` (Inter Variable), `--mono` (JetBrains Mono Variable), radii 12/8/18px, `--accent #f59e0b`, `--header-h 3.75rem`, `--scale 1`. Dark theme is the default (`:root, :root[data-theme="dark"]`), light theme under `:root[data-theme="light"]`. Each theme defines surfaces (`--bg --bg2 --panel --panel2 --panel3`), lines, text (`--text --text2 --muted`), status colors (`--good --bad --warn`), language tags (`--c` blue, `--cpp` purple), result panels (`--pass-* --fail-* --hint-*`), Deathmatch (`--dm-bg --dm-fg`), blank input background, and seven syntax colors (`--tk-kw type str num com pre fn`). The header comment says every text color keeps at least 4.5:1 contrast.
- Fonts are self-hosted from `@fontsource-variable` (Latin only) so offline works (`styles.css` lines 7 to 21; `README.md` "Design").
- Text size: `html { font-size: calc(16px * var(--scale)) }`; at 1200px and up `16.5px * scale`, at 1700px and up `17.5px * scale` (`styles.css` "large screens"). Scales are 1, 1.125, 1.25, 1.4 labelled Default, Large, Larger, Largest (`src/lib/appearance.ts` `TEXT_SIZES`).
- Theme: `settings.theme` is `system | dark | light`; `useAppearance()` writes `data-theme` on `<html>`, sets `--scale`, and updates `<meta name="theme-color">` (`src/lib/appearance.ts`). An inline script in `index.html` applies both before first paint by reading `localStorage["cpp-arena-v1"].settings`, so there is no flash. The header toggle flips dark/light explicitly; the Profile page has the three-way radio group (`Profile.tsx` "Appearance").
- Components are plain class names (`.btn`, `.btn-primary`, `.btn-brand`, `.card`, `.pill`, `.chip`, `.banner-pass/fail`, `.console`, `.codeview`), icons from `lucide-react`, logo drawn inline in `src/components/Brand.tsx` (amber gradient tile with a "C" and a plus).
- Breakpoints: 1023px (header becomes menu), 960px (step page goes single column; symbol bar shows), 640px (phone paddings, smaller code font 0.8125rem, theme toggle moves into the menu), 600px (task input/output boxes stack), 374px (brand name hidden, mark only).

## 3. Lesson step page layout

Files: `src/pages/StepPage.tsx`, `src/components/TaskCard.tsx`, `src/components/Workbench.tsx`, `styles.css` blocks "step page", "workbench", "desktop: the lesson and the editor fill the window" and "lesson challenges and the task card".

Structure: breadcrumbs, then `.step-grid` with two children: `<aside class="step-text">` (step counter "Step N of M" plus a "done" chip, `<h1>` title, lesson Markdown with headings shifted to start at h2, "Watch it run" cards for linked visualizations, and a row of step dots) and `<section class="step-work">` (pass banner, challenge tabs, `TaskCard`, `Workbench`, Previous and Next/Skip links).

The lesson text never contains the task: the build splits the YAML `text` at `**Your turn:**`; everything after it becomes `step.task` and is shown only in the task card (`scripts/build-content.mjs` lines 282 to 289).

Desktop (min-width 961px):
- Grid columns `minmax(300px, 5fr) 7fr`, `align-items: stretch`.
- Both columns get `height: calc(100vh - var(--header-h) - 5rem)`. The lesson column is `position: sticky` with `overflow: auto`, so the lesson scrolls on its own.
- The work column is a flex column with `overflow-y: auto`. `.workbench` is `display: contents`, so the editor, action row, results and hints become direct flex items. Every item is `flex: none` except the editor (or fill-in code view), which is `flex: 0 1 auto; min-height: 9rem`. CodeMirror has no fixed height: it is as tall as its code (auto-height), and when the column runs out of room it shrinks and scrolls inside `.cm-scroller`, so the task card, the Check button and the Hint button stay on screen.
- Once results exist (`.step-work:has(.results)`), the editor stops shrinking and the column itself scrolls; after Check the results are scrolled into view with `scrollIntoView({block: "nearest"})`, smooth unless reduced motion (`Workbench.tsx` lines 71 to 74).
- The "complete" banner with its Next button is `position: sticky; top: 0` in the work column.
- Editor minimum height: `minHeight="10rem"` from Workbench; 12rem at 1200px and up.

Phone and tablet (max-width 960px): one column; `.step-text` becomes `position: static; max-height: none`, so the page reads lesson first, then task card, editor, symbol bar, actions, results, hints. The symbol bar is sticky at the bottom of the workbench. At 640px and below the step text and cards get smaller padding and the expected/got comparison stacks.

Task card (`TaskCard.tsx`): heading "Your task" (`id="task-h"`, `tabIndex=-1`), "Challenge k of n" when there are several, the task Markdown, a note for fill steps ("Type your answers into the highlighted blanks"), then for stdout exercises the first visible test's command-line args, Input and Expected output boxes (two columns when there is input), and "N more tests use other inputs, some of them hidden so the answer can't be hard-coded". For harness exercises it lists up to 8 check names ("The tests check"). It removes a fenced block or an "Input `a` prints `b`." sentence from the task text when that exact example is already shown in the boxes (`withoutBlock`, `withoutExample`).

Actions row: Check (`aria-keyshortcuts="Control+Enter Meta+Enter"`, label changes to "Waiting for compiler..." or "Compiling..."), "Run with my input" (stdout code steps only; opens a stdin textarea and free run that also passes the first test's files and args), Reset (confirm dialog).

## 4. Challenges and the step completion rule

A step is `[step, ...step.more]` challenges (`StepPage.tsx` `challengesOf`). With more than one, a `nav.challenges` row of pill tabs shows "Challenge 1/2/3" with a check icon when done and `aria-current="step"` on the current one. The page opens on the first unfinished challenge. Progress: challenge 1 passing sets `firstDone`, challenge k (k >= 1) sets `parts[k].done`; each challenge keeps its own `code`, `blanks` and `hintsUsed` (`src/state/store.ts` `StepProgress`, `PartProgress`).

`onPass` (`StepPage.tsx` lines 61 to 99): if any challenge is still open, the banner says "Challenge k of n complete" with a "Next challenge" button (focus moves to the task heading). Only when every challenge has passed is `done: true` written, with `doneAt` (first time) and `clean` (no hints on any challenge and no solution peek). The banner then says "Module complete: <title>" (with a Share button for a module share card), or "Step complete: N new Deathmatch drills unlocked", or "Step complete", and offers "Next step". Old saves where `done` predates challenges still count challenge 1 as done.

## 5. Hints, show solution, require/forbid feedback

`Workbench.tsx`:
- Hints are revealed one at a time with a "Hint (k/n)" button; the count is saved per step or challenge (`onHint` to `patchStep`/`patchPart`). After 2 failed attempts the Hint button pulses (`.pulse`).
- "Show solution" appears when `hintsUsed >= hints.length || attempts >= 3` (line 108). `attempts` is component state, so it resets on reload. The solution is labelled "reference solution (type it in yourself; that is the rep)"; fill steps also get "Fill the blanks for me". Revealing sets `sawSolution`, which makes the step not "clean".
- Require/forbid rules are regexes run against the code with comments and string/char literals stripped (`src/grader/assemble.js` `stripForRules`, `checkRules`). Failures show as a list in an amber `.rules` box above the test list (`Results.tsx`), for example "Use a `for` loop." (`content/lessons/06-c-loops.yaml` line 211) or forbid `printf[\s\S]*printf` with "Use a single printf call" (`content/lessons/01-c-hello.yaml` line 260). A step passes only if all tests pass and no rule fails (`grade.ts` line 91). Harness steps also get "Remove your main() function..." when the learner wrote one.
- Results (`Results.tsx`): pass/fail banner, compile errors as up to 4 friendly diagnostics (message, line, plain-English explanation, "in the hidden test code" note) with "Show full compiler output", per-test rows with expected vs "you printed / returned", run notes (timeouts, crashes, exit codes), collapsible warnings, program output, and "compiled in X s". Diagnostics are also shown inline in CodeMirror via `@codemirror/lint` (`CodeEditor.tsx`).

## 6. Fill-in-the-blank UI

`src/components/FillCode.tsx`: the template is read-only highlighted code with an `<input class="blank">` per `[[answer]]` (alternatives separated by U+2016, `assemble.js` `BLANK_RE`, `parseTemplate`). Each input is sized to `max(3, typed length, answer length) + 1.5ch`, labelled "Blank i of n in the code", has spellcheck/autocorrect/autocapitalize off, and the first one is focused without scrolling. Enter moves to the next blank; Enter on the last blank or Ctrl/Cmd+Enter submits. Grading compiles and runs the filled program (`fillTemplate` then `grade`), not a string compare; after a failed check, blanks that match none of the accepted alternatives (whitespace-insensitive) get `.blank-wrong` and `aria-invalid`. Fill steps show a "fill in" tag in the curriculum list (`Learn.tsx`).

## 7. Deathmatch

Files: `src/pages/Deathmatch.tsx`, `src/deathmatch/engine.ts`, `src/deathmatch/Reps.tsx`.

Modes (`Lobby`): Deathmatch (1 life, "Counts toward your rank", Enter starts it), Casual (3 lives; a miss resets the streak and shows the explanation), Warm-up (spaced review: only drills that are due, 3 lives, score is "cleared" count, the streak is not reset on a miss, ends with a "Warm-up cleared" screen when nothing is due), Interview prep (the `interview` topic pool, 3 lives, open to everyone). `lives(mode)` is 1 for deathmatch, else 3 (`engine.ts`).

Unlocking: a drill is in play once the lesson step that teaches it is done, its module was skipped by the placement quiz, or it was already practiced (`src/state/derived.ts` `drillUnlocked`); the build works out each drill's step from the features it uses (`scripts/drill-steps.mjs`). A "Maps (topics)" chip list filters modules (all / C only / C++ only; locked chips disabled with a lock icon and "open/total" counts). Toggles: boss reps, sound, unlock every topic, single-key shortcuts.

Picking (`pickNext`): every 8th rep (`BOSS_EVERY = 8`, rep index 7, 15, ...) is a boss if bosses exist and the toggle is on. Otherwise a weighted random pick: unseen drill weight 4, seen drill weight `6 - box`, plus 2 if due; recent drills (up to 12, at most half the pool) are avoided. Warm-up picks a random due drill not seen recently.

Spaced repetition (`recordRep`): Leitner boxes 1 to 5 with intervals `[0, 0.5, 1, 3, 7, 16]` days; correct moves up one box (two on a first-ever correct), wrong goes to box 1; `due = now + interval`. Each rep also increments `dm.reps`, `dm.kills`, `dm.bossKills` and `dm.days[today]`.

Drill types and instant grading (`checkAnswer`, `Reps.tsx`), with counts from `content/drills/*.yaml` (counted: 657 total):
- predict (294): read-only code, type the exact output; compared with `looseOutput` (all whitespace runs collapse, so "1 2 3" matches three lines).
- fill (76): one blank in highlighted code, optional "should print" box; whitespace-stripped compare with `accept` alternatives.
- bug (69): code lines are buttons; click the line or press its number (1 to 9); answer is the line marked `// BUG` in YAML; the review shows `fix:`.
- compiles (96): "Compiles (Y)" or "Compile error (N)"; the answer was computed at build time by compiling. Note shown: headers are included, warnings don't count.
- choice (85): 2 to 4 options shuffled per showing, pick by click, A to D or 1 to 4; `verify: output` makes the build check the right choice against real output (`README.md` "Writing content").
- boss (37): a full exercise compiled in the browser with 3 shots and a Give up button; failing results are shown.

Run screen: HUD with streak (or cleared count), mode label, hearts (`role="img"`, "N lives left"), "best X, reps Y, boss in Z", Leave (Esc). Correct answers flash green, play a WebAudio blip, and at streaks 3, 5, 10, 15, 20, 25, 35, 50, 75, 100 (then every 25) show a callout like "ACE" or "GODLIKE" (`callout`). A kill feed lists the last 6 reps with topic and seconds. A miss shows the review card (`Death`): the drill, "you said" vs "answer", the `why` explanation and a Report link; "Continue (Enter)" or, on elimination, "Respawn (Enter/R)" and "Lobby (Esc)", plus "NEW PERSONAL BEST", "Ranked up to X" and a Share button for a new best.

Ranks (`derived.ts` `RANKS`): 18 ranks by best 1-life streak, from Silver I (0) through Gold Nova, Master Guardian, Legendary Eagle and Supreme Master First Class (90) to The Global Elite (110). These are Counter-Strike competitive rank names. The lobby "rank card" shows the rank, next threshold, kills, bosses and a day streak; the day streak counts consecutive days with at least 20 reps (`dailyStreak`). Recent runs table shows the last 8 of up to 50 stored runs.

## 8. Daily challenge

`src/pages/Daily.tsx`: the pool is every non-boss drill sorted by id; the day's drill is `pool[FNV-1a(localDate) % pool.length]`, where `localDate` is the learner's local `YYYY-MM-DD` (`derived.ts` `localDay`), so everyone on the same date sees the same drill and a new one appears at local midnight. It is answered once with the same `Rep` component; the result is stored as `daily[date] = true/false` and also counts as a Deathmatch rep. The typed answer is only kept in `sessionStorage["cpp-arena-daily-<date>"]`. The streak (`dailyChallengeStreak`) counts consecutive days answered, right or wrong, ending today or yesterday; the page shows the streak number and a 14-day strip (solved green, missed amber) with hidden text per day. After answering, the review card links to Deathmatch and the lessons.

## 9. Placement quiz

`src/pages/Placement.tsx`, `content/placement.yaml` (16 questions, counted, "one question per milestone in the curriculum, in order"). Intro, then one `Rep` per question with a progress bar and an "I don't know this yet" button (counts as wrong). The first wrong answer's module is the starting point; all modules before it can be skipped. The result lists right/missed per module and offers "Skip N modules and unlock their drills" (adds them to `placed`), "Go to <module>", and "Retake". Skipped modules are marked "skipped by placement" on the Learn page, `nextStep` skips them, their drills unlock, but the course certificate still needs their steps.

## 10. Projects

`src/pages/Projects.tsx`, `ProjectPage.tsx`, e.g. `content/projects/03-gradebook.yaml`. 11 projects grouped Beginner / Intermediate / Advanced, each with language tag, "best after" module, progress bar and "done/total milestones". A project YAML has one `seed` and `milestones`, each with `title`, `text`, full `solution` at that point, `tests` (some hidden) and `hints`. The project page reuses the step layout: the left column lists milestones (later ones locked until the previous is completed) and the current milestone text; the right column is a `Workbench` with "Check milestone". Code carries forward because the project stores one `code` string (`ProjectProgress = { milestone, code, completed[] }`), used as the starting code for every milestone. Hint counts on projects are component state only (not saved).

## 11. Pro Track

Site side (`Pro.tsx`, `ProPage.tsx`, `content/pro.yaml`): 12 projects with hours and skills. Setup: create a public repo with a README (public repos get free Actions minutes, doubles as a portfolio), open a Codespace, paste one command: `curl -fsSL <site>/pro/cpp-arena-pro.tar.gz | tar -xz && bash tools/setup.sh && git add -A && git commit -m "Import the Pro Track starter" && git push` (`Pro.tsx` `importCommand`). The tarball is `pro-track/starter` packed at build time (`scripts/pack-pro.mjs`). Each project page renders that project's `README.md` and has a self-reported checkbox "My <dir> check is green on GitHub" (`state.pro[id]`).

Starter repo (`pro-track/starter`): `.devcontainer/devcontainer.json` (image `mcr.microsoft.com/devcontainers/cpp:1-ubuntu-24.04`, `postCreateCommand: bash tools/setup.sh`, C++ and CMake extensions), `tools/setup.sh` (apt installs build-essential, cmake, ninja, gdb, valgrind, clang, clang-tidy, clang-format, libgtest-dev, nlohmann-json3-dev), `tools/doctor.sh`, `tools/grade.sh <project>|all`, `tools/lib.sh` (`check "description" cmd` prints PASS/FAIL inside `::group::` blocks, `build`, `run_tests` via ctest, `finish` prints "RESULT: PASSED" or "NOT YET. Scroll up to the first FAIL line"), `cmake/arena.cmake` (C17/C++20, `-Wall -Wextra -Wpedantic -Werror`, `ARENA_SANITIZE`, GoogleTest from the system or FetchContent v1.15.2, `arena_test()`), and one folder per project with `README.md` (Background, Your tasks, Done when, Hints, Stretch goals), code, tests and `grade.sh`.

GitHub Actions (`starter/.github/workflows/grade.yml`): on push, PR and manual dispatch (input `all`), a `plan` job runs `tools/started.sh`, which lists projects whose folder has more than one commit (changed since import), then a matrix job per project installs tools and runs `tools/grade.sh <project>`; each project shows as its own check; a pass/fail table is written to `GITHUB_STEP_SUMMARY`.

Grading examples: `01-toolchain/grade.sh` builds with -Werror, runs unit tests, checks `wordfreq` output and exit code 2 on a missing argument. `02-git/grade.sh` reads Git history (3 merged `feature/` branches, a resolved conflict, a `Revert "` commit, annotated tag `v0.1.0`, commit message rules). `03-debugging` runs tests under ASan+UBSan and requires 4 bullets in `FINDINGS.md`. `06-concurrency` runs tests 3 times under ThreadSanitizer.

Mutation testing (`04-testing`): the learner writes GoogleTest tests for a given ledger. `grade.sh` checks the source is untouched (sha256 of `ledger.cpp`+`ledger.h`), that the tests build and pass, that at least 10 tests exist (`ctest -N`), then builds 7 mutants with `-DLEDGER_MUTANT=k` (each a `#if LEDGER_MUTANT == k` block in `src/ledger.cpp`, such as "deposit accepts 0" or "history is oldest first") and requires the suite to fail on each. Each mutant is its own named check, so a survivor tells the learner which rule is untested.

Maintainer verification: `pro-track/check.sh` copies the starter to a temp dir and requires the untouched starter to FAIL and starter plus `solutions/<p>` (or `simulate.sh` for Git-history projects) to PASS; `.github/workflows/pro-track.yml` runs it on `ubuntu-24.04` when `pro-track/**` changes.

## 12. Progress store, merge and sync

`src/state/store.ts`: one JSON object in `localStorage["cpp-arena-v1"]`, saved 150 ms after each change, with `useSyncExternalStore` for React. Shape: `version: 1`, `steps{id: {done, code, blanks, hintsUsed, clean, doneAt, firstDone, parts{k}}}`, `projects{id: {milestone, code, completed[]}}`, `drills{id: {box, right, wrong, last, due}}`, `dm{best{deathmatch, casual, warmup, interview}, runs[<=50], reps, kills, bossKills, days{date: reps}}`, `settings{sound, unlockAll, topics, boss, keys, theme, textScale, certName, proRepo, mobileData}`, `pro{id: bool}`, `placed[]`, `daily{date: bool}`. `normalize` fills missing fields from `fresh()`.

Other keys: `cpp-arena-gist` (token, gist id, auto flag, last sync; `src/lib/sync.ts`), `cpp-arena-playground` (`Playground.tsx`), `sessionStorage cpp-arena-daily-<date>`, Cache Storage `cpp-arena-toolchain-<version>` (`src/compiler/manifest.ts`) and `cpp-arena-app-<version>` (`public/sw.js`).

Merge (`mergeStates`): a step or project done on either side stays done; step hints take the max, `doneAt` the earliest, `clean` true if clean on a side where it is done; challenge parts merge with done OR; projects keep the side with more completed milestones; drills keep the side with more reps; day counts and bests take the max; runs are unioned by timestamp (latest 50); `pro` and `daily` OR; `placed` union; settings stay local except empty `certName`/`proRepo` are filled. Every import path merges, never overwrites.

Transfer link and QR (`sync.ts`, `SyncPanel.tsx`): `slim()` drops saved code and blanks, the JSON is deflate-raw compressed and base64url encoded into `<site>/profile#transfer=<data>`; the QR (`qrcode-generator`, error level L) is shown only when the link is at most 2900 characters; Copy and native Share buttons. Opening the link shows "Progress from another device" with a summary and "Merge into this device" or "Ignore", then clears the hash.

GitHub Gist: the learner creates a token with only the `gist` scope (pre-filled URL), pastes it; the app finds or creates a secret gist with file `cpp-arena-progress.json` (includes code), "Save now", "Load and merge", "Sync automatically" (load at startup, save 60 s after the last change and when the tab is hidden), "Disconnect". The token is never included in exports or links. File export downloads `cpp-arena-progress-<date>.json`; import merges.

## 13. Certificates and share cards

`src/pages/Certificate.tsx`: two certificates, course (every lesson step done) and Pro Track (all 12 marked passing). Name (60 chars) and optional repo (100 chars) are settings. The certificate is a paper-look card (cream background, double amber border, 1.414 aspect ratio, serif) with course details (steps, clean count, Deathmatch rank) or Pro details; the course date is the latest `doneAt`. Buttons: "Print or save as PDF" (`window.print`, print CSS hides everything else), "Share image", "Copy link" to `/certificate#view=<base64url JSON>`; the shared view says it was created in the learner's browser and cannot be independently verified.

Share cards (`src/lib/share.ts`, `ShareButton.tsx`): a 1200x630 canvas with the dark background, amber glow, the logo, a kicker, a two-line title and two detail lines, footer "cpparena.com · learn C and C++ with a real compiler". Uses `navigator.share` with a file when `canShare` allows, otherwise downloads the PNG; a status message is announced. Used for module complete, Deathmatch personal best, rank (Profile) and certificates.

## 14. Symbol bar, Report a problem, mobile data

Symbol bar (`SymbolBar.tsx`): `role="toolbar"` "Insert symbols", shown on `(pointer: coarse), (max-width: 960px)`, sticky at the bottom, horizontally scrollable. Keys: Tab (4 spaces), `{ }`, `( )`, `[ ]`, `;`, `&`, `*`, `->`, `<<`, `>>`, `" "`, `' '`, `#`, `<`, `>`, `=`, `!`, `|`, `%`, `_`, `::`, `\n`, cursor left and right. Pair keys put the cursor between the two characters. It types into the last focused CodeMirror, blank or answer box; `onPointerDown` prevents focus loss so the phone keyboard stays up. Each key has a spoken name and is at least 2.75rem square.

Report a problem (`src/lib/site.ts` `reportUrl`, `ReportLink.tsx`): `https://github.com/AntonyPerez0/cpp-arena/issues/new?title=[<kind>] <title>&body=...&labels=content`. The body has `**<kind>:** <title>`, `**ID:** \`<id>\``, `**Page:** <SITE_URL><path>`, "What went wrong?" with an HTML-comment prompt, `**Last result:**` (the screen-reader summary), `**My code:**` fenced (cut at 3500 characters), and the user agent in `<sub>`. The URL is rebuilt on click, focus, hover and middle-click so it carries the latest code. It appears under every lesson step and challenge, every project milestone, and on every drill review card.

Mobile data (`MobileDataCard.tsx`, `src/compiler/client.ts` `onMobileData`): when `navigator.connection` reports Save-Data, cellular or 2g, lessons ask "You're on mobile data" with the download size and an "Always download on mobile data" checkbox instead of auto-downloading the compiler.

## 15. Playground, Visualizer, Topics, Next

Playground (`Playground.tsx`): C/C++ radio, CodeMirror (320px min), symbol bar, stdin textarea, Run (Ctrl/Cmd+Enter), Share, Example. Code for both languages and stdin persist in `cpp-arena-playground`. Share builds `/playground#code=<deflate-raw base64url of {lang, code, stdin}>`, uses the share sheet or clipboard and shows the link in a read-only input. Output (64 KB cap note), crash notes, warnings, and a live status message.

Visualizer (`src/components/Visualizer.tsx`, `src/content/visuals.ts`, `content/visuals/*.yaml`, 30 counted): traces are recorded at build time by running the program under gdb (`scripts/trace/tracer.py`) into `public/visuals/<id>.json`. Each step has the current line, stack frames (function, line, variables with a parameter flag), heap blocks (address, size in bytes, label, note, value) and output so far. Values are `val`, `ptr`, `ref`, `arr` (cells with indexes, "+N more"), `struct` (fields) or `text`; pointers carry the id and label of their target, `dangling`, smart pointer kind and owner count. The page shows the code with the next line highlighted and caller lines shaded, the output so far, a Stack column (newest frame on top, outlined, "running line N" or "waiting at line N") and a Heap column, and an SVG overlay that draws a curved arrow from each pointer's dot to its target (measured with `getBoundingClientRect`, redrawn on resize via `ResizeObserver`). Changed values since the previous step are outlined; dangling pointers are dashed red. Controls: first, back, play/pause (900 ms per step), next, last, a range slider with `aria-valuetext`, arrow keys, Home and End; a live region reads "Step i of n. Line L: <code>" when paused. Lesson steps link to their visualizations with "Watch it run" cards.

Topics (`Topics.tsx`, 52 counted in `content/topics/*.yaml`): an index grouped C, C++, DSA with whole-card links; each page has a lead, Markdown body, a compiled example with stdin and output, an optional watch card, "Practice it" lesson links and up to 4 related topics. Next (`Next.tsx`, `content/next.yaml`): one Markdown card (practice here, practice elsewhere, references, books, projects, open source); site-relative links are intercepted for in-app navigation.

## 16. Accessibility features

- Skip link "Skip to content" (visible on focus) to `#main` (`App.tsx`, `.skip-link`).
- Focus management: `RouteChange` scrolls to top and focuses the page `<h1>` (given `tabindex=-1`) or `main` on every navigation after the first; the challenge switcher focuses `#task-h`; pass banners autofocus their Next button; `useTitle` updates the tab title.
- Live regions (`role="status"`, `aria-live="polite"`): Workbench ("Checking your code." then "2 of 3 tests failed. Details are below the editor."), Deathmatch ("Correct. Streak 5. ACE" / "Wrong. 2 lives left."), Playground, Profile toast, Visualizer step, ShareButton, sync status.
- Labels: the editor has `aria-label` and a hidden description ("Tab inserts indentation. To leave the editor with the keyboard, press Escape, then Tab. Control or Command plus Enter runs the checks.", `CodeEditor.tsx`); blanks, answer inputs, bug lines ("Line 3: ...") and symbol keys are named; icons are `aria-hidden` with hidden "Passed:"/"Failed:"/"(done)" text; hearts are `role="img"` with a label.
- Keyboard: Ctrl/Cmd+Enter to check or run; every drill is keyboard-operable; single-letter and number shortcuts can be turned off (`settings.keys`, WCAG 2.1.4); Escape closes the phone menu; scrollable `pre` and `table` get `tabindex=0` (`Markdown.tsx`).
- Tap targets: step dots get an invisible 24px area (`.dot::after { inset: -5px }`, comment cites WCAG 2.5.8); symbol keys 2.75rem.
- Visible `:focus-visible` rings in the accent color; links inside prose are underlined.
- `prefers-reduced-motion: reduce` sets all animations and transitions to 0.01 ms and results scrolling to instant.
- CI: `scripts/e2e.mjs` runs axe-core with WCAG 2.2 AA tags on every page type, light and dark, interactive states and phone width, and tests skip link and focus movement (lines 674 to 856).

## 17. Gaps noticed in the reference (worth fixing in Java Arena)

- Two different "days": Deathmatch day counts and the 20-reps streak use the UTC date (`store.ts` `today()` and `derived.ts` `dailyStreak` use `toISOString()`), while the daily challenge uses the local date (`localDay`). Use local dates everywhere.
- Show-solution attempts and project hint counts are not persisted (component state), so reloading resets them and project "clean" status is not tracked.
- Pro Track completion is a self-reported checkbox; the certificate cannot be verified (the page says so). A Java version could read the learner's public repo's latest Actions run via the GitHub API instead (not prototyped).
- `stripForRules` handles `"..."` and `'...'` per line only; Java text blocks (`"""`) would leak into require/forbid checks.

## 18. Java adaptation notes

Per feature, what changes for Java Arena. Runtime-dependent points depend on the engine chosen in `rt-cheerpj.md` / `rt-teavm.md`.

- Routes and pages: keep the same page list and permanent `/learn/<module>/<slug>` addresses. The Helsinki MOOC has 14 parts, 1 to 7 being "Java Programming I" and 8 onward "Java Programming II" (`/home/user/ref/java-programming/data/part-7/4-introduction-to-programming.md` line 20), which maps naturally to two phases on the Learn page and two certificate kinds (or one course certificate with two halves). Header CompilerBadge becomes a "Java ready" runtime badge.
- Step layout: keep the desktop fill-the-window rules exactly (sticky scrolling lesson, flex work column where only the editor shrinks). Add a file tab strip for multi-class exercises (MOOC part 4 onward: "Multi-file: needs a tabbed editor with the given class(es) as read-only tabs", `/home/user/ref/research/mooc-parts-03-05.md` line 330); the tab strip must be a `flex: none` item above the editor so it never shrinks. The action row gains a "Starting Java..." busy label if the runtime boots slower than Clang.
- Task card: same, but MOOC sample outputs interleave typed input; show Input and Expected output separately as now, or a display-only transcript (see `ref-core.md` section 15.5). For harness steps, list check names as now.
- Challenges and completion rule: unchanged (store shape can stay). Content can use `more:` to split MOOC multi-part exercises into Challenge 1/2/3.
- Hints and solution: unchanged thresholds (all hints or 3 attempts); persist `attempts` this time.
- Require/forbid: same mechanism; Java examples: require `for\s*\(`, `\bwhile\s*\(`, `implements\s+Comparable`, `extends\s+\w+`, `\.stream\(\)`; forbid `Collections\.sort` or `Arrays\.sort` when the step implements sorting, forbid `ArrayList` in array steps, forbid hard-coded answers. String `==` misuse needs a harness test or a heuristic forbid rule because a regex cannot see types. Strip `//`, `/* */`, `"..."`, `'...'` and text blocks `"""..."""` before matching. For multi-file steps, run rules per named file.
- Fill-in blanks: unchanged UI; the regex highlighter (`src/components/highlight.tsx`) needs Java keywords and common types (`String`, `ArrayList`, `HashMap`, `Scanner`, `Integer`...), annotations and text blocks. CodeMirror swaps `@codemirror/lang-cpp` for `@codemirror/lang-java` (npm: version 6.0.2, license MIT, checked with `npm view`).
- Symbol bar keys for Java: Tab, `{ }`, `( )`, `[ ]`, `;`, `.`, `" "`, `' '`, `=`, `+`, `<`, `>`, `<>` (diamond, pair), `!`, `&&`, `||`, `%`, `->` (lambdas), `::` (method references), `@` (annotations such as `@Override`), `\n`, a `sout` key that inserts `System.out.println();` with the cursor inside the parentheses (the MOOC teaches the NetBeans "sout" shorthand, `/home/user/ref/mooc-outline.txt`, exercise part01-Part01_04 Dinosaur), and the cursor arrows. Drop `#`, `<<`, `>>`, `&` and `*` (pointer-oriented).
- Deathmatch modes, Leitner boxes, boss every 8th rep, callouts and HUD: unchanged. Boss reps are the only drills that need the in-browser runtime, so keep the background runtime preload when a run starts (`Deathmatch.tsx` `start`). Ranks: the 18 names are Counter-Strike's; Java Arena may want original names (a product choice, not legal advice).
- Drill types for Java, all graded instantly from answers computed at build time with a real JDK: predict (output of `System.out`, including `==` vs `equals`, integer division, `char` arithmetic, String immutability, static vs instance, overloading vs overriding); fill; bug (same `// BUG` marker); compiles, with the actual javac message recorded at build and shown on the review card (missing return statement, variable might not have been initialized, unreachable statement, possible lossy conversion, non-static from static context, private access, unreported checked exception, reassigning a `final`, generic type mismatch, missing cast); a new "throws" type or `choice` variant ("What happens?": prints X, or which exception is thrown: `NullPointerException`, `ArrayIndexOutOfBoundsException`, `ArithmeticException`, `NumberFormatException`, `ClassCastException`, `ConcurrentModificationException`), compared by exception simple name; choice (interview questions: equals/hashCode contract, checked vs unchecked, interfaces vs abstract classes, generics erasure, stack vs heap, garbage collection, `final`/`finally`); boss. Avoid predict drills whose output depends on `HashMap`/`HashSet` iteration order unless the chosen runtime matches OpenJDK (`rt-teavm.md` section 1 reports TeaVM order differs).
- Daily challenge and placement quiz: unchanged logic (FNV-1a of the local date over non-boss drills; 1 question per curriculum milestone, first miss sets the start). Placement questions become one per MOOC part or milestone.
- Projects: same milestone model, but code carry-forward must carry a set of files (`files: Record<string, string>`) instead of one `code` string, since Java projects grow classes.
- Pro Track: keep the whole shape (starter tarball, one-line import, Codespaces, `started.sh` plan job, one matrix check per project, `lib.sh` check/finish output, `GITHUB_STEP_SUMMARY` table, maintainer `check.sh` where the starter must fail and the solution must pass). Replace CMake with Maven or Gradle and GoogleTest with JUnit Jupiter. Maven Central lists `junit-jupiter` 5.14.4 as the newest 5.x and 6.1.3 as the latest release, EPL 2.0 per the 6.1.3 POM (`repo1.maven.org/maven2/org/junit/jupiter/junit-jupiter/`). Devcontainer image `mcr.microsoft.com/devcontainers/java:21` is listed in `devcontainers/images` `src/java/README.md` (raw.githubusercontent.com). CI uses `actions/setup-java` (tags v4, v5 and v6 exist per `git ls-remote`; its README example uses `distribution: temurin`). Mutation testing: Java has no preprocessor, so named mutants need another selector, for example a grader-only source set or a factory that reads `-Dledger.mutant=k`, keeping the "mutant k killed (rule)" checks; PIT is an automatic alternative (`pitest-maven` 1.30.0 and `pitest-junit5-plugin` 1.2.3 on Maven Central, Apache 2.0 per the 1.30.0 POMs) but reports mutants less readably. Count tests from Surefire XML reports instead of `ctest -N`. Tool swaps per project (suggestions, licences not checked here): gdb and sanitizers become jdb/IDE debugging, reading stack traces and `jstack` for deadlocks; ThreadSanitizer has no direct Java equivalent, so concurrency grading means repeated stress runs; clang-tidy/clang-format become Checkstyle, SpotBugs or Error Prone plus a formatter; profiling becomes JFR and JMH; POSIX becomes `java.nio.file`, `ProcessBuilder`, sockets and `HttpClient`.
- Progress store: rename keys to `java-arena-v1`, `java-arena-gist`, `java-arena-playground`, `java-arena-daily-<date>`, gist file `java-arena-progress.json`; keep `version: 1` semantics and the merge rules; code fields become per-file maps; `slim()` still drops code for transfer links. Transfer link, QR (2900 character limit), Gist and file export carry over unchanged.
- Certificate and share cards: same mechanics; titles and footer change. Per `/home/user/ref/research/license.md` section 0, MOOC-derived content is conservatively CC BY-NC-SA 4.0 with attribution, must not claim to be official, and Oracle's guideline on using "Java" in product names is relevant to the name; certificates must stay free (non-commercial).
- Theme and text size: keep tokens, both themes and the pre-paint script; replace `--c`/`--cpp` language colors (Java is one language) with, for example, part or phase colors; recheck contrast with axe in both themes.
- Report a problem: same URL format with the new repo; add the runtime and javac version to the body, and for multi-file steps include every file (still capped for URL length).
- Playground: Java only; a `Main` class with `public static void main`, optional extra classes or file tabs, stdin textarea for `Scanner`, optional args; share links carry `{files, stdin}` with the same deflate-raw packing.
- Visualizer: record at build time with a real JVM through JDI (the `jdk.jdi` module is present in the local JDK 21, checked with `java --list-modules`), the Java counterpart of the gdb tracer. Draw: stack frames per method call (class and method, current line, locals, parameters and `this`); primitives inline in the frame; every reference as an arrow into the heap; heap objects keyed by object identity, labelled with class name, showing fields, arrays with indexes, Strings as values, and simplified views of `ArrayList` (elements up to size) and `HashMap` (entries); static fields in a separate "class statics" area; `null` as an empty dot; and garbage: objects no longer reachable from any frame or static field drawn faded and labelled as unreachable (eligible for garbage collection) instead of C's "dangling" pointers and freed blocks. Drop byte sizes and addresses; show aliasing (two references to one object) clearly since it is the core Java memory lesson.
- Topics and Next: same components; Java topic pages and a Java reading list.
- Accessibility: carry over everything (skip link, focus to h1, live regions, labelled editor and blanks, keyboard drills and the shortcut toggle, 24px targets, reduced motion, axe in CI); give file tabs a proper `tablist` with arrow-key navigation.
