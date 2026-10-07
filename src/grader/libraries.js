// The engine libraries a program needs on its class path, decided from its source files. The browser's
// grader and free runs, the content build (scripts/build-content.mjs), its browser replay
// (scripts/content-browser.mjs) and the fidelity suite all use this one function.
import { JAVAFX_LIBRARY, usesJavaFX } from "./javafx.js";
import { JUNIT_LIBRARY, usesJUnit } from "./junit.js";

/** JUnit when the program uses org.junit, Java Arena's JavaFX when it uses javafx. */
export const librariesFor = (files) => [...(usesJUnit(files) ? [JUNIT_LIBRARY] : []), ...(usesJavaFX(files) ? [JAVAFX_LIBRARY] : [])];
