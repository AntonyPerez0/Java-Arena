# Java MOOC Parts 3, 4 and 5 mapped to Java Arena modules

Agent: `mooc-parts-03-05`. Scope: Helsinki Java Programming MOOC Part 3 (`data/part-3`), Part 4 (`data/part-4`) and Part 5 (`data/part-5`). Research only; no site code.

## Summary

- **80 visible exercises** (32 in Part 3, 31 in Part 4, 17 in Part 5), taken from `/home/user/ref/mooc-outline.txt` and checked against the live (non-commented) markdown: the raw and the comment-stripped files have the same `<programming-exercise>` count per section.
- **12 modules, 77 steps.** Every exercise is assigned to a step; `generate.py` in `/home/user/ref/research/mooc-parts-03-05/` asserts full coverage against the outline, no duplicates except multi-part exercises, 4 to 10 steps per module and three challenges per step. Multi-part exercises: `Part04_15` (Statistics, 4 parts) is split across two steps; the others (`Part04_08`, `Part04_16`, `Part04_31`, `Part05_06`, `Part05_09`, `Part05_10`, `Part05_11`, `Part05_15`, `Part05_16`, `Part05_17`) fill the challenges of one step.
- Exercise kinds: stdin-stdout 27, class 27, multi-class-program 9, file-io 8, method 6, other 2, tooling 1.
- Browser: runs-as-is 55, needs-adaptation 25. Nothing in Parts 3-5 needs a JavaFX, audio, Maven or IDE-only environment. The adaptations are (a) several source files per program from Part 4 on, (b) in-memory data files for the file-reading steps, (c) replacing TMC's PowerMock checks, and (d) the NetBeans 'create a file' tooling exercise.
- Split sections: 3.2 Lists (17 exercises) becomes `lists` + `list-methods`; 4.1 Introduction to OOP (16 exercises) becomes `classes` + `object-methods`. Folded: 5.2 overloading (2 exercises) into `class-design` with 5.1. Small modules for substantive sections without exercises: `debugging` (3.1) and `references` (5.3, joined by the start of 5.4 and its NullPointerException exercise). Reading only: 3.5 (end of `strings`), 4.4 (end of `reading-files`), 5.5 (end of `object-interaction`).
- Biggest runtime findings: (1) from Part 4 on, 36 exercises are about classes and 16 of them have the learner edit or read two or more source files, so the editor and compiler must handle several files with read-only given classes; (2) 55 of 80 TMC test folders rely on reflection and 3 on PowerMock, so the site needs its own Java harness; (3) file steps need per-test in-memory files behind `Scanner(Paths.get(...))`; (4) the JVM's exact exception messages, double printing, `Integer` cache and regex `split` all show up in expected output, and several MOOC sample outputs are not what JDK 21 prints.

### Sources used

- MOOC text: `/home/user/ref/java-programming/data/part-3/*.md`, `part-4/*.md`, `part-5/*.md`. HTML comments (old Finnish text) and code-state-visualizer JSON were stripped before reading (`clean.py`); cleaned copies are in `/home/user/ref/research/mooc-parts-03-05/clean/`.
- How TMC grades each exercise: the same public learner repository the Parts 1-2 report used, `https://github.com/marceloxreis/mooc-java-programming-i`, cloned shallow and sparse (part03, part04, part05) at commit `977168e` into `/home/user/ref/research/mooc-parts-03-05/tmc-sample/`. It keeps the original TMC folders (`src/test`, `pom.xml`, `.tmcproject.yml`, data files); its `src/main` files are the learner's solutions. Its LICENSE is MIT for the learner's own code; the tests and templates are the MOOC's, so they were read only to understand grading and nothing from them is copied into this plan.
- C/C++ Arena conventions: `/home/user/antonyperez0/cpp-arena/README.md` ('Writing content': steps with `seed`/`solution`, `tests` with `stdin`, `files`, `args`, `exit`, `harness`, `require`/`forbid`, `more:` challenges) and `content/lessons/15-c-files.yaml` (per-test `files:`).
- Local checks with `openjdk 21.0.10` (`/home/user/ref/research/mooc-parts-03-05/check/`: `Check.java`, `Split.java`, `Avg.java`, `nog/Npe.java`).

## Module map

Module order follows the MOOC: debugging, lists, list-methods, arrays, strings (Part 3); classes, object-methods, lists-of-objects, reading-files (Part 4); class-design, references, object-interaction (Part 5). Challenge ideas are original; they name the skill, not the MOOC's story or data.

### `debugging`: Finding bugs

MOOC sections: `part-3/1-discovering-errors.md`

Section 3.1 has no programming exercises but is substantive, so it becomes a small module of its own. The site writes its own buggy programs; every step is 'fix the program' graded by normal and hidden corner-case tests.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | The bug is not where you are looking | 3.1 A Programmer Blind to Their Own Code (perceptual blindness)<br>worked example: the final check tests the wrong variable | fill in the blanks (predict the output for a given input; checked against the real output), then write a program (fix the bug; stdin-stdout) | 1: predict what a short loop prints for a given input. 2: fix an averaging program whose loop is fine but whose final if tests the sum instead of the count (hidden test: all zeros). 3: fix a max-finder whose bug is in the variable's starting value, not in the loop (hidden test: only negative numbers). |
| 2 | Comments and names that explain | 3.1 Commenting the Source Code<br>self-documenting code: descriptive names, extracting a named method, a general method with parameters | write a program (stdout); require the new names and the method call | 1: rename single-letter variables to descriptive names (require the names; output unchanged). 2: move a commented block into a method whose name says what it does, and call it. 3: generalise a fixed countdown method into one that takes start and end parameters. |
| 3 | Print debugging | 3.1 Searching for Errors with Print Debugging | write a program (fix the bug; stdin-stdout); debug prints go to System.err, which is shown but not graded | 1: add a print of the loop variables each round (require System.err.println inside the loop) and fix a counter that is reset inside the loop. 2: find why the sentinel value is counted as data. 3: find a wrong comparison (&lt; vs &lt;=) that only shows at the boundary; the debug lines may stay, because stderr is not graded. |
| 4 | Testing the corner cases | 3.1 corner cases: no valid input, zeros, very large values | write a program (fix the bug; stdin-stdout with hidden corner-case tests) | 1: an average program prints 'Average: NaN' when the first input is the sentinel (verified on JDK 21, check/NaN.java); print a clear message instead. 2: a range counter misses both end points. 3: a program passes all visible tests but fails three hidden ones; the hints name the categories (empty input, all equal, very large values) one at a time. |

### `lists`: Lists

MOOC sections: part-3/2-lists.md (first half: creating, add, get, indices, IndexOutOfBoundsException, size, index loops, max and index search)

Section 3.2 has 17 exercises; it is split into 'lists' (indices and index-based loops, 11 exercises) and 'list-methods' (for-each, remove, contains, lists in methods, 6 exercises).

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Creating a list, add and get | `part03-Part03_01.ThirdElement`<br>3.2 Using and Creating Lists<br>3.2 Adding to a List and Retrieving a Value from a Specific Place<br>3.2 hint: Importing multiple premade Java tools | fill in the blanks, then write a program (stdin-stdout) | 1: blanks for the import, ArrayList&lt;String&gt; and get(0). 2: read lines until an empty line and print the second one. 3: print the third line and then the first, in that order. |
| 2 | Lists of numbers | `part03-Part03_02.SecondPlusThird`<br>3.2 Defining the Type of Values That a List Can Contain (Integer, Double, boxing) | write a program (fix a compile error, then stdin-stdout) | 1: fix ArrayList&lt;int&gt; so it compiles. 2: read integers until 0 and print the product of the first two. 3: read decimals into an ArrayList&lt;Double&gt; and print the sum of the first three. |
| 3 | When the index does not exist | `part03-Part03_03.IndexOutOfBoundsException`<br>3.2 Retrieving Information from a "Non-Existent" Place<br>3.2 hint: A Place in a List Is Called an Index | write a program (expected-exception test), then fix programs using the stack trace | 1: change a program so it always ends with IndexOutOfBoundsException without reading input. 2: read a JDK 21 error message ('Index 3 out of bounds for length 3') and fix the line it points to. 3: fix a loop that uses &lt;= size(). |
| 4 | How many items: size() | `part03-Part03_04.ListSize`<br>3.2 Iterating Over a List (size) | write a program (stdin-stdout); require .size() | 1: print the number of lines read before an empty line. 2: print the size before and after adding two fixed items. 3: print 'nothing read' for an empty list, otherwise the count. |
| 5 | The first and the last item | `part03-Part03_05.LastInList`<br>`part03-Part03_06.FirstAndLast`<br>3.2 Iterating Over a List Continued (get(size() - 1)) | write a program (stdin-stdout) | 1: print the last line read. 2: print the first and the last. 3: print the second-to-last (hidden test with exactly two lines). |
| 6 | Going through a list by index | `part03-Part03_07.RememberTheseNumbers`<br>`part03-Part03_08.OnlyTheseNumbers`<br>3.2 while and for over indices, printing in reverse<br>3.2 hint: Notice about the following exercises (use the list after reading) | write a program (stdin-stdout); require a loop | 1: read numbers until -1 and print them all. 2: then read a start and an end index and print only that slice, inclusive. 3: print the list backwards. |
| 7 | The greatest and the smallest | `part03-Part03_09.GreatestInList`<br>min/max search pattern (start from the first element) | write a program (stdin-stdout) | 1: greatest value. 2: smallest value (hidden test: all numbers negative). 3: difference between the greatest and the smallest. |
| 8 | Finding where a value is | `part03-Part03_10.IndexOf`<br>`part03-Part03_11.IndexOfSmallest` | write a program (stdin-stdout) | 1: print every index where a searched number occurs (nothing if absent). 2: print only the first index, or 'not found'. 3: print the smallest value and all its indices (hidden tests use values above 127, so == on Integer elements fails). |

### `list-methods`: For-each, list methods and lists in methods

