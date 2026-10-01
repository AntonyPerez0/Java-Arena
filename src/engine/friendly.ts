// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import { ancestorsOf, classAt, declares, droppedLink, fileName, isRealSubtype, isSubtype, knows, ownClasses, parameterTypes, splitTopLevel, subtypesOf, typeNamed, type HeaderLink, type OwnClass, type OwnClasses, type OwnMember } from "./own-classes";
import type { Diagnostic, SourceFile } from "./types";
import { declaredPackage, folderOf, packageOfPath } from "../grader/files.js";

/**
 * Rules are tried in order, so specific ones come before general ones. `explain` gets the
 * program's own classes (read from its source), and returns null when the rule doesn't fit after
 * all: the next rule for the code is tried then.
 */
type Rule = { code: string; when?: RegExp; explain: (d: Diagnostic, own: OwnClasses) => string | null };

const quoted = (m: string) => /'([^']+)'/.exec(m)?.[1];
/** javac couldn't work out the types of a generic call because of a lambda in its parentheses: "cannot infer type-variable(s) T (argument mismatch; bad return type in lambda expression ...)". */
const LAMBDA_IN_GENERIC_CALL = /cannot infer type-variable\(s\)[^\n]*\n\s*\(argument mismatch; (?:bad return type in lambda expression|lambda body is not compatible)/;

const RULES: Rule[] = [
  { code: "compiler.err.expected", when: /^';' expected/, explain: () => "Java needs a semicolon ; at the end of this statement. Look at the end of the line the arrow points to (or the line before it)." },
  { code: "compiler.err.expected", explain: (d) => `Java expected ${quoted(d.message) ? `'${quoted(d.message)}'` : "something else"} here. Check for a missing bracket, parenthesis or semicolon just before the arrow.` },
  { code: "compiler.err.expected3", explain: () => "Java expected a different symbol here. Check for a missing bracket, parenthesis or semicolon just before the arrow." },
  { code: "compiler.err.cant.resolve.location", when: /location: variable \w+ of type Object$/m, explain: objectHasNo },
  { code: "compiler.err.cant.resolve.location.args", when: /location: variable \w+ of type Object$/m, explain: objectHasNo },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable length\n/, explain: lengthOf },
  // A name that this method created in a block that has ended is stronger evidence than an enum constant of the same name.
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: outOfScope },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable [\w$]+\n\s*location: (?:class|interface|enum|record) /, explain: enumConstant },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class [\w$]+\n\s*location: package /, explain: notInPackage },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: classElsewhere },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+(?:variable|class) [\w$]+\n/, explain: importFor },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: () => "Java doesn't know a variable with this name here. Check the spelling (upper and lower case matter) and that the variable was created before this line, inside the same block { }." },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: () => "Java doesn't know a class with this name. Check the spelling and capital letters, and whether it needs an import at the top of the file." },
  { code: "compiler.err.doesnt.exist", when: /^package system does not exist/, explain: () => "System needs a capital S. With a small s, Java reads system as the name of a package (a folder of classes), and there is no such package." },
  { code: "compiler.err.doesnt.exist", explain: unknownPackage },
  { code: "compiler.err.doesnt.exist", explain: () => "Java can't find this package. Check the spelling of the import or name before the dot, for example java.util.Scanner." },
  { code: "compiler.err.cant.resolve.location.args", when: /symbol:\s+method [A-Z]/, explain: missingNew },
  { code: "compiler.err.cant.resolve.location.args", explain: notInOwnType },
  { code: "compiler.err.cant.resolve.location.args", explain: libraryMethod },
  { code: "compiler.err.cant.resolve.location.args", explain: () =>"There is no method with this name that takes these arguments. Check the spelling, and which methods this type really has." },
  { code: "compiler.err.cant.resolve.location", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.cant.resolve", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: bad return type in lambda expression/, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: lambda body is not compatible with a void functional interface/, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: unexpected return value/, explain: lambdaResult },
  // A lambda given to a generic method, such as Collections.sort(list, (a, b) -> ...): javac reports the call whose types it can't work out.
  { code: "compiler.err.prob.found.req", when: LAMBDA_IN_GENERIC_CALL, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Optional(?:Double|Int|Long)?(?:<.*>)? cannot be converted to /, explain: optionalAsValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: (?:no instance\(s\) of type variable\(s\) [\w$, ]+ exist so that )?(?:Stream|IntStream|DoubleStream|LongStream)(?:<.*?>)? (?:conforms to|cannot be converted to) /, explain: streamAsValue },
  { code: "compiler.err.prob.found.req", when: /no instance\(s\) of type variable\(s\) .* exist so that Collector<.*> conforms to Supplier<R>/, explain: numberStreamCollect },
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
  { code: "compiler.err.prob.found.req", when: /cannot be converted to Throwable$/m, explain: notThrowable },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+ cannot be converted to [\w$.]+$/m, explain: ownConversion },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: String cannot be converted to [\w$.]+$/m, explain: textToEnum },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: void cannot be converted to /, explain: voidValue },
  { code: "compiler.err.prob.found.req", when: /cannot be converted to/, explain: () => "The value on the right has a different type than the variable or parameter expects. For example text in quotes is a String, not an int; Integer.valueOf(...) turns text into a number." },
  { code: "compiler.err.prob.found.req", when: /unexpected return value/, explain: () => "This method is void, so it can't return a value. Change void to the value's type, or remove the value after return." },
  { code: "compiler.err.prob.found.req", when: /missing return value/, explain: () => "This method must return a value: write return followed by the value." },
  { code: "compiler.err.prob.found.req", explain: () => "The types here don't match what Java expects." },
  { code: "compiler.err.void.not.allowed.here", explain: () => "This uses the value of a method that is void, so there is no value to print or store. Give the method a return type (such as int) and a return statement, or call it on a line of its own." },
  { code: "compiler.err.missing.ret.stmt", explain: () => "This method promises to return a value, but some path through it reaches the end without a return statement. Make sure every possible path ends with return." },
  { code: "compiler.err.unreachable.stmt", explain: afterJump },
  { code: "compiler.err.unreachable.stmt", explain: () => "This line can never run, because the code before it always leaves first (for example an endless loop, a return, or a break)." },
  {
    code: "compiler.err.class.public.should.be.in.file",
    explain: (d) => {
      const m = /class ([\w$]+) is public, should be declared in a file named ([\w$]+\.java)/.exec(d.message);
      const here = fileName(d.file);
      // A file in a folder: the class belongs in that folder too.
      const folder = d.file.slice(0, d.file.length - here.length);
      return m
        ? `A public class must be in a file with exactly its name: class ${m[1]} belongs in ${folder}${m[2]}, but it's in ${d.file}. If it's meant to be this file's class, rename it ${here?.replace(/\.java$/, "")}. If it's an extra class, remove the word public (a class without public can share a file), or give it a file of its own.`
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
  { code: "compiler.err.cant.apply.symbol", when: /bad return type in lambda expression|lambda body is not compatible/, explain: lambdaResult },
  {
    code: "compiler.err.cant.apply.symbol",
    // javac names the class for a list whose class has a sort of its own: "method sort in class ArrayList<E>".
    when: /^method (?:sort in (?:interface List|class (?:ArrayList|Vector|CopyOnWriteArrayList))|(?:max|min) in interface Stream)<[\w$]+> cannot be applied[\s\S]*required: Comparator<[\s\S]*found:\s+no arguments/,
    explain: needsComparator,
  },
  { code: "compiler.err.cant.apply.symbol", when: /^method collect in interface (?:Int|Double|Long)Stream cannot be applied/, explain: numberStreamCollect },
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
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable method found for sort\([\w$.]+<[\w$.]+>\)[\s\S]*upper bounds: Comparable<\? super/, explain: sortNotComparable },
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
  { code: "compiler.err.already.defined", when: /^variable [\w$]+ is already defined in/, explain: lambdaParameterTaken },
  { code: "compiler.err.already.defined", explain: () => "A variable or method with this name already exists here. Use a different name, or drop the type to change the existing variable (name = ... instead of String name = ...)." },
  { code: "compiler.err.report.access", explain: privateInParent },
  { code: "compiler.err.report.access", explain: accessDenied },
  { code: "compiler.err.report.access", explain: () => "This is private, so only code inside its own class can use it. Use a public method of that class (for example a getter) instead." },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: unreported },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: () => "This can throw a checked exception, so Java insists you handle it: wrap it in try { ... } catch (...) { ... }, or add throws ... to the method header." },
  { code: "compiler.err.illegal.start.of.expr", explain: () => "Something here isn't a valid start of an expression. Often a bracket or parenthesis is missing earlier, or a method was declared inside another method." },
  { code: "compiler.err.illegal.start.of.type", explain: () => "Java didn't expect this here. Check for a missing or extra bracket around this line." },
  { code: "compiler.err.not.stmt", explain: () => "This isn't a complete statement on its own. Perhaps it should be assigned to a variable or printed, or = was mixed up with ==." },
  { code: "compiler.err.cant.deref", when: /^void cannot be dereferenced/, explain: voidDereferenced },
  { code: "compiler.err.cant.deref", explain: () => "Primitive values like int, double and boolean have no methods, so you can't put a dot after them. Use a wrapper or a helper, for example String.valueOf(number)." },
  { code: "compiler.err.operator.cant.be.applied.1", when: /^\s*(?:first|second) type:\s+Optional/m, explain: optionalInArithmetic },
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
  { code: "compiler.err.cant.ref.non.effectively.final.var", explain: effectivelyFinal },
  { code: "compiler.err.lambda.body.neither.value.nor.void.compatible", explain: valueOnEveryPath },
  { code: "compiler.err.enum.cant.be.instantiated", explain: newEnum },
  { code: "compiler.err.mod.not.allowed.here", explain: modifierNotAllowed },
  { code: "compiler.err.invalid.mref", explain: invalidMethodReference },
  { code: "compiler.err.name.clash.same.erasure.no.override", explain: nameClash },
  { code: "compiler.err.unreported.exception.implicit.close", explain: implicitClose },
  { code: "compiler.err.except.never.thrown.in.try", explain: neverThrown },
  { code: "compiler.err.except.already.caught", explain: alreadyCaught },
  { code: "compiler.err.try.without.catch.finally.or.resource.decls", explain: () => "A try block needs a catch or a finally after it: catch (SomeException e) { ... } runs when that exception happens in the block, and finally { ... } runs in any case. Add one right after the try's closing brace }." },
  { code: "compiler.err.override.meth.doesnt.throw", explain: overrideThrows },
  { code: "compiler.err.multicatch.types.must.be.disjoint", explain: relatedAlternatives },
  { code: "compiler.err.not.def.public.cant.access", explain: notPublic },
  { code: "compiler.err.cant.access", explain: badSourceFile },
  { code: "compiler.err.duplicate.class", explain: duplicateClass },
];

/** A name looked up on a variable of type Object, such as equals' parameter used before its cast, or a lambda's parameter. */
function objectHasNo(d: Diagnostic, own: OwnClasses): string {
  const m = d.message;
  const v = /location: variable (\w+) of type Object$/m.exec(m)?.[1] ?? "it";
  const what = /symbol:\s+(variable|method) (\w+)/.exec(m);
  const member = what ? (what[1] === "method" ? `${what[2]}()` : what[2]) : "";
  const lambda = v !== "it" && what ? objectInLambda(d, own, v, what[1] === "method", what[2]) : null;
  if (lambda) return lambda;
  return `${v} has the type Object, and Object has no ${what?.[1] ?? "member"} ${member}. Java goes by the variable's type, even when the object in it is one of yours. Cast it to your own class first, for example Parcel other = (Parcel) ${v}; with your class's name instead of Parcel, and then use other.${member}.`;
}

/** Whether one of the program's own types declares a method with this name. */
const ownMethod = (own: OwnClasses, name: string) => [...own.types.values()].some((t) => declares(t, name, true));

/** "incompatible types: void cannot be converted to int": the value of a void method stored or returned. */
function voidValue(d: Diagnostic, own: OwnClasses): string {
  const to = /void cannot be converted to (.+)$/m.exec(d.message)?.[1].trim() || "int";
  const c = atCaret(d);
  // javac's caret is on the ( of the call.
  const name = c ? /([\w$]+)\s*$/.exec(beforeCaret(c))?.[1] : undefined;
  if (name && ownMethod(own, name))
    return `${name}(...) is void: it gives back nothing, so there is no value to store or return here. If it should give a value, give it a return type (such as ${to}) in its header and end it with return and the value. Otherwise call it on a line of its own.`;
  return `The method called here is void: it gives back nothing, so there is no value to store or return. If it's your own method and it should give a value, give it a return type (such as ${to}) and a return statement. Otherwise, call it on a line of its own. (sort, for example, sorts the list itself: call list.sort(...) and then use list.)`;
}

/**
 * The name of the method whose call ends right before javac's caret (a dot): forEach in
 * "names.forEach(...).count()", also when the dot starts a line of its own below the call.
 */
function callBefore(d: Diagnostic, own: OwnClasses): string | null {
  const c = atCaret(d);
  if (!c) return null;
  const lines = own.code.get(d.file);
  const same = lines?.[d.line - 1]?.length === c.line.length;
  const above = same ? lines!.slice(Math.max(0, d.line - 9), d.line - 1) : [];
  const before = [...above, (same ? lines![d.line - 1] : c.line).slice(0, c.line.length - c.at.length)].join("\n").trimEnd();
  if (!before.endsWith(")")) return null;
  let depth = 0;
  for (let k = before.length - 1; k >= 0; k--) {
    if (before[k] === ")") depth++;
    else if (before[k] === "(" && --depth === 0) return /([\w$]+)\s*$/.exec(before.slice(0, k))?.[1] ?? null;
  }
  return null;
}

/** "void cannot be dereferenced": a dot after a call of a void method, such as forEach(...).count(). */
function voidDereferenced(d: Diagnostic, own: OwnClasses): string {
  const name = callBefore(d, own);
  const start = `${name ? `${name}(...)` : "The method before this dot"} is void: it gives back nothing, so there is no value to call a method on.`;
  if (name && /^forEach(?:Ordered)?$/.test(name))
    return `${start} ${name} only does something with each value, so nothing can come after it: make it the last step. To get a value, such as a count or a list, end a stream with count() or collect(...) instead of ${name}.`;
  if (name && ownMethod(own, name))
    return `${start} If ${name} should give back a value, change void in its header to the value's type, and end it with return and the value. Otherwise call it on a line of its own.`;
  const yours = name ? "" : " If it's a method of your own and it should give back a value, change void to that type and end it with return.";
  return `${start} Call it on a line of its own, and then use the object it worked on, as in Collections.sort(names); and then names.get(0).${yours}`;
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
  const t = typeNamed(own, name);
  return t ? t.kind === "interface" : /^(Comparable|Comparator|Runnable|Iterable|Iterator|Collection|List|Set|Map|Queue|Deque|Cloneable)$/.test(name);
}

/** "X is not abstract and does not override abstract method m(...) in Y". */
function missingAbstractMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$.]+) is not abstract and does not override abstract method ([\w$]+)\((.*)\) in ([\w$.]+)$/.exec(d.message);
  if (!m) return null;
  const [cls, method, params, parent] = [simple(m[1]), m[2], spaced(m[3]), simple(m[4])];
  const sig = `${method}(${params})`;
  if (cls === parent) {
    const t = typeNamed(own, cls, d.file);
    // An enum or a record can't be abstract: the method needs a body.
    if (t?.kind === "enum") {
      const each = t.constants.length ? ` Or, if each constant should do it in its own way, give every constant a body of its own, in { } after its name, with ${method} in it, as in ${t.constants[0]} { ... }.` : "";
      return `${cls} is an enum, and its method ${sig} is abstract: it has no body. An enum can't be abstract, so give ${method} a body in ${cls} and remove the word abstract from it.${each}`;
    }
    if (t?.kind === "record") return `${cls} is a record, and its method ${sig} is abstract: it has no body. A record can't be abstract, so give ${method} a body and remove the word abstract from it.`;
    return `${cls} has an abstract method, ${sig}, which has no body, so ${cls} must be abstract too: write abstract class ${cls}. If ${cls} is meant for creating objects, give ${method} a body instead and remove the word abstract from it.`;
  }
  const same = declares(typeNamed(own, cls, d.file), method, true)
    ? `${cls} has a method ${method}, but with other parameter types: to count, they must be exactly (${params}).`
    : `If ${cls} already has a method like it, compare the name and the parameter types: they must match exactly.`;
  // class Person implements Comparable, without <Person>: the method it must have takes Object.
  if (((parent === "Comparable" && method === "compareTo") || (parent === "Comparator" && method === "compare")) && /^Object(,Object)?$/.test(m[3]) && rawIn(own, cls, parent))
    return rawComparison(own, cls, parent);
  if (parent === "Comparable" && method === "compareTo")
    return `${cls} implements Comparable, so it must have the method compareTo, which tells how two ${cls} objects compare. Add it to ${cls}: public int compareTo(${params} other) { ... }, returning a negative number, zero or a positive number. ${same}`;
  if (isInterface(own, parent))
    return `${parent} is an interface, and a class that implements it must have every method it lists. ${cls} doesn't have ${sig} yet: add it, with the same name, parameter types and return type as in ${parent}, and public in front (an interface's methods are always public). ${same}`;
  const below = knows(own, parent) ? "extends" : "extends or implements";
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
  const theirs = typeNamed(own, parent)?.constructors.find((c) => {
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
  const text = own.code.get(d.file)?.slice(d.line - 1, d.line + 4).join("\n") ?? "";
  const annotation = /@(?:java\.lang\.)?Override\b/.exec(text);
  const after = annotation ? text.slice(annotation.index + annotation[0].length).replace(/@[\w$.]+(?:\s*\([^)]*\))?/g, " ") : "";
  const header = annotation && /^[^(;{}]*?([\w$]+)\s*\(([^)]*)\)/.exec(after);
  if (!header) return general;
  const name = header[1];
  const params = header[2].replace(/\s+/g, " ").trim();
  const cls = classAt(own, d.file, d.line);
  // A misspelled parent in the class header: then every @Override in the class fails.
  const names = [...own.types.values()].map((t) => t.name);
  for (const bad of cls?.supers ?? []) {
    const good = knows(own, bad) ? null : names.find((n) => n !== cls?.name && editDistance(n.toLowerCase(), bad.toLowerCase()) <= 2);
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
    const owner = typeNamed(own, where, d.file);
    if (owner?.members.some((x) => x.method && x.static && x.name === name && x.params === found.params)) {
      const belongs = `${name} is static in ${where}: a static method belongs to the ${owner.kind === "interface" ? "interface" : "class"} ${where} itself, not to its objects, so no method can replace it.`;
      // An interface's static method isn't inherited, so a method with its name is simply a new one; a class's static method blocks one that isn't static.
      if (owner.kind === "interface") return `${belongs} Remove @Override from ${name} here, or, if each class should be able to replace it, write default instead of static in ${where}.`;
      return `${belongs} If subclasses should replace it, remove static from ${name} in ${where}. If it should stay static, make ${name} here static too and remove @Override: then it is a separate method of ${cls?.name ?? "this class"}.`;
    }
    // javac says this too when it can't find the class that this class, or one above it, extends.
    const unknown = cls && [cls, ...parents].find((t) => t.kind === "class" && t.extends.length === 1 && !knows(own, t.extends[0]));
    if (unknown)
      return `${name} has the same parameter types as the method ${name} of ${where}, so the @Override itself looks right. But ${unknown.name} extends ${unknown.extends[0]}, and Java can't match the methods while it can't find ${unknown.extends[0]}: if another error says "cannot find symbol" about ${unknown.extends[0]}, fix that first, and this error goes away too.`;
    return general;
  }
  if (name === "equals" && where === "Object")
    return `@Override says that this equals replaces the equals every class gets from Object, but that one takes an Object: write public boolean equals(Object compared), not equals(${params}). Inside it, check the type with instanceof and cast compared to your class.`;
  if ((where === "Comparable" || where === "Comparator") && cls && rawIn(own, cls.name, where)) {
    const types = parameterTypes(params);
    return `@Override says that ${name} replaces the method ${name} of ${where}, but ${cls.name} implements ${where} without a type in angle brackets, so that ${name} takes ${where === "Comparable" ? "an Object" : "two Objects"}, and ${name}(${spaced(types)}) doesn't replace it. Write the type in the header of ${cls.name}: implements ${where}<${types.split(",")[0] || cls.name}>.`;
  }
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
  const unseen = cls?.supers.find((s) => !knows(own, s) && !LIBRARY_METHODS[s]);
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
  if (example && !knows(own, name)) {
    const impl = /new (\w+)/.exec(example)![1];
    return `${name} is an interface: it lists what every ${name.toLowerCase()} can do, but it isn't a class you can create objects from. Create ${an(impl)}, which is one kind of ${name}; the variable can keep the type ${name}: ${example}`;
  }
  const t = typeNamed(own, name, d.file);
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
  const code = own.code.get(d.file);
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
  if (!knows(own, type)) return null;
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
  const kind = typeNamed(own, to, from.file)?.kind ?? "class";
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
  const code = own.code.get(d.file);
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
  if (!knows(own, from) || !knows(own, to)) return null;
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
  const parent = typeNamed(own, owner, d.file);
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

// ---- Lambdas, streams, Optional, Comparable and Comparator, enums (MOOC part 10) ----

/** "a" or "an" before a word, also a lower-case one: an int, an OptionalDouble, a double. */
const anWord = (word: string) => `${/^[aeiou]/i.test(word) ? "an" : "a"} ${word}`;
/** "a, b and c". */
const listed = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** The text before javac's caret on its line. */
const beforeCaret = (c: { line: string; at: string }) => c.line.slice(0, c.line.length - c.at.length);
/** A word with a capital first letter: Int for int, as in mapToInt. */
const cap = (word: string) => word[0].toUpperCase() + word.slice(1);
/** The plain number type a number object holds: int for Integer. */
const UNBOXED: Record<string, "int" | "long" | "double" | undefined> = { Integer: "int", Long: "long", Double: "double" };
const BOXED: Record<string, string> = { int: "Integer", long: "Long", double: "Double" };
/** The number types a stream can hold, from narrowest to widest: a value can go to a wider one without a cast. */
const WIDTH: Record<string, number | undefined> = { int: 0, long: 1, double: 2 };

/** Where the classes of Java's own that the course uses are, for their import lines. */
const LIBRARY_PACKAGES: Record<string, string> = Object.fromEntries(
  Object.entries({
    "java.util": "Scanner ArrayList HashMap List Map Random HashSet Set Arrays Collections Collection Iterator TreeMap TreeSet LinkedList LinkedHashMap LinkedHashSet ArrayDeque Deque Queue PriorityQueue Objects Optional OptionalDouble OptionalInt Comparator InputMismatchException NoSuchElementException",
    "java.util.stream": "Collectors Stream IntStream DoubleStream LongStream",
    "java.util.function": "Function Predicate Consumer Supplier BiFunction UnaryOperator BinaryOperator",
    "java.util.regex": "Pattern Matcher",
    "java.io": "File FileWriter FileReader PrintWriter BufferedReader BufferedWriter IOException FileNotFoundException UncheckedIOException",
    "java.nio.file": "Files Path Paths StandardOpenOption NoSuchFileException",
    "java.time": "LocalDate LocalDateTime LocalTime Duration Period",
  }).flatMap(([pkg, names]) => names.split(" ").map((name) => [name, pkg])),
);

/** "cannot find symbol" for one of Java's classes that isn't imported, whether used as a type (class) or through its name (variable), as in Collectors.toList(). */
function importFor(d: Diagnostic, own: OwnClasses): string | null {
  const name = /symbol:\s+(?:variable|class) ([\w$]+)/.exec(d.message)?.[1];
  const pkg = name && LIBRARY_PACKAGES[name];
  if (!name || !pkg) return null;
  // The program's own class of that name (in another package, or inside another class) is the one it means.
  if ([...own.types.values()].some((t) => t.name === name)) return null;
  // import java.util.*; doesn't reach into java.util.stream or java.util.function.
  const star = pkg.startsWith("java.util.") && own.code.get(d.file)?.some((l) => /^\s*import\s+java\.util\.\*\s*;/.test(l));
  return `To use ${name}, import it at the top of the file: import ${pkg}.${name};${star ? ` (import java.util.*; covers only java.util itself, not ${pkg}.)` : ""}`;
}

/** "cannot find symbol: variable length" on a String or a collection. */
function lengthOf(d: Diagnostic): string | null {
  const [, v, type] = /location: variable ([\w$]+) of type ([\w$.]+)/.exec(d.message) ?? [];
  if (!v) return null;
  if (type === "String") return `A String's length is a method: write ${v}.length(), with parentheses. (An array's length is written without them.)`;
  const noun = /^(?:List|ArrayList|LinkedList|Collection)$/.test(type) ? "list" : /^(?:Set|HashSet|TreeSet)$/.test(type) ? "set" : /^(?:Map|HashMap|TreeMap)$/.test(type) ? "map" : null;
  return noun ? `The number of elements in a ${noun} is given by the method size(): write ${v}.size(). length is for arrays.` : null;
}

/** An enum constant written without its enum's name (HEARTS for Suit.HEARTS), or a constant the enum doesn't have. */
function enumConstant(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+variable ([\w$]+)\n\s*location: \w+ ([\w$.]+)/.exec(d.message);
  if (!m) return null;
  const [name, location] = [m[1], simple(m[2])];
  const here = typeNamed(own, location, d.file);
  const c = atCaret(d);
  // Suit.HEART: the enum's name before the dot, and a constant it doesn't have.
  if (here?.kind === "enum" && here.constants.length && !here.constants.includes(name) && c && classNameBefore(d, own, c, location)) {
    const near = here.constants.find((k) => k.toLowerCase() === name.toLowerCase() || editDistance(k.toLowerCase(), name.toLowerCase()) <= 2);
    return `${location} has no constant ${name}. Its constants are ${listed(here.constants)}.${near ? ` Did you mean ${near}? Upper and lower case matter.` : ""}`;
  }
  const enums = [...own.types.values()].filter((t) => t.kind === "enum" && t.name !== location && t.constants.includes(name)).map((t) => t.name);
  if (!enums.length) return null;
  if (enums.length > 1) return `${name} is a constant of the enums ${listed(enums)}. Outside its enum, a constant needs the enum's name in front: ${enums.map((e) => `${e}.${name}`).join(" or ")}, whichever you mean.`;
  const e = enums[0];
  return `${name} is a constant of the enum ${e}, and outside ${e} a constant needs its enum's name in front: write ${e}.${name}. (Only the case labels of a switch on ${anWord(e)} value can use the name alone.)`;
}

/**
 * The value javac's caret is in, as written (with its strings), when its line is a plain
 * `Type v = value;`, `v = value;` or `return value;`: scanner.nextLine() in "Suit s = scanner.nextLine();".
 */
function assignedValue(d: Diagnostic, own: OwnClasses): string | null {
  const c = atCaret(d);
  const code = own.code.get(d.file)?.[d.line - 1];
  const text = own.lines.get(d.file)?.[d.line - 1];
  if (!c || code == null || text == null || code.length !== c.line.length) return null;
  const m = /^(\s*(?:return\s+|(?:final\s+)?(?:[\w$.]+(?:\s*<[^<>;=]*>)?(?:\s*\[\s*\])*\s+)?[\w$.]+(?:\[[^\]]*\])?\s*=(?!=)\s*))(.*?)(\s*);\s*$/.exec(code);
  if (!m || !m[2]) return null;
  // Up to the ;, since a string at the end of the value is blanked out in the code.
  const [from, to] = [m[1].length, m[1].length + m[2].length + m[3].length];
  const caret = c.line.length - c.at.length;
  // Two variables declared on one line (Suit a = ..., b = ...): which value is meant isn't certain.
  if (caret < from || caret > to || splitTopLevel(m[2]).length > 1) return null;
  const value = text.slice(from, to).trim();
  return value.length <= 60 ? value : null;
}

