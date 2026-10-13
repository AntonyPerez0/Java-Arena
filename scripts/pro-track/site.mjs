// What the site shows of the Pro Track (/pro/ and /pro/<id>/): content/pro-track.yaml (the order,
// how long each takes, what it practices and the checklist) together with each project's README.md
// (the title, the summary and the sections the page shows, as HTML) and the size of its zip. Read
// by the site build (scripts/pro-track/vite-plugin.mjs for the app, scripts/prerender.mjs for the
// pre-rendered pages) and the unit tests; plain data in and out, from the source files only.
import fs from "node:fs";
import path from "node:path";
import { Marked } from "marked";
import YAML from "yaml";
import { readOnlyBlockHtml } from "../../src/components/code-blocks.ts";
import { ID, projectIds, readReadme, zipProject } from "./project.mjs";

/** The repository, for the links to each project's folder (src/lib/site.ts has the same). */
export const REPO_URL = "https://github.com/AntonyPerez0/Java-Arena";
/** The same repository's raw files, for images in a project's README. */
export const RAW_URL = "https://raw.githubusercontent.com/AntonyPerez0/Java-Arena";
/** The README sections the project page shows, by heading, with the key the page uses. */
export const SHOWN = { "What you'll build": "build", "What you need": "need", Steps: "steps", "Run the tests": "tests", "Run the program": "run", "Put it on GitHub (optional)": "github" };
/** How many checklist items a project may have. */
export const CHECKLIST = { min: 3, max: 15 };

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The course plan from content/course.yaml: each module's id, number and title. */
export function readPlan(root) {
  const course = YAML.parse(fs.readFileSync(path.join(root, "content", "course.yaml"), "utf8"));
  return course.modules.map((m, i) => ({ id: m.id, number: i + 1, title: m.title }));
}

/** A heading's anchor on GitHub ("Put it on GitHub (optional)" is #put-it-on-github-optional). */
export const githubSlug = (heading) => heading.trim().toLowerCase().replace(/[^\p{L}\p{N}\s_-]/gu, "").replace(/\s/g, "-");
/** The README's anchors that have a target on the project's page: the six sections it shows. */
export const ANCHORS = Object.fromEntries(Object.entries(SHOWN).map(([heading, key]) => [`#${githubSlug(heading)}`, `#pro-${key}-h`]));

/**
 * One Marked for a project's Markdown (its README's sections and summary, its checklist items), so
 * every link is rewritten the same way: relative links (to the project's own files, relative to its
 * folder) go to the file on GitHub, relative images to the file's raw bytes on GitHub, and anchors
 * of the six shown sections to the page's sections. Any other anchor has no target on the page:
 * it is added to `dead` (the build refuses it).
 */
