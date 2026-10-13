// Tests of moving progress between devices (src/lib/transfer.ts and src/lib/qr.ts): transfer links
// (encoding, decoding, the fallback without compression, damaged, unknown and newer links),
// progress files (the file, its name, version errors), every merging rule in both directions and
// idempotence, Replace, the summary shown before an import, and QR codes that a QR decoder (jsQR,
// written by others) reads back. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { inflateRawSync } from "node:zlib";
import jsQR from "jsqr";
import {
  TRANSFER_VERSION,
  TransferError,
  codeFrom,
  decodeTransfer,
  encodeTransfer,
  fileName,
  fileText,
  fromBase64Url,
  makeTransfer,
  mergeTransfer,
  parseFile,
  replaceWithTransfer,
  storedDeflate,
  summarize,
  summaryText,
  toBase64Url,
  toWire,
} from "../src/lib/transfer.ts";
import { QR_MAX_CHARS, QR_MAX_VERSION, qrFor } from "../src/lib/qr.ts";

const SETTINGS = { theme: "system", textScale: 1, mobileData: false, sound: false, unlockAll: false, topicsOff: [], boss: true, keys: true };
const emptyDm = () => ({ best: { deathmatch: 0, casual: 0, warmup: 0, interview: 0 }, runs: [], reps: 0, kills: 0, bossKills: 0, days: {} });
const state = (over = {}) => ({ version: 1, steps: {}, projects: {}, pro: {}, drills: {}, dm: emptyDm(), daily: {}, placed: [], settings: { ...SETTINGS }, ...over });
const ch = (over = {}) => ({ done: false, hintsUsed: 0, attempts: 0, ...over });
const T0 = 1_760_000_000_000;
/** A transfer of a state, with code. */
const tr = (s, playground = null, withCode = true) => makeTransfer(s, playground, withCode, T0);
const merge = (local, imp, localPg = null, impPg = null) => mergeTransfer(local, localPg, tr(imp, impPg));

/** A learner with a bit of everything. */
function sample() {
  return state({
    steps: {
      "printing-first-program": { done: true, doneAt: T0 + 1000, clean: true, challenges: { 0: ch({ done: true, attempts: 2, code: "class A {}", savedAt: T0 + 500 }), 1: ch({ done: true, blanks: ["println", "x"], savedAt: T0 + 900 }), 2: ch({ done: true, hintsUsed: 1, attempts: 3, sawSolution: true }) } },
      "printing-several-lines": { done: false, challenges: { 0: ch({ attempts: 1, code: "class B { /* é ✓ */ }" }) } },
    },
    drills: { "printing-1": { box: 3, right: 2, wrong: 1, last: T0 + 5000, due: T0 + 5000 + 259_200_000 }, "printing-2": { box: 1, right: 0, wrong: 1, last: T0 + 9000, due: T0 + 9000 + 43_200_000 } },
    dm: { best: { deathmatch: 4, casual: 7, warmup: 3, interview: 0 }, runs: [{ at: T0 + 100, mode: "casual", streak: 7, reps: 9, kills: 8 }], reps: 40, kills: 33, bossKills: 2, days: { "2025-10-09": 40 } },
    daily: { "2025-10-09": true, "2025-10-10": false },
    placed: ["printing"],
    placedAt: T0,
    settings: { ...SETTINGS, theme: "dark", textScale: 1.25 },
  });
}

// ---------------------------------------------------------------- links

test("a link carries the progress, and with code the code and the Playground program", async () => {
  const s = sample();
  const pg = { code: "class P {}", stdin: "1\n", samples: [], savedAt: T0 };
  const withCode = await decodeTransfer("#" + (await encodeTransfer(tr(s, pg, true))));
  assert.deepEqual(withCode, tr(s, pg, true));
  const only = await decodeTransfer("#" + (await encodeTransfer(tr(s, pg, false))));
  assert.equal(only.withCode, false);
  assert.equal(only.playground, undefined);
  for (const p of Object.values(only.steps)) for (const c of Object.values(p.challenges)) assert.ok(c.code === undefined && c.blanks === undefined && c.savedAt === undefined, "no code without code");
  // Everything else is the same.
  const { playground, ...rest } = withCode;
  assert.ok(playground);
  assert.deepEqual({ ...only, withCode: true, steps: {} }, { ...rest, steps: {} });
  assert.equal(only.steps["printing-first-program"].challenges[2].sawSolution, true);
  assert.equal(only.steps["printing-first-program"].doneAt, T0 + 1000);
  assert.deepEqual(only.drills, s.drills);
});

test("a link without CompressionStream (deflate stored blocks) decodes the same way", async () => {
  const s = sample();
  const a = await encodeTransfer(tr(s), true);
  const b = await encodeTransfer(tr(s), false);
  assert.ok(b.length > a.length, "stored is longer than compressed");
  assert.deepEqual(await decodeTransfer(b), await decodeTransfer(a));
  // Stored blocks are plain deflate: zlib reads them, also when the data needs several blocks.
  for (const size of [0, 1, 65535, 65536, 200_000]) {
    const bytes = Uint8Array.from({ length: size }, (_, i) => (i * 7) & 0xff);
    assert.deepEqual(new Uint8Array(inflateRawSync(storedDeflate(bytes))), bytes);
  }
});

test("base64url has no + / or =, and comes back the same", () => {
  const bytes = Uint8Array.from({ length: 300 }, (_, i) => (i * 37) & 0xff);
  const text = toBase64Url(bytes);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(fromBase64Url(text), bytes);
});

test("the link's compact form sorts by time and writes each time as a difference", () => {
  const w = toWire(tr(sample()));
  assert.equal(w.v, TRANSFER_VERSION);
  assert.equal(w.s[0][0], "printing-first-program");
  assert.equal(w.s[0][2], T0 + 1000);
  assert.equal(w.s[1][2], null, "a step without a time comes last, with null");
  assert.deepEqual(w.d.map((d) => d[4]), [T0 + 5000, 4000]);
  assert.deepEqual(w.d.map((d) => d[5]), [259_200_000, 43_200_000]);
});

