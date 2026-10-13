// Tests of the Pro Track's tools that need no Maven and no build output (scripts/pro-track/): the
// zip (the same input gives the same bytes, readable, junk left out), the pom.xml, README.md and
// folder rules on made-up projects, Surefire's report totals, the site's data from
// content/pro-track.yaml, and the real projects in pro-track/ (whatever there is). Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PINNED, WORKFLOW, folderProblems, isPinned, layoutProblems, makeZip, pomProblems, projectIds, readPom, readZip, readmeProblems, surefireTotals, zipProject } from "./pro-track/project.mjs";
import { inlineHtml, markdownHtml, plainText, readProTrack } from "./pro-track/site.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
/** The temporary folders the tests made, removed at the end. */
const made = [];
test.after(() => made.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));
const tmp = (name) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), name));
  made.push(d);
  return d;
};

const POM = (over = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.example</groupId>
    <artifactId>${over.id ?? "demo"}</artifactId>
    <version>1.0</version>
    <properties>
        <maven.compiler.release>${over.release ?? "21"}</maven.compiler.release>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <junit.version>${over.junit ?? PINNED.junit}</junit.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.junit.jupiter</groupId>
            <artifactId>junit-jupiter</artifactId>
            <version>\${junit.version}</version>
            <scope>test</scope>
        </dependency>${over.deps ?? ""}
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-compiler-plugin</artifactId>
                <version>${PINNED.compiler}</version>
            </plugin>
            <plugin>
                <groupId>org.apache.maven.plugins</groupId>
                <artifactId>maven-surefire-plugin</artifactId>
                <version>${over.surefire ?? PINNED.surefire}</version>
            </plugin>${over.plugins ?? ""}
        </plugins>
    </build>
</project>
`;

const README = `# Demo

A small project to try the rules.

## What you'll build

Something small.

## What you need

A JDK 21 and Maven.

## Steps

1. Find the \`// TODO\`.
2. See [the tests](src/test/java/demo/DemoTest.java).

## Run the tests

\`\`\`shell
mvn test
\`\`\`

## Run the program

\`\`\`shell
mvn -q compile
\`\`\`

## Put it on GitHub (optional)

Upload the files and open the Actions tab.
`;

const STARTER = "package demo;\n\npublic class Demo {\n    public static int answer() {\n        // TODO: return the answer.\n        throw new UnsupportedOperationException();\n    }\n}\n";
const TEST = "package demo;\n\nimport static org.junit.jupiter.api.Assertions.assertEquals;\n\nimport org.junit.jupiter.api.Test;\n\nclass DemoTest {\n    @Test\n    void answers() {\n        assertEquals(42, Demo.answer());\n    }\n}\n";
const SOLUTION = "package demo;\n\npublic class Demo {\n    public static int answer() {\n        return 42;\n    }\n}\n";

/** A made-up repository with one project, demo, in a temporary folder; `files` adds or replaces files (null removes one). */
function repo(files = {}) {
  const root = tmp("pro-track-test-");
  const all = {
    "content/course.yaml": "modules:\n  - id: methods\n    title: Methods\n  - id: unit-testing\n    title: Unit testing\n",
    "content/pro-track.yaml": "projects:\n  - id: demo\n    hours: 2 to 3\n    practices:\n      - module: methods\n        what: a method\n    checklist:\n      - id: one\n        text: Ran `mvn test`\n      - id: two\n        text: Wrote it\n      - id: three\n        text: All pass\n",
    "pro-track/demo/pom.xml": POM(),
    "pro-track/demo/README.md": README,
    "pro-track/demo/.gitignore": "target/\n",
    "pro-track/demo/.github/workflows/test.yml": WORKFLOW,
    "pro-track/demo/src/main/java/demo/Demo.java": STARTER,
    "pro-track/demo/src/test/java/demo/DemoTest.java": TEST,
    "pro-track-solutions/demo/src/main/java/demo/Demo.java": SOLUTION,
    ...files,
  };
  for (const [f, text] of Object.entries(all)) {
    if (text == null) continue;
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.writeFileSync(path.join(root, f), text);
  }
  return root;
}

// ---------------------------------------------------------------- the zip

test("the zip: the same files give the same bytes, whatever their order, times or permissions", () => {
  const files = [
    { name: "p/b.txt", data: Buffer.from("bee\n".repeat(50)) },
    { name: "p/a.txt", data: Buffer.from("a") },
    { name: "p/src/é.java", data: Buffer.from("class E {}\n") },
  ];
  const one = makeZip(files);
  assert.deepEqual(makeZip([...files].reverse()), one, "the order the files come in doesn't matter");
  assert.deepEqual(makeZip(files), one, "the same again");
  const back = readZip(one);
  assert.deepEqual(back.map((e) => e.name), ["p/a.txt", "p/b.txt", "p/src/é.java"], "sorted by name");
  assert.deepEqual(back.map((e) => e.data.toString()), ["a", "bee\n".repeat(50), "class E {}\n"]);
  assert.ok(back.every((e) => e.time === 0 && e.date === ((2026 - 1980) << 9 | (1 << 5) | 1)), "every file has the same time");
  assert.ok(back.every((e) => e.attributes === 0o100644), "every file is rw-r--r--");
  assert.notDeepEqual(makeZip([{ name: "p/a.txt", data: Buffer.from("b") }]), makeZip([{ name: "p/a.txt", data: Buffer.from("a") }]), "different content, different bytes");
  assert.throws(() => makeZip([files[0], files[0]]), /twice/);
});

test("a project's zip is the same bytes after its files are touched and copied, has every file under <id>/, and leaves junk out", () => {
  const root = repo();
  const first = zipProject(root, "demo");
  // Touch every file (new times, other permissions) and add Maven's and an editor's junk.
  for (const f of ["pom.xml", "README.md", "src/main/java/demo/Demo.java"]) {
    fs.utimesSync(path.join(root, "pro-track/demo", f), new Date(2030, 1, 1), new Date(2030, 1, 1));
    fs.chmodSync(path.join(root, "pro-track/demo", f), 0o600);
  }
  fs.mkdirSync(path.join(root, "pro-track/demo/target/classes"), { recursive: true });
  fs.writeFileSync(path.join(root, "pro-track/demo/target/classes/Demo.class"), "x");
  fs.writeFileSync(path.join(root, "pro-track/demo/.DS_Store"), "x");
  // And the files a run of the program and an editor leave behind (H2's database, a vim swap file).
  for (const f of ["yarnstash.mv.db", "yarnstash.trace.db", "old.lock.db", ".README.md.swp"]) fs.writeFileSync(path.join(root, "pro-track/demo", f), "x");
  assert.deepEqual(zipProject(root, "demo"), first);
  const copy = tmp("pro-track-copy-");
  fs.cpSync(root, copy, { recursive: true });
  assert.deepEqual(zipProject(copy, "demo"), first, "a copy elsewhere zips to the same bytes");
  assert.deepEqual(
    readZip(first).map((e) => e.name),
    ["demo/.github/workflows/test.yml", "demo/.gitignore", "demo/README.md", "demo/pom.xml", "demo/src/main/java/demo/Demo.java", "demo/src/test/java/demo/DemoTest.java"],
  );
  assert.equal(readZip(first).find((e) => e.name === "demo/pom.xml").data.toString(), POM());
});

// ---------------------------------------------------------------- pom.xml, README.md, the folders

test("pom.xml: the made-up project's is right, and each rule catches what it's for", () => {
  assert.deepEqual(pomProblems(POM(), "demo"), []);
  const p = readPom(POM());
  assert.equal(p.dependencies[0].version, PINNED.junit, "a ${property} version is filled in");
  assert.equal(p.version, "1.0", "the project's version, not a dependency's");
  const has = (text, re, id = "demo") => assert.ok(pomProblems(text, id).some((m) => re.test(m)), `${re}: ${pomProblems(text, id).join("; ")}`);
  has(POM(), /artifactId must be the folder's name, other/, "other");
  has(POM({ release: "17" }), /maven.compiler.release must be 21/);
  has(POM({ junit: "5.10.0" }), /must be version 5\.14\.4/);
  has(POM({ junit: "[5.0,6.0)" }), /needs a pinned version/);
  has(POM({ junit: "LATEST" }), /needs a pinned version/);
  has(POM({ surefire: "3.0.0-SNAPSHOT" }), /maven-surefire-plugin needs a pinned version/);
  has(POM({ deps: "<dependency><groupId>com.google.guava</groupId><artifactId>guava</artifactId><version>33.0.0</version></dependency>" }), /guava isn't one the projects use/);
  has(POM({ deps: `<dependency><groupId>com.h2database</groupId><artifactId>h2</artifactId><version>${PINNED.h2}</version><scope>test</scope></dependency>` }), /h2 must have no scope/);
  has(POM({ plugins: "<plugin><artifactId>maven-jar-plugin</artifactId><version>3.4.2</version></plugin>" }), /maven-jar-plugin isn't needed/);
  has(POM({ deps: `<dependency><groupId>org.openjfx</groupId><artifactId>javafx-controls</artifactId><version>${PINNED.openjfx}</version></dependency>` }), /needs the javafx-maven-plugin/);
  has(POM().replace("<build>", "<repositories><repository><id>x</id><url>https://example.com</url></repository></repositories><build>"), /Maven Central/);
  has(POM().replace(/<plugin>\s*<groupId>org.apache.maven.plugins<\/groupId>\s*<artifactId>maven-compiler-plugin[\s\S]*?<\/plugin>/, ""), /needs the plugin maven-compiler-plugin/);
  // A JavaFX project as the rules want it.
  const fx = POM({
    deps: `<dependency><groupId>org.openjfx</groupId><artifactId>javafx-controls</artifactId><version>${PINNED.openjfx}</version></dependency>`,
    plugins: `<plugin><groupId>org.openjfx</groupId><artifactId>javafx-maven-plugin</artifactId><version>${PINNED.javafxPlugin}</version><configuration><mainClass>demo.App</mainClass></configuration></plugin>`,
  });
  assert.deepEqual(pomProblems(fx, "demo"), []);
  assert.ok(isPinned("2.4.240") && !isPinned("2.4.240-SNAPSHOT") && !isPinned("${x}") && !isPinned(null));
});

test("README.md: the sections in order, mvn test, the summary, no dashes", () => {
  assert.deepEqual(readmeProblems(README), []);
  const has = (text, re) => assert.ok(readmeProblems(text).some((m) => re.test(m)), `${re}: ${readmeProblems(text).join("; ")}`);
  has(README.replace("# Demo", "Demo"), /first line must be the title/);
  has(README.replace("## Steps", "## How"), /needs the section "## Steps"/);
  has(README.replace("## What you need\n\nA JDK 21 and Maven.\n\n", "") + "\n## What you need\n\nLate.\n", /must come after/);
  has(README.replace("mvn test", "gradle test"), /mvn test/);
  has(README.replace("A small project", "A small \u2014 project"), /em dash/);
  has(README.replace("A small project to try the rules.", "x ".repeat(300)), /at most 400/);
  // A ## inside a code block isn't a section.
  assert.deepEqual(readmeProblems(README.replace("mvn -q compile", "mvn -q compile\n## not a heading")), []);
});

test("the folders: the made-up project passes, and missing or wrong files are named", () => {
  assert.deepEqual(folderProblems(repo(), "demo"), []);
  assert.deepEqual(layoutProblems(repo()), []);
  const has = (files, re) => {
    const got = folderProblems(repo(files), "demo");
    assert.ok(got.some((m) => re.test(m)), `${re}: ${got.join("; ")}`);
  };
  has({ "pro-track/demo/.gitignore": null }, /needs \.gitignore/);
  has({ "pro-track/demo/.gitignore": "*.class\n" }, /must have the line target\//);
  has({ "pro-track/demo/.github/workflows/test.yml": WORKFLOW.replace('"21"', '"17"') }, /word for word/);
  has({ "pro-track/demo/src/main/java/demo/Demo.java": SOLUTION }, /at least one \/\/ TODO/);
  has({ "pro-track/demo/src/test/java/demo/DemoTest.java": null }, /needs JUnit 5 tests/);
  has({ "pro-track/demo/src/test/java/demo/DemoTest.java": TEST.replace(/org\.junit\.jupiter\.api/g, "org.junit") }, /must use JUnit 5/);
  has({ "pro-track/demo/src/main/java/other/Demo.java": STARTER }, /its package \(demo\) must match its folder/);
  has({ "pro-track/demo/target/classes/demo/Demo.class": "x" }, /built or editor file/);
  has({ "pro-track/demo/.Demo.java.swp": "x" }, /built or editor file/);
  has({ "pro-track/demo/yarnstash.mv.db": "x" }, /yarnstash\.mv\.db is a file the program makes when you run it/);
  has({ "pro-track/demo/yarnstash.trace.db": "x" }, /program makes when you run it/);
  // A Windows checkout (Git's core.autocrlf) gives the workflow CRLF line endings: still the same workflow.
  assert.deepEqual(folderProblems(repo({ "pro-track/demo/.github/workflows/test.yml": WORKFLOW.replace(/\n/g, "\r\n") }), "demo"), []);
  has({ "pro-track/demo/big.txt": "x".repeat(1_000_001) }, /at most 1000000/);
  has({ "pro-track-solutions/demo/src/main/java/demo/Demo.java": STARTER.replace("// TODO: return the answer.\n", "") + "// TODO\n" }, /still has a \/\/ TODO/);
  has({ "pro-track-solutions/demo/src/main/java/demo/Demo.java": STARTER }, /is the same as the starter's/);
  has({ "pro-track-solutions/demo/README.md": "x" }, /only \.java files in src\/main\/java/);
  has({ "pro-track-solutions/demo/src/main/java/demo/Demo.java": null }, /has no files|needs its model solution/);
  assert.deepEqual(layoutProblems(repo({ "pro-track-solutions/ghost/src/main/java/A.java": "class A {}" })), ["pro-track-solutions/ghost: there's no pro-track/ghost/ with a pom.xml"]);
  assert.deepEqual(layoutProblems(repo({ "pro-track/notes/x.md": "x" })), ["pro-track/notes: a project folder needs a pom.xml (only projects go in pro-track/)"]);
});

// ---------------------------------------------------------------- Surefire's reports

test("Surefire's reports: totals over every suite, and the tests that failed or erred", () => {
  const a = `<?xml version="1.0"?><testsuite name="demo.DemoTest" tests="3" failures="1" errors="1" skipped="0">
<testcase name="one" classname="demo.DemoTest" time="0"/>
<testcase name="two" classname="demo.DemoTest" time="0"><failure message="x">boom</failure></testcase>
<testcase name="three" classname="demo.DemoTest" time="0"><error type="java.lang.UnsupportedOperationException"/></testcase>
</testsuite>`;
  const b = `<testsuite xmlns:xsi="x" name="demo.OtherTest" time="0.1" tests="2" errors="0" skipped="1" failures="0"><testcase name="four" classname="demo.OtherTest"><skipped/></testcase><testcase name="five" classname="demo.OtherTest"></testcase></testsuite>`;
  assert.deepEqual(surefireTotals([a, b]), { suites: 2, tests: 5, failures: 1, errors: 1, skipped: 1, failed: ["DemoTest.two", "DemoTest.three"] });
  assert.deepEqual(surefireTotals(["not a report"]), { suites: 0, tests: 0, failures: 0, errors: 0, skipped: 0, failed: [] });
});

// ---------------------------------------------------------------- the site's data

test("the site's data: content/pro-track.yaml with the README's title, summary and sections; relative links go to the folder on GitHub", () => {
  const root = repo();
  const r = readProTrack(root);
  assert.deepEqual(r.problems, []);
  const [p] = r.projects;
  assert.equal(p.title, "Demo");
  assert.equal(p.summary, "A small project to try the rules.");
  assert.deepEqual(p.practices, [{ module: "methods", what: "a method" }]);
  assert.deepEqual(p.checklist.map((c) => c.id), ["one", "two", "three"]);
  assert.equal(p.checklist[0].text, "Ran mvn test");
  assert.equal(p.checklist[0].html, "Ran <code>mvn test</code>");
  assert.match(p.sections.steps, /href="https:\/\/github\.com\/AntonyPerez0\/Java-Arena\/blob\/main\/pro-track\/demo\/src\/test\/java\/demo\/DemoTest\.java"/);
  assert.match(p.sections.tests, /Commands for your own computer/);
  assert.equal(p.zip.file, "pro/demo.zip");
  assert.equal(p.zip.bytes, zipProject(root, "demo").length);
  assert.match(markdownHtml("### Deep\n\n| a |\n|---|\n| b |\n", "demo"), /<h3>Deep<\/h3>[\s\S]*<table tabindex="0">/);
});

test("the site's data: each problem in content/pro-track.yaml is named", () => {
  const yaml = (body) => repo({ "content/pro-track.yaml": `projects:\n${body}` });
  const has = (root, re) => {
    const got = readProTrack(root).problems;
    assert.ok(got.some((m) => re.test(m)), `${re}: ${got.join("; ")}`);
  };
  has(repo({ "content/pro-track.yaml": "projects: []\n" }), /pro-track\/demo\/ isn't listed/);
  has(yaml("  - id: ghost\n    hours: 1 to 2\n"), /no pro-track\/ghost\/ with a pom.xml/);
  has(yaml("  - id: demo\n    hours: two\n    practices: [{ module: methods, what: x }]\n    checklist: [{ id: a, text: a }, { id: b, text: b }, { id: c, text: c }]\n"), /needs hours/);
  has(yaml("  - id: demo\n    hours: 1 to 2\n    practices: [{ module: nope, what: x }]\n    checklist: [{ id: a, text: a }, { id: b, text: b }, { id: c, text: c }]\n"), /"nope" isn't a module id/);
  has(yaml("  - id: demo\n    hours: 1 to 2\n    practices: [{ module: methods, what: x }]\n    checklist: [{ id: a, text: a }, { id: a, text: b }, { id: c, text: c }]\n"), /the id a is used twice/);
  has(yaml("  - id: demo\n    hours: 1 to 2\n    practices: [{ module: methods, what: x }]\n    checklist: [{ id: a, text: a }]\n"), /needs a checklist of 3 to 15 items/);
  has(yaml("  - id: demo\n    title: Demo\n    hours: 1 to 2\n"), /unknown key "title"/);  has(yaml("  - id: demo\n    hours: 1 to 2\n    practices: [{ module: methods, what: x }]\n    checklist: [{ id: a, text: \"see [below](#below)\" }, { id: b, text: b }, { id: c, text: c }]\n"), /the link #below .*has no target on the project's page/);
});

test("the project's links, the same in its README's sections, its summary and its checklist: files to GitHub, images to their raw files, the shown sections' anchors to the page's", () => {
  const blob = "https://github.com/AntonyPerez0/Java-Arena/blob/main/pro-track/demo/";
  const raw = "https://raw.githubusercontent.com/AntonyPerez0/Java-Arena/main/pro-track/demo/";
  // The summary and a checklist item go through inlineHtml.
  assert.equal(inlineHtml("Start in [Main](src/main/java/demo/Main.java).", "demo"), `Start in <a href="${blob}src/main/java/demo/Main.java">Main</a>.`);
  assert.equal(inlineHtml("The [tests](./src/test/java/demo/DemoTest.java) pass", "demo"), `The <a href="${blob}src/test/java/demo/DemoTest.java">tests</a> pass`);
  assert.match(inlineHtml("![A finished game](docs/game.png)", "demo"), new RegExp(`<img src="${raw}docs/game\\.png" alt="A finished game">`));
  assert.match(markdownHtml("![Shot](shot.png)\n\nSee [the file][f].\n\n[f]: pom.xml\n", "demo"), new RegExp(`src="${raw}shot\\.png"[\\s\\S]*href="${blob}pom\\.xml"`));
  // Full addresses and the shown sections' anchors (GitHub's slugs) stay usable; other anchors are dead.
  const dead = [];
  const html = markdownHtml("[a](https://openjfx.io/) [b](#steps) [c](#put-it-on-github-optional) [d](#what-youll-build) [e](#somewhere-else)", "demo", 3, dead);
  assert.match(html, /href="https:\/\/openjfx\.io\/"/);
  assert.match(html, /href="#pro-steps-h"[\s\S]*href="#pro-github-h"[\s\S]*href="#pro-build-h"/);
  assert.deepEqual(dead, ["#somewhere-else"]);
  const deadInline = [];
  inlineHtml("[x](#steps) [y](#nope)", "demo", deadInline);
  assert.deepEqual(deadInline, ["#nope"]);
  assert.equal(plainText("A ![picture](a.png) game, see [the steps](#steps)."), "A game, see the steps.");
  // Command-line options don't break at their hyphens on a phone.
  assert.equal(inlineHtml("`--min-length N`, `-h, --help` and `a-b`", "demo"), '<code><span class="nw">--min-length</span> N</code>, <code><span class="nw">-h</span>, <span class="nw">--help</span></code> and <code>a-b</code>');
});

// ---------------------------------------------------------------- the real Pro Track

test("the repository's Pro Track (whatever pro-track/ has): every folder follows the rules, content/pro-track.yaml lists them, and nothing offers the solutions for download", () => {
  assert.deepEqual(layoutProblems(ROOT), []);
  for (const id of projectIds(ROOT)) assert.deepEqual(folderProblems(ROOT, id), [], id);
  const r = readProTrack(ROOT);
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.projects.map((p) => p.id).sort(), projectIds(ROOT));
  for (const p of r.projects) assert.ok(readZip(zipProject(ROOT, p.id)).every((e) => e.name.startsWith(`${p.id}/`)), p.id);
  for (const f of ["scripts/pro-track/vite-plugin.mjs", "src/pages/ProProject.tsx", "src/pages/ProTrack.tsx", "src/lib/pro-guide.ts"]) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.doesNotMatch(text.replace(/^\s*(\/\/|\*).*$/gm, ""), /pro-track-solutions/, `${f} must not offer the model solutions`);
    assert.doesNotMatch(text, /[\u2013\u2014]/, `${f} has an en or em dash`);
  }  // Git keeps the projects' line endings as they are (LF), so the zips and the workflow check match on Windows too.
  const attrs = fs.readFileSync(path.join(ROOT, ".gitattributes"), "utf8");
  for (const line of ["pro-track/** text eol=lf", "pro-track-solutions/** text eol=lf"]) assert.ok(attrs.split("\n").includes(line), `.gitattributes needs: ${line}`);
  // A new repository is empty, and an empty repository's page has no Add file menu: its link is "uploading an existing file".
  for (const f of [...projectIds(ROOT).map((id) => `pro-track/${id}/README.md`), "src/lib/pro-guide.ts"]) {
    const text = fs.readFileSync(path.join(ROOT, f), "utf8");
    assert.match(text, /new repository's page, choose (\*\*|<strong>)uploading an existing file/, `${f}: the browser route starts from the new, empty repository`);
    assert.doesNotMatch(text, /repository's page, choose (\*\*|<strong>)Add file/, `${f}: an empty repository has no Add file menu`);
  }
});