/** Text put in a variable of one of the program's enums: "incompatible types: String cannot be converted to Suit". */
function textToEnum(d: Diagnostic, own: OwnClasses): string | null {
  const to = simple(/String cannot be converted to ([\w$.]+)$/m.exec(d.message)?.[1] ?? "");
  const t = typeNamed(own, to, d.file);
  if (t?.kind !== "enum") return null;
  const upper = t.constants.length > 0 && t.constants.every((k) => k === k.toUpperCase());
  const literal = /^"((?:[^"\\]|\\.)*)"/.exec(atCaret(d)?.at ?? "");
  if (literal) {
    const text = literal[1];
    const constant = t.constants.find((k) => k === text) ?? t.constants.find((k) => k.toLowerCase() === text.trim().toLowerCase());
    const valueOf = ` To turn text (such as a line of input) into a constant, use ${to}.valueOf(text).`;
    if (constant) return `Text in quotes is a String, not ${anWord(to)}, even when it is the name of a constant. Write the constant itself, without quotes${constant === text ? "" : " and spelled as in the enum"}: ${to}.${constant}.${valueOf}`;
    const all = t.constants.length ? ` Its constants are ${listed(t.constants.map((k) => `${to}.${k}`))}.` : "";
    return `Text in quotes is a String, not ${anWord(to)}. Write one of the enum's constants instead, without quotes.${all}${valueOf}`;
  }
  // A String from a variable or a method, such as a line of input: valueOf finds the constant with its name.
  const value = assignedValue(d, own);
  const v = value ?? "text";
  // A value such as x + "" needs parentheses before .trim() can follow it.
  let bare = v;
  while (/\([^()]*\)/.test(bare)) bare = bare.replace(/\([^()]*\)/g, "");
  const whole = /[^\w$.[\]]/.test(bare) ? `(${v})` : v;
  const clean = upper ? `${whole}.trim().toUpperCase()` : `${whole}.trim()`;
  const done = upper ? /\.toUpperCase\(\)/.test(v) : /\.(?:trim|strip)\(\)/.test(v);
  const exactly = `The text must be exactly the name of a constant${upper ? ", in capital letters" : ", capital letters included"}, or valueOf stops the program with an error${done ? "." : `: if it may have spaces around it${upper ? " or small letters" : ""}, use ${to}.valueOf(${clean}).`}`;
  return `${value ? `${value} ${/\)$/.test(value) ? "gives" : "is"} a String` : "This is a String"}, not ${anWord(to)}. To get the constant whose name is in the text, use ${to}.valueOf(${v}). ${exactly}`;
}

/** new on an enum: "enum classes may not be instantiated". */
function newEnum(d: Diagnostic, own: OwnClasses): string {
  const m = /^new\s+([\w$.]+)\s*\(\s*(\S)?/.exec(atCaret(d)?.at ?? "");
  if (!m) return "An enum's objects are its constants, and Java creates them itself, so new can't create one. Use a constant, written with the enum's name in front, such as Suit.HEARTS.";
  const name = simple(m[1]);
  const constants = typeNamed(own, name, d.file)?.constants ?? [];
  const first = constants[0] ?? "CONSTANT";
  const values = m[2] && m[2] !== ")" ? ` The values in the parentheses belong in the enum itself, after each constant's name, as in ${first}(...).` : "";
  return `${name} is an enum: its objects are its constants${constants.length ? ` (${listed(constants)})` : ""}, and Java creates them itself, so new ${name}(...) isn't allowed. Use a constant instead, such as ${name}.${first}.${values} To get the constant whose name is in a String, use ${name}.valueOf(text).`;
}

/** "modifier public not allowed here", most often on an enum's constructor. */
function modifierNotAllowed(d: Diagnostic, own: OwnClasses): string | null {
  const words = /^modifier ([\w,]+) not allowed here/.exec(d.message)?.[1].split(",");
  if (!words) return null;
  const c = atCaret(d);
  const cls = classAt(own, d.file, d.line);
  const them = words.length > 1 ? "them" : "it";
  if (cls?.kind === "enum" && c && new RegExp(`^${escapeRegExp(cls.name)}\\s*\\(`).test(c.at))
    return `The constructor of the enum ${cls.name} can't be ${listed(words)}: only the enum's own constants call it, when Java creates them. Remove ${words.length > 1 ? "those words" : words[0]} (an enum's constructor is private by itself).`;
  return `${words.length > 1 ? `The words ${listed(words)} aren't` : `The word ${words[0]} isn't`} allowed here. Remove ${them}.`;
}

const COLLECTION_METHODS = ["add", "get", "set", "size", "contains", "remove", "isEmpty", "indexOf", "stream"];
const MAP_METHODS = ["get", "put", "containsKey", "getOrDefault", "keySet", "values", "entrySet", "remove", "size"];
/** Methods of Java's classes that a method reference often names, by class: what "Did you mean" can suggest for them. */
const JDK_METHODS: Record<string, string[]> = {
  PrintStream: ["println", "print", "printf"],
  String: ["length", "charAt", "toUpperCase", "toLowerCase", "trim", "strip", "isEmpty", "isBlank", "equals", "equalsIgnoreCase", "compareTo", "compareToIgnoreCase", "substring", "split", "contains", "startsWith", "endsWith", "indexOf", "valueOf", "repeat", "concat"],
  Integer: ["parseInt", "valueOf", "compare", "sum", "max", "min", "intValue", "toString"],
  Double: ["parseDouble", "valueOf", "compare", "sum", "max", "min", "doubleValue", "toString"],
  Long: ["parseLong", "valueOf", "compare", "sum", "max", "min", "longValue", "toString"],
  Character: ["isDigit", "isLetter", "isLetterOrDigit", "isUpperCase", "isLowerCase", "isWhitespace", "toUpperCase", "toLowerCase", "getNumericValue"],
  Math: ["abs", "sqrt", "pow", "max", "min", "round", "floor", "ceil", "random"],
  Objects: ["equals", "hash", "isNull", "nonNull", "requireNonNull", "toString"],
  StringBuilder: ["append", "insert", "reverse", "toString", "length", "charAt"],
  ...Object.fromEntries(["List", "ArrayList", "LinkedList", "Collection", "Set", "HashSet", "TreeSet"].map((c) => [c, COLLECTION_METHODS])),
  ...Object.fromEntries(["Map", "HashMap", "TreeMap"].map((c) => [c, MAP_METHODS])),
};

/** "invalid method reference" for a method that doesn't exist, as in Person::getNmae or System.out::printn. */
function invalidMethodReference(d: Diagnostic, own: OwnClasses): string | null {
  const m = /cannot find symbol\n\s*symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: \w+ ([\w$.]+)(?:<[^\n]*?>)?((?:\[\])*)/.exec(d.message);
  if (!m) return null;
  const [method, args] = [m[1], m[2]];
  const cls = simple(m[3]) + m[4];
  const names = typeNamed(own, cls, d.file)?.members.filter((x) => x.method).map((x) => x.name) ?? JDK_METHODS[cls] ?? [];
  const near = names.find((n) => n !== method && (n.toLowerCase() === method.toLowerCase() || editDistance(n.toLowerCase(), method.toLowerCase()) <= 2));
  // javac writes the parameters of the interface the reference is for, which may be its type variables (T for a Consumer<T>): they mean nothing to the learner.
  const typeVariables = new Set([...d.formatted.matchAll(/where ([\w$, ]+?) (?:is a|are) (?:fresh )?type-variables?:/g)].flatMap((w) => w[1].split(/,\s*/)));
  const params = args ? splitTopLevel(args).map((a) => a.trim()) : [];
  const takes = params.length && !params.some((p) => typeVariables.has(p) || /^[A-Z]\d*$/.test(p)) ? ` that takes (${spaced(args)})` : "";
  // What is before the :: as written: a class (String::lenght), an object (System.out::printn, p::greeet), this or super.
  const q = /^([\w$.]+)\s*::/.exec(atCaret(d)?.at ?? "")?.[1];
  const of = !q || simple(q) === cls ? cls : q === "this" ? `this object, ${anWord(cls)}` : q === "super" ? `the parent class ${cls}` : `${q} (${anWord(cls)})`;
  return `${q ?? cls}::${method} refers to the method ${method} of ${of}, and ${cls} has no method ${method}${takes}. ${near ? `Did you mean ${near}? ` : ""}Check the spelling: upper and lower case matter.`;
}

/** "name clash: compareTo(Object) in Car and compareTo(Car) in Comparable have the same erasure, yet neither overrides the other". */
function nameClash(d: Diagnostic): string | null {
  const m = /^name clash: ([\w$]+)\((.*?)\) in ([\w$.]+) and [\w$]+\((.*?)\) in ([\w$.]+) have the same erasure, yet neither overrides the other/.exec(d.message);
  if (!m) return null;
  const [, method, mine, cls, theirs, parent] = m;
  const example = /^[\w$.]+$/.test(theirs) ? `, as in ${method}(${simple(theirs)} other)` : "";
  return `${method}(${spaced(mine)}) in ${simple(cls)} doesn't replace ${method}(${spaced(theirs)}) of ${simple(parent)}, because the parameter types differ, and Java can't keep both. Give it exactly the parameter types of the one in ${simple(parent)}${example}.`;
}

/** Whether the header of one of the program's types names a library interface without a type in angle brackets, as in class Person implements Comparable. */
function rawIn(own: OwnClasses, cls: string, iface: string): boolean {
  const t = typeNamed(own, cls);
  const lines = t && own.code.get(t.file);
  if (!t || !lines) return false;
  const text = lines.slice(t.from - 1, t.from + 4).join("\n");
  const header = text.slice(0, text.includes("{") ? text.indexOf("{") : text.length);
  return new RegExp(`\\b${iface}\\b(?!\\s*<)`).test(header);
}

/** A class that implements Comparable or Comparator without a type in angle brackets, so the method it must have takes Object. */
function rawComparison(own: OwnClasses, cls: string, parent: "Comparable" | "Comparator"): string {
  const method = parent === "Comparable" ? "compareTo" : "compare";
  const has = typeNamed(own, cls)?.members.find((x) => x.method && x.name === method && x.params && !/^Object(,Object)?$/.test(x.params));
  const type = has?.params?.split(",")[0] ?? (parent === "Comparable" ? cls : null);
  if (parent === "Comparable") {
    const then = has ? `Then the compareTo(${type} other) that ${cls} already has is the one it needs.` : `Then add public int compareTo(${type} other) { ... } to ${cls}, returning a negative number, zero or a positive number.`;
    return `${cls} implements Comparable without a type in angle brackets, so Java expects compareTo(Object other), which takes any object. Write which objects ${cls} is compared with in its header: implements Comparable<${type}>. ${then}`;
  }
  const then = has ? `Then the compare(${spaced(has.params!)}) that ${cls} already has is the one it needs.` : "Then add public int compare with two parameters of that type.";
  return `${cls} implements Comparator without a type in angle brackets, so Java expects compare(Object a, Object b), which takes any two objects. Write the type of the objects it compares in its header: implements Comparator<${type ?? "..."}>${type ? "" : ", with their type in the angle brackets"}. ${then}`;
}

/** Whether values of a type have an order of their own (they are Comparable): numbers, text, an enum, or one of the program's types that implements Comparable. */
function comparable(own: OwnClasses, type: string): boolean {
  if (/^(?:String|int|long|double|float|short|byte|char|boolean|Integer|Long|Double|Float|Short|Byte|Character|Boolean)$/.test(type)) return true;
  const t = typeNamed(own, type);
  return !!t && (t.kind === "enum" || [t, ...ancestorsOf(own, t.name)].some((a) => a.supers.includes("Comparable")));
}

/** A getter of one of the program's types (or a record's accessor) whose values have an order, for an example such as Comparator.comparing(Person::getName). */
function sortKey(own: OwnClasses, t: OwnClass | undefined): string | undefined {
  const accessor = (name: string) => t?.kind === "record" && t.members.some((f) => !f.method && f.name === name);
  return t?.members.find((x) => x.method && !x.static && !x.private && x.params === "" && (/^get[A-Z]/.test(x.name) || accessor(x.name)) && comparable(own, x.type))?.name;
}

/** Collections.sort on a list whose elements aren't Comparable: "no suitable method found for sort(List<Dog>)". */
function sortNotComparable(d: Diagnostic, own: OwnClasses): string | null {
  const type = simple(/^no suitable method found for sort\([\w$.]+<([\w$.]+)>\)/.exec(d.message)?.[1] ?? "");
  if (!type) return null;
  const v = /^\.?\s*sort\(\s*([\w$]+)\s*\)/.exec(atCaret(d)?.at ?? "")?.[1] ?? "list";
  const t = typeNamed(own, type, d.file);
  const getter = sortKey(own, t);
  const comparator = `${v}.sort(Comparator.comparing(${getter ? `${type}::${getter}` : "..."}))`;
  const two = t ? `two ${type} objects` : `two objects of type ${type}`;
  const order = `Collections.sort(${v}) sorts by the elements' own order, and ${type} has none: it doesn't implement Comparable, so Java doesn't know which of ${two} comes first.`;
  if (!t) return `${order} Give the sort a Comparator that says how to compare ${two}, as in ${comparator}.`;
  return `${order} Make ${type} implement Comparable<${type}>, with a method public int compareTo(${type} other), or give the sort a Comparator that says how to compare ${two}, as in ${comparator}.`;
}

/** sort() on a list, or max() or min() on a stream of objects, without a Comparator. */
function needsComparator(d: Diagnostic): string {
  // Only a list has sort(Comparator), and only a stream has max and min.
  const method = /^method (\w+) in /.exec(d.message)?.[1] ?? "max";
  const type = simple(/required: Comparator<\? super ([\w$.]+)>/.exec(d.message)?.[1] ?? "");
  const c = atCaret(d);
  const v = (c && /([\w$]+)\s*$/.exec(beforeCaret(c))?.[1]) || "list";
  if (method === "sort") return `A list's sort needs a Comparator that says how to compare two elements, as in ${v}.sort(Comparator.comparing(...)). To sort by the elements' own order (numbers, text, or a class with compareTo), write ${v}.sort(null) or Collections.sort(${v}).`;
  const how = /^(Integer|Double|Long)$/.test(type) ? `${type}::compare` : type === "String" ? "Comparator.naturalOrder()" : "Comparator.comparing(...)";
  return `${method}() on a stream of objects needs a Comparator that says which of two values is bigger, as in ${method}(${how}). It gives an Optional: get() takes the value out.`;
}

/** collect(Collectors...) on an IntStream, DoubleStream or LongStream (javac names which only in the first of its two errors). */
function numberStreamCollect(d: Diagnostic): string {
  const kind = /interface (Int|Double|Long)Stream/.exec(d.message)?.[1];
  if (!kind) return "A stream of plain numbers (an IntStream, DoubleStream or LongStream, such as mapToInt gives) can't collect with a Collector such as Collectors.toList(). Call boxed() first, which turns the numbers into objects: ...boxed().collect(Collectors.toList()).";
  const box = { Int: "Integer", Double: "Double", Long: "Long" }[kind];
  return `${kind === "Int" ? "An" : "A"} ${kind}Stream holds plain ${kind.toLowerCase()} values, and its collect doesn't take a Collector such as Collectors.toList(). Call boxed() first, which turns them into ${box} objects: ...boxed().collect(Collectors.toList()). (If the values don't need to be numbers, map instead of mapTo${kind} keeps a stream of objects.)`;
}

const STREAM_METHODS = /^(filter|map|mapToInt|mapToDouble|mapToLong|mapToObj|flatMap|collect|reduce|sorted|distinct|limit|skip|anyMatch|allMatch|noneMatch|findFirst|findAny|count|sum|average|max|min|boxed|peek)$/;
const OPTIONAL_GET: Record<string, string> = { OptionalDouble: "getAsDouble()", OptionalInt: "getAsInt()", OptionalLong: "getAsLong()", Optional: "get()" };

/** "cannot find symbol" for a method of Java's own types: a stream method on a list or an array, sum() on a stream of objects. */
function libraryMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type |class |interface )([\w$.]+)(?:<(.*)>)?((?:\[\])*)$/m.exec(d.message);
  if (!m) return null;
  const [, method, args, variable, rawType, rawElement = "", dims] = m;
  const element = simple(rawElement);
  const type = simple(rawType);
  const dots = args ? "..." : "";
  if (dims) {
    const call = (method: string) => `Arrays.${method}(${variable ?? "..."})`;
    if (method === "stream") return `${variable ?? "This"} is an array, and an array has no methods such as stream(). Write ${call("stream")} instead (with import java.util.Arrays; at the top): it gives a stream of the array's values. Lists have stream(); arrays don't.`;
    if (method === "length") return `${variable ?? "This"} is an array, and an array's length isn't a method: write ${variable ?? "array"}.length, without parentheses. (length() with parentheses is for a String, and size() for a list.)`;
    if (method === "size") return `${variable ?? "This"} is an array, and arrays have no size(): write ${variable ?? "array"}.length, without parentheses. size() is for lists.`;
    return `${variable ?? "This"} is an array (${type}${dims}), and an array has no method ${method}. The class Arrays has methods for arrays, such as ${call("sort")}, ${call("toString")} and ${call("stream")}.`;
  }
  const v = variable ?? "list";
  if (/^(?:List|ArrayList|LinkedList|Collection|Set|HashSet|TreeSet)$/.test(type) && STREAM_METHODS.test(method)) {
    const noun = /Set$/.test(type) ? "set" : "list";
    if (method === "count") return `The number of elements in a ${noun} is size(): write ${v}.size(). count() is a method of streams, where it counts the values that are left, as in ${v}.stream().filter(...).count().`;
    const number = UNBOXED[element];
    // The Comparator the program gives, as written (javac's message shortens a lambda).
    const comparator = args ? argumentsAt(d, method) : null;
    if (/^(max|min)$/.test(method) && (!number || comparator)) return largestElement(own, v, noun, method, element, comparator);
    if (/^(sum|average|max|min)$/.test(method)) {
      const p = number ?? "int";
      const box = method === "sum" ? "" : method === "average" ? ", which gives an OptionalDouble (getAsDouble() takes the number out)" : `, which gives an Optional${cap(p)} (getAs${cap(p)}() takes the number out)`;
      return `${v} is a ${noun}, and a ${noun} has no ${method}(). A stream of numbers has it: ${v}.stream().mapTo${cap(p)}(${number ? "n -> n" : "..."}).${method}()${box}.`;
    }
    if (method === "sorted" && noun === "list") {
      if (comparator)
        return `A list sorts itself with sort, which takes a Comparator too: ${v}.sort(${comparator}) sorts the list itself and gives back nothing, as does Collections.sort(${v}, ${comparator}). sorted(...) is a method of streams: ${v}.stream().sorted(${comparator}) gives the values in order without changing the list (and .collect(Collectors.toList()) after it puts them in a new list).`;
      const t = typeNamed(own, element, d.file);
      if (t && !comparable(own, element)) {
        const getter = sortKey(own, t);
        const by = `Comparator.comparing(${getter ? `${element}::${getter}` : "..."})`;
        return `A list sorts itself with sort, and ${element} has no order of its own (it doesn't implement Comparable), so give it a Comparator that says how to compare two ${element} objects: ${v}.sort(${by}) sorts the list itself. sorted(...) is a method of streams: ${v}.stream().sorted(${by}) gives the values in order without changing the list.`;
      }
      return `A list sorts itself with sort: ${v}.sort(null) or Collections.sort(${v}) sorts it by the elements' own order. sorted() is a method of streams: ${v}.stream().sorted() gives the values in order without changing the list.`;
    }
    return `${v} is a ${noun}, and ${method}(${dots}) is a method of streams, not of ${noun}s. Call stream() first: ${v}.stream().${method}(${dots}).`;
  }
  if (/^(?:Map|HashMap|TreeMap)$/.test(type) && method === "stream") return `A map has no stream(). Make a stream of its keys, its values or its key-value pairs: ${variable ?? "map"}.keySet().stream(), ${variable ?? "map"}.values().stream() or ${variable ?? "map"}.entrySet().stream().`;
  if (type === "Stream" && /^(sum|average)$/.test(method)) {
    const number = UNBOXED[element];
    return `A stream of objects has no ${method}(): only a stream of numbers (an IntStream, a LongStream or a DoubleStream) has. Turn the values into numbers first: ...mapTo${cap(number ?? "int")}(${number ? "n -> n" : "..."}).${method}()${method === "average" ? ", which gives an OptionalDouble (getAsDouble() takes the number out)" : ""}.`;
  }
  if (/Stream$/.test(type) && /^(size|length)$/.test(method)) return `A stream has no ${method}(): count() counts its values.`;
  if (/^Optional(?:Double|Int|Long)$/.test(type) && method === "get") return `${type} has no get(): its method for taking the value out is ${OPTIONAL_GET[type]}. (On an empty stream there is no value, and it crashes with "No value present"; orElse(0) gives 0 then.)`;
  return null;
}