MOOC sections: part-3/2-lists.md (second half: for-each, remove, contains, lists as parameters, reference semantics, summary of list methods)

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | The for-each loop | `part03-Part03_12.SumOfAList`<br>3.2 Iterating Over a List with a For-Each Loop | fill in the blanks, then write a program (stdin-stdout); require for-each | 1: blanks in 'for (String word : words)'. 2: sum of numbers read until -1. 3: count the numbers greater than 10. |
| 2 | Averages from a list | `part03-Part03_13.AverageOfAList` | write a program (stdin-stdout) | 1: average of the list as a double. 2: average of the positive numbers only, with a message when there are none. 3: how many numbers are above the average (needs a second pass, which is why the list is kept). |
| 3 | Removing items | 3.2 Removing from a List and Checking the Existence of a Value (remove by index, remove by value, remove(Integer.valueOf(x)))<br>2 quizzes in 3.2 (not ported) | fill in the blanks (predict the list after removals; checked against the real output), then write a program (stdout) | 1: predict the list after remove(1) on a list of words. 2: remove a word by value. 3: remove the number 15 from an Integer list where remove(15) would remove by index (require Integer.valueOf). |
| 4 | Is it on the list: contains | `part03-Part03_14.OnTheList` | write a program (stdin-stdout) | 1: found / not found for one searched word. 2: read words but skip ones already on the list. 3: check two searched words and print which of them were found. |
| 5 | A list as a parameter | `part03-Part03_15.PrintInRange`<br>3.2 List as a Method Parameter | write a method (hidden harness captures stdout per call) | 1: a void method that prints every item. 2: print the numbers within [low, high]. 3: print the numbers below a threshold followed by a count line. |
| 6 | Returning a value computed from a list | `part03-Part03_16.Sum`<br>3.2 methods returning a value (size, average returning -1.0 for an empty list) | write a method (hidden harness) | 1: return the sum. 2: return the average, or -1.0 for an empty list. 3: return the greatest value. |
| 7 | The method changes the caller's list | `part03-Part03_17.RemoveLast`<br>3.2 On Copying the List to a Method Parameter<br>3.2 A Summary of List Methods<br>println(list) prints [a, b, c] | fill in the blanks (predict the printed lists), then write a method (hidden harness checks the list afterwards) | 1: predict what println(list) shows after calling a method that removes the first item twice. 2: removeLast that does nothing on an empty list. 3: remove every value greater than a limit (hidden test with neighbouring values to catch index skipping). |

### `arrays`: Arrays

MOOC sections: `part-3/3-arrays.md`

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Creating an array and using indices | 3.3 Creating an Array<br>3.3 Assigning and accessing elements<br>3.3 Type of the elements (String[], double[]; default values)<br>1 quiz in 3.3 (not ported) | fill in the blanks, then write a program (stdin-stdout) | 1: blanks for new int[4] and two assignments. 2: read an index and print that element of a given array. 3: fill a String[3] from three input lines and print them in reverse order. |
| 2 | Swapping two elements | `part03-Part03_18.Swap` | write a program (stdin-stdout) | 1: swap two fixed positions with a temporary variable. 2: swap two positions read from input. 3: reverse the whole array in place by swapping pairs (forbid creating a second array). |
| 3 | length and loops over an array | `part03-Part03_19.IndexWasNotFound`<br>3.3 Size of an array and iterating (length is not a method)<br>ArrayIndexOutOfBoundsException<br>reading n numbers into an array of size n | write a program (stdin-stdout) | 1: print every element with a while loop and length. 2: search for a number and print its index or a not-found line. 3: read how many numbers, then that many numbers into an array, and print them back. |
| 4 | Arrays as parameters | `part03-Part03_20.SumOfArray`<br>3.3 Array as a parameter of a method<br>3.3 The shorter way to create an array ({...}) | write a method (hidden harness) | 1: return the sum of an int[]. 2: return how many elements are greater than a parameter. 3: a void method that doubles every element in place (harness checks the caller's array). |
| 5 | Printing an array neatly | `part03-Part03_21.PrintNeatly`<br>print vs println, separators without a trailing comma | write a method (hidden harness captures stdout); forbid Arrays.toString | 1: space-separated on one line. 2: comma and space between numbers, none after the last. 3: the same inside square brackets, with an empty array printing []. |
| 6 | Rows of stars from an array | `part03-Part03_22.PrintInStars`<br>3.3 hint: Indices and the structure of the memory (reading only) | write a method (hidden harness captures stdout) | 1: one row of stars per element. 2: prefix each row with the number and a colon. 3: a labelled bar chart from a String[] of names and an int[] of values of the same length. |

### `strings`: Working with strings

MOOC sections: `part-3/4-strings.md`; part-3/5-increasing-amounts-of-data.md (reading only, no exercise needed)

Section 3.5 is a three-sentence recap plus a survey: show the recap as a closing reading card after the last step; the survey is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Reading and joining strings | `part03-Part03_23.PrintThrice`<br>3.4 Reading and Printing Strings | write a program (stdin-stdout); forbid loops | 1: read a word and print it three times on one line (forbid while and for). 2: print the word framed by '&lt;&lt;' and '&gt;&gt;'. 3: read two words and print them joined in both orders. |
| 2 | equals and not equals | `part03-Part03_24.IsItTrue`<br>3.4 String Comparisons And "Equals" (never ==, negation with !, null) | write a program (stdin-stdout); forbid == between strings | 1: a message when the input is exactly one magic word. 2: the opposite test with ! (hidden test: the word with different capitalisation). 3: accept either of two words, reject everything else. |
| 3 | Checking two inputs together | `part03-Part03_25.Login` | write a program (stdin-stdout) | 1: one hard-coded user name and password. 2: two users from a small table. 3: separate messages for an unknown user and a wrong password (own twist; still a toy, with a note that real logins never work like this). |
| 4 | Splitting a line into pieces | `part03-Part03_26.LineByLine`<br>3.4 Splitting a String | write a program (stdin-stdout) | 1: split one line on spaces and print each piece on its own line. 2: repeat for every line until an empty line. 3: split on commas and print how many pieces each line has. |
| 5 | Searching inside pieces: contains | `part03-Part03_27.AVClub`<br>String.contains (tip box) | write a program (stdin-stdout) | 1: print the words that contain a fixed two-letter string. 2: print the words that do not contain it. 3: print matching words prefixed with the number of the line they came from. |
| 6 | The first and the last piece | `part03-Part03_28.FirstWords`<br>`part03-Part03_29.LastWords`<br>3.4 info box: Secret messages (charAt) | write a program (stdin-stdout) | 1: first word of each line. 2: last word of each line (pieces.length - 1). 3: join the first letters of each line's first word to reveal a hidden word (charAt). |
| 7 | Fixed-format data | `part03-Part03_30.AgeOfTheOldest`<br>`part03-Part03_31.NameOfTheOldest`<br>3.4 Data of Fixed Format<br>3.4 Using Diverse Text (Integer.valueOf on a piece) | write a program (stdin-stdout) | 1: for each 'name,points' line print a labelled sentence. 2: the highest points value. 3: the name that goes with the highest points value. |
| 8 | Challenge: longest name and average year | `part03-Part03_32.PersonalDetails`<br>3.4 hint: Length of string (length()) | write a program (stdin-stdout) | 1: the longest name (the first one wins a tie). 2: the average of the year column as a double. 3: both, plus the name of the youngest (hidden tests with ties and a single line). |

### `classes`: Classes and objects

MOOC sections: part-4/1-introduction-to-object-oriented-programming.md (first half: classes and objects, creating classes, constructors, methods, changing state)

Section 4.1 has 16 exercises in two groups, so it is split into 'classes' (define a class, constructor, void methods, state; 9 exercises) and 'object-methods' (return values, toString, parameters, larger classes; 7 exercises). From this module on the editor needs several files: the learner's class, a Main.java to try it, and read-only given classes.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Using objects of a ready-made class | `part04-Part04_01.YourFirstAccount`<br>`part04-Part04_02.YourFirstBankTransfer`<br>4.1 Classes and Objects<br>4.1 hint: The Relationship Between a Class and an Object<br>1 quiz in 4.1 (not ported) | write a program with several classes (given class in a read-only tab; stdout; harness checks the given class's call log) | 1: create one object of a given BankAccount-style class and call one method, then print it. 2: two objects and calls in a required order. 3: move an amount from one object to another and print both. |
| 2 | Declaring a class and its fields | `part04-Part04_03.DogAttributes`<br>4.1 Creating Classes (own file, private instance variables, encapsulation, class diagram)<br>4.1 hint: Creating a New Class | write a class (hidden harness checks declared fields by reflection) | 1: create a class in a new file with one private String field. 2: three private fields of given types. 3: fix a class whose fields are declared inside a method or are not private. |
| 3 | Constructors | `part04-Part04_04.Room`<br>4.1 Defining a Constructor (this.x = parameter)<br>4.1 hint: Default Constructor | write a class (hidden harness) | 1: a constructor with one parameter stored in a field. 2: two parameters. 3: one field from a parameter and another set to a fixed start value; the lesson shows that new Room() stops compiling once a constructor with parameters is written. |
| 4 | Methods that print | `part04-Part04_05.Whistle`<br>`part04-Part04_06.Door`<br>`part04-Part04_07.Product`<br>4.1 Defining Methods For an Object<br>4.1 hint: Objects and the Static Modifier | write a class (hidden harness captures stdout per call) | 1: a no-field class whose method prints a fixed line. 2: a method that prints a field given to the constructor. 3: print three fields, one of them a double, in a fixed format. |
| 5 | Methods that change the state | `part04-Part04_08.DecreasingCounter`<br>4.1 Changing an Instance Variable's Value in a Method<br>each object has its own instance variables | write a class (hidden harness) | 1: a method that lowers a counter by one. 2: never below zero. 3: add reset, and show two objects changing independently. |
| 6 | State that grows: doubles | `part04-Part04_09.Debt` | write a class (hidden harness); expected outputs computed on a real JDK | 1: a savings object that grows by a rate once. 2: call it in a loop from main for n years and print the result. 3: add a method that grows for n years by calling the one-year method. |

