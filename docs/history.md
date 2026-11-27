# Build history

The site was built in batches, one pull request per batch. All 20 planned batches are done: the whole MOOC (modules 1 to 54), five extra modules (55 to 59), practice, projects, the Pro Track and a topics reference.

| Batch | What | Status |
|---|---|---|
| 1 | Java engine prototype: javac 21 and a JVM running in the browser, fidelity suite, CI | done |
| 2 | Site foundation: design, lesson content pipeline, lesson pages, modules 1 and 2 | done |
| 3 | Rest of MOOC part 1 (modules 3 to 6), the Playground, "What does it print?" challenges, an indentation check | done |
| 4 | MOOC part 2 (modules 7 to 11), challenges whose tests call your methods | done |
| 5 | Practice: Deathmatch drills for parts 1 and 2, interview prep, daily challenge, placement quiz | done |
| 6 | MOOC part 3 (modules 12 to 16) and its drills, lessons that show a crash, plainer crash explanations | done |
| 7 | MOOC part 4 (modules 17 to 20: objects, classes, reading files), an editor for programs of several files | done |
| 8 | MOOC part 5 (modules 21 to 23: designing classes and overloading, references and null, objects working together), undo history per file | done |
| 9 | MOOC part 6 (modules 24 to 26: lists inside objects, a text user interface, troubleshooting and unit testing), JUnit 4 in the browser | done |
| 10 | MOOC part 7 (modules 27 to 29: procedural and object-oriented programs, sorting and searching, larger programs), the end of Java Programming I; lesson pages load only their own step | done |
| 11 | MOOC part 8 (modules 30 to 33: a recap of parts 1 to 7, hash maps, equals and hashCode, grouping data), the start of Java Programming II; Continue buttons open their lesson at once, a keyboard user keeps their place when the app starts | done |
| 12 | MOOC part 9 (modules 34 to 36: inheritance and abstract classes, interfaces, polymorphism), plain-English explanations for part 9 mistakes | done |
| 13 | MOOC part 10 (modules 37 to 39: streams and lambdas, Comparable and Comparator, StringBuilder, regular expressions, enums and iterators); plain-English explanations for part 10 mistakes | done |
| 13b | Java colors: Java red and blue instead of orange, a new logo of our own (a red and blue tile with a white J, clearly not Oracle's cup logo), and small fixes found on the way | done |
| 14 | MOOC part 11 (modules 40 to 43: class diagrams, packages, exceptions, writing files); class diagrams in lessons, package folders in the editor, checks on the files a program writes; plain-English explanations for part 11 mistakes, files written by a program shown after a run, output shown in the order it was printed | done |
| 15 | MOOC part 12 (modules 44 to 47: generics, your own list and hash map, random numbers, two-dimensional arrays); plain-English explanations for part 12 mistakes, and a browser engine fix for grids of true and false values | done |
| 16 | MOOC part 13 (modules 48 to 50: windows and layouts, events, multiple views) with Java Arena's own practice version of JavaFX: the page draws your window and runs your program again for each click; checked against real OpenJFX 21 on every model solution; plain-English explanations for part 13 mistakes | done |
| 17a | MOOC part 14.1 and 14.2 (modules 51 and 52: charts, a slider, drawing on a canvas, the mouse, images as pixels; sound is shown but not played) with the practice JavaFX extended to match: the page draws charts, canvases and images; Java Arena's own PNG images for the lessons | done |
| 17b | MOOC part 14.3 to 14.5 (modules 53 and 54): the Asteroids game drawn with shapes, keys and frames in the practice JavaFX; module 54 with an in-memory DAO that you write, and Maven, `pom.xml`, JDBC and H2 shown only as code to read and run on your own computer; the end of the course, with a link to the MOOC's conclusion | done |
| 18 | Extra modules 55 to 59, not part of the MOOC and marked "Extra" on the site: recursion, records, switch with var and text blocks, pattern matching and sealed types, linked lists, stacks, queues and trees; plain-English explanations for their mistakes; CI split into jobs that run side by side | done |
| 19 | Moving progress to another device (a transfer link, a QR code, a progress file), multi-step projects, a personal record of what you completed | done |
| 20 | The Pro Track (three projects for your own computer with a JDK 21, Maven and JUnit 5; GitHub Actions runs their tests in your own repository, and Java Arena grades nothing), a topics reference (A to Z, checked against the lessons), a link check, and an accessibility and phone pass over every page type | done |
| 20b | Red and white: Java red replaces the blue accent everywhere (buttons, links, focus rings, progress), and the logo is now a red tile with a white J | done |
| 20c | The site's own address, https://javaarena.com/ (old github.io links lead there) | done |

The plan and the research behind it are in [`docs/research/`](research/README.md), including the full curriculum map.
