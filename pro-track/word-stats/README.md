# Word statistics on the command line

A small command-line program that reads text files and tells you how many lines, words and characters they have, and which words come up most often. You build it with Maven and check it with JUnit 5 tests, on your own computer.

## What you'll build

A program called `word-stats`. You give it the names of one or more text files, and it prints a short report for each file. With two or more files, it also prints the total.

```text
$ java -cp target/classes wordstats.WordStats --top 3 samples/harbor.txt samples/lighthouse.txt
samples/harbor.txt
  lines: 7
  words: 72
  characters: 373
  different words: 52
  most frequent:
        12  the
         3  and
         3  boats

samples/lighthouse.txt
  lines: 7
  words: 62
  characters: 322
  different words: 45
  most frequent:
        10  the
         2  a
         2  and

total
  lines: 14
  words: 134
  characters: 695
  different words: 88
  most frequent:
        22  the
         5  and
         4  a
```

It understands these options, before, between or after the file names:

| Option | What it does |
| --- | --- |
| `--top N` | Show the N most frequent words (10 if you leave it out). |
| `--min-length N` | Leave words shorter than N characters out of the most frequent list (1 if you leave it out). Try `--min-length 4` to skip "the" and "and". |
| `--case-sensitive` | Count "Tide" and "tide" as different words. Without it, case doesn't matter. |
| `-h`, `--help` | Show a short help text. |

When something goes wrong, it says so: a wrong option prints a message and the help text, and a file that can't be read is reported while the other files are still counted.

The project is split into small classes, so each part can be tested on its own:

| File | What it does | Who writes it |
| --- | --- | --- |
| [`Words.java`](src/main/java/wordstats/Words.java) | Splits a line into words. | You (step 1) |
| [`TextStats.java`](src/main/java/wordstats/TextStats.java) | Counts lines, characters and words, with a `HashMap`. | You (steps 2 and 3) |
| [`TextFiles.java`](src/main/java/wordstats/TextFiles.java) | Reads a file into a `TextStats`. | You (step 4) |
| [`CommandLine.java`](src/main/java/wordstats/CommandLine.java) | Turns the command line's arguments into `Options`. | You (step 5) |
| [`WordStats.java`](src/main/java/wordstats/WordStats.java) | The program: puts the parts together. | You (step 6) |
| [`WordCount.java`](src/main/java/wordstats/WordCount.java), [`Options.java`](src/main/java/wordstats/Options.java) | Two records that carry data between the parts. | Given ready |
| [`Report.java`](src/main/java/wordstats/Report.java) | Turns statistics into the text above, and has the help text. | Given ready |

The tests are in [`src/test/java/wordstats/`](src/test/java/wordstats/), one test class for each step.

## What you need