async function refused(hash, problem, words) {
  await assert.rejects(decodeTransfer(hash), (e) => e instanceof TransferError && e.problem === problem && words.test(e.message), `${hash.slice(0, 40)}: ${problem}`);
}

test("a damaged, cut, unknown or newer link is refused with a clear message", async () => {
  const good = await encodeTransfer(tr(sample()));
  await refused("#p=", "damaged", /incomplete or damaged/);
  await refused("#p=" + good.slice(2, 40), "damaged", /some apps cut long links/);
  await refused("#p=abc$%", "damaged", /damaged/);
  await refused("#p=" + toBase64Url(storedDeflate(new TextEncoder().encode("not json"))), "damaged", /damaged/);
  const wire = (o) => "#p=" + toBase64Url(storedDeflate(new TextEncoder().encode(JSON.stringify(o))));
  await refused(wire({ hello: 1 }), "unknown", /isn't a Java Arena transfer link/);
  await refused(wire([1, 2]), "unknown", /isn't a Java Arena transfer link/);
  await refused(wire({ ...toWire(tr(sample())), v: TRANSFER_VERSION + 1 }), "newer", /newer version of Java Arena.*Reload/);
  // Right version, wrong insides.
  const w = toWire(tr(sample()));
  await refused(wire({ ...w, s: [["x", 1, "soon", []]] }), "damaged", /finishing time/);
  await refused(wire({ ...w, d: [["d", 9, 0, 0, 1, 1]] }), "damaged", /drill's box/);
  await refused(wire({ ...w, s: [["x", 1, null, [[1, -1, 0]]]] }), "damaged", /hints used/);
  await refused(wire({ ...w, m: { ...w.m, runs: [{ at: 1, mode: "boss", streak: 1, reps: 1, kills: 1 }] } }), "damaged", /Deathmatch run/);
  await refused(wire({ ...w, g: "dark" }), "damaged", /settings/);
});

// ---------------------------------------------------------------- files

test("a progress file: pretty JSON with the format, version, site, date and data, always with code; it reads back", () => {
  const s = sample();
  const pg = { code: "class P {}", stdin: "", savedAt: T0 };
  const text = fileText(tr(s, pg, true), "https://example.org/Java-Arena/");
  const json = JSON.parse(text);
  assert.equal(json.format, "java-arena-progress");
  assert.equal(json.version, 1);
  assert.equal(json.site, "https://example.org/Java-Arena/");
  assert.match(json.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(json.withCode, true);
  assert.equal(json.data.steps["printing-first-program"].challenges[0].code, "class A {}");
  assert.ok(text.includes('\n  "format"'), "indented");
  assert.deepEqual(parseFile(text), tr(s, pg, true));
  // A byte order mark (some editors add one) is fine.
  assert.deepEqual(parseFile("﻿" + text), tr(s, pg, true));
  assert.equal(fileName(new Date(2026, 0, 5, 23, 59).getTime()), "java-arena-progress-2026-01-05.json");
});

test("a damaged, unknown or newer file is refused with a clear message", () => {
  const good = JSON.parse(fileText(tr(sample()), "x"));
  const bad = (text, problem, words) => assert.throws(() => parseFile(text), (e) => e instanceof TransferError && e.problem === problem && words.test(e.message));
  bad("{ not json", "damaged", /isn't JSON/);
  bad("", "damaged", /isn't JSON/);
  bad(JSON.stringify({ format: "something-else", version: 1 }), "unknown", /isn't a Java Arena progress file/);
  bad(JSON.stringify([1]), "unknown", /isn't a Java Arena progress file/);
  bad(JSON.stringify({ ...good, version: 2 }), "newer", /newer version of Java Arena/);
  bad(JSON.stringify({ ...good, version: "1" }), "unknown", /unknown version/);
  bad(JSON.stringify({ ...good, version: 0 }), "unknown", /unknown version/);
  bad(JSON.stringify({ ...good, data: null }), "damaged", /damaged/);
  bad(JSON.stringify({ ...good, data: { ...good.data, drills: { a: { box: 2, right: "many", wrong: 0, last: 1, due: 2 } } } }), "damaged", /drill's count/);
  bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: true, challenges: { 0: { done: true, code: 5 } } } } } }), "damaged", /saved code/);
  bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: true, challenges: { x: {} } } } } }), "damaged", /challenge number/);
  // Yes or no is a boolean (or missing): the text "false" or "no" is damage, never a yes.
  for (const no of ["false", "no", 0, 1]) {
    bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: no, challenges: {} } } } }), "damaged", /step's done/);
    bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: false, clean: no, challenges: {} } } } }), "damaged", /step's flags/);
    bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: false, challenges: { 0: { done: no } } } } } }), "damaged", /challenge's done/);
    bad(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: false, challenges: { 0: { sawSolution: no } } } } } }), "damaged", /challenge's solution/);
    bad(JSON.stringify({ ...good, data: { ...good.data, projects: { p: { done: no, milestones: {} } } } }), "damaged", /project's done/);
    bad(JSON.stringify({ ...good, data: { ...good.data, daily: { "2025-10-09": no } } }), "damaged", /daily answer/);
  }
  // Missing or null reads as no.
  const ok = parseFile(JSON.stringify({ ...good, data: { ...good.data, steps: { a: { done: null, challenges: { 0: { sawSolution: null } } } } } }));
  assert.deepEqual(ok.steps.a, { done: false, challenges: { 0: { done: false, hintsUsed: 0, attempts: 0 } } });
});

test("unknown settings values fall back to the defaults, missing ones too", () => {
  const good = JSON.parse(fileText(tr(sample()), "x"));
  const t = parseFile(JSON.stringify({ ...good, data: { ...good.data, settings: { theme: "purple", textScale: 9 } } }));
  assert.deepEqual(t.settings, SETTINGS);
});

// ---------------------------------------------------------------- merging

/** Merging the same import again changes nothing. */
function idempotent(local, imp, localPg = null, impPg = null) {
  const once = merge(local, imp, localPg, impPg);
  const twice = mergeTransfer(once.state, once.playground, tr(imp, impPg));
  assert.deepEqual(twice, once, "merging twice changes nothing");
  return once;
}

