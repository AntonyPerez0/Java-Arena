// Files a program reads and writes in its working folder: the names a test may give them, and the
// check of the files a test wants written (its `writes`). Shared by the browser grader and the
// Node content build (scripts/build-content.mjs) and replay (scripts/content-browser.mjs).
import { normalizeOutput } from "./assemble.js";
import { binaryNote, fromBase64, sameContent } from "./assets.ts";
import { isArenaFile } from "./javafx.js";

/**
 * A file's contents as the checks see them: its text, or its bytes for a binary file. The engine
 * gives a binary file as a Uint8Array, and JSON (the content build's results) as { binary: base64 }.
 */
export function fileContent(v) {
  if (v == null || typeof v === "string" || v instanceof Uint8Array) return v;
  if (typeof v === "object" && typeof v.binary === "string") return fromBase64(v.binary);
  return String(v);
}

/**
 * Why a name can't be used for a file in the program's folder, or null. A name is a plain file
 * name (scores.txt), or one in a folder under it (reports/summary.txt): letters, digits, `_`, `-`
 * and `.`, with `/` between folders; no `..` or absolute paths.
 */
export function dataPathProblem(name) {
  if (typeof name !== "string" || !name) return "is empty";
  const parts = name.split("/");
  if (parts.some((p) => !/^[\w.-]+$/.test(p))) return "isn't a plain file name (like scores.txt, or reports/summary.txt in a folder)";
  if (parts.some((p) => /^\.+$/.test(p))) return "can't be . or .. (the file must be in the program's folder)";
  if (isArenaFile(name)) return "is in .arena/, the folder Java Arena keeps for itself (clicks and typing go in a test's events)";
  return null;
}

/**
 * Each file a test wants the program to leave in its folder, compared with what the run left
 * there (`files`, name to text): { name, expected, got, pass }, where `got` is null when the
 * program didn't create the file. Texts are compared the way output is (normalizeOutput: line
 * endings, spaces at line ends and blank lines at the end don't matter). A file the program wrote
 * that isn't text (see fileContent) never passes, and `got` says what it holds in words.
 */
export function compareWrites(writes, files) {
  return Object.entries(writes ?? {}).map(([name, want]) => {
    const expected = normalizeOutput(String(want));
    const content = fileContent(files?.[name]);
    if (content instanceof Uint8Array) return { name, expected, got: binaryNote(content), pass: false };
    const got = content == null ? null : normalizeOutput(content);
    return { name, expected, got, pass: got === expected };
  });
}

/**
 * A sentence about the files a test wanted that are wrong, or undefined when they're right. The
 * results show a visible test's files side by side, so only a missing file gets a sentence; for
 * a hidden test, whose contents stay hidden, it names each file that isn't right.
 */
export function writesNote(results, hidden = false) {
  const missing = results.filter((f) => f.got === null).map((f) => f.name);
  const wrong = results.filter((f) => f.got !== null && !f.pass).map((f) => f.name);
  const and = (names) => (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]);
  const parts = [];
  if (missing.length) parts.push(`The program didn't create ${and(missing)}. It must write ${missing.length > 1 ? "these files in its own folder, under exactly these names" : "this file in its own folder, under exactly this name"}.`);
  if (wrong.length && hidden) parts.push(`${and(wrong)} ${wrong.length > 1 ? "don't" : "doesn't"} hold what ${wrong.length > 1 ? "they" : "it"} should after this test.`);
  return parts.length ? parts.join(" ") : undefined;
}

/**
 * The files a run created or changed: `after` (every file in the folder after the run) without the
 * ones given to the program (`before`) that it left as they were, and without Java Arena's own
 * files in .arena/ (such as the window of a JavaFX program). Sorted by name. Each is { name, text }
 * for a text file, or { name, bytes } for one that isn't text (which the page never shows as text).
 */
export function changedFiles(before, after) {
  return Object.entries(after ?? {})
    .map(([name, v]) => [name, fileContent(v)])
    .filter(([name, content]) => !sameContent(fileContent(before?.[name]), content) && !isArenaFile(name))
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([name, content]) => (content instanceof Uint8Array ? { name, bytes: content } : { name, text: content }));
}
