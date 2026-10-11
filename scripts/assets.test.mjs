// Tests of the images that tests and lessons give programs, and of files that aren't text
// (src/grader/assets.ts, and how src/grader/writes.js treats them): the checks the content build
// makes of an image, the drawing's scale and words, the ```asset block's data, fetching an image
// for a run, and that a binary file is never compared or listed as text. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { AssetLoadError, assetExample, assetFigureHtml, assetProblem, assetScale, assetSizeWords, binaryNote, binaryWords, fromBase64, isAssetFile, pngInfo, programFiles, sameContent, textOrBytes, toBase64 } from "../src/grader/assets.ts";
import { changedFiles, compareWrites, fileContent } from "../src/grader/writes.js";
import { nondeterminism } from "./content/determinism.mjs";
import { encodePng } from "./assets/make-images.mjs";

const landscape = { asset: "landscape.png", url: "images/landscape-0123456789.png", width: 32, height: 24, size: 317, alt: "A small landscape." };
const png = (w, h, alpha = false) => encodePng(w, h, Array.from({ length: h }, () => new Uint8Array(w * (alpha ? 4 : 3))), alpha);

/** A PNG made by hand from chunks (type, data), for the kinds the build rejects. */
function chunked(ihdr, extra = []) {
  const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
  const chunk = (type, data) => [...u32(data.length), ...[...type].map((c) => c.charCodeAt(0)), ...data, 0, 0, 0, 0];
  return Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, ...chunk("IHDR", ihdr), ...extra.flatMap(([t, d]) => chunk(t, d)), ...chunk("IDAT", [0]), ...chunk("IEND", [])]);
}
const ihdr = (w, h, depth, type, interlace = 0) => [...[w, h].flatMap((v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255]), depth, type, 0, 0, interlace];

test("pngInfo reads a PNG's header and chunks; anything else is null", () => {
  assert.deepEqual(pngInfo(png(6, 4)), { width: 6, height: 4, bitDepth: 8, colorType: 2, interlace: 0, chunks: ["IHDR", "IDAT", "IEND"] });
  assert.equal(pngInfo(png(8, 8, true)).colorType, 6);
  assert.equal(pngInfo(new TextEncoder().encode("not a png at all, just some text here")), null);
  assert.equal(pngInfo(png(6, 4).subarray(0, 40)), null, "cut short");
});

test("the build takes only 8-bit RGB or RGBA PNGs without gamma, color profile or text chunks, not interlaced, up to 512 x 512", () => {
  assert.equal(assetProblem(png(32, 24)), null);
  assert.equal(assetProblem(png(8, 8, true)), null);
  assert.equal(assetProblem(new TextEncoder().encode("GIF89a.................................")), "isn't a PNG file");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 8, 3), [["PLTE", [0, 0, 0]]])), "must be 8-bit RGB or RGBA");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 16, 2))), "must be 8-bit RGB or RGBA");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 8, 0))), "must be 8-bit RGB or RGBA");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 8, 2, 1))), "must not be interlaced");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 8, 2), [["gAMA", [0, 0, 177, 143]], ["tEXt", [65, 0, 66]]])), "has gAMA, tEXt chunks; only IHDR, IDAT and IEND are allowed");
  assert.equal(assetProblem(chunked(ihdr(4, 4, 8, 6), [["iCCP", [1]], ["sRGB", [0]]])), "has iCCP, sRGB chunks; only IHDR, IDAT and IEND are allowed");
  assert.equal(assetProblem(chunked(ihdr(513, 4, 8, 2))), "must be 1 to 512 pixels wide and high");
});

test("an image is drawn whole pixels larger, to fit 256 x 192, at most 16 times; the words say so", () => {
  assert.equal(assetScale(32, 24), 8);
  assert.equal(assetScale(6, 4), 16);
  assert.equal(assetScale(64, 48), 4);
  assert.equal(assetScale(48, 32), 5);
  assert.equal(assetScale(300, 200), 1);
  assert.equal(assetScale(1000, 10), 1, "never smaller than its pixels");
  assert.equal(assetSizeWords({ width: 32, height: 24 }), "32 x 24 pixels, drawn 8 times larger");
  assert.equal(assetSizeWords({ width: 300, height: 200 }), "300 x 200 pixels");
});

test("an ```asset block's data is read back, and anything else is null; its figure shows the image at its scale with its name, size and description", () => {
  const block = JSON.stringify({ name: "landscape.png", image: landscape });
  assert.deepEqual(assetExample(block), { name: "landscape.png", image: landscape });
  assert.equal(assetExample(""), null);
  assert.equal(assetExample('{"name":"a.png"}'), null);
  const html = assetFigureHtml("landscape.png", landscape, "/Java-Arena/");
  assert.match(html, /<img src="\/Java-Arena\/images\/landscape-0123456789\.png" width="256" height="192" alt="A small landscape\." class="asset-img"/);
  assert.match(html, /<figcaption>The image <span class="asset-name">landscape\.png<\/span><\/figcaption>/);
  assert.match(html, /32 x 24 pixels, drawn 8 times larger/);
  assert.match(assetFigureHtml("a.png", { ...landscape, alt: 'Say "hi" <now>' }, "/"), /alt="Say &quot;hi&quot; &lt;now&gt;"/);
});

