import React from "react";
import ReactDOM from "react-dom/client";
import App, { loadStepPage } from "./App";
import { loadModule } from "./content";
import "./styles.css";

// A lesson page opened directly: load its code first, so the pre-rendered page stays until the
// app can show the same page (no flash of a loading message).
const base = import.meta.env.BASE_URL;
const path = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname;
const lesson = /^learn\/([^/]+)\/[^/]+/.exec(path);
const ready = lesson ? Promise.all([loadStepPage(), loadModule(lesson[1])]).catch(() => undefined) : Promise.resolve();

ready.then(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});

// Offline support and "Add to Home screen" (production builds only).
if ("serviceWorker" in navigator && import.meta.env.PROD && !new URLSearchParams(location.search).has("nosw")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(base + "sw.js", { scope: base }).catch(() => {});
  });
}
