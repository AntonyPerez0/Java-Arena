// Moving progress to another device: a transfer link (/transfer/#p=...), a progress file, and
// the merging of imported progress into this browser's. Nothing here touches the store or the
// page: it takes and returns plain data, so the unit tests (scripts/transfer.test.mjs) can run it.
//
// A transfer link is the same kind of data as a Playground share link (src/lib/share.ts): JSON,
// compressed with deflate-raw, then base64url. Its JSON is a compact form of the progress (steps
// and drills as arrays, sorted by time, each time written as the difference from the one before),
// because a finished course has over a thousand of each. A progress file holds the same progress
// in the store's own shape, as readable JSON. Both decode to a Transfer and are checked field by
// field, so a damaged link or file is refused before anything changes.
import type { ChallengeProgress, DmMode, DmStats, DrillStat, MilestoneProgress, ProProgress, ProTick, ProjectProgress, RunRecord, State, StepProgress, Theme } from "../state/store";
import { mergePro, tickCount, type ProChecklists } from "./pro.ts";

/** The format version of links and files. A newer one is refused with a message to reload the site. */
export const TRANSFER_VERSION = 1;
/** The `format` of a progress file. */
export const FILE_FORMAT = "java-arena-progress";
/** Above this many characters, the page says that some apps cut long links and suggests the file. */
export const LONG_LINK = 8000;

/** The Playground's saved program (localStorage "java-arena-playground"); `savedAt` from Batch 19 on. */
export type PlaygroundSave = { code: string; stdin: string; samples?: string[]; savedAt?: number };

/** The progress a link or file carries. Without code, no challenge has code, blanks or savedAt, and there's no Playground program. */
export type Transfer = {
  withCode: boolean;
  /** When the link or file was made (ms). */
  madeAt: number;
  steps: Record<string, StepProgress>;
  /** Projects' milestones (without code, no milestone has code, passed or savedAt). */
  projects: Record<string, ProjectProgress>;
  /** The Pro Track's checklists (the learner's own ticks), with or without code. */
  pro: Record<string, ProProgress>;
  drills: Record<string, DrillStat>;
  dm: DmStats;
  daily: Record<string, boolean>;
  placed: string[];
  placedAt?: number;
  settings: State["settings"];
  playground?: PlaygroundSave;
};

export type TransferProblem = "damaged" | "unknown" | "newer" | "unsupported";

/** A link or file that can't be imported. `message` is shown to the learner as it is. */
export class TransferError extends Error {
  problem: TransferProblem;
  constructor(problem: TransferProblem, message: string) {
    super(message);
    this.problem = problem;
  }
}

const MODES: DmMode[] = ["deathmatch", "casual", "warmup", "interview"];
const THEMES: Theme[] = ["system", "dark", "light"];

// ---------------------------------------------------------------- making a transfer

/** What a link or file carries, from this browser's progress and Playground program. */
export function makeTransfer(s: State, playground: PlaygroundSave | null, withCode: boolean, now: number): Transfer {
  // The record page's name is never sent anywhere (it says so there), so no link, QR code or file carries it.
  const { name, ...settings } = s.settings;
  const steps: Record<string, StepProgress> = {};
  for (const [id, p] of Object.entries(s.steps)) {
    const challenges: Record<number, ChallengeProgress> = {};
    for (const [k, c] of Object.entries(p.challenges)) {
      const { code, blanks, savedAt, ...rest } = c;
      challenges[Number(k)] = withCode ? c : rest;
    }
    steps[id] = { ...p, challenges };
  }
  const projects: Record<string, ProjectProgress> = {};
  for (const [id, p] of Object.entries(s.projects ?? {})) {
    const milestones: Record<string, MilestoneProgress> = {};
    for (const [k, c] of Object.entries(p.milestones)) {
      const { code, blanks, savedAt, passed, ...rest } = c;
      milestones[k] = withCode ? c : rest;
    }
    projects[id] = { ...p, milestones };
  }
  return {
    withCode,
    madeAt: now,
    steps,
    projects,
    pro: s.pro ?? {},
    drills: s.drills,
    dm: s.dm,
    daily: s.daily,
    placed: s.placed,
    ...(s.placedAt != null ? { placedAt: s.placedAt } : {}),
    settings,
    ...(withCode && playground ? { playground } : {}),
  };
}

// ---------------------------------------------------------------- checking what comes in

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isCount = (v: unknown): v is number => isNum(v) && Number.isInteger(v) && v >= 0;
const damaged = (what: string): never => {
  throw new TransferError("damaged", `This progress is damaged (${what}), so nothing was changed.`);
};
const count = (v: unknown, what: string) => (isCount(v) ? v : damaged(what));
const optTime = (v: unknown, what: string) => (v == null ? undefined : isNum(v) ? v : damaged(what));
/** A yes or no: a boolean, or missing (false). Anything else, such as the text "false", is damage, not a yes. */
const flag = (v: unknown, what: string) => (v == null ? false : typeof v === "boolean" ? v : damaged(what));
const strings = (v: unknown, what: string) => (Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : damaged(what));

function checkChallenge(v: unknown, withCode: boolean): ChallengeProgress {
  if (!isObj(v)) return damaged("a challenge");
  const c: ChallengeProgress = { done: flag(v.done, "a challenge's done"), hintsUsed: count(v.hintsUsed ?? 0, "hints used"), attempts: count(v.attempts ?? 0, "attempts") };
  if (flag(v.sawSolution, "a challenge's solution")) c.sawSolution = true;
  if (withCode) {
    if (v.code != null) c.code = typeof v.code === "string" ? v.code : damaged("saved code");
    if (v.blanks != null) c.blanks = strings(v.blanks, "saved blanks");
    const at = optTime(v.savedAt, "a save time");
    if (at != null) c.savedAt = at;
  }
  return c;
}

