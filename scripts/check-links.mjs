// The link check: every internal link in the built site resolves, and every external link goes to a
// host on the list below.
//
//   Internal: each href and src in the pre-rendered pages (dist/**/*.html), the sitemap, the web app
//   manifest, and the links in the lesson files (dist/lessons/**/*.json) must name a file of dist
//   (an address ending in / names its index.html), and a #fragment must name an id on that page. A
//   link to this repository's files on GitHub (.../blob/main/<path> or .../tree/main/<path>) must name
//   a file or folder that is in the repository.
//   External: links in the built pages, the lesson files, content/**/*.yaml and the Pro Track's
//   README files go only to ALLOWED_HOSTS (never a link shortener).
//
// Usage: npm run build && node scripts/check-links.mjs   (BASE_PATH as for the build; the site's own
// address is read from the home page's canonical link). Exits with 1 and lists every bad link.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Hosts that links may go to (a host's subdomains too). */
export const ALLOWED_HOSTS = [
  // The course this site follows, and the site's own pages.
  'java-programming.mooc.fi',
  'mooc.fi',
  'javaarena.com',
  'antonyperez0.github.io',
  // Java itself.
  'docs.oracle.com',
  'openjdk.org',
  'dev.java',
  'adoptium.net',
  'openjfx.io',
  'gluonhq.com',
  // Tools the Pro Track and module 54 use.
  'maven.apache.org',
  'central.sonatype.com',
  'search.maven.org',
  'mvnrepository.com',
  'junit.org',
  'h2database.com',
  'github.com',
  'docs.github.com',
  'cli.github.com',
  'desktop.github.com',
  'git-scm.com',
  // Licenses and credits.
  'creativecommons.org',
  'opensource.org',
  'www.gnu.org',
];

/** Link shorteners: they hide where a link goes, so they're refused even if a host above matched. */
export const SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'ow.ly', 'is.gd', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'shorturl.at', 'tiny.cc', 'rb.gy', 'lnkd.in', 'youtu.be'];

/** Whether an external address may be linked to: https (http only for xml namespaces, never linked), a host on the list. */
export function externalProblem(href) {
  let u;
  try {
    u = new URL(href);
  } catch {
    return `not an address: ${href}`;
  }
  const host = u.hostname.toLowerCase();
  if (SHORTENERS.some((s) => host === s || host.endsWith(`.${s}`))) return `a link shortener: ${href}`;
  if (u.protocol !== 'https:') return `not https: ${href}`;
  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return `a host not on the list in scripts/check-links.mjs: ${href}`;
  return null;
}

const unescape = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

/** The href and src values of an HTML page's elements (not of text that shows code). */
export function htmlLinks(html) {
  const out = [];
  // Comments and scripts' bodies hold no links of the page.
  const body = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (m) => m.slice(0, m.indexOf('>') + 1));
  for (const m of body.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
    for (const a of m[2].matchAll(/\s(href|src|srcset|xlink:href)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      const value = unescape(a[3] ?? a[4]);
      if (a[1] === 'srcset') for (const part of value.split(',')) out.push({ tag: m[1].toLowerCase(), href: part.trim().split(/\s+/)[0] });
      else out.push({ tag: m[1].toLowerCase(), href: value });
    }
  }
  return out.filter((l) => l.href !== '');
}

/** The ids on a page, for #fragments. */
export function htmlIds(html) {
  return new Set([...html.matchAll(/\sid\s*=\s*("([^"]*)"|'([^']*)')/g)].map((m) => unescape(m[2] ?? m[3])));
}

/**
 * The links in markdown as it is shown: [text](address), <address> and bare addresses (marked links
 * those too), outside code blocks and inline code, which show code and are never links.
 */
export function markdownLinks(text) {
  const prose = text
    .replace(/^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?(\n {0,3}\1[^\n]*|(?![\s\S]))/gm, '')
    .replace(/(`+)[\s\S]*?\1/g, '');
  const out = [];
  for (const m of prose.matchAll(/\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g)) out.push(m[1]);
  const rest = prose.replace(/\]\(\s*<?([^\s)>]+)>?(?:\s+"[^"]*")?\s*\)/g, '](');
  for (const m of rest.matchAll(/\bhttps?:\/\/[^\s<>()"'`\]]+/g)) out.push(m[0].replace(/[.,;:!?]+$/, ''));
  for (const m of rest.matchAll(/\bhref\s*=\s*"([^"]+)"/g)) out.push(m[1]);
  return out;
}

