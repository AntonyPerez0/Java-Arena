// One Deathmatch rep per drill type, and the review card after a miss. Instant types are checked in
// the page; a boss rep is a real coding challenge, compiled and run by the Java engine.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Skull } from "lucide-react";
import type { Drill } from "../content/types";
import { getState, useStore } from "../state/store";
import { checkAnswer, TYPE_LABEL, topicTitle } from "./engine";
import { CodeView, highlight } from "../components/highlight";
import FillCode from "../components/FillCode";
import FilesEditor from "../components/FilesEditor";
import InputText from "../components/InputText";
import Results from "../components/Results";
import Markdown, { InlineMd } from "../components/Markdown";
import SymbolBar from "../components/SymbolBar";
import ReportLink from "../components/ReportLink";
import { DownloadCard, EngineErrorCard, UnsupportedCard, useEngineAutoload, useEngineStatus } from "../components/Engine";
import { engineSupported } from "../engine/client";
import { grade, type GradeResult } from "../grader/grade";
import { fillTemplate } from "../grader/assemble.js";

type Answer = (given: string, ok: boolean) => void;

/** Single-key shortcuts, unless turned off or the learner is typing. */
function useKeys(handler: (key: string) => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (!getState().settings.keys || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || t.closest("input, textarea, select"))) return;
      handler(e.key);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
}

function InputBlock({ stdin }: { stdin?: string }) {
  if (!stdin) return null;
  return (
    <div className="rep-io">
      <span className="lbl">input</span>
      <pre tabIndex={0} className="console tiny">
        <InputText text={stdin} />
      </pre>
    </div>
  );
}

export function Rep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const box = useRef<HTMLDivElement>(null);
  const typed = drill.type === "predict" || drill.type === "fill" || drill.type === "boss";
  return (
    <div className={"rep rep-" + drill.type} data-drill={drill.id} ref={box}>
      <div className="rep-head">
        <span className={"rep-type type-" + drill.type}>{TYPE_LABEL[drill.type]}</span>
        <span className="rep-topic">{topicTitle(drill.topic)}</span>
      </div>
      {drill.type !== "boss" && (
        <h2 className="rep-prompt" tabIndex={-1} id="rep-prompt">
          <InlineMd text={drill.prompt} />
        </h2>
      )}
      {drill.type === "predict" && <PredictRep drill={drill} onAnswer={onAnswer} />}
      {drill.type === "fill" && <FillRep drill={drill} onAnswer={onAnswer} />}
      {drill.type === "bug" && <BugRep drill={drill} onAnswer={onAnswer} />}
      {drill.type === "compiles" && <CompilesRep drill={drill} onAnswer={onAnswer} />}
      {drill.type === "choice" && <ChoiceRep drill={drill} onAnswer={onAnswer} />}
      {drill.type === "boss" && <BossRep drill={drill} onAnswer={onAnswer} />}
      {typed && <SymbolBar container={box} />}
    </div>
  );
}

function PredictRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const [v, setV] = useState("");
  const lines = drill.answer.split("\n").length;
  const submit = () => v.trim() && onAnswer(v, checkAnswer(drill, v));
  return (
    <>
      <CodeView code={drill.display} label="The code" />
      <InputBlock stdin={drill.stdin} />
      <form
        className="rep-answer"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label className="visually-hidden" htmlFor="rep-input">
          What it prints{lines > 1 ? `, ${lines} lines (spaces between them are fine)` : ""}
        </label>
        <input id="rep-input" className="answer-input" autoFocus placeholder={lines > 1 ? `The ${lines} lines it prints, with spaces between` : "What it prints"} value={v} onChange={(e) => setV(e.target.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" autoCorrect="off" enterKeyHint="send" />
        <button type="submit" className="btn btn-primary">
          Fire <kbd aria-hidden="true">↵</kbd>
        </button>
      </form>
      <p className="muted small">Line breaks and runs of spaces all count as one space, so the lines 1, 2 and 3 can be typed as "1 2 3".</p>
    </>
  );
}

function FillRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const [v, setV] = useState<string[]>([""]);
  const submit = () => v[0].trim() && onAnswer(v[0], checkAnswer(drill, v[0]));
  return (
    <>
      <FillCode template={drill.display} values={v} onChange={setV} onSubmit={submit} autoFocus />
      <InputBlock stdin={drill.stdin} />
      {drill.output && (
        <div className="rep-io">
          <span className="lbl">it should print</span>
          <pre tabIndex={0} className="console tiny">
            {drill.output}
          </pre>
        </div>
      )}
      <div className="rep-answer">
        <button type="button" className="btn btn-primary" onClick={submit}>
          Fire <kbd aria-hidden="true">↵</kbd>
        </button>
      </div>
    </>
  );
}

function ChoiceRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const choices = drill.choices ?? [];
  // A new order for every showing, so the right answer isn't always in the same place.
  const order = useMemo(() => {
    const o = choices.map((_, i) => i);
    for (let i = o.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [o[i], o[j]] = [o[j], o[i]];
    }
    return o;
  }, [drill.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // Answers are saved by the choice's own number, not its place on screen.
  const pick = (k: number) => onAnswer(String(order[k] + 1), checkAnswer(drill, String(order[k] + 1)));
  const keys = useStore((s) => s.settings.keys);
  useKeys((key) => {
    const n = "abcd".indexOf(key.toLowerCase());
    const k = n >= 0 ? n : parseInt(key, 10) - 1;
    if (k >= 0 && k < choices.length) pick(k);
  });
  return (
    <>
      {drill.display && <CodeView code={drill.display} label="The code" />}
      <div className="choices" role="group" aria-label="Answers">
        {order.map((ci, k) => (
          <button type="button" key={ci} className="choice" data-choice={ci + 1} onClick={() => pick(k)}>
            <span className="choice-key" aria-hidden="true">
              {"ABCD"[k]}
            </span>
            <span>
              <InlineMd text={choices[ci]} />
            </span>
          </button>
        ))}
      </div>
      <p className="muted small">{keys ? `Tap an answer, or press A to ${"ABCD"[choices.length - 1]}.` : "Tap an answer."}</p>
    </>
  );
}

const pickableLine = (l: string) => l.trim() !== "" && l.trim() !== "// inside main:" && !/^[{}]\s*;?$/.test(l.trim());

function BugRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const lines = drill.display.split("\n");
  const pickable = lines.map(pickableLine);
  const pick = (n: number) => onAnswer(String(n), checkAnswer(drill, String(n)));
  const keys = useStore((s) => s.settings.keys);
  // Line numbers are typed: with 10 lines or more, "1" waits a moment for a second digit.
  const typedNo = useRef("");
  const wait = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(wait.current), []);
  useKeys((key) => {
    if (!/^[0-9]$/.test(key)) return;
    clearTimeout(wait.current);
    const n = parseInt(typedNo.current + key, 10);
    const go = () => {
      typedNo.current = "";
      if (n >= 1 && n <= lines.length && pickable[n - 1]) pick(n);
    };
    if (n * 10 <= lines.length) {
      typedNo.current += key;
      wait.current = setTimeout(go, 800);
    } else go();
  });
  return (
    <>
      {drill.output && (
        <div className="rep-io">
          <span className="lbl">it should print</span>
          <pre tabIndex={0} className="console tiny">
            {drill.output}
          </pre>
        </div>
      )}
      <InputBlock stdin={drill.stdin} />
      <div className="buglines" role="group" aria-label="Lines of code">
        {lines.map((l, i) =>
          pickable[i] ? (
            <button type="button" key={i} className="bugline" aria-label={`Line ${i + 1}: ${l.trim()}`} onClick={() => pick(i + 1)}>
              <span className="ln">{i + 1}</span>
              <code>{highlight(l)}</code>
            </button>
          ) : (
            <div key={i} className="bugline bugline-off">
              <span className="ln">{i + 1}</span>
              <code>{highlight(l)}</code>
            </div>
          ),
        )}
      </div>
      <p className="muted small">{keys ? "Tap the line, or type its number." : "Tap the line."}</p>
    </>
  );
}

function CompilesRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const say = (a: "yes" | "no") => onAnswer(a, checkAnswer(drill, a));
  const keys = useStore((s) => s.settings.keys);
  useKeys((key) => {
    if (key === "y" || key === "Y") say("yes");
    if (key === "n" || key === "N") say("no");
  });
  return (
    <>
      <CodeView code={drill.display} label="The code" />
      <div className="yn">
        <button type="button" className="btn btn-yes" onClick={() => say("yes")}>
          Compiles {keys && <kbd aria-hidden="true">Y</kbd>}
        </button>
        <button type="button" className="btn btn-no" onClick={() => say("no")}>
          Compile error {keys && <kbd aria-hidden="true">N</kbd>}
        </button>
      </div>
      <p className="muted small">Statements shown on their own run inside a main method, with the imports they need. Warnings don't count as errors.</p>
    </>
  );
}

