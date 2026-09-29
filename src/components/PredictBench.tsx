import { useRef, useState } from "react";
import { Check, CircleCheck, CircleX, X } from "lucide-react";
import type { Exercise } from "../content/types";
import { gradePredict, type PredictResult } from "../grader/grade";
import type { ChallengeProgress } from "../state/store";
import type { ReportInfo } from "../lib/site";
import { CodeView } from "./highlight";
import HintsPanel from "./HintsPanel";

type Props = {
  ex: Exercise;
  progress?: ChallengeProgress;
  onChange: (patch: Partial<ChallengeProgress>) => void;
  onPass: (info: { hintsUsed: number; sawSolution: boolean }) => void;
  report: Omit<ReportInfo, "code" | "result">;
};

function announce(r: PredictResult): string {
  if (r.pass) return "All lines are right.";
  const wrong = r.lines.filter((l) => !l.pass).length;
  return `${wrong} of ${r.lines.length} lines are not what the program prints.`;
}

/**
 * "What does it print?": the program is shown read-only, and the learner types each line it prints.
 * Checked instantly against the program's real output (recorded with a JDK when the site was built).
 */
export default function PredictBench({ ex, progress, onChange, onPass, report }: Props) {
  const lines = ex.lines ?? [];
  const [answers, setAnswers] = useState<string[]>(progress?.blanks ?? lines.map(() => ""));
  const [result, setResult] = useState<PredictResult | null>(null);
  const [checks, setChecks] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const hintsUsed = progress?.hintsUsed ?? 0;
  const attempts = progress?.attempts ?? 0;

  const check = () => {
    const r = gradePredict(ex, answers);
    setResult(r);
    setChecks((n) => n + 1);
    onChange({ attempts: attempts + 1 });
    if (r.pass) onPass({ hintsUsed, sawSolution: !!progress?.sawSolution });
  };
  const set = (i: number, v: string) => {
    const next = [...answers];
    while (next.length < lines.length) next.push("");
    next[i] = v;
    setAnswers(next);
    onChange({ blanks: next });
  };

  return (
    <div className="workbench predict" ref={boxRef} data-checks={checks}>
      <CodeView code={ex.seed} label="The program" />
      <form
        className="predict-lines"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <fieldset>
          <legend>
            What it prints, line by line ({lines.length} {lines.length === 1 ? "line" : "lines"})
          </legend>
          {lines.map((_, i) => {
            const wrong = result && !result.lines[i]?.pass;
            return (
              <div key={i} className="predict-line">
                <label htmlFor={`line-${i + 1}`}>Line {i + 1}</label>
                <input
                  id={`line-${i + 1}`}
                  className={"answer-input" + (wrong ? " blank-wrong" : "")}
                  aria-invalid={wrong ? true : undefined}
                  spellCheck={false}
                  autoCapitalize="off"
                  autoComplete="off"
                  autoCorrect="off"
                  enterKeyHint={i === lines.length - 1 ? "done" : "next"}
                  value={answers[i] ?? ""}
                  onChange={(e) => set(i, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter" || i === lines.length - 1) return;
                    e.preventDefault();
                    document.getElementById(`line-${i + 2}`)?.focus();
                  }}
                />
                {result && (
                  <span className={result.lines[i]?.pass ? "ic-good" : "ic-bad"}>
                    {result.lines[i]?.pass ? <Check className="icon" aria-hidden="true" /> : <X className="icon" aria-hidden="true" />}
                    <span className="visually-hidden">{result.lines[i]?.pass ? "right" : "not what it prints"}</span>
                  </span>
                )}
              </div>
            );
          })}
        </fieldset>
        <div className="actions">
          <button type="submit" className="btn btn-primary" id="check">
            Check
          </button>
        </div>
      </form>
      <p className="visually-hidden" role="status" aria-live="polite">
        {result ? announce(result) : ""}
      </p>
      {result && (
        <div className="results">
          {result.pass ? (
            <div className="banner banner-pass">
              <span>
                <CircleCheck className="icon" aria-hidden="true" /> Every line is right
              </span>
            </div>
          ) : (
            <div className="banner banner-fail">
              <span>
                <CircleX className="icon" aria-hidden="true" /> {announce(result)}
              </span>
            </div>
          )}
        </div>
      )}
      <HintsPanel
        hints={ex.hints}
        hintsUsed={hintsUsed}
        attempts={attempts}
        failing={!!result && !result.pass}
        onHint={(n) => onChange({ hintsUsed: n })}
        onShowSolution={() => onChange({ sawSolution: true })}
        solution={
          <>
            <div className="lbl">What it prints</div>
            <pre className="console" tabIndex={0}>
              {lines.join("\n")}
            </pre>
          </>
        }
        report={() => ({ ...report, code: answers.map((a, i) => `// line ${i + 1}: ${a}`).join("\n"), result: result ? announce(result) : undefined })}
      />
    </div>
  );
}
