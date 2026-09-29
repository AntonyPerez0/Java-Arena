// After vite build and scripts/prerender.mjs: fills in the service worker's file list and version,
// and checks the workers' size budgets.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { writeNpmLicenses } from './npm-licenses.mjs';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');

const licenses = writeNpmLicenses(root, join(dist, 'licenses', 'npm-packages.txt'));
console.log(`finish-build: licenses of ${licenses.count} npm packages in licenses/npm-packages.txt`);

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

const files = walk(dist)
  .map((f) => relative(dist, f).split('\\').join('/'))
  .filter((f) => !f.startsWith('engine/') && f !== 'sw.js' && !f.endsWith('.map'));
// Pages and their files are saved for offline use; license texts are not needed offline.
const offline = (f) => !f.startsWith('licenses/') && f !== 'robots.txt' && f !== 'sitemap.xml';
const assets = files
  .filter(offline)
  .map((f) => (f.endsWith('index.html') ? f.slice(0, -'index.html'.length) : f));
const hash = createHash('sha256');
for (const f of files.sort()) hash.update(f).update(readFileSync(join(dist, f)));
const version = hash.digest('hex').slice(0, 12);

const swPath = join(dist, 'sw.js');
const sw = readFileSync(swPath, 'utf8')
  .replace('const VERSION = "dev";', `const VERSION = ${JSON.stringify(version)};`)
  .replace('const ASSETS = [];', `const ASSETS = ${JSON.stringify(assets)};`);
writeFileSync(swPath, sw);

console.log(`finish-build: service worker ${version} with ${assets.length} files`);

// Lighthouse's script budget only sees the page's own scripts, so the workers get their own budget.
const WORKER_BUDGET = { 'compile.worker': 100_000, 'run.worker': 600_000 };
for (const f of files.filter((f) => /^assets\/(compile|run)\.worker-.*\.js$/.test(f))) {
  const name = f.includes('compile.worker') ? 'compile.worker' : 'run.worker';
  const size = statSync(join(dist, f)).size;
  console.log(`finish-build: ${name} ${(size / 1000).toFixed(0)} KB (budget ${WORKER_BUDGET[name] / 1000} KB)`);
  if (size > WORKER_BUDGET[name]) {
    console.error(`finish-build: ${f} is over its budget`);
    process.exit(1);
  }
}