test("a step is done if done in either; its time is the first finish; clean if clean where it was done", () => {
  const a = state({ steps: { s: { done: true, doneAt: T0 + 50, clean: false, challenges: {} }, t: { done: false, challenges: {} } } });
  const b = state({ steps: { s: { done: true, doneAt: T0 + 10, clean: true, challenges: {} }, t: { done: true, doneAt: T0 + 99, clean: true, challenges: {} }, u: { done: true, doneAt: T0, challenges: {} } } });
  for (const [l, i] of [[a, b], [b, a]]) {
    const m = idempotent(l, i).state.steps;
    assert.deepEqual(m.s, { done: true, doneAt: T0 + 10, clean: true, challenges: {} });
    assert.deepEqual(m.t, { done: true, doneAt: T0 + 99, clean: true, challenges: {} });
    assert.equal(m.u.done, true);
  }
  // A step not done anywhere stays not done.
  const n = merge(state({ steps: { v: { done: false, challenges: {} } } }), state({ steps: { v: { done: false, challenges: {} } } })).state.steps.v;
  assert.equal(n.done, false);
});

test("challenge counts take the larger, done and a seen solution in either count", () => {
  const a = state({ steps: { s: { done: false, challenges: { 0: ch({ hintsUsed: 2, attempts: 1 }), 1: ch({ done: true, attempts: 4 }) } } } });
  const b = state({ steps: { s: { done: false, challenges: { 0: ch({ done: true, hintsUsed: 1, attempts: 5, sawSolution: true }), 2: ch({ attempts: 1 }) } } } });
  for (const [l, i] of [[a, b], [b, a]]) {
    const c = idempotent(l, i).state.steps.s.challenges;
    assert.deepEqual(c[0], { done: true, hintsUsed: 2, attempts: 5, sawSolution: true });
    assert.deepEqual(c[1], { done: true, hintsUsed: 0, attempts: 4 });
    assert.deepEqual(c[2], { done: false, hintsUsed: 0, attempts: 1 });
  }
});

/** The code a merge keeps for challenge 0 of step s, when this browser has `l` and the import has `i`. */
const keptCode = (l, i) => idempotent(state({ steps: { s: { done: false, challenges: { 0: l } } } }), state({ steps: { s: { done: false, challenges: { 0: i } } } })).state.steps.s.challenges[0];

test("a challenge's code: the one saved later (a tie keeps the local one), with its blanks and time", () => {
  const older = ch({ code: "old", blanks: ["a"], savedAt: T0 });
  const newer = ch({ code: "new", savedAt: T0 + 1 });
  assert.equal(keptCode(older, newer).code, "new");
  assert.equal(keptCode(older, newer).blanks, undefined, "code, blanks and time go together");
  assert.equal(keptCode(older, newer).savedAt, T0 + 1);
  assert.equal(keptCode(newer, older).code, "new");
  assert.equal(keptCode(newer, older).savedAt, T0 + 1);
  // Saved at the same time: the local one.
  assert.equal(keptCode(ch({ code: "here", savedAt: T0 }), ch({ code: "there", savedAt: T0 })).code, "here");
  // The later one wins even when the other side's challenge is done.
  assert.equal(keptCode(ch({ done: true, code: "done", savedAt: T0 }), ch({ code: "later", savedAt: T0 + 5 })).code, "later");
});

test("older saves without a time on either side: the side whose challenge is done, then the local one", () => {
  const L = (o) => ch({ code: "here", ...o });
  const I = (o) => ch({ code: "there", ...o });
  assert.equal(keptCode(L({ done: false }), I({ done: true })).code, "there", "the import's challenge is done");
  assert.equal(keptCode(L({ done: true }), I({ done: false })).code, "here", "the local challenge is done");
  assert.equal(keptCode(L({ done: true }), I({ done: true })).code, "here", "both done: local");
  assert.equal(keptCode(L({ done: false }), I({ done: false })).code, "here", "neither done: local");
  assert.equal(codeFrom(ch({ code: "x" }), ch({ done: true, code: "y" })), "import");
});

test("a save time on one side only: that side's code is newer (saves without one came before Batch 19), in both directions", () => {
  for (const [ld, id] of [[false, false], [true, false], [false, true], [true, true]]) {
    // The import's is dated, the local one isn't: the import's, with its time.
    const a = keptCode(ch({ done: ld, code: "old here" }), ch({ done: id, code: "new there", savedAt: T0 }));
    assert.equal(a.code, "new there", `local done ${ld}, import done ${id}`);
    assert.equal(a.savedAt, T0);
    // The local one is dated, the import's isn't: the local one.
    const b = keptCode(ch({ done: ld, code: "new here", savedAt: T0 }), ch({ done: id, code: "old there" }));
    assert.equal(b.code, "new here", `local done ${ld}, import done ${id}`);
    assert.equal(b.savedAt, T0);
  }
  // The same for a project's milestone.
  const proj = (m) => state({ projects: { p: { done: false, milestones: { m } } } });
  for (const [l, i, want] of [
    [ch({ done: true, code: "old here", passed: "old here" }), ch({ code: "new there", savedAt: T0 }), "new there"],
    [ch({ code: "new here", savedAt: T0 }), ch({ done: true, code: "old there", passed: "old there" }), "new here"],
  ]) {
    const m = idempotent(proj(l), proj(i)).state.projects.p.milestones.m;
    assert.equal(m.code, want);
    assert.equal(m.done, true);
  }
});

test("code on one side only is kept; an import without code never removes code", () => {
  assert.equal(keptCode(ch(), ch({ code: "there", savedAt: T0 })).code, "there");
  assert.equal(keptCode(ch({ code: "here" }), ch({ done: true })).code, "here");
  assert.deepEqual(keptCode(ch(), ch({ blanks: ["x"] })).blanks, ["x"]);
  const local = sample();
  const m = mergeTransfer(local, null, tr(sample(), null, false)).state;
  assert.equal(m.steps["printing-first-program"].challenges[0].code, "class A {}");
  assert.deepEqual(m.steps["printing-first-program"].challenges[1].blanks, ["println", "x"]);
});

