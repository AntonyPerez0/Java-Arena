// The topics reference (/topics/): content/topics.yaml, checked against the lessons by the content
// build (scripts/build-content.mjs), so the reference can't drift from what the steps teach.
//
// Each entry of content/topics.yaml:
//   term     what the reader looks for: `for`, `ArrayList`, `String.format`, recursion
//   kind     keyword, literal, annotation, operator, separator, class, method, idea or tool
//   about    one plain line saying what it is (inline `code` allowed)
//   steps    one to three step ids of the steps that teach it, the first one first
//   aliases  other spellings the search also finds (optional; the check doesn't use them)
//   check    phrases the check accepts in place of the term (optional), each one specific: it may
//            be in at most 5% of all the steps (MAX_CHECK_SHARE), so a general word can't pass
//   drills   a Deathmatch topic (a module id with drills) that practices it (optional)
//
// The check: every step id exists, and the term or one of its check phrases appears in each step.
// For a keyword, a literal, an annotation, an operator, a separator, a class or a method, that
// means in the step's code: its examples and inline code, its starting code and its model
// solutions, with the same capitals and as a whole word. For an idea or a tool, anywhere in the
// step's text or code, in any capitals, as a word (a plural "s" or "es" allowed).
//
// Each entry's address (#for, #string-format) is its term's slug. Terms that differ only in
// capitals (Map and map) share a slug: the entry whose kind comes first in SLUG_ORDER keeps it and
// the others get their kind added (#map-method), whatever the order of the file. A slug the page
// or the app already uses as an id (RESERVED_SLUG) is an error.

import { KIND_LABEL, topicLetter } from "../../src/lib/topics.ts";

export { topicLetter };

/** The kinds of entries, with the label the page shows. All but ideas and tools are looked for in code. */
export const TOPIC_KINDS = KIND_LABEL;
export const CODE_KINDS = new Set(["keyword", "literal", "annotation", "operator", "separator", "class", "method"]);
/** Which entry keeps a shared slug: the one whose kind comes first. */
const SLUG_ORDER = ["class", "keyword", "literal", "annotation", "operator", "separator", "method", "idea", "tool"];
/** Ids the app shell and the topics page already use: <main id="main">, #main-nav, #root, #topics-q, #letter-A. */
export const RESERVED_SLUG = /^(?:main|main-nav|root|topics-.*|letter-.*)$/;
/** The largest share of all the steps that a check phrase may be in (at least 3 steps). */
export const MAX_CHECK_SHARE = 0.05;
/** The most steps an entry may link to. */
export const MAX_TOPIC_STEPS = 3;
/** The longest description, in characters. */
export const MAX_ABOUT = 180;

const SYMBOL_NAMES = { "%": "percent", "&": "and", "|": "or", "!": "not", "=": "equals", "+": "plus", "-": "minus", ">": "greater", "<": "less", ":": "colon" };

/**
 * The address fragment of an entry: its term in lower case, letters and digits, with hyphens
 * between (a term of symbols only gets their names: ++ is plus-plus).
 */
export function topicSlug(term) {
  const slug = String(term)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || [...String(term)].map((c) => SYMBOL_NAMES[c] ?? c.codePointAt(0).toString(16)).join("-");
}

/** Sorts entries A to Z by term, ignoring capitals and a leading @; symbols first. */
export function compareTopics(a, b) {
  const key = (t) => (topicLetter(t.term) === "#" ? "0" : "1") + t.term.replace(/^@/, "").toLowerCase();
  const ka = key(a);
  const kb = key(b);
  return ka < kb ? -1 : ka > kb ? 1 : a.term < b.term ? -1 : a.term > b.term ? 1 : 0;
}