function BossRep({ drill, onAnswer }: { drill: Drill; onAnswer: Answer }) {
  const ex = drill.exercise!;
  const [code, setCode] = useState(ex.seed);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [shots, setShots] = useState(3);
  const busyRef = useRef(false);
  // A check still running when the rep ends (after Give up, or leaving) must not answer for it.
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const engine = useEngineStatus();
  const askFirst = useEngineAutoload();
  const unsupported = !engineSupported();
  const fire = async () => {
    if (busyRef.current || unsupported) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const r = await grade(ex, code);
      if (!live.current) return;
      setResult(r);
      if (r.status === "pass") onAnswer("pass", true);
      else if (r.status !== "internal-error") {
        const left = shots - 1;
        setShots(left);
        if (left <= 0) onAnswer(code, false);
      }
    } finally {
      busyRef.current = false;
      if (live.current) setBusy(false);
    }
  };
  return (
    <>
      <h2 className="boss-banner" id="rep-prompt" tabIndex={-1}>
        <Skull className="icon" aria-hidden="true" /> Boss rep · {shots} {shots === 1 ? "shot" : "shots"} left
      </h2>
      <Markdown text={drill.prompt} className="rep-task" />
      {unsupported ? <UnsupportedCard /> : askFirst && <DownloadCard what="A boss rep" now="read the task now" button="Fire" />}
      {engine.state === "error" && !unsupported && <EngineErrorCard message={engine.message} />}
      <FilesEditor value={code} onChange={setCode} onRun={fire} diagnostics={result?.status === "compile-error" ? result.diagnostics : undefined} minHeight="12rem" label="Java code editor" />
      <div className="actions">
        <button type="button" id="check" className="btn btn-primary" onClick={fire} disabled={unsupported} aria-busy={busy || undefined}>
          {busy ? (engine.state === "ready" ? "Checking…" : "Starting Java…") : <>Fire <kbd aria-hidden="true">Ctrl ↵</kbd></>}
        </button>
        <button type="button" className="btn btn-ghost" onClick={() => onAnswer("(gave up)", false)}>
          Give up
        </button>
      </div>
      {result && result.status !== "pass" && <Results result={result} />}
    </>
  );
}

// ---------------------------------------------------------------- review after a miss
export function Death({ drill, given, title, sub, children }: { drill: Drill; given: string; title: string; sub: string; children: ReactNode }) {
  const choice = (n: string) => drill.choices?.[parseInt(n, 10) - 1];
  return (
    <div className="death">
      <h2 className="death-title" tabIndex={-1} id="death-title">
        {title}
      </h2>
      <p className="death-sub">{sub}</p>
      <div className="death-card">
        <div className="rep-head">
          <span className={"rep-type type-" + drill.type}>{TYPE_LABEL[drill.type]}</span>
          <span className="rep-topic">{topicTitle(drill.topic)}</span>
        </div>
        {drill.type === "boss" ? (
          <>
            <Markdown text={drill.prompt} className="rep-task" />
            <div className="lbl">a solution</div>
            <CodeView code={drill.exercise!.solution} label="A solution" />
          </>
        ) : drill.type === "bug" ? (
          <>
            <CodeView code={drill.display.split("\n").map((l, i) => (String(i + 1) === drill.answer ? `${l}   // <- the bug` : l)).join("\n")} label="The code, with the bug marked" />
            <p className="answer-cmp">
              {given ? (
                <>
                  You picked line <b>{given}</b>.{" "}
                </>
              ) : null}
              The bug is on line <b>{drill.answer}</b>. The fix: <code>{drill.fix}</code>
            </p>
          </>
        ) : drill.type === "choice" ? (
          <>
            {drill.display && <CodeView code={drill.display} label="The code" />}
            <p className="muted">
              <InlineMd text={drill.prompt} />
            </p>
            <dl className="answer-cmp">
              {choice(given) && (
                <>
                  <dt>You said</dt>
                  <dd>
                    <InlineMd text={choice(given)!} />
                  </dd>
                </>
              )}
              <dt>The answer</dt>
              <dd className="good">
                <InlineMd text={choice(drill.answer) ?? ""} />
              </dd>
            </dl>
          </>
        ) : (
          <>
            <CodeView code={drill.type === "fill" ? fillTemplate(drill.display, [drill.answer]) : drill.display} label="The code" />
            {drill.stdin && <InputBlock stdin={drill.stdin} />}
            <dl className="answer-cmp">
              {given && (
                <>
                  <dt>You said</dt>
                  <dd>
                    <code>{given}</code>
                  </dd>
                </>
              )}
              <dt>The answer</dt>
              <dd>
                {drill.type === "compiles" ? (
                  <b className="good">{drill.answer === "yes" ? "It compiles" : "Compile error"}</b>
                ) : drill.type === "predict" ? (
                  <pre tabIndex={0} className="console tiny good">
                    {drill.answer}
                  </pre>
                ) : (
                  <code className="good">{drill.answer}</code>
                )}
              </dd>
            </dl>
          </>
        )}
        {drill.why && (
          <div className="why">
            <Markdown text={drill.why} />
          </div>
        )}
        <p className="report-row">
          <ReportLink info={() => ({ kind: "Drill", title: `${topicTitle(drill.topic)}: ${TYPE_LABEL[drill.type]}`, id: drill.id, code: drill.display || drill.exercise?.seed, result: given ? `I answered: ${given}` : "Answered on an earlier visit" })} />
        </p>
      </div>
      <div className="death-actions">{children}</div>
    </div>
  );
}
