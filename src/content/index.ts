// The course index (every page needs it) and each step's lesson, loaded when needed.
import { useEffect, useState } from "react";
import raw from "../generated/course.json";
import type { Challenge, CourseIndex, ModuleSummary, PlannedModule, Step, StepSummary } from "./types";

export const course = raw as unknown as CourseIndex;
export const modules = course.modules;
export const plan = course.plan;
export const moduleById = new Map(modules.map((m) => [m.id, m]));

// Addresses end with a slash, like the pre-rendered pages (/learn/printing/first-program/index.html).
export const modulePath = (m: { id: string }) => `/learn/${m.id}/`;
export const stepPath = (m: { id: string }, s: { slug: string }) => `/learn/${m.id}/${s.slug}/`;

/** A step's challenges: its own exercise first, then the others. */
export function challengesOf(step: Step): Challenge[] {
  return [step, ...step.more];
}

export const totalSteps = modules.reduce((a, m) => a + m.steps.length, 0);
export const totalChallenges = modules.reduce((a, m) => a + m.steps.reduce((b, s) => b + s.challenges, 0), 0);

// ---------------------------------------------------------------- steps
// Each step's lesson and challenges are a file of their own, fetched when the step is opened. The
// hash in its name changes with its content, so a saved copy is never out of date.
const loaded = new Map<string, Step>();
const loading = new Map<string, Promise<Step | null>>();
const stepSummary = (moduleId: string, slug: string) => moduleById.get(moduleId)?.steps.find((s) => s.slug === slug);

/** The address of a step's lesson file. */
export const lessonUrl = (moduleId: string, s: StepSummary) => `${import.meta.env.BASE_URL}lessons/${moduleId}/${s.slug}-${s.hash}.json`;

/** Thrown when a lesson file isn't on the site: the site was updated since this page was opened. */
export class LessonGone extends Error {}

/** Loads a step's lesson (cached). Resolves with null for an unknown step. */
export function loadStep(moduleId: string, slug: string): Promise<Step | null> {
  const summary = stepSummary(moduleId, slug);
  if (!summary) return Promise.resolve(null);
  const key = summary.id;
  const have = loaded.get(key);
  if (have) return Promise.resolve(have);
  let p = loading.get(key);
  if (!p) {
    p = fetch(lessonUrl(moduleId, summary))
      .then((res) => {
        if (res.status === 404) throw new LessonGone(res.url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Step>;
      })
      .then((step) => {
        loaded.set(key, step);
        return step;
      });
    // A failed load (offline, for example) is tried again next time.
    p.catch(() => loading.delete(key));
    loading.set(key, p);
  }
  return p;
}

/** Runs `fn` when the browser has nothing else to do; returns a function that cancels it. */
function whenIdle(fn: () => void): () => void {
  if ("requestIdleCallback" in window) {
    const id = requestIdleCallback(fn, { timeout: 5000 });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 1500);
  return () => clearTimeout(id);
}

/**
 * Fetches a module's steps in the background, when the browser has nothing else to do, so moving
 * to any of them is instant (the steps in `first` right away).
 */
export function prefetchModule(moduleId: string, first: string[] = []) {
  const m = moduleById.get(moduleId);
  if (!m) return () => {};
  for (const slug of first) loadStep(moduleId, slug).catch(() => {});
  return whenIdle(() => {
    for (const s of m.steps) loadStep(moduleId, s.slug).catch(() => {});
  });
}

/**
 * Fetches one step in the background, when the browser has nothing else to do (a "Continue" link's),
 * and `code`, the lesson page's own code, so the step shows at once when it's opened.
 */
export function prefetchStep(moduleId: string, slug: string, code?: () => Promise<unknown>) {
  return whenIdle(() => {
    loadStep(moduleId, slug).catch(() => {});
    code?.().catch(() => {});
  });
}

/**
 * A step's lesson: undefined while loading, null when there's no such step, "error" when loading
 * failed, "gone" when the site was updated since this page was opened. `waited` is true when the
 * lesson had to be fetched after the step was opened (a loading message was on screen).
 */
export function useStep(moduleId: string, slug: string): { step: Step | null | undefined | "error" | "gone"; waited: boolean } {
  const summary = stepSummary(moduleId, slug);
  const key = summary?.id ?? "";
  const now = () => (summary ? loaded.get(key) : null);
  type State = { key: string; step: Step | null | undefined | "error" | "gone"; waited: boolean };
  const [state, setState] = useState<State>(() => ({ key, step: now(), waited: false }));
  useEffect(() => {
    let live = true;
    const have = now();
    if (have !== undefined) setState((s) => (s.key === key && s.step === have ? s : { key, step: have, waited: false }));
    else {
      setState((s) => (s.key === key && s.step === undefined ? s : { key, step: undefined, waited: true }));
      loadStep(moduleId, slug).then(
        (step) => live && setState({ key, step, waited: true }),
        (e) => live && setState({ key, step: e instanceof LessonGone ? "gone" : "error", waited: true }),
      );
    }
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // Right after a move to another step, before the effect runs: that step, if it's loaded already.
  return state.key === key ? state : { step: now(), waited: false };
}

export const COURSE_NAMES: Record<PlannedModule["course"], string> = {
  I: "Java Programming I",
  II: "Java Programming II",
  extra: "Extra modules",
};

/** The plan grouped by course and then by MOOC part. */
export function planByCourse(): { course: PlannedModule["course"]; parts: { part: number | null; modules: PlannedModule[] }[] }[] {
  const out: ReturnType<typeof planByCourse> = [];
  for (const m of plan) {
    let c = out.find((x) => x.course === m.course);
    if (!c) out.push((c = { course: m.course, parts: [] }));
    let p = c.parts.find((x) => x.part === m.part);
    if (!p) c.parts.push((p = { part: m.part, modules: [] }));
    p.modules.push(m);
  }
  return out;
}

export type { ModuleSummary };
