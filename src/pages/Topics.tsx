// /topics/: the topics reference, Java's keywords, classes, methods and ideas A to Z, each with one
// line and links to the steps that teach it (content/topics.yaml, checked by the content build).
// The whole list is in the pre-rendered page (scripts/prerender.mjs); the search box filters it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import raw from "../generated/topics.json";
import { moduleById, stepPath } from "../content";
import { useTitle } from "../lib/title";
import { JAVA_API_URL, KIND_LABEL, TOPICS_LEAD, aboutParts, filterTopics, matchCount, topicLetter, type Topic } from "../lib/topics";

const topics = raw as unknown as Topic[];

function About({ text }: { text: string }) {
  return (
    <>
      {aboutParts(text).map((part, i) => (i % 2 ? <code key={i}>{part}</code> : part))}
    </>
  );
}

function Entry({ t }: { t: Topic }) {
  return (
    <li id={t.id} className="topic">
      <div className="topic-head">
        <h3 className="topic-term">{t.kind === "idea" || t.kind === "tool" ? t.term : <code>{t.term}</code>}</h3>
        <span className="topic-kind">{KIND_LABEL[t.kind]}</span>
      </div>
      <p className="topic-about">
        <About text={t.about} />
      </p>
      <ul className="topic-links" aria-label={`Where to learn ${t.term}`}>
        {t.steps.map((s) => (
          <li key={s.id}>
            <Link to={stepPath({ id: s.module }, s)}>{s.title}</Link> <span className="muted">(module {moduleById.get(s.module)?.number}, {s.moduleTitle})</span>
          </li>
        ))}
        {t.drills && (
          <li>
            <Link to={`/deathmatch/?topic=${encodeURIComponent(t.drills.topic)}`}>Drills in Deathmatch</Link> <span className="muted">(topic: {t.drills.title})</span>
          </li>
        )}
      </ul>
    </li>
  );
}

export default function Topics() {
  useTitle("Topics A to Z");
  // On a page loaded at /topics/, the pre-rendered search box works before the app starts, and the
  // app replaces it. Read what was typed there, and whether it had the focus, while the app renders
  // (its first render comes before the pre-rendered page is replaced); elsewhere there's no such box.
  // Otherwise the search comes from the address (?q=map), which keeps it as you type: so Back from a
  // step you looked up brings the same search, and the same list, again.
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(() => (document.getElementById("topics-q") as HTMLInputElement | null)?.value || params.get("q") || "");
  const search = (q: string) => {
    setQuery(q);
    // replace: typing doesn't add a history entry for each letter. The #part goes, as a search hides the letters.
    setParams(q ? { q } : {}, { replace: true, preventScrollReset: true });
  };
  // A search typed in the pre-rendered box before the app started goes into the address too.
  useEffect(() => {
    if (query && params.get("q") !== query) setParams({ q: query }, { replace: true, preventScrollReset: true });
    // Only once, at the start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [early] = useState(() => {
    const box = document.activeElement;
    return box instanceof HTMLInputElement && box.id === "topics-q" ? { start: box.selectionStart, end: box.selectionEnd } : null;
  });
  const box = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!early || !box.current) return;
    box.current.focus({ preventScroll: true });
    if (early.start != null && early.end != null) box.current.setSelectionRange(early.start, early.end);
  }, [early]);
  const shown = useMemo(() => filterTopics(topics, query), [query]);
  const letters = useMemo(() => {
    const groups: [string, Topic[]][] = [];
    for (const t of topics) {
      const l = topicLetter(t.term);
      if (groups.length && groups[groups.length - 1][0] === l) groups[groups.length - 1][1].push(t);
      else groups.push([l, [t]]);
    }
    return groups;
  }, []);
  // An address with #for opens at that entry (the app's start scrolls to the top first), also when
  // only the address's #part changes: the search is cleared so that every entry is there.
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!id) return;
      setQuery("");
      // And out of the address, so that it and the box agree (keeping React Router's history state).
      if (new URLSearchParams(location.search).has("q")) history.replaceState(history.state, "", location.pathname + location.hash);
      requestAnimationFrame(() => requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView()));
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  const searching = query.trim() !== "";
  return (
    <div className="topics-page narrow">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/learn/">Learn</Link> <ChevronRight className="icon" aria-hidden="true" /> <span>Topics A to Z</span>
      </nav>
      <div className="page-head">
        <h1>Topics A to Z</h1>
        <p className="lead">
          {TOPICS_LEAD}{" "}
          <a href={JAVA_API_URL} target="_blank" rel="noopener noreferrer">
            Java 21's API documentation<span className="visually-hidden"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </div>
      <div className="topics-search" role="search">
        <label htmlFor="topics-q">Search the topics</label>
        <input ref={box} id="topics-q" type="search" value={query} onChange={(e) => search(e.target.value)} autoComplete="off" spellCheck={false} aria-describedby="topics-count" />
        <p id="topics-count" className="muted small" role="status">
          {matchCount(shown.length, topics.length, query)}
        </p>
      </div>
      {searching ? (
        <section aria-labelledby="topics-results">
          <h2 id="topics-results" className="visually-hidden">
            Search results
          </h2>
          {shown.length > 0 && (
            <ul className="topic-list">
              {shown.map((t) => (
                <Entry key={t.id} t={t} />
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          <nav className="topics-letters" aria-label="Letters">
            <ul>
              {letters.map(([l]) => (
                <li key={l}>
                  <a href={`#letter-${l === "#" ? "symbols" : l}`} aria-label={l === "#" ? "Operators and symbols" : undefined}>
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          {letters.map(([l, list]) => (
            <section key={l} aria-labelledby={`letter-${l === "#" ? "symbols" : l}`}>
              <h2 id={`letter-${l === "#" ? "symbols" : l}`} className="topics-letter">
                {l === "#" ? "Operators and symbols" : l}
              </h2>
              <ul className="topic-list">
                {list.map((t) => (
                  <Entry key={t.id} t={t} />
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}