### `object-methods`: Getters, toString and bigger classes

MOOC sections: part-4/1-introduction-to-object-oriented-programming.md (second half: returning values, getters, toString, parameters and this, internal calls, Statistics, PaymentCard, rounding errors)

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Returning values: getters | `part04-Part04_10.Song`<br>`part04-Part04_11.Film`<br>4.1 Returning a Value From a Method<br>1 quiz in 4.1 (not ported) | write a class (hidden harness), then a program that uses it (stdin-stdout) | 1: two getters for a String and an int field. 2: a main that reads an age and uses a getter to decide what to print. 3: a getter computed from a field (a length in seconds returned as whole minutes). |
| 2 | Methods with rules and boolean answers | `part04-Part04_12.Gauge`<br>isOfLegalAge example, getName | write a class (hidden harness) | 1: a boolean method based on a field. 2: increase with an upper limit and decrease with a lower limit. 3: a loop in main that increases until the boolean method says full. |
| 3 | toString | `part04-Part04_13.Agent`<br>4.1 A string representation of an object and the toString-method | write a class (hidden harness checks the returned string and that nothing is printed) | 1: replace a print method with toString. 2: toString with three fields. 3: use the object inside string concatenation and println (both call toString). |
| 4 | Parameters, setters and this | `part04-Part04_14.Multiplier`<br>4.1 Method parameters (setters)<br>4.1 A parameter and instance variable having the same name! | write a program (fix the bug), then write a class (hidden harness) | 1: fix a setter written as 'height = height'. 2: setters plus a computed double method (body-mass-style formula, own numbers). 3: a class that remembers a factor and applies it to its parameter. |
| 5 | Calling your own methods | `part04-Part04_15.NumberStatistics`<br>Statistics parts 1-2: count, sum, average<br>4.1 Calling an internal method | write a class (hidden harness) | 1: count added numbers. 2: sum. 3: average that calls sum() and count() (0 for an empty object). |
| 6 | Using your class from main | `part04-Part04_15.NumberStatistics`<br>Statistics parts 3-4: sum of user input, three objects for all, even and odd | write a program with several classes (stdin-stdout); require 'new Statistics(' three times | 1: read numbers until -1 and print the sum using one object. 2: separate objects for even and odd numbers. 3: also print the count and average from the first object. |
| 7 | Building a class in stages | `part04-Part04_16.PaymentCard`<br>4.1 hint: Rounding errors | write a class (hidden harness), then a program with several classes (stdout) | 1: constructor, toString and two spending methods (MOOC parts 1-2). 2: refuse spending that would go negative, cap top-ups at a maximum and ignore negative top-ups (parts 3-5). 3: a main that runs a scripted sequence on two cards (part 6). |

### `lists-of-objects`: Objects in a list

MOOC sections: `part-4/2-objects-in-a-list.md`

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | A list of objects | 4.2 intro: three ways to go through a list<br>4.2 Adding object to a list | fill in the blanks, then write a program with several classes (stdout) | 1: blanks for ArrayList&lt;Player&gt; and add(new Player(...)). 2: add three objects and print each with for-each (toString). 3: print the count first, then the objects. |
| 2 | Objects from user input | `part04-Part04_17.Items`<br>4.2 Adding user-inputted objects to a list (isEmpty) | write a program with several classes (given class read-only; stdin-stdout) | 1: read names until an empty line, create an object for each, print them. 2: print how many objects were created before listing them. 3: print them in reverse order. |
| 3 | Several inputs per object | `part04-Part04_18.PersonalInformation`<br>4.2 Multiple constructor parameters<br>4.2 info box: Reading input in a specific format (split on commas) | write a program with several classes (given class read-only; stdin-stdout) | 1: two inputs per object, stop at an empty first input. 2: three inputs, print only two fields. 3: one 'name,number' line per object split on the comma. |
| 4 | Filtering while going through the list | `part04-Part04_19.TelevisionPrograms`<br>4.2 Filtered printing from the list | write a program with several classes (given class read-only; stdin-stdout) | 1: print the objects whose value is at most a limit read after the list. 2: print their count too. 3: print the objects between two limits. |
| 5 | Challenge: your own class and program | `part04-Part04_20.Books` | write a program with several classes (learner writes both files; stdin-stdout) | 1: write the class with a constructor and toString. 2: read objects until an empty title and print them all. 3: ask what to print ('all' or 'titles') and print accordingly. |

### `reading-files`: Reading files

MOOC sections: `part-4/3-files-and-reading-data.md`; part-4/4-summary.md (reading only, no exercise needed)