/**
 * max() or min() on a list or a set of values that aren't numbers, or with a Comparator (as the
 * program wrote it): Collections.max gives the largest element, by the elements' own order or by a
 * Comparator.
 */
function largestElement(own: OwnClasses, v: string, noun: string, method: string, element: string, comparator: string | null = null): string {
  const which = method === "max" ? "largest" : "smallest";
  const start = `${v} is a ${noun}, and a ${noun} has no ${method}().`;
  const empty = (comparator: boolean) => `(It needs import java.util.Collections;${comparator ? " and import java.util.Comparator;" : ""}, and it stops the program with an error on an empty ${noun}.)`;
  if (comparator)
    return `${start} Collections.${method}(${v}, ${comparator}) gives its ${which} element by that Comparator. ${empty(false)} Or ${v}.stream().${method}(${comparator}) gives an Optional, which is empty for an empty ${noun}: get() takes the value out.`;
  const t = typeNamed(own, element);
  if (t && !comparable(own, element)) {
    const getter = sortKey(own, t);
    const by = `Comparator.comparing(${getter ? `${element}::${getter}` : "..."})`;
    return `${start} ${element} has no order of its own (it doesn't implement Comparable), so give Collections.${method} a Comparator that says how to compare two ${element} objects: Collections.${method}(${v}, ${by}) gives the ${which} one. ${empty(true)} Or ${v}.stream().${method}(${by}) gives an Optional, which is empty for an empty ${noun}: get() takes the value out.`;
  }
  if (element && comparable(own, element))
    return `${start} Collections.${method}(${v}) gives its ${which} element, by the elements' own order. ${empty(false)} Or ${v}.stream().${method}(Comparator.naturalOrder()) gives an Optional, which is empty for an empty ${noun}: get() takes the value out.`;
  return `${start} Collections.${method}(${v}) gives its ${which} element, when the elements have an order of their own (numbers, text, or a class that implements Comparable). Otherwise give it a Comparator that says how to compare two elements: Collections.${method}(${v}, Comparator.comparing(...)). ${empty(true)}`;
}

/** What an Optional holds, by the stream method that gave it. */
const OPTIONAL_HOLDS: Record<string, string> = { average: "the average", max: "the largest value", min: "the smallest value", findFirst: "the first value", findAny: "a value", reduce: "the result" };
/** The plain value an OptionalInt, OptionalLong or OptionalDouble holds. */
const OPTIONAL_VALUE: Record<string, string> = { OptionalInt: "int", OptionalLong: "long", OptionalDouble: "double" };
/** For each primitive type, the types a value of it can go to without a cast (itself and the wider ones). */
const WIDER: Record<string, string[]> = {
  byte: ["byte", "short", "int", "long", "float", "double"],
  short: ["short", "int", "long", "float", "double"],
  char: ["char", "int", "long", "float", "double"],
  int: ["int", "long", "float", "double"],
  long: ["long", "float", "double"],
  float: ["float", "double"],
  double: ["double"],
  boolean: ["boolean"],
};
/** The primitive type a wrapper class holds: int for Integer. */
const UNBOX: Record<string, string> = { Integer: "int", Long: "long", Double: "double", Float: "float", Short: "short", Byte: "byte", Character: "char", Boolean: "boolean" };
const BOX: Record<string, string> = Object.fromEntries(Object.entries(UNBOX).map(([box, prim]) => [prim, box]));

/** Whether a value of type `from` can go in a variable of type `to` without a cast: the same type, a wider number, boxing, unboxing, or a parent type. */
function assignable(own: OwnClasses, from: string, to: string): boolean {
  if (from === to || to === "Object") return true;
  const parents = (t: string) => (UNBOX[t] ? `Number|Comparable|Serializable` : t === "String" ? "CharSequence|Comparable|Serializable" : "");
  if (WIDER[from]) return WIDER[to] ? WIDER[from].includes(to) : to === BOX[from] || (!/^(?:boolean|char)$/.test(from) && new RegExp(`^(?:${parents(BOX[from])})(?:<.*>)?$`).test(to));
  if (WIDER[to]) return !!UNBOX[from] && WIDER[UNBOX[from]].includes(to);
  const p = parents(from);
  if (p && new RegExp(`^(?:${p})(?:<.*>)?$`).test(to)) return !(to === "Number" && /^(?:Boolean|Character)$/.test(from));
  return knows(own, from) && isSubtype(own, from, to.replace(/<.*$/, ""));
}

/** A value for orElse(...) on an Optional of this type: 0 for an OptionalInt or an Optional<Integer>, 0L for an Optional<Long>. */
const orElseFor = (kind: string, value: string | null) =>
  kind !== "Optional" ? (kind === "OptionalDouble" ? "0.0" : "0") : ({ Integer: "0", Long: "0L", Double: "0.0", Float: "0.0f", String: '""', Boolean: "false" } as Record<string, string>)[value ?? ""] ?? null;

/** What is in the parentheses of a call whose ( starts this text: "Integer::compare" for (Integer::compare), "..." when it's long or not on the line. */
function callArguments(text: string, max = 40): string {
  if (!text.startsWith("(")) return "...";
  let depth = 0;
  for (let k = 0; k < text.length; k++) {
    if (text[k] === "(") depth++;
    else if (text[k] === ")" && --depth === 0) {
      const inside = text.slice(1, k).trim();
      return inside.length <= max ? inside : "...";
    }
  }
  return "...";
}

/** What is in the parentheses of the call of `method` at javac's caret (on the . before its name), as written; "..." when it's long or goes on to another line. */
function argumentsAt(d: Diagnostic, method: string): string {
  const at = atCaret(d)?.at ?? "";
  const name = new RegExp(`^\\.?\\s*${escapeRegExp(method)}\\s*(?=\\()`).exec(at);
  return name ? callArguments(at.slice(name[0].length), 60) : "...";
}

/**
 * "incompatible types: OptionalDouble cannot be converted to double", or another Optional put in a
 * variable: of its value's type (take the value out), of another Optional type, a boolean, a list
 * or a type its value can't go in.
 */
function optionalAsValue(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: (Optional(?:Double|Int|Long)?)(?:<(.*)>)? cannot be converted to (.+)$/m.exec(d.message);
  if (!m) return null;
  const [, kind, inner] = m;
  const target = m[3].trim();
  const full = inner ? `${kind}<${inner}>` : kind;
  // The value in the box: int for an OptionalInt, Integer for an Optional<Integer> (unknown for an Optional without a type).
  const value = OPTIONAL_VALUE[kind] ?? (inner && /^[\w$.]+$/.test(inner) ? simple(inner) : (inner ?? null));
  const get = OPTIONAL_GET[kind];
  const c = atCaret(d);
  const method = c ? /([\w$]+)\s*$/.exec(beforeCaret(c))?.[1] : undefined;
  const known = method && OPTIONAL_HOLDS[method] ? method : null;
  // The call as written, with what is in its parentheses: max(Integer::compare).
  const call = known && c ? `${known}(${callArguments(c.at)})` : null;
  const take = call ? `${call}.${get}` : get;
  const is = call ? `${call} gives ${anWord(full)}, not ${anWord(target)}` : `This is ${anWord(full)}, not ${anWord(target)}`;
  const what = `${is}: a box that holds ${known ? OPTIONAL_HOLDS[known] : "a value"}, or nothing when the stream ${known ? "is" : "it came from is"} empty`;
  const zero = orElseFor(kind, value);
  const orElse = (then: string) => (zero ? `orElse(${zero}) instead, which gives ${zero} ${then}` : `orElse(...) instead, with the value to use ${then} in the parentheses`);
  // Another kind of Optional: the variable's type is the one to change.
  if (/^Optional(?:Int|Long|Double)?\b/.test(target)) {
    const prim = OPTIONAL_VALUE[kind];
    const boxed = prim && target === `Optional<${BOX[prim]}>` && known && /^(?:max|min|findFirst|findAny)$/.test(known) ? ` Or, for ${anWord(target)}, turn the numbers into ${BOX[prim]} objects first with boxed(), as in boxed().${known}(${/^(?:max|min)$/.test(known) ? `${BOX[prim]}::compare` : ""}).` : "";
    return `${is}. Give the variable the type ${full}${call ? `, which ${known}(...) gives here` : ""}.${boxed}`;
  }
  if (!value || assignable(own, value, target))
    return `${what}. Take the value out with ${take}. On an empty stream ${get} crashes with "No value present", so if the stream can be empty, use ${orElse("then")}.`;
  if (target === "boolean") {
    // filter(test).findFirst(): anyMatch(test) says the same, as a boolean.
    const before = c ? beforeCaret(c).replace(/\s*\.\s*[\w$]+\s*$/, "") : "";
    let test: string | null = null;
    if (known && /^find(?:First|Any)$/.test(known) && before.endsWith(")")) {
      let depth = 0;
      for (let k = before.length - 1; k >= 0 && test == null; k--) {
        if (before[k] === ")") depth++;
        else if (before[k] === "(" && --depth === 0) test = /(?:^|[^\w$])filter\s*$/.test(before.slice(0, k)) ? before.slice(k + 1, -1).trim() : "";
      }
    }
    const any = test ? `anyMatch(${test}) in place of filter(${test}).${known}()` : "anyMatch(...), with the test in its parentheses,";
    return `${what}. An Optional isn't true or false, but isPresent() tells whether it holds a value, as in ${take.replace(/\.[\w$]+\(\)$/, ".isPresent()")}. To check whether some value passes a test, ${any} gives true or false straight away.`;
  }
  const collection = /^(?:[\w$]+\.)*(List|ArrayList|LinkedList|Collection|Iterable|Set|HashSet|TreeSet|LinkedHashSet)\b/.exec(target)?.[1];
  const array = /^([\w$.]+)\[\]$/.exec(target)?.[1];
  if (collection || (array && (array === value || !WIDER[array]))) {
    const set = /Set$/.test(collection ?? "");
    const boxed = OPTIONAL_VALUE[kind] && !array ? "boxed()." : "";
    const end = array ? (array === value && WIDER[array] ? "toArray()" : `toArray(${array}[]::new)`) : `${boxed}collect(Collectors.${set ? "toSet" : "toList"}())`;
    return `${is}: one value (or nothing, when the stream is empty), not all of them. To keep all the values the stream has, end it with ${end}${known ? ` in place of ${known}(...)` : ""}.`;
  }
  const number = (t: string) => /^(?:byte|short|char|int|long|float|double)$/.test(UNBOX[t] ?? t);
  if (number(value) && number(target)) {
    const v = UNBOX[value] ?? value;
    const t = UNBOX[target] ?? target;
    if (WIDER[target] && !WIDER[v].includes(t)) {
      const loses = /^(?:double|float)$/.test(v) ? (/^(?:double|float)$/.test(t) ? "can lose digits" : "drops the decimals") : "changes a number that doesn't fit";
      // A cast can't unbox and narrow at once: a Double becomes an int with intValue().
      const value0 = `...${call ?? ""}.orElse(${zero ?? "0"})`;
      const convert = UNBOX[value] && /^(?:int|long|short|byte|float|double)$/.test(t) ? `convert it on purpose: ${value0}.${t}Value()` : `cast it on purpose: (${target}) ${value0}`;
      return `${what}. Its value is ${anWord(v)}, and Java won't put ${anWord(v)} in ${anWord(target)} variable by itself, because that ${loses}. Give the variable the type ${v} and take the value out with ${take}, or orElse(${zero ?? "0"}) if the stream can be empty. To make it ${anWord(target)} anyway, ${convert}.`;
    }
    return `${what}, and its value is ${anWord(value)}, which Java won't put in ${anWord(target)} variable. Give the variable the type ${value} and take the value out with ${take}. On an empty stream ${get} crashes with "No value present", so if the stream can be empty, use ${orElse("then")}.`;
  }
  const text = target === "String" && number(value) ? ` To turn the number into text, use String.valueOf(...), as in String.valueOf(${take}).` : "";
  return `${what}, and its value is ${anWord(value)}, not ${anWord(target)}. Give the variable the type ${value} and take the value out with ${take}.${text}`;
}

/** Arithmetic or a comparison with an Optional: "bad operand types for binary operator '/'", first type OptionalDouble. */
function optionalInArithmetic(d: Diagnostic): string {
  const op = /operator '([^']+)'/.exec(d.message)?.[1];
  const kind = /^\s*(?:first|second) type:\s+(Optional(?:Double|Int|Long)?)/m.exec(d.message)?.[1] ?? "Optional";
  return `${kind === "Optional" ? "An Optional" : `An ${kind}`} isn't a number: it's a box that holds one, or nothing when the stream was empty (there is no average of no values, for example). So ${op ?? "this operator"} can't work on it. Take the number out first with ${OPTIONAL_GET[kind]}, or with orElse(0), which gives 0 when there is none.`;
}

/** What a stream holds, for a sentence: "an IntStream holds plain int values", "a Stream<String> holds String objects". */
function streamHolds(stream: string, element: string | null): string {
  const number = /^(Int|Long|Double)Stream$/.exec(stream)?.[1].toLowerCase();
  if (number) return `${anWord(stream)} holds plain ${number} values`;
  return element ? `a Stream<${element}> holds ${element} objects` : "this stream holds objects";
}

/** A stream put in a variable of another type: a list, a set, a map, an array, another kind of stream, an Optional or a single value. */
function streamAsValue(d: Diagnostic, own: OwnClasses): string | null {
  const m = /(Stream|IntStream|DoubleStream|LongStream)(?:<(.*?)>)? (?:conforms to|cannot be converted to) (.+)$/m.exec(d.message);
  if (!m) return null;
  const [, kind, raw = ""] = m;
  const target = m[3].trim();
  const base = simple(target.replace(/<.*$/, ""));
  const arg = /^[^<]*<([\w$.]+)[,>]/.exec(target)?.[1];
  const targetArg = arg ? simple(arg) : null;
  // A stream of plain numbers: int for an IntStream.
  const prim = kind === "Stream" ? null : kind.slice(0, -"Stream".length).toLowerCase();
  // What a Stream<X> holds, unless javac knows it only as a type variable (Stream<R> right after map).
  const element = !prim && raw && !/^[A-Z]\d*$/.test(raw) ? simple(raw) : null;
  const c = atCaret(d);
  const afterMap = !prim && !!c && /(?:^|[^\w$])map\s*$/.test(beforeCaret(c));
  const boxed = prim ? "boxed()." : "";
  const start = (what: string) => `A stream isn't ${what}: it only passes values from one step to the next.`;
  // A lambda that turns each value of a Stream<X> into a plain number of type p.
  const toNumber = (p: string) => {
    const u = element ? UNBOXED[element] : undefined;
    return u ? (WIDTH[u]! <= WIDTH[p]! ? "x -> x" : `x -> x.${p}Value()`) : "...";
  };
  // The step that turns plain numbers of one type into another: asDoubleStream() for int to double.
  const convert = (from: string, to: string) => (WIDTH[from]! < WIDTH[to]! ? `as${cap(to)}Stream()` : `mapTo${cap(to)}(x -> (${to}) x)`);
  if (/\[\]$/.test(target)) {
    const of = target.slice(0, -2);
    let fix: string;
    if (prim) {
      if (of === prim) fix = ".toArray()";
      else if (WIDTH[of] != null) fix = `.${convert(prim, of)}.toArray()`;
      else if (of === BOXED[prim]) fix = `.boxed().toArray(${of}[]::new) (boxed() turns the plain numbers into ${of} objects)`;
      else fix = `.mapToObj(...).toArray(${of}[]::new) (mapToObj(...) turns each number into ${anWord(of)})`;
    } else if (WIDTH[of] != null) {
      if (afterMap) return `${start("an array")} Use mapTo${cap(of)}(...) in place of map(...): it makes a stream of plain ${of} values. Then end the stream with toArray(), which gives ${anWord(`${of}[]`)}.`;
      fix = `.mapTo${cap(of)}(${toNumber(of)}).toArray() (mapTo${cap(of)} makes a stream of plain ${of} values, whose toArray() gives ${anWord(`${of}[]`)}; toArray() on a stream of objects gives an Object[])`;
    } else {
      const other = element && element !== of && (knows(own, of) || /^(?:String|Integer|Long|Double|Character|Boolean)$/.test(of)) && !isSubtype(own, element, of);
      fix = `${other ? ".map(...)" : ""}.toArray(${of}[]::new) (${of}[]::new tells toArray which kind of array to make; without it, toArray() gives an Object[])`;
    }
    return `${start("an array")} At the end, put the values in an array with toArray: ${fix}.`;
  }
  if (/^(?:Int|Long|Double)?Stream$/.test(base)) {
    const want = base === "Stream" ? null : base.slice(0, -"Stream".length).toLowerCase();
    const both = `${cap(streamHolds(kind, element))}, and ${streamHolds(base, targetArg)}, so one can't go in a variable of the other.`;
    let how: string;
    if (prim && want) how = `Add .${convert(prim, want)} at the end: it turns ${WIDTH[prim]! < WIDTH[want]! ? `the values into ${want} values` : `each value into ${anWord(want)} with a cast`}.`;
    else if (prim) how = targetArg === BOXED[prim] ? `Add .boxed() at the end: it turns the numbers into ${targetArg} objects.` : `Add .mapToObj(...) at the end, which turns each number into ${targetArg ? anWord(targetArg) : "an object"}, as in .mapToObj(x -> ...).`;
    else if (want) how = afterMap ? `Use mapTo${cap(want)}(...) in place of map(...): it gives ${anWord(base)}.` : `Add .mapTo${cap(want)}(${toNumber(want)}) at the end: it turns each value into a plain ${want}.`;
    else how = afterMap ? `Check what the lambda in map(...) gives: it must give ${targetArg ? anWord(targetArg) : "the values the variable holds"}.` : `Add .map(...) at the end, which turns each value into ${targetArg ? anWord(targetArg) : "the kind of value the variable holds"}, as in .map(x -> ...).`;
    return `${both} ${how}`;
  }
  if (/^(?:Map|HashMap|TreeMap|LinkedHashMap)$/.test(base)) {
    const why = prim ? " (boxed() first turns the plain numbers into objects: only a stream of objects can collect with a Collector)" : "";
    const wrap = base === "Map" ? "" : ` For ${anWord(base)}, put that in new ${base}<>(...).`;
    return `${start("a map")} At the end, collect the values into one: .${boxed}collect(Collectors.groupingBy(...)) makes a list of the values for each key, and .${boxed}collect(Collectors.toMap(..., ...)) makes a key and a value out of each one${why}.${wrap}`;
  }
  if (base === "Optional") {
    if (prim)
      return `${start("an Optional")} ${cap(anWord(kind))} ends with max(), min() or findFirst(), which give an Optional${cap(prim)}: give the variable the type Optional${cap(prim)}. For ${anWord(target)}, call boxed() first, as in .boxed().max(${BOXED[prim]}::compare).`;
    const by = element && UNBOXED[element] ? `${element}::compare` : element === "String" ? "Comparator.naturalOrder()" : "Comparator.comparing(...)";
    return `${start("an Optional")} End it with a step that gives one: findFirst() gives the first value, and max(${by}) or min(${by}) the largest or smallest.`;
  }
  const optional = /^Optional(Int|Long|Double)$/.exec(base)?.[1].toLowerCase();
  if (optional) {
    const ends = `max(), min()${optional === "double" ? ", average()" : ""} or findFirst()`;
    if (prim === optional) return `${start(anWord(base))} End it with a step that gives one, such as ${ends}.`;
    if (prim && optional === "double") return `${start("an OptionalDouble")} End it with average(), which gives one. (max(), min() and findFirst() of ${anWord(kind)} give an Optional${cap(prim)}.)`;
    if (prim) return `${start(anWord(base))} The max(), min() and findFirst() of ${anWord(kind)} give an Optional${cap(prim)}: give the variable that type, or turn the values into ${optional} values first with ${convert(prim, optional)}.`;
    if (afterMap) return `${start(anWord(base))} Use mapTo${cap(optional)}(...) in place of map(...), and end the stream with a step that gives one, such as ${ends}.`;
    return `${start(anWord(base))} Turn the values into plain ${optional} values first, and end the stream with a step that gives one, as in .mapTo${cap(optional)}(${toNumber(optional)}).${optional === "double" ? "average()" : "max()"}.`;
  }
  if (/^(?:List|ArrayList|LinkedList|Collection|Iterable)$/.test(base)) {
    const why = prim ? " (boxed() turns the plain numbers into objects, which a list can hold)" : "";
    const wrap = /^(?:ArrayList|LinkedList)$/.test(base) ? ` For ${anWord(base)}, put that in new ${base}<>(...).` : "";
    return `${start("a list")} At the end, collect them into a list: .${boxed}collect(Collectors.toList())${why}.${wrap}`;
  }
  if (/^(?:Set|HashSet|TreeSet)$/.test(base)) {
    const wrap = base === "Set" ? "" : ` For ${anWord(base)}, put that in new ${base}<>(...).`;
    return `${start("a set")} At the end, collect them into one: .${boxed}collect(Collectors.toSet()).${wrap}`;
  }
  if (/^(?:LinkedHashSet|Queue|Deque|ArrayDeque|PriorityQueue)$/.test(base)) {
    const make = /^(?:LinkedHashSet|PriorityQueue)$/.test(base) ? base : "ArrayDeque";
    return `${start(base === "LinkedHashSet" ? "a set" : "a queue")} At the end, collect them into one with Collectors.toCollection(...), which takes the kind of collection to make: .${boxed}collect(Collectors.toCollection(${make}::new)).`;
  }
  if (base === "Iterator") return `${start("an iterator")} It can give one, though: end it with .iterator().`;
  const valueType = /^(?:int|long|double|float|short|byte|char|boolean|Integer|Long|Double|Float|Short|Byte|Character|Boolean|String)$/.test(base);
  // One of the stream's values, such as a Person from a Stream<Person>.
  if (!valueType && (base === element || knows(own, base)))
    return `${start("a single value")} End it with a step that gives one value, such as findFirst() or max(...), which give an Optional: get() takes the ${base} out, as in .findFirst().get().`;
  const number = element ? UNBOXED[element] : undefined;
  const sum = number && /^(?:int|long|double|float|short|byte|Integer|Long|Double|Float|Short|Byte)$/.test(base) ? `count(), or mapTo${cap(number)}(x -> x).sum() for a sum` : null;
  const ends = base === "String" ? 'collect(Collectors.joining(", ")), which joins text' : prim ? "sum(), count() or max()" : (sum ?? "count(), findFirst() or collect(...)");
  return `${start("a single value")} End it with a step that gives one value, such as ${ends}.`;
}

/**
 * Where the body of the lambda whose -> is at `arrow` ends: after the } that closes a block body, or at
 * the , ; or closing bracket after an expression body.
 */
function lambdaEnd(code: string, arrow: number): number {
  let k = arrow + 2;
  while (/\s/.test(code[k] ?? "")) k++;
  const block = code[k] === "{";
  let depth = 0;
  for (; k < code.length; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth < 0) return k;
      if (block && depth === 0) return k + 1;
    } else if (depth === 0 && (ch === "," || ch === ";")) return k;
  }
  return code.length;
}

