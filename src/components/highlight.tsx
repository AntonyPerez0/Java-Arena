// A small regex-based Java highlighter for read-only code (lesson examples, fill-in challenges, drills).
// The tokens, and the lines of drill code that wraps on a phone, come from code-lines.ts.
import { Fragment, type CSSProperties, type ReactNode } from "react";
import { FILE_MARK, splitFiles } from "../grader/files.js";
import { TOKEN, classify, codePieces, deepestIndent, esc, indentOf, lineBits, lineText, pieceLines, type CodePiece } from "./code-lines";

/** A file marker on any line (such as `// ==== library/domain/Book.java ====`). */
const FILE_MARK_ANY = new RegExp(FILE_MARK.source, "m");

export function highlight(code: string, keyPrefix = ""): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let k = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out.push(code.slice(last, m.index));
    const cls = classify(m, code);
    out.push(cls ? (
      <span key={keyPrefix + k++} className={cls}>
        {m[0]}
      </span>
    ) : (
      m[0]
    ));
    last = m.index! + m[0].length;
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

/** One line of code, highlighted, with its break points (see lineBits). */
export function lineNodes(line: CodePiece[], keyPrefix = ""): ReactNode[] {
  return lineBits(line).map((b, i) => {
    const key = keyPrefix + i;
    if ("node" in b) return <Fragment key={key}>{b.node}</Fragment>;
    if ("glue" in b)
      return (
        <span key={key} className="keep">
          {b.glue}
        </span>
      );
    if ("ind" in b)
      return (
        <span key={key} className="keep">
          <span className="ind">{b.ind}</span>
          {b.cls ? <span className={b.cls}>{b.ch}</span> : b.ch}
        </span>
      );
    if ("lit" in b)
      return (
        <span key={key} className="lit">
          <span className="tk-str">{b.lit}</span>
          {b.close}
        </span>
      );
    const parts = b.parts.map((s, j) => (s === null ? <wbr key={j} /> : s));
    return b.cls ? (
      <span key={key} className={b.cls}>
        {parts}
      </span>
    ) : (
      <Fragment key={key}>{parts}</Fragment>
    );
  });
}

/**
 * Code drawn one element per line (.cl, with its indent in --indent and the code's deepest in
 * --deep), so drill code can wrap on a phone with each wrapped line under its own start (see
 * pre.wraps in styles.css). The "\n" between lines stays text: the box's text is exactly the code.
 * An empty line is just its "\n".
 */
export function codeLines(pieces: CodePiece[], keyPrefix = ""): ReactNode[] {
  const lines = pieceLines(pieces);
  const deep = deepestIndent(lines.map(lineText));
  return lines.map((line, i) => (
    <Fragment key={keyPrefix + i}>
      {line.length > 0 && (
        <span className="cl" style={{ "--indent": indentOf(lineText(line)), "--deep": deep } as CSSProperties}>
          {lineNodes(line, `${keyPrefix}${i}-`)}
        </span>
      )}
      {i < lines.length - 1 ? "\n" : ""}
    </Fragment>
  ));
}

/**
 * Read-only code. With `wrap` (drills), long lines wrap on a phone instead of scrolling sideways,
 * each wrapped line under its own start; wider screens show it as before.
 */
export function CodeView({ code, className = "", label, wrap = false }: { code: string; className?: string; label?: string; wrap?: boolean }) {
  const cls = "codeview " + (wrap ? "wraps " : "") + className;
  const body = (text: string) => (wrap ? codeLines(codePieces(text)) : highlight(text));
  // A program of several files shows each one under its name.
  if (FILE_MARK_ANY.test(code))
    return (
      <div className="code-files">
        {(splitFiles(code) as { path: string; text: string }[]).map((f) => (
          <figure className="code-file" key={f.path}>
            <figcaption>{f.path}</figcaption>
            <pre tabIndex={0} className={cls} aria-label={label ? `${label}, ${f.path}` : f.path}>
              {body(f.text)}
            </pre>
          </figure>
        ))}
      </div>
    );
  return (
    <pre tabIndex={0} className={cls} aria-label={label}>
      {body(code)}
    </pre>
  );
}

/** The same highlighting as an HTML string, for code blocks inside lesson Markdown. */
export function highlightHtml(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    if (m.index! > last) out += esc(code.slice(last, m.index));
    const cls = classify(m, code);
    out += cls ? `<span class="${cls}">${esc(m[0])}</span>` : esc(m[0]);
    last = m.index! + m[0].length;
  }
  return out + esc(code.slice(last));
}
