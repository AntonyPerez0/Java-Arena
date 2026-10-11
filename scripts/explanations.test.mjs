// Tests of the plain-English explanations of part 11 mistakes (src/engine/friendly.ts): exceptions,
// packages and files; of part 12: type parameters, lists and hash maps of your own, Random and
// two-dimensional arrays; and of part 13: JavaFX, with Java Arena's practice version of it. Each diagnostic is javac's own (the same on the JDK and in the browser, as the
// fidelity suite checks), rebuilt here from its code, place and message. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";
import { buildSync } from "esbuild";

// friendly.ts is TypeScript that imports other modules: bundle it into one module to import it here.
const bundle = buildSync({ entryPoints: [new URL("../src/engine/friendly.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { explainCrash, explainDiagnostic, PRACTICE_JAVAFX, PRACTICE_JAVAFX_STATIC } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

/** A program's files from { path: lines }. */
const program = (files) => Object.entries(files).map(([path, lines]) => ({ path, text: lines.join("\n") + "\n" }));

/** javac's diagnostic on a line of a file, with its caret where `at` starts on it, as javac prints it (the source line, then the caret). */
function diag(files, file, line, at, code, message) {
  const source = files.find((f) => f.path === file).text.split("\n")[line - 1];
  const column = source.indexOf(at) + 1;
  assert.ok(column > 0, `${at} isn't on line ${line}`);
  const [first, ...rest] = message.split("\n");
  const formatted = [`${file}:${line}: error: ${first}`, source, `${" ".repeat(column - 1)}^`, ...rest].join("\n");
  return { kind: "error", code, file, line, column, message, formatted };
}

const explain = (files, ...args) => explainDiagnostic(diag(files, ...args), files);
const has = (text, ...parts) => {
  for (const p of parts) assert.ok(text?.includes(p), `missing ${JSON.stringify(p)} in: ${text}`);
};

const UNREPORTED = "compiler.err.unreported.exception.need.to.catch.or.throw";

test("an unreported exception names what throws it, and both ways to handle it", () => {
  const files = program({
    "Main.java": ["import java.nio.file.Files;", "import java.nio.file.Path;", "", "public class Main {", "    public static void main(String[] args) {", '        System.out.println(Files.readAllLines(Path.of("scores.txt")));', "    }", "}"],
  });
  const note = explain(files, "Main.java", 6, "(Path", UNREPORTED, "unreported exception IOException; must be caught or declared to be thrown");
  has(note, "Files.readAllLines(...) can throw IOException", "try { ... } catch (IOException e) { ... }", "add throws IOException to the header of main: public static void main(String[] args) throws IOException");
});

test("a throw of a checked exception names its method, and a header that throws a kind of it keeps its other exceptions", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void check(int value) throws IllegalStateException, java.io.FileNotFoundException {", "        if (value < 0) {", '            throw new java.io.IOException("negative");', "        }", "    }", "}"],
  });
  const note = explain(files, "Main.java", 4, "throw", UNREPORTED, "unreported exception IOException; must be caught or declared to be thrown");
  has(note, "check throws IOException here", "public static void check(int value) throws IllegalStateException, IOException", "each call of check must handle it");
});

test("an unreported exception in a lambda, in a constructor, and in a method that replaces an interface's", () => {
  const files = program({
    "Main.java": [
      "import java.io.PrintWriter;",
      "import java.nio.file.Files;",
      "import java.nio.file.Path;",
      "import java.util.List;",
      "",
      "public class Main {",
      "    public static void main(String[] args) throws Exception {",
      '        List.of("a.txt").forEach(name -> Files.writeString(Path.of(name), name));',
      "    }",
      "}",
      "",
      "interface Store {",
      "    void save(String text);",
      "}",
      "",
      "class Report implements Store {",
      "    private PrintWriter writer;",
      "",
      "    public Report(String file) {",
      "        this.writer = new PrintWriter(file);",
      "    }",
      "",
      "    public void save(String text) {",
      '        Files.writeString(Path.of("store.txt"), text);',
      "    }",
      "}",
    ],
  });
  has(explain(files, "Main.java", 8, "(Path", UNREPORTED, "unreported exception IOException; must be caught or declared to be thrown"), "inside a lambda (->)", "throws on main doesn't cover it");
  has(explain(files, "Main.java", 20, "new", UNREPORTED, "unreported exception FileNotFoundException; must be caught or declared to be thrown"), "new PrintWriter(...) can throw FileNotFoundException", "the constructor Report: public Report(String file) throws FileNotFoundException", "the code that creates a Report with new");
  has(explain(files, "Main.java", 24, "(Path", UNREPORTED, "unreported exception IOException; must be caught or declared to be thrown"), "save replaces the method save of Store", "So catch it here", "add throws IOException to save in Store as well");
});

test("catches: never thrown, in the wrong order, a multi-catch of related exceptions, and a try alone", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        try {", '            System.out.println(Integer.valueOf(args[0]));', "        } catch (Exception e) {", '            System.out.println("error");', "        } catch (NumberFormatException e) {", '            System.out.println("not a number");', "        }", "    }", "}"],
  });
  has(explain(files, "Main.java", 7, "catch", "compiler.err.except.already.caught", "exception NumberFormatException has already been caught"), "The catch for Exception above already catches every NumberFormatException", "Put the catch for NumberFormatException before the one for Exception");
  has(explainDiagnostic({ kind: "error", code: "compiler.err.except.never.thrown.in.try", file: "Main.java", line: 5, column: 11, message: "exception IOException is never thrown in body of corresponding try statement", formatted: "" }), "Nothing in this try block can throw IOException", "such as opening, reading or writing a file");
  has(explainDiagnostic({ kind: "error", code: "compiler.err.multicatch.types.must.be.disjoint", file: "Main.java", line: 5, column: 11, message: "Alternatives in a multi-catch statement cannot be related by subclassing\n  Alternative FileNotFoundException is a subclass of alternative IOException", formatted: "" }), "Leave FileNotFoundException out: catch (IOException e)");
  has(explainDiagnostic({ kind: "error", code: "compiler.err.try.without.catch.finally.or.resource.decls", file: "Main.java", line: 3, column: 9, message: "'try' without 'catch', 'finally' or resource declarations", formatted: "" }), "A try block needs a catch or a finally after it");
});

test("throw with text, throw without new, and a line after throw", () => {
  const files = program({
    "Main.java": ["public class Main {", "    static void set(int age) {", "        if (age < 0) {", '            throw "negative";', "        }", '        throw IllegalArgumentException("x");', "    }", "", "    static int half(int v) {", '        throw new IllegalStateException("odd");', "        return v / 2;", "    }", "}"],
  });
  has(explain(files, "Main.java", 4, "throw", "compiler.err.prob.found.req", "incompatible types: String cannot be converted to Throwable"), "throw needs an exception object, not text", 'throw new IllegalArgumentException("...");');
  has(explain(files, "Main.java", 6, "Illegal", "compiler.err.cant.resolve.location.args", "cannot find symbol\n  symbol:   method IllegalArgumentException(String)\n  location: class Main"), "throw new IllegalArgumentException(...);", "Without new");
  has(explain(files, "Main.java", 11, "return", "compiler.err.unreachable.stmt", "unreachable statement"), "The throw just before this line ends the method");
});

test("an overriding method that adds throws, and a catch's variable used after its block", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        try {", '            int n = Integer.valueOf("x");', "        } catch (NumberFormatException e) {", '            System.out.println("bad");', "        }", "        System.out.println(e.getMessage() + n);", "    }", "}", "", "interface Saver {", "    void save(String text);", "}"],
  });
  has(explainDiagnostic({ kind: "error", code: "compiler.err.override.meth.doesnt.throw", file: "Main.java", line: 3, column: 17, message: "save(String) in FileSaver cannot implement save(String) in Saver\n  overridden method does not throw IOException", formatted: "" }, files), "save in FileSaver replaces the method save of the interface Saver", "Catch IOException inside save in FileSaver", "add throws IOException to save in Saver too");
  has(explain(files, "Main.java", 8, "e.get", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   variable e\n  location: class Main"), "e is the exception variable of the catch (NumberFormatException e) above", "only inside that catch block");
  has(explain(files, "Main.java", 8, "n)", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   variable n\n  location: class Main"), "n was created inside the try block above", "for example int n = 0;");
});

const BOOK = ["package library.domain;", "", "public class Book {", "    int pages;", "", "    protected String describe() {", '        return "book";', "    }", "}"];

test("a class of another package without its import gets the import line", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        Book book = new Book();", "    }", "}"],
    "library/domain/Book.java": BOOK,
  });
  has(explain(files, "Main.java", 3, "Book", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   class Book\n  location: class Main"), "Book is in the package library.domain (the file library/domain/Book.java)", "add import library.domain.Book; at the top of Main.java");
});

