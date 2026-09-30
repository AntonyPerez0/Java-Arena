// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import { ancestorsOf, classAt, declares, fileName, isSubtype, ownClasses, parameterTypes, subtypesOf, type OwnClasses } from "./own-classes";
import type { Diagnostic, SourceFile } from "./types";

/**
 * Rules are tried in order, so specific ones come before general ones. `explain` gets the
 * program's own classes (read from its source), and returns null when the rule doesn't fit after
 * all: the next rule for the code is tried then.
 */
type Rule = { code: string; when?: RegExp; explain: (d: Diagnostic, own: OwnClasses) => string | null };

const quoted = (m: string) => /'([^']+)'/.exec(m)?.[1];

const RULES: Rule[] = [
  { code: "compiler.err.expected", when: /^';' expected/, explain: () => "Java needs a semicolon ; at the end of this statement. Look at the end of the line the arrow points to (or the line before it)." },
  { code: "compiler.err.expected", explain: (d) => `Java expected ${quoted(d.message) ? `'${quoted(d.message)}'` : "something else"} here. Check for a missing bracket, parenthesis or semicolon just before the arrow.` },
  { code: "compiler.err.expected3", explain: () => "Java expected a different symbol here. Check for a missing bracket, parenthesis or semicolon just before the arrow." },
  { code: "compiler.err.cant.resolve.location", when: /location: variable \w+ of type Object$/m, explain: (d) => objectHasNo(d.message) },
  { code: "compiler.err.cant.resolve.location.args", when: /location: variable \w+ of type Object$/m, explain: (d) => objectHasNo(d.message) },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: () => "Java doesn't know a variable with this name here. Check the spelling (upper and lower case matter) and that the variable was created before this line, inside the same block { }." },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class (Scanner|ArrayList|HashMap|List|Map|Random|HashSet|Set|Arrays|Collections|LocalDate|Files|Paths|Path)\b/, explain: (d) => `To use ${/symbol:\s+class (\w+)/.exec(d.message)?.[1]}, import it at the top of the file, for example import java.util.Scanner;` },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: () => "Java doesn't know a class with this name. Check the spelling and capital letters, and whether it needs an import at the top of the file." },
  { code: "compiler.err.doesnt.exist", when: /^package system does not exist/, explain: () => "System needs a capital S. With a small s, Java reads system as the name of a package (a folder of classes), and there is no such package." },
  { code: "compiler.err.doesnt.exist", explain: () => "Java can't find this package. Check the spelling of the import or name before the dot, for example java.util.Scanner." },
  { code: "compiler.err.cant.resolve.location.args", explain: notInOwnType },
  { code: "compiler.err.cant.resolve.location.args", explain: () =>"There is no method with this name that takes these arguments. Check the spelling, and which methods this type really has." },
  { code: "compiler.err.cant.resolve.location", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.cant.resolve", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.prob.found.req", when: /possible lossy conversion/, explain: () => "This would squeeze a bigger or more precise number type into a smaller one and could lose information, for example a double into an int. Convert it on purpose with a cast such as (int), or use a variable of the bigger type." },
  {
    code: "compiler.err.prob.found.req",
    when: /incompatible types: Object cannot be converted to [A-Z][\w$]*$/m,
    explain: (d) => {
      const t = /Object cannot be converted to ([A-Z][\w$]*)$/m.exec(d.message)?.[1];
      return `A value of type Object could be any object, so Java won't put it in a ${t} variable by itself. If it comes from a list declared without a type in angle brackets, such as ArrayList list, give the list its type: ArrayList<${t}>. If you know the value is a ${t} (check with instanceof first, as equals does), cast it by putting (${t}) in front of it.`;
    },
  },
  {
    code: "compiler.err.prob.found.req",
    when: /incompatible types: <null> cannot be converted to (int|long|double|float|boolean|char|byte|short)\b/,
    explain: (d) => {
      const t = /<null> cannot be converted to (\w+)/.exec(d.message)?.[1] ?? "int";
      const zero: Record<string, string> = { boolean: "false", char: "'a'", double: "0.0", float: "0.0f" };
      return `${/^[aeiou]/.test(t) ? "An" : "A"} ${t} variable always holds a value, so it can't be null. null means "no object", and only variables of a class type, such as String, can hold it. Give it a value such as ${zero[t] ?? "0"} instead.`;
    },
  },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+ cannot be converted to [\w$.]+$/m, explain: ownConversion },
  { code: "compiler.err.prob.found.req", when: /cannot be converted to/, explain: () => "The value on the right has a different type than the variable or parameter expects. For example text in quotes is a String, not an int; Integer.valueOf(...) turns text into a number." },
  { code: "compiler.err.prob.found.req", when: /unexpected return value/, explain: () => "This method is void, so it can't return a value. Change void to the value's type, or remove the value after return." },
  { code: "compiler.err.prob.found.req", when: /missing return value/, explain: () => "This method must return a value: write return followed by the value." },
  { code: "compiler.err.prob.found.req", explain: () => "The types here don't match what Java expects." },
  { code: "compiler.err.void.not.allowed.here", explain: () => "This uses the value of a method that is void, so there is no value to print or store. Give the method a return type (such as int) and a return statement, or call it on a line of its own." },
  { code: "compiler.err.missing.ret.stmt", explain: () => "This method promises to return a value, but some path through it reaches the end without a return statement. Make sure every possible path ends with return." },
  { code: "compiler.err.unreachable.stmt", explain: () => "This line can never run, because the code before it always leaves first (for example an endless loop, a return, or a break)." },
  {
    code: "compiler.err.class.public.should.be.in.file",
    explain: (d) => {
      const m = /class (\w+) is public, should be declared in a file named (\w+\.java)/.exec(d.message);
      const here = d.file.split("/").pop();
      return m
        ? `A public class must be in a file with exactly its name: class ${m[1]} belongs in ${m[2]}, but it's in ${here}. If it's meant to be this file's class, rename it ${here?.replace(/\.java$/, "")}. If it's an extra class, remove the word public (a class without public can share a file), or give it a file of its own.`
        : "A public class must be in a file with exactly the same name as the class.";
    },
  },
  { code: "compiler.err.unclosed.str.lit", explain: () => "This text is missing its closing quote \". Every string starts and ends with a double quote on the same line." },
  { code: "compiler.err.unclosed.char.lit", explain: () => "A char is one character between single quotes, like 'a'. Use double quotes for longer text." },
  { code: "compiler.err.empty.char.lit", explain: () => "'' is empty: a char needs exactly one character between the single quotes." },
  {
    code: "compiler.err.cant.apply.symbol",
    when: /^constructor ([\w$]+) in class \1 cannot be applied[\s\S]*found:\s+no arguments\n\s*reason: actual and formal argument lists differ in length/,
    explain: (d) => implicitSuper(d, `it takes (${spaced(/required: (.*)/.exec(d.message)?.[1] ?? "")})`),
  },
  { code: "compiler.err.cant.apply.symbol", when: /^constructor ([\w$]+) in class \1 cannot be applied/, explain: superArguments },
  {
    code: "compiler.err.cant.apply.symbol",
    when: /^constructor \w+ in class \w+ cannot be applied[\s\S]*required: no arguments/,
    explain: (d) => {
      const c = /^constructor (\w+)/.exec(d.message)?.[1];
      return `The object is created with values, but ${c} has no constructor that takes any. A class without a constructor of its own gets an empty one, so only new ${c}() works. Write a constructor with these parameters in ${c}.`;
    },
  },
  {
    code: "compiler.err.cant.apply.symbol",
    when: /^constructor /,
    explain: (d) => `The values in new ${/^constructor (\w+)/.exec(d.message)?.[1]}(...) don't match the constructor's parameters. Compare their number, order and types (Java lists what it required and what it found).`,
  },
  { code: "compiler.err.cant.apply.symbol", explain: () => "The method was called with the wrong number or types of arguments. Compare the call with the method's parameter list (Java lists what it required and what it found)." },
  {
    code: "compiler.err.cant.apply.symbols",
    when: /^no suitable constructor found for [\w$]+\(no arguments\)/,
    explain: (d) => {
      if (/has private access/.test(d.message)) return null;
      const takes = [...d.message.matchAll(/constructor [\w$.]+\((.*?)\) is not applicable/g)].map((m) => `(${spaced(m[1])})`);
      return takes.length ? implicitSuper(d, `its constructors take ${takes.join(" or ")}`) : null;
    },
  },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable constructor found for (\w+)/, explain: (d) => `None of the constructors of ${/^no suitable constructor found for (\w+)/.exec(d.message)?.[1]} takes these values. Check the number, order and types of the values in the parentheses.` },
  { code: "compiler.err.cant.apply.symbols", explain: () => "None of the versions of this method accepts these arguments. Check the number and types of values in the parentheses." },
  { code: "compiler.err.non-static.cant.be.ref", explain: () => "main is static, so it can't use this object's methods or variables directly. Create an object first (new ...) and call the method on it, or make the method static if it doesn't need an object." },
  { code: "compiler.err.var.might.not.have.been.initialized", explain: () => "This variable is used before it has a value. Give it a starting value where you create it, for example int sum = 0;" },
  { code: "compiler.err.else.without.if", explain: () => "This else has no matching if. A common cause is a semicolon right after if (...), which ends the if before its block, or a missing { }." },
  { code: "compiler.err.premature.eof", explain: () => "The file ended while Java was still inside a block. A closing brace } is missing somewhere; every { needs its }." },
  {
    code: "compiler.err.already.defined",
    when: /^(method|constructor) [\w$]+\(.*\) is already defined in class/,
    explain: (d) => {
      const [, kind, name, params] = /^(method|constructor) ([\w$]+)\((.*)\)/.exec(d.message) ?? [];
      const takes = params ? `takes (${params.replace(/,/g, ", ")})` : "takes no parameters";
      return `This class already has a ${kind} ${name} that ${takes}. Methods and constructors can share a name only when their parameters differ in number, types or order. The parameter names and the return type don't count.`;
    },
  },
  { code: "compiler.err.already.defined", explain: () => "A variable or method with this name already exists here. Use a different name, or drop the type to change the existing variable (name = ... instead of String name = ...)." },
  { code: "compiler.err.report.access", explain: privateInParent },
  { code: "compiler.err.report.access", explain: () => "This is private, so only code inside its own class can use it. Use a public method of that class (for example a getter) instead." },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: () => "This can throw a checked exception, so Java insists you handle it: wrap it in try { ... } catch (...) { ... }, or add throws ... to the method header." },
  { code: "compiler.err.illegal.start.of.expr", explain: () => "Something here isn't a valid start of an expression. Often a bracket or parenthesis is missing earlier, or a method was declared inside another method." },
  { code: "compiler.err.illegal.start.of.type", explain: () => "Java didn't expect this here. Check for a missing or extra bracket around this line." },
  { code: "compiler.err.not.stmt", explain: () => "This isn't a complete statement on its own. Perhaps it should be assigned to a variable or printed, or = was mixed up with ==." },
  { code: "compiler.err.cant.deref", explain: () => "Primitive values like int, double and boolean have no methods, so you can't put a dot after them. Use a wrapper or a helper, for example String.valueOf(number)." },
  { code: "compiler.err.operator.cant.be.applied.1", explain: () => "This operator doesn't work with these two types, for example subtracting a String, or comparing a String with <." },
  { code: "compiler.err.operator.cant.be.applied", explain: () => "This operator doesn't work with this type, for example ! on a number." },
  { code: "compiler.err.incomparable.types", explain: () => "These two values have types that can never be equal, so comparing them with == makes no sense." },
  { code: "compiler.err.does.not.override.abstract", explain: missingAbstractMethod },
  { code: "compiler.err.override.weaker.access", explain: weakerAccess },
  { code: "compiler.err.override.weaker.access", explain: () => "A method that replaces an inherited one can't be harder to reach than the method it replaces. Give it the same access word as that method (public, protected or none), or a more open one, such as public." },
  { code: "compiler.err.method.does.not.override.superclass", explain: overridesNothing },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: cannotCreate },
  { code: "compiler.err.intf.expected.here", explain: (d) => wrongParentKind(d, "class") },
  { code: "compiler.err.intf.expected.here", explain: () => "implements needs an interface, and this is a class. A class extends another class (class Dog extends Animal) and implements interfaces (class Book implements Readable)." },
  { code: "compiler.err.no.intf.expected.here", explain: (d) => wrongParentKind(d, "interface") },
  { code: "compiler.err.no.intf.expected.here", explain: () => "extends needs a class here, and this is an interface. A class implements an interface (class Book implements Readable) and extends another class (class Dog extends Animal)." },
  { code: "compiler.err.abstract.meth.cant.have.body", explain: abstractWithBody },
  { code: "compiler.err.intf.meth.cant.have.body", explain: interfaceMethodWithBody },
  { code: "compiler.err.does.not.override.abstract", explain: () => "This class promises (through an interface or abstract class) to have a method it doesn't have yet. Add the missing method with exactly that name and parameters." },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: () => "You can't create an object directly from an abstract class or an interface. Create an object of a class that extends or implements it." },
  { code: "compiler.err.cant.inherit.from.final", explain: () => "This class is final, so no class can extend it." },
  { code: "compiler.err.cant.assign.val.to.var", explain: () => "This variable is final, so it can't get a new value after the first one." },
  { code: "compiler.err.invalid.meth.decl.ret.type.req", explain: () => "A method needs a return type before its name (void if it returns nothing). If this was meant to be a constructor, its name must match the class name exactly." },
  { code: "compiler.err.missing.meth.body.or.decl.abstract", explain: missingBody },
  { code: "compiler.err.break.outside.switch.loop", explain: () => "break only works inside a loop or a switch." },
  { code: "compiler.err.illegal.char", explain: () => "This character isn't allowed in Java code. It may be a curly quote or another symbol pasted from a document; retype it." },
  { code: "compiler.err.call.must.be.first.stmt.in.ctor", explain: firstInConstructor },
  { code: "compiler.err.call.must.be.first.stmt.in.ctor", explain: () => "A call to super(...) or this(...) must be the first line of the constructor." },
  { code: "compiler.err.ref.ambiguous", explain: () => "Java found more than one thing with this name and can't tell which one you mean." },
  { code: "compiler.err.var.not.initialized.in.default.constructor", explain: () => "This final variable never gets a value. Give it one where it is declared or in every constructor." },
];

