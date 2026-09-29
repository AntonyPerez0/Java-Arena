import { useEffect, useState } from "react";
import { clearEngineCache, downloadMegabytes, engineCached, engineSupported, ensureEngine } from "../engine/client";
import { patchSettings, resetProgress, useStore, type Theme } from "../state/store";
import { challengesDone, stepsDone } from "../state/derived";
import { TEXT_SIZES } from "../lib/appearance";
import { useTitle } from "../lib/title";
import { useEngineStatus } from "../components/Engine";

const THEMES: { value: Theme; label: string }[] = [
  { value: "system", label: "Same as my device" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export default function Settings() {
  useTitle("Settings");
  const s = useStore((x) => x);
  const status = useEngineStatus();
  const [mb, setMb] = useState<number | null>(null);
  const [cached, setCached] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    downloadMegabytes().then(setMb);
    engineCached().then(setCached);
  }, [status.state]);

  return (
    <div className="narrow settings">
      <div className="page-head">
        <h1>Settings</h1>
        <p className="muted">Everything here is saved in this browser only.</p>
      </div>

      <section className="card" aria-labelledby="look-h">
        <h2 id="look-h" className="h3">
          Appearance
        </h2>
        <fieldset className="radio-row">
          <legend>Theme</legend>
          {THEMES.map((t) => (
            <label key={t.value}>
              <input type="radio" name="theme" value={t.value} checked={s.settings.theme === t.value} onChange={() => patchSettings({ theme: t.value })} /> {t.label}
            </label>
          ))}
        </fieldset>
        <fieldset className="radio-row">
          <legend>Text size</legend>
          {TEXT_SIZES.map((t) => (
            <label key={t.value}>
              <input type="radio" name="size" value={t.value} checked={s.settings.textScale === t.value} onChange={() => patchSettings({ textScale: t.value })} /> {t.label}
            </label>
          ))}
        </fieldset>
      </section>

      <section className="card" aria-labelledby="engine-h">
        <h2 id="engine-h" className="h3">
          Java engine
        </h2>
        {!engineSupported() ? (
          <p>This browser can't run the Java engine: it needs WebAssembly garbage collection and exception handling, which recent Chrome, Edge, Firefox and Safari have.</p>
        ) : (
          <>
            <p>
              The compiler and virtual machine are a one-time download of {mb ? `${mb} MB` : "about 15 MB"}, kept in this browser.{" "}
              {status.state === "ready" ? "It's running now." : cached ? "It's saved in this browser." : cached === false ? "It isn't downloaded yet." : ""}
            </p>
            <label className="inline-check">
              <input type="checkbox" checked={s.settings.mobileData} onChange={(e) => patchSettings({ mobileData: e.target.checked })} /> Download without asking, even on mobile data
            </label>
            <div className="actions">
              {status.state !== "ready" && status.state !== "loading" && (
                <button type="button" className="btn" onClick={() => ensureEngine()}>
                  Download now
                </button>
              )}
              {cached && (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={async () => {
                    await clearEngineCache();
                    setCached(false);
                    setMessage("The saved engine was removed. It downloads again the next time it's needed.");
                  }}
                >
                  Remove the saved engine
                </button>
              )}
            </div>
            <p className="muted small">
              <a href={import.meta.env.BASE_URL + "bench/"}>Engine test page</a>: run example programs and a speed test.
            </p>
          </>
        )}
      </section>

      <section className="card" aria-labelledby="progress-h">
        <h2 id="progress-h" className="h3">
          Progress
        </h2>
        <p>
          {stepsDone(s)} steps and {challengesDone(s)} challenges done. Progress is saved in this browser; moving it to another device comes in a later version of the site.
        </p>
        <div className="actions">
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              if (!confirm("Delete all your progress and saved code on this device, including your Playground program? This can't be undone.")) return;
              resetProgress();
              setMessage("All progress and saved code on this device were deleted.");
            }}
          >
            Delete all progress
          </button>
        </div>
      </section>
      <p role="status" className="small">
        {message}
      </p>
    </div>
  );
}
