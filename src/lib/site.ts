// Where the project's source lives: the footer's and the About page's source, license and notice links.
export const REPO = "AntonyPerez0/Java-Arena";
export const REPO_URL = `https://github.com/${REPO}`;

// Set by vite.config.ts from REPORT_URL at build time; null when it isn't set (and undefined in the unit tests).
declare const __REPORT_URL__: string | null | undefined;
/**
 * Where "Report a problem" goes. A copy hosted by someone else sets REPORT_URL when it builds (see
 * "Hosting your own copy" in docs/development.md); the default is this repository's issues.
 */
export const REPORT_URL: string = (typeof __REPORT_URL__ === "string" && __REPORT_URL__) || `${REPO_URL}/issues/new`;
/** Whether reports open a GitHub issue (the link's screen-reader text says so). */
export const REPORT_ON_GITHUB = isGitHubIssue(REPORT_URL);

function isGitHubIssue(target: string): boolean {
  return /^https:\/\/github\.com\/[^/?#]+\/[^/?#]+\/issues\/new\/?$/.test(target);
}
export const SITE_NAME = "Java Arena";
export const MOOC_URL = "https://java-programming.mooc.fi";
export const MOOC_LICENSE_URL = "https://creativecommons.org/licenses/by-nc-sa/4.0/";

export type ReportInfo = {
  /** What the learner was on, for example "Lesson step". */
  kind: string;
  /** Short name for the issue title. */
  title: string;
  /** Stable id (step id and challenge number). */
  id: string;
  /** Page address inside the site, if there is one. */
  path?: string;
  code?: string;
  /** The latest result, for example "2 of 3 tests failed". */
  result?: string;
};

/** A link that opens a pre-filled report at REPORT_URL. Long code is cut so the address stays within browser limits. */
export function reportUrl(r: ReportInfo): string {
  const code = r.code ? (r.code.length > 3500 ? r.code.slice(0, 3500) + "\n/* ...cut... */" : r.code) : "";
  const page = r.path ? new URL(import.meta.env.BASE_URL + r.path.replace(/^\//, ""), location.origin).href : "";
  const body = [
    `**${r.kind}:** ${r.title}`,
    `**ID:** \`${r.id}\``,
    page ? `**Page:** ${page}` : "",
    "",
    "**What went wrong?**",
    "<!-- For example: my correct answer was marked wrong, a hint is confusing, a typo, the explanation is unclear. -->",
    "",
    "",
    r.result ? `**Last result:** ${r.result}` : "",
    code ? "**My code:**\n```java\n" + code.replace(/\n$/, "") + "\n```" : "",
    "",
    `<sub>Browser: ${typeof navigator !== "undefined" ? navigator.userAgent : "unknown"}</sub>`,
  ]
    .filter((l, i, a) => l !== "" || a[i - 1] !== "")
    .join("\n");
  return reportAddress(REPORT_URL, `[${r.kind}] ${r.title}`, body);
}

/**
 * The report's address at `target`: a GitHub "new issue" address gets the title and body filled in, a
 * mailto: address the subject and body, and any other address (a form, a page) is used as it is.
 */
export function reportAddress(target: string, title: string, body: string): string {
  if (isGitHubIssue(target)) return `${target}?${new URLSearchParams({ title, body }).toString()}`;
  if (/^mailto:/i.test(target) && !target.includes("?")) return `${target}?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
  return target;
}
