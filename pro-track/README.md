# The Pro Track

Projects for your own computer, for after the course: each is a small Maven project with starter code, JUnit 5 tests that fail until you write the missing parts, and a GitHub Actions workflow that runs the tests in your own GitHub repository. The site's page for them is [the Pro Track](https://javaarena.com/pro/), with the setup steps (a JDK 21 and Maven) and a download (zip) for each project.

Each project is a folder here, `pro-track/<id>/`. Its `README.md` says what to build, step by step, and how to run the tests (`mvn test`) and the program.

Java Arena doesn't grade these projects and can't see your code or your test results: the tests tell you when your program works, and only you (and whoever can see your repository) see them run on GitHub. The checklist on each project's page is your own record of what you did.

## The model solutions

`pro-track-solutions/<id>/` holds a model solution for each project: only the files that differ from the starter code. This repository's CI uses them to check that every project can be solved (the starter's tests fail, and with the solution they all pass). The site never offers them for download: the point is to solve the project yourself. The repository is public, so you can look at them; try the project first, and look when you are really stuck or when you're done and want to compare.

## For contributors

Everything below is checked by `npm run pro-track-check` (the folder rules without Maven, then Maven itself) and by the site build (which stops on a problem in `content/pro-track.yaml` or a project's README). The rules live in [`scripts/pro-track/project.mjs`](../scripts/pro-track/project.mjs) and [`scripts/pro-track/site.mjs`](../scripts/pro-track/site.mjs); the unit tests are [`scripts/pro-track.test.mjs`](../scripts/pro-track.test.mjs).

### A project folder

`pro-track/<id>/`, where `<id>` is the project's id in kebab-case (like `word-stats`). It holds exactly a learner's project, since the site zips the whole folder for download:

| File | What it is |
| --- | --- |
| `pom.xml` | The Maven project (rules below). |
| `README.md` | For the learner (sections below). |
| `.gitignore` | At least the line `target/`, so Maven's build folder stays out of the learner's repository. |
| `.github/workflows/test.yml` | The workflow below, word for word. It runs only in the learner's own repository (GitHub runs workflows from the repository's root `.github/`, never from a subfolder like this one). |
| `src/main/java/...` | The starter code, in a package matching its folders. |
| `src/test/java/...` | The JUnit 5 tests the learner must make pass. |
| other files | Allowed when the project needs them (sample input files, `src/main/resources/`, `src/test/resources/`). |