/** The lambda whose body holds this offset of the code: where its -> is, and where its body ends. */
function lambdaAround(code: string, at: number): { arrow: number; end: number } | null {
  // Backwards from the offset: brackets closed before it don't hold it, and a , or ; at the level
  // looked at ends a lambda's body there, so an arrow before it on that level isn't around the offset.
  let depth = 0;
  let min = 0;
  let separated = false;
  for (let k = at - 1; k > 0; k--) {
    const ch = code[k];
    if (ch === ")" || ch === "]" || ch === "}") depth++;
    else if (ch === "(" || ch === "[" || ch === "{") {
      if (--depth < min) [min, separated] = [depth, false];
    } else if (depth === min && (ch === "," || ch === ";")) separated = true;
    else if (depth === min && !separated && ch === ">" && code[k - 1] === "-") return { arrow: k - 1, end: lambdaEnd(code, k - 1) };
  }
  return null;
}

/** A file's code (comments and strings blanked out) and its text as one string each, with the offset of javac's caret in them. */
function caretIn(d: Diagnostic, own: OwnClasses): { code: string; text: string; at: number } | null {
  const lines = own.code.get(d.file);
  const text = own.lines.get(d.file);
  const c = atCaret(d);
  if (!lines || !text || !c || lines[d.line - 1]?.length !== c.line.length) return null;
  let at = 0;
  for (let i = 0; i < d.line - 1; i++) at += lines[i].length + 1;
  return { code: lines.join("\n"), text: text.join("\n"), at: at + c.line.length - c.at.length };
}

type LambdaInfo = {
  /** Its parameters' names. */
  params: string[];
  /** Its body as written: an expression, or a block in { }. */
  body: string;
  /** The same with comments and strings blanked out (each character where it is in body). */
  bodyCode: string;
  block: boolean;
  /** The method it is given to (forEach, filter, sort), or else the type of the variable it is put in (Comparator). */
  method: string | null;
  type: string | null;
  /** javac's caret is on its parameters, not in its body. */
  onParams: boolean;
};

/**
 * The -> of the lambda that a "cannot infer type-variable(s)" error is about. javac's caret is then on
 * the ( of the generic call it couldn't work out (Collections.sort(, or the collect( around
 * Collectors.partitioningBy), or on the <> of new PriorityQueue<>(...), and the lambda is the first
 * one in those parentheses that is given straight to a method or a class the message's "where"
 * lines name (sort, partitioningBy, PriorityQueue).
 */
function lambdaInGenericCall(d: Diagnostic, code: string, at: number): number | null {
  const methods = [...d.formatted.matchAll(/declared in (?:method <.*?>([\w$]+)\(|class ([\w$.]+))/g)].map((m) => m[1] ?? simple(m[2]));
  // The diamond of new PriorityQueue<>(...): its ( is after the <>.
  const diamond = /^<\s*>\s*\(/.exec(code.slice(at, at + 20));
  if (diamond) at += diamond[0].length - 1;
  if (!methods.length || code[at] !== "(") return null;
  // The method of each ( that is open at the offset looked at (null for other brackets).
  const open: (string | null)[] = [];
  for (let k = at; k < code.length; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") open.push(ch === "(" ? (/([\w$]+)\s*(?:<[^<>()]*>)?\s*$/.exec(code.slice(Math.max(0, k - 100), k))?.[1] ?? null) : null);
    else if (ch === ")" || ch === "]" || ch === "}") {
      open.pop();
      if (!open.length) return null;
    } else if (ch === "-" && code[k + 1] === ">" && methods.includes(open[open.length - 1] ?? "")) return k;
  }
  return null;
}

/**
 * The -> of the first lambda given straight to a call that javac couldn't apply ("method map in
 * interface Stream<T> cannot be applied to given types"), with javac's caret on the . before the
 * method's name.
 */
function lambdaInCall(d: Diagnostic, code: string, at: number): number | null {
  const name = /^method ([\w$]+) in /.exec(d.message)?.[1];
  const call = name ? new RegExp(`^\\.?\\s*${escapeRegExp(name)}\\s*\\(`).exec(code.slice(at)) : null;
  if (!call) return null;
  let depth = 0;
  for (let k = at + call[0].length; k < code.length; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth < 0) return null;
    } else if (depth === 0 && ch === "-" && code[k + 1] === ">") return k;
  }
  return null;
}

/** The lambda at javac's caret: the caret on its parameters, or in its body (or, see lambdaInGenericCall and lambdaInCall, on the call it is given to). */
function lambdaAt(d: Diagnostic, own: OwnClasses): LambdaInfo | null {
  const pos = caretIn(d, own);
  if (!pos) return null;
  const { code, text, at } = pos;
  // Only in javac's short form of the message, "incompatible types: cannot infer ...", is the caret on the call's (.
  const generic = /^incompatible types: /.test(d.message) && LAMBDA_IN_GENERIC_CALL.test(d.message);
  const inCall = generic ? lambdaInGenericCall(d, code, at) : null;
  const ahead = generic ? null : /^(\([^()]*\)|[\w$]+)\s*->/.exec(code.slice(at, at + 300));
  // In a generic call, a lambda around the caret is another one, such as that of a forEach the call is in.
  const arrow = generic ? inCall : ahead ? at + ahead[0].length - 2 : (lambdaInCall(d, code, at) ?? lambdaAround(code, at)?.arrow);
  if (arrow == null) return null;
  const before = code.slice(Math.max(0, arrow - 500), arrow);
  const p = /(\([^()]*\)|[\w$]+)\s*$/.exec(before);
  if (!p) return null;
  const head = before.slice(0, p.index);
  // The method, or the class of new ...<>(, with type arguments or not.
  const method = /([\w$]+)\s*(?:<[^<>()]*>)?\s*\((?:[^()]*,)?\s*$/.exec(head)?.[1] ?? null;
  const type = method ? null : (/([\w$]+)\s*(?:<[^;=(){}]*>)?\s+[\w$]+\s*=\s*$/.exec(head)?.[1] ?? null);
  const end = lambdaEnd(code, arrow);
  const raw = text.slice(arrow + 2, end);
  const body = raw.trim();
  // The code at the same places as the text, character for character.
  const from = arrow + 2 + raw.length - raw.trimStart().length;
  const params = p[1].replace(/[()]/g, "").split(",").map((x) => x.trim().split(/\s+/).pop() ?? "").filter(Boolean);
  return { params, body, bodyCode: code.slice(from, from + body.length), block: body.startsWith("{"), method, type, onParams: !!ahead || inCall != null };
}

/**
 * The two sides of a lambda body that is one subtraction, first - second (also in a block that only
 * returns it, or in parentheses), or null. A cast to int in front of the first side is left out: it
 * is what the comparator shouldn't do.
 */
function difference(l: LambdaInfo): [string, string] | null {
  // Without comments: the blanked-out body is the body without them when it has no text in quotes.
  let body: string | null = !/["']/.test(l.body) ? l.bodyCode : /\/[/*]/.test(l.body) ? null : l.body;
  if (body == null) return null;
  body = body.replace(/\s+/g, " ").trim();
  const only = /^\{ ?return ([^;{}]+); ?\}$/.exec(body);
  if (only) body = only[1].trim();
  else if (l.block) return null;
  const closing = (s: string) => {
    let depth = 0;
    for (let k = 0; k < s.length; k++) {
      if (s[k] === "(") depth++;
      else if (s[k] === ")" && --depth === 0) return k;
    }
    return -1;
  };
  if (body.startsWith("(") && closing(body) === body.length - 1) body = body.slice(1, -1).trim();
  // The - between the sides: outside all brackets, after a value (not a minus sign), and not part of -- or ->.
  const cuts: number[] = [];
  let depth = 0;
  for (let k = 0; k < body.length; k++) {
    const ch = body[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (--depth < 0) return null;
    } else if (ch === "-" && depth === 0 && !"->".includes(body[k + 1] ?? "") && body[k - 1] !== "-" && /[\w$)\]] ?$/.test(body.slice(0, k))) cuts.push(k);
  }
  if (depth !== 0 || cuts.length !== 1) return null;
  const first = body.slice(0, cuts[0]).trim().replace(/^\( ?int ?\) ?/, "");
  const second = body.slice(cuts[0] + 1).trim();
  return first && second && !/[;{}]/.test(first + second) ? [first, second] : null;
}

/** Methods and types whose lambda only does something and gives back nothing (a void lambda). */
const VOID_LAMBDA = /^(forEach|forEachOrdered|ifPresent|Runnable|Consumer|BiConsumer)$/;
/** Methods and types whose lambda must give true or false. */
const TEST_LAMBDA = /^(filter|anyMatch|allMatch|noneMatch|removeIf|takeWhile|dropWhile|Predicate|BiPredicate)$/;
/** Methods, constructors and types whose lambda with two parameters compares two values. */
const ORDER_LAMBDA = /^(sort|sorted|max|min|Comparator|thenComparing|comparing|reverseOrder|nullsFirst|nullsLast|maxBy|minBy|binarySearch|PriorityQueue|PriorityBlockingQueue|TreeSet|TreeMap|ConcurrentSkipListSet|ConcurrentSkipListMap)$/;

/** A lambda's parameters as written before its ->: x, or (a, b). */
const signature = (l: LambdaInfo) => (l.params.length === 1 ? l.params[0] : `(${l.params.join(", ")})`);

/**
 * A block body whose last statement declares a variable, as in { int result = x * 2; }: the
 * variable's type and name, the value it gets (as written), and whether that declaration is all the
 * block.
 */
function blockValue(l: LambdaInfo): { type: string; name: string; value: string; only: boolean } | null {
  if (!l.block) return null;
  const m = /(?:^\{|[;{}])\s*(?:final\s+)?([\w$.]+(?:\s*<[^;=(){}]*>)?(?:\s*\[\s*\])*)\s+([\w$]+)\s*=(?!=)([^;]*);\s*\}$/d.exec(l.bodyCode);
  if (!m || /^(?:return|new|throw|else|case|yield|var)$/.test(m[1]) || !m.indices?.[3]) return null;
  const value = l.body.slice(m.indices[3][0], m.indices[3][1]).trim();
  return value ? { type: m[1].replace(/\s+/g, ""), name: m[2], value, only: m.index === 0 } : null;
}

/** A lambda that gives back the wrong type of value, a value where it must give none, or none where it must give one. */
function lambdaResult(d: Diagnostic, own: OwnClasses): string | null {
  const msg = d.message;
  const call = /^method ([\w$]+) in (?:interface|class) .* cannot be applied/.exec(msg)?.[1];
  const l = lambdaAt(d, own);
  // "unexpected return value" is also a void method's return with a value: then the caret isn't on a lambda.
  if (/^incompatible types: unexpected return value/.test(msg) && !l?.onParams) return null;
  const where = call ?? l?.method ?? l?.type ?? null;
  // What needs the lambda: forEach(...) (a method's name stays as it is, also at the start of a sentence), or a Runnable.
  const name = !where ? "this place" : /^[A-Z]/.test(where) ? anWord(where) : `${where}(...)`;
  const Name = !where ? "Here Java" : /^[A-Z]/.test(where) ? name[0].toUpperCase() + name.slice(1) : name;
  const needs = !where ? "Java needs" : `${name} needs`;
  const p = l?.params[0] ?? "x";
  const doesNothing = `${Name} needs a lambda that only does something and gives back nothing (a void lambda)`;
  const toMap = where === "forEach" ? " To turn each value into a new one, use map instead of forEach." : "";
  // A value where there must be none.
  if (/lambda body is not compatible with a void functional interface/.test(msg) || (/missing return value/.test(msg) && where && VOID_LAMBDA.test(where) && l && !l.block)) {
    const print = l && !l.block && l.body.length <= 60 ? `, as in ${signature(l)} -> System.out.println(${l.body})` : "";
    return `${doesNothing}, and this lambda's body is only a value, which would be thrown away. Make the body do something with it, such as print it${print}.${toMap}`;
  }
  if (/unexpected return value/.test(msg)) return `${doesNothing}, so its lambda can't return a value. Remove the return, and do something with the value instead, such as print it.${toMap}`;
  if (/missing return value/.test(msg)) {
    if (where && /^(map|mapToInt|mapToDouble|mapToLong|mapToObj)$/.test(where)) {
      // A return with a value (in the text, where a value in quotes isn't blanked out).
      const some = !!l && [...l.bodyCode.matchAll(/\breturn\b/g)].some((m) => /^\s*[^\s;]/.test(l.body.slice(m.index! + 6)));
      return `${where}(...) turns each value into a new one, so its lambda must give back a value, and this block ${some ? "doesn't give one back on every path" : "has no return"}. To only do something with each value, such as print it, use forEach instead of ${where}. Otherwise end the block with return and the new value.`;
    }
    const two = l?.params.length === 2 && ((where && ORDER_LAMBDA.test(where)) || where == null);
    const test = l?.params.length === 1 && !!where && TEST_LAMBDA.test(where);
    // A block that ends by declaring a variable of the type the lambda must give, as in { int result = x * 2; }: return that variable.
    const last = l && blockValue(l);
    const kept = last && (test ? /^(?:boolean|Boolean)$/.test(last.type) : two ? /^(?:int|Integer|short|byte|char)$/.test(last.type) : true) ? last : null;
    const returnIt = kept ? `, as in return ${kept.name}; at the end` : "";
    // A lambda that is one expression: the value the block computes, or an example that fits the values the lambda gets.
    const example = !l ? null : kept?.only ? kept.value : two ? comparatorFor(own, comparedType(d, own), l.params[0], l.params[1]) : test ? testOn(own, valuesOf(d, own, TESTED)?.element ?? null, p) : null;
    const single = !l || !example ? "" : kept?.only ? ` Or leave out the braces and the variable: a lambda that is a single expression, such as ${signature(l)} -> ${example}, gives back its value without return.` : ` A lambda that is a single expression, such as ${signature(l)} -> ${example}, gives back its value without return.`;
    return `This lambda's body is a block in { }, and a block gives back nothing unless it says return, but ${needs} a value from it. End the block with return and the value, on every path through it (also when an if isn't true)${returnIt}.${single}`;
  }
  const lossy = /possible lossy conversion from (\w+) to (\w+)/.exec(msg);
  if (lossy) {
    const [, from, to] = lossy;
    const two = l?.params.length === 2;
    if (to === "int" && two && ((where && ORDER_LAMBDA.test(where)) || where == null)) {
      const diff = l && difference(l);
      const compare = from === "long" ? "Long.compare" : "Double.compare";
      const fix = diff ? `: (${l!.params.join(", ")}) -> ${compare}(${diff[0]}, ${diff[1]})` : "";
      const cast = from === "long" ? "a cast to int would cut a big difference down to a wrong number, even one with the wrong sign" : "a cast would turn a difference such as 0.5 into 0, as if the two were equal";
      return `A comparator's lambda must give an int: negative when the first value comes first, zero when they're equal, positive when the second comes first. This one gives ${anWord(from)}, and ${cast}. Use ${compare}(first, second), which gives the right int${fix}.`;
    }
    if (where && /^mapTo(Int|Long)$/.test(where) && /^(double|float|long)$/.test(from)) {
      const use = from === "long" ? "mapToLong" : "mapToDouble";
      return `${where}(...) needs ${anWord(to)} from its lambda, and this one gives ${anWord(from)}. Use ${use} instead: it makes a stream of ${from === "long" ? "long" : "double"} values, which also has sum(), average() and max().`;
    }
    if (where && /^comparing(Int|Long)$/.test(where) && /^(double|float|long)$/.test(from)) {
      const use = from === "long" ? "comparingLong" : "comparingDouble";
      return `${where}(...) needs ${anWord(to)} from its lambda, and this one gives ${anWord(from)}. Use Comparator.${use}(...) instead: it compares the ${from} values as they are, where a cast to ${to} could make different values equal.`;
    }
    return `This lambda gives ${anWord(from)}, but ${needs} one that gives ${anWord(to)}, and Java won't drop the extra precision by itself. Convert the value on purpose, for example with a cast such as (${to}), or use a method that works with ${from} values.`;
  }
  // In a generic call's message, the line ends with the ) that closes "(argument mismatch; ...".
  const conv = /(\S+) cannot be converted to (\S+?)\)?$/m.exec(msg);
  if (!conv) return null;
  const [, from, to] = conv;
  if (to === "boolean" || (where && TEST_LAMBDA.test(where))) {
    // What the lambda gives: its body, or the values its block returns (not the = of a variable it declares).
    const given = !l ? "" : l.block ? [...l.bodyCode.matchAll(/\breturn\b([^;]*);/g)].map((m) => m[1]).join(" ") : l.bodyCode;
    const assign = /(^|[^=!<>])=(?!=)/.test(given) ? " (= puts a value in a variable; == or equals compares)" : "";
    // An example built from the body, so that it fits the values: n -> n > 3 for n -> n, p -> p.getAge() > 3 for p -> p.getAge().
    let example: string | null = null;
    if (l && !l.block) {
      const set = /^([\w$]+)\s*=(?!=)/.exec(l.bodyCode);
      const value = set ? l.body.slice(set[0].length).trim() : "";
      // A choice such as w.equals("a") ? 1 : 0: its condition is the test.
      let depth = 0;
      let choice = -1;
      for (let k = 0; k < l.bodyCode.length && choice < 0; k++) {
        const ch = l.bodyCode[k];
        if ("([{".includes(ch)) depth++;
        else if (")]}".includes(ch)) depth--;
        else if (ch === "?" && depth === 0) choice = k;
      }
      if (set && value) example = /^[a-z]/.test(from) ? `${set[1]} == ${value}` : `${set[1]}.equals(${value})`;
      else if (choice > 0 && !assign) example = l.body.slice(0, choice).trim();
      else if (!assign) example = testOn(own, from, l.body, l.bodyCode);
    } else if (l) example = testOn(own, valuesOf(d, own, TESTED)?.element ?? null, p);
    const such = example && l ? `, such as ${signature(l)} -> ${example}` : ", for example with >, == or equals(...)";
    return `${Name} keeps or checks values by the lambda's answer, so the lambda must give a boolean (true or false), and this one gives ${anWord(from)}${assign}. Make it a comparison or a test${such}.`;
  }
  if (to === "int" && l?.params.length === 2 && ((where && ORDER_LAMBDA.test(where)) || where == null)) {
    const [a, b] = l.params;
    const first = `A comparator's lambda must give an int: negative when the first value comes first, zero when they're equal, positive when the second comes first.`;
    if (from === "boolean") {
      const start = `${first} This one gives a boolean, which has only two answers where a comparator needs three.`;
      const type = comparedType(d, own);
      // A comparison such as a.getAge() > b.getAge(): the same two values in a method that gives the int.
      const sides = l.block ? null : comparisonSides(l.bodyCode, l.body);
      if (sides) {
        const sideType = typeOfValue(own, sides.first, l.params, type) ?? typeOfValue(own, sides.second, l.params, type);
        const code = sideType && compareCode(own, sideType, sides.first, sides.second);
        if (code) return `${start} Compare the two values with a method that gives such an int: (${a}, ${b}) -> ${code}.`;
        return `${start} For int values, Integer.compare gives such an int: (${a}, ${b}) -> Integer.compare(${sides.first}, ${sides.second}). For double values, use Double.compare in the same way, and for text, compareTo.`;
      }
      const code = comparatorFor(own, type, a, b);
      if (code) return `${start} Use a method that gives such an int, as in (${a}, ${b}) -> ${code}.`;
      return `${start} For int values, Integer.compare(first, second) gives such an int (Double.compare for double values), and for text, first.compareTo(second).`;
    }
    if (from === "String") {
      // The same text for the second value: a replaced by b, when the body doesn't use b already.
      const word = (x: string) => new RegExp(`(?<![\\w$.])${escapeRegExp(x)}(?![\\w$])`, "g");
      let mirrored: string | null = null;
      if (word(a).test(l.bodyCode) && !word(b).test(l.bodyCode)) {
        let last = 0;
        mirrored = "";
        for (const m of l.bodyCode.matchAll(word(a))) {
          mirrored += l.body.slice(last, m.index) + b;
          last = m.index! + a.length;
        }
        mirrored += l.body.slice(last);
      }
      return `${first} This one gives a String. Compare text with compareTo, which gives such an int${mirrored && !l.block ? `: (${a}, ${b}) -> ${callable(l.body)}.compareTo(${mirrored})` : ""}.`;
    }
    return `${first} This one gives ${anWord(from)}.`;
  }
  if (where && /^mapTo(Int|Double|Long)$/.test(where) && from === "String") {
    const such = l && !l.block ? `, such as ${signature(l)} -> ${callable(l.body)}.length(), or ${signature(l)} -> Integer.valueOf(${l.body}) for text that is a number` : ", for example with length(), or with Integer.valueOf(...) for text that is a number";
    return `${where}(...) needs a number for each value, and this lambda gives a String. Make it give a number${such}.`;
  }
  return `This lambda gives ${anWord(from)}, but ${needs} one that gives ${anWord(to)}. Change what the lambda computes${call || l?.method ? `, or check that ${where} is the method you meant` : ""}.`;
}

