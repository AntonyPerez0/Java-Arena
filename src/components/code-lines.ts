// Java code split into tokens and lines, for highlighting and for drill code that wraps on a phone
// (each line its own element, with the places a long line may break). The React drawing is in
// highlight.tsx; codeLinesHtml draws the same as HTML, for code blocks in a drill's Markdown.
import type { ReactNode } from "react";

const KEYWORDS = new Set(
  "abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record yield sealed permits non-sealed true false null".split(
    " ",
  ),
);
const TYPES = new Set(
  "void int long short byte char boolean float double String Scanner Integer Double Boolean Character Long Math System ArrayList List HashMap Map HashSet Set Random Arrays Collections Object StringBuilder Files Paths Path LocalDate".split(" "),
);

// Comments, text blocks and strings, chars, annotations, numbers, words.
export const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[lLfFdD]?\b|\b0[xX][0-9a-fA-F_]+\b)|([A-Za-z_$][\w$]*)/g;

export function classify(m: RegExpMatchArray, code: string): string {
  if (m[1]) return "tk-com";
  if (m[2]) return "tk-str";
  if (m[3]) return "tk-pre";
  if (m[4]) return "tk-num";
  const word = m[5];
  if (KEYWORDS.has(word)) return "tk-kw";
  if (TYPES.has(word) || /^[A-Z][a-z]\w*$/.test(word)) return "tk-type";
  if (/^\s*\(/.test(code.slice(m.index! + word.length))) return "tk-fn";
  return "";
}

export const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A piece of code for line-by-line drawing: a token with its class (the text between tokens has the
 * class ""), or something drawn in the code's place (a fill-in's blank).
 */
export type CodePiece = { text: string; cls: string } | { node: ReactNode };

/** The code as highlighted pieces, in order. */
export function codePieces(code: string): CodePiece[] {
  const out: CodePiece[] = [];
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push({ text: code.slice(last, m.index), cls: "" });
    out.push({ text: m[0], cls: classify(m, code) });
    last = m.index! + m[0].length;
  }
  if (last < code.length) out.push({ text: code.slice(last), cls: "" });
  return out;
}

/** The pieces split into lines (a comment or text block over several lines is split too, keeping its class). */
export function pieceLines(pieces: CodePiece[]): CodePiece[][] {
  const lines: CodePiece[][] = [[]];
  for (const p of pieces) {
    if (!("text" in p)) {
      lines[lines.length - 1].push(p);
      continue;
    }
    p.text.split("\n").forEach((t, i) => {
      if (i > 0) lines.push([]);
      if (t) lines[lines.length - 1].push({ text: t, cls: p.cls });
    });
  }
  return lines;
}

/** A line's indent: its leading spaces (a wrapped line goes on under its own start, see .cl in styles.css). */
export const indentOf = (line: string) => /^ */.exec(line)![0].length;

/** The deepest indent of some lines: on a phone it sets how wide one space of indent is drawn (--deep in styles.css). */
export const deepestIndent = (lines: string[]) => Math.max(0, ...lines.map(indentOf));

export const lineText = (line: CodePiece[]) => line.map((p) => ("text" in p ? p.text : "\uFFFC")).join("");

/**
 * What a line is drawn from: tokens (null in `parts` is a place the line may break), literal boxes,
 * a line-ending " {", elements, and the line's leading spaces glued to its first character.
 */
export type Bit = { cls: string; parts: (string | null)[] } | { lit: string; close: string } | { glue: string } | { ind: string; cls: string; ch: string } | { node: ReactNode };

/** A string or char literal on one line (not a text block's line). */
const LITERAL = /^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/;

/**
 * One line of code, for code that wraps on a phone. Besides its spaces, the line may break before a
 * member's dot (`list<wbr>.size()`) and after an opening parenthesis (not in a cast or around one
 * name, such as `(Stamp)`), in a comment too (commented-out code), never inside a string, a char or
 * a number: a string or char literal, with the closing marks right after it, is one box (.lit in
 * styles.css) that wraps inside only when it is longer than the line, and a " {" that ends the line
 * stays with what comes before it. The leading spaces (.ind, which a phone draws as padding) are
 * glued to the line's first character: a line never breaks right after its indentation, which
 * would leave a row that looks empty. <wbr> adds no text: copying the code, and the code box's
 * text, stay the code. With white-space: pre (a wide screen) nothing changes.
 */
