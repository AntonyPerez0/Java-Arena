import { Flag } from "lucide-react";
import { reportUrl, type ReportInfo } from "../lib/site";

/** "Report a problem": opens a pre-filled GitHub issue in a new tab. */
export default function ReportLink({ info }: { info: () => ReportInfo }) {
  // The address is built when the link is used, so it carries the latest code and result.
  const refresh = (e: { currentTarget: HTMLAnchorElement }) => {
    e.currentTarget.href = reportUrl(info());
  };
  return (
    <a className="report-link" href="https://github.com/AntonyPerez0/Java-Arena/issues/new" target="_blank" rel="noopener noreferrer" onClick={refresh} onAuxClick={refresh} onFocus={refresh} onMouseEnter={refresh}>
      <Flag className="icon" aria-hidden="true" /> Report a problem<span className="visually-hidden"> (opens GitHub in a new tab)</span>
    </a>
  );
}
