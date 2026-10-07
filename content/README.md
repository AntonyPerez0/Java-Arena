# Lesson content

This folder holds the course: `course.yaml` (every planned module, in order, with the MOOC sections it follows) and one file per written module in `modules/`, named after its place in the course (`01-printing.yaml`).

## License and credit

The lesson content in this folder is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0); the full legal code is in [LICENSE](LICENSE).

The course follows the order and topics of [Java Programming](https://java-programming.mooc.fi) by Arto Hellas, Matti Luukkainen and contributors, Agile Education Research group, University of Helsinki, licensed under CC BY-NC-SA 4.0. The MOOC section titles in `course.yaml` come from that course. The explanations, examples, exercises, hints and solutions are written for Java Arena; no MOOC exercise templates, tests or images are copied. Java Arena is not affiliated with or endorsed by the University of Helsinki or MOOC.fi.

## How a module is checked

`npm run content` (also part of `npm run build`) reads every module and checks it with the reference JDK (Eclipse Temurin 21.0.10+7, fetched by `scripts/get-jdk.sh`, or `JAVA_HOME`):

- every solution compiles without warnings and runs on every test input without an error; the expected outputs the site grades against are what it really prints;
- an `expect` written in a test must match that output exactly;
- a test's `writes` files are ones the solution really writes; their expected text is what it writes (see "Files a program writes");
- starter code must not already pass, and a fill-in with every blank empty must not pass;
- every solution follows its own `require` and `forbid` rules;
- every example program in the lesson text is compiled and run, and an `output` block after it must be exactly what it prints;
- every step has exactly three challenges, a `**Your turn:**` task and at least one hint per challenge;
- the expected output a task shows (its last plain ``` block) is exactly what the test the task card shows prints: the first visible test with `events`, or else the first visible test with `writes`, or else the first visible test;
- a test with `events` (a window) replays them on the solution, every event must reach its target, and the window it leaves is what the learner's is compared with; every ` ```java window ` example shows a window (see "Windows (JavaFX)");
- every ` ```classes ` block in lesson text is a class diagram the build can read, which it draws (see "Class diagrams");
- no key is misspelled, and every hint is a string of text (Markdown), not something YAML read as a list or mapping; quote a hint that contains `: `.

`npm run content:browser` (after `npm run build`) then replays every program in the browser engine and fails if anything differs from the JDK (for a test with `writes`, every file the run leaves in its folder too; for a JavaFX program, its window JSON, byte for byte).

## Writing a module

```yaml
id: printing                # must match an id in course.yaml
summary: One or two sentences for the module page.
steps:
  - id: printing-first-program   # permanent: progress is saved by it
    slug: first-program          # the address: /learn/printing/first-program
    title: Your first Java program
    text: |
      The lesson, in Markdown. Headings start at ###.

      **Your turn:** the task for challenge 1. Everything from here on is shown in the task card.
    fill: |                      # challenge 1 as a fill-in: [[answer]] marks a blank,
      ...System.out.[[println]]("Grace Hopper");...     # [[a‖b]] accepts a or b
    hints:
      - Shown one at a time.
    tests:
      - expect: Grace Hopper     # optional; checked against the real output
    more:                        # challenges 2 and 3, each with a task
      - task: |
          What to do.
        seed: |                  # starter code (for a code challenge)
          ...
        solution: |
          ...
        hints: [...]
        tests:
          - stdin: |             # input the program reads
              Ada
          - stdin: Linus
            hidden: true         # hidden tests stop hard-coded answers
        require:                 # rules on the code, with comments and strings removed first
          - pattern: System\.out\.println\s*\(
            min: 3               # optional counts; raw: true checks the code as written
            max: 3
            message: Shown when the rule isn't met.
        forbid:
          - pattern: ...
            message: ...
```

Two more kinds of challenge settings:

```yaml
  - task: |
      What does this program print?
    predict: |                   # "What does it print?": the learner types each line the program
      public class Main { ... }  # prints; the answers are its real output (1 to 8 lines, none empty)
    hints: [...]
  - task: |
      Re-indent this program.
    seed: |
      ...
    solution: |
      ...
    style: indent                # the indentation must match the braces to pass
```

Every solution, example and predict program must itself be indented to match its braces (4 spaces per level); the build checks it.

A test can call the learner's methods instead of running `main`:

```yaml
    tests:
      - call: countdown(3);          # Java statements, written as they'd be inside Main
      - call: |
          int smaller = smaller(3, 7);
          System.out.println(smaller);
        hidden: true
      - stdin: "5"                   # a test without `call` still runs main
```

### Programs of several files (classes)

When a challenge needs a class of its own next to `Main`, give `seed` and `solution` as a map of file names to code. The editor shows a tab for each file, in this order, and the check compiles them together (Main.java is required, and a public class must be in the file of its name):

```yaml
    seed:
      Book.java: |
        public class Book {

        }
      Main.java: |
        public class Main {
            public static void main(String[] args) {
                Book book = new Book("Dune", 412);
                System.out.println(book);
            }
        }
    solution:
      Book.java: |
        public class Book {
            ...
        }
      Main.java: |
        ...
    tests:
      - call: |                  # tests can create objects and call their methods
          Book b = new Book("Emma", 474);
          System.out.println(b.getPages());
```

A `java run` example (and a `predict` program) can hold several files too: each file after the first starts with a line such as `// ==== Book.java ====` (or `// ==== library/domain/Book.java ====` for a class in a package, see below), and the page shows each file under its name.

### Classes in packages (folders)

A class in a package sits in the package's folders, and its name in a file map says so: `library/domain/Book.java` is the class `Book` of the package `library.domain`. Folder names are Java names in small letters (`library`, `domain`, digits and `_` can follow the first letter, no reserved words such as `class`), separated by `/`; the file is named after its class, as always. `Main.java` stays at the top, in no package: the site starts every program with the class `Main`. Other files can be at the top or in folders.

```yaml
    solution:
      Main.java: |
        import library.domain.Book;

        public class Main {
            public static void main(String[] args) {
                Book book = new Book("Dune", 1965);
                System.out.println(book.getTitle());
            }
        }
      library/domain/Book.java: |
        package library.domain;

        public class Book {
            ...
        }
      library/ui/TextUi.java: |
        package library.ui;

        import library.domain.Book;
        ...
```

- **The package line.** In a solution, a `predict` program and a lesson example that runs (`java run`, `java run crash`, `java test`), a file in the folder `library/domain/` must start with `package library.domain;` (comments may come before it), and a file at the top must have no package line. Otherwise the build stops with an error that names the file and the line it needs. javac itself doesn't check this for the files it's given, but it looks for a class it needs in the folders of its package, so a wrong line gives confusing errors elsewhere. A seed isn't checked: its package line may be wrong on purpose, for the learner to fix, and so may a `java error` example's.
- **In lesson text**, the marker line of a file names its path: `// ==== library/domain/Book.java ====`, and the page shows the file under that path.
- **Tests that call methods.** The check program imports each public class of the learner's files that have a package line, one class per import (`import library.domain.Book;`), so a `call:` names these classes by their simple names, as `Main` does after its imports. A simple name that two packages share, or that a class in no package also has, isn't imported: a test names that class in full (`new library.domain.Book("Emma", 1815)`). A program without packages gets no extra imports, so its tests read as before. A class or method in a package that isn't `public` can't be called from the check (nor from `Main`); the learner is told to make it `public`.
- **JUnit.** A test class in a package is named with its package, as JUnit's runner loads it: `junit: library.domain.BookTest`. `replace:` names files by their paths (`library/domain/Book.java: ...`).
- **How the site shows them.** In the editor, the tab of a file in a folder shows its folders in small letters above the file name (`library/domain/` over `Book.java`), which keeps the row of tabs narrow on a phone; screen readers hear the whole path. javac's messages, crash notes and the error counts on the tabs name each file by its path (`library/domain/Book.java, line 3`). In the Playground, "Add a class" takes `Book`, or `library.domain.Book` (or `library/domain/Book`), which creates `library/domain/Book.java` starting with `package library.domain;`.

### Files a program reads

A test can give the program files to read, in its working folder:

```yaml
    tests:
      - files:
          scores.txt: |
            7
            9
      - files:
          scores.txt: "10\n"
        hidden: true
```

A name may have folders in front of it (`data/scores.txt`): the folder is made for the file. Names are letters, digits, `_`, `-` and `.`, with `/` between folders; no `..`.

In lesson text, a ` ```file scores.txt ` block before a ` ```java run ` example is a file that example reads (shown with its name). Its name follows the same rules, folders included (` ```file data/scores.txt `); the build fails on a name it can't use.

### Files a program writes

A test can check the files the program leaves in its working folder, with `writes`:

```yaml
    tests:
      - files:
          scores.txt: |
            3
            5
        writes: [summary.txt]        # the solution's run gives the text, as it gives the output
      - files:
          scores.txt: "10\n20\n"
        writes: [summary.txt]
        hidden: true
      - writes:                      # or a map: the text each file must hold (checked against
          reports/names.txt: |       # the solution's file, like `expect` against its output)
            ADA
            GRACE
```

- **The expected text** is what the model solution writes when the build runs it on the JDK, read before its folder is deleted. The solution must write every named file (the build stops with an error naming the missing one and the files it did leave), and with the map form each file must hold the given text. A name may be in a folder (`reports/summary.txt`); the program makes the folder (`Files.createDirectories`), or a file in `files:` sits in it. A name in `writes` may also be in `files:`, for a program that changes that file (appending to `log.txt`), but not one the solution leaves as it was.
- **Grading.** A test with `writes` still compares the output (so a program that should print nothing must print nothing), and each file's text is compared the way output is: line endings, spaces at the ends of lines and blank lines at the end don't matter; everything else does, names too (`Summary.txt` isn't `summary.txt`). A program whose result is its files may print nothing: the build's "prints nothing" error doesn't apply to a test with `writes`. The build's check that starter code doesn't already pass counts the files too: starter code that prints the right output but doesn't write the files is fine. `writes` works with `call:` tests (the check runs in the same folder) but not with `junit:`.
- **What the learner sees.** The task card shows the first visible test with `writes`: its input and files on the left, and on the right the expected output, then "The file summary.txt after the run" with the text each file should hold. When a file is wrong, the results show "The file summary.txt should contain" next to "your program wrote" (or that it didn't create the file), in the style of the output comparison; when only the file is wrong, the output isn't compared again. A hidden test says only which file isn't right, never its text. A run that is stopped (the time limit) keeps no files, so they aren't compared.
- **In the task text**, show a file's contents in a ` ```text ` block: a plain ` ``` ` block is read as the expected output (see "How a module is checked").

"Run with my input" (and the Playground's Run) shows, under the output, every file the program created or changed in its folder, each under its name ("The file summary.txt after the run"); a file of more than 15 lines or 1500 characters starts folded. The files a challenge gives the program are shown only if the program changed them. The output shows what the program printed and its error messages (System.err, a crash) in the order it wrote them, as a terminal does; grading compares what it printed to System.out only.

### Command-line arguments

A test that runs `main` can give it command-line arguments, a list of text, as `java Main --title=Scores extra` would:

```yaml
    tests:
      - args: [--title=Scores, extra]   # main's args: ["--title=Scores", "extra"]
```

The task card and the results show them under "Command-line arguments". Not with `call:` (the check program uses the arguments itself) or `junit:`. A JavaFX program gets them from `getParameters()` (see "Windows (JavaFX)"). "Run with my input" calls `main` without arguments (unlike the input box and the files, which come from the tests), and the run box says so under its input; a challenge with `args` should also say it in its text, as the lesson step "Launch parameters" does, and its program should do something sensible without them.

### Input that ends with an empty line

Input normally ends with one line break. To end it with an empty line on purpose (for a program that reads until an empty line), keep the blank line with YAML's `|+`, or write it quoted: `stdin: "Ada\nBen\n\n"`. The page shows it as "(an empty line)".

### Tests that call methods

The site compiles a hidden class, `ArenaCheck extends Main`, whose `main` runs the test's code (so a call reads exactly as it would inside `Main`), and grades what it prints. It imports `java.util.*`, so a test can build an `ArrayList` by its short name (and the learner's public classes in packages, see "Classes in packages" above). An exception from the learner's code, checked or not, comes out unchanged, as it would from `Main` itself. The build does the same on the JDK. When the learner's own code compiles but the check can't call it (a misspelled name, other parameter types, a `private` or non-`static` method, a `void` method whose value is used, a class not called `Main` or a `Main.java` with a package line, a class in a package that isn't `public`), the learner gets a plain explanation that names the call instead of the check program's javac errors. A test named after a one-line call shows that call as its name.

### Unit tests (JUnit)

A program that uses `org.junit` is compiled with JUnit 4.13.2 and Hamcrest Core 1.3 on the class path, as `javac -cp .:junit-4.13.2.jar:hamcrest-core-1.3.jar` would, on the JDK at build time and in the browser. A program of classes and their test classes needs no `Main.java`.

Tests run through ArenaTests, a small class of the site's (`src/grader/junit.js`) that runs each test class with JUnit's own runner and prints a report that is the same on every run. JUnit's text runner prints how long the tests took and runs them in an order of its own, so it can't be compared with a fixed output. The report lists the tests in alphabetical order, each passed or FAILED; a failure shows the exception JUnit reports (with JUnit's own message, such as `expected:<8> but was:<0>`) and the first line of the program's own code in its stack trace:

```
TallyTest: 3 tests
  addsUp: passed
  countsOne: FAILED
    java.lang.AssertionError: expected:<1> but was:<0>
    at TallyTest.countsOne(TallyTest.java:24)
  startsAtZero: passed
2 of 3 tests passed
```

- **Examples in lesson text:** a ` ```java test ` block holds the classes and their test classes, with a `// ==== Name.java ====` line before each file, and must be followed by an ` ```output ` block with the report. The build runs every class that has a `@Test`.
- **Challenges where the learner writes tests:** give `seed` and `solution` as maps of files (the test class first, so it's the tab that opens), and tests with `junit:` instead of `stdin` or `call`. Each test runs that test class, either on the program as written or with some files swapped for other versions (`replace:`). `outcome: pass` (the default) wants every test to pass, and `outcome: fail` wants at least one to fail, which means the learner's tests caught the bug. Every test needs a `name` that says which version it runs on; the task card lists the visible ones.

  ```yaml
  tests:
    - name: The Tally as it is
      junit: TallyTest
    - name: A Tally whose add forgets what was there
      junit: TallyTest
      outcome: fail
      replace:
        Tally.java: |
          public class Tally {
              ...
          }
    - name: A Tally that subtracts
      junit: TallyTest
      outcome: fail
      hidden: true
      replace:
        Tally.java: |
          ...
  ```

  The build checks that the solution gets every outcome and that the starter code doesn't. Versions in `replace` keep the same methods (only their behavior changes), so the learner's tests compile with each one. Hidden tests are for buggy versions. In a challenge with `junit` tests, every test has `junit`.
- **Challenges where the learner writes the class and given tests check it:** put the test class in the files too, with a `junit` test with `outcome: pass`, and add `replace` with the test class itself (`replace: { TallyTest.java: ... }`), so editing the tests can't make them pass.
- "Run with my input" becomes "Run my tests" in a challenge with `junit` tests, and runs the learner's test classes.

Every Java block in lesson text says what it is:

- ` ```java run ` a complete program; it's compiled and run. An ` ```input ` block right after it is what it reads, and an ` ```output ` block after that must be exactly what it prints.
- ` ```java main ` statements that are run inside a main method (imports such as `java.util.Scanner` are added when used); same checks.
- ` ```java error ` code that must not compile. A ` ```javac ` block after it must be exactly what javac prints.
- ` ```java run crash ` a complete program that must stop with an uncaught exception (to show a crash on purpose). Its ` ```input ` and ` ```output ` blocks are optional; a ` ```crash ` block after them must be exactly what Java prints: the `Exception in thread "main" ...` line and the program's own `at Main...` lines (lines inside Java's own classes are left out, since they differ between JVMs).
- ` ```java test ` classes and their JUnit test classes; the tests are run, and an ` ```output ` block after it must be exactly the report (see "Unit tests (JUnit)").
- ` ```java window ` a complete JavaFX program that shows a window, optionally followed by an ` ```events ` block; the page draws the window after those events (see "Windows (JavaFX)").
- ` ```java fragment ` a piece of code that can't run on its own; shown only.

### Class diagrams

A ` ```classes ` block in a step's text or in a task describes a UML class diagram in a few lines of text. The build draws it as a picture in the site's colors (light and dark), with the same content in words under it ("The diagram as text", which screen readers read; the picture itself is hidden from them):

````text
```classes
class Person
- name: String
- age: int
+ Person(name: String, age: int)
+ getName(): String

abstract class Shape
+ area(): double {abstract}

interface Saveable
+ save(): void

class Student extends Person implements Saveable
- studentNumber: int

class Course

class Room

Course --> * Student
Course --> 0..1 Room
```
````

- **Classes.** Each class starts with a header line: `class Name`, `abstract class Name` or `interface Name`, then, for a class, `extends Parent` (one class) and `implements Interface, Another`; an interface can `extends Interface, Another`. Every class a header or a connection names must be in the diagram: a header line alone (`class Course`) draws a box with only the name. A blank line ends a class.
- **Members.** The lines right after the header, one per field, constructor or method, each starting with its visibility: `-` private, `+` public, `#` protected, `~` package-private (no modifier). A field is `- name: Type`, a constructor `+ Person(name: String, age: int)` (the class's name, no return type), a method `+ getName(): String` (parameters as `name: Type`, the return type after the colon; `void` too). Fields come first, then constructors and methods, as they're drawn. `{abstract}` at the end of a method's line marks an abstract method (drawn in italics); only an abstract class or an interface can have one. A line `...` stands for more members that aren't shown.
- **Connections**, one per line, usually after the classes: `Ticket --> Show` (each Ticket has one Show, such as a field of type Show), `Course --> * Student` (any number of Students, such as a list), with the multiplicity at the end the arrow points to: `1`, `0..1`, `*`, `1..*` or a range like `2..4`. A multiplicity before the arrow is for the other end: `Course 1 --> * Student` (each Student belongs to one Course). `Student * -- * Course` (no arrowhead) connects two classes that both know each other. `: name` at the end names the connection: `Order --> 1..* Product : items`. Each pair of classes is connected once at most, and a class can't be connected to itself (say that in the text instead).
- **How it's drawn.** A box per class: its name in bold (an abstract class's in italics, under «abstract»; an interface's under «interface»), a line, the fields, a line, the constructors and methods, as written (an interface without fields has no empty part for them). A parent is above its children, joined by a line with a hollow triangle at the parent (dashed for an interface a class implements). A connection is a line with an open arrowhead and its multiplicities at the ends. The layout is automatic: a row for each level of inheritance, classes in the order they're declared unless another order keeps lines from crossing, and a class outside any inheritance next to what it's connected to. Up to six or so classes lay out well; a diagram can have at most 12.
- **Width.** The text in a drawing is as large as small print (12 px at the normal text size). A drawing wider than the lesson column shrinks until its text is 11 px and then scrolls sideways inside its frame, which is the case for most diagrams of two or more classes side by side on a phone. The longest line of a box sets its width, so keep member lines short: short parameter names rather than leaving types out.
- **Mistakes** stop the build with a message that names the step, the diagram (`class diagram 2`) and its line: a class that isn't in the diagram, a member line outside a class, a field after a method, `{abstract}` in a class that isn't abstract, a class that implements a class or extends an interface, inheritance in a circle, a pair connected twice, and so on.

Diagrams are drawn in step text and tasks, not in hints or drills; the build fails on a ` ```classes ` block in a hint or a drill. Its fence must be three backticks at the start of a line: a block indented in a list, in a quote (`>`) or fenced with `~~~` isn't drawn, and the build fails on it too. A ` ```classes ` block isn't one of the plain ``` blocks a task's expected output is compared with.

## Windows (JavaFX)

Real JavaFX doesn't run on Java Arena's engine (Ristretto, a JVM in WebAssembly), nor on the other browser Java engines that the site's research looked at (`docs/research/`: CheerpJ lists JavaFX as future work, and TeaVM's class library has no JavaFX), so Java Arena has its own practice version of the part of JavaFX the lessons use: the same package, class and method names, written for this site (`engine/libraries/javafx/`; it isn't OpenJFX's code). Learners write ordinary JavaFX code. A program **uses it** when any of its files mentions `javafx.` (an import or a full class name); the build, the grader, the Playground and free runs then put it on the class path, as they do JUnit.

**How a program runs.** It runs to the end like any other program. `Application.launch` makes the program's `Application` object (on the JavaFX Application Thread), calls `init()` (on a thread named JavaFX-Launcher), then `start(stage)` on the thread named `JavaFX Application Thread`. Then it **replays the clicks and typing** of the run (the test's `events`, or what the learner clicked on the page) one at a time, each after the previous one's handlers and the `Platform.runLater` tasks they queued. Then it writes the showing windows as JSON (`.arena/window.json`), runs the tasks still queued, calls `stop()`, and `launch` returns. The page draws the window from that JSON; each click on the page reruns the whole program from the start with one more event. The session ends early when `Platform.exit()` is called or the last window closes (the rest of the events are skipped). An exception that escapes a handler prints `Exception in thread "JavaFX Application Thread" ...` on System.err and the session goes on, as in JavaFX; one from the constructor, `init`, `start` or `stop` is printed as JavaFX prints it and thrown from `launch`. A run with JavaFX gets 15 seconds in the browser. Everything in the program's `.arena/` folder is Java Arena's own: it's never listed as a file the program wrote, and a test can't give or check a file there.

Model solutions and examples with windows must be **deterministic**: the same window and output on every run. No unseeded `Random` (use `new Random(42)`), no `Collections.shuffle(list)` without a Random (use `Collections.shuffle(list, new Random(42))`), no `Math.random()`, `UUID.randomUUID()` or `SecureRandom`, no clock (`System.currentTimeMillis()`, `nanoTime()`, `LocalDate.now()`, `Calendar.getInstance()` and the like), no `System.identityHashCode`, and no `Set.of` or `Map.of` (their order changes from run to run, even on the JDK). The build rejects these in a solution with `events` tests and in a ` ```java window ` example; a learner's program that uses them may simply not match. Don't print a node itself either (`System.out.println(label)` prints `Label@` and its identity hash, which changes from run to run), nor keep nodes in a `HashSet` or as `HashMap` keys and go through them: the order follows the identity hashes, and in the browser's Java engine it can change between two runs of the same clicks. The JDK-versus-browser check (almost always) finds such a program, since the hashes differ there. The window panel names a button by its text when no other button has it (and a node by its id when no other node has it), so a learner's click still reaches it when the order changes.

### The classes and methods

Exactly these, with JavaFX 21's behavior. Anything else from `javafx` (`CheckBox`, `Slider`, `Canvas`, `setOnMouseClicked`, `Alert`, `ListView`...) doesn't exist here: javac says "cannot find symbol" or "package does not exist", so a lesson or task must not use it. Charts, drawing, shapes, animation and keyboard events are for part 14.

- `javafx.application.Application` (abstract): `Application()`; `static void launch(Class<? extends Application> appClass, String... args)`; `static void launch(String... args)` (the class that calls it must extend Application); `void init() throws Exception` and `void stop() throws Exception` (both empty); `abstract void start(Stage primaryStage) throws Exception`; `final Application.Parameters getParameters()`. `launch` can be called once.
- `Application.Parameters`: `List<String> getRaw()` (every argument), `Map<String, String> getNamed()` (each `--key=value` argument whose key starts with a letter or `_`; the last value of a key wins), `List<String> getUnnamed()` (the others, in order). As in JavaFX, a `null` argument given to `launch` is left out of all three.
- `javafx.application.Platform`: `static void runLater(Runnable)` (runs after the current event, in order; don't print from a task queued after `Platform.exit()`, which races with `stop()` in real JavaFX, nor from a task queued by a task that `stop()` queued, which races with the toolkit's exit there; in `init`, print nothing after queuing a task and don't wait for it, since real JavaFX runs it at once on the JavaFX Application Thread while `init` goes on, and Java Arena's JavaFX only after `init` returns), `static void exit()` (ends the session: the windows close, the rest of the events are skipped, `stop()` runs once), `static boolean isFxApplicationThread()`.
- `javafx.stage.Window`: `getWidth()`, `setWidth(double)`, `getHeight()`, `setHeight(double)`, `getScene()`, `isShowing()`, `hide()`.
- `javafx.stage.Stage extends Window`: `Stage()`, `setTitle(String)`, `getTitle()` (default `null`), `setScene(Scene)`, `show()`, `close()`, `setResizable(boolean)`, `isResizable()`. Sizes and resizable are only recorded: there is no layout, so a size never set stays `NaN`. Closing the last showing window ends the session. Windows are made, shown and closed only on the JavaFX Application Thread.
- `javafx.scene.Scene`: `Scene(Parent root)`, `Scene(Parent root, double width, double height)`, `getRoot()`, `setRoot(Parent)`, `getWidth()`, `getHeight()` (the size given, else 0).
- `javafx.scene.Node` (abstract): `setId(String)`, `getId()`, `setDisable(boolean)`, `isDisable()` (its own flag), `isDisabled()` (it or a pane it is in), `setVisible(boolean)`, `isVisible()`, `getParent()`, `getScene()`, `setStyle(String)`, `getStyle()` (stored, not applied, default `""`; real JavaFX applies it, so use styles only for colors and borders, see "What the outline compares"), `lookup(String)` (only `#id`), `toString()`.
- `javafx.scene.Parent extends Node` (abstract): `getChildrenUnmodifiable()`, `lookup(String)` (depth first), and the protected `getChildren()`.
- `javafx.scene.layout.Region extends Parent`: `Region()`, `Region.USE_COMPUTED_SIZE` (-1), `setPadding(Insets)`, `getPadding()` (default `Insets.EMPTY`), `setPrefWidth(double)`, `getPrefWidth()`, `setPrefHeight(double)`, `getPrefHeight()`, `setPrefSize(double, double)`, `setMinSize(double, double)` and `setMaxSize(double, double)` (recorded only).
- `javafx.scene.layout.Pane extends Region`: `Pane()`, `Pane(Node...)`, `getChildren()`: an `ObservableList<Node>` with JavaFX's rules (adding `null` throws a NullPointerException, a node already in the list or a pane into its own child an IllegalArgumentException; a node added elsewhere leaves its old pane first).
- The panes, each `extends Pane`:
  - `HBox` and `VBox`: `()`, `(double spacing)`, `(Node...)`, `(double spacing, Node...)`, `setSpacing(double)`, `getSpacing()`, `setAlignment(Pos)`, `getAlignment()` (default `TOP_LEFT`).
  - `FlowPane`: `FlowPane()`, `FlowPane(Node...)`, `FlowPane(double hgap, double vgap)`, `setHgap(double)`, `getHgap()`, `setVgap(double)`, `getVgap()`, `setAlignment(Pos)`, `getAlignment()` (default `TOP_LEFT`).
  - `StackPane`: `StackPane()`, `StackPane(Node...)`, `setAlignment(Pos)`, `getAlignment()` (default `CENTER`).
  - `BorderPane`: `BorderPane()`, `BorderPane(Node center)`, `BorderPane(Node center, Node top, Node right, Node bottom, Node left)`, `setTop`, `getTop`, `setLeft`, `getLeft`, `setCenter`, `getCenter`, `setRight`, `getRight`, `setBottom`, `getBottom`.
  - `GridPane`: `GridPane()`, `add(Node child, int column, int row)`, `add(Node child, int column, int row, int colspan, int rowspan)`, `static Integer getColumnIndex(Node)`, `static Integer getRowIndex(Node)`, `setHgap(double)`, `getHgap()`, `setVgap(double)`, `getVgap()`, `setAlignment(Pos)`, `getAlignment()` (default `TOP_LEFT`).
- `javafx.scene.control.Control extends Region` (abstract).
- `javafx.scene.control.Labeled extends Control` (abstract): `setText(String)`, `getText()` (default `""`), `textProperty()`, `setFont(Font)`, `getFont()`, `setWrapText(boolean)`, `isWrapText()`.
  - `Label extends Labeled`: `Label()`, `Label(String)`.
  - `ButtonBase extends Labeled` (abstract): `setOnAction(EventHandler<ActionEvent>)`, `getOnAction()`, `fire()` (does nothing when the button is disabled).
  - `Button extends ButtonBase`: `Button()`, `Button(String)`.
- `javafx.scene.control.TextInputControl extends Control` (abstract): `setText(String)`, `getText()` (default `""`), `textProperty()`, `appendText(String)`, `clear()`, `getLength()`, `setPromptText(String)`, `getPromptText()`, `setEditable(boolean)`, `isEditable()`, `setFont(Font)`, `getFont()`. A text field drops line breaks, tabs and other control characters, as JavaFX's does; a text area keeps line breaks and tabs.
  - `TextField extends TextInputControl`: `TextField()`, `TextField(String)`, `setOnAction(EventHandler<ActionEvent>)` (pressing Enter), `getOnAction()`.
  - `PasswordField extends TextField`: `PasswordField()`.
  - `TextArea extends TextInputControl`: `TextArea()`, `TextArea(String)`, `setWrapText(boolean)`, `isWrapText()`.
- `javafx.scene.text.Font`: `Font(double size)`, `Font(String name, double size)`, `static Font font(double size)`, `static Font font(String family, double size)`, `static Font getDefault()` (System, 13.0), `getName()`, `getFamily()`, `getSize()`, `equals`, `hashCode`, `toString()` as JavaFX prints it. **Use only JavaFX's own families, which every computer has: `System`, `Serif`, `SansSerif` and `Monospaced`** (any case; `Dialog` and `sans-serif` are SansSerif, `DialogInput` and `monospace` are Monospaced). They follow JavaFX's rules exactly: `Font.font("Serif", 20)` is named `Serif Regular`; `new Font(name, size)` takes a full name such as `"Serif Bold"` (the family, then `Regular`, `Bold`, `Italic` or `Bold Italic`), so `new Font("Serif", 20)` is the System font, as in JavaFX. Another family (`Arial`, `Verdana`...) is kept as asked here, but real JavaFX shows it only on a computer that has it and the System font elsewhere, so the check against real JavaFX fails on it.
- `javafx.geometry.Insets`: `Insets(double)`, `Insets(double top, double right, double bottom, double left)`, `Insets.EMPTY`, `getTop()`, `getRight()`, `getBottom()`, `getLeft()`, `equals`, `hashCode`, `toString()` (`Insets [top=10.0, right=10.0, bottom=10.0, left=10.0]`).
- `javafx.geometry.Pos`: `TOP_LEFT`, `TOP_CENTER`, `TOP_RIGHT`, `CENTER_LEFT`, `CENTER`, `CENTER_RIGHT`, `BOTTOM_LEFT`, `BOTTOM_CENTER`, `BOTTOM_RIGHT`, `BASELINE_LEFT`, `BASELINE_CENTER`, `BASELINE_RIGHT` (an enum: `values()`, `valueOf`, `name()`).
- `javafx.event.Event extends java.util.EventObject`: `getSource()` (the button or text field). `javafx.event.ActionEvent extends Event`: `ActionEvent()`. `javafx.event.EventHandler<T extends Event>`: `void handle(T event)`, usually written as a lambda (`button.setOnAction(e -> ...)`).
- `javafx.beans.value.ObservableValue<T>`: `addListener(ChangeListener<? super T>)`, `removeListener(ChangeListener<? super T>)`, `getValue()`. `javafx.beans.value.ChangeListener<T>`: `void changed(ObservableValue<? extends T> observable, T oldValue, T newValue)`. Listeners hear only real changes, in the order they were added. As in JavaFX, a listener that changes the value again while the listeners hear of a change tells them all about the new change at once, and the listeners after it then hear the earlier change with the newest value: their old and new values can be equal.
- `javafx.beans.property.StringProperty` (abstract, an `ObservableValue<String>`): `get()`, `set(String)`, `getValue()`, `setValue(String)`, `addListener`, `removeListener`. `javafx.beans.property.SimpleStringProperty`: `SimpleStringProperty()`, `SimpleStringProperty(String)`.
- `javafx.collections.ObservableList<E> extends java.util.List<E>`: everything a List has, plus `addAll(E...)`, `setAll(E...)`, `setAll(Collection<? extends E>)`, `removeAll(E...)`, `remove(int from, int to)`.

### Clicks and typing (event lines)

A test's `events`, a ` ```events ` block and the page all use the same lines, one event per line (blank lines and lines starting with `//` are skipped):

| Line | What happens |
|---|---|
| `click Button "Add"` | clicks the button (`fire()`: a disabled button does nothing) |
| `type TextField 1 "Ada"` | types the text at the end of the field, one character at a time (each is one `appendText`, so a text listener hears every character) |
| `set TextArea 1 "two\nlines"` | replaces the whole text at once (one `setText`), as pasting over it would |
| `enter TextField 1` | presses Enter in the text field (its `setOnAction` handler, if any, unless it's disabled) |
| `close` | closes the main window, as its close button would (the session ends when no window is left) |

The **target** comes after `click`, `type`, `set` and `enter`:

- `Button "Add"`: the first node of that class (or of a class that extends it: a learner's `class MenuView extends VBox` is a `VBox`) whose text is exactly that text. Use this for buttons and labels.
- `TextField 2`: the second node of that class. Use this for text fields, whose text changes.
- `#title`: the node whose `setId("title")` gave it that id.
- `#3`: the node numbered 3 in the window JSON of the moment (the page uses these; a test shouldn't, since the numbers shift when a node is added).

The classes a target can name: `Button`, `Label`, `TextField`, `PasswordField`, `TextArea`, and `ButtonBase`, `Labeled`, `TextInputControl`, `Control`, `Region`, `Node`, `Parent` and the panes (`VBox`, `HBox`, `FlowPane`, `StackPane`, `BorderPane`, `GridPane`, `Pane`). Nodes are counted in **outline order**: depth first, a pane's children in their order, a BorderPane's regions as top, left, center, right, bottom, and a GridPane's children by row, then column, then the order they were added; the windows one after another, the main one first. Text is in double quotes with Java's escapes (`\"`, `\\`, `\n`, `\t`, `\uXXXX`).

An event that can't happen is skipped, and the window JSON lists it as a problem in plain English, which the results show: `click Button "Add": there's no button with the text "Add"`, `type TextField 2 "x": there's only 1 text field`, `click Label "Total": a label can't be clicked (only buttons can)`, a hidden button or field, typing in a disabled or not editable field, Enter in something that isn't a text field, a line that can't be read. Clicking a disabled button isn't a problem (it does nothing, as in JavaFX). The page shows each event in plain words too: `Type "Ada" in text field 1, then click "Greet"`.

### Tests with events

A test with `events` checks the window: the solution runs with them on the JDK at build time, and the learner's window after the same events must be the same (compared by its outline, below), as must the output.

```yaml
    tests:
      - events: |                     # a block of text, one event per line (the easiest to write)
          type TextField 1 "Ada"
          click Button "Greet"
      - stdin: |                      # with input, files and command-line arguments too
          Hi
        args: [--title=Greeter]
        events: |
          type TextField 1 "Grace"
          click Button "Greet"
          set TextField 1 "Linus"
          click Button "Greet"
        hidden: true
      - events: []                    # no events: the window as start leaves it
      - events:                       # or a list, one line each: quote a line that has " #" or ": " in it,
          - 'click #ok'               # which YAML reads as a comment or a key
          - close
```

- **Rules.** `events` goes with `stdin`, `args`, `files` and `writes`, not with `call:` or `junit:`. The program must use JavaFX. Every event must reach its target on the solution (a problem is an error in the test), and the solution must show a window at the end (or end with the windows closed, after `close` or `Platform.exit()`); it must end normally and print nothing on System.err. A test with events may print nothing: the window is its result (the build's "prints nothing" error doesn't apply).
- **What's stored.** The test keeps its event lines, the solution's window JSON and its outline; the grader writes the events to `.arena/events.txt` in the program's folder before the run, reads `.arena/window.json` after it, and compares the outlines and the output. A test passes when the output is right, the outline is the same and every event could happen.
- **The task card** shows the first visible test with `events`: its input and arguments, "Clicks and typing" (the events in plain words), the expected output, and "The window should look like" (the drawing and its outline). So the expected output in the task's last plain ``` block must be what that test prints. Write tasks that say what the window should hold (the texts of its labels and buttons), since the outline compares them exactly.
- **Results.** For a visible test, "The window should look like" next to "Your window", with the lines that differ marked, and the events that couldn't happen in plain words. For a **hidden test**, only which events it used and that the window isn't right, never the expected window. Use hidden tests with other input and other clicks, so a window can't be hard-coded; the build warns about a challenge that replays clicks and typing without a hidden test.
- **Starter code** must not pass, counting the window: starter code that prints the right output but whose window differs is fine.
- A `writes` test may have events too (a program that saves what was typed); `.arena/` files are never part of `writes`.

### What the outline compares

The outline is the window as text, one line per window and per node, indented two spaces per level. It's what grading, the JDK-versus-browser replay and the check against real JavaFX compare, and what the page shows under "The window as text":

```text
Window "Counter"
  VBox spacing 10, padding 10
    Label "Clicks: 2"
    HBox spacing 5
      Button "Add"
      Button "Reset" (disabled)
```

- A window's line is `Window "its title"`, or `Window without a title`; a window without a scene has `(no scene)` under it (don't show one in a lesson: real JavaFX without a screen fails on it, so the check against real JavaFX can't confirm it). No window showing: `No window is open.`; after `close`, `Platform.exit()` or the last window closed: `No window is open: the windows were closed.`
- A node's line: its class (the nearest one of the list above), its id (`#title`), its text in quotes (labels, buttons, text fields and text areas, even when empty), then, when they aren't the default, `prompt "..."`, `font Serif 22`, `spacing`, `hgap`, `vgap`, `padding 10` (or `padding 2 4 2 4`: top, right, bottom, left), `alignment CENTER_LEFT`, `pref width`, `pref height`, `style "..."`, and the flags `(disabled, hidden, not editable, wraps text)`. A BorderPane's children start with their region (`top: Label "Menu"`), a GridPane's with their cell, column first (`(0, 1) Button "7"`, `(0, 1) span 2x1 TextArea ""`).
- **Not compared:** the node numbers, the sizes of windows and scenes (`stage.setWidth`, `new Scene(root, 300, 200)`), and whether a button has a handler. Everything else is: the texts, the classes, the order and nesting of the nodes, ids and styles too. So a solution should set an id, a style, a font, a size or a padding only when the task asks for it, and the task should say exactly which.
- **Styles are text here.** A style is compared as the text it is, and the page draws it approximately; Java Arena's JavaFX doesn't apply it. Real JavaFX does, and a style that sets a font (also on everything in a pane), padding, spacing, gaps, alignment, sizes, wrapping or visibility changes what its window holds, so the check against real JavaFX fails. Set those with `setFont`, `setPadding`, `setSpacing` and the like, and keep styles for colors and borders (`-fx-text-fill`, `-fx-background-color`, `-fx-border-color`).
- The event problems aren't part of the outline, but any problem fails the test.
- **On a phone.** The page wraps a long line of the window as text under its own start, one step further in, so nothing is cut off. A window wider than the column (most windows with a `TextArea`, which is 546 px wide) scrolls sideways inside its frame, and a note under the frame says so, since phones show a scrollbar only while scrolling.

### Lesson examples with a window

A ` ```java window ` block is a complete program (several files allowed, with `// ==== MenuView.java ====` lines, as in `java run`) that shows a window. An ` ```events ` block right after it holds the clicks and typing to replay; then ` ```input ` and ` ```output ` blocks work as after `java run` (the output block must be exactly what it prints; a program that prints something needs one, or the build warns). ` ```file ` blocks before it are files it reads.

````text
```java window
import javafx.application.Application;
...
```

```events
type TextField 1 "Ada"
click Button "Greet"
```

```output
Greeted Ada
```
````

The build runs it on the JDK with the events, and it must end normally, print nothing on System.err, show a window at the end (a `java window` that shows none, or ends with its windows closed, is an error), and every event must reach its target. The lesson shows the code, then the window after those events, drawn (not clickable) with "The window as text" under it, then the output. A `java run` example that shows a window is an error: it must be `java window`. An ` ```events ` block anywhere else is an error. (In the generated lesson, the build puts a ` ```window ` block in place of the events block: one line of JSON with the events, the window JSON and its outline, which the page draws. Don't write one by hand.)

### Drills with windows

A boss drill can have `events` tests, checked and graded exactly as in a lesson challenge. A boss rep shows only its prompt and the editor (no task card), so the prompt must say what the window should hold and what the clicks do; the results show the window comparison when a test fails. The other drill types run their code in `main` and can't show a window; when a drill's code uses JavaFX, the build runs its statements in `start` instead (`Main` extends `Application`, `main` calls `launch(args)`, and `start` ends with `Platform.exit()`), because whether real JavaFX can make controls before `launch` depends on how the program is started, and as the check runs programs (JavaFX on the class path, `main` called directly) it can't. Such a prompt says "This code runs inside `start`", and the drill shows `// inside start:` above the statements.

### Checking

`npm run content` checks everything above on the JDK. `npm run content:browser` then replays every test with events and every `java window` example in the browser engine and compares the window JSON byte for byte, and the output, with the JDK's (`CONTENT_ONLY=gui` replays only the programs whose place matches).

`npm run fx-check` (after `npm run content`) runs every model solution and example that uses JavaFX on **real OpenJFX 21** without a screen, with the same input, arguments, files, clicks and typing, and compares the output, the files written, the window outline and the events that couldn't happen with Java Arena's JavaFX (`FX_CHECK_ONLY=gui` checks only the programs whose place matches). CI fails on any difference. This is what lets a lesson say that the same code shows the same window contents with real JavaFX. Besides the fonts and styles above, real JavaFX differs in what Java Arena's JavaFX can't do, so a lesson's program must not depend on these (the check fails, or can't run it):

- After the window shows, real JavaFX lays it out: a window's or scene's size, and a control's padding or font, read after `show()` are the laid-out values there. Don't print them after the window shows.
- `setFont(null)`: real JavaFX fails when it lays the control out.
- Controls and scenes made before `launch` (in a static field or in `main`): real JavaFX makes them only after its toolkit has started, and whether it has then depends on how the program is started. From the module path with an `Application` main class, it starts before `main`; with JavaFX on the class path (as the check runs programs), or a main class that isn't the `Application`, it starts in `launch`, and `new Label(...)` before it fails. Make them in `start`.

See `scripts/fx-check/README.md` for what the check proves and what it doesn't.

## Drills (Deathmatch, daily challenge, interview prep)

`drills/<module id>.yaml` holds the practice drills of a lesson module; `drills/interview-*.yaml` (with `topic: interview`) the interview questions, which are open to everyone. Each drill has a `type`, and most show a little Java: `pre` for methods, `body` for statements run in `main` (in `start` when they use JavaFX; imports such as `java.util.Scanner` are added when used). The build puts them in a complete program and checks it on the reference JDK. Predict and compiles answers are taken from the JDK, not typed by hand; a bug's fix must run and change what the program does; a choice's `answer` is written by hand, so `verify: output` should be used whenever the right choice is what the code prints. Prompts, choices and explanations are Markdown: code, and anything with `<`, goes in backticks (the build rejects text that Markdown would read as HTML):

```yaml
topic: loops                  # the module id (the file is loops.yaml)
drills:
  - type: predict             # "What does this print?": the answer is the program's real output (1 to 4 lines)
    after: counting           # the step (slug or id) that unlocks it; default: the module's last step
    body: |
      int count = 0;
      count++;
      System.out.println(count);
    why: "`count++` adds one."  # Markdown, shown after a miss (required, except compiles)
  - type: fill                # one [[blank]] (alternatives separated by ‖); the output of the filled-in program is shown
    body: |
      for (int i = 0; i < [[3]]; i++) {
          System.out.println("Hi");
      }
    why: ...
  - type: bug                 # one line ends with // BUG; `fix` is the whole corrected line
    body: |
      int total = 0;
      total = 5; // BUG
      System.out.println(total + 1);
    fix: total += 5;          # the fixed program must run, and behave differently from the buggy one (or the buggy one doesn't compile)
    why: ...
  - type: compiles            # "Will it compile?": the answer is javac's verdict; why explains it
    body: |
      int x = "5";
    why: ...
  - type: choice              # 2 to 4 choices, answer = the number of the right one; code shown must compile
    prompt: Which loop runs exactly 3 times?
    choices: ["...", "...", "..."]
    answer: 2
    compiles: false           # optional: the code shown doesn't compile (on purpose)
    verify: output            # optional: the right choice must be exactly what the code prints
    why: ...
  - type: boss                # a coding challenge: prompt (the task) plus seed, solution, hints, tests, require,
    prompt: ...               # forbid, as in a lesson challenge; `call:` tests work too
    seed: ...
    solution: ...
    hints: [...]
```

A drill can have classes of its own in `classes` (for example `class Counter { ... }`, not public: they're put after Main in the same file); the drill shows them first, then `pre`, then the statements of `body`. Predict and fill drills may give the program input with `stdin`. `placement.yaml` holds the placement quiz: `questions:`, each a drill with a `module:`, one per module in course order.

To check one drill file while writing it, without changing any generated file: `node scripts/build-content.mjs --dry --drill-file loops.yaml`. To check one module and its drills: `node scripts/build-content.mjs --dry --module-file 13-lists.yaml`.
