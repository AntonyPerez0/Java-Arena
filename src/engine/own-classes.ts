// The classes, interfaces, enums and records a learner's program declares, read straight from its
// source text (nothing is compiled), so that explanations of javac's messages can name them: which
// class extends or implements which, and which methods and variables each one declares. The
// reading is rough on purpose: it only has to be right for the programs beginners write, and when
// it can't tell, an explanation falls back to its general wording.
//
// A class in a package (library.domain.Book, in the file library/domain/Book.java) is known by its
// full name, so two classes of the same simple name in different packages are kept apart; typeNamed
// finds the one a message's name means.

import type { SourceFile } from "./types";
import { baseName, declaredPackage } from "../grader/files.js";

export type OwnMember = {
  name: string;
  /** The (return) type. */
  type: string;
  method: boolean;
  private: boolean;
  static: boolean;
  abstract: boolean;
  /** A method's parameter types, as parameterTypes gives them. */
  params?: string;
};

export type OwnClass = {
  /** Its simple name, such as Book. */
  name: string;
  /** Its package, from its file's package line ("" when the file has none). */
  package: string;
  /** Its name with its package, such as library.domain.Book (Book in no package). */
  fullName: string;
  kind: "class" | "interface" | "enum" | "record";
  /** An abstract class, or an interface. */
  abstract: boolean;
  /** Declared public (public class Book): code in other packages can use it. */
  public: boolean;
  /** The simple names after extends in its header. */
  extends: string[];
  /** The simple names after implements in its header. */
  implements: string[];
  /** Both of those: the types it extends and implements, the ones after extends first. */
  supers: string[];
  /** Methods and variables declared directly in it (not in the classes inside it). */
  members: OwnMember[];
  /** Its constructors' parameter lists as written, such as "String name, int age". */
  constructors: string[];
  /** An enum's constants, in order. */
  constants: string[];
  /** Its file's path, with the folders (library/domain/Book.java). */
  file: string;
  /** The lines its declaration spans, from its header to its closing brace. */
  from: number;
  to: number;
};

export type OwnClasses = {
  /** By full name (library.domain.Book, or Book in no package). Look a type up with typeNamed. */
  types: Map<string, OwnClass>;
  /** Each file's lines, by the file's path. */
  lines: Map<string, string[]>;
  /** The same lines with comments, strings and char literals blanked out (see codeOnly). */
  code: Map<string, string[]>;
  /** Each file's package, from its package line ("" for none), by the file's path. */
  packages: Map<string, string>;
  /** Each file's imports as written, such as library.domain.Book or library.domain.* (static imports left out), by the file's path. */
  imports: Map<string, string[]>;
};

/** A file's name without its folders: Book.java for library/domain/Book.java. */
export const fileName = (path: string) => baseName(path) as string;

/** Files longer than this aren't read (a beginner's file is far shorter): explanations then use their general wording. */
const MAX_CHARS = 100_000;

/**
 * The text with comments, strings and char literals blanked out (each of their characters but line
 * breaks becomes a space, so lines and columns stay where they were), so braces in them don't count.
 */
export function codeOnly(text: string): string {
  const upTo = (end: string, from: number) => {
    const k = text.indexOf(end, from);
    return k < 0 ? text.length : k + end.length;
  };
  let out = "";
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    let end = -1;
    if (text.startsWith("//", i)) end = upTo("\n", i + 2);
    else if (text.startsWith("/*", i)) end = upTo("*/", i + 2);
    else if (text.startsWith('"""', i)) end = upTo('"""', i + 3);
    else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < text.length && text[j] !== c && text[j] !== "\n") j += text[j] === "\\" ? 2 : 1;
      end = Math.min(j + 1, text.length);
    }
    if (end < 0) {
      out += c;
      i++;
    } else {
      out += text.slice(i, end).replace(/[^\n]/g, " ");
      i = end;
    }
  }
  return out;
}

