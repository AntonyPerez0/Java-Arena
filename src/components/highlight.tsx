// A small regex-based Java highlighter for read-only code (lesson examples, fill-in challenges).
import type { ReactNode } from "react";
import { splitFiles } from "../grader/files.js";

const FILE_MARK_ANY = /^\/\/ ={4} [A-Za-z_$][\w$]*\.java ={4}[ \t]*$/m;

const KEYWORDS = new Set(
  "abstract assert break case catch class const continue default do else enum extends final finally for goto if implements import instanceof interface native new package private protected public return static strictfp super switch synchronized this throw throws transient try volatile while var record yield sealed permits non-sealed true false null".split(
    " ",
  ),
);
const TYPES = new Set(
  "void int long short byte char boolean float double String Scanner Integer Double Boolean Character Long Math System ArrayList List HashMap Map HashSet Set Random Arrays Collections Object StringBuilder Files Paths Path LocalDate".split(" "),
);

// Comments, text blocks and strings, chars, annotations, numbers, words.
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*')|(@[A-Za-z_]\w*)|(\b\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[lLfFdD]?\b|\b0[xX][0-9a-fA-F_]+\b)|([A-Za-z_$][\w$]*)/g;

function classify(m: RegExpMatchArray, code: string): string {
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

export function CodeView({ code, className = "", label }: { code: string; className?: string; label?: string }) {
  // A program of several files shows each one under its name.
  if (FILE_MARK_ANY.test(code))
    return (
      <div className="code-files">
        {(splitFiles(code) as { path: string; text: string }[]).map((f) => (
          <figure className="code-file" key={f.path}>
            <figcaption>{f.path}</figcaption>
            <pre tabIndex={0} className={"codeview " + className} aria-label={label ? `${label}, ${f.path}` : f.path}>
              {highlight(f.text)}
            </pre>
          </figure>
        ))}
      </div>
    );
  return (
    <pre tabIndex={0} className={"codeview " + className} aria-label={label}>
      {highlight(code)}
    </pre>
  );
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

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
