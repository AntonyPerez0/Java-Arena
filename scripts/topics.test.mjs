// Tests of the topics reference's check (scripts/content/topics.mjs) and its search (src/lib/topics.ts).
// No build output is read: the steps here are written for the test. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { checkTopics, markdownCode, mentions, stepSources, topicLetter, topicSlug } from "./content/topics.mjs";
import { filterTopics } from "../src/lib/topics.ts";

const step = (id, text, extra = {}) => ({ id, slug: id.replace(/^[a-z]+-/, ""), title: extra.title ?? id, text, task: extra.task ?? "Your turn.", seed: extra.seed ?? "", solution: extra.solution ?? "", more: extra.more ?? [] });
const loops = { id: "loops", title: "Repeating with while" };
const STEPS = new Map(
  [
    [step("loops-for", "A **for loop** for counting:\n\n```java main\nfor (int i = 0; i < 3; i++) {\n    System.out.println(i);\n}\n```\n\nIt is used for counting."), loops],
    [step("loops-words", "Loops are handy for words. The word for here is only English."), loops],
    [step("loops-recursion", "A method that calls itself is **recursive**. Recursion needs a base case.", { solution: "public class Main {\n    static int f(int n) { return n == 0 ? 0 : f(n - 1); }\n}\n" }), loops],
    [step("loops-more", "Nothing here.", { more: [{ task: "Use `HashMap` now.", seed: "", solution: "Map<String, Integer> m = new HashMap<>();" }] }), loops],
  ].map(([s, m]) => [s.id, { step: s, module: m }]),
);
const DRILLS = new Map([["loops", "Repeating with while"]]);
const check = (raw) => checkTopics(raw, { steps: STEPS, drillTopics: DRILLS });
const entry = (over = {}) => ({ term: "for", kind: "keyword", about: "A loop with a counter.", steps: ["loops-for"], ...over });

test("a good entry passes, with its steps and drills topic as the page needs them", () => {
  const { topics, errors } = check([entry({ drills: "loops" })]);
  assert.deepEqual(errors, []);
  assert.deepEqual(topics, [{ id: "for", term: "for", kind: "keyword", about: "A loop with a counter.", aliases: [], steps: [{ id: "loops-for", module: "loops", moduleTitle: "Repeating with while", slug: "for", title: "loops-for" }], drills: { topic: "loops", title: "Repeating with while" } }]);
});

