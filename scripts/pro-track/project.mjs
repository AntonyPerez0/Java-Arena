// The Pro Track's projects (pro-track/<id>/, solved in pro-track-solutions/<id>/): what a project
// folder must contain, checked without Maven, the zip the site offers for download, and reading
// Maven Surefire's test reports. Node's own modules only, so the CI job pro-track runs it without
// npm ci. Used by scripts/pro-track-check.mjs (with Maven), the site build (vite.config.ts and
// scripts/prerender.mjs, through scripts/pro-track/site.mjs) and the unit tests
// (scripts/pro-track.test.mjs). pro-track/README.md, "For contributors", says the same in words.
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

/**
 * The versions every project's pom.xml pins (checked to resolve from Maven Central). The check
 * requires exactly these, so the projects stay alike: to move to newer ones, change them here and
 * in every pom.xml together, then run npm run pro-track-check.
 */
export const PINNED = {
  /** org.junit.jupiter:junit-jupiter (JUnit 5), scope test. */
  junit: "5.14.4",
  /** org.apache.maven.plugins:maven-surefire-plugin (runs the tests in mvn test). */
  surefire: "3.5.4",
  /** org.apache.maven.plugins:maven-compiler-plugin (Maven 3.8 and older bring 3.1, which predates release 21). */
  compiler: "3.14.1",
  /** com.h2database:h2, for a project with a database. */
  h2: "2.4.240",
  /** org.openjfx:javafx-* (OpenJFX 21, the newest 21.0.x, as in scripts/fx-check/jars.json). */
  openjfx: "21.0.12",
  /** org.openjfx:javafx-maven-plugin (mvn javafx:run). */
  javafxPlugin: "0.0.8",
  /** org.codehaus.mojo:exec-maven-plugin (mvn exec:java, to run a command-line program). */
  exec: "3.6.2",
};

/** The plugins a project may use, by groupId:artifactId, with the version each must have. */
export const PLUGINS = {
  "org.apache.maven.plugins:maven-compiler-plugin": PINNED.compiler,
  "org.apache.maven.plugins:maven-surefire-plugin": PINNED.surefire,
  "org.openjfx:javafx-maven-plugin": PINNED.javafxPlugin,
  "org.codehaus.mojo:exec-maven-plugin": PINNED.exec,
};

/** The dependencies a project may have: groupId:artifactId (a regular expression), the version, and the scope it must have (null: the default, compile). */
export const DEPENDENCIES = [
  { id: /^org\.junit\.jupiter:junit-jupiter$/, version: PINNED.junit, scope: "test" },
  { id: /^com\.h2database:h2$/, version: PINNED.h2, scope: null },
  { id: /^org\.openjfx:javafx-(base|graphics|controls|fxml|media)$/, version: PINNED.openjfx, scope: null },
];

/** The README's sections (## headings), in this order; others may come between them or after. */
export const README_SECTIONS = ["What you'll build", "What you need", "Steps", "Run the tests", "Run the program", "Put it on GitHub (optional)"];

/** .github/workflows/test.yml of every project, word for word: it runs the tests in the learner's own GitHub repository. */
export const WORKFLOW = `# Runs the project's tests on GitHub's computers on every push and pull request.
# See the results in your repository's Actions tab.
name: Tests

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-java@v5
        with:
          distribution: temurin
          java-version: "21"
          cache: maven
      - name: Run the tests
        run: mvn -B test
`;

/** Files and folders never part of a project (built or editor files): the check refuses them and the zip leaves them out. */
const JUNK = [/(^|\/)target\//, /\.class$/, /(^|\/)\.idea\//, /(^|\/)\.vscode\//, /\.iml$/, /(^|\/)\.DS_Store$/, /(^|\/)Thumbs\.db$/, /(^|\/)(out|bin|build)\//, /(^|\/)\.settings\//, /(^|\/)\.classpath$/, /(^|\/)\.project$/, /~$/, /\.sw[po]$/];
/** Files a project's program makes when it runs (H2's database files): refused and left out the same way. */
const RUN_FILES = [/\.mv\.db$/, /\.trace\.db$/, /\.lock\.db$/, /\.tempFile$/];
/** Whether a file is made by running the project's program (rather than by a build or an editor). */
export const isRunFile = (rel) => RUN_FILES.some((re) => re.test(rel));
export const isJunk = (rel) => isRunFile(rel) || JUNK.some((re) => re.test(rel));

/** The largest a project folder may be (its files together, before zipping). */
export const MAX_BYTES = 1_000_000;

/** A project's id: its folder's name, in kebab-case. */
export const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/** Every file under dir (relative paths with /, sorted by their bytes so the order is the same everywhere), junk included. */
export function walk(dir) {
  const out = [];
  const visit = (rel) => {
    for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      // A link or anything else that isn't a folder is listed too, so the check can refuse it.
      if (e.isDirectory()) visit(r);
      else out.push(r);
    }
  };
  if (fs.existsSync(dir)) visit("");
  return out.sort((a, b) => Buffer.compare(Buffer.from(a), Buffer.from(b)));
}

