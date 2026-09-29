// Progress and settings, kept in this browser's localStorage, with a React hook.
import { useSyncExternalStore } from "react";

/** One challenge of a step. `attempts` and `sawSolution` are saved, so a reload doesn't reset them. */
export type ChallengeProgress = {
  done: boolean;
  code?: string;
  blanks?: string[];
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
  drills: Record<string, DrillStat>;
  dm: DmStats;
  /** Daily challenge: the local date and whether the first answer was right. */
  daily: Record<string, boolean>;
  /** Modules the placement quiz said the learner already knows. */
  placed: string[];
  /** When "Delete all progress" was last used, so another open tab doesn't bring the old progress back. */
  resetAt?: number;
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
    /** Deathmatch: the chosen modules, or null for all unlocked ones. */
    topics: string[] | null;
    /** Deathmatch: a coding challenge ("boss rep") every 8th rep. */
    boss: boolean;
    /** Deathmatch: single-key shortcuts (Y and N, line numbers, A to D, R). */
    keys: boolean;
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
  drills: {},
  dm: freshDm(),
  daily: {},
  placed: [],
  settings: { theme: "system", textScale: 1, mobileData: read(MOBILE_KEY) === "1", sound: false, unlockAll: false, topics: null, boss: true, keys: true },
});

/** Fill in anything an older save is missing. */
function normalize(s: Partial<State>): State {
  const f = fresh();
  const steps: Record<string, StepProgress> = {};
  for (const [id, p] of Object.entries(s.steps ?? {})) steps[id] = { done: !!p.done, doneAt: p.doneAt, clean: p.clean, challenges: p.challenges ?? {} };
  const dm = { ...f.dm, ...s.dm, best: { ...f.dm.best, ...s.dm?.best } };
  return {
    ...f,
    ...s,
    version: 1,
    steps,
    drills: s.drills ?? {},
    dm,
    daily: s.daily ?? {},
    placed: Array.isArray(s.placed) ? s.placed : [],
    resetAt: typeof s.resetAt === "number" ? s.resetAt : undefined,
    settings: { ...f.settings, ...s.settings },
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

function mergeChallenge(a: ChallengeProgress | undefined, b: ChallengeProgress | undefined): ChallengeProgress {
  if (!a || !b) return (a ?? b)!;
  return {
    done: a.done || b.done,
    // This tab's code wins: it's what the learner sees here.
    code: b.code ?? a.code,
    blanks: b.blanks ?? a.blanks,
    hintsUsed: Math.max(a.hintsUsed, b.hintsUsed),
    attempts: Math.max(a.attempts, b.attempts),
    sawSolution: a.sawSolution || b.sawSolution || undefined,
  };
}

function mergeStep(a: StepProgress | undefined, b: StepProgress | undefined): StepProgress {
  if (!a || !b) return (a ?? b)!;
  const challenges: Record<number, ChallengeProgress> = {};
  for (const k of new Set([...Object.keys(a.challenges), ...Object.keys(b.challenges)].map(Number))) challenges[k] = mergeChallenge(a.challenges[k], b.challenges[k]);
  const times = [a.doneAt, b.doneAt].filter((t): t is number => t != null);
  return { done: a.done || b.done, doneAt: times.length ? Math.min(...times) : undefined, clean: (a.done && a.clean) || (b.done && b.clean) || undefined, challenges };
}

/** Practice in both tabs counts: the drill state with more answers wins, and totals keep the higher count. */
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
  const seen = new Set<number>();
  const runs = [...a.dm.runs, ...b.dm.runs].sort((x, y) => y.at - x.at).filter((r) => !seen.has(r.at) && seen.add(r.at)).slice(0, 50);
  const dm = { best, runs, days, reps: Math.max(a.dm.reps, b.dm.reps), kills: Math.max(a.dm.kills, b.dm.kills), bossKills: Math.max(a.dm.bossKills, b.dm.bossKills) };
  // The first answer of the day is the one that counts.
  return { drills, dm, daily: { ...b.daily, ...a.daily } };
}

/**
 * Combines the saved progress (possibly written by another tab) with this tab's: a step or challenge
 * done in either stays done, and practice in either counts. After "Delete all progress" in one tab,
 * the newer reset wins. Settings and placement skips come from `settingsFrom`.
 */
function merge(saved: State, local: State, settingsFrom: "saved" | "local"): State {
  const from = settingsFrom === "saved" ? saved : local;
  const savedReset = saved.resetAt ?? 0;
  const localReset = local.resetAt ?? 0;
  if (savedReset !== localReset) {
    const newer = savedReset > localReset ? saved : local;
    return { ...newer, settings: from.settings };
  }
  const steps: Record<string, StepProgress> = {};
  for (const id of new Set([...Object.keys(saved.steps), ...Object.keys(local.steps)])) steps[id] = mergeStep(saved.steps[id], local.steps[id]);
  return { ...local, steps, ...mergeDm(saved, local), placed: from.placed, settings: from.settings };
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
    const challenges = { ...step.challenges, [k]: { ...emptyChallenge(), ...step.challenges[k], ...patch } };
    return { ...s, steps: { ...s.steps, [id]: { ...step, challenges } } };
  });
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
