// Tests the Wasm javac (engine/dist/compiler) against the javac 21 command line.
//
//   node engine/compiler/test/run-tests.mjs [--only <name>] [--out <results.json>]
//
// 1. programs/<name>/: compiled by both compilers; the class files are compared
//    byte for byte and both are run on HotSpot (reference flags, stdin from
//    input.txt); stdout, stderr and exit code must match.
// 2. errors/<name>/: compiled by both; javac's full output must match, every
//    diagnostic's "formatted" text must appear in the CLI output in order, and
//    file/line/column/code must match `javac -XDrawDiagnostics`.
// 3. Timings: module load, first compile, warm compiles.
//
// Environment: ARENA_JDK (default /usr/lib/jvm/java-21-openjdk-amd64),
// ARENA_COMPILER_WORK (scratch space, default /home/user/build/compiler).

import { spawnSync } from 'node:child_process';
import v8 from 'node:v8';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../../dist/compiler');
const JDK = process.env.ARENA_JDK || '/usr/lib/jvm/java-21-openjdk-amd64';
const WORK = path.join(process.env.ARENA_COMPILER_WORK || '/home/user/build/compiler', 'test-run');

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const outFile = args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(WORK, 'results.json');

// Same settings as the site's build-time reference run.
const JAVA_FLAGS = [
  '-Duser.language=en', '-Duser.country=US', '-Duser.timezone=UTC', '-Dfile.encoding=UTF-8',
  '-Dstdout.encoding=UTF-8', '-Dstderr.encoding=UTF-8',
  '-XX:+UnlockDiagnosticVMOptions', '-XX:-UseLibmIntrinsic',
];
const JAVAC_FLAGS = JAVA_FLAGS.slice(0, 6).map((f) => '-J' + f);
const childEnv = { ...process.env, LANG: 'C.UTF-8' };
delete childEnv.JAVA_TOOL_OPTIONS; // it makes the JVM print a "Picked up" line

function listJava(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...listJava(dir, r));
    else if (e.name.endsWith('.java')) out.push(r);
  }
  return out.sort();
}

function listFiles(dir, rel = '') {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = rel ? rel + '/' + e.name : e.name;
    if (e.isDirectory()) out.push(...listFiles(dir, r));
    else out.push(r);
  }
  return out.sort();
}

function cliCompile(dir, files, outDir, extra = []) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const r = spawnSync(path.join(JDK, 'bin/javac'), [...JAVAC_FLAGS, ...extra, '-d', outDir, ...files],
    { cwd: dir, env: childEnv, encoding: 'utf8' });
  return { exit: r.status, output: r.stdout + r.stderr };
}

function runJava(classDir, mainClass, input) {
  const r = spawnSync(path.join(JDK, 'bin/java'), [...JAVA_FLAGS, '-cp', classDir, mainClass],
    { env: childEnv, input, encoding: 'utf8', timeout: 30000 });
  return { exit: r.status, stdout: r.stdout, stderr: r.stderr, signal: r.signal };
}

function writeClasses(classes, outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  for (const c of classes) {
    const p = path.join(outDir, c.path);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, c.bytes);
  }
}

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
}

const round = (x) => Math.round(x * 10) / 10;

// Parses `javac -XDrawDiagnostics` output into [{file, line, column, code}].
function parseRaw(text) {
  const diags = [];
  for (const line of text.split('\n')) {
    let m = /^(.+?):(\d+):(\d+): (compiler\.[a-z]+\.[\w.-]+)/.exec(line);
    if (m) {
      diags.push({ file: m[1], line: +m[2], column: +m[3], code: m[4] });
      continue;
    }
    m = /^- (compiler\.[a-z]+\.[\w.-]+)/.exec(line);
    if (m) diags.push({ file: null, line: -1, column: -1, code: m[1] });
  }
  return diags;
}

const results = { programs: [], errors: [], timings: {} };
const tLoad = performance.now();
const { createJavac } = await import(pathToFileURL(path.join(DIST, 'javac-host.mjs')).href);
const javac = await createJavac({
  wasm: path.join(DIST, 'javac.wasm'),
  sdk: path.join(DIST, 'java-base-sdk.bin'),
});
results.timings.load = {
  totalMs: round(performance.now() - tLoad),
  ...Object.fromEntries(Object.entries(javac.loadTimings).map(([k, v]) => [k, round(v)])),
};

function wasmCompile(dir, files) {
  return javac.compile(files.map((p) => ({ path: p, text: fs.readFileSync(path.join(dir, p), 'utf8') })));
}

