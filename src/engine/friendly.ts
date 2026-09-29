// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import type { Diagnostic } from "./types";

type Rule = { code: string; when?: RegExp; explain: (d: Diagnostic) => string };

const quoted = (m: string) => /'([^']+)'/.exec(m)?.[1];

const RULES: Rule[] = [
  { code: "compiler.err.expected", when: /^';' expected/, explain: () => "Java needs a semicolon ; at the end of this statement. Look at the end of the line the arrow points to (or the line before it)." },
  { code: "compiler.err.expected", explain: (d) => `Java expected ${quoted(d.message) ? `'${quoted(d.message)}'` : "something else"} here. Check for a missing bracket, parenthesis or semicolon just before the arrow.` },
  { code: "compiler.err.expected3", explain: () => "Java expected a different symbol here. Check for a missing bracket, parenthesis or semicolon just before the arrow." },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: () => "Java doesn't know a variable with this name here. Check the spelling (upper and lower case matter) and that the variable was created before this line, inside the same block { }." },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class (Scanner|ArrayList|HashMap|List|Map|Random|HashSet|Set|Arrays|Collections|LocalDate|Files|Paths|Path)\b/, explain: (d) => `To use ${/symbol:\s+class (\w+)/.exec(d.message)?.[1]}, import it at the top of the file, for example import java.util.Scanner;` },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: () => "Java doesn't know a class with this name. Check the spelling and capital letters, and whether it needs an import at the top of the file." },
  { code: "compiler.err.doesnt.exist", when: /^package system does not exist/, explain: () => "System needs a capital S. With a small s, Java reads system as the name of a package (a folder of classes), and there is no such package." },
  { code: "compiler.err.doesnt.exist", explain: () => "Java can't find this package. Check the spelling of the import or name before the dot, for example java.util.Scanner." },
  { code: "compiler.err.cant.resolve.location.args", explain: () =>"There is no method with this name that takes these arguments. Check the spelling, and which methods this type really has." },
  { code: "compiler.err.cant.resolve.location", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.cant.resolve", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.prob.found.req", when: /possible lossy conversion/, explain: () => "This would squeeze a bigger or more precise number type into a smaller one and could lose information, for example a double into an int. Convert it on purpose with a cast such as (int), or use a variable of the bigger type." },
  { code: "compiler.err.prob.found.req", when: /cannot be converted to/, explain: () => "The value on the right has a different type than the variable or parameter expects. For example text in quotes is a String, not an int; Integer.valueOf(...) turns text into a number." },
  { code: "compiler.err.prob.found.req", when: /unexpected return value/, explain: () => "This method is void, so it can't return a value. Change void to the value's type, or remove the value after return." },
  { code: "compiler.err.prob.found.req", when: /missing return value/, explain: () => "This method must return a value: write return followed by the value." },
  { code: "compiler.err.prob.found.req", explain: () => "The types here don't match what Java expects." },
  { code: "compiler.err.void.not.allowed.here", explain: () => "This uses the value of a method that is void, so there is no value to print or store. Give the method a return type (such as int) and a return statement, or call it on a line of its own." },
  { code: "compiler.err.missing.ret.stmt", explain: () => "This method promises to return a value, but some path through it reaches the end without a return statement. Make sure every possible path ends with return." },
  { code: "compiler.err.unreachable.stmt", explain: () => "This line can never run, because the code before it always leaves first (for example an endless loop, a return, or a break)." },
  { code: "compiler.err.class.public.should.be.in.file", explain: () => "A public class must be in a file with exactly the same name. Rename the class to match the file (here the file is Main.java, so the class should be Main)." },
  { code: "compiler.err.unclosed.str.lit", explain: () => "This text is missing its closing quote \". Every string starts and ends with a double quote on the same line." },
  { code: "compiler.err.unclosed.char.lit", explain: () => "A char is one character between single quotes, like 'a'. Use double quotes for longer text." },
  { code: "compiler.err.empty.char.lit", explain: () => "'' is empty: a char needs exactly one character between the single quotes." },
  { code: "compiler.err.cant.apply.symbol", explain: () => "The method was called with the wrong number or types of arguments. Compare the call with the method's parameter list (Java lists what it required and what it found)." },
  { code: "compiler.err.cant.apply.symbols", explain: () => "None of the versions of this method accepts these arguments. Check the number and types of values in the parentheses." },
  { code: "compiler.err.non-static.cant.be.ref", explain: () => "main is static, so it can't use this object's methods or variables directly. Create an object first (new ...) and call the method on it, or make the method static if it doesn't need an object." },
  { code: "compiler.err.var.might.not.have.been.initialized", explain: () => "This variable is used before it has a value. Give it a starting value where you create it, for example int sum = 0;" },
  { code: "compiler.err.else.without.if", explain: () => "This else has no matching if. A common cause is a semicolon right after if (...), which ends the if before its block, or a missing { }." },
  { code: "compiler.err.premature.eof", explain: () => "The file ended while Java was still inside a block. A closing brace } is missing somewhere; every { needs its }." },
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
  line: number | null;
  method: string | null;
  explanation: string;
};

const EXCEPTIONS: [RegExp, (message: string) => string][] = [
  [/ArithmeticException$/, (m) => (/by zero/.test(m) ? "The program divided a whole number by zero (or took % 0)." : "A calculation failed.")],
  [/ArrayIndexOutOfBoundsException$/, (m) => `The program used an array index that doesn't exist. ${m}. Indexes go from 0 to length - 1.`],
  [/StringIndexOutOfBoundsException$/, (m) => `The program used a position that isn't inside the string. ${m}. Positions go from 0 to length() - 1.`],
  [/IndexOutOfBoundsException$/, (m) => `The program asked a list for an index it doesn't have. ${m}. Indexes go from 0 to size() - 1.`],
  [/NullPointerException$/, (m) => `The program used a variable that holds null (no object) as if it held an object.${m ? " " + m + "." : ""}`],
  [/NumberFormatException$/, (m) => `The program tried to turn text into a number, but the text isn't a number: ${m}.`],
  [/InputMismatchException$/, () => "The program asked the Scanner for a number, but the next input wasn't one."],
  [/NoSuchElementException$/, (m) => (/No line found/.test(m) ? "The program asked for more input than it was given: it read another line after the input ran out." : "The program asked for the next element, but there wasn't one.")],
  [/ClassCastException$/, () => "The program cast an object to a type it isn't."],
  [/ConcurrentModificationException$/, () => "The program changed a list while looping over it with a for-each loop. Collect the changes and apply them after the loop, or use removeIf."],
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
  for (const l of lines.slice(headIndex + 1)) {
    if (l.startsWith("Caused by: ")) break;
    const m = /^\s+at (?:[\w.$]+\/)?[\w.$]+\.([\w$<>]+)\(([\w$]+\.java):(\d+)\)/.exec(l);
    if (!m || !files.includes(m[2])) continue;
    line = Number(m[3]);
    method = m[1].startsWith("lambda$") ? m[1].split("$")[1] : m[1];
    break;
  }
  const short = exception.split(".").pop()!;
  const rule = EXCEPTIONS.find(([re]) => re.test(exception));
  const explanation = rule ? rule[1](message) : `The program stopped with ${short}${message ? ": " + message : ""}.`;
  return { exception: short, message, line, method, explanation };
}