test("drills keep the record reviewed later (a tie keeps the local one)", () => {
  const a = state({ drills: { x: { box: 5, right: 9, wrong: 0, last: T0 + 1, due: T0 + 9 }, y: { box: 2, right: 1, wrong: 0, last: T0 + 10, due: T0 + 20 }, z: { box: 1, right: 0, wrong: 1, last: T0, due: T0 } } });
  const b = state({ drills: { x: { box: 1, right: 0, wrong: 1, last: T0 + 2, due: T0 + 3 }, y: { box: 3, right: 2, wrong: 0, last: T0 + 5, due: T0 + 30 }, w: { box: 4, right: 3, wrong: 0, last: T0, due: T0 } } });
  for (const [l, i] of [[a, b], [b, a]]) {
    const d = idempotent(l, i).state.drills;
    assert.equal(d.x.last, T0 + 2, "fewer answers but later");
    assert.equal(d.y.last, T0 + 10);
    assert.ok(d.z && d.w);
  }
  const tie = merge(state({ drills: { x: { box: 1, right: 0, wrong: 1, last: T0, due: T0 } } }), state({ drills: { x: { box: 5, right: 4, wrong: 0, last: T0, due: T0 + 9 } } })).state.drills.x;
  assert.equal(tie.box, 1);
});

test("Deathmatch: bests and totals take the larger (not the sum), runs merge by time, at most 50, newest first", () => {
  const run = (at, reps = 5) => ({ at, mode: "casual", streak: 3, reps, kills: 3 });
  const a = state({ dm: { best: { deathmatch: 9, casual: 2, warmup: 0, interview: 1 }, runs: [run(T0 + 3), run(T0 + 1, 4)], reps: 100, kills: 70, bossKills: 1, days: { d1: 10, d2: 5 } } });
  const b = state({ dm: { best: { deathmatch: 3, casual: 6, warmup: 4, interview: 0 }, runs: [run(T0 + 2), run(T0 + 1, 7)], reps: 80, kills: 75, bossKills: 3, days: { d2: 8, d3: 1 } } });
  for (const [l, i] of [[a, b], [b, a]]) {
    const dm = idempotent(l, i).state.dm;
    assert.deepEqual(dm.best, { deathmatch: 9, casual: 6, warmup: 4, interview: 1 });
    assert.deepEqual(dm.runs.map((r) => [r.at - T0, r.reps]), [[3, 5], [2, 5], [1, 7]]);
    assert.deepEqual([dm.reps, dm.kills, dm.bossKills], [100, 75, 3]);
    assert.deepEqual(dm.days, { d1: 10, d2: 8, d3: 1 });
  }
  const many = (from) => state({ dm: { ...emptyDm(), runs: Array.from({ length: 40 }, (_, k) => run(T0 + from + k * 2)) } });
  const runs = idempotent(many(0), many(1)).state.dm.runs;
  assert.equal(runs.length, 50);
  assert.equal(runs[0].at, T0 + 1 + 39 * 2);
  assert.ok(runs.every((r, k) => k === 0 || runs[k - 1].at > r.at));
});

test("daily answers join (a day in both keeps the local answer); the later placement wins; settings stay local", () => {
  const a = state({ daily: { d1: true, d2: false }, placed: ["printing"], placedAt: T0, settings: { ...SETTINGS, theme: "light" } });
  const b = state({ daily: { d2: true, d3: false }, placed: ["variables", "printing"], placedAt: T0 + 9, settings: { ...SETTINGS, theme: "dark", sound: true } });
  const ab = idempotent(a, b).state;
  assert.deepEqual(ab.daily, { d1: true, d2: false, d3: false });
  assert.deepEqual(ab.placed, ["variables", "printing"]);
  assert.equal(ab.placedAt, T0 + 9);
  assert.equal(ab.settings.theme, "light");
  const ba = idempotent(b, a).state;
  assert.deepEqual(ba.daily, { d1: true, d2: true, d3: false });
  assert.deepEqual(ba.placed, ["variables", "printing"]);
  assert.equal(ba.placedAt, T0 + 9);
  assert.equal(ba.settings.theme, "dark");
  assert.equal(ba.settings.sound, true);
});

test("placement: skips cleared later stay cleared; without a time on either side, the lists join; a time beats none", () => {
  const cleared = state({ placed: [], placedAt: T0 + 50 });
  const older = state({ placed: ["printing", "variables"], placedAt: T0 });
  assert.deepEqual(idempotent(cleared, older).state.placed, []);
  assert.equal(idempotent(cleared, older).state.placedAt, T0 + 50);
  assert.deepEqual(idempotent(older, cleared).state.placed, []);
  // Equal times: the local list stays.
  const same = state({ placed: ["loops"], placedAt: T0 });
  assert.deepEqual(idempotent(same, older).state.placed, ["loops"]);
  // Neither has a time (saves before placedAt): the lists join.
  const a = state({ placed: ["printing"] });
  const b = state({ placed: ["variables", "printing"] });
  const ab = idempotent(a, b).state;
  assert.deepEqual(ab.placed, ["printing", "variables"]);
  assert.equal("placedAt" in ab, false);
  // A side with a time wins over one without.
  assert.deepEqual(idempotent(a, older).state.placed, ["printing", "variables"]);
  assert.deepEqual(idempotent(state({ placed: ["loops"] }), cleared).state.placed, []);
});

test("the Playground program: the one saved later; without a time on either, the local one; none here takes the import's", () => {
  const p = (code, savedAt) => ({ code, stdin: "", ...(savedAt != null ? { savedAt } : {}) });
  const s = state();
  assert.equal(idempotent(s, s, p("here", T0), p("there", T0 + 1)).playground.code, "there");
  assert.equal(idempotent(s, s, p("here", T0 + 1), p("there", T0)).playground.code, "here");
  assert.equal(idempotent(s, s, p("here", T0), p("there", T0)).playground.code, "here");
  // A time on one side only: that one (a save without one came before it), in both directions.
  assert.equal(idempotent(s, s, p("here"), p("there", T0)).playground.code, "there");
  assert.equal(idempotent(s, s, p("here", T0), p("there")).playground.code, "here");
  assert.equal(idempotent(s, s, p("here"), p("there")).playground.code, "here");
  assert.equal(idempotent(s, s, null, p("there")).playground.code, "there");
  assert.equal(idempotent(s, s, p("here"), null).playground.code, "here");
  // A link without code has no program: the local one stays.
  assert.equal(mergeTransfer(s, p("here"), tr(s, p("there", T0 + 9), false)).playground.code, "here");
});

