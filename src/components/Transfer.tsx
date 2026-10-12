// Moving progress to another device (src/lib/transfer.ts): the "Your progress" section of
// Settings (a transfer link with Copy, Share and a QR code; a progress file to download or load)
// and the summary shown before an import, used by Settings and the /transfer/ page.
import { useEffect, useId, useRef, useState } from "react";
import { Copy, Download, QrCode, Share2, Upload } from "lucide-react";
import { getState, importProgress, readPlayground } from "../state/store";
import { LONG_LINK, TransferError, encodeTransfer, fileName, fileText, makeTransfer, mergeTransfer, parseFile, replaceWithTransfer, summarize, summaryText, type Transfer } from "../lib/transfer";
import { isoDay, recordDate } from "../lib/record";
import { QR_MAX_CHARS } from "../lib/qr-limit";
import type { QrDrawing } from "../lib/qr";

/** The site's address (where the app is served), for links and files. */
export const siteAddress = () => new URL(import.meta.env.BASE_URL, location.origin).href;

const fmt = (k: number) => k.toLocaleString("en-US");

/** The two sentences about what a link or file holds; the only words about privacy. */
export function TransferNote() {
  return (
    <p className="transfer-note">
      A transfer link or progress file holds your progress (and your code, if you include it), and anyone with the link or file can open it. Java Arena has no server and doesn't keep a copy.
    </p>
  );
}

/** A QR code of a link, black on white (in both themes, so cameras read it), with its quiet zone. The encoder loads when it's first needed. */
function QrImage({ link }: { link: string }) {
  const [q, setQ] = useState<QrDrawing | null>(null);
  // Separate from "still loading": the encoder's file didn't load (an old tab after the site was updated), or it couldn't encode the link.
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    setQ(null);
    setFailed(false);
    import("../lib/qr").then(
      ({ qrFor }) => {
        if (!current) return;
        const d = qrFor(link);
        if (d) setQ(d);
        else setFailed(true);
      },
      () => current && setFailed(true),
    );
    return () => {
      current = false;
    };
  }, [link]);
  if (failed)
    return (
      <p className="qr-failed" role="status">
        The QR code couldn't be drawn.{" "}
        <button type="button" className="linkish" onClick={() => location.reload()}>
          Reload the page
        </button>
        , or copy the link.
      </p>
    );
  if (!q) return null;
  return (
    <figure className="transfer-qr">
      <svg viewBox={`0 0 ${q.size} ${q.size}`} role="img" aria-label="QR code of the transfer link" shapeRendering="crispEdges">
        <rect width={q.size} height={q.size} fill="#fff" />
        <path d={q.path} fill="#000" />
      </svg>
      <figcaption className="small">Scan it with the camera of the device you're moving to.</figcaption>
    </figure>
  );
}

async function copyText(text: string, field: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers: select the field and copy that.
    if (!field) return false;
    field.focus();
    field.select();
    try {
      return document.execCommand("copy");
    } catch {
      return false;
    }
  }
}