test("imports of a package or a class that doesn't exist, with near misses", () => {
  const files = program({ "Main.java": ["import libary.domain.Book;", "import library.domain.Bok;", "", "public class Main {", "}"], "library/domain/Book.java": BOOK });
  has(explain(files, "Main.java", 1, ".Book", "compiler.err.doesnt.exist", "package libary.domain does not exist"), "Did you mean library.domain (the folder library/domain/)?");
  has(explain(files, "Main.java", 2, "Bok", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   class Bok\n  location: package library.domain"), "has no class Bok. Did you mean Book?");
});

test("package access and protected access from another package say what the access is and what allows it", () => {
  const files = program({
    "Main.java": ["import library.domain.Book;", "", "public class Main {", "    public static void main(String[] args) {", "        Book book = new Book();", "        System.out.println(book.pages + book.describe());", "    }", "}"],
    "library/domain/Book.java": BOOK,
    "library/logic/RareBook.java": ["package library.logic;", "", "import library.domain.Book;", "", "public class RareBook extends Book {", "    public String compare(Book other) {", "        return other.describe();", "    }", "}"],
  });
  has(explain(files, "Main.java", 6, ".pages", "compiler.err.not.def.public.cant.access", "pages is not public in Book; cannot be accessed from outside package"), "pages has no access word in Book", "only code in Book's own package, library.domain, can use it", "Main.java is in no package");
  has(explain(files, "Main.java", 6, ".describe", "compiler.err.report.access", "describe() has protected access in Book"), "describe() is protected in Book", "and in the classes that extend Book", "Main is neither");
  has(explain(files, "library/logic/RareBook.java", 7, ".describe", "compiler.err.report.access", "describe() has protected access in Book"), "RareBook extends Book, so it can use it on itself", "but not on another Book object");
  has(explain(files, "Main.java", 1, "Book", "compiler.err.not.def.public.cant.access", "Book is not public in library.domain; cannot be accessed from outside package"), "Write public class Book");
});

test("a package line that doesn't match the file's folders is named, since javac doesn't report it", () => {
  const files = program({
    "Main.java": ["import library.domain.Book;", "", "public class Main {", "    public static void main(String[] args) {", "        Book book = new Book();", "    }", "}"],
    "library/domain/Book.java": ["package library;", ...BOOK.slice(1)],
  });
  const access = "cannot access Book\n  bad source file: library/domain/Book.java\n    file does not contain class library.domain.Book\n    Please remove or make sure it appears in the correct subdirectory of the sourcepath.";
  has(explain(files, "Main.java", 1, "Book", "compiler.err.cant.access", access), "that file starts with package library;", "it must start with package library.domain;");
  has(explain(files, "Main.java", 5, "Book", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   class Book\n  location: class Main"), "There is a class Book in library/domain/Book.java", "must start with package library.domain;");
  has(explain(files, "library/domain/Book.java", 3, "class", "compiler.err.duplicate.class", "duplicate class: library.Book"), "must start with package library.domain;", "duplicate class");
});

test("explanations that don't fit fall back to the general ones, as before", () => {
  const files = program({ "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        System.out.println(count);", "    }", "}"] });
  assert.equal(explain(files, "Main.java", 3, "count", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   variable count\n  location: class Main"), "Java doesn't know a variable with this name here. Check the spelling (upper and lower case matter) and that the variable was created before this line, inside the same block { }.");
  assert.equal(explain(files, "Main.java", 3, "System", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   class Scanner\n  location: class Main"), "To use Scanner, import it at the top of the file: import java.util.Scanner;");
});

test("crashes: a value the program's own code refuses names the throw and the call", () => {
  const stderr = 'Exception in thread "main" java.lang.IllegalArgumentException: A price can\'t be negative: -2\n\tat shop.model.Item.setPrice(Item.java:14)\n\tat Main.main(Main.java:6)\n';
  const crash = explainCrash(stderr, ["Main.java", "shop/model/Item.java"]);
  assert.equal(crash.placed, true);
  assert.equal(crash.method, "setPrice");
  has(crash.explanation, "Your own code threw it on purpose, with the throw in setPrice (shop/model/Item.java, line 14)", "the call in main (Main.java, line 6) passed it", "Its message says why: A price can't be negative: -2.");
  const constructor = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: bad\n\tat Person.<init>(Main.java:16)\n\tat Main.main(Main.java:5)\n');
  assert.equal(constructor.method, "the constructor of Person");
  // Thrown by Java's own code: the program didn't throw it itself.
  const library = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: count is negative: -1\n\tat java.base/java.lang.String.repeat(String.java:4639)\n\tat Main.main(Main.java:5)\n');
  assert.equal(library.placed, undefined);
  has(library.explanation, "A method of Java's own, called on this line, refused a value it was given: count is negative: -1.");
  const capacity = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Illegal Capacity: -1\n\tat java.base/java.util.ArrayList.<init>(ArrayList.java:160)\n\tat Main.main(Main.java:5)\n');
  assert.equal(capacity.placed, undefined);
  has(capacity.explanation, "The program created a list with the starting capacity -1", "so it can't be negative");
});

test("crashes: writing into a folder that doesn't exist, reading a file that doesn't, and a cause", () => {
  const write = explainCrash('Exception in thread "main" java.io.FileNotFoundException: reports/summary.txt (No such file or directory)\n\tat java.base/java.io.FileOutputStream.open(FileOutputStream.java:289)\n\tat java.base/java.io.PrintWriter.<init>(PrintWriter.java:207)\n\tat Main.main(Main.java:6)\n');
  has(write.explanation, "tried to write the file reports/summary.txt, but the folder reports doesn't exist", 'Files.createDirectories(Path.of("reports"));');
  const nio = explainCrash('Exception in thread "main" java.nio.file.NoSuchFileException: out/list.txt\n\tat java.base/java.nio.file.Files.newOutputStream(Files.java:228)\n\tat java.base/java.nio.file.Files.write(Files.java:3574)\n\tat Main.main(Main.java:7)\n');
  has(nio.explanation, "the folder out doesn't exist");
  const read = explainCrash('Exception in thread "main" java.lang.RuntimeException: Could not read scores.txt\n\tat Main.read(Main.java:15)\n\tat Main.main(Main.java:8)\nCaused by: java.nio.file.NoSuchFileException: scores.txt\n\tat java.base/java.nio.file.Files.newInputStream(Files.java:160)\n\tat Main.read(Main.java:13)\n\t... 1 more\n');
  assert.equal(read.exception, "NoSuchFileException");
  assert.equal(read.line, 13);
  has(read.explanation, "tried to open a file that doesn't exist: scores.txt");
});

test("an unreported exception in a switch's case -> is in the method, not in a lambda; a lambda inside the case still is one", () => {
  const files = program({
    "Main.java": [
      "import java.nio.file.Files;",
      "import java.nio.file.Path;",
      "import java.util.List;",
      "",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        switch (args.length) {",
      '            case 1 -> Files.readAllLines(Path.of("a.txt"));',
      "            case 2 -> {",
      '                Files.readAllLines(Path.of("b.txt"));',
      "            }",
      '            case 3 -> List.of("c.txt").forEach(n -> Files.readAllLines(Path.of(n)));',
      "            default -> {",
      '                List.of("d.txt").forEach(n -> {',
      "                    Files.readAllLines(Path.of(n));",
      "                });",
      "            }",
      "        }",
      "    }",
      "}",
    ],
  });
  const message = "unreported exception IOException; must be caught or declared to be thrown";
  for (const line of [8, 10]) {
    const note = explain(files, "Main.java", line, "(Path", UNREPORTED, message);
    has(note, "add throws IOException to the header of main: public static void main(String[] args) throws IOException");
    assert.ok(!note.includes("lambda"), note);
  }
  for (const [line, at] of [[12, "(Path.of(n)"], [15, "(Path"]]) has(explain(files, "Main.java", line, at, UNREPORTED, message), "inside a lambda (->)", "throws on main doesn't cover it");
});

test("an unreported exception outside any method: in a field's value, a static block, an instance block, a lambda in a field", () => {
  const files = program({
    "Main.java": [
      "import java.io.IOException;",
      "import java.nio.file.Files;",
      "import java.nio.file.Path;",
      "import java.util.List;",
      "",
      "public class Main {",
      '    static List<String> lines = Files.readAllLines(Path.of("a.txt"));',
      '    List<String> more = Files.readAllLines(Path.of("b.txt"));',
      '    static Runnable r = () -> Files.readAllLines(Path.of("c.txt"));',
      "",
      "    static {",
      "        if (lines.isEmpty()) {",
      '            throw new IOException("empty");',
      "        }",
      "    }",
      "",
      "    {",
      '        Files.readAllLines(Path.of("d.txt"));',
      "    }",
      "}",
    ],
  });
  const message = "unreported exception IOException; must be caught or declared to be thrown";
  const staticField = explain(files, "Main.java", 7, "(Path", UNREPORTED, message);
  has(staticField, "gives a static variable its value, outside any method", "in a static block instead");
  assert.ok(!staticField.includes("the method this code is in"), staticField);
  has(explain(files, "Main.java", 8, "(Path", UNREPORTED, message), "gives an instance variable its value", "add throws IOException to the header of each constructor of Main");
  has(explain(files, "Main.java", 9, "(Path", UNREPORTED, message), "inside a lambda (->)", "Catch it inside the lambda");
  has(explain(files, "Main.java", 13, "throw", UNREPORTED, message), "The throw here throws IOException, a checked exception.", "in a static block (static { ... })", "throw an unchecked exception instead");
  has(explain(files, "Main.java", 18, "(Path", UNREPORTED, message), "in an instance block", "Catch it there: put this code inside try { ... } catch (IOException e) { ... }", "each constructor of Main");
});

test("a catch after its parent's catch names the catch of its own try, not one inside an earlier catch's block", () => {
  const files = program({
    "Main.java": [
      "import java.io.FileNotFoundException;",
      "import java.io.IOException;",
      "",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        try {",
      "            read();",
      "        } catch (IOException e) {",
      "            try {",
      '                Integer.valueOf("x");',
      "            } catch (NumberFormatException n) {",
      '                System.out.println("inner");',
      "            }",
      '        } catch (IllegalStateException e) { System.out.println("state"); } catch (FileNotFoundException e) {',
      '            System.out.println("never");',
      "        } catch (NumberFormatException | FileNotFoundException e) {",
      "        }",
      "    }",
      "}",
    ],
  });
  has(explain(files, "Main.java", 14, "catch (File", "compiler.err.except.already.caught", "exception FileNotFoundException has already been caught"), "The catch for IOException above already catches every FileNotFoundException");
  // In a multi-catch, javac's caret is on the type, inside the catch's parentheses.
  has(explain(files, "Main.java", 16, "FileNotFound", "compiler.err.except.already.caught", "exception FileNotFoundException has already been caught"), "The catch for IOException above already catches every FileNotFoundException");
});

test("a parent's or the same class's constructor called by name: super(...) or this(...), and new elsewhere", () => {
  const files = program({
    "Main.java": [
      "public class Main {",
      "}",
      "",
      "class Person {",
      "    public Person(String name) {",
      "    }",
      "",
      "    public Person() {",
      '        Person("unknown");',
      "    }",
      "}",
      "",
      "class Student extends Person {",
      "    private Person mentor;",
      "",
      "    public Student(String name) {",
      "        Person(name);",
      '        this.mentor = Person("Bob");',
      "    }",
      "",
      "    public Person make() {",
      '        return Person("x");',
      "    }",
      "}",
    ],
  });
  const missing = "cannot find symbol\n  symbol:   method Person(String)\n  location: class ";
  has(explain(files, "Main.java", 17, "Person", "compiler.err.cant.resolve.location.args", missing + "Student"), "To run Person's constructor from Student's, write super(name); as the first line of Student's constructor", "not new Person(name)");
  has(explain(files, "Main.java", 9, "Person", "compiler.err.cant.resolve.location.args", missing + "Person"), 'write this("unknown"); as the constructor\'s first line');
  for (const line of [18, 22]) has(explain(files, "Main.java", line, "Person(", "compiler.err.cant.resolve.location.args", missing + "Student"), "Person is a class: to create an object of it, write new in front");
});

test("a protected constructor used with new: from a subclass in another package, and from elsewhere", () => {
  const files = program({
    "Main.java": ["import shop.model.Item;", "", "public class Main {", "    public static void main(String[] args) {", "        Item item = new Item(4);", "    }", "}"],
    "shop/model/Item.java": ["package shop.model;", "", "public class Item {", "    protected Item(int price) {", "    }", "}"],
    "shop/web/Screen.java": ["package shop.web;", "", "import shop.model.Item;", "", "public class Screen extends Item {", "    public Screen() {", "        super(2);", "    }", "", "    public Item copy() {", "        return new Item(4);", "    }", "}"],
  });
  const sub = explain(files, "shop/web/Screen.java", 11, "new", "compiler.err.report.access", "Item(int) has protected access in Item");
  has(sub, "a class that extends Item, as Screen does, can run it with super(...)", "can't create an Item with new Item(...)", "make the constructor public in Item");
  assert.ok(!sub.includes("neither"), sub);
  has(explain(files, "Main.java", 5, "new", "compiler.err.report.access", "Item(int) has protected access in Item"), "only code in Item's own package, shop.model, can create an Item with it", "Main is outside that package");
});

test("a class of another package that isn't public: the import, and public too", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        Helper h = null;", "        Part p = null;", "    }", "}"],
    "shop/model/Helper.java": ["package shop.model;", "", "interface Helper {", "}", "", "class Part {", "}"],
  });
  const missing = (name) => `cannot find symbol\n  symbol:   class ${name}\n  location: class Main`;
  has(explain(files, "Main.java", 3, "Helper", "compiler.err.cant.resolve.location", missing("Helper")), "add import shop.model.Helper;", "Helper must be public too", "write public interface Helper in shop/model/Helper.java");
  has(explain(files, "Main.java", 4, "Part", "compiler.err.cant.resolve.location", missing("Part")), "add import shop.model.Part;", "move it to shop/model/Part.java, as public class Part");
});

test("crashes with a cause: the code wrapped it, so it's not called uncaught, and a class's set-up is named", () => {
  const wrapped = explainCrash('Exception in thread "main" java.lang.RuntimeException: Could not read -4\n\tat Main.parse(Main.java:7)\n\tat Main.main(Main.java:3)\nCaused by: java.lang.IllegalArgumentException: negative: -4\n\tat Main.check(Main.java:12)\n\tat Main.parse(Main.java:7)\n\t... 1 more\n');
  assert.equal(wrapped.exception, "IllegalArgumentException");
  has(wrapped.explanation, "Your own code threw it on purpose, with the throw in check (Main.java, line 12)", "Your code then threw RuntimeException with it as its cause, and nothing caught that");
  for (const not of ["nothing caught it", "handle it where the call is"]) assert.ok(!wrapped.explanation.includes(not), wrapped.explanation);
  const own = explainCrash('Exception in thread "main" java.lang.RuntimeException: Couldn\'t load\n\tat Main.main(Main.java:6)\nCaused by: BadDataException: bad: x\n\tat Main.load(Main.java:11)\n\tat Main.main(Main.java:4)\n');
  has(own.explanation, "Your own code threw it in load (Main.java, line 11).", "Your code then threw RuntimeException with it as its cause");
  assert.ok(!own.explanation.includes("To handle it"), own.explanation);
  const chain = explainCrash('Exception in thread "main" java.lang.RuntimeException: top\n\tat Main.main(Main.java:6)\nCaused by: java.lang.IllegalStateException: middle\n\tat Main.middle(Main.java:14)\n\tat Main.main(Main.java:4)\nCaused by: java.lang.IllegalArgumentException: negative: -1\n\tat Main.check(Main.java:20)\n\tat Main.middle(Main.java:12)\n\t... 1 more\n');
  has(chain.explanation, "Your code then threw IllegalStateException with it as its cause, in turn the cause of RuntimeException, and nothing caught RuntimeException");
  const setUp = explainCrash('Exception in thread "main" java.lang.ExceptionInInitializerError\n\tat Main.main(Main.java:3)\nCaused by: java.lang.IllegalArgumentException: negative limit: -1\n\tat Config.check(Main.java:12)\n\tat Config.<clinit>(Main.java:8)\n\t... 1 more\n');
  has(setUp.explanation, "This happened while Java set up the class Config", "Java threw ExceptionInInitializerError with it as its cause");
  assert.ok(!setUp.explanation.includes("Your code then"), setUp.explanation);
});

test("writing a file: a missing folder or options without CREATE, and ./ is no folder", () => {
  const nio = (name, line) => explainCrash(`Exception in thread "main" java.nio.file.NoSuchFileException: ${name}\n\tat java.base/java.nio.file.Files.newOutputStream(Files.java:228)\n\tat java.base/java.nio.file.Files.write(Files.java:3505)\n\tat java.base/java.nio.file.Files.writeString(Files.java:3721)\n\tat Main.main(Main.java:${line})\n`);
  has(nio("logs/app.log", 6).explanation, "Either the folder logs doesn't exist", 'Files.createDirectories(Path.of("logs"))', "Or the file doesn't exist yet", "leave out StandardOpenOption.CREATE");
  for (const name of ["./app.log", "app.log"]) {
    const e = nio(name, 6).explanation;
    has(e, "there is no such file yet", "leave out StandardOpenOption.CREATE");
    assert.ok(!e.includes("folder"), e);
  }
});

// ---- Part 12: type parameters, lists and hash maps of your own, Random, two-dimensional arrays ----

const BOX = ["class Box<T> {", "    private T value;", "    public Box(T value) { this.value = value; }", "    public T get() { return this.value; }", "    public void set(T value) { this.value = value; }", "}"];

test("a primitive in angle brackets gets its class, with the type written out", () => {
  const files = program({ "Main.java": ["import java.util.*;", "", "public class Main {", "    public static void main(String[] args) {", "        List<int> numbers = new ArrayList<>();", "        HashMap<String, double> prices = new HashMap<>();", "    }", "}"] });
  has(explain(files, "Main.java", 5, "int>", "compiler.err.type.found.req", "unexpected type\n  required: reference\n  found:    int"), "int is a primitive type", "List<int> isn't allowed", "Use its wrapper class Integer instead: List<Integer>");
  has(explain(files, "Main.java", 6, "double>", "compiler.err.type.found.req", "unexpected type\n  required: reference\n  found:    double"), "HashMap<String, Double>");
});

test("new T[10] and new T() in a generic class, and a static member that uses T", () => {
  const files = program({
    "Main.java": ["class OwnList<T> {", "    private T[] values;", "    private static T last;", "    public OwnList() {", "        this.values = new T[10];", "        T first = new T();", "    }", "    public static T make() {", "        return null;", "    }", "}"],
  });
  has(explain(files, "Main.java", 5, "new", "compiler.err.generic.array.creation", "generic array creation"), "new T[10] isn't allowed", "(T[]) new Object[10]", "unchecked or unsafe operations");
  has(explain(files, "Main.java", 6, "T()", "compiler.err.type.found.req", "unexpected type\n  required: class\n  found:    type parameter T"), "T is a type parameter", "such as String in OwnList<String>", "new T() can't know which class to create");
  has(explain(files, "Main.java", 3, "T last", "compiler.err.non-static.cant.be.ref", "non-static type variable T cannot be referenced from a static context"), "T belongs to each OwnList object", "Remove static");
  has(explain(files, "Main.java", 8, "T make", "compiler.err.non-static.cant.be.ref", "non-static type variable T cannot be referenced from a static context"), "public static <T> T make()");
});

test("a value of the wrong type for a generic class, a class without its type, and Object[] for T[]", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        Box<Integer> box = new Box<>(3);", '        box.set("three");', "        String shown = box.get();", "        Box raw = new Box(5);", "        String text = raw.get();", "    }", "}", ...BOX, "interface Container<T> {", "    void put(T value);", "}", "class Shelf implements Container {", "    public void put(String value) { }", "}", "class Stack<T> {", "    private T[] values;", "    public Stack() {", "        this.values = new Object[4];", "    }", "}"],
  });
  has(explain(files, "Main.java", 4, '"three"', "compiler.err.prob.found.req", "incompatible types: String cannot be converted to Integer"), "box is a Box<Integer>, so its T is Integer: set takes an Integer here", "declare it as Box<String>");
  has(explain(files, "Main.java", 5, "()", "compiler.err.prob.found.req", "incompatible types: Integer cannot be converted to String"), "get() gives an Integer here, not a String");
  has(explain(files, "Main.java", 7, "()", "compiler.err.prob.found.req", "incompatible types: Object cannot be converted to String"), "raw is declared as Box, without a type in angle brackets", "Box<String>");
  has(explain(files, "Main.java", 19, "class", "compiler.err.does.not.override.abstract", "Shelf is not abstract and does not override abstract method put(Object) in Container"), "Shelf implements Container without a type in angle brackets", "implements Container<String>", "the put(String) that Shelf already has");
  has(explain(files, "Main.java", 25, "new", "compiler.err.prob.found.req", "incompatible types: Object[] cannot be converted to T[]"), "(T[]) new Object[4]");
});

test("two-dimensional arrays: a row for a value, a value for a row, brackets missing, an index too many", () => {
  const files = program({
    "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        int[][] grid = new int[3][4];", "        int cell = grid[0];", "        grid[1] = 5;", "        int[] flat = new int[3][4];", "        int deep = grid[1][2][0];", "    }", "}"],
  });
  has(explain(files, "Main.java", 4, "[0]", "compiler.err.prob.found.req", "incompatible types: int[] cannot be converted to int"), "grid[0] is a whole row of it", "grid[0][column]");
  has(explain(files, "Main.java", 5, "5", "compiler.err.prob.found.req", "incompatible types: int cannot be converted to int[]"), "grid[1] is a whole row of grid", "grid[1][column] = ...;");
  has(explain(files, "Main.java", 6, "new", "compiler.err.prob.found.req", "incompatible types: int[][] cannot be converted to int[]"), "new int[3][4] creates a two-dimensional array", "int[][] flat");
  has(explain(files, "Main.java", 7, "[0]", "compiler.err.array.req.but.found", "array required, but int found"), "grid[1][2] is already one int value");
});

test("new Random with text, and javac's note about unchecked operations", () => {
  const files = program({ "Main.java": ["import java.util.Random;", "", "public class Main {", "    public static void main(String[] args) {", '        Random random = new Random("seed");', "    }", "}"] });
  const message = "no suitable constructor found for Random(String)\n    constructor Random.Random(Void) is not applicable\n      (argument mismatch; String cannot be converted to Void)\n    constructor Random.Random(long) is not applicable\n      (argument mismatch; String cannot be converted to long)";
  has(explain(files, "Main.java", 5, "new", "compiler.err.cant.apply.symbols", message), "takes a seed, which must be a whole number", "write the number without quotes", "Random(Void)");
  has(explainDiagnostic({ kind: "note", code: "compiler.note.unchecked.filename", file: "Main.java", line: -1, column: -1, message: "Main.java uses unchecked or unsafe operations.", formatted: "" }), "This is a note, not an error", "(T[]) new Object[10]");
});

const crashIn = (lines, stderr) => explainCrash(stderr, program({ "Main.java": lines }));

