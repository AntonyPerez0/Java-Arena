// End-to-end tests in headless Chromium against the built site (dist/), served under BASE_PATH
// like GitHub Pages: the engine downloads, programs compile and run, errors and crashes are
// explained, endless loops are stopped, the mobile-data prompt holds the download, the site
// works offline, and every page state passes axe (WCAG 2.2 AA) in both themes and at phone widths.
//
// Usage: npm run build && node scripts/e2e.mjs [--shots dir]
import { mkdirSync } from 'node:fs';
import AxeBuilder from '@axe-core/playwright';
import { launchChromium } from './browser.mjs';
import { serve } from './serve.mjs';

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
  const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(r.violations.length === 0, `${label}: ${r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target}`).join('; ')}`);
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
  await page.locator('#run:not([disabled])').waitFor({ timeout: 120_000 });
  return page.locator('#result').innerText();
}

console.log('Pages');
await test('landing page: content, credits, SEO basics', async () => {
  const { ctx, page, errors } = await newPage();
  await page.goto(BASE);
  expect((await page.title()).includes('Java Arena'), 'title');
  expect(await page.locator('meta[name="description"]').getAttribute('content'), 'meta description');
  expect((await page.locator('html').getAttribute('lang')) === 'en', 'lang');
  const text = await page.locator('main').innerText();
  expect(text.includes('CC BY-NC-SA 4.0') && text.includes('not affiliated'), 'credits and non-affiliation line');
  expect(errors.length === 0, errors.join('\n'));
  await ctx.close();
});
await test('sitemap and robots', async () => {
  const sitemap = await (await fetch(BASE + 'sitemap.xml')).text();
  expect(sitemap.includes('/bench/</loc>'), 'sitemap lists the prototype page');
  const robots = await (await fetch(BASE + 'robots.txt')).text();
  expect(robots.includes('Sitemap:'), 'robots.txt points to the sitemap');
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
  expect((await page.locator('h1').innerText()) === 'Java Arena', 'landing page offline');
  await ctx.close();
});

console.log('Accessibility and layout');
for (const colorScheme of ['light', 'dark']) {
  await test(`axe, ${colorScheme} theme: landing and prototype`, async () => {
    const { ctx, page } = await newPage({ colorScheme });
    await page.goto(BASE);
    await axe(page, `landing ${colorScheme}`);
    await page.goto(BASE + 'bench/');
    await waitReady(page);
    await axe(page, `prototype ${colorScheme}`);
    await runExample(page, 'Reads input');
    await axe(page, `prototype with output ${colorScheme}`);
    await shot(page, `bench-desktop-${colorScheme}`);
    await ctx.close();
  });
}
for (const width of [360, 390]) {
  await test(`phone width ${width} px: no sideways scrolling, axe passes`, async () => {
    const { ctx, page } = await newPage({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true, colorScheme: width === 360 ? 'dark' : 'light' });
    await page.goto(BASE);
    await noOverflow(page, `landing ${width}`);
    await axe(page, `landing ${width}`);
    await shot(page, `landing-phone-${width}`);
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
