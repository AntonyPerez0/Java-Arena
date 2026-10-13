// Progress and settings, kept in this browser's localStorage, with a React hook.
import { useSyncExternalStore } from "react";
import type { PlaygroundSave } from "../lib/transfer";
import { mergePro, setTick } from "../lib/pro.ts";

/** One challenge of a step. `attempts` and `sawSolution` are saved, so a reload doesn't reset them. */
export type ChallengeProgress = {
  done: boolean;
  code?: string;
  blanks?: string[];
  /** When `code` or `blanks` last changed (ms), so a transfer keeps the newer code. Saves before Batch 19 have none. */
  savedAt?: number;
  hintsUsed: number;
  attempts: number;
  sawSolution?: boolean;
};

/**
 * A lesson step: `challenges[k]` is challenge k + 1. `done` once every challenge has passed;
 * `clean` when that happened without hints or a look at a solution.
 */
export type StepProgress = {
  done: boolean;
  doneAt?: number;
  clean?: boolean;
  challenges: Record<number, ChallengeProgress>;
};

/**
 * A project's milestone: a challenge's progress, and `passed`, the learner's code when it last
 * passed, which the next milestone starts from.
 */
export type MilestoneProgress = ChallengeProgress & { passed?: string };

/**
 * A project (content/projects): `milestones` by milestone id. `done` once every milestone has
 * passed, first at `doneAt`.
 */
export type ProjectProgress = {
  done: boolean;
  doneAt?: number;
  milestones: Record<string, MilestoneProgress>;
};

/** A Pro Track checklist item: ticked or not, and when that last changed (ms), so the later change wins between tabs and devices. */
export type ProTick = { done: boolean; at: number };

/** A Pro Track project's checklist (src/lib/pro.ts): items by id. Only the learner's own ticks; nothing checks them. */
export type ProProgress = { items: Record<string, ProTick> };

export type Theme = "system" | "dark" | "light";

/** A drill's spaced-review state: Leitner box 1 to 5, and when it's due again. */
export type DrillStat = { box: number; right: number; wrong: number; last: number; due: number };

export type DmMode = "deathmatch" | "casual" | "warmup" | "interview";

export type RunRecord = { at: number; mode: DmMode; streak: number; reps: number; kills: number };

export type DmStats = {
  /** Best streak per mode (warm-up: most reviews cleared in one run). */
  best: Record<DmMode, number>;
  /** The latest runs, newest first (at most 50). */
  runs: RunRecord[];
  reps: number;
  kills: number;
  bossKills: number;
  /** Reps answered per local day (YYYY-MM-DD). */
  days: Record<string, number>;
};

export type State = {
  version: 1;
  steps: Record<string, StepProgress>;
  /** Projects, by project id. */
  projects: Record<string, ProjectProgress>;
  /** The Pro Track's checklists, by project id (from Batch 20 on). */
  pro: Record<string, ProProgress>;
  drills: Record<string, DrillStat>;
  dm: DmStats;
  /** Daily challenge: the local date and whether the first answer was right. */
  daily: Record<string, boolean>;
  /** Modules the placement quiz said the learner already knows. */
  placed: string[];
  /** When `placed` last changed, so the newer choice wins between tabs. */
  placedAt?: number;
  /** When "Delete all progress" was last used, so another open tab doesn't bring the old progress back. */
  resetAt?: number;
  /**
   * When progress from a transfer link or file was last merged in (importProgress), so another open
   * tab takes the imported progress as it is, instead of saving its own older code and drills back
   * over it. Never part of a transfer.
   */
  importAt?: number;
  settings: {
    theme: Theme;
    /** Text size multiplier: 1, 1.125, 1.25 or 1.4. */
    textScale: number;
    /** Download the Java engine without asking, even on mobile data or an unknown connection. */
    mobileData: boolean;
    /** Deathmatch: sound effects (off unless turned on). */
    sound: boolean;
    /** Deathmatch: every module's drills, without finishing its steps first. */
    unlockAll: boolean;
    /** Deathmatch: unlocked modules left out of the rotation (newly unlocked ones join by default). */
    topicsOff: string[];
    /** Deathmatch: a coding challenge ("boss rep") every 8th rep. */
    boss: boolean;
    /** Deathmatch: single-key shortcuts (Y and N, line numbers, A to D, R). */
    keys: boolean;
    /** The name the learner typed for the record page (/record/), as typed. Never sent anywhere. */
    name?: string;
  };
};

