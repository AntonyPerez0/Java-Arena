// Builds the libraries a program may use on top of java.base, each as one archive of class files
// that both halves of the engine read. The compiler puts them on javac's class path (javac-host
// loadLibrary), and the runner loads them next to the program's own classes.
//
//   junit4.bin  JUnit 4 with Hamcrest (the unit testing lessons): the class files of the pinned
//               jars from Maven Central, unchanged.
//   javafx.bin  Java Arena's practice version of JavaFX (the GUI lessons): our own code, compiled
//               from engine/libraries/javafx/src with the reference JDK's javac.
//
// Usage: node engine/libraries/build.mjs
// Writes engine/dist/libraries/: junit4.bin, javafx.bin, manifest.json and licenses/. The jars are
// kept in node_modules/.cache/java-arena-libraries/ (checked by SHA-256), so a rebuild needn't
// download them again.
//
// Archive format (the one the compiler's SDK uses): a gzip stream of entries sorted by name, each
// "short nameLength, UTF-8 name, int dataLength, data", with a fixed gzip header, so the output is
// the same for the same class files. javac writes the same class files for the same sources, so
// javafx.bin is the same on every run with the same JDK (its version is checked).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { gzipSync, inflateRawSync } from 'node:zlib';
import { referenceJavaHome } from '../../scripts/fidelity/suite.mjs';

// Pinned sources. The site's source offer must list these.
const JARS = [
  {
    name: 'JUnit',
    version: '4.13.2',
    url: 'https://repo1.maven.org/maven2/junit/junit/4.13.2/junit-4.13.2.jar',
    sha256: '8e495b634469d64fb8acfa3495a065cbacc8a0fff55ce1e31007be4c16dc57d3',
    source: 'https://github.com/junit-team/junit4 tag r4.13.2 (also junit-4.13.2-sources.jar on Maven Central)',
    license: 'EPL-1.0',
    licenseEntry: 'LICENSE-junit.txt',
  },
  {
    name: 'Hamcrest Core',
    version: '1.3',
    url: 'https://repo1.maven.org/maven2/org/hamcrest/hamcrest-core/1.3/hamcrest-core-1.3.jar',
    sha256: '66fdef91e9739348df7a096aa384a5685f4e875584cce89386a7a47251c4d8e9',
    source: 'https://github.com/hamcrest/JavaHamcrest tag hamcrest-java-1.3 (also hamcrest-core-1.3-sources.jar on Maven Central)',
    license: 'BSD-3-Clause',
    licenseEntry: 'LICENSE.txt',
  },
];

const root = new URL('../..', import.meta.url).pathname;
const out = join(root, 'engine', 'dist', 'libraries');
const jarCache = join(root, 'node_modules', '.cache', 'java-arena-libraries');
const javafxSources = join(root, 'engine', 'libraries', 'javafx', 'src');
// The JDK that compiles javafx.bin: the reference JDK, whose javac also checks the lessons.
const JAVAC_VERSION = '21.0.10+7';
const sha256 = (data) => createHash('sha256').update(data).digest('hex');

/** The entries of a zip file (stored or deflated), from its central directory. */
function unzip(zip) {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let end = zip.length - 22;
  while (end >= 0 && view.getUint32(end, true) !== 0x06054b50) end--;
  if (end < 0) throw new Error('not a zip file');
  const count = view.getUint16(end + 10, true);
  let p = view.getUint32(end + 16, true);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) throw new Error('bad zip central directory');
    const method = view.getUint16(p + 10, true);
    const compressedSize = view.getUint32(p + 20, true);
    const size = view.getUint32(p + 24, true);
    const nameLength = view.getUint16(p + 28, true);
    const local = view.getUint32(p + 42, true);
    const name = new TextDecoder().decode(zip.subarray(p + 46, p + 46 + nameLength));
    p += 46 + nameLength + view.getUint16(p + 30, true) + view.getUint16(p + 32, true);
    if (name.endsWith('/')) continue;
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const raw = zip.subarray(start, start + compressedSize);
    const data = method === 0 ? raw : method === 8 ? inflateRawSync(raw) : null;
    if (!data) throw new Error(`${name}: unsupported zip method ${method}`);
    if (data.length !== size) throw new Error(`${name}: size mismatch`);
    entries.set(name, new Uint8Array(data));
  }
  return entries;
}

/** Every file under a folder, by its path in it with / between folders. */
function filesUnder(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...filesUnder(full));
    else found.push(full);
  }
  return found;
}

