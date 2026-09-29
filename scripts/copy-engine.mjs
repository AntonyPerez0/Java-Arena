// Copies the built engine (engine/dist) into public/engine with gzip copies and one manifest.
// The workers fetch the .gz copies and unpack them with DecompressionStream as they arrive.
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const root = new URL('..', import.meta.url).pathname;
const out = join(root, 'public', 'engine');
const parts = ['compiler', 'runner'];

const manifests = {};
for (const part of parts) {
  const file = join(root, 'engine', 'dist', part, 'manifest.json');
  if (!existsSync(file)) {
    // Locally this can happen while the engine is being rebuilt; in CI it means engine/dist wasn't committed.
    console.error(`copy-engine: ${file} is missing, so the site would have no Java engine`);
    process.exit(process.env.CI ? 1 : 0);
  }
  manifests[part] = JSON.parse(readFileSync(file, 'utf8'));
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const manifest = { version: '', files: {}, gzip: {}, compiler: [], runner: [] };
const hash = createHash('sha256');
for (const part of parts) {
  for (const entry of manifests[part].files) {
    const name = entry.name ?? entry.file;
    // JavaScript glue is bundled by Vite into the workers; only the binary files are fetched.
    if (!name || /\.(m?js|ts|md)$/.test(name)) continue;
    const data = readFileSync(join(root, 'engine', 'dist', part, name));
    const sha = createHash('sha256').update(data).digest('hex');
    if (entry.sha256 && entry.sha256 !== sha) throw new Error(`copy-engine: ${part}/${name} does not match its SHA-256 in the manifest`);
    hash.update(`${part}/${name}:${sha}\n`);
    writeFileSync(join(out, name), data);
    manifest.files[name] = data.length;
    const gz = gzipSync(data, { level: 9 });
    if (gz.length < data.length * 0.95) {
      writeFileSync(join(out, name + '.gz'), gz);
      manifest.gzip[name] = gz.length;
    }
    manifest[part].push(name);
  }
}
manifest.version = hash.digest('hex').slice(0, 12);
// The license texts are published with the files they cover.
for (const part of parts) {
  const licenses = join(root, 'engine', 'dist', part, 'licenses');
  if (existsSync(licenses)) cpSync(licenses, join(out, 'licenses', part), { recursive: true, dereference: true });
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 1));
const total = Object.keys(manifest.files).reduce((a, f) => a + (manifest.gzip[f] ?? manifest.files[f]), 0);
console.log(`copy-engine: ${Object.keys(manifest.files).length} files, ${(total / 1e6).toFixed(1)} MB to download, version ${manifest.version}`);
