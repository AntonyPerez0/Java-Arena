import { useEffect, useState, type ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import type { ReportInfo } from "../lib/site";
import Markdown from "./Markdown";
import ReportLink from "./ReportLink";

export const SOLUTION_AFTER_ATTEMPTS = 3;

type Props = {
  hints: string[];
  hintsUsed: number;
  attempts: number;
  /** The last check failed: after two tries the Hint button draws attention to itself. */
  failing: boolean;
  onHint: (n: number) => void;
  onShowSolution: () => void;
  /** What "Show solution" reveals. */
  solution: ReactNode;
  report: () => ReportInfo;
};

/** Hints one at a time, the solution after all hints or a few checks, and "Report a problem". */
export default function HintsPanel({ hints, hintsUsed, attempts, failing, onHint, onShowSolution, solution, report }: Props) {
  const [showSolution, setShowSolution] = useState(false);
  // A newly shown hint or solution gets focus, so it's read out and the pressed button can disappear.
  const [focusId, setFocusId] = useState<string | null>(null);
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(focusId)?.focus();
    setFocusId(null);
  }, [focusId, hintsUsed, showSolution]);
  const canShowSolution = hintsUsed >= hints.length || attempts >= SOLUTION_AFTER_ATTEMPTS;

  return (
    <div className="hints">
      {hints.slice(0, hintsUsed).map((h, i) => (
        <div key={i} className="hint" id={`hint-${i + 1}`} tabIndex={-1}>
          <span className="hint-n">Hint {i + 1}</span>
          <Markdown text={h} />
        </div>
      ))}
      <div className="hint-actions">
        {hintsUsed < hints.length && (
          <button
            type="button"
            className={"btn btn-hint" + (attempts >= 2 && failing ? " pulse" : "")}
            onClick={() => {
              onHint(hintsUsed + 1);
              setFocusId(`hint-${hintsUsed + 1}`);
            }}
          >
            <Lightbulb className="icon" aria-hidden="true" /> Hint ({hintsUsed + 1} of {hints.length})
          </button>
        )}
        {canShowSolution && !showSolution && (
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setShowSolution(true);
              setFocusId("solution");
              onShowSolution();
            }}
          >
            Show solution
          </button>
        )}
      </div>
      {!canShowSolution && (
        <p className="muted small">
          The solution can be shown after all the hints or {SOLUTION_AFTER_ATTEMPTS} checks.
        </p>
      )}
      {showSolution && (
        <div className="solution" id="solution" tabIndex={-1}>
          {solution}
        </div>
      )}
      <p className="report-row">
        <ReportLink info={report} />
      </p>
    </div>
  );
}
