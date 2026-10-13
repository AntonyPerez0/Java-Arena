// After `vite build`: writes a real HTML page for every route into dist/, so search engines, link
// previews and browsers without JavaScript see each page's own title, description and text. The
// React app replaces the pre-rendered content when it starts. Also writes 404.html (GitHub Pages
// serves it for unknown addresses, and the app then shows the right page), sitemap.xml and robots.txt.
//
// Env: SITE_URL (default https://antonyperez0.github.io/Java-Arena), BASE_PATH (default /).
import fs from "node:fs";
import path from "node:path";
import { marked } from "marked";
import { assetExample, assetFigureHtml } from "../src/grader/assets.ts";
import { FILE_MARK, splitFiles } from "../src/grader/files.js";
import { windowExample } from "../src/grader/window.ts";
import { windowFigureHtml } from "../src/components/window-drawing.ts";
import { readOnlyBlockHtml } from "../src/components/code-blocks.ts";
import { withoutClassDiagrams } from "./content/class-diagram.mjs";
import { RECORD_NOTICE } from "../src/lib/record.ts";
import { PRO_GUIDE_HTML, PRO_HONEST, PRO_LEAD } from "../src/lib/pro-guide.ts";
import { readProTrack } from "./pro-track/site.mjs";
import { JAVA_API_URL, KIND_LABEL, TOPICS_LEAD, aboutParts, matchCount, topicLetter } from "../src/lib/topics.ts";

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
// The projects (content/projects), whole, and where each one's file is (its page fetches it).
const projects = (index.projects ?? []).map((p) => ({ ...JSON.parse(fs.readFileSync(path.join(GEN, "projects", `${p.id}.json`), "utf8")), file: `${BASE}lessons/projects/${p.id}-${p.hash}.json` }));
// A lesson page fetches its step's lesson file (src/content/index.ts): start that at once, with the page.
const lessonFile = new Map(index.modules.flatMap((m) => m.steps.map((s) => [s.id, `${BASE}lessons/${m.id}/${s.slug}-${s.hash}.json`])));
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
      // A java window example's window (stored by the build): drawn, with the window as text, as the page shows it.
      const shown = lang === "window" ? windowExample(text) : null;
      if (shown) return windowFigureHtml(shown);
      const file = lang ? /^file\s+(\S+)$/.exec(lang) : null;
      if (file) return `<figure class="io io-file"><figcaption>The file ${esc(file[1])}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      // An image of content/assets (stored by the build): drawn with its name and size, as the page shows it.
      const asset = lang && /^asset\s/.test(lang) ? assetExample(text) : null;
      if (asset) return assetFigureHtml(asset.name, asset.image, BASE);
      if (lang === "java" && new RegExp(FILE_MARK.source, "m").test(text))
        return splitFiles(text).map((f) => `<figure class="code-file"><figcaption>${esc(f.path)}</figcaption><pre class="code-java"><code>${esc(f.text.replace(/\n$/, ""))}</code></pre></figure>\n`).join("");
      if (lang === "input" && /\n$/.test(text))
        return `<figure class="io io-input"><figcaption>Input</figcaption><pre><code>${esc(text.replace(/\n$/, ""))}\n<span class="input-empty">(an empty line)</span></code></pre></figure>\n`;
      // Code to read in another language and commands for your own computer, as the page shows them.
      const other = readOnlyBlockHtml(lang, text);
      if (other) return other;
      if (lang && LABELS[lang]) return `<figure class="io io-${lang}"><figcaption>${LABELS[lang]}</figcaption><pre><code>${esc(text)}</code></pre></figure>\n`;
      return `<pre${lang === "java" ? ' class="code-java"' : ""}><code>${esc(text)}</code></pre>\n`;
    },
    codespan({ text }) {
      return `<code>${text.replace(/-&gt;/g, '<span class="nw">-&gt;</span>')}</code>`;
    },
  },
});
/** Markdown whose shallowest heading becomes <h{top}>, so the outline has no gaps. */
function md(s, top = 2) {
  // Code blocks and tables can scroll sideways, so they take the keyboard focus (as in src/components/Markdown.tsx).
  const html = marked.parse(s, { async: false }).replace(/<(pre|table)([ >])/g, '<$1 tabindex="0"$2');
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (!levels.length) return html;
  const shift = top - Math.min(...levels);
  return html.replace(/<(\/?)h([1-6])([\s>])/g, (_, slash, n, after) => `<${slash}h${Math.min(6, Math.max(1, Number(n) + shift))}${after}`);
}
/** Plain-text summary of Markdown, cut at a word boundary. Class diagrams (HTML drawn by the build) are left out. */
function summary(text, max = 155) {
  const plain = withoutClassDiagrams(text)
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

/** The small "Extra" label of an extra module (course: extra), as src/components/ExtraTag.tsx draws it; "" for a module of the course. */
const EXTRA_TITLE = "An extra module: not part of the University of Helsinki's MOOC";
const extraTag = (m) => (m.course === "extra" ? ` <span class="extra-tag" title="${EXTRA_TITLE}">Extra</span>` : "");
/** The course names and notes, as on the app's Learn page (src/pages/Learn.tsx). */
const COURSES = [
  ["I", "Java Programming I", "Parts 1 to 7 of the MOOC: the basics of programming, up to classes, objects and larger programs."],
  ["II", "Java Programming II", "Parts 8 to 14 of the MOOC: hash maps, inheritance, interfaces, streams, exceptions, generics, and graphical programs."],
  ["extra", "Extra modules", "Newer Java features and topics the MOOC doesn't cover. Optional, for after the course."],
];

function credit(m) {
  // An extra module never gets a MOOC section line, whatever course.yaml says (the content build refuses one anyway).
  if (m.course === "extra" || !m.mooc?.length) return `<p>An extra module, not part of the University of Helsinki's course. Lesson text: <a href="${LICENSE}">CC BY-NC-SA 4.0</a>.</p>`;
  const secs = m.mooc.map((s) => `<a href="${MOOC}${s.path}">${esc(s.section)} ${esc(s.title)}</a>`).join(", ");
  return `<p>This module follows ${m.mooc.length > 1 ? "sections" : "section"} ${secs} of <a href="${MOOC}">Java Programming</a> by Arto Hellas, Matti Luukkainen and contributors (Agile Education Research group, University of Helsinki), licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>. The explanations and exercises here are written for Java Arena and shared under the same license. Java Arena is not affiliated with or endorsed by the University of Helsinki.</p>`;
}

