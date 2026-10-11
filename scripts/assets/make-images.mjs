// Makes the image files that lessons and tests give to programs (content/assets/*.png and
// content/assets/assets.json): small pictures of Java Arena's own, drawn here pixel by pixel from
// rectangles and gradients, so there is no third-party image and no license question.
//
// The bytes are the same on every computer and every Node version: the pixels are computed with
// exact arithmetic (no Math.sin and the like, whose last digits can differ), and the PNG encoder
// is this file's own (its own deflate, CRC-32 and Adler-32), not zlib, whose output can change
// between versions. A unit test (make-images.test.mjs) checks that this script makes exactly the
// committed files.
//
// The PNGs are 8-bit RGB, or RGBA where a picture has transparent pixels, with only the IHDR, IDAT
// and IEND chunks (no gamma, color profile or text chunks), and every pixel is either opaque or
// fully transparent (stored as 0, 0, 0, 0). So Java Arena's JavaFX and real JavaFX read exactly the
// same colors from them (a pixel that is partly transparent would be rounded by premultiplied alpha).
//
// Usage: node scripts/assets/make-images.mjs           writes content/assets/
//        node scripts/assets/make-images.mjs --check   only checks that the files are up to date
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------- the pictures

/** A color as [red, green, blue] (0 to 255) from 0xRRGGBB. */
const rgb = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
/** Between a and b (each [r, g, b]): t = 0 is a, t = 1 is b, each channel rounded. */
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const clamp = (v) => Math.max(0, Math.min(255, v));

/** The 6 x 4 test image, row by row: values that exact challenges can rely on (content/assets/README.md lists them). */
export const TINY = [
  [0xff0000, 0x00ff00, 0x0000ff, 0xffffff, 0x000000, 0x808080],
  [0xffff00, 0x00ffff, 0xff00ff, 0xc0c0c0, 0x404040, 0x800000],
  [0x102030, 0x405060, 0x708090, 0xa0b0c0, 0xd0e0f0, 0x0a141e],
  [0x010203, 0x7f7f7f, 0xfefefe, 0x336699, 0x996633, 0x2e8b57],
];

/** The blocks of blocks.png (6 across, 4 down, each 8 x 8 pixels). */
export const BLOCKS = [
  [0xff0000, 0xff8000, 0xffff00, 0x00c000, 0x0040ff, 0x8000c0],
  [0xff8080, 0xffc080, 0xffff80, 0x80e080, 0x80a0ff, 0xc080e0],
  [0x800000, 0x804000, 0x808000, 0x006000, 0x002080, 0x400060],
  [0x000000, 0x333333, 0x666666, 0x999999, 0xcccccc, 0xffffff],
];

// The heart of icon.png: . transparent, X its outline, r red, w a white highlight.
const HEART = [".XX..XX.", "XrrXXrrX", "XrwrrrrX", "XrrrrrrX", ".XrrrrX.", "..XrrX..", "...XX...", "........"];
const HEART_COLORS = { X: [128, 0, 32], r: [230, 40, 60], w: [255, 255, 255] };

function landscape(x, y) {
  // A gradient sky, a round sun, stepped blue-green hills, a green slope, a small lake and a striped field.
  const farHills = [12, 11, 10, 10, 11, 12, 13, 12][x >> 2];
  const nearHill = 15 + (x < 16 ? 0 : (x - 16) >> 3);
  if (y >= 19) return y % 2 ? [165, 125, 70] : [150, 110, 60];
  if (y >= 17 && x >= 4 && x <= 12) return [60, 110, 180];
  if (y >= nearHill) return mix([70, 170, 80], [40, 120, 50], (y - nearHill) / 6);
  if (y >= farHills) return [90, 140, 110];
  if ((x - 24) * (x - 24) + (y - 5) * (y - 5) <= 10) return [255, 215, 64];
  return mix([70, 130, 200], [170, 210, 240], y / 13);
}

const checker = (x, y) => (((x >> 2) + (y >> 2)) % 2 ? [230, 230, 230] : [40, 40, 40]);

