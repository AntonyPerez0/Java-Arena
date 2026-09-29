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

The site compiles a hidden class, `ArenaCheck extends Main`, whose `main` runs the test's code (so a call reads exactly as it would inside `Main`), and grades what it prints. The build does the same on the JDK. When the learner's own code compiles but the check can't call it (a misspelled name, other parameter types, a `private` or non-`static` method, a `void` method whose value is used), the learner gets a plain explanation that names the call instead of the check program's javac errors. A test named after a one-line call shows that call as its name.

Every Java block in lesson text says what it is:

- ` ```java run ` a complete program; it's compiled and run. An ` ```input ` block right after it is what it reads, and an ` ```output ` block after that must be exactly what it prints.
- ` ```java main ` statements that are run inside a main method (imports such as `java.util.Scanner` are added when used); same checks.
- ` ```java error ` code that must not compile. A ` ```javac ` block after it must be exactly what javac prints.
- ` ```java fragment ` a piece of code that can't run on its own; shown only.
