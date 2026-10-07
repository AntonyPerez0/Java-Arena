# Java Arena libraries: JUnit 4 and a practice version of JavaFX

`build.mjs` packs the libraries a program may use on top of `java.base`, each as one archive of class files in `engine/dist/libraries/`, which both halves of the engine read:

- the compiler puts its classes on javac's class path for a program that uses it (`javac.loadLibrary` and the `libraries` option of `compile` in `engine/dist/compiler/javac-host.mjs`);
- the runner loads its classes next to the program's own, so the program really runs with them.

The site fetches an archive only when a program uses the library, and keeps it in the same cache as the rest of the engine. Which libraries a program uses is decided in one place, `librariesFor` in `src/grader/libraries.js`, for the browser's grader and free runs, the content build, its browser replay and the fidelity suite.

| Archive | What | Used when a source file mentions | Code |
|---|---|---|---|
| `junit4.bin` | JUnit 4.13.2 and Hamcrest Core 1.3 (the MOOC's part 6, unit testing) | `org.junit` | third-party, unchanged (below) |
| `javafx.bin` | Java Arena's practice version of JavaFX (the MOOC's part 13, graphical user interfaces) | `javafx.` | Java Arena's own (MIT, like the rest of the site) |

## Rebuild

```sh
node engine/libraries/build.mjs
```