function checkStep(v: unknown, withCode: boolean): StepProgress {
  if (!isObj(v) || !isObj(v.challenges)) return damaged("a step");
  const challenges: Record<number, ChallengeProgress> = {};
  for (const [k, c] of Object.entries(v.challenges)) {
    if (!/^\d{1,3}$/.test(k)) damaged("a challenge number");
    challenges[Number(k)] = checkChallenge(c, withCode);
  }
  const p: StepProgress = { done: flag(v.done, "a step's done"), challenges };
  const at = optTime(v.doneAt, "a finishing time");
  if (at != null) p.doneAt = at;
  if (flag(v.clean, "a step's flags")) p.clean = true;
  return p;
}

function checkMilestone(v: unknown, withCode: boolean): MilestoneProgress {
  const c: MilestoneProgress = checkChallenge(v, withCode);
  if (withCode && isObj(v) && v.passed != null) c.passed = typeof v.passed === "string" ? v.passed : damaged("a milestone's code");
  return c;
}

function checkProject(v: unknown, withCode: boolean): ProjectProgress {
  if (!isObj(v) || !isObj(v.milestones)) return damaged("a project");
  const milestones: Record<string, MilestoneProgress> = {};
  for (const [k, c] of Object.entries(v.milestones)) milestones[k] = checkMilestone(c, withCode);
  const p: ProjectProgress = { done: flag(v.done, "a project's done"), milestones };
  const at = optTime(v.doneAt, "a finishing time");
  if (at != null) p.doneAt = at;
  return p;
}

function checkPro(v: unknown): ProProgress {
  if (!isObj(v) || !isObj(v.items)) return damaged("a Pro Track checklist");
  const items: Record<string, ProTick> = {};
  for (const [k, t] of Object.entries(v.items)) {
    if (!isObj(t) || !isNum(t.at)) return damaged("a Pro Track checklist item");
    items[k] = { done: flag(t.done, "a Pro Track checklist item"), at: t.at };
  }
  return { items };
}

function checkDrill(v: unknown): DrillStat {
  if (!isObj(v)) return damaged("a drill");
  const box = count(v.box, "a drill's box");
  if (box < 1 || box > 5) damaged("a drill's box");
  return { box, right: count(v.right, "a drill's count"), wrong: count(v.wrong, "a drill's count"), last: isNum(v.last) ? v.last : damaged("a drill's time"), due: isNum(v.due) ? v.due : damaged("a drill's time") };
}

function checkDm(v: unknown): DmStats {
  if (!isObj(v) || !isObj(v.best) || !Array.isArray(v.runs) || !isObj(v.days)) return damaged("Deathmatch");
  const best = {} as Record<DmMode, number>;
  for (const m of MODES) best[m] = count(v.best[m] ?? 0, "a best streak");
  const runs: RunRecord[] = v.runs.map((r) => {
    if (!isObj(r) || !MODES.includes(r.mode as DmMode)) return damaged("a Deathmatch run");
    return { at: isNum(r.at) ? r.at : damaged("a Deathmatch run"), mode: r.mode as DmMode, streak: count(r.streak, "a run"), reps: count(r.reps, "a run"), kills: count(r.kills, "a run") };
  });
  const days: Record<string, number> = {};
  for (const [d, n] of Object.entries(v.days)) days[d] = count(n, "reps of a day");
  return { best, runs, reps: count(v.reps ?? 0, "Deathmatch reps"), kills: count(v.kills ?? 0, "Deathmatch reps"), bossKills: count(v.bossKills ?? 0, "Deathmatch reps"), days };
}

function checkSettings(v: unknown): State["settings"] {
  if (!isObj(v)) return damaged("the settings");
  return {
    theme: THEMES.includes(v.theme as Theme) ? (v.theme as Theme) : "system",
    textScale: [1, 1.125, 1.25, 1.4].includes(v.textScale as number) ? (v.textScale as number) : 1,
    mobileData: !!v.mobileData,
    sound: !!v.sound,
    unlockAll: !!v.unlockAll,
    topicsOff: Array.isArray(v.topicsOff) ? strings(v.topicsOff, "the settings") : [],
    boss: v.boss !== false,
    keys: v.keys !== false,
    // The record page's name. Transfers leave it out (makeTransfer), but links and files made before
    // that may carry one; only when there is one, so older transfers read as before.
    ...(typeof v.name === "string" && v.name ? { name: v.name.slice(0, 80) } : {}),
  };
}

function checkPlayground(v: unknown): PlaygroundSave | undefined {
  if (v == null) return undefined;
  if (!isObj(v) || typeof v.code !== "string") return damaged("the Playground program");
  const p: PlaygroundSave = { code: v.code, stdin: typeof v.stdin === "string" ? v.stdin : "" };
  if (Array.isArray(v.samples)) p.samples = strings(v.samples, "the Playground program");
  const at = optTime(v.savedAt, "the Playground program");
  if (at != null) p.savedAt = at;
  return p;
}