const MODIFIER_WORDS = "public|protected|private|static|final|abstract|default|synchronized|native|strictfp|transient|volatile";
const MODIFIERS = `(?:(?:${MODIFIER_WORDS})\\s+)*`;
// Type arguments nested up to three deep, such as <String, List<Integer>>. Each level stops at the
// next < or >, so a stray < (as in a < b) can't make the search scan the rest of the text again.
let ARGS = "<[^<>;{}()=]*>";
for (let depth = 1; depth < 3; depth++) ARGS = `<(?:[^<>;{}()=]|${ARGS})*>`;
// The type's name is matched atomically (a lookahead captures it, and \3 takes exactly that), so a
// long name isn't tried again at each shorter length.
const TYPE = `(?=([\\w$.]+))\\3(?:\\s*${ARGS})?(?:\\s*\\[\\s*\\])*`;
// A match starts only at the start of a word (or at <), and not right after a modifier, which the
// match starting at the first modifier covers: then a long word or a long run of modifiers is
// read once, not again from each of its characters or words.
const MEMBER = new RegExp(
  `(?<![\\w$.])(?=[\\w$<])(?<!(?<![\\w$.])(?:${MODIFIER_WORDS})\\s+)(${MODIFIERS})(?:${ARGS}\\s*)?(${TYPE})\\s+([A-Za-z_$][\\w$]*)\\s*(\\(|[;=,])`,
  "g",
);
const NOT_A_TYPE = /^(public|protected|private|static|final|abstract|default|synchronized|native|strictfp|new|return|throw|else|case)$/;
// A constructor: after a ; { or } (or the start), only access words before its name, then (...) and its body.
const CONSTRUCTOR = /(?:^|[;{}])\s*(?:(?:public|protected|private)\s+)*([A-Za-z_$][\w$]*)\s*\(([^()]*)\)\s*(?:throws\s[^{;]*)?\{/g;
// A header: the name, then up to the {. The limit keeps a missing { from making each match scan the rest of the file.
const DECLARATION = /\b(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)([^{};]{0,1000})\{/g;

/** Splits a list at the commas that aren't inside <...> or (...). */
export function splitTopLevel(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let from = 0;
  for (let k = 0; k < list.length; k++) {
    const ch = list[k];
    if (ch === "<" || ch === "(") depth++;
    else if (ch === ">" || ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(list.slice(from, k));
      from = k + 1;
    }
  }
  parts.push(list.slice(from));
  return parts;
}

/** A parameter or variable declaration without its name: "List<String>" for "final List<String> names". */
function withoutName(p: string): string {
  const s = p.trim().replace(/^(?:final\s+|@[\w$.]+(?:\s*\([^)]*\))?\s*)*/, "");
  let k = s.length;
  while (k > 0 && /[\w$]/.test(s[k - 1])) k--;
  return s.slice(0, k);
}

/** The types of a parameter list: "int,List<String>" for "int count, final List<String> names". */
export function parameterTypes(list: string): string {
  return splitTopLevel(list)
    .map((p) => withoutName(p).replace(/\s+/g, ""))
    .filter(Boolean)
    .join(",");
}

/** Removes type arguments such as <String, List<Integer>> (a < without its > stays). */
function withoutTypeArguments(s: string): string {
  const out: string[] = [];
  const opens: number[] = [];
  for (const ch of s) {
    if (ch === "<") {
      opens.push(out.length);
      out.push(ch);
    } else if (ch === ">" && opens.length) out.length = opens.pop()!;
    else out.push(ch);
  }
  return out.join("");
}

/** The simple names in a header after a word (extends, implements), up to the next such word. */
function listAfter(plain: string, word: string): string[] {
  const parts = plain.split(/\b(extends|implements|permits)\b/);
  const i = parts.indexOf(word);
  const list = i < 0 ? "" : parts[i + 1];
  if (!/^\s/.test(list) || !/^[\w$.,\s]+$/.test(list)) return [];
  return list
    .split(",")
    .map((s) => s.trim().split(".").pop() ?? "")
    .filter(Boolean);
}

function readFile(file: SourceFile, code: string, types: Map<string, OwnClass>, pkg: string) {
  const starts = [0];
  for (let k = 0; k < code.length; k++) if (code.charCodeAt(k) === 10) starts.push(k + 1);
  /** The 1-based line of a position: the number of line starts at or before it. */
  const lineAt = (index: number) => {
    let [lo, hi] = [0, starts.length - 1];
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
  // The } that closes each {, found once, so that each class's body is read without scanning the classes inside it again.
  const closes = new Map<number, number>();
  const stack: number[] = [];
  for (let k = 0; k < code.length; k++) {
    const ch = code.charCodeAt(k);
    if (ch === 123) stack.push(k);
    else if (ch === 125) {
      const o = stack.pop();
      if (o !== undefined) closes.set(o, k);
    }
  }
  // The last ; { or } before the header being read (headers come in order, so the text is scanned once).
  let separator = -1;
  let scanned = 0;
  DECLARATION.lastIndex = 0;
  for (let m; (m = DECLARATION.exec(code)); ) {
    const [, kind, name, header] = m;
    for (; scanned < m.index; scanned++) if (/[;{}]/.test(code[scanned])) separator = scanned;
    // The body: its own members, with the insides of methods and inner classes left out ({} stays).
    const open = m.index + m[0].length - 1;
    const close = closes.get(open) ?? code.length;
    const parts: string[] = [];
    let from = open + 1;
    for (let j = open + 1; j < close; j++) {
      if (code.charCodeAt(j) !== 123) continue;
      parts.push(code.slice(from, j), "{");
      const end = closes.get(j);
      if (end === undefined) {
        from = close;
        break;
      }
      parts.push("}");
      j = end;
      from = end + 1;
    }
    if (from < close) parts.push(code.slice(from, close));
    const top = parts.join("");
    const plain = withoutTypeArguments(header).replace(/\([^)]*\)/g, " ");
    const members: OwnMember[] = [];
    if (kind === "record") {
      for (const c of splitTopLevel(withoutTypeArguments(/\(([^)]*)\)/.exec(header)?.[1] ?? ""))) {
        const [, type, field] = /([\w$.\[\]]+)\s+([\w$]+)\s*$/.exec(c.trim()) ?? [];
        if (field) members.push({ name: field, type, method: false, private: true, static: false, abstract: false }, { name: field, type, method: true, private: false, static: false, abstract: false, params: "" });
      }
    }
    // Constructors, whose parameters are then blanked out, so they aren't read as variables.
    const constructors: string[] = [];
    const pieces: string[] = [];
    let kept = 0;
    CONSTRUCTOR.lastIndex = 0;
    for (let c; (c = CONSTRUCTOR.exec(top)); ) {
      if (c[1] !== name) continue;
      constructors.push(c[2].replace(/\s+/g, " ").trim());
      const at = c.index + c[0].indexOf("(") + 1;
      pieces.push(top.slice(kept, at), " ".repeat(c[2].length));
      kept = at + c[2].length;
    }
    const scan = pieces.join("") + top.slice(kept);
    MEMBER.lastIndex = 0;
    for (let f; (f = MEMBER.exec(scan)); ) {
      const [, mods, type, , member, after] = f;
      const method = after === "(";
      // Skip the parameters of a method or constructor, so they aren't read as variables.
      const open = f.index + f[0].length;
      const close = method ? scan.indexOf(")", open) : -1;
      if (method && close >= 0) MEMBER.lastIndex = Math.max(MEMBER.lastIndex, close + 1);
      if (NOT_A_TYPE.test(type.trim())) continue;
      members.push({
        name: member,
        type: type.replace(/\s+/g, " "),
        method,
        private: /\bprivate\b/.test(mods),
        static: /\bstatic\b/.test(mods),
        abstract: /\babstract\b/.test(mods),
        ...(method ? { params: parameterTypes(scan.slice(open, close < 0 ? open : close)) } : {}),
      });
    }
    // An enum's constants: the names before its first ; (each may have values in (...) and a body {}).
    const constants: string[] = [];
    if (kind === "enum") {
      const semicolon = top.search(/;/);
      for (const c of splitTopLevel(semicolon < 0 ? top : top.slice(0, semicolon))) {
        const constant = /^\s*(?:@[\w$.]+(?:\s*\([^)]*\))?\s*)*([A-Za-z_$][\w$]*)/.exec(c)?.[1];
        if (constant) constants.push(constant);
      }
    }
    const before = code.slice(separator + 1, m.index);
    const [ext, impl] = [listAfter(plain, "extends"), listAfter(plain, "implements")];
    const fullName = pkg ? `${pkg}.${name}` : name;
    types.set(fullName, {
      name,
      package: pkg,
      fullName,
      kind: kind as OwnClass["kind"],
      abstract: kind === "interface" || /\babstract\b/.test(before),
      public: /\bpublic\b/.test(before),
      extends: ext,
      implements: impl,
      supers: [...ext, ...impl],
      members,
      constructors,
      constants,
      file: file.path,
      from: lineAt(m.index),
      to: lineAt(close),
    });
  }
}