/** A name looked up on a variable of type Object, such as equals' parameter used before its cast. */
function objectHasNo(m: string): string {
  const v = /location: variable (\w+) of type Object$/m.exec(m)?.[1] ?? "it";
  const what = /symbol:\s+(variable|method) (\w+)/.exec(m);
  const member = what ? (what[1] === "method" ? `${what[2]}()` : what[2]) : "";
  return `${v} has the type Object, and Object has no ${what?.[1] ?? "member"} ${member}. Java goes by the variable's type, even when the object in it is one of yours. Cast it to your own class first, for example Parcel other = (Parcel) ${v}; with your class's name instead of Parcel, and then use other.${member}.`;
}

// ---- Inheritance, abstract classes and interfaces (MOOC part 9) ----

const an = (word: string) => `${/^[AEIOU]/.test(word) ? "an" : "a"} ${word}`;
/** "int,String" as "int, String". */
const spaced = (list: string) => list.replace(/,(?=\S)/g, ", ");
/** A class's simple name: Dog for Main.Dog, Main$Dog or animals.Dog. */
const simple = (name: string) => name.split(/[.$]/).pop() || name;
/** A variable name for an object of a class: dog for Dog, unless that name is taken. */
const varFor = (cls: string, taken?: string) => {
  const v = cls[0].toLowerCase() + cls.slice(1);
  return v === taken || v === cls ? `the${cls}` : v;
};

