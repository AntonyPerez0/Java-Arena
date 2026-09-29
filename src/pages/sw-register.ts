// Registers public/sw.js, which keeps the pages working offline once visited.
export function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;
  if (new URLSearchParams(location.search).has("nosw")) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + "sw.js", { scope: import.meta.env.BASE_URL }).catch(() => {
      /* offline support is optional */
    });
  });
}