const cache = new WeakMap<SourceFile[], OwnClasses>();

/** The program's own types. Never throws: a file it can't read just adds nothing. */
export function ownClasses(sources: SourceFile[]): OwnClasses {
  let own = cache.get(sources);
  if (!own) {
    own = { types: new Map(), lines: new Map(), code: new Map(), packages: new Map(), imports: new Map() };
    for (const f of sources) {
      own.lines.set(f.path, f.text.split("\n"));
      if (f.text.length > MAX_CHARS) continue;
      try {
        const code = codeOnly(f.text);
        own.code.set(f.path, code.split("\n"));
        const pkg = (declaredPackage(code) as string | null) ?? "";
        own.packages.set(f.path, pkg);
        own.imports.set(f.path, [...code.matchAll(/^\s*import\s+(?!static\b)([\w$]+(?:\s*\.\s*(?:[\w$]+|\*))*)\s*;/gm)].map((m) => m[1].replace(/\s+/g, "")));
        readFile(f, code, own.types, pkg);
      } catch {
        // An explanation must never fail because of the source it looks at.
      }
    }
    cache.set(sources, own);
  }
  return own;
}

/**
 * The own type a name means: a full name (library.domain.Book) or a simple one (Book). When types
 * in several packages share a simple name, the one the file `from` sees is chosen as Java would (its
 * single-type imports, then its own package, then its imports of whole packages); without `from`, or
 * when that doesn't tell, there is none.
 */
