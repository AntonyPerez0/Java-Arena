// End-to-end tests in headless Chromium against the built site (dist/), served under BASE_PATH
// like GitHub Pages: pre-rendered pages, lessons (fill-ins, code challenges, hidden tests, rules,
// hints, solutions, progress), the engine prototype page, errors and crashes explained, endless
// loops stopped, the mobile-data question holding the download, offline use, and axe (WCAG 2.2 AA)
// on every page type in both themes and at phone widths.
//
// Usage: npm run build && node scripts/e2e.mjs [--shots dir]
import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { launchChromium } from './browser.mjs';
import { serve } from './serve.mjs';
import { indentProblems } from '../src/grader/style.js';

const shotsIdx = process.argv.indexOf('--shots');
const SHOTS = shotsIdx > 0 ? process.argv[shotsIdx + 1] : null;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const requests = [];
const { server, url: BASE } = await serve({ onRequest: (p) => requests.push(p) });
const browser = await launchChromium();
const ENGINE_TIMEOUT = 180_000;

let failures = 0;
async function test(name, fn) {
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
  const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
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
    const withMethod = (m) => `public class Main {\n    public static void main(String[] args) {\n        countdown(3);\n    }\n\n${m}\n}\n`;
    // A private method compiles (main is inside Main) but the check can't call it: one plain reason.
    await setCode(page, withMethod('    private static void countdown(int start) {\n        System.out.println("Liftoff!");\n    }'));
    let out = await check(page);
    expect(out.includes("The check couldn't call your method") && out.includes('is private') && out.split('is private').length === 2, out);
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

console.log('Playground');
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
const PAGES = ['', 'learn/', 'learn/printing/', 'learn/printing/first-program/', 'learn/reading-input/joining-strings/', 'learn/calculating/tracing-values/', 'playground/', 'settings/', 'about/', 'learn/nowhere/'];
for (const colorScheme of ['light', 'dark']) {
  await test(`axe, ${colorScheme} theme: every page type`, async () => {
    const { ctx, page } = await newPage({ colorScheme });
    for (const p of PAGES) {
      await page.goto(BASE + p);
      await page.locator('#main h1').first().waitFor();
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
for (const width of [360, 390]) {
  await test(`phone width ${width} px: no sideways scrolling, axe passes`, async () => {
    const { ctx, page } = await newPage({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, colorScheme: width === 360 ? 'dark' : 'light' });
    await ctx.addInitScript(() => localStorage.setItem('java-arena-mobile-data', '1'));
    for (const p of ['', 'learn/', 'learn/printing/', 'playground/', 'about/']) {
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
