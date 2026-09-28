// Extra check on a large body of real course code: every ```java block in the
// given Markdown files (snippets without a class are wrapped in one) is compiled
// by the Wasm javac and by the javac 21 command line. For blocks that compile, the class
// files must be byte-identical; for blocks that do not, javac's output must be
// identical.
//
//   node engine/compiler/test/corpus.mjs <dir with .md files, searched recursively>
//
// The corpus is not part of this repository (for example a checkout of the MOOC
// material at https://github.com/rage/java-programming, data/ folder).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(HERE, '../../dist/compiler');
const JDK = process.env.ARENA_JDK || '/usr/lib/jvm/java-21-openjdk-amd64';
const WORK = path.join(process.env.ARENA_COMPILER_WORK || '/home/user/build/compiler', 'corpus-run');
const root = process.argv[2];
if (!root) {
  console.error('usage: node corpus.mjs <markdown dir>');
  process.exit(2);
}
const childEnv = { ...process.env, LANG: 'C.UTF-8' };
delete childEnv.JAVA_TOOL_OPTIONS;
const JAVAC_FLAGS = ['-J-Duser.language=en', '-J-Duser.country=US', '-J-Dfile.encoding=UTF-8',
  '-J-Dstdout.encoding=UTF-8', '-J-Dstderr.encoding=UTF-8'];

function mdFiles(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...mdFiles(p));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

const blocks = [];
for (const f of mdFiles(root)) {
  const text = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  for (const m of text.matchAll(/```java\n([\s\S]*?)```/g)) {
    const code = m[1];
    const cls = /^(?:public\s+)?(?:final\s+|abstract\s+)*(?:class|interface|enum|record)\s+(\w+)/m.exec(code);
    if (!cls) {
      // A snippet: wrap it in a class, as members if it starts with a method, else as main's body.
      const members = /^\s*(?:public|private|protected|static)\b/.test(code);
      const wrapped = 'import java.util.*;\n\npublic class Main {\n'
        + (members ? code : '    public static void main(String[] args) throws Exception {\n' + code + '\n    }\n')
        + '}\n';
      blocks.push({ source: path.relative(root, f), name: 'Main', code: wrapped, wrapped: true });
      continue;
    }
    const pub = /^public\s+(?:final\s+|abstract\s+)*(?:class|interface|enum|record)\s+(\w+)/m.exec(code);
    blocks.push({ source: path.relative(root, f), name: (pub || cls)[1], code });
  }
}

const { createJavac } = await import(pathToFileURL(path.join(DIST, 'javac-host.mjs')).href);
const javac = await createJavac({ wasm: path.join(DIST, 'javac.wasm'), sdk: path.join(DIST, 'java-base-sdk.bin') });

const stats = { blocks: blocks.length, wrappedSnippets: blocks.filter((b) => b.wrapped).length, compiled: 0, byteIdentical: 0, failedBoth: 0, outputIdentical: 0, mismatches: [] };
let totalMs = 0;
fs.rmSync(WORK, { recursive: true, force: true });
blocks.forEach((b, i) => {
  const dir = path.join(WORK, String(i));
  fs.mkdirSync(dir, { recursive: true });
  const file = b.name + '.java';
  fs.writeFileSync(path.join(dir, file), b.code);
  const r = javac.compile([{ path: file, text: b.code }]);
  totalMs += r.timeMs;
  const c = spawnSync(path.join(JDK, 'bin/javac'), [...JAVAC_FLAGS, '-d', 'out', file],
    { cwd: dir, env: childEnv, encoding: 'utf8' });
  const cliOutput = c.stdout + c.stderr;
  if (c.status === 0) {
    stats.compiled++;
    const cliFiles = spawnSync('find', ['out', '-name', '*.class'], { cwd: dir, encoding: 'utf8' }).stdout
      .trim().split('\n').filter(Boolean).map((p) => p.slice(4)).sort();
    const ours = r.classes.map((x) => x.path).sort();
    const same = r.success && r.output === cliOutput && JSON.stringify(ours) === JSON.stringify(cliFiles)
      && r.classes.every((x) => fs.readFileSync(path.join(dir, 'out', x.path)).equals(Buffer.from(x.bytes)));
    if (same) stats.byteIdentical++;
    else stats.mismatches.push({ block: i, source: b.source, name: b.name, kind: 'class files' });
  } else {
    stats.failedBoth += r.success ? 0 : 1;
    if (!r.success && r.output === cliOutput) stats.outputIdentical++;
    else stats.mismatches.push({ block: i, source: b.source, name: b.name, kind: 'diagnostics', wasm: r.output, cli: cliOutput });
  }
});
stats.averageCompileMs = Math.round(totalMs / blocks.length * 10) / 10;
console.log(JSON.stringify(stats, null, 2));
process.exit(stats.mismatches.length ? 1 : 0);
