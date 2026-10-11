// Canvases and images in the drawing of a JavaFX program's windows (see window-drawing.ts). Java
// Arena's practice version of JavaFX doesn't rasterize: it records each drawing call on a canvas
// with the state it used (src/grader/window.ts, DrawCall), and gives an image view's pixels as RGBA
// bytes. The page replays the calls on an HTML canvas (paintCalls: the task card, the results and
// the window panel), and as SVG in HTML that can't run code (canvasSvg: lesson text and the
// pre-rendered pages); an image view's pixels become a PNG (pngDataUrl), drawn with its pixels kept
// crisp. Both replays draw the same: JavaFX's defaults (square line caps, miter joins, text on its
// baseline from its left end, the nonzero fill rule), a rectangle or oval with a negative size not
// at all, and clearRect making the pixels transparent again.
//
// Node runs this file as it is (scripts/prerender.mjs, the unit tests): types only, nothing that
// needs compiling.
import { KEPT_CALLS, type DrawCall, type WindowNumber } from "../grader/window.ts";

// ------------------------------------------------------------------ fonts

/** JavaFX's logical families as CSS families; another family is asked for by name, with the system font after it. */
export const SYSTEM_FONT = 'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const FAMILIES: Record<string, string> = {
  system: SYSTEM_FONT,
  serif: 'Georgia, "Times New Roman", serif',
  sansserif: 'Arial, "Helvetica Neue", sans-serif',
  monospaced: 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
  monospace: 'ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
};

/** A JavaFX font family as a CSS font-family (undefined: one CSS can't take, so the default stays). */
export function cssFamily(family: string | null | undefined): string | undefined {
  if (!family) return undefined;
  const known = FAMILIES[family.toLowerCase().replace(/[\s_-]/g, "")];
  if (known) return known;
  // A family's name goes into CSS only when it is plain letters, digits and spaces.
  return /^[A-Za-z0-9 ]{1,60}$/.test(family) ? `"${family}", ${SYSTEM_FONT}` : undefined;
}

// ------------------------------------------------------------------ the calls