Every file step gives each test its own in-memory files (as C/C++ Arena's files: field does) and shows the data files in a file panel. Section 4.4 becomes a closing reading card; its questionnaire is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Reading until a stop word | `part04-Part04_21.NumberOfStrings`<br>`part04-Part04_22.Cubes`<br>4.3 Reading From the Keyboard | write a program (stdin-stdout) | 1: count lines until 'end'. 2: print the cube of each number until 'end'. 3: print a running total after each number and the count at the end. |
| 2 | Files and folders | `part04-Part04_23.CreatingANewFile`<br>4.3 Files and the Filesystem<br>4.3 info box: The Concrete File Storage Format | tooling (create files in the editor's file panel; checked by running a given program) | 1: create hello.txt with a required first line. 2: create a second file with two lines so a given program prints both. 3: fix a file name so a given program stops failing with NoSuchFileException. |
| 3 | Reading a file line by line | `part04-Part04_24.PrintingAFile`<br>`part04-Part04_25.PrintingASpecifiedFile`<br>4.3 Reading From a File (Scanner(Paths.get(...)), hasNextLine, try-with-resources) | write a program (file-io; files given per test) | 1: print every line of data.txt. 2: read a file name from input and print that file. 3: print each line with its line number. |
| 4 | Loading lines into a list | `part04-Part04_26.GuestListFromAFile`<br>4.3 reading all lines into an ArrayList<br>4.3 hint: An Empty Line In a File (isEmpty, continue) | write a program (file-io; files given per test; stdin-stdout) | 1: load the lines and print how many there are. 2: load a list of allowed names, then answer yes/no for each name typed until an empty line. 3: skip empty lines in the file (hidden test file has blank lines). |
| 5 | When reading fails | `part04-Part04_27.IsItInTheFile`<br>catch (Exception e) and e.getMessage() | write a program (file-io; one hidden test has no such file) | 1: print a clear message when the file does not exist. 2: search a file for a word: found, not found or failed. 3: count how many lines contain the word, with the same failure message. |
| 6 | Numbers from a file | `part04-Part04_28.NumbersFromAFile` | write a program (file-io; files given per test) | 1: sum of the numbers in a file. 2: count the numbers within bounds read from input. 3: the greatest and the smallest number in the file. |
| 7 | Records from a file | `part04-Part04_29.RecordsFromAFile`<br>4.3 Reading Data of a Specific Format From a File | write a program (file-io; files given per test) | 1: print each 'name,number' line as a sentence. 2: singular or plural unit depending on the number. 3: print the record with the largest number. |
| 8 | A method that reads objects | `part04-Part04_30.StoringRecords`<br>4.3 Reading Objects From a File | write a method (hidden harness; files given per test; given class read-only) | 1: return the lines of a file as an ArrayList&lt;String&gt;. 2: return an ArrayList of objects built from CSV lines. 3: skip empty and malformed lines (wrong number of fields). |
| 9 | Challenge: match results | `part04-Part04_31.SportStatistics` | write a program (file-io; files given per test; stdin-stdout) | 1: count the games a team played (home or away) in a results file (MOOC part 1). 2: add wins and losses (part 2). 3: add the total points the team scored (own extension). |

### `class-design`: Designing classes and overloading

MOOC sections: `part-5/1-learning-object-oriented-programming.md`; `part-5/2-method-and-constructor-overloading.md`

Section 5.2 has only 2 exercises, so it is folded in as the last two steps of this module rather than a module of its own.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | From variables to objects | `part05-Part05_01.OneMinute`<br>5.1 intro: a clock from int variables vs ClockHand and Clock objects (abstraction, composition) | write a class (given class read-only; hidden harness) | 1: a counter class that wraps to zero at a limit and prints two digits. 2: a stopwatch made of two such counters (hundredths and seconds). 3: a clock of three counters (hours, minutes, seconds). |
| 2 | Getters and toString, again | `part05-Part05_02.Book`<br>5.1 Object<br>5.1 Class (Rectangle review) | write a class (hidden harness) | 1: three getters. 2: toString in a fixed format. 3: a main that creates two objects and prints the one with the larger number field. |
| 3 | Values computed from the state | `part05-Part05_03.Cube`<br>`part05-Part05_04.FitByte`<br>5.1 Person with doubles (BMI, maximum heart rate, Double.valueOf) | write a class (hidden harness); expected doubles computed on a real JDK | 1: a method that computes a volume from one field. 2: toString that includes the computed value. 3: a double formula with two constructor parameters and a percentage argument (own training-zone formula). |
| 4 | Several constructors and this(...) | `part05-Part05_05.ConstructorOverload`<br>5.2 Constructor Overloading<br>5.2 Calling Your Constructor<br>1 quiz in 5.2 (not ported) | write a class (hidden harness); require this( in challenge 3 | 1: two constructors, one with a default. 2: three constructors with different defaults. 3: remove the copied code so the short constructors call the full one with this(...). |
| 5 | Overloaded methods | `part05-Part05_06.OverloadedCounter`<br>5.2 Method Overloading<br>1 quiz in 5.2 (not ported) | write a class (hidden harness) | 1: a counter with a no-argument and a start-value constructor (MOOC part 1). 2: increase(int) and decrease(int) that ignore negative amounts (part 2). 3: implement increase() and decrease() by calling the int versions (require the call). |

### `references`: Primitive and reference variables

MOOC sections: `part-5/3-primitive-and-reference-variables.md`; part-5/4-objects-and-references.md (first sections: assigning a reference, null, NullPointerException)

Section 5.3 has no exercises but is substantive, so it becomes a small module, joined by the first two headings of 5.4 and its NullPointerException exercise. Predict-the-output steps are checked against the real output, and the default Type@hash output is masked because the hash changes between runs.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Values and references | 5.3 intro: Name@4aa298b7 vs toString<br>5.3 Primitive Variables (the eight types, assignment copies)<br>5.4 intro: what new does | fill in the blanks (predict the output; checked against the real output) | 1: predict three int variables after one of them changes. 2: predict what printing an object without toString shows, then add toString. 3: choose a fitting primitive type for four values (a letter, a yes/no, a very large count, a measurement). |
| 2 | Two variables, one object | 5.4 Assigning a reference type variable copies the reference<br>5.3 Reference Variables | fill in the blanks (predict), then write a program (fix the bug; stdout) | 1: predict the output after changing an object through a second variable. 2: fix a program that meant to keep a copy but only copied the reference (create a new object). 3: predict the output after one variable is pointed at a new object. |
| 3 | Objects passed to methods | 5.3 Primitive and Reference Variable as Method Parameters<br>2 quizzes in 5.3 (not ported) | fill in the blanks (predict), then write a method (hidden harness) | 1: predict the output when a method changes an int parameter and an object's field. 2: write a static method that changes an object's state through its setter. 3: predict why assigning a new object to the parameter inside the method does not change the caller's variable. |
| 4 | null and NullPointerException | `part05-Part05_07.NullPointerException`<br>5.4 null value of a reference variable (printing null, garbage collection) | write a program (expected-exception test), then fix programs using the error message | 1: make a program end with NullPointerException right at the start. 2: read a JDK 21 message ('Cannot invoke ... because "x" is null') and fix the line. 3: guard a method call with a null check so the program prints a fallback line. |

### `object-interaction`: Objects working together

MOOC sections: part-5/4-objects-and-references.md (from 'Object as a method parameter' to the end); part-5/5-conclusion.md (reading only, no exercise needed)

Section 5.5 is a recap plus a questionnaire: show the recap as a closing reading card; the questionnaire is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Objects as parameters | `part05-Part05_09.HealthStation`<br>5.4 Object as a method parameter (a ride that checks a Person)<br>5.4 hint: Assisted creation of constructors, getters, and setters (IDE) | write a class (given class read-only; hidden harness) | 1: a method that returns a value read from the parameter object. 2: a method that changes the parameter object. 3: count how many times the method was used in a field. |
| 2 | Cards and terminals | `part05-Part05_10.CardPayments` | write a class (two classes edited; hidden harness) | 1: a 'dumb' card whose takeMoney returns false and changes nothing when the balance is too low (MOOC part 1). 2: a terminal that sells two items for cash and returns the change (part 2). 3: card payments and card top-ups through the terminal (parts 3-4). |
| 3 | An object inside an object | `part05-Part05_08.BiggestPetShop`<br>5.4 Object as object variable (SimpleDate birthday)<br>5.4 hint: Date in Java programs (LocalDate) | write a class (given class read-only; hidden harness) | 1: toString that includes the inner object's toString. 2: a second constructor that builds the inner object from three ints. 3: a method that answers a question by asking the inner object (delegation). |
| 4 | Comparing with another object of the same type | `part05-Part05_11.ComparingApartments`<br>5.4 Object of same type as method parameter (olderThan, before; private fields of the other object) | write a class (hidden harness) | 1: largerThan(other) on one field. 2: the absolute difference of a computed value. 3: a before(other) comparison over three fields (year, month, day). |
| 5 | equals | `part05-Part05_12.Song`<br>`part05-Part05_13.IdenticalTwins`<br>5.4 Comparing the equality of objects (equals)<br>5.4 hint: What is Object? | fill in the blanks (predict default equals), then write a class (hidden harness) | 1: predict what the inherited equals says for two objects with the same fields. 2: write equals(Object) for a class with a String and an int field (hidden test compares with a String object). 3: equals for a class whose field is another object (the inner class needs its own equals). |
| 6 | equals and lists | `part05-Part05_14.Books`<br>`part05-Part05_15.Archive`<br>5.4 Object equality and lists (contains uses equals) | write a program with several classes (stdin-stdout) | 1: show that contains finds an equal object once equals exists. 2: skip duplicates while reading objects. 3: treat two objects as equal by one id field only and keep the first one entered. |
| 7 | Returning a new object | `part05-Part05_16.DatingApp`<br>5.4 Object as a method's return value (clone, factory) | write a class (hidden harness checks that the original is unchanged) | 1: advance a date by one day with 30-day months. 2: advance by n days by calling the one-day method. 3: return a new date n days later and leave the original unchanged. |
| 8 | Immutable objects | `part05-Part05_17.Money`<br>final fields | write a class (hidden harness) | 1: plus returns a new object (integer cents, no doubles). 2: lessThan. 3: minus that never goes below zero; forbid assignments to the fields outside the constructor. |

## Sections and exercises

Kinds: stdin-stdout, method (hidden harness calls a static method), class (hidden harness uses the learner's class), multi-class-program (the learner writes main, and maybe classes, next to other classes; graded by output), file-io, tooling, other (expected-exception programs). Browser: runs-as-is, needs-adaptation, cannot-run-in-browser.

### part-3/1-discovering-errors.md: Discovering errors

Teaches:
- Perceptual blindness (selective attention video): concentrating on one part of a program, typically the loop, hides a bug somewhere else
- Worked example: an averaging program whose final check tests the sum instead of the count (JDK 21 run: input 0, 0, -1 prints 'could not be calculated' although the average is 0.0; check/Avg.java)
- Comments (// and /* */) to explain code while hunting bugs; self-documenting code through names and well-named methods (a fixed method vs a general one with parameters)
- Print debugging: temporary prints of variable values and of control flow ('-- loop exited'), removed afterwards
- Choosing test inputs: corner cases such as no valid input, zeros, very large values
- 2 quizzes, 1 video

No programming exercises in the MOOC, but the section is substantive, so the site gives it its own small module with its own exercises (see the module map).

### part-3/2-lists.md: Lists

Teaches:
- Why lists: many values without many variables; java.util.ArrayList and import
- ArrayList&lt;Type&gt; list = new ArrayList&lt;&gt;(); element types must be reference types: Integer, Double, Boolean, String; automatic boxing of int and double
- First mention of value (primitive) vs reference types
- add(value), get(index); indices start at 0
- IndexOutOfBoundsException and reading the stack trace (method names such as rangeCheck)
- Importing several classes at the top of a file
- size(); iterating with while, with an index for loop, and backwards
- Patterns on a list: print a range of indices, find the greatest/smallest, find the index of a value
- for-each loop: for (Type name : list)
- remove(int index) vs remove(Object value); remove(Integer.valueOf(x)) for Integer lists
- contains(value) returns a boolean
- Lists as method parameters and methods returning a value computed from a list
- A list parameter is a reference: the method changes the caller's list; println(list) prints [a, b, c]
- Summary of list methods (add, size, get, remove, contains)
- 3 quizzes, 2 code-state visualizations

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part03-Part03_01.ThirdElement` | Third element | stdin-stdout | runs-as-is | lists / step 1 "Creating a list, add and get" | Template reads lines until an empty line into an ArrayList&lt;String&gt;; learner changes get(0) to get(2). |
| `part03-Part03_02.SecondPlusThird` | Second plus third | stdin-stdout | runs-as-is | lists / step 2 "Lists of numbers" | ArrayList&lt;Integer&gt;, reading until 0. |
| `part03-Part03_03.IndexOutOfBoundsException` | IndexOutOfBoundsException | other | runs-as-is | lists / step 3 "When the index does not exist" | Program must end with an uncaught IndexOutOfBoundsException without reading input; IoobProgramTest.java calls main and passes only if that exception escapes. Needs an 'expected exception' test kind on the site. |
| `part03-Part03_04.ListSize` | List size | stdin-stdout | runs-as-is | lists / step 4 "How many items: size()" | Task demands the size method; a require rule for '.size()' covers it. |
| `part03-Part03_05.LastInList` | Last in list | stdin-stdout | runs-as-is | lists / step 5 "The first and the last item" | get(size() - 1). |
| `part03-Part03_06.FirstAndLast` | First and last | stdin-stdout | runs-as-is | lists / step 5 "The first and the last item" |  |
| `part03-Part03_07.RememberTheseNumbers` | Remember these numbers | stdin-stdout | runs-as-is | lists / step 6 "Going through a list by index" | Read until -1, then print every element with a loop. |
| `part03-Part03_08.OnlyTheseNumbers` | Only these numbers | stdin-stdout | runs-as-is | lists / step 6 "Going through a list by index" | Print elements between two input indices, inclusive. |
| `part03-Part03_09.GreatestInList` | Greatest in list | stdin-stdout | runs-as-is | lists / step 7 "The greatest and the smallest" | Max search; hidden tests should include all-negative lists. |
| `part03-Part03_10.IndexOf` | Index of | stdin-stdout | runs-as-is | lists / step 8 "Finding where a value is" | Prints every index of a value (duplicates allowed); prints nothing when absent. |
| `part03-Part03_11.IndexOfSmallest` | Index of smallest | stdin-stdout | runs-as-is | lists / step 8 "Finding where a value is" | Sentinel 9999; combine min search and index search. Comparing list elements with == works only for -128..127 (Integer cache, verified on JDK 21: 1000 == 1000 as Integer is false), so hidden tests must use values above 127. |
| `part03-Part03_12.SumOfAList` | Sum of a list | stdin-stdout | runs-as-is | list-methods / step 1 "The for-each loop" | For-each over the list. |
| `part03-Part03_13.AverageOfAList` | Average of a list | stdin-stdout | runs-as-is | list-methods / step 2 "Averages from a list" | Prints a double (23.25 for the sample, verified on JDK 21). |
| `part03-Part03_14.OnTheList` | On the list? | stdin-stdout | runs-as-is | list-methods / step 4 "Is it on the list: contains" | contains. |
| `part03-Part03_15.PrintInRange` | Print in range | method | runs-as-is | list-methods / step 5 "A list as a parameter" | static void method with an ArrayList&lt;Integer&gt; parameter; harness builds lists and captures stdout. |
| `part03-Part03_16.Sum` | Sum | method | runs-as-is | list-methods / step 6 "Returning a value computed from a list" | static int sum(ArrayList&lt;Integer&gt;). |
| `part03-Part03_17.RemoveLast` | Remove last | method | runs-as-is | list-methods / step 7 "The method changes the caller's list" | Mutates the caller's list; harness checks the list afterwards (and the empty-list case). |

### part-3/3-arrays.md: Arrays

Teaches:
- Arrays as the fixed-size ancestor of ArrayList (ArrayList grows by copying into a larger space)
- int[] numbers = new int[3]; String[] strings = new String[5]; elements and indices
- Assigning and reading numbers[i]; index read from the user
- length is a field, not a method; iterating with while and for
- ArrayIndexOutOfBoundsException for index &lt; 0 or &gt;= length
- Reading n values into an array of size n
- Element types: String[], double[]; memory layout hint (int is 32 bits, index = offset)
- Arrays as method parameters: the reference is copied, changes persist
- Array initializer: int[] numbers = {100, 1, 42};
- 1 quiz, 1 code-state visualization

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part03-Part03_18.Swap` | Swap | stdin-stdout | runs-as-is | arrays / step 2 "Swapping two elements" | Swap with a temporary variable. |
| `part03-Part03_19.IndexWasNotFound` | Index was not found | stdin-stdout | runs-as-is | arrays / step 3 "length and loops over an array" | Linear search in a given array; 'not found' message. |
| `part03-Part03_20.SumOfArray` | Sum of array | method | runs-as-is | arrays / step 4 "Arrays as parameters" | static int sumOfNumbersInArray(int[]). |
| `part03-Part03_21.PrintNeatly` | Print neatly | method | runs-as-is | arrays / step 5 "Printing an array neatly" | Comma-separated output with System.out.print, no trailing comma; harness captures stdout of the call. |
| `part03-Part03_22.PrintInStars` | Print in stars | method | runs-as-is | arrays / step 6 "Rows of stars from an array" | One row of stars per element (nested repetition). |

### part-3/4-strings.md: Using strings

Teaches:
- Review: reading with nextLine, concatenation with +
- Comparing with equals, never ==; negation with !; NullPointerException if the string is null
- split(" ") returns a String[]; pieces[i]; pieces.length
- String.contains
- Fixed-format data (CSV): split(","), Integer.valueOf(parts[1]); sum and average of a column
- charAt(index) (info box on hidden messages) and length() (hint box)
- No quizzes

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part03-Part03_23.PrintThrice` | Print thrice | stdin-stdout | runs-as-is | strings / step 1 "Reading and joining strings" | Task forbids a loop; PrintThriceTest.java only checks that the output contains the word three times in a row and not four. Site: forbid rule on while/for. |
| `part03-Part03_24.IsItTrue` | Is it true | stdin-stdout | runs-as-is | strings / step 2 "equals and not equals" | String equals. |
| `part03-Part03_25.Login` | Login | stdin-stdout | runs-as-is | strings / step 3 "Checking two inputs together" | Two users hard-coded; equals combined with &&; forbid == on strings. |
| `part03-Part03_26.LineByLine` | Line by line | stdin-stdout | runs-as-is | strings / step 4 "Splitting a line into pieces" | split on a single space. split takes a regular expression and keeps empty pieces between double spaces (verified: "a  b ".split(" ") is [a, , b]). |
| `part03-Part03_27.AVClub` | AV Club | stdin-stdout | runs-as-is | strings / step 5 "Searching inside pieces: contains" | String.contains on each piece. |
| `part03-Part03_28.FirstWords` | First words | stdin-stdout | runs-as-is | strings / step 6 "The first and the last piece" |  |
| `part03-Part03_29.LastWords` | LastWords | stdin-stdout | runs-as-is | strings / step 6 "The first and the last piece" | pieces[pieces.length - 1]. |
| `part03-Part03_30.AgeOfTheOldest` | Age of the oldest | stdin-stdout | runs-as-is | strings / step 7 "Fixed-format data" | CSV name,age from stdin. |
| `part03-Part03_31.NameOfTheOldest` | Name of the oldest | stdin-stdout | runs-as-is | strings / step 7 "Fixed-format data" |  |
| `part03-Part03_32.PersonalDetails` | Personal details | stdin-stdout | runs-as-is | strings / step 8 "Challenge: longest name and average year" | Longest name plus average birth year as a double (2014.8 and 1930.0 for the two samples, verified on JDK 21). Ties may print any name in the MOOC; the site must pick one rule (first longest) so output is deterministic. |

### part-3/5-increasing-amounts-of-data.md: Summary

Teaches:
- Three-sentence recap: lists and arrays store many values; strings split into pieces
- Survey quiz (admin)

No programming exercises. **No exercise needed**: the recap becomes a closing reading card and the questionnaire is dropped (see the module map).

### part-4/1-introduction-to-object-oriented-programming.md: Introduction to object-oriented programming

Teaches:
- Concepts: class (blueprint), object (instance), instance variables (state), methods (behaviour), constructor, new; house blueprint analogy
- Using objects of a ready-made class (Account) from main
- Creating a class in its own file (Person.java) with the NetBeans New Java Class dialog; class diagrams (10 diagram images, plus two house photos and a NetBeans screenshot)
- private instance variables and encapsulation
- Constructors: same name as the class, this.name = initialName; the default constructor exists only if no constructor is written
- Object methods without static; each object has its own instance variables
- Changing state in a method (growOlder, with a limit)
- Return values (int, String, double, boolean); getters named getX
- toString; println(obj) calls toString automatically
- Setters and parameters; a parameter with the same name as a field and this.height = height (and the height = height bug)
- Calling the object's own methods (this.bodyMassIndex())
- Rounding errors with double (hint box); money as integer cents
- 2 quizzes, 3 videos

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part04-Part04_01.YourFirstAccount` | Your first account | multi-class-program | needs-adaptation | classes / step 1 "Using objects of a ready-made class" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. TMC checks the constructor arguments and the deposit call with PowerMock/EasyMock constructor mocking (YourFirstAccountTest.java), which cannot run in a browser; use a site-authored Account that logs calls for the hidden harness. |
| `part04-Part04_02.YourFirstBankTransfer` | Your first bank transfer | multi-class-program | needs-adaptation | classes / step 1 "Using objects of a ready-made class" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Same PowerMock verification as Part04_01 (YourFirstBankTransferTest.java). |
| `part04-Part04_03.DogAttributes` | Dog attributes | class | needs-adaptation | classes / step 2 "Declaring a class and its fields" | The task is mostly the NetBeans 'New Java Class' dialog; the site needs a 'New class' button or a pre-made Dog.java tab. DogTest.java checks exactly three declared fields with given names, types and private (Reflex/getDeclaredFields): needs reflection in the runtime or a source-pattern rule. |
| `part04-Part04_04.Room` | Room | class | runs-as-is | classes / step 3 "Constructors" | Constructor only, no getters: the harness must read private fields by reflection, or the site version adds a toString to check. |
| `part04-Part04_05.Whistle` | Whistle | class | runs-as-is | classes / step 4 "Methods that print" | void method that prints a field. |
| `part04-Part04_06.Door` | Door | class | runs-as-is | classes / step 4 "Methods that print" | No fields; no-argument constructor. |
| `part04-Part04_07.Product` | Product | class | runs-as-is | classes / step 4 "Methods that print" | Prints a double field (1.1). The MOOC sample capitalises the name differently from the value given; the site derives expected output from its reference solution. |
| `part04-Part04_08.DecreasingCounter` | Decreasing counter (3 parts) | class | runs-as-is | classes / step 5 "Methods that change the state" | decrement, not below zero, reset. The MOOC's printed template has 'public void printValue {' without parentheses; the site writes its own seed. |
| `part04-Part04_09.Debt` | Debt | class | runs-as-is | classes / step 6 "State that grows: doubles" | Compound growth printed as doubles: 121200.0 and 147887.0328416936 after 21 years at 1.01 (verified on JDK 21). |
| `part04-Part04_10.Song` | Song | class | runs-as-is | object-methods / step 1 "Returning values: getters" | Two getters named like the fields. |
| `part04-Part04_11.Film` | Film | class | runs-as-is | object-methods / step 1 "Returning values: getters" | Class with getters; the sample main reads an age with Scanner. FilmTest.java tests the class only. |
| `part04-Part04_12.Gauge` | Gauge | class | runs-as-is | object-methods / step 2 "Methods with rules and boolean answers" | Bounded increase/decrease and a boolean method. |
| `part04-Part04_13.Agent` | Agent | class | runs-as-is | object-methods / step 3 "toString" | Replace a print method with toString; toString must not print (harness checks stdout stays empty). |
| `part04-Part04_14.Multiplier` | Multiplier | class | runs-as-is | object-methods / step 4 "Parameters, setters and this" | Field and parameter with the same name. |
| `part04-Part04_15.NumberStatistics` | Statistics (4 parts) | multi-class-program | needs-adaptation | object-methods / step 5 "Calling your own methods"<br>object-methods / step 6 "Using your class from main" | Parts 1-2: the Statistics class (count, sum, average). Parts 3-4: a main program in a second file that must use one, then three Statistics objects created in a fixed order; StatisticsBTest.java checks this with PowerMock expectNew. Multi-file: the learner edits two files (a class and Main.java), compiled together; needs a tabbed editor. Replace the mock with a site-authored instance counter in the hidden harness or a require rule counting 'new Statistics('. |
| `part04-Part04_16.PaymentCard` | Payment Card (6 parts) | class | needs-adaptation | object-methods / step 7 "Building a class in stages" | Parts 1-5 build PaymentCard (toString, two spending methods, no negative balance, top-up capped at 150, negative top-up ignored); part 6 writes MainProgram.main in a second file with two cards (PaymentCardTest.java calls MainProgram.main for 04-16.6). Outputs such as 40.199999999999996 and 22.799999999999997 must match the JDK (verified on JDK 21). |

### part-4/2-objects-in-a-list.md: Objects in a list

Teaches:
- Review: three ways to go through a list (while, index for, for-each)
- ArrayList&lt;Person&gt;; adding objects, including new Person(...) inline
- Creating objects from user input until an empty line (String.isEmpty())
- Constructors with several parameters fed by separate inputs
- Info box: one line per object, split on commas
- Filtered printing with a getter (age limit)
- No quizzes

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part04-Part04_17.Items` | Items | multi-class-program | needs-adaptation | lists-of-objects / step 2 "Objects from user input" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. The given Item class stamps LocalDateTime.now() and formats it with DateTimeFormatter 'dd.MM.yyyy HH:mm:ss' (Item.java in the TMC template), so output depends on the clock; ItemsTest.java only checks 'name (created at: '. The site's version should not print times, or should inject a fixed clock. |
| `part04-Part04_18.PersonalInformation` | Personal information | multi-class-program | needs-adaptation | lists-of-objects / step 3 "Several inputs per object" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Three inputs per object, prints two fields. |
| `part04-Part04_19.TelevisionPrograms` | Television programs | multi-class-program | needs-adaptation | lists-of-objects / step 4 "Filtering while going through the list" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Given TelevisionProgram class; filter by a maximum duration. |
| `part04-Part04_20.Books` | Books | multi-class-program | needs-adaptation | lists-of-objects / step 5 "Challenge: your own class and program" | Learner writes both a Book class and main (two points, BooksTest.java @Points 04-20.1 04-20.2). Multi-file: the learner edits two files (a class and Main.java), compiled together; needs a tabbed editor. |

### part-4/3-files-and-reading-data.md: Files and reading data

Teaches:
- Review: reading from the keyboard until 'end'; converting lines to integers
- Files, file formats and the file system; the project root folder (NetBeans Files tab, src and pom.xml)
- new Scanner(Paths.get("file.txt")), hasNextLine(), nextLine() inside try-with-resources with catch (Exception e)
- Reading the file name from the user
- Reading all lines into an ArrayList
- Skipping empty lines with isEmpty() and continue (hint box)
- CSV records in a file: split(","), Integer.valueOf; creating objects from lines; reading records in a method that returns ArrayList&lt;Person&gt;
- No quizzes

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part04-Part04_21.NumberOfStrings` | Number of Strings | stdin-stdout | runs-as-is | reading-files / step 1 "Reading until a stop word" | Count lines before 'end'. |
| `part04-Part04_22.Cubes` | Cubes | stdin-stdout | runs-as-is | reading-files / step 1 "Reading until a stop word" | Cube each number until 'end'. |
| `part04-Part04_23.CreatingANewFile` | Creating a New File | tooling | needs-adaptation | reading-files / step 2 "Files and folders" | No programming: create file.txt in the project root with NetBeans' Files tab. CreatingANewFileTest.java checks the file exists and its first line starts with the required text (.tmcproject.yml lists file.txt under extra_student_files). Site: a file panel in the editor; the check reads the virtual file. |
| `part04-Part04_24.PrintingAFile` | Printing a File | file-io | needs-adaptation | reading-files / step 3 "Reading a file line by line" | Reads data.txt from the working directory. PrintingAFileTest.java rewrites data.txt with new (partly random UUID) content before each test, which matches per-test in-memory files (C/C++ Arena's files: field). |
| `part04-Part04_25.PrintingASpecifiedFile` | Printing a Specified File | file-io | needs-adaptation | reading-files / step 3 "Reading a file line by line" | File name read from stdin; per-test files. |
| `part04-Part04_26.GuestListFromAFile` | Guest List From a File | file-io | needs-adaptation | reading-files / step 4 "Loading lines into a list" | Lines into a list, then contains; given files names.txt and other-names.txt. |
| `part04-Part04_27.IsItInTheFile` | Is it in the file? | file-io | needs-adaptation | reading-files / step 5 "When reading fails" | Must print a failure message for a missing file. On JDK 21 new Scanner(Paths.get("nonexistent.txt")) throws java.nio.file.NoSuchFileException whose getMessage() is the file name (verified); the runtime's virtual file system must throw an IOException the same way. |
| `part04-Part04_28.NumbersFromAFile` | Numbers From a File | file-io | needs-adaptation | reading-files / step 6 "Numbers from a file" | Integer.valueOf per line; count numbers within bounds. |
| `part04-Part04_29.RecordsFromAFile` | Records From a File | file-io | needs-adaptation | reading-files / step 7 "Records from a file" | CSV name,age; 'year' vs 'years'. |
| `part04-Part04_30.StoringRecords` | Storing Records | file-io | needs-adaptation | reading-files / step 8 "A method that reads objects" | static ArrayList&lt;Person&gt; readRecordsFromFile(String file) with a given Person class; StoringRecordsTest.java calls the method with its own files (tiedosto1.txt, tiedosto2.txt). Method harness plus per-test files plus a read-only Person tab. |
| `part04-Part04_31.SportStatistics` | Sport Statistics | file-io | needs-adaptation | reading-files / step 9 "Challenge: match results" | Two parts: games, then wins and losses of a team from data.csv (4 fields per line). The MOOC's second sample prompts 'Name:' where the first says 'Team:'; the site defines one prompt. |

### part-4/4-summary.md: Summary

Teaches:
- Short recap: files, classes, constructors, methods, toString, objects in lists
- Questionnaire (admin)

No programming exercises. **No exercise needed**: the recap becomes a closing reading card and the questionnaire is dropped (see the module map).

### part-5/1-learning-object-oriented-programming.md: Learning object-oriented programming

Teaches:
- A clock written with three int variables vs a ClockHand class; abstraction hides the wrap-around logic
- A Clock class composed of three ClockHand objects: programs built from small cooperating objects
- Object: data plus behaviour; state; the features of a class depend on the application's use case
- Person with double weight and height: BMI and maximum heart rate; reading a double with Double.valueOf
- Class review with a Rectangle (widen, narrow, surfaceArea, toString)
- No quizzes

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part05-Part05_01.OneMinute` | One Minute | class | needs-adaptation | class-design / step 1 "From variables to objects" | Timer built from the given ClockHand class (second file, read-only). The suggested demo main loops forever with Thread.sleep(10); the site should give a bounded demo instead and rely on the run time limit. TimerTest.java tests toString after N advance() calls. |
| `part05-Part05_02.Book` | Book | class | runs-as-is | class-design / step 2 "Getters and toString, again" | Getters plus toString. |
| `part05-Part05_03.Cube` | Cube | class | runs-as-is | class-design / step 3 "Values computed from the state" | Derived value (volume) in a method and in toString. |
| `part05-Part05_04.FitByte` | Fitbyte | class | runs-as-is | class-design / step 3 "Values computed from the state" | Double formula; the sample loop adds 0.1 repeatedly and prints 89.99999999999999% (verified on JDK 21). The MOOC sample shows '159,976' where Java prints 159.976 (verified). |

### part-5/2-method-and-constructor-overloading.md: Removing repetitive code (overloading methods and constructors)

Teaches:
- Constructor overloading; two constructors cannot have the same parameter types (name + int weight vs name + int age)
- Calling another constructor with this(...), which must be the first statement
- Method overloading (growOlder() and growOlder(int)); implementing one overload with the other
- 2 quizzes, 1 video

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part05-Part05_05.ConstructorOverload` | Constructor Overload | class | runs-as-is | class-design / step 4 "Several constructors and this(...)" | Three constructors with defaults; the site can require this(...) to remove duplication. |
| `part05-Part05_06.OverloadedCounter` | Overloaded Counter (2 parts) | class | runs-as-is | class-design / step 5 "Overloaded methods" | Two constructors, then increase/decrease with and without an int parameter. CounterTest.java uses its own reflection helpers (ConstructorSignature.java, MethodSignature.java) to report missing signatures. |

### part-5/3-primitive-and-reference-variables.md: Primitive and reference variables

Teaches:
- Primitive vs reference variables; printing an object without toString shows Name@4aa298b7 (type and identifier)
- The eight primitive types and their ranges (boolean, byte, char, short, int, long, float, double)
- Assignment copies a primitive value; parameters receive copies
- new returns a reference; the state behind a reference can change
- Passing a reference to a method: the method changes the same object (youthen example), with call stack and heap drawings
- Hint box: memory details are simplified
- 2 quizzes, 1 code-state visualization, 5 memory drawings

No programming exercises in the MOOC, but the section is substantive, so the site gives it its own small module with its own exercises (see the module map).

### part-5/4-objects-and-references.md: Objects and references

Teaches:
- What new does: reserve memory, default values, run the constructor, return a reference
- Assigning a reference copies the reference (aliasing); reassigning one variable to a new object
- null, unreachable objects and garbage collection; printing null prints 'null'; NullPointerException
- Objects as method parameters (a ride checks a Person's height and counts visitors)
- NetBeans code generation for constructors, getters and setters (ctrl+space)
- An object as an instance variable (SimpleDate birthday); hint box on java.time.LocalDate
- A parameter of the same type (olderThan, before); private fields of another object of the same class are accessible
- equals: the default compares references; equals(Object) with ==, instanceof and a cast; every class inherits Object
- ArrayList.contains uses equals
- Returning objects (clone, a factory); returning a new object instead of changing this one; immutable objects with final fields
- No quizzes, 6 memory drawings

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part05-Part05_07.NullPointerException` | NullPointerException | other | runs-as-is | references / step 4 "null and NullPointerException" | Program must end with an uncaught NullPointerException at start-up (NPEErrorTest.java). Needs the 'expected exception' test kind. JDK 21 prints helpful messages such as 'Cannot invoke "String.length()" because "joan" is null' only when compiled with -g; without it the name shows as "&lt;local1&gt;" (verified). |
| `part05-Part05_09.HealthStation` | Health station (3 parts) | class | needs-adaptation | object-interaction / step 1 "Objects as parameters" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Learner edits HealthStation; Person is given and must not change. weigh, feed, weighings counter. |
| `part05-Part05_10.CardPayments` | Card payments (4 sections) | class | needs-adaptation | object-interaction / step 2 "Cards and terminals" | Learner edits two classes (PaymentCard.takeMoney, then PaymentTerminal for cash, card payments and top-ups), compiled together; needs a tabbed editor. Doubles such as 1009.3 and 97.7 (verified on JDK 21). The MOOC's code prints 'successfully withdrew' where its sample shows 'successfully took'; the site writes its own text. |
| `part05-Part05_08.BiggestPetShop` | Biggest pet shop | class | needs-adaptation | object-interaction / step 3 "An object inside an object" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Learner edits Person.toString to use the given Pet's getters. |
| `part05-Part05_11.ComparingApartments` | Comparing apartments (3 parts) | class | runs-as-is | object-interaction / step 4 "Comparing with another object of the same type" | largerThan, priceDifference (absolute value), moreExpensiveThan. |
| `part05-Part05_12.Song` | Song | class | runs-as-is | object-interaction / step 5 "equals" | equals(Object) with instanceof and a cast. |
| `part05-Part05_13.IdenticalTwins` | Identical twins | class | needs-adaptation | object-interaction / step 5 "equals" | Multi-file: needs a tabbed editor with the given class(es) as read-only tabs, compiled together with the learner's files. Person.equals must compare a SimpleDate field without ==. The MOOC text says there are no tests, but the TMC template has IdenticalTwinsTest.java with equality tests. |
| `part05-Part05_14.Books` | Books | multi-class-program | needs-adaptation | object-interaction / step 6 "equals and lists" | Learner adds equals to Book and uses contains in main to skip duplicates. Multi-file: the learner edits two files (a class and Main.java), compiled together; needs a tabbed editor. |
| `part05-Part05_15.Archive` | Archive (2 parts) | multi-class-program | needs-adaptation | object-interaction / step 6 "equals and lists" | Learner writes an Item class and main; part 2 makes equality depend on the identifier only. Multi-file: the learner edits two files (a class and Main.java), compiled together; needs a tabbed editor. |
| `part05-Part05_16.DatingApp` | Dating app (3 parts) | class | runs-as-is | object-interaction / step 7 "Returning a new object" | advance(), advance(int) and afterNumberOfDays returning a new SimpleDate (30-day months). The MOOC's sample main refers to an undefined variable 'pvm'; the site writes its own. |
| `part05-Part05_17.Money` | Money (3 parts) | class | runs-as-is | object-interaction / step 8 "Immutable objects" | Immutable class with final fields: plus, lessThan, minus (floor at zero). The given toString pads with 'if (cents &lt;= 10)', so 10 cents prints as '10.010e' (verified on JDK 21); the site's own class should use &lt; 10. |

### part-5/5-conclusion.md: Conclusion

Teaches:
- Short recap: primitive vs reference, overloading, objects as fields, parameters and return values, comparing objects
- Questionnaire (admin)

No programming exercises. **No exercise needed**: the recap becomes a closing reading card and the questionnaire is dropped (see the module map).

## Browser issues and proposals

### classes, object-methods, lists-of-objects, reading-files, class-design, object-interaction (16 exercises from Part04_01 on have the learner edit or read two or more source files)

- **Issue.** From Part 4 the MOOC puts every class in its own file (Person.java next to Main.java) and many exercises give read-only classes (Account, Item, PersonalInformation, TelevisionProgram, Person, Pet, ClockHand, SimpleDate) next to the file the learner edits. C/C++ Arena's editor holds a single file: its header lesson says so and pastes a header into the one file to simulate an include (content/lessons/18-c-program.yaml, line 58).
- **Proposal.** Add a files map to a step (name, content, editable or read-only, visible or hidden) and compile all units together, with the hidden harness as one more unit. Show tabs; add a 'New class' button that creates Name.java with a class skeleton (replaces the NetBeans dialog in Part04_03 and Part04_16). Keep the rule 'public class Name lives in Name.java' and explain javac's error for it in plain English.

### Every class and multi-class exercise (27 class and 9 multi-class-program exercises, Part04_01 to Part05_17)

- **Issue.** TMC tests find classes, constructors, methods and fields by reflection (55 of the 80 exercise folders of Parts 3-5 have a test that uses fi.helsinki.cs.tmc.edutestutils Reflex or ReflectionUtils, counted with grep in the clone), so a missing method gives a friendly message instead of a compile error in test code. DogTest.java checks that exactly three private fields exist (getDeclaredFields, field modifiers). Room has no getters, so its test must read private fields.
- **Proposal.** Hidden harness in Java that looks members up with java.lang.reflect (Class.forName, getConstructor, getMethod, getDeclaredFields, Modifier.isPrivate, Field.setAccessible) and prints @@PASS/@@FAIL lines like C/C++ Arena. Whether the chosen browser runtime supports this reflection is not verified here; if it does not, fall back to calling members directly (compile errors mapped to 'expected constructor Room(String, int)') plus source-pattern rules for 'private' fields.

### classes / Using objects of a ready-made class (Part04_01, Part04_02); object-methods / Using your class from main (Part04_15 parts 3-4)

- **Issue.** Three TMC tests use PowerMock with EasyMock to intercept constructors and verify calls (YourFirstAccountTest.java, YourFirstBankTransferTest.java, StatisticsBTest.java; the pom.xml files add PowerMock). This relies on bytecode rewriting in a special class loader, which a browser runtime is not expected to offer (unverified).
- **Proposal.** The site owns the given classes, so it can ship a hidden variant that appends each constructor and method call to a static log the harness checks (for example 'new Account("x", 100.0)', 'deposit(20.0)', or the order in which three Statistics objects were created). Add output tests and a require rule counting 'new Statistics('.

### lists / When the index does not exist (Part03_03); references / null and NullPointerException (Part05_07)

- **Issue.** These exercises pass only if the program ends with a specific uncaught exception (IoobProgramTest.java, NPEErrorTest.java). The MOOC text shows an older JDK's messages ('Index: 2, Size: 2' from ArrayList.rangeCheck, and a bare NullPointerException); JDK 21 prints 'Index 2 out of bounds for length 2' and helpful NPE messages such as 'Cannot invoke "String.length()" because "joan" is null', and exits with status 1 (all verified with java 21.0.10). Without javac -g the variable shows as "&lt;local1&gt;" (verified).
- **Proposal.** Add a test kind 'exception: java.lang.IndexOutOfBoundsException' that passes when stderr starts with 'Exception in thread "main" &lt;class&gt;' and the exit status is 1. Compile learner code with -g so helpful NPE messages name variables. Explain the first line and the first 'at' line of a stack trace in plain English, as C/C++ Arena does for compiler errors.

### reading-files (Part04_23 to Part04_31)

- **Issue.** The programs read files relative to the working directory with new Scanner(Paths.get(name)) inside try-with-resources. TMC tests write fresh files before each test (PrintingAFileTest.java writes random UUID lines to data.txt; StoringRecordsTest.java uses tiedosto1.txt and tiedosto2.txt). Part04_27 must handle a missing file: JDK 21 throws java.nio.file.NoSuchFileException whose getMessage() is just the file name (verified).
- **Proposal.** Reuse C/C++ Arena's per-test files: map (each test gets its own in-memory folder) and back java.io/java.nio file access with it. The runtime must support Paths.get, Scanner(Path), hasNextLine, NoSuchFileException and AutoCloseable. Show the step's data files in a read-only file panel so learners can see what the program reads. Use fixed hidden data instead of TMC's random content so expected output can be precomputed.

### reading-files / Files and folders (Part04_23 CreatingANewFile)

- **Issue.** A tooling exercise: create file.txt in the NetBeans Files tab in the folder that holds src and pom.xml. The test only checks that the file exists and starts with the required text (CreatingANewFileTest.java).
- **Proposal.** Text-based version in the browser: the file panel lets learners add and edit a file in the virtual project root, and a given program reads it. Optionally teach the real Maven layout (src/main/java, pom.xml, working directory) in the first run-on-your-computer project, graded by GitHub Actions with Maven and JUnit: for example a CSV report program with the site's own tests. Not required for Parts 3-5, since everything else runs in the browser.

### lists-of-objects / Objects from user input (Part04_17 Items)

- **Issue.** The given Item class records LocalDateTime.now() and formats it with DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm:ss") (Item.java in the TMC template), so the output changes every run; ItemsTest.java only checks for 'name (created at: '.
- **Proposal.** The site's own given class should not print times (use a running serial number instead), so exact output tests work. If java.time is kept anywhere, the harness must mask it.

### class-design / From variables to objects (Part05_01 OneMinute)

- **Issue.** The suggested demo main loops forever and calls Thread.sleep(10) each round; the learner stops it with NetBeans' stop button.
- **Proposal.** Give a bounded demo (advance 250 times, print every 50th state) and keep the run time limit and a Stop button for accidents. Support Thread.sleep only if the runtime can block cheaply in a worker (unverified; a question for the runtime research).

### Every step that prints doubles (averages, Debt, PaymentCard, Fitbyte, CardPayments, BMI examples)

- **Issue.** Expected outputs depend on the JDK's double formatting. Verified on JDK 21.0.10 (check/Check.java): 50 - 2.60 - 4.60 - 2.60 prints 40.199999999999996, 5 - 4.60 prints 0.40000000000000036, 120000.0 * 1.01^21 prints 147887.0328416936, 86 / (1.80 * 1.80) prints 26.54320987654321, and repeatedly adding 0.1 to 0.5 prints 89.99999999999999. Several MOOC sample outputs do not match a real JVM: 'Matti L. 1.20' (Java prints 1.2), 'Age average: 1.666' (Java prints 1.6666666666666667), and Fitbyte's '159,976' (Java prints 159.976).
- **Proposal.** As for Parts 1-2: compute expected output at build time from reference solutions on a real JDK and cross-check every solution in the browser runtime in CI. Never copy expected output from MOOC samples.

### lists (Finding where a value is, Part03_11), list-methods, object-interaction (equals)

- **Issue.** Comparing Integer list elements with == works for -128..127 and fails above (verified: two boxed 1000 values compare false, two boxed 100 values compare true, JDK 21). remove(15) on an ArrayList&lt;Integer&gt; removes index 15 while remove(Integer.valueOf(15)) removes the value (verified [15, 18, 21, 24] becomes [18, 24] after remove(2) and remove(Integer.valueOf(15))).
- **Proposal.** The runtime must reproduce the JVM's Integer cache and overload resolution exactly (a real JVM or javac-compiled bytecode does; a source-level translator might not, unverified). Hidden tests use values above 127 wherever a learner might compare with ==, and a drill explains the trap.

### strings (Splitting, First and last piece), reading-files (CSV steps)

- **Issue.** String.split takes a regular expression: "a.b".split(".") has length 0 and "a|b".split("|") has length 3; "a  b ".split(" ") is [a, , b] and "".split(" ") has length 1 (all verified on JDK 21).
- **Proposal.** The runtime needs java.util.regex behind split. Hidden tests include double spaces and trailing separators only where the step text says how to treat them.

### Most stdin programs in Parts 3-5

- **Issue.** TMC tests usually check that the output contains the expected lines (for example PrintThriceTest.java checks 'contains word three times and not four'; BooksTest.java and ItemsTest.java check contains), so prompt wording did not matter. C/C++ Arena compares normalized whole output, so a different prompt fails.
- **Proposal.** Keep exact comparison (it teaches precision) but state every prompt in the task card, show a line diff, and offer a per-test 'lines in order' matcher for steps where prompts are not the point. Interleaving input with prompts for display is the same issue the Parts 1-2 report raises.

### references, object-interaction (default toString and equals)

- **Issue.** Printing an object without toString shows ClassName@hash (for example Name@4aa298b7 in the MOOC); the hash differs between runs (verified format Check$Name@&lt;hex&gt;).
- **Proposal.** Tests must never compare such output. Predict-the-output drills mask the hash as Name@... and accept any hex. The runtime must implement Object.toString and identity hashCode in the JDK format.

### debugging / Print debugging

- **Issue.** The MOOC's debug prints go to System.out, which would break stdout tests.
- **Proposal.** Teach debug prints on System.err, show stderr in its own pane and never grade it. Add a lint warning when System.err prints remain in a solution that is otherwise correct.

### lists, arrays, references, classes (4 code-state visualizations in 3.2, 3.3 and 5.3; 2 list drawings in 3.2; 11 memory drawings in 5.3 and 5.4; 10 class diagrams in 4.1)

- **Issue.** The MOOC's execution traces and drawings are its own material, and the reference drawings (stack on the left, heap objects on the right, arrows) are exactly what Parts 4-5 need.
- **Proposal.** Record the site's own traces for its own examples (the equivalent of C/C++ Arena's gdb tracer; for Java for example a JDI-based tracer at build time, tool choice unverified) and draw references as arrows. Priorities: a list passed to a method, two variables sharing one object, null, an object inside an object. Draw simple class boxes (name, fields, methods) as inline SVG instead of the MOOC's diagram images.

### NetBeans-specific instructions (4.1 New Java Class, 4.3 Files tab, 5.1 stop button, 5.4 ctrl+space code generation)

- **Issue.** IDE actions are part of the text and of Part04_03 and Part04_23.
- **Proposal.** Replace with site features: New class button, file panel, Stop button. Code generation for getters and setters is optional; mention it as an IDE feature in the run-on-your-computer track.

### Checkstyle in Parts 3-5

- **Issue.** In the learner repository clone, none of the 80 exercise folders of Parts 3-5 has a .checkstyle.xml or .tmcproject.json; 79 have an identical .tmcproject.yml with only 'force_new_sandbox: true' and Part04_23 adds 'extra_student_files: file.txt' (checked with md5sum). The same clone has Checkstyle configs in Part01_25 to Part02_34 (per the Parts 1-2 report). Whether the live course grades style in Parts 3-5 is not verified beyond this copy.
- **Proposal.** Keep the in-browser style check from the Parts 1-2 proposal as a warning only in these modules.

## Java APIs the runtime must support for Parts 3 to 5

- java.util.ArrayList&lt;E&gt;: new ArrayList&lt;&gt;(), add(E), get(int), size(), remove(int), remove(Object), contains(Object) (uses equals), toString() in the form [a, b, c], iteration with for-each (Iterable, Iterator)
- Boxing and unboxing: Integer, Double, Boolean as list element types; Integer.valueOf(int) cache for -128..127 (== behaviour must match the JVM)
- Arrays: new int[n], new String[n], new double[n], array initializers {1, 2, 3}, .length, default values 0 and null, ArrayIndexOutOfBoundsException
- String: equals(Object), contains(CharSequence), split(String) with regular-expression semantics, length(), charAt(int), isEmpty(), concatenation with + (including char + int arithmetic)
- Integer.valueOf(String), Double.valueOf(String) (Integer.parseInt appears only in learner code, not in the MOOC text)
- java.util.Scanner: Scanner(System.in).nextLine(); Scanner(java.nio.file.Path) with hasNextLine() and nextLine(); close() through try-with-resources (AutoCloseable)
- java.nio.file.Paths.get(String) and Path; java.nio.file.NoSuchFileException (an IOException) with the file name as its message; Exception.getMessage()
- Exceptions learners meet: IndexOutOfBoundsException, ArrayIndexOutOfBoundsException, NullPointerException (helpful messages need -g), NumberFormatException, NoSuchElementException; uncaught exceptions print 'Exception in thread "main" ...' and exit with status 1
- Classes: constructors, this, this(...) constructor chaining, private fields, final fields, overloading, instance methods, static methods, @Override annotation
- java.lang.Object: default toString() (ClassName@hex identity hash), default equals (identity), equals(Object) overriding, instanceof, casts
- System.out.println(Object) calling toString (and printing null as 'null'), System.out.print; System.err.println for debug output
- java.time.LocalDateTime.now() and java.time.format.DateTimeFormatter.ofPattern(String).format(...) (only in the MOOC's given Item class, Part04_17)
- java.time.LocalDate.now(), getYear(), getMonthValue(), getDayOfMonth() (hint box in 5.4, no exercise)
- Thread.sleep(long) (only in the suggested demo main of Part05_01)
- Math.abs (natural for the price difference in Part05_11; the MOOC text does not name it)
- Test harness only: java.lang.reflect (Class.forName, getConstructor, getMethod, getDeclaredFields, getDeclaredField, Field.setAccessible, Modifier.isPrivate, Method.invoke), System.setOut, java.io.PrintStream, java.io.ByteArrayOutputStream, System.setIn with java.io.ByteArrayInputStream (to run main several times)
- Not needed in the browser: JUnit 4, fi.helsinki.cs.tmc edu-test-utils, PowerMock and EasyMock (used by the TMC tests; replaced by the site's own harness), java.util.UUID and java.util.Random (used only by TMC tests to make random data)

Verified on JDK 21.0.10 (`check/Check.java`, `check/Split.java`, `check/nog/Npe.java`): `list.get(2)` on a 2-element list throws `java.lang.IndexOutOfBoundsException: Index 2 out of bounds for length 2`; `arr[5]` on `new int[5]` gives `ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5`; a null call gives `Cannot invoke "String.length()" because "joan" is null` with `-g` and `"<local1>"` without it, exit status 1; `new Scanner(Paths.get("nonexistent.txt"))` throws `java.nio.file.NoSuchFileException` with message `nonexistent.txt`; printing an `ArrayList` holding 3, 2, 6, -1 shows `[3, 2, 6, -1]`; `1.20` prints `1.2`; `5 / 3.0` prints `1.6666666666666667`; `(Integer) 1000 == (Integer) 1000` is `false` and `100 == 100` is `true`; `"a.b".split(".")` has length 0; `'e' + 1` prints `102`.

## Not carried over

- 15 quizzes (only their ids are in the repo: 2 in 3.1, 3 in 3.2, 1 in 3.3, 1 in 3.5, 2 in 4.1, 1 in 4.4, 2 in 5.2, 2 in 5.3, 1 in 5.5), 5 YouTube videos (1 in 3.1, 3 in 4.1, 1 in 5.2), the surveys and questionnaires in 3.5, 4.4 and 5.5, and the 4 code-state visualizations (the site should record its own).
- NetBeans and TMC instructions (New Java Class dialog, Files tab, stop button, ctrl+space code generation, 'return it to the server').

## Gaps and overlaps worth knowing

- The MOOC text in Parts 3-5 never uses `switch`, the ternary operator, `do`-`while`, `String.format`/`printf`, `Math` methods, `Arrays` or `Collections` utilities, `substring`, `indexOf`, `trim`, `toUpperCase`, `var` or lambdas (searched in the cleaned markdown; 'switch' occurs once, as an English verb). `char` and `long` appear only in the list of primitive types and in the `charAt` info box. A site aiming for parity with C/C++ Arena would add them elsewhere; later MOOC parts may cover some.
- `hashCode` is never mentioned in Parts 3-5, although 5.4 overrides `equals`. The outline puts HashMap in 8.2 and 'Similarity of objects' in 8.3 (which presumably covers hashCode; not checked here), so the site could add a one-line note in `object-interaction` that equal objects need equal hash codes, pointing forward.
- Part 6 (6.1 'Objects on a list and a list as part of an object') continues `lists-of-objects`; the agent mapping Part 6 should avoid reusing the ids `lists-of-objects` and `object-interaction`.
- Several given classes in TMC templates or MOOC text have small defects the site must not copy: `Money.toString` pads with `cents <= 10` (10 cents prints `10.010e`), the DecreasingCounter listing lacks `()` after `printValue`, the DatingApp sample main uses an undefined variable `pvm`.
