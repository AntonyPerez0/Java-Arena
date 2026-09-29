// Loads the fidelity suite: fidelity/programs/* (programs to run) and fidelity/errors/* (programs that must not compile).
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../../fidelity/', import.meta.url).pathname;

function listFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...listFiles(full));
    else out.push(full);
  }
  return out;
}

function loadCase(dir, id) {
  const sources = listFiles(dir)
    .filter((f) => f.endsWith('.java'))
    .map((f) => ({ path: relative(dir, f), text: readFileSync(f, 'utf8') }))
    .sort((a, b) => a.path.localeCompare(b.path));
  const stdinFile = join(dir, 'stdin.txt');
  const metaFile = join(dir, 'meta.json');
  const filesDir = join(dir, 'files');
  const files = {};
  if (existsSync(filesDir)) {
    for (const f of listFiles(filesDir)) files[relative(filesDir, f)] = readFileSync(f, 'utf8');
  }
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {};
  return {
    id,
    sources,
    stdin: existsSync(stdinFile) ? readFileSync(stdinFile, 'utf8') : '',
    args: meta.args ?? [],
    files,
    mainClass: meta.mainClass ?? 'Main',
    nondeterministic: meta.nondeterministic ?? false,
    note: meta.note ?? '',
  };
}

export function loadSuite() {
  const load = (sub) =>
    readdirSync(join(ROOT, sub))
      .filter((d) => statSync(join(ROOT, sub, d)).isDirectory())
      .sort()
      .map((d) => loadCase(join(ROOT, sub, d), d));
  return { programs: load('programs'), errors: load('errors') };
}

// JVM flags for the reference run. The two diagnostic flags make HotSpot's Math match StrictMath,
// which is what an interpreter computes. Locale, time zone and encodings are pinned on both sides.
export const REFERENCE_PROPERTIES = {
  'user.language': 'en',
  'user.country': 'US',
  'user.timezone': 'UTC',
  'file.encoding': 'UTF-8',
  'stdout.encoding': 'UTF-8',
  'stderr.encoding': 'UTF-8',
};
export const REFERENCE_JVM_FLAGS = [
  ...Object.entries(REFERENCE_PROPERTIES).map(([k, v]) => `-D${k}=${v}`),
  '-XX:+UnlockDiagnosticVMOptions',
  '-XX:-UseLibmIntrinsic',
];

// Keeps what graders compare in stderr: the first line and the learner's own stack frames.
// JDK frames are printed differently by different JVMs (HotSpot: java.base/java.util.Scanner.next(Scanner.java:1594)).
export function stderrKey(stderr) {
  const lines = stderr.replace(/\r\n/g, '\n').split('\n');
  const keep = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const frame = /^\s+at (.+)$/.exec(line);
    if (frame) {
      if (/^(java|jdk|sun)\./.test(frame[1]) || /^java\.base/.test(frame[1])) continue;
      keep.push('\tat ' + frame[1]);
    } else if (/^\s+\.\.\. \d+ more$/.test(line)) {
      continue;
    } else {
      keep.push(line);
    }
  }
  return keep.join('\n');
}

// The reference JDK: JAVA_HOME when set, otherwise the pinned Temurin 21.0.10+7 (scripts/get-jdk.sh).
let javaHome = null;
export function referenceJavaHome() {
  javaHome ??= process.env.JAVA_HOME || execFileSync('bash', [new URL('../get-jdk.sh', import.meta.url).pathname], { encoding: 'utf8' }).trim();
  return javaHome;
}
