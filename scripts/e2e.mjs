// End-to-end tests in headless Chromium against the built site (dist/), served under BASE_PATH
// like GitHub Pages: pre-rendered pages, lessons (fill-ins, code challenges, hidden tests, rules,
// hints, solutions, progress), the engine prototype page, errors and crashes explained, endless
// loops stopped, the mobile-data question holding the download, offline use, and axe (WCAG 2.2 AA)
// on every page type in both themes and at phone widths.
//
// Usage: npm run build && node scripts/e2e.mjs [--shots dir]
// E2E_ONLY=<regular expression> runs only the tests whose names match (while working on something).
import { mkdirSync, readFileSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { launchChromium } from './browser.mjs';
import { serve } from './serve.mjs';
import { indentProblems } from '../src/grader/style.js';
import { folderOf, joinFiles, splitFiles } from '../src/grader/files.js';

const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const requests = [];
const { server, url: BASE } = await serve({ onRequest: (p) => requests.push(p) });
const browser = await launchChromium();
const ENGINE_TIMEOUT = 180_000;

let failures = 0;
const ONLY = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY, 'i') : null;
async function test(name, fn) {
  if (ONLY && !ONLY.test(name)) return;
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
const editorText = (page) => page.evaluate(() => [...document.querySelectorAll('.cm-content .cm-line')].map((l) => l.textContent).join('\n'));
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
  expect(/\d+ of 59 modules are online/.test(status), status);
  await page.click('text=See all modules');
  await page.locator('h1', { hasText: 'The course' }).waitFor();
  expect((await page.evaluate(() => document.activeElement?.tagName)) === 'H1', 'focus moved to the new page heading');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('an unknown address shows "Page not found"', async () => {
  const { ctx, page } = await newPage();
  await page.goto(BASE + 'learn/printing/no-such-step');
  await page.locator('h1', { hasText: 'Page not found' }).waitFor();
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
    types.add((await answerRep(page, true)).type);
    await page.waitForFunction((n) => document.querySelector('.hud-n')?.textContent === String(n), i);
  }
  await page.locator('.rep').waitFor();
  await answerRep(page, false);
  await page.locator('.death').waitFor();
  await noOverflow(page, 'review at 360');
  await axe(page, 'review at 360');
  expect(types.size >= 3, `types: ${[...types]}`);
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
const PAGES = ['', 'learn/', 'learn/printing/', 'learn/printing/first-program/', 'learn/reading-input/joining-strings/', 'learn/calculating/tracing-values/', 'playground/', 'deathmatch/', 'daily/', 'placement/', 'settings/', 'about/', 'learn/nowhere/'];
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

await browser.close();
server.close();
console.log(failures ? `\n${failures} failed` : '\nAll passed');
process.exit(failures ? 1 : 0);
