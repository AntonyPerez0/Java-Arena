// JavaFX windows on the page, drawn from the window JSON of Java Arena's practice version of JavaFX
// (the drawing itself is decided in ./window-drawing.ts, which lesson text and the pre-rendered
// pages share):
// - WindowFigure: a window that can't be used (the task card's "The window should look like"),
//   with "The window as text" under it, folded;
// - WindowCompare: a test's expected window next to the learner's, the lines that differ marked;
// - WindowPanel: a free run's window (the Playground, a lesson's "Run with my input"), whose
//   buttons and fields work. Each click or typing is an event line (click Button "Add", type #3 "Ada"); the
//   page runs the compiled program again from the start with all the events so far
//   (useWindowSession), and draws the window it then leaves.
import { Fragment, createElement, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MutableRefObject, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import { rerun, type CompiledProgram, type FreeRun } from "../grader/grade";
import { NOT_SHOWN_NOTE, neverShown, quoteText, windowOutline, type OutlineLine, type WindowCheck, type WindowState } from "../grader/window";
import { TITLE_BUTTONS_SVG, WIDE_NOTE, drawWindows, drawingLabel, outlineLines, type Drawn, type DrawnControl, type DrawnWindow } from "./window-drawing";
import { useWindowFrames } from "./window-frame";

// ------------------------------------------------------------------ drawing with React

/** How the window panel's controls behave (absent: a drawing that can't be used). */
type Live = {
  draft: (c: DrawnControl) => string | undefined;
  onClick: (c: DrawnControl) => void;
  onFocus: (c: DrawnControl) => void;
  onPress: () => void;
  onType: (c: DrawnControl, text: string) => void;
  onKey: (c: DrawnControl, e: KeyboardEvent) => void;
  onLeave: (c: DrawnControl) => void;
};

function LiveControl({ d, live }: { d: Drawn; live: Live }) {
  const c = d.control!;
  // data-fx-path: the panel finds the control again after a run (to put the keyboard focus back).
  const common = { className: d.cls.replace(" fx-prompt", ""), style: d.style, ...d.attrs, "data-fx-path": c.path, onFocus: () => live.onFocus(c) };
  if (c.kind === "button") {
    return (
      <button
        type="button"
        {...common}
        disabled={c.disabled}
        aria-label={c.text.trim() ? undefined : c.name}
        onPointerDown={live.onPress}
        onClick={() => live.onClick(c)}
      >
        {d.kids?.map((k) => toReact(k))}
      </button>
    );
  }
  const value = live.draft(c) ?? c.text;
  const field = {
    ...common,
    value,
    placeholder: c.prompt || undefined,
    "aria-label": c.name,
    disabled: c.disabled,
    readOnly: !c.editable,
    spellCheck: false,
    autoCapitalize: "off",
    autoCorrect: "off",
    autoComplete: "off",
    onChange: (e: { currentTarget: { value: string } }) => live.onType(c, e.currentTarget.value),
    onKeyDown: (e: KeyboardEvent) => live.onKey(c, e),
    onBlur: () => live.onLeave(c),
  };
  if (c.kind === "area") return <textarea {...field} wrap={c.wrap ? "soft" : "off"} />;
  return <input type={c.kind === "password" ? "password" : "text"} {...field} />;
}

function toReact(d: Drawn, live?: Live): ReactNode {
  if (d.control && live) return <LiveControl key={d.key} d={d} live={live} />;
  return createElement(d.tag, { key: d.key, className: d.cls, style: d.style, ...d.attrs }, d.text ?? d.kids?.map((k) => toReact(k, live)));
}

const titleButtons = <span className="fx-title-glyphs" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TITLE_BUTTONS_SVG }} />;

function WindowFrame({ w, live }: { w: DrawnWindow; live?: Live }) {
  return (
    <div className="fx-window" style={w.style} {...(live ? { role: "group", "aria-label": w.label } : {})}>
      <div className="fx-titlebar" aria-hidden={live ? true : undefined}>
        <span className="fx-title">{w.title ?? ""}</span>
        {titleButtons}
      </div>
      <div className="fx-scene" style={w.sceneStyle}>
        {w.scene ? toReact(w.scene, live) : <p className="fx-no-scene">(no scene)</p>}
      </div>
    </div>
  );
}

