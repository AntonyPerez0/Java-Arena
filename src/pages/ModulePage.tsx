import { useEffect } from "react";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { COURSE_NAMES, loadStep, moduleById, stepPath } from "../content";
import { useStore } from "../state/store";
import { challengeDone, moduleProgress } from "../state/derived";
import MoocCredit from "../components/MoocCredit";
import NotFound from "./NotFound";
import { useTitle } from "../lib/title";

export default function ModulePage() {
  const { moduleId = "" } = useParams();
  const m = moduleById.get(moduleId);
  const s = useStore((x) => x);
  useTitle(m ? `Module ${m.number}: ${m.title}` : "Module not found");
  const next = m && (m.steps.find((st) => !s.steps[st.id]?.done) ?? m.steps[0]);
  // Fetch the step the main button opens, so opening it is instant.
  useEffect(() => {
    if (m && next) loadStep(m.id, next.slug).catch(() => {});
  }, [m, next]);
  if (!m || !next) return <NotFound />;
  const pr = moduleProgress(s, m);
  const started = m.steps.some((st) => s.steps[st.id]);
  return (
    <div className="module-page narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <span>{COURSE_NAMES[m.course]}{m.part != null ? `, part ${m.part}` : ""}</span>
      </nav>
      <div className="page-head">
        <div className="eyebrow">Module {m.number}</div>
        <h1>{m.title}</h1>
        <p className="lead">{m.summary}</p>
        <p className="muted small">
          {m.steps.length} steps, each with 3 challenges. {pr.done} of {pr.total} steps done.
        </p>
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
      <MoocCredit module={m} />
    </div>
  );
}
