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
import { BOSS_EVERY, INTERVIEW, MODE_NAME, blip, callout, drillUnlocked, isDue, lives, pickNext, practiceStreak, rankFor, recordRep, recordRun, topicTitle, unlockedTopics } from "../practice/engine";
import { Death, Rep } from "../practice/Reps";
import ShareButton from "../components/ShareButton";
import { useTitle } from "../lib/title";

type Phase = "lobby" | "playing" | "review" | "dead" | "cleared";
type Kill = { id: number; topic: string; type: Drill["type"]; ms: number; ok: boolean };

export default function Deathmatch() {
  useTitle("Deathmatch");
  const set = useDrills();
  if (set === undefined)
    return (
      <div className="page-head">
        <h1>Deathmatch</h1>
        <p className="muted">Loading the drills…</p>
      </div>
    );
  if (set === "error")
    return (
      <div className="page-head">
        <h1>Deathmatch</h1>
        <p className="banner banner-fail" role="alert">
          The drills couldn't be loaded. Check the connection and reload the page.
        </p>
      </div>
    );
  return <Arena drills={set.drills} />;
}

function Arena({ drills }: { drills: Drill[] }) {
  const s = useStore((x) => x);
  const unlocked = unlockedTopics(drills, s);
  const chosen = (s.settings.topics ?? unlocked).filter((t) => unlocked.includes(t));
  const topics = chosen.length ? chosen : unlocked;
  const topicPool = useMemo(
    () => drills.filter((d) => d.topic !== INTERVIEW && topics.includes(d.topic) && (s.settings.boss || d.type !== "boss") && drillUnlocked(s, d)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drills, topics.join(","), s.settings.boss, s.settings.unlockAll, s.steps, s.drills, s.placed],
  );
  const interviewPool = useMemo(() => drills.filter((d) => d.topic === INTERVIEW && (s.settings.boss || d.type !== "boss")), [drills, s.settings.boss]);
  const dueCount = topicPool.filter((d) => isDue(s.drills[d.id])).length;

  const [phase, setPhase] = useState<Phase>("lobby");
  const [mode, setMode] = useState<DmMode>("deathmatch");
  const [drill, setDrill] = useState<Drill | null>(null);
  const [streak, setStreak] = useState(0);
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

  const poolFor = useCallback((m: DmMode) => (m === "interview" ? interviewPool : topicPool), [interviewPool, topicPool]);

  const nextRep = useCallback(
    (repNo: number, m: DmMode) => {
      const d = pickNext(poolFor(m), getState(), recent.current, repNo, m);
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
    const p = poolFor(m);
    if (!p.length || (m === "warmup" && dueCount === 0)) return;
    setMode(m);
    setStreak(0);
    setReps(0);
    setKills(0);
    setHp(lives(m));
    setFeed([]);
    setLastWrong(null);
    setSaid(`${MODE_NAME[m]} started. ${lives(m)} ${lives(m) === 1 ? "life" : "lives"}.`);
    setStartBest(getState().dm.best[m]);
    recent.current = [];
    setPhase("playing");
    nextRep(0, m);
  };

  const leave = () => {
    recordRun(mode, streak, reps, kills);
    setPhase("lobby");
  };

  const answer = (given: string, ok: boolean) => {
    if (!drill || phase !== "playing") return;
    const ms = performance.now() - repStart.current;
    recordRep(drill, ok);
    const r = reps + 1;
    setReps(r);
    setFeed((f) => [{ id: feedId.current++, topic: drill.topic, type: drill.type, ms, ok }, ...f].slice(0, 6));
    const sound = getState().settings.sound;
    if (ok) {
      const st = streak + 1;
      const k = kills + 1;
      setStreak(st);
      setKills(k);
      const c = callout(st);
      if (sound) blip(c ? "streak" : drill.type === "boss" ? "boss" : "hit");
      setFlash("hit");
      setSaid(`Correct. ${mode === "warmup" ? `${k} cleared` : `Streak ${st}`}.${c ? " " + c : ""}`);
      if (c) {
        setShout(c);
        setTimeout(() => setShout(null), 1100);
      }
      setTimeout(() => setFlash(null), 220);
      nextRep(r, mode);
    } else {
      if (sound) blip("miss");
      const left = hp - 1;
      setFlash("miss");
      setSaid(left <= 0 ? "Wrong. Eliminated. The answer and why are below." : `Wrong. ${left} ${left === 1 ? "life" : "lives"} left. The answer and why are below.`);
      setTimeout(() => setFlash(null), 300);
      setLastWrong({ drill, given });
      setHp(left);
      if (left <= 0) {
        recordRun(mode, streak, r, kills);
        setPhase("dead");
      } else {
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
      const t = e.target as HTMLElement | null;
      const typing = !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing || (t?.tagName === "BUTTON" && e.key === "Enter")) return;
      const letters = getState().settings.keys;
      if (phase === "dead" && (e.key === "Enter" || (letters && (e.key === "r" || e.key === "R")))) {
        e.preventDefault();
        start(mode);
      } else if (phase === "dead" && e.key === "Escape") setPhase("lobby");
      else if (phase === "review" && e.key === "Enter") {
        e.preventDefault();
        continueAfterReview();
      } else if (phase === "cleared" && e.key === "Enter") leave();
      else if (phase === "playing" && e.key === "Escape") leave();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  // A new rep: keyboard focus goes to its question (typed answers focus their own box).
  useEffect(() => {
    if (phase !== "playing" || !drill) return;
    if (drill.type === "bug" || drill.type === "compiles" || drill.type === "choice") document.getElementById("rep-prompt")?.focus({ preventScroll: false });
  }, [drill, phase, reps]);

  if (phase === "lobby") return <Lobby drills={drills} pool={topicPool} interviewCount={interviewPool.length} unlocked={unlocked} selected={topics} dueCount={dueCount} onStart={start} />;

  const best = Math.max(startBest, mode === "warmup" ? kills : streak);
  const newBest = mode === "deathmatch" && streak > startBest && streak > 0;
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
            {mode !== "warmup" && s.settings.boss && poolFor(mode).some((d) => d.type === "boss") && <> · boss rep in {BOSS_EVERY - (reps % BOSS_EVERY)}</>}
          </div>
        </div>
        <button type="button" className="btn btn-ghost hud-quit" onClick={leave}>
          Leave <kbd aria-hidden="true">Esc</kbd>
        </button>
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
          {phase === "playing" && drill && <Rep key={drill.id + ":" + reps} drill={drill} onAnswer={answer} />}
          {phase === "review" && lastWrong && (
            <Death drill={lastWrong.drill} given={lastWrong.given} title="Hit! A life lost" sub={`${hp} ${hp === 1 ? "life" : "lives"} left${mode !== "warmup" ? ", and the streak starts again" : ""}.`}>
              <button type="button" className="btn btn-primary" onClick={continueAfterReview} autoFocus>
                Continue <kbd aria-hidden="true">↵</kbd>
              </button>
            </Death>
          )}
          {phase === "dead" && lastWrong && (
            <Death
              drill={lastWrong.drill}
              given={lastWrong.given}
              title="Eliminated"
              sub={(mode === "warmup" ? `Cleared ${kills}` : `Streak ${streak}`) + (newBest ? " · a new personal best" : "") + (mode === "deathmatch" && rankFor(streak).index > rankFor(startBest).index ? ` · ranked up to ${rankFor(streak).rank.name}` : "")}
            >
              <button type="button" className="btn btn-primary" onClick={() => start(mode)} autoFocus>
                Respawn <kbd aria-hidden="true">↵</kbd>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setPhase("lobby")}>
                Lobby <kbd aria-hidden="true">Esc</kbd>
              </button>
              {newBest && (
                <ShareButton
                  card={{ kicker: "New personal best", title: `${streak} in a row`, lines: [`Rank: ${rankFor(streak).rank.name}`, "Java Deathmatch, one life"], file: "java-arena-streak.png" }}
                  text={`New Deathmatch best on Java Arena: ${streak} in a row (${rankFor(streak).rank.name}).`}
                />
              )}
            </Death>
          )}
          {phase === "cleared" && (
            <div className="death cleared">
              <h2 tabIndex={-1}>{mode === "warmup" ? "Warm-up cleared" : "No drills left"}</h2>
              <p>{mode === "warmup" ? `You cleared ${kills} due ${kills === 1 ? "review" : "reviews"}. Drills you miss come back sooner; the ones you get right wait longer.` : "There are no more drills to pick from right now."}</p>
              <button type="button" className="btn btn-primary" onClick={leave} autoFocus>
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
function Lobby({ drills, pool, interviewCount, unlocked, selected, dueCount, onStart }: { drills: Drill[]; pool: Drill[]; interviewCount: number; unlocked: string[]; selected: string[]; dueCount: number; onStart: (m: DmMode) => void }) {
  const s = useStore((x) => x);
  const r = rankFor(s.dm.best.deathmatch);
  const days = practiceStreak(s.dm.days);
  const setTopics = (t: string[]) => patchSettings({ topics: t.length === unlocked.length ? null : t });
  const first = modules[0];

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "Enter" && tag !== "BUTTON" && tag !== "INPUT" && tag !== "A" && pool.length) onStart("deathmatch");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  return (
    <div className="lobby">
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
            <button type="button" className="mode mode-dm" onClick={() => onStart("deathmatch")} disabled={!pool.length}>
              <span className="mode-name">Deathmatch</span>
              <span className="mode-desc">One life. A single miss ends the run. Your best streak sets your rank.</span>
              <span className="mode-best">best {s.dm.best.deathmatch} · Enter</span>
            </button>
            <button type="button" className="mode" onClick={() => onStart("casual")} disabled={!pool.length}>
              <span className="mode-name">Casual</span>
              <span className="mode-desc">Three lives. A miss restarts the streak and shows the answer and why.</span>
              <span className="mode-best">best {s.dm.best.casual}</span>
            </button>
            <button type="button" className="mode" onClick={() => onStart("warmup")} disabled={dueCount === 0}>
              <span className="mode-name">Warm-up</span>
              <span className="mode-desc">Spaced review: only the drills that are due again. Three lives.</span>
              <span className="mode-best">{dueCount} due now</span>
            </button>
            <button type="button" className="mode mode-iv" onClick={() => onStart("interview")} disabled={!interviewCount}>
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
            <button type="button" className="linkish" onClick={() => setTopics(unlocked)}>
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
                title={!isOpen ? "Finish a step of this module to unlock its drills" : open < all.length ? `${open} of ${all.length} drills unlocked: each unlocks with the step that teaches it` : `${all.length} drills`}
                onClick={() => {
                  const next = on ? selected.filter((t) => t !== m.id) : [...selected, m.id];
                  if (next.length) setTopics(next);
                }}
              >
                {isOpen ? null : <Lock className="icon" aria-hidden="true" />}
                {m.title} <span className="chip-n">{open < all.length ? `${open}/${all.length}` : all.length}</span>
                {!isOpen && <span className="visually-hidden"> (locked)</span>}
              </button>
            );
          })}
        </div>
        <p className="muted small">{pool.length} drills in the rotation.</p>
        <div className="toggles">
          <label>
            <input type="checkbox" checked={s.settings.boss} onChange={(e) => patchSettings({ boss: e.target.checked })} /> Boss reps (a small program every {BOSS_EVERY}th rep, run by the Java engine)
          </label>
          <label>
            <input type="checkbox" checked={s.settings.sound} onChange={(e) => patchSettings({ sound: e.target.checked })} /> Sound
          </label>
          <label>
            <input type="checkbox" checked={s.settings.unlockAll} onChange={(e) => patchSettings({ unlockAll: e.target.checked, topics: null })} /> Unlock every topic
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
          <div className="table-scroll">
            <table className="runs">
              <thead>
                <tr>
                  <th scope="col">When</th>
                  <th scope="col">Mode</th>
                  <th scope="col">Streak</th>
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
