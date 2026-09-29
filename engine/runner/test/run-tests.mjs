// Compare the Wasm runner with HotSpot 21 on the programs in programs/.
//
//   node run-tests.mjs [--dist DIR] [--no-node] [--no-browser] [--only NAME,NAME] [--report FILE] [--timing]
//
// Each program is compiled with javac --release 21 of the reference JDK ($JAVA_HOME_21, default
// the pinned Temurin 21.0.10+7 in /home/user/build/jdk) and runs on its HotSpot with the site's
// reference flags. The runner runs in Node and in headless Chromium (Playwright).
// Compared: stdout byte for byte, stderr first line, stderr user stack frames (frames outside
// java.base/), exit code and the files left in the working directory. Full stderr equality is
// required for cases marked exactStderr and reported as a note for the others. Some cases have
// special checks (see cases.mjs). --timing adds start-up and per-run measurements.

import { spawnSync } from 'node:child_process';
import { Worker } from 'node:worker_threads';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, extname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { cases } from './cases.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const engineRoot = resolve(here, '../..');
const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : fallback;
};
const dist = resolve(option('--dist', join(engineRoot, 'dist/runner')));
const only = option('--only', '')?.split(',').filter(Boolean);
const report = option('--report');
const useNode = !argv.includes('--no-node');
const useBrowser = !argv.includes('--no-browser');
const timing = argv.includes('--timing');
const OUTPUT_LIMIT = 64 * 1024;
const JAVA_HOME = process.env.JAVA_HOME_21 ?? '/home/user/build/jdk/jdk-21.0.10+7';
const REFERENCE_FLAGS = [
  '-Duser.language=en', '-Duser.country=US', '-Duser.timezone=UTC', '-Dfile.encoding=UTF-8',
  '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8', '-XX:+UnlockDiagnosticVMOptions', '-XX:-UseLibmIntrinsic',
];
const javaEnv = { ...process.env };
delete javaEnv.JAVA_TOOL_OPTIONS;
delete javaEnv._JAVA_OPTIONS;
delete javaEnv.JDK_JAVA_OPTIONS;
// A UTF-8 locale, so HotSpot decodes non-ASCII command-line arguments the way the browser runner does.
javaEnv.LC_ALL = 'C.UTF-8';

const selected = cases.filter((c) => !only?.length || only.includes(c.name));
const work = mkdtempSync(join(tmpdir(), 'runner-test-'));
const utf8 = (bytes) => new TextDecoder().decode(bytes);
const asBytes = (value) => (typeof value === 'string' ? new TextEncoder().encode(value) : new Uint8Array(value));

function compile(testCase) {
  const out = join(work, 'classes', testCase.name);
  mkdirSync(out, { recursive: true });
  const source = join(here, 'programs', testCase.source ?? `${testCase.main}.java`);
  const result = spawnSync(join(JAVA_HOME, 'bin/javac'), ['--release', '21', '-encoding', 'UTF-8', '-d', out, source], { env: javaEnv, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`javac failed for ${testCase.name}:\n${result.stderr}`);
  const classes = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.class')) classes.push({ path: relative(out, path), bytes: new Uint8Array(readFileSync(path)) });
    }
  };
  walk(out);
  return { dir: out, classes };
}

function listFiles(root, dir = root, out = {}) {
  for (const name of readdirSync(dir).sort()) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) listFiles(root, path, out);
    else out[relative(root, path)] = new Uint8Array(readFileSync(path));
  }
  return out;
}

function runHotSpot(testCase, classDir) {
  const cwd = join(work, 'hotspot', testCase.name);
  mkdirSync(cwd, { recursive: true });
  for (const [name, value] of Object.entries(testCase.files ?? {})) {
    mkdirSync(dirname(join(cwd, name)), { recursive: true });
    writeFileSync(join(cwd, name), asBytes(value));
  }
  const begin = performance.now();
  const result = spawnSync(join(JAVA_HOME, 'bin/java'), [...REFERENCE_FLAGS, '-cp', classDir, testCase.main, ...(testCase.args ?? [])], {
    cwd, env: javaEnv, input: testCase.stdin ?? '', maxBuffer: 64 * 1024 * 1024, timeout: 60_000,
  });
  return {
    stdout: utf8(result.stdout), stderr: utf8(result.stderr), stdoutBytes: result.stdout, exitCode: result.status,
    files: listFiles(cwd), durationMs: performance.now() - begin,
  };
}

