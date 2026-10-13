// The topics reference (/topics/): its entries' shape, as the content build writes them to
// src/generated/topics.json (scripts/content/topics.mjs), and the search of its page.

// Java's words for them (JLS 3.9 to 3.12): `null` is a literal, `@Override` an annotation, `%` an
// operator and `->` a separator; `var`, `record`, `sealed` and `yield` are (contextual) keywords.
export type TopicKind = "keyword" | "literal" | "annotation" | "operator" | "separator" | "class" | "method" | "idea" | "tool";

/** A step that teaches a topic, with what a link to it needs. */
export type TopicStep = { id: string; module: string; moduleTitle: string; slug: string; title: string };

export type Topic = {
  /** The address fragment of the entry on the page (#for, #string-format). */
  id: string;
  term: string;
  kind: TopicKind;
  /** One line; `code` in backticks. */
  about: string;
  aliases: string[];
  steps: TopicStep[];
  /** The Deathmatch topic (a module) whose drills practice it. */
  drills: { topic: string; title: string } | null;
};

/** What the page shows for each kind. */
export const KIND_LABEL: Record<TopicKind, string> = {
  keyword: "keyword",
  literal: "literal",
  annotation: "annotation",
  operator: "operator",
  separator: "separator",
  class: "class",
  method: "method",
  idea: "idea",
  tool: "tool",
};

/** The letter an entry is listed under (as scripts/content/topics.mjs sorts them): "#" for operators. */
export function topicLetter(term: string): string {
  const c = term.replace(/^@/, "").charAt(0).toUpperCase();
  return /[A-Z]/.test(c) ? c : "#";
}

/** A description's parts: plain text, and `code` (odd indexes). */
export const aboutParts = (about: string): string[] => about.split("`");

const fold = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
const startsAWord = (haystack: string, word: string) => {
  let at = haystack.indexOf(word);
  while (at !== -1) {
    if (at === 0 || !/[a-z0-9]/.test(haystack[at - 1])) return true;
    at = haystack.indexOf(word, at + 1);
  }
  return false;
};

/**
 * The entries that match what was typed, best first: a term or alias that is what was typed, then
 * those that start with it, then those that have it inside (Map finds HashMap), and last the
 * entries whose description has every typed word at the start of one of its words. Within each
 * group the A to Z order stays. Nothing typed: every entry.
 */
export function filterTopics<T extends Pick<Topic, "term" | "aliases" | "about">>(topics: T[], query: string): T[] {
  const q = fold(query);
  if (!q) return topics;
  const words = q.split(" ");
  const ranked: [number, number, T][] = [];
  topics.forEach((t, i) => {
    const names = [t.term, ...t.aliases].map(fold);
    let rank = names.some((n) => n === q) ? 0 : names.some((n) => n.startsWith(q)) ? 1 : names.some((n) => n.includes(q)) ? 2 : -1;
    if (rank < 0) {
      const text = fold([t.term, ...t.aliases, t.about].join(" "));
      if (words.every((w) => startsAWord(text, w))) rank = 3;
    }
    if (rank >= 0) ranked.push([rank, i, t]);
  });
  return ranked.sort((a, b) => a[0] - b[0] || a[1] - b[1]).map((r) => r[2]);
}

/** Java 21's API documentation, for everything the reference doesn't cover. */
export const JAVA_API_URL = "https://docs.oracle.com/en/java/javase/21/docs/api/";

/** The page's opening line, shared with the pre-rendered page (scripts/prerender.mjs). */
export const TOPICS_LEAD =
  "Java keywords, classes, methods and ideas from the lessons, A to Z, each in one line with the steps that teach it. It's a map of this course, not all of Java: for every class and method, see";

/** How many entries match, for the search's live announcement and the count under the box. */
export function matchCount(shown: number, total: number, query: string): string {
  if (!query.trim()) return `${total} topics`;
  if (shown === 0) return `No topics match "${query.trim()}".`;
  return `${shown} of ${total} topics match "${query.trim()}".`;
}
