# A yarn stash with JDBC and H2

A small program for knitters that keeps track of their yarn in a real database. You write the data access object (DAO) that creates the table and adds, finds, changes and removes rows with JDBC and H2, and JUnit tests check it against a fresh database in memory.

## What you'll build

A yarn stash: each line of it says how many skeins of one yarn you got from one shop. The program is a text user interface over a database in a file, `yarnstash.mv.db`, so your yarn is still there the next time you start it. A run looks like this (what you type comes after each `:`):

```text
Yarn stash. Commands: add, list, search, change, remove, totals, quit
Command: add
Yarn: Gray alpaca
Shop: Knit Nook
Skeins: 2
Added yarn 1.
Command: add
Yarn: Cotton bloom
Shop: Knit Nook
Skeins: 6
Added yarn 2.
Command: add
Yarn: Gray alpaca
Shop: Market stall
Skeins: 1
Added yarn 3.
Command: search
Name contains: ALPACA
#1 Gray alpaca x2 from Knit Nook
#3 Gray alpaca x1 from Market stall
Command: totals
Cotton bloom: 6
Gray alpaca: 3
Command: remove
Id: 2
Removed yarn 2.
Command: quit
Bye!
```

The user interface (`YarnStash.java`), `Main.java`, the `Yarn` class and the `YarnDao` interface are ready. Your part is the class that talks to the database, `JdbcYarnDao.java`. The user interface only knows the interface `YarnDao`, as in module 54's step on DAOs, so the rest of the program never sees any SQL.

## What you need

