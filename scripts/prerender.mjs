// After `vite build`: writes a real HTML page for every route into dist/, so search engines, link
// previews and browsers without JavaScript see each page's own title, description and text. The
// React app replaces the pre-rendered content when it starts. Also writes 404.html (GitHub Pages
// serves it for unknown addresses, and the app then shows the right page), sitemap.xml and robots.txt.
//
// Env: SITE_URL (default https://antonyperez0.github.io/Java-Arena), BASE_PATH (default /).
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { splitFiles } from "../src/grader/files.js";

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
// Links to pages end with a slash (the folder address GitHub Pages serves without a redirect).
const link = (p) => BASE + p.replace(/^\//, "").replace(/^([^.?#]*[^/.?#])$/, "$1/");
const canonical = (route) => (route === "/" ? `${SITE}/` : `${SITE}${route.replace(/\/$/, "")}/`);

const LABELS = { output: "Output", input: "Input", javac: "What javac prints", crash: "The program crashes with" };
marked.use({
  renderer: {
    code({ text, lang }) {
      const file = lang ? /^file\s+(\S+)$/.exec(lang) : null;
      if (file) return `<figure class="io io-file"><figcaption>The file ${esc(file[1])}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      if (lang === "java" && /^\/\/ ={4} [\w$]+\.java ={4}[ \t]*$/m.test(text))
        return splitFiles(text).map((f) => `<figure class="code-file"><figcaption>${esc(f.path)}</figcaption><pre class="code-java"><code>${esc(f.text.replace(/\n$/, ""))}</code></pre></figure>\n`).join("");
      if (lang === "input" && /\n$/.test(text))
        return `<figure class="io io-input"><figcaption>Input</figcaption><pre><code>${esc(text.replace(/\n$/, ""))}\n<span class="input-empty">(an empty line)</span></code></pre></figure>\n`;
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

const stepPath = (m, s) => `/learn/${m.id}/${s.slug}/`;
const modulePath = (m) => `/learn/${m.id}/`;
const stepCount = content.modules.reduce((n, m) => n + m.steps.length, 0);
const challengeCount = content.modules.reduce((n, m) => n + m.steps.reduce((k, s) => k + 1 + s.more.length, 0), 0);

function credit(m) {
  if (!m.mooc?.length) return `<p>An extra module, not part of the University of Helsinki's course. Lesson text: <a href="${LICENSE}">CC BY-NC-SA 4.0</a>.</p>`;
  const secs = m.mooc.map((s) => `<a href="${MOOC}${s.path}">${esc(s.section)} ${esc(s.title)}</a>`).join(", ");
  return `<p>This module follows ${m.mooc.length > 1 ? "sections" : "section"} ${secs} of <a href="${MOOC}">Java Programming</a> by Arto Hellas, Matti Luukkainen and contributors (Agile Education Research group, University of Helsinki), licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. The explanations and exercises here are written for Java Arena and shared under the same license. Java Arena is not affiliated with or endorsed by the University of Helsinki.</p>`;
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
<ul>${content.modules.map((m) => `<li><a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a></li>`).join("")}<li><a href="${link("/learn")}">All modules</a></li></ul>
<p>Practice: <a href="${link("/deathmatch")}">Deathmatch drills</a>, <a href="${link("/daily")}">the daily challenge</a> and <a href="${link("/placement")}">a placement quiz</a>.</p>`,
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
    body: `<nav aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a></nav><h1>${esc(m.title)}</h1><p>${esc(m.summary)}</p><h2>Steps</h2><ol>${m.steps.map((s) => `<li><a href="${link(stepPath(m, s))}">${esc(s.title)}</a></li>`).join("")}</ol><aside class="credit">${credit(m)}</aside>`,
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
      // The same layout as the app's lesson page, so nothing jumps when the app takes over.
      layout: true,
      body: `<div class="step-page"><nav class="crumbs" aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › <a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a></nav>
<div class="step-grid"><article class="step-text"><div class="step-count">Step ${i + 1} of ${m.steps.length}</div>
<h1>${esc(s.title)}</h1>
<div class="md">${md(s.text, 2)}</div>
<nav class="step-dots" aria-label="Steps in this module">${m.steps.map((st, k) => `<a class="dot${k === i ? " dot-cur" : ""}" href="${link(stepPath(m, st))}" aria-label="Step ${k + 1}: ${esc(st.title)}"></a>`).join("")}</nav>
<aside class="credit credit-compact">${credit(m)}</aside></article>
<section class="step-work" aria-label="Exercise"><nav class="challenges" aria-label="Challenges in this step">${[0, 1, 2].map((k) => `<span class="challenge-tab${k === 0 ? " challenge-cur" : ""}"><span class="challenge-n" aria-hidden="true">${k + 1}</span>Challenge ${k + 1}</span>`).join("")}</nav>
<section class="task-card"><div class="task-head"><h2 class="task-title">Your task</h2><span class="task-count">Challenge 1 of 3</span></div><div class="md task-body">${md(s.task, 3)}</div></section>
${s.more.map((c, k) => `<section class="task-card"><div class="task-head"><h2 class="task-title">Challenge ${k + 2}</h2></div><div class="md task-body">${md(c.task, 3)}</div></section>`).join("\n")}
<div class="step-nav">${prev} ${next}</div></section></div></div>`,
    });
  });
}

page("/playground", {
  title: `Java playground | ${NAME}`,
  description: "Write any Java program and run it with your own input, with the real javac 21 compiler running in your browser. Share programs as links.",
  layout: true,
  body: `<div class="playground"><div class="page-head"><h1>Playground</h1><p class="muted">Write any Java program and run it with your own input. It runs on your device with the real javac 21, and it's saved in this browser.</p></div></div>`,
});

// Practice pages: the text that describes them, the same as the app's first view of each.
page("/deathmatch", {
  title: `Deathmatch: Java practice drills | ${NAME}`,
  description: "Endless quick Java drills from the lessons you've finished: predict the output, fill the blank, spot the bug, will it compile, and small programs to write. Spaced review and interview prep.",
  layout: true,
  body: `<div class="lobby practice-page"><div class="page-head"><h1>Deathmatch</h1><p class="muted">Endless quick reps from the lessons you've finished: predict the output, fill the blank, spot the bug, will it compile, pick one. Every 8th rep is a boss rep, a small program you write and run for real. Drills you miss come back more often until you know them.</p></div></div>`,
});
page("/daily", {
  title: `Daily Java challenge | ${NAME}`,
  description: "One Java question a day, the same for everyone. Answer it to keep your streak going.",
  layout: true,
  body: `<div class="narrow practice-page"><div class="page-head"><h1>Daily challenge</h1><p class="muted">One question a day, the same for everyone. Answer it to keep your streak going; a new one comes at midnight.</p></div></div>`,
});
page("/placement", {
  title: `Placement quiz: where to start with Java | ${NAME}`,
  description: "Already know some Java? A short quiz, one question per module, shows where to start and which modules you can skip.",
  layout: true,
  body: `<div class="narrow"><div class="page-head"><h1>Placement quiz</h1><p>Already know some Java? Answer a few quick questions, one for each module written so far. The first one you miss shows where to start, and you can skip the modules before it.</p></div></div>`,
});

page("/settings", { title: `Settings | ${NAME}`, description: "Theme, text size, the Java engine download, and your progress on this device.", body: `<h1>Settings</h1><p>Theme, text size, the Java engine download, and your progress. Everything here is saved in this browser only.</p>` });
page("/about", {
  title: `About and credits | ${NAME}`,
  description: "What Java Arena is, the University of Helsinki course it follows, how the in-browser Java engine works, privacy and licenses.",
  body: `<h1>About and credits</h1><p>Java Arena is a free, non-commercial site for learning Java, with real compiling and running in the browser. The modules follow the order and topics of <a href="${MOOC}">Java Programming</a>, a free course by the University of Helsinki licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle.</p>`,
});

// ---------------------------------------------------------------- write
// The header and footer as the app draws them (src/App.tsx), so the page doesn't shift when it starts.
const MARK = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="ja-bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fdba74"></stop><stop offset="0.55" stop-color="#f97316"></stop><stop offset="1" stop-color="#dc2626"></stop></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#ja-bm)"></rect><path d="M10 8.5c-2 0-2.6 1-2.6 2.8v2.2c0 1.4-.6 2.2-1.9 2.5 1.3.3 1.9 1.1 1.9 2.5v2.2c0 1.8.6 2.8 2.6 2.8M22 8.5c2 0 2.6 1 2.6 2.8v2.2c0 1.4.6 2.2 1.9 2.5-1.3.3-1.9 1.1-1.9 2.5v2.2c0 1.8-.6 2.8-2.6 2.8" fill="none" stroke="#1c0a02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><path d="M18.2 10v7.6c0 2.2-1.1 3.4-3 3.4-1.3 0-2.2-.6-2.7-1.6" fill="none" stroke="#1c0a02" stroke-width="2.6" stroke-linecap="round"></path></svg>`;
const BRAND = `<a href="${link("/")}" class="brand" aria-label="Java Arena home">${MARK}<span class="brand-name">Java <b>Arena</b></span></a>`;
const HEADER = `<header class="topbar">${BRAND}<nav id="main-nav" class="nav" aria-label="Main"><a href="${link("/learn")}">Learn</a><a href="${link("/deathmatch")}">Deathmatch</a><a href="${link("/daily")}">Daily</a><a href="${link("/playground")}">Playground</a><a href="${link("/settings")}">Settings</a><a href="${link("/about")}">About</a></nav><div class="topbar-right"><a href="${link("/learn")}" class="btn btn-primary btn-sm topbar-cta">Start learning</a></div></header>`;
const REPO = "https://github.com/AntonyPerez0/Java-Arena";
const FOOTER = `<footer class="footer"><div class="footer-inner"><div class="footer-grid"><div class="footer-brand">${BRAND}<p>Learn Java with the real compiler, running in your browser. Free and non-commercial.</p></div><div class="footer-col"><h2>Learn</h2><ul><li><a href="${link("/learn")}">All modules</a></li><li><a href="${link("/learn/printing")}">Start with module 1</a></li><li><a href="${link("/playground")}">Playground</a></li></ul></div><div class="footer-col"><h2>Practice</h2><ul><li><a href="${link("/deathmatch")}">Deathmatch</a></li><li><a href="${link("/daily")}">Daily challenge</a></li><li><a href="${link("/placement")}">Placement quiz</a></li></ul></div><div class="footer-col"><h2>Site</h2><ul><li><a href="${link("/settings")}">Settings</a></li><li><a href="${link("/about")}">About and credits</a></li><li><a href="${REPO}">Source on GitHub</a></li><li><a href="${REPO}/issues/new">Report a problem</a></li></ul></div></div><div class="footer-bottom"><p>The lessons follow the order and topics of <a href="${MOOC}">Java Programming</a> by the University of Helsinki, licensed under <a href="${LICENSE}" rel="license">CC BY-NC-SA 4.0</a>. Java Arena's lessons are shared under the same license; the site's code is MIT licensed. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.</p><p>Your progress stays in this browser. No account, no ads, no tracking.</p></div></div></footer>`;
// The fonts are needed for the first paint: fetch them right away instead of after the CSS.
const FONTS = fs
  .readdirSync(path.join(DIST, "assets"))
  .filter((f) => f.endsWith(".woff2"))
  .map((f) => `<link rel="preload" href="${link("/assets/" + f)}" as="font" type="font/woff2" crossorigin>`);

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
    ...FONTS,
    ...(p.jsonld ? [`<script type="application/ld+json">${JSON.stringify(p.jsonld).replace(/</g, "\\u003c")}</script>`] : []),
  ]
    .filter(Boolean)
    .join("\n    ");
  return template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(p.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(p.description)}" />`)
    .replace("<!--head-->", head)
    .replace("<!--app-->", `${HEADER}<main class="main${p.route === "/" ? " main-full" : ""}" id="main">${p.layout ? p.body : `<div class="prerendered${p.route === "/" ? " container" : " narrow"} md">${p.body}</div>`}</main>${FOOTER}`);
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