/** Checks progress in the store's shape (a file's `data`, or an expanded link) and returns a clean copy. Throws a TransferError. */
export function checkTransfer(v: unknown, withCode: boolean, madeAt: number): Transfer {
  if (!isObj(v) || !isObj(v.steps) || !isObj(v.drills) || !isObj(v.daily)) return damaged("its parts are missing");
  const steps: Record<string, StepProgress> = {};
  for (const [id, p] of Object.entries(v.steps)) steps[id] = checkStep(p, withCode);
  const drills: Record<string, DrillStat> = {};
  for (const [id, d] of Object.entries(v.drills)) drills[id] = checkDrill(d);
  // Projects came in Batch 19, with this format: progress without any has none.
  if (v.projects != null && !isObj(v.projects)) damaged("the projects");
  const projects: Record<string, ProjectProgress> = {};
  for (const [id, p] of Object.entries(isObj(v.projects) ? v.projects : {})) projects[id] = checkProject(p, withCode);
  // The Pro Track came in Batch 20, with this format: progress without it has none.
  if (v.pro != null && !isObj(v.pro)) damaged("the Pro Track");
  const pro: Record<string, ProProgress> = {};
  for (const [id, p] of Object.entries(isObj(v.pro) ? v.pro : {})) pro[id] = checkPro(p);
  const daily: Record<string, boolean> = {};
  for (const [d, ok] of Object.entries(v.daily)) daily[d] = flag(ok, "a daily answer");
  const t: Transfer = { withCode, madeAt, steps, projects, pro, drills, dm: checkDm(v.dm), daily, placed: strings(v.placed ?? [], "the placement"), settings: checkSettings(v.settings) };
  const placedAt = optTime(v.placedAt, "the placement");
  if (placedAt != null) t.placedAt = placedAt;
  const pg = withCode ? checkPlayground(v.playground) : undefined;
  if (pg) t.playground = pg;
  return t;
}

// ---------------------------------------------------------------- the link's compact form

/**
 * The link's JSON: { v, c (1: with code), t (made at), s (steps), d (drills), m, y, p, pa, g, pg }.
 * s: [id, flags (1 done, 2 clean), doneAt as the difference from the step before (null: none), challenges]
 * sorted by doneAt, where challenges[k] is 0 (none) or [flags (1 done, 2 saw the solution), hints,
 * attempts] and, with code, [..., code, blanks, savedAt] (null where missing).
 * d: [id, box, right, wrong, last as the difference from the drill before, due - last] sorted by last.
 * j (projects, left out when there are none): [id, flags (1 done), doneAt (null: none), milestones],
 * where each milestone is [id, flags (1 done, 2 saw the solution), hints, attempts] and, with code,
 * [..., code, passed, savedAt] (null where missing).
 * k (the Pro Track's checklists, left out when there are none): [id, items], where each item is
 * [id, 1 ticked or 0 not, the time it changed in whole seconds (rounded up) as the difference from
 * the item before], sorted by that time.
 */
type Wire = {
  v: number;
  c: 0 | 1;
  t: number;
  s: unknown[];
  j?: unknown[];
  k?: unknown[];
  d: unknown[];
  m: DmStats;
  y: Record<string, boolean>;
  p: string[];
  pa?: number;
  g: State["settings"];
  pg?: PlaygroundSave;
};

/** Sorts by a time (missing times last) and writes each as the difference from the one before. */
function deltas<T>(items: T[], time: (x: T) => number | undefined): [T, number | null][] {
  const sorted = [...items].sort((a, b) => (time(a) ?? Infinity) - (time(b) ?? Infinity));
  let prev = 0;
  return sorted.map((x) => {
    const t = time(x);
    if (t == null) return [x, null];
    const d = t - prev;
    prev = t;
    return [x, d];
  });
}

export function toWire(t: Transfer): Wire {
  const s = deltas(Object.entries(t.steps), ([, p]) => p.doneAt).map(([[id, p], dt]) => {
    const n = Math.max(-1, ...Object.keys(p.challenges).map(Number)) + 1;
    const ch = Array.from({ length: n }, (_, k) => {
      const c = p.challenges[k];
      if (!c) return 0;
      const base: unknown[] = [(c.done ? 1 : 0) | (c.sawSolution ? 2 : 0), c.hintsUsed, c.attempts];
      if (t.withCode && (c.code != null || c.blanks != null || c.savedAt != null)) base.push(c.code ?? null, c.blanks ?? null, c.savedAt ?? null);
      return base;
    });
    return [id, (p.done ? 1 : 0) | (p.clean ? 2 : 0), dt, ch];
  });
  const d = deltas(Object.entries(t.drills), ([, x]) => x.last).map(([[id, x], dl]) => [id, x.box, x.right, x.wrong, dl, x.due - x.last]);
  const j = Object.entries(t.projects).map(([id, p]) => [
    id,
    p.done ? 1 : 0,
    p.doneAt ?? null,
    Object.entries(p.milestones).map(([k, c]) => {
      const base: unknown[] = [k, (c.done ? 1 : 0) | (c.sawSolution ? 2 : 0), c.hintsUsed, c.attempts];
      if (t.withCode && (c.code != null || c.passed != null || c.savedAt != null)) base.push(c.code ?? null, c.passed ?? null, c.savedAt ?? null);
      return base;
    }),
  ]);
  // Rounded up, so a time never moves earlier (setTick makes whole seconds, which travel exactly).
  const k = Object.entries(t.pro).map(([id, p]) => [id, deltas(Object.entries(p.items), ([, x]) => Math.ceil(x.at / 1000)).map(([[item, x], dt]) => [item, x.done ? 1 : 0, dt])]);
  return {
    v: TRANSFER_VERSION,
    c: t.withCode ? 1 : 0,
    t: t.madeAt,
    s,
    ...(j.length ? { j } : {}),
    ...(k.length ? { k } : {}),
    d,
    m: t.dm,
    y: t.daily,
    p: t.placed,
    ...(t.placedAt != null ? { pa: t.placedAt } : {}),
    g: t.settings,
    ...(t.playground ? { pg: t.playground } : {}),
  };
}

