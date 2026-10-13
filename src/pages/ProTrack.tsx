// /pro/: the Pro Track, projects for the learner's own computer (JDK 21, Maven, JUnit 5, and their
// own GitHub repository if they like). The page's guide is src/lib/pro-guide.ts; the projects come
// from the build (virtual:pro-track).
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import proProjects from "virtual:pro-track";
import { useStore } from "../state/store";
import { useTitle } from "../lib/title";
import { proPath, ticked } from "../lib/pro";
import { PRO_GUIDE_HTML, PRO_HONEST, PRO_LEAD } from "../lib/pro-guide";

export default function ProTrack() {
  useTitle("Pro Track");
  const pro = useStore((s) => s.pro);
  return (
    <div className="pro-page narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <span>Pro Track</span>
      </nav>
      <div className="page-head">
        <h1>Pro Track</h1>
        <p className="lead">{PRO_LEAD}</p>
        <p className="pro-honest">{PRO_HONEST}</p>
      </div>
      <section aria-labelledby="pro-projects-h">
        <h2 id="pro-projects-h">The projects</h2>
        {proProjects.length === 0 ? (
          <p className="card">The projects are on their way.</p>
        ) : (
          <ul className="project-list pro-list">
            {proProjects.map((p) => {
              const n = ticked(pro[p.id], p.checklist);
              return (
                <li key={p.id} className="card project-card">
                  <h3 className="h3">
                    <Link to={proPath(p)}>{p.title}</Link>
                  </h3>
                  <p>{p.summary}</p>
                  <p className="muted small">
                    About {p.hours} hours. {n > 0 ? `${n} of ${p.checklist.length} checklist items marked as done by you.` : `A checklist of ${p.checklist.length} items to tick as you go.`}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <div className="md pro-guide" dangerouslySetInnerHTML={{ __html: PRO_GUIDE_HTML }} />
    </div>
  );
}
