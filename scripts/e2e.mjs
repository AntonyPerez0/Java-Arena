// End-to-end tests in headless Chromium against the built site (dist/), served under BASE_PATH
// like GitHub Pages: pre-rendered pages, lessons (fill-ins, code challenges, hidden tests, rules,
// hints, solutions, progress), the engine prototype page, errors and crashes explained, endless
// loops stopped, the mobile-data question holding the download, offline use, moving progress between
// browsers (transfer links, QR codes, progress files), projects (whatever content/projects has), the
// personal record page and its print styles (a PDF printed), the Pro Track (whatever pro-track/
// has: its pages, the zips, the checklist), the topics reference (its search and links), and axe (WCAG 2.2 AA)
// on every page type in both themes and at phone widths, with the phone pass at the end: every page type
// at 320, 360, 390 and 412 px in both themes (axe, no sideways scrolling, tap targets of 24 px, a visible focus).
//
// Usage: npm run build && node scripts/e2e.mjs [--shots dir]
// E2E_ONLY=<regular expression> runs only the tests whose names match (while working on something);
// E2E_SKIP=<regular expression> leaves out the tests whose names match. CI runs the phone pass (the tests
// named "the phone pass: ...", which need nothing from the others) as a job of its own beside the rest.
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AxeBuilder from '@axe-core/playwright';
import jsQR from 'jsqr';
import { launchChromium } from './browser.mjs';
import { serve } from './serve.mjs';
import { indentProblems } from '../src/grader/style.js';
import { folderOf, joinFiles, splitFiles } from '../src/grader/files.js';
import { describeEvents, parseEventLine } from '../src/grader/window.ts';
import { readZip, zipProject } from './pro-track/project.mjs';
import { readProTrack } from './pro-track/site.mjs';

const ROOT_DIR = new URL('..', import.meta.url).pathname;

const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const requests = [];
const { server, url: BASE } = await serve({ onRequest: (p) => requests.push(p) });
// The site's base path (/ at javaarena.com, /<repo>/ on a github.io project page).
const BASE_PATH = process.env.BASE_PATH ?? '/';
const browser = await launchChromium();
const ENGINE_TIMEOUT = 180_000;

let failures = 0;
const ONLY = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY, 'i') : null;
const SKIP = process.env.E2E_SKIP ? new RegExp(process.env.E2E_SKIP, 'i') : null;
async function test(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
  if (SKIP && SKIP.test(name)) return;
  const t = Date.now();
  try {
    await fn();
    console.log(`  ok  ${name} (${((Date.now() - t) / 1000).toFixed(1)} s)`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}\n       ${String(e?.message ?? e).split('\n').slice(0, 8).join('\n       ')}`);
  }
}
const expect = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true });
}
async function axe(page, label) {
  // Colour contrast is measured on what's painted: wait for fade-ins (the pass banner's) to end.
  await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running' || a.effect?.getTiming().iterations === Infinity), null, { timeout: 5000 });
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(r.violations.length === 0, `${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target} ${v.nodes[0]?.any?.[0]?.message ?? ''}`).join('; ')}`);
}
async function noOverflow(page, label) {
  // clientWidth, not innerWidth: with phone emulation innerWidth grows along with a too-wide page.
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  expect(w[0] <= w[1], `${label}: page is ${w[0]} px wide in a ${w[1]} px window`);
}
/** No drill code box (a rep's or a review card's, a bug drill's lines, a boss task's code) scrolls sideways, and no blank sticks out of its box. */
async function codeFits(page, label) {
  const boxes = await page.locator('.rep pre, .rep .buglines, .rep .bugline, .death pre').evaluateAll((els) =>
    els.map((e) => {
      const pre = e.closest('pre');
      const blanks = [...e.querySelectorAll('input.blank')].map((b) => b.getBoundingClientRect().right - (e.getBoundingClientRect().right - parseFloat(getComputedStyle(e).paddingRight)));
      return { box: `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`, wide: e.scrollWidth > e.clientWidth + 1, blankOut: pre === e && blanks.some((d) => d > 1) };
    }),
  );
  const bad = boxes.filter((b) => b.wide || b.blankOut);
  expect(bad.length === 0, `${label}: drill code scrolls sideways: ${JSON.stringify(bad)}`);
}
/** Where each row of a line of drill code starts (its indentation left out), top row first. */
const lineRows = (line) =>
  line.evaluate((el) => {
    const rows = new Map();
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.parentElement.closest('.ind') || !n.data.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const x of r.getClientRects()) if (x.width > 0) rows.set(Math.round(x.top), { left: Math.min(rows.get(Math.round(x.top))?.left ?? Infinity, x.left), right: Math.max(rows.get(Math.round(x.top))?.right ?? -Infinity, x.right), top: x.top, bottom: x.bottom });
    }
    return [...rows.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row);
  });
/** Each window frame on the page: whether its windows are wider than it, and whether its note says so (visible). */
async function frames(page) {
  return page.locator('.fx-frame').evaluateAll((els) =>
    els.map((f) => {
      const s = f.querySelector(':scope > .fx-scroll');
      const note = f.querySelector(':scope > .fx-wide-note');
      return { wide: s.scrollWidth > s.clientWidth + 1, noted: !!note && getComputedStyle(note).display !== 'none' && note.getBoundingClientRect().height > 0, data: f.hasAttribute('data-wide'), end: f.hasAttribute('data-end') };
    }),
  );
}
/** No window as text scrolls sideways: its long lines wrap. */
async function outlinesWrap(page, label) {
  const boxes = await page.locator('details.fx-astext[open] pre').evaluateAll((els) => els.map((e) => [e.scrollWidth, e.clientWidth, e.scrollHeight, e.clientHeight]));
  expect(boxes.length > 0 && boxes.every(([sw, cw, sh, ch]) => sw <= cw + 1 && sh <= ch + 1), `${label}: a window as text scrolls: ${JSON.stringify(boxes)}`);
}
async function newPage(opts = {}) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 }, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { ctx, page, errors };
}
async function waitReady(page) {
  await page.locator('#engine .ok').waitFor({ timeout: ENGINE_TIMEOUT });
}
async function runExample(page, name, stdin) {
  await page.selectOption('#example', { label: name });
  if (stdin !== undefined) await page.fill('#stdin', stdin);
  await page.click('#run');
  await page.locator('#run:not([aria-busy])').waitFor({ timeout: 120_000 });
  return page.locator('#result').innerText();
}

// Lesson helpers. The workbench counts finished checks in data-checks.
async function lessonReady(page) {
  await page.locator('.pill-ready').waitFor({ timeout: ENGINE_TIMEOUT });
}
async function check(page) {
  const wb = page.locator('.workbench');
  const before = Number(await wb.getAttribute('data-checks'));
  await page.click('#check');
  await page.waitForFunction((n) => Number(document.querySelector('.workbench')?.getAttribute('data-checks')) > n, before, { timeout: 120_000 });
  return page.locator('.workbench').innerText();
}
async function setCode(page, text) {
  await page.click('.cm-content');
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(text);
}
// The whole text of the (first) editor: CodeMirror only draws the lines in view, so the `.cm-line`
// nodes can hold part of a long program. src/components/CodeEditor.tsx gives the editor this hook.
const editorText = (page) => page.evaluate(() => document.querySelector('.cm-editor').javaArenaText());
const MAIN = (body) => `public class Main {\n    public static void main(String[] args) {\n${body}\n    }\n}\n`;

console.log('Pages');
const PRERENDERED = {
  '': 'Learn Java by writing real Java',
  'learn/': 'The course',
  'learn/printing/': 'Printing',
  'learn/printing/first-program/': 'Your first Java program',
  'learn/reading-input/several-inputs/': 'Several inputs in order',
  'playground/': 'Playground',
  'deathmatch/': 'Deathmatch',
  'daily/': 'Daily challenge',
  'placement/': 'Placement quiz',
  'settings/': 'Settings',
  'about/': 'About and credits',
  'transfer/': 'Move your progress',
  'projects/': 'Projects',
  'pro/': 'Pro Track',
  'topics/': 'Topics A to Z',
};
await test('every page is pre-rendered with its own title, description, canonical link and text', async () => {
  for (const [path, h1] of Object.entries(PRERENDERED)) {
    const res = await fetch(BASE + path);
    expect(res.status === 200, `${path}: HTTP ${res.status}`);
    const html = await res.text();
    expect(html.includes(`<h1>${h1}</h1>`), `${path}: pre-rendered h1 "${h1}"`);
    expect(/<title>[^<]*Java Arena[^<]*<\/title>/.test(html), `${path}: title`);
    expect(/<meta name="description" content="[^"]{40,}"/.test(html), `${path}: description`);
    expect(html.includes('<link rel="canonical" href="https://'), `${path}: canonical`);
    expect(html.includes('CC BY-NC-SA 4.0') && html.includes('not affiliated'), `${path}: credit and non-affiliation line`);
  }
  const lesson = await (await fetch(BASE + 'learn/printing/first-program/')).text();
  expect(lesson.includes('Getting started with programming') && lesson.includes('https://java-programming.mooc.fi/part-1/2-printing'), 'lesson page credits its MOOC sections');
  expect(lesson.includes('"@type":"LearningResource"'), 'structured data');
  const missing = await fetch(BASE + 'learn/no-such-module/');
  expect(missing.status === 404 && (await missing.text()).includes('noindex'), '404 page, not indexed');
});
await test('sitemap and robots', async () => {
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  expect(sitemap.includes('/bench/</loc>'), 'sitemap lists the prototype page');
  expect(sitemap.includes('/learn/reading-input/joining-strings/</loc>'), 'sitemap lists lesson steps');
  expect(!sitemap.includes('404'), 'no 404 page in the sitemap');
  expect(!sitemap.includes('/transfer/'), 'no transfer page in the sitemap');
  expect((await (await fetch(BASE + 'transfer/')).text()).includes('<meta name="robots" content="noindex">'), 'the transfer page is not indexed');
  const robots = await (await fetch(BASE + 'robots.txt')).text();
  expect(robots.includes('Sitemap:'), 'robots.txt points to the sitemap');
});
await test('home page: the app starts, credits in the footer, no errors', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE);
  await page.locator('.hero h1').waitFor();
  expect((await page.title()).includes('Java Arena'), 'title');
  expect((await page.locator('html').getAttribute('lang')) === 'en', 'lang');
  const footer = await page.locator('footer').innerText();
  expect(footer.includes('CC BY-NC-SA 4.0') && footer.includes('not affiliated') && footer.includes('trademark of Oracle'), 'credits in the footer');
  const status = await page.locator('.status-card').innerText();
  expect(/All 59 modules are online: 54 following the MOOC \(Java Programming I and II\) and 5 extra modules of Java Arena's own/.test(status), status);
  expect(!/so far|added in batches|Being built/.test(status), 'the finished course is not called unfinished: ' + status);
  await page.click('text=See all modules');
  await page.locator('h1', { hasText: 'The course' }).waitFor();
  expect((await page.evaluate(() => document.activeElement?.tagName)) === 'H1', 'focus moved to the new page heading');
  // Every planned module is written: neither the course page nor the pre-rendered pages call the course unfinished.
  const learnHead = await page.locator('.page-head').innerText();
  expect(!/written yet|being built/.test(learnHead), learnHead);
  for (const path of ['', 'learn/', 'placement/']) {
    const html = (await (await fetch(BASE + path)).text()).replace(/<script[\s\S]*?<\/script>/g, '');
    expect(!/so far|added in batches|written yet|later updates/.test(html), `${path || 'home'}: pre-rendered text calls the course unfinished`);
  }
  const learnHtml = await (await fetch(BASE + 'learn/')).text();
  expect(learnHtml.includes("54 modules following the University of Helsinki's Java Programming MOOC, parts 1 to 14, plus 5 extra modules of Java Arena's own. All of them are online."), 'the /learn description counts the MOOC modules and the extras apart');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('an unknown address shows "Page not found"', async () => {
  const { ctx, page } = await newPage();
  await page.goto(BASE + 'learn/printing/no-such-step');
  await page.locator('h1', { hasText: 'Page not found' }).waitFor();
  await ctx.close();
});

await test('extra modules: an "Extra" label where the module number shows (course page, module page, lesson header, placement quiz, pre-rendered pages), never a MOOC section line, and nothing says they are part of the MOOC', async () => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  const extras = course.plan.filter((m) => m.course === 'extra');
  const inCourse = course.plan.filter((m) => m.course !== 'extra');
  expect(extras.length > 0, 'the plan lists extra modules');
  expect(Math.min(...extras.map((m) => m.number)) > Math.max(...inCourse.map((m) => m.number)), 'the extras come after the course');
  expect(extras.every((m) => m.part == null && !m.mooc.length), 'an extra module has no MOOC part or sections');
  const moocSection = /java-programming\.mooc\.fi\/part-/;
  const notPart = "not part of the University of Helsinki's course";
  const { ctx, page, errors } = await newPage();

  // The course page: the extras' own section, each with the label (written or not); no module of the course has it.
  await page.goto(BASE + 'learn/');
  await page.locator('.module-live').first().waitFor();
  const section = page.locator('section.phase', { has: page.locator('h2', { hasText: 'Extra modules' }) });
  expect((await section.innerText()).includes("the MOOC doesn't cover"), 'the extras section says the MOOC does not cover them');
  expect((await section.locator('li.module').count()) === extras.length, 'every extra module is in the extras section');
  expect((await section.locator('li.module .extra-tag').count()) === extras.length, 'every extra module has the Extra label');
  expect((await page.locator('.learn li.module .extra-tag').count()) === extras.length, 'only the extra modules have the Extra label');
  for (const m of extras) expect((await section.locator('li.module', { hasText: m.title }).locator('.extra-tag').innerText()).trim().toLowerCase() === 'extra', `${m.title}: the label reads Extra`);
  await shot(page, 'extra-modules-course-page');

  // The pre-rendered course page: the extras under their own heading, each labelled.
  const learnHtml = await (await fetch(BASE + 'learn/')).text();
  expect(learnHtml.includes('<h2>Extra modules</h2>'), 'pre-rendered course page: the extras heading');
  expect((learnHtml.match(/class="extra-tag"/g) ?? []).length === extras.length, 'pre-rendered course page: an Extra label per extra module, none for the course');
  const homeHtml = await (await fetch(BASE)).text();
  expect((homeHtml.match(/class="extra-tag"/g) ?? []).length === extras.filter((m) => m.live).length, 'pre-rendered home page: each written extra module in its list is labelled');
  // Its hero and description sit above that list: they say only the course's lessons follow the MOOC.
  expect(!homeHtml.includes('The lessons follow the University'), 'pre-rendered home page: no unqualified "The lessons follow" sentence');
  expect(homeHtml.includes("The lessons of Java Programming I and II follow the University of Helsinki's Java Programming MOOC") && homeHtml.includes("the extra modules after them are Java Arena's own"), 'pre-rendered home page: the hero says only the course follows the MOOC');
  for (const d of homeHtml.match(/<meta name="description" content="[^"]*"/g) ?? []) expect(!d.endsWith('MOOC."'), `pre-rendered home page: the description is qualified: ${d}`);
  await page.goto(BASE);
  const hero = page.locator('.hero-lead');
  await hero.waitFor();
  expect((await hero.innerText()).includes("the extra modules after them are Java Arena's own"), `home page: the hero says the extras are Java Arena's own: ${await hero.innerText()}`);

  // A module of the course has no label.
  await page.goto(BASE + 'learn/printing/');
  await page.locator('.module-page h1').waitFor();
  expect((await page.locator('.extra-tag').count()) === 0, 'a module of the course has no Extra label');

  // The written extra modules: the label next to the number, the "Extra modules" crumb, the credit says they are not part of the course, no MOOC section line.
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  const live = extras.filter((m) => m.live);
  if (!live.length) console.log('       (no extra module is written yet: its module and lesson pages are checked once one is)');
  for (const m of live) {
    const mod = course.modules.find((x) => x.id === m.id);
    const first = mod.steps[0];
    expect(sitemap.includes(`/learn/${m.id}/</loc>`) && sitemap.includes(`/learn/${m.id}/${first.slug}/</loc>`), `${m.id}: in the sitemap`);
    await page.goto(BASE + `learn/${m.id}/`);
    await page.locator('.module-page h1').waitFor();
    expect((await page.locator('.eyebrow').innerText()).replace(/\s+/g, ' ').trim().toLowerCase() === `module ${m.number} extra`, `${m.id}: the eyebrow is "Module ${m.number}" with the label: ${await page.locator('.eyebrow').innerText()}`);
    expect((await page.locator('.crumbs').innerText()).includes('Extra modules'), `${m.id}: the crumb names the extra modules`);
    const credit = await page.locator('aside.credit').innerText();
    expect(credit.includes("not part of the University of Helsinki's course") && !credit.includes('This module follows'), `${m.id}: credit: ${credit}`);
    expect((await page.locator('aside.credit a[href*="java-programming.mooc.fi/part-"]').count()) === 0, `${m.id}: no MOOC section link`);
    await page.goto(BASE + `learn/${m.id}/${first.slug}/`);
    await page.locator('.step-page h1').waitFor();
    expect((await page.locator('.crumbs .extra-tag').count()) === 1, `${m.id}: the lesson header has the label`);
    expect((await page.locator('aside.credit').innerText()).includes(notPart), `${m.id}: the lesson's credit says it is not part of the course`);
    expect((await page.locator('aside.credit a[href*="java-programming.mooc.fi/part-"]').count()) === 0, `${m.id}: no MOOC section link on the lesson`);
    for (const path of [`learn/${m.id}/`, `learn/${m.id}/${first.slug}/`]) {
      const html = await (await fetch(BASE + path)).text();
      expect(html.includes('class="extra-tag"'), `${path}: pre-rendered with the label`);
      expect(html.includes('An extra module, not part of') && !html.includes('This module follows'), `${path}: pre-rendered credit`);
      expect(!moocSection.test(html.replace(/<footer[\s\S]*<\/footer>/, '')), `${path}: no MOOC section link in the pre-rendered page`);
    }
  }

  // The placement quiz: a question on an extra module shows the label by its topic, and so does its line in the results.
  const questions = JSON.parse(readFileSync(new URL('../src/generated/drills.json', import.meta.url), 'utf8')).placement;
  const isExtra = (id) => extras.some((m) => m.id === id);
  await page.goto(BASE + 'placement/');
  await page.click('text=Start the quiz');
  for (let i = 0; i < questions.length; i++) {
    await page.locator('#quiz-h', { hasText: `Question ${i + 1} of ${questions.length}` }).waitFor();
    await page.locator('.rep').waitFor();
    if (isExtra(questions[i].module)) {
      const topic = page.locator('p', { hasText: 'Topic:' });
      expect((await topic.locator('.extra-tag').count()) === 1, `question ${i + 1}: the topic line has the label`);
    } else expect((await page.locator('.extra-tag').count()) === 0, `question ${i + 1}: no label on a question of the course`);
    await page.click("text=I don't know this yet");
  }
  await page.locator('text=Your starting point').waitFor();
  expect((await page.locator('.placement-results .extra-tag').count()) === questions.filter((q) => isExtra(q.module)).length, 'the results label the extra modules only');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('a lesson page downloads its own step first and the rest of the module later; other steps open at once', async () => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  const steps = course.modules.find((m) => m.id === 'printing').steps;
  const file = (s) => `/lessons/printing/${s.slug}-${s.hash}.json`;
  const lessonFiles = () => requests.filter((p) => p.includes('/lessons/'));
  const allLoaded = (page) => page.waitForFunction((n) => new Set(performance.getEntriesByType('resource').filter((e) => e.name.includes('/lessons/')).map((e) => e.name)).size >= n, steps.length);
  const { ctx, page, errors } = await newPage();
  // Records whether the "Loading the lesson" heading ever shows.
  await page.addInitScript(() => {
    window.__sawLoading = false;
    new MutationObserver(() => {
      if (document.getElementById('loading-h')) window.__sawLoading = true;
    }).observe(document, { childList: true, subtree: true });
  });
  requests.length = 0;
  await page.goto(BASE + `learn/printing/${steps[2].slug}/`);
  await page.locator('.challenge-tab').first().waitFor();
  await allLoaded(page);
  const lessons = lessonFiles();
  // The pre-rendered page asks for its lesson file at once, and the app uses that same download.
  expect(lessons[0]?.endsWith(file(steps[2])), `the step's own file first: ${lessons.join(', ')}`);
  expect(lessons.length === steps.length && new Set(lessons).size === steps.length && steps.every((s) => lessons.some((p) => p.endsWith(file(s)))), `each step of the module once: ${lessons.join(', ')}`);
  expect(!(await page.evaluate(() => window.__sawLoading)), 'no loading message on the first step');
  await page.getByRole('link', { name: 'Skip to the next step' }).click();
  await page.locator('h1:not(#loading-h)', { hasText: steps[3].title }).waitFor();
  await page.getByRole('link', { name: `Step 1: ${steps[0].title}` }).click();
  await page.locator('h1:not(#loading-h)', { hasText: steps[0].title }).waitFor();
  expect(!(await page.evaluate(() => window.__sawLoading)), 'no loading message when moving between steps');
  // The module page fetches the step its main button opens first.
  requests.length = 0;
  await page.goto(BASE + 'learn/printing/');
  await page.locator('.steplist').waitFor();
  await allLoaded(page);
  expect(lessonFiles()[0]?.endsWith(file(steps[0])), `module page: ${lessonFiles().join(', ')}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('a link focused before the app starts keeps the focus; a step that loads late gets the focus on its heading; a lesson file gone after an update says so', async () => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  const steps = course.modules.find((m) => m.id === 'printing').steps;
  const { ctx, page } = await newPage();
  // Lesson files that come only when the test lets them.
  const hold = async (s) => {
    let release;
    const held = new Promise((r) => (release = r));
    await page.route(`**/lessons/printing/${s.slug}-*.json`, async (route) => {
      await held;
      await route.continue();
    });
    return release;
  };
  // The first step's file, so the app starts only when the test lets it, and the last step's; the
  // fourth one is gone, as after a new version of the site.
  const start = await hold(steps[0]);
  const release = await hold(steps[4]);
  await page.route(`**/lessons/printing/${steps[3].slug}-*.json`, (route) => route.fulfill({ status: 404, body: 'not found' }));
  await page.goto(BASE + `learn/printing/${steps[0].slug}/`);
  // A keyboard user on the pre-rendered page: once the app has replaced it (the app's tabs are
  // buttons, the pre-rendered ones are not), the app's own link has the focus.
  const step5 = `Step 5: ${steps[4].title}`;
  await page.getByRole('link', { name: step5 }).focus();
  start();
  await page.locator('button.challenge-tab').first().waitFor();
  const kept = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  expect(kept === step5, `focus on the app's own link: ${kept}`);
  await page.keyboard.press('Enter');
  await page.locator('#loading-h').waitFor();
  release();
  await page.locator('h1:not(#loading-h)', { hasText: steps[4].title }).waitFor();
  const focused = await page.evaluate(() => [document.activeElement?.tagName, document.activeElement?.textContent]);
  expect(focused[0] === 'H1' && focused[1] === steps[4].title, `focus on the lesson heading: ${focused.join(' ')}`);
  await page.getByRole('link', { name: `Step 4: ${steps[3].title}` }).click();
  await page.getByText('Java Arena has been updated since this page was opened').waitFor();
  await ctx.close();
});

await test('the home and course pages fetch the lesson (and the lesson page) their Continue button opens', async () => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  const steps = course.modules.find((m) => m.id === 'printing').steps;
  const { ctx, page, errors } = await newPage();
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), { version: 1, steps: { [steps[0].id]: { done: true, challenges: {} } }, settings: {} });
  await page.addInitScript(() => {
    window.__sawLoading = false;
    // The lesson's own loading message, or the one shown while the lesson page's code loads.
    new MutationObserver(() => {
      if (document.getElementById('loading-h') || [...document.querySelectorAll('main p.muted')].some((p) => p.textContent === 'Loading…')) window.__sawLoading = true;
    }).observe(document, { childList: true, subtree: true });
  });
  // The step's lesson file and the lesson page's code have arrived, and the page has had time to use
  // them (two idle periods after both).
  const fetched = async (page, s) => {
    await page.waitForFunction((f) => {
      const done = performance.getEntriesByType('resource').filter((e) => e.responseEnd > 0).map((e) => e.name);
      return done.some((n) => n.endsWith(f)) && done.some((n) => /\/assets\/StepPage-[^/]*\.js$/.test(n));
    }, `/lessons/printing/${s.slug}-${s.hash}.json`);
    for (let i = 0; i < 2; i++) await page.evaluate(() => new Promise((r) => requestIdleCallback(() => r(), { timeout: 2000 })));
  };
  for (const [address, button] of [['', `Continue: ${steps[1].title}`], ['learn/', `Continue: ${steps[1].title}`]]) {
    await page.goto(BASE + address);
    await fetched(page, steps[1]);
    await page.getByRole('link', { name: button }).click();
    await page.locator('h1:not(#loading-h)', { hasText: steps[1].title }).waitFor();
    expect(!(await page.evaluate(() => window.__sawLoading)), `no loading message after Continue on /${address}`);
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

console.log('Lessons');
const lessonSession = await newPage();
{
  const { page, errors } = lessonSession;
  await test('a fill-in challenge: a wrong blank is explained, the right one passes', async () => {
    await page.goto(BASE + 'learn/printing/first-program/');
    await lessonReady(page);
    await page.fill('input.blank', 'printn');
    let out = await check(page);
    expect(out.includes("It didn't compile") && out.includes('cannot find symbol') && out.includes('There is no method with this name'), out);
    expect((await page.locator('input.blank').getAttribute('aria-invalid')) === 'true', 'the wrong blank is marked');
    await axe(page, 'lesson with a compile error');
    await page.fill('input.blank', 'println');
    out = await check(page);
    expect(out.includes('All tests passed'), out);
    expect((await page.locator('.banner-pass.big').innerText()).includes('Challenge 1 of 3 complete'), 'banner');
    await shot(page, 'lesson-desktop-pass');
  });
  await test('a launcher error (main misspelled) says the program did not start', async () => {
    await page.click('.banner-pass.big button');
    await page.waitForFunction(() => document.activeElement?.id === 'task-h', null, { timeout: 5000 });
    const blanks = page.locator('input.blank');
    await blanks.nth(0).fill('class');
    await blanks.nth(1).fill('static');
    await blanks.nth(2).fill('Main');
    const out = await check(page);
    expect(out.includes("The program didn't start") && out.includes("class Main doesn't have it"), out);
    // Java's own message is kept in a details box.
    expect((await page.locator('details.stderr').textContent()).includes('Main method not found in class Main'), 'Java prints the launcher error');
  });
  await test('hints one at a time, then the solution and "Fill the blanks for me"', async () => {
    const hint = page.locator('.btn-hint');
    await hint.click();
    expect((await page.evaluate(() => document.activeElement?.id)) === 'hint-1', 'focus moves to the new hint');
    await hint.click();
    await hint.click();
    expect((await page.locator('.hint').count()) === 3, 'three hints shown');
    expect((await page.evaluate(() => document.activeElement?.id)) === 'hint-3', 'focus on the last hint, not lost with its button');
    await page.click('text=Show solution');
    await page.locator('.solution').waitFor();
    expect((await page.evaluate(() => document.activeElement?.id)) === 'solution', 'focus moves to the solution');
    await axe(page, 'lesson with hints and solution');
    await page.click('text=Fill the blanks for me');
    const out = await check(page);
    expect(out.includes('All tests passed'), out);
  });
  await test('a code challenge: write a whole program; Ctrl+Enter checks', async () => {
    await page.click('.banner-pass.big button');
    await setCode(page, '// Write the whole program below this line.\n' + MAIN('        System.out.println("Ready, set, code!")'));
    await page.keyboard.press('Control+Enter');
    await page.waitForFunction(() => document.querySelector('.results')?.textContent?.includes("didn't compile"), null, { timeout: 120_000 });
    const out = await page.locator('.results').innerText();
    expect(out.includes("';' expected") && /line 4/i.test(out) && out.includes('semicolon'), out);
    expect((await page.locator('.cm-lint-marker-error').count()) > 0, 'the editor marks the line');
    await setCode(page, '// Write the whole program below this line.\n' + MAIN('        System.out.println("Ready, set, code!");'));
    const passed = await check(page);
    expect(passed.includes('All tests passed'), passed);
    expect((await page.locator('.banner-pass.big').innerText()).includes('Step complete'), 'the step is complete');
  });
  await test('progress is saved: after a reload the step and its challenges are done', async () => {
    await page.goto(BASE + 'learn/printing/');
    await page.locator('.steplist').waitFor();
    const first = await page.locator('.steplist li').first().innerText();
    expect(first.includes('3/3'), first);
    expect((await page.locator('.steplist li.done').count()) === 1, 'one step done');
    await page.goto(BASE + 'learn/');
    await page.locator('.module-live').first().waitFor();
    expect((await page.locator('.module-live').first().innerText()).includes('1/5'), 'course page shows 1 of 5 steps');
    await page.goto(BASE + 'learn/printing/first-program/');
    // The pre-rendered page has the challenge tabs too; the workbench only exists once the app runs.
    await page.locator('.workbench').waitFor();
    expect((await page.locator('.challenge-done').count()) === 3, 'all three challenges marked done');
    expect((await page.locator('.dot-done').count()) === 1, 'step dot done');
  });
  await test('a rule is enforced: deleting the line instead of commenting it out is not accepted', async () => {
    await page.goto(BASE + 'learn/printing/comments/');
    await lessonReady(page);
    await setCode(page, MAIN('        System.out.println("Shopping list:");\n        System.out.println("- bread");\n        System.out.println("- milk");'));
    const out = await check(page);
    expect(out.includes('Not yet') && out.includes('instead of deleting it'), out);
    expect(!out.includes('Failed:'), 'the output itself matched');
  });
  await test('hidden tests catch a hard-coded answer', async () => {
    await page.goto(BASE + 'learn/reading-input/joining-strings/');
    await lessonReady(page);
    await page.click('text=Challenge 2');
    await setCode(page, MAIN('        System.out.println("What is your name?");\n        System.out.println("Hello, Ada!");'));
    const out = await check(page);
    expect(out.includes('Passed: Test 1') || out.includes('Test 1'), out);
    expect((await page.locator('.t-fail').count()) === 2 && out.includes('Hidden test'), out);
  });
  await test('input: tests give the program its input; "Run with my input" runs it freely', async () => {
    await setCode(page, 'import java.util.Scanner;\n\n' + MAIN('        Scanner scanner = new Scanner(System.in);\n        System.out.println("What is your name?");\n        String name = scanner.nextLine();\n        System.out.println("Hello, " + name + "!");'));
    const out = await check(page);
    expect(out.includes('All tests passed'), out);
    await page.click('text=Run with my input');
    await page.fill('#stdin', 'Grace');
    const wb = page.locator('.workbench');
    const before = Number(await wb.getAttribute('data-checks'));
    await page.click('.freerun button');
    await page.waitForFunction((n) => Number(document.querySelector('.workbench')?.getAttribute('data-checks')) > n, before, { timeout: 120_000 });
    const free = await page.locator('.freerun').innerText();
    expect(free.includes('Hello, Grace!'), free);
  });
  await test('a crash in a lesson is explained with its line', async () => {
    await page.goto(BASE + 'learn/reading-input/several-inputs/');
    await lessonReady(page);
    await setCode(page, 'import java.util.Scanner;\n\n' + MAIN('        Scanner scanner = new Scanner(System.in);\n        String a = scanner.nextLine();\n        String b = scanner.nextLine();\n        String c = scanner.nextLine();\n        System.out.println(a + b + c);'));
    const out = await check(page);
    expect(out.includes('NoSuchElementException') && out.includes('line 8') && out.includes('more input than it was given'), out);
    await axe(page, 'lesson with a crash');
  });
  await test('"Report a problem" opens a GitHub issue with the code filled in', async () => {
    const link = page.locator('.report-link');
    await link.focus();
    const href = await link.getAttribute('href');
    expect(href.startsWith('https://github.com/AntonyPerez0/Java-Arena/issues/new?'), href);
    expect(decodeURIComponent(href.replace(/\+/g, ' ')).includes('String c = scanner.nextLine();'), 'the code is in the issue');
  });
  await test('settings: text size and theme are applied and saved', async () => {
    await page.goto(BASE + 'settings/');
    await page.check('input[name="size"][value="1.25"]');
    await page.check('input[name="theme"][value="light"]');
    await page.reload();
    expect((await page.evaluate(() => document.documentElement.style.getPropertyValue('--scale'))) === '1.25', 'text size kept');
    expect((await page.evaluate(() => document.documentElement.dataset.theme)) === 'light', 'theme kept');
    await axe(page, 'settings');
    await page.check('input[name="size"][value="1"]');
    await page.check('input[name="theme"][value="system"]');
  });
  await test('"What does it print?": lines are checked against the real output, the answer isn\'t shown', async () => {
    await page.goto(BASE + 'learn/calculating/tracing-values/');
    await page.locator('.predict-lines').waitFor();
    const card = await page.locator('.task-card').innerText();
    expect(!card.includes('Expected output'), 'the task card does not show the answer');
    await page.fill('#line-1', '10');
    await page.fill('#line-2', '3');
    let out = await check(page);
    expect(out.includes('1 of 2 lines is not what the program prints'), out);
    expect((await page.locator('#line-1').getAttribute('aria-invalid')) === 'true', 'the wrong line is marked');
    // Another wrong answer gives the same result text: the status region is emptied and filled
    // again, so a screen reader announces it again.
    await page.waitForFunction(() => document.querySelector('.predict > [role="status"]')?.textContent.includes('is not what'));
    await page.evaluate(() => {
      const region = document.querySelector('.predict > [role="status"]');
      window.__said = [];
      new MutationObserver(() => window.__said.push(region.textContent)).observe(region, { childList: true, characterData: true, subtree: true });
    });
    await page.fill('#line-1', '11');
    await check(page);
    await page.waitForFunction(() => window.__said.length >= 2 && window.__said.at(-1).includes('is not what the program prints'));
    const said = await page.evaluate(() => window.__said);
    expect(said.includes('') && said.at(-1).startsWith('1 of 2'), JSON.stringify(said));
    await page.fill('#line-1', '3');
    out = await check(page);
    expect(out.includes('Every line is right'), out);
    expect((await page.locator('.banner-pass.big').innerText()).includes('Challenge 1 of 3 complete'), 'banner');
    await axe(page, 'predict challenge');
  });
  await test('the indentation step fails badly indented code and passes it once re-indented', async () => {
    await page.goto(BASE + 'learn/conditionals/indentation/');
    await lessonReady(page);
    let out = await check(page);
    expect(out.includes('Not yet') && out.includes('Indent every line to match its braces') && out.includes('Line 2 is indented 0 spaces'), out);
    await setCode(page, MAIN('        int temperature = 25;\n        if (temperature > 20) {\n            System.out.println("Warm day");\n        }\n        System.out.println("Have a nice day");'));
    out = await check(page);
    expect(out.includes('All tests passed'), out);
  });
  await test('elsewhere, indentation problems are a note, not a failure', async () => {
    await page.goto(BASE + 'learn/printing/several-lines/');
    await lessonReady(page);
    await setCode(page, 'public class Main {\npublic static void main(String[] args) {\nSystem.out.println("Semicolons end the line,");\nSystem.out.println("braces keep the blocks in line,");\nSystem.out.println("println makes the output shine.");\n}\n}\n');
    const out = await check(page);
    expect(out.includes('All tests passed') && /style note \(doesn't affect passing\)/i.test(out) && out.includes('Line 2 is indented 0 spaces'), out);
  });
  await test('a method challenge: the check calls the method, and explains why it can\'t', async () => {
    await page.goto(BASE + 'learn/methods/parameters/');
    await lessonReady(page);
    await page.click('text=Challenge 2');
    await page.locator('.cm-content').waitFor();
    const card = await page.locator('.task-card').innerText();
    expect(/the check runs/i.test(card) && card.includes('countdown(3);') && card.includes('Liftoff!'), card);
    // Code shows the characters to type: >= stays two characters, not one ligature.
    const ligatures = await page.evaluate(() => ['.editor .cm-scroller', 'article pre', '.task-card code'].map((q) => getComputedStyle(document.querySelector(q)).fontVariantLigatures));
    expect(ligatures.every((l) => l === 'none'), `ligatures: ${ligatures}`);
    const withMethod = (m) => `public class Main {\n    public static void main(String[] args) {\n        countdown(3);\n    }\n\n${m}\n}\n`;
    // A private method compiles (main is inside Main) but the check can't call it: one plain reason.
    await setCode(page, withMethod('    private static void countdown(int start) {\n        System.out.println("Liftoff!");\n    }'));
    let out = await check(page);
    expect(out.includes("The check couldn't call your code") && out.includes('is private') && out.split('is private').length === 2, out);
    // A problem with the whole class gets one sentence, not a list of knock-on errors.
    await setCode(page, 'package lessons;\n\n' + withMethod('    public static void countdown(int start) {\n        System.out.println("Liftoff!");\n    }'));
    out = await check(page);
    expect(out.includes('remove the package line') && !out.includes('has no method'), out);
    // A crash inside the method: explained with the learner's own line, without the check's frames.
    await setCode(page, withMethod('    public static void countdown(int start) {\n        System.out.println(10 / (start - 3));\n    }'));
    out = await check(page);
    expect(out.includes('ArithmeticException') && out.includes('line 7, in countdown'), out);
    const stderr = await page.locator('details.stderr pre').first().textContent();
    expect(stderr.includes('Main.countdown') && !stderr.includes('ArenaCheck'), stderr);
    await setCode(page, withMethod('    public static void countdown(int start) {\n        for (int i = start; i >= 1; i--) {\n            System.out.println(i);\n        }\n        System.out.println("Liftoff!");\n    }'));
    out = await check(page);
    expect(out.includes('All tests passed'), out);
    await axe(page, 'method challenge');
    // A void method whose value main prints: javac's error in Main.java, explained.
    await page.goto(BASE + 'learn/return-values/computing-return-values/');
    await page.locator('.workbench').waitFor();
    await setCode(page, 'public class Main {\n    public static void main(String[] args) {\n        System.out.println(perimeter(4, 3));\n    }\n\n    public static void perimeter(int width, int height) {\n        System.out.println(2 * width + 2 * height);\n    }\n}\n');
    out = await check(page);
    expect(out.includes("It didn't compile") && out.includes('a method that is void'), out);
  });
  await test('a crash is explained in plain words, with its line; lessons can show a crash on purpose', async () => {
    await page.goto(BASE + 'learn/debugging/reading-a-crash/');
    await lessonReady(page);
    expect((await page.locator('figure.io-crash').count()) >= 2, 'the crash examples have their own labelled blocks');
    // The starter code crashes when the first input is 0.
    const out = await check(page);
    expect(out.includes('ArithmeticException (line 16)') && out.includes('divided a whole number by zero'), out);
    // A list index crash says which index was asked for, of how many values.
    await page.goto(BASE + 'learn/lists/index-out-of-bounds/');
    await lessonReady(page);
    const list = await check(page);
    expect(list.includes('IndexOutOfBoundsException (line 11)') && list.includes('asked for index 3 of a list with 3 values'), list);
  });
  await test('a class in its own file: a tab per file, errors marked in the right file, and a pass', async () => {
    await page.goto(BASE + 'learn/classes/constructors/');
    await lessonReady(page);
    expect((await page.locator('.file-tab').allInnerTexts()).join() === 'Parcel.java,Main.java', 'a tab per file, the class first');
    // The editor sits below the tabs, not over them (the desktop column shrinks the editor, never the tabs).
    const gap = await page.evaluate(() => document.querySelector('[role=tabpanel]').getBoundingClientRect().top - document.querySelector('.file-tab').getBoundingClientRect().bottom);
    expect(gap >= -1, `the editor covers the tabs by ${-gap} px`);
    // The starter Parcel has no constructor yet, so Main's new Parcel("Amir", 1200) doesn't compile.
    await check(page);
    const res = await page.locator('.results').innerText();
    expect(/didn't compile/i.test(res) && res.includes('constructor Parcel'), res);
    // The message names the file, Main.java too, and explains the missing constructor.
    expect(/Main\.java, line 3/i.test(res) && res.includes('Parcel has no constructor that takes any'), res);
    expect((await page.locator('.file-tab-on').innerText()).includes('Main.java') && (await page.locator('.file-tab-on .file-tab-errors').count()) === 1, 'the file with the error is shown, with its count');
    await axe(page, 'a challenge of two files, with an error');
    await page.click('#file-tab-0');
    // Each file keeps its undo history: a change in Parcel.java can be undone after a visit to Main.java.
    await page.click('.cm-content');
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.insertText('// a note\n');
    await page.click('#file-tab-1');
    await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
    await page.click('#file-tab-0');
    await page.click('.cm-content');
    await page.keyboard.press('ControlOrMeta+Z');
    expect(!(await editorText(page)).includes('// a note'), 'the change was undone after switching files');
    await setCode(page, 'public class Parcel {\n    private String recipient;\n    private int grams;\n\n    public Parcel(String recipient, int grams) {\n        this.recipient = recipient;\n        this.grams = grams;\n    }\n\n    public void printInfo() {\n        System.out.println("Parcel for " + this.recipient + ", " + this.grams + " g");\n    }\n}\n');
    await check(page);
    const passed = await page.locator('.results').innerText();
    expect(passed.includes('All tests passed'), passed);
    // The code of both files is saved.
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('java-arena-v1')).steps['classes-constructor']?.challenges?.[0]?.code ?? '');
    expect(saved.includes('// ==== Main.java ====') && saved.includes('this.grams = grams;'), saved.slice(0, 300));
  });
  await test('JUnit: the learner\'s tests run on the class and on versions with bugs, with the report shown', async () => {
    // The first challenge of the JUnit step: the learner adds an assertion that catches a bug.
    const junitStep = JSON.parse(readFileSync(new URL('../src/generated/modules/unit-testing.json', import.meta.url), 'utf8')).steps.find((st) => st.slug === 'junit');
    const testFile = splitFiles(junitStep.solution)[0];
    await page.goto(BASE + 'learn/unit-testing/junit/');
    await lessonReady(page);
    const card = await page.locator('.task-card').first().innerText();
    expect(/the check runs your tests on/i.test(card) && card.includes('at least one test must fail'), card);
    // The starter tests pass on every version, so they miss the bug.
    let out = await check(page);
    expect(out.includes('Not yet') && out.includes('this version has a bug your tests should catch') && /your tests printed/i.test(out), out);
    await axe(page, 'a JUnit challenge, not passed yet');
    // The class under test is checked as given: changing it can't make a wrong test pass.
    const givenTab = page.locator('.file-tab').nth(1);
    const givenName = (await givenTab.innerText()).trim();
    await givenTab.click();
    await page.click('.cm-content');
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.insertText('// changed\n');
    out = await check(page);
    expect(out.includes(`${givenName} is checked as given`), out);
    // "Run my tests" shows the report of the learner's tests.
    await page.getByRole('button', { name: 'Run my tests' }).click();
    await page.waitForFunction(() => /tests? passed/.test(document.querySelector('.freerun')?.textContent ?? ''), null, { timeout: 120_000 });
    const report = await page.locator('.freerun').innerText();
    expect(report.includes(`${testFile.path.replace('.java', '')}: `) && /\d+ of \d+ tests? passed/.test(report), report);
    // The finished test catches the bugs.
    await page.click('#file-tab-0');
    await setCode(page, testFile.text);
    out = await check(page);
    expect(out.includes('All tests passed'), out);
  });
  await test('the indentation check accepts switch, multi-line headers, lambdas and other brace styles', async () => {
    const ok = {
      'classic switch': 'class A {\n    void f(int x) {\n        switch (x) {\n            case 1:\n                g();\n                break;\n            case 2: {\n                h();\n                break;\n            }\n            default:\n                k();\n        }\n    }\n}',
      'switch, older style': 'class A {\n    void f(int x) {\n        switch (x) {\n        case 1:\n            g();\n            break;\n        default:\n            h();\n        }\n    }\n}',
      'arrow switch': 'class A {\n    int f(int x) {\n        return switch (x) {\n            case 1 -> 10;\n            default -> {\n                yield 20;\n            }\n        };\n    }\n}',
      'multi-line headers': 'class A {\n    void f() {\n        for (int i = 0;\n                i < 10;\n                i++) {\n            g();\n        }\n        try (Scanner s = new Scanner(System.in);\n             Scanner t = new Scanner(System.in)) {\n            g();\n        }\n    }\n}',
      'lambda and anonymous class': 'class A {\n    void f() {\n        list.forEach(x -> {\n            g(x);\n        });\n        Runnable r = new Runnable() {\n            public void run() {\n                g();\n            }\n        };\n    }\n}',
      'braces on their own lines': 'class A\n{\n    void f()\n    {\n        if (x)\n        {\n            g();\n        }\n        else\n        {\n            h();\n        }\n    }\n}',
    };
    for (const [name, src] of Object.entries(ok)) expect(indentProblems(src).length === 0, `${name}: ${JSON.stringify(indentProblems(src))}`);
    const flat = indentProblems('class A {\n    void f(int x) {\n        switch (x) {\n            case 1:\n            g();\n        }\n    }\n}');
    expect(flat.length === 1 && flat[0].line === 5 && flat[0].expected === 16, JSON.stringify(flat));
  });
  await test('two open tabs keep each other\'s progress', async () => {
    const other = await lessonSession.ctx.newPage();
    await other.goto(BASE + 'settings/');
    await other.locator('input[name="theme"]').first().waitFor();
    // This tab finishes a challenge; the other one then changes a setting and saves.
    await page.goto(BASE + 'learn/printing/print-and-println/');
    await lessonReady(page);
    await page.locator('input.blank').nth(0).fill('print');
    await page.locator('input.blank').nth(1).fill('println');
    expect((await check(page)).includes('All tests passed'), 'passed');
    await page.waitForTimeout(400);
    await other.check('input[name="theme"][value="light"]');
    await other.waitForTimeout(400);
    await other.close();
    // The setting reaches this tab right away, and this tab's progress survived the other tab's save.
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light', null, { timeout: 5000 });
    await page.reload();
    await page.locator('.workbench').waitFor();
    expect((await page.locator('.challenge-done').count()) >= 1, 'the passed challenge is still done');
    await page.goto(BASE + 'settings/');
    await page.check('input[name="theme"][value="system"]');
  });
  await test('phone menu: focus moves into it, Escape closes it', async () => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto(BASE + 'learn/');
    await page.locator('.module-live').first().waitFor();
    await page.click('button[aria-label="Open menu"]');
    expect(await page.evaluate(() => !!document.activeElement?.closest('#main-nav')), 'focus is in the menu');
    await page.keyboard.press('Escape');
    expect((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Open menu', 'focus back on the menu button');
    await page.setViewportSize({ width: 1280, height: 900 });
  });
  await test('no errors in the console on lesson pages', async () => {
    expect(errors.length === 0, errors.join('\n'));
  });
}
await lessonSession.ctx.close();

// Part 11 lessons. The steps are picked from the build's own module files, by what they hold.
const moduleOf = (id) => JSON.parse(readFileSync(new URL(`../src/generated/modules/${id}.json`, import.meta.url), 'utf8'));
/** Each challenge of a module: { step, ex, index } (the step itself is challenge 1, then its `more`). */
const challengesOf = (mod) => mod.steps.flatMap((step) => [step, ...(step.more ?? [])].map((ex, index) => ({ step, ex, index })));
async function openChallenge(page, moduleId, { step, index }) {
  await page.goto(BASE + `learn/${moduleId}/${step.slug}/`);
  await lessonReady(page);
  if (index > 0) await page.locator('.challenge-tab').nth(index).click();
  await page.locator('.task-card', { hasText: `Challenge ${index + 1} of` }).waitFor();
}
/** The path of each file tab, in order (a tab of a folder file says its path in its label). */
const tabPaths = (page) => page.locator('.file-tab').evaluateAll((els) => els.map((e) => (e.getAttribute('aria-label') ?? e.textContent).replace(/,?\s*\d+ errors?$/, '').trim()));
/** Types each file of a program (joined with file markers) into its tab. */
async function setFiles(page, code) {
  const paths = await tabPaths(page);
  for (const f of splitFiles(code)) {
    const i = paths.indexOf(f.path);
    expect(i >= 0, `no tab for ${f.path} (tabs: ${paths})`);
    await page.click(`#file-tab-${i}`);
    await page.locator(`#file-tab-${i}[aria-selected="true"]`).waitFor();
    await setCode(page, f.text);
  }
}
await test('a class diagram in a lesson: drawn, with a text version; axe passes in both themes; a 320 px phone does not scroll sideways', async () => {
  // The step of module 40 whose lesson text has the widest diagram: on a phone it scrolls, if anything does.
  const widths = (text) => [...text.matchAll(/<svg class="uml-svg" viewBox="0 0 ([\d.]+) /g)].map((m) => Number(m[1]));
  const step = moduleOf('class-diagrams').steps.reduce((a, b) => (Math.max(0, ...widths(b.text)) > Math.max(0, ...widths(a.text)) ? b : a));
  const widest = Math.max(0, ...widths(step.text));
  expect(widest > 0, 'no class diagram in the lesson text of module 40');
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/class-diagrams/${step.slug}/`);
  await lessonReady(page);
  const figures = page.locator('article.step-text figure.uml');
  expect((await figures.count()) === widths(step.text).length, `${await figures.count()} diagrams in the lesson text, not ${widths(step.text).length}`);
  const figure = figures.filter({ has: page.locator(`svg[viewBox^="0 0 ${widest} "]`) }).first();
  const svg = figure.locator('svg.uml-svg');
  const box = await svg.boundingBox();
  expect(box && box.width > 100 && box.height > 50, `the drawing is ${JSON.stringify(box)}`);
  // The drawing and its text version have the same classes.
  const drawn = await svg.locator('text.u-name').allTextContents();
  const listed = await figure.locator('details.uml-text > ul > li > strong').allTextContents();
  expect(drawn.length > 1 && drawn.slice().sort().join() === listed.slice().sort().join(), `drawn: ${drawn}; as text: ${listed}`);
  // The text version opens under the drawing.
  const details = figure.locator('details.uml-text');
  expect((await details.getAttribute('open')) === null, 'the text version starts closed');
  await details.locator('summary').click();
  await details.locator('li code').first().waitFor({ state: 'visible' });
  const asText = await details.innerText();
  expect(listed.every((name) => asText.includes(name)) && /field|method|constructor/.test(asText), asText);
  // Both themes: the drawing's text has the page's text color, and axe passes.
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    const [fill, color] = await page.evaluate(() => [getComputedStyle(document.querySelector('article .uml-svg text.u-name')).fill, getComputedStyle(document.body).color]);
    expect(fill === color, `${colorScheme}: class names drawn in ${fill} on a page whose text is ${color}`);
    await axe(page, `a lesson with class diagrams, ${colorScheme} theme`);
    await shot(page, `class-diagram-${colorScheme}`);
  }
  // A 320 px phone: the page doesn't scroll sideways; a drawing shrinks only while its text stays
  // 11 px or more, and one that scrolls inside itself can be scrolled from the keyboard.
  await page.setViewportSize({ width: 320, height: 700 });
  await noOverflow(page, 'a lesson with class diagrams at 320 px');
  const drawings = await page.locator('article figure.uml').evaluateAll((els) =>
    els.map((f) => {
      const scroll = f.querySelector('.uml-scroll');
      const svg = f.querySelector('svg');
      return { font: (12 * svg.getBoundingClientRect().width) / svg.viewBox.baseVal.width, scrolls: scroll.scrollWidth > scroll.clientWidth, tabindex: scroll.getAttribute('tabindex'), label: scroll.getAttribute('aria-label') };
    }),
  );
  expect(drawings.every((d) => d.font >= 10.9), `text below 11 px: ${JSON.stringify(drawings)}`);
  expect(drawings.filter((d) => d.scrolls).every((d) => d.tabindex === '0' && d.label?.startsWith('Class diagram of')), `a drawing scrolls but can't take the focus: ${JSON.stringify(drawings)}`);
  await axe(page, 'a lesson with class diagrams at 320 px');
  await shot(page, 'class-diagram-320');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('a check on the file a program writes: a wrong file shows what it should contain and what the program wrote; the model solution passes', async () => {
  // A challenge of module 43 whose starter program runs but has a bug in what it writes.
  const found = challengesOf(moduleOf('writing-files')).find(({ ex }) => ex.kind === 'code' && /\bbug\b/i.test(ex.task) && ex.tests.some((t) => !t.hidden && t.writes));
  expect(found, 'no challenge in module 43 asks to fix a bug in a program that writes a file');
  const shown = found.ex.tests.find((t) => !t.hidden && t.writes);
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'writing-files', found);
  // The task says what each file should hold after the run.
  const card = await page.locator('.task-card').innerText();
  for (const [name, text] of Object.entries(shown.writes)) expect(new RegExp(`${name.replace(/\./g, '\\.')} after the run`, 'i').test(card) && card.includes(text), card);
  // The starter code: the file check fails, with the file it should be and the file it is.
  let out = await check(page);
  expect(out.includes('Not yet'), out);
  const failed = page.locator('.t-fail', { hasText: shown.name }).first();
  for (const [name, text] of Object.entries(shown.writes)) {
    const cmp = failed.locator('.t-cmp', { hasText: new RegExp(`${name.replace(/\./g, '\\.')} should contain`, 'i') });
    expect((await cmp.count()) === 1, `no comparison of ${name}: ${out}`);
    const [should, wrote] = await cmp.locator('pre').allInnerTexts();
    expect(should.trim() === text.trim(), `${name} should contain ${JSON.stringify(should)}, not ${JSON.stringify(text)}`);
    expect(/your program wrote/i.test(await cmp.innerText()) && wrote.trim() !== '' && wrote.trim() !== text.trim() && !wrote.includes("didn't create"), `what the program wrote: ${JSON.stringify(wrote)}`);
  }
  // Hidden tests keep their files' contents hidden.
  for (const t of found.ex.tests.filter((t) => t.hidden && t.writes)) for (const text of Object.values(t.writes)) expect(text.length < 8 || !out.includes(text), `a hidden test's file is shown: ${text}`);
  await axe(page, 'a failed check of a written file');
  // The model solution passes every test, the files included.
  await setFiles(page, found.ex.solution);
  out = await check(page);
  expect(out.includes('All tests passed'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('a challenge in package folders: each file has its tab, with its folders; a compile error in a folder file lands on its tab', async () => {
  // The first code challenge of module 41 whose files sit in two folders or more.
  const found = challengesOf(moduleOf('packages')).find(({ ex }) => ex.kind === 'code' && new Set(splitFiles(ex.seed).map((f) => folderOf(f.path)).filter(Boolean)).size >= 2);
  expect(found, 'no challenge in module 41 has files in two folders');
  const seedPaths = splitFiles(found.ex.seed).map((f) => f.path);
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'packages', found);
  expect((await tabPaths(page)).join() === seedPaths.join(), `tabs: ${await tabPaths(page)}; files: ${seedPaths}`);
  const dirs = await page.locator('.file-tab').evaluateAll((els) => els.map((e) => e.querySelector('.file-tab-dir')?.textContent ?? ''));
  expect(dirs.join() === seedPaths.map((p) => folderOf(p)).join(), `folders on the tabs: ${dirs}`);
  // The model solution with a semicolon missing in a folder file (a line in its class body).
  const files = splitFiles(found.ex.solution);
  const broken = files.find((f) => folderOf(f.path) && f.text.split('\n').some((l) => /^\s{4,}\S.*;$/.test(l)));
  const lines = broken.text.split('\n');
  const line = lines.findIndex((l) => /^\s{4,}\S.*;$/.test(l)) + 1;
  lines[line - 1] = lines[line - 1].replace(/;$/, '');
  await setFiles(page, joinFiles(files.map((f) => (f === broken ? { ...f, text: lines.join('\n') } : f))));
  // Checked from another file's tab, the error opens the folder file's tab, with its count and the mark on its line.
  const at = seedPaths.indexOf(broken.path);
  const tab = page.locator(`#file-tab-${at}`);
  await page.click(`#file-tab-${at === 0 ? 1 : 0}`);
  let out = await check(page);
  expect(out.includes("It didn't compile") && new RegExp(`${broken.path.replace(/[./]/g, '\\$&')}, line ${line}\\b`, 'i').test(out) && out.includes("';' expected"), out);
  await page.locator(`#file-tab-${at}[aria-selected="true"]`).waitFor();
  expect((await tab.getAttribute('aria-label')) === `${broken.path}, 1 error` && (await page.locator('.file-tab-errors').count()) === 1, `the tab: ${await tab.getAttribute('aria-label')}`);
  await page.locator('.cm-lint-marker-error').first().waitFor();
  const marked = await page.evaluate(() => [...document.querySelectorAll('.cm-content .cm-line')].findIndex((l) => l.querySelector('.cm-lintRange-error, .cm-lintPoint-error')) + 1);
  expect(marked === line && (await page.locator('.cm-lint-marker-error').count()) === 1, `the mark is on line ${marked}, not ${line}`);
  await axe(page, 'a challenge in package folders, with an error');
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await noOverflow(page, `a challenge in package folders at ${width} px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  // The whole model solution passes.
  await setFiles(page, found.ex.solution);
  out = await check(page);
  expect(out.includes('All tests passed'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

console.log('Playground');
await test('playground: a class in a file of its own; errors and crashes name their file; the link carries both files', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, MAIN('        Greeter g = new Greeter("Hi");\n        g.greet("Ada");'));
  await page.click('text=Add a class');
  await page.fill('#new-class', 'Greeter');
  await page.click('.file-add-form button[type=submit]');
  expect((await page.locator('.file-tab').allInnerTexts()).join() === 'Main.java,Greeter.java', 'a tab per file');
  expect((await page.locator('.file-tab-on').innerText()).includes('Greeter.java'), 'the new file is open');
  // A mistake in Greeter.java: the message names the file, and its tab shows the count.
  await setCode(page, 'public class Greeter {\n    private String word;\n\n    public Greeter(String word) {\n        this.word = word\n    }\n}\n');
  await check(page);
  let out = await page.locator('.results').innerText();
  expect(/Greeter\.java, line 5/i.test(out), out);
  expect((await page.locator('.file-tab-on .file-tab-errors').count()) === 1, 'the error count on the tab');
  await setCode(page, 'public class Greeter {\n    private String word;\n\n    public Greeter(String word) {\n        this.word = word;\n    }\n\n    public void greet(String name) {\n        System.out.println(word + ", " + name.substring(5));\n    }\n}\n');
  await check(page);
  out = await page.locator('.results').innerText();
  expect(out.includes('StringIndexOutOfBoundsException') && out.includes('Greeter.java'), out);
  await setCode(page, 'public class Greeter {\n    private String word;\n\n    public Greeter(String word) {\n        this.word = word;\n    }\n\n    public void greet(String name) {\n        System.out.println(word + ", " + name + "!");\n    }\n}\n');
  await check(page);
  out = await page.locator('.results').innerText();
  expect(out.includes('Hi, Ada!'), out);
  await axe(page, 'playground with two files');
  await page.click('text=Share');
  await page.locator('#pg-link').waitFor();
  const link = await page.inputValue('#pg-link');
  const other = await newPage();
  await other.page.goto(link);
  await other.page.locator('.banner-info').waitFor();
  expect((await other.page.locator('.file-tab').allInnerTexts()).join() === 'Main.java,Greeter.java', 'both files came with the link');
  await other.ctx.close();
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: a class in a package gets a file in its folders, with its package line; errors and crashes land on that file', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, 'import shop.model.Item;\n\n' + MAIN('        Item item = new Item("apple", 3);\n        System.out.println(item.describe());'));
  const addClass = async (name) => {
    await page.click('text=Add a class');
    await page.fill('#new-class', name);
    await page.click('.file-add-form button[type=submit]');
  };
  await addClass('shop.model.Item');
  // The tab shows the folders above the file name, and gives screen readers the whole path.
  const tab = page.locator('#file-tab-1');
  expect((await tab.getAttribute('aria-label')) === 'shop/model/Item.java' && (await tab.getAttribute('aria-selected')) === 'true', `the new file's tab: ${await tab.getAttribute('aria-label')}`);
  expect((await tab.locator('.file-tab-dir').innerText()) === 'shop/model/', 'the folders on the tab');
  expect((await editorText(page)).startsWith('package shop.model;\n\npublic class Item {'), await editorText(page));
  // Names are checked: no reserved words, no second file of the same class.
  for (const [name, says] of [['shop.class.Item', 'class is a word Java reserves'], ['shop/model/Item', 'There is already a shop/model/Item.java']]) {
    await addClass(name);
    const said = await page.locator('#new-class-error').innerText();
    expect(said.includes(says), `${name}: ${said}`);
    await page.click('.file-add-form button:has-text("Cancel")');
  }
  const item = (constructor, price) => `package shop.model;\n\npublic class Item {\n    private String name;\n    private int price;\n\n    public Item(String name, int price) {\n${constructor}\n        this.price = ${price};\n    }\n\n    public String describe() {\n        return name + " costs " + (12 / price);\n    }\n}\n`;
  await setCode(page, item('        this.name = name;', 'price'));
  let out = await check(page);
  expect(out.includes('apple costs 4'), out);
  // A mistake in the folder file, checked from Main's tab: the message names the file with its
  // folders, that file's tab opens with the count, and the mark is on its line.
  await setCode(page, item('        this.name = name', 'price'));
  await page.click('#file-tab-0');
  await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
  out = await check(page);
  expect(/shop\/model\/Item\.java, line 8/i.test(out), out);
  expect((await tab.getAttribute('aria-selected')) === 'true' && (await tab.locator('.file-tab-errors').innerText()).startsWith('1') && (await tab.getAttribute('aria-label')) === 'shop/model/Item.java, 1 error', 'the file with the error is open, with its count');
  await page.locator('.cm-lint-marker-error').first().waitFor();
  const marked = await page.evaluate(() => [...document.querySelectorAll('.cm-content .cm-line')].findIndex((l) => l.querySelector('.cm-lintRange-error, .cm-lintPoint-error')) + 1);
  expect(marked === 8 && (await page.locator('.cm-lint-marker-error').count()) === 1, `the mark is on line ${marked}`);
  await page.click('#file-tab-0');
  await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
  // Marks appear as the editor starts: give Main.java's a moment to show one it shouldn't have.
  await page.waitForTimeout(300);
  expect((await page.locator('.cm-lint-marker-error').count()) === 0, 'Main.java has no mark');
  // A crash in the folder file names it with its folders.
  await page.click('#file-tab-1');
  await setCode(page, item('        this.name = name;', '0'));
  out = await check(page);
  expect(out.includes('ArithmeticException') && out.includes('shop/model/Item.java, line 13'), out);
  await axe(page, 'playground with a file in a folder');
  await page.setViewportSize({ width: 320, height: 700 });
  await noOverflow(page, 'playground with a file in a folder at 320 px');
  await page.setViewportSize({ width: 1280, height: 900 });
  // The link carries the folder file.
  await page.click('text=Share');
  await page.locator('#pg-link').waitFor();
  const link = await page.inputValue('#pg-link');
  const other = await newPage();
  await other.page.goto(link);
  await other.page.locator('.banner-info').waitFor();
  const names = await other.page.locator('.file-tab').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? e.textContent));
  expect(names.join() === 'Main.java,shop/model/Item.java', `the link's files: ${names}`);
  await other.ctx.close();
  // A long path keeps its letters and wraps in the error card, and the tabs scroll inside their
  // strip: a phone doesn't scroll sideways.
  await addClass('vending.coffee.CoffeeMachine');
  await setCode(page, 'package vending.coffee;\n\npublic class CoffeeMachine {\n    private int cups\n}\n');
  out = await check(page);
  expect(out.includes('vending/coffee/CoffeeMachine.java,') && /CoffeeMachine\.java, line 4/i.test(out), out);
  for (const width of [320, 360, 390]) {
    await page.setViewportSize({ width, height: 700 });
    await noOverflow(page, `an error in vending/coffee/CoffeeMachine.java at ${width} px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 5 mistakes are explained: a missing cast in equals, and an instance variable that is null', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, MAIN('        Pot pot = new Pot();\n        pot.water();'));
  await page.click('text=Add a class');
  await page.fill('#new-class', 'Pot');
  await page.click('.file-add-form button[type=submit]');
  await setCode(page, 'public class Pot {\n    private String plant;\n\n    public void water() {\n        System.out.println(this.plant.length());\n    }\n\n    public boolean equals(Object compared) {\n        return this.plant.equals(compared.plant);\n    }\n}\n');
  let out = await check(page);
  expect(/Pot\.java, line 9/i.test(out) && out.includes('compared has the type Object') && out.includes('other.plant'), out);
  await setCode(page, 'public class Pot {\n    private String plant;\n\n    public void water() {\n        System.out.println(this.plant.length());\n    }\n}\n');
  out = await check(page);
  expect(out.includes('NullPointerException') && out.includes('the instance variable plant holds no object') && out.includes('for example in the constructor'), out);
  // A removed class leaves nothing behind: added again, it starts empty and undo can't bring the old code back.
  page.once('dialog', (d) => d.accept());
  await page.click('text=Remove Pot.java');
  await page.click('text=Add a class');
  await page.fill('#new-class', 'Pot');
  await page.click('.file-add-form button[type=submit]');
  await page.click('.cm-content');
  await page.keyboard.press('ControlOrMeta+Z');
  expect(!(await editorText(page)).includes('plant'), 'the removed code came back');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 9 mistakes are explained: a missing abstract method, a cast to the wrong subclass, and sorting objects that are not Comparable', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, MAIN('        Animal animal = new Cat();\n        Dog dog = (Dog) animal;\n        System.out.println(dog.sound());'));
  const addClass = async (name, text) => {
    await page.click('text=Add a class');
    await page.fill('#new-class', name);
    await page.click('.file-add-form button[type=submit]');
    await setCode(page, text);
  };
  await addClass('Animal', 'public abstract class Animal {\n    public abstract String sound();\n}\n');
  await addClass('Dog', 'public class Dog extends Animal {\n    public String sound() {\n        return "woof";\n    }\n}\n');
  await addClass('Cat', 'public class Cat extends Animal {\n    public String sund() {\n        return "meow";\n    }\n}\n');
  // The note names the classes and the method, and knows Animal is a class (it read the program's files).
  let out = await check(page);
  expect(/Cat\.java, line 1/i.test(out) && out.includes('Cat is not abstract') && out.includes('sound() is abstract in Animal') && out.includes('each class that extends Animal must write its own') && out.includes('Add sound to Cat'), out);
  await setCode(page, 'public class Cat extends Animal {\n    public String sound() {\n        return "meow";\n    }\n}\n');
  out = await check(page);
  expect(/ClassCastException \(Main\.java, line 4\)/.test(out) && out.includes('but it is a Cat, not a Dog') && out.includes('if (value instanceof Dog)'), out);
  // A TreeSet of Dogs, which aren't Comparable: the cast is in Java's own code, so the note is about compareTo, not about a cast.
  await page.click('#file-tab-0');
  await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
  await setCode(page, 'import java.util.TreeSet;\n\n' + MAIN('        TreeSet<Dog> dogs = new TreeSet<>();\n        dogs.add(new Dog());'));
  out = await check(page);
  expect(/ClassCastException \(Main\.java, line 6\)/.test(out) && out.includes("Dog doesn't implement Comparable") && out.includes('Make Dog implement Comparable<Dog>') && !out.includes('instanceof'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 10 mistakes are explained: a lambda that changes a local variable, the average of an empty stream, and Comparable without a type', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  const imports = 'import java.util.ArrayList;\nimport java.util.List;\n\n';
  await setCode(page, imports + MAIN('        List<Integer> points = new ArrayList<>();\n        int total = 0;\n        points.forEach(p -> total += p);\n        System.out.println(total);'));
  let out = await check(page);
  expect(/line 8/i.test(out) && out.includes('local variables referenced from a lambda expression must be final or effectively final') && out.includes("total is a local variable of the method, and a lambda can't change it") && out.includes('mapToInt(...).sum()'), out);
  // The stream of an empty list has no average: getAsDouble() crashes, and the note says why and what to use instead.
  await setCode(page, imports + MAIN('        List<Integer> points = new ArrayList<>();\n        int total = points.stream().mapToInt(p -> p).sum();\n        System.out.println(total);\n        System.out.println(points.stream().mapToInt(p -> p).average().getAsDouble());'));
  out = await check(page);
  expect(/NoSuchElementException \(line 9\)/.test(out) && out.includes('empty OptionalDouble with getAsDouble()') && out.includes('average().orElse(0)'), out);
  // A note that quotes a generic type shows it as it is written (the note is plain text, not Markdown).
  await setCode(page, MAIN('        System.out.println(new Player("Ada", 3));'));
  await page.click('text=Add a class');
  await page.fill('#new-class', 'Player');
  await page.click('.file-add-form button[type=submit]');
  await setCode(page, 'public class Player implements Comparable {\n    private String name;\n    private int points;\n\n    public Player(String name, int points) {\n        this.name = name;\n        this.points = points;\n    }\n\n    public int compareTo(Player other) {\n        return this.points - other.points;\n    }\n}\n');
  out = await check(page);
  expect(/Player\.java, line 1/i.test(out) && out.includes('Player implements Comparable without a type in angle brackets') && out.includes('implements Comparable<Player>. Then the compareTo(Player other) that Player already has'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 11 mistakes are explained: an unreported exception names its method, a class from another package gets its import line, and a refused value names the throw and the call', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  // A checked exception: the note names what throws it and gives both ways to handle it.
  await setCode(page, 'import java.nio.file.Files;\nimport java.nio.file.Path;\n\n' + MAIN('        System.out.println(Files.readAllLines(Path.of("scores.txt")));'));
  let out = await check(page);
  expect(out.includes('Files.readAllLines(...) can throw IOException') && out.includes('catch (IOException e)') && out.includes('add throws IOException to the header of main: public static void main(String[] args) throws IOException'), out);
  // A class in a package, used from Main without an import: the note names the package and gives the import line.
  await page.click('text=Add a class');
  await page.fill('#new-class', 'shop.model.Item');
  await page.click('.file-add-form button[type=submit]');
  await setCode(page, 'package shop.model;\n\npublic class Item {\n    private int price;\n\n    public Item(int price) {\n        if (price < 0) {\n            throw new IllegalArgumentException("A price can\'t be negative: " + price);\n        }\n        this.price = price;\n    }\n}\n');
  await page.click('#file-tab-0');
  await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
  await setCode(page, MAIN('        Item item = new Item(-2);\n        System.out.println(item);'));
  out = await check(page);
  expect(/Main\.java, line 3/i.test(out) && out.includes('Item is in the package shop.model (the file shop/model/Item.java)') && out.includes('add import shop.model.Item; at the top of Main.java'), out);
  // With the import it runs, and the constructor refuses the price: the note names the throw and the call that passed the value.
  await setCode(page, 'import shop.model.Item;\n\n' + MAIN('        Item item = new Item(-2);\n        System.out.println(item);'));
  out = await check(page);
  expect(out.includes('crashed with IllegalArgumentException. Your own code threw it on purpose, with the throw in the constructor of Item (shop/model/Item.java, line 8)') && out.includes('the call in main (Main.java, line 5) passed it') && out.includes("A price can't be negative: -2"), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 12 mistakes are explained: a primitive in angle brackets, and a grid index past the rows; a list of your own runs with only javac\'s note', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  // List<int>: the note names the class to use and writes the type out with it.
  await setCode(page, 'import java.util.ArrayList;\nimport java.util.List;\n\n' + MAIN('        List<int> numbers = new ArrayList<>();\n        numbers.add(5);\n        System.out.println(numbers);'));
  let out = await check(page);
  expect(/line 6/i.test(out) && out.includes('int is a primitive type') && out.includes("List<int> isn't allowed") && out.includes('Use its wrapper class Integer instead: List<Integer>'), out);
  // A grid whose loops have swapped bounds: the note says which index it was (the row), the length, and why.
  await setCode(page, MAIN('        int[][] grid = new int[3][4];\n        for (int y = 0; y < grid[0].length; y++) {\n            for (int x = 0; x < grid.length; x++) {\n                grid[y][x] = x + y;\n            }\n        }'));
  out = await check(page);
  expect(/ArrayIndexOutOfBoundsException \(line 6\)/.test(out) && out.includes('In grid[y][x], the first index, y, picks the row, and it was 3: grid has 3 rows') && out.includes("The loops' bounds look swapped"), out);
  // (T[]) new Object[4] in a generic class: javac prints a note about unchecked operations, and the program just runs.
  await setCode(page, MAIN('        Stack<String> stack = new Stack<>();\n        stack.push("top");\n        System.out.println(stack.peek());') + '\nclass Stack<T> {\n    private T[] values = (T[]) new Object[4];\n    private int count;\n\n    public void push(T value) {\n        this.values[this.count] = value;\n        this.count++;\n    }\n\n    public T peek() {\n        return this.values[this.count - 1];\n    }\n}\n');
  out = await check(page);
  expect(/Output\s+top\s+Exit code 0/i.test(out) && !out.includes("didn't compile") && !/unchecked|crashed/i.test(out), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 13 mistakes are explained: an event handler that changes a local variable, and a node added twice, whose cause is the real problem; long notes wrap on a 320 px phone', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  const app = (body) =>
    'import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.layout.HBox;\nimport javafx.stage.Stage;\n\n' +
    'public class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n' + body + '\n        stage.setScene(new Scene(box));\n        stage.show();\n    }\n\n' +
    '    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
  // A handler that counts in a local variable of start: the note says the handler runs later, so the count belongs in an instance variable.
  await setCode(page, app('        Button add = new Button("Add");\n        HBox box = new HBox(add);\n        int clicks = 0;\n        add.setOnAction(e -> {\n            clicks++;\n            add.setText("Clicks: " + clicks);\n        });'));
  let out = await check(page);
  expect(/line 14/i.test(out) && out.includes('local variables referenced from a lambda expression must be final or effectively final') && out.includes('clicks is a local variable of start, and the event handler given to setOnAction changes it') && out.includes('declare private int clicks = 0; in the class, outside start'), out);
  // The same button twice in one pane: JavaFX's "Exception in Application start method", explained by its cause and the cause's line.
  await setCode(page, app('        Button add = new Button("Add");\n        HBox box = new HBox(add, add);'));
  out = await check(page);
  expect(out.includes('crashed with IllegalArgumentException. Your start method threw it while it built the window, so JavaFX printed "Exception in Application start method"') && out.includes('its first line in your code is Main.java, line 11, in start') && out.includes('add is already one of its children'), out);
  // Notes with long code that has no spaces to break at (a listener lambda, a class's full name) wrap on a 320 px phone instead of widening the page.
  await page.setViewportSize({ width: 320, height: 700 });
  await setCode(
    page,
    'import javafx.application.Application;\nimport javafx.beans.property.SimpleIntegerProperty;\nimport javafx.scene.Scene;\nimport javafx.scene.control.TextField;\nimport javafx.stage.Stage;\n\n' +
      'public class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n        TextField name = new TextField();\n        name.setOnMouseMoved(e -> System.out.println("moved"));\n        stage.setScene(new Scene(name));\n        stage.show();\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n',
  );
  out = await check(page);
  expect(out.includes('name.textProperty().addListener((observable,') && out.includes('(javafx.beans.property.SimpleIntegerProperty)'), out);
  await noOverflow(page, 'part 13 notes at 320 px');
  await page.setViewportSize({ width: 1280, height: 900 });
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 14 mistakes are explained: XYChart.Series without its import, read as a package, and a color part above 255 in Color.rgb', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  const app = (imports, body) =>
    'import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n' + imports + '\n' +
    'public class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n' + body + '\n        stage.setScene(new Scene(box));\n        stage.show();\n    }\n\n' +
    '    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
  // XYChart.Series with only LineChart and NumberAxis imported: javac reads XYChart as a package, and the note says it's the class Series inside XYChart and gives the import.
  await setCode(page, app('import javafx.scene.chart.LineChart;\nimport javafx.scene.chart.NumberAxis;\n', '        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());\n        XYChart.Series<Number, Number> rain = new XYChart.Series<>();\n        chart.getData().add(rain);\n        VBox box = new VBox(chart);'));
  let out = await check(page);
  expect(/line 12/i.test(out) && out.includes('package XYChart does not exist') && out.includes('XYChart.Series is the class Series inside XYChart') && out.includes('import javafx.scene.chart.XYChart;'), out);
  // A color part above 255: JavaFX's "Exception in Application start method", explained by its cause, Color.rgb's range.
  await setCode(page, app('import javafx.scene.canvas.Canvas;\nimport javafx.scene.canvas.GraphicsContext;\nimport javafx.scene.paint.Color;\n', '        Canvas canvas = new Canvas(100, 50);\n        GraphicsContext painter = canvas.getGraphicsContext2D();\n        int red = 200 + 100;\n        painter.setFill(Color.rgb(red, 0, 0));\n        VBox box = new VBox(canvas);'));
  out = await check(page);
  expect(out.includes('crashed with IllegalArgumentException') && out.includes('its first line in your code is Main.java, line 15, in start') && out.includes('Color.rgb(red, green, blue) takes each part of the color as a whole number from 0 to 255, and its red was 300') && out.includes('Math.min(255, value)'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 14.3 and 14.4 mistakes are explained: a name that is no KeyCode constant, a timer whose handle takes an int, and java.sql, which the page does not have', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  const app = (imports, body) =>
    'import javafx.animation.AnimationTimer;\nimport javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.input.KeyCode;\nimport javafx.scene.layout.Pane;\nimport javafx.stage.Stage;\n' + imports + '\n' +
    'public class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n        Pane pane = new Pane();\n        Scene scene = new Scene(pane, 600, 400);\n' + body + '\n        stage.setScene(scene);\n        stage.show();\n    }\n\n' +
    '    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
  // KeyCode.LEFT_ARROW: the note names the closest real constant.
  await setCode(page, app('', '        scene.setOnKeyPressed(event -> {\n            if (event.getCode() == KeyCode.LEFT_ARROW) {\n                pane.setRotate(pane.getRotate() - 5);\n            }\n        });'));
  let out = await check(page);
  expect(/line 14/i.test(out) && out.includes('cannot find symbol') && out.includes('KeyCode has no constant LEFT_ARROW. Did you mean KeyCode.LEFT (the key called Left)?'), out);
  // A timer whose handle takes an int: both of javac's errors are explained, each saying handle takes a long.
  await setCode(page, app('', '        new AnimationTimer() {\n            @Override\n            public void handle(int now) {\n                pane.setRotate(pane.getRotate() + 1);\n            }\n        }.start();'));
  out = await check(page);
  expect(out.includes('does not override abstract method handle(long) in AnimationTimer') && out.includes('Its handle takes (int now) instead, so to Java it\'s another method') && out.includes("@Override says that handle replaces AnimationTimer's handle, but AnimationTimer's takes exactly one parameter, a long"), out);
  // java.sql: the page's Java has only java.base, so the import doesn't compile here, and the note says why plainly.
  await setCode(page, 'import java.sql.Connection;\nimport java.sql.DriverManager;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n        Connection connection = DriverManager.getConnection("jdbc:h2:./todo", "sa", "");\n        System.out.println(connection);\n    }\n}\n');
  out = await check(page);
  expect(/line 1/i.test(out) && out.includes('package java.sql does not exist') && out.includes('This page has no database') && out.includes('module 54, "Libraries, Maven and databases"'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('extra modules\' mistakes are explained: a record accessor called as getX(), a switch expression without a case for an enum constant, and a recursion without a base case', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  // A record's accessor is x(), not getX(): the note says so and lists its accessors.
  await setCode(page, 'public class Main {\n    record Point(int x, int y) {\n    }\n\n    public static void main(String[] args) {\n        Point p = new Point(1, 2);\n        System.out.println(p.getX());\n    }\n}\n');
  let out = await check(page);
  expect(/line 7/i.test(out) && out.includes('cannot find symbol') && out.includes("Point is a record, and a record's accessor methods have the components' own names, without get: p.x(), not p.getX(). Its accessors are x() and y()."), out);
  // A switch expression on an enum without a case for one constant: the note names the constant.
  await setCode(page, 'public class Main {\n    enum Light { RED, YELLOW, GREEN }\n\n    public static void main(String[] args) {\n        Light light = Light.YELLOW;\n        String action = switch (light) {\n            case RED -> "stop";\n            case GREEN -> "go";\n        };\n        System.out.println(action);\n    }\n}\n');
  out = await check(page);
  expect(/line 6/i.test(out) && out.includes('the switch expression does not cover all possible input values') && out.includes('This switch expression on light has no case for YELLOW of the enum Light.'), out);
  // A recursion without a base case: the browser's JVM runs out of stack too, and the note names the method and the missing base case.
  await setCode(page, 'public class Main {\n    static int factorial(int n) {\n        return n * factorial(n - 1);\n    }\n\n    public static void main(String[] args) {\n        System.out.println(factorial(5));\n    }\n}\n');
  out = await check(page);
  expect(out.includes('StackOverflowError') && out.includes('factorial calls itself on line 3 (Main.java)') && out.includes('factorial has no base case') && out.includes('if (n <= 0) { return ...; }'), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test("playground: a JavaFX program runs with Java Arena's JavaFX on the class path, and its .arena files aren't listed as files it wrote", async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(
    page,
    'import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n' +
      '    @Override\n    public void start(Stage stage) {\n        Button button = new Button("Hi");\n        stage.setScene(new Scene(new VBox(button)));\n        stage.show();\n        System.out.println("start on " + Thread.currentThread().getName());\n    }\n\n' +
      '    @Override\n    public void stop() {\n        System.out.println("stop");\n    }\n\n    public static void main(String[] args) {\n        launch(Main.class);\n        System.out.println("launch returned");\n    }\n}\n',
  );
  const out = await check(page);
  expect(/start on JavaFX Application Thread\s+stop\s+launch returned/.test(out) && /Exit code 0/i.test(out), out);
  expect(!out.includes('.arena') && !out.includes('window.json') && !/files? it wrote/i.test(out), out);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// A JavaFX program for the window panel: a counter, a greeting from a text field (Enter greets too),
// a handler that throws, and a disabled button.
const FX_COUNTER =
  'import javafx.application.Application;\nimport javafx.geometry.Insets;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.control.Label;\nimport javafx.scene.control.TextField;\nimport javafx.scene.layout.HBox;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\n' +
  'public class Main extends Application {\n    private int clicks = 0;\n\n    @Override\n    public void start(Stage stage) {\n' +
  '        Label count = new Label("Clicks: 0");\n        Label greeting = new Label("Hello!");\n        TextField name = new TextField();\n        name.setPromptText("Your name");\n' +
  '        Button add = new Button("Add");\n        Button greet = new Button("Greet");\n        Button broken = new Button("Broken");\n        Button off = new Button("Off");\n        off.setDisable(true);\n' +
  '        add.setOnAction(e -> {\n            clicks++;\n            count.setText("Clicks: " + clicks);\n            System.out.println("clicked " + clicks);\n        });\n' +
  '        greet.setOnAction(e -> greeting.setText("Hello, " + name.getText() + "!"));\n        name.setOnAction(e -> greet.fire());\n' +
  '        broken.setOnAction(e -> {\n            String text = null;\n            System.out.println(text.length());\n        });\n' +
  '        VBox root = new VBox(10, count, new HBox(5, add, greet, broken, off), name, greeting);\n        root.setPadding(new Insets(10));\n' +
  '        stage.setTitle("Counter");\n        stage.setScene(new Scene(root));\n        stage.show();\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
/** Runs so far (the Playground counts every run, the window's own too). */
const runCount = (page) => page.locator('.workbench').getAttribute('data-checks').then(Number);
/** Waits for a run after `before` runs, and for the window panel to be done. */
async function nextRun(page, before) {
  await page.waitForFunction((n) => Number(document.querySelector('.workbench')?.getAttribute('data-checks')) > n && !document.querySelector('.fx-panel[aria-busy]'), before, { timeout: 120_000 });
}
const outputOf = (page) => page.locator('.results > pre.console').innerText();
const outlineOf = (page) => page.locator('.fx-panel details.fx-astext pre').textContent();

await test('playground: a JavaFX program draws its window; each click and typing runs it again with the events so far; Start over; a handler that throws shows in the console', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_COUNTER);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Counter' });
  await win.waitFor();
  const panel = await page.locator('.fx-panel').innerText();
  expect(panel.includes('Java Arena draws your window and runs your program again from the start each time you click, type, move a slider or use the mouse, with everything you did before.') && /drawn approximately/i.test(panel), panel);
  expect((await win.locator('.fx-title').innerText()) === 'Counter' && (await win.innerText()).includes('Clicks: 0'), await win.innerText());
  // Real buttons and fields, with accessible names; a disabled button is disabled.
  expect(await win.getByRole('button', { name: 'Off', exact: true }).isDisabled(), 'Off is disabled');
  const name = win.getByRole('textbox', { name: 'Your name' });
  expect((await name.getAttribute('placeholder')) === 'Your name', 'the prompt text is the placeholder');
  // A click runs the program again from the start with all the clicks so far.
  let n = await runCount(page);
  await win.getByRole('button', { name: 'Add', exact: true }).click();
  await nextRun(page, n);
  await win.getByText('Clicks: 1').waitFor();
  n = await runCount(page);
  await win.getByRole('button', { name: 'Add', exact: true }).click();
  await nextRun(page, n);
  await win.getByText('Clicks: 2').waitFor();
  expect((await outputOf(page)).trim() === 'clicked 1\nclicked 2', `the latest run printed both clicks: ${await outputOf(page)}`);
  // Typing, then a click: one run, with the typing first.
  n = await runCount(page);
  await name.click();
  await page.keyboard.type('Ada');
  await win.getByRole('button', { name: 'Greet', exact: true }).click();
  await nextRun(page, n);
  await win.getByText('Hello, Ada!').waitFor();
  await page.waitForTimeout(1500);
  expect((await runCount(page)) === n + 1, `typing then a click ran the program once, not ${(await runCount(page)) - n} times`);
  // Typing alone is sent once the learner pauses; then Enter fires the field's handler.
  n = await runCount(page);
  await name.click();
  await page.keyboard.press('End');
  await page.keyboard.type(' L');
  await nextRun(page, n);
  expect((await outlineOf(page)).includes('TextField "Ada L", prompt "Your name"') && (await name.inputValue()) === 'Ada L', await outlineOf(page));
  n = await runCount(page);
  await page.keyboard.press('Enter');
  await nextRun(page, n);
  await win.getByText('Hello, Ada L!').waitFor();
  expect((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Your name', 'the field keeps the keyboard focus across runs');
  // A handler that throws: printed in the console, explained, and the window goes on.
  n = await runCount(page);
  await win.getByRole('button', { name: 'Broken', exact: true }).click();
  await nextRun(page, n);
  const out = await outputOf(page);
  expect(out.includes('Exception in thread "JavaFX Application Thread" java.lang.NullPointerException') && out.includes('clicked 2'), out);
  const note = await page.locator('.results > .t-note').innerText();
  expect(/An event handler threw NullPointerException \(line \d+\)/.test(note) && /went on/.test(note) && !/stopped/.test(note), note);
  const heard = await page.locator('.workbench > p[role=status]').textContent();
  expect(!heard || !/stopped/.test(heard), `a handler's exception isn't announced as a stop: ${heard}`);
  expect((await win.innerText()).includes('Clicks: 2') && !(await page.locator('.fx-stale-note').count()), 'the window is still drawn and up to date');
  await shot(page, 'playground-window');
  // Keyboard focus is visible on the window's buttons.
  await name.focus();
  await page.keyboard.press('Shift+Tab');
  const ring = await page.evaluate(() => {
    const s = getComputedStyle(document.activeElement);
    return [document.activeElement.textContent, s.outlineStyle, s.outlineWidth, s.outlineColor];
  });
  expect(ring[0] === 'Broken' && ring[1] === 'solid' && ring[2] === '2px' && ring[3] === 'rgb(10, 95, 166)', `focus ring: ${ring}`);
  // Start over: no clicks or typing.
  n = await runCount(page);
  await page.getByRole('button', { name: 'Start over' }).click();
  await nextRun(page, n);
  await win.getByText('Clicks: 0').waitFor();
  expect((await name.inputValue()) === '' && (await outputOf(page)) === '(no output)', `after Start over: ${await name.inputValue()} ${await outputOf(page)}`);
  expect((await page.getByRole('button', { name: 'Start over' }).getAttribute('aria-disabled')) === 'true', 'Start over waits for a click');
  // A click, then the code changes: the window is out of date until the next run, which starts with no clicks.
  n = await runCount(page);
  await win.getByRole('button', { name: 'Add', exact: true }).click();
  await nextRun(page, n);
  await win.getByText('Clicks: 1').waitFor();
  await setCode(page, FX_COUNTER.replace('"Clicks: 0"', '"Count: 0"'));
  await page.locator('.fx-stale-note', { hasText: 'your code changed' }).waitFor();
  expect((await page.locator('.fx-panel button.fx-button').count()) === 0, 'an out-of-date window has no buttons to click');
  await check(page);
  await page.getByRole('group', { name: 'Window: Counter' }).getByText('Count: 0').waitFor();
  expect(!(await page.locator('.fx-stale-note').count()), 'a new run is up to date');
  // A compile error: the last window stays, marked out of date, and the note says why.
  await setCode(page, FX_COUNTER.replace('stage.show();', 'stage.show()'));
  const failed = await check(page);
  expect(/didn't compile/i.test(failed) && (await page.locator('.fx-stale-note', { hasText: "your code didn't compile" }).count()) === 1 && (await page.locator('.fx-panel .fx-window').count()) === 1, failed);
  // The out-of-date drawing's frame shows the keyboard focus (the site's ring, not the dashed mark).
  await page.locator('.fx-panel details.fx-astext > summary').focus();
  await page.keyboard.press('Shift+Tab');
  const frameRing = await page.evaluate(() => {
    const a = document.activeElement;
    const s = getComputedStyle(a);
    return [a.classList.contains('fx-scroll'), s.outlineStyle, s.outlineWidth];
  });
  expect(frameRing[0] && frameRing[1] === 'solid' && frameRing[2] === '2px', `the out-of-date frame's focus ring: ${frameRing}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// A JavaFX program for what happens while a run goes on: a counter, a shopping list whose field
// Enter empties, a name field a button empties, and a button that adds a node before itself.
const FX_BUSY =
  'import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.control.Label;\nimport javafx.scene.control.TextField;\nimport javafx.scene.layout.HBox;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\n' +
  'public class Main extends Application {\n    private int clicks = 0;\n\n    @Override\n    public void start(Stage stage) {\n' +
  '        Label count = new Label("Clicks: 0");\n        Label list = new Label("List:");\n        TextField item = new TextField();\n        item.setPromptText("Item");\n        TextField name = new TextField("Ada");\n        name.setPromptText("Name");\n' +
  '        Button add = new Button("Add");\n        Button clear = new Button("Clear name");\n        Button mark = new Button("Mark");\n        HBox row = new HBox(5, add, clear, mark);\n' +
  '        add.setOnAction(e -> {\n            clicks++;\n            count.setText("Clicks: " + clicks);\n        });\n' +
  '        item.setOnAction(e -> {\n            list.setText(list.getText() + " [" + item.getText() + "]");\n            item.clear();\n        });\n' +
  '        clear.setOnAction(e -> name.clear());\n        mark.setOnAction(e -> row.getChildren().add(0, new Label("*")));\n' +
  '        stage.setTitle("Busy");\n        stage.setScene(new Scene(new VBox(8, count, row, item, list, name)));\n        stage.show();\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
const busyPanel = (page) => page.locator('.fx-panel[aria-busy]').waitFor({ timeout: 30_000 });
/** Waits until no run is going on and none starts for a while (queued clicks, typing sent after a pause). */
async function settled(page) {
  for (let quiet = 0; quiet < 3; ) {
    await page.waitForTimeout(400);
    quiet = (await page.locator('.fx-panel[aria-busy]').count()) ? 0 : quiet + 1;
  }
}

await test('playground: the window during a run: clicks wait their turn, typing keeps what the run did to the field, Run waits, the focus stays on its button; a start that throws shows no window', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_BUSY);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Busy' });
  await win.waitFor();
  // Three quick clicks: each one is sent, one run after another.
  const add = win.getByRole('button', { name: 'Add', exact: true });
  let n = await runCount(page);
  await add.click();
  await add.click();
  await add.click();
  await win.getByText('Clicks: 3').waitFor({ timeout: 60_000 });
  await settled(page);
  expect((await runCount(page)) === n + 3 && !(await page.locator('.fx-message').count()), `three clicks: ${(await runCount(page)) - n} runs, ${await win.innerText()}`);
  // Enter empties the field; what is typed while that run goes on is sent on its own, not after the old text.
  const item = win.getByRole('textbox', { name: 'Item' });
  await item.click();
  await page.keyboard.type('milk');
  await page.keyboard.press('Enter');
  await busyPanel(page);
  await page.keyboard.type('eggs');
  await settled(page);
  await page.keyboard.press('Enter');
  await win.getByText('List: [milk] [eggs]').waitFor({ timeout: 60_000 });
  await settled(page);
  // A button empties a field that had no typing; typing during that run is all the field gets.
  const name = win.getByRole('textbox', { name: 'Name' });
  await win.getByRole('button', { name: 'Clear name', exact: true }).click();
  await busyPanel(page);
  await name.click();
  await page.keyboard.press('End');
  await page.keyboard.type('Bo');
  await settled(page);
  expect((await outlineOf(page)).includes('TextField "Bo", prompt "Name"') && (await name.inputValue()) === 'Bo', await outlineOf(page));
  // Run pressed while the window runs the program for a click waits for it, then runs.
  n = await runCount(page);
  await add.click();
  await busyPanel(page);
  await page.click('#check');
  expect((await page.locator('#check').innerText()).includes('Waiting'), await page.locator('#check').innerText());
  await page.waitForFunction((k) => Number(document.querySelector('.workbench')?.getAttribute('data-checks')) >= k + 2, n, { timeout: 120_000 });
  await settled(page);
  await win.getByText('Clicks: 4').waitFor();
  // A button whose handler adds a node before it keeps the keyboard focus.
  n = await runCount(page);
  await win.getByRole('button', { name: 'Mark', exact: true }).focus();
  await page.keyboard.press('Enter');
  await nextRun(page, n);
  await settled(page);
  expect((await win.innerText()).includes('*'), await win.innerText());
  expect((await page.evaluate(() => document.activeElement?.textContent)) === 'Mark', `the focus after the click: ${await page.evaluate(() => document.activeElement?.outerHTML)}`);
  expect(errors.length === 0, errors.join('\n'));
  // A start that throws on the first run (after Example, which forgets the window): the panel says no window is open, and why.
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Example' }).click();
  await page.locator('.fx-panel').waitFor({ state: 'detached' });
  await setCode(page, FX_BUSY.replace('stage.show();', 'stage.show();\n        throw new IllegalStateException("not yet");'));
  await check(page);
  await page.locator('.fx-panel .fx-none', { hasText: 'No window is open.' }).waitFor();
  const panel = await page.locator('.fx-panel').innerText();
  expect(panel.includes('ended before it left a window') && !(await page.locator('.fx-panel .fx-window').count()), panel);
  // start did call show(): the panel doesn't ask for it.
  expect(!panel.includes('stage.show()'), panel);
  await axe(page, 'a window panel with no window');
  // A program that never calls launch: the same.
  await setCode(page, FX_BUSY.replace('launch(args);', 'System.out.println("no launch");'));
  await check(page);
  await page.locator('.fx-panel .fx-none', { hasText: 'No window is open.' }).waitFor();
  expect((await page.locator('.fx-panel').innerText()).includes('main must call launch, as in launch(Main.class)'), await page.locator('.fx-panel').innerText());
  // A start that never shows the stage leaves a window file with no window: the panel says start must call stage.show().
  await setCode(page, FX_BUSY.replace('stage.show();', ''));
  await check(page);
  await page.locator('.fx-panel .fx-stale-note', { hasText: 'start must show the stage with stage.show()' }).waitFor();
  expect(!(await page.locator('.fx-panel').innerText()).includes('ended before it left a window'), await page.locator('.fx-panel').innerText());
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// A wide window: a TextArea is 546 px wide by default, so it can't fit a phone.
const FX_WIDE =
  'import javafx.application.Application;\nimport javafx.geometry.Insets;\nimport javafx.scene.Scene;\nimport javafx.scene.control.*;\nimport javafx.scene.layout.*;\nimport javafx.stage.Stage;\n\n' +
  'public class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n        GridPane form = new GridPane();\n        form.setHgap(6);\n        form.setVgap(4);\n' +
  '        form.add(new Label("Name"), 0, 0);\n        form.add(new TextField("Ada"), 1, 0);\n        form.add(new Label("Code"), 0, 1);\n        form.add(new PasswordField(), 1, 1);\n' +
  '        TextArea notes = new TextArea("First line");\n        notes.setWrapText(true);\n        form.add(notes, 0, 2, 2, 1);\n        FlowPane tags = new FlowPane(new Button("java"), new Button("fx"), new Button("gui"));\n        tags.setHgap(4);\n' +
  '        Button save = new Button("Save");\n        save.setDisable(true);\n        BorderPane root = new BorderPane(new VBox(6, form, tags));\n        root.setTop(new Label("Notes"));\n        root.setBottom(new HBox(6, save, new Label("Not saved")));\n' +
  '        root.setRight(new StackPane(new Label("New")));\n        root.setPadding(new Insets(8));\n        stage.setTitle("Notes");\n        stage.setScene(new Scene(root));\n        stage.show();\n    }\n\n' +
  '    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';

await test('playground: the window panel passes axe in both themes; on a 320 px phone a wide window scrolls inside its frame, not the page', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_WIDE);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Notes' });
  await win.waitFor();
  // Every field has a name: the prompt text, else its kind and number as event lines count them.
  for (const field of ['Text field 1', 'Password field 1', 'Text area 1']) expect((await win.getByRole('textbox', { name: field }).count()) === 1, `a field named ${field}`);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    // The window keeps its own light colors in both themes.
    const bg = await win.evaluate((w) => getComputedStyle(w).backgroundColor);
    expect(bg === 'rgb(244, 244, 244)', `${colorScheme}: the window is ${bg}`);
    await axe(page, `the window panel, ${colorScheme} theme`);
    await shot(page, `playground-window-${colorScheme}`);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, 'a wide window at 320 px');
  const frame = await page.locator('.fx-panel .fx-scroll').evaluate((e) => [e.scrollWidth, e.clientWidth]);
  expect(frame[0] > frame[1], `the window scrolls inside its frame: ${frame}`);
  // The frame says so: the note under it shows, until the window fits again.
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.waitForFunction(() => document.querySelector('.fx-panel .fx-frame')?.hasAttribute('data-wide'));
    const [f] = await frames(page);
    expect(f.wide && f.noted && !f.end, `${width} px: a wide window's frame doesn't say it scrolls: ${JSON.stringify(f)}`);
    expect((await page.locator('.fx-panel .fx-wide-note').innerText()) === 'This window is wider than the screen: scroll it sideways, or read it as text below.', await page.locator('.fx-panel .fx-wide-note').innerText());
    // Scrolled to the end, the fade goes (the note stays).
    await page.locator('.fx-panel .fx-scroll').evaluate((e) => e.scrollTo({ left: e.scrollWidth }));
    await page.waitForFunction(() => document.querySelector('.fx-panel .fx-frame')?.hasAttribute('data-end'));
    await page.locator('.fx-panel .fx-scroll').evaluate((e) => e.scrollTo({ left: 0 }));
    await page.waitForFunction(() => !document.querySelector('.fx-panel .fx-frame')?.hasAttribute('data-end'));
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
      await axe(page, `the window panel at ${width} px, ${colorScheme} theme`);
    }
  }
  await shot(page, 'playground-window-320');
  // A small window fits a 320 px phone: no note.
  await page.setViewportSize({ width: 320, height: 800 });
  await setCode(page, FX_COUNTER);
  await check(page);
  await page.getByRole('group', { name: 'Window: Counter' }).waitFor();
  const [fits] = await frames(page);
  expect(!fits.wide && !fits.noted && !fits.data, `a window that fits has the note: ${JSON.stringify(fits)}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// Part 13 lesson pages with windows, picked from the build's own module files by what they hold.
/** The windows a step's lesson text shows (its ```window blocks, which the build wrote after each java window example). */
const windowBlocks = (step) => [...step.text.matchAll(/```window\n([^\n]*)\n```/g)].map((m) => JSON.parse(m[1]));
/** A GUI challenge to work on: a code challenge whose first visible test types in text fields and clicks a button. */
const guiChallenge = (() => {
  for (const id of ['gui-events', 'gui-views']) {
    const found = challengesOf(moduleOf(id)).find(({ ex }) => {
      const shown = ex.kind === 'code' && ex.tests.find((t) => !t.hidden && t.events);
      const events = shown ? shown.events.map(parseEventLine) : [];
      return events.length >= 2 && events.every((e) => (e.command === 'type' && e.target?.kind === 'index' && e.target.type === 'TextField') || (e.command === 'click' && e.target?.kind === 'text' && e.target.type === 'Button'));
    });
    if (found) return { moduleId: id, ...found, shown: found.ex.tests.find((t) => !t.hidden && t.events) };
  }
  return null;
})();

/** Puts a program in the editor: each file in its tab when the challenge has several. */
async function setProgram(page, code) {
  if ((await tabPaths(page)).length) await setFiles(page, code);
  else await setCode(page, code);
}

await test('a java window example in a lesson: drawn after its clicks, with the window as text; the pre-rendered page has the same figures', async () => {
  // The first step of module 49 whose lesson text has a window drawn after a click.
  const step = moduleOf('gui-events').steps.find((s) => windowBlocks(s).some((b) => b.events.length > 0));
  expect(step, 'no lesson text in module 49 has a window after clicks');
  const blocks = windowBlocks(step);
  const k = blocks.findIndex((b) => b.events.length > 0);
  const block = blocks[k];
  const labels = [...block.outline.matchAll(/^\s*(?:\w+: )?(?:Label|Button) "([^"]*)"/gm)].map((m) => m[1]).filter(Boolean);
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/gui-events/${step.slug}/`);
  await lessonReady(page);
  const figures = page.locator('article.step-text figure.fx-figure');
  expect((await figures.count()) === blocks.length, `${await figures.count()} windows in the lesson text, not ${blocks.length}`);
  const figure = figures.nth(k);
  // The clicks in words, then the window drawn: its title bar and the texts of its labels and buttons.
  expect((await figure.locator('.fx-events').innerText()) === `After: ${describeEvents(block.events)}`, await figure.locator('.fx-events').innerText());
  const title = block.window.windows[0].title;
  if (title) expect((await figure.locator('.fx-window .fx-title').first().innerText()) === title, `title bar: ${await figure.locator('.fx-title').first().innerText()}`);
  const drawn = await figure.locator('.fx-window').first().innerText();
  expect(labels.length > 0 && labels.every((l) => drawn.includes(l)), `drawn: ${drawn}; labels and buttons: ${labels}`);
  // A drawing in the lesson text can't be clicked: no real buttons or fields in it.
  expect((await figure.locator('.fx-window button, .fx-window input, .fx-window textarea').count()) === 0, 'a lesson window has controls');
  // The window as text: closed, then the outline the build stored.
  const details = figure.locator('details.fx-astext');
  expect((await details.getAttribute('open')) === null, 'the window as text starts closed');
  await details.locator('summary').click();
  expect((await details.locator('pre').innerText()) === block.outline, `as text: ${await details.locator('pre').innerText()}`);
  expect(errors.length === 0, errors.join('\n'));
  // The pre-rendered page (before any script runs) has the same figures, with the same words and outline.
  const html = await (await page.request.get(BASE + `learn/gui-events/${step.slug}/`)).text();
  const decode = (t) => t.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const prerendered = html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [];
  expect(prerendered.length === blocks.length, `${prerendered.length} windows in the pre-rendered page, not ${blocks.length}`);
  const fig = prerendered[k];
  const after = decode(fig.match(/<p class="fx-events">([\s\S]*?)<\/p>/)?.[1] ?? '');
  expect(after === `After: ${describeEvents(block.events)}`, `the pre-rendered figure's clicks: ${after}`);
  expect(/class="fx-window/.test(fig) && /<details class="fx-astext"><summary>The window as text<\/summary>/.test(fig), `the pre-rendered figure: ${fig.slice(0, 300)}`);
  const preText = decode(fig.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/)?.[1] ?? '');
  expect(preText === block.outline, `the pre-rendered window as text: ${preText}`);
  // On a phone: a window wider than the column says so under its frame (a window that fits doesn't), and the
  // window as text wraps its long lines instead of cutting them off. Module 48 has windows with text areas.
  for (const [moduleId, slug] of [['gui-events', step.slug], ...moduleOf('gui-basics').steps.filter((s) => windowBlocks(s).length).slice(0, 4).map((s) => ['gui-basics', s.slug])]) {
    await page.goto(BASE + `learn/${moduleId}/${slug}/`);
    await lessonReady(page);
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await page.waitForFunction(() => [...document.querySelectorAll('.fx-frame')].every((f) => { const s = f.querySelector('.fx-scroll'); return (s.scrollWidth > s.clientWidth + 1) === f.hasAttribute('data-wide'); }));
      const fs = await frames(page);
      expect(fs.length > 0 && fs.every((f) => f.wide === f.noted), `${moduleId}/${slug} at ${width} px: ${JSON.stringify(fs)}`);
      const closed = page.locator('article.step-text details.fx-astext:not([open]) > summary');
      while (await closed.count()) await closed.first().click();
      await outlinesWrap(page, `${moduleId}/${slug} at ${width} px`);
      expect((await page.locator('article.step-text details.fx-astext pre').first().innerText()) === windowBlocks(moduleOf(moduleId).steps.find((s) => s.slug === slug))[0].outline, 'the wrapped window as text is still the outline');
      await noOverflow(page, `${moduleId}/${slug} at ${width} px`);
    }
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('a window challenge: the task card shows the clicks and typing and the window; a wrong program shows both windows with the differing lines marked; axe in both themes and at 320 px; the model solution passes', async () => {
  expect(guiChallenge, 'no code challenge in modules 49 and 50 types in text fields and clicks a button in its first visible test');
  const { moduleId, ex, shown } = guiChallenge;
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, moduleId, guiChallenge);
  // The task card: the clicks and typing in words, and the window the model solution leaves, drawn and as text.
  const card = page.locator('.task-card');
  expect((await card.locator('.task-events').innerText()) === describeEvents(shown.events), await card.locator('.task-events').innerText());
  const expected = card.locator('.fx-figure');
  expect((await expected.locator('.fx-window').count()) === shown.window.windows.length, `${await expected.locator('.fx-window').count()} windows drawn on the task card`);
  if (shown.window.windows[0].title) expect((await expected.locator('.fx-title').first().innerText()) === shown.window.windows[0].title, await expected.locator('.fx-title').first().innerText());
  expect((await expected.locator('details.fx-astext pre').textContent()) === shown.outline, `the task card's window as text: ${await expected.locator('details.fx-astext pre').textContent()}`);
  // The starter program fails on the window: both windows drawn, and the lines that differ marked on each side.
  const out = await check(page);
  expect(out.includes('Not yet'), out);
  const failed = page.locator('.t-fail', { hasText: shown.name }).first();
  const cmp = failed.locator('.fx-compare');
  expect((await cmp.count()) === 1, `no window comparison for ${shown.name}: ${out}`);
  expect((await failed.locator('.t-events').innerText()).includes(describeEvents(shown.events)), await failed.locator('.t-events').innerText());
  const [should, yours] = [cmp.locator(':scope > div').nth(0), cmp.locator(':scope > div').nth(1)];
  expect((await should.locator('.lbl').first().innerText()).match(/the window should look like/i) && (await yours.locator('.lbl').first().innerText()).match(/your window/i), await cmp.innerText());
  expect((await cmp.locator('.fx-window').count()) === 2, `${await cmp.locator('.fx-window').count()} windows drawn in the comparison`);
  const marked = async (side) => (await side.locator('mark.fx-differs').allTextContents()).map((t) => t.replace(/^Differs: /, ''));
  const shouldMarks = await marked(should);
  const yourMarks = await marked(yours);
  const outlineLines = shown.outline.split('\n');
  expect(shouldMarks.length > 0 && shouldMarks.every((l) => outlineLines.includes(l)), `marked in the expected window: ${shouldMarks}`);
  const yourLines = (await yours.locator('details.fx-astext pre').textContent()).replace(/Differs: /g, '').split('\n');
  expect(yourMarks.length > 0 && yourMarks.every((l) => yourLines.includes(l) && !outlineLines.includes(l)), `marked in your window: ${yourMarks}`);
  expect((await cmp.locator('.fx-legend').innerText()).includes('The lines that differ are highlighted.'), await cmp.innerText());
  // A hidden test says only which clicks it made: never the window it expects.
  const seen = new Set([...ex.tests.filter((t) => !t.hidden && t.outline).flatMap((t) => t.outline.split('\n')), ...yourLines]);
  for (const t of ex.tests.filter((t) => t.hidden && t.outline)) {
    for (const line of t.outline.split('\n').filter((l) => !seen.has(l) && /"/.test(l))) expect(!out.includes(line.trim()), `a hidden test's window is shown: ${line}`);
  }
  expect((await page.locator('.t-fail .fx-compare').count()) <= ex.tests.filter((t) => !t.hidden && t.events).length, 'a hidden test shows a window comparison');
  // axe on the lesson's windows, the task card and the failed results, in both themes; then on a 320 px phone.
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `a failed window challenge, ${colorScheme} theme`);
    await shot(page, `window-challenge-failed-${colorScheme}`);
  }
  await page.setViewportSize({ width: 320, height: 800 });
  // Every window as text opened: a long outline line wraps under its own start, so its box never scrolls, nor the page.
  const closed = page.locator('details.fx-astext:not([open]) > summary');
  while (await closed.count()) await closed.first().click();
  await noOverflow(page, 'a failed window challenge at 320 px, every window as text open');
  await outlinesWrap(page, 'a failed window challenge at 320 px');
  expect((await page.locator('.task-card details.fx-astext pre').textContent()) === shown.outline, 'the task card\'s wrapped window as text is still the outline');
  // A frame says it scrolls exactly when its windows are wider than it.
  const phoneFrames = await frames(page);
  expect(phoneFrames.every((f) => f.wide === f.noted), `frames at 320 px: ${JSON.stringify(phoneFrames)}`);
  const scrollers = await page.locator('.fx-scroll').evaluateAll((els) => els.map((e) => ({ scrolls: e.scrollWidth > e.clientWidth, tabindex: e.getAttribute('tabindex') })));
  expect(scrollers.length > 0 && scrollers.filter((f) => f.scrolls).every((f) => f.tabindex === '0'), `a window frame scrolls but can't take the focus: ${JSON.stringify(scrollers)}`);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `a failed window challenge at 320 px, ${colorScheme} theme`);
  }
  await shot(page, 'window-challenge-failed-320');
  await page.setViewportSize({ width: 1280, height: 900 });
  // The model solution passes every test, the windows included.
  await setProgram(page, ex.solution);
  const passed = await check(page);
  expect(passed.includes('All tests passed') && !(await page.locator('.fx-compare').count()), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('a window challenge\'s "Run with my input": the window takes the task\'s typing and clicks, each click runs the program again, and it ends as the task card shows', async () => {
  expect(guiChallenge, 'no GUI challenge to run');
  const { moduleId, ex, shown } = guiChallenge;
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, moduleId, guiChallenge);
  await setProgram(page, ex.solution);
  await page.getByRole('button', { name: 'Run with my input' }).click();
  let n = await runCount(page);
  await page.locator('.freerun button', { hasText: /^\s*Run\s*$/ }).click();
  await nextRun(page, n);
  const title = shown.window.windows[0].title;
  const win = page.locator('.freerun').getByRole('group', { name: title ? `Window: ${title}` : 'Window without a title' });
  await win.waitFor();
  expect((await page.locator('.freerun .fx-panel').innerText()).includes('Java Arena draws your window and runs your program again from the start each time you click, type, move a slider or use the mouse, with everything you did before.'), await page.locator('.freerun .fx-panel').innerText());
  // The test's events, made by hand: typing goes into the K-th text field, a click on the button with that text.
  for (const line of shown.events) {
    const e = parseEventLine(line);
    if (e.command === 'type') {
      const field = win.getByRole('textbox').nth(e.target.index - 1);
      await field.click();
      await page.keyboard.type(e.text);
    } else {
      n = await runCount(page);
      await win.getByRole('button', { name: e.target.text, exact: true }).click();
      await nextRun(page, n);
    }
  }
  await settled(page);
  const outline = await page.locator('.freerun .fx-panel details.fx-astext pre').textContent();
  expect(outline === shown.outline, `the window after the task's clicks and typing:\n${outline}\nnot\n${shown.outline}`);
  const printed = (await page.locator('.freerun .results > pre.console').innerText()).trim();
  expect(printed === (shown.expect.trim() || '(no output)'), `printed: ${printed}`);
  expect(!(await page.locator('.freerun .fx-stale-note').count()), 'the window is up to date');
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `a lesson's window panel, ${colorScheme} theme`);
    await shot(page, `lesson-window-panel-${colorScheme}`);
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// ------------------------------------------------------------------ images (content/assets)

/** The test a challenge's task card shows (as TaskCard and the content build pick it). */
const cardTest = (ex) => ex.tests.find((t) => !t.hidden && t.events) ?? ex.tests.find((t) => !t.hidden && t.writes) ?? ex.tests.find((t) => !t.hidden && t.expect);
/** A lesson step with an ```asset block in its text, and a code challenge whose task card shows an image it gives the program: the first of each in the course. */
const imageLessons = (() => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  let step = null;
  let challenge = null;
  for (const m of course.modules) {
    const mod = moduleOf(m.id);
    step ??= ((s) => s && { moduleId: m.id, step: s })(mod.steps.find((s) => /^```asset /m.test(s.text)));
    challenge ??= ((c) => c && { moduleId: m.id, ...c, shown: cardTest(c.ex) })(challengesOf(mod).find(({ ex }) => ex.kind === 'code' && Object.values(cardTest(ex)?.files ?? {}).some((v) => typeof v !== 'string')));
  }
  return { step, challenge, assets: course.assets };
})();
/** The images on the page under `scope`: each loaded, with its size in pixels and its alt text. */
const imagesIn = (scope) => scope.locator('img.asset-img').evaluateAll((els) => els.map((e) => ({ src: e.getAttribute('src'), loaded: e.complete && e.naturalWidth > 0, w: e.naturalWidth, h: e.naturalHeight, alt: e.alt, drawnW: e.getBoundingClientRect().width })));

await test('images in lessons: an asset block draws its image with its name and size (the pre-rendered page too); a challenge\'s image is on its task card and in the results, never as text; Run with my input gives it to the program; the model solution passes', async () => {
  const { step, challenge } = imageLessons;
  if (!step && !challenge) {
    console.log('       (skipped: no lesson gives a program an image of content/assets yet)');
    return;
  }
  const { ctx, page, errors } = await newPage();
  if (step) {
    const blocks = [...step.step.text.matchAll(/^```asset (\S+)\n(.*)\n```$/gm)].map((m) => JSON.parse(m[2]));
    await page.goto(BASE + `learn/${step.moduleId}/${step.step.slug}/`);
    await lessonReady(page);
    const figures = page.locator('article.step-text figure.asset-figure');
    await page.waitForFunction((n) => [...document.querySelectorAll('article.step-text figure.asset-figure img')].filter((i) => i.complete && i.naturalWidth > 0).length >= n, blocks.length);
    expect((await figures.count()) === blocks.length, `${await figures.count()} images drawn for ${blocks.length} asset blocks`);
    const shown = await imagesIn(page.locator('article.step-text'));
    blocks.forEach((b, k) => {
      const caption = shown[k];
      expect(caption.loaded && caption.w === b.image.width && caption.h === b.image.height && caption.alt === b.image.alt, `image ${b.name}: ${JSON.stringify(caption)}`);
      expect(caption.drawnW >= b.image.width * 2 || b.image.width > 128, `image ${b.name} isn't drawn larger: ${caption.drawnW} px`);
    });
    const captions = await figures.allInnerTexts();
    blocks.forEach((b, k) => expect(captions[k].includes(b.name) && captions[k].includes(`${b.image.width} x ${b.image.height} pixels`), `caption ${captions[k]}`));
    // The pre-rendered page draws the same images.
    const html = await (await fetch(BASE + `learn/${step.moduleId}/${step.step.slug}/`)).text();
    for (const b of blocks) expect(html.includes(`<img src="${new URL(BASE).pathname}${b.image.url}"`), `pre-rendered page lacks ${b.image.url}`);
    for (const b of blocks) expect((await fetch(BASE + b.image.url)).status === 200, `${b.image.url} isn't served`);
  }
  if (challenge) {
    const { moduleId, ex, shown } = challenge;
    const images = Object.entries(shown.files).filter(([, v]) => typeof v !== 'string');
    await openChallenge(page, moduleId, challenge);
    const card = page.locator('.task-card');
    await page.waitForFunction((n) => [...document.querySelectorAll('.task-card img.asset-img')].filter((i) => i.complete && i.naturalWidth > 0).length >= n, images.length);
    const onCard = await imagesIn(card);
    expect(onCard.length === images.length && images.every(([, v], k) => onCard[k].w === v.width && onCard[k].alt === v.alt), `task card images: ${JSON.stringify(onCard)}`);
    const cardText = await card.innerText();
    for (const [name] of images) expect(new RegExp(`The image\\s+${name.replace('.', '\\.')}`, 'i').test(cardText), `the task card names ${name}: ${cardText}`);
    // The starter program fails; the results show the visible test's image as an image, and no file as text.
    const out = await check(page);
    expect(out.includes('Not yet'), out);
    expect(!/PNG|�|IHDR/.test(out), `an image shown as text in the results: ${out}`);
    const failedShown = page.locator('.t-fail', { hasText: shown.name }).first();
    if (await failedShown.count()) expect((await imagesIn(failedShown)).length === images.length, 'the failed test shows its images');
    // "Run with my input" gives the program the same images; they aren't listed as files it wrote.
    await setProgram(page, ex.solution);
    await page.getByRole('button', { name: 'Run with my input' }).click();
    expect((await page.locator('.freerun').innerText()).includes(`The program can also read ${Object.keys(shown.files).join(' and ')}`), await page.locator('.freerun').innerText());
    const n = await runCount(page);
    await page.locator('.freerun button', { hasText: /^\s*Run\s*$/ }).click();
    await nextRun(page, n);
    await settled(page);
    const freeRun = await page.locator('.freerun .results').innerText();
    expect(!/after the run/i.test(freeRun) && !/PNG|�/.test(freeRun), `the free run lists or shows the image: ${freeRun}`);
    expect(!/couldn't be (loaded|downloaded)|didn't start|crashed/i.test(freeRun), freeRun);
    const passed = await check(page);
    expect(passed.includes('All tests passed'), passed);
    await page.setViewportSize({ width: 320, height: 800 });
    await noOverflow(page, 'a challenge with an image at 320 px');
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
      await axe(page, `a challenge with an image at 320 px, ${colorScheme} theme`);
      await shot(page, `image-challenge-${colorScheme}`);
    }
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: Add a sample image puts one of the site\'s images in the program\'s folder; a JavaFX program reads its pixels; the image isn\'t listed as written, a binary file it writes isn\'t shown as text; it is saved and shared; axe in both themes and at 320 px', async () => {
  const assets = imageLessons.assets ?? [];
  expect(assets.length > 0 && assets.some((a) => a.asset === 'tiny.png'), `the course lists the sample images: ${assets.map((a) => a.asset)}`);
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  const add = page.getByRole('button', { name: 'Add a sample image' });
  await add.click();
  expect((await add.getAttribute('aria-expanded')) === 'true', 'the list opens');
  const list = page.locator('#pg-sample-list');
  expect((await list.getByRole('button').count()) === assets.length, `${await list.getByRole('button').count()} images offered`);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `playground with the sample list open, ${colorScheme} theme`);
  }
  await list.getByRole('button', { name: /tiny\.png/ }).click();
  expect(!(await list.count()), 'the list closes');
  expect((await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Add a sample image'), 'the focus goes back to Add a sample image');
  await page.waitForFunction(() => [...document.querySelectorAll('.pg-samples img.asset-img')].some((i) => i.complete && i.naturalWidth === 6));
  expect((await page.locator('.pg-samples').innerText()).includes('tiny.png'), await page.locator('.pg-samples').innerText());
  await setCode(
    page,
    'import java.nio.file.Files;\nimport java.nio.file.Path;\nimport javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.image.Image;\nimport javafx.scene.image.ImageView;\nimport javafx.scene.layout.StackPane;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n' +
      '    @Override\n    public void start(Stage stage) throws Exception {\n        Image image = new Image("file:tiny.png");\n        System.out.println((int) image.getWidth() + " x " + (int) image.getHeight() + " " + Integer.toHexString(image.getPixelReader().getArgb(0, 0)) + " " + image.getPixelReader().getColor(5, 3));\n' +
      '        Files.write(Path.of("copy.png"), Files.readAllBytes(Path.of("tiny.png")));\n        stage.setScene(new Scene(new StackPane(new ImageView(image))));\n        stage.show();\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n',
  );
  const out = await check(page);
  expect(out.includes('6 x 4 ffff0000 0x2e8b57ff'), out);
  const written = await page.locator('.written-files').innerText();
  expect(/copy\.png after the run/i.test(written) && written.includes("120 bytes that aren't text: a PNG image of 6 x 4 pixels") && !/tiny\.png/.test(written), `written files: ${written}`);
  expect(!/�|IHDR/.test(await page.locator('.results').innerText()), 'a binary file shown as text');
  // Saved with the program: a reload keeps it.
  await page.reload();
  await lessonReady(page);
  await page.locator('.pg-samples', { hasText: 'tiny.png' }).waitFor();
  // A share link carries it.
  await page.getByRole('button', { name: 'Share' }).click();
  const link = await page.locator('#pg-link').inputValue();
  const other = await newPage();
  await other.page.goto(link);
  await lessonReady(other.page);
  await other.page.locator('.pg-samples', { hasText: 'tiny.png' }).waitFor();
  await other.ctx.close();
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, 'playground with a sample image at 320 px');
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `playground with a sample image at 320 px, ${colorScheme} theme`);
    await shot(page, `playground-sample-image-${colorScheme}`);
  }
  // Remove takes it out of the folder; the focus goes back to Add a sample image.
  await page.getByRole('button', { name: 'Remove tiny.png' }).click();
  expect(!(await page.locator('.pg-samples').count()), 'removed');
  expect((await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Add a sample image'), 'the focus after Remove');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// ------------------------------------------------------------------ part 14: charts, sliders, canvases and images in the window panel

const fxProgram = (imports, body) => imports.map((i) => `import ${i};\n`).join('') + '\npublic class Main extends Application {\n' + body.join('\n') + '\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n';
// A slider whose value redraws a line chart: k times x, next to x squared.
const FX_CHART = fxProgram(
  ['javafx.application.Application', 'javafx.scene.Scene', 'javafx.scene.chart.LineChart', 'javafx.scene.chart.NumberAxis', 'javafx.scene.chart.XYChart', 'javafx.scene.control.Label', 'javafx.scene.control.Slider', 'javafx.scene.layout.VBox', 'javafx.stage.Stage'],
  [
    '    @Override',
    '    public void start(Stage stage) {',
    '        NumberAxis x = new NumberAxis(0, 10, 1);',
    '        x.setLabel("x");',
    '        NumberAxis y = new NumberAxis();',
    '        y.setLabel("y");',
    '        LineChart<Number, Number> chart = new LineChart<>(x, y);',
    '        chart.setTitle("Lines");',
    '        Slider slider = new Slider(1, 5, 2);',
    '        slider.setShowTickMarks(true);',
    '        slider.setShowTickLabels(true);',
    '        slider.setMajorTickUnit(1);',
    '        slider.setMinorTickCount(1);',
    '        slider.setBlockIncrement(0.5);',
    '        Label label = new Label("k = 2.0");',
    '        draw(chart, 2);',
    '        slider.valueProperty().addListener((obs, old, now) -> {',
    '            label.setText("k = " + now);',
    '            draw(chart, now.doubleValue());',
    '        });',
    '        stage.setTitle("Chart");',
    '        stage.setScene(new Scene(new VBox(10, label, slider, chart)));',
    '        stage.show();',
    '    }',
    '',
    '    private void draw(LineChart<Number, Number> chart, double k) {',
    '        XYChart.Series<Number, Number> line = new XYChart.Series<>();',
    '        line.setName("k times x");',
    '        XYChart.Series<Number, Number> square = new XYChart.Series<>();',
    '        square.setName("x squared");',
    '        for (int i = 0; i <= 10; i++) {',
    '            line.getData().add(new XYChart.Data<>(i, k * i));',
    '            square.getData().add(new XYChart.Data<>(i, i * i));',
    '        }',
    '        chart.getData().setAll(line, square);',
    '    }',
  ],
);
// A canvas drawn on with the mouse: a line along each drag, a red dot at each click.
const FX_DRAW = fxProgram(
  ['javafx.application.Application', 'javafx.scene.Scene', 'javafx.scene.canvas.Canvas', 'javafx.scene.canvas.GraphicsContext', 'javafx.scene.control.Label', 'javafx.scene.layout.VBox', 'javafx.scene.paint.Color', 'javafx.stage.Stage'],
  [
    '    private double lastX;',
    '    private double lastY;',
    '    private int clicks;',
    '',
    '    @Override',
    '    public void start(Stage stage) {',
    '        Canvas canvas = new Canvas(240, 160);',
    '        GraphicsContext g = canvas.getGraphicsContext2D();',
    '        g.setFill(Color.WHITE);',
    '        g.fillRect(0, 0, 240, 160);',
    '        g.setStroke(Color.DARKBLUE);',
    '        g.setLineWidth(3);',
    '        Label info = new Label("Draw with the mouse");',
    '        canvas.setOnMousePressed(e -> {',
    '            lastX = e.getX();',
    '            lastY = e.getY();',
    '        });',
    '        canvas.setOnMouseDragged(e -> {',
    '            g.strokeLine(lastX, lastY, e.getX(), e.getY());',
    '            lastX = e.getX();',
    '            lastY = e.getY();',
    '        });',
    '        canvas.setOnMouseClicked(e -> {',
    '            clicks++;',
    '            g.setFill(Color.CRIMSON);',
    '            g.fillOval(e.getX() - 4, e.getY() - 4, 8, 8);',
    '            info.setText("Clicks: " + clicks);',
    '        });',
    '        stage.setTitle("Draw");',
    '        stage.setScene(new Scene(new VBox(6, info, canvas)));',
    '        stage.show();',
    '    }',
  ],
);
// An image of the folder and its negative, made pixel by pixel.
const FX_IMAGE = fxProgram(
  ['javafx.application.Application', 'javafx.scene.Scene', 'javafx.scene.image.Image', 'javafx.scene.image.ImageView', 'javafx.scene.image.PixelReader', 'javafx.scene.image.PixelWriter', 'javafx.scene.image.WritableImage', 'javafx.scene.layout.HBox', 'javafx.stage.Stage'],
  [
    '    @Override',
    '    public void start(Stage stage) {',
    '        Image image = new Image("file:landscape.png");',
    '        PixelReader reader = image.getPixelReader();',
    '        int w = (int) image.getWidth();',
    '        int h = (int) image.getHeight();',
    '        WritableImage negative = new WritableImage(w, h);',
    '        PixelWriter writer = negative.getPixelWriter();',
    '        for (int y = 0; y < h; y++) {',
    '            for (int x = 0; x < w; x++) {',
    '                writer.setColor(x, y, reader.getColor(x, y).invert());',
    '            }',
    '        }',
    '        System.out.println(w + " x " + h + ", first pixel " + Integer.toHexString(reader.getArgb(0, 0)) + ", last " + Integer.toHexString(negative.getPixelReader().getArgb(w - 1, h - 1)));',
    '        stage.setTitle("Negative");',
    '        stage.setScene(new Scene(new HBox(10, new ImageView(image), new ImageView(negative))));',
    '        stage.show();',
    '    }',
  ],
);
/** The window panel alone, as a screenshot (with --shots). */
async function panelShot(page, name) {
  if (SHOTS) await page.locator('.fx-panel').screenshot({ path: `${SHOTS}/${name}.png` });
}
/** Each of these color schemes in turn: axe, then a screenshot of the window panel named after it. */
async function bothThemes(page, label, shotName) {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `${label}, ${colorScheme} theme`);
    if (shotName) await panelShot(page, `${shotName}-${colorScheme}`);
  }
}
/** On phones (320 and 390 px): nothing scrolls the page sideways, axe passes in both themes; screenshots at 390 px. */
async function onPhones(page, label, shotName) {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 860 });
    await page.waitForFunction(() => [...document.querySelectorAll('.fx-frame')].every((f) => { const s = f.querySelector('.fx-scroll'); return (s.scrollWidth > s.clientWidth + 1) === f.hasAttribute('data-wide'); }));
    await noOverflow(page, `${label} at ${width} px`);
    await bothThemes(page, `${label} at ${width} px`, shotName && width === 390 ? `${shotName}-390` : null);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
}

await test('playground: a chart redrawn by a slider: the chart is drawn (title, axes, legend, a line per series, each with its own symbol), the slider is a real one with its tick marks and labels; letting it go runs the program once with its value, the arrow keys move it by its block increment and send once they stop; axe in both themes and at 320 and 390 px', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_CHART);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Chart' });
  await win.waitFor();
  // The chart: its text alternative is the window as text; its words, ticks and lines are drawn.
  const chart = win.getByRole('img', { name: 'Line chart "Lines": its points are in the window as text' });
  const words = await chart.locator('text').allTextContents();
  for (const w of ['Lines', 'x', 'y', 'k times x', 'x squared', '0', '10', '110']) expect(words.includes(w), `the chart lacks ${w}: ${words}`);
  expect((await chart.locator('polyline').count()) === 2, 'a line per series');
  const box0 = await chart.boundingBox();
  expect(Math.round(box0.width) === 500 && Math.round(box0.height) === 400, `JavaFX's 500 x 400: ${box0.width} x ${box0.height}`);
  // The slider: a real one, at its value, with JavaFX's tick labels under it.
  const slider = win.getByRole('slider', { name: 'Slider 1' });
  expect((await slider.inputValue()) === '2' && (await slider.getAttribute('min')) === '1' && (await slider.getAttribute('max')) === '5', `slider ${await slider.inputValue()}`);
  expect((await win.locator('.fx-tick-label').allTextContents()).join(' ') === '1 2 3 4 5', await win.locator('.fx-tick-label').allTextContents());
  // Dragged to 4 and let go: one run, with the value it was let go at.
  let n = await runCount(page);
  const box = await slider.boundingBox();
  const at = (v) => box.x + 8 + ((v - 1) / 4) * (box.width - 16);
  await page.mouse.move(at(2), box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(at(4), box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await nextRun(page, n);
  await settled(page);
  expect((await runCount(page)) === n + 1, `letting the slider go ran the program ${(await runCount(page)) - n} times`);
  let outline = await outlineOf(page);
  const value = Number(/Slider 1 to 5, value ([\d.]+)/.exec(outline)?.[1]);
  expect(Math.abs(value - 4) <= 0.05 && Number(/Label "k = ([\d.]+)"/.exec(outline)?.[1]) === value, outline);
  expect(Number(await slider.inputValue()) === value && outline.includes(`series "k times x": (0, 0) (1, ${String(value).replace(/\.0$/, '')})`), outline);
  // The arrow keys: by the block increment (0.5), sent once they stop; the focus stays on the slider.
  n = await runCount(page);
  await slider.focus();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await nextRun(page, n);
  await settled(page);
  outline = await outlineOf(page);
  expect((await runCount(page)) === n + 1 && Number(/Slider 1 to 5, value ([\d.]+)/.exec(outline)?.[1]) === Math.round((value - 1) * 100) / 100, `after two Left arrows: ${(await runCount(page)) - n} runs, ${outline}`);
  expect((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Slider 1', 'the slider keeps the keyboard focus');
  n = await runCount(page);
  await page.keyboard.press('End');
  await nextRun(page, n);
  expect((await outlineOf(page)).includes('Slider 1 to 5, value 5,'), await outlineOf(page));
  await shot(page, 'playground-chart');
  await bothThemes(page, 'a chart and a slider in the window panel', 'playground-chart');
  // On a phone the 500 px chart scrolls inside its frame, which says so.
  await onPhones(page, 'a chart and a slider', 'playground-chart');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: drawing on a canvas with mouse handlers: a mouse gesture goes to the program in one run when the button lifts (the press, a drag every few pixels, the release), a tap is a click, a finger draws too, and the keyboard clicks and drags; a line under it says the drawing updates when you lift your finger; axe in both themes and at 320 and 390 px', async () => {
  const { ctx, page, errors } = await newPage({ hasTouch: true });
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_DRAW);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Draw' });
  await win.waitFor();
  expect((await page.locator('.fx-panel .fx-draw-note').innerText()) === 'Draw on the canvas with the mouse or a finger: the drawing updates when you lift your finger.', await page.locator('.fx-panel .fx-draw-note').innerText());
  const pad = win.getByRole('application', { name: 'Canvas 1, 240 x 160' });
  const strokes = async () => (await outlineOf(page)).split('\n').map((l) => l.trim()).filter((l) => l.startsWith('strokeLine'));
  // A gesture: one run when the button lifts, a line along every sampled drag.
  let n = await runCount(page);
  let b = await pad.boundingBox();
  await page.mouse.move(b.x + 20, b.y + 20);
  await page.mouse.down();
  for (let i = 1; i <= 20; i++) await page.mouse.move(b.x + 20 + 8 * i, b.y + 20 + 4 * i);
  expect((await runCount(page)) === n, 'nothing is sent before the button lifts');
  await page.mouse.up();
  await nextRun(page, n);
  await settled(page);
  expect((await runCount(page)) === n + 1, `a gesture ran the program ${(await runCount(page)) - n} times`);
  let lines = await strokes();
  expect(lines.length === 20 && lines[0] === 'strokeLine 20 20 28 24, stroke #00008b, width 3' && lines[19] === 'strokeLine 172 96 180 100, stroke #00008b, width 3', lines.join('\n'));
  expect(!(await page.locator('.fx-keys-note').count()), 'the keyboard help shows only for keyboard focus, not after the mouse');
  // JavaFX clicks after a release on the node, also after a drag: a dot where it was let go.
  expect((await outlineOf(page)).includes('fillOval 176 96 8 8, fill #dc143c') && (await outlineOf(page)).includes('Label "Clicks: 1"'), await outlineOf(page));
  // The canvas is painted from the calls: dark blue on the line, white off it.
  const pixel = (x, y) => pad.locator('canvas.fx-canvas-el').evaluate((c, [x, y]) => { const k = c.width / c.getBoundingClientRect().width; return [...c.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data]; }, [x, y]);
  const on = await pixel(100, 60);
  const off = await pixel(100, 140);
  expect(on[0] < 60 && on[1] < 60 && on[2] > 100 && on[3] === 255 && off.join() === '255,255,255,255', `painted: ${on} on the line, ${off} off it`);
  // A tap: a click at that point.
  n = await runCount(page);
  await page.mouse.click(b.x + 200, b.y + 30);
  await nextRun(page, n);
  expect((await outlineOf(page)).includes('fillOval 196 26 8 8, fill #dc143c') && (await outlineOf(page)).includes('Label "Clicks: 2"'), await outlineOf(page));
  // A finger: the same, through touch events.
  n = await runCount(page);
  b = await pad.boundingBox();
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: b.x + x, y: b.y + y, id: 1 }] });
  await touch('touchStart', 30, 140);
  for (let x = 40; x <= 200; x += 10) await touch('touchMove', x, 140);
  await touch('touchEnd');
  await cdp.detach();
  await nextRun(page, n);
  await settled(page);
  lines = await strokes();
  expect((await runCount(page)) === n + 1 && lines.length === 20 + 17 && lines[20] === 'strokeLine 30 140 40 140, stroke #00008b, width 3' && lines.at(-1) === 'strokeLine 190 140 200 140, stroke #00008b, width 3', lines.slice(20).join('\n'));
  // The keyboard: the arrow keys move a point from the middle, Enter clicks there, Space presses and lets go.
  n = await runCount(page);
  await pad.focus();
  await page.keyboard.press('ArrowRight');
  expect(await page.locator('.fx-keys-note').isVisible(), 'the keyboard help shows while the canvas has the focus');
  expect((await pad.getAttribute('aria-describedby')) === (await page.locator('.fx-keys-note').getAttribute('id')), 'the canvas is described by the keyboard help');
  await page.keyboard.press('Enter');
  await nextRun(page, n);
  expect((await outlineOf(page)).includes('fillOval 121 76 8 8, fill #dc143c'), await outlineOf(page));
  n = await runCount(page);
  await page.keyboard.press(' ');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press(' ');
  await nextRun(page, n);
  lines = await strokes();
  expect(lines.slice(-2).join('\n') === 'strokeLine 125 80 125 85, stroke #00008b, width 3\nstrokeLine 125 85 125 90, stroke #00008b, width 3', lines.slice(-2).join('\n'));
  expect((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Canvas 1, 240 x 160', 'the canvas keeps the keyboard focus');
  await shot(page, 'playground-canvas');
  await bothThemes(page, 'a canvas drawn on in the window panel', 'playground-canvas');
  await onPhones(page, 'a canvas drawn on', 'playground-canvas');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: an image program with a sample image: its image views are drawn from their pixels, 4 times larger and crisp, the scale said under them, with exactly the pixels the program read and wrote; axe in both themes and at 320 and 390 px', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await page.getByRole('button', { name: 'Add a sample image' }).click();
  await page.locator('#pg-sample-list').getByRole('button', { name: /landscape\.png/ }).click();
  await setCode(page, FX_IMAGE);
  const out = await check(page);
  const printed = /32 x 24, first pixel ([0-9a-f]{8}), last ([0-9a-f]{8})/.exec(await outputOf(page));
  expect(printed, out);
  const win = page.getByRole('group', { name: 'Window: Negative' });
  await win.waitFor();
  const images = win.locator('img.fx-image');
  await page.waitForFunction(() => [...document.querySelectorAll('.fx-panel img.fx-image')].filter((i) => i.complete && i.naturalWidth > 0).length === 2);
  const shown = await images.evaluateAll((els) =>
    els.map((img) => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const hex = (x, y) => { const [r, gg, bb, a] = g.getImageData(x, y, 1, 1).data; return [a, r, gg, bb].map((v) => v.toString(16).padStart(2, '0')).join(''); };
      return { w: img.naturalWidth, h: img.naturalHeight, drawn: img.getBoundingClientRect().width, rendering: getComputedStyle(img).imageRendering, first: hex(0, 0), last: hex(img.naturalWidth - 1, img.naturalHeight - 1) };
    }),
  );
  expect(shown.length === 2 && shown.every((s) => s.w === 32 && s.h === 24 && s.drawn === 128 && s.rendering === 'pixelated'), JSON.stringify(shown));
  // The page draws exactly the pixels the program has: its first pixel, and the last of the negative it made.
  expect(shown[0].first === printed[1] && shown[1].last === printed[2], `${JSON.stringify(shown)} against ${printed[0]}`);
  expect((await win.locator('.fx-image-scale').allTextContents()).join('|') === 'drawn 4 times larger|drawn 4 times larger', await win.locator('.fx-image-scale').allTextContents());
  expect((await outlineOf(page)).includes('ImageView 32 x 24, pixels '), await outlineOf(page));
  await bothThemes(page, 'image views in the window panel', 'playground-image');
  await onPhones(page, 'image views', 'playground-image');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

/** The nodes of a window JSON, depth first. */
const windowNodes = (w) => {
  const out = [];
  const walk = (n) => {
    if (!n) return;
    out.push(n);
    for (const c of n.children ?? []) walk(c);
    for (const r of ['top', 'left', 'center', 'right', 'bottom']) walk(n[r]);
  };
  for (const s of w?.windows ?? []) walk(s.scene?.root);
  return out;
};
const PART14 = ['LineChart', 'BarChart', 'ScatterChart', 'Canvas', 'ImageView', 'Slider'];
/** The elements the drawing makes for the part 14 nodes of a window, as CSS selectors. */
const drawnAs = { LineChart: '.fx-chart svg', BarChart: '.fx-chart svg', ScatterChart: '.fx-chart svg', Canvas: '.fx-canvas', ImageView: '.fx-imageview', Slider: '.fx-slider' };
const part14 = (() => {
  const course = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
  let example = null;
  let challenge = null;
  for (const m of course.modules) {
    const mod = moduleOf(m.id);
    example ??= ((s) => s && { moduleId: m.id, step: s })(mod.steps.find((s) => windowBlocks(s).some((b) => windowNodes(b.window).some((n) => PART14.includes(n.type)))));
    // A challenge whose task card shows such a window (the card shows cardTest's).
    challenge ??= ((c) => c && { moduleId: m.id, ...c, shown: cardTest(c.ex) })(challengesOf(mod).find(({ ex }) => ex.kind === 'code' && windowNodes(cardTest(ex)?.window).some((n) => PART14.includes(n.type))));
  }
  return { example, challenge };
})();

// ------------------------------------------------------------------ part 14.3: a game in the window panel

// A small game: a ship turned with Left and Right and pushed with Up, a rock, and a line of text; A
// (named in the code, so the key row offers it) prints when it is pressed.
const FX_GAME = fxProgram(
  ['java.util.HashMap', 'java.util.Map', 'javafx.animation.AnimationTimer', 'javafx.application.Application', 'javafx.geometry.Point2D', 'javafx.scene.Scene', 'javafx.scene.input.KeyCode', 'javafx.scene.layout.Pane', 'javafx.scene.paint.Color', 'javafx.scene.shape.Circle', 'javafx.scene.shape.Polygon', 'javafx.scene.text.Text', 'javafx.stage.Stage'],
  [
    '    private final Map<KeyCode, Boolean> pressed = new HashMap<>();',
    '    private Point2D speed = new Point2D(0, 0);',
    '    private int frames = 0;',
    '',
    '    @Override',
    '    public void start(Stage stage) {',
    '        Pane pane = new Pane();',
    '        pane.setPrefSize(600, 400);',
    '        Text text = new Text(10, 20, "Frames: 0");',
    '        Circle rock = new Circle(450, 200, 25, Color.GRAY);',
    '        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);',
    '        ship.setTranslateX(300);',
    '        ship.setTranslateY(200);',
    '        pane.getChildren().addAll(text, rock, ship);',
    '        Scene scene = new Scene(pane);',
    '        scene.setOnKeyPressed(event -> {',
    '            pressed.put(event.getCode(), Boolean.TRUE);',
    '            if (event.getCode() == KeyCode.A) {',
    '                System.out.println("A at frame " + frames);',
    '            }',
    '        });',
    '        scene.setOnKeyReleased(event -> pressed.put(event.getCode(), Boolean.FALSE));',
    '        new AnimationTimer() {',
    '            @Override',
    '            public void handle(long now) {',
    '                frames++;',
    '                if (pressed.getOrDefault(KeyCode.LEFT, false)) {',
    '                    ship.setRotate(ship.getRotate() - 3);',
    '                }',
    '                if (pressed.getOrDefault(KeyCode.RIGHT, false)) {',
    '                    ship.setRotate(ship.getRotate() + 3);',
    '                }',
    '                if (pressed.getOrDefault(KeyCode.UP, false)) {',
    '                    double angle = Math.toRadians(ship.getRotate());',
    '                    speed = speed.add(Math.cos(angle) * 0.05, Math.sin(angle) * 0.05);',
    '                }',
    '                ship.setTranslateX(ship.getTranslateX() + speed.getX());',
    '                ship.setTranslateY(ship.getTranslateY() + speed.getY());',
    '                text.setText("Frames: " + frames);',
    '            }',
    '        }.start();',
    '        stage.setTitle("Game");',
    '        stage.setScene(scene);',
    '        stage.show();',
    '    }',
  ],
);
/** The window panel's player: its counter, Play or Pause, whether it draws a frame (not the window after the last event). */
const playerState = (page) =>
  page.evaluate(() => {
    const panel = document.querySelector('.fx-panel');
    const anim = panel?.querySelector('.fx-anim');
    return {
      count: panel?.querySelector('.fx-pl-count')?.textContent ?? null,
      play: panel?.querySelector('.fx-pl-btn[data-act="play"], .fx-pl-btn[data-act="pause"]')?.getAttribute('aria-label') ?? null,
      frame: !!anim?.hasAttribute('data-on'),
      said: panel?.querySelector('.fx-player [aria-live]')?.textContent ?? '',
    };
  });
/** Notes, from now on, every counter the panel's player shows while it draws a frame (window.__frames). */
const watchPlayer = (page) =>
  page.evaluate(() => {
    window.__frames = [];
    new MutationObserver(() => {
      const panel = document.querySelector('.fx-panel');
      const c = panel?.querySelector('.fx-pl-count')?.textContent;
      if (c && panel.querySelector('.fx-anim[data-on]') && window.__frames.at(-1) !== c) window.__frames.push(c);
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
  });
/** The ship as the window's own drawing shows it: its SVG transform. */
const shipTransform = (page, layer) => page.locator(`.fx-panel .fx-desktop${layer === 'anim' ? '.fx-anim' : ':not(.fx-anim)'} polygon`).getAttribute('transform');

await test('playground: a game: shapes drawn as SVG; keys held with the key row (buttons and the keyboard), Run 30 or 60 frames sends them and plays the new frames, which pause, step and scrub; the last frame is the window the outline gives; a Tap; Start over; out of date, it stays at the end and never plays; axe in both themes at 320 and 390 px', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_GAME);
  await check(page);
  const win = page.getByRole('group', { name: 'Window: Game' });
  await win.waitFor();
  // The shapes, at their real coordinates in a 600 x 400 pane.
  const svg = win.locator('svg.fx-shapes');
  expect((await svg.getAttribute('viewBox')) === '0 0 600 400', await svg.getAttribute('viewBox'));
  expect((await svg.locator('text').textContent()) === 'Frames: 0' && (await svg.locator('circle').getAttribute('r')) === '25' && (await svg.locator('circle').getAttribute('fill')) === '#808080', 'the text and the rock');
  expect((await shipTransform(page)) === 'translate(300 200)', await shipTransform(page));
  const box = await svg.boundingBox();
  expect(Math.round(box.width) === 600 && Math.round(box.height) === 400, `drawn at its size: ${box.width} x ${box.height}`);
  // The key row: the arrow keys, Space and A (the code names KeyCode.A); the note; no player yet.
  const keys = page.getByRole('group', { name: 'Keys to hold' });
  const names = await keys.getByRole('button').evaluateAll((bs) => bs.map((b) => b.querySelector('.fx-key-name').textContent));
  expect(names.join(',') === 'Left,Right,Up,Down,Space,A', names.join(','));
  expect((await page.locator('.fx-panel').innerText()).includes("The game doesn't run live here: choose the keys to hold, run some frames, and the page shows them as an animation."), 'the note');
  expect(!(await page.locator('.fx-player').count()), 'no frames ran: no player');
  // Hold Up, run 30 frames: one run with press key UP and frames 30, and the 30 frames play.
  await keys.getByRole('button', { name: 'Up' }).click();
  expect((await keys.getByRole('button', { name: 'Up' }).getAttribute('aria-pressed')) === 'true', 'Up is held');
  await watchPlayer(page);
  let n = await runCount(page);
  await page.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 30 of 30' && !document.querySelector('.fx-anim[data-on]'));
  let seen = await page.evaluate(() => window.__frames);
  expect(seen[0] === 'frame 1 of 30' && seen.length >= 3, `played: ${seen.join(', ')}`);
  let outline = await outlineOf(page);
  expect(outline.includes('Text "Frames: 30" at (10, 20)') && outline.endsWith('frames run: 30') && /Polygon \(-5, -5\) \(10, 0\) \(-5, 5\), at \(323\.2[45]\d*, 200\), fill #000000/.test(outline), outline);
  expect((await shipTransform(page)) === 'translate(323.25 200)', await shipTransform(page));
  // Hold Right too: a run sends only press key RIGHT and frames 60, and plays only the new frames (31 to 90).
  await keys.getByRole('button', { name: 'Right' }).click();
  await watchPlayer(page);
  n = await runCount(page);
  await page.getByRole('button', { name: 'Run 60 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 90 of 90' && !document.querySelector('.fx-anim[data-on]'));
  seen = await page.evaluate(() => window.__frames);
  expect(seen[0] === 'frame 31 of 90', `the new frames played: ${seen.slice(0, 3).join(', ')}...`);
  outline = await outlineOf(page);
  expect(outline.endsWith('frames run: 90') && outline.includes('Text "Frames: 90"') && /rotate 180, fill #000000/.test(outline), outline);
  // The last frame is the window the outline gives: the ship where the outline puts it.
  const [, x, y] = /\), at \(([\d.]+), ([\d.]+)\), rotate 180/.exec(outline);
  const t = await shipTransform(page);
  const m = /^translate\(([\d.]+) ([\d.]+)\) rotate\(180 2\.5 0\)$/.exec(t);
  expect(m && Math.abs(Number(m[1]) - Number(x)) < 0.001 && Math.abs(Number(m[2]) - Number(y)) < 0.001, `${t} for ${x}, ${y}`);
  // Restart at a quarter of the speed, pause: a frame is drawn in place of the window; the counter isn't announced while playing.
  await page.getByRole('combobox', { name: 'Speed' }).selectOption('0.25');
  await page.getByRole('button', { name: 'Restart' }).click();
  await page.waitForTimeout(400);
  expect((await playerState(page)).play === 'Pause', 'playing');
  await page.getByRole('button', { name: 'Pause' }).click();
  let st = await playerState(page);
  const k = Number(/frame (\d+) of 90/.exec(st.count)?.[1]);
  expect(k > 1 && k < 30 && st.frame && st.play === 'Play' && st.said === '', JSON.stringify(st));
  expect(!(await page.locator('.fx-panel .fx-desktop:not(.fx-anim)').isVisible()) && (await page.locator('.fx-panel .fx-anim').isVisible()), 'the frame stands in for the window');
  await panelShot(page, 'playground-game-paused');
  // Step forward and back: the counter moves by one, and is said.
  await page.getByRole('button', { name: 'Forward one frame' }).click();
  st = await playerState(page);
  expect(st.count === `frame ${k + 1} of 90` && st.said === `frame ${k + 1} of 90`, JSON.stringify(st));
  await page.getByRole('button', { name: 'Back one frame' }).click();
  await page.getByRole('button', { name: 'Back one frame' }).click();
  st = await playerState(page);
  expect(st.count === `frame ${k - 1} of 90` && st.said === `frame ${k - 1} of 90`, JSON.stringify(st));
  // Frame 30's ship is where the first run left it; the slider at the end shows the window again.
  const slider = page.getByRole('slider', { name: 'Frame' });
  await slider.fill('30');
  expect((await shipTransform(page, 'anim')) === 'translate(323.25 200)' && (await slider.getAttribute('aria-valuetext')) === 'frame 30 of 90', await shipTransform(page, 'anim'));
  await slider.fill('90');
  st = await playerState(page);
  expect(st.count === 'frame 90 of 90' && !st.frame && (await page.locator('.fx-panel .fx-desktop:not(.fx-anim)').isVisible()), JSON.stringify(st));
  // The keyboard on the key row: Left holds Left, again lets go; a holds A; Space on the row holds Space.
  await keys.focus();
  await page.keyboard.press('ArrowLeft');
  expect((await keys.getByRole('button', { name: 'Left' }).getAttribute('aria-pressed')) === 'true', 'Left held from the keyboard');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('a');
  await page.keyboard.press(' ');
  const pressedNow = await keys.locator('button[aria-pressed="true"]').evaluateAll((bs) => bs.map((b) => b.querySelector('.fx-key-name').textContent));
  expect(pressedNow.join(',') === 'Right,Up,Space,A', pressedNow.join(','));
  // Only a held key shows a state word ("held"); a key that isn't held shows none, so the Up key never reads "Up UP".
  const states = await keys.getByRole('button').evaluateAll((bs) => bs.map((b) => b.querySelector('.fx-key-state').textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '+' : '-')));
  expect(states.every((s) => s === 'held+' || s === '-'), states.join(','));
  expect((await page.evaluate(() => document.activeElement?.classList.contains('fx-key-row'))), 'the row keeps the focus');
  // Let go of them again (the next run's lines only change what changed).
  await page.keyboard.press('a');
  await page.keyboard.press(' ');
  // A Tap: key A, with no frames, runs once; the program sees the press. Up is held, so its Tap can't be used.
  await page.locator('.fx-tap > summary').click();
  expect((await page.getByRole('button', { name: 'Tap Up' }).getAttribute('aria-disabled')) === 'true', 'a held key has no Tap');
  n = await runCount(page);
  await page.getByRole('button', { name: 'Tap A' }).click();
  await nextRun(page, n);
  expect((await outputOf(page)).includes('A at frame 90'), await outputOf(page));
  expect((await outlineOf(page)).endsWith('frames run: 90'), 'a Tap runs no frames');
  await shot(page, 'playground-game');
  await panelShot(page, 'playground-game-desktop');
  await bothThemes(page, 'a game in the window panel', 'playground-game');
  await onPhones(page, 'a game in the window panel', 'playground-game');
  // On a 390 px phone the keys are big enough for a finger, and the 600 px window scrolls inside its frame.
  await page.setViewportSize({ width: 390, height: 860 });
  const sizes = await page.locator('.fx-key, .fx-run-frames, .fx-pl-btn').evaluateAll((els) => els.map((e) => [e.getBoundingClientRect().width, e.getBoundingClientRect().height]));
  expect(sizes.every(([w, h]) => w >= 44 && h >= 44), JSON.stringify(sizes));
  expect((await frames(page)).some((f) => f.wide && f.noted), 'the window scrolls inside its frame');
  await page.setViewportSize({ width: 1280, height: 900 });
  // Start over: no keys held, no frames, no player.
  n = await runCount(page);
  await page.getByRole('button', { name: 'Start over' }).click();
  await nextRun(page, n);
  expect(!(await keys.locator('button[aria-pressed="true"]').count()) && !(await page.locator('.fx-player').count()) && !(await outlineOf(page)).includes('frames run'), 'started over');
  // An out-of-date window (the code changed, then a run that didn't compile) shows the window after
  // the last event, frame 30 of 30, and never plays by itself, in view or not.
  n = await runCount(page);
  await page.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 30 of 30' && !document.querySelector('.fx-anim[data-on]'));
  const staysAtEnd = async (why) => {
    const s0 = await playerState(page);
    await page.locator('.fx-panel').scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const s1 = await playerState(page);
    const played = await page.evaluate(() => window.__frames);
    expect([s0, s1].every((s) => s.count === 'frame 30 of 30' && !s.frame && s.play === 'Play') && !played.length, `${why}: ${JSON.stringify([s0, s1])} played ${played.join(', ')}`);
  };
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await watchPlayer(page);
  await setCode(page, FX_GAME.replace('stage.setTitle("Game");', 'stage.setTitle("Game");\n        // changed'));
  await page.locator('.fx-stale-note', { hasText: 'your code changed' }).waitFor();
  await staysAtEnd('the code changed');
  await watchPlayer(page);
  await setCode(page, FX_GAME.replace('stage.show();', 'stage.show()'));
  const failedRun = await check(page);
  expect(/didn't compile/i.test(failedRun) && (await page.locator('.fx-stale-note', { hasText: "your code didn't compile" }).count()) === 1, failedRun);
  await staysAtEnd("the run didn't compile");
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: a game with reduced motion: the new frames never play by themselves; Play plays them', async () => {
  const { ctx, page, errors } = await newPage({ reducedMotion: 'reduce' });
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_GAME);
  await check(page);
  await page.getByRole('group', { name: 'Window: Game' }).waitFor();
  await page.getByRole('group', { name: 'Keys to hold' }).getByRole('button', { name: 'Left' }).click();
  await watchPlayer(page);
  const n = await runCount(page);
  await page.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.locator('.fx-player').waitFor();
  await page.waitForTimeout(800);
  let st = await playerState(page);
  expect(st.count === 'frame 30 of 30' && st.play === 'Play' && !st.frame && (await page.evaluate(() => window.__frames.length)) === 0, JSON.stringify(st));
  await page.getByRole('button', { name: 'Play' }).click();
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 30 of 30' && !document.querySelector('.fx-anim[data-on]'));
  expect((await page.evaluate(() => window.__frames))[0] === 'frame 1 of 30', 'Play plays from the start');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// An animation with no key handlers: a ball that moves to the right.
const FX_TIMER_ONLY = fxProgram(
  ['javafx.animation.AnimationTimer', 'javafx.application.Application', 'javafx.scene.Scene', 'javafx.scene.layout.Pane', 'javafx.scene.shape.Circle', 'javafx.stage.Stage'],
  [
    '    @Override',
    '    public void start(Stage stage) {',
    '        Pane pane = new Pane();',
    '        pane.setPrefSize(300, 400);',
    '        Circle ball = new Circle(20, 200, 10);',
    '        pane.getChildren().add(ball);',
    '        new AnimationTimer() {',
    '            @Override',
    '            public void handle(long now) {',
    '                ball.setTranslateX(ball.getTranslateX() + 2);',
    '            }',
    '        }.start();',
    '        stage.setTitle("Ball");',
    '        stage.setScene(new Scene(pane));',
    '        stage.show();',
    '    }',
  ],
);

await test('playground: an animation with no key handlers: only the Run buttons and a note that names no keys; on a phone, frames a learner runs with most of the window scrolled away still play', async () => {
  const { ctx, page, errors } = await newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, FX_TIMER_ONLY);
  await check(page);
  await page.getByRole('group', { name: 'Window: Ball' }).waitFor();
  const text = await page.locator('.fx-panel').innerText();
  expect(!(await page.getByRole('group', { name: 'Keys to hold' }).count()) && !(await page.locator('.fx-tap').count()), 'no key row and no Tap menu');
  expect(text.includes("The animation doesn't run live here: run some frames, and the page shows them as an animation.") && !text.includes('choose the keys'), text);
  // A first run, with the window in view: its frames play.
  let n = await runCount(page);
  await page.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 30 of 30' && !document.querySelector('.fx-anim[data-on]'));
  // Scroll so only the bottom 30 px of the window's frame are on screen (well under a quarter), the Run buttons below it.
  await page.evaluate(() => {
    const r = document.querySelector('.fx-panel .fx-frame').getBoundingClientRect();
    window.scrollBy(0, r.bottom - 30);
  });
  const seenBefore = await page.evaluate(() => {
    const r = document.querySelector('.fx-panel .fx-frame').getBoundingClientRect();
    const b = [...document.querySelectorAll('.fx-run-frames')].find((e) => e.textContent.includes('Run 30')).getBoundingClientRect();
    return { part: (Math.min(r.bottom, innerHeight) - Math.max(r.top, 0)) / r.height, button: b.top >= 0 && b.bottom <= innerHeight };
  });
  expect(seenBefore.part > 0 && seenBefore.part < 0.25 && seenBefore.button, JSON.stringify(seenBefore));
  // The next run's new frames (31 to 60) play at once, though most of the window is scrolled away.
  await watchPlayer(page);
  n = await runCount(page);
  await page.getByRole('button', { name: 'Run 30 frames' }).evaluate((b) => b.click());
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-pl-count')?.textContent === 'frame 60 of 60' && !document.querySelector('.fx-anim[data-on]'), null, { timeout: 15000 });
  const seen = await page.evaluate(() => window.__frames);
  expect(seen[0] === 'frame 31 of 60' && seen.length >= 3, `played: ${seen.join(', ')}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('part 14 in lessons: a java window example with a chart, canvas, image view or slider is drawn in the lesson text and in the pre-rendered page (a canvas as SVG there); a challenge with one draws it on its task card and in both windows of its results; the model solution passes', async () => {
  const { example, challenge } = part14;
  if (!example && !challenge) {
    console.log('       (skipped: no lesson shows a chart, canvas, image view or slider yet)');
    return;
  }
  const { ctx, page, errors } = await newPage();
  if (example) {
    const { moduleId, step } = example;
    const blocks = windowBlocks(step);
    await page.goto(BASE + `learn/${moduleId}/${step.slug}/`);
    await lessonReady(page);
    const figures = page.locator('article.step-text figure.fx-figure');
    expect((await figures.count()) === blocks.length, `${await figures.count()} windows in the lesson text, not ${blocks.length}`);
    const html = await (await page.request.get(BASE + `learn/${moduleId}/${step.slug}/`)).text();
    const prerendered = html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [];
    for (const [k, b] of blocks.entries()) {
      const types = new Set(windowNodes(b.window).map((n) => n.type).filter((t) => PART14.includes(t)));
      for (const t of types) {
        expect((await figures.nth(k).locator(drawnAs[t]).count()) > 0, `figure ${k}: no ${t} drawn`);
        expect(prerendered[k]?.includes(`class="${drawnAs[t].split(' ')[0].slice(1)}`), `the pre-rendered figure ${k} has no ${t}`);
      }
      if (types.has('Canvas')) expect(prerendered[k].includes('<svg class="fx-canvas-svg"') && !prerendered[k].includes('<canvas'), 'a pre-rendered canvas is SVG');
    }
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
      await axe(page, `a lesson with part 14 windows, ${colorScheme} theme`);
    }
    await page.setViewportSize({ width: 320, height: 800 });
    await noOverflow(page, 'a lesson with part 14 windows at 320 px');
    await page.setViewportSize({ width: 1280, height: 900 });
  }
  if (challenge) {
    const { moduleId, ex, shown } = challenge;
    await openChallenge(page, moduleId, challenge);
    const types = new Set(windowNodes(shown.window).map((n) => n.type).filter((t) => PART14.includes(t)));
    const card = page.locator('.task-card');
    for (const t of types) expect((await card.locator(drawnAs[t]).count()) > 0, `the task card draws no ${t}`);
    // The starter program: when its window differs, both windows are drawn with the same kinds of node.
    const out = await check(page);
    expect(out.includes('Not yet'), out);
    const compare = page.locator('.fx-compare').first();
    if (await compare.count()) {
      const expected = compare.locator(':scope > div').first();
      for (const t of types) expect((await expected.locator(drawnAs[t]).count()) > 0, `the expected window in the results draws no ${t}`);
      await page.setViewportSize({ width: 320, height: 800 });
      await noOverflow(page, 'failed part 14 results at 320 px');
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
        await axe(page, `failed part 14 results at 320 px, ${colorScheme} theme`);
      }
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    await setProgram(page, ex.solution);
    const passed = await check(page);
    expect(passed.includes('All tests passed'), passed);
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// ------------------------------------------------------------------ part 14 lesson pages (modules 51 and 52)

/** With --shots: the element in view on a desktop (light theme), then on a 390 px phone in the light and the dark theme. */
async function threeShots(page, name, target) {
  if (!SHOTS) return;
  const size = page.viewportSize();
  for (const [width, height, colorScheme, suffix] of [[1280, 900, 'light', 'desktop'], [390, 844, 'light', '390-light'], [390, 844, 'dark', '390-dark']]) {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await target.evaluate((e) => e.scrollIntoView({ block: 'start' }));
    await page.evaluate(() => window.scrollBy(0, -80));
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${SHOTS}/${name}-${suffix}.png` });
  }
  await page.setViewportSize(size);
  await page.emulateMedia({ colorScheme: 'light' });
}
/** The CRC-32 of an image element's pixels as ARGB, row by row, 4 bytes each (as the outline's "pixels"). */
const imageCrc = (img) =>
  img.evaluate((e) => {
    const c = document.createElement('canvas');
    c.width = e.naturalWidth;
    c.height = e.naturalHeight;
    const g = c.getContext('2d');
    g.drawImage(e, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const table = Array.from({ length: 256 }, (_, n) => { let x = n; for (let k = 0; k < 8; k++) x = x & 1 ? 0xedb88320 ^ (x >>> 1) : x >>> 1; return x >>> 0; });
    let crc = 0xffffffff;
    for (let i = 0; i < d.length; i += 4) for (const b of [d[i + 3], d[i], d[i + 1], d[i + 2]]) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, '0');
  });
/** An SVG element's pixel at (x, y) of its own coordinates, as [r, g, b, a] (the SVG drawn into a canvas of its size). */
const svgPixel = (svg, x, y) =>
  svg.evaluate(async (e, [x, y]) => {
    const img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(e));
    await img.decode();
    const c = document.createElement('canvas');
    c.width = Number(e.getAttribute('width'));
    c.height = Number(e.getAttribute('height'));
    const g = c.getContext('2d');
    g.drawImage(img, 0, 0);
    return [...g.getImageData(x, y, 1, 1).data];
  }, [x, y]);
/** A canvas element's pixel at (x, y) of the JavaFX canvas, as [r, g, b, a]. */
const canvasPixel = (canvas, x, y) => canvas.evaluate((c, [x, y]) => { const k = c.width / c.getBoundingClientRect().width; return [...c.getContext('2d').getImageData(Math.floor(x * k), Math.floor(y * k), 1, 1).data]; }, [x, y]);
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const near = (a, b, d = 24) => a.every((v, i) => Math.abs(v - b[i]) <= d);
/** Decodes the text of pre-rendered HTML. */
const htmlText = (t) => t.replace(/<[^>]*>/g, '').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
/** On a 320 px phone and back: nothing scrolls the page sideways, a frame says it scrolls exactly when it does, axe passes in both themes. */
async function lessonOnPhone(page, label) {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.waitForFunction(() => [...document.querySelectorAll('.fx-frame')].every((f) => { const s = f.querySelector('.fx-scroll'); return (s.scrollWidth > s.clientWidth + 1) === f.hasAttribute('data-wide'); }));
  const closed = page.locator('article.step-text details.fx-astext:not([open]) > summary');
  while (await closed.count()) await closed.first().click();
  await noOverflow(page, `${label} at 320 px`);
  await outlinesWrap(page, `${label} at 320 px`);
  const fs = await frames(page);
  expect(fs.length > 0 && fs.every((f) => f.wide === f.noted), `${label} at 320 px: ${JSON.stringify(fs)}`);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `${label} at 320 px, ${colorScheme} theme`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
}
async function lessonBothThemes(page, label) {
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `${label}, ${colorScheme} theme`);
  }
  await page.emulateMedia({ colorScheme: 'light' });
}
/** The first window block of a module's lesson texts that `pick` accepts: { step, k, block }. */
function windowExample(moduleId, pick) {
  for (const step of moduleOf(moduleId).steps) {
    const k = windowBlocks(step).findIndex(pick);
    if (k >= 0) return { step, k, block: windowBlocks(step)[k] };
  }
  return null;
}
/** The answers of a fill-in challenge's blanks, in order. */
const blankAnswers = (ex) => [...ex.seed.matchAll(/\[\[(.*?)\]\]/g)].map((m) => m[1]);
async function fillBlanks(page, answers) {
  const blanks = page.locator('.workbench input.blank');
  expect((await blanks.count()) === answers.length, `${await blanks.count()} blanks, not ${answers.length}`);
  for (const [i, a] of answers.entries()) await blanks.nth(i).fill(a);
}
/** Opens "Run with my input" and runs the program once: its window panel. */
async function runWithMyInput(page) {
  await page.getByRole('button', { name: 'Run with my input' }).click();
  const n = await runCount(page);
  await page.locator('.freerun button', { hasText: /^\s*Run\s*$/ }).click();
  await nextRun(page, n);
  await settled(page);
  return page.locator('.freerun .fx-panel');
}

await test('module 51 lesson: a chart example is drawn in the lesson (title, axis labels, a line per series through each point, the legend) and the pre-rendered page has the same chart; axe in both themes and at 320 px', async () => {
  const found = windowExample('charts', (b) => { const r = b.window.windows[0]?.scene?.root; return r?.type === 'LineChart' && r.title && r.legendVisible !== false && r.series.length >= 2 && r.xAxis.label && r.yAxis.label; });
  expect(found, 'no line chart with a title, axis labels, a legend and two series in module 51');
  const { step, k, block } = found;
  const chartNode = block.window.windows[0].scene.root;
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/charts/${step.slug}/`);
  await lessonReady(page);
  const figure = page.locator('article.step-text figure.fx-figure').nth(k);
  // The drawing is a picture (aria-hidden, its text alternative the window as text), its chart named for when it's used live.
  const chart = figure.locator('.fx-chart[role="img"]');
  expect((await chart.count()) === 1 && (await chart.getAttribute('aria-label')) === `Line chart "${chartNode.title}": its points are in the window as text`, `the chart is drawn, named: ${await chart.getAttribute('aria-label')}`);
  const words = await chart.locator('svg text').allTextContents();
  for (const w of [chartNode.title, chartNode.xAxis.label, chartNode.yAxis.label, ...chartNode.series.map((s) => s.name)]) expect(words.includes(w), `the chart lacks "${w}": ${words}`);
  const lines = await chart.locator('svg polyline').evaluateAll((els) => els.map((e) => e.getAttribute('points').trim().split(/\s+/).length));
  expect(lines.length === chartNode.series.length && lines.every((n, i) => n === chartNode.series[i].data.length), `polylines with ${lines} points for series of ${chartNode.series.map((s) => s.data.length)}`);
  const box = await chart.boundingBox();
  expect(Math.round(box.width) === 500 && Math.round(box.height) === 400, `JavaFX's 500 x 400: ${box.width} x ${box.height}`);
  // Each series in its own color: the lines' strokes all differ.
  const strokes = await chart.locator('svg polyline').evaluateAll((els) => els.map((e) => e.getAttribute('stroke')));
  expect(new Set(strokes).size === strokes.length, `series colors: ${strokes}`);
  const details = figure.locator('details.fx-astext');
  await details.locator('summary').click();
  expect((await details.locator('pre').innerText()) === block.outline, `as text: ${await details.locator('pre').innerText()}`);
  for (const s of chartNode.series) expect(block.outline.includes(`series "${s.name}": ${s.data.map(([x, y]) => `(${x}, ${y})`).join(' ')}`), `the window as text lists every point of ${s.name}: ${block.outline}`);
  // The pre-rendered page: the same chart (the same words and lines) before any script runs.
  const html = await (await page.request.get(BASE + `learn/charts/${step.slug}/`)).text();
  const fig = (html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [])[k] ?? '';
  const svg = fig.match(/<svg class="fx-chart-svg"[\s\S]*?<\/svg><\/span>/)?.[0] ?? '';
  expect(fig.includes(`role="img" aria-label="Line chart &quot;${chartNode.title}&quot;: its points are in the window as text"`), `the pre-rendered chart's name: ${fig.slice(0, 400)}`);
  const preWords = [...svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((m) => htmlText(m[1]));
  expect(JSON.stringify(preWords) === JSON.stringify(words), `pre-rendered chart words: ${preWords}\nnot\n${words}`);
  expect((svg.match(/<polyline /g) ?? []).length === lines.length, 'the pre-rendered chart has a line per series');
  expect(htmlText(fig.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/)?.[1] ?? '') === block.outline, 'the pre-rendered window as text');
  await lessonBothThemes(page, 'a module 51 lesson');
  await lessonOnPhone(page, 'a module 51 lesson');
  await threeShots(page, 'm51-chart-example', figure);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 52 lesson: a canvas example is drawn from its calls, a shape for each in order, the same in the pre-rendered page; axe in both themes and at 320 px', async () => {
  const found = windowExample('drawing-and-images', (b) => { const c = windowNodes(b.window).find((n) => n.type === 'Canvas'); return c && !b.events.length && c.calls?.length >= 2 && /^\s+fill(Rect|Oval) /m.test(b.outline) && b.outline.split('\n').filter((l) => /^\s+(fill|stroke|clear)\w* /.test(l)).every((l) => /^\s+fill(Rect|Oval) /.test(l)); });
  expect(found, 'no canvas example in module 52 drawn with filled rectangles and ovals only');
  const { step, k, block } = found;
  const calls = block.outline.split('\n').map((l) => /^\s+(fillRect|fillOval) (\S+) (\S+) (\S+) (\S+), fill (#[0-9a-f]{6})$/.exec(l)).filter(Boolean).map((m) => ({ op: m[1], x: +m[2], y: +m[3], w: +m[4], h: +m[5], color: m[6] }));
  const [cw, ch] = /Canvas (\S+) x (\S+)/.exec(block.outline).slice(1).map(Number);
  const inside = (c, x, y, m) => (c.op === 'fillRect' ? x >= c.x + m && x <= c.x + c.w - m && y >= c.y + m && y <= c.y + c.h - m : ((x - c.x - c.w / 2) / (c.w / 2 - m)) ** 2 + ((y - c.y - c.h / 2) / (c.h / 2 - m)) ** 2 <= 1);
  const onEdge = (c, x, y) => inside(c, x, y, -3) && !inside(c, x, y, 3);
  // Points to look at: each shape's middle (and a rectangle's corners, 5 px in), unless the edge of another shape runs within 3 px of it.
  const probes = calls.flatMap((c) => [[Math.floor(c.x + c.w / 2), Math.floor(c.y + c.h / 2)], ...(c.op === 'fillRect' ? [[c.x + 5, c.y + 5], [c.x + c.w - 6, c.y + c.h - 6]] : [])]).filter(([x, y]) => x < cw && y < ch && !calls.some((c) => onEdge(c, x, y)));
  const expected = (x, y) => [...calls].reverse().find((c) => inside(c, x, y, 0))?.color;
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/drawing-and-images/${step.slug}/`);
  await lessonReady(page);
  const figure = page.locator('article.step-text figure.fx-figure').nth(k);
  // A canvas in the lesson text is a picture: SVG with a shape per call (the window panel paints an HTML canvas).
  const canvas = figure.locator('.fx-canvas svg.fx-canvas-svg');
  expect((await canvas.count()) === 1, 'the lesson draws the canvas');
  const live = await canvas.locator('rect, ellipse').evaluateAll((els) => els.map((e) => `${e.tagName === 'rect' ? 'fillRect' : 'fillOval'} ${e.getAttribute('fill')}`));
  expect(JSON.stringify(live) === JSON.stringify(calls.map((c) => `${c.op} ${c.color}`)), `the lesson's shapes: ${live}`);
  const box = await canvas.boundingBox();
  expect(Math.round(box.width) === cw && Math.round(box.height) === ch, `the canvas is ${box.width} x ${box.height}, not ${cw} x ${ch}`);
  expect(probes.length >= 2, `points to look at: ${JSON.stringify(probes)}`);
  for (const [x, y] of probes) {
    const got = await svgPixel(canvas, x, y);
    expect(got[3] === 255 && near(got.slice(0, 3), hexRgb(expected(x, y)), 2), `pixel (${x}, ${y}) is ${got}, not ${expected(x, y)}`);
  }
  // A lesson's canvas can't be drawn on: it's a picture.
  expect((await figure.locator('[role="application"], button, input').count()) === 0, 'a lesson canvas takes input');
  const html = await (await page.request.get(BASE + `learn/drawing-and-images/${step.slug}/`)).text();
  const fig = (html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [])[k] ?? '';
  const svg = fig.match(/<svg class="fx-canvas-svg"[\s\S]*?<\/svg>/)?.[0] ?? '';
  expect(svg && !fig.includes('<canvas'), `the pre-rendered canvas is SVG: ${fig.slice(0, 300)}`);
  const shapes = [...svg.matchAll(/<(rect|ellipse) [^>]*fill="(#[0-9a-f]{6})"/g)].map((m) => `${m[1] === 'rect' ? 'fillRect' : 'fillOval'} ${m[2]}`);
  expect(JSON.stringify(shapes) === JSON.stringify(calls.map((c) => `${c.op} ${c.color}`)), `pre-rendered shapes: ${shapes}\nnot\n${calls.map((c) => `${c.op} ${c.color}`)}`);
  expect(htmlText(fig.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/)?.[1] ?? '') === block.outline, 'the pre-rendered window as text');
  await lessonBothThemes(page, 'a module 52 lesson');
  await lessonOnPhone(page, 'a module 52 lesson');
  await threeShots(page, 'm52-canvas-example', figure);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 52 lesson: an image example shows its asset with its name and size, and the window draws the image view with exactly its pixels, larger and crisp', async () => {
  let found = null;
  for (const step of moduleOf('drawing-and-images').steps) {
    const m = /^```asset (\S+)\n(.*)\n```\n\n```java\n[\s\S]*?\n```\n\n(?:```(?!window)[^\n]*\n[\s\S]*?\n```\n\n)*```window\n(.*)\n```/m.exec(step.text);
    if (m && /^\s+ImageView \d+ x \d+, pixels [0-9a-f]{8}$/m.test(JSON.parse(m[3]).outline)) {
      const before = step.text.slice(0, m.index);
      found = { step, asset: JSON.parse(m[2]), block: JSON.parse(m[3]), a: (before.match(/^```asset /gm) ?? []).length, k: (before.match(/^```window\n/gm) ?? []).length };
      break;
    }
  }
  expect(found, 'no image example in module 52: an asset block, then a window with an image view');
  const { step, asset, block, a, k } = found;
  const [, w, h, crc] = /^\s+ImageView (\d+) x (\d+), pixels ([0-9a-f]{8})$/m.exec(block.outline).map((v, i) => (i && i < 3 ? Number(v) : v));
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/drawing-and-images/${step.slug}/`);
  await lessonReady(page);
  const assetFig = page.locator('article.step-text figure.asset-figure').nth(a);
  const assetImg = assetFig.locator('img.asset-img');
  await assetImg.scrollIntoViewIfNeeded();
  await page.waitForFunction((e) => e.complete && e.naturalWidth > 0, await assetImg.elementHandle());
  const caption = await assetFig.innerText();
  expect(caption.includes(asset.name) && caption.includes(`${asset.image.width} x ${asset.image.height} pixels`), caption);
  expect((await assetImg.getAttribute('alt')) === asset.image.alt, 'the asset has its alt text');
  // The program shows the image as it is: the image view's pixels are the asset's.
  const figure = page.locator('article.step-text figure.fx-figure').nth(k);
  const view = figure.locator('.fx-imageview img.fx-image');
  await page.waitForFunction((e) => e.complete && e.naturalWidth > 0, await view.elementHandle());
  const shown = await view.evaluate((e) => ({ w: e.naturalWidth, h: e.naturalHeight, drawn: e.getBoundingClientRect().width, rendering: getComputedStyle(e).imageRendering, alt: e.alt }));
  expect(shown.w === w && shown.h === h && shown.drawn > w && shown.rendering === 'pixelated', JSON.stringify(shown));
  expect((await figure.locator('.fx-image-scale').first().innerText()) === `drawn ${shown.drawn / w} times larger`, await figure.locator('.fx-image-scale').first().innerText());
  expect((await imageCrc(view)) === crc, `the image view's pixels have CRC ${await imageCrc(view)}, the program's ${crc}`);
  if (asset.image.width === w && asset.image.height === h) expect((await imageCrc(assetImg)) === crc, `the asset's pixels have CRC ${await imageCrc(assetImg)}, the image view's ${crc}`);
  const html = await (await page.request.get(BASE + `learn/drawing-and-images/${step.slug}/`)).text();
  expect(html.includes(`<img src="${new URL(BASE).pathname}${asset.image.url}"`), 'the pre-rendered page shows the asset');
  const fig = (html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [])[k] ?? '';
  expect(/<img class="fx-image" src="data:image\/png;base64,/.test(fig) && fig.includes('drawn '), `the pre-rendered image view: ${fig.slice(0, 200)}`);
  await threeShots(page, 'm52-image-example', assetFig);
  await threeShots(page, 'm52-image-example-window', figure);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test("module 51 chart challenge: the task card draws the chart the program should show; wrong blanks show both charts with the differing lines marked; the right ones pass", async () => {
  const found = challengesOf(moduleOf('charts')).find(({ ex }) => ex.kind === 'fill' && windowNodes(cardTest(ex)?.window).some((n) => n.type === 'LineChart') && /new NumberAxis\("[^"]*", [^,]+, [^,]+, \[\[(\d+)\]\]\)/.test(ex.seed));
  expect(found, 'no fill-in chart challenge in module 51 whose blank is a NumberAxis tick unit');
  const { ex } = found;
  const shown = cardTest(ex);
  const answers = blankAnswers(ex);
  const tick = /new NumberAxis\("[^"]*", [^,]+, [^,]+, \[\[(\d+)\]\]\)/.exec(ex.seed)[1];
  const wrong = answers.map((x, i) => (i === answers.indexOf(tick) ? String(Number(tick) + 1) : x));
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'charts', found);
  const card = page.locator('.task-card');
  const chartNode = windowNodes(shown.window).find((n) => n.type === 'LineChart');
  const cardChart = card.locator('.fx-chart[role="img"]');
  expect((await cardChart.count()) === 1 && (await cardChart.getAttribute('aria-label')).startsWith(`Line chart${chartNode.title ? ` "${chartNode.title}"` : ''}: its points`), 'the task card draws the chart');
  expect((await cardChart.locator('polyline').count()) === chartNode.series.length, 'a line per series on the task card');
  expect((await card.locator('details.fx-astext pre').textContent()) === shown.outline, `the task card's window as text: ${await card.locator('details.fx-astext pre').textContent()}`);
  for (const f of Object.keys(shown.files ?? {})) expect((await card.innerText()).includes(f), `the task card shows ${f}`);
  await fillBlanks(page, wrong);
  const out = await check(page);
  expect(out.includes('Not yet'), out);
  const failed = page.locator('.t-fail', { hasText: shown.name }).first();
  const cmp = failed.locator('.fx-compare');
  expect((await cmp.count()) === 1, `no window comparison: ${out}`);
  expect((await cmp.locator('.fx-chart svg polyline').count()) === 2 * chartNode.series.length, 'both windows draw the chart');
  const marks = async (side) => (await cmp.locator(':scope > div').nth(side).locator('mark.fx-differs').allTextContents()).map((t) => t.replace(/^Differs: /, '').trim());
  const should = await marks(0);
  const yours = await marks(1);
  expect(should.length === 1 && / x axis NumberAxis .* by \S+$/.test(` ${should[0]}`) && should[0].endsWith(`by ${tick}`), `marked in the expected window: ${should}`);
  expect(yours.length === 1 && yours[0] === should[0].replace(new RegExp(`by ${tick}$`), `by ${Number(tick) + 1}`), `marked in your window: ${yours}`);
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, 'a failed chart challenge at 320 px');
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `a failed chart challenge at 320 px, ${colorScheme} theme`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await threeShots(page, 'm51-chart-challenge-card', card.locator('.fx-figure').first());
  await threeShots(page, 'm51-chart-challenge-failed', cmp);
  await fillBlanks(page, answers);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 51 slider challenge, "Run with my input": the slider is a real one; the arrow keys move it a tick a press (Page Up by its block increment) and the mouse drags it, each running the program once; it ends as the task card shows', async () => {
  const found = challengesOf(moduleOf('charts')).find(({ ex }) => ex.kind === 'code' && (cardTest(ex)?.events ?? []).length && cardTest(ex).events.every((e) => /^set Slider 1 \S+$/.test(e)));
  expect(found, 'no module 51 code challenge whose task card moves a slider');
  const { ex } = found;
  const shown = cardTest(ex);
  const target = Number(/^set Slider 1 (\S+)$/.exec(shown.events.at(-1))[1]);
  const sliderNode = windowNodes(shown.window).find((n) => n.type === 'Slider');
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'charts', found);
  expect((await page.locator('.task-card .task-events').innerText()) === describeEvents(shown.events), await page.locator('.task-card .task-events').innerText());
  await setProgram(page, ex.solution);
  const panel = await runWithMyInput(page);
  const title = shown.window.windows[0].title;
  const win = panel.getByRole('group', { name: title ? `Window: ${title}` : 'Window without a title' });
  await win.waitFor();
  const slider = win.getByRole('slider', { name: 'Slider 1' });
  const start = Number(await slider.inputValue());
  expect((await slider.getAttribute('min')) === String(sliderNode.min) && (await slider.getAttribute('max')) === String(sliderNode.max), `slider from ${await slider.getAttribute('min')} to ${await slider.getAttribute('max')}`);
  // The arrow keys: one step a press, sent once they stop; the program runs once.
  let n = await runCount(page);
  await slider.focus();
  const steps = Math.round(target - start);
  for (let i = 0; i < Math.abs(steps); i++) await page.keyboard.press(steps > 0 ? 'ArrowRight' : 'ArrowLeft');
  await nextRun(page, n);
  await settled(page);
  expect((await runCount(page)) === n + 1, `the arrow keys ran the program ${(await runCount(page)) - n} times`);
  const outline = await panel.locator('details.fx-astext pre').textContent();
  expect(outline === shown.outline, `the window after the slider moved to ${target}:\n${outline}\nnot\n${shown.outline}`);
  expect((await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))) === 'Slider 1', 'the slider keeps the focus');
  // Page Up: by the block increment, as JavaFX's keys (here past the end: to the maximum).
  n = await runCount(page);
  await page.keyboard.press('PageUp');
  await nextRun(page, n);
  await settled(page);
  const paged = Math.min(sliderNode.max, target + Math.max(sliderNode.blockIncrement ?? 10, 1));
  expect((await panel.locator('details.fx-astext pre').textContent()).includes(`Slider ${sliderNode.min} to ${sliderNode.max}, value ${paged},`), await panel.locator('details.fx-astext pre').textContent());
  // The mouse: dragged to the minimum and let go, one run, the window follows.
  n = await runCount(page);
  await slider.scrollIntoViewIfNeeded();
  const box = await slider.boundingBox();
  const at = (v) => box.x + 8 + ((v - sliderNode.min) / (sliderNode.max - sliderNode.min)) * (box.width - 16);
  await page.mouse.move(at(paged), box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(at(sliderNode.min) - 20, box.y + box.height / 2, { steps: 8 });
  await page.mouse.up();
  await nextRun(page, n);
  await settled(page);
  expect((await runCount(page)) === n + 1, `letting the slider go ran the program ${(await runCount(page)) - n} times`);
  const after = await panel.locator('details.fx-astext pre').textContent();
  expect(after.includes(`Slider ${sliderNode.min} to ${sliderNode.max}, value ${sliderNode.min},`) && (await slider.inputValue()) === String(sliderNode.min), after);
  expect(!(await page.locator('.freerun .fx-stale-note').count()), 'the window is up to date');
  await bothThemes(page, 'a module 51 slider challenge run with my input', null);
  await onPhones(page, 'a module 51 slider challenge run with my input', null);
  await threeShots(page, 'm51-slider-run', panel);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 52 mouse-drawing challenge, "Run with my input": drawing the task\'s stroke with the mouse runs the program once and leaves the window the task card shows; the lesson\'s table keeps method names whole', async () => {
  const found = challengesOf(moduleOf('drawing-and-images')).find(({ ex }) => ex.kind === 'code' && (cardTest(ex)?.events ?? []).some((e) => e.startsWith('drag ')) && /^press /.test(cardTest(ex).events[0]) && /^release /.test(cardTest(ex).events.at(-1)) && cardTest(ex).events.filter((e) => e.startsWith('press ')).length === 1);
  expect(found, 'no module 52 code challenge whose task card is one press, drags and a release');
  const { ex } = found;
  const shown = cardTest(ex);
  const pts = shown.events.map((e) => /(?:at|to) (\S+) (\S+)$/.exec(e).slice(1).map(Number));
  const target = /^\w+ (Canvas \d+)/.exec(shown.events[0])[1];
  const canvasNode = windowNodes(shown.window).find((n) => n.type === 'Canvas');
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'drawing-and-images', found);
  // The lesson's table of mouse methods keeps each name on one line (a too-wide table scrolls inside itself), on a desktop and a 320 px phone.
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const rows = await page.locator('article.step-text td > code').evaluateAll((els) => els.map((e) => [e.textContent, e.getClientRects().length]));
    expect(rows.length > 0 && rows.every(([, n]) => n === 1), `table code split over lines at ${width} px: ${JSON.stringify(rows.filter(([, n]) => n > 1))}`);
    await noOverflow(page, `the mouse lesson at ${width} px`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  expect((await page.locator('.task-card .task-events').innerText()) === describeEvents(shown.events), await page.locator('.task-card .task-events').innerText());
  expect((await page.locator('.task-card .fx-canvas').count()) === 1, 'the task card draws the canvas');
  await setProgram(page, ex.solution);
  const panel = await runWithMyInput(page);
  expect((await panel.locator('.fx-draw-note').innerText()).includes('the drawing updates when you lift your finger'), await panel.locator('.fx-draw-note').innerText());
  const pad = panel.getByRole('application', { name: `${target}, ${canvasNode.width} x ${canvasNode.height}` });
  await pad.waitFor();
  // The stroke of the task, with the mouse: pressed at its first point, moved straight to each next one, let go at the last.
  const n = await runCount(page);
  await pad.scrollIntoViewIfNeeded();
  const b = await pad.boundingBox();
  await page.mouse.move(b.x + pts[0][0] + 0.5, b.y + pts[0][1] + 0.5);
  await page.mouse.down();
  for (const [x, y] of pts.slice(1, -1)) await page.mouse.move(b.x + x + 0.5, b.y + y + 0.5);
  expect((await runCount(page)) === n, 'nothing is sent before the button lifts');
  await page.mouse.up();
  await nextRun(page, n);
  await settled(page);
  expect((await runCount(page)) === n + 1, `the stroke ran the program ${(await runCount(page)) - n} times`);
  const outline = await panel.locator('details.fx-astext pre').textContent();
  expect(outline === shown.outline, `the window after the stroke:\n${outline}\nnot\n${shown.outline}`);
  // The page paints what the program drew: the stroke's color halfway along its first line.
  const first = /strokeLine (\S+) (\S+) (\S+) (\S+), stroke (#[0-9a-f]{6})/.exec(shown.outline);
  if (first) {
    const [x1, y1, x2, y2] = first.slice(1, 5).map(Number);
    const px = await canvasPixel(pad.locator('canvas.fx-canvas-el'), (x1 + x2) / 2, (y1 + y2) / 2);
    expect(near(px.slice(0, 3), hexRgb(first[5]), 80) && px[3] >= 160, `the stroke is painted ${px}, not ${first[5]}`);
  }
  await bothThemes(page, 'a module 52 drawing challenge run with my input', null);
  await onPhones(page, 'a module 52 drawing challenge run with my input', null);
  await threeShots(page, 'm52-drawing-run', panel);
  // The model solution passes.
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// ------------------------------------------------------------------ part 14.3 to 14.5 lesson pages (modules 53 and 54)

/** A frame's shape, from a window's frames list: the merged state of the first node of `type` after frame j (from 1). */
function frameShape(list, j, type) {
  let key = null;
  const s = {};
  for (const changes of list.slice(0, j)) {
    for (const c of changes) {
      if (key == null && c.type === type) key = c.k;
      if (c.k != null && c.k === key) Object.assign(s, c);
    }
  }
  return s;
}
/** An SVG transform's translate and rotate: { x, y, r } (0 when left out). */
function moveOf(t) {
  const tr = /translate\(([-\d.e]+) ([-\d.e]+)\)/.exec(t ?? '');
  const rot = /rotate\(([-\d.e]+)/.exec(t ?? '');
  return { x: tr ? Number(tr[1]) : 0, y: tr ? Number(tr[2]) : 0, r: rot ? Number(rot[1]) : 0 };
}
/** The player of a lesson figure: its counter, Play or Pause, whether it draws a frame. */
const figurePlayer = (figure) =>
  figure.evaluate((f) => ({
    count: f.querySelector('.fx-pl-count')?.textContent ?? null,
    play: f.querySelector('.fx-pl-btn[data-act="play"], .fx-pl-btn[data-act="pause"]')?.getAttribute('aria-label') ?? null,
    frame: !!f.querySelector('.fx-anim[data-on]'),
    said: f.querySelector('.fx-player [aria-live]')?.textContent ?? '',
  }));
/** Waits until the player inside `where` stands at its last frame (of `total`) with nothing playing. */
async function playedToEnd(page, where, total) {
  await page.waitForFunction(([e, words]) => e.querySelector('.fx-pl-count')?.textContent === words && !e.querySelector('.fx-anim[data-on]'), [await where.elementHandle(), `frame ${total} of ${total}`], { timeout: 30_000 });
}
/** Notes, from now on, every counter a lesson figure's player shows while it draws a frame (window.__figFrames). */
const watchFigure = (figure) =>
  figure.evaluate((f) => {
    window.__figFrames = [];
    new MutationObserver(() => {
      const c = f.querySelector('.fx-pl-count')?.textContent;
      if (c && f.querySelector('.fx-anim[data-on]') && window.__figFrames.at(-1) !== c) window.__figFrames.push(c);
    }).observe(f, { subtree: true, childList: true, characterData: true, attributes: true });
  });

await test('module 53 lesson: a game example is drawn in the lesson after its keys and frames, with its animation player, which plays once in view and ends at the window after the last event; steps and the slider draw earlier frames; the pre-rendered page has the same shapes and no player; reduced motion never plays; axe in both themes and at 320 px', async () => {
  const found = windowExample('asteroids', (b) => (b.window.frames?.list?.length ?? 0) >= 10 && b.events.some((e) => /^press key /.test(e)) && windowNodes(b.window).some((n) => n.type === 'Polygon') && /rotate -?\d/.test(b.outline));
  expect(found, 'no game example in module 53 with keys, at least 10 frames and a turned polygon');
  const { step, k, block } = found;
  const list = block.window.frames.list;
  const total = list.length;
  const ran = block.events.filter((e) => e.startsWith('frames ')).reduce((a, e) => a + Number(e.split(' ')[1]), 0);
  expect(block.window.frames.count === ran && total === ran && block.outline.endsWith(`frames run: ${ran}`), `the example ran ${ran} frames: ${JSON.stringify({ count: block.window.frames.count, kept: total })}`);
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/asteroids/${step.slug}/`);
  await lessonReady(page);
  const figure = page.locator('article.step-text figure.fx-figure').nth(k);
  await figure.locator('.fx-player').waitFor();
  expect((await figure.locator('.fx-events').innerText()) === `After: ${describeEvents(block.events)}`, await figure.locator('.fx-events').innerText());
  // The player: real buttons with names, the speed, the slider labelled; it's a group of its own.
  const player = figure.getByRole('group', { name: 'The animation of the frames' });
  for (const name of ['Restart', 'Back one frame', 'Play', 'Forward one frame']) expect((await player.getByRole('button', { name, exact: true }).count()) === 1, `the player has ${name}`);
  expect((await player.getByRole('slider', { name: 'Frame' }).getAttribute('max')) === String(total) && (await player.getByRole('combobox', { name: 'Speed' }).count()) === 1, 'the slider and the speed');
  // It plays once, from frame 1, when it comes into view, and stops at the last frame.
  await watchFigure(figure);
  await figure.scrollIntoViewIfNeeded();
  await playedToEnd(page, figure, total);
  const seen = await page.evaluate(() => window.__figFrames);
  expect(seen[0] === `frame 1 of ${total}` && seen.length >= 3, `played: ${seen.slice(0, 4).join(', ')} (${seen.length})`);
  let st = await figurePlayer(figure);
  expect(st.count === `frame ${total} of ${total}` && st.play === 'Play' && !st.frame && st.said === '', JSON.stringify(st));
  // At the end, the window after the last event: the polygon where the outline puts it, turned as it says.
  const svg = figure.locator('.fx-desktop:not(.fx-anim) svg.fx-shapes');
  expect((await svg.count()) === 1, 'the lesson draws the shapes as SVG');
  const [, ox, oy, or] = /^\s+Polygon [^\n]*, at \(([-\d.]+), ([-\d.]+)\), rotate (-?[\d.]+)/m.exec(block.outline).map(Number);
  const endT = await svg.locator('polygon').first().getAttribute('transform');
  const end = moveOf(endT);
  expect(end.x === ox && end.y === oy && end.r === or, `the polygon is drawn ${endT}, the outline says at (${ox}, ${oy}), rotate ${or}`);
  expect((await svg.locator('polygon, circle, rect, line, text').count()) === windowNodes(block.window).filter((n) => ['Polygon', 'Circle', 'Rectangle', 'Line', 'Text'].includes(n.type)).length, 'a shape per node');
  // The slider halfway: that frame is drawn in place of the window, the polygon where the frames list puts it.
  const mid = Math.ceil(total / 2);
  await player.getByRole('slider', { name: 'Frame' }).fill(String(mid));
  st = await figurePlayer(figure);
  expect(st.count === `frame ${mid} of ${total}` && st.frame, JSON.stringify(st));
  const want = frameShape(list, mid, 'Polygon');
  const midT = await figure.locator('.fx-anim polygon').first().getAttribute('transform');
  const got = moveOf(midT);
  expect(got.x === (want.tx ?? 0) && got.y === (want.ty ?? 0) && got.r === (want.r ?? 0), `frame ${mid}: ${midT}, the frames list says ${JSON.stringify(want)}`);
  // A step forward and back: the counter moves by one and is said.
  await player.getByRole('button', { name: 'Forward one frame' }).click();
  st = await figurePlayer(figure);
  expect(st.count === `frame ${mid + 1} of ${total}` && st.said === `frame ${mid + 1} of ${total}`, JSON.stringify(st));
  await player.getByRole('button', { name: 'Back one frame' }).click();
  await player.getByRole('button', { name: 'Back one frame' }).click();
  st = await figurePlayer(figure);
  expect(st.count === `frame ${mid - 1} of ${total}` && st.said === `frame ${mid - 1} of ${total}` && st.frame, JSON.stringify(st));
  // Play from there: it plays to the end and shows the window again.
  await player.getByRole('button', { name: 'Play', exact: true }).click();
  await playedToEnd(page, figure, total);
  expect((await svg.locator('polygon').first().getAttribute('transform')) === endT, 'the window after the last event again');
  const details = figure.locator('details.fx-astext');
  await details.locator('summary').click();
  expect((await details.locator('pre').innerText()) === block.outline, `as text: ${await details.locator('pre').innerText()}`);
  // The pre-rendered page: the same shapes, the window after the last event, its words, and no player (the page adds it).
  const html = await (await page.request.get(BASE + `learn/asteroids/${step.slug}/`)).text();
  const fig = (html.match(/<figure class="fx-figure">[\s\S]*?<\/figure>/g) ?? [])[k] ?? '';
  expect(fig.includes(`After: ${describeEvents(block.events)}`.replace(/&/g, '&amp;')), `the pre-rendered events: ${fig.slice(0, 300)}`);
  const preSvg = fig.match(/<svg class="fx-shapes"[\s\S]*?<\/svg>/)?.[0] ?? '';
  expect(preSvg && (preSvg.match(/<polygon /g) ?? []).length === (await svg.locator('polygon').count()), `the pre-rendered shapes: ${preSvg.slice(0, 300)}`);
  expect(/<polygon [^>]*transform="([^"]*)"/.exec(preSvg)?.[1] === endT, `the pre-rendered polygon: ${/<polygon [^>]*>/.exec(preSvg)?.[0]}, the page's ${endT}`);
  expect(!fig.includes('fx-player') && !fig.includes('fx-anim'), 'the pre-rendered page has no player');
  expect(htmlText(fig.match(/<pre[^>]*><code>([\s\S]*?)<\/code><\/pre>/)?.[1] ?? '') === block.outline, 'the pre-rendered window as text');
  await lessonBothThemes(page, 'a module 53 lesson');
  await lessonOnPhone(page, 'a module 53 lesson');
  await threeShots(page, 'm53-game-example', figure);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
  // With reduced motion the player never plays by itself: it shows the last frame (the window).
  const r = await newPage({ reducedMotion: 'reduce' });
  await r.page.goto(BASE + `learn/asteroids/${step.slug}/`);
  await lessonReady(r.page);
  const rf = r.page.locator('article.step-text figure.fx-figure').nth(k);
  await rf.locator('.fx-player').waitFor();
  await watchFigure(rf);
  await rf.scrollIntoViewIfNeeded();
  await r.page.waitForTimeout(800);
  st = await figurePlayer(rf);
  expect(st.count === `frame ${total} of ${total}` && !st.frame && st.play === 'Play' && (await r.page.evaluate(() => window.__figFrames.length)) === 0, `reduced motion: ${JSON.stringify(st)}`);
  expect(r.errors.length === 0, r.errors.join('\n'));
  await r.ctx.close();
});

await test('module 53 game challenge: the task card says the keys and frames in words and draws the window they leave (no player: a test keeps only the count); a wrong program shows both windows with the differing line marked and its own frames in a player; axe in both themes and at 320 px; the model solution passes', async () => {
  const found = challengesOf(moduleOf('asteroids')).find(({ ex }) => ex.kind === 'code' && (cardTest(ex)?.events ?? []).filter((e) => e.startsWith('frames ')).length >= 2 && cardTest(ex).events.some((e) => /^press key /.test(e)) && cardTest(ex).expect === '' && /^\s+Polygon /m.test(cardTest(ex).outline) && /launch\(/.test(ex.seed));
  expect(found, 'no module 53 code challenge whose task card holds a key, runs frames twice and prints nothing');
  const { ex } = found;
  const shown = cardTest(ex);
  const ran = shown.events.filter((e) => e.startsWith('frames ')).reduce((a, e) => a + Number(e.split(' ')[1]), 0);
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'asteroids', found);
  const card = page.locator('.task-card');
  const words = await card.locator('.task-events').innerText();
  expect(words === describeEvents(shown.events) && /^Hold \w+, run \d+ frames/.test(words), words);
  expect((await card.locator('svg.fx-shapes polygon').count()) >= 1, 'the task card draws the shapes');
  expect((await card.locator('.fx-player').count()) === 0, 'the task card has no player');
  expect((await card.locator('details.fx-astext pre').textContent()) === shown.outline && shown.outline.endsWith(`frames run: ${ran}`), `the task card's window as text: ${await card.locator('details.fx-astext pre').textContent()}`);
  // The starter code is wrong: the polygon doesn't end where it should.
  await setProgram(page, ex.seed);
  const out = await check(page);
  expect(out.includes('Not yet'), out);
  const failed = page.locator('.t-fail', { hasText: shown.name }).first();
  const cmp = failed.locator('.fx-compare');
  expect((await cmp.count()) === 1, `no window comparison: ${out}`);
  const sides = cmp.locator(':scope > div');
  expect((await sides.nth(0).locator('svg.fx-shapes polygon').count()) >= 1 && (await sides.nth(1).locator('svg.fx-shapes polygon').count()) >= 1, 'both windows draw the shapes');
  const marks = async (side) => (await sides.nth(side).locator('mark.fx-differs').allTextContents()).map((t) => t.replace(/^Differs: /, '').trim());
  const should = await marks(0);
  const yours = await marks(1);
  expect(should.length >= 1 && should.every((l) => l.startsWith('Polygon ')) && shown.outline.split('\n').map((l) => l.trim()).includes(should[0]), `marked in the expected window: ${should}`);
  expect(yours.length === should.length && yours[0].startsWith('Polygon ') && yours[0] !== should[0], `marked in your window: ${yours}`);
  // Only the learner's run has its frames: a player under their window, which plays to the end; the expected window has none.
  expect((await sides.nth(0).locator('.fx-player').count()) === 0 && (await sides.nth(1).locator('.fx-player').count()) === 1, 'a player under your window only');
  const yourCount = sides.nth(1).locator('.fx-pl-count');
  await sides.nth(1).scrollIntoViewIfNeeded();
  await playedToEnd(page, sides.nth(1), ran);
  expect((await yourCount.textContent()) === `frame ${ran} of ${ran}`, await yourCount.textContent());
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, 'a failed game challenge at 320 px');
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `a failed game challenge at 320 px, ${colorScheme} theme`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
  await lessonBothThemes(page, 'a failed game challenge');
  await threeShots(page, 'm53-game-challenge-card', card.locator('.task-events'));
  await threeShots(page, 'm53-game-challenge-failed', cmp);
  await setProgram(page, ex.solution);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 53 keys challenge, "Run with my input": the key row offers the keys the code names; holding one and running 30 frames sends them, plays the 30 frames and ends as the task card shows; letting go and running 30 more plays only the new ones; axe in both themes and at 320 and 390 px', async () => {
  const found = challengesOf(moduleOf('asteroids')).find(({ ex }) => {
    const ev = cardTest(ex)?.events ?? [];
    return ex.kind === 'code' && ev.length === 3 && /^press key (\w+)$/.test(ev[0]) && ev[1] === 'frames 30' && ev[2] === ev[0].replace('press', 'release');
  });
  expect(found, 'no module 53 code challenge whose task card holds a key for 30 frames and lets go');
  const { ex } = found;
  const shown = cardTest(ex);
  const key = /^press key (\w+)$/.exec(shown.events[0])[1];
  const keyName = key[0] + key.slice(1).toLowerCase();
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'asteroids', found);
  expect((await page.locator('.task-card .task-events').innerText()) === `Hold ${keyName}, run 30 frames, then let go of ${keyName}`, await page.locator('.task-card .task-events').innerText());
  await setProgram(page, ex.solution);
  const panel = await runWithMyInput(page);
  const title = shown.window.windows[0].title;
  await panel.getByRole('group', { name: `Window: ${title}` }).waitFor();
  const keys = panel.getByRole('group', { name: 'Keys to hold' });
  const names = await keys.getByRole('button').evaluateAll((bs) => bs.map((b) => b.querySelector('.fx-key-name').textContent));
  const named = [...new Set([...ex.solution.matchAll(/KeyCode\.(\w+)/g)].map((m) => m[1]))].filter((c) => !['LEFT', 'RIGHT', 'UP', 'DOWN', 'SPACE'].includes(c));
  expect(names.slice(0, 5).join(',') === 'Left,Right,Up,Down,Space' && names.length === 5 + named.length, `the keys offered: ${names}`);
  expect((await panel.innerText()).includes("The game doesn't run live here: choose the keys to hold, run some frames, and the page shows them as an animation."), 'the note under the key row');
  // Hold the key and run 30 frames: one run, the 30 frames play from the first, and the window is the task card's.
  await keys.getByRole('button', { name: keyName, exact: true }).click();
  expect((await keys.getByRole('button', { name: keyName, exact: true }).getAttribute('aria-pressed')) === 'true', `${keyName} is held`);
  await watchPlayer(page);
  let n = await runCount(page);
  await panel.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-panel .fx-pl-count')?.textContent === 'frame 30 of 30' && !document.querySelector('.fx-panel .fx-anim[data-on]'), null, { timeout: 30_000 });
  expect((await runCount(page)) === n + 1, `Run 30 frames ran the program ${(await runCount(page)) - n} times`);
  let seen = await page.evaluate(() => window.__frames);
  expect(seen[0] === 'frame 1 of 30' && seen.length >= 3, `played: ${seen.slice(0, 4).join(', ')} (${seen.length})`);
  const outline = await outlineOf(page);
  expect(outline === shown.outline, `the window after holding ${keyName} for 30 frames:\n${outline}\nnot\n${shown.outline}`);
  const [, ox, oy] = /^\s+Polygon [^\n]*, at \(([-\d.]+), ([-\d.]+)\)/m.exec(shown.outline).map(Number);
  const at = moveOf(await shipTransform(page));
  expect(at.x === ox && at.y === oy, `the polygon is drawn at (${at.x}, ${at.y}), the task card's at (${ox}, ${oy})`);
  // Let go and run 30 more: the program gets the release, only frames 31 to 60 play, and nothing moves.
  await keys.getByRole('button', { name: keyName, exact: true }).click();
  await watchPlayer(page);
  n = await runCount(page);
  await panel.getByRole('button', { name: 'Run 30 frames' }).click();
  await nextRun(page, n);
  await page.waitForFunction(() => document.querySelector('.fx-panel .fx-pl-count')?.textContent === 'frame 60 of 60' && !document.querySelector('.fx-panel .fx-anim[data-on]'), null, { timeout: 30_000 });
  seen = await page.evaluate(() => window.__frames);
  expect(seen[0] === 'frame 31 of 60', `the new frames played: ${seen.slice(0, 3).join(', ')}`);
  const after = await outlineOf(page);
  expect(after === shown.outline.replace(/frames run: 30$/, 'frames run: 60'), `after letting go and 30 more frames:\n${after}`);
  expect(!(await page.locator('.freerun .fx-stale-note').count()), 'the window is up to date');
  await bothThemes(page, 'a module 53 keys challenge run with my input', null);
  await onPhones(page, 'a module 53 keys challenge run with my input', null);
  await threeShots(page, 'm53-keys-run', panel);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 54 lesson: an xml block is shown colored under its file\'s name (pom.xml), and a java fragment (JDBC) is shown colored, never run; both reachable with the keyboard and the same in the pre-rendered page; axe in both themes and at 320 px', async () => {
  const mod = moduleOf('libraries-and-tools');
  const pomStep = mod.steps.find((s) => /^```xml pom\.xml$/m.test(s.text));
  expect(pomStep, 'no ```xml pom.xml block in module 54');
  // The fragment's text, from the module's own file (the build turns ```java fragment into ```java).
  const raw = readFileSync(new URL('../content/modules/54-libraries-and-tools.yaml', import.meta.url), 'utf8');
  const frag = [...raw.matchAll(/^( *)```java fragment\n([\s\S]*?)\n\1```$/gm)].find((m) => m[2].includes('PreparedStatement'));
  expect(frag && frag[2].includes('PreparedStatement'), 'no java fragment with JDBC in module 54');
  const fragText = frag[2].split('\n').map((l) => l.slice(frag[1].length)).join('\n');
  const fragStep = mod.steps.find((s) => s.text.includes(fragText));
  expect(fragStep, 'the JDBC fragment is in no step of the build');
  const { ctx, page, errors } = await newPage();
  // pom.xml: a figure with the file's name, the XML colored (tag names, comments, the <?xml ?> line).
  await page.goto(BASE + `learn/libraries-and-tools/${pomStep.slug}/`);
  await lessonReady(page);
  const pom = page.locator('article.step-text figure.code-file', { has: page.locator('figcaption', { hasText: /^pom\.xml$/ }) }).first();
  await pom.waitFor();
  const pomPre = pom.locator('pre.code-xml');
  const pomText = await pomPre.textContent();
  const pomBlock = /^```xml pom\.xml\n([\s\S]*?)\n```$/m.exec(pomStep.text)[1];
  expect(pomText === pomBlock, `the pom.xml block shows its text exactly:\n${pomText}`);
  const kinds = await pomPre.locator('span[class^="tk-"]').evaluateAll((els) => [...new Set(els.map((e) => e.className))].sort());
  expect(['tk-kw'].every((c) => kinds.includes(c)) && (await pomPre.locator('span.tk-kw', { hasText: /^project$/ }).count()) >= 1, `the XML is colored: ${kinds}`);
  expect((await pomPre.getAttribute('tabindex')) === '0', 'the xml block takes the keyboard focus to scroll');
  // Nothing about it can be run: no run button in the figure.
  expect((await pom.locator('button').count()) === 0, 'the xml block has a button');
  const pomHtml = await (await page.request.get(BASE + `learn/libraries-and-tools/${pomStep.slug}/`)).text();
  const preFig = /<figure class="code-file"><figcaption>pom\.xml<\/figcaption><pre tabindex="0" class="code-xml"><code>([\s\S]*?)<\/code><\/pre><\/figure>/.exec(pomHtml);
  expect(preFig && htmlText(preFig[1]) === pomBlock && preFig[1].includes('<span class="tk-kw">project</span>'), 'the pre-rendered pom.xml, colored');
  await lessonBothThemes(page, 'a module 54 lesson with pom.xml');
  await lessonOnPhone54(page, 'a module 54 lesson with pom.xml');
  await threeShots(page, 'm54-pom-xml', pom);
  // The JDBC fragment: Java colored like the other examples, a block to read only.
  // (Its first challenge may be a "What does it print?", which loads no Java engine: wait for the text.)
  await page.goto(BASE + `learn/libraries-and-tools/${fragStep.slug}/`);
  await page.locator('article.step-text pre.code-java').first().waitFor({ timeout: ENGINE_TIMEOUT });
  const javaPres = page.locator('article.step-text pre.code-java');
  const texts = await javaPres.allTextContents();
  const i = texts.indexOf(fragText);
  expect(i >= 0, `no Java block shows the fragment exactly (${texts.length} Java blocks)`);
  const fragPre = javaPres.nth(i);
  // The coloring is applied a moment after the text shows: wait for it (a slow runner needs longer).
  await fragPre.locator('span.tk-kw', { hasText: /^try$/ }).first().waitFor({ timeout: 15000 }).catch(() => {});
  expect((await fragPre.locator('span.tk-kw', { hasText: /^try$/ }).count()) >= 1 && (await fragPre.locator('span.tk-str').count()) >= 1, 'the fragment is colored');
  expect((await fragPre.getAttribute('tabindex')) === '0', 'the fragment takes the keyboard focus to scroll');
  expect((await fragPre.locator('xpath=..').locator('button').count()) === 0, 'the fragment has a button');
  const fragHtml = await (await page.request.get(BASE + `learn/libraries-and-tools/${fragStep.slug}/`)).text();
  expect([...fragHtml.matchAll(/<pre tabindex="0" class="code-java"><code>([\s\S]*?)<\/code><\/pre>/g)].some((m) => htmlText(m[1]) === fragText), 'the pre-rendered page shows the fragment');
  // An xml block with no file's name (the H2 dependency) is colored too, without a caption.
  const plainXml = page.locator('article.step-text pre.code-xml');
  if (await plainXml.count()) expect((await plainXml.first().locator('xpath=..').evaluate((e) => e.tagName)) !== 'FIGURE' && (await plainXml.first().locator('span.tk-kw').count()) > 0, 'an xml block without a name');
  await lessonBothThemes(page, 'a module 54 lesson with JDBC');
  await lessonOnPhone54(page, 'a module 54 lesson with JDBC');
  await threeShots(page, 'm54-jdbc-fragment', fragPre);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
/** A lesson without windows on a 320 px phone: nothing scrolls the page sideways (a code block scrolls inside itself), axe in both themes. */
async function lessonOnPhone54(page, label) {
  await page.setViewportSize({ width: 320, height: 800 });
  await noOverflow(page, `${label} at 320 px`);
  const wide = await page.locator('article.step-text pre').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.getAttribute('tabindex')));
  expect(wide.every((t) => t === '0'), `${label} at 320 px: a code block that scrolls can't be reached with the keyboard`);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await axe(page, `${label} at 320 px, ${colorScheme} theme`);
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'light' });
}

await test('module 54 DAO challenge: the starter code in its file tabs fails the method calls; the model solution (an in-memory DAO) passes', async () => {
  const found = challengesOf(moduleOf('libraries-and-tools')).find(({ ex }) => ex.kind === 'code' && /Dao\b/.test(ex.task) && splitFiles(ex.seed).length >= 2 && ex.tests.some((t) => t.call));
  expect(found, 'no module 54 code challenge of several files with a DAO and method calls');
  const { ex } = found;
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'libraries-and-tools', found);
  const paths = await tabPaths(page);
  expect(JSON.stringify(paths) === JSON.stringify(splitFiles(ex.seed).map((f) => f.path)), `the file tabs: ${paths}`);
  expect(paths.some((p) => /Dao\.java$/.test(p)), `a DAO file: ${paths}`);
  const out = await check(page);
  expect(!out.includes('All tests passed'), `the starter code passes: ${out}`);
  await setProgram(page, ex.solution);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  await threeShots(page, 'm54-dao-passed', page.locator('.workbench .results').first());
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

// ------------------------------------------------------------------ the extra modules' lessons (modules 55 to 59)

await test('module 55: a recursion challenge whose base case is jumped over crashes with StackOverflowError, explained (the == test that odd numbers skip); the model solution passes', async () => {
  const found = challengesOf(moduleOf('recursion')).find(({ ex }) => /if \(steps == 0\)/.test(ex.seed ?? '') && /StackOverflowError/.test(ex.task ?? ''));
  expect(found, 'no module 55 challenge with a base case written as steps == 0');
  const { ex } = found;
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'recursion', found);
  const out = await check(page);
  expect(!out.includes('All tests passed') && out.includes('StackOverflowError'), `the starter code: ${out}`);
  expect(/moves calls itself on line \d+ \(Main\.java\)/.test(out) && out.includes('has a base case (the if on line') && out.includes('but the calls never reach it') && out.includes('An == test is missed when the value jumps over it'), out);
  await threeShots(page, 'm55-stack-overflow', page.locator('.workbench .results').first());
  await setProgram(page, ex.solution);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 55: the starter code of the no-base-case challenge checks quickly (it prints nothing per call), the overflow is explained once, and the model solution passes', async () => {
  const found = challengesOf(moduleOf('recursion')).find(({ ex }) => /return 1 \+ heights\(height \/ 2\);/.test(ex.seed ?? '') && !/if \(/.test(ex.seed ?? ''));
  expect(found, 'no module 55 challenge with heights and no base case');
  const { ex } = found;
  const { ctx, page, errors } = await newPage();
  await openChallenge(page, 'recursion', found);
  const t0 = Date.now();
  const out = await check(page);
  const ms = Date.now() - t0;
  console.log(`    the starter code's check took ${(ms / 1000).toFixed(1)} s`);
  // Before, the starter code printed a line on each of about 16,000 calls, and its check took about 10 s on this machine.
  expect(ms < 6000, `the starter code's check took ${ms} ms`);
  expect(!out.includes('All tests passed') && out.includes('StackOverflowError'), `the starter code: ${out}`);
  expect(out.includes('heights has no base case') && out.includes('if (height <= 0) { return ...; }'), out);
  // Both tests overflow the same way: the long explanation once, then a short line.
  const notes = await page.locator('.workbench .results .t-note').allInnerTexts();
  expect(notes.length === 2 && notes[0].includes('heights has no base case') && /^Crashed the same way as the test above \(StackOverflowError, line \d+\)\.$/.test(notes[1]), JSON.stringify(notes));
  await setProgram(page, ex.solution);
  const passed = await check(page);
  expect(passed.includes('All tests passed'), passed);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 57: a java error example (a switch expression without a default) shows what javac prints, and the same code in the editor gets that error from the browser\'s javac, explained', async () => {
  const mod = moduleOf('switch-and-text');
  // The build keeps a java error example as a java block followed by its javac block.
  const example = /```java\n((?:(?!```)[\s\S])*String snack = switch \(button\)(?:(?!```)[\s\S])*)```\s*```javac\n([^`]*does not cover all possible input values[^`]*)```/;
  const step = mod.steps.find((s) => example.test(s.text));
  expect(step, 'no module 57 lesson text with the snack switch error');
  const m = example.exec(step.text);
  const [code, javac] = [m[1], m[2]];
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/switch-and-text/${step.slug}/`);
  await lessonReady(page);
  const figure = page.locator('article.step-text figure.io-javac', { hasText: 'does not cover all possible input values' });
  expect((await figure.count()) === 1, 'the javac block of the example');
  expect((await figure.locator('figcaption').textContent()).trim() === 'What javac prints', 'its label');
  expect((await figure.locator('pre').innerText()).trim() === javac.trim(), `what the page shows: ${await figure.locator('pre').innerText()}`);
  await setCode(page, code);
  const out = await check(page);
  expect(/didn't compile/i.test(out) && /line 4/i.test(out) && out.includes('the switch expression does not cover all possible input values'), out);
  expect(out.includes('A switch expression must give a value for every possible value of what it switches on.') && out.includes('This switch expression on button has cases for only some values, and a number has far more possible values than cases can list, so it needs default -> ... at the end'), out);
  await lessonBothThemes(page, 'a module 57 lesson with a java error example');
  await lessonOnPhone54(page, 'a module 57 lesson with a java error example');
  await threeShots(page, 'm57-javac', figure);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('module 59: a lesson with a linked list renders with the Extra label, no MOOC section line, and passes axe in both themes and at 320 px', async () => {
  const mod = moduleOf('linked-structures');
  const step = mod.steps.find((s) => /\.next\b/.test(s.text)) ?? mod.steps[1];
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + `learn/linked-structures/${step.slug}/`);
  await lessonReady(page);
  expect((await page.locator('.crumbs .extra-tag').count()) === 1, 'the lesson header has the Extra label');
  expect((await page.locator('a[href*="java-programming.mooc.fi/part-"]').count()) === 0, 'no MOOC section link');
  expect((await page.locator('aside.credit').innerText()).includes("not part of the University of Helsinki's course"), 'the credit says it is an extra');
  await lessonBothThemes(page, 'a module 59 lesson');
  await lessonOnPhone54(page, 'a module 59 lesson');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('playground: run a program with input, share it, open the link elsewhere', async () => {
  const { ctx, page, errors } = await newPage();
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(page, 'import java.util.Scanner;\n\n' + MAIN('        Scanner scanner = new Scanner(System.in);\n        String word = scanner.nextLine();\n        System.out.println(word + word);'));
  await page.fill('#pg-stdin', 'na');
  const out = await check(page);
  expect(out.includes('nana') && out.includes('Exit code 0'), out);
  await page.click('text=Share');
  await page.locator('#pg-link').waitFor();
  const link = await page.inputValue('#pg-link');
  expect(link.includes('/playground/#code='), link);
  await axe(page, 'playground with output');
  await shot(page, 'playground-desktop');
  // Another browser opens the link: it sees the program and its input, and its own program is kept.
  const other = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await other.ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  await other.page.goto(link);
  await other.page.locator('.banner-info').waitFor();
  expect((await other.page.inputValue('#pg-stdin')) === 'na', 'input came with the link');
  expect((await editorText(other.page)).includes('word + word'), 'code came with the link');
  await other.page.click('text=Back to my program');
  expect((await editorText(other.page)).includes('What is your name?'), 'back to the example');
  expect((await other.page.evaluate(() => document.activeElement?.tagName)) === 'H1', 'focus moved to the heading, not lost');
  // A link pasted into a tab that already shows the Playground opens too (only the # part changes).
  await other.page.evaluate((h) => (location.hash = h), new URL(link).hash);
  await other.page.locator('.banner-info').waitFor();
  expect((await editorText(other.page)).includes('word + word'), 'the shared program opened in the same tab');
  // "Playground" in the menu leads back to the learner's own program.
  await other.page.locator('footer a', { hasText: 'Playground' }).click();
  await other.page.waitForFunction(() => !location.hash && !document.querySelector('.banner-info'));
  expect((await editorText(other.page)).includes('What is your name?'), 'own program after the Playground link');
  await other.ctx.close();
  // The first browser still has its program after a reload.
  await page.reload();
  await page.locator('.cm-content').waitFor();
  expect((await editorText(page)).includes('word + word'), 'the program is saved');
  // "Delete all progress" deletes the Playground program too.
  page.once('dialog', (d) => d.accept());
  await page.goto(BASE + 'settings/');
  await page.click('text=Delete all progress');
  await page.locator('text=All progress and saved code on this device were deleted.').waitFor();
  await page.goto(BASE + 'playground/');
  await page.locator('.cm-content').waitFor();
  expect((await editorText(page)).includes('What is your name?'), 'the Playground shows the example again');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('playground: the output keeps the order it was printed in, error messages too; the files the program wrote are shown', async () => {
  const { ctx, page, errors } = await newPage({ viewport: { width: 320, height: 800 } });
  await page.goto(BASE + 'playground/');
  await lessonReady(page);
  await setCode(
    page,
    'import java.io.PrintWriter;\nimport java.nio.file.Files;\nimport java.nio.file.Path;\n\npublic class Main {\n    public static void main(String[] args) throws Exception {\n' +
      '        System.out.println("Reading scores");\n        System.err.println("Warning: line 2 is not a number");\n        System.out.println("Total: 8");\n' +
      '        Files.createDirectories(Path.of("reports"));\n        try (PrintWriter out = new PrintWriter("reports/summary.txt")) {\n            for (int i = 1; i <= 20; i++) {\n                out.println("line " + i);\n            }\n        }\n' +
      '        Files.writeString(Path.of("note.txt"), "Done\\n");\n        System.out.println("Last line");\n    }\n}\n',
  );
  await check(page);
  const out = await page.locator('.results .console').first().innerText();
  expect(out.trim() === 'Reading scores\nWarning: line 2 is not a number\nTotal: 8\nLast line', `the error message stays between the lines: ${out}`);
  const short = await page.locator('div.written-file').allInnerTexts();
  expect(short.length === 1 && /note\.txt after the run/i.test(short[0]) && short[0].includes('Done'), `a short file is shown: ${short}`);
  const folded = page.locator('details.written-file');
  expect(/reports\/summary\.txt after the run/i.test(await folded.locator('summary').innerText()) && (await folded.getAttribute('open')) === null, 'a long file starts folded, under its path');
  await folded.locator('summary').click();
  expect((await folded.locator('pre').innerText()).includes('line 20'), 'opened, it shows the whole file');
  await noOverflow(page, 'playground with written files at 320 px');
  await axe(page, 'playground with written files');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

console.log('Practice');
// The right answers come from the build's own drill file.
const DRILLS = JSON.parse(readFileSync(new URL('../src/generated/drills.json', import.meta.url), 'utf8'));
const drillById = new Map([...DRILLS.drills, ...DRILLS.placement].map((d) => [d.id, d]));
/** Answers the rep on screen, right or wrong. Boss reps are answered right only. */
async function answerRep(page, right = true) {
  const id = await page.locator('.rep').getAttribute('data-drill');
  const d = drillById.get(id);
  expect(d, `unknown drill ${id}`);
  switch (d.type) {
    case 'predict':
      await page.fill('#rep-input', right ? d.answer : d.answer + ' and more');
      await page.keyboard.press('Enter');
      break;
    case 'fill':
      await page.fill('input.blank', right ? d.answer : 'zzz');
      await page.keyboard.press('Enter');
      break;
    case 'bug': {
      const n = right ? Number(d.answer) : Number(d.answer) === 1 ? 2 : 1;
      await page.locator(`button.bugline[aria-label^="Line ${n}:"]`).click();
      break;
    }
    case 'compiles':
      await page.click(right === (d.answer === 'yes') ? '.btn-yes' : '.btn-no');
      break;
    case 'choice': {
      const n = right ? d.answer : d.answer === '1' ? '2' : '1';
      await page.click(`.choice[data-choice="${n}"]`);
      break;
    }
    case 'boss':
      await setCode(page, d.exercise.solution);
      await page.click('#check');
      break;
  }
  return d;
}
const practiceState = (extra = {}) => ({ version: 1, steps: {}, settings: { mobileData: true, ...extra.settings }, ...extra.state });

await test('Deathmatch: with nothing finished, the lobby offers lesson 1, the placement quiz and interview prep', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'deathmatch/');
  // The pre-rendered page has a .lobby too: wait for what only the app draws.
  await page.locator('.lobby .rank-card').waitFor();
  const text = await page.locator('.lobby').innerText();
  expect(text.includes('No drills unlocked yet') && text.includes('Placement quiz'), text);
  expect((await page.locator('text=Try interview prep').count()) === (DRILLS.drills.some((d) => d.topic === 'interview') ? 1 : 0), 'interview prep offered when it has questions');
  await axe(page, 'deathmatch lobby, nothing unlocked');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('Deathmatch: ranked play waits for 10 drills; Casual is open before that', async () => {
  const first = 'printing-first-program';
  const open = DRILLS.drills.filter((d) => d.after === first && d.type !== 'boss').length;
  if (open >= 10) return;
  const { ctx, page, errors } = await newPage();
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), practiceState({ state: { steps: { [first]: { done: true, challenges: {} } } } }));
  await page.goto(BASE + 'deathmatch/');
  await page.locator('.lobby .modes').waitFor();
  expect(await page.locator('.mode-dm').isDisabled(), 'Deathmatch is closed');
  expect((await page.locator('.mode-dm').innerText()).includes(`(${open} so far)`), await page.locator('.mode-dm').innerText());
  expect(!(await page.locator('.mode:has(.mode-name:text-is("Casual"))').isDisabled()), 'Casual is open');
  // Enter doesn't start a closed mode.
  await page.locator('h1').click();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect((await page.locator('.rep').count()) === 0, 'no run started');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

/** Replaces Math.random in the page with a seeded generator (mulberry32), so random picks repeat. */
function seedRandom(ctx, seed = 20260930) {
  return ctx.addInitScript((start) => {
    let a = start;
    Math.random = () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

await test('Deathmatch: a finished step unlocks its drills; right answers of every type build the streak', async () => {
  const { ctx, page, errors } = await newPage();
  // The printing module finished (its drills are open); boss reps off for the instant types first.
  const steps = Object.fromEntries(['printing-first-program', 'printing-several-lines', 'printing-print-and-println', 'printing-comments', 'printing-compiler-errors'].map((id) => [id, { done: true, challenges: {} }]));
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), practiceState({ state: { steps }, settings: { boss: false } }));
  // A seeded Math.random picks the same 12 drills every run, so the check for four types can't
  // fail by chance (unseeded, it failed about one run in a hundred).
  await seedRandom(ctx);
  await page.goto(BASE + 'deathmatch/');
  await page.locator('.lobby .modes').waitFor();
  await axe(page, 'deathmatch lobby');
  await page.click('.mode-dm');
  const seen = new Set();
  for (let i = 1; i <= 12; i++) {
    await page.locator('.rep').waitFor();
    const d = await answerRep(page, true);
    seen.add(d.type);
    await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), i);
    if (i === 3) await axe(page, 'deathmatch rep');
  }
  expect(seen.size >= 4, `only these drill types came up: ${[...seen]}`);
  // A wrong answer ends a one-life run, with the answer, why, and a share button for the new best.
  await page.locator('.rep').waitFor();
  await answerRep(page, false);
  await page.locator('.death').waitFor();
  const death = await page.locator('.death').innerText();
  expect(/eliminated/i.test(death) && death.includes('a new personal best') && death.includes('Share'), death);
  await axe(page, 'eliminated');
  expect(await page.evaluate(() => document.activeElement?.id === 'death-title'), 'focus moves to the verdict');
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('java-arena-v1')).dm);
  await page.waitForTimeout(400);
  let dm = await saved();
  expect(dm.best.deathmatch === 12 && dm.runs.length === 1 && dm.runs[0].reps === 13 && dm.runs[0].kills === 12, `saved once, with its numbers: ${JSON.stringify(dm.runs)}`);
  // Enter respawns.
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('.hud-n')?.textContent === '0' && !!document.querySelector('.rep'));
  // A run left by following a link is kept too.
  await answerRep(page, true);
  await page.waitForFunction(() => document.querySelector('.hud-n')?.textContent === '1');
  await page.click('#main-nav a[href$="/learn/"]');
  await page.locator('.module-live').first().waitFor();
  await page.waitForTimeout(400);
  dm = await saved();
  expect(dm.runs.length === 2 && dm.runs[0].reps === 1 && dm.runs[0].streak === 1, `the left run is saved: ${JSON.stringify(dm.runs)}`);
  await page.goBack();
  await page.locator('.lobby .modes').waitFor();
  expect((await page.locator('.runs').innerText()).includes('Deathmatch'), 'the run is listed');
  await axe(page, 'deathmatch lobby with runs');
  // Enter on the (scrollable, focusable) runs table doesn't start a run.
  await page.locator('.table-scroll').focus();
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  expect((await page.locator('.rep').count()) === 0, 'Enter on the runs table started a run');
  await page.locator('.mode-dm').click();
  await page.locator('.rep').waitFor();
  await page.keyboard.press('Escape');
  await page.locator('.lobby .modes').waitFor();
  expect((await saved()).runs.length === 2, 'a run with no answers is not saved');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('Casual: a miss costs a life and shows why; Continue goes on; a boss rep is a real program', async () => {
  const { ctx, page, errors } = await newPage();
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), practiceState({ settings: { unlockAll: true, boss: true, topicsOff: [...new Set(DRILLS.drills.map((d) => d.topic))].filter((t) => t !== 'printing') } }));
  await page.goto(BASE + 'deathmatch/');
  await page.locator('.lobby .modes').waitFor();
  await page.locator('.mode:has(.mode-name:text-is("Casual"))').click();
  await page.locator('.rep').waitFor();
  const d = await answerRep(page, false);
  expect(d.type !== 'boss', 'the first rep is a quick one');
  await page.locator('.death').waitFor();
  const review = await page.locator('.death').innerText();
  expect(review.includes('A life lost') && review.includes('2 lives left'), review);
  if (d.why) expect(review.includes(d.why.replace(/`/g, '').slice(0, 20)), `why shown: ${review}`);
  expect(await page.evaluate(() => document.activeElement?.id === 'death-title'), 'focus moves to the verdict');
  await page.keyboard.press('Enter');
  // Reps 2 to 7 right; the 8th is a boss rep, answered with its solution and checked by the engine.
  for (let i = 2; i <= 8; i++) {
    await page.locator('.rep').waitFor();
    const r = await answerRep(page, true);
    if (i === 8) expect(r.type === 'boss', `rep 8 is a ${r.type}`);
    await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), i - 1, { timeout: i === 8 ? ENGINE_TIMEOUT : 10_000 });
  }
  // The run's best streak is what counts, not the streak it ended on.
  await page.locator('.rep').waitFor();
  await answerRep(page, false);
  await page.locator('.death').waitFor();
  await page.waitForTimeout(400);
  const dm = await page.evaluate(() => JSON.parse(localStorage.getItem('java-arena-v1')).dm);
  expect(dm.best.casual === 7 && dm.runs[0].streak === 7 && dm.runs.length === 1, `casual best: ${JSON.stringify(dm)}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('Deathmatch on a phone (360 px): reps of every type fit the screen', async () => {
  const { ctx, page } = await newPage({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), practiceState({ settings: { unlockAll: true, boss: false } }));
  await seedRandom(ctx);
  await page.goto(BASE + 'deathmatch/');
  await page.locator('.lobby .modes').waitFor();
  await noOverflow(page, 'lobby 360');
  await page.locator('.mode:has(.mode-name:text-is("Casual"))').click();
  const types = new Set();
  for (let i = 1; i <= 15; i++) {
    await page.locator('.rep').waitFor();
    await noOverflow(page, `rep ${i} at 360`);
    await codeFits(page, `rep ${i} at 360`);
    types.add((await answerRep(page, true)).type);
    await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), i);
  }
  await page.locator('.rep').waitFor();
  await answerRep(page, false);
  await page.locator('.death').waitFor();
  await noOverflow(page, 'review at 360');
  await codeFits(page, 'review at 360');
  await axe(page, 'review at 360');
  expect(types.size >= 3, `types: ${[...types]}`);
  await ctx.close();
});

await test("drill code on a phone (390 px): a long GUI line wraps under its own start and no code box scrolls sideways (Deathmatch, a review card, the daily challenge, the placement quiz); a bug drill's wrapped lines stay tappable and keyboard-usable; axe passes in both themes", async () => {
  const longest = (d) => Math.max(...d.display.split('\n').map((l) => l.length));
  const gui = DRILLS.drills.filter((d) => d.topic.startsWith('gui-'));
  const predict = gui.filter((d) => d.type === 'predict').sort((a, b) => longest(b) - longest(a))[0];
  const fill = gui.filter((d) => d.type === 'fill').sort((a, b) => longest(b) - longest(a))[0];
  // Bug drills whose wrong line is long enough to wrap (GUI ones first).
  const wrongLine = (d) => d.display.split('\n')[Number(d.answer) - 1];
  const bugs = DRILLS.drills.filter((d) => d.type === 'bug' && wrongLine(d).trim().length > 45).sort((a, b) => b.topic.startsWith('gui-') - a.topic.startsWith('gui-') || wrongLine(b).length - wrongLine(a).length);
  expect(predict && fill && bugs.length >= 2 && longest(predict) > 60, 'no long GUI drills to wrap');
  const due = Object.fromEntries([predict, fill, bugs[0], bugs[1]].map((d) => [d.id, { box: 1, right: 0, wrong: 1, last: 0, due: 0 }]));
  const { ctx, page, errors } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript((st) => localStorage.getItem('java-arena-v1') || localStorage.setItem('java-arena-v1', JSON.stringify(st)), practiceState({ settings: { unlockAll: true }, state: { drills: due } }));
  await page.goto(BASE + 'deathmatch/');
  await page.locator('.lobby .modes').waitFor();
  // Warm-up shows exactly the due drills, in any order.
  await page.locator('.mode:has(.mode-name:text-is("Warm-up"))').click();
  let right = 0;
  let tapped = false;
  let keyboard = false;
  for (let i = 0; i < 4; i++) {
    await page.locator('.rep').waitFor();
    const d = drillById.get(await page.locator('.rep').getAttribute('data-drill'));
    await noOverflow(page, `${d.id} at 390`);
    await codeFits(page, `${d.id} at 390`);
    if (d === predict) {
      // The longest line takes several rows, each later row starting right of where the line starts.
      const lines = page.locator('.rep pre.codeview .cl');
      const lengths = await lines.evaluateAll((els) => els.map((e) => e.textContent.length));
      const rows = await lineRows(lines.nth(lengths.indexOf(Math.max(...lengths))));
      expect(rows.length >= 2 && rows.slice(1).every((r) => r.left > rows[0].left + 1), `${d.id}: the longest line's rows start at ${JSON.stringify(rows.map((r) => Math.round(r.left)))}`);
      // The code box's text is still exactly the code.
      expect((await page.locator('.rep pre.codeview').textContent()) === d.display, `${d.id}: the code box's text isn't the code`);
      for (const colorScheme of ['dark', 'light']) {
        await page.emulateMedia({ colorScheme });
        await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
        await axe(page, `a wrapped GUI predict drill at 390 px, ${colorScheme} theme`);
      }
      await shot(page, 'drill-wrapped-390');
      await answerRep(page, true);
      right++;
    } else if (d === fill) {
      // A wrong answer: the review card's code wraps too.
      await answerRep(page, false);
      await page.locator('.death').waitFor();
      await codeFits(page, `${d.id} review at 390`);
      await noOverflow(page, `${d.id} review at 390`);
      await page.keyboard.press('Enter');
      continue;
    } else {
      // A bug drill: its wrong line wraps; every line stays inside the box.
      const target = page.locator(`button.bugline[aria-label^="Line ${d.answer}:"]`);
      const rows = await lineRows(target.locator('code'));
      expect(rows.length >= 2 && rows.slice(1).every((r) => r.left > rows[0].left + 1), `${d.id}: line ${d.answer} rows start at ${JSON.stringify(rows.map((r) => Math.round(r.left)))}`);
      const widths = await page.locator('.rep .bugline').evaluateAll((els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).length);
      expect(widths === 0, `${d.id}: ${widths} bug lines wider than the box`);
      if (!tapped) {
        // A tap on the line's last row picks that line.
        await target.scrollIntoViewIfNeeded();
        const last = (await lineRows(target.locator('code'))).at(-1);
        const x = last.left + 4;
        const y = (last.top + last.bottom) / 2;
        expect(await page.evaluate(([x, y, n]) => !!document.elementFromPoint(x, y)?.closest(`button.bugline[aria-label^="Line ${n}:"]`), [x, y, d.answer]), `${d.id}: the last row of line ${d.answer} isn't part of its button`);
        await page.touchscreen.tap(x, y);
        tapped = true;
      } else {
        // The keyboard: Tab reaches the lines, goes from line to line in order, and Enter picks the focused line.
        const order = await page.locator('.rep button.bugline').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
        const focused = () => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '');
        await page.locator('#rep-prompt').focus();
        for (let k = 0; k < 6 && (await focused()) !== order[0]; k++) await page.keyboard.press('Tab');
        expect((await focused()) === order[0], `${d.id}: Tab didn't reach the first line`);
        for (let k = 1; k < order.length; k++) {
          if ((await focused()).startsWith(`Line ${d.answer}:`)) break;
          await page.keyboard.press('Tab');
          expect((await focused()) === order[k], `${d.id}: Tab went to ${await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 80))}, not ${order[k]}`);
        }
        expect(await target.evaluate((e) => e === document.activeElement && e.matches(':focus-visible')), `${d.id}: line ${d.answer} isn't focused with a visible focus`);
        for (const colorScheme of ['dark', 'light']) {
          await page.emulateMedia({ colorScheme });
          await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
          await axe(page, `a wrapped bug drill at 390 px, ${colorScheme} theme`);
        }
        await shot(page, 'bug-drill-wrapped-390');
        await page.keyboard.press('Enter');
        keyboard = true;
      }
      right++;
    }
    await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), right);
  }
  expect(tapped && keyboard && right === 3, `tapped ${tapped}, keyboard ${keyboard}, ${right} right`);
  // The daily challenge and its card after the answer.
  await page.goto(BASE + 'daily/');
  await page.locator('.rep').waitFor();
  await codeFits(page, 'daily at 390');
  await answerRep(page, true);
  await page.locator('.death').waitFor();
  await codeFits(page, 'daily answered at 390');
  // The placement quiz's first questions.
  await page.goto(BASE + 'placement/');
  await page.click('text=Start the quiz');
  for (let i = 0; i < 3; i++) {
    await page.locator('#quiz-h', { hasText: `Question ${i + 1} of ${DRILLS.placement.length}` }).waitFor();
    await page.locator('.rep').waitFor();
    await codeFits(page, `placement question ${i + 1} at 390`);
    await page.click("text=I don't know this yet");
  }
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('Interview prep is open without any lesson done', async () => {
  if (!DRILLS.drills.some((d) => d.topic === 'interview')) return;
  const { ctx, page } = await newPage();
  await page.goto(BASE + 'deathmatch/');
  await page.click('text=Try interview prep');
  await page.locator('.rep').waitFor();
  const d = await answerRep(page, true);
  expect(d.topic === 'interview', d.topic);
  await page.waitForFunction(() => document.querySelector('.hud-n')?.textContent === '1');
  await ctx.close();
});

await test('daily challenge: one answer a day, kept after a reload, with the streak', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'daily/');
  await page.locator('.rep').waitFor();
  await axe(page, 'daily');
  await answerRep(page, true);
  await page.locator('.death').waitFor();
  expect((await page.locator('.death').innerText()).includes('Solved'), 'solved');
  await page.reload();
  await page.locator('.death').waitFor();
  expect((await page.locator('.stat-n').innerText()) === '1', 'a 1-day streak');
  expect((await page.locator('.dday-right').count()) === 1, 'today is marked');
  await axe(page, 'daily done');
  // The daily question is kept apart from Deathmatch: it doesn't unlock the drill there.
  expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('java-arena-v1')).drills ?? {}).length === 0), 'no drill state from the daily question');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('placement quiz: the first miss sets the start; skipping unlocks drills and moves Continue', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE + 'placement/');
  await page.click('text=Start the quiz');
  // Right, right, then "I don't know" for the rest: start at the third module.
  for (let i = 0; i < DRILLS.placement.length; i++) {
    // Wait for this question, not the previous one still on screen: a second tap there counts for it again.
    await page.locator('#quiz-h', { hasText: `Question ${i + 1} of ${DRILLS.placement.length}` }).waitFor();
    await page.locator('.rep').waitFor();
    if (i < 2) await answerRep(page, true);
    else await page.click("text=I don't know this yet");
  }
  await page.locator('text=Your starting point').waitFor();
  const third = DRILLS.placement[2].module;
  const result = await page.locator('.narrow').innerText();
  expect(result.includes('You got 2 of') && result.includes('skipping the 2 modules'), result);
  await axe(page, 'placement result');
  await page.click('text=Skip 2 modules and unlock their drills');
  await page.locator('text=their drills are now in Deathmatch').waitFor();
  await page.goto(BASE + 'learn/');
  await page.locator('.module-live').first().waitFor();
  expect((await page.locator('.learn').innerText()).includes('skipped'), 'skipped modules are marked');
  expect((await page.locator('.page-head a.btn-primary').getAttribute('href')).includes(`/learn/${third}/`), 'Continue goes to the third module');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

console.log('Moving progress');
const KEY = 'java-arena-v1';
const T = 1_760_000_000_000;
const PHONE = { viewport: { width: 390, height: 860 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const freshSettings = (over = {}) => ({ theme: 'system', textScale: 1, mobileData: false, sound: false, unlockAll: false, topicsOff: [], boss: true, keys: true, ...over });
/** Saved progress as the store keeps it. */
const progress = (over = {}) => ({ version: 1, steps: {}, drills: {}, dm: { best: { deathmatch: 0, casual: 0, warmup: 0, interview: 0 }, runs: [], reps: 0, kills: 0, bossKills: 0, days: {} }, daily: {}, placed: [], settings: freshSettings(), ...over });
/** A phone-sized browser whose saved progress starts as `st` (and stays as the page changes it). */
async function phoneWith(st, opts = {}) {
  const r = await newPage({ ...PHONE, ...opts });
  if (st) await r.ctx.addInitScript(([k, v]) => localStorage.getItem(k) || localStorage.setItem(k, v), [KEY, JSON.stringify(st)]);
  return r;
}
const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
/** On 320 and 390 px phones in both themes: nothing scrolls sideways and axe passes. */
async function phonesBothThemes(page, label) {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 860 });
    await noOverflow(page, `${label} at ${width} px`);
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
      await axe(page, `${label} at ${width} px, ${colorScheme} theme`);
    }
  }
  await page.setViewportSize(PHONE.viewport);
}
/** Screenshots of one part of the page at 390 px in both themes (with --shots). */
async function partShots(page, selector, name) {
  if (!SHOTS) return;
  await page.setViewportSize(PHONE.viewport);
  // The sticky header would cover the part where the page scrolls to it.
  await page.evaluate(() => document.querySelector('.topbar')?.style.setProperty('position', 'static'));
  for (const colorScheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await page.locator(selector).first().screenshot({ path: `${SHOTS}/${name}-390-${colorScheme}.png` });
  }
  await page.evaluate(() => document.querySelector('.topbar')?.style.removeProperty('position'));
}
async function makeLink(page, withCode) {
  await page.goto(BASE + 'settings/');
  await page.check(`input[name="transfer-what"][value="${withCode ? 'code' : 'progress'}"]`);
  await page.click('text=Make a transfer link');
  await page.locator('#transfer-link-text').waitFor();
  return page.locator('#transfer-link-text').inputValue();
}

// The learner on the first phone: two steps done (one with code saved later than the second phone's), drills, a run, dark theme.
const phoneA = progress({
  steps: {
    'printing-first-program': { done: true, doneAt: T + 1000, clean: true, challenges: { 0: { done: true, hintsUsed: 0, attempts: 1, code: 'public class Main { /* from phone A */ }', savedAt: T + 900 }, 1: { done: true, hintsUsed: 0, attempts: 1 }, 2: { done: true, hintsUsed: 0, attempts: 2 } } },
    'printing-several-lines': { done: true, doneAt: T + 2000, challenges: { 0: { done: true, hintsUsed: 1, attempts: 3, code: 'A newer program', savedAt: T + 5000 } } },
  },
  drills: { 'printing-1': { box: 3, right: 2, wrong: 0, last: T + 3000, due: T + 3000 + 86_400_000 } },
  dm: { best: { deathmatch: 5, casual: 0, warmup: 0, interview: 0 }, runs: [{ at: T + 100, mode: 'deathmatch', streak: 5, reps: 6, kills: 5 }], reps: 6, kills: 5, bossKills: 0, days: {} },
  settings: freshSettings({ theme: 'dark', textScale: 1.25 }),
});
// The second phone: a step the first doesn't have, older code in one challenge, the light theme.
const phoneB = progress({
  steps: {
    'printing-print-and-println': { done: true, doneAt: T + 500, challenges: { 0: { done: true, hintsUsed: 0, attempts: 1 } } },
    'printing-several-lines': { done: false, challenges: { 0: { done: false, hintsUsed: 0, attempts: 1, code: 'An older program', savedAt: T + 10 } } },
  },
  settings: freshSettings({ textScale: 1.125 }),
});

await test('moving progress: a link made on one phone opens in another browser and merges (a summary first, the address loses #p=, a reload offers nothing); axe on the summary in both themes at 320 and 390 px', async () => {
  const a = await phoneWith(phoneA);
  const link = await makeLink(a.page, true);
  expect(new RegExp(`^${BASE_PATH}transfer/#p=[A-Za-z0-9_-]+$`).test(new URL(link).pathname + new URL(link).hash), link);
  const told = await a.page.locator('.transfer-length').innerText();
  expect(told.includes(`${link.length.toLocaleString('en-US')} characters`), told);
  await a.ctx.close();

  const b = await phoneWith(phoneB);
  await b.page.goto(link);
  const review = b.page.locator('.import-review');
  await review.waitFor();
  const text = await review.innerText();
  for (const words of ['adds 2 finished steps', 'keeps your 1 finished step that the import doesn\'t have', 'replaces your code in 1 challenge where the import\'s is newer', 'Merge into my progress', 'Replace my progress'])
    expect(text.toLowerCase().includes(words.toLowerCase()), `the summary says "${words}": ${text}`);
  // Nothing changes before a choice.
  expect((await saved(b.page)).steps['printing-first-program'] === undefined, 'nothing imported yet');
  await b.page.emulateMedia({ colorScheme: 'dark' });
  await phonesBothThemes(b.page, 'the import summary');
  await partShots(b.page, '.transfer-page .card', 'transfer-summary');
  await b.page.click('button:has-text("Merge into my progress")');
  await b.page.locator('.transfer-done').waitFor();
  expect(!b.page.url().includes('#p='), `the address keeps the link: ${b.page.url()}`);
  const st = await saved(b.page);
  expect(st.steps['printing-first-program'].done && st.steps['printing-print-and-println'].done, 'steps from both');
  expect(st.steps['printing-several-lines'].challenges[0].code === 'A newer program', 'the code saved later');
  expect(st.steps['printing-several-lines'].done, 'done in either');
  expect(st.drills['printing-1']?.box === 3 && st.dm.best.deathmatch === 5, 'drills and Deathmatch');
  expect(st.settings.textScale === 1.125 && st.settings.theme === 'system', 'settings stay local on merge');
  await b.page.reload();
  await b.page.locator('#main h1').waitFor();
  expect((await b.page.locator('.import-review').count()) === 0, 'a reload offers nothing');
  expect(b.errors.length === 0, b.errors.join('\n'));
  await b.ctx.close();
});

await test('moving progress: Replace makes the progress and settings the import\'s; a damaged or cut link changes nothing', async () => {
  const a = await phoneWith(phoneA);
  const link = await makeLink(a.page, false);
  await a.ctx.close();
  const b = await phoneWith(phoneB);
  await b.page.goto(link);
  await b.page.locator('.import-review').waitFor();
  expect((await b.page.locator('.import-review').innerText()).includes('without code'), 'a link without code says so');
  await b.page.click('text=Replace my progress');
  await b.page.locator('.transfer-done').waitFor();
  const st = await saved(b.page);
  expect(!st.steps['printing-print-and-println'], 'the local step is gone');
  expect(st.steps['printing-first-program'].done && st.steps['printing-first-program'].challenges[0].code === undefined, 'progress only: no code');
  expect(st.settings.theme === 'dark' && st.settings.textScale === 1.25, 'settings replaced');
  expect(await b.page.evaluate(() => document.documentElement.dataset.theme) === 'dark', 'the page takes the new theme');
  // Damaged links: a cut one, and nonsense.
  const before = JSON.stringify(await saved(b.page));
  for (const bad of [link.slice(0, link.length - 12), BASE + 'transfer/#p=not*a*link']) {
    // On /transfer/ already, a new link is only a change of the hash: reload so each link is read
    // by a fresh page, not checked against the message the one before it left.
    await b.page.goto(bad);
    await b.page.reload();
    const msg = await b.page.locator('.transfer-error').innerText();
    expect(/damaged|incomplete/.test(msg), msg);
    expect(JSON.stringify(await saved(b.page)) === before, 'nothing changed');
  }
  await b.ctx.close();
});

await test('moving progress: another open tab that saves after a Merge or a Replace keeps the import (its older code, drills and steps don\'t come back)', async () => {
  const a = await phoneWith(phoneA);
  const link = await makeLink(a.page, true);
  await a.ctx.close();
  for (const choice of ['Merge into my progress', 'Replace my progress']) {
    const b = await phoneWith(phoneB);
    // The other tab: open on Settings with phone B's progress (and its older code) before the import.
    const other = await b.ctx.newPage();
    const otherErrors = [];
    other.on('pageerror', (e) => otherErrors.push(e.message));
    await other.goto(BASE + 'settings/');
    await other.locator('input[name="size"]').first().waitFor();
    await b.page.goto(link);
    await b.page.locator('.import-review').waitFor();
    await b.page.click(`button:has-text("${choice}")`);
    await b.page.locator('.transfer-done').waitFor();
    // The other tab then saves something that isn't progress.
    await other.waitForTimeout(300);
    await other.check('input[name="size"][value="1.4"]');
    // The other tab saves a moment later (its save waits a little); wait for that write, not a fixed time.
    await other.waitForFunction((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.settings?.textScale === 1.4, KEY);
    const st = await saved(b.page);
    expect(st.steps['printing-several-lines']?.challenges[0].code === 'A newer program', `${choice}: the import's newer code stays: ${JSON.stringify(st.steps['printing-several-lines'])}`);
    expect(st.drills['printing-1']?.box === 3, `${choice}: the import's drill stays`);
    expect(st.settings.textScale === 1.4, `${choice}: the other tab's setting is saved`);
    if (choice.startsWith('Replace')) expect(!st.steps['printing-print-and-println'], 'Replace: the step it removed doesn\'t come back');
    else expect(st.steps['printing-print-and-println']?.done, 'Merge: the local step stays');
    // The other tab shows the import too, and its next save is the same.
    await other.reload();
    await other.locator('input[name="size"]').first().waitFor();
    expect(JSON.stringify((await saved(other)).steps) === JSON.stringify(st.steps), `${choice}: a reload of the other tab keeps it`);
    expect(b.errors.length === 0 && otherErrors.length === 0, [...b.errors, ...otherErrors].join('\n'));
    await b.ctx.close();
  }
});

await test('moving progress: a progress file downloads with code and loads in another browser; a newer or wrong file changes nothing', async () => {
  const a = await phoneWith(phoneA);
  await a.page.goto(BASE + 'settings/');
  const [download] = await Promise.all([a.page.waitForEvent('download'), a.page.click('text=Download a progress file')]);
  expect(/^java-arena-progress-\d{4}-\d{2}-\d{2}\.json$/.test(download.suggestedFilename()), download.suggestedFilename());
  const file = join(mkdtempSync(join(tmpdir(), 'ja-progress-')), download.suggestedFilename());
  await download.saveAs(file);
  const json = JSON.parse(readFileSync(file, 'utf8'));
  expect(json.format === 'java-arena-progress' && json.version === 1 && json.withCode === true && json.site.endsWith(BASE_PATH), JSON.stringify({ ...json, data: '...' }));
  expect(json.data.steps['printing-first-program'].challenges[0].code.includes('from phone A'), 'the file has the code');
  await a.ctx.close();

  const b = await phoneWith(phoneB);
  await b.page.goto(BASE + 'settings/');
  const before = JSON.stringify(await saved(b.page));
  // A file from a newer version, and one that isn't a progress file.
  for (const [content, words] of [[JSON.stringify({ ...json, version: 99 }), 'newer version'], ['{"hello": 1}', "isn't a Java Arena progress file"]]) {
    await b.page.setInputFiles('[data-testid="progress-file"]', { name: 'p.json', mimeType: 'application/json', buffer: Buffer.from(content) });
    await b.page.waitForFunction((w) => document.querySelector('.transfer-file-message')?.textContent.includes(w), words);
    expect(JSON.stringify(await saved(b.page)) === before, 'nothing changed');
  }
  await b.page.setInputFiles('[data-testid="progress-file"]', file);
  await b.page.locator('.import-review').waitFor();
  expect((await b.page.locator('.import-review').innerText()).includes('This progress file was made on'), 'the summary names the file');
  await phonesBothThemes(b.page, 'settings with a file\'s summary');
  await b.page.click('button:has-text("Merge into my progress")');
  await b.page.waitForFunction(() => document.querySelector('.transfer-file-message')?.textContent.startsWith('Merged.'));
  const st = await saved(b.page);
  expect(st.steps['printing-first-program'].challenges[0].code.includes('from phone A') && st.steps['printing-print-and-println'].done, 'merged with code');
  // The focus moves once the message has rendered: wait for it rather than read it at once.
  const focused = await b.page.waitForFunction(() => document.activeElement?.classList.contains('transfer-file-message'), null, { timeout: 10000 }).then(() => true, () => false);
  expect(focused, 'focus moves to the message');
  await b.ctx.close();
});

/** Reads the QR code on the page as drawn at its size on screen (in CSS pixels), with jsQR. */
// Reads the QR code back as a phone screen shows it: at 2 device pixels per CSS pixel, the low end
// of Android phones (most are 2.6 to 3). At 1 device pixel, which no phone has, jsQR misses some
// codes at some sizes (one at exactly 320 px reads at 300 and 360) because the modules alias to 4
// and 5 pixels.
async function readQr(page) {
  const img = await page.locator('.transfer-qr svg').evaluate(async (svg) => {
    const box = svg.getBoundingClientRect();
    const w = Math.round(box.width) * 2;
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg).replace('<svg', `<svg width="${w}" height="${w}"`));
    const im = new Image();
    im.src = src;
    await im.decode();
    const c = document.createElement('canvas');
    c.width = c.height = w;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0, w, w);
    return { w, data: [...g.getImageData(0, 0, w, w).data] };
  });
  return { width: img.w, text: jsQR(Uint8ClampedArray.from(img.data), img.w, img.w)?.data ?? null };
}

await test('moving progress: a short link gets a QR code that scans at its size on a 320 px phone; a long one is refused with Progress only offered; the Settings section passes axe in both themes at 320 and 390 px', async () => {
  const a = await phoneWith(progress({ steps: { 'printing-first-program': phoneA.steps['printing-first-program'] } }), { viewport: { width: 320, height: 860 }, deviceScaleFactor: 1 });
  const short = await makeLink(a.page, false);
  await a.page.click('button:has-text("QR code")');
  await a.page.locator('.transfer-qr svg').waitFor();
  const read = await readQr(a.page);
  expect(read.text === short, `the QR code (${read.width} px) reads as ${read.text}`);
  await phonesBothThemes(a.page, 'settings with a QR code');
  await partShots(a.page, '#your-progress', 'settings-progress-qr');
  await partShots(a.page, '.transfer-qr', 'qr');
  // Long code: the link is too long for a QR code; Progress only is one tap away.
  await a.page.evaluate(([k, code]) => {
    const s = JSON.parse(localStorage.getItem(k));
    s.steps['printing-first-program'].challenges[0].code = code;
    localStorage.setItem(k, JSON.stringify(s));
  }, [KEY, Array.from({ length: 400 }, (_, i) => `        System.out.println("line ${i} ${(i * 7919) % 1000}");`).join('\n')]);
  const long = await makeLink(a.page, true);
  expect(long.length > 1273, `${long.length} characters`);
  await a.page.click('button:has-text("QR code")');
  const refused = await a.page.locator('.qr-refused').innerText();
  expect(refused.includes('too long for a QR code') && refused.includes('1,273'), refused);
  expect((await a.page.locator('.transfer-qr svg').count()) === 0, 'no QR code');
  await phonesBothThemes(a.page, 'settings with a refused QR code');
  await partShots(a.page, '#your-progress', 'settings-progress-refused');
  await a.page.click('text=Make a Progress only link');
  await a.page.locator('.transfer-qr svg').waitFor();
  expect((await readQr(a.page)).text === (await a.page.locator('#transfer-link-text').inputValue()), 'the Progress only link scans');
  expect(a.errors.length === 0, a.errors.join('\n'));
  await a.ctx.close();
});

await test('moving progress: over 8,000 characters the page says some apps cut long links and suggests the file', async () => {
  const code = Array.from({ length: 3000 }, (_, i) => `x${(i * 2654435761) % 4294967291}`).join(' ');
  const a = await phoneWith(progress({ steps: { 'printing-first-program': { done: true, challenges: { 0: { done: true, hintsUsed: 0, attempts: 1, code, savedAt: T } } } } }));
  const link = await makeLink(a.page, true);
  expect(link.length > 8000, `${link.length}`);
  const note = await a.page.locator('.transfer-long').innerText();
  expect(note.includes('Some apps cut long links') && note.includes('progress file'), note);
  await partShots(a.page, '#your-progress', 'settings-progress-long');
  await a.ctx.close();
});

await test('moving progress: /transfer/ works offline after a visit', async () => {
  const ctx = await browser.newContext({ ...PHONE });
  const page = await ctx.newPage();
  await page.goto(BASE + 'settings/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(phoneA)]);
  await page.reload();
  const link = await makeLink(page, false);
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(progress())]);
  await ctx.setOffline(true);
  await page.goto(link);
  await page.locator('.import-review').waitFor();
  await page.click('button:has-text("Merge into my progress")');
  await page.locator('.transfer-done').waitFor();
  expect((await saved(page)).steps['printing-first-program'].done, 'imported offline');
  await ctx.close();
});

console.log('Projects');
/** The projects of the build (content/projects), whole, in course order. */
const PROJECTS = (JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8')).projects ?? []).map((p) => JSON.parse(readFileSync(new URL(`../src/generated/projects/${p.id}.json`, import.meta.url), 'utf8')));
/** A program with a comment line after Main.java's code, so the code that passed can be told from the model solution. */
const markMain = (code, mark) => joinFiles(splitFiles(code).map((f) => (f.path === 'Main.java' ? { ...f, text: f.text.replace(/\n*$/, `\n// ${mark}\n`) } : f)));
/** A program with a milestone's new files after its own (src/lib/projects.ts withFiles). */
const addFiles = (code, files = {}) => {
  const have = splitFiles(code);
  const added = Object.entries(files).filter(([p]) => !have.some((f) => f.path === p)).map(([path, text]) => ({ path, text }));
  return added.length ? joinFiles([...have, ...added]) : code;
};
/** The text of Main.java in the editor (its tab, when there are several files). */
async function mainText(page) {
  const paths = await tabPaths(page);
  if (paths.length) {
    await page.click(`#file-tab-${paths.indexOf('Main.java')}`);
    await page.locator('.file-tab-on', { hasText: 'Main.java' }).waitFor();
  }
  return editorText(page);
}
const sameText = (a, b) => a.replace(/\s+$/, '') === b.replace(/\s+$/, '');
async function openMilestone(page, k) {
  await page.locator('.milestones > li').nth(k).locator('button').click();
  await page.locator('#milestone-h', { hasText: `Milestone ${k + 1}:` }).waitFor();
  await page.locator('.task-card', { hasText: `Milestone ${k + 1} of` }).waitFor();
}

await test('projects: the Learn and home pages link to them; the list says which module each comes after; a project opens one milestone at a time, each starting from the code that passed the one before with its new files; a shown solution opens the next, which offers the model solution; passing them all finishes the project, which travels in a transfer link; axe in both themes at 320 and 390 px', async () => {
  const { ctx, page, errors } = await phoneWith(progress(), { colorScheme: 'dark' });
  await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  for (const path of ['', 'learn/']) {
    await page.goto(BASE + path);
    await page.locator('#main h1').first().waitFor();
    expect((await page.locator('#main a[href$="/projects/"]').count()) > 0, `${path || 'home'}: no link to the projects`);
  }
  await page.goto(BASE + 'projects/');
  await page.locator('#main h1', { hasText: 'Projects' }).waitFor();
  await phonesBothThemes(page, 'the projects page');
  if (!PROJECTS.length) {
    expect((await page.locator('#main').innerText()).includes('No projects yet'), 'an empty list says so');
    await ctx.close();
    return;
  }
  const plan = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8')).plan;
  for (const x of PROJECTS) {
    const card = page.locator('.project-card', { hasText: x.title });
    const after = plan.find((m) => m.id === x.after);
    expect((await card.innerText()).includes(`After module ${after.number}: ${after.title}`), `${x.title}: which module it comes after`);
  }
  await shot(page, 'projects-list');
  // The first project, milestone by milestone.
  const p = PROJECTS[0];
  const ms = p.milestones;
  const n = ms.length;
  // Every project's page is pre-rendered with its intro and tasks, listed in the sitemap, and saved for offline use with its file.
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  const sw = await (await fetch(BASE + 'sw.js')).text();
  for (const x of PROJECTS) {
    const html = await (await fetch(BASE + `projects/${x.id}/`)).text();
    expect(html.includes(`<h1>${x.title.replace(/&/g, '&amp;')}</h1>`) && html.includes('Milestone 1: '), `projects/${x.id}/ is pre-rendered`);
    expect(sitemap.includes(`/projects/${x.id}/</loc>`), `the sitemap lists projects/${x.id}/`);
    expect(sw.includes(`"projects/${x.id}/"`) && sw.includes(`"lessons/projects/${x.id}-`), `the service worker saves projects/${x.id}/ and its file`);
  }
  await page.locator('.project-card', { hasText: p.title }).locator('a').first().click();
  await page.locator('#main h1', { hasText: p.title }).waitFor();
  await lessonReady(page);
  expect((await page.locator('.milestones > li.milestone-locked').count()) === n - 1, 'only the first milestone is open');
  // Milestone 1 starts from the seed, which doesn't pass.
  expect(sameText(await mainText(page), splitFiles(ms[0].seed).find((f) => f.path === 'Main.java').text), 'milestone 1 starts from the seed');
  expect(!(await check(page)).includes('All tests passed'), 'the seed passes milestone 1');
  await phonesBothThemes(page, `${p.title}, milestone 1 checked`);
  await shot(page, 'project-milestone-1');
  /** Passes milestone k with its model solution, marked so the next milestone's start can be told apart. */
  const pass = async (k) => {
    const code = markMain(ms[k].solution, `passed milestone ${k + 1} here`);
    await setProgram(page, code);
    const out = await check(page);
    expect(out.includes('All tests passed'), `milestone ${k + 1}: ${out.slice(0, 500)}`);
    return code;
  };
  let passed = await pass(0);
  await page.locator('.banner-pass', { hasText: `Milestone 1 of ${n} complete` }).waitFor();
  expect((await page.locator('.milestones > li').nth(1).getAttribute('class')).includes('milestone-open'), 'milestone 2 opens');
  // Milestone 2 starts from the code that passed milestone 1, with the files it adds.
  await openMilestone(page, 1);
  const start2 = addFiles(passed, ms[1].files);
  if (splitFiles(start2).length > 1) expect(JSON.stringify(await tabPaths(page)) === JSON.stringify(splitFiles(start2).map((f) => f.path)), `milestone 2's files: ${await tabPaths(page)}`);
  expect((await mainText(page)).includes('// passed milestone 1 here'), 'milestone 2 starts from the code that passed milestone 1');
  // Its solution, shown after the hints, opens milestone 3 without passing milestone 2.
  expect((await page.locator('.milestones > li').nth(2).getAttribute('class')).includes('milestone-locked'), 'milestone 3 is locked');
  while ((await page.locator('.btn-hint').count()) > 0) await page.locator('.btn-hint').click();
  await page.click('button:has-text("Show solution")');
  await page.locator('#solution').waitFor();
  if (n > 2) {
    expect((await page.locator('.milestones > li').nth(2).getAttribute('class')).includes('milestone-open'), 'milestone 3 opens after milestone 2\'s solution is shown');
    await openMilestone(page, 2);
    expect((await page.locator('.milestone-note').allInnerTexts()).join(' ').includes('starts from the model solution of milestone 2'), 'milestone 3 says it starts from the model solution');
    expect(sameText(await mainText(page), splitFiles(ms[2].seed).find((f) => f.path === 'Main.java').text), 'milestone 3 starts from milestone 2\'s model solution');
    // After typing in it, "Start from the model solution of milestone 2" puts that back, once confirmed.
    await page.click('.cm-content');
    await page.keyboard.press('ControlOrMeta+End');
    await page.keyboard.insertText('// a change of mine\n');
    expect((await editorText(page)).includes('// a change of mine'), 'the change is in the editor');
    page.once('dialog', (d) => d.accept());
    await page.click('button:has-text("Start from the model solution of milestone 2")');
    await page.waitForFunction(() => !document.querySelector('.cm-editor')?.javaArenaText?.().includes('a change of mine'));
    expect(sameText(await mainText(page), splitFiles(ms[2].seed).find((f) => f.path === 'Main.java').text), 'the model solution of milestone 2 is back');
    await phonesBothThemes(page, `${p.title}, milestone 3 with the model solution offered`);
    await shot(page, 'project-milestone-3');
    passed = await pass(2);
    // The later milestones, each from the code that passed the one before.
    for (let k = 3; k < n; k++) {
      await openMilestone(page, k);
      expect((await mainText(page)).includes(`// passed milestone ${k} here`), `milestone ${k + 1} starts from the code that passed milestone ${k}`);
      passed = await pass(k);
    }
  }
  expect((await page.locator('.banner-pass', { hasText: 'Project complete' }).count()) === 0, 'complete with milestone 2 not passed');
  // Milestone 2 passes last, which finishes the project.
  await openMilestone(page, 1);
  await pass(1);
  await page.locator('.banner-pass', { hasText: `Project complete: ${p.title}` }).waitFor();
  // Saved a moment after the change.
  await page.waitForFunction(([k, id]) => JSON.parse(localStorage.getItem(k))?.projects?.[id]?.done, [KEY, p.id]);
  const st = await saved(page);
  expect(st.projects[p.id].done && typeof st.projects[p.id].doneAt === 'number', JSON.stringify(st.projects[p.id]).slice(0, 300));
  expect(ms.every((m) => st.projects[p.id].milestones[m.id].done), 'every milestone is done');
  await page.reload();
  await page.locator('#main h1', { hasText: p.title }).waitFor();
  // The saved progress is read after the page renders: wait for the chip instead of counting at once.
  await page.locator('.step-count .done-chip').first().waitFor({ timeout: 15000 }).catch(() => {});
  expect((await page.locator('.step-count .done-chip').count()) === 1, 'the project page says done after a reload');
  // The finished project travels in a transfer link (progress only).
  const link = await makeLink(page, false);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
  const b = await phoneWith(progress());
  await b.page.goto(link);
  await b.page.locator('.import-review').waitFor();
  expect((await b.page.locator('.import-review').innerText()).includes(`${n} finished project milestone`), await b.page.locator('.import-review').innerText());
  await b.page.click('button:has-text("Merge into my progress")');
  await b.page.locator('.transfer-done').waitFor();
  expect((await saved(b.page)).projects[p.id]?.done, 'the project arrives done');
  await b.page.goto(BASE + 'projects/');
  await b.page.locator('.project-card.done', { hasText: p.title }).waitFor();
  // The record page lists the finished project.
  await b.page.goto(BASE + 'record/');
  await b.page.locator('.record-projects li', { hasText: p.title }).waitFor();
  await b.ctx.close();
});

console.log('Personal record');
const COURSE_INDEX = JSON.parse(readFileSync(new URL('../src/generated/course.json', import.meta.url), 'utf8'));
const RECORD_NOTICE = "This is a personal record made by Java Arena from the progress saved in this browser. It is not a certificate. It isn't issued or checked by the University of Helsinki or the MOOC, and nobody verifies it.";
const RECORD_DAY = 86_400_000;
/** A step done, with every challenge, at `at`. */
const stepDone = (s, at) => ({ done: true, doneAt: at, clean: true, challenges: Object.fromEntries([...Array(s.challenges).keys()].map((k) => [k, { done: true, hintsUsed: 0, attempts: 1 }])) });
/** Every step of these modules done, module k's last step on day k (noon, so the date is the same everywhere). */
function finished(ids, from = T) {
  const steps = {};
  ids.forEach((id, k) => {
    const m = COURSE_INDEX.modules.find((x) => x.id === id);
    m.steps.forEach((s, i) => (steps[s.id] = stepDone(s, from + k * RECORD_DAY - (m.steps.length - 1 - i) * 3_600_000)));
  });
  return steps;
}
const shortDate = (ms) => { const d = new Date(ms); return `${d.getDate()} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()]} ${d.getFullYear()}`; };
/** The number of pages of a PDF Chromium printed. */
const pdfPages = (buf) => (buf.toString('latin1').match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length;
/** Prints the page as Chromium's print preview would (A4), saves it with --shots, and returns its page count. */
async function printPdf(page, name) {
  const buf = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true });
  if (SHOTS) (await import('node:fs')).writeFileSync(`${SHOTS}/${name}.pdf`, buf);
  return pdfPages(buf);
}
const recordWords = /\b(certificate|certified|awarded|credentials?)\b/i;

await test('record: the record page lists the modules finished by part with their dates, the parts and projects finished and the totals; the name is kept in settings; it says plainly what it is; module pages and the end of a finished part link to it; axe in both themes at 320 and 390 px', async () => {
  const part1 = COURSE_INDEX.plan.filter((m) => m.course === 'I' && m.part === 1).map((m) => m.id);
  const part2 = COURSE_INDEX.plan.filter((m) => m.course === 'I' && m.part === 2).map((m) => m.id);
  const half = COURSE_INDEX.modules.find((m) => m.id === part2[1]);
  const proj = COURSE_INDEX.projects?.[0];
  const st = progress({
    steps: { ...finished([...part1, part2[0]]), [half.steps[0].id]: stepDone(half.steps[0], T) },
    projects: proj ? { [proj.id]: { done: true, doneAt: T + 20 * RECORD_DAY, milestones: {} } } : {},
  });
  const { ctx, page, errors } = await phoneWith(st);
  await ctx.addInitScript(() => (window.print = () => (window.__printed = (window.__printed ?? 0) + 1)));
  await page.goto(BASE + 'record/');
  await page.locator('.record-sheet').waitFor();
  expect((await page.locator('#main h1').innerText()) === 'Your record', 'the heading');
  expect((await page.locator('.record-notice').innerText()).trim() === RECORD_NOTICE, `the notice: ${await page.locator('.record-notice').innerText()}`);
  const sheet = await page.locator('.record-sheet').innerText();
  // Part 1: every module, each with the day its last step was finished; the part finished on the last one's day.
  const p1 = page.locator('.record-part', { has: page.locator('h4', { hasText: /^Part 1(?!\d)/ }) });
  expect((await p1.locator('.record-list li').count()) === part1.length, `part 1 lists ${part1.length} modules`);
  for (const [k, id] of part1.entries()) {
    const m = COURSE_INDEX.modules.find((x) => x.id === id);
    const row = await p1.locator('.record-list li').nth(k).innerText();
    expect(row.includes(`Module ${m.number}: ${m.title}`) && row.includes(shortDate(T + k * RECORD_DAY)), `module ${m.number}'s row: ${row}`);
  }
  expect((await p1.locator('h4').innerText()).includes(`finished ${shortDate(T + (part1.length - 1) * RECORD_DAY)}`), await p1.locator('h4').innerText());
  // Part 2: one module finished (the half-done one isn't listed).
  const p2 = page.locator('.record-part', { has: page.locator('h4', { hasText: /^Part 2(?!\d)/ }) });
  expect((await p2.locator('h4').innerText()).includes(`1 of ${part2.length} modules`), await p2.locator('h4').innerText());
  expect(!sheet.includes(`: ${half.title}`), 'a module with a step left is not listed');
  if (proj) expect(sheet.includes(proj.title) && sheet.includes(shortDate(T + 20 * RECORD_DAY)), `the project: ${sheet}`);
  const totals = await page.locator('.record-totals').innerText();
  const steps = part1.concat(part2[0]).reduce((a, id) => a + COURSE_INDEX.modules.find((m) => m.id === id).steps.length, 0) + 1;
  for (const words of [`Modules finished ${part1.length + 1} of ${COURSE_INDEX.plan.length}`, `Parts finished 1 of ${COURSE_INDEX.plan.filter((m) => m.part != null).reduce((a, m) => a.add(m.part), new Set()).size}`, `Steps done ${steps} of `])
    expect(totals.replace(/\s+/g, ' ').includes(words), `the totals say "${words}": ${totals}`);
  if (proj) expect(totals.replace(/\s+/g, ' ').includes(`Projects finished 1 of ${COURSE_INDEX.projects.length}`), totals);
  expect(sheet.includes((new URL(BASE).host + BASE_PATH).replace(/\/$/, '')), `the site's address: ${sheet.slice(0, 200)}`);

  // The name: typed, kept in settings, on the record; still there after a reload.
  await page.fill('#record-name', 'Ada Lovelace');
  await page.waitForFunction((k) => JSON.parse(localStorage.getItem(k))?.settings?.name === 'Ada Lovelace', KEY);
  expect((await page.locator('.record-who').innerText()) === 'Ada Lovelace', 'the name on the record');
  await page.reload();
  await page.locator('.record-who', { hasText: 'Ada Lovelace' }).waitFor();
  expect((await page.inputValue('#record-name')) === 'Ada Lovelace', 'the name field after a reload');
  // No word the design rules out, anywhere on the page but the notice's "It is not a certificate".
  const all = (await page.locator('body').innerText()).replace(RECORD_NOTICE, '');
  expect(!recordWords.test(all), `a word the record must not use: ${all.match(recordWords)?.[0]}`);
  // The button opens the print dialog.
  await page.click('button:has-text("Print or save as PDF")');
  expect((await page.evaluate(() => window.__printed)) === 1, 'Print or save as PDF calls window.print');

  await phonesBothThemes(page, 'the record page');
  if (SHOTS) {
    for (const width of [320, 390])
      for (const colorScheme of ['dark', 'light']) {
        await page.setViewportSize({ width, height: 860 });
        await page.emulateMedia({ colorScheme });
        await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
        // Let the buttons' color transitions end.
        await page.waitForTimeout(400);
        await shot(page, `record-${width}-${colorScheme}`);
      }
    await page.setViewportSize(PHONE.viewport);
  }

  // Printed (in the dark theme, too): only the record, light, with the logo, the address and the notice.
  await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
  const printed = await page.evaluate(() => {
    const shown = (sel) => { const e = document.querySelector(sel); return !!e && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().height > 0; };
    const sheet = document.querySelector('.record-sheet');
    return {
      header: shown('.topbar'), footer: shown('.footer'), controls: shown('.record-controls'), intro: shown('.page-head'),
      sheet: shown('.record-sheet'), logo: shown('.record-sheet .brand-mark'), address: shown('.record-address'), notice: shown('.record-notice'),
      bg: getComputedStyle(document.body).backgroundColor, sheetBg: getComputedStyle(sheet).backgroundColor, color: getComputedStyle(sheet).color, notice2: getComputedStyle(document.querySelector('.record-notice')).color,
    };
  });
  expect(!printed.header && !printed.footer && !printed.controls && !printed.intro, `printed: no navigation, footer, name field or button: ${JSON.stringify(printed)}`);
  expect(printed.sheet && printed.logo && printed.address && printed.notice, `printed: the record, the logo, the address and the notice: ${JSON.stringify(printed)}`);
  const rgb = (c) => c.match(/\d+/g).slice(0, 3).map(Number);
  expect(rgb(printed.bg).every((v) => v === 255) && rgb(printed.sheetBg).every((v) => v === 255), `printed on white: ${printed.bg}, ${printed.sheetBg}`);
  expect(rgb(printed.color).every((v) => v < 80) && rgb(printed.notice2).every((v) => v < 80), `printed in dark text: ${printed.color}, ${printed.notice2}`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/record-print-emulated.png`, fullPage: true });
  const pages = await printPdf(page, 'record');
  expect(pages === 1, `the record prints on one page: ${pages}`);
  await page.emulateMedia({ media: 'screen' });

  // Links to the record: a finished module's page (the last of part 1 says the part is finished too), the end of part 1 on the Learn page; not a module with a step left.
  const last = COURSE_INDEX.modules.find((m) => m.id === part1[part1.length - 1]);
  await page.goto(BASE + `learn/${last.id}/`);
  const told = await page.locator('.record-link').innerText();
  expect(told.includes(`You finished this module on ${shortDate(T + (part1.length - 1) * RECORD_DAY)}, and with it part 1.`), told);
  expect((await page.locator('.record-link a').getAttribute('href')) === `${BASE_PATH}record/`, 'the module page links to the record');
  await page.goto(BASE + `learn/${part2[0]}/`);
  expect(!(await page.locator('.record-link').innerText()).includes('part 2'), 'part 2 is not finished');
  await page.goto(BASE + `learn/${half.id}/`);
  await page.locator('#main h1').waitFor();
  expect((await page.locator('.record-link').count()) === 0, 'a module with a step left does not link to the record');
  await page.goto(BASE + 'learn/');
  await page.locator('.module-live').first().waitFor();
  expect((await page.locator('.record-link').count()) === 1, 'only part 1 ends with a link to the record');
  expect((await page.locator('.part', { hasText: 'Part 1' }).first().locator('.record-link').innerText()).includes('Part 1 finished.'), 'the end of part 1');
  await phonesBothThemes(page, 'the Learn page with a part finished');
  // The link takes the learner there.
  await page.click('.record-link a');
  await page.locator('.record-sheet').waitFor();
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

await test('record: with nothing finished it says so; with the whole course and every project finished it still prints on at most two pages', async () => {
  const empty = await phoneWith(progress());
  await empty.page.goto(BASE + 'record/');
  await empty.page.locator('.record-empty').waitFor();
  expect((await empty.page.locator('.record-empty').innerText()).includes('Nothing is finished yet in this browser.'), 'the empty record');
  await phonesBothThemes(empty.page, 'an empty record');
  await empty.ctx.close();

  const ids = COURSE_INDEX.modules.map((m) => m.id);
  const st = progress({
    steps: finished(ids),
    projects: Object.fromEntries((COURSE_INDEX.projects ?? []).map((p, k) => [p.id, { done: true, doneAt: T + (ids.length + k) * RECORD_DAY, milestones: {} }])),
    settings: freshSettings({ name: 'Maximilian Alexander Featherstonehaugh-Worthington' }),
  });
  const { ctx, page, errors } = await phoneWith(st);
  await page.goto(BASE + 'record/');
  await page.locator('.record-sheet').waitFor();
  expect((await page.locator('.record-sheet .record-list li').count()) === ids.length + (COURSE_INDEX.projects?.length ?? 0), 'every module and project is listed');
  const totals = (await page.locator('.record-totals').innerText()).replace(/\s+/g, ' ');
  expect(totals.includes(`Modules finished ${ids.length} of ${COURSE_INDEX.plan.length}`), totals);
  await phonesBothThemes(page, 'a full record');
  if (SHOTS) await shot(page, 'record-full-390');
  await page.emulateMedia({ media: 'print' });
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/record-full-print-emulated.png`, fullPage: true });
  const pages = await printPdf(page, 'record-full');
  expect(pages >= 1 && pages <= 2, `the whole course prints on at most two pages: ${pages}`);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

console.log('Projects, milestone by milestone');
/** Every file of the program in the editor, joined as the grader joins them (each tab's text, when there are several). */
async function programText(page) {
  const paths = await tabPaths(page);
  if (!paths.length) return editorText(page);
  const files = [];
  for (const [i, path] of paths.entries()) {
    await page.click(`#file-tab-${i}`);
    await page.locator(`#file-tab-${i}[aria-selected="true"]`).waitFor();
    files.push({ path, text: await editorText(page) });
  }
  await page.click('#file-tab-0');
  return files;
}
/** The same files with the same texts (trailing white space aside), in the same order. */
function sameProgram(got, want) {
  const g = Array.isArray(got) ? got : [{ path: 'Main.java', text: got }];
  const w = splitFiles(want);
  return g.length === w.length && g.every((f, i) => f.path === w[i].path && sameText(f.text, w[i].text));
}
/** Passes milestone k of `ms` with its model solution, marked so the next milestone's start can be told from it. */
async function passMilestone(page, ms, k) {
  const code = markMain(ms[k].solution, `passed milestone ${k + 1} here`);
  await setProgram(page, code);
  const out = await check(page);
  expect(out.includes('All tests passed'), `milestone ${k + 1} (${ms[k].id}): ${out.slice(0, 500)}`);
  return code;
}
/** The state class of each milestone in the list: done, open or locked. */
const milestoneStates = (page) => page.locator('.milestones > li').evaluateAll((els) => els.map((e) => (e.className.match(/milestone-(done|open|locked)/) ?? [])[1]));
/** Screenshots at 390 px in both themes and on a 1280 px desktop in both themes (with --shots). */
async function phoneAndDesktopShots(page, name) {
  if (!SHOTS) return;
  const st = await saved(page);
  const url = page.url();
  // A full-page shot of a scrolled page draws the sticky header where the view was.
  await page.evaluate(() => window.scrollTo(0, 0));
  for (const colorScheme of ['dark', 'light']) {
    await page.emulateMedia({ colorScheme });
    await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
    await page.waitForTimeout(400);
    await shot(page, `${name}-390-${colorScheme}`);
  }
  const d = await newPage();
  await d.ctx.addInitScript(([k, v]) => localStorage.setItem(k, v), [KEY, JSON.stringify(st)]);
  await d.ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  for (const colorScheme of ['dark', 'light']) {
    await d.page.emulateMedia({ colorScheme });
    await d.page.goto(url);
    await d.page.locator('#main h1').first().waitFor();
    if (await d.page.locator('.workbench').count()) await lessonReady(d.page);
    await d.page.waitForTimeout(400);
    await shot(d.page, `${name}-desktop-${colorScheme}`);
  }
  await d.ctx.close();
}

for (const x of PROJECTS) {
  await test(`projects: ${x.title}: the page renders with its intro and milestones; milestone 1 passes with its model solution; milestone 2 opens from that code with its new files`, async () => {
    const ms = x.milestones;
    const n = ms.length;
    const { ctx, page, errors } = await phoneWith(progress());
    await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
    await page.goto(BASE + `projects/${x.id}/`);
    await page.locator('#main h1', { hasText: x.title }).waitFor();
    // The pre-rendered list has no states: wait for the app's.
    await page.locator('.milestones > li.milestone-open').first().waitFor();
    expect((await page.locator('.milestones > li').count()) === n, `${n} milestones listed`);
    expect(JSON.stringify(await milestoneStates(page)) === JSON.stringify(['open', ...Array(n - 1).fill('locked')]), `at first only milestone 1 is open: ${await milestoneStates(page)}`);
    for (const [k, m] of ms.entries()) expect((await page.locator('.milestones > li').nth(k).innerText()).includes(m.title), `milestone ${k + 1}'s title in the list`);
    expect((await page.locator('article.step-text').innerText()).length > 300, 'the intro is shown');
    // "Project · After module N: title" is one run of text (pre-rendered too): on a phone it wraps like a sentence, each line from the left edge, not as two narrow columns.
    const html = await (await fetch(BASE + `projects/${x.id}/`)).text();
    expect(html.includes('<div class="step-count"><span class="project-label">Project · After '), `the pre-rendered label: ${html.match(/<div class="step-count">.{0,200}/)?.[0]}`);
    for (const width of [320, 390]) {
      await page.setViewportSize({ width, height: 860 });
      const lines = await page.locator('.step-count > .project-label').evaluate((e) => { const left = e.parentElement.getBoundingClientRect().left; return [...e.getClientRects()].map((r) => Math.round(r.left - left)); });
      expect(lines.length >= 1 && lines.every((x) => x === 0), `${width} px: the label's lines start at ${lines} px from the left edge`);
    }
    await page.setViewportSize(PHONE.viewport);
    await page.locator('.task-card', { hasText: `Milestone 1 of ${n}` }).waitFor();
    await lessonReady(page);
    expect(sameProgram(await programText(page), ms[0].seed), 'milestone 1 starts from the seed');
    const passed = await passMilestone(page, ms, 0);
    await page.locator('.banner-pass', { hasText: `Milestone 1 of ${n} complete` }).waitFor();
    await page.waitForFunction(([k, id, m]) => JSON.parse(localStorage.getItem(k))?.projects?.[id]?.milestones?.[m]?.done, [KEY, x.id, ms[0].id]);
    expect(JSON.stringify(await milestoneStates(page)) === JSON.stringify(['done', 'open', ...Array(n - 2).fill('locked')]), `after milestone 1: ${await milestoneStates(page)}`);
    // "Next milestone" opens milestone 2, from the code that passed milestone 1 and the files milestone 2 adds.
    await page.click('button:has-text("Next milestone")');
    await page.locator('#milestone-h', { hasText: `Milestone 2: ${ms[1].title}` }).waitFor();
    await page.locator('.task-card', { hasText: `Milestone 2 of ${n}` }).waitFor();
    expect(sameProgram(await programText(page), addFiles(passed, ms[1].files)), `milestone 2 starts from the code that passed milestone 1: ${JSON.stringify(await programText(page)).slice(0, 400)}`);
    if (Object.keys(ms[1].files ?? {}).length) expect((await page.locator('.milestone-note').allInnerTexts()).join(' ').includes('This milestone adds'), 'milestone 2 says which files it adds');
    // The page still says so after a reload.
    await page.reload();
    await page.locator('#main h1', { hasText: x.title }).waitFor();
    await page.locator('.milestones > li.milestone-open').first().waitFor();
    expect((await milestoneStates(page))[0] === 'done', 'milestone 1 is still done after a reload');
    expect(errors.length === 0, errors.join('\n'));
    await ctx.close();
  });
}

await test('projects: one project passed milestone by milestone in order finishes; the record page lists it with its date; a transfer link made after that carries the project into a fresh browser', async () => {
  // A project other than the one the test above shows solutions in, when there are several.
  const p = PROJECTS[PROJECTS.length > 1 ? 1 : 0];
  if (!p) return;
  const ms = p.milestones;
  const n = ms.length;
  const { ctx, page, errors } = await phoneWith(progress());
  await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  await page.goto(BASE + 'projects/');
  await page.locator('.project-card', { hasText: p.title }).waitFor();
  await phoneAndDesktopShots(page, 'projects-index');
  await page.goto(BASE + `projects/${p.id}/`);
  await page.locator('#main h1', { hasText: p.title }).waitFor();
  await lessonReady(page);
  let passed = null;
  for (let k = 0; k < n; k++) {
    if (k > 0) {
      await page.click('button:has-text("Next milestone")');
      await page.locator('#milestone-h', { hasText: `Milestone ${k + 1}: ${ms[k].title}` }).waitFor();
      expect(sameProgram(await programText(page), addFiles(passed, ms[k].files)), `milestone ${k + 1} starts from the code that passed milestone ${k}`);
    }
    if (k === 1) await phoneAndDesktopShots(page, 'project-milestone');
    passed = await passMilestone(page, ms, k);
    const want = [...Array(k + 1).fill('done'), ...(k + 1 < n ? ['open'] : []), ...Array(Math.max(0, n - k - 2)).fill('locked')];
    expect(JSON.stringify(await milestoneStates(page)) === JSON.stringify(want), `after milestone ${k + 1}: ${await milestoneStates(page)}, not ${want}`);
    if (k + 1 < n) await page.locator('.banner-pass', { hasText: `Milestone ${k + 1} of ${n} complete` }).waitFor();
  }
  await page.locator('.banner-pass', { hasText: `Project complete: ${p.title}` }).waitFor();
  await page.waitForFunction(([k, id]) => JSON.parse(localStorage.getItem(k))?.projects?.[id]?.done, [KEY, p.id]);
  // The banner and the finished project's header link to the record.
  await page.locator(`.banner-pass a[href="${BASE_PATH}record/"]`).waitFor();
  await page.locator(`.step-text .record-link a[href="${BASE_PATH}record/"]`).waitFor();
  expect((await page.locator('.step-text .record-link').innerText()).startsWith('You finished this project on '), await page.locator('.step-text .record-link').innerText());
  const st = await saved(page);
  const doneAt = st.projects[p.id].doneAt;
  expect(typeof doneAt === 'number' && ms.every((m) => st.projects[p.id].milestones[m.id].done), JSON.stringify(st.projects[p.id]).slice(0, 300));
  // Done in order: no solution was shown on the way.
  expect(ms.every((m) => !st.projects[p.id].milestones[m.id].sawSolution), 'no solution was looked at');
  // The record page lists it with the day it was finished.
  await page.goto(BASE + 'record/');
  const row = page.locator('.record-projects li', { hasText: p.title });
  await row.waitFor();
  expect((await row.innerText()).includes(shortDate(doneAt)), `the record's row: ${await row.innerText()}`);
  // All of it on one day: "finished on <day>", not "from <day> to <day>".
  const made = await page.locator('.record-made').innerText();
  expect(made.includes(`Everything with a date below was finished on ${shortDate(doneAt)}.`) && !made.includes('run from'), `the record's date line: ${made}`);
  expect((await page.locator('.record-totals').innerText()).replace(/\s+/g, ' ').includes(`Projects finished 1 of ${PROJECTS.length}`), await page.locator('.record-totals').innerText());
  await phoneAndDesktopShots(page, 'record');
  // A transfer link made now carries the project, its milestones and its code into a fresh browser.
  const link = await makeLink(page, true);
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
  const b = await phoneWith(null);
  await b.ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  await b.page.goto(link);
  await b.page.locator('.import-review').waitFor();
  expect((await b.page.locator('.import-review').innerText()).includes(`${n} finished project milestone`), await b.page.locator('.import-review').innerText());
  await b.page.click('button:has-text("Merge into my progress")');
  await b.page.locator('.transfer-done').waitFor();
  const got = (await saved(b.page)).projects[p.id];
  expect(got?.done && got.doneAt === doneAt && ms.every((m) => got.milestones[m.id]?.done), `the project arrives done: ${JSON.stringify(got).slice(0, 300)}`);
  expect(got.milestones[ms[n - 1].id].code === st.projects[p.id].milestones[ms[n - 1].id].code, 'the last milestone\'s code arrives');
  await b.page.goto(BASE + `projects/${p.id}/`);
  await b.page.locator('#main h1', { hasText: p.title }).waitFor();
  await b.page.locator('.milestones > li.milestone-done').first().waitFor();
  expect((await milestoneStates(b.page)).every((s) => s === 'done'), `every milestone is done in the fresh browser: ${await milestoneStates(b.page)}`);
  expect((await b.page.locator('.step-count .done-chip').count()) === 1, 'the project page says done');
  await b.page.goto(BASE + 'record/');
  await b.page.locator('.record-projects li', { hasText: p.title }).waitFor();
  await b.ctx.close();
});

console.log('Pro Track');
/** The Pro Track's projects from the source (content/pro-track.yaml and pro-track/), as the build read them. */
const PRO = readProTrack(ROOT_DIR).projects;
const PRO_HONEST_TEXT = "These projects run on your computer, not on this site. Java Arena can't see your code or your test results and doesn't grade anything";

await test('Pro Track: the home, Learn and last MOOC module pages and the footer link to it; /pro/ is pre-rendered, in the sitemap and saved for offline use (the zips are not), and says plainly that the site grades nothing; axe in both themes at 320 and 390 px', async () => {
  const { ctx, page, errors } = await phoneWith(progress());
  const last = COURSE_INDEX.plan.filter((m) => m.course === 'II').pop();
  for (const path of ['', 'learn/', `learn/${last.id}/`]) {
    await page.goto(BASE + path);
    await page.locator('#main h1').first().waitFor();
    expect((await page.locator('#main a[href$="/pro/"]').count()) > 0, `${path || 'home'}: no link to the Pro Track`);
    const html = await (await fetch(BASE + path)).text();
    expect(html.includes(`href="${new URL(BASE).pathname}pro/"`), `${path || 'home'}: the pre-rendered page links to the Pro Track`);
  }
  expect((await page.locator('footer a[href$="/pro/"]').count()) === 1, 'the footer links to the Pro Track');
  const html = await (await fetch(BASE + 'pro/')).text();
  expect(html.includes('<h1>Pro Track</h1>') && html.includes('JDK 21') && html.includes('adoptium.net'), 'pro/ is pre-rendered with its guide');
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  const sw = await (await fetch(BASE + 'sw.js')).text();
  expect(sitemap.includes('/pro/</loc>') && sw.includes('"pro/"'), 'pro/ is in the sitemap and saved for offline use');
  expect(!/\.zip"/.test(sw), 'no zip is saved for offline use');
  await page.goto(BASE + 'pro/');
  await page.locator('#main h1', { hasText: 'Pro Track' }).waitFor();
  const text = await page.locator('#main').innerText();
  expect(text.includes(PRO_HONEST_TEXT), 'says the site grades nothing');
  expect(!/\b(graded by Java Arena|verified|certificate)\b/i.test(text), 'claims nothing it does not do');
  if (!PRO.length) expect(text.includes('The projects are on their way'), 'an empty list says so');
  for (const p of PRO) {
    expect(text.includes(p.title), `lists ${p.title}`);
    const page2 = await (await fetch(BASE + `pro/${p.id}/`)).text();
    expect(page2.includes(`<h1>${p.title.replace(/&/g, '&amp;')}</h1>`) && page2.includes('Download the project (zip'), `pro/${p.id}/ is pre-rendered`);
    expect(sitemap.includes(`/pro/${p.id}/</loc>`) && sw.includes(`"pro/${p.id}/"`), `pro/${p.id}/ is in the sitemap and saved for offline use`);
  }
  await phonesBothThemes(page, 'the Pro Track page');
  await shot(page, 'pro-track');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});

for (const p of PRO)
  await test(`Pro Track: ${p.title}: the page shows what it practices and its README's steps; the zip downloads with the same bytes as a fresh zip of pro-track/${p.id}/; the checklist is kept after a reload, travels in a transfer link and shows on the record page as marked as done by you; axe in both themes at 320 and 390 px`, async () => {
    const { ctx, page, errors } = await phoneWith(progress(), { acceptDownloads: true });
    await page.goto(BASE + `pro/${p.id}/`);
    await page.locator('#main h1', { hasText: p.title }).waitFor();
    for (const h of ['What it practices', "What you'll build", 'Steps', 'Run the tests', 'Your checklist']) await page.locator('#main h2', { hasText: h }).first().waitFor();
    const practices = await page.locator('.pro-practices').innerText();
    for (const x of p.practices) {
      const m = COURSE_INDEX.plan.find((pm) => pm.id === x.module);
      expect(practices.includes(`${x.what} (from module ${m.number}: ${m.title})`), practices);
    }
    expect((await page.locator('.io-shell').count()) > 0, 'the commands are shown as commands for your own computer');
    expect((await page.locator(`a[href="https://github.com/AntonyPerez0/Java-Arena/tree/main/pro-track/${p.id}"]`).count()) === 1, 'links to its folder on GitHub');
    await phonesBothThemes(page, `the Pro Track project ${p.id}`);
    await shot(page, `pro-${p.id}`);
    // The checklist is at the end, after the whole README: a link by the download button jumps there.
    const jump = page.locator('.page-head a[href="#checklist"]');
    expect((await jump.innerText()).trim() === `Your checklist (0 of ${p.checklist.length} ticked)`, await jump.innerText());
    await jump.click();
    await page.waitForFunction(() => {
      const r = document.getElementById('checklist').getBoundingClientRect();
      return r.top >= 0 && r.top < innerHeight / 2;
    });
    await page.evaluate(() => scrollTo(0, 0));
    // The download: the zip the build made, the same bytes as a zip made now from the source folder.
    const [download] = await Promise.all([page.waitForEvent('download'), page.locator('a', { hasText: 'Download the project (zip' }).click()]);
    expect(download.suggestedFilename() === `${p.id}.zip`, download.suggestedFilename());
    const bytes = readFileSync(await download.path());
    const fresh = zipProject(ROOT_DIR, p.id);
    expect(Buffer.compare(bytes, Buffer.from(fresh)) === 0, `the downloaded zip (${bytes.length} bytes) differs from a fresh zip of pro-track/${p.id}/ (${fresh.length} bytes)`);
    const names = readZip(bytes).map((e) => e.name);
    for (const need of ['pom.xml', 'README.md', '.gitignore', '.github/workflows/test.yml']) expect(names.includes(`${p.id}/${need}`), `the zip has ${need}: ${names.join(', ')}`);
    expect(names.every((n) => n.startsWith(`${p.id}/`) && !n.includes('/target/')), names.join(', '));
    // The checklist: ticked items are saved with the time, kept after a reload, and counted.
    const items = page.locator('.pro-items input[type="checkbox"]');
    expect((await items.count()) === p.checklist.length, 'one box per checklist item');
    await page.locator('.pro-items label').first().click();
    await page.locator('.pro-items label').nth(1).click();
    await page.locator('.pro-items label').nth(1).click();
    await page.waitForFunction(([k, id, item]) => JSON.parse(localStorage.getItem(k))?.pro?.[id]?.items?.[item]?.done === true, [KEY, p.id, p.checklist[0].id]);
    await page.reload();
    await page.locator('#main h1', { hasText: p.title }).waitFor();
    expect(await items.nth(0).isChecked(), 'the first item is still ticked after a reload');
    expect(!(await items.nth(1).isChecked()), 'the second item, ticked and unticked, is not');
    expect((await page.locator('.pro-checklist').innerText()).includes(`1 of ${p.checklist.length} marked as done`), await page.locator('.pro-checklist').innerText());
    const st = await saved(page);
    expect(typeof st.pro[p.id].items[p.checklist[0].id].at === 'number' && st.pro[p.id].items[p.checklist[1].id].done === false, JSON.stringify(st.pro));
    // The record page shows it as the learner's own marks, never as checked.
    await page.goto(BASE + 'record/');
    const rec = page.locator('.record-pro li', { hasText: p.title });
    await rec.waitFor();
    expect((await rec.innerText()).includes(`1 of ${p.checklist.length} items marked as done by you`), await rec.innerText());
    const sheet = await page.locator('.record-sheet').innerText();
    expect(sheet.includes("Java Arena can't see them or run their tests"), 'the record says the site cannot check them');
    await page.goto(BASE + `pro/`);
    expect((await page.locator('.project-card', { hasText: p.title }).innerText()).includes(`1 of ${p.checklist.length} checklist items marked as done by you`), 'the list counts the ticks');
    // The checklist travels in a transfer link (progress only) and merges into another browser.
    const link = await makeLink(page, false);
    expect(errors.length === 0, errors.join('\n'));
    await ctx.close();
    const b = await phoneWith(progress());
    await b.page.goto(link);
    await b.page.locator('.import-review').waitFor();
    expect((await b.page.locator('.import-review').innerText()).includes('1 Pro Track checklist item marked as done'), await b.page.locator('.import-review').innerText());
    await b.page.click('button:has-text("Merge into my progress")');
    await b.page.locator('.transfer-done').waitFor();
    expect((await saved(b.page)).pro[p.id]?.items[p.checklist[0].id]?.done === true, 'the tick arrives');
    await b.page.goto(BASE + `pro/${p.id}/`);
    await b.page.locator('#main h1', { hasText: p.title }).waitFor();
    expect(await b.page.locator('.pro-items input[type="checkbox"]').first().isChecked(), 'and shows on the project page');
    await b.ctx.close();
  });

console.log('Engine prototype');
const { ctx: mainCtx, page, errors } = await newPage();
await test('engine downloads and starts', async () => {
  await page.goto(BASE + 'bench/');
  await waitReady(page);
});
await test('Hello World runs', async () => {
  const out = await runExample(page, 'Hello World');
  expect(out.includes('Hello World!'), out);
  expect(out.includes('Exit code 0'), out);
  await shot(page, 'bench-desktop-hello');
});
await test('a program reads input with Scanner', async () => {
  const out = await runExample(page, 'Reads input', '3\nGrace\n');
  expect(out.includes('Grace drinks 3 cups, that is 7.5 dl.'), out);
});
await test('a compile error is shown with a plain-English note', async () => {
  const out = await runExample(page, 'A compile error');
  expect(out.includes("It didn't compile"), out);
  expect(out.includes("error: ';' expected"), out);
  expect(out.includes('semicolon'), out);
  await axe(page, 'compile error result');
});
await test('a crash is explained with its line', async () => {
  const out = await runExample(page, 'A crash');
  expect(out.includes('crashed on line 3'), out);
  expect(out.includes('ArrayIndexOutOfBoundsException'), out);
  expect(out.includes('Index 3 out of bounds for length 3'), out);
  await axe(page, 'crash result');
  await shot(page, 'bench-desktop-crash');
});
await test('an endless loop is stopped, and the next run works', async () => {
  const out = await runExample(page, 'A loop that never ends');
  expect(out.includes('Stopped after 10 seconds'), out);
  const again = await runExample(page, 'Hello World');
  expect(again.includes('Hello World!'), again);
});
async function runCode(page, source, stdin = '') {
  await page.fill('#code', source);
  await page.fill('#stdin', stdin);
  await page.click('#run');
  await page.locator('#run:not([aria-busy])').waitFor({ timeout: 120_000 });
  await page.waitForFunction(() => document.querySelector('#result')?.textContent !== '', null, { timeout: 120_000 });
  return page.locator('#result').innerText();
}
await test('a crash inside another class points at that class\'s line', async () => {
  const out = await runCode(page, 'public class Main {\n    public static void main(String[] args) {\n        Counter c = new Counter();\n        System.out.println(c.get());\n    }\n}\n\nclass Counter {\n    int[] values = new int[2];\n\n    int get() {\n        return values[5];\n    }\n}\n');
  expect(out.includes('crashed on line 12 (in get)'), out);
});
await test('a timed-out program keeps what it printed', async () => {
  const out = await runCode(page, 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("before the loop");\n        int i = 0;\n        while (i < 3) {\n        }\n    }\n}\n');
  expect(out.includes('Stopped after 10 seconds'), out);
  expect(out.includes('before the loop'), out);
});
await test('a misspelled main is explained as the program not starting', async () => {
  const out = await runCode(page, 'public class Main {\n    public static void mian(String[] args) {\n        System.out.println("hi");\n    }\n}\n');
  expect(out.includes("The program didn't start"), out);
  expect(out.includes('Main method not found in class Main'), out);
});
await test('keyboard: Tab indents in the editor, Escape then Tab leaves it', async () => {
  await page.selectOption('#example', { label: 'Hello World' });
  await page.focus('#code');
  await page.keyboard.press('End');
  await page.keyboard.press('Tab');
  const value = await page.inputValue('#code');
  expect(value.includes('    '), 'Tab inserted spaces');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Tab');
  expect((await page.evaluate(() => document.activeElement?.id)) === 'stdin', 'focus moved on to the input box');
});
await test('the benchmark completes', async () => {
  await page.click('#bench');
  await page.locator('#copy:not([hidden])').waitFor({ timeout: 300_000 });
  const text = await page.locator('#bench-out').innerText();
  expect(text.includes('Endless loop stopped') && text.includes('yes'), text);
  console.log('       ' + text.split('\n').filter((l) => l.includes('\t')).join('\n       '));
});
await test('no errors in the console', async () => {
  expect(errors.length === 0, errors.join('\n'));
});
await mainCtx.close();

await test('mobile data: nothing downloads until the learner agrees', async () => {
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { type: 'cellular', effectiveType: '4g', saveData: false }, configurable: true });
  });
  requests.length = 0;
  await page.goto(BASE + 'bench/');
  await page.getByText("You're on mobile data").waitFor();
  const text = await page.locator('#engine').innerText();
  expect(/about [\d.]+ MB/.test(text), text);
  await page.waitForTimeout(1500);
  const engineRequests = requests.filter((p) => p.includes('/engine/') && !p.endsWith('manifest.json'));
  expect(engineRequests.length === 0, `requested before agreeing: ${engineRequests.join(', ')}`);
  await axe(page, 'mobile data prompt');
  await shot(page, 'bench-phone-mobile-data');
  await page.click('#dl');
  await waitReady(page);
  await ctx.close();
});

await test('a phone whose browser cannot tell the connection type is asked first too', async () => {
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: undefined, configurable: true });
  });
  requests.length = 0;
  await page.goto(BASE + 'bench/');
  await page.getByText("This browser doesn't say whether you're on mobile data").waitFor();
  await page.waitForTimeout(1000);
  const engineRequests = requests.filter((p) => p.includes('/engine/') && !p.endsWith('manifest.json'));
  expect(engineRequests.length === 0, `requested before agreeing: ${engineRequests.join(', ')}`);
  // Run before answering: the page points to the question instead of downloading.
  await page.click('#run');
  const out = await page.locator('#result').innerText();
  expect(out.includes('needs the one-time engine download first'), out);
  expect((await page.evaluate(() => document.activeElement?.id)) === 'dl', 'focus moved to the download button');
  expect(requests.filter((p) => p.includes('/engine/') && !p.endsWith('manifest.json')).length === 0, 'still nothing downloaded');
  await axe(page, 'unknown connection prompt');
  await ctx.close();
});

await test('a browser without the WebAssembly features gets a clear message and no download', async () => {
  const { ctx, page } = await newPage();
  await ctx.addInitScript(() => {
    WebAssembly.validate = () => false;
  });
  requests.length = 0;
  await page.goto(BASE + 'bench/');
  await page.getByText("This browser can't run the Java engine").first().waitFor();
  await page.click('#run');
  expect((await page.locator('#result').innerText()).includes("can't run the Java engine"), 'Run explains it too');
  await page.waitForTimeout(500);
  expect(requests.filter((p) => p.includes('/engine/')).length === 0, 'no engine requests');
  await axe(page, 'unsupported browser');
  await ctx.close();
});

await test('after a failed download, Try again starts the engine', async () => {
  const { ctx, page } = await newPage();
  let block = true;
  await page.route('**/engine/javac.wasm*', (route) => (block ? route.abort() : route.continue()));
  await page.goto(BASE + 'bench/');
  await page.getByText("The engine couldn't start").waitFor({ timeout: ENGINE_TIMEOUT });
  block = false;
  await page.click('#retry');
  await waitReady(page);
  const out = await runExample(page, 'Hello World');
  expect(out.includes('Hello World!'), out);
  await ctx.close();
});

await test('offline: after one visit, pages and the engine work without a connection', async () => {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + 'bench/');
  await waitReady(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await waitReady(page);
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller), 'service worker controls the page');
  await ctx.setOffline(true);
  const failed = [];
  page.on('requestfailed', (r) => failed.push(r.url()));
  await page.reload();
  await waitReady(page);
  const out = await runExample(page, 'Reads input', '2\nAlan\n');
  expect(out.includes('Alan drinks 2 cups'), out);
  expect(failed.length === 0, `failed requests: ${failed.join(', ')}`);
  await page.goto(BASE);
  await page.locator('.hero h1').waitFor();
  // A lesson visited once works offline too: it compiles, runs and checks.
  await ctx.setOffline(false);
  await page.goto(BASE + 'learn/printing/print-and-println/');
  await lessonReady(page);
  await ctx.setOffline(true);
  await page.reload();
  await lessonReady(page);
  const blanks = page.locator('input.blank');
  await blanks.nth(0).fill('print');
  await blanks.nth(1).fill('println');
  const result = await check(page);
  expect(result.includes('All tests passed'), result);
  await ctx.close();
});

console.log('Accessibility and layout');
const PAGES = ['', 'learn/', 'learn/printing/', 'learn/printing/first-program/', 'learn/reading-input/joining-strings/', 'learn/calculating/tracing-values/', 'playground/', 'deathmatch/', 'daily/', 'placement/', 'settings/', 'about/', 'transfer/', 'projects/', 'pro/', 'learn/nowhere/'];
for (const colorScheme of ['light', 'dark']) {
  await test(`axe, ${colorScheme} theme: every page type`, async () => {
    const { ctx, page } = await newPage({ colorScheme });
    // Practice pages load their drills after the page appears: wait for them.
    const READY = { 'deathmatch/': '.lobby .rank-card', 'daily/': '.rep, .death', 'placement/': 'text=Start the quiz' };
    for (const p of PAGES) {
      await page.goto(BASE + p);
      await page.locator(READY[p] ?? '#main h1').first().waitFor();
      await axe(page, `${p || 'home'} ${colorScheme}`);
    }
    await page.goto(BASE + 'bench/');
    await waitReady(page);
    await axe(page, `prototype ${colorScheme}`);
    await runExample(page, 'Reads input');
    await axe(page, `prototype with output ${colorScheme}`);
    await shot(page, `bench-desktop-${colorScheme}`);
    await ctx.close();
  });
}
await test('phone: a lesson asks before downloading, the symbol bar types into the editor', async () => {
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, 'connection', { value: { type: 'cellular', effectiveType: '4g', saveData: false }, configurable: true });
  });
  requests.length = 0;
  await page.goto(BASE + 'learn/printing/several-lines/');
  await page.getByText('Download the Java engine?').waitFor();
  await page.waitForTimeout(1000);
  const engineRequests = requests.filter((p) => p.includes('/engine/') && !p.endsWith('manifest.json'));
  expect(engineRequests.length === 0, `requested before agreeing: ${engineRequests.join(', ')}`);
  await axe(page, 'lesson download question');
  await shot(page, 'lesson-phone-download-question');
  await page.click('text=Download now');
  await lessonReady(page);
  // Tap sout at the end of line 3: it types System.out.println(); with the cursor inside the parentheses.
  await page.locator('.cm-line').nth(2).click();
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await page.locator('.symkey', { hasText: 'sout' }).tap();
  await page.locator('.symkey', { hasText: '" "' }).tap();
  await page.keyboard.insertText('braces keep the blocks in line,');
  const code = await editorText(page);
  expect(code.includes('System.out.println("braces keep the blocks in line,");'), code);
  await ctx.close();
});
await test('phone width 320 px: no page in the sitemap scrolls sideways', async () => {
  const { ctx, page } = await newPage({ viewport: { width: 320, height: 700 }, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  const xml = await (await fetch(BASE + 'sitemap.xml')).text();
  // The sitemap lists the live site's addresses; its first entry is the home page.
  const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
  const paths = locs.map((l) => l.slice(locs[0].length));
  expect(paths.length > 50, `only ${paths.length} pages in the sitemap`);
  const wide = [];
  for (const p of paths) {
    await page.goto(BASE + p);
    await page.locator('#main h1').first().waitFor();
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    if (w[0] > w[1]) wide.push(`${p || 'home'} (${w[0]} px)`);
  }
  expect(wide.length === 0, `wider than 320 px: ${wide.join(', ')}`);
  await ctx.close();
});
console.log('Topics A to Z');
/** The topics reference as the content build wrote it (content/topics.yaml, checked against the lessons). */
const TOPICS = JSON.parse(readFileSync(new URL('../src/generated/topics.json', import.meta.url), 'utf8'));

await test('Topics A to Z: pre-rendered with every entry, in the sitemap and saved for offline use; Learn, Deathmatch and the footer link to it', async () => {
  const html = await (await fetch(BASE + 'topics/')).text();
  expect(TOPICS.length >= 150 && TOPICS.length <= 250, `${TOPICS.length} topics`);
  expect((html.match(/<li id="[^"]+" class="topic">/g) ?? []).length === TOPICS.length, 'every topic is in the pre-rendered page');
  for (const t of TOPICS) expect(html.includes(`<li id="${t.id}" class="topic">`), `the pre-rendered page has #${t.id}`);
  expect(html.includes('docs.oracle.com/en/java/javase/21/docs/api/'), 'the page points to the Java 21 API documentation');
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  const sw = await (await fetch(BASE + 'sw.js')).text();
  expect(sitemap.includes('/topics/</loc>') && sw.includes('"topics/"'), 'topics/ is in the sitemap and saved for offline use');
  const { ctx, page, errors } = await phoneWith(progress());
  for (const [path, where] of [['learn/', '#main'], ['deathmatch/', '#main'], ['about/', 'footer']]) {
    await page.goto(BASE + path);
    await page.locator('#main h1').first().waitFor();
    expect((await page.locator(`${where} a[href$="/topics/"]`).count()) === 1, `${path}: one link to the topics in ${where}`);
  }
  expect(errors.length === 0, errors.join('; '));
  await ctx.close();
});

await test('Topics A to Z: the search filters as you type and says how many match, a link opens the step that teaches it, an address with #term opens at that entry; axe in both themes at 320 and 390 px', async () => {
  const { ctx, page, errors } = await phoneWith(progress());
  await page.goto(BASE + 'topics/');
  await page.locator('#main h1', { hasText: 'Topics A to Z' }).waitFor();
  const box = page.getByLabel('Search the topics');
  const status = page.locator('#topics-count[role="status"]');
  expect((await status.innerText()) === `${TOPICS.length} topics`, await status.innerText());
  await phonesBothThemes(page, 'the topics page');
  await shot(page, 'topics');
  // Typing filters at once; the count under the box is a polite live region.
  await box.pressSequentially('hashm');
  await page.waitForFunction(() => document.querySelectorAll('#main .topic').length < 10);
  const first = await page.locator('#main .topic').first().getAttribute('id');
  expect(first === 'hashmap', `the first result for "hashm" is #${first}`);
  expect(/^\d+ of \d+ topics match "hashm"\.$/.test(await status.innerText()), await status.innerText());
  await box.fill('zzzz');
  await page.locator('#topics-count', { hasText: 'No topics match "zzzz".' }).waitFor();
  expect((await page.locator('#main .topic').count()) === 0, 'nothing matches zzzz');
  await box.fill('');
  await page.locator('.topics-letters').waitFor();
  expect((await page.locator('#main .topic').count()) === TOPICS.length, 'clearing the box shows every topic again');
  // Several words: every one must start a word of the entry.
  await box.fill('base case');
  await page.waitForFunction(() => document.querySelector('#main .topic')?.id === 'base-case');
  await phonesBothThemes(page, 'the topics page with a search');
  // The entry's first link opens the step that teaches it.
  const recursion = TOPICS.find((t) => t.id === 'recursion');
  await box.fill('recursion');
  await page.waitForFunction(() => document.querySelector('#main .topic')?.id === 'recursion');
  await page.locator('#recursion .topic-links a').first().click();
  await page.waitForURL(`**/learn/${recursion.steps[0].module}/${recursion.steps[0].slug}/`);
  await page.locator('#main h1', { hasText: recursion.steps[0].title }).waitFor();
  // Back brings the same search and the same filtered list: the search is kept in the address (?q=).
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#main .topic')?.id === 'recursion');
  expect((await box.inputValue()) === 'recursion', `after Back the box says ${JSON.stringify(await box.inputValue())}`);
  expect(new URL(page.url()).searchParams.get('q') === 'recursion', page.url());
  expect((await page.locator('#main .topic').count()) < 10, 'the list is still filtered');
  expect(/of \d+ topics match "recursion"/.test(await status.innerText()), await status.innerText());
  // An entry's drills link marks that topic in Deathmatch, without changing the learner's chosen topics.
  const drilled = TOPICS.find((t) => t.id === 'recursion' && t.drills) ?? TOPICS.find((t) => t.drills);
  await box.fill(drilled.term);
  await page.locator(`#${drilled.id} .topic-links a`, { hasText: 'Drills in Deathmatch' }).waitFor();
  const offBefore = (await saved(page))?.settings?.topicsOff ?? [];
  await page.locator(`#${drilled.id} .topic-links a`, { hasText: 'Drills in Deathmatch' }).click();
  await page.waitForURL(`**/deathmatch/?topic=${drilled.drills.topic}`);
  await page.locator(`#dm-topic-${drilled.drills.topic}.chip-target`).waitFor();
  expect((await page.locator('.dm-topic-note').innerText()).includes(drilled.drills.title), await page.locator('.dm-topic-note').innerText());
  expect(JSON.stringify((await saved(page))?.settings?.topicsOff ?? []) === JSON.stringify(offBefore), 'following the link leaves the chosen topics as they were');
  await phonesBothThemes(page, 'Deathmatch with a topic marked');
  // Keyboard: the box is reached with Tab from the page's start, after the header and the breadcrumb.
  await page.goto(BASE + 'topics/');
  await page.locator('#main h1', { hasText: 'Topics A to Z' }).waitFor();
  let reached = false;
  for (let i = 0; i < 25 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await page.evaluate(() => document.activeElement?.id === 'topics-q');
  }
  expect(reached, 'Tab reaches the search box');
  await page.keyboard.type('switch');
  await page.waitForFunction(() => document.querySelector('#main .topic')?.id === 'switch');
  // An address with an entry's id opens at that entry.
  await page.goto(BASE + 'topics/#scanner');
  await page.locator('#scanner').waitFor();
  await page.waitForFunction(() => {
    const r = document.getElementById('scanner').getBoundingClientRect();
    return r.top >= 0 && r.top < innerHeight / 2;
  });
  expect(errors.length === 0, errors.join('; '));
  await ctx.close();
});

await test('Topics A to Z: what is typed in the search box before the app starts stays, with the focus and the caret, and filters the list', async () => {
  const { ctx, page, errors } = await newPage();
  const started = () => page.evaluate(() => Object.keys(document.getElementById('root') ?? {}).some((k) => k.startsWith('__reactContainer')));
  // The app's scripts come only when the test lets them.
  let release;
  const held = new Promise((r) => (release = r));
  await page.route('**/assets/*.js', async (route) => {
    await held;
    await route.continue();
  });
  await page.goto(BASE + 'topics/', { waitUntil: 'commit' });
  const box = page.locator('#topics-q');
  await box.waitFor();
  await box.click();
  await page.keyboard.type('hashm');
  await page.keyboard.press('ArrowLeft');
  expect(!(await started()), 'the app had not started yet');
  release();
  await page.waitForFunction(() => Object.keys(document.getElementById('root')).some((k) => k.startsWith('__reactContainer')) && document.querySelectorAll('#main li.topic').length < 10);
  const now = await page.evaluate(() => ({ value: document.getElementById('topics-q').value, focused: document.activeElement?.id, caret: document.activeElement?.selectionStart }));
  expect(now.value === 'hashm', `the box still says ${JSON.stringify(now.value)}`);
  expect(now.focused === 'topics-q', `the focus is on #${now.focused}`);
  expect(now.caret === 4, `the caret is at ${now.caret}`);
  expect((await page.locator('#main li.topic').count()) < TOPICS.length, 'the list is filtered');
  expect((await page.locator('#main li.topic').first().getAttribute('id')) === 'hashmap', 'HashMap first');
  // Typing goes on in the app's box.
  await page.keyboard.press('End');
  await page.keyboard.type('ap');
  await page.locator('#topics-count', { hasText: '"hashmap"' }).waitFor();
  expect(errors.length === 0, errors.join('; '));
  await ctx.close();
});

for (const width of [360, 390]) {
  await test(`phone width ${width} px: no sideways scrolling, axe passes`, async () => {
    const { ctx, page } = await newPage({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, colorScheme: width === 360 ? 'dark' : 'light' });
    await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
    for (const p of ['', 'learn/', 'learn/printing/', 'learn/methods/parameters/', 'learn/return-values/drawing-shapes/', 'playground/', 'about/']) {
      await page.goto(BASE + p);
      await page.locator('#main h1').first().waitFor();
      await noOverflow(page, `${p || 'home'} ${width}`);
      await axe(page, `${p || 'home'} ${width}`);
      await shot(page, `phone-${width}-${p.replace(/\//g, '_') || 'home'}`);
    }
    // The course list gives module titles the room they need (no empty column beside them).
    await page.goto(BASE + 'learn/');
    await page.locator('.module-live').first().waitFor();
    const titleWidth = await page.locator('.module-live .module-title').nth(2).evaluate((e) => e.getBoundingClientRect().width);
    expect(titleWidth > width * 0.45, `module title only ${Math.round(titleWidth)} px wide`);
    await page.goto(BASE + 'learn/reading-input/reading-a-line/');
    await lessonReady(page);
    await page.fill('input.blank >> nth=0', 'Scanner');
    await check(page);
    await noOverflow(page, `lesson ${width}`);
    await axe(page, `lesson ${width}`);
    await shot(page, `lesson-phone-${width}`);
    await page.click('button[aria-label="Open menu"]');
    await axe(page, `menu open ${width}`);
    await page.goto(BASE + 'bench/');
    await waitReady(page);
    await runExample(page, 'A crash');
    await noOverflow(page, `prototype ${width}`);
    await axe(page, `prototype ${width}`);
    await shot(page, `bench-phone-${width}`);
    await ctx.close();
  });
}

console.log('The accessibility and phone pass');
// Every page type at 320, 360, 390 and 412 px in both themes: axe (WCAG 2.2 AA, which includes its
// target-size rule), no sideways scrolling, every tap target at least 24 x 24 CSS px or spaced as
// WCAG 2.2's 2.5.8 allows, and a visible focus on everything the Tab key reaches.
const PASS_WIDTHS = [320, 360, 390, 412];

/**
 * Tap targets smaller than 24 x 24 CSS px. A link inside a sentence is excused (WCAG 2.2, 2.5.8), and
 * so is any other inline link whose 24 px circle on its center touches no other target (the spacing
 * exception); every other control must be 24 x 24 px itself, or with a ::after that widens where it
 * takes taps (the step dots). Hidden targets, and the drawn JavaFX windows' controls (a picture of a
 * desktop window, sized as real JavaFX sizes them, with a text version beside it) are left out.
 */
async function smallTargets(page) {
  return page.evaluate(() => {
    const SEL = 'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=slider], [role=switch], [role=menuitem], [role=option]';
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 || r.height <= 1) return false;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return false;
      if (el.closest('details:not([open])') && !el.closest('summary')) return false;
      return true;
    };
    const inSentence = (el) => {
      if (getComputedStyle(el).display !== 'inline') return false;
      const block = el.closest('p, li, dd, td, th, figcaption, blockquote, small, label');
      if (!block) return false;
      return (block.textContent ?? '').replace(el.textContent ?? '', '').replace(/[\s·|,]/g, '').length > 0;
    };
    /** The box that takes taps: the element's, or its ::after's when that is absolutely placed around it. */
    const tapBox = (el) => {
      const r = el.getBoundingClientRect();
      const a = getComputedStyle(el, '::after');
      if (a.content === 'none' || a.position !== 'absolute') return r;
      const px = (v) => (v.endsWith('px') ? parseFloat(v) : 0);
      const left = r.left + Math.min(0, px(a.left));
      const top = r.top + Math.min(0, px(a.top));
      const right = r.right - Math.min(0, px(a.right));
      const bottom = r.bottom - Math.min(0, px(a.bottom));
      return { left, top, right, bottom, width: right - left, height: bottom - top };
    };
    const all = [...document.querySelectorAll(SEL)].filter((el) => visible(el) && !el.closest('.fx-window, .cm-editor, [inert], [aria-hidden=true]'));
    const rects = all.map(tapBox);
    const describe = (el, r) => `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`;
    const out = [];
    all.forEach((el, i) => {
      const r = rects[i];
      if (r.width >= 23.5 && r.height >= 23.5) return;
      if (inSentence(el)) return;
      // A checkbox or radio button whose label is 24 px or more: the label takes the taps too.
      const label = el.closest('label') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null);
      if (label && el.matches('input[type=checkbox], input[type=radio]')) {
        const lr = label.getBoundingClientRect();
        if (lr.width >= 24 && lr.height >= 24) return;
      }
      if (getComputedStyle(el).display !== 'inline') return out.push(describe(el, r));
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const clash = all.some((other, j) => {
        if (j === i || other.contains(el) || el.contains(other)) return false;
        const o = rects[j];
        if (o.width < 23.5 || o.height < 23.5) return Math.hypot(cx - (o.left + o.width / 2), cy - (o.top + o.height / 2)) < 24;
        return Math.hypot(Math.max(o.left - cx, 0, cx - o.right), Math.max(o.top - cy, 0, cy - o.bottom)) < 12;
      });
      if (clash) out.push(describe(el, r));
    });
    return out;
  });
}

/** Tabs through the first `max` stops of the page: each must show a focus indicator (an outline, or a box shadow or border it didn't have). */
async function focusShows(page, label, max = 30) {
  await page.evaluate(() => {
    document.activeElement?.blur?.();
    window.scrollTo(0, 0);
  });
  // Start from the top of the page: a click on its body would land on whatever is there.
  await page.keyboard.press('Tab');
  const bad = [];
  const seen = new Set();
  for (let i = 0; i < max; i++) {
    const r = await page.evaluate(async () => {
      // (CodeMirror moves its cm-focused class a moment after the focus event: wait for it.)
      const tick = () => new Promise((done) => setTimeout(done, 60));
      await tick();
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const key = el.tagName + '|' + (el.id || '') + '|' + (el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 40) + '|' + Math.round(el.getBoundingClientRect().top + scrollY);
      const look = (e) => {
        const cs = getComputedStyle(e);
        return { outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 ? `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}` : '', shadow: cs.boxShadow, border: cs.borderColor + cs.borderWidth, bg: cs.backgroundColor };
      };
      // The focus may be shown on a wrapper (a CodeMirror editor, a tab list): look up to two levels.
      const looks = [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean).map(look);
      const name = `${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}${typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).join('.') : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}"`;
      // What it looks like without the focus: blur, measure, focus again (focus-visible stays on after keyboard use).
      const before = looks;
      el.blur();
      await tick();
      const after = [el, el.parentElement, el.parentElement?.parentElement].filter(Boolean).map(look);
      el.focus({ preventScroll: true });
      await tick();
      const shown = before.some((b, k) => b.outline || b.shadow !== after[k].shadow || b.border !== after[k].border);
      return { key, name, shown };
    });
    if (!r) break;
    if (seen.has(r.key)) break;
    seen.add(r.key);
    if (!r.shown) bad.push(r.name);
    await page.keyboard.press('Tab');
  }
  expect(bad.length === 0, `${label}: no visible focus on ${bad.join(', ')}`);
  return seen.size;
}

/** The whole pass on the page as it is now: every width, both themes. */
async function phonePass(page, label, { focus = true } = {}) {
  const problems = [];
  for (const width of PASS_WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      await page.waitForFunction((t) => document.documentElement.dataset.theme === t, colorScheme);
      const where = `${label} at ${width} px, ${colorScheme}`;
      for (const check of [() => noOverflow(page, where), () => axe(page, where)]) {
        try {
          await check();
        } catch (e) {
          problems.push(e.message);
        }
      }
      const small = await smallTargets(page);
      if (small.length) problems.push(`${where}: tap targets under 24 x 24 px: ${small.join('; ')}`);
    }
  }
  if (focus) {
    try {
      await focusShows(page, label);
    } catch (e) {
      problems.push(e.message);
    }
  }
  expect(problems.length === 0, problems.join('\n'));
}

/** Opens a page in a phone browser with this saved progress and waits for what only the app draws. */
async function passPage(st, path, ready, extra = {}) {
  const r = await phoneWith(st, extra);
  await r.ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
  await r.page.goto(BASE + path);
  await ready(r.page);
  return r;
}
const appDrew = (sel) => (page) => page.locator(sel).first().waitFor({ timeout: ENGINE_TIMEOUT });
const passSteps = (() => {
  const part1 = COURSE_INDEX.plan.filter((m) => m.course === 'I' && m.part === 1).map((m) => m.id);
  return finished(part1);
})();
const passProject = COURSE_INDEX.projects?.[0];
const passState = () => progress({ steps: passSteps, projects: passProject ? { [passProject.id]: { done: true, doneAt: T, milestones: {} } } : {} });
const PASS_PAGES = [
  ['home', '', appDrew('#main h1')],
  ['Learn', 'learn/', appDrew('.module-live')],
  ['a module', 'learn/printing/', appDrew('#main h1')],
  ['an extra module', 'learn/recursion/', appDrew('#main h1')],
  ['a lesson: a code challenge', 'learn/printing/first-program/', lessonReady],
  ['a lesson: a fill-in challenge', 'learn/printing/print-and-println/', lessonReady],
  ['a lesson: "What does it print?"', 'learn/calculating/tracing-values/', appDrew('.predict-lines')],
  ['a lesson: classes in their own files', 'learn/classes/constructors/', lessonReady],
  ['a lesson: JUnit', 'learn/unit-testing/junit/', lessonReady],
  ['a lesson: a window challenge', 'learn/gui-basics/first-window/', lessonReady],
  ['a lesson: a game', 'learn/asteroids/keys-and-loop/', lessonReady],
  ['Deathmatch', 'deathmatch/', appDrew('.lobby .rank-card')],
  ['the daily challenge', 'daily/', appDrew('.rep, .death')],
  ['placement', 'placement/', appDrew('text=Start the quiz')],
  ['the Playground', 'playground/', lessonReady],
  ['projects', 'projects/', appDrew('#main h1')],
  ['transfer', 'transfer/', appDrew('#main h1')],
  ['record', 'record/', appDrew('.record-sheet')],
  ['Settings', 'settings/', appDrew('#main h1')],
  ['About', 'about/', appDrew('#main h1')],
  ['topics', 'topics/', appDrew('#topics-q')],
  ['the Pro Track', 'pro/', appDrew('#main h1')],
  ['page not found', 'learn/nowhere/', appDrew('#main h1')],
];
if (PRO[0]) PASS_PAGES.push([`a Pro Track project`, `pro/${PRO[0].id}/`, appDrew('#main h1')]);
if (passProject) PASS_PAGES.push(['a project', `projects/${passProject.id}/`, appDrew('.milestones')]);

for (const [name, path, ready] of PASS_PAGES) {
  await test(`the phone pass: ${name} (${path || 'home'}) at 320, 360, 390 and 412 px in both themes: axe, no sideways scrolling, tap targets of 24 px, a visible focus`, async () => {
    const { ctx, page, errors } = await passPage(passState(), path, ready);
    await phonePass(page, name);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/pass-${(path || 'home').replace(/\//g, '_')}.png`, fullPage: true });
    expect(errors.filter((e) => !e.includes('404')).length === 0, errors.join('; '));
    await ctx.close();
  });
}

await test('the phone pass: a project milestone, the Playground with a window, a Deathmatch rep of each type and the review, a placement question, the topics with a search, the record with nothing finished', async () => {
  const problems = [];
  const pass = async (page, label, opts) => {
    try {
      await phonePass(page, label, opts);
    } catch (e) {
      problems.push(e.message);
    }
  };
  // A project's milestone, open.
  if (passProject) {
    const { ctx, page } = await passPage(progress(), `projects/${passProject.id}/`, appDrew('.milestones'));
    await openMilestone(page, 0);
    await lessonReady(page);
    await pass(page, 'a project milestone');
    await ctx.close();
  }
  // The Playground with a window drawn.
  {
    const { ctx, page } = await passPage(progress(), 'playground/', lessonReady);
    await setCode(page, FX_COUNTER);
    await check(page);
    await page.getByRole('group', { name: 'Window: Counter' }).waitFor();
    await pass(page, 'the Playground with a window');
    await ctx.close();
  }
  // Deathmatch: a rep of each type (Casual, every topic open), then the review after a miss.
  {
    const { ctx, page } = await passPage(practiceState({ settings: { unlockAll: true, boss: true, mobileData: true } }), 'deathmatch/', appDrew('.lobby .modes'));
    await seedRandom(ctx);
    await page.reload();
    await page.locator('.lobby .modes').waitFor();
    await pass(page, 'the Deathmatch lobby', { focus: false });
    await page.locator('.mode:has(.mode-name:text-is("Casual"))').click();
    const types = new Set();
    for (let i = 0; i < 40 && types.size < 6; i++) {
      await page.locator('.rep').waitFor();
      const id = await page.locator('.rep').getAttribute('data-drill');
      const type = drillById.get(id)?.type;
      if (type && !types.has(type)) {
        types.add(type);
        if (type === 'boss') await lessonReady(page);
        await pass(page, `a Deathmatch rep (${type})`, { focus: type !== 'boss' });
        await page.setViewportSize(PHONE.viewport);
      }
      await answerRep(page, true);
      await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), i + 1, { timeout: 120_000 });
    }
    await page.locator('.rep').waitFor();
    await answerRep(page, false);
    await page.locator('.death').waitFor();
    await pass(page, 'a Deathmatch review');
    if (types.size < 5) problems.push(`only these rep types came up: ${[...types]}`);
    await ctx.close();
  }
  // A placement question.
  {
    const { ctx, page } = await passPage(progress(), 'placement/', appDrew('text=Start the quiz'));
    await page.click('text=Start the quiz');
    await page.locator('.rep').waitFor();
    await pass(page, 'a placement question');
    await ctx.close();
  }
  // The topics reference with a search typed.
  {
    const { ctx, page } = await passPage(progress(), 'topics/', appDrew('#topics-q'));
    await page.getByLabel('Search the topics').fill('array');
    await page.waitForFunction(() => document.querySelectorAll('#main .topic').length < 30);
    await pass(page, 'the topics with a search');
    await ctx.close();
  }
  // The record page with nothing finished.
  {
    const { ctx, page } = await passPage(progress(), 'record/', appDrew('#main h1'));
    await pass(page, 'the record with nothing finished', { focus: false });
    await ctx.close();
  }
  expect(problems.length === 0, problems.join('\n'));
});

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nAll passed');
process.exit(failures ? 1 : 0);
