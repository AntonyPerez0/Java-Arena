// Tests of src/components/code-lines.ts: drill code drawn line by line so it can wrap on a phone.
// The drawn text is exactly the code (for every drill), and a long line may break only where a
// reader expects it: at spaces, before a member's dot, after an opening parenthesis; never inside
// a string or char literal, a name or a number.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { codeLinesHtml, codePieces, deepestIndent, indentOf, lineBits, pieceLines } from "../src/components/code-lines.ts";

/** The text an HTML string shows (its tags removed, entities decoded). */
const textOf = (html) => html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
/** One line's HTML with each break point shown as "|" and nothing else. */
const breaks = (code) => textOf(codeLinesHtml(code).replace(/<wbr>/g, "|"));
/** The literal boxes of a line, as text. */
const boxes = (code) => [...codeLinesHtml(code).matchAll(/<span class="lit"><span class="tk-str">([^<]*)<\/span>([^<]*)<\/span>/g)].map((m) => textOf(m[1] + m[2]));

test("every drill's code, solution and task code blocks: the lines drawn are exactly the code", () => {
  const drills = JSON.parse(readFileSync(new URL("../src/generated/drills.json", import.meta.url), "utf8"));
  let n = 0;
  for (const d of [...drills.drills, ...drills.placement]) {
    const codes = [d.display, d.exercise?.solution, ...[...(d.prompt ?? "").matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((m) => m[1].replace(/\n$/, ""))].filter(Boolean);
    for (const code of codes) {
      for (const colors of [true, false]) assert.equal(textOf(codeLinesHtml(code, colors)), code, `${d.id}: ${code.slice(0, 60)}`);
      n++;
    }
  }
  assert.ok(n > 800, `only ${n} pieces of code`);
});

test("a long line may break before a member's dot and after an opening parenthesis", () => {
  assert.equal(breaks('javafx.scene.control.Label score = new javafx.scene.control.Label("0");'), 'javafx|.scene|.control|.Label score = new javafx|.scene|.control|.Label(|"0");');
  assert.equal(breaks("System.out.println(totalPoints(defeated));"), "System|.out|.println(|totalPoints(|defeated));");
  assert.equal(breaks("list.stream().map(x -> x * 2)"), "list|.stream()|.map(|x -> x * 2)");
  // Not in a cast or around one name, not in an empty pair, not in a number, not before a dot that starts the line.
  assert.equal(breaks("Stamp other = (Stamp) compared;"), "Stamp other = (Stamp) compared;");
  assert.equal(breaks("int total = (count) + 1;"), "int total = (count) + 1;");
  assert.equal(breaks("double d = 3.14;"), "double d = 3.14;");
  assert.equal(breaks("        .filter(t -> t.isEmpty())"), "        .filter(|t -> t|.isEmpty())");
  // A string's own dots and parentheses are not break points.
  assert.equal(breaks('print("a.b(c)");'), 'print(|"a.b(c)");');
  // Commented-out code breaks the same way.
  assert.equal(breaks('/* System.out.println("middle"); */'), '/* System|.out|.println(|"middle"); */');
});

test("a string or char literal and the closing marks after it are one box, with a line-ending brace", () => {
  assert.deepEqual(boxes('frame.setTop(new Label("Menu"));'), ['"Menu"));']);
  assert.deepEqual(boxes('String s = a + " " + b;'), ['" "']);
  assert.deepEqual(boxes("char c = ' ';"), ["' ';"]);
  assert.deepEqual(boxes('if (command.equals("quit")) {'), ['"quit")) {']);
  assert.deepEqual(boxes('map.put("a", 1);'), ['"a",']);
  // A brace that ends the line stays with what comes before it.
  assert.match(codeLinesHtml("public void add(String name) {"), /name\)<span class="keep"> \{<\/span><\/span>$/);
  assert.doesNotMatch(codeLinesHtml("    {"), /<span class="keep"> \{/);
});

test("each line is an element with its indent and the code's deepest indent; its leading spaces are glued to its first character", () => {
  const html = codeLinesHtml("class A {\n    void f() {\n        g();\n    }\n\n}");
  const lines = html.split("\n");
  assert.equal(lines.length, 6);
  assert.equal(lines[4], "", "an empty line is just its line break");
  assert.match(lines[0], /^<span class="cl" style="--indent: 0; --deep: 8">/);
  // The line can't break right after its indentation (a row that looks empty).
  assert.match(lines[2], /^<span class="cl" style="--indent: 8; --deep: 8"><span class="keep"><span class="ind"> {8}<\/span><span class="tk-fn">g<\/span><\/span>\(\);<\/span>$/);
  // Not to a literal box, which moves as a whole.
  assert.match(codeLinesHtml('    "a" + b;'), /^<span class="cl" style="--indent: 4; --deep: 4"><span class="keep"><span class="ind"> {4}<\/span><\/span><span class="lit">/);
  assert.match(codeLinesHtml("    .filter(x)", false), /<span class="keep"><span class="ind"> {4}<\/span>\.<\/span>filter\(<wbr>x\)<\/span>$/);
  assert.equal(indentOf("      x"), 6);
  assert.equal(deepestIndent(["a", "    b", "  c"]), 4);
  // Without colors (a block not marked as Java) the text is plain, still in lines and boxes.
  const plain = codeLinesHtml('System.out.println("x");', false);
  assert.doesNotMatch(plain, /tk-/);
  assert.match(plain, /<span class="lit">"x"\);<\/span>/);
});

test("a fill-in's blank takes its place in the line", () => {
  const pieces = [...codePieces("keypad.add(open, "), { node: "BLANK" }, ...codePieces(", 3);")];
  const [line] = pieceLines(pieces);
  const bits = lineBits(line);
  assert.ok(bits.some((b) => b.node === "BLANK"));
  // The parenthesis before the arguments is a break point; the blank doesn't stop it.
  assert.ok(bits.some((b) => b.parts?.includes(null)));
});
