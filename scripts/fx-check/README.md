# The real-JavaFX check

Java Arena runs its own practice version of JavaFX (`engine/libraries/javafx/`), because real JavaFX doesn't run on Java Arena's engine (Ristretto) or on the other browser Java engines that the research in [`docs/research/`](../../docs/research/) looked at. The lessons say that the same code runs with real JavaFX on a learner's own computer, and that a check on every model solution confirms it shows the same window contents there. This folder is that check.

```sh
npm run content     # (or npm run build) lists the lesson programs in fidelity/out/content-checks.json
npm run fx-check
```

On a 4-core machine the probes and the fidelity program (38 runs, each on both sides) take about 30 to 40 seconds, and each lesson run adds well under a second (four programs run at a time); the first run also downloads the jars (about 8 MB). CI runs it on every pull request after the site is built, and fails on any difference. The summary is also written to `fidelity/out/fx-check.json` (kept as a CI artifact).

## What it does

The programs are every program that uses JavaFX (a source file mentions `javafx.`) among:

- **the lessons and drills**: every program the content build ran that uses JavaFX, read from `fidelity/out/content-checks.json` (each challenge's model solution with every test's input, arguments, files and clicks and typing, each `java window` example with its events block, and any `java run` example that uses JavaFX). The check warns when a lesson file is newer than that list.
- **the fidelity programs** that use JavaFX (`fidelity/programs/48-javafx-window`, with its `.arena/events.txt`).
- **the probes** in `probes/`: our own programs that go through every class and method of the library's API (below).

For each, it compiles the program twice with the reference JDK's javac (Temurin 21.0.10+7, in one JVM as the content build does): against Java Arena's JavaFX (`engine/dist/libraries/javafx.bin`) and against the real jars. Then it runs it both ways, each in a fresh folder holding the same files, with the same standard input and arguments and the reference JVM flags:

