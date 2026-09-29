// Deathmatch: which drills are open, picking the next rep, grading instant answers, spaced review
// (Leitner boxes), runs, ranks and streaks. Adapted from C/C++ Arena's Deathmatch.
import { moduleById, modules } from "../content";
import type { Drill } from "../content/types";
import { localDay, update, type DmMode, type DrillStat, type RunRecord, type State } from "../state/store";

/** A coding challenge ("boss rep") comes every BOSS_EVERY reps. */
export const BOSS_EVERY = 8;
/** The topic of the interview prep drills (not a lesson module). */
export const INTERVIEW = "interview";
/** Ranked Deathmatch needs this many quick drills in the rotation, so a streak can't be a few answers learned by heart. */
export const MIN_RANKED = 10;

const DAY = 86_400_000;
/** Days until a drill in box 1 to 5 is due again. */
const INTERVAL = [0, 0.5, 1, 3, 7, 16];

export function topicTitle(topic: string): string {
  if (topic === INTERVIEW) return "Interview prep";
  return moduleById.get(topic)?.title ?? topic;
}

export const lives = (mode: DmMode) => (mode === "deathmatch" ? 1 : 3);

export const isDue = (st: DrillStat | undefined, now = Date.now()) => !!st && st.due <= now;

/**
 * A drill is open once the step that teaches it is done, its module was skipped by the placement
 * quiz, or it has been practised in Deathmatch before (so review never loses a drill). Interview
 * drills are always open.
 */
export function drillUnlocked(s: State, d: Drill): boolean {
  if (!d.after || s.settings.unlockAll) return true;
  return !!s.steps[d.after]?.done || s.placed.includes(d.topic) || !!s.drills[d.id];
}

/** The lesson modules with at least one open drill, in course order. */
export function unlockedTopics(drills: Drill[], s: State): string[] {
  const open = new Set(drills.filter((d) => d.topic !== INTERVIEW && drillUnlocked(s, d)).map((d) => d.topic));
  return modules.filter((m) => open.has(m.id)).map((m) => m.id);
}

/** Output answers compare with every run of spaces and line breaks as one space. */
export const looseOutput = (s: string) => s.replace(/\s+/g, " ").trim();

/** Checks an instant answer (every type but boss). */
export function checkAnswer(d: Drill, answer: string): boolean {
  switch (d.type) {
    case "predict":
      return looseOutput(answer) === looseOutput(d.answer);
    case "fill": {
      // Spaces only matter between two words or numbers: "(a+b)" is "( a + b )", but "elseif" isn't "else if".
      // (No regex lookbehind: Safari before 16.4 can't parse it.)
      const squash = (x: string) => x.trim().split(/\s+/).reduce((a, w) => (/\w$/.test(a) && /^\w/.test(w) ? a + " " + w : a + w), "");
      return (d.accept ?? [d.answer]).some((a) => squash(a) === squash(answer));
    }
    case "bug":
    case "compiles":
    case "choice":
      return answer.trim().toLowerCase() === d.answer;
    default:
      return false;
  }
}

/**
 * The next rep: drills in low boxes (the ones missed) come up more often, recent ones are avoided,
 * and every BOSS_EVERY-th rep is a coding challenge when those are on. Warm-up only takes due drills.
 */
export function pickNext(pool: Drill[], s: State, recent: string[], repNo: number, mode: DmMode, random = Math.random): Drill | null {
  const now = Date.now();
  const bosses = pool.filter((d) => d.type === "boss");
  const quick = pool.filter((d) => d.type !== "boss");
  const wantBoss = s.settings.boss && mode !== "warmup" && bosses.length > 0 && repNo % BOSS_EVERY === BOSS_EVERY - 1;
  let candidates = wantBoss ? bosses : quick.length ? quick : bosses;
  if (mode === "warmup") {
    const due = pool.filter((d) => isDue(s.drills[d.id], now) && !recent.includes(d.id));
    return due.length ? due[Math.floor(random() * due.length)] : null;
  }
  const avoid = new Set(recent.slice(-Math.min(12, Math.floor(candidates.length / 2))));
  const fresh = candidates.filter((d) => !avoid.has(d.id));
  if (fresh.length) candidates = fresh;
  const weights = candidates.map((d) => {
    const st = s.drills[d.id];
    if (!st) return 4;
    return 6 - st.box + (st.due <= now ? 2 : 0);
  });
  let r = random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1] ?? null;
}

/** Saves one answer: the drill moves up a box when right (two on a first-time right answer), back to 1 when wrong. */
export function recordRep(d: Drill, correct: boolean) {
  update((s) => {
    const prev = s.drills[d.id] ?? { box: 1, right: 0, wrong: 0, last: 0, due: 0 };
    const box = correct ? Math.min(5, prev.box + (prev.right + prev.wrong === 0 ? 2 : 1)) : 1;
    const now = Date.now();
    const st: DrillStat = { box, right: prev.right + (correct ? 1 : 0), wrong: prev.wrong + (correct ? 0 : 1), last: now, due: now + INTERVAL[box] * DAY };
    const day = localDay();
    return {
      ...s,
      drills: { ...s.drills, [d.id]: st },
      dm: {
        ...s.dm,
        reps: s.dm.reps + 1,
        kills: s.dm.kills + (correct ? 1 : 0),
        bossKills: s.dm.bossKills + (correct && d.type === "boss" ? 1 : 0),
        days: { ...s.dm.days, [day]: (s.dm.days[day] ?? 0) + 1 },
      },
    };
  });
}

