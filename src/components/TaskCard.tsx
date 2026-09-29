import { Target } from "lucide-react";
import type { Exercise } from "../content/types";
import Markdown from "./Markdown";

/**
 * What the challenge asks for, set apart from the lesson so it's obvious: the task, then the exact
 * output the program must print, with the input it gets.
 */
export default function TaskCard({ ex, task, index, total }: { ex: Exercise; task: string; index: number; total: number }) {
  // A "What does it print?" challenge must not show its answer.
  const shown = ex.kind === "predict" ? undefined : ex.tests.find((t) => !t.hidden && t.expect);
  const others = ex.tests.filter((t) => t !== shown);
  const moreTests = others.length;
  const hiddenCount = others.filter((t) => t.hidden).length;
  // The expected output gets its own box below, so a copy of it in the task text is dropped.
  const text = shown ? withoutBlock(task, shown.expect) : task;
  return (
    <section className="task-card" aria-labelledby="task-h">
      <div className="task-head">
        <h2 id="task-h" className="task-title" tabIndex={-1}>
          <Target className="icon" aria-hidden="true" /> Your task
        </h2>
        {total > 1 && (
          <span className="task-count">
            Challenge {index + 1} of {total}
          </span>
        )}
      </div>
      <Markdown text={text} className="task-body" />
      {ex.kind === "fill" && <p className="task-note">Type your answers into the highlighted blanks in the code below.</p>}
      {ex.kind === "predict" && <p className="task-note">Read the program below and type each line it prints. The answers are what Java really prints for it.</p>}
      {shown && (
        <div className="task-expect">
          <div className={"task-io" + (shown.stdin ? " two" : "")}>
            {shown.stdin ? (
              <div>
                <div className="lbl">Input</div>
                <pre className="console tiny" tabIndex={0}>
                  {shown.stdin.replace(/\n$/, "")}
                </pre>
              </div>
            ) : null}
            <div>
              <div className="lbl">Expected output</div>
              <pre className="console task-output" tabIndex={0}>
                {shown.expect}
              </pre>
            </div>
          </div>
          {moreTests > 0 && (
            <p className="task-note">
              {hiddenCount === moreTests
                ? `${moreTests} more hidden ${moreTests === 1 ? "test uses" : "tests use"} other input, so the answer can't be typed in directly.`
                : `${moreTests} more ${moreTests === 1 ? "test uses" : "tests use"} other input${hiddenCount ? ", some of them hidden so the answer can't be typed in directly" : ""}.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const norm = (s: string) => s.replace(/[ \t]+$/gm, "").trim();

/** The task without a fenced block that only repeats the expected output, which the box below shows. */
function withoutBlock(task: string, expect: string): string {
  const out = task.replace(/(:?)\s*\n^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm, (m, colon: string, body: string) => (norm(body) === norm(expect) ? (colon ? ": see the expected output below." : "") : m));
  return out === task ? task : out.trimEnd() + "\n";
}
