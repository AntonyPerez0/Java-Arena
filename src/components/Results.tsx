import { useState } from "react";
import { Check, CircleCheck, CircleX, X } from "lucide-react";
import type { FriendlyDiagnostic, GradeResult } from "../grader/grade";
import { InlineMd } from "./Markdown";
import InputText from "./InputText";

/** javac's errors, each with its line and a plain-English explanation, then the full output on request. */
export function DiagnosticList({ diagnostics, raw }: { diagnostics: FriendlyDiagnostic[]; raw: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const errors = diagnostics.filter((d) => d.kind === "error");
  const shown = (errors.length ? errors : diagnostics.filter((d) => d.kind !== "note")).slice(0, 4);
  const more = (errors.length || diagnostics.length) - shown.length;
  // With several files, each message says which one it's about.
  const fileOf = (d: FriendlyDiagnostic) => d.file.split("/").pop() ?? "";
  const named = diagnostics.some((d) => d.line > 0 && fileOf(d) !== "Main.java");
  return (
    <div className="diags">
      {shown.map((d, i) => (
        <div key={i} className={"diag diag-" + d.kind}>
          <div className="diag-head">
            <span className="diag-sev">{d.kind}</span>
            {d.line > 0 && (
              <span className="diag-line">
                {named ? `${fileOf(d)}, ` : ""}line {d.line}
              </span>
            )}
          </div>
          <code className="diag-msg">{d.message}</code>
          {d.friendly && (
            <p className="diag-friendly">
              <InlineMd text={d.friendly} />
            </p>
          )}
        </div>
      ))}
      {more > 0 && <p className="muted small">and {more} more. Fixing the first error often makes later ones go away.</p>}
      {raw && (
        <button type="button" className="linkish" aria-expanded={showRaw} onClick={() => setShowRaw(!showRaw)}>
          {showRaw ? "Hide" : "Show"} what javac printed
        </button>
      )}
      {showRaw && (
        <pre tabIndex={0} className="console small">
          {raw}
        </pre>
      )}
    </div>
  );
}

function Shown({ s }: { s: string }) {
  if (s === "") return <em className="muted">(nothing)</em>;
  return <>{s}</>;
}

export default function Results({ result }: { result: GradeResult }) {
  const warnings = result.diagnostics.filter((d) => d.kind === "warning");
  return (
    <div className="results">
      {result.status === "pass" && (
        <div className="banner banner-pass">
          <span>
            <CircleCheck className="icon" aria-hidden="true" /> All tests passed
          </span>
        </div>
      )}
      {result.status === "fail" && (
        <div className="banner banner-fail">
          <span>
            <CircleX className="icon" aria-hidden="true" /> Not yet
          </span>
        </div>
      )}
      {result.status === "compile-error" && (
        <>
          <div className="banner banner-fail">
            <span>
              <CircleX className="icon" aria-hidden="true" /> It didn't compile
            </span>
          </div>
          <DiagnosticList diagnostics={result.diagnostics} raw={result.javacOutput} />
        </>
      )}
      {result.status === "call-error" && (
        <>
          <div className="banner banner-fail">
            <span>
              <CircleX className="icon" aria-hidden="true" /> The check couldn't call your code
            </span>
          </div>
          <ul className="rules" aria-label="Why the check couldn't call your code">
            {result.callProblems.map((p, i) => (
              <li key={i}>
                <InlineMd text={p} />
              </li>
            ))}
          </ul>
        </>
      )}
      {result.status === "internal-error" && (
        <div className="banner banner-fail">
          <span>The Java engine couldn't check this ({result.internalError}). Try again; if it keeps happening, reload the page.</span>
        </div>
      )}
      {result.ruleProblems.length > 0 && result.status !== "compile-error" && (
        <ul className="rules" aria-label="Rules for this challenge">
          {result.ruleProblems.map((p, i) => (
            <li key={i}>
              <InlineMd text={p} />
            </li>
          ))}
        </ul>
      )}
      {result.styleProblems.length > 0 && result.status !== "compile-error" && (
        <div className="rules style-problems">
          <p>Indent every line to match its braces: 4 spaces for each level.</p>
          <ul aria-label="Indentation">
            {result.styleProblems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}
      {result.tests.length > 0 && (
        <ul className="tests" aria-label="Tests">
          {result.tests.map((t, i) => (
            <li key={i} className={t.pass ? "t-pass" : "t-fail"}>
              <span className="t-icon">
                {t.pass ? <Check className="icon" aria-hidden="true" /> : <X className="icon" aria-hidden="true" />}
                <span className="visually-hidden">{t.pass ? "Passed: " : "Failed: "}</span>
              </span>
              <div className="t-body">
                <div className="t-name">
                  {t.hidden ? "Hidden test" : t.name}
                  {!t.pass && t.hidden && <span className="muted"> (hidden so the answer can't be typed in directly)</span>}
                </div>
                {!t.pass && !t.hidden && (
                  <div className="t-detail">
                    {t.call && t.call.trim() !== t.name ? (
                      <div>
                        <span className="lbl">the check ran</span>
                        <pre tabIndex={0} className="console tiny">
                          {t.call.replace(/\n$/, "")}
                        </pre>
                      </div>
                    ) : null}
                    {t.stdin ? (
                      <div>
                        <span className="lbl">input</span>
                        <pre tabIndex={0} className="console tiny">
                          <InputText text={t.stdin} />
                        </pre>
                      </div>
                    ) : null}
                    {Object.entries(t.files ?? {}).map(([name, text]) => (
                      <div key={name}>
                        <span className="lbl">the file {name}</span>
                        <pre tabIndex={0} className="console tiny">
                          {text.replace(/\n$/, "")}
                        </pre>
                      </div>
                    ))}
                    <div className="t-cmp">
                      <div>
                        <span className="lbl">expected</span>
                        <pre tabIndex={0} className="console tiny">
                          <Shown s={t.expected ?? ""} />
                        </pre>
                      </div>
                      <div>
                        <span className="lbl">your program printed</span>
                        <pre tabIndex={0} className="console tiny">
                          <Shown s={t.got ?? ""} />
                        </pre>
                      </div>
                    </div>
                  </div>
                )}
                {!t.pass && t.note && <div className="t-note">{t.note}</div>}
                {!t.pass && !t.hidden && t.stderr && (
                  <details className="stderr">
                    <summary>What Java printed about the error</summary>
                    <pre tabIndex={0} className="console tiny">
                      {t.stderr}
                    </pre>
                  </details>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {result.styleNotes.length > 0 && result.status !== "compile-error" && (
        <div className="style-notes">
          <span className="lbl">Style note (doesn't affect passing)</span>
          <ul>
            {result.styleNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
      {warnings.length > 0 && result.status !== "compile-error" && (
        <details className="warnings">
          <summary>
            {warnings.length} compiler warning{warnings.length > 1 ? "s" : ""} (not errors, but worth a look)
          </summary>
          <DiagnosticList diagnostics={warnings} raw="" />
        </details>
      )}
      <div className="muted small">compiled in {(result.compileMs / 1000).toFixed(2)} s</div>
    </div>
  );
}
