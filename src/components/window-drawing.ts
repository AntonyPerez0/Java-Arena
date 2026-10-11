// The drawing of a JavaFX program's windows, from the JSON that Java Arena's practice version of
// JavaFX leaves in .arena/window.json (see src/grader/window.ts): a plain desktop window in light
// colors (JavaFX's default look, approximately) built from HTML elements. FlowPane wraps, HBox is a
// row, VBox a column, StackPane overlays its children, BorderPane has five regions and GridPane is
// a CSS grid; spacing, gaps, padding, alignment, pref sizes, fonts, disabled and hidden are applied.
// There is no real layout: sizes follow JavaFX's defaults roughly (a TextField is 170 px wide, a
// TextArea 546 by 173, as headless OpenJFX 21 lays them out with its default 13 px font), and a
// window never cuts off what it holds.
//
// The nodes of part 14: a chart is inline SVG (window-charts.ts); a canvas replays its recorded
// calls (window-canvas.ts: on an HTML canvas in React, as SVG in HTML); an image view shows its
// pixels as a PNG, several times larger when small, with its pixels kept crisp and the scale said
// under it; a slider is drawn with its track, thumb, tick marks and tick labels (in the window
// panel, a real range input). Canvases, image views and charts keep their own size; a slider is
// 140 px wide and fills a column's width, as JavaFX's does.
//
// The drawing is a tree of plain element descriptions (Drawn), so that one function decides the
// look and two render it: windowDrawingHtml (an HTML string, for lesson text, which
// scripts/prerender.mjs also uses) and the React components in WindowView.tsx (the task card, the
// results and the window panel, where the buttons, fields, sliders and canvases with mouse
// handlers are real ones). Node runs this file as it is (types are stripped), so it must not need
// compiling: no enums, namespaces or JSX.
import { describeEvents, quoteText, windowOutline, type DrawCall, type WindowExample, type WindowNode, type WindowNumber, type WindowStage, type WindowState } from "../grader/window.ts";
import { canvasSvg, cssFamily, imageScale, pngDataUrl } from "./window-canvas.ts";
import { chartSize, chartSvg, textWidth, tickLabel, tickValues, unitDecimals } from "./window-charts.ts";

/** CSS properties, camelCase (as React takes them). */
export type Css = Record<string, string>;

/**
 * A control the learner can use in the window panel: a button, a text field, a text area, a slider,
 * or a canvas or image view with mouse handlers (drawn on with the mouse, a finger or the keyboard).
 */
export type DrawnControl = {
  kind: "button" | "field" | "password" | "area" | "slider" | "canvas" | "image";
  /** The node's number in the window JSON (click #4). */
  n: number;
  /**
   * What an event line names it by: Button "Add" for a button whose text no other button has, #name
   * for a node whose id no other node has, else its number (#4). A text or an id finds the same node
   * in the next run even when the nodes come in another order there (the order of a HashSet of
   * nodes, for example, can change from run to run in the browser's Java engine).
   */
  target: string;
  /**
   * Where it is in the windows (window, then each child's place among its siblings): stays the same
   * when nodes are added after it or in other panes, not when one is added or removed before it in its pane.
   */
  path: string;
  text: string;
  prompt: string;
  /** Its accessible name: a button's text, a field's prompt text, else "Text field 2" (as an event line counts them); "Slider 1", "Canvas 1, 220 x 140". */
  name: string;
  /** It, or a pane it is in, is disabled. */
  disabled: boolean;
  editable: boolean;
  /** It has a handler (setOnAction). */
  onAction: boolean;
  wrap: boolean;
  /** Its text box's own style (width, font), for the real element that replaces the drawn one. */
  style: Css;
  /**
   * A slider: its range and value, its block increment (how far the keys move it: see sliderKey in WindowView.tsx), the step
   * the page rounds a value to before it sends it (a hundredth of the range, as a power of ten),
   * and, when it snaps to ticks, their spacing (where a value the learner moves it to goes).
   */
  slider?: { min: number; max: number; value: number; block: number; precision: number; snap?: number };
  /**
   * A canvas or image view with mouse handlers: its size in its own coordinates (an image's pixels),
   * how many times larger it is drawn, and whether it takes a press, drag or release (so the learner
   * draws on it; false: only clicks).
   */
  pointer?: { width: number; height: number; scale: number; draws: boolean };
};

/** One element of the drawing. */
export type Drawn = {
  tag: "div" | "span" | "img";
  cls: string;
  /** Unique among its siblings, and the same for the same place in the next run's window (React reuses the element). */
  key: string;
  style?: Css;
  attrs?: Record<string, string>;
  text?: string;
  kids?: Drawn[];
  control?: DrawnControl;
  /** Markup made here and put in as it is: a chart's SVG. */
  markup?: string;
  /** A canvas's size and calls: React replays them on an HTML canvas, the HTML has them as SVG. */
  canvas?: { width: number; height: number; calls: DrawCall[] };
};

/** One window: its title bar's text and the frame's size, and the scene (null: the window has no scene). */
export type DrawnWindow = { key: string; title: string | null; label: string; style: Css; scene: Drawn | null; sceneStyle: Css };

