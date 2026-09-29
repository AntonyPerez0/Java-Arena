# Java Arena curriculum map (Helsinki Java MOOC, parts 1 to 14)

Synthesis of the four reader reports (`mooc-parts-01-02.md`, `mooc-parts-03-05.md`, `mooc-parts-06-10.md`, `mooc-parts-11-14.md` and their `structured.json`), merged by `/home/user/ref/research/synth/merge.py`. Machine-readable version: `/home/user/ref/research/curriculum-map.json`. Research only; every challenge idea is original and none copies MOOC text, templates, tests or sample output.

## Summary

- **59 modules, 359 steps, 1077 challenges** (3 per step): 54 MOOC modules with 333 steps, plus 5 optional extra modules that are NOT part of the MOOC.
- **Coverage, checked by script** (`/home/user/ref/research/critic/check_map.py`, headings by `critic/headings.py`)**:** all 262 visible exercises (the `EX [` lines of `/home/user/ref/mooc-outline.txt`) are counted in exactly one step's `covers`; multi-part exercises that spill into later steps are listed there under `continues`, not counted twice. All 68 section files appear in some module's MOOC list, and every `##`/`###` heading of the outline is named in some step's topics.
- **Section count:** the task brief says 69 section files; `ls data/part-*/[0-9]*-*.md` in `/home/user/ref/java-programming` finds **68** (every other `.md` in `data/part-*` is an `index.md`), matching the 68 `===` sections of the outline. All 68 are mapped, summary and admin sections included (folded into the neighbouring module as closing reading cards).
- **Granularity:** every module has 4 to 10 steps (min 4, max 9). The synthesizer kept the readers' slices, ids (all unique, kebab-case, no digits) and MOOC order, and moved two exercise assignments (HeightOrder, VehicleRegistry) and replaced one challenge that was a lesson note (inheritance step 6). The completeness critic then split part 8 so that 8.3 comes before 8.4 (new module `grouping`), moved the 6.4 step after 6.3, and filled the topics of parts 6 to 14 (see the last section).
- **Java Programming II (parts 8 to 14)** assumes Java Programming I (parts 1 to 7); MOOC section 8.1 is a recap. The site should offer placement or a skip at module `recap`.
- **Browser:** 23 in-browser, 28 in-browser-with-adaptation, 8 mixed, 0 own-computer. No module needs the learner's own computer only; the 7 mixed MOOC modules (parts 13 and 14) teach their logic in the browser and move JavaFX, sound, Maven and H2 to own-computer projects.
- **Recommended handling of what cannot run in the browser:** logic-first browser steps plus optional own-computer projects in the learner's GitHub repo, graded by GitHub Actions with **Maven** + JUnit 5 (+ TestFX/Monocle for JavaFX). Maven over Gradle because MOOC 14.4 teaches `pom.xml` and every MOOC template is a Maven project (`license.md` line 103). A JavaFX-like UI shim in the browser is a later phase (design only, not built). Details in the non-browser list below.
- **Legend:** browser = runs fully in the browser; browser, adapted = runs in the browser with a site feature beyond C/C++ Arena's single-file editor (multi-file editor, in-memory files, JUnit-in-browser, style check); mixed = some steps in the browser, some on the learner's own computer or on a not-yet-built shim.

## Java Programming I (MOOC parts 1 to 7)

| # | Module | MOOC part.section | Steps | Notes |
|---|---|---|---|---|
| 1 | Printing (`printing`) | 1.1, 1.2, 2.1 (part) | 5 | browser; 4 exercises |
| 2 | Reading input and strings (`reading-input`) | 1.3 | 4 | browser; 6 exercises |
| 3 | Variables and types (`variables`) | 1.4 | 6 | browser; 5 exercises |
| 4 | Calculating with numbers (`calculating`) | 1.5 | 6 | browser; 8 exercises |
| 5 | Making decisions (`conditionals`) | 1.6 (part) | 6 | browser, adapted: style check; 8 exercises |
| 6 | Conditions and logic (`boolean-logic`) | 1.6 (part), 1.7 (reading) | 6 | browser; 6 exercises |
| 7 | Problem-solving patterns (`problem-patterns`) | 2.1 | 4 | browser; 4 exercises |
| 8 | Repeating with while (`loops`) | 2.2 | 5 | browser; 9 exercises |
| 9 | Loop conditions and for (`for-loops`) | 2.3 | 7 | browser; 7 exercises |
| 10 | Methods and parameters (`methods`) | 2.4 (part) | 5 | browser; 6 exercises |
| 11 | Return values and the call stack (`return-values`) | 2.4 (part), 2.5 (reading) | 8 | browser; 8 exercises |
| 12 | Finding bugs (`debugging`) | 3.1 | 4 | browser; 0 exercises |
| 13 | Lists (`lists`) | 3.2 (part) | 8 | browser; 11 exercises |
| 14 | For-each, list methods and lists in methods (`list-methods`) | 3.2 (part) | 7 | browser; 6 exercises |
| 15 | Arrays (`arrays`) | 3.3 | 6 | browser; 5 exercises |
| 16 | Working with strings (`strings`) | 3.4, 3.5 (reading) | 8 | browser; 10 exercises |
| 17 | Classes and objects (`classes`) | 4.1 (part) | 6 | browser, adapted: multi-file editor; 9 exercises |
| 18 | Getters, toString and bigger classes (`object-methods`) | 4.1 (part) | 7 | browser, adapted: multi-file editor; 7 exercises |
| 19 | Objects in a list (`lists-of-objects`) | 4.2 | 5 | browser, adapted: multi-file editor; 4 exercises |
| 20 | Reading files (`reading-files`) | 4.3, 4.4 (reading) | 9 | browser, adapted: in-memory files, own-computer Maven; 11 exercises |
| 21 | Designing classes and overloading (`class-design`) | 5.1, 5.2 | 5 | browser, adapted: multi-file editor; 6 exercises |
| 22 | Primitive and reference variables (`references`) | 5.3, 5.4 (part) | 4 | browser; 1 exercise |
| 23 | Objects working together (`object-interaction`) | 5.4 (part), 5.5 (reading) | 8 | browser, adapted: multi-file editor; 10 exercises |
| 24 | Lists inside objects (`objects-with-lists`) | 6.1 | 9 | browser, adapted: multi-class; 8 exercises |
| 25 | Separating the UI from program logic (`text-ui`) | 6.2 | 7 | browser, adapted: multi-class; 4 exercises |
| 26 | Troubleshooting and unit testing (`unit-testing`) | 6.3, 6.4 (reading) | 6 | browser, adapted: JUnit-in-browser, own-computer Maven; 1 exercise |
| 27 | Procedural and object-oriented programs (`paradigms`) | 7.1 | 4 | browser, adapted: multi-class; 2 exercises |
| 28 | Sorting and searching (`sorting-searching`) | 7.2 | 6 | browser; 3 exercises |
| 29 | Larger programs (`larger-programs`) | 7.3, 7.4 | 5 | browser, adapted: in-memory files, multi-class; 3 exercises |

## Java Programming II (MOOC parts 8 to 14)

The MOOC assumes Java Programming I knowledge for everything in this table.

| # | Module | MOOC part.section | Steps | Notes |
|---|---|---|---|---|
| 30 | Warm-up: recap of parts 1 to 7 (`recap`) | 8.1 | 5 | browser, adapted: multi-class; 5 exercises |
| 31 | Hash maps (`hash-maps`) | 8.2 | 5 | browser; 5 exercises |
| 32 | Comparing objects: equals and hashCode (`equals-hashcode`) | 8.3 | 5 | browser, adapted: multi-class; 3 exercises |
| 33 | Grouping data with hash maps (`grouping`) | 8.4, 8.5 (reading) | 4 | browser, adapted: multi-class; 2 exercises |
| 34 | Inheritance and abstract classes (`inheritance`) | 9.1 | 8 | browser, adapted: multi-class; 4 exercises |
| 35 | Interfaces (`interfaces`) | 9.2 | 9 | browser, adapted: multi-class; 6 exercises |
| 36 | Polymorphism (`polymorphism`) | 9.3, 9.4 | 4 | browser, adapted: multi-class; 2 exercises |
| 37 | Streams and lambdas (`streams`) | 10.1 | 9 | browser, adapted: in-memory files, multi-class; 10 exercises |
| 38 | Ordering objects: Comparable and Comparator (`sorting-objects`) | 10.2 | 4 | browser, adapted: in-memory files; 4 exercises |
| 39 | StringBuilder, regular expressions, enums and iterators (`useful-techniques`) | 10.3, 10.4 | 8 | browser, adapted: multi-class; 3 exercises |
| 40 | Class diagrams (`class-diagrams`) | 11.1 | 7 | browser, adapted: multi-file editor; 7 exercises |
| 41 | Packages and imports (`packages`) | 11.2 | 6 | browser, adapted: package folders; 3 exercises |
| 42 | Exceptions (`exceptions`) | 11.3 | 7 | browser, adapted: in-memory files, multi-file editor; 2 exercises |
| 43 | Writing files (`writing-files`) | 11.4, 11.5 | 5 | browser, adapted: writable files; 1 exercise |
| 44 | Type parameters (generics) (`generics`) | 12.1 | 5 | browser; 2 exercises |
| 45 | Building your own list and hash map (`list-and-map-internals`) | 12.2 | 8 | browser, adapted: multi-class; 3 exercises |
| 46 | Random numbers (`randomness`) | 12.3 | 5 | browser; 3 exercises |
| 47 | Two-dimensional arrays (`multidimensional-arrays`) | 12.4, 12.5 | 6 | browser; 2 exercises |
| 48 | GUI: windows, components and layouts (`gui-basics`) | 13.1, 13.2 | 6 | mixed: UI shim, own-computer JavaFX; 5 exercises |
| 49 | GUI: event handling (`gui-events`) | 13.3, 13.4 | 5 | mixed: UI shim, own-computer JavaFX; 3 exercises |
| 50 | GUI: multiple views (`gui-views`) | 13.5, 13.6 | 8 | mixed: UI shim, own-computer JavaFX; 5 exercises |
| 51 | Data visualization (`charts`) | 14.1 | 8 | mixed: in-memory files, UI shim, own-computer JavaFX; 5 exercises |
| 52 | Drawing, images and sound (`drawing-and-images`) | 14.2 | 7 | mixed: UI shim, own-computer JavaFX; 3 exercises |
| 53 | Project: an Asteroids-style game (`asteroids`) | 14.3 | 8 | mixed: UI shim, own-computer JavaFX; 1 exercise |
| 54 | Libraries, Maven and databases (`libraries-and-tools`) | 14.4, 14.5 | 5 | mixed: own-computer Maven; 1 exercise |

## Extra modules (NOT part of the MOOC, optional)

| # | Module | MOOC part.section | Steps | Notes |
|---|---|---|---|---|
| 55 | Recursion (`recursion`) | not in the MOOC (after `sorting-searching`) | 6 | browser |
| 56 | Records (`records`) | not in the MOOC (after `useful-techniques`) | 5 | browser, adapted: needs Java 16 or newer |
| 57 | switch, var and text blocks (`switch-and-text`) | not in the MOOC (after `records`) | 5 | browser, adapted: needs Java 15 or newer |
| 58 | Pattern matching and sealed types (`sealed-and-patterns`) | not in the MOOC (after `switch-and-text`) | 4 | mixed: needs Java 17 (steps 1-2) and Java 21 (steps 3-4) |
| 59 | Linked lists, stacks, queues and trees (`linked-structures`) | not in the MOOC (after `list-and-map-internals`) | 6 | browser |

Why these extras: the MOOC text never teaches recursion (the only recursive behaviour is implicit, in 9.2 InterfaceInABox where boxes contain boxes; "recursi" occurs only twice, as example data in 9.2) and has no switch, var, text blocks, records, sealed types, `printf`/`String.format`, or TreeMap/TreeSet (grep of `data/part-*/[0-9]*.md` with HTML comments stripped; "record" and "switch" occur only as English words). Minimum Java versions were verified with `javac 21.0.10 --release N`: switch expressions 14, text blocks 15, records and instanceof patterns 16, sealed types 17, switch and record patterns 21. Whether they run in the browser depends on the engine (see `modern-java-extras` below).

## Module details

### 1. Printing (`printing`), Java Programming I

MOOC: 1.1 Getting started with programming (`part-1/1-starting-programming.md`); 1.2 Printing (`part-1/2-printing.md`); 2.1 (part) Recurring problems and patterns to solve them (`part-2/1-problems-and-patterns.md`, System.out.print hint box only).
Browser: in-browser.

Section 1.1 (1 tooling exercise) is folded in as the first step. System.out.print is taught here although the MOOC first shows it in a Part 2 hint box, because it belongs with println. Section 1.1 is tooling (TMC download/submit); its Sandbox exercise becomes the site's first Run/Check step. The 2.1 System.out.print hint box is taught here, and 2.1 is also listed under problem-patterns.

1. **Your first Java program** (covers Sandbox [part01-Part01_01.Sandbox], Ada Lovelace [part01-Part01_02.AdaLovelace]). Type: fill in the blanks.
   - C1: blank for println in a ready program that prints a famous programmer's name.
   - C2: blanks for 'class', 'static void main' in the frame.
   - C3: empty editor, write the whole class and main that prints one line.
   - MOOC topics: 1.1 Programmers Write Source Code; 1.2 Program Boilerplate; 1.2 hint: Running the Program (compile, then run)
2. **Several lines, in order** (covers Once Upon a Time [part01-Part01_03.OnceUponATime], Dinosaur [part01-Part01_04.Dinosaur]). Type: write a program (stdout), require exactly N println.
   - C1: add the two missing lines of a three-line rhyme.
   - C2: statements are in the wrong order, reorder so the output matches.
   - C3: print a 4-line label exactly, using exactly 4 println calls (count rule).
   - MOOC topics: 1.2 Printing Multiple Lines; 1.2 hint: Exact Inspector; 1.2 hint: sout shortcut (as an editor snippet)
3. **print and println** (no MOOC exercise). Type: fill in the blanks, then write a program (stdout).
   - C1: choose print or println in two blanks so two calls make one line.
   - C2: add a blank line between two paragraphs with println().
   - C3: build one line from three print calls and end it correctly.
   - MOOC topics: 2.1 hint: System.out.print; empty println() for a blank line
