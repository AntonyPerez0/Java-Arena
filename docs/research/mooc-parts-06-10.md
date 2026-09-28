# Java MOOC Parts 6 to 10 mapped to Java Arena modules

Agent: mooc-parts-06-10. Research only; no site code. Scope: Java Programming I parts 6 and 7, Java Programming II parts 8, 9 and 10.

## Summary

- 21 MOOC sections, 65 visible programming exercises (tmc ids), mapped to 15 modules with 96 steps. Every tmc id is assigned to steps of exactly one module (checked by generate.py); multi-part exercises are split over consecutive steps of that module.
- Exercise kinds: class 22, method 17, stdin-stdout 11, multi-class-program 9, file-io 4, junit-writing 1, stdout 1.
- Browser: runs-as-is 37, needs-adaptation 28. Nothing in parts 6 to 10 needs JavaFX, audio, Maven or an IDE, so no exercise is classed cannot-run-in-browser. The adaptations are: several classes per exercise, in-memory files, a test runner for learner-written tests (part06-Part06_13), and grading changes for randomness, timing and HashMap order.
- Five sections have no exercises (6.4, 7.4, 8.5, 9.4, 10.4: quizzes and summaries). They are listed in the map and folded into a neighbouring module as lesson or closing text; no exercise needed.
- Part 8.1 repeats five earlier exercises (part04_22, part02_13, part07_01, part07_02, part06_10). It becomes a skippable `recap` module with fresh tasks.
- Verified on JDK 21 (javac/java in this sandbox): several MOOC sample outputs assume a HashMap iteration order that JDK 21 does not produce; see Browser issues.

### Sources used

- MOOC text: `/home/user/ref/java-programming/data/part-6` to `part-10` (English markdown; HTML comments stripped by `/home/user/ref/research/mooc-parts-06-10/strip.py` into `clean/`). Outline: `/home/user/ref/mooc-outline.txt`.
- TDD walkthrough for part06-Part06_13: `/home/user/ref/java-programming/data/slideshows/test-driven-development.pdf` (text decoded to `tdd-slides.txt`).
- How TMC grades parts 6 and 7: learner repo `https://github.com/marceloxreis/mooc-java-programming-i` (sparse clone at commit 977168e in `tmc-i/`; LICENSE is MIT for the learner). How TMC grades parts 8 to 10: learner repo `https://github.com/d-holguin/mooc-java-programming-ii` (sparse clone at commit c7c07b9 in `tmc-ii/`; LICENSE is GPL-3.0 for the learner), found through WebSearch. The `src/test` folders and `.tmcproject.*` files in them are the MOOC's originals. I read them only to understand grading; nothing from them is proposed for reuse.
- C/C++ Arena conventions: `/home/user/antonyperez0/cpp-arena/src/content/types.ts` (Step, Challenge, TestCase with `files`, `require`/`forbid` rules, harness mode) and `content/lessons/*.yaml`.
- Java checks: `/home/user/ref/research/mooc-parts-06-10/jcheck/Main.java`, run with JDK 21.

## Module map

### `objects-with-lists`: Lists inside objects

MOOC sections: `part-6/1-objects-within-objects.md`. One module for section 6.1 (8 exercises, one idea: an object that owns a list). Harness-graded classes; multi-class steps need the single-file or multi-file approach.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | A list as an instance variable | `part06-Part06_01.Menu` | fill-in-the-blanks, then class (hidden harness) | C1 fill in the field declaration and the new ArrayList in the constructor of a Playlist-like class. C2 add() that ignores duplicates. C3 print() and reset() on a guest list. |
| 2 | Adding and taking from the end | `part06-Part06_02.Stack` | class (hidden harness) | C1 isEmpty and add on an undo history. C2 take() returns and removes the newest entry. C3 peek() without removing and a size limit that drops the oldest. |
| 3 | A list of your own objects | `part06-Part06_03.MessagingService` | class (hidden harness, helper class in the harness) | C1 a Playlist of Song objects with add and getSongs. C2 reject songs longer than a limit. C3 count songs by one artist. |
| 4 | toString that describes the contents | `part06-Part06_04.PrintingACollection` | method (hidden harness) | C1 empty vs non-empty text for a shelf of books. C2 correct singular/plural. C3 numbered lines and a total line. |
| 5 | Summing over objects in a list | `part06-Part06_05.SantasWorkshop` | class (hidden harness, two classes) | C1 an Ingredient class with name and grams. C2 a Recipe totalGrams(). C3 averageGrams() returning -1 when empty. |
| 6 | Finding the longest, shortest, tallest | `part06-Part06_06.LongestInCollection`<br>`part06-Part06_07.HeightOrder` | method / class (hidden harness) | C1 longest word or null. C2 cheapest product object, list unchanged. C3 ties: return the first one found. |
| 7 | Taking the smallest out | `part06-Part06_07.HeightOrder` | class (hidden harness) | C1 take() removes and returns the smallest. C2 repeated take() prints ascending order. C3 takeLargest() and a queue that serves the shortest job first. |
| 8 | Limits and the heaviest item | `part06-Part06_08.CargoHold` | class (hidden harness, two classes) | C1 Item and a Backpack that refuses items over its weight limit. C2 toString with 'no items'/'1 item'/'n items'. C3 heaviest() returning null when empty; only two fields allowed. |
| 9 | Objects that hold objects that hold lists | `part06-Part06_08.CargoHold` | class (hidden harness, three classes) | C1 a Truck of Backpacks with a total limit. C2 toString of the truck. C3 printAll() walks two levels of lists. |

### `text-ui`: Separating the UI from program logic

MOOC sections: `part-6/2-separating-user-interface-from-program-logic.md`, `part-6/4-complex-programs.md`. Section 6.2 plus the reading-only section 6.4 (separation of concerns, single responsibility) as the closing step's lesson text; 6.4 has no exercise.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | A UserInterface class with a Scanner | `part06-Part06_09.SimpleDictionary` | program (stdin/stdout; site-provided main) | C1 a start() loop that stops on 'quit' and prints 'Unknown command' otherwise. C2 count the commands entered. C3 case-insensitive commands. |
| 2 | Commands that call a logic object | `part06-Part06_09.SimpleDictionary` | program (stdin/stdout, logic class given) | C1 an 'add' command that asks two follow-up lines. C2 a 'find' command. C3 a friendly message when find returns null. |
| 3 | The logic class first | `part06-Part06_10.TodoList` | class (hidden harness) | C1 a numbered shopping list print (index + 1). C2 remove by the shown number. C3 renumbering after removals. |
| 4 | Wiring UI to logic | `part06-Part06_10.TodoList` | program (stdin/stdout, two classes) | C1 add/list/stop commands. C2 remove by number. C3 reject a number that does not exist. |
| 5 | From one big main to logic plus UI | `part06-Part06_11.Averages` | class (hidden harness) | C1 move grade conversion into a Register class. C2 averageOfGrades returning -1 when empty. C3 keep raw points too and average them. |
| 6 | Extending output without touching logic | `part06-Part06_11.Averages` | program (stdin/stdout, two classes) | C1 print a star histogram from the register. C2 add the two averages to the report. C3 print the best score only when there is one. |
| 7 | Refactoring a main-only program | `part06-Part06_12.JokeManager` | program (stdin/stdout, two classes, seeded Random) | C1 move storage of quotes into a QuoteBook class. C2 random draw that returns a fallback text when empty (graded by property). C3 a menu UI that uses QuoteBook only through its methods. |
| 8 | One responsibility per class | (no MOOC exercise; site-only step) | reading + refactoring challenges (stdin/stdout) | Lesson text from 6.4: separation of concerns and the single responsibility principle. C1 identify which lines are UI and which are logic in a given program. C2 split a word-set program (palindrome counter) into WordSet + UI. C3 add a feature by changing only the logic class. |

### `unit-testing`: Finding bugs and testing

MOOC sections: `part-6/3-introduction-to-testing.md`. Small but substantive module for section 6.3 (1 exercise). Needs a browser test runner for learner-written tests; offer an optional local Maven + JUnit project graded by GitHub Actions.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Reading a stack trace | (no MOOC exercise; site-only step) | program (fix the bug, stdin/stdout) | C1 find the line from an IndexOutOfBoundsException trace and fix it. C2 fix a NullPointerException from an uninitialised list field. C3 fix a NumberFormatException by validating input. |
| 2 | A troubleshooting routine | (no MOOC exercise; site-only step) | program (fix the bug, stdin/stdout) | C1 add debug prints to locate a wrong total, then remove them. C2 an off-by-one loop. C3 a wrong comparison with == on strings. |
| 3 | Feeding test input to a Scanner | (no MOOC exercise; site-only step) | program (stdout) | C1 build new Scanner("...\n...") and run a read loop on it. C2 check the loop stops at the right line. C3 run the same UI class with two different input strings. |
| 4 | Your first unit tests | `part06-Part06_13.Exercises` | junit-writing (learner tests run against a reference and buggy variants) | C1 assertEquals for a new Counter's start value. C2 tests that catch a copy-paste bug in subtract. C3 enough tests to catch three hidden mutants. |
| 5 | Test-driven development | `part06-Part06_13.Exercises` | junit-writing + class (tests first, then implementation) | C1 write a failing test for a TaskManager list, then make it pass. C2 add and mark-done with tests first. C3 refactor to a Task class while all tests stay green. |