const KEY = "java-arena-v1";
/** The engine test page (/bench/) keeps the "download without asking" choice under this key too. */
const MOBILE_KEY = "java-arena-mobile-data";

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const freshDm = (): DmStats => ({ best: { deathmatch: 0, casual: 0, warmup: 0, interview: 0 }, runs: [], reps: 0, kills: 0, bossKills: 0, days: {} });

const fresh = (): State => ({
  version: 1,
  steps: {},
  projects: {},
  pro: {},
  drills: {},
  dm: freshDm(),
  daily: {},
  placed: [],
  settings: { theme: "system", textScale: 1, mobileData: read(MOBILE_KEY) === "1", sound: false, unlockAll: false, topicsOff: [], boss: true, keys: true },
});

/** Fill in anything an older save is missing. */
function normalize(s: Partial<State>): State {
  const f = fresh();
  const steps: Record<string, StepProgress> = {};
  for (const [id, p] of Object.entries(s.steps ?? {})) steps[id] = { done: !!p.done, doneAt: p.doneAt, clean: p.clean, challenges: p.challenges ?? {} };
  const projects: Record<string, ProjectProgress> = {};
  for (const [id, p] of Object.entries(s.projects ?? {})) projects[id] = { done: !!p?.done, doneAt: p?.doneAt, milestones: p?.milestones ?? {} };
  const pro: Record<string, ProProgress> = {};
  for (const [id, p] of Object.entries(s.pro ?? {})) {
    const items: Record<string, ProTick> = {};
    for (const [k, t] of Object.entries(p?.items ?? {})) if (t && typeof t.at === "number") items[k] = { done: !!t.done, at: t.at };
    pro[id] = { items };
  }
  const dm = { ...f.dm, ...s.dm, best: { ...f.dm.best, ...s.dm?.best } };
  return {
    ...f,
    ...s,
    version: 1,
    steps,
    projects,
    pro,
    drills: s.drills ?? {},
    dm,
    daily: s.daily ?? {},
    placed: Array.isArray(s.placed) ? s.placed : [],
    placedAt: typeof s.placedAt === "number" ? s.placedAt : undefined,
    resetAt: typeof s.resetAt === "number" ? s.resetAt : undefined,
    importAt: typeof s.importAt === "number" ? s.importAt : undefined,
    settings: { ...f.settings, ...s.settings, topicsOff: Array.isArray(s.settings?.topicsOff) ? s.settings.topicsOff : [] },
  };
}

function load(): State {
  const raw = read(KEY);
  if (!raw) return fresh();
  try {
    return normalize(JSON.parse(raw));
  } catch {
    return fresh();
  }
}

let state: State = load();
const listeners = new Set<() => void>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
const notify = () => listeners.forEach((l) => l());

function mergeChallenge<C extends MilestoneProgress>(a: C | undefined, b: C | undefined): C {
  if (!a || !b) return (a ?? b)!;
  return {
    ...b,
    done: a.done || b.done,
    // This tab's code wins: it's what the learner sees here.
    code: b.code ?? a.code,
    blanks: b.blanks ?? a.blanks,
    savedAt: b.code != null || b.blanks != null ? b.savedAt : a.savedAt,
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    attempts: Math.max(a.attempts, b.attempts),
    sawSolution: a.sawSolution || b.sawSolution || undefined,
    passed: b.passed ?? a.passed,
  };
}

function mergeProject(a: ProjectProgress | undefined, b: ProjectProgress | undefined): ProjectProgress {
  if (!a || !b) return (a ?? b)!;
  const milestones: Record<string, MilestoneProgress> = {};
  for (const k of new Set([...Object.keys(a.milestones), ...Object.keys(b.milestones)])) milestones[k] = mergeChallenge(a.milestones[k], b.milestones[k]);
  const times = [a.doneAt, b.doneAt].filter((t): t is number => t != null);
  return { done: a.done || b.done, doneAt: times.length ? Math.min(...times) : undefined, milestones };
}

function mergeStep(a: StepProgress | undefined, b: StepProgress | undefined): StepProgress {
  if (!a || !b) return (a ?? b)!;
  const challenges: Record<number, ChallengeProgress> = {};
  for (const k of new Set([...Object.keys(a.challenges), ...Object.keys(b.challenges)].map(Number))) challenges[k] = mergeChallenge(a.challenges[k], b.challenges[k]);
  const times = [a.doneAt, b.doneAt].filter((t): t is number => t != null);
  return { done: a.done || b.done, doneAt: times.length ? Math.min(...times) : undefined, clean: (a.done && a.clean) || (b.done && b.clean) || undefined, challenges };
}