export function typeNamed(own: OwnClasses, name: string, from?: string): OwnClass | undefined {
  // A simple name found as it is is a class in no package, which a file in a package doesn't see.
  const exact = own.types.get(name);
  if (exact && (name.includes(".") || !from || !own.packages.get(from))) return exact;
  const simple = name.split(".").pop() ?? name;
  const all = [...own.types.values()].filter((t) => t.name === simple);
  if (all.length <= 1) return all[0];
  if (!from) return undefined;
  const imports = own.imports.get(from) ?? [];
  const single = imports.find((i) => i.split(".").pop() === simple);
  if (single) return own.types.get(single);
  const here = all.find((t) => t.package === (own.packages.get(from) ?? ""));
  if (here) return here;
  const star = all.filter((t) => imports.includes(`${t.package}.*`));
  return star.length === 1 ? star[0] : undefined;
}

/** Whether a name is one of the program's own types (full or simple, even one that several packages share). */
export const knows = (own: OwnClasses, name: string) => own.types.has(name) || [...own.types.values()].some((t) => t.name === name);

/** Whether `sub` is `sup` or extends or implements it, directly or through other own types, as the headers say. */
export function isSubtype(own: OwnClasses, sub: string, sup: string, seen = new Set<string>()): boolean {
  if (sub === sup) return true;
  const t = typeNamed(own, sub);
  if (!t || seen.has(sub)) return false;
  seen.add(sub);
  return t.supers.some((s) => isSubtype(own, s, sup, seen));
}

