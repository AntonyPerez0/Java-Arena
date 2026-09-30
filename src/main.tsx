import React from "react";
import ReactDOM from "react-dom/client";
import App, { loadPlayground, loadPractice, loadStepPage } from "./App";
import { loadStep } from "./content";
import { loadDrills } from "./content/drills";
import "./styles.css";

// A lesson or the playground opened directly: load its code first, so the pre-rendered page stays
// until the app can show the same page (no flash of a loading message).
const base = import.meta.env.BASE_URL;
const path = location.pathname.startsWith(base) ? location.pathname.slice(base.length) : location.pathname;
const lesson = /^learn\/([^/]+)\/([^/]+)/.exec(path);
const practice = loadPractice[path.replace(/\/$/, "")];
const ready = lesson
  ? Promise.all([loadStepPage(), loadStep(lesson[1], lesson[2])]).catch(() => undefined)
  : /^playground\/?$/.test(path)
    ? loadPlayground().catch(() => undefined)
    : practice
      ? Promise.all([practice(), loadDrills()]).catch(() => undefined)
      : Promise.resolve();

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
