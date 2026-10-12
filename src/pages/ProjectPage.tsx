import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, ChevronRight, Lock } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { projectAfter, projectById, useProject } from "../content";
import type { Project, ProjectSummary } from "../content/types";
import { getState, patchMilestone, patchProject, useStore } from "../state/store";
import { firstMilestone, milestoneOpen, startCode } from "../lib/projects";
import Markdown from "../components/Markdown";
import Workbench from "../components/Workbench";
import TaskCard from "../components/TaskCard";
import AfterModule from "../components/AfterModule";
import NotFound from "./NotFound";
import { useTitle } from "../lib/title";
import { isoDay, recordDate } from "../lib/record";

export default function ProjectPage() {
  const { projectId = "" } = useParams();
  const summary = projectById.get(projectId);
  const { project, waited } = useProject(projectId);
  useTitle(summary ? `${summary.title} · Projects` : "Project not found");
  if (!summary || project === null) return <NotFound />;
  if (project === undefined || project === "error" || project === "gone") {
    return (
      <div className="narrow">
        <h1 tabIndex={-1}>{summary.title}</h1>
        {project === "gone" ? (
          <p role="alert">
            Java Arena has been updated since this page was opened.{" "}
            <button type="button" className="linkish" onClick={() => location.reload()}>
              Reload the page
            </button>{" "}
            to get this project.
          </p>
        ) : project === "error" ? (
          <p role="alert">
            This project couldn't be loaded. Check the connection and{" "}
            <button type="button" className="linkish" onClick={() => location.reload()}>
              reload the page
            </button>
            .
          </p>
        ) : (
          <p className="muted">Loading the project…</p>
        )}
      </div>
    );
  }
  return <ProjectView key={project.id} summary={summary} project={project} takeFocus={waited} />;
}

