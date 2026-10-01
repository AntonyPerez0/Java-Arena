// Why the hidden check program (ArenaCheck) couldn't call the learner's methods, in plain English.
// The check program is generated, so its own javac messages would only confuse: each one is turned
// into a sentence about the learner's code, naming the call the check makes.
import type { Diagnostic } from "../engine/client";
import { CHECK_FILE, stripForRules } from "./assemble.js";
import { baseName, declaredPackage, splitFiles } from "./files.js";

type Range = { from: number; to: number };

const code = (s: string) => "`" + s.replace(/`/g, "'") + "`";
const oneLine = (s: string) => s.trim().split("\n").map((l) => l.trim()).join(" ");

type File = { path: string; text: string };

/** The keyword a type is declared with in the code (class, interface, enum or record), or null when no type has that name. */
function typeKind(code: string, name: string): string | null {
  return new RegExp(`\\b(class|interface|enum|record)\\s+${name.replace(/\$/g, "\\$")}\\b`).exec(code)?.[1] ?? null;
}

/** The learner's file that declares the type, with its code (comments and strings left out). */
function fileOfType(source: string, name: string): { path: string; code: string } | undefined {
  for (const f of splitFiles(source) as File[]) {
    const code = stripForRules(f.text);
    if (typeKind(code, name)) return { path: f.path, code };
  }
  return undefined;
}

/** What a member is, as in "the constructor of `Item`", "your method `price` in `Item`" or "your variable `price` in `Item`". */
function memberOf(name: string, method: boolean, owner: string): string {
  if (method && name === owner) return `the constructor of ${code(name)}`;
  return `your ${method ? "method" : "variable"} ${code(name)} in ${code(owner)}`;
}

/**
 * A problem with the whole class rather than one call: the class isn't `Main`, sits in a package,
 * or can't be built on. One sentence, or null. Later errors are only its consequences.
 */
function classProblem(diags: Diagnostic[], source: string): string | null {
  for (const d of diags) {
    if (d.kind !== "error" || d.file !== CHECK_FILE) continue;
    if ((d.code === "compiler.err.cant.access" && /\bMain\b/.test(d.message)) || (d.code === "compiler.err.cant.resolve" && /class Main\b/.test(d.message))) {
      // Main is in no package: a package line in Main.java hides it (files in folders have theirs, as they should).
      const files = splitFiles(source) as { path: string; text: string }[];
      const main = files.find((f) => f.path === "Main.java");
      if (main && declaredPackage(stripForRules(main.text)) !== "") return `The check can't find your class: remove the ${code("package")} line at the top${files.length > 1 ? ` of ${code("Main.java")}` : ""}, so the class is simply ${code("Main")}.`;
      return `The check can't find your class: it must be called ${code("Main")}, as in ${code("public class Main {")}.`;
    }
    if (d.code === "compiler.err.duplicate.class") return `Your code has a class called ${code("ArenaCheck")}, a name the check uses for itself. Give your class another name.`;
    if (d.code === "compiler.err.cant.inherit.from.final") return `The check can't use your code: your class is ${code("final")}, and the check needs to build on it. Leave out ${code("final")}.`;
    if (/constructor Main/.test(d.message) || (d.code === "compiler.err.report.access" && /Main\(\)/.test(d.message))) return `The check can't use your code: it needs to build on your class, and your ${code("Main")} has a constructor it can't use. These exercises don't need a constructor, so remove it.`;
  }
  return null;
}

/** What went wrong, as the end of a sentence that starts "The check runs `call`, but ". */
function reason(d: Diagnostic, source: string): string {
  const msg = d.message;
  // Comments and strings don't count when looking at the learner's code.
  const code_ = stripForRules(source);
  switch (d.code) {
    case "compiler.err.cant.resolve.location.args": {
      const m = /method (\w+)\(([^)]*)\)/.exec(msg);
      if (!m) break;
      const [, name, types] = m;
      // A method called on an object: the location names the object's class.
      const owner = /location:\s+(?:variable \w+ of type|class) ([\w$]+)/.exec(msg)?.[1];
      if (new RegExp(`\\bprivate\\b[^;{}=]*\\b${name}\\s*\\(`).test(code_)) return `your ${code(name)} is ${code("private")}, so only code inside Main can call it. Leave out ${code("private")}.`;
      const other = [...code_.matchAll(/\b(\w+)\s*\(/g)].map((x) => x[1]).find((n) => n !== name && n.toLowerCase() === name.toLowerCase());
      if (other) return `your method is called ${code(other)}. Java tells capital and small letters apart: name it ${code(name)}.`;
      return `${code(owner && owner !== "ArenaCheck" ? owner : "Main")} has no method ${code(`${name}(${types})`)}. Check the method's name, and that it takes the parameters the task asks for.`;
    }
    case "compiler.err.cant.resolve.location": {
      const cls = /symbol:\s+class (\w+)/.exec(msg)?.[1];
      // A class in a package that isn't public: the check, outside the package, can't import it.
      const hidden = cls && (splitFiles(source) as File[]).find((f) => f.path.includes("/") && baseName(f.path) === `${cls}.java` && !new RegExp(`\\bpublic\\s+(?:\\w+\\s+)*(?:class|interface|enum|record)\\s+${cls}\\b`).test(stripForRules(f.text)));
      if (cls && hidden) {
        const kind = typeKind(stripForRules(hidden.text), cls) ?? "class";
        return `your ${kind} ${code(cls)} (in ${code(hidden.path)}) isn't ${code("public")}, so code outside its package (Main, and the check) can't use it. Write ${code(`public ${kind} ${cls}`)}.`;
      }
      if (cls) return `there's no class ${code(cls)}. Check the class's name (capital letters count) and that its file is ${code(cls + ".java")}.`;
      const field = /symbol:\s+variable (\w+)/.exec(msg)?.[1];
      const owner = /location:\s+(?:variable \w+ of type|class) ([\w$]+)/.exec(msg)?.[1];
      if (field && owner && owner !== "ArenaCheck") return `${code(owner)} has no variable ${code(field)} that the check can use. Check its name.`;
      break;
    }
    case "compiler.err.cant.apply.symbol": {
      const name = /method (\w+) in class/.exec(msg)?.[1];
      const req = /required: (.*)/.exec(msg)?.[1]?.trim();
      const found = /found:\s+(.*)/.exec(msg)?.[1]?.trim();
      const ctor = /constructor (\w+) in class/.exec(msg)?.[1];
      if (ctor && req && found) return `the constructor of ${code(ctor)} takes ${req === "no arguments" ? "no parameters" : code(req)}, and the check gives it ${found === "no arguments" ? "none" : code(found)}. Check the constructor's parameters.`;
      if (name && req && found) return `your ${code(name)} takes ${req === "no arguments" ? "no parameters" : code(req)}, and the check gives it ${found === "no arguments" ? "none" : code(found)}. Check the method's parameters.`;
      break;
    }
    case "compiler.err.cant.apply.symbols": {
      const ctor = /no suitable constructor found for (\w+)\(/.exec(msg)?.[1];
      if (ctor) return `none of the constructors of ${code(ctor)} takes these arguments. Check the constructor's parameters against the task.`;
      return `none of your methods with that name takes these arguments. Check the parameters the task asks for.`;
    }
    case "compiler.err.prob.found.req": {
      const m = /incompatible types: (.*)/.exec(msg);
      if (m) return `the types don't fit (${code(m[1])}). Check the method's parameter types and its return type.`;
      break;
    }
    case "compiler.err.non-static.cant.be.ref": {
      const name = /method (\w+)\(/.exec(msg)?.[1];
      return `${name ? `your ${code(name)}` : "the method"} isn't ${code("static")}. The methods in these lessons are ${code("public static")}, like ${code("main")}.`;
    }
    case "compiler.err.not.def.public.cant.access": {
      // Something without public, used from outside its package (the check is in no package, as Main
      // is). javac words a class of a package ("Item is not public in shop.model") and a member of a
      // class ("price is not public in Item", "Part is not public in Item") the same way.
      const m = /^([\w$.]+(?:\([^)]*\))?) is not public in ([\w$.]+); cannot be accessed from outside package/.exec(msg);
      if (!m) break;
      const [, what, where] = m;
      const owner = where.split(".").pop() ?? where;
      if (what.endsWith(")")) return `${memberOf(what.replace(/\(.*$/, ""), true, owner)} isn't ${code("public")}, so code outside its package (Main, and the check) can't call it. Write ${code("public")} in front of it.`;
      const name = what.split(".").pop() ?? what;
      // `where` is a package when one of the learner's files declares it in its package line.
      const inPackage = (splitFiles(source) as File[]).map((f) => stripForRules(f.text)).filter((c) => declaredPackage(c) === where);
      if (inPackage.length) {
        const kind = typeKind(inPackage.join("\n"), name) ?? "class";
        return `your ${kind} ${code(name)} in the package ${code(where)} isn't ${code("public")}, so code outside the package (Main, and the check) can't use it. Write ${code("public")} in front of it: ${code(`public ${kind} ${name}`)}.`;
      }
      // Otherwise it's a class, and `name` a variable or a type declared inside it.
      if (!typeKind(code_, owner)) break;
      const kind = typeKind(code_, name);
      const which = kind ? `your ${kind} ${code(name)} inside ${code(owner)}` : `your variable ${code(name)} in ${code(owner)}`;
      return `${which} isn't ${code("public")}, so code outside its package (Main, and the check) can't use it. Write ${code("public")} in front of it.`;
    }
    case "compiler.err.void.not.allowed.here":
      return `it uses the value your method returns, and your method is ${code("void")}: it returns nothing. Give it a return type and a ${code("return")} statement.`;
    case "compiler.err.report.access": {
      const m = /^([\w$]+)(\(.*?\))? has (private|protected) access in ([\w$.]+)$/.exec(firstLine(msg));
      if (!m) break;
      const [, name, parens, access, full] = m;
      // javac names the class with its package when two classes share a name.
      const owner = full.split(".").pop() ?? full;
      const what = memberOf(name, !!parens, owner);
      // protected reaches the check only from a class in a package: Main and the check are outside it.
      if (access === "protected") return `${what} is ${code("protected")}: only the classes of its own package and the classes that extend ${code(owner)} can use it, and Main and the check are outside that package. Write ${code("public")} instead of ${code("protected")}.`;
      // In a package, a member without an access word is still out of reach: it needs public.
      const file = fileOfType(source, owner);
      if (file && declaredPackage(file.code) !== "") return `${what} is ${code("private")}, and ${code(owner)} is in a package (the file ${code(file.path)}), so code outside it (Main, and the check) can use only what is ${code("public")}. Write ${code("public")} instead of ${code("private")}.`;
      return `${what} is ${code("private")}, so only code inside ${code(owner)} can ${parens ? "call" : "use"} it. Leave out ${code("private")}.`;
    }
  }
  // javac's own words, in a code span: types such as List<String> would read as HTML.
  return `javac says: ${code(firstLine(msg))}.`;
}

const firstLine = (msg: string) => msg.split("\n")[0].replace(/[;:.\s]+$/, "");

/** Sentences about each problem the check program had: each reason once (with the first call it
 * came up in), at most three. */
export function explainCalls(diags: Diagnostic[], ranges: Range[], tests: { call?: string }[], source: string): string[] {
  const whole = classProblem(diags, source);
  if (whole) return [whole];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of diags) {
    if (d.kind !== "error" || d.file !== CHECK_FILE) continue;
    const why = reason(d, source);
    if (seen.has(why)) continue;
    seen.add(why);
    const i = ranges.findIndex((r) => d.line >= r.from && d.line <= r.to);
    const call = i >= 0 ? tests[i]?.call : undefined;
    out.push((call ? `The check runs ${code(oneLine(call))}, but ` : "The check can't use your code: ") + why);
  }
  if (!out.length) out.push("The check couldn't call your methods. Check their names and parameters against the task.");
  return out.slice(0, 3);
}

/** Leaves the check program out of a stack trace: the learner only needs their own lines. */
export function withoutCheckFrames(stderr: string): string {
  return stderr.replace(/^\s+at ArenaCheck\.main\(ArenaCheck\.java:\d+\)\n?/gm, "");
}
