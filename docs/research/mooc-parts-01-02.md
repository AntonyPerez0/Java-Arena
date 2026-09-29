# Java MOOC Parts 1 and 2 mapped to Java Arena modules

Agent: `mooc-parts-01-02`. Scope: Helsinki Java Programming MOOC Part 1 (`data/part-1`) and Part 2 (`data/part-2`). Research only; no site code.

## Summary

- **71 visible exercises** (37 in Part 1, 34 in Part 2), taken from `/home/user/ref/mooc-outline.txt` and checked against the live (non-commented) markdown in `/home/user/ref/java-programming/data/part-1` and `part-2`.
- **11 modules, 62 steps.** Every exercise is assigned to a step. Of the four multi-part exercises, `Part02_16` and `Part02_33` are split across two steps, `Part02_20` (5 parts) across the three challenges of one step, and `Part02_34` (3 parts) fills one step's challenges. A script (`/home/user/ref/research/mooc-parts-01-02/generate.py`) checks the coverage against the outline.
- Exercise kinds: stdin-stdout 51, method 13, stdout 5, tooling 1, other 1.
- Browser: runs-as-is 68, needs-adaptation 3. Nothing in Parts 1 and 2 needs a run-on-your-computer project; the three adaptations are IDE/TMC habits (submitting, the `sout` shortcut, the indentation exercise).
- Split sections: 1.6 (14 exercises) becomes `conditionals` + `boolean-logic`; 2.4 (14 exercises) becomes `methods` + `return-values`. Folded: 1.1 (1 tooling exercise) into `printing`. Reading only: 1.7 (end of `boolean-logic`) and 2.5 (end of `return-values`).
- Biggest runtime findings: (1) from `Part01_25` on, TMC fails any submission with Checkstyle violations (47 exercises); (2) javac 21 compiles every string `+` to `invokedynamic`; (3) Java prints doubles differently from JavaScript (`5.0` vs `5`, `1.0E7` vs `10000000`), so expected outputs must come from a real JDK and be cross-checked in the browser runtime.

### Sources used

- MOOC text: `/home/user/ref/java-programming/data/part-1/*.md`, `part-2/*.md`. I stripped HTML comments (old Finnish text) and the code-state-visualizer JSON before reading; cleaned copies are in `/home/user/ref/research/mooc-parts-01-02/clean/`.
- How TMC grades each exercise: a public learner repository that keeps the original TMC project folders, `https://github.com/marceloxreis/mooc-java-programming-i` (shallow clone at commit `977168ed`, in `/home/user/ref/research/mooc-parts-01-02/tmc-sample/`). Its LICENSE file is MIT, copyright the learner; the `src/test`, `.tmcproject.json` and `.checkstyle.xml` files in it are the MOOC's originals, so I used them only to understand the grading and copied nothing into this plan.
- C/C++ Arena conventions: `/home/user/antonyperez0/cpp-arena/README.md` and `content/lessons/*.yaml` (module, step, `more:` challenges, `harness:`, `require:`/`forbid:`).
- Local checks: JDK `openjdk 21.0.10` and Node 22 (`/home/user/ref/research/mooc-parts-01-02/check/`).

## Module map

### `printing`: Printing

MOOC sections: `part-1/1-starting-programming.md`; `part-1/2-printing.md`; part-2/1-problems-and-patterns.md (System.out.print hint box only)