- **A JDK 21.** For example [Eclipse Temurin 21](https://adoptium.net/temurin/releases/?version=21). Check it in a terminal with `java -version`: it should say `21`.
- **Maven 3.9** (3.6.3 or newer works). Install it from [maven.apache.org](https://maven.apache.org/download.cgi), or with your system's package manager (`brew install maven` on macOS, `sudo apt install maven` on Ubuntu). Check it with `mvn -version`: it should show Maven's version and Java 21. If it shows another Java, set `JAVA_HOME` to your JDK 21's folder.
- **Git**, if you want to put the project on GitHub from the terminal (optional). Get it from [git-scm.com](https://git-scm.com/downloads), or with your package manager (`brew install git`, `sudo apt install git`).
- **An editor.** Any will do. IntelliJ IDEA, Eclipse, NetBeans and VS Code (with the Java extensions) all open a Maven project: open the folder, or its `pom.xml`. IntelliJ IDEA, Eclipse and NetBeans come with Maven built in, so you can run the tests from the editor if you don't install Maven yourself. VS Code needs Maven installed to run Maven's commands.
- **What the course taught**: reading files line by line (module 20), `HashMap` (module 31), sorting with a comparator (module 38), exceptions (module 42) and unit tests (module 26). The project uses `java.nio.file` for the files, like the course did with `Paths.get`.

About 3 to 5 hours of work.

### Maven in two minutes

Maven builds a Java project from a description of it, [`pom.xml`](pom.xml). The pom says which Java version to use (21) and which libraries the project needs: here only JUnit 5, for the tests. Maven downloads them from Maven Central the first time, so your first run needs an internet connection.

Maven expects the files in fixed places:

```text
word-stats/
  pom.xml
  src/main/java/wordstats/   the program
  src/test/java/wordstats/   the tests
  samples/                   two short text files to try the program on
```

When it builds, Maven writes everything into a folder `target/`. You can delete `target/` whenever you like; Maven makes it again.

### JUnit 5 in two minutes

The course's tests used JUnit 4. JUnit 5 looks almost the same, with three differences you'll see in this project's tests:

- The imports come from `org.junit.jupiter.api`: `import org.junit.jupiter.api.Test;` and `import static org.junit.jupiter.api.Assertions.assertEquals;`.
- A message to show on failure goes **last**: `assertEquals(3, stats.lineCount(), "lineCount")`.
- `assertThrows` checks that code throws an exception:

  ```java
  assertThrows(IllegalArgumentException.class, () -> CommandLine.parse(new String[0]));
  ```

The tests of step 4 also use `@TempDir`: JUnit gives the test an empty temporary folder to write files in, and deletes it afterward.

## Steps

Each step names the `// TODO`s to fill in and the test class that checks them. Do them in order: later parts use the earlier ones. After each step, run that step's tests (see "Run the tests" below), and go on when they pass.

### Step 0: get the project running

Unzip the project, open a terminal in its folder (the one with `pom.xml`) and run `mvn test`. Maven downloads what it needs, compiles the code and runs the tests. Nearly all of them fail with `UnsupportedOperationException`: that's expected, since the methods aren't written yet. If instead you see a compile error or "command not found", check your JDK and Maven with `java -version` and `mvn -version`.

### Step 1: split a line into words

Write `Words.split(String line)` in [`Words.java`](src/main/java/wordstats/Words.java). It returns the words of the line, in order, as they are written.

- A word is a run of letters, digits and apostrophes (`'`). `Character.isLetterOrDigit(c)` tells whether a character is a letter or a digit, and it knows letters like `é` too.
- Every other character ends the word: spaces, tabs, punctuation, hyphens, slashes. So `well-known` is two words.
- Apostrophes at the start or the end of a word are not part of it: `'ahoy'` is the word `ahoy`, while `don't` stays `don't`. Apostrophes alone are no word.
- Keep the case as it is. An empty line, or one with no letters or digits, gives an empty list.

One way: go through the line with a `StringBuilder`, adding characters to it while they belong to a word, and finishing the word whenever another character comes (and at the end of the line).

Checked by `WordsTest`.

### Step 2: count lines, characters and words

Fill in [`TextStats.java`](src/main/java/wordstats/TextStats.java): the fields, the constructor, `addLine`, `lineCount`, `characterCount`, `wordCount`, `distinctWordCount` and `countOf`.

- `addLine(line)` adds one line: one more line, the line's length in characters (spaces and punctuation too; there are no line breaks in it), and its words from `Words.split`.
- Keep a `HashMap<String, Integer>` from each word to how many times it appeared. `distinctWordCount()` is how many different words there are, and `countOf(word)` how many times a word appeared (0 if never).
- `new TextStats(false)` ignores case: count every word in lower case with `toLowerCase(Locale.ROOT)` (and `import java.util.Locale;`), so "Tide", "tide" and "TIDE" are one word. `Locale.ROOT` gives the same result on every computer: plain `toLowerCase()` follows the computer's language, and in Turkish it turns `I` into a dotless `ı`. Then `countOf` ignores case too: `countOf("Tide")` and `countOf("tide")` give the same. `new TextStats(true)` keeps the words as they are.

Checked by `TextStatsTest`.

### Step 3: the most frequent words, and adding statistics together

Still in `TextStats.java`:

- `mostFrequent(n, minLength)` returns a `List<WordCount>` of at most `n` words, the most frequent first. Words with the same count are in alphabetical order (`String`'s `compareTo`), so the result is always the same. Words shorter than `minLength` characters are left out before the first `n` are taken. If `n` is 0 or less, the list is empty. With case ignored, the words in the list are in lower case.
- `addAll(other)` adds another `TextStats`'s counts to this one: lines, characters, words, and each word's count. It must not change `other`. The program uses it for the total.

[`WordCount`](src/main/java/wordstats/WordCount.java) is a record, so `new WordCount("boat", 3)` makes one and `word()` and `count()` read it. To sort, make a list of `WordCount`s and give `sort` a comparator that compares the counts first and, when they are equal, the words.

Checked by `MostFrequentTest`.

### Step 4: read a file

Write `TextFiles.read(Path file, boolean caseSensitive)` in [`TextFiles.java`](src/main/java/wordstats/TextFiles.java): it makes a new `TextStats`, adds every line of the file, and returns it.

`Files.readAllLines(file)` (from `java.nio.file.Files`) gives the lines of a UTF-8 file as a `List<String>`, without the line breaks, and it handles Windows line breaks (`\r\n`) too. A `Scanner` over the file, as in the course, works as well. If the file can't be read, let the `IOException` through: the method already says `throws IOException`, and step 6 deals with it.

Checked by `TextFilesTest`.

### Step 5: read the command line

When you run `java wordstats.WordStats --top 3 notes.txt`, `main` gets the words after the class name in its `String[] args`: here `{"--top", "3", "notes.txt"}`. Write `CommandLine.parse(String[] args)` in [`CommandLine.java`](src/main/java/wordstats/CommandLine.java), which turns them into an [`Options`](src/main/java/wordstats/Options.java) record.

- `--top N` and `--min-length N` take the next argument as their number. It must be a whole number of at least 1.
- `--case-sensitive` sets `caseSensitive`, and `-h` or `--help` sets `help`.
- Any other argument that starts with `-` is an unknown option. Every other argument is a file name, kept in the order given.
- Options can come anywhere: before, between or after the files. Without them, `top` is `CommandLine.DEFAULT_TOP` and `minLength` is `CommandLine.DEFAULT_MIN_LENGTH`.

When the arguments are wrong, throw an `IllegalArgumentException` with a message that helps the user fix it. The tests check that the message names the option in question:

- `--top` or `--min-length` at the end, with no number after it, or followed by something that isn't a whole number of at least 1 (`--top three`, `--top 0`). The message names the option, like `--top needs a whole number, not three`. Careful: `Integer.parseInt` throws a `NumberFormatException` whose message doesn't name the option, so catch it and throw your own.
- An unknown option, like `--color`. The message names it: `unknown option --color`.
- No files, unless `--help` was given.

Checked by `CommandLineTest`.

### Step 6: put it together

Write `WordStats.run(String[] args, PrintStream out, PrintStream err)` in [`WordStats.java`](src/main/java/wordstats/WordStats.java). `main` is given: it calls `run` with `System.out` and `System.err`. Print with `out.print(...)` and `err.println(...)` instead of `System.out`, so the tests can catch what `run` prints. `run` returns the program's exit status.

1. Parse the arguments with `CommandLine.parse`. If it throws an `IllegalArgumentException`, print its message to `err` (followed by `Report.usage()` if you like) and return 2.
2. If `help` is set, print `Report.usage()` to `out` and return 0, without reading any files.
3. Read each file with `TextFiles.read(Path.of(name), ...)` and print `Report.format(name, stats, top, minLength)` to `out` with `out.print`, using the file's name as it was given. Put an empty line between two reports. For a single file, print nothing else to `out`.
4. If a file can't be read (an `IOException`), print a message that names the file to `err`, and go on with the next file.
5. If two or more files were read, print the total after them, after an empty line: make one `TextStats` with the same `caseSensitive` setting, add each file's statistics into it with `addAll`, and print it with the title `Report.TOTAL`. Count the files that were read, not the ones named: if only one of two files could be read, there's no total.
6. Return 1 if some file couldn't be read, and 0 otherwise.

Checked by `WordStatsTest`. When all the tests pass, the program is done: try it on your own files.

The files must be UTF-8. With `Files.readAllLines`, a file saved in another encoding (an older Windows or Latin-1 file with accents) is reported as `can't read notes.txt (MalformedInputException)`. With a `Scanner`, its accented letters come out wrong instead. Save the file as UTF-8 in your editor and try again.

## Run the tests

In the project's folder:

```shell
mvn test
```

At first most tests fail: that's how you know what's left to do. Maven lists each failed test with what it expected and what it got, for example:

```text
[ERROR]   TextStatsTest.ignoresCaseWhenNotCaseSensitive:77 countOf("Tide") ignores case too ==> expected: <4> but was: <0>
```

That's the test class, the test's name (it says what's expected), the line of the test, the message and the values. Open the test to see what it does. At the end, `BUILD SUCCESS` means every test passed.

To run one step's tests only, name the test class:

```shell
mvn test -Dtest=WordsTest
```

Your editor can run the tests too, one at a time if you like: look for the run button next to a test.

## Run the program

Compile it and run it with `java`, giving the options and files after the class name:

```shell
mvn compile
java -cp target/classes wordstats.WordStats samples/harbor.txt
java -cp target/classes wordstats.WordStats --top 5 --min-length 4 samples/harbor.txt samples/lighthouse.txt
java -cp target/classes wordstats.WordStats --help
```

Or let Maven run it, with the arguments in `-Dexec.args` (the pom sets up the exec plugin for this):

```shell
mvn compile exec:java "-Dexec.args=--top 5 samples/harbor.txt"
```

`-cp target/classes` tells Java where Maven put the compiled classes. On Windows, write the paths with `\` or `/`, both work.

## Put it on GitHub (optional)

The project comes with a GitHub Actions workflow, [`.github/workflows/test.yml`](.github/workflows/test.yml). In your own GitHub repository, it runs `mvn test` on GitHub's computers every time you push, and shows the result in the repository's **Actions** tab. Nobody else sees it unless your repository is public, and Java Arena doesn't see it at all.

1. On [github.com](https://github.com), create a new repository (the **+** at the top, then **New repository**). Give it a name, like `word-stats`. Leave it empty: no README, no .gitignore.
2. Put the project's files at the top of the repository, so that `pom.xml` and the `.github` folder are at its root. Without the `.github` folder, nothing runs.
   - **With git** (in the project's folder):

     ```shell
     git init
     git add .
     git commit -m "Word statistics project"
     git branch -M main
     git remote add origin https://github.com/YOUR-NAME/word-stats.git
     git push -u origin main
     ```

     The `.gitignore` keeps `target/` out of the repository.

     The first time you use git on a computer, tell it your name and email, or `git commit` stops with "Author identity unknown":

     ```shell
     git config --global user.name "Your Name"
     git config --global user.email you@example.com
     ```

     The first `git push` asks you to sign in, and GitHub doesn't accept your account password there. Git for Windows opens a browser window to sign you in. On macOS and Linux, sign in first with [GitHub CLI](https://cli.github.com) (`gh auth login`, and let it set up git), or paste a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) when git asks for the password. [GitHub Desktop](https://desktop.github.com) signs you in for you, too.
   - **In the browser**: on the new repository's page, choose **uploading an existing file** and drag the project's files and folders into it, then **Commit changes**. Don't upload `target/`. Folders whose names start with a dot are hidden on macOS and Linux: press `Cmd+Shift+.` in macOS's Finder, or `Ctrl+H` in most Linux file managers, to see `.github`.
3. Open the **Actions** tab. A run called **Tests** starts after each push. A green check means all the tests passed; a red cross means some failed, and the run's log shows which, just like `mvn test` on your computer. Before you finish the project, red is expected.

The GitHub mobile app shows the Actions tab and each run's result, so you can follow your tests from a phone. Writing the code, running Maven and the first upload need the computer.