test("merging the whole sample both ways keeps everything and is idempotent; merging with itself changes nothing", () => {
  const a = sample();
  const b = state({ steps: { "printing-several-lines": { done: true, doneAt: T0 + 7000, challenges: { 0: ch({ done: true, attempts: 3, code: "class C {}", savedAt: T0 + 6000 }) } } }, drills: { "printing-3": { box: 2, right: 1, wrong: 0, last: T0, due: T0 + 1 } } });
  idempotent(a, b);
  idempotent(b, a);
  assert.deepEqual(merge(a, a).state, a);
  const ab = merge(a, b).state;
  const ba = merge(b, a).state;
  // Apart from local settings and ties, the two directions agree.
  assert.deepEqual({ ...ab, settings: null }, { ...ba, settings: null });
});

test("Replace: the import's progress and settings exactly, newer than any other tab", () => {
  const imp = tr(sample(), { code: "P", stdin: "" });
  const r = replaceWithTransfer(imp, { code: "here", stdin: "" }, T0 + 99);
  assert.equal(r.state.resetAt, T0 + 99);
  assert.deepEqual(r.state.steps, imp.steps);
  assert.deepEqual(r.state.settings, imp.settings);
  assert.equal(r.state.placedAt, T0);
  assert.equal(r.playground.code, "P");
  // The Playground program isn't progress: without one in the import (no code, or none on the other device), this browser's stays.
  assert.equal(replaceWithTransfer(tr(sample(), { code: "P", stdin: "" }, false), { code: "here", stdin: "" }, 1).playground.code, "here");
  assert.equal(replaceWithTransfer(tr(sample(), null), { code: "here", stdin: "" }, 1).playground.code, "here");
  assert.equal(replaceWithTransfer(tr(sample(), null), null, 1).playground, null);
});

test("the record page's name never travels: not in a link or a file, and Replace keeps the one typed here", async () => {
  const s = state({ ...sample(), settings: { ...sample().settings, name: "Ada Lovelace" } });
  const t = tr(s);
  assert.equal("name" in t.settings, false);
  assert.equal(t.settings.theme, "dark", "the other settings still travel");
  for (const withCode of [true, false]) {
    const back = await decodeTransfer("#" + (await encodeTransfer(tr(s, null, withCode))));
    assert.equal("name" in back.settings, false);
  }
  const file = fileText(t, "https://example.org/Java-Arena/");
  assert.ok(!file.includes("Ada Lovelace"));
  assert.equal("name" in parseFile(file).settings, false);
  // Replace keeps this browser's name (the import has none); without one here, there is none after.
  assert.equal(replaceWithTransfer(t, null, 1, "Grace Hopper").state.settings.name, "Grace Hopper");
  assert.equal("name" in replaceWithTransfer(t, null, 1).state.settings, false);
  // A file made before names were left out still reads, and Replace still prefers the name typed here.
  const old = JSON.parse(file);
  old.data.settings.name = "Ada Lovelace";
  const oldT = parseFile(JSON.stringify(old));
  assert.equal(oldT.settings.name, "Ada Lovelace");
  assert.equal(replaceWithTransfer(oldT, null, 1, "Grace Hopper").state.settings.name, "Grace Hopper");
  // Merge keeps the local settings, name included.
  assert.equal(mergeTransfer(state({ settings: { ...SETTINGS, name: "Grace Hopper" } }), null, oldT).state.settings.name, "Grace Hopper");
});

test("the summary says what the import has and what Merge and Replace would do", () => {
  const local = state({
    steps: {
      kept: { done: true, doneAt: T0, challenges: { 0: ch({ done: true }) } },
      s: { done: false, challenges: { 0: ch({ code: "mine", savedAt: T0 }), 1: ch({ code: "same", savedAt: T0 }) } },
    },
    drills: { a: { box: 1, right: 0, wrong: 1, last: T0, due: T0 } },
  });
  const imp = state({
    steps: {
      s: { done: true, doneAt: T0 + 5, challenges: { 0: ch({ done: true, code: "theirs", savedAt: T0 + 1 }), 1: ch({ done: true, code: "same", savedAt: T0 + 1 }), 2: ch({ done: true, code: "new", savedAt: T0 }) } },
      t: { done: true, doneAt: T0 + 6, challenges: { 0: ch({ done: true }) } },
    },
    drills: { a: { box: 2, right: 1, wrong: 1, last: T0 + 1, due: T0 + 2 }, b: { box: 3, right: 1, wrong: 0, last: T0, due: T0 } },
  });
  const s = summarize(local, { code: "x", stdin: "" }, tr(imp, { code: "y", stdin: "", savedAt: T0 }));
  assert.deepEqual(s.has, { steps: 2, challenges: 4, drills: 2, code: 3, milestoneCode: 0, playground: true, runs: 0, milestones: 0, proTicks: 0 });
  assert.deepEqual(s.merge, { addSteps: 2, addChallenges: 4, drills: 2, keepSteps: 1, addMilestones: 0, replaceMilestoneCode: 0, replaceMilestoneCodeDone: 0, keepMilestoneCode: 0, replaceCode: 1, replaceCodeDone: 0, keepCode: 0, addCode: 1, proItems: 0, playground: "replace" });
  const text = summaryText(s);
  assert.match(text.has, /2 finished steps, 4 finished challenges and 2 practiced drills, with saved code in 3 challenges and a Playground program/);
  assert.deepEqual(text.merge, ["adds 2 finished steps and 4 finished challenges", "adds or updates 2 drills", "keeps your 1 finished step that the import doesn't have", "replaces your code in 1 challenge where the import's is newer", "adds code in 1 challenge where you have none", "replaces your Playground program with the import's newer one"]);
  // An undated program here and a dated one there: the dated one is newer. Kept when this one is the later save.
  assert.equal(summarize(local, { code: "x", stdin: "", savedAt: T0 + 1 }, tr(imp, { code: "y", stdin: "", savedAt: T0 })).merge.playground, "keep");
  assert.ok(summaryText(summarize(local, { code: "x", stdin: "", savedAt: T0 + 1 }, tr(imp, { code: "y", stdin: "", savedAt: T0 }))).merge.includes("keeps your Playground program, not the import's different one (yours was saved later, or there's no save time to compare)"));
  assert.match(text.replace, /exactly the import's \(2 finished steps instead of your 1\)/);
  assert.match(text.replace, / Its Playground program replaces yours\.$/);
  // Replace keeps this browser's Playground program when the import has none, and says so.
  assert.match(summaryText(summarize(local, { code: "x", stdin: "" }, tr(imp, null, false))).replace, /, and no saved code\), and takes its settings too, apart from your name\. Your Playground program stays\.$/);
  assert.match(summaryText(summarize(local, { code: "x", stdin: "" }, tr(imp))).replace, /Your Playground program stays\.$/);
  assert.doesNotMatch(summaryText(summarize(local, null, tr(imp))).replace, /Playground/);
  const same = summaryText(summarize(local, null, tr(local)));
  assert.deepEqual(same.merge, ["changes nothing: you already have all of it"]);
  assert.match(summaryText(summarize(local, null, tr(local, null, false))).has, /without code/);
});

