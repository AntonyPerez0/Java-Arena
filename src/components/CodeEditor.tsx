import { useEffect, useId, useMemo, useRef, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { oneDarkHighlightStyle, oneDarkTheme } from "@codemirror/theme-one-dark";
import { keymap, EditorView } from "@codemirror/view";
import { Prec } from "@codemirror/state";
import { historyField } from "@codemirror/commands";
import { HighlightStyle, indentUnit, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { linter, lintGutter, type Diagnostic as CmDiagnostic } from "@codemirror/lint";
import type { FriendlyDiagnostic } from "../grader/grade";
import { useResolvedTheme } from "../lib/appearance";
import { lightEditorTheme } from "./lightTheme";

// One Dark, except that true and false get its keyword violet in place of its orange, as they do in
// the lessons' code (the site has no orange), and the current line's number gets One Dark's text
// color: its own #7d8799 on the highlighted #2c313a is only 3.6:1 (now 6.1:1).
const darkEditorTheme = [
  oneDarkTheme,
  EditorView.theme({ ".cm-activeLineGutter": { color: "#abb2bf" } }, { dark: true }),
  syntaxHighlighting(HighlightStyle.define([...oneDarkHighlightStyle.specs, { tag: t.bool, color: "#c678dd" }])),
];

type Props = {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  diagnostics?: FriendlyDiagnostic[];
  minHeight?: string;
  /** Accessible name for the editor. */
  label?: string;
  /** What Control or Command plus Enter does, for the help text. */
  runAction?: string;
  /** The file this editor shows: only javac's messages about it are marked. */
  file?: string;
  /** A state saved by onLeave (text, cursor and undo history) to start from, if its text is still `value`. */
  saved?: SavedEditor;
  /** Called with the editor's state when it closes, so switching back to this file can restore it. */
  onLeave?: (state: SavedEditor) => void;
};

/** An editor's state as JSON, with its undo history. */
export type SavedEditor = { doc: string; [key: string]: unknown };
const savedFields = { history: historyField };

/** The Java code editor (CodeMirror), with javac's errors marked on their lines. */
export default function CodeEditor({ value, onChange, onRun, diagnostics = [], minHeight = "10rem", label = "Java code editor", runAction = "checks your code", file = "Main.java", saved, onLeave }: Props) {
  const helpId = useId();
  // Only the state this editor started with matters; a saved state for other text is ignored.
  const [initialState] = useState(() => (saved && saved.doc === value ? { json: saved, fields: savedFields } : undefined));
  const view = useRef<EditorView | null>(null);
  const leave = useRef(onLeave);
  leave.current = onLeave;
  useEffect(() => () => void (view.current && leave.current?.(view.current.state.toJSON(savedFields) as SavedEditor)), []);
  const theme = useResolvedTheme();
  const extensions = useMemo(() => {
    // javac names a file by its path, as the program's files are named (library/domain/Book.java).
    const marks = diagnostics.filter((d) => d.line > 0 && d.kind !== "note" && d.file === file);
    return [
      java(),
      // Four spaces per level, like the lessons and the style check (CodeMirror's default is two).
      indentUnit.of("    "),
      EditorView.lineWrapping,
      // An explicit tabindex keeps the text area a tab stop that tools like axe recognize inside the scroll area.
      EditorView.contentAttributes.of({ "aria-label": label, "aria-describedby": helpId, tabindex: "0", autocapitalize: "off", autocorrect: "off", spellcheck: "false" }),
      lintGutter(),
      linter(
        (view): CmDiagnostic[] =>
          marks
            .filter((d) => d.line <= view.state.doc.lines)
            .map((d) => {
              const line = view.state.doc.line(d.line);
              const from = Math.min(line.from + Math.max(d.column - 1, 0), line.to);
              return { from, to: Math.max(from, line.to), severity: d.kind === "error" ? "error" : "warning", message: d.friendly ? `${d.message}\n\n${d.friendly}` : d.message };
            }),
        { delay: 0 },
      ),
      Prec.highest(
        keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onRun?.();
              return true;
            },
          },
        ]),
      ),
    ];
  }, [diagnostics, onRun, label, helpId, file]);

  return (
    <div className="editor">
      <p id={helpId} className="visually-hidden">
        Tab inserts indentation. To leave the editor with the keyboard, press Escape, then Tab. Control or Command plus Enter {runAction}.
      </p>
      <CodeMirror
        value={value}
        onChange={onChange}
        theme={theme === "light" ? lightEditorTheme : darkEditorTheme}
        extensions={extensions}
        minHeight={minHeight}
        basicSetup={{ tabSize: 4, foldGutter: false, highlightActiveLine: true, autocompletion: false }}
        indentWithTab
        initialState={initialState}
        onCreateEditor={(v) => (view.current = v)}
      />
    </div>
  );
}