const request = (testCase, compiled) => ({
  mainClass: testCase.main,
  classes: compiled.classes,
  stdin: testCase.stdin ?? '',
  args: testCase.args ?? [],
  files: testCase.files ?? {},
  outputLimit: OUTPUT_LIMIT,
});

/** HotSpot's output cut at the limit, without a character the cut split (as the runner keeps it). */
function cutAtLimit(bytes) {
  let end = Math.min(bytes.length, OUTPUT_LIMIT);
  let lead = end - 1;
  while (lead >= 0 && end - lead <= 3 && (bytes[lead] & 0xc0) === 0x80) lead--;
  if (lead >= 0) {
    const size = bytes[lead] >= 0xf0 ? 4 : bytes[lead] >= 0xe0 ? 3 : bytes[lead] >= 0xc0 ? 2 : 1;
    if (size > end - lead) end = lead;
  }
  return bytes.subarray(0, end);
}

const userFrames = (stderr) => stderr.split('\n').filter((line) => line.startsWith('\tat ') && !line.startsWith('\tat java.base/'));
const causes = (stderr) => stderr.split('\n').filter((line) => line.startsWith('Caused by: ') || /^\t\.\.\. \d+ more$/.test(line));

function compare(testCase, reference, got) {
  const problems = [];
  const notes = [];
  if (got.error && testCase.check !== 'trap') problems.push(`runner error: ${got.error}`);
  if (testCase.check === 'runner-only') {
    if (!got.outputTruncated) problems.push('expected outputTruncated');
    if (got.exitCode !== null) problems.push(`exit code ${got.exitCode}, expected null`);
    const text = got.stdout + got.stderr;
    if (new TextEncoder().encode(text).length !== OUTPUT_LIMIT) problems.push(`kept ${text.length} bytes, expected ${OUTPUT_LIMIT}`);
    if (!/^(0123456789)+012345$/.test(got.stdout)) problems.push('stdout is not the expected digit pattern');
    return { problems, notes };
  }
  if (testCase.check === 'trap') {
    if (!got.error) problems.push(`expected a VM trap, got exit code ${got.exitCode}`);
    if (!got.stdout.startsWith(testCase.expectOutput)) problems.push(`stdout before the trap: ${JSON.stringify(got.stdout.slice(0, 200))}`);
    return { problems, notes };
  }
  if (testCase.check === 'streaming') {
    if (got.received !== testCase.expectOutput) problems.push(`onOutput delivered ${JSON.stringify(got.received)} within ${testCase.withinMs} ms, expected ${JSON.stringify(testCase.expectOutput)}`);
    return { problems, notes };
  }
  if (testCase.check === 'truncated') {
    const expected = utf8(cutAtLimit(reference.stdoutBytes));
    if (got.stdout !== expected) problems.push(`stdout is not HotSpot stdout cut at 64 KB:\n${firstDifference(expected, got.stdout)}`);
    if (!got.outputTruncated) problems.push('expected outputTruncated');
    if (got.exitCode !== null) problems.push(`exit code ${got.exitCode}, expected null`);
    return { problems, notes };
  }
  if (got.stdout !== reference.stdout) problems.push(`stdout differs:\n${firstDifference(reference.stdout, got.stdout)}`);
  const refFirst = reference.stderr.split('\n')[0];
  const gotFirst = got.stderr.split('\n')[0];
  if (refFirst !== gotFirst) problems.push(`stderr first line differs:\n  hotspot: ${JSON.stringify(refFirst)}\n  runner:  ${JSON.stringify(gotFirst)}`);
  const refFrames = userFrames(reference.stderr).join('\n');
  const gotFrames = userFrames(got.stderr).join('\n');
  if (refFrames !== gotFrames) problems.push(`user stack frames differ:\n  hotspot: ${JSON.stringify(refFrames)}\n  runner:  ${JSON.stringify(gotFrames)}`);
  if (causes(reference.stderr).join('\n') !== causes(got.stderr).join('\n')) problems.push(`"Caused by" lines differ:\n  hotspot: ${JSON.stringify(causes(reference.stderr))}\n  runner:  ${JSON.stringify(causes(got.stderr))}`);
  if (reference.exitCode !== got.exitCode) problems.push(`exit code ${got.exitCode}, HotSpot ${reference.exitCode}`);
  if (got.outputTruncated) problems.push('unexpected outputTruncated');
  const refFiles = Object.keys(reference.files).sort();
  const gotFiles = Object.keys(got.files).sort();
  if (refFiles.join() !== gotFiles.join()) problems.push(`files differ: HotSpot ${JSON.stringify(refFiles)}, runner ${JSON.stringify(gotFiles)}`);
  else for (const name of refFiles) if (Buffer.compare(Buffer.from(reference.files[name]), Buffer.from(got.files[name])) !== 0) problems.push(`file ${name} content differs`);
  if (reference.stderr !== got.stderr) {
    const message = `full stderr differs:\n${firstDifference(reference.stderr, got.stderr)}`;
    if (testCase.exactStderr) problems.push(message);
    else notes.push(message);
  }
  return { problems, notes };
}