/** The source line javac showed for a diagnostic, and that line from the caret on. */
function atCaret(d: Diagnostic): { line: string; at: string } | null {
  const lines = d.formatted.split("\n");
  const i = lines.findIndex((l, k) => k > 1 && /^[ \t]*\^$/.test(l));
  return i < 0 ? null : { line: lines[i - 1], at: lines[i - 1].slice(lines[i].indexOf("^")) };
}

/** The method a line declares: makeSound in "abstract void makeSound() {". */
const methodIn = (line: string) => /([\w$]+)\s*\([^()]*\)\s*(?:throws\s[^{;]*)?(?:\{|;|$)/.exec(line)?.[1];

/** A method's header from the line javac showed (such as "String read()"), without its body. */
function headerAt(d: Diagnostic, method: string): string | null {
  const h = atCaret(d)?.line.trim().replace(/\s*\{.*$/, "").replace(/\s+/g, " ");
  return h && h.includes(`${method}(`) && h.endsWith(")") ? h : null;
}

/** Whether a type is an interface: one of the program's own, or a common one of Java's. */
function isInterface(own: OwnClasses, name: string): boolean {
  const t = own.types.get(name);
  return t ? t.kind === "interface" : /^(Comparable|Comparator|Runnable|Iterable|Iterator|Collection|List|Set|Map|Queue|Deque|Cloneable)$/.test(name);
}

/** "X is not abstract and does not override abstract method m(...) in Y". */
function missingAbstractMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$.]+) is not abstract and does not override abstract method ([\w$]+)\((.*)\) in ([\w$.]+)$/.exec(d.message);
  if (!m) return null;
  const [cls, method, params, parent] = [simple(m[1]), m[2], spaced(m[3]), simple(m[4])];
  const sig = `${method}(${params})`;
  if (cls === parent)
    return `${cls} has an abstract method, ${sig}, which has no body, so ${cls} must be abstract too: write abstract class ${cls}. If ${cls} is meant for creating objects, give ${method} a body instead and remove the word abstract from it.`;
  const same = declares(own.types.get(cls), method, true)
    ? `${cls} has a method ${method}, but with other parameter types: to count, they must be exactly (${params}).`
    : `If ${cls} already has a method like it, compare the name and the parameter types: they must match exactly.`;
  if (parent === "Comparable" && method === "compareTo")
    return `${cls} implements Comparable, so it must have the method compareTo, which tells how two ${cls} objects compare. Add it to ${cls}: public int compareTo(${params} other) { ... }, returning a negative number, zero or a positive number. ${same}`;
  if (isInterface(own, parent))
    return `${parent} is an interface, and a class that implements it must have every method it lists. ${cls} doesn't have ${sig} yet: add it, with the same name, parameter types and return type as in ${parent}, and public in front (an interface's methods are always public). ${same}`;
  const below = own.types.has(parent) ? "extends" : "extends or implements";
  return `${sig} is abstract in ${parent}: it has no body there, so each class that ${below} ${parent} must write its own, and ${cls} doesn't have it yet. Add ${method} to ${cls}, with the same name, parameter types and return type as in ${parent}. ${same}`;
}

/** "read() in Book cannot implement read() in Readable; attempting to assign weaker access privileges; was public". */
function weakerAccess(d: Diagnostic): string | null {
  const m = /^([\w$]+)\(.*?\) in ([\w$.]+) cannot (implement|override) [\w$]+\(.*?\) in ([\w$.]+)\n\s*attempting to assign weaker access privileges; was (public|protected)$/m.exec(d.message);
  if (!m) return null;
  const [method, cls, verb, parent, was] = [m[1], simple(m[2]), m[3], simple(m[4]), m[5]];
  const header = headerAt(d, method)?.replace(/^(public|protected|private)\s+/, "");
  const where = verb === "implement" ? `${method} is public in the interface ${parent}, as every interface method is` : `${method} is ${was} in ${parent}`;
  return `${where}, so ${method} in ${cls} must be ${was === "protected" ? "protected or public" : "public"} too: a method that replaces an inherited one can't be harder to reach. Write ${was} in front of it${header ? `: ${was} ${header}` : ""}.`;
}

