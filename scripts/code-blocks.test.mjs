// Tests of src/components/code-blocks.ts: the kinds of code block lesson text may have (the content
// build rejects any other), and the blocks that are shown only, never run: ```xml (with its file's
// name: ```xml pom.xml) and ```shell. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { blockKindProblem, readOnlyBlockHtml, xmlHighlightHtml } from "../src/components/code-blocks.ts";

const textOf = (html) => html.replace(/<[^>]*>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

test("the kinds of code block a lesson may have, and the ones it may not", () => {
  for (const ok of ["", "java run", "java fragment", "java window", "output", "input", "javac", "crash", "events", "classes", "text", "xml", "xml pom.xml", "shell", "file data.txt", "asset landscape.png"]) assert.equal(blockKindProblem(ok), null, ok);
  for (const bad of ["bash", "sh", "python", "XML", "console", "javascript", "sql", "shell pom.xml", "text x"]) assert.match(blockKindProblem(bad) ?? "", /isn't one lessons use/, bad);
  assert.match(blockKindProblem("xml notes.txt"), /an xml block may name its file, such as ```xml pom\.xml/);
});

test("an xml block is highlighted, keeps its text exactly, and shows its file's name", () => {
  const pom = '<?xml version="1.0" encoding="UTF-8"?>\n<!-- the project -->\n<project xmlns="http://maven.apache.org/POM/4.0.0">\n    <dependency>\n        <groupId>com.h2database</groupId>\n        <version>2.2.224</version>\n    </dependency>\n    <empty a=\'1\'/>\n    <![CDATA[ x < y ]]>\n</project>\n';
  const html = xmlHighlightHtml(pom);
  assert.equal(textOf(html), pom);
  assert.ok(html.includes('<span class="tk-pre">&lt;?xml version="1.0" encoding="UTF-8"?&gt;</span>'));
  assert.ok(html.includes('<span class="tk-com">&lt;!-- the project --&gt;</span>'));
  assert.ok(html.includes('&lt;<span class="tk-kw">project</span> <span class="tk-fn">xmlns</span>=<span class="tk-str">"http://maven.apache.org/POM/4.0.0"</span>&gt;'));
  assert.ok(html.includes('&lt;/<span class="tk-kw">groupId</span>&gt;'));
  assert.ok(html.includes('<span class="tk-fn">a</span>=<span class="tk-str">\'1\'</span>/&gt;'));
  // Text that only looks like a tag stays text; nothing in it is HTML.
  assert.equal(xmlHighlightHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
  const named = readOnlyBlockHtml("xml pom.xml", pom);
  assert.match(named, /^<figure class="code-file"><figcaption>pom\.xml<\/figcaption><pre class="code-xml"><code>/);
  assert.equal(textOf(named.replace(/<figcaption>.*?<\/figcaption>/, "")).trim(), pom.trim());
  assert.match(readOnlyBlockHtml("xml", "<a/>\n"), /^<pre class="code-xml"><code>&lt;<span class="tk-kw">a<\/span>\/&gt;<\/code><\/pre>/);
});

test("a shell block is commands for your own computer, as text; other kinds are left to Markdown", () => {
  const html = readOnlyBlockHtml("shell", "mvn package\njava -jar target/app.jar <in.txt\n");
  assert.equal(html, '<figure class="io io-shell"><figcaption>Commands for your own computer</figcaption><pre><code>mvn package\njava -jar target/app.jar &lt;in.txt</code></pre></figure>\n');
  for (const other of [undefined, "", "text", "java", "output", "file a.txt"]) assert.equal(readOnlyBlockHtml(other, "x"), null, String(other));
});