- **Java Arena's JavaFX** on the reference JDK, exactly as the content build runs it (through `scripts/javafx/JavaFxLauncher.java`), with the events in `.arena/events.txt`. The library writes `.arena/window.json`.
- **Real OpenJFX 21** on the reference JDK, without a screen (Monocle's headless platform, software rendering), through `RealFxDriver.java`, our own driver. The driver runs the program's `main` on the main thread, waits until `start` has returned, then applies the same events with the real API on the JavaFX Application Thread, each after the `Platform.runLater` tasks queued before it have run, as the library does: `click` calls `fire()`, `type` calls `appendText` once per character, `set` calls `setText`, `enter` fires an `ActionEvent` at the text field (what pressing Enter does), `close` closes the primary stage. Targets (`#N`, `#id`, `Type "text"`, `Type K`) are found in the same outline order and give the same problems in the same words. Then it writes the windows from the real scene graph as the same window JSON and calls `Platform.exit()`, so `stop()` runs and `launch` returns, as with the library. When the session ends earlier (`Platform.exit()`, or the last window closed), the JSON says the windows were closed; when the constructor, `init` or `start` fails, there is no window file, as with the library.

It reports, per run, every difference in:

- the **output** (stdout), exactly (identity hash codes such as `Label@1b6d3586` are masked);
- **stderr** without stack frames (the frames of JavaFX's internals and of the driver differ) and without what JavaFX logs about itself (its warning that it runs from the class path, fontconfig's warnings);
- the **exit code**;
- the **files** the program left in its folder (not Java Arena's own `.arena/`);
- whether a **window file** was written, the **window outline** (`windowOutline` from `src/grader/window.ts`, the same function grading uses; lines that differ are marked), and the **events that couldn't happen** with their messages.

The events are read on the Node side with `parseEventLine` from `src/grader/window.ts` (which reads them as the library does, with the library's own messages for lines it can't read) and handed to the driver.

## The real jars

`jars.json` pins OpenJFX 21.0.12 (`javafx-base`, `javafx-graphics`, `javafx-controls`, Linux jars, the newest 21.0.x) and Monocle 21.0.2 (`org.testfx:openjfx-monocle`), each with its SHA-256. They are downloaded with curl from Maven Central (repo1.maven.org), or from Google's mirror of Maven Central when Maven Central refuses (it answers 429 to an address that asks too often), and kept in `node_modules/.cache/java-arena-fx/` (`FX_CHECK_CACHE` sets another folder), with JavaFX's native libraries unpacked next to them. A jar whose SHA-256 isn't the pinned one is never used. CI caches the folder with a key made from `jars.json`. The jars are only downloaded for this check: nothing of OpenJFX is in the repository or on the site. To move to a newer 21.0.x, change `jars.json` (versions, paths and SHA-256) and run the check.

Real JavaFX's text needs the system's fontconfig and pango libraries (any desktop Linux, and CI's Ubuntu, have them).

## Options

| Variable | What it does |
|---|---|
| `FX_CHECK_ONLY=<regular expression>` | Checks only the programs whose place matches, such as `probes/02` or `gui-basics` |
| `FX_CHECK_VERBOSE=1` | Also prints what each run printed on real JavaFX and its window outline |
| `FX_CHECK_CHECKS=<file>` | Reads the lesson programs from another file than `fidelity/out/content-checks.json` |
| `FX_CHECK_CACHE=<folder>` | Keeps the jars in another folder |

## The probes

Each folder in `probes/` is a program (`Main.java`, and more files if it needs them). Each `<name>.events` file in it is one run with those events (the format of `.arena/events.txt`); a folder without one runs once with no events. `meta.json` can give `args` (and `mainClass`), `stdin.txt` the standard input. The probes print what they observe, so the output comparison checks behavior that the window doesn't show.

| Probe | What it goes through |
|---|---|
| `01-counter` | A first window: `click` by text and by `#N` |
| `02-events` | Every kind of event and target on enabled, disabled, hidden and read-only controls, text with escapes and characters outside ASCII, `close` and the events after it, and every problem and every line that can't be read |
| `03-lifecycle` | The order and threads of `main`, the constructor, `init`, `start`, the events, `runLater` tasks and `stop`; `getParameters()` with every kind of argument (keys that start with a letter, `_`, a digit, `-` or `$`); `launch` twice; a `Stage` made off the JavaFX thread; `Platform.exit()` in a handler; `runLater(null)`; a task queued in `stop()` |
| `04` to `10` | Failures and early ends: an exception in `start`, in `init`, in the constructor, no public constructor, `launch(String...)` from a class that isn't an `Application`, `Platform.exit()` in `init` and before `launch`; a task queued by a constructor or `init` that then fails or calls `Platform.exit()` |
| `11-children` | Children lists: every list method and its exceptions and messages (duplicates, `null`, cycles, indexes), moved nodes, `getChildrenUnmodifiable`, `lookup`, `getParent`, `getScene`; `BorderPane` regions replaced and swapped; `GridPane` cells, spans, order and its checks |
| `12-defaults` | What every class is before anything is set, how it prints (`toString`), `Insets` (equality, hash codes) and `Pos`, and the checks of `Scene` and `Region` |
| `13-fonts` | `Font`'s constructors and factory methods with JavaFX's own families in any case and with aliases, full names with styles, sizes, equality and hash codes, and fonts in the window |
| `14-properties` | `SimpleStringProperty` and listeners: only real changes, in order, as often as added, `removeListener`, a failing listener; the text properties of controls; listeners that change the value again while the others hear of a change (what those hear then), that remove themselves first, or are added during a change; a text field that keeps only digits, with a label showing its length |
| `15-layouts` | Every pane's constructors and settings in the window, sizes and padding, ids, styles that don't change what the outline shows, disabled and hidden panes, `fire()` on a disabled button |
| `16-windows` | Several windows: their order (the main one first, then by first showing), titles, `setRoot`, swapping scenes, hiding and showing again, closing windows and the end of the session |
| `17-subclasses` | A program's own classes that extend JavaFX's: their names in the outline, and targets that find them |
| `18-exceptions` | An exception from a handler, a task, a listener and `stop()`, and a task queued in a `stop()` that then fails |
| `19-text-inputs` | What text fields and areas keep of a text, `setText(null)`, `appendText`, `clear`, prompt text, a password field, Enter in a field, writing a file |
| `20-no-window` | A `start` that shows no window |
| `21-launch-class` | `launch(Class, args)` from a `Main` that isn't the application (with a `null` argument, which is left out), closing the window from a handler, writing a file |
| `22-threads` | A thread of the program's own that changes a showing window, and `runLater`; the names of threads made without a name, at every stage |

A probe must not use what the check can't compare (below). When the library changes, add what it now does to a probe.

## What a pass proves

- Each lesson program, run on real JavaFX 21 with the same input, arguments, files, clicks and typing, prints the same output (and the same exceptions on stderr), ends with the same exit code, writes the same files and leaves windows with the same outline (the same windows in the same order, with the same titles, the same nodes of the same classes in the same nesting, the same texts, ids, fonts, spacing, gaps, padding, alignment, preferred sizes, styles and flags) as on Java Arena's JavaFX. So a learner who copies a model solution or example to their own computer sees the same window contents, and the clicks and typing of the tests do the same there.
- The library's whole API behaves as real JavaFX's does in everything the probes print and show, including error messages.

## What it doesn't prove

- **Not the drawing.** The outline is the window's contents, not its look: the page draws it approximately, and real JavaFX lays it out with its own style sheet (modena), fonts and sizes. Sizes are left out of the outline on purpose (the library doesn't lay windows out).
- **Not the browser.** This runs Java Arena's JavaFX on the reference JDK. That the browser engine gives the same bytes is what `npm run fidelity` (program 48) and `npm run content:browser` check.
- **Not real clicks.** Events are applied through the API (`fire()`, `appendText`, `setText`, an `ActionEvent`, `close()`), as the library applies them, not through a mouse and keyboard: a real click also moves focus and can be refused by a control covered by another one, which this doesn't model.
- **Only what a program shows or prints.** A difference the probes and lessons never exercise isn't found. The probes cover the API list of the design; the lessons cover what they use.
- **Only Linux, headless, one JavaFX version.** OpenJFX 21.0.12 with Monocle and software rendering. Other platforms can differ in fonts (below).

## What can't match, and how the check deals with it

These are differences between real JavaFX and Java Arena's JavaFX that a program can show, and that the check reports when a lesson does them. Lessons avoid them (content/README.md's Windows section says how):

- **Fonts the computer may not have.** Real JavaFX gives the System font for a family that isn't installed; Java Arena's JavaFX keeps the family asked for (as on a computer that has it). JavaFX's own families (System, Serif, SansSerif, Monospaced, in any case, with the aliases Dialog, DialogInput, sans-serif and monospace) behave exactly as in real JavaFX on every computer. The check says so when a differing window uses another family.
- **Styles.** Real JavaFX applies `setStyle` (CSS) to a node and, for fonts, to everything in it; Java Arena's JavaFX stores the style and the page draws it approximately. A style that sets the font, padding, spacing, gaps, alignment, sizes, wrapping or visibility changes what real JavaFX's window holds, so the check reports it (and says so). Styles for colors and borders are fine. Values that JavaFX's own style sheet gives (a button's padding, for instance) count as not set, since the program didn't choose them.
- **After the window shows, real JavaFX lays it out.** A window's or scene's size, and a control's padding or font, read after `show()` are the laid-out values there (the library keeps the values that were set). A lesson shouldn't print them after the window shows.
- **A window shown without a scene.** Headless JavaFX fails in its next pulse (a NullPointerException in its renderer) and the session hangs, so the check can't confirm one. The library shows it as `(no scene)`.
- **`setFont(null)`.** Real JavaFX fails when it lays the control out; the library shows `font null`.
- **A task queued with `runLater` after `Platform.exit()`.** On real JavaFX it races with `stop()` (in 5 runs, `stop()` came first 4 times); the library runs it before `stop()`. A task queued before `exit()` runs before `stop()` on both.
- **A task queued by a task that `stop()` queued.** The task `stop()` queues runs on both, as the toolkit exits; one that task queues in turn races with the toolkit's exit on real JavaFX (it runs in some runs and not in others), and the library drops it. So a probe or lesson never prints from one.
- **A task queued with `runLater` in `init`, and what `init` does after that.** Real JavaFX runs the task on the JavaFX Application Thread as soon as that thread is free, while `init` goes on on the launcher thread, so a line `init` prints after queuing it races with the task's (in 20 runs of probe 09 alone, `init`'s line came first 19 times; with four programs running at a time, the task's came first in 9 of 80 runs of probes 05 and 09). The library runs the task after `init` returns, before `start` (or as the toolkit exits, when `init` failed or called `Platform.exit()`), so an `init` that waited for the task to run would never end there. So the probes print in `init` only before they queue a task, and a lesson never waits in `init` for one.
- **Controls made before `launch`.** Real JavaFX can make a control or a scene only after its toolkit has started, and when that happens depends on how the program is started. From the module path with an `Application` main class (`java --module-path ... --add-modules javafx.controls Main`), the JDK's launcher starts the toolkit before `main`, and the program behaves as on the library, which makes them at any time. With JavaFX on the class path and `main` called directly (as the driver runs programs), or a main class that isn't the `Application`, the toolkit starts in `launch`, so a control made earlier (a static field, or in `main`) fails with ExceptionInInitializerError (Toolkit not initialized). Lessons make them in `start`.