function photo(x, y) {
  // A soft sunset: a sky from purple to orange, the glow of a low sun, dark hills, and water that
  // mirrors the sky with gentle ripples.
  const sky = (row) => mix([60, 40, 110], [250, 160, 90], Math.min(row, 29) / 29);
  const glowAt = (row, color) => {
    const d2 = (x - 40) * (x - 40) + (row - 24) * (row - 24);
    if (d2 <= 16) return [255, 240, 190];
    const glow = Math.max(0, 1 - d2 / 196);
    return mix(color, [255, 230, 150], glow * glow);
  };
  const hill = 26 + Math.floor(((x - 16) * (x - 16)) / 40);
  const hill2 = 28 + Math.floor(((x - 52) * (x - 52)) / 30);
  if (y >= 34) {
    const mirrored = glowAt(67 - y, sky(67 - y));
    const water = mix(mirrored, [20, 30, 60], 0.45);
    return y % 3 === 1 ? water.map((v) => clamp(v + 12)) : water;
  }
  if (y >= Math.min(hill, hill2)) return mix([70, 50, 90], [35, 25, 50], (y - Math.min(hill, hill2)) / 8);
  return glowAt(y, sky(y));
}

/**
 * Every image: its file name, size, whether it has transparent pixels (RGBA) and a description for
 * people who can't see it (the page's alt text), and how to draw each pixel ([r, g, b] or [r, g, b, a]).
 */
export const IMAGES = [
  { name: "landscape.png", width: 32, height: 24, alt: "A small landscape: a blue sky that gets lighter toward the horizon, a yellow sun, blue-green hills, a green slope, a small blue lake and a striped brown field.", draw: landscape },
  { name: "checker.png", width: 16, height: 16, alt: "A checkerboard of dark gray and light gray squares, 4 by 4 pixels each, with a dark square at the top left.", draw: checker },
  {
    name: "icon.png",
    width: 8,
    height: 8,
    alpha: true,
    alt: "An 8 by 8 pixel-art red heart with a dark red outline and one white pixel of shine, on a transparent background.",
    draw: (x, y) => {
      const c = HEART[y][x];
      return c === "." ? [0, 0, 0, 0] : [...HEART_COLORS[c], 255];
    },
  },
  { name: "blocks.png", width: 48, height: 32, alt: "Colored squares of 8 by 8 pixels in 4 rows of 6: bright colors, light colors, dark colors, and grays from black to white.", draw: (x, y) => rgb(BLOCKS[y >> 3][x >> 3]) },
  { name: "photo.png", width: 64, height: 48, alt: "A soft sunset: a sky going from purple to orange, a glowing low sun, dark hills, and rippled water reflecting the sky.", draw: photo },
  { name: "tiny.png", width: 6, height: 4, alt: "A tiny test image of 6 by 4 pixels, each a different color: red, green, blue, white, black and gray across its first row, and other colors in the three rows below.", draw: (x, y) => rgb(TINY[y][x]) },
];