/** The link's JSON back to a checked Transfer. Throws a TransferError. */
export function fromWire(w: unknown): Transfer {
  if (!isObj(w) || !isNum(w.v)) throw new TransferError("unknown", "This isn't a Java Arena transfer link, so nothing was changed.");
  if (w.v > TRANSFER_VERSION) throw newer("link");
  if (w.v !== TRANSFER_VERSION || !Array.isArray(w.s) || !Array.isArray(w.d)) throw new TransferError("unknown", "This isn't a Java Arena transfer link, so nothing was changed.");
  const withCode = w.c === 1;
  const steps: Record<string, unknown> = {};
  let prev = 0;
  for (const row of w.s) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !isCount(row[1]) || !Array.isArray(row[3])) return damaged("a step");
    const [id, flags, dt, ch] = row as [string, number, unknown, unknown[]];
    let doneAt: number | undefined;
    if (dt != null) {
      if (!isNum(dt)) return damaged("a finishing time");
      doneAt = prev + dt;
      prev = doneAt;
    }
    const challenges: Record<number, unknown> = {};
    ch.forEach((c, k) => {
      if (c === 0) return;
      if (!Array.isArray(c) || !isCount(c[0])) return damaged("a challenge");
      challenges[k] = { done: !!(c[0] & 1), sawSolution: !!(c[0] & 2), hintsUsed: c[1], attempts: c[2], code: c[3], blanks: c[4], savedAt: c[5] };
    });
    steps[id] = { done: !!(flags & 1), clean: !!(flags & 2), doneAt, challenges };
  }
  const projects: Record<string, unknown> = {};
  if (w.j != null && !Array.isArray(w.j)) return damaged("the projects");
  for (const row of (w.j ?? []) as unknown[]) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !isCount(row[1]) || !Array.isArray(row[3])) return damaged("a project");
    const milestones: Record<string, unknown> = {};
    for (const c of row[3] as unknown[]) {
      if (!Array.isArray(c) || typeof c[0] !== "string" || !isCount(c[1])) return damaged("a milestone");
      milestones[c[0]] = { done: !!(c[1] & 1), sawSolution: !!(c[1] & 2), hintsUsed: c[2], attempts: c[3], code: c[4], passed: c[5], savedAt: c[6] };
    }
    projects[row[0]] = { done: !!(row[1] & 1), doneAt: row[2], milestones };
  }
  const pro: Record<string, unknown> = {};
  if (w.k != null && !Array.isArray(w.k)) return damaged("the Pro Track");
  for (const row of (w.k ?? []) as unknown[]) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !Array.isArray(row[1])) return damaged("a Pro Track checklist");
    const items: Record<string, unknown> = {};
    let sec = 0;
    for (const x of row[1] as unknown[]) {
      if (!Array.isArray(x) || typeof x[0] !== "string" || (x[1] !== 0 && x[1] !== 1) || !isNum(x[2])) return damaged("a Pro Track checklist item");
      sec += x[2];
      items[x[0]] = { done: x[1] === 1, at: sec * 1000 };
    }
    pro[row[0]] = { items };
  }
  const drills: Record<string, unknown> = {};
  prev = 0;
  for (const row of w.d) {
    if (!Array.isArray(row) || typeof row[0] !== "string" || !isNum(row[4]) || !isNum(row[5])) return damaged("a drill");
    const last = prev + row[4];
    prev = last;
    drills[row[0]] = { box: row[1], right: row[2], wrong: row[3], last, due: last + row[5] };
  }
  return checkTransfer({ steps, projects, pro, drills, dm: w.m, daily: w.y, placed: w.p, placedAt: w.pa, settings: w.g, playground: w.pg }, withCode, isNum(w.t) ? w.t : 0);
}

const newer = (what: "link" | "file") =>
  new TransferError("newer", `This ${what} was made by a newer version of Java Arena than the one in this browser, so nothing was changed. Reload the page to get the newest version, then try again.`);

// ---------------------------------------------------------------- bytes: deflate-raw and base64url

export const toBase64Url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
export const fromBase64Url = (text: string) => {
  const b = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

/**
 * Deflate-raw "stored" blocks (no compression): what a browser without CompressionStream writes.
 * Any deflate-raw reader reads them, so a link has one form whichever browser made it.
 */
export function storedDeflate(bytes: Uint8Array): Uint8Array {
  const blocks = Math.max(1, Math.ceil(bytes.length / 0xffff));
  const out = new Uint8Array(bytes.length + blocks * 5);
  let o = 0;
  for (let b = 0; b < blocks; b++) {
    const part = bytes.subarray(b * 0xffff, (b + 1) * 0xffff);
    out[o++] = b === blocks - 1 ? 1 : 0;
    out[o++] = part.length & 0xff;
    out[o++] = part.length >> 8;
    out[o++] = ~part.length & 0xff;
    out[o++] = (~part.length >> 8) & 0xff;
    out.set(part, o);
    o += part.length;
  }
  return out;
}

/** The part after # of a transfer link: "p=<deflate-raw JSON in base64url>". */
export async function encodeTransfer(t: Transfer, compress = typeof CompressionStream !== "undefined"): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(toWire(t)));
  let bytes: Uint8Array | null = null;
  if (compress) {
    try {
      bytes = await pipe(json, new CompressionStream("deflate-raw"));
    } catch {
      /* fall through to stored blocks */
    }
  }
  return "p=" + toBase64Url(bytes ?? storedDeflate(json));
}