/** "lambda body is neither value nor void compatible": a block that returns a value on some paths and reaches its end on others. */
function valueOnEveryPath(d: Diagnostic, own: OwnClasses): string {
  const start = "Some paths through this lambda's block end with return and a value, and others reach the end without one. Every path must give a value: add a return with a value at the end of the block, for the case the ifs above it don't cover";
  const l = lambdaAt(d, own);
  const where = l?.method ?? l?.type ?? null;
  if (l && where && l.params.length === 2 && ORDER_LAMBDA.test(where)) {
    // A comparator that returns in ifs, as in if (a.length() > b.length()) return 1;: one compare covers every case, in the same order.
    const [a, b] = l.params;
    const cond = /\bif\s*\(((?:[^()]|\([^()]*\))*)\)\s*\{?\s*return\s*(-?)/d.exec(l.bodyCode);
    const sides = cond?.indices?.[1] ? comparisonSides(cond[1], l.body.slice(cond.indices[1][0], cond.indices[1][1])) : null;
    const type = comparedType(d, own);
    let code: string | null = null;
    if (sides) {
      const sideType = typeOfValue(own, sides.first, l.params, type) ?? typeOfValue(own, sides.second, l.params, type);
      const [x, y] = sides.greater === (cond![2] !== "-") ? [sides.first, sides.second] : [sides.second, sides.first];
      code = sideType && compareCode(own, sideType, x, y);
    } else code = comparatorFor(own, type, a, b);
    const one = code ? `, as in (${a}, ${b}) -> ${code}` : ": Integer.compare(first, second) for int values, Double.compare for double values, or first.compareTo(second) for text";
    return `${start}. In a comparator, one return with a method that compares the two values covers every case, also when they're equal${one}.`;
  }
  const literal = where && TEST_LAMBDA.test(where) ? "return false;" : where && /^mapTo(?:Int|Long)$/.test(where) ? "return 0;" : where === "mapToDouble" ? "return 0.0;" : null;
  return `${start}${literal ? ` (for example ${literal})` : ""}.`;
}

/** A lambda's parameter named like a variable of the method around it. */
function lambdaParameterTaken(d: Diagnostic): string | null {
  const name = /^variable ([\w$]+) is already defined/.exec(d.message)?.[1];
  const at = atCaret(d)?.at ?? "";
  if (!name || !new RegExp(`^${escapeRegExp(name)}\\s*(?:->|(?:,\\s*[\\w$]+\\s*)*\\)\\s*->)`).test(at)) return null;
  return `${name} is already a variable of this method, and a lambda's parameter can't have the name of a variable that is in use around the lambda. Give the parameter another name, and use that name in the lambda's body.`;
}

/** A name that's one of this lambda's parameters, in its header on the caret's line: p in "p -> p.getAge()" or "(a, b) -> ...". */
function isLambdaParameter(d: Diagnostic, own: OwnClasses, name: string): boolean {
  const c = atCaret(d);
  const code = own.code.get(d.file)?.[d.line - 1];
  const line = code?.length === c?.line.length ? code : c?.line;
  const n = escapeRegExp(name);
  return !!line && new RegExp(`(?:^|[^\\w$.])(?:${n}|\\([^()]*(?<![\\w$])${n}(?![\\w$])[^()]*\\))\\s*->`).test(line);
}

/**
 * Where a lambda gets its values: the functional interface a variable for it is declared with, the
 * steps of a stream it may be given to, the methods of a list, and the static methods of
 * Collections and Arrays that take the list first.
 */
type ValuesFrom = { iface: string; steps: string; methods: string; statics: string | null };
const COMPARED: ValuesFrom = { iface: "Comparator", steps: "sorted|max|min", methods: "sort", statics: "sort|max|min" };
const TESTED: ValuesFrom = { iface: "Predicate", steps: "filter|anyMatch|allMatch|noneMatch|takeWhile|dropWhile", methods: "removeIf", statics: null };

/**
 * The values a lambda on the caret's line gets, from the code around it: for a comparator, Person
 * for people.sort(...), Collections.sort(people, ...) or people.stream().sorted(...) with a
 * List<Person> people, or for Comparator<Person> c = .... Not after a step such as map, which
 * changes what the stream holds. With the list or array they come from, when there is one, and its
 * type as declared (null for var, or when no declaration is found).
 */
function valuesOf(d: Diagnostic, own: OwnClasses, from: ValuesFrom): { element: string | null; receiver?: string; type?: string | null } | null {
  const pos = caretIn(d, own);
  const line = own.code.get(d.file)?.[d.line - 1];
  if (!pos || line == null) return null;
  const declared = new RegExp(`\\b(?:${from.iface})\\s*<\\s*([\\w$.]+)\\s*>\\s*[\\w$]+\\s*=`).exec(line)?.[1];
  if (declared) return { element: simple(declared) };
  const stream = new RegExp(`(?:\\bArrays\\s*\\.\\s*stream\\s*\\(\\s*([\\w$]+)\\s*\\)|([\\w$]+)\\s*\\.\\s*stream\\s*\\(\\s*\\))([^;]*?)\\.\\s*(?:${from.steps})\\s*\\(`).exec(line);
  const receiver =
    (from.statics ? new RegExp(`\\b(?:Collections|Arrays)\\s*\\.\\s*(?:${from.statics})\\s*\\(\\s*([\\w$]+)\\s*,`).exec(line)?.[1] : undefined) ??
    new RegExp(`([\\w$]+)\\s*\\.\\s*(?:${from.methods})\\s*\\(`).exec(line)?.[1] ??
    (stream && !/\.\s*(?:map|flatMap|mapToObj|mapMulti)\b/.test(stream[3]) ? (stream[1] ?? stream[2]) : undefined);
  if (!receiver || /^(?:Collections|Arrays)$/.test(receiver)) return null;
  const type = changesOf(pos.code, receiver, pos.at).type;
  const element = /^(?:[\w$]+\.)*(?:List|ArrayList|LinkedList|Collection|Set|HashSet|TreeSet|LinkedHashSet|Stream|Iterable|Queue|Deque|ArrayDeque|PriorityQueue|Vector)<([\w$.]+)>$/.exec(type ?? "")?.[1] ?? /^([\w$.]+)\[\]$/.exec(type ?? "")?.[1];
  return { element: element ? simple(element) : null, receiver, type };
}

/** The type of the values a comparator on the caret's line compares (see valuesOf). */
const comparedType = (d: Diagnostic, own: OwnClasses) => valuesOf(d, own, COMPARED)?.element ?? null;

/** The class whose static compare compares two values of a type, as in Integer.compare(a, b). */
const COMPARE_CLASS: Record<string, string> = { int: "Integer", long: "Long", double: "Double", float: "Float", short: "Short", byte: "Byte", char: "Character", boolean: "Boolean" };
for (const box of Object.values(COMPARE_CLASS)) COMPARE_CLASS[box] = box;
const NUMBER_TYPE = /^(?:int|long|double|float|short|byte|Integer|Long|Double|Float|Short|Byte)$/;

/** Code that compares a and b, two values of this type, as a comparator must (with an int): Integer.compare(a, b) for ints, a.compareTo(b) for text. */
function compareCode(own: OwnClasses, type: string, a: string, b: string): string | null {
  if (COMPARE_CLASS[type]) return `${COMPARE_CLASS[type]}.compare(${a}, ${b})`;
  if (type === "String" || (knows(own, type) && comparable(own, type))) return `${a}.compareTo(${b})`;
  return null;
}

/** A getter of one of the program's types or its parents (or a record's accessor) whose type fits, for an example such as p.getAge() > 3. */
function getterOf(own: OwnClasses, type: string, fits: (type: string) => boolean): OwnMember | undefined {
  const t = typeNamed(own, type);
  if (!t) return undefined;
  const accessor = (name: string) => t.kind === "record" && t.members.some((f) => !f.method && f.name === name);
  return [t, ...ancestorsOf(own, t.name)].flatMap((a) => a.members).find((x) => x.method && !x.static && !x.private && x.params === "" && (/^(?:get|is)[A-Z]/.test(x.name) || accessor(x.name)) && fits(x.type));
}

/** A comparator's body for two values of this type, a and b: Integer.compare(a, b), or by a getter, as in a.getName().compareTo(b.getName()). */
function comparatorFor(own: OwnClasses, type: string | null, a: string, b: string): string | null {
  if (!type) return null;
  const direct = compareCode(own, type, a, b);
  if (direct) return direct;
  const key = getterOf(own, type, (t) => compareCode(own, t, "", "") != null);
  return key ? compareCode(own, key.type, `${a}.${key.name}()`, `${b}.${key.name}()`) : null;
}

/**
 * A test on `value`, a value of this type as written, for an example: value > 3 for a number (value
 * == 0 for a remainder), value.startsWith("A") for text, or one with a getter of one of the program's
 * types.
 */
function testOn(own: OwnClasses, type: string | null, value: string, code = value): string | null {
  if (!type) return null;
  const v = value.trim();
  // The operators are looked for in the code, where text in quotes is blanked out.
  if (NUMBER_TYPE.test(type)) {
    if (/[=<>!&|?:^]/.test(code)) return `(${v}) > 3`;
    // A remainder is tested against 0, and so is what indexOf (-1 for none) and compareTo give.
    return /%/.test(code) ? `${v} == 0` : /\bindexOf\s*\([^()]*\)\s*$/.test(code) ? `${v} >= 0` : /\bcompareTo\s*\([^()]*\)\s*$/.test(code) ? `${v} < 0` : `${v} > 3`;
  }
  if (type === "String") return `${callable(v)}.startsWith("A")`;
  const flag = getterOf(own, type, (t) => /^(?:boolean|Boolean)$/.test(t));
  if (flag) return `${callable(v)}.${flag.name}()`;
  const number = getterOf(own, type, (t) => NUMBER_TYPE.test(t));
  if (number) return `${callable(v)}.${number.name}() > 3`;
  const text = getterOf(own, type, (t) => t === "String");
  return text ? `${callable(v)}.${text.name}().startsWith("A")` : null;
}

/**
 * The type of a value as a lambda's body writes it, from the type of the lambda's parameters: a
 * parameter itself, or a getter or variable of it, such as a.getAge() (int) or a.length() for text.
 */
function typeOfValue(own: OwnClasses, value: string, params: string[], type: string | null): string | null {
  const m = /^([\w$]+)(?:\s*\.\s*([\w$]+)\s*(\(\s*\))?)?$/.exec(value.trim());
  if (!m || !type || !params.includes(m[1])) return null;
  if (!m[2]) return type;
  if (type === "String" && m[2] === "length" && m[3]) return "int";
  const t = typeNamed(own, type);
  if (!t) return null;
  return [t, ...ancestorsOf(own, t.name)].flatMap((a) => a.members).find((x) => x.name === m[2] && x.method === !!m[3] && (!m[3] || x.params === ""))?.type ?? null;
}

/**
 * The two sides of a comparison with <, >, <= or >= that is all of an expression (one, outside
 * brackets), or null. `code` is the expression with its strings blanked out, and `text` the same as
 * written, which the sides are taken from.
 */
function comparisonSides(code: string, text = code): { first: string; second: string; greater: boolean } | null {
  const cuts: number[] = [];
  let depth = 0;
  for (let k = 0; k < code.length; k++) {
    const ch = code[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (depth !== 0) continue;
    else if ((ch === "<" || ch === ">") && !"<>".includes(code[k + 1] ?? "") && !"<>-".includes(code[k - 1] ?? "")) cuts.push(k);
    else if (/[=!&|?]/.test(ch) && !(ch === "=" && (code[k - 1] === "<" || code[k - 1] === ">"))) return null;
  }
  if (cuts.length !== 1) return null;
  const k = cuts[0];
  const [first, second] = [text.slice(0, k).trim(), text.slice(k + (code[k + 1] === "=" ? 2 : 1)).trim()];
  return first && second ? { first, second, greater: code[k] === ">" } : null;
}

/** A value written so that a method call can follow it: as it is when it's a name or a chain of calls, and otherwise in parentheses. */
const callable = (value: string) => (/^[\w$]+(?:\s*\([^()]*\))?(?:\s*\.\s*[\w$]+(?:\s*\([^()]*\))?)*$/.test(value.trim()) ? value.trim() : `(${value.trim()})`);

/**
 * The statement that holds the offset `at` of the code, from after the ; or { before it to its ;
 * (brackets it is in belong to it, and so do the ; and blocks of lambdas inside it).
 */
function statementAt(code: string, at: number): string {
  let depth = 0;
  let inside = 0;
  let start = 0;
  for (let k = at - 1; k >= 0 && !start; k--) {
    const ch = code[k];
    if (ch === ")" || ch === "]" || ch === "}") {
      if (ch === "}" && depth === 0 && inside === 0) start = k + 1;
      else depth++;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      if (depth > 0) depth--;
      else if (ch === "{") start = k + 1;
      else inside++;
    } else if (ch === ";" && depth === 0) start = k + 1;
  }
  let end = code.length;
  depth = 0;
  for (let k = at; k < code.length && end === code.length; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth > 0) depth--;
      else if (ch === "}") end = k;
    } else if (ch === ";" && depth === 0) end = k;
  }
  return code.slice(start, end);
}

/** A lambda's parameter that Java gave the type Object, as in Comparator.comparing(p -> p.getAge()).reversed(). */
function objectInLambda(d: Diagnostic, own: OwnClasses, v: string, method: boolean, member: string): string | null {
  if (!isLambdaParameter(d, own, v)) return null;
  const use = method ? `${member}()` : member;
  // The class to name: the type of the values being compared, when the code shows it; otherwise the one class that has the member.
  const has = (t: OwnClass | undefined) => !!t && [t, ...ancestorsOf(own, t.name)].some((a) => declares(a, member, method));
  const holders = [...own.types.values()].filter((t) => declares(t, member, method));
  const compared = comparedType(d, own);
  const owner = compared && (knows(own, compared) ? has(typeNamed(own, compared, d.file)) : /^[A-Z]/.test(compared)) ? compared : holders.length === 1 ? holders[0].name : undefined;
  // Several classes have the member, and the code doesn't show which one the values are: name them all.
  const names = owner ? [owner] : holders.slice(0, 3).map((t) => t.name);
  const or = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} or ${items[items.length - 1]}`);
  const whichever = names.length > 1 ? ", whichever class the values have" : "";
  const c = atCaret(d);
  const line = c?.line ?? "";
  if (/\bcomparing(?:Int|Double|Long)?\s*\(/.test(line)) {
    const typed = names.length ? `${or(names.map((n) => `(${n} ${v}) -> ${v}.${use}`))}${whichever}` : `(Person ${v}) -> ${v}.${use}, with your class's name instead of Person`;
    const start = `${v} is the parameter of a lambda, and Java couldn't work out its type, so it made it Object, which has no ${method ? "method" : "variable"} ${use}.`;
    const fix = `${method ? ` Or use a method reference, which names the class: ${names.length ? or(names.map((n) => `${n}::${member}`)) : `Person::${member}`}.` : ""}`;
    // What hides the type: .reversed() or .thenComparing(...) after comparing(...) in the statement, a list declared without a type in angle brackets, or neither.
    const pos = caretIn(d, own);
    const chain = !!pos && /\bcomparing(?:Int|Double|Long)?\s*\([\s\S]*?\.\s*(?:reversed|thenComparing\w*)\s*\(/.test(statementAt(pos.code, pos.at));
    const values = valuesOf(d, own, COMPARED);
    const raw = values?.receiver && values.type && /^(?:[\w$]+\.)*(?:List|ArrayList|LinkedList|Collection|Set|HashSet|TreeSet|LinkedHashSet|Iterable|Queue|Deque|ArrayDeque|PriorityQueue|Vector)$/.test(values.type) ? values : null;
    const follows = ".reversed() or .thenComparing(...) follows Comparator.comparing(...)";
    const alone = "Java reads comparing(...) on its own, before it sees what the comparator is for";
    const typedList = raw ? `${raw.type}<${names.length === 1 ? names[0] : "..."}>` : "";
    if (raw && chain)
      return `${start} Two things hide its type here: ${raw.receiver} is declared without a type in angle brackets, and ${follows}, so ${alone}. Declare ${raw.receiver} with its type, such as ${typedList}, and give the parameter its type: ${typed}.${fix}`;
    if (chain) return `${start} That happens when ${follows}: ${alone}. Give the parameter its type: ${typed}.${fix}`;
    if (raw)
      return `${start} That happens here because ${raw.receiver} is declared without a type in angle brackets, so Java doesn't know what its elements are, or what the comparator compares. Declare ${raw.receiver} with its type, such as ${typedList}, or give the parameter its type: ${typed}.${fix}`;
    return `${start} That happens when nothing around Comparator.comparing(...) says what it compares, as with var, or with a Comparator variable or a new TreeSet(...) without a type in angle brackets (such as Comparator<${names.length === 1 ? names[0] : "Person"}>). Give the parameter its type: ${typed}.${fix}`;
  }
  // A list without a type: if none of the program's classes has the member, it may be text (length()).
  const list = names.length ? `${or(names.map((n) => `List<${n}> list = new ArrayList<>();`))}${whichever}` : "List<String> list = new ArrayList<>();";
  return `${v} is the parameter of a lambda, and it has the type of the values the lambda gets, here Object, which has no ${method ? "method" : "variable"} ${use}. That usually means the list or stream has no type in angle brackets, as in List list = new ArrayList();. Give it its type, such as ${list}, and ${v} gets that type too.`;
}

/**
 * The local variable `name` that is in use at `at`: its type as declared (null for var, or when no
 * declaration is found), and the offsets where the code changes it (=, +=, ++ and so on), from its
 * declaration to the end of the block it's declared in.
 */
function changesOf(code: string, name: string, at: number): { type: string | null; changes: number[] } {
  const n = escapeRegExp(name);
  let type: string | null = null;
  let from = 0;
  let nameAt = -1;
  const declaration = new RegExp(`(?<![\\w$.])((?:[\\w$]+\\.)*[\\w$]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*)\\s+${n}(?![\\w$])(?=\\s*[=;:,)])`, "g");
  for (const m of code.slice(0, at).matchAll(declaration)) {
    if (/^(return|new|throw|else|case|yield|assert|instanceof)$/.test(m[1])) continue;
    [type, from, nameAt] = [m[1].replace(/\s+/g, ""), m.index, m.index + m[0].length - name.length];
  }
  // The variable exists up to the } that closes the block it's declared in (or up to another declaration of the name).
  let end = code.length;
  let depth = 0;
  for (let k = from; k < code.length; k++) {
    if (code[k] === "{") depth++;
    else if (code[k] === "}" && --depth < 0) {
      end = k;
      break;
    }
  }
  const later = [...code.slice(at, end).matchAll(declaration)].find((m) => !/^(return|new|throw|else|case|yield|assert|instanceof)$/.test(m[1]));
  if (later) end = at + later.index;
  const change = new RegExp(`(?<![\\w$.])${n}\\s*(?:(?:[-+*/%&|^]|<<|>>>?)?=(?!=)|\\+\\+|--)|(?:\\+\\+|--)\\s*${n}(?![\\w$])`, "g");
  const changes = [...code.slice(from, end).matchAll(change)].map((m) => from + m.index).filter((k) => k !== nameAt);
  return { type: type === "var" ? null : type, changes };
}

/**
 * The for loop whose header changes a variable at the offset `change`, in its update part (after the
 * header's second ;), and whose body holds the offset `at`: where its for is, and whether its body is
 * a block in { } or one statement without braces. Null when the change isn't in such a loop's header.
 */
function counterLoop(code: string, change: number, at: number): { at: number; block: boolean } | null {
  // Back from the change to the ( that is open there, which must be a for's.
  let depth = 0;
  let open = -1;
  for (let k = change - 1; k >= 0 && open < 0; k--) {
    const ch = code[k];
    if (ch === ")" || ch === "]" || ch === "}") depth++;
    else if (ch === "(" || ch === "[" || ch === "{") {
      if (depth === 0) {
        if (ch !== "(") return null;
        open = k;
      } else depth--;
    }
  }
  if (open < 0) return null;
  const from = Math.max(0, open - 20);
  const keyword = /(?<![\w$.])for\s*$/.exec(code.slice(from, open));
  if (!keyword) return null;
  // The header's two ; (a for-each header has none), and the ) that closes it.
  const semicolons: number[] = [];
  let close = -1;
  depth = 0;
  for (let k = open + 1; k < code.length && close < 0; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (depth === 0) close = k;
      else depth--;
    } else if (ch === ";" && depth === 0) semicolons.push(k);
  }
  if (close < 0 || semicolons.length !== 2 || change < semicolons[1]) return null;
  // The body: a block in { } right after the header, or else the one statement up to its ;.
  let body = close + 1;
  while (/\s/.test(code[body] ?? "")) body++;
  const block = code[body] === "{";
  let end = -1;
  depth = 0;
  for (let k = body; k < code.length && end < 0; k++) {
    const ch = code[k];
    if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      if (--depth < 0) return null;
      if (block && depth === 0) end = k + 1;
    } else if (!block && ch === ";" && depth === 0) end = k + 1;
  }
  return end >= 0 && at > body && at < end ? { at: from + keyword.index, block } : null;
}

/** "local variables referenced from a lambda expression must be final or effectively final". */
function effectivelyFinal(d: Diagnostic, own: OwnClasses): string {
  const inner = /inner class/.test(d.message);
  const who = inner ? "code in an inner class (such as new Runnable() { ... })" : "a lambda";
  const it = inner ? "the inner class" : "the lambda";
  const rule = `${who[0].toUpperCase()}${who.slice(1)} can use a local variable of the method around it only if the variable never changes after it gets its value (Java calls that effectively final)`;
  const name = /^[\w$]+/.exec(atCaret(d)?.at ?? "")?.[0];
  const pos = caretIn(d, own);
  if (!name || !pos) return `${rule}. To count or add up values, use an ordinary for-each loop, or let a stream compute the value, such as count() or sum(). Otherwise copy the variable into a new one that never changes, and use that instead.`;
  const { code, at } = pos;
  const { type, changes } = changesOf(code, name, at);
  const line = (k: number) => code.slice(0, k).split("\n").length;
  const lambda = inner ? null : lambdaAround(code, at);
  const inside = lambda ? changes.filter((k) => k > lambda.arrow && k < lambda.end) : changes.filter((k) => line(k) === d.line);
  if (inside.length)
    return `${name} is a local variable of the method, and ${who} can't change it: it can only use local variables that never change after they get their value (Java calls that effectively final). To count, add up or find the largest value, let the stream compute it with count(), sum() or max(), as in int sum = list.stream().mapToInt(...).sum();. Or go through the values with an ordinary for-each loop, which can change ${name}.`;
  const copy = `${name}Copy`;
  const lines = [...new Set(changes.map(line))];
  // The counter of a for loop, changed in its header, used in the loop's body: the copy goes inside the loop.
  const loop = changes.map((k) => counterLoop(code, k, at)).find((x) => x != null);
  if (loop) {
    const start = `${it[0].toUpperCase()}${it.slice(1)} uses ${name}, the counter of the for loop on line ${line(loop.at)}, which changes in every round. ${rule}.`;
    const declare = type ? `: ${type} ${copy} = ${name}; Then use ${copy} in ${it}.` : `, and use that in ${it}.`;
    if (loop.block) return `${start} Copy the counter into a new variable inside the loop, right before ${it}${declare}`;
    return `${start} The loop's body is one statement without { }, and a new variable can't be declared there, so first put braces around the body: for (...) { ... }. Then, inside the braces, copy the counter into a new variable right before ${it}${declare}`;
  }
  const where = lines.length ? `, and ${name} gets a new value on line ${listed(lines.slice(0, 3).map(String))}` : `, which changes somewhere in the method`;
  const declare = type ? `: ${type} ${copy} = ${name}; Then use ${copy} in ${it}.` : `, and use that in ${it}.`;
  return `${it[0].toUpperCase()}${it.slice(1)} uses the local variable ${name}${where}. ${rule}. If ${name} doesn't need to change, remove the change. Otherwise copy its value into a new variable right before ${it}${declare}`;
}

// ---- Exceptions and packages (MOOC part 11) ----

/** "a, b and c". */
const list = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** The } that closes the { at `open`, or -1. */
function closeOf(text: string, open: number): number {
  let depth = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === "{") depth++;
    else if (text[k] === "}" && --depth === 0) return k;
  }
  return -1;
}

/** The { that opens the innermost block around a position, or -1. */
function blockAround(text: string, at: number): number {
  let depth = 0;
  for (let k = at - 1; k >= 0; k--) {
    if (text[k] === "}") depth++;
    else if (text[k] === "{" && depth-- === 0) return k;
  }
  return -1;
}

/** The body of the method or constructor around a position: its { and }, or null. */
function methodBodyAround(text: string, at: number): [number, number] | null {
  for (let open = blockAround(text, at); open >= 0; open = blockAround(text, open)) {
    const before = text.slice(Math.max(0, open - 1000), open);
    if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return null;
    const h = HEADER_END.exec(before);
    if (h && !NOT_A_METHOD.test(h[1]) && !/->\s*$/.test(before)) return [open, closeOf(text, open)];
  }
  return null;
}

/** Words that come before ( ... ) { without being a method's name. */
const NOT_A_METHOD = /^(?:if|for|while|switch|catch|synchronized|try|return|new|throw|else|do|case|assert)$/;
/** A method's or constructor's header right before its {: the name, (the parameters), and a throws list. */
const HEADER_END = /([\w$]+)\s*\(([^()]*)\)\s*(?:throws\s+[\w$.,\s]+)?$/;

type Around = {
  name: string;
  /** Its header as written, on one line and without annotations: public static void main(String[] args). */
  header: string;
  constructor: boolean;
  override: boolean;
  /** Whether javac's caret is inside a lambda (->) in it. */
  lambda: boolean;
  /** Whether javac's caret is inside a try's block (or its resources) in it. */
  inTry: boolean;
};

/** A switch's label and its arrow at the end (case 1 ->, case "S", "M" ->, default ->): not a lambda's ->. The label stops at its first ->. */
const SWITCH_ARROW = /\b(?:case\b(?:(?!->)[^;{}:])*|default\s*)->\s*$/;