// ------------------------------------------------------------------ sizes, fonts and alignment

/** A size in pixels from the JSON (a number; "NaN" and the infinities are not sizes), at most 4000. */
function size(v: WindowNumber | undefined): number | undefined {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return undefined;
  return Math.min(v, 4000);
}
const px = (v: number) => `${Math.round(v * 100) / 100}px`;

/** JavaFX's default font: System, 13. */
export const DEFAULT_FONT_SIZE = 13;

function fontStyle(font: WindowNode["font"]): Css {
  if (!font) return {};
  const out: Css = {};
  const s = typeof font.size === "number" && Number.isFinite(font.size) && font.size > 0 ? Math.min(font.size, 200) : undefined;
  if (s != null) out.fontSize = px(s);
  // JavaFX's logical families as CSS families; another family by name, when CSS can take it.
  const family = cssFamily(font.family);
  if (family) out.fontFamily = family;
  return out;
}

type Axis = "start" | "center" | "end" | "baseline";
/** A Pos constant as its vertical and horizontal parts (null and unknown names: the pane's default). */
function pos(alignment: string | null | undefined, fallback: string): { v: Axis; h: Axis } {
  const name = alignment && /^(TOP|CENTER|BOTTOM|BASELINE)(_(LEFT|CENTER|RIGHT))?$/.test(alignment) ? alignment : fallback;
  if (name === "CENTER") return { v: "center", h: "center" };
  const [v, h] = name.split("_");
  return { v: v === "TOP" ? "start" : v === "BOTTOM" ? "end" : v === "BASELINE" ? "baseline" : "center", h: h === "LEFT" ? "start" : h === "RIGHT" ? "end" : "center" };
}
const flexAxis = (a: Axis) => (a === "start" ? "flex-start" : a === "end" ? "flex-end" : a === "baseline" ? "flex-start" : "center");

// ------------------------------------------------------------------ which nodes grow

const PANES = new Set(["Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Region", "Parent", "Node"]);
const isPane = (n: WindowNode) => PANES.has(n.type) || n.children != null || n.top != null || n.left != null || n.center != null || n.right != null || n.bottom != null;
const isField = (t: string) => t === "TextField" || t === "PasswordField" || t === "TextInputControl";
/**
 * JavaFX resizes panes, text inputs and sliders to fill the width their pane gives them; buttons
 * and labels keep their own size, and so do canvases and image views. A chart would grow too, but
 * its drawing is made for its own size, so it keeps it.
 */
const growsWide = (n: WindowNode) => isPane(n) || isField(n.type) || n.type === "TextArea" || n.type === "Slider";
/** Only panes and text areas grow taller. */
const growsTall = (n: WindowNode) => isPane(n) || n.type === "TextArea";

/** How a pane places one child: whether the child is stretched across and down, and any CSS of its slot. */
type Place = { wide: boolean; tall: boolean; css?: Css };

/**
 * What a text input asks for when no pref size is set, at JavaFX's default 13 px font: headless
 * OpenJFX 21 lays out a TextField 170 px wide (12 columns) and a TextArea 546 by 173 (40 columns,
 * 10 rows). A bigger font asks for more.
 */
const INPUT_SIZE: Record<string, [number, number | undefined]> = { TextField: [170, undefined], PasswordField: [170, undefined], TextInputControl: [170, undefined], TextArea: [546, 173] };
/** A slider asks for 140 px (its height is its own: see drawSlider). */
const SLIDER_WIDTH = 140;

/** The kinds of node whose size the drawing decides itself (a slider only its height). */
const FIXED = new Set(["Canvas", "ImageView", "Slider", "LineChart", "BarChart", "ScatterChart"]);

/** The size a node asks for (setPrefWidth, setPrefHeight, or a text input's own): exact, or the least when its pane stretches it. */
function sizeCss(node: WindowNode, place: Place): Css {
  const out: Css = {};
  const fontSize = typeof node.font?.size === "number" && Number.isFinite(node.font.size) && node.font.size > 0 ? Math.min(node.font.size, 200) : DEFAULT_FONT_SIZE;
  const own = INPUT_SIZE[node.type]?.map((v) => (v == null ? undefined : (v * fontSize) / DEFAULT_FONT_SIZE));
  const w = size(node.prefWidth) ?? own?.[0] ?? (node.type === "Slider" ? SLIDER_WIDTH : undefined);
  // A slider's height is its track, thumb and ticks; a canvas's, image view's and chart's size is their own.
  if (FIXED.has(node.type)) return node.type === "Slider" && w != null ? sizeCss({ ...node, type: "Region", prefWidth: w, prefHeight: undefined }, place) : out;
  const h = size(node.prefHeight) ?? own?.[1];
  if (w != null) {
    out.minWidth = px(w);
    if (!(place.wide && growsWide(node))) out.width = px(w);
  }
  if (h != null) {
    out.minHeight = px(h);
    if (!(place.tall && growsTall(node))) out.height = px(h);
  }
  return out;
}

