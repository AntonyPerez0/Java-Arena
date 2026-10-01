// A program of several source files, kept as one string so that saving, grading and sharing work
// the same as for one file. Each file starts with a marker line naming it:
//
//   // ==== Main.java ====
//   public class Main { ... }
//   // ==== Person.java ====
//   public class Person { ... }
//
// A program without markers is a single Main.java (text before the first marker also belongs to
// Main.java, as lesson examples write it). The editor shows each file in its own tab, so a
// learner never types a marker; lesson examples show them as file headings.
//
// A file of a class in a package sits in the package's folders, separated by /:
//
//   // ==== library/domain/Book.java ====
//   package library.domain;
//   ...
//
// Main.java stays at the top, in the default package, since the site runs the class Main.

/** A file marker line: `// ==== Name.java ====`, or `// ==== folder/sub/Name.java ====`. */
export const FILE_MARK = /^\/\/ ={4} ((?:[A-Za-z_$][\w$]*\/)*[A-Za-z_$][\w$]*\.java) ={4}[ \t]*$/;

/** The files of a program: [{ path, text }], Main.java first when there's no marker before it. */
export function splitFiles(code) {
  const lines = String(code).split("\n");
  if (!lines.some((l) => FILE_MARK.test(l))) return [{ path: "Main.java", text: code }];
  const files = [];
  let cur = null;
  for (const line of lines) {
    const m = FILE_MARK.exec(line);
    if (m) {
      cur = { path: m[1], lines: [] };
      files.push(cur);
    } else if (cur) cur.lines.push(line);
    else if (line.trim()) {
      cur = { path: "Main.java", lines: [line] };
      files.push(cur);
    }
  }
  return files.map((f) => ({ path: f.path, text: f.lines.join("\n").replace(/\n*$/, "\n") }));
}

/** The one string for a set of files (the reverse of splitFiles). With several files every one,
 * the first too, gets its marker, so even an empty file keeps its place. */
export function joinFiles(files) {
  if (files.length === 1 && files[0].path === "Main.java") return files[0].text;
  return files.map((f) => `// ==== ${f.path} ====\n` + String(f.text).replace(/\n*$/, "\n")).join("\n");
}

/** True when the program has more than one file. */
export const isMultiFile = (code) => splitFiles(code).length > 1;

/** The file's name without its folders: Book.java for library/domain/Book.java. */
export const baseName = (path) => String(path).split("/").pop();

/** The folders a file is in, with a / after each (library/domain/), or "" for a file at the top. */
export const folderOf = (path) => String(path).slice(0, String(path).length - baseName(path).length);

/** The package a file's folders make (library.domain for library/domain/Book.java), "" at the top. */
export const packageOfPath = (path) => folderOf(path).replace(/\/$/, "").replace(/\//g, ".");

/** The class a file is named after, with its package: library.domain.Book for library/domain/Book.java. */
export const classOfPath = (path) => String(path).replace(/\.java$/, "").replace(/\//g, ".");

/** Java's reserved words (with true, false and null), which can't name a package, a class or a variable. */
export const RESERVED_WORDS = new Set(
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while _ true false null".split(" "),
);

/**
 * The package a file declares in its `package` line (library.domain), "" when its code doesn't start
 * with one, or null when the line can't be read. Comments before it are skipped.
 */
export function declaredPackage(text) {
  const code = String(text).replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, " ");
  const head = /^\s*(?:@[\w$.]+(?:\s*\([^)]*\))?\s*)*package\b/.exec(code);
  if (!head) return "";
  const name = /^\s*([^;]*);/.exec(code.slice(head[0].length))?.[1].replace(/\s+/g, "");
  return name && /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(name) ? name : null;
}