/** The method or constructor whose body holds javac's caret, read from the file, or null (outside a method). */
function methodAround(d: Diagnostic, own: OwnClasses): Around | null {
  const where = caretIn(d, own);
  if (!where) return null;
  const { code: text, at } = where;
  // A lambda without braces: an -> in the statement, before the caret (a switch's case 1 -> isn't one).
  const statement = Math.max(text.lastIndexOf(";", at - 1), text.lastIndexOf("{", at - 1), text.lastIndexOf("}", at - 1)) + 1;
  const sl = text.slice(statement, at);
  let lambda = [...sl.matchAll(/->/g)].some((m) => !SWITCH_ARROW.test(sl.slice(0, m.index + 2)));
  let inTry = /\btry\s*\([^()]*$/.test(sl);
  for (let open = blockAround(text, at); open >= 0; open = blockAround(text, open)) {
    const before = text.slice(Math.max(0, open - 1000), open);
    if (/->\s*$/.test(before) && !SWITCH_ARROW.test(before)) {
      lambda = true;
      continue;
    }
    if (blockKind(before) === "try") inTry = true;
    if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return null;
    const h = HEADER_END.exec(before);
    if (!h || NOT_A_METHOD.test(h[1])) continue;
    const head = before.slice(Math.max(before.lastIndexOf(";"), before.lastIndexOf("{"), before.lastIndexOf("}")) + 1);
    // A method of an anonymous class (new Runnable() { ... }) always replaces one of its parent's.
    const outer = blockAround(text, open);
    const anonymous = outer >= 0 && /\bnew\s+[\w$.]+(?:\s*<[^;{}()]*>)?\s*\([^;{}]*\)\s*$/.test(text.slice(Math.max(0, outer - 300), outer));
    return {
      name: h[1],
      header: head.replace(/@[\w$.]+(?:\s*\([^)]*\))?/g, " ").replace(/\s+/g, " ").trim(),
      constructor: !anonymous && h[1] === classAt(own, d.file, d.line)?.name,
      override: anonymous || /@(?:java\.lang\.)?Override\b/.test(head),
      lambda,
      inTry,
    };
  }
  return null;
}

/** Code outside any method: a field's value, or an initializer block (static { ... } or { ... }), and whether it's in a lambda there. */
type Outside = { place: "field" | "block"; isStatic: boolean; lambda: boolean };

const CLASS_BODY = /\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/;

/** Where javac's caret is when it's in no method (methodAround gave null), or null when the file can't be read or it's somewhere else. */
function outsideMethod(d: Diagnostic, own: OwnClasses): Outside | null {
  const where = caretIn(d, own);
  if (!where) return null;
  const { code: text, at } = where;
  const startOf = (k: number) => Math.max(text.lastIndexOf(";", k - 1), text.lastIndexOf("{", k - 1), text.lastIndexOf("}", k - 1)) + 1;
  const arrow = (from: number, to: number) => {
    const sl = text.slice(from, to);
    return [...sl.matchAll(/->/g)].some((m) => !SWITCH_ARROW.test(sl.slice(0, m.index + 2)));
  };
  let lambda = arrow(startOf(at), at);
  // The start of the code inside the class's body that holds the caret (a lambda's block, or the caret).
  let inner = at;
  for (let open = blockAround(text, at); open >= 0; open = blockAround(text, open)) {
    const before = text.slice(Math.max(0, open - 1000), open);
    if (CLASS_BODY.test(before)) return { place: "field", isStatic: /\bstatic\b/.test(text.slice(startOf(inner), inner)), lambda: lambda || arrow(startOf(inner), inner) };
    if (/->\s*$/.test(before) && !SWITCH_ARROW.test(before)) lambda = true;
    else if (/(?:^|[;{}])\s*(?:static\s*)?$/.test(before)) {
      const outer = blockAround(text, open);
      if (outer >= 0 && CLASS_BODY.test(text.slice(Math.max(0, outer - 1000), outer))) return { place: "block", isStatic: /\bstatic\s*$/.test(before), lambda };
    }
    inner = open;
  }
  return null;
}

/** What to do with a checked exception in code outside any method, where no header can say throws. */
function outsideNote(o: Outside, ex: string, cls: string | undefined, thrown: boolean, catchIt: string): string {
  const constructors = `add throws ${ex} to the header of each constructor${cls ? ` of ${cls}` : ""} (if there is none, write one)`;
  const unchecked = thrown ? " Or throw an unchecked exception instead, such as IllegalStateException, which needs no throws." : "";
  if (o.lambda) return `This code is inside a lambda (->), and a lambda can't pass a checked exception on. Catch it inside the lambda, with try { ... } catch (${ex} e) { ... }.${unchecked}`;
  if (o.place === "field" && o.isStatic) return `This code gives a static variable its value, outside any method, where nothing can pass ${ex} on, and a variable's value can't hold a try. Give the variable its value in a static block instead, static { ... }, with the code inside try { ... } catch (${ex} e) { ... }, or in a method.`;
  if (o.place === "field") return `This code gives an instance variable its value, outside any method, and a variable's value can't hold a try. Give the variable its value in a constructor instead, with the code inside try { ... } catch (${ex} e) { ... }. Or ${constructors}.`;
  if (o.isStatic) return `This code is in a static block (static { ... }), which runs as the class is set up, outside any method, where nothing can pass ${ex} on. Catch it there: ${catchIt}.${unchecked}`;
  return `This code is in an instance block ({ ... } in the class), which runs as each object is created, outside any method. Catch it there: ${catchIt}. Or ${constructors}.${unchecked}`;
}

/** The throws list of one of the program's own methods or constructors with this name, as written, or null. */
function declaredThrows(own: OwnClasses, name: string): string | null {
  const re = new RegExp(`\\b${name.replace(/\$/g, "\\$")}\\s*\\([^()]*\\)\\s*throws\\s+([\\w$.,\\s]+?)\\s*[{;]`);
  for (const lines of own.code.values()) {
    const m = re.exec(lines.join("\n"));
    if (m) return m[1].replace(/\s+/g, " ").trim();
  }
  return null;
}

/**
 * "add throws IOException to the header of main: public static void main(String[] args) throws
 * IOException". A header's throws list keeps its other exceptions, but not those that are kinds of
 * the new one (throws FileNotFoundException becomes throws IOException).
 */
function throwsFix(own: OwnClasses, m: Around, ex: string): string {
  const t = /^(.*?\))\s*throws\s+(.*)$/.exec(m.header);
  const kept = t ? t[2].split(/\s*,\s*/).filter((x) => !isKindOf(own, simple(x), ex)) : [];
  return `add throws ${ex} to the header of ${m.constructor ? `the constructor ${m.name}` : m.name}: ${t ? t[1] : m.header} throws ${[...kept, ex].join(", ")}`;
}

/** What passing an exception on with throws means for the method's callers. */
function passedOn(m: Around): string {
  if (m.name === "main" && !m.constructor) return " Then the program stops with the exception if it happens.";
  if (m.constructor) return ` Then the code that creates ${an(m.name)} with new must handle it in turn.`;
  return ` Then each call of ${m.name} must handle it in turn.`;
}

/** "unreported exception IOException; must be caught or declared to be thrown": what can throw it, and the two ways to handle it. */
function unreported(d: Diagnostic, own: OwnClasses): string | null {
  const full = /^unreported exception ([\w$.]+); must be caught or declared to be thrown/.exec(d.message)?.[1];
  const c = atCaret(d);
  if (!full || !c) return null;
  const ex = simple(full);
  const before = c.line.slice(0, c.line.length - c.at.length);
  const m = methodAround(d, own);
  const checked = `${ex} is a checked exception`;
  // A method that replaces one of a parent's can't add throws unless the parent's method has it.
  const cls = classAt(own, d.file, d.line);
  const parent = m && !m.constructor && cls ? ancestorsOf(own, cls.name).find((a) => declares(a, m.name, true)) : undefined;
  const replaces = !!m && !m.constructor && (m.override || !!parent);
  const theirs = parent ? `${m?.name} in ${parent.name}` : "that method";
  const replacing = `${m?.name} replaces the method ${m?.name} of ${parent?.name ?? "a parent class or an interface"}, so it can't pass ${ex} on with throws unless ${theirs} says throws ${ex} too.`;
  if (/^throw\b/.test(c.at)) {
    if (!m) {
      const o = outsideMethod(d, own);
      return o && `The throw here throws ${ex}, a checked exception. ${outsideNote(o, ex, cls?.name, true, `put the throw inside try { ... } catch (${ex} e) { ... }`)}`;
    }
    if (m.lambda) return `This throw is inside a lambda (->), and ${checked}, which a lambda can't pass on with throws. Catch it inside the lambda, or throw an unchecked exception instead, such as IllegalArgumentException.`;
    if (replaces) return `${m.name} throws ${ex} here, and ${checked}. But ${replacing} Throw an unchecked exception instead, such as IllegalArgumentException, which needs no throws${parent ? `, or add throws ${ex} to ${theirs} as well, and then to ${m.name} here` : ""}.`;
    const other = ex === "Exception" ? " Or throw an unchecked exception instead, which needs no throws, such as IllegalArgumentException for a value that isn't allowed." : "";
    return `${m.constructor ? `The constructor ${m.name}` : m.name} throws ${ex} here, and ${checked}: a method that throws one must say so in its header, so that the code calling it knows to handle it. So ${throwsFix(own, m, ex)}.${passedOn(m)}${other}`;
  }
  // What can throw it: a constructor (new Scanner(...)), a method (Files.readAllLines(...)), or super(...).
  const created = /^new\s+([\w$.]+)/.exec(c.at)?.[1];
  const called = c.at.startsWith("(") ? /(?:([\w$]+)\s*\.\s*)?([\w$]+)\s*$/.exec(before) : null;
  const self = /^(super|this)\s*\(/.exec(c.at)?.[1];
  const thing = created ? `new ${simple(created)}(...)` : called ? `${called[1] ? `${called[1]}.` : ""}${called[2]}(...)` : self ? `${self}(...)` : null;
  const header = created ? declaredThrows(own, simple(created)) : called ? declaredThrows(own, called[2]) : null;
  const says = header && header.split(/\s*,\s*/).map(simple).includes(ex) ? ` (its header says throws ${header})` : "";
  const intro = `${thing ?? "This"} can throw ${ex}${says}. That is a checked exception, so Java makes you handle it here.`;
  const catchIt = /\btry\s*\([^()]*$/.test(before) || m?.inTry ? `add catch (${ex} e) { ... } after the try's block` : `put this code inside try { ... } catch (${ex} e) { ... }`;
  if (!m) {
    const o = outsideMethod(d, own);
    return o ? `${intro} ${outsideNote(o, ex, cls?.name, false, catchIt)}` : `${intro} Either catch it: ${catchIt}. Or pass it on: add throws ${ex} to the header of the method this code is in.`;
  }
  if (m.lambda) return `${intro} This code is inside a lambda (->), and a lambda can't pass a checked exception on: throws on ${m.name} doesn't cover it. Catch it inside the lambda, with try { ... } catch (${ex} e) { ... }, or use a for loop instead, where throws works.`;
  if (replaces) return `${intro} ${replacing} So catch it here: ${catchIt}.${parent ? ` Or add throws ${ex} to ${theirs} as well, and then to ${m.name} here.` : ""}`;
  return `${intro} Either catch it: ${catchIt}. Or pass it on: ${throwsFix(own, m, ex)}.${passedOn(m)}`;
}

/** "unreported exception IOException ... exception thrown from implicit call to close() on resource variable 'writer'". */
function implicitClose(d: Diagnostic, own: OwnClasses): string | null {
  const full = /^unreported exception ([\w$.]+);/.exec(d.message)?.[1];
  if (!full) return null;
  const ex = simple(full);
  const v = /resource variable '([\w$]+)'/.exec(d.message)?.[1];
  const m = methodAround(d, own);
  return `A try with resources closes ${v ?? "its resource"} by itself at the end of its block, and closing it can throw ${ex}, a checked exception. Add catch (${ex} e) { ... } after the try's block (it also catches the ${ex} that the rest of the try can throw), or pass it on: ${m && !m.lambda ? throwsFix(own, m, ex) : `add throws ${ex} to the header of the method`}.`;
}

/** "exception IOException is never thrown in body of corresponding try statement". */
function neverThrown(d: Diagnostic): string | null {
  const full = /^exception ([\w$.]+) is never thrown in body of corresponding try statement/.exec(d.message)?.[1];
  if (!full) return null;
  const ex = simple(full);
  const example = /^(IOException|FileNotFoundException|NoSuchFileException)$/.test(ex) ? " (such as opening, reading or writing a file)" : "";
  return `Nothing in this try block can throw ${ex}, so this catch could never run, and Java doesn't allow a catch for a checked exception that can't happen. If the code that can throw ${ex}${example} is outside the try, move it into the try block. Otherwise, remove this catch.`;
}

/** The parents of exceptions the course uses, for telling which catch covers which. */
const EXCEPTION_PARENTS: Record<string, string> = {
  FileNotFoundException: "IOException",
  NoSuchFileException: "FileSystemException",
  FileSystemException: "IOException",
  EOFException: "IOException",
  IOException: "Exception",
  NumberFormatException: "IllegalArgumentException",
  IllegalArgumentException: "RuntimeException",
  IllegalStateException: "RuntimeException",
  InputMismatchException: "NoSuchElementException",
  NoSuchElementException: "RuntimeException",
  ArrayIndexOutOfBoundsException: "IndexOutOfBoundsException",
  StringIndexOutOfBoundsException: "IndexOutOfBoundsException",
  IndexOutOfBoundsException: "RuntimeException",
  ArithmeticException: "RuntimeException",
  NullPointerException: "RuntimeException",
  ClassCastException: "RuntimeException",
  UnsupportedOperationException: "RuntimeException",
  ConcurrentModificationException: "RuntimeException",
  UncheckedIOException: "RuntimeException",
  RuntimeException: "Exception",
  Exception: "Throwable",
  Error: "Throwable",
};

/** Whether exception `sub` is `sup` or a kind of it, through the parents above or the program's own classes. */
function isKindOf(own: OwnClasses, sub: string, sup: string): boolean {
  let t: string | undefined = sub;
  for (let n = 0; t && n < 20; n++) {
    if (t === sup) return true;
    const mine: OwnClass | undefined = typeNamed(own, t);
    t = mine ? mine.extends[0] : EXCEPTION_PARENTS[t];
  }
  return false;
}

/** The ( or { that the ) or } at `close` closes, or -1. */
function openerOf(text: string, close: number): number {
  const [o, c] = text[close] === ")" ? ["(", ")"] : ["{", "}"];
  let depth = 0;
  for (let k = close; k >= 0; k--) {
    if (text[k] === c) depth++;
    else if (text[k] === o && --depth === 0) return k;
  }
  return -1;
}

/**
 * The exceptions the catches before a catch catch, back to their try: `at` is javac's caret, on that
 * catch or on one of its types (in a multi-catch). Whole blocks are skipped, so a try inside an
 * earlier catch's block doesn't count. Null when the try isn't found. The code has no strings or comments.
 */
function catchesBefore(text: string, at: number): string[] | null {
  let pos = text.lastIndexOf("catch", at);
  if (pos < 0 || !/^(?:catch\s*\([^()]*)?$/.test(text.slice(pos, at))) return null;
  const types: string[] = [];
  for (;;) {
    // The block just before: a try's, or an earlier catch's.
    const end = text.slice(0, pos).trimEnd().length - 1;
    const open = text[end] === "}" ? openerOf(text, end) : -1;
    if (open < 0) return null;
    const head = text.slice(0, open).trimEnd();
    if (/\btry$/.test(head)) return types;
    const paren = head.endsWith(")") ? openerOf(text, head.length - 1) : -1;
    if (paren < 0) return null;
    const word = text.slice(0, paren).trimEnd();
    // try (resources) { ... }
    if (/\btry$/.test(word)) return types;
    if (!/\bcatch$/.test(word)) return null;
    const m = /^\s*(?:final\s+)?([\w$.|\s]+?)\s+[\w$]+\s*$/.exec(text.slice(paren + 1, head.length - 1));
    if (m) types.push(...m[1].split("|").map((t) => simple(t.trim())));
    pos = word.length - "catch".length;
  }
}

/** "exception FileNotFoundException has already been caught": an earlier catch of the same try covers it. */
function alreadyCaught(d: Diagnostic, own: OwnClasses): string | null {
  const full = /^exception ([\w$.]+) has already been caught/.exec(d.message)?.[1];
  if (!full) return null;
  const ex = simple(full);
  // The exceptions of the catches before this one, back to their try.
  const where = caretIn(d, own);
  const earlier = (where && catchesBefore(where.code, where.at)) ?? [];
  const parent = earlier.find((t) => t !== ex && isKindOf(own, ex, t));
  if (parent)
    return `The catch for ${parent} above already catches every ${ex}, since ${ex} is a kind of ${parent}, and Java uses the first catch that fits, so this one could never run. Put the catch for ${ex} before the one for ${parent} (the more specific catch first), or remove it.`;
  if (earlier.includes(ex)) return `A catch above, in the same try, already catches ${ex}, so this one could never run. Remove one of them.`;
  return `A catch above already catches ${ex}: a catch for a more general exception, such as Exception, catches ${ex} too, and Java uses the first catch that fits, so this one could never run. Put the catch for ${ex} first, or remove it.`;
}

/** "save(String) in FileSaver cannot implement save(String) in Saver; overridden method does not throw IOException". */
function overrideThrows(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$]+)\((.*?)\) in ([\w$.]+) cannot (implement|override) [\w$]+\(.*?\) in ([\w$.]+)\n\s*overridden method does not throw ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const [method, cls, parent, ex] = [m[1], simple(m[3]), simple(m[5]), simple(m[6])];
  const theirs = isInterface(own, parent) ? `the interface ${parent}` : parent;
  const change = knows(own, parent) ? ` Or, if every ${parent} may throw it, add throws ${ex} to ${method} in ${parent} too: then each call of ${method} on ${an(parent)} must handle it.` : "";
  return `${method} in ${cls} replaces the method ${method} of ${theirs}, which doesn't say throws ${ex}, and a method that replaces another can't throw a checked exception that the other doesn't: code that calls ${method} on ${an(parent)} wouldn't know it has to handle ${ex}. Catch ${ex} inside ${method} in ${cls}, with try { ... } catch (${ex} e) { ... }, and remove throws ${ex} from its header.${change}`;
}

/** "Alternatives in a multi-catch statement cannot be related by subclassing". */
function relatedAlternatives(d: Diagnostic): string | null {
  const m = /Alternative ([\w$.]+) is a subclass of alternative ([\w$.]+)/.exec(d.message);
  if (!m) return null;
  const [sub, sup] = [simple(m[1]), simple(m[2])];
  return `${sub} is a kind of ${sup}, so a catch for ${sup} catches it too, and a catch can't list both with |. Leave ${sub} out: catch (${sup} e). Or, to handle ${sub} in its own way, give it a catch of its own, before the one for ${sup}.`;
}

/** "incompatible types: String cannot be converted to Throwable": throw (or catch) with something that isn't an exception. */
function notThrowable(d: Diagnostic, own: OwnClasses): string | null {
  const from = /incompatible types: ([\w$.]+) cannot be converted to Throwable$/m.exec(d.message)?.[1];
  const c = atCaret(d);
  if (!from || !c) return null;
  const type = simple(from);
  const before = c.line.slice(0, c.line.length - c.at.length);
  if (/\bcatch\s*\(\s*(?:final\s+)?$/.test(before)) return `A catch names the exception it handles, such as catch (NumberFormatException e), and ${type} isn't an exception.`;
  if (!/^throw\b/.test(c.at)) return null;
  if (type === "String") return `throw needs an exception object, not text. Create one that carries the text as its message: throw new IllegalArgumentException("...");, or another exception that fits, such as IllegalStateException.`;
  if (knows(own, type)) return `${type} isn't an exception, so it can't be thrown: throw needs an object of a class that extends Exception. If ${type} is meant to be an exception, write class ${type} extends Exception (or extends RuntimeException, for one that needs no throws).`;
  return `A value of type ${type} isn't an exception, so it can't be thrown. throw needs an exception object, such as throw new IllegalArgumentException("...");`;
}

/** Classes of Java's own that the course creates with new. */
const LIBRARY_CLASSES = /^(?:Scanner|ArrayList|HashMap|HashSet|TreeMap|TreeSet|LinkedList|Random|File|FileWriter|PrintWriter|StringBuilder|Object|String)$/;

/** "cannot find symbol: method IllegalArgumentException(String)": a class's name called like a method, without new. */
function missingNew(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([A-Z][\w$]*)\((.*)\)/.exec(d.message);
  const c = atCaret(d);
  if (!m || !c || !c.at.startsWith(m[1])) return null;
  const name = m[1];
  const before = c.line.slice(0, c.line.length - c.at.length);
  if (/\.\s*$/.test(before) || !(knows(own, name) || /(?:Exception|Error)$/.test(name) || LIBRARY_CLASSES.test(name))) return null;
  const create = `new ${name}(${m[2] ? "..." : ""})`;
  const why = `Without new, Java reads ${name}(...) as a call of a method named ${name}, and there is none.`;
  // Person(name); on its own in a constructor of Person or of its child: meant to run that constructor.
  const alone = /^[\w$]+\s*\(([^;]*)\)\s*;/.exec(c.at);
  const cls = alone && !before.trim() && methodAround(d, own)?.constructor ? classAt(own, d.file, d.line) : undefined;
  if (alone && cls) {
    const args = alone[1].trim();
    const not = `not ${name}(${args}); (and not new ${name}(${args}), which would create a separate object). Java reads ${name}(...) as a call of a method named ${name}, and there is none.`;
    if (cls.name === name) return `To run another constructor of ${name} from this one, write this(${args}); as the constructor's first line, ${not}`;
    if (cls.kind === "class" && cls.extends[0] === name) return `To run ${name}'s constructor from ${cls.name}'s, write super(${args}); as the first line of ${cls.name}'s constructor, ${not}`;
  }
  if (/\bthrow\s+$/.test(before)) return `${name} is a class, and throw needs an object of it, which new creates: throw ${create}; ${why}`;
  return `${name} is a class: to create an object of it, write new in front, as in ${create}. ${why}`;
}

/** "unreachable statement" right after a throw, return, break or continue. */
function afterJump(d: Diagnostic, own: OwnClasses): string | null {
  const code = own.code.get(d.file);
  if (!code) return null;
  let k = d.line - 2;
  while (k >= 0 && !code[k].trim()) k--;
  if (k < 0 || !code[k].trim().endsWith(";")) return null;
  // The first line of that statement: the one after a line that ends a statement or a block.
  let s = k;
  while (s > 0 && !/[;{}]\s*$/.test(code[s - 1])) s--;
  const word = /^\s*(throw|return|break|continue)\b/.exec(code[s])?.[1];
  const move = `Move it above the ${word}, or remove it.`;
  if (word === "throw") return `The throw just before this line ends the method right there, the way return does (unless a catch around it catches the exception), so this line can never run. ${move}`;
  if (word === "return") return `The return just before this line ends the method, so this line can never run. ${move}`;
  if (word === "break") return `The break just before this line leaves the loop (or the switch) right away, so this line can never run. ${move}`;
  if (word === "continue") return `The continue just before this line jumps to the loop's next round right away, so this line can never run. ${move}`;
  return null;
}

/** Starting values for a variable created before a block, by its type. */
const START_VALUES: Record<string, string> = { int: "0", long: "0", short: "0", byte: "0", double: "0.0", float: "0.0f", boolean: "false", char: "' '", String: '""' };

/** Each kind of block: what to call it, and the statement to create a variable before. */
const BLOCKS: Record<string, [string, string]> = {
  try: ["try block", "try"],
  catch: ["catch block", "try"],
  if: ["if block", "if"],
  else: ["else block", "if"],
  for: ["for loop", "loop"],
  while: ["while loop", "loop"],
  do: ["do loop", "loop"],
  switch: ["switch", "switch"],
};

/** The statement a block belongs to, from the code before its {: try, catch, if, else, for, while, do or switch (null for others). */
function blockKind(before: string): string | null {
  if (/\b(try|else|do)\s*$/.test(before)) return /\b(try|else|do)\s*$/.exec(before)![1];
  if (!/\)\s*$/.test(before)) return null;
  // The word before the ( that the last ) closes.
  let depth = 0;
  for (let k = before.length - 1; k >= 0; k--) {
    if (before[k] === ")") depth++;
    else if (before[k] === "(" && --depth === 0) return /\b(catch|if|for|while|switch|try)\s*$/.exec(before.slice(0, k))?.[1] ?? null;
  }
  return null;
}

/** "cannot find symbol: variable e" where e belongs to a block that ended above: a catch's exception, a try's resource, or a variable created in a block. */
function outOfScope(d: Diagnostic, own: OwnClasses): string | null {
  const name = /symbol:\s+variable ([\w$]+)/.exec(d.message)?.[1];
  const where = caretIn(d, own);
  if (!name || !where) return null;
  const { code: text, at } = where;
  // A name after a dot (Suit.HEART, person.name) is a member of that type or object, not a local variable.
  if (!text.startsWith(name, at)) return null;
  const n = name.replace(/\$/g, "\\$");
  const TYPE = `(?:int|long|short|byte|double|float|boolean|char|var|[A-Z][\\w$.]*)(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*`;
  const decl = new RegExp(`\\bcatch\\s*\\(\\s*(?:final\\s+)?([\\w$.|\\s]+?)\\s+${n}\\s*\\)|\\btry\\s*\\(\\s*(?:final\\s+)?${TYPE}\\s+${n}\\s*=|(?<=[;{}(]\\s*)(?:final\\s+)?(${TYPE})\\s+${n}\\s*[=;:]`, "g");
  let last: RegExpExecArray | null = null;
  for (let m; (m = decl.exec(text)) && m.index < at; ) last = m;
  // Only a name of the same method: one of another method is simply unknown here.
  const body = last && methodBodyAround(text, last.index);
  if (!last || !body || body[1] < at) return null;
  const inFor = !last[1] && /\bfor\s*\(\s*$/.test(text.slice(Math.max(0, last.index - 20), last.index));
  // The block the name lives in: a catch's or a try's (or a for loop's) block comes after it; a variable's is around it.
  const open = last[1] || !last[2] || inFor ? text.indexOf("{", last.index + last[0].length) : blockAround(text, last.index);
  const close = open < 0 ? -1 : closeOf(text, open);
  if (close < 0 || close > at) return null;
  if (last[1]) {
    const type = last[1].replace(/\s+/g, " ").trim();
    return `${name} is the exception variable of the catch (${type} ${name}) above, and it exists only inside that catch block. Use it inside the block. If you need something from it later, save that (such as ${name}.getMessage()) in a variable created before the try.`;
  }
  if (!last[2]) return `${name} is the resource of the try (...) above, and it exists only inside that try's block, which also closes it at the end. Use ${name} inside the block.`;
  if (inFor) return `${name} was created in the header of the for loop above, so it exists only inside that loop. If you need its value after the loop, create a variable before the loop and store the value in it.`;
  const kind = blockKind(text.slice(Math.max(0, open - 1000), open));
  if (!kind || !BLOCKS[kind]) return null;
  const [block, start] = BLOCKS[kind];
  const type = last[2].replace(/\s+/g, "");
  const example = type === "var" ? "" : `, for example ${type} ${name} = ${START_VALUES[type] ?? "null"};,`;
  return `${name} was created inside the ${block} above, so it exists only until the } that ends it. Create it before the ${start} instead${example} and give it its value inside.`;
}

/** The program's packages: the ones its files' package lines and folders name. */
function ownPackages(own: OwnClasses): string[] {
  const all = new Set<string>();
  for (const file of own.lines.keys()) for (const p of [own.packages.get(file), packageOfPath(file) as string]) if (p) all.add(p);
  return [...all].sort();
}

/** "Main.java is in no package" or "library/logic/Loans.java is in the package library.logic". */
const inPackage = (own: OwnClasses, file: string) => (own.packages.get(file) ? `${file} is in the package ${own.packages.get(file)}` : `${file} is in no package`);

/** The own types declared at the top of their files (not inside another type). */
function topLevelTypes(own: OwnClasses): OwnClass[] {
  const all = [...own.types.values()];
  return all.filter((t) => !all.some((u) => u !== t && u.file === t.file && u.from <= t.from && t.to <= u.to && (u.from < t.from || t.to < u.to)));
}

/**
 * A file whose package line doesn't match its folders (javac doesn't report that itself), or null:
 * what the file has ("starts with package library;") and where it is, with the fix ("it is in the
 * folder library/domain/, so it must start with package library.domain;").
 */
function packageMismatch(own: OwnClasses, file: string): { has: string; fix: string } | null {
  const lines = own.lines.get(file);
  const said = lines ? (declaredPackage(lines.join("\n")) as string | null) : null;
  const folders = packageOfPath(file) as string;
  if (said == null || said === folders) return null;
  const has = said ? `starts with package ${said};` : "has no package line";
  if (!folders) return { has, fix: `it is at the top, in no folder, where a file has no package line. Remove the package line, or, if the class belongs in ${said}, give it a file in the folder ${said.replace(/\./g, "/")}/ instead` };
  return { has, fix: `it is in the folder ${folderOf(file)}, so it must start with package ${folders};` };
}

/** "cannot find symbol: class Bok", when the program has a class of a similar name, such as Book. */
function nearClass(own: OwnClasses, file: string, name: string, types: OwnClass[]): string | null {
  if (LIBRARY_PACKAGES[name]) return null;
  const lower = name.toLowerCase();
  const near = types.find((t) => t.name.toLowerCase() === lower) ?? types.find((t) => name.length >= 3 && editDistance(t.name.toLowerCase(), lower) <= (name.length > 6 ? 2 : 1));
  if (!near) return null;
  const imports = own.imports.get(file) ?? [];
  const seen = near.package === (own.packages.get(file) ?? "") || imports.includes(near.fullName) || imports.includes(`${near.package}.*`);
  const importIt = near.package && !seen ? ` ${near.name} is in the package ${near.package}, so this file also needs import ${near.fullName};` : "";
  return `The program has no class ${name}. Did you mean ${near.name}${near.package ? ` (in ${near.file})` : ""}? Check the spelling: upper and lower case matter.${importIt}`;
}

/** "cannot find symbol: class Book" in a file that doesn't see the program's own Book: another package, no import, or a package line that doesn't match its folders. */
function classElsewhere(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+class ([\w$]+)\n\s*location: (?:class|interface|enum|record) /.exec(d.message);
  if (!m) return null;
  const name = m[1];
  const here = own.packages.get(d.file) ?? "";
  const types = topLevelTypes(own);
  const same = types.filter((t) => t.name === name);
  // A file named after the class, whose class has another name.
  const named = [...own.lines.keys()].find((f) => fileName(f) === `${name}.java` && !same.some((t) => t.file === f));
  const other = named && types.find((t) => t.file === named);
  if (!same.length && other) return `There is a file ${named}, but the class in it is called ${other.name}, not ${name}. A class and its file must have the same name: rename one of them so they match.`;
  if (!same.length && named && own.code.has(named)) return `There is a file ${named}, but no class ${name} in it yet. Write the class there, and this error goes away.`;
  if (!same.length) return nearClass(own, d.file, name, types);
  for (const t of same) {
    const wrong = packageMismatch(own, t.file);
    if (wrong) return `There is a class ${name} in ${t.file}, but that file ${wrong.has}, and ${wrong.fix}. Java goes by the package line, so it doesn't find ${name} where this file looks for it (and it doesn't point at that line itself).`;
  }
  if (same.some((t) => t.package === here)) return null;
  const noPackage = same.find((t) => !t.package);
  if (noPackage) return here ? `${name} is in no package (its file ${noPackage.file} is at the top, without a package line), and a class in a package can't use a class in no package, not even with an import. Put ${name} in a package too: give it a file in a folder, starting with its package line, and import it here.` : null;
  const t = same[0];
  const line = `import ${t.fullName};`;
  // Without public, the import alone would lead to the next error: other packages can't use it.
  const pub = `public ${t.kind} ${name}`;
  const hidden = t.public
    ? ""
    : fileName(t.file) === `${name}.java`
      ? ` ${name} must be public too, since it's in another package: write ${pub} in ${t.file}.`
      : ` ${name} must be public too, since it's in another package, and a public ${t.kind} needs a file of its own name: move it to ${folderOf(t.file)}${name}.java, as ${pub}.`;
  const imports = own.imports.get(d.file) ?? [];
  const wrongImport = imports.find((i) => i.split(".").pop() === name);
  if (wrongImport) return `The line import ${wrongImport}; doesn't bring in ${name}: ${name} is in the package ${t.package} (the file ${t.file}). Change the import to ${line}${hidden}`;
  const star = imports.find((i) => i.endsWith(".*") && !same.some((s) => `${s.package}.*` === i) && !/^(java|javax)\./.test(i));
  const starNote = star ? ` The line import ${star}; brings in only the classes of the package ${star.slice(0, -2)} itself, not those of ${t.package}.` : "";
  const several = same.length > 1 ? ` There is a ${name} in ${list(same.map((s) => s.package))}: import the one you mean.` : "";
  return `${name} is in the package ${t.package} (the file ${t.file}), and ${inPackage(own, d.file)}, so it has to import ${name} to use it: add ${line} at the top of ${fileName(d.file)}${here ? ", after its package line" : ""}.${hidden}${starNote}${several}`;
}

/** "cannot find symbol: class Bok, location: package library.domain": an import or a full name that names no class of that package. */
function notInPackage(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+class ([\w$]+)\n\s*location: package ([\w$.]+)/.exec(d.message);
  if (!m) return null;
  const [, name, pkg] = m;
  const packages = ownPackages(own);
  const types = topLevelTypes(own);
  if (packages.includes(`${pkg}.${name}`)) {
    const one = types.find((t) => t.package === `${pkg}.${name}`);
    return `${pkg}.${name} is a package, not a class, and an import names a class. Import the classes you use one by one${one ? `, such as import ${one.fullName};` : ""}, or all the classes of the package at once: import ${pkg}.${name}.*;`;
  }
  const inImport = /^\s*import\b/.test(atCaret(d)?.line ?? "");
  const same = types.find((t) => t.name === name && t.package);
  if (same) return `${name} isn't in the package ${pkg}: it is in ${same.package} (the file ${same.file}), so its full name is ${same.fullName}.${inImport ? ` Write import ${same.fullName};` : ""}`;
  if (packages.includes(pkg)) {
    const names = types.filter((t) => t.package === pkg).map((t) => t.name);
    const lower = name.toLowerCase();
    const near = names.find((x) => x.toLowerCase() === lower) ?? names.find((x) => editDistance(x.toLowerCase(), lower) <= 2);
    return `The package ${pkg} (the folder ${pkg.replace(/\./g, "/")}/) has no class ${name}.${near ? ` Did you mean ${near}?` : ""}${names.length ? ` Its classes: ${list(names)}.` : ""} Upper and lower case matter.`;
  }
  const library = Object.keys(LIBRARY_PACKAGES).find((x) => LIBRARY_PACKAGES[x] === pkg && x.toLowerCase() === name.toLowerCase());
  if (library) return `The package ${pkg} has no class ${name}: its name is ${library}, and upper and lower case matter.${inImport ? ` Write import ${pkg}.${library};` : ""}`;
  return null;
}

/** "package libary.domain does not exist", for a program with packages of its own. */
function unknownPackage(d: Diagnostic, own: OwnClasses): string | null {
  const pkg = /^package ([\w$.]+) does not exist/.exec(d.message)?.[1];
  const packages = ownPackages(own);
  if (!pkg || !packages.length || /^(java|javax|jdk|org)\./.test(pkg)) return null;
  const near = packages.find((p) => p.toLowerCase() === pkg.toLowerCase()) ?? packages.find((p) => editDistance(p, pkg) <= 2);
  if (near) return `There is no package ${pkg}. Did you mean ${near} (the folder ${near.replace(/\./g, "/")}/)? Check the spelling: upper and lower case matter.`;
  const cls = topLevelTypes(own).find((t) => t.fullName === pkg);
  if (cls) return `${pkg} is a class, not a package: an import names a class, as in import ${pkg};`;
  if (!packages.some((p) => p.split(".")[0] === pkg.split(".")[0])) return null;
  return `There is no package ${pkg}. The program's packages are ${list(packages)}.`;
}

/** A getter for a variable of one of the program's classes: "such as getTitle()", or one to write ("" for a class of Java's own). */
function getterFor(t: OwnClass | undefined, name: string): string {
  if (!t) return "";
  const getter = `get${name[0].toUpperCase()}${name.slice(1)}`;
  if (declares(t, getter, true)) return `, such as ${getter}()`;
  const type = t.members.find((x) => x.name === name && !x.method)?.type;
  return `, for example a getter that you add to ${t.name}: public ${type ?? "..."} ${getter}() { return this.${name}; }`;
}

/** "Book is not public in library.domain" (a class) or "pages is not public in Book" (a member): package access, from another package. */
function notPublic(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$]+)(\(.*?\))? is not public in ([\w$.]+); cannot be accessed from outside package/.exec(d.message);
  if (!m) return null;
  const [, name, parens, owner] = m;
  const here = inPackage(own, d.file);
  const asClass = typeNamed(own, `${owner}.${name}`);
  if (!parens && (asClass || (!knows(own, owner) && /^[a-z]/.test(owner)))) {
    const kind = asClass?.kind ?? "class";
    return `${name} is declared without public (${kind} ${name}, not public ${kind} ${name})${asClass ? ` in ${asClass.file}` : ""}, so only the classes of its own package, ${owner}, can use it, and ${here}. Write public ${kind} ${name} to let other packages use it.`;
  }
  const cls = simple(owner);
  const t = typeNamed(own, owner, d.file) ?? typeNamed(own, cls, d.file);
  const pkg = t?.package || (owner.includes(".") ? owner.slice(0, owner.lastIndexOf(".")) : "");
  const only = `only code in ${cls}'s own package${pkg ? `, ${pkg},` : ""}`;
  const none = "(no public, protected or private)";
  if (parens && name === cls) return `The constructor ${name}(${spaced(parens.slice(1, -1))}) has no access word ${none}, so ${only} can create ${an(cls)} with it, and ${here}. Write public in front of the constructor in ${cls}: public ${name}(...).`;
  const inside = classAt(own, d.file, d.line);
  const sub = !!inside && inside.name !== cls && isSubtype(own, inside.name, cls);
  const notEven = sub ? ` Not even ${inside!.name}, which extends ${cls}: from another package, a subclass can use only what is public or protected.` : "";
  if (parens) return `${name}() has no access word in ${cls} ${none}, so ${only} can call it, and ${here}.${notEven} If other packages should call it, write public in front of it in ${cls}${sub ? " (or protected, for subclasses only)" : ""}.`;
  return `${name} has no access word in ${cls} ${none}, so ${only} can use it, and ${here}.${notEven} Use a public method of ${cls} instead${getterFor(t, name)}.${sub ? ` Or make ${name} protected in ${cls}, so that the classes that extend it can use it.` : ""}`;
}

