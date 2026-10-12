import { Check, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { projectPath, projects } from "../content";
import { useStore } from "../state/store";
import { useTitle } from "../lib/title";
import AfterModule from "../components/AfterModule";

/** The projects: larger programs built over several milestones, each after the modules it needs. */
export default function Projects() {
  useTitle("Projects");
  const progress = useStore((s) => s.projects);
  return (
    <div className="projects-page narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <span>Projects</span>
      </nav>
      <div className="page-head">
        <h1>Projects</h1>
        <p className="lead">Larger programs, built one milestone at a time. Each milestone starts from your own code of the one before it, so at the end you have one whole program that you wrote.</p>
        <p className="muted small">Each project comes after the modules whose topics it needs. Its milestones are checked like the lessons' challenges, with hints and a solution when you're stuck.</p>
      </div>
      {projects.length === 0 ? (
        <p className="card">No projects yet. They're on their way.</p>
      ) : (
        <ul className="project-list">
          {projects.map((p) => {
            const pr = progress[p.id];
            const done = p.milestones.filter((m) => pr?.milestones[m.id]?.done).length;
            return (
              <li key={p.id} className={"card project-card" + (pr?.done ? " done" : "")}>
                <h2 className="h3">
                  <Link to={projectPath(p)}>{p.title}</Link>
                  {pr?.done && (
                    <span className="done-chip">
                      <Check className="icon" aria-hidden="true" /> done
                    </span>
                  )}
                </h2>
                <p className="project-after muted small">
                  <AfterModule p={p} />
                </p>
                <p>{p.summary}</p>
                <p className="muted small">
                  {p.milestones.length} milestones, {done} done
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
