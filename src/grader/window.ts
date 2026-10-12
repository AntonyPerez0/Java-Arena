// The windows of JavaFX programs, as Java Arena's practice version of JavaFX (the engine's "javafx"
// library, engine/libraries/javafx) leaves them in .arena/window.json, and the clicks and typing a
// test or the page replays (.arena/events.txt). Shared by the browser's grader and pages and by the
// Node scripts: the content build (scripts/build-content.mjs), its browser replay
// (scripts/content-browser.mjs) and the pre-rendered pages (scripts/prerender.mjs) import this file
// as it is (Node runs TypeScript that has only types to strip, so nothing here may need compiling:
// no enums, namespaces or parameter properties).
//
// Comparisons never use the JSON itself: they use its outline (windowOutline), one line per window
// and per node, which leaves out what a learner can't see or choose freely: the node numbers, the
// sizes of windows and scenes, and whether a button has a handler.
import { EVENTS_FILE } from "./javafx.js";
import { KEY_CODES, KEY_NAMES } from "./keycodes.js";

// ------------------------------------------------------------------ the window JSON

/** A number as the library writes it: a JSON number, or "NaN", "Infinity" and "-Infinity" as strings. */
export type WindowNumber = number | string;

/**
 * One node: `n` numbers the nodes of all windows from 1 in outline order; `type` is the nearest
 * class of Java Arena's JavaFX (a learner's class MenuView extends VBox is a "VBox"). Every other
 * field is there only when it isn't the default (see engine/libraries/javafx/src/arena/fx/WindowJson.java).
 */
export type WindowNode = {
  n: number;
  type: string;
  /** The node's number in the animation's frames (`frames`), when frames ran and showed it. */
  f?: number;
  /** A GridPane's child: its cell (always) and spans (above 1). */
  column?: number;
  row?: number;
  columnSpan?: number;
  rowSpan?: number;
  id?: string;
  /** Labels, buttons and text inputs always have it (null after setText(null) on a label or button). */
  text?: string | null;
  promptText?: string;
  /** The node's own setDisable(true). */
  disable?: boolean;
  /** false after setVisible(false). */
  visible?: boolean;
  /** false after setEditable(false). */
  editable?: boolean;
  wrapText?: boolean;
  font?: { family: string | null; size: WindowNumber } | null;
  style?: string;
  prefWidth?: WindowNumber;
  prefHeight?: WindowNumber;
  /** [top, right, bottom, left] */
  padding?: WindowNumber[];
  spacing?: WindowNumber;
  hgap?: WindowNumber;
  vgap?: WindowNumber;
  /** A Pos constant's name, when not the pane's default (TOP_LEFT; CENTER for a StackPane). */
  alignment?: string | null;
  /** A button or text field with a handler (setOnAction). */
  onAction?: boolean;
  /**
   * A node with mouse handlers (setOnMousePressed and the like). They run on a canvas or an image
   * view; on any other node they never run in Java Arena, and the page says so (mouseNotices).
   */
  onMousePressed?: boolean;
  onMouseDragged?: boolean;
  onMouseReleased?: boolean;
  onMouseClicked?: boolean;
  /** A canvas: its size and its drawing calls in order (the first KEPT_CALLS, 5000; callCount when there were more). */
  width?: WindowNumber;
  height?: WindowNumber;
  calls?: DrawCall[];
  callCount?: number;
  /** An image view's image: null (none), its error, or its size, CRC and (up to 512 x 512) pixels. */
  image?: ViewImage | { error: string } | null;
  /** A slider. */
  min?: WindowNumber;
  max?: WindowNumber;
  value?: WindowNumber;
  majorTickUnit?: WindowNumber;
  minorTickCount?: number;
  blockIncrement?: WindowNumber;
  showTickLabels?: boolean;
  showTickMarks?: boolean;
  snapToTicks?: boolean;
  /** A chart (LineChart, BarChart, ScatterChart): its title (always there, null for none), its axes and series. */
  title?: string | null;
  legendVisible?: boolean;
  createSymbols?: boolean;
  xAxis?: ChartAxis;
  yAxis?: ChartAxis;
  series?: ChartSeries[] | null;
  /** Where the node is moved and turned: each only when it isn't 0. */
  translateX?: WindowNumber;
  translateY?: WindowNumber;
  layoutX?: WindowNumber;
  layoutY?: WindowNumber;
  rotate?: WindowNumber;
  /** Key handlers set on the node itself, which never run in Java Arena (key events go to the scene). */
  onKeyPressed?: boolean;
  onKeyReleased?: boolean;
  onKeyTyped?: boolean;
  /** A Polygon's points, x and y one after the other. */
  points?: (WindowNumber | null)[];
  /** A Circle. */
  centerX?: WindowNumber;
  centerY?: WindowNumber;
  radius?: WindowNumber;
  /** A Rectangle's corner (with width and height), or a Text's baseline start. */
  x?: WindowNumber;
  y?: WindowNumber;
  /** A Line. */
  startX?: WindowNumber;
  startY?: WindowNumber;
  endX?: WindowNumber;
  endY?: WindowNumber;
  /** A Path from Shape.intersect: the box of its area [minX, minY, maxX, maxY], or null when empty. */
  area?: WindowNumber[] | null;
  /** A shape's fill (#rrggbb or #rrggbbaa; null for none), its stroke when it has one, and the stroke's width when it isn't 1. */
  fill?: string | null;
  stroke?: string | null;
  strokeWidth?: WindowNumber;
  /** A pane's children (a GridPane's by row, then column); a BorderPane has top, left, center, right and bottom instead. */
  children?: WindowNode[];
  top?: WindowNode;
  left?: WindowNode;
  center?: WindowNode;
  right?: WindowNode;
  bottom?: WindowNode;
};

/**
 * One drawing call on a canvas, with the state it used: `fill` for fillRect, fillOval, fillText and
 * fillPolygon; `stroke` and `lineWidth` for strokeRect, strokeOval, strokeLine, strokeText and
 * strokePolygon; `font` for the texts; nothing for clearRect. Colors are #rrggbb, or #rrggbbaa when
 * not opaque. `args` are x, y, width, height (x1, y1, x2, y2 for strokeLine; x, y for a text);
 * polygons have `xs` and `ys` instead.
 */
export type DrawCall = {
  op: string;
  text?: string;
  args?: WindowNumber[];
  xs?: WindowNumber[];
  ys?: WindowNumber[];
  fill?: string;
  stroke?: string;
  lineWidth?: WindowNumber;
  /** The font of a text: its family and size, and its style when it isn't Regular (Bold, Italic or Bold Italic), which the outline leaves out. */
  font?: { family: string | null; size: WindowNumber; style?: string };
};

/** An image view's image: its size, the CRC-32 of its ARGB values row by row, and its RGBA pixels as base64 (only up to 512 x 512). */
export type ViewImage = { width: WindowNumber; height: WindowNumber; crc: string; pixels?: string };