const pages = [];
// Whether every planned module is written, and how many modules follow the MOOC and how many are extras.
const allLive = content.modules.length === content.plan.length;
const extraCount = content.plan.filter((m) => m.course === "extra").length;
const moocCount = content.plan.length - extraCount;
const page = (route, p) => pages.push({ route, index: true, type: "website", jsonld: null, ...p });

page("/", {
  title: `${NAME}: learn Java in your browser`,
  description: `Free, non-commercial Java lessons with the real javac 21 compiler and a Java virtual machine running in your browser. Follows the University of Helsinki's Java Programming MOOC, plus extra modules of its own.`,
  jsonld: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: NAME,
    url: SITE + "/",
  },
  body: `<h1>Learn Java by writing real Java</h1>
<p>Every exercise is compiled by the real javac 21 compiler and run by a Java virtual machine, both inside your browser, on your own device. The lessons of Java Programming I and II follow the University of Helsinki's Java Programming MOOC, with their own explanations and exercises; the extra modules after them are Java Arena's own.</p>
<p>${allLive ? `All ${content.plan.length} modules are online: ${moocCount} following the MOOC (Java Programming I and II)${extraCount ? ` and ${extraCount} extra ${extraCount === 1 ? "module" : "modules"} of Java Arena's own` : ""}, with ${stepCount} steps and ${challengeCount} challenges.` : `Java Arena is new: ${content.modules.length} of ${content.plan.length} modules are online so far (${stepCount} steps, ${challengeCount} challenges). The rest of the course is added in batches.`}</p>
<ul>${content.modules.map((m) => `<li><a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a>${extraTag(m)}</li>`).join("")}<li><a href="${link("/learn")}">All modules</a></li></ul>
<p>Practice: <a href="${link("/deathmatch")}">Deathmatch drills</a>, <a href="${link("/daily")}">the daily challenge</a> and <a href="${link("/placement")}">a placement quiz</a>.</p>
<p><a href="${link("/projects")}">Projects</a>: larger programs built over several milestones.</p>
<p><a href="${link("/pro")}">Pro Track</a>: after the course, projects to build on your own computer with a JDK 21, Maven and JUnit 5 tests.</p>`,
});