/** Whether an address's hash is a transfer link's. */
export const isTransferHash = (hash: string) => /^#?p=/.test(hash);

/** Reads a transfer link's hash ("#p=..."). Throws a TransferError when it's damaged, unknown or newer. */
export async function decodeTransfer(hash: string): Promise<Transfer> {
  const m = /^#?p=([A-Za-z0-9_-]+)$/.exec(hash.trim());
  if (!m) throw new TransferError("damaged", "This transfer link is incomplete or damaged (some apps cut long links), so nothing was changed. Try a progress file instead.");
  if (typeof DecompressionStream === "undefined") throw new TransferError("unsupported", "This browser can't read transfer links. Use a progress file instead, or a newer browser.");
  let json: unknown;
  try {
    const bytes = await pipe(fromBase64Url(m[1]), new DecompressionStream("deflate-raw"));
    json = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new TransferError("damaged", "This transfer link is incomplete or damaged (some apps cut long links), so nothing was changed. Try a progress file instead.");
  }
  return fromWire(json);
}

// ---------------------------------------------------------------- progress files

/** The date as YYYY-MM-DD in local time. */
export const dayOf = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const fileName = (ms: number) => `java-arena-progress-${dayOf(ms)}.json`;

/** A progress file's text: pretty JSON with the format, its version, the site's address, the date and the data (always with code). */
export function fileText(t: Transfer, site: string): string {
  const { withCode, madeAt, ...data } = t;
  return JSON.stringify({ format: FILE_FORMAT, version: TRANSFER_VERSION, site, date: dayOf(madeAt), madeAt, withCode, data }, null, 2) + "\n";
}

/** Reads a progress file. Throws a TransferError when it's damaged, not a progress file, or from a newer version. */
export function parseFile(text: string): Transfer {
  let v: unknown;
  try {
    v = JSON.parse(text.replace(/^﻿/, ""));
  } catch {
    throw new TransferError("damaged", "This file is damaged or isn't a progress file (it isn't JSON), so nothing was changed.");
  }
  if (!isObj(v) || v.format !== FILE_FORMAT) throw new TransferError("unknown", "This isn't a Java Arena progress file, so nothing was changed.");
  if (!isNum(v.version) || !Number.isInteger(v.version) || v.version < 1) throw new TransferError("unknown", "This progress file has an unknown version, so nothing was changed.");
  if (v.version > TRANSFER_VERSION) throw newer("file");
  return checkTransfer(v.data, v.withCode !== false, isNum(v.madeAt) ? v.madeAt : 0);
}

// ---------------------------------------------------------------- merging

const hasCode = (c: ChallengeProgress | undefined) => !!c && (c.code != null || c.blanks != null);

/** Which side's saved code (code, blanks, savedAt together) a merged challenge keeps. */
export function codeFrom(local: ChallengeProgress | undefined, imp: ChallengeProgress | undefined): "local" | "import" {
  if (!hasCode(imp)) return "local";
  if (!hasCode(local)) return "import";
  // The one saved later; a tie keeps the local one.
  if (local!.savedAt != null && imp!.savedAt != null) return imp!.savedAt > local!.savedAt ? "import" : "local";
  // Every save from Batch 19 on has a time, so code without one was saved before code with one:
  // when only one side has a time, that side is newer, whichever device imports.
  if (imp!.savedAt != null) return "import";
  if (local!.savedAt != null) return "local";
  // Neither has a time: prefer the side whose challenge is done, then the local one.
  if (imp!.done && !local!.done) return "import";
  return "local";
}

function mergeChallenge(a: MilestoneProgress | undefined, b: MilestoneProgress | undefined): MilestoneProgress {
  const base = a ?? b!;
  const from = codeFrom(a, b) === "import" ? b! : a;
  const c: MilestoneProgress = {
    done: !!(a?.done || b?.done),
    hintsUsed: Math.max(a?.hintsUsed ?? 0, b?.hintsUsed ?? 0),
    attempts: Math.max(a?.attempts ?? 0, b?.attempts ?? 0),
  };
  if (a?.sawSolution || b?.sawSolution || base.sawSolution) c.sawSolution = true;
  if (from?.code != null) c.code = from.code;
  if (from?.blanks != null) c.blanks = from.blanks;
  if (from?.savedAt != null && hasCode(from)) c.savedAt = from.savedAt;
  // A milestone's last passing code goes with its code; a side without it keeps the other's.
  const passed = from?.passed ?? (from === a ? b?.passed : a?.passed);
  if (passed != null) c.passed = passed;
  return c;
}

function mergeProject(a: ProjectProgress | undefined, b: ProjectProgress | undefined): ProjectProgress {
  const milestones: Record<string, MilestoneProgress> = {};
  for (const k of [...new Set([...Object.keys(a?.milestones ?? {}), ...Object.keys(b?.milestones ?? {})])].sort()) milestones[k] = mergeChallenge(a?.milestones[k], b?.milestones[k]);
  // The first time it was finished, on either device.
  const times = [a?.done ? a.doneAt : undefined, b?.done ? b.doneAt : undefined].filter((t): t is number => t != null);
  const p: ProjectProgress = { done: !!(a?.done || b?.done), milestones };
  if (times.length) p.doneAt = Math.min(...times);
  return p;
}