// ---- first compile and warm timings -------------------------------------------------
{
  const hello = path.join(HERE, 'programs/hello');
  const typical = path.join(HERE, 'programs/typical');
  const first = wasmCompile(hello, ['Main.java']);
  results.timings.firstCompileHelloMs = round(first.timeMs);
  const warm = (dir) => {
    const t = [];
    for (let i = 0; i < 10; i++) t.push(wasmCompile(dir, ['Main.java']).timeMs);
    return { medianMs: round(median(t)), minMs: round(Math.min(...t)), maxMs: round(Math.max(...t)) };
  };
  results.timings.warmHello = warm(hello);
  results.timings.warmTypical = warm(typical);
  results.timings.typicalLines = fs.readFileSync(path.join(typical, 'Main.java'), 'utf8').split('\n').length - 1;
}

// ---- programs -------------------------------------------------------------------------
const progRoot = path.join(HERE, 'programs');
for (const name of fs.readdirSync(progRoot).sort()) {
  if (only && name !== only) continue;
  const dir = path.join(progRoot, name);
  const files = listJava(dir);
  const res = { name, files: files.length };
  const w = wasmCompile(dir, files);
  const wasmOut = path.join(WORK, 'programs', name, 'wasm');
  const cliOut = path.join(WORK, 'programs', name, 'cli');
  writeClasses(w.classes, wasmOut);
  const c = cliCompile(dir, files, cliOut);
  res.compileMs = round(w.timeMs);
  res.bothCompiled = w.success && c.exit === 0;
  res.outputSame = w.output === c.output;
  if (!res.outputSame) res.outputDiff = { wasm: w.output, cli: c.output };
  const wFiles = listFiles(wasmOut);
  const cFiles = listFiles(cliOut);
  res.classFiles = cFiles.length;
  res.sameClassFileSet = JSON.stringify(wFiles) === JSON.stringify(cFiles);
  res.byteIdentical = res.sameClassFileSet && cFiles.every((f) =>
    fs.readFileSync(path.join(wasmOut, f)).equals(fs.readFileSync(path.join(cliOut, f))));
  if (!res.byteIdentical) {
    res.differingClasses = cFiles.filter((f) => !fs.existsSync(path.join(wasmOut, f))
      || !fs.readFileSync(path.join(wasmOut, f)).equals(fs.readFileSync(path.join(cliOut, f))));
  }
  const inputFile = path.join(dir, 'input.txt');
  const input = fs.existsSync(inputFile) ? fs.readFileSync(inputFile, 'utf8') : '';
  const rw = runJava(wasmOut, 'Main', input);
  const rc = runJava(cliOut, 'Main', input);
  res.runSame = rw.stdout === rc.stdout && rw.stderr === rc.stderr && rw.exit === rc.exit;
  res.exit = rc.exit;
  res.stdoutLines = rc.stdout.split('\n').length - 1;
  if (!res.runSame) res.runDiff = { wasm: rw, cli: rc };
  res.pass = res.bothCompiled && res.outputSame && res.sameClassFileSet && res.runSame;
  results.programs.push(res);
  console.log(`${res.pass ? 'PASS' : 'FAIL'} program ${name}: ${res.classFiles} classes, `
    + `${res.byteIdentical ? 'byte-identical' : 'bytes differ'}, run ${res.runSame ? 'same' : 'DIFFERENT'} `
    + `(${res.stdoutLines} lines, exit ${res.exit}), compile ${res.compileMs} ms`);
}

