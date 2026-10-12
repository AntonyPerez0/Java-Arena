// JavaFX windows on the page, drawn from the window JSON of Java Arena's practice version of JavaFX
// (the drawing itself is decided in ./window-drawing.ts, which lesson text and the pre-rendered
// pages share):
// - WindowFigure: a window that can't be used (the task card's "The window should look like"),
//   with "The window as text" under it, folded;
// - WindowCompare: a test's expected window next to the learner's, the lines that differ marked;
// - WindowPanel: a free run's window (the Playground, a lesson's "Run with my input"), whose
//   buttons and fields work. Each click or typing is an event line (click Button "Add", type #3 "Ada"); the
//   page runs the compiled program again from the start with all the events so far
//   (useWindowSession), and draws the window it then leaves. A slider sends `set Slider 1 25` when
//   it is let go (or the arrow keys stop); a canvas or image view with mouse handlers takes a
//   gesture of the mouse or a finger and sends it at once when the finger lifts (press, the drags
//   every few pixels, release; a tap is `click Canvas 1 at 10 20`), and the keyboard can do the same.
//   A game (part 14.3) gets a row of keys to hold and Run 30, 60 or 120 frames (GameKeys).
// A window with frames gets the animation player under it (window-player.ts, through usePlayer).
import { Fragment, createElement, useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MutableRefObject, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from "react";
import { RotateCcw } from "lucide-react";
import { rerun, timeLimitFor, type CompiledProgram, type FreeRun } from "../grader/grade";
import { NOT_SHOWN_NOTE, keyName, mouseNotices, neverShown, quoteText, windowOutline, type DrawCall, type OutlineLine, type WindowCheck, type WindowState } from "../grader/window";
import { TITLE_BUTTONS_SVG, WIDE_NOTE, drawWindows, drawingLabel, outlineLines, sliderValueText, type Drawn, type DrawnControl, type DrawnWindow } from "./window-drawing";
import { paintCalls } from "./window-canvas";
import { useWindowFrames } from "./window-frame";
import { hasFrames } from "./window-frames";
import { attachPlayer } from "./window-player";
import { RUN_FRAMES, hasKeyHandlers, heldAfter, keyCodeOf, nodeKeyHandlers, offeredKeys, runLines } from "./game-keys";

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
  /** A slider let go at a value (false: nothing was sent, so it goes back to its value). */
  onSlide: (c: DrawnControl, value: number) => boolean;
  /** A gesture on a canvas or image view, as its event lines for a target (false: it can't be sent). */
  onGesture: (c: DrawnControl, lines: (target: string) => string[]) => boolean;
  /** The id of the keyboard help of canvases and image views, and whether one of them has the focus from the keyboard (the help then shows). */
  keysHelp: string;
  onSurfaceFocus: (focused: boolean) => void;
};

// ------------------------------------------------------------------ canvases

/** Replays a canvas's calls on an HTML canvas element, sharp on the screen's pixels (at most 16 million of them). */
function paintCanvas(el: HTMLCanvasElement | null, width: number, height: number, calls: DrawCall[]) {
  if (!el) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const k = Math.max(0.1, Math.min(dpr, Math.sqrt(16e6 / Math.max(1, width * height))));
  el.width = Math.max(1, Math.round(width * k));
  el.height = Math.max(1, Math.round(height * k));
  const ctx = el.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.clearRect(0, 0, width, height);
  paintCalls(ctx, calls);
}

function CanvasPicture({ canvas }: { canvas: NonNullable<Drawn["canvas"]> }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height, calls } = canvas;
  useLayoutEffect(() => paintCanvas(ref.current, width, height, calls), [width, height, calls]);
  return <canvas ref={ref} className="fx-canvas-el" style={{ width, height }} aria-hidden="true" />;
}

/** A gesture of the mouse or a finger going on: where it started (in the node's coordinates and in CSS pixels), its drags so far. */
type Point = { x: number; y: number; sx: number; sy: number };
type Gesture = { id: number; start: Point; last: Point; drags: Point[]; moved: boolean };

/**
 * A gesture's drags are sampled every this many CSS pixels, at most this many: past it, every other
 * drag is dropped (the last kept), so a long stroke keeps its shape with fewer points.
 */
const SAMPLE_PX = 4;
const MAX_DRAGS = 400;

/** A gesture's drags with one more, thinned (see MAX_DRAGS) when there are too many. */
function withDrag<T>(drags: T[], p: T): T[] {
  const all = [...drags, p];
  return all.length <= MAX_DRAGS ? all : all.filter((_, i) => i % 2 === 1 || i === all.length - 1);
}