const paddingCss = (p: WindowNumber[] | undefined): Css => {
  if (!p || p.length !== 4) return {};
  const v = p.map((x) => size(x) ?? 0);
  return { padding: v.map(px).join(" ") };
};

// ------------------------------------------------------------------ counting controls for their names

type Counts = { field: number; password: number; area: number; button: number; names: Names; kinds: Map<string, number> };

/** How many buttons have each text, and how many nodes each id, in all the windows (for DrawnControl's target). */
type Names = { texts: Map<string, number>; ids: Map<string, number> };

function namesIn(w: WindowState): Names {
  const names: Names = { texts: new Map(), ids: new Map() };
  const add = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);
  const walk = (n: WindowNode | null | undefined) => {
    if (!n) return;
    if (n.type === "Button" && typeof n.text === "string") add(names.texts, n.text);
    if (typeof n.id === "string") add(names.ids, n.id);
    for (const c of n.children ?? []) walk(c);
    for (const r of REGIONS) walk(n[r]);
  };
  for (const stage of w.windows) walk(stage.scene?.root);
  return names;
}

/**
 * What an event line names a control by (see DrawnControl's target). A slider, canvas or image
 * view without an id of its own is named by its class and which one it is (Slider 1, Canvas 2:
 * the library counts them in outline order too), when `index` is given.
 */
function targetOf(node: WindowNode, names: Names, index?: number): string {
  if (node.type === "Button" && typeof node.text === "string" && names.texts.get(node.text) === 1) return `Button ${quoteText(node.text)}`;
  if (typeof node.id === "string" && /^[A-Za-z_][A-Za-z0-9_-]*$/.test(node.id) && names.ids.get(node.id) === 1) return `#${node.id}`;
  return index != null ? `${node.type} ${index}` : `#${node.n}`;
}

/** Counts one more node of a class (Canvas, ImageView, Slider) in outline order: which one this is. */
function countKind(counts: Counts, type: string): number {
  const k = (counts.kinds.get(type) ?? 0) + 1;
  counts.kinds.set(type, k);
  return k;
}

const NAMES = { field: "Text field", password: "Password field", area: "Text area", button: "Button" };

// ------------------------------------------------------------------ the tree

const REGIONS = ["top", "left", "center", "right", "bottom"] as const;

