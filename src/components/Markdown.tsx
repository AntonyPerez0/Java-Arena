import { useMemo, useRef } from "react";
import { marked } from "marked";
import { codeLinesHtml } from "./code-lines";
import { highlightHtml } from "./highlight";
import { splitFiles } from "../grader/files.js";
import { windowExample } from "../grader/window";
import { windowFigureHtml } from "./window-drawing";
import { useWindowFrames } from "./window-frame";

const LABELS: Record<string, string> = { output: "Output", input: "Input", javac: "What javac prints", crash: "The program crashes with" };
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

marked.setOptions({ gfm: true, breaks: false });
// Set while a drill's Markdown is parsed (parsing is synchronous): its Java and plain code blocks
// (a boss rep's "The check runs" and "and expects") wrap on a phone like the drill's own code (see
// CodeView's `wrap`).
let wrapCode = false;
marked.use({
  renderer: {
    code({ text, lang }) {
      // Java gets the site's colors; output, input and javac blocks get a label.
      if (lang === "java") {
        const java = (t: string) => (wrapCode ? `<pre class="code-java wraps"><code>${codeLinesHtml(t.replace(/\n$/, ""))}</code></pre>` : `<pre class="code-java"><code>${highlightHtml(t)}</code></pre>`);
        const files = splitFiles(text) as { path: string; text: string }[];
        // A program of several files: each one under its name.
        if (files.length > 1 || files[0].path !== "Main.java" || text !== files[0].text)
          return files.map((f) => `<figure class="code-file"><figcaption>${esc(f.path)}</figcaption>${java(f.text.replace(/\n$/, ""))}</figure>\n`).join("");
        return java(text) + "\n";
      }
      // A java window example's window, which the build stored after its code: drawn (not usable),
      // with the window as text under it (scripts/prerender.mjs draws it the same way).
      const shown = lang === "window" ? windowExample(text) : null;
      if (shown) return windowFigureHtml(shown);
      const file = lang ? /^file\s+(\S+)$/.exec(lang) : null;
      if (file) return `<figure class="io io-file"><figcaption>The file ${esc(file[1])}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      const label = lang ? LABELS[lang] : undefined;
      // Input that ends with an empty line (the program reads until one) shows it.
      if (lang === "input" && /\n$/.test(text))
        return `<figure class="io io-input"><figcaption>${label}</figcaption><pre><code>${esc(text.replace(/\n$/, ""))}\n<span class="input-empty">(an empty line)</span></code></pre></figure>\n`;
      if (label) return `<figure class="io io-${lang}"><figcaption>${label}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      // Any other block (no language, "text", "java fragment") is plain text, line by line in a drill.
      if (wrapCode) return `<pre class="wraps"><code>${codeLinesHtml(text.replace(/\n$/, ""), false)}</code></pre>\n`;
      return false;
    },
    codespan({ text }) {
      // A lambda's arrow stays in one piece when running text wraps on a phone.
      return `<code>${text.replace(/-&gt;/g, '<span class="nw">-&gt;</span>')}</code>`;
    },
  },
});

/** Moves every heading so the shallowest becomes <h{top}>, keeping the page outline in order. */
export function shiftHeadings(html: string, top: number): string {
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (levels.length === 0) return html;
  const shift = top - Math.min(...levels);
  if (shift === 0) return html;
  return html.replace(/<(\/?)h([1-6])([\s>])/g, (_, slash, n, after) => `<${slash}h${Math.min(6, Math.max(1, Number(n) + shift))}${after}`);
}

/**
 * Lesson Markdown as HTML (the content is written in this repository and checked at build time).
 * HTML in it passes through as it is: the class diagrams the build draws from ```classes blocks
 * (scripts/content/class-diagram.mjs), which scripts/prerender.mjs shows the same way.
 */
export function markdownHtml(text: string, top?: number, wrap = false): string {
  wrapCode = wrap;
  let parsed: string;
  try {
    parsed = marked.parse(text, { async: false }) as string;
  } finally {
    wrapCode = false;
  }
  // Code blocks and tables can scroll sideways, so they must be reachable with the keyboard.
  const out = parsed.replace(/<(pre|table)([ >])/g, '<$1 tabindex="0"$2');
  return top ? shiftHeadings(out, top) : out;
}

/** Markdown; with `wrapCode` (drills), its code blocks wrap on a phone instead of scrolling sideways. */
export default function Markdown({ text, className = "", top, wrapCode = false }: { text: string; className?: string; top?: number; wrapCode?: boolean }) {
  const html = useMemo(() => markdownHtml(text, top, wrapCode), [text, top, wrapCode]);
  // A window drawn in the text says so when it's wider than the column (see window-frame.ts).
  const ref = useRef<HTMLDivElement>(null);
  useWindowFrames(ref, [html]);
  return <div ref={ref} className={"md " + className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function InlineMd({ text }: { text: string }) {
  const html = useMemo(() => marked.parseInline(text, { async: false }) as string, [text]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