/** A pinned jar: from the cache when it's there with the right SHA-256, otherwise downloaded (and cached). */
async function jarBytes(jar) {
  const cached = join(jarCache, jar.url.split('/').pop());
  if (existsSync(cached)) {
    const bytes = new Uint8Array(readFileSync(cached));
    if (sha256(bytes) === jar.sha256) return bytes;
  }
  const res = await fetch(jar.url);
  if (!res.ok) throw new Error(`${jar.url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (sha256(bytes) !== jar.sha256) throw new Error(`${jar.url}: SHA-256 is ${sha256(bytes)}, expected ${jar.sha256}`);
  mkdirSync(jarCache, { recursive: true });
  writeFileSync(cached, bytes);
  return bytes;
}

/**
 * Compiles Java Arena's JavaFX with the reference JDK: --release 21 (the class library the engine
 * runs), -g (line numbers and local names, as the learner's own code gets), and string
 * concatenation as StringBuilder calls (-XDstringConcat=inline), which the browser's interpreter
 * runs faster than the invokedynamic form. Returns the class files by path.
 */
function compileJavaFX() {
  const javaHome = referenceJavaHome();
  const release = readFileSync(join(javaHome, 'release'), 'utf8');
  const version = /^JAVA_RUNTIME_VERSION="([^"]+)"/m.exec(release)?.[1] ?? 'unknown';
  if (!version.startsWith(JAVAC_VERSION)) throw new Error(`javafx.bin is compiled with the reference JDK ${JAVAC_VERSION}, but ${javaHome} is ${version} (set JAVA_HOME, or unset it to use scripts/get-jdk.sh)`);
  const sources = filesUnder(javafxSources).filter((f) => f.endsWith('.java')).map((f) => relative(javafxSources, f)).sort();
  const classesDir = mkdtempSync(join(tmpdir(), 'java-arena-javafx-'));
  const env = { ...process.env, LC_ALL: 'C.UTF-8' };
  delete env.JAVA_TOOL_OPTIONS;
  const r = spawnSync(join(javaHome, 'bin', 'javac'), ['--release', '21', '-g', '-XDstringConcat=inline', '-encoding', 'UTF-8', '-Xlint:-this-escape', '-Werror', '-d', classesDir, ...sources], { cwd: javafxSources, env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`javac failed on engine/libraries/javafx/src:\n${r.stdout}${r.stderr}`);
  const classes = new Map();
  for (const f of filesUnder(classesDir)) classes.set(relative(classesDir, f).split('\\').join('/'), new Uint8Array(readFileSync(f)));
  rmSync(classesDir, { recursive: true, force: true });
  return { classes, sources: sources.length, version };
}

/** Writes an archive of class files (see the top of this file) and returns its manifest entry. */
function writeArchive(name, classes) {
  const names = [...classes.keys()].sort();
  const parts = [];
  for (const path of names) {
    const nameBytes = new TextEncoder().encode(path);
    const head = new Uint8Array(2 + nameBytes.length + 4);
    const v = new DataView(head.buffer);
    v.setUint16(0, nameBytes.length);
    head.set(nameBytes, 2);
    v.setUint32(2 + nameBytes.length, classes.get(path).length);
    parts.push(head, classes.get(path));
  }
  const payload = Buffer.concat(parts);
  const archive = gzipSync(payload, { level: 9 });
  archive[9] = 255; // gzip header "OS": unknown, the same on every system
  writeFileSync(join(out, name), archive);
  console.log(`${name}: ${names.length} classes, ${payload.length} bytes, ${archive.length} bytes gzip`);
  return { name, size: archive.length, sha256: sha256(archive), classes: names.length, payload: payload.length };
}

// Everything is downloaded, checked and compiled first, so a failure leaves the old files in place.
const downloads = [];
for (const jar of JARS) downloads.push(await jarBytes(jar));
const javafx = compileJavaFX();

const classes = new Map();
const manifest = { files: [], sources: [], own: [] };
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'licenses'), { recursive: true });
for (const [k, jar] of JARS.entries()) {
  const entries = unzip(downloads[k]);
  let n = 0;
  for (const [name, data] of entries) {
    if (!name.endsWith('.class') || name.endsWith('module-info.class')) continue;
    if (classes.has(name)) throw new Error(`${name} is in two jars`);
    classes.set(name, data);
    n++;
  }
  const license = entries.get(jar.licenseEntry);
  if (!license) throw new Error(`${jar.url}: no ${jar.licenseEntry}`);
  const licenseFile = `${jar.name.replace(/ /g, '-')}-${jar.version}-LICENSE.txt`;
  writeFileSync(join(out, 'licenses', licenseFile), license);
  manifest.sources.push({ name: jar.name, version: jar.version, jar: jar.url, sha256: jar.sha256, source: jar.source, license: jar.license, licenseFile: `licenses/${licenseFile}`, classes: n });
  console.log(`${jar.name} ${jar.version}: ${n} classes`);
}

manifest.files.push(writeArchive('junit4.bin', classes));
manifest.files.push({ ...writeArchive('javafx.bin', javafx.classes), note: "Java Arena's own code (MIT, like the rest of the site): no third-party license" });
manifest.own.push({
  name: "Java Arena's practice version of JavaFX",
  file: 'javafx.bin',
  source: 'engine/libraries/javafx/src',
  sourceFiles: javafx.sources,
  javac: `${javafx.version} (--release 21 -g -XDstringConcat=inline)`,
  license: "MIT: Java Arena's own code, written for this site (not OpenJFX's code)",
});
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
