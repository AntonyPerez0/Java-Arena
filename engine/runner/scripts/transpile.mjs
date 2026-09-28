// Turn the runner's WebAssembly component into core modules plus JavaScript glue (runner.js),
// with the same jco options as Ristretto's own web build (web/scripts/build-runtime.mjs).
// Usage: node transpile.mjs <component.wasm> <out-dir>
import { transpileBytes } from '@bytecodealliance/jco-transpile';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [input, outDir] = process.argv.slice(2);
const { files } = await transpileBytes(readFileSync(input), {
  name: 'runner',
  instantiation: 'async',
  asyncMode: 'sync',
  wasiShim: false,
  nodejsCompat: false,
  base64Cutoff: 0,
  emitTypescriptDeclarations: false,
});
mkdirSync(outDir, { recursive: true });
for (const [name, bytes] of Object.entries(files)) {
  writeFileSync(join(outDir, name), bytes);
  console.log(`${name}: ${bytes.length} bytes`);
}
