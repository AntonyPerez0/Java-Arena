// Pure helpers shared by the browser grader and the Node content build (scripts/build-content.mjs).

/** Blanks in fill-in templates look like [[answer]] or [[answer‖alt1‖alt2]] (U+2016 separates accepted alternatives). */
export const BLANK_RE = /\[\[(?!\[)(.*?)\]\]/g;

/** Split a fill template into text parts and blank answers. */
export function parseTemplate(template) {
  const parts = [];
  const blanks = [];
  let last = 0;
  for (const m of template.matchAll(BLANK_RE)) {
    parts.push(template.slice(last, m.index));
    const alts = m[1].split("‖");
    blanks.push({ answer: alts[0], accept: alts });
    last = m.index + m[0].length;
  }
  parts.push(template.slice(last));
  return { parts, blanks };
}

/** Rebuild source from a template and the learner's blank values. */
export function fillTemplate(template, values) {
  const { parts } = parseTemplate(template);
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) out += (values[i - 1] ?? "") + parts[i];
  return out;
}

/** The reference solution of a fill template (the first alternative of each blank). */
export function templateSolution(template) {
  const { blanks } = parseTemplate(template);
  return fillTemplate(template, blanks.map((b) => b.answer));
}

/** Whether a typed blank matches one of its accepted answers (spaces don't matter). */
export function blankMatches(blank, value) {
  const squash = (s) => s.replace(/\s+/g, "");
  return blank.accept.some((a) => squash(a) === squash(value ?? ""));
}

/**
 * Normalise program output for comparison: unify line endings, drop spaces at line ends and
 * blank lines at the very end. Everything else (capitals, spaces inside lines) must match.
 */
export function normalizeOutput(s) {
  return s
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+$/, ""))
    .join("\n")
    .replace(/\n+$/, "");
}

/**
 * Java source with comments removed and every string, text block and char literal emptied, so
 * require/forbid rules only look at code. Line breaks are kept, so line numbers stay the same.
 */
export function stripForRules(src) {
  let out = "";
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < n && src[i] !== "\n") i++;
      out += " ";
    } else if (c === "/" && next === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? n : end + 2;
      out += " " + src.slice(i, stop).replace(/[^\n]/g, "");
      i = stop;
    } else if (c === '"' && src.startsWith('"""', i)) {
      let j = i + 3;
      while (j < n && !src.startsWith('"""', j)) j += src[j] === "\\" ? 2 : 1;
      const stop = Math.min(n, j + 3);
      out += '""' + src.slice(i, stop).replace(/[^\n]/g, "");
      i = stop;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < n && src[j] !== c && src[j] !== "\n") j += src[j] === "\\" ? 2 : 1;
      out += c + c;
      i = j < n && src[j] === c ? j + 1 : j;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

/**
 * Checks require/forbid rules. A rule is { pattern, flags?, message, min?, max?, raw? }: a require
 * rule needs at least one match (or between min and max matches when either is given); a forbid
 * rule needs none. Patterns see the code without comments and with empty strings, unless `raw` is
 * set (for rules about comments or string contents). Returns the messages of the rules that fail.
 */
export function checkRules(src, require = [], forbid = []) {
  const code = stripForRules(src);
  const count = (r) => [...(r.raw ? src : code).matchAll(new RegExp(r.pattern, "g" + (r.flags ?? "").replace("g", "")))].length;
  const problems = [];
  for (const r of require) {
    const k = count(r);
    const ok = r.min == null && r.max == null ? k > 0 : k >= (r.min ?? 0) && k <= (r.max ?? Infinity);
    if (!ok) problems.push(r.message);
  }
  for (const r of forbid) if (count(r) > 0) problems.push(r.message);
  return problems;
}

/** A complete program around statements, for ```java main examples in lessons. */
export function mainProgram(statements, imports = "") {
  const body = statements
    .replace(/\s+$/, "")
    .split("\n")
    .map((l) => (l ? "        " + l : l))
    .join("\n");
  return `${imports}public class Main {\n    public static void main(String[] args) {\n${body}\n    }\n}\n`;
}

/** The hidden class that calls the learner's methods in tests with a `call`. */
export const CHECK_CLASS = "ArenaCheck";
export const CHECK_FILE = "ArenaCheck.java";

/**
 * The check program for a challenge whose tests call methods: `ArenaCheck extends Main`, so a call
 * reads exactly as it would inside Main (`printStars(3);`). It runs with the test's number as its
 * only argument; a test without a call runs Main's own main method. An exception from the
 * learner's code, checked or not, leaves unchanged, as it would from Main itself. Returns the
 * source and, for each test, the lines its code is on (to tell which call a compile error
 * belongs to).
 */
export function checkSource(tests) {
  // java.util.* lets a test's code use ArrayList, Arrays and friends as a learner's code would; an
  // on-demand import never clashes with the learner's own classes (theirs win).
  const lines = ["import java.util.*;", "", `public class ${CHECK_CLASS} extends Main {`, "    public static void main(String[] args) {", "        try {", "            switch (args[0]) {"];
  const ranges = [];
  tests.forEach((t, i) => {
    lines.push(`                case "${i}" -> {`);
    const from = lines.length + 1;
    const body = t.call == null ? "Main.main(new String[0]);" : String(t.call).replace(/\s+$/, "");
    for (const l of body.split("\n")) lines.push(l ? "                    " + l : l);
    ranges.push({ from, to: lines.length });
    lines.push("                }");
  });
  lines.push(
    "                default -> {",
    "                }",
    "            }",
    "        } catch (Throwable problem) {",
    `            ${CHECK_CLASS}.<RuntimeException>arenaRethrow(problem);`,
    "        }",
    "    }",
    "",
    '    @SuppressWarnings("unchecked")',
    "    private static <T extends Throwable> void arenaRethrow(Throwable problem) throws T {",
    "        throw (T) problem;",
    "    }",
    "}",
    "",
  );
  return { text: lines.join("\n"), ranges };
}
