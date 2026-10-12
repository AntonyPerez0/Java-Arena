// Tests of how a project's milestones open and what code each starts from (src/lib/projects.ts).
// No build output is read: the milestones here are written for the test. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { firstMilestone, milestoneOpen, startCode, withFiles } from "../src/lib/projects.ts";
import { splitFiles } from "../src/grader/files.js";

const MAIN = (body) => `public class Main {\n    public static void main(String[] args) {\n        ${body}\n    }\n}\n`;
const milestones = [
  { id: "one", seed: MAIN("// start") },
  { id: "two", seed: MAIN("model one") + "", files: { "Item.java": "public class Item {\n}\n" } },
  { id: "three", seed: MAIN("model two") },
];
// The model start of milestone 2 is milestone 1's model solution with Item.java.
milestones[1].seed = withFiles(MAIN("model one"), milestones[1].files);
const ch = (over = {}) => ({ done: false, hintsUsed: 0, attempts: 0, ...over });
const progress = (milestones) => ({ done: false, milestones });

test("withFiles adds a milestone's new files after the program's own, and never twice", () => {
  const one = withFiles(MAIN("x"), { "Item.java": "public class Item {\n}\n" });
  assert.deepEqual(splitFiles(one).map((f) => f.path), ["Main.java", "Item.java"]);
  assert.equal(splitFiles(one)[0].text, MAIN("x"));
  assert.equal(withFiles(one, { "Item.java": "other" }), one);
  assert.equal(withFiles(MAIN("x"), undefined), MAIN("x"));
});

test("the first milestone is open; a later one opens when the one before passed or its solution was shown", () => {
  assert.equal(milestoneOpen(milestones, undefined, 0), true);
  assert.equal(milestoneOpen(milestones, undefined, 1), false);
  assert.equal(milestoneOpen(milestones, progress({ one: ch({ attempts: 3 }) }), 1), false);
  assert.equal(milestoneOpen(milestones, progress({ one: ch({ done: true }) }), 1), true);
  assert.equal(milestoneOpen(milestones, progress({ one: ch({ sawSolution: true }) }), 1), true);
  assert.equal(milestoneOpen(milestones, progress({ one: ch({ done: true }) }), 2), false);
  // One passed already stays open (progress merged from another device, for example).
  assert.equal(milestoneOpen(milestones, progress({ three: ch({ done: true }) }), 2), true);
});

test("a milestone starts from the learner's passing code of the one before, with its new files", () => {
  assert.deepEqual(startCode(milestones, undefined, 0), { code: milestones[0].seed, from: "seed" });
  const p = progress({ one: ch({ done: true, code: MAIN("mine, edited later"), passed: MAIN("mine") }) });
  const s = startCode(milestones, p, 1);
  assert.equal(s.from, "passed");
  assert.deepEqual(splitFiles(s.code).map((f) => [f.path, f.text]), [["Main.java", MAIN("mine")], ["Item.java", "public class Item {\n}\n"]]);
  // Opened by showing the solution without passing: the learner's own code, or the model solution when there's none.
  assert.deepEqual(startCode(milestones, progress({ one: ch({ sawSolution: true, code: MAIN("half done") }) }), 1).from, "own");
  assert.deepEqual(startCode(milestones, progress({ one: ch({ sawSolution: true }) }), 1), { code: milestones[1].seed, from: "model" });
});

test("a milestone done with no passing code kept starts from the model solution, not an older draft", () => {
  // A "Progress only" import marks milestone one done (and drops "passed") on a device with a draft of it.
  assert.deepEqual(startCode(milestones, progress({ one: ch({ done: true, code: MAIN("PARTIAL") }) }), 1), { code: milestones[1].seed, from: "model" });
  // With the passing code kept, that is still where the next one starts, whatever the saved code is.
  const s = startCode(milestones, progress({ one: ch({ done: true, passed: MAIN("P"), code: MAIN("other") }) }), 1);
  assert.equal(s.from, "passed");
  assert.equal(splitFiles(s.code)[0].text, MAIN("P"));
});

test("the page opens the first open milestone not passed, or the last when all have passed", () => {
  assert.equal(firstMilestone(milestones, undefined), 0);
  assert.equal(firstMilestone(milestones, progress({ one: ch({ done: true }) })), 1);
  assert.equal(firstMilestone(milestones, progress({ one: ch({ done: true }), two: ch({ done: true }), three: ch({ done: true }) })), 2);
});