/**
 * The frame around drawn windows: it scrolls sideways when they are wider than the column, and
 * then says so under it (and fades its right edge) through useWindowFrames. The same markup as
 * windowDrawingHtml.
 */
function Frame({ label, focusable, deps, children }: { label: string; focusable: boolean; deps: unknown[]; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useWindowFrames(ref, deps);
  return (
    <div className="fx-frame" ref={ref}>
      <div className="fx-scroll" {...(focusable ? { tabIndex: 0, role: "group", "aria-label": label } : {})}>
        {children}
      </div>
      <p className="fx-wide-note">{WIDE_NOTE}</p>
    </div>
  );
}

/**
 * A window JSON drawn, not usable: in a frame that scrolls sideways when the windows are wider than
 * the column. The drawing is hidden from screen readers (the window as text has it all). No window
 * showing: the outline's sentence instead.
 */
export function WindowDrawing({ window: w, label }: { window: WindowState | null | undefined; label?: string }) {
  const drawn = useMemo(() => drawWindows(w), [w]);
  if (!drawn.length) return <p className="fx-none">{windowOutline(w)}</p>;
  return (
    <Frame label={label ?? drawingLabel(w)} focusable deps={[drawn]}>
      <div className="fx-desktop" aria-hidden="true">
        {drawn.map((d) => (
          <WindowFrame key={d.key} w={d} />
        ))}
      </div>
    </Frame>
  );
}

/**
 * "The window as text": the outline, folded until opened; with `lines`, the lines that differ are
 * marked. Each line is an element of its own, so a long one wraps under its own start, one step in
 * (.fx-line): the box never scrolls, on a phone either. The "\n" between lines stays text, so the
 * box's text is exactly the outline.
 */
export function WindowText({ outline, lines, open, summary = "The window as text" }: { outline: string; lines?: OutlineLine[]; open?: boolean; summary?: string }) {
  const shown = lines ?? outline.split("\n").map((text) => ({ text, differs: false }));
  const indents = outlineLines(shown.map((l) => l.text).join("\n"));
  return (
    <details className="fx-astext" open={open}>
      <summary>{summary}</summary>
      <pre className="console tiny">
        {shown.map((l, i) => (
          <Fragment key={i}>
            <span className="fx-line" style={{ "--indent": indents[i].indent } as CSSProperties}>
              {l.differs ? (
                <mark className="fx-differs">
                  <span className="visually-hidden">Differs: </span>
                  {l.text}
                </mark>
              ) : (
                l.text
              )}
            </span>
            {i < shown.length - 1 ? "\n" : ""}
          </Fragment>
        ))}
      </pre>
    </details>
  );
}

/** A window that can't be used, with its outline under it (the task card, and lesson text through windowFigureHtml). */
export function WindowFigure({ window: w, outline }: { window?: WindowState | null; outline: string }) {
  return (
    <div className="fx-figure">
      {w !== undefined ? <WindowDrawing window={w} /> : null}
      <WindowText outline={outline} />
    </div>
  );
}

/**
 * A visible test's windows side by side (one under the other on a phone): the one the model solution
 * left and the learner's, each drawn, with their outlines open and the lines that differ marked.
 */
export function WindowCompare({ check }: { check: WindowCheck }) {
  const expectedLines = check.lines?.expected;
  const gotLines = check.lines?.got;
  return (
    <div className="fx-compare">
      <div>
        <span className="lbl">The window should look like</span>
        <WindowDrawing window={check.expected ?? null} label="Drawing of the window it should be (as text below)" />
        <WindowText outline={check.expectedOutline ?? ""} lines={expectedLines} open summary="As text" />
      </div>
      <div>
        <span className="lbl">Your window</span>
        {check.missing ? (
          <p className="fx-none">{check.stopped ? "(no window: your program was stopped at the time limit, before its window was written)" : "(no window: your program didn't leave one)"}</p>
        ) : (
          <>
            <WindowDrawing window={check.got ?? null} label="Drawing of your window (as text below)" />
            <WindowText outline={check.gotOutline ?? ""} lines={gotLines} open summary="As text" />
          </>
        )}
      </div>
      {check.lines && <p className="fx-legend small muted">The lines that differ are highlighted.</p>}
    </div>
  );
}

// ------------------------------------------------------------------ a free run's window, usable

/**
 * Why the drawing is not the latest run's window (false: it is): the code didn't compile, the Java
 * engine couldn't run it, the run was stopped at the time limit, or the program ended without
 * leaving a window (main didn't call launch, start threw, System.exit in start...).
 */
export type WindowFailure = false | "compile" | "engine" | "time" | "none";

/**
 * The window of the latest free run of a JavaFX program, and what it takes to run it again: the
 * compiled program, the code it was compiled from, and the clicks and typing so far. `failed`: the
 * latest run left no window, so `window` is from before (or null: no run left one yet).
 */
export type WindowSession = { code: string; program: CompiledProgram | null; events: string[]; window: WindowState | null; failed: WindowFailure };

/**
 * The window panel's state for a page that runs programs freely. `lock` is the page's own "a run
 * is going on" flag (Run and the window's clicks never overlap); `show` gets every run's result, so
 * the page shows the latest run's output. `stamp` and `isCurrent` tell the page whether reset() ran
 * while its own run was going on (then that run's result belongs to a program no longer shown).
 */
export function useWindowSession(lock: MutableRefObject<boolean>, show: (r: FreeRun) => void) {
  const [session, setSession] = useState<WindowSession | null>(null);
  const [replaying, setReplaying] = useState(false);
  const current = useRef(session);
  current.current = session;
  // Counts reset()s.
  const generation = useRef(0);

  /** The events a Run of this code starts with: the clicks and typing so far, while the code is the one they were made on. */
  const eventsFor = useCallback((code: string) => (current.current && current.current.code === code ? current.current.events : []), []);

  /** After a run of `code` (Run, or the window's own): the window it left, or the earlier one marked out of date. */
  const took = useCallback((code: string, r: FreeRun) => {
    setSession((s) => {
      if (r.status === "ran" && r.program) return { code, program: r.program, events: r.events ?? [], window: r.window ?? s?.window ?? null, failed: r.window ? false : r.run?.timedOut ? "time" : "none" };
      // A program without JavaFX has no window.
      if (r.status === "ran") return null;
      // It didn't compile (or the engine failed): the drawing (if any) stays, out of date.
      return s ? { ...s, failed: r.status === "compile-error" ? "compile" : "engine" } : null;
    });
  }, []);

  const stamp = useCallback(() => generation.current, []);
  const isCurrent = useCallback((g: number) => g === generation.current, []);

  /** Runs the program again from the start with these events. */
  const replay = useCallback(
    async (events: string[]) => {
      const s = current.current;
      if (!s?.program || lock.current) return false;
      lock.current = true;
      setReplaying(true);
      const g = generation.current;
      try {
        const r = await rerun(s.program, events);
        // The page went on to another program meanwhile (Example, a share link): this result is old.
        if (g === generation.current) {
          took(s.code, r);
          show(r);
        }
      } finally {
        lock.current = false;
        setReplaying(false);
      }
      return true;
    },
    [lock, show, took],
  );

  /** Forgets the window (the page shows another program, or no run any more). */
  const reset = useCallback(() => {
    generation.current++;
    setSession(null);
  }, []);

  return { session, replaying, eventsFor, took, replay, reset, stamp, isCurrent };
}

type Pending = { kind: "click" | "enter"; path: string; text: string };
/** The control that had the keyboard focus, to find it again in the next window. */
type FocusTarget = { path: string; kind: DrawnControl["kind"]; text: string; name: string };

const focusTargetOf = (c: DrawnControl): FocusTarget => ({ path: c.path, kind: c.kind, text: c.text, name: c.name });

/** How many leading parts two places share (the nearer, the more). */
function sharedParts(a: string, b: string) {
  const x = a.split("/");
  const y = b.split("/");
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  return i;
}

/**
 * The control in a new window that is the one focused before: an enabled control of the same kind
 * with the same text (a button) or name (a field: its prompt text, or "Text field 2"), the nearest
 * one if there are several; else the enabled one of that kind in the same place.
 */
function sameControl(t: FocusTarget, controls: Map<string, DrawnControl>): DrawnControl | undefined {
  const list = [...controls.values()].filter((c) => c.kind === t.kind && !c.disabled);
  const pool = list.filter((c) => (t.kind === "button" ? c.text === t.text : c.name === t.name));
  if (pool.length) return pool.reduce((best, c) => (sharedParts(c.path, t.path) > sharedParts(best.path, t.path) ? c : best));
  return list.find((c) => c.path === t.path);
}

/** "2 clicks and 1 Enter", for a message about events that weren't sent. */
function clicksAndEnters(list: Pending[]) {
  const clicks = list.filter((p) => p.kind === "click").length;
  const enters = list.length - clicks;
  return [clicks ? `${clicks} ${clicks === 1 ? "click" : "clicks"}` : "", enters ? `${enters} ${enters === 1 ? "Enter" : "Enters"}` : ""].filter(Boolean).join(" and ");
}

/** The note over a drawing that isn't the latest run's window. */
const STALE_NOTE: Record<Exclude<WindowFailure, false>, string> = {
  compile: "Out of date: your code didn't compile, so this is the window from the last run that did.",
  engine: "Out of date: the Java engine couldn't run your program this time, so this is the window from the run before.",
  time: "Out of date: the last run was stopped at the time limit before it left a window, so this is the one from before it.",
  none: "Out of date: the last run didn't leave a window, so this is the one from before it.",
};

/**
 * The window panel: the latest run's windows, whose enabled buttons and fields work. A click (and
 * typing, once the learner pauses for 600 ms, leaves the field or presses Enter) runs the program
 * again with one more event; typing is sent as `type #N "what was added"` when it only adds at the
 * end, else as `set #N "the whole text"`, and a click sends pending typing first. A button whose
 * text is its own (click Button "Add") and a node with an id of its own (#name) are named by them,
 * not by their number (see DrawnControl's target). While a run goes
 * on, the old drawing stays; clicks and Enters made then wait in line and are sent one run at a
 * time, each checked against the window the run before left (its numbers can change). Typing made
 * then is kept, on top of what the run did to the field. "Start over" forgets the events. A drawing
 * the latest run (or the code) left behind is marked out of date and can't be used.
 */
export function WindowPanel({ session, replaying, replay, codeChanged }: { session: WindowSession; replaying: boolean; replay: (events: string[]) => Promise<boolean>; codeChanged: boolean }) {
  const drawn = useMemo(() => drawWindows(session.window), [session.window]);
  // The controls by their place, and the window's outline.
  const controls = useMemo(() => {
    const map = new Map<string, DrawnControl>();
    const walk = (d: Drawn) => {
      if (d.control) map.set(d.control.path, d.control);
      d.kids?.forEach(walk);
    };
    drawn.forEach((w) => w.scene && walk(w.scene));
    return map;
  }, [drawn]);
  const outline = useMemo(() => windowOutline(session.window), [session.window]);
  const usable = !session.failed && !codeChanged && session.program != null;
  // The latest run left a window file, but start never showed the stage.
  const notShown = !session.failed && neverShown(session.window);

  // Typing not sent yet, by the field's place (the text the field shows).
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const draftsRef = useRef(drafts);
  // What each text field showed when the run going on started (its draft, or its text), and the
  // fields the learner changed since in more than adding at the end: when the new window comes, a
  // draft that only added to that text is moved onto the field's new text (the run may have changed it).
  const base = useRef<Record<string, string>>({});
  const edited = useRef(new Set<string>());
  // Clicks and Enters made while a run went on, oldest first.
  const queue = useRef<Pending[]>([]);
  const focusTarget = useRef<FocusTarget | null>(null);
  const panelRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pressed = useRef(0);
  const [message, setMessage] = useState("");
  const [said, setSaid] = useState("");
  const latest = useRef({ session, controls, replaying, usable });
  latest.current = { session, controls, replaying, usable };

  const setDraftsNow = (next: Record<string, string>) => {
    draftsRef.current = next;
    setDrafts(next);
  };
  const tell = (msg: string) => {
    setMessage(msg);
    setSaid(msg);
  };
  /** Forgets the clicks and Enters waiting for a run, saying how many and why. */
  const dropQueue = (why: string) => {
    const list = queue.current;
    queue.current = [];
    if (list.length) tell(`${clicksAndEnters(list)} made while your program was running ${list.length === 1 ? "wasn't" : "weren't"} sent, because ${why}. Do it again if you still want to.`);
  };

  /** The event lines for the typing not sent yet, against the window as drawn. */
  const typedEvents = () => {
    const out: { n: number; line: string }[] = [];
    for (const [path, text] of Object.entries(draftsRef.current)) {
      const c = latest.current.controls.get(path);
      if (!c || c.kind === "button" || c.disabled || !c.editable || text === c.text) continue;
      out.push({ n: c.n, line: text.startsWith(c.text) ? `type ${c.target} ${quoteText(text.slice(c.text.length))}` : `set ${c.target} ${quoteText(text)}` });
    }
    return out.sort((a, b) => a.n - b.n).map((e) => e.line);
  };

  /** Notes what every text field shows as a run starts. */
  const markBase = () => {
    const b: Record<string, string> = {};
    for (const c of latest.current.controls.values()) if (c.kind !== "button") b[c.path] = draftsRef.current[c.path] ?? c.text;
    base.current = b;
    edited.current = new Set();
  };

  /** Sends the typing not sent yet, then `extra` (a click or Enter): runs the program again with them. */
  const send = (extra: string[] = []) => {
    clearTimeout(timer.current);
    const { session: s, replaying: busy, usable: ok } = latest.current;
    if (!ok || busy) return false;
    const typed = typedEvents();
    if (!typed.length && !extra.length) return false;
    markBase();
    setMessage("");
    setSaid("Running your program again with your clicks and typing.");
    void replay([...s.events, ...typed, ...extra]).then((started) => {
      // The page's own Run was going on: nothing was sent, so the typing is still to send.
      if (started) return;
      base.current = {};
      tell(`Your program was already running. Wait for it to finish, then click or type again.${extra.length ? " Your last click or Enter wasn't sent." : ""}`);
    });
    return true;
  };
  const sendLater = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => send(), 600);
  };

  /**
   * After a new window: the keyboard focus goes back to the control that had it, when the new
   * drawing lost it (the element was replaced) or moved it to another control (the elements were
   * reused for other nodes); with no such control, to Start over (or the panel's heading). Focus the
   * learner moved out of the panel stays where it is.
   */
  const restoreFocus = () => {
    const t = focusTarget.current;
    const box = panelRef.current;
    if (!t || !box) return;
    const active = document.activeElement as HTMLElement | null;
    const inPanel = !!active && box.contains(active);
    if (active && active !== document.body && !inPanel) {
      focusTarget.current = null;
      return;
    }
    const at = inPanel ? active!.dataset.fxPath : undefined;
    // Focus on something else in the panel (Start over, the window as text) stays there.
    if (inPanel && at === undefined) return;
    const { controls: now, usable: ok } = latest.current;
    const match = ok ? sameControl(t, now) : undefined;
    if (match && at === match.path) {
      focusTarget.current = focusTargetOf(match);
      return;
    }
    const el = match ? box.querySelector<HTMLElement>(`[data-fx-path="${CSS.escape(match.path)}"]`) : null;
    if (el && match) {
      el.focus({ preventScroll: true });
      focusTarget.current = focusTargetOf(match);
      return;
    }
    focusTarget.current = null;
    (box.querySelector<HTMLElement>(".fx-start-over") ?? headingRef.current)?.focus({ preventScroll: true });
  };

  // A new window: typing that was sent is now in it; typing since then is still to send, moved onto
  // what the run left in the field. The oldest click or Enter that waited for the run is made now,
  // if its button or field is still there.
  const lastCode = useRef(session.code);
  const first = useRef(true);
  useEffect(() => {
    // The first window comes with the page's own news of the run (a window never shown is the panel's to say).
    if (first.current) {
      first.current = false;
      if (neverShown(session.window) && !session.failed) setSaid(NOT_SHOWN_NOTE);
      return;
    }
    if (lastCode.current !== session.code) {
      lastCode.current = session.code;
      setSaid(neverShown(session.window) && !session.failed ? NOT_SHOWN_NOTE : "");
      dropQueue("your code changed");
      base.current = {};
      edited.current = new Set();
      setDraftsNow({});
      restoreFocus();
      return;
    }
    const was = base.current;
    const changed = edited.current;
    base.current = {};
    edited.current = new Set();
    const keep: Record<string, string> = {};
    for (const [path, text] of Object.entries(draftsRef.current)) {
      const c = controls.get(path);
      if (!c || c.kind === "button") continue;
      let next = text;
      // A run that failed changed nothing in the window: the typing stays as it is.
      if (!session.failed && was[path] !== undefined) {
        if (text === was[path]) continue;
        if (!changed.has(path) && text.startsWith(was[path])) next = c.text + text.slice(was[path].length);
      }
      if (next !== c.text) keep[path] = next;
    }
    setDraftsNow(keep);
    if (session.failed) {
      dropQueue(session.failed === "time" ? "that run was stopped at the time limit" : session.failed === "none" ? "that run didn't leave a window" : "the window couldn't be updated");
      if (session.failed === "time") setSaid(session.window ? "The program was stopped at the time limit, so the drawing is out of date." : "The program was stopped at the time limit before it left a window.");
      else if (session.failed === "none") setSaid(session.window ? "The program didn't leave a window this time, so the drawing is out of date." : "The program didn't leave a window.");
      restoreFocus();
      return;
    }
    if (!latest.current.usable) {
      dropQueue("your code changed");
      restoreFocus();
      return;
    }
    setSaid(neverShown(session.window) ? NOT_SHOWN_NOTE : session.window ? "The window is updated." : "");
    restoreFocus();
    let sentNow = false;
    while (queue.current.length && !sentNow) {
      const p = queue.current.shift()!;
      const c = controls.get(p.path);
      if (!c || c.disabled || (p.kind === "click" ? c.kind !== "button" || c.text !== p.text : c.kind === "button" || c.kind === "area")) {
        queue.current.unshift(p);
        dropQueue("the window changed first");
        break;
      }
      // A button or field without a handler: nothing to send unless there is typing.
      sentNow = send(c.onAction ? [`${p.kind} ${c.target}`] : []);
    }
    if (!sentNow && Object.keys(keep).length) sendLater();
  }, [session]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const live: Live = {
    draft: (c) => drafts[c.path],
    onPress: () => (pressed.current = Date.now()),
    onFocus: (c) => (focusTarget.current = focusTargetOf(c)),
    onClick: (c) => {
      if (!latest.current.usable || c.disabled) return;
      if (latest.current.replaying) {
        queue.current.push({ kind: "click", path: c.path, text: c.text });
        return;
      }
      if (!c.onAction && !typedEvents().length) {
        tell(`The button ${quoteText(c.text)} has no handler (setOnAction), so clicking it does nothing.`);
        return;
      }
      send(c.onAction ? [`click ${c.target}`] : []);
    },
    onType: (c, text) => {
      if (!c.editable || c.disabled) return;
      setDraftsNow({ ...draftsRef.current, [c.path]: text });
      if (!latest.current.replaying) return sendLater();
      // During a run: an edit that isn't only adding at the end makes the field's typing a `set`.
      const from = base.current[c.path];
      if (from !== undefined && !text.startsWith(from)) edited.current.add(c.path);
    },
    onKey: (c, e) => {
      if (e.key !== "Enter" || c.kind === "area" || e.nativeEvent.isComposing) return;
      e.preventDefault();
      if (latest.current.replaying) {
        queue.current.push({ kind: "enter", path: c.path, text: c.text });
        return;
      }
      if (!c.onAction && !typedEvents().length) {
        tell("This text field has no handler (setOnAction), so Enter does nothing.");
        return;
      }
      send(c.onAction ? [`enter ${c.target}`] : []);
    },
    onLeave: () => {
      // Leaving a field for one of the window's buttons: that click sends the typing with it.
      if (Date.now() - pressed.current < 800) return;
      if (!latest.current.replaying) send();
    },
  };

  const startOver = () => {
    if (replaying || !session.events.length) return;
    clearTimeout(timer.current);
    queue.current = [];
    setDraftsNow({});
    markBase();
    setMessage("");
    setSaid("Starting over: running your program with no clicks or typing.");
    void replay([]);
  };

  const hasControls = [...controls.values()].some((c) => !c.disabled);
  const stale = session.failed ? "failed" : codeChanged ? "code" : null;
  return (
    <section ref={panelRef} className={"fx-panel" + (stale ? " fx-stale" : "")} aria-labelledby="fx-panel-h" aria-busy={replaying || undefined}>
      <div className="fx-panel-head">
        <span id="fx-panel-h" className="lbl" tabIndex={-1} ref={headingRef}>
          Your window <span className="fx-approx">(drawn approximately)</span>
        </span>
        {replaying && (
          <span className="fx-busy">
            <span className="fx-spinner" aria-hidden="true" /> Running again…
          </span>
        )}
        {/* Always there (aria-disabled, not removed, when there's nothing to forget), so the keyboard focus stays on it. */}
        {!codeChanged && session.program && (
          <button type="button" className="btn btn-sm fx-start-over" onClick={startOver} aria-disabled={replaying || !session.events.length || undefined}>
            <RotateCcw className="icon" aria-hidden="true" /> Start over
          </button>
        )}
      </div>
      <p className="fx-note">Java Arena draws your window and runs your program again from the start for each click, with your earlier clicks and typing.</p>
      {session.failed && session.window && <p className="fx-stale-note">{STALE_NOTE[session.failed]}</p>}
      {stale === "code" && <p className="fx-stale-note">Out of date: your code changed since this run. Run it again to use the window.</p>}
      {!usable || !drawn.length ? (
        // No window yet (the first run left none): the outline's "No window is open." and why.
        <WindowDrawing window={session.window} label={stale && session.window ? `${drawingLabel(session.window)}, out of date` : undefined} />
      ) : (
        <Frame label={drawingLabel(session.window)} focusable={!hasControls} deps={[drawn]}>
          <div className="fx-desktop">
            {drawn.map((d) => (
              <WindowFrame key={d.key} w={d} live={live} />
            ))}
          </div>
        </Frame>
      )}
      {!session.window && session.failed === "time" && <p className="fx-stale-note">Your program was stopped at the time limit before it left a window.</p>}
      {!session.window && session.failed === "none" && <p className="fx-stale-note">Your program ended before it left a window: main must call launch, as in launch(Main.class), and start must run to its end. The output below may say why.</p>}
      {notShown && <p className="fx-stale-note">{NOT_SHOWN_NOTE}</p>}
      {message && <p className="fx-message">{message}</p>}
      {session.window && session.window.problems.length > 0 && (
        <ul className="rules" aria-label="Clicks and typing that couldn't happen">
          {session.window.problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {session.window && <WindowText outline={outline} />}
      <p className="visually-hidden" role="status" aria-live="polite">
        {said}
      </p>
    </section>
  );
}
