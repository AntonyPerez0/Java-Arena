// Builds the libraries a program may use on top of java.base: JUnit 4 with Hamcrest
// (for the unit testing lessons), as one archive of class files that both halves of the
// engine read. The compiler puts them on javac's class path (javac-host loadLibrary), and
// the runner loads them next to the program's own classes.
//
// Usage: node engine/libraries/build.mjs
// Writes engine/dist/libraries/: junit4.bin, manifest.json and licenses/.
//
// Archive format (the one the compiler's SDK uses): a gzip stream of entries sorted by
// name, each "short nameLength, UTF-8 name, int dataLength, data", with a fixed gzip
// header, so the output is the same for the same jars.
import { createHash } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync, inflateRawSync } from 'node:zlib';

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

const classes = new Map();
const manifest = { files: [], sources: [] };
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'licenses'), { recursive: true });
for (const jar of JARS) {
  const res = await fetch(jar.url);
  if (!res.ok) throw new Error(`${jar.url}: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (sha256(bytes) !== jar.sha256) throw new Error(`${jar.url}: SHA-256 is ${sha256(bytes)}, expected ${jar.sha256}`);
  const entries = unzip(bytes);
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

const names = [...classes.keys()].sort();
const parts = [];
for (const name of names) {
  const nameBytes = new TextEncoder().encode(name);
  const head = new Uint8Array(2 + nameBytes.length + 4);
  const v = new DataView(head.buffer);
  v.setUint16(0, nameBytes.length);
  head.set(nameBytes, 2);
  v.setUint32(2 + nameBytes.length, classes.get(name).length);
  parts.push(head, classes.get(name));
}
const payload = Buffer.concat(parts);
const archive = gzipSync(payload, { level: 9 });
archive[9] = 255; // gzip header "OS": unknown, the same on every system
writeFileSync(join(out, 'junit4.bin'), archive);
manifest.files.push({ name: 'junit4.bin', size: archive.length, sha256: sha256(archive), classes: names.length, payload: payload.length });
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`junit4.bin: ${names.length} classes, ${payload.length} bytes, ${archive.length} bytes gzip`);