function drawNode(node: WindowNode, place: Place, key: string, path: string, counts: Counts, parentDisabled: boolean, sizedRoot = false): Drawn {
  const disabled = parentDisabled || !!node.disable;
  // The pane decides how the child sits in its slot (place.css): align-self is across in a column and down in a row.
  const style: Css = { ...(place.css ?? {}), ...sizeCss(node, place) };
  if (node.visible === false) style.visibility = "hidden";
  const attrs: Record<string, string> = { "data-n": String(node.n) };
  // Nothing inside a disabled pane can be used; axe and screen readers learn it from aria-disabled.
  if (node.disable) attrs["aria-disabled"] = "true";

  if (!isPane(node)) return drawControl(node, style, attrs, key, path, counts, disabled);

  Object.assign(style, paddingCss(node.padding));
  const kids: Drawn[] = [];
  const child = (c: WindowNode, p: Place, k: string) => kids.push(drawNode(c, p, `${k}:${c.type}`, `${path}/${k}`, counts, disabled));
  let cls = "fx-pane";
  switch (node.type) {
    case "VBox": {
      const a = pos(node.alignment, "TOP_LEFT");
      cls += " fx-vbox";
      Object.assign(style, { justifyContent: flexAxis(a.v), alignItems: flexAxis(a.h) });
      if (size(node.spacing)) style.gap = px(size(node.spacing)!);
      // fillWidth: a child that can grow is as wide as the column.
      (node.children ?? []).forEach((c, i) => child(c, { wide: true, tall: false, css: growsWide(c) ? { alignSelf: "stretch" } : {} }, String(i)));
      break;
    }
    case "HBox": {
      const a = pos(node.alignment, "TOP_LEFT");
      cls += " fx-hbox";
      Object.assign(style, { justifyContent: flexAxis(a.h), alignItems: a.v === "baseline" ? "baseline" : flexAxis(a.v) });
      if (size(node.spacing)) style.gap = px(size(node.spacing)!);
      // fillHeight: a child that can grow is as tall as the row.
      (node.children ?? []).forEach((c, i) => child(c, { wide: false, tall: true, css: growsTall(c) ? { alignSelf: "stretch" } : {} }, String(i)));
      break;
    }
    case "FlowPane": {
      const a = pos(node.alignment, "TOP_LEFT");
      cls += " fx-flow";
      Object.assign(style, { justifyContent: flexAxis(a.h), alignContent: flexAxis(a.v) });
      if (size(node.hgap)) style.columnGap = px(size(node.hgap)!);
      if (size(node.vgap)) style.rowGap = px(size(node.vgap)!);
      // A FlowPane asks for 400 px (its wrap length) unless its scene or its own pref width says otherwise.
      if (!sizedRoot && size(node.prefWidth) == null) style.maxWidth = "400px";
      (node.children ?? []).forEach((c, i) => child(c, { wide: false, tall: false }, String(i)));
      break;
    }
    case "StackPane": {
      const a = pos(node.alignment, "CENTER");
      cls += " fx-stack";
      Object.assign(style, { justifyItems: a.h, alignItems: a.v === "baseline" ? "start" : a.v });
      (node.children ?? []).forEach((c, i) => child(c, { wide: true, tall: true, css: { ...(growsTall(c) ? { alignSelf: "stretch" } : {}), ...(growsWide(c) ? { justifySelf: "stretch" } : {}) } }, String(i)));
      break;
    }
    case "BorderPane": {
      cls += " fx-border";
      // JavaFX's defaults: top and left at the top left, right at the top right, bottom at the bottom left, center in the middle.
      const slots: Record<string, Css> = {
        top: { gridArea: "top", justifySelf: "start", alignSelf: "start" },
        left: { gridArea: "left", justifySelf: "start", alignSelf: "start" },
        center: { gridArea: "center", justifySelf: "center", alignSelf: "center" },
        right: { gridArea: "right", justifySelf: "end", alignSelf: "start" },
        bottom: { gridArea: "bottom", justifySelf: "start", alignSelf: "end" },
      };
      for (const r of REGIONS) {
        const c = node[r];
        if (!c) continue;
        const wide = (r === "top" || r === "bottom" || r === "center") && growsWide(c);
        const tall = (r === "left" || r === "right" || r === "center") && growsTall(c);
        child(c, { wide, tall, css: { ...slots[r], ...(wide ? { justifySelf: "stretch" } : {}), ...(tall ? { alignSelf: "stretch" } : {}) } }, r);
      }
      break;
    }
    case "GridPane": {
      // The cells are in a grid of their own, only as big as they need: JavaFX sizes each column (and
      // row) to what is in it, and gives a node that spans several the room it lacks in the last of
      // them (the 1fr track); the pane's alignment then places that grid inside the pane.
      const a = pos(node.alignment, "TOP_LEFT");
      cls += " fx-grid";
      Object.assign(style, { justifyContent: flexAxis(a.h), alignItems: a.v === "baseline" ? "flex-start" : flexAxis(a.v) });
      const cells: Css = {};
      if (size(node.hgap)) cells.columnGap = px(size(node.hgap)!);
      if (size(node.vgap)) cells.rowGap = px(size(node.vgap)!);
      const at = (v: number | undefined) => Math.min(Math.max(0, v ?? 0), 99);
      const span = (v: number | undefined) => Math.min(Math.max(1, v ?? 1), 100);
      const children = node.children ?? [];
      const columns = Math.max(1, ...children.map((c) => at(c.column) + span(c.columnSpan)));
      const rows = Math.max(1, ...children.map((c) => at(c.row) + span(c.rowSpan)));
      const tracks = (n: number) => (n === 1 ? "1fr" : `repeat(${n - 1}, auto) 1fr`);
      Object.assign(cells, { gridTemplateColumns: tracks(columns), gridTemplateRows: tracks(rows) });
      children.forEach((c, i) => {
        // A cell's default alignment is left and centered up and down; panes and text inputs fill it across.
        const css: Css = { gridColumn: `${at(c.column) + 1} / span ${span(c.columnSpan)}`, gridRow: `${at(c.row) + 1} / span ${span(c.rowSpan)}`, justifySelf: growsWide(c) ? "stretch" : "start", alignSelf: growsTall(c) ? "stretch" : "center" };
        child(c, { wide: growsWide(c), tall: growsTall(c), css }, String(i));
      });
      kids.push({ tag: "div", cls: "fx-grid-cells", key: "cells", style: cells, kids: kids.splice(0) });
      break;
    }
    default: {
      // A plain Pane (and a class of the program's own that extends Region) doesn't place its
      // children: each sits at the top left at its own size, over the ones before it.
      cls += " fx-plain";
      (node.children ?? []).forEach((c, i) => child(c, { wide: false, tall: false }, String(i)));
    }
  }
  return { tag: "div", cls, key, style, attrs, kids };
}