function projectMarked(id, dead) {
  const md = new Marked({ gfm: true, breaks: false });
  md.use({
    renderer: {
      // Command-line options (--min-length, -h) never break at their hyphens: on a phone, "--min-"
      // and "length" on two lines read as two things. (The text comes escaped.)
      codespan({ text }) {
        return `<code>${text.replace(/(^|\s)(-[^\s]*[^\s,])/g, '$1<span class="nw">$2</span>')}</code>`;
      },
      code({ text: code, lang }) {
        const other = readOnlyBlockHtml(lang, code);
        if (other) return other;
        return `<pre${lang === "java" ? ' class="code-java"' : ""}><code>${esc(code.replace(/\n$/, ""))}</code></pre>\n`;
      },
    },
    walkTokens(t) {
      if (t.type !== "link" && t.type !== "image") return;
      const href = String(t.href ?? "");
      if (href.startsWith("#")) {
        if (t.type === "link" && ANCHORS[href.toLowerCase()]) t.href = ANCHORS[href.toLowerCase()];
        else dead.push(href);
        return;
      }
      if (/^[a-z][a-z0-9+.-]*:|^\/\//i.test(href)) return;
      const file = href.replace(/^\.\//, "");
      t.href = t.type === "image" ? `${RAW_URL}/main/pro-track/${id}/${file}` : `${REPO_URL}/blob/main/pro-track/${id}/${file}`;
    },
  });
  return md;
}

/**
 * Markdown as the project page shows it: code blocks as the lessons show code to read (shell
 * commands, XML), Java as plain code, headings one level under `top`, links as projectMarked
 * rewrites them, and code blocks and tables reachable with the keyboard. Anchors with no target on
 * the page are added to `dead`.
 */
export function markdownHtml(text, id, top = 3, dead = []) {
  const html = projectMarked(id, dead).parse(text, { async: false }).replace(/<(pre|table)([ >])/g, '<$1 tabindex="0"$2');
  const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
  if (!levels.length) return html;
  const shift = top - Math.min(...levels);
  return html.replace(/<(\/?)h([1-6])([\s>])/g, (_, slash, n, after) => `<${slash}h${Math.min(6, Math.max(1, Number(n) + shift))}${after}`);
}

/** One line of a project's Markdown (a checklist item, the summary) as inline HTML, its links as in markdownHtml. */
export const inlineHtml = (text, id, dead = []) => projectMarked(id, dead).parseInline(text, { async: false });
/** One line of Markdown as plain text (for descriptions and screen-reader-free places); images are left out. */
export const plainText = (text) =>
  text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*|__|\*|_/g, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * The Pro Track as the site shows it, with the problems found (an empty list when it's right):
 * content/pro-track.yaml must list every project folder once, each with `hours`, `practices`
 * (modules of content/course.yaml) and a `checklist` of items with ids of their own.
 */
export function readProTrack(root, { zips = true } = {}) {
  const problems = [];
  const file = path.join(root, "content", "pro-track.yaml");
  const where = "content/pro-track.yaml";
  const data = fs.existsSync(file) ? YAML.parse(fs.readFileSync(file, "utf8")) : { projects: [] };
  const plan = readPlan(root);
  const modules = new Set(plan.map((m) => m.id));
  const listed = Array.isArray(data?.projects) ? data.projects : (problems.push(`${where}: needs a list "projects:" (it may be empty: projects: [])`), []);
  const folders = projectIds(root);
  const seen = new Set();
  const projects = [];
  for (const [k, p] of listed.entries()) {
    const at = `${where}, project ${k + 1}${typeof p?.id === "string" ? ` (${p.id})` : ""}`;
    const say = (m) => problems.push(`${at}: ${m}`);
    const known = ["id", "hours", "practices", "checklist"];
    for (const key of Object.keys(p ?? {})) if (!known.includes(key)) say(`unknown key "${key}" (a project has ${known.join(", ")}; its title and summary come from its README.md)`);
    if (typeof p?.id !== "string" || !ID.test(p.id)) {
      say("needs an id: the name of its folder in pro-track/, in kebab-case");
      continue;
    }
    if (seen.has(p.id)) say("is listed twice");
    seen.add(p.id);
    if (!folders.includes(p.id)) {
      say(`there's no pro-track/${p.id}/ with a pom.xml`);
      continue;
    }
    if (typeof p.hours !== "string" || !/^\d+ to \d+$/.test(p.hours)) say('needs hours: about how long it takes, as "2 to 4" (hours)');
    const practices = Array.isArray(p.practices) ? p.practices : [];
    if (!practices.length) say("needs practices: what it practices, each with the module that teaches it (module: an id from content/course.yaml, what: a few words)");
    for (const x of practices) {
      if (!modules.has(x?.module)) say(`practices: "${x?.module}" isn't a module id of content/course.yaml`);
      if (typeof x?.what !== "string" || !x.what.trim()) say(`practices: the one for ${x?.module} needs "what": what it practices, in a few words`);
    }
    const checklist = Array.isArray(p.checklist) ? p.checklist : [];
    if (checklist.length < CHECKLIST.min || checklist.length > CHECKLIST.max) say(`needs a checklist of ${CHECKLIST.min} to ${CHECKLIST.max} items (it has ${checklist.length})`);
    const ids = new Set();
    for (const c of checklist) {
      if (typeof c?.id !== "string" || !ID.test(c.id)) say(`checklist: every item needs an id in kebab-case (saved in the learner's progress: never change or reuse one)`);
      else if (ids.has(c.id)) say(`checklist: the id ${c.id} is used twice`);
      else ids.add(c.id);
      if (typeof c?.text !== "string" || !c.text.trim()) say(`checklist: the item ${c?.id} needs a text`);
    }
    const readme = readReadme(fs.readFileSync(path.join(root, "pro-track", p.id, "README.md"), "utf8"));
    const sections = {};
    const dead = [];
    for (const [heading, key] of Object.entries(SHOWN)) {
      const s = readme.sections.find((x) => x.heading === heading);
      sections[key] = s ? markdownHtml(s.body, p.id, 3, dead) : "";
    }
    const summaryHtml = inlineHtml(readme.summary, p.id, dead);
    const items = checklist.map((c) => ({ id: String(c.id), text: plainText(String(c.text ?? "")), html: inlineHtml(String(c.text ?? ""), p.id, dead) }));
    for (const href of new Set(dead))
      say(`the link ${href} (in pro-track/${p.id}/README.md or the checklist) has no target on the project's page: link only to the sections it shows (${Object.keys(ANCHORS).join(", ")}), or use a full address`);
    const zip = zips ? zipProject(root, p.id) : null;
    projects.push({
      id: p.id,
      title: readme.title ?? p.id,
      summary: plainText(readme.summary),
      summaryHtml,
      hours: String(p.hours ?? ""),
      practices: practices.map((x) => ({ module: x.module, what: String(x.what ?? "") })),
      checklist: items,
      sections,
      zip: { file: `pro/${p.id}.zip`, bytes: zip ? zip.length : 0 },
      folder: `${REPO_URL}/tree/main/pro-track/${p.id}`,
    });
  }
  for (const id of folders) if (!seen.has(id)) problems.push(`${where}: pro-track/${id}/ isn't listed (every project folder is listed once, in the order the site shows them)`);
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  if (/[\u2013\u2014]/.test(text)) problems.push(`${where} has an en or em dash`);
  return { projects, problems, plan };
}

/** What the app's main bundle needs of each project (the list and the record page): no page sections. */
export const indexOf = (projects) => projects.map((p) => ({ id: p.id, title: p.title, summary: p.summary, hours: p.hours, checklist: p.checklist.map(({ id, text }) => ({ id, text })) }));
