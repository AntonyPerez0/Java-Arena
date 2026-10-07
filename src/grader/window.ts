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
  /** A pane's children (a GridPane's by row, then column); a BorderPane has top, left, center, right and bottom instead. */
  children?: WindowNode[];
  top?: WindowNode;
  left?: WindowNode;
  center?: WindowNode;
  right?: WindowNode;
  bottom?: WindowNode;
};

export type WindowScene = { width?: WindowNumber; height?: WindowNumber; root: WindowNode };

/** A showing window (a Stage). `width` and `height` only when setWidth and setHeight set them. */
export type WindowStage = { title: string | null; width?: WindowNumber; height?: WindowNumber; scene: WindowScene | null };

/**
 * .arena/window.json: the windows showing when the session ended (the main one first), whether it
 * ended by closing them (`close`, Platform.exit() or closing the last window; `windows` is then
 * empty), and the events that couldn't happen, each as "the event line: why" in plain English.
 */
export type WindowState = { windows: WindowStage[]; closed?: boolean; problems: string[] };

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

/** One node's line, without its indentation: [region: ][(column, row)[ span CxR] ]Type[ #id][ "text"][ settings][ (flags)]. */
export function nodeLine(node: WindowNode, region?: string): string {
  let head = region ? `${region}: ` : "";
  if (node.column != null || node.row != null) {
    head += `(${node.column ?? 0}, ${node.row ?? 0}) `;
    if ((node.columnSpan ?? 1) > 1 || (node.rowSpan ?? 1) > 1) head += `span ${node.columnSpan ?? 1}x${node.rowSpan ?? 1} `;
  }
  head += node.type;
  if (node.id != null) head += ` #${node.id}`;
  const hasText = "text" in node;
  if (hasText) head += " " + (node.text == null ? "null" : quoteText(node.text));
  const settings: string[] = [];
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
  if (node.prefWidth != null) settings.push(`pref width ${num(node.prefWidth)}`);
  if (node.prefHeight != null) settings.push(`pref height ${num(node.prefHeight)}`);
  if (node.style != null) settings.push(`style ${quoteText(node.style)}`);
  const flags: string[] = [];
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
 */
export function windowOutline(w: WindowState | null | undefined): string {
  if (!w || !w.windows.length) return w?.closed ? CLOSED_WINDOW : NO_WINDOW;
  const out: string[] = [];
  for (const stage of w.windows) {
    out.push(stage.title == null ? "Window without a title" : `Window ${quoteText(stage.title)}`);
    if (!stage.scene) out.push("  (no scene)");
    else outlineNode(stage.scene.root, 1, out);
  }
  return out.join("\n");
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
export const NODE_TYPES = ["Node", "Parent", "Region", "Pane", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Control", "Labeled", "Label", "ButtonBase", "Button", "TextInputControl", "TextField", "PasswordField", "TextArea"];

export type EventCommand = "click" | "type" | "set" | "enter" | "close";
const COMMANDS: EventCommand[] = ["click", "type", "set", "enter", "close"];

/**
 * What an event acts on: #N (the node numbered N in the window JSON of the moment, as the page
 * clicks), #id (the node whose setId gave it that id), Type "text" (the first node of that class,
 * or of a class that extends it, whose text that is, in outline order) or Type K (the K-th one).
 */
export type EventTarget = { kind: "number"; n: number } | { kind: "id"; id: string } | { kind: "text"; type: string; text: string } | { kind: "index"; type: string; index: number };

/** One event line read: the event, or why it can't be read (the library's words, as in the window JSON's problems). */
export type ParsedEvent = { line: string; command: EventCommand; target?: EventTarget; text?: string; problem?: undefined } | { line: string; problem: string };

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
    default:
      return type;
  }
}

class Bad extends Error {}

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
const number = (s: string) => Math.min(Number(s), 2147483647);
// An id and a class's name are judged one UTF-16 unit at a time (no u flag), with no Unicode tables
// (the JDK's and a browser's Unicode versions differ), exactly as the library's EventParser judges
// them: ASCII by its rules, and every unit from U+0080 on counts as a letter.
const cssId = (s: string) => /^[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff-]*$/.test(s);
const identifier = (s: string) => /^[A-Za-z_$\u0080-\uffff][A-Za-z0-9_$\u0080-\uffff]*$/.test(s);

function target(command: string, toks: Token[], next: { i: number }): EventTarget {
  const example = command === "click" ? 'click Button "OK"' : command === "enter" ? "enter TextField 1" : `${command} TextField 1 "Ada"`;
  if (next.i >= toks.length) throw new Bad(`${command} needs a target, such as ${example}`);
  const t = toks[next.i++];
  if (t.quoted) throw new Bad(`the target comes before the text: a class and which one, such as ${example}`);
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
  if (!identifier(word)) throw new Bad(`${word} isn't a target: write a class and which one, such as ${example}`);
  if (!NODE_TYPES.includes(word)) throw new Bad(`${word} isn't a JavaFX class that Java Arena knows (use Button, Label, TextField, PasswordField, TextArea or a pane such as VBox)`);
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
    if (first.quoted || !COMMANDS.includes(command as EventCommand)) {
      const lower = first.quoted ? "" : command.toLowerCase();
      if (COMMANDS.includes(lower as EventCommand)) throw new Bad(`write the event in small letters: ${lower}`);
      throw new Bad(`there's no event called ${first.quoted ? `"${command}"` : command} (the events are click, type, set, enter and close)`);
    }
    if (command === "close") {
      if (toks.length > 1) throw new Bad("close takes nothing after it");
      return { line, command: "close" };
    }
    const next = { i: 1 };
    const t = target(command, toks, next);
    let text: string | undefined;
    if (command === "type" || command === "set") {
      if (next.i >= toks.length || !toks[next.i].quoted) throw new Bad(`${command} needs the text in double quotes after the target, such as ${command} TextField 1 "Ada"`);
      text = toks[next.i++].text;
    }
    if (next.i < toks.length) throw new Bad("there's something extra at the end of the line");
    return { line, command: command as EventCommand, target: t, ...(text != null ? { text } : {}) };
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

/** The text of .arena/events.txt for these event lines (the grader, the build and the page write the same). */
export const eventsFileText = (events: string[]) => (events.length ? events.join("\n") + "\n" : "");

/** The files of a run with these events: the test's own files, plus .arena/events.txt. */
export const withEventsFile = (files: Record<string, string> | undefined, events: string[]) => ({ ...(files ?? {}), [EVENTS_FILE]: eventsFileText(events) });

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
  switch (e.command) {
    case "click":
      return `click ${where}`;
    case "type":
      return `type ${quoteText(e.text ?? "")} in ${where}`;
    case "set":
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
 * click "Greet". No events: No clicks or typing: the window as it opens.
 */
export function describeEvents(lines: string[]): string {
  const words = lines.filter((l) => parseEventLine(l)).map(describeEvent);
  if (!words.length) return "No clicks or typing: the window as it opens";
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
  const base = { pass, matches, missing: got == null, neverShown: neverShown(got), events: test.events, eventsInWords: describeEvents(test.events), problems };
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
  if (check.problems.length) parts.push(`${check.problems.length === 1 ? "One of the clicks or typing" : "Some of the clicks and typing"} couldn't happen in your window.`);
  if (!check.matches && !check.neverShown) parts.push(!check.events.length ? "When it opens, your window isn't what it should be." : hidden ? "After this test's clicks and typing, your window isn't what it should be." : "After these clicks and typing, your window isn't what it should be.");
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
