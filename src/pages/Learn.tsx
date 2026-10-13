import { useEffect } from "react";
import { Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { COURSE_NAMES, moduleById, modulePath, modules, plan, planByCourse, projects } from "../content";
import { useStore } from "../state/store";
import { moduleProgress, nextStep } from "../state/derived";
import { prefetchStep, stepPath } from "../content";
import { useTitle } from "../lib/title";
import { loadStepPage } from "./editorPages";
import ExtraTag from "../components/ExtraTag";
import { moduleFinished } from "../lib/record";
import type { PlannedModule } from "../content/types";
import type { State } from "../state/store";

/** Every module of a part is written and finished (the end of the part then links to the record). */
const partDone = (s: State, part: PlannedModule[]) =>
  part.every((pm) => {
    const m = moduleById.get(pm.id);
    return !!m && moduleFinished(s, m).done;
  });

const COURSE_NOTES: Record<string, string> = {
  I: "Parts 1 to 7 of the MOOC: the basics of programming, up to classes, objects and larger programs.",
  II: "Parts 8 to 14 of the MOOC: hash maps, inheritance, interfaces, streams, exceptions, generics, and graphical programs.",
  extra: "Newer Java features and topics the MOOC doesn't cover. Optional, for after the course.",
};

export default function Learn() {
  useTitle("All modules");
  const s = useStore((x) => x);
  const next = nextStep(s);
  const courses = planByCourse();
  const allLive = modules.length === plan.length;
  const started = Object.keys(s.steps).length > 0;
  // Fetch the lesson the Continue button opens, so it shows at once.
  useEffect(() => (next ? prefetchStep(next.module.id, next.step.slug, loadStepPage) : undefined), [next?.module.id, next?.step.slug]);
  return (
    <div className="learn">
      <div className="page-head">
        <h1>The course</h1>
        <p className="muted">Java Arena follows the order and topics of the University of Helsinki's Java Programming MOOC, parts 1 to 14, with its own lessons and exercises.{allLive ? "" : " The site is being built in batches: modules that aren't written yet are listed so you can see what's coming."}</p>
        {next && (
          <p className="actions">
            <Link className="btn btn-primary" to={stepPath(next.module, next.step)}>
              {started ? "Continue" : "Start"}: {next.step.title}
            </Link>
            {!started && (
              <Link className="btn" to="/placement/">
                Already know some Java? Placement quiz
              </Link>
            )}
          </p>
        )}
      </div>
      <section className="card learn-projects" aria-labelledby="projects-h">
        <h2 id="projects-h" className="h3">
          Projects
        </h2>
        <p>
          {projects.length
            ? `${projects.length === 1 ? "One larger program" : `${projects.length} larger programs`} to build over several milestones, each after the modules it needs.`
            : "Larger programs to build over several milestones, each after the modules it needs, are on their way."}{" "}
          <Link to="/projects/">See the projects</Link>
        </p>
      </section>
      <section className="card learn-projects" aria-labelledby="pro-h">
        <h2 id="pro-h" className="h3">
          Pro Track
        </h2>
        <p>
          Projects for your own computer, for after the course: a JDK 21, Maven and JUnit 5 tests, and your own GitHub repository if you like. <Link to="/pro/">See the Pro Track</Link>
        </p>
      </section>
      <section className="card learn-projects" aria-labelledby="topics-h">
        <h2 id="topics-h" className="h3">
          Topics A to Z
        </h2>
        <p>
          Looking for one thing, such as <code>switch</code>, <code>HashMap</code> or recursion? Each topic has one line and links to the steps that teach it. <Link to="/topics/">See the topics</Link>
        </p>
      </section>
      {courses.map((c) => (
        <section key={c.course} className="phase" aria-labelledby={`course-${c.course}`}>
          <h2 id={`course-${c.course}`} className="course-title">
            {COURSE_NAMES[c.course]}
          </h2>
          <p className="muted small">{COURSE_NOTES[c.course]}</p>
          {c.parts.map((p) => (
            <div key={String(p.part)} className="part">
              {p.part != null && <h3 className="phase-title">Part {p.part}</h3>}
              <ol className="modules">
                {p.modules.map((pm) => {
                  const m = moduleById.get(pm.id);
                  if (!m)
                    return (
                      <li key={pm.id} className="module module-planned">
                        <span className="module-num" aria-hidden="true">
                          {pm.number}
                        </span>
                        <span className="module-title">
                          <span className="visually-hidden">Module {pm.number}: </span>
                          {pm.title}
                          <ExtraTag module={pm} />
                        </span>
                        <span className="module-count">
                          <Lock className="icon" aria-hidden="true" /> not written yet
                        </span>
                      </li>
                    );
                  const pr = moduleProgress(s, m);
                  const complete = pr.done === pr.total;
                  return (
                    <li key={pm.id} className={"module module-live" + (complete ? " module-done" : "")}>
                      <Link to={modulePath(m)} className="module-link">
                        <span className="module-num" aria-hidden="true">
                          {complete ? <Check className="icon" /> : pm.number}
                        </span>
                        <span className="module-title">
                          <span className="visually-hidden">Module {pm.number}: </span>
                          {m.title}
                          <ExtraTag module={pm} />
                        </span>
                        <span className="module-count">
                          <span aria-hidden="true">
                            {pr.done}/{pr.total} steps{s.placed.includes(m.id) && !complete ? " · skipped" : ""}
                          </span>
                          <span className="visually-hidden">
                            , {pr.done} of {pr.total} steps done{s.placed.includes(m.id) && !complete ? ", skipped after the placement quiz" : ""}
                          </span>
                        </span>
                        <span className="bar module-bar" aria-hidden="true">
                          <span style={{ width: `${(pr.done / Math.max(pr.total, 1)) * 100}%` }} />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
              {partDone(s, p.modules) && (
                <p className="record-link">
                  <Check className="icon" aria-hidden="true" />
                  <span>
                    {p.part != null ? `Part ${p.part} finished.` : "Every extra module finished."} <Link to="/record/">See your record</Link>
                  </span>
                </p>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