/**
 * Saves a run as it goes: called after every answer with the run so far (its start time is its id),
 * so a run left by closing the tab or following a link is kept too. `streak` is the run's best.
 */
export function recordRun(run: RunRecord) {
  if (run.reps === 0) return;
  update((s) => ({
    ...s,
    dm: {
      ...s.dm,
      best: { ...s.dm.best, [run.mode]: Math.max(s.dm.best[run.mode], run.mode === "warmup" ? run.kills : run.streak) },
      runs: [run, ...s.dm.runs.filter((r) => r.at !== run.at)].slice(0, 50),
    },
  }));
}

export const TYPE_LABEL: Record<Drill["type"], string> = {
  predict: "Predict the output",
  fill: "Fill the blank",
  bug: "Spot the bug",
  compiles: "Will it compile?",
  choice: "Pick one",
  boss: "Boss rep",
};

export const MODE_NAME: Record<DmMode, string> = { deathmatch: "Deathmatch", casual: "Casual", warmup: "Warm-up", interview: "Interview prep" };

export function callout(streak: number): string | null {
  const map: Record<number, string> = { 3: "TRIPLE", 5: "ACE", 10: "ON FIRE", 15: "DOMINATING", 20: "RAMPAGE", 25: "UNSTOPPABLE", 35: "GODLIKE", 50: "LEGENDARY", 75: "BEYOND LEGENDARY", 100: "GLOBAL ELITE" };
  return map[streak] ?? (streak > 100 && streak % 25 === 0 ? `${streak} STREAK` : null);
}

export const RANKS = [
  { name: "Silver I", at: 0 },
  { name: "Silver II", at: 3 },
  { name: "Silver III", at: 5 },
  { name: "Silver IV", at: 7 },
  { name: "Silver Elite", at: 10 },
  { name: "Silver Elite Master", at: 13 },
  { name: "Gold Nova I", at: 16 },
  { name: "Gold Nova II", at: 20 },
  { name: "Gold Nova III", at: 24 },
  { name: "Gold Nova Master", at: 28 },
  { name: "Master Guardian I", at: 33 },
  { name: "Master Guardian II", at: 38 },
  { name: "Master Guardian Elite", at: 44 },
  { name: "Distinguished Master Guardian", at: 50 },
  { name: "Legendary Eagle", at: 60 },
  { name: "Legendary Eagle Master", at: 75 },
  { name: "Supreme Master First Class", at: 90 },
  { name: "The Global Elite", at: 110 },
];

/** The rank a best Deathmatch streak earns, and the next one. */
export function rankFor(best: number) {
  let i = 0;
  while (i + 1 < RANKS.length && best >= RANKS[i + 1].at) i++;
  return { index: i, rank: RANKS[i], next: RANKS[i + 1] ?? null };
}

/** Days in a row with at least 20 reps, ending today (or yesterday, if today isn't there yet). */
export function practiceStreak(days: Record<string, number>) {
  const d = new Date();
  if ((days[localDay(d)] ?? 0) < 20) d.setDate(d.getDate() - 1);
  let n = 0;
  while ((days[localDay(d)] ?? 0) >= 20) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

/** Days in a row with the daily challenge answered, ending today (or yesterday, if today isn't done yet). */
export function dailyStreak(daily: Record<string, boolean>) {
  const d = new Date();
  if (!(localDay(d) in daily)) d.setDate(d.getDate() - 1);
  let n = 0;
  while (localDay(d) in daily) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

// ---------------------------------------------------------------- sound (off unless turned on)
let audio: AudioContext | null = null;
export function blip(kind: "hit" | "miss" | "boss" | "streak") {
  try {
    audio ??= new AudioContext();
    const o = audio.createOscillator();
    const g = audio.createGain();
    const t = audio.currentTime;
    const cfg = {
      hit: { f: 880, f2: 1320, d: 0.09, type: "square" as OscillatorType, v: 0.05 },
      boss: { f: 520, f2: 1560, d: 0.25, type: "sawtooth" as OscillatorType, v: 0.05 },
      streak: { f: 660, f2: 1760, d: 0.3, type: "triangle" as OscillatorType, v: 0.08 },
      miss: { f: 180, f2: 90, d: 0.35, type: "sawtooth" as OscillatorType, v: 0.07 },
    }[kind];
    o.type = cfg.type;
    o.frequency.setValueAtTime(cfg.f, t);
    o.frequency.exponentialRampToValueAtTime(cfg.f2, t + cfg.d);
    g.gain.setValueAtTime(cfg.v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.d);
    o.connect(g).connect(audio.destination);
    o.start(t);
    o.stop(t + cfg.d + 0.02);
  } catch {
    /* no audio */
  }
}
