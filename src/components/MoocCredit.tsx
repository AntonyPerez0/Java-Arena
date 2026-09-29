import { Link } from "react-router-dom";
import type { MoocSection } from "../content/types";
import { MOOC_LICENSE_URL, MOOC_URL } from "../lib/site";

const ext = <span className="visually-hidden"> (opens in a new tab)</span>;

/** Which MOOC sections a module follows, with the attribution the CC BY-NC-SA license asks for. */
export default function MoocCredit({ module: m, compact }: { module: { mooc: MoocSection[]; course: string }; compact?: boolean }) {
  if (m.course === "extra" || m.mooc.length === 0) {
    return (
      <aside className="credit" aria-label="About this module">
        <p>This is an extra module: it is not part of the University of Helsinki's course. Lesson text: <a href={MOOC_LICENSE_URL} target="_blank" rel="noopener noreferrer license">CC BY-NC-SA 4.0{ext}</a>.</p>
      </aside>
    );
  }
  const sections = m.mooc.map((s, i) => (
    <span key={s.section}>
      {i > 0 && (i === m.mooc.length - 1 ? " and " : ", ")}
      <a href={MOOC_URL + s.path} target="_blank" rel="noopener noreferrer">
        {s.section} {s.title}
        {ext}
      </a>
      {s.portion ? ` (${s.portion})` : ""}
    </span>
  ));
  return (
    <aside className={"credit" + (compact ? " credit-compact" : "")} aria-label="Credits">
      <p>
        This module follows {m.mooc.length > 1 ? "sections" : "section"} {sections} of{" "}
        <a href={MOOC_URL} target="_blank" rel="noopener noreferrer">
          Java Programming{ext}
        </a>{" "}
        by the University of Helsinki (Agile Education Research group), licensed under{" "}
        <a href={MOOC_LICENSE_URL} target="_blank" rel="noopener noreferrer license">
          CC BY-NC-SA 4.0{ext}
        </a>
        . The explanations and exercises here are written for Java Arena and shared under the same license. Java Arena is not affiliated with the University of Helsinki. <Link to="/about">More about credits</Link>
      </p>
    </aside>
  );
}
