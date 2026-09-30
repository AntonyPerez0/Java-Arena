import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// The app replaces the pre-rendered page, which drops the focus of a keyboard user who moved to one
// of its links before the app started. The same link in the app gets it back: the one at the same
// place among the links to that address (React Router writes the home page's without the last slash).
const root = document.getElementById("root")!;
const address = (a: HTMLAnchorElement) => a.href.replace(/\/$/, "");
const linksTo = (href: string) => [...root.querySelectorAll("a")].filter((a) => a instanceof HTMLAnchorElement && address(a) === href);
function KeepFocus() {
  // Read while the app renders, when the pre-rendered page is still there: the first render and its
  // commit run in one go, so no key press can reach the page in between.
  const [was] = useState(() => {
    const a = document.activeElement;
    return a instanceof HTMLAnchorElement ? { href: address(a), place: linksTo(address(a)).indexOf(a) } : null;
  });
  const link = useRef<HTMLAnchorElement>();
  useLayoutEffect(() => {
    if (was && (document.activeElement === document.body || !document.activeElement)) {
      link.current = linksTo(was.href)[was.place];
      link.current?.focus({ preventScroll: true });
    }
  }, [was]);
  // In view again after the app's scroll to the top.
  useEffect(() => link.current?.scrollIntoView({ block: "nearest" }), []);
  return null;
}

ready.then(() => {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
      <KeepFocus />
    </React.StrictMode>,
  );
});

// Offline support and "Add to Home screen" (production builds only).
if ("serviceWorker" in navigator && import.meta.env.PROD && !new URLSearchParams(location.search).has("nosw")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(base + "sw.js", { scope: base }).catch(() => {});
  });
}
