// public/engine/manifest.json (written by scripts/copy-engine.mjs), shared by the page and the workers.

/** `files`: full sizes. `gzip`: sizes of the .gz copies, fetched instead when the browser can unpack them. */
export type Manifest = {
  version: string;
  files: Record<string, number>;
  gzip?: Record<string, number>;
  /** The files each half of the engine needs. */
  compiler: string[];
  runner: string[];
  /** Libraries a program may use (such as junit4.bin), fetched the first time one does. */
  libraries?: string[];
};

/** Each engine version is saved in its own Cache Storage cache: this prefix plus the version. */
export const CACHE_PREFIX = "java-arena-engine-";

/**
 * The server's manifest, or without a connection, the copy saved next to a fully downloaded
 * engine, so an engine that's already saved also starts offline.
 */
export async function fetchManifest(url: string): Promise<Manifest | null> {
  // Known to be offline: don't make a request that can only fail.
  if (navigator.onLine !== false) {
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) return (await res.json()) as Manifest;
    } catch {
      /* offline: use the saved copy */
    }
  }
  try {
    for (const k of await caches.keys()) {
      if (!k.startsWith(CACHE_PREFIX)) continue;
      const hit = await (await caches.open(k)).match(url);
      if (hit) return (await hit.json()) as Manifest;
    }
  } catch {
    /* no Cache Storage (private mode) */
  }
  return null;
}

const canGunzip = typeof DecompressionStream === "function";

/** Bytes actually downloaded for a file (the .gz copy when the browser can unpack it). */
export function downloadSize(manifest: Manifest, file: string): number {
  return (canGunzip && manifest.gzip?.[file]) || manifest.files[file] || 0;
}

/**
 * Loads one engine file: from Cache Storage when saved, otherwise downloaded (the gzip copy,
 * unpacked as it arrives) and saved. `onProgress` gets the downloaded byte count.
 */
export async function fetchCached(base: string, manifest: Manifest, file: string, onProgress: (bytes: number, fromCache: boolean) => void): Promise<Uint8Array> {
  const url = new URL(file, base).href;
  const cacheName = CACHE_PREFIX + manifest.version;
  let cache: Cache | null = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) {
      const buf = new Uint8Array(await hit.arrayBuffer());
      onProgress(downloadSize(manifest, file), true);
      return buf;
    }
  } catch {
    cache = null;
  }
  const gz = canGunzip && !!manifest.gzip?.[file];
  const res = await fetch(gz ? url + ".gz" : url).catch(() => null);
  if (!res) throw new Error("couldn't download the Java engine (check your connection)");
  if (!res.ok || !res.body) throw new Error(`couldn't download ${file} (HTTP ${res.status})`);
  let got = 0;
  let body: ReadableStream<Uint8Array> = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, ctl) {
        got += chunk.length;
        onProgress(got, false);
        ctl.enqueue(chunk);
      },
    }),
  );
  if (gz) body = body.pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>);
  const out = new Uint8Array(await new Response(body).arrayBuffer());
  if (out.byteLength !== manifest.files[file]) throw new Error(`${file} arrived incomplete (${out.byteLength} of ${manifest.files[file]} bytes)`);
  if (cache) {
    try {
      await cache.put(url, new Response(out, { headers: { "Content-Type": "application/octet-stream" } }));
    } catch {
      /* quota exceeded or private mode: still works, just downloads next time */
    }
  }
  return out;
}

/**
 * Saves the manifest beside the engine files, once all of them are saved, so the next visit finds
 * this version offline. Only then are older versions deleted: an interrupted update keeps the old
 * engine working offline.
 */
export async function saveManifest(manifestUrl: string, manifest: Manifest) {
  try {
    const cache = await caches.open(CACHE_PREFIX + manifest.version);
    await cache.put(manifestUrl, new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
    for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX) && k !== CACHE_PREFIX + manifest.version) await caches.delete(k);
  } catch {
    /* no Cache Storage: nothing was saved for offline use anyway */
  }
}

/**
 * The class files in a library archive (engine/libraries/build.mjs): a gzip stream of entries,
 * each "short nameLength, UTF-8 name, int dataLength, data".
 */
export async function libraryClasses(archive: Uint8Array): Promise<{ path: string; bytes: Uint8Array }[]> {
  let data = archive;
  if (data[0] === 0x1f && data[1] === 0x8b) {
    const stream = new Blob([archive as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream("gzip"));
    data = new Uint8Array(await new Response(stream).arrayBuffer());
  }
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const decoder = new TextDecoder();
  const classes: { path: string; bytes: Uint8Array }[] = [];
  for (let p = 0; p < data.length; ) {
    const n = view.getUint16(p);
    const path = decoder.decode(data.subarray(p + 2, p + 2 + n));
    p += 2 + n;
    const length = view.getUint32(p);
    p += 4;
    if (path.endsWith(".class")) classes.push({ path, bytes: data.subarray(p, p + length) });
    p += length;
  }
  return classes;
}
