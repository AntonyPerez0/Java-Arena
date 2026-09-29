// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import type { Diagnostic } from "./types";

type Rule = { code: string; when?: RegExp; explain: (d: Diagnostic) => string };

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
  { code: "compiler.err.report.access", explain: () => "This is private, so only code inside its own class can use it. Use a public method of that class (for example a getter) instead." },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: () => "This can throw a checked exception, so Java insists you handle it: wrap it in try { ... } catch (...) { ... }, or add throws ... to the method header." },
  { code: "compiler.err.illegal.start.of.expr", explain: () => "Something here isn't a valid start of an expression. Often a bracket or parenthesis is missing earlier, or a method was declared inside another method." },
  { code: "compiler.err.illegal.start.of.type", explain: () => "Java didn't expect this here. Check for a missing or extra bracket around this line." },
  { code: "compiler.err.not.stmt", explain: () => "This isn't a complete statement on its own. Perhaps it should be assigned to a variable or printed, or = was mixed up with ==." },
  { code: "compiler.err.cant.deref", explain: () => "Primitive values like int, double and boolean have no methods, so you can't put a dot after them. Use a wrapper or a helper, for example String.valueOf(number)." },
  { code: "compiler.err.operator.cant.be.applied.1", explain: () => "This operator doesn't work with these two types, for example subtracting a String, or comparing a String with <." },
  { code: "compiler.err.operator.cant.be.applied", explain: () => "This operator doesn't work with this type, for example ! on a number." },
  { code: "compiler.err.incomparable.types", explain: () => "These two values have types that can never be equal, so comparing them with == makes no sense." },
  { code: "compiler.err.does.not.override.abstract", explain: () => "This class promises (through an interface or abstract class) to have a method it doesn't have yet. Add the missing method with exactly that name and parameters." },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: () => "You can't create an object directly from an abstract class or an interface. Create an object of a class that extends or implements it." },
  { code: "compiler.err.cant.inherit.from.final", explain: () => "This class is final, so no class can extend it." },
  { code: "compiler.err.cant.assign.val.to.var", explain: () => "This variable is final, so it can't get a new value after the first one." },
  { code: "compiler.err.invalid.meth.decl.ret.type.req", explain: () => "A method needs a return type before its name (void if it returns nothing). If this was meant to be a constructor, its name must match the class name exactly." },
  { code: "compiler.err.missing.meth.body.or.decl.abstract", explain: () => "This method has no body. Add { ... } after the parentheses (and remove any semicolon right after them)." },
  { code: "compiler.err.break.outside.switch.loop", explain: () => "break only works inside a loop or a switch." },
  { code: "compiler.err.illegal.char", explain: () => "This character isn't allowed in Java code. It may be a curly quote or another symbol pasted from a document; retype it." },
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

/** A plain-English note for one javac diagnostic, or null when there is no rule for it. */
export function explainDiagnostic(d: Diagnostic): string | null {
  for (const r of RULES) {
    if (r.code !== d.code) continue;
    if (r.when && !r.when.test(d.message)) continue;
    return r.explain(d);
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
  [/ClassCastException$/, () => "The program cast an object to a type it isn't."],
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
