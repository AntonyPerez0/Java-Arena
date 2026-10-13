// /record/: a personal record of what this browser's progress says the learner finished: modules
// by part, projects, dates and totals, with a name the learner types (kept in settings, never sent
// anywhere). "Print or save as PDF" opens the browser's print dialog; the print styles (record.css)
// make the record itself a plain one- or two-page document. It says plainly what it is not.
import { useEffect, useId } from "react";
import { Link } from "react-router-dom";
import { Printer } from "lucide-react";
import { BrandMark } from "../components/Brand";
import { COURSE_NAMES, modules, plan, projects } from "../content";
import { NAME_MAX, RECORD_NOTICE, buildRecord, cleanName, isoDay, recordDate, type FinishedModule, type RecordPart } from "../lib/record";
import { patchSettings, useStore } from "../state/store";
import { useTitle } from "../lib/title";
import proProjects from "virtual:pro-track";
import { proRecord } from "../lib/pro";
import "../record.css";

function When({ at }: { at: number | null }) {
  return at == null ? <span className="record-nodate">date not saved</span> : <time dateTime={isoDay(at)}>{recordDate(at)}</time>;
}

/** "Part 3", or for the extra modules (no part), the numbers they have: "Modules 55 to 59". */
function partName(p: RecordPart) {
  if (p.part != null) return `Part ${p.part}`;
  const n = p.finished.map((m) => m.number);
  return n.length === 1 ? `Module ${n[0]}` : `Modules ${Math.min(...n)} to ${Math.max(...n)}`;
}

