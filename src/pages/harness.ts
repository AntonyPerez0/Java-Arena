// Exposes the engine to the automated tests (scripts/fidelity/browser.mjs and the content checks).
import { compile, engineReady, runClasses, getEngineStatus } from "../engine/client";

declare global {
  interface Window {
    javaArena: {
      engineReady: typeof engineReady;
      compile: typeof compile;
      runClasses: typeof runClasses;
      getEngineStatus: typeof getEngineStatus;
    };
  }
}

window.javaArena = { engineReady, compile, runClasses, getEngineStatus };