// One rule whether one side or both have the step, so merging the same import twice changes nothing:
// a finishing time and "clean" count only from a side where the step is done.
function mergeStep(a: StepProgress | undefined, b: StepProgress | undefined): StepProgress {
  const challenges: Record<number, ChallengeProgress> = {};
  for (const k of [...new Set([...Object.keys(a?.challenges ?? {}), ...Object.keys(b?.challenges ?? {})].map(Number))].sort((x, y) => x - y)) challenges[k] = mergeChallenge(a?.challenges[k], b?.challenges[k]);
  // The first time it was finished, on either device.
  const times = [a?.done ? a.doneAt : undefined, b?.done ? b.doneAt : undefined].filter((t): t is number => t != null);
  const p: StepProgress = { done: !!(a?.done || b?.done), challenges };
  if (times.length) p.doneAt = Math.min(...times);
  if ((a?.done && a.clean) || (b?.done && b.clean)) p.clean = true;
  return p;
}

function mergeDm(a: DmStats, b: DmStats): DmStats {
  const best = {} as Record<DmMode, number>;
  for (const k of MODES) best[k] = Math.max(a.best[k] ?? 0, b.best[k] ?? 0);
  // A run is known by its start time; saved on both devices (an earlier import), the copy with more reps.
  const byStart = new Map<number, RunRecord>();
  for (const r of [...a.runs, ...b.runs]) if ((byStart.get(r.at)?.reps ?? -1) < r.reps) byStart.set(r.at, r);
  const runs = [...byStart.values()].sort((x, y) => y.at - x.at).slice(0, 50);
  const days: Record<string, number> = { ...a.days };
  for (const [d, n] of Object.entries(b.days)) days[d] = Math.max(days[d] ?? 0, n);
  // The totals take the larger of the two, not the sum: after one import the two devices share
  // the reps made before it, and the totals can't tell which reps those were, so adding them
  // would count those twice (and again at every later import).
  return { best, runs, reps: Math.max(a.reps, b.reps), kills: Math.max(a.kills, b.kills), bossKills: Math.max(a.bossKills, b.bossKills), days };
}

/**
 * The Playground program a merge keeps: the one saved later (a tie keeps the local one); when only
 * one has a time, that one, as for a challenge's code (see codeFrom); without a time on either, the
 * local one (if there is one).
 */
export function playgroundFrom(local: PlaygroundSave | null, imp: PlaygroundSave | undefined): "local" | "import" {
  if (!imp) return "local";
  if (!local) return "import";
  if (local.savedAt != null && imp.savedAt != null) return imp.savedAt > local.savedAt ? "import" : "local";
  return imp.savedAt != null ? "import" : "local";
}

export type Merged = { state: State; playground: PlaygroundSave | null };

/**
 * "Merge into my progress": a step or challenge (or a project's milestone) done in either is done; a challenge's (or milestone's) code is the
 * one saved later (see codeFrom); hints and attempts take the larger; a drill keeps the record
 * reviewed later; Deathmatch bests and totals take the larger and runs merge by time (at most 50);
 * daily answers join (a day in both keeps the local answer); the placement skips come from the side
 * that changed them later, as between tabs (src/state/store.ts), and join only when neither side has
 * a time; a Pro Track checklist item comes from the side that changed it later; settings stay local.
 * Merging the same import again changes nothing.
 */
export function mergeTransfer(local: State, localPlayground: PlaygroundSave | null, imp: Transfer): Merged {
  const steps: Record<string, StepProgress> = {};
  for (const id of new Set([...Object.keys(local.steps), ...Object.keys(imp.steps)])) steps[id] = mergeStep(local.steps[id], imp.steps[id]);
  const projects: Record<string, ProjectProgress> = {};
  for (const id of new Set([...Object.keys(local.projects ?? {}), ...Object.keys(imp.projects)])) projects[id] = mergeProject(local.projects?.[id], imp.projects[id]);
  const drills: Record<string, DrillStat> = { ...local.drills };
  for (const [id, d] of Object.entries(imp.drills)) if (!drills[id] || d.last > drills[id].last) drills[id] = d;
  // "Stop skipping them" empties the list with a new time, so the later choice wins rather than a join
  // that would bring old skips back. A missing time counts as 0, and on equal times the local list stays.
  const placedFrom = local.placedAt == null && imp.placedAt == null ? null : (imp.placedAt ?? 0) > (local.placedAt ?? 0) ? imp : local;
  const placed = placedFrom ? placedFrom.placed : [...local.placed, ...imp.placed.filter((m) => !local.placed.includes(m))];
  const state: State = {
    ...local,
    steps,
    projects,
    pro: mergePro(local.pro, imp.pro),
    drills,
    dm: mergeDm(local.dm, imp.dm),
    daily: { ...imp.daily, ...local.daily },
    placed,
    placedAt: placedFrom?.placedAt,
    settings: local.settings,
  };
  if (state.placedAt === undefined) delete state.placedAt;
  return { state, playground: playgroundFrom(localPlayground, imp.playground) === "import" ? imp.playground! : localPlayground };
}

/**
 * "Replace my progress": the import's progress and settings, except the record page's name, which
 * never travels (makeTransfer leaves it out) and so stays as typed here. Without code, code saved here is
 * dropped too (the progress becomes exactly the import's). The Playground program isn't progress:
 * the import's replaces this browser's, and when the import has none, this browser's stays.
 * `resetAt` makes the replacement win over this browser's other open tabs, as "Delete all
 * progress" does.
 */
export function replaceWithTransfer(imp: Transfer, localPlayground: PlaygroundSave | null, now: number, localName?: string): Merged {
  const settings: State["settings"] = { ...imp.settings, ...(localName ? { name: localName } : {}) };
  const state: State = { version: 1, steps: imp.steps, projects: imp.projects, pro: imp.pro, drills: imp.drills, dm: imp.dm, daily: imp.daily, placed: imp.placed, settings, resetAt: now };
  if (imp.placedAt != null) state.placedAt = imp.placedAt;
  return { state, playground: imp.playground ?? localPlayground };
}