page("/learn", {
  title: `All modules | ${NAME}`,
  description: `The course plan: ${moocCount} modules following the University of Helsinki's Java Programming MOOC, parts 1 to 14${extraCount ? `, plus ${extraCount} extra ${extraCount === 1 ? "module" : "modules"} of Java Arena's own` : ""}. ${allLive ? "All of them are online." : `${content.modules.length} are online so far.`}`,
  body:
    `<h1>The course</h1><p>Java Arena follows the order and topics of the University of Helsinki's Java Programming MOOC, parts 1 to 14, with its own lessons and exercises.${allLive ? "" : " Modules that aren't written yet are listed so you can see what's coming."}</p><p><a href="${link("/projects")}">Projects</a>: larger programs built over several milestones, each after the modules it needs.</p><p><a href="${link("/pro")}">Pro Track</a>: projects for your own computer, for after the course.</p><p><a href="${link("/topics")}">Topics A to Z</a>: Java keywords, classes, methods and ideas, each with the steps that teach it.</p>` +
    COURSES.filter(([c]) => content.plan.some((m) => m.course === c))
      .map(([c, name, note]) => `<h2>${esc(name)}</h2><p>${esc(note)}</p><ol>` + content.plan.filter((m) => m.course === c).map((m) => `<li value="${m.number}">${m.live ? `<a href="${link(modulePath(m))}">${esc(m.title)}</a>` : `${esc(m.title)} (not written yet)`}${extraTag(m)}</li>`).join("") + `</ol>`)
      .join(""),
});

/** The MOOC's last module (the end of Java Programming II): its page points on to the Pro Track, as src/pages/ModulePage.tsx does. */
const COURSE_END = content.plan.filter((m) => m.course === "II").pop()?.id;
const courseEnd = (m) =>
  m.id === COURSE_END ? `<section class="card course-end"><h2 class="h3">After the course</h2><p>This is the last module of the MOOC. Next, you can go on with the extra modules, or try the Pro Track: projects for your own computer with a JDK 21, Maven and JUnit 5. <a href="${link("/pro")}">See the Pro Track</a></p></section>` : "";
