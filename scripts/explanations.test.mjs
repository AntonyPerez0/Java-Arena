// Tests of the plain-English explanations of part 11 mistakes (src/engine/friendly.ts): exceptions,
// packages and files; and of part 12: type parameters, lists and hash maps of your own, Random and
// two-dimensional arrays. Each diagnostic is javac's own (the same on the JDK and in the browser, as the
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