const FENCE = /^[ \t]*(```+|~~~+)[^\n]*\n([\s\S]*?)^[ \t]*\1[ \t]*$/gm;
const INLINE = /(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/g;

/** The code of a piece of Markdown: its fenced blocks and inline code spans, one per line. */
export function markdownCode(md) {
  const text = String(md ?? "");
  const out = [];
  const rest = text.replace(FENCE, (_, _f, body) => {
    out.push(body);
    return "\n";
  });
  for (const m of rest.matchAll(INLINE)) out.push(m[2]);
  return out.join("\n");
}

/**
 * A step's words, for the check: `all` is its whole text (the lesson, its tasks and its code) and
 * `code` only its code (the lesson's and the tasks' code blocks and inline code, the starting code
 * and the model solutions, of the step's own challenge and the others).
 */
export function stepSources(step) {
  const challenges = [step, ...(Array.isArray(step.more) ? step.more : [])];
  const md = [step.text, ...challenges.map((c) => c.task)].filter((x) => typeof x === "string");
  const programs = challenges.flatMap((c) => [c.seed, c.solution]).filter((x) => typeof x === "string");
  const code = [...md.map(markdownCode), ...programs].join("\n");
  return { all: [step.title ?? "", ...md, ...programs].join("\n"), code };
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordy = (c) => /[A-Za-z0-9_$]/.test(c);

/** Whether `needle` appears in a step's sources, as the entry's kind asks (see the top of this file). */
export function mentions(needle, kind, sources) {
  const n = String(needle);
  if (!n) return false;
  if (CODE_KINDS.has(kind)) {
    const re = new RegExp((wordy(n[0]) ? "(?<![A-Za-z0-9_$])" : "") + escapeRe(n) + (wordy(n[n.length - 1]) ? "(?![A-Za-z0-9_$])" : ""));
    return re.test(sources.code);
  }
  const re = new RegExp((wordy(n[0]) ? "(?<![A-Za-z0-9_])" : "") + escapeRe(n) + (wordy(n[n.length - 1]) ? "(?:s|es)?(?![A-Za-z0-9_])" : ""), "i");
  return re.test(sources.all);
}

const isText = (x) => typeof x === "string" && x.trim() !== "";
const validTerm = (t) => t && typeof t === "object" && !Array.isArray(t) && isText(t.term) && t.term === t.term.trim() && !/\n/.test(t.term);

/**
 * Each entry's address, by its index in the file: its term's slug, and for terms that share one
 * (Map and map), the slug for the entry whose kind comes first in SLUG_ORDER and the slug plus
 * "-" and the kind for the others, so the order of the file doesn't matter. `clash` names the
 * entry whose address is the same (two entries of one kind, or a term whose slug is another's
 * slug with a kind added).
 */
function assignSlugs(raw) {
  const groups = new Map();
  raw.forEach((t, i) => {
    if (!validTerm(t)) return;
    const bare = topicSlug(t.term);
    if (!groups.has(bare)) groups.set(bare, []);
    groups.get(bare).push(i);
  });
  const rank = (i) => {
    const k = SLUG_ORDER.indexOf(raw[i].kind);
    return k === -1 ? SLUG_ORDER.length : k;
  };
  const out = new Map();
  const owner = new Map();
  for (const [bare, list] of groups) {
    const sorted = [...list].sort((a, b) => rank(a) - rank(b) || (raw[a].term < raw[b].term ? -1 : raw[a].term > raw[b].term ? 1 : 0));
    const kinds = new Map();
    sorted.forEach((i, n) => {
      const kind = Object.hasOwn(TOPIC_KINDS, raw[i].kind) ? raw[i].kind : "topic";
      // Two of one kind (Foo and FOO, both classes) can't be told apart by their kind.
      out.set(i, { slug: n === 0 ? bare : `${bare}-${kind}`, clash: kinds.has(kind) ? raw[kinds.get(kind)].term : null });
      if (!kinds.has(kind)) kinds.set(kind, i);
    });
  }
  // Same addresses, reported on the later entry of the file.
  for (const i of [...out.keys()].sort((a, b) => a - b)) {
    const e = out.get(i);
    if (e.clash) continue;
    if (owner.has(e.slug)) e.clash = raw[owner.get(e.slug)].term;
    else owner.set(e.slug, i);
  }
  return out;
}

/**
 * Checks content/topics.yaml (as parsed) against the course. `steps` maps each step id to
 * { step, module } (the built step, with its text, tasks and code, and its module's id and title);
 * `drillTopics` maps each Deathmatch topic with drills to its title. Returns the entries, sorted A
 * to Z, as the site uses them, and the problems found (as messages).
 */
export function checkTopics(raw, { steps, drillTopics }) {
  const errors = [];
  const topics = [];
  if (!Array.isArray(raw)) return { topics, errors: ["content/topics.yaml must be a list of topics"] };
  const terms = new Set();
  const sources = new Map();
  const sourcesOf = (id) => {
    if (!sources.has(id)) sources.set(id, stepSources(steps.get(id).step));
    return sources.get(id);
  };
  // How many of all the steps have a check phrase, to keep out the general ones.
  const maxCheckSteps = Math.max(3, Math.floor(steps.size * MAX_CHECK_SHARE));
  const spread = new Map();
  const stepsWith = (needle, kind) => {
    const key = `${kind}\n${needle}`;
    if (!spread.has(key)) spread.set(key, [...steps.keys()].filter((id) => mentions(needle, kind, sourcesOf(id))).length);
    return spread.get(key);
  };
  const slugOf = assignSlugs(raw);
  raw.forEach((t, i) => {
    const where = `content/topics.yaml, topic ${i + 1}${t && isText(t.term) ? ` (${t.term})` : ""}`;
    if (!t || typeof t !== "object" || Array.isArray(t)) {
      errors.push(`${where}: must be a map with term, kind, about and steps`);
      return;
    }
    const known = new Set(["term", "kind", "about", "steps", "aliases", "check", "drills"]);
    for (const k of Object.keys(t)) if (!known.has(k)) errors.push(`${where}: unknown field ${k} (a topic has ${[...known].join(", ")})`);
    if (!isText(t.term) || t.term !== t.term.trim() || /\n/.test(t.term)) {
      errors.push(`${where}: needs a term, one line without spaces around it`);
      return;
    }
    if (terms.has(t.term)) errors.push(`${where}: the term ${t.term} is in the list twice; make it one entry`);
    terms.add(t.term);
    const { slug, clash } = slugOf.get(i);
    if (clash) errors.push(`${where}: its address #${slug} is the same as ${clash}'s; use one entry, or another term`);
    if (RESERVED_SLUG.test(slug)) errors.push(`${where}: its address #${slug} is an id the site already uses (main, main-nav, root, topics-..., letter-...); use another term`);
    if (!Object.hasOwn(TOPIC_KINDS, t.kind)) errors.push(`${where}: kind must be one of ${Object.keys(TOPIC_KINDS).join(", ")}`);
    const about = typeof t.about === "string" ? t.about.trim() : "";
    if (!about) errors.push(`${where}: needs about, a one-line description`);
    else {
      if (/\n/.test(about)) errors.push(`${where}: about must be one line`);
      if (about.length > MAX_ABOUT) errors.push(`${where}: about is ${about.length} characters; keep it to ${MAX_ABOUT}`);
      if (!/[.!?]$/.test(about)) errors.push(`${where}: about must be a sentence that ends with a period`);
      if (/[\u2013\u2014]/.test(about)) errors.push(`${where}: about has a dash (an en or em dash); write it with a comma, a colon or two sentences`);
      if ((about.match(/`/g) ?? []).length % 2) errors.push(`${where}: about has an unclosed \` (inline code)`);
    }
    const aliases = t.aliases ?? [];
    if (!Array.isArray(aliases) || !aliases.every(isText)) errors.push(`${where}: aliases must be a list of words`);
    const check = t.check ?? [];
    if (!Array.isArray(check) || !check.every(isText)) errors.push(`${where}: check must be a list of phrases`);
    const phrases = Array.isArray(check) ? check.filter(isText) : [];
    if (Object.hasOwn(TOPIC_KINDS, t.kind))
      for (const n of phrases) {
        const count = stepsWith(n, t.kind);
        if (count > maxCheckSteps) errors.push(`${where}: the check phrase ${JSON.stringify(n)} is in ${count} of the ${steps.size} steps, too many to show that a step teaches ${t.term}; use a phrase that only the steps teaching it have (at most ${maxCheckSteps})`);
      }
    const ids = t.steps;
    if (!Array.isArray(ids) || !ids.length || !ids.every(isText)) {
      errors.push(`${where}: steps must list one to ${MAX_TOPIC_STEPS} step ids`);
      return;
    }
    if (ids.length > MAX_TOPIC_STEPS) errors.push(`${where}: lists ${ids.length} steps; at most ${MAX_TOPIC_STEPS}, the ones that really teach it`);
    if (new Set(ids).size !== ids.length) errors.push(`${where}: lists a step twice`);
    const needles = [t.term, ...phrases];
    const linked = [];
    for (const id of ids) {
      const s = steps.get(id);
      if (!s) {
        errors.push(`${where}: there's no step ${id}`);
        continue;
      }
      if (Object.hasOwn(TOPIC_KINDS, t.kind) && !needles.some((n) => mentions(n, t.kind, sourcesOf(id)))) {
        const place = CODE_KINDS.has(t.kind) ? "code" : "text or code";
        errors.push(`${where}: the step ${id} doesn't have ${needles.map((n) => JSON.stringify(n)).join(" or ")} in its ${place}, so it can't be the step that teaches it`);
      }
      linked.push({ id, module: s.module.id, moduleTitle: s.module.title, slug: s.step.slug, title: s.step.title });
    }
    let drills = null;
    if (t.drills != null) {
      if (!isText(t.drills) || !drillTopics.has(t.drills)) errors.push(`${where}: drills must be a Deathmatch topic with drills (a module id), not ${JSON.stringify(t.drills)}`);
      else drills = { topic: t.drills, title: drillTopics.get(t.drills) };
    }
    topics.push({ id: slug, term: t.term, kind: t.kind, about, aliases: Array.isArray(aliases) ? aliases.filter(isText) : [], steps: linked, drills });
  });
  topics.sort(compareTopics);
  return { topics, errors };
}