function drawControl(node: WindowNode, style: Css, attrs: Record<string, string>, key: string, path: string, counts: Counts, disabled: boolean): Drawn {
  if (node.type === "Canvas" && node.calls) return drawCanvas(node, style, attrs, key, path, counts, disabled);
  if (node.type === "ImageView" && node.image !== undefined) return drawImageView(node, style, attrs, key, path, counts, disabled);
  if (node.type === "Slider" && node.min !== undefined) return drawSlider(node, style, attrs, key, path, counts, disabled);
  if (CHARTS.has(node.type) && node.xAxis) return drawChart(node, style, attrs, key, disabled);
  const text = node.text ?? "";
  const font = fontStyle(node.font);
  Object.assign(style, font);
  if (node.padding) Object.assign(style, paddingCss(node.padding));
  // A disabled control is drawn at 40% opacity, as JavaFX's default look does.
  const off = disabled ? " fx-disabled" : "";
  if (disabled) attrs["aria-disabled"] = "true";
  const textInput = isField(node.type) || node.type === "TextArea";
  if (textInput) {
    const kind = node.type === "TextArea" ? "area" : node.type === "PasswordField" ? "password" : "field";
    // As event lines count them: TextField 2 counts password fields too (a PasswordField is a TextField).
    if (kind !== "area") counts.field++;
    if (kind === "password") counts.password++;
    if (kind === "area") counts.area++;
    const number = kind === "field" ? counts.field : kind === "password" ? counts.password : counts.area;
    const prompt = node.promptText ?? "";
    const control: DrawnControl = {
      kind,
      n: node.n,
      target: targetOf(node, counts.names),
      path,
      text,
      prompt,
      name: prompt.trim() || `${NAMES[kind]} ${number}`,
      disabled,
      editable: node.editable !== false,
      onAction: !!node.onAction,
      wrap: !!node.wrapText,
      style: { ...font },
    };
    // A password field shows a dot for each character; an empty field shows its prompt text, greyed.
    const shown = kind === "password" ? "•".repeat([...text].length) : text;
    const cls = `fx-input fx-${kind === "area" ? "area" : "field"}${node.wrapText ? " fx-wrap" : ""}${node.editable === false ? " fx-readonly" : ""}${!shown && prompt ? " fx-prompt" : ""}${off}`;
    return { tag: "span", cls, key, style, attrs, control, text: shown || prompt };
  }
  if (node.type === "Button" || node.type === "ButtonBase") {
    counts.button++;
    const control: DrawnControl = { kind: "button", n: node.n, target: targetOf(node, counts.names), path, text, prompt: "", name: text.trim() || `${NAMES.button} ${counts.button}`, disabled, editable: true, onAction: !!node.onAction, wrap: !!node.wrapText, style: { ...font } };
    return { tag: "span", cls: `fx-button${node.wrapText ? " fx-wrap" : ""}${off}`, key, style, attrs, control, kids: [{ tag: "span", cls: "fx-text", key: "t", text }] };
  }
  // A Label (or another kind of node with text): its text, on one line unless it wraps.
  return { tag: "span", cls: `fx-label${node.wrapText ? " fx-wrap" : ""}${off}`, key, style, attrs, kids: [{ tag: "span", cls: "fx-text", key: "t", text }] };
}

// ------------------------------------------------------------------ the nodes of part 14

const CHARTS = new Set(["LineChart", "BarChart", "ScatterChart"]);
const CHART_NAMES: Record<string, string> = { LineChart: "Line chart", BarChart: "Bar chart", ScatterChart: "Scatter chart" };
/** A number of the JSON when it is a finite one. */
const finite = (v: WindowNumber | undefined): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
/** Whether a canvas or image view has a mouse handler, so the window panel lets the learner use the mouse on it. */
const hasMouse = (n: WindowNode) => !!(n.onMousePressed || n.onMouseDragged || n.onMouseReleased || n.onMouseClicked);
/** Whether it has a handler for more than clicks (pressed, dragged or released), so the learner draws on it. */
const drawsOn = (n: WindowNode) => !!(n.onMousePressed || n.onMouseDragged || n.onMouseReleased);
const off = (disabled: boolean) => (disabled ? " fx-disabled" : "");

/** A canvas: its calls replayed (see window-canvas.ts); with mouse handlers, a control the window panel lets the learner draw on. */
function drawCanvas(node: WindowNode, style: Css, attrs: Record<string, string>, key: string, path: string, counts: Counts, disabled: boolean): Drawn {
  const k = countKind(counts, "Canvas");
  const width = size(node.width) ?? 0;
  const height = size(node.height) ?? 0;
  Object.assign(style, { width: px(width), height: px(height) });
  const d: Drawn = { tag: "span", cls: "fx-canvas" + off(disabled), key, style, attrs, canvas: { width, height, calls: node.calls ?? [] } };
  if (disabled) attrs["aria-disabled"] = "true";
  if (hasMouse(node)) {
    const name = `Canvas ${k}, ${javaSize(width)} x ${javaSize(height)}`;
    d.control = { kind: "canvas", n: node.n, target: targetOf(node, counts.names, k), path, text: "", prompt: "", name, disabled, editable: true, onAction: true, wrap: false, style: {}, pointer: { width, height, scale: 1, draws: drawsOn(node) } };
  }
  return d;
}

/** A size for people: 220, 2.5. */
const javaSize = (v: number) => String(Math.round(v * 100) / 100);

/** The words under an image view's image drawn larger: "drawn 8 times larger". */
export const scaleWords = (k: number) => `drawn ${k} times larger`;

/**
 * An image view: its image from its pixels, drawn larger when small (crisp), with the scale under
 * it; no image, an image that failed to load, or one too big for the JSON to carry its pixels
 * (over 512 x 512) is a gray box that says so.
 */
