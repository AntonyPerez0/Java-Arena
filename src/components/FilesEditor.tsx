// The code editor for a program of one or more files: one file is a plain editor; several get a
// row of tabs (one per file), each file in its own editor with its own javac marks.
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { FileCode, Plus, X } from "lucide-react";
import CodeEditor from "./CodeEditor";
import type { FriendlyDiagnostic } from "../grader/grade";
import { joinFiles, splitFiles } from "../grader/files.js";

type SourceFile = { path: string; text: string };

type Props = {
  value: string;
  onChange: (v: string) => void;
  onRun?: () => void;
  diagnostics?: FriendlyDiagnostic[];
  minHeight?: string;
  label?: string;
  runAction?: string;
  /** The learner may add class files and remove them (the Playground). */
  canAddFiles?: boolean;
};

const base = (p: string) => p.split("/").pop();

export default function FilesEditor({ value, onChange, onRun, diagnostics = [], minHeight, label = "Java code editor", runAction, canAddFiles = false }: Props) {
  // Each file's exact text is kept here while typing (the joined string tidies line breaks between
  // files); a new value from outside, such as Reset, replaces it.
  const [files, setFiles] = useState(() => splitFiles(value) as SourceFile[]);
  const lastOut = useRef(value);
  useEffect(() => {
    if (value === lastOut.current) return;
    lastOut.current = value;
    setFiles(splitFiles(value) as SourceFile[]);
  }, [value]);
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const errorsIn = (f: SourceFile) => diagnostics.filter((d) => d.kind === "error" && base(d.file) === f.path).length;

  // After a check with errors, show a file that has them.
  useEffect(() => {
    const cur = files[active];
    if (!diagnostics.length || (cur && errorsIn(cur) > 0)) return;
    const first = files.findIndex((f) => errorsIn(f) > 0);
    if (first >= 0) setActive(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagnostics]);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState("");

  const emit = (next: SourceFile[]) => {
    setFiles(next);
    const out = joinFiles(next) as string;
    lastOut.current = out;
    onChange(out);
  };
  const change = (i: number, text: string) => emit(files.map((f, j) => (j === i ? { ...f, text } : f)));
  const addFile = () => {
    const name = newName.trim().replace(/\.java$/, "");
    if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) return setNameError("A class name starts with a capital letter and has only letters and digits, like Person.");
    if (files.some((f) => f.path === `${name}.java`)) return setNameError(`There is already a ${name}.java.`);
    emit([...files, { path: `${name}.java`, text: `public class ${name} {\n\n}\n` }]);
    setActive(files.length);
    setAdding(false);
    setNewName("");
    setNameError("");
  };
  const removeFile = (i: number) => {
    if (!confirm(`Remove ${files[i].path}? Its code will be lost.`)) return;
    emit(files.filter((_, j) => j !== i));
    setActive(0);
  };
  const addRow = canAddFiles && (
    <div className="file-add">
      {adding ? (
        <form
          className="file-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            addFile();
          }}
        >
          <label htmlFor="new-class">New class</label>
          <input id="new-class" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Person" autoComplete="off" autoCapitalize="words" spellCheck={false} aria-describedby={nameError ? "new-class-error" : undefined} autoFocus />
          <button type="submit" className="btn btn-sm">
            Add
          </button>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => (setAdding(false), setNameError(""))}>
            Cancel
          </button>
          {nameError && (
            <p id="new-class-error" className="field-error" role="alert">
              {nameError}
            </p>
          )}
        </form>
      ) : (
        <button type="button" className="linkish" onClick={() => setAdding(true)}>
          <Plus className="icon" aria-hidden="true" /> Add a class
        </button>
      )}
    </div>
  );

  if (files.length === 1 && files[0].path === "Main.java")
    return (
      <>
        <CodeEditor value={value} onChange={onChange} onRun={onRun} diagnostics={diagnostics} minHeight={minHeight} label={label} runAction={runAction} />
        {addRow}
      </>
    );
  const go = (i: number) => {
    const n = (i + files.length) % files.length;
    setActive(n);
    tabs.current[n]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight") go(i + 1);
    else if (e.key === "ArrowLeft") go(i - 1);
    else if (e.key === "Home") go(0);
    else if (e.key === "End") go(files.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="files-editor">
      <div className="file-tabs" role="tablist" aria-label="Files">
        {files.map((f, i) => {
          const n = errorsIn(f);
          return (
            <button
              type="button"
              key={f.path}
              ref={(el) => (tabs.current[i] = el)}
              role="tab"
              id={`file-tab-${i}`}
              aria-controls={i === active ? `file-panel-${i}` : undefined}
              aria-selected={i === active}
              tabIndex={i === active ? 0 : -1}
              className={"file-tab" + (i === active ? " file-tab-on" : "")}
              onClick={() => setActive(i)}
              onKeyDown={(e) => onKey(e, i)}
            >
              <FileCode className="icon" aria-hidden="true" />
              {f.path}
              {n > 0 && (
                <span className="file-tab-errors">
                  {n}
                  <span className="visually-hidden"> {n === 1 ? "error" : "errors"}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      {canAddFiles && files[active] && files[active].path !== "Main.java" && (
        <button type="button" className="linkish file-remove" onClick={() => removeFile(active)}>
          <X className="icon" aria-hidden="true" /> Remove {files[active].path}
        </button>
      )}
      {/* Only the open file has an editor; switching files opens a fresh one on that file. */}
      {files[active] && (
        <div key={files[active].path} role="tabpanel" id={`file-panel-${active}`} aria-labelledby={`file-tab-${active}`}>
          <CodeEditor value={files[active].text} onChange={(v) => change(active, v)} onRun={onRun} diagnostics={diagnostics} minHeight={minHeight} label={`${label}, ${files[active].path}`} runAction={runAction} file={files[active].path} />
        </div>
      )}
      {addRow}
    </div>
  );
}
