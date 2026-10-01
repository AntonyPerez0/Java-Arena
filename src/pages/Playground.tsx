import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Link2, Play, RotateCcw } from "lucide-react";
import FilesEditor from "../components/FilesEditor";
import SymbolBar from "../components/SymbolBar";
import { DiagnosticList, WrittenFiles } from "../components/Results";
import { DownloadCard, EngineErrorCard, UnsupportedCard, useEngineAutoload, useEngineStatus } from "../components/Engine";
import { engineSupported } from "../engine/client";
import { runOnly, type FreeRun } from "../grader/grade";
import { decodeShare, encodeShare } from "../lib/share";
import { useTitle } from "../lib/title";
import { PLAYGROUND_KEY as KEY } from "../state/store";

const EXAMPLE = `import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);
        System.out.println("What is your name?");
        String name = scanner.nextLine();
        System.out.println("Hello, " + name + "!");
    }
}
`;

type Saved = { code: string; stdin: string };

function loadSaved(): Saved {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
    if (s && typeof s.code === "string") return { code: s.code, stdin: typeof s.stdin === "string" ? s.stdin : "" };
  } catch {
    /* ignore */
  }
  return { code: EXAMPLE, stdin: "Ada\n" };
}

function save(s: Saved) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked */
  }
}

function announce(r: FreeRun): string {
  if (r.status === "compile-error") return "It didn't compile. The errors are listed below.";
  if (r.status === "internal-error") return "The Java engine couldn't run this. Try again.";
  const files = r.written?.length ? ` and the ${r.written.length === 1 ? "file" : "files"} it wrote` : "";
  return r.note ? `The program stopped with a problem. The output${files} and an explanation are below.` : `The program finished. Its output${files} ${files ? "are" : "is"} below.`;
}

