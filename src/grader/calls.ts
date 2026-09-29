// Why the hidden check program (ArenaCheck) couldn't call the learner's methods, in plain English.
// The check program is generated, so its own javac messages would only confuse: each one is turned
// into a sentence about the learner's code, naming the call the check makes.
import type { Diagnostic } from "../engine/client";
import { CHECK_FILE } from "./assemble.js";

type Range = { from: number; to: number };

const code = (s: string) => "`" + s.replace(/`/g, "'") + "`";
const oneLine = (s: string) => s.trim().split("\n").map((l) => l.trim()).join(" ");

/** What went wrong, as the end of a sentence that starts "The check runs `call`, but ". */
function reason(d: Diagnostic, source: string): string {
  const msg = d.message;
  switch (d.code) {
    case "compiler.err.cant.resolve.location.args": {
      const m = /method (\w+)\(([^)]*)\)/.exec(msg);
      if (!m) break;
      const [, name, types] = m;
      if (new RegExp(`\\bprivate\\b[^;{}=]*\\b${name}\\s*\\(`).test(source)) return `your ${code(name)} is ${code("private")}, so only code inside Main can call it. Leave out ${code("private")}.`;
      const other = [...source.matchAll(/\b(\w+)\s*\(/g)].map((x) => x[1]).find((n) => n !== name && n.toLowerCase() === name.toLowerCase());
      if (other) return `your method is called ${code(other)}. Java tells capital and small letters apart: name it ${code(name)}.`;
      return `Main has no method ${code(`${name}(${types})`)}. Check the method's name, and that it takes the parameters the task asks for.`;
    }
    case "compiler.err.cant.apply.symbol": {
      const name = /method (\w+) in class/.exec(msg)?.[1];
      const req = /required: (.*)/.exec(msg)?.[1]?.trim();
      const found = /found:\s+(.*)/.exec(msg)?.[1]?.trim();
      if (name && req && found) return `your ${code(name)} takes ${req === "no arguments" ? "no parameters" : code(req)}, and the check gives it ${found === "no arguments" ? "none" : code(found)}. Check the method's parameters.`;
      break;
    }
    case "compiler.err.cant.apply.symbols":
      return `none of your methods with that name takes these arguments. Check the parameters the task asks for.`;
    case "compiler.err.prob.found.req": {
      const m = /incompatible types: (.*)/.exec(msg);
      if (m) return `the types don't fit (${m[1]}). Check the method's parameter types and its return type.`;
      break;
    }
    case "compiler.err.non-static.cant.be.ref": {
      const name = /method (\w+)\(/.exec(msg)?.[1];
      return `${name ? `your ${code(name)}` : "the method"} isn't ${code("static")}. The methods in these lessons are ${code("public static")}, like ${code("main")}.`;
    }
    case "compiler.err.void.not.allowed.here":
      return `it uses the value your method returns, and your method is ${code("void")}: it returns nothing. Give it a return type and a ${code("return")} statement.`;
    case "compiler.err.cant.inherit.from.final":
      return `your class is ${code("final")}, and the check needs to build on it. Leave out ${code("final")}.`;
    case "compiler.err.report.access":
      if (/Main\(\)/.test(msg)) return `Main has a private constructor, which the check can't use. Remove the constructor.`;
      return `${msg.split("\n")[0]}. Leave out ${code("private")}.`;
  }
  return `javac says: ${msg.split("\n")[0]}.`;
}

/** Sentences about each problem the check program had: each reason once (with the first call it
 * came up in), at most three. */
export function explainCalls(diags: Diagnostic[], ranges: Range[], tests: { call?: string }[], source: string): string[] {
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
