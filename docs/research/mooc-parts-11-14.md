# Java MOOC Parts 11 to 14 mapped to Java Arena modules

Agent: mooc-parts-11-14. Research only; no site code. Scope: Java Programming II parts 11, 12, 13 and 14 (`/home/user/ref/java-programming/data/part-11` to `part-14`).

## Summary

- 21 MOOC sections, 46 visible programming exercises (tmc ids), mapped to 15 modules with 96 steps. Every tmc id is assigned to steps of exactly one module (checked by `generate.py`); multi-part exercises are split over consecutive steps of that module.
- Exercise kinds: gui-javafx 19, class 17, multimedia 3, multi-class-program 2, method 2, file-io 1, stdin-stdout 1, tooling 1.
- Browser: cannot-run-in-browser 23, needs-adaptation 15, runs-as-is 8. Parts 11 and 12 are plain Java and all run in the browser (15 of their 23 exercises need adaptation: several classes or package folders, a writable in-memory file system, or property-based grading of random output). Parts 13 and 14 are JavaFX, audio, images and Maven/H2, so all 23 of their exercises are cannot-run-in-browser as written.
- Proposal for parts 13 and 14 (details under Browser issues): split each GUI exercise into a plain-Java core graded in the browser, a site UI/canvas/chart shim so the GUI part is still practised in the page, and optional 'run on your own computer' JavaFX or H2 projects graded by GitHub Actions. I verified locally that a headless TestFX test and an H2 JDBC test run with Maven on JDK 21.
- Sections without exercises (11.5, 12.5, 13.6, 14.5: surveys, quizzes and summaries) are listed in the map and folded into a neighbouring module as closing text; no exercise needed. Small sections with 1 exercise (13.1, 13.4) are folded into the neighbouring GUI module as a step. 11.3 (2 exercises), 11.4 (1), 12.1 (2), 12.4 (2), 14.2 (3), 14.3 (1) and 14.4 (1) are substantive and get their own modules.
- Verified on JDK 21 in this sandbox (`jcheck/`, `fxcheck/`): seeded `Random.nextInt(bound)` sequences differ between the JDK and TeaVM's algorithm; a second `Scanner(System.in)` loses input; one file cannot declare two packages; several MOOC samples do not match their code. See Browser issues.

### Sources used

- MOOC text: `/home/user/ref/java-programming/data/part-11` to `part-14` (English markdown; HTML comments stripped into `/home/user/ref/research/mooc-parts-11-14/stripped/` before reading). Outline and exercise list: `/home/user/ref/mooc-outline.txt` (46 exercises for parts 11 to 14, copied to `ex-list.txt`; the stripped files also contain exactly 46 `<programming-exercise>` tags and 15 quizzes).
- License of the MOOC material: CC BY-NC-SA 4.0 (`/home/user/ref/java-programming/README.md`, section 'Course material'; `data/credits.md` line 47). Media and template licensing: `/home/user/ref/research/license.md` (license research agent).
- How TMC grades parts 11 to 14 and which APIs the templates use: learner repo `https://github.com/remixtures/mooc-java-programming-ii` (sparse clone at commit 68734410, 2021-03-21, in `tmc-ii/`; found with GitHub code search). Its `src/test` folders, `pom.xml` and `.tmcproject.yml` files are the MOOC originals. I read them only to understand grading and APIs (for example TodoDao uses java.sql and H2 1.4.197; CyclingStatistics uses Files.lines and TreeMap; JavaFX tests use TestFX 4.0.15-alpha and Monocle 8u76-b04). Nothing from them is proposed for reuse.
- CheerpJ documentation source: `https://github.com/leaningtech/labs` (blobless clone at commit 2218f66, 2026-09-28, in `labs/`): `sites/labs/src/content/blog/CJ-3-1-roadmap.mdx`, `CJ-4-0.mdx`, `CJ-4-1.mdx`, `sites/cheerpj/src/content/docs/22-changelog.md`, `13-tutorials/00-swingset3.mdx`. cheerpj.com itself is blocked here.
- TeaVM class library: another agent's clone `/home/user/ref/research/rt-teavm/teavm` at commit fd78e03 (2026-09-15): `classlib/src/main/java/org/teavm/classlib/java/util/TRandom.java`, `.../java/util/random/TRandomGenerator.java`, `.../java/io/TPrintWriter.java`, `.../java/io/TFileWriter.java`, `.../java/nio/file/TFiles.java`.
- Maven Central metadata (repo1.maven.org, fetched 2026-09-28): org.openjfx:javafx-controls (21.0.12 is the newest 21.x version listed; saved as `jfx-meta.xml`), org.testfx:testfx-junit5 4.0.18, org.testfx:openjfx-monocle 21.0.2, com.h2database:h2 2.5.252.
- WebFX: `https://raw.githubusercontent.com/webfx-project/webfx/main/LICENSE` (Apache License 2.0); its description (transpiler powered by GWT or TeaVM) is from a WebSearch snippet only.
- C/C++ Arena conventions: `/home/user/antonyperez0/cpp-arena/src/content/types.ts` (Step, Challenge, TestCase with `files` and `args`, require/forbid rules, harness mode), `content/lessons/15-c-files.yaml`, `pro-track/README.md` (own-computer projects graded by CI).
- Checks I ran: `jcheck/RandCheck.java`, `jcheck/TwoScanners.java`, `jcheck/Ex.java`, `jcheck/Grid.java`, `jcheck/Stats.java`, `jcheck/GenArr.java`, `jcheck/pk/` (packages), `jcheck/Two.java` (two packages in one file); `fxcheck/` (Maven project: JavaFX 21.0.12 + TestFX 4.0.18 + Monocle 21.0.2 headless click test, and H2 2.5.252 JDBC test; `mvn test`: 2 tests, 0 failures, Maven 3.9.11, JDK 21, Linux).

## Module map

### `class-diagrams`: Class diagrams

MOOC sections: `part-11/1-class-diagrams.md`. One module for 11.1 (7 exercises, one idea: turn a UML class diagram into code). The site draws its own diagrams (for example SVG generated from a yUML-like text notation); the MOOC images are course material under CC BY-NC-SA 4.0. Multi-class steps need one file with package-private classes or the multi-file editor.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Reading a class box | `part11-Part11_01.Customer` | fill-in-the-blanks, then class (hidden harness plus require rules for private fields) | C1 fill in the field declarations for a box like [Song\|-title:String;-artist:String;-seconds:int]. C2 write a Thermostat class with four attributes of mixed types and a constructor that sets them. C3 a box with a public constant and private fields; forbid public non-final fields. |
| 2 | Constructors and methods in a diagram | `part11-Part11_02.ABookAndAPlane` | class (hidden harness, two classes in one file) | C1 turn +Rectangle(w:double, h:double) and +area():double into code. C2 two unrelated classes (Recipe, Oven) from two boxes. C3 a box with two constructors and a method returning String. |
| 3 | Arrows: one class knows another | `part11-Part11_03.ShowAndTicket` | class (hidden harness, two classes) | C1 an Order that knows its Customer (arrow from Order to Customer). C2 the arrow's label names the field. C3 decide which class gets the field for three given arrows (choice), then implement one. |
| 4 | Stars and two-way connections | `part11-Part11_04.StudentAndUniversity` | class (hidden harness, two classes) | C1 a star: a Playlist holds many Songs in an ArrayList with add(). C2 no arrowheads: a Team knows its Players and each Player knows its Team, kept consistent by addPlayer. C3 many-to-many Courses and Students with enrol(). |
| 5 | Inheritance and abstract classes in diagrams | `part11-Part11_05.ThePlayerAndTheBot` | class (hidden harness) | C1 a Vehicle and a Bicycle subclass from a triangle arrow. C2 the subclass overrides describe() and adds ringBell(). C3 an &lt;&lt;abstract&gt;&gt; Shape with an abstract area() and two subclasses. |
| 6 | Interfaces in diagrams | `part11-Part11_06.SaveablePerson` | class (hidden harness) | C1 write a Printable interface from its box. C2 an Invoice class that implements it (dashed arrow). C3 one class that implements two interfaces from a diagram. |
| 7 | A bigger diagram, and drawing one yourself | `part11-Part11_07.BiggerClassDiagram` | class (hidden harness, multi-file editor recommended); C3 program (stdout) | C1 an inheritance chain with an interface at each level. C2 add a dependency on an interface and a many-to-many pair. C3 reverse direction: given three short classes, print their diagram in the site's text notation (exact stdout). |

### `packages`: Packages and imports

MOOC sections: `part-11/2-packages.md`. Section 11.2 (3 exercises). Needs the multi-file editor with package folders. javac compiles files that declare different packages from one flat folder, as long as each public class is in its own file (checked, JDK 21); one file cannot hold two package declarations.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | The package line and import | `part11-Part11_09.TheThreePackages` | fill-in-the-blanks (multi-file), then class (hidden harness imports the classes) | C1 fill in the package and import lines so a Main in the default package can use shop.model.Item. C2 create three classes in three packages that the harness imports. C3 a nested package (games.cards) used once through import and once by its fully qualified name. |
| 2 | An interface and its implementation in a package | `part11-Part11_08.FirstPackages` | class (hidden harness, multi-file) | C1 an interface Display with void refresh() in app.ui. C2 a ConsoleDisplay in the same package that prints a fixed line. C3 a second implementation that counts how often it was refreshed. |
| 3 | Logic in another package | `part11-Part11_08.FirstPackages` | program (stdout; site-provided Main, then learner Main) | C1 a Worker in app.logic that takes a Display in its constructor. C2 run(n) prints a line and calls refresh() n times. C3 the learner writes Main that wires two displays to two workers. |
| 4 | Package-private access and folders | (no MOOC exercise; site-only step) | compiles drills, then class (hidden harness in the same package) | C1 predict whether calling a package-private method from another package compiles. C2 make a helper visible to its own package only (harness in that package calls it; a source rule forbids public). C3 fix a program only by changing access modifiers. |
| 5 | Domain classes and application logic | `part11-Part11_10.FlightControl` | class (hidden harness, multi-file) | C1 domain classes Train (id, seats) and Route (train, from, to) in rail.domain. C2 a RailControl logic class keeping trains in a HashMap and routes in a list. C3 find a train by id and list the routes of one train. |
| 6 | A text UI in its own package | `part11-Part11_10.FlightControl` | program (stdin/stdout, hidden tests; one Scanner) | C1 a first menu loop that adds trains until 'x'. C2 a second menu that prints trains and routes. C3 the full two-phase program with hidden tests; the task states that only one Scanner may be created. |