function firstDifference(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] !== b[i]) return `  line ${i + 1}\n  hotspot: ${JSON.stringify(a[i])}\n  runner:  ${JSON.stringify(b[i])}`;
  }
  return '  (same lines)';
}

async function loadPlaywright() {
  const require = createRequire(import.meta.url);
  const candidates = ['playwright', '/opt/node22/lib/node_modules/playwright'];
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(require.resolve(candidate)).href);
      // Playwright's main entry is CommonJS, so its exports may sit under `default`.
      return mod.chromium ? mod : mod.default;
    } catch {}
  }
  throw new Error('Playwright not found');
}

function findChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers';
  if (!existsSync(root)) return undefined;
  for (const dir of readdirSync(root).filter((d) => d.startsWith('chromium')).sort().reverse()) {
    for (const path of ['chrome-linux/chrome', 'chrome-linux64/chrome']) {
      if (existsSync(join(root, dir, path))) return join(root, dir, path);
    }
  }
  return undefined;
}

const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.zip': 'application/zip' };
function serve(roots) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    const [, mount, ...rest] = url.pathname.split('/');
    const root = roots[mount];
    const path = root && resolve(root, rest.join('/'));
    if (!path || !path.startsWith(root) || !existsSync(path) || statSync(path).isDirectory()) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { 'content-type': MIME[extname(path)] ?? 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(readFileSync(path));
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

async function main() {
  const results = [];
  const compiled = new Map();
  for (const testCase of selected) compiled.set(testCase.name, compile(testCase));
  const references = new Map();
  for (const testCase of selected) {
    if (!['runner-only', 'streaming', 'trap'].includes(testCase.check)) references.set(testCase.name, runHotSpot(testCase, compiled.get(testCase.name).dir));
  }
  const engines = {};
  const timers = {};
  const timings = {};

  if (useNode) {
    const { createRunner } = await import(pathToFileURL(join(dist, 'runner-host.mjs')).href);
    const begin = performance.now();
    const runner = await createRunner();
    timings.node = { start: { ...runner.timings, totalMs: performance.now() - begin }, runs: {} };
    if (timing) {
      // A runner of its own, so the timed runs do not follow the trap case in the same process state.
      const timed = await createRunner();
      timers.node = (testCase) => timed.run(request(testCase, compiled.get(testCase.name)));
    }
    engines.node = async (testCase) => {
      const req = request(testCase, compiled.get(testCase.name));
      return testCase.check === 'streaming' ? streamInNodeWorker(req, testCase.withinMs) : runner.run(req);
    };
  }

  let browser;
  let server;
  if (useBrowser) {
    const { chromium } = await loadPlaywright();
    server = await serve({ runner: resolve(here, '..'), dist });
    const base = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ executablePath: findChromium() });
    const page = await browser.newPage();
    page.on('pageerror', (error) => console.error('[page]', error.message));
    await page.goto(`${base}/runner/test/browser/index.html`);
    await page.waitForFunction(() => window.ready);
    const distUrl = `${base}/dist/`;
    const start = await page.evaluate(([dist]) => window.startWorker('main', dist), [distUrl]);
    timings.browser = { start, runs: {}, userAgent: await page.evaluate(() => navigator.userAgent) };
    engines.browser = async (testCase) => {
      const req = request(testCase, compiled.get(testCase.name));
      req.classes = req.classes.map((c) => ({ path: c.path, base64: Buffer.from(c.bytes).toString('base64') }));
      if (testCase.check === 'streaming') return page.evaluate(([dist, r, ms]) => window.streamCase(dist, r, ms), [distUrl, req, testCase.withinMs]);
      const result = await page.evaluate(([r]) => window.runCase('main', r), [req]);
      result.files = Object.fromEntries(Object.entries(result.files).map(([k, v]) => [k, new Uint8Array(v)]));
      return result;
    };
    if (timing) {
      timings.browser.workers = await measureWorkers(page, distUrl);
      await page.evaluate(([dist]) => window.startWorker('timed', dist), [distUrl]);
      timers.browser = async (testCase) => {
        const req = request(testCase, compiled.get(testCase.name));
        req.classes = req.classes.map((c) => ({ path: c.path, base64: Buffer.from(c.bytes).toString('base64') }));
        return page.evaluate(([r]) => window.runCase('timed', r), [req]);
      };
    }
  }

  let failures = 0;
  for (const testCase of selected) {
    const reference = references.get(testCase.name);
    for (const [engine, run] of Object.entries(engines)) {
      const got = await run(testCase);
      const { problems, notes } = compare(testCase, reference, got);
      if (problems.length) failures++;
      results.push({ case: testCase.name, engine, pass: problems.length === 0, problems, notes, durationMs: Math.round(got.durationMs), hotspotMs: reference ? Math.round(reference.durationMs) : null });
      console.log(`${problems.length ? 'FAIL' : 'ok  '} ${engine.padEnd(7)} ${testCase.name.padEnd(24)} ${String(Math.round(got.durationMs)).padStart(6)} ms`);
      for (const problem of problems) console.log(`       ${problem.replaceAll('\n', '\n       ')}`);
      for (const note of notes) console.log(`       note: ${note.replaceAll('\n', '\n       ')}`);
    }
  }

  if (timing) {
    for (const [engine, run] of Object.entries(timers)) {
      for (const name of ['hello', 'typical', 'loop-10m']) {
        const testCase = cases.find((c) => c.name === name);
        const samples = [];
        for (let i = 0; i < 5; i++) samples.push(Math.round((await run(testCase)).durationMs));
        timings[engine].runs[name] = samples;
      }
    }
    console.log(JSON.stringify(timings, null, 2));
  }

  await browser?.close();
  server?.close();
  rmSync(work, { recursive: true, force: true });
  const summary = { passed: results.filter((r) => r.pass).length, failed: failures, results, timings };
  if (report) writeFileSync(report, JSON.stringify(summary, null, 2) + '\n');
  console.log(`${summary.passed} passed, ${failures} failed`);
  process.exitCode = failures ? 1 : 0;
}