/**
 * Practice from two tabs: for each drill the state with more answers wins, each total keeps the
 * higher of the two counts (so reps made in both tabs at once can count once), and a run saved by
 * both keeps the copy with more reps.
 */
function mergeDm(a: State, b: State): Pick<State, "drills" | "dm" | "daily"> {
  const drills: Record<string, DrillStat> = { ...a.drills };
  for (const [id, st] of Object.entries(b.drills)) {
    const o = drills[id];
    if (!o || st.right + st.wrong > o.right + o.wrong || (st.right + st.wrong === o.right + o.wrong && st.last > o.last)) drills[id] = st;
  }
  const best = { ...a.dm.best };
  for (const k of Object.keys(best) as DmMode[]) best[k] = Math.max(a.dm.best[k] ?? 0, b.dm.best[k] ?? 0);
  const days = { ...a.dm.days };
  for (const [d, n] of Object.entries(b.dm.days)) days[d] = Math.max(days[d] ?? 0, n);
  const byStart = new Map<number, RunRecord>();
  for (const r of [...a.dm.runs, ...b.dm.runs]) if ((byStart.get(r.at)?.reps ?? -1) < r.reps) byStart.set(r.at, r);
  const runs = [...byStart.values()].sort((x, y) => y.at - x.at).slice(0, 50);
  const dm = { best, runs, days, reps: Math.max(a.dm.reps, b.dm.reps), kills: Math.max(a.dm.kills, b.dm.kills), bossKills: Math.max(a.dm.bossKills, b.dm.bossKills) };
  // The first answer of the day is the one that counts.
  return { drills, dm, daily: { ...b.daily, ...a.daily } };
}

/**
 * Combines the saved progress (possibly written by another tab) with this tab's: a step or challenge
 * done in either stays done, and practice in either counts. After "Delete all progress" in one tab,
 * the newer reset wins, and after an import (a transfer link or file) the newer import wins, so the
 * other tab's older code and drills don't come back over it. Like a reset, that drops what the other
 * tab changed and hadn't saved yet. Settings come from `settingsFrom`, and placement skips from the
 * tab that changed them last.
 */
function merge(saved: State, local: State, settingsFrom: "saved" | "local"): State {
  const from = settingsFrom === "saved" ? saved : local;
  const savedReset = saved.resetAt ?? 0;
  const localReset = local.resetAt ?? 0;
  if (savedReset !== localReset) {
    const newer = savedReset > localReset ? saved : local;
    return { ...newer, settings: from.settings };
  }
  const savedImport = saved.importAt ?? 0;
  const localImport = local.importAt ?? 0;
  if (savedImport !== localImport) {
    const newer = savedImport > localImport ? saved : local;
    return { ...newer, settings: from.settings };
  }
  const steps: Record<string, StepProgress> = {};
  for (const id of new Set([...Object.keys(saved.steps), ...Object.keys(local.steps)])) steps[id] = mergeStep(saved.steps[id], local.steps[id]);
  const projects: Record<string, ProjectProgress> = {};
  for (const id of new Set([...Object.keys(saved.projects), ...Object.keys(local.projects)])) projects[id] = mergeProject(saved.projects[id], local.projects[id]);
  const placedFrom = (saved.placedAt ?? 0) === (local.placedAt ?? 0) ? from : (saved.placedAt ?? 0) > (local.placedAt ?? 0) ? saved : local;
  return { ...local, steps, projects, pro: mergePro(saved.pro, local.pro), ...mergeDm(saved, local), placed: placedFrom.placed, placedAt: placedFrom.placedAt, settings: from.settings };
}

function write() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    // Another tab may have saved since this one loaded: keep its progress too.
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const merged = merge(normalize(JSON.parse(raw)), state, "local");
      if (JSON.stringify(merged) !== JSON.stringify(state)) {
        state = merged;
        notify();
      }
    }
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage full or blocked: progress lasts for this visit only */
  }
}

// Another tab saved: take in its progress and settings.
if (typeof window !== "undefined")
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY || !e.newValue) return;
    try {
      state = merge(normalize(JSON.parse(e.newValue)), state, "saved");
      notify();
    } catch {
      /* ignore a damaged save */
    }
  });

/** Saves shortly after a change (typing in the editor changes the state often). */
function save() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(write, 150);
}
// Leaving or reloading the page saves right away, so the last change isn't lost.
if (typeof window !== "undefined") window.addEventListener("pagehide", () => saveTimer && write());

