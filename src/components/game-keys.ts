// The key row of a free run of a game (part 14.3, the window panel in WindowView.tsx): which keys
// it offers, which are held after the events so far, the event lines a "Run 30 frames" sends, and
// which KeyCode a key of a real keyboard is. The game doesn't run live: the learner chooses the
// keys to hold, runs some frames, and the page plays them back.
// Node runs this file as it is (types are stripped): no enums, namespaces or JSX.
import { parseEventLine, type WindowNode, type WindowState } from "../grader/window.ts";
import { KEY_CODES } from "../grader/keycodes.js";

/** The keys every game's row has: the arrow keys and Space. */
export const BASE_KEYS = ["LEFT", "RIGHT", "UP", "DOWN", "SPACE"];

/** The frames the Run buttons run. */
export const RUN_FRAMES = [30, 60, 120];

/** Whether a showing window's scene has a key handler (setOnKeyPressed and the like on the Scene). */
export function hasKeyHandlers(w: WindowState | null | undefined): boolean {
  return !!w && w.windows.some((s) => !!s.scene && !!(s.scene.onKeyPressed || s.scene.onKeyReleased || s.scene.onKeyTyped));
}

/**
 * Whether a node in a showing window has its own key handler (setOnKeyPressed and the like on a
 * node, not on the scene). Those never run in Java Arena (keys go only to the scene's handlers), so
 * the key row is still offered and says so, and a key line says so when the program called
 * requestFocus() on that node (real JavaFX would run its handler first).
 */
export function nodeKeyHandlers(w: WindowState | null | undefined): boolean {
  const has = (n: WindowNode | null | undefined): boolean =>
    !!n && (!!(n.onKeyPressed || n.onKeyReleased || n.onKeyTyped) || (n.children ?? []).some(has) || [n.top, n.left, n.center, n.right, n.bottom].some(has));
  return !!w && w.windows.some((s) => !!s.scene && has(s.scene.root));
}

/**
 * The keys the row offers: the arrow keys and Space, then every other KeyCode the code names and
 * every key the events so far use, in the order they first come. The code names a key as
 * KeyCode.A or KeyCode.DIGIT1, as a case label of a switch on a key's code (`switch (e.getCode())
 * { case W -> ... }`, or a switch on a KeyCode variable), or through a static import of KeyCode
 * (`import static javafx.scene.input.KeyCode.W;`, or with `KeyCode.*` a bare name compared with
 * a key's code: `e.getCode() == W`, `e.getCode().equals(W)`). Case labels and bare names count
 * only in code that mentions KeyCode, so a switch over the program's own enum adds no keys.
 */
export function offeredKeys(code: string, events: string[] = []): string[] {
  const out = [...BASE_KEYS];
  const add = (k: string) => {
    if (KEY_CODES.includes(k) && !out.includes(k)) out.push(k);
  };
  for (const [, k] of namedKeys(code)) add(k);
  for (const line of events) {
    const e = parseEventLine(line);
    if (e && e.problem === undefined && e.key) add(e.key);
  }
  return out;
}

const NAME = "[A-Z][A-Z0-9_]*";