/** The project folders (pro-track/<id>/ with a pom.xml), sorted by id. */
export function projectIds(root) {
  const dir = path.join(root, "pro-track");
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, "pom.xml")))
    .map((e) => e.name)
    .sort();
}

// ---------------------------------------------------------------- pom.xml

const stripComments = (xml) => xml.replace(/<!--[\s\S]*?-->/g, "");
/** The text of the first <tag> directly in `xml` (not inside a nested element of the same name), or null. */
const tagText = (xml, tag) => {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return m ? m[1].trim() : null;
};
/** xml with every <tag>...</tag> block removed (so a dependency's own <version> isn't read as the project's). */
const without = (xml, tags) => tags.reduce((x, t) => x.replace(new RegExp(`<${t}>[\\s\\S]*?</${t}>`, "g"), ""), xml);
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "g"))].map((m) => m[1]);

/**
 * The parts of a pom.xml the check looks at: the project's coordinates, its properties, its
 * dependencies and its build plugins (with ${property} versions filled in). Plain text matching,
 * enough for the plain poms the projects use.
 */
export function readPom(text) {
  const xml = stripComments(text);
  const props = {};
  const propBlock = tagText(xml, "properties");
  if (propBlock) for (const m of propBlock.matchAll(/<([\w.-]+)>([^<]*)<\/\1>/g)) props[m[1]] = m[2].trim();
  const fill = (v) => (v == null ? null : v.replace(/\$\{([\w.-]+)\}/g, (all, k) => props[k] ?? all));
  const top = without(xml, ["parent", "dependencies", "dependencyManagement", "build", "properties", "profiles", "reporting"]);
  const item = (b) => ({ groupId: tagText(b, "groupId"), artifactId: tagText(b, "artifactId"), version: fill(tagText(without(b, ["configuration", "executions", "dependencies", "exclusions"]), "version")), scope: tagText(b, "scope") });
  const depsBlock = tagText(without(xml, ["dependencyManagement", "build", "profiles"]), "dependencies") ?? "";
  const buildBlock = tagText(without(xml, ["profiles"]), "build") ?? "";
  const pluginsBlock = tagText(without(buildBlock, ["pluginManagement"]), "plugins") ?? "";
  return {
    modelVersion: tagText(top, "modelVersion"),
    groupId: tagText(top, "groupId"),
    artifactId: tagText(top, "artifactId"),
    version: tagText(top, "version"),
    packaging: tagText(top, "packaging"),
    properties: props,
    dependencies: blocks(depsBlock, "dependency").map(item),
    plugins: blocks(pluginsBlock, "plugin").map((b) => ({ ...item(b), groupId: tagText(without(b, ["configuration", "executions", "dependencies"]), "groupId") ?? "org.apache.maven.plugins" })),
    has: (tag) => new RegExp(`<${tag}[\\s>]`).test(xml),
  };
}

/** A version Maven reads as exactly one release: numbers with dots, nothing else (no SNAPSHOT, range, LATEST or ${...}). */
export const isPinned = (v) => typeof v === "string" && /^\d+(\.\d+)*$/.test(v);

