import { useEffect, useRef, type RefObject } from "react";
import { EditorView } from "@codemirror/view";

// Keys that are slow to reach on a phone keyboard. `caret` is where the cursor ends up inside the
// inserted text (for pairs, between the two characters); `move` moves the cursor instead.
type Key = { label: string; text: string; name: string; caret?: number; move?: number };
const KEYS: Key[] = [
  { label: "sout", text: "System.out.println();", name: "sout, System.out.println", caret: 19 },
  { label: "Tab", text: "    ", name: "Tab, indent" },
  { label: "{ }", text: "{}", name: "braces", caret: 1 },
  { label: "( )", text: "()", name: "parentheses", caret: 1 },
  { label: '" "', text: '""', name: "double quotes", caret: 1 },
  { label: ";", text: ";", name: "semicolon" },
  { label: ".", text: ".", name: "dot" },
  { label: "+", text: "+", name: "plus" },
  { label: "=", text: "=", name: "equals" },
  { label: "[ ]", text: "[]", name: "square brackets", caret: 1 },
  { label: "' '", text: "''", name: "single quotes", caret: 1 },
  { label: "<", text: "<", name: "less than" },
  { label: ">", text: ">", name: "greater than" },
  { label: "!", text: "!", name: "exclamation mark" },
  { label: "&&", text: "&&", name: "and" },
  { label: "||", text: "||", name: "or" },
  { label: "%", text: "%", name: "percent" },
  { label: "/", text: "/", name: "slash" },
  { label: "*", text: "*", name: "star" },
  { label: "->", text: "->", name: "arrow" },
  { label: "::", text: "::", name: "double colon" },
  { label: "@", text: "@", name: "at sign" },
  { label: "_", text: "_", name: "underscore" },
  { label: "\\n", text: "\\n", name: "newline escape" },
  { label: "←", text: "", name: "cursor left", move: -1 },
  { label: "→", text: "", name: "cursor right", move: 1 },
];

type Editable = HTMLInputElement | HTMLTextAreaElement | HTMLElement;

function insert(target: Editable, key: Key) {
  const caret = key.caret ?? key.text.length;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    if (key.move) {
      const p = Math.max(0, Math.min(target.value.length, start + key.move));
      target.setSelectionRange(p, p);
    } else {
      // Set the value through the native setter so React sees the change.
      const value = target.value.slice(0, start) + key.text + target.value.slice(end);
      const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
      setter?.call(target, value);
      target.dispatchEvent(new Event("input", { bubbles: true }));
      target.setSelectionRange(start + caret, start + caret);
    }
    target.focus();
    return;
  }
  const view = EditorView.findFromDOM(target);
  if (!view) return;
  const { from, to } = view.state.selection.main;
  if (key.move) {
    const p = Math.max(0, Math.min(view.state.doc.length, from + key.move));
    view.dispatch({ selection: { anchor: p } });
  } else {
    view.dispatch({ changes: { from, to, insert: key.text }, selection: { anchor: from + caret }, scrollIntoView: true });
  }
  view.focus();
}

/**
 * A row of tap-to-insert symbols for touch screens. It types into whichever code editor or answer
 * box inside `container` was focused last.
 */
export default function SymbolBar({ container }: { container: RefObject<HTMLElement> }) {
  const last = useRef<Editable | null>(null);
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t instanceof HTMLInputElement && t.classList.contains("blank")) last.current = t;
      else if (t instanceof HTMLTextAreaElement) last.current = t;
      else if (t.closest?.(".cm-content")) last.current = t.closest(".cm-content") as HTMLElement;
    };
    el.addEventListener("focusin", onFocus);
    return () => el.removeEventListener("focusin", onFocus);
  }, [container]);

  const target = (): Editable | null => {
    if (last.current?.isConnected) return last.current;
    return (container.current?.querySelector(".cm-content, input.blank") as Editable | null) ?? null;
  };

  return (
    <div className="symbar" role="toolbar" aria-label="Insert symbols">
      {KEYS.map((k) => (
        <button
          key={k.name}
          type="button"
          className="symkey"
          aria-label={k.name}
          // Keep focus (and the phone keyboard) in the editor.
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const t = target();
            if (t) insert(t, k);
          }}
        >
          {k.label}
        </button>
      ))}
    </div>
  );
}
