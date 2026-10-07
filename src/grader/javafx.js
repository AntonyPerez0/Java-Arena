// Graphical user interfaces with JavaFX (the MOOC's part 13). Real JavaFX doesn't run on Java Arena's
// engine (Ristretto) or on the other browser Java engines that docs/research looked at, so Java
// Arena has its own practice version of part of its API (the engine's "javafx" library, built from
// engine/libraries/javafx/src): a program that uses it runs to the end like any other.
// Application.launch calls start, replays the clicks and typing listed in .arena/events.txt, writes
// the windows to .arena/window.json, calls stop and returns.
//
// Everything in the .arena/ folder is Java Arena's own: it is never shown to the learner as a file
// the program wrote, and never compared as one.

/** The engine library with Java Arena's JavaFX. */
export const JAVAFX_LIBRARY = "javafx";

/**
 * Java code with its comments and its string, char and text-block literals blanked out, in one pass
 * (as importsFor in scripts/build-content.mjs and scripts/content/determinism.mjs do it).
 */
const codeOnly = (text) => String(text ?? "").replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//g, " ");

/**
 * True when a program uses JavaFX (and so needs the library): one of its files mentions "javafx."
 * outside comments and strings, in an import or a full class name. A console program that only
 * prints the word (System.out.println("javafx.scene")) or mentions it in a comment doesn't.
 */
export const usesJavaFX = (files) => files.some((f) => /\bjavafx\s*\./.test(codeOnly(f.text)));

/** The folder, in the program's working folder, of the files the library reads and writes. */
export const ARENA_FOLDER = ".arena/";
/** The clicks and typing to replay, one event per line (the page or a test writes it). */
export const EVENTS_FILE = ".arena/events.txt";
/** The windows when the program's session ended, as JSON (the library writes it). */
export const WINDOW_FILE = ".arena/window.json";

/** True for a file of Java Arena's own folder, .arena/. */
export const isArenaFile = (name) => String(name) === ".arena" || String(name).startsWith(ARENA_FOLDER);

/** The files (name to text) without those of .arena/, or the value itself when it isn't an object. */
export function withoutArenaFiles(files) {
  if (!files || typeof files !== "object") return files;
  return Object.fromEntries(Object.entries(files).filter(([name]) => !isArenaFile(name)));
}