4. **Comments** (no MOOC exercise). Type: write a program (stdout).
   - C1: comment out one line so the output matches.
   - C2: turn loose notes into a block comment so the program compiles.
   - C3: fix a program where a comment accidentally hides a needed statement.
   - MOOC topics: 1.2 Comments (// and /* */); 1.2 commenting out code to try things
5. **Reading compiler errors** (no MOOC exercise). Type: write a program (fix the broken seed so it compiles and prints).
   - C1: missing semicolon.
   - C2: misspelled println and a lower-case 'system'.
   - C3: missing closing quote and closing brace; error message explained in plain English.
   - MOOC topics: 1.2 Terminology: parameters, semicolons separate statements; 1.2 hint: Running the Program (compile errors); 1.2 hint: Exact Inspector (typos like printin); 1.2 Terminology and Code Comments; 1.2 Command parameters; 1.2 Semicolon Separates Commands

### 2. Reading input and strings (`reading-input`), Java Programming I

MOOC: 1.3 Reading input (`part-1/3-reading-input.md`).
Browser: in-browser.

Exercise order differs slightly from the MOOC: MessageThreeTimes (Part01_07) is grouped with Message in step 1 and HiAdaLovelace (Part01_06) comes in step 3 with the other concatenation exercise.

1. **Reading a line with Scanner** (covers Message [part01-Part01_05.Message], Message Three Times [part01-Part01_07.MessageThreeTimes]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: blanks for the import and nextLine.
   - C2: echo the line twice with a header line.
   - C3: write the whole program: read one line and print it three times between two separator lines.
   - MOOC topics: 1.3 intro: import, new Scanner(System.in), nextLine(); 1.3 Reading Strings
2. **String variables** (no MOOC exercise). Type: write a program (stdout).
   - C1: declare a String variable and print it.
   - C2: fix a program that prints the variable's name instead of its value.
   - C3: three variables printed in a required order.
   - MOOC topics: 1.3 Fundamentals of Strings (literal vs variable, quoting a name prints the name)
3. **Joining strings with +** (covers Hi Ada Lovelace! [part01-Part01_06.HiAdaLovelace], Greeting [part01-Part01_08.Greeting]). Type: write a program (stdin-stdout); forbid hard-coding the value.
   - C1: greet using an existing variable (forbid the literal in println).
   - C2: read a name, print a greeting.
   - C3: read a first and last name, print them joined with the right spaces and punctuation.
   - MOOC topics: 1.3 Concatenation; 1.3 Input String as a Part of Output; 1.3 Concatenation - Joining Strings Together
4. **Several inputs in order** (covers Conversation [part01-Part01_09.Conversation], Story [part01-Part01_10.Story]). Type: write a program (stdin-stdout).
   - C1: two questions, two answers echoed.
   - C2: three inputs printed back in reverse order.
   - C3: a short template story that reuses two inputs several times.
   - MOOC topics: 1.3 Program Execution Waits for Input

### 3. Variables and types (`variables`), Java Programming I

MOOC: 1.4 Variables (`part-1/4-variables.md`).
Browser: in-browser.

The A/B research questionnaire at the top of the section is not carried over.

1. **Variables and their types** (covers Various Variables [part01-Part01_11.VariousVariables]). Type: fill in the blanks.
   - C1: set three values in marked lines so the fixed print lines match.
   - C2: choose the right type keyword for four declarations.
   - C3: declare four variables of four types and print a labelled summary.
   - MOOC topics: 1.4 intro: int, double, String, boolean, printing with +; 1.4 The Type of the Variable Informs of Possible Values
2. **Changing a value** (no MOOC exercise). Type: write a program (fix compile errors; stdout).
   - C1: reassign a variable between two prints.
   - C2: remove a second declaration of the same name.
   - C3: fix an int that receives a decimal value by choosing the right type.
   - MOOC topics: 1.4 Changing a Value Assigned to a Variable; 1.4 Variable's Type Persists; duplicate declaration error
3. **Naming variables** (no MOOC exercise). Type: write a program (fix compile errors; stdout).
   - C1: rename a variable with a space into camelCase.
   - C2: fix names that start with a digit or contain '!'.
   - C3: rename a, b, c into descriptive names (require the new names).
   - MOOC topics: 1.4 Naming Variables; 1.4 Permissible / Impermissible Variable Names
4. **Reading integers** (covers Integer Input [part01-Part01_12.IntegerInput]). Type: write a program (stdin-stdout).
   - C1: blank for Integer.valueOf.
   - C2: read a number and print it in a sentence.
   - C3: read two numbers and print them on one line (no arithmetic yet).
   - MOOC topics: 1.4 Reading Integers (Integer.valueOf); 1.4 Reading Different Variable Types from User
5. **Reading doubles and booleans** (covers Double Input [part01-Part01_13.DoubleInput], Boolean Input [part01-Part01_14.BooleanInput]). Type: write a program (stdin-stdout).
   - C1: read a decimal number and print it (hidden test with a whole number shows the .0).
   - C2: read a boolean (hidden tests: mixed case 'TrUe', other words).
   - C3: read both and print a labelled line for each.
   - MOOC topics: 1.4 Reading Doubles; 1.4 Reading Booleans
6. **Mixing input types** (covers Different Types of Input [part01-Part01_15.DifferentTypesOfInput]). Type: write a program (stdin-stdout).
   - C1: read a String and an int.
   - C2: read four types in a given order.
   - C3: read four types in a different order and print them in yet another order.
   - MOOC topics: 1.4 Summary

### 4. Calculating with numbers (`calculating`), Java Programming I

MOOC: 1.5 Calculating with numbers (`part-1/5-calculating.md`).
Browser: in-browser.

1. **Arithmetic and precedence** (covers Seconds in a day [part01-Part01_16.SecondsInADay]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: add parentheses so an expression gives the stated result.
   - C2: convert hours to minutes from input.
   - C3: convert a number of weeks to seconds.
   - MOOC topics: 1.5 intro: + - * /; 1.5 Precedence and Parentheses; 1.5 hint: Expression and Statement
2. **Calculating with input** (covers Sum of two numbers [part01-Part01_17.SumOfTwoNumbers], Sum of three numbers [part01-Part01_18.SumOfThreeNumbers]). Type: write a program (stdin-stdout).
   - C1: sum of two inputs.
   - C2: difference and product of two inputs.
   - C3: sum of three inputs with a labelled result.
   - MOOC topics: 1.5 Calculating and Printing
3. **Printing a formula** (covers Addition formula [part01-Part01_19.AdditionFormula], Multiplication formula [part01-Part01_20.MultiplicationFormula]). Type: write a program (stdin-stdout).
   - C1: fix "Total: " + a + b so it adds.
   - C2: print 'a + b = c' from input.
   - C3: print 'a * b = c' (a hidden test shows overflow is out of scope; keep values small).
   - MOOC topics: 1.5 string + number conversion, "Four: " + (2 + 2); int maximum and overflow
4. **Integer division and casting** (covers Average of two numbers [part01-Part01_21.AverageOfTwoNumbers], Average of three numbers [part01-Part01_22.AverageOfThreeNumbers]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: put the (double) cast in the right place.
   - C2: average of two integers.
   - C3: average of three integers (hidden test with a repeating decimal).
   - MOOC topics: 1.5 Division; (double) cast, 1.0 *; 1.5 hint: Calculating the average
5. **A small calculator** (covers Simple calculator [part01-Part01_23.SimpleCalculator]). Type: write a program (stdin-stdout).
   - C1: sum and difference lines.
   - C2: all four operations with a decimal quotient.
   - C3: add a line with the first number as a percentage of the second (decimal division).
   - MOOC topics: 1.5 practice: all four operations on two inputs (exercise only)
6. **Tracing assignments** (no MOOC exercise). Type: fill in the blanks (predict each printed value; checked against the real output).
   - C1: predict two values after a = b.
   - C2: predict values after a later change to b.
   - C3: predict three values in a five-line program.
   - MOOC topics: 1.5 Misunderstandings Related to the Value of a Variable (assignment copies); tracing by hand

### 5. Making decisions (`conditionals`), Java Programming I

MOOC: 1.6 (part) Conditional statements and conditional operation (`part-1/6-conditional-statements.md`, first half: if, blocks, comparisons, else, else if, order).
Browser: in-browser-with-adaptation (in-browser style check (indentation, braces, naming)).

Section 1.6 has 14 exercises spanning control-flow structure and condition building, so it is split into 'conditionals' and 'boolean-logic'. From Part01_25 on TMC grades style with Checkstyle (parts 1-2 report); the site shows its own style check as a warning everywhere and fails only the indentation step.

1. **if** (covers Speeding Ticket [part01-Part01_24.SpeedingTicket]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: fill the condition.
   - C2: print a warning above a threshold.
   - C3: two independent ifs on one input.
   - MOOC topics: 1.6 intro: if, block, no semicolon after if
2. **Blocks and indentation** (covers Check Your Indentation [part01-Part01_25.CheckYourIndentation]). Type: write a program (re-indent the seed; style check in the browser).
   - C1: re-indent a short if block.
   - C2: re-indent an if/else if/else chain.
   - C3: find and fix a missing brace that the indentation hides.
   - MOOC topics: 1.6 Code Indentation and Block Statements; 1.6 hint: Automatic Code Indentation
3. **Comparison operators** (covers Orwell [part01-Part01_26.Orwell], Ancient [part01-Part01_27.Ancient]). Type: write a program (stdin-stdout).
   - C1: exact match with ==.
   - C2: less than a year.
   - C3: not equal with != plus a second threshold.
   - MOOC topics: 1.6 Comparison Operators
4. **else** (covers Positivity [part01-Part01_28.Positivity], Adulthood [part01-Part01_29.Adulthood]). Type: write a program (stdin-stdout).
   - C1: two-way message on a sign.
   - C2: two-way message on an age limit (boundary in hidden tests).
   - C3: two-way message whose text includes the input value.
   - MOOC topics: 1.6 Else
5. **else if chains** (covers Larger Than or Equal To [part01-Part01_30.LargerThanOrEqualTo]). Type: write a program (stdin-stdout).
   - C1: three-way comparison of an input with 0.
   - C2: larger of two numbers or 'equal'.
   - C3: largest of three numbers with ties.
   - MOOC topics: 1.6 More Conditionals: else if
6. **The first true branch wins** (covers Grades and Points [part01-Part01_31.GradesAndPoints]). Type: write a program (stdin-stdout).
   - C1: fix a chain whose branches are in the wrong order.
   - C2: map a score to 4 bands.
   - C3: map a score to 8 bands including out-of-range values.
   - MOOC topics: 1.6 Order of Execution for Comparisons

### 6. Conditions and logic (`boolean-logic`), Java Programming I

MOOC: 1.6 (part) Conditional statements and conditional operation (`part-1/6-conditional-statements.md`, second half: booleans, %, equals, && || !, condition order); 1.7 (reading) Programming in our society (`part-1/7-programming-in-our-society.md`, reading only, no exercise needed).
Browser: in-browser.

Section 1.7 has no exercise; show its idea as a short end-of-part reading card after the last step. Its self-reflection survey is not carried over.

1. **Booleans in conditions** (no MOOC exercise). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: store a comparison in a boolean and print it.
   - C2: use a boolean variable as the if condition.
   - C3: two boolean variables from two inputs, then print a message for each.
   - MOOC topics: 1.6 Conditional Statement Expression and the Boolean Variable
2. **The remainder operator %** (covers Odd or even [part01-Part01_32.OddOrEven]). Type: write a program (stdin-stdout).
   - C1: print n % 3 for an input.
   - C2: even or odd.
   - C3: divisible by 7 or not, with negative inputs in hidden tests.
   - MOOC topics: 1.6 hint: Remainder
3. **Comparing strings with equals** (covers Password [part01-Part01_33.Password], Same [part01-Part01_34.Same]). Type: write a program (stdin-stdout); forbid == on strings.
   - C1: secret word check.
   - C2: are two inputs the same (hidden tests where == would fail).
   - C3: menu of three commands with an 'unknown command' fallback.
   - MOOC topics: 1.6 Conditional Statements and Comparing Strings
4. **And, or, not** (covers Checking the age [part01-Part01_35.CheckingTheAge]). Type: write a program (stdin-stdout); forbid more than one if.
   - C1: in range with && using one if.
   - C2: out of range with ||.
   - C3: negate a compound condition with !.
   - MOOC topics: 1.6 Logical Operators
5. **Most specific condition first** (covers Leap year [part01-Part01_36.LeapYear]). Type: write a program (stdin-stdout).
   - C1: FizzBuzz-style single number with the combined case first.
   - C2: leap year rules.
   - C3: a three-rule divisibility classifier where order matters.
   - MOOC topics: 1.6 Execution Order of Conditional Statements (FizzBuzz walk-through)
6. **Challenge: price brackets** (covers Gift tax [part01-Part01_37.GiftTax]). Type: write a program (stdin-stdout).
   - C1: two brackets.
   - C2: three brackets with a base amount plus a rate.
   - C3: five brackets with a 'nothing to pay' case (own invented table, not the Finnish tax table).
   - MOOC topics: 1.6 practice: else if chain over value brackets (exercise only)

### 7. Problem-solving patterns (`problem-patterns`), Java Programming I

MOOC: 2.1 Recurring problems and patterns to solve them (`part-2/1-problems-and-patterns.md`).
Browser: in-browser.

A review module that combines read, calculate and decide.

1. **Read, calculate, print** (covers Squared [part02-Part02_01.Squared]). Type: write a program (stdin-stdout).
   - C1: square of an input.
   - C2: cube of an input.
   - C3: area and perimeter of a rectangle from two inputs.
   - MOOC topics: 2.1 Reading User Input; 2.1 Calculating
2. **Math methods** (covers Square root of sum [part02-Part02_02.SquareRootOfSum]). Type: write a program (stdin-stdout).
   - C1: square root of an input.
   - C2: square root of a sum of two inputs.
   - C3: hypotenuse from two sides (Math.sqrt of a sum of squares).
   - MOOC topics: Math.sqrt
3. **Read, decide, print** (covers Absolute Value [part02-Part02_03.AbsoluteValue]). Type: write a program (stdin-stdout); forbid Math.abs in challenge 1.
   - C1: absolute value with an if.
   - C2: clamp an input to 0..100.
   - C3: sum of two inputs classified as too much / too little / ok.
   - MOOC topics: 2.1 Conditional Logic
4. **Combining the patterns** (covers Comparing Numbers [part02-Part02_04.ComparingNumbers]). Type: write a program (stdin-stdout).
   - C1: compare two inputs in a sentence.
   - C2: compare the sum of two inputs with a third.
   - C3: compare two averages.
   - MOOC topics: 2.1 practice: read, compare and print (exercise only)

### 8. Repeating with while (`loops`), Java Programming I

MOOC: 2.2 Repeating functionality (`part-2/2-repeating.md`).
Browser: in-browser.

1. **while (true) and break** (covers Carry on? [part02-Part02_05.CarryOn], Are we there yet? [part02-Part02_06.AreWeThereYet]). Type: fill in the blanks, then write a program (stdin-stdout); require while and break.
   - C1: loop until the word 'stop'.
   - C2: loop until a given number.
   - C3: echo each input until a sentinel, then print a goodbye line.
   - MOOC topics: 2.2 Loops and Infinite Loops; 2.2 Ending a Loop
2. **continue** (covers Only positives [part02-Part02_07.OnlyPositives]). Type: write a program (stdin-stdout); require continue.
   - C1: skip negative inputs with a message.
   - C2: square valid inputs, stop at 0.
   - C3: skip out-of-range inputs and double the valid ones.
   - MOOC topics: 2.2 Returning to the Start of the Loop; one clear task per if
3. **Counting in a loop** (covers Number of Numbers [part02-Part02_08.NumberOfNumbers], Number of negative numbers [part02-Part02_09.NumberOfNegativeNumbers]). Type: write a program (stdin-stdout).
   - C1: fix a counter declared inside the loop.
   - C2: count inputs before the sentinel.
   - C3: count only inputs that meet a condition.
   - MOOC topics: 2.2 Calculation with Loops (declare before the loop)
4. **Summing in a loop** (covers Sum of Numbers [part02-Part02_10.SumOfNumbers], Number and sum of numbers [part02-Part02_11.NumberAndSumOfNumbers]). Type: write a program (stdin-stdout).
   - C1: sum until 0.
   - C2: sum and count until 0.
   - C3: separate sums of positive and negative inputs.
   - MOOC topics: 2.2 Calculation with Loops (sum variable declared before the loop)
5. **Averages after the loop** (covers Average of numbers [part02-Part02_12.AverageOfNumbers], Average of positive numbers [part02-Part02_13.AverageOfPositiveNumbers]). Type: write a program (stdin-stdout).
   - C1: average of all inputs.
   - C2: average of positives with a 'no data' message.
   - C3: percentage of inputs that were positive.
   - MOOC topics: percentage example, division-by-zero guard

### 9. Loop conditions and for (`for-loops`), Java Programming I

MOOC: 2.3 More loops (`part-2/3-more-loops.md`).
Browser: in-browser.

The MSLQ research questionnaire at the top of the section is not carried over.

1. **while with a condition** (covers Counting [part02-Part02_14.Counting]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: fill the condition of a counting loop.
   - C2: print 0..n.
   - C3: print n down to 0 using a condition, not break.
   - MOOC topics: 2.3 While Loop with a Condition; i++ shorthand
2. **for loops** (covers Counting to hundred [part02-Part02_15.CountingToHundred], From where to where? (2 parts) [part02-Part02_16.FromWhereToWhere]). Type: write a program (stdin-stdout); require for.
   - C1: rewrite a while loop as a for loop.
   - C2: from an input up to a fixed end.
   - C3: print 1..n (part 1 of the two-part MOOC exercise).
   - MOOC topics: 2.3 For Loop
3. **Bounds from input** (continues From where to where? (2 parts)). Type: write a program (stdin-stdout).
   - C1: start..end from two inputs.
   - C2: nothing printed when start > end, negative bounds.
   - C3: every second number in a range.
   - MOOC topics: loop bounds from variables
4. **When the condition is checked** (no MOOC exercise). Type: fill in the blanks (predict output; checked against the real output).
   - C1: how many rounds does a loop run.
   - C2: final values of two variables after a loop.
   - C3: output of a loop that changes its counter inside the body.
   - MOOC topics: 2.3 On Stopping a Loop Execution; 2.3 hint: Simulating program execution (trace table)
5. **Repeating a calculation** (covers Sum of a sequence [part02-Part02_17.SumOfASequence], Sum of a sequence - the sequel [part02-Part02_18.SumOfASequenceTheSequel]). Type: write a program (stdin-stdout).
   - C1: multiply by repeated addition.
   - C2: sum 1..n.
   - C3: sum of a closed interval from two inputs.
   - MOOC topics: 2.3 Repeating Functionality; += shorthand
6. **Multiplying in a loop** (covers Factorial [part02-Part02_19.Factorial]). Type: write a program (stdin-stdout).
   - C1: power a^b with a loop.
   - C2: factorial with 0! = 1.
   - C3: product of the odd numbers up to n (hidden tests stay inside int).
   - MOOC topics: 2.3 practice: multiplying in a loop (exercise only)
7. **Structuring a loop program** (covers Repeating, breaking and remembering (5 parts) [part02-Part02_20.RepeatingBreakingAndRemembering]). Type: write a program (stdin-stdout), built up over the three challenges.
   - C1: read until -1, then print the sum (MOOC parts 1-2).
   - C2: add count and average (parts 3-4).
   - C3: add counts of even and odd inputs (part 5).
   - MOOC topics: 2.3 On the Structure of Programs Using Loops; 2.3 hint: Implementing a program small part at a time

### 10. Methods and parameters (`methods`), Java Programming I

MOOC: 2.4 (part) Methods and dividing the program into smaller parts (`part-2/4-methods.md`, first half: defining, calling, parameters, copies).
Browser: in-browser.

Section 2.4 has 14 exercises; it is split into 'methods' (void methods and parameters) and 'return-values' (returning, scope, call stack, composing methods).

1. **Define and call a method** (covers In a hole in the ground [part02-Part02_21.InAHoleInTheGround]). Type: fill in the blanks, then write a method (hidden harness).
   - C1: fill the call in main.
   - C2: write a void method that prints two lines.
   - C3: two methods, main calls them in a given order.
   - MOOC topics: 2.4 Custom Methods; 2.4 On Naming Methods
2. **Calling a method from a loop** (covers Reprint [part02-Part02_22.Reprint]). Type: write a program (stdin-stdout); require a method call inside a loop.
   - C1: call a method three times.
   - C2: read a count and call the method that many times.
   - C3: alternate between two methods for n rounds.
   - MOOC topics: 2.4 practice: calling a method repeatedly from a loop (exercise only)
3. **Parameters** (covers From one to parameter [part02-Part02_23.FromOneToParameter], From parameter to one [part02-Part02_24.FromParameterToOne]). Type: write a method (hidden harness captures stdout per call).
   - C1: print a greeting n times.
   - C2: print 1..n.
   - C3: print n down to 1.
   - MOOC topics: 2.4 Method Parameters
4. **Several parameters** (covers Division [part02-Part02_25.Division], Divisible by three [part02-Part02_26.DivisibleByThree]). Type: write a method (hidden harness).
   - C1: print the sum of two parameters in a sentence.
   - C2: print a decimal quotient.
   - C3: print the multiples of k in a range.
   - MOOC topics: 2.4 Multiple Parameters
5. **Parameters are copies** (no MOOC exercise). Type: fill in the blanks (predict output; checked against the real output).
   - C1: value in main after a method changes its parameter.
   - C2: same names in main and the method.
   - C3: a loop in the method that counts its parameter up.
   - MOOC topics: 2.4 Parameter Values Are Copied in a Method Call

### 11. Return values and the call stack (`return-values`), Java Programming I

MOOC: 2.4 (part) Methods and dividing the program into smaller parts (`part-2/4-methods.md`, second half: return values, local variables, call stack, methods calling methods); 2.5 (reading) End questionnaire (`part-2/5-end-questionnaire.md`, no exercise needed).
Browser: in-browser.

Section 2.5 is a self-reflection questionnaire with a two-sentence recap: no exercise needed; fold the recap into this module's closing text.

1. **Returning a value** (covers Number uno [part02-Part02_27.NumberUno], Word [part02-Part02_28.Word]). Type: write a method (hidden harness).
   - C1: return a fixed int.
   - C2: return a String (any non-empty value accepted).
   - C3: return a boolean computed from a constant comparison; fix an 'unreachable statement' error.
   - MOOC topics: 2.4 Methods Can Return Values; return ends a method; unreachable code error; return; in void
2. **Computing the return value** (covers Summation [part02-Part02_29.Summation]). Type: write a method (hidden harness); forbid println inside the method.
   - C1: return the sum of two parameters.
   - C2: return the sum of four.
   - C3: return the number of seconds in h hours, m minutes, s seconds.
   - MOOC topics: 2.4 Calculating the Return Value Inside a Method
3. **Returning from branches** (covers Smallest [part02-Part02_30.Smallest], Greatest [part02-Part02_31.Greatest]). Type: write a method (hidden harness).
   - C1: smaller of two.
   - C2: greatest of three with ties.
   - C3: sign of a number as -1, 0 or 1.
   - MOOC topics: 2.4 practice: return from several branches (exercise only)
4. **Variables inside methods** (no MOOC exercise). Type: write a program (fix compile errors; stdout).
   - C1: main uses a method's local variable: fix it by using the return value.
   - C2: main uses a method name as a variable: call it.
   - C3: store a returned value and use it twice.
   - MOOC topics: 2.4 Defining Variables Inside Methods (scope, common mistakes)
5. **Methods that call methods** (covers Averaging [part02-Part02_32.Averaging]). Type: write a method (hidden harness); require the helper call.
   - C1: average of two using a given sum method.
   - C2: average of four using sum (require the call).
   - C3: a table row printer called from a table printer.
   - MOOC topics: 2.4 Method Calling Another Method (multiplication table)
6. **The call stack** (no MOOC exercise). Type: fill in the blanks (predict output order; checked against the real output).
   - C1: order of prints when main calls one method.
   - C2: three methods calling each other.
   - C3: a returned value passed through two calls.
   - MOOC topics: 2.4 Execution of Method Calls and the Call Stack; 2.4 Call Stack and Method Parameters; 2.4 Call Stack and Returning a Value from a Method
7. **Rows of stars** (covers Star sign (4 parts) [part02-Part02_33.StarSign]). Type: write a method (hidden harness); require printStars inside the shape methods.
   - C1: printStars(n) with a line break.
   - C2: square built from printStars.
   - C3: rectangle built from printStars.
   - MOOC topics: StarSign parts 1-3: printStars, printSquare, printRectangle
8. **Triangles and a tree** (covers Advanced astrology (3 parts) [part02-Part02_34.AdvancedAstrology]; continues Star sign (4 parts)). Type: write a method (hidden harness); leading spaces significant.
   - C1: left-aligned triangle from printStars.
   - C2: printSpaces plus a right-aligned triangle.
   - C3: a tree with a trunk, from printSpaces and printStars.
   - MOOC topics: StarSign part 4: left triangle; AdvancedAstrology parts 1-3: printSpaces, right triangle, Christmas tree

### 12. Finding bugs (`debugging`), Java Programming I

MOOC: 3.1 Discovering errors (`part-3/1-discovering-errors.md`).
Browser: in-browser.

Section 3.1 has no programming exercises but is substantive, so it becomes a small module of its own. The site writes its own buggy programs; every step is 'fix the program' graded by normal and hidden corner-case tests. Debug prints go to System.err, shown in its own pane and never graded.

1. **The bug is not where you are looking** (no MOOC exercise). Type: fill in the blanks (predict the output for a given input; checked against the real output), then write a program (fix the bug; stdin-stdout).
   - C1: predict what a short loop prints for a given input.
   - C2: fix an averaging program whose loop is fine but whose final if tests the sum instead of the count (hidden test: all zeros).
   - C3: fix a max-finder whose bug is in the variable's starting value, not in the loop (hidden test: only negative numbers).
   - MOOC topics: 3.1 A Programmer Blind to Their Own Code (perceptual blindness); worked example: the final check tests the wrong variable
2. **Comments and names that explain** (no MOOC exercise). Type: write a program (stdout); require the new names and the method call.
   - C1: rename single-letter variables to descriptive names (require the names; output unchanged).
   - C2: move a commented block into a method whose name says what it does, and call it.
   - C3: generalise a fixed countdown method into one that takes start and end parameters.
   - MOOC topics: 3.1 Commenting the Source Code; self-documenting code: descriptive names, extracting a named method, a general method with parameters
3. **Print debugging** (no MOOC exercise). Type: write a program (fix the bug; stdin-stdout); debug prints go to System.err, which is shown but not graded.
   - C1: add a print of the loop variables each round (require System.err.println inside the loop) and fix a counter that is reset inside the loop.
   - C2: find why the sentinel value is counted as data.
   - C3: find a wrong comparison (< vs <=) that only shows at the boundary; the debug lines may stay, because stderr is not graded.
   - MOOC topics: 3.1 Searching for Errors with Print Debugging
4. **Testing the corner cases** (no MOOC exercise). Type: write a program (fix the bug; stdin-stdout with hidden corner-case tests).
   - C1: an average program prints 'Average: NaN' when the first input is the sentinel (verified on JDK 21, check/NaN.java); print a clear message instead.
   - C2: a range counter misses both end points.
   - C3: a program passes all visible tests but fails three hidden ones; the hints name the categories (empty input, all equal, very large values) one at a time.
   - MOOC topics: 3.1 corner cases: no valid input, zeros, very large values

### 13. Lists (`lists`), Java Programming I

MOOC: 3.2 (part) Lists (`part-3/2-lists.md`, first half: creating, add, get, indices, IndexOutOfBoundsException, size, index loops, max and index search).
Browser: in-browser.

Section 3.2 has 17 exercises; it is split into 'lists' (indices and index-based loops, 11 exercises) and 'list-methods' (for-each, remove, contains, lists in methods, 6 exercises).

1. **Creating a list, add and get** (covers Third element [part03-Part03_01.ThirdElement]). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: blanks for the import, ArrayList<String> and get(0).
   - C2: read lines until an empty line and print the second one.
   - C3: print the third line and then the first, in that order.
   - MOOC topics: 3.2 Using and Creating Lists; 3.2 Adding to a List and Retrieving a Value from a Specific Place; 3.2 hint: Importing multiple premade Java tools
2. **Lists of numbers** (covers Second plus third [part03-Part03_02.SecondPlusThird]). Type: write a program (fix a compile error, then stdin-stdout).
   - C1: fix ArrayList<int> so it compiles.
   - C2: read integers until 0 and print the product of the first two.
   - C3: read decimals into an ArrayList<Double> and print the sum of the first three.
   - MOOC topics: 3.2 Defining the Type of Values That a List Can Contain (Integer, Double, boxing)
3. **When the index does not exist** (covers IndexOutOfBoundsException [part03-Part03_03.IndexOutOfBoundsException]). Type: write a program (expected-exception test), then fix programs using the stack trace.
   - C1: change a program so it always ends with IndexOutOfBoundsException without reading input.
   - C2: read a JDK 21 error message ('Index 3 out of bounds for length 3') and fix the line it points to.
   - C3: fix a loop that uses <= size().
   - MOOC topics: 3.2 Retrieving Information from a "Non-Existent" Place; 3.2 hint: A Place in a List Is Called an Index
4. **How many items: size()** (covers List size [part03-Part03_04.ListSize]). Type: write a program (stdin-stdout); require .size().
   - C1: print the number of lines read before an empty line.
   - C2: print the size before and after adding two fixed items.
   - C3: print 'nothing read' for an empty list, otherwise the count.
   - MOOC topics: 3.2 Iterating Over a List (size)
5. **The first and the last item** (covers Last in list [part03-Part03_05.LastInList], First and last [part03-Part03_06.FirstAndLast]). Type: write a program (stdin-stdout).
   - C1: print the last line read.
   - C2: print the first and the last.
   - C3: print the second-to-last (hidden test with exactly two lines).
   - MOOC topics: 3.2 Iterating Over a List Continued (get(size() - 1))
6. **Going through a list by index** (covers Remember these numbers [part03-Part03_07.RememberTheseNumbers], Only these numbers [part03-Part03_08.OnlyTheseNumbers]). Type: write a program (stdin-stdout); require a loop.
   - C1: read numbers until -1 and print them all.
   - C2: then read a start and an end index and print only that slice, inclusive.
   - C3: print the list backwards.
   - MOOC topics: 3.2 while and for over indices, printing in reverse; 3.2 hint: Notice about the following exercises (use the list after reading)
7. **The greatest and the smallest** (covers Greatest in list [part03-Part03_09.GreatestInList]). Type: write a program (stdin-stdout).
   - C1: greatest value.
   - C2: smallest value (hidden test: all numbers negative).
   - C3: difference between the greatest and the smallest.
   - MOOC topics: min/max search pattern (start from the first element)
8. **Finding where a value is** (covers Index of [part03-Part03_10.IndexOf], Index of smallest [part03-Part03_11.IndexOfSmallest]). Type: write a program (stdin-stdout).
   - C1: print every index where a searched number occurs (nothing if absent).
   - C2: print only the first index, or 'not found'.
   - C3: print the smallest value and all its indices (hidden tests use values above 127, so == on Integer elements fails).
   - MOOC topics: 3.2 practice: index search in a list (exercise only)

### 14. For-each, list methods and lists in methods (`list-methods`), Java Programming I

MOOC: 3.2 (part) Lists (`part-3/2-lists.md`, second half: for-each, remove, contains, lists as parameters, reference semantics, summary of list methods).
Browser: in-browser.

1. **The for-each loop** (covers Sum of a list [part03-Part03_12.SumOfAList]). Type: fill in the blanks, then write a program (stdin-stdout); require for-each.
   - C1: blanks in 'for (String word : words)'.
   - C2: sum of numbers read until -1.
   - C3: count the numbers greater than 10.
   - MOOC topics: 3.2 Iterating Over a List with a For-Each Loop
2. **Averages from a list** (covers Average of a list [part03-Part03_13.AverageOfAList]). Type: write a program (stdin-stdout).
   - C1: average of the list as a double.
   - C2: average of the positive numbers only, with a message when there are none.
   - C3: how many numbers are above the average (needs a second pass, which is why the list is kept).
   - MOOC topics: 3.2 practice: sum and average with for-each (exercise only)
3. **Removing items** (no MOOC exercise). Type: fill in the blanks (predict the list after removals; checked against the real output), then write a program (stdout).
   - C1: predict the list after remove(1) on a list of words.
   - C2: remove a word by value.
   - C3: remove the number 15 from an Integer list where remove(15) would remove by index (require Integer.valueOf).
   - MOOC topics: 3.2 Removing from a List and Checking the Existence of a Value (remove by index, remove by value, remove(Integer.valueOf(x))); 2 quizzes in 3.2 (not ported)
4. **Is it on the list: contains** (covers On the list? [part03-Part03_14.OnTheList]). Type: write a program (stdin-stdout).
   - C1: found / not found for one searched word.
   - C2: read words but skip ones already on the list.
   - C3: check two searched words and print which of them were found.
   - MOOC topics: 3.2 Removing from a List and Checking the Existence of a Value (contains)
5. **A list as a parameter** (covers Print in range [part03-Part03_15.PrintInRange]). Type: write a method (hidden harness captures stdout per call).
   - C1: a void method that prints every item.
   - C2: print the numbers within [low, high].
   - C3: print the numbers below a threshold followed by a count line.
   - MOOC topics: 3.2 List as a Method Parameter
6. **Returning a value computed from a list** (covers Sum [part03-Part03_16.Sum]). Type: write a method (hidden harness).
   - C1: return the sum.
   - C2: return the average, or -1.0 for an empty list.
   - C3: return the greatest value.
   - MOOC topics: 3.2 methods returning a value (size, average returning -1.0 for an empty list)
7. **The method changes the caller's list** (covers Remove last [part03-Part03_17.RemoveLast]). Type: fill in the blanks (predict the printed lists), then write a method (hidden harness checks the list afterwards).
   - C1: predict what println(list) shows after calling a method that removes the first item twice.
   - C2: removeLast that does nothing on an empty list.
   - C3: remove every value greater than a limit (hidden test with neighbouring values to catch index skipping).
   - MOOC topics: 3.2 On Copying the List to a Method Parameter; 3.2 A Summary of List Methods; println(list) prints [a, b, c]

### 15. Arrays (`arrays`), Java Programming I

MOOC: 3.3 Arrays (`part-3/3-arrays.md`).
Browser: in-browser.

1. **Creating an array and using indices** (no MOOC exercise). Type: fill in the blanks, then write a program (stdin-stdout).
   - C1: blanks for new int[4] and two assignments.
   - C2: read an index and print that element of a given array.
   - C3: fill a String[3] from three input lines and print them in reverse order.
   - MOOC topics: 3.3 Creating an Array; 3.3 Assigning and accessing elements; 3.3 Type of the elements (String[], double[]; default values); 1 quiz in 3.3 (not ported)
2. **Swapping two elements** (covers Swap [part03-Part03_18.Swap]). Type: write a program (stdin-stdout).
   - C1: swap two fixed positions with a temporary variable.
   - C2: swap two positions read from input.
   - C3: reverse the whole array in place by swapping pairs (forbid creating a second array).
   - MOOC topics: 3.3 Assigning and accessing elements (swap with a helper variable)
3. **length and loops over an array** (covers Index was not found [part03-Part03_19.IndexWasNotFound]). Type: write a program (stdin-stdout).
   - C1: print every element with a while loop and length.
   - C2: search for a number and print its index or a not-found line.
   - C3: read how many numbers, then that many numbers into an array, and print them back.
   - MOOC topics: 3.3 Size of an array and iterating (length is not a method); ArrayIndexOutOfBoundsException; reading n numbers into an array of size n
4. **Arrays as parameters** (covers Sum of array [part03-Part03_20.SumOfArray]). Type: write a method (hidden harness).
   - C1: return the sum of an int[].
   - C2: return how many elements are greater than a parameter.
   - C3: a void method that doubles every element in place (harness checks the caller's array).
   - MOOC topics: 3.3 Array as a parameter of a method; 3.3 The shorter way to create an array ({...})
5. **Printing an array neatly** (covers Print neatly [part03-Part03_21.PrintNeatly]). Type: write a method (hidden harness captures stdout); forbid Arrays.toString.
   - C1: space-separated on one line.
   - C2: comma and space between numbers, none after the last.
   - C3: the same inside square brackets, with an empty array printing [].
   - MOOC topics: print vs println, separators without a trailing comma
6. **Rows of stars from an array** (covers Print in stars [part03-Part03_22.PrintInStars]). Type: write a method (hidden harness captures stdout).
   - C1: one row of stars per element.
   - C2: prefix each row with the number and a colon.
   - C3: a labelled bar chart from a String[] of names and an int[] of values of the same length.
   - MOOC topics: 3.3 hint: Indices and the structure of the memory (reading only)

### 16. Working with strings (`strings`), Java Programming I

MOOC: 3.4 Using strings (`part-3/4-strings.md`); 3.5 (reading) Summary (`part-3/5-increasing-amounts-of-data.md`, reading only, no exercise needed).
Browser: in-browser.

Section 3.5 is a three-sentence recap plus a survey: show the recap as a closing reading card after the last step; the survey is not carried over.

1. **Reading and joining strings** (covers Print thrice [part03-Part03_23.PrintThrice]). Type: write a program (stdin-stdout); forbid loops.
   - C1: read a word and print it three times on one line (forbid while and for).
   - C2: print the word framed by '<<' and '>>'.
   - C3: read two words and print them joined in both orders.
   - MOOC topics: 3.4 Reading and Printing Strings
2. **equals and not equals** (covers Is it true [part03-Part03_24.IsItTrue]). Type: write a program (stdin-stdout); forbid == between strings.
   - C1: a message when the input is exactly one magic word.
   - C2: the opposite test with ! (hidden test: the word with different capitalisation).
   - C3: accept either of two words, reject everything else.
   - MOOC topics: 3.4 String Comparisons And "Equals" (never ==, negation with !, null)
3. **Checking two inputs together** (covers Login [part03-Part03_25.Login]). Type: write a program (stdin-stdout).
   - C1: one hard-coded user name and password.
   - C2: two users from a small table.
   - C3: separate messages for an unknown user and a wrong password (own twist; still a toy, with a note that real logins never work like this).
   - MOOC topics: 3.4 practice: two string comparisons combined with && (exercise only)
4. **Splitting a line into pieces** (covers Line by line [part03-Part03_26.LineByLine]). Type: write a program (stdin-stdout).
   - C1: split one line on spaces and print each piece on its own line.
   - C2: repeat for every line until an empty line.
   - C3: split on commas and print how many pieces each line has.
   - MOOC topics: 3.4 Splitting a String
5. **Searching inside pieces: contains** (covers AV Club [part03-Part03_27.AVClub]). Type: write a program (stdin-stdout).
   - C1: print the words that contain a fixed two-letter string.
   - C2: print the words that do not contain it.
   - C3: print matching words prefixed with the number of the line they came from.
   - MOOC topics: String.contains (tip box)
6. **The first and the last piece** (covers First words [part03-Part03_28.FirstWords], LastWords [part03-Part03_29.LastWords]). Type: write a program (stdin-stdout).
   - C1: first word of each line.
   - C2: last word of each line (pieces.length - 1).
   - C3: join the first letters of each line's first word to reveal a hidden word (charAt).
   - MOOC topics: 3.4 info box: Secret messages (charAt)
7. **Fixed-format data** (covers Age of the oldest [part03-Part03_30.AgeOfTheOldest], Name of the oldest [part03-Part03_31.NameOfTheOldest]). Type: write a program (stdin-stdout).
   - C1: for each 'name,points' line print a labelled sentence.
   - C2: the highest points value.
   - C3: the name that goes with the highest points value.
   - MOOC topics: 3.4 Data of Fixed Format; 3.4 Using Diverse Text (Integer.valueOf on a piece)
8. **Challenge: longest name and average year** (covers Personal details [part03-Part03_32.PersonalDetails]). Type: write a program (stdin-stdout).
   - C1: the longest name (the first one wins a tie).
   - C2: the average of the year column as a double.
   - C3: both, plus the name of the youngest (hidden tests with ties and a single line).
   - MOOC topics: 3.4 hint: Length of string (length())

### 17. Classes and objects (`classes`), Java Programming I

MOOC: 4.1 (part) Introduction to object-oriented programming (`part-4/1-introduction-to-object-oriented-programming.md`, first half: classes and objects, creating classes, constructors, methods, changing state).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

Section 4.1 has 16 exercises in two groups, so it is split into 'classes' (define a class, constructor, void methods, state; 9 exercises) and 'object-methods' (return values, toString, parameters, larger classes; 7 exercises). From this module on the editor needs several files: the learner's class, a Main.java to try it, and read-only given classes.

1. **Using objects of a ready-made class** (covers Your first account [part04-Part04_01.YourFirstAccount], Your first bank transfer [part04-Part04_02.YourFirstBankTransfer]). Type: write a program with several classes (given class in a read-only tab; stdout; harness checks the given class's call log).
   - C1: create one object of a given BankAccount-style class and call one method, then print it.
   - C2: two objects and calls in a required order.
   - C3: move an amount from one object to another and print both.
   - MOOC topics: 4.1 Classes and Objects; 4.1 hint: The Relationship Between a Class and an Object; 1 quiz in 4.1 (not ported)
2. **Declaring a class and its fields** (covers Dog attributes [part04-Part04_03.DogAttributes]). Type: write a class (hidden harness checks declared fields by reflection).
   - C1: create a class in a new file with one private String field.
   - C2: three private fields of given types.
   - C3: fix a class whose fields are declared inside a method or are not private.
   - MOOC topics: 4.1 Creating Classes (own file, private instance variables, encapsulation, class diagram); 4.1 hint: Creating a New Class
3. **Constructors** (covers Room [part04-Part04_04.Room]). Type: write a class (hidden harness).
   - C1: a constructor with one parameter stored in a field.
   - C2: two parameters.
   - C3: one field from a parameter and another set to a fixed start value; the lesson shows that new Room() stops compiling once a constructor with parameters is written.
   - MOOC topics: 4.1 Defining a Constructor (this.x = parameter); 4.1 hint: Default Constructor
4. **Methods that print** (covers Whistle [part04-Part04_05.Whistle], Door [part04-Part04_06.Door], Product [part04-Part04_07.Product]). Type: write a class (hidden harness captures stdout per call).
   - C1: a no-field class whose method prints a fixed line.
   - C2: a method that prints a field given to the constructor.
   - C3: print three fields, one of them a double, in a fixed format.
   - MOOC topics: 4.1 Defining Methods For an Object; 4.1 hint: Objects and the Static Modifier
5. **Methods that change the state** (covers Decreasing counter (3 parts) [part04-Part04_08.DecreasingCounter]). Type: write a class (hidden harness).
   - C1: a method that lowers a counter by one.
   - C2: never below zero.
   - C3: add reset, and show two objects changing independently.
   - MOOC topics: 4.1 Changing an Instance Variable's Value in a Method; each object has its own instance variables
6. **State that grows: doubles** (covers Debt [part04-Part04_09.Debt]). Type: write a class (hidden harness); expected outputs computed on a real JDK.
   - C1: a savings object that grows by a rate once.
   - C2: call it in a loop from main for n years and print the result.
   - C3: add a method that grows for n years by calling the one-year method.
   - MOOC topics: 4.1 practice: double instance variables changed by methods (exercise only)

### 18. Getters, toString and bigger classes (`object-methods`), Java Programming I

MOOC: 4.1 (part) Introduction to object-oriented programming (`part-4/1-introduction-to-object-oriented-programming.md`, second half: returning values, getters, toString, parameters and this, internal calls, Statistics, PaymentCard, rounding errors).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

1. **Returning values: getters** (covers Song [part04-Part04_10.Song], Film [part04-Part04_11.Film]). Type: write a class (hidden harness), then a program that uses it (stdin-stdout).
   - C1: two getters for a String and an int field.
   - C2: a main that reads an age and uses a getter to decide what to print.
   - C3: a getter computed from a field (a length in seconds returned as whole minutes).
   - MOOC topics: 4.1 Returning a Value From a Method; 1 quiz in 4.1 (not ported)
2. **Methods with rules and boolean answers** (covers Gauge [part04-Part04_12.Gauge]). Type: write a class (hidden harness).
   - C1: a boolean method based on a field.
   - C2: increase with an upper limit and decrease with a lower limit.
   - C3: a loop in main that increases until the boolean method says full.
   - MOOC topics: isOfLegalAge example, getName
3. **toString** (covers Agent [part04-Part04_13.Agent]). Type: write a class (hidden harness checks the returned string and that nothing is printed).
   - C1: replace a print method with toString.
   - C2: toString with three fields.
   - C3: use the object inside string concatenation and println (both call toString).
   - MOOC topics: 4.1 A string representation of an object and the toString-method
4. **Parameters, setters and this** (covers Multiplier [part04-Part04_14.Multiplier]). Type: write a program (fix the bug), then write a class (hidden harness).
   - C1: fix a setter written as 'height = height'.
   - C2: setters plus a computed double method (body-mass-style formula, own numbers).
   - C3: a class that remembers a factor and applies it to its parameter.
   - MOOC topics: 4.1 Method parameters (setters); 4.1 A parameter and instance variable having the same name!
5. **Calling your own methods** (covers Statistics (4 parts) [part04-Part04_15.NumberStatistics]). Type: write a class (hidden harness).
   - C1: count added numbers.
   - C2: sum.
   - C3: average that calls sum() and count() (0 for an empty object).
   - MOOC topics: Statistics parts 1-2: count, sum, average; 4.1 Calling an internal method
6. **Using your class from main** (continues Statistics (4 parts)). Type: write a program with several classes (stdin-stdout); require 'new Statistics(' three times.
   - C1: read numbers until -1 and print the sum using one object.
   - C2: separate objects for even and odd numbers.
   - C3: also print the count and average from the first object.
   - MOOC topics: Statistics parts 3-4: sum of user input, three objects for all, even and odd
7. **Building a class in stages** (covers Payment Card (6 parts) [part04-Part04_16.PaymentCard]). Type: write a class (hidden harness), then a program with several classes (stdout).
   - C1: constructor, toString and two spending methods (MOOC parts 1-2).
   - C2: refuse spending that would go negative, cap top-ups at a maximum and ignore negative top-ups (parts 3-5).
   - C3: a main that runs a scripted sequence on two cards (part 6).
   - MOOC topics: 4.1 hint: Rounding errors

### 19. Objects in a list (`lists-of-objects`), Java Programming I

MOOC: 4.2 Objects in a list (`part-4/2-objects-in-a-list.md`).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

1. **A list of objects** (no MOOC exercise). Type: fill in the blanks, then write a program with several classes (stdout).
   - C1: blanks for ArrayList<Player> and add(new Player(...)).
   - C2: add three objects and print each with for-each (toString).
   - C3: print the count first, then the objects.
   - MOOC topics: 4.2 intro: three ways to go through a list; 4.2 Adding object to a list
2. **Objects from user input** (covers Items [part04-Part04_17.Items]). Type: write a program with several classes (given class read-only; stdin-stdout).
   - C1: read names until an empty line, create an object for each, print them.
   - C2: print how many objects were created before listing them.
   - C3: print them in reverse order.
   - MOOC topics: 4.2 Adding user-inputted objects to a list (isEmpty)
3. **Several inputs per object** (covers Personal information [part04-Part04_18.PersonalInformation]). Type: write a program with several classes (given class read-only; stdin-stdout).
   - C1: two inputs per object, stop at an empty first input.
   - C2: three inputs, print only two fields.
   - C3: one 'name,number' line per object split on the comma.
   - MOOC topics: 4.2 Multiple constructor parameters; 4.2 info box: Reading input in a specific format (split on commas)
4. **Filtering while going through the list** (covers Television programs [part04-Part04_19.TelevisionPrograms]). Type: write a program with several classes (given class read-only; stdin-stdout).
   - C1: print the objects whose value is at most a limit read after the list.
   - C2: print their count too.
   - C3: print the objects between two limits.
   - MOOC topics: 4.2 Filtered printing from the list
5. **Challenge: your own class and program** (covers Books [part04-Part04_20.Books]). Type: write a program with several classes (learner writes both files; stdin-stdout).
   - C1: write the class with a constructor and toString.
   - C2: read objects until an empty title and print them all.
   - C3: ask what to print ('all' or 'titles') and print accordingly.
   - MOOC topics: 4.2 practice: own class, input loop and list of objects (exercise only)

### 20. Reading files (`reading-files`), Java Programming I

MOOC: 4.3 Files and reading data (`part-4/3-files-and-reading-data.md`); 4.4 (reading) Summary (`part-4/4-summary.md`, reading only, no exercise needed).
Browser: in-browser-with-adaptation (in-memory files per test (read); optional own-computer project (Maven + JUnit 5, graded by GitHub Actions) as an optional first local project).

Every file step gives each test its own in-memory files (as C/C++ Arena's files: field does) and shows the data files in a file panel. Section 4.4 becomes a closing reading card; its questionnaire is not carried over.

1. **Reading until a stop word** (covers Number of Strings [part04-Part04_21.NumberOfStrings], Cubes [part04-Part04_22.Cubes]). Type: write a program (stdin-stdout).
   - C1: count lines until 'end'.
   - C2: print the cube of each number until 'end'.
   - C3: print a running total after each number and the count at the end.
   - MOOC topics: 4.3 Reading From the Keyboard
2. **Files and folders** (covers Creating a New File [part04-Part04_23.CreatingANewFile]). Type: tooling (create files in the editor's file panel; checked by running a given program).
   - C1: create hello.txt with a required first line.
   - C2: create a second file with two lines so a given program prints both.
   - C3: fix a file name so a given program stops failing with NoSuchFileException.
   - MOOC topics: 4.3 Files and the Filesystem; 4.3 info box: The Concrete File Storage Format
3. **Reading a file line by line** (covers Printing a File [part04-Part04_24.PrintingAFile], Printing a Specified File [part04-Part04_25.PrintingASpecifiedFile]). Type: write a program (file-io; files given per test).
   - C1: print every line of data.txt.
   - C2: read a file name from input and print that file.
   - C3: print each line with its line number.
   - MOOC topics: 4.3 Reading From a File (Scanner(Paths.get(...)), hasNextLine, try-with-resources)
4. **Loading lines into a list** (covers Guest List From a File [part04-Part04_26.GuestListFromAFile]). Type: write a program (file-io; files given per test; stdin-stdout).
   - C1: load the lines and print how many there are.
   - C2: load a list of allowed names, then answer yes/no for each name typed until an empty line.
   - C3: skip empty lines in the file (hidden test file has blank lines).
   - MOOC topics: 4.3 reading all lines into an ArrayList; 4.3 hint: An Empty Line In a File (isEmpty, continue)
5. **When reading fails** (covers Is it in the file? [part04-Part04_27.IsItInTheFile]). Type: write a program (file-io; one hidden test has no such file).
   - C1: print a clear message when the file does not exist.
   - C2: search a file for a word: found, not found or failed.
   - C3: count how many lines contain the word, with the same failure message.
   - MOOC topics: catch (Exception e) and e.getMessage()
6. **Numbers from a file** (covers Numbers From a File [part04-Part04_28.NumbersFromAFile]). Type: write a program (file-io; files given per test).
   - C1: sum of the numbers in a file.
   - C2: count the numbers within bounds read from input.
   - C3: the greatest and the smallest number in the file.
   - MOOC topics: 4.3 practice: numbers read from a file, Integer.valueOf per line (exercise only)
7. **Records from a file** (covers Records From a File [part04-Part04_29.RecordsFromAFile]). Type: write a program (file-io; files given per test).
   - C1: print each 'name,number' line as a sentence.
   - C2: singular or plural unit depending on the number.
   - C3: print the record with the largest number.
   - MOOC topics: 4.3 Reading Data of a Specific Format From a File
8. **A method that reads objects** (covers Storing Records [part04-Part04_30.StoringRecords]). Type: write a method (hidden harness; files given per test; given class read-only).
   - C1: return the lines of a file as an ArrayList<String>.
   - C2: return an ArrayList of objects built from CSV lines.
   - C3: skip empty and malformed lines (wrong number of fields).
   - MOOC topics: 4.3 Reading Objects From a File
9. **Challenge: match results** (covers Sport Statistics [part04-Part04_31.SportStatistics]). Type: write a program (file-io; files given per test; stdin-stdout).
   - C1: count the games a team played (home or away) in a results file (MOOC part 1).
   - C2: add wins and losses (part 2).
   - C3: add the total points the team scored (own extension).
   - MOOC topics: 4.3 practice: aggregating records read from a file (exercise only)

### 21. Designing classes and overloading (`class-design`), Java Programming I

MOOC: 5.1 Learning object-oriented programming (`part-5/1-learning-object-oriented-programming.md`); 5.2 Removing repetitive code (overloading methods and constructors) (`part-5/2-method-and-constructor-overloading.md`).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

Section 5.2 has only 2 exercises, so it is folded in as the last two steps of this module rather than a module of its own.

1. **From variables to objects** (covers One Minute [part05-Part05_01.OneMinute]). Type: write a class (given class read-only; hidden harness).
   - C1: a counter class that wraps to zero at a limit and prints two digits.
   - C2: a stopwatch made of two such counters (hundredths and seconds).
   - C3: a clock of three counters (hours, minutes, seconds).
   - MOOC topics: 5.1 intro: a clock from int variables vs ClockHand and Clock objects (abstraction, composition)
2. **Getters and toString, again** (covers Book [part05-Part05_02.Book]). Type: write a class (hidden harness).
   - C1: three getters.
   - C2: toString in a fixed format.
   - C3: a main that creates two objects and prints the one with the larger number field.
   - MOOC topics: 5.1 Object; 5.1 Class (Rectangle review)
3. **Values computed from the state** (covers Cube [part05-Part05_03.Cube], Fitbyte [part05-Part05_04.FitByte]). Type: write a class (hidden harness); expected doubles computed on a real JDK.
   - C1: a method that computes a volume from one field.
   - C2: toString that includes the computed value.
   - C3: a double formula with two constructor parameters and a percentage argument (own training-zone formula).
   - MOOC topics: 5.1 Person with doubles (BMI, maximum heart rate, Double.valueOf)
4. **Several constructors and this(...)** (covers Constructor Overload [part05-Part05_05.ConstructorOverload]). Type: write a class (hidden harness); require this( in challenge 3.
   - C1: two constructors, one with a default.
   - C2: three constructors with different defaults.
   - C3: remove the copied code so the short constructors call the full one with this(...).
   - MOOC topics: 5.2 Constructor Overloading; 5.2 Calling Your Constructor; 1 quiz in 5.2 (not ported)
5. **Overloaded methods** (covers Overloaded Counter (2 parts) [part05-Part05_06.OverloadedCounter]). Type: write a class (hidden harness).
   - C1: a counter with a no-argument and a start-value constructor (MOOC part 1).
   - C2: increase(int) and decrease(int) that ignore negative amounts (part 2).
   - C3: implement increase() and decrease() by calling the int versions (require the call).
   - MOOC topics: 5.2 Method Overloading; 1 quiz in 5.2 (not ported)

### 22. Primitive and reference variables (`references`), Java Programming I

MOOC: 5.3 Primitive and reference variables (`part-5/3-primitive-and-reference-variables.md`); 5.4 (part) Objects and references (`part-5/4-objects-and-references.md`, first sections: assigning a reference, null, NullPointerException).
Browser: in-browser.

Section 5.3 has no exercises but is substantive, so it becomes a small module, joined by the first two headings of 5.4 and its NullPointerException exercise. Predict-the-output steps are checked against the real output, and the default Type@hash output is masked because the hash changes between runs.

1. **Values and references** (no MOOC exercise). Type: fill in the blanks (predict the output; checked against the real output).
   - C1: predict three int variables after one of them changes.
   - C2: predict what printing an object without toString shows, then add toString.
   - C3: choose a fitting primitive type for four values (a letter, a yes/no, a very large count, a measurement).
   - MOOC topics: 5.3 intro: Name@4aa298b7 vs toString; 5.3 Primitive Variables (the eight types, assignment copies); 5.4 intro: what new does
2. **Two variables, one object** (no MOOC exercise). Type: fill in the blanks (predict), then write a program (fix the bug; stdout).
   - C1: predict the output after changing an object through a second variable.
   - C2: fix a program that meant to keep a copy but only copied the reference (create a new object).
   - C3: predict the output after one variable is pointed at a new object.
   - MOOC topics: 5.4 Assigning a reference type variable copies the reference; 5.3 Reference Variables
3. **Objects passed to methods** (no MOOC exercise). Type: fill in the blanks (predict), then write a method (hidden harness).
   - C1: predict the output when a method changes an int parameter and an object's field.
   - C2: write a static method that changes an object's state through its setter.
   - C3: predict why assigning a new object to the parameter inside the method does not change the caller's variable.
   - MOOC topics: 5.3 Primitive and Reference Variable as Method Parameters; 2 quizzes in 5.3 (not ported)
4. **null and NullPointerException** (covers NullPointerException [part05-Part05_07.NullPointerException]). Type: write a program (expected-exception test), then fix programs using the error message.
   - C1: make a program end with NullPointerException right at the start.
   - C2: read a JDK 21 message ('Cannot invoke ... because "x" is null') and fix the line.
   - C3: guard a method call with a null check so the program prints a fallback line.
   - MOOC topics: 5.4 null value of a reference variable (printing null, garbage collection)

### 23. Objects working together (`object-interaction`), Java Programming I

MOOC: 5.4 (part) Objects and references (`part-5/4-objects-and-references.md`, from 'Object as a method parameter' to the end); 5.5 (reading) Conclusion (`part-5/5-conclusion.md`, reading only, no exercise needed).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

Section 5.5 is a recap plus a questionnaire: show the recap as a closing reading card; the questionnaire is not carried over.

1. **Objects as parameters** (covers Health station (3 parts) [part05-Part05_09.HealthStation]). Type: write a class (given class read-only; hidden harness).
   - C1: a method that returns a value read from the parameter object.
   - C2: a method that changes the parameter object.
   - C3: count how many times the method was used in a field.
   - MOOC topics: 5.4 Object as a method parameter (a ride that checks a Person); 5.4 hint: Assisted creation of constructors, getters, and setters (IDE)
2. **Cards and terminals** (covers Card payments (4 sections) [part05-Part05_10.CardPayments]). Type: write a class (two classes edited; hidden harness).
   - C1: a 'dumb' card whose takeMoney returns false and changes nothing when the balance is too low (MOOC part 1).
   - C2: a terminal that sells two items for cash and returns the change (part 2).
   - C3: card payments and card top-ups through the terminal (parts 3-4).
   - MOOC topics: 5.4 practice: one object calling methods of another object passed as a parameter (exercise only)
3. **An object inside an object** (covers Biggest pet shop [part05-Part05_08.BiggestPetShop]). Type: write a class (given class read-only; hidden harness).
   - C1: toString that includes the inner object's toString.
   - C2: a second constructor that builds the inner object from three ints.
   - C3: a method that answers a question by asking the inner object (delegation).
   - MOOC topics: 5.4 Object as object variable (SimpleDate birthday); 5.4 hint: Date in Java programs (LocalDate)
4. **Comparing with another object of the same type** (covers Comparing apartments (3 parts) [part05-Part05_11.ComparingApartments]). Type: write a class (hidden harness).
   - C1: largerThan(other) on one field.
   - C2: the absolute difference of a computed value.
   - C3: a before(other) comparison over three fields (year, month, day).
   - MOOC topics: 5.4 Object of same type as method parameter (olderThan, before; private fields of the other object)
5. **equals** (covers Song [part05-Part05_12.Song], Identical twins [part05-Part05_13.IdenticalTwins]). Type: fill in the blanks (predict default equals), then write a class (hidden harness).
   - C1: predict what the inherited equals says for two objects with the same fields.
   - C2: write equals(Object) for a class with a String and an int field (hidden test compares with a String object).
   - C3: equals for a class whose field is another object (the inner class needs its own equals).
   - MOOC topics: 5.4 Comparing the equality of objects (equals); 5.4 hint: What is Object?
6. **equals and lists** (covers Books [part05-Part05_14.Books], Archive (2 parts) [part05-Part05_15.Archive]). Type: write a program with several classes (stdin-stdout).
   - C1: show that contains finds an equal object once equals exists.
   - C2: skip duplicates while reading objects.
   - C3: treat two objects as equal by one id field only and keep the first one entered.
   - MOOC topics: 5.4 Object equality and lists (contains uses equals)
7. **Returning a new object** (covers Dating app (3 parts) [part05-Part05_16.DatingApp]). Type: write a class (hidden harness checks that the original is unchanged).
   - C1: advance a date by one day with 30-day months.
   - C2: advance by n days by calling the one-day method.
   - C3: return a new date n days later and leave the original unchanged.
   - MOOC topics: 5.4 Object as a method's return value (clone, factory)
8. **Immutable objects** (covers Money (3 parts) [part05-Part05_17.Money]). Type: write a class (hidden harness).
   - C1: plus returns a new object (integer cents, no doubles).
   - C2: lessThan.
   - C3: minus that never goes below zero; forbid assignments to the fields outside the constructor.
   - MOOC topics: final fields

### 24. Lists inside objects (`objects-with-lists`), Java Programming I

MOOC: 6.1 Objects on a list and a list as part of an object (`part-6/1-objects-within-objects.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

One module for section 6.1 (8 exercises, one idea: an object that owns a list). Harness-graded classes; multi-class steps need the single-file or multi-file approach. Part06_07 HeightOrder is counted in step 7 (step 6 previews its shortest() method).

1. **A list as an instance variable** (covers Menu (3 parts) [part06-Part06_01.Menu]). Type: fill-in-the-blanks, then class (hidden harness).
   - C1: fill in the field declaration and the new ArrayList in the constructor of a Playlist-like class.
   - C2: add() that ignores duplicates.
   - C3: print() and reset() on a guest list.
   - MOOC topics: 6.1 intro: a list as an instance variable (Playlist example)
2. **Adding and taking from the end** (covers Stack (2 parts) [part06-Part06_02.Stack]). Type: class (hidden harness).
   - C1: isEmpty and add on an undo history.
   - C2: take() returns and removes the newest entry.
   - C3: peek() without removing and a size limit that drops the oldest.
   - MOOC topics: 6.1 intro: adding to and taking from the end of an instance list, isEmpty
3. **A list of your own objects** (covers MessagingService [part06-Part06_03.MessagingService]). Type: class (hidden harness, helper class in the harness).
   - C1: a Playlist of Song objects with add and getSongs.
   - C2: reject songs longer than a limit.
   - C3: count songs by one artist.
   - MOOC topics: 6.1 Objects in an Instance Variable List
4. **toString that describes the contents** (covers Printing a Collection [part06-Part06_04.PrintingACollection]). Type: method (hidden harness).
   - C1: empty vs non-empty text for a shelf of books.
   - C2: correct singular/plural.
   - C3: numbered lines and a total line.
   - MOOC topics: 6.1 Printing an Object from a List (toString over the list)
5. **Summing over objects in a list** (covers Santa's Workshop (2 parts) [part06-Part06_05.SantasWorkshop]). Type: class (hidden harness, two classes).
   - C1: an Ingredient class with name and grams.
   - C2: a Recipe totalGrams().
   - C3: averageGrams() returning -1 when empty.
   - MOOC topics: 6.1 Clearing an Object's List; 6.1 Calculating a Sum from Objects on a List
6. **Finding the longest, shortest, tallest** (covers Longest in collection [part06-Part06_06.LongestInCollection]; continues Height Order (3 parts)). Type: method / class (hidden harness).
   - C1: longest word or null.
   - C2: cheapest product object, list unchanged.
   - C3: ties: return the first one found.
   - MOOC topics: 6.1 Retrieving a Specific Object from a List
7. **Taking the smallest out** (covers Height Order (3 parts) [part06-Part06_07.HeightOrder]). Type: class (hidden harness).
   - C1: take() removes and returns the smallest.
   - C2: repeated take() prints ascending order.
   - C3: takeLargest() and a queue that serves the shortest job first.
   - MOOC topics: 6.1 Retrieving a Specific Object from a List (find, then remove the found object)
8. **Limits and the heaviest item** (covers Cargo hold (7 parts) [part06-Part06_08.CargoHold]). Type: class (hidden harness, two classes).
   - C1: Item and a Backpack that refuses items over its weight limit.
   - C2: toString with 'no items'/'1 item'/'n items'.
   - C3: heaviest() returning null when empty; only two fields allowed.
   - MOOC topics: 6.1 an object whose list is limited by a total (weight limit)
9. **Objects that hold objects that hold lists** (continues Cargo hold (7 parts)). Type: class (hidden harness, three classes).
   - C1: a Truck of Backpacks with a total limit.
   - C2: toString of the truck.
   - C3: printAll() walks two levels of lists.
   - MOOC topics: 6.1 objects that hold objects that hold lists (nested aggregation)

### 25. Separating the UI from program logic (`text-ui`), Java Programming I

MOOC: 6.2 Separating the user interface from program logic (`part-6/2-separating-user-interface-from-program-logic.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 6.2 (4 exercises). The reading-only section 6.4 (separation of concerns, single responsibility) is the closing step of 'unit-testing', because the MOOC places it after 6.3.

1. **A UserInterface class with a Scanner** (covers Simple Dictionary (4 parts) [part06-Part06_09.SimpleDictionary]). Type: program (stdin/stdout; site-provided main).
   - C1: a start() loop that stops on 'quit' and prints 'Unknown command' otherwise.
   - C2: count the commands entered.
   - C3: case-insensitive commands.
   - MOOC topics: 6.2 Looping and quitting; 6.2 Storing relevant information
2. **Commands that call a logic object** (continues Simple Dictionary (4 parts)). Type: program (stdin/stdout, logic class given).
   - C1: an 'add' command that asks two follow-up lines.
   - C2: a 'find' command.
   - C3: a friendly message when find returns null.
   - MOOC topics: 6.2 Combining the solutions to sub-problems; 6.2 Objects as a natural part of problem solving; 6.2 Word set
3. **The logic class first** (covers To do list (2 parts) [part06-Part06_10.TodoList]). Type: class (hidden harness).
   - C1: a numbered shopping list print (index + 1).
   - C2: remove by the shown number.
   - C3: renumbering after removals.
   - MOOC topics: 6.2 Earlier solution as part of implementation; 6.2 Changing the implementation of a class
4. **Wiring UI to logic** (continues To do list (2 parts)). Type: program (stdin/stdout, two classes).
   - C1: add/list/stop commands.
   - C2: remove by number.
   - C3: reject a number that does not exist.
   - MOOC topics: 6.2 Implementing new functionality: palindromes; 6.2 Programming tips
5. **From one big main to logic plus UI** (covers Averages (3 parts) [part06-Part06_11.Averages]). Type: class (hidden harness).
   - C1: move grade conversion into a Register class.
   - C2: averageOfGrades returning -1 when empty.
   - C3: keep raw points too and average them.
   - MOOC topics: 6.2 From one entity to many parts; 6.2 Program logic
6. **Extending output without touching logic** (continues Averages (3 parts)). Type: program (stdin/stdout, two classes).
   - C1: print a star histogram from the register.
   - C2: add the two averages to the report.
   - C3: print the best score only when there is one.
   - MOOC topics: 6.2 User interface
7. **Refactoring a main-only program** (covers Joke Manager (2 parts) [part06-Part06_12.JokeManager]). Type: program (stdin/stdout, two classes, seeded Random).
   - C1: move storage of quotes into a QuoteBook class.
   - C2: random draw that returns a fallback text when empty (graded by property).
   - C3: a menu UI that uses QuoteBook only through its methods.
   - MOOC topics: refactoring a main-only program into a logic class and a UI class

### 26. Troubleshooting and unit testing (`unit-testing`), Java Programming I

MOOC: 6.3 Introduction to testing (`part-6/3-introduction-to-testing.md`); 6.4 (reading) Complex programs (`part-6/4-complex-programs.md`, reading only, no exercise needed).
Browser: in-browser-with-adaptation (JUnit-style test runner in the browser with mutation grading; optional own-computer project (Maven + JUnit 5, graded by GitHub Actions)).

Small but substantive module for section 6.3 (1 exercise). Needs a browser test runner for learner-written tests; offer an optional local Maven + JUnit project graded by GitHub Actions. Steps 1-2 overlap with 'debugging' (3.1): here they use multi-class programs and stack traces that cross several classes, so they are not repeats. Section 6.4 (reading only: separation of concerns, the single responsibility principle) closes this module and part 6 as step 6, a refactoring step that was previously the last step of 'text-ui' (moved by the completeness critic to keep MOOC order 6.2, 6.3, 6.4).

1. **Reading a stack trace** (no MOOC exercise). Type: program (fix the bug, stdin/stdout).
   - C1: find the line from an IndexOutOfBoundsException trace and fix it.
   - C2: fix a NullPointerException from an uninitialised list field.
   - C3: fix a NumberFormatException by validating input.
   - MOOC topics: 6.3 Error Situations and Step-By-Step Problem Resolving; 6.3 Stack Trace
2. **A troubleshooting routine** (no MOOC exercise). Type: program (fix the bug, stdin/stdout).
   - C1: add debug prints to locate a wrong total, then remove them.
   - C2: an off-by-one loop.
   - C3: a wrong comparison with == on strings.
   - MOOC topics: 6.3 Checklist for Troubleshooting
3. **Feeding test input to a Scanner** (no MOOC exercise). Type: program (stdout).
   - C1: build new Scanner("...\n...") and run a read loop on it.
   - C2: check the loop stops at the right line.
   - C3: run the same UI class with two different input strings.
   - MOOC topics: 6.3 Passing Test Input to Scanner
4. **Your first unit tests** (covers Exercises (2 parts) [part06-Part06_13.Exercises]). Type: junit-writing (learner tests run against a reference and buggy variants).
   - C1: assertEquals for a new Counter's start value.
   - C2: tests that catch a copy-paste bug in subtract.
   - C3: enough tests to catch three hidden mutants.
   - MOOC topics: 6.3 Unit Testing (JUnit, assertEquals)
5. **Test-driven development** (continues Exercises (2 parts)). Type: junit-writing + class (tests first, then implementation).
   - C1: write a failing test for a TaskManager list, then make it pass.
   - C2: add and mark-done with tests first.
   - C3: refactor to a Task class while all tests stay green.
   - MOOC topics: 6.3 Test-Driven Development
6. **One responsibility per class** (no MOOC exercise). Type: reading + refactoring challenges (stdin/stdout).
   - C1: identify which lines are UI and which are logic in a given program.
   - C2: split a word-set program (palindrome counter) into WordSet + UI.
   - C3: add a feature by changing only the logic class.
   - Note: Lesson text from 6.4: separation of concerns and the single responsibility principle.
   - MOOC topics: 6.4 Complex programs (reading only): the separation of concerns, the single responsibility principle

### 27. Procedural and object-oriented programs (`paradigms`), Java Programming I

MOOC: 7.1 Programming paradigms (`part-7/1-programming-paradigms.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 7.1 has 2 exercises but is conceptual (paradigms), so it stays a small module of 4 steps.

1. **State in variables: a command loop** (covers Liquid containers (3 parts) [part07-Part07_01.LiquidContainers]). Type: program (stdin/stdout; forbid extra methods).
   - C1: parse 'deposit 20' with split and Integer.valueOf and print the balance.
   - C2: cap the value at a maximum.
   - C3: ignore negative amounts.
   - MOOC topics: 7.1 intro: what a programming paradigm is; 7.1 Procedural programming
2. **Several commands and limits** (continues Liquid containers (3 parts)). Type: program (stdin/stdout).
   - C1: move an amount between two tanks, limited by what is available.
   - C2: limited by the target's space.
   - C3: a status line after every command.
   - MOOC topics: 7.1 Procedural programming (state in variables, commands with arguments)
3. **Objects hold the state** (covers Liquid Containers 2.0 (2 parts) [part07-Part07_02.LiquidContainers2]). Type: class (hidden harness).
   - C1: a Tank class with add/remove/contains and clamping.
   - C2: toString 'n/max'.
   - C3: a clock made of Hand objects (the MOOC's procedural vs object comparison, own version).
   - MOOC topics: 7.1 Object-Oriented Programming
4. **The same UI, now with objects** (continues Liquid Containers 2.0 (2 parts)). Type: program (stdin/stdout, two classes).
   - C1: rewrite the command loop using two Tank objects.
   - C2: add a new command without touching Tank.
   - C3: compare the two versions: which lines disappeared from main.
   - MOOC topics: 7.1 Object-Oriented Programming (the same program with state in objects)

### 28. Sorting and searching (`sorting-searching`), Java Programming I

MOOC: 7.2 Algorithms (`part-7/2-algorithms.md`).
Browser: in-browser.

Section 7.2. Replace TMC's wall-clock timing test with counted element accesses.

1. **Smallest value and its index** (covers Sorting (5 parts) [part07-Part07_03.Sorting]). Type: method (hidden harness).
   - C1: smallest in an int array.
   - C2: index of the smallest.
   - C3: index of the smallest from a start index.
   - Note: Lesson text covers static vs instance methods.
   - MOOC topics: 7.2 Sorting information; 7.2 finding the smallest value and its index
2. **Swapping two elements** (continues Sorting (5 parts)). Type: method (hidden harness).
   - C1: swap two indices.
   - C2: print with Arrays.toString after swapping.
   - C3: reverse an array using only swap.
   - MOOC topics: 7.2 Sorting information (swapping two elements, Arrays.toString)
3. **Selection sort** (continues Sorting (5 parts)). Type: method + stdout (forbid Arrays.sort).
   - C1: sort using the helper methods.
   - C2: print the array after each round.
   - C3: sort in descending order.
   - MOOC topics: 7.2 Selection sort
4. **Java's built-in sorting** (covers Ready-made Sorting Algorithms [part07-Part07_04.ReadymadeSortingAlgorithms]). Type: method (require Arrays.sort / Collections.sort).
   - C1: sort an int array.
   - C2: sort a String array and an ArrayList<Integer>.
   - C3: sort a list of strings and return the first and last.
   - MOOC topics: 7.2 Built-in sorting algorithms in Java (Arrays.sort, Collections.sort)
5. **Linear search** (covers Searching [part07-Part07_05.Searching]). Type: method (hidden harness).
   - C1: index of a value in an int array or -1.
   - C2: search objects by an id field.
   - C3: return the last match instead of the first.
   - MOOC topics: 7.2 Information retrieval; 7.2 Linear search
6. **Binary search** (continues Searching). Type: method (harness counts list accesses).
   - C1: binary search on a sorted int array.
   - C2: on a sorted list of objects by id, at most about log2(n) get() calls.
   - C3: find the insertion point for a missing value.
   - MOOC topics: 7.2 Binary search (aka half-interval search or logarithmic search); 7.2 pseudocode: the MOOC gives binary search as pseudocode and defines the term

### 29. Larger programs (`larger-programs`), Java Programming I

MOOC: 7.3 Larger programming exercises (`part-7/3-larger-exercises.md`); 7.4 Conclusion (`part-7/4-introduction-to-programming.md`).
Browser: in-browser-with-adaptation (in-memory files per test (read); multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 7.3; the conclusion 7.4 (quiz, end of Java Programming I) becomes the module's closing text. These three exercises could also be offered as Projects with milestones.

1. **Sentinel input and statistics** (covers Grade statistics (4 parts) [part07-Part07_06.GradeStatistics]). Type: program (stdin/stdout).
   - C1: read scores until -1 and ignore invalid ones, print the average.
   - C2: average of passing scores with '-' when none.
   - C3: pass percentage.
   - MOOC topics: 7.3 Larger programming exercises (no lesson text; specification-driven programs)
2. **A histogram report** (continues Grade statistics (4 parts)). Type: program (stdin/stdout).
   - C1: map scores to grades.
   - C2: print one star per result per grade, top grade first.
   - C3: split the program into a statistics class and a UI class.
   - MOOC topics: 7.3 printing a report from collected data
3. **Loading records from a file** (covers Recipe search (4 parts) [part07-Part07_07.RecipeSearch]). Type: file-io (in-memory files per test, file name read from stdin).
   - C1: read a file of blocks separated by blank lines.
   - C2: build one object per block.
   - C3: list them with a formatted line each.
   - MOOC topics: 7.3 reading records from a file and answering commands
4. **Search commands over loaded data** (continues Recipe search (4 parts)). Type: file-io + stdin/stdout.
   - C1: find by name substring.
   - C2: find by maximum time.
   - C3: find by exact ingredient.
   - MOOC topics: 7.3 search commands over loaded data
5. **Design your own classes** (covers Big year (3 parts) [part07-Part07_08.BigYear]). Type: program (stdin/stdout, learner-designed classes).
   - C1: add and list records in insertion order.
   - C2: count observations and reject unknown names.
   - C3: show one record and handle bad commands.
   - Note: Closing text: Java Programming I checkpoint (7.4).
   - MOOC topics: 7.3 free-design exercise: only the main program is specified; 7.4 Conclusion (closing text: end of Java Programming I)

### 30. Warm-up: recap of parts 1 to 7 (`recap`), Java Programming II

MOOC: 8.1 Short recap (`part-8/1-recap.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

All five exercises repeat earlier ones (part04_22, part02_13, part07_01, part07_02, part06_10). The site should write fresh tasks for the same skills and let placement or a skip button bypass the module. Java Programming II starts here. The MOOC assumes Java Programming I (parts 1-7) knowledge; all five exercises repeat Part I tasks, so the site writes fresh tasks and lets placement or a skip button bypass the module.

1. **Reading until a word, converting numbers** (covers Cubes [part08-Part08_01.Cubes]). Type: program (stdin/stdout).
   - C1: print the square of each number until 'stop'.
   - C2: skip blank lines.
   - C3: print a running total too.
   - MOOC topics: 8.1 Short recap: reading input until a stop word, converting numbers (repeats part 4)
2. **Averages with conditions** (covers Average of positive numbers [part08-Part08_02.AverageOfPositiveNumbers]). Type: program (stdin/stdout).
   - C1: average of even numbers until 0.
   - C2: message when there are none.
   - C3: average of numbers in a range.
   - MOOC topics: 8.1 Short recap: conditions inside a loop and averages (repeats part 2)
3. **Commands with arguments and state** (covers Liquid containers (3 parts) [part08-Part08_03.LiquidContainers]). Type: program (stdin/stdout).
   - C1: 'in n'/'out n' on a parking counter with a capacity.
   - C2: status after each command.
   - C3: transfer between two lots.
   - MOOC topics: 8.1 Short recap: a command loop with state in variables (repeats part 7.1)
4. **Pulling state into a class** (covers Liquid Containers 2.0 (2 parts) [part08-Part08_04.LiquidContainers2]). Type: class + program (two classes).
   - C1: a Lot class with clamping.
   - C2: the same command loop using two Lot objects.
   - C3: toString and a new command.
   - MOOC topics: 8.1 Short recap: the same program with state in an object (repeats part 7.1)
5. **A logic class with a text UI** (covers To do list (2 parts) [part08-Part08_05.TodoList]). Type: program (stdin/stdout, two classes).
   - C1: a numbered reading list class.
   - C2: a UI with add/list/remove/stop.
   - C3: mark items done instead of removing them.
   - MOOC topics: 8.1 Short recap: separating logic and text UI (repeats part 6.2)

### 31. Hash maps (`hash-maps`), Java Programming II

MOOC: 8.2 Hash Map (`part-8/2-hash-map.md`).
Browser: in-browser.

Section 8.2 (5 exercises). Printing tasks that depend on HashMap order are graded order-insensitively. The grouping exercises of 8.4 are in the module 'grouping', after 'equals-hashcode' (8.3), as in the MOOC.

1. **put and get** (covers Nicknames [part08-Part08_06.Nicknames]). Type: fill-in-the-blanks, then program (stdout).
   - C1: fill in HashMap creation, put and get for three city codes.
   - C2: predict the output when a key is put twice and when a key is missing (null).
   - C3: map values that are objects.
   - MOOC topics: 8.2 intro: creating a HashMap, put, get, null for a missing key; 8.2 Hash Map Keys Correspond to a Single Value at Most; 8.2 A Reference Type Variable as a Hash Map Value
2. **A map inside a class** (covers Abbreviations [part08-Part08_07.Abbreviations]). Type: class (hidden harness).
   - C1: a Glossary with add/has/explain (containsKey, null when missing).
   - C2: normalise keys with toLowerCase and trim.
   - C3: remove with a message when missing.
   - Note: Lesson text: list scan vs map lookup.
   - MOOC topics: 8.2 When Should Hash Maps Be Used?; 8.2 Hash Map as an Instance Variable
3. **Going through the keys** (covers Print me my hash map [part08-Part08_08.PrintMeMyHashmap]). Type: method (output compared as a set of lines).
   - C1: print all keys.
   - C2: keys containing a substring.
   - C3: values whose keys match.
   - MOOC topics: 8.2 Going Through A Hash Map's Keys
4. **Going through the values** (covers Print me another hash map [part08-Part08_09.PrintMeAnotherHashmap]). Type: method (output compared as a set of lines).
   - C1: print every value object.
   - C2: only values whose name field contains text.
   - C3: count values meeting a condition.
   - MOOC topics: 8.2 Going Through A Hash map's Values
5. **Numbers as values: getOrDefault and counting** (covers I owe you [part08-Part08_10.IOweYou]). Type: class (hidden harness).
   - C1: a Balance book returning 0 for unknown names.
   - C2: count word occurrences.
   - C3: explain and fix the null-unboxing crash.
   - MOOC topics: 8.2 Primitive Variables In Hash Maps (wrapper types, getOrDefault)

### 32. Comparing objects: equals and hashCode (`equals-hashcode`), Java Programming II

MOOC: 8.3 Similarity of objects (`part-8/3-similarity-of-objects.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 8.3. The NetBeans 'Insert Code' generator is replaced by a step that shows the standard recipe in plain text. Part08_13 VehicleRegistry is counted in its last step (step 2 uses its equals part as a warm-up).

1. **Writing equals** (covers Same date [part08-Part08_11.SameDate]). Type: method (hidden harness).
   - C1: predict == vs equals output for two objects.
   - C2: equals(Object) for a Point with instanceof and a cast.
   - C3: equals returns false for other types and null.
   - MOOC topics: 8.3 Method to Test For Equality - "equals"
2. **equals makes contains work** (continues Vehicle Registry (3 parts)). Type: method (hidden harness).
   - C1: list.contains on your own class before and after equals.
   - C2: equals for a two-field code (country + number).
   - C3: avoid adding duplicates to a list.
   - MOOC topics: 8.3 ArrayList contains uses equals (why list elements must be reference types)
3. **hashCode and hash maps** (covers Hash for date [part08-Part08_12.HashedDate]). Type: method (property test on spread and consistency).
   - C1: hashCode delegating to a String field.
   - C2: combine two fields; equal objects must share a hash.
   - C3: at most N objects per hash over a range of dates.
   - MOOC topics: 8.3 Approximate Comparison With HashMap (hashCode)
4. **The standard recipe** (no MOOC exercise). Type: method (hidden harness).
   - C1: write equals/hashCode with java.util.Objects.equals and Objects.hash.
   - C2: null-safe fields.
   - C3: use the class as a HashMap key.
   - MOOC topics: 8.3 generating equals and hashCode (the NetBeans generator, replaced by a written recipe)
5. **A registry keyed by your own class** (covers Vehicle Registry (3 parts) [part08-Part08_13.VehicleRegistry]). Type: class (hidden harness, two classes).
   - C1: add/get/remove with an object key.
   - C2: print all keys.
   - C3: print unique owners once each.
   - MOOC topics: 8.3 objects as HashMap keys (equals and hashCode together)

### 33. Grouping data with hash maps (`grouping`), Java Programming II

MOOC: 8.4 Grouping data using hash maps (`part-8/4-grouping-data-using-hash-maps.md`); 8.5 (reading) Fast data fetching and grouping information (`part-8/5-fast-data-fetching-and-grouping-information.md`, reading only, no exercise needed).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 8.4 (2 exercises) plus the part 8 summary 8.5 (a short recap and a survey; no exercise). Split out of 'hash-maps' by the completeness critic so that the MOOC order 8.2, 8.3, 8.4 is kept. Steps 3 and 4 are site-only; step 4 reuses equals/hashCode from 8.3 for grouping keys. Step 4 has two learner classes, hence the multi-class adaptation.

1. **A list per key: grouping** (covers Dictionary of many translations [part08Part08_14.DictionaryOfManyTranslations]). Type: class (hidden harness).
   - C1: HashMap<String, ArrayList<String>> with putIfAbsent.
   - C2: return an empty list for unknown keys.
   - C3: remove a whole key.
   - MOOC topics: 8.4 intro: a list as a hash map value (HashMap<String, ArrayList<String>>, putIfAbsent)
2. **Grouping with removals** (covers Storage facility (2 parts) [part08-Part08_15.StorageFacility]). Type: class (hidden harness, set comparison).
   - C1: add items to named shelves.
   - C2: remove one occurrence only.
   - C3: drop shelves that become empty and list the rest.
   - MOOC topics: 8.4 categorizing data with a hash map (TaskTracker example), removing from a group
3. **Grouping objects by a field** (no MOOC exercise). Type: class (hidden harness, set comparison).
   - C1: group a list of Student objects into a HashMap<String, ArrayList<Student>> by study programme.
   - C2: return the size of each group as a HashMap<String, Integer>.
   - C3: return the name of the largest group, and an empty result for an empty input list.
   - MOOC topics: 8.4 learning objective: categorize data using a hash map (site-only practice)
4. **Groups keyed by your own class** (no MOOC exercise). Type: class (hidden harness, two classes).
   - C1: group Delivery objects by a given Postcode class that already has equals and hashCode.
   - C2: write equals and hashCode for a Coordinate key so that equal coordinates land in the same group.
   - C3: find and fix a grouping that splits one group in two because the key class has equals but no hashCode.
   - Note: Closing text: 8.5 summary (lookups by key are fast; one key can group many values).
   - MOOC topics: 8.3 equals and hashCode applied to grouping keys (site-only link between 8.3 and 8.4); 8.5 Fast data fetching and grouping information (closing text)

### 34. Inheritance and abstract classes (`inheritance`), Java Programming II

MOOC: 9.1 Class inheritance (`part-9/1-inheritance.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 9.1 (4 exercises, some with 5 to 7 parts). All exercises have several classes: single-file with package-private classes or a multi-file editor.

1. **extends** (covers ABC (2 parts) [part09-Part09_01.ABC]). Type: class (hidden harness).
   - C1: three classes with one method each.
   - C2: make them a chain with extends.
   - C3: call inherited methods through the lowest subclass.
   - MOOC topics: 9.1 intro: superclass, subclass, extends; every class inherits Object
2. **Calling super(...)** (covers Person and subclasses (5 parts) [part09-Part09_02.PersonAndSubclasses]). Type: class (hidden harness).
   - C1: an Employee base class with name and toString.
   - C2: a Manager subclass calling super(name).
   - C3: this(...) chaining between constructors.
   - MOOC topics: 9.1 Access modifiers private, protected, and public; 9.1 Calling the constructor of the superclass
3. **Overriding and super.method()** (continues Person and subclasses (5 parts)). Type: class (hidden harness).
   - C1: override toString in a subclass.
   - C2: reuse super.toString() and add a line.
   - C3: a second subclass with its own extra field.
   - MOOC topics: 9.1 Calling a superclass method
4. **The actual type decides** (continues Person and subclasses (5 parts)). Type: method + stdout.
   - C1: print a mixed ArrayList<Base>.
   - C2: predict which toString runs for different variable types.
   - C3: protected helper overridden in a 3D point.
   - MOOC topics: 9.1 The actual type of an object dictates which method is executed
5. **Extending a class you did not write** (covers Warehousing (7 parts) [part09-Part09_03.Warehousing]). Type: class (hidden harness, given base class).
   - C1: a NamedTank extends a given Tank.
   - C2: override toString using super.toString().
   - C3: a setter for the new field.
   - MOOC topics: 9.1 When is inheritance worth using?
6. **Composition: a helper object inside** (continues Warehousing (7 parts)). Type: class (hidden harness).
   - C1: a History class wrapping ArrayList<Double> with max/min/average (0 when empty).
   - C2: use it as a field, not a superclass.
   - C3: refactor a given 'Order extends Customer' into an Order that holds a Customer field (composition); the harness checks the behaviour is unchanged; the lesson text explains why an order is not a customer
   - MOOC topics: 9.1 Example of misusing inheritance (prefer composition)
7. **Overriding to add behaviour** (continues Warehousing (7 parts)). Type: class (hidden harness).
   - C1: override add() to call super and record history.
   - C2: override take().
   - C3: a printed analysis report.
   - MOOC topics: 9.1 When is inheritance worth using? (extending behaviour with super calls)
8. **Abstract classes** (covers DifferentKindsOfBoxes (3 parts) [part09-Part09_04.DifferentKindsOfBoxes]). Type: class (hidden harness).
   - C1: an abstract Shape with an abstract area().
   - C2: two concrete subclasses.
   - C3: an abstract base with one concrete method that calls the abstract one (like add(list) calling add(item)).
   - MOOC topics: 9.1 Abstract classes

### 35. Interfaces (`interfaces`), Java Programming II

MOOC: 9.2 Interfaces (`part-9/2-interfaces.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 9.2 (6 exercises). OnlineShop (8 parts) is spread over the last three steps.

1. **Declaring and implementing an interface** (covers TacoBoxes (2 parts) [part09-Part09_05.TacoBoxes]). Type: class (hidden harness).
   - C1: implement a given Counter interface.
   - C2: a second implementation with a constructor parameter.
   - C3: never below zero.
   - MOOC topics: 9.2 intro: declaring an interface and implementing it (Readable example)
2. **An interface as a type** (covers Interface In A Box (4 parts) [part09-Part09_06.InterfaceInABox]). Type: class (hidden harness).
   - C1: two classes implementing Weighable with toString.
   - C2: an ArrayList<Weighable> of mixed objects.
   - C3: casting back and when it fails.
   - MOOC topics: 9.2 Interface as Variable Type
3. **An interface as a parameter** (continues Interface In A Box (4 parts)). Type: class (hidden harness).
   - C1: a Crate that accepts any Weighable under a limit.
   - C2: weight() computed from contents, no stored total.
   - C3: a Printer method that accepts any Readable.
   - MOOC topics: 9.2 Interfaces as Method Parameters
4. **A container that is also the interface** (continues Interface In A Box (4 parts)). Type: class (hidden harness).
   - C1: make Crate implement Weighable.
   - C2: crates inside crates.
   - C3: what happens when a crate contains itself (StackOverflowError) and how to prevent it.
   - MOOC topics: 9.2 Interfaces as Method Parameters (InterfaceInABox part 4: a box can contain boxes; weight() calls itself through the interface, and a box put in itself overflows the stack: the MOOC's only recursion, unnamed)
5. **An interface as a return type** (no MOOC exercise). Type: class (hidden harness, seeded Random).
   - C1: a Factory returning Weighable objects.
   - C2: a Packer that fills a crate from the factory.
   - C3: add a new class without changing Packer.
   - MOOC topics: 9.2 Interface as a return type of a method
6. **List, Map and Set as parameter types** (covers List as a method parameter [part09-Part09_07.ListAsAMethodParameter], Map as a method parameter [part09-Part09_08.MapAsAMethodParameter], Set as  method parameter [part09-Part09_09.SetAsMethodParameter]). Type: method (hidden harness).
   - C1: a method taking List<String>.
   - C2: a method taking Map<String,Integer>.
   - C3: a method taking Set<String>, called with a HashSet and a keySet().
   - MOOC topics: 9.2 Built-in Interfaces; 9.2 The List Interface; 9.2 The Map Interface; 9.2 The Set Interface
7. **Programming against Map and Set** (covers Online shop (8 parts) [part09-Part09_10.OnlineShop]). Type: class (hidden harness; require Map-typed fields).
   - C1: a Stockroom with price lookup and a sentinel for unknown items.
   - C2: stock and take().
   - C3: products() returning a Set.
   - MOOC topics: 9.2 The Collection Interface
8. **A cart of objects** (continues Online shop (8 parts)). Type: class (hidden harness, two classes).
   - C1: a LineItem with quantity and price.
   - C2: a Cart total using values().
   - C3: one line item per product (increase quantity).
   - MOOC topics: 9.2 The Collection Interface (a cart of item objects)
9. **The store UI** (continues Online shop (8 parts)). Type: program (stdin/stdout, several classes, set comparison for listings).
   - C1: a shop loop that adds to the cart only when in stock.
   - C2: print the cart and total at checkout.
   - C3: two customers in a row share the stockroom.
   - MOOC topics: 9.2 text UI over the shop classes (OnlineShop final parts)

### 36. Polymorphism (`polymorphism`), Java Programming II

MOOC: 9.3 Object polymorphism (`part-9/3-object-polymorphism.md`); 9.4 Summary (`part-9/4-conclusion.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 9.3 has 2 exercises but is a core concept, so it is a small module; 9.4 summary quiz is closing text.

1. **Many types for one object** (no MOOC exercise). Type: method + stdout.
   - C1: a method taking Object that prints anything n times.
   - C2: a method taking CharSequence called with String and StringBuilder.
   - C3: which assignments compile (predict).
   - MOOC topics: 9.3 intro: inheritance hierarchy; an object can be represented through all of its actual types
2. **Implementing a movement interface** (covers Herds (2 points) [part09-Part09_11.Herds]). Type: class (hidden harness).
   - C1: a Drone implementing a given Movable with x/y and toString.
   - C2: move(dx, dy).
   - C3: several drones moved through a Movable variable.
   - MOOC topics: 9.3 an interface as the common type of different classes
3. **A group that behaves like one member** (continues Herds (2 points)). Type: class (hidden harness).
   - C1: a Fleet implementing Movable that holds Movables.
   - C2: moving the fleet moves all members.
   - C3: fleets inside fleets.
   - MOOC topics: 9.3 a group that implements the same interface as its members
4. **Abstract class plus interface** (covers Animals (4 parts) [part09-Part09_12.Animals]). Type: class (hidden harness).
   - C1: an abstract Vehicle with a name and two concrete methods.
   - C2: subclasses with a default-name constructor.
   - C3: a Honkable interface implemented by some subclasses, used through the interface and cast back.
   - MOOC topics: 9.3 abstract class plus interface; 9.4 Summary (closing text)

### 37. Streams and lambdas (`streams`), Java Programming II

MOOC: 10.1 Handling collections as streams (`part-10/1-handling-collections-as-streams.md`).
Browser: in-browser-with-adaptation (in-memory files per test (read); multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 10.1 (10 exercises, one theme). Steps require stream/lambda use and some forbid loops.

1. **From a list to a stream: mapToInt and average** (covers Average of Numbers [part10-Part10_01.AverageOfNumbers]). Type: program (stdin/stdout; require stream).
   - C1: fill in stream().mapToInt(...).average().
   - C2: average of read numbers after 'end'.
   - C3: count values divisible by a number.
   - MOOC topics: 10.1 intro: stream(), mapToInt, average
2. **filter with a lambda** (covers Average of selected numbers [part10-Part10_02.AverageOfSelectedNumbers]). Type: program (stdin/stdout).
   - C1: average of negatives or positives chosen by a letter.
   - C2: count long words.
   - C3: explain why a lambda cannot change a local counter.
   - MOOC topics: 10.1 Lambda Expressions
3. **collect into a new list** (covers Positive Numbers [part10-Part10_03.PositiveNumbers], Divisible [part10-Part10_04.Divisible]). Type: method (hidden harness).
   - C1: Collectors.toList().
   - C2: Collectors.toCollection(ArrayList::new) with a multi-condition filter.
   - C3: the original list must stay unchanged.
   - MOOC topics: 10.1 Stream Methods; 10.1 Terminal Operations (collect)
4. **forEach and printing** (covers Printing User Input [part10-Part10_05.PrintingUserInput], Limited numbers [part10-Part10_06.LimitedNumbers]). Type: program (stdin/stdout).
   - C1: print all read lines with forEach.
   - C2: print only values in a range.
   - C3: method reference System.out::println.
   - MOOC topics: 10.1 Terminal Operations (forEach)
5. **reduce** (no MOOC exercise). Type: method (hidden harness).
   - C1: sum with reduce.
   - C2: join strings with a separator.
   - C3: the largest value with reduce.
   - MOOC topics: 10.1 Terminal Operations (reduce)
6. **map, distinct, sorted** (covers Unique last names [part10-Part10_07.UniqueLastNames]). Type: program (stdin/stdout).
   - C1: unique first names in alphabetical order.
   - C2: names starting with a letter.
   - C3: lengths of unique words, sorted.
   - MOOC topics: 10.1 Intermediate Operations (filter, map, distinct, sorted)
7. **Streams over objects** (covers Weighting (2 parts) [part10-Part10_08.Weighting]). Type: class (hidden harness; forbid for/while).
   - C1: total weight of items with mapToInt().sum().
   - C2: heaviest with a stream.
   - C3: rewrite a nested-list class with no loops.
   - MOOC topics: 10.1 Objects and Stream
8. **Reading a file as a stream of lines** (covers Reading Files Per Line [part10-Part10_09.ReadingFilesPerLine]). Type: file-io (in-memory files per test).
   - C1: Files.lines(Paths.get(name)) into a List.
   - C2: skip empty lines.
   - C3: print an error message when the file is missing.
   - MOOC topics: 10.1 Files and Streams (Files.lines)
9. **Parsing lines into objects** (covers Books from file [part10-Part10_10.BooksFromFile]). Type: file-io (in-memory files per test).
   - C1: split CSV lines and build objects.
   - C2: filter out malformed lines.
   - C3: compute a statistic from the loaded objects.
   - MOOC topics: 10.1 Files and Streams (parsing lines into objects)

### 38. Ordering objects: Comparable and Comparator (`sorting-objects`), Java Programming II

MOOC: 10.2 The Comparable Interface (`part-10/2-interface-comparable.md`).
Browser: in-browser-with-adaptation (in-memory files per test (read)).

Section 10.2 (4 exercises).

1. **Comparable and compareTo** (covers Wage order [part10-Part10_11.WageOrder]). Type: method (hidden harness).
   - C1: ascending by one int field.
   - C2: descending.
   - C3: sort with Collections.sort and with stream sorted().
   - MOOC topics: 10.2 intro: the Comparable interface, compareTo, Collections.sort
2. **Delegating to String.compareTo** (covers Students on alphabetical order [part10-Part10_12.StudentsOnAlphabeticalOrder]). Type: method (hidden harness).
   - C1: alphabetical by name.
   - C2: ignore case.
   - C3: a class implementing two interfaces (an id interface and Comparable).
   - MOOC topics: 10.2 compareTo of String inside your own compareTo
3. **Sorting with a lambda: data from a file** (covers Literacy comparison (2 parts) [part10-Part10_13.LiteracyComparison]). Type: file-io (in-memory CSV).
   - C1: sort objects with a lambda comparator.
   - C2: parse a CSV with trim and sort by a double column.
   - C3: print the lowest five in a fixed format.
   - MOOC topics: 10.2 Sorting Method as a Lambda Expression
4. **Comparator.comparing and thenComparing** (covers Literature (3 parts) [part10-Part10_14.Literature]). Type: program (stdin/stdout).
   - C1: read records until an empty line and print a count.
   - C2: sort by one key with Comparator.comparing.
   - C3: break ties with thenComparing.
   - MOOC topics: 10.2 Sorting By Multiple Criteria (Comparator.comparing, thenComparing)

### 39. StringBuilder, regular expressions, enums and iterators (`useful-techniques`), Java Programming II

MOOC: 10.3 Other useful techniques (`part-10/3-other-useful-techniques.md`); 10.4 Summary (`part-10/4-summary.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 10.3 (3 exercises but several distinct tools, so 8 steps); 10.4 is a quiz used as closing text. SortThemCards is split over two steps.

1. **Building strings with StringBuilder** (no MOOC exercise). Type: method (require StringBuilder, forbid += on String in a loop).
   - C1: append numbers 1..n.
   - C2: one line per element.
   - C3: a comma-separated list without a trailing comma.
   - MOOC topics: 10.3 StringBuilder
2. **Regular expressions: matches and alternation** (covers Regular expressions (3 parts) [part10-Part10_15.RegularExpressions]). Type: method (hidden harness; require matches).
   - C1: accept one of a fixed set of words.
   - C2: parentheses for optional endings.
   - C3: student-number-style format.
   - MOOC topics: 10.3 Regular Expressions; 10.3 Alternation (Vertical Line); 10.3 Affecting Part of a String (Parentheses)
3. **Quantifiers and character classes** (continues Regular expressions (3 parts)). Type: method (hidden harness).
   - C1: a string of only certain letters.
   - C2: a 24-hour time hh:mm.
   - C3: a code like two letters, a dash and 3 to 5 digits.
   - MOOC topics: 10.3 Quantifiers; 10.3 Character Classes (Square Brackets)
4. **Enums** (covers Enum and Iterator (4 parts) [part10-Part10_16.EnumAndIterator]). Type: class (hidden harness).
   - C1: an enum of sizes used in a class field.
   - C2: compare enums with ==.
   - C3: filter a list by enum value.
   - MOOC topics: 10.3 Enumerated Type - Enum
5. **Enums with fields and ordinal** (no MOOC exercise). Type: class (hidden harness).
   - C1: an enum with a constructor and a code field.
   - C2: ordinal() for ordering.
   - C3: values() to print all constants.
   - MOOC topics: 10.3 Object References In Enums
6. **Iterators and safe removal** (continues Enum and Iterator (4 parts)). Type: class (hidden harness; require iterator()).
   - C1: print with an Iterator.
   - C2: remove matching elements with iterator.remove().
   - C3: predict the ConcurrentModificationException and fix it.
   - MOOC topics: 10.3 Iterator
7. **Ordering with an enum tiebreak** (covers Sort them cards! (6 parts) [part10-Part10_17.SortThemCards]). Type: class (hidden harness, several classes).
   - C1: Comparable by value, then enum ordinal.
   - C2: a Hand that sorts its cards.
   - C3: Comparable<Hand> by the sum of values.
   - MOOC topics: 10.3 sorting objects with an enum field (SortThemCards)
8. **Comparator classes** (continues Sort them cards! (6 parts)). Type: class (hidden harness).
   - C1: a Comparator class sorting by one key.
   - C2: by suit then value.
   - C3: the same as a lambda passed to Collections.sort.
   - Note: Closing text: 10.4 summary.
   - MOOC topics: 10.3 Comparator classes (SortThemCards last parts); 10.4 Summary (closing text)

### 40. Class diagrams (`class-diagrams`), Java Programming II

MOOC: 11.1 Class diagrams (`part-11/1-class-diagrams.md`).
Browser: in-browser-with-adaptation (multi-file editor (required: one public class per file, given classes as read-only tabs)).

One module for 11.1 (7 exercises, one idea: turn a UML class diagram into code). The site draws its own diagrams (for example SVG generated from a yUML-like text notation); the MOOC images are course material under CC BY-NC-SA 4.0. Multi-class steps need one file with package-private classes or the multi-file editor. Parts 11-14 use packages in nearly every exercise; the multi-file editor must be in place before Java Programming II's part 11.

1. **Reading a class box** (covers Customer [part11-Part11_01.Customer]). Type: fill-in-the-blanks, then class (hidden harness plus require rules for private fields).
   - C1: fill in the field declarations for a box like [Song|-title:String;-artist:String;-seconds:int].
   - C2: write a Thermostat class with four attributes of mixed types and a constructor that sets them.
   - C3: a box with a public constant and private fields; forbid public non-final fields.
   - MOOC topics: 11.1 Describing class and class attributes
2. **Constructors and methods in a diagram** (covers Book and plane [part11-Part11_02.ABookAndAPlane]). Type: class (hidden harness, two classes in one file).
   - C1: turn +Rectangle(w:double, h:double) and +area():double into code.
   - C2: two unrelated classes (Recipe, Oven) from two boxes.
   - C3: a box with two constructors and a method returning String.
   - MOOC topics: 11.1 Describing class constructor; 11.1 Describing class methods
3. **Arrows: one class knows another** (covers Show and ticket [part11-Part11_03.ShowAndTicket]). Type: class (hidden harness, two classes).
   - C1: an Order that knows its Customer (arrow from Order to Customer).
   - C2: the arrow's label names the field.
   - C3: decide which class gets the field for three given arrows (choice), then implement one.
   - MOOC topics: 11.1 Connections between classes
4. **Stars and two-way connections** (covers StudentAndUniversity [part11-Part11_04.StudentAndUniversity]). Type: class (hidden harness, two classes).
   - C1: a star: a Playlist holds many Songs in an ArrayList with add().
   - C2: no arrowheads: a Team knows its Players and each Player knows its Team, kept consistent by addPlayer.
   - C3: many-to-many Courses and Students with enrol().
   - MOOC topics: 11.1 Connections between classes (multiplicity, two-way connections)
5. **Inheritance and abstract classes in diagrams** (covers The Player And the Bot [part11-Part11_05.ThePlayerAndTheBot]). Type: class (hidden harness).
   - C1: a Vehicle and a Bicycle subclass from a triangle arrow.
   - C2: the subclass overrides describe() and adds ringBell().
   - C3: an <<abstract>> Shape with an abstract area() and two subclasses.
   - MOOC topics: 11.1 Describing inheritance
6. **Interfaces in diagrams** (covers Saveable person [part11-Part11_06.SaveablePerson]). Type: class (hidden harness).
   - C1: write a Printable interface from its box.
   - C2: an Invoice class that implements it (dashed arrow).
   - C3: one class that implements two interfaces from a diagram.
   - MOOC topics: 11.1 Describing interfaces
7. **A bigger diagram, and drawing one yourself** (covers Bigger class diagram [part11-Part11_07.BiggerClassDiagram]). Type: class (hidden harness, multi-file editor recommended); C3 program (stdout).
   - C1: an inheritance chain with an interface at each level.
   - C2: add a dependency on an interface and a many-to-many pair.
   - C3: reverse direction: given three short classes, print their diagram in the site's text notation (exact stdout).
   - MOOC topics: 11.1 a larger diagram; drawing diagrams (the MOOC mentions yUML)

### 41. Packages and imports (`packages`), Java Programming II

MOOC: 11.2 Packages (`part-11/2-packages.md`).
Browser: in-browser-with-adaptation (multi-file editor with package folders (required: one file cannot hold two package declarations)).

Section 11.2 (3 exercises). Needs the multi-file editor with package folders. javac compiles files that declare different packages from one flat folder, as long as each public class is in its own file (checked, JDK 21); one file cannot hold two package declarations. Exercise order differs from the MOOC on purpose: the one-line TheThreePackages (Part11_09) is step 1 and FirstPackages (Part11_08, 3 parts with an interface) follows, because it is the simpler first contact with package declarations.

1. **The package line and import** (covers Three packages [part11-Part11_09.TheThreePackages]). Type: fill-in-the-blanks (multi-file), then class (hidden harness imports the classes).
   - C1: fill in the package and import lines so a Main in the default package can use shop.model.Item.
   - C2: create three classes in three packages that the harness imports.
   - C3: a nested package (games.cards) used once through import and once by its fully qualified name.
   - MOOC topics: 11.2 intro: package declaration and import
2. **An interface and its implementation in a package** (covers First packages (3 parts) [part11-Part11_08.FirstPackages]). Type: class (hidden harness, multi-file).
   - C1: an interface Display with void refresh() in app.ui.
   - C2: a ConsoleDisplay in the same package that prints a fixed line.
   - C3: a second implementation that counts how often it was refreshed.
   - MOOC topics: 11.2 intro: an interface and its implementation in a package
3. **Logic in another package** (continues First packages (3 parts)). Type: program (stdout; site-provided Main, then learner Main).
   - C1: a Worker in app.logic that takes a Display in its constructor.
   - C2: run(n) prints a line and calls refresh() n times.
   - C3: the learner writes Main that wires two displays to two workers.
   - MOOC topics: 11.2 intro: using classes from another package
4. **Package-private access and folders** (no MOOC exercise). Type: compiles drills, then class (hidden harness in the same package).
   - C1: predict whether calling a package-private method from another package compiles.
   - C2: make a helper visible to its own package only (harness in that package calls it; a source rule forbids public).
   - C3: fix a program only by changing access modifiers.
   - MOOC topics: 11.2 Directory structure in a file system; 11.2 Packages and access modifiers
5. **Domain classes and application logic** (covers FlightControl (2 parts) [part11-Part11_10.FlightControl]). Type: class (hidden harness, multi-file).
   - C1: domain classes Train (id, seats) and Route (train, from, to) in rail.domain.
   - C2: a RailControl logic class keeping trains in a HashMap and routes in a list.
   - C3: find a train by id and list the routes of one train.
   - MOOC topics: 11.2 A larger example: flight control; 11.2 Classes that represent concepts of the problem domain; 11.2 Application logic
6. **A text UI in its own package** (continues FlightControl (2 parts)). Type: program (stdin/stdout, hidden tests; one Scanner).
   - C1: a first menu loop that adds trains until 'x'.
   - C2: a second menu that prints trains and routes.
   - C3: the full two-phase program with hidden tests; the task states that only one Scanner may be created.
   - MOOC topics: 11.2 Text user interface

### 42. Exceptions (`exceptions`), Java Programming II

MOOC: 11.3 Exceptions (`part-11/3-exceptions.md`).
Browser: in-browser-with-adaptation (in-memory files per test (read); multi-file editor (required: one public class per file, given classes as read-only tabs)).

Section 11.3 (2 exercises, substantive). Two site-only steps teach try/catch, throws and try-with-resources, which the MOOC teaches without a dedicated exercise.

1. **try and catch** (no MOOC exercise). Type: fill-in-the-blanks, then program (stdin/stdout).
   - C1: fill in try/catch around Integer.valueOf so bad input prints an error line.
   - C2: keep asking until a valid number arrives, then print its square.
   - C3: read lines until 'end', sum the valid numbers and count the invalid ones.
   - MOOC topics: 11.3 intro: what an exception is; 11.3 Handling exceptions
2. **Checked exceptions, throws and try-with-resources** (no MOOC exercise). Type: method (hidden harness, in-memory files).
   - C1: fill in throws Exception so a file-reading method compiles.
   - C2: read all lines of a file with try-with-resources and return an empty list when it is missing.
   - C3: a method that throws and a caller that catches and prints getMessage().
   - MOOC topics: 11.3 Exceptions and resources; 11.3 Shifting the responsibility
3. **Throwing IllegalArgumentException from a constructor** (covers Validating parameters (2 parts) [part11-Part11_11.ValidatingParameters]). Type: class (hidden harness checks the exception type).
   - C1: a Temperature class that rejects values below absolute zero.
   - C2: a Username class: not null, not empty, at most 20 characters.
   - C3: a Booking class with several rules and a clear message for each.
   - MOOC topics: 11.3 Throwing exceptions
4. **Validating method parameters** (continues Validating parameters (2 parts)). Type: class (hidden harness).
   - C1: power(base, exp) rejects a negative exponent.
   - C2: choose(n, k) rejects negatives and k greater than n.
   - C3: average(int[]) rejects null and empty arrays; a caller catches and prints the message.
   - MOOC topics: 11.3 Throwing exceptions (validating method parameters)
5. **IllegalStateException in interface implementations** (covers Sensors and temperature (4 parts) [part11-Part11_12.SensorsAndTemperature]). Type: class (hidden harness, several classes).
   - C1: an implementation of a Meter interface that is always on.
   - C2: a Meter that throws IllegalStateException when read while off.
   - C3: a random-reading meter; the harness passes a seeded Random and checks the range.
   - MOOC topics: 11.3 Exceptions and Interfaces
6. **Objects that combine other objects** (continues Sensors and temperature (4 parts)). Type: class (hidden harness).
   - C1: a MeterGroup that averages its meters with integer division.
   - C2: throw IllegalStateException when the group is empty or a meter is off.
   - C3: turnOn() turns on every meter.
   - MOOC topics: 11.3 Exceptions and Interfaces (objects that combine other objects)
7. **Exception details: getMessage and stack traces** (continues Sensors and temperature (4 parts)). Type: class (hidden harness) plus predict drills.
   - C1: catch an exception and print getMessage().
   - C2: keep a history list of every successful reading.
   - C3: read a printed stack trace from the bottom up and pick the method and line that threw (choice drill).
   - MOOC topics: 11.3 Details of the exception

### 43. Writing files (`writing-files`), Java Programming II

MOOC: 11.4 Processing files (`part-11/4-processing-files.md`); 11.5 Conclusion (`part-11/5-conclusion.md`).
Browser: in-browser-with-adaptation (writable in-memory file system that the harness reads back after the run).

Section 11.4 (1 exercise in 4 parts) plus the part 11 conclusion (a survey; no exercise needed). Needs a virtual file system that the program writes and the harness reads afterwards.

1. **Writing a file with PrintWriter** (no MOOC exercise). Type: fill-in-the-blanks, then program (in-memory files).
   - C1: fill in new PrintWriter, println and close.
   - C2: write the numbers 1 to 10 to a file, read it back and print the sum.
   - C3: copy only the non-empty lines of input.txt to output.txt.
   - MOOC topics: 11.4 intro: refresh reading files; writing with PrintWriter
2. **Overwrite or append** (no MOOC exercise). Type: program (in-memory files; the harness inspects the file).
   - C1: append a line to log.txt with FileWriter(name, true).
   - C2: write twice and show one copy (overwrite) vs two (append).
   - C3: write a header only when the file does not exist yet.
   - MOOC topics: site-only: FileWriter append mode (the 11.4 exercise text mentions an 'append method described in the material', but the section text shows no append example)
3. **A two-way lookup** (covers Saveable Dictionary (4 parts) [part11-Part11_13.SaveableDictionary]). Type: class (hidden harness).
   - C1: a CodeBook with add(code, meaning) and lookup in both directions.
   - C2: the first mapping wins; later duplicates are ignored.
   - C3: remove(x) deletes the pair whichever side is given.
   - MOOC topics: 11.4 SaveableDictionary: a two-way lookup
4. **Loading from a file** (continues Saveable Dictionary (4 parts)). Type: class (hidden harness, in-memory files).
   - C1: load key=value lines (the site's own separator) into the lookup.
   - C2: return false when the file is missing instead of crashing.
   - C3: skip blank or malformed lines and report how many pairs were loaded.
   - MOOC topics: 11.4 SaveableDictionary: loading from a file
5. **Saving and the round trip** (continues Saveable Dictionary (4 parts)). Type: class (hidden harness reads the saved file).
   - C1: save() writes each pair once.
   - C2: save() replaces the old content.
   - C3: load, change, save, load again: the harness checks nothing was lost or duplicated.
   - MOOC topics: 11.4 SaveableDictionary: saving and the round trip; 11.5 Conclusion (closing text; the survey is not carried over)

### 44. Type parameters (generics) (`generics`), Java Programming II

MOOC: 12.1 Type parameters (`part-12/1-type-parameters.md`).
Browser: in-browser.

Section 12.1 (2 exercises). Three site-only steps cover reading generic types, Pair and generic interfaces, which the lesson teaches with examples only.

1. **Reading type parameters: List<String>, Map<K, V>** (no MOOC exercise). Type: fill-in-the-blanks and compiles drills.
   - C1: fill in the type arguments for a list of scores and a map from names to ages.
   - C2: predict which line fails to compile (adding a String to a List<Integer>).
   - C3: a method that takes a List<Integer> and returns its largest value.
   - MOOC topics: 12.1 intro: generic type parameters in existing classes (ArrayList, HashMap)
2. **Your own generic class** (covers Hideout [part12-Part12_01.Hideout]). Type: fill-in-the-blanks, then class (hidden harness uses it with String and Integer).
   - C1: fill in <T> in a one-slot Box class.
   - C2: put replaces; take returns the value and empties the box, null when empty.
   - C3: count how many times a stored value was replaced.
   - MOOC topics: 12.1 defining a generic class (one type parameter)
3. **A generic class built on ArrayList** (covers Pipe [part12-Part12_02.Pipe]). Type: class (hidden harness).
   - C1: a generic Queue that adds at the back and removes the oldest.
   - C2: remove returns null when empty; hasItems().
   - C3: peek() and size(), then sum an Integer queue.
   - MOOC topics: 12.1 a generic class that uses ArrayList inside
4. **Two type parameters** (no MOOC exercise). Type: class (hidden harness).
   - C1: a Pair<A, B> with getters.
   - C2: swapped() returns a Pair<B, A>.
   - C3: a list of pairs and a method that finds the second value for a given first value.
   - MOOC topics: 12.1 two type parameters (the lesson's Pair<T, K> example)
5. **Generic interfaces** (no MOOC exercise). Type: class (hidden harness).
   - C1: implement a Container<String> with a fixed type argument.
   - C2: a generic ListContainer<T> implements Container<T> backed by ArrayList.
   - C3: a method that works on any Container<T> through the interface only.
   - MOOC topics: 12.1 generic interfaces (the lesson's List<T> interface with MovieList and GeneralList<T>)

### 45. Building your own list and hash map (`list-and-map-internals`), Java Programming II

MOOC: 12.2 ArrayList and hash table (`part-12/2-arraylist-and-hashtable.md`).
Browser: in-browser-with-adaptation (multi-class code (Phase 1: one file with package-private classes; Phase 2: multi-file editor with read-only given classes)).

Section 12.2 (3 exercises; List and HashMap each span several steps). The MOOC exercises have no real tests, so the site writes its own harnesses. Name the classes differently from java.util.List and java.util.HashMap (for example SimpleList, SimpleMap). Classed as adapted (was in-browser): Part12_05 HashMap needs two learner classes (the map and a Pair class; 'two classes; one file works' per mooc-parts-11-14.md), which every other module treats as the multi-class adaptation.

1. **Arrays recap: index ranges and bounds** (covers Sum these for me [part12-Part12_03.SumTheseForMe]). Type: method (hidden harness).
   - C1: sum the elements between two indexes.
   - C2: clamp indexes that fall outside the array.
   - C3: add only values within [low, high] and handle from greater than to.
   - MOOC topics: 12.2 A brief recap of arrays
2. **A growable list: add and grow** (covers List (2 parts) [part12-Part12_04.List]). Type: fill-in-the-blanks, then class (hidden harness).
   - C1: fill in (T[]) new Object[10] and add().
   - C2: grow by half when full, copying the elements.
   - C3: capacity() reports the array length after n adds (the harness checks the growth rule).
   - MOOC topics: 12.2 Lists; 12.2 Creating a new list; 12.2 Adding values to the list; 12.2 Adding values to a list part 2
3. **Finding and removing** (continues List (2 parts)). Type: class (hidden harness).
   - C1: indexOf using equals.
   - C2: remove shifts later elements left.
   - C3: contains built on indexOf; removing a missing value changes nothing.
   - MOOC topics: 12.2 Checking the existence of a value; 12.2 Removing a value
4. **Index access and size** (continues List (2 parts)). Type: class (hidden harness).
   - C1: get(i) and size().
   - C2: throw IndexOutOfBoundsException for bad indexes.
   - C3: toString in [a, b, c] form.
   - MOOC topics: 12.2 Searching from an index; 12.2 Size of the List
5. **Key-value pairs and buckets** (covers Hash map (3 parts) [part12-Part12_05.HashMap]). Type: class (hidden harness).
   - C1: a Pair<K, V> with setValue.
   - C2: the bucket index with Math.abs(hash % n) or Math.floorMod, tested with a key whose hashCode is Integer.MIN_VALUE.
   - C3: get(key) walks one bucket.
   - MOOC topics: 12.2 Hash map; 12.2 Key-value pair; 12.2 Creating a hash map; 12.2 Retrieving a value
6. **Putting: insert or replace** (continues Hash map (3 parts)). Type: class (hidden harness).
   - C1: put a new key.
   - C2: putting an existing key replaces its value.
   - C3: size() counts keys, not calls to put.
   - MOOC topics: 12.2 Adding to hash map
7. **Growing the table and removing** (continues Hash map (3 parts)). Type: class (hidden harness).
   - C1: remove(key) returns the old value or null.
   - C2: double the table and rehash when size divided by buckets exceeds 0.75.
   - C3: after 1,000 puts every key is still found and buckets stay short (the harness inspects bucket lengths).
   - MOOC topics: 12.2 Adding to hash table, part 2; 12.2 Remove
8. **How fast is a lookup?** (no MOOC exercise). Type: method (hidden harness counts equals() calls).
   - C1: count comparisons for contains on the list.
   - C2: count comparisons for get on the map.
   - C3: print both counts for growing sizes and compare them (no wall-clock timing).
   - MOOC topics: 12.2 On search performance

### 46. Random numbers (`randomness`), Java Programming II

MOOC: 12.3 Randomness (`part-12/3-randomness.md`).
Browser: in-browser.

Section 12.3 (3 exercises). Output is random, so grading uses property checks or a Random that the harness seeds. Seeded sequences differ between runtimes (see Browser issues), so expected outputs are generated with the site runtime.

1. **Random numbers with nextInt** (covers Numbers [part12-Part12_06.Numbers]). Type: program (stdin/stdout; property-checked).
   - C1: print five numbers from 0 to 9.
   - C2: read a count and print that many dice values from 1 to 6.
   - C3: print a random code of n uppercase letters (length and range checked).
   - MOOC topics: 12.3 intro: the Random class, nextInt
2. **Shifting ranges** (covers Die [part12-Part12_07.Die]). Type: class (hidden harness: range and distribution).
   - C1: a Spinner with n sectors returns 1..n.
   - C2: a RangeRandom between min and max inclusive.
   - C3: a thermometer simulator between -40 and 45 (range and coverage checked).
   - MOOC topics: 12.3 shifting the range of nextInt
3. **Probabilities with nextDouble** (no MOOC exercise). Type: class (hidden harness with an injected Random).
   - C1: a biased coin that is true with probability p.
   - C2: three outcomes with cumulative thresholds (for example 10/30/60 percent).
   - C3: a normally distributed value with nextGaussian, cast to int.
   - MOOC topics: 12.3 nextDouble and nextGaussian (weather example)
4. **Drawing distinct values** (covers Lottery [part12-Part12_08.Lottery]). Type: class (hidden harness: size, range, uniqueness).
   - C1: draw k distinct numbers from 1..n with a contains check.
   - C2: has(x) and redraw().
   - C3: equals() that treats two draws with the same numbers in any order as equal.
   - MOOC topics: 12.3 drawing distinct values
5. **Seeds and pseudo-randomness** (no MOOC exercise). Type: program (stdout) and class.
   - C1: two Random objects with the same seed print the same sequence (expected output generated on the site runtime).
   - C2: pass a Random into a class so tests repeat.
   - C3: simulate 10,000 dice rolls and print whether the average is within 0.1 of 3.5.
   - MOOC topics: 12.3 hint: On randomness of numbers (pseudorandom numbers); site-only: seeds (the MOOC text has no 'seed')

### 47. Two-dimensional arrays (`multidimensional-arrays`), Java Programming II

MOOC: 12.4 Multidimensional data (`part-12/4-multidimensional-data.md`); 12.5 Summary (`part-12/5-summary.md`).
Browser: in-browser.

Section 12.4 (2 exercises) plus the part 12 summary (a quiz; no exercise needed). All plain Java; runs in the browser.

1. **Rows, columns and nested loops** (no MOOC exercise). Type: fill-in-the-blanks, then program (stdout).
   - C1: fill in new int[3][4] and the nested loop bounds.
   - C2: print row, column and value for every cell.
   - C3: set given cells and print the grid.
   - MOOC topics: 12.4 intro: two-dimensional arrays, rows and columns, nested loops; 12.4 hint: Array vs. Hash table
2. **A grid as text** (covers Array as a string [part12-Part12_09.ArrayAsAString]). Type: method (hidden harness).
   - C1: join each row's digits and end rows with a line break (StringBuilder).
   - C2: separate values with spaces and pad to equal width.
   - C3: handle jagged arrays whose rows differ in length.
   - MOOC topics: 12.4 a two-dimensional array as a string (StringBuilder)
3. **Row sums** (covers Magic square (4 parts) [part12-Part12_10.MagicSquare]). Type: method (hidden harness).
   - C1: the sum of each row of a sales table as a list.
   - C2: the index of the best row.
   - C3: the rows whose sum exceeds a limit.
   - MOOC topics: 12.4 MagicSquare: row sums
4. **Column sums** (continues Magic square (4 parts)). Type: method (hidden harness).
   - C1: column sums for a non-square table.
   - C2: the largest value in each column.
   - C3: the columns whose values are all equal.
   - MOOC topics: 12.4 MagicSquare: column sums
5. **Diagonals and whole-grid checks** (continues Magic square (4 parts)). Type: method (hidden harness).
   - C1: main diagonal sum.
   - C2: anti-diagonal sum.
   - C3: check that every row, column and diagonal has the same sum, on the site's own grids.
   - MOOC topics: 12.4 MagicSquare: diagonals and the magic check
6. **Filling a grid by rules** (continues Magic square (4 parts)). Type: method (hidden harness).
   - C1: fill a grid row by row in snake order.
   - C2: moves that wrap around the edges with modulo.
   - C3: build an odd-sized grid with an up-right move and a step-down fallback (the Siamese construction) and verify it with the previous step's check.
   - MOOC topics: 12.4 MagicSquare: building an odd-sized square (MagicSquareFactory); 12.5 Summary (closing text)

### 48. GUI: windows, components and layouts (`gui-basics`), Java Programming II

MOOC: 13.1 Graphical user interfaces (`part-13/1-graphical-user-interfaces.md`); 13.2 UI components and their layout (`part-13/2-UI-components-and-layout.md`).
Browser: mixed (site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Sections 13.1 (1 exercise, folded in as step 1) and 13.2. JavaFX cannot run in a browser runtime today (see Browser issues). Each step is offered (a) in the browser on a site UI shim whose hidden harness inspects the component tree, and (b) optionally as a JavaFX 'run on your own computer' project graded by GitHub Actions. Cannot run in the browser as JavaFX (no browser engine runs JavaFX today: CheerpJ docs say not supported, TeaVM has no javafx package; parts 11-14 report). Launch plan: the plain-Java logic steps run in the browser, and each GUI step has an own-computer JavaFX variant; the UI shim is a later phase.

1. **A first window** (covers My first application [part13-Part13_01.MyFirstApplication]). Type: UI shim (harness checks the window title) or own-computer JavaFX.
   - C1: fill in a start method that sets a title and shows the window.
   - C2: launch the application from main.
   - C3: build the title in code (for example name plus version).
   - MOOC topics: 13.1 intro: a JavaFX Application, start(Stage), launch; 13.1 hint: Graphical User Interfaces and Required Libraries
2. **Scene, layout and components** (covers Button and label [part13-Part13_02.ButtonAndLabel]). Type: UI shim (harness checks the children and their order).
   - C1: add a Label and a Button to a FlowPane.
   - C2: the label must come before the button.
   - C3: create three labels in a loop from a list of strings.
   - MOOC topics: 13.1 Structure of a User Interface; 13.2 intro: Button, Label
3. **Text input components** (covers Button and TextField [part13-Part13_03.ButtonAndTextField]). Type: UI shim.
   - C1: a Button followed by a TextField in an HBox.
   - C2: a VBox with a Label, a TextField and a Button.
   - C3: a TextArea with preset text and a Button below it.
   - MOOC topics: 13.2 intro: TextField and other UI components
4. **BorderPane regions** (covers BorderPane [part13-Part13_04.BorderPane]). Type: UI shim (harness checks the regions).
   - C1: labels in three regions.
   - C2: all five regions filled.
   - C3: a toolbar HBox at the top and a status label at the bottom.
   - MOOC topics: 13.2 UI Component Layout; 13.2 BorderPane
5. **HBox, VBox, spacing and GridPane** (no MOOC exercise). Type: UI shim.
   - C1: an HBox with spacing 10.
   - C2: a 3x3 GridPane of buttons labelled with their coordinates.
   - C3: a 4x4 keypad built with nested loops.
   - MOOC topics: 13.2 HBox (and VBox); 13.2 GridPane
6. **Nesting layouts** (covers Text statistics [part13-Part13_05.TextStatistics]). Type: UI shim, plus optional own-computer JavaFX project.
   - C1: a BorderPane with a TextArea in the center and an HBox of three labels at the bottom (the site's own texts).
   - C2: add a VBox sidebar on the left.
   - C3: a form: GridPane in the center, an HBox of buttons at the bottom.
   - MOOC topics: 13.2 Multiple Layouts ons a Single Interface (MOOC heading spelling)

### 49. GUI: event handling (`gui-events`), Java Programming II

MOOC: 13.3 Event handling (`part-13/3-event-handling.md`); 13.4 Application's launch parameters (`part-13/4-launch-parameters.md`).
Browser: mixed (site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Sections 13.3 (2 exercises) and 13.4 (1 exercise, folded in as the last step). Event wiring runs on the UI shim (the harness fires events); the text statistics logic is plain Java and runs as-is; launch parameters become program arguments.

1. **Button actions** (covers Notifier [part13-Part13_06.Notifier]). Type: UI shim (harness types text and clicks).
   - C1: fill in setOnAction with a lambda that prints a line.
   - C2: copy a TextField's text into a Label on click.
   - C3: a counter label that increases on each click, with a reset button.
   - MOOC topics: 13.3 intro: event handlers, setOnAction
2. **Lambdas and effectively final variables** (no MOOC exercise). Type: compiles drills, then UI shim.
   - C1: predict which handler fails to compile (a reassigned local variable).
   - C2: fix it with a field or a one-element holder.
   - C3: two buttons that share one handler method.
   - MOOC topics: 13.3 lambda event handlers (site-only: effectively final variables; 'final' does not occur in 13.3)
3. **Reacting to typing: ChangeListener** (covers Text statistics, part II [part13-Part13_07.TextStatisticsPart2]). Type: UI shim (harness changes the text property).
   - C1: mirror a TextField into a Label as the user types.
   - C2: show the old and the new value.
   - C3: disable a button while the field is empty.
   - MOOC topics: 13.3 listening to text changes (addListener, ChangeListener)
4. **Text statistics as testable logic** (continues Text statistics, part II). Type: method (hidden harness; runs as-is), then wire it on the shim.
   - C1: count the characters of a text.
   - C2: count words with an explicit rule for empty text and repeated spaces.
   - C3: the longest word (first one on ties), then show all three in labels.
   - MOOC topics: 13.3 text statistics logic separated from the UI
5. **Launch parameters** (covers User's title [part13-Part13_08.UserTitle]). Type: program (program arguments, stdout) in the browser; own-computer JavaFX optional.
   - C1: read --name=value arguments into a Map and print one value.
   - C2: print a default when a key is missing.
   - C3: read a title with a Scanner and open a shim window with that title.
   - MOOC topics: 13.4 Application's launch parameters (getParameters)

### 50. GUI: multiple views (`gui-views`), Java Programming II

MOOC: 13.5 Multiple views (`part-13/5-multiple-views.md`); 13.6 Summary (`part-13/6-summary.md`).
Browser: mixed (site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Section 13.5 (5 exercises) plus the part 13 summary (a quiz; no exercise needed). View switching runs on the UI shim; the vocabulary and tic-tac-toe logic are plain Java and run as-is.

1. **Switching scenes** (covers Multiple views [part13-Part13_09.MultipleViews]). Type: UI shim (harness clicks through the views).
   - C1: two scenes that swap on a button.
   - C2: three views in a cycle, each with a different layout.
   - C3: a back button that returns to the previous view.
   - MOOC topics: 13.5 intro: several Scene objects and switching between them
2. **A form view and a result view** (covers Greeter [part13-Part13_10.Greeter]). Type: UI shim.
   - C1: a name field and a button that switches to a view with a greeting in the site's own wording.
   - C2: a PasswordField check with an error label.
   - C3: trim the input and refuse empty names.
   - MOOC topics: 13.5 Own layout for each view
3. **One frame, changing content** (covers Joke [part13-Part13_11.Joke]). Type: UI shim.
   - C1: a BorderPane with a menu HBox on top and content in the center.
   - C2: three menu buttons that swap the center.
   - C3: default content on start and a highlighted active button.
   - MOOC topics: 13.5 Views with the same main alignment
4. **Separating logic from the UI** (no MOOC exercise). Type: class (hidden harness; runs as-is), then UI shim.
   - C1: an interface for a contact store and an in-memory implementation.
   - C2: a UI class that only uses the interface.
   - C3: swap the implementation without touching the UI.
   - MOOC topics: 13.5 Separating application logic and user interface logic
5. **A practice app: the logic** (covers Vocabulary practice [part13-Part13_12.VocabularyPractice]). Type: class (hidden harness; seeded Random; runs as-is).
   - C1: a word-pair store with add and translate.
   - C2: randomWord() from a list kept next to the map.
   - C3: a practice session that counts right and wrong answers.
   - MOOC topics: 13.5 A slightly larger application: Vocabulary practice; 13.5 Dictionary
6. **A practice app: views as classes** (continues Vocabulary practice). Type: UI shim, plus own-computer JavaFX project.
   - C1: an InputView whose getView() returns a Parent.
   - C2: a PracticeView that checks an answer and shows feedback.
   - C3: the main application with a menu that switches between them.
   - MOOC topics: 13.5 Entering new words; 13.5 Vocabulary training; 13.5 Practice application
7. **A board of buttons and turns** (covers Tic-tac-toe (3 parts) [part13-Part13_13.TicTacToe]). Type: UI shim (harness clicks cells).
   - C1: a 3x3 GridPane of buttons and a turn label.
   - C2: a click places the current mark and switches turns.
   - C3: clicking an occupied cell changes nothing.
   - MOOC topics: 13.5 TicTacToe exercise: a grid of buttons and turns
8. **Game logic: detecting the end** (continues Tic-tac-toe (3 parts)). Type: class (hidden harness; runs as-is), then wire it on the shim.
   - C1: a Board class with place(row, col) and the current player.
   - C2: winner detection for rows, columns and diagonals.
   - C3: detect a draw and refuse moves after the end.
   - MOOC topics: 13.5 TicTacToe exercise: detecting the end of the game; 13.6 Summary (closing text)

### 51. Data visualization (`charts`), Java Programming II

MOOC: 14.1 Data visualization (`part-14/1-data-visualization.md`).
Browser: mixed (in-memory files per test (read); site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Section 14.1 (5 exercises). Data preparation (parsing, maps, series, aggregation) runs in the browser with in-memory files; charts are drawn by a site chart shim (a LineChart/BarChart-like API that the page renders) or printed as text bars. Each chart step can also be done as an own-computer JavaFX project. Use the site's own data sets. Step order follows the MOOC for the line charts (Shanghai, then FinnishParties). Exception: the site introduces bar charts with CyclingStatistics (step 6) before the misleading-axes exercise UnfairAdvertisement (step 7), the reverse of the MOOC order, because the honest-charts step modifies an existing bar chart.

1. **A line chart of points** (covers Shanghai [part14-Part14_01.Shanghai]). Type: chart shim (harness inspects the series) or own-computer JavaFX.
   - C1: add (year, value) points to one series from two arrays.
   - C2: set the x-axis bounds to the data range.
   - C3: axis labels and a chart title.
   - MOOC topics: 14.1 Charts; 14.1 Line Chart
2. **From text rows to numbers** (covers Finnish parties [part14-Part14_02.FinnishParties]). Type: method (hidden harness, in-memory TSV/CSV files).
   - C1: split a semicolon-separated row and print index: value.
   - C2: parse a tab-separated row into a name and a list of doubles, treating '-' as missing.
   - C3: read a whole file into a Map<String, Map<Integer, Double>>.
   - MOOC topics: 14.1 Line Chart (reading the data file into numbers)
3. **Several series from a map** (continues Finnish parties). Type: chart shim.
   - C1: one series per key of a map.
   - C2: series names taken from the data.
   - C3: skip missing values and keep the years in order.
   - MOOC topics: 14.1 Line Chart (several XYChart.Series, one per party)
4. **Series computed from a formula** (covers Savings calculator (3 parts) [part14-Part14_03.SavingsCalculator]). Type: method (hidden harness; runs as-is).
   - C1: yearly totals of a fixed monthly deposit for 30 years.
   - C2: the same with yearly compound interest.
   - C3: return both series as lists of points (the site's own amounts and rates).
   - MOOC topics: 14.1 Line Chart (series computed from a formula)
5. **Controls that redraw a chart** (continues Savings calculator (3 parts)). Type: UI shim or own-computer JavaFX.
   - C1: a Slider with min, max and a value label.
   - C2: redraw the series when the slider moves (listener).
   - C3: two sliders and two series.
   - MOOC topics: 14.1 Line Chart (sliders that redraw the chart)
6. **Bar charts for categories** (covers Cycling statistics [part14-Part14_05.CyclingStatistics]). Type: program (stdout text bars, in-memory CSV) and chart shim.
   - C1: print a text bar chart (one # per unit) for a few categories.
   - C2: aggregate hourly counts into monthly totals from a CSV.
   - C3: switch a given line-chart program to a bar chart.
   - MOOC topics: 14.1 Bar Charts
7. **Honest charts** (covers Unfair Advertisement [part14-Part14_04.UnfairAdvertisement]). Type: choice drills and method (hidden harness).
   - C1: spot the misleading axis (choice).
   - C2: compute axis bounds that start at zero.
   - C3: bar heights proportional to the values for a given pixel height.
   - MOOC topics: 14.1 Bar Charts (misleading axes)
8. **Charts that update: running averages** (no MOOC exercise). Type: method (hidden harness; seeded Random); chart shim optional.
   - C1: the running average of dice rolls.
   - C2: keep only the last 100 points in a list.
   - C3: report whether the average after 10,000 rolls is within 0.05 of 3.5.
   - MOOC topics: 14.1 Visualizing Dynamic Data (AnimationTimer)

### 52. Drawing, images and sound (`drawing-and-images`), Java Programming II

MOOC: 14.2 Multimedia in programs (`part-14/2-multimedia-in-programs.md`).
Browser: mixed (site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Section 14.2 (3 exercises). Drawing and pixel work run in the browser on a site canvas/picture shim or on plain 2D arrays; sound has no browser exercise and becomes an optional own-computer task. Use the site's own images and sounds, not the MOOC media.

1. **Drawing on a canvas** (covers Smiley [part14-Part14_06.Smiley]). Type: canvas shim (harness inspects the draw calls) or a text grid; own-computer JavaFX optional.
   - C1: fill a background rectangle and one circle.
   - C2: a face from ovals and rectangles at given coordinates.
   - C3: a row of n shapes drawn with a loop.
   - MOOC topics: 14.2 Drawing (Canvas, GraphicsContext)
2. **Drawing with the mouse** (no MOOC exercise). Type: canvas shim (harness sends drag events).
   - C1: draw a dot where the mouse is dragged.
   - C2: use the selected colour.
   - C3: a clear button.
   - MOOC topics: 14.2 Drawing (setOnMouseDragged paint example with ColorPicker)
3. **Images as pixel grids** (covers Collage (3 parts) [part14-Part14_07.Collage]). Type: method (hidden harness on a site Picture class or int[][] RGB).
   - C1: copy a picture pixel by pixel.
   - C2: read the red, green and blue parts of a pixel.
   - C3: turn a picture grey by averaging the channels.
   - MOOC topics: 14.2 Images (Image, ImageView, PixelReader)
4. **Scaling down** (continues Collage (3 parts)). Type: method (hidden harness).
   - C1: keep every second pixel to halve the size.
   - C2: put the half-size copy in the top-left corner of an empty picture.
   - C3: scale down by any integer factor.
   - MOOC topics: 14.2 Images (WritableImage, PixelWriter: scaling)
5. **Tiling a picture** (continues Collage (3 parts)). Type: method (hidden harness).
   - C1: repeat a small picture 2x2.
   - C2: n by m tiles.
   - C3: mirror every other tile.
   - MOOC topics: 14.2 Images (tiling)
6. **Colour transforms** (continues Collage (3 parts)). Type: method (hidden harness).
   - C1: negative: 1.0 minus each channel (or 255 minus).
   - C2: a different tint per tile.
   - C3: threshold to black and white.
   - MOOC topics: 14.2 Images (colour transforms, negative)
7. **Playing sound (on your own computer)** (covers Hurray [part14-Part14_08.Hurray]). Type: reading step plus optional own-computer JavaFX project (AudioClip); no browser exercise.
   - C1: (own computer) a button that plays a short clip.
   - C2: two buttons with two clips.
   - C3: disable the button while the clip plays.
   - Note: In the browser: reading and a quiz only.
   - MOOC topics: 14.2 Sounds (AudioClip)

### 53. Project: an Asteroids-style game (`asteroids`), Java Programming II

MOOC: 14.3 Larger application: Asteroids (`part-14/3-larger-application-asteroids.md`).
Browser: mixed (site UI/canvas/chart shim (design proposal, not built); own-computer JavaFX project (Maven + JUnit 5 + TestFX/Monocle, graded by GitHub Actions)).

Section 14.3 (1 exercise in 4 parts; parts 1 to 4 map to steps 1-2, 3, 4-5 and 6-8). In the browser the game logic lives in plain Java classes tested by a harness that calls tick() instead of AnimationTimer and passes the set of pressed keys; rendering uses a site canvas shim. The full JavaFX game is an optional own-computer project. It could also be modelled as a C/C++ Arena Project with milestones.

1. **Shapes in a window** (covers Asteroids (4 parts) [part14-Part14_09.Asteroids]). Type: canvas shim (harness inspects shapes) or own-computer JavaFX.
   - C1: a 600x400 pane with a circle at given coordinates.
   - C2: a triangle polygon moved with translate.
   - C3: a polygon rotated by an angle.
   - MOOC topics: 14.3 Creating the game window; 14.3 Creating the ship
2. **Keys and a game loop** (continues Asteroids (4 parts)). Type: class (hidden harness drives tick() with key sets).
   - C1: a Map of pressed keys updated on press and release.
   - C2: tick() turns left or right by 5 degrees while a key is held.
   - C3: several keys held at once.
   - MOOC topics: 14.3 Turning the ship: Keyboard listener, part 1; 14.3 Turning the ship: Keyboard listener, part 2
3. **Movement vectors** (continues Asteroids (4 parts)). Type: class (hidden harness; runs as-is).
   - C1: an immutable Vector2 with add().
   - C2: accelerate() adds a small thrust factor times (cos, sin) of the heading.
   - C3: move() adds the velocity to the position on every tick.
   - MOOC topics: 14.3 Moving the ship: First attempt
4. **One base class for moving things** (continues Asteroids (4 parts)). Type: class (hidden harness).
   - C1: an abstract Body with position, velocity and heading.
   - C2: Ship and Rock extend it with their own shapes.
   - C3: Rock spins a little on every move (override that calls super).
   - MOOC topics: 14.3 Moving the ship: Refactoring; 14.3 Moving the ship: Second attempt
5. **Collisions and many rocks** (continues Asteroids (4 parts)). Type: class (hidden harness; seeded Random).
   - C1: circle-circle collision by distance.
   - C2: a list of rocks at random positions.
   - C3: stop the game when the ship hits any rock.
   - MOOC topics: 14.3 Creating an asteroid; 14.3 The collision between the ship and an asteroid; 14.3 Multiple asteroids
6. **Staying on screen** (continues Asteroids (4 parts)). Type: class (hidden harness).
   - C1: public static WIDTH and HEIGHT constants.
   - C2: wrap positions around the edges.
   - C3: wrap correctly for negative coordinates.
   - MOOC topics: 14.3 Staying within the window
7. **Projectiles** (continues Asteroids (4 parts)). Type: class (hidden harness).
   - C1: fire a projectile in the ship's heading.
   - C2: at most three projectiles alive.
   - C3: remove projectiles and rocks that collide, using an alive flag and a stream filter.
   - MOOC topics: 14.3 Projectiles
8. **Score and new rocks** (continues Asteroids (4 parts)). Type: class (hidden harness; seeded Random), then own-computer JavaFX project.
   - C1: add points per hit.
   - C2: spawn a rock with a given probability per tick unless it would hit the ship.
   - C3: a game-over state that ignores input.
   - MOOC topics: 14.3 Adding points; 14.3 Continuous adding of asteroids

### 54. Libraries, Maven and databases (`libraries-and-tools`), Java Programming II

MOOC: 14.4 Maven and third-party libraries (`part-14/4-maven-and-third-party-libraries.md`); 14.5 Conclusion (`part-14/5-conclusion.md`).
Browser: mixed (optional own-computer project (Maven + JUnit 5, graded by GitHub Actions) with H2 and JDBC).

Section 14.4 (1 exercise) plus the course conclusion (a questionnaire; no exercise needed). Maven, H2 and JDBC cannot run in the browser; the DAO pattern and the text UI can. The own-computer project follows the C/C++ Arena Pro Track model (starter repo, GitHub Actions grader). This is the natural home of the site's own-computer track: a Maven starter with JUnit 5 and H2, graded by GitHub Actions.

1. **Build tools and project layout** (no MOOC exercise). Type: reading plus choice and fill-in drills.
   - C1: match files to src/main/java, src/test/java and pom.xml (choice).
   - C2: fill in a dependency's groupId, artifactId and version.
   - C3: read a dependency coordinate and say what it provides.
   - MOOC topics: 14.4 intro: Maven, pom.xml, dependencies
2. **Data access objects** (covers Database [part14-Part14_10.Database]). Type: class (hidden harness; runs as-is).
   - C1: a NoteDao interface with list, add, markDone and remove by id.
   - C2: an in-memory implementation that assigns increasing ids.
   - C3: list() returns notes ordered by id.
   - MOOC topics: 14.4 Using a database (data access object)
3. **A text UI over a DAO** (continues Database). Type: program (stdin/stdout, hidden tests, in-memory DAO).
   - C1: list and add commands.
   - C2: mark done and remove by id.
   - C3: quit, unknown commands and an empty-list message.
   - MOOC topics: 14.4 Using a database (text UI over the DAO)
4. **A real database (on your own computer)** (continues Database). Type: own-computer project: Maven or Gradle with H2 and JDBC, graded by GitHub Actions.
   - C1: run the given project and its tests locally.
   - C2: implement a JdbcNoteDao with PreparedStatement.
   - C3: data survives a restart (the test opens the database twice).
   - MOOC topics: 14.4 Using a database (H2 and JDBC, own computer)
5. **Packaging, other libraries and what next** (no MOOC exercise). Type: reading step (no exercise needed).
   - C1: (optional, own computer) build a runnable jar.
   - C2: a quiz on libraries and where to find them.
   - C3: course wrap-up: next topics such as build automation, testing, web programming and Android.
   - MOOC topics: 14.4 Telegram bot; 14.4 Packaging applications; 14.4 Other development environment; 14.5 Conclusion (closing text)

### 55. Recursion (`recursion`), EXTRA, not in the MOOC

Browser: in-browser.

EXTRA, not part of the MOOC: the course never teaches recursion by name ('recursi' occurs only twice outside HTML comments, both as example data in 9.2: an e-book titled 'Introduction to Recursion' whose page reads 'A method can call itself.'). The only recursive behaviour in the MOOC is implicit: in 9.2 InterfaceInABox a Box's weight() calls weight() on the boxes it contains, and the task asks what happens when a box is put in itself (see interfaces step 4). Placed after sorting and searching so binary search and merge sort can be revisited. Needs a catchable StackOverflowError in the runtime (step 4).

1. **A method that calls itself** (no MOOC exercise). Type: fill in the blanks, then write a method (hidden harness captures stdout).
   - C1: fill in the recursive call of a countdown(n) that prints n down to 1
   - C2: print 1 up to n by printing after the recursive call instead of before
   - C3: predict the output of a method that prints both before and after its recursive call (checked against the real output)
2. **Base case and return value** (no MOOC exercise). Type: write a method (hidden harness).
   - C1: return the sum 1..n recursively
   - C2: return n! as a long, with 0! = 1
   - C3: power(base, exp) with exp == 0 as the base case
3. **Recursion on strings and arrays** (no MOOC exercise). Type: write a method (hidden harness).
   - C1: reverse a string with substring and charAt
   - C2: palindrome check that compares the ends and recurses inward
   - C3: sum of an int[] from index i to the end
4. **When recursion goes wrong** (no MOOC exercise). Type: write a program (fix the bug; expected-exception and output tests).
   - C1: fix a method with no base case (the seed ends with StackOverflowError)
   - C2: fix a base case that negative input never reaches
   - C3: count how many calls a naive Fibonacci makes for n = 20 and print the count
5. **Recursive binary search** (no MOOC exercise). Type: write a method (hidden harness counts comparisons).
   - C1: binary search on a sorted int[] with low and high parameters
   - C2: return the insertion point when the value is missing
   - C3: return the number of comparisons and show it stays near log2(n)
6. **Divide and conquer: merge sort** (no MOOC exercise). Type: write a method (hidden harness; forbid Arrays.sort).
   - C1: merge two sorted arrays into one
   - C2: merge sort an int[] using the merge method
   - C3: stable merge sort of strings by length (equal lengths keep input order)

### 56. Records (`records`), EXTRA, not in the MOOC

Browser: in-browser-with-adaptation (in-browser javac and runtime for Java 16 or newer).

EXTRA, not part of the MOOC (Java 16 feature, verified with javac --release 16 vs 15). Builds on equals/hashCode (8.3), immutability (5.4) and Comparator (10.2), so it sits after part 10. Runs in the browser only if the chosen engine compiles Java 16+: the CheerpJ Java 17 image has no javac and a Java 17 javac on CheerpJ is feasible but unverified (rt-cheerpj.md section 4.2). Fallback: own-computer mini project.

1. **Declaring a record** (no MOOC exercise). Type: fill in the blanks, then write a program (stdout).
   - C1: fill in record Point(int x, int y) and create two points
   - C2: call the accessors x() and y() and print a sentence
   - C3: print a record directly and read the generated toString (Point[x=1, y=2])
2. **Generated equals and hashCode** (no MOOC exercise). Type: fill in the blanks (predict), then write a program (stdout).
   - C1: predict equals and == for two records with the same components
   - C2: count visits per grid cell with a HashMap<Cell, Integer> keyed by a record
   - C3: remove duplicate coordinates by adding records to a HashSet
3. **Compact constructors** (no MOOC exercise). Type: write a record (hidden harness).
   - C1: trim and lower-case a name component in a compact constructor
   - C2: clamp a percentage component to 0..100
   - C3: swap start and end when start > end so a Range is always ordered
4. **Methods and factories in records** (no MOOC exercise). Type: write a record (hidden harness).
   - C1: an instance method distanceTo(other)
   - C2: withX(newX) returns a new record and leaves the original unchanged
   - C3: a static factory origin() and a static counter-free helper
5. **Class or record?** (no MOOC exercise). Type: write a program (refactor; require record, forbid hashCode( and equals( declarations).
   - C1: convert an immutable class with hand-written equals/hashCode/toString to a record, output unchanged
   - C2: choose class or record for four descriptions (mutable counter, money amount, bank account, 2D point) with reasons
   - C3: sort a list of records with Comparator.comparing(Person::age).thenComparing(Person::name)

### 57. switch, var and text blocks (`switch-and-text`), EXTRA, not in the MOOC

Browser: in-browser-with-adaptation (in-browser javac and runtime for Java 15 or newer).

EXTRA, not part of the MOOC: the course never uses switch (0 code hits), var, text blocks or String.format/printf. Switch expressions need Java 14, text blocks Java 15 (verified with javac --release). Classic switch (step 1) and String.format (step 5) are Java 8 and run on any engine; the TeaVM report measured that String.format("%.2f") crashes in its in-browser pipeline (rt-teavm.md section 1).

1. **switch statements** (no MOOC exercise). Type: write a program (stdin-stdout).
   - C1: map a day number 1..7 to a name with case labels and a default
   - C2: fix a fall-through bug caused by a missing break
   - C3: group labels so 6 and 7 both print 'weekend'
2. **switch expressions with arrows** (no MOOC exercise). Type: write a program (stdin-stdout); require ->.
   - C1: turn an if/else-if chain into a switch expression that returns a String
   - C2: several labels per case (case 6, 7 ->)
   - C3: a block case that computes a value and returns it with yield
3. **switch on strings and enums** (no MOOC exercise). Type: write a program (stdin-stdout).
   - C1: a command menu that switches on the input word
   - C2: switch on an enum from part 10 with no default in a switch expression
   - C3: add a new enum constant and fix the resulting 'does not cover all possible input values' compile error
4. **var for local variables** (no MOOC exercise). Type: compiles drills, then write a program (stdout).
   - C1: replace explicit local types with var where the type is obvious from the right-hand side
   - C2: predict which var lines do not compile (var x; and var n = null;)
   - C3: iterate a map's entrySet() with var in a for-each
5. **Text blocks and formatted text** (no MOOC exercise). Type: write a program (stdout).
   - C1: print a multi-line banner with a text block and check its indentation
   - C2: String.format with %s and %d to build a sentence
   - C3: a price table with %-10s and %8.2f columns (expected output computed on the site runtime)

### 58. Pattern matching and sealed types (`sealed-and-patterns`), EXTRA, not in the MOOC

Browser: mixed (in-browser javac and runtime for Java 17 (steps 1-2) and Java 21 (steps 3-4)).

EXTRA, not part of the MOOC. instanceof patterns need Java 16, sealed types Java 17, switch type patterns and record patterns Java 21 (all verified with javac --release). CheerpJ 4.3 supports Java 8, 11 and 17 and only plans Java 21 (rt-cheerpj.md section 2), so steps 3 and 4 run on the learner's own computer (JDK 21 + Maven, GitHub Actions) until the browser engine supports Java 21.

1. **instanceof with a pattern** (no MOOC exercise). Type: write a program (refactor; require instanceof ... name).
   - C1: replace instanceof plus cast with a pattern variable
   - C2: rewrite an equals(Object) from part 8 with a pattern
   - C3: combine the pattern variable with && in one condition
2. **Sealed interfaces** (no MOOC exercise). Type: compiles drills, then write classes (hidden harness).
   - C1: declare sealed interface Shape permits Circle, Square and two final classes
   - C2: predict the compile error when a third class tries to implement Shape
   - C3: use records as the permitted subtypes
3. **switch over sealed types (Java 21)** (no MOOC exercise). Type: write a method (hidden harness); own computer until the engine supports Java 21.
   - C1: area(Shape) with a switch on type patterns
   - C2: exhaustive switch with no default, then add a subtype and fix the error
   - C3: a guarded case with when (for example zero-size shapes)
4. **Record patterns (Java 21)** (no MOOC exercise). Type: write a method (hidden harness); own computer until the engine supports Java 21.
   - C1: deconstruct Point(int x, int y) in an instanceof
   - C2: nested record patterns for a Line(Point a, Point b)
   - C3: a small expression evaluator over sealed Expr = Num | Add | Mul

### 59. Linked lists, stacks, queues and trees (`linked-structures`), EXTRA, not in the MOOC

Browser: in-browser.

EXTRA, not part of the MOOC: part 9.2 only mentions LinkedList as a List implementation, and TreeMap/TreeSet appear in no section text (0 hits; TreeMap only in the 14.1 CyclingStatistics template per the parts 11-14 report). Complements 12.2 (own list and hash map). Step 5 uses recursion (extra module 'recursion'); an iterative version is accepted.

1. **Nodes and links** (no MOOC exercise). Type: fill in the blanks, then write a program (stdout).
   - C1: build three Node objects by hand and link them
   - C2: print a chain with a while loop over next
   - C3: count the nodes and find the largest value
2. **A linked list class** (no MOOC exercise). Type: write a class (hidden harness).
   - C1: addFirst and toString
   - C2: addLast with a tail reference
   - C3: get(i) and removeFirst with IndexOutOfBoundsException for bad input
3. **Stacks and queues on linked nodes** (no MOOC exercise). Type: write a class (hidden harness).
   - C1: a stack with push, pop and isEmpty
   - C2: a queue with enqueue and dequeue in O(1) using head and tail
   - C3: a balanced-brackets checker built on the stack
4. **ArrayDeque from the library** (no MOOC exercise). Type: write a program (stdin-stdout).
   - C1: ArrayDeque as a stack (push/pop)
   - C2: ArrayDeque as a queue (offer/poll)
   - C3: an undo/redo command loop with two deques
5. **Binary search trees** (no MOOC exercise). Type: write a class (hidden harness).
   - C1: insert into a BST
   - C2: contains in O(height)
   - C3: in-order traversal that prints values in sorted order
6. **TreeMap and TreeSet** (no MOOC exercise). Type: write a program (stdin-stdout).
   - C1: word counts printed in alphabetical order with a TreeMap
   - C2: nearest scores with TreeSet floor and ceiling
   - C3: the first and last keys of a TreeMap of dates as strings in yyyy-mm-dd form

## Things that cannot run in the browser, and how to handle them

Merged from the four readers' browser-issue lists. Sources are the reader reports unless another file is named.

### 1. JavaFX windows, controls, layouts, event handlers and scene switching (Application, Stage, Scene, Label, Button, TextField, BorderPane, HBox/VBox, GridPane, setOnAction, ChangeListener, launch parameters)

- **Category:** cannot run in the browser
- **Where:** 13.1-13.5: part13-Part13_01 to Part13_13; modules gui-basics, gui-events, gui-views
- **Why:** No browser Java engine found runs JavaFX: the CheerpJ blog sources call it 'not currently supported' and list it as future work, and the TeaVM clone has no javafx package (mooc-parts-11-14.md, Browser issues; rt-cheerpj.md section 1). TMC grades these with TestFX.
- **Options:**
  - (a) logic first: every GUI exercise has a plain-Java core (text statistics, vocabulary store, tic-tac-toe board) graded in the browser by a hidden harness
  - (b) site UI shim: a small JavaFX-like API in the site's own package that serializes the component tree for the page to render and lets the harness click and type; design proposal only, not built or measured
  - (c) own-computer JavaFX project in the learner's GitHub repo, graded by GitHub Actions with Maven + JUnit 5 + TestFX headless (Monocle); the parts 11-14 reader verified this locally with JavaFX 21.0.12, testfx-junit5 4.0.18, openjfx-monocle 21.0.2, JUnit 5.10.2, Maven 3.9.11 on JDK 21, not yet on GitHub-hosted runners
- **Proposal:** Launch with (a) + (c): browser steps teach the logic and event wiring on plain Java; each GUI step links to an own-computer JavaFX starter graded by GitHub Actions. Add (b) later as a scripted, non-interactive shim (runs in any engine because it is plain Java printing a tree), and only make it interactive if the chosen engine has a Java-to-DOM bridge (not investigated).
- **Recommended:** (a) + (c) now, (b) later

### 2. JavaFX charts (LineChart, BarChart, NumberAxis, CategoryAxis, XYChart.Series), Slider-driven redraws and AnimationTimer updates

- **Category:** cannot run in the browser
- **Where:** 14.1: part14-Part14_01 to Part14_05; module charts
- **Why:** JavaFX (as above).
- **Options:**
  - data preparation (parsing TSV/CSV from in-memory files, maps of series, formulas, aggregation) as browser steps with exact tests
  - a site Chart class in plain Java that records series; the page draws them as SVG after the run
  - text bar charts on stdout
  - own-computer JavaFX chart project
- **Proposal:** Browser: data preparation steps plus a plain-Java Chart recorder rendered as SVG by the page, and text bars where a picture is not the point. Own computer: optional JavaFX chart project. Use the site's own data sets, not literacy.csv or the MOOC party data.
- **Recommended:** data steps + SVG chart recorder in the browser; JavaFX optional on own computer

### 3. Canvas/GraphicsContext drawing, mouse drawing, Image/ImageView/PixelReader/WritableImage

- **Category:** cannot run in the browser
- **Where:** 14.2: part14-Part14_06 Smiley, part14-Part14_07 Collage; module drawing-and-images
- **Why:** JavaFX graphics.
- **Options:**
  - a site Picture class or int[][] RGB grids given per test, rendered by the page on a canvas
  - a draw-call recording canvas (fillOval, fillRect) inspected by the harness
  - own-computer JavaFX
- **Proposal:** Teach pixel maths on int[][] RGB (exact integer comparisons) and drawing through a recording canvas whose calls the page replays. Use the site's own or CC0 images, not the MOOC's photos.
- **Recommended:** int[][] pictures + recording canvas in the browser

### 4. Sound playback with javafx.scene.media.AudioClip

- **Category:** cannot run in the browser
- **Where:** 14.2: part14-Part14_08 Hurray; module drawing-and-images step 7
- **Why:** Needs JavaFX media; the MOOC's sound files are third-party recordings and must not be reused (parts 11-14 report, license research).
- **Options:**
  - reading step plus quiz in the browser
  - optional own-computer JavaFX task with a site-made or CC0 clip
- **Proposal:** No graded browser exercise. Reading step in the browser, optional own-computer task.
- **Recommended:** reading step + optional own-computer task

### 5. A JavaFX game: Pane, Polygon, keyboard events, AnimationTimer game loop, Shape.intersect

- **Category:** cannot run in the browser
- **Where:** 14.3: part14-Part14_09 Asteroids (4 parts); module asteroids
- **Why:** JavaFX; the MOOC grades it only by self-reported partsCompleted().
- **Options:**
  - plain-Java model (Vector2, Body, Ship, Rock, Projectile) with tick(Set<Key> pressed) driven by a harness
  - recording canvas to play it in the page
  - own-computer JavaFX game with the site's own tests
- **Proposal:** Browser: the model with real hidden tests (movement, wrap-around, collisions, projectile limit, score). Own computer: the full JavaFX game as a project with milestones, graded by GitHub Actions.
- **Recommended:** model in the browser + own-computer JavaFX project

### 6. Maven builds and dependencies, the H2 database through JDBC (java.sql), packaging a runnable jar

- **Category:** cannot run in the browser
- **Where:** 14.4: part14-Part14_10 Database; module libraries-and-tools
- **Why:** Needs dependency resolution, a JDBC driver and a real file system.
- **Options:**
  - browser: a DAO interface with an in-memory implementation and the text UI, graded by stdin/stdout
  - own computer: Maven (or Gradle) starter with JUnit 5 and H2, graded by GitHub Actions; the parts 11-14 reader verified H2 2.5.252 in-memory JDBC under JUnit 5 on JDK 21 locally
- **Proposal:** Both. For the own-computer track use Maven, because 14.4 teaches pom.xml and every MOOC template is a Maven project (license.md line 103); Gradle can be offered as an alternative later. Model it on C/C++ Arena's Pro Track (starter repo, grader workflow, check that the untouched starter fails; ref-core.md 'pro-track.yml').
- **Recommended:** Maven + JUnit 5 + GitHub Actions

### 7. Learners write their own unit tests (JUnit 4 @Test, assertEquals) and practise test-driven development

- **Category:** needs adaptation (JUnit-in-browser)
- **Where:** 6.3: part06-Part06_13 Exercises; module unit-testing steps 4-5
- **Why:** TMC ships an empty test file and self-reported progress, so the MOOC never verifies the learner's tests (parts 6-10 report). JUnit 4 is EPL 1.0 and JUnit 5 is EPL 2.0 (license.md line 21); bundling adds download size (not measured).
- **Options:**
  - a small site test runner with JUnit-compatible names (org.junit.Test, Assert.assertEquals) that finds @Test methods by reflection
  - bundle the real JUnit 4 jar
  - own-computer Maven + JUnit 5 project graded by GitHub Actions
- **Proposal:** Site mini-runner with JUnit-compatible names so the code transfers unchanged to a real project, graded by mutation (learner tests must pass on the reference and fail on each buggy variant, as C/C++ Arena's Pro Track does, ref-core.md line 276). Needs reflection and annotations in the engine: expected with CheerpJ (OpenJDK class library) but not tested; TeaVM's reflection is limited (rt-teavm.md). Offer the own-computer JUnit 5 project as the follow-up.
- **Recommended:** mini-runner + mutation grading; own-computer JUnit 5 as follow-up

### 8. TMC test machinery: JUnit 4 tests, edu-test-utils (Reflex, MockStdio, @Points), PowerMock/EasyMock constructor mocking, source-file scanning tests

- **Category:** not ported
- **Where:** Most exercises; PowerMock in part04-Part04_01, Part04_02, Part04_15; reflection in 55 of the 80 exercise folders of parts 3-5
- **Why:** TMC tests and templates carry no license and must not be copied; edu-test-utils is LGPL 3.0 (license.md lines 109, 118, 129). PowerMock needs bytecode rewriting that a browser engine is not expected to offer (unverified).
- **Options:**
  - hidden Java harness compiled next to the learner's classes, printing @@PASS/@@FAIL lines like C/C++ Arena
  - site-owned given classes that log constructor and method calls instead of mocks
  - require/forbid source rules extended with occurrence counts and method scope
- **Proposal:** All three; reflection only where the engine supports it, otherwise direct calls plus friendly compile-error mapping.
- **Recommended:** hidden harness + call-logging given classes + extended source rules

### 9. Programs split into several files, read-only given classes, and packages with folders

- **Category:** needs adaptation (multi-file editor)
- **Where:** From 4.1 (part04-Part04_01) on; mandatory from 11.2 (part11-Part11_08 to Part11_10) and in most later exercises
- **Why:** C/C++ Arena's editor holds one file per step (content/lessons/18-c-program.yaml line 58, parts 3-5 report). One Java file cannot hold two package declarations (javac 21, parts 11-14 report).
- **Options:**
  - Phase 1 for parts 4-10: one editor file with one public class and package-private helper classes (compiles with javac 21, parts 6-10 report)
  - Phase 2: tabbed multi-file editor with a file tree, read-only and hidden files, and a New class button
- **Proposal:** Ship the multi-file editor before part 4 content if possible; it is required by part 11. javac accepts files of different packages from one flat list, so the grader need not create folders (parts 11-14 report).
- **Recommended:** multi-file editor with package folders

### 10. Reading files by name (Scanner over Paths.get or File, Files.lines), creating files in the project root, writing, overwriting and appending (PrintWriter, FileWriter), missing-file handling

- **Category:** needs adaptation (in-memory files)
- **Where:** 4.3 (part04-Part04_23 to Part04_31), 7.3 (part07-Part07_07), 10.1 (part10-Part10_09, Part10_10), 10.2 (part10-Part10_13), 11.3, 11.4 (part11-Part11_13)
- **Why:** No real disk; TMC tests write temporary files before each run.
- **Options:**
  - per-test in-memory files (C/C++ Arena's TestCase.files, src/content/types.ts) shown in a file panel
  - a writable virtual file system returned to the harness after the run
- **Proposal:** Both, with fixed (not random) hidden data so expected output is precomputed. Missing files must raise the usual exception type; tests compare exception types or the program's own messages, never OS message text. The file panel also replaces NetBeans' Files tab for part04-Part04_23.
- **Recommended:** per-test in-memory files + writable virtual file system

### 11. Console programs where typed input appears between prompts, and 'the program waits for input'

- **Category:** needs adaptation
- **Where:** Every stdin program, from 1.3 on
- **Why:** Tests feed stdin up front, so the output shows prompts only; MOOC sample outputs interleave typed answers (parts 1-2 report).
- **Options:**
  - stdin up front plus a merged transcript view for display
  - true interactive stdin, only if the engine supports blocking reads in a worker (unverified)
- **Proposal:** Stdin up front for all tests, transcript view for readability, 'Run with my input' box in the playground.
- **Recommended:** stdin up front + transcript view

### 12. Infinite loops, endless demos with Thread.sleep, the NetBeans stop button, runaway recursion

- **Category:** needs adaptation
- **Where:** 2.2 sentinel loops, part05-Part05_01 OneMinute demo, part09-Part09_06 box inside itself
- **Why:** A browser tab must never freeze.
- **Options:**
  - run in a killable Web Worker with a time limit and an output cap (C/C++ Arena uses 3 s and 64 KB per its README, parts 1-2 report)
  - bounded demos instead of endless ones
  - a Stop button
- **Proposal:** All three; translate NoSuchElementException ('asked for more input than the test gave') and StackOverflowError into plain-English hints.
- **Recommended:** worker + limits + Stop button

### 13. Code-style grading with Checkstyle (indentation, braces, naming)

- **Category:** needs adaptation
- **Where:** part01-Part01_25 to part02-Part02_34 (47 exercises) and part08-Part08_02 in the learner repo clones
- **Why:** Checkstyle is a desktop JVM tool run by TMC.
- **Options:**
  - a small in-browser style check
  - real Checkstyle through the Maven plugin in the own-computer track
- **Proposal:** In-browser check shown as a warning on every step, failing only in the 'Blocks and indentation' step, plus a Format button; real Checkstyle in the own-computer projects.
- **Recommended:** in-browser warning + Checkstyle in own-computer projects

### 14. Tests and demos that measure wall-clock time with System.nanoTime

- **Category:** needs adaptation
- **Where:** part07-Part07_05 Searching (binary must be 2x faster), 8.2 and 12.2 performance demos (10 million books, 1,000,000 strings)
- **Why:** Wall-clock timing in a browser is noisy and the data sizes are slow (estimate, not measured).
- **Options:**
  - count operations with instrumented lists or keys
  - scale demos down to about 10,000 to 100,000 items
- **Proposal:** Count get() or equals() calls instead of timing; keep time only as an infinite-loop guard.
- **Recommended:** operation counts

### 15. Random output and seeded sequences

- **Category:** needs adaptation
- **Where:** part06-Part06_12 JokeManager, part11-Part11_12 Sensors, part12-Part12_06 to Part12_08, 13.5 vocabulary, 14.1 dice, 14.3 asteroids
- **Why:** Output differs per run; TMC checks distributions. Seeded sequences differ between engines (TeaVM's nextInt(bound) differs from JDK 21, parts 11-14 report).
- **Options:**
  - property checks (count, range, uniqueness, coverage over many draws)
  - the class accepts a Random so the harness can inject a seeded or fake one
- **Proposal:** Both; any exact seeded output shown to learners is generated on the site's own engine.
- **Recommended:** property checks + injected Random

### 16. NetBeans and TMC features: download/submit, the sout+Tab template, auto-format, New Java Class/Package/Interface/Enum dialogs, Files tab, Insert Code (constructors, getters, equals/hashCode), debugger, installing openjfx

- **Category:** not ported (replaced by site features)
- **Where:** 1.1, 1.2 (part01-Part01_01 Sandbox, Part01_04 Dinosaur), 1.6, 4.1 (Part04_03), 4.3 (Part04_23), 5.4, 6.3, 8.3, 9.2, 10.3, 11.2, 13.1
- **Why:** They are IDE features, not Java.
- **Options:**
  - site equivalents: Run and Check buttons, a sout snippet, a Format button, New class button, file tree, Stop button
  - text recipes (Objects.equals/Objects.hash for equals/hashCode)
  - IDE setup only in own-computer project READMEs
- **Proposal:** Site equivalents and text recipes; platform setup only in own-computer READMEs.
- **Recommended:** site equivalents

### 17. The MOOC's code-state visualizations, memory drawings, class diagram images, quizzes, research questionnaires and self-reflection surveys

- **Category:** not ported
- **Where:** Across all parts (for example 15 visualizations in parts 1-2; 1.4 and 2.3 research forms; survey quizzes in every summary section)
- **Why:** They are the MOOC's own material (CC BY-NC-SA 4.0 for course text; quiz bodies are not in the repository).
- **Options:**
  - the site's own traces recorded at build time (the Java counterpart of C/C++ Arena's gdb tracer, tool not chosen)
  - the site's own predict/compiles/bug drills
  - class diagrams drawn from a text notation as inline SVG
- **Proposal:** Replace with the site's own traces, drills and diagrams; summary sections become short closing reading cards.
- **Recommended:** own traces, drills and diagrams

### 18. Extra modules that use Java 14-21 syntax (records, switch expressions, text blocks, sealed types, pattern matching)

- **Category:** runtime-dependent
- **Where:** extra modules records, switch-and-text, sealed-and-patterns
- **Why:** They need an in-browser javac and runtime for Java 16/17/21. CheerpJ 4.3 runs Java 8, 11 and 17, its 11/17 images have no javac (a Java 17 javac looks feasible but is unverified), and Java 21 is only planned (rt-cheerpj.md sections 2 and 4.2). The MOOC itself needs only Java 8 (rt-cheerpj.md section 2).
- **Options:**
  - run in the browser once the engine compiles the needed version
  - own-computer mini projects (JDK 21 + Maven + GitHub Actions) until then
- **Proposal:** Keep these modules optional and gate each step on the engine's Java version; fall back to own-computer projects.
- **Recommended:** gate by engine version, own-computer fallback

## Runtime fidelity requirements (run in the browser only if the engine matches the JDK)

- Double.toString formatting (5.0, 4.333333333333333, 40.199999999999996, 1.0E7) and 32-bit int overflow (100000 * 100000 prints 1410065408): verified on JDK 21 by the parts 1-2 and 3-5 readers.
- HashMap/HashSet iteration order: MOOC sample outputs do not match JDK 21 (parts 6-10 report); grade such output as a multiset or specify LinkedHashMap/TreeMap order.
- Integer cache (== true for 100, false for 1000), remove(int) vs remove(Object), String.split regex semantics, fail-fast iterators (ConcurrentModificationException), StackOverflowError, UTF-8 round trips, ClassName@hash default toString.
- Exception output: JDK 21 messages ('Index 3 out of bounds for length 3', helpful NPE messages with -g) differ from the MOOC's Java 8 era text; CheerpJ is reported to print stack traces without line numbers and to drop some VM messages (rt-cheerpj.md section 1). Tests compare exception types, not message text.
- String concatenation: javac 9+ emits invokedynamic; an engine without StringConcatFactory needs -XDstringConcat=inline or --release 8 (verified by the parts 1-2 reader).
- Rule for all of the above: pick one Java major version, compute every expected output by running the reference solutions on the same engine the site uses (CI in a real browser), and never copy MOOC sample outputs.

## Completeness critic (changes after the synthesis)

Checks: `python3 /home/user/ref/research/critic/check_map.py` (exercise coverage, duplicates, unknown ids, section files, module ids, step counts, module order) and `python3 /home/user/ref/research/critic/headings.py` (every heading named in a step). Fix script: `/home/user/ref/research/critic/fix.py`; the pre-critic map is kept at `critic/map-before.json`.

- Part 8 module order made faithful: 8.4 grouping steps (DictionaryOfManyTranslations, StorageFacility) and the 8.5 summary moved out of 'hash-maps' (which had placed them before 8.3) into a new module 'grouping' after 'equals-hashcode', with 2 new site-only steps (4 steps total).
- charts: steps 1 and 2 swapped so Shanghai (14.1's first exercise, a line chart) comes before FinnishParties, as in the MOOC; the remaining CyclingStatistics/UnfairAdvertisement inversion is documented in the note.
- Part 6 order made faithful: section 6.4 and its step 'One responsibility per class' moved from the end of 'text-ui' (before 6.3) to the end of 'unit-testing' (after 6.3); text-ui now has 7 steps, unit-testing 6.
- packages and reading-input: notes now state the deliberate in-module exercise reorders (TheThreePackages before FirstPackages; MessageThreeTimes before HiAdaLovelace).
- list-and-map-internals: browser changed from in-browser to in-browser-with-adaptation (multi-class), consistent with the reader's 'needs-adaptation, two classes' verdict for Part12_05 HashMap and with how other multi-class modules are classed.
- recursion note corrected: 'recursi' has 2 hits outside comments (9.2 example data), and the MOOC has implicit recursion in 9.2 InterfaceInABox (box inside a box, box inside itself); the extra module now points to it.
- topics filled for 194 MOOC steps that had none (all of parts 6 to 14, modules objects-with-lists to libraries-and-tools); every '##'/'###' heading of the outline is now named in a step's topics; 3 exact 1.2/1.3/1.4 headings added; 17 practice-only steps of parts 1 to 5 now name what they practise; extra-module steps get an empty topics list.
- sorting-searching step 6 now records that 7.2 introduces pseudocode (binary search pseudocode); flowcharts do not occur in the MOOC (0 hits).

Remaining deliberate order differences inside modules (documented in the module notes): MessageThreeTimes before HiAdaLovelace (reading-input), TheThreePackages before FirstPackages (packages), CyclingStatistics before UnfairAdvertisement (charts). The System.out.print hint box of 2.1 is taught in `printing` (documented there).
