// Tests of the images of content/assets: scripts/assets/make-images.mjs makes exactly the committed
// files, and every one is a PNG that Java Arena's JavaFX and real JavaFX read the same way (8-bit
// RGB or RGBA, only IHDR, IDAT and IEND, every pixel opaque or fully transparent), whose pixels are
// the ones drawn. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { inflateRawSync, inflateSync } from "node:zlib";
import { ASSETS_DIR, BLOCKS, IMAGES, TINY, assetIndex, crc32, deflate, makeImages, pixelRows, zlibWrap } from "./make-images.mjs";
import { assetProblem, pngInfo } from "../../src/grader/assets.ts";

const images = makeImages();

test("the script makes exactly the committed PNGs and assets.json, and nothing else is in content/assets", () => {
  for (const i of images) assert.ok(Buffer.from(i.bytes).equals(readFileSync(join(ASSETS_DIR, i.name))), `${i.name} differs from what scripts/assets/make-images.mjs makes: run it and commit the result`);
  assert.equal(readFileSync(join(ASSETS_DIR, "assets.json"), "utf8"), assetIndex(images));
  const pngs = readdirSync(ASSETS_DIR).filter((n) => n.endsWith(".png")).sort();
  assert.deepEqual(pngs, images.map((i) => i.name).sort());
});

test("making them twice gives the same bytes", () => {
  const again = makeImages();
  images.forEach((i, k) => assert.ok(Buffer.from(i.bytes).equals(Buffer.from(again[k].bytes)), i.name));
});

/** The raw pixel rows of a PNG made by the script, with its filters undone (zlib inflates its data). */
function decode(bytes) {
  const b = Buffer.from(bytes);
  const width = b.readUInt32BE(16);
  const height = b.readUInt32BE(20);
  const bpp = b[25] === 6 ? 4 : 3;
  const idat = [];
  for (let p = 8; p < b.length; ) {
    const len = b.readUInt32BE(p);
    if (b.toString("latin1", p + 4, p + 8) === "IDAT") idat.push(b.subarray(p + 8, p + 8 + len));
    // Each chunk's CRC-32 is right.
    assert.equal(b.readUInt32BE(p + 8 + len), crc32(b.subarray(p + 4, p + 8 + len)));
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  assert.equal(raw.length, (width * bpp + 1) * height);
  const rows = [];
  let prev = new Uint8Array(width * bpp);
  for (let y = 0; y < height; y++) {
    const type = raw[y * (width * bpp + 1)];
    const line = raw.subarray(y * (width * bpp + 1) + 1, (y + 1) * (width * bpp + 1));
    const row = new Uint8Array(width * bpp);
    for (let i = 0; i < row.length; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const up = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      const e = a + up - c;
      const paeth = Math.abs(e - a) <= Math.abs(e - up) && Math.abs(e - a) <= Math.abs(e - c) ? a : Math.abs(e - up) <= Math.abs(e - c) ? up : c;
      row[i] = (line[i] + [0, a, up, (a + up) >> 1, paeth][type]) & 255;
    }
    rows.push(row);
    prev = row;
  }
  return rows;
}

test("every image is an 8-bit RGB or RGBA PNG with only IHDR, IDAT and IEND, and its pixels are the ones drawn", () => {
  for (const [k, i] of images.entries()) {
    const info = pngInfo(i.bytes);
    assert.deepEqual(info, { width: i.width, height: i.height, bitDepth: 8, colorType: IMAGES[k].alpha ? 6 : 2, interlace: 0, chunks: ["IHDR", "IDAT", "IEND"] }, i.name);
    assert.equal(assetProblem(i.bytes), null, i.name);
    assert.deepEqual(decode(i.bytes), pixelRows(IMAGES[k]), i.name);
  }
});

test("a transparent image has only opaque and fully transparent pixels, the transparent ones 0, 0, 0, 0", () => {
  const icon = images.find((i) => i.name === "icon.png");
  const rows = decode(icon.bytes);
  const alphas = new Set(rows.flatMap((r) => [...r].filter((_, j) => j % 4 === 3)));
  assert.deepEqual([...alphas].sort((a, b) => a - b), [0, 255]);
  for (const r of rows) for (let j = 0; j < r.length; j += 4) if (r[j + 3] === 0) assert.deepEqual([r[j], r[j + 1], r[j + 2]], [0, 0, 0]);
});

test("tiny.png and blocks.png hold the colors content/assets/README.md lists", () => {
  const readme = readFileSync(join(ASSETS_DIR, "README.md"), "utf8");
  const hex = (v) => "`0x" + v.toString(16).padStart(6, "0") + "`";
  TINY.forEach((row, y) => assert.ok(readme.includes(`| ${y} | ${row.map(hex).join(" | ")} |`), `README row ${y} of tiny.png`));
  BLOCKS.forEach((row, r) => assert.ok(readme.includes(`| ${r} | ${row.map(hex).join(" | ")} |`), `README row ${r} of blocks.png`));
  const tiny = decode(images.find((i) => i.name === "tiny.png").bytes);
  TINY.forEach((row, y) => row.forEach((v, x) => assert.deepEqual([...tiny[y].subarray(x * 3, x * 3 + 3)], [(v >> 16) & 255, (v >> 8) & 255, v & 255])));
  const blocks = decode(images.find((i) => i.name === "blocks.png").bytes);
  BLOCKS.forEach((row, r) => row.forEach((v, c) => assert.deepEqual([...blocks[r * 8 + 7].subarray((c * 8 + 7) * 3, (c * 8 + 7) * 3 + 3)], [(v >> 16) & 255, (v >> 8) & 255, v & 255])));
  // The README lists every image with its size.
  for (const i of images) assert.ok(readme.includes(`| \`${i.name}\` | ${i.width} x ${i.height} |`), `README lists ${i.name}`);
});

test("the encoder's deflate and zlib wrapper are read back by zlib, for repeats, long runs and random bytes", () => {
  let seed = 7;
  const random = Uint8Array.from({ length: 5000 }, () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >> 16) & 255);
  const cases = [new Uint8Array(0), Uint8Array.of(1), new Uint8Array(70000).fill(9), Uint8Array.from({ length: 3000 }, (_, i) => i % 7), random, Uint8Array.from({ length: 40000 }, (_, i) => (i * i) % 251)];
  for (const data of cases) {
    assert.ok(inflateRawSync(deflate(data)).equals(Buffer.from(data)), `deflate, ${data.length} bytes`);
    // zlib checks the header and the Adler-32 at the end.
    assert.ok(inflateSync(zlibWrap(data)).equals(Buffer.from(data)), `zlib, ${data.length} bytes`);
  }
});
