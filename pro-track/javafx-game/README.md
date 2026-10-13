# Tide pool pairs: a JavaFX memory game

A memory game in a JavaFX window: sixteen cards lie face down, and you flip two at a time to find the pairs. You write the game's rules in plain Java classes that JUnit 5 tests without a window, then connect them to the window, and Maven runs both on your own computer.

## What you'll build

A window with a board of 16 cards, 4 by 4, all showing `?`. Each card hides one of eight tide pool creatures, and every creature is on exactly two cards. Click a card and it shows its creature. Click a second card:

- If both show the same creature, you found a pair. They stay face up and their buttons turn gray.
- If they don't, both stay face up so you can remember them. Your next click turns them face down again, then flips the card you clicked.

Every second card you flip is one move. The line under the board keeps score, and **New game** shuffles the cards again:

```text
Moves: 5, pairs: 2 of 8
...
You found all 8 pairs in 14 moves.
```

The game's rules don't need a window, so they live in classes of their own, and the tests check those. The window only shows what the rules say and passes your clicks on:

| File | What it does | Who writes it |
| --- | --- | --- |
| [`Deck.java`](src/main/java/pairs/Deck.java) | Makes the shuffled cards for a game. | You (step 1) |
| [`PairsGame.java`](src/main/java/pairs/PairsGame.java) | The rules: which cards are face up, matches, moves, winning. | You (steps 2 to 5) |
| [`StatusLine.java`](src/main/java/pairs/StatusLine.java) | The text under the board. | You (step 6) |
| [`PairsApp.java`](src/main/java/pairs/PairsApp.java) | The JavaFX window. | Mostly given; you finish it (step 7) |
| [`FlipResult.java`](src/main/java/pairs/FlipResult.java) | An enum: what a flip did. | Given ready |

The tests are in [`src/test/java/pairs/`](src/test/java/pairs/), one test class for each of steps 1 to 6. None of them opens a window, so they run anywhere, also on GitHub's computers, which have no screen.

## What you need