function drawImageView(node: WindowNode, style: Css, attrs: Record<string, string>, key: string, path: string, counts: Counts, disabled: boolean): Drawn {
  const k = countKind(counts, "ImageView");
  const img = node.image;
  const cls = "fx-imageview" + off(disabled);
  if (disabled) attrs["aria-disabled"] = "true";
  if (img == null) return { tag: "span", cls: cls + " fx-image-none", key, style, attrs, text: "no image" };
  if ("error" in img) return { tag: "span", cls: cls + " fx-image-none", key, style, attrs, text: "image error" };
  const w = Math.round(finite(img.width) ?? 0);
  const h = Math.round(finite(img.height) ?? 0);
  const url = img.pixels != null ? pngDataUrl(w, h, img.pixels) : null;
  if (!url) {
    Object.assign(style, { width: px(Math.min(Math.max(w, 60), 512)), height: px(Math.min(Math.max(h, 30), 512)) });
    return { tag: "span", cls: cls + " fx-image-big", key, style, attrs, text: `${w} x ${h} image, too big to draw here` };
  }
  const scale = imageScale(w, h, hasMouse(node));
  const kids: Drawn[] = [{ tag: "img", cls: "fx-image", key: "img", attrs: { src: url, width: String(w * scale), height: String(h * scale), alt: `Image view ${k}: an image of ${w} x ${h} pixels`, draggable: "false" } }];
  if (scale > 1) kids.push({ tag: "span", cls: "fx-image-scale", key: "scale", text: scaleWords(scale) });
  const d: Drawn = { tag: "span", cls, key, style, attrs, kids };
  if (hasMouse(node)) {
    d.control = { kind: "image", n: node.n, target: targetOf(node, counts.names, k), path, text: "", prompt: "", name: `Image view ${k}, ${w} x ${h} pixels`, disabled, editable: true, onAction: true, wrap: false, style: {}, pointer: { width: w, height: h, scale, draws: drawsOn(node) } };
  }
  return d;
}

/** Where a value sits along a slider, as CSS: the thumb's middle goes from 8 px in to 8 px from the end. */
export const sliderLeft = (p: number) => `calc(8px + ${Math.round(Math.min(Math.max(p, 0), 1) * 10000) / 10000} * (100% - 16px))`;

/**
 * The step the page rounds a slider's value to before it sends it: a hundredth of its range, as a
 * power of ten (0 to 100: 1; 0 to 1: 0.01; 0 to 255: 1).
 */
export function sliderPrecision(min: number, max: number): number {
  const range = max - min;
  return range > 0 && Number.isFinite(range) ? 10 ** Math.floor(Math.log10(range / 100)) : 1;
}

