import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { challengesOf, moduleById, modulePath, stepPath, useModule } from "../content";
import type { Module, Step } from "../content/types";
import { getState, patchChallenge, patchStep, useStore } from "../state/store";
import { challengeDone } from "../state/derived";
import Markdown from "../components/Markdown";
import Workbench from "../components/Workbench";
import PredictBench from "../components/PredictBench";
import TaskCard from "../components/TaskCard";
import MoocCredit from "../components/MoocCredit";
import NotFound from "./NotFound";
import { useTitle } from "../lib/title";

export default function StepPage() {
  const { moduleId = "", stepSlug = "" } = useParams();
  const summary = moduleById.get(moduleId);
  const stepSummary = summary?.steps.find((s) => s.slug === stepSlug);
  const full = useModule(moduleId);
  // Set while the "loading" heading is showing: if it had focus, the lesson's heading takes it over.
  const wasLoading = useRef(false);
  useTitle(summary && stepSummary ? `${stepSummary.title} · ${summary.title}` : "Step not found");
  if (!summary || !stepSummary || full === null) return <NotFound />;
  if (full === undefined || full === "error") {
    wasLoading.current = true;
    return (
      <div className="narrow">
        <h1 id="loading-h" tabIndex={-1}>
          {stepSummary.title}
        </h1>
        {full === "error" ? (
          <p role="alert">
            This lesson couldn't be loaded. Check the connection and <button type="button" className="linkish" onClick={() => location.reload()}>reload the page</button>.
          </p>
        ) : (
          <p className="muted">Loading the lesson…</p>
        )}
      </div>
    );
  }
  const step = full.steps.find((s) => s.slug === stepSlug);
  if (!step) return <NotFound />;
  const takeFocus = wasLoading.current;
  wasLoading.current = false;
  return <StepView key={step.id} m={full} step={step} takeFocus={takeFocus} />;
}