- **A JDK 21.** For example [Eclipse Temurin 21](https://adoptium.net/temurin/releases/?version=21). Check it in a terminal with `java -version`: it should say `21`.
- **Maven 3.9** (3.6.3 or newer works). Install it from [maven.apache.org](https://maven.apache.org/download.cgi), or with your system's package manager (`brew install maven` on macOS, `sudo apt install maven` on Ubuntu). Check it with `mvn -version`: it should show Maven's version and Java 21. If it shows another Java, set `JAVA_HOME` to your JDK 21's folder.
- **You don't install JavaFX.** Maven downloads it from Maven Central, in the version for your system (Windows, macOS or Linux).
- **Git**, if you want to put the project on GitHub from the terminal (optional). Get it from [git-scm.com](https://git-scm.com/downloads), or with your package manager (`brew install git`, `sudo apt install git`).
- **An editor.** Any will do. IntelliJ IDEA, Eclipse, NetBeans and VS Code (with the Java extensions) all open a Maven project: open the folder, or its `pom.xml`.
- **What the course taught**: JavaFX windows, buttons and layouts (modules 48 to 50), random numbers with a seed (module 46), enums (module 39), `HashMap` (module 31), exceptions (module 42), unit tests (module 26) and Maven (module 54).

About 3 to 5 hours of work.

### Maven in two minutes

Maven builds a Java project from a description of it, [`pom.xml`](pom.xml). The pom says which Java version to use (21) and which libraries the project needs: JavaFX's controls for the window, and JUnit 5 for the tests. Maven downloads them from Maven Central the first time, so your first run needs an internet connection.

Maven expects the files in fixed places:

```text
javafx-game/
  pom.xml
  src/main/java/pairs/   the game and its window
  src/test/java/pairs/   the tests
```

When it builds, Maven writes everything into a folder `target/`. You can delete `target/` whenever you like; Maven makes it again.

### The JavaFX plugin

Since Java 11, JavaFX isn't part of the JDK. It's a library like any other, so the pom lists it as a dependency (`org.openjfx:javafx-controls`). A JavaFX program also needs a few settings when it starts, and the **javafx-maven-plugin** takes care of them. The pom tells the plugin which class to start:

```xml
<plugin>
    <groupId>org.openjfx</groupId>
    <artifactId>javafx-maven-plugin</artifactId>
    <version>0.0.8</version>
    <configuration>
        <mainClass>pairs.PairsApp</mainClass>
    </configuration>
</plugin>
```

Then `mvn javafx:run` compiles the code and opens the window. That's the easiest way to start the program; plain `java -cp target/classes pairs.PairsApp` doesn't work, because it doesn't know where JavaFX is.

### JUnit 5 in two minutes

The course's tests used JUnit 4. JUnit 5 looks almost the same, with three differences you'll see in this project's tests:

- The imports come from `org.junit.jupiter.api`: `import org.junit.jupiter.api.Test;` and `import static org.junit.jupiter.api.Assertions.assertEquals;`.
- A message to show on failure goes **last**: `assertEquals(1, game.moves(), "moves after one turn")`.
- `assertThrows` checks that code throws an exception:

  ```java
  assertThrows(IllegalArgumentException.class, () -> new PairsGame(List.of("crab")));
  ```

## Steps

Each step names the `// TODO`s to fill in and the test class that checks them. Do them in order: later parts use the earlier ones. After each step, run that step's tests (see "Run the tests" below), and go on when they pass.

Most tests build a small game with cards in a known order instead of a shuffled deck, like `new PairsGame(List.of("crab", "snail", "crab", "snail"))`. That way they know where each card is. The positions count from 0, like a list's indexes.

### Step 0: get the project running

Unzip the project, open a terminal in its folder (the one with `pom.xml`) and run `mvn test`. Maven downloads what it needs, compiles the code and runs the tests. Nearly all of them fail, most with `UnsupportedOperationException`: that's expected, since the methods aren't written yet. If instead you see a compile error or "command not found", check your JDK and Maven with `java -version` and `mvn -version`.

`mvn javafx:run` won't open the window yet. It stops with `UnsupportedOperationException: Deck.pairs isn't written yet (step 1)`, because the window needs the deck and the game. After step 2 it opens with 16 `?` buttons that don't do anything yet.

### Step 1: shuffle the cards

Write `Deck.pairs(List<String> symbols, Random random)` in [`Deck.java`](src/main/java/pairs/Deck.java). It returns a new list with each symbol twice, in a shuffled order.

- Shuffle with the `Random` you are given, not a new one: `Collections.shuffle(list, random)` does it. Then the same seed always gives the same order, which is what lets a test check a shuffled deck. The window passes `new Random()`, so each game is different.
- Don't change the list of symbols you are given.
- Throw an `IllegalArgumentException` if `symbols` is empty, or if the same symbol is in it more than once (that would make four cards of it).

`Deck.TIDE_POOL` is given: the eight creatures of the game in the window.

Checked by `DeckTest`.

### Step 2: a new game

Fill in the fields and the constructor of [`PairsGame.java`](src/main/java/pairs/PairsGame.java), and the methods `size`, `symbolAt`, `isFaceUp`, `isMatched`, `pairCount`, `pairsFound` and `moves`.

- `new PairsGame(cards)` gets the cards in their order on the board: `cards.get(0)` is the symbol at position 0. Keep your own copy of the list (`new ArrayList<>(cards)`), so later changes to the caller's list don't change the game, and don't change the caller's list.
- Throw an `IllegalArgumentException` if `cards` is empty, or if some symbol isn't on exactly two cards. A `HashMap<String, Integer>` that counts each symbol is one way to check.
- In a new game every card is face down and nothing is matched. `pairCount()` is half the number of cards; `pairsFound()` and `moves()` start at 0.
- `symbolAt(position)` gives the card's symbol, face up or not (the window decides what to show). For a position outside the board, it throws an `IndexOutOfBoundsException`. A list's `get` already does that for you.

Which cards are face up and which are matched can be two `boolean` arrays, or two lists, or something else: your choice.

Checked by `NewGameTest`.

### Step 3: flip a card, find a pair

Now the main method, `flip(int position)`. It turns a card face up and returns a [`FlipResult`](src/main/java/pairs/FlipResult.java) that says what happened. A turn is two flips. This step covers turns that find a pair:

- The first card of a turn turns face up, and `flip` returns `FIRST_CARD`. Remember which card it was: the next flip needs it.
- The second card turns face up too. That completes a turn, so `moves()` goes up by 1. If the two cards have the same symbol (compare with `equals`), both are now matched, `pairsFound()` goes up by 1, and `flip` returns `MATCH`. The next flip starts a new turn.
- A card that is already face up can't be flipped: this is the first card of the turn, or a matched card. `flip` then changes nothing and returns `IGNORED`. It isn't a move, and a turn that was going on goes on.
- A position outside the board throws an `IndexOutOfBoundsException`.

Checked by `FlipTest`.

### Step 4: no match

When the second card of a turn doesn't match the first, `flip` returns `NO_MATCH`. It's a move, but no pair. Both cards stay face up for now, so the player can see them (that's what the window shows until the next click).

Then the **next** call to `flip`, before anything else, turns those two cards face down again. After that it carries on as in step 3 with the card it was given. So:

- Flipping a third card hides the two and makes the third card the first of a new turn: `FIRST_CARD`.
- Flipping one of the two shown cards hides both, then flips that card again as the first of a new turn: `FIRST_CARD`, and it's face up.
- Flipping a matched card hides the two as well, and returns `IGNORED`.

Matched cards are never turned face down.

Checked by `MismatchTest`.

### Step 5: win the game

Write `isWon()`: the game is won when every pair has been found. Then add one more rule to `flip`: once the game is won, every flip returns `IGNORED` and changes nothing.

Checked by `EndOfGameTest`. It also plays a whole game with a shuffled deck from step 1.

### Step 6: the status line

Write `StatusLine.of(PairsGame game)` in [`StatusLine.java`](src/main/java/pairs/StatusLine.java). It returns the text the window shows under the board:

- While the game goes on: `Moves: 3, pairs: 2 of 8` (the moves, the pairs found, and how many pairs the game has).
- When it's won: `You found all 8 pairs in 14 moves.`
- With one move, say `1 move`, not `1 moves`. And a game of a single pair says `You found the pair in 1 move.`

Checked by `StatusLineTest`. With it, all the tests pass.

### Step 7: the window

The tests don't open windows, so this last step is checked by you, with your own eyes. Open [`PairsApp.java`](src/main/java/pairs/PairsApp.java). It's like the windows of modules 48 to 50: `start` builds a `GridPane` with a button for each card, a `Label` for the status line and a **New game** button. Two `// TODO`s are left:

1. In the card button's event handler: flip the card at `position` with `game.flip(position)`, then call `refresh()`. (The handler doesn't need to look at the `FlipResult`; `refresh` shows the game as it is now.)
2. In `refresh()`: go through the card buttons. Set each button's text to the card's symbol when the card is face up, and to `FACE_DOWN` when it isn't. Disable the button when the card is matched, with `button.setDisable(...)`, so a found pair turns gray. Then set the status label's text to `StatusLine.of(game)`.

Notice that the window has no rules of its own: it asks the game what to show. That is why the tests could check the whole game without it.

Run it with `mvn javafx:run` and play a few rounds. Once it works, ideas to go further: a bigger board (more symbols and `COLUMNS`), the best score of the session in the status line, or a short pause before a mismatch turns face down (JavaFX's `PauseTransition`). Write a test first for anything that changes the rules.

## Run the tests

In the project's folder:

```shell
mvn test
```

At first most tests fail: that's how you know what's left to do. Maven lists each failed test with what it expected and what it got, for example:

```text
[ERROR]   FlipTest.aMatchCountsAMoveAndAPair:60 moves after one turn ==> expected: <1> but was: <0>
```

That's the test class, the test's name (it says what's expected), the line of the test, the message and the values. Open the test to see what it does. At the end, `BUILD SUCCESS` means every test passed.

To run one step's tests only, name the test class:

```shell
mvn test -Dtest=DeckTest
```

Your editor can run the tests too, one at a time if you like: look for the run button next to a test.

## Run the program

```shell
mvn javafx:run
```

Maven compiles the code and opens the game's window. Close the window to end the program. The first run downloads the plugin, so it needs a connection.

In an editor, run it the same way: most editors list Maven's goals in a Maven panel, where `javafx:run` is under Plugins, javafx. Running `PairsApp` with the editor's own run button may fail with "JavaFX runtime components are missing", because that doesn't go through the plugin.

## Put it on GitHub (optional)

The project comes with a GitHub Actions workflow, [`.github/workflows/test.yml`](.github/workflows/test.yml). In your own GitHub repository, it runs `mvn test` on GitHub's computers every time you push, and shows the result in the repository's **Actions** tab. Those computers have no screen, and they don't need one: the tests don't open the window. Nobody else sees the results unless your repository is public, and Java Arena doesn't see them at all.

1. On [github.com](https://github.com), create a new repository (the **+** at the top, then **New repository**). Give it a name, like `tide-pool-pairs`. Leave it empty: no README, no .gitignore.
2. Put the project's files at the top of the repository, so that `pom.xml` and the `.github` folder are at its root. Without the `.github` folder, nothing runs.
   - **With git** (in the project's folder):

     ```shell
     git init
     git add .
     git commit -m "Tide pool pairs"
     git branch -M main
     git remote add origin https://github.com/YOUR-NAME/tide-pool-pairs.git
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

The GitHub mobile app shows the Actions tab and each run's result, so you can follow your tests from a phone. Writing the code, running Maven, playing the game and the first upload need the computer.
