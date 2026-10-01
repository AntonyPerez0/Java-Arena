// Runs the fidelity suite on a real JDK and writes fidelity/out/jdk.json.
// Usage: node scripts/fidelity/jdk.mjs   (uses javac/java on PATH, or JAVA_HOME if set)
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { loadSuite, REFERENCE_JVM_FLAGS, referenceJavaHome } from './suite.mjs';

const bin = (tool) => join(referenceJavaHome(), 'bin', tool);
const env = { ...process.env, JAVA_TOOL_OPTIONS: '', LC_ALL: 'C.UTF-8' };
delete env.JAVA_TOOL_OPTIONS;

function writeSources(dir, sources) {
  for (const s of sources) {
    const target = join(dir, s.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, s.text);
  }
}

/** Every file in the folder and its subfolders, by its path in it (data/scores.txt). */
function snapshot(dir, prefix = '', files = {}) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) snapshot(full, `${prefix}${name}/`, files);
    else if (statSync(full).isFile()) files[prefix + name] = readFileSync(full, 'utf8');
  }
  return files;
}

/** Writes a program's data files into its working folder, subfolders too (data/scores.txt). */
export function writeDataFiles(dir, files) {
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), text);
  }
}

// javac runs in the sources' folder, with that folder as its class path (as the browser's compiler
// has it). It's given by its full path, which is taken out of the messages, so a file javac finds by
// itself there (such as one whose package line doesn't match its folder) is named as the browser names it.
function javac(src, out, sources) {
  mkdirSync(out, { recursive: true });
  const t = Date.now();
  const r = spawnSync(bin('javac'), ['-encoding', 'UTF-8', '-d', out, '-cp', src, ...sources.map((s) => s.path)], {
    cwd: src,
    env,
    encoding: 'utf8',
  });
  return { exitCode: r.status, output: ((r.stdout ?? '') + (r.stderr ?? '')).replaceAll(src + '/', ''), ms: Date.now() - t };
}

export function runOnJdk(suite = loadSuite()) {
  const result = { jdk: '', programs: {}, errors: {} };
  result.jdk = spawnSync(bin('java'), ['-version'], { env, encoding: 'utf8' }).stderr.split('\n').filter((l) => l && !l.startsWith('Picked up')).join(' / ');
  for (const p of suite.programs) {
    const tmp = mkdtempSync(join(tmpdir(), 'fid-'));
    const src = join(tmp, 'src');
    const classes = join(tmp, 'classes');
    const work = join(tmp, 'work');
    mkdirSync(src);
    mkdirSync(work);
    writeSources(src, p.sources);
    writeDataFiles(work, p.files);
    const c = javac(src, classes, p.sources);
    if (c.exitCode !== 0) {
      result.programs[p.id] = { compileError: c.output };
      rmSync(tmp, { recursive: true, force: true });
      continue;
    }
    const t = Date.now();
    const r = spawnSync(bin('java'), [...REFERENCE_JVM_FLAGS, '-cp', classes, p.mainClass, ...p.args], {
      cwd: work,
      env,
      input: p.stdin,
      encoding: 'utf8',
      timeout: 60_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    result.programs[p.id] = {
      stdout: r.stdout,
      stderr: r.stderr,
      exitCode: r.status,
      files: snapshot(work),
      compileMs: c.ms,
      runMs: Date.now() - t,
    };
    rmSync(tmp, { recursive: true, force: true });
  }
  for (const e of suite.errors) {
    const tmp = mkdtempSync(join(tmpdir(), 'fid-'));
    writeSources(tmp, e.sources);
    const c = javac(tmp, join(tmp, 'classes'), e.sources);
    result.errors[e.id] = { exitCode: c.exitCode, output: c.output };
    rmSync(tmp, { recursive: true, force: true });
  }
  return result;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = new URL('../../fidelity/out/', import.meta.url).pathname;
  mkdirSync(out, { recursive: true });
  const result = runOnJdk();
  writeFileSync(join(out, 'jdk.json'), JSON.stringify(result, null, 1));
  const bad = Object.entries(result.programs).filter(([, v]) => v.compileError);
  const compiled = Object.values(result.errors).filter((v) => v.exitCode === 0);
  console.log(`${result.jdk}`);
  console.log(`programs: ${Object.keys(result.programs).length}, failed to compile: ${bad.length}`);
  for (const [id, v] of bad) console.log(`  ${id}:\n${v.compileError}`);
  console.log(`error cases: ${Object.keys(result.errors).length}, unexpectedly compiled: ${compiled.length}`);
}
