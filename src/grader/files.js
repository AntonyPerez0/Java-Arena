// A program of several source files, kept as one string so that saving, grading and sharing work
// the same as for one file. Each file after the first starts with a marker line naming it:
//
//   public class Main { ... }        <- Main.java (no marker needed when it comes first)
//   // ==== Person.java ====
//   public class Person { ... }
//
// A program without markers is a single Main.java. The editor shows each file in its own tab, so a
// learner never types a marker; lesson examples show them as file headings.

/** A file marker line: `// ==== Name.java ====`. */
export const FILE_MARK = /^\/\/ ={4} ([A-Za-z_$][\w$]*\.java) ={4}[ \t]*$/;

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

/** The one string for a set of files (the reverse of splitFiles). */
export function joinFiles(files) {
  if (files.length === 1 && files[0].path === "Main.java") return files[0].text;
  return files.map((f, i) => (i === 0 && f.path === "Main.java" ? "" : `// ==== ${f.path} ====\n`) + String(f.text).replace(/\n*$/, "\n")).join("\n");
}

/** True when the program has more than one file. */
export const isMultiFile = (code) => splitFiles(code).length > 1;
