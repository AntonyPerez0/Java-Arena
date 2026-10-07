// The frame around drawn windows (.fx-frame, see window-drawing.ts): on a phone a window is often
// wider than the column (JavaFX's TextArea alone is 546 px), so its frame scrolls sideways, and
// scrollbars on phones show only while scrolling. watchFrame marks a frame whose windows are wider
// than it (data-wide: the note under it shows, and its right edge fades) and whether it is scrolled
// to the end (data-end: the fade goes, so it never hides the last node). It checks again when the
// frame or a window in it changes size (a turned phone, a new run's window) and as it scrolls.
// The lesson text (Markdown), the task card and results (WindowDrawing) and the window panel use it.
import { useEffect, type DependencyList, type RefObject } from "react";

/** Starts watching one frame; the function it gives stops. */
export function watchFrame(frame: HTMLElement): () => void {
  const scroll = frame.querySelector<HTMLElement>(":scope > .fx-scroll");
  if (!scroll || typeof ResizeObserver === "undefined") return () => {};
  const update = () => {
    const wide = scroll.scrollWidth > scroll.clientWidth + 1;
    frame.toggleAttribute("data-wide", wide);
    frame.toggleAttribute("data-end", wide && scroll.scrollLeft + scroll.clientWidth >= scroll.scrollWidth - 1);
  };
  const sizes = new ResizeObserver(update);
  sizes.observe(scroll);
  for (const el of scroll.querySelectorAll(":scope > .fx-desktop, :scope > .fx-desktop > .fx-window")) sizes.observe(el);
  scroll.addEventListener("scroll", update, { passive: true });
  update();
  return () => {
    sizes.disconnect();
    scroll.removeEventListener("scroll", update);
  };
}

/** Watches every frame inside `root` (lesson text, where the frames come as HTML); the function it gives stops. */
export function watchFrames(root: HTMLElement): () => void {
  const stops = [...root.querySelectorAll<HTMLElement>(".fx-frame")].map(watchFrame);
  return () => stops.forEach((stop) => stop());
}

/** Watches the frames in an element while it is on the page, again after each change of `deps` (new windows). */
export function useWindowFrames(ref: RefObject<HTMLElement | null>, deps: DependencyList) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return el.classList.contains("fx-frame") ? watchFrame(el) : watchFrames(el);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
