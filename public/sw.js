// Keeps Java Arena working offline once visited. The build (scripts/finish-build.mjs) fills in
// VERSION and ASSETS. The Java engine is not handled here: its workers keep their own copy in
// Cache Storage.
const VERSION = "dev";
const ASSETS = [];
const BASE = new URL("./", self.location).pathname;
const CACHE = "java-arena-shell-" + VERSION;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS.map((a) => BASE + a)))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("java-arena-shell-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname.startsWith(BASE + "engine/")) return;

  if (request.mode === "navigate") {
    // Pages: the network first (fresh content), the saved copy when offline.
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(url.pathname, copy));
          }
          return res;
        })
        .catch(
          async () =>
            (await caches.match(url.pathname, { ignoreSearch: true })) ||
            // Pages are saved at their folder address (/learn/printing/); links may leave off the slash.
            (!url.pathname.endsWith("/") && (await caches.match(url.pathname + "/", { ignoreSearch: true }))) ||
            (await caches.match(BASE)) ||
            Response.error(),
        ),
    );
    return;
  }

  // Built files have content hashes in their names, so a saved copy never goes stale.
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(request).then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        }),
    ),
  );
});
