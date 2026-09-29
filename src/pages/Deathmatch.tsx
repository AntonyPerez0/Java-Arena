// Deathmatch: endless practice reps from the drills of the steps you've finished. Four modes:
// Deathmatch (one life), Casual (three lives), Warm-up (spaced review of due drills) and
// Interview prep. Adapted from C/C++ Arena.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Crosshair, Flame, Heart, Lock, Skull, X } from "lucide-react";
import { modules, stepPath } from "../content";
import { useDrills } from "../content/drills";
import type { Drill } from "../content/types";
import { getState, patchSettings, useStore, type DmMode } from "../state/store";
import { BOSS_EVERY, INTERVIEW, MIN_RANKED, MODE_NAME, blip, callout, drillUnlocked, isDue, lives, pickNext, practiceStreak, rankFor, recordRep, recordRun, topicTitle, unlockedTopics } from "../practice/engine";
import { engineSupported } from "../engine/client";
import { Death, Rep } from "../practice/Reps";
import ShareButton from "../components/ShareButton";
import { useTitle } from "../lib/title";

type Phase = "lobby" | "playing" | "review" | "dead" | "cleared";
type Kill = { id: number; topic: string; type: Drill["type"]; ms: number; ok: boolean };

export default function Deathmatch() {
  useTitle("Deathmatch");
  const set = useDrills();
  if (set === undefined || set === "error")
    return (
      <div className="lobby practice-page">
        <div className="page-head">
          <h1>Deathmatch</h1>
          {set === "error" ? (
            <p className="banner banner-fail" role="alert">
              The drills couldn't be loaded. Check the connection and reload the page.
            </p>
          ) : (
            <p className="muted">Loading the drills…</p>
          )}
        </div>
      </div>
    );
  return <Arena drills={set.drills} />;
}