/** "describe() has protected access in Book" or "title has private access in Book" (a private member of a parent is privateInParent's). */
function accessDenied(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$]+)(\(.*?\))? has (private|protected) access in ([\w$.]+)$/.exec(d.message);
  if (!m) return null;
  const [, name, parens, access, owner] = m;
  const cls = simple(owner);
  const t = typeNamed(own, owner, d.file) ?? typeNamed(own, cls, d.file);
  const constructor = !!parens && name === cls;
  const what = constructor ? `The constructor of ${cls}` : parens ? `${name}()` : name;
  const use = parens ? "call it" : "use it";
  if (access === "private") {
    if (constructor) return `The constructor of ${cls} is private, so only code inside ${cls} can create ${an(cls)} with it. Make the constructor public if other classes should create ${cls} objects.`;
    if (parens) return `${what} is private in ${cls}, so only code inside ${cls} can call it. If other classes should call it, make it public in ${cls}.`;
    // list.size, which means the method list.size().
    const method = !t && /^(size|length)$/.test(name) ? `, here ${name}(), with its parentheses` : "";
    return `${what} is private in ${cls}, so only code inside ${cls} can use it. Use a public method of ${cls} instead${getterFor(t, name) || method}.`;
  }
  const pkg = t?.package || (owner.includes(".") ? owner.slice(0, owner.lastIndexOf(".")) : "");
  const inside = classAt(own, d.file, d.line);
  if (inside && !constructor && inside.name !== cls && isSubtype(own, inside.name, cls)) {
    const self = parens ? `${name}() or this.${name}()` : `${name} or this.${name}`;
    return `${what} is protected in ${cls}: from another package, only the classes that extend ${cls} can use it, and only on their own objects. ${inside.name} extends ${cls}, so it can use it on itself (${self}), but not on another ${cls} object, as here. If any code may ${use}, make it public in ${cls}.`;
  }
  const inPkg = `code in ${cls}'s own package${pkg ? `, ${pkg},` : ""}`;
  const createWith = `If other code should create ${cls} objects with new, make the constructor public in ${cls}.`;
  if (constructor && inside && inside.name !== cls && isSubtype(own, inside.name, cls))
    return `The constructor of ${cls} is protected. From another package, a class that extends ${cls}, as ${inside.name} does, can run it with super(...) in its own constructors, but can't create ${an(cls)} with new ${cls}(...), as here. ${createWith}`;
  if (constructor) return `The constructor of ${cls} is protected, so only ${inPkg} can create ${an(cls)} with it (the classes that extend ${cls} can run it with super(...) in their constructors), and ${inside ? inside.name : "this code"} is outside that package. ${createWith}`;
  return `${what} is protected in ${cls}, so only code in ${cls}'s own package${pkg ? `, ${pkg},` : ""} and in the classes that extend ${cls} can ${use}, and ${inside ? inside.name : "this code"} is neither. If other code should ${use}, make it public in ${cls}.`;
}

/** "cannot access Book: bad source file: library/domain/Book.java, file does not contain class library.domain.Book". */
function badSourceFile(d: Diagnostic, own: OwnClasses): string | null {
  const m = /bad source file: (?:\.\/)?(\S+)\n\s*file does not contain class ([\w$.]+)/.exec(d.message);
  if (!m) return null;
  const [, path, full] = m;
  const cls = simple(full);
  const declared = topLevelTypes(own).filter((t) => t.file === path);
  // A file to write the class in, still without it (as a challenge may give it).
  if (!declared.length && own.code.has(path)) {
    const folders = packageOfPath(path) as string;
    return `Java looks for ${full} in ${path}, but there is no class ${cls} in that file yet. Write it there: ${folders ? `the file starts with package ${folders};, and then comes ` : ""}public class ${cls} { ... }`;
  }
  const wrong = packageMismatch(own, path);
  if (wrong) return `Java looks for ${full} in ${path}, but that file ${wrong.has}, and ${wrong.fix}. (Java doesn't point at that line itself.)`;
  if (declared.length && !declared.some((t) => t.name === cls))
    return `Java looks for the class ${cls} in ${path}, the file named after it, but the class in that file is called ${declared[0].name}. A class and its file must have the same name: rename one of them so they match.`;
  return null;
}