/** The fields of lesson, project and content files that are shown as markdown (the rest is code, input, expected output or data). */
export const MARKDOWN_FIELDS = new Set(['text', 'task', 'hints', 'intro', 'summary', 'after', 'message', 'about', 'description', 'explanation', 'why', 'question', 'note']);

/** Every markdown string inside a JSON or YAML value (a string under one of MARKDOWN_FIELDS, at any depth). */
export function markdownStrings(value, key = '', out = []) {
  if (typeof value === 'string') {
    if (MARKDOWN_FIELDS.has(key)) out.push(value);
  } else if (Array.isArray(value)) for (const v of value) markdownStrings(v, key, out);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) markdownStrings(v, k, out);
  return out;
}

/**
 * Where an internal address leads in dist: { file, fragment } or { outside } when it isn't under
 * the site's base path. `from` is the address of the page the link is on (for relative links).
 */
export function resolveInternal(href, from, base) {
  const u = new URL(href, `http://site${from}`);
  if (!u.pathname.startsWith(base)) return { outside: u.pathname };
  let path = decodeURIComponent(u.pathname.slice(base.length));
  if (path === '' || path.endsWith('/')) path += 'index.html';
  return { file: path, fragment: u.hash ? decodeURIComponent(u.hash.slice(1)) : '' };
}

