// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import { ancestorsOf, classAt, declares, droppedLink, fileName, isRealSubtype, isSubtype, ownClasses, parameterTypes, splitTopLevel, subtypesOf, type HeaderLink, type OwnClass, type OwnClasses } from "./own-classes";
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
      const m = /class ([\w$]+) is public, should be declared in a file named ([\w$]+\.java)/.exec(d.message);
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
    explain: (d, own) => implicitSuper(d, own, `it takes (${spaced(/required: (.*)/.exec(d.message)?.[1] ?? "")})`),
  },
  { code: "compiler.err.cant.apply.symbol", when: /^constructor ([\w$]+) in class \1 cannot be applied/, explain: superArguments },
  {
    code: "compiler.err.cant.apply.symbol",
    when: /^constructor [\w$]+ in class [\w$.]+ cannot be applied[\s\S]*required: no arguments/,
    explain: (d) => {
      const c = /^constructor ([\w$]+)/.exec(d.message)?.[1];
      return `The object is created with values, but ${c} has no constructor that takes any. A class without a constructor of its own gets an empty one, so only new ${c}() works. Write a constructor with these parameters in ${c}.`;
    },
  },
  {
    code: "compiler.err.cant.apply.symbol",
    when: /^constructor /,
    explain: (d) => `The values in new ${/^constructor ([\w$]+)/.exec(d.message)?.[1]}(...) don't match the constructor's parameters. Compare their number, order and types (Java lists what it required and what it found).`,
  },
  { code: "compiler.err.cant.apply.symbol", explain: () => "The method was called with the wrong number or types of arguments. Compare the call with the method's parameter list (Java lists what it required and what it found)." },
  {
    code: "compiler.err.cant.apply.symbols",
    when: /^no suitable constructor found for [\w$]+\(no arguments\)/,
    explain: (d, own) => {
      if (/has private access/.test(d.message)) return null;
      const takes = [...d.message.matchAll(/constructor [\w$.]+\((.*?)\) is not applicable/g)].map((m) => `(${spaced(m[1])})`);
      return takes.length ? implicitSuper(d, own, `its constructors take ${takes.join(" or ")}`) : null;
    },
  },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable constructor found for ([\w$]+)/, explain: (d) => `None of the constructors of ${/^no suitable constructor found for ([\w$]+)/.exec(d.message)?.[1]} takes these values. Check the number, order and types of the values in the parentheses.` },
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
/** A class's simple name in javac's messages, which write a nested class with a dot: Dog for Main.Dog or animals.Dog. */
const simple = (name: string) => name.split(".").pop() || name;
/** A class's simple name in a message of the running program, which writes a nested class with $: Dog for Main$Dog or animals.Dog. */
const binarySimple = (name: string) => name.split(/[.$]/).pop() || name;
/** "a class", "an interface", "an enum" or "a record". */
const aKind = (kind: OwnClass["kind"]) => (kind === "class" || kind === "record" ? `a ${kind}` : `an ${kind}`);
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