/** "duplicate class: library.Book": two classes of one name in a package, or a file whose package line doesn't match its folders (Java then reads it twice). */
function duplicateClass(d: Diagnostic, own: OwnClasses): string | null {
  const full = /^duplicate class: ([\w$.]+)/.exec(d.message)?.[1];
  if (!full) return null;
  const wrong = packageMismatch(own, d.file);
  if (wrong) return `${d.file} ${wrong.has}, but ${wrong.fix}. (Because they don't match, Java reads the file twice, and so it says duplicate class.)`;
  const name = simple(full);
  const files = topLevelTypes(own).filter((t) => t.name === name && t.package === (own.packages.get(d.file) ?? "")).map((t) => t.file);
  return `There are two classes called ${name}${files.length > 1 ? `, in ${list([...new Set(files)])}` : ""}, and each class of a package needs a name of its own. Remove one of them, or rename it.`;
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
  /** The explanation names the file, line and method itself (an exception the learner's code threw). */
  placed?: boolean;
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

/** A StringBuilder's index error: `method` is the StringBuilder method the program called, such as insert or deleteCharAt. */
function stringBuilderIndex(m: string, method: string): string | null {
  const one = /^Index (-?\d+) out of bounds for length (\d+)$/.exec(m);
  if (one) {
    const [i, n] = [Number(one[1]), Number(one[2])];
    if (n === 0) return `The program called ${method}(${i}) on an empty StringBuilder, which has no characters.`;
    const hint = i === n ? ` Index ${n} is one past the end.` : i < 0 ? " Indexes start at 0, so a negative index never works." : "";
    return `The program called ${method}(${i}) on a StringBuilder of ${plural(n, "character", "characters")}, whose indexes go from 0 to ${n - 1}.${hint}`;
  }
  const range = /^Range \[(-?\d+), (-?\d+)\) out of bounds for length (\d+)$/.exec(m);
  if (!range) return null;
  const [a, n] = [range[1], Number(range[3])];
  if (method === "insert") return `The program called insert(${a}, ...) on a StringBuilder of ${plural(n, "character", "characters")}. insert can put text at an index from 0 to ${n} (${n} adds it at the end).`;
  return `The program called ${method}(${a}, ...) on a StringBuilder of ${plural(n, "character", "characters")}. The start index must be from 0 to ${n}, and not larger than the end index.`;
}

function explainStringIndex(m: string, _library = false, frames: string[] = []): string {
  // The outermost StringBuilder method in Java's own frames is the one the program called.
  const builder = frames.map((f) => /^java\.lang\.StringBuilder\.(\w+)$/.exec(f)?.[1]).filter((x) => x != null).pop();
  const inBuilder = builder ? stringBuilderIndex(m, builder) : null;
  if (inBuilder) return inBuilder;
  const plain = outOfBounds(m, "string");
  if (plain) return plain;
  const r = /^Range \[(-?\d+), (-?\d+)\) out of bounds for length (\d+)$/.exec(m) ?? /^begin (-?\d+), end (-?\d+), length (\d+)$/.exec(m);
  if (r) return `The program asked for a part of a string of length ${r[3]}, from index ${r[1]} up to ${r[2]}. With substring, both indexes must be between 0 and ${r[3]}, and the first can't be larger than the second.`;
  return `The program used an index that isn't inside the string. ${m}. A string's indexes go from 0 to length() - 1.`;
}

/** A stack frame in one of the learner's files: its class (with its package, as the frame writes it), method, file path and line. */
type Frame = { cls: string; method: string; file: string; line: number };

/** What an exception's explanation can use besides its message. */
type CrashContext = {
  /** Its full class name, such as java.lang.IllegalArgumentException. */
  exception: string;
  /** Thrown in Java's own code: its first stack frame isn't in one of the learner's files (see explainCast). */
  library: boolean;
  /** Its stack frames in the learner's files, innermost first. */
  frames: Frame[];
  /** All its stack frames as printed, such as java.base/java.io.FileOutputStream.open(FileOutputStream.java:289), innermost first. */
  stack: string[];
  /** The methods of Java's own it went through before the learner's code, innermost first (such as java.util.ArrayList$Itr.remove). */
  javaFrames: string[];
  /** The lines of its message after the first (a PatternSyntaxException's show the pattern). */
  more: string[];
  /** The first method in the learner's code, which called the outermost of javaFrames (such as Main$Suit.valueOf). */
  caller?: string;
  /** When it's the innermost cause ("Caused by:") of the exception that stopped the program: that one's name, and the name of the one it's the cause of. */
  cause?: Wrapped;
};

type Wrapped = {
  /** The exception it's the cause of: the head just before its "Caused by:" (RuntimeException, ExceptionInInitializerError). */
  wrapper: string;
  /** Whether the wrapper's first stack frame is in the learner's files (their code threw it). */
  ownWrapper: boolean;
  /** The exception that stopped the program, the outermost (the same as wrapper in a chain of two). */
  outer: string;
};

/** How a cause stopped the program: wrapped in another exception, which nothing caught. */
function wrappedIn(c: CrashContext): string {
  const w = c.cause!;
  const stopped = w.outer === w.wrapper ? ", and nothing caught that, so the program stopped." : `, in turn the cause of ${w.outer}, and nothing caught ${w.outer}, so the program stopped.`;
  if (w.wrapper === "ExceptionInInitializerError") {
    const cls = c.frames.find((f) => f.method === "<clinit>");
    return ` This happened while Java set up ${cls ? `the class ${binarySimple(cls.cls)}` : "a class"} (its static variables and static blocks), so Java threw ExceptionInInitializerError with it as its cause${stopped}`;
  }
  return ` ${w.ownWrapper ? "Your code" : "A method of Java's own"} then threw ${w.wrapper} with it as its cause${stopped}`;
}

/** A frame's method in words: setPrice, main, "the constructor of Person". */
function methodLabel(f: Frame): string {
  if (f.method === "<init>") return `the constructor of ${binarySimple(f.cls)}`;
  if (f.method === "<clinit>") return `the static part of ${binarySimple(f.cls)}`;
  return f.method.startsWith("lambda$") ? f.method.split("$")[1] : f.method;
}

/** A frame's place: "Main.java, line 5". */
const placeOf = (f: Frame) => `${f.file}, line ${f.line}`;

/** A message quoted at the end of a sentence, with a full stop unless it has one. */
const sentence = (m: string) => (/[.!?]$/.test(m) ? m : `${m}.`);

/** IllegalArgumentException or IllegalStateException: thrown on purpose by the learner's code (throw), or by a method of Java's own. */
function refused(m: string, c: CrashContext): string {
  const short = c.exception.split(".").pop()!;
  const state = short === "IllegalStateException";
  if (c.library || !c.frames.length) {
    if (state && m === "Scanner closed") return "The program used a Scanner after closing it with close(). A closed Scanner can't read any more, and closing a Scanner of System.in closes the input too: close it only when the program has read everything, or not at all.";
    if (state) return `A method of Java's own, called on this line, refused to run: the object isn't in a state where it can${m ? `. Its message: ${sentence(m)}` : "."}`;
    return `A method of Java's own, called on this line, refused a value it was given${m ? `: ${sentence(m)}` : "."} Check the values the call passes.`;
  }
  const [thrower] = c.frames;
  const who = methodLabel(thrower);
  // The method that called it (for a lambda, the method it's in doesn't count).
  const caller = c.frames.slice(1).find((f) => !(thrower.method.startsWith("lambda$") && f.method === who));
  // The crash's note starts with the exception's name (see describeRun), so "it" is clear.
  const intro = `Your own code threw it on purpose, with the throw in ${who} (${placeOf(thrower)})`;
  const why = m ? ` Its message says why: ${sentence(m)}` : "";
  // A cause was wrapped in another exception: the code around the call already handled it that way.
  const wrapped = c.cause ? wrappedIn(c) : "";
  const handle = c.cause ? "." : ` or, if that can happen, handle it where the call is: try { ... } catch (${short} e) { ... }.`;
  if (!caller) return c.cause ? `${intro}.${why}${wrapped}` : `${intro}, and nothing caught it, so the program stopped.${why}`;
  const call = `the call in ${methodLabel(caller)} (${placeOf(caller)})`;
  if (state) return `${intro}: ${who} refuses to run while the object is in its current state, and ${call} came at such a time.${why}${wrapped} Check the object's state before that call${c.cause ? "" : ","}${handle}`;
  return `${intro}: ${who} refuses a value it was given, and ${call} passed it.${why}${wrapped} Pass a value it accepts there${c.cause ? "" : ","}${handle}`;
}

/** FileNotFoundException or NoSuchFileException: a file to read that isn't there, or a file to write into a folder that isn't there. */
function missingFile(m: string, c: CrashContext): string {
  const noSuch = c.exception.endsWith("NoSuchFileException");
  const name = noSuch ? m : /^(.*) \(No such file or directory\)$/.exec(m)?.[1];
  if (!name) return `The program couldn't open a file: ${sentence(m)}`;
  const writing = c.stack.some((f) => /\bjava\.io\.FileOutputStream\.|\bjava\.nio\.file\.Files\.(?:newOutputStream|newBufferedWriter|write)/.test(f));
  // ./app.log is in the program's own folder, which exists.
  const path = name.replace(/^(?:\.\/)+/, "");
  const slash = path.lastIndexOf("/");
  const folder = path.slice(0, Math.max(slash, 0));
  const create = `Files.createDirectories(Path.of("${folder}")); creates it (and any folders on the way), and does nothing if it exists already`;
  // Files.write and friends with options that leave out CREATE (APPEND alone) fail the same way on
  // a file that doesn't exist yet; FileOutputStream (PrintWriter, FileWriter) always creates the file.
  const options = "it was opened with options that leave out StandardOpenOption.CREATE (such as APPEND on its own), which work only on a file that exists. Add StandardOpenOption.CREATE too: it creates the file when it's missing";
  if (writing && slash > 0 && noSuch) return `The program tried to write the file ${name}, but couldn't. Either the folder ${folder} doesn't exist, and writing a file doesn't create its folder: ${create}. Or the file doesn't exist yet, and ${options}.`;
  if (writing && slash > 0) return `The program tried to write the file ${name}, but the folder ${folder} doesn't exist, and writing a file doesn't create its folder. Create the folder first: ${create}.`;
  if (writing && noSuch) return `The program tried to write the file ${name}, but there is no such file yet, and ${options}.`;
  if (writing) return `The program couldn't create the file ${name}: ${sentence(m)}`;
  return `The program tried to open a file that doesn't exist: ${name}. Check the file's name, upper and lower case included, and its folder.`;
}

/** An empty Optional's value asked for: "No value present". `frames` name the Optional method, such as java.util.OptionalDouble.getAsDouble. */
function emptyOptional(frames: string[]): string {
  const [, type = "Optional", method = "get"] = /^java\.util\.(Optional\w*)\.(\w+)$/.exec(frames.find((f) => f.startsWith("java.util.Optional")) ?? "") ?? [];
  // The type of the value isn't in the stack trace, so a plain Optional's example can't be one of the right type.
  const [steps, example] =
    type === "OptionalDouble"
      ? ["average(), max(), min() and findFirst()", ", as in average().orElse(0)"]
      : type === "Optional"
        ? ["findFirst(), max(...), min(...) and reduce(...) without a start value", '. Put a value of the type the stream holds in them, such as orElse(0) for numbers or orElse("none") for text']
        : ["max(), min(), findFirst() and reduce(...) without a start value", ", as in max().orElse(0)"];
  return `The program took the value out of an empty ${type} with ${method}(): there was none ("No value present"). ${steps} give an empty one when the stream has no values, for example when the list is empty or filter let nothing through. Check with isPresent() first, or use orElse(...), which gives the value in its parentheses instead${example}.`;
}

/** A method of Java's own as a learner would write it: Collections.max for java.util.Collections.max. */
const javaMethod = (frame: string) => frame.replace(/^(?:[a-z_][\w]*\.)+/, "");

function explainNoSuchElement(m: string, _library: boolean, frames: string[]): string {
  if (/No line found/.test(m)) return "The program asked for more input than it was given: it read another line after the input ran out.";
  if (m === "No value present") return emptyOptional(frames);
  if (frames.some((f) => f.startsWith("java.util.Scanner."))) return "The program asked for more input than it was given: it read another value after the input ran out.";
  const iterator = frames.map((f) => /\$\w*(?:Itr|Iterator)\.next\w*$/.test(f)).lastIndexOf(true);
  if (iterator >= 0) {
    // The program's own next() is the outermost frame (also that of a wrapper's iterator, such as Collections$UnmodifiableCollection$1.next).
    if (/\.next\w*$/.test(frames[frames.length - 1]))
      return "The program called next() on an iterator that had already given every element, so there was no next one. Call next() only when hasNext() is true, and only once in each round of a while (it.hasNext()) loop: keep the element it gives in a variable if you need it more than once.";
    // Otherwise a method the program called went through an empty collection, such as Collections.max: the first frame outside the iterators' classes.
    const called = frames.slice(iterator + 1).find((f) => !f.slice(0, f.lastIndexOf(".")).includes("$"));
    if (called) return `The program called ${javaMethod(called)}(...) on an empty collection, so there was no element to give. Check isEmpty() first.`;
  }
  const empty = frames.map((f) => /\.(getFirst|getLast|removeFirst|removeLast|first|last|firstKey|lastKey|element|pop|remove)$/.exec(f)?.[1]).filter((x) => x != null).pop();
  if (empty) return `The program called ${empty}() on an empty collection, so there was no element to give. Check isEmpty() first.`;
  return "The program asked for the next element, but there wasn't one.";
}

/**
 * The enum and the text of "No enum constant Main.Suit.hearts": Suit and hearts. The text can have
 * dots of its own, so the enum's name comes from the stack frame of its valueOf, the caller of
 * java.lang.Enum.valueOf (Main$Suit.valueOf, whose name in the message is Main.Suit, just as long).
 * An enum declared inside a method has no such name: the message says null.hearts.
 */
function enumValueText(m: string, frames: string[], caller?: string): [string, string] | null {
  if (!m.startsWith("No enum constant ")) return null;
  const rest = m.slice("No enum constant ".length);
  const cls = frames[frames.length - 1] === "java.lang.Enum.valueOf" ? /^([\w$.]+)\.valueOf$/.exec(caller ?? "")?.[1] : undefined;
  if (cls) {
    const local = /\$\d+([\w$]+)$/.exec(cls)?.[1];
    if (local && rest.startsWith("null.")) return [local, rest.slice("null.".length)];
    const written = rest.slice(0, cls.length);
    if (rest[cls.length] === "." && written.replace(/\$/g, ".") === cls.replace(/\$/g, ".")) return [written.split(".").pop()!, rest.slice(cls.length + 1)];
  }
  const plain = /^([\w$.]+)\.([^.]*)$/.exec(rest);
  return plain ? [binarySimple(plain[1]), plain[2]] : null;
}

/** IllegalStateException and IllegalArgumentException, thrown by the program itself or by one of Java's methods. */
function explainIllegal(m: string, c: CrashContext): string {
  if (/^stream has already been operated upon or closed/.test(m))
    return "A stream can be used only once: after a step such as count(), forEach or collect has gone through it, it's used up, and the program used the same stream again. Make a new stream for each use, with list.stream() again, instead of keeping one in a variable.";
  if (!m && c.javaFrames.some((f) => /\$\w*(?:Itr|Iterator)\.remove$/.test(f)))
    return "The program called remove() on an iterator without calling next() first (or called it twice after one next()). remove() removes the element that the last next() gave, so each remove() needs its own next() before it: while (it.hasNext()) { int number = it.next(); if (number < 0) { it.remove(); } }";
  const constant = enumValueText(m, c.javaFrames, c.caller);
  if (constant) {
    const [e, name] = constant;
    const hint = !name.trim()
      ? " The text was empty."
      : name.trim() !== name
        ? ` The text has spaces around it: trim() removes them, as in ${e}.valueOf(text.trim()).`
        : name.toUpperCase() !== name
          ? ` If the text comes from input, change it to capitals first: ${e}.valueOf(text.toUpperCase()).`
          : "";
    return `${e}.valueOf gives the constant whose name it gets, and ${e} has no constant named "${name}": the name must match exactly, capital letters included.${hint}`;
  }
  if (/^Comparison method violates its general contract/.test(m))
    return "Sorting found that the program's compareTo or Comparator gives answers that contradict each other, such as that a comes before b and also that b comes before a. It must give a negative number when the first comes first, 0 when they're equal and a positive number when the second comes first, the same way every time. For numbers, Integer.compare(first, second) or Double.compare(first, second) does that.";
  // Otherwise the program's own throw, or a method of Java's own that refused a value or its object's state.
  return refused(m, c);
}

/** Why a regular expression doesn't compile, from the description in a PatternSyntaxException's message. */
function regexProblem(description: string): string {
  const dangling = /^Dangling meta character '(.)'/.exec(description);
  if (dangling) {
    const x = dangling[1];
    const does = x === "?" ? `? makes the part before it optional, and nothing that can be made optional` : `${x} means "repeat the part before it", and nothing that can be repeated`;
    return `${does} comes before it. To match a plain ${x}, put two backslashes in front of it in Java code, "\\\\${x}", or put it in brackets, "[${x}]".`;
  }
  if (/^Unclosed character class/.test(description)) return `[ starts a set of characters, such as [a-z], and there is no ] to end it. Add the ]. To match a plain [, write "\\\\[".`;
  if (/^Unclosed group/.test(description)) return `( starts a group, and there is no ) to end it. Add the ). To match a plain (, write "\\\\(".`;
  if (/^Unmatched closing '\)'/.test(description)) return `) ends a group, but no ( started one. Remove it, or, to match a plain ), write "\\\\)".`;
  if (/^Illegal repetition range/.test(description)) return "a count of repeats, such as {2,4}, must go from the smaller number to the larger one.";
  if (/^Illegal repetition/.test(description)) return `{ starts a count of repeats, such as {3} or {2,4}, and what follows it isn't one. To match a plain {, write "\\\\{".`;
  if (/^Illegal\/unsupported escape sequence/.test(description)) return `a backslash followed by this character means nothing in a regular expression. Check it: "\\\\d" is a digit, "\\\\s" a space and "\\\\w" a letter, digit or _ (with two backslashes in Java code).`;
  if (/^Illegal character range/.test(description)) return "a range in [ ] goes from one character to another, as in [a-z], and this one runs backwards or has no end. Check its order. To match a plain -, put it first or last in the brackets, as in [a-z-].";
  if (/^Unescaped trailing backslash/.test(description)) return `it ends with a backslash that has nothing after it. To match a plain backslash, write four in Java code: "\\\\\\\\".`;
  return `${description}. Characters such as . * + ? [ ] ( ) { } | and \\ have special meanings in a regular expression. To match one as a plain character, put two backslashes in front of it in Java code, as in "\\\\.".`;
}

/** PatternSyntaxException: "Unclosed character class near index 3", with the pattern (and a caret) on the lines after it. */
function explainRegex(m: string, _library: boolean, frames: string[], more: string[]): string {
  const [, description, index] = /^(.*?)(?: near index (-?\d+))?$/.exec(m) ?? [];
  const pattern = more[0];
  const used = frames.map((f) => /^java\.lang\.String\.(split|matches|replaceAll|replaceFirst)$/.exec(f)?.[1]).find((x) => x != null);
  // The pattern as Java reads it, without quotes; the suggestions are Java code, where each backslash is written twice.
  const source = pattern?.includes("\\") ? ` (written "${pattern.replace(/[\\"]/g, "\\$&")}" in Java code)` : "";
  const which = pattern != null ? `the pattern ${pattern}${source}` : "the one the program gave";
  const intro = used
    ? `${used}(...) reads its first text as a regular expression, and ${which} isn't a valid one`
    : pattern != null
      ? `The regular expression ${pattern}${source} isn't valid`
      : "The regular expression the program gave isn't valid";
  const at = index != null ? ` (the problem is at index ${index}, counting from 0)` : "";
  return `${intro}${at}: ${regexProblem(description || m)}`;
}

function explainConcurrent(_m: string, _library: boolean, frames: string[]): string {
  if (frames.some((f) => /^java\.util\.(?:Linked)?(?:HashMap|TreeMap)\b/.test(f)))
    return "The program added to or removed from a map or a set while a loop was going through it. Collect the changes and make them after the loop. To remove elements while going through them, use an Iterator: its remove() removes the element that next() gave last.";
  return "The program added to or removed from a list while a for-each loop was going through it. Loop over the indexes instead (going backwards when removing), or collect the changes and make them after the loop. To remove elements while going through the list, use an Iterator: its remove() removes the element that next() gave last.";
}

/** Each exception's explanation, from its message and what else is known about it (see CrashContext). */
const EXCEPTIONS: [RegExp, (message: string, c: CrashContext) => string][] = [
  [/ArithmeticException$/, (m) => (/by zero/.test(m) ? "The program divided a whole number by zero (or took % 0)." : "A calculation failed.")],
  [/ArrayIndexOutOfBoundsException$/, (m) => outOfBounds(m, "array") ?? `The program used an array index that doesn't exist. ${m}. Indexes go from 0 to length - 1.`],
  [/StringIndexOutOfBoundsException$/, (m, c) => explainStringIndex(m, c.library, c.javaFrames)],
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
  [/NoSuchElementException$/, (m, c) => explainNoSuchElement(m, c.library, c.javaFrames)],
  [/ClassCastException$/, (m, c) => explainCast(m, c.library)],
  [/ConcurrentModificationException$/, (m, c) => explainConcurrent(m, c.library, c.javaFrames)],
  [/PatternSyntaxException$/, (m, c) => explainRegex(m, c.library, c.javaFrames, c.more)],
  [/StackOverflowError$/, () => "A method kept calling itself (or methods kept calling each other) without stopping, until the call stack ran out of room. Check the stopping condition of the recursion."],
  [/OutOfMemoryError$/, () => "The program used up all its memory, for example by adding to a list forever."],
  [/UnsupportedOperationException$/, () => "This collection can't be changed (lists from List.of(...), Arrays.asList(...) and a stream's toList() are fixed). Copy it into a new ArrayList<>(...) first."],
  [/FileNotFoundException$|NoSuchFileException$/, missingFile],
  [
    /FileAlreadyExistsException$/,
    (m, c) =>
      c.stack.some((f) => /\bjava\.nio\.file\.Files\.createDirectory\(/.test(f))
        ? `The program tried to create the folder ${m}, but it exists already, and Files.createDirectory fails then. Use Files.createDirectories instead: it creates the folder only when it's missing.`
        : `The program tried to create ${m}, but it exists already. Check with Files.exists(...) first, or write the file with Files.writeString, which replaces a file that exists.`,
  ],
  [/NegativeArraySizeException$/, () => "The program tried to create an array with a negative size."],
  [/ArrayStoreException$/, () => "The program put an object of the wrong type into an array."],
  [/ExceptionInInitializerError$/, () => "Setting up a class failed: code in a static field or static block threw an exception."],
  [/IllegalArgumentException$|IllegalStateException$/, explainIllegal],
];

/** An exception without an explanation of its own: one the learner's code threw (such as their own exception class), or another one. */
function uncaught(short: string, m: string, c: CrashContext): string {
  const [thrower, caller] = c.frames;
  if (c.library || !thrower) return `The program stopped with ${short}${m ? ": " + m : ""}.`;
  const message = m ? ` Its message: ${sentence(m)}` : "";
  if (c.cause) return `Your own code threw it in ${methodLabel(thrower)} (${placeOf(thrower)}).${message}${wrappedIn(c)}`;
  const handle = caller ? ` To handle it, put the call in ${methodLabel(caller)} (${placeOf(caller)}) inside try { ... } catch (${short} e) { ... }.` : "";
  return `Your own code threw it in ${methodLabel(thrower)} (${placeOf(thrower)}), and nothing caught it, so the program stopped.${message}${handle}`;
}

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
    (m) => ({ exception: "no main class", message: "", line: null, method: null, explanation: `There is no class called ${m[1]} to start. The class with main must be named ${m[1]} (and the file ${m[1].split(".").pop()}.java).${m[1].includes(".") ? "" : ` It is in no package: if ${m[1]}.java starts with a package line, remove it.`}` }),
  ],
];

/**
 * Reads an uncaught exception (or a launcher error, such as a missing main method) from a Java
 * program's stderr and explains it, or null if there is none. `sourceFiles` are the learner's
 * files ("Main.java", "library/domain/Book.java"): the reported line is the first stack frame in
 * one of them, and `file` is its path. When the exception has a cause ("Caused by:"), the
 * innermost cause is explained.
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
  // The learner's file a stack frame is in. A frame names only the file's name (Book.java); the
  // package of its class (library.domain.Book) gives the folders.
  const fileOf = (frame: string): string | undefined => {
    const m = /^\s+at (?:([\w.$]+)\/)?([\w.$]+)\.[\w$<>]+\(([\w$]+\.java):\d+\)/.exec(frame);
    if (!m) return undefined;
    const pkg = m[2].includes(".") ? m[2].slice(0, m[2].lastIndexOf(".")) : "";
    const path = pkg ? `${pkg.replace(/\./g, "/")}/${m[3]}` : m[3];
    if (sourceFiles.includes(path)) return path;
    // A file whose package line doesn't match its folders: found by its name, when only one file has it (not in Java's own modules).
    const same = m[1] ? [] : sourceFiles.filter((f) => f.split("/").pop() === m[3]);
    return same.length === 1 ? same[0] : undefined;
  };
  // The exception's stack frames (up to a "Caused by:" or "Suppressed:" of its own), and those in the learner's files.
  const frames: Frame[] = [];
  const stack: string[] = [];
  // The valueOf that javac writes for an enum, when that was the first frame in the learner's files.
  let enumValueOf: Frame | null = null;
  for (const l of lines.slice(headIndex + 1)) {
    const at = /^\s+at (.+)$/.exec(l);
    if (!at) {
      if (/^\s*(?:Caused by|Suppressed): /.test(l)) break;
      continue;
    }
    // The frame just inside this one, such as java.lang.Enum.valueOf.
    const called = /^(?:[\w.$@]+\/)?([\w.$<>]+)\(/.exec(stack[stack.length - 1] ?? "")?.[1];
    stack.push(at[1]);
    const m = /^\s+at (?:[\w.$]+\/)?([\w.$]+)\.([\w$<>]+)\(([\w$]+\.java):(\d+)\)/.exec(l);
    const path = m ? fileOf(l) : undefined;
    if (!m || !path) continue;
    const frame: Frame = { cls: m[1], method: m[2], file: path, line: Number(m[4]) };
    // An enum's valueOf has no code of its own to show (its line is the enum's header): the line that called it is the one to report.
    if (m[2] === "valueOf" && called === "java.lang.Enum.valueOf" && !frames.length && !enumValueOf) {
      enumValueOf = frame;
      continue;
    }
    frames.push(frame);
  }
  if (!frames.length && enumValueOf) frames.push(enumValueOf);
  const trace = lines.slice(headIndex + 1);
  // Thrown in Java's own code: its first stack frame isn't in one of the learner's files.
  const library = !!stack.length && !fileOf(`\tat ${stack[0]}`);
  // The message's other lines (a PatternSyntaxException's show the pattern), up to the stack trace.
  const more: string[] = [];
  for (const l of trace) {
    if (/^\s+at |^Caused by: |^\s+\.\.\. \d+ more/.test(l)) break;
    more.push(l);
  }
  // The methods of Java's own it went through before the learner's code, innermost first.
  const javaFrames: string[] = [];
  let caller: string | undefined;
  for (const l of trace) {
    if (l.startsWith("Caused by: ")) break;
    const f = /^\s+at (?:[\w.$@]+\/)?([\w.$<>]+)\(([^)]*)\)/.exec(l);
    if (!f) continue;
    if (fileOf(l)) {
      caller = f[1];
      break;
    }
    javaFrames.push(f[1]);
  }
  const short = exception.split(".").pop()!;
  const first = frames[0];
  // A cause: the exception it's the cause of is the head before it (a "Caused by:", or the first line).
  let cause: Wrapped | undefined;
  if (headIndex !== start) {
    let w = headIndex - 1;
    while (w > start && !lines[w].startsWith("Caused by: ")) w--;
    const nameAt = (k: number) => lines[k].replace(/^Exception in thread "main" |^Caused by: /, "").split(": ")[0].trim().split(".").pop()!;
    cause = { wrapper: nameAt(w), ownWrapper: !!fileOf(lines[w + 1] ?? ""), outer: nameAt(start) };
  }
  const c: CrashContext = { exception, library, frames, stack, javaFrames, more, caller, ...(cause ? { cause } : {}) };
  const rule = EXCEPTIONS.find(([re]) => re.test(exception));
  const explanation = rule ? rule[1](message, c) : uncaught(short, message, c);
  // An exception the learner's code threw itself: its explanation names the throw's file, line and method.
  const placed = !library && !!first && (!rule || rule[1] === explainIllegal);
  return { exception: short, message, file: first?.file, line: first ? first.line : null, method: first ? methodLabel(first) : null, explanation, ...(placed ? { placed } : {}) };
}
