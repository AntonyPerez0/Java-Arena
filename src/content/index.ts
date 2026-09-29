// The course index (every page needs it) and each module's full lessons, loaded when needed.
import { useEffect, useState } from "react";
import raw from "../generated/course.json";
import type { Challenge, CourseIndex, Module, ModuleSummary, PlannedModule, Step } from "./types";

export const course = raw as unknown as CourseIndex;
export const modules = course.modules;
export const plan = course.plan;
export const moduleById = new Map(modules.map((m) => [m.id, m]));

export const modulePath = (m: { id: string }) => `/learn/${m.id}`;
export const stepPath = (m: { id: string }, s: { slug: string }) => `/learn/${m.id}/${s.slug}`;

/** A step's challenges: its own exercise first, then the others. */
export function challengesOf(step: Step): Challenge[] {
  return [step, ...step.more];
}

export const totalSteps = modules.reduce((a, m) => a + m.steps.length, 0);
export const totalChallenges = modules.reduce((a, m) => a + m.steps.reduce((b, s) => b + s.challenges, 0), 0);

// ---------------------------------------------------------------- full modules
const files = import.meta.glob<Module>("../generated/modules/*.json", { import: "default" });
const loaded = new Map<string, Module>();
const loading = new Map<string, Promise<Module | null>>();

/** Loads a module's lessons (cached). Resolves with null for an unknown module. */
export function loadModule(id: string): Promise<Module | null> {
  const have = loaded.get(id);
  if (have) return Promise.resolve(have);
  let p = loading.get(id);
  if (!p) {
    const load = files[`../generated/modules/${id}.json`];
    p = load
      ? load().then((m) => {
          loaded.set(id, m);
          return m;
        })
      : Promise.resolve(null);
    // A failed load (offline, for example) is tried again next time.
    p.catch(() => loading.delete(id));
    loading.set(id, p);
  }
  return p;
}

/** A module's lessons: undefined while loading, null when there's no such module, "error" when loading failed. */
export function useModule(id: string): Module | null | undefined | "error" {
  const [state, setState] = useState<Module | null | undefined | "error">(() => loaded.get(id) ?? (moduleById.has(id) ? undefined : null));
  useEffect(() => {
    let live = true;
    if (loaded.has(id)) setState(loaded.get(id));
    else if (!moduleById.has(id)) setState(null);
    else {
      setState(undefined);
      loadModule(id).then(
        (m) => live && setState(m),
        () => live && setState("error"),
      );
    }
    return () => {
      live = false;
    };
  }, [id]);
  return state;
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