/**
 * A canvas or image view with mouse handlers, in the window panel: the learner draws on it with the
 * mouse or a finger (a tap is a click), and the gesture goes to the program in one batch when the
 * finger lifts; the line drawn meanwhile is only a preview. With the keyboard, the arrow keys move a
 * point (5 pixels on a canvas, Shift: one; one pixel of an image view), Enter clicks there, Space presses the mouse there and, after
 * the arrow keys drag it, lets it go; Escape forgets a press.
 */
function LivePointer({ d, live }: { d: Drawn; live: Live }) {
  const c = d.control!;
  const ptr = c.pointer!;
  const surface = useRef<HTMLSpanElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [point, setPoint] = useState<{ x: number; y: number } | null>(null);
  const [held, setHeld] = useState<{ start: { x: number; y: number }; drags: { x: number; y: number }[] } | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const shownW = ptr.width * ptr.scale;
  const shownH = ptr.height * ptr.scale;

  const clearPreview = () => {
    const el = preview.current;
    el?.getContext("2d")?.clearRect(0, 0, el.width, el.height);
  };
  // A new drawing came: the preview's line is in it now (or the gesture is waiting for its run).
  useEffect(() => {
    clearPreview();
    setHeld(null);
  }, [c]);
  useLayoutEffect(() => {
    const el = preview.current;
    if (!el) return;
    const k = Math.min(window.devicePixelRatio || 1, 3);
    el.width = Math.max(1, Math.round(shownW * k));
    el.height = Math.max(1, Math.round(shownH * k));
    el.getContext("2d")?.setTransform(k, 0, 0, k, 0, 0);
  }, [shownW, shownH]);

  const line = (a: Point, b: Point) => {
    const ctx = preview.current?.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "rgba(10, 95, 166, 0.85)";
    ctx.fillStyle = "rgba(10, 95, 166, 0.85)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (a === b) {
      ctx.arc(a.sx, a.sy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    }
  };
  const at = (e: { clientX: number; clientY: number }): Point => {
    const r = surface.current!.getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    return { x: Math.floor(sx / ptr.scale), y: Math.floor(sy / ptr.scale), sx, sy };
  };
  const send = (lines: (t: string) => string[]) => {
    if (!live.onGesture(c, lines)) clearPreview();
  };

  const down = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (c.disabled || gesture.current || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.preventDefault();
    surface.current?.focus({ preventScroll: true });
    setKeyboard(false);
    surface.current?.setPointerCapture(e.pointerId);
    live.onPress();
    const p = at(e);
    gesture.current = { id: e.pointerId, start: p, last: p, drags: [], moved: false };
    line(p, p);
  };
  const move = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    const p = at(e);
    if (!g.moved && Math.hypot(p.sx - g.start.sx, p.sy - g.start.sy) >= SAMPLE_PX) g.moved = true;
    if (g.moved && Math.hypot(p.sx - g.last.sx, p.sy - g.last.sy) >= SAMPLE_PX && (p.x !== g.last.x || p.y !== g.last.y)) {
      line(g.last, p);
      g.drags = withDrag(g.drags, p);
      g.last = p;
    }
  };
  const up = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const g = gesture.current;
    if (!g || e.pointerId !== g.id) return;
    gesture.current = null;
    const end = at(e);
    if (!g.moved) {
      send((t) => [`click ${t} at ${g.start.x} ${g.start.y}`]);
      return;
    }
    line(g.last, end);
    send((t) => [`press ${t} at ${g.start.x} ${g.start.y}`, ...g.drags.map((q) => `drag ${t} to ${q.x} ${q.y}`), `release ${t} at ${end.x} ${end.y}`]);
  };
  const cancel = () => {
    gesture.current = null;
    clearPreview();
  };

  const key = (e: KeyboardEvent<HTMLSpanElement>) => {
    if (c.disabled) return;
    const step = c.kind === "image" || e.shiftKey ? 1 : 5;
    live.onSurfaceFocus(true);
    const from = point ?? { x: Math.floor(ptr.width / 2), y: Math.floor(ptr.height / 2) };
    const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    setKeyboard(true);
    if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      const to = { x: Math.min(Math.max(from.x + dx, 0), Math.max(0, Math.ceil(ptr.width) - 1)), y: Math.min(Math.max(from.y + dy, 0), Math.max(0, Math.ceil(ptr.height) - 1)) };
      setPoint(to);
      if (held && (to.x !== from.x || to.y !== from.y)) setHeld({ ...held, drags: withDrag(held.drags, to) });
    } else if (e.key === "Enter" && !held) {
      e.preventDefault();
      setPoint(from);
      live.onPress();
      send((t) => [`click ${t} at ${from.x} ${from.y}`]);
    } else if (e.key === " ") {
      e.preventDefault();
      setPoint(from);
      if (!held) setHeld({ start: from, drags: [] });
      else {
        const h = held;
        setHeld(null);
        live.onPress();
        send((t) => [`press ${t} at ${h.start.x} ${h.start.y}`, ...h.drags.map((q) => `drag ${t} to ${q.x} ${q.y}`), `release ${t} at ${from.x} ${from.y}`]);
      }
    } else if (e.key === "Escape" && held) {
      e.preventDefault();
      setHeld(null);
    }
  };

  const shownPoint = keyboard ? (point ?? { x: Math.floor(ptr.width / 2), y: Math.floor(ptr.height / 2) }) : null;
  const picture = d.canvas ? <CanvasPicture canvas={d.canvas} /> : d.kids?.filter((k) => k.tag === "img").map((k) => toReact(k));
  const area = (
    <span
      ref={surface}
      className={"fx-pointer" + (held ? " fx-held" : "")}
      style={{ width: shownW, height: shownH }}
      role="application"
      tabIndex={c.disabled ? -1 : 0}
      aria-label={c.name}
      aria-describedby={live.keysHelp}
      aria-disabled={c.disabled || undefined}
      data-fx-path={c.path}
      onFocus={(e) => {
        live.onFocus(c);
        // The keyboard's help shows for keyboard focus, not after a gesture of the mouse or a finger.
        live.onSurfaceFocus(e.currentTarget.matches(":focus-visible"));
      }}
      onBlur={() => {
        live.onSurfaceFocus(false);
        setKeyboard(false);
        setHeld(null);
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={cancel}
      onLostPointerCapture={(e) => gesture.current?.id === e.pointerId && up(e)}
      onKeyDown={key}
    >
      {picture}
      <canvas ref={preview} className="fx-gesture" style={{ width: shownW, height: shownH }} aria-hidden="true" />
      {shownPoint && <span className="fx-point" style={{ left: (shownPoint.x + 0.5) * ptr.scale, top: (shownPoint.y + 0.5) * ptr.scale }} aria-hidden="true" />}
    </span>
  );
  return (
    <span className={d.cls} style={d.style} {...d.attrs}>
      {area}
      {d.kids?.filter((k) => k.tag !== "img").map((k) => toReact(k))}
    </span>
  );
}

// ------------------------------------------------------------------ sliders

/**
 * How the arrow keys, Page Up and Down, Home and End move a slider. Page Up and Down move it by its
 * block increment, as JavaFX's keys do (a slider that snaps to ticks: at least the ticks' spacing,
 * SliderBehavior's computeIncrement). The arrow keys move a slider that snaps by one tick, and one
 * that doesn't by its block increment, except that no arrow press crosses the whole range at once
 * (then a tenth of it): JavaFX's default block increment (10) would take a slider of 1 to 5 from end
 * to end, and a keyboard could never reach the values between.
 */
function sliderKey(key: string, v: number, s: NonNullable<DrawnControl["slider"]>): number | null {
  const clamp = (x: number) => Math.min(Math.max(x, s.min), s.max);
  const page = s.snap ? Math.max(s.block, s.snap) : s.block;
  const range = s.max - s.min;
  const arrow = s.snap ? s.snap : s.block >= range ? range / 10 : s.block;
  switch (key) {
    case "PageUp":
      return clamp(v + page);
    case "PageDown":
      return clamp(v - page);
    case "ArrowRight":
    case "ArrowUp":
      return clamp(v + arrow);
    case "ArrowLeft":
    case "ArrowDown":
      return clamp(v - arrow);
    case "Home":
      return s.min;
    case "End":
      return s.max;
    default:
      return null;
  }
}

/**
 * A slider in the window panel: a real range input, with the slider's tick marks and labels drawn
 * under it. Let go (or clicked on its track), it sends its value at once; moved with the keys (see
 * sliderKey), it sends once they stop for 600 ms or the focus leaves.
 * It shows the program's own value as it is (JavaFX doesn't snap a setValue); a slider that snaps to
 * ticks snaps only what the learner does: each key press, and a drag when it is let go (onSlide), as
 * JavaFX's keys and thumb do.
 */
function LiveSlider({ d, live }: { d: Drawn; live: Live }) {
  const c = d.control!;
  const s = c.slider!;
  const [draft, setDraft] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const keyTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const keyed = useRef<number | null>(null);
  const liveRef = useRef(live);
  liveRef.current = live;
  // A new window: the slider shows its value there.
  useEffect(() => setDraft(null), [c]);
  useEffect(() => () => clearTimeout(keyTimer.current), []);
  // The input's change event: the pointer let it go (the arrow keys are handled below).
  useEffect(() => {
    const el = input.current;
    if (!el) return;
    const changed = () => {
      // Let go: a slider that snaps shows the tick it goes to, as JavaFX's thumb jumps there.
      if (c.slider?.snap) setDraft(Number(sliderValueText(Number(el.value), c.slider)));
      if (!liveRef.current.onSlide(c, Number(el.value))) setDraft(null);
    };
    el.addEventListener("change", changed);
    return () => el.removeEventListener("change", changed);
  }, [c]);
  const flush = () => {
    clearTimeout(keyTimer.current);
    if (keyed.current != null && !liveRef.current.onSlide(c, keyed.current)) setDraft(null);
    keyed.current = null;
  };
  const usable = s.max > s.min;
  const shown = draft ?? s.value;
  return (
    <span className={d.cls} style={d.style} {...d.attrs}>
      <input
        ref={input}
        type="range"
        className="fx-range"
        min={s.min}
        max={usable ? s.max : s.min + 1}
        step="any"
        value={shown}
        disabled={c.disabled || !usable}
        aria-label={c.name}
        aria-valuetext={sliderValueText(shown, { ...s, snap: undefined })}
        data-fx-path={c.path}
        style={{ "--fx-fill": `${usable ? ((shown - s.min) / (s.max - s.min)) * 100 : 0}%` } as CSSProperties}
        onFocus={() => live.onFocus(c)}
        onPointerDown={live.onPress}
        onChange={(e) => setDraft(Number(e.currentTarget.value))}
        onKeyDown={(e) => {
          const k = sliderKey(e.key, keyed.current ?? shown, s);
          if (k == null) return;
          e.preventDefault();
          // Snapped (and rounded) now, so what is shown and announced is what will be sent.
          const v = Number(sliderValueText(k, s));
          setDraft(v);
          keyed.current = v;
          clearTimeout(keyTimer.current);
          keyTimer.current = setTimeout(flush, 600);
        }}
        onBlur={flush}
      />
      {d.kids?.filter((k) => k.key === "marks" || k.key === "labels").map((k) => toReact(k))}
    </span>
  );
}

function LiveControl({ d, live }: { d: Drawn; live: Live }) {
  const c = d.control!;
  if (c.kind === "slider") return <LiveSlider d={d} live={live} />;
  if (c.kind === "canvas" || c.kind === "image") return <LivePointer d={d} live={live} />;
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

/** Attributes as React takes them: stroke-width is strokeWidth (aria- and data- attributes keep their dashes). */
function reactAttrs(attrs: Record<string, string> | undefined): Record<string, string> | undefined {
  if (!attrs) return attrs;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(attrs)) out[/^(aria|data)-/.test(k) ? k : k.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())] = v;
  return out;
}

