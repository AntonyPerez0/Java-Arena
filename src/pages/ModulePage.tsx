import { useEffect } from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { COURSE_NAMES, moduleById, modules, plan, prefetchModule, stepPath } from "../content";
import { useStore } from "../state/store";
import { challengeDone, moduleProgress } from "../state/derived";
import MoocCredit from "../components/MoocCredit";
import ExtraTag from "../components/ExtraTag";
import NotFound from "./NotFound";
import { useTitle } from "../lib/title";
import { finishedPart, isoDay, moduleFinished, recordDate } from "../lib/record";

/** The MOOC's last module (the end of Java Programming II): its page points on to the Pro Track. */
const COURSE_END = plan.filter((m) => m.course === "II").pop()?.id;

export default function ModulePage() {
  const { moduleId = "" } = useParams();
  const m = moduleById.get(moduleId);
  const s = useStore((x) => x);
  useTitle(m ? `Module ${m.number}: ${m.title}` : "Module not found");
  const next = m && (m.steps.find((st) => !s.steps[st.id]?.done) ?? m.steps[0]);
  // Fetch the step the main button opens, then the module's other steps, so opening one is instant.
  useEffect(() => (m && next ? prefetchModule(m.id, [next.slug]) : undefined), [m, next]);
  if (!m || !next) return <NotFound />;
  const pr = moduleProgress(s, m);
  const started = m.steps.some((st) => s.steps[st.id]);
  const fin = moduleFinished(s, m);
  const part = fin.done ? finishedPart(s, plan, modules, m.id) : null;
  return (
    <div className="module-page narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <span>{COURSE_NAMES[m.course]}{m.part != null ? `, part ${m.part}` : ""}</span>
      </nav>
      <div className="page-head">
        <div className="eyebrow">
          Module {m.number}
          <ExtraTag module={m} />
        </div>
        <h1>{m.title}</h1>
        <p className="lead">{m.summary}</p>
        <p className="muted small">
          {m.steps.length} steps, each with 3 challenges. {pr.done} of {pr.total} steps done.
        </p>
        {fin.done && (
          <p className="record-link">
            <Check className="icon" aria-hidden="true" />
            <span>
              You finished this module{fin.doneAt != null ? <> on <time dateTime={isoDay(fin.doneAt)}>{recordDate(fin.doneAt)}</time></> : null}
              {part != null ? `, and with it part ${part}` : ""}. <Link to="/record/">See your record</Link>
            </span>
          </p>
        )}
        <p>
          <Link className="btn btn-primary" to={stepPath(m, next)}>
            {pr.done === pr.total ? "Review" : started ? "Continue" : "Start"}: {next.title} <ArrowRight className="icon" aria-hidden="true" />
          </Link>
        </p>
      </div>
      <h2 className="h3">Steps</h2>
      <ol className="steplist">
        {m.steps.map((st, i) => {
          const sp = s.steps[st.id];
          const n = [...Array(st.challenges).keys()].filter((k) => challengeDone(sp, k)).length;
          return (
            <li key={st.id} className={sp?.done ? "done" : ""}>
              <Link to={stepPath(m, st)}>
                <span className="step-check" aria-hidden="true">
                  {sp?.done ? <Check className="icon" /> : i + 1}
                </span>
                <span className="step-title">
                  {st.title}
                  {sp?.done && <span className="visually-hidden"> (done)</span>}
                </span>
                <span className="kind-tag">
                  {n}/{st.challenges}
                  <span className="visually-hidden"> challenges done</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      {m.id === COURSE_END && (
        <section className="card course-end" aria-labelledby="course-end-h">
          <h2 id="course-end-h" className="h3">
            After the course
          </h2>
          <p>
            This is the last module of the MOOC. Next, you can go on with the extra modules, or try the Pro Track: projects for your own computer with a JDK 21, Maven and JUnit 5. <Link to="/pro/">See the Pro Track</Link>
          </p>
        </section>
      )}
      <MoocCredit module={m} />
    </div>
  );
}
