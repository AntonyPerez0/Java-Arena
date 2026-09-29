// Progress figures worked out from the saved state and the course index.
import { modules } from "../content";
import type { ModuleSummary, StepSummary } from "../content/types";
import type { State, StepProgress } from "./store";

export function challengeDone(p: StepProgress | undefined, k: number): boolean {
  return !!p?.challenges[k]?.done;
}

export function moduleProgress(s: State, m: ModuleSummary) {
  const done = m.steps.filter((st) => s.steps[st.id]?.done).length;
  return { done, total: m.steps.length };
}

/**
 * The first step (in course order) that isn't done, for "Continue" links. Modules the placement quiz
 * said the learner knows are passed over, unless every other step is done.
 */
export function nextStep(s: State): { module: ModuleSummary; step: StepSummary } | null {
  for (const skip of [true, false])
    for (const m of modules) {
      if (skip && s.placed.includes(m.id)) continue;
      for (const step of m.steps) if (!s.steps[step.id]?.done) return { module: m, step };
    }
  return null;
}

export function stepsDone(s: State) {
  return modules.reduce((a, m) => a + m.steps.filter((st) => s.steps[st.id]?.done).length, 0);
}

export function challengesDone(s: State) {
  return modules.reduce((a, m) => a + m.steps.reduce((b, st) => b + [...Array(st.challenges).keys()].filter((k) => challengeDone(s.steps[st.id], k)).length, 0), 0);
}