/** A number written plainly, as an event line takes it (no exponent, no float noise, no -0): 25, 2.5, -0.01. */
function plainNumber(v: number): string {
  const s = v.toFixed(10).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/**
 * A slider's value as the page sends it (set Slider 1 25): rounded to the slider's precision (see
 * sliderPrecision), kept between its min and max (written as they are when it is at one of them).
 * A slider that snaps to ticks goes to the nearest tick from min (halfway goes up), as the library
 * moves it (and JavaFX's thumb, let go).
 */
export function sliderValueText(v: number, s: { min: number; max: number; precision: number; snap?: number }): string {
  if (!Number.isFinite(v)) return plainNumber(s.min);
  if (s.snap) {
    const below = Math.floor((v - s.min) / s.snap);
    const lower = below * s.snap + s.min;
    const upper = (below + 1) * s.snap + s.min;
    const t = v - lower < upper - v ? lower : upper;
    if (t <= s.min) return plainNumber(s.min);
    if (t >= s.max) return plainNumber(s.max);
    return plainNumber(Number(t.toFixed(Math.min(10, Math.max(unitDecimals(s.snap), unitDecimals(s.min))))));
  }
  const r = Math.round(v / s.precision) * s.precision;
  if (r <= s.min) return plainNumber(s.min);
  if (r >= s.max) return plainNumber(s.max);
  const decimals = Math.max(0, -Math.floor(Math.log10(s.precision)));
  return plainNumber(Number(r.toFixed(Math.min(decimals, 10))));
}

/**
 * A slider: its track and thumb, then (when shown) its tick marks, major ones every majorTickUnit
 * from min and minorTickCount between them, and the major ticks' labels, as JavaFX's axis writes
 * them (fewer when they wouldn't fit). In the window panel the track and thumb are a real range input.
 */
function drawSlider(node: WindowNode, style: Css, attrs: Record<string, string>, key: string, path: string, counts: Counts, disabled: boolean): Drawn {
  const k = countKind(counts, "Slider");
  const min = finite(node.min) ?? 0;
  const max = finite(node.max) ?? 100;
  const value = finite(node.value) ?? min;
  const major = finite(node.majorTickUnit) ?? 25;
  const minorCount = Math.max(0, Math.min(Math.floor(finite(node.minorTickCount) ?? 3), 20));
  const range = max - min;
  const p = (v: number) => (range > 0 ? (v - min) / range : 0);
  const kids: Drawn[] = [
    { tag: "span", cls: "fx-slider-track", key: "track" },
    { tag: "span", cls: "fx-slider-thumb", key: "thumb", style: { left: sliderLeft(p(value)) } },
  ];
  const majors = range > 0 && major > 0 ? tickValues({ lower: min, upper: max, unit: major }) : [];
  if (node.showTickMarks && majors.length) {
    const marks: Drawn[] = majors.map((v, i) => ({ tag: "span", cls: "fx-tick fx-tick-major", key: `M${i}`, style: { left: sliderLeft(p(v)) } }));
    // Minor ticks only when they leave room between them.
    if (minorCount && majors.length * (minorCount + 1) <= 160) {
      majors.forEach((v, i) => {
        for (let m = 1; m <= minorCount; m++) {
          const at = v + (major * m) / (minorCount + 1);
          if (at < max) marks.push({ tag: "span", cls: "fx-tick", key: `m${i}.${m}`, style: { left: sliderLeft(p(at)) } });
        }
      });
    }
    kids.push({ tag: "span", cls: "fx-slider-marks", key: "marks", kids: marks });
  }
  if (node.showTickLabels && majors.length) {
    const width = size(node.prefWidth) ?? SLIDER_WIDTH;
    const labels = majors.map((v) => tickLabel(v, major));
    const widest = Math.max(...labels.map((l) => textWidth(l, 10.8))) + 6;
    // Every major tick's label when they fit the slider's own width, else every second, third...
    const every = Math.max(1, Math.ceil((labels.length * widest) / Math.max(width - 16, 1)));
    const shown = labels.flatMap((l, i) => (i % every === 0 ? [{ tag: "span" as const, cls: "fx-tick-label", key: `L${i}`, style: { left: sliderLeft(p(majors[i])) }, text: l }] : []));
    kids.push({ tag: "span", cls: "fx-slider-labels", key: "labels", kids: shown });
  }
  const cls = `fx-slider${node.showTickMarks && majors.length ? " fx-slider-with-marks" : ""}${node.showTickLabels && majors.length ? " fx-slider-with-labels" : ""}${off(disabled)}`;
  if (disabled) attrs["aria-disabled"] = "true";
  const block = finite(node.blockIncrement);
  // Snapping: the spacing of the ticks (minor ones too), as the library counts them; none when it is unusable.
  const spacing = major / (Math.max(Math.floor(finite(node.minorTickCount) ?? 3), 0) + 1);
  const snap = node.snapToTicks && spacing > 0 && range > 0 && range / spacing <= 10000 ? spacing : undefined;
  const control: DrawnControl = {
    kind: "slider",
    n: node.n,
    target: targetOf(node, counts.names, k),
    path,
    text: "",
    prompt: "",
    name: `Slider ${k}`,
    disabled,
    editable: true,
    onAction: true,
    wrap: false,
    style: {},
    slider: { min, max, value, block: block != null && block > 0 ? block : 10, precision: sliderPrecision(min, max), ...(snap ? { snap } : {}) },
  };
  return { tag: "span", cls, key, style, attrs, kids, control };
}

/** A chart as SVG of its own size (see window-charts.ts). Its text alternative is the window as text. */
function drawChart(node: WindowNode, style: Css, attrs: Record<string, string>, key: string, disabled: boolean): Drawn {
  const { width, height } = chartSize(node);
  Object.assign(style, { width: px(width), height: px(height) });
  if (disabled) attrs["aria-disabled"] = "true";
  const name = `${CHART_NAMES[node.type]}${node.title ? ` ${quoteText(node.title)}` : ""}: its points are in the window as text`;
  return { tag: "span", cls: "fx-chart" + off(disabled), key, style, attrs: { ...attrs, role: "img", "aria-label": name }, markup: chartSvg(node) };
}

/** The windows of a window JSON, drawn: each with its title and scene. */
export function drawWindows(w: WindowState | null | undefined): DrawnWindow[] {
  if (!w) return [];
  const counts: Counts = { field: 0, password: 0, area: 0, button: 0, names: namesIn(w), kinds: new Map() };
  return w.windows.map((stage: WindowStage, i) => {
    const style: Css = {};
    const sw = size(stage.width);
    const sh = size(stage.height);
    if (sw != null) style.minWidth = px(sw);
    if (sh != null) style.minHeight = px(sh);
    const sceneStyle: Css = {};
    const scene = stage.scene;
    const cw = scene ? size(scene.width) : undefined;
    const ch = scene ? size(scene.height) : undefined;
    if (cw != null) sceneStyle.minWidth = px(cw);
    if (ch != null) sceneStyle.minHeight = px(ch);
    const root = scene ? drawNode(scene.root, { wide: true, tall: true, css: { alignSelf: "stretch", flex: "1 0 auto" } }, `root:${scene.root.type}`, `w${i}`, counts, false, cw != null) : null;
    const label = stage.title == null ? "Window without a title" : `Window: ${stage.title}`;
    return { key: `w${i}`, title: stage.title, label, style, scene: root, sceneStyle };
  });
}

// ------------------------------------------------------------------ as HTML

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const kebab = (k: string) => k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
export const cssText = (css: Css | undefined) =>
  Object.entries(css ?? {})
    .map(([k, v]) => `${kebab(k)}: ${v}`)
    .join("; ");

function html(d: Drawn): string {
  const style = cssText(d.style);
  const attrs = Object.entries(d.attrs ?? {})
    .map(([k, v]) => ` ${k}="${esc(v)}"`)
    .join("");
  const open = `<${d.tag} class="${d.cls}"${style ? ` style="${esc(style)}"` : ""}${attrs}>`;
  if (d.tag === "img") return open;
  // HTML can't run code: a canvas's calls are drawn as SVG.
  // A line break in a text is a character reference, so a blank line in it doesn't end the HTML block Markdown keeps whole.
  const inner = d.markup ?? (d.canvas ? canvasSvg(d.canvas.calls, d.canvas.width, d.canvas.height) : d.text != null ? esc(d.text).replace(/\n/g, "&#10;") : (d.kids ?? []).map(html).join(""));
  return `${open}${inner}</${d.tag}>`;
}

/** The title bar's minimize, maximize and close glyphs (drawn only). */
export const TITLE_BUTTONS_SVG =
  '<svg class="fx-title-buttons" viewBox="0 0 58 12" width="58" height="12" aria-hidden="true" focusable="false"><path d="M1 8.5h10M24 2.5h9v8h-9zM47 2l9 9M56 2l-9 9"/></svg>';

function windowHtml(w: DrawnWindow): string {
  const title = w.title == null ? "" : esc(w.title);
  const scene = w.scene ? html(w.scene) : '<p class="fx-no-scene">(no scene)</p>';
  return `<div class="fx-window"${w.style && cssText(w.style) ? ` style="${esc(cssText(w.style))}"` : ""}><div class="fx-titlebar"><span class="fx-title">${title}</span>${TITLE_BUTTONS_SVG}</div><div class="fx-scene"${cssText(w.sceneStyle) ? ` style="${esc(cssText(w.sceneStyle))}"` : ""}>${scene}</div></div>`;
}

/** What a drawing is called for screen readers: the windows' titles. */
export function drawingLabel(w: WindowState | null | undefined): string {
  const stages = w?.windows ?? [];
  const name = (s: WindowStage) => (s.title == null ? "a window without a title" : `the window ${quoteText(s.title)}`);
  if (stages.length === 1) return `Drawing of ${name(stages[0])}`;
  return `Drawing of ${stages.length} windows: ${stages.map(name).join(", ")}`;
}

/**
 * The note under a frame whose windows are wider than it (on a phone, most windows with a text
 * area): shown only then, by watchFrame in ./window-frame.ts, which also fades the frame's right
 * edge until it is scrolled to the end. Scrollbars on phones show only while scrolling.
 */
export const WIDE_NOTE = "This window is wider than the screen: scroll it sideways, or read it as text below.";

/**
 * A window JSON drawn, as HTML that can't be used (lesson text and pre-rendered pages): the windows
 * in a frame that scrolls sideways when they are wider than the column, which takes the keyboard
 * focus to scroll, with the note that says so (hidden until the page finds the frame too narrow).
 * The drawing itself is hidden from screen readers: the window as text has it all. With no window
 * showing, the outline's sentence instead.
 */
export function windowDrawingHtml(w: WindowState | null | undefined): string {
  const drawn = drawWindows(w);
  if (!drawn.length) return `<p class="fx-none">${esc(windowOutline(w))}</p>`;
  return `<div class="fx-frame"><div class="fx-scroll" tabindex="0" role="group" aria-label="${esc(drawingLabel(w))}"><div class="fx-desktop" aria-hidden="true">${drawn.map(windowHtml).join("")}</div></div><p class="fx-wide-note">${esc(WIDE_NOTE)}</p></div>`;
}

/**
 * The lines of an outline, each with its indent (its leading spaces, at most 40): the window as
 * text wraps a long line under its own start, one step in from it (see .fx-line in styles.css).
 */
export function outlineLines(outline: string): { text: string; indent: number }[] {
  return outline.split("\n").map((text) => ({ text, indent: Math.min(/^ */.exec(text)![0].length, 40) }));
}

/** One line of the window as text, as HTML: the "\n" between lines stays text, so the outline's text is exactly the outline. */
const lineHtml = (l: { text: string; indent: number }) => `<span class="fx-line" style="--indent: ${l.indent}">${esc(l.text)}</span>`;

/** "The window as text": the outline in a closed details element, one element per line. */
export function windowTextHtml(outline: string): string {
  return `<details class="fx-astext"><summary>The window as text</summary><pre><code>${outlineLines(outline).map(lineHtml).join("\n")}</code></pre></details>`;
}

/**
 * A java window example in lesson text (the build's ```window block): the window after the
 * example's clicks and typing (said in plain words), drawn, with the window as text under it.
 */
export function windowFigureHtml(ex: WindowExample): string {
  const after = ex.events.length ? `<p class="fx-events">After: ${esc(describeEvents(ex.events))}</p>` : "";
  return `<figure class="fx-figure"><figcaption>The window</figcaption>${after}${windowDrawingHtml(ex.window)}${windowTextHtml(ex.outline)}</figure>\n`;
}