// ---------------------------------------------------------------- PNG encoding

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** CRC-32 (as PNG chunks and zip files use it). */
export function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = CRC_TABLE[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes) {
  let a = 1;
  let b = 0;
  for (const v of bytes) {
    a = (a + v) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

/** Writes bits as deflate stores them: the first bit in the lowest bit of each byte. */
class BitWriter {
  bytes = [];
  acc = 0;
  n = 0;
  /** `count` bits of `value`, lowest first (extra bits, block headers). */
  bits(value, count) {
    for (let i = 0; i < count; i++) {
      this.acc |= ((value >>> i) & 1) << this.n;
      if (++this.n === 8) {
        this.bytes.push(this.acc);
        this.acc = 0;
        this.n = 0;
      }
    }
  }
  /** A Huffman code of `count` bits, its highest bit first (as deflate writes codes). */
  code(value, count) {
    for (let i = count - 1; i >= 0; i--) this.bits((value >>> i) & 1, 1);
  }
  finish() {
    if (this.n) this.bytes.push(this.acc);
    return this.bytes;
  }
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DIST_BASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193, 12289, 16385, 24577];
const DIST_EXTRA = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];

/** A literal or length symbol (0 to 287) with deflate's fixed Huffman codes. */
function fixedSymbol(w, sym) {
  if (sym < 144) w.code(0x30 + sym, 8);
  else if (sym < 256) w.code(0x190 + sym - 144, 9);
  else if (sym < 280) w.code(sym - 256, 7);
  else w.code(0xc0 + sym - 280, 8);
}

/** The largest index whose base is at most v. */
const baseIndex = (bases, v) => {
  let i = bases.length - 1;
  while (bases[i] > v) i--;
  return i;
};

/**
 * Deflate (RFC 1951) in one block with the fixed Huffman codes: each position takes the longest
 * earlier match of 3 to 258 bytes within 32 KB (the most recent 128 candidates tried, the nearest
 * winning a tie), or else its byte as a literal. Simple and the same on every run.
 */
export function deflate(data) {
  const w = new BitWriter();
  w.bits(1, 1); // the last block
  w.bits(1, 2); // fixed Huffman codes
  const head = new Map();
  const prev = new Int32Array(data.length).fill(-1);
  const key = (i) => (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
  const remember = (i) => {
    if (i + 2 >= data.length) return;
    const k = key(i);
    prev[i] = head.has(k) ? head.get(k) : -1;
    head.set(k, i);
  };
  let i = 0;
  while (i < data.length) {
    let best = 0;
    let bestDist = 0;
    if (i + 2 < data.length) {
      let tries = 128;
      for (let j = head.has(key(i)) ? head.get(key(i)) : -1; j >= 0 && i - j <= 32768 && tries-- > 0; j = prev[j]) {
        let len = 0;
        while (len < 258 && i + len < data.length && data[j + len] === data[i + len]) len++;
        if (len > best) {
          best = len;
          bestDist = i - j;
        }
      }
    }
    if (best >= 3) {
      const li = baseIndex(LENGTH_BASE, best);
      fixedSymbol(w, 257 + li);
      w.bits(best - LENGTH_BASE[li], LENGTH_EXTRA[li]);
      const di = baseIndex(DIST_BASE, bestDist);
      w.code(di, 5);
      w.bits(bestDist - DIST_BASE[di], DIST_EXTRA[di]);
      for (let k = 0; k < best; k++) remember(i + k);
      i += best;
    } else {
      fixedSymbol(w, data[i]);
      remember(i);
      i++;
    }
  }
  fixedSymbol(w, 256); // the end of the block
  return Uint8Array.from(w.finish());
}

/** zlib's format (RFC 1950) around deflate: the two header bytes, the data, then its Adler-32. */
export function zlibWrap(data) {
  const body = deflate(data);
  const out = new Uint8Array(body.length + 6);
  out[0] = 0x78;
  out[1] = 0x01;
  out.set(body, 2);
  const a = adler32(data);
  out.set([a >>> 24, (a >>> 16) & 255, (a >>> 8) & 255, a & 255], body.length + 2);
  return out;
}

const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];

function chunk(type, data) {
  const typed = [...type].map((c) => c.charCodeAt(0));
  const crc = crc32([...typed, ...data]);
  return [...u32(data.length), ...typed, ...data, ...u32(crc)];
}

/** PNG's filter for one row: the predictor of each byte from the byte to its left (a), above (b) and above-left (c). */
function filterRow(type, row, above, bpp) {
  const out = new Uint8Array(row.length);
  for (let i = 0; i < row.length; i++) {
    const a = i >= bpp ? row[i - bpp] : 0;
    const b = above ? above[i] : 0;
    const c = above && i >= bpp ? above[i - bpp] : 0;
    let p = 0;
    if (type === 1) p = a;
    else if (type === 2) p = b;
    else if (type === 3) p = (a + b) >> 1;
    else if (type === 4) {
      const e = a + b - c;
      const pa = Math.abs(e - a);
      const pb = Math.abs(e - b);
      const pc = Math.abs(e - c);
      p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
    }
    out[i] = (row[i] - p) & 255;
  }
  return out;
}

/**
 * A PNG file of 8-bit RGB (3 bytes a pixel) or RGBA (4) rows. Each row gets the filter whose bytes,
 * read as signed numbers, add up to the least (the usual rule of thumb), the first such one on a tie.
 */
export function encodePng(width, height, rows, alpha) {
  const bpp = alpha ? 4 : 3;
  const raw = [];
  rows.forEach((row, y) => {
    let best = null;
    for (let type = 0; type <= 4; type++) {
      const f = filterRow(type, row, y ? rows[y - 1] : null, bpp);
      const cost = f.reduce((s, v) => s + (v < 128 ? v : 256 - v), 0);
      if (!best || cost < best.cost) best = { type, f, cost };
    }
    raw.push(best.type, ...best.f);
  });
  const ihdr = [...u32(width), ...u32(height), 8, alpha ? 6 : 2, 0, 0, 0];
  return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...chunk("IHDR", ihdr), ...chunk("IDAT", [...zlibWrap(Uint8Array.from(raw))]), ...chunk("IEND", [])]);
}

