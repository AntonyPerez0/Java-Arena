// After `vite build`: writes a real HTML page for every route into dist/, so search engines, link
// previews and browsers without JavaScript see each page's own title, description and text. The
// React app replaces the pre-rendered content when it starts. Also writes 404.html (GitHub Pages
// serves it for unknown addresses, and the app then shows the right page), sitemap.xml and robots.txt.
//
// Env: SITE_URL (default https://antonyperez0.github.io/Java-Arena), BASE_PATH (default /).
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const DIST = path.join(ROOT, "dist");
// Host names are case-insensitive, but canonical links should match what GitHub Pages serves (lower case).
const siteUrl = new URL(process.env.SITE_URL ?? "https://antonyperez0.github.io/Java-Arena");
const SITE = `${siteUrl.protocol}//${siteUrl.host.toLowerCase()}${siteUrl.pathname}`.replace(/\/$/, "");
const BASE = process.env.BASE_PATH ?? "/";
const NAME = "Java Arena";
const MOOC = "https://java-programming.mooc.fi";
const LICENSE = "https://creativecommons.org/licenses/by-nc-sa/4.0/";
const GEN = path.join(ROOT, "src/generated");
const index = JSON.parse(fs.readFileSync(path.join(GEN, "course.json"), "utf8"));
const content = { ...index, modules: index.modules.map((m) => JSON.parse(fs.readFileSync(path.join(GEN, "modules", `${m.id}.json`), "utf8"))) };
const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
if (!template.includes("<!--head-->") || !template.includes("<!--app-->")) throw new Error("prerender: dist/index.html has lost its <!--head--> or <!--app--> marker");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const link = (p) => BASE + p.replace(/^\//, "");
const canonical = (route) => (route === "/" ? `${SITE}/` : `${SITE}${route}/`);

const LABELS = { output: "Output", input: "Input", javac: "What javac prints" };
marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang && LABELS[lang]) return `<figure class="io io-${lang}"><figcaption>${LABELS[lang]}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      return `<pre${lang === "java" ? ' class="code-java"' : ""}><code>${esc(text)}</code></pre>\n`;
    },
  },
});
/** Markdown whose shallowest heading becomes <h{top}>, so the outline has no gaps. */
function md(s, top = 2) {
  const html = marked.parse(s, { async: false });
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (!levels.length) return html;
  const shift = top - Math.min(...levels);
  return html.replace(/<(\/?)h([1-6])([\s>])/g, (_, slash, n, after) => `<${slash}h${Math.min(6, Math.max(1, Number(n) + shift))}${after}`);
}
/** Plain-text summary of Markdown, cut at a word boundary. */
function summary(text, max = 155) {
  const plain = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, "")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\*\*|__|\*|_|#+ /g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

const stepPath = (m, s) => `/learn/${m.id}/${s.slug}`;
const modulePath = (m) => `/learn/${m.id}`;
const stepCount = content.modules.reduce((n, m) => n + m.steps.length, 0);
const challengeCount = content.modules.reduce((n, m) => n + m.steps.reduce((k, s) => k + 1 + s.more.length, 0), 0);

function credit(m) {
  if (!m.mooc?.length) return `<p class="credit">An extra module, not part of the University of Helsinki's course. Lesson text: <a href="${LICENSE}">CC BY-NC-SA 4.0</a>.</p>`;
  const secs = m.mooc.map((s) => `<a href="${MOOC}${s.path}">${esc(s.section)} ${esc(s.title)}</a>`).join(", ");
  return `<p class="credit">This module follows ${m.mooc.length > 1 ? "sections" : "section"} ${secs} of <a href="${MOOC}">Java Programming</a> by the University of Helsinki (Agile Education Research group), licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. The explanations and exercises here are written for Java Arena and shared under the same license. Java Arena is not affiliated with the University of Helsinki.</p>`;
}

const pages = [];
const page = (route, p) => pages.push({ route, index: true, type: "website", jsonld: null, ...p });

page("/", {
  title: `${NAME}: learn Java in your browser`,
  description: `Free, non-commercial Java lessons with the real javac 21 compiler and a Java virtual machine running in your browser. Follows the University of Helsinki's Java Programming MOOC.`,
  jsonld: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: NAME,
    url: SITE + "/",
  },
  body: `<h1>Learn Java by writing real Java</h1>
<p>Every exercise is compiled by the real javac 21 compiler and run by a Java virtual machine, both inside your browser, on your own device. The lessons follow the University of Helsinki's Java Programming MOOC, with their own explanations and exercises.</p>
<p>Java Arena is new: ${content.modules.length} of ${content.plan.length} modules are online so far (${stepCount} steps, ${challengeCount} challenges). The rest of the course is added in batches.</p>
<ul>${content.modules.map((m) => `<li><a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a></li>`).join("")}<li><a href="${link("/learn")}">All modules</a></li></ul>`,
});

page("/learn", {
  title: `All modules | ${NAME}`,
  description: `The course plan: ${content.plan.length} modules following the University of Helsinki's Java Programming MOOC, parts 1 to 14, plus extras. ${content.modules.length} are online so far.`,
  body:
    `<h1>The course</h1><p>Java Arena follows the order and topics of the University of Helsinki's Java Programming MOOC, parts 1 to 14, with its own lessons and exercises. Modules that aren't written yet are listed so you can see what's coming.</p><ol>` +
    content.plan.map((m) => `<li>${m.live ? `<a href="${link(modulePath(m))}">${esc(m.title)}</a>` : `${esc(m.title)} (not written yet)`}</li>`).join("") +
    `</ol>`,
});

