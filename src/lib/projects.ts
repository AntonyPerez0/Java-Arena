// How a project's milestones open and what code each starts from. Plain data in and out, so the
// unit tests (scripts/projects.test.mjs) can run it without the site.
import { joinFiles, splitFiles } from "../grader/files.js";
import type { ProjectProgress } from "../state/store";

/** What these functions need of a milestone: its id, the code it starts from on the model solutions, and the files it adds. */
export type MilestoneShape = { id: string; seed: string; files?: Record<string, string> };

/** A program with files added (those it doesn't have yet), after its own files. */
export function withFiles(code: string, files: Record<string, string> | undefined): string {
  const have = splitFiles(code);
  const added = Object.entries(files ?? {})
    .filter(([path]) => !have.some((f) => f.path === path))
    .map(([path, text]) => ({ path, text }));
  return added.length ? joinFiles([...have, ...added]) : code;
}

/**
 * Whether milestone k can be opened: the first always; a later one once the one before it has
 * passed, or its solution was shown (as a lesson's solution can be); and one already passed.
 */
export function milestoneOpen(milestones: MilestoneShape[], p: ProjectProgress | undefined, k: number): boolean {
  if (k === 0) return true;
  const prev = p?.milestones[milestones[k - 1].id];
  return !!(prev?.done || prev?.sawSolution || p?.milestones[milestones[k].id]?.done);
}

/**
 * The code milestone k starts from, before the learner changes it: the project's seed for the
 * first; for a later one, the learner's code that passed the milestone before it ("passed"), or,
 * when it was opened by showing that milestone's solution without passing it, the learner's own
 * code of it ("own"), or otherwise (no code, or done with no passing code kept), the model
 * solution ("model"). The files the milestone adds come after the program's own.
 */
export function startCode(milestones: MilestoneShape[], p: ProjectProgress | undefined, k: number): { code: string; from: "seed" | "passed" | "own" | "model" } {
  const m = milestones[k];
  if (k === 0) return { code: m.seed, from: "seed" };
  const prev = p?.milestones[milestones[k - 1].id];
  if (prev?.passed != null) return { code: withFiles(prev.passed, m.files), from: "passed" };
  // Only for one not passed (opened by showing its solution). One that is done but has no passing
  // code (a "Progress only" transfer drops it) may hold an older draft here, so it starts from the model.
  if (!prev?.done && prev?.code != null) return { code: withFiles(prev.code, m.files), from: "own" };
  return { code: m.seed, from: "model" };
}

/** The milestone to show first: the first open one not passed yet, or the last one when all have passed. */
export function firstMilestone(milestones: MilestoneShape[], p: ProjectProgress | undefined): number {
  const k = milestones.findIndex((m, i) => milestoneOpen(milestones, p, i) && !p?.milestones[m.id]?.done);
  return k < 0 ? milestones.length - 1 : k;
}