## Differences this check found and fixed in the library

When it was first run (October 2026), the probes found these, all now fixed in `engine/libraries/javafx/src` (and checked again by fidelity program 48 in the browser engine):

- `Font` didn't follow JavaFX's rules for its own families: `Font.font("Serif", 20)` was named `Serif` instead of `Serif Regular`; `Font.font("serif", 20)`, `"Dialog"`, `"DialogInput"`, `"sans-serif"` and `"monospace"` kept the name as written instead of becoming `Serif`, `SansSerif` and `Monospaced`; `new Font("Serif Bold", 18)` had the family `Serif Bold` instead of `Serif`, style `Bold`; and `new Font("Serif", 18)` (a family, not a full name) was Serif instead of the System font.
- `Platform.runLater(null)` threw at once; real JavaFX accepts it and the task fails with a NullPointerException when its turn comes.
- The children list's `add(index, node)` and `addAll(index, nodes)` checked the index after the nodes and with ArrayList's message; JavaFX checks it first (`Index 5 out of bounds for length 1`). `remove(from, to)` now gives JavaFX's message too (`Range [1, 0) out of bounds for length 2`).
- A program's threads made without a name were numbered from `Thread-0` after `launch`. JavaFX makes its launcher thread and (on Monocle) its application thread without a name and names them afterwards, so they take the next two numbers (a program's first thread made in `start` is `Thread-2`, not `Thread-0`); the library now makes its two threads the same way.