function toReact(d: Drawn, live?: Live): ReactNode {
  if (d.control && live) return <LiveControl key={d.key} d={d} live={live} />;
  const props = { key: d.key, className: d.cls, style: d.style, ...reactAttrs(d.attrs) };
  if (d.canvas) return createElement(d.tag, props, <CanvasPicture canvas={d.canvas} />);
  if (d.markup != null) return createElement(d.tag, { ...props, dangerouslySetInnerHTML: { __html: d.markup } });
  if (d.tag === "img") return createElement("img", props);
  return createElement(d.tag, props, d.text ?? d.kids?.map((k) => toReact(k, live)));
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
function Frame({ label, focusable, deps, anim, children }: { label: string; focusable: boolean; deps: unknown[]; anim?: RefObject<HTMLDivElement>; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useWindowFrames(ref, deps);
  return (
    <div className="fx-frame" ref={ref}>
      <div className="fx-scroll" {...(focusable ? { tabIndex: 0, role: "group", "aria-label": label } : {})}>
        {/* The animation's frames are drawn here (window-player.ts), never by React. */}
        {anim && <div className="fx-desktop fx-anim" ref={anim} />}
        {children}
      </div>
      <p className="fx-wide-note">{WIDE_NOTE}</p>
    </div>
  );
}

/**
 * A window JSON drawn, not usable: in a frame that scrolls sideways when the windows are wider than
 * the column. The drawing is hidden from screen readers (the window as text has it all). No window
 * showing: the outline's sentence instead. A window with frames gets the player, which plays once
 * by itself when it first comes into view; with `autoplay` false (the window panel's window from an
 * earlier run, out of date or after a failed run) it shows the window after the last event and
 * never plays by itself.
 */
export function WindowDrawing({ window: w, label, autoplay = true }: { window: WindowState | null | undefined; label?: string; autoplay?: boolean }) {
  const drawn = useMemo(() => drawWindows(w), [w]);
  const player = usePlayer(drawn.length ? w : null, 1, autoplay);
  if (!drawn.length) return <p className="fx-none">{windowOutline(w)}</p>;
  return (
    <>
      <Frame label={label ?? drawingLabel(w)} focusable deps={[drawn]} anim={player.on ? player.anim : undefined}>
        <div className="fx-desktop" aria-hidden="true">
          {drawn.map((d) => (
            <WindowFrame key={d.key} w={d} />
          ))}
        </div>
      </Frame>
      {player.on && <div className="fx-player-box" ref={player.controls} />}
    </>
  );
}

/**
 * The animation player of a window with frames (window-player.ts), from frame `from`: the anim
 * layer goes in the window's Frame, the controls in their own box under it. `on`: the window has
 * frames to play (a test's stored window has only their count).
 */
function usePlayer(w: WindowState | null | undefined, from: number, autoplay: boolean, visible?: number) {
  const anim = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const on = hasFrames(w);
  useEffect(() => {
    if (!on || !w || !anim.current || !controls.current) return;
    return attachPlayer({ controls: controls.current, anim: anim.current, window: w, from, autoplay, visible });
  }, [on, w, from, autoplay, visible]);
  return { on, anim, controls };
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
export type WindowSession = { code: string; program: CompiledProgram | null; events: string[]; window: WindowState | null; failed: WindowFailure; ms?: number };

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
      if (r.status === "ran" && r.program) return { code, program: r.program, events: r.events ?? [], window: r.window ?? s?.window ?? null, failed: r.window ? false : r.run?.timedOut ? "time" : "none", ms: r.run?.ms };
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

/**
 * A click, an Enter, a slider let go or a gesture on a canvas or image view, made while a run went
 * on: sent after it, checked against the window that run left. A slider's and a gesture's event
 * lines are made for the target the new window names the control by.
 */
type Pending = { kind: "click" | "enter"; path: string; text: string } | { kind: "events"; path: string; control: DrawnControl["kind"]; lines: (target: string) => string[] };

/** Whether a control is a text input (a text field, password field or text area). */
const isText = (c: DrawnControl) => c.kind === "field" || c.kind === "password" || c.kind === "area";
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

/** "2 clicks and 1 Enter", "1 slider move", for a message about events that weren't sent. */
function clicksAndEnters(list: Pending[]) {
  const count = (n: number, one: string, many: string) => (n ? `${n} ${n === 1 ? one : many}` : "");
  const clicks = list.filter((p) => p.kind === "click").length;
  const enters = list.filter((p) => p.kind === "enter").length;
  const slides = list.filter((p) => p.kind === "events" && p.control === "slider").length;
  const drawings = list.filter((p) => p.kind === "events" && p.control !== "slider").length;
  const parts = [count(clicks, "click", "clicks"), count(enters, "Enter", "Enters"), count(slides, "slider move", "slider moves"), count(drawings, "use of the mouse", "uses of the mouse")].filter(Boolean);
  return parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}` : parts.join("");
}

/**
 * The line under a window with canvases or image views the learner can use: "Draw on" when one of
 * them takes a press, drag or release (else "Click"), naming the kinds it is about.
 */
function pointerNote(pointers: DrawnControl[]): string {
  const drawing = pointers.filter((c) => c.pointer?.draws);
  const about = drawing.length ? drawing : pointers;
  const canvas = about.some((c) => c.kind === "canvas");
  const image = about.some((c) => c.kind === "image");
  const what = canvas && image ? "the canvas or the image" : canvas ? "the canvas" : "the image";
  if (drawing.length) return `Draw on ${what} with the mouse or a finger: the ${canvas && !image ? "drawing" : "window"} updates when you lift your finger.`;
  return `Click ${what} with the mouse or a finger: the window updates when you lift your finger.`;
}

/**
 * The keyboard's help for canvases and image views: Shift steps one pixel only on a canvas (an
 * image view's arrow keys already move one pixel), and Space's press and drag only matter where a
 * press, drag or release has a handler.
 */
function pointerKeysHelp(pointers: DrawnControl[]): string {
  const shift = pointers.some((c) => c.kind === "canvas") ? " (with Shift, one pixel at a time)" : "";
  if (!pointers.some((c) => c.pointer?.draws)) return `With the keyboard: the arrow keys move the point${shift}, and Enter clicks there.`;
  return `With the keyboard: the arrow keys move the point${shift}, Enter clicks there, and Space presses the mouse there and, after the arrow keys move it, lets it go.`;
}

/** A run that took this share of the time limit or more, with events: the panel warns that each event adds to it. */
const SLOW_SHARE = 0.4;

/** The warning about a run made slow by the events so far (see SLOW_SHARE). */
function slowNote(ms: number, limit: number): string {
  const secs = (n: number) => `${Math.round(n / 1000)} seconds`;
  return `Your program took ${secs(ms)} to run again with everything you did in the window, and each click, key, frame, slider move or stroke you draw makes the next run longer. A run is stopped after ${secs(limit)}: Start over forgets what you did, so the runs are quick again.`;
}

/** Arrows drawn next to the arrow keys' names (hidden from screen readers, which say the name). */
const KEY_GLYPHS: Record<string, string> = { LEFT: "\u2190", RIGHT: "\u2192", UP: "\u2191", DOWN: "\u2193" };

/**
 * The key row of a game in a free run: each key a toggle, held or not; Run 30, 60 or 120 frames
 * sends, for each key whose held state changed since the last run, press key X or release key X,
 * then the frames line; a Tap (in a small menu) sends key X, a press and release with no frames
 * between. While the row has the focus, a key of a real keyboard holds or lets go of that key
 * (Space and Enter on a key of the row press that button, as buttons do). A program with timers but
 * no key handlers gets only the Run buttons.
 */
function GameKeys({ code, events, keys: withKeys, nodeOnly, replaying, send }: { code: string; events: string[]; keys: boolean; nodeOnly: boolean; replaying: boolean; send: (lines: string[]) => void }) {
  const keys = useMemo(() => (withKeys ? offeredKeys(code, events) : []), [withKeys, code, events]);
  const held = useMemo(() => heldAfter(events), [events]);
  const [want, setWant] = useState<Set<string>>(() => new Set(held));
  // Start over (or new code): nothing is held any more.
  useEffect(() => {
    if (!events.length) setWant(new Set());
  }, [events]);
  const hint = useId();
  const toggle = (k: string) =>
    setWant((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.key === "Tab") return;
    // Space and Enter on one of the row's buttons press it.
    if (e.target !== e.currentTarget && (e.key === " " || e.key === "Enter")) return;
    const k = keyCodeOf(e.key, e.code);
    if (!k || !keys.includes(k)) return;
    e.preventDefault();
    if (!e.repeat) toggle(k);
  };
  const changed = keys.some((k) => want.has(k) !== held.has(k));
  return (
    <div className="fx-game">
      {keys.length > 0 && (
        <>
          <div className="fx-key-row" role="group" aria-label="Keys to hold" aria-describedby={hint} tabIndex={0} onKeyDown={onKeyDown}>
            {keys.map((k) => (
              <button key={k} type="button" className={"btn fx-key" + (want.has(k) ? " fx-key-held" : "")} aria-pressed={want.has(k)} onClick={() => toggle(k)}>
                {KEY_GLYPHS[k] && <span aria-hidden="true">{KEY_GLYPHS[k]}</span>}
                <span className="fx-key-name">{keyName(k)}</span>
                {/* Only a held key says so: "up" read like the Up key's own name. A space keeps the button's height. */}
                <span className="fx-key-state" aria-hidden="true">
                  {want.has(k) ? "held" : "\u00a0"}
                </span>
              </button>
            ))}
          </div>
          <p id={hint} className="fx-note">
            Press a key to hold it, again to let go. With a keyboard, while the keys have the focus, press the key itself.
            {changed ? " Your changes are sent with the next frames you run." : ""}
          </p>
          {nodeOnly && (
            <p className="fx-note">
              Your key handlers are on a node, not on the scene. In Java Arena keys go only to the scene&apos;s handlers, so a node&apos;s own never run: put them on the scene (<code>scene.setOnKeyPressed</code>).
            </p>
          )}
        </>
      )}
      <div className="fx-run-row">
        {RUN_FRAMES.map((n) => (
          <button key={n} type="button" className="btn btn-sm fx-run-frames" aria-disabled={replaying || undefined} onClick={() => send(runLines(keys, want, held, n))}>
            Run {n} frames
          </button>
        ))}
      </div>
      {keys.length > 0 && (
        <details className="fx-tap">
          <summary>Tap a key</summary>
          <div className="fx-tap-keys">
            <p className="fx-note">A press and a release with no frames between, for a program that reacts to a single press.</p>
            {keys.map((k) => (
              <button key={k} type="button" className="btn btn-sm fx-tap-key" aria-disabled={replaying || held.has(k) || undefined} title={held.has(k) ? tapHeldTitle(k, want.has(k)) : undefined} onClick={() => !held.has(k) && send([`key ${k}`])}>
                Tap {keyName(k)}
              </button>
            ))}
          </div>
        </details>
      )}
      <p className="fx-note fx-game-note">
        {keys.length > 0
          ? "The game doesn't run live here: choose the keys to hold, run some frames, and the page shows them as an animation."
          : "The animation doesn't run live here: run some frames, and the page shows them as an animation."}
      </p>
    </div>
  );
}

/**
 * Why a key's Tap can't be used: the key is held (the runs so far pressed it). Letting go of it in
 * the row isn't enough: the release is sent with the next frames.
 */
const tapHeldTitle = (k: string, stillWanted: boolean) =>
  stillWanted
    ? `${keyName(k)} is held: let go of it and run some frames first (the release is sent with the next frames you run).`
    : `${keyName(k)} is still held until you run frames: the release is sent with the next frames you run.`;

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
      if (!c || !isText(c) || c.disabled || !c.editable || text === c.text) continue;
      out.push({ n: c.n, line: text.startsWith(c.text) ? `type ${c.target} ${quoteText(text.slice(c.text.length))}` : `set ${c.target} ${quoteText(text)}` });
    }
    return out.sort((a, b) => a.n - b.n).map((e) => e.line);
  };

  /** Notes what every text field shows as a run starts. */
  const markBase = () => {
    const b: Record<string, string> = {};
    for (const c of latest.current.controls.values()) if (isText(c)) b[c.path] = draftsRef.current[c.path] ?? c.text;
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
    setSaid("Running your program again with everything you did in the window.");
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
      if (!c || !isText(c)) continue;
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
      if (!c || c.disabled || (p.kind === "events" ? c.kind !== p.control : p.kind === "click" ? c.kind !== "button" || c.text !== p.text : c.kind !== "field" && c.kind !== "password")) {
        queue.current.unshift(p);
        dropQueue("the window changed first");
        break;
      }
      if (p.kind === "events") sentNow = send(p.lines(c.target));
      // A button or field without a handler: nothing to send unless there is typing.
      else sentNow = send(c.onAction ? [`${p.kind} ${c.target}`] : []);
    }
    if (!sentNow && Object.keys(keep).length) sendLater();
  }, [session]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const keysHelp = useId();
  const [surfaceFocused, setSurfaceFocused] = useState(false);
  const live: Live = {
    keysHelp,
    onSurfaceFocus: setSurfaceFocused,
    onSlide: (c, value) => {
      const s = c.slider;
      if (!s || !latest.current.usable || c.disabled) return false;
      const text = sliderValueText(value, s);
      const lines = (t: string) => [`set ${t} ${text}`];
      if (latest.current.replaying) {
        // Only where it was let go last counts.
        queue.current = queue.current.filter((p) => !(p.kind === "events" && p.path === c.path));
        queue.current.push({ kind: "events", path: c.path, control: c.kind, lines });
        return true;
      }
      // Let go where it was (a slider that snaps, nearer its tick): nothing changes.
      if (Number(text) === s.value) return false;
      return send(lines(c.target));
    },
    onGesture: (c, lines) => {
      if (!latest.current.usable || c.disabled) return false;
      if (latest.current.replaying) {
        queue.current.push({ kind: "events", path: c.path, control: c.kind, lines });
        return true;
      }
      return send(lines(c.target));
    },
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
    setSaid("Starting over: running your program as if nothing was done in the window.");
    void replay([]);
  };

  // A game: the animation of the frames the latest run ran, playing by itself only the frames that
  // run added (the frames before were played after the runs before); the key row and Run buttons.
  const framesSeen = useRef({ count: 0, from: new WeakMap<WindowState, number>() });
  const playFrom = (() => {
    const w = session.window;
    if (!w) return 1;
    const seen = framesSeen.current;
    let f = seen.from.get(w);
    if (f == null) {
      const count = w.frames?.count ?? 0;
      f = count > seen.count ? seen.count + 1 : count + 1;
      seen.count = count;
      seen.from.set(w, f);
    }
    return f;
  })();
  // The frames a learner ran play as soon as any of the window is on screen (see attachPlayer).
  const player = usePlayer(usable && drawn.length ? session.window : null, playFrom, true, 0);
  const sceneKeys = hasKeyHandlers(session.window);
  // Key handlers only on a node: the row is still offered, with a line saying they don't run here.
  const nodeKeysOnly = !sceneKeys && nodeKeyHandlers(session.window);
  const keyHandlers = sceneKeys || nodeKeysOnly;
  const game = usable && (keyHandlers || /\bAnimationTimer\b/.test(session.code) || (session.window?.frames?.count ?? 0) > 0);
  const runKeys = (lines: string[]) => {
    if (latest.current.replaying) {
      tell("Your program is still running: wait for it to finish, then try again.");
      return;
    }
    send(lines);
  };

  const hasControls = [...controls.values()].some((c) => !c.disabled);
  // Canvases and image views the learner can draw on or click: a line under the window says how.
  const allPointers = [...controls.values()].filter((c) => c.kind === "canvas" || c.kind === "image");
  const hasPointers = allPointers.length > 0;
  const pointers = allPointers.filter((c) => !c.disabled);
  const stale = session.failed ? "failed" : codeChanged ? "code" : null;
  // Each event makes every later run longer (the program does it all again): say so before the time limit stops one.
  const limit = timeLimitFor(session.program?.libraries ?? []);
  const slow = !stale && session.events.length > 0 && (session.ms ?? 0) >= limit * SLOW_SHARE;
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
      <p className="fx-note">
        {game
          ? "Java Arena draws your window and runs your program again from the start each time you run frames, tap a key, click, type, move a slider or use the mouse, with everything you did before."
          : "Java Arena draws your window and runs your program again from the start each time you click, type, move a slider or use the mouse, with everything you did before."}
      </p>
      {session.failed && session.window && <p className="fx-stale-note">{STALE_NOTE[session.failed]}</p>}
      {stale === "code" && <p className="fx-stale-note">Out of date: your code changed since this run. Run it again to use the window.</p>}
      {!usable || !drawn.length ? (
        // No window yet (the first run left none): the outline's "No window is open." and why. A
        // window out of date or kept from before a failed run shows its end and never plays.
        <WindowDrawing window={session.window} autoplay={false} label={stale && session.window ? `${drawingLabel(session.window)}, out of date` : undefined} />
      ) : (
        <Frame label={drawingLabel(session.window)} focusable={!hasControls} deps={[drawn]} anim={player.on ? player.anim : undefined}>
          <div className="fx-desktop">
            {drawn.map((d) => (
              <WindowFrame key={d.key} w={d} live={live} />
            ))}
          </div>
        </Frame>
      )}
      {player.on && <div className="fx-player-box" ref={player.controls} />}
      {game && <GameKeys code={session.code} events={session.events} keys={keyHandlers} nodeOnly={nodeKeysOnly} replaying={replaying} send={runKeys} />}
      {usable && pointers.length > 0 && <p className="fx-note fx-draw-note">{pointerNote(pointers)}</p>}
      {usable && hasPointers && (
        <p id={keysHelp} className={surfaceFocused ? "fx-note fx-keys-note" : "visually-hidden"}>
          {pointerKeysHelp(allPointers)}
        </p>
      )}
      {!session.window && session.failed === "time" && <p className="fx-stale-note">Your program was stopped at the time limit before it left a window.</p>}
      {!session.window && session.failed === "none" && <p className="fx-stale-note">Your program ended before it left a window: main must call launch, as in launch(Main.class), and start must run to its end. The output below may say why.</p>}
      {notShown && <p className="fx-stale-note">{NOT_SHOWN_NOTE}</p>}
      {slow && <p className="fx-stale-note fx-slow-note">{slowNote(session.ms!, limit)}</p>}
      {message && <p className="fx-message">{message}</p>}
      {session.window && session.window.problems.length > 0 && (
        <ul className="rules" aria-label="What you did that couldn't happen">
          {session.window.problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
      {session.window &&
        mouseNotices(session.window).map((m, i) => (
          <p key={i} className="fx-note">
            {m}
          </p>
        ))}
      {session.window && <WindowText outline={outline} />}
      <p className="visually-hidden" role="status" aria-live="polite">
        {said}
      </p>
    </section>
  );
}
