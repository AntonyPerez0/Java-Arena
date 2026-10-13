// Tests of the personal record (src/lib/record.ts): modules finished by part with their dates, parts
// finished, projects, totals, the name, and the notice the page shows word for word. The course is a
// small made-up one here, so no build output is needed. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RECORD_NOTICE, buildRecord, cleanName, finishedPart, isoDay, moduleFinished, recordDate } from "../src/lib/record.ts";

const T = Date.UTC(2026, 9, 1, 12);
const DAY = 86_400_000;
const step = (id, challenges = 3) => ({ id, slug: id, title: id, hash: "0", challenges, drills: 0 });
const mod = (id, number, course, part, steps) => ({ id, number, title: `Title ${id}`, course, part, mooc: [], summary: "", steps, drills: 0 });
const modules = [
  mod("a", 1, "I", 1, [step("a1"), step("a2")]),
  mod("b", 2, "I", 1, [step("b1")]),
  mod("c", 3, "I", 2, [step("c1"), step("c2")]),
  mod("x", 5, "extra", null, [step("x1")]),
];
// Module 4 (part 2) is planned but not written yet.
const plan = [
  ...modules.slice(0, 3).map((m) => ({ id: m.id, number: m.number, title: m.title, course: m.course, part: m.part, mooc: [], steps: m.steps.length, live: true })),
  { id: "d", number: 4, title: "Not yet", course: "I", part: 2, mooc: [], steps: 2, live: false },
  { id: "x", number: 5, title: "Title x", course: "extra", part: null, mooc: [], steps: 1, live: true },
];
const projects = [
  { id: "p1", title: "Project one", summary: "", after: "b", hash: "0", milestones: [] },
  { id: "p2", title: "Project two", summary: "", after: "c", hash: "0", milestones: [] },
];
const done = (at, challenges = 3) => ({ done: true, doneAt: at, challenges: Object.fromEntries([...Array(challenges).keys()].map((k) => [k, { done: true, hintsUsed: 0, attempts: 1 }])) });
const state = (over = {}) => ({ version: 1, steps: {}, projects: {}, drills: {}, dm: {}, daily: {}, placed: [], settings: {}, ...over });

test("a module is finished when every step is done; its date is the last step's", () => {
  const s = state({ steps: { a1: done(T + 5 * DAY), a2: done(T + 2 * DAY) } });
  assert.deepEqual(moduleFinished(s, modules[0]), { done: true, doneAt: T + 5 * DAY });
  assert.deepEqual(moduleFinished(state({ steps: { a1: done(T) } }), modules[0]), { done: false, doneAt: null });
  // A step finished before times were saved: finished, no date.
  assert.deepEqual(moduleFinished(state({ steps: { a1: done(T), a2: { done: true, challenges: {} } } }), modules[0]), { done: true, doneAt: null });
  assert.equal(moduleFinished(state(), { steps: [] }).done, false, "a module without steps is never finished");
});

test("the record lists finished modules by part, parts finished, the extras last, projects, totals and the dates", () => {
  const s = state({
    steps: { a1: done(T), a2: done(T + DAY), b1: done(T + 3 * DAY), c1: done(T + 4 * DAY), x1: done(T + 9 * DAY), c2: { done: false, challenges: { 0: { done: true, hintsUsed: 0, attempts: 1 } } } },
    projects: { p1: { done: true, doneAt: T + 6 * DAY, milestones: {} }, p2: { done: false, milestones: {} } },
  });
  const r = buildRecord(s, plan, modules, projects);
  assert.deepEqual(
    r.parts.map((p) => [p.course, p.part, p.total, p.finished.map((m) => m.id), p.complete, p.doneAt]),
    [
      ["I", 1, 2, ["a", "b"], true, T + 3 * DAY],
      ["I", 2, 2, [], false, null],
      ["extra", null, 1, ["x"], true, T + 9 * DAY],
    ],
  );
  assert.deepEqual(r.parts[0].finished[0], { id: "a", number: 1, title: "Title a", doneAt: T + DAY });
  assert.deepEqual(r.projects, [{ id: "p1", title: "Project one", doneAt: T + 6 * DAY }]);
  assert.deepEqual(r.totals, { modules: 3, modulesTotal: 5, parts: 1, partsTotal: 2, steps: 5, stepsTotal: 6, challenges: 16, challengesTotal: 18, projects: 1, projectsTotal: 2 });
  assert.equal(r.first, T + DAY, "module a, finished when its second step was");
  assert.equal(r.last, T + 9 * DAY);
});

