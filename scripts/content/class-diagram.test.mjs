// Tests of the class diagrams in lesson text (class-diagram.mjs): reading the text, the build's
// messages for mistakes, the layout, and the HTML both Markdown renderers pass through.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { marked } from "marked";
import { ANY_CLASSES, classDiagram, drawClassDiagrams, layoutClassDiagram, parseClassDiagram, UNDRAWN_CLASSES, withoutClassDiagrams } from "./class-diagram.mjs";

const lines = (...xs) => xs.join("\n") + "\n";

const PERSON = lines("class Person", "- name: String", "- age: int", "+ Person(name: String, age: int)", "+ getName(): String");
const FAMILY = lines(
  "class Person",
  "- name: String",
  "+ Person(name: String)",
  "",
  "class Student extends Person",
  "- credits: int",
  "+ study(): void",
  "",
  "class Teacher extends Person",
  "- salary: int",
);
const READABLE = lines("interface Readable", "+ read(): String", "", "class Email implements Readable", "+ read(): String", "", "class Ebook implements Readable", "- pages: ArrayList<String>", "+ read(): String");
const COURSE = lines("class Course", "- name: String", "", "class Student", "- name: String", "", "class Ticket", "", "class Show", "", "Course --> * Student", "Ticket --> Show");
const SHAPES = lines("abstract class Shape", "+ area(): double {abstract}", "+ getName(): String", "", "class Circle extends Shape", "+ area(): double", "", "class Square extends Shape", "+ area(): double");
const SIX = lines(
  "abstract class Person",
  "- name: String",
  "+ describe(): String {abstract}",
  "",
  "interface Saveable",
  "+ save(): void",
  "",
  "class Student extends Person implements Saveable",
  "- studentNumber: int",
  "+ save(): void",
  "",
  "class Teacher extends Person",
  "- salary: int",
  "",
  "class Course",
  "- name: String",
  "",
  "class Room",
  "",
  "Course --> * Student",
  "Course --> Teacher",
  "Course --> 0..1 Room",
);
const SAMPLES = { PERSON, FAMILY, READABLE, COURSE, SHAPES, SIX };

const errorsOf = (src) => parseClassDiagram(src).errors;
const expectError = (src, pattern) => {
  const errors = errorsOf(src);
  assert.ok(
    errors.some((e) => pattern.test(e)),
    `expected an error like ${pattern}, got ${JSON.stringify(errors)}`,
  );
};

test("reads classes, members and connections", () => {
  const { classes, relations, errors } = parseClassDiagram(SIX);
  assert.deepEqual(errors, []);
  assert.deepEqual(
    classes.map((c) => [c.name, c.kind, c.abstract]),
    [
      ["Person", "class", true],
      ["Saveable", "interface", false],
      ["Student", "class", false],
      ["Teacher", "class", false],
      ["Course", "class", false],
      ["Room", "class", false],
    ],
  );
  const student = classes[2];
  assert.deepEqual(student.extends, ["Person"]);
  assert.deepEqual(student.implements, ["Saveable"]);
  assert.deepEqual(student.fields.map((f) => f.vis + f.text), ["-studentNumber: int"]);
  assert.deepEqual(classes[0].methods.map((m) => [m.text, m.abstract]), [["describe(): String", true]]);
  assert.deepEqual(
    relations.map((r) => [r.from, r.fromMult, r.directed, r.toMult, r.to]),
    [
      ["Course", "", true, "*", "Student"],
      ["Course", "", true, "", "Teacher"],
      ["Course", "", true, "0..1", "Room"],
    ],
  );
  const person = parseClassDiagram(PERSON).classes[0];
  assert.deepEqual(
    [...person.fields, ...person.methods].map((m) => [m.kind, m.vis]),
    [
      ["field", "-"],
      ["field", "-"],
      ["constructor", "+"],
      ["method", "+"],
    ],
  );
});