### `exceptions`: Exceptions

MOOC sections: `part-11/3-exceptions.md`. Section 11.3 (2 exercises, substantive). Two site-only steps teach try/catch, throws and try-with-resources, which the MOOC teaches without a dedicated exercise.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | try and catch | (no MOOC exercise; site-only step) | fill-in-the-blanks, then program (stdin/stdout) | C1 fill in try/catch around Integer.valueOf so bad input prints an error line. C2 keep asking until a valid number arrives, then print its square. C3 read lines until 'end', sum the valid numbers and count the invalid ones. |
| 2 | Checked exceptions, throws and try-with-resources | (no MOOC exercise; site-only step) | method (hidden harness, in-memory files) | C1 fill in throws Exception so a file-reading method compiles. C2 read all lines of a file with try-with-resources and return an empty list when it is missing. C3 a method that throws and a caller that catches and prints getMessage(). |
| 3 | Throwing IllegalArgumentException from a constructor | `part11-Part11_11.ValidatingParameters` | class (hidden harness checks the exception type) | C1 a Temperature class that rejects values below absolute zero. C2 a Username class: not null, not empty, at most 20 characters. C3 a Booking class with several rules and a clear message for each. |
| 4 | Validating method parameters | `part11-Part11_11.ValidatingParameters` | class (hidden harness) | C1 power(base, exp) rejects a negative exponent. C2 choose(n, k) rejects negatives and k greater than n. C3 average(int[]) rejects null and empty arrays; a caller catches and prints the message. |
| 5 | IllegalStateException in interface implementations | `part11-Part11_12.SensorsAndTemperature` | class (hidden harness, several classes) | C1 an implementation of a Meter interface that is always on. C2 a Meter that throws IllegalStateException when read while off. C3 a random-reading meter; the harness passes a seeded Random and checks the range. |
| 6 | Objects that combine other objects | `part11-Part11_12.SensorsAndTemperature` | class (hidden harness) | C1 a MeterGroup that averages its meters with integer division. C2 throw IllegalStateException when the group is empty or a meter is off. C3 turnOn() turns on every meter. |
| 7 | Exception details: getMessage and stack traces | `part11-Part11_12.SensorsAndTemperature` | class (hidden harness) plus predict drills | C1 catch an exception and print getMessage(). C2 keep a history list of every successful reading. C3 read a printed stack trace from the bottom up and pick the method and line that threw (choice drill). |

### `writing-files`: Writing files