// ---------------------------------------------------------------- the summary shown before importing

export type ImportSummary = {
  withCode: boolean;
  madeAt: number;
  /** What the import has. */
  has: { steps: number; challenges: number; drills: number; code: number; milestoneCode: number; playground: boolean; runs: number; milestones: number; proTicks: number };
  /** What this browser has now. */
  mine: { steps: number; challenges: number; drills: number; code: number; playground: boolean };
  /** What "Merge" would change. */
  merge: {
    addSteps: number;
    addChallenges: number;
    /** Drills new here, or reviewed later on the other device. */
    drills: number;
    keepSteps: number;
    /** Project milestones finished in the import and not here. */
    addMilestones: number;
    /** Project milestones whose code would come from the import because it was saved later, replacing code saved here. */
    replaceMilestoneCode: number;
    /** Project milestones whose code would come from the import only because neither has a save time and the import's milestone is done and this one isn't. */
    replaceMilestoneCodeDone: number;
    /** Project milestones where the import has different code and this browser's stays. */
    keepMilestoneCode: number;
    /** Challenges whose code would come from the import because it was saved later, replacing code saved here. */
    replaceCode: number;
    /** Challenges whose code would come from the import only because neither has a save time and the import's challenge is done and this one isn't. */
    replaceCodeDone: number;
    /** Challenges where the import has different code and this browser's stays. */
    keepCode: number;
    /** Challenges with code from the import where there is none here. */
    addCode: number;
    /** Pro Track checklist items the import would change (ticked or unticked there later than here). */
    proItems: number;
    playground: "replace" | "add" | "keep" | "none";
  };
};

const stepsDone = (s: Record<string, StepProgress>) => Object.values(s).filter((p) => p.done).length;
const challengesDone = (s: Record<string, StepProgress>) => Object.values(s).reduce((n, p) => n + Object.values(p.challenges).filter((c) => c.done).length, 0);
const milestonesDone = (p: Record<string, ProjectProgress>) => Object.values(p).reduce((n, x) => n + Object.values(x.milestones).filter((c) => c.done).length, 0);
const codeCount = (s: Record<string, StepProgress>) => Object.values(s).reduce((n, p) => n + Object.values(p.challenges).filter(hasCode).length, 0);
const milestoneCodeCount = (p: Record<string, ProjectProgress>) => Object.values(p).reduce((n, x) => n + Object.values(x.milestones).filter(hasCode).length, 0);
const sameCode = (a: ChallengeProgress, b: ChallengeProgress) => a.code === b.code && JSON.stringify(a.blanks) === JSON.stringify(b.blanks);

/**
 * Where a merge's code comes from, when both sides have code: "import" (saved later, or the only
 * side with a save time), "import-done" (neither has a time; the import's is done and this one
 * isn't), or "local".
 */
function codeReason(mine: ChallengeProgress, imp: ChallengeProgress): "import" | "import-done" | "local" {
  if (codeFrom(mine, imp) === "local") return "local";
  return mine.savedAt == null && imp.savedAt == null ? "import-done" : "import";
}

/** How many Pro Track checklist items a merge would change here (items and projects no longer on the list don't count). */
function proChanges(local: Record<string, ProProgress> | undefined, imp: Record<string, ProProgress>, projects: ProChecklists): number {
  const merged = mergePro(local, imp);
  let n = 0;
  for (const p of projects)
    for (const { id: k } of p.checklist) {
      const t = merged[p.id]?.items[k];
      if (t && (local?.[p.id]?.items[k]?.done ?? false) !== t.done) n++;
    }
  return n;
}

/**
 * What an import has and what Merge and Replace would change. `proProjects` are the Pro Track's
 * projects (virtual:pro-track): the summary counts only checklist items still on their lists, as
 * the pages do.
 */