/** Which constructor call a constructor error is about, from the code at javac's caret. */
function constructorCall(d: Diagnostic): "new" | "super" | "this" | "implicit" | null {
  const c = atCaret(d);
  if (!c) return null;
  const word = /^(new|super|this)\b/.exec(c.at)?.[1] as "new" | "super" | "this" | undefined;
  if (word) return word;
  // A constructor's { or a class's header: the super() call Java adds by itself.
  return c.at.startsWith("{") || /^(?:[\w$]+\s+)*(?:class|enum|record)\s/.test(c.at) ? "implicit" : null;
}

/** The parent's constructor can't be called without values, and the subclass doesn't call it with any. */
function implicitSuper(d: Diagnostic, takes: string): string | null {
  const parent = /^(?:constructor|no suitable constructor found for) ([\w$]+)/.exec(d.message)?.[1];
  const c = atCaret(d);
  if (!parent || !c || constructorCall(d) !== "implicit") return null;
  const cls = /^(?:[\w$]+\s+)*(?:class|enum|record)\s+([\w$]+)/.exec(c.at)?.[1];
  const missing = `${parent} has no such constructor: ${takes}.`;
  if (cls) return `${cls} has no constructor, so Java gives it an empty one, which calls super(): the constructor of ${parent} without parameters. ${missing} Write a constructor for ${cls} that gets those values as its parameters and passes them on with super(...) on its first line.`;
  const [, ctor, params] = /([\w$]+)\s*\(([^()]*)\)\s*(?:throws\s[^{]*)?\{/.exec(c.line) ?? [];
  // When this constructor has parameters of the types the parent's constructor takes, the fix passes them on by name.
  const required = /required: (.*)/.exec(d.message)?.[1];
  const have = (params ?? "").split(",").map((p) => /^(?:final\s+)?(.+?)\s+([\w$]+)$/.exec(p.trim())).filter((p) => p != null);
  const args: string[] = [];
  for (const type of required && required !== "no arguments" ? required.split(/,(?![^<]*>)/) : []) {
    const i = have.findIndex((p) => p[1].replace(/\s+/g, "") === type.replace(/\s+/g, ""));
    if (i >= 0) args.push(have.splice(i, 1)[0][2]);
  }
  const call = required && args.length === required.split(/,(?![^<]*>)/).length ? `super(${args.join(", ")})` : null;
  const fix = call ? `Make ${call} the constructor's first line, to pass ${args.length === 1 ? "that value" : "those values"} on.` : `Make the constructor's first line super(...) with the values ${parent} needs (the constructor may need more parameters to get them).`;
  return `${ctor ? `The constructor of ${ctor}` : "This constructor"} doesn't start with super(...), so Java starts it with super(): a call to the constructor of ${parent} without parameters. ${missing} ${fix}`;
}

/** super(...) with values that don't fit the parent's constructor. */
function superArguments(d: Diagnostic): string | null {
  if (constructorCall(d) !== "super") return null;
  const parent = /^constructor ([\w$]+)/.exec(d.message)?.[1];
  const required = /required: (.*)/.exec(d.message)?.[1];
  const found = /found: +(.*)/.exec(d.message)?.[1];
  if (!parent || !required || !found) return null;
  if (required === "no arguments") return `super(...) passes values to the constructor of ${parent}, but ${parent} has no constructor that takes any. Call super() without values, or write a constructor in ${parent} with these parameters.`;
  return `super(...) calls the constructor of ${parent}, and these values don't match its parameters: it takes (${spaced(required)}), and it got (${found === "no arguments" ? "nothing" : spaced(found)}). Compare their number, order and types.`;
}

/** "call to super must be first statement in constructor". */
function firstInConstructor(d: Diagnostic, own: OwnClasses): string | null {
  const which = /^call to (super|this) must be first statement in constructor/.exec(d.message)?.[1];
  if (!which) return null;
  const args = /^\([^;]*\)/.exec(atCaret(d)?.at ?? "")?.[0] ?? "(...)";
  const call = `${which}${args}`;
  if (which === "this") return `${call} calls another constructor of the same class, and it must be the very first statement in the constructor. Move it to the top, and do the rest after it.`;
  const cls = classAt(own, d.file, d.line);
  const parent = cls?.kind === "class" && cls.supers[0] && !isInterface(own, cls.supers[0]) ? cls.supers[0] : null;
  return `${call} calls the constructor of ${parent ?? "the parent class"}, and it must be the very first statement in a constructor: Java sets up the ${parent ?? "parent"} part of the object before anything else. Move ${call} to the top of the constructor, and set this class's own variables after it. (Only a constructor can call super(...).)`;
}

function editDistance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diagonal = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const above = row[j];
      row[j] = Math.min(above + 1, row[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return row[b.length];
}

const LIBRARY_METHODS: Record<string, string[]> = { Comparable: ["compareTo"], Comparator: ["compare"], Runnable: ["run"], Iterable: ["iterator"] };

/** "method does not override or implement a method from a supertype", on an @Override. */
function overridesNothing(d: Diagnostic, own: OwnClasses): string {
  const general = "@Override says that the method below it replaces a method of a parent class or an interface, but none of them has a method with this name and these parameter types. Check the spelling and the capital letters (toString, not tostring) and the parameter types: equals, for example, takes an Object, public boolean equals(Object compared). If the method is a new one, not a replacement, remove @Override.";
  const text = own.lines.get(fileName(d.file))?.slice(d.line - 1, d.line + 4).join("\n") ?? "";
  const annotation = /@(?:java\.lang\.)?Override\b/.exec(text);
  const header = annotation && /^[^(;{}]*?([\w$]+)\s*\(([^)]*)\)/.exec(text.slice(annotation.index + annotation[0].length));
  if (!header) return general;
  const [, name, params] = header;
  const cls = classAt(own, d.file, d.line);
  // A misspelled parent in the class header: then every @Override in the class fails.
  const names = [...own.types.keys()];
  for (const bad of cls?.supers ?? []) {
    const good = own.types.has(bad) ? null : names.find((n) => n !== cls?.name && editDistance(n.toLowerCase(), bad.toLowerCase()) <= 2);
    if (cls && good) return `The header of ${cls.name} names ${bad}, but there is no ${bad}. Did you mean ${good}? Until Java finds the parent, it can't tell what ${name} replaces, so each @Override in ${cls.name} fails. Fix the name in the header, and these errors go away.`;
  }
  const parents = cls ? ancestorsOf(own, cls.name) : [];
  // The methods this class could replace: where each one is, and its parameter types when they are known.
  const known = new Map<string, { where: string; params?: string }>([
    ["toString", { where: "Object", params: "" }],
    ["equals", { where: "Object", params: "Object" }],
    ["hashCode", { where: "Object", params: "" }],
  ]);
  for (const s of [cls, ...parents].flatMap((t) => t?.supers ?? [])) for (const m of LIBRARY_METHODS[s] ?? []) known.set(m, { where: s });
  for (const p of parents) for (const m of p.members) if (m.method && !m.private) known.set(m.name, { where: p.name, params: m.params });
  const remove = ` If ${name} is a new method, not a replacement, remove @Override.`;
  const found = known.get(name);
  const where = found?.where;
  if (found && found.params === parameterTypes(params))
    return `${name} has the same parameter types as the method ${name} of ${where}, so the @Override itself looks right. Java can't match them when it can't find a class that ${cls?.name ?? "this class"} extends or implements: if another error says "cannot find symbol" about a class in the header, fix that first, and this error goes away too.`;
  if (name === "equals" && where === "Object")
    return `@Override says that this equals replaces the equals every class gets from Object, but that one takes an Object: write public boolean equals(Object compared), not equals(${params.trim()}). Inside it, check the type with instanceof and cast compared to your class.`;
  if (where) return `@Override says that ${name} replaces the method ${name} of ${where}, but its parameter types are different, so it doesn't replace it. Give it exactly the same parameter types as in ${where}${found?.params == null ? "" : found.params ? `: (${spaced(found.params)})` : ", where it takes none"}.${remove}`;
  const hidden = parents.find((p) => p.members.some((m) => m.method && m.private && m.name === name));
  if (hidden) return `${name} is private in ${hidden.name}, so ${cls?.name ?? "a subclass"} can't see it, and a method can't replace what it can't see. If it should be replaceable, make it protected or public in ${hidden.name}.${remove}`;
  const near = [...known.keys()].find((k) => k.toLowerCase() === name.toLowerCase() || editDistance(k.toLowerCase(), name.toLowerCase()) <= (name.length > 5 ? 2 : 1));
  if (near) return `@Override says that ${name} replaces a method of a parent class or an interface, but none of them has a method ${name}. Did you mean ${near}, the method of ${known.get(near)?.where}? Check the spelling: upper and lower case matter.${remove}`;
  // A class that has the method, which this class could extend (it extends no class yet) or implement.
  const free = cls?.kind === "class" && !cls.supers.some((s) => !isInterface(own, s));
  const rank = (t: { kind: string; abstract: boolean }) => (t.kind === "interface" ? 0 : t.abstract ? 1 : 2);
  const elsewhere = cls && [...own.types.values()].filter((t) => t !== cls && !parents.includes(t) && declares(t, name, true) && (t.kind === "interface" || free)).sort((a, b) => rank(a) - rank(b))[0];
  if (cls && elsewhere) {
    const verb = elsewhere.kind === "interface" && cls.kind !== "interface" ? "implement" : "extend";
    return `@Override says that ${name} replaces a method of a parent class or an interface, and ${elsewhere.name} has ${name}, but ${cls.name} doesn't ${verb} ${elsewhere.name}. Should it? Then ${cls.supers.length ? `add ${elsewhere.name} to the header of ${cls.name}` : `write ${cls.kind} ${cls.name} ${verb}s ${elsewhere.name}`}.${remove}`;
  }
  const unseen = cls?.supers.find((s) => !own.types.has(s) && !LIBRARY_METHODS[s]);
  return `@Override says that ${name} replaces a method of a parent class or an interface, but ${cls ? `no parent of ${cls.name}` : "none of them"} has a method ${name}. Check the spelling and the parameter types.${unseen ? ` If Java also says it can't find ${unseen}, fix that first: this error may go away with it.` : ""}${remove}`;
}

const LIBRARY_EXAMPLES: Record<string, string> = {
  List: "List<String> names = new ArrayList<>();",
  Collection: "Collection<String> names = new ArrayList<>();",
  Map: "Map<String, Integer> ages = new HashMap<>();",
  Set: "Set<String> names = new HashSet<>();",
};

/** "Animal is abstract; cannot be instantiated": new on an abstract class or an interface. */
function cannotCreate(d: Diagnostic, own: OwnClasses): string | null {
  const full = /^([\w$.]+) is abstract; cannot be instantiated/.exec(d.message)?.[1];
  if (!full) return null;
  const name = simple(full);
  const example = LIBRARY_EXAMPLES[name];
  if (example && !own.types.has(name)) {
    const impl = /new (\w+)/.exec(example)![1];
    return `${name} is an interface: it lists what every ${name.toLowerCase()} can do, but it isn't a class you can create objects from. Create ${an(impl)}, which is one kind of ${name}; the variable can keep the type ${name}: ${example}`;
  }
  const t = own.types.get(name);
  if (!t) return `${name} is abstract (an abstract class or an interface), so you can't create an object of it with new. Create an object of a class that extends or implements ${name} instead.`;
  const sub = subtypesOf(own, name).find((s) => !s.abstract);
  const instead = sub ? `, such as ${sub.name}: ${name} ${varFor(name)} = new ${sub.name}(...);` : ".";
  if (t.kind === "interface")
    return `${name} is an interface: it only lists methods, so there is no object to create from it. Create an object of a class that implements it${sub ? instead : `, with every method ${name} lists. Write one if there is none yet.`}`;
  return `${name} is an abstract class, so it can't be created with new: it is a starting point for the classes that extend it. Create an object of one of those instead${sub ? instead : `; write one if there is none yet. If ${name} should create objects itself, remove the word abstract.`}`;
}

/** A class that implements a class, or extends an interface. */
function wrongParentKind(d: Diagnostic, used: "class" | "interface"): string | null {
  const c = atCaret(d);
  const target = /^[\w$.]+/.exec(c?.at ?? "")?.[0];
  const decl = /\b(class|interface|enum|record)\s+([\w$]+)/.exec(c?.line ?? "");
  if (!target || !decl) return null;
  const [, kind, name] = decl;
  const parent = simple(target);
  if (used === "interface") return `${parent} is an interface, so ${name} implements it instead of extending it: ${kind} ${name} implements ${parent}. extends is for a parent class; a class can extend one class and implement any number of interfaces.`;
  if (kind === "interface") return `${parent} is a class, and an interface can only extend other interfaces. If ${name} should be a class, declare it as one: class ${name} extends ${parent}.`;
  if (kind !== "class") return `${parent} is a class, not an interface, so ${name} can't implement it. implements is only for interfaces.`;
  return `${parent} is a class, not an interface, so ${name} can't implement it. A class extends its parent class: class ${name} extends ${parent}. implements is only for interfaces.`;
}

/** "cannot find symbol" for a method looked up in one of the program's own types that has subclasses. */
function notInOwnType(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type|class) ([\w$.]+)(?:<.*>)?$/m.exec(d.message);
  if (!m) return null;
  const [, method, args, variable] = m;
  const type = simple(m[4]);
  if (!own.types.has(type)) return null;
  const call = `${method}(${spaced(args)})`;
  const qualified = !!variable || !!atCaret(d)?.at.startsWith(".");
  // A private method of a parent isn't inherited, so javac doesn't find it in the subclass.
  const hidden = ancestorsOf(own, type).find((a) => a.members.some((x) => x.name === method && x.method && x.private));
  if (hidden) return `${method} is private in ${hidden.name}, so only code inside ${hidden.name} can call it. Not even ${type}, which extends ${hidden.name}, can. If subclasses should use it, make it protected in ${hidden.name} (or public).`;
  const subs = subtypesOf(own, type);
  if (!subs.length) return null;
  const has = subs.filter((s) => declares(s, method, true));
  const holder = variable ? `${variable} has the type ${type}` : qualified ? `The value before .${method} has the type ${type}` : `This code is in ${type}`;
  if (!has.length) return `${holder}, and neither ${type} nor its subclasses have a method ${call}. Check the spelling (upper and lower case matter) and the values in the parentheses.`;
  const s = has[0].name;
  const owners = has.length === 1 ? `${s} has one` : `${has.map((h) => h.name).join(" and ")} have one`;
  const declare = `if every ${type} should have ${method}, declare it in ${type} too (abstract, if each subclass writes its own).`;
  const spelling = ` If you meant a method that ${type} has, check the spelling.`;
  if (!qualified) return `${type} has no method ${call}. ${owners}, but code in ${type} can only call what every ${type} has, since the object may be another kind of ${type}. So ${declare}${spelling}`;
  const v = variable ?? "value";
  const x = varFor(s, v);
  return `${holder}, and ${type} has no method ${call}. ${owners}, but Java goes by the ${variable ? "variable's" : "value's"} type, not by the object in it, even when that object is ${an(s)}. If it can be ${an(s)}, check that it is and cast it: if (${v} instanceof ${s}) { ${s} ${x} = (${s}) ${v}; ${x}.${method}(${args ? "..." : ""}); }. Or, ${declare}${spelling}`;
}

/** "incompatible types: Animal cannot be converted to Dog", with two of the program's own types. */
function ownConversion(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+) cannot be converted to ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  if (!own.types.has(from) || !own.types.has(to)) return null;
  const at = atCaret(d)?.at ?? "";
  if (!isSubtype(own, to, from)) {
    const common = ancestorsOf(own, from).find((a) => isSubtype(own, to, a.name));
    return `${from} and ${to} are different types, and neither one extends or implements the other, so ${an(from)} can't go in ${an(to)} variable.${common ? ` Both are kinds of ${common.name}, so a variable of type ${common.name} can hold either.` : ""}`;
  }
  if (/^new\s/.test(at)) return `new ${from}(...) creates ${an(from)}, and ${an(from)} isn't ${an(to)}: every ${to} is ${an(from)}, but not the other way round. Create ${an(to)} instead, new ${to}(...), or give the variable the type ${from}.`;
  const v = /^([\w$]+)\s*[;),]/.exec(at)?.[1] ?? "value";
  const x = varFor(to, v);
  return `Every ${to} is ${an(from)}, but not every ${from} is ${an(to)}, so Java won't put a value of type ${from} in ${an(to)} variable by itself, even when the object is ${an(to)}. If it can be ${an(to)}, check that it is and cast it: if (${v} instanceof ${to}) { ${to} ${x} = (${to}) ${v}; ... }. Otherwise, give the variable the type ${from}.`;
}

