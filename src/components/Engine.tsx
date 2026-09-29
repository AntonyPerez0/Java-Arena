// The Java engine's status in the header, and the card that asks before downloading it.
import { useEffect, useState, useSyncExternalStore } from "react";
import { CircleCheck, Download, TriangleAlert } from "lucide-react";
import { downloadMegabytes, engineSupported, ensureEngine, getEngineStatus, mayAutoDownload, mobileData, subscribeEngine, type EngineStatus } from "../engine/client";
import { patchSettings, useStore } from "../state/store";

export function useEngineStatus(): EngineStatus {
  return useSyncExternalStore(subscribeEngine, getEngineStatus, getEngineStatus);
}

const percent = (s: Extract<EngineStatus, { state: "loading" }>) => Math.round((s.loaded / Math.max(s.total, 1)) * 100);

/** A small status pill: shown once the engine starts loading. */
export function EngineBadge() {
  const s = useEngineStatus();
  if (s.state === "idle") return null;
  if (s.state === "ready")
    return (
      <span className="pill pill-ready" title="The Java compiler and virtual machine are running in this browser">
        <span className="live-dot" aria-hidden="true" /> Java ready
      </span>
    );
  if (s.state === "error")
    return (
      <span className="pill pill-error" title={s.message}>
        <TriangleAlert className="icon" aria-hidden="true" /> Java engine error
      </span>
    );
  const p = s.stage === "start" ? 100 : percent(s);
  return (
    <span className="pill pill-loading">
      <span className="pill-bar" style={{ width: `${p}%` }} aria-hidden="true" />
      <span className="pill-text">{s.stage === "start" ? "Starting Java" : `Loading Java ${p}%`}</span>
    </span>
  );
}

/** Resolves once the page has loaded and the browser is idle, so the engine download doesn't slow the page down. */
function afterLoad(): Promise<void> {
  return new Promise((resolve) => {
    const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(() => resolve(), { timeout: 2000 }) : setTimeout(resolve, 200));
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
  });
}

/**
 * Starts the engine download, after the page has loaded, when that can't cost mobile data (or the
 * learner allowed it). Returns true while the page should ask first instead.
 */
export function useEngineAutoload(): boolean {
  const allow = useStore((s) => s.settings.mobileData);
  const status = useEngineStatus();
  const [ask, setAsk] = useState(false);
  useEffect(() => {
    if (status.state !== "idle") {
      setAsk(false);
      return;
    }
    let live = true;
    afterLoad()
      .then(() => mayAutoDownload(allow))
      .then((ok) => {
        if (!live) return;
        if (ok) ensureEngine();
        else setAsk(engineSupported());
      });
    return () => {
      live = false;
    };
  }, [allow, status.state]);
  return ask;
}

/** Starts the engine and moves focus to the Check button, since the pressed button goes away. */
function startAndFocusCheck() {
  ensureEngine();
  requestAnimationFrame(() => document.getElementById("check")?.focus());
}

/** Asks before the one-time download when the learner may be on mobile data. */
export function DownloadCard({ what }: { what: string }) {
  const allow = useStore((s) => s.settings.mobileData);
  const [mb, setMb] = useState<number | null>(null);
  useEffect(() => {
    downloadMegabytes().then(setMb);
  }, []);
  const size = mb ? `${mb} MB` : "about 15 MB";
  const data = mobileData();
  return (
    <section className="card data-card" aria-labelledby="dl-h">
      <h2 id="dl-h" className="h3">
        <Download className="icon" aria-hidden="true" /> Download the Java engine?
      </h2>
      <p>
        {what} needs the Java compiler and virtual machine, which run on your device: a one-time download of {size}. After that they're saved in this browser and work offline.
      </p>
      <p className="muted small">{data === "yes" ? "Your browser says you're on mobile data." : "Your browser can't tell whether you're on Wi-Fi or mobile data."} You can read the lesson now and download on Wi-Fi later; pressing Check also starts the download.</p>
      <div className="actions">
        <button type="button" className="btn btn-primary" onClick={startAndFocusCheck}>
          Download now ({size})
        </button>
        <label className="inline-check small">
          <input type="checkbox" checked={allow} onChange={(e) => patchSettings({ mobileData: e.target.checked })} /> Always download without asking
        </label>
      </div>
    </section>
  );
}

/** Shown instead of the editor's buttons when this browser can't run the engine. */
export function UnsupportedCard() {
  return (
    <section className="card data-card" aria-labelledby="unsup-h">
      <h2 id="unsup-h" className="h3">
        <TriangleAlert className="icon" aria-hidden="true" /> This browser can't run the Java engine
      </h2>
      <p>The engine needs WebAssembly features that recent versions of Chrome, Edge, Firefox and Safari have (garbage collection and exception handling). Updating the browser, or opening this page in another one, should fix it. You can still read every lesson here.</p>
    </section>
  );
}

export function EngineErrorCard({ message }: { message: string }) {
  return (
    <div className="banner banner-fail" role="alert">
      <span>The Java engine couldn't start: {message}.</span>
      <button type="button" className="btn" onClick={startAndFocusCheck}>
        Try again
      </button>
    </div>
  );
}

export function EngineReadyNote() {
  return (
    <span className="muted small">
      <CircleCheck className="icon ic-good" aria-hidden="true" /> Java is ready
    </span>
  );
}
