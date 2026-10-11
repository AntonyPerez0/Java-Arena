// Image files that lessons, tests and the Playground give to programs (content/assets, made by
// scripts/assets/make-images.mjs), and binary files in general: a file in a program's folder is
// text, or bytes that aren't text (such as a PNG), which the page never shows as text.
//
// The content build (scripts/build-content.mjs) copies each image to the site, where the page and
// the grader fetch it: public/images/<name>-<hash>.png, served under the site's base address. A
// test or an example names one as an AssetFile, which says where it is served, its size and its
// description. Shared by the browser's grader and pages and by the Node scripts (which run this
// file as it is: types only, nothing that needs compiling).

/**
 * An image of content/assets that a test or an example puts in the program's folder: its name in
 * content/assets (`asset`), where the site serves it (`url`, relative to the site's base address),
 * its size in pixels, its size in bytes and its description (the page's alt text).
 */
export type AssetFile = { asset: string; url: string; width: number; height: number; size: number; alt: string };

/** A file a test gives the program: its text, or an image of content/assets. */
export type GivenFile = string | AssetFile;

/** The folder of the site (under its base address) where the build puts the images. */
export const ASSET_FOLDER = "images/";

/** True when a file a test gives is an image of content/assets (not text). */
export function isAssetFile(v: unknown): v is AssetFile {
  return !!v && typeof v === "object" && typeof (v as AssetFile).asset === "string" && typeof (v as AssetFile).url === "string";
}

// ------------------------------------------------------------------ binary files

/** A file's text when its bytes are UTF-8, else the bytes themselves (a binary file, such as a PNG). */
export function textOrBytes(bytes: Uint8Array): string | Uint8Array {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return bytes;
  }
}