test("projects: milestones travel in links and files, with code only when chosen; merging keeps a milestone done in either, the code saved later with its passing code, and the first finish", async () => {
  const mine = state({ projects: { adventure: { done: false, milestones: { rooms: ch({ done: true, attempts: 2, code: "rooms here", passed: "rooms passed here", savedAt: T0 + 10 }), items: ch({ attempts: 1, code: "items here", savedAt: T0 + 50 }) } } } });
  const theirs = state({
    projects: {
      adventure: { done: true, doneAt: T0 + 900, milestones: { rooms: ch({ done: true, hintsUsed: 2, attempts: 1, code: "rooms there", passed: "rooms passed there", savedAt: T0 + 20 }), items: ch({ done: true, attempts: 4, code: "items there", passed: "items there", savedAt: T0 + 5, sawSolution: true }) } },
      calculator: { done: false, milestones: { tokens: ch({ attempts: 1 }) } },
    },
  });
  // A link and a file carry them, without code when Progress only is chosen.
  for (const withCode of [true, false]) {
    const t = tr(theirs, null, withCode);
    const back = (await decodeTransfer("#" + (await encodeTransfer(t)))).projects;
    assert.deepEqual(back, t.projects);
    assert.deepEqual(parseFile(fileText(t, "https://example.org/")).projects, t.projects);
    assert.equal(back.adventure.milestones.rooms.code, withCode ? "rooms there" : undefined);
    assert.equal(back.adventure.milestones.rooms.passed, withCode ? "rooms passed there" : undefined);
  }
  // Older progress without projects reads as none.
  const old = JSON.parse(fileText(tr(state()), "x"));
  delete old.data.projects;
  assert.deepEqual(parseFile(JSON.stringify(old)).projects, {});
  // A damaged project changes nothing.
  old.data.projects = { a: { done: true } };
  assert.throws(() => parseFile(JSON.stringify(old)), TransferError);
  for (const [l, i] of [[mine, theirs], [theirs, mine]]) {
    const m = idempotent(l, i).state.projects;
    assert.equal(m.adventure.done, true);
    assert.equal(m.adventure.doneAt, T0 + 900);
    assert.deepEqual(m.calculator, { done: false, milestones: { tokens: ch({ attempts: 1 }) } });
    // rooms: theirs saved later; items: mine saved later, and its passing code is the only one there is.
    assert.deepEqual(m.adventure.milestones.rooms, ch({ done: true, hintsUsed: 2, attempts: 2, code: "rooms there", passed: "rooms passed there", savedAt: T0 + 20 }));
    assert.deepEqual(m.adventure.milestones.items, ch({ done: true, attempts: 4, sawSolution: true, code: "items here", passed: "items there", savedAt: T0 + 50 }));
  }
  // Without code, the local code stays.
  assert.equal(mergeTransfer(mine, null, tr(theirs, null, false)).state.projects.adventure.milestones.rooms.code, "rooms here");
  const s = summarize(mine, null, tr(theirs));
  assert.equal(s.has.milestones, 2);
  assert.equal(s.merge.addMilestones, 1);
  assert.equal(s.merge.replaceMilestoneCode, 1);
  const text = summaryText(s);
  assert.match(text.has, /^It has 2 finished project milestones, with saved code in 2 project milestones\.$/);
  assert.ok(text.merge.includes("adds 1 finished project milestone"), text.merge.join("; "));
  assert.ok(text.merge.includes("replaces your code in 1 project milestone where the import's is newer"), text.merge.join("; "));
  // Replace takes the import's projects.
  assert.deepEqual(replaceWithTransfer(tr(theirs), null, T0).state.projects, tr(theirs).projects);
});

