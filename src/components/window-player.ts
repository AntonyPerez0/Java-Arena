// The animation player under a window whose program ran frames (part 14.3): Play and Pause, a step
// back and forward, Restart, the frame counter ("frame 45 of 120"), a slider to scrub and the speed
// (1x, 0.5x, 0.25x, of 60 frames a second). It plays once by itself when the window first comes into
// view (from a given frame: the window panel plays only the frames a run added), never when the
// learner prefers reduced motion, and stops at the last frame.
//
// It is plain DOM, not React: lesson text is HTML (Markdown.tsx attaches a player to each example
// with frames), and a frame is drawn by updating the attributes of the elements that changed
// (patchKids), so playing at 60 frames a second stays smooth on a phone. The frames are drawn in an
// element of their own (the "anim" layer, before the window's own drawing in its frame); at the end,
// when nothing plays, the anim layer steps aside and the window after the last event shows (in the
// window panel the usable one). attachPlayer gives back the function that stops it all.
import type { WindowState } from "../grader/window";
import { canvasSvg } from "./window-canvas";
import { cssText, drawWindows, windowAsDrawn, type Drawn } from "./window-drawing";
import { FrameStates } from "./window-frames";

const SVG_NS = "http://www.w3.org/2000/svg";
const SVG_TAGS = new Set(["svg", "g", "polygon", "circle", "rect", "line", "text", "tspan"]);

/** What patchKids last put on an element. */
type Mark = {
  id: string;
  cls: string;
  style: string;
  attrs: string[];
  content: string | null;
};
const marks = new WeakMap<Element, Mark>();
/** A canvas's calls as SVG, made once per list of calls (the frames keep the last window's list). */
const canvasMarkup = new WeakMap<object, string>();

function make(d: Drawn): Element {
  const e = SVG_TAGS.has(d.tag) ? document.createElementNS(SVG_NS, d.tag) : document.createElement(d.tag);
  marks.set(e, {
    id: `${d.tag}|${d.key}`,
    cls: "",
    style: "",
    attrs: [],
    content: null,
  });
  return e;
}

function update(e: Element, d: Drawn) {
  const m = marks.get(e)!;
  if (m.cls !== d.cls) {
    e.setAttribute("class", d.cls);
    m.cls = d.cls;
  }
  const style = cssText(d.style);
  if (m.style !== style) {
    if (style) e.setAttribute("style", style);
    else e.removeAttribute("style");
    m.style = style;
  }
  const attrs = d.attrs ?? {};
  for (const k of m.attrs) if (!(k in attrs)) e.removeAttribute(k);
  for (const [k, v] of Object.entries(attrs)) if (e.getAttribute(k) !== v) e.setAttribute(k, v);
  m.attrs = Object.keys(attrs);
  let markup = d.markup ?? null;
  if (markup == null && d.canvas) {
    markup = canvasMarkup.get(d.canvas.calls) ?? canvasSvg(d.canvas.calls, d.canvas.width, d.canvas.height);
    canvasMarkup.set(d.canvas.calls, markup);
  }
  if (markup != null) {
    if (m.content !== "m" + markup) {
      e.innerHTML = markup;
      m.content = "m" + markup;
    }
    return;
  }
  if (d.tag === "img") return;
  if (d.text != null) {
    if (m.content !== "t" + d.text) {
      e.textContent = d.text;
      m.content = "t" + d.text;
    }
    return;
  }
  if (m.content != null) {
    e.textContent = "";
    m.content = null;
  }
  patchKids(e, d.kids ?? []);
}

/**
 * Makes `parent`'s children the drawing `kids`: an element with the same tag and key is kept and
 * only what changed about it is set; new ones are made, ones gone are removed.
 */
export function patchKids(parent: Element, kids: Drawn[]) {
  const old = new Map<string, Element>();
  for (const c of [...parent.children]) {
    const m = marks.get(c);
    if (m && !old.has(m.id)) old.set(m.id, c);
    else c.remove();
  }
  kids.forEach((d, i) => {
    const id = `${d.tag}|${d.key}`;
    let e = old.get(id);
    if (e) old.delete(id);
    else e = make(d);
    if (parent.children[i] !== e) parent.insertBefore(e, parent.children[i] ?? null);
    update(e, d);
  });
  for (const e of old.values()) e.remove();
}

