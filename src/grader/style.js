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

/**
 * Lines whose indentation doesn't match their depth: [{ line, expected, got }], 1-based lines.
 * A line starting with } belongs to the outer level. A line that continues the statement of the line
 * before it (which didn't end with ; { or }) may be indented further, so it isn't checked. Lines
 * inside block comments and text blocks are not checked either.
 */
export function indentProblems(src) {
  const original = src.replace(/\r\n?/g, "\n").split("\n");
  const code = stripForRules(src.replace(/\r\n?/g, "\n")).split("\n");
  const problems = [];
  let depth = 0;
  let continuation = false;
  for (let i = 0; i < code.length; i++) {
    const text = code[i].trim();
    const raw = original[i] ?? "";
    if (!text) continue;
    // Only lines that start with code, not with the end of a comment that began on an earlier line.
    const startsWithCode = raw.trim()[0] === text[0];
    const closes = text.startsWith("}");
    const level = Math.max(0, depth - (closes ? 1 : 0));
    if (!continuation && startsWithCode) {
      const got = indentWidth(raw);
      const expected = level * INDENT;
      if (got !== expected) problems.push({ line: i + 1, expected, got });
    }
    for (const c of text) {
      if (c === "{") depth++;
      else if (c === "}") depth = Math.max(0, depth - 1);
    }
    continuation = !/[;{}]$/.test(text) && !/^@\w+/.test(text);
  }
  return problems;
}

/** Plain-English messages for the first few indentation problems. */
export function indentMessages(src, max = 3) {
  const problems = indentProblems(src);
  const msgs = problems.slice(0, max).map((p) => `Line ${p.line} is indented ${p.got} space${p.got === 1 ? "" : "s"}; at its depth it should be ${p.expected}.`);
  if (problems.length > max) msgs.push(`${problems.length - max} more line${problems.length - max === 1 ? " is" : "s are"} indented the same way.`);
  return msgs;
}