test("the summary tells apart code taken because it's newer, code taken because it's finished, and different code that stays", () => {
  const steps = (cs) => ({ s: { done: false, challenges: cs } });
  const local = state({
    steps: steps({ 0: ch({ code: "a here", savedAt: T0 }), 1: ch({ code: "b here" }), 2: ch({ code: "c here" }), 3: ch({ code: "d here", savedAt: T0 + 9 }), 4: ch({ code: "e here", savedAt: T0 }), 5: ch({ code: "f here" }) }),
    projects: { p: { done: false, milestones: { m1: ch({ code: "m1 here" }), m2: ch({ code: "m2 here", savedAt: T0 }), m3: ch({ code: "m3 here", savedAt: T0 + 9 }) } } },
  });
  const imp = state({
    steps: steps({
      // Newer: both dated, or only the import dated.
      0: ch({ code: "a there", savedAt: T0 + 1 }),
      1: ch({ code: "b there", savedAt: T0 }),
      // Neither dated, the import's done: taken because it's finished.
      2: ch({ done: true, code: "c there" }),
      // Kept: the local one saved later, or only the local one dated, or neither dated and nothing done.
      3: ch({ code: "d there", savedAt: T0 }),
      4: ch({ done: true, code: "e there" }),
      5: ch({ code: "f there" }),
    }),
    projects: { p: { done: false, milestones: { m1: ch({ done: true, code: "m1 there" }), m2: ch({ code: "m2 there" }), m3: ch({ code: "m3 there", savedAt: T0 + 1 }) } } },
  });
  const s = summarize(local, { code: "x", stdin: "" }, tr(imp, { code: "y", stdin: "", savedAt: T0 }));
  const { replaceCode, replaceCodeDone, keepCode, replaceMilestoneCode, replaceMilestoneCodeDone, keepMilestoneCode, playground } = s.merge;
  assert.deepEqual({ replaceCode, replaceCodeDone, keepCode, replaceMilestoneCode, replaceMilestoneCodeDone, keepMilestoneCode, playground }, { replaceCode: 2, replaceCodeDone: 1, keepCode: 3, replaceMilestoneCode: 0, replaceMilestoneCodeDone: 1, keepMilestoneCode: 2, playground: "replace" });
  assert.deepEqual(summaryText(s).merge, [
    "adds 0 finished steps and 2 finished challenges",
    "adds 1 finished project milestone",
    "replaces your code in 2 challenges where the import's is newer",
    "replaces your code in 1 challenge you haven't finished with the import's finished code",
    "replaces your code in 1 project milestone you haven't finished with the import's finished code",
    "keeps your code in 3 challenges where the import's is different (yours was saved later, or there's no save time to compare)",
    "keeps your code in 2 project milestones where the import's is different (yours was saved later, or there's no save time to compare)",
    "replaces your Playground program with the import's newer one",
  ]);
  // What the merge does matches the summary.
  const m = mergeTransfer(local, { code: "x", stdin: "" }, tr(imp, { code: "y", stdin: "", savedAt: T0 }));
  assert.deepEqual(Object.values(m.state.steps.s.challenges).map((c) => c.code), ["a there", "b there", "c there", "d here", "e here", "f here"]);
  assert.deepEqual(Object.values(m.state.projects.p.milestones).map((c) => c.code), ["m1 there", "m2 here", "m3 here"]);
  assert.equal(m.playground.code, "y");
  // Different code the merge doesn't take is never "changes nothing".
  const only = summaryText(summarize(state({ steps: steps({ 0: ch({ code: "mine", savedAt: T0 }) }) }), null, tr(state({ steps: steps({ 0: ch({ code: "older" }) }) }))));
  assert.deepEqual(only.merge, ["keeps your code in 1 challenge where the import's is different (yours was saved later, or there's no save time to compare)"]);
});

test("the summary leaves out counts that are zero", () => {
  const t = (s, withCode = true, pg = null) => summaryText(summarize(state(), null, tr(s, pg, withCode))).has;
  assert.equal(t(state()), "It has no finished steps, challenges or practiced drills, with no saved code.");
  assert.equal(t(state(), false), "It has no finished steps, challenges or practiced drills, without code.");
  assert.equal(t(state(), true, { code: "p", stdin: "" }), "It has no finished steps, challenges or practiced drills, with saved code in a Playground program.");
  const one = state({ steps: { s: { done: true, challenges: { 0: ch({ done: true, code: "x" }) } } } });
  assert.equal(t(one), "It has 1 finished step and 1 finished challenge, with saved code in 1 challenge.");
  const drills = state({ drills: { a: { box: 1, right: 0, wrong: 1, last: T0, due: T0 } } });
  assert.equal(t(drills, false), "It has 1 practiced drill, without code.");
  assert.doesNotMatch(summaryText(summarize(state(), null, tr(sample()))).has, /\b0 /);
});

test("a step that isn't done keeps no finishing time or clean, whichever side has it, so merging twice changes nothing", () => {
  for (const odd of [{ done: false, doneAt: T0 + 5, challenges: {} }, { done: false, clean: true, challenges: {} }, { done: false, doneAt: T0, clean: true, challenges: { 0: ch() } }]) {
    const withIt = state({ steps: { s: odd } });
    for (const [l, i] of [[withIt, state()], [state(), withIt], [withIt, withIt]]) {
      const got = idempotent(l, i).state.steps.s;
      assert.equal(got.done, false);
      assert.equal("doneAt" in got, false);
      assert.equal("clean" in got, false);
    }
  }
  // A done step keeps them.
  const done = state({ steps: { s: { done: true, doneAt: T0, clean: true, challenges: {} } } });
  for (const [l, i] of [[done, state()], [state(), done]]) assert.deepEqual(idempotent(l, i).state.steps.s, { done: true, doneAt: T0, clean: true, challenges: {} });
});

// ---------------------------------------------------------------- QR codes

/** Draws a QR drawing's path at `scale` pixels per module, black on white, as RGBA. */
function raster(q, scale) {
  const w = q.size * scale;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (const [, x, y, len] of q.path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g))
    for (let yy = Number(y) * scale; yy < (Number(y) + 1) * scale; yy++)
      for (let xx = Number(x) * scale; xx < (Number(x) + Number(len)) * scale; xx++) px.set([0, 0, 0, 255], (yy * w + xx) * 4);
  return { px, w };
}

test("QR codes of links up to the limit are drawn and a QR decoder reads them back exactly", () => {
  const base = "https://antonyperez0.github.io/Java-Arena/transfer/#p=";
  const filler = "Zx9-_aQ3".repeat(200);
  for (const len of [base.length + 1, 200, 600, 1000, QR_MAX_CHARS]) {
    const link = base + filler.slice(0, len - base.length);
    const q = qrFor(link);
    assert.ok(q, `a QR code for ${len} characters`);
    assert.ok(q.version <= QR_MAX_VERSION);
    assert.equal(q.size, 17 + 4 * q.version + 8, "the quiet zone of 4 modules is included");
    const { px, w } = raster(q, 3);
    const read = jsQR(px, w, w);
    assert.equal(read?.data, link, `the decoder reads ${len} characters back`);
  }
  assert.equal(qrFor(base + filler.slice(0, QR_MAX_CHARS + 1 - base.length)), null, "one character over the limit is refused");
  assert.equal(qrFor("é"), null, "only ASCII links");
});