test("a grid's index error says which index it was, row or column, and the length", () => {
  const swapped = ["public class Main {", "    public static void main(String[] args) {", "        int[][] grid = new int[3][4];", "        for (int y = 0; y < grid[0].length; y++) {", "            for (int x = 0; x < grid.length; x++) {", "                grid[y][x] = x + y;", "            }", "        }", "    }", "}"];
  let crash = crashIn(swapped, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "In grid[y][x], the first index, y, picks the row, and it was 3: grid has 3 rows", "0 to grid.length - 1, here 0 to 2", "The loops' bounds look swapped");
  const column = ["public class Main {", "    public static void main(String[] args) {", "        int[][] grid = new int[3][4];", "        for (int row = 0; row < grid.length; row++) {", "            for (int col = 0; col <= grid[row].length; col++) {", "                System.out.print(grid[row][col]);", "            }", "        }", "    }", "}"];
  crash = crashIn(column, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "the second index, col, picks the column", "that row has 4 values", "use < instead of <=");
  // Without the file's text, the general note.
  crash = explainCrash('Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 4 out of bounds for length 4\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "The program asked for index 4 of an array of length 4");
});

test("a list of your own: a full array, its own index error, an Object[] given out, a negative size; Random's bound", () => {
  const list = ["public class Main {", "    public static void main(String[] args) {", "        OwnList<String> list = new OwnList<>(-1);", "    }", "}", "class OwnList<T> {", "    private T[] values;", "    private int count;", "    public OwnList(int capacity) {", "        this.values = (T[]) new Object[capacity];", "    }", "    public void add(T value) {", "        this.values[this.count] = value;", "        this.count++;", "    }", "    public T value(int index) {", "        if (index < 0 || index >= this.count) {", '            throw new ArrayIndexOutOfBoundsException("Index " + index + " outside of [0, " + this.count + "]");', "        }", "        return this.values[index];", "    }", "}"];
  let crash = crashIn(list, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 10 out of bounds for length 10\n\tat OwnList.add(Main.java:13)\n\tat Main.main(Main.java:3)\n');
  has(crash.explanation, "the array is full", "when count reaches values.length, create a bigger array");
  crash = crashIn(list, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 outside of [0, 1]\n\tat OwnList.value(Main.java:18)\n\tat Main.main(Main.java:3)\n');
  assert.equal(crash.placed, true);
  has(crash.explanation, "Your own code threw it on purpose, with the throw in value (Main.java, line 18): the call in main (Main.java, line 3) asked for an index that value doesn't accept", "Index 3 outside of [0, 1].");
  crash = crashIn(list, 'Exception in thread "main" java.lang.NegativeArraySizeException: -1\n\tat OwnList.<init>(Main.java:10)\n\tat Main.main(Main.java:3)\n');
  has(crash.explanation, "an array of size -1 (new Object[capacity])", "from the call in main (Main.java, line 3)");
  crash = explainCrash("Exception in thread \"main\" java.lang.ClassCastException: class [Ljava.lang.Object; cannot be cast to class [Ljava.lang.String; ([Ljava.lang.Object; and [Ljava.lang.String; are in module java.base of loader 'bootstrap')\n\tat Main.main(Main.java:5)\n");
  has(crash.explanation, "an Object[], as a String[]", "(T[]) new Object[...]", "give one value at a time");
  const random = ["import java.util.*;", "public class Main {", "    public static void main(String[] args) {", "        List<String> names = new ArrayList<>();", "        System.out.println(names.get(new Random(1).nextInt(names.size())));", "    }", "}"];
  crash = crashIn(random, 'Exception in thread "main" java.lang.IllegalArgumentException: bound must be positive\n\tat java.base/java.util.Random.nextInt(Random.java:557)\n\tat Main.main(Main.java:5)\n');
  has(crash.explanation, "nextInt(bound) gives a random number from 0 up to bound - 1", "Here the bound is names.size(), so the list was empty");
});

const lacks = (text, ...parts) => {
  for (const p of parts) assert.ok(!text?.includes(p), `unexpected ${JSON.stringify(p)} in: ${text}`);
};
const GENERIC_ARRAY = ["compiler.err.generic.array.creation", "generic array creation"];

test("generic array creation: a class inside a generic class, type parameters of outer classes and methods, a local class", () => {
  const files = program({
    "Main.java": [
      "class OwnMap<K, V> {",
      "    class Node {",
      "        K key;",
      "        V value;",
      "        Node next;",
      "    }",
      "    private Node[] buckets;",
      "    public OwnMap() {",
      "        this.buckets = new Node[16];",
      "    }",
      "}",
      "class OwnList<T> {",
      "    private T[] values;",
      "    class Snapshot {",
      "        T[] copy() {",
      "            T[] result = new T[values.length];",
      "            return result;",
      "        }",
      "    }",
      "    <E> OwnList(E first) {",
      "        E[] firsts = new E[3];",
      "    }",
      "    void fill() {",
      "        class Local {",
      "            T item;",
      "        }",
      "        Local[] locals = new Local[3];",
      "    }",
      "}",
    ],
  });
  const node = explain(files, "Main.java", 9, "new", ...GENERIC_ARRAY);
  has(node, "Node is a class inside the generic class OwnMap<K, V>, and it isn't static, so it's generic too", "new OwnMap.Node[16]", "static class Node<K, V>", "Node<K, V> next", "Node<K, V>[] buckets");
  lacks(node, "type parameter, and", "new Object");
  has(explain(files, "Main.java", 16, "new", ...GENERIC_ARRAY), "T is a type parameter", "(T[]) new Object[values.length]");
  has(explain(files, "Main.java", 21, "new", ...GENERIC_ARRAY), "E is a type parameter", "(E[]) new Object[3]");
  const local = explain(files, "Main.java", 27, "new", ...GENERIC_ARRAY);
  has(local, "Local is a class declared inside a method of the generic class OwnList<T>", "ArrayList<Local>");
  lacks(local, "static class", "new Object");
});

test("generic array creation keeps every pair of brackets, sizes with brackets of their own, and initializers", () => {
  const files = program({
    "Main.java": [
      "import java.util.ArrayList;",
      "class Grid<T> {",
      "    private T[][] cells;",
      "    Grid(int rows, int cols, T[][] grid) {",
      "        this.cells = new T[rows][cols];",
      "        this.cells = new T[grid.length][grid[0].length];",
      "        this.cells = new T[rows][];",
      "        T[] none = new T[]{};",
      "        ArrayList<String>[][] table = new ArrayList<String>[rows][cols];",
      "    }",
      "}",
    ],
  });
  has(explain(files, "Main.java", 5, "new", ...GENERIC_ARRAY), "new T[rows][cols] isn't allowed", "(T[][]) new Object[rows][cols]");
  has(explain(files, "Main.java", 6, "new", ...GENERIC_ARRAY), "new T[grid.length][grid[0].length] isn't allowed", "(T[][]) new Object[grid.length][grid[0].length]");
  has(explain(files, "Main.java", 7, "new", ...GENERIC_ARRAY), "(T[][]) new Object[rows][]");
  const init = explain(files, "Main.java", 8, "new", ...GENERIC_ARRAY);
  has(init, "(T[]) new Object[] { ... }");
  lacks(init, "new Object[].");
  has(explain(files, "Main.java", 9, "new", ...GENERIC_ARRAY), "Create it without them, new ArrayList[rows][cols]", "ArrayList<String>[][] can still hold it");
});

test("a static class inside a generic class doesn't see its type parameter", () => {
  const STATIC = ["compiler.err.non-static.cant.be.ref"];
  const message = (t) => `non-static type variable ${t} cannot be referenced from a static context`;
  const files = program({
    "Main.java": [
      "class OwnList<T> {",
      "    private static class Node {",
      "        T value;",
      "        Node next;",
      "        static void show(T shown) {",
      "        }",
      "    }",
      "    private Node head;",
      "    public void add(T value) {",
      "        this.head = new Node();",
      "    }",
      "}",
      "class OwnMap<K, V> {",
      "    private record Entry(K key, V value) {",
      "    }",
      "    private Entry first;",
      "}",
    ],
  });
  const node = explain(files, "Main.java", 3, "T value", ...STATIC, message("T"));
  has(node, "T belongs to each OwnList object", "Node is a static class", "remove static from Node's header", "private static class Node<T>", "Node<T> head", "new Node<>(...)");
  lacks(node, "Node object: it's chosen", "new Node<String>()", "inside a static method");
  has(explain(files, "Main.java", 5, "T shown", ...STATIC, message("T")), "Node is a static class", "show is static itself", "static <T> void show(T shown)");
  const entry = explain(files, "Main.java", 14, "K key", ...STATIC, message("K"));
  has(entry, "K belongs to each OwnMap object", "as in new OwnMap<String, Integer>()", "a record inside a class is always static", "private record Entry<K, V>(K key, V value)", "Entry<K, V> first");
  lacks(entry, "remove static");
});

test("a value of the wrong type for a generic class: the type argument of the method's parameter, and Java's own maps", () => {
  const files = program({
    "Main.java": [
      "import java.util.*;",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        Map<String, String> names = new HashMap<>();",
      '        names.put("a", 5);',
      "        Pair<Integer, Integer> pair = new Pair<>(1, 2);",
      '        pair.setSecond("x");',
      '        Box<String> box = new Box<>("a");',
      "        box.setLabel(5);",
      "        Integer shown = box.getLabel();",
      "    }",
      "}",
      "class Pair<K, V> {",
      "    Pair(K first, V second) { }",
      "    void setSecond(V second) { }",
      "}",
      "class Box<T> {",
      "    Box(T value) { }",
      '    String getLabel() { return "box"; }',
      "    void setLabel(String label) { }",
      "}",
    ],
  });
  const wrong = (line, at, from, to) => explain(files, "Main.java", line, at, "compiler.err.prob.found.req", `incompatible types: ${from} cannot be converted to ${to}`);
  has(wrong(5, "5)", "int", "String"), "put takes a String here as the value", "declare it as Map<String, Integer>");
  has(wrong(7, '"x"', "String", "Integer"), "its V is Integer", "declare it as Pair<Integer, String>");
  const label = wrong(9, "5)", "int", "String");
  has(label, "setLabel takes a String here (its parameter is declared as String in Box)");
  lacks(label, "declare it as", "its T is");
  lacks(wrong(10, "()", "String", "Integer"), "write Integer in its angle brackets");
});

test("a variable without its types in angle brackets: maps have keys and values, and a method that gives Object isn't the type parameter", () => {
  const files = program({
    "Main.java": [
      "import java.util.*;",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        HashMap names = new HashMap();",
      '        String one = names.get("a");',
      "        for (String key : names.keySet()) {",
      "        }",
      '        Pair pair = new Pair("a", 1);',
      "        String described = pair.describe();",
      "        Labelled labelled = new Labelled();",
      "        String label = labelled.label();",
      "    }",
      "}",
      "class Pair<K, V> {",
      "    Pair(K key, V value) { }",
      '    Object describe() { return ""; }',
      "}",
      "class Base {",
      '    public Object label() { return "x"; }',
      "}",
      "class Labelled<T> extends Base {",
      "}",
    ],
  });
  const raw = (line, at, to = "String") => explain(files, "Main.java", line, at, "compiler.err.prob.found.req", `incompatible types: Object cannot be converted to ${to}`);
  has(raw(5, '("a")'), "without types in angle brackets", "HashMap<..., String> (with the type of its keys in place of ...)");
  const keys = raw(6, "())");
  has(keys, "its keys are Objects for Java", "HashMap<String, ...> (with the type of its values in place of ...)", "Then its keys are String objects");
  lacks(keys, "its values are");
  lacks(raw(9, "()"), "Pair<", "Then describe() gives");
  lacks(raw(11, "()"), "Labelled<String>");
  has(raw(11, "()"), "A value of type Object could be any object, so Java won't put it in a String variable");
});

test("a class that implements a generic interface without a type and lacks its method is told to add it", () => {
  const files = program({
    "Main.java": ["interface Container<T> {", "    void put(T value);", "}", "class Drawer implements Container {", "}", "class Shelf implements Container {", "    public void put(String value, int count) { }", "}"],
  });
  const missing = (line, cls) => explain(files, "Main.java", line, "class", "compiler.err.does.not.override.abstract", `${cls} is not abstract and does not override abstract method put(Object) in Container`);
  has(missing(4, "Drawer"), "in place of T in implements Container<T> (such as implements Container<String>)", "Then add put to Drawer", "public void put(String value) { ... }");
  const shelf = missing(6, "Shelf");
  has(shelf, "Then add put to Shelf");
  lacks(shelf, "already has", "....");
});

test("an Object where a type parameter is wanted: an Object[] field, a raw list, a parameter declared as Object", () => {
  const files = program({
    "Main.java": [
      "import java.util.*;",
      "class Store<T> {",
      "    private Object[] values = new Object[10];",
      "    private ArrayList raw = new ArrayList();",
      "    public T value(int index) {",
      "        return this.values[index];",
      "    }",
      "    public T first() {",
      "        return raw.get(0);",
      "    }",
      "    public void put(Object value) {",
      "        T t = value;",
      "    }",
      "}",
    ],
  });
  const object = (line, at) => explain(files, "Main.java", line, at, "compiler.err.prob.found.req", "incompatible types: Object cannot be converted to T");
  has(object(6, "[index]"), "values is an Object[]", "Declare values as a T[] instead", "(T[]) new Object[10]");
  has(object(9, "(0)"), "raw is declared as ArrayList, without a type in angle brackets", "ArrayList<T>");
  has(object(12, "value;"), "value is declared as Object", "Declare value as T instead");
});

test("an index error at the length: a loop with <= is one past the end, a list of your own is full", () => {
  const whileLoop = ["public class Main {", "    public static void main(String[] args) {", "        int[] squares = new int[5];", "        int i = 0;", "        while (i <= squares.length) {", "            squares[i] = i * i;", "            i++;", "        }", "    }", "}"];
  let crash = crashIn(whileLoop, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 5 out of bounds for length 5\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "Index 5 is one past the end: a loop with <= length instead of < length");
  lacks(crash.explanation, "the array is full");
  const stack = ["public class Main {", "    public static void main(String[] args) {", "        Stack stack = new Stack();", "        int count = 1;", "        while (count <= 12) {", "            stack.put(count);", "            count++;", "        }", "    }", "}", "class Stack {", "    private int[] values = new int[10];", "    private int count;", "    public void put(int value) {", "        this.values[this.count] = value;", "        this.count++;", "    }", "}"];
  crash = crashIn(stack, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 10 out of bounds for length 10\n\tat Stack.put(Main.java:15)\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "the array is full", "when count reaches values.length");
});

test("an index error raised inside a throw's message isn't one the code threw on purpose", () => {
  const limits = ["public class Main {", "    public static void main(String[] args) {", "        check(5, new int[0]);", "    }", "    static void check(int value, int[] limits) {", "        if (value > 3) {", '            throw new IllegalArgumentException("Over the limit " + limits[0]);', "        }", "    }", "}"];
  let crash = crashIn(limits, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 0 out of bounds for length 0\n\tat Main.check(Main.java:7)\n\tat Main.main(Main.java:3)\n');
  assert.equal(crash.placed, undefined);
  has(crash.explanation, "an empty array");
  const seat = ["public class Main {", "    static class SeatIndexOutOfBoundsException extends IndexOutOfBoundsException {", "        SeatIndexOutOfBoundsException(String message) {", "            super(message);", "        }", "    }", "    public static void main(String[] args) {", "        seat(12);", "    }", "    static void seat(int number) {", "        if (number > 10) {", '            throw new SeatIndexOutOfBoundsException("No seat " + number);', "        }", "    }", "}"];
  crash = crashIn(seat, 'Exception in thread "main" Main$SeatIndexOutOfBoundsException: No seat 12\n\tat Main.seat(Main.java:12)\n\tat Main.main(Main.java:8)\n');
  assert.equal(crash.placed, true);
  has(crash.explanation, "Your own code threw it on purpose, with the throw in seat (Main.java, line 12)");
});

test("a negative array size names the caller only when the size is a whole-number parameter", () => {
  const parse = ["public class Main {", "    public static void main(String[] args) {", '        int[] numbers = parse("-3");', "        int[] more = make(0);", "    }", "    static int[] parse(String text) {", "        return new int[Integer.valueOf(text)];", "    }", "    static int[] make(int count) {", "        return new int[count - 1];", "    }", "}"];
  let crash = crashIn(parse, 'Exception in thread "main" java.lang.NegativeArraySizeException: -3\n\tat Main.parse(Main.java:7)\n\tat Main.main(Main.java:3)\n');
  has(crash.explanation, "(new int[Integer.valueOf(text)])", "Check where the size comes from");
  lacks(crash.explanation, "from the call in main");
  crash = crashIn(parse, 'Exception in thread "main" java.lang.NegativeArraySizeException: -1\n\tat Main.make(Main.java:10)\n\tat Main.main(Main.java:4)\n');
  has(crash.explanation, "The size is worked out from count, which came to make (Main.java, line 10) from the call in main (Main.java, line 4)");
});

test("a grid's index error: another method's array of the same name doesn't decide row or column, and <= is named", () => {
  const other = ["public class Main {", "    public static void main(String[] args) {", "        int[][] grid = new int[4][2];", "        int[][] other = new int[2][4];", "        System.out.println(get(other, 3, 0));", "    }", "    static int get(int[][] grid, int y, int x) {", "        return grid[y][x];", "    }", "}"];
  let crash = crashIn(other, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 2\n\tat Main.get(Main.java:8)\n\tat Main.main(Main.java:5)\n');
  has(crash.explanation, "grid[y][x] has two indexes");
  lacks(crash.explanation, "the second index, x, picks the column");
  const diagonal = ["public class Main {", "    public static void main(String[] args) {", "        int[][] grid = new int[3][3];", "        int sum = 0;", "        for (int i = 0; i <= grid.length; i++) {", "            sum += grid[i][i];", "        }", "    }", "}"];
  crash = crashIn(diagonal, 'Exception in thread "main" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat Main.main(Main.java:6)\n');
  has(crash.explanation, "Index 3 is one past the end: a loop with <= length instead of < length");
});

test("a negative capacity names the class that was created, and an array created as Object[] and cast", () => {
  let crash = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Illegal initial capacity: -1\n\tat java.base/java.util.HashMap.<init>(HashMap.java:447)\n\tat java.base/java.util.HashMap.<init>(HashMap.java:470)\n\tat java.base/java.util.HashSet.<init>(HashSet.java:154)\n\tat Main.main(Main.java:5)\n');
  has(crash.explanation, "The program created a set with the starting capacity -1", "new HashSet<>(...)");
  crash = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Illegal Capacity: -1\n\tat java.base/java.util.Hashtable.<init>(Hashtable.java:188)\n\tat java.base/java.util.Hashtable.<init>(Hashtable.java:209)\n\tat Main.main(Main.java:5)\n');
  has(crash.explanation, "a map", "new Hashtable<>(...)");
  const cce = (to) => `Exception in thread "main" java.lang.ClassCastException: class [Ljava.lang.Object; cannot be cast to class ${to} (...)\n`;
  crash = crashIn(["public class Main {", "    public static void main(String[] args) {", "        String[] names = (String[]) new Object[3];", "    }", "}"], `${cce("[Ljava.lang.String;")}\tat Main.main(Main.java:3)\n`);
  has(crash.explanation, "An array keeps the type it was created with", "new String[3]");
  lacks(crash.explanation, "generic class", "give one value at a time");
  const map = ["public class Main {", "    public static void main(String[] args) {", "        new OwnMap<String, Integer>();", "    }", "}", "class OwnMap<K, V> {", "    class Node {", "        K key;", "    }", "    private Node[] buckets;", "    public OwnMap() {", "        this.buckets = (Node[]) new Object[16];", "    }", "}"];
  crash = crashIn(map, `${cce("[LOwnMap$Node;")}\tat OwnMap.<init>(Main.java:12)\n\tat Main.main(Main.java:3)\n`);
  has(crash.explanation, "new OwnMap.Node[16]");
  const sorted = ["public class Main {", "    public static void main(String[] args) {", "        new Sorted<String>();", "    }", "}", "class Sorted<T extends Comparable<T>> {", "    private T[] items;", "    Sorted() {", "        this.items = (T[]) new Object[4];", "    }", "}"];
  crash = crashIn(sorted, `${cce("[Ljava.lang.Comparable;")}\tat Sorted.<init>(Main.java:9)\n\tat Main.main(Main.java:3)\n`);
  has(crash.explanation, "T extends Comparable", "(T[]) new Comparable[4]");
});

// ---- Part 13: JavaFX, with Java Arena's practice version of it (engine/libraries/javafx) ----

const FX_IMPORTS = ["import javafx.application.Application;", "import javafx.scene.Scene;", "import javafx.scene.control.Button;", "import javafx.scene.control.Label;", "import javafx.scene.control.TextField;", "import javafx.scene.layout.GridPane;", "import javafx.scene.layout.VBox;", "import javafx.stage.Stage;"];
/** A JavaFX program: the imports above, then a class Main extends Application whose start holds `body`. */
const fxProgram = (body, { imports = FX_IMPORTS, header = "public class Main extends Application {", extra = [] } = {}) =>
  program({ "Main.java": [...imports, "", header, "    @Override", "    public void start(Stage stage) {", ...body.map((l) => `        ${l}`), "    }", ...extra, "}"] });
/** The line of a file that holds some text (1-based). */
const lineOf = (files, text, file = "Main.java") => files.find((f) => f.path === file).text.split("\n").findIndex((l) => l.includes(text)) + 1;
/** The explanation of javac's diagnostic on the line that holds `text`, with the caret where `at` starts. */
const fxExplain = (files, text, at, code, message) => explain(files, "Main.java", lineOf(files, text), at, code, message);
const NOT_FOUND = "compiler.err.cant.resolve.location";
const NOT_FOUND_CALL = "compiler.err.cant.resolve.location.args";

test("a JavaFX class without its import gets the exact import line, and a star import of another package is named", () => {
  const files = fxProgram(['Button button = new Button("Add");', "VBox box = new VBox(10, button);", "box.setPadding(new Insets(10));", "box.setAlignment(Pos.CENTER);", "button.setOnAction((ActionEvent e) -> box.setDisable(true));"], {
    imports: ["import javafx.application.Application;", "import javafx.scene.control.*;", "import javafx.stage.Stage;"],
  });
  has(fxExplain(files, "VBox box", "VBox", NOT_FOUND, "cannot find symbol\n  symbol:   class VBox\n  location: class Main"), "import javafx.scene.layout.VBox;", "(import javafx.scene.control.*; covers only javafx.scene.control itself, not javafx.scene.layout.)");
  has(fxExplain(files, "Insets", "Insets", NOT_FOUND, "cannot find symbol\n  symbol:   class Insets\n  location: class Main"), "To use Insets, import it at the top of the file: import javafx.geometry.Insets;");
  has(fxExplain(files, "Pos.CENTER", "Pos", NOT_FOUND, "cannot find symbol\n  symbol:   variable Pos\n  location: class Main"), "import javafx.geometry.Pos;");
  has(fxExplain(files, "ActionEvent", "ActionEvent", NOT_FOUND, "cannot find symbol\n  symbol:   class ActionEvent\n  location: class Main"), "import javafx.event.ActionEvent;");
  // In a class's header (extends Application) javac names no location.
  const header = program({ "Main.java": ["import javafx.stage.Stage;", "", "public class Main extends Application {", "}"] });
  has(explain(header, "Main.java", 3, "Application", "compiler.err.cant.resolve", "cannot find symbol\n  symbol: class Application"), "import javafx.application.Application;");
  // Node is a word of its own too: only a program that uses JavaFX means JavaFX's Node.
  const list = program({ "Main.java": ["public class Main {", "    private Node first;", "}"] });
  lacks(explain(list, "Main.java", 2, "Node", NOT_FOUND, "cannot find symbol\n  symbol:   class Node\n  location: class Main"), "javafx");
  // A list of the program's own Node class: a value of the wrong type is about that list, not about panes.
  const nodes = program({ "Main.java": ["import java.util.ArrayList;", "import java.util.List;", "", "public class Main {", "    public static void main(String[] args) {", "        List<Node> nodes = new ArrayList<>();", "        nodes.add(5);", "    }", "}", "class Node {", "}"] });
  lacks(explain(nodes, "Main.java", 7, "5)", "compiler.err.cant.apply.symbols", "incompatible types: int cannot be converted to Node"), "pane", "JavaFX");
});

test("a JavaFX class, package or method that the practice version doesn't have says so, without denying real JavaFX has it", () => {
  const files = fxProgram(['CheckBox box = new CheckBox("Ready");', "Buton add = null;", 'Button button = new Button("Add");', "button.setOnKeyPressed(e -> button.setText(\"x\"));", "button.setOnAcion(e -> button.setText(\"y\"));", "button.setMinWidth(100);"], {
    imports: ["import javafx.application.Application;", "import javafx.scene.control.*;", "import javafx.scene.shape.Rectangle;", "import javafx.scene.contol.Label;", "import javafx.scene.layout.Button;", "import javafx.stage.Stage;"],
  });
  const checkBox = fxExplain(files, "CheckBox box", "CheckBox", NOT_FOUND, "cannot find symbol\n  symbol:   class CheckBox\n  location: class Main");
  has(checkBox, "CheckBox is part of real JavaFX (javafx.scene.control.CheckBox), but Java Arena's practice version of JavaFX doesn't have it: it has only the classes and methods its lessons use.", "Its controls are Label, Button, TextField, PasswordField, TextArea and Slider.");
  has(fxExplain(files, "Buton", "Buton", NOT_FOUND, "cannot find symbol\n  symbol:   class Buton\n  location: class Main"), "Did you mean Button?");
  has(fxExplain(files, "shape", "Rectangle", "compiler.err.doesnt.exist", "package javafx.scene.shape does not exist"), "Rectangle (javafx.scene.shape.Rectangle) is part of real JavaFX, but Java Arena's practice version of JavaFX doesn't have the package javafx.scene.shape", "use a Canvas and its GraphicsContext");
  has(fxExplain(files, "contol", "Label", "compiler.err.doesnt.exist", "package javafx.scene.contol does not exist"), "Did you mean javafx.scene.control?", "import javafx.scene.control.Label;");
  has(fxExplain(files, "layout.Button", "Button", NOT_FOUND, "cannot find symbol\n  symbol:   class Button\n  location: package javafx.scene.layout"), "Button isn't in javafx.scene.layout: it's in javafx.scene.control. Write import javafx.scene.control.Button;");
  const keys = fxExplain(files, "setOnKeyPressed", ".setOnKeyPressed", NOT_FOUND_CALL, 'cannot find symbol\n  symbol:   method setOnKeyPressed((e)->butt[...]("x"))\n  location: variable button of type Button');
  has(keys, "Java Arena's practice version of JavaFX has no setOnKeyPressed: of the events, it has setOnAction", "setOnMouseClicked", "are part of real JavaFX but not of this version", "To react to a click, use button.setOnAction(e -> ...).");
  has(fxExplain(files, "setOnAcion", ".setOnAcion", NOT_FOUND_CALL, 'cannot find symbol\n  symbol:   method setOnAcion((e)->butt[...]("y"))\n  location: variable button of type Button'), "Did you mean setOnAction?");
  has(fxExplain(files, "setMinWidth", ".setMinWidth", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method setMinWidth(int)\n  location: variable button of type Button"), "Java Arena's practice version of JavaFX has no method setMinWidth(...) in Button: it has only the classes and methods its lessons use", "setOnAction");
  // A program that doesn't use JavaFX: CheckBox may be anything.
  const plain = program({ "Main.java": ["public class Main {", "    private CheckBox box;", "}"] });
  assert.equal(explain(plain, "Main.java", 2, "CheckBox", NOT_FOUND, "cannot find symbol\n  symbol:   class CheckBox\n  location: class Main"), "Java doesn't know a class with this name. Check the spelling and capital letters, and whether it needs an import at the top of the file.");
});

test("launch with a class that doesn't extend Application, and a class that extends it without start(Stage)", () => {
  const helper = program({ "Main.java": ["import javafx.application.Application;", "", "public class Main {", "    public static void main(String[] args) {", "        Application.launch(Main.class, args);", "        launch(args);", "    }", "}"] });
  const launchMessage = "no suitable method found for launch(Class<Main>,String[])\n    method Application.launch(Class<? extends Application>,String...) is not applicable\n      (argument mismatch; Class<Main> cannot be converted to Class<? extends Application>)\n    method Application.launch(String...) is not applicable\n      (varargs mismatch; Class<Main> cannot be converted to String)";
  has(explain(helper, "Main.java", 5, ".launch", "compiler.err.cant.apply.symbols", launchMessage), "launch(Main.class) starts Main as a JavaFX program, so Main must extend Application, and it doesn't", "public class Main extends Application");
  has(explain(helper, "Main.java", 6, "launch", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method launch(String[])\n  location: class Main"), "launch is a method of Application, and Main doesn't extend Application");
  const two = program({ "Main.java": ["import javafx.application.Application;", "", "public class Main {", "    public static void main(String[] args) {", "        launch(args);", "    }", "}", "class App extends Application {", "    public void Start(javafx.stage.Stage stage) {", "    }", "}"] });
  has(explain(two, "Main.java", 5, "launch", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method launch(String[])\n  location: class Main"), "To start App, the class that extends Application, write Application.launch(App.class, args)");
  const abstractStart = "App is not abstract and does not override abstract method start(Stage) in Application";
  has(explain(two, "Main.java", 8, "class", "compiler.err.does.not.override.abstract", abstractStart), "App has a method Start, but JavaFX calls only a method named exactly start", "rename Start to start");
  const noStart = program({ "Main.java": ["import javafx.application.Application;", "", "public class Main extends Application {", "}"] });
  has(explain(noStart, "Main.java", 3, "Main", "compiler.err.does.not.override.abstract", "Main is not abstract and does not override abstract method start(Stage) in Application"), "Main extends Application, so it must have the method start", "@Override public void start(Stage stage) { ... } (with import javafx.stage.Stage;)");
  // @Override start(Stage) in a class that doesn't extend Application.
  const separate = fxProgram(["stage.show();"], { header: "public class Main {" });
  has(explain(separate, "Main.java", lineOf(separate, "@Override"), "@Override", "compiler.err.method.does.not.override.superclass", "method does not override or implement a method from a supertype"), "start(Stage) is the method JavaFX calls in a class that extends Application, and Main doesn't extend Application", "Write public class Main extends Application.");
});

test("start, init and stop may pass a checked exception on, since Application's say throws Exception", () => {
  const files = fxProgram(['Label label = new Label(Files.readString(Path.of("note.txt")));', "stage.show();"], { imports: ["import java.nio.file.Files;", "import java.nio.file.Path;", ...FX_IMPORTS] });
  const note = fxExplain(files, "readString", "(Path", UNREPORTED, "unreported exception IOException; must be caught or declared to be thrown");
  has(note, "Application's start says throws Exception, so start may say so too: add throws IOException to the header of start: public void start(Stage stage) throws IOException", 'JavaFX prints "Exception in Application start method"');
  lacks(note, "can't pass IOException on");
});

test("an event handler or a change listener that changes a local variable: keep the value in an instance variable", () => {
  const files = fxProgram(['Button button = new Button("Add");', "int clicks = 0;", "button.setOnAction(e -> {", "    clicks++;", '    button.setText("Clicks: " + clicks);', "});", 'String text = "";', "TextField field = new TextField();", "field.textProperty().addListener((change, oldValue, newValue) -> {", "    text = newValue;", "});"]);
  const lambda = "local variables referenced from a lambda expression must be final or effectively final";
  const handler = fxExplain(files, "clicks++", "clicks", "compiler.err.cant.ref.non.effectively.final.var", lambda);
  has(handler, "clicks is a local variable of start, and the event handler given to setOnAction changes it", "declare private int clicks = 0; in the class, outside start, and remove int clicks = 0; from start");
  lacks(handler, "stream", "for-each");
  has(fxExplain(files, '"Clicks: "', "clicks)", "compiler.err.cant.ref.non.effectively.final.var", lambda), "an instance variable");
  has(fxExplain(files, "text = newValue", "text", "compiler.err.cant.ref.non.effectively.final.var", lambda), "the change listener given to addListener changes it", 'declare private String text = ""; in the class');
  // An inner class new EventHandler<ActionEvent>() { ... }.
  const inner = fxProgram(['Button button = new Button("Add");', "int clicks = 0;", "button.setOnAction(new EventHandler<ActionEvent>() {", "    @Override", "    public void handle(ActionEvent event) {", "        clicks = clicks + 1;", "    }", "});"], { imports: [...FX_IMPORTS, "import javafx.event.ActionEvent;", "import javafx.event.EventHandler;"] });
  has(fxExplain(inner, "clicks = clicks + 1", "clicks", "compiler.err.cant.ref.non.effectively.final.var", "local variables referenced from an inner class must be final or effectively final"), "the event handler given to setOnAction changes it: code in an inner class can only use", "private int clicks = 0;");
  // A handler that only uses a variable that changes elsewhere: copy it, as before.
  const copy = fxProgram(['Button button = new Button("Add");', 'String message = "Hello";', 'message = message + "!";', "button.setOnAction(e -> button.setText(message));"]);
  has(fxExplain(copy, "setText(message)", "message)", "compiler.err.cant.ref.non.effectively.final.var", lambda), "String messageCopy = message;");
});

test("a handler with the wrong number of parameters, code that runs right away, and a value that isn't a handler", () => {
  const files = fxProgram(['Button button = new Button("Add");', "TextField field = new TextField();", 'button.setOnAction(() -> button.setText("x"));', "field.textProperty().addListener((change, newValue) -> button.setText(newValue));", 'button.setOnAction(button.setText("y"));', 'button.setOnAction("label");', "button.setOnAction(this::handle);"], { extra: ["", "    private void handle() {", "    }"] });
  const params = "incompatible types: incompatible parameter types in lambda expression";
  has(fxExplain(files, "() ->", '("x")', "compiler.err.cant.apply.symbol", params), "setOnAction needs an event handler: a lambda with one parameter, the event", "This lambda has none", 'e -> button.setText("x")');
  has(fxExplain(files, "(change, newValue)", "(change", "compiler.err.cant.apply.symbol", params), "addListener needs a change listener: a lambda with three parameters", "(change, oldValue, newValue) -> button.setText(newValue)");
  const followOn = "incompatible types: T cannot be converted to String\n  where T is a type-variable:\n    T extends Object declared in interface ObservableValue";
  has(fxExplain(files, "(change, newValue)", "newValue))", "compiler.err.cant.apply.symbol", followOn), "This error follows from the listener's parameters");
  has(fxExplain(files, 'setText("y")', '("y")', "compiler.err.void.not.allowed.here", "'void' type not allowed here"), "setOnAction takes an event handler: code to run later, each time button is clicked", 'button.setOnAction(e -> button.setText("y"));');
  has(fxExplain(files, 'setOnAction("label")', '"label"', "compiler.err.cant.apply.symbol", "incompatible types: String cannot be converted to EventHandler<ActionEvent>"), '"label" is a String, not code to run');
  const reference = "incompatible types: invalid method reference\n    method handle in class Main cannot be applied to given types\n      required: no arguments\n      found:    ActionEvent\n      reason: actual and formal argument lists differ in length";
  has(fxExplain(files, "this::handle", "this::handle", "compiler.err.cant.apply.symbol", reference), "but handle takes no parameters", "private void handle(ActionEvent event)", "button.setOnAction(e -> handle());");
});

test("the children list: add with several nodes, a GridPane's cell, other kinds of list, setScene and setText with the wrong value", () => {
  const files = fxProgram(['Button button = new Button("Add");', 'Label label = new Label("0");', "VBox box = new VBox();", "box.getChildren().add(button, label);", "GridPane grid = new GridPane();", "grid.getChildren().add(button, 0, 0);", "ArrayList<Node> list = box.getChildren();", "List<Button> buttons = box.getChildren();", "stage.setScene(box);", "label.setText(5);", "button.getChildren().add(label);", "box.add(label);"], { imports: [...FX_IMPORTS, "import javafx.scene.Node;", "import java.util.ArrayList;", "import java.util.List;"] });
  has(fxExplain(files, "add(button, label)", "button,", "compiler.err.cant.apply.symbols", "incompatible types: Button cannot be converted to int"), "use addAll: box.getChildren().addAll(button, label)");
  const cell = "no suitable method found for add(Button,int,int)\n    method List.add(Node) is not applicable\n      (actual and formal argument lists differ in length)\n    method List.add(int,Node) is not applicable\n      (actual and formal argument lists differ in length)";
  has(fxExplain(files, "grid.getChildren()", ".add", "compiler.err.cant.apply.symbols", cell), "A GridPane places a node in a cell with its own add", "grid.add(button, 0, 0)");
  has(fxExplain(files, "ArrayList<Node>", "();", "compiler.err.prob.found.req", "incompatible types: ObservableList<Node> cannot be converted to ArrayList<Node>"), "getChildren() gives an ObservableList<Node>", "Declare the variable as ObservableList<Node> (with import javafx.collections.ObservableList;), or as List<Node>");
  has(fxExplain(files, "List<Button>", "();", "compiler.err.prob.found.req", "incompatible types: ObservableList<Node> cannot be converted to List<Button>"), "getChildren() gives a list of Node", "a List<Button>");
  has(fxExplain(files, "setScene(box)", "box)", "compiler.err.cant.apply.symbol", "incompatible types: VBox cannot be converted to Scene"), "setScene takes a Scene, and box is a VBox", "stage.setScene(new Scene(box));");
  has(fxExplain(files, "setText(5)", "5)", "compiler.err.cant.apply.symbol", "incompatible types: int cannot be converted to String"), 'label.setText("" + 5)');
  has(fxExplain(files, "button.getChildren()", ".getChildren", "compiler.err.report.access", "getChildren() has protected access in Parent"), "button is a Button, and a Button can't hold other nodes", "new HBox(button, ...)");
  lacks(fxExplain(files, "button.getChildren()", ".getChildren", "compiler.err.report.access", "getChildren() has protected access in Parent"), "make it public in Parent");
  has(fxExplain(files, "box.add(label)", ".add", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method add(Label)\n  location: variable box of type VBox"), "a pane keeps its nodes in its list of children", "box.getChildren().add(...)");
  const empty = fxProgram(["stage.setScene(new Scene());"]);
  const constructors = "no suitable constructor found for Scene(no arguments)\n    constructor Scene.Scene(Parent) is not applicable\n      (actual and formal argument lists differ in length)\n    constructor Scene.Scene(Parent,double,double) is not applicable\n      (actual and formal argument lists differ in length)";
  has(fxExplain(empty, "new Scene()", "new", "compiler.err.cant.apply.symbols", constructors), "new Scene(root) or new Scene(root, 300, 200)");
});

test("a Node from getChildren() used as the Button it holds: Java goes by the type, so keep the Button or cast", () => {
  const files = fxProgram(['Button button = new Button("Add");', "VBox box = new VBox(button);", "Node first = box.getChildren().get(0);", 'first.setText("Changed");', "Button again = box.getChildren().get(0);", "for (Button b : box.getChildren()) {", "}"], { imports: [...FX_IMPORTS, "import javafx.scene.Node;"] });
  const setText = fxExplain(files, "first.setText", ".setText", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method setText(String)\n  location: variable first of type Node");
  has(setText, "first is a Node, and Node has no method setText(...)", "Java goes by the variable's type, Node", "getChildren().get(...) gives a Node", "if (first instanceof Label) { Label label = (Label) first; label.setText(...); }");
  has(fxExplain(files, "Button again", "(0)", "compiler.err.prob.found.req", "incompatible types: Node cannot be converted to Button"), "getChildren().get(...) gives a Node", "(Button) box.getChildren().get(0)");
  has(fxExplain(files, "for (Button b", "()) {", "compiler.err.prob.found.req", "incompatible types: Node cannot be converted to Button"), "for (Node node : box.getChildren()) { if (node instanceof Button) { Button button = (Button) node; ... } }");
});

/** What JavaFX's launch prints when start (or init, stop, the constructor) throws: the wrapper, then the cause. */
const fxWrapped = (head, cause, frames) =>
  `Exception in Application start method\nException in thread "main" java.lang.RuntimeException: ${head}\n\tat arena.fx.Session$Launch.session(Session.java:199)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\nCaused by: ${cause}\n${frames}\t... 1 more\n`;

test('"Exception in Application start method": the cause is the real problem, at its line; a node added twice; no constructor', () => {
  const lines = ["import javafx.application.Application;", "import javafx.scene.Scene;", "import javafx.scene.control.Button;", "import javafx.scene.layout.HBox;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    @Override", "    public void start(Stage stage) {", '        Button button = new Button("Add");', "        HBox box = new HBox(button, button);", "    }", "}"];
  const stderr = fxWrapped("Exception in Application start method", "java.lang.IllegalArgumentException: Children: duplicate children added: parent = HBox@6344e235", "\tat javafx.scene.Parent$Children.check(Parent.java:83)\n\tat javafx.scene.layout.HBox.<init>(HBox.java:20)\n\tat Main.start(Main.java:11)\n\tat arena.fx.Session$FxThread.run(Session.java:237)\n");
  const crash = crashIn(lines, stderr);
  assert.equal(crash.exception, "IllegalArgumentException");
  assert.equal(crash.line, 11);
  assert.equal(crash.placed, true);
  has(crash.explanation, 'Your start method threw it while it built the window, so JavaFX printed "Exception in Application start method"', 'whose cause (after "Caused by:") is this exception. The cause is the real problem, and its first line in your code is Main.java, line 11, in start.', "The program added a node to an HBox that already holds it: button is already one of its children", "create two nodes, as in two new Button(...)");
  lacks(crash.explanation, "Java's own");
  // Thrown in an event handler (JavaFX goes on, and the grader passes handler: true): no wrapper, and the note says the handler runs again.
  const handler = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Children: duplicate children added: parent = HBox@62482e0d\n\tat javafx.scene.Parent$Children.check(Parent.java:89)\n\tat Main.lambda$start$0(Main.java:11)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n', program({ "Main.java": lines }), { handler: true });
  has(handler.explanation, "This happened in an event handler, which runs again each time its event happens");
  lacks(handler.explanation, "Exception in Application");
  // A constructor with parameters: JavaFX can't create the object.
  const ctor = ["import javafx.application.Application;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    public Main(String title) {", "    }", "    public void start(Stage stage) {", "    }", "}"];
  const noCtor = crashIn(ctor, 'Exception in Application constructor\nException in thread "main" java.lang.RuntimeException: Unable to construct Application instance: class Main\n\tat arena.fx.Session$Launch.session(Session.java:146)\nCaused by: java.lang.NoSuchMethodException: Main.<init>()\n\tat java.base/java.lang.Class.getConstructor0(Class.java:3763)\n\t... 1 more\n');
  has(noCtor.explanation, "JavaFX couldn't create your Main object", "its constructor takes (String title). Remove the parameters");
  // A NullPointerException in init: its own explanation, after the wrapper's.
  const init = crashIn(["public class Main extends javafx.application.Application {", "    private String name;", "    public void init() {", "        System.out.println(name.length());", "    }", "}"], fxWrapped("Exception in Application init method", 'java.lang.NullPointerException: Cannot invoke "String.length()" because "this.name" is null', "\tat Main.init(Main.java:4)\n").replace("start method\n", "init method\n"));
  has(init.explanation, "Your init method threw it, before start", "Main.java, line 4, in init", "the instance variable name holds no object");
});

test("a Main that extends Application without a usable main: the JDK's launcher looks for real JavaFX, and the note says what main it needs", () => {
  // The JDK's launcher (and the browser engine, which hands such a class to it) prints this for a
  // missing main, and also for a misspelled, non-public or non-static one, or one without String[].
  const crash = explainCrash("Error: JavaFX runtime components are missing, and are required to run this application\n");
  assert.equal(crash.exception, "no main method");
  assert.equal(crash.line, null);
  has(crash.explanation, "Java Arena starts every program at public static void main(String[] args)", "your Main class extends Application", "public static void main(String[] args) { launch(Main.class); }", "Check the spelling of main, and that it is public static void with a String[] parameter", "Real JavaFX started from the module path can start an Application class without main");
  lacks(crash.explanation, "System.exit");
});

test("an exception that escaped an event handler (handler: true): the same explanation, but the program didn't stop", () => {
  const lines = ["import javafx.application.Application;", "import javafx.scene.control.Button;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    public void start(Stage stage) {", '        Button b = new Button("B");', "        b.setOnAction(e -> {", '            throw new IllegalStateException("closed");', "        });", "    }", "}"];
  const stderr = 'Exception in thread "main" java.lang.IllegalStateException: closed\n\tat Main.lambda$start$0(Main.java:9)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n';
  has(crashIn(lines, stderr).explanation, "with the throw in start (Main.java, line 9), and nothing caught it, so the program stopped.");
  const handler = explainCrash(stderr, program({ "Main.java": lines }), { handler: true });
  has(handler.explanation, "with the throw in start (Main.java, line 9), and nothing in the handler caught it.", "Its message says why: closed.");
  lacks(handler.explanation, "stopped");
  const library = explainCrash('Exception in thread "main" java.util.EmptyStackException\n\tat java.base/java.util.Stack.peek(Stack.java:103)\n\tat java.base/java.util.Stack.pop(Stack.java:85)\n\tat Main.lambda$start$0(Main.java:9)\n', program({ "Main.java": lines }), { handler: true });
  assert.equal(library.explanation, "Nothing in the handler caught it.");
});

test("launch in a class that isn't an Application, launch twice, and a null child", () => {
  let crash = crashIn(["public class Main {", "    public static void main(String[] args) {", "        javafx.application.Application.launch(args);", "    }", "}"], 'Exception in thread "main" java.lang.RuntimeException: Error: class Main is not a subclass of javafx.application.Application\n\tat javafx.application.Application.launch(Application.java:48)\n\tat Main.main(Main.java:3)\n');
  has(crash.explanation, "launch(args) starts the class whose main calls it, here Main, as a JavaFX program, so Main must extend Application");
  crash = explainCrash('Exception in thread "main" java.lang.IllegalStateException: Application launch must not be called more than once\n\tat arena.fx.Session.launch(Session.java:74)\n\tat javafx.application.Application.launch(Application.java:50)\n\tat Main.main(Main.java:12)\n');
  has(crash.explanation, "it can run only once in a program", "Call launch once");
  crash = crashIn(["public class Main {", "    private javafx.scene.control.Button button;", "    void build(javafx.scene.layout.VBox box) {", "        box.getChildren().add(button);", "    }", "}"], 'Exception in thread "main" java.lang.NullPointerException: Children: child node is null: parent = VBox@557f61f9\n\tat javafx.scene.Parent$Children.check(Parent.java:74)\n\tat Main.build(Main.java:4)\n');
  has(crash.explanation, "The program added null to the children of a VBox: button holds no node yet");
});

test("empty text turned into a number in a JavaFX program: a text field read in a handler or in start, a piece after split, and the input", () => {
  const head = ["import javafx.application.Application;", "import javafx.scene.Scene;", "import javafx.scene.control.*;", "import javafx.scene.layout.VBox;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    public void start(Stage stage) {", "        TextField field = new TextField();", '        Button add = new Button("Add");'];
  const tail = ["        stage.setScene(new Scene(new VBox(field, add)));", "        stage.show();", "    }", "}"];
  const nfe = (line, method = "lambda$start$0", message = 'For input string: ""') =>
    `Exception in thread "main" java.lang.NumberFormatException: ${message}\n\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)\n\tat java.base/java.lang.Integer.parseInt(Integer.java:672)\n\tat java.base/java.lang.Integer.valueOf(Integer.java:989)\n\tat Main.${method}(Main.java:${line})\n\tat javafx.scene.control.Button.fire(Button.java:25)\n`;
  // getText() on the line, in a handler: the field is empty until something is typed.
  const onLine = program({ "Main.java": [...head, "        add.setOnAction(e -> {", "            int number = Integer.valueOf(field.getText());", "        });", ...tail] });
  const direct = explainCrash(nfe(12), onLine, { handler: true });
  has(direct.explanation, "The program tried to turn empty text into a number. The text came from a text field, and getText() gives \"\" until something is typed.");
  lacks(direct.explanation, "nextLine", "split");
  // Through a variable that holds the field's text; Double.valueOf says "empty String".
  const viaVariable = program({ "Main.java": [...head, "        add.setOnAction(e -> {", "            String text = field.getText();", "            double number = Double.valueOf(text);", "        });", ...tail] });
  has(explainCrash(nfe(13, "lambda$start$0", "empty String"), viaVariable, { handler: true }).explanation, "The text came from a text field, and getText() gives \"\" until something is typed.");
  // Read in start: nobody has typed yet, so the field is always empty there.
  const inStart = program({ "Main.java": [...head, "        int number = Integer.valueOf(field.getText());", ...tail] });
  const start = explainCrash(fxWrapped("Exception in Application start method", 'java.lang.NumberFormatException: For input string: ""', "\tat java.base/java.lang.Integer.parseInt(Integer.java:672)\n\tat java.base/java.lang.Integer.valueOf(Integer.java:989)\n\tat Main.start(Main.java:11)\n\tat arena.fx.Session$FxThread.run(Session.java:237)\n"), inStart);
  has(start.explanation, "read in start: start runs before the user types anything, so a field read there is always empty", "Read the field in the event handler instead");
  lacks(start.explanation, "nextLine");
  // A piece after split: a field that isn't empty can give one too, so the note doesn't blame an empty field.
  const split = program({ "Main.java": [...head, "        add.setOnAction(e -> {", '            for (String piece : field.getText().split(",")) {', "                int number = Integer.valueOf(piece);", "            }", "        });", ...tail] });
  const pieces = explainCrash(nfe(13), split, { handler: true });
  has(pieces.explanation, 'An empty piece after split can cause this, as when "1,,2" is split at ","');
  lacks(pieces.explanation, "getText() gives", "nextLine");
  // A handler line that shows neither: an empty field is the likely cause.
  const other = program({ "Main.java": [...head, "        add.setOnAction(e -> {", "            int number = Integer.valueOf(read(field));", "        });", ...tail.slice(0, 3), "    static String read(TextField f) { return f.getText(); }", "}"] });
  has(explainCrash(nfe(12), other, { handler: true }).explanation, 'In an event handler, it often comes from an empty text field: getText() gives "" until something is typed.');
  // A console program keeps the input's explanation.
  const scanner = crashIn(["import java.util.Scanner;", "public class Main {", "    public static void main(String[] args) {", "        Scanner scanner = new Scanner(System.in);", "        int number = Integer.valueOf(scanner.nextLine());", "    }", "}"], nfe(5, "main"));
  has(scanner.explanation, "An empty line read with nextLine(), or an empty piece after split, can cause this.");
});

test("a layout given to a second scene, and a node in a pane made a scene's root: explained without the node's @hash", () => {
  const lines = ["import javafx.application.Application;", "import javafx.scene.Scene;", "import javafx.scene.control.Button;", "import javafx.scene.layout.*;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    public void start(Stage stage) {", "        VBox menu = new VBox();", '        Button back = new Button("Back");', "        back.setOnAction(e -> stage.setScene(new Scene(menu)));", "        stage.setScene(new Scene(menu));", "        stage.show();", "    }", "}"];
  const another = 'Exception in thread "main" java.lang.IllegalArgumentException: VBox@59721f8[styleClass=root]is already set as root of another scene\n\tat javafx.scene.Scene.attach(Scene.java:39)\n\tat javafx.scene.Scene.<init>(Scene.java:18)\n\tat Main.lambda$start$0(Main.java:11)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n';
  const handler = explainCrash(another, program({ "Main.java": lines }), { handler: true });
  has(handler.explanation, "The program gave a scene a root, a VBox, that is already the root of another scene. A layout can be the root of only one scene", "Make each scene once, in start, keep it in a variable, and switch the window to it with stage.setScene(thatScene).", "setRoot", "This happened in an event handler, which runs again each time its event happens");
  lacks(handler.explanation, "@", "styleClass", "Java's own");
  const inMain = crashIn(lines, another.replace("Main.lambda$start$0(Main.java:11)", "Main.start(Main.java:12)"));
  lacks(inMain.explanation, "event handler", "@");
  const inPane = crashIn(lines, 'Exception in thread "main" java.lang.IllegalArgumentException: VBox@4003b52bis already inside a scene-graph and cannot be set as root\n\tat javafx.scene.Scene.attach(Scene.java:36)\n\tat javafx.scene.Scene.<init>(Scene.java:18)\n\tat Main.start(Main.java:12)\n');
  has(inPane.explanation, "The program made a VBox the root of a scene (with new Scene(...) or setRoot), but it is already inside a pane", "remove it from that pane first");
  lacks(inPane.explanation, "@", "Java's own");
});

test("Application.Parameters, what getParameters() gives: a wrong method gets its three methods, a near miss gets Did you mean, and no import is made up for it", () => {
  const files = fxProgram(["getParameters().zzz();", "Parameters p = getParameters();", "p.getNamd();", "Application.Parameters q = getParameters();", "q.getRaww();"]);
  const zzz = fxExplain(files, "getParameters().zzz", ".zzz", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method zzz()\n  location: class Parameters");
  has(zzz, "An Application.Parameters, what getParameters() gives, has no method zzz(). It has three methods, as in real JavaFX: getRaw() gives all the arguments, getUnnamed() those that aren't --name=value, and getNamed() the --name=value ones");
  lacks(zzz, "may be missing", "Parameters's", "There is no method");
  has(fxExplain(files, "p.getNamd", ".getNamd", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method getNamd()\n  location: variable p of type Parameters"), "p is an Application.Parameters, what getParameters() gives, and it has no method getNamd(). Did you mean getNamed?");
  has(fxExplain(files, "q.getRaww", ".getRaww", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method getRaww()\n  location: variable q of type Parameters"), "Did you mean getRaw?");
  // Parameters is a class inside Application: an explanation never offers import javafx.application.Parameters; (it doesn't compile).
  const imported = fxProgram(["getParameters().getRaw();"], { imports: [...FX_IMPORTS, "import javafx.application.Parameters;"] });
  const importNote = fxExplain(imported, "import javafx.application.Parameters", "Parameters", NOT_FOUND, "cannot find symbol\n  symbol:   class Parameters\n  location: package javafx.application");
  has(importNote, "Parameters isn't a class of javafx.application of its own, so this import doesn't compile: it's Application.Parameters", "Remove the import.", "in a class that extends Application, write Parameters, with no import of its own");
  lacks(importNote, "import javafx.application.Parameters;", "has no class Parameters");
  const misspelt = fxProgram(["Parameter p = getParameters();"]);
  const typo = fxExplain(misspelt, "Parameter p", "Parameter", NOT_FOUND, "cannot find symbol\n  symbol:   class Parameter\n  location: class Main");
  has(typo, "There is no class Parameter. Did you mean Parameters, the class of what getParameters() gives?");
  lacks(typo, "import javafx.application.Parameters;");
  // A class of the program's own called Parameters: its own methods, not JavaFX's.
  const own = fxProgram(["new Parameters().zzz();"], { extra: ["}", "class Parameters {"] });
  lacks(fxExplain(own, "new Parameters().zzz", ".zzz", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method zzz()\n  location: class Parameters") ?? "", "Application.Parameters");
});

const UNEXPECTED = ["compiler.err.unexpected.type", "unexpected type\n  required: variable\n  found:    value"];
const NOT_A_SETTER = "If the method has a setter to go with it";
const ACTION_SELF = "has no setOnAction: of the events, it has setOnAction";
const MOUSE_KEYS = "are part of real JavaFX but not of this version";

test("setOnAction on a node that has none (only buttons and text fields do here, and in real JavaFX that node has none either), window events, other real events, and a made-up one", () => {
  const files = fxProgram(['Label label = new Label("Hi");', "VBox box = new VBox(label);", "TextArea area = new TextArea();", "HBox row = new HBox();", "label.setOnAction(e -> { });", "box.setOnAction(e -> { });", "area.setOnAction(e -> { });", "row.setOnAction(e -> { });", "stage.setOnAction(e -> { });", "stage.setOnCloseRequest(e -> { });", "label.setOnScroll(e -> { });", "label.setOnClick(e -> { });"], { imports: [...FX_IMPORTS, "import javafx.scene.control.TextArea;", "import javafx.scene.layout.HBox;"] });
  const call = (v, type, method) => fxExplain(files, `${v}.${method}`, `.${method}`, NOT_FOUND_CALL, `cannot find symbol\n  symbol:   method ${method}((e)->{ })\n  location: variable ${v} of type ${type}`);
  const label = call("label", "Label", "setOnAction");
  has(label, "label is a Label, and Label has no method setOnAction(...): in Java Arena's practice version of JavaFX, only buttons and text fields have setOnAction (a click on a Button, or Enter in a TextField), and in real JavaFX a Label doesn't have it either.", "To react to a click, add a Button and use its setOnAction(e -> ...).");
  lacks(label, ACTION_SELF, MOUSE_KEYS, "Mouse");
  const box = call("box", "VBox", "setOnAction");
  has(box, "VBox has no method setOnAction(...): in Java Arena's practice version of JavaFX, only buttons and text fields have setOnAction", "and in real JavaFX a VBox doesn't have it either.", "add a Button");
  lacks(box, ACTION_SELF, MOUSE_KEYS);
  const area = call("area", "TextArea", "setOnAction");
  has(area, "only buttons and text fields have setOnAction", "and in real JavaFX a TextArea doesn't have it either.", "To react to typing, a change listener on the text works: area.textProperty().addListener((observable, oldValue, newValue) -> ...).");
  lacks(area, ACTION_SELF, MOUSE_KEYS);
  // "an HBox", "a Stage": the article goes by how the name is read aloud.
  has(call("row", "HBox", "setOnAction"), "and in real JavaFX an HBox doesn't have it either.");
  has(call("stage", "Stage", "setOnAction"), "and in real JavaFX a Stage doesn't have it either.");
  const close = call("stage", "Stage", "setOnCloseRequest");
  has(close, "Java Arena's practice version of JavaFX has no setOnCloseRequest: its windows have no events of their own", "which are part of real JavaFX", "override stop()");
  lacks(close, "Mouse", "To react to a click", ACTION_SELF);
  has(call("label", "Label", "setOnScroll"), "has no setOnScroll: of the events, it has setOnAction", "Keyboard, scroll and drag-and-drop events", MOUSE_KEYS);
  const made = call("label", "Label", "setOnClick");
  has(made, "has no setOnClick: of the events, it has setOnAction");
  lacks(made, "part of real JavaFX");
});

test("Stage, Button or Node in a program that doesn't use JavaFX: no javafx import, and a near name of the program's own still counts", () => {
  const tent = program({ "Main.java": ["public class Main {", "    public static void main(String[] args) {", '        Stage tent = new Stage("Blue Tent");', "    }", "}"] });
  const stage = explain(tent, "Main.java", 3, "Stage", NOT_FOUND, "cannot find symbol\n  symbol:   class Stage\n  location: class Main");
  lacks(stage, "import javafx", "JavaFX");
  const game = program({ "Main.java": ["public class Main {", "    private Button start;", "}"] });
  lacks(explain(game, "Main.java", 2, "Button", NOT_FOUND, "cannot find symbol\n  symbol:   class Button\n  location: class Main"), "javafx");
  const near = program({ "Main.java": ["public class Main {", "    public static void main(String[] args) {", '        Stage tent = new Stage("Blue Tent");', "    }", "}", "class Stag {", "}"] });
  has(explain(near, "Main.java", 3, "Stage", NOT_FOUND, "cannot find symbol\n  symbol:   class Stage\n  location: class Main"), "Did you mean Stag");
  // A JavaFX program with every import forgotten still gets JavaFX's import line.
  const forgot = program({ "Main.java": ["public class Main extends Application {", "    public void start(Stage stage) {", "    }", "}"] });
  has(explain(forgot, "Main.java", 2, "Stage", NOT_FOUND, "cannot find symbol\n  symbol:   class Stage\n  location: class Main"), "import javafx.stage.Stage;");
});

test("= on a value: == written as =, a list's get(i) given a value, ++ on a call, and getChildren() =", () => {
  const files = program({
    "Main.java": [
      "import java.util.ArrayList;",
      "import java.util.List;",
      "",
      "public class Main {",
      "    public static void main(String[] args) {",
      "        List<Integer> list = new ArrayList<>();",
      "        int a = 1;",
      "        int b = 2;",
      "        if (list.size() = 0) {",
      "        }",
      "        while (a + b = 3) {",
      "        }",
      "        boolean ok = a + b = 3;",
      "        list.get(0) = 5;",
      "        list.get(0) += 1;",
      "        list.size()++;",
      "        Math.max(a, b) = 4;",
      "    }",
      "}",
    ],
  });
  const at = (line, caret) => explain(files, "Main.java", line, caret, ...UNEXPECTED);
  const size = at(9, "() = 0");
  has(size, "To compare, use ==", "Write list.size() == 0.");
  lacks(size, NOT_A_SETTER);
  has(at(11, "+ b"), "To compare, use ==", "Write a + b == 3.");
  has(at(13, "+ b"), "Write a + b == 3.");
  const get = at(14, "(0) = 5");
  has(get, "use set: list.set(0, 5);");
  lacks(get, NOT_A_SETTER, "==");
  has(at(15, "(0) +="), "list.set(0, list.get(0) + 1);");
  const plus = at(16, "()++");
  has(plus, "++ changes a variable, and list.size() is a value that a method call gives");
  lacks(plus, "left side of =", NOT_A_SETTER);
  has(at(17, "(a, b)"), "The left side of = must be a variable", NOT_A_SETTER);
  // The children list: its own note still wins.
  const children = fxProgram(["VBox box = new VBox();", "box.getChildren() = null;"]);
  has(fxExplain(children, "box.getChildren() =", "(", ...UNEXPECTED), "getChildren() gives the pane's list of children, and a list a method gives can't be replaced with =");
});

test("launch in a class that has start(Stage) but doesn't extend Application: extends Application first, the other Application class second (fidelity 63)", () => {
  const files = program({
    "CounterApp.java": ["import javafx.application.Application;", "import javafx.stage.Stage;", "", "public class CounterApp extends Application {", "    @Override", "    public void start(Stage stage) {", '        stage.setTitle("Counter");', "        stage.show();", "    }", "", "    public static void open(String[] args) {", "        Application.launch(Helper.class, args);", "    }", "}", "", "class Helper {", "}"],
    "Main.java": ["import javafx.application.Application;", "import javafx.stage.Stage;", "", "public class Main {", "    @Override", "    public void start(Stage stage) {", "        stage.show();", "    }", "", "    public static void main(String[] args) {", "        launch(args);", "        Application.launch(Main.class, args);", "    }", "}"],
  });
  const mismatch = (cls) => `no suitable method found for launch(Class<${cls}>,String[])\n    method Application.launch(Class<? extends Application>,String...) is not applicable\n      (argument mismatch; Class<${cls}> cannot be converted to Class<? extends Application>)\n    method Application.launch(String...) is not applicable\n      (varargs mismatch; Class<${cls}> cannot be converted to String)`;
  has(explain(files, "Main.java", 5, "@Override", "compiler.err.method.does.not.override.superclass", "method does not override or implement a method from a supertype"), "Write public class Main extends Application.");
  assert.equal(
    explain(files, "Main.java", 11, "launch", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method launch(String[])\n  location: class Main"),
    "launch is a method of Application, and Main doesn't extend Application, so Main can't call it by its name alone. Main has start(Stage), so it's meant as the JavaFX program: write public class Main extends Application. Then launch(Main.class) in main starts it. Or, to start CounterApp instead, write Application.launch(CounterApp.class, args).",
  );
  assert.equal(
    explain(files, "Main.java", 12, ".launch", "compiler.err.cant.apply.symbols", mismatch("Main")),
    "launch(Main.class) starts Main as a JavaFX program, so Main must extend Application, and it doesn't. Main has start(Stage), so it's meant as one: write public class Main extends Application. Or, to start CounterApp instead, write Application.launch(CounterApp.class, args).",
  );
  has(explain(files, "CounterApp.java", 12, ".launch", "compiler.err.cant.apply.symbols", mismatch("Helper")), "Did you mean CounterApp.class?");
  // A class that extends something else isn't told to extend Application; without the import, the note gives it.
  const pane = program({ "Main.java": ["import javafx.scene.layout.Pane;", "import javafx.stage.Stage;", "", "public class Main extends Pane {", "    public void start(Stage stage) {", "    }", "    public static void main(String[] args) {", "        launch(args);", "    }", "}"] });
  lacks(explain(pane, "Main.java", 8, "launch", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method launch(String[])\n  location: class Main"), "has start(Stage)");
  const noImport = program({ "Main.java": ["import javafx.stage.Stage;", "", "public class Main {", "    public void start(Stage stage) {", "    }", "    public static void main(String[] args) {", "        launch(args);", "    }", "}"] });
  has(explain(noImport, "Main.java", 7, "launch", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method launch(String[])\n  location: class Main"), "write public class Main extends Application (with import javafx.application.Application;).");
});

test("a node added twice in a lambda that start runs right away is no event handler; an inner-class handler is one", () => {
  const lines = ["import java.util.List;", "import javafx.application.Application;", "import javafx.scene.control.Button;", "import javafx.scene.layout.HBox;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    @Override", "    public void start(Stage stage) {", '        Button a = new Button("A");', "        HBox box = new HBox(a);", "        List.of(a, a).forEach(button -> box.getChildren().add(button));", "    }", "}"];
  const stderr = fxWrapped("Exception in Application start method", "java.lang.IllegalArgumentException: Children: duplicate children added: parent = HBox@6344e235", "\tat javafx.scene.Parent$Children.check(Parent.java:83)\n\tat Main.lambda$start$0(Main.java:12)\n\tat java.base/java.lang.Iterable.forEach(Iterable.java:75)\n\tat Main.start(Main.java:12)\n\tat arena.fx.Session$FxThread.run(Session.java:237)\n");
  const crash = crashIn(lines, stderr);
  has(crash.explanation, "Your start method threw it while it built the window", "its first line in your code is Main.java, line 12, in start.");
  lacks(crash.explanation, "event handler", "called from start");
  const inner = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Children: duplicate children added: parent = HBox@62482e0d\n\tat javafx.scene.Parent$Children.check(Parent.java:89)\n\tat Main$1.handle(Main.java:12)\n\tat Main$1.handle(Main.java:10)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n', program({ "Main.java": lines }), { handler: true });
  has(inner.explanation, "This happened in an event handler, which runs again each time its event happens");
});

test("a static call on a class's name: no \"HBox is a HBox\", only static methods listed; an HBox, not a HBox", () => {
  const files = fxProgram(['Button button = new Button("Add");', "HBox box = new HBox(button);", "HBox.setMargin(button, null);", "javafx.scene.layout.HBox.setMargin(button, null);", "GridPane.setColumnIndex(button, 1);", "HBox.setSpacin(5);", "box.setHgap(5);", "Pane.setAlignment(button);"], { imports: [...FX_IMPORTS, "import javafx.scene.layout.HBox;", "import javafx.scene.layout.Pane;"] });
  const at = (text, method, args, cls) => fxExplain(files, text, `.${method}`, NOT_FOUND_CALL, `cannot find symbol\n  symbol:   method ${method}(${args})\n  location: class ${cls}`);
  const margin = at("HBox.setMargin", "setMargin", "Button,<null>", "HBox");
  has(margin, "HBox has no static method setMargin(...) in Java Arena's practice version of JavaFX", "HBox has no static methods here");
  lacks(margin, "HBox is a HBox", "every control and pane has");
  has(at("layout.HBox.setMargin", "setMargin", "Button,<null>", "HBox"), "HBox has no static method setMargin(...)");
  has(at("GridPane.setColumnIndex", "setColumnIndex", "Button,int", "GridPane"), "GridPane has no static method setColumnIndex(...)", "Did you mean getColumnIndex?");
  const spacin = at("HBox.setSpacin", "setSpacin", "int", "HBox");
  has(spacin, "Did you mean setSpacing?", "setSpacing isn't static: it belongs to each HBox, so call it on one, as in box.setSpacing(...).");
  const pane = at("Pane.setAlignment", "setAlignment", "Button", "Pane");
  has(pane, "Pane has no static method setAlignment(...)");
  lacks(pane, "instanceof");
  has(fxExplain(files, "box.setHgap", ".setHgap", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method setHgap(int)\n  location: variable box of type HBox"), "box is an HBox");
});

test("add on a Scene, a Stage or in start goes to the root pane's children, with the method written; whole lists of methods", () => {
  const files = fxProgram(['Label label = new Label("Hi");', "Scene scene = new Scene(new VBox());", "scene.add(label);", "stage.add(label);", "scene.addAll(label, label);", "add(label);", "TextArea area = new TextArea();", "area.setMinWidth(100);", "stage.centerOnScreen();"], { imports: [...FX_IMPORTS, "import javafx.scene.control.TextArea;"] });
  const sceneAdd = fxExplain(files, "scene.add(", ".add", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method add(Label)\n  location: variable scene of type Scene");
  has(sceneAdd, "scene is a Scene, and Scene has no method add(...): a Scene holds one node, its root", "root.getChildren().add(...)");
  lacks(sceneAdd, "GridPane");
  const stageAdd = fxExplain(files, "stage.add(", ".add", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method add(Label)\n  location: variable stage of type Stage");
  has(stageAdd, "a Stage is the window itself", "root.getChildren().add(...)");
  lacks(stageAdd, "GridPane");
  const addAll = fxExplain(files, "scene.addAll", ".addAll", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method addAll(Label,Label)\n  location: variable scene of type Scene");
  has(addAll, "root.getChildren().addAll(...)");
  lacks(addAll, "ObservableList");
  const bare = fxExplain(files, "add(label);", "add", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method add(Label)\n  location: class Main");
  has(bare, "the window's nodes go in a pane, the root of its Scene", "root.getChildren().add(...)");
  lacks(bare, "GridPane");
  has(fxExplain(files, "setMinWidth", ".setMinWidth", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method setMinWidth(int)\n  location: variable area of type TextArea"), "isEditable, getLength, setFont and getFont, and those every control");
  has(fxExplain(files, "centerOnScreen", ".centerOnScreen", NOT_FOUND_CALL, "cannot find symbol\n  symbol:   method centerOnScreen()\n  location: variable stage of type Stage"), "getScene, isShowing and hide.");
});

test("getChildren().add with three or five values: a column and a row only when they are numbers", () => {
  const files = fxProgram(['Label a = new Label("a");', 'Label b = new Label("b");', 'Label c = new Label("c");', "HBox row = new HBox();", "row.getChildren().add(a, b, c);", "row.getChildren().add(a, 0, 1);", "GridPane grid = new GridPane();", "int col = 0;", "grid.getChildren().add(a, col, col);", "grid.getChildren().add(a, b, c);"], { imports: [...FX_IMPORTS, "import javafx.scene.layout.HBox;"] });
  const msg = (types) => `no suitable method found for add(${types})\n    method Collection.add(Node) is not applicable\n      (actual and formal argument lists differ in length)\n    method List.add(Node) is not applicable\n      (actual and formal argument lists differ in length)`;
  const labels = fxExplain(files, "row.getChildren().add(a, b", ".add", "compiler.err.cant.apply.symbols", msg("Label,Label,Label"));
  has(labels, "use addAll: row.getChildren().addAll(a, b, c).");
  lacks(labels, "column");
  has(fxExplain(files, "row.getChildren().add(a, 0", ".add", "compiler.err.cant.apply.symbols", msg("Label,int,int")), "nothing with a column and a row", "grid.add(node, column, row)");
  has(fxExplain(files, "grid.getChildren().add(a, col", ".add", "compiler.err.cant.apply.symbols", msg("Label,int,int")), "A GridPane places a node in a cell with its own add", "grid.add(a, col, col)");
  const gridLabels = fxExplain(files, "grid.getChildren().add(a, b", ".add", "compiler.err.cant.apply.symbols", msg("Label,Label,Label"));
  has(gridLabels, "grid.getChildren().addAll(a, b, c).");
  lacks(gridLabels, "column");
});

test("the table of the practice version's classes and methods matches the library's class files", async () => {
  const { referenceJavaHome } = await import("./fidelity/suite.mjs");
  const { libraryDir } = await import("./libraries.mjs");
  const { spawnSync } = await import("node:child_process");
  const { readdirSync } = await import("node:fs");
  const dir = libraryDir("javafx");
  const classes = readdirSync(join(dir, "javafx"), { recursive: true })
    .map(String)
    .filter((f) => f.endsWith(".class") && !f.includes("$"))
    .map((f) => `javafx.${f.slice(0, -".class".length).replace(/\//g, ".")}`);
  const env = { ...process.env };
  delete env.JAVA_TOOL_OPTIONS;
  const r = spawnSync(join(referenceJavaHome(), "bin", "javap"), ["-public", "-cp", dir, ...classes], { encoding: "utf8", env });
  assert.equal(r.status, 0, r.stderr);
  const found = {};
  const foundStatic = {};
  for (const block of r.stdout.split(/^(?=public )/m).filter((b) => b.startsWith("public "))) {
    const head = /^public (?:abstract |final )*(?:class|interface) javafx\.([\w.]+)\.(\w+)(?:<[^{]*?>)?(?: extends ([\w.<>?, ]+?))?(?: implements ([\w.<>?, ]+?))? \{/.exec(block);
    assert.ok(head, block.split("\n")[0]);
    const [, sub, name, ext = "", impl = ""] = head;
    // The parent among the practice version's classes: the class it extends, or else the first interface (StringProperty's ObservableValue).
    const fxParent = (list) => /^javafx\.[\w.]+\.(\w+)/.exec(list.split(/,\s*/).find((t) => t.startsWith("javafx.")) ?? "")?.[1] ?? "";
    const methods = [...block.matchAll(/^ {2}public (?:[\w$<>?,. \[\]]+ )?(\w+)\(/gm)].map((m) => m[1]).filter((m) => m !== name && !/^(?:toString|equals|hashCode|values|valueOf)$/.test(m));
    found[name] = { pkg: `javafx.${sub}`, parent: fxParent(ext) || fxParent(impl), methods: [...new Set(methods)].sort().join(" ") };
    const statics = [...block.matchAll(/^ {2}public (?:[\w$]+ )*?static (?:[\w$<>?,. \[\]]+ )?(\w+)\(/gm)].map((m) => m[1]).filter((m) => !/^(?:values|valueOf)$/.test(m));
    if (statics.length) foundStatic[name] = [...new Set(statics)].sort().join(" ");
  }
  const table = Object.fromEntries(Object.entries(PRACTICE_JAVAFX).map(([name, c]) => [name, { pkg: c.pkg, parent: c.parent, methods: [...new Set(c.methods.split(" ").filter(Boolean))].sort().join(" ") }]));
  assert.deepEqual(table, found);
  // The static methods, which a call on the class's name (GridPane.getColumnIndex(...)) can use.
  assert.deepEqual(Object.fromEntries(Object.entries(PRACTICE_JAVAFX_STATIC).map(([name, m]) => [name, m.split(" ").sort().join(" ")])), foundStatic);
});

// ---- Part 14 (sections 14.1 and 14.2): charts, drawing, images and sound with the practice JavaFX ----
// Each message below is javac's or the practice library's own, from a program compiled and run on the JDK with the library on the class path.

const CHART_IMPORTS = ["import javafx.application.Application;", "import javafx.scene.Scene;", "import javafx.scene.chart.BarChart;", "import javafx.scene.chart.CategoryAxis;", "import javafx.scene.chart.LineChart;", "import javafx.scene.chart.NumberAxis;", "import javafx.scene.chart.XYChart;", "import javafx.stage.Stage;"];
const BAD_TYPES = "compiler.err.prob.found.req";

test("part 14: a chart, axis, color, canvas, image or mouse class without its import gets its import line; XYChart.Series without XYChart, Series without XYChart., and an import of Series", () => {
  const files = fxProgram(
    ["NumberAxis years = new NumberAxis();", "XYChart.Series<Number, Number> rain = new XYChart.Series<>();", "Series<Number, Number> snow = new Series<>();", "snow.getData().add(new Data<>(2020, 120));", 'Image photo = new Image("file:photo.png");', "painter.setFill(Color.DARKBLUE);", "canvas.setOnMouseDragged((MouseEvent event) -> {});"],
    { imports: ["import javafx.application.Application;", "import javafx.scene.chart.Data;", "import javafx.stage.Stage;"] },
  );
  for (const [name, pkg, text] of [["NumberAxis", "javafx.scene.chart", "NumberAxis years"], ["Image", "javafx.scene.image", "Image photo"], ["MouseEvent", "javafx.scene.input", "MouseEvent event"]])
    has(fxExplain(files, text, name, NOT_FOUND, `cannot find symbol\n  symbol:   class ${name}\n  location: class Main`), `To use ${name}, import it at the top of the file: import ${pkg}.${name};`);
  has(fxExplain(files, "Color.DARKBLUE", "Color", NOT_FOUND, "cannot find symbol\n  symbol:   variable Color\n  location: class Main"), "import javafx.scene.paint.Color;");
  // Without its import, XYChart before a dot reads as a package.
  has(fxExplain(files, "XYChart.Series<Number", ".Series", "compiler.err.doesnt.exist", "package XYChart does not exist"), "XYChart.Series is the class Series inside XYChart", "it reads XYChart as the name of a package", "import javafx.scene.chart.XYChart;");
  has(fxExplain(files, "Series<Number, Number> snow", "Series", NOT_FOUND, "cannot find symbol\n  symbol:   class Series\n  location: class Main"), "Series is a class inside XYChart: a line of data points with a name", "write XYChart.Series (with import javafx.scene.chart.XYChart; at the top of the file)", "XYChart.Series<Number, Number> series = new XYChart.Series<>();");
  has(fxExplain(files, "new Data<>", "Data", NOT_FOUND, "cannot find symbol\n  symbol:   class Data\n  location: class Main"), "Data is a class inside XYChart: one data point, an x value and a y value", "new XYChart.Data<>(2020, 15)");
  has(fxExplain(files, "chart.Data", "chart.", NOT_FOUND, "cannot find symbol\n  symbol:   class Data\n  location: package javafx.scene.chart"), "Data isn't a class of javafx.scene.chart of its own: it's a class inside XYChart, so import XYChart instead, import javafx.scene.chart.XYChart;", "import javafx.scene.chart.XYChart.Data; works too");
  // A class XYChart doesn't have inside it.
  const point = program({ "Main.java": ["import javafx.scene.chart.XYChart.Point;", "", "public class Main {", "}"] });
  has(explain(point, "Main.java", 1, ".Point", NOT_FOUND, "cannot find symbol\n  symbol:   class Point\n  location: class javafx.scene.chart.XYChart"), "XYChart has two classes inside it, Series", "and Data", "it has no class Point.");
  // A program without JavaFX: Series and Data may be classes not written yet.
  lacks(explain(program({ "Main.java": ["public class Main {", "    Series s;", "}"] }), "Main.java", 2, "Series", NOT_FOUND, "cannot find symbol\n  symbol:   class Series\n  location: class Main"), "XYChart");
});

test("part 14: a chart whose axis is for other values than its angle brackets say, and data points and series of the wrong types", () => {
  const files = fxProgram(
    ["LineChart<Number, Number> growth = new LineChart<>(new CategoryAxis(), new NumberAxis());", "BarChart<String, Number> votes = new BarChart<>(new NumberAxis(), new NumberAxis());", "CategoryAxis years = new CategoryAxis();", "LineChart<Number, Number> prices = new LineChart<Number, Number>(years, new NumberAxis());", "XYChart.Series<Number, Number> population = new XYChart.Series<>();", 'population.getData().add(new XYChart.Data<>("2015", 5472));', 'population.getData().add(new XYChart.Data<Number, Number>("2016", 5487));', "XYChart.Series<String, Number> parties = new XYChart.Series<>();", "parties.getData().add(new XYChart.Data<>(1, 20));", "growth.getData().add(parties);", "parties.getData().add(new XYChart.Data<Number, Number>(1, 2));", "votes.getData().add(new XYChart.Series<Number, Number>());", "parties.getData().add(0, new XYChart.Data<Number, Number>(3, 4));"],
    { imports: CHART_IMPORTS },
  );
  const category = fxExplain(files, "growth = new", "<>(new Category", BAD_TYPES, "incompatible types: cannot infer type arguments for LineChart<>\n    reason: inference variable X has incompatible equality constraints Number,String");
  has(category, "A chart's axes decide the types of its values", "Here the x axis (new CategoryAxis()) is a CategoryAxis, for names", "the angle brackets say the x values are Numbers", "give the chart a NumberAxis there: new NumberAxis()", "LineChart<String, Number>", "XYChart.Series<String, Number>");
  const bar = fxExplain(files, "votes = new", "<>(new Number", BAD_TYPES, "incompatible types: cannot infer type arguments for BarChart<>\n    reason: inference variable X has incompatible equality constraints String,Number");
  has(bar, "Here the x axis (new NumberAxis()) is a NumberAxis, for numbers", "the x values are Strings", "give the chart a CategoryAxis there: new CategoryAxis()", "A BarChart needs one of each");
  lacks(bar, "BarChart<Number, Number>", "XYChart.Series<Number, Number>", "write Number for them");
  has(fxExplain(files, "prices = new", "years,", BAD_TYPES, "incompatible types: CategoryAxis cannot be converted to Axis<Number>"), "Here the x axis (years) is a CategoryAxis", "the x values are Numbers");
  has(fxExplain(files, '"2015"', ".Data<>", BAD_TYPES, "incompatible types: cannot infer type arguments for Data<>\n    reason: inference variable X has incompatible bounds\n      equality constraints: Number\n      lower bounds: String"), "new XYChart.Data<>(x, y) takes the x value first and the y value second", 'Here the x value must be a Number, and "2015" is a String', "write the number without quotes, 2015", "XYChart.Series<String, Number>");
  has(fxExplain(files, '"2016"', '"2016"', BAD_TYPES, "incompatible types: String cannot be converted to Number"), 'Here the x value must be a Number, and "2016" is a String');
  has(fxExplain(files, "(1, 20)", ".Data<>", BAD_TYPES, "incompatible types: cannot infer type arguments for Data<>\n    reason: inference variable X has incompatible bounds\n      equality constraints: String\n      lower bounds: Integer"), "the x value must be a String, and 1 is an Integer", 'write this one in quotes, "1"');
  has(fxExplain(files, "growth.getData().add(parties)", "parties", BAD_TYPES, "incompatible types: Series<String,Number> cannot be converted to Series<Number,Number>"), "parties is an XYChart.Series<String, Number>, and a chart of Number and Number values takes only XYChart.Series<Number, Number>", "the x values (String and Number) differ");
  // An argument with a comma inside its angle brackets: never cut there.
  const point = fxExplain(files, "(new XYChart.Data<Number, Number>(1, 2))", "new XYChart", BAD_TYPES, "incompatible types: Data<Number,Number> cannot be converted to Data<String,Number>");
  has(point, "This is an XYChart.Data<Number, Number>, and a series of String and Number values takes only XYChart.Data<String, Number>");
  lacks(point, "Data<Number is");
  const series = fxExplain(files, "votes.getData().add(new", "new XYChart", BAD_TYPES, "incompatible types: Series<Number,Number> cannot be converted to Series<String,Number>");
  has(series, "This is an XYChart.Series<Number, Number>, and a chart of String and Number values takes only XYChart.Series<String, Number>");
  lacks(series, "Series<Number is");
  const second = fxExplain(files, "add(0, new", "new XYChart", BAD_TYPES, "incompatible types: Data<Number,Number> cannot be converted to Data<String,Number>");
  has(second, "This is an XYChart.Data<Number, Number>");
  lacks(second, "Data<Number is");
});

test("part 14: a BarChart's axes: its advice never leaves it two axes of the same kind, and two axes the wrong way round are swapped", () => {
  const files = fxProgram(
    ["BarChart<String, Number> upright = new BarChart<>(new NumberAxis(), new CategoryAxis());", "BarChart<Number, String> sideways = new BarChart<>(new CategoryAxis(), new NumberAxis());", "CategoryAxis names = new CategoryAxis();", "NumberAxis heights = new NumberAxis();", "BarChart<String, Number> named = new BarChart<String, Number>(heights, names);", "BarChart<Number, Number> numbers = new BarChart<>(new CategoryAxis(), new NumberAxis());", "BarChart<String, String> texts = new BarChart<>(new CategoryAxis(), new NumberAxis());"],
    { imports: CHART_IMPORTS },
  );
  const never = ["BarChart<Number, Number>", "BarChart<String, String>", "XYChart.Series<Number, Number>", "XYChart.Series<String, String>"];
  const upright = fxExplain(files, "upright = new", "<>(new Number", BAD_TYPES, "incompatible types: cannot infer type arguments for BarChart<>\n    reason: inference variable X has incompatible equality constraints String,Number");
  has(upright, "Here the x axis (new NumberAxis()) is a NumberAxis", "the two axes are the wrong way round for the angle brackets: swap them so they fit, new BarChart<>(new CategoryAxis(), new NumberAxis()).", "if you want the bars to lie sideways, with their names on the y axis, swap the types in the angle brackets instead so they match the axes: BarChart<Number, String>, and in its series' too, XYChart.Series<Number, String>.");
  lacks(upright, ...never, "give the chart a CategoryAxis there");
  const sideways = fxExplain(files, "sideways = new", "<>(new Category", BAD_TYPES, "incompatible types: cannot infer type arguments for BarChart<>\n    reason: inference variable X has incompatible equality constraints Number,String");
  has(sideways, "Here the x axis (new CategoryAxis()) is a CategoryAxis", "swap them so they fit, new BarChart<>(new NumberAxis(), new CategoryAxis()).", "if you want the bars to stand up, with their names on the x axis, swap the types in the angle brackets instead so they match the axes: BarChart<String, Number>, and in its series' too, XYChart.Series<String, Number>.");
  lacks(sideways, ...never, "give the chart a NumberAxis there");
  // Variables for the axes, with the types written in.
  const named = fxExplain(files, "named = new", "heights,", BAD_TYPES, "incompatible types: NumberAxis cannot be converted to Axis<String>");
  has(named, "Here the x axis (heights) is a NumberAxis", "swap them so they fit, new BarChart<>(names, heights).");
  lacks(named, ...never);
  // Number and Number in the angle brackets: only other angle brackets fit, as another axis would make two NumberAxes.
  const numbers = fxExplain(files, "numbers = new", "<>(new Category", BAD_TYPES, "incompatible types: cannot infer type arguments for BarChart<>\n    reason: inference variable X has incompatible equality constraints Number,String");
  has(numbers, "Write String for the x values in the angle brackets, BarChart<String, Number>, and in its series' too, XYChart.Series<String, Number>.", "A BarChart needs one of each");
  lacks(numbers, ...never, "give the chart a NumberAxis there");
  const texts = fxExplain(files, "texts = new", "<>(new Category", BAD_TYPES, "incompatible types: cannot infer type arguments for BarChart<>\n    reason: inference variable Y has incompatible equality constraints String,Number");
  has(texts, "Here the y axis (new NumberAxis()) is a NumberAxis", "Write Number for the y values in the angle brackets, BarChart<String, Number>");
  lacks(texts, ...never, "give the chart a CategoryAxis there");
});

test("part 14: chart classes without their types in angle brackets: javac's note says which, and an Object from a raw series", () => {
  const raw = fxProgram(["XYChart.Series series = new XYChart.Series();", "series.getData().add(new XYChart.Data(1, 2));", "for (XYChart.Data<Number, Number> point : series.getData()) {", "}"], { imports: CHART_IMPORTS });
  const note = explainDiagnostic({ kind: "note", code: "compiler.note.unchecked.filename", file: "Main.java", line: -1, column: -1, message: "Main.java uses unchecked or unsafe operations.", formatted: "Note: Main.java uses unchecked or unsafe operations." }, raw);
  has(note, "This is a note, not an error: the program compiles and runs.", "here that's because XYChart.Series is written without its types in angle brackets", "XYChart.Series<Number, Number> series = new XYChart.Series<>();");
  has(fxExplain(raw, "for (XYChart", "series.getData()", BAD_TYPES, "incompatible types: Object cannot be converted to Data<Number,Number>"), "series is declared without its types in angle brackets, so for Java its getData() holds plain Objects");
  // With the types written in, the note is the general one, as before.
  const typed = fxProgram(["XYChart.Series<Number, Number> series = new XYChart.Series<>();"], { imports: CHART_IMPORTS });
  const general = explainDiagnostic({ kind: "note", code: "compiler.note.unchecked.filename", file: "Main.java", line: -1, column: -1, message: "Main.java uses unchecked or unsafe operations.", formatted: "Note: Main.java uses unchecked or unsafe operations." }, typed);
  has(general, "This is a note, not an error. Java says it can't check some types for you, most often because of a cast such as (T[]) new Object[10]");
});

test("part 14: a slider's listener for Double, its Number values used as numbers, and doubles from getValue, getWidth and getX where an int is wanted", () => {
  const files = fxProgram(
    ["Slider size = new Slider(0, 100, 50);", "size.valueProperty().addListener((ObservableValue<? extends Double> o, Double oldValue, Double newValue) -> {});", "size.valueProperty().addListener((ObservableValue<? extends Number> o, Double oldValue, Double newValue) -> {});", "size.valueProperty().addListener((o, oldValue, newValue) -> {", "    int width = newValue;", "    double twice = newValue * 2;", "});", "int start = size.getValue();", 'Image photo = new Image("file:photo.png");', "WritableImage copy = new WritableImage(photo.getWidth(), photo.getHeight());", "canvas.setOnMouseClicked(event -> {", "    int x = event.getX();", "});"],
    { imports: [...FX_IMPORTS, "import javafx.scene.control.Slider;", "import javafx.beans.value.ObservableValue;", "import javafx.scene.image.Image;", "import javafx.scene.image.WritableImage;"] },
  );
  const listener = fxExplain(files, "extends Double>", "(Observable", BAD_TYPES, "incompatible types: ChangeListener<Double> cannot be converted to ChangeListener<? super Number>");
  has(listener, "A slider's valueProperty() is a DoubleProperty, and JavaFX makes it an ObservableValue<Number>, not <Double>: its change listeners get Numbers.", "with Number where this says Double", "newValue.doubleValue()");
  has(fxExplain(files, "extends Number>", "{})", BAD_TYPES, "incompatible types: incompatible parameter types in lambda expression"), "its change listeners get Numbers", "where this says Double (Number oldValue, Number newValue)");
  has(fxExplain(files, "int width", "newValue", BAD_TYPES, "incompatible types: Number cannot be converted to int"), "newValue is a Number", "write newValue.intValue(), which drops the decimals");
  has(fxExplain(files, "newValue * 2", "*", "compiler.err.operator.cant.be.applied.1", "bad operand types for binary operator '*'\n  first type:  Number\n  second type: int"), "* doesn't work on it", "newValue.doubleValue() * 2");
  has(fxExplain(files, "int start", "()", BAD_TYPES, "incompatible types: possible lossy conversion from double to int"), "size.getValue() gives a double", "(int) size.getValue() drops the decimals", "(int) Math.round(size.getValue())");
  has(fxExplain(files, "new WritableImage(photo", "(), photo", BAD_TYPES, "incompatible types: possible lossy conversion from double to int"), "photo.getWidth() gives a double: JavaFX measures sizes in doubles", "cast it: (int) photo.getWidth().");
  has(fxExplain(files, "int x = event", "()", BAD_TYPES, "incompatible types: possible lossy conversion from double to int"), "event.getX() gives a double: the mouse's position can be between two pixels", "(int) event.getX()");
  // Outside JavaFX, the general note, as before.
  const plain = program({ "Main.java": ["public class Main {", "    public static void main(String[] args) {", "        int x = Math.sqrt(2);", "    }", "}"] });
  has(explain(plain, "Main.java", 3, "(2)", BAD_TYPES, "incompatible types: possible lossy conversion from double to int"), "This would squeeze a bigger or more precise number type into a smaller one");
});

test("part 14: a double where an int is wanted: the slider's or the mouse's wording only for a slider, a slider's value property, a mouse event or an untyped handler parameter", () => {
  const files = program({ "Main.java": ["import java.util.Map;", "import javafx.application.Application;", "import javafx.scene.canvas.Canvas;", "import javafx.scene.control.Slider;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    private Slider level = new Slider(0, 10, 5);", "", "    @Override", "    public void start(Stage stage) {", "        Map<String, Double> prices = Map.of(\"tea\", 2.5);", "        for (Map.Entry<String, Double> e : prices.entrySet()) {", "            int twice = e.getValue() * 2;", "        }", "        Slider size = new Slider(0, 100, 50);", "        int start = size.getValue();", "        int now = level.getValue();", "        Canvas canvas = new Canvas(100, 100);", "        canvas.setOnMouseClicked(e -> {", "            int x = e.getX();", "        });", "        int v = size.valueProperty().getValue() * 2;", "    }", "}"] });
  const lossy = (text, at) => fxExplain(files, text, at, BAD_TYPES, "incompatible types: possible lossy conversion from double to int");
  // A Map.Entry<String, Double>'s getValue: not a slider's, and a cast to int doesn't take a Double.
  const entry = lossy("int twice", "* 2");
  has(entry, "e.getValue() gives a decimal number", "(int) Math.round(e.getValue()) gives the nearest one, whether e.getValue() gives a double or a Double.");
  lacks(entry, "slider", "(int) e.getValue()");
  // A slider as a local variable and as a field.
  has(lossy("int start", "();"), "size.getValue() gives a double, such as 25.0 or 25.4 (a slider moves", "(int) size.getValue() drops the decimals");
  has(lossy("int now", "();"), "level.getValue() gives a double, such as 25.0 or 25.4 (a slider moves", "(int) level.getValue() drops the decimals");
  // The handler's e has no type written, and the for loop's e (an Entry) has ended: the mouse's wording.
  has(lossy("int x = e.getX()", "();"), "e.getX() gives a double: the mouse's position can be between two pixels", "(int) e.getX()");
  // A slider's value property gives a Double from getValue(), and its get() gives the double that a cast takes.
  const property = lossy("int v = size", "* 2");
  has(property, "size.valueProperty().getValue() gives a double, such as 25.0", "(int) size.valueProperty().get() drops the decimals");
  lacks(property, "(int) size.valueProperty().getValue()");
});

test("part 14: a Number used as a number: the note names what javac points at, and speaks of a slider only for a change listener's parameter", () => {
  const files = program({ "Main.java": ["import java.util.List;", "import javafx.application.Application;", "import javafx.beans.value.ChangeListener;", "import javafx.beans.value.ObservableValue;", "import javafx.scene.control.Slider;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    @Override", "    public void start(Stage stage) {", "        List<Number> nums = List.of(1, 2.5);", "        int first = nums.get(0);", "        Number n = nums.get(1);", "        double half = n / 2;", "        double more = 1 + nums.get(0) * 3;", "        Slider size = new Slider(0, 100, 50);", "        size.valueProperty().addListener((o, was, now) -> {", "            int width = now;", "            double twice = 2 * now;", "        });", "        size.valueProperty().addListener(new ChangeListener<Number>() {", "            @Override", "            public void changed(ObservableValue<? extends Number> o, Number oldValue, Number newValue) {", "                long w = newValue;", "            }", "        });", "        int v = size.valueProperty().getValue();", "    }", "}"] });
  const op = (o, first, second) => `bad operand types for binary operator '${o}'\n  first type:  ${first}\n  second type: ${second}`;
  // A call: javac's caret is on its parenthesis.
  const call = fxExplain(files, "int first", "(0)", BAD_TYPES, "incompatible types: Number cannot be converted to int");
  has(call, "nums.get(0) is a Number, an object that holds a number", "write nums.get(0).intValue(), which drops the decimals (or nums.get(0).doubleValue() for the double)");
  lacks(call, "newValue", "slider");
  // Arithmetic on a Number that isn't a listener's: its own name, on the side javac says.
  const half = fxExplain(files, "n / 2", "/", "compiler.err.operator.cant.be.applied.1", op("/", "Number", "int"));
  has(half, "n is a Number, an object that holds a number, and / doesn't work on it", "n.doubleValue() gives it as a double", "as in n.doubleValue() / 2");
  lacks(half, "newValue", "slider");
  has(fxExplain(files, "1 + nums", "*", "compiler.err.operator.cant.be.applied.1", op("*", "Number", "int")), "nums.get(0) is a Number", "as in nums.get(0).doubleValue() * 3");
  // A lambda listener's parameter named now, and a Number on the right of the operator.
  const width = fxExplain(files, "int width", "now", BAD_TYPES, "incompatible types: Number cannot be converted to int");
  has(width, "now is a Number: a slider's change listener gets its old and new value as Numbers", "write now.intValue()");
  lacks(width, "newValue");
  const twice = fxExplain(files, "2 * now", "*", "compiler.err.operator.cant.be.applied.1", op("*", "int", "Number"));
  has(twice, "now is a Number (a slider's change listener gets", "now.doubleValue() gives it as a double", "as in 2 * now.doubleValue()");
  lacks(twice, "newValue");
  // An anonymous ChangeListener's changed.
  has(fxExplain(files, "long w", "newValue", BAD_TYPES, "incompatible types: Number cannot be converted to long"), "newValue is a Number: a slider's change listener gets", "write newValue.longValue()");
});

test("part 14: sound can't play in this page: javafx.scene.media and its classes say so plainly", () => {
  const files = fxProgram(['AudioClip bell = new AudioClip("file:bell.wav");'], { imports: [...FX_IMPORTS, "import javafx.scene.media.AudioClip;", "import javafx.scene.media.*;"] });
  const sound = "Sound can't play in this page: the browser engine that runs your program here has no way to play it";
  has(fxExplain(files, "media.AudioClip", "AudioClip", "compiler.err.doesnt.exist", "package javafx.scene.media does not exist"), "AudioClip (javafx.scene.media.AudioClip) is part of real JavaFX, for sound.", sound, "run the program with real JavaFX on your own computer");
  const video = "Sound and video can't play in this page: the browser engine that runs your program here has no way to play them, so the practice version has nothing of javafx.scene.media (AudioClip, Media, MediaPlayer, MediaView)";
  has(fxExplain(files, "media.*", "import", "compiler.err.doesnt.exist", "package javafx.scene.media does not exist"), "The package javafx.scene.media is part of real JavaFX, for sound and video.", video, "to hear or see it");
  has(fxExplain(files, "AudioClip bell", "AudioClip", NOT_FOUND, "cannot find symbol\n  symbol:   class AudioClip\n  location: class Main"), "AudioClip is part of real JavaFX (javafx.scene.media.AudioClip), for sound.", sound);
  lacks(fxExplain(files, "AudioClip bell", "AudioClip", NOT_FOUND, "cannot find symbol\n  symbol:   class AudioClip\n  location: class Main"), "video");
  // Media, MediaPlayer and MediaView play video too.
  const media = fxProgram(['Media clip = new Media("file:film.mp4");', "MediaView view = new MediaView();"], { imports: [...FX_IMPORTS, "import javafx.scene.media.MediaView;"] });
  has(fxExplain(media, "media.MediaView", "MediaView", "compiler.err.doesnt.exist", "package javafx.scene.media does not exist"), "MediaView (javafx.scene.media.MediaView) is part of real JavaFX, for sound and video.", video);
  has(fxExplain(media, "Media clip", "Media", NOT_FOUND, "cannot find symbol\n  symbol:   class Media\n  location: class Main"), "Media is part of real JavaFX (javafx.scene.media.Media), for sound and video.", video, "to hear or see it");
});

/** A part 14 program's start, with its imports, for crashes: `body` from line 10 on. */
const crash14 = (body) => ["import javafx.application.Application;", "import javafx.scene.chart.*;", "import javafx.scene.control.*;", "import javafx.scene.image.*;", "import javafx.scene.paint.Color;", "import javafx.stage.Stage;", "", "public class Main extends Application {", "    public void start(Stage stage) {", ...body.map((l) => `        ${l}`), "    }", "}"];
/** The cause of "Exception in Application start method", thrown in the library and passing through start at `line`. */
const startCrash = (lines, cause, javaFrames, line) => explainCrash(fxWrapped("Exception in Application start method", cause, `${javaFrames.map((f) => `\tat ${f}\n`).join("")}\tat Main.start(Main.java:${line})\n`), program({ "Main.java": lines }));

test("part 14 crashes: colors out of range, and text Color.web can't read", () => {
  const lines = crash14(["Color a = Color.rgb(300, 0, 0);", "Color b = Color.color(1.5, 0, 0);", "Color c = new Color(255, 0, 0, 1);", "Color d = Color.rgb(10, 20, 30, 2.0);", 'Color e = Color.web("#ff00zz");']);
  const rgb = startCrash(lines, "java.lang.IllegalArgumentException: Color.rgb's red parameter (300) expects color values 0-255", ["javafx.scene.paint.Color.checkByte(Color.java:365)", "javafx.scene.paint.Color.rgb(Color.java:357)", "javafx.scene.paint.Color.rgb(Color.java:352)"], 10);
  has(rgb.explanation, "Color.rgb(red, green, blue) takes each part of the color as a whole number from 0 to 255, and its red was 300.", "Math.min(255, value)");
  const color = startCrash(lines, "java.lang.IllegalArgumentException: Color's red value (1.5) must be in the range 0.0-1.0", ["javafx.scene.paint.Color.check(Color.java:332)", "javafx.scene.paint.Color.<init>(Color.java:320)", "javafx.scene.paint.Color.color(Color.java:347)", "javafx.scene.paint.Color.color(Color.java:342)"], 11);
  has(color.explanation, "Color.color(red, green, blue) takes each part of the color as a decimal number from 0.0 to 1.0, not from 0 to 255, and its red was 1.5.");
  const made = startCrash(lines, "java.lang.IllegalArgumentException: Color's red value (255.0) must be in the range 0.0-1.0", ["javafx.scene.paint.Color.check(Color.java:332)", "javafx.scene.paint.Color.<init>(Color.java:320)"], 12);
  has(made.explanation, "new Color(red, green, blue, opacity) takes each part", "its red was 255.0", "use Color.rgb(...) instead, as in Color.rgb(255, 0, 0)");
  const opacity = startCrash(lines, "java.lang.IllegalArgumentException: Color's opacity value (2.0) must be in the range 0.0-1.0", ["javafx.scene.paint.Color.check(Color.java:332)", "javafx.scene.paint.Color.<init>(Color.java:320)", "javafx.scene.paint.Color.color(Color.java:347)", "javafx.scene.paint.Color.rgb(Color.java:358)"], 13);
  has(opacity.explanation, "The opacity, the last value of Color.rgb(red, green, blue, opacity), is a decimal number from 0.0 (fully see-through) to 1.0 (solid), and it was 2.0.");
  const web = startCrash(lines, "java.lang.IllegalArgumentException: Invalid color specification", ["javafx.scene.paint.Color.invalid(Color.java:424)", "javafx.scene.paint.Color.web(Color.java:415)", "javafx.scene.paint.Color.web(Color.java:376)"], 14);
  has(web.explanation, "Color.web(text) reads a color written as on a web page", 'Here it got "#ff00zz".');
  // The same message from the program's own throw is still the program's own.
  const own = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Invalid color specification\n\tat Main.check(Main.java:3)\n\tat Main.main(Main.java:6)\n', program({ "Main.java": ["public class Main {", "    static void check() {", '        throw new IllegalArgumentException("Invalid color specification");', "    }", "    public static void main(String[] args) {", "        check();", "    }", "}"] }));
  has(own.explanation, "Your own code threw it on purpose, with the throw in check");
});

test("part 14 crashes: an image that didn't load, a name without file:, a pixel outside the image, a size of 0, and a null color", () => {
  const lines = crash14(['Image photo = new Image("file:missing.png");', "PixelReader reader = photo.getPixelReader();", "System.out.println(reader.getColor(0, 0));", 'Image other = new Image("landscape.png");', "WritableImage copy = new WritableImage(10, 5);", "copy.getPixelWriter().setColor(3, 5, Color.RED);", "System.out.println(copy.getPixelReader().getArgb(10, 0));", "WritableImage none = new WritableImage(0, 5);", "Color shade = null;", "copy.getPixelWriter().setColor(0, 0, shade);"]);
  const reader = startCrash(lines, 'java.lang.NullPointerException: Cannot invoke "javafx.scene.image.PixelReader.getColor(int, int)" because "<local3>" is null', [], 12);
  has(reader.explanation, "getPixelReader() gave null: the image has no pixels to read, because it couldn't be loaded", "new Image(...) doesn't throw then", "isError() is true", "print image.getException()");
  const url = startCrash(lines, "java.lang.IllegalArgumentException: Invalid URL: Invalid URL or resource not found", ["arena.fx.Images.load(Images.java:92)", "javafx.scene.image.Image.<init>(Image.java:40)"], 13);
  has(url.explanation, 'new Image(...) got "landscape.png" without file: in front', 'write new Image("file:landscape.png")');
  const write = startCrash(lines, "java.lang.IndexOutOfBoundsException: 3, 5", ["javafx.scene.image.Image.check(Image.java:91)", "javafx.scene.image.WritableImage$Writer.setArgb(WritableImage.java:37)", "javafx.scene.image.WritableImage$Writer.setColor(WritableImage.java:50)"], 15);
  has(write.explanation, "The program wrote the pixel at x 3, y 5, and that's outside the image", "from y 0 to getHeight() - 1 down", "A loop with <= instead of <, or x and y swapped");
  const read = startCrash(lines, "java.lang.IndexOutOfBoundsException: 10, 0", ["javafx.scene.image.Image.check(Image.java:91)", "javafx.scene.image.Image$Reader.getArgb(Image.java:104)"], 16);
  has(read.explanation, "The program read the pixel at x 10, y 0");
  // A list's index error keeps its own explanation.
  const list = explainCrash('Exception in thread "main" java.lang.IndexOutOfBoundsException: Index 3 out of bounds for length 3\n\tat java.base/java.util.ArrayList.get(ArrayList.java:427)\n\tat Main.main(Main.java:5)\n', ["Main.java"]);
  has(list.explanation, "The program asked for index 3 of a list with 3 values.");
  const zero = startCrash(lines, "java.lang.IllegalArgumentException: Image dimensions must be positive (w,h > 0)", ["arena.fx.Images.checkSize(Images.java:149)", "arena.fx.Images.blank(Images.java:155)", "javafx.scene.image.WritableImage.<init>(WritableImage.java:18)"], 17);
  has(zero.explanation, "new WritableImage(width, height) needs a width and a height of at least 1 pixel", "they're 0 when it couldn't be loaded");
  const nullColor = startCrash(lines, "java.lang.NullPointerException: Color cannot be null", ["javafx.scene.image.WritableImage$Writer.setColor(WritableImage.java:44)"], 19);
  has(nullColor.explanation, "The program gave setColor null instead of a color: shade holds no Color.");
});

test("part 14 crashes: a series or a point added twice, null series, points and values, a bar chart's axes, one axis twice, a category twice", () => {
  const lines = crash14(["LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());", "XYChart.Series<Number, Number> s = new XYChart.Series<>();", "chart.getData().add(s);", "chart.getData().add(s);"]);
  const files = program({ "Main.java": lines });
  // Printed on the JavaFX Application Thread (the chart's list listener threw it): the grader reads it with handler: true.
  const fxThread = (cause, frames, line) => explainCrash(`Exception in thread "main" ${cause}\n${frames.map((f) => `\tat ${f}\n`).join("")}\tat Main.start(Main.java:${line})\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n`, files, { handler: true });
  const listFrames = ["arena.fx.Charts$2.changed(Charts.java:266)", "arena.fx.ObservableArrayList.changed(ObservableArrayList.java:52)", "arena.fx.ObservableArrayList.add(ObservableArrayList.java:95)", "java.base/java.util.AbstractList.add(AbstractList.java:113)"];
  has(fxThread("java.lang.IllegalArgumentException: Duplicate series added", listFrames, 13).explanation, "The program added a series to a chart that already has it", "create another XYChart.Series");
  has(fxThread("java.lang.IllegalArgumentException: Duplicate data added", listFrames, 13).explanation, "the same XYChart.Data object twice", "create a new XYChart.Data<>(x, y) for each point");
  has(fxThread('java.lang.NullPointerException: Cannot read field "setToRemove" because "<local5>" is null', listFrames, 13).explanation, "The program added null to a chart's series");
  has(fxThread('java.lang.NullPointerException: Cannot read field "setToRemove" because "<local6>" is null', listFrames, 13).explanation, "The program added null to a series' data points");
  has(fxThread('java.lang.NullPointerException: Cannot invoke "java.lang.Number.doubleValue()" because the return value of "javafx.scene.chart.XYChart$Data.getYValue()" is null', listFrames, 13).explanation, "A data point of the chart has null for its x or y value");
  has(fxThread("java.lang.IllegalArgumentException: Children: duplicate children added: parent = Group@76e6cad[styleClass=plot-content]", listFrames, 13).explanation, "the same data point in two series of one chart");
  const chartFrames = ["arena.fx.Charts.checkAxes(Charts.java:58)", "javafx.scene.chart.BarChart.<init>(BarChart.java:20)"];
  has(startCrash(lines, "java.lang.IllegalArgumentException: Axis type incorrect, one of X,Y should be CategoryAxis and the other NumberAxis", chartFrames, 10).explanation, "A BarChart needs one CategoryAxis, for the bars' names, and one NumberAxis, for their heights");
  has(startCrash(lines, "java.lang.IllegalArgumentException: Children: duplicate children added: parent = Chart$1@14b5984b[styleClass=chart-content]", chartFrames, 10).explanation, "The program gave a chart the same axis twice");
  has(startCrash(lines, "java.lang.IllegalArgumentException: Duplicate category added; A already present", ["arena.fx.Charts.checkCategories(Charts.java:72)", "javafx.scene.chart.CategoryAxis.<init>(CategoryAxis.java:23)"], 10).explanation, 'A CategoryAxis\'s categories must all be different, and "A" is in its list twice.');
  has(startCrash(lines, 'java.lang.NullPointerException: Cannot invoke "javafx.scene.chart.Axis.getSide()" because "<parameter1>" is null', ["arena.fx.Charts.checkAxes(Charts.java:46)", "javafx.scene.chart.LineChart.<init>(LineChart.java:20)"], 10).explanation, "The program created a chart with null for its x axis.");
  // A pane's own duplicate keeps its explanation.
  const pane = startCrash(lines, "java.lang.IllegalArgumentException: Children: duplicate children added: parent = HBox@6344e235", ["javafx.scene.Parent$Children.check(Parent.java:83)"], 10);
  has(pane.explanation, "The program added a node to an HBox that already holds it");
});