export function getState() {
  return state;
}

export function update(fn: (s: State) => State) {
  state = fn(state);
  save();
  notify();
}

export function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useStore<T>(sel: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => sel(state), () => sel(state));
}

const emptyChallenge = (): ChallengeProgress => ({ done: false, hintsUsed: 0, attempts: 0 });

const stepOf = (s: State, id: string): StepProgress => s.steps[id] ?? { done: false, challenges: {} };

export function patchStep(id: string, patch: Partial<Omit<StepProgress, "challenges">>) {
  update((s) => ({ ...s, steps: { ...s.steps, [id]: { ...stepOf(s, id), ...patch } } }));
}

export function patchChallenge(id: string, k: number, patch: Partial<ChallengeProgress>) {
  update((s) => {
    const step = stepOf(s, id);
    // Saved code gets the time it changed, which a transfer compares.
    const saved = patch.code !== undefined || patch.blanks !== undefined ? { savedAt: Date.now() } : {};
    const challenges = { ...step.challenges, [k]: { ...emptyChallenge(), ...step.challenges[k], ...patch, ...saved } };
    return { ...s, steps: { ...s.steps, [id]: { ...step, challenges } } };
  });
}

const projectOf = (s: State, id: string): ProjectProgress => s.projects[id] ?? { done: false, milestones: {} };

export function patchProject(id: string, patch: Partial<Omit<ProjectProgress, "milestones">>) {
  update((s) => ({ ...s, projects: { ...s.projects, [id]: { ...projectOf(s, id), ...patch } } }));
}

/** Changes a milestone's progress; saved code gets the time it changed, as a challenge's does. */
export function patchMilestone(id: string, milestone: string, patch: Partial<MilestoneProgress>) {
  update((s) => {
    const p = projectOf(s, id);
    const saved = patch.code !== undefined ? { savedAt: Date.now() } : {};
    const milestones = { ...p.milestones, [milestone]: { ...emptyChallenge(), ...p.milestones[milestone], ...patch, ...saved } };
    return { ...s, projects: { ...s.projects, [id]: { ...p, milestones } } };
  });
}

/** Ticks or unticks a Pro Track checklist item (src/lib/pro.ts). */
export function setProTick(id: string, item: string, done: boolean) {
  update((s) => ({ ...s, pro: { ...s.pro, [id]: setTick(s.pro[id], item, done, Date.now()) } }));
}

export function patchSettings(patch: Partial<State["settings"]>) {
  update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  if (patch.mobileData != null) {
    try {
      localStorage.setItem(MOBILE_KEY, patch.mobileData ? "1" : "0");
    } catch {
      /* ignore */
    }
  }
}

/** Where the Playground keeps its program (separate from progress, but deleted with it). */
export const PLAYGROUND_KEY = "java-arena-playground";

/** The Playground's saved program, or null when there's none (or it's damaged). */
export function readPlayground(): PlaygroundSave | null {
  try {
    const p = JSON.parse(read(PLAYGROUND_KEY) ?? "null");
    return p && typeof p.code === "string" ? p : null;
  } catch {
    return null;
  }
}

/**
 * Takes in progress from a transfer link or file (already merged or replacing, src/lib/transfer.ts)
 * and saves it at once. It's written as it is, not merged again with the saved copy as a normal save
 * is: the saved copy is this tab's progress, which the import was just combined with by the
 * transfer's own rules. The Playground program is saved too (null: none). It's stamped with
 * `importAt`, so this browser's other open tabs take it as it is (see merge). A Replace also carries
 * a new `resetAt`, which wins the same way.
 */
export function importProgress(next: State, playground: PlaygroundSave | null) {
  if (saveTimer) write();
  const importAt = Math.max(Date.now(), (state.importAt ?? 0) + 1);
  state = { ...normalize(next), importAt };
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    localStorage.setItem(MOBILE_KEY, state.settings.mobileData ? "1" : "0");
    if (playground) localStorage.setItem(PLAYGROUND_KEY, JSON.stringify(playground));
    else localStorage.removeItem(PLAYGROUND_KEY);
  } catch {
    /* storage full or blocked: the progress lasts for this visit only */
  }
  notify();
}

/** The learner's local date as YYYY-MM-DD (the daily challenge changes at local midnight). */
export function localDay(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function resetProgress() {
  update((s) => ({ ...fresh(), resetAt: Date.now(), settings: s.settings }));
  write();
  try {
    localStorage.removeItem(PLAYGROUND_KEY);
  } catch {
    /* ignore */
  }
}
