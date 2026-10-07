// The engine's libraries (engine/dist/libraries/*.bin: JUnit 4, Java Arena's JavaFX) as folders of
// class files, for the reference JDK's javac and java class paths: the same class files the
// browser engine loads. Used by the content build, the fidelity suite and the unit tests.
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { gunzipSync } from "node:zlib";

const LIBRARIES = new URL("../engine/dist/libraries/", import.meta.url).pathname;

/**
 * Unpacks a library's archive into `dir` (made if needed). Returns { dir, sha }: `sha` identifies
 * the archive (for cache keys). Archive format: engine/libraries/build.mjs.
 */
export function unpackLibrary(name, dir) {
  const archive = readFileSync(join(LIBRARIES, `${name}.bin`));
  const data = gunzipSync(archive);
  for (let p = 0; p < data.length; ) {
    const n = data.readUInt16BE(p);
    const file = data.toString("utf8", p + 2, p + 2 + n);
    p += 2 + n;
    const length = data.readUInt32BE(p);
    p += 4;
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), data.subarray(p, p + length));
    p += length;
  }
  return { dir, sha: createHash("sha256").update(archive).digest("hex").slice(0, 16) };
}

let scratch = null;
const unpacked = new Map();
/** The folder of a library's class files, unpacked once per process into a temporary folder (removed at exit). */
export function libraryDir(name) {
  if (!unpacked.has(name)) {
    if (!scratch) {
      scratch = mkdtempSync(join(tmpdir(), "java-arena-libraries-"));
      process.on("exit", () => rmSync(scratch, { recursive: true, force: true }));
    }
    unpacked.set(name, unpackLibrary(name, join(scratch, name)).dir);
  }
  return unpacked.get(name);
}