// ------------------------------------------------------------------ the player

/** The speeds offered, as fractions of 60 frames a second. */
export const SPEEDS = [1, 0.5, 0.25];
const FPS = 60;

/** A button's icon: lines drawn in the text's color (lucide's look, as the site's other icons). */
const icon = (shapes: string) => `<svg class="icon fx-pl-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${shapes}</svg>`;
const ICONS = {
  restart: icon('<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>'),
  back: icon('<path d="M17 6 9 12l8 6z" fill="currentColor"/><path d="M6 6v12"/>'),
  forward: icon('<path d="m7 6 8 6-8 6z" fill="currentColor"/><path d="M18 6v12"/>'),
  play: icon('<path d="m7 4 13 8-13 8z" fill="currentColor"/>'),
  pause: icon('<rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor"/>'),
};

/** The words of the counter: "frame 45 of 120". */
export const frameWords = (k: number, n: number) => `frame ${k} of ${n}`;

/** Whether the learner asked their system for less motion. */
const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

export type PlayerOptions = {
  /** Where the controls go (emptied when the player stops). */
  controls: HTMLElement;
  /** The anim layer: an element just before the window's own drawing (.fx-desktop) in its frame. */
  anim: HTMLElement;
  /** A window JSON whose frames list isn't empty. */
  window: WindowState;
  /** Play by itself once it comes into view (unless the learner prefers reduced motion), from this frame. */
  autoplay?: boolean;
  from?: number;
  /**
   * How much of the window's frame must be on screen before it plays by itself: a quarter for a
   * lesson's example or a task card; 0 (any of it) for the frames a learner just ran in the window
   * panel, so that a run started with the window mostly scrolled away still plays.
   */
  visible?: number;
};

/**
 * Puts the player's controls in `controls` and draws the frames in `anim`; the function it gives
 * stops it (no timer or observer is left running) and takes the controls away.
 */