function StepView({ m, step, takeFocus }: { m: Module; step: Step; takeFocus: boolean }) {
  const nav = useNavigate();
  const h1Ref = useRef<HTMLHeadingElement>(null);
  // The loading heading had focus after a navigation and is gone now: give it to this page's heading.
  useEffect(() => {
    if (takeFocus && (document.activeElement === document.body || !document.activeElement)) h1Ref.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const idx = m.steps.indexOf(step);
  const progress = useStore((s) => s.steps[step.id]);
  const doneSteps = useStore((s) => m.steps.map((st) => !!s.steps[st.id]?.done).join());
  const challenges = useMemo(() => challengesOf(step), [step]);
  const firstOpen = () => {
    const p = getState().steps[step.id];
    const k = challenges.findIndex((_, i) => !challengeDone(p, i));
    return k < 0 ? 0 : k;
  };
  const [cur, setCur] = useState(firstOpen);
  // The challenge on screen, for checks that finish after the learner switched to another one.
  const curRef = useRef(cur);
  curRef.current = cur;
  const [banner, setBanner] = useState<{ text: string; next: number | null } | null>(null);

  const goChallenge = (k: number) => {
    setCur(k);
    setBanner(null);
    // Move focus to the new task, so keyboard and screen-reader users land on it.
    requestAnimationFrame(() => document.getElementById("task-h")?.focus());
  };

  const onPass = useCallback(
    (k: number, { hintsUsed, sawSolution }: { hintsUsed: number; sawSolution: boolean }) => {
      patchChallenge(step.id, k, { done: true });
      const now = getState().steps[step.id];
      const open = challenges.findIndex((_, i) => !challengeDone(now, i));
      const after = challenges.findIndex((_, i) => i > k && !challengeDone(now, i));
      // The learner moved on to another challenge while this one was checked: record it, but
      // don't show a banner or move focus.
      const shown = curRef.current === k;
      if (open >= 0) {
        if (!shown) return;
        setBanner({ text: `Challenge ${k + 1} of ${challenges.length} complete`, next: after >= 0 ? after : open });
        return;
      }
      if (now?.done) {
        if (shown) setBanner({ text: "All challenges of this step complete", next: null });
        return;
      }
      // Clean: no hints and no solution on any of the step's challenges.
      const clean = hintsUsed === 0 && !sawSolution && Object.values(now?.challenges ?? {}).every((c) => c.hintsUsed === 0 && !c.sawSolution);
      patchStep(step.id, { done: true, doneAt: Date.now(), clean });
      const moduleDone = m.steps.every((st) => getState().steps[st.id]?.done);
      if (shown) setBanner({ text: moduleDone ? `Module complete: ${m.title}` : "Step complete", next: null });
    },
    [step, m, challenges],
  );

  const prev = idx > 0 ? stepPath(m, m.steps[idx - 1]) : null;
  const next = idx + 1 < m.steps.length ? stepPath(m, m.steps[idx + 1]) : null;
  const done = !!progress?.done;
  const doneList = doneSteps.split(",");

  return (
    <div className="step-page" key={step.id}>
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <Link to={modulePath(m)}>{`Module ${m.number}: ${m.title}`}</Link>
      </nav>
      <div className="step-grid">
        <article className="step-text">
          <div className="step-count">
            Step {idx + 1} of {m.steps.length}
            {done && (
              <span className="done-chip">
                <Check className="icon" aria-hidden="true" /> done
              </span>
            )}
          </div>
          <h1 ref={h1Ref} tabIndex={-1}>
            {step.title}
          </h1>
          <Markdown text={step.text} top={2} />
          <nav className="step-dots" aria-label="Steps in this module">
            {m.steps.map((st, i) => (
              <Link
                key={st.id}
                to={stepPath(m, st)}
                className={"dot" + (i === idx ? " dot-cur" : "") + (doneList[i] === "true" ? " dot-done" : "")}
                aria-label={`Step ${i + 1}: ${st.title}${doneList[i] === "true" ? " (done)" : ""}`}
                aria-current={i === idx ? "page" : undefined}
                title={st.title}
              />
            ))}
          </nav>
          <MoocCredit module={m} compact />
        </article>
        <section className="step-work" aria-label="Exercise">
          {banner && (
            <div className="banner banner-pass big">
              <span>
                <Check className="icon" aria-hidden="true" /> {banner.text}
              </span>
              {banner.next != null ? (
                <button type="button" className="btn btn-primary" onClick={() => goChallenge(banner.next!)} autoFocus>
                  Next challenge <ArrowRight className="icon" aria-hidden="true" />
                </button>
              ) : next ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setBanner(null);
                    nav(next);
                  }}
                  autoFocus
                >
                  Next step <ArrowRight className="icon" aria-hidden="true" />
                </button>
              ) : (
                <Link className="btn btn-primary" to="/learn/" autoFocus>
                  Back to the course
                </Link>
              )}
            </div>
          )}
          <nav className="challenges" aria-label="Challenges in this step">
            {challenges.map((_, i) => {
              const ok = challengeDone(progress, i);
              return (
                <button key={i} type="button" className={"challenge-tab" + (i === cur ? " challenge-cur" : "") + (ok ? " challenge-done" : "")} aria-current={i === cur ? "step" : undefined} onClick={() => goChallenge(i)}>
                  {ok ? (
                    <Check className="icon" aria-hidden="true" />
                  ) : (
                    <span className="challenge-n" aria-hidden="true">
                      {i + 1}
                    </span>
                  )}
                  Challenge {i + 1}
                  {ok && <span className="visually-hidden"> (done)</span>}
                </button>
              );
            })}
          </nav>
          <TaskCard ex={challenges[cur]} task={challenges[cur].task} index={cur} total={challenges.length} />
          {challenges[cur].kind === "predict" ? (
            <PredictBench
              key={`${step.id}#${cur}`}
              ex={challenges[cur]}
              progress={progress?.challenges[cur]}
              onChange={(patch) => patchChallenge(step.id, cur, patch)}
              onPass={(info) => onPass(cur, info)}
              report={{ kind: "Lesson step", title: `${m.title}: ${step.title} (challenge ${cur + 1})`, id: `${step.id}#${cur + 1}`, path: stepPath(m, step) }}
            />
          ) : (
            <Workbench
              key={`${step.id}#${cur}`}
              ex={challenges[cur]}
              progress={progress?.challenges[cur]}
              onChange={(patch) => patchChallenge(step.id, cur, patch)}
              onPass={(info) => onPass(cur, info)}
              report={{ kind: "Lesson step", title: `${m.title}: ${step.title} (challenge ${cur + 1})`, id: `${step.id}#${cur + 1}`, path: stepPath(m, step) }}
            />
          )}
          <div className="step-nav">
            {prev ? (
              <Link className="btn btn-ghost" to={prev}>
                <ArrowLeft className="icon" aria-hidden="true" /> Previous step
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link className="btn btn-ghost" to={next}>
                {done ? "Next step" : "Skip to the next step"} <ArrowRight className="icon" aria-hidden="true" />
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
