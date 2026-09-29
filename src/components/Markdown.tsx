import { useMemo } from "react";
import { marked } from "marked";
import { highlightHtml } from "./highlight";

const LABELS: Record<string, string> = { output: "Output", input: "Input", javac: "What javac prints" };
const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

marked.setOptions({ gfm: true, breaks: false });
marked.use({
  renderer: {
    code({ text, lang }) {
      // Java gets the site's colors; output, input and javac blocks get a label.
      if (lang === "java") return `<pre class="code-java"><code>${highlightHtml(text)}</code></pre>\n`;
      const label = lang ? LABELS[lang] : undefined;
      if (label) return `<figure class="io io-${lang}"><figcaption>${label}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      return false;
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

/** Lesson Markdown as HTML (the content is written in this repository and checked at build time). */
export function markdownHtml(text: string, top?: number): string {
  // Code blocks and tables can scroll sideways, so they must be reachable with the keyboard.
  const out = (marked.parse(text, { async: false }) as string).replace(/<(pre|table)([ >])/g, '<$1 tabindex="0"$2');
  return top ? shiftHeadings(out, top) : out;
}

export default function Markdown({ text, className = "", top }: { text: string; className?: string; top?: number }) {
  const html = useMemo(() => markdownHtml(text, top), [text, top]);
  return <div className={"md " + className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function InlineMd({ text }: { text: string }) {
  const html = useMemo(() => marked.parseInline(text, { async: false }) as string, [text]);
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