/** Two files' contents are the same: the same text, or the same bytes. */
export function sameContent(a: string | Uint8Array | null | undefined, b: string | Uint8Array | null | undefined): boolean {
  if (typeof a === "string" || typeof b === "string" || a == null || b == null) return a === b;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** What a binary file holds, in words: "312 bytes that aren't text: a PNG image of 32 x 24 pixels". */
export function binaryWords(bytes: Uint8Array): string {
  const png = pngInfo(bytes);
  const n = bytes.length === 1 ? "1 byte that isn't text" : `${bytes.length} bytes that aren't text`;
  return png ? `${n}: a PNG image of ${png.width} x ${png.height} pixels` : n;
}

/** binaryWords in parentheses, where a file's text would be compared: "(312 bytes that aren't text)". */
export const binaryNote = (bytes: Uint8Array) => `(${binaryWords(bytes)})`;

/** Base64 of bytes (for JSON, which can't hold bytes), and back. */
export function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}
export function fromBase64(text: string): Uint8Array {
  const s = atob(text);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

// ------------------------------------------------------------------ PNG files

/** What a PNG file's header says, and the names of its chunks in order; null when it isn't a PNG. */
export type PngInfo = { width: number; height: number; bitDepth: number; colorType: number; interlace: number; chunks: string[] };

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Reads a PNG file's chunks (not its pixels): null when the bytes aren't a PNG file that can be read to its end. */
export function pngInfo(bytes: Uint8Array): PngInfo | null {
  if (bytes.length < 33 || PNG_SIGNATURE.some((b, i) => bytes[i] !== b)) return null;
  const u32 = (p: number) => ((bytes[p] << 24) | (bytes[p + 1] << 16) | (bytes[p + 2] << 8) | bytes[p + 3]) >>> 0;
  const chunks: string[] = [];
  let p = 8;
  while (p + 12 <= bytes.length) {
    const len = u32(p);
    chunks.push(String.fromCharCode(bytes[p + 4], bytes[p + 5], bytes[p + 6], bytes[p + 7]));
    p += 12 + len;
    if (chunks[chunks.length - 1] === "IEND") break;
  }
  if (chunks[0] !== "IHDR" || chunks[chunks.length - 1] !== "IEND" || p > bytes.length) return null;
  return { width: u32(16), height: u32(20), bitDepth: bytes[24], colorType: bytes[25], interlace: bytes[28], chunks };
}

/**
 * Why a file can't be an image of content/assets, or null: it must be a PNG of 8-bit RGB or RGBA,
 * not interlaced, with only the IHDR, IDAT and IEND chunks (no gamma, color profile or text, which
 * could make real JavaFX read other colors than Java Arena's JavaFX), of 1 to 512 pixels each way.
 */
export function assetProblem(bytes: Uint8Array): string | null {
  const png = pngInfo(bytes);
  if (!png) return "isn't a PNG file";
  if (png.bitDepth !== 8 || (png.colorType !== 2 && png.colorType !== 6)) return "must be 8-bit RGB or RGBA";
  if (png.interlace) return "must not be interlaced";
  const other = png.chunks.filter((c) => c !== "IHDR" && c !== "IDAT" && c !== "IEND");
  if (other.length) return `has ${[...new Set(other)].join(", ")} chunks; only IHDR, IDAT and IEND are allowed`;
  if (png.width < 1 || png.height < 1 || png.width > 512 || png.height > 512) return "must be 1 to 512 pixels wide and high";
  return null;
}

// ------------------------------------------------------------------ drawing one on the page

/**
 * How many times larger the page draws an image (whole pixels, crisp): as large as fits 256 x 192
 * CSS pixels, at most 16 times, at least once. 32 x 24 is drawn 8 times larger, 6 x 4 16 times.
 */
export function assetScale(width: number, height: number): number {
  return Math.max(1, Math.min(16, Math.floor(256 / Math.max(width, 1)), Math.floor(192 / Math.max(height, 1))));
}

/** The words under a drawn image: "32 x 24 pixels, drawn 8 times larger". */
export function assetSizeWords(a: { width: number; height: number }): string {
  const k = assetScale(a.width, a.height);
  return `${a.width} x ${a.height} pixels${k > 1 ? `, drawn ${k} times larger` : ""}`;
}

/** The data of an ```asset block in a lesson, as the build writes it (one line of JSON): the file's name and the image. */
export type AssetExample = { name: string; image: AssetFile };

/** The data of an ```asset block, or null when it can't be read. */
export function assetExample(text: string): AssetExample | null {
  try {
    const x = JSON.parse(text);
    return x && typeof x.name === "string" && isAssetFile(x.image) ? (x as AssetExample) : null;
  } catch {
    return null;
  }
}

const esc = (t: string) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * An image drawn for a lesson (an ```asset block) as HTML: the picture, scaled up with its pixels
 * kept crisp, and under it its name and size. `base` is the site's base address (/Java-Arena/).
 */
export function assetFigureHtml(name: string, a: AssetFile, base: string, caption = "The image"): string {
  const k = assetScale(a.width, a.height);
  return `<figure class="io asset-figure"><figcaption>${esc(caption)} <span class="asset-name">${esc(name)}</span></figcaption><div class="asset-frame"><img src="${esc(base + a.url)}" width="${a.width * k}" height="${a.height * k}" alt="${esc(a.alt)}" class="asset-img" loading="lazy" decoding="async"></div><p class="asset-size">${esc(assetSizeWords(a))}</p></figure>\n`;
}

// ------------------------------------------------------------------ giving them to a program

const fetched = new Map<string, Promise<Uint8Array>>();

/** An image's bytes, fetched from the site once (`base` is its base address); rejects when it can't be loaded. */
export function assetBytes(a: AssetFile, base: string): Promise<Uint8Array> {
  const url = base + a.url;
  let p = fetched.get(url);
  if (!p) {
    p = fetch(url).then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (bytes.length !== a.size) throw new Error(`only ${bytes.length} of its ${a.size} bytes arrived`);
      return bytes;
    });
    // A failed load (offline, for example) is tried again next time.
    p.catch(() => fetched.delete(url));
    fetched.set(url, p);
  }
  return p;
}

/** Thrown when an image a test gives the program can't be loaded; its message is a sentence of its own, shown and announced as it is. */
export class AssetLoadError extends Error {}

/**
 * The files of a run, as the engine takes them: text as it is, and each image of content/assets as
 * its bytes (fetched from the site). Throws AssetLoadError, which says which image, when one can't be loaded.
 */
export async function programFiles(files: Record<string, GivenFile> | undefined, base: string): Promise<Record<string, string | Uint8Array> | undefined> {
  if (!files) return undefined;
  const out: Record<string, string | Uint8Array> = {};
  for (const [name, v] of Object.entries(files)) {
    if (typeof v === "string") out[name] = v;
    else {
      try {
        out[name] = await assetBytes(v, base);
      } catch (e) {
        throw new AssetLoadError(`The image ${name} couldn't be downloaded (${e instanceof Error ? e.message : String(e)}). Check the connection and try again.`);
      }
    }
  }
  return out;
}
