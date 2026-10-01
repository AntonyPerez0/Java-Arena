// Tests of the plain-English explanations of part 11 mistakes (src/engine/friendly.ts): exceptions,
// packages and files. Each diagnostic is javac's own (the same on the JDK and in the browser, as the
// fidelity suite checks), rebuilt here from its code, place and message. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";

// friendly.ts is TypeScript that imports other modules: bundle it into one module to import it here.
const bundle = buildSync({ entryPoints: [new URL("../src/engine/friendly.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { explainCrash, explainDiagnostic } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

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
  const library = explainCrash('Exception in thread "main" java.lang.IllegalArgumentException: Illegal Capacity: -1\n\tat java.base/java.util.ArrayList.<init>(ArrayList.java:160)\n\tat Main.main(Main.java:5)\n');
  assert.equal(library.placed, undefined);
  has(library.explanation, "A method of Java's own, called on this line, refused a value it was given: Illegal Capacity: -1.");
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