/** A chart's axis: a NumberAxis with its bounds and tick unit, or a CategoryAxis with its categories. */
export type ChartAxis = {
  type: string;
  label: string | null;
  autoRanging: boolean;
  lowerBound?: WindowNumber;
  upperBound?: WindowNumber;
  tickUnit?: WindowNumber;
  forceZeroInRange?: boolean;
  minorTickVisible?: boolean;
  categories?: (string | null)[];
};

/** A data point's x or y: a number, a category's text, or null. */
export type ChartValue = number | string | null;

/** A series: its name and its points as [x, y] (null for a point or a series that is null). */
export type ChartSeries = { name: string | null; data: ([ChartValue, ChartValue] | null)[] | null } | null;

/** A scene: its size (given, or its root pane's preferred size), whether it has key handlers, and its root. */
export type WindowScene = { width?: WindowNumber; height?: WindowNumber; onKeyPressed?: boolean; onKeyReleased?: boolean; onKeyTyped?: boolean; root: WindowNode };

/**
 * One change in a frame of the animation: `k` is the node's number in the frames (a node's "f" in
 * the window), `type` comes the first time a frame shows it, with everything else; after that only
 * what changed since the frame before. Numbers are in hundredths. `tx`, `ty`, `lx`, `ly` and `r`
 * are the translate, layout and rotate; the other keys are the window JSON's own (points, centerX,
 * fill, text, children...). A change {"roots": [...]} gives the root of each showing window.
 */
export type FrameChange = { k?: number; roots?: number[]; type?: string; [key: string]: unknown };

/** The frames that ran: how many, and the first FRAMES_KEPT of them, each a list of changes. */
export type WindowFrames = { count: number; list: FrameChange[][] };

/** A showing window (a Stage). `width` and `height` only when setWidth and setHeight set them. */
export type WindowStage = { title: string | null; width?: WindowNumber; height?: WindowNumber; scene: WindowScene | null };

/**
 * .arena/window.json: the windows showing when the session ended (the main one first), whether it
 * ended by closing them (`close`, Platform.exit() or closing the last window; `windows` is then
 * empty), and the events that couldn't happen, each as "the event line: why" in plain English.
 */
export type WindowState = { windows: WindowStage[]; closed?: boolean; problems: string[]; frames?: WindowFrames };

/** The frames the window JSON keeps, at most (one minute at 60 frames a second); after that only the count goes on. */
export const FRAMES_KEPT = 3600;

