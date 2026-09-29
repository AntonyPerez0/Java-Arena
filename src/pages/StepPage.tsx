import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { challengesOf, moduleById, modulePath, stepPath, useModule } from "../content";
import type { Module, Step } from "../content/types";
import { getState, patchChallenge, patchStep, useStore } from "../state/store";
import { challengeDone } from "../state/derived";
import Markdown from "../components/Markdown";
import Workbench from "../components/Workbench";
import TaskCard from "../components/TaskCard";
import MoocCredit from "../components/MoocCredit";
import NotFound from "./NotFound";
import { useTitle } from "../lib/title";

export default function StepPage() {
  const { moduleId = "", stepSlug = "" } = useParams();
  const summary = moduleById.get(moduleId);
  const stepSummary = summary?.steps.find((s) => s.slug === stepSlug);
  const full = useModule(moduleId);
  useTitle(summary && stepSummary ? `${stepSummary.title} · ${summary.title}` : "Step not found");
  if (!summary || !stepSummary || full === null) return <NotFound />;
  if (full === undefined || full === "error")
    return (
      <div className="narrow">
        <h1>{stepSummary.title}</h1>
        {full === "error" ? (
          <p role="alert">
            This lesson couldn't be loaded. Check the connection and <button type="button" className="linkish" onClick={() => location.reload()}>reload the page</button>.
          </p>
        ) : (
          <p className="muted">Loading the lesson…</p>
        )}
      </div>
    );
  const step = full.steps.find((s) => s.slug === stepSlug);
  if (!step) return <NotFound />;
  return <StepView key={step.id} m={full} step={step} />;
}

function StepView({ m, step }: { m: Module; step: Step }) {
  const nav = useNavigate();
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
      if (open >= 0) {
        setBanner({ text: `Challenge ${k + 1} of ${challenges.length} complete`, next: after >= 0 ? after : open });
        return;
      }
      if (now?.done) {
        setBanner({ text: "All challenges of this step complete", next: null });
        return;
      }
      // Clean: no hints and no solution on any of the step's challenges.
      const clean = hintsUsed === 0 && !sawSolution && Object.values(now?.challenges ?? {}).every((c) => c.hintsUsed === 0 && !c.sawSolution);
      patchStep(step.id, { done: true, doneAt: Date.now(), clean });
      const moduleDone = m.steps.every((st) => getState().steps[st.id]?.done);
      setBanner({ text: moduleDone ? `Module complete: ${m.title}` : "Step complete", next: null });
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
        <Link to="/learn">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <Link to={modulePath(m)}>{`Module ${m.number}: ${m.title}`}</Link>
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
          <h1>{step.title}</h1>
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
                <Link className="btn btn-primary" to="/learn" autoFocus>
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
          <Workbench
            key={`${step.id}#${cur}`}
            ex={challenges[cur]}
            progress={progress?.challenges[cur]}
            onChange={(patch) => patchChallenge(step.id, cur, patch)}
            onPass={(info) => onPass(cur, info)}
            report={{ kind: "Lesson step", title: `${m.title}: ${step.title} (challenge ${cur + 1})`, id: `${step.id}#${cur + 1}`, path: stepPath(m, step) }}
          />
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