function ProjectView({ summary, project, takeFocus }: { summary: ProjectSummary; project: Project; takeFocus: boolean }) {
  const h1Ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (takeFocus && (document.activeElement === document.body || !document.activeElement)) h1Ref.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const ms = project.milestones;
  const progress = useStore((s) => s.projects[project.id]);
  const [cur, setCur] = useState(() => firstMilestone(ms, getState().projects[project.id]));
  const curRef = useRef(cur);
  curRef.current = cur;
  // Bumped when the editor's code is replaced from outside it (the model solution), so it starts again.
  const [version, setVersion] = useState(0);
  const [banner, setBanner] = useState<{ text: string; next: number | null; record?: boolean } | null>(null);
  const m = ms[cur];
  const mp = progress?.milestones[m.id];
  // The code this milestone starts from (the editor shows the learner's saved code once there is some).
  const start = useMemo(() => startCode(ms, progress, cur), [ms, progress, cur]);
  const ex = useMemo(() => ({ ...m, seed: start.code }), [m, start.code]);
  const prevSaw = cur > 0 && !!progress?.milestones[ms[cur - 1].id]?.sawSolution;

  const goMilestone = (k: number) => {
    setCur(k);
    setBanner(null);
    requestAnimationFrame(() => document.getElementById("task-h")?.focus());
  };

  const onPass = useCallback(
    (k: number, passed: string) => {
      const id = ms[k].id;
      // The code that was graded is what the next milestone starts from. Not the stored code: the
      // learner may have typed on while the check ran, and that text never passed.
      patchMilestone(project.id, id, { done: true, passed });
      const now = getState().projects[project.id];
      const all = ms.every((x) => now?.milestones[x.id]?.done);
      if (all && !now?.done) patchProject(project.id, { done: true, doneAt: Date.now() });
      if (curRef.current !== k) return;
      if (all) setBanner({ text: `Project complete: ${project.title}`, next: null, record: true });
      else {
        const next = ms.findIndex((x, i) => i > k && !now?.milestones[x.id]?.done);
        setBanner({ text: `Milestone ${k + 1} of ${ms.length} complete`, next: next >= 0 ? next : ms.findIndex((x) => !now?.milestones[x.id]?.done) });
      }
    },
    [ms, project],
  );

  const useModel = () => {
    const have = getState().projects[project.id]?.milestones[m.id]?.code;
    if (have != null && have !== m.seed && !confirm(`Replace your code in this milestone with the model solution of milestone ${cur}? Your changes here will be lost.`)) return;
    patchMilestone(project.id, m.id, { code: m.seed });
    setVersion((v) => v + 1);
  };

  const after = projectAfter(project);
  return (
    <div className="step-page project-page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <Link to="/projects/">Projects</Link>
      </nav>
      <div className="step-grid">
        <article className="step-text">
          <div className="step-count">
            {/* One inline run of text, so on a phone it wraps like a sentence (as flex items, "Project · After" and the link were two narrow columns). */}
            <span className="project-label">Project{after ? <> · <AfterModule p={project} /></> : null}</span>
            {progress?.done && (
              <span className="done-chip">
                <Check className="icon" aria-hidden="true" /> done
              </span>
            )}
          </div>
          <h1 ref={h1Ref} tabIndex={-1}>
            {summary.title}
          </h1>
          {progress?.done && (
            <p className="record-link">
              <Check className="icon" aria-hidden="true" />
              <span>
                You finished this project{progress.doneAt != null ? <> on <time dateTime={isoDay(progress.doneAt)}>{recordDate(progress.doneAt)}</time></> : null}. <Link to="/record/">See your record</Link>
              </span>
            </p>
          )}
          <Markdown text={project.intro} top={2} />
          <h2 className="h3">Milestones</h2>
          <p className="muted small">Each milestone starts from your code of the one before it, so you build one program. A milestone opens when the one before it passes, or after you look at that one's solution.</p>
          <ol className="milestones">
            {ms.map((x, i) => {
              const done = !!progress?.milestones[x.id]?.done;
              const open = milestoneOpen(ms, progress, i);
              const state = done ? "done" : open ? "open" : "locked";
              return (
                <li key={x.id} className={`milestone milestone-${state}${i === cur ? " milestone-cur" : ""}`}>
                  {open ? (
                    <button type="button" onClick={() => goMilestone(i)} aria-current={i === cur ? "step" : undefined}>
                      <span className="step-check" aria-hidden="true">
                        {done ? <Check className="icon" /> : i + 1}
                      </span>
                      <span className="step-title">
                        <span className="visually-hidden">Milestone {i + 1}: </span>
                        {x.title}
                      </span>
                      <span className="kind-tag">{done ? "done" : "open"}</span>
                    </button>
                  ) : (
                    <span className="milestone-locked-row">
                      <span className="step-check" aria-hidden="true">
                        <Lock className="icon" />
                      </span>
                      <span className="step-title">
                        <span className="visually-hidden">Milestone {i + 1}: </span>
                        {x.title}
                      </span>
                      <span className="kind-tag">locked</span>
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </article>
        <section className="step-work" aria-label="Milestone">
          {banner && (
            <div className="banner banner-pass big">
              <span>
                <Check className="icon" aria-hidden="true" /> {banner.text}
                {banner.record ? (
                  <>
                    {" · "}
                    <Link to="/record/">See your record</Link>
                  </>
                ) : null}
              </span>
              {banner.next != null && banner.next >= 0 ? (
                <button type="button" className="btn btn-primary" onClick={() => goMilestone(banner.next!)} autoFocus>
                  Next milestone <ArrowRight className="icon" aria-hidden="true" />
                </button>
              ) : (
                <Link className="btn btn-primary" to="/projects/" autoFocus>
                  All projects
                </Link>
              )}
            </div>
          )}
          <h2 className="milestone-title" id="milestone-h">
            Milestone {cur + 1}: {m.title}
          </h2>
          {cur > 0 && !mp?.code && start.from === "own" && <p className="milestone-note">You haven't passed milestone {cur} yet, so this milestone starts from your own code of it.</p>}
          {cur > 0 && !mp?.code && start.from === "model" && <p className="milestone-note">This milestone starts from the model solution of milestone {cur}.</p>}
          {Object.keys(m.files ?? {}).length > 0 && !mp?.code && (
            <p className="milestone-note">
              This milestone adds {Object.keys(m.files ?? {}).length === 1 ? "the file" : "the files"} {Object.keys(m.files ?? {}).join(" and ")} to your program.
            </p>
          )}
          {prevSaw && (
            <p>
              <button type="button" className="btn btn-sm" onClick={useModel}>
                Start from the model solution of milestone {cur}
              </button>
            </p>
          )}
          <TaskCard ex={ex} task={m.task} index={cur} total={ms.length} label="Milestone" />
          <Workbench
            key={`${m.id}#${version}`}
            ex={ex}
            progress={mp}
            onChange={(patch) => patchMilestone(project.id, m.id, patch)}
            onPass={(info) => onPass(cur, info.code)}
            report={{ kind: "Project milestone", title: `${project.title}: ${m.title} (milestone ${cur + 1})`, id: `${project.id}#${m.id}`, path: `/projects/${project.id}/` }}
          />
        </section>
      </div>
    </div>
  );
}