/** What's wrong with a project's pom.xml (empty: nothing). */
export function pomProblems(text, id) {
  const p = readPom(text);
  const out = [];
  if (p.modelVersion !== "4.0.0") out.push("modelVersion must be 4.0.0");
  if (p.has("parent")) out.push("no <parent>: the pom stands on its own");
  if (p.has("modules")) out.push("no <modules>: one project, one pom");
  if (p.has("repositories") || p.has("pluginRepositories")) out.push("no <repositories>: everything comes from Maven Central");
  if (p.artifactId !== id) out.push(`the artifactId must be the folder's name, ${id} (it is ${p.artifactId ?? "missing"})`);
  if (!p.groupId) out.push("needs a groupId");
  if (!p.version) out.push("needs a version");
  if (p.packaging && p.packaging !== "jar") out.push(`packaging must be jar (or left out), not ${p.packaging}`);
  if (p.properties["maven.compiler.release"] !== "21") out.push("properties: maven.compiler.release must be 21");
  if (p.properties["project.build.sourceEncoding"] !== "UTF-8") out.push("properties: project.build.sourceEncoding must be UTF-8");
  for (const d of p.dependencies) {
    const name = `${d.groupId}:${d.artifactId}`;
    const rule = DEPENDENCIES.find((r) => r.id.test(name));
    if (!rule) {
      out.push(`the dependency ${name} isn't one the projects use (JUnit Jupiter, H2, OpenJFX); add it to DEPENDENCIES in scripts/pro-track/project.mjs if it's really needed`);
      continue;
    }
    if (!isPinned(d.version)) out.push(`${name} needs a pinned version (${rule.version}), not ${d.version ?? "none"}`);
    else if (d.version !== rule.version) out.push(`${name} must be version ${rule.version} (the version every project pins), not ${d.version}`);
    if ((d.scope ?? null) !== rule.scope) out.push(`${name} must have ${rule.scope ? `<scope>${rule.scope}</scope>` : "no scope (compile)"}`);
  }
  if (!p.dependencies.some((d) => d.groupId === "org.junit.jupiter" && d.artifactId === "junit-jupiter")) out.push(`needs the dependency org.junit.jupiter:junit-jupiter ${PINNED.junit} with <scope>test</scope>`);
  for (const pl of p.plugins) {
    const name = `${pl.groupId}:${pl.artifactId}`;
    const want = PLUGINS[name];
    if (!want) out.push(`the plugin ${name} isn't needed (the plugins a project may use: ${Object.keys(PLUGINS).join(", ")})`);
    else if (!isPinned(pl.version)) out.push(`the plugin ${name} needs a pinned version (${want}), not ${pl.version ?? "none"}`);
    else if (pl.version !== want) out.push(`the plugin ${name} must be version ${want}, not ${pl.version}`);
  }
  for (const need of ["maven-compiler-plugin", "maven-surefire-plugin"])
    if (!p.plugins.some((pl) => pl.groupId === "org.apache.maven.plugins" && pl.artifactId === need)) out.push(`needs the plugin ${need} with its version pinned (${PLUGINS[`org.apache.maven.plugins:${need}`]})`);
  const usesFx = p.dependencies.some((d) => d.groupId === "org.openjfx");
  const fxPlugin = p.plugins.some((pl) => pl.artifactId === "javafx-maven-plugin");
  if (usesFx && !fxPlugin) out.push("a JavaFX project needs the javafx-maven-plugin, so mvn javafx:run starts it");
  if (fxPlugin && !usesFx) out.push("the javafx-maven-plugin is only for a project with OpenJFX dependencies");
  return out;
}

// ---------------------------------------------------------------- README.md

/** The README's title (its first line, "# Title"), the paragraph under it, and its ## sections by heading. */
export function readReadme(text) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const title = /^# (.+)$/.exec(lines[0] ?? "")?.[1]?.trim() ?? null;
  const sections = [];
  let cur = null;
  const intro = [];
  let fence = false;
  for (const line of lines.slice(1)) {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence;
    const h = !fence && /^## (.+)$/.exec(line);
    if (h) {
      cur = { heading: h[1].trim(), body: [] };
      sections.push(cur);
    } else if (cur) cur.body.push(line);
    else intro.push(line);
  }
  const introText = intro.join("\n").trim();
  return {
    title,
    summary: introText.split(/\n\s*\n/)[0]?.replace(/\s+/g, " ").trim() ?? "",
    intro: introText,
    sections: sections.map((s) => ({ heading: s.heading, body: s.body.join("\n").trim() })),
  };
}

