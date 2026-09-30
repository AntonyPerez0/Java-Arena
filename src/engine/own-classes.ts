// The classes, interfaces, enums and records a learner's program declares, read straight from its
// source text (nothing is compiled), so that explanations of javac's messages can name them: which
// class extends or implements which, and which methods and variables each one declares. The
// reading is rough on purpose: it only has to be right for the programs beginners write, and when
// it can't tell, an explanation falls back to its general wording.

import type { SourceFile } from "./types";

export type OwnClass = {
  name: string;
  kind: "class" | "interface" | "enum" | "record";
  /** An abstract class, or an interface. */
  abstract: boolean;
  /** The simple names of the types it extends and implements, the class it extends first. */
  supers: string[];
  /** Methods and variables declared directly in it (not in the classes inside it), with their (return)
   * types and, for methods, their parameter types (as parameterTypes gives them). */
  members: { name: string; type: string; method: boolean; private: boolean; params?: string }[];
  /** Its file's name, without folders. */
  file: string;
  /** The lines its declaration spans, from its header to its closing brace. */
  from: number;
  to: number;
};

export type OwnClasses = {
  /** By simple name. */
  types: Map<string, OwnClass>;
  /** Each file's lines, by the file's name without folders. */
  lines: Map<string, string[]>;
};

export const fileName = (path: string) => path.split("/").pop() ?? path;

/** The text with comments, strings and char literals blanked out (line breaks kept), so braces in them don't count. */
function codeOnly(text: string): string {
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

const MODIFIERS = "(?:(?:public|protected|private|static|final|abstract|default|synchronized|native|strictfp|transient|volatile)\\s+)*";
// Type arguments nested up to three deep, such as <String, List<Integer>>. Each level stops at the
// next < or >, so a stray < (as in a < b) can't make the search scan the rest of the text again.
let ARGS = "<[^<>;{}()=]*>";
for (let depth = 1; depth < 3; depth++) ARGS = `<(?:[^<>;{}()=]|${ARGS})*>`;
const TYPE = `[\\w$.]+(?:\\s*${ARGS})?(?:\\s*\\[\\s*\\])*`;
const MEMBER = new RegExp(`(${MODIFIERS})(?:${ARGS}\\s*)?(${TYPE})\\s+([A-Za-z_$][\\w$]*)\\s*(\\(|[;=,])`, "g");
const NOT_A_TYPE = /^(public|protected|private|static|final|abstract|default|synchronized|native|strictfp|new|return|throw|else|case)$/;

/** The types of a parameter list: "int,List<String>" for "int count, final List<String> names". */
export function parameterTypes(list: string): string {
  const parts: string[] = [];
  let depth = 0;
  let part = "";
  for (const ch of list) {
    if (ch === "," && depth === 0) {
      parts.push(part);
      part = "";
      continue;
    }
    if (ch === "<") depth++;
    else if (ch === ">") depth--;
    part += ch;
  }
  parts.push(part);
  return parts
    .map((p) => p.trim().replace(/^(?:(?:final|@[\w$.]+)\s+)*/, "").replace(/\s*[\w$]+$/, "").replace(/\s+/g, ""))
    .filter(Boolean)
    .join(",");
}

/** Removes type arguments such as <String, List<Integer>>. */
function withoutTypeArguments(s: string): string {
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^<>]*>/g, "");
  } while (s !== prev);
  return s;
}