export function summarize(local: State, localPlayground: PlaygroundSave | null, imp: Transfer, proProjects: ProChecklists = []): ImportSummary {
  let addChallenges = 0;
  let replaceCode = 0;
  let replaceCodeDone = 0;
  let keepCode = 0;
  let addCode = 0;
  for (const [id, p] of Object.entries(imp.steps))
    for (const [k, c] of Object.entries(p.challenges)) {
      const mine = local.steps[id]?.challenges[Number(k)];
      if (c.done && !mine?.done) addChallenges++;
      if (!hasCode(c)) continue;
      if (!hasCode(mine)) {
        addCode++;
        continue;
      }
      if (sameCode(mine!, c)) continue;
      const why = codeReason(mine!, c);
      if (why === "import") replaceCode++;
      else if (why === "import-done") replaceCodeDone++;
      else keepCode++;
    }
  let addMilestones = 0;
  let replaceMilestoneCode = 0;
  let replaceMilestoneCodeDone = 0;
  let keepMilestoneCode = 0;
  for (const [id, p] of Object.entries(imp.projects))
    for (const [k, c] of Object.entries(p.milestones)) {
      const mine = local.projects?.[id]?.milestones[k];
      if (c.done && !mine?.done) addMilestones++;
      if (!hasCode(c) || !hasCode(mine) || mine!.code === c.code) continue;
      const why = codeReason(mine!, c);
      if (why === "import") replaceMilestoneCode++;
      else if (why === "import-done") replaceMilestoneCodeDone++;
      else keepMilestoneCode++;
    }
  const pg = playgroundFrom(localPlayground, imp.playground);
  const pgDiffers = !!imp.playground && imp.playground.code !== localPlayground?.code;
  return {
    withCode: imp.withCode,
    madeAt: imp.madeAt,
    has: {
      steps: stepsDone(imp.steps),
      challenges: challengesDone(imp.steps),
      drills: Object.keys(imp.drills).length,
      code: codeCount(imp.steps),
      milestoneCode: milestoneCodeCount(imp.projects),
      playground: !!imp.playground,
      runs: imp.dm.runs.length,
      milestones: milestonesDone(imp.projects),
      proTicks: tickCount(imp.pro, proProjects),
    },
    mine: { steps: stepsDone(local.steps), challenges: challengesDone(local.steps), drills: Object.keys(local.drills).length, code: codeCount(local.steps), playground: !!localPlayground },
    merge: {
      addSteps: Object.entries(imp.steps).filter(([id, p]) => p.done && !local.steps[id]?.done).length,
      addChallenges,
      drills: Object.entries(imp.drills).filter(([id, d]) => !local.drills[id] || d.last > local.drills[id].last).length,
      keepSteps: Object.entries(local.steps).filter(([id, p]) => p.done && !imp.steps[id]?.done).length,
      addMilestones,
      replaceMilestoneCode,
      replaceMilestoneCodeDone,
      keepMilestoneCode,
      replaceCode,
      replaceCodeDone,
      keepCode,
      addCode,
      proItems: proChanges(local.pro, imp.pro, proProjects),
      playground: !pgDiffers ? "none" : pg === "import" ? (localPlayground ? "replace" : "add") : "keep",
    },
  };
}

const n = (k: number, one: string, many = one + "s") => `${k} ${k === 1 ? one : many}`;

/** "a", "a and b", "a, b and c". */
const list = (parts: string[]) => (parts.length < 2 ? parts.join("") : `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`);

/** The summary as sentences: what the import has, what Merge would change, what Replace would do. */
export function summaryText(s: ImportSummary): { has: string; merge: string[]; replace: string } {
  // Only the counts that aren't zero.
  const parts = [
    s.has.steps ? n(s.has.steps, "finished step") : "",
    s.has.challenges ? n(s.has.challenges, "finished challenge") : "",
    s.has.milestones ? n(s.has.milestones, "finished project milestone") : "",
    s.has.drills ? n(s.has.drills, "practiced drill") : "",
    s.has.proTicks ? n(s.has.proTicks, "Pro Track checklist item") + " marked as done" : "",
  ].filter(Boolean);
  const codeParts = [
    s.has.code ? n(s.has.code, "challenge") : "",
    s.has.milestoneCode ? n(s.has.milestoneCode, "project milestone") : "",
    s.has.playground ? "a Playground program" : "",
  ].filter(Boolean);
  const code = !s.withCode ? ", without code" : codeParts.length ? `, with saved code in ${list(codeParts)}` : ", with no saved code";
  const has = `${parts.length ? `It has ${list(parts)}` : "It has no finished steps, challenges or practiced drills"}${code}.`;
  const m = s.merge;
  const merge: string[] = [];
  if (m.addSteps || m.addChallenges) merge.push(`adds ${n(m.addSteps, "finished step")} and ${n(m.addChallenges, "finished challenge")}`);
  if (m.addMilestones) merge.push(`adds ${n(m.addMilestones, "finished project milestone")}`);
  if (m.drills) merge.push(`adds or updates ${n(m.drills, "drill")}`);
  if (m.proItems) merge.push(`ticks or unticks ${n(m.proItems, "Pro Track checklist item")} as they were changed later there`);
  if (m.keepSteps) merge.push(`keeps your ${n(m.keepSteps, "finished step")} that the import doesn't have`);
  if (m.replaceCode) merge.push(`replaces your code in ${n(m.replaceCode, "challenge")} where the import's is newer`);
  if (m.replaceCodeDone) merge.push(`replaces your code in ${n(m.replaceCodeDone, "challenge")} you haven't finished with the import's finished code`);
  if (m.replaceMilestoneCode) merge.push(`replaces your code in ${n(m.replaceMilestoneCode, "project milestone")} where the import's is newer`);
  if (m.replaceMilestoneCodeDone) merge.push(`replaces your code in ${n(m.replaceMilestoneCodeDone, "project milestone")} you haven't finished with the import's finished code`);
  if (m.addCode) merge.push(`adds code in ${n(m.addCode, "challenge")} where you have none`);
  if (m.keepCode) merge.push(`keeps your code in ${n(m.keepCode, "challenge")} where the import's is different (yours was saved later, or there's no save time to compare)`);
  if (m.keepMilestoneCode) merge.push(`keeps your code in ${n(m.keepMilestoneCode, "project milestone")} where the import's is different (yours was saved later, or there's no save time to compare)`);
  if (m.playground === "replace") merge.push("replaces your Playground program with the import's newer one");
  if (m.playground === "add") merge.push("adds its Playground program");
  if (m.playground === "keep") merge.push("keeps your Playground program, not the import's different one (yours was saved later, or there's no save time to compare)");
  if (!merge.length) merge.push("changes nothing: you already have all of it");
  const replace = `Replace makes this browser's progress exactly the import's (${n(s.has.steps, "finished step")} instead of your ${s.mine.steps}${s.withCode ? "" : ", and no saved code"}), and takes its settings too, apart from your name.${s.has.playground ? (s.mine.playground ? " Its Playground program replaces yours." : "") : s.mine.playground ? " Your Playground program stays." : ""}`;
  return { has, merge, replace };
}