function PartBlock({ p }: { p: RecordPart }) {
  const id = useId();
  return (
    <section className="record-part" aria-labelledby={id}>
      <h4 id={id} className="record-part-h">
        <span>{partName(p)}</span>
        <span className="visually-hidden">, </span>
        <span className="record-part-state">
          {p.complete ? (
            <>
              finished <When at={p.doneAt} />
            </>
          ) : (
            `${p.finished.length} of ${p.total} modules`
          )}
        </span>
      </h4>
      <ul className="record-list">
        {p.finished.map((m: FinishedModule) => (
          <li key={m.id}>
            <span className="record-item">
              Module {m.number}: {m.title}
            </span>
            <span className="record-date">
              <When at={m.doneAt} />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Record() {
  useTitle("Your record");
  const s = useStore((x) => x);
  const typed = s.settings.name ?? "";
  const name = cleanName(typed);
  const r = buildRecord(s, plan, modules, projects);
  const t = r.totals;
  const shown = r.parts.filter((p) => p.finished.length > 0);
  // Pro Track projects with items the learner ticked: their own marks, never a result the site checked.
  const pro = proRecord(s.pro, proProjects);
  const nothing = t.modules === 0 && t.projects === 0 && pro.length === 0;
  const address = `${location.host}${import.meta.env.BASE_URL}`.replace(/\/$/, "");
  const today = Date.now();

  // While this page is open, printing prints the record only (record.css).
  useEffect(() => {
    document.documentElement.classList.add("record-print");
    return () => document.documentElement.classList.remove("record-print");
  }, []);

  const courses = (["I", "II", "extra"] as const).map((c) => ({ c, parts: shown.filter((p) => p.course === c) })).filter((x) => x.parts.length);

  return (
    <div className="narrow record-page">
      <div className="page-head record-screen">
        <h1 id="record-h">Your record</h1>
        <p className="muted">What you finished in Java Arena, from the progress saved in this browser. Print it or save it as a PDF to keep it.</p>
      </div>

      <section className="card record-controls record-screen" aria-label="Name and printing">
        <label htmlFor="record-name" className="record-label">
          Your name on the record (optional)
        </label>
        <input id="record-name" className="record-name-input" type="text" autoComplete="name" maxLength={NAME_MAX} value={typed} onChange={(e) => patchSettings({ name: e.target.value })} />
        <p className="small muted">Kept in this browser's settings with your progress. It's never sent anywhere.</p>
        <div className="actions">
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer className="icon" aria-hidden="true" /> Print or save as PDF
          </button>
        </div>
      </section>

      <article className="record-sheet" aria-labelledby="record-title">
        <header className="record-top">
          <span className="record-brand">
            <BrandMark />
            <span className="brand-name">
              Java <b>Arena</b>
            </span>
          </span>
          <span className="record-address">{address}</span>
        </header>
        <h2 id="record-title" className="record-title">
          Personal learning record
        </h2>
        {name ? <p className="record-who">{name}</p> : null}
        <p className="record-made">
          {/* The dates are when the listed items were finished; an item without a saved time has none, so "everything with a date". */}
          Made on <When at={today} />.
          {r.first != null && r.last != null ? (
            <>
              {" "}
              {isoDay(r.first) === isoDay(r.last) ? (
                <>
                  Everything with a date below was finished on <When at={r.first} />.
                </>
              ) : (
                <>
                  The finishing dates below run from <When at={r.first} /> to <When at={r.last} />.
                </>
              )}
            </>
          ) : null}
        </p>
        <p className="record-notice">{RECORD_NOTICE}</p>

        <h3 className="visually-hidden">Totals</h3>
        <dl className="record-totals">
          <div>
            <dt>Modules finished</dt>
            <dd>
              {t.modules} of {t.modulesTotal}
            </dd>
          </div>
          <div>
            <dt>Parts finished</dt>
            <dd>
              {t.parts} of {t.partsTotal}
            </dd>
          </div>
          {t.projectsTotal > 0 && (
            <div>
              <dt>Projects finished</dt>
              <dd>
                {t.projects} of {t.projectsTotal}
              </dd>
            </div>
          )}
          <div>
            <dt>Steps done</dt>
            <dd>
              {t.steps} of {t.stepsTotal}
            </dd>
          </div>
          <div>
            <dt>Challenges done</dt>
            <dd>
              {t.challenges} of {t.challengesTotal}
            </dd>
          </div>
        </dl>

        {nothing ? (
          <p className="record-empty">
            Nothing is finished yet in this browser. A module counts once every one of its steps is done.{" "}
            <Link to="/learn/" className="record-screen-inline">
              See the course
            </Link>
          </p>
        ) : (
          <>
            {courses.map(({ c, parts }) => (
              <section key={c} className="record-course" aria-label={`${COURSE_NAMES[c]}: modules finished`}>
                <h3 className="record-course-h">{COURSE_NAMES[c]}</h3>
                <div className="record-parts">
                  {parts.map((p) => (
                    <PartBlock key={`${p.course}-${p.part}`} p={p} />
                  ))}
                </div>
              </section>
            ))}
            {r.projects.length > 0 && (
              <section className="record-course" aria-labelledby="record-projects-h">
                <h3 id="record-projects-h" className="record-course-h">
                  Projects
                </h3>
                <ul className="record-list record-projects">
                  {r.projects.map((p) => (
                    <li key={p.id}>
                      <span className="record-item">{p.title}</span>
                      <span className="record-date">
                        <When at={p.doneAt} />
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {pro.length > 0 && (
              <section className="record-course" aria-labelledby="record-pro-h">
                <h3 id="record-pro-h" className="record-course-h">
                  Pro Track checklists
                </h3>
                <p className="record-pro-note">Projects made on your own computer. Java Arena can't see them or run their tests, so these are the checklist items you marked as done yourself.</p>
                <ul className="record-list record-pro">
                  {pro.map((p) => (
                    <li key={p.id}>
                      <span className="record-item">{p.title}</span>
                      <span className="record-date">{p.ticked === p.total ? `all ${p.total} items marked as done by you` : `${p.ticked} of ${p.total} items marked as done by you`}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
        <p className="record-foot">
          A module is finished when every one of its steps is done; its date is when the last step was. The course follows the order and topics of the University of Helsinki's Java Programming MOOC; Java Arena is not affiliated with or endorsed by the University of Helsinki.
        </p>
      </article>

      <p className="small muted record-screen">
        Anyone can change the progress saved in a browser, so this record shows only what this browser says. To move it to another device, use a transfer link or a progress file in <Link to="/settings/#your-progress">Settings</Link>.
      </p>
    </div>
  );
}