/** A method's name and parameters on a line that declares it. */
const METHOD_IN = /([\w$]+)\s*\([^()]*\)\s*(?:throws\s[^{;]*)?(?:\{|;|$)/;
/** The method a line declares: makeSound in "abstract void makeSound() {". */
const methodIn = (line: string) => METHOD_IN.exec(line)?.[1];

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
  if (cls === parent) {
    const t = own.types.get(cls);
    // An enum or a record can't be abstract: the method needs a body.
    if (t?.kind === "enum") {
      const each = t.constants.length ? ` Or, if each constant should do it in its own way, give every constant a body of its own, in { } after its name, with ${method} in it, as in ${t.constants[0]} { ... }.` : "";
      return `${cls} is an enum, and its method ${sig} is abstract: it has no body. An enum can't be abstract, so give ${method} a body in ${cls} and remove the word abstract from it.${each}`;
    }
    if (t?.kind === "record") return `${cls} is a record, and its method ${sig} is abstract: it has no body. A record can't be abstract, so give ${method} a body and remove the word abstract from it.`;
    return `${cls} has an abstract method, ${sig}, which has no body, so ${cls} must be abstract too: write abstract class ${cls}. If ${cls} is meant for creating objects, give ${method} a body instead and remove the word abstract from it.`;
  }
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

/** A parameter list's types and names: [{ type: "String", name: "name" }] for "final String name". */
function declared(list: string): { type: string; name: string }[] {
  return splitTopLevel(list)
    .map((p) => /^(?:final\s+|@[\w$.]+(?:\s*\([^)]*\))?\s*)*(.+?)\s+([\w$]+)$/.exec(p.trim()))
    .filter((p) => p != null)
    .map((p) => ({ type: p[1], name: p[2] }));
}

/** A type as it can be compared: String for java.lang.String, List<String> for java.util.List<java.lang.String>. */
const bareType = (t: string) => t.replace(/\s+/g, "").replace(/[\w$]+(?:\.[\w$]+)+/g, (q) => q.split(".").pop()!);

/**
 * The super(...) call that passes this constructor's parameters (`params`, as written) on to the
 * parent's constructor, which takes `required` (javac's list of types), or null when it isn't
 * certain. When the program declares that constructor, its parameter names say which value goes
 * where; otherwise each type must occur only once, in both lists.
 */
function superCall(own: OwnClasses, parent: string, params: string, required: string): { call: string | null; theirs: string | null } {
  const need = splitTopLevel(required).map(bareType);
  const have = declared(params).map((p) => ({ type: bareType(p.type), name: p.name }));
  const theirs = own.types.get(parent)?.constructors.find((c) => {
    const ps = declared(c);
    return ps.length === need.length && ps.every((p, i) => bareType(p.type) === need[i]);
  });
  if (theirs != null) {
    const names = declared(theirs);
    const covered = names.every((p) => have.some((h) => h.name === p.name && h.type === bareType(p.type)));
    return { call: covered ? `super(${names.map((p) => p.name).join(", ")})` : null, theirs };
  }
  const count = (list: string[], t: string) => list.filter((x) => x === t).length;
  const types = have.map((h) => h.type);
  const once = need.every((t) => count(need, t) === 1 && count(types, t) === 1);
  return { call: once ? `super(${need.map((t) => have.find((h) => h.type === t)!.name).join(", ")})` : null, theirs: null };
}

/** The parent's constructor can't be called without values, and the subclass doesn't call it with any. */
function implicitSuper(d: Diagnostic, own: OwnClasses, takes: string): string | null {
  const parent = /^(?:constructor|no suitable constructor found for) ([\w$]+)/.exec(d.message)?.[1];
  const c = atCaret(d);
  if (!parent || !c || constructorCall(d) !== "implicit") return null;
  const cls = /^(?:[\w$]+\s+)*(?:class|enum|record)\s+([\w$]+)/.exec(c.at)?.[1];
  const required = /required: (.*)/.exec(d.message)?.[1];
  const [, ctor, params] = /([\w$]+)\s*\(([^()]*)\)\s*(?:throws\s[^{]*)?\{/.exec(c.line) ?? [];
  const { call, theirs } = required && required !== "no arguments" ? superCall(own, parent, cls ? "" : params ?? "", required) : { call: null, theirs: null };
  // With the parent's own constructor, its parameters are shown as written, names and all.
  const missing = `${parent} has no such constructor: ${theirs != null ? `it takes (${theirs})` : takes}.`;
  if (cls) return `${cls} has no constructor, so Java gives it an empty one, which calls super(): the constructor of ${parent} without parameters. ${missing} Write a constructor for ${cls} that gets those values as its parameters and passes them on with super(...) on its first line.`;
  const fix = call
    ? `Make ${call} the constructor's first line, to pass ${call.includes(",") ? "those values" : "that value"} on.`
    : `Make the constructor's first line super(...) with the values ${parent} needs${required ? ", in that order" : ""} (the constructor may need more parameters to get them).`;
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
  // The code from the @Override on, with comments and strings blanked out (in the whole file, so a
  // comment that starts above counts), and without other annotations, which may have parentheses.
  const text = own.code.get(fileName(d.file))?.slice(d.line - 1, d.line + 4).join("\n") ?? "";
  const annotation = /@(?:java\.lang\.)?Override\b/.exec(text);
  const after = annotation ? text.slice(annotation.index + annotation[0].length).replace(/@[\w$.]+(?:\s*\([^)]*\))?/g, " ") : "";
  const header = annotation && /^[^(;{}]*?([\w$]+)\s*\(([^)]*)\)/.exec(after);
  if (!header) return general;
  const name = header[1];
  const params = header[2].replace(/\s+/g, " ").trim();
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
  if (found && where && found.params === parameterTypes(params)) {
    // The same name and parameter types as the parent's method: something else keeps them apart.
    const dropped = cls ? droppedLink(own, cls.name, where) : null;
    if (cls && dropped)
      return `@Override says that ${name} replaces the method ${name} of ${where}, and their parameter types match, but Java doesn't count ${where} as a parent of ${cls.name}: ${wrongLink(own, dropped)}. Java reports an error for that header too. Fix the header, and this error goes away with it.`;
    const owner = own.types.get(where);
    if (owner?.members.some((x) => x.method && x.static && x.name === name && x.params === found.params)) {
      const belongs = `${name} is static in ${where}: a static method belongs to the ${owner.kind === "interface" ? "interface" : "class"} ${where} itself, not to its objects, so no method can replace it.`;
      // An interface's static method isn't inherited, so a method with its name is simply a new one; a class's static method blocks one that isn't static.
      if (owner.kind === "interface") return `${belongs} Remove @Override from ${name} here, or, if each class should be able to replace it, write default instead of static in ${where}.`;
      return `${belongs} If subclasses should replace it, remove static from ${name} in ${where}. If it should stay static, make ${name} here static too and remove @Override: then it is a separate method of ${cls?.name ?? "this class"}.`;
    }
    // javac says this too when it can't find the class that this class, or one above it, extends.
    const unknown = cls && [cls, ...parents].find((t) => t.kind === "class" && t.extends.length === 1 && !own.types.has(t.extends[0]));
    if (unknown)
      return `${name} has the same parameter types as the method ${name} of ${where}, so the @Override itself looks right. But ${unknown.name} extends ${unknown.extends[0]}, and Java can't match the methods while it can't find ${unknown.extends[0]}: if another error says "cannot find symbol" about ${unknown.extends[0]}, fix that first, and this error goes away too.`;
    return general;
  }
  if (name === "equals" && where === "Object")
    return `@Override says that this equals replaces the equals every class gets from Object, but that one takes an Object: write public boolean equals(Object compared), not equals(${params}). Inside it, check the type with instanceof and cast compared to your class.`;
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
  if (t.kind === "enum") {
    // Some constants have a body and this one (at the caret) doesn't, while the enum has an abstract method.
    const constant = /^[\w$]+/.exec(atCaret(d)?.at ?? "")?.[0];
    const method = t.members.find((m) => m.method && m.abstract)?.name;
    const which = method ? `the abstract method ${method}` : "an abstract method";
    const give = constant && t.constants.includes(constant) ? `, and ${constant} has none. Give ${constant} a body like the other constants have, ${constant} { ... }, with ${method ?? "the method"} in it` : ". Give each constant a body in { } after its name";
    return `${name} has ${which}, so each of its constants needs a body that writes it${give}. Or give ${method ?? "the method"} a body in ${name} itself and remove the word abstract from it.`;
  }
  // Only a class or a record can be created with new (an enum's objects are its constants).
  const sub = subtypesOf(own, name).find((s) => !s.abstract && (s.kind === "class" || s.kind === "record"));
  const instead = sub ? `, such as ${sub.name}: ${name} ${varFor(name)} = new ${sub.name}(...);` : ".";
  const constants = subtypesOf(own, name).find((s) => s.kind === "enum" && s.constants.length);
  if (t.kind === "interface" && !sub && constants)
    return `${name} is an interface: it only lists methods, so there is no object to create from it. The enum ${constants.name} implements ${name}, so each of its constants is ${an(name)}: ${name} ${varFor(name)} = ${constants.name}.${constants.constants[0]}; Or create an object of a class that implements ${name}.`;
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

/** Whether the code before javac's caret (a dot) ends with the type's name, as in Animal.create(), also when the dot starts the next line. */
function classNameBefore(d: Diagnostic, own: OwnClasses, c: { line: string; at: string }, type: string): boolean {
  const code = own.code.get(fileName(d.file));
  const line = code?.[d.line - 1]?.length === c.line.length ? code[d.line - 1] : c.line;
  let before = line.slice(0, c.line.length - c.at.length);
  if (!before.trim() && code && d.line >= 2) before = code[d.line - 2] ?? "";
  return new RegExp(`(?:^|[^\\w$])${type.replace(/\$/g, "\\$")}\\s*$`).test(before);
}

/** "cannot find symbol" for a method looked up in one of the program's own types that has subclasses. */
function notInOwnType(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type|class) ([\w$.]+)(?:<.*>)?$/m.exec(d.message);
  if (!m) return null;
  const [, method, args, variable] = m;
  const type = simple(m[4]);
  if (!own.types.has(type)) return null;
  const call = `${method}(${spaced(args)})`;
  const c = atCaret(d);
  const qualified = !!variable || !!c?.at.startsWith(".");
  // A private method of a parent isn't inherited, so javac doesn't find it in the subclass.
  const hidden = ancestorsOf(own, type).find((a) => a.members.some((x) => x.name === method && x.method && x.private));
  if (hidden) return `${method} is private in ${hidden.name}, so only code inside ${hidden.name} can call it. Not even ${type}, which extends ${hidden.name}, can. If subclasses should use it, make it protected in ${hidden.name} (or public).`;
  const subs = subtypesOf(own, type);
  if (!subs.length) return null;
  const has = subs.filter((s) => declares(s, method, true));
  // Animal.create(): the class's own name before the dot, not a value of its type.
  if (!variable && qualified && c && classNameBefore(d, own, c, type)) {
    const dots = `${method}(${args ? "..." : ""})`;
    if (!has.length) return `${type} before the dot is the name of the class, and neither ${type} nor its subclasses have a method ${call}. Check the spelling (upper and lower case matter) and the values in the parentheses.`;
    const isStatic = (h: OwnClass) => h.members.some((x) => x.method && x.static && x.name === method);
    if (has.every(isStatic))
      return `${method} belongs to ${has.map((h) => h.name).join(" and ")}, not to ${type}, so ${type}.${dots} doesn't find it: a static method is called through the class that declares it. Write ${has.map((h) => `${h.name}.${dots}`).join(" or ")} instead.`;
    const one = has.find((h) => !isStatic(h) && !h.abstract) ?? has.find((h) => !isStatic(h))!;
    const x = varFor(one.name);
    const example = one.abstract ? `such as a variable of type ${one.name}.` : `for example: ${one.name} ${x} = new ${one.name}(...); ${x}.${dots};`;
    return `${type} before the dot is the name of the class, not an object, so ${type}.${dots} looks for a static method ${method} in ${type}, and there is none. ${one.name} has ${method} as a method of its objects: call it on one of them, ${example}`;
  }
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

/** What is wrong with a header link javac doesn't accept (see accepted in own-classes), and how the header should read. */
function wrongLink(own: OwnClasses, link: HeaderLink): string {
  const { from, to, keyword } = link;
  const kind = own.types.get(to)?.kind ?? "class";
  if (from.kind === "class" && keyword === "extends" && from.extends.length > 1) return `the header of ${from.name} extends ${from.extends.join(" and ")}, but a class can extend only one class`;
  if (from.kind === "class" && keyword === "implements")
    return kind === "class" ? `the header of ${from.name} says implements ${to}, but ${to} is a class, and a class extends a class: class ${from.name} extends ${to}` : `the header of ${from.name} says implements ${to}, but ${to} is ${aKind(kind)}, and implements is only for interfaces`;
  if (from.kind === "class") return `the header of ${from.name} says extends ${to}, but ${to} is an interface, and a class implements an interface: class ${from.name} implements ${to}`;
  if (from.kind === "interface") return `the header of the interface ${from.name} says extends ${to}, but ${to} is ${aKind(kind)}, and an interface can only extend other interfaces`;
  return `the header of the ${from.kind} ${from.name} says ${keyword} ${to}, but ${to} is ${aKind(kind)}, and ${aKind(from.kind)} can only implement interfaces`;
}

/**
 * When javac's caret is in the collection of a for-each loop's header, as in for (Dog d : animals):
 * the loop variable, and the collection's text when the header's end is on the caret's line. The
 * text before the caret (with the two lines above it, for a header split over lines) must still be
 * inside the header's ( ), after its : and without a ; (which would make it a classic for loop).
 */
function forEachAt(d: Diagnostic, own: OwnClasses): { variable: string; collection: string | null } | null {
  const c = atCaret(d);
  if (!c) return null;
  const caret = c.line.length - c.at.length;
  const code = own.code.get(fileName(d.file));
  const line = code?.[d.line - 1]?.length === c.line.length ? code[d.line - 1] : c.line;
  const above = code?.[d.line - 1]?.length === c.line.length ? code.slice(Math.max(0, d.line - 3), d.line - 1) : [];
  const before = [...above, line.slice(0, caret)].join("\n");
  let open = -1;
  for (const f of before.matchAll(/\bfor\s*\(/g)) open = f.index + f[0].length;
  if (open < 0) return null;
  let depth = 0;
  let colon = -1;
  for (let k = open; k < before.length; k++) {
    const ch = before[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth < 0) return null;
    } else if (depth === 0 && ch === ";") return null;
    else if (depth === 0 && ch === ":" && colon < 0) colon = k;
  }
  // Before the colon: a variable's type and name, such as "Dog d" or "final Dog d" (not "Dog d = a ? b" of a classic for).
  const variable = colon < 0 ? null : /^\s*(?:final\s+)?(?:@[\w$.]+\s+)*[\w$.<>\[\], ?]+?\s+([\w$]+)\s*$/.exec(before.slice(open, colon))?.[1];
  if (!variable) return null;
  // The collection: from the colon to the ) that closes the header, when both are on the caret's line.
  const start = colon - (before.length - caret);
  let collection: string | null = null;
  if (start >= 0) {
    let level = 0;
    for (let k = start + 1; k < line.length; k++) {
      if ("([{".includes(line[k])) level++;
      else if (")]}".includes(line[k]) && --level < 0) {
        collection = c.line.slice(start + 1, k).trim() || null;
        break;
      }
    }
  }
  return { variable, collection };
}

/** "incompatible types: Animal cannot be converted to Dog", with two of the program's own types. */
function ownConversion(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+) cannot be converted to ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  if (!own.types.has(from) || !own.types.has(to)) return null;
  // The headers make one a kind of the other, but only through a link javac doesn't accept, such as
  // class Dog implements Animal with Animal a class: javac leaves that link out, so the fix is in that header.
  const dropped = droppedLink(own, from, to) ?? droppedLink(own, to, from);
  if (dropped) {
    const [sub, sup] = isSubtype(own, from, to) ? [from, to] : [to, from];
    return `Java doesn't count ${sub} as ${an(sup)}: ${wrongLink(own, dropped)}. Java reports an error for that header too. Fix the header first, and this error may go away with it.`;
  }
  // For javac, a from is a to here: then something else is wrong, which this can't tell.
  if (isRealSubtype(own, from, to)) return null;
  const at = atCaret(d)?.at ?? "";
  if (!isRealSubtype(own, to, from)) {
    const common = [...own.types.values()].find((a) => a.name !== from && a.name !== to && isRealSubtype(own, from, a.name) && isRealSubtype(own, to, a.name));
    return `${from} and ${to} are different types, and neither one extends or implements the other, so ${an(from)} can't go in ${an(to)} variable.${common ? ` Both are kinds of ${common.name}, so a variable of type ${common.name} can hold either.` : ""}`;
  }
  // for (Dog d : animals), with a list or an array of Animals: each element has to be checked in the loop.
  const loop = forEachAt(d, own);
  if (loop) {
    const { collection } = loop;
    const plain = collection && /^[\w$]+$/.test(collection) ? collection : undefined;
    const e = varFor(from, plain);
    const x = varFor(to, e);
    return `This for-each loop puts each element of ${collection ?? "the list or array"} in the variable ${loop.variable}, of type ${to}, but the elements have the type ${from}. Every ${to} is ${an(from)}, but not every ${from} is ${an(to)}, so Java won't do that by itself. Loop with the elements' type, and check and cast each element inside the loop: for (${from} ${e} : ${collection ?? "..."}) { if (${e} instanceof ${to}) { ${to} ${x} = (${to}) ${e}; ... } }. Or, if only ${to} objects belong in ${collection ? "it" : "the list or array"}, give it the element type ${to}.`;
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
  const line = atCaret(d)?.line ?? "";
  const header = METHOD_IN.exec(line);
  const name = header?.[1];
  const cls = classAt(own, d.file, d.line);
  const constructor = !!name && name === cls?.name;
  const base = `${constructor ? `The constructor ${name}` : name ? `The method ${name}` : "This method"} has no body. Add { ... } after the parentheses (and remove any semicolon right after them).`;
  // Offer abstract only where Java allows it: an instance method of a class (not an interface, enum or
  // record) without a word that can't go with abstract, in a class that is abstract already or has
  // subclasses (an abstract class can't be created with new, so a class with none is left as it is).
  const words = header ? line.slice(0, header.index) : "";
  if (!name || constructor || cls?.kind !== "class" || /\b(static|private|final|synchronized|native|strictfp|default)\b/.test(words)) return base;
  if (!cls.abstract && !subtypesOf(own, cls.name).length) return base;
  return `${base} If it's meant to be abstract, so that each subclass writes its own, write abstract in front of it${cls.abstract ? "" : `, and make the class abstract too: abstract class ${cls.name}`}.`;
}

/**
 * The message of a ClassCastException: "class Dog cannot be cast to class Cat (Dog and Cat are in
 * unnamed module of loader 'app')". `library` is whether it was thrown in Java's own code (its first
 * stack frame isn't in one of the learner's files), such as a TreeSet comparing its elements: then
 * the learner wrote no cast there.
 */
function explainCast(m: string, library = false): string {
  const c = /^class ([\w$.]+) cannot be cast to class ([\w$.]+)/.exec(m);
  if (!c) return "The program cast an object to a type it isn't.";
  const [from, to] = [binarySimple(c[1]), binarySimple(c[2])];
  if (library && c[2] === "java.lang.Comparable") {
    // One of Java's own classes (such as Object) can't be changed: only a Comparator helps then.
    const jdk = /^(java|javax|jdk|sun)\./.test(c[1]);
    const two = jdk ? `two objects of type ${from}` : `two ${from} objects`;
    const order = `${from} doesn't implement Comparable, so Java doesn't know which of ${two} comes first. sorted(), Arrays.sort, sort(null), a TreeSet, a TreeMap and a PriorityQueue need that order.`;
    if (jdk) return `${order} Give them a Comparator that says how to compare ${two}.`;
    return `${order} Make ${from} implement Comparable<${from}>, with a method public int compareTo(${from} other), or give them a Comparator that says how to compare ${two}.`;
  }
  if (library)
    return `Java's own code, which the program called, expected ${an(to)} here and got ${an(from)}: the cast isn't one the program wrote. This often means a collection holds objects of different types that it has to compare, such as text and numbers in one TreeSet or in a list that is sorted. Check what the program puts in it, and keep one type of value in it.`;
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
    let note: string | null = null;
    try {
      note = r.explain(d, own);
    } catch {
      // A rule that fails on odd source gives way to the next one, as if it didn't fit.
    }
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

/** Each exception's explanation, from its message and whether it was thrown in Java's own code (see explainCast). */
const EXCEPTIONS: [RegExp, (message: string, library: boolean) => string][] = [
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
  // Thrown in Java's own code: its first stack frame isn't in one of the learner's files.
  const top = lines.slice(headIndex + 1).find((l) => /^\s+at /.test(l));
  const library = !!top && !files.includes(/\(([\w$]+\.java):\d+\)/.exec(top)?.[1]);
  const short = exception.split(".").pop()!;
  const rule = EXCEPTIONS.find(([re]) => re.test(exception));
  const explanation = rule ? rule[1](message, library) : `The program stopped with ${short}${message ? ": " + message : ""}.`;
  return { exception: short, message, file, line, method, explanation };
}