Section 1.1 (1 tooling exercise) is folded in as the first step. System.out.print is taught here although the MOOC first shows it in a Part 2 hint box, because it belongs with println.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Your first Java program | `part01-Part01_01.Sandbox`<br>`part01-Part01_02.AdaLovelace`<br>1.1 Programmers Write Source Code<br>1.2 Program Boilerplate<br>1.2 hint: Running the Program (compile, then run) | fill in the blanks | 1: blank for println in a ready program that prints a famous programmer's name. 2: blanks for 'class', 'static void main' in the frame. 3: empty editor, write the whole class and main that prints one line. |
| 2 | Several lines, in order | `part01-Part01_03.OnceUponATime`<br>`part01-Part01_04.Dinosaur`<br>1.2 Printing Multiple Lines<br>1.2 hint: Exact Inspector<br>1.2 hint: sout shortcut (as an editor snippet) | write a program (stdout), require exactly N println | 1: add the two missing lines of a three-line rhyme. 2: statements are in the wrong order, reorder so the output matches. 3: print a 4-line label exactly, using exactly 4 println calls (count rule). |
| 3 | print and println | 2.1 hint: System.out.print<br>empty println() for a blank line | fill in the blanks, then write a program (stdout) | 1: choose print or println in two blanks so two calls make one line. 2: add a blank line between two paragraphs with println(). 3: build one line from three print calls and end it correctly. |
| 4 | Comments | 1.2 Comments (// and /* */)<br>1.2 commenting out code to try things | write a program (stdout) | 1: comment out one line so the output matches. 2: turn loose notes into a block comment so the program compiles. 3: fix a program where a comment accidentally hides a needed statement. |
| 5 | Reading compiler errors | 1.2 Terminology: parameters, semicolons separate statements<br>1.2 hint: Running the Program (compile errors)<br>1.2 hint: Exact Inspector (typos like printin) | write a program (fix the broken seed so it compiles and prints) | 1: missing semicolon. 2: misspelled println and a lower-case 'system'. 3: missing closing quote and closing brace; error message explained in plain English. |

### `reading-input`: Reading input and strings

MOOC sections: `part-1/3-reading-input.md`

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Reading a line with Scanner | `part01-Part01_05.Message`<br>`part01-Part01_07.MessageThreeTimes`<br>1.3 intro: import, new Scanner(System.in), nextLine()<br>1.3 Reading Strings | fill in the blanks, then write a program (stdin-stdout) | 1: blanks for the import and nextLine. 2: echo the line twice with a header line. 3: write the whole program: read one line and print it three times between two separator lines. |
| 2 | String variables | 1.3 Fundamentals of Strings (literal vs variable, quoting a name prints the name) | write a program (stdout) | 1: declare a String variable and print it. 2: fix a program that prints the variable's name instead of its value. 3: three variables printed in a required order. |
| 3 | Joining strings with + | `part01-Part01_06.HiAdaLovelace`<br>`part01-Part01_08.Greeting`<br>1.3 Concatenation<br>1.3 Input String as a Part of Output | write a program (stdin-stdout); forbid hard-coding the value | 1: greet using an existing variable (forbid the literal in println). 2: read a name, print a greeting. 3: read a first and last name, print them joined with the right spaces and punctuation. |
| 4 | Several inputs in order | `part01-Part01_09.Conversation`<br>`part01-Part01_10.Story`<br>1.3 Program Execution Waits for Input | write a program (stdin-stdout) | 1: two questions, two answers echoed. 2: three inputs printed back in reverse order. 3: a short template story that reuses two inputs several times. |

### `variables`: Variables and types

MOOC sections: `part-1/4-variables.md`

The A/B research questionnaire at the top of the section is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Variables and their types | `part01-Part01_11.VariousVariables`<br>1.4 intro: int, double, String, boolean, printing with +<br>1.4 The Type of the Variable Informs of Possible Values | fill in the blanks | 1: set three values in marked lines so the fixed print lines match. 2: choose the right type keyword for four declarations. 3: declare four variables of four types and print a labelled summary. |
| 2 | Changing a value | 1.4 Changing a Value Assigned to a Variable<br>1.4 Variable's Type Persists<br>duplicate declaration error | write a program (fix compile errors; stdout) | 1: reassign a variable between two prints. 2: remove a second declaration of the same name. 3: fix an int that receives a decimal value by choosing the right type. |
| 3 | Naming variables | 1.4 Naming Variables<br>1.4 Permissible / Impermissible Variable Names | write a program (fix compile errors; stdout) | 1: rename a variable with a space into camelCase. 2: fix names that start with a digit or contain '!'. 3: rename a, b, c into descriptive names (require the new names). |
| 4 | Reading integers | `part01-Part01_12.IntegerInput`<br>1.4 Reading Integers (Integer.valueOf) | write a program (stdin-stdout) | 1: blank for Integer.valueOf. 2: read a number and print it in a sentence. 3: read two numbers and print them on one line (no arithmetic yet). |
| 5 | Reading doubles and booleans | `part01-Part01_13.DoubleInput`<br>`part01-Part01_14.BooleanInput`<br>1.4 Reading Doubles<br>1.4 Reading Booleans | write a program (stdin-stdout) | 1: read a decimal number and print it (hidden test with a whole number shows the .0). 2: read a boolean (hidden tests: mixed case 'TrUe', other words). 3: read both and print a labelled line for each. |
| 6 | Mixing input types | `part01-Part01_15.DifferentTypesOfInput`<br>1.4 Summary | write a program (stdin-stdout) | 1: read a String and an int. 2: read four types in a given order. 3: read four types in a different order and print them in yet another order. |

### `calculating`: Calculating with numbers

MOOC sections: `part-1/5-calculating.md`

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Arithmetic and precedence | `part01-Part01_16.SecondsInADay`<br>1.5 intro: + - * /<br>1.5 Precedence and Parentheses<br>1.5 hint: Expression and Statement | fill in the blanks, then write a program (stdin-stdout) | 1: add parentheses so an expression gives the stated result. 2: convert hours to minutes from input. 3: convert a number of weeks to seconds. |
| 2 | Calculating with input | `part01-Part01_17.SumOfTwoNumbers`<br>`part01-Part01_18.SumOfThreeNumbers`<br>1.5 Calculating and Printing | write a program (stdin-stdout) | 1: sum of two inputs. 2: difference and product of two inputs. 3: sum of three inputs with a labelled result. |
| 3 | Printing a formula | `part01-Part01_19.AdditionFormula`<br>`part01-Part01_20.MultiplicationFormula`<br>1.5 string + number conversion, "Four: " + (2 + 2)<br>int maximum and overflow | write a program (stdin-stdout) | 1: fix "Total: " + a + b so it adds. 2: print 'a + b = c' from input. 3: print 'a * b = c' (a hidden test shows overflow is out of scope; keep values small). |
| 4 | Integer division and casting | `part01-Part01_21.AverageOfTwoNumbers`<br>`part01-Part01_22.AverageOfThreeNumbers`<br>1.5 Division<br>(double) cast, 1.0 *<br>1.5 hint: Calculating the average | fill in the blanks, then write a program (stdin-stdout) | 1: put the (double) cast in the right place. 2: average of two integers. 3: average of three integers (hidden test with a repeating decimal). |
| 5 | A small calculator | `part01-Part01_23.SimpleCalculator` | write a program (stdin-stdout) | 1: sum and difference lines. 2: all four operations with a decimal quotient. 3: add a line with the first number as a percentage of the second (decimal division). |
| 6 | Tracing assignments | 1.5 Misunderstandings Related to the Value of a Variable (assignment copies)<br>tracing by hand | fill in the blanks (predict each printed value; checked against the real output) | 1: predict two values after a = b. 2: predict values after a later change to b. 3: predict three values in a five-line program. |

### `conditionals`: Making decisions

MOOC sections: part-1/6-conditional-statements.md (first half: if, blocks, comparisons, else, else if, order)

Section 1.6 has 14 exercises spanning control-flow structure and condition building, so it is split into 'conditionals' and 'boolean-logic'.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | if | `part01-Part01_24.SpeedingTicket`<br>1.6 intro: if, block, no semicolon after if | fill in the blanks, then write a program (stdin-stdout) | 1: fill the condition. 2: print a warning above a threshold. 3: two independent ifs on one input. |
| 2 | Blocks and indentation | `part01-Part01_25.CheckYourIndentation`<br>1.6 Code Indentation and Block Statements<br>1.6 hint: Automatic Code Indentation | write a program (re-indent the seed; style check in the browser) | 1: re-indent a short if block. 2: re-indent an if/else if/else chain. 3: find and fix a missing brace that the indentation hides. |
| 3 | Comparison operators | `part01-Part01_26.Orwell`<br>`part01-Part01_27.Ancient`<br>1.6 Comparison Operators | write a program (stdin-stdout) | 1: exact match with ==. 2: less than a year. 3: not equal with != plus a second threshold. |
| 4 | else | `part01-Part01_28.Positivity`<br>`part01-Part01_29.Adulthood`<br>1.6 Else | write a program (stdin-stdout) | 1: two-way message on a sign. 2: two-way message on an age limit (boundary in hidden tests). 3: two-way message whose text includes the input value. |
| 5 | else if chains | `part01-Part01_30.LargerThanOrEqualTo`<br>1.6 More Conditionals: else if | write a program (stdin-stdout) | 1: three-way comparison of an input with 0. 2: larger of two numbers or 'equal'. 3: largest of three numbers with ties. |
| 6 | The first true branch wins | `part01-Part01_31.GradesAndPoints`<br>1.6 Order of Execution for Comparisons | write a program (stdin-stdout) | 1: fix a chain whose branches are in the wrong order. 2: map a score to 4 bands. 3: map a score to 8 bands including out-of-range values. |

### `boolean-logic`: Conditions and logic

MOOC sections: part-1/6-conditional-statements.md (second half: booleans, %, equals, && || !, condition order); part-1/7-programming-in-our-society.md (reading only, no exercise needed)

Section 1.7 has no exercise; show its idea as a short end-of-part reading card after the last step. Its self-reflection survey is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Booleans in conditions | 1.6 Conditional Statement Expression and the Boolean Variable | fill in the blanks, then write a program (stdin-stdout) | 1: store a comparison in a boolean and print it. 2: use a boolean variable as the if condition. 3: two boolean variables from two inputs, then print a message for each. |
| 2 | The remainder operator % | `part01-Part01_32.OddOrEven`<br>1.6 hint: Remainder | write a program (stdin-stdout) | 1: print n % 3 for an input. 2: even or odd. 3: divisible by 7 or not, with negative inputs in hidden tests. |
| 3 | Comparing strings with equals | `part01-Part01_33.Password`<br>`part01-Part01_34.Same`<br>1.6 Conditional Statements and Comparing Strings | write a program (stdin-stdout); forbid == on strings | 1: secret word check. 2: are two inputs the same (hidden tests where == would fail). 3: menu of three commands with an 'unknown command' fallback. |
| 4 | And, or, not | `part01-Part01_35.CheckingTheAge`<br>1.6 Logical Operators | write a program (stdin-stdout); forbid more than one if | 1: in range with && using one if. 2: out of range with ||. 3: negate a compound condition with !. |
| 5 | Most specific condition first | `part01-Part01_36.LeapYear`<br>1.6 Execution Order of Conditional Statements (FizzBuzz walk-through) | write a program (stdin-stdout) | 1: FizzBuzz-style single number with the combined case first. 2: leap year rules. 3: a three-rule divisibility classifier where order matters. |
| 6 | Challenge: price brackets | `part01-Part01_37.GiftTax` | write a program (stdin-stdout) | 1: two brackets. 2: three brackets with a base amount plus a rate. 3: five brackets with a 'nothing to pay' case (own invented table, not the Finnish tax table). |

### `problem-patterns`: Problem-solving patterns

MOOC sections: `part-2/1-problems-and-patterns.md`

A review module that combines read, calculate and decide.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Read, calculate, print | `part02-Part02_01.Squared`<br>2.1 Reading User Input<br>2.1 Calculating | write a program (stdin-stdout) | 1: square of an input. 2: cube of an input. 3: area and perimeter of a rectangle from two inputs. |
| 2 | Math methods | `part02-Part02_02.SquareRootOfSum`<br>Math.sqrt | write a program (stdin-stdout) | 1: square root of an input. 2: square root of a sum of two inputs. 3: hypotenuse from two sides (Math.sqrt of a sum of squares). |
| 3 | Read, decide, print | `part02-Part02_03.AbsoluteValue`<br>2.1 Conditional Logic | write a program (stdin-stdout); forbid Math.abs in challenge 1 | 1: absolute value with an if. 2: clamp an input to 0..100. 3: sum of two inputs classified as too much / too little / ok. |
| 4 | Combining the patterns | `part02-Part02_04.ComparingNumbers` | write a program (stdin-stdout) | 1: compare two inputs in a sentence. 2: compare the sum of two inputs with a third. 3: compare two averages. |

### `loops`: Repeating with while

MOOC sections: `part-2/2-repeating.md`

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | while (true) and break | `part02-Part02_05.CarryOn`<br>`part02-Part02_06.AreWeThereYet`<br>2.2 Loops and Infinite Loops<br>2.2 Ending a Loop | fill in the blanks, then write a program (stdin-stdout); require while and break | 1: loop until the word 'stop'. 2: loop until a given number. 3: echo each input until a sentinel, then print a goodbye line. |
| 2 | continue | `part02-Part02_07.OnlyPositives`<br>2.2 Returning to the Start of the Loop<br>one clear task per if | write a program (stdin-stdout); require continue | 1: skip negative inputs with a message. 2: square valid inputs, stop at 0. 3: skip out-of-range inputs and double the valid ones. |
| 3 | Counting in a loop | `part02-Part02_08.NumberOfNumbers`<br>`part02-Part02_09.NumberOfNegativeNumbers`<br>2.2 Calculation with Loops (declare before the loop) | write a program (stdin-stdout) | 1: fix a counter declared inside the loop. 2: count inputs before the sentinel. 3: count only inputs that meet a condition. |
| 4 | Summing in a loop | `part02-Part02_10.SumOfNumbers`<br>`part02-Part02_11.NumberAndSumOfNumbers` | write a program (stdin-stdout) | 1: sum until 0. 2: sum and count until 0. 3: separate sums of positive and negative inputs. |
| 5 | Averages after the loop | `part02-Part02_12.AverageOfNumbers`<br>`part02-Part02_13.AverageOfPositiveNumbers`<br>percentage example, division-by-zero guard | write a program (stdin-stdout) | 1: average of all inputs. 2: average of positives with a 'no data' message. 3: percentage of inputs that were positive. |

### `for-loops`: Loop conditions and for

MOOC sections: `part-2/3-more-loops.md`

The MSLQ research questionnaire at the top of the section is not carried over.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | while with a condition | `part02-Part02_14.Counting`<br>2.3 While Loop with a Condition<br>i++ shorthand | fill in the blanks, then write a program (stdin-stdout) | 1: fill the condition of a counting loop. 2: print 0..n. 3: print n down to 0 using a condition, not break. |
| 2 | for loops | `part02-Part02_15.CountingToHundred`<br>`part02-Part02_16.FromWhereToWhere`<br>2.3 For Loop | write a program (stdin-stdout); require for | 1: rewrite a while loop as a for loop. 2: from an input up to a fixed end. 3: print 1..n (part 1 of the two-part MOOC exercise). |
| 3 | Bounds from input | `part02-Part02_16.FromWhereToWhere`<br>loop bounds from variables | write a program (stdin-stdout) | 1: start..end from two inputs. 2: nothing printed when start > end, negative bounds. 3: every second number in a range. |
| 4 | When the condition is checked | 2.3 On Stopping a Loop Execution<br>2.3 hint: Simulating program execution (trace table) | fill in the blanks (predict output; checked against the real output) | 1: how many rounds does a loop run. 2: final values of two variables after a loop. 3: output of a loop that changes its counter inside the body. |
| 5 | Repeating a calculation | `part02-Part02_17.SumOfASequence`<br>`part02-Part02_18.SumOfASequenceTheSequel`<br>2.3 Repeating Functionality<br>+= shorthand | write a program (stdin-stdout) | 1: multiply by repeated addition. 2: sum 1..n. 3: sum of a closed interval from two inputs. |
| 6 | Multiplying in a loop | `part02-Part02_19.Factorial` | write a program (stdin-stdout) | 1: power a^b with a loop. 2: factorial with 0! = 1. 3: product of the odd numbers up to n (hidden tests stay inside int). |
| 7 | Structuring a loop program | `part02-Part02_20.RepeatingBreakingAndRemembering`<br>2.3 On the Structure of Programs Using Loops<br>2.3 hint: Implementing a program small part at a time | write a program (stdin-stdout), built up over the three challenges | 1: read until -1, then print the sum (MOOC parts 1-2). 2: add count and average (parts 3-4). 3: add counts of even and odd inputs (part 5). |

### `methods`: Methods and parameters

MOOC sections: part-2/4-methods.md (first half: defining, calling, parameters, copies)

Section 2.4 has 14 exercises; it is split into 'methods' (void methods and parameters) and 'return-values' (returning, scope, call stack, composing methods).

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Define and call a method | `part02-Part02_21.InAHoleInTheGround`<br>2.4 Custom Methods<br>2.4 On Naming Methods | fill in the blanks, then write a method (hidden harness) | 1: fill the call in main. 2: write a void method that prints two lines. 3: two methods, main calls them in a given order. |
| 2 | Calling a method from a loop | `part02-Part02_22.Reprint` | write a program (stdin-stdout); require a method call inside a loop | 1: call a method three times. 2: read a count and call the method that many times. 3: alternate between two methods for n rounds. |
| 3 | Parameters | `part02-Part02_23.FromOneToParameter`<br>`part02-Part02_24.FromParameterToOne`<br>2.4 Method Parameters | write a method (hidden harness captures stdout per call) | 1: print a greeting n times. 2: print 1..n. 3: print n down to 1. |
| 4 | Several parameters | `part02-Part02_25.Division`<br>`part02-Part02_26.DivisibleByThree`<br>2.4 Multiple Parameters | write a method (hidden harness) | 1: print the sum of two parameters in a sentence. 2: print a decimal quotient. 3: print the multiples of k in a range. |
| 5 | Parameters are copies | 2.4 Parameter Values Are Copied in a Method Call | fill in the blanks (predict output; checked against the real output) | 1: value in main after a method changes its parameter. 2: same names in main and the method. 3: a loop in the method that counts its parameter up. |

### `return-values`: Return values and the call stack

MOOC sections: part-2/4-methods.md (second half: return values, local variables, call stack, methods calling methods); part-2/5-end-questionnaire.md (no exercise needed)

Section 2.5 is a self-reflection questionnaire with a two-sentence recap: no exercise needed; fold the recap into this module's closing text.

| # | Step | Covers (MOOC exercise ids and headings) | Exercise type | Challenge 1 / 2 / 3 ideas (original) |
|---|---|---|---|---|
| 1 | Returning a value | `part02-Part02_27.NumberUno`<br>`part02-Part02_28.Word`<br>2.4 Methods Can Return Values<br>return ends a method; unreachable code error; return; in void | write a method (hidden harness) | 1: return a fixed int. 2: return a String (any non-empty value accepted). 3: return a boolean computed from a constant comparison; fix an 'unreachable statement' error. |
| 2 | Computing the return value | `part02-Part02_29.Summation`<br>2.4 Calculating the Return Value Inside a Method | write a method (hidden harness); forbid println inside the method | 1: return the sum of two parameters. 2: return the sum of four. 3: return the number of seconds in h hours, m minutes, s seconds. |
| 3 | Returning from branches | `part02-Part02_30.Smallest`<br>`part02-Part02_31.Greatest` | write a method (hidden harness) | 1: smaller of two. 2: greatest of three with ties. 3: sign of a number as -1, 0 or 1. |
| 4 | Variables inside methods | 2.4 Defining Variables Inside Methods (scope, common mistakes) | write a program (fix compile errors; stdout) | 1: main uses a method's local variable: fix it by using the return value. 2: main uses a method name as a variable: call it. 3: store a returned value and use it twice. |
| 5 | Methods that call methods | `part02-Part02_32.Averaging`<br>2.4 Method Calling Another Method (multiplication table) | write a method (hidden harness); require the helper call | 1: average of two using a given sum method. 2: average of four using sum (require the call). 3: a table row printer called from a table printer. |
| 6 | The call stack | 2.4 Execution of Method Calls and the Call Stack<br>2.4 Call Stack and Method Parameters<br>2.4 Call Stack and Returning a Value from a Method | fill in the blanks (predict output order; checked against the real output) | 1: order of prints when main calls one method. 2: three methods calling each other. 3: a returned value passed through two calls. |
| 7 | Rows of stars | `part02-Part02_33.StarSign`<br>StarSign parts 1-3: printStars, printSquare, printRectangle | write a method (hidden harness); require printStars inside the shape methods | 1: printStars(n) with a line break. 2: square built from printStars. 3: rectangle built from printStars. |
| 8 | Triangles and a tree | `part02-Part02_33.StarSign`<br>`part02-Part02_34.AdvancedAstrology`<br>StarSign part 4: left triangle<br>AdvancedAstrology parts 1-3: printSpaces, right triangle, Christmas tree | write a method (hidden harness); leading spaces significant | 1: left-aligned triangle from printStars. 2: printSpaces plus a right-aligned triangle. 3: a tree with a trunk, from printSpaces and printStars. |

## Sections and exercises

Kinds: stdout, stdin-stdout, method (hidden harness calls a static method), tooling, other. Browser: runs-as-is, needs-adaptation, cannot-run-in-browser.

### part-1/1-starting-programming.md: Getting started with programming

Teaches:
- Installing Java and NetBeans with the TMC plugin; downloading and submitting exercises (admin/tooling)
- What source code is; statements run top to bottom, left to right
- System.out.println as a ready-made command; the class/main frame every program needs
- 2 quizzes (content not in the repo, only quiz ids), 1 video

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_01.Sandbox` | Sandbox | tooling | needs-adaptation | printing / step 1 "Your first Java program" | Practises the TMC download/submit cycle and gives a free point (SandboxTest.java has an empty test). No equivalent is needed: the site's first step teaches its own Run and Check buttons, and the Playground is the sandbox. |

### part-1/2-printing.md: Printing

Teaches:
- System.out.println with a string literal
- Program boilerplate: public class Name must match Name.java; execution starts in main
- Compile to bytecode, then run; the IDE shows compile errors while typing (hint box 'Running the Program')
- Several println statements; exact output matters (hint box 'Exact Inspector')
- NetBeans 'sout' + Tab shortcut (IDE specific)
- Terminology: parameters in parentheses, semicolons separate statements
- Comments: // line comments, /* */ block comments, commenting out code

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_02.AdaLovelace` | Ada Lovelace | stdout | runs-as-is | printing / step 1 "Your first Java program" | Single println. |
| `part01-Part01_03.OnceUponATime` | Once Upon a Time | stdout | runs-as-is | printing / step 2 "Several lines, in order" | TMC test also counts exactly 3 'System.out.println' in the source (OnceUponATimeTest.java reads the file with Files.lines). On the site: a require rule with a count. |
| `part01-Part01_04.Dinosaur` | Dinosaur | stdout | needs-adaptation | printing / step 2 "Several lines, in order" | The output part runs as-is. The skill being practised is the NetBeans 'sout' + Tab shortcut, which does not exist in a browser editor: add a 'sout' snippet to the site editor or drop that part. TMC test counts 3 println (DinosaurTest.java). |

### part-1/3-reading-input.md: Reading input

Teaches:
- import java.util.Scanner; new Scanner(System.in); scanner.nextLine()
- Strings: string literal vs String variable; quoting a variable name prints the name
- Concatenation with +, of literals and variables
- Reading several lines in order; the program waits for input
- 1 video

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_05.Message` | Message | stdin-stdout | runs-as-is | reading-input / step 1 "Reading a line with Scanner" | Echo one line. |
| `part01-Part01_06.HiAdaLovelace` | Hi Ada Lovelace! | stdout | runs-as-is | reading-input / step 3 "Joining strings with +" | TMC test checks exactly 1 println and that the println does not contain the literal name (HiAdaLovelaceTest.java). On the site: forbid rule on the literal inside the print call. |
| `part01-Part01_07.MessageThreeTimes` | Message Three Times | stdin-stdout | runs-as-is | reading-input / step 1 "Reading a line with Scanner" |  |
| `part01-Part01_08.Greeting` | Greeting | stdin-stdout | runs-as-is | reading-input / step 3 "Joining strings with +" | Prompt, read, concatenate. |
| `part01-Part01_09.Conversation` | Conversation | stdin-stdout | runs-as-is | reading-input / step 4 "Several inputs in order" | Two reads. With stdin supplied up front the output shows only the program's lines, not the echoed answers of the MOOC sample output. |
| `part01-Part01_10.Story` | Story | stdin-stdout | runs-as-is | reading-input / step 4 "Several inputs in order" | Two reads, each value reused several times in the output. |

### part-1/4-variables.md: Variables

Teaches:
- Types int, double, String, boolean; assigning with =; printing values joined with +
- Changing a value; the type is declared once; declaring a name twice is an error
- Type persists: int to double is allowed, double to int and boolean mixes are not
- Naming: camelCase, no spaces or special symbols, cannot start with a digit, no diacritics
- Value ranges of int and double (table)
- Integer.valueOf, Double.valueOf, Boolean.valueOf on scanner.nextLine(); non-numeric input crashes
- Research questionnaire (A/B Google Form link, admin) and 1 quiz

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_11.VariousVariables` | Various Variables | stdout | runs-as-is | variables / step 1 "Variables and their types" | Template marks lines 'MODIFY THESE' and 'DON'T MODIFY THESE' (template file in the TMC sample clone): a natural fill-in-the-blanks step. |
| `part01-Part01_12.IntegerInput` | Integer Input | stdin-stdout | runs-as-is | variables / step 4 "Reading integers" |  |
| `part01-Part01_13.DoubleInput` | Double Input | stdin-stdout | runs-as-is | variables / step 5 "Reading doubles and booleans" | Output depends on Java's Double.toString (18 prints as 18.0); the runtime must format doubles exactly like the JDK. |
| `part01-Part01_14.BooleanInput` | Boolean Input | stdin-stdout | runs-as-is | variables / step 5 "Reading doubles and booleans" | Boolean.valueOf is case-insensitive for 'true', everything else is false. |
| `part01-Part01_15.DifferentTypesOfInput` | Different Types of Input | stdin-stdout | runs-as-is | variables / step 6 "Mixing input types" | Four reads of four types. |

### part-1/5-calculating.md: Calculating with numbers

Teaches:
- + - * / and precedence; parentheses
- Expression vs statement; an expression alone is not a statement
- Printing expressions joined to strings: "Four: " + (2 + 2) vs "..." + 2 + 2
- int maximum 2^31-1 and overflow (invitation to try large products)
- Integer division; making it floating point with (double) or 1.0 *; casting after dividing is too late
- Averages
- Assignment copies a value (three misconceptions); tracing a program by hand
- 4 quizzes, 2 code-state visualizations

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_16.SecondsInADay` | Seconds in a day | stdin-stdout | runs-as-is | calculating / step 1 "Arithmetic and precedence" |  |
| `part01-Part01_17.SumOfTwoNumbers` | Sum of two numbers | stdin-stdout | runs-as-is | calculating / step 2 "Calculating with input" |  |
| `part01-Part01_18.SumOfThreeNumbers` | Sum of three numbers | stdin-stdout | runs-as-is | calculating / step 2 "Calculating with input" |  |
| `part01-Part01_19.AdditionFormula` | Addition formula | stdin-stdout | runs-as-is | calculating / step 3 "Printing a formula" |  |
| `part01-Part01_20.MultiplicationFormula` | Multiplication formula | stdin-stdout | runs-as-is | calculating / step 3 "Printing a formula" | If a hidden test uses large factors the runtime must wrap int exactly like the JVM (100000 * 100000 prints 1410065408 on JDK 21). |
| `part01-Part01_21.AverageOfTwoNumbers` | Average of two numbers | stdin-stdout | runs-as-is | calculating / step 4 "Integer division and casting" | Prints a double (5.0). |
| `part01-Part01_22.AverageOfThreeNumbers` | Average of three numbers | stdin-stdout | runs-as-is | calculating / step 4 "Integer division and casting" | Prints 4.333333333333333; needs JDK-identical double formatting. |
| `part01-Part01_23.SimpleCalculator` | Simple calculator | stdin-stdout | runs-as-is | calculating / step 5 "A small calculator" | Four operations, quotient as double. |

### part-1/6-conditional-statements.md: Conditional statements and conditional operation

Teaches:
- if with a boolean expression; no semicolon after if
- Blocks and indentation (4 spaces per block); NetBeans auto-format; indentation is graded from here on
- Comparison operators > >= < <= == !=
- else; else if chains; evaluation stops at the first true condition
- boolean variables holding comparison results
- Remainder operator % for divisibility (hint box)
- Strings: == does not work, use equals
- Logical operators && || ! and a truth table
- Ordering conditions: most demanding condition first (FizzBuzz walk-through)
- 1 code-state visualization

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part01-Part01_24.SpeedingTicket` | Speeding Ticket | stdin-stdout | runs-as-is | conditionals / step 1 "if" |  |
| `part01-Part01_25.CheckYourIndentation` | Check Your Indentation | other | needs-adaptation | conditionals / step 2 "Blocks and indentation" | Code style exercise: the JUnit test is empty and grading is done by Checkstyle (.tmcproject.json has checkstyle strategy 'fail'; .checkstyle.xml enables Indentation, LeftCurly, RightCurly, NeedBraces and naming checks). Needs an in-browser indentation check or a text-based version. |
| `part01-Part01_26.Orwell` | Orwell | stdin-stdout | runs-as-is | conditionals / step 3 "Comparison operators" |  |
| `part01-Part01_27.Ancient` | Ancient | stdin-stdout | runs-as-is | conditionals / step 3 "Comparison operators" |  |
| `part01-Part01_28.Positivity` | Positivity | stdin-stdout | runs-as-is | conditionals / step 4 "else" |  |
| `part01-Part01_29.Adulthood` | Adulthood | stdin-stdout | runs-as-is | conditionals / step 4 "else" |  |
| `part01-Part01_30.LargerThanOrEqualTo` | Larger Than or Equal To | stdin-stdout | runs-as-is | conditionals / step 5 "else if chains" |  |
| `part01-Part01_31.GradesAndPoints` | Grades and Points | stdin-stdout | runs-as-is | conditionals / step 6 "The first true branch wins" | Range table with 8 bands. |
| `part01-Part01_32.OddOrEven` | Odd or even | stdin-stdout | runs-as-is | boolean-logic / step 2 "The remainder operator %" |  |
| `part01-Part01_33.Password` | Password | stdin-stdout | runs-as-is | boolean-logic / step 3 "Comparing strings with equals" | String equals with a literal. |
| `part01-Part01_34.Same` | Same | stdin-stdout | runs-as-is | boolean-logic / step 3 "Comparing strings with equals" | String equals between two inputs; hidden tests should include inputs where == would fail. |
| `part01-Part01_35.CheckingTheAge` | Checking the age | stdin-stdout | runs-as-is | boolean-logic / step 4 "And, or, not" | Task says to use a single if. The TMC test only checks output (CheckingTheAgeTest.java), so the site can go further with a forbid rule (at most one 'if'). |
| `part01-Part01_36.LeapYear` | Leap year | stdin-stdout | runs-as-is | boolean-logic / step 5 "Most specific condition first" |  |
| `part01-Part01_37.GiftTax` | Gift tax | stdin-stdout | runs-as-is | boolean-logic / step 6 "Challenge: price brackets" | Bracket calculation printed as a double (Tax: 100.0). |

### part-1/7-programming-in-our-society.md: Programming in our society

Teaches:
- Reading only: software in everyday life, Margaret Hamilton, why precise instructions matter
- Self-reflection survey quiz (admin)

No programming exercises. **No exercise needed**; see the module map for where the reading goes.

### part-2/1-problems-and-patterns.md: Recurring problems and patterns to solve them

Teaches:
- Pattern: read input (Scanner + valueOf for each type)
- Pattern: calculate (inputs, operation, result variable, use the result)
- Pattern: conditional logic and if / else if / else chains
- System.out.print (no line break) introduced in a hint box
- Math.sqrt
- 2 quizzes

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part02-Part02_01.Squared` | Squared | stdin-stdout | runs-as-is | problem-patterns / step 1 "Read, calculate, print" |  |
| `part02-Part02_02.SquareRootOfSum` | Square root of sum | stdin-stdout | runs-as-is | problem-patterns / step 2 "Math methods" | Math.sqrt returns a double, so Java prints 6.0 where the MOOC sample output shows 6 (checked with JDK 21: Math.sqrt(1 + 35) prints 6.0). The site computes expected output from its reference solution, so this is only a wording point. |
| `part02-Part02_03.AbsoluteValue` | Absolute Value | stdin-stdout | runs-as-is | problem-patterns / step 3 "Read, decide, print" |  |
| `part02-Part02_04.ComparingNumbers` | Comparing Numbers | stdin-stdout | runs-as-is | problem-patterns / step 4 "Combining the patterns" |  |

### part-2/2-repeating.md: Repeating functionality

Teaches:
- while (true) loops and infinite loops; stopping a runaway program
- break; reading input until a sentinel (a string or 0)
- continue to skip invalid input
- Style: give each if statement one clear task
- Variables used after the loop must be declared before it (scope)
- Counting, summing, averaging, percentage after the loop; guarding against division by zero
- 1 quiz

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part02-Part02_05.CarryOn` | Carry on? | stdin-stdout | runs-as-is | loops / step 1 "while (true) and break" | Loop until a string sentinel; needs a run time limit and a clear message when input runs out. |
| `part02-Part02_06.AreWeThereYet` | Are we there yet? | stdin-stdout | runs-as-is | loops / step 1 "while (true) and break" | Loop until a number sentinel. |
| `part02-Part02_07.OnlyPositives` | Only positives | stdin-stdout | runs-as-is | loops / step 2 "continue" | break and continue. |
| `part02-Part02_08.NumberOfNumbers` | Number of Numbers | stdin-stdout | runs-as-is | loops / step 3 "Counting in a loop" |  |
| `part02-Part02_09.NumberOfNegativeNumbers` | Number of negative numbers | stdin-stdout | runs-as-is | loops / step 3 "Counting in a loop" |  |
| `part02-Part02_10.SumOfNumbers` | Sum of Numbers | stdin-stdout | runs-as-is | loops / step 4 "Summing in a loop" |  |
| `part02-Part02_11.NumberAndSumOfNumbers` | Number and sum of numbers | stdin-stdout | runs-as-is | loops / step 4 "Summing in a loop" |  |
| `part02-Part02_12.AverageOfNumbers` | Average of numbers | stdin-stdout | runs-as-is | loops / step 5 "Averages after the loop" |  |
| `part02-Part02_13.AverageOfPositiveNumbers` | Average of positive numbers | stdin-stdout | runs-as-is | loops / step 5 "Averages after the loop" | Includes the no-data case (cannot divide). |

### part-2/3-more-loops.md: More loops

Teaches:
- Research questionnaire (MSLQ Google Form, admin) and 1 quiz
- while with a condition; i++ shorthand
- for loop: init; condition; update
- Loop bounds from variables and user input
- When the loop condition is evaluated (only at the top of each round)
- Repeating a calculation; += shorthand; simulating execution with a table
- for when the count is known, while (true) when waiting for a sentinel
- Structure: read, break, continue, handle; do the after-loop work after the loop
- Building a program one small part at a time
- 4 code-state visualizations, 1 video

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part02-Part02_14.Counting` | Counting | stdin-stdout | runs-as-is | for-loops / step 1 "while with a condition" |  |
| `part02-Part02_15.CountingToHundred` | Counting to hundred | stdin-stdout | runs-as-is | for-loops / step 2 "for loops" | Output length grows with the distance to 100 (105 lines for input -4); small against a 64 KB output cap. |
| `part02-Part02_16.FromWhereToWhere` | From where to where? (2 parts) | stdin-stdout | runs-as-is | for-loops / step 2 "for loops"<br>for-loops / step 3 "Bounds from input" | Part 1: 1..n. Part 2: start..end, empty when start > end, negative bounds. |
| `part02-Part02_17.SumOfASequence` | Sum of a sequence | stdin-stdout | runs-as-is | for-loops / step 5 "Repeating a calculation" |  |
| `part02-Part02_18.SumOfASequenceTheSequel` | Sum of a sequence - the sequel | stdin-stdout | runs-as-is | for-loops / step 5 "Repeating a calculation" |  |
| `part02-Part02_19.Factorial` | Factorial | stdin-stdout | runs-as-is | for-loops / step 6 "Multiplying in a loop" | int overflows after 12! (13! as int prints 1932053504 on JDK 21); keep hidden tests at n <= 12 or teach long later. |
| `part02-Part02_20.RepeatingBreakingAndRemembering` | Repeating, breaking and remembering (5 parts) | stdin-stdout | runs-as-is | for-loops / step 7 "Structuring a loop program" | Five incremental parts: read until -1, sum, count, average, even/odd counts. Split across the three challenges of one step. |

### part-2/4-methods.md: Methods and dividing the program into smaller parts

Teaches:
- What a method is; ready-made methods vs your own
- Defining public static void methods outside main, calling them; execution order; main is a method too
- Method naming: camelCase, formatting
- Parameters; expressions as arguments; several parameters
- Parameter values are copied; same names in different methods are unrelated
- Return values: return type instead of void, return statement, using the result in expressions
- return ends the method; unreachable code is a compile error; return; in a void method
- Local variables are visible only inside their method; common mistakes
- The call stack: frames, parameters and return values
- Methods calling methods (multiplication table example)
- 4 quizzes, 8 code-state visualizations, 1 video

| tmc id | Name | Kind | Browser | Mapped to | Notes |
|---|---|---|---|---|---|
| `part02-Part02_21.InAHoleInTheGround` | In a hole in the ground | method | runs-as-is | methods / step 1 "Define and call a method" | void method that prints; harness calls it and checks stdout. |
| `part02-Part02_22.Reprint` | Reprint | stdin-stdout | runs-as-is | methods / step 2 "Calling a method from a loop" | Program: read a count, call the method that many times. Require a call inside a loop. |
| `part02-Part02_23.FromOneToParameter` | From one to parameter | method | runs-as-is | methods / step 3 "Parameters" | void method with a loop; harness captures stdout per call. |
| `part02-Part02_24.FromParameterToOne` | From parameter to one | method | runs-as-is | methods / step 3 "Parameters" |  |
| `part02-Part02_25.Division` | Division | method | runs-as-is | methods / step 4 "Several parameters" | Prints a double quotient (0.6). |
| `part02-Part02_26.DivisibleByThree` | Divisible by three | method | runs-as-is | methods / step 4 "Several parameters" |  |
| `part02-Part02_27.NumberUno` | Number uno | method | runs-as-is | return-values / step 1 "Returning a value" | Returns a constant; TMC test uses reflection (Reflex) to find the method. |
| `part02-Part02_28.Word` | Word | method | runs-as-is | return-values / step 1 "Returning a value" | Returns any String. The TMC test only checks that a static String word() exists and runs (WordTest.java), so any value, even null, passes; the site should at least require a non-empty string. |
| `part02-Part02_29.Summation` | Summation | method | runs-as-is | return-values / step 2 "Computing the return value" | Four-parameter sum; method must not print. |
| `part02-Part02_30.Smallest` | Smallest | method | runs-as-is | return-values / step 3 "Returning from branches" |  |
| `part02-Part02_31.Greatest` | Greatest | method | runs-as-is | return-values / step 3 "Returning from branches" |  |
| `part02-Part02_32.Averaging` | Averaging | method | runs-as-is | return-values / step 5 "Methods that call methods" | Task says average must call sum; the TMC test checks only values (AveragingTest.java), so the site should add a require rule. |
| `part02-Part02_33.StarSign` | Star sign (4 parts) | method | runs-as-is | return-values / step 7 "Rows of stars"<br>return-values / step 8 "Triangles and a tree" | printStars, printSquare, printRectangle, printTriangle. Task says the shapes must be built by calling printStars; the TMC test for printSquare checks output only (StarSignTest.java). Site: require rule scoped to the method body. Split across two steps. |
| `part02-Part02_34.AdvancedAstrology` | Advanced astrology (3 parts) | method | runs-as-is | return-values / step 8 "Triangles and a tree" | printSpaces (no line break), right-leaning triangle, Christmas tree built from printSpaces and printStars. Leading spaces matter, so the output comparison must not trim the start of lines. |

### part-2/5-end-questionnaire.md: End questionnaire

Teaches:
- Short recap (loops and methods manage complexity)
- Self-reflection questionnaire (admin)

No programming exercises. **No exercise needed**; see the module map for where the reading goes.

## Browser issues and proposals

### All exercises from part01-Part01_25 to part02-Part02_34 (47 exercises)

- **Issue.** TMC grades code style with Checkstyle and fails the submission on violations: each of these 47 exercise folders has a .tmcproject.json with checkstyle strategy 'fail' and an identical .checkstyle.xml (same md5) enabling Indentation, LeftCurly, RightCurly, NeedBraces, EmptyBlock and the naming checks. Part01_01 to Part01_24 have no Checkstyle config. Verified in the learner repo clone github.com/marceloxreis/mooc-java-programming-i (MIT license on the learner's own code; the configs and tests are the MOOC's).
- **Proposal.** Ship a small in-browser style check (brace-depth indentation at 4 spaces, braces required on if/while/for bodies, camelCase for variables and methods, PascalCase for classes). Show it as a warning on every step and make it a failing check only on the 'Blocks and indentation' step. Add a 'Format code' button to the editor. Teach real Checkstyle later in the run-on-your-computer track (Maven checkstyle plugin in GitHub Actions).

### conditionals / Blocks and indentation (part01-Part01_25.CheckYourIndentation)

- **Issue.** The exercise has no behavioural test (CheckYourIndentationTest.java is empty); it only exists to show NetBeans auto-format and Checkstyle indentation errors.
- **Proposal.** Text-based version: seed badly indented code, grade with the site's own indentation check plus normal output tests, and explain each reported line in plain English.

### reading-input, variables, calculating and every stdin program in Parts 1-2

- **Issue.** The MOOC sample outputs show the user's typed answers interleaved with prompts (a console). A browser runtime that is fed stdin up front (as C/C++ Arena does) prints prompts only, so expected output differs from the MOOC's samples, and 'the program waits for input' cannot be shown live.
- **Proposal.** Feed stdin up front for tests (hidden tests included) and show a merged 'transcript' view that inserts each input line after the prompt that consumed it, for readability only. Keep 'Run with my input'. Interactive stdin is optional and only worth it if the chosen runtime supports blocking reads in a worker (unverified for any runtime; to be checked by the runtime research).

### loops, for-loops (sentinel loops: Part02_05 to Part02_13, Part02_20)

- **Issue.** while (true) programs run forever if the exit input never comes; when hidden tests supply too few lines, Scanner.nextLine throws java.util.NoSuchElementException: No line found (message verified on JDK 21.0.10). Integer.valueOf on bad input throws NumberFormatException: For input string: "abc" (verified).
- **Proposal.** Run each program in a killable Web Worker with a time limit and an output cap (C/C++ Arena uses 3 seconds and 64 KB, per its README). Translate the two exceptions into plain-English hints ('your program asked for more input than the test gave; did the loop miss the exit value?').

### Every step that prints a double or does int arithmetic (averages, Division, SquareRootOfSum, GiftTax, overflow remarks)

- **Issue.** Expected output depends on the JDK's exact formatting and integer semantics. Verified on JDK 21.0.10: 13 / 3.0 prints 4.333333333333333, (8 + 2) / 2.0 prints 5.0, 1e7 prints 1.0E7, Math.sqrt(36) prints 6.0, 100000 * 100000 prints 1410065408. Node 22 prints the same doubles as 5 and 10000000, so a runtime that compiles Java to JavaScript must reimplement Java's Double.toString and 32-bit int wrapping exactly.
- **Proposal.** Compute expected outputs at build time with a real JDK from reference solutions, then cross-check every lesson solution in the browser runtime in CI (the equivalent of C/C++ Arena's verify:wasm script). Fail the build on any difference.

### Every program that joins strings with + (almost all of Parts 1-2)

- **Issue.** javac from JDK 21 compiles string concatenation to invokedynamic makeConcatWithConstants (verified with javap on JDK 21.0.10). A browser JVM or bytecode translator must support that bootstrap, otherwise every program that joins a string with a variable fails, which is most of Parts 1-2 from 'Reading input' on.
- **Proposal.** Either pick a runtime that supports indy string concatenation, or compile learner code with javac -XDstringConcat=inline (verified: emits StringBuilder calls instead) or --release 8 (verified: also emits StringBuilder). Parts 1-2 use no syntax newer than Java 5 (no var, generics, lambdas, switch, records or text blocks were found in the live examples).

### printing / Your first Java program

- **Issue.** The MOOC teaches that the public class name must match the file name (Example.java). A browser editor has no visible file name, and learners rename classes.
- **Proposal.** Either fix the file name per step (for example Main.java with a seeded 'public class Main') or derive the file name from the first 'public class X' in the source. Explain javac's 'class X is public, should be declared in a file named X.java' in plain English.

### methods, return-values (method exercises Part02_21, 23 to 34)

- **Issue.** TMC tests call the learner's static methods directly or by reflection (NumberUno and Word tests use fi.helsinki.cs.tmc.edutestutils.Reflex) and capture System.out per call with MockStdio. A browser harness must compile a second, hidden class next to the learner's class and capture output per call.
- **Proposal.** Compile two compilation units (learner class + hidden Test class with its own main). Capture per-call output with System.setOut(new PrintStream(new ByteArrayOutputStream())) or print @@PASS/@@FAIL marker lines like C/C++ Arena. Look methods up by reflection first so a wrong signature gives 'expected public static int numberUno()' instead of a compile error in hidden code.

### printing (Once Upon a Time, Dinosaur), reading-input (Hi Ada Lovelace), boolean-logic (Checking the age), return-values (Averaging, StarSign)

- **Issue.** Several MOOC checks read the source file (OnceUponATimeTest.java counts 'System.out.println' with Files.lines) or are stated in the task but not tested (single if; average must call sum; shapes must call printStars). C/C++ Arena's require/forbid rules are single regex presence checks.
- **Proposal.** Extend the rule schema with min/max occurrence counts and an optional method scope (match only inside the body of a named method), and strip comments and string literals before matching.

### printing (Sandbox, Dinosaur), conditionals (auto-format), loops (stop button)

- **Issue.** NetBeans/TMC specifics: download and submit, the 'sout' + Tab template, alt+shift+F formatting, the red stop button for infinite loops.
- **Proposal.** Replace with site features: Run and Check buttons, a 'sout' snippet in the editor, a Format button, and a Stop button plus the time limit. No run-on-your-computer project is needed for Parts 1-2; the first local-tooling project can come with a later part.

### calculating, for-loops, methods, return-values (15 code-state visualizations: 2 in 1.5, 1 in 1.6, 4 in 2.3, 8 in 2.4)

- **Issue.** The MOOC embeds recorded execution traces (variables per line, call stack frames). These are the MOOC's own recordings.
- **Proposal.** Record the site's own traces for its own examples (the equivalent of C/C++ Arena's gdb-based 'Watch code run'), for example with a JDI-based tracer at build time. Priority: assignment tracing, a counting loop, parameters are copies, call stack with a return value.

### Quizzes (17 in Parts 1-2, bodies not in the source repo; only quiz ids)

- **Issue.** Quiz content cannot be mapped from the repository. At least the quizzes in 1.7 and 2.5 are self-reflection surveys (per the text around them); sections 1.4 and 2.3 also link research Google Forms.
- **Proposal.** Do not port. Use the site's own predict-the-output and spot-the-bug drills for the same ideas (assignment copies, integer division, first-true-branch, parameters are copies).

## Java APIs the runtime must support for Parts 1 and 2

- System.out.println(String), println(int), println(double), println(boolean), println() with no argument
- System.out.print(String)
- String concatenation with + (javac emits invokedynamic StringConcatFactory.makeConcatWithConstants unless -XDstringConcat=inline)
- java.util.Scanner(System.in), Scanner.nextLine()
- Integer.valueOf(String)
- Double.valueOf(String)
- Boolean.valueOf(String)
- String.equals(Object)
- Math.sqrt(double)
- Primitive casts (double) and (int); int division and % with Java truncation semantics; 32-bit int overflow
- Double.toString formatting as the JDK prints it (5.0, 4.333333333333333, 1.0E7)
- Exceptions learners will hit: java.util.NoSuchElementException (Scanner out of input), java.lang.NumberFormatException (valueOf on bad text)
- Test harness only: System.setOut, java.io.PrintStream, java.io.ByteArrayOutputStream, java.lang.reflect.Method (Class.getMethod / invoke)
- Likely in the site's own challenges (not required by the MOOC text): Math.abs, Math.max, Math.min

Verified outputs on JDK 21.0.10 (`check/Check.java`): `13 / 3.0` is `4.333333333333333`, `11 / 3.0` is `3.6666666666666665`, `(8 + 2) / 2.0` is `5.0`, `Math.sqrt(36)` is `6.0`, `100000 * 100000` is `1410065408`, `-7 / 2` is `-3` and `-7 % 2` is `-1`, `Boolean.valueOf("TRue")` is `true`, `Double.valueOf("18")` prints `18.0`, 13! computed in an `int` is `1932053504`. Node 22 prints `5` for `5.0` and `10000000` for `1e7`.

## Not carried over

- 17 quizzes (only their ids are in the repo), 6 YouTube videos, 3 Google Form research questionnaires (an A/B pair in 1.4, the MSLQ in 2.3), the self-reflection surveys in 1.7 and 2.5, and the 15 code-state visualizations (the site should record its own).
- NetBeans and TMC instructions (installing, selecting the course, submitting, the stop button, alt+shift+F).

## Gaps compared with C/C++ Arena's early modules

The live examples and exercise texts of Parts 1 and 2 never use `switch`, the ternary operator, `do`-`while`, `char`, `long` or `printf`/`String.format` (checked by searching the cleaned markdown). Nested repetition only appears through a method call inside a loop (the multiplication table example and the star exercises), never as a loop written inside a loop. If the site wants parity with C/C++ Arena's `c-if` and `c-loops`, those need extra steps that are not in the MOOC. Later MOOC parts may cover some of them; the agents mapping those parts will say.
