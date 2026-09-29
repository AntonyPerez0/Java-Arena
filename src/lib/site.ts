// Where the project lives. Reports, the footer and canonical links use these.
export const REPO = "AntonyPerez0/Java-Arena";
export const REPO_URL = `https://github.com/${REPO}`;
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

/** A link that opens a pre-filled GitHub issue. Long code is cut so the address stays within browser limits. */
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
  const q = new URLSearchParams({ title: `[${r.kind}] ${r.title}`, body });
  return `${REPO_URL}/issues/new?${q.toString()}`;
}