test("a part with a module not written yet can't be finished; nothing finished gives an empty record", () => {
  const s = state({ steps: { c1: done(T), c2: done(T) } });
  const r = buildRecord(s, plan, modules, projects);
  const part2 = r.parts.find((p) => p.part === 2);
  assert.equal(part2.finished.length, 1);
  assert.equal(part2.complete, false);
  assert.equal(finishedPart(s, plan, modules, "c"), null);
  const empty = buildRecord(state(), plan, modules, projects);
  assert.equal(empty.totals.modules + empty.totals.projects + empty.totals.steps, 0);
  assert.equal(empty.first, null);
  assert.ok(empty.parts.every((p) => !p.complete && p.finished.length === 0));
});

test("finishedPart names the part once every module of it is finished, and never for an extra module", () => {
  const s = state({ steps: { a1: done(T), a2: done(T), x1: done(T) } });
  assert.equal(finishedPart(s, plan, modules, "a"), null);
  const all = state({ steps: { ...s.steps, b1: done(T) } });
  assert.equal(finishedPart(all, plan, modules, "a"), 1);
  assert.equal(finishedPart(all, plan, modules, "b"), 1);
  assert.equal(finishedPart(all, plan, modules, "x"), null);
  assert.equal(finishedPart(all, plan, modules, "nope"), null);
});

test("dates read the same in every browser; the name is one trimmed line of at most 80 characters", () => {
  const d = new Date(2026, 0, 5, 23, 30).getTime();
  assert.equal(recordDate(d), "5 Jan 2026");
  assert.equal(isoDay(d), "2026-01-05");
  assert.equal(cleanName("  Ada \n  Lovelace "), "Ada Lovelace");
  assert.equal(cleanName("x".repeat(200)).length, 80);
  assert.equal(cleanName(undefined), "");
  assert.equal(cleanName(42), "");
});

test("the notice is the design's sentence, and the record's own files use none of the words it rules out", () => {
  assert.equal(
    RECORD_NOTICE,
    "This is a personal record made by Java Arena from the progress saved in this browser. It is not a certificate. It isn't issued or checked by the University of Helsinki or the MOOC, and nobody verifies it.",
  );
  for (const f of ["src/lib/record.ts", "src/pages/Record.tsx", "src/record.css"]) {
    const text = readFileSync(new URL(`../${f}`, import.meta.url), "utf8").replace(RECORD_NOTICE, "");
    assert.doesNotMatch(text, /certif|awarded|credential/i, f);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${f} has an en or em dash`);
  }
});

test("the Pro Track on the record: projects with items the learner ticked, counted against the checklist they have now", async () => {
  const { proRecord, ticked, setTick } = await import("../src/lib/pro.ts");
  const pros = [
    { id: "a", title: "Word statistics", summary: "", hours: "2 to 4", checklist: [{ id: "x", text: "" }, { id: "y", text: "" }, { id: "z", text: "" }] },
    { id: "b", title: "Cards", summary: "", hours: "2 to 4", checklist: [{ id: "x", text: "" }] },
    { id: "c", title: "Nothing ticked", summary: "", hours: "2 to 4", checklist: [{ id: "x", text: "" }] },
  ];
  let a = setTick(undefined, "x", true, T);
  a = setTick(a, "y", true, T + 1);
  a = setTick(a, "y", false, T + 2);
  a = setTick(a, "gone", true, T + 3);
  assert.equal(ticked(a, pros[0].checklist), 1, "an unticked item and one no longer on the list don't count");
  const later = setTick(a, "x", false, T - 50);
  assert.ok(later.items.x.at > a.items.x.at, "a change always gets a later time, even when the clock went back");
  assert.ok(Object.values(later.items).every((t) => t.at % 1000 === 0), "times are whole seconds (a transfer link carries seconds)");
  assert.ok(setTick(undefined, "x", true, 1_760_000_000_001).items.x.at === 1_760_000_001_000, "rounded up, never earlier");
  const pro = { a, b: setTick(undefined, "x", true, T), c: setTick(undefined, "x", false, T) };
  assert.deepEqual(proRecord(pro, pros), [
    { id: "a", title: "Word statistics", ticked: 1, total: 3 },
    { id: "b", title: "Cards", ticked: 1, total: 1 },
  ]);
  assert.deepEqual(proRecord(undefined, pros), []);
  const page = readFileSync(new URL("../src/pages/Record.tsx", import.meta.url), "utf8");
  assert.match(page, /marked as done by you/);
  assert.doesNotMatch(page, /verified|graded|passed the tests/i, "the record never says the site checked a Pro Track project");
});
