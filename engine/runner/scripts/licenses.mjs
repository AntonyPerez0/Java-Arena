// Collects the license texts of everything compiled into the runner: Ristretto, every Rust crate
// in the wasm32-wasip2 build (from `cargo metadata`), and the npm package whose runtime code jco
// puts into runner.js. Adapted from Ristretto's web/scripts/licenses.mjs (MIT OR Apache-2.0).
// Usage: node licenses.mjs <ristretto-dir> <out-file>
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const [root, outFile] = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const sections = ['Java Arena runner: licenses and notices of the components compiled into runner.core.wasm and runner.js'];

function include(name, directory, license, repository) {
  const files = new Set();
  function scan(path, depth = 0) {
    for (const entry of readdirSync(path)) {
      if (!/^(licen[sc]e|copying|notice)([._-]|$)/i.test(entry)) continue;
      const file = join(path, entry);
      if (statSync(file).isFile()) files.add(file);
      else if (depth < 2) scan(file, depth + 1);
    }
  }
  scan(directory);
  sections.push(`\n=== ${name} ===\nLicense: ${license ?? 'see upstream'}\nSource: ${repository ?? ''}`);
  for (const file of files) sections.push(readFileSync(file, 'utf8'));
}

include('Ristretto', root, 'Apache-2.0 OR MIT', 'https://github.com/theseus-rs/ristretto');
const metadata = JSON.parse(
  execFileSync('cargo', ['metadata', '--locked', '--format-version', '1', '--filter-platform', 'wasm32-wasip2'], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }),
);
const packages = new Map(metadata.packages.map((p) => [p.id, p]));
const nodes = new Map(metadata.resolve.nodes.map((n) => [n.id, n]));
const seen = new Set();
function visit(id) {
  if (seen.has(id)) return;
  seen.add(id);
  const p = packages.get(id);
  // Ristretto's own crates share the root license, included above.
  if (!p.name.startsWith('ristretto')) include(`${p.name} ${p.version}`, dirname(p.manifest_path), p.license, p.repository);
  for (const dep of nodes.get(id).deps.filter((d) => d.dep_kinds.some((k) => k.kind === null))) visit(dep.pkg);
}
visit(metadata.packages.find((p) => p.name === 'ristretto_playground').id);

const jco = join(here, '..', 'node_modules', '@bytecodealliance', 'jco-transpile');
const jcoDir = existsSync(jco) ? jco : join(process.cwd(), 'node_modules', '@bytecodealliance', 'jco-transpile');
if (existsSync(jcoDir)) {
  const info = JSON.parse(readFileSync(join(jcoDir, 'package.json'), 'utf8'));
  include(`${info.name} ${info.version} (runtime helpers generated into runner.js)`, jcoDir, info.license, 'https://github.com/bytecodealliance/jco');
}
writeFileSync(outFile, sections.join('\n') + '\n');
console.log(`${outFile}: ${seen.size} crates`);