/** The keys the code names, with where each is named (sorted by place). */
function namedKeys(code: string): [number, string][] {
  const found: [number, string][] = [];
  for (const m of code.matchAll(new RegExp(`\\bKeyCode\\s*\\.\\s*(${NAME})\\b`, "g"))) found.push([m.index!, m[1]]);
  if (/\bKeyCode\b/.test(code)) {
    // The variables that hold a key's code: `KeyCode k`, `var k = e.getCode()`.
    const vars = new Set<string>();
    for (const m of code.matchAll(/\bKeyCode\s+([A-Za-z_$][\w$]*)/g)) vars.add(m[1]);
    for (const m of code.matchAll(/\b([A-Za-z_$][\w$]*)\s*=\s*[\w$.]*\bgetCode\s*\(\s*\)/g)) vars.add(m[1]);
    const isKeyCode = (sel: string) => /\bgetCode\s*\(\s*\)\s*$/.test(sel) || vars.has(sel.trim());
    // The case labels of a switch on a key's code.
    for (const m of code.matchAll(/\bswitch\s*\(/g)) {
      const open = m.index! + m[0].length;
      const close = matching(code, open - 1, "(", ")");
      if (close < 0 || !isKeyCode(code.slice(open, close))) continue;
      const brace = code.indexOf("{", close);
      if (brace < 0 || code.slice(close + 1, brace).trim()) continue;
      const endBody = matching(code, brace, "{", "}");
      const body = code.slice(brace, endBody < 0 ? code.length : endBody);
      for (const c of body.matchAll(new RegExp(`\\bcase\\s+(${NAME}(?:\\s*,\\s*${NAME})*)\\s*(?:->|:)`, "g"))) {
        let at = brace + c.index!;
        for (const name of c[1].split(",")) found.push([at++, name.trim()]);
      }
    }
    // Static imports of KeyCode.
    for (const m of code.matchAll(new RegExp(`\\bimport\\s+static\\s+javafx\\.scene\\.input\\.KeyCode\\s*\\.\\s*(${NAME})\\s*;`, "g"))) found.push([m.index!, m[1]]);
    if (/\bimport\s+static\s+javafx\.scene\.input\.KeyCode\s*\.\s*\*\s*;/.test(code)) {
      const sel = `(?:[\\w$.]*\\bgetCode\\s*\\(\\s*\\)${vars.size ? `|\\b(?:${[...vars].join("|")})` : ""})`;
      const compared = [
        new RegExp(`${sel}\\s*[!=]=\\s*(${NAME})\\b(?!\\s*[.(])`, "g"),
        new RegExp(`(?<![\\w$.])(${NAME})\\s*[!=]=\\s*${sel}`, "g"),
        new RegExp(`${sel}\\s*\\.\\s*equals\\s*\\(\\s*(${NAME})\\s*\\)`, "g"),
      ];
      for (const re of compared) for (const m of code.matchAll(re)) found.push([m.index!, m[1]]);
    }
  }
  return found.sort((a, b) => a[0] - b[0]);
}

/** Where the bracket that closes the one at `at` is (-1 when none does). */
function matching(code: string, at: number, open: string, close: string): number {
  let depth = 0;
  for (let i = at; i < code.length; i++) {
    if (code[i] === open) depth++;
    else if (code[i] === close && --depth === 0) return i;
  }
  return -1;
}

/** The keys held after these event lines (press key X holds X until release key X). */
export function heldAfter(events: string[]): Set<string> {
  const held = new Set<string>();
  for (const line of events) {
    const e = parseEventLine(line);
    if (!e || e.problem !== undefined || !e.key) continue;
    if (e.command === "press key") held.add(e.key);
    else if (e.command === "release key") held.delete(e.key);
  }
  return held;
}

/**
 * The event lines for a run of `frames` frames: release key X for each key held that the learner
 * let go of, press key X for each one newly held (in the row's order), then frames N.
 */
export function runLines(keys: string[], want: Set<string>, held: Set<string>, frames: number): string[] {
  const lines: string[] = [];
  const all = [...keys, ...[...held].filter((k) => !keys.includes(k))];
  for (const k of all) if (held.has(k) && !want.has(k)) lines.push(`release key ${k}`);
  for (const k of all) if (want.has(k) && !held.has(k)) lines.push(`press key ${k}`);
  lines.push(`frames ${frames}`);
  return lines;
}

const NAMED: Record<string, string> = {
  ArrowLeft: "LEFT",
  ArrowRight: "RIGHT",
  ArrowUp: "UP",
  ArrowDown: "DOWN",
  " ": "SPACE",
  Enter: "ENTER",
  Escape: "ESCAPE",
  Backspace: "BACK_SPACE",
  Shift: "SHIFT",
  Control: "CONTROL",
  Alt: "ALT",
  Delete: "DELETE",
  Home: "HOME",
  End: "END",
  PageUp: "PAGE_UP",
  PageDown: "PAGE_DOWN",
  Insert: "INSERT",
  ",": "COMMA",
  ".": "PERIOD",
  "-": "MINUS",
  "/": "SLASH",
  ";": "SEMICOLON",
  "=": "EQUALS",
};

/**
 * The KeyCode of a key of a real keyboard (KeyboardEvent's key and code), as JavaFX names it for the
 * keyboard's layout: a key on the number pad by where it is (Numpad1 is NUMPAD1); a letter or digit
 * by the character it types (on AZERTY the key labelled A is A, though its code is KeyQ); the others
 * by what they are (ArrowLeft is LEFT, " " is SPACE, "," is COMMA, F5 is F5). Only when the key types
 * no letter, digit or named character does its place decide (KeyA is A, Digit1 is DIGIT1): Shift+1
 * on QWERTY, the digit row of AZERTY (it types & and the like) and the letters of other alphabets
 * (Russian types ф on KeyA), as JavaFX does. null for a key KeyCode has no name for.
 */
export function keyCodeOf(key: string, code: string): string | null {
  let m = /^Numpad([0-9])$/.exec(code);
  if (m) return `NUMPAD${m[1]}`;
  if (/^[A-Za-z]$/.test(key)) return key.toUpperCase();
  if (/^[0-9]$/.test(key)) return `DIGIT${key}`;
  if (NAMED[key]) return NAMED[key];
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(key)) return key;
  m = /^Key([A-Z])$/.exec(code);
  if (m) return m[1];
  m = /^Digit([0-9])$/.exec(code);
  if (m) return `DIGIT${m[1]}`;
  if (code === "Space") return "SPACE";
  return null;
}
