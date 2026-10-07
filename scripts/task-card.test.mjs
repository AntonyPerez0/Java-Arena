// Tests of the task card's note about the tests it doesn't show (src/content/otherTests.ts): "2 more
// hidden tests use other ...". Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { otherTestsUse } from "../src/content/otherTests.ts";

test("without clicks and typing or arguments, the older words: input, files, calls", () => {
  assert.equal(otherTestsUse({ stdin: "1\n" }, [{ stdin: "2\n", hidden: true }]), "input");
  assert.equal(otherTestsUse({ stdin: "1\n" }, [{ stdin: "2\n", files: { "a.txt": "x\n" } }]), "input or files");
  assert.equal(otherTestsUse({ call: "f(1)" }, [{ call: "f(2)" }]), "calls");
  assert.equal(otherTestsUse({ call: "f(1)" }, [{ call: "f(2)" }, { stdin: "x\n" }]), "input or calls");
  // The same arguments in every test (or none written as []) don't count.
  assert.equal(otherTestsUse({ args: ["a"], stdin: "1\n" }, [{ args: ["a"], stdin: "2\n" }]), "input");
  assert.equal(otherTestsUse({ args: [] }, [{ stdin: "2\n" }]), "input");
});

test("tests with a window or other arguments: only what the other tests change", () => {
  const shown = { events: ['click Button "Add"'] };
  // A hidden test that checks the window as it opens changes the clicks, not the input.
  assert.equal(otherTestsUse(shown, [{ events: [], hidden: true }]), "clicks and typing");
  assert.equal(otherTestsUse(shown, [{ events: ['click Button "Add"', 'click Button "Add"'], hidden: true }]), "clicks and typing");
  // Only the arguments differ (the gate challenge), or a test has none where the shown one has some (the tip calculator).
  assert.equal(otherTestsUse({ events: [], args: ["--flight=LH12", "--gate=B4"] }, [{ events: [], args: ["--flight=LH77"], hidden: true }]), "command-line arguments");
  assert.equal(otherTestsUse({ events: ['set TextField 1 "45"'], args: ["--percent=20"] }, [{ events: ['set TextField 1 "30"'], hidden: true }]), "command-line arguments or clicks and typing");
  // Input only when some test's standard input differs; files only when some test's files differ.
  assert.equal(otherTestsUse({ events: [], stdin: "Ada\n" }, [{ events: [], stdin: "Grace\n" }]), "input");
  assert.equal(otherTestsUse({ events: [], files: { "a.txt": "1\n" } }, [{ events: [], files: { "a.txt": "1\n" } }, { events: ["close"], files: { "a.txt": "2\n" } }]), "files or clicks and typing");
  // Arguments alone, with no window: a plain program's args.
  assert.equal(otherTestsUse({ args: ["3"] }, [{ args: ["5"], hidden: true }]), "command-line arguments");
});
