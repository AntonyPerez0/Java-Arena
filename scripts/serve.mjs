// A static server for dist/ that behaves like GitHub Pages: files under BASE_PATH, no special headers.
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.webmanifest': 'application/manifest+json',
  '.gz': 'application/gzip',
  '.zip': 'application/zip',
  '.bin': 'application/octet-stream',
  '.woff2': 'font/woff2',
};

export function serve({ dir = new URL('../dist', import.meta.url).pathname, base = process.env.BASE_PATH ?? '/', port = 0, onRequest } = {}) {
  const server = createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    onRequest?.(url.pathname);
    if (!url.pathname.startsWith(base)) {
      res.writeHead(404).end('not found');
      return;
    }
    let file = normalize(join(dir, decodeURIComponent(url.pathname.slice(base.length))));
    if (!file.startsWith(dir)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      const notFound = join(dir, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] }).end(existsSync(notFound) ? readFileSync(notFound) : 'not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}${base}` })));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await serve({ port: Number(process.env.PORT ?? 4173) });
  console.log(`Serving dist at ${url}`);
}
