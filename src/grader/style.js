// Style check shared by the browser grader and the content build: is every line indented to match
// the braces around it? Four spaces per level (a tab counts as four), like the lessons and the editor.
import { stripForRules } from "./assemble.js";

const INDENT = 4;

function indentWidth(line) {
  let w = 0;
  for (const c of line) {
    if (c === " ") w++;
    else if (c === "\t") w += INDENT - (w % INDENT);
    else break;
  }
  return w;
}

// A line that ends a statement or a label, so the next line starts a new one.
const ENDS_STATEMENT = /[;{}]$/;
const LABEL = /^(case\b.*|default\s*|[A-Za-z_$][\w$]*\s*):$/;

/**
 * Lines whose indentation doesn't match their depth: [{ line, expected, got }], 1-based lines.
 * Each { opens a level one deeper than the line it is on, and the line with its } goes back to
 * that line's level. In a switch, case labels are one level in (or level with the switch, the
 * older style) and the statements under a label one more, as the editor indents them. A line that
 * continues a statement (the line before didn't end with ; { } or a label, or a ( is still open)
 * may be indented further, so it isn't checked. Lines inside block comments and text blocks are
 * not checked either.
 */
export function indentProblems(src) {
  const norm = src.replace(/\r\n?/g, "\n");
  const original = norm.split("\n");
  const code = stripForRules(norm).split("\n");
  const problems = [];
  // One frame per open {: the level of the line it is on, whether it is a switch body, the level
  // its case labels use, and the ( still open outside it.
  const frames = [];
  let parens = 0;
  let switchNext = false;
  let prev = "";
  for (let i = 0; i < code.length; i++) {
    const text = code[i].trim();
    const raw = original[i] ?? "";
    if (!text) continue;
    const top = frames[frames.length - 1];
    const got = indentWidth(raw);
    const isCase = !!top?.isSwitch && /^(case|default)\b/.test(text);
    let level;
    if (!top) level = 0;
    else if (text.startsWith("}")) level = top.level;
    else if (isCase) level = top.caseLevel ?? (got === top.level * INDENT ? top.level : top.level + 1);
    else if (top.isSwitch) level = (top.caseLevel ?? top.level + 1) + 1;
    else level = top.level + 1;
    if (isCase) top.caseLevel = level;
    const continuation = parens > 0 || (prev !== "" && !ENDS_STATEMENT.test(prev) && !LABEL.test(prev) && !/^@\w+/.test(prev));
    // Only lines that start with code, not with the end of a comment that began on an earlier line.
    const startsWithCode = raw.trim()[0] === text[0];
    if (!continuation && startsWithCode && got !== level * INDENT) problems.push({ line: i + 1, expected: level * INDENT, got });
    for (const t of text.match(/[A-Za-z_$][\w$]*|[{}()]/g) ?? []) {
      if (t === "switch") switchNext = true;
      else if (t === "(") parens++;
      else if (t === ")") parens = Math.max(0, parens - 1);
      else if (t === "{") {
        frames.push({ level, isSwitch: switchNext, caseLevel: null, parens });
        parens = 0;
        switchNext = false;
      } else if (t === "}") parens = frames.pop()?.parens ?? 0;
    }
    prev = text;
  }
  return problems;
}

/** Plain-English messages for the first few indentation problems. */
export function indentMessages(src, max = 3) {
  const problems = indentProblems(src);
  const msgs = problems.slice(0, max).map((p) => `Line ${p.line} is indented ${p.got} space${p.got === 1 ? "" : "s"}; at its depth it should be ${p.expected}.`);
  const more = problems.length - max;
  if (more > 0) msgs.push(`${more} more line${more === 1 ? " has" : "s have"} indentation problems.`);
  return msgs;
}