test("a real transfer link's QR code decodes to a link that imports", async () => {
  const s = state({ steps: { "printing-first-program": { done: true, doneAt: T0, clean: true, challenges: { 0: ch({ done: true, attempts: 1 }) } } } });
  const link = "https://antonyperez0.github.io/Java-Arena/transfer/#" + (await encodeTransfer(tr(s, null, false)));
  const q = qrFor(link);
  const { px, w } = raster(q, 2);
  const read = jsQR(px, w, w).data;
  const t = await decodeTransfer(new URL(read).hash);
  assert.equal(t.steps["printing-first-program"].done, true);
});

// ---------------------------------------------------------------- the Pro Track's checklists

const tick = (done, at) => ({ done, at });

test("the Pro Track's checklists travel in links (with and without code) and files, and older progress without them reads as none", async () => {
  // The site's ticks are whole seconds (setTick), which a link carries exactly.
  const s = state({ pro: { "word-stats": { items: { setup: tick(true, T0 + 10_000), tests: tick(false, T0 + 20_000), run: tick(true, T0 + 3_000) } }, "card-game": { items: {} } } });
  for (const withCode of [true, false]) {
    const t = await decodeTransfer(await encodeTransfer(tr(s, null, withCode)));
    assert.deepEqual(t.pro, s.pro, `link, withCode ${withCode}`);
  }
  assert.deepEqual(parseFile(fileText(tr(s), "x")).pro, s.pro);
  // In a link, times are seconds after the item before; a time between seconds is rounded up, never earlier.
  assert.deepEqual(toWire(tr(s)).k, [["word-stats", [["run", 1, (T0 + 3_000) / 1000], ["setup", 1, 7], ["tests", 0, 10]]], ["card-game", []]]);
  const odd = state({ pro: { p: { items: { a: tick(false, T0 + 1), b: tick(true, T0 + 999) } } } });
  assert.deepEqual((await decodeTransfer(await encodeTransfer(tr(odd)))).pro, { p: { items: { a: tick(false, T0 + 1000), b: tick(true, T0 + 1000) } } });
  assert.deepEqual(parseFile(fileText(tr(odd), "x")).pro, odd.pro, "a file keeps the exact times");
  // A link or file from before Batch 20 has no Pro Track: none, not damage.
  const old = toWire(tr(state()));
  assert.equal("k" in old, false, "left out when there are none");
  assert.deepEqual((await decodeTransfer(await encodeTransfer(tr(state())))).pro, {});
  const oldFile = JSON.parse(fileText(tr(state()), "x"));
  delete oldFile.data.pro;
  assert.deepEqual(parseFile(JSON.stringify(oldFile)).pro, {});
});

test("a damaged Pro Track checklist is refused", () => {
  const file = (pro) => {
    const f = JSON.parse(fileText(tr(state()), "x"));
    f.data.pro = pro;
    return JSON.stringify(f);
  };
  for (const bad of [[1], { p: 1 }, { p: { items: [] } }, { p: { items: { a: { done: true } } } }, { p: { items: { a: { done: "yes", at: 1 } } } }]) assert.throws(() => parseFile(file(bad)), (e) => e instanceof TransferError && e.problem === "damaged", JSON.stringify(bad));
});

test("merging the Pro Track: each item from the side that changed it later (an untick too), the same both ways, and idempotent; Replace takes the import's", () => {
  const a = state({ pro: { p: { items: { one: tick(true, T0 + 1), two: tick(true, T0 + 5), three: tick(false, T0 + 9) } } } });
  const b = state({ pro: { p: { items: { one: tick(false, T0 + 3), two: tick(true, T0 + 2), four: tick(true, T0 + 4) } }, q: { items: { x: tick(true, T0) } } } });
  const ab = merge(a, b).state.pro;
  assert.deepEqual(ab, { p: { items: { four: tick(true, T0 + 4), one: tick(false, T0 + 3), three: tick(false, T0 + 9), two: tick(true, T0 + 5) } }, q: { items: { x: tick(true, T0) } } });
  assert.deepEqual(merge(b, a).state.pro, ab);
  assert.deepEqual(merge(merge(a, b).state, b).state.pro, ab, "merging the same import again changes nothing");
  // At the same time, ticked wins (so the order doesn't matter).
  const c = state({ pro: { p: { items: { one: tick(false, T0) } } } });
  const d = state({ pro: { p: { items: { one: tick(true, T0) } } } });
  assert.deepEqual(merge(c, d).state.pro, merge(d, c).state.pro);
  assert.equal(merge(c, d).state.pro.p.items.one.done, true);
  assert.deepEqual(replaceWithTransfer(tr(b), null, 1).state.pro, b.pro);
});

test("the summary counts the Pro Track items marked as done and the ones Merge would change, only those still on the checklists", () => {
  const local = state({ pro: { p: { items: { one: tick(true, T0 + 9), two: tick(false, T0) } } } });
  // gone is no longer on p's checklist, and the project old is no longer on the Pro Track: as on the pages, they don't count.
  const imp = state({ pro: { p: { items: { one: tick(false, T0 + 1), two: tick(true, T0 + 2), three: tick(true, T0 + 3), four: tick(false, T0 + 4), gone: tick(true, T0 + 5) } }, old: { items: { x: tick(true, T0) } } } });
  const projects = [{ id: "p", checklist: [{ id: "one" }, { id: "two" }, { id: "three" }, { id: "four" }] }, { id: "q", checklist: [{ id: "x" }] }];
  const s = summarize(local, null, tr(imp), projects);
  assert.equal(s.has.proTicks, 2);
  assert.equal(s.merge.proItems, 2, "two and three; one stays ticked here (changed later here), four is unticked on both");
  assert.equal(summarize(local, null, tr(imp)).has.proTicks, 0, "without the Pro Track's projects, nothing counts");
  const text = summaryText(s);
  assert.match(text.has, /2 Pro Track checklist items marked as done/);
  assert.ok(text.merge.includes("ticks or unticks 2 Pro Track checklist items as they were changed later there"), text.merge.join("; "));
});
