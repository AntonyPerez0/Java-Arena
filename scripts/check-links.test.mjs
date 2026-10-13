// Tests of the link check (scripts/check-links.mjs). No build output is read: each test writes a tiny
// site of its own in a temporary folder. Run: npm run test:unit
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkLinks, externalProblem, htmlLinks, markdownLinks, markdownStrings, resolveInternal } from './check-links.mjs';

const BASE = '/Java-Arena/';
const page = (body, extra = '') => `<!doctype html><html><head><link rel="canonical" href="https://antonyperez0.github.io/Java-Arena/${extra}"></head><body><a href="https://github.com/AntonyPerez0/Java-Arena">Source</a>${body}</body></html>`;

/** A site in a temporary folder: { 'dist/index.html': '...', 'content/x.yaml': '...' }; returns the check's problems. */
async function site(files) {
  const root = mkdtempSync(join(tmpdir(), 'links-'));
  try {
    const all = {
      'dist/sitemap.xml': '<urlset><url><loc>https://antonyperez0.github.io/Java-Arena/</loc></url></urlset>',
      'dist/manifest.webmanifest': JSON.stringify({ start_url: BASE, icons: [{ src: `${BASE}icon.png` }] }),
      'dist/icon.png': 'x',
      'dist/lessons/a/one.json': JSON.stringify({ text: 'Nothing linked.' }),
      'content/modules/a.yaml': 'text: plain\n',
      ...files,
    };
    for (const [path, text] of Object.entries(all)) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), text);
    }
    return (await checkLinks({ root, dist: join(root, 'dist'), base: BASE })).problems;
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('a site whose links all resolve passes', async () => {
  const problems = await site({
    'dist/index.html': page(`<a href="${BASE}learn/">Learn</a><a href="learn/#top">Top</a><a href="#main">Skip</a><main id="main"></main><img src="${BASE}icon.png" alt="">`),
    'dist/learn/index.html': page('<h1 id="top">Learn</h1><a href="../">Home</a>', 'learn/'),
  });
  assert.deepEqual(problems, []);
});

test('a link to a page or file that is not there fails, and a missing last slash is pointed out', async () => {
  const problems = await site({
    'dist/index.html': page(`<a href="${BASE}learn/nowhere/">x</a><a href="${BASE}learn">y</a><img src="${BASE}gone.png" alt="">`),
    'dist/learn/index.html': page('', 'learn/'),
  });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /learn\/nowhere\/ leads to no file/);
  assert.match(problems[1], /\/Java-Arena\/learn leads to no file \(add the \/ at the end\)/);
  assert.match(problems[2], /gone\.png leads to no file/);
});

test('a #fragment must name an id on the page; an address outside the base path fails', async () => {
  const problems = await site({ 'dist/index.html': page('<a href="#nothing">x</a><a href="/elsewhere/">y</a>') });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /no id "nothing"/);
  assert.match(problems[1], /outside the site/);
});

test("the site's own address is checked as an internal link; this repository's file links must name files in it", async () => {
  const problems = await site({
    'dist/index.html': page('<a href="https://antonyperez0.github.io/Java-Arena/gone/">x</a><a href="https://github.com/AntonyPerez0/Java-Arena/blob/main/content/modules/a.yaml">ok</a><a href="https://github.com/AntonyPerez0/Java-Arena/tree/main/pro-track/nothing">bad</a>'),
  });
  assert.equal(problems.length, 2);
  assert.match(problems[0], /gone\/ leads to no file/);
  assert.match(problems[1], /pro-track\/nothing, which isn't in the repository/);
});

test('external links: hosts on the list pass, others and link shorteners fail, in pages, lessons and content', async () => {
  const problems = await site({
    'dist/index.html': page('<a href="https://docs.oracle.com/en/java/javase/21/">ok</a><a href="https://example.com/">bad</a>'),
    'dist/lessons/a/one.json': JSON.stringify({ text: 'See [the MOOC](https://java-programming.mooc.fi/part-1) and https://bit.ly/abc.', seed: 'String u = "https://example.org/";' }),
    'content/modules/a.yaml': 'steps:\n  - text: "Read [this](http://openjdk.org/jeps/1)."\n',
  });
  assert.equal(problems.length, 3);
  assert.match(problems[0], /index\.html: a host not on the list.*example\.com/);
  assert.match(problems[1], /one\.json: a link shortener: https:\/\/bit\.ly\/abc/);
  assert.match(problems[2], /a\.yaml: not https: http:\/\/openjdk\.org/);
});

test('markdown links: code blocks and inline code are not links; bare addresses and [text](address) are', () => {
  const md = 'A [link](https://a.mooc.fi/x "title") and https://github.com/x.\n\n```xml\n<project xmlns="http://maven.apache.org/POM/4.0.0"/>\n```\n\nAlso `list[i](x)` and <https://openjfx.io>.';
  assert.deepEqual(markdownLinks(md), ['https://a.mooc.fi/x', 'https://github.com/x', 'https://openjfx.io']);
  // A code block left open runs to the end of the text.
  assert.deepEqual(markdownLinks('Text.\n\n```java\nString s = "http://x.org";\n'), []);
  assert.deepEqual(markdownStrings({ text: 'a', seed: 'b', more: [{ task: 'c', hints: ['d'], solution: 'e' }] }), ['a', 'c', 'd']);
});

test('pieces: attributes of pages, resolving relative addresses, the host list', () => {
  assert.deepEqual(htmlLinks('<a href="/x/?a=1&amp;b=2">x</a><script src="/s.js">var a = "<a href=\\"/no/\\">";</script><!-- <a href="/c/"> -->'), [
    { tag: 'a', href: '/x/?a=1&b=2' },
    { tag: 'script', href: '/s.js' },
  ]);
  assert.deepEqual(resolveInternal('../b/#c', '/J/learn/a/', '/J/'), { file: 'learn/b/index.html', fragment: 'c' });
  assert.deepEqual(resolveInternal('x.zip?v=1', '/J/pro/', '/J/'), { file: 'pro/x.zip', fragment: '' });
  assert.equal(externalProblem('https://docs.github.com/en'), null);
  assert.equal(externalProblem('https://repo1.maven.apache.org/maven2/'), null);
  assert.match(externalProblem('https://github.com.evil.example/'), /not on the list/);
});