for (const m of content.modules) {
  page(modulePath(m), {
    title: `Module ${m.number}: ${m.title} | ${NAME}`,
    description: summary(m.summary),
    body: `<nav aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a></nav><h1>${esc(m.title)}</h1><p>${esc(m.summary)}</p><h2>Steps</h2><ol>${m.steps.map((s) => `<li><a href="${link(stepPath(m, s))}">${esc(s.title)}</a></li>`).join("")}</ol>${credit(m)}`,
  });
  m.steps.forEach((s, i) => {
    const prev = i > 0 ? `<a href="${link(stepPath(m, m.steps[i - 1]))}">Previous: ${esc(m.steps[i - 1].title)}</a>` : "";
    const next = i + 1 < m.steps.length ? `<a href="${link(stepPath(m, m.steps[i + 1]))}">Next: ${esc(m.steps[i + 1].title)}</a>` : "";
    page(stepPath(m, s), {
      title: `${s.title} · ${m.title} | ${NAME}`,
      description: summary(s.text),
      type: "article",
      jsonld: {
        "@context": "https://schema.org",
        "@type": "LearningResource",
        name: s.title,
        description: summary(s.text),
        learningResourceType: "Exercise",
        interactivityType: "active",
        isAccessibleForFree: true,
        inLanguage: "en",
        programmingLanguage: "Java",
        license: LICENSE,
        url: canonical(stepPath(m, s)),
      },
      body: `<nav aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › <a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a></nav>
<p>Step ${i + 1} of ${m.steps.length}</p>
<h1>${esc(s.title)}</h1>
${md(s.text, 2)}
<h2>Your task</h2>
${md(s.task, 3)}
${s.more.map((c, k) => `<h3>Challenge ${k + 2}</h3>\n${md(c.task, 4)}`).join("\n")}
<p>${prev} ${next}</p>
${credit(m)}`,
    });
  });
}

page("/settings", { title: `Settings | ${NAME}`, description: "Theme, text size, the Java engine download, and your progress on this device.", body: `<h1>Settings</h1><p>Theme, text size, the Java engine download, and your progress. Everything here is saved in this browser only.</p>` });
page("/about", {
  title: `About and credits | ${NAME}`,
  description: "What Java Arena is, the University of Helsinki course it follows, how the in-browser Java engine works, privacy and licenses.",
  body: `<h1>About and credits</h1><p>Java Arena is a free, non-commercial site for learning Java, with real compiling and running in the browser. The modules follow the order and topics of <a href="${MOOC}">Java Programming</a>, a free course by the University of Helsinki licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle.</p>`,
});

// ---------------------------------------------------------------- write
const FOOTER = `<footer class="footer"><div class="footer-inner"><p class="muted small">The lessons follow the order and topics of <a href="${MOOC}">Java Programming</a> by the University of Helsinki, licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. Java Arena's lessons are shared under the same license; the site's code is MIT licensed. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.</p></div></footer>`;
const HEADER = `<header class="topbar"><a href="${link("/")}" class="brand" aria-label="Java Arena home"><img class="brand-mark" src="${link("/favicon.svg")}" alt="" width="30" height="30"><span class="brand-name">Java <b>Arena</b></span></a><nav class="nav" aria-label="Main"><a href="${link("/learn")}">Learn</a><a href="${link("/settings")}">Settings</a><a href="${link("/about")}">About</a></nav></header>`;

function render(p) {
  const url = canonical(p.route);
  const head = [
    `<link rel="canonical" href="${url}">`,
    p.index ? "" : `<meta name="robots" content="noindex">`,
    `<meta property="og:site_name" content="${NAME}">`,
    `<meta property="og:type" content="${p.type}">`,
    `<meta property="og:title" content="${esc(p.title)}">`,
    `<meta property="og:description" content="${esc(p.description)}">`,
    `<meta property="og:url" content="${url}">`,
    `<meta name="twitter:card" content="summary">`,
    ...(p.jsonld ? [`<script type="application/ld+json">${JSON.stringify(p.jsonld).replace(/</g, "\\u003c")}</script>`] : []),
  ]
    .filter(Boolean)
    .join("\n    ");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`)
    .replace("<!--head-->", head)
    .replace("<!--app-->", `${HEADER}<main class="main${p.route === "/" ? " main-full" : ""}" id="main"><div class="prerendered${p.route === "/" ? " container" : " narrow"} md">${p.body}</div></main>${FOOTER}`);
}

for (const p of pages) {
  const dir = path.join(DIST, p.route);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), render(p));
}
fs.writeFileSync(
  path.join(DIST, "404.html"),
  render({ route: "/404", title: `Page not found | ${NAME}`, description: "There's no page at this address.", index: false, type: "website", jsonld: null, body: `<h1>Page not found</h1><p>There's no page at this address. <a href="${link("/learn")}">See all modules</a>.</p>` }).replace(
    /<link rel="canonical"[^>]*>\n\s*/,
    "",
  ),
);

const indexed = [...pages.filter((p) => p.index).map((p) => canonical(p.route)), `${SITE}/bench/`];
fs.writeFileSync(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexed.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`prerender: ${pages.length} pages, 404.html, sitemap.xml with ${indexed.length} addresses`);
