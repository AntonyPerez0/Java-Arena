// Pack a jlink image into the zip layout Ristretto's web runtime mounts at /jdk
// (release, lib/modules, lib/tzdb.dat, conf/, legal/), with fixed timestamps so the zip is reproducible.
// Usage: node pack-jdk.mjs <image-dir> <out.zip>
import { zipSync } from 'fflate';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [imageDir, outFile] = process.argv.slice(2);
const files = {};
const mtime = new Date('2026-01-01T00:00:00Z');
function include(name) {
  const path = join(imageDir, name);
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) {
    for (const child of readdirSync(path).sort()) include(`${name}/${child}`);
  } else {
    // readFileSync follows symlinks, so the archive holds regular files only.
    files[name] = [new Uint8Array(readFileSync(path)), { mtime }];
  }
}
for (const name of ['release', 'lib/modules', 'lib/tzdb.dat', 'conf', 'legal']) include(name);
writeFileSync(outFile, zipSync(files, { level: 9 }));
console.log(`${outFile}: ${Object.keys(files).length} files`);