/** Saves a text as a file (the browser's download). */
function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "Load a progress file": a button that opens the file picker, and the file's progress (or a message) when one is picked. */
export function LoadFile({ onLoaded, onError }: { onLoaded: (t: Transfer) => void; onError: (message: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button type="button" className="btn" onClick={() => input.current?.click()}>
        <Upload className="icon" aria-hidden="true" /> Load a progress file
      </button>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        hidden
        data-testid="progress-file"
        onChange={async (e) => {
          const file = e.currentTarget.files?.[0];
          e.currentTarget.value = "";
          if (!file) return;
          try {
            if (file.size > 50_000_000) throw new TransferError("damaged", "This file is too big to be a progress file, so nothing was changed.");
            onLoaded(parseFile(await file.text()));
          } catch (err) {
            onError(err instanceof TransferError ? err.message : "This file couldn't be read, so nothing was changed.");
          }
        }}
      />
    </>
  );
}

/**
 * The summary of an import and its choices: Merge (the default), Replace or Cancel. Nothing
 * changes until one of the first two is pressed. `headingLevel` fits the page it's on.
 */
export function ImportReview({ transfer, from, onDone, onCancel, headingLevel = 3 }: { transfer: Transfer; from: "link" | "file"; onDone: (message: string) => void; onCancel: () => void; headingLevel?: 2 | 3 }) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => headingRef.current?.focus(), []);
  const summary = summarize(getState(), readPlayground(), transfer);
  const text = summaryText(summary);
  const H = headingLevel === 2 ? "h2" : "h3";

  return (
    <section className="import-review" aria-labelledby={id}>
      <H id={id} ref={headingRef} tabIndex={-1} className="h3">
        Import this progress?
      </H>
      <p>
        This {from === "link" ? "transfer link" : "progress file"}
        {transfer.madeAt ? (
          <>
            {" "}was made on <time dateTime={isoDay(transfer.madeAt)}>{recordDate(transfer.madeAt)}</time>
          </>
        ) : null}
        . {text.has}
      </p>
      <p className="import-label">Merge into my progress:</p>
      <ul className="import-changes">
        {text.merge.map((line) => (
          <li key={line}>{line[0].toUpperCase() + line.slice(1)}.</li>
        ))}
      </ul>
      <p className="small muted">Merging keeps your settings. {text.replace}</p>
      <div className="actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => {
            const m = mergeTransfer(getState(), readPlayground(), transfer);
            importProgress(m.state, m.playground);
            onDone(`Merged. ${summary.merge.addSteps ? `${fmt(summary.merge.addSteps)} finished ${summary.merge.addSteps === 1 ? "step was" : "steps were"} added. ` : ""}Your progress is saved in this browser.`);
          }}
        >
          Merge into my progress
        </button>
        <button
          type="button"
          className="btn btn-danger"
          onClick={() => {
            const r = replaceWithTransfer(transfer, readPlayground(), Date.now(), getState().settings.name);
            importProgress(r.state, r.playground);
            onDone("Replaced. This browser now has the imported progress and settings, apart from your name.");
          }}
        >
          Replace my progress
        </button>
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}

type Made = { link: string; withCode: boolean };