test("isAssetFile tells an image from a text file", () => {
  assert.equal(isAssetFile(landscape), true);
  assert.equal(isAssetFile("7\n"), false);
  assert.equal(isAssetFile({ asset: "x.png" }), false, "a YAML { asset } isn't stored as such");
});

test("a file is text when its bytes are UTF-8, else its bytes; base64 goes there and back; contents compare by text or bytes", () => {
  assert.equal(textOrBytes(new TextEncoder().encode("Total: 3\näö\n")), "Total: 3\näö\n");
  const bytes = png(2, 2);
  assert.ok(textOrBytes(bytes) instanceof Uint8Array);
  assert.ok(textOrBytes(Uint8Array.of(0x41, 0xff, 0x42)) instanceof Uint8Array, "Latin-1 isn't UTF-8");
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
  assert.deepEqual(fromBase64(toBase64(new Uint8Array(70000).fill(200))), new Uint8Array(70000).fill(200), "long ones too");
  assert.equal(sameContent(Uint8Array.of(1, 2), Uint8Array.of(1, 2)), true);
  assert.equal(sameContent(Uint8Array.of(1, 2), Uint8Array.of(1, 3)), false);
  assert.equal(sameContent("a", Uint8Array.of(97)), false);
  assert.equal(sameContent(undefined, "a"), false);
  assert.equal(binaryWords(bytes), `${bytes.length} bytes that aren't text: a PNG image of 2 x 2 pixels`);
  assert.equal(binaryNote(Uint8Array.of(0xff)), "(1 byte that isn't text)");
  assert.equal(binaryNote(Uint8Array.of(0xff, 0xfe)), "(2 bytes that aren't text)");
});

test("a binary file is never compared as text: writes fails on it, and its words say what it holds", () => {
  const bytes = png(6, 4);
  for (const v of [bytes, { binary: toBase64(bytes) }]) {
    const [r] = compareWrites({ "out.txt": "6 x 4\n" }, { "out.txt": v });
    assert.equal(r.pass, false);
    assert.equal(r.got, `(${bytes.length} bytes that aren't text: a PNG image of 6 x 4 pixels)`);
  }
  assert.deepEqual(fileContent({ binary: toBase64(Uint8Array.of(1, 2, 3)) }), Uint8Array.of(1, 2, 3));
  assert.equal(fileContent("x"), "x");
});

test("a free run lists a binary file it wrote or changed as bytes, and not one it was given and left as it was", () => {
  const given = png(6, 4);
  const changed = png(6, 5);
  const out = changedFiles({ "tiny.png": given, "keep.png": given, "a.txt": "1\n" }, { "tiny.png": Uint8Array.from(given), "keep.png": changed, "new.png": changed, "a.txt": "1\n", "b.txt": "2\n", ".arena/window.json": "{}" });
  assert.deepEqual(out, [
    { name: "b.txt", text: "2\n" },
    { name: "keep.png", bytes: changed },
    { name: "new.png", bytes: changed },
  ]);
});

test("a run's files: text as it is, an image fetched from the site once; one that can't be loaded says which", async () => {
  const bytes = png(32, 24);
  const asked = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    asked.push(url);
    if (url.includes("missing")) return new Response("not found", { status: 404 });
    return new Response(bytes);
  };
  try {
    const image = { ...landscape, size: bytes.length };
    const files = await programFiles({ "scores.txt": "7\n", "landscape.png": image }, "/Java-Arena/");
    assert.equal(files["scores.txt"], "7\n");
    assert.deepEqual(files["landscape.png"], bytes);
    await programFiles({ "pic.png": image }, "/Java-Arena/");
    assert.deepEqual(asked, ["/Java-Arena/images/landscape-0123456789.png"], "fetched once");
    assert.equal(await programFiles(undefined, "/"), undefined);
    await assert.rejects(programFiles({ "m.png": { ...image, url: "images/missing.png" } }, "/"), (e) => e instanceof AssetLoadError && e.message === "The image m.png couldn't be downloaded (HTTP 404). Check the connection and try again.");
    // A copy that arrives cut short isn't used.
    await assert.rejects(programFiles({ "big.png": { ...image, url: "images/big.png", size: bytes.length + 1 } }, "/"), (e) => e instanceof AssetLoadError && e.message === `The image big.png couldn't be downloaded (only ${bytes.length} of its ${bytes.length + 1} bytes arrived). Check the connection and try again.`);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a window program that reads an image from the internet is rejected; one that reads a file isn't", () => {
  const check = (body) => nondeterminism([{ path: "Main.java", text: `import javafx.scene.image.*;\n\npublic class Main {\n    void f() {\n        ${body}\n    }\n}\n` }]);
  for (const body of ['Image i = new Image("https://example.com/cat.png");', 'ImageView v = new ImageView("http://example.com/a.png");', 'Image i = new javafx.scene.image.Image( "HTTPS://x/y.png" );', 'Image i = new Image("jar:file:a.jar!/a.png");'])
    assert.match(check(body).join("\n"), /reads an image from the internet/, body);
  for (const body of ['Image i = new Image("file:landscape.png");', 'ImageView v = new ImageView("landscape.png");', '// new Image("https://example.com/a.png");', 'String s = "new Image(\\"https://x\\")";'])
    assert.deepEqual(check(body), [], body);
});