// ---- compile errors ---------------------------------------------------------------------
const errRoot = path.join(HERE, 'errors');
for (const name of fs.readdirSync(errRoot).sort()) {
  if (only && name !== only) continue;
  const dir = path.join(errRoot, name);
  const files = listJava(dir);
  const res = { name };
  const w = wasmCompile(dir, files);
  const c = cliCompile(dir, files, path.join(WORK, 'errors', name, 'cli'));
  // Raw mode turns off javac's compact method diagnostics unless asked for, and
  // prints only a file's base name and no file for position-less notes.
  const raw = cliCompile(dir, files, path.join(WORK, 'errors', name, 'raw'), ['-XDrawDiagnostics', '-Xdiags:compact']);
  res.success = w.success;
  res.successSame = w.success === (c.exit === 0);
  res.outputSame = w.output === c.output;
  // Every diagnostic's formatted text, in order, at the right place in the CLI output.
  let pos = 0;
  let formattedMatched = 0;
  for (const d of w.diagnostics) {
    const chunk = d.formatted + '\n';
    if (c.output.startsWith(chunk, pos)) {
      formattedMatched++;
      pos += chunk.length;
    }
  }
  res.diagnostics = w.diagnostics.length;
  res.formattedMatched = formattedMatched;
  const rawDiags = parseRaw(raw.output);
  const ours = w.diagnostics.map((d) => ({
    file: d.line < 0 ? null : d.file.replace(/^.*\//, ''), line: d.line, column: d.column, code: d.code,
  }));
  res.rawSame = JSON.stringify(ours) === JSON.stringify(rawDiags);
  if (!res.rawSame) res.rawDiff = { wasm: ours, cli: rawDiags };
  if (!res.outputSame) res.outputDiff = { wasm: w.output, cli: c.output };
  res.pass = res.successSame && res.outputSame && formattedMatched === w.diagnostics.length && res.rawSame;
  res.errors = w.errors;
  res.warnings = w.warnings;
  res.codes = [...new Set(w.diagnostics.map((d) => d.code))];
  results.errors.push(res);
  console.log(`${res.pass ? 'PASS' : 'FAIL'} errors ${name}: ${w.errors} errors, ${w.warnings} warnings, `
    + `${formattedMatched}/${w.diagnostics.length} diagnostics identical, codes ${res.rawSame ? 'same' : 'DIFFERENT'}`);
}

// ---- reuse, memory, crash recovery ---------------------------------------------------
{
  // Heap after a full GC, before and after 100 more compiles, each in its own
  // JS task as in a Worker. Growth here would be a per-compile leak.
  v8.setFlagsFromString('--expose-gc');
  const gc = vm.runInNewContext('gc');
  const tick = () => new Promise((r) => setTimeout(r, 0));
  const heapMB = async () => {
    await tick();
    gc();
    return Math.round(process.memoryUsage().heapUsed / 1e6);
  };
  const typical = path.join(HERE, 'programs/typical');
  const before = await heapMB();
  for (let i = 0; i < 100; i++) {
    wasmCompile(typical, ['Main.java']);
    await tick();
  }
  const after = await heapMB();
  results.memory = { heapMBBefore: before, heapMBAfter100Compiles: after, rssMB: Math.round(process.memoryUsage().rss / 1e6) };
  results.memory.pass = after - before < 20;
  console.log(`${results.memory.pass ? 'PASS' : 'FAIL'} memory: JS heap ${before} MB, after 100 more compiles ${after} MB`);
  // Nesting this deep overflows the Wasm stack (javac 21 on HotSpot compiles it).
  const deep = `public class Main { int x = ${'('.repeat(5000)}1${')'.repeat(5000)}; }`;
  const crash = javac.compile([{ path: 'Main.java', text: deep }]);
  const t = performance.now();
  await javac.recover();
  const recoverMs = performance.now() - t;
  const again = wasmCompile(path.join(HERE, 'programs/hello'), ['Main.java']);
  results.crashRecovery = {
    crashed: crash.crashed === true && javac.broken === false,
    recoverMs: round(recoverMs),
    compilesAfterRecovery: again.success,
  };
  results.crashRecovery.pass = results.crashRecovery.crashed && again.success;
  console.log(`${results.crashRecovery.pass ? 'PASS' : 'FAIL'} crash recovery: `
    + `${crash.diagnostics[0] && crash.diagnostics[0].message}; recovered in ${round(recoverMs)} ms`);
}

const p = results.programs;
const e = results.errors;
results.summary = {
  programs: p.length,
  programsPassed: p.filter((r) => r.pass).length,
  programsByteIdentical: p.filter((r) => r.byteIdentical).length,
  classFiles: p.reduce((s, r) => s + r.classFiles, 0),
  errorTests: e.length,
  errorTestsPassed: e.filter((r) => r.pass).length,
  diagnostics: e.reduce((s, r) => s + r.diagnostics, 0),
  diagnosticsIdentical: e.reduce((s, r) => s + r.formattedMatched, 0),
};
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, JSON.stringify(results, null, 2) + '\n');
console.log('\nTimings (ms):', JSON.stringify(results.timings));
console.log('Summary:', JSON.stringify(results.summary));
console.log('Details:', outFile);
const failed = p.some((r) => !r.pass) || e.some((r) => !r.pass) || !results.crashRecovery.pass
  || !results.memory.pass;
process.exit(failed ? 1 : 0);
