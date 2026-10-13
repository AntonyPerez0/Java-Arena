// The Pro Track (/pro/): projects for the learner's own computer. The site can't see them or their
// tests, so the only progress it keeps is the learner's own checklist: each item ticked or unticked,
// with when. Plain data in and out, so the unit tests (scripts/transfer.test.mjs,
// scripts/record.test.mjs) run it without the site.
import type { ProProgress, ProTick } from "../state/store";

/** A project as the main bundle has it (virtual:pro-track, made by scripts/pro-track/vite-plugin.mjs). */
export type ProProject = {
  id: string;
  title: string;
  /** The paragraph under the README's title, as plain text. */
  summary: string;
  /** About how long it takes, as "2 to 4" (hours). */
  hours: string;
  checklist: { id: string; text: string }[];
};

/** The README sections a project page shows (HTML made by the build from the project's README.md). */
export type ProSections = { build: string; need: string; steps: string; tests: string; run: string; github: string };

/** What a project's page shows besides its ProProject (virtual:pro-track-pages, loaded with the page). */
export type ProPageData = {
  summaryHtml: string;
  /** What it practices, with the module (an id of the course plan) that teaches it. */
  practices: { module: string; what: string }[];
  checklist: { id: string; text: string; html: string }[];
  sections: ProSections;
  /** The zip in the built site (relative to the site's base) and its size. */
  zip: { file: string; bytes: number };
  /** The project's folder on GitHub. */
  folder: string;
};

/** The Pro Track's address. */
export const PRO_PATH = "/pro/";
export const proPath = (p: { id: string }) => `/pro/${p.id}/`;

/** How many of a project's checklist items the learner ticked (items no longer on the list don't count). */
export function ticked(p: ProProgress | undefined, checklist: { id: string }[]): number {
  return checklist.filter((c) => p?.items[c.id]?.done).length;
}

/** The checklist with one item ticked or unticked at `now`. */
export function setTick(p: ProProgress | undefined, item: string, done: boolean, now: number): ProProgress {
  // A later change always has a later time, even when the clock went back. Times are whole
  // seconds, so a transfer link (which carries seconds) brings them back exactly.
  const at = Math.ceil(Math.max(now, (p?.items[item]?.at ?? 0) + 1) / 1000) * 1000;
  return { items: { ...p?.items, [item]: { done, at } } };
}

/** Two copies of an item: the one changed later; at the same time, the ticked one (so merging twice changes nothing). */
function mergeTick(a: ProTick | undefined, b: ProTick | undefined): ProTick {
  if (!a || !b) return (a ?? b)!;
  if (a.at !== b.at) return a.at > b.at ? a : b;
  return a.done ? a : b;
}

/** Two copies of a project's checklist (two tabs, or a transfer): each item from the copy that changed it later. */
export function mergeProProgress(a: ProProgress | undefined, b: ProProgress | undefined): ProProgress {
  const items: Record<string, ProTick> = {};
  for (const k of [...new Set([...Object.keys(a?.items ?? {}), ...Object.keys(b?.items ?? {})])].sort()) items[k] = mergeTick(a?.items[k], b?.items[k]);
  return { items };
}

/** Every project's checklist from two copies (see mergeProProgress). */
export function mergePro(a: Record<string, ProProgress> | undefined, b: Record<string, ProProgress> | undefined): Record<string, ProProgress> {
  const out: Record<string, ProProgress> = {};
  for (const id of [...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])].sort()) out[id] = mergeProProgress(a?.[id], b?.[id]);
  return out;
}

/** The projects and their checklists, as far as counting ticks goes. */
export type ProChecklists = { id: string; checklist: { id: string }[] }[];

/** How many checklist items are ticked, over every project (for the transfer summary); as on the pages, items and projects no longer on the list don't count. */
export const tickCount = (pro: Record<string, ProProgress> | undefined, projects: ProChecklists) => projects.reduce((n, p) => n + ticked(pro?.[p.id], p.checklist), 0);

/** A project on the record page: how many of its items the learner marked as done. */
export type ProRecord = { id: string; title: string; ticked: number; total: number };

/** The projects with at least one item marked as done, in the Pro Track's order. */
export function proRecord(pro: Record<string, ProProgress> | undefined, projects: ProProject[]): ProRecord[] {
  return projects.map((p) => ({ id: p.id, title: p.title, ticked: ticked(pro?.[p.id], p.checklist), total: p.checklist.length })).filter((r) => r.ticked > 0);
}