/** "name has private access in Animal", in a class that extends Animal. */
function privateInParent(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$]+)(\(.*\))? has private access in ([\w$.]+)$/.exec(d.message);
  if (!m) return null;
  const [, name, parens] = m;
  const owner = simple(m[3]);
  const here = classAt(own, d.file, d.line);
  if (!here || here.name === owner || name === owner || !isSubtype(own, here.name, owner)) return null;
  const not = `Not even ${here.name}, which extends ${owner}, can.`;
  if (parens) return `${name} is private in ${owner}, so only code inside ${owner} can call it. ${not} If subclasses should use it, make it protected in ${owner} (or public).`;
  const parent = own.types.get(owner);
  const getter = `get${name[0].toUpperCase()}${name.slice(1)}`;
  const type = parent?.members.find((x) => x.name === name && !x.method)?.type;
  const use = declares(parent, getter, true) ? `such as ${getter}()` : `for example a getter: public ${type ?? "..."} ${getter}() { return this.${name}; }`;
  return `${name} is private in ${owner}, so only code inside ${owner} can use it. ${not} Use a public method of ${owner} instead, ${use}. Or make ${name} protected in ${owner}: the classes that extend ${owner} can use a protected variable.`;
}

/** "abstract methods cannot have a body". */
function abstractWithBody(d: Diagnostic): string {
  const name = methodIn(atCaret(d)?.line ?? "");
  if (!name) return "An abstract method has no body: it only promises that each subclass writes its own. Replace the { } block with a semicolon, or remove the word abstract.";
  const header = headerAt(d, name);
  return `${name} is abstract, and an abstract method has no body: it only promises that each subclass writes its own ${name}. Replace the { } block with a semicolon${header ? `, as in ${header};` : "."} Or, if this class should give ${name} its body, remove the word abstract.`;
}