/** One name in a type's header: `from` extends or implements `to`. */
export type HeaderLink = { from: OwnClass; to: string; keyword: "extends" | "implements" };

const linksOf = (t: OwnClass): HeaderLink[] => [
  ...t.extends.map((to) => ({ from: t, to, keyword: "extends" as const })),
  ...t.implements.map((to) => ({ from: t, to, keyword: "implements" as const })),
];

/**
 * Whether javac accepts a link of a header. It reports an error for the others and then leaves them
 * out: a class extends one class and implements interfaces, an interface extends interfaces, and an
 * enum or a record implements interfaces. A type that isn't one of the program's own counts as accepted.
 */
export function accepted(own: OwnClasses, link: HeaderLink): boolean {
  const to = typeNamed(own, link.to, link.from.file);
  if (!to) return true;
  if (link.keyword === "implements" || link.from.kind === "interface") return to.kind === "interface";
  return link.from.kind === "class" && to.kind !== "interface" && link.from.extends.length === 1;
}

/** Whether `sub` is `sup` for javac: like isSubtype, but only through header links javac accepts. */
export function isRealSubtype(own: OwnClasses, sub: string, sup: string, seen = new Set<string>()): boolean {
  if (sub === sup) return true;
  const t = typeNamed(own, sub);
  if (!t || seen.has(sub)) return false;
  seen.add(sub);
  return linksOf(t).some((l) => accepted(own, l) && isRealSubtype(own, l.to, sup, seen));
}

/**
 * When the headers make `sub` a `sup` only through a link javac doesn't accept (such as class Dog
 * implements Animal, with Animal a class), the first such link on the way; otherwise null. It can be
 * in the header of a type between them.
 */
export function droppedLink(own: OwnClasses, sub: string, sup: string): HeaderLink | null {
  if (!isSubtype(own, sub, sup) || isRealSubtype(own, sub, sup)) return null;
  const seen = new Set<string>();
  const walk = (name: string): HeaderLink | null => {
    const t = typeNamed(own, name);
    if (!t || seen.has(name)) return null;
    seen.add(name);
    for (const l of linksOf(t)) {
      if (!isSubtype(own, l.to, sup)) continue;
      if (!accepted(own, l)) return l;
      const below = walk(l.to);
      if (below) return below;
    }
    return null;
  };
  return walk(sub);
}

/** The own types below `name` (its subclasses, and the classes that implement it), in the order they are declared. */
export const subtypesOf = (own: OwnClasses, name: string) => [...own.types.values()].filter((t) => t.name !== name && isSubtype(own, t.name, name));

/** The own types above `name`: what it extends and implements, and what those do in turn. */
export const ancestorsOf = (own: OwnClasses, name: string) => [...own.types.values()].filter((t) => t.name !== name && isSubtype(own, name, t.name));

/**
 * The innermost own type whose declaration contains this line of this file. `file` is the file's path,
 * or its name without folders (as a stack trace writes it) when only one of the files has that name.
 */
export function classAt(own: OwnClasses, file: string, line: number): OwnClass | undefined {
  const path = own.lines.has(file) ? file : [...own.lines.keys()].filter((p) => fileName(p) === file).length === 1 ? [...own.lines.keys()].find((p) => fileName(p) === file) : file;
  let best: OwnClass | undefined;
  for (const t of own.types.values()) if (t.file === path && t.from <= line && line <= t.to && (!best || t.from >= best.from)) best = t;
  return best;
}

export const declares = (t: OwnClass | undefined, name: string, method: boolean) => !!t?.members.some((m) => m.name === name && m.method === method);
