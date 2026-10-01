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
- the expected output a task shows (its last plain ``` block) is exactly what the test the task card shows prints: the first visible test with `writes`, or else the first visible test;
- every ` ```classes ` block in lesson text is a class diagram the build can read, which it draws (see "Class diagrams");
- no key is misspelled, and every hint is a string of text (Markdown), not something YAML read as a list or mapping; quote a hint that contains `: `.

`npm run content:browser` (after `npm run build`) then replays every program in the browser engine and fails if anything differs from the JDK (for a test with `writes`, every file the run leaves in its folder too).

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

## Drills (Deathmatch, daily challenge, interview prep)

`drills/<module id>.yaml` holds the practice drills of a lesson module; `drills/interview-*.yaml` (with `topic: interview`) the interview questions, which are open to everyone. Each drill has a `type`, and most show a little Java: `pre` for methods, `body` for statements run in `main` (imports such as `java.util.Scanner` are added when used). The build puts them in a complete program and checks it on the reference JDK. Predict and compiles answers are taken from the JDK, not typed by hand; a bug's fix must run and change what the program does; a choice's `answer` is written by hand, so `verify: output` should be used whenever the right choice is what the code prints. Prompts, choices and explanations are Markdown: code, and anything with `<`, goes in backticks (the build rejects text that Markdown would read as HTML):

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