/** What's wrong with a project's README.md. */
export function readmeProblems(text) {
  const r = readReadme(text);
  const out = [];
  if (!r.title) out.push('the first line must be the title: "# The title"');
  if (!r.summary) out.push("needs a paragraph under the title: what the project is, in one to three sentences (the site shows it in the list)");
  else if (r.summary.length > 400) out.push(`the paragraph under the title is ${r.summary.length} characters; at most 400 (it's the summary in the site's list)`);
  const heads = r.sections.map((s) => s.heading);
  let at = -1;
  for (const want of README_SECTIONS) {
    const k = heads.indexOf(want);
    if (k < 0) out.push(`needs the section "## ${want}"`);
    else if (k < at) out.push(`the section "## ${want}" must come after "## ${README_SECTIONS[README_SECTIONS.indexOf(want) - 1]}"`);
    else at = k;
  }
  for (const s of r.sections) if (!s.body) out.push(`the section "## ${s.heading}" is empty`);
  const tests = r.sections.find((s) => s.heading === "Run the tests")?.body ?? "";
  if (!/mvn test/.test(tests)) out.push('"## Run the tests" must show the command mvn test');
  if (/[\u2013\u2014]/.test(text)) out.push("has an en or em dash; use a colon, a comma or two sentences");
  return out;
}

// ---------------------------------------------------------------- the folders

/**
 * What's wrong with pro-track/<id>/ and pro-track-solutions/<id>/, without running Maven: the
 * files a project must have, its pom.xml, README.md and workflow, the starter's TODOs, and the
 * solution's files.
 */