for (const m of content.modules) {
  page(modulePath(m), {
    title: `Module ${m.number}: ${m.title} | ${NAME}`,
    description: summary(m.summary),
    body: `<nav aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a></nav><p class="eyebrow">Module ${m.number}${extraTag(m)}</p><h1>${esc(m.title)}</h1><p>${esc(m.summary)}</p><h2>Steps</h2><ol>${m.steps.map((s) => `<li><a href="${link(stepPath(m, s))}">${esc(s.title)}</a></li>`).join("")}</ol>${courseEnd(m)}<aside class="credit">${credit(m)}</aside>`,
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
      preload: lessonFile.get(s.id),
      // The same layout as the app's lesson page, so nothing jumps when the app takes over.
      layout: true,
      body: `<div class="step-page"><nav class="crumbs" aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › <a href="${link(modulePath(m))}">Module ${m.number}: ${esc(m.title)}</a>${extraTag(m)}</nav>
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

// ---------------------------------------------------------------- projects
const projectPath = (p) => `/projects/${p.id}/`;
/** "After module 20: Lists of objects", as src/components/AfterModule.tsx writes it. */
function afterModule(p) {
  const m = content.plan.find((x) => x.id === p.after);
  if (!m) return "";
  const name = `module ${m.number}: ${esc(m.title)}`;
  return `After ${m.live ? `<a href="${link(modulePath(m))}">${name}</a>` : name}`;
}
page("/projects", {
  title: `Projects: larger Java programs, one milestone at a time | ${NAME}`,
  description: "Larger Java programs built over several milestones, each starting from your own code of the one before. Each project comes after the modules it needs.",
  body: `<nav aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a></nav><h1>Projects</h1><p>Larger programs, built one milestone at a time. Each milestone starts from your own code of the one before it, so at the end you have one whole program that you wrote.</p>${
    projects.length ? `<ul>${projects.map((p) => `<li><a href="${link(projectPath(p))}">${esc(p.title)}</a> (${afterModule(p)}): ${esc(p.summary)}</li>`).join("")}</ul>` : "<p>No projects yet. They're on their way.</p>"
  }`,
});
for (const p of projects) {
  page(projectPath(p), {
    title: `${p.title} · Projects | ${NAME}`,
    description: summary(p.summary),
    type: "article",
    jsonld: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: p.title,
      description: summary(p.summary),
      learningResourceType: "Project",
      interactivityType: "active",
      isAccessibleForFree: true,
      inLanguage: "en",
      programmingLanguage: "Java",
      license: LICENSE,
      url: canonical(projectPath(p)),
    },
    preload: p.file,
    // The same layout as the app's project page, so nothing jumps when the app takes over.
    layout: true,
    body: `<div class="step-page project-page"><nav class="crumbs" aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › <a href="${link("/projects")}">Projects</a></nav>
<div class="step-grid"><article class="step-text"><div class="step-count"><span class="project-label">Project${p.after && afterModule(p) ? ` · ${afterModule(p)}` : ""}</span></div>
<h1>${esc(p.title)}</h1>
<div class="md">${md(p.intro, 2)}</div>
<h2 class="h3">Milestones</h2><ol class="milestones">${p.milestones.map((m) => `<li class="milestone">${esc(m.title)}</li>`).join("")}</ol></article>
<section class="step-work" aria-label="Milestone">${p.milestones.map((m, k) => `<section class="task-card"><div class="task-head"><h2 class="task-title">Milestone ${k + 1}: ${esc(m.title)}</h2></div><div class="md task-body">${md(m.task, 3)}</div></section>`).join("\n")}</section></div></div>`,
  });
}

// ---------------------------------------------------------------- the Pro Track
// The same text as src/pages/ProTrack.tsx and ProProject.tsx, from the same sources: the guide
// (src/lib/pro-guide.ts) and the projects (scripts/pro-track/site.mjs; the site build has checked them).
const pro = readProTrack(ROOT);
if (pro.problems.length) throw new Error(`prerender: the Pro Track has problems:\n  ${pro.problems.join("\n  ")}`);
const proPath = (p) => `/pro/${p.id}/`;
const PRO_SECTIONS = [
  ["build", "What you'll build"],
  ["need", "What you need"],
  ["steps", "Steps"],
  ["tests", "Run the tests"],
  ["run", "Run the program"],
  ["github", "Put it on GitHub (optional)"],
];
const PRO_CRUMBS = `<nav class="crumbs" aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › `;
page("/pro", {
  title: `Pro Track: Java projects for your own computer | ${NAME}`,
  description: "Projects to build on your own computer after the course, with a JDK 21, Maven and JUnit 5 tests, and GitHub Actions running the tests in your own repository if you like.",
  layout: true,
  body: `<div class="pro-page narrow">${PRO_CRUMBS}<span>Pro Track</span></nav><div class="page-head"><h1>Pro Track</h1><p class="lead">${esc(PRO_LEAD)}</p><p class="pro-honest">${esc(PRO_HONEST)}</p></div>
<section><h2>The projects</h2>${
    pro.projects.length
      ? `<ul class="project-list pro-list">${pro.projects.map((p) => `<li class="card project-card"><h3 class="h3"><a href="${link(proPath(p))}">${esc(p.title)}</a></h3><p>${esc(p.summary)}</p><p class="muted small">About ${esc(p.hours)} hours. A checklist of ${p.checklist.length} items to tick as you go.</p></li>`).join("")}</ul>`
      : `<p class="card">The projects are on their way.</p>`
  }</section>
<div class="md pro-guide">${PRO_GUIDE_HTML}</div></div>`,
});
pro.projects.forEach((p, k) => {
  const next = pro.projects[k + 1];
  const practice = (x) => {
    const m = content.plan.find((pm) => pm.id === x.module);
    const name = m ? `module ${m.number}: ${esc(m.title)}` : esc(x.module);
    return `<li>${esc(x.what)} (from ${m?.live ? `<a href="${link(modulePath(m))}">${name}</a>` : name})</li>`;
  };
  page(proPath(p), {
    title: `${p.title} · Pro Track | ${NAME}`,
    description: summary(p.summary),
    type: "article",
    jsonld: {
      "@context": "https://schema.org",
      "@type": "LearningResource",
      name: p.title,
      description: summary(p.summary),
      learningResourceType: "Project",
      isAccessibleForFree: true,
      inLanguage: "en",
      programmingLanguage: "Java",
      url: canonical(proPath(p)),
    },
    layout: true,
    body: `<div class="pro-page pro-project narrow">${PRO_CRUMBS}<a href="${link("/pro")}">Pro Track</a></nav><div class="page-head"><p class="eyebrow">Pro Track project · about ${esc(p.hours)} hours</p><h1>${esc(p.title)}</h1><p class="lead">${p.summaryHtml}</p>
<p class="actions"><a class="btn btn-primary" href="${BASE}${p.zip.file}" download="${p.id}.zip">Download the project (zip, ${Math.max(1, Math.round(p.zip.bytes / 1024))} KB)</a> <a class="btn" href="${p.folder}">The folder on GitHub</a> <a class="btn" href="#checklist">Your checklist (0 of ${p.checklist.length} ticked)</a></p>
<p class="muted small">Unzip it on your computer and open its README.md. The zip isn't saved for offline use, so downloading it needs a connection. New to Maven? The <a href="${link("/pro")}">Pro Track page</a> shows how to set up your computer.</p></div>
<section><h2>What it practices</h2><ul class="pro-practices">${p.practices.map(practice).join("")}</ul></section>
${PRO_SECTIONS.filter(([key]) => p.sections[key])
  .map(([key, heading]) => `<section><h2>${esc(heading)}</h2><div class="md">${p.sections[key]}</div></section>`)
  .join("\n")}
<section class="card pro-checklist"><h2 id="checklist" class="h3">Your checklist</h2><ul class="pro-items">${p.checklist.map((c) => `<li><span>${c.html}</span></li>`).join("")}</ul></section>
<nav class="step-nav pro-nav" aria-label="Pro Track"><a href="${link("/pro")}">All Pro Track projects</a>${next ? `<a href="${link(proPath(next))}">Next: ${esc(next.title)}</a>` : ""}</nav></div>`,
  });
});

// The topics reference (content/topics.yaml, checked by the content build): every entry, A to Z, as
// src/pages/Topics.tsx shows it before anything is typed in its search box.
const topics = fs.existsSync(path.join(GEN, "topics.json")) ? JSON.parse(fs.readFileSync(path.join(GEN, "topics.json"), "utf8")) : [];
const moduleNumber = new Map(index.modules.map((m) => [m.id, m.number]));
const letterId = (l) => `letter-${l === "#" ? "symbols" : l}`;
const topicGroups = [];
for (const t of topics) {
  const l = topicLetter(t.term);
  if (topicGroups.at(-1)?.[0] === l) topicGroups.at(-1)[1].push(t);
  else topicGroups.push([l, [t]]);
}
const topicHtml = (t) =>
  `<li id="${esc(t.id)}" class="topic"><div class="topic-head"><h3 class="topic-term">${t.kind === "idea" || t.kind === "tool" ? esc(t.term) : `<code>${esc(t.term)}</code>`}</h3><span class="topic-kind">${KIND_LABEL[t.kind]}</span></div><p class="topic-about">${aboutParts(t.about)
    .map((x, i) => (i % 2 ? `<code>${esc(x)}</code>` : esc(x)))
    .join("")}</p><ul class="topic-links" aria-label="Where to learn ${esc(t.term)}">${t.steps
    .map((s) => `<li><a href="${link(stepPath({ id: s.module }, s))}">${esc(s.title)}</a> <span class="muted">(module ${moduleNumber.get(s.module)}, ${esc(s.moduleTitle)})</span></li>`)
    .join("")}${t.drills ? `<li><a href="${link("/deathmatch")}?topic=${encodeURIComponent(t.drills.topic)}">Drills in Deathmatch</a> <span class="muted">(topic: ${esc(t.drills.title)})</span></li>` : ""}</ul></li>`;
if (topics.length)
  page("/topics", {
    title: `Java topics A to Z | ${NAME}`,
    description: `${topics.length} Java keywords, classes, methods and ideas, A to Z, each in one plain line with links to the Java Arena lessons that teach it.`,
    layout: true,
    body: `<div class="topics-page narrow"><nav class="crumbs" aria-label="Breadcrumb"><a href="${link("/learn")}">Learn</a> › <span>Topics A to Z</span></nav><div class="page-head"><h1>Topics A to Z</h1><p class="lead">${esc(TOPICS_LEAD)} <a href="${JAVA_API_URL}">Java 21's API documentation</a>.</p></div>
<div class="topics-search" role="search"><label for="topics-q">Search the topics</label><input id="topics-q" type="search" autocomplete="off" spellcheck="false" aria-describedby="topics-count"><p id="topics-count" class="muted small" role="status">${esc(matchCount(topics.length, topics.length, ""))}</p></div>
<nav class="topics-letters" aria-label="Letters"><ul>${topicGroups.map(([l]) => `<li><a href="#${letterId(l)}"${l === "#" ? ' aria-label="Operators and symbols"' : ""}>${esc(l)}</a></li>`).join("")}</ul></nav>
${topicGroups.map(([l, list]) => `<section aria-labelledby="${letterId(l)}"><h2 id="${letterId(l)}" class="topics-letter">${l === "#" ? "Operators and symbols" : l}</h2><ul class="topic-list">${list.map(topicHtml).join("")}</ul></section>`).join("\n")}</div>`,
  });
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
  body: `<div class="lobby practice-page"><div class="page-head"><h1>Deathmatch</h1><p class="muted">Endless quick reps from the lessons you've finished: predict the output, fill the blank, spot the bug, will it compile, pick one. Every 8th rep is a boss rep, a small program you write and run for real. Drills you miss come back more often until you know them.</p><p class="muted small">Stuck on a keyword or a method? <a href="${link("/topics")}">Topics A to Z</a> says what it is in one line and links to the step that teaches it.</p></div></div>`,
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
  body: `<div class="narrow"><div class="page-head"><h1>Placement quiz</h1><p>Already know some Java? Answer a few quick questions, one for each module${allLive ? "" : " written so far"}. The first one you miss shows where to start, and you can skip the modules before it.</p></div></div>`,
});

page("/settings", { title: `Settings | ${NAME}`, description: "Theme, text size, the Java engine download, and your progress on this device: move it to another device with a transfer link, a QR code or a progress file.", body: `<h1>Settings</h1><p>Theme, text size, the Java engine download, and your progress. Everything here is saved in this browser only; a transfer link, a QR code or a progress file moves your progress to another device.</p>` });
// Where a transfer link opens (/transfer/#p=...): the link is read in the browser, so the page is
// the same for every link. Not for search engines (noindex, not in the sitemap), but saved for offline use.
page("/transfer", {
  title: `Move your progress | ${NAME}`,
  description: "Bring your Java Arena progress to this device from a transfer link or a progress file.",
  index: false,
  layout: true,
  body: `<div class="narrow transfer-page"><div class="page-head"><h1>Move your progress</h1><p class="muted">A transfer link from Settings opens this page on the device you're moving to. Your progress comes in only when you choose Merge or Replace.</p></div></div>`,
});
// The record page (/record/) is worked out in the browser from its saved progress, so the page is the
// same for everyone. Not for search engines (noindex, not in the sitemap), but saved for offline use.
page("/record", {
  title: `Your record | ${NAME}`,
  description: "A personal record of the Java Arena modules and projects you finished, from the progress saved in this browser. Print it or save it as a PDF.",
  index: false,
  layout: true,
  body: `<div class="narrow record-page"><div class="page-head record-screen"><h1>Your record</h1><p class="muted">What you finished in Java Arena, from the progress saved in this browser. Print it or save it as a PDF to keep it.</p></div><p class="record-notice">${esc(RECORD_NOTICE)}</p></div>`,
});
page("/about", {
  title: `About and credits | ${NAME}`,
  description: "What Java Arena is, the University of Helsinki course it follows, how the in-browser Java engine works, privacy and licenses.",
  body: `<h1>About and credits</h1><p>Java Arena is a free, non-commercial site for learning Java, with real compiling and running in the browser. The modules of Java Programming I and II follow the order and topics of <a href="${MOOC}">Java Programming</a>, a free course by the University of Helsinki licensed under <a href="${LICENSE}">CC BY-NC-SA 4.0</a>; the extra modules after them are Java Arena's own and not part of the MOOC. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle.</p>`,
});

// ---------------------------------------------------------------- write
// The header and footer as the app draws them (src/App.tsx), so the page doesn't shift when it starts.
const MARK = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#0D6EB5"></rect><path d="M2.34 29.66A8 8 0 0 1 0 24V8A8 8 0 0 1 8 0H24A8 8 0 0 1 29.66 2.34Z" fill="#E11D21"></path><path d="M11.5 8.8H21.5M18.6 8.8V18.4c0 3-1.7 4.8-4.4 4.8-1.9 0-3.2-.9-3.9-2.5" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>`;
const BRAND = `<a href="${link("/")}" class="brand" aria-label="Java Arena home">${MARK}<span class="brand-name">Java <b>Arena</b></span></a>`;
const HEADER = `<header class="topbar">${BRAND}<nav id="main-nav" class="nav" aria-label="Main"><a href="${link("/learn")}">Learn</a><a href="${link("/deathmatch")}">Deathmatch</a><a href="${link("/daily")}">Daily</a><a href="${link("/playground")}">Playground</a><a href="${link("/settings")}">Settings</a><a href="${link("/about")}">About</a></nav><div class="topbar-right"><a href="${link("/learn")}" class="btn btn-primary btn-sm topbar-cta">Start learning</a></div></header>`;
const REPO = "https://github.com/AntonyPerez0/Java-Arena";
const FOOTER = `<footer class="footer"><div class="footer-inner"><div class="footer-grid"><div class="footer-brand">${BRAND}<p>Learn Java with the real compiler, running in your browser. Free and non-commercial.</p></div><div class="footer-col"><h2>Learn</h2><ul><li><a href="${link("/learn")}">All modules</a></li><li><a href="${link("/learn/printing")}">Start with module 1</a></li><li><a href="${link("/projects")}">Projects</a></li><li><a href="${link("/pro")}">Pro Track</a></li><li><a href="${link("/topics")}">Topics A to Z</a></li><li><a href="${link("/playground")}">Playground</a></li></ul></div><div class="footer-col"><h2>Practice</h2><ul><li><a href="${link("/deathmatch")}">Deathmatch</a></li><li><a href="${link("/daily")}">Daily challenge</a></li><li><a href="${link("/placement")}">Placement quiz</a></li></ul></div><div class="footer-col"><h2>Site</h2><ul><li><a href="${link("/settings")}">Settings</a></li><li><a href="${link("/about")}">About and credits</a></li><li><a href="${REPO}">Source on GitHub</a></li><li><a href="${REPO}/issues/new">Report a problem</a></li></ul></div></div><div class="footer-bottom"><p>The course's lessons follow the order and topics of <a href="${MOOC}">Java Programming</a> by the University of Helsinki, licensed under <a href="${LICENSE}" rel="license">CC BY-NC-SA 4.0</a>; the extra modules after the course are Java Arena's own. Java Arena's lessons are shared under the same license; the site's code is MIT licensed. Java Arena is not affiliated with or endorsed by the University of Helsinki, MOOC.fi or Oracle. Java is a registered trademark of Oracle and/or its affiliates.</p><p>Your progress stays in this browser. No account, no ads, no tracking.</p></div></div></footer>`;
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
    ...(p.preload ? [`<link rel="preload" href="${p.preload}" as="fetch" crossorigin>`] : []),
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