export function attachPlayer({ controls, anim, window: w, autoplay = false, from = 1, visible = 0.25 }: PlayerOptions): () => void {
  const states = new FrameStates(w);
  const kept = states.kept;
  if (!kept) return () => {};
  let pos = kept;
  let playing = false;
  let speed = 1;
  let raf = 0;
  let startTime = 0;
  let startPos = 1;
  let stopped = false;
  // Waits for the window to come into view to play it once (see the end); anything the learner
  // does with the player (Play, Restart, a step, the slider) cancels that, so it never overrides them.
  let observer: IntersectionObserver | null = null;
  const cancelAuto = () => {
    observer?.disconnect();
    observer = null;
  };

  const box = document.createElement("div");
  box.className = "fx-player";
  box.setAttribute("role", "group");
  box.setAttribute("aria-label", "The animation of the frames");
  const row = document.createElement("div");
  row.className = "fx-pl-row";
  const button = (act: string, label: string, svg: string) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn btn-sm fx-pl-btn";
    b.dataset.act = act;
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = svg;
    row.append(b);
    return b;
  };
  button("restart", "Restart", ICONS.restart);
  button("back", "Back one frame", ICONS.back);
  const playB = button("play", "Play", ICONS.play);
  button("forward", "Forward one frame", ICONS.forward);
  const counter = document.createElement("span");
  counter.className = "fx-pl-count";
  const speedLabel = document.createElement("label");
  speedLabel.className = "fx-pl-speed";
  const speedWord = document.createElement("span");
  speedWord.textContent = "Speed";
  const select = document.createElement("select");
  for (const s of SPEEDS) select.add(new Option(`${s}x`, String(s)));
  speedLabel.append(speedWord, select);
  row.append(counter, speedLabel);
  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "fx-pl-slider";
  slider.min = "1";
  slider.max = String(kept);
  slider.step = "1";
  slider.setAttribute("aria-label", "Frame");
  slider.disabled = kept < 2;
  // Said only when the learner steps (not every frame while playing).
  const said = document.createElement("p");
  said.className = "visually-hidden";
  said.setAttribute("aria-live", "polite");
  box.append(row, slider, said);
  if (states.count > kept) {
    const note = document.createElement("p");
    note.className = "fx-note";
    note.textContent = `The animation keeps the first ${kept} of the ${states.count} frames that ran; at its end the window is the one after all of them.`;
    box.append(note);
  }
  controls.replaceChildren(box);
  anim.setAttribute("aria-hidden", "true");

  /** Draws frame k: the anim layer, or at the end with nothing playing the window after the last event. */
  const show = (k: number) => {
    pos = Math.min(Math.max(1, k), kept);
    slider.value = String(pos);
    const words = frameWords(pos, kept);
    slider.setAttribute("aria-valuetext", words);
    counter.textContent = words;
    if (pos === kept && !playing) {
      anim.removeAttribute("data-on");
      return;
    }
    patchKids(anim, drawWindows(states.windowAt(pos)).map(windowAsDrawn));
    anim.setAttribute("data-on", "");
  };
  const setPlaying = (on: boolean) => {
    playing = on;
    playB.setAttribute("aria-label", on ? "Pause" : "Play");
    playB.title = on ? "Pause" : "Play";
    playB.innerHTML = on ? ICONS.pause : ICONS.play;
    playB.dataset.act = on ? "pause" : "play";
  };
  const tick = (now: number) => {
    raf = 0;
    if (!playing) return;
    const k = startPos + Math.floor(((now - startTime) * FPS * speed) / 1000);
    if (k >= kept) {
      setPlaying(false);
      show(kept);
      return;
    }
    if (k !== pos) show(k);
    raf = requestAnimationFrame(tick);
  };
  const play = (fromFrame: number) => {
    if (stopped) return;
    setPlaying(true);
    startPos = Math.min(Math.max(1, fromFrame), kept);
    startTime = performance.now();
    show(startPos);
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  const pause = () => {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!playing) return;
    setPlaying(false);
    show(pos);
  };
  const step = (by: number) => {
    pause();
    show(pos + by);
    said.textContent = frameWords(pos, kept);
  };

  const onClick = (e: Event) => {
    const act = (e.target as Element | null)?.closest<HTMLElement>("[data-act]")?.dataset.act;
    if (!act) return;
    cancelAuto();
    if (act === "play") play(pos >= kept ? 1 : pos);
    else if (act === "pause") pause();
    else if (act === "restart") play(1);
    else if (act === "back") step(-1);
    else if (act === "forward") step(1);
  };
  const onInput = () => {
    cancelAuto();
    pause();
    show(Number(slider.value));
  };
  const onSpeed = () => {
    speed = Number(select.value) || 1;
    if (playing) {
      startPos = pos;
      startTime = performance.now();
    }
  };
  row.addEventListener("click", onClick);
  slider.addEventListener("input", onInput);
  select.addEventListener("change", onSpeed);

  // Plays once when it first comes into view; with reduced motion, it shows the end. (A new speed
  // doesn't cancel this: the window then plays at that speed.)
  const start = Math.min(Math.max(1, from), kept);
  if (autoplay && !reducedMotion() && start < kept) {
    show(start);
    if (typeof IntersectionObserver === "function") {
      observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((e) => e.isIntersecting)) return;
          cancelAuto();
          play(start);
        },
        { threshold: visible },
      );
      observer.observe(anim.parentElement ?? anim);
    } else play(start);
  } else show(kept);

  return () => {
    stopped = true;
    playing = false;
    cancelAnimationFrame(raf);
    cancelAuto();
    row.removeEventListener("click", onClick);
    slider.removeEventListener("input", onInput);
    select.removeEventListener("change", onSpeed);
    controls.replaceChildren();
    anim.removeAttribute("data-on");
    anim.replaceChildren();
  };
}