MOOC sections: `part-11/4-processing-files.md`, `part-11/5-conclusion.md`. Section 11.4 (1 exercise in 4 parts) plus the part 11 conclusion (a survey; no exercise needed). Needs a virtual file system that the program writes and the harness reads afterwards.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Writing a file with PrintWriter | (no MOOC exercise; site-only step) | fill-in-the-blanks, then program (in-memory files) | C1 fill in new PrintWriter, println and close. C2 write the numbers 1 to 10 to a file, read it back and print the sum. C3 copy only the non-empty lines of input.txt to output.txt. |
| 2 | Overwrite or append | (no MOOC exercise; site-only step) | program (in-memory files; the harness inspects the file) | C1 append a line to log.txt with FileWriter(name, true). C2 write twice and show one copy (overwrite) vs two (append). C3 write a header only when the file does not exist yet. |
| 3 | A two-way lookup | `part11-Part11_13.SaveableDictionary` | class (hidden harness) | C1 a CodeBook with add(code, meaning) and lookup in both directions. C2 the first mapping wins; later duplicates are ignored. C3 remove(x) deletes the pair whichever side is given. |
| 4 | Loading from a file | `part11-Part11_13.SaveableDictionary` | class (hidden harness, in-memory files) | C1 load key=value lines (the site's own separator) into the lookup. C2 return false when the file is missing instead of crashing. C3 skip blank or malformed lines and report how many pairs were loaded. |
| 5 | Saving and the round trip | `part11-Part11_13.SaveableDictionary` | class (hidden harness reads the saved file) | C1 save() writes each pair once. C2 save() replaces the old content. C3 load, change, save, load again: the harness checks nothing was lost or duplicated. |

### `generics`: Type parameters (generics)

MOOC sections: `part-12/1-type-parameters.md`. Section 12.1 (2 exercises). Three site-only steps cover reading generic types, Pair and generic interfaces, which the lesson teaches with examples only.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Reading type parameters: List&lt;String&gt;, Map&lt;K, V&gt; | (no MOOC exercise; site-only step) | fill-in-the-blanks and compiles drills | C1 fill in the type arguments for a list of scores and a map from names to ages. C2 predict which line fails to compile (adding a String to a List&lt;Integer&gt;). C3 a method that takes a List&lt;Integer&gt; and returns its largest value. |
| 2 | Your own generic class | `part12-Part12_01.Hideout` | fill-in-the-blanks, then class (hidden harness uses it with String and Integer) | C1 fill in &lt;T&gt; in a one-slot Box class. C2 put replaces; take returns the value and empties the box, null when empty. C3 count how many times a stored value was replaced. |
| 3 | A generic class built on ArrayList | `part12-Part12_02.Pipe` | class (hidden harness) | C1 a generic Queue that adds at the back and removes the oldest. C2 remove returns null when empty; hasItems(). C3 peek() and size(), then sum an Integer queue. |
| 4 | Two type parameters | (no MOOC exercise; site-only step) | class (hidden harness) | C1 a Pair&lt;A, B&gt; with getters. C2 swapped() returns a Pair&lt;B, A&gt;. C3 a list of pairs and a method that finds the second value for a given first value. |
| 5 | Generic interfaces | (no MOOC exercise; site-only step) | class (hidden harness) | C1 implement a Container&lt;String&gt; with a fixed type argument. C2 a generic ListContainer&lt;T&gt; implements Container&lt;T&gt; backed by ArrayList. C3 a method that works on any Container&lt;T&gt; through the interface only. |

### `list-and-map-internals`: Building your own list and hash map

MOOC sections: `part-12/2-arraylist-and-hashtable.md`. Section 12.2 (3 exercises; List and HashMap each span several steps). The MOOC exercises have no real tests, so the site writes its own harnesses. Name the classes differently from java.util.List and java.util.HashMap (for example SimpleList, SimpleMap).

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Arrays recap: index ranges and bounds | `part12-Part12_03.SumTheseForMe` | method (hidden harness) | C1 sum the elements between two indexes. C2 clamp indexes that fall outside the array. C3 add only values within [low, high] and handle from greater than to. |
| 2 | A growable list: add and grow | `part12-Part12_04.List` | fill-in-the-blanks, then class (hidden harness) | C1 fill in (T[]) new Object[10] and add(). C2 grow by half when full, copying the elements. C3 capacity() reports the array length after n adds (the harness checks the growth rule). |
| 3 | Finding and removing | `part12-Part12_04.List` | class (hidden harness) | C1 indexOf using equals. C2 remove shifts later elements left. C3 contains built on indexOf; removing a missing value changes nothing. |
| 4 | Index access and size | `part12-Part12_04.List` | class (hidden harness) | C1 get(i) and size(). C2 throw IndexOutOfBoundsException for bad indexes. C3 toString in [a, b, c] form. |
| 5 | Key-value pairs and buckets | `part12-Part12_05.HashMap` | class (hidden harness) | C1 a Pair&lt;K, V&gt; with setValue. C2 the bucket index with Math.abs(hash % n) or Math.floorMod, tested with a key whose hashCode is Integer.MIN_VALUE. C3 get(key) walks one bucket. |
| 6 | Putting: insert or replace | `part12-Part12_05.HashMap` | class (hidden harness) | C1 put a new key. C2 putting an existing key replaces its value. C3 size() counts keys, not calls to put. |
| 7 | Growing the table and removing | `part12-Part12_05.HashMap` | class (hidden harness) | C1 remove(key) returns the old value or null. C2 double the table and rehash when size divided by buckets exceeds 0.75. C3 after 1,000 puts every key is still found and buckets stay short (the harness inspects bucket lengths). |
| 8 | How fast is a lookup? | (no MOOC exercise; site-only step) | method (hidden harness counts equals() calls) | C1 count comparisons for contains on the list. C2 count comparisons for get on the map. C3 print both counts for growing sizes and compare them (no wall-clock timing). |

### `randomness`: Random numbers

MOOC sections: `part-12/3-randomness.md`. Section 12.3 (3 exercises). Output is random, so grading uses property checks or a Random that the harness seeds. Seeded sequences differ between runtimes (see Browser issues), so expected outputs are generated with the site runtime.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Random numbers with nextInt | `part12-Part12_06.Numbers` | program (stdin/stdout; property-checked) | C1 print five numbers from 0 to 9. C2 read a count and print that many dice values from 1 to 6. C3 print a random code of n uppercase letters (length and range checked). |
| 2 | Shifting ranges | `part12-Part12_07.Die` | class (hidden harness: range and distribution) | C1 a Spinner with n sectors returns 1..n. C2 a RangeRandom between min and max inclusive. C3 a thermometer simulator between -40 and 45 (range and coverage checked). |
| 3 | Probabilities with nextDouble | (no MOOC exercise; site-only step) | class (hidden harness with an injected Random) | C1 a biased coin that is true with probability p. C2 three outcomes with cumulative thresholds (for example 10/30/60 percent). C3 a normally distributed value with nextGaussian, cast to int. |
| 4 | Drawing distinct values | `part12-Part12_08.Lottery` | class (hidden harness: size, range, uniqueness) | C1 draw k distinct numbers from 1..n with a contains check. C2 has(x) and redraw(). C3 equals() that treats two draws with the same numbers in any order as equal. |
| 5 | Seeds and pseudo-randomness | (no MOOC exercise; site-only step) | program (stdout) and class | C1 two Random objects with the same seed print the same sequence (expected output generated on the site runtime). C2 pass a Random into a class so tests repeat. C3 simulate 10,000 dice rolls and print whether the average is within 0.1 of 3.5. |

### `multidimensional-arrays`: Two-dimensional arrays

MOOC sections: `part-12/4-multidimensional-data.md`, `part-12/5-summary.md`. Section 12.4 (2 exercises) plus the part 12 summary (a quiz; no exercise needed). All plain Java; runs in the browser.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Rows, columns and nested loops | (no MOOC exercise; site-only step) | fill-in-the-blanks, then program (stdout) | C1 fill in new int[3][4] and the nested loop bounds. C2 print row, column and value for every cell. C3 set given cells and print the grid. |
| 2 | A grid as text | `part12-Part12_09.ArrayAsAString` | method (hidden harness) | C1 join each row's digits and end rows with a line break (StringBuilder). C2 separate values with spaces and pad to equal width. C3 handle jagged arrays whose rows differ in length. |
| 3 | Row sums | `part12-Part12_10.MagicSquare` | method (hidden harness) | C1 the sum of each row of a sales table as a list. C2 the index of the best row. C3 the rows whose sum exceeds a limit. |
| 4 | Column sums | `part12-Part12_10.MagicSquare` | method (hidden harness) | C1 column sums for a non-square table. C2 the largest value in each column. C3 the columns whose values are all equal. |
| 5 | Diagonals and whole-grid checks | `part12-Part12_10.MagicSquare` | method (hidden harness) | C1 main diagonal sum. C2 anti-diagonal sum. C3 check that every row, column and diagonal has the same sum, on the site's own grids. |
| 6 | Filling a grid by rules | `part12-Part12_10.MagicSquare` | method (hidden harness) | C1 fill a grid row by row in snake order. C2 moves that wrap around the edges with modulo. C3 build an odd-sized grid with an up-right move and a step-down fallback (the Siamese construction) and verify it with the previous step's check. |

### `gui-basics`: GUI: windows, components and layouts

MOOC sections: `part-13/1-graphical-user-interfaces.md`, `part-13/2-UI-components-and-layout.md`. Sections 13.1 (1 exercise, folded in as step 1) and 13.2. JavaFX cannot run in a browser runtime today (see Browser issues). Each step is offered (a) in the browser on a site UI shim whose hidden harness inspects the component tree, and (b) optionally as a JavaFX 'run on your own computer' project graded by GitHub Actions.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | A first window | `part13-Part13_01.MyFirstApplication` | UI shim (harness checks the window title) or own-computer JavaFX | C1 fill in a start method that sets a title and shows the window. C2 launch the application from main. C3 build the title in code (for example name plus version). |
| 2 | Scene, layout and components | `part13-Part13_02.ButtonAndLabel` | UI shim (harness checks the children and their order) | C1 add a Label and a Button to a FlowPane. C2 the label must come before the button. C3 create three labels in a loop from a list of strings. |
| 3 | Text input components | `part13-Part13_03.ButtonAndTextField` | UI shim | C1 a Button followed by a TextField in an HBox. C2 a VBox with a Label, a TextField and a Button. C3 a TextArea with preset text and a Button below it. |
| 4 | BorderPane regions | `part13-Part13_04.BorderPane` | UI shim (harness checks the regions) | C1 labels in three regions. C2 all five regions filled. C3 a toolbar HBox at the top and a status label at the bottom. |
| 5 | HBox, VBox, spacing and GridPane | (no MOOC exercise; site-only step) | UI shim | C1 an HBox with spacing 10. C2 a 3x3 GridPane of buttons labelled with their coordinates. C3 a 4x4 keypad built with nested loops. |
| 6 | Nesting layouts | `part13-Part13_05.TextStatistics` | UI shim, plus optional own-computer JavaFX project | C1 a BorderPane with a TextArea in the center and an HBox of three labels at the bottom (the site's own texts). C2 add a VBox sidebar on the left. C3 a form: GridPane in the center, an HBox of buttons at the bottom. |

### `gui-events`: GUI: event handling

MOOC sections: `part-13/3-event-handling.md`, `part-13/4-launch-parameters.md`. Sections 13.3 (2 exercises) and 13.4 (1 exercise, folded in as the last step). Event wiring runs on the UI shim (the harness fires events); the text statistics logic is plain Java and runs as-is; launch parameters become program arguments.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Button actions | `part13-Part13_06.Notifier` | UI shim (harness types text and clicks) | C1 fill in setOnAction with a lambda that prints a line. C2 copy a TextField's text into a Label on click. C3 a counter label that increases on each click, with a reset button. |
| 2 | Lambdas and effectively final variables | (no MOOC exercise; site-only step) | compiles drills, then UI shim | C1 predict which handler fails to compile (a reassigned local variable). C2 fix it with a field or a one-element holder. C3 two buttons that share one handler method. |
| 3 | Reacting to typing: ChangeListener | `part13-Part13_07.TextStatisticsPart2` | UI shim (harness changes the text property) | C1 mirror a TextField into a Label as the user types. C2 show the old and the new value. C3 disable a button while the field is empty. |
| 4 | Text statistics as testable logic | `part13-Part13_07.TextStatisticsPart2` | method (hidden harness; runs as-is), then wire it on the shim | C1 count the characters of a text. C2 count words with an explicit rule for empty text and repeated spaces. C3 the longest word (first one on ties), then show all three in labels. |
| 5 | Launch parameters | `part13-Part13_08.UserTitle` | program (program arguments, stdout) in the browser; own-computer JavaFX optional | C1 read --name=value arguments into a Map and print one value. C2 print a default when a key is missing. C3 read a title with a Scanner and open a shim window with that title. |

### `gui-views`: GUI: multiple views

MOOC sections: `part-13/5-multiple-views.md`, `part-13/6-summary.md`. Section 13.5 (5 exercises) plus the part 13 summary (a quiz; no exercise needed). View switching runs on the UI shim; the vocabulary and tic-tac-toe logic are plain Java and run as-is.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Switching scenes | `part13-Part13_09.MultipleViews` | UI shim (harness clicks through the views) | C1 two scenes that swap on a button. C2 three views in a cycle, each with a different layout. C3 a back button that returns to the previous view. |
| 2 | A form view and a result view | `part13-Part13_10.Greeter` | UI shim | C1 a name field and a button that switches to a view with a greeting in the site's own wording. C2 a PasswordField check with an error label. C3 trim the input and refuse empty names. |
| 3 | One frame, changing content | `part13-Part13_11.Joke` | UI shim | C1 a BorderPane with a menu HBox on top and content in the center. C2 three menu buttons that swap the center. C3 default content on start and a highlighted active button. |
| 4 | Separating logic from the UI | (no MOOC exercise; site-only step) | class (hidden harness; runs as-is), then UI shim | C1 an interface for a contact store and an in-memory implementation. C2 a UI class that only uses the interface. C3 swap the implementation without touching the UI. |
| 5 | A practice app: the logic | `part13-Part13_12.VocabularyPractice` | class (hidden harness; seeded Random; runs as-is) | C1 a word-pair store with add and translate. C2 randomWord() from a list kept next to the map. C3 a practice session that counts right and wrong answers. |
| 6 | A practice app: views as classes | `part13-Part13_12.VocabularyPractice` | UI shim, plus own-computer JavaFX project | C1 an InputView whose getView() returns a Parent. C2 a PracticeView that checks an answer and shows feedback. C3 the main application with a menu that switches between them. |
| 7 | A board of buttons and turns | `part13-Part13_13.TicTacToe` | UI shim (harness clicks cells) | C1 a 3x3 GridPane of buttons and a turn label. C2 a click places the current mark and switches turns. C3 clicking an occupied cell changes nothing. |
| 8 | Game logic: detecting the end | `part13-Part13_13.TicTacToe` | class (hidden harness; runs as-is), then wire it on the shim | C1 a Board class with place(row, col) and the current player. C2 winner detection for rows, columns and diagonals. C3 detect a draw and refuse moves after the end. |

### `charts`: Data visualization

MOOC sections: `part-14/1-data-visualization.md`. Section 14.1 (5 exercises). Data preparation (parsing, maps, series, aggregation) runs in the browser with in-memory files; charts are drawn by a site chart shim (a LineChart/BarChart-like API that the page renders) or printed as text bars. Each chart step can also be done as an own-computer JavaFX project. Use the site's own data sets.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | From text rows to numbers | `part14-Part14_02.FinnishParties` | method (hidden harness, in-memory TSV/CSV files) | C1 split a semicolon-separated row and print index: value. C2 parse a tab-separated row into a name and a list of doubles, treating '-' as missing. C3 read a whole file into a Map&lt;String, Map&lt;Integer, Double&gt;&gt;. |
| 2 | A line chart of points | `part14-Part14_01.Shanghai` | chart shim (harness inspects the series) or own-computer JavaFX | C1 add (year, value) points to one series from two arrays. C2 set the x-axis bounds to the data range. C3 axis labels and a chart title. |
| 3 | Several series from a map | `part14-Part14_02.FinnishParties` | chart shim | C1 one series per key of a map. C2 series names taken from the data. C3 skip missing values and keep the years in order. |
| 4 | Series computed from a formula | `part14-Part14_03.SavingsCalculator` | method (hidden harness; runs as-is) | C1 yearly totals of a fixed monthly deposit for 30 years. C2 the same with yearly compound interest. C3 return both series as lists of points (the site's own amounts and rates). |
| 5 | Controls that redraw a chart | `part14-Part14_03.SavingsCalculator` | UI shim or own-computer JavaFX | C1 a Slider with min, max and a value label. C2 redraw the series when the slider moves (listener). C3 two sliders and two series. |
| 6 | Bar charts for categories | `part14-Part14_05.CyclingStatistics` | program (stdout text bars, in-memory CSV) and chart shim | C1 print a text bar chart (one # per unit) for a few categories. C2 aggregate hourly counts into monthly totals from a CSV. C3 switch a given line-chart program to a bar chart. |
| 7 | Honest charts | `part14-Part14_04.UnfairAdvertisement` | choice drills and method (hidden harness) | C1 spot the misleading axis (choice). C2 compute axis bounds that start at zero. C3 bar heights proportional to the values for a given pixel height. |
| 8 | Charts that update: running averages | (no MOOC exercise; site-only step) | method (hidden harness; seeded Random); chart shim optional | C1 the running average of dice rolls. C2 keep only the last 100 points in a list. C3 report whether the average after 10,000 rolls is within 0.05 of 3.5. |

### `drawing-and-images`: Drawing, images and sound

MOOC sections: `part-14/2-multimedia-in-programs.md`. Section 14.2 (3 exercises). Drawing and pixel work run in the browser on a site canvas/picture shim or on plain 2D arrays; sound has no browser exercise and becomes an optional own-computer task. Use the site's own images and sounds, not the MOOC media.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Drawing on a canvas | `part14-Part14_06.Smiley` | canvas shim (harness inspects the draw calls) or a text grid; own-computer JavaFX optional | C1 fill a background rectangle and one circle. C2 a face from ovals and rectangles at given coordinates. C3 a row of n shapes drawn with a loop. |
| 2 | Drawing with the mouse | (no MOOC exercise; site-only step) | canvas shim (harness sends drag events) | C1 draw a dot where the mouse is dragged. C2 use the selected colour. C3 a clear button. |
| 3 | Images as pixel grids | `part14-Part14_07.Collage` | method (hidden harness on a site Picture class or int[][] RGB) | C1 copy a picture pixel by pixel. C2 read the red, green and blue parts of a pixel. C3 turn a picture grey by averaging the channels. |
| 4 | Scaling down | `part14-Part14_07.Collage` | method (hidden harness) | C1 keep every second pixel to halve the size. C2 put the half-size copy in the top-left corner of an empty picture. C3 scale down by any integer factor. |
| 5 | Tiling a picture | `part14-Part14_07.Collage` | method (hidden harness) | C1 repeat a small picture 2x2. C2 n by m tiles. C3 mirror every other tile. |
| 6 | Colour transforms | `part14-Part14_07.Collage` | method (hidden harness) | C1 negative: 1.0 minus each channel (or 255 minus). C2 a different tint per tile. C3 threshold to black and white. |
| 7 | Playing sound (on your own computer) | `part14-Part14_08.Hurray` | reading step plus optional own-computer JavaFX project (AudioClip); no browser exercise | C1 (own computer) a button that plays a short clip. C2 two buttons with two clips. C3 disable the button while the clip plays. In the browser: reading and a quiz only. |

### `asteroids`: Project: an Asteroids-style game

MOOC sections: `part-14/3-larger-application-asteroids.md`. Section 14.3 (1 exercise in 4 parts; parts 1 to 4 map to steps 1-2, 3, 4-5 and 6-8). In the browser the game logic lives in plain Java classes tested by a harness that calls tick() instead of AnimationTimer and passes the set of pressed keys; rendering uses a site canvas shim. The full JavaFX game is an optional own-computer project. It could also be modelled as a C/C++ Arena Project with milestones.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Shapes in a window | `part14-Part14_09.Asteroids` | canvas shim (harness inspects shapes) or own-computer JavaFX | C1 a 600x400 pane with a circle at given coordinates. C2 a triangle polygon moved with translate. C3 a polygon rotated by an angle. |
| 2 | Keys and a game loop | `part14-Part14_09.Asteroids` | class (hidden harness drives tick() with key sets) | C1 a Map of pressed keys updated on press and release. C2 tick() turns left or right by 5 degrees while a key is held. C3 several keys held at once. |
| 3 | Movement vectors | `part14-Part14_09.Asteroids` | class (hidden harness; runs as-is) | C1 an immutable Vector2 with add(). C2 accelerate() adds a small thrust factor times (cos, sin) of the heading. C3 move() adds the velocity to the position on every tick. |
| 4 | One base class for moving things | `part14-Part14_09.Asteroids` | class (hidden harness) | C1 an abstract Body with position, velocity and heading. C2 Ship and Rock extend it with their own shapes. C3 Rock spins a little on every move (override that calls super). |
| 5 | Collisions and many rocks | `part14-Part14_09.Asteroids` | class (hidden harness; seeded Random) | C1 circle-circle collision by distance. C2 a list of rocks at random positions. C3 stop the game when the ship hits any rock. |
| 6 | Staying on screen | `part14-Part14_09.Asteroids` | class (hidden harness) | C1 public static WIDTH and HEIGHT constants. C2 wrap positions around the edges. C3 wrap correctly for negative coordinates. |
| 7 | Projectiles | `part14-Part14_09.Asteroids` | class (hidden harness) | C1 fire a projectile in the ship's heading. C2 at most three projectiles alive. C3 remove projectiles and rocks that collide, using an alive flag and a stream filter. |
| 8 | Score and new rocks | `part14-Part14_09.Asteroids` | class (hidden harness; seeded Random), then own-computer JavaFX project | C1 add points per hit. C2 spawn a rock with a given probability per tick unless it would hit the ship. C3 a game-over state that ignores input. |

### `libraries-and-tools`: Libraries, Maven and databases

MOOC sections: `part-14/4-maven-and-third-party-libraries.md`, `part-14/5-conclusion.md`. Section 14.4 (1 exercise) plus the course conclusion (a questionnaire; no exercise needed). Maven, H2 and JDBC cannot run in the browser; the DAO pattern and the text UI can. The own-computer project follows the C/C++ Arena Pro Track model (starter repo, GitHub Actions grader).

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Build tools and project layout | (no MOOC exercise; site-only step) | reading plus choice and fill-in drills | C1 match files to src/main/java, src/test/java and pom.xml (choice). C2 fill in a dependency's groupId, artifactId and version. C3 read a dependency coordinate and say what it provides. |
| 2 | Data access objects | `part14-Part14_10.Database` | class (hidden harness; runs as-is) | C1 a NoteDao interface with list, add, markDone and remove by id. C2 an in-memory implementation that assigns increasing ids. C3 list() returns notes ordered by id. |
| 3 | A text UI over a DAO | `part14-Part14_10.Database` | program (stdin/stdout, hidden tests, in-memory DAO) | C1 list and add commands. C2 mark done and remove by id. C3 quit, unknown commands and an empty-list message. |
| 4 | A real database (on your own computer) | `part14-Part14_10.Database` | own-computer project: Maven or Gradle with H2 and JDBC, graded by GitHub Actions | C1 run the given project and its tests locally. C2 implement a JdbcNoteDao with PreparedStatement. C3 data survives a restart (the test opens the database twice). |
| 5 | Packaging, other libraries and what next | (no MOOC exercise; site-only step) | reading step (no exercise needed) | C1 (optional, own computer) build a runnable jar. C2 a quiz on libraries and where to find them. C3 course wrap-up: next topics such as build automation, testing, web programming and Android. |

## Sections and exercises

### part-11/1-class-diagrams.md: Class diagrams (part 11)

Teaches: UML class box: class name on top, attributes as name:Type, + for public and - for private; constructors and methods listed below the attributes with parameter and return types; a class diagram shows structure, not behaviour; associations: an arrow shows which class holds a reference to the other; an optional label names it; multiplicity: a star means a list (ArrayList) of the other class; no arrowhead means both classes know each other; stars on both ends for many-to-many; inheritance: solid line with a triangle pointing to the parent; &lt;&lt;abstract&gt;&gt; and italics for abstract classes and methods; interfaces: &lt;&lt;interface&gt;&gt; and a dashed line with a triangle for implements; diagrams are sketching tools (yUML, draw.io, Creately); draw at a useful level of abstraction.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part11-Part11_01.Customer` | Customer | class | runs-as-is | class-diagrams / step 1 | One class with three private String fields read from a class box; no constructor or methods required. TMC CustomerTest checks field names, types and the private modifier with edutestutils Reflex, getDeclaredFields and Modifier.isPrivate (learner repo clone). Site: draw its own diagram and grade with require rules (private fields) plus a harness that uses a constructor/getters that the site's own diagram lists. |
| `part11-Part11_02.ABookAndAPlane` | Book and plane | class | needs-adaptation | class-diagrams / step 2 | Two unrelated classes from two boxes. Multi-class: one editor file with package-private classes works (javac 21), or the multi-file editor. |
| `part11-Part11_03.ShowAndTicket` | Show and ticket | class | needs-adaptation | class-diagrams / step 3 | Two classes and a one-way association: the class at the tail of the arrow gets a field of the other type. Multi-class. |
| `part11-Part11_04.StudentAndUniversity` | StudentAndUniversity | class | needs-adaptation | class-diagrams / step 4 | Two classes, a connection without arrowheads and a star: one side holds an ArrayList, the other a single reference. Multi-class. |
| `part11-Part11_05.ThePlayerAndTheBot` | The Player And the Bot | class | needs-adaptation | class-diagrams / step 5 | Inheritance: subclass overrides one method and adds another. The MOOC supplies no model answer (nocoins). Multi-class. |
| `part11-Part11_06.SaveablePerson` | Saveable person | class | needs-adaptation | class-diagrams / step 6 | An interface with three methods and a class that implements it with two private fields. Multi-class (interface + class). |
| `part11-Part11_07.BiggerClassDiagram` | Bigger class diagram | class | needs-adaptation | class-diagrams / step 7 | Five classes and three interfaces: implements arrows, an extends chain, a dependency on an interface and a many-to-many pair. TMC BiggerClassDiagramTest uses Reflex and Modifier.isInterface (learner repo clone). Multi-file editor recommended. |

### part-11/2-packages.md: Packages (part 11)

Teaches: packages group related classes and are folders in the file system; the package declaration at the top of a file; nested packages such as library.domain; import statements (after the package line) make classes of other packages available; nearly all later MOOC exercises use packages; directory structure: src/main/java/&lt;package path&gt; in a Maven project; access modifiers: public, private and package-private (no modifier) visibility; a larger example (flight control): domain, logic and ui packages; classes for problem-domain concepts; a text UI that uses the logic class and a single Scanner.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part11-Part11_08.FirstPackages` | First packages (3 parts) | multi-class-program | needs-adaptation | packages / step 2, step 3 | An interface and an implementing class in mooc.ui, a logic class in mooc.logic that takes the interface in its constructor, and a Main in the default package; stdout alternates two fixed lines. Needs a multi-file editor with package paths. |
| `part11-Part11_09.TheThreePackages` | Three packages | class | needs-adaptation | packages / step 1 | Three empty classes in packages a, b and c; the test only checks they exist. Needs a multi-file editor: one Java file cannot hold two package declarations (javac 21: 'class, interface, enum, or record expected'). |
| `part11-Part11_10.FlightControl` | FlightControl (2 parts) | multi-class-program | needs-adaptation | packages / step 5, step 6 | Two-phase menu text UI (asset control, then flight information) over airplanes (id, capacity) and flights (plane, departure, destination) in domain/logic/ui packages. Worth two points. TMC test feeds input and checks that output contains expected lines, and requires a public Main in the named package (learner repo clone). The task demands a single Scanner: a second Scanner on System.in loses buffered input (checked, JDK 21). Graded by stdin/stdout on the site; multi-file. |

### part-11/3-exceptions.md: Exceptions (part 11)

Teaches: what exceptions are (NullPointerException, IndexOutOfBoundsException); try { } catch (Exception e) { } around Integer.parseInt and NumberFormatException; a read-until-valid loop that returns from inside the try block; try-with-resources for files (Scanner over a File); checked vs unchecked exceptions; throws in a method declaration; main throws Exception; throw new IllegalArgumentException to validate constructor and method parameters; interface methods that declare throws Exception and their implementations; exception details: getMessage, printStackTrace, reading a stack trace from the bottom up; IllegalStateException when an object is in the wrong state (exercise).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part11-Part11_11.ValidatingParameters` | Validating parameters (2 parts) | class | runs-as-is | exceptions / step 3, step 4 | Add IllegalArgumentException checks to a Person constructor (name not null, not empty, at most 40 chars; age 0 to 120) and to Calculator methods (factorial of a non-negative number; binomial coefficient with valid sizes). Each part is one class, so each site step stays single-class; the harness asserts the exception type. |
| `part11-Part11_12.SensorsAndTemperature` | Sensors and temperature (4 parts) | class | needs-adaptation | exceptions / step 5, step 6, step 7 | Given interface Sensor; StandardSensor (always on), TemperatureSensor (random -30..30, IllegalStateException when off), AverageSensor (integer average of its sensors, IllegalStateException when off or empty, readings() list) in package application. Multi-class plus randomness: property checks on the range, or a Random/fixed-value sensors supplied by the harness. |

### part-11/4-processing-files.md: Processing files (part 11)

Teaches: recap of reading files (part 4); PrintWriter: println vs print, close() to flush and save; the PrintWriter constructor throws a checked exception: handle it or declare throws; writing replaces existing content; FileWriter for appending; a class that loads from and saves to a file named in its constructor.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part11-Part11_13.SaveableDictionary` | Saveable Dictionary (4 parts) | file-io | needs-adaptation | writing-files / step 3, step 4, step 5 | Two-way dictionary: add/translate/delete in both directions, load() from word:translation lines returning a boolean, save() writing each pair once and replacing the old content, in package dictionary. TMC test writes the word file with FileWriter before calling load (learner repo clone). Needs a virtual file system that the learner program writes and the harness reads afterwards; Scanner over a File and PrintWriter(String) must exist in the runtime. |

### part-11/5-conclusion.md: Conclusion (part 11)

Teaches: self-reflective survey on the learning goals of part 11 (quiz only).

No programming exercises (quiz or survey only). Folded into `writing-files` as closing text; no exercise needed.

### part-12/1-type-parameters.md: Type parameters (part 12)

Teaches: what a generic type parameter is; why ArrayList&lt;String&gt; and HashMap&lt;K, V&gt; take types; defining a generic class (a one-slot locker &lt;T&gt;) and creating objects with the diamond &lt;&gt;; several type parameters (a Pair&lt;T, K&gt;); generic interfaces: implementing with a concrete type argument or keeping the implementation generic; implementing a generic class on top of ArrayList&lt;T&gt;.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part12-Part12_01.Hideout` | Hideout | class | runs-as-is | generics / step 2 | Generic holder of one object: put replaces, take returns and empties (null when empty), and a boolean method reports whether something is stored. The MOOC says there are no tests (the template has one placeholder test, learner repo clone); the site writes its own harness. |
| `part12-Part12_02.Pipe` | Pipe | class | runs-as-is | generics / step 3 | Generic FIFO backed by ArrayList: put, take the oldest or null, has-values check. No real MOOC tests; site harness. |

### part-12/2-arraylist-and-hashtable.md: ArrayList and hash table (part 12)

Teaches: array recap: fixed length, indexes, length, loops; a generic growable list: (Type[]) new Object[10], a first-free-index counter, growing by 1.5x by copying; contains with equals, indexOfValue, remove by shifting left, value(index) with an index exception, size; a hash map: Pair&lt;K, V&gt;, an array of lists (buckets), Math.abs(hashCode % length) as the bucket index; get, add (insert or replace), grow and rehash above load factor 0.75, remove; search performance: list contains vs hash map lookup, timed with System.nanoTime.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part12-Part12_03.SumTheseForMe` | Sum these for me | method | runs-as-is | list-and-map-internals / step 1 | Static sum over an index range with clamping of out-of-range limits and a value filter. |
| `part12-Part12_04.List` | List (2 parts) | class | runs-as-is | list-and-map-internals / step 2, step 3, step 4 | Implement the lesson's generic list. No real MOOC tests (placeholder only, learner repo clone). The name clashes with java.util.List, so the site names its class differently. javac prints an unchecked-cast note for (T[]) new Object[n]; the site must show it without failing. |
| `part12-Part12_05.HashMap` | Hash map (3 parts) | class | needs-adaptation | list-and-map-internals / step 5, step 6, step 7 | Generic hash map with ArrayList buckets and a Pair class (two classes; one file works). No MOOC tests. Name clash with java.util.HashMap. |

### part-12/3-randomness.md: Randomness (part 12)

Teaches: java.util.Random and nextInt(bound) giving 0..bound-1; shifting ranges (nextInt(81) - 30 for -30..50); nextDouble for probabilities; cumulative thresholds for several outcomes; nextGaussian and casting a double to int; drawing distinct numbers with a contains check; pseudorandomness vs true randomness (RANDU, physical sources).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part12-Part12_06.Numbers` | Numbers | stdin-stdout | needs-adaptation | randomness / step 1 | Read a count and print that many numbers in [0, 10]. Output is random: TMC checks the count and that every value 0..10 appears (learner repo clone). Site: property checks (line count, range, coverage for a large count). |
| `part12-Part12_07.Die` | Die | class | needs-adaptation | randomness / step 2 | A die with n faces returns 1..n. TMC checks the range and that each face appears more than 10 times in 1,000 throws (learner repo clone). Site: same property checks, or a Random injected by the harness. |
| `part12-Part12_08.Lottery` | Lottery | class | needs-adaptation | randomness / step 4 | Seven distinct numbers in 1..40, containsNumber, randomizeNumbers, equals. TMC checks size, range, uniqueness and containsNumber (learner repo clone). Property checks. |

### part-12/4-multidimensional-data.md: Multidimensional data (part 12)

Teaches: two-dimensional arrays new int[rows][columns]; default value 0; nested loops over rows (array.length) and columns (array[row].length); setting and reading cells [row][column]; array literals; building a grid string with StringBuilder; row, column and diagonal sums; building odd-sized magic squares with the Siamese method; arrays vs hash tables: speed, memory and growth trade-offs.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part12-Part12_09.ArrayAsAString` | Array as a string | method | runs-as-is | multidimensional-arrays / step 2 | Static method that turns an int[][] into rows of digits separated by line breaks, using StringBuilder. |
| `part12-Part12_10.MagicSquare` | Magic square (4 parts) | class | runs-as-is | multidimensional-arrays / step 3, step 4, step 5, step 6 | Row, column and diagonal sums returned as ArrayList&lt;Integer&gt;, then a factory that builds an odd-sized magic square with the Siamese method. The template gives a partly done grid class; the site gives its own grid class in the harness preamble. |

### part-12/5-summary.md: Summary (part 12)

Teaches: recap: lists and hash maps, generics, randomness, multidimensional data (quiz only).

No programming exercises (quiz or survey only). Folded into `multidimensional-arrays` as closing text; no exercise needed.

### part-13/1-graphical-user-interfaces.md: Graphical user interfaces (part 13)

Teaches: GUIs are built from library components; JavaFX desktop applications; installing openjfx on Linux; TestFX in the exercise templates; macOS accessibility rights for tests; an Application subclass with start(Stage), setTitle, show and launch(App.class); structure: a Stage (window) holds a Scene, which holds a layout (FlowPane) with the components.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part13-Part13_01.MyFirstApplication` | My first application | gui-javafx | cannot-run-in-browser | gui-basics / step 1 | Empty window with a given title launched from main. Browser: UI shim whose harness checks the window title; or own-computer JavaFX project. |

### part-13/2-UI-components-and-layout.md: UI components and their layout (part 13)

Teaches: Label, Button, TextField and TextArea components; setText; adding components to a layout with getChildren().add; FlowPane (wraps), BorderPane (top, right, bottom, left, center); HBox and VBox with setSpacing; GridPane add(node, column, row); nesting layouts (HBox and VBox inside a BorderPane); Oracle's JavaFX UI tutorial as a component reference.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part13-Part13_02.ButtonAndLabel` | Button and label | gui-javafx | cannot-run-in-browser | gui-basics / step 2 | A Label placed before (left of or above) a Button. TMC uses TestFX ApplicationTest (learner repo clone). Browser: UI shim, harness checks children order. |
| `part13-Part13_03.ButtonAndTextField` | Button and TextField | gui-javafx | cannot-run-in-browser | gui-basics / step 3 | A Button placed before a TextField. Browser: UI shim. |
| `part13-Part13_04.BorderPane` | BorderPane | gui-javafx | cannot-run-in-browser | gui-basics / step 4 | Three labels in the top, right and bottom regions of a BorderPane. Browser: UI shim, harness checks the regions. |
| `part13-Part13_05.TextStatistics` | Text statistics | gui-javafx | cannot-run-in-browser | gui-basics / step 6 | A TextArea in the center and an HBox of three labels with initial texts at the bottom. Browser: UI shim. |

### part-13/3-event-handling.md: Event handling (part 13)

Teaches: EventHandler&lt;ActionEvent&gt; and setOnAction; anonymous class vs lambda; handlers that change other components (copy one text field into another); captured local variables must be effectively final; ChangeListener on textProperty() with old and new values; computing statistics (characters, words, longest word) with split and a stream on every change.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part13-Part13_06.Notifier` | Notifier | gui-javafx | cannot-run-in-browser | gui-events / step 1 | VBox with a TextField, a Button and a Label; clicking copies the text into the label. Browser: UI shim where the harness types and clicks. |
| `part13-Part13_07.TextStatisticsPart2` | Text statistics, part II | gui-javafx | cannot-run-in-browser | gui-events / step 3, step 4 | Live statistics through a textProperty listener. The statistics calculation can run as a plain method in the browser. The MOOC's split(" ") counts one word for empty text and empty words for double spaces (checked, JDK 21), so the site must define 'word' explicitly. |

### part-13/4-launch-parameters.md: Application's launch parameters (part 13)

Teaches: launching an Application from another class with Application.launch; passing --key=value strings to launch and reading them with getParameters().getNamed(); parameters for file names or web addresses.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part13-Part13_08.UserTitle` | User's title | gui-javafx | cannot-run-in-browser | gui-events / step 5 | Read a title with a Scanner, then open a window with that title. The MOOC has no automatic tests. Browser alternative: program arguments (--key=value) parsed into a Map and printed (the C/C++ Arena TestCase already has args); own-computer JavaFX optional. |

### part-13/5-multiple-views.md: Multiple views (part 13)

Teaches: several Scene objects and switching with window.setScene from button handlers; a login view with PasswordField, GridPane and StackPane, setPrefSize, setAlignment, Insets and Pos; one permanent BorderPane whose center is swapped from a menu; separating application logic from UI logic (a storage interface used by the UI); a larger application: vocabulary practice with a Dictionary (HashMap + List + Random), view classes returning Parent, and a main application with a menu.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part13-Part13_09.MultipleViews` | Multiple views | gui-javafx | cannot-run-in-browser | gui-views / step 1 | Three scenes (BorderPane, VBox, GridPane) that cycle with buttons. Browser: UI shim, harness clicks through. |
| `part13-Part13_10.Greeter` | Greeter | gui-javafx | cannot-run-in-browser | gui-views / step 2 | A name view and a greeting view. Browser: UI shim. |
| `part13-Part13_11.Joke` | Joke | gui-javafx | cannot-run-in-browser | gui-views / step 3 | A menu of three buttons that swaps the center content. Browser: UI shim. |
| `part13-Part13_12.VocabularyPractice` | Vocabulary practice | gui-javafx | cannot-run-in-browser | gui-views / step 5, step 6 | Two views (enter words, practise). The MOOC has no automatic tests. The dictionary logic runs in the browser as a plain class; the views on the UI shim or on the own computer. |
| `part13-Part13_13.TicTacToe` | Tic-tac-toe (3 parts) | gui-javafx | cannot-run-in-browser | gui-views / step 7, step 8 | 3x3 GridPane of buttons, a turn label and end-of-game detection; the MOOC notes its tests are not detailed. The game logic runs in the browser as a plain class; the board on the UI shim. |

### part-13/6-summary.md: Summary (part 13)

Teaches: recap: windows, components, event handling; the same principles apply to other UI libraries (quiz only).

No programming exercises (quiz or survey only). Folded into `gui-views` as closing text; no exercise needed.

### part-14/1-data-visualization.md: Data visualization (part 14)

Teaches: why visualize data; hourly cycling counts as semicolon-separated text; splitting rows with split(";") and split("\t"); Arrays.asList; LineChart with NumberAxis (bounds and tick unit), XYChart.Series and XYChart.Data, setName, setTitle; reading data into Map&lt;String, Map&lt;Integer, Double&gt;&gt; and adding one series per key; BarChart with CategoryAxis; category order follows insertion; misleading charts (an axis that does not start at zero); dynamic data with AnimationTimer; chart data in an ObservableList updates the chart; keeping the last 100 points; law of large numbers demo with random dice rolls.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part14-Part14_01.Shanghai` | Shanghai | gui-javafx | cannot-run-in-browser | charts / step 2 | Line chart of eleven (year, rank) points, Scene built without a layout. Browser: chart shim (harness inspects the series) or text output. |
| `part14-Part14_02.FinnishParties` | Finnish parties | gui-javafx | cannot-run-in-browser | charts / step 1, step 3 | Read a TSV file and draw one series per party ('-' marks missing values). The parsing is file-io that runs in the browser with in-memory files; the chart on the shim or own computer. |
| `part14-Part14_03.SavingsCalculator` | Savings calculator (3 parts) | gui-javafx | cannot-run-in-browser | charts / step 4, step 5 | Two Sliders with labels and a LineChart over 30 years; savings without and with yearly compound interest. The series formula runs as a plain method in the browser: (saved + 12 * monthly) * (1 + rate / 100) reproduces the MOOC's 630, 1291.5, 1986.075 (checked, JDK 21); the site uses its own amounts. |
| `part14-Part14_04.UnfairAdvertisement` | Unfair Advertisement | gui-javafx | cannot-run-in-browser | charts / step 7 | Make a misleading bar chart fair; no automatic tests and no model answer. Browser: choice drills plus a method that computes honest axis bounds. |
| `part14-Part14_05.CyclingStatistics` | Cycling statistics | gui-javafx | cannot-run-in-browser | charts / step 6 | Change a given application from a line chart to a bar chart. The template reads a CSV with Files.lines and aggregates with streams and TreeMap (learner repo clone). Browser: aggregation with in-memory CSV plus text bars or the chart shim. |

### part-14/2-multimedia-in-programs.md: Multimedia in programs (part 14)

Teaches: Canvas and GraphicsContext: setFill, fillOval; drawing on mouse drag; ColorPicker; Image and ImageView (file: URL); rotate, scale and translate an ImageView; PixelReader, WritableImage and PixelWriter: copy an image pixel by pixel; Color getRed/getGreen/getBlue/getOpacity; AudioClip (javafx.scene.media) played from a JavaFX application; media licensing notes (CC BY images and sounds).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part14-Part14_06.Smiley` | Smiley | multimedia | cannot-run-in-browser | drawing-and-images / step 1 | Draw a smiley with GraphicsContext on a Canvas in a BorderPane; the MOOC test only checks that something was drawn. Browser: canvas shim that records draw calls, or a text grid. |
| `part14-Part14_07.Collage` | Collage (3 parts) | multimedia | cannot-run-in-browser | drawing-and-images / step 3, step 4, step 5, step 6 | Downscale an image by two into the top-left corner, tile it 2x2, and make a negative (1.0 minus each channel). The pixel math runs in the browser on a site picture class or int[][] RGB; use the site's own images. |
| `part14-Part14_08.Hurray` | Hurray | multimedia | cannot-run-in-browser | drawing-and-images / step 7 | A button that plays a WAV file with AudioClip. No browser exercise; optional own-computer task. Do not reuse the MOOC's sound file. |

### part-14/3-larger-application-asteroids.md: Larger application: Asteroids (part 14)

Teaches: Pane for absolute positioning; Circle and Polygon; setTranslateX/Y; origin at the top left, y grows down; rotation with setRotate/getRotate; keyboard events on the Scene (setOnKeyPressed/Released, KeyCode) kept in a Map&lt;KeyCode, Boolean&gt;; AnimationTimer.handle, about 60 calls per second, as the game loop; immutable Point2D for movement; acceleration from Math.cos/Math.sin of Math.toRadians(angle); refactoring into Ship, then an abstract Character class with Ship, Asteroid and Projectile subclasses; collision with Shape.intersect; stopping the timer; random pentagon asteroids (a polygon factory), random direction and spin; wrap-around with public static WIDTH and HEIGHT; at most three projectiles; removal with streams, an alive flag and removeAll; points with Text and AtomicInteger; spawning asteroids with probability 0.005 per frame.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part14-Part14_09.Asteroids` | Asteroids (4 parts) | gui-javafx | cannot-run-in-browser | asteroids / step 1, step 2, step 3, step 4, step 5, step 6, step 7, step 8 | Build the game by following the material; progress is self-reported through partsCompleted(); no model solution (nocoins). Browser: plain-Java game logic (vectors, movement, wrap, collisions, projectiles, score) tested by a harness that calls tick(); rendering on a canvas shim; full JavaFX game as an own-computer project. |

### part-14/4-maven-and-third-party-libraries.md: Maven and third-party libraries (part 14)

Teaches: Maven projects: pom.xml, src/main and src/test; templates do not depend on NetBeans or TMC; libraries and mvnrepository.com; declaring dependencies in pom.xml; using the H2 database through a data access object (DAO) and a text UI; the TelegramBots library as an example (reading only); packaging applications (javapackager, JavaPackager Maven plugin); other environments: JavaFXPorts/Gluon, Android, FXGL.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part14-Part14_10.Database` | Database | tooling | cannot-run-in-browser | libraries-and-tools / step 2, step 3, step 4 | Text UI (list, add, mark done, remove, quit) over a given TodoDao that uses JDBC (java.sql Connection, DriverManager, PreparedStatement, ResultSet) and H2 1.4.197 (learner repo clone); only the UI class is changed. Browser: the same text UI over an in-memory DAO; own-computer project with H2. |

### part-14/5-conclusion.md: Conclusion (part 14)

Teaches: course wrap-up; topics left out (test and deployment automation, build systems, web server programming); final questionnaire.

No programming exercises (quiz or survey only). Folded into `libraries-and-tools` as closing text; no exercise needed.

## Browser issues and proposals

- **JavaFX: all of part 13 (13 exercises), 14.1 charts (5), 14.2 multimedia (3), 14.3 Asteroids (1).** Issue: 22 of the 46 exercises in parts 11 to 14 are JavaFX programs (19 gui-javafx plus the three 14.2 multimedia exercises), graded by TMC with TestFX (testfx-junit 4.0.15-alpha, openjfx-monocle 8u76-b04, javafx-controls 14 in the learner repo pom). No browser Java runtime found runs JavaFX today: the TeaVM clone at fd78e03 has no javafx package or any .java, .kts or .md file mentioning JavaFX; the CheerpJ blog sources say JavaFX is 'not currently supported' (CJ-3-1-roadmap.mdx) and list it as future work (CJ-4-0.mdx, CJ-4-1.mdx), and the CheerpJ changelog up to 4.3 (April 21, 2026) has no JavaFX entry (leaningtech/labs at 2218f66). A WebSearch snippet of cheerpj.com/compatibility claims partial JavaFX support; that page could not be opened (unverified). WebFX (webfx-project/webfx, Apache 2.0 LICENSE fetched from raw.githubusercontent.com) transpiles JavaFX apps at build time (GWT or TeaVM per a WebSearch snippet); it does not compile learner code in the page (not tested). Proposal: Three layers. (1) Logic first: every GUI exercise has a plain-Java core (text statistics, vocabulary store, tic-tac-toe board, savings series, pixel math, game physics) graded in the browser with hidden harnesses. (2) A small site UI shim in the site's own package (for example arena.ui) with JavaFX-like names (Stage/Scene, Label, Button, TextField, TextArea, BorderPane, HBox, VBox, GridPane, setOnAction, textProperty listeners, Canvas, simple charts); it serializes the component tree and draw calls for the page to render as HTML/canvas/SVG, and the harness can click, type and inspect. This is a design proposal (not built or measured). (3) Optional 'run on your own computer' JavaFX projects in the learner's repo, graded by GitHub Actions: verified locally that a headless TestFX test (JavaFX 21.0.12, testfx-junit5 4.0.18, openjfx-monocle 21.0.2, JUnit 5.10.2, Maven 3.9.11, JDK 21, Linux) clicks a button and checks a label; not yet run on GitHub-hosted runners.
- **Audio: part14-Part14_08.Hurray and the 14.2 sound example.** Issue: AudioClip needs JavaFX media; the MOOC's sound files are third-party CC BY 3.0 recordings (license research: do not reuse). Proposal: No browser exercise. Reading step plus an optional own-computer task with the site's own or CC0 sound. If the site later uses a runtime with a JS bridge, a shim Sound.play(name) is possible (not investigated).
- **Images: part14-Part14_07.Collage and the 14.2 image examples.** Issue: Image/ImageView/PixelReader/WritableImage are JavaFX; the MOOC uses a Mona Lisa file and a CC BY 2.0 photo. Proposal: Teach pixels on a site Picture class or int[][] RGB grids given per test; the page renders the result on a canvas. Exact comparisons are easy because the math is integer or fixed. Use the site's own generated or CC0 images.
- **Maven, H2 and JDBC: part14-Part14_10.Database; 14.4 packaging.** Issue: Needs Maven dependency resolution, the H2 driver and java.sql; the MOOC template uses H2 1.4.197 (learner repo pom). Proposal: In the browser: a DAO interface with an in-memory implementation plus the text UI graded by stdin/stdout. Own computer: a Pro-Track-style starter (C/C++ Arena pro-track/README.md model) with Maven or Gradle and a current H2; verified locally that H2 2.5.252 in-memory JDBC (CREATE, INSERT with PreparedStatement, SELECT COUNT) works under JUnit 5 on JDK 21.
- **Packages and multi-file programs: 11.2 (part11-Part11_08, _09, _10), and part11-Part11_12, part11-Part11_13 which use packages.** Issue: From 11.2 on the MOOC says nearly all exercises use packages. A single editor file cannot hold two package declarations (javac 21 error 'class, interface, enum, or record expected'). Proposal: A multi-file editor with a file tree (package folders). The grader can compile all files from one flat list: javac accepts files that declare different packages from one folder (checked, JDK 21); only the public-class-per-file rule matters. Show package-private access errors as teaching moments (javac 21: 'hidden() is not public in TextInterface; cannot be accessed from outside package').
- **Class diagrams: 11.1 (part11-Part11_01 to _07).** Issue: The MOOC shows diagrams as images (course material) and TMC grades with reflection (edutestutils Reflex, getDeclaredFields, Modifier.isPrivate, Modifier.isInterface; learner repo). Proposal: Render the site's own diagrams from a text notation (SVG in the page). Grade with a harness that constructs objects and calls methods named in the site's diagram, plus require/forbid source rules for private fields and implements/extends; use reflection only if the chosen runtime supports it (TeaVM has a TField class in its classlib, but reflection support was not tested).
- **Seeded randomness differs between runtimes: 12.3 (part12-Part12_06, _07, _08), part11-Part11_12, 13.5 vocabulary, 14.1 dynamic data, 14.3 asteroids.** Issue: JDK 21 new Random(42).nextInt(10) gives 0 3 8 4 0 5 5 8 9 3; a Java simulation of the TeaVM classlib algorithm (TRandom.next plus TRandomGenerator.nextInt(bound), teavm at fd78e03) gives 5 7 1 8 4 3 9 8 8 0 (jcheck/RandCheck.java). nextDouble matches. So expected outputs of seeded programs depend on the runtime. Proposal: Grade random programs by properties (count, range, uniqueness, coverage over many draws; TMC does the same) or inject a Random/fake into the class. When an exact seeded output is shown, generate it with the site's runtime, never with desktop Java or from the MOOC.
- **Writing files: 11.4 and part11-Part11_13.SaveableDictionary; also 11.3 try-with-resources.** Issue: Programs create, overwrite and append files and the harness must read them afterwards. TeaVM classlib at fd78e03 has FileWriter(String, boolean) and Files.lines, but no java.util.Scanner class and no PrintWriter(String) or PrintWriter(File) constructor (searched the clone). Missing-file messages are OS text (JDK 21 on Linux: 'missing.txt (No such file or directory)'). Proposal: A per-run virtual file system seeded from TestCase.files and returned to the harness after the run. If TeaVM is used, the site must supply Scanner and the missing PrintWriter constructors (or choose a runtime with the full OpenJDK class library). Never compare getMessage() text of file errors; compare exception types or the program's own messages.
- **Exceptions and stack traces: 11.3.** Issue: Uncaught exceptions print a JVM-style stack trace to stderr and exit with an error; the lesson teaches reading traces with class, method and line numbers. A browser runtime may print traces differently or without line numbers (not verified). Proposal: Harnesses assert exception types (for example IllegalArgumentException) instead of stderr text. For the stack-trace step use a fixed, site-written trace in a choice drill, and show the runtime's own trace in results only as help.
- **One Scanner on System.in: part11-Part11_10.FlightControl, part14-Part14_10.Database and every text UI.** Issue: Checked on JDK 21 with piped input: a second new Scanner(System.in) throws NoSuchElementException because the first one buffered the input (jcheck/TwoScanners.java). The MOOC warns about this only in FlightControl. Proposal: State the one-Scanner rule in every multi-class text UI step, and add a friendly hint when a run fails with NoSuchElementException after a second Scanner was created (source pattern check).
- **Generic arrays and name clashes: 12.2 (part12-Part12_04.List, part12-Part12_05.HashMap).** Issue: (T[]) new Object[n] and new List[n] compile with 'Note: ... uses unchecked or unsafe operations' (javac 21). Class names List and HashMap clash with java.util imports. Proposal: Show javac notes and warnings without failing the run. Name the site's classes SimpleList and SimpleMap (or similar).
- **Hash bucket index: 12.2.** Issue: Math.abs(Integer.MIN_VALUE) stays negative: Math.abs("polygenelubricants".hashCode()) prints -2147483648 on JDK 21 (jcheck/TwoScanners.java). The MOOC's order Math.abs(hash % n) is safe; Math.abs(hash) % n is not. Proposal: Use this as a hidden test case in the bucket step (a key whose hashCode is Integer.MIN_VALUE) and teach Math.floorMod.
- **Performance demo: 12.2 'On search performance'.** Issue: The MOOC builds a list and a hash map of 1,000,000 strings and times 1,000 searches with System.nanoTime (about 6 seconds for the list in its sample). Too slow and noisy in a browser (estimate, not measured). Proposal: Scale down (for example 10,000 items) and count equals() calls with an instrumented key class instead of measuring time.
- **MOOC code and sample outputs with mistakes: 12.4, 11.3, 12.1, 12.2, 13.2, 13.3.** Issue: 12.4: the second 2D-array sample output does not match its code (checked, JDK 21: 0,1,4 / 1,0,8 / 1,1,1, the MOOC prints transposed indexes). 11.3: readLines(fileName) reads the literal "file.txt". 12.1: 'retun' typo in GeneralList. 12.2: the performance code calls hashMap.hae (Finnish name). 13.2: launch(JavaFxSovellus.class) in a class named JavaFxApplication. 13.3: the ChangeListener example uses an undeclared oikeaTeksti. Proposal: Never copy MOOC code or outputs; write and run the site's own examples on the site runtime and use their real output.
- **Word counting: part13-Part13_07.TextStatisticsPart2.** Issue: The MOOC's split(" ") approach counts 1 word for empty text and counts empty strings for repeated spaces (checked, JDK 21: "hello  world" gives 3 parts). Proposal: Define 'word' in the site's task (for example trim(), then split("\\s+"), and empty text has 0 words) and include hidden tests for empty text and repeated spaces.
- **Launch parameters: part13-Part13_08.UserTitle.** Issue: JavaFX launch(App.class, "--key=value") and getParameters().getNamed(); no automatic tests in the MOOC. Proposal: Browser version with program arguments: the C/C++ Arena TestCase type already has args (src/content/types.ts). Parse --key=value into a Map and print; the GUI part on the shim or own computer.
- **Game loop and input: part14-Part14_09.Asteroids.** Issue: AnimationTimer (about 60 frames per second), keyboard events, Shape.intersect and Point2D are JavaFX; the MOOC grades by self-reported partsCompleted(). Proposal: Plain-Java model with an explicit tick(Set&lt;Key&gt; pressed) that the harness calls a fixed number of times; circle-distance collisions; an own Vector2 class. A shim canvas renders it for play. Keep a time limit on every run so an endless loop cannot freeze the page.
- **Exercises with no automatic tests in the MOOC: part12-Part12_01, _02, _04, _05, part13-Part13_08, part13-Part13_12, part14-Part14_04, part14-Part14_09 (self-reported).** Issue: TMC grades these trivially or not at all (placeholder tests in the learner repo, or 'no automatic tests' in the text). Proposal: The site writes full hidden harnesses for the browser versions; for own-computer projects, ship real JUnit/TestFX tests in the starter so GitHub Actions grades them.
- **IDE and platform instructions: 11.2 NetBeans 'New Java Package' and Files tab, 13.1 openjfx install and macOS accessibility rights, 14.4 NetBeans/TMC notes.** Issue: Not applicable in a browser editor. Proposal: Replace with text about folders and package lines in the site's file tree; keep platform setup only in the own-computer project READMEs.

## Java library APIs the runtime must support (parts 11 to 14)

Browser runtime (parts 11 and 12, the plain-Java cores of parts 13 and 14):

- Classes, interfaces (methods declaring throws), abstract classes, inheritance; package declarations and imports across several files; public, private and package-private access
- java.util.ArrayList, List, Collection: add, get, remove(int), remove(Object), contains, size, isEmpty, forEach, removeAll
- java.util.HashMap, Map: put, get, putIfAbsent, containsKey, getOrDefault, keySet, values, entrySet
- java.util.TreeMap (14.1 CyclingStatistics template)
- java.util.Scanner: new Scanner(System.in), nextLine, hasNextLine; new Scanner(new File(name)) inside try-with-resources
- Integer.parseInt, Integer.valueOf, Double.valueOf; autoboxing of Integer and Double
- Exceptions: try/catch, try-with-resources, throws, throw; Exception, RuntimeException, NumberFormatException, IllegalArgumentException, IllegalStateException, NullPointerException, IndexOutOfBoundsException, ArrayIndexOutOfBoundsException, IOException, FileNotFoundException; getMessage, printStackTrace, toString
- java.io.File, java.io.PrintWriter(String fileName): print, println, close; java.io.FileWriter(String, boolean append)
- java.nio.file.Files.lines, java.nio.file.Paths.get
- Generics: generic classes and interfaces with one or two type parameters, diamond &lt;&gt;, (T[]) new Object[n] unchecked cast, raw generic array creation new List[n]
- Object.equals, Object.hashCode, String.hashCode; Math.abs; System.nanoTime
- java.util.Random: new Random(), new Random(seed), nextInt(bound), nextDouble, nextGaussian; Math.random
- Casts (int) and (double)
- Arrays: int[] and int[][] (new int[r][c], literals, length), jagged arrays
- StringBuilder: append, toString; String: split, length, equals, isEmpty
- java.util.Arrays.asList, Arrays.stream; Stream.sorted(Comparator), findFirst().get(), filter, collect, forEach; Collectors.toList, Collectors.toCollection
- Lambdas and anonymous classes (event handlers), effectively final captured variables
- Math.cos, Math.sin, Math.toRadians (14.3)
- java.util.concurrent.atomic.AtomicInteger: get, incrementAndGet, addAndGet (14.3)
- Program arguments String[] args (browser version of 13.4 launch parameters)

Own computer only, or mirrored by a site shim (parts 13 and 14):

- JavaFX (own computer, or mirrored by a site shim): Application (launch, start, getParameters().getNamed()), Stage (setTitle, setScene, show), Scene, Parent, Node (setRotate, getRotate, setTranslateX/Y, getBoundsInLocal)
- JavaFX controls and layouts: Label, Button, TextField, TextArea, PasswordField, Slider, ColorPicker, Text, Font; FlowPane, BorderPane, HBox, VBox, GridPane, StackPane, Pane; Insets, Pos; setSpacing, setPadding, setAlignment, setPrefSize, getChildren().add/addAll
- JavaFX events: EventHandler&lt;ActionEvent&gt;, setOnAction, setOnMouseClicked, setOnMouseDragged, setOnKeyPressed, setOnKeyReleased, KeyCode; ChangeListener, ObservableValue, textProperty().addListener
- JavaFX charts: LineChart, BarChart, NumberAxis (bounds, setAutoRanging), CategoryAxis, XYChart.Series (setName, getData), XYChart.Data; setTitle, setLegendVisible, setAnimated, setCreateSymbols; AnimationTimer
- JavaFX graphics and media: Canvas, GraphicsContext (setFill, fillOval), Color; Image, ImageView, PixelReader, PixelWriter, WritableImage; AudioClip; Polygon, Circle, Shape.intersect; Point2D
- java.sql (own computer): Connection, DriverManager.getConnection, PreparedStatement (setString, executeUpdate, executeQuery, execute), ResultSet, SQLException; H2 JDBC driver

## Coverage check

`generate.py` asserts that the 46 tmc ids from the outline equal the ids in the section tables, that every id appears in at least one step, that a split exercise stays inside one module, that every section file appears in some module's MOOC section list, that module ids are kebab-case without digits, and that every module has 4 to 10 steps. The structured result is in `/home/user/ref/research/mooc-parts-11-14/structured.json`.

| tmc id | Name | Module / steps |
|---|---|---|
| `part11-Part11_01.Customer` | Customer | class-diagrams / 1 |
| `part11-Part11_02.ABookAndAPlane` | Book and plane | class-diagrams / 2 |
| `part11-Part11_03.ShowAndTicket` | Show and ticket | class-diagrams / 3 |
| `part11-Part11_04.StudentAndUniversity` | StudentAndUniversity | class-diagrams / 4 |
| `part11-Part11_05.ThePlayerAndTheBot` | The Player And the Bot | class-diagrams / 5 |
| `part11-Part11_06.SaveablePerson` | Saveable person | class-diagrams / 6 |
| `part11-Part11_07.BiggerClassDiagram` | Bigger class diagram | class-diagrams / 7 |
| `part11-Part11_08.FirstPackages` | First packages (3 parts) | packages / 2, 3 |
| `part11-Part11_09.TheThreePackages` | Three packages | packages / 1 |
| `part11-Part11_10.FlightControl` | FlightControl (2 parts) | packages / 5, 6 |
| `part11-Part11_11.ValidatingParameters` | Validating parameters (2 parts) | exceptions / 3, 4 |
| `part11-Part11_12.SensorsAndTemperature` | Sensors and temperature (4 parts) | exceptions / 5, 6, 7 |
| `part11-Part11_13.SaveableDictionary` | Saveable Dictionary (4 parts) | writing-files / 3, 4, 5 |
| `part12-Part12_01.Hideout` | Hideout | generics / 2 |
| `part12-Part12_02.Pipe` | Pipe | generics / 3 |
| `part12-Part12_03.SumTheseForMe` | Sum these for me | list-and-map-internals / 1 |
| `part12-Part12_04.List` | List (2 parts) | list-and-map-internals / 2, 3, 4 |
| `part12-Part12_05.HashMap` | Hash map (3 parts) | list-and-map-internals / 5, 6, 7 |
| `part12-Part12_06.Numbers` | Numbers | randomness / 1 |
| `part12-Part12_07.Die` | Die | randomness / 2 |
| `part12-Part12_08.Lottery` | Lottery | randomness / 4 |
| `part12-Part12_09.ArrayAsAString` | Array as a string | multidimensional-arrays / 2 |
| `part12-Part12_10.MagicSquare` | Magic square (4 parts) | multidimensional-arrays / 3, 4, 5, 6 |
| `part13-Part13_01.MyFirstApplication` | My first application | gui-basics / 1 |
| `part13-Part13_02.ButtonAndLabel` | Button and label | gui-basics / 2 |
| `part13-Part13_03.ButtonAndTextField` | Button and TextField | gui-basics / 3 |
| `part13-Part13_04.BorderPane` | BorderPane | gui-basics / 4 |
| `part13-Part13_05.TextStatistics` | Text statistics | gui-basics / 6 |
| `part13-Part13_06.Notifier` | Notifier | gui-events / 1 |
| `part13-Part13_07.TextStatisticsPart2` | Text statistics, part II | gui-events / 3, 4 |
| `part13-Part13_08.UserTitle` | User's title | gui-events / 5 |
| `part13-Part13_09.MultipleViews` | Multiple views | gui-views / 1 |
| `part13-Part13_10.Greeter` | Greeter | gui-views / 2 |
| `part13-Part13_11.Joke` | Joke | gui-views / 3 |
| `part13-Part13_12.VocabularyPractice` | Vocabulary practice | gui-views / 5, 6 |
| `part13-Part13_13.TicTacToe` | Tic-tac-toe (3 parts) | gui-views / 7, 8 |
| `part14-Part14_01.Shanghai` | Shanghai | charts / 2 |
| `part14-Part14_02.FinnishParties` | Finnish parties | charts / 1, 3 |
| `part14-Part14_03.SavingsCalculator` | Savings calculator (3 parts) | charts / 4, 5 |
| `part14-Part14_04.UnfairAdvertisement` | Unfair Advertisement | charts / 7 |
| `part14-Part14_05.CyclingStatistics` | Cycling statistics | charts / 6 |
| `part14-Part14_06.Smiley` | Smiley | drawing-and-images / 1 |
| `part14-Part14_07.Collage` | Collage (3 parts) | drawing-and-images / 3, 4, 5, 6 |
| `part14-Part14_08.Hurray` | Hurray | drawing-and-images / 7 |
| `part14-Part14_09.Asteroids` | Asteroids (4 parts) | asteroids / 1, 2, 3, 4, 5, 6, 7, 8 |
| `part14-Part14_10.Database` | Database | libraries-and-tools / 2, 3, 4 |
