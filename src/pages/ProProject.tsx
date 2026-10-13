// /pro/<id>/: one Pro Track project: what it is and practices (with links to the modules), the
// download (the build's zip of pro-track/<id>/) and its folder on GitHub, the steps from its
// README, and the learner's own checklist, kept in progress (src/lib/pro.ts). Loaded with its own
// chunk (src/pages/editorPages.tsx), since it holds the projects' README text.
import { ChevronRight, Download, ExternalLink, ListChecks } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import proProjects from "virtual:pro-track";
import pages from "virtual:pro-track-pages";
import { moduleById, modulePath, plan } from "../content";
import { setProTick, useStore } from "../state/store";
import { useTitle } from "../lib/title";
import { PRO_PATH, ticked } from "../lib/pro";
import NotFound from "./NotFound";

/** A size in bytes as "4 KB" (at least 1 KB). */
const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))} KB`;

const SECTIONS: [keyof (typeof pages)[string]["sections"], string][] = [
  ["build", "What you'll build"],
  ["need", "What you need"],
  ["steps", "Steps"],
  ["tests", "Run the tests"],
  ["run", "Run the program"],
  ["github", "Put it on GitHub (optional)"],
];

export default function ProProject() {
  const { proId = "" } = useParams();
  const p = proProjects.find((x) => x.id === proId);
  const page = p ? pages[p.id] : undefined;
  const progress = useStore((s) => s.pro[proId]);
  useTitle(p ? `${p.title} · Pro Track` : "Project not found");
  if (!p || !page) return <NotFound />;
  const n = ticked(progress, page.checklist);
  const k = proProjects.indexOf(p);
  const next = proProjects[k + 1];
  return (
    <div className="pro-page pro-project narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <Link to={PRO_PATH}>Pro Track</Link>
      </nav>
      <div className="page-head">
        <p className="eyebrow">Pro Track project · about {p.hours} hours</p>
        <h1>{p.title}</h1>
        <p className="lead" dangerouslySetInnerHTML={{ __html: page.summaryHtml }} />
        <p className="actions">
          <a className="btn btn-primary" href={import.meta.env.BASE_URL + page.zip.file} download={`${p.id}.zip`}>
            <Download className="icon" aria-hidden="true" /> Download the project (zip, {kb(page.zip.bytes)})
          </a>
          <a className="btn" href={page.folder} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="icon" aria-hidden="true" /> The folder on GitHub<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          {/* The checklist is at the end, after the whole README: this jumps there (a phone page is many screens long). */}
          <a className="btn" href="#checklist">
            <ListChecks className="icon" aria-hidden="true" /> Your checklist ({n} of {page.checklist.length} ticked)
          </a>
        </p>
        <p className="muted small">Unzip it on your computer and open its README.md. The zip isn't saved for offline use, so downloading it needs a connection. New to Maven? The <Link to={PRO_PATH}>Pro Track page</Link> shows how to set up your computer.</p>
      </div>

      <section aria-labelledby="pro-practices-h">
        <h2 id="pro-practices-h">What it practices</h2>
        <ul className="pro-practices">
          {page.practices.map((x) => {
            const pm = plan.find((m) => m.id === x.module);
            const live = moduleById.get(x.module);
            const name = pm ? `module ${pm.number}: ${pm.title}` : x.module;
            return (
              <li key={x.module + x.what}>
                {x.what} (from {live ? <Link to={modulePath(live)}>{name}</Link> : name})
              </li>
            );
          })}
        </ul>
      </section>

      {SECTIONS.map(([key, heading]) =>
        page.sections[key] ? (
          <section key={key} aria-labelledby={`pro-${key}-h`}>
            <h2 id={`pro-${key}-h`}>{heading}</h2>
            <div className="md" dangerouslySetInnerHTML={{ __html: page.sections[key] }} />
          </section>
        ) : null,
      )}

      <section className="card pro-checklist" aria-labelledby="checklist">
        <h2 id="checklist" className="h3">
          Your checklist
        </h2>
        <p className="small muted">
          Tick what you've done. It's saved in this browser with your progress and travels in transfer links and progress files. Nobody checks it: these are your own marks, and the record page shows them as marked as done by you.
        </p>
        <ul className="pro-items">
          {page.checklist.map((c) => {
            const id = `pro-item-${p.id}-${c.id}`;
            return (
              <li key={c.id}>
                <input id={id} type="checkbox" checked={!!progress?.items[c.id]?.done} onChange={(e) => setProTick(p.id, c.id, e.target.checked)} />
                <label htmlFor={id} dangerouslySetInnerHTML={{ __html: c.html }} />
              </li>
            );
          })}
        </ul>
        <p className="small" aria-live="polite">
          {n} of {page.checklist.length} marked as done.
        </p>
      </section>

      <nav className="step-nav pro-nav" aria-label="Pro Track">
        <Link to={PRO_PATH}>All Pro Track projects</Link>
        {next && <Link to={`/pro/${next.id}/`}>Next: {next.title}</Link>}
      </nav>
    </div>
  );
}