test("a step id that doesn't exist is an error", () => {
  const { errors } = check([entry({ steps: ["loops-for", "loops-nowhere"] })]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /there's no step loops-nowhere/);
});

test("a keyword must be in the step's code, not only in its text", () => {
  // "for" is in loops-words' text as an English word, but the step has no code with it.
  const { errors } = check([entry({ steps: ["loops-words"] })]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /loops-words doesn't have "for" in its code/);
});

test("a class or method counts as a whole word with the same capitals, in examples, inline code and the challenges' code", () => {
  assert.deepEqual(check([{ term: "HashMap", kind: "class", about: "A map.", steps: ["loops-more"] }]).errors, []);
  assert.equal(check([{ term: "Hash", kind: "class", about: "Not a word of its own.", steps: ["loops-more"] }]).errors.length, 1);
  assert.equal(check([{ term: "hashmap", kind: "class", about: "Wrong capitals.", steps: ["loops-more"] }]).errors.length, 1);
});

test("an idea counts anywhere in the text, in any capitals, with a plural; a check phrase can stand in for the term", () => {
  assert.deepEqual(check([{ term: "loop", kind: "idea", about: "Repeats code.", steps: ["loops-words", "loops-for"] }]).errors, []);
  assert.deepEqual(check([{ term: "recursion", kind: "idea", about: "A method calling itself.", check: ["recursive"], steps: ["loops-recursion"] }]).errors, []);
  const { errors } = check([{ term: "base", kind: "idea", about: "Not in the step.", steps: ["loops-more"] }]);
  assert.match(errors[0], /loops-more doesn't have "base" in its text or code/);
  // A word inside a longer word doesn't count.
  assert.equal(check([{ term: "curs", kind: "idea", about: "Part of a word.", steps: ["loops-recursion"] }]).errors.length, 1);
});

test("at most three steps, a known kind, a one-line description that ends a sentence, and no dashes", () => {
  const four = check([entry({ term: "loop", kind: "idea", steps: ["loops-for", "loops-words", "loops-recursion", "loops-more"] })]).errors;
  assert.ok(four.some((e) => /at most 3/.test(e)));
  assert.ok(check([entry({ kind: "word" })]).errors.some((e) => /kind must be one of/.test(e)));
  assert.ok(check([entry({ about: "Two\nlines." })]).errors.some((e) => /one line/.test(e)));
  assert.ok(check([entry({ about: "No period" })]).errors.some((e) => /ends with a period/.test(e)));
  assert.ok(check([entry({ about: "A loop \u2014 with a dash." })]).errors.some((e) => /dash/.test(e)));
  assert.ok(check([entry({ steps: [] })]).errors.some((e) => /one to 3 step ids/.test(e)));
  assert.ok(check([entry({ extra: 1 })]).errors.some((e) => /unknown field extra/.test(e)));
});

test("aliases are only for the search: the check doesn't accept them", () => {
  const { errors } = check([{ term: "self-call", kind: "idea", about: "A method calling itself.", aliases: ["recursive"], steps: ["loops-recursion"] }]);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /loops-recursion doesn't have "self-call" in its text or code/);
  assert.ok(check([entry({ check: "for" })]).errors.some((e) => /check must be a list/.test(e)));
});

test("a check phrase in too many of the steps is too general to count", () => {
  // Five steps, so a phrase may be in at most 3 (the least the limit allows): "loop" is in all of them.
  const five = new Map([...STEPS, ["loops-again", { step: step("loops-again", "Another loop."), module: loops }]]);
  const { errors } = checkTopics([{ term: "iteration", kind: "idea", about: "Going round.", check: ["loop"], steps: ["loops-for"] }], { steps: five, drillTopics: DRILLS });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /the check phrase "loop" is in 5 of the 5 steps/);
  assert.deepEqual(checkTopics([{ term: "iteration", kind: "idea", about: "Going round.", check: ["for loop"], steps: ["loops-for"] }], { steps: five, drillTopics: DRILLS }).errors, []);
});

test("literals, annotations, operators and separators are looked for in code, not in the text", () => {
  // "or" and "not" are English words in loops-words' text; as operators they would have to be code.
  assert.equal(check([{ term: "for", kind: "operator", about: "Not one.", steps: ["loops-words"] }]).errors.length, 1);
  for (const kind of ["literal", "annotation", "operator", "separator"]) {
    assert.deepEqual(check([{ term: "++", kind, about: "In the code.", steps: ["loops-for"] }]).errors, [], kind);
    assert.match(check([{ term: "here", kind, about: "Only in the text.", steps: ["loops-words"] }]).errors[0], /in its code/, kind);
  }
});

test("a drills topic must be one with drills", () => {
  assert.ok(check([entry({ drills: "arrays" })]).errors.some((e) => /Deathmatch topic/.test(e)));
});

test("terms that differ only in capitals get different addresses; the same term twice is an error", () => {
  const { topics, errors } = check([
    { term: "HashMap", kind: "class", about: "The class.", steps: ["loops-more"] },
    { term: "hashmap", kind: "idea", about: "The idea.", aliases: ["HashMap"], steps: ["loops-more"] },
  ]);
  assert.deepEqual(errors, []);
  assert.deepEqual(topics.map((t) => t.id).sort(), ["hashmap", "hashmap-idea"]);
  assert.ok(check([entry(), entry()]).errors.some((e) => /the term for is in the list twice/.test(e)));
});

test("which entry keeps a shared address doesn't depend on the order of the file", () => {
  const cls = { term: "HashMap", kind: "class", about: "The class.", steps: ["loops-more"] };
  const method = { term: "hashMap", kind: "method", about: "A method.", steps: ["loops-more"], check: ["HashMap"] };
  const idea = { term: "hashmap", kind: "idea", about: "The idea.", steps: ["loops-more"] };
  const ids = (list) => Object.fromEntries(check(list).topics.map((t) => [t.term, t.id]));
  const want = { HashMap: "hashmap", hashMap: "hashmap-method", hashmap: "hashmap-idea" };
  assert.deepEqual(ids([cls, method, idea]), want);
  assert.deepEqual(ids([idea, method, cls]), want);
  assert.deepEqual(ids([method, idea, cls]), want);
  // Two of one kind can't be told apart.
  const { errors } = check([cls, { ...cls, term: "HASHMAP" }]);
  assert.ok(errors.some((e) => /its address #hashmap-class is the same as (HashMap|HASHMAP)'s/.test(e)));
});

test("an address the site already uses as an id is an error", () => {
  for (const term of ["main", "Root", "main nav", "topics count", "letter A"]) {
    const { errors } = check([{ term, kind: "idea", about: "Clashes.", steps: ["loops-for"], check: ["for"] }]);
    assert.ok(errors.some((e) => /is an id the site already uses/.test(e)), term);
  }
  assert.ok(!check([{ term: "domain", kind: "idea", about: "Fine.", steps: ["loops-for"], check: ["for"] }]).errors.some((e) => /already uses/.test(e)));
});

test("entries come out A to Z, ignoring capitals and a leading @, with operators first", () => {
  const { topics } = check([
    { term: "loop", kind: "idea", about: "Repeats.", steps: ["loops-words"] },
    { term: "@Override", kind: "annotation", about: "An annotation.", check: ["for"], steps: ["loops-for"] },
    { term: "++", kind: "operator", about: "Adds one.", steps: ["loops-for"] },
    { term: "HashMap", kind: "class", about: "A map.", steps: ["loops-more"] },
  ]);
  assert.deepEqual(topics.map((t) => t.term), ["++", "HashMap", "loop", "@Override"]);
});

test("slugs, letters and the code of Markdown", () => {
  assert.equal(topicSlug("String.format"), "string-format");
  assert.equal(topicSlug("@Override"), "override");
  assert.equal(topicSlug("&&"), "and-and");
  assert.equal(topicSlug("->"), "minus-greater");
  assert.equal(topicLetter("@Override"), "O");
  assert.equal(topicLetter("%"), "#");
  assert.equal(topicLetter("var"), "V");
  assert.equal(markdownCode("Use `x++` here.\n\n```java\nint y;\n```\n\nand ``a`b``."), "int y;\n\nx++\na`b");
  const src = stepSources(STEPS.get("loops-more").step);
  assert.match(src.code, /HashMap/);
  assert.ok(mentions("Map", "class", src));
  assert.ok(!mentions("Nothing", "class", src));
});

test("the search finds terms, aliases and words of the description, best matches first", () => {
  const topics = [
    { id: "for", term: "for", kind: "keyword", about: "A loop with a counter.", aliases: [], steps: [], drills: null },
    { id: "for-each-loop", term: "for-each loop", kind: "idea", about: "Goes through a list.", aliases: ["for-each"], steps: [], drills: null },
    { id: "while", term: "while", kind: "keyword", about: "Repeats a block for as long as a condition holds.", aliases: [], steps: [], drills: null },
    { id: "hashmap", term: "HashMap", kind: "class", about: "Keys and values.", aliases: ["hash table"], steps: [], drills: null },
  ];
  assert.deepEqual(filterTopics(topics, "").map((t) => t.id), ["for", "for-each-loop", "while", "hashmap"]);
  // The term itself first, then terms that start with it, then descriptions with the word.
  assert.deepEqual(filterTopics(topics, "  FOR ").map((t) => t.id), ["for", "for-each-loop", "while"]);
  // In a description, a word must start with what was typed ("ount" isn't the start of "counter").
  assert.deepEqual(filterTopics(topics, "ount"), []);
  assert.deepEqual(filterTopics(topics, "map").map((t) => t.id), ["hashmap"]);
  assert.deepEqual(filterTopics(topics, "hash table").map((t) => t.id), ["hashmap"]);
  assert.deepEqual(filterTopics(topics, "loop").map((t) => t.id), ["for-each-loop", "for"]);
  assert.deepEqual(filterTopics(topics, "repeats condition").map((t) => t.id), ["while"]);
  assert.deepEqual(filterTopics(topics, "zebra"), []);
});
