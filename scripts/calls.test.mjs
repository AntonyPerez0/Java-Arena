// Tests of why the check program couldn't use the learner's code (src/grader/calls.ts), for classes
// in packages: what isn't public, and what is private or protected. Each message is javac's own for
// the check program's line (the same on the JDK and in the browser). Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { buildSync } from "esbuild";

// calls.ts is TypeScript that imports other modules: bundle it into one module to import it here.
const bundle = buildSync({ entryPoints: [new URL("../src/grader/calls.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { explainCalls } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const MAIN = "public class Main {\n    public static void main(String[] args) {\n    }\n}\n";

/** The learner's files as the grader joins them: Main.java, then each { path: text }. */
const source = (files) => ["// ==== Main.java ====\n" + MAIN, ...Object.entries(files).map(([path, text]) => `// ==== ${path} ====\n${text}`)].join("\n");
const item = (body, pub = "public ") => ({ "shop/model/Item.java": `package shop.model;\n\n${pub}class Item {\n${body}}\n` });

/** What the grader says when the check program's line with `call` gets javac's `message`. */
function explain(files, call, code, message) {
  const d = { kind: "error", code, file: "ArenaCheck.java", line: 9, column: 1, message };
  const [said, ...more] = explainCalls([d], [{ from: 9, to: 9 }], [{ call }], source(files));
  assert.equal(more.length, 0);
  assert.ok(said.startsWith(`The check runs \`${call}\`, but `), said);
  return said;
}
const has = (text, ...parts) => {
  for (const p of parts) assert.ok(text.includes(p), `missing ${JSON.stringify(p)} in: ${text}`);
};
const lacks = (text, ...parts) => {
  for (const p of parts) assert.ok(!text.includes(p), `${JSON.stringify(p)} shouldn't be in: ${text}`);
};

const NOT_PUBLIC = "compiler.err.not.def.public.cant.access";
const ACCESS = "compiler.err.report.access";
const notPublic = (what, where) => `${what} is not public in ${where}; cannot be accessed from outside package`;

test("a class of a package that isn't public: write public in front of it, with its own keyword", () => {
  let said = explain(item("", ""), "new shop.model.Item()", NOT_PUBLIC, notPublic("Item", "shop.model"));
  has(said, "your class `Item` in the package `shop.model` isn't `public`", "`public class Item`");
  said = explain({ "shop/model/Priced.java": "package shop.model;\n\ninterface Priced {\n}\n" }, "shop.model.Priced p = null;", NOT_PUBLIC, notPublic("Priced", "shop.model"));
  has(said, "your interface `Priced` in the package `shop.model`", "`public interface Priced`");
  lacks(said, "public class");
  // A package with a capital letter is still a package, not a class.
  said = explain({ "Shop/Item.java": "package Shop;\n\nclass Item {\n}\n" }, "new Shop.Item()", NOT_PUBLIC, notPublic("Item", "Shop"));
  has(said, "your class `Item` in the package `Shop`");
});

test("a class of a package that isn't public, used by its simple name, gets its keyword too", () => {
  const said = explain({ "shop/model/Priced.java": "package shop.model;\n\ninterface Priced {\n}\n" }, "Priced p = null;", "compiler.err.cant.resolve.location", "cannot find symbol\n  symbol:   class Priced\n  location: class ArenaCheck");
  has(said, "your interface `Priced` (in `shop/model/Priced.java`) isn't `public`", "`public interface Priced`");
});

test("a variable or a type inside a class, without public, isn't called a class of a package", () => {
  let said = explain(item("    int price = 3;\n"), "new Item().price", NOT_PUBLIC, notPublic("price", "Item"));
  has(said, "your variable `price` in `Item` isn't `public`", "Write `public` in front of it.");
  lacks(said, "package `Item`", "public class", "getter");
  said = explain(item("    static class Part {\n    }\n"), "new Item.Part()", NOT_PUBLIC, notPublic("Part", "Item"));
  has(said, "your class `Part` inside `Item` isn't `public`", "Write `public` in front of it.");
  lacks(said, "package `Item`");
  said = explain(item("    interface Part {\n    }\n"), "Item.Part p = null;", NOT_PUBLIC, notPublic("Part", "Item"));
  has(said, "your interface `Part` inside `Item`");
  said = explain(item("    enum Size { S, M }\n"), "Item.Size.S", NOT_PUBLIC, notPublic("Size", "Item"));
  has(said, "your enum `Size` inside `Item`");
  // A class whose name starts with a small letter is still a class.
  said = explain({ "shop/model/item.java": "package shop.model;\n\npublic class item {\n    int price = 3;\n}\n" }, "new item().price", NOT_PUBLIC, notPublic("price", "item"));
  has(said, "your variable `price` in `item`");
});

test("javac's own words go in a code span, so a type such as List<String> shows as written", () => {
  has(explain({}, "sum(List.of(1))", "compiler.err.prob.found.req", "incompatible types: List<Integer> cannot be converted to int"), "the types don't fit (`List<Integer> cannot be converted to int`)");
  has(explain({}, "sum(1)", "compiler.err.some.other", "something about List<String>"), "javac says: `something about List<String>`.");
});

test("a method or a constructor without public is named as such", () => {
  has(explain(item("    int price() {\n        return 3;\n    }\n"), "new Item().price()", NOT_PUBLIC, notPublic("price()", "Item")), "your method `price` in `Item` isn't `public`", "can't call it");
  has(explain(item("    Item(int p) {\n    }\n"), "new Item(3)", NOT_PUBLIC, notPublic("Item(int)", "Item")), "the constructor of `Item` isn't `public`");
});

test("something protected: only its package and its subclasses may use it, so it needs public", () => {
  for (const [body, call, what, says] of [
    ["    protected int price = 3;\n", "new Item().price", "price", "your variable `price` in `Item`"],
    ["    protected int price() {\n        return 3;\n    }\n", "new Item().price()", "price()", "your method `price` in `Item`"],
    ["    protected Item(int p) {\n    }\n", "new Item(3)", "Item(int)", "the constructor of `Item`"],
  ]) {
    const said = explain(item(body), call, ACCESS, `${what} has protected access in Item`);
    has(said, `${says} is \`protected\``, "the classes that extend `Item`", "Write `public` instead of `protected`.");
    lacks(said, "Leave out `private`");
  }
  // javac names the class with its package when two share a name.
  has(explain(item("    protected int price = 3;\n"), "new shop.model.Item().price", ACCESS, "price has protected access in shop.model.Item"), "your variable `price` in `Item` is `protected`");
});

test("something private: leave out private in no package, write public in a package", () => {
  let said = explain(item("    private int price() {\n        return 3;\n    }\n"), "new Item().price()", ACCESS, "price() has private access in Item");
  has(said, "your method `price` in `Item` is `private`", "`shop/model/Item.java`", "Write `public` instead of `private`.");
  lacks(said, "Leave out");
  said = explain({ "Item.java": "public class Item {\n    private int price() {\n        return 3;\n    }\n}\n" }, "new Item().price()", ACCESS, "price() has private access in Item");
  has(said, "your method `price` in `Item` is `private`, so only code inside `Item` can call it. Leave out `private`.");
});