/** A number of a call: finite, else null (the JSON writes NaN and the infinities as strings). */
const finite = (v: WindowNumber | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** All the numbers, or null when one isn't a finite number (such a call draws nothing). */
function numbers(list: WindowNumber[] | undefined, count?: number): number[] | null {
  if (!list || (count != null && list.length < count)) return null;
  const out: number[] = [];
  for (const v of list) {
    const n = finite(v);
    if (n == null) return null;
    out.push(n);
  }
  return out;
}

/** A color of the JSON (#rrggbb or #rrggbbaa), or black when it isn't one. */
const color = (c: string | undefined) => (c && /^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(c) ? c : "#000000");

/** A call's line width: positive and finite, else JavaFX's default 1. */
const lineWidth = (c: DrawCall) => {
  const w = finite(c.lineWidth);
  return w != null && w > 0 ? Math.min(w, 1000) : 1;
};

/** A text call's font: its size (JavaFX's default 13) and CSS family. */
function fontOf(c: DrawCall): { size: number; family: string; bold: boolean; italic: boolean } {
  const s = finite(c.font?.size);
  const style = typeof c.font?.style === "string" ? c.font.style : "";
  return { size: s != null && s > 0 ? Math.min(s, 500) : 13, family: cssFamily(c.font?.family) ?? SYSTEM_FONT, bold: /\bBold\b/.test(style), italic: /\bItalic\b/.test(style) };
}

/** The polygon of fillPolygon and strokePolygon: its points, or null. */
function polygon(c: DrawCall): [number, number][] | null {
  const xs = numbers(c.xs);
  const ys = numbers(c.ys);
  if (!xs || !ys) return null;
  const n = Math.min(xs.length, ys.length);
  return n ? xs.slice(0, n).map((x, i) => [x, ys[i]] as [number, number]) : null;
}

/** A text's lines: JavaFX draws the text after a line break on the next line, about 1.2 font sizes lower. */
const textLines = (text: string) => text.split(/\r\n|\r|\n/);
const LINE = 1.2;

/** The calls a canvas draws, at most (the library keeps no more). */
const MAX_CALLS = KEPT_CALLS;

/**
 * Replays a canvas's calls on an HTML canvas's 2D context (already scaled to CSS pixels). The
 * canvas starts transparent, as JavaFX's does.
 */
export function paintCalls(ctx: CanvasRenderingContext2D, calls: DrawCall[]): void {
  ctx.lineCap = "square";
  ctx.lineJoin = "miter";
  ctx.miterLimit = 10;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const c of calls.slice(0, MAX_CALLS)) {
    const stroke = () => {
      ctx.strokeStyle = color(c.stroke);
      ctx.lineWidth = lineWidth(c);
      ctx.stroke();
    };
    switch (c.op) {
      case "fillRect":
      case "strokeRect":
      case "clearRect":
      case "fillOval":
      case "strokeOval": {
        const a = numbers(c.args, 4);
        if (!a) break;
        const [x, y, w, h] = a;
        if (c.op === "clearRect") {
          if (w > 0 && h > 0) ctx.clearRect(x, y, w, h);
          break;
        }
        if (w < 0 || h < 0) break;
        ctx.beginPath();
        if (c.op.endsWith("Rect")) ctx.rect(x, y, w, h);
        else ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        if (c.op.startsWith("fill")) {
          ctx.fillStyle = color(c.fill);
          ctx.fill();
        } else stroke();
        break;
      }
      case "strokeLine": {
        const a = numbers(c.args, 4);
        if (!a) break;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(a[2], a[3]);
        stroke();
        break;
      }
      case "fillText":
      case "strokeText": {
        const a = numbers(c.args, 2);
        if (!a || c.text == null) break;
        const f = fontOf(c);
        ctx.font = `${f.italic ? "italic " : ""}${f.bold ? "bold " : ""}${f.size}px ${f.family}`;
        textLines(c.text).forEach((t, i) => {
          const y = a[1] + i * f.size * LINE;
          if (c.op === "fillText") {
            ctx.fillStyle = color(c.fill);
            ctx.fillText(t, a[0], y);
          } else {
            ctx.strokeStyle = color(c.stroke);
            ctx.lineWidth = lineWidth(c);
            ctx.strokeText(t, a[0], y);
          }
        });
        break;
      }
      case "fillPolygon":
      case "strokePolygon": {
        const p = polygon(c);
        if (!p) break;
        ctx.beginPath();
        p.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.closePath();
        if (c.op === "fillPolygon") {
          ctx.fillStyle = color(c.fill);
          ctx.fill();
        } else stroke();
        break;
      }
    }
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
/** A number for SVG: at most 3 decimals. */
const n3 = (v: number) => String(Math.round(v * 1000) / 1000);

/** Numbers masks apart on a page (several canvases can be drawn on one). */
let masks = 0;

/**
 * A canvas's calls as SVG of its size (for HTML that can't run code). clearRect makes what was
 * drawn before it transparent there: what came before is masked (a clear of the whole canvas just
 * forgets it).
 */
export function canvasSvg(calls: DrawCall[], width: number, height: number): string {
  let body = "";
  let defs = "";
  const strokeAttrs = (c: DrawCall) => `fill="none" stroke="${color(c.stroke)}" stroke-width="${n3(lineWidth(c))}"`;
  for (const c of calls.slice(0, MAX_CALLS)) {
    switch (c.op) {
      case "clearRect": {
        const a = numbers(c.args, 4);
        if (!a || a[2] <= 0 || a[3] <= 0 || !body) break;
        const [x, y, w, h] = a;
        if (x <= 0 && y <= 0 && x + w >= width && y + h >= height) {
          body = "";
          break;
        }
        const id = `fx-clear-${++masks}`;
        defs += `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${n3(width)}" height="${n3(height)}"><rect width="${n3(width)}" height="${n3(height)}" fill="#fff"/><rect x="${n3(x)}" y="${n3(y)}" width="${n3(w)}" height="${n3(h)}" fill="#000"/></mask>`;
        body = `<g mask="url(#${id})">${body}</g>`;
        break;
      }
      case "fillRect":
      case "strokeRect":
      case "fillOval":
      case "strokeOval": {
        const a = numbers(c.args, 4);
        if (!a || a[2] < 0 || a[3] < 0) break;
        const [x, y, w, h] = a;
        const paint = c.op.startsWith("fill") ? `fill="${color(c.fill)}"` : strokeAttrs(c);
        body += c.op.endsWith("Rect") ? `<rect x="${n3(x)}" y="${n3(y)}" width="${n3(w)}" height="${n3(h)}" ${paint}/>` : `<ellipse cx="${n3(x + w / 2)}" cy="${n3(y + h / 2)}" rx="${n3(w / 2)}" ry="${n3(h / 2)}" ${paint}/>`;
        break;
      }
      case "strokeLine": {
        const a = numbers(c.args, 4);
        if (a) body += `<line x1="${n3(a[0])}" y1="${n3(a[1])}" x2="${n3(a[2])}" y2="${n3(a[3])}" ${strokeAttrs(c)}/>`;
        break;
      }
      case "fillText":
      case "strokeText": {
        const a = numbers(c.args, 2);
        if (!a || c.text == null) break;
        const f = fontOf(c);
        const paint = c.op === "fillText" ? `fill="${color(c.fill)}"` : strokeAttrs(c);
        body += textLines(c.text)
          .map((t, i) => `<text x="${n3(a[0])}" y="${n3(a[1] + i * f.size * LINE)}" font-size="${n3(f.size)}" font-family="${esc(f.family)}"${f.bold ? ' font-weight="bold"' : ""}${f.italic ? ' font-style="italic"' : ""} ${paint}>${esc(t)}</text>`)
          .join("");
        break;
      }
      case "fillPolygon":
      case "strokePolygon": {
        const p = polygon(c);
        if (p) body += `<polygon points="${p.map(([x, y]) => `${n3(x)},${n3(y)}`).join(" ")}" ${c.op === "fillPolygon" ? `fill="${color(c.fill)}"` : strokeAttrs(c)}/>`;
        break;
      }
    }
  }
  return `<svg class="fx-canvas-svg" width="${n3(width)}" height="${n3(height)}" viewBox="0 0 ${n3(width)} ${n3(height)}" stroke-linecap="square" stroke-linejoin="miter" stroke-miterlimit="10" style="white-space: pre" aria-hidden="true" focusable="false">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;
}

// ------------------------------------------------------------------ images

/** Bytes from base64 (an image view's pixels in the JSON). */
export function base64Bytes(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array, from: number, to: number): number {
  let c = 0xffffffff;
  for (let i = from; i < to; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * RGBA pixels (row by row) as a PNG file: 8-bit RGBA, not compressed (the deflate data is stored
 * blocks), so it takes no library and as long as the pixels themselves.
 */
export function pngBytes(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const row = width * 4 + 1;
  const raw = new Uint8Array(row * height);
  for (let y = 0; y < height; y++) raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * row + 1);
  // zlib: a header, stored blocks of at most 65535 bytes, the Adler-32 of the data.
  const blocks = Math.max(1, Math.ceil(raw.length / 65535));
  const zlib = new Uint8Array(2 + raw.length + blocks * 5 + 4);
  zlib[0] = 0x78;
  zlib[1] = 0x01;
  let p = 2;
  for (let b = 0; b < blocks; b++) {
    const chunk = raw.subarray(b * 65535, Math.min(raw.length, (b + 1) * 65535));
    zlib[p++] = b === blocks - 1 ? 1 : 0;
    zlib[p++] = chunk.length & 255;
    zlib[p++] = chunk.length >>> 8;
    zlib[p++] = ~chunk.length & 255;
    zlib[p++] = (~chunk.length >>> 8) & 255;
    zlib.set(chunk, p);
    p += chunk.length;
  }
  let a = 1;
  let b2 = 0;
  for (let i = 0; i < raw.length; i++) {
    a = (a + raw[i]) % 65521;
    b2 = (b2 + a) % 65521;
  }
  const adler = ((b2 << 16) | a) >>> 0;
  zlib.set([adler >>> 24, (adler >>> 16) & 255, (adler >>> 8) & 255, adler & 255], p);
  const chunks: [string, Uint8Array][] = [
    ["IHDR", new Uint8Array([width >>> 24, (width >>> 16) & 255, (width >>> 8) & 255, width & 255, height >>> 24, (height >>> 16) & 255, (height >>> 8) & 255, height & 255, 8, 6, 0, 0, 0])],
    ["IDAT", zlib],
    ["IEND", new Uint8Array(0)],
  ];
  const out = new Uint8Array(8 + chunks.reduce((s, [, d]) => s + 12 + d.length, 0));
  out.set([137, 80, 78, 71, 13, 10, 26, 10]);
  let q = 8;
  for (const [type, data] of chunks) {
    const len = data.length;
    out.set([len >>> 24, (len >>> 16) & 255, (len >>> 8) & 255, len & 255], q);
    for (let i = 0; i < 4; i++) out[q + 4 + i] = type.charCodeAt(i);
    out.set(data, q + 8);
    const crc = crc32(out, q + 4, q + 8 + len);
    out.set([crc >>> 24, (crc >>> 16) & 255, (crc >>> 8) & 255, crc & 255], q + 8 + len);
    q += 12 + len;
  }
  return out;
}

/** An image view's pixels (base64 RGBA, as the JSON has them) as a data: URL of a PNG; null when they aren't the size's. */
export function pngDataUrl(width: number, height: number, pixels: string): string | null {
  let rgba: Uint8Array;
  try {
    rgba = base64Bytes(pixels);
  } catch {
    return null;
  }
  if (!(width > 0 && height > 0) || rgba.length !== width * height * 4) return null;
  const png = pngBytes(width, height, rgba);
  let s = "";
  for (let i = 0; i < png.length; i += 0x8000) s += String.fromCharCode(...png.subarray(i, i + 0x8000));
  return "data:image/png;base64," + btoa(s);
}

/**
 * How many times larger an image view's image is drawn in a window (whole pixels, crisp): as large
 * as fits 128 CSS pixels each way, at most 8 times, at least once. 12 x 8 is drawn 8 times larger,
 * 32 x 24 4 times, 64 x 48 twice, 300 x 200 as it is. An image view the learner clicks (it has a
 * mouse handler) is drawn as large as fits 192 CSS pixels each way, at most 32 times, so each pixel
 * is a target a finger can hit: 8 x 8 is drawn 24 times larger (24 px a pixel), 6 x 4 32 times,
 * 32 x 24 6 times. A fixed rule, not the screen's width, so a window drawn when the site is built
 * (a task card's expected window) and the same window drawn live agree.
 */
export function imageScale(width: number, height: number, clicked = false): number {
  const fit = clicked ? 192 : 128;
  const most = clicked ? 32 : 8;
  return Math.max(1, Math.min(most, Math.floor(fit / Math.max(width, height, 1))));
}
