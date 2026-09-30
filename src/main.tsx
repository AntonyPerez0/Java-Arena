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
// place among the links to that address in the same part of the page (header, main content or
// footer; React Router writes the home page's address without the last slash). The main content is
// written separately for the pre-rendered pages, so there the focus moves only when both have the
// same number of links to that address.
const root = document.getElementById("root")!;
const address = (a: HTMLAnchorElement) => a.href.replace(/\/$/, "");
const part = (a: Element) => a.closest("header, main, footer")?.tagName ?? "";
const linksTo = (href: string, where: string) =>
  [...root.querySelectorAll("a")].filter((a) => a instanceof HTMLAnchorElement && address(a) === href && part(a) === where);
function KeepFocus() {
  // Read while the app renders, when the pre-rendered page is still there: the first render and its
  // commit run in one go, so no key press can reach the page in between.
  const [was] = useState(() => {
    const a = document.activeElement;
    if (!(a instanceof HTMLAnchorElement)) return null;
    const links = linksTo(address(a), part(a));
    return { href: address(a), where: part(a), place: links.indexOf(a), count: links.length };
  });
  const link = useRef<HTMLAnchorElement>();
  useLayoutEffect(() => {
    if (!was || (document.activeElement && document.activeElement !== document.body)) return;
    const links = linksTo(was.href, was.where);
    if (was.where === "MAIN" && links.length !== was.count) return;
    link.current = links[was.place];
    link.current?.focus({ preventScroll: true });
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