/** "interface abstract methods cannot have body". */
function interfaceMethodWithBody(d: Diagnostic): string {
  const name = methodIn(atCaret(d)?.line ?? "");
  const header = name ? headerAt(d, name) : null;
  return `A method in an interface has no body: the interface only lists the methods that each class implementing it must have. Replace the { } block with a semicolon${header ? `, as in ${header};` : ","} and write the body in each class that implements the interface. (A method the interface itself gives a body needs the word default in front.)`;
}

/** "missing method body, or declare abstract". */
function missingBody(d: Diagnostic, own: OwnClasses): string {
  const name = methodIn(atCaret(d)?.line ?? "");
  const cls = classAt(own, d.file, d.line);
  const abstractClass = cls?.kind === "class" && !cls.abstract ? `, and make the class abstract too: abstract class ${cls.name}` : cls?.abstract ? "" : ", and make the class abstract too";
  return `${name ? `The method ${name}` : "This method"} has no body. Add { ... } after the parentheses (and remove any semicolon right after them). If it's meant to be abstract, so that each subclass writes its own, write abstract in front of it${abstractClass}.`;
}

/** The message of a ClassCastException: "class Dog cannot be cast to class Cat (Dog and Cat are in unnamed module of loader 'app')". */
function explainCast(m: string): string {
  const c = /^class ([\w$.]+) cannot be cast to class ([\w$.]+)/.exec(m);
  if (!c) return "The program cast an object to a type it isn't.";
  const [from, to] = [simple(c[1]), simple(c[2])];
  const number = from === "String" && /^(Integer|Double|Long)$/.test(to) ? ` To turn text into a number, use ${to}.valueOf(text) instead of a cast.` : "";
  return `The program cast an object to ${to}, but it is ${an(from)}, not ${an(to)}. A cast doesn't change the object: it only works when the object already is ${an(to)}.${number || ` Check with instanceof before the cast, for example if (value instanceof ${to}) { ${to} ${varFor(to, "value")} = (${to}) value; ... }, and handle other objects another way.`}`;
}