export function folderProblems(root, id) {
  const dir = path.join(root, "pro-track", id);
  const sol = path.join(root, "pro-track-solutions", id);
  const where = `pro-track/${id}`;
  const out = [];
  const say = (m) => out.push(`${where}: ${m}`);
  if (!ID.test(id)) say("the folder's name is the project's id, in kebab-case (like word-stats)");
  const files = walk(dir);
  const read = (rel) => fs.readFileSync(path.join(dir, rel), "utf8");
  for (const f of files) {
    const st = fs.lstatSync(path.join(dir, f));
    if (!st.isFile()) say(`${f} isn't a plain file (a link?): only plain files go in a project`);
    else if (isRunFile(f)) say(`${f} is a file the program makes when you run it; delete it (the zip leaves such files out, and the learner's .gitignore does too)`);
    else if (isJunk(f)) say(`${f} is a built or editor file; delete it (the zip leaves such files out, and the learner's .gitignore does too)`);
  }
  const size = files.reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
  if (size > MAX_BYTES) say(`its files come to ${size} bytes; at most ${MAX_BYTES}`);
  for (const need of ["pom.xml", "README.md", ".gitignore", ".github/workflows/test.yml"]) if (!files.includes(need)) say(`needs ${need}`);
  if (files.includes("pom.xml")) for (const p of pomProblems(read("pom.xml"), id)) say(`pom.xml: ${p}`);
  if (files.includes("README.md")) for (const p of readmeProblems(read("README.md"))) say(`README.md: ${p}`);
  if (files.includes(".gitignore") && !/^\/?target\/?$/m.test(read(".gitignore"))) say(".gitignore must have the line target/ (Maven's build folder stays out of the learner's repository)");
  if (files.includes(".github/workflows/test.yml") && read(".github/workflows/test.yml").replace(/\r\n/g, "\n") !== WORKFLOW) say(".github/workflows/test.yml must be the workflow in pro-track/README.md, word for word (WORKFLOW in scripts/pro-track/project.mjs)");
  const main = files.filter((f) => f.startsWith("src/main/java/") && f.endsWith(".java"));
  const tests = files.filter((f) => f.startsWith("src/test/java/") && f.endsWith(".java"));
  if (!main.length) say("needs the starter code: .java files in src/main/java/");
  if (!tests.length) say("needs JUnit 5 tests: .java files in src/test/java/");
  if (main.length && !main.some((f) => /\/\/\s*TODO\b/.test(read(f)))) say("the starter code needs at least one // TODO where the learner writes code");
  for (const f of [...main, ...tests]) {
    const t = read(f);
    const pkg = /^\s*package\s+([\w.]+)\s*;/m.exec(t)?.[1] ?? "";
    const folder = path.posix.dirname(f.replace(/^src\/(main|test)\/java\//, ""));
    if (pkg.replace(/\./g, "/") !== (folder === "." ? "" : folder)) say(`${f}: its package (${pkg || "none"}) must match its folder`);
    if (/[\u2013\u2014]/.test(t)) say(`${f} has an en or em dash`);
  }
  if (tests.length && !tests.some((f) => /org\.junit\.jupiter\.api/.test(read(f)))) say("the tests must use JUnit 5 (org.junit.jupiter.api)");
  // The model solution: only files that replace or add code in src/main/java.
  const solFiles = walk(sol);
  if (!fs.existsSync(sol)) say(`needs its model solution in pro-track-solutions/${id}/src/main/java/`);
  else if (!solFiles.length) say(`pro-track-solutions/${id}/ has no files`);
  for (const f of solFiles) {
    const sw = `pro-track-solutions/${id}/${f}`;
    if (!f.startsWith("src/main/java/") || !f.endsWith(".java")) {
      out.push(`${sw}: the solution holds only .java files in src/main/java/ (the files that differ from the starter)`);
      continue;
    }
    if (files.includes(f) && fs.readFileSync(path.join(sol, f), "utf8") === read(f)) out.push(`${sw} is the same as the starter's; leave it out (the solution holds only the files that differ)`);
    if (/\/\/\s*TODO\b/.test(fs.readFileSync(path.join(sol, f), "utf8"))) out.push(`${sw} still has a // TODO`);
  }
  return out;
}

/** Problems with the two folders as a whole: a solution without a project, or a project folder without a pom.xml. */
export function layoutProblems(root) {
  const out = [];
  const ids = new Set(projectIds(root));
  const solDir = path.join(root, "pro-track-solutions");
  if (fs.existsSync(solDir))
    for (const e of fs.readdirSync(solDir, { withFileTypes: true })) if (e.isDirectory() && !ids.has(e.name)) out.push(`pro-track-solutions/${e.name}: there's no pro-track/${e.name}/ with a pom.xml`);
  const dir = path.join(root, "pro-track");
  if (fs.existsSync(dir))
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && !ids.has(e.name)) out.push(`pro-track/${e.name}: a project folder needs a pom.xml (only projects go in pro-track/)`);
  return out;
}

// ---------------------------------------------------------------- the zip

/** The time every file in a zip has (DOS time and date): 1 January 2026, 00:00. */
const ZIP_TIME = 0;
const ZIP_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * A zip of the given files ({ name, data }), the same bytes for the same files whatever order they
 * come in or when they were changed: sorted by name, each with the same time (ZIP_TIME, ZIP_DATE),
 * the same permissions (rw-r--r--, from Unix) and compressed with deflate at level 9 (stored when
 * that isn't smaller).
 */
export function makeZip(entries) {
  const sorted = [...entries].sort((a, b) => Buffer.compare(Buffer.from(a.name), Buffer.from(b.name)));
  const names = new Set();
  const local = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of sorted) {
    if (names.has(name)) throw new Error(`zip: ${name} twice`);
    names.add(name);
    const nameBytes = Buffer.from(name, "utf8");
    const raw = Buffer.from(data);
    const deflated = zlib.deflateRawSync(raw, { level: 9 });
    const stored = deflated.length >= raw.length;
    const body = stored ? raw : deflated;
    const crc = crc32(raw);
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0);
    head.writeUInt16LE(20, 4); // version needed: 2.0
    head.writeUInt16LE(0x0800, 6); // names in UTF-8
    head.writeUInt16LE(stored ? 0 : 8, 8);
    head.writeUInt16LE(ZIP_TIME, 10);
    head.writeUInt16LE(ZIP_DATE, 12);
    head.writeUInt32LE(crc, 14);
    head.writeUInt32LE(body.length, 18);
    head.writeUInt32LE(raw.length, 22);
    head.writeUInt16LE(nameBytes.length, 26);
    head.writeUInt16LE(0, 28);
    local.push(head, nameBytes, body);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50, 0);
    c.writeUInt16LE((3 << 8) | 20, 4); // made by: Unix, 2.0
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(stored ? 0 : 8, 10);
    c.writeUInt16LE(ZIP_TIME, 12);
    c.writeUInt16LE(ZIP_DATE, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(body.length, 20);
    c.writeUInt32LE(raw.length, 24);
    c.writeUInt16LE(nameBytes.length, 28);
    c.writeUInt16LE(0, 30); // extra
    c.writeUInt16LE(0, 32); // comment
    c.writeUInt16LE(0, 34); // disk
    c.writeUInt16LE(0, 36); // internal attributes
    c.writeUInt32LE((0o100644 << 16) >>> 0, 38); // a regular file, rw-r--r--
    c.writeUInt32LE(offset, 42);
    central.push(c, nameBytes);
    offset += head.length + nameBytes.length + body.length;
  }
  const cd = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...local, cd, end]));
}

