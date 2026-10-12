// The personal record (/record/): what this browser's progress says the learner finished, worked
// out from the saved state and the course index. Pure functions of their arguments (the course
// index is passed in), so the unit tests run without the built course.
import type { ModuleSummary, PlannedModule, ProjectSummary } from "../content/types";
import type { State } from "../state/store";

/** Shown on the record page and printed with it, word for word. */
export const RECORD_NOTICE =
  "This is a personal record made by Java Arena from the progress saved in this browser. It is not a certificate. It isn't issued or checked by the University of Helsinki or the MOOC, and nobody verifies it.";

/** The longest name the record keeps. */
export const NAME_MAX = 80;

/** A finished module: `doneAt` is when its last step was finished (null when a step has no time saved). */
export type FinishedModule = { id: string; number: number; title: string; doneAt: number | null };

/**
 * A part of the MOOC (or the extra modules, `part` null): its finished modules, how many modules it
 * has, and, when every one of them is finished, `complete` and when the last one was (`doneAt`).
 */
export type RecordPart = { course: PlannedModule["course"]; part: number | null; total: number; finished: FinishedModule[]; complete: boolean; doneAt: number | null };

export type FinishedProject = { id: string; title: string; doneAt: number | null };

export type Totals = {
  modules: number;
  modulesTotal: number;
  /** Parts of the MOOC (1 to 14) with every module finished; the extra modules aren't a part. */
  parts: number;
  partsTotal: number;
  steps: number;
  stepsTotal: number;
  challenges: number;
  challengesTotal: number;
  projects: number;
  projectsTotal: number;
};

export type Record = {
  /** The parts in course order, with the extra modules last. */
  parts: RecordPart[];
  projects: FinishedProject[];
  totals: Totals;
  /** The first and the last time anything listed was finished (null when nothing was). */
  first: number | null;
  last: number | null;
};

const latest = (times: (number | null | undefined)[]): number | null => {
  if (!times.length || times.some((t) => typeof t !== "number")) return null;
  return Math.max(...(times as number[]));
};

/** Whether every step of a module is done, and when the last one was finished. */
export function moduleFinished(s: State, m: Pick<ModuleSummary, "steps">): { done: boolean; doneAt: number | null } {
  const done = m.steps.length > 0 && m.steps.every((st) => s.steps[st.id]?.done);
  return { done, doneAt: done ? latest(m.steps.map((st) => s.steps[st.id]?.doneAt)) : null };
}

/** Works out the record from the progress and the course index. */
export function buildRecord(s: State, plan: PlannedModule[], modules: ModuleSummary[], projects: ProjectSummary[]): Record {
  const live = new Map(modules.map((m) => [m.id, m]));
  const parts: RecordPart[] = [];
  let steps = 0;
  let challenges = 0;
  for (const pm of plan) {
    let p = parts.find((x) => x.course === pm.course && x.part === pm.part);
    if (!p) parts.push((p = { course: pm.course, part: pm.part, total: 0, finished: [], complete: false, doneAt: null }));
    p.total++;
    const m = live.get(pm.id);
    if (!m) continue;
    for (const st of m.steps) {
      const sp = s.steps[st.id];
      if (sp?.done) steps++;
      for (let k = 0; k < st.challenges; k++) if (sp?.challenges[k]?.done) challenges++;
    }
    const f = moduleFinished(s, m);
    if (f.done) p.finished.push({ id: m.id, number: m.number, title: m.title, doneAt: f.doneAt });
  }
  for (const p of parts) {
    p.complete = p.finished.length === p.total;
    p.doneAt = p.complete ? latest(p.finished.map((m) => m.doneAt)) : null;
  }
  // The extra modules come after every part.
  parts.sort((a, b) => (a.part == null ? 1 : 0) - (b.part == null ? 1 : 0));
  const done: FinishedProject[] = projects.filter((p) => s.projects?.[p.id]?.done).map((p) => ({ id: p.id, title: p.title, doneAt: s.projects[p.id].doneAt ?? null }));
  const moocParts = parts.filter((p) => p.part != null);
  const times = [...parts.flatMap((p) => p.finished.map((m) => m.doneAt)), ...done.map((p) => p.doneAt)].filter((t): t is number => t != null);
  return {
    parts,
    projects: done,
    totals: {
      modules: parts.reduce((a, p) => a + p.finished.length, 0),
      modulesTotal: plan.length,
      parts: moocParts.filter((p) => p.complete).length,
      partsTotal: moocParts.length,
      steps,
      stepsTotal: modules.reduce((a, m) => a + m.steps.length, 0),
      challenges,
      challengesTotal: modules.reduce((a, m) => a + m.steps.reduce((b, st) => b + st.challenges, 0), 0),
      projects: done.length,
      projectsTotal: projects.length,
    },
    first: times.length ? Math.min(...times) : null,
    last: times.length ? Math.max(...times) : null,
  };
}

/** The part a module belongs to, when every module of it is finished (for the "part finished" links). */
export function finishedPart(s: State, plan: PlannedModule[], modules: ModuleSummary[], moduleId: string): number | null {
  const pm = plan.find((m) => m.id === moduleId);
  if (!pm || pm.part == null) return null;
  const live = new Map(modules.map((m) => [m.id, m]));
  const all = plan.filter((m) => m.course === pm.course && m.part === pm.part);
  return all.every((m) => {
    const lm = live.get(m.id);
    return !!lm && moduleFinished(s, lm).done;
  })
    ? pm.part
    : null;
}

/** A date as "12 Oct 2026" (the same in every browser, so a printed record reads the same everywhere). */
export function recordDate(ms: number): string {
  const d = new Date(ms);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/** A date as YYYY-MM-DD in local time, for <time dateTime>. */
export function isoDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The name as the record keeps it: one line, no leading or trailing spaces, at most NAME_MAX characters. */
export function cleanName(name: unknown): string {
  return typeof name === "string" ? name.replace(/\s+/g, " ").trim().slice(0, NAME_MAX) : "";
}