/** The pixels of an image as rows of bytes (RGB, or RGBA when it has transparent pixels). */
export function pixelRows(image) {
  const bpp = image.alpha ? 4 : 3;
  const rows = [];
  for (let y = 0; y < image.height; y++) {
    const row = new Uint8Array(image.width * bpp);
    for (let x = 0; x < image.width; x++) {
      const c = image.draw(x, y);
      if (c.length !== bpp || c.some((v) => !Number.isInteger(v) || v < 0 || v > 255)) throw new Error(`${image.name}: pixel (${x}, ${y}) is ${JSON.stringify(c)}`);
      if (bpp === 4 && c[3] !== 0 && c[3] !== 255) throw new Error(`${image.name}: pixel (${x}, ${y}) is partly transparent; use alpha 0 or 255`);
      if (bpp === 4 && c[3] === 0 && (c[0] || c[1] || c[2])) throw new Error(`${image.name}: a transparent pixel (${x}, ${y}) must be 0, 0, 0, 0`);
      row.set(c, x * bpp);
    }
    rows.push(row);
  }
  return rows;
}

/** Every image's file: [{ name, width, height, alt, bytes }]. */
export function makeImages() {
  return IMAGES.map((image) => ({ name: image.name, width: image.width, height: image.height, alt: image.alt, bytes: encodePng(image.width, image.height, pixelRows(image), !!image.alpha) }));
}

/** content/assets/assets.json: each image's name, size and description, which the content build reads. */
export const assetIndex = (images) => JSON.stringify(images.map(({ name, width, height, alt }) => ({ name, width, height, alt })), null, 2) + "\n";

// ---------------------------------------------------------------- writing the files

export const ASSETS_DIR = new URL("../../content/assets/", import.meta.url).pathname;

if (import.meta.url === `file://${process.argv[1]}`) {
  const check = process.argv.includes("--check");
  const images = makeImages();
  const files = [...images.map((i) => [i.name, Buffer.from(i.bytes)]), ["assets.json", Buffer.from(assetIndex(images))]];
  const stale = files.filter(([name, bytes]) => !existsSync(join(ASSETS_DIR, name)) || !readFileSync(join(ASSETS_DIR, name)).equals(bytes)).map(([name]) => name);
  const extra = existsSync(ASSETS_DIR) ? readdirSync(ASSETS_DIR).filter((n) => n.endsWith(".png") && !images.some((i) => i.name === n)) : [];
  if (check) {
    if (stale.length || extra.length) {
      console.error(`make-images: content/assets is out of date${stale.length ? `: ${stale.join(", ")} differ` : ""}${extra.length ? `; ${extra.join(", ")} aren't made by this script` : ""}`);
      process.exit(1);
    }
    console.log(`make-images: content/assets has the ${images.length} images this script makes`);
  } else {
    mkdirSync(ASSETS_DIR, { recursive: true });
    for (const [name, bytes] of files) writeFileSync(join(ASSETS_DIR, name), bytes);
    for (const i of images) console.log(`content/assets/${i.name}: ${i.width} x ${i.height}, ${i.bytes.length} bytes${stale.includes(i.name) ? " (changed)" : ""}`);
    if (extra.length) console.warn(`make-images: ${extra.join(", ")} in content/assets aren't made by this script`);
  }
}