- **A JDK 21.** For example [Eclipse Temurin 21](https://adoptium.net/temurin/releases/?version=21). Check it in a terminal with `java -version`: it should say `21`.
- **Maven 3.9** (3.6.3 or newer works). Install it from [maven.apache.org](https://maven.apache.org/download.cgi), or with your system's package manager (`brew install maven` on macOS, `sudo apt install maven` on Ubuntu). Check it with `mvn -version`: it should show Maven's version and Java 21. If it shows another Java, set `JAVA_HOME` to your JDK 21's folder. [The Pro Track page](https://antonyperez0.github.io/Java-Arena/pro/) has these setup steps in more detail.
- **No database to install.** H2 is a database written in Java, and Maven downloads it from Maven Central like any other library. Its dependency is already in `pom.xml`:

  ```xml
  <dependency>
      <groupId>com.h2database</groupId>
      <artifactId>h2</artifactId>
      <version>2.4.240</version>
  </dependency>
  ```

- **Git**, if you want to put the project on GitHub from the terminal (optional). Get it from [git-scm.com](https://git-scm.com/downloads), or with your package manager (`brew install git`, `sudo apt install git`).
- **An editor.** Any will do. IntelliJ IDEA, Eclipse, NetBeans and VS Code (with the Java extensions) all open a Maven project: open the folder, or its `pom.xml`. IntelliJ IDEA, Eclipse and NetBeans come with Maven built in, so you can run the tests from the editor if you don't install Maven yourself. VS Code needs Maven installed to run Maven's commands.
- **What the course taught**, in particular:
  - [Libraries and tools](https://antonyperez0.github.io/Java-Arena/learn/libraries-and-tools/) (module 54): Maven, DAOs, and the step [A real database with JDBC](https://antonyperez0.github.io/Java-Arena/learn/libraries-and-tools/databases/), which this project puts into practice. Read that step again before you start.
  - [Exceptions](https://antonyperez0.github.io/Java-Arena/learn/exceptions/) (module 42): throwing, catching, and try-with-resources.
  - [Interfaces](https://antonyperez0.github.io/Java-Arena/learn/interfaces/) (module 35) and [hash maps](https://antonyperez0.github.io/Java-Arena/learn/hash-maps/) (module 31).
- About 3 to 5 hours.

The project's files:

| File | What it is |
| --- | --- |
| [`src/main/java/yarnstash/JdbcYarnDao.java`](src/main/java/yarnstash/JdbcYarnDao.java) | The DAO over the database. **You write this one**, at its `// TODO`s. |
| [`src/main/java/yarnstash/YarnDao.java`](src/main/java/yarnstash/YarnDao.java) | The interface: what each method must do. Ready. |
| [`src/main/java/yarnstash/Yarn.java`](src/main/java/yarnstash/Yarn.java) | One line of the stash: id, name, shop, skeins. Ready. |
| [`src/main/java/yarnstash/YarnStash.java`](src/main/java/yarnstash/YarnStash.java), [`Main.java`](src/main/java/yarnstash/Main.java) | The text user interface, and the program's start. Ready. |
| `src/test/java/yarnstash/` | The tests, one class per step, and `TestDatabase`, their helper. |

### Maven in two minutes

Maven builds a Java project from a description of it, [`pom.xml`](pom.xml). The pom says which Java version to use (21) and which libraries the project needs: H2, the database, for the program, and JUnit 5 for the tests. Maven downloads them from Maven Central the first time, so your first run needs an internet connection.

Maven expects the files in fixed places:

```text
h2-database/
  pom.xml
  src/main/java/yarnstash/   the program
  src/test/java/yarnstash/   the tests
```

When it builds, Maven writes everything into a folder `target/`. You can delete `target/` whenever you like; Maven makes it again.

### JUnit 5 in two minutes

The course's tests used JUnit 4. JUnit 5 looks almost the same, with three differences you'll see in this project's tests:

- The imports come from `org.junit.jupiter.api`: `import org.junit.jupiter.api.Test;` and `import static org.junit.jupiter.api.Assertions.assertEquals;`.
- A message to show on failure goes **last**: `assertEquals(1, TestDatabase.rows(url), "add should insert one row")`.
- `assertThrows` checks that code throws an exception:

  ```java
  assertThrows(IllegalArgumentException.class, () -> dao.add("", "Knit Nook", 1));
  ```

## Steps

Every method of `JdbcYarnDao` follows the same pattern as module 54's `JdbcRepairJobDao`: open a connection with `connect()` (it's ready), prepare one SQL statement with `?` for each value, fill the values in with `setString` and `setInt` (numbered from 1), run it, and read the answer. Try-with-resources closes the result set, the statement and the connection, even when something goes wrong:

```java
String sql = "SELECT id, name, shop, skeins FROM Yarn WHERE id = ?";
try (Connection connection = connect();
        PreparedStatement statement = connection.prepareStatement(sql)) {
    statement.setInt(1, id);
    try (ResultSet rows = statement.executeQuery()) {
        // rows.next() moves to the next row, and is false when there are no more.
    }
} catch (SQLException e) {
    throw new IllegalStateException("Couldn't read yarn " + id, e);
}
```

`SQLException` is a checked exception, and `YarnDao`'s methods don't declare it, so catch it in each method and throw an `IllegalStateException` with the `SQLException` as its cause, as above. Never glue a value into the SQL text with `+`: a yarn like `Granny's merino` would break it, and some tests check exactly that.

Each test makes a new, empty database in memory with a URL like `jdbc:h2:mem:yarnstash-test-7;DB_CLOSE_DELAY=-1`, so every test starts from nothing and no file is left behind. (An H2 database in memory normally disappears when its last connection closes; `DB_CLOSE_DELAY=-1` keeps it while the tests run.) Some tests also look into the table with plain JDBC, past your DAO, so your DAO must really keep its data in the database and not in a list of its own.

### Step 0: run the tests

Run `mvn test` in the project's folder (see "Run the tests" below). It compiles everything and runs 66 tests, and most of them fail. That's the starting point: the failing tests are your to-do list.

### Step 1: create the table

In the constructor, create the table `Yarn` if it doesn't exist yet. Its columns:

| Column | SQL type | What it holds |
| --- | --- | --- |
| `id` | `INT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY` | The line's id. The database hands out 1, 2, 3... and never hands out a removed row's id again. |
| `name` | `VARCHAR(100) NOT NULL` | The yarn's name, such as `Gray alpaca`: text of up to 100 characters, never missing. |
| `shop` | `VARCHAR(100) NOT NULL` | Where you got it. |
| `skeins` | `INT NOT NULL` | How many skeins. |

The SQL starts with `CREATE TABLE IF NOT EXISTS Yarn (` and lists the columns with commas between them. `IF NOT EXISTS` matters: when you start the program the second time, the table is already there with your yarn in it, and the constructor must leave it as it is. Run the statement with `executeUpdate()`, and turn an `SQLException` into an `IllegalStateException`.

Checked by `SchemaTest`.

### Step 2: add and findById

`add(name, shop, skeins)` stores a new yarn and returns its id.

1. First check the values. Throw an `IllegalArgumentException` with a message that says what's wrong if the name or the shop is empty or only spaces (`isBlank()`), or longer than 100 characters once you drop the spaces at its start and end (the columns hold 100), or if `skeins` is less than 1. Check before you touch the database, so a refused yarn is never stored and doesn't use up an id. (Without the length check, H2 refuses the long text itself with an `SQLException`, which comes out of your DAO as an `IllegalStateException` and stops the program.)
2. Store the name and the shop without the spaces at their start and end (`trim()`).
3. The SQL: `INSERT INTO Yarn (name, shop, skeins) VALUES (?, ?, ?)`. There's no id in it: the database chooses it.
4. To get that id back, prepare the statement with `connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)` (import `java.sql.Statement`). After `executeUpdate()`, `statement.getGeneratedKeys()` returns a `ResultSet` with one row: call `next()` once, and `getInt(1)` is the id. Close that result set too.

`findById(id)` returns the yarn with that id, or `null` if there's none. The SQL is `SELECT id, name, shop, skeins FROM Yarn WHERE id = ?`. If `rows.next()` is `true`, make a `Yarn` from the row with `rows.getInt("id")`, `rows.getString("name")` and so on; if it's `false`, there's no such row. A small private method that makes a `Yarn` of the current row will help in the next steps too.

Checked by `AddAndFindTest`.

### Step 3: list and search

`list()` returns every yarn, smallest id first: `SELECT id, name, shop, skeins FROM Yarn ORDER BY id`, and a `while (rows.next())` loop that adds a `Yarn` to a new `ArrayList` for each row. SQL promises no particular order unless you ask for one with `ORDER BY`. H2 often gives the rows in id order anyway, but don't count on it: one test changes the table so that it doesn't.

`search(text)` returns the yarns whose name contains the text, ignoring upper and lower case, smallest id first. `ALPACA` finds `Gray alpaca`, `oo` finds `Cotton bloom`, and an empty text finds every yarn. You can do this in SQL or in Java:

- In SQL, `LOWER(name)` is the name in lower case, and `LOCATE(?, LOWER(name)) > 0` is true when the value is somewhere in it (`LOCATE` gives the place where it starts, counted from 1, or 0 if it isn't there). Give the value in lower case, or write `LOWER(?)`.
- Or in Java: go through `list()` and keep the yarns whose `getName().toLowerCase()` contains `text.toLowerCase()`.

The SQL way lets the database do the work, which matters when a table has a million rows; with a few hundred yarns, either is fine. (You may know `LIKE` from somewhere else. With `LIKE`, a `%` in the text means "anything" and a `_` means "any one character", so a search for `_` would find every yarn. To use it, you'd have to put an escape character before every `%`, `_` and escape character in the text and name it with `ESCAPE`. `LOCATE` or the Java way is simpler, and a test checks that `%` and `_` are plain text.)

Checked by `ListAndSearchTest`.

### Step 4: update and remove

`update(yarn)` changes the name, the shop and the number of skeins of the row with the yarn's id: `UPDATE Yarn SET name = ?, shop = ?, skeins = ? WHERE id = ?`. It checks the values and trims the text exactly as `add` does (move the checks to a private method that both use). `executeUpdate()` returns how many rows changed, so `update` returns `true` when that is more than 0, and `false` when there was no yarn with that id.

`remove(id)` deletes the row with that id, `DELETE FROM Yarn WHERE id = ?`, and returns `true` if a row went away, `false` if there was none.

Checked by `UpdateAndRemoveTest`. One of its tests removes the last yarn and adds a new one: the new one gets a new id, not the removed one's. The identity column does that for you.

### Step 5: totals

`totalsByName()` returns a map from each yarn's name to the number of skeins in all, such as `{Gray alpaca=3, Cotton bloom=6}`. A name is written exactly as it is stored, so `Merino` and `merino` are two different keys. In SQL, `GROUP BY` makes one row of each group of rows with the same value, and `SUM` adds a column up within each group:

```text
SELECT name, SUM(skeins) AS total FROM Yarn GROUP BY name
```

Each row of the answer has a name and its total (`rows.getInt("total")`); put them in a `HashMap`. Or use `list()` and add the numbers up in Java, as in module 31.

Checked by `TotalsTest`. When all 66 tests pass, you're done: run the program and add your own yarn.

## Run the tests

In a terminal, in the project's folder (the one with `pom.xml`):

```shell
mvn test
```

The first time, Maven downloads JUnit, H2 and its plugins, so it needs a connection and takes a minute or two. The tests fail at first: that's expected, and each step above makes more of them pass. At the end Maven prints how many ran and which failed, with each failing test's message. When they all pass, it says `BUILD SUCCESS`.

To run the tests of one step only, name the test class:

```shell
mvn test -Dtest=SchemaTest
```

In an IDE such as IntelliJ IDEA or Eclipse, you can also right-click a test class or the `src/test/java` folder and run the tests from there.

## Run the program

```shell
mvn compile exec:java
```

This compiles the code and starts `yarnstash.Main` (the `pom.xml` names it). The program makes the file `yarnstash.mv.db` in the project's folder the first time, and uses it again every time after. Type `quit` to stop. To start over with an empty stash, delete `yarnstash.mv.db` while the program isn't running. The `.gitignore` keeps that file out of your repository.

Before you've written the steps, a command whose method isn't written yet stops the program with an `UnsupportedOperationException`. Run it again after each step to see what works.

## Put it on GitHub (optional)

The folder `.github/workflows/` holds a GitHub Actions workflow, `test.yml`. In your own GitHub repository, GitHub runs `mvn -B test` on its own computers every time you push, so you can see that the tests pass somewhere other than your own computer.

1. On [github.com](https://github.com), create a new repository (the **+** at the top, then **New repository**). Give it a name, like `yarn-stash`. Leave it empty: no README, no .gitignore.
2. Put the project's files at the top of the repository, so that `pom.xml` and the `.github` folder are at its root. Without the `.github` folder, nothing runs.
   - **With git** (in the project's folder):

     ```shell
     git init
     git add .
     git commit -m "Start the yarn stash"
     git branch -M main
     git remote add origin https://github.com/YOUR-NAME/yarn-stash.git
     git push -u origin main
     ```

     The `.gitignore` keeps `target/` and the database file out of the repository.

     The first time you use git on a computer, tell it your name and email, or `git commit` stops with "Author identity unknown":

     ```shell
     git config --global user.name "Your Name"
     git config --global user.email you@example.com
     ```

     The first `git push` asks you to sign in, and GitHub doesn't accept your account password there. Git for Windows opens a browser window to sign you in. On macOS and Linux, sign in first with [GitHub CLI](https://cli.github.com) (`gh auth login`, and let it set up git), or paste a [personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens) when git asks for the password. [GitHub Desktop](https://desktop.github.com) signs you in for you, too.
   - **In the browser**: on the new repository's page, choose **uploading an existing file** and drag the project's files and folders into it, then **Commit changes**. Don't upload `target/` or `yarnstash.mv.db`. Folders whose names start with a dot are hidden on macOS and Linux: press `Cmd+Shift+.` in macOS's Finder, or `Ctrl+H` in most Linux file managers, to see `.github`.
3. Open the repository's **Actions** tab. The workflow **Tests** runs after each push: a red cross means some tests fail (open the run to see which), a green check means they all pass. Each push runs it again, so push after each step and watch the red turn green.

The GitHub mobile app shows the Actions tab and each run's result, so you can follow your tests from a phone. Writing the code, running Maven and the first upload need the computer.

Java Arena can't see your repository or your test results. They are yours.
