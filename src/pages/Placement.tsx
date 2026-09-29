// The placement quiz: one question per module, in course order. The first question missed shows
// where to start; the modules before it can be skipped, which also unlocks their drills.
import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, X } from "lucide-react";
import { moduleById, modules, modulePath, stepPath } from "../content";
import { useDrills } from "../content/drills";
import type { PlacementQuestion } from "../content/types";
import { update, useStore } from "../state/store";
import { Rep } from "../practice/Reps";
import { useTitle } from "../lib/title";

type Answer = { ok: boolean; given: string };

/** Where to start (null: past every written module) and which modules can be skipped. */
export function placementResult(questions: PlacementQuestion[], answers: Answer[]) {
  const order = modules.map((m) => m.id);
  const firstWrong = answers.findIndex((a) => !a.ok);
  const at = firstWrong >= 0 ? order.indexOf(questions[firstWrong].module) : order.indexOf(questions[questions.length - 1].module) + 1;
  return { start: modules[at] ?? null, skip: order.slice(0, at) };
}

export default function Placement() {
  useTitle("Placement quiz");
  const set = useDrills();
  const placed = useStore((s) => s.placed);
  const [phase, setPhase] = useState<"intro" | "quiz" | "done">("intro");
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [applied, setApplied] = useState(false);
  const questions = set && set !== "error" ? set.placement : [];
  const first = modules[0];
  const i = answers.length;

  const record = (a: Answer) => {
    const next = [...answers, a];
    setAnswers(next);
    if (next.length === questions.length) setPhase("done");
    requestAnimationFrame(() => document.getElementById("quiz-h")?.focus());
  };

  if (set === undefined) return <Intro loading />;
  if (set === "error" || !questions.length)
    return (
      <div className="narrow">
        <h1>Placement quiz</h1>
        <p className="banner banner-fail" role="alert">
          The questions couldn't be loaded. Check the connection and reload the page.
        </p>
      </div>
    );

  if (phase === "intro")
    return (
      <Intro count={questions.length}>
        <div className="actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => setPhase("quiz")}>
            Start the quiz
          </button>
          {first && (
            <Link className="btn btn-lg" to={stepPath(first, first.steps[0])}>
              I'm new: start with lesson 1
            </Link>
          )}
        </div>
        {placed.length > 0 && (
          <p className="small">
            You're skipping {placed.length} {placed.length === 1 ? "module" : "modules"} after an earlier quiz.{" "}
            <button type="button" className="linkish" onClick={() => update((s) => ({ ...s, placed: [] }))}>
              Stop skipping them
            </button>
          </p>
        )}
      </Intro>
    );

  if (phase === "quiz" && i < questions.length) {
    const q = questions[i];
    return (
      <div className="narrow">
        <h1 className="h2" id="quiz-h" tabIndex={-1}>
          Question {i + 1} of {questions.length}
        </h1>
        <div className="bar" aria-hidden="true">
          <div style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>
        <p className="muted small">Topic: {moduleById.get(q.module)?.title}</p>
        <Rep key={q.id} drill={q} onAnswer={(given, ok) => record({ ok, given })} />
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={() => record({ ok: false, given: "(skipped)" })}>
            I don't know this yet
          </button>
        </div>
      </div>
    );
  }

  const r = placementResult(questions, answers);
  const right = answers.filter((a) => a.ok).length;
  return (
    <div className="narrow">
      <div className="page-head">
        <h1 id="quiz-h" tabIndex={-1}>
          Your starting point
        </h1>
        <p>
          You got {right} of {questions.length} right.{" "}
          {r.start ? (
            <>
              Start at <b>{r.start.title}</b>
              {r.skip.length ? `, skipping the ${r.skip.length} ${r.skip.length === 1 ? "module" : "modules"} before it.` : "."}
            </>
          ) : (
            "You know everything the site teaches so far. The next modules come in later updates; until then, Deathmatch has drills for every module."
          )}
        </p>
      </div>
      <ol className="placement-results">
        {questions.map((q, k) => (
          <li key={q.id} className={answers[k]?.ok ? "ok" : "miss"}>
            <span className="res-icon">{answers[k]?.ok ? <Check className="icon" aria-hidden="true" /> : <X className="icon" aria-hidden="true" />}</span> {moduleById.get(q.module)?.title}
            <span className="visually-hidden">{answers[k]?.ok ? ": right" : ": missed"}</span>
          </li>
        ))}
      </ol>
      <div className="actions">
        {r.skip.length > 0 && !applied && (
          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={() => {
              update((s) => ({ ...s, placed: [...new Set([...s.placed, ...r.skip])] }));
              setApplied(true);
            }}
          >
            Skip {r.skip.length} {r.skip.length === 1 ? "module" : "modules"} and unlock their drills
          </button>
        )}
        {r.start ? (
          <Link className={"btn btn-lg" + (applied || !r.skip.length ? " btn-primary" : "")} to={modulePath(r.start)}>
            Go to {r.start.title}
          </Link>
        ) : (
          <Link className={"btn btn-lg" + (applied ? " btn-primary" : "")} to="/deathmatch/">
            Go to Deathmatch
          </Link>
        )}
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => {
            setAnswers([]);
            setApplied(false);
            setPhase("quiz");
          }}
        >
          Take it again
        </button>
      </div>
      <p role="status">{applied ? "Done. The skipped modules stay open on the course page if you want to review them, and their drills are now in Deathmatch." : ""}</p>
    </div>
  );
}

function Intro({ count, loading, children }: { count?: number; loading?: boolean; children?: React.ReactNode }) {
  return (
    <div className="narrow">
      <div className="page-head">
        <h1>Placement quiz</h1>
        <p>Already know some Java? {loading ? "Answer a few quick questions" : `Answer ${count} quick questions`}, one for each module so far, from printing to methods. The first one you miss shows where to start, and you can skip the modules before it.</p>
        <p className="muted small">Take your time and don't guess: a wrong answer only means starting a little earlier, while a lucky guess could skip something you need. You can take it again at any time.</p>
      </div>
      {loading ? <p className="muted">Loading the questions…</p> : children}
    </div>
  );
}