function Arena({ drills }: { drills: Drill[] }) {
  const s = useStore((x) => x);
  const unlocked = unlockedTopics(drills, s);
  const chosen = unlocked.filter((t) => !s.settings.topicsOff.includes(t));
  const topics = chosen.length ? chosen : unlocked;
  // Boss reps need the Java engine; in a browser that can't run it they're left out.
  const [canRun] = useState(engineSupported);
  const bossOn = s.settings.boss && canRun;
  const topicPool = useMemo(
    () => drills.filter((d) => d.topic !== INTERVIEW && topics.includes(d.topic) && (bossOn || d.type !== "boss") && drillUnlocked(s, d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drills, topics.join(","), bossOn, s.settings.unlockAll, s.steps, s.drills, s.placed],
  );
  const interviewPool = useMemo(() => drills.filter((d) => d.topic === INTERVIEW && (bossOn || d.type !== "boss")), [drills, bossOn]);
  // Warm-up reviews every due drill, interview questions included.
  const warmupPool = useMemo(() => [...topicPool, ...interviewPool], [topicPool, interviewPool]);
  const dueCount = warmupPool.filter((d) => isDue(s.drills[d.id])).length;
  const quickCount = topicPool.filter((d) => d.type !== "boss").length;

  const [phase, setPhaseState] = useState<Phase>("lobby");
  const [mode, setMode] = useState<DmMode>("deathmatch");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [streak, setStreak] = useState(0);
  const [runBest, setRunBest] = useState(0);
  const [reps, setReps] = useState(0);
  const [kills, setKills] = useState(0);
  const [hp, setHp] = useState(1);
  const [feed, setFeed] = useState<Kill[]>([]);
  const [flash, setFlash] = useState<"hit" | "miss" | null>(null);
  const [shout, setShout] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const [lastWrong, setLastWrong] = useState<{ drill: Drill; given: string } | null>(null);
  const [startBest, setStartBest] = useState(0);
  const recent = useRef<string[]>([]);
  const repStart = useRef(0);
  const feedId = useRef(0);
  const shoutTimer = useRef<ReturnType<typeof setTimeout>>();
  // Which rep is on screen, and the phase, as of now: an answer from an earlier rep (a boss rep
  // still being checked when the learner gave up or left) is ignored.
  const repNo = useRef(0);
  const phaseNow = useRef<Phase>("lobby");
  const runAt = useRef(0);
  const setPhase = (p: Phase) => {
    phaseNow.current = p;
    setPhaseState(p);
  };

  const poolFor = useCallback((m: DmMode) => (m === "interview" ? interviewPool : m === "warmup" ? warmupPool : topicPool), [interviewPool, warmupPool, topicPool]);
  const canStart = (m: DmMode) => (m === "deathmatch" ? quickCount >= MIN_RANKED : m === "warmup" ? dueCount > 0 : poolFor(m).length > 0);

  const nextRep = useCallback(
    (n: number, m: DmMode) => {
      const d = pickNext(poolFor(m), getState(), recent.current, n, m);
      repNo.current++;
      if (!d) {
        setPhase("cleared");
        return;
      }
      recent.current = [...recent.current, d.id].slice(-30);
      setDrill(d);
      repStart.current = performance.now();
    },
    [poolFor],
  );

  const start = (m: DmMode) => {
    if (!canStart(m)) return;
    setMode(m);
    setStreak(0);
    setRunBest(0);
    setReps(0);
    setKills(0);
    setHp(lives(m));
    setFeed([]);
    setLastWrong(null);
    setSaid(`${MODE_NAME[m]} started. ${lives(m)} ${lives(m) === 1 ? "life" : "lives"}.`);
    setStartBest(getState().dm.best[m]);
    recent.current = [];
    runAt.current = Date.now();
    setPhase("playing");
    nextRep(0, m);
  };

  // The run is saved after every answer, so leaving needs nothing more.
  const leave = () => setPhase("lobby");

  const answer = (rep: number, given: string, ok: boolean) => {
    if (!drill || rep !== repNo.current || phaseNow.current !== "playing") return;
    const ms = performance.now() - repStart.current;
    recordRep(drill, ok);
    const r = reps + 1;
    const st = ok ? streak + 1 : streak;
    const k = kills + (ok ? 1 : 0);
    const best = Math.max(runBest, st);
    recordRun({ at: runAt.current, mode, streak: best, reps: r, kills: k });
    setReps(r);
    setKills(k);
    setRunBest(best);
    setFeed((f) => [{ id: feedId.current++, topic: drill.topic, type: drill.type, ms, ok }, ...f].slice(0, 6));
    const sound = getState().settings.sound;
    if (ok) {
      setStreak(st);
      const c = callout(st);
      if (sound) blip(c ? "streak" : drill.type === "boss" ? "boss" : "hit");
      setFlash("hit");
      setSaid(`Correct. ${mode === "warmup" ? `${k} cleared` : `Streak ${st}`}.${c ? " " + c : ""}`);
      if (c) {
        setShout(c);
        clearTimeout(shoutTimer.current);
        shoutTimer.current = setTimeout(() => setShout(null), 1100);
      }
      setTimeout(() => setFlash(null), 220);
      nextRep(r, mode);
    } else {
      if (sound) blip("miss");
      clearTimeout(shoutTimer.current);
      setShout(null);
      const left = hp - 1;
      setFlash("miss");
      setSaid(left <= 0 ? "Wrong. Eliminated. The answer and why are below." : `Wrong. ${left} ${left === 1 ? "life" : "lives"} left. The answer and why are below.`);
      setTimeout(() => setFlash(null), 300);
      setLastWrong({ drill, given });
      setHp(left);
      if (left <= 0) setPhase("dead");
      else {
        setPhase("review");
        if (mode !== "warmup") setStreak(0);
      }
    }
  };

  const continueAfterReview = () => {
    setLastWrong(null);
    setPhase("playing");
    nextRep(reps, mode);
  };

  // Keys on the review, eliminated and cleared screens, and Esc to leave a run.
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const t = e.target as HTMLElement | null;
      // Esc leaves a run from an answer box too, but not from the code editor (there it leaves the editor).
      if (e.key === "Escape") {
        if (t?.isContentEditable) return;
        if (phase === "playing" || phase === "review" || phase === "cleared") leave();
        else if (phase === "dead") setPhase("lobby");
        return;
      }
      // Typing, and Enter on a link or button, do what they'd do anywhere else.
      if (t && (t.isContentEditable || t.closest("input, textarea, select"))) return;
      if (e.key === "Enter" && t?.closest("a, button, summary")) return;
      const letters = getState().settings.keys;
      if (phase === "dead" && (e.key === "Enter" || (letters && (e.key === "r" || e.key === "R")))) {
        e.preventDefault();
        start(mode);
      } else if (phase === "review" && e.key === "Enter") {
        e.preventDefault();
        continueAfterReview();
      } else if (phase === "cleared" && e.key === "Enter") leave();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // A new rep: keyboard focus goes to its question (typed answers focus their own box).
  useEffect(() => {
    if (phase !== "playing" || !drill) return;
    if (drill.type !== "predict" && drill.type !== "fill") document.getElementById("rep-prompt")?.focus({ preventScroll: false });
  }, [drill, phase, reps]);

  // After a miss, focus goes to the verdict, so a screen reader reads the review from the top.
  useEffect(() => {
    if (phase === "review" || phase === "dead") document.getElementById("death-title")?.focus();
    else if (phase === "cleared") document.getElementById("cleared-title")?.focus();
  }, [phase]);

  if (phase === "lobby") return <Lobby drills={drills} pool={topicPool} quickCount={quickCount} interviewCount={interviewPool.length} unlocked={unlocked} selected={topics} dueCount={dueCount} canRun={canRun} canStart={canStart} onStart={start} />;

  const score = mode === "warmup" ? kills : runBest;
  const best = Math.max(startBest, score);
  const newBest = score > startBest && score > 0;
  const rankedUp = mode === "deathmatch" && rankFor(runBest).index > rankFor(startBest).index;
  const rep = repNo.current;
  return (
    <div className={"dm" + (flash ? " dm-flash-" + flash : "")}>
      <h1 className="visually-hidden">{MODE_NAME[mode]} run</h1>
      <div className="hud">
        <div className="hud-streak">
          <div className="hud-n">{mode === "warmup" ? kills : streak}</div>
          <div className="hud-l">{mode === "warmup" ? "cleared" : "streak"}</div>
        </div>
        <div className="hud-mid">
          <div className="hud-mode">{mode === "deathmatch" ? "Deathmatch · 1 life" : mode === "casual" ? "Casual · 3 lives" : mode === "interview" ? "Interview prep · 3 lives" : "Warm-up · due reviews"}</div>
          <div className="hud-lives" role="img" aria-label={`${hp} ${hp === 1 ? "life" : "lives"} left`}>
            {Array.from({ length: lives(mode) }).map((_, i) => (
              <Heart key={i} className={i < hp ? "icon life" : "icon life life-lost"} aria-hidden="true" />
            ))}
          </div>
          <div className="hud-sub">
            best {best} · reps {reps}
            {mode !== "warmup" && poolFor(mode).some((d) => d.type === "boss") && <> · boss rep in {BOSS_EVERY - (reps % BOSS_EVERY)}</>}
          </div>
        </div>
        {(phase === "playing" || phase === "review") && (
          <button type="button" className="btn btn-ghost hud-quit" onClick={leave}>
            Leave <kbd aria-hidden="true">Esc</kbd>
          </button>
        )}
      </div>
      {shout && (
        <div className="shout" aria-hidden="true">
          {shout}
        </div>
      )}
      <p className="visually-hidden" role="status" aria-live="polite">
        {said}
      </p>
      <div className="dm-grid">
        <div className="dm-main">
          {phase === "playing" && drill && <Rep key={drill.id + ":" + rep} drill={drill} onAnswer={(g, ok) => answer(rep, g, ok)} />}
          {phase === "review" && lastWrong && (
            <Death drill={lastWrong.drill} given={lastWrong.given} title="Hit! A life lost" sub={`${hp} ${hp === 1 ? "life" : "lives"} left${mode !== "warmup" ? ", and the streak starts again" : ""}.`}>
              <button type="button" className="btn btn-primary" onClick={continueAfterReview}>
                Continue <kbd aria-hidden="true">↵</kbd>
              </button>
            </Death>
          )}
          {phase === "dead" && lastWrong && (
            <Death
              drill={lastWrong.drill}
              given={lastWrong.given}
              title="Eliminated"
              sub={(mode === "warmup" ? `Cleared ${kills}` : mode === "deathmatch" ? `Streak ${runBest}` : `Best streak this run: ${runBest}`) + (newBest ? " · a new personal best" : "") + (rankedUp ? ` · ranked up to ${rankFor(runBest).rank.name}` : "")}
            >
              <button type="button" className="btn btn-primary" onClick={() => start(mode)}>
                Respawn <kbd aria-hidden="true">↵</kbd>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("lobby")}>
                Lobby <kbd aria-hidden="true">Esc</kbd>
              </button>
              {newBest && mode === "deathmatch" && (
                <ShareButton
                  card={{ kicker: "New personal best", title: `${runBest} in a row`, lines: [`Rank: ${rankFor(runBest).rank.name}`, "Java Deathmatch, one life"], file: "java-arena-streak.png" }}
                  text={`New Deathmatch best on Java Arena: ${runBest} in a row (${rankFor(runBest).rank.name}).`}
                />
              )}
            </Death>
          )}
          {phase === "cleared" && (
            <div className="death cleared">
              <h2 tabIndex={-1} id="cleared-title">
                {mode === "warmup" ? "Warm-up cleared" : "No drills left"}
              </h2>
              <p>{mode === "warmup" ? `You cleared ${kills} due ${kills === 1 ? "review" : "reviews"}. Drills you miss come back sooner; the ones you get right wait longer.` : "There are no more drills to pick from right now."}</p>
              <button type="button" className="btn btn-primary" onClick={leave}>
                Back to the lobby
              </button>
            </div>
          )}
        </div>
        <aside className="killfeed" aria-label="Recent answers">
          {feed.map((k) => (
            <div key={k.id} className={"kf " + (k.ok ? "kf-ok" : "kf-bad")}>
              <span className="kf-icon">
                {k.ok ? k.type === "boss" ? <Skull className="icon" aria-hidden="true" /> : <Crosshair className="icon" aria-hidden="true" /> : <X className="icon" aria-hidden="true" />}
                <span className="visually-hidden">{k.ok ? "Hit: " : "Miss: "}</span>
              </span>
              <span className="kf-topic">{topicTitle(k.topic)}</span>
              <span className="kf-time">{(k.ms / 1000).toFixed(1)} s</span>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lobby
type LobbyProps = { drills: Drill[]; pool: Drill[]; quickCount: number; interviewCount: number; unlocked: string[]; selected: string[]; dueCount: number; canRun: boolean; canStart: (m: DmMode) => boolean; onStart: (m: DmMode) => void };

function Lobby({ drills, pool, quickCount, interviewCount, unlocked, selected, dueCount, canRun, canStart, onStart }: LobbyProps) {
  const s = useStore((x) => x);
  const r = rankFor(s.dm.best.deathmatch);
  const days = practiceStreak(s.dm.days);
  const off = s.settings.topicsOff;
  const first = modules[0];
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "Enter" || e.repeat || t?.isContentEditable || t?.closest("a, button, input, textarea, select, summary")) return;
      if (canStart("deathmatch")) onStart("deathmatch");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="lobby practice-page">
      <div className="page-head">
        <h1>Deathmatch</h1>
        <p className="muted">Endless quick reps from the lessons you've finished: predict the output, fill the blank, spot the bug, will it compile, pick one. Every {BOSS_EVERY}th rep is a boss rep, a small program you write and run for real. Drills you miss come back more often until you know them.</p>
      </div>
      <div className="lobby-grid">
        <div className="rank-card">
          <div className="rank-emblem" data-tier={Math.floor((r.index / 17) * 4)} aria-hidden="true">
            <svg viewBox="0 0 64 64" width="56" height="56">
              <circle cx="32" cy="32" r="18" fill="none" stroke="currentColor" strokeWidth="4" />
              <path d="M32 6v14M32 44v14M6 32h14M44 32h14" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <div className="rank-name">{r.rank.name}</div>
            <div className="muted small">
              Best Deathmatch streak: <b>{s.dm.best.deathmatch}</b>
              {r.next && <> · next rank at {r.next.at}</>}
            </div>
            <div className="muted small">
              {s.dm.kills} right answers · {s.dm.bossKills} boss reps ·{" "}
              {days > 0 ? (
                <>
                  <Flame className="icon" aria-hidden="true" /> {days}-day streak
                </>
              ) : (
                "no practice streak yet (20 reps a day)"
              )}
            </div>
          </div>
        </div>

        {unlocked.length === 0 ? (
          <div className="card">
            <h2 className="h3">No drills unlocked yet</h2>
            <p>Each lesson step unlocks the drills that practise it. Finish a step, take the placement quiz if you already know some Java, or start with interview prep, which is open to everyone.</p>
            <div className="actions">
              {first && (
                <Link className="btn btn-primary" to={stepPath(first, first.steps[0])}>
                  Start lesson 1
                </Link>
              )}
              <Link className="btn" to="/placement/">
                Placement quiz
              </Link>
              {interviewCount > 0 && (
                <button type="button" className="btn" onClick={() => onStart("interview")}>
                  Try interview prep
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="modes">
            <button type="button" className="mode mode-dm" onClick={() => onStart("deathmatch")} disabled={!canStart("deathmatch")}>
              <span className="mode-name">Deathmatch</span>
              <span className="mode-desc">{canStart("deathmatch") ? "One life. A single miss ends the run. Your best streak sets your rank." : `Opens at ${MIN_RANKED} drills in the rotation (${quickCount} so far), so a rank can't come from a few answers learned by heart. Casual works now.`}</span>
              <span className="mode-best">best {s.dm.best.deathmatch}{canStart("deathmatch") ? " · Enter" : ""}</span>
            </button>
            <button type="button" className="mode" onClick={() => onStart("casual")} disabled={!canStart("casual")}>
              <span className="mode-name">Casual</span>
              <span className="mode-desc">Three lives. A miss restarts the streak and shows the answer and why.</span>
              <span className="mode-best">best {s.dm.best.casual}</span>
            </button>
            <button type="button" className="mode" onClick={() => onStart("warmup")} disabled={!canStart("warmup")}>
              <span className="mode-name">Warm-up</span>
              <span className="mode-desc">Spaced review: only the drills that are due again. Three lives.</span>
              <span className="mode-best">{dueCount} due now</span>
            </button>
            <button type="button" className="mode mode-iv" onClick={() => onStart("interview")} disabled={!canStart("interview")}>
              <span className="mode-name">Interview prep</span>
              <span className="mode-desc">{interviewCount} Java interview questions. Three lives. Open to everyone.</span>
              <span className="mode-best">best {s.dm.best.interview}</span>
            </button>
          </div>
        )}
      </div>

      <section className="card" aria-labelledby="maps-h">
        <div className="row-between">
          <h2 className="h3" id="maps-h">
            Topics
          </h2>
          {unlocked.length > 1 && (
            <button type="button" className="linkish" onClick={() => patchSettings({ topicsOff: [] })}>
              Select all
            </button>
          )}
        </div>
        <div className="chips">
          {modules.map((m) => {
            const all = drills.filter((d) => d.topic === m.id);
            if (!all.length) return null;
            const isOpen = unlocked.includes(m.id);
            const on = isOpen && selected.includes(m.id);
            const open = all.filter((d) => drillUnlocked(s, d)).length;
            return (
              <button
                type="button"
                key={m.id}
                className={"chip" + (on ? " chip-on" : "") + (isOpen ? "" : " chip-locked")}
                disabled={!isOpen}
                aria-pressed={isOpen ? on : undefined}
                title={!isOpen ? "Finish a step of this module to unlock its drills" : open < all.length ? `${open} of ${all.length} drills unlocked: each unlocks with the step that teaches it` : n(all.length, "drill", "drills")}
                onClick={() => {
                  // At least one topic stays in the rotation.
                  if (on && selected.length > 1) patchSettings({ topicsOff: [...off, m.id] });
                  else if (!on) patchSettings({ topicsOff: off.filter((t) => t !== m.id) });
                }}
              >
                {isOpen ? null : <Lock className="icon" aria-hidden="true" />}
                {m.title} <span className="chip-n">{open < all.length ? `${open}/${all.length}` : all.length}</span>
                {!isOpen && <span className="visually-hidden"> (locked)</span>}
              </button>
            );
          })}
        </div>
        <p className="muted small">{n(pool.length, "drill", "drills")} in the rotation.</p>
        <div className="toggles">
          <label>
            <input type="checkbox" checked={s.settings.boss && canRun} disabled={!canRun} onChange={(e) => patchSettings({ boss: e.target.checked })} /> Boss reps (a small program every {BOSS_EVERY}th rep, run by the Java engine){canRun ? "" : ": this browser can't run the engine, so they're off"}
          </label>
          <label>
            <input type="checkbox" checked={s.settings.sound} onChange={(e) => patchSettings({ sound: e.target.checked })} /> Sound
          </label>
          <label>
            <input type="checkbox" checked={s.settings.unlockAll} onChange={(e) => patchSettings({ unlockAll: e.target.checked })} /> Unlock every topic
          </label>
          <label>
            <input type="checkbox" checked={s.settings.keys} onChange={(e) => patchSettings({ keys: e.target.checked })} /> Single-key shortcuts (Y and N, line numbers, A to D, R)
          </label>
        </div>
      </section>

      {s.dm.runs.length > 0 && (
        <section className="card" aria-labelledby="runs-h">
          <h2 className="h3" id="runs-h">
            Recent runs
          </h2>
          <div className="table-scroll" tabIndex={0} role="region" aria-labelledby="runs-h">
            <table className="runs">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Best streak</th>
                  <th scope="col">Right</th>
                  <th scope="col">Reps</th>
                </tr>
              </thead>
              <tbody>
                {s.dm.runs.slice(0, 8).map((run, i) => (
                  <tr key={i}>
                    <td>{new Date(run.at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                    <td>{MODE_NAME[run.mode]}</td>
                    <td>{run.streak}</td>
                    <td>{run.kills}</td>
                    <td>{run.reps}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