export function lineBits(line: CodePiece[]): Bit[] {
  const text = lineText(line);
  // Where each piece starts in the line (an element counts as one character).
  const starts: number[] = [];
  line.reduce((at, p, n) => ((starts[n] = at), at + ("text" in p ? p.text.length : 1)), 0);
  // " {" at the end of the line: never alone on a line of its own.
  const brace = /\s+\{\s*$/.exec(text)?.index ?? -1;
  // A piece's text (starting at `at` in the line) with the places the line may break.
  const withBreaks = (t: string, at: number) => {
    const parts: (string | null)[] = [];
    let from = 0;
    for (let j = 0; j < t.length; j++) {
      const i = at + j;
      const beforeDot = t[j] === "." && /[A-Za-z_$]/.test(text[i + 1] ?? "") && /[^\s(]/.test(text[i - 1] ?? " ");
      // After "(", unless it closes right away, or it's a cast or a grouping around one name, as in (Stamp).
      const afterParen = t[j] === "(" && i + 1 < text.length && text[i + 1] !== ")" && (/[\w$>\]]/.test(text[i - 1] ?? "") || !/^[\w$.]*\)/.test(text.slice(i + 1)));
      const cut = beforeDot ? j : afterParen ? j + 1 : -1;
      if (cut < 0) continue;
      if (cut > from) parts.push(t.slice(from, cut));
      parts.push(null);
      from = cut;
    }
    if (from < t.length) parts.push(t.slice(from));
    return parts;
  };
  const out: Bit[] = [];
  // How many characters of a piece are already drawn (the indentation, its first character, the
  // closing marks glued to a literal).
  const skip = new Map<number, number>();
  const first = line[0];
  const lead = first && "text" in first ? /^ */.exec(first.text)![0] : "";
  if (first && "text" in first && lead) {
    // The first character after the spaces, unless it starts a literal box or is an element.
    const n = first.text.length > lead.length ? 0 : 1;
    const q = line[n];
    const off = n === 0 ? lead.length : 0;
    const head = q && "text" in q && !(q.cls === "tk-str" && LITERAL.test(q.text.slice(off))) ? q : null;
    out.push({ ind: lead, cls: head ? head.cls : "", ch: head ? head.text[off] : "" });
    skip.set(0, lead.length);
    if (head) skip.set(n, off + 1);
  }
  line.forEach((p, n) => {
    if (!("text" in p)) {
      out.push(p);
      return;
    }
    const at = starts[n] + (skip.get(n) ?? 0);
    const t = p.text.slice(skip.get(n) ?? 0);
    if (!t) return;
    if (p.cls === "tk-str" && LITERAL.test(t)) {
      // A literal and the closing marks right after it ("Menu")); ) are one box: no line starts with "));".
      // A " {" that ends the line goes in the box too.
      const next = line[n + 1];
      const close = next && "text" in next && next.cls === "" ? /^[)\]};,:]*(?:\s+\{\s*$)?/.exec(next.text)![0] : "";
      out.push({ lit: t, close });
      skip.set(n + 1, close.length);
      return;
    }
    if (p.cls === "" && brace >= at && brace < at + t.length) {
      if (brace > at) out.push({ cls: "", parts: withBreaks(t.slice(0, brace - at), at) });
      out.push({ glue: t.slice(brace - at) });
    } else out.push({ cls: p.cls, parts: p.cls === "tk-str" || p.cls === "tk-num" ? [t] : withBreaks(t, at) });
  });
  return out;
}

/**
 * codeLines as an HTML string, for code blocks in a drill's Markdown (a boss rep's task). Without
 * `colors` (a block that isn't marked as Java, such as the expected output) the text keeps its
 * plain color and still wraps at the same places.
 */
export function codeLinesHtml(code: string, colors = true): string {
  const bitHtml = (b: Bit) => {
    if ("node" in b) return "";
    if ("glue" in b) return `<span class="keep">${esc(b.glue)}</span>`;
    if ("ind" in b) return `<span class="keep"><span class="ind">${b.ind}</span>${b.cls && colors ? `<span class="${b.cls}">${esc(b.ch)}</span>` : esc(b.ch)}</span>`;
    if ("lit" in b) return `<span class="lit">${colors ? `<span class="tk-str">${esc(b.lit)}</span>` : esc(b.lit)}${esc(b.close)}</span>`;
    const inner = b.parts.map((s) => (s === null ? "<wbr>" : esc(s))).join("");
    return b.cls && colors ? `<span class="${b.cls}">${inner}</span>` : inner;
  };
  const lines = pieceLines(codePieces(code));
  const deep = deepestIndent(lines.map(lineText));
  return lines.map((line) => (line.length ? `<span class="cl" style="--indent: ${indentOf(lineText(line))}; --deep: ${deep}">${lineBits(line).map(bitHtml).join("")}</span>` : "")).join("\n");
}