function readFile(file: SourceFile, types: Map<string, OwnClass>) {
  const code = codeOnly(file.text);
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
  const decl = /\b(class|interface|enum|record)\s+([A-Za-z_$][\w$]*)([^{};]*)\{/g;
  for (let m; (m = decl.exec(code)); ) {
    const [, kind, name, header] = m;
    // The body: its own members, with the insides of methods and inner classes left out.
    const open = m.index + m[0].length - 1;
    let depth = 0;
    let top = "";
    let close = code.length;
    for (let j = open; j < code.length; j++) {
      const ch = code[j];
      if (ch === "{") {
        if (++depth === 2) top += "{";
      } else if (ch === "}") {
        if (--depth === 1) top += "}";
        if (depth === 0) {
          close = j;
          break;
        }
      } else if (depth === 1) top += ch;
    }
    const plain = withoutTypeArguments(header);
    const listAfter = (word: string) =>
      (new RegExp(`\\b${word}\\s+([\\w$.,\\s]+?)\\s*(?:\\bimplements\\b|\\bpermits\\b|$)`).exec(plain.replace(/\([^)]*\)/g, " "))?.[1] ?? "")
        .split(",")
        .map((s) => s.trim().split(".").pop() ?? "")
        .filter(Boolean);
    const members: OwnClass["members"] = [];
    if (kind === "record") {
      for (const c of withoutTypeArguments(/\(([^)]*)\)/.exec(header)?.[1] ?? "").split(",")) {
        const [, type, field] = /([\w$.\[\]]+)\s+([\w$]+)\s*$/.exec(c.trim()) ?? [];
        if (field) members.push({ name: field, type, method: false, private: true }, { name: field, type, method: true, private: false, params: "" });
      }
    }
    MEMBER.lastIndex = 0;
    for (let f; (f = MEMBER.exec(top)); ) {
      const [, mods, type, member, after] = f;
      const method = after === "(";
      // Skip the parameters of a method or constructor, so they aren't read as variables.
      const open = f.index + f[0].length;
      const close = method ? top.indexOf(")", open) : -1;
      if (method && close >= 0) MEMBER.lastIndex = Math.max(MEMBER.lastIndex, close + 1);
      if (NOT_A_TYPE.test(type.trim())) continue;
      members.push({ name: member, type: type.replace(/\s+/g, " "), method, private: /\bprivate\b/.test(mods), ...(method ? { params: parameterTypes(top.slice(open, close < 0 ? open : close)) } : {}) });
    }
    const before = code.slice(Math.max(code.lastIndexOf(";", m.index), code.lastIndexOf("{", m.index), code.lastIndexOf("}", m.index)) + 1, m.index);
    types.set(name, {
      name,
      kind: kind as OwnClass["kind"],
      abstract: kind === "interface" || /\babstract\b/.test(before),
      supers: [...listAfter("extends"), ...listAfter("implements")],
      members,
      file: fileName(file.path),
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
    own = { types: new Map(), lines: new Map() };
    for (const f of sources) {
      own.lines.set(fileName(f.path), f.text.split("\n"));
      try {
        readFile(f, own.types);
      } catch {
        // An explanation must never fail because of the source it looks at.
      }
    }
    cache.set(sources, own);
  }
  return own;
}

/** Whether `sub` is `sup` or extends or implements it, directly or through other own types. */
export function isSubtype(own: OwnClasses, sub: string, sup: string, seen = new Set<string>()): boolean {
  if (sub === sup) return true;
  const t = own.types.get(sub);
  if (!t || seen.has(sub)) return false;
  seen.add(sub);
  return t.supers.some((s) => isSubtype(own, s, sup, seen));
}

/** The own types below `name` (its subclasses, and the classes that implement it), in the order they are declared. */
export const subtypesOf = (own: OwnClasses, name: string) => [...own.types.values()].filter((t) => t.name !== name && isSubtype(own, t.name, name));

/** The own types above `name`: what it extends and implements, and what those do in turn. */
export const ancestorsOf = (own: OwnClasses, name: string) => [...own.types.values()].filter((t) => t.name !== name && isSubtype(own, name, t.name));

/** The innermost own type whose declaration contains this line of this file. */
export function classAt(own: OwnClasses, file: string, line: number): OwnClass | undefined {
  let best: OwnClass | undefined;
  for (const t of own.types.values()) if (t.file === fileName(file) && t.from <= line && line <= t.to && (!best || t.from >= best.from)) best = t;
  return best;
}

export const declares = (t: OwnClass | undefined, name: string, method: boolean) => !!t?.members.some((m) => m.name === name && m.method === method);
