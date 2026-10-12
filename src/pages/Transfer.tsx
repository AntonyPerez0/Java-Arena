// /transfer/: where a transfer link opens (/transfer/#p=...). It reads the link in this browser,
// shows what importing would change, and imports only when the learner chooses Merge or Replace.
// Afterwards the #p= part is removed from the address, so a reload doesn't offer it again.
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTitle } from "../lib/title";
import { TransferError, decodeTransfer, isTransferHash, type Transfer as TransferData } from "../lib/transfer";
import { ImportReview, LoadFile, TransferNote } from "../components/Transfer";

type View = { kind: "none" } | { kind: "reading" } | { kind: "review"; t: TransferData; from: "link" | "file" } | { kind: "error"; message: string } | { kind: "done"; message: string };

export default function Transfer() {
  useTitle("Move your progress");
  const { hash, pathname } = useLocation();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(() => (isTransferHash(hash) ? { kind: "reading" } : { kind: "none" }));
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isTransferHash(hash)) return;
    let current = true;
    setView({ kind: "reading" });
    decodeTransfer(hash).then(
      (t) => current && setView({ kind: "review", t, from: "link" }),
      (e) => current && setView({ kind: "error", message: e instanceof TransferError ? e.message : "This transfer link couldn't be read, so nothing was changed." }),
    );
    return () => {
      current = false;
    };
  }, [hash]);

  // The link has been used (or turned down): take it out of the address (history.replaceState).
  const dropLink = () => {
    if (isTransferHash(window.location.hash)) navigate({ pathname, search: "" }, { replace: true });
  };
  const finish = (message: string) => {
    dropLink();
    setView({ kind: "done", message });
    requestAnimationFrame(() => messageRef.current?.focus());
  };

  return (
    <div className="narrow transfer-page">
      <div className="page-head">
        <h1>Move your progress</h1>
        <p className="muted">A transfer link from Settings opens this page on the device you're moving to. Your progress comes in only when you choose Merge or Replace.</p>
      </div>
      <section className="card" aria-label="Import">
        {view.kind === "reading" && <p role="status">Reading the transfer link...</p>}
        {view.kind === "review" && <ImportReview transfer={view.t} from={view.from} headingLevel={2} onDone={finish} onCancel={() => finish("Nothing was changed.")} />}
        {view.kind === "error" && (
          <div className="banner banner-fail transfer-error" role="alert">
            {view.message}
          </div>
        )}
        {view.kind === "done" && (
          <div ref={messageRef} tabIndex={-1} className="transfer-done" role="status">
            <p>{view.message}</p>
          </div>
        )}
        {view.kind === "done" && (
          <div className="actions">
            <Link className="btn btn-primary" to="/learn/">
              Continue learning
            </Link>
            <Link className="btn" to="/settings/">
              Settings
            </Link>
          </div>
        )}
        {(view.kind === "none" || view.kind === "error") && (
          <>
            {view.kind === "none" && <p>There's no transfer link in this address. Make one in Settings, under Your progress, on the device that has your progress, then open it here.</p>}
            <p>You can also load a progress file:</p>
            <div className="actions">
              <LoadFile onLoaded={(t) => setView({ kind: "review", t, from: "file" })} onError={(message) => setView({ kind: "error", message })} />
              <Link className="btn btn-ghost" to="/settings/#your-progress">
                Your progress in Settings
              </Link>
            </div>
          </>
        )}
      </section>
      <TransferNote />
    </div>
  );
}