/**
 * Run a program that never ends in a worker thread and collect what onOutput delivers in the
 * first `withinMs` milliseconds of the run (after start-up), then terminate the thread.
 */
async function streamInNodeWorker(req, withinMs) {
  const worker = new Worker(new URL('./stream-worker.mjs', import.meta.url), { workerData: { dist, request: req } });
  let received = '';
  let started;
  let timer;
  try {
    await new Promise((ok, fail) => {
      worker.on('error', fail);
      worker.on('exit', () => fail(new Error('the run ended; expected it to loop')));
      worker.on('message', (message) => {
        if (message.type === 'started') {
          started = performance.now();
          timer = setTimeout(ok, withinMs);
        } else if (message.type === 'output' && message.stream === 'stdout') {
          received += message.text;
        }
      });
    });
  } finally {
    clearTimeout(timer);
    worker.removeAllListeners('exit');
    await worker.terminate();
  }
  return { received, durationMs: performance.now() - started };
}

/** Start-up measurements: a cold Worker, a Worker given compiled modules, and fresh-instance runs. */
async function measureWorkers(page, distUrl) {
  const out = {};
  out.cold = [];
  for (let i = 0; i < 3; i++) {
    out.cold.push(await page.evaluate(([dist, key]) => window.startWorker(key, dist), [distUrl, `cold${i}`]));
    await page.evaluate(([key]) => window.stopWorker(key), [`cold${i}`]);
  }
  out.withModules = [];
  for (let i = 0; i < 3; i++) {
    out.withModules.push(await page.evaluate(([dist, key]) => window.startWorker(key, dist, { modulesFrom: 'main' }), [distUrl, `mod${i}`]));
    out.terminateMs = await page.evaluate(([key]) => window.stopWorker(key), [`mod${i}`]);
  }
  return out;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
