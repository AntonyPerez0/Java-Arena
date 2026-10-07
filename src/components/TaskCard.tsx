import { Target } from "lucide-react";
import { otherTestsUse } from "../content/otherTests";
import type { Exercise } from "../content/types";
import { describeEvents } from "../grader/window";
import Markdown from "./Markdown";
import InputText from "./InputText";
import { FileName } from "./Results";
import { WindowFigure } from "./WindowView";

/**
 * What the challenge asks for, set apart from the lesson so it's obvious: the task, then the exact
 * output the program must print, with the input it gets, and the files it must write.
 */
export default function TaskCard({ ex, task, index, total }: { ex: Exercise; task: string; index: number; total: number }) {
  // Tests that run the learner's JUnit tests on versions of the program.
  const junitTests = ex.tests.filter((t) => t.junit);
  const hiddenBuggy = junitTests.filter((t) => t.hidden && t.outcome === "fail").length;
  const hiddenPassing = junitTests.filter((t) => t.hidden && t.outcome !== "fail").length;
  // A "What does it print?" challenge must not show its answer. A challenge with a window shows the
  // first visible test with clicks and typing (events), and one whose program writes files the first
  // visible test that checks them (scripts/build-content.mjs checkTaskOutput picks the same).
  const shown = ex.kind === "predict" ? undefined : (ex.tests.find((t) => !t.hidden && t.events) ?? ex.tests.find((t) => !t.hidden && t.writes) ?? ex.tests.find((t) => !t.hidden && t.expect));
  const others = ex.tests.filter((t) => t !== shown);
  const moreTests = others.length;
  const hiddenCount = others.filter((t) => t.hidden).length;
  // What they use instead: "other input", "other command-line arguments", "other clicks and typing"...
  const what = otherTestsUse(shown, others);
  // The expected output (and the check's code) get boxes of their own below, so copies in the task text are dropped.
  const text = shown?.expect ? withoutBlock(task, shown.expect, shown.call) : task;
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
      {junitTests.length > 0 && (
        <div className="task-expect">
          <div className="lbl">{junitTests.some((t) => t.outcome === "fail") ? "The check runs your tests on" : "The check runs the given tests on"}</div>
          <ul className="task-versions">
            {junitTests
              .filter((t) => !t.hidden)
              .map((t, i) => (
                <li key={i}>
                  {t.name}: <strong>{t.outcome === "fail" ? "at least one test must fail" : "every test must pass"}</strong>
                </li>
              ))}
          </ul>
          {hiddenBuggy > 0 && (
            <p className="task-note">
              {hiddenBuggy} more hidden {hiddenBuggy === 1 ? "version has a bug" : "versions have bugs"} your tests should catch.
            </p>
          )}
          {hiddenPassing > 0 && (
            <p className="task-note">
              {hiddenPassing === 1 ? "A hidden set of tests also checks" : `${hiddenPassing} hidden sets of tests also check`} your code, and every test in {hiddenPassing === 1 ? "it" : "them"} must pass.
            </p>
          )}
        </div>
      )}
      {ex.kind === "fill" && <p className="task-note">Type your answers into the highlighted blanks in the code below.</p>}
      {ex.kind === "predict" && <p className="task-note">Read the program below and type each line it prints. The answers are what Java really prints for it.</p>}
      {shown && (
        <div className="task-expect">
          <div className={"task-io" + (shown.stdin || shown.call || shown.files || shown.events || shown.args ? " two" : "")}>
            {shown.call ? (
              <div>
                <div className="lbl">The check runs</div>
                <pre className="console tiny" tabIndex={0}>
                  {shown.call.replace(/\n$/, "")}
                </pre>
              </div>
            ) : null}
            {shown.stdin ? (
              <div>
                <div className="lbl">Input</div>
                <pre className="console tiny" tabIndex={0}>
                  <InputText text={shown.stdin} />
                </pre>
              </div>
            ) : null}
            {shown.args?.length ? (
              <div>
                <div className="lbl">Command-line arguments</div>
                <pre className="console tiny" tabIndex={0}>
                  {shown.args.map((a) => (/[\s"]/.test(a) || a === "" ? JSON.stringify(a) : a)).join(" ")}
                </pre>
              </div>
            ) : null}
            {shown.events ? (
              <div>
                <div className="lbl">Clicks and typing</div>
                <p className="task-events">{describeEvents(shown.events)}</p>
              </div>
            ) : null}
            {Object.entries(shown.files ?? {}).map(([name, text]) => (
              <div key={name}>
                <div className="lbl">
                  The file <FileName name={name} />
                </div>
                <pre className="console tiny" tabIndex={0}>
                  {text.replace(/\n$/, "")}
                </pre>
              </div>
            ))}
            <div>
              <div className="lbl">Expected output</div>
              <pre className="console task-output" tabIndex={0}>
                {shown.expect || <em className="muted">(nothing)</em>}
              </pre>
              {shown.outline != null && (
                <div>
                  <div className="lbl">The window should look like</div>
                  <WindowFigure window={shown.window ?? null} outline={shown.outline} />
                </div>
              )}
              {Object.entries(shown.writes ?? {}).map(([name, text]) => (
                <div key={name}>
                  <div className="lbl">
                    The file <FileName name={name} /> after the run
                  </div>
                  <pre className="console tiny" tabIndex={0}>
                    {text.replace(/\n$/, "") || <em className="muted">(empty)</em>}
                  </pre>
                </div>
              ))}
            </div>
          </div>
          {moreTests > 0 && (
            <p className="task-note">
              {hiddenCount === moreTests
                ? `${moreTests} more hidden ${moreTests === 1 ? "test uses" : "tests use"} other ${what}, so the answer can't be typed in directly.`
                : `${moreTests} more ${moreTests === 1 ? "test uses" : "tests use"} other ${what}${hiddenCount ? ", some of them hidden so the answer can't be typed in directly" : ""}.`}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

const norm = (s: string) => s.replace(/[ \t]+$/gm, "").trim();

/** The task without fenced blocks that only repeat the expected output or the check's code, which the boxes below show. */
function withoutBlock(task: string, expect: string, call?: string): string {
  if (call) {
    // "The check runs: <code> and expects: <output>", both shown again below.
    const both = task.replace(/The check runs:\s*\n^```[^\n]*\n([\s\S]*?)^```[ \t]*\n\s*and expects:\s*\n^```[^\n]*\n([\s\S]*?)^```[ \t]*$/m, (m, code: string, body: string) =>
      norm(code) === norm(call) && norm(body) === norm(expect) ? "The code the check runs and the output it expects are shown below." : m,
    );
    if (both !== task) return both.trimEnd() + "\n";
  }
  const out = task.replace(/(:?)\s*\n^```[^\n]*\n([\s\S]*?)^```[ \t]*$/gm, (m, colon: string, body: string) => (norm(body) === norm(expect) ? (colon ? ": see the expected output below." : "") : m));
  return out === task ? task : out.trimEnd() + "\n";
}