/** The window JSON a run left, or null when there is none or it can't be read. */
export function parseWindow(text: string | null | undefined): WindowState | null {
  if (typeof text !== "string" || !text) return null;
  try {
    const w = JSON.parse(text);
    if (!w || typeof w !== "object" || !Array.isArray(w.windows) || !Array.isArray(w.problems)) return null;
    return w as WindowState;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ the outline

/** The outline when no window is showing. */
export const NO_WINDOW = "No window is open.";
/** The outline when the session ended by closing the windows (the close event, Platform.exit() or the last window closed). */
export const CLOSED_WINDOW = "No window is open: the windows were closed.";

/** A number for people: 10.0 as 10, 2.5 as 2.5; NaN and the infinities as Java writes them (the JSON has them as strings). */
const num = (v: WindowNumber) => String(v);

/**
 * A number of the new lines (canvas, image view, slider, chart) as Java writes a double, without a
 * trailing .0: 10, 2.5, 0.001, 1.0E7, 1.5E-4, -0. The digits are the shortest that give the number
 * back, as both Java (from JDK 19) and JavaScript choose them; NaN and the infinities as Java writes them.
 */
export function javaNumber(v: WindowNumber): string {
  if (typeof v === "string") return v;
  if (Number.isNaN(v)) return "NaN";
  if (!Number.isFinite(v)) return v > 0 ? "Infinity" : "-Infinity";
  if (v === 0) return Object.is(v, -0) ? "-0" : "0";
  const sign = v < 0 ? "-" : "";
  let [mantissa, e] = Math.abs(v).toExponential().split("e");
  // Java gives a number whose shortest form has one digit two digits when a two-digit one is
  // closer to it and still gives it back (only tiny subnormal numbers: 4.9E-324, not 5E-324).
  if (mantissa.length === 1) {
    const [two, twoE] = Math.abs(v).toPrecision(2).includes("e") ? Math.abs(v).toPrecision(2).split("e") : [Math.abs(v).toExponential(1).split("e")[0], e];
    if (two !== `${mantissa}.0` && Number(`${two}e${twoE}`) === Math.abs(v)) [mantissa, e] = [two, twoE];
  }
  const digits = mantissa.replace(".", "");
  const exp = Number(e);
  const abs = Math.abs(v);
  let text: string;
  if (abs >= 1e-3 && abs < 1e7) {
    if (exp >= 0) {
      const whole = digits.length > exp + 1 ? digits.slice(0, exp + 1) : digits.padEnd(exp + 1, "0");
      const fraction = digits.length > exp + 1 ? digits.slice(exp + 1) : "0";
      text = `${whole}.${fraction}`;
    } else text = `0.${"0".repeat(-exp - 1)}${digits}`;
  } else text = `${digits[0]}.${digits.length > 1 ? digits.slice(1) : "0"}E${exp}`;
  text = sign + text;
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}

/** A chart's value: a number as javaNumber writes it, a text in quotes, or null. */
const chartValue = (v: ChartValue) => (v == null ? "null" : typeof v === "number" ? javaNumber(v) : quoteText(v));

/** The canvas calls that the outline lists, at most; more are counted in one line. */
export const OUTLINE_CALLS = 2000;
/** The calls a canvas keeps for the drawing (the library's limit). */
export const KEPT_CALLS = 5000;

/** One drawing call as an outline line: fillRect 10 10 50 30, fill #ff0000 (see DrawCall). */
export function drawCallLine(c: DrawCall): string {
  let line = c.op;
  if (c.text != null) line += " " + quoteText(c.text);
  if (c.args) line += " " + c.args.map(javaNumber).join(" ");
  if (c.xs && c.ys) line += " " + c.xs.map((x, i) => `(${javaNumber(x)}, ${javaNumber(c.ys![i])})`).join(" ");
  if (c.fill != null) line += `, fill ${c.fill}`;
  if (c.stroke != null) line += `, stroke ${c.stroke}, width ${javaNumber(c.lineWidth ?? 1)}`;
  if (c.font) line += `, font ${family(c.font.family)} ${javaNumber(c.font.size)}`;
  return line;
}

/** A chart's axis as an outline line: x axis NumberAxis "Year" 2000 to 2020 by 5 (the bounds only when it isn't auto-ranging). */
export function axisLine(which: "x" | "y", a: ChartAxis): string {
  let line = `${which} axis ${a.type}`;
  if (a.label != null) line += " " + quoteText(a.label);
  if (!a.autoRanging && a.lowerBound !== undefined && a.upperBound !== undefined && a.tickUnit !== undefined) line += ` ${javaNumber(a.lowerBound)} to ${javaNumber(a.upperBound)} by ${javaNumber(a.tickUnit)}`;
  return line;
}

/** A series as an outline line: series "Helsinki": (2000, 555) (2005, 560). */
export function seriesLine(s: ChartSeries): string {
  if (s == null) return "series null";
  const head = s.name == null ? "series without a name:" : `series ${quoteText(s.name)}:`;
  if (s.data == null) return `${head} data null`;
  if (!s.data.length) return `${head} no data`;
  return `${head} ${s.data.map((d) => (d == null ? "null" : `(${chartValue(d[0])}, ${chartValue(d[1])})`)).join(" ")}`;
}

/** The types of the new lines, which the outline writes with javaNumber. */
const CHARTS = ["LineChart", "BarChart", "ScatterChart"];

/** Text in double quotes, with \" \\ \n \t \r and other control characters escaped as in Java. */
export function quoteText(text: string): string {
  let out = '"';
  for (const c of text) {
    if (c === '"' || c === "\\") out += "\\" + c;
    else if (c === "\n") out += "\\n";
    else if (c === "\t") out += "\\t";
    else if (c === "\r") out += "\\r";
    else if (c < " " || c === "\u007f") out += "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0");
    else out += c;
  }
  return out + '"';
}

/** A font family as written in the outline: plain when it is one word, else in quotes. */
const family = (f: string | null) => (f == null ? "null" : /^[A-Za-z][A-Za-z0-9_-]*$/.test(f) ? f : quoteText(f));

/** The BorderPane regions, in outline order. */
const REGIONS = ["top", "left", "center", "right", "bottom"] as const;

/**
 * What follows a node's class and id on its line for the new kinds of node: the canvas's size, the
 * image view's image, the slider's range and value, the chart's title. Null for the others.
 */
function newKindHead(node: WindowNode): { head: string; settings: string[]; flags: string[] } | null {
  if (node.type === "Canvas" && node.calls) return { head: `${javaNumber(node.width ?? 0)} x ${javaNumber(node.height ?? 0)}`, settings: [], flags: [] };
  if (node.type === "ImageView" && node.image !== undefined) {
    const img = node.image;
    if (img == null) return { head: "(no image)", settings: [], flags: [] };
    if ("error" in img) return { head: `(image error: ${img.error})`, settings: [], flags: [] };
    return { head: `${javaNumber(img.width)} x ${javaNumber(img.height)}`, settings: [`pixels ${img.crc}`], flags: [] };
  }
  if (node.type === "Slider" && node.min !== undefined) {
    const settings = [`value ${javaNumber(node.value ?? 0)}`];
    if (node.showTickLabels) settings.push("tick labels");
    if (node.showTickMarks) settings.push("tick marks");
    if (node.majorTickUnit !== undefined && node.majorTickUnit !== 25) settings.push(`major tick ${javaNumber(node.majorTickUnit)}`);
    if (node.snapToTicks) settings.push("snaps");
    return { head: `${javaNumber(node.min)} to ${javaNumber(node.max ?? 0)}`, settings, flags: [] };
  }
  if (CHARTS.includes(node.type) && node.xAxis) {
    const flags: string[] = [];
    if (node.legendVisible === false) flags.push("no legend");
    if (node.createSymbols === false) flags.push("no symbols");
    return { head: node.title == null ? "without a title" : quoteText(node.title), settings: [], flags };
  }
  if (SHAPES.includes(node.type) && "fill" in node) return shapeHead(node);
  if (node.type === "Pane" && node.prefWidth != null && node.prefHeight != null) return { head: `${javaNumber(node.prefWidth)} x ${javaNumber(node.prefHeight)}`, settings: [], flags: [] };
  return null;
}

/** The shapes, whose lines the outline writes with javaNumber. */
const SHAPES = ["Polygon", "Circle", "Rectangle", "Line", "Text", "Path"];

/** A point as the outline writes it: (10, 20). */
const point = (x: WindowNumber | null | undefined, y: WindowNumber | null | undefined) => `(${x == null ? "null" : javaNumber(x)}, ${y == null ? "null" : javaNumber(y)})`;

/** A node's translate, layout and rotate as outline settings, each when it isn't 0; `at` names the translate "at" (a Polygon, whose points have no place of their own). */
function transformSettings(node: WindowNode, at = false): string[] {
  const out: string[] = [];
  if (node.translateX != null || node.translateY != null) out.push(`${at ? "at" : "translate"} ${point(node.translateX ?? 0, node.translateY ?? 0)}`);
  if (node.layoutX != null || node.layoutY != null) out.push(`layout ${point(node.layoutX ?? 0, node.layoutY ?? 0)}`);
  if (node.rotate != null) out.push(`rotate ${javaNumber(node.rotate)}`);
  return out;
}

/**
 * A shape's line after its class: Polygon (0, -10) (10, 10) (-10, 10); Circle radius 20 at (150, 100);
 * Rectangle 40 x 20 at (10, 10); Line (0, 0) to (100, 50); Text "Points: 30" at (10, 20); Path. Then
 * its translate, layout and rotate, its fill (always, but for a Line, which has none unless set, and a
 * Text, when it isn't black), and its stroke when it has one (with its width when it isn't 1).
 */
function shapeHead(node: WindowNode): { head: string; settings: string[]; flags: string[] } {
  let head = "";
  switch (node.type) {
    case "Polygon": {
      const pts = node.points ?? [];
      const pairs: string[] = [];
      for (let i = 0; i + 1 < pts.length; i += 2) pairs.push(point(pts[i], pts[i + 1]));
      head = pairs.length ? pairs.join(" ") : "(no points)";
      break;
    }
    case "Circle":
      head = `radius ${javaNumber(node.radius ?? 0)} at ${point(node.centerX ?? 0, node.centerY ?? 0)}`;
      break;
    case "Rectangle":
      head = `${javaNumber(node.width ?? 0)} x ${javaNumber(node.height ?? 0)} at ${point(node.x ?? 0, node.y ?? 0)}`;
      break;
    case "Line":
      head = `${point(node.startX ?? 0, node.startY ?? 0)} to ${point(node.endX ?? 0, node.endY ?? 0)}`;
      break;
    case "Text":
      head = `${quoteText(typeof node.text === "string" ? node.text : "")} at ${point(node.x ?? 0, node.y ?? 0)}`;
      break;
    case "Path":
      head = node.area == null ? "(no area)" : `area ${point(node.area[0], node.area[1])} to ${point(node.area[2], node.area[3])}`;
      break;
  }
  const settings = transformSettings(node, node.type === "Polygon");
  const fill = node.fill ?? null;
  if (node.type === "Line") {
    if (fill != null) settings.push(`fill ${fill}`);
  } else if (node.type !== "Text" || fill !== "#000000") settings.push(fill == null ? "no fill" : `fill ${fill}`);
  if (node.stroke != null) settings.push(`stroke ${node.stroke}${node.strokeWidth != null ? `, width ${javaNumber(node.strokeWidth)}` : ""}`);
  else if (node.strokeWidth != null) settings.push(`stroke width ${javaNumber(node.strokeWidth)}`);
  return { head, settings, flags: [] };
}

/** One node's line, without its indentation: [region: ][(column, row)[ span CxR] ]Type[ #id][ "text"][ settings][ (flags)]. */
export function nodeLine(node: WindowNode, region?: string): string {
  let head = region ? `${region}: ` : "";
  if (node.column != null || node.row != null) {
    head += `(${node.column ?? 0}, ${node.row ?? 0}) `;
    if ((node.columnSpan ?? 1) > 1 || (node.rowSpan ?? 1) > 1) head += `span ${node.columnSpan ?? 1}x${node.rowSpan ?? 1} `;
  }
  head += node.type;
  if (node.id != null) head += ` #${node.id}`;
  const kind = newKindHead(node);
  const shape = kind != null && SHAPES.includes(node.type);
  if (kind) head += " " + kind.head;
  const hasText = "text" in node || kind != null;
  // A Text's text is in its head (Text "Points: 30" at (10, 20)).
  if ("text" in node && !shape) head += " " + (node.text == null ? "null" : quoteText(node.text));
  const pane = kind != null && node.type === "Pane";
  const settings: string[] = kind ? [...kind.settings] : [];
  if (node.promptText != null) settings.push(`prompt ${quoteText(node.promptText)}`);
  if (node.font !== undefined) settings.push(node.font === null ? "font null" : `font ${family(node.font.family)} ${num(node.font.size)}`);
  if (node.spacing != null) settings.push(`spacing ${num(node.spacing)}`);
  if (node.hgap != null) settings.push(`hgap ${num(node.hgap)}`);
  if (node.vgap != null) settings.push(`vgap ${num(node.vgap)}`);
  if (node.padding) {
    const p = node.padding.map(num);
    settings.push(`padding ${p.every((x) => x === p[0]) ? p[0] : p.join(" ")}`);
  }
  if (node.alignment !== undefined) settings.push(`alignment ${node.alignment ?? "null"}`);
  if (node.prefWidth != null && !pane) settings.push(`pref width ${num(node.prefWidth)}`);
  if (node.prefHeight != null && !pane) settings.push(`pref height ${num(node.prefHeight)}`);
  if (node.style != null) settings.push(`style ${quoteText(node.style)}`);
  if (!shape) settings.push(...transformSettings(node));
  const flags: string[] = kind ? [...kind.flags] : [];
  if (node.disable) flags.push("disabled");
  if (node.visible === false) flags.push("hidden");
  if (node.editable === false) flags.push("not editable");
  if (node.wrapText) flags.push("wraps text");
  let line = head;
  // "VBox spacing 10", but "Label "Hi", font Serif 20" and "VBox #menu, spacing 10".
  if (settings.length) line += (hasText || node.id != null ? ", " : " ") + settings.join(", ");
  if (flags.length) line += ` (${flags.join(", ")})`;
  return line;
}

function outlineNode(node: WindowNode, depth: number, out: string[], region?: string) {
  out.push("  ".repeat(depth) + nodeLine(node, region));
  const inner = "  ".repeat(depth + 1);
  if (node.type === "Canvas" && node.calls) {
    for (const c of node.calls.slice(0, OUTLINE_CALLS)) out.push(inner + drawCallLine(c));
    const total = node.callCount ?? node.calls.length;
    if (total > OUTLINE_CALLS) out.push(`${inner}... and ${total - OUTLINE_CALLS} more calls${total > node.calls.length ? ` (the drawing shows the first ${node.calls.length})` : ""}`);
  }
  if (CHARTS.includes(node.type) && node.xAxis && node.yAxis) {
    out.push(inner + axisLine("x", node.xAxis), inner + axisLine("y", node.yAxis));
    if (node.series == null) out.push(inner + "data null");
    else for (const s of node.series) out.push(inner + seriesLine(s));
  }
  for (const r of REGIONS) {
    const child = node[r];
    if (child) outlineNode(child, depth + 1, out, r);
  }
  for (const child of node.children ?? []) outlineNode(child, depth + 1, out);
}

/**
 * The window as text: the canonical outline that grading, the JDK-versus-browser checks and the
 * real-JavaFX check compare, and the "window as text" the page shows. One line per window
 * (Window "Title", or Window without a title) and per node, indented two spaces per level:
 *
 *   Window "Counter"
 *     VBox spacing 10, padding 10
 *       Label "Clicks: 2"
 *       HBox spacing 5
 *         Button "Add"
 *         Button "Reset" (disabled)
 *
 * A node's line is its type, its #id, its text in quotes, then its settings (prompt, font, spacing,
 * hgap, vgap, padding, alignment, pref width, pref height, style) and its flags in parentheses
 * (disabled, hidden, not editable, wraps text), each only when it isn't the default. A BorderPane's
 * children start with their region (top: Label "Menu"), a GridPane's with their cell, column first
 * ((0, 1) Button "7", (0, 1) span 2x1 TextArea ""). Left out: the node numbers, the sizes of windows
 * and scenes, and onAction. No window (or no window file): "No window is open."
 *
 * The nodes of part 14 write their numbers as Java writes a double, without a trailing .0
 * (javaNumber): Canvas 300 x 200, with one line under it per drawing call (fillRect 10 10 50 30, fill
 * #ff0000; strokeLine 0 0 100 50, stroke #000000, width 2; fillText "Hi" 20 40, fill #000000, font
 * System 13; at most 2000, then "... and N more calls"); ImageView 64 x 48, pixels 3f2a9c1e (the
 * CRC-32 of its ARGB values), ImageView (no image) or ImageView (image error: ...); Slider 0 to 100,
 * value 25 (with tick labels, tick marks, major tick N and snaps when set); LineChart "Title" (or
 * without a title, flags no legend and no symbols), with its x axis, y axis and series under it
 * (x axis NumberAxis "Year" 2000 to 2020 by 5, series "Helsinki": (2000, 555) (2005, 560)). Mouse
 * handlers, a slider's block increment and minor tick count, and the categories an axis took from
 * the data are left out.
 *
 * Part 14.3's shapes, in their parent's coordinates: Polygon (0, -10) (10, 10) (-10, 10), at
 * (300, 200), rotate 90, fill #000000 (the points as given, then its translate as "at", its layout
 * and rotate when they aren't 0, its fill, and its stroke when it has one, with the stroke's width
 * when it isn't 1); Circle radius 20 at (150, 100), fill ...; Rectangle 40 x 20 at (10, 10), fill
 * ...; Line (0, 0) to (100, 50), stroke #000000 (a fill only when set); Text "Points: 30" at
 * (10, 20) (its fill only when it isn't black); Path area (5, 5) to (10, 10). The other shapes and
 * nodes give their translate as "translate (x, y)", then "layout (x, y)" and "rotate r". A Pane
 * with a preferred width and height is Pane 600 x 400. When frames ran, the last line is
 * "frames run: N".
 */
export function windowOutline(w: WindowState | null | undefined): string {
  if (!w || !w.windows.length) return (w?.closed ? CLOSED_WINDOW : NO_WINDOW) + (w ? framesLine(w) : "");
  const out: string[] = [];
  for (const stage of w.windows) {
    out.push(stage.title == null ? "Window without a title" : `Window ${quoteText(stage.title)}`);
    if (!stage.scene) out.push("  (no scene)");
    else outlineNode(stage.scene.root, 1, out);
  }
  return out.join("\n") + framesLine(w);
}

/** "\nframes run: 120" when frames ran (the outline's last line), else "". */
const framesLine = (w: WindowState) => (w.frames && w.frames.count > 0 ? `\nframes run: ${w.frames.count}` : "");

const MOUSE_HANDLERS = ["onMousePressed", "onMouseDragged", "onMouseReleased", "onMouseClicked"] as const;
/** A list in words: a, b and c. */
const andList = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/**
 * A sentence for each node other than a canvas or an image view that has mouse handlers, which
 * real JavaFX would run on a click but Java Arena never does (its clicks on a button run
 * setOnAction, and its mouse events go only to a canvas or an image view). Not part of the outline
 * or the problems: the page shows them next to the window.
 */
export function mouseNotices(w: WindowState | null | undefined): string[] {
  const out: string[] = [];
  const visit = (node: WindowNode | undefined) => {
    if (!node) return;
    if (node.type !== "Canvas" && node.type !== "ImageView") {
      const set = MOUSE_HANDLERS.filter((h) => node[h]).map((h) => "set" + h.charAt(0).toUpperCase() + h.slice(1));
      if (set.length) {
        const noun = nodeNoun(node.type);
        const name = `The ${noun}${typeof node.text === "string" ? " " + quoteText(node.text) : ""}`;
        const button = node.type === "Button" || node.type === "ButtonBase";
        out.push(`${name} has ${andList(set)}, which never ${set.length > 1 ? "run" : "runs"} in Java Arena: ${button ? "a click on a button here runs its setOnAction, and " : ""}mouse handlers run only on a Canvas or an ImageView.`);
      }
    }
    for (const r of REGIONS) visit(node[r]);
    for (const c of node.children ?? []) visit(c);
  };
  for (const stage of w?.windows ?? []) visit(stage.scene?.root);
  return out;
}

/** One line of an outline and whether it is one of the lines where two outlines differ. */
export type OutlineLine = { text: string; differs: boolean };

/**
 * Two outlines line by line, each line marked when it isn't in both (lines that a longest common
 * subsequence of the two leaves out), for showing the expected window next to the learner's.
 */
export function compareOutlines(expected: string, got: string): { expected: OutlineLine[]; got: OutlineLine[] } {
  const a = expected.split("\n");
  const b = got.split("\n");
  // lcs[i][j]: the longest common subsequence of a[i..] and b[j..].
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const inA = new Array<boolean>(a.length).fill(false);
  const inB = new Array<boolean>(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length; ) {
    if (a[i] === b[j]) {
      inA[i++] = true;
      inB[j++] = true;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i++;
    else j++;
  }
  return { expected: a.map((text, i) => ({ text, differs: !inA[i] })), got: b.map((text, j) => ({ text, differs: !inB[j] })) };
}

// ------------------------------------------------------------------ events

/** The JavaFX classes an event's target can name (Java Arena's node classes). */
export const NODE_TYPES = ["Node", "Parent", "Region", "Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Control", "Labeled", "Label", "ButtonBase", "Button", "TextInputControl", "TextField", "PasswordField", "TextArea", "Canvas", "ImageView", "Slider", "LineChart", "BarChart", "ScatterChart", "Shape", "Polygon", "Circle", "Rectangle", "Line", "Text", "Path"];

export type EventCommand = "click" | "type" | "set" | "enter" | "close" | "press" | "drag" | "release" | "press key" | "release key" | "key" | "frames";
/** The words an event line can start with. */
const COMMANDS = ["click", "type", "set", "enter", "close", "press", "drag", "release", "key", "frames"];
const MOUSE_COMMANDS = ["press", "drag", "release"];

/**
 * What an event acts on: #N (the node numbered N in the window JSON of the moment, as the page
 * clicks), #id (the node whose setId gave it that id), Type "text" (the first node of that class,
 * or of a class that extends it, whose text that is, in outline order) or Type K (the K-th one).
 */
export type EventTarget = { kind: "number"; n: number } | { kind: "id"; id: string } | { kind: "text"; type: string; text: string } | { kind: "index"; type: string; index: number };

/**
 * One event line read: the event, or why it can't be read (the library's words, as in the window
 * JSON's problems). `number` is the number of set Slider 1 25, `point` the point of a mouse event
 * (press, drag, release, and click ... at), each as written.
 */
export type ParsedEvent = { line: string; command: EventCommand; target?: EventTarget; text?: string; number?: string; point?: { x: string; y: string }; key?: string; problem?: undefined } | { line: string; problem: string };

/** A line as the library sees it: without the characters up to a space at its ends (Java's trim). */
const trimLine = (s: string) => s.replace(/^[\u0000- ]+|[\u0000- ]+$/g, "");

/** The class in plain words: "button", "text field", or the class name for panes (as the library says it). */
export function nodeNoun(type: string): string {
  switch (type) {
    case "Button":
    case "ButtonBase":
      return "button";
    case "Label":
      return "label";
    case "Labeled":
      return "label or button";
    case "TextField":
      return "text field";
    case "PasswordField":
      return "password field";
    case "TextArea":
      return "text area";
    case "TextInputControl":
      return "text field or text area";
    case "Control":
      return "control";
    case "Node":
      return "node";
    case "Canvas":
      return "canvas";
    case "ImageView":
      return "image view";
    case "Slider":
      return "slider";
    case "LineChart":
      return "line chart";
    case "BarChart":
      return "bar chart";
    case "ScatterChart":
      return "scatter chart";
    case "Shape":
      return "shape";
    case "Polygon":
      return "polygon";
    case "Circle":
      return "circle";
    case "Rectangle":
      return "rectangle";
    case "Line":
      return "line";
    case "Text":
      return "text";
    case "Path":
      return "path";
    default:
      return type;
  }
}

class Bad extends Error {}

// ------------------------------------------------------------------ keys and frames

/** Other names people give keys, and KeyCode's (the library's Keys.ALIASES). */
const KEY_ALIASES: Record<string, string> = {
  ESC: "ESCAPE",
  CTRL: "CONTROL",
  SPACEBAR: "SPACE",
  RETURN: "ENTER",
  DEL: "DELETE",
  BACKSPACE: "BACK_SPACE",
  ARROWLEFT: "LEFT",
  ARROWRIGHT: "RIGHT",
  ARROWUP: "UP",
  ARROWDOWN: "DOWN",
  LEFTARROW: "LEFT",
  RIGHTARROW: "RIGHT",
  UPARROW: "UP",
  DOWNARROW: "DOWN",
  PGUP: "PAGE_UP",
  PGDN: "PAGE_DOWN",
  INS: "INSERT",
};

/** ASCII letters in capitals (as the library makes them, the same in every locale). */
const asciiUpper = (s: string) => s.replace(/[a-z]/g, (c) => c.toUpperCase());

/** The edit distance between a and b, one UTF-16 unit at a time (as the library's Keys.distance). */
function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(cur[j - 1] + 1, prev[j] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Why a key's name in an event line isn't one of KeyCode's, naming the closest real one; null when
 * it is one. The library's Keys.nameProblem, word for word.
 */
export function keyNameProblem(word: string): string | null {
  if (KEY_CODES.includes(word)) return null;
  const upper = asciiUpper(word);
  if (KEY_CODES.includes(upper)) return `write the key's name in capital letters, as KeyCode names it: ${upper}`;
  let suggestion: string | undefined;
  if (/^[0-9]$/.test(word)) suggestion = `DIGIT${word}`;
  else {
    const bare = upper.replace(/[_\- ]/g, "");
    suggestion = KEY_CODES.find((k) => k.replace(/_/g, "") === bare) ?? KEY_ALIASES[bare];
    if (!suggestion) {
      let best = Infinity;
      for (const k of KEY_CODES) {
        const d = editDistance(upper, k);
        if (d < best) [best, suggestion] = [d, k];
      }
    }
  }
  return `there's no key called ${word} (did you mean ${suggestion}? keys are named as in KeyCode, such as LEFT, UP, SPACE, A and DIGIT1)`;
}

/** A key's name for people, as KeyCode.getName() gives it: LEFT is "Left", DIGIT1 is "1". */
export const keyName = (code: string) => KEY_NAMES[KEY_CODES.indexOf(code)] ?? code;

/** The frames a frames line may run at once. */
const MAX_FRAMES_LINE = 3600;

/** press key LEFT, release key LEFT, key SPACE: the KeyCode name after the command, checked. */
function keyEvent(line: string, command: "press key" | "release key" | "key", toks: Token[], at: number): ParsedEvent {
  const example = `${command} ${command === "key" ? "SPACE" : "LEFT"}`;
  if (at >= toks.length) throw new Bad(`${command} needs the name of a key, such as ${example}`);
  const name = toks[at];
  if (name.quoted) throw new Bad(`write the key's name without quotes, such as ${example}`);
  const problem = keyNameProblem(name.text);
  if (problem) throw new Bad(problem);
  if (at + 1 < toks.length) throw new Bad("there's something extra at the end of the line");
  return { line, command, key: name.text };
}

/** frames 30: a whole number of frames from 1 to 3600. */
function framesEvent(line: string, toks: Token[]): ParsedEvent {
  if (toks.length < 2) throw new Bad("frames needs how many frames to run, such as frames 30");
  const n = toks[1];
  if (n.quoted || !digits(n.text) || number(n.text) < 1 || number(n.text) > MAX_FRAMES_LINE) throw new Bad(`frames takes a whole number from 1 to ${MAX_FRAMES_LINE}, such as frames 30`);
  if (toks.length > 2) throw new Bad("there's something extra at the end of the line");
  return { line, command: "frames", number: String(number(n.text)) };
}

type Token = { text: string; quoted: boolean };

function tokens(line: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  const n = line.length;
  while (i < n) {
    const c = line[i];
    if (c <= " ") i++;
    else if (c === '"') {
      let text = "";
      i++;
      for (;;) {
        if (i >= n) throw new Bad("the text has no closing double quote");
        const d = line[i++];
        if (d === '"') break;
        if (d !== "\\") {
          text += d;
          continue;
        }
        if (i >= n) throw new Bad("the text has no closing double quote");
        const e = line[i++];
        const simple: Record<string, string> = { '"': '"', "\\": "\\", "'": "'", n: "\n", t: "\t", r: "\r", b: "\b", f: "\f" };
        if (e in simple) text += simple[e];
        else if (e === "u") {
          while (i < n && line[i] === "u") i++;
          const hex = line.slice(i, i + 4);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) throw new Bad("\\u must be followed by four hexadecimal digits, such as \\u00e4");
          text += String.fromCharCode(parseInt(hex, 16));
          i += 4;
        } else throw new Bad(`\\${e} isn't an escape Java knows (use \\" \\\\ \\n \\t or \\uXXXX)`);
      }
      out.push({ text, quoted: true });
    } else {
      const from = i;
      while (i < n && line[i] > " " && line[i] !== '"') i++;
      out.push({ text: line.slice(from, i), quoted: false });
    }
  }
  return out;
}

const digits = (s: string) => /^[0-9]+$/.test(s);
/** A number as event lines write them (the library's EventParser.isNumber): 25, -3, 2.5. */
const isNumber = (s: string) => /^-?[0-9]+(\.[0-9]+)?$/.test(s);
/** An example of a command's line, for the problems. */
function example(command: string): string {
  switch (command) {
    case "click":
      return 'click Button "OK"';
    case "enter":
      return "enter TextField 1";
    case "press":
      return "press Canvas 1 at 10 20";
    case "drag":
      return "drag Canvas 1 to 30 40";
    case "release":
      return "release Canvas 1 at 30 40";
    default:
      return `${command} TextField 1 "Ada"`;
  }
}
const number = (s: string) => Math.min(Number(s), 2147483647);
// An id and a class's name are judged one UTF-16 unit at a time (no u flag), with no Unicode tables
// (the JDK's and a browser's Unicode versions differ), exactly as the library's EventParser judges
// them: ASCII by its rules, and every unit from U+0080 on counts as a letter.
const cssId = (s: string) => /^[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff-]*$/.test(s);
const identifier = (s: string) => /^[A-Za-z_$\u0080-\uffff][A-Za-z0-9_$\u0080-\uffff]*$/.test(s);

function target(command: string, toks: Token[], next: { i: number }): EventTarget {
  const ex = example(command);
  if (next.i >= toks.length) throw new Bad(`${command} needs a target, such as ${ex}`);
  const t = toks[next.i++];
  if (t.quoted) throw new Bad(`the target comes before the text: a class and which one, such as ${ex}`);
  const word = t.text;
  if (word.startsWith("#")) {
    const rest = word.slice(1);
    if (digits(rest)) {
      const n = number(rest);
      if (n < 1) throw new Bad("the nodes are numbered from 1");
      return { kind: "number", n };
    }
    if (cssId(rest)) return { kind: "id", id: rest };
    throw new Bad(`${word} is neither a node number (such as #3) nor an id (such as #addButton)`);
  }
  if (!identifier(word)) throw new Bad(`${word} isn't a target: write a class and which one, such as ${ex}`);
  if (!NODE_TYPES.includes(word)) throw new Bad(`${word} isn't a JavaFX class that Java Arena knows (${MOUSE_COMMANDS.includes(command) ? "use Canvas or ImageView" : "use Button, Label, TextField, PasswordField, TextArea or a pane such as VBox"})`);
  const noun = nodeNoun(word);
  if (next.i >= toks.length || !(toks[next.i].quoted || digits(toks[next.i].text))) throw new Bad(`say which ${noun}: ${word} "its text", or ${word} 1 for the first one`);
  const which = toks[next.i];
  if (which.quoted && (command === "type" || command === "set") && (next.i + 1 >= toks.length || !toks[next.i + 1].quoted)) throw new Bad(`say which ${noun} (${word} 1 for the first one, or ${word} "its text"), then the text in double quotes`);
  next.i++;
  if (which.quoted) return { kind: "text", type: word, text: which.text };
  const k = number(which.text);
  if (k < 1) throw new Bad(`the count starts at 1: ${word} 1 is the first ${noun}`);
  return { kind: "index", type: word, index: k };
}

/**
 * Reads one line of .arena/events.txt as the library does: the event, or the problem it records
 * for a line it can't read (the same words). Null for a blank line or a comment (//).
 */
export function parseEventLine(raw: string): ParsedEvent | null {
  const line = trimLine(raw);
  if (!line || line.startsWith("//")) return null;
  try {
    const toks = tokens(line);
    const first = toks[0];
    const command = first.text;
    if (first.quoted || !COMMANDS.includes(command)) {
      const lower = first.quoted ? "" : command.toLowerCase();
      if (COMMANDS.includes(lower)) throw new Bad(`write the event in small letters: ${lower}`);
      const name = first.quoted ? `"${command}"` : command;
      if (lower.startsWith("fram") || editDistance(lower, "frames") === 1) throw new Bad("write frames, such as frames 30");
      // A near miss (keys, pres, clik): one letter off one event's name.
      const near = lower.length >= 3 ? COMMANDS.find((c) => editDistance(lower, c) === 1) : undefined;
      if (near) throw new Bad(`there's no event called ${name} (did you mean ${near}? the events are click, type, set, enter, close, press, drag, release, press key, release key, key and frames)`);
      if (toks.some((t) => !t.quoted && (t.text === "at" || t.text === "to"))) throw new Bad(`there's no event called ${name} (the mouse events are press, drag, release and click, such as press Canvas 1 at 10 20)`);
      throw new Bad(`there's no event called ${name} (the events are click, type, set, enter, close, press, drag, release, press key, release key, key and frames)`);
    }
    if (command === "key") return keyEvent(line, "key", toks, 1);
    if (command === "frames") return framesEvent(line, toks);
    if ((command === "press" || command === "release") && toks.length > 1 && !toks[1].quoted && toks[1].text === "key") return keyEvent(line, `${command} key`, toks, 2);
    if (command === "close") {
      if (toks.length > 1) throw new Bad("close takes nothing after it");
      return { line, command: "close" };
    }
    const next = { i: 1 };
    const t = target(command, toks, next);
    let text: string | undefined;
    let number: string | undefined;
    let point: { x: string; y: string } | undefined;
    if (command === "type" || command === "set") {
      if (command === "set" && next.i < toks.length && !toks[next.i].quoted && isNumber(toks[next.i].text)) number = toks[next.i++].text;
      else if (next.i >= toks.length || !toks[next.i].quoted) {
        if (command === "set" && t.kind !== "number" && t.kind !== "id" && t.type === "Slider") throw new Bad("set needs a number after the slider, such as set Slider 1 25");
        throw new Bad(`${command} needs the text in double quotes after the target, such as ${command} TextField 1 "Ada"`);
      } else text = toks[next.i++].text;
    } else if (MOUSE_COMMANDS.includes(command) || (command === "click" && next.i < toks.length && !toks[next.i].quoted && toks[next.i].text === "at")) {
      const word = command === "drag" ? "to" : "at";
      if (next.i >= toks.length || toks[next.i].quoted || toks[next.i].text !== word) throw new Bad(`${command} needs ${word} and a point after the target, such as ${example(command)}`);
      next.i++;
      const [x, y] = [toks[next.i], toks[next.i + 1]];
      if (!x || !y || x.quoted || y.quoted || !isNumber(x.text) || !isNumber(y.text)) throw new Bad(`${word} needs two numbers after it, x and y, such as ${command === "click" ? "click Canvas 1 at 10 20" : example(command)}`);
      point = { x: x.text, y: y.text };
      next.i += 2;
    }
    if (next.i < toks.length) throw new Bad("there's something extra at the end of the line");
    return { line, command: command as EventCommand, target: t, ...(text != null ? { text } : {}), ...(number != null ? { number } : {}), ...(point ? { point } : {}) };
  } catch (e) {
    if (e instanceof Bad) return { line, problem: e.message };
    throw e;
  }
}

/** The events of a test or of an events block: one per line, without blank lines and comments, each trimmed. */
export function eventLines(text: string): string[] {
  return text
    .split("\n")
    .map(trimLine)
    .filter((l) => l && !l.startsWith("//"));
}

/** A test's frames above this many make the build warn: each test runs in the learner's browser, and 300 frames of a game take about 3 seconds there. */
export const TEST_FRAMES_WARN = 300;

/** How many frames these event lines run in all (the sum of their frames lines; lines that can't be read count nothing). */
export function framesInEvents(lines: string[]): number {
  let n = 0;
  for (const l of lines) {
    const e = parseEventLine(l);
    if (e && e.problem === undefined && e.command === "frames") n += Number(e.number);
  }
  return n;
}

/**
 * The window a test keeps (the solution's, for the task card and the results): the window JSON
 * with the frames' count but not the frames themselves, which only the page's animation of a run
 * uses. The outline needs only the count (its "frames run: N" line).
 */
export function testWindow(w: WindowState): WindowState {
  return w.frames ? { ...w, frames: { count: w.frames.count, list: [] } } : w;
}

/** The text of .arena/events.txt for these event lines (the grader, the build and the page write the same). */
export const eventsFileText = (events: string[]) => (events.length ? events.join("\n") + "\n" : "");

/** The files of a run with these events: the test's own files (text, or bytes such as an image's), plus .arena/events.txt. */
export const withEventsFile = <T>(files: Record<string, T> | undefined, events: string[]): Record<string, T | string> => ({ ...(files ?? {}), [EVENTS_FILE]: eventsFileText(events) });

/** What an event acts on, in plain words: "text field 1", "the button "Add"", "node #3". */
function targetWords(t: EventTarget, command: string): string {
  switch (t.kind) {
    case "number":
      return `node #${t.n}`;
    case "id":
      return `the node with the id ${quoteText(t.id)}`;
    case "index":
      return `${nodeNoun(t.type)} ${t.index}`;
    case "text":
      // A button is named by its text, as people say it: click "Greet".
      if (command === "click" && (t.type === "Button" || t.type === "ButtonBase")) return quoteText(t.text);
      return /^(TextField|PasswordField|TextArea|TextInputControl)$/.test(t.type) ? `the ${nodeNoun(t.type)} that holds ${quoteText(t.text)}` : `the ${nodeNoun(t.type)} ${quoteText(t.text)}`;
  }
}

/**
 * One event line in plain words, starting with a small letter: click "Greet", type "Ada" in text
 * field 1, replace the text in text area 1 with "two\nlines", press Enter in text field 1, close
 * the window. A line that can't be read is given as it is.
 */
export function describeEvent(raw: string): string {
  const e = parseEventLine(raw);
  if (!e) return trimLine(raw);
  if (e.problem !== undefined) return e.line;
  const where = e.target ? targetWords(e.target, e.command) : "";
  const at = e.point ? `(${e.point.x}, ${e.point.y})` : "";
  const key = e.key ? keyName(e.key) : "";
  switch (e.command) {
    case "press key":
      return `hold ${key}`;
    case "release key":
      return `let go of ${key}`;
    case "key":
      return `press and release ${key}`;
    case "frames":
      return `run ${e.number} ${e.number === "1" ? "frame" : "frames"}`;
    case "click":
      return e.point ? `click ${where} at ${at}` : `click ${where}`;
    case "press":
      return `press the mouse on ${where} at ${at}`;
    case "drag":
      return `drag the mouse on ${where} to ${at}`;
    case "release":
      return `release the mouse on ${where} at ${at}`;
    case "type":
      return `type ${quoteText(e.text ?? "")} in ${where}`;
    case "set":
      if (e.number != null) return `move ${where} to ${e.number}`;
      return `replace the text in ${where} with ${quoteText(e.text ?? "")}`;
    case "enter":
      return `press Enter in ${where}`;
    case "close":
      return "close the window";
  }
}

const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * A test's clicks and typing as one sentence for the task card: Type "Ada" in text field 1, then
 * click "Greet". No events: Nothing: the window as it opens.
 */
export function describeEvents(lines: string[]): string {
  const words = lines.filter((l) => parseEventLine(l)).map(describeEvent);
  if (!words.length) return "Nothing: the window as it opens";
  const all = words.length === 1 ? words[0] : `${words.slice(0, -1).join(", ")}, then ${words[words.length - 1]}`;
  return capital(all);
}

// ------------------------------------------------------------------ checking a test's window

/**
 * An event the window couldn't take: its line, the line in plain words (capitalized; a line that
 * can't be read stays as written) and why, in the library's plain English.
 */
export type EventProblem = { event: string; words: string; problem: string };

/** The window JSON's problems ("the line: why"), each with its event line and the line in plain words. */
export function eventProblems(events: string[], problems: string[]): EventProblem[] {
  let from = 0;
  return problems.map((p) => {
    // Problems are in the order of the events; each starts with its (trimmed) line and ": ".
    for (let i = from; i < events.length; i++) {
      const line = trimLine(events[i]);
      if (p.startsWith(line + ": ")) {
        from = i + 1;
        // A line that can't be read is given as it is, not as a sentence.
        const readable = parseEventLine(line)?.problem === undefined;
        return { event: line, words: readable ? capital(describeEvent(line)) : line, problem: p.slice(line.length + 2) };
      }
    }
    return { event: "", words: "", problem: p };
  });
}

/**
 * A test's window check, for the results. For a hidden test only `pass`, `missing` (and `stopped`),
 * `events` and `problems`: never the expected window (nor the learner's window after the hidden events).
 */
export type WindowCheck = {
  /** The window's outline is the expected one, and every event could happen. */
  pass: boolean;
  /** The window's outline is the expected one (whatever the problems). */
  matches: boolean;
  /** The run left no window file: the program didn't call launch, start failed, it crashed first or it was stopped. */
  missing: boolean;
  /** The run left a window file with no window and the windows weren't closed: start never showed the stage (stage.show()). */
  neverShown: boolean;
  /** The run was stopped at the time limit, before the library wrote its window (missing is then true too). */
  stopped?: boolean;
  /** The test's event lines (also for a hidden test: they say which clicks and typing it used). */
  events: string[];
  /** The test's events in plain words: Type "Ada" in text field 1, then click "Greet". */
  eventsInWords: string;
  /** The events the learner's window couldn't take (the model solution's took them all). */
  problems: EventProblem[];
  /** Mouse handlers in the learner's window that never run in Java Arena (see mouseNotices). */
  mouseNotices: string[];
  /** Visible tests: the model solution's window after the events, and its outline. */
  expected?: WindowState;
  expectedOutline?: string;
  /** Visible tests: the learner's window after the events (null: none was written), and its outline. */
  got?: WindowState | null;
  gotOutline?: string;
  /** Visible tests whose outlines differ: each outline's lines, marked where they differ. */
  lines?: { expected: OutlineLine[]; got: OutlineLine[] };
};

/**
 * Checks the window a run left (the text of its .arena/window.json, or null) against a test's
 * expected window (`outline`, and `window` for showing it), after the test's `events`.
 */
export function checkWindow(test: { events: string[]; outline: string; window?: WindowState; hidden?: boolean }, windowFile: string | null | undefined): WindowCheck {
  const got = parseWindow(windowFile);
  const gotOutline = windowOutline(got);
  const problems = got ? eventProblems(test.events, got.problems) : [];
  const matches = got != null && gotOutline === test.outline;
  const pass = matches && problems.length === 0;
  const base = { pass, matches, missing: got == null, neverShown: neverShown(got), events: test.events, eventsInWords: describeEvents(test.events), problems, mouseNotices: mouseNotices(got) };
  if (test.hidden) return base;
  return { ...base, expected: test.window, expectedOutline: test.outline, got, gotOutline, ...(gotOutline !== test.outline ? { lines: compareOutlines(test.outline, gotOutline) } : {}) };
}

/**
 * Whether a run's window file says no window was ever shown: no window is open, and the windows
 * weren't closed (hide, close, the close event and Platform.exit() all write closed: true).
 */
export const neverShown = (w: WindowState | null | undefined) => w != null && !w.windows.length && !w.closed;

/**
 * Why a run that ended normally left no window file. A start that never calls show() still leaves
 * one (with no window: NOT_SHOWN_NOTE), and an exception from start ends the run with a crash, which
 * has a note of its own; what is left is a main that never calls launch, or something that ends the
 * program before the library writes its window.
 */
export const MISSING_WINDOW_NOTE =
  "Your program didn't leave a window: main must call launch, as in launch(Main.class), and nothing may end the program before its window is written, such as System.exit in start or in a handler, or an exception from start that main catches.";
/** A run whose start never showed the stage. */
export const NOT_SHOWN_NOTE = "Your program didn't show a window: start must show the stage with stage.show().";

/**
 * A sentence about a window check that failed, or undefined when it passed. For a run that ended
 * normally: a crash, the time limit or an exit code has a note of its own.
 */
export function windowNote(check: WindowCheck, hidden = false): string | undefined {
  if (check.pass) return undefined;
  if (check.missing) return MISSING_WINDOW_NOTE;
  const parts: string[] = [];
  if (check.neverShown) parts.push(NOT_SHOWN_NOTE);
  if (check.problems.length) parts.push(`${check.problems.length === 1 ? "One of the things the user does" : "Some of the things the user does"} couldn't happen in your window.`);
  if (!check.matches && !check.neverShown) parts.push(!check.events.length ? "When it opens, your window isn't what it should be." : hidden ? "After what the user does in this test, your window isn't what it should be." : "After what the user does here, your window isn't what it should be.");
  return parts.join(" ");
}

/** A java window example in lesson text, as the build stores it in a ```window block after the code (one line of JSON). */
export type WindowExample = { events: string[]; window: WindowState; outline: string };

/** The data of a ```window block, or null when it can't be read. */
export function windowExample(text: string): WindowExample | null {
  try {
    const x = JSON.parse(text);
    return x && Array.isArray(x.events) && typeof x.outline === "string" && x.window ? (x as WindowExample) : null;
  } catch {
    return null;
  }
}