/** Reads a zip made by makeZip (or any zip without zip64): its files' names and contents, in order. */
export function readZip(bytes) {
  const b = Buffer.from(bytes);
  const endAt = b.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endAt < 0) throw new Error("not a zip");
  const count = b.readUInt16LE(endAt + 10);
  let at = b.readUInt32LE(endAt + 16);
  const out = [];
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(at) !== 0x02014b50) throw new Error("zip: damaged central directory");
    const method = b.readUInt16LE(at + 10);
    const crc = b.readUInt32LE(at + 16);
    const size = b.readUInt32LE(at + 20);
    const nameLen = b.readUInt16LE(at + 28);
    const extra = b.readUInt16LE(at + 30);
    const comment = b.readUInt16LE(at + 32);
    const localAt = b.readUInt32LE(at + 42);
    const name = b.subarray(at + 46, at + 46 + nameLen).toString("utf8");
    const dataAt = localAt + 30 + b.readUInt16LE(localAt + 26) + b.readUInt16LE(localAt + 28);
    const body = b.subarray(dataAt, dataAt + size);
    const data = method === 8 ? zlib.inflateRawSync(body) : Buffer.from(body);
    if (crc32(data) !== crc) throw new Error(`zip: ${name} has a wrong CRC`);
    out.push({ name, data, time: b.readUInt16LE(at + 12), date: b.readUInt16LE(at + 14), attributes: b.readUInt32LE(at + 38) >>> 16 });
    at += 46 + nameLen + extra + comment;
  }
  return out;
}

/** The zip of pro-track/<id>/: every file but junk, under the folder <id>/, so it unzips into a folder of its own. */
export function zipProject(root, id) {
  const dir = path.join(root, "pro-track", id);
  const files = walk(dir).filter((f) => !isJunk(f) && fs.lstatSync(path.join(dir, f)).isFile());
  return makeZip(files.map((f) => ({ name: `${id}/${f}`, data: fs.readFileSync(path.join(dir, f)) })));
}

// ---------------------------------------------------------------- Surefire's reports

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
  return m ? m[1] : null;
};

/**
 * Totals of Maven Surefire's XML reports (target/surefire-reports/TEST-*.xml texts): tests, failures,
 * errors, skipped, and the tests that failed or erred ("Class.method").
 */
export function surefireTotals(xmlTexts) {
  const t = { suites: 0, tests: 0, failures: 0, errors: 0, skipped: 0, failed: [] };
  for (const xml of xmlTexts) {
    const suite = /<testsuite\b[^>]*>/.exec(xml)?.[0];
    if (!suite) continue;
    t.suites++;
    t.tests += Number(attr(suite, "tests") ?? 0);
    t.failures += Number(attr(suite, "failures") ?? 0);
    t.errors += Number(attr(suite, "errors") ?? 0);
    t.skipped += Number(attr(suite, "skipped") ?? 0);
    for (const m of xml.matchAll(/<testcase\b([^>]*?)(\/>|>([\s\S]*?)<\/testcase>)/g)) {
      if (!m[3] || !/<(failure|error)\b/.test(m[3])) continue;
      const cls = attr(m[1], "classname") ?? "";
      t.failed.push(`${cls.split(".").pop()}.${attr(m[1], "name") ?? "?"}`);
    }
  }
  return t;
}

/** Reads a project copy's target/surefire-reports (null when there is none: the tests never ran). */
export function readSurefire(projectDir) {
  const dir = path.join(projectDir, "target", "surefire-reports");
  if (!fs.existsSync(dir)) return null;
  const xml = fs
    .readdirSync(dir)
    .filter((f) => /^TEST-.*\.xml$/.test(f))
    .sort()
    .map((f) => fs.readFileSync(path.join(dir, f), "utf8"));
  return xml.length ? surefireTotals(xml) : null;
}
