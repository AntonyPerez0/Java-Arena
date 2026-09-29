// The daily challenge: one drill a day, the same for everyone on the same date (it changes at local
// midnight). The first answer counts toward the streak, right or wrong.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDrills } from "../content/drills";
import type { Drill } from "../content/types";
import { localDay, update, useStore } from "../state/store";
import { dailyStreak, recordRep, topicTitle } from "../practice/engine";
import { Death, Rep } from "../practice/Reps";
import { useTitle } from "../lib/title";

/** The day's drill: a hash of the date picks one of the quick drills. */
export function dailyDrill(drills: Drill[], day: string): Drill | null {
  const pool = drills.filter((d) => d.type !== "boss").sort((a, b) => a.id.localeCompare(b.id));
  if (!pool.length) return null;
  let h = 2166136261;
  for (const c of day) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return pool[h % pool.length];
}

export default function Daily() {
  useTitle("Daily challenge");
  const set = useDrills();
  const day = localDay();
  const daily = useStore((s) => s.daily);
  const drill = useMemo(() => (set && set !== "error" ? dailyDrill(set.drills, day) : null), [set, day]);
  const done = day in daily;
  const streak = dailyStreak(daily);
  const last14 = Array.from({ length: 14 }, (_, k) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - k));
    const key = localDay(d);
    return { key, state: key in daily ? (daily[key] ? "right" : "wrong") : "none", label: d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) };
  });
  // The typed answer is kept for this visit only; the result (right or wrong) is saved.
  const givenKey = `java-arena-daily-${day}`;
  let given = "";
  try {
    given = sessionStorage.getItem(givenKey) ?? "";
  } catch {
    /* ignore */
  }

  return (
    <div className="narrow practice-page">
      <div className="page-head">
        <h1>Daily challenge</h1>
        <p className="muted">One question a day, the same for everyone. Answer it to keep your streak going; a new one comes at midnight.</p>
      </div>
      <div className="daily-head">
        <div className="stat">
          <div className="stat-n">{streak}</div>
          <div className="stat-l">day streak</div>
        </div>
        <ol className="daily-days" aria-label="The last 14 days">
          {last14.map((d) => (
            <li key={d.key} className={"dday dday-" + d.state} title={d.label}>
              <span className="visually-hidden">
                {d.label}: {d.state === "none" ? "not played" : d.state === "right" ? "solved" : "missed"}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {set === undefined ? (
        <p className="muted">Loading today's question…</p>
      ) : set === "error" || !drill ? (
        <p className="banner banner-fail" role="alert">
          Today's question couldn't be loaded. Check the connection and reload the page.
        </p>
      ) : !done ? (
        <>
          <p className="muted small">Today's topic: {topicTitle(drill.topic)}</p>
          <Rep
            drill={drill}
            onAnswer={(g, ok) => {
              try {
                sessionStorage.setItem(givenKey, g);
              } catch {
                /* ignore */
              }
              recordRep(drill, ok);
              update((s) => ({ ...s, daily: { ...s.daily, [day]: ok } }));
              requestAnimationFrame(() => document.getElementById("death-title")?.focus());
            }}
          />
        </>
      ) : (
        <Death drill={drill} given={given || "(answered earlier)"} title={daily[day] ? "Solved" : "Not this time"} sub={daily[day] ? `Streak: ${streak} ${streak === 1 ? "day" : "days"}. Come back tomorrow.` : "Your streak still counts. Read why, then come back tomorrow."}>
          <Link className="btn btn-primary" to="/deathmatch/">
            Keep going in Deathmatch
          </Link>
          <Link className="btn btn-ghost" to="/learn/">
            Back to the lessons
          </Link>
        </Death>
      )}
    </div>
  );
}