test("reads both-way connections, multiplicities at both ends, role names and ...", () => {
  const src = lines("class Customer", "- id: String", "...", "", "class Order", "", "class Product", "", "Customer 1 -- * Order", "Order --> 1..* Product : items");
  const { classes, relations, errors } = parseClassDiagram(src);
  assert.deepEqual(errors, []);
  assert.equal(classes[0].fields[1].kind, "more");
  assert.deepEqual(
    relations.map((r) => [r.from, r.fromMult, r.directed, r.toMult, r.to, r.label]),
    [
      ["Customer", "1", false, "*", "Order", ""],
      ["Order", "", true, "1..*", "Product", "items"],
    ],
  );
});

test("a malformed block gets a message that names its line", () => {
  expectError(lines("class A", "", "A --> B"), /^line 3: B isn't in the diagram; add it/);
  expectError(lines("class A", "", "- name: String"), /^line 3: "- name: String" is outside a class/);
  expectError(lines("- name: String"), /^line 1: .*outside a class/);
  expectError(lines("klass A"), /^line 1: can't read "klass A"/);
  expectError(lines("class"), /^line 1: .*needs a plain Java name/);
  expectError(lines("class A", "", "class A"), /^line 3: A is in the diagram twice/);
  expectError(lines("class A extends B"), /^line 1: A extends B, which isn't in the diagram; add it/);
  expectError(lines("class Person", "", "class Student extends Persn"), /^line 3: Student extends Persn, which isn't in the diagram \(did you mean Person\?\)$/);
  expectError(lines("class Course", "", "class Student", "", "Course --> * student"), /^line 5: student isn't in the diagram \(did you mean Student\?\)$/);
  expectError(lines("class A implements B", "", "class B"), /^line 1: A implements B, which is a class: write "extends B"/);
  expectError(lines("interface B", "", "class A extends B"), /^line 3: A extends B, which is an interface: write "implements B"/);
  expectError(lines("class A", "", "class B", "", "class C extends A, B"), /a class extends one class/);
  expectError(lines("interface A implements B", "", "interface B"), /an interface extends other interfaces/);
  expectError(lines("class A extends B", "", "class B extends A"), /extend each other in a circle/);
  expectError(lines("class A", "+ run(): void", "- count: int"), /^line 3: the field count comes after a method/);
  expectError(lines("class A", "+ area(): double {abstract}"), /A isn't an abstract class: write "abstract class A"/);
  expectError(lines("class A", "+ A(): void"), /a constructor has no return type/);
  expectError(lines("class A", "+ count: int {static}"), /\{static\} isn't known/);
  expectError(lines("class A", "+ count"), /a field is written/);
  expectError(lines("class A", "", "A --> A"), /from A to itself/);
  expectError(lines("class A", "", "class B", "", "A --> B", "B --> * A"), /^line 6: B and A are already connected on line 5/);
  expectError(lines("class A", "", "class B", "", "A --> 3..1 B"), /the multiplicity 3\.\.1 counts down/);
  expectError("", /the diagram has no classes/);
  expectError(Array.from({ length: 13 }, (_, i) => `class C${i}`).join("\n\n"), /the diagram has 13 classes; 12 is the most/);
});

test("the build's messages number the diagrams and leave a broken block as it was", () => {
  const md = lines("Text.", "", "```classes", PERSON.trimEnd(), "```", "", "```classes", "class A", "", "A --> B", "```");
  const messages = [];
  const out = drawClassDiagrams(md, (m) => messages.push(m));
  assert.deepEqual(messages, ["class diagram 2: line 3: B isn't in the diagram; add it (a header line alone, like \"class B\", is enough)"]);
  assert.match(out, /<figure class="uml">/);
  assert.match(out, /```classes\nclass A\n\nA --> B\n```/);
});

/** True when a straight segment passes through the inside of a box (touching its edge is fine). */
function crossesBox([x0, y0], [x1, y1], b) {
  const inset = 0.5;
  const [lx, hx, ly, hy] = [b.x + inset, b.x + b.w - inset, b.y + inset, b.y + b.h - inset];
  if (x0 === x1) return x0 > lx && x0 < hx && Math.max(y0, y1) > ly && Math.min(y0, y1) < hy;
  if (y0 === y1) return y0 > ly && y0 < hy && Math.max(x0, x1) > lx && Math.min(x0, x1) < hx;
  // An arrowhead's slanted strokes: check a few points along it.
  return [0.25, 0.5, 0.75].some((t) => {
    const [x, y] = [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    return x > lx && x < hx && y > ly && y < hy;
  });
}

for (const [name, src] of Object.entries(SAMPLES))
  test(`layout of ${name}: parents above children, no boxes overlap, no line crosses a box`, () => {
    const parsed = parseClassDiagram(src);
    assert.deepEqual(parsed.errors, []);
    const layout = layoutClassDiagram(parsed);
    const { boxes, wires } = layout;
    const at = new Map(parsed.classes.map((c, i) => [c.name, boxes[i]]));
    for (const c of parsed.classes)
      for (const p of [...c.extends, ...c.implements]) assert.ok(at.get(p).y + at.get(p).h < at.get(c.name).y, `${p} is above ${c.name}`);
    boxes.forEach((a, i) =>
      boxes.forEach((b, j) => {
        if (i < j) assert.ok(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y, `${parsed.classes[i].name} and ${parsed.classes[j].name} overlap`);
      }),
    );
    for (const w of wires)
      for (let k = 1; k < w.pts.length; k++)
        boxes.forEach((b, i) => assert.ok(!crossesBox(w.pts[k - 1], w.pts[k], b), `a line crosses ${parsed.classes[i].name}`));
    assert.equal(layout.crossings, 0);
    for (const b of boxes) assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= layout.W && b.y + b.h <= layout.H);
  });

test("the drawing: boxes, names, stereotypes, arrows and multiplicities", () => {
  const html = classDiagram(SIX).html;
  assert.equal((html.match(/<rect class="u-frame"/g) ?? []).length, 6);
  assert.match(html, /<text[^>]*class="u-st">«abstract»<\/text>/);
  assert.match(html, /<text[^>]*class="u-name u-it">Person<\/text>/);
  assert.match(html, /<text[^>]*class="u-st">«interface»<\/text>/);
  assert.match(html, /<text[^>]*class="u-name">Saveable<\/text>/);
  assert.match(html, /<text[^>]*class="u-it">\+describe\(\): String<\/text>/);
  // One triangle per parent (Person's two children share one), a dashed line to the interface.
  assert.equal((html.match(/class="u-tri"/g) ?? []).length, 2);
  assert.equal((html.match(/class="u-edge u-dash"/g) ?? []).length, 1);
  // Three open arrowheads, and the multiplicities at their target ends.
  assert.match(html, /class="u-mult">\*<\/text>/);
  assert.match(html, /class="u-mult">0\.\.1<\/text>/);
  const svg = /<svg [^>]*>/.exec(html)[0];
  assert.match(svg, /aria-hidden="true"/);
  // 1 unit is 1 px at the normal text size (1rem is 16 px), and it's scaled down no further than 11 px text (12 units).
  const W = Number(/viewBox="0 0 ([\d.]+) /.exec(svg)[1]);
  const [, w, min] = /width:([\d.]+)rem;min-width:([\d.]+)rem/.exec(svg).map(Number);
  assert.ok(w * 16 >= W && w * 16 < W + 0.2, `width ${w}rem for ${W} units`);
  assert.ok(min * 16 >= (W * 11) / 12 && min * 16 < (W * 11) / 12 + 0.2, `min-width ${min}rem for ${W} units`);
  // Types with < and > are escaped.
  assert.match(classDiagram(READABLE).html, /-pages: ArrayList&lt;String&gt;/);
});

test("the text version says everything the drawing shows", () => {
  const { html } = classDiagram(SIX + lines("", "class Library", "", "Library 1 -- * Room"));
  const text = /<details class="uml-text">([\s\S]*)<\/details>/.exec(html)[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  for (const words of [
    "The diagram as text",
    "Person , an abstract class",
    "private field name: String",
    "public abstract method describe(): String",
    "Saveable , an interface",
    "Student , a class that extends Person and implements Saveable",
    "Each Course has any number of Student objects.",
    "Each Course has one Teacher object.",
    "Each Course has at most one Room object.",
    "Library and Room know each other: each Library has any number of Room objects, and each Room has one Library object.",
  ])
    assert.ok(text.includes(words), `the text version says "${words}": ${text}`);
  const ctor = classDiagram(PERSON).html;
  assert.match(ctor, /public constructor <code>Person\(name: String, age: int\)<\/code>/);
});

test("the HTML is accessible: a named, focusable frame that can scroll, the SVG hidden", () => {
  const { html } = classDiagram(FAMILY);
  assert.match(html, /^<figure class="uml"><div class="uml-scroll" tabindex="0" role="group" aria-label="Class diagram of Person, Student and Teacher">/);
  assert.match(html, /<summary>The diagram as text<\/summary>/);
});

test("both Markdown renderers pass the diagram through, and the text around it stays Markdown", () => {
  const md = lines("Some **text**:", "```classes", FAMILY.trimEnd(), "```", "The `Person` class.", "", "- a list");
  const drawn = drawClassDiagrams(md, (m) => assert.fail(m));
  const { html } = classDiagram(FAMILY);
  assert.ok(!/\n[ \t]*\n/.test(html), "no blank lines inside the HTML, so Markdown keeps it as one block");
  // The site's renderers (src/components/Markdown.tsx, scripts/prerender.mjs) only change how code blocks look.
  const out = marked.parse(drawn, { async: false, gfm: true });
  assert.ok(out.includes(html), "the HTML is unchanged");
  assert.match(out, /<p>Some <strong>text<\/strong>:<\/p>/);
  assert.match(out, /<p>The <code>Person<\/code> class.<\/p>/);
  assert.match(out, /<li>a list<\/li>/);
});

test("summaries leave the diagrams out", () => {
  const drawn = drawClassDiagrams(lines("```classes", PERSON.trimEnd(), "```", "", "A person has a name."), assert.fail);
  const plain = withoutClassDiagrams(drawn);
  assert.ok(!/[<>]/.test(plain), plain);
  assert.match(plain, /A person has a name\./);
});

test("the same text always gives the same drawing", () => {
  for (const src of Object.values(SAMPLES)) assert.equal(classDiagram(src).html, classDiagram(src).html);
});

test("a classes fence that isn't drawn is found: indented, in a quote, with ~~~ or four backticks", () => {
  for (const open of ["   ```", "- ```", "1. ```", "> ```", "~~~", "````", "\t```"]) {
    const text = `Text.\n\n${open}classes\nclass A\n\`\`\`\n`;
    const drawn = drawClassDiagrams(text, () => assert.fail("no errors expected"));
    assert.ok(UNDRAWN_CLASSES.test(drawn), JSON.stringify(open));
    assert.ok(ANY_CLASSES.test(text), JSON.stringify(open));
  }
  // A drawn block leaves no fence; a block with errors stays as it was, and only its errors count.
  const errors = [];
  assert.ok(!UNDRAWN_CLASSES.test(drawClassDiagrams("```classes\nclass A\n```\n", (m) => errors.push(m))));
  assert.ok(!UNDRAWN_CLASSES.test(drawClassDiagrams("```classes\nA --> B\n```\n", (m) => errors.push(m))));
  assert.ok(errors.length > 0);
  // Other fences don't count.
  assert.ok(!ANY_CLASSES.test("```java\nclass A {}\n```\n") && !ANY_CLASSES.test("The classes Person and Student."));
});
