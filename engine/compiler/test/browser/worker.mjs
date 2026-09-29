// Module Worker: loads javac.wasm through the host module and compiles on request.
import { createJavac } from '../../../dist/compiler/javac-host.mjs';

const base = new URL('../../../dist/compiler/', import.meta.url);
const t0 = performance.now();
let javac;
try {
  javac = await createJavac({
    wasm: fetch(new URL('javac.wasm', base)),
    sdk: fetch(new URL('java-base-sdk.bin', base)),
  });
  postMessage({ type: 'ready', loadMs: performance.now() - t0, loadTimings: javac.loadTimings });
} catch (e) {
  postMessage({ type: 'error', message: String(e && e.stack || e) });
}

self.onmessage = (e) => {
  const m = e.data;
  if (m.type !== 'compile') return;
  try {
    const r = javac.compile(m.files);
    postMessage({ type: 'result', id: m.id, result: r }, r.classes.map((c) => c.bytes.buffer));
  } catch (err) {
    postMessage({ type: 'result', id: m.id, error: String(err && err.stack || err) });
  }
};
