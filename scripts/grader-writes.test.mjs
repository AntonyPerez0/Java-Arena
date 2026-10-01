// Tests of the check of files a program writes (src/grader/writes.js): the comparison the grader
// and the content build make, the notes, the file names a test may use, and the files a free run
// shows. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { changedFiles, compareWrites, dataPathProblem, writesNote } from "../src/grader/writes.js";

test("a file with the expected text passes", () => {
  assert.deepEqual(compareWrites({ "summary.txt": "Total: 3\n" }, { "summary.txt": "Total: 3\n", "scores.txt": "1\n2\n" }), [{ name: "summary.txt", expected: "Total: 3", got: "Total: 3", pass: true }]);
});

test("line endings, spaces at line ends and blank lines at the end don't matter, as in output", () => {
  const [r] = compareWrites({ "a.txt": "one\ntwo\n" }, { "a.txt": "one  \r\ntwo\t\r\n\r\n\n" });
  assert.equal(r.pass, true);
  assert.equal(r.got, "one\ntwo");
  // A file written without a line break at the end is the same as one with it.
  assert.equal(compareWrites({ "a.txt": "one\n" }, { "a.txt": "one" })[0].pass, true);
});

test("anything else must match: capitals, spaces inside and at the start of lines, blank lines inside, order", () => {
  const want = { "a.txt": "Total: 3\nAverage: 1.5\n" };
  for (const text of ["total: 3\nAverage: 1.5\n", "Total:  3\nAverage: 1.5\n", " Total: 3\nAverage: 1.5\n", "Total: 3\n\nAverage: 1.5\n", "Average: 1.5\nTotal: 3\n", "Total: 3\n"]) {
    const [r] = compareWrites(want, { "a.txt": text });
    assert.equal(r.pass, false, JSON.stringify(text));
    assert.equal(r.expected, "Total: 3\nAverage: 1.5");
    assert.equal(r.got, text.replace(/\n+$/, ""));
  }
});

test("a file the program didn't create fails with got null, even when it should be empty", () => {
  assert.deepEqual(compareWrites({ "out.txt": "x\n" }, {}), [{ name: "out.txt", expected: "x", got: null, pass: false }]);
  assert.deepEqual(compareWrites({ "empty.txt": "" }, { "other.txt": "" }), [{ name: "empty.txt", expected: "", got: null, pass: false }]);
  assert.equal(compareWrites({ "empty.txt": "" }, { "empty.txt": "\n" })[0].pass, true);
  // No files at all (a run that timed out keeps none).
  assert.equal(compareWrites({ "out.txt": "x" }, undefined)[0].got, null);
});

test("files in folders are found by their path, and names are case-sensitive", () => {
  const files = { "reports/summary.txt": "ok\n", "Summary.txt": "ok\n" };
  assert.equal(compareWrites({ "reports/summary.txt": "ok" }, files)[0].pass, true);
  assert.equal(compareWrites({ "summary.txt": "ok" }, files)[0].got, null);
  assert.equal(compareWrites({ "summary.txt": "ok" }, { "reports/summary.txt": "ok" })[0].got, null);
});

test("each wanted file gets a result, in the order the test names them", () => {
  const r = compareWrites({ "b.txt": "2", "a.txt": "1", "c.txt": "3" }, { "a.txt": "1", "b.txt": "two" });
  assert.deepEqual(
    r.map((f) => [f.name, f.pass, f.got]),
    [
      ["b.txt", false, "two"],
      ["a.txt", true, "1"],
      ["c.txt", false, null],
    ],
  );
  assert.deepEqual(compareWrites(undefined, { "a.txt": "1" }), []);
});

test("notes: a missing file is named; a wrong one only on a hidden test, without its contents", () => {
  const missing = compareWrites({ "summary.txt": "Total: 3" }, {});
  assert.equal(writesNote(missing), "The program didn't create summary.txt. It must write this file in its own folder, under exactly this name.");
  assert.equal(writesNote(missing, true), writesNote(missing));
  const wrong = compareWrites({ "summary.txt": "Total: 3" }, { "summary.txt": "Total: 4" });
  assert.equal(writesNote(wrong), undefined);
  const hidden = writesNote(wrong, true);
  assert.equal(hidden, "summary.txt doesn't hold what it should after this test.");
  assert.ok(!hidden.includes("Total"));
  assert.equal(writesNote(compareWrites({ "a.txt": "1" }, { "a.txt": "1" }), true), undefined);
  assert.equal(writesNote([]), undefined);
});

test("notes name several files together", () => {
  const r = compareWrites({ "a.txt": "1", "b.txt": "2", "c.txt": "3", "d.txt": "4", "e.txt": "5" }, { "d.txt": "x", "e.txt": "y" });
  assert.equal(writesNote(r, true), "The program didn't create a.txt, b.txt and c.txt. It must write these files in its own folder, under exactly these names. d.txt and e.txt don't hold what they should after this test.");
});

test("file names: plain names and names in folders; nothing outside the program's folder", () => {
  for (const ok of ["summary.txt", "reports/summary.txt", "a/b/c-d_e.2.csv", "notes", ".hidden", "data.tar.gz"]) assert.equal(dataPathProblem(ok), null, ok);
  for (const bad of ["", "../secret.txt", "reports/../x.txt", "./x.txt", "/etc/passwd", "a//b.txt", "reports/", "my file.txt", "C:\\x.txt", "ä.txt", "..", "."]) assert.notEqual(dataPathProblem(bad), null, bad);
  assert.notEqual(dataPathProblem(undefined), null);
});

test("a free run shows the files it created or changed, not the input files it left alone", () => {
  const before = { "scores.txt": "1\n2\n", "log.txt": "start\n" };
  const after = { "scores.txt": "1\n2\n", "log.txt": "start\nmore\n", "reports/summary.txt": "Total: 3\n", "b.txt": "" };
  assert.deepEqual(changedFiles(before, after), [
    { name: "b.txt", text: "" },
    { name: "log.txt", text: "start\nmore\n" },
    { name: "reports/summary.txt", text: "Total: 3\n" },
  ]);
  assert.deepEqual(changedFiles(undefined, { "x.txt": "1" }), [{ name: "x.txt", text: "1" }]);
  assert.deepEqual(changedFiles(before, before), []);
  assert.deepEqual(changedFiles(before, undefined), []);
});