/** Whether an address is external (has its own scheme and host) and isn't one that needs no check. */
const kindOf = (href) => {
  if (/^(data|mailto|tel|blob):/i.test(href)) return 'skip';
  if (/^javascript:/i.test(href)) return 'script';
  if (/^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//')) return 'external';
  return 'internal';
};

function walk(dir, keep, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

/** Checks the built site in `dist` and the sources in `root`; returns the problems, one line each, and what was counted. */
export async function checkLinks({ root, dist, base }) {
  const problems = [];
  const counts = { pages: 0, internal: 0, external: 0, repo: 0, contentFiles: 0 };
  const home = readFileSync(join(dist, 'index.html'), 'utf8');
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(home)?.[1];
  if (!canonical) problems.push('index.html: no canonical link, so the site\'s own address is unknown');
  const siteUrl = canonical ? new URL(canonical) : null;
  const repoUrl = /\bhref="(https:\/\/github\.com\/[^/"]+\/[^/"]+)"/.exec(home)?.[1];

  const idCache = new Map();
  const idsOf = (file) => {
    if (!idCache.has(file)) idCache.set(file, htmlIds(readFileSync(join(dist, file), 'utf8')));
    return idCache.get(file);
  };
  const fileExists = (file) => {
    const full = join(dist, file);
    return existsSync(full) && statSync(full).isFile();
  };

  const checkInternal = (where, href, from) => {
    counts.internal++;
    const r = resolveInternal(href, from, base);
    if (r.outside) return problems.push(`${where}: ${href} is outside the site (${base})`);
    if (!fileExists(r.file)) {
      // An address without its last slash works on GitHub Pages only through a redirect: say so.
      const hint = fileExists(`${r.file}/index.html`) ? ' (add the / at the end)' : '';
      return problems.push(`${where}: ${href} leads to no file${hint}`);
    }
    if (r.fragment && r.file.endsWith('.html') && !idsOf(r.file).has(r.fragment)) problems.push(`${where}: ${href}: no id "${r.fragment}" on ${r.file}`);
  };
  const checkExternal = (where, href) => {
    counts.external++;
    const problem = externalProblem(href);
    if (problem) return problems.push(`${where}: ${problem}`);
    // This repository's own files: the path must be in the repository.
    if (repoUrl && href.startsWith(`${repoUrl}/`)) {
      const m = /^\/(?:blob|tree)\/main\/([^?#]+)/.exec(href.slice(repoUrl.length));
      if (m) {
        counts.repo++;
        if (!existsSync(join(root, decodeURIComponent(m[1])))) problems.push(`${where}: ${href} names ${m[1]}, which isn't in the repository`);
      }
    }
  };
  const checkAny = (where, href, from) => {
    const kind = kindOf(href);
    if (kind === 'skip') return;
    if (kind === 'script') return problems.push(`${where}: a javascript: link`);
    if (kind === 'external') {
      // The site's own address (canonical links, links that name the live site) is checked as internal.
      if (siteUrl && href.startsWith(siteUrl.origin + base)) return checkInternal(where, href.slice(siteUrl.origin.length), from);
      return checkExternal(where, href);
    }
    checkInternal(where, href, from);
  };

  // The pre-rendered pages.
  for (const full of walk(dist, (f) => f.endsWith('.html')).filter((f) => !relative(dist, f).startsWith('engine/'))) {
    const file = relative(dist, full).split('\\').join('/');
    const from = base + file.replace(/(^|\/)index\.html$/, '$1');
    counts.pages++;
    for (const { href } of htmlLinks(readFileSync(full, 'utf8'))) checkAny(file, href, from);
  }
  // The sitemap and the manifest.
  const sitemap = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
  for (const m of sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)) checkAny('sitemap.xml', m[1], base);
  const manifest = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8'));
  for (const href of [manifest.start_url, manifest.scope, ...(manifest.icons ?? []).map((i) => i.src)].filter(Boolean)) checkAny('manifest.webmanifest', href, base);
  // The lesson files: links in their markdown.
  for (const full of walk(join(dist, 'lessons'), (f) => f.endsWith('.json'))) {
    const file = relative(dist, full).split('\\').join('/');
    for (const s of markdownStrings(JSON.parse(readFileSync(full, 'utf8')))) for (const href of markdownLinks(s)) checkAny(file, href, `${base}learn/`);
  }
  // The sources: content and the Pro Track's README files (external links only: their internal ones are in the built pages).
  const { parse } = await import('yaml');
  const sources = [
    ...walk(join(root, 'content'), (f) => f.endsWith('.yaml')).map((f) => [f, (t) => markdownStrings(parse(t))]),
    ...(existsSync(join(root, 'pro-track')) ? walk(join(root, 'pro-track'), (f) => f.endsWith('.md')) : []).map((f) => [f, (t) => [t]]),
  ];
  for (const [full, read] of sources) {
    counts.contentFiles++;
    const file = relative(root, full).split('\\').join('/');
    for (const s of read(readFileSync(full, 'utf8')))
      for (const href of markdownLinks(s)) if (kindOf(href) === 'external') checkAny(file, href, base);
  }
  return { problems: [...new Set(problems)], counts };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = new URL('..', import.meta.url).pathname;
  const base = process.env.BASE_PATH ?? '/';
  const { problems, counts } = await checkLinks({ root, dist: join(root, 'dist'), base });
  console.log(`check-links: ${counts.pages} pages, ${counts.internal} internal links, ${counts.external} external links (${counts.repo} to this repository's files), ${counts.contentFiles} content files`);
  if (problems.length) {
    console.log(`${problems.length} bad links:\n  ${problems.slice(0, 200).join('\n  ')}${problems.length > 200 ? `\n  and ${problems.length - 200} more` : ''}`);
    process.exit(1);
  }
  console.log('check-links: every link resolves, and every external one goes to an allowed host');
}
