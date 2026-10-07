// Runs the fidelity suite through the in-browser engine (headless Chromium, the built site's
// own worker code) and compares it with the real JDK (fidelity/out/jdk.json, made by jdk.mjs).
// Two extra cross-checks separate compiler differences from runtime differences:
//   browser javac -> HotSpot, and CLI javac -> browser runner.
// Writes fidelity/out/browser.json and fidelity/out/report.md; exits 1 on any mismatch.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { launchChromium } from '../browser.mjs';
import { javaRunArgs } from '../javafx/reference.mjs';
import { libraryDir } from '../libraries.mjs';
import { serve } from '../serve.mjs';
import { loadSuite, REFERENCE_JVM_FLAGS, referenceJavaHome, stderrKey } from './suite.mjs';
import { runOnJdk, writeDataFiles } from './jdk.mjs';

const out = new URL('../../fidelity/out/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const suite = loadSuite();
const jdkFile = join(out, 'jdk.json');
const jdk = existsSync(jdkFile) ? JSON.parse(readFileSync(jdkFile, 'utf8')) : runOnJdk(suite);
if (!existsSync(jdkFile)) writeFileSync(jdkFile, JSON.stringify(jdk, null, 1));

const env = { ...process.env, LC_ALL: 'C.UTF-8' };
delete env.JAVA_TOOL_OPTIONS;
const bin = (tool) => join(referenceJavaHome(), 'bin', tool);

const { server, url } = await serve();
const browser = await launchChromium();
const page = await browser.newPage();
page.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
await page.goto(url + 'harness/?nosw');
const tStart = Date.now();
await page.evaluate(() => window.javaArena.engineReady());
const engineStartMs = Date.now() - tStart;

// Helpers that run inside the page. Class bytes cross the boundary as plain arrays. Libraries
// (Java Arena's JavaFX) go on the class path, as the site puts them there.
const compileInPage = (sources, libraries = []) =>
  page.evaluate(
    async ({ sources, libraries }) => {
      const r = await window.javaArena.compile(sources, { libraries });
      return { ...r, classes: r.classes.map((c) => ({ path: c.path, bytes: Array.from(c.bytes) })) };
    },
    { sources, libraries },
  );
const runInPage = (classes, mainClass, input, libraries = []) =>
  page.evaluate(
    async ({ classes, mainClass, input, libraries }) => {
      const cls = classes.map((c) => ({ path: c.path, bytes: new Uint8Array(c.bytes) }));
      return (await window.javaArena.runClasses(cls, mainClass, [input], 60_000, { libraries }))[0];
    },
    { classes, mainClass, input, libraries },
  );

function runOnHotSpot(classes, p) {
  const tmp = mkdtempSync(join(tmpdir(), 'fidx-'));
  const cdir = join(tmp, 'classes');
  const work = join(tmp, 'work');
  mkdirSync(work, { recursive: true });
  for (const c of classes) {
    mkdirSync(dirname(join(cdir, c.path)), { recursive: true });
    writeFileSync(join(cdir, c.path), Buffer.from(c.bytes));
  }
  writeDataFiles(work, p.files);
  const classPath = [cdir, ...p.libraries.map(libraryDir)].join(delimiter);
  const r = spawnSync(bin('java'), [...REFERENCE_JVM_FLAGS, ...javaRunArgs({ javaHome: referenceJavaHome(), libraries: p.libraries, classPath, mainClass: p.mainClass, args: p.args })], { cwd: work, env, input: p.stdin, encoding: 'utf8', timeout: 60_000 });
  rmSync(tmp, { recursive: true, force: true });
  return { stdout: r.stdout, stderr: r.stderr, exitCode: r.status };
}

function cliClasses(p) {
  const tmp = mkdtempSync(join(tmpdir(), 'fidc-'));
  for (const s of p.sources) {
    mkdirSync(dirname(join(tmp, 'src', s.path)), { recursive: true });
    writeFileSync(join(tmp, 'src', s.path), s.text);
  }
  const cp = p.libraries.length ? ['-cp', ['.', ...p.libraries.map(libraryDir)].join(delimiter)] : [];
  spawnSync(bin('javac'), ['-encoding', 'UTF-8', '-d', join(tmp, 'classes'), ...cp, ...p.sources.map((s) => s.path)], { cwd: join(tmp, 'src'), env });
  const list = spawnSync('find', ['.', '-name', '*.class'], { cwd: join(tmp, 'classes'), encoding: 'utf8' }).stdout.split('\n').filter(Boolean);
  const classes = list.map((f) => ({ path: f.replace(/^\.\//, ''), bytes: Array.from(readFileSync(join(tmp, 'classes', f))) }));
  rmSync(tmp, { recursive: true, force: true });
  return classes;
}

// Default Object.toString prints an identity hash (Main$Book@1b6d3586) that differs between runs.
const stable = (s, nondeterministic) => (nondeterministic ? s.replace(/@[0-9a-f]+/g, '@HASH') : s);

function compare(ref, got, p) {
  const problems = [];
  if (!got || got.internalError) return [`engine failed: ${got?.internalError ?? 'no result'}`];
  if (got.timedOut) problems.push('timed out');
  if (stable(got.stdout, p.nondeterministic) !== stable(ref.stdout, p.nondeterministic)) problems.push('stdout differs');
  if (got.exitCode !== ref.exitCode) problems.push(`exit code ${got.exitCode}, expected ${ref.exitCode}`);
  if (stderrKey(got.stderr) !== stderrKey(ref.stderr)) problems.push('stderr differs');
  for (const [name, text] of Object.entries(ref.files ?? {})) {
    if (p.files[name] === text) continue;
    if (got.files && got.files[name] !== text) problems.push(`file ${name} differs`);
  }
  return problems;
}

const results = { engineStartMs, programs: {}, errors: {} };
let failures = 0;
for (const p of suite.programs) {
  const ref = jdk.programs[p.id];
  const c = await compileInPage(p.sources, p.libraries);
  const entry = { compileMs: c.ms, compileOk: c.ok, diagnostics: c.diagnostics.map((d) => d.formatted) };
  if (!c.ok) {
    entry.problems = ['did not compile in the browser'];
  } else {
    const t = Date.now();
    const run = await runInPage(c.classes, p.mainClass, { stdin: p.stdin, args: p.args, files: p.files }, p.libraries);
    entry.wallMs = Date.now() - t;
    entry.run = run;
    entry.problems = compare(ref, run, p);
    // Browser javac -> HotSpot: tests the compiler alone.
    const hs = runOnHotSpot(c.classes, p);
    entry.compilerOnly = compare({ ...ref, files: {} }, { ...hs, files: {} }, p);
    // CLI javac -> browser runner: tests the runner alone.
    const run2 = await runInPage(cliClasses(p), p.mainClass, { stdin: p.stdin, args: p.args, files: p.files }, p.libraries);
    entry.runnerOnly = compare(ref, run2, p);
  }
  const bad = entry.problems.length + (entry.compilerOnly?.length ?? 0) + (entry.runnerOnly?.length ?? 0);
  if (bad) failures++;
  results.programs[p.id] = entry;
  console.log(`${bad ? 'FAIL' : 'ok  '} ${p.id}${bad ? ': ' + [...entry.problems, ...(entry.compilerOnly ?? []).map((x) => 'compiler-only: ' + x), ...(entry.runnerOnly ?? []).map((x) => 'runner-only: ' + x)].join('; ') : ''}`);
}

const normalizeJavac = (text) =>
  text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .filter((l) => !/^\d+ errors?$/.test(l) && !/^\d+ warnings?$/.test(l) && l !== '')
    .map((l) => l.replace(/^(\/[^:]*\/)?(\w+\.java):/, '$2:'))
    .join('\n');
let errorMatches = 0;
for (const e of suite.errors) {
  const c = await compileInPage(e.sources, e.libraries);
  const got = normalizeJavac(c.diagnostics.map((d) => d.formatted).join('\n'));
  const want = normalizeJavac(jdk.errors[e.id].output);
  const firstGot = got.split('\n')[0];
  const firstWant = want.split('\n')[0];
  const same = got === want;
  if (same) errorMatches++;
  results.errors[e.id] = { compiled: c.ok, same, firstLineSame: firstGot === firstWant, got, want, codes: c.diagnostics.map((d) => d.code) };
  console.log(`${same ? 'ok  ' : c.ok ? 'FAIL' : 'diff'} error ${e.id}${same ? '' : `\n  want: ${firstWant}\n  got:  ${firstGot}`}`);
  if (c.ok) failures++;
}

await browser.close();
server.close();
writeFileSync(join(out, 'browser.json'), JSON.stringify(results, null, 1));

const lines = [
  '# Fidelity report',
  '',
  `Reference: ${jdk.jdk}`,
  `Engine start in headless Chromium: ${engineStartMs} ms`,
  '',
  '| Program | Browser javac + runner | javac only | runner only | compile ms | run ms (wall) |',
  '|---|---|---|---|---|---|',
  ...Object.entries(results.programs).map(
    ([id, r]) =>
      `| ${id} | ${r.problems.length ? r.problems.join('; ') : 'same'} | ${r.compilerOnly ? (r.compilerOnly.length ? r.compilerOnly.join('; ') : 'same') : '-'} | ${r.runnerOnly ? (r.runnerOnly.length ? r.runnerOnly.join('; ') : 'same') : '-'} | ${Math.round(r.compileMs)} | ${r.wallMs ?? '-'} |`,
  ),
  '',
  `Compile errors identical to javac 21 CLI (all lines, paths and the "N errors" line ignored): ${errorMatches} of ${suite.errors.length}.`,
  '',
  ...Object.entries(results.errors)
    .filter(([, r]) => !r.same)
    .flatMap(([id, r]) => [`### ${id}`, '', 'javac 21 CLI:', '```', r.want, '```', 'browser:', '```', r.got, '```', '']),
];
writeFileSync(join(out, 'report.md'), lines.join('\n'));
console.log(`\n${suite.programs.length - failures} of ${suite.programs.length} programs identical; ${errorMatches} of ${suite.errors.length} compile errors identical. Report: fidelity/out/report.md`);
process.exit(failures || errorMatches < suite.errors.length ? 1 : 0);
