import { Check, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { COURSE_NAMES, moduleById, modulePath, planByCourse } from "../content";
import { useStore } from "../state/store";
import { moduleProgress, nextStep } from "../state/derived";
import { stepPath } from "../content";
import { useTitle } from "../lib/title";

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
  const started = Object.keys(s.steps).length > 0;
  return (
    <div className="learn">
      <div className="page-head">
        <h1>The course</h1>
        <p className="muted">Java Arena follows the order and topics of the University of Helsinki's Java Programming MOOC, parts 1 to 14, with its own lessons and exercises. The site is being built in batches: modules that aren't written yet are listed so you can see what's coming.</p>
        {next && (
          <p>
            <Link className="btn btn-primary" to={stepPath(next.module, next.step)}>
              {started ? "Continue" : "Start"}: {next.step.title}
            </Link>
          </p>
        )}
      </div>
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
                        </span>
                        <span className="module-count">
                          <span aria-hidden="true">
                            {pr.done}/{pr.total} steps
                          </span>
                          <span className="visually-hidden">
                            , {pr.done} of {pr.total} steps done
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
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