Not allowed: built or editor files (`target/`, `*.class`, `.idea/`, `.vscode/`, `*.iml`, `out/`, `bin/`, `build/`, `.DS_Store`, editor swap files such as `*.swp` and the like), files the program makes when it runs (H2's `*.mv.db`, `*.trace.db` and `*.lock.db`), links, and more than 1 MB of files in all. The zip leaves these files out anyway, but the check refuses them so the folder stays clean.

### pom.xml

- `modelVersion` 4.0.0; a `groupId` (use `com.example`), `artifactId` equal to the folder's name, a `version` (`1.0`), packaging `jar` or none. No `<parent>`, `<modules>`, `<repositories>` or `<pluginRepositories>`: everything comes from Maven Central.
- Properties: `maven.compiler.release` = `21` and `project.build.sourceEncoding` = `UTF-8`.
- Every dependency and plugin has a pinned version: plain numbers with dots, given directly or through a property (no ranges, `SNAPSHOT`, `LATEST` or `RELEASE`). The check requires exactly these versions, so all projects stay alike (all were checked to resolve from Maven Central):

| Artifact | Version | When |
| --- | --- | --- |
| `org.junit.jupiter:junit-jupiter` | 5.14.4 | always, `<scope>test</scope>` |
| `org.apache.maven.plugins:maven-compiler-plugin` | 3.14.1 | always (Maven 3.8 and older bring 3.1 by default, which predates `release` 21) |
| `org.apache.maven.plugins:maven-surefire-plugin` | 3.5.4 | always (runs the tests) |
| `com.h2database:h2` | 2.4.240 | a database project, default (compile) scope |
| `org.openjfx:javafx-controls` (also `-base`, `-graphics`, `-fxml`, `-media`) | 21.0.12 | a JavaFX project, default scope |
| `org.openjfx:javafx-maven-plugin` | 0.0.8 | a JavaFX project (required with OpenJFX, so `mvn javafx:run` starts it; set its `mainClass`) |
| `org.codehaus.mojo:exec-maven-plugin` | 3.6.2 | optional, to run a command-line program with `mvn compile exec:java` (set its `mainClass`) |

  No other dependencies or plugins. To move to newer versions, change `PINNED` in `scripts/pro-track/project.mjs` and every `pom.xml` together, and run the check.
- A JavaFX project's tests must not use JavaFX: put the game's or app's rules in plain classes and test those, so the tests run without a screen on GitHub's computers.

A minimal `pom.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <groupId>com.example</groupId>
    <artifactId>word-stats</artifactId>
    <version>1.0</version>

    <properties>
        <maven.compiler.release>21</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>5.14.4</version>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>3.14.1</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>3.5.4</version>
            </plugin>
        </plugins>
    </build>
</project>
```

### README.md

- The first line is the title, `# Title` (the site's title for the project).
- Under it, one paragraph of one to three sentences, at most 400 characters: what the project is (the site's summary in the list).
- Then these sections, as `##` headings with exactly these words, in this order (other sections may come between them or after):
  1. `## What you'll build`: the program, what it does when finished, with an example run.
  2. `## What you need`: a JDK 21 and Maven, what modules of the course it builds on, anything else.
  3. `## Steps`: what to do, step by step, naming the files and the `// TODO`s; `###` headings are fine for longer steps.
  4. `## Run the tests`: must show `mvn test` (in a ```` ```shell ```` block), and say that the tests fail at first.
  5. `## Run the program`: the commands (`mvn compile exec:java`, `mvn javafx:run`, or `java -cp target/classes ...`).
  6. `## Put it on GitHub (optional)`: create a repository, upload the files (with the `.github` folder), see the Actions tab.
- The site shows these six sections on the project's page. Code blocks: ```` ```shell ```` for commands, ```` ```java ```` for Java, ```` ```xml ```` for XML, ```` ```text ```` for output. Links to the project's own files may be relative (`src/main/java/...`), in these six sections and in the paragraph under the title: in the zip they point to the files, and on the site they go to the file on GitHub (an image, `![...](...)`, to the file itself on GitHub). Links to a heading (`#steps`) may point only to the six sections, by GitHub's anchors (`#what-youll-build`, `#what-you-need`, `#steps`, `#run-the-tests`, `#run-the-program`, `#put-it-on-github-optional`): on the site they go to the same section of the page, and the build refuses any other `#` link, since the page has nothing else to go to.
- Plain words for someone who has just finished the course. No en or em dashes, anywhere in a project (the check refuses them in the README and the Java files).

### The starter code

- It compiles, and the tests compile against it: every class and method the tests call exists.
- Each method the learner writes has a clear `// TODO` saying what to do, and throws `UnsupportedOperationException` or returns a placeholder (0, `null`, an empty list), so the tests fail rather than the build.
- At least one `// TODO`. Some tests may pass on the starter (for parts given ready), but some must fail.
- Each file's `package` line matches its folders under `src/main/java/` (and `src/test/java/`).

### The tests

- JUnit 5 (`org.junit.jupiter.api`), in `src/test/java/`, in the same package as the classes they test.
- Clear names that say what is expected (`countsWordsSeparatedByPunctuation`), and `assertEquals` messages where a failure would otherwise be hard to read.
- Enough of them that a wrong solution fails: edge cases (empty input, one item, ties, upper and lower case), not only the example in the README.
- No test may depend on the order tests run in, the time, the network or a screen. A database project uses an in-memory H2 database (`jdbc:h2:mem:...`), a file project `@TempDir`.
- No test is skipped or disabled.

### .github/workflows/test.yml

Word for word (it is `WORKFLOW` in `scripts/pro-track/project.mjs`):

```yaml
# Runs the project's tests on GitHub's computers on every push and pull request.
# See the results in your repository's Actions tab.
name: Tests

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Run the tests
        run: mvn -B test
```

### The model solution

`pro-track-solutions/<id>/src/main/java/...`: only the `.java` files that differ from the starter (or are new), at the same paths. Copied over a copy of the starter, every test must pass. No `// TODO` left in it, and no other files (the tests and the `pom.xml` are the starter's).

### content/pro-track.yaml

Lists the projects in the order the site shows them, with what the site needs besides the README:

```yaml
projects:
  - id: word-stats            # the folder's name
    hours: 3 to 5             # about how long it takes, as "N to M" (hours)
    practices:                # what it practices, each with the module that teaches it
      - module: reading-files # a module id of content/course.yaml
        what: reading text files line by line
      - module: hash-maps
        what: counting with a HashMap
    checklist:                # 3 to 15 items the learner ticks on the project's page
      - id: setup             # kebab-case, saved in the learner's progress: never change or reuse an id
        text: "`mvn test` runs, and the tests fail"
      - id: counts
        text: The counting tests pass
```

A checklist item's text is one line of Markdown (code spans are fine). A relative link in it is relative to the project's folder (`src/main/java/...`), as in its README, and goes to the file on GitHub. Every project folder must be listed, once.

### Running the check

With Maven 3.6.3 or newer (on the PATH, or its path in `MVN`) and `JAVA_HOME` set to a JDK 21, on Linux or macOS (CI runs it on Linux; on Windows it runs `mvn.cmd`, but only Linux and macOS are tried):

```shell
npm run pro-track-check                 # every project
npm run pro-track-check -- word-stats   # one project
npm run pro-track-check -- --offline    # Maven offline (after one run with a connection)
```

It checks the folder rules, then for each project copies the starter to a temporary folder and runs `mvn -B -q test` (it must compile and some tests must fail), then copies the solution's files over another copy and runs `mvn -B test` (every test must pass, none skipped, at least as many as ran on the starter). The project folders themselves never get a `target/`. CI's job `pro-track` runs the same script; `npm run test:unit` checks the folder rules and the site's data without Maven. To see the project's page and zip, build the site (`npm run build`): the build makes `dist/pro/<id>.zip` and the pages `/pro/` and `/pro/<id>/`.
