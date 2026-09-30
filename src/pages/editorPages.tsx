import { useEffect, useState, type ComponentType } from "react";

// Pages with the code editor (CodeMirror) load separately. main.tsx loads the page's code before the
// app starts when one of them is the first page opened; then it renders at once (React.lazy would
// show a loading message for a moment, and the pre-rendered page would jump).
function editorPage(load: () => Promise<{ default: ComponentType }>) {
  let component: ComponentType | null = null;
  const preload = () =>
    load().then((m) => {
      component = m.default;
    });
  function Route() {
    const [, setLoaded] = useState(false);
    const [failed, setFailed] = useState(false);
    useEffect(() => {
      if (!component) preload().then(() => setLoaded(true), () => setFailed(true));
    }, []);
    const Page = component;
    if (Page) return <Page />;
    return failed ? (
      <p role="alert">
        This page couldn't be loaded. Check the connection and{" "}
        <button type="button" className="linkish" onClick={() => location.reload()}>
          reload the page
        </button>
        .
      </p>
    ) : (
      <p className="muted">Loading…</p>
    );
  }
  return { Route, preload };
}

export const stepPage = editorPage(() => import("./StepPage"));
export const playgroundPage = editorPage(() => import("./Playground"));
export const deathmatchPage = editorPage(() => import("./Deathmatch"));
export const dailyPage = editorPage(() => import("./Daily"));
export const placementPage = editorPage(() => import("./Placement"));
export const loadStepPage = stepPage.preload;
export const loadPlayground = playgroundPage.preload;
/** Practice pages, by their first address segment. */
export const loadPractice: Record<string, () => Promise<void>> = { deathmatch: deathmatchPage.preload, daily: dailyPage.preload, placement: placementPage.preload };