/** Write and run any Java program, with your own input; share it as a link. */
export default function Playground() {
  useTitle("Playground");
  const [code, setCode] = useState(() => loadSaved().code);
  const [stdin, setStdin] = useState(() => loadSaved().stdin);
  // Opened from a share link: the learner's own saved program stays untouched until they edit.
  const [shared, setShared] = useState(false);
  const [shareError, setShareError] = useState("");
  const [result, setResult] = useState<FreeRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [runs, setRuns] = useState(0);
  const [link, setLink] = useState("");
  const [status, setStatus] = useState("");
  // What screen readers hear; the region is always on the page so every change is announced.
  const [live, setLive] = useState("");
  const engine = useEngineStatus();
  const askFirst = useEngineAutoload();
  const { hash, pathname, search } = useLocation();
  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const busyRef = useRef(false);
  const sharedRef = useRef(false);
  sharedRef.current = shared;

  const showOwn = useCallback(() => {
    const s = loadSaved();
    setCode(s.code);
    setStdin(s.stdin);
    setShared(false);
  }, []);

  // A share link can arrive at any time: on load, pasted into this tab, or with Back and Forward.
  // Without one, the learner's own program is shown (for example after "Playground" in the menu).
  useEffect(() => {
    setShareError("");
    if (!hash || hash === "#") {
      if (sharedRef.current) showOwn();
      return;
    }
    let current = true;
    decodeShare(hash).then(
      (p) => {
        if (!current || !p) return;
        setCode(p.code);
        setStdin(p.stdin);
        setShared(true);
        setResult(null);
        setLive("You opened a shared program. Your own playground program is still saved.");
      },
      () => current && setShareError("This share link is damaged, so it couldn't be opened. Your own program is shown instead."),
    );
    return () => {
      current = false;
    };
  }, [hash, showOwn]);

  const dropHash = () => navigate({ pathname, search }, { replace: true });

  const edit = (next: Partial<Saved>) => {
    const s = { code, stdin, ...next };
    if (next.code !== undefined) setCode(next.code);
    if (next.stdin !== undefined) setStdin(next.stdin);
    // Editing a shared program makes it this learner's own.
    if (shared) {
      setShared(false);
      dropHash();
    }
    save(s);
  };

  const run = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setStatus("");
    setLive("Running your program.");
    try {
      const r = await runOnly(code, stdin);
      setResult(r);
      setRuns((n) => n + 1);
      setLive(announce(r));
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [code, stdin]);

  const tell = (msg: string) => {
    setStatus(msg);
    setLive(msg);
  };

  const share = async () => {
    const url = new URL(location.pathname, location.origin).href + "#" + (await encodeShare({ code, stdin }));
    setLink(url);
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      try {
        await navigator.share({ title: "A Java program", url });
        tell("Shared.");
        return;
      } catch {
        /* cancelled: the link is still shown below */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      tell("Link copied. Anyone who opens it sees this program and its input.");
    } catch {
      tell("Copy the link below. Anyone who opens it sees this program and its input.");
    }
  };

  const waiting = engine.state !== "ready";
  const unsupported = !engineSupported();
  // What the program printed and its error messages, in the order it wrote them.
  const out = result?.status === "ran" ? (result.run?.output ?? "") : "";

  return (
    <div className="playground">
      <div className="page-head">
        <h1 ref={headingRef} tabIndex={-1}>
          Playground
        </h1>
        <p className="muted">Write any Java program and run it with your own input. It runs on your device with the real javac 21, and it's saved in this browser.</p>
      </div>
      {shared && (
        <div className="banner banner-info">
          <span>You opened a shared program. Your own playground program is still saved; editing this one replaces it.</span>
          <button
            type="button"
            className="btn btn-sm"
            onClick={() => {
              showOwn();
              setResult(null);
              dropHash();
              // The banner (and this button) goes away: keep the keyboard focus on the page.
              headingRef.current?.focus();
              setLive("Your own program is back in the editor.");
            }}
          >
            Back to my program
          </button>
        </div>
      )}
      {shareError && (
        <p className="banner banner-fail" role="alert">
          {shareError}
        </p>
      )}
      <div className="workbench" ref={boxRef} data-checks={runs}>
        {unsupported ? <UnsupportedCard /> : askFirst && <DownloadCard what="Running programs" now="write your program now" button="Run" />}
        {engine.state === "error" && !unsupported && <EngineErrorCard message={engine.message} />}
        <FilesEditor value={code} onChange={(v) => edit({ code: v })} onRun={run} diagnostics={result?.status === "compile-error" ? result.diagnostics : undefined} minHeight="16rem" label="Java code editor" runAction="runs the program" canAddFiles />
        <SymbolBar container={boxRef} />
        <label className="lbl" htmlFor="pg-stdin">
          Input (what the program reads)
        </label>
        <textarea id="pg-stdin" className="stdin" rows={3} value={stdin} onChange={(e) => edit({ stdin: e.target.value })} spellCheck={false} autoCapitalize="off" autoCorrect="off" wrap="off" />
        <div className="actions">
          <button type="button" className="btn btn-primary" id="check" onClick={run} aria-busy={busy || undefined} aria-keyshortcuts="Control+Enter Meta+Enter" disabled={unsupported}>
            {busy ? (
              waiting ? (
                "Starting Java…"
              ) : (
                "Running…"
              )
            ) : (
              <>
                <Play className="icon" aria-hidden="true" /> Run <kbd aria-hidden="true">Ctrl ↵</kbd>
              </>
            )}
          </button>
          <button type="button" className="btn" onClick={share}>
            <Link2 className="icon" aria-hidden="true" /> Share
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              if (!confirm("Replace your program with the example?")) return;
              edit({ code: EXAMPLE, stdin: "Ada\n" });
              setResult(null);
            }}
          >
            <RotateCcw className="icon" aria-hidden="true" /> Example
          </button>
        </div>
        {link && (
          <div className="share-box">
            <label className="lbl" htmlFor="pg-link">
              Share link
            </label>
            <input id="pg-link" className="share-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          </div>
        )}
        <p className="visually-hidden" role="status" aria-live="polite">
          {live}
        </p>
        {status && <p className="small muted">{status}</p>}
        {result && (
          <div className="results">
            {result.status === "internal-error" ? (
              <div className="banner banner-fail">The Java engine couldn't run this ({result.internalError}). Try again.</div>
            ) : result.status === "compile-error" ? (
              <>
                <div className="banner banner-fail">
                  <span>It didn't compile</span>
                </div>
                <DiagnosticList diagnostics={result.diagnostics} raw={result.javacOutput} multiFile={result.multiFile} />
              </>
            ) : (
              <>
                <span className="lbl">Output</span>
                <pre tabIndex={0} className="console">
                  {out || "(no output)"}
                </pre>
                {result.note && <div className="t-note">{result.note}</div>}
                {result.run && <div className="muted small">Exit code {result.run.exitCode ?? "none"}</div>}
                <WrittenFiles files={result.written} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