### `paradigms`: Procedural and object-oriented programs

MOOC sections: `part-7/1-programming-paradigms.md`. Section 7.1 has 2 exercises but is conceptual (paradigms), so it stays a small module of 4 steps.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | State in variables: a command loop | `part07-Part07_01.LiquidContainers` | program (stdin/stdout; forbid extra methods) | C1 parse 'deposit 20' with split and Integer.valueOf and print the balance. C2 cap the value at a maximum. C3 ignore negative amounts. |
| 2 | Several commands and limits | `part07-Part07_01.LiquidContainers` | program (stdin/stdout) | C1 move an amount between two tanks, limited by what is available. C2 limited by the target's space. C3 a status line after every command. |
| 3 | Objects hold the state | `part07-Part07_02.LiquidContainers2` | class (hidden harness) | C1 a Tank class with add/remove/contains and clamping. C2 toString 'n/max'. C3 a clock made of Hand objects (the MOOC's procedural vs object comparison, own version). |
| 4 | The same UI, now with objects | `part07-Part07_02.LiquidContainers2` | program (stdin/stdout, two classes) | C1 rewrite the command loop using two Tank objects. C2 add a new command without touching Tank. C3 compare the two versions: which lines disappeared from main. |

### `sorting-searching`: Sorting and searching

MOOC sections: `part-7/2-algorithms.md`. Section 7.2. Replace TMC's wall-clock timing test with counted element accesses.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Smallest value and its index | `part07-Part07_03.Sorting` | method (hidden harness) | C1 smallest in an int array. C2 index of the smallest. C3 index of the smallest from a start index. Lesson text covers static vs instance methods. |
| 2 | Swapping two elements | `part07-Part07_03.Sorting` | method (hidden harness) | C1 swap two indices. C2 print with Arrays.toString after swapping. C3 reverse an array using only swap. |
| 3 | Selection sort | `part07-Part07_03.Sorting` | method + stdout (forbid Arrays.sort) | C1 sort using the helper methods. C2 print the array after each round. C3 sort in descending order. |
| 4 | Java's built-in sorting | `part07-Part07_04.ReadymadeSortingAlgorithms` | method (require Arrays.sort / Collections.sort) | C1 sort an int array. C2 sort a String array and an ArrayList<Integer>. C3 sort a list of strings and return the first and last. |
| 5 | Linear search | `part07-Part07_05.Searching` | method (hidden harness) | C1 index of a value in an int array or -1. C2 search objects by an id field. C3 return the last match instead of the first. |
| 6 | Binary search | `part07-Part07_05.Searching` | method (harness counts list accesses) | C1 binary search on a sorted int array. C2 on a sorted list of objects by id, at most about log2(n) get() calls. C3 find the insertion point for a missing value. |

### `larger-programs`: Larger programs

MOOC sections: `part-7/3-larger-exercises.md`, `part-7/4-introduction-to-programming.md`. Section 7.3; the conclusion 7.4 (quiz, end of Java Programming I) becomes the module's closing text. These three exercises could also be offered as Projects with milestones.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Sentinel input and statistics | `part07-Part07_06.GradeStatistics` | program (stdin/stdout) | C1 read scores until -1 and ignore invalid ones, print the average. C2 average of passing scores with '-' when none. C3 pass percentage. |
| 2 | A histogram report | `part07-Part07_06.GradeStatistics` | program (stdin/stdout) | C1 map scores to grades. C2 print one star per result per grade, top grade first. C3 split the program into a statistics class and a UI class. |
| 3 | Loading records from a file | `part07-Part07_07.RecipeSearch` | file-io (in-memory files per test, file name read from stdin) | C1 read a file of blocks separated by blank lines. C2 build one object per block. C3 list them with a formatted line each. |
| 4 | Search commands over loaded data | `part07-Part07_07.RecipeSearch` | file-io + stdin/stdout | C1 find by name substring. C2 find by maximum time. C3 find by exact ingredient. |
| 5 | Design your own classes | `part07-Part07_08.BigYear` | program (stdin/stdout, learner-designed classes) | C1 add and list records in insertion order. C2 count observations and reject unknown names. C3 show one record and handle bad commands. Closing text: Java Programming I checkpoint (7.4). |

### `recap`: Warm-up: recap of parts 1 to 7

MOOC sections: `part-8/1-recap.md`. All five exercises repeat earlier ones (part04_22, part02_13, part07_01, part07_02, part06_10). The site should write fresh tasks for the same skills and let placement or a skip button bypass the module.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Reading until a word, converting numbers | `part08-Part08_01.Cubes` | program (stdin/stdout) | C1 print the square of each number until 'stop'. C2 skip blank lines. C3 print a running total too. |
| 2 | Averages with conditions | `part08-Part08_02.AverageOfPositiveNumbers` | program (stdin/stdout) | C1 average of even numbers until 0. C2 message when there are none. C3 average of numbers in a range. |
| 3 | Commands with arguments and state | `part08-Part08_03.LiquidContainers` | program (stdin/stdout) | C1 'in n'/'out n' on a parking counter with a capacity. C2 status after each command. C3 transfer between two lots. |
| 4 | Pulling state into a class | `part08-Part08_04.LiquidContainers2` | class + program (two classes) | C1 a Lot class with clamping. C2 the same command loop using two Lot objects. C3 toString and a new command. |
| 5 | A logic class with a text UI | `part08-Part08_05.TodoList` | program (stdin/stdout, two classes) | C1 a numbered reading list class. C2 a UI with add/list/remove/stop. C3 mark items done instead of removing them. |

### `hash-maps`: Hash maps

MOOC sections: `part-8/2-hash-map.md`, `part-8/4-grouping-data-using-hash-maps.md`, `part-8/5-fast-data-fetching-and-grouping-information.md`. Sections 8.2 and 8.4 (8.4 has 2 exercises, folded in as grouping steps); 8.5 is a summary quiz used as closing text. Printing tasks that depend on HashMap order are graded order-insensitively.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | put and get | `part08-Part08_06.Nicknames` | fill-in-the-blanks, then program (stdout) | C1 fill in HashMap creation, put and get for three city codes. C2 predict the output when a key is put twice and when a key is missing (null). C3 map values that are objects. |
| 2 | A map inside a class | `part08-Part08_07.Abbreviations` | class (hidden harness) | C1 a Glossary with add/has/explain (containsKey, null when missing). C2 normalise keys with toLowerCase and trim. C3 remove with a message when missing. Lesson text: list scan vs map lookup. |
| 3 | Going through the keys | `part08-Part08_08.PrintMeMyHashmap` | method (output compared as a set of lines) | C1 print all keys. C2 keys containing a substring. C3 values whose keys match. |
| 4 | Going through the values | `part08-Part08_09.PrintMeAnotherHashmap` | method (output compared as a set of lines) | C1 print every value object. C2 only values whose name field contains text. C3 count values meeting a condition. |
| 5 | Numbers as values: getOrDefault and counting | `part08-Part08_10.IOweYou` | class (hidden harness) | C1 a Balance book returning 0 for unknown names. C2 count word occurrences. C3 explain and fix the null-unboxing crash. |
| 6 | A list per key: grouping | `part08Part08_14.DictionaryOfManyTranslations` | class (hidden harness) | C1 HashMap<String, ArrayList<String>> with putIfAbsent. C2 return an empty list for unknown keys. C3 remove a whole key. |
| 7 | Grouping with removals | `part08-Part08_15.StorageFacility` | class (hidden harness, set comparison) | C1 add items to named shelves. C2 remove one occurrence only. C3 drop shelves that become empty and list the rest. Closing text: 8.5 summary. |

### `equals-hashcode`: Comparing objects: equals and hashCode

MOOC sections: `part-8/3-similarity-of-objects.md`. Section 8.3. The NetBeans 'Insert Code' generator is replaced by a step that shows the standard recipe in plain text.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Writing equals | `part08-Part08_11.SameDate` | method (hidden harness) | C1 predict == vs equals output for two objects. C2 equals(Object) for a Point with instanceof and a cast. C3 equals returns false for other types and null. |
| 2 | equals makes contains work | `part08-Part08_13.VehicleRegistry` | method (hidden harness) | C1 list.contains on your own class before and after equals. C2 equals for a two-field code (country + number). C3 avoid adding duplicates to a list. |
| 3 | hashCode and hash maps | `part08-Part08_12.HashedDate` | method (property test on spread and consistency) | C1 hashCode delegating to a String field. C2 combine two fields; equal objects must share a hash. C3 at most N objects per hash over a range of dates. |
| 4 | The standard recipe | (no MOOC exercise; site-only step) | method (hidden harness) | C1 write equals/hashCode with java.util.Objects.equals and Objects.hash. C2 null-safe fields. C3 use the class as a HashMap key. |
| 5 | A registry keyed by your own class | `part08-Part08_13.VehicleRegistry` | class (hidden harness, two classes) | C1 add/get/remove with an object key. C2 print all keys. C3 print unique owners once each. |

### `inheritance`: Inheritance and abstract classes

MOOC sections: `part-9/1-inheritance.md`. Section 9.1 (4 exercises, some with 5 to 7 parts). All exercises have several classes: single-file with package-private classes or a multi-file editor.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | extends | `part09-Part09_01.ABC` | class (hidden harness) | C1 three classes with one method each. C2 make them a chain with extends. C3 call inherited methods through the lowest subclass. |
| 2 | Calling super(...) | `part09-Part09_02.PersonAndSubclasses` | class (hidden harness) | C1 an Employee base class with name and toString. C2 a Manager subclass calling super(name). C3 this(...) chaining between constructors. |
| 3 | Overriding and super.method() | `part09-Part09_02.PersonAndSubclasses` | class (hidden harness) | C1 override toString in a subclass. C2 reuse super.toString() and add a line. C3 a second subclass with its own extra field. |
| 4 | The actual type decides | `part09-Part09_02.PersonAndSubclasses` | method + stdout | C1 print a mixed ArrayList<Base>. C2 predict which toString runs for different variable types. C3 protected helper overridden in a 3D point. |
| 5 | Extending a class you did not write | `part09-Part09_03.Warehousing` | class (hidden harness, given base class) | C1 a NamedTank extends a given Tank. C2 override toString using super.toString(). C3 a setter for the new field. |
| 6 | Composition: a helper object inside | `part09-Part09_03.Warehousing` | class (hidden harness) | C1 a History class wrapping ArrayList<Double> with max/min/average (0 when empty). C2 use it as a field, not a superclass. C3 lesson: when inheritance is the wrong tool (Order is not a Customer). |
| 7 | Overriding to add behaviour | `part09-Part09_03.Warehousing` | class (hidden harness) | C1 override add() to call super and record history. C2 override take(). C3 a printed analysis report. |
| 8 | Abstract classes | `part09-Part09_04.DifferentKindsOfBoxes` | class (hidden harness) | C1 an abstract Shape with an abstract area(). C2 two concrete subclasses. C3 an abstract base with one concrete method that calls the abstract one (like add(list) calling add(item)). |

### `interfaces`: Interfaces

MOOC sections: `part-9/2-interfaces.md`. Section 9.2 (6 exercises). OnlineShop (8 parts) is spread over the last three steps.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Declaring and implementing an interface | `part09-Part09_05.TacoBoxes` | class (hidden harness) | C1 implement a given Counter interface. C2 a second implementation with a constructor parameter. C3 never below zero. |
| 2 | An interface as a type | `part09-Part09_06.InterfaceInABox` | class (hidden harness) | C1 two classes implementing Weighable with toString. C2 an ArrayList<Weighable> of mixed objects. C3 casting back and when it fails. |
| 3 | An interface as a parameter | `part09-Part09_06.InterfaceInABox` | class (hidden harness) | C1 a Crate that accepts any Weighable under a limit. C2 weight() computed from contents, no stored total. C3 a Printer method that accepts any Readable. |
| 4 | A container that is also the interface | `part09-Part09_06.InterfaceInABox` | class (hidden harness) | C1 make Crate implement Weighable. C2 crates inside crates. C3 what happens when a crate contains itself (StackOverflowError) and how to prevent it. |
| 5 | An interface as a return type | (no MOOC exercise; site-only step) | class (hidden harness, seeded Random) | C1 a Factory returning Weighable objects. C2 a Packer that fills a crate from the factory. C3 add a new class without changing Packer. |
| 6 | List, Map and Set as parameter types | `part09-Part09_07.ListAsAMethodParameter`<br>`part09-Part09_08.MapAsAMethodParameter`<br>`part09-Part09_09.SetAsMethodParameter` | method (hidden harness) | C1 a method taking List<String>. C2 a method taking Map<String,Integer>. C3 a method taking Set<String>, called with a HashSet and a keySet(). |
| 7 | Programming against Map and Set | `part09-Part09_10.OnlineShop` | class (hidden harness; require Map-typed fields) | C1 a Stockroom with price lookup and a sentinel for unknown items. C2 stock and take(). C3 products() returning a Set. |
| 8 | A cart of objects | `part09-Part09_10.OnlineShop` | class (hidden harness, two classes) | C1 a LineItem with quantity and price. C2 a Cart total using values(). C3 one line item per product (increase quantity). |
| 9 | The store UI | `part09-Part09_10.OnlineShop` | program (stdin/stdout, several classes, set comparison for listings) | C1 a shop loop that adds to the cart only when in stock. C2 print the cart and total at checkout. C3 two customers in a row share the stockroom. |

### `polymorphism`: Polymorphism

MOOC sections: `part-9/3-object-polymorphism.md`, `part-9/4-conclusion.md`. Section 9.3 has 2 exercises but is a core concept, so it is a small module; 9.4 summary quiz is closing text.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Many types for one object | (no MOOC exercise; site-only step) | method + stdout | C1 a method taking Object that prints anything n times. C2 a method taking CharSequence called with String and StringBuilder. C3 which assignments compile (predict). |
| 2 | Implementing a movement interface | `part09-Part09_11.Herds` | class (hidden harness) | C1 a Drone implementing a given Movable with x/y and toString. C2 move(dx, dy). C3 several drones moved through a Movable variable. |
| 3 | A group that behaves like one member | `part09-Part09_11.Herds` | class (hidden harness) | C1 a Fleet implementing Movable that holds Movables. C2 moving the fleet moves all members. C3 fleets inside fleets. |
| 4 | Abstract class plus interface | `part09-Part09_12.Animals` | class (hidden harness) | C1 an abstract Vehicle with a name and two concrete methods. C2 subclasses with a default-name constructor. C3 a Honkable interface implemented by some subclasses, used through the interface and cast back. |

### `streams`: Streams and lambdas

MOOC sections: `part-10/1-handling-collections-as-streams.md`. Section 10.1 (10 exercises, one theme). Steps require stream/lambda use and some forbid loops.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | From a list to a stream: mapToInt and average | `part10-Part10_01.AverageOfNumbers` | program (stdin/stdout; require stream) | C1 fill in stream().mapToInt(...).average(). C2 average of read numbers after 'end'. C3 count values divisible by a number. |
| 2 | filter with a lambda | `part10-Part10_02.AverageOfSelectedNumbers` | program (stdin/stdout) | C1 average of negatives or positives chosen by a letter. C2 count long words. C3 explain why a lambda cannot change a local counter. |
| 3 | collect into a new list | `part10-Part10_03.PositiveNumbers`<br>`part10-Part10_04.Divisible` | method (hidden harness) | C1 Collectors.toList(). C2 Collectors.toCollection(ArrayList::new) with a multi-condition filter. C3 the original list must stay unchanged. |
| 4 | forEach and printing | `part10-Part10_05.PrintingUserInput`<br>`part10-Part10_06.LimitedNumbers` | program (stdin/stdout) | C1 print all read lines with forEach. C2 print only values in a range. C3 method reference System.out::println. |
| 5 | reduce | (no MOOC exercise; site-only step) | method (hidden harness) | C1 sum with reduce. C2 join strings with a separator. C3 the largest value with reduce. |
| 6 | map, distinct, sorted | `part10-Part10_07.UniqueLastNames` | program (stdin/stdout) | C1 unique first names in alphabetical order. C2 names starting with a letter. C3 lengths of unique words, sorted. |
| 7 | Streams over objects | `part10-Part10_08.Weighting` | class (hidden harness; forbid for/while) | C1 total weight of items with mapToInt().sum(). C2 heaviest with a stream. C3 rewrite a nested-list class with no loops. |
| 8 | Reading a file as a stream of lines | `part10-Part10_09.ReadingFilesPerLine` | file-io (in-memory files per test) | C1 Files.lines(Paths.get(name)) into a List. C2 skip empty lines. C3 print an error message when the file is missing. |
| 9 | Parsing lines into objects | `part10-Part10_10.BooksFromFile` | file-io (in-memory files per test) | C1 split CSV lines and build objects. C2 filter out malformed lines. C3 compute a statistic from the loaded objects. |

### `sorting-objects`: Ordering objects: Comparable and Comparator

MOOC sections: `part-10/2-interface-comparable.md`. Section 10.2 (4 exercises).

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Comparable and compareTo | `part10-Part10_11.WageOrder` | method (hidden harness) | C1 ascending by one int field. C2 descending. C3 sort with Collections.sort and with stream sorted(). |
| 2 | Delegating to String.compareTo | `part10-Part10_12.StudentsOnAlphabeticalOrder` | method (hidden harness) | C1 alphabetical by name. C2 ignore case. C3 a class implementing two interfaces (an id interface and Comparable). |
| 3 | Sorting with a lambda: data from a file | `part10-Part10_13.LiteracyComparison` | file-io (in-memory CSV) | C1 sort objects with a lambda comparator. C2 parse a CSV with trim and sort by a double column. C3 print the lowest five in a fixed format. |
| 4 | Comparator.comparing and thenComparing | `part10-Part10_14.Literature` | program (stdin/stdout) | C1 read records until an empty line and print a count. C2 sort by one key with Comparator.comparing. C3 break ties with thenComparing. |

### `useful-techniques`: StringBuilder, regular expressions, enums and iterators

MOOC sections: `part-10/3-other-useful-techniques.md`, `part-10/4-summary.md`. Section 10.3 (3 exercises but several distinct tools, so 8 steps); 10.4 is a quiz used as closing text. SortThemCards is split over two steps.

| # | Step | Covers (tmc ids) | Exercise type | Challenge ideas (original, 1/2/3) |
|---|---|---|---|---|
| 1 | Building strings with StringBuilder | (no MOOC exercise; site-only step) | method (require StringBuilder, forbid += on String in a loop) | C1 append numbers 1..n. C2 one line per element. C3 a comma-separated list without a trailing comma. |
| 2 | Regular expressions: matches and alternation | `part10-Part10_15.RegularExpressions` | method (hidden harness; require matches) | C1 accept one of a fixed set of words. C2 parentheses for optional endings. C3 student-number-style format. |
| 3 | Quantifiers and character classes | `part10-Part10_15.RegularExpressions` | method (hidden harness) | C1 a string of only certain letters. C2 a 24-hour time hh:mm. C3 a code like two letters, a dash and 3 to 5 digits. |
| 4 | Enums | `part10-Part10_16.EnumAndIterator` | class (hidden harness) | C1 an enum of sizes used in a class field. C2 compare enums with ==. C3 filter a list by enum value. |
| 5 | Enums with fields and ordinal | (no MOOC exercise; site-only step) | class (hidden harness) | C1 an enum with a constructor and a code field. C2 ordinal() for ordering. C3 values() to print all constants. |
| 6 | Iterators and safe removal | `part10-Part10_16.EnumAndIterator` | class (hidden harness; require iterator()) | C1 print with an Iterator. C2 remove matching elements with iterator.remove(). C3 predict the ConcurrentModificationException and fix it. |
| 7 | Ordering with an enum tiebreak | `part10-Part10_17.SortThemCards` | class (hidden harness, several classes) | C1 Comparable by value, then enum ordinal. C2 a Hand that sorts its cards. C3 Comparable<Hand> by the sum of values. |
| 8 | Comparator classes | `part10-Part10_17.SortThemCards` | class (hidden harness) | C1 a Comparator class sorting by one key. C2 by suit then value. C3 the same as a lambda passed to Collections.sort. Closing text: 10.4 summary. |

## Sections and exercises

### part-6/1-objects-within-objects.md: Objects on a list and a list as part of an object (part 6)

Teaches: ArrayList as an instance variable, created in the constructor; methods that add, remove, clear and print a list held by an object; a list of objects (not only strings) as an instance variable; toString built from the list contents, with a separate empty case; summing or averaging a value over the objects in a list (return -1 when empty); finding the tallest/longest object and returning null for an empty list; taking (remove and return) the smallest element; objects that contain objects that contain lists (Item, Suitcase, Hold).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part06-Part06_01.Menu` | Menu (3 parts) | class | runs-as-is | objects-with-lists / step 1 | One class holding an ArrayList<String>; add without duplicates (contains), print, clear. Good first step for fill-in-the-blanks (field + constructor). |
| `part06-Part06_02.Stack` | Stack (2 parts) | class | runs-as-is | objects-with-lists / step 2 | isEmpty, add, values (returns the list), take (remove the last index using size()). Harness checks LIFO order. |
| `part06-Part06_03.MessagingService` | MessagingService | class | runs-as-is | objects-with-lists / step 3 | Given Message class goes in the harness preamble; learner writes one class. Add only if content length is at most 280. |
| `part06-Part06_04.PrintingACollection` | Printing a Collection | method | runs-as-is | objects-with-lists / step 4 | toString of a given class: empty wording, singular 'element' for 1, plural otherwise. |
| `part06-Part06_05.SantasWorkshop` | Santa's Workshop (2 parts) | class | needs-adaptation | objects-with-lists / step 5 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. TMC tests A_GiftTest/B_PackageTest use edutestutils Reflex and getDeclaredFields to require private non-static fields and a field count (learner repo clone); on the site use require/forbid source rules, or reflection if the runtime has java.lang.reflect. |
| `part06-Part06_06.LongestInCollection` | Longest in collection | method | runs-as-is | objects-with-lists / step 6 | Return the longest String, or null when empty. |
| `part06-Part06_07.HeightOrder` | Height Order (3 parts) | class | runs-as-is | objects-with-lists / step 6, step 7 | Room with add/isEmpty/getPersons/shortest/take; Person given in the harness. Repeated take() yields ascending order (preview of selection sort). |
| `part06-Part06_08.CargoHold` | Cargo hold (7 parts) | class | needs-adaptation | objects-with-lists / step 8, step 9 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Item, Suitcase (weight limit, 'no items'/'1 item'/'n items', printItems, totalWeight, heaviestItem) and Hold. Part 4 limits Suitcase to two instance variables: site source rule or reflection check. |

### part-6/2-separating-user-interface-from-program-logic.md: Separating the user interface from program logic (part 6)

Teaches: a UserInterface class that receives a Scanner (and a logic object) in its constructor and has start(); command loops: while (true), read a command, break on the stop command, 'Unknown command'; solving sub-problems one at a time and testing each (stop condition, remembering words); encapsulating a concept in its own class (WordSet wraps an ArrayList; palindromes as a new feature); splitting a main-only program into logic (GradeRegister) and UI (UserInterface); programming tips: small steps, clean code, no copy-paste.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part06-Part06_09.SimpleDictionary` | Simple Dictionary (4 parts) | multi-class-program | runs-as-is | text-ui / step 1, step 2 | Learner writes only TextUI; the given SimpleDictionary (a HashMap wrapper, learner repo template) is a black box in the harness. Graded by stdin/stdout. TMC TextUITest uses @Test(timeout = 200). |
| `part06-Part06_10.TodoList` | To do list (2 parts) | multi-class-program | needs-adaptation | text-ui / step 3, step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. TodoList (numbered print, remove by 1-based number) and UserInterface. The MOOC sample output contains an untranslated Finnish word ('tehty'); write own texts. |
| `part06-Part06_11.Averages` | Averages (3 parts) | multi-class-program | needs-adaptation | text-ui / step 5, step 6 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Learner edits the given GradeRegister and UserInterface. Averages print as full doubles (for example 2.4285714285714284), so the runtime must match JDK Double.toString. |
| `part06-Part06_12.JokeManager` | Joke Manager (2 parts) | multi-class-program | needs-adaptation | text-ui / step 7 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Random draw: TMC JokeManagerTest checks each of two jokes is drawn at least 25 times and uses @Test(timeout = 100) (learner repo clone). Site: property check (drawn joke is one of the stored ones, all appear over many draws) or let the class accept a Random so the harness can seed it. |

### part-6/3-introduction-to-testing.md: Introduction to testing (part 6)

Teaches: software bugs and their consequences (Mars Climate Orbiter units bug); reading a stack trace (exception type, file and line); troubleshooting checklist: indentation, names, test inputs, debug prints, uninitialised variables, debugger; passing test input to a Scanner as a String with \n line breaks; unit testing with JUnit 4: test class, @Test, assertEquals, reading failures; test-driven development: test, fail, implement, pass, refactor.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part06-Part06_13.Exercises` | Exercises (2 parts) | junit-writing | needs-adaptation | unit-testing / step 4, step 5 | Follow the TDD walkthrough (slideshow data/slideshows/test-driven-development.pdf: ExerciseManagement with exerciseList, add, mark completed, then refactor to an Exercise class). The TMC template ships an empty ExerciseManagementTest and MainProgram.partsCompleted() where the learner self-reports progress (learner repo clone), so TMC does not really verify the learner's tests. Site: in-browser mini test runner (JUnit-4-style @Test/assertEquals needs annotations and reflection in the runtime, or a site-provided plain-Java check() helper) and mutation grading (learner tests must pass on the reference and fail on each buggy variant). Optional 'run on your own computer' Maven + JUnit project graded by GitHub Actions. |

### part-6/4-complex-programs.md: Complex programs (part 6)

Teaches: separation of concerns (Dijkstra quote); single responsibility principle (Robert C. Martin); end-of-part quiz (self-reflection).

No programming exercises (quiz or summary only). **No exercise needed**; the text is folded into `text-ui` as lesson or closing text.

### part-7/1-programming-paradigms.md: Programming paradigms (part 7)

Teaches: what a programming paradigm is; object-oriented programming: classes model the problem domain (Simula 67 history); procedural programming: state in variables, methods act on parameters; the same clock written procedurally and with Hand/Clock objects; parsing 'command amount' input with split and Integer.valueOf.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part07-Part07_01.LiquidContainers` | Liquid containers (3 parts) | stdin-stdout | runs-as-is | paradigms / step 1, step 2 | Everything in main. TMC LiquidContainersTest asserts getDeclaredMethods().length == 1 (no extra methods, learner repo clone): site forbid rule on extra method declarations. Caps at 100, clamps at 0. |
| `part07-Part07_02.LiquidContainers2` | Liquid Containers 2.0 (2 parts) | multi-class-program | needs-adaptation | paradigms / step 3, step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Container class (contains, add, remove, toString 'n/100') plus the same UI in LiquidContainers2.main. |

### part-7/2-algorithms.md: Algorithms (part 7)

Teaches: what an algorithm is and why efficiency matters; selection sort built from smallest, indexOfSmallest, indexOfSmallestFrom and swap; static (class) methods vs instance methods; built-in sorting: Arrays.sort and Collections.sort; linear search; binary search on sorted data (pseudocode, slideshow).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part07-Part07_03.Sorting` | Sorting (5 parts) | method | runs-as-is | sorting-searching / step 1, step 2, step 3 | Five static methods on int[]; sort prints Arrays.toString of the array before and after each swap. Site: forbid Arrays.sort/Collections.sort. |
| `part07-Part07_04.ReadymadeSortingAlgorithms` | Ready-made Sorting Algorithms | method | runs-as-is | sorting-searching / step 4 | Four static sort wrappers (int[], String[], ArrayList<Integer>, ArrayList<String>). Site: require Arrays.sort and Collections.sort. |
| `part07-Part07_05.Searching` | Searching | method | needs-adaptation | sorting-searching / step 5, step 6 | Linear and binary search over ArrayList<Book> by id (Book given). TMC SearchingTest times both with System.nanoTime and requires binary to be at least 2x faster on 10,000 books, and checks binary search fails on an unsorted list (learner repo clone). Timing is unreliable in a browser: harness passes an instrumented List that counts get() calls and asserts about log2(n) accesses. |

### part-7/3-larger-exercises.md: Larger programming exercises (part 7)

Teaches: designing your own classes for a larger task with no given structure; sentinel-terminated input, ignoring invalid values, averages and percentages; a star histogram of grades; reading multi-line records from a file (records separated by empty lines); command-driven search over loaded data; a small in-memory database with commands and error handling.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part07-Part07_06.GradeStatistics` | Grade statistics (4 parts) | stdin-stdout | runs-as-is | larger-programs / step 1, step 2 | Stop at -1, ignore values outside 0..100, averages as doubles, '-' when no passing points, pass percentage, star distribution. Template has Points/TextUI classes but TMC only checks main's I/O. |
| `part07-Part07_07.RecipeSearch` | Recipe search (4 parts) | file-io | needs-adaptation | larger-programs / step 3, step 4 | Reads the file whose name the user types. TMC RecipeSearchTest writes a temporary file and feeds its name on stdin (learner repo clone). Site: per-test in-memory files (TestCase.files already exists in C/C++ Arena, src/content/types.ts) and a virtual filesystem behind Scanner/Files/Paths. Write own recipe data. |
| `part07-Part07_08.BigYear` | Big year (3 parts) | multi-class-program | needs-adaptation | larger-programs / step 5 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Free design; only main (class 'mainProgram') is tested. The MOOC sample prints 'All' as Hawk then Crow (HashMap order); JDK 21 HashMap gives Crow, Hawk (checked), so the site spec must fix the order (insertion or alphabetical). |

### part-7/4-introduction-to-programming.md: Conclusion (part 7)

Teaches: recap of Java Programming I (parts 1-7) and certificate note; end-of-part quiz.

No programming exercises (quiz or summary only). **No exercise needed**; the text is folded into `larger-programs` as lesson or closing text.

### part-8/1-recap.md: Short recap (part 8)

Teaches: review of parts 1-7 for learners starting Java Programming II; sentinel loops with string-to-int conversion; conditional averages; command parsing with state, then moving state into a class; logic class plus text UI.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part08-Part08_01.Cubes` | Cubes | stdin-stdout | runs-as-is | recap / step 1 | Same task as part04-Part04_22.Cubes. |
| `part08-Part08_02.AverageOfPositiveNumbers` | Average of positive numbers | stdin-stdout | runs-as-is | recap / step 2 | Same task as part02-Part02_13.AverageOfPositiveNumbers. TMC applies Checkstyle with strategy 'fail' to this folder (.tmcproject.json in the Java II learner repo clone). |
| `part08-Part08_03.LiquidContainers` | Liquid containers (3 parts) | stdin-stdout | runs-as-is | recap / step 3 | Text identical to part07-Part07_01 (diffed). |
| `part08-Part08_04.LiquidContainers2` | Liquid Containers 2.0 (2 parts) | multi-class-program | needs-adaptation | recap / step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Same task as part07-Part07_02. |
| `part08-Part08_05.TodoList` | To do list (2 parts) | multi-class-program | needs-adaptation | recap / step 5 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Same task as part06-Part06_10 (only a 'raisins'/'rasins' spelling difference, diffed). |

### part-8/2-hash-map.md: Hash Map (part 8)

Teaches: HashMap<K,V>: put, get, null for a missing key, import java.util.HashMap; one value per key: put replaces the old value; reference-type values (Book objects) in a map; when to use a map vs a list (lookup speed measured with System.nanoTime); a hash map as an instance variable; sanitising keys with toLowerCase and trim; containsKey and remove; iterating keySet() and values(); losing the speed benefit when scanning; wrapper types and auto-boxing (Integer, Double, Character); null unboxing error; getOrDefault; counting.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part08-Part08_06.Nicknames` | Nicknames | stdout | runs-as-is | hash-maps / step 1 | MOOC says there are no automated tests (NicknamesTest has one empty test, learner repo clone). Site: check the printed value and require HashMap. |
| `part08-Part08_07.Abbreviations` | Abbreviations | class | runs-as-is | hash-maps / step 2 | addAbbreviation, hasAbbreviation (containsKey), findExplanationFor (null when missing). |
| `part08-Part08_08.PrintMeMyHashmap` | Print me my hash map | method | runs-as-is | hash-maps / step 3 | Output order follows HashMap iteration. The MOOC sample shows f.e, etc., i.e; JDK 21 iterates i.e, etc., f.e (checked). TMC test checks with contains (order-insensitive). Site: compare printed lines as a multiset. |
| `part08-Part08_09.PrintMeAnotherHashmap` | Print me another hash map | method | runs-as-is | hash-maps / step 4 | values() of HashMap<String,Book>; Book given. Same order-insensitive comparison. |
| `part08-Part08_10.IOweYou` | I owe you | class | runs-as-is | hash-maps / step 5 | HashMap<String, Double>; missing person returns 0 (getOrDefault or containsKey); overwrite semantics; prints 30.0. |

### part-8/3-similarity-of-objects.md: Similarity of objects (part 8)

Teaches: default equals compares references; String overrides it; writing equals(Object): same reference, instanceof, cast, compare fields; ArrayList.contains relies on equals; hashCode for approximate comparison and HashMap buckets; delegating to String.hashCode; null-safe hashCode; a class used as a HashMap key needs both equals and hashCode; IDE-generated equals and hashCode (NetBeans Insert Code).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part08-Part08_11.SameDate` | Same date | method | runs-as-is | equals-hashcode / step 1 | equals(Object) in a given SimpleDate; equals("heh") must be false. |
| `part08-Part08_12.HashedDate` | Hash for date | method | runs-as-is | equals-hashcode / step 3 | TMC SimpleDateTest: equal dates give equal hashes (1999-2012) and no hash is shared by more than 20 dates over 1900-2100 (about 74,000 dates; learner repo clone). Cheap enough for a browser runtime (estimate, not measured). |
| `part08-Part08_13.VehicleRegistry` | Vehicle Registry (3 parts) | class | needs-adaptation | equals-hashcode / step 2, step 5 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. equals/hashCode in a given LicensePlate plus a VehicleRegistry class (add/get/remove, print plates, print unique owners). Sample contains non-ASCII 'Jürgen': UTF-8 output must survive. |

### part-8/4-grouping-data-using-hash-maps.md: Grouping data using hash maps (part 8)

Teaches: a list as a map value: HashMap<String, ArrayList<String>>; creating the list on first use (putIfAbsent) and appending; categorising data per key (TaskTracker example).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part08Part08_14.DictionaryOfManyTranslations` | Dictionary of many translations | class | runs-as-is | hash-maps / step 6 | The markdown tmcname has no hyphen (typo); the TMC folder is part08-Part08_14.DictionaryOfManyTranslations (learner repo clone). Treat both as the same id. translate returns an empty list for unknown words. |
| `part08-Part08_15.StorageFacility` | Storage facility (2 parts) | class | runs-as-is | hash-maps / step 7 | Remove one item only; drop units that become empty; storageUnits order unspecified, so the harness compares as a set. |

### part-8/5-fast-data-fetching-and-grouping-information.md: Fast data fetching and grouping information (part 8)

Teaches: summary: HashMap for fast lookup and for grouping; self-reflection quiz.

No programming exercises (quiz or summary only). **No exercise needed**; the text is folded into `hash-maps` as lesson or closing text.

### part-9/1-inheritance.md: Class inheritance (part 9)

Teaches: every class extends Object (toString, equals, hashCode); extends, superclass, subclass; single inheritance; private vs protected vs public visibility for subclasses; super(...) in a constructor, this(...) chaining; super.method() inside an override; @Override; the actual type of the object decides which method runs (polymorphism); Point/ColorPoint/Point3D; when inheritance is wrong (Order extends Customer) and composition instead; abstract classes and abstract methods (Operation/PlusOperation/UserInterface).

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part09-Part09_01.ABC` | ABC (2 parts) | class | needs-adaptation | inheritance / step 1 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Three tiny classes, then B extends A and C extends B. |
| `part09-Part09_02.PersonAndSubclasses` | Person and subclasses (5 parts) | class | needs-adaptation | inheritance / step 2, step 3, step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Person, Student (credits, study, toString override), Teacher (salary) and a static printPersons(ArrayList<Person>). |
| `part09-Part09_03.Warehousing` | Warehousing (7 parts) | class | needs-adaptation | inheritance / step 5, step 6, step 7 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. ProductWarehouse extends a given Warehouse; ChangeHistory helper; ProductWarehouseWithHistory overrides add/take to record history and printAnalysis. Prints 10.299999999999955 (reproduced on JDK 21), so Double.toString must match the JDK. |
| `part09-Part09_04.DifferentKindsOfBoxes` | DifferentKindsOfBoxes (3 parts) | class | needs-adaptation | inheritance / step 8 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Abstract Box given; equals/hashCode for Item; BoxWithMaxWeight, OneItemBox, MisplacingBox. |

### part-9/2-interfaces.md: Interfaces (part 9)

Teaches: declaring an interface and implementing it (contract of behaviour); an interface as a variable type and list element type; casting back; interfaces as method parameters (Printer, ReadingList that is itself Readable); interfaces as return types (Factory with Random, Packer); reducing dependencies between classes; built-in interfaces: List (ArrayList, LinkedList), Map, Set (HashSet), Collection.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part09-Part09_05.TacoBoxes` | TacoBoxes (2 parts) | class | needs-adaptation | interfaces / step 1 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. TacoBox interface given; TripleTacoBox and CustomTacoBox; count never below 0. |
| `part09-Part09_06.InterfaceInABox` | Interface In A Box (4 parts) | class | needs-adaptation | interfaces / step 2, step 3, step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Packable interface, Book, CD, Box with max weight and computed weight(); part 4 makes Box Packable. Putting a box inside itself recurses forever, so the runtime must report StackOverflowError instead of hanging the tab. |
| `part09-Part09_07.ListAsAMethodParameter` | List as a method parameter | method | runs-as-is | interfaces / step 6 | returnSize(List). Template class is named 'mainProgram' (lowercase). |
| `part09-Part09_08.MapAsAMethodParameter` | Map as a method parameter | method | runs-as-is | interfaces / step 6 | returnSize(Map). |
| `part09-Part09_09.SetAsMethodParameter` | Set as  method parameter | method | runs-as-is | interfaces / step 6 | returnSize(Set). |
| `part09-Part09_10.OnlineShop` | Online shop (8 parts) | multi-class-program | needs-adaptation | interfaces / step 7, step 8, step 9 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Warehouse (fields typed Map<String,Integer>: site require rule), Item, ShoppingCart (Map<String,Item> or List<Item>), Store UI with Scanner. The MOOC sample lists products as buttermilk, yogurt, coffee, milk; JDK 21 HashMap gives yogurt, coffee, milk, buttermilk (checked): compare as a set. |

### part-9/3-object-polymorphism.md: Object polymorphism (part 9)

Teaches: inheritance hierarchy in the API docs; an object can be used through any of its types (Object, interfaces); methods that take Object or an interface (CharSequence) as a parameter.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part09-Part09_11.Herds` | Herds (2 points) | class | needs-adaptation | polymorphism / step 2, step 3 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Movable given; Organism and Herd (a Movable made of Movables, composite). |
| `part09-Part09_12.Animals` | Animals (4 parts) | class | needs-adaptation | polymorphism / step 4 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Abstract Animal, Dog and Cat with two constructors each, NoiseCapable interface, cast back to Cat. |

### part-9/4-conclusion.md: Summary (part 9)

Teaches: summary of inheritance and interfaces; self-reflection quiz.

No programming exercises (quiz or summary only). **No exercise needed**; the text is folded into `polymorphism` as lesson or closing text.

### part-10/1-handling-collections-as-streams.md: Handling collections as streams (part 10)

Teaches: stream() from a Collection; mapToInt, filter, average().getAsDouble(), count; lambda expressions, block lambdas, method references (Class::method), no mutation of outside variables; intermediate vs terminal operations; terminal: count, forEach, collect (Collectors.toCollection(ArrayList::new), Collectors.toList), reduce; intermediate: filter, map, distinct, sorted; streams over objects (books and authors); Files.lines(Paths.get(...)) to read and parse files, with try/catch.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part10-Part10_01.AverageOfNumbers` | Average of Numbers | stdin-stdout | runs-as-is | streams / step 1 | Require a stream for the average. Prints 0.6666666666666666 (reproduced on JDK 21). |
| `part10-Part10_02.AverageOfSelectedNumbers` | Average of selected numbers | stdin-stdout | runs-as-is | streams / step 2 | filter by sign then average. |
| `part10-Part10_03.PositiveNumbers` | Positive Numbers | method | runs-as-is | streams / step 3 | Return a List<Integer> via collect. |
| `part10-Part10_04.Divisible` | Divisible | method | runs-as-is | streams / step 3 | Collect numbers divisible by 2, 3 or 5 into a new list; the parameter list must stay unchanged (harness checks). |
| `part10-Part10_05.PrintingUserInput` | Printing User Input | stdin-stdout | runs-as-is | streams / step 4 | Read until an empty line, print all (stream forEach). |
| `part10-Part10_06.LimitedNumbers` | Limited numbers | stdin-stdout | runs-as-is | streams / step 4 | Read until a negative number, print those in 1..5. |
| `part10-Part10_07.UniqueLastNames` | Unique last names | stdin-stdout | runs-as-is | streams / step 6 | Person given; map, distinct, sorted, forEach. |
| `part10-Part10_08.Weighting` | Weighting (2 parts) | class | needs-adaptation | streams / step 7 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Rewrite the Cargo hold classes with streams. TMC D_GeneralTest reads the source files and fails on 'while(' or 'for(' (learner repo clone): site forbid rules. |
| `part10-Part10_09.ReadingFilesPerLine` | Reading Files Per Line | file-io | needs-adaptation | streams / step 8 | TMC writes a temp file (File.createTempFile, FileWriter) and passes its absolute path (learner repo clone). Site: in-memory files per test; runtime needs Files.lines and Paths.get over a virtual filesystem. |
| `part10-Part10_10.BooksFromFile` | Books from file | file-io | needs-adaptation | streams / step 9 | Same mechanism; parse 'name,year,pages,author' into Book objects. |

### part-10/2-interface-comparable.md: The Comparable Interface (part 10)

Teaches: Comparable<T> and compareTo (negative, zero, positive); sorting with stream sorted() and Collections.sort; implementing several interfaces in one class; sorting with a lambda comparator; String.compareTo; Comparator.comparing and thenComparing with method references for multiple criteria.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part10-Part10_11.WageOrder` | Wage order | method | runs-as-is | sorting-objects / step 1 | compareTo in a given Human: largest wage first. |
| `part10-Part10_12.StudentsOnAlphabeticalOrder` | Students on alphabetical order | method | runs-as-is | sorting-objects / step 2 | compareTo delegating to String compareToIgnoreCase. |
| `part10-Part10_13.LiteracyComparison` | Literacy comparison (2 parts) | file-io | needs-adaptation | sorting-objects / step 3 | Reads literacy.csv (429 lines in the learner repo copy of the template, UNESCO data): split on commas, trim, sort by percentage. Site: own dataset in an in-memory file; do not reuse the MOOC file. |
| `part10-Part10_14.Literature` | Literature (3 parts) | stdin-stdout | runs-as-is | sorting-objects / step 4 | Read books until an empty line; sort by age then name (Comparator.comparing().thenComparing()). |

### part-10/3-other-useful-techniques.md: Other useful techniques (part 10)

Teaches: string concatenation cost and StringBuilder (append, toString); regular expressions with String.matches: alternation, parentheses, quantifiers * + ? {a} {a,b} {a,}, character classes; enum types, comparing with ==, ordinal(); enums with fields and a private constructor; Iterator: hasNext, next, remove; ConcurrentModificationException when removing inside forEach; Comparator classes for alternative orders.

| tmc id | Name | Kind | Browser | Site step | Notes |
|---|---|---|---|---|---|
| `part10-Part10_15.RegularExpressions` | Regular expressions (3 parts) | method | runs-as-is | useful-techniques / step 2, step 3 | Checker methods isDayOfWeek, allVowels, timeOfDay (00:00:00..23:59:59). TMC test also scans the source rows (learner repo clone); site: require 'matches('. |
| `part10-Part10_16.EnumAndIterator` | Enum and Iterator (4 parts) | class | needs-adaptation | useful-techniques / step 4, step 6 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. enum Education, Person, Employees with overloaded add and print, fire(). TMC EmployeesTest checks the source uses an iterator (learner repo clone): site require rule on iterator(). |
| `part10-Part10_17.SortThemCards` | Sort them cards! (6 parts) | class | needs-adaptation | useful-techniques / step 7, step 8 | Multi-class: the learner writes 2 or more classes. Works in a single editor file with one public class plus package-private classes (checked with javac 21), or in a multi-file editor. Card (enum Suit given) becomes Comparable by value then suit ordinal; Hand (add, print, sort, Comparable<Hand> by sum); Comparator classes SortBySuit/BySuitInValueOrder; sortBySuit. |

### part-10/4-summary.md: Summary (part 10)

Teaches: end-of-part quiz.

No programming exercises (quiz or summary only). **No exercise needed**; the text is folded into `useful-techniques` as lesson or closing text.

## Browser issues and proposals

- **HashMap/HashSet printing (part08-Part08_08, part08-Part08_09, part07-Part07_08 'All', part09-Part09_10 products, 8.4 TaskTracker and 9.2 Collection examples).** Issue: Sample outputs in the MOOC assume an iteration order that JDK 21 does not produce. Checked with javac/java 21: products print [yogurt, coffee, milk, buttermilk] (MOOC: buttermilk, yogurt, coffee, milk); keys f.e/etc./i.e print [i.e, etc., f.e]; TaskTracker prints Pekka, Ada, Matti (MOOC: Matti, Pekka, Ada); birds print Crow, Hawk (MOOC: Hawk, Crow). A browser runtime with its own class library may iterate in yet another order (not verified). Proposal: Never copy expected output from the MOOC. For printing tasks, compare lines as a multiset (TMC does the same with contains checks), or specify the order in the task (insertion order via LinkedHashMap, or sorted via TreeMap/sorted()). Generate expected output by running the reference solution on the site's own runtime.
- **Double output everywhere (part06-Part06_11, part09-Part09_03, part10-Part10_01, part07-Part07_06).** Issue: Outputs such as 10.299999999999955, 0.6666666666666666 and 2.4285714285714284 depend on Java's Double.toString (the first two reproduced on JDK 21). Proposal: Use a runtime that uses the JDK's own Double.toString, or test that the runtime's formatting matches JDK 21 on a corpus of values before launch; generate expected outputs with the site runtime.
- **Multi-class exercises (most of parts 6, 9 and 10).** Issue: TMC templates put each class, interface and enum in its own file. The reference site edits one file per step. Proposal: Phase 1: one editor file with one public class and package-private classes/interfaces/enums (compiles with javac 21, checked). Phase 2: a multi-file editor (tabs) for parts 9 and 10 so learners see one-public-class-per-file.
- **TMC tests using reflection (for example part06-Part06_05 A_GiftTest/B_PackageTest, part07-Part07_01 getDeclaredMethods, part10-Part10_16).** Issue: TMC checks private/non-static fields, field counts and method counts with edutestutils Reflex and java.lang.reflect (learner repo clones). A browser runtime may lack full reflection. Proposal: Compile the hidden harness together with the learner code and call methods directly; express structural rules (private fields, no extra methods, two fields only) as require/forbid source patterns, which C/C++ Arena already supports.
- **part07-Part07_05.Searching.** Issue: TMC compares System.nanoTime of binary vs linear search (binary at least 2x faster on 10,000 books). Wall-clock timing is noisy in a browser. Proposal: Harness passes a List wrapper that counts get() calls and asserts about log2(n) accesses; keep wall-clock only as an infinite-loop guard.
- **part06-Part06_12.JokeManager (and the Factory example in 9.2).** Issue: Random draw; TMC checks a distribution (each joke at least 25 times) with @Test(timeout = 100). Proposal: Property-based checks (result is always one of the stored items, every item appears over many draws) with generous time limits, or let the class accept a Random so the harness can seed it.
- **part06-Part06_13.Exercises (learner writes JUnit tests).** Issue: Needs a test framework in the browser. TMC itself does not verify the learner's tests: the template has an empty ExerciseManagementTest and MainProgram.partsCompleted() is self-reported (learner repo clone). Proposal: Ship a tiny in-browser runner: either JUnit-4-style @Test + assertEquals (needs annotations and reflection in the runtime) or a site-provided plain-Java check(name, expected, actual) helper. Grade by mutation: learner tests must pass on the reference and fail on each buggy variant. Offer an optional 'run on your own computer' Maven + JUnit project graded by GitHub Actions in the learner's repo.
- **File reading (part07-Part07_07, part10-Part10_09, part10-Part10_10, part10-Part10_13).** Issue: Programs open files by name (Scanner over a file, Files.lines(Paths.get(...))); TMC tests write temporary files first. Proposal: Give each test case in-memory files (the C/C++ Arena TestCase type already has files, src/content/types.ts) and back java.io/java.nio.file with a virtual filesystem; a missing file must raise the usual exception so try/catch paths can be tested. Write own data files (do not reuse recipes.txt or literacy.csv).
- **part09-Part09_06.InterfaceInABox part 4 (box inside itself).** Issue: Infinite recursion in weight(); on the JVM this is a StackOverflowError. Proposal: The runtime must convert deep recursion into a catchable StackOverflowError with a readable message and must not freeze the page (run in a worker with a time limit).
- **10.3 Iterator section.** Issue: The lesson demonstrates ConcurrentModificationException when removing inside forEach. Proposal: The runtime's ArrayList must have fail-fast iterators like the JDK; include a test for this before relying on it in a predict-the-output challenge.
- **NetBeans-specific instructions (6.1 method hints, 6.3 debugger videos and Test menu, 8.3 Insert Code for equals/hashCode, 9.2 new Java interface, 10.3 new Java enum).** Issue: IDE features do not exist in the site editor. Proposal: Replace with text: show the standard equals/hashCode recipe (Objects.equals/Objects.hash), teach print debugging and the site's step visualizer if available, and describe files instead of IDE wizards.
- **8.2 performance example (10 million books, System.nanoTime).** Issue: Building 10 million objects in a browser runtime is slow and memory-heavy (estimate, not measured). Proposal: Scale the site's own demo down (for example 100,000 items) and show counted comparisons rather than milliseconds.
- **Non-ASCII text (part08-Part08_13 'Jürgen', 10.1 presidents file, Finnish words in 6.2).** Issue: stdin, stdout and in-memory files must round-trip UTF-8. Proposal: Include a non-ASCII case in a hidden test of each I/O-heavy step and in the runtime smoke test.
- **Checkstyle (part08-Part08_02).** Issue: TMC fails this submission on Checkstyle violations (.tmcproject.json strategy 'fail' in the Java II learner repo clone). Proposal: Optional style lint in the browser (indentation, braces); do not block passing on it unless the step is about style.

## Java library APIs the runtime must support (parts 6 to 10)

- java.util.Scanner: new Scanner(System.in), new Scanner(String), nextLine (Scanner over a file for RecipeSearch)
- Integer.valueOf, Double.valueOf, autoboxing/unboxing of Integer, Double, Character
- String: length, charAt, equals, contains, split, trim, toLowerCase, startsWith, isEmpty, compareTo, compareToIgnoreCase, matches, hashCode
- StringBuilder: append, toString; CharSequence (length, charAt)
- Math.abs
- java.util.ArrayList / List / LinkedList: add, get, set, remove(int), remove(Object), size, isEmpty, contains, clear, iterator, toString
- java.util.HashMap / Map: put, get, containsKey, remove, keySet, values, getOrDefault, putIfAbsent, size
- java.util.HashSet / Set / Collection: add, size, contains, for-each iteration
- java.util.Arrays: sort(int[]), sort(String[]), toString(int[])
- java.util.Collections: sort(List), sort(List, Comparator)
- java.util.Random: nextInt(bound)
- java.util.Iterator: hasNext, next, remove; ConcurrentModificationException (fail-fast ArrayList iterator)
- Object: equals, hashCode, toString; instanceof, casts, @Override, abstract classes, interfaces, protected
- java.lang.Comparable<T>.compareTo; java.util.Comparator: compare, Comparator.comparing, thenComparing
- Lambda expressions and method references (ArrayList::new, Class::staticMethod, Type::getter, System.out::println)
- java.util.stream.Stream: filter, map, mapToInt, distinct, sorted(), sorted(Comparator), forEach, collect, reduce, count
- java.util.stream.IntStream: average, count, sum; java.util.OptionalDouble.getAsDouble
- java.util.stream.Collectors: toList, toCollection(ArrayList::new)
- java.nio.file.Files.lines, java.nio.file.Paths.get; Exception.getMessage (try/catch around file reading)
- enum types: constants, ==, ordinal(), values(), fields with a private constructor
- System.nanoTime (8.2 demo; TMC Searching test)
- JUnit 4 (6.3): org.junit.Test, static org.junit.Assert.assertEquals (learner-written tests)
- StackOverflowError on runaway recursion (9.2 box-in-a-box)

## Coverage check

`generate.py` asserts that every tmc id in the section tables appears in at least one step, that a split exercise stays inside one module, that every section appears in some module's MOOC section list, and that every module has 4 to 10 steps. The structured result is in `/home/user/ref/research/mooc-parts-06-10/structured.json`.

| tmc id | Module / steps |
|---|---|
| `part06-Part06_01.Menu` | objects-with-lists / 1 |
| `part06-Part06_02.Stack` | objects-with-lists / 2 |
| `part06-Part06_03.MessagingService` | objects-with-lists / 3 |
| `part06-Part06_04.PrintingACollection` | objects-with-lists / 4 |
| `part06-Part06_05.SantasWorkshop` | objects-with-lists / 5 |
| `part06-Part06_06.LongestInCollection` | objects-with-lists / 6 |
| `part06-Part06_07.HeightOrder` | objects-with-lists / 6, 7 |
| `part06-Part06_08.CargoHold` | objects-with-lists / 8, 9 |
| `part06-Part06_09.SimpleDictionary` | text-ui / 1, 2 |
| `part06-Part06_10.TodoList` | text-ui / 3, 4 |
| `part06-Part06_11.Averages` | text-ui / 5, 6 |
| `part06-Part06_12.JokeManager` | text-ui / 7 |
| `part06-Part06_13.Exercises` | unit-testing / 4, 5 |
| `part07-Part07_01.LiquidContainers` | paradigms / 1, 2 |
| `part07-Part07_02.LiquidContainers2` | paradigms / 3, 4 |
| `part07-Part07_03.Sorting` | sorting-searching / 1, 2, 3 |
| `part07-Part07_04.ReadymadeSortingAlgorithms` | sorting-searching / 4 |
| `part07-Part07_05.Searching` | sorting-searching / 5, 6 |
| `part07-Part07_06.GradeStatistics` | larger-programs / 1, 2 |
| `part07-Part07_07.RecipeSearch` | larger-programs / 3, 4 |
| `part07-Part07_08.BigYear` | larger-programs / 5 |
| `part08-Part08_01.Cubes` | recap / 1 |
| `part08-Part08_02.AverageOfPositiveNumbers` | recap / 2 |
| `part08-Part08_03.LiquidContainers` | recap / 3 |
| `part08-Part08_04.LiquidContainers2` | recap / 4 |
| `part08-Part08_05.TodoList` | recap / 5 |
| `part08-Part08_06.Nicknames` | hash-maps / 1 |
| `part08-Part08_07.Abbreviations` | hash-maps / 2 |
| `part08-Part08_08.PrintMeMyHashmap` | hash-maps / 3 |
| `part08-Part08_09.PrintMeAnotherHashmap` | hash-maps / 4 |
| `part08-Part08_10.IOweYou` | hash-maps / 5 |
| `part08-Part08_11.SameDate` | equals-hashcode / 1 |
| `part08-Part08_12.HashedDate` | equals-hashcode / 3 |
| `part08-Part08_13.VehicleRegistry` | equals-hashcode / 2, 5 |
| `part08Part08_14.DictionaryOfManyTranslations` | hash-maps / 6 |
| `part08-Part08_15.StorageFacility` | hash-maps / 7 |
| `part09-Part09_01.ABC` | inheritance / 1 |
| `part09-Part09_02.PersonAndSubclasses` | inheritance / 2, 3, 4 |
| `part09-Part09_03.Warehousing` | inheritance / 5, 6, 7 |
| `part09-Part09_04.DifferentKindsOfBoxes` | inheritance / 8 |
| `part09-Part09_05.TacoBoxes` | interfaces / 1 |
| `part09-Part09_06.InterfaceInABox` | interfaces / 2, 3, 4 |
| `part09-Part09_07.ListAsAMethodParameter` | interfaces / 6 |
| `part09-Part09_08.MapAsAMethodParameter` | interfaces / 6 |
| `part09-Part09_09.SetAsMethodParameter` | interfaces / 6 |
| `part09-Part09_10.OnlineShop` | interfaces / 7, 8, 9 |
| `part09-Part09_11.Herds` | polymorphism / 2, 3 |
| `part09-Part09_12.Animals` | polymorphism / 4 |
| `part10-Part10_01.AverageOfNumbers` | streams / 1 |
| `part10-Part10_02.AverageOfSelectedNumbers` | streams / 2 |
| `part10-Part10_03.PositiveNumbers` | streams / 3 |
| `part10-Part10_04.Divisible` | streams / 3 |
| `part10-Part10_05.PrintingUserInput` | streams / 4 |
| `part10-Part10_06.LimitedNumbers` | streams / 4 |
| `part10-Part10_07.UniqueLastNames` | streams / 6 |
| `part10-Part10_08.Weighting` | streams / 7 |
| `part10-Part10_09.ReadingFilesPerLine` | streams / 8 |
| `part10-Part10_10.BooksFromFile` | streams / 9 |
| `part10-Part10_11.WageOrder` | sorting-objects / 1 |
| `part10-Part10_12.StudentsOnAlphabeticalOrder` | sorting-objects / 2 |
| `part10-Part10_13.LiteracyComparison` | sorting-objects / 3 |
| `part10-Part10_14.Literature` | sorting-objects / 4 |
| `part10-Part10_15.RegularExpressions` | useful-techniques / 2, 3 |
| `part10-Part10_16.EnumAndIterator` | useful-techniques / 4, 6 |
| `part10-Part10_17.SortThemCards` | useful-techniques / 7, 8 |