/** The "Your progress" tools of Settings: a transfer link, a progress file, and importing a file. */
export function ProgressTransfer() {
  const [withCode, setWithCode] = useState(false);
  const [made, setMade] = useState<Made | null>(null);
  const [qr, setQr] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [loaded, setLoaded] = useState<Transfer | null>(null);
  const [fileMessage, setFileMessage] = useState("");
  const field = useRef<HTMLTextAreaElement>(null);
  const fileMessageRef = useRef<HTMLParagraphElement>(null);
  // After an import or Cancel, the summary goes away: keyboard focus moves to the message that replaces it.
  const tellFile = (m: string) => {
    setLoaded(null);
    setFileMessage(m);
    requestAnimationFrame(() => fileMessageRef.current?.focus());
  };
  const linkHeading = useRef<HTMLParagraphElement>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const make = async (code: boolean) => {
    setBusy(true);
    setStatus("");
    setQr(false);
    try {
      const t = makeTransfer(getState(), code ? readPlayground() : null, code, Date.now());
      const link = siteAddress() + "transfer/#" + (await encodeTransfer(t));
      setMade({ link, withCode: code });
      setStatus(`The link is ready: ${fmt(link.length)} characters.`);
      requestAnimationFrame(() => linkHeading.current?.focus());
    } finally {
      setBusy(false);
    }
  };

  const long = !!made && made.link.length > LONG_LINK;
  const qrFits = !!made && made.link.length <= QR_MAX_CHARS;

  return (
    <>
      <TransferNote />
      <h3 className="h4">A transfer link</h3>
      <fieldset className="radio-row">
        <legend>What the link includes</legend>
        <label>
          <input type="radio" name="transfer-what" value="progress" checked={!withCode} onChange={() => setWithCode(false)} /> Progress only
        </label>
        <label>
          <input type="radio" name="transfer-what" value="code" checked={withCode} onChange={() => setWithCode(true)} /> Progress and my code
        </label>
      </fieldset>
      <p className="small muted">
        {withCode
          ? "Everything in Progress only, plus the code saved in every challenge and project milestone and your Playground program. The longest link."
          : "Finished steps and challenges, project milestones, hints and attempts, drills, Deathmatch, daily answers, the placement quiz and your settings. Shorter than with code, but it grows with your progress: a QR code holds only early progress, and a progress file moves any amount."}
      </p>
      <div className="actions">
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => make(withCode)}>
          Make a transfer link
        </button>
      </div>
      {made && (
        <div className="transfer-link">
          <p ref={linkHeading} tabIndex={-1} className="transfer-length">
            {made.withCode ? "Progress and code" : "Progress only"}: a link of {fmt(made.link.length)} characters.
          </p>
          {long && <p className="banner banner-info transfer-long">Some apps cut long links like this one. To be safe, use a progress file instead (below).</p>}
          <label className="lbl" htmlFor="transfer-link-text">
            Transfer link
          </label>
          <textarea id="transfer-link-text" ref={field} className="share-link transfer-text" readOnly rows={3} value={made.link} onFocus={(e) => e.currentTarget.select()} />
          <div className="actions">
            <button
              type="button"
              className="btn"
              onClick={async () => setStatus((await copyText(made.link, field.current)) ? "Link copied. Open it on the other device." : "Copy the link from the box above.")}
            >
              <Copy className="icon" aria-hidden="true" /> Copy
            </button>
            {canShare && (
              <button
                type="button"
                className="btn"
                onClick={async () => {
                  try {
                    await navigator.share({ title: "My Java Arena progress", url: made.link });
                    setStatus("Shared.");
                  } catch (e) {
                    if ((e as Error)?.name !== "AbortError") setStatus("It couldn't be shared. Copy the link instead.");
                  }
                }}
              >
                <Share2 className="icon" aria-hidden="true" /> Share
              </button>
            )}
            <button type="button" className="btn" aria-expanded={qr} onClick={() => setQr((q) => !q)}>
              <QrCode className="icon" aria-hidden="true" /> {qr ? "Hide the QR code" : "QR code"}
            </button>
          </div>
          {qr &&
            (qrFits ? (
              <QrImage link={made.link} />
            ) : (
              <div className="qr-refused" role="status">
                <p>
                  This link is too long for a QR code that phones can scan: a QR code here holds at most {fmt(QR_MAX_CHARS)} characters, and the link has {fmt(made.link.length)}.{" "}
                  {made.withCode ? "A Progress only link is much shorter, or use a progress file." : "A QR code holds only early progress (a few modules with their drills). Use a progress file instead: it moves any amount."}
                </p>
                {made.withCode && (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={async () => {
                      setWithCode(false);
                      await make(false);
                      setQr(true);
                    }}
                  >
                    Make a Progress only link
                  </button>
                )}
              </div>
            ))}
        </div>
      )}
      <p className="visually-hidden" role="status">
        {status}
      </p>

      <h3 className="h4">A progress file</h3>
      <p className="small muted">A file with all your progress and code. Save it, move it to the other device (by email, a cloud drive or a cable), and load it there.</p>
      <div className="actions">
        <button
          type="button"
          className="btn"
          onClick={() => {
            const now = Date.now();
            download(fileName(now), fileText(makeTransfer(getState(), readPlayground(), true, now), siteAddress()));
            setFileMessage(`Your browser is saving ${fileName(now)} (usually to Downloads).`);
          }}
        >
          <Download className="icon" aria-hidden="true" /> Download a progress file
        </button>
        <LoadFile
          onLoaded={(t) => {
            setFileMessage("");
            setLoaded(t);
          }}
          onError={(m) => {
            setLoaded(null);
            setFileMessage(m);
          }}
        />
      </div>
      <p ref={fileMessageRef} tabIndex={-1} className="small transfer-file-message" role="status">
        {fileMessage}
      </p>
      {loaded && (
        <ImportReview
          transfer={loaded}
          from="file"
          onDone={tellFile}
          onCancel={() => tellFile("Nothing was changed.")}
        />
      )}
    </>
  );
}