It downloads the two JUnit jars from Maven Central (repo1.maven.org), or takes them from `node_modules/.cache/java-arena-libraries/`, checks their SHA-256, and keeps their class files. It compiles `javafx/src/` with the reference JDK's javac (Temurin 21.0.10+7, from `JAVA_HOME` or `scripts/get-jdk.sh`; the script stops on another version): `--release 21 -g`, with string concatenation compiled to `StringBuilder` calls (`-XDstringConcat=inline`), which the browser's interpreter runs faster than the `invokedynamic` form, and warnings as errors. Then it writes `junit4.bin` and `javafx.bin` (each a gzip stream of entries sorted by name, each `short nameLength, UTF-8 name, int dataLength, data`, with a fixed gzip header, so two runs give the same bytes), `manifest.json` (`files`: size, SHA-256 and class count of each archive; `sources`: the pinned jars; `own`: the library that is Java Arena's own code, with no third-party license) and the license texts that come inside the jars. javac writes the same class files for the same sources, so `javafx.bin` is byte-identical on every rebuild with the same JDK.

## JUnit 4: pinned sources

| Library | Jar | SHA-256 | Source | License |
|---|---|---|---|---|
| JUnit 4.13.2 | https://repo1.maven.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar | `8e495b634469d64fb8acfa3495a065cbacc8a0fff55ce1e31007be4c16dc57d3` | https://github.com/junit-team/junit4 tag `r4.13.2`, or `junit-4.13.2-sources.jar` on Maven Central | Eclipse Public License 1.0 (`licenses/JUnit-4.13.2-LICENSE.txt`) |
| Hamcrest Core 1.3 | https://repo1.maven.org/maven2/org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar | `66fdef91e9739348df7a096aa384a5685f4e875584cce89386a7a47251c4d8e9` | https://github.com/hamcrest/JavaHamcrest tag `hamcrest-java-1.3`, or `hamcrest-core-1.3-sources.jar` on Maven Central | BSD 3-Clause (`licenses/Hamcrest-Core-1.3-LICENSE.txt`) |

The class files are the ones in the jars, unchanged. Their source code is available at the addresses above.

## Java Arena's practice version of JavaFX

Real JavaFX needs a native graphics toolkit and its own event thread: it doesn't run on Ristretto, Java Arena's runner, nor on the other browser Java engines that the research in [`docs/research/`](../../docs/research/) looked at (CheerpJ lists JavaFX as future work, and TeaVM's class library has no JavaFX). `javafx/src/` is our own small implementation of the part of JavaFX 21's API that the GUI lessons use, in JavaFX's own packages so learners write ordinary JavaFX code, written for this site (not OpenJFX's code; its behavior follows JavaFX 21, checked against OpenJFX 21.0.12 run headless with Monocle). Its internal code is in the package `arena.fx`, which isn't for learners.

A program that uses it runs to the end like any other. `Application.launch` starts a thread named `JavaFX-Launcher`, which starts the `JavaFX Application Thread`, makes the program's `Application` there and calls `init()` on its own thread; `start(primaryStage)` runs on the JavaFX Application Thread, then the events listed in `.arena/events.txt` (in the program's working folder; none when it's missing) are applied there one by one, each after the previous one's handlers and the `Platform.runLater` tasks they queued. The session ends after the last event, or when `Platform.exit()` is called or the last showing window closes; the windows are then written to `.arena/window.json`, the tasks still queued run, `stop()` runs, and `launch` returns. As the toolkit then exits, the tasks queued until then run too (those `stop()` queued, and those of a constructor, `init` or `start` that failed), and a task one of them queues is dropped, as in real JavaFX. Exceptions in the constructor, `init`, `start` and `stop` are reported as JavaFX reports them, and one that escapes an event handler, a task or a change listener goes to the thread's uncaught exception handler (which prints it) while the session goes on.

The public API (nothing more, so a lesson can't come to rely on something real JavaFX lacks):

| Package | Classes |
|---|---|
| `javafx.application` | `Application` (`launch`, `init`, `start`, `stop`, `getParameters`, `Parameters`), `Platform` (`runLater`, `exit`, `isFxApplicationThread`) |
| `javafx.stage` | `Window`, `Stage` |
| `javafx.scene` | `Scene`, `Node`, `Parent` |
| `javafx.scene.layout` | `Region`, `Pane`, `FlowPane`, `HBox`, `VBox`, `StackPane`, `BorderPane`, `GridPane` |
| `javafx.scene.control` | `Control`, `Labeled`, `Label`, `ButtonBase`, `Button`, `TextInputControl`, `TextField`, `PasswordField`, `TextArea` |
| `javafx.scene.text` | `Font` |
| `javafx.geometry` | `Insets`, `Pos` |
| `javafx.event` | `Event`, `ActionEvent`, `EventHandler` |
| `javafx.beans.value` | `ObservableValue`, `ChangeListener` |
| `javafx.beans.property` | `StringProperty`, `SimpleStringProperty` |
| `javafx.collections` | `ObservableList` |

The event list has one event per line (blank lines and lines starting with `//` are skipped): `click <target>`, `type <target> "text"` (one `appendText` per character, as typing does), `set <target> "text"` (one `setText`), `enter <target>` (a text field's `onAction`) and `close` (the main window's close button). A target is `#N` (the node numbered N in the window JSON of the moment), `#id`, `Type "text"` or `Type K` (the first node of that class, or of a class extending it, with that text, or the K-th, counted in outline order). An event that can't happen is skipped with a problem in plain English in the window JSON, such as `click Button "Add": there's no button with the text "Add"`. The format of the window JSON is described at the top of `javafx/src/arena/fx/WindowJson.java`.

Where Java Arena's version differs from JavaFX on purpose: it doesn't lay windows out, so a scene's size is the one given to its constructor (else 0) and a window's width and height are what `setWidth` and `setHeight` recorded (else NaN); it has no style sheets, so `setStyle` is stored but not applied (real JavaFX applies it, and its own style sheet gives controls padding when they show); fonts aren't looked up on a computer, so `Font.font("Arial", 20)` keeps the family Arial (real JavaFX gives the System font when Arial isn't installed), while JavaFX's own families (System, Serif, SansSerif, Monospaced, with their aliases) follow JavaFX's rules exactly; and it makes controls and scenes before `launch` (in a static field or in `main`), as real JavaFX does only when its toolkit started before `main`. That is how the JDK's launcher starts an `Application` main class from the module path (`java --module-path ... --add-modules javafx.controls Main`). With JavaFX on the class path and `main` called directly (Maven's exec:java, a separate launcher class, fx-check's driver), or a main class that isn't the `Application`, real JavaFX starts its toolkit in `launch`, so `new Label(...)` before it fails with ExceptionInInitializerError (Toolkit not initialized) and `new Scene(...)` with a NullPointerException. The lessons make them in `start`. Everything else a program can observe is meant to match JavaFX 21: `scripts/javafx.test.mjs` tests it on the reference JDK, fidelity program 48 checks that the browser engine gives the same bytes, and `npm run fx-check` ([`scripts/fx-check/`](../../scripts/fx-check/)) runs the lessons' JavaFX programs and probes of the whole API on real OpenJFX 21 without a screen and compares the output and the windows.

On the reference JDK, a program whose main class extends `javafx.application.Application` runs through `scripts/javafx/JavaFxLauncher.java` (see there): the JDK's own launcher refuses such a class when JavaFX isn't one of its modules, while the browser engine just calls `main`.
