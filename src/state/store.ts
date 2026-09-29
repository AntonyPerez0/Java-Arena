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

export type State = {
  version: 1;
  steps: Record<string, StepProgress>;
  /** When "Delete all progress" was last used, so another open tab doesn't bring the old progress back. */
  resetAt?: number;
  settings: {
    theme: Theme;
    /** Text size multiplier: 1, 1.125, 1.25 or 1.4. */
    textScale: number;
    /** Download the Java engine without asking, even on mobile data or an unknown connection. */
    mobileData: boolean;
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

const fresh = (): State => ({
  version: 1,
  steps: {},
  settings: { theme: "system", textScale: 1, mobileData: read(MOBILE_KEY) === "1" },
});

/** Fill in anything an older save is missing. */
function normalize(s: Partial<State>): State {
  const f = fresh();
  const steps: Record<string, StepProgress> = {};
  for (const [id, p] of Object.entries(s.steps ?? {})) steps[id] = { done: !!p.done, doneAt: p.doneAt, clean: p.clean, challenges: p.challenges ?? {} };
  return { ...f, ...s, version: 1, steps, resetAt: typeof s.resetAt === "number" ? s.resetAt : undefined, settings: { ...f.settings, ...s.settings } };
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

/**
 * Combines the saved progress (possibly written by another tab) with this tab's: a step or challenge
 * done in either stays done. After "Delete all progress" in one tab, the newer reset wins. Settings
 * come from `settingsFrom`.
 */
function merge(saved: State, local: State, settingsFrom: "saved" | "local"): State {
  const settings = settingsFrom === "saved" ? saved.settings : local.settings;
  const savedReset = saved.resetAt ?? 0;
  const localReset = local.resetAt ?? 0;
  if (savedReset !== localReset) {
    const newer = savedReset > localReset ? saved : local;
    return { ...newer, settings };
  }
  const steps: Record<string, StepProgress> = {};
  for (const id of new Set([...Object.keys(saved.steps), ...Object.keys(local.steps)])) steps[id] = mergeStep(saved.steps[id], local.steps[id]);
  return { ...local, steps, settings };
}

function write() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = null;
  try {
    // Another tab may have saved since this one loaded: keep its progress too.
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const merged = merge(normalize(JSON.parse(raw)), state, "local");
      if (JSON.stringify(merged.steps) !== JSON.stringify(state.steps)) {
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

export function resetProgress() {
  update((s) => ({ ...fresh(), resetAt: Date.now(), settings: s.settings }));
  write();
  try {
    localStorage.removeItem(PLAYGROUND_KEY);
  } catch {
    /* ignore */
  }
}
