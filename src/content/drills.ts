// Deathmatch drills and placement questions (src/generated/drills.json), loaded only by the
// practice pages, so lesson pages stay small.
import { useEffect, useState } from "react";
import type { DrillSet } from "./types";

let loaded: DrillSet | null = null;
let loading: Promise<DrillSet> | null = null;

export function loadDrills(): Promise<DrillSet> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = import("../generated/drills.json").then((m) => (loaded = m.default as unknown as DrillSet));
    // A failed load (offline before the first visit, for example) is tried again next time.
    loading.catch(() => (loading = null));
  }
  return loading;
}

/** The drills: undefined while loading, "error" when loading failed. */
export function useDrills(): DrillSet | undefined | "error" {
  const [state, setState] = useState<DrillSet | undefined | "error">(() => loaded ?? undefined);
  useEffect(() => {
    if (loaded) return;
    let live = true;
    loadDrills().then(
      (d) => live && setState(d),
      () => live && setState("error"),
    );
    return () => {
      live = false;
    };
  }, []);
  return state;
}
