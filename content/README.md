# Lesson content

This folder holds the course: `course.yaml` (every planned module, in order, with the MOOC sections it follows) and one file per written module in `modules/`, named after its place in the course (`01-printing.yaml`).

## License and credit

The lesson content in this folder is licensed under [Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/) (CC BY-NC-SA 4.0); the full legal code is in [LICENSE](LICENSE).

The course follows the order and topics of [Java Programming](https://java-programming.mooc.fi) by Arto Hellas, Matti Luukkainen and contributors, Agile Education Research group, University of Helsinki, licensed under CC BY-NC-SA 4.0. The MOOC section titles in `course.yaml` come from that course. The explanations, examples, exercises, hints and solutions are written for Java Arena; no MOOC exercise templates, tests or images are copied. Java Arena is not affiliated with or endorsed by the University of Helsinki or MOOC.fi.

## How a module is checked

`npm run content` (also part of `npm run build`) reads every module and checks it with the reference JDK (Eclipse Temurin 21.0.10+7, fetched by `scripts/get-jdk.sh`, or `JAVA_HOME`):

- every solution compiles without warnings and runs on every test input without an error; the expected outputs the site grades against are what it really prints;
- an `expect` written in a test must match that output exactly;
- starter code must not already pass, and a fill-in with every blank empty must not pass;
- every solution follows its own `require` and `forbid` rules;
- every example program in the lesson text is compiled and run, and an `output` block after it must be exactly what it prints;
- every step has exactly three challenges, a `**Your turn:**` task and at least one hint per challenge;
- the expected output a task shows (its last plain ``` block) is exactly what the first visible test prints;
- no key is misspelled, and every hint is a string of text (Markdown), not something YAML read as a list or mapping; quote a hint that contains `: `.

`npm run content:browser` (after `npm run build`) then replays every program in the browser engine and fails if anything differs from the JDK.

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

A `java run` example (and a `predict` program) can hold several files too: each file after the first starts with a line such as `// ==== Book.java ====`, and the page shows each file under its name.

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

In lesson text, a ` ```file scores.txt ` block before a ` ```java run ` example is a file that example reads (shown with its name).

### Input that ends with an empty line

Input normally ends with one line break. To end it with an empty line on purpose (for a program that reads until an empty line), keep the blank line with YAML's `|+`, or write it quoted: `stdin: "Ada\nBen\n\n"`. The page shows it as "(an empty line)".

### Tests that call methods

The site compiles a hidden class, `ArenaCheck extends Main`, whose `main` runs the test's code (so a call reads exactly as it would inside `Main`), and grades what it prints. It imports `java.util.*`, so a test can build an `ArrayList` by its short name. An exception from the learner's code, checked or not, comes out unchanged, as it would from `Main` itself. The build does the same on the JDK. When the learner's own code compiles but the check can't call it (a misspelled name, other parameter types, a `private` or non-`static` method, a `void` method whose value is used, a class not called `Main` or in a package), the learner gets a plain explanation that names the call instead of the check program's javac errors. A test named after a one-line call shows that call as its name.

Every Java block in lesson text says what it is:

- ` ```java run ` a complete program; it's compiled and run. An ` ```input ` block right after it is what it reads, and an ` ```output ` block after that must be exactly what it prints.
- ` ```java main ` statements that are run inside a main method (imports such as `java.util.Scanner` are added when used); same checks.
- ` ```java error ` code that must not compile. A ` ```javac ` block after it must be exactly what javac prints.
- ` ```java run crash ` a complete program that must stop with an uncaught exception (to show a crash on purpose). Its ` ```input ` and ` ```output ` blocks are optional; a ` ```crash ` block after them must be exactly what Java prints: the `Exception in thread "main" ...` line and the program's own `at Main...` lines (lines inside Java's own classes are left out, since they differ between JVMs).
- ` ```java fragment ` a piece of code that can't run on its own; shown only.

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

Predict and fill drills may give the program input with `stdin`. `placement.yaml` holds the placement quiz: `questions:`, each a drill with a `module:`, one per module in course order.

To check one drill file while writing it, without changing any generated file: `node scripts/build-content.mjs --dry --drill-file loops.yaml`. To check one module and its drills: `node scripts/build-content.mjs --dry --module-file 13-lists.yaml`.
