import { useCallback, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { Exercise } from "../content/types";
import { grade, runOnly, type FreeRun, type GradeResult } from "../grader/grade";
import { blankMatches, fillTemplate, parseTemplate } from "../grader/assemble.js";
import type { ChallengeProgress } from "../state/store";
import type { ReportInfo } from "../lib/site";
import FilesEditor from "./FilesEditor";
import FillCode from "./FillCode";
import Results, { DiagnosticList } from "./Results";
import { CodeView } from "./highlight";
import SymbolBar from "./SymbolBar";
import HintsPanel from "./HintsPanel";
import { DownloadCard, EngineErrorCard, UnsupportedCard, useEngineAutoload, useEngineStatus } from "./Engine";
import { engineSupported } from "../engine/client";

type Props = {
  ex: Exercise;
  progress?: ChallengeProgress;
  onChange: (patch: Partial<ChallengeProgress>) => void;
  onPass: (info: { hintsUsed: number; sawSolution: boolean }) => void;
  /** What a "Report a problem" issue says (the code and last result are added). */
  report: Omit<ReportInfo, "code" | "result">;
};

/** A short summary of a result for screen readers; the results panel has the details. */
function announce(r: GradeResult): string {
  if (r.status === "pass") return "All tests passed.";
  if (r.status === "compile-error") return "It didn't compile. The errors are listed below the editor.";
  if (r.status === "call-error") return "The check couldn't call your code. What to change is explained below the editor.";
  if (r.status === "internal-error") return "The Java engine couldn't check this. Try again.";
  const failed = r.tests.filter((t) => !t.pass).length;
  const rules = r.ruleProblems.length ? ` ${r.ruleProblems.length} rule${r.ruleProblems.length > 1 ? "s" : ""} not met.` : "";
  const style = r.styleProblems.length ? " The indentation doesn't match the braces." : "";
  return `${failed ? `${failed} of ${r.tests.length} tests failed.` : "All tests passed."}${rules}${style} Details are below the editor.`;
}

function announceRun(r: FreeRun): string {
  if (r.status === "compile-error") return "It didn't compile. The errors are listed below the input box.";
  if (r.status === "internal-error") return "The Java engine couldn't run this. Try again.";
  return r.note ? "The program ran and stopped with a problem. The output and an explanation are below the input box." : "The program finished. Its output is below the input box.";
}

/** The editor (or the fill-in code), Check, Run with my input, results, hints and the solution. */
export default function Workbench({ ex, progress, onChange, onPass, report }: Props) {
  const isFill = ex.kind === "fill";
  const blanksOf = parseTemplate(ex.seed).blanks as { answer: string; accept: string[] }[];
  const [code, setCode] = useState(progress?.code ?? ex.seed);
  const [blanks, setBlanks] = useState<string[]>(progress?.blanks ?? blanksOf.map(() => ""));
  const [busy, setBusy] = useState<"check" | "run" | null>(null);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [stdin, setStdin] = useState(ex.tests[0]?.stdin ?? "");
  const [freeRun, setFreeRun] = useState<FreeRun | null>(null);
  const [showConsole, setShowConsole] = useState(false);
  // Counts finished checks (the browser tests wait on it).
  const [checks, setChecks] = useState(0);
  const status = useEngineStatus();
  const askFirst = useEngineAutoload();
  const busyRef = useRef(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const hintsUsed = progress?.hintsUsed ?? 0;
  const attempts = progress?.attempts ?? 0;
  const sawSolution = !!progress?.sawSolution;

  const source = isFill ? fillTemplate(ex.seed, blanks) : code;
  // A challenge whose program reads files: "Run with my input" gets the same files as the first test.
  const inputFiles = ex.tests.find((t) => t.files)?.files;
  // A challenge about JUnit tests has no input to type: its run button runs the learner's tests.
  const testsOnly = ex.tests.some((t) => t.junit);

  const check = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("check");
    setFreeRun(null);
    try {
      const r = await grade(ex, source);
      setResult(r);
      setChecks((n) => n + 1);
      if (r.status !== "internal-error") onChange({ attempts: attempts + 1 });
      // On a desktop the editor fills the window, so bring the results into view.
      requestAnimationFrame(() =>
        boxRef.current?.querySelector(".results")?.scrollIntoView({ block: "nearest", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }),
      );
      if (r.status === "pass") onPass({ hintsUsed, sawSolution });
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, [ex, source, onPass, onChange, hintsUsed, sawSolution, attempts]);

  const runFree = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy("run");
    try {
      setFreeRun(await runOnly(source, stdin, inputFiles));
      setChecks((n) => n + 1);
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  };

  const reset = () => {
    if (!confirm("Reset this challenge to its starting code? Your changes will be lost.")) return;
    setCode(ex.seed);
    setBlanks(blanksOf.map(() => ""));
    setResult(null);
    onChange({ code: ex.seed, blanks: blanksOf.map(() => "") });
  };

  const wrongBlanks = isFill && result && result.status !== "pass" ? blanksOf.map((b, i) => !blankMatches(b, blanks[i])) : [];
  const waiting = status.state !== "ready";
  const unsupported = !engineSupported();
  const busyLabel = waiting ? (status.state === "loading" && status.stage !== "start" ? `Loading Java ${Math.round((status.loaded / Math.max(status.total, 1)) * 100)}%…` : "Starting Java…") : busy === "run" ? "Running…" : "Checking…";

  return (
    <div className="workbench" ref={boxRef} data-checks={checks}>
      {unsupported ? <UnsupportedCard /> : askFirst && <DownloadCard what="Checking your code" />}
      {status.state === "error" && !unsupported && <EngineErrorCard message={status.message} />}
      {isFill ? (
        <FillCode
          template={ex.seed}
          values={blanks}
          wrong={wrongBlanks}
          autoFocus={false}
          onChange={(v) => {
            setBlanks(v);
            onChange({ blanks: v });
          }}
          onSubmit={check}
        />
      ) : (
        <FilesEditor
          value={code}
          onChange={(v) => {
            setCode(v);
            onChange({ code: v });
          }}
          onRun={check}
          diagnostics={result?.status === "compile-error" ? result.diagnostics : undefined}
        />
      )}
      <SymbolBar container={boxRef} />

      <div className="actions">
        <button type="button" className="btn btn-primary" id="check" onClick={check} aria-busy={busy === "check" || undefined} aria-keyshortcuts="Control+Enter Meta+Enter" disabled={unsupported}>
          {busy === "check" ? (
            busyLabel
          ) : (
            <>
              Check <kbd aria-hidden="true">Ctrl ↵</kbd>
            </>
          )}
        </button>
        {!isFill &&
          (testsOnly ? (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setShowConsole(true);
                runFree();
              }}
              aria-busy={busy === "run" || undefined}
              disabled={unsupported}
            >
              <Play className="icon" aria-hidden="true" /> {busy === "run" ? busyLabel : "Run my tests"}
            </button>
          ) : (
            <button type="button" className="btn" aria-expanded={showConsole} onClick={() => setShowConsole(!showConsole)} disabled={unsupported}>
              {showConsole ? "Hide my input" : "Run with my input"}
            </button>
          ))}
        <button type="button" className="btn btn-ghost" onClick={reset}>
          Reset
        </button>
      </div>

      {showConsole && (
        <div className="freerun">
          {!testsOnly && (
            <>
              <label className="lbl" htmlFor="stdin">
                Input (what the program reads)
              </label>
              <textarea id="stdin" className="stdin" rows={3} value={stdin} onChange={(e) => setStdin(e.target.value)} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" />
              {inputFiles && <p className="muted small">The program can also read {Object.keys(inputFiles).join(" and ")}, as in the task.</p>}
              <button type="button" className="btn" onClick={runFree} aria-busy={busy === "run" || undefined}>
                <Play className="icon" aria-hidden="true" /> {busy === "run" ? busyLabel : "Run"}
              </button>
            </>
          )}
          {freeRun && (
            <div className="results">
              {freeRun.status === "internal-error" ? (
                <div className="banner banner-fail">The Java engine couldn't run this ({freeRun.internalError}). Try again.</div>
              ) : freeRun.status === "compile-error" ? (
                <DiagnosticList diagnostics={freeRun.diagnostics} raw={freeRun.javacOutput} multiFile={freeRun.multiFile} />
              ) : (
                <>
                  <span className="lbl">Output</span>
                  <pre tabIndex={0} className="console">
                    {(freeRun.run?.stdout ?? "") + (freeRun.run?.stderr ?? "") || "(no output)"}
                  </pre>
                  {freeRun.note && <div className="t-note">{freeRun.note}</div>}
                </>
              )}
            </div>
          )}
        </div>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {busy === "check" ? "Checking your code." : busy === "run" ? "Running your program." : freeRun ? announceRun(freeRun) : result ? announce(result) : ""}
      </p>
      {result && <Results result={result} />}

      <HintsPanel
        hints={ex.hints}
        hintsUsed={hintsUsed}
        attempts={attempts}
        failing={!!result && result.status !== "pass"}
        onHint={(n) => onChange({ hintsUsed: n })}
        onShowSolution={() => onChange({ sawSolution: true })}
        solution={
          <>
            <div className="lbl">A solution (typing it in yourself helps it stick)</div>
            <CodeView code={ex.solution} label="Solution" />
            {isFill && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const answers = blanksOf.map((b) => b.answer);
                  setBlanks(answers);
                  onChange({ blanks: answers });
                }}
              >
                Fill the blanks for me
              </button>
            )}
          </>
        }
        report={() => ({ ...report, code: source, result: result ? announce(result) : undefined })}
      />
    </div>
  );
}