/**
 * A plain-English note for one javac diagnostic, or null when there is no rule for it. `sources`
 * are the learner's files: with them, a note can name the program's own classes, such as the
 * subclass that has a method the variable's type lacks.
 */
export function explainDiagnostic(d: Diagnostic, sources: SourceFile[] = []): string | null {
  const own = ownClasses(sources);
  for (const r of RULES) {
    if (r.code !== d.code) continue;
    if (r.when && !r.when.test(d.message)) continue;
    const note = r.explain(d, own);
    if (note != null) return note;
  }
  return null;
}

export type Crash = {
  exception: string;
  message: string;
  /** The learner's file the reported line is in. */
  file?: string;
  line: number | null;
  method: string | null;
  explanation: string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "Index 3 out of bounds for length 3", the message of a list, array or string index error. */
function outOfBounds(m: string, kind: "list" | "array" | "string"): string | null {
  const b = /^Index (-?\d+) out of bounds for length (\d+)$/.exec(m);
  if (!b) return null;
  const [i, n] = [Number(b[1]), Number(b[2])];
  const size = kind === "list" ? "size()" : kind === "array" ? "length" : "length()";
  const asked = kind === "string" ? `the character at index ${i}` : `index ${i}`;
  if (n === 0) return `The program asked for ${asked} of an empty ${kind}, which has no indexes at all.${kind === "list" ? " Check size() before reading, or add values first." : ""}`;
  const of = kind === "list" ? `a list with ${plural(n, "value", "values")}` : kind === "array" ? `an array of length ${n}` : `a string of length ${n}`;
  let hint = "";
  if (i === -1) hint = kind === "array" ? " Indexes start at 0; -1 is often what a search gives back when it finds nothing." : " Indexes start at 0; -1 is what indexOf gives back when it finds nothing.";
  else if (i < 0) hint = " Indexes start at 0, so a negative index never works.";
  else if (i === n) hint = ` Index ${n} is one past the end: a loop with <= ${size} instead of < ${size}, or one counting down that starts at ${size}, is a common cause.`;
  return `The program asked for ${asked} of ${of}. Its indexes go from 0 to ${size} - 1, here 0 to ${n - 1}.${hint}`;
}

/** What a helpful NullPointerException message says was null, in plain words. */
function nullThing(because: string): string {
  const t = because.replace(/^"|"$/g, "");
  if (/^<(local|parameter)\d+>$/.test(t)) return "a variable";
  if (/^<(local|parameter)\d+>\[/.test(t) || /\[[^\]]*\]$/.test(t)) return "an element of an array";
  const ret = /^the return value of "(?:[\w$]+\.)*([\w$]+\([^)]*\))"$/.exec(because);
  if (ret) return `the value ${ret[1].replace(/\(.*\)/, "()")} returned`;
  const field = /^(this|[\w$]+)\.([\w$]+)$/.exec(t);
  if (field) return field[1] === "this" ? `the instance variable ${field[2]}` : `the variable ${field[2]}`;
  return /^[\w$]+$/.test(t) ? `the variable ${t}` : "a value";
}

function explainNull(m: string): string {
  const call = /^Cannot invoke "(?:[\w$]+\.)*([\w$]+)\.([\w$]+)\((.*?)\)" because (.+) is null$/.exec(m);
  if (call) {
    const [, type, method, , because] = call;
    const primitive: Record<string, string> = { Integer: "int", Double: "double", Long: "long", Boolean: "boolean", Character: "char" };
    if (primitive[type] && /Value$/.test(method))
      return `The program used ${/^[AEIOU]/.test(type) ? "an" : "a"} ${type} that is null as a plain ${primitive[type]} (it was ${nullThing(because)}). null means "no value": a list, a map or a variable that was never set may have given it.`;
    const own = /^"this\.([\w$]+)"$/.exec(because)?.[1];
    return `The program called ${method}() on ${/^[AEIOU]/.test(type) ? "an" : "a"} ${type} that is null: ${nullThing(because)} holds no object, so there is nothing to call ${method}() on. ${own ? `An instance variable of a class type is null until the constructor or a method gives it an object: check that ${own} gets one, for example in the constructor.` : "Check where that value was supposed to be set."}`;
  }
  const arr = /^Cannot (?:load from \w+ array|store to \w+ array|read the array length) because (.+) is null$/.exec(m);
  if (arr)
    return `The program used an array that is null: ${nullThing(arr[1])} holds no array. An array exists only after new, for example new int[5].`;
  const field = /^Cannot (?:read|assign) field "([\w$]+)" because (.+) is null$/.exec(m);
  if (field) return `The program used the instance variable ${field[1]} of an object that is null: ${nullThing(field[2])} holds no object.`;
  return `The program used a variable that holds null (no object) as if it held an object.${m ? " " + m + "." : ""}`;
}

function explainNumber(m: string): string {
  if (m === "empty String") return "The program tried to turn empty text into a number. An empty line read with nextLine(), or an empty piece after split, can cause this.";
  const text = /^For input string: "(.*)"(?: under radix \d+)?$/s.exec(m)?.[1];
  if (text == null) return /null/.test(m) ? "The program tried to turn null into a number." : `The program tried to turn text into a number, but the text isn't a number: ${m}.`;
  if (text === "") return "The program tried to turn empty text into a number. An empty line read with nextLine(), or an empty piece after split, can cause this.";
  const bare = text.trim();
  if (bare !== text && /^[-+]?\d+$/.test(bare)) return `The program tried to turn "${text}" into a number, but the text has a space at its start or end, and Integer.valueOf doesn't skip spaces. trim() removes them: Integer.valueOf(text.trim()).`;
  if (/^[-+]?\d+\.\d+$/.test(bare)) return `The program tried to turn "${text}" into a whole number, but it has a decimal point. Double.valueOf reads numbers with decimals.`;
  if (/[,;]/.test(bare)) return `The program tried to turn "${text}" into a number, but a comma or semicolon can't be part of a number. If it separates values (like "Ada,36"), split the text at it first and turn only the number part into a number. A decimal number is written with a point, such as 3.5.`;
  if (/^[-+]?\d+$/.test(bare)) return `The program tried to turn "${text}" into an int, but it's outside the range an int can hold, -2147483648 to 2147483647. A long can hold bigger whole numbers.`;
  return `The program tried to turn the text "${text}" into a number, but it isn't one.`;
}

function explainStringIndex(m: string): string {
  const plain = outOfBounds(m, "string");
  if (plain) return plain;
  const r = /^Range \[(-?\d+), (-?\d+)\) out of bounds for length (\d+)$/.exec(m) ?? /^begin (-?\d+), end (-?\d+), length (\d+)$/.exec(m);
  if (r) return `The program asked for a part of a string of length ${r[3]}, from index ${r[1]} up to ${r[2]}. With substring, both indexes must be between 0 and ${r[3]}, and the first can't be larger than the second.`;
  return `The program used an index that isn't inside the string. ${m}. A string's indexes go from 0 to length() - 1.`;
}

const EXCEPTIONS: [RegExp, (message: string) => string][] = [
  [/ArithmeticException$/, (m) => (/by zero/.test(m) ? "The program divided a whole number by zero (or took % 0)." : "A calculation failed.")],
  [/ArrayIndexOutOfBoundsException$/, (m) => outOfBounds(m, "array") ?? `The program used an array index that doesn't exist. ${m}. Indexes go from 0 to length - 1.`],
  [/StringIndexOutOfBoundsException$/, explainStringIndex],
  [
    /IndexOutOfBoundsException$/,
    (m) => {
      const add = /^Index: (-?\d+), Size: (\d+)$/.exec(m);
      if (add) return `The program used index ${add[1]} of a list with ${plural(Number(add[2]), "value", "values")}. Its indexes go from 0 to size() - 1; add(index, value) can also add at index size(), the end.`;
      return outOfBounds(m, "list") ?? `The program asked a list for an index it doesn't have. ${m}. Indexes go from 0 to size() - 1.`;
    },
  ],
  [/NullPointerException$/, explainNull],
  [/NumberFormatException$/, explainNumber],
  [/InputMismatchException$/, () => "The program asked the Scanner for a number, but the next input wasn't one."],
  [/NoSuchElementException$/, (m) => (/No line found/.test(m) ? "The program asked for more input than it was given: it read another line after the input ran out." : "The program asked for the next element, but there wasn't one.")],
  [/ClassCastException$/, explainCast],
  [/ConcurrentModificationException$/, () => "The program added to or removed from a list while a for-each loop was going through it. Loop over the indexes instead (going backwards when removing), or collect the changes and make them after the loop."],
  [/StackOverflowError$/, () => "A method kept calling itself (or methods kept calling each other) without stopping, until the call stack ran out of room. Check the stopping condition of the recursion."],
  [/OutOfMemoryError$/, () => "The program used up all its memory, for example by adding to a list forever."],
  [/UnsupportedOperationException$/, () => "This collection can't be changed (lists from List.of(...) are fixed). Copy it into a new ArrayList<>(...) first."],
  [/FileNotFoundException$|NoSuchFileException$/, (m) => `The program tried to open a file that doesn't exist: ${m}.`],
  [/NegativeArraySizeException$/, () => "The program tried to create an array with a negative size."],
  [/ArrayStoreException$/, () => "The program put an object of the wrong type into an array."],
  [/ExceptionInInitializerError$/, () => "Setting up a class failed: code in a static field or static block threw an exception."],
  [/IllegalArgumentException$|IllegalStateException$/, (m) => (m ? `The program stopped itself with this message: ${m}` : "A method rejected its arguments.")],
];

const LAUNCHER: [RegExp, (m: RegExpExecArray) => Crash][] = [
  [
    /^Error: Main method not found in class ([\w.$]+)/,
    (m) => ({ exception: "no main method", message: "", line: null, method: null, explanation: `Java starts a program at public static void main(String[] args), and class ${m[1]} doesn't have it. Check the spelling of main, and that it is public static void with a String[] parameter.` }),
  ],
  [
    /^Error: Main method is not static in class ([\w.$]+)/,
    (m) => ({ exception: "main is not static", message: "", line: null, method: null, explanation: `The main method of ${m[1]} must be static: public static void main(String[] args).` }),
  ],
  [
    /^Error: Could not find or load main class ([\w.$]+)/,
    (m) => ({ exception: "no main class", message: "", line: null, method: null, explanation: `There is no class called ${m[1]} to start. The class with main must be named ${m[1]} (and the file ${m[1].split(".").pop()}.java).` }),
  ],
];

/**
 * Reads an uncaught exception (or a launcher error, such as a missing main method) from a Java
 * program's stderr and explains it, or null if there is none. `sourceFiles` are the learner's
 * files ("Main.java"): the reported line is the first stack frame in one of them. When the
 * exception has a cause ("Caused by:"), the innermost cause is explained.
 */
export function explainCrash(stderr: string, sourceFiles: string[] = ["Main.java"]): Crash | null {
  const lines = stderr.split("\n");
  for (const [re, make] of LAUNCHER) {
    const m = re.exec(lines[0] ?? "");
    if (m) return make(m);
  }
  const start = lines.findIndex((l) => l.startsWith('Exception in thread "main" '));
  if (start < 0) return null;
  // The innermost "Caused by:" is usually what went wrong; the outer exceptions wrap it.
  let headIndex = start;
  for (let i = start + 1; i < lines.length; i++) if (lines[i].startsWith("Caused by: ")) headIndex = i;
  const head = headIndex === start ? lines[start].slice('Exception in thread "main" '.length) : lines[headIndex].slice("Caused by: ".length);
  const colon = head.indexOf(": ");
  const exception = colon < 0 ? head.trim() : head.slice(0, colon);
  const message = colon < 0 ? "" : head.slice(colon + 2);
  const files = sourceFiles.map((f) => f.split("/").pop());
  let line: number | null = null;
  let method: string | null = null;
  let file: string | undefined;
  for (const l of lines.slice(headIndex + 1)) {
    if (l.startsWith("Caused by: ")) break;
    const m = /^\s+at (?:[\w.$]+\/)?[\w.$]+\.([\w$<>]+)\(([\w$]+\.java):(\d+)\)/.exec(l);
    if (!m || !files.includes(m[2])) continue;
    line = Number(m[3]);
    file = m[2];
    method = m[1].startsWith("lambda$") ? m[1].split("$")[1] : m[1];
    break;
  }
  const short = exception.split(".").pop()!;
  const rule = EXCEPTIONS.find(([re]) => re.test(exception));
  const explanation = rule ? rule[1](message) : `The program stopped with ${short}${message ? ": " + message : ""}.`;
  return { exception: short, message, file, line, method, explanation };
}
