// Runs javac.wasm in headless Chromium inside a module Worker and checks that it
// gives the same results as in Node: same class bytes, same javac output.
//
//   node engine/compiler/test/browser/run.mjs
//
// Needs the playwright package (the repository's devDependency) and a Chromium;
// set CHROMIUM to its path, otherwise the newest one under /opt/pw-browsers is used.

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ENGINE = path.resolve(HERE, '../../..');
const DIST = path.join(ENGINE, 'dist/compiler');
const TESTS = path.resolve(HERE, '..');

function findChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const root = '/opt/pw-browsers';
  const dirs = fs.existsSync(root) ? fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort() : [];
  for (const d of dirs.reverse()) {
    const p = path.join(root, d, 'chrome-linux/chrome');
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}

const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((req, res) => {
  const p = path.join(ENGINE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(ENGINE) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

function readProgram(dir) {
  const files = [];
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? rel + '/' + e.name : e.name;
      if (e.isDirectory()) walk(r);
      else if (e.name.endsWith('.java')) files.push({ path: r, text: fs.readFileSync(path.join(dir, r), 'utf8') });
    }
  };
  walk('');
  return files.sort((a, b) => (a.path < b.path ? -1 : 1));
}

const { chromium } = await import('playwright');
const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage();
const tNav = Date.now();
await page.goto(`http://127.0.0.1:${port}/compiler/test/browser/index.html`);
const ready = await page.evaluate(() => window.javacReady);
const readyMs = Date.now() - tNav;

// Node reference, same assets.
const { createJavac } = await import(pathToFileURL(path.join(DIST, 'javac-host.mjs')).href);
const nodeJavac = await createJavac({ wasm: path.join(DIST, 'javac.wasm'), sdk: path.join(DIST, 'java-base-sdk.bin') });

// First compile after load, then everything else.
const firstFiles = readProgram(path.join(TESTS, 'programs/hello'));
const first = await page.evaluate((f) => window.runJavac(f), firstFiles);

const cases = [
  ...fs.readdirSync(path.join(TESTS, 'programs')).sort().map((n) => ['programs', n]),
  ...fs.readdirSync(path.join(TESTS, 'errors')).sort().map((n) => ['errors', n]),
];
let same = 0;
const differing = [];
const compileMs = {};
for (const [kind, name] of cases) {
  const files = readProgram(path.join(TESTS, kind, name));
  const b = await page.evaluate((f) => window.runJavac(f), files);
  if (b.error) {
    differing.push(`${kind}/${name}: ${b.error}`);
    continue;
  }
  const br = b.result;
  const nr = nodeJavac.compile(files);
  compileMs[name] = Math.round(br.timeMs * 10) / 10;
  const bClasses = br.classes.map((c) => [c.path, Buffer.from(c.bytes).toString('base64')]);
  const nClasses = nr.classes.map((c) => [c.path, Buffer.from(c.bytes).toString('base64')]);
  const ok = br.output === nr.output && br.success === nr.success
    && JSON.stringify(bClasses) === JSON.stringify(nClasses)
    && JSON.stringify(br.diagnostics) === JSON.stringify(nr.diagnostics);
  if (ok) same++;
  else differing.push(`${kind}/${name}`);
}

const timeWarm = async (name) => {
  const files = readProgram(path.join(TESTS, 'programs', name));
  const t = [];
  for (let i = 0; i < 10; i++) t.push((await page.evaluate((f) => window.runJavac(f), files)).result.timeMs);
  t.sort((a, b) => a - b);
  return { medianMs: Math.round(t[5] * 10) / 10, minMs: Math.round(t[0] * 10) / 10, maxMs: Math.round(t[9] * 10) / 10 };
};

// JS heap (which holds the Wasm GC objects) after a GC, before and after 100
// compiles, each in its own task; measured on a main-thread copy of the compiler.
const memPage = await browser.newPage();
await memPage.goto(`http://127.0.0.1:${port}/compiler/test/browser/main-thread.html`);
await memPage.waitForFunction(() => window.javacReady === true);
const cdp = await memPage.context().newCDPSession(memPage);
const heapMB = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  return Math.round((await cdp.send('Runtime.getHeapUsage')).usedSize / 1e6);
};
const typicalFiles = readProgram(path.join(TESTS, 'programs/typical'));
await memPage.evaluate((f) => window.compileOnce(f), typicalFiles);
const heapBefore = await heapMB();
for (let i = 0; i < 100; i++) await memPage.evaluate((f) => window.compileOnce(f), typicalFiles);
const heapAfter = await heapMB();

const result = {
  browser: `Chromium ${browser.version()}`,
  pageToReadyMs: readyMs,
  workerLoadMs: Math.round(ready.loadMs),
  loadTimings: Object.fromEntries(Object.entries(ready.loadTimings).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  firstCompileHelloMs: Math.round(first.result.timeMs * 10) / 10,
  warmHello: await timeWarm('hello'),
  warmTypical: await timeWarm('typical'),
  heapMBBefore: heapBefore,
  heapMBAfter100Compiles: heapAfter,
  cases: cases.length,
  sameAsNode: same,
  differing,
};
console.log(JSON.stringify(result, null, 2));
await browser.close();
server.close();
process.exit(differing.length || heapAfter - heapBefore >= 20 ? 1 : 0);
