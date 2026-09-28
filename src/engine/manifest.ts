// public/engine/manifest.json (written by scripts/copy-engine.mjs), shared by the page and the workers.

/** `files`: full sizes. `gzip`: sizes of the .gz copies, fetched instead when the browser can unpack them. */
export type Manifest = {
  version: string;
  files: Record<string, number>;
  gzip?: Record<string, number>;
  /** The files each half of the engine needs. */
  compiler: string[];
  runner: string[];
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
export async function fetchCached(base: string, manifest: Manifest, file: string, onProgress: (bytes: number) => void): Promise<Uint8Array> {
  const url = new URL(file, base).href;
  const cacheName = CACHE_PREFIX + manifest.version;
  let cache: Cache | null = null;
  try {
    cache = await caches.open(cacheName);
    const hit = await cache.match(url);
    if (hit) {
      const buf = new Uint8Array(await hit.arrayBuffer());
      onProgress(downloadSize(manifest, file));
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
        onProgress(got);
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
      for (const k of await caches.keys()) if (k.startsWith(CACHE_PREFIX) && k !== cacheName) await caches.delete(k);
    } catch {
      /* quota exceeded or private mode: still works, just downloads next time */
    }
  }
  return out;
}

/** Saves the manifest beside the engine files so the next visit finds this version offline. */
export async function saveManifest(manifestUrl: string, manifest: Manifest) {
  try {
    const cache = await caches.open(CACHE_PREFIX + manifest.version);
    await cache.put(manifestUrl, new Response(JSON.stringify(manifest), { headers: { "Content-Type": "application/json" } }));
  } catch {
    /* no Cache Storage: nothing was saved for offline use anyway */
  }
}
