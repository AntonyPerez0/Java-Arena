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
- every image a test or a lesson gives a program (`{ asset: landscape.png }` in a test's `files`, an ` ```asset ` block in lesson text) is one of `content/assets`, a PNG that Java Arena's JavaFX and real JavaFX read the same way (see "Images (assets)");
- starter code must not already pass, and a fill-in with every blank empty must not pass;
- every solution follows its own `require` and `forbid` rules;
- every example program in the lesson text is compiled and run, and an `output` block after it must be exactly what it prints;
- every step has exactly three challenges, a `**Your turn:**` task and at least one hint per challenge;
- the expected output a task shows (its last plain ``` block) is exactly what the test the task card shows prints: the first visible test with `events`, or else the first visible test with `writes`, or else the first visible test;
- a test with `events` (a window) replays them on the solution, every event must reach its target, and the window it leaves is what the learner's is compared with; every ` ```java window ` example shows a window (see "Windows (JavaFX)");
- every ` ```classes ` block in lesson text is a class diagram the build can read, which it draws (see "Class diagrams");
- every code block in a step's text or a task is of a kind the page knows (see "Code blocks"); ` ```xml `, ` ```shell ` and ` ```text ` blocks are shown, never run;
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

A test can also give the program one of the site's images (`content/assets`), with `{ asset: ... }` in place of the text: `files: { landscape.png: { asset: landscape.png } }`, or under another name or in a folder (`pictures/day.png: { asset: landscape.png }`). In lesson text, an empty ` ```asset landscape.png ` block draws the image and puts it in the folder of the next example. See "Images (assets)" under "Windows (JavaFX)".

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

"Run with my input" (and the Playground's Run) shows, under the output, every file the program created or changed in its folder, each under its name ("The file summary.txt after the run"); a file of more than 15 lines or 1500 characters starts folded. The files a challenge gives the program are shown only if the program changed them. A file that isn't text (its bytes aren't UTF-8, such as a PNG) is never shown as text, anywhere: the page says how many bytes it has (and, for a PNG, its size in pixels). `writes` checks text files only: the build stops on a `writes` file that the solution leaves as bytes that aren't text, and a learner's file that isn't text never matches. The output shows what the program printed and its error messages (System.err, a crash) in the order it wrote them, as a terminal does; grading compares what it printed to System.out only.

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

### Code blocks: what each kind is, and code to read in other languages

Every code block in a step's text or a task has a kind, its fence's first word, and the build stops on a kind it doesn't know (such as `bash`, `sh`, `sql` or `XML`): no kind (plain text: the expected output a task shows is its last one), `java run`, `java run crash`, `java main`, `java error`, `java test`, `java window`, `java fragment`, `input`, `output`, `javac`, `crash`, `events`, `classes`, `file data.txt`, `asset landscape.png`, and three kinds that are **shown only, never run**:

- ` ```xml `: code in XML to read, such as a Maven `pom.xml`, with the site's code colors (tag names, attribute names and values, comments, the `<?xml ...?>` line). ` ```xml pom.xml ` shows the file's name above it, as a program's files are shown (the name must end in `.xml`). Java Arena runs no Maven: say so in the text.
- ` ```shell `: commands to type in a terminal on your own computer (`mvn compile`), under "Commands for your own computer", in the colors of the output blocks. Nothing on the page runs them.
- ` ```text `: anything else shown as it is, in the plain style (a window's outline, a line of a file). Unlike a plain block, it's never taken for a task's expected output.

A ` ```java fragment ` is Java to read that can't run on its own (part of a class, a JDBC method that needs a database): use it for Java that only runs on your own computer, and say so. The editor's highlighter knows only Java, so an XML block is colored by a small highlighter of the page's own (`src/components/code-blocks.ts`), and shell and text blocks aren't colored.

## Windows (JavaFX)

Real JavaFX doesn't run on Java Arena's engine (Ristretto, a JVM in WebAssembly), nor on the other browser Java engines that the site's research looked at (`docs/research/`: CheerpJ lists JavaFX as future work, and TeaVM's class library has no JavaFX), so Java Arena has its own practice version of the part of JavaFX the lessons use: the same package, class and method names, written for this site (`engine/libraries/javafx/`; it isn't OpenJFX's code). Learners write ordinary JavaFX code. A program **uses it** when any of its files mentions `javafx.` (an import or a full class name); the build, the grader, the Playground and free runs then put it on the class path, as they do JUnit.

**How a program runs.** It runs to the end like any other program. `Application.launch` makes the program's `Application` object (on the JavaFX Application Thread), calls `init()` (on a thread named JavaFX-Launcher), then `start(stage)` on the thread named `JavaFX Application Thread`. Then it **replays the clicks and typing** of the run (the test's `events`, or what the learner clicked on the page) one at a time, each after the previous one's handlers and the `Platform.runLater` tasks they queued. Then it writes the showing windows as JSON (`.arena/window.json`), runs the tasks still queued, calls `stop()`, and `launch` returns. The page draws the window from that JSON; each click on the page reruns the whole program from the start with one more event. The session ends early when `Platform.exit()` is called or the last window closes (the rest of the events are skipped). An exception that escapes a handler prints `Exception in thread "JavaFX Application Thread" ...` on System.err and the session goes on, as in JavaFX; one from the constructor, `init`, `start` or `stop` is printed as JavaFX prints it and thrown from `launch`. A run with JavaFX gets 15 seconds in the browser. Everything in the program's `.arena/` folder is Java Arena's own: it's never listed as a file the program wrote, and a test can't give or check a file there.

Model solutions and examples with windows must be **deterministic**: the same window and output on every run. No unseeded `Random` (use `new Random(42)`), no `Collections.shuffle(list)` without a Random (use `Collections.shuffle(list, new Random(42))`), no `Math.random()`, `UUID.randomUUID()` or `SecureRandom`, no clock (`System.currentTimeMillis()`, `nanoTime()`, `LocalDate.now()`, `Calendar.getInstance()` and the like), no `System.identityHashCode`, no `Set.of` or `Map.of` (their order changes from run to run, even on the JDK), and no use of the `now` that an `AnimationTimer`'s `handle(long now)` gets (a made-up clock here, the computer's clock in real JavaFX: count frames in a field instead). The build rejects these in a solution with `events` tests and in a ` ```java window ` example; a learner's program that uses them may simply not match. A program with a window must not read an image from the internet either (`new Image("https://...")`, which the build rejects): give it an image of `content/assets` (see "Images (assets)"). Don't print a node itself (`System.out.println(label)` prints `Label@` and its identity hash, which changes from run to run), nor a `MouseEvent`, an `Image`, a `GraphicsContext` or a `PixelReader` (their text has an identity hash too), nor keep nodes, series or data points in a `HashSet` or as `HashMap` keys and go through them: the order follows the identity hashes, and in the browser's Java engine it can change between two runs of the same clicks. The JDK-versus-browser check (almost always) finds such a program, since the hashes differ there. The window panel names a button by its text when no other button has it (and a node by its id when no other node has it), so a learner's click still reaches it when the order changes.

### The classes and methods

Exactly these, with JavaFX 21's behavior. Anything else from `javafx` (`CheckBox`, `Alert`, `ListView`, effects such as `DropShadow`, `Timeline` and the other animation classes, `Shape.union` and `Shape.subtract`, `Point3D`, `setOnMouseMoved`, sound in `javafx.scene.media`, and in part 14's classes `GraphicsContext.drawImage`, an `ImageView`'s size and transforms such as `setFitWidth` or `setRotate`, `Color.hsb`, `Color.gray`, `PieChart`, `AreaChart`, `SwingFXUtils`...) doesn't exist here: javac says "cannot find symbol" or "package does not exist", so a lesson or task must not use it. Part 14's classes (colors, the canvas, the mouse, images, charts, the slider, and for 14.3 shapes, transforms, `Point2D`, the game loop and the keyboard) are at the end of the list.

- `javafx.application.Application` (abstract): `Application()`; `static void launch(Class<? extends Application> appClass, String... args)`; `static void launch(String... args)` (the class that calls it must extend Application); `void init() throws Exception` and `void stop() throws Exception` (both empty); `abstract void start(Stage primaryStage) throws Exception`; `final Application.Parameters getParameters()`. `launch` can be called once.
- `Application.Parameters`: `List<String> getRaw()` (every argument), `Map<String, String> getNamed()` (each `--key=value` argument whose key starts with a letter or `_`; the last value of a key wins), `List<String> getUnnamed()` (the others, in order). As in JavaFX, a `null` argument given to `launch` is left out of all three.
- `javafx.application.Platform`: `static void runLater(Runnable)` (runs after the current event, in order; don't print from a task queued after `Platform.exit()`, which races with `stop()` in real JavaFX, nor from a task queued by a task that `stop()` queued, which races with the toolkit's exit there; in `init`, print nothing after queuing a task and don't wait for it, since real JavaFX runs it at once on the JavaFX Application Thread while `init` goes on, and Java Arena's JavaFX only after `init` returns), `static void exit()` (ends the session: the windows close, the rest of the events are skipped, `stop()` runs once), `static boolean isFxApplicationThread()`.
- `javafx.stage.Window`: `getWidth()`, `setWidth(double)`, `getHeight()`, `setHeight(double)`, `getScene()`, `isShowing()`, `hide()`.
- `javafx.stage.Stage extends Window`: `Stage()`, `setTitle(String)`, `getTitle()` (default `null`), `setScene(Scene)`, `show()`, `close()`, `setResizable(boolean)`, `isResizable()`. Sizes and resizable are only recorded: there is no layout, so a size never set stays `NaN`. Closing the last showing window ends the session. Windows are made, shown and closed only on the JavaFX Application Thread.
- `javafx.scene.Scene`: `Scene(Parent root)`, `Scene(Parent root, double width, double height)`, `getRoot()`, `setRoot(Parent)`, `getWidth()`, `getHeight()` (the size given, else 0; a scene made without a size whose root pane has a preferred width and height takes them when its window shows, as in JavaFX), `setOnKeyPressed`, `setOnKeyReleased`, `setOnKeyTyped` (each an `EventHandler<? super KeyEvent>`) and their getters.
- `javafx.scene.Node` (abstract): `setId(String)`, `getId()`, `setDisable(boolean)`, `isDisable()` (its own flag), `isDisabled()` (it or a pane it is in), `setVisible(boolean)`, `isVisible()`, `getParent()`, `getScene()`, `setStyle(String)`, `getStyle()` (stored, not applied, default `""`; real JavaFX applies it, so use styles only for colors and borders, see "What the outline compares"), `lookup(String)` (only `#id`), `toString()`; for part 14.3 `setTranslateX`, `setTranslateY`, `setLayoutX`, `setLayoutY`, `setRotate` (degrees, clockwise on the screen, about the center of the node's own bounds) and their getters, `getBoundsInLocal()` and `getBoundsInParent()` (JavaFX's own for shapes; an estimate for a `Text`, and for panes and controls, which aren't laid out: see `engine/libraries/README.md`), `setOnKeyPressed`, `setOnKeyReleased`, `setOnKeyTyped` (stored, never run: key events go to the scene) and `requestFocus()` (gives no node the focus here: see the key events below).
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
- `javafx.scene.text.Font`: `Font(double size)`, `Font(String name, double size)`, `static Font font(double size)`, `static Font font(String family, double size)`, `static Font getDefault()` (System, 13.0), `getName()`, `getFamily()`, `getStyle()` (`"Regular"`, `"Bold"`, `"Italic"` or `"Bold Italic"`), `getSize()`, `equals`, `hashCode`, `toString()` as JavaFX prints it. **Use only JavaFX's own families, which every computer has: `System`, `Serif`, `SansSerif` and `Monospaced`** (any case; `Dialog` and `sans-serif` are SansSerif, `DialogInput` and `monospace` are Monospaced). They follow JavaFX's rules exactly: `Font.font("Serif", 20)` is named `Serif Regular`; `new Font(name, size)` takes a full name such as `"Serif Bold"` (the family, then `Regular`, `Bold`, `Italic` or `Bold Italic`), so `new Font("Serif", 20)` is the System font, as in JavaFX. Another family (`Arial`, `Verdana`...) is kept as asked here, but real JavaFX shows it only on a computer that has it and the System font elsewhere, so the check against real JavaFX fails on it.
- `javafx.geometry.Insets`: `Insets(double)`, `Insets(double top, double right, double bottom, double left)`, `Insets.EMPTY`, `getTop()`, `getRight()`, `getBottom()`, `getLeft()`, `equals`, `hashCode`, `toString()` (`Insets [top=10.0, right=10.0, bottom=10.0, left=10.0]`).
- `javafx.geometry.Pos`: `TOP_LEFT`, `TOP_CENTER`, `TOP_RIGHT`, `CENTER_LEFT`, `CENTER`, `CENTER_RIGHT`, `BOTTOM_LEFT`, `BOTTOM_CENTER`, `BOTTOM_RIGHT`, `BASELINE_LEFT`, `BASELINE_CENTER`, `BASELINE_RIGHT` (an enum: `values()`, `valueOf`, `name()`).
- `javafx.event.Event extends java.util.EventObject`: `getSource()` (the button or text field). `javafx.event.ActionEvent extends Event`: `ActionEvent()`. `javafx.event.EventHandler<T extends Event>`: `void handle(T event)`, usually written as a lambda (`button.setOnAction(e -> ...)`).
- `javafx.beans.value.ObservableValue<T>`: `addListener(ChangeListener<? super T>)`, `removeListener(ChangeListener<? super T>)`, `getValue()`. `javafx.beans.value.ChangeListener<T>`: `void changed(ObservableValue<? extends T> observable, T oldValue, T newValue)`. Listeners hear only real changes, in the order they were added. As in JavaFX, a listener that changes the value again while the listeners hear of a change tells them all about the new change at once, and the listeners after it then hear the earlier change with the newest value: their old and new values can be equal.
- `javafx.beans.property.StringProperty` (abstract, an `ObservableValue<String>`): `get()`, `set(String)`, `getValue()`, `setValue(String)`, `addListener`, `removeListener`. `javafx.beans.property.SimpleStringProperty`: `SimpleStringProperty()`, `SimpleStringProperty(String)`.
- `javafx.collections.ObservableList<E> extends java.util.List<E>`: everything a List has, plus `addAll(E...)`, `setAll(E...)`, `setAll(Collection<? extends E>)`, `removeAll(E...)`, `remove(int from, int to)`.

Part 14 (written to follow JavaFX 21 and checked against real OpenJFX 21.0.12 on every run of `npm run fx-check`, by its probes 23 to 28 and every lesson program, see below; also by `scripts/javafx.test.mjs` on the reference JDK and fidelity programs 49 and 50 in the browser engine; `engine/libraries/README.md` has the details):

- `javafx.collections.FXCollections`: `static <E> ObservableList<E> observableArrayList()`, `observableArrayList(E...)`, `observableArrayList(Collection<? extends E>)` (lists with JavaFX's index messages).
- `javafx.scene.paint.Paint` (abstract) and `javafx.scene.paint.Color extends Paint` (final): `Color(double red, double green, double blue, double opacity)`; `static Color rgb(int red, int green, int blue)`, `rgb(int, int, int, double opacity)`, `color(double red, double green, double blue)`, `color(double, double, double, double opacity)`, `web(String)` (`#rgb`, `#rrggbb`, `#rrggbbaa`, `0x...`, names in any case, and `rgb(...)`, `rgba(...)`, `hsl(...)`, `hsla(...)` as JavaFX reads them); `getRed()`, `getGreen()`, `getBlue()`, `getOpacity()` (0.0 to 1.0); `brighter()`, `darker()`, `grayscale()`, `invert()`; `equals`, `hashCode`, `toString()` (`0xff0000ff`); and all 148 named colors (`Color.RED`, `Color.DARKGREEN`, `Color.TRANSPARENT`...). Values, formulas, exceptions and messages are JavaFX's exactly.
- `javafx.scene.canvas.Canvas extends Node`: `Canvas()`, `Canvas(double width, double height)`, `getWidth()`, `setWidth(double)`, `getHeight()`, `setHeight(double)`, `getGraphicsContext2D()` (always the same object). `javafx.scene.canvas.GraphicsContext` (final): `getCanvas()`, `setFill(Paint)`, `getFill()` (black), `setStroke(Paint)`, `getStroke()` (black), `setLineWidth(double)`, `getLineWidth()` (1.0), `setFont(Font)`, `getFont()` (System 13), `fillRect`, `strokeRect`, `clearRect`, `fillOval`, `strokeOval` (each `double x, double y, double w, double h`), `strokeLine(double x1, double y1, double x2, double y2)`, `fillText(String text, double x, double y)`, `strokeText(String, double, double)`, `fillPolygon(double[] xPoints, double[] yPoints, int nPoints)`, `strokePolygon(double[], double[], int)`. A setter given `null`, or a line width that isn't above 0, is ignored, as in JavaFX. Nothing is rasterized: each call is recorded with the colors, line width and font it used, the page draws them, and the outline lists them.
- The mouse, on `javafx.scene.Node`: `setOnMousePressed`, `setOnMouseDragged`, `setOnMouseReleased`, `setOnMouseClicked` (each takes an `EventHandler<? super MouseEvent>`, usually a lambda) and `getOnMousePressed()`, `getOnMouseDragged()`, `getOnMouseReleased()`, `getOnMouseClicked()`. `javafx.scene.input.InputEvent extends Event` and `javafx.scene.input.MouseEvent extends InputEvent`: `getX()`, `getY()` (in the node's own coordinates: on an image view, the image's pixels), `getSceneX()`, `getSceneY()` (here the same numbers as `getX()` and `getY()`, since nothing is laid out: lessons use `getX()` and `getY()`), `getEventType()` (one of `MouseEvent.MOUSE_PRESSED`, `MOUSE_DRAGGED`, `MOUSE_RELEASED`, `MOUSE_CLICKED`), `getSource()` (the node), `toString()` (don't print it: see above). `javafx.event.EventType<T extends Event>` (final): `getName()` (`"MOUSE_PRESSED"`), `toString()`. Only a canvas or an image view gets mouse events here (see the event lines), and events don't bubble up to the panes around the node. A mouse handler on any other node (a button, a label, a pane) compiles but never runs here, where real JavaFX would run it on a click: a click on a button runs its `setOnAction`, and the window panel and the results say so under the window. Lessons use `setOnAction` for buttons and the mouse only on a canvas or an image view.
- `javafx.scene.image.Image`: `Image(String url)`, `Image(InputStream is)`, `getWidth()`, `getHeight()`, `isError()`, `getException()`, `getPixelReader()` (null for an error image). `new Image("file:landscape.png")` reads `landscape.png` in the program's folder (a folder too: `"file:pictures/day.png"`). A name without `file:` is a class path resource in JavaFX, which a program never has here, so it throws JavaFX's `IllegalArgumentException` ("Invalid URL: Invalid URL or resource not found"): always write `file:`. A missing or unreadable file gives an error image (size 0, `isError()` true, the reason in `getException()`), never an exception from the constructor. PNG files only: another kind of image (JPEG, GIF, BMP) is an error image whose message says Java Arena reads only PNG images (real JavaFX reads them), so lessons use the PNGs of `content/assets`.
- `javafx.scene.image.WritableImage extends Image`: `WritableImage(int width, int height)` (every pixel transparent, `0x00000000`), `WritableImage(PixelReader reader, int width, int height)` (a copy of the top left corner), `getPixelWriter()`. `javafx.scene.image.PixelReader` (an interface): `int getArgb(int x, int y)` (`0xAARRGGBB`), `Color getColor(int x, int y)`. `javafx.scene.image.PixelWriter`: `setArgb(int x, int y, int argb)`, `setColor(int x, int y, Color c)`. x goes across from 0, y down from 0, and coordinates outside the image throw JavaFX's exceptions. As in JavaFX, a pixel that isn't opaque reads back with its colors rounded by premultiplied alpha, and a fully transparent one as `0x00000000`.
- `javafx.scene.image.ImageView extends Node`: `ImageView()`, `ImageView(Image image)`, `ImageView(String url)` (the same as `new ImageView(new Image(url))`), `setImage(Image)`, `getImage()`.
- Charts, in `javafx.scene.chart`: `Chart extends Region` (abstract): `setTitle(String)`, `getTitle()` (null), `setLegendVisible(boolean)`, `isLegendVisible()` (true), `setAnimated(boolean)`, `getAnimated()` (recorded only). `XYChart<X, Y> extends Chart` (abstract): `getData()` (an `ObservableList<XYChart.Series<X, Y>>`), `setData(ObservableList<XYChart.Series<X, Y>>)`, `getXAxis()`, `getYAxis()`. `XYChart.Series<X, Y>` (final): `Series()`, `Series(ObservableList<XYChart.Data<X, Y>> data)`, `Series(String name, ObservableList<XYChart.Data<X, Y>> data)`, `setName(String)`, `getName()`, `getData()`, `setData(ObservableList<XYChart.Data<X, Y>>)`, `toString()`. `XYChart.Data<X, Y>` (final): `Data()`, `Data(X xValue, Y yValue)`, `getXValue()`, `setXValue(X)`, `getYValue()`, `setYValue(Y)`, `toString()` (`Data[1,2,null]`). `LineChart<X, Y>`: `LineChart(Axis<X> xAxis, Axis<Y> yAxis)`, `setCreateSymbols(boolean)`, `getCreateSymbols()` (true). `BarChart<X, Y>`: `BarChart(Axis<X>, Axis<Y>)` (one axis a `CategoryAxis`, the other a `NumberAxis`, as JavaFX requires). `ScatterChart<X, Y>`: `ScatterChart(Axis<X>, Axis<Y>)`. `Axis<T> extends Region` (abstract): `setLabel(String)`, `getLabel()`, `setAutoRanging(boolean)`, `isAutoRanging()`. `ValueAxis<T extends Number> extends Axis<T>` (abstract): `setLowerBound(double)`, `getLowerBound()`, `setUpperBound(double)`, `getUpperBound()`, `setMinorTickVisible(boolean)`, `isMinorTickVisible()`. `NumberAxis extends ValueAxis<Number>` (final): `NumberAxis()` (auto-ranging), `NumberAxis(double lowerBound, double upperBound, double tickUnit)` and `NumberAxis(String label, double lowerBound, double upperBound, double tickUnit)` (not auto-ranging), `setTickUnit(double)`, `getTickUnit()`, `setForceZeroInRange(boolean)`, `isForceZeroInRange()`. `CategoryAxis extends Axis<String>` (final): `CategoryAxis()`, `CategoryAxis(ObservableList<String> categories)`, `getCategories()`. JavaFX's checks apply where a program can see them: a series added to a chart that has it already is in the list twice, and JavaFX's `IllegalArgumentException` ("Duplicate series added") is printed while the program goes on, a `null` value makes `show()` throw (or, after the window shows, prints the exception once and the chart isn't laid out again), and an auto-ranging `CategoryAxis` takes the categories of the data when its window shows, as JavaFX's layout does. An auto-ranging axis keeps its bounds as set: the page picks bounds to draw it, and the outline doesn't show them. What a program reads back from an auto-ranging axis can't always match JavaFX, so a lesson's program must not print it except as said here: read `getCategories()` only right after `show()`, and only when the data didn't change after its series went into the chart (real JavaFX fills a bar chart's categories as the data is added, also before `show()`, where Java Arena's are empty until the window shows; after a change, real JavaFX keeps the category of a removed point and the earlier order, and fills a line chart's only in a later layout pulse, so its results depend on timing, while Java Arena takes the data's categories again after each event, in the order they first appear); never print an auto-ranging `NumberAxis`'s bounds after the window shows (real JavaFX lays them out, such as `0.0` to `5.5`, where Java Arena's keep `0.0` to `100.0`); and don't add data to a series that is already in a `BarChart` before the window shows (with two series there, real JavaFX reports an `IndexOutOfBoundsException` from its `BarChart.dataItemAdded` to the uncaught exception handler, and Java Arena prints nothing).
- `javafx.scene.control.Slider extends Control`: `Slider()` (0 to 100, value 0), `Slider(double min, double max, double value)`, `getMin()`, `setMin(double)`, `getMax()`, `setMax(double)`, `getValue()`, `setValue(double)` (kept between min and max, as JavaFX does), `valueProperty()` (a `DoubleProperty`: its listeners get `Number`s, so `newValue.intValue()` or `newValue.doubleValue()`), `setShowTickLabels(boolean)`, `isShowTickLabels()`, `setShowTickMarks(boolean)`, `isShowTickMarks()`, `setMajorTickUnit(double)`, `getMajorTickUnit()` (25), `setMinorTickCount(int)`, `getMinorTickCount()` (3), `setBlockIncrement(double)`, `getBlockIncrement()` (10), `setSnapToTicks(boolean)`, `isSnapToTicks()`.
- `javafx.beans.property.DoubleProperty` (abstract, an `ObservableValue<Number>`): `get()`, `set(double)`, `getValue()` (a `Double`), `setValue(Number)`, `addListener`, `removeListener`. `javafx.beans.property.SimpleDoubleProperty extends DoubleProperty`: `SimpleDoubleProperty()`, `SimpleDoubleProperty(double initialValue)`, `toString()`. Listeners as `StringProperty`'s (above).
- Part 14.3, a game (written to follow JavaFX 21; the shapes' geometry, `Point2D`, the bounds, `intersect`, `KeyCode` and the order of key events and timers were compared with real OpenJFX 21.0.12, see `engine/libraries/README.md`; `npm run fx-check` checks them again on every run, with its probes 29 to 34). Exactly these:
  - On `javafx.scene.Node` (all nodes): `setTranslateX(double)`, `getTranslateX()`, `setTranslateY(double)`, `getTranslateY()`, `setLayoutX(double)`, `getLayoutX()`, `setLayoutY(double)`, `getLayoutY()`, `setRotate(double)`, `getRotate()` (degrees, clockwise on the screen, about the center of the node's own bounds; all default 0), `getBoundsInLocal()` and `getBoundsInParent()` (JavaFX's own for shapes; an estimate for a `Text`, and for panes and controls, which aren't laid out here), `setOnKeyPressed`, `setOnKeyReleased`, `setOnKeyTyped` (each an `EventHandler<? super KeyEvent>`; stored, never run, since key events go to the scene) and their getters, and `requestFocus()` (gives no node the focus here: see the key events below).
  - On `javafx.scene.Scene`: `setOnKeyPressed`, `setOnKeyReleased`, `setOnKeyTyped` and their getters (see the scene above): this is where a game's key handlers go.
  - `javafx.scene.shape.Shape extends Node` (abstract): `setFill(Paint)`, `getFill()` (black), `setStroke(Paint)`, `getStroke()` (null), `setStrokeWidth(double)`, `getStrokeWidth()` (1.0), and `static Shape intersect(Shape shape1, Shape shape2)`: the area the two shapes share, as a new `Path` whose `getBoundsInLocal().getWidth()` is -1 when they don't overlap (shapes that only touch don't). Whether two shapes overlap matches JavaFX for polygons, rectangles, circles and lines, turned and moved, fill and stroke both counting as in JavaFX; the box of the shared area matches it for polygons and rectangles, and is close for circles and strokes (so a lesson never prints it). Put the shapes in the same pane. No `union` or `subtract`.
  - `Polygon extends Shape`: `Polygon()`, `Polygon(double... points)` (x and y one after the other), `getPoints()` (an `ObservableList<Double>`; changing it changes the polygon), `toString()`.
  - `Circle extends Shape`: `Circle()`, `Circle(double radius)`, `Circle(double radius, Paint fill)`, `Circle(double centerX, double centerY, double radius)`, `Circle(double centerX, double centerY, double radius, Paint fill)`, `setCenterX`, `getCenterX`, `setCenterY`, `getCenterY`, `setRadius`, `getRadius`, `toString()`.
  - `Rectangle extends Shape`: `Rectangle()`, `Rectangle(double width, double height)`, `Rectangle(double width, double height, Paint fill)`, `Rectangle(double x, double y, double width, double height)`, `setX`, `getX`, `setY`, `getY`, `setWidth`, `getWidth`, `setHeight`, `getHeight`, `toString()`.
  - `Line extends Shape`: `Line()`, `Line(double startX, double startY, double endX, double endY)`, `setStartX`, `getStartX`, `setStartY`, `getStartY`, `setEndX`, `getEndX`, `setEndY`, `getEndY`, `toString()`. As in JavaFX a line has no fill and a black stroke.
  - `Path extends Shape`: `Path()` (empty). It is what `intersect` returns; here it knows only the box around its area (`getBoundsInLocal()`), not its elements (no `getElements()`).
  - `javafx.scene.text.Text extends Shape`: `Text()`, `Text(String text)`, `Text(double x, double y, String text)` (x and y are where its baseline starts), `setText`, `getText`, `setX`, `getX`, `setY`, `getY`, `setFont(Font)`, `getFont()` (System 13), `toString()`. Its fill is black.
  - `javafx.geometry.Point2D`: `Point2D(double x, double y)`, `ZERO`, `getX()`, `getY()`, `add(Point2D)`, `add(double x, double y)`, `subtract(Point2D)`, `subtract(double x, double y)`, `multiply(double factor)`, `normalize()`, `magnitude()`, `distance(Point2D)`, `distance(double x, double y)`, `angle(Point2D)`, `angle(double x, double y)`, `angle(Point2D p1, Point2D p2)`, `dotProduct(Point2D)`, `dotProduct(double x, double y)`, `midpoint(Point2D)`, `midpoint(double x, double y)`, `equals`, `hashCode`, `toString()` (`Point2D [x = 1.0, y = 2.0]`), with JavaFX's formulas. No `crossProduct` (it returns a `Point3D` in JavaFX).
  - `javafx.geometry.Bounds` (abstract) and `javafx.geometry.BoundingBox extends Bounds`: `BoundingBox(double minX, double minY, double width, double height)`, `BoundingBox(double minX, double minY, double minZ, double width, double height, double depth)`, `getMinX()`, `getMinY()`, `getMinZ()`, `getMaxX()`, `getMaxY()`, `getMaxZ()`, `getWidth()`, `getHeight()`, `getDepth()`, `getCenterX()`, `getCenterY()`, `getCenterZ()`, `isEmpty()` (a width or height below 0: an empty `intersect` gives -1 for both), `contains(double x, double y)`, `contains(Point2D)`, `contains(Bounds)`, `contains(double x, double y, double w, double h)`, `intersects(Bounds)`, `intersects(double x, double y, double w, double h)`, `equals`, `hashCode`, `toString()` (`BoundingBox [minX:0.0, minY:0.0, minZ:0.0, width:10.0, height:5.0, depth:0.0, maxX:10.0, maxY:5.0, maxZ:0.0]`).
  - `javafx.animation.AnimationTimer` (abstract): `AnimationTimer()`, `start()` (a timer already started keeps its place), `stop()`, `abstract void handle(long now)`. The started timers run once per frame, in the order they were started, only while a `frames` line runs (see the event lines). `now` is a made-up clock here, frame k of the run (from 1) getting 1,000,000,000 + k × 16,666,667 nanoseconds, and the computer's clock in real JavaFX: a lesson never prints it or uses it, and the build rejects a solution or example whose `handle` reads it (count frames in a field instead).
  - `javafx.scene.input.KeyEvent extends InputEvent` (final): `KEY_PRESSED`, `KEY_RELEASED`, `KEY_TYPED`, `ANY`, `CHAR_UNDEFINED`, `KeyEvent(EventType<KeyEvent> eventType, String character, String text, KeyCode code, boolean shiftDown, boolean controlDown, boolean altDown, boolean metaDown)`, `getEventType()`, `getCode()` (`KeyCode.UNDEFINED` in a KEY_TYPED event, as in JavaFX), `getText()` (the key's text in a pressed or released event, such as `"a"`), `getCharacter()` (the character, in a KEY_TYPED event), `isShiftDown()`, `isControlDown()`, `isAltDown()`, `isMetaDown()`, `isShortcutDown()` (always false for the event lines), `getSource()`, `toString()` (don't print it: it holds the scene's identity hash).
  - `javafx.scene.input.KeyCode` (an enum): every one of JavaFX 21's 224 constants with JavaFX's names (`LEFT`, `RIGHT`, `UP`, `DOWN`, `SPACE`, `ENTER`, `A` to `Z`, `DIGIT0` to `DIGIT9`...), `values()`, `valueOf(String)`, `name()`, `getName()` (`"Left"`, `"Space"`, `"1"`), `getCode()`, `getChar()`, `isFunctionKey()`, `isNavigationKey()`, `isArrowKey()`, `isModifierKey()`, `isLetterKey()`, `isDigitKey()`, `isKeypadKey()`, `isWhitespaceKey()`, `isMediaKey()`, `static KeyCode getKeyCode(String name)` (by `getName()`, null when none has it).
  - A game keeps the held keys in a `Map<KeyCode, Boolean>` and reads it with `getOrDefault`, as the MOOC's does; it must not go through that map (a `HashMap`'s order of enum keys follows their identity hashes, which change from run to run; an `EnumMap` or a `TreeMap` has a fixed order).
  - Lessons give every `Random` of a game a seed (`new Random(42)`), so the game is the same on every run (the page runs the program again for every new event) and on real JavaFX; the build rejects an unseeded one. No `Timeline`, `TranslateTransition` or other animation classes, nor `Point3D`: they are part of real JavaFX, not of the practice version.
- Sound (`javafx.scene.media`: `Media`, `MediaPlayer`, `AudioClip`) doesn't exist here, and no browser engine of Java Arena's could play it: a lesson shows sound code as a ` ```java fragment ` only, and says the MOOC's sound exercise needs the learner's own computer.

### Clicks and typing (event lines)

A test's `events`, a ` ```events ` block and the page all use the same lines, one event per line (blank lines and lines starting with `//` are skipped):

| Line | What happens |
|---|---|
| `click Button "Add"` | clicks the button (`fire()`: a disabled button does nothing) |
| `type TextField 1 "Ada"` | types the text at the end of the field, one character at a time (each is one `appendText`, so a text listener hears every character) |
| `set TextArea 1 "two\nlines"` | replaces the whole text at once (one `setText`), as pasting over it would |
| `enter TextField 1` | presses Enter in the text field (its `setOnAction` handler, if any, unless it's disabled) |
| `close` | closes the main window, as its close button would (the session ends when no window is left) |
| `set Slider 1 25` | moves the slider to 25 as letting its thumb go there would: one `setValue`, after moving the value to the nearest tick when the slider snaps to ticks (a tick every major tick unit divided by the minor tick count plus 1, counted from its min, so 6.25 apart by default; halfway goes up). A value outside its min and max is a problem |
| `press Canvas 1 at 10 20` | presses the mouse at (10, 20) in the node's own coordinates (`MOUSE_PRESSED`) |
| `drag Canvas 1 to 30 40` | moves the pressed mouse to (30, 40) (`MOUSE_DRAGGED`; nothing when it's already there) |
| `release Canvas 1 at 30 40` | releases it there: a `MOUSE_DRAGGED` first when the mouse isn't already at that point, then `MOUSE_RELEASED`, then `MOUSE_CLICKED` when the point is on the node (also after a drag: JavaFX's click needs only the press and the release on the same node) |
| `click Canvas 1 at 10 20` | a whole click at one point: the press, the `Platform.runLater` tasks it queued, then the release (pressed, released, clicked) |
| `press key LEFT` | presses the key and holds it (`KEY_PRESSED` to the scene's `setOnKeyPressed`; for a key that makes a character, such as a letter, a digit or Space, its `KEY_TYPED` right after). A key held already is a problem |
| `release key LEFT` | lets go of a held key (`KEY_RELEASED`). A key that isn't held is a problem |
| `key SPACE` | a whole key stroke: the press (and typed), the `Platform.runLater` tasks it queued, then the release |
| `frames 30` | runs 30 frames of the game loop (1 to 3600 in a line): in each, every started `AnimationTimer`'s `handle`, in the order they were started. The page shows the frames as an animation |

Keys are named as `KeyCode` names them (`LEFT`, `RIGHT`, `UP`, `DOWN`, `SPACE`, `ENTER`, `A`, `DIGIT1`); a wrong name is a problem that names the closest real one. Key events go to the scene of the window shown last; no node has the focus here, so a node's own `setOnKeyPressed` never runs (put key handlers on the scene, as the MOOC does). When a program calls `requestFocus()` on a node that (or a pane around which) has its own key handler, real JavaFX would run that handler first: the key line then gets a problem saying so (once per kind of key event), and the page's key row says so under a window whose only key handlers are on nodes. The texts of keys (`getText()`, and `getCharacter()` of `KEY_TYPED`) are those of OpenJFX's headless platform: letters, digits, Space and the arrows are the same everywhere, but Enter and the punctuation keys can differ on a desktop (Enter's character is usually `"\r"` there, and the `[` and `]` keys are `OPEN_BRACKET` and `CLOSE_BRACKET`), so a lesson never prints or compares the text or character of Enter, Tab or a punctuation key, and never uses the `BRACE...` or `..._BRACKET` keys in events or tasks. A held key doesn't repeat its `KEY_PRESSED` here (on a computer the system repeats it while the key is held), so a game keeps the held keys in a map and acts on them in its `AnimationTimer`, as the MOOC's does; then holding a key and running frames does the same here and on a computer for every key the game reads only from the map in its timer. Work done in the pressed handler itself (like firing in module 53) runs again on each repeat on a computer, but once here. In words, the task card and the results say them as "Hold Left, run 30 frames, let go of Left, press and release Space, then run 5 frames": `press key` is "hold", `release key` "let go of", `key` "press and release", `frames 30` "run 30 frames" ("run 1 frame"), each key by its `KeyCode.getName()` (Left, Space, A, 1, Enter).

The **target** comes after `click`, `type`, `set` and `enter`:

- `Button "Add"`: the first node of that class (or of a class that extends it: a learner's `class MenuView extends VBox` is a `VBox`) whose text is exactly that text. Use this for buttons and labels.
- `TextField 2`: the second node of that class. Use this for text fields, whose text changes.
- `#title`: the node whose `setId("title")` gave it that id.
- `#3`: the node numbered 3 in the window JSON of the moment (the page uses these; a test shouldn't, since the numbers shift when a node is added).

The classes a target can name: `Button`, `Label`, `TextField`, `PasswordField`, `TextArea`, and `ButtonBase`, `Labeled`, `TextInputControl`, `Control`, `Region`, `Node`, `Parent` and the panes (`VBox`, `HBox`, `FlowPane`, `StackPane`, `BorderPane`, `GridPane`, `Pane`), and for part 14 `Canvas`, `ImageView`, `Slider`, `LineChart`, `BarChart` and `ScatterChart`. Mouse events go to the node the line names (a canvas or an image view only), with no search for the node under the point: a press or click off the node (or on a fully transparent pixel of an image view) is a problem, while the drags and the release go to the node where the mouse was pressed wherever they are, as in JavaFX. `click Canvas 1` without `at` is a problem; `click <target>` without `at` keeps its meaning for buttons. Numbers are digits, with a minus sign and a decimal point if needed (`25`, `-3`, `2.5`). Nodes are counted in **outline order**: depth first, a pane's children in their order, a BorderPane's regions as top, left, center, right, bottom, and a GridPane's children by row, then column, then the order they were added; the windows one after another, the main one first. Text is in double quotes with Java's escapes (`\"`, `\\`, `\n`, `\t`, `\uXXXX`).

An event that can't happen is skipped, and the window JSON lists it as a problem in plain English, which the results show: `click Button "Add": there's no button with the text "Add"`, `type TextField 2 "x": there's only 1 text field`, `click Label "Total": a label can't be clicked (only buttons can)`, a hidden button or field, typing in a disabled or not editable field, Enter in something that isn't a text field, a line that can't be read. For part 14's lines: `press Canvas 1 at 500 20: (500, 20) isn't on the canvas, which is 300 x 200`, `drag Canvas 1 to 5 5: the mouse isn't pressed: press it first, such as press Canvas 1 at 10 20`, a press while the mouse is already pressed, a point on a fully transparent pixel of an image view or off its image, a mouse line with a point on anything but a canvas or an image view, `set Slider 1 150: the slider goes from 0 to 100, so it can't be moved to 150`, and a hidden or disabled canvas, image view or slider. Clicking a disabled button isn't a problem (it does nothing, as in JavaFX). The page shows each event in plain words too: `Type "Ada" in text field 1, then click "Greet"`, `Move slider 1 to 25`, `Press the mouse on canvas 1 at (10, 20), drag the mouse on canvas 1 to (30, 40), then release the mouse on canvas 1 at (30, 40)`.

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

Part 14's lines go in tests the same way. A drawing made with the mouse is a press, a few drags and a release (the page sends a learner's gesture the same way), and the canvas's outline lists every call the handlers made, so keep a test's gestures short:

```yaml
    tests:
      - events: |
          press Canvas 1 at 10 10
          drag Canvas 1 to 40 30
          drag Canvas 1 to 70 20
          release Canvas 1 at 70 20
          click Canvas 1 at 60 40
      - files:
          pic.png: { asset: tiny.png }        # an image of content/assets (see "Images (assets)")
        events: |
          set Slider 1 7.5
          click ImageView 1 at 2 3
        hidden: true
```

- **Rules.** `events` goes with `stdin`, `args`, `files` and `writes`, not with `call:` or `junit:`. The program must use JavaFX. Every event must reach its target on the solution (a problem is an error in the test), and the solution must show a window at the end (or end with the windows closed, after `close` or `Platform.exit()`); it must end normally and print nothing on System.err. A test with events may print nothing: the window is its result (the build's "prints nothing" error doesn't apply).
- **What's stored.** The test keeps its event lines, the solution's window JSON and its outline; the grader writes the events to `.arena/events.txt` in the program's folder before the run, reads `.arena/window.json` after it, and compares the outlines and the output. A test passes when the output is right, the outline is the same and every event could happen. The lesson file holds every test's window JSON (hidden tests' too) and a phone downloads it with the step, so keep it small: the build warns above 256 KB of JSON for one window and stops above 1 MB. A canvas's calls (about 60 bytes each) and an image view's pixels (4 bytes a pixel, up to 512 x 512) are what make it big: draw hundreds of shapes, not thousands, and use the small images of `content/assets`.
- **The task card** shows the first visible test with `events`: its input and arguments, "What the user does" (the events in plain words), the expected output, and "The window should look like" (the drawing and its outline). So the expected output in the task's last plain ``` block must be what that test prints. Write tasks that say what the window should hold (the texts of its labels and buttons), since the outline compares them exactly.
- **Results.** For a visible test, "The window should look like" next to "Your window", with the lines that differ marked, and the events that couldn't happen in plain words. For a **hidden test**, only which events it used and that the window isn't right, never the expected window. Use hidden tests with other input and other clicks, so a window can't be hard-coded; the build warns about a challenge that replays clicks and typing without a hidden test.
- **Starter code** must not pass, counting the window: starter code that prints the right output but whose window differs is fine.
- A `writes` test may have events too (a program that saves what was typed); `.arena/` files are never part of `writes`.

**A game's tests** (part 14.3) hold keys and run frames:

```yaml
    tests:
      - events: |                 # Hold Up, run 40 frames, then let go of Up
          press key UP
          frames 40
          release key UP
      - events: |
          press key LEFT
          frames 9
          release key LEFT
          press key UP
          frames 60
          release key UP
          key SPACE
          frames 2
        hidden: true
      - events: []                # the window as start leaves it, before any frame
```

- **What is compared** is what any test compares: the output, and the outline of the window after the last event, whose last line is `frames run: 40` when frames ran (so the number of frames counts, and the frames on the way don't). Print something when the game scores (`Hit! Points: 1`), and put the score in a `Text`, so a test checks both.
- **Keep a test short.** Every test runs in the learner's browser each time the challenge is checked, frames and all: 300 frames of a game of 20 polygons take about 3 seconds there on a desktop (a phone is slower). The build warns about a test whose `frames` lines add up to more than 300; a `frames` line runs 1 to 3600 frames. `npm run content:browser` lists a program whose runs with frames take more than 3 seconds each as `SLOW` (not a failure).
- **What's stored.** A test keeps the solution's window after the last event without the frames themselves (`"frames": {"count": 40, "list": []}`), since the task card and the results show the window after the last event, not the animation; its outline has the `frames run` line. (A ` ```java window ` example keeps its frames: the page plays them.)
- **The task card** says the events in words ("What the user does: Hold Up, run 40 frames, then let go of Up"), then the expected output and "The window should look like": the window after the last event. The results of a visible test show the expected window next to the learner's (and, for the learner's run, the animation of its frames); a **hidden test** shows only its events in words and that the window isn't right, never the expected window, as for clicks.
- The determinism rules above apply in full: a seeded `Random`, and no `now`.

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
- **Part 14's nodes** write their numbers as Java writes a double, without a trailing `.0` (`10`, `2.5`, `-0.25`, `1.0E7`), and their texts in quotes with Java's escapes. After the node's class and id:
  - `Canvas 300 x 200`, then one line under it per drawing call, in order, with the state it used: `fillRect 10 10 50 30, fill #ff0000`, `strokeLine 0 0 100 50, stroke #000000, width 2`, `fillText "Hi" 20 40, fill #000000, font System 13`, `strokeText "Hi" 20 40, stroke #000000, width 1, font Serif 20`, `clearRect 0 0 300 200`, `fillPolygon (0, 0) (10, 0) (5, 8), fill #336699`. Colors are `#rrggbb`, or `#rrggbbaa` when not opaque. After 2000 calls the outline says `... and N more calls`; the library keeps the first 5000 for the drawing (beyond that the line adds `(the drawing shows the first 5000)`). Writing the calls into the window takes time in the browser engine (about 0.2 ms a call on a desktop, several times that on a phone), so a lesson or challenge keeps its drawings to a few hundred calls, and a program that draws pixel by pixel uses a `WritableImage` instead (an image of up to 512 x 512 is drawn exactly; a bigger one is a gray box with its size).
  - `ImageView 64 x 48, pixels 3f2a9c1e` (the CRC-32 of its pixels' ARGB values, row by row, each as 4 bytes with alpha first, as 8 hex digits), `ImageView (no image)`, or `ImageView (image error: java.io.FileNotFoundException: missing.png (No such file or directory))`. So an image is compared pixel for pixel.
  - `Slider 0 to 100, value 25`, then `tick labels`, `tick marks`, `major tick 10` (when it isn't 25) and `snaps`, each when set.
  - `LineChart "Sales"`, or `LineChart without a title`, with the flags `(no legend)` and, for a line chart, `(no symbols)`; then under it `x axis NumberAxis "Year" 2000 to 2020 by 5` (its label in quotes when it has one, the bounds and tick unit only when it isn't auto-ranging), `x axis CategoryAxis "Country"`, the same for `y axis`, and one line per series: `series "Helsinki": (2000, 555) (2005, 560)` (a category in quotes: `("Ada", 7)`), `series without a name: ...`, `series "Empty": no data`, `null` for a point that is `null`; `data null` when the chart's list is. The same for `BarChart` and `ScatterChart`.
  - **Shapes** (part 14.3), in their pane's coordinates: `Polygon (0, -10) (10, 10) (-10, 10), at (300, 200), rotate 90, fill #000000` (its points as given, then its translate as `at`, its layout as `layout (x, y)` and its rotate, each when it isn't 0, its fill, and its stroke when it has one: `stroke #ff0000, width 2`, the width when it isn't 1), `Circle radius 20 at (150, 100), fill #ff0000`, `Rectangle 40 x 20 at (10, 10), fill #00ff00`, `Line (0, 0) to (100, 50), stroke #000000`, `Text "Points: 30" at (10, 20)` (its fill only when it isn't black; its font as for labels), `Path area (5, 5) to (10, 10)` (what `Shape.intersect` gave), `no fill` for a fill set to `null`. Another shape or node that is moved or turned adds `translate (x, y)`, `layout (x, y)` and `rotate 45`. A `Pane` with a preferred width and height is `Pane 600 x 400`.
  - When frames ran, the outline ends with `frames run: 120`. Only the window after the last event is compared (and the output), not the frames on the way: the page shows those as an animation.
  - Not compared: mouse handlers, a slider's minor tick count and block increment, an axis's `forceZeroInRange` and minor ticks, `setAnimated`, a `CategoryAxis`'s list of categories (the data's categories are compared, in the series), and the bounds an auto-ranging axis would show.
- The event problems aren't part of the outline, but any problem fails the test.
- **On a phone.** The page wraps a long line of the window as text under its own start, one step further in, so nothing is cut off. A window wider than the column (most windows with a `TextArea`, which is 546 px wide) scrolls sideways inside its frame, and a note under the frame says so, since phones show a scrollbar only while scrolling.

### Frames and the animation

A `frames 30` line runs 30 frames, as JavaFX's pulses would 60 times a second: in each frame, every started `AnimationTimer`'s `handle` is called, in the order the timers were started (a timer started twice keeps its first place; one that an earlier timer stops in a frame still runs in that frame; one started during a frame runs from the next one, as in JavaFX), then the frame is **recorded**, then the `Platform.runLater` tasks queued in it run. Between `frames` lines nothing moves: a key line only runs the key handlers. Frames are counted over the whole run (frame k gets `now` = 1,000,000,000 + k × 16,666,667), and no frame runs before the first `frames` line, so `start` and the key handlers see the window before any frame.

**In the window JSON**, a run that ran frames has, after `"problems"`, `"frames": {"count": N, "list": [...]}`: the count of all the frames, and the first 3600 of them (one minute; after that only the count goes on). Each frame is a list of changes, each `{"k": K, ...}`, where K numbers a node in the frames (the window's nodes carry it as `"f"`). The first time a frame shows a node, its change has its `"type"`, its `"fill"`, `"stroke"` (when it has one), `"text"` and `"font"` (also when they are the default: a `Text`'s black fill and System 13 font, a label's empty text), and its other keys when they aren't the default; after that only what changed since the frame before (a frame where nothing changed is `[]`). The keys: `"tx"`, `"ty"` (translate), `"lx"`, `"ly"` (layout), `"r"` (rotate), the window JSON's own `"points"`, `"centerX"`, `"centerY"`, `"radius"`, `"x"`, `"y"`, `"width"`, `"height"`, `"startX"`, `"startY"`, `"endX"`, `"endY"`, `"visible"`, `"fill"`, `"stroke"`, `"strokeWidth"`, `"text"`, `"font"`, and `"children"` (a pane's children as numbers K, whenever they change: a node added or removed). A `Path`'s `"area"` (what `Shape.intersect` gave) isn't in the frames: the page takes it from the window after the last event, so a lesson doesn't add a `Path` to a pane while frames run. A change `{"roots": [K, ...]}` gives the root of each showing window when they change. Numbers in the frames are rounded to two decimal places (`300.12`), which is plenty for drawing; the window itself (and so the outline) keeps them exactly. The window after the last event is the window JSON's own `"windows"`, which can differ from the last frame when events come after the last `frames` line (a `key SPACE` after it).

**The page** draws shapes as SVG at their real coordinates (a 600 x 400 pane is wider than a phone: it scrolls inside its frame, never scaled), and the window after the last event. As in JavaFX, a Pane doesn't cut off its shapes (one bigger than the pane paints over what is next to it); only the window's scene cuts off what is outside it, and a Pane with no size of its own is as big as JavaFX makes it (its shapes' layout bounds, without their translate). Under a window that has frames there is an animation player (`src/components/window-player.ts`): Play and Pause, "Back one frame" and "Forward one frame", Restart, a counter ("frame 45 of 120"), a slider named "Frame", and the speed (1x, 0.5x, 0.25x of 60 frames a second). It plays once by itself when the window comes into view (unless the learner has already used the player) and stops at the last frame, where the window after the last event shows again; it never plays by itself for a learner who prefers reduced motion (Play plays it), nor in the window panel once its window is out of date (the code changed or a run failed: it shows the window after the last event). A lesson example's window and a free run's have frames (so do the learner's window in a failed visible test's results); a test's stored window doesn't, so the task card shows only the window after the last event. In a free run (the Playground, "Run with my input") of a program whose scene has key handlers, a row of keys under the window: the arrow keys and Space, plus every other `KeyCode` the code names (`KeyCode.A`, a case label of a switch on `e.getCode()`, a static import of `KeyCode`), each a toggle (held or up); "Run 30 frames", "Run 60 frames" and "Run 120 frames" send `press key` or `release key` for each key whose state changed since the last run, then the `frames` line, run the program again with all the events so far and play the new frames; "Tap a key" (a small menu) sends `key X`, a press and release with no frames between; a computer's keyboard holds and lets go of keys while the key row has the focus (a letter or digit by the character it types in the keyboard's layout, as JavaFX names it); Start over forgets everything. A program with an `AnimationTimer` but no key handlers gets only the Run buttons. One line says the game doesn't run live here: choose the keys to hold, run some frames, and the page shows them as an animation (a program with an AnimationTimer and no key handlers gets the Run buttons only, and a shorter line: "The animation doesn't run live here: run some frames, and the page shows them as an animation."). A run of frames the learner starts plays as soon as any of the window is on screen (a lesson's example or a task card waits until a quarter of it is). Describe these controls by these names in a lesson.

**Limits** (a lesson says them where a learner meets them):

- **No key repeat.** A held key gets one `KEY_PRESSED` here; on a computer the system repeats it about 30 times a second after a short pause. A game that keeps the held keys in a map and moves in its `AnimationTimer`, as the MOOC's does, behaves the same either way.
- **Keys go to the scene** of the window shown last. No node has the focus here and there is no focus traversal (Tab doesn't move between nodes), so a node's own `setOnKeyPressed` never runs, and `requestFocus()` gives no node the focus (a key line says so when the node it was called on has a key handler of its own): put key handlers on the scene.
- **`now` isn't real time.** It's a made-up clock, 1/60 of a second a frame, and the build rejects a solution or example that reads it. A game moves things by a fixed step each frame.
- **Bounds** (`getBoundsInLocal`, `getBoundsInParent`) are JavaFX's for shapes; for a `Text` they're an estimate (no font measurement), and for panes and controls what the library knows (nothing is laid out), so a lesson prints bounds only of shapes, and never the box of an `intersect` of circles or strokes. For shapes they match real JavaFX exactly except in the last digits of a stroked polygon's and of a circle turned by an angle that isn't a multiple of 90 degrees, and except for shapes without area: a `Line` of length 0 and a `Polygon` with fewer than two different points (real JavaFX works those out its own way; `npm run fx-check`'s probes found them). Whether `intersect` is empty (`getWidth() != -1`) matches for polygons, rectangles and circles with a fill and no stroke, the shapes lessons use; with a stroke a small overlap can be missed, and a stroked polygon whose points are all on one line can differ, so a lesson's collisions use shapes without a stroke. The box of an `intersect` with a circle or a stroke in it is only approximate (it can be smaller than JavaFX's by a good part of the radius).
- **No other animation**: `Timeline`, `TranslateTransition` and the rest are part of real JavaFX, not of the practice version.

### How the page draws part 14's nodes, and how a learner uses them

The page draws the window JSON, not the outline, so it shows more than the outline compares (approximately, like the windows of part 13):

- **Charts** are SVG of the chart's pref size (JavaFX's 500 x 400 when none is set; a chart keeps that size in a pane that would stretch it): the title, the axes with their ticks, tick labels and labels, dashed grid lines, the legend, and the series in JavaFX's default (Modena) colors, each also with a symbol shape of its own (and, in a line chart without symbols, a dash pattern of its own), so series differ without color. A line joins its points in the order of their x values; bars stand side by side in each category, from zero. An auto-ranging axis gets the bounds JavaFX's `NumberAxis` would pick for the data (zero kept in the range unless `setForceZeroInRange(false)`, the range padded by 2%, a tick unit of 1, 2.5 or 5 times a power of ten; it matched headless OpenJFX 21 on the 16 ranges we measured), and tick labels are written as JavaFX writes them (`2,000`, `2.5`). None of that is in the outline: the window as text lists every point, and is the chart's text alternative.
- **A canvas** replays its recorded calls on an HTML canvas at its own size (as SVG in lesson text and the pre-rendered pages), with JavaFX's defaults: square line caps, text on its baseline, a line break in a text drawing the next line lower. Where nothing is drawn it is transparent, as in JavaFX. It is never scaled: a canvas wider than the screen scrolls with its window.
- **An image view** shows its image from its pixels, drawn a whole number of times larger when it is small (up to 8 times, to about 128 px) with its pixels kept crisp, and the scale under it ("drawn 4 times larger"). An image view with a mouse handler, which the learner clicks pixel by pixel, is drawn larger still (up to 32 times, to about 192 px: an 8 x 8 image 24 times larger, 24 px a pixel, so a finger can hit the pixel a task names); the rule depends only on the image's size, so a task card's expected window and the live one agree. An image over 512 x 512 (whose pixels the JSON doesn't carry) is a gray box with its size; no image, or an image that failed to load, a small dashed box that says so.
- **A slider** is drawn with its track, thumb, tick marks and tick labels (fewer labels when they wouldn't fit); it is 140 px wide and, as JavaFX's, fills the width of a VBox.

In a free run (the Playground, "Run with my input"), they can be used:

- **A slider** is a real range input. Let go (or clicked on its track), it sends `set Slider 1 37`, its value rounded to a hundredth of its range (a slider that snaps to ticks moves freely while dragged and, let go, jumps to the nearest tick and sends it, as JavaFX's thumb does). Page Up and Down move it by its block increment (a slider that snaps: at least the ticks' spacing, snapped at each press), as JavaFX's keys do, and Home and End to its ends. The arrow keys move a slider that snaps by one tick, and one that doesn't by its block increment but never across its whole range at once (then a tenth of it): with JavaFX's default block increment of 10, a slider of 1 to 5 would otherwise jump from end to end, and the values between couldn't be reached with a keyboard; the value is sent once the keys stop for 600 ms. The slider shows and announces the program's own value: a `setValue` isn't snapped, in JavaFX or here.
- **A canvas or image view with a mouse handler** (`setOnMousePressed`, `Dragged`, `Released` or `Clicked`) takes a gesture of the mouse or a finger: the page draws a preview line, and when the finger lifts it sends the gesture as one batch, `press Canvas 1 at 20 30`, a `drag` every 4 pixels or so, and `release`, so the program runs once. A stroke of more than 400 drags is thinned (every other drag dropped, the last kept), so its shape stays. A tap without moving sends `click Canvas 1 at 20 30`. An image view's points are its image's pixels. With the keyboard, the arrow keys move a point (5 pixels, or 1 with Shift; an image view's by 1), Enter clicks there, Space presses there and, after the arrow keys move it, lets it go (Escape forgets a press). A line under the window says how to use it: "Draw on" when it has a press, drag or release handler, "Click" when it has only a click handler; the keyboard help leaves out Shift when only image views take the mouse.
- **What it costs.** Every run replays every event so far, and a stroke is many events (a circle of 40 px is about 60 drags), so each stroke makes every later run longer: on our test machine, about 0.1 s for an ordinary stroke and up to 0.5 s for a long zigzag. JavaFX programs are stopped at 15 seconds. When a run with events takes 40% of that or more, the panel says so and that Start over forgets the events.
- The page names a slider, canvas or image view in its event lines by its id when no other node has it (`#pad`), else by its class and which one it is (`Canvas 1`), and runs the program again from the start with all the events so far, as for clicks.

### Lesson examples with a window

A ` ```java window ` block is a complete program (several files allowed, with `// ==== MenuView.java ====` lines, as in `java run`) that shows a window. An ` ```events ` block right after it holds the clicks and typing to replay; then ` ```input ` and ` ```output ` blocks work as after `java run` (the output block must be exactly what it prints; a program that prints something needs one, or the build warns). ` ```file ` and ` ```asset ` blocks before it are files it reads.

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

A game's example holds keys and runs frames in its events block the same way:

````text
```java window
...
```

```events
press key RIGHT
frames 20
release key RIGHT
key SPACE
frames 5
```

```output
Fire!
```
````

Its ` ```window ` block keeps the frames (the page plays them as an animation, and draws the window after the last event), so they're part of the lesson file: keep an example to a few hundred frames of a few shapes (the build warns above 300 frames and above 256 KB of window JSON).

The build runs it on the JDK with the events, and it must end normally, print nothing on System.err, show a window at the end (a `java window` that shows none, or ends with its windows closed, is an error), and every event must reach its target. The lesson shows the code, then the window after those events, drawn (not clickable) with "The window as text" under it, then the output. A `java run` example that shows a window is an error: it must be `java window`. An ` ```events ` block anywhere else is an error. (In the generated lesson, the build puts a ` ```window ` block in place of the events block: one line of JSON with the events, the window JSON and its outline, which the page draws. Don't write one by hand.)

### Images (assets)

The image files that lessons, tests and the Playground give programs are Java Arena's own: small PNGs drawn by `scripts/assets/make-images.mjs` and committed in `content/assets/` (no third-party images; `content/assets/README.md` lists them, with the exact colors of `tiny.png` and `blocks.png` for challenges whose answer is exact). There are six: `landscape.png` (32 x 24, a sky, a sun, hills, a lake and a field), `checker.png` (16 x 16, a checkerboard of 4 x 4 squares), `icon.png` (8 x 8, a pixel-art heart on a transparent background: the only one with transparency), `blocks.png` (48 x 32, 24 colored squares of 8 x 8), `photo.png` (64 x 48, a soft sunset whose pixels all differ a little, like a photo) and `tiny.png` (6 x 4, every pixel a known color). Every pixel is opaque or fully transparent and the files have no gamma or color profile, so Java Arena's JavaFX and real JavaFX read the same colors from them. A new image is added to the script (see its README), never as a file from elsewhere.

**In a test**, `{ asset: name }` in place of a file's text puts that image's bytes in the program's folder, under the test's name for it (which may differ, or be in a folder):

```yaml
    tests:
      - files:
          pic.png: { asset: tiny.png }        # the program reads new Image("file:pic.png")
        events: |
          click ImageView 2 at 1 1
      - files:
          pic.png: { asset: blocks.png }      # a hidden test with another image
          notes.txt: |                        # text files can go with it
            hello
        events: []
        hidden: true
```

The build runs the solution with the image in its folder, as with any file, and a test with an image is still a single run. The task card shows the image, drawn larger with crisp pixels, under "The image pic.png" with its size ("6 x 4 pixels, drawn 16 times larger"); the results show it the same way for a visible test that failed. The browser's grader fetches it from the site (it's saved for offline use with the rest of the site) and gives its bytes to the run; "Run with my input" gives it too. Hidden tests should use other images, as other input.

**In lesson text**, an empty ` ```asset landscape.png ` block (the closing fence on the next line) draws the image with its name and size, and puts it in the folder of the next example (a ` ```java run `, ` ```java main ` or ` ```java window `), as a ` ```file ` block does with text. Several can come before one example, with ` ```file ` blocks too. A step's text and its tasks can have them; hints and drills can't (the build says so). The page and the pre-rendered page draw the image; its description (from `content/assets/assets.json`) is its alt text, so say in the text what the program does with it.

````text
```asset landscape.png
```

```java window
import javafx.application.Application;
...
        ImageView view = new ImageView(new Image("file:landscape.png"));
...
```
````

**The build checks** that every image named is one of `content/assets` (and that every PNG there is listed in its `assets.json`, is 8-bit RGB or RGBA, not interlaced, with only the IHDR, IDAT and IEND chunks, at most 512 x 512, and the size `assets.json` says), that an asset block is empty, and that a `writes` file isn't an image (`writes` compares text). It copies each image to `public/images/<name>-<hash>.png` (the hash of its bytes, so a saved copy is never out of date), where the site serves it; a test or a block in the generated lesson holds where it's served, its size and its description, and `src/generated/course.json` lists them all for the Playground. A run's folder never shows an image as text: a file that isn't text is described by its size (see "Files a program writes").

**In the Playground**, "Add a sample image" lists the images; the ones added are in the program's folder on every Run (and every rerun of its window), are saved with the program, and travel in its share link.

### Drills with windows

A boss drill can have `events` tests, checked and graded exactly as in a lesson challenge. A boss rep shows only its prompt and the editor (no task card), so the prompt must say what the window should hold and what the clicks do; the results show the window comparison when a test fails. The other drill types run their code in `main` and can't show a window; when a drill's code uses JavaFX, the build runs its statements in `start` instead (`Main` extends `Application`, `main` calls `launch(args)`, and `start` ends with `Platform.exit()`), because whether real JavaFX can make controls before `launch` depends on how the program is started, and as the check runs programs (JavaFX on the class path, `main` called directly) it can't. Such a prompt says "This code runs inside `start`", and the drill shows `// inside start:` above the statements.

### Checking

`npm run content` checks everything above on the JDK. `npm run content:browser` then replays every test with events and every `java window` example in the browser engine and compares the window JSON byte for byte (the frames of a game too, number for number), and the output, with the JDK's (`CONTENT_ONLY=gui` replays only the programs whose place matches).

`npm run fx-check` (after `npm run content`) runs every model solution and example that uses JavaFX on **real OpenJFX 21** without a screen, with the same input, arguments, files, clicks and typing, and compares the output, the files written, the window outline (after every event line, and at the end) and the events that couldn't happen with Java Arena's JavaFX (`FX_CHECK_ONLY=gui` checks only the programs whose place matches). CI fails on any difference. This is what lets a lesson say that the same code shows the same window contents with real JavaFX. Besides the fonts and styles above, real JavaFX differs in what Java Arena's JavaFX can't do, so a lesson's program must not depend on these (the check fails, or can't run it):

- After the window shows, real JavaFX lays it out: a window's or scene's size, and a control's padding or font, read after `show()` are the laid-out values there. Don't print them after the window shows.
- `setFont(null)`: real JavaFX fails when it lays the control out.
- Controls and scenes made before `launch` (in a static field or in `main`): real JavaFX makes them only after its toolkit has started, and whether it has then depends on how the program is started. From the module path with an `Application` main class, it starts before `main`; with JavaFX on the class path (as the check runs programs), or a main class that isn't the `Application`, it starts in `launch`, and `new Label(...)` before it fails. Make them in `start`.

For part 14 the check also applies the same `set Slider` events (as real JavaFX's `Slider.adjustValue`, what letting the thumb go there does) and mouse events (real `MouseEvent`s handed to the real scene, which picks the node, sends the drags and the release to the node pressed and decides whether a click follows), and compares, read from the real nodes:

- **Charts**: the whole outline of each chart: its class, title, legend and symbols, each axis (its class, label and, when it isn't auto-ranging, its bounds and tick unit) and every series with every data point. What real JavaFX draws (its auto-ranged bounds, the layout, the colors) isn't compared: the page draws charts approximately.
- **Sliders**: min, max, value, tick labels, tick marks, major tick unit and snapping, after the same `set Slider` events.
- **Images**: an image view's size and the CRC-32 of its pixels, read through the real `PixelReader`, so every pixel is compared; whatever the program prints about pixels (`getArgb`, `getColor`) is compared as output, like all output.
- **The mouse**: the handlers' output and the window after the same presses, drags, releases and clicks at the same points.
- **Canvases**: real JavaFX doesn't tell what was drawn on a canvas, so the check takes a snapshot of the real canvas and compares it, pixel by pixel, with the calls Java Arena's JavaFX recorded drawn again on a new canvas of real JavaFX: every pixel must be within 2 of 255 (the recorded colors are rounded to 8 bits per channel). So it checks that the recording holds what the program drew, in order, with the paint, line width and font each call used. In a test with deliberately wrong recordings (each call moved by half a pixel or one, a size, color, line width or text changed, a call left out, two calls swapped) on the 31 canvases of the probes, the fidelity programs and the lessons, every right drawing passed and every wrong one that changes what the canvas shows by more than 2 of 255 failed (see `scripts/fx-check/README.md`). It doesn't check how the page draws those calls in the browser, which is approximate (the browser's fonts, for one). A canvas with more than 5000 calls isn't compared (Java Arena keeps the first 5000). A lesson may say that a model solution's drawing was checked against real JavaFX, but not that the page's drawing looks exactly like a real window.

Real JavaFX also differs in these, which a part 14 lesson must avoid: adding several categories at once (`addAll`, `setAll`) to a `CategoryAxis` when one of them is already there or `null`; mouse handlers on anything but a canvas or an image view (real JavaFX also sends a mouse event to the panes around the node, and a real click on a button runs its mouse handlers); `getSceneX()` and `getSceneY()` (scene coordinates in real JavaFX, here the same as `getX()` and `getY()`); and image files that aren't PNG.

**Keys and frames on real JavaFX (part 14.3).** The check fires the key lines as real `KeyEvent`s, made with JavaFX's own constructor and handed to the real scene as the toolkit hands it a key event: `press key` a `KEY_PRESSED` (and a `KEY_TYPED` after it for a key that makes a character), `release key` a `KEY_RELEASED`, `key` both, with the tasks the press queued run in between. Real JavaFX runs `AnimationTimer`s from its pulses with the computer's clock, so the check pauses that (JavaFX's own primary timer, as soon as the toolkit starts) and runs the frames itself: for each frame of a `frames` line it calls `handle` on every timer started at that moment, in the order they were started (read from real JavaFX's own list of started timers), with the same made-up `now` as Java Arena, then runs the tasks the frame queued. After every event line (each `frames` line included) it compares the window outline (every shape's points or size, place, translate, layout in a plain `Pane`, rotate, fill and stroke, a `Text`'s text, the scene's key handlers and the count of frames run) and the events that couldn't happen, and at the end the output, so what the timers and handlers print in every frame is compared too. The frames in between the event lines are compared only through that output (the page's animation itself isn't). So a lesson may say that each model solution's game was run on real JavaFX 21 frame by frame, with the same keys, and left the same shapes in the same places, turned the same way, after every step of each test. It must not say that the game runs the same in real time on a computer: there the frames come from the clock, about 60 a second, and a held key repeats. A game's window holds no controls (a focused control would get the keys first in real JavaFX), its key handlers are on the scene, and it doesn't print `now`, the bounds of a turned circle or of a stroked shape (real JavaFX's last digits differ there: see `scripts/fx-check/README.md`), or the box of a `Shape.intersect` result with a circle in it (`getWidth() != -1` is exact for every shape).

See `scripts/fx-check/README.md` for what the check proves and what it doesn't.

### What a lesson may say about part 14

In the first step of module 53 (part 14.3), say in a sentence or two: the game is drawn by the page from what your program told JavaFX, approximately, like the windows before; it doesn't run live: you choose which keys are held and how many frames to run, and the page plays those frames back as an animation; and what the check against real JavaFX did with the model solutions (as "Keys and frames on real JavaFX" above says: say only that). Say where keys first come up that a held key doesn't repeat here, and where `Random` first comes up in the game that it needs a seed, since the page runs the program again from the start for every new event.

In the first step of each module of part 14.1 and 14.2, say in a sentence or two: charts and drawings are drawn by the page from what your program told JavaFX to show, approximately, like the windows of part 13; images are read and written pixel by pixel exactly; and sound can't play here (that step is reading only, and the MOOC's sound exercise needs your own computer). Never claim more than the checks prove: see "Canvases" above for drawings.

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
