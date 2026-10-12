// Plain-English explanations for javac errors (keyed by javac's diagnostic code) and for
// uncaught exceptions (keyed by the exception class).

import { ancestorsOf, classAt, codeOnly, declares, droppedLink, fileName, isRealSubtype, isSubtype, knows, ownClasses, parameterTypes, splitTopLevel, subtypesOf, typeNamed, type HeaderLink, type OwnClass, type OwnClasses, type OwnMember } from "./own-classes";
import type { Diagnostic, SourceFile } from "./types";
import { declaredPackage, folderOf, packageOfPath } from "../grader/files.js";
import { KEY_CODES, KEY_NAMES } from "../grader/keycodes.js";

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
  { code: "compiler.err.expected", when: /^'\{' expected/, explain: recordExtends },
  { code: "compiler.err.expected", when: /^';' expected/, explain: () => "Java needs a semicolon ; at the end of this statement. Look at the end of the line the arrow points to (or the line before it)." },
  { code: "compiler.err.expected", explain: (d) => `Java expected ${quoted(d.message) ? `'${quoted(d.message)}'` : "something else"} here. Check for a missing bracket, parenthesis or semicolon just before the arrow.` },
  { code: "compiler.err.expected3", explain: () => "Java expected a different symbol here. Check for a missing bracket, parenthesis or semicolon just before the arrow." },
  { code: "compiler.err.cant.resolve.location", when: /location: variable \w+ of type Object$/m, explain: objectHasNo },
  { code: "compiler.err.cant.resolve.location.args", when: /location: variable \w+ of type Object$/m, explain: objectHasNo },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable length\n/, explain: lengthOf },
  { code: "compiler.err.cant.resolve.location", when: /location: class (?:javafx\.scene\.input\.)?KeyCode$/m, explain: fxKeyCodeName },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+(?:class|variable) [A-Z]/, explain: noDatabase },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: patternScope },
  // A name that this method created in a block that has ended is stronger evidence than an enum constant of the same name.
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: outOfScope },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable [\w$]+\n\s*location: (?:class|interface|enum|record) /, explain: enumConstant },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class [\w$]+\n/, explain: fxNested },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class [\w$]+\n\s*location: package javafx/, explain: fxNotInPackage },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class [\w$]+\n\s*location: package /, explain: notInPackage },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: classElsewhere },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+(?:variable|class) [A-Z][\w$]*\n/, explain: importedFromMissing },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+(?:variable|class) [\w$]+\n/, explain: importFor },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+(?:variable|class) [A-Z][\w$]*\n/, explain: fxMissingClass },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable [\w$]+\n\s*location: (?:class|interface) /, explain: fxMethodAsVariableAfterCall },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable [\w$]+\n\s*location: variable /, explain: fxMethodAsVariable },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+variable/, explain: () => "Java doesn't know a variable with this name here. Check the spelling (upper and lower case matter) and that the variable was created before this line, inside the same block { }." },
  { code: "compiler.err.cant.resolve.location", when: /symbol:\s+class/, explain: () => "Java doesn't know a class with this name. Check the spelling and capital letters, and whether it needs an import at the top of the file." },
  { code: "compiler.err.doesnt.exist", when: /^package system does not exist/, explain: () => "System needs a capital S. With a small s, Java reads system as the name of a package (a folder of classes), and there is no such package." },
  { code: "compiler.err.doesnt.exist", when: /^package javafx\b/, explain: fxPackage },
  { code: "compiler.err.doesnt.exist", when: /^package [A-Z][\w$]* does not exist/, explain: fxOuterAsPackage },
  { code: "compiler.err.doesnt.exist", when: /^package (?:(?:java|javax)\.sql|org\.h2)\b/, explain: noDatabase },
  { code: "compiler.err.doesnt.exist", explain: unknownPackage },
  { code: "compiler.err.doesnt.exist", explain: libraryPackage },
  { code: "compiler.err.doesnt.exist", explain: () => "Java can't find this package. Check the spelling of the import or name before the dot, for example java.util.Scanner." },
  { code: "compiler.err.cant.resolve.location.args", when: /symbol:\s+method (?:get|is)[A-Z][\w$]*\(\)\n/, explain: recordGetter },
  { code: "compiler.err.cant.resolve.location.args", when: /symbol:\s+method [A-Z]/, explain: missingNew },
  { code: "compiler.err.cant.resolve.location.args", when: /symbol:\s+method launch\(/, explain: fxLaunchMissing },
  { code: "compiler.err.cant.resolve.location.args", when: /of type (?:javafx\.geometry\.)?Point2D$|location: class (?:javafx\.geometry\.)?Point2D$/m, explain: fxPointSetter },
  { code: "compiler.err.cant.resolve.location.args", explain: fxIntersectMethod },
  { code: "compiler.err.cant.resolve.location.args", explain: fxIntersectCall },
  { code: "compiler.err.cant.resolve.location.args", explain: fxMethod },
  { code: "compiler.err.cant.resolve.location.args", explain: notInOwnType },
  { code: "compiler.err.cant.resolve.location.args", explain: libraryMethod },
  { code: "compiler.err.cant.resolve.location.args", explain: () =>"There is no method with this name that takes these arguments. Check the spelling, and which methods this type really has." },
  { code: "compiler.err.cant.resolve.location", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.cant.resolve", when: /symbol:\s+method /, explain: fxAnonymousMethod },
  { code: "compiler.err.cant.resolve", when: /symbol:\s+class [\w$]+$/m, explain: fxNested },
  { code: "compiler.err.cant.resolve", when: /symbol:\s+class [\w$]+$/m, explain: importFor },
  { code: "compiler.err.cant.resolve", when: /symbol:\s+variable [A-Z][\w$]*$/m, explain: importFor },
  { code: "compiler.err.cant.resolve", when: /symbol:\s+class [A-Z][\w$]*$/m, explain: fxMissingClass },
  { code: "compiler.err.cant.resolve", explain: () => "Java can't find this name. Check the spelling and capital letters." },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: bad return type in lambda expression/, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: lambda body is not compatible with a void functional interface/, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: unexpected return value/, explain: lambdaResult },
  // A lambda given to a generic method, such as Collections.sort(list, (a, b) -> ...): javac reports the call whose types it can't work out.
  { code: "compiler.err.prob.found.req", when: LAMBDA_IN_GENERIC_CALL, explain: lambdaResult },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Optional(?:Double|Int|Long)?(?:<.*>)? cannot be converted to /, explain: optionalAsValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: (?:no instance\(s\) of type variable\(s\) [\w$, ]+ exist so that )?(?:Stream|IntStream|DoubleStream|LongStream)(?:<.*?>)? (?:conforms to|cannot be converted to) /, explain: streamAsValue },
  { code: "compiler.err.prob.found.req", when: /no instance\(s\) of type variable\(s\) .* exist so that Collector<.*> conforms to Supplier<R>/, explain: numberStreamCollect },
  // Charts (MOOC part 14): axes and data points of other types than the chart's, a slider's listener written for Double.
  { code: "compiler.err.prob.found.req", when: /^incompatible types: cannot infer type arguments for [\w$.]+<>\n\s*reason: inference variable [XY] has incompatible equality constraints/, explain: fxChartAxes },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: (?:CategoryAxis|NumberAxis) cannot be converted to Axis</, explain: fxChartAxes },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: cannot infer type arguments for (?:[\w$]+\.)*Data<>\n/, explain: fxDataDiamond },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: (?:[\w$]+\.)*(?:Series|Data)<.*> cannot be converted to /, explain: fxSeriesTypes },
  { code: "compiler.err.prob.found.req", when: /cannot be converted to ChangeListener<\? super Number>$/m, explain: fxNumberListener },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Number cannot be converted to /, explain: fxNumberValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Object cannot be converted to /, explain: fxRawObject },
  { code: "compiler.err.prob.found.req", when: /possible lossy conversion from double to /, explain: fxLossy },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: String cannot be converted to KeyCode$/, explain: fxKeyCodeText },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: (?:Shape|Path) cannot be converted to boolean$/, explain: fxIntersectValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: cannot infer type arguments for [\w$.]+<>\n\s*reason: inference variable/, explain: diamondValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Object(?:\[\])? cannot be converted to [\w$]+(?:\[\])?$/, explain: objectForTypeParameter },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: Object cannot be converted to [\w$.]+$/, explain: rawGeneric },
  { code: "compiler.err.prob.found.req", when: /possible lossy conversion/, explain: () => "This would squeeze a bigger or more precise number type into a smaller one and could lose information, for example a double into an int. Convert it on purpose with a cast such as (int), or use a variable of the bigger type." },
  {
    code: "compiler.err.prob.found.req",
    when: /incompatible types: Object cannot be converted to [A-Z][\w$]*$/m,
    explain: (d) => {
      const t = /Object cannot be converted to ([A-Z][\w$]*)$/m.exec(d.message)?.[1];
      return `A value of type Object could be any object, so Java won't put it in ${t ? anWord(t) : "a"} variable by itself. If it comes from a list declared without a type in angle brackets, such as ArrayList list, give the list its type: ArrayList<${t}>. If you know the value is ${t ? anWord(t) : "one"} (check with instanceof first, as equals does), cast it by putting (${t}) in front of it.`;
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
  { code: "compiler.err.prob.found.req", when: /incompatible parameter types in lambda expression/, explain: fxLambdaParams },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: ObservableList</, explain: fxChildrenList },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+ cannot be converted to [\w$.]+$/m, explain: fxNarrowing },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: /, explain: fxWrongValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+ cannot be converted to [\w$.]+$/m, explain: ownConversion },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: String cannot be converted to [\w$.]+$/m, explain: textToEnum },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+(?:\[\])* cannot be converted to [\w$.]+(?:\[\])*$/, explain: arrayLevels },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+(?:\[\])* cannot be converted to [\w$.]+(?:\[\])*$/, explain: genericValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+<.*> cannot be converted to [\w$.]+<.*>$/, explain: otherTypeArguments },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: void cannot be converted to /, explain: voidValue },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.]+ cannot be converted to [\w$.]+$/, explain: caseValueType },
  { code: "compiler.err.prob.found.req", when: /^incompatible types: [\w$.<>\[\]]+ cannot be converted to [\w$.<>\[\]]+$/, explain: varKeepsType },
  { code: "compiler.err.prob.found.req", when: /cannot be converted to/, explain: () => "The value on the right has a different type than the variable or parameter expects. For example text in quotes is a String, not an int; Integer.valueOf(...) turns text into a number." },
  { code: "compiler.err.prob.found.req", when: /unexpected return value/, explain: () => "This method is void, so it can't return a value. Change void to the value's type, or remove the value after return." },
  { code: "compiler.err.prob.found.req", when: /missing return value/, explain: () => "This method must return a value: write return followed by the value." },
  { code: "compiler.err.prob.found.req", explain: () => "The types here don't match what Java expects." },
  { code: "compiler.err.void.not.allowed.here", explain: fxHandlerValue },
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
  { code: "compiler.err.cant.apply.symbol", when: /^constructor Point2D in class /, explain: fxPointNew },
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
  { code: "compiler.err.cant.apply.symbol", when: /incompatible parameter types in lambda expression/, explain: fxLambdaParams },
  { code: "compiler.err.cant.apply.symbol", when: /^incompatible types: (?:T|ObservableValue<CAP#1>) cannot be converted to /, explain: fxListenerFollowOn },
  { code: "compiler.err.cant.apply.symbol", when: /^incompatible types: [\w$.]+(?:<.*?>)? cannot be converted to (?:EventHandler|ChangeListener)</, explain: fxNotHandler },
  { code: "compiler.err.cant.apply.symbol", when: /^incompatible types: invalid method reference/, explain: fxMethodRef },
  { code: "compiler.err.cant.apply.symbol", when: /^incompatible types: /, explain: fxWrongValue },
  { code: "compiler.err.cant.apply.symbol", when: /^method add in class GridPane cannot be applied/, explain: fxGridAdd },
  { code: "compiler.err.cant.apply.symbol", when: /^method intersect in class Shape cannot be applied/, explain: fxIntersectCall },
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
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable constructor found for Random\(/, explain: randomSeed },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable method found for launch\(Class</, explain: fxLaunchClass },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable constructor found for Scene\(/, explain: fxScene },
  { code: "compiler.err.cant.apply.symbols", when: /^incompatible types: |^no suitable method found for add\(/, explain: fxChildrenAdd },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable method found for add\(/, explain: fxGridAdd },
  { code: "compiler.err.cant.apply.symbols", when: /^incompatible types: /, explain: fxWrongValue },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable constructor found for ([\w$]+)/, explain: (d) => `None of the constructors of ${/^no suitable constructor found for ([\w$]+)/.exec(d.message)?.[1]} takes these values. Check the number, order and types of the values in the parentheses.` },
  { code: "compiler.err.cant.apply.symbols", when: /^no suitable method found for sort\([\w$.]+<[\w$.]+>\)[\s\S]*upper bounds: Comparable<\? super/, explain: sortNotComparable },
  { code: "compiler.err.cant.apply.symbols", explain: () => "None of the versions of this method accepts these arguments. Check the number and types of values in the parentheses." },
  { code: "compiler.err.non-static.cant.be.ref", when: /^non-static type variable /, explain: staticTypeVariable },
  { code: "compiler.err.non-static.cant.be.ref", explain: () => "main is static, so it can't use this object's methods or variables directly. Create an object first (new ...) and call the method on it, or make the method static if it doesn't need an object." },
  { code: "compiler.err.var.might.not.have.been.initialized", explain: recordCanonical },
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
  { code: "compiler.err.report.access", when: /^[\w$]+ has private access in /, explain: recordPrivate },
  { code: "compiler.err.report.access", when: /^getChildren\(\) has protected access/, explain: fxProtectedChildren },
  { code: "compiler.err.report.access", when: /^[xy] has private access in (?:javafx\.geometry\.)?Point2D$/, explain: fxPointField },
  { code: "compiler.err.report.access", explain: privateInParent },
  { code: "compiler.err.report.access", explain: accessDenied },
  { code: "compiler.err.report.access", explain: () => "This is private, so only code inside its own class can use it. Use a public method of that class (for example a getter) instead." },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: unreported },
  { code: "compiler.err.unreported.exception.need.to.catch.or.throw", explain: () => "This can throw a checked exception, so Java insists you handle it: wrap it in try { ... } catch (...) { ... }, or add throws ... to the method header." },
  { code: "compiler.err.illegal.start.of.expr", explain: () => "Something here isn't a valid start of an expression. Often a bracket or parenthesis is missing earlier, or a method was declared inside another method." },
  { code: "compiler.err.illegal.start.of.type", explain: () => "Java didn't expect this here. Check for a missing or extra bracket around this line." },
  { code: "compiler.err.not.stmt", explain: valueInSwitch },
  { code: "compiler.err.not.stmt", explain: () => "This isn't a complete statement on its own. Perhaps it should be assigned to a variable or printed, or = was mixed up with ==." },
  { code: "compiler.err.cant.deref", when: /^void cannot be dereferenced/, explain: voidDereferenced },
  { code: "compiler.err.cant.deref", explain: () => "Primitive values like int, double and boolean have no methods, so you can't put a dot after them. Use a wrapper or a helper, for example String.valueOf(number)." },
  { code: "compiler.err.operator.cant.be.applied.1", when: /^\s*(?:first|second) type:\s+Optional/m, explain: optionalInArithmetic },
  { code: "compiler.err.operator.cant.be.applied.1", when: /^\s*(?:first|second) type:\s+Number$/m, explain: fxNumberArithmetic },
  { code: "compiler.err.operator.cant.be.applied.1", when: /^\s*(?:first|second) type:\s+Point2D$/m, explain: fxPointArithmetic },
  { code: "compiler.err.operator.cant.be.applied.1", when: /^\s*(?:first|second) type:\s+(?:Shape|Path|Bounds|BoundingBox)$/m, explain: fxIntersectValue },
  { code: "compiler.err.operator.cant.be.applied.1", explain: () => "This operator doesn't work with these two types, for example subtracting a String, or comparing a String with <." },
  { code: "compiler.err.operator.cant.be.applied", explain: () => "This operator doesn't work with this type, for example ! on a number." },
  { code: "compiler.err.incomparable.types", when: /^incomparable types: (?:KeyCode and String|String and KeyCode)$/, explain: fxKeyCodeText },
  { code: "compiler.err.incomparable.types", explain: () => "These two values have types that can never be equal, so comparing them with == makes no sense." },
  { code: "compiler.err.does.not.override.abstract", when: /abstract method handle\(long\) in AnimationTimer$/, explain: fxTimerHandle },
  { code: "compiler.err.does.not.override.abstract", explain: missingAbstractMethod },
  { code: "compiler.err.override.weaker.access", explain: weakerAccess },
  { code: "compiler.err.override.weaker.access", explain: () => "A method that replaces an inherited one can't be harder to reach than the method it replaces. Give it the same access word as that method (public, protected or none), or a more open one, such as public." },
  { code: "compiler.err.override.static", explain: overrideStatic },
  { code: "compiler.err.override.incompatible.ret", explain: overrideReturnType },
  { code: "compiler.err.method.does.not.override.superclass", explain: fxTimerOverride },
  { code: "compiler.err.method.does.not.override.superclass", explain: overridesNothing },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: fxAbstract },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: cannotCreate },
  { code: "compiler.err.intf.expected.here", explain: (d) => wrongParentKind(d, "class") },
  { code: "compiler.err.intf.expected.here", explain: () => "implements needs an interface, and this is a class. A class extends another class (class Dog extends Animal) and implements interfaces (class Book implements Readable)." },
  { code: "compiler.err.no.intf.expected.here", explain: (d) => wrongParentKind(d, "interface") },
  { code: "compiler.err.no.intf.expected.here", explain: () => "extends needs a class here, and this is an interface. A class implements an interface (class Book implements Readable) and extends another class (class Dog extends Animal)." },
  { code: "compiler.err.abstract.meth.cant.have.body", explain: abstractWithBody },
  { code: "compiler.err.intf.meth.cant.have.body", explain: interfaceMethodWithBody },
  { code: "compiler.err.does.not.override.abstract", explain: () => "This class promises (through an interface or abstract class) to have a method it doesn't have yet. Add the missing method with exactly that name and parameters." },
  { code: "compiler.err.abstract.cant.be.instantiated", explain: () => "You can't create an object directly from an abstract class or an interface. Create an object of a class that extends or implements it." },
  { code: "compiler.err.cant.inherit.from.final", explain: recordFinalClass },
  { code: "compiler.err.cant.inherit.from.final", explain: () => "This class is final, so no class can extend it." },
  { code: "compiler.err.cant.assign.val.to.var", explain: recordFinal },
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
  { code: "compiler.err.type.found.req", when: /required: reference\n\s*found:/, explain: primitiveTypeArgument },
  { code: "compiler.err.type.found.req", when: /found:\s+type parameter /, explain: newTypeParameter },
  { code: "compiler.err.type.found.req", explain: (d) => `Java expected another kind of type here: ${/required: (.+)/.exec(d.message)?.[1] ?? "another one"}, and found ${/found:\s+(.+)/.exec(d.message)?.[1] ?? "this"}.` },
  { code: "compiler.err.generic.array.creation", explain: genericArray },
  { code: "compiler.err.unexpected.type", explain: notAVariable },
  { code: "compiler.err.array.req.but.found", explain: arrayRequired },
  // The extra modules 55 to 59: records, switch, sealed types, patterns, text blocks and var.
  { code: "compiler.err.record.cannot.declare.instance.fields", explain: recordField },
  { code: "compiler.err.not.exhaustive", explain: notExhaustive },
  { code: "compiler.err.not.exhaustive.statement", explain: notExhaustive },
  { code: "compiler.err.duplicate.case.label", explain: duplicateLabel },
  { code: "compiler.err.switch.mixing.case.types", explain: mixedCaseKinds },
  { code: "compiler.err.selector.type.not.allowed", explain: selectorNotAllowed },
  { code: "compiler.err.rule.completes.normally", explain: ruleWithoutValue },
  { code: "compiler.err.switch.expression.completes.normally", explain: switchWithoutValue },
  { code: "compiler.err.switch.expression.no.result.expressions", explain: switchNoValues },
  { code: "compiler.err.return.outside.switch.expression", explain: returnInSwitch },
  { code: "compiler.err.break.outside.switch.expression", explain: breakInSwitch },
  { code: "compiler.err.pattern.dominated", explain: dominatedLabel },
  { code: "compiler.err.cant.inherit.from.sealed", explain: notPermitted },
  { code: "compiler.err.non.sealed.sealed.or.final.expected", explain: sealedChildModifier },
  { code: "compiler.err.illegal.text.block.open", explain: textBlockOpen },
  { code: "compiler.err.cant.infer.local.var.type", explain: varInfer },
  { code: "compiler.err.restricted.type.not.allowed.here", when: /^'var' is not allowed here/, explain: varNotAllowed },
  { code: "compiler.err.restricted.type.not.allowed.compound", explain: () => "var declares one variable at a time, so it can't be used with several variables on one line. Give each its own line: var a = 1; and then var b = 2;." },
  { code: "compiler.err.restricted.type.not.allowed.array", explain: () => "var can't be used with [ ] for an array. Write the array's type instead, as in int[] numbers = {1, 2, 3};, or var numbers = new int[] {1, 2, 3}; without brackets after var." },
  { code: "compiler.note.unchecked.filename", explain: (_d, own) => fxRawNote(own) ?? uncheckedNote() },
  { code: "compiler.note.unchecked.plural", explain: (_d, own) => fxRawNote(own) ?? uncheckedNote() },
  { code: "compiler.note.unchecked.recompile", explain: () => "Part of the note about unchecked or unsafe operations. You don't need to do this: the note doesn't stop the program from compiling." },
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
  return t ? t.kind === "interface" : /^(Comparable|Comparator|Runnable|Iterable|Iterator|Collection|List|Set|Map|Queue|Deque|Cloneable|EventHandler|ChangeListener|ObservableValue|ObservableList)$/.test(name);
}

/** "X is not abstract and does not override abstract method m(...) in Y". */
function missingAbstractMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$.]+) is not abstract and does not override abstract method ([\w$]+)\((.*)\) in ([\w$.]+)$/.exec(d.message);
  if (!m) return null;
  const [cls, method, params, parent] = [simple(m[1]), m[2], spaced(m[3]), simple(m[4])];
  if (parent === "Application" && method === "start" && cls !== parent && !knows(own, parent)) return fxNoStart(own, cls, d.file);
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
  // class Shelf implements Container, without <String>: Java fills in Object for the type parameter.
  const generic = typeNamed(own, parent, d.file);
  if (generic?.typeParams.length && /(?:^|,)Object(?:,|$)/.test(m[3]) && rawIn(own, cls, parent)) return rawOwnGeneric(own, cls, generic, method, m[3]);
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

const LIBRARY_METHODS: Record<string, string[]> = { Comparable: ["compareTo"], Comparator: ["compare"], Runnable: ["run"], Iterable: ["iterator"], Application: ["start", "init", "stop"] };
/** The parameter types of those methods, where they don't depend on a type in angle brackets. */
const LIBRARY_PARAMS: Record<string, string> = { "Application.start": "Stage", "Application.init": "", "Application.stop": "" };

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
  // JavaFX's start(Stage), in a class that doesn't extend Application (or names it wrongly).
  if (cls && name === "start" && /^(?:[\w$]+\.)*Stage$/.test(parameterTypes(params)) && !extendsApplication(own, cls)) {
    const typo = cls.extends.find((s) => !knows(own, s) && s !== "Application" && editDistance(s.toLowerCase(), "application") <= 2);
    if (typo) return `The header of ${cls.name} names ${typo}: did you mean Application? Until Java finds the parent class, it can't tell what start replaces, so the @Override fails. Fix the name in the header, and this error goes away.`;
    if (!cls.extends.length) return `start(Stage) is the method JavaFX calls in a class that extends Application, and ${cls.name} doesn't extend Application, so the @Override has nothing to replace. Write public class ${cls.name} extends Application${importNote(own, d.file, "Application")}.`;
  }
  const parents = cls ? ancestorsOf(own, cls.name) : [];
  // The methods this class could replace: where each one is, and its parameter types when they are known.
  const known = new Map<string, { where: string; params?: string }>([
    ["toString", { where: "Object", params: "" }],
    ["equals", { where: "Object", params: "Object" }],
    ["hashCode", { where: "Object", params: "" }],
  ]);
  for (const s of [cls, ...parents].flatMap((t) => t?.supers ?? [])) for (const m of LIBRARY_METHODS[s] ?? []) known.set(m, { where: s, params: LIBRARY_PARAMS[`${s}.${m}`] });
  for (const p of parents) for (const m of p.members) if (m.method && !m.private) known.set(m.name, { where: p.name, params: m.params });
  const remove = ` If ${name} is a new method, not a replacement, remove @Override.`;
  const found = known.get(name);
  const where = found?.where;
  if (found && where && found.params != null && bareType(found.params) === bareType(parameterTypes(params))) {
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
  // Application's start, misspelled more than near allows (strat): the same parameter type, a Stage, tells.
  const sameParams = [...known.entries()].find(([k, v]) => k !== name && v.where === "Application" && v.params && bareType(v.params) === bareType(parameterTypes(params)));
  if (sameParams) return `@Override says that ${name} replaces a method of a parent class or an interface, but none of them has a method ${name}. Did you mean ${sameParams[0]}, the method of Application, which takes the same (${sameParams[1].params})? Check the spelling: upper and lower case matter.${remove}`;
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
  // A class of Java Arena's JavaFX, only in a JavaFX program: elsewhere Stage, Button or Node may be a class of the program's own not written yet.
  const fx = name && !LIBRARY_PACKAGES[name] && FX[name] && fxProgram(own) ? FX[name].pkg : undefined;
  const pkg = name && (LIBRARY_PACKAGES[name] ?? fx);
  if (!name || !pkg) return null;
  // The program's own class of that name (in another package, or inside another class) is the one it means.
  if ([...own.types.values()].some((t) => t.name === name)) return null;
  // A star import covers only its own package: import java.util.*; doesn't reach into java.util.stream, nor import javafx.scene.control.*; into javafx.scene.layout.
  const star = (own.imports.get(d.file) ?? []).map((i) => (i.endsWith(".*") ? i.slice(0, -2) : "")).find((s) => s && s !== pkg && (pkg.startsWith(`${s}.`) || (!!fx && s.startsWith("javafx."))));
  return `To use ${name}, import it at the top of the file: import ${pkg}.${name};${star ? ` (import ${star}.*; covers only ${star} itself, not ${pkg}.)` : ""}`;
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
  // A JavaFX event handler or change listener that changes it: it runs later, so the value belongs in an instance variable.
  const handler = usesFX(own) ? fxHandlerAround(code, at, inner) : null;
  if (handler && changes.some((k) => k > handler.from && k < handler.to)) return fxHandlerChanges(code, pos.text, name, at, type, handler, inner);
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
  // JavaFX's Application says throws Exception on its start, init and stop, so they can pass any exception on.
  const fxApp = !!m && !m.constructor && !m.lambda && FX_APP_METHODS.test(m.name) && !!cls && extendsApplication(own, cls) && !parent;
  const replaces = !fxApp && !!m && !m.constructor && (m.override || !!parent);
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
    if (fxApp) return `${m.name} throws ${ex} here, and ${checked}: a method that throws one must say so in its header. Application's ${m.name} says throws Exception, so ${m.name} may say so too: ${throwsFix(own, m, ex)}.${fxPassedOn(m)}`;
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
  if (fxApp) return `${intro} Either catch it: ${catchIt}. Or pass it on: Application's ${m.name} says throws Exception, so ${m.name} may say so too: ${throwsFix(own, m, ex)}.${fxPassedOn(m)}`;
  return `${intro} Either catch it: ${catchIt}. Or pass it on: ${throwsFix(own, m, ex)}.${passedOn(m)}`;
}

/** What passing an exception on with throws means for JavaFX's start, init or stop. */
const fxPassedOn = (m: Around) => ` Then, if it happens, JavaFX prints "Exception in Application ${m.name} method" and stops the program.`;

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
  if (/\binstanceof\s+(?:final\s+)?$/.test(before)) return `A pattern after instanceof must name the type it checks for, since that type is the whole question: replace var with it, as in o instanceof String ${name ?? "s"}.`;
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
  if (LIBRARY_PACKAGES[name] || (FX[name] && fxProgram(own))) return null;
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

// ---- Type parameters, lists and hash maps of your own, Random, two-dimensional arrays (MOOC part 12) ----

/** A value of each primitive type, for examples: 5 for int. */
const SAMPLE: Record<string, string> = { int: "5", long: "5L", short: "5", byte: "5", double: "2.5", float: "2.5f", char: "'a'", boolean: "true" };

/** The < that opens the angle brackets around the end of `text` (whose > aren't closed yet), or -1. */
function openAngle(text: string): number {
  let depth = 0;
  for (let k = text.length - 1; k >= 0; k--) {
    const ch = text[k];
    if (ch === ">") depth++;
    else if (ch === "<" && depth-- === 0) return k;
    else if (/[;(){}=]/.test(ch)) return -1;
  }
  return -1;
}

/** The > that closes the < at `open`, or -1. */
function closeAngle(text: string, open: number): number {
  let depth = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === "<") depth++;
    else if (text[k] === ">" && --depth === 0) return k;
    else if (/[;(){}=]/.test(text[k])) return -1;
  }
  return -1;
}

/** "unexpected type, required: reference, found: int": a primitive type where only a class can be, most often in angle brackets, as in List<int>. */
function primitiveTypeArgument(d: Diagnostic): string | null {
  const found = /found:\s+(\w+)$/m.exec(d.message)?.[1];
  const box = found ? BOX[found] : undefined;
  const c = atCaret(d);
  if (!found || !box || !c) return null;
  const before = beforeCaret(c);
  const open = openAngle(before);
  if (open < 0) {
    if (/^[\w$.]+\s+instanceof\b/.test(c.at))
      return `instanceof checks which class an object belongs to, and this value is ${anWord(found)}, a primitive type, not an object: it's always ${anWord(found)}, so there is nothing to check. Leave the check out.`;
    return `${found} is a primitive type, and only an object can be used here. Use its class, ${box}, where an object is needed.`;
  }
  const name = /([\w$.]+)\s*$/.exec(before.slice(0, open))?.[1];
  const close = closeAngle(c.line, open);
  const args = close > 0 ? c.line.slice(open + 1, close) : null;
  const written = name && args ? `${name}<${args}>` : null;
  const fixed = written ? `${name}<${args!.replace(/\b(int|long|short|byte|double|float|char|boolean)\b(?!\s*\[)/g, (p) => BOX[p])}>` : null;
  return `${found} is a primitive type, and a type in angle brackets can't be a primitive type (it must be a reference type, such as a class)${written ? `, so ${written} isn't allowed` : ""}. Use its wrapper class ${box} instead${fixed ? `: ${fixed}` : ""}. Java turns ${found} values into ${box} objects and back by itself, so you can still put in values such as ${SAMPLE[found]} and read them into ${anWord(found)} variable.`;
}

/** "unexpected type, required: class, found: type parameter T": new T() in a generic class. */
function newTypeParameter(d: Diagnostic, own: OwnClasses): string | null {
  const t = /found:\s+type parameter ([\w$]+)/.exec(d.message)?.[1];
  if (!t) return null;
  const cls = classAt(own, d.file, d.line);
  const example = cls?.typeParams.length === 1 && cls.typeParams[0] === t ? `, such as String in ${cls.name}<String>` : "";
  return `${t} is a type parameter: it stands for the type the class is used with${example}. Java doesn't keep that type when the program runs, so new ${t}() can't know which class to create. Take the object from outside instead, as a parameter of the constructor or of a method (such as public void add(${t} value)), and store that.`;
}

/** The position just after the bracket that closes the one at `open` ("<" with ">", "[" with "]", "(" with ")"), or -1. */
function pastClose(text: string, open: number): number {
  const [o, c] = text[open] === "<" ? ["<", ">"] : text[open] === "(" ? ["(", ")"] : ["[", "]"];
  let depth = 0;
  for (let k = open; k < text.length; k++) {
    if (text[k] === o) depth++;
    else if (text[k] === c && --depth === 0) return k + 1;
  }
  return -1;
}

/**
 * The array creation at the start of `text`, as written: new T[rows][cols] gives T, no type
 * arguments and the sizes rows and cols; new ArrayList<String>[8] gives ArrayList, <String> and 8;
 * new T[] { ... } gives an empty size and `init`. Sizes may hold brackets of their own (grid[0].length).
 */
function newArrayAt(text: string): { type: string; args: string; sizes: string[]; init: boolean; length: number } | null {
  const m = /^new\s+([\w$.]+)\s*/.exec(text);
  if (!m) return null;
  let k = m[0].length;
  let args = "";
  if (text[k] === "<") {
    const end = pastClose(text, k);
    if (end < 0) return null;
    args = text.slice(k, end);
    k = end;
    while (/\s/.test(text[k] ?? "")) k++;
  }
  const sizes: string[] = [];
  let length = k;
  while (text[k] === "[") {
    const end = pastClose(text, k);
    if (end < 0) return null;
    sizes.push(text.slice(k + 1, end - 1).trim());
    k = length = end;
    while (/\s/.test(text[k] ?? "")) k++;
  }
  return sizes.length ? { type: m[1], args, sizes, init: sizes[0] === "" || text[k] === "{", length } : null;
}

/** An array creation's brackets as written ([rows][cols]), and with { ... } after them for an initializer. */
const sizesText = (a: { sizes: string[]; init: boolean }) => `${a.sizes.map((s) => `[${s}]`).join("")}${a.init ? " { ... }" : ""}`;

/** The type parameters a generic method's or constructor's header declares: T for "public static <T> T[] make(int n)". */
function methodTypeParams(header: string): string[] {
  const at = /^(?:(?:public|protected|private|static|final|abstract|synchronized|native|strictfp|default)\s+)*(?=<)/.exec(header);
  if (!at) return [];
  const end = pastClose(header, at[0].length);
  return end < 0 ? [] : splitTopLevel(header.slice(at[0].length + 1, end - 1)).map((p) => /^\s*([A-Za-z_$][\w$]*)/.exec(p)?.[1] ?? "").filter(Boolean);
}

/** The program's types whose declarations hold a line of a file, innermost first. */
const typesAround = (own: OwnClasses, file: string, line: number) =>
  [...own.types.values()].filter((t) => t.file === file && t.from <= line && line <= t.to).sort((a, b) => b.from - a.from);

/** Whether a type of the program is declared inside a method or constructor (a local class), rather than in a class's body. */
function isLocalType(own: OwnClasses, t: OwnClass): boolean {
  const lines = own.code.get(t.file);
  if (!lines) return false;
  const k = new RegExp(`\\b(?:class|interface|enum|record)\\s+${escapeRegExp(t.name)}\\b`).exec(lines[t.from - 1] ?? "")?.index;
  if (k == null) return false;
  return methodBodyAround(lines.join("\n"), lines.slice(0, t.from - 1).join("\n").length + (t.from > 1 ? 1 : 0) + k) != null;
}

/**
 * "generic array creation": new T[10] with a type parameter, new ArrayList<String>[10], or new
 * Node[16] where Node is a class inside a generic class (and so generic too).
 */
function genericArray(d: Diagnostic, own: OwnClasses): string {
  const made = newArrayAt(atCaret(d)?.at ?? "");
  const note = "Java then prints a note that the program uses unchecked or unsafe operations: that's expected, and the program compiles and runs.";
  if (!made) return `Java can't create an array of a type parameter (new T[10]) or of a type with angle brackets (new ArrayList<String>[10]). For T, create an array of Object and cast it: (T[]) new Object[10]. ${note}`;
  const { type, args } = made;
  const brackets = sizesText(made);
  const pairs = "[]".repeat(made.sizes.length);
  if (args) {
    const course = /^(?:ArrayList|List)$/.test(simple(type)) && made.sizes.length === 1 ? `, as in the course's own hash map, whose buckets are created with new ArrayList${brackets}` : "";
    return `Java can't create an array whose type has angle brackets, such as new ${type}${args}${brackets}. Create it without them, new ${type}${brackets}: a variable of type ${type}${args}${pairs} can still hold it${course}. ${note}`;
  }
  const written = `new ${type}${brackets}`;
  // A type parameter of a class around the line (a class inside a generic class sees its parameters too), or of the generic method or constructor around it.
  const params = [...typesAround(own, d.file, d.line).flatMap((t) => t.typeParams), ...methodTypeParams(methodAround(d, own)?.header ?? "")];
  if (!type.includes(".") && params.includes(type))
    return `${type} is a type parameter, and Java doesn't keep the type it stands for when the program runs, so it can't create an array of ${type}: ${written} isn't allowed. Create an array of Object and cast it to ${type}${pairs}, as the course does: (${type}${pairs}) new Object${brackets}. ${note}`;
  // A class inside a generic class: unless it's static, it uses the outer class's type parameters, so it's generic too.
  const t = typeNamed(own, simple(type), d.file);
  const around = t ? typesAround(own, t.file, t.from).filter((x) => x !== t) : [];
  const outer = around.find((x) => x.typeParams.length);
  if (t && outer) {
    const generic = `${outer.name}<${outer.typeParams.join(", ")}>`;
    const lines = own.code.get(t.file)?.slice(t.from - 1, t.to).join("\n") ?? "";
    const used = outer.typeParams.filter((p) => new RegExp(`(?<![\\w$.])${escapeRegExp(p)}(?![\\w$])`).test(lines));
    const typeArgs = used.length ? `<${used.join(", ")}>` : "";
    const whose = `whose type${outer.typeParams.length > 1 ? "s" : ""} Java doesn't keep when the program runs.`;
    if (isLocalType(own, t))
      return `${t.name} is a class declared inside a method of the generic class ${generic}, so it's generic too: it can use ${listed(outer.typeParams)}, ${whose} So Java can't create an array of ${t.name}: ${written} isn't allowed. Keep the objects in a list instead, an ArrayList<${t.name}>, or move ${t.name} out of the method, as a class of its own${typeArgs ? ` with type parameters of its own (class ${t.name}${typeArgs})` : ""}.`;
    // From the generic class down to Node, without angle brackets: OwnMap.Node.
    const path = [...around.slice(0, around.indexOf(outer) + 1).reverse().map((x) => x.name), t.name].join(".");
    const uses = usesOf((own.code.get(t.file) ?? []).slice(outer.from - 1, outer.to).join("\n"), t.name, typeArgs, 3);
    const statics = used.length
      ? ` Or make ${t.name} a static class with type parameters of its own, static class ${t.name}${typeArgs}, and then write ${t.name}${typeArgs} wherever ${t.name} is used${uses.length ? `, as in ${listed(uses)}` : ""}: then new ${t.name}${brackets} works.`
      : ` Or, since ${t.name} doesn't use ${listed(outer.typeParams)}, make it static: static class ${t.name}. Then new ${t.name}${brackets} works.`;
    return `${t.name} is a class inside the generic class ${generic}, and it isn't static, so it's generic too: each ${t.name} belongs to ${anWord(outer.name)} object and can use its ${listed(outer.typeParams)}, ${whose} So Java can't create an array of ${t.name}: ${written} isn't allowed. Name the generic class in front of it, without angle brackets: new ${path}${brackets}.${statics} ${note}`;
  }
  return `Java can't create an array of ${type} here: ${written} isn't allowed, because ${type} depends on a type parameter, whose type Java doesn't keep when the program runs. If ${type} is a type parameter, create an array of Object and cast it: (${type}${pairs}) new Object${brackets}. If it's a class inside a generic class, name that class in front of it: new Outer.${type}${brackets}, with the generic class's name for Outer. ${note}`;
}

/** Types to write in the angle brackets of an example: String, then Integer, then Double. */
const SAMPLE_TYPES = ["String", "Integer", "Double", "Boolean"];

/** Where a class of the program is used as a type, with its type arguments written in: "Node<T> next" for "Node next", and "new Node<>(...)". At most `count` of them. */
function usesOf(code: string, name: string, args: string, count: number): string[] {
  const n = escapeRegExp(name);
  const found = [...code.matchAll(new RegExp(`(?<![\\w$.])${n}((?:\\s*\\[\\s*\\])*)\\s+([\\w$]+)\\s*[;=),:]`, "g"))].map((m) => `${name}${args}${m[1].replace(/\s+/g, "")} ${m[2]}`);
  const made = new RegExp(`\\bnew\\s+${n}\\s*\\(`).test(code) ? [`new ${name}<>(...)`] : [];
  return [...new Set(found)].slice(0, Math.max(0, count - made.length)).concat(made);
}

/** "non-static type variable T cannot be referenced from a static context". */
function staticTypeVariable(d: Diagnostic, own: OwnClasses): string | null {
  const t = /^non-static type variable ([\w$]+) cannot be referenced from a static context/.exec(d.message)?.[1];
  if (!t) return null;
  // The class that declares T: the one around the line, or a class around that (Node inside OwnList<T>).
  const around = typesAround(own, d.file, d.line);
  const at = around.findIndex((x) => x.typeParams.includes(t));
  const owner = at >= 0 ? around[at] : around[0];
  const cls = owner?.name;
  const created = cls ? `new ${cls}<${(owner.typeParams.length ? owner.typeParams : [t]).map((_, i) => SAMPLE_TYPES[i] ?? "String").join(", ")}>()` : "";
  const why = `${t} belongs to each ${cls ? `${cls} ` : ""}object: it's chosen when the object is created${cls ? `, as in ${created}` : ""}, so it can be a different type for each object. Something static belongs to the class itself, not to one object, so it can't use ${t}.`;
  const line = atCaret(d)?.line.trim() ?? "";
  const header = /\bstatic\b/.test(line) && METHOD_IN.test(line) ? line.replace(/\s*\{.*$/, "") : null;
  // A type between the line and the class that declares T that is static: written static, or a record, an enum or an interface (static by themselves), or a class inside an interface.
  const between = at > 0 ? around.slice(0, at) : [];
  const isStatic = (x: OwnClass) => x.static || x.kind !== "class" || around[around.indexOf(x) + 1]?.kind === "interface";
  const nested = between.find(isStatic);
  if (cls && nested) {
    const enclosing = around[around.indexOf(nested) + 1];
    const what = nested.static
      ? `a static ${nested.kind}`
      : nested.kind === "class"
        ? `a class inside the interface ${enclosing.name}, which makes it static`
        : `${aKind(nested.kind)}, and ${aKind(nested.kind)} inside a class is always static`;
    const intro = `${why} ${nested.name} is ${what}: it doesn't belong to one ${cls} object, so it can't use ${cls}'s ${t} either.`;
    if (nested.kind === "enum") return `${intro} An enum can't have type parameters, so ${nested.name} can't use ${t} at all: keep the ${t} value in ${cls} itself, or make ${nested.name} a class.`;
    // Its own type parameters: those it has, and those of the outer class it uses (Node<K, V>).
    const code = own.code.get(nested.file) ?? [];
    const body = code.slice(nested.from - 1, nested.to).join("\n");
    const used = owner.typeParams.filter((p) => p === t || new RegExp(`(?<![\\w$.])${escapeRegExp(p)}(?![\\w$])`).test(body));
    const params = [...nested.typeParams, ...used.filter((p) => !nested.typeParams.includes(p))];
    const args = `<${params.join(", ")}>`;
    const headerLine = (own.lines.get(nested.file)?.[nested.from - 1] ?? "").replace(/\s*\{.*$/, "").trim();
    const kindName = new RegExp(`\\b(class|record|interface)\\s+${escapeRegExp(nested.name)}\\b(?:\\s*<[^<>]*>)?`);
    const newHeader = kindName.test(headerLine) ? headerLine.replace(kindName, `$1 ${nested.name}${args}`) : `${nested.kind} ${nested.name}${args}`;
    const uses = usesOf(code.slice(owner.from - 1, owner.to).join("\n"), nested.name, args, 3);
    const ownParams = `give ${nested.name} ${params.length > 1 ? "type parameters" : "a type parameter"} of its own, ${newHeader}`;
    const everywhere = `, and write ${nested.name}${args} wherever ${cls} uses ${nested.name}${uses.length ? `, as in ${listed(uses)}` : ""} (${anWord(nested.name)} written without ${args} gives Objects, not ${listed(params)} values)`;
    // static T shared; or static void show(T value) inside the static class: the member is static itself.
    const member = /\bstatic\b/.test(line) && !/\b(?:class|interface|enum|record)\b/.test(line);
    if (member && header) return `${intro} ${methodIn(header) ?? "This method"} is static itself, so give it a type parameter of its own, written before its return type: ${header.replace(/\bstatic\s+/, `static <${t}> `)}.`;
    const removable = nested.static && between.filter(isStatic).length === 1;
    const remove = removable ? `remove static from ${nested.name}'s header, so that each ${nested.name} belongs to ${anWord(cls)} object and can use its ${t}` : "";
    if (member) return `${intro} This variable is static too, so remove static from it, and then ${remove ? `${remove}, or ` : ""}${ownParams}${everywhere}.`;
    return `${intro} To fix it, ${remove ? `${remove}. Or ` : ""}${ownParams}${everywhere}.`;
  }
  if (header)
    return `${why} If the method works on an object's values, remove static. If it should stay static, give it a type parameter of its own, written before its return type: ${header.replace(/\bstatic\s+/, `static <${t}> `)}.`;
  if (/\bstatic\b/.test(line)) return `${why} Remove static, so that each object has one of its own.`;
  const m = methodAround(d, own);
  const method = m && /\bstatic\s+/.test(m.header) ? m : null;
  const example = method ? method.header.replace(/\bstatic\s+/, `static <${t}> `) : `public static <${t}> void print(${t} value)`;
  return `${why} This is inside ${method ? `the static method ${method.name}` : "a static method"}: remove static from it if it works on an object's values, or give it a type parameter of its own, written before its return type, as in ${example}.`;
}

/** "incompatible types: cannot infer type arguments for Box<>": new Box<>(...) with a value of another type than the variable's angle brackets say. */
function diamondValue(d: Diagnostic): string | null {
  const m = /^incompatible types: cannot infer type arguments for ([\w$.]+)<>\n\s*reason: inference variable ([\w$]+) has incompatible bounds\n\s*equality constraints: ([\w$.<>\[\]]+)\n\s*lower bounds: ([\w$.<>\[\]]+)$/m.exec(d.message);
  if (!m) return null;
  const [, cls, t, want, got] = m;
  const hint = got === "String" && /^(Integer|Double|Long)$/.test(want) ? ` (${want}.valueOf(text) turns text into a number)` : "";
  return `The new ${simple(cls)} goes where its ${t} must be ${want} (the angle brackets of the variable say so), so the value for ${t} in new ${simple(cls)}<>(...) must be ${anWord(want)}, and it's ${anWord(got)}. Pass ${anWord(want)}${hint}, or, if it should hold ${got} values, write ${got} in the variable's angle brackets instead.`;
}

/** A declared type split into its class and its type arguments: Box and [Integer] for "Box<Integer>". */
function typeArguments(type: string | null): { cls: string; args: string[] } | null {
  const m = /^([\w$.]+)\s*<(.*)>$/.exec(type?.trim() ?? "");
  return m ? { cls: simple(m[1]), args: splitTopLevel(m[2]).map((a) => a.trim()) } : null;
}

/** Classes of Java's own that take a type in angle brackets, as the course uses them. */
const GENERIC_LIBRARY = /^(?:List|ArrayList|LinkedList|Set|HashSet|TreeSet|Map|HashMap|TreeMap|Collection|Queue|Deque|ArrayDeque|PriorityQueue|Iterator|Optional)$/;

/** A conversion of text to a number or back, for a note about a value of the wrong type. */
function convertHint(from: string, to: string): string {
  if (from === "String" && /^(?:Integer|Double|Long|int|double|long)$/.test(to)) return ` (${BOX[to] ?? to}.valueOf(text) turns text into a number)`;
  if (to === "String" && /^(?:Integer|Double|Long|int|double|long)$/.test(from)) return " (String.valueOf(number) turns a number into text)";
  return "";
}

/** Which value in a call's parentheses (opened at `open`) a position is in, 0 for the first, and how many values the call has. Only commas outside other brackets count. */
function argumentAt(code: string, open: number, at: number): { index: number; count: number } {
  let depth = 0;
  let index = 0;
  let count = 1;
  for (let k = open + 1; k < code.length; k++) {
    const ch = code[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (depth-- === 0) break;
    } else if (ch === "," && depth === 0) {
      count++;
      if (k < at) index++;
    }
  }
  return { index, count };
}

/** For Java's own maps: which type argument each value of a method takes (0, the keys' type K; 1, the values' type V; -1, neither), by the number of values the call has. */
const MAP_SLOTS: Record<string, (count: number) => number[]> = {
  put: () => [0, 1],
  putIfAbsent: () => [0, 1],
  merge: () => [0, 1],
  getOrDefault: () => [-1, 1],
  replace: (count) => (count === 3 ? [0, 1, 1] : [0, 1]),
};
const JAVA_MAP = /^(?:Map|HashMap|TreeMap)$/;

/**
 * A value of the wrong type given to, or taken from, a method of an object whose class has a type
 * parameter: box.set("three") or String s = box.get() with Box<Integer> box; list.add("a") with
 * List<Integer> list. "incompatible types: String cannot be converted to Integer".
 */
function genericValue(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+(?:\[\])*) cannot be converted to ([\w$.]+(?:\[\])*)$/.exec(d.message);
  const p = caretIn(d, own);
  if (!m || !p) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  const callOf = (end: number) => /(?<![\w$.])((?:this\s*\.\s*)?[\w$]+)\s*\.\s*([\w$]+)\s*$/.exec(p.code.slice(Math.max(0, end - 120), end));
  // The methods of a class of the program's own with this name: only one of them tells which type parameter is meant.
  const only = (t: OwnClass, name: string) => {
    const ms = t.members.filter((x) => x.method && x.name === name && x.params != null);
    return ms.length === 1 ? ms[0] : undefined;
  };
  // Taken out: the caret is on the ( of recv.method(...).
  if (p.code[p.at] === "(") {
    const out = callOf(p.at);
    const recv = out?.[1].replace(/^this\s*\.\s*/, "");
    const declared = recv ? typeArguments(changesOf(p.code, recv, p.at).type) : null;
    const t = declared ? typeNamed(own, declared.cls, d.file) : undefined;
    // For a class of the program's own, the method must give one of its type parameters (T for public T get()), and that one must be `from` here.
    const at = t && out ? t.typeParams.indexOf(bareType(only(t, out[2])?.type ?? "")) : -1;
    const gives = t ? at >= 0 && bareType(declared!.args[at] ?? "") === from : !!declared?.args.some((a) => bareType(a) === from);
    if (out && recv && declared && gives && (t || GENERIC_LIBRARY.test(declared.cls)))
      return `${recv} is ${anWord(`${declared.cls}<${declared.args.join(", ")}>`)}, so ${out[2]}() gives ${anWord(from)} here, not ${anWord(to)}${convertHint(from, to)}. Store it in ${anWord(from)} variable, or, if ${recv} should hold ${to} values, write ${BOX[to] ?? to} in its angle brackets.`;
  }
  // Put in: the caret is on a value in the parentheses of recv.method(...).
  let depth = 0;
  let open = -1;
  for (let k = p.at - 1; k >= 0 && k > p.at - 400; k--) {
    const ch = p.code[k];
    if (")]}".includes(ch)) depth++;
    else if ("([{".includes(ch)) {
      if (depth-- > 0) continue;
      if (ch === "(") open = k;
      break;
    } else if (ch === ";") break;
  }
  const call = open >= 0 ? callOf(open) : null;
  if (!call) return null;
  const recv = call[1].replace(/^this\s*\.\s*/, "");
  const method = call[2];
  const declared = typeArguments(changesOf(p.code, recv, p.at).type);
  if (!declared || !declared.args.some((a) => bareType(a) === to)) return null;
  const t = typeNamed(own, declared.cls, d.file);
  if (!t && !GENERIC_LIBRARY.test(declared.cls)) return null;
  // Which type argument the value is for: from the method's parameter at the value's place (a class of the program's own), or Java's own maps' methods.
  const arg = argumentAt(p.code, open, p.at);
  let at = -1;
  let fixed = false;
  if (t) {
    const param = splitTopLevel(only(t, method)?.params ?? "")[arg.index]?.trim();
    if (param) {
      at = t.typeParams.indexOf(bareType(param));
      fixed = at < 0 && bareType(param) === to;
    }
  } else if (declared.args.length === 1) at = 0;
  else if (JAVA_MAP.test(declared.cls)) at = MAP_SLOTS[method]?.(arg.count)[arg.index] ?? -1;
  // A comma inside angle brackets in an earlier value can throw the count off: the type argument must be `to`.
  if (at >= 0 && bareType(declared.args[at] ?? "") !== to) at = -1;
  const type = `${declared.cls}<${declared.args.join(", ")}>`;
  const example = typeNamed(own, to, d.file)?.kind === "class" ? `, such as new ${to}(...)` : "";
  const pass = `Pass ${anWord(to)}${example}${convertHint(from, to)}`;
  // The method's parameter has a type of its own there, not a type parameter: the angle brackets have nothing to do with it.
  if (fixed) return `${method} takes ${anWord(to)} here (its parameter is declared as ${to} in ${t!.name}), and this value is ${anWord(from)}. ${pass}.`;
  if (at < 0) return `${recv} is ${anWord(type)}, and ${method} takes ${anWord(to)} here, but this value is ${anWord(from)}. ${pass}.`;
  const param = t?.typeParams[at];
  const other = `${declared.cls}<${declared.args.map((a, i) => (i === at ? (BOX[from] ?? from) : a)).join(", ")}>`;
  const fills = param ? `, so its ${param} is ${to}: ${method} takes ${anWord(to)} here` : `, so ${method} takes ${anWord(to)} here${JAVA_MAP.test(declared.cls) ? ` as the ${at === 0 ? "key" : "value"}` : ""}`;
  return `${recv} is ${anWord(type)}${fills}, and this value is ${anWord(from)}. ${pass}, or, if ${recv} should ${JAVA_MAP.test(declared.cls) ? `have ${from} ${at === 0 ? "keys" : "values"}` : `hold ${from} values`}, declare it as ${other}.`;
}

/** "Box<Integer> cannot be converted to Box<String>": the same class with other types in its angle brackets. */
function otherTypeArguments(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+<.*>) cannot be converted to ([\w$.]+<.*>)$/.exec(d.message);
  const [from, to] = [typeArguments(m?.[1] ?? null), typeArguments(m?.[2] ?? null)];
  if (!m || !from || !to || from.args.join() === to.args.join()) return null;
  const pairs: Record<string, string> = { ArrayList: "List|Collection", LinkedList: "List|Collection|Queue|Deque", HashSet: "Set|Collection", TreeSet: "Set|Collection", HashMap: "Map", TreeMap: "Map", List: "Collection", Set: "Collection" };
  const related = from.cls === to.cls || new RegExp(`^(?:${pairs[from.cls] ?? "-"})$`).test(to.cls) || isSubtype(own, from.cls, to.cls);
  if (!related) return null;
  const parent = from.args.length === 1 && to.args.length === 1 && to.args[0] === "Object" ? ` (even though every ${from.args[0]} is an Object)` : "";
  const diamond = /^new\s/.test(atCaret(d)?.at ?? "") ? ` With new ${from.cls}<>(...), the diamond, Java takes the types from the variable.` : "";
  return `${anWord(m[1]).replace(/^a/, "A")} isn't ${anWord(m[2])}${parent}: the types in the angle brackets must be the same on both sides. Write the same types in both.${diamond}`;
}

/** Whether a name is a type parameter of the program's class that holds a line. */
function typeParamAt(own: OwnClasses, file: string, line: number, name: string): boolean {
  return !!classAt(own, file, line)?.typeParams.includes(name);
}

/** "Object[] cannot be converted to T[]" or "Object cannot be converted to T": an Object where the class's type parameter is wanted. */
function objectForTypeParameter(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: Object(\[\])? cannot be converted to ([\w$]+)(\[\])?$/.exec(d.message);
  if (!m || !!m[1] !== !!m[3] || !typeParamAt(own, d.file, d.line, m[2])) return null;
  const t = m[2];
  const at = atCaret(d)?.at ?? "";
  const created = /^new\s+Object\s*\[([^\]]*)\]/.exec(at);
  if (m[1]) return `${created ? `new Object[${created[1]}] creates` : "This is"} an array of Object, and the variable is ${anWord(`${t}[]`)}. Cast it, as the course does: (${t}[]) new Object[${created?.[1] ?? "10"}]. Java then prints a note that the program uses unchecked or unsafe operations: that's expected, and the program compiles and runs.`;
  if (/^new\s+Object\s*\(/.test(at)) return `${t} stands for the type the class is used with, which isn't known here, so an Object can't go in ${anWord(t)} variable, and new ${t}() isn't possible either. Take the value from outside instead, as a parameter of the constructor or of a method (such as public void add(${t} value)), and store that.`;
  // What the value is: an element of an array, a value from a list's get, or a variable, by the code at javac's caret.
  const p = caretIn(d, own);
  if (!p) return null;
  const ch = p.code[p.at];
  const name =
    ch === "[" || ch === "("
      ? /(?<![\w$.])(?:this\s*\.\s*)?([\w$]+)\s*(?:\.\s*[\w$]+\s*)?$/.exec(p.code.slice(Math.max(0, p.at - 120), p.at))?.[1]
      : ch === "."
        ? /^\.\s*([\w$]+)/.exec(p.code.slice(p.at))?.[1]
        : /^[\w$]+/.exec(p.code.slice(p.at))?.[0];
  const method = ch === "(" ? /\.\s*([\w$]+)\s*$/.exec(p.code.slice(Math.max(0, p.at - 120), p.at))?.[1] : undefined;
  const type = name ? changesOf(p.code, name, p.at).type : null;
  if (!name || !type) return null;
  const unchecked = "Java then prints a note that the program uses unchecked or unsafe operations: that's expected, and the program compiles and runs.";
  // An Object[] whose elements should be T: an element (values[index]) or a loop over it.
  if (type === "Object[]" && ch !== "(")
    return `${name} is an Object[], so its values are Objects, and ${t} stands for the type the class is used with, which may be any class, so Java won't put an Object in ${anWord(t)} variable. Declare ${name} as ${anWord(`${t}[]`)} instead, created with a cast as the course does (${name} = (${t}[]) new Object[10])${forEachAt(d, own) ? "" : `, or put (${t}) in front of the value`}. ${unchecked}`;
  // A List<Object> whose values should be T.
  const list = typeArguments(type);
  if (list && /^(?:List|ArrayList|LinkedList)$/.test(list.cls) && list.args.length === 1 && bareType(list.args[0]) === "Object" && method === "get")
    return `${name} is ${anWord(type)}, so ${name}.get(...) gives an Object, and ${t} stands for the type the class is used with, which may be any class, so Java won't put an Object in ${anWord(t)} variable. Declare ${name} as a List<${t}> instead, and create it with new ArrayList<>(): then get gives ${anWord(t)}.`;
  // A variable declared as Object (a parameter, say): it should be declared as T.
  if (type === "Object" && ch !== "(" && ch !== "[" && ch !== ".")
    return `${name} is declared as Object, and ${t} stands for the type the class is used with, which may be any class, so Java won't put an Object in ${anWord(t)} variable. Declare ${name} as ${t} instead, as in a parameter declared as ${t}.`;
  return null;
}

/** For Java's own maps: whether what a method gives (or a loop over what it gives goes through) has the keys' type (0) or the values' type (1). */
const MAP_GIVES: Record<string, number> = { get: 1, getOrDefault: 1, put: 1, remove: 1, putIfAbsent: 1, replace: 1, values: 1, keySet: 0, firstKey: 0, lastKey: 0, floorKey: 0, ceilingKey: 0, higherKey: 0, lowerKey: 0 };

/** "incompatible types: Object cannot be converted to String" from a variable of a generic class declared without its type in angle brackets. */
function rawGeneric(d: Diagnostic, own: OwnClasses): string | null {
  const to = /^incompatible types: Object cannot be converted to ([\w$.]+)$/.exec(d.message)?.[1];
  const p = caretIn(d, own);
  if (!to || !p) return null;
  const wanted = BOX[to] ?? simple(to);
  const loop = forEachAt(d, own);
  const call = p.code[p.at] === "(" ? /(?<![\w$.])((?:this\s*\.\s*)?[\w$]+)\s*\.\s*([\w$]+)\s*$/.exec(p.code.slice(Math.max(0, p.at - 120), p.at)) : null;
  const recv = loop?.collection && /^(?:this\s*\.\s*)?[\w$]+$/.test(loop.collection) ? loop.collection : call?.[1];
  if (!recv) return null;
  const name = recv.replace(/^this\s*\.\s*/, "");
  const type = changesOf(p.code, name, p.at).type;
  if (!type || type.includes("<")) return null;
  const t = typeNamed(own, type, d.file);
  if (!(t?.typeParams.length || GENERIC_LIBRARY.test(type))) return null;
  // Java's own maps have two types in angle brackets, of the keys and of the values: which one this is depends on the method.
  if (!t && JAVA_MAP.test(type)) {
    const slot = call ? MAP_GIVES[call[2]] : undefined;
    if (slot === undefined) return null;
    const [part, other] = slot === 0 ? ["keys", "values"] : ["values", "keys"];
    const what = loop ? `its ${part} are Objects for Java` : `${call![2]}() gives an Object`;
    return `${name} is declared as ${type}, without types in angle brackets, so ${what}, and an Object can't go in ${anWord(to)} variable. Declare ${name} with the types of its keys and values in angle brackets: ${type}<${slot === 0 ? `${wanted}, ...` : `..., ${wanted}`}> (with the type of its ${other} in place of ...). Then ${loop ? `its ${part} are ${wanted} objects` : `${call![2]}() gives ${anWord(wanted)}`}.`;
  }
  const params = t?.typeParams ?? [];
  // The type parameter that the method gives, for a class of the program's own: K for getKey() in Pair<K, V>.
  let gives: string | undefined;
  if (call && t) {
    const member = t.members.find((x) => x.method && x.name === call[2]);
    if (member) gives = bareType(member.type);
    else {
      // Inherited from another of the program's types: one that gives a type of its own (such as Object) gives it whatever the angle brackets say.
      const inherited = ancestorsOf(own, t.name)
        .map((a) => ({ a, m: a.members.find((x) => x.method && x.name === call[2]) }))
        .find((x) => x.m);
      if (inherited && !inherited.a.typeParams.includes(bareType(inherited.m!.type))) return null;
    }
    if (gives !== undefined && !params.includes(gives)) return null;
  }
  const at = gives ? params.indexOf(gives) : params.length === 1 ? 0 : -1;
  const filled = params.length > 1 ? `${type}<${params.map((_, i) => (i === at ? wanted : "...")).join(", ")}>` : `${type}<${wanted}>`;
  const what = loop ? `its values are Objects for Java` : `${call![2]}() gives an Object`;
  const rest = params.filter((_, i) => i !== at);
  const fill = params.length > 1 ? ` (with the type${rest.length > 1 ? "s" : ""} for ${listed(rest)} in place of ...)` : "";
  return `${name} is declared as ${type}, without a type in angle brackets, so ${what}, and an Object can't go in ${anWord(to)} variable. Declare ${name} with its type in angle brackets: ${filled}${fill}. Then ${loop ? `its values are ${wanted} objects` : `${call![2]}() gives ${anWord(wanted)}`}.`;
}

/** A class that implements (or extends) one of the program's generic types without a type in angle brackets, so the method it must have takes Object. */
function rawOwnGeneric(own: OwnClasses, cls: string, parent: OwnClass, method: string, params: string): string {
  const keyword = parent.kind === "interface" ? "implements" : "extends";
  const tp = parent.typeParams;
  const wanted = splitTopLevel(params).map(bareType);
  // The parent's own declaration of the method, as written: which of its parameters have a type parameter for a type.
  const theirs = parent.members.find((x) => x.method && x.name === method && x.params != null && splitTopLevel(x.params).length === wanted.length);
  // The method the class already has: the same name, as many parameters, and the same types wherever javac's list doesn't say Object.
  const has = typeNamed(own, cls)?.members.find((x) => {
    if (!x.method || x.name !== method || x.params == null || x.params === params) return false;
    const ps = splitTopLevel(x.params).map(bareType);
    return ps.length === wanted.length && ps.every((q, i) => wanted[i] === "Object" || q === wanted[i]);
  });
  const at = theirs && tp.length === 1 ? splitTopLevel(theirs.params!).map(bareType).indexOf(tp[0]) : wanted.indexOf("Object");
  const guess = has && tp.length === 1 && at >= 0 ? splitTopLevel(has.params!)[at]?.trim() : undefined;
  const sample = `${keyword} ${parent.name}<${tp.map((_, i) => SAMPLE_TYPES[i] ?? "String").join(", ")}>`;
  const header = guess ? `: ${keyword} ${parent.name}<${guess}>` : `, in place of ${listed(tp)} in ${keyword} ${parent.name}<${tp.join(", ")}> (such as ${sample})`;
  let then = "";
  if (has) then = ` Then the ${method}(${spaced(has.params!)}) that ${cls} already has is the one it needs.`;
  else {
    // The parent's header of the method, with the sample types in place of its type parameters: public void put(String value).
    const code = own.code.get(parent.file)?.slice(parent.from - 1, parent.to).join("\n") ?? "";
    const written = new RegExp(`(?<![\\w$.])${escapeRegExp(method)}\\s*\\(([^()]*)\\)`).exec(code)?.[1];
    const sampled = (text: string) => tp.reduce((acc, q, i) => acc.replace(new RegExp(`(?<![\\w$.])${escapeRegExp(q)}(?![\\w$])`, "g"), SAMPLE_TYPES[i] ?? "String"), text);
    const list = written != null ? declared(written) : [];
    const example = theirs && written != null && list.length === wanted.length ? `: for ${sample.replace(/^\w+ /, "")}, that's public ${sampled(theirs.type)} ${method}(${list.map((q) => `${sampled(q.type)} ${q.name}`).join(", ")}) { ... }` : "";
    then = ` Then add ${method} to ${cls}, with the type${tp.length > 1 ? "s" : ""} you wrote in place of ${listed(tp)} wherever ${parent.name}'s ${method} has ${tp.length > 1 ? "them" : "it"}${example}.`;
  }
  return `${cls} ${keyword} ${parent.name} without a type in angle brackets, so Java fills in Object for ${listed(tp)}, and expects ${method}(${spaced(params)}). Write the type${tp.length > 1 ? "s" : ""} in ${cls}'s header${header}.${then}`;
}

/**
 * The array access javac's caret is on, whose caret can be on one of its [ ]: grid and [0] for
 * grid[0], also when the caret is on the [.
 */
function accessAtCaret(c: { line: string; at: string }): { name: string; groups: string; text: string } | null {
  const before = /((?:this\s*\.\s*)?[\w$]+)\s*((?:\[[^\]]*\]\s*)*)$/.exec(beforeCaret(c));
  const fromName = /^((?:this\s*\.\s*)?[\w$]+)\s*((?:\[[^\]]*\]\s*)+)/.exec(c.at);
  const after = /^((?:\[[^\]]*\]\s*)+)/.exec(c.at);
  const [name, groups] = after && before ? [before[1], before[2] + after[1]] : fromName ? [fromName[1], fromName[2]] : [null, null];
  if (!name || !groups) return null;
  const g = groups.replace(/\s+/g, "");
  return { name, groups: g, text: `${name}${g}` };
}

/** Depth and base of an array type: int and 2 for int[][]. */
const arrayType = (t: string) => ({ base: t.replace(/(\[\])+$/, ""), depth: (t.match(/\[\]/g) ?? []).length });
/** An array type in words, for a value: "a two-dimensional array (an int[][])". */
const arrayWords = (t: string) => {
  const { depth } = arrayType(t);
  return depth === 0 ? anWord(t) : depth === 1 ? `a one-dimensional array (${anWord(t)})` : `a ${depth === 2 ? "two" : depth === 3 ? "three" : depth}-dimensional array (${anWord(t)})`;
};

/**
 * Array types with a different number of brackets: "int[] cannot be converted to int", "int cannot
 * be converted to int[]", "int[][] cannot be converted to int[]": a row where one value is wanted,
 * one value put in a row, a pair of brackets missing.
 */
function arrayLevels(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+(?:\[\])*) cannot be converted to ([\w$.]+(?:\[\])*)$/.exec(d.message);
  if (!m) return null;
  const [from, to] = [arrayType(m[1]), arrayType(m[2])];
  if (from.base !== to.base || from.depth === to.depth) return null;
  const c = atCaret(d);
  const p = caretIn(d, own);
  const levels = `${cap(anWord(`${to.base}[][]`))} is an array of rows: grid[row] is one row, ${anWord(`${to.base}[]`)}, and grid[row][column] is one value, ${anWord(to.base)}.`;
  // for (int value : grid): each element of a two-dimensional array is a row.
  const loop = forEachAt(d, own);
  if (loop && from.depth === to.depth + 1) {
    const coll = loop.collection ?? "the array";
    if (from.depth === 1) return `Each element of ${coll} is a row, ${anWord(m[1])}, not one ${to.base}. Go through the rows, and then through each row's values: for (${m[1]} row : ${coll}) { for (${m[2]} ${loop.variable} : row) { ... } }.`;
    return `Each element of ${coll} is ${arrayWords(m[1])}, not ${anWord(m[2])}. Give the loop variable that type: for (${m[1]} ${loop.variable} : ${coll}).`;
  }
  if (!c || !p) return null;
  const before = p.code.slice(Math.max(0, p.at - 200), p.at);
  // new int[3][4] for an int[] variable, or new int[3] for an int[][] one.
  const created = /^new\s+[\w$.]+\s*((?:\[[^\]]*\])+)/.exec(c.at);
  if (created) {
    const declared = /([\w$.]+(?:\s*\[\s*\])+)\s+([\w$]+)\s*=\s*$/.exec(before);
    const v = declared?.[2] ?? /([\w$.]+)\s*=\s*$/.exec(before)?.[1]?.replace(/^this\./, "");
    const made = `new ${from.base}${created[1].replace(/\s+/g, "")}`;
    if (from.depth > to.depth)
      return `${made} creates ${arrayWords(m[1])}, but ${v ?? "the variable"} is ${anWord(m[2])}, with ${to.depth === 1 ? "one pair" : `${to.depth} pairs`} of brackets. Give the variable's type as many pairs of brackets as there are sizes in new: ${m[1]}${v ? ` ${v}` : ""}.`;
    return `${made} creates ${arrayWords(m[1])}, but ${v ?? "the variable"} is ${anWord(m[2])}. Give new a size for each pair of brackets, as in new ${to.base}[3][4] for 3 rows of 4 values. To create the rows later, leave the last size out: new ${to.base}[3][].`;
  }
  // grid[1] = 5: a value put in a row.
  const target = /(?<![\w$.])((?:this\s*\.\s*)?[\w$]+)\s*((?:\[[^\]]*\])+)\s*=\s*$/.exec(before);
  if (target && from.depth < to.depth) {
    const shown = `${target[1]}${target[2]}`.replace(/\s+/g, "");
    if (to.depth === from.depth + 1 && from.depth === 0)
      return `${shown} is a whole row of ${target[1]}, ${anWord(m[2])}, so it can't hold one ${from.base}. To set one value, give both indexes, the row and then the column: ${shown}[column] = ...;`;
    return `${shown} is ${arrayWords(m[2])}, and the value is ${arrayWords(m[1])}. Give as many indexes as it takes to reach one value: ${levels}`;
  }
  // int[][] grid = {1, 2, 3}: the rows of a two-dimensional array's initializer need braces of their own.
  if (from.depth < to.depth && /=\s*\{[^;]*$/.test(before) && !/[)\]]\s*\{[^{}]*$/.test(before))
    return `A two-dimensional array is an array of rows, so its initializer lists rows, each in braces of its own: {{1, 2, 3}, {4, 5, 6}} is two rows of three values.`;
  // A row where one value is wanted: grid[0] for grid[0][2], or one value where a row is wanted.
  const value = accessAtCaret(c);
  const assigned = !!value && new RegExp(`(?<![=!<>])=\\s*${escapeRegExp(value.name)}\\s*\\[`).test(c.line);
  const brackets = value?.groups.match(/\[/g)?.length ?? 0;
  if (value && from.depth > to.depth) {
    if (from.depth === 1 && to.depth === 0 && brackets === 1)
      return `${value.name} is a two-dimensional array, so ${value.text} is a whole row of it, ${anWord(m[1])}, not one ${to.base}. For one value, give both indexes, the row and then the column: ${value.text}[column].`;
    return `${value.text} is ${arrayWords(m[1])}, not ${anWord(m[2])}. Give as many indexes as it takes: ${levels}`;
  }
  if (value && from.depth < to.depth && brackets >= 2 && assigned) {
    const fewer = `${value.name}${value.groups.replace(/\[[^\]]*\]$/, "")}`;
    return `${value.text} is one value of ${value.name}, ${anWord(m[1])}, and the variable is ${anWord(m[2])}, a whole row. For the row, give one index less: ${fewer}.`;
  }
  // A value passed to a method that takes another kind of array.
  let depth = 0;
  for (let k = p.at - 1; k >= 0 && k > p.at - 300; k--) {
    const ch = p.code[k];
    if (")]}".includes(ch)) depth++;
    else if ("([{".includes(ch)) {
      if (depth-- > 0) continue;
      const method = ch === "(" ? /([\w$]+)\s*$/.exec(p.code.slice(Math.max(0, k - 60), k))?.[1] : undefined;
      if (!method || NOT_A_METHOD.test(method)) break;
      const arg = (/^\[/.test(c.at) && value ? value.text : /^[^,()]*(?:\([^()]*\)[^,()]*)*/.exec(c.at)?.[0].trim()) || "the value";
      const fix =
        from.depth > to.depth
          ? `To pass one row, write ${/^[\w$.]+$/.test(arg) ? `${arg}[row]` : "one row"}; to pass the whole array, change the parameter to ${m[1]}.`
          : `To pass the whole array, pass it without an index; or change the parameter to ${m[1]}.`;
      return `${method} takes ${arrayWords(m[2])}, and ${arg} is ${arrayWords(m[1])}. ${fix}`;
    } else if (ch === ";") break;
  }
  // The code before the value (javac's caret is on the ( of a method call, as in names.get(0)).
  const lhs = c.at.startsWith("(") ? before.replace(/(?:[\w$]+\s*\.\s*)*[\w$]+\s*$/, "") : before;
  const declared = /([\w$.]+(?:\s*\[\s*\])*)\s+([\w$]+)\s*=\s*$/.exec(lhs);
  const assignedTo = declared?.[2] ?? /(?<![\w$.])(?:this\s*\.\s*)?([\w$]+)\s*=(?!=)\s*$/.exec(lhs)?.[1];
  const valueName = /^((?:this\s*\.\s*)?[\w$]+)\s*(?=[;),])/.exec(c.at)?.[1];
  if (from.depth === 1 && to.depth === 0)
    return `${valueName ? `${valueName} is` : "This is"} an array of ${from.base} values, and ${assignedTo ? `${assignedTo} holds` : `${anWord(to.base)} variable holds`} one ${to.base}. Give the index of the value you want, as in ${valueName ?? "values"}[0].`;
  if (from.depth === 0 && to.depth === 1) {
    if (declared && assignedTo) return `${assignedTo} is declared as ${anWord(m[2])}, an array, and this value is one ${from.base}. To keep one value, declare it as ${from.base} ${assignedTo}. To make an array, create it with new ${from.base}[size] and put values in at their indexes.`;
    if (assignedTo) return `${assignedTo} is ${anWord(m[2])}, an array, and this value is one ${from.base}. To put the value in the array, give the index where it goes: ${assignedTo}[0] = ...;`;
    return `This is one ${from.base}, and ${anWord(m[2])} is an array of them. To put it in an array, give the index where it goes, as in values[0] = ...;`;
  }
  return `${cap(arrayWords(m[1]))} can't go where ${anWord(m[2])} is wanted: each pair of brackets is one level of array. ${levels}`;
}

/** "array required, but int found": an index on a value that isn't an array (one index too many, or a String or a list). */
function arrayRequired(d: Diagnostic): string {
  const found = /^array required, but (.+) found$/.exec(d.message)?.[1] ?? "";
  const c = atCaret(d);
  const before = c ? beforeCaret(c) : "";
  const used = /((?:this\s*\.\s*)?[\w$]+)\s*((?:\[[^\]]*\])*)\s*$/.exec(before);
  const v = used?.[1] ?? "text";
  if (found === "String") return `A String isn't an array, so it can't take an index in [ ]. To get one of its characters, use charAt: ${v}.charAt(${/^\[([^\]]*)\]/.exec(c?.at ?? "")?.[1] ?? "0"}).`;
  const kind = /^(?:List|ArrayList|LinkedList)\b/.test(found) ? "list" : /^(?:Map|HashMap|TreeMap)\b/.test(found) ? "map" : /^[A-Z]/.test(found) ? "object" : null;
  const index = /^\[([^\]]*)\]/.exec(c?.at ?? "")?.[1] ?? "0";
  if (kind === "list") return `A list isn't an array, so it can't take an index in [ ]. Use get: ${v}.get(${index}).`;
  if (kind === "map") return `A map isn't an array, so it can't take a key in [ ]. Use get: ${v}.get(${index}).`;
  if (kind === "object" || !used?.[2]) return `This value is ${anWord(found)}, not an array, so it can't take an index in [ ].`;
  const shown = `${used[1]}${used[2]}`.replace(/\s+/g, "");
  const n = (used[2].match(/\[/g) ?? []).length;
  return `${shown} is already one ${found} value, so there is nothing for another index to pick. ${used[1]} takes ${n === 1 ? "one index" : `${n} indexes`}${n === 2 ? ", the row and then the column" : ""}: remove the extra one.`;
}

/** new Random(...) with a value that isn't a whole number: "no suitable constructor found for Random(String)". */
function randomSeed(d: Diagnostic): string {
  const given = /^no suitable constructor found for Random\((.*?)\)/.exec(d.message)?.[1] ?? "";
  const one = given && !given.includes(",");
  const what = !given ? "" : !one ? ` Here it got ${given.split(",").length} values.` : given === "String" ? " Here it got text: write the number without quotes." : /^(?:double|float|Double|Float)$/.test(given) ? ` Here it got ${anWord(given)}: a seed has no decimals.` : ` Here it got ${anWord(given)}.`;
  return `new Random(...) takes a seed, which must be a whole number, such as new Random(42): the same seed gives the same numbers on every run. Or leave it out, new Random(), for different numbers each time.${what} (Java also lists a constructor Random(Void), which it keeps for itself: ignore it.)`;
}

/** javac's note about unchecked or unsafe operations, such as the cast in (T[]) new Object[10]. */
function uncheckedNote(): string {
  return "This is a note, not an error. Java says it can't check some types for you, most often because of a cast such as (T[]) new Object[10] in a generic class (the way the course builds its own lists), or a class used without its type in angle brackets, such as ArrayList instead of ArrayList<String>. The cast is fine to keep; @SuppressWarnings(\"unchecked\") above its method or constructor hides the note.";
}

/**
 * The message of a ClassCastException: "class Dog cannot be cast to class Cat (Dog and Cat are in
 * unnamed module of loader 'app')". `library` is whether it was thrown in Java's own code (its first
 * stack frame isn't in one of the learner's files), such as a TreeSet comparing its elements: then
 * the learner wrote no cast there.
 */
function explainCast(m: string, library = false, crash?: CrashContext): string {
  const c = /^class (\S+) cannot be cast to class (\S+)/.exec(m);
  if (!c) return "The program cast an object to a type it isn't.";
  const [fromArray, toArray] = [arrayTypeName(c[1]), arrayTypeName(c[2])];
  if (fromArray && toArray) return arrayCast(fromArray, toArray, c[2], library ? undefined : crash);
  const [from, to] = [fromArray ?? binarySimple(c[1]), toArray ?? binarySimple(c[2])];
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

// ---- Graphical user interfaces with JavaFX (MOOC part 13) ----

/**
 * Java Arena's practice version of JavaFX (engine/libraries/javafx): each public class and interface,
 * its package, its parent among these ("" for none, or for a class of Java's own), and the public
 * methods it declares itself (not Object's, nor an enum's values and valueOf). Learners' programs use
 * the same names as real JavaFX, but the practice version has only what the lessons use.
 * scripts/explanations.test.mjs checks this table against the library's class files.
 */
const FX: Record<string, { pkg: string; parent: string; methods: string }> = {
  Application: { pkg: "javafx.application", parent: "", methods: "launch init start stop getParameters" },
  Platform: { pkg: "javafx.application", parent: "", methods: "runLater exit isFxApplicationThread" },
  ObservableValue: { pkg: "javafx.beans.value", parent: "", methods: "addListener removeListener getValue" },
  ChangeListener: { pkg: "javafx.beans.value", parent: "", methods: "changed" },
  StringProperty: { pkg: "javafx.beans.property", parent: "ObservableValue", methods: "get set getValue setValue" },
  SimpleStringProperty: { pkg: "javafx.beans.property", parent: "StringProperty", methods: "get set addListener removeListener" },
  DoubleProperty: { pkg: "javafx.beans.property", parent: "ObservableValue", methods: "get set getValue setValue" },
  SimpleDoubleProperty: { pkg: "javafx.beans.property", parent: "DoubleProperty", methods: "get set addListener removeListener" },
  ObservableList: { pkg: "javafx.collections", parent: "", methods: "addAll setAll removeAll remove" },
  FXCollections: { pkg: "javafx.collections", parent: "", methods: "observableArrayList" },
  Event: { pkg: "javafx.event", parent: "", methods: "" },
  ActionEvent: { pkg: "javafx.event", parent: "Event", methods: "" },
  EventHandler: { pkg: "javafx.event", parent: "", methods: "handle" },
  EventType: { pkg: "javafx.event", parent: "", methods: "getName" },
  Insets: { pkg: "javafx.geometry", parent: "", methods: "getTop getRight getBottom getLeft" },
  Pos: { pkg: "javafx.geometry", parent: "", methods: "" },
  Point2D: { pkg: "javafx.geometry", parent: "", methods: "getX getY distance add subtract multiply normalize midpoint angle magnitude dotProduct" },
  Bounds: { pkg: "javafx.geometry", parent: "", methods: "getMinX getMinY getMinZ getWidth getHeight getDepth getMaxX getMaxY getMaxZ getCenterX getCenterY getCenterZ isEmpty contains intersects" },
  BoundingBox: { pkg: "javafx.geometry", parent: "Bounds", methods: "isEmpty contains intersects" },
  Node: { pkg: "javafx.scene", parent: "", methods: "setId getId setDisable isDisable isDisabled setVisible isVisible getParent getScene setStyle getStyle lookup setOnMousePressed getOnMousePressed setOnMouseDragged getOnMouseDragged setOnMouseReleased getOnMouseReleased setOnMouseClicked getOnMouseClicked setTranslateX getTranslateX setTranslateY getTranslateY setLayoutX getLayoutX setLayoutY getLayoutY setRotate getRotate getBoundsInLocal getBoundsInParent setOnKeyPressed getOnKeyPressed setOnKeyReleased getOnKeyReleased setOnKeyTyped getOnKeyTyped requestFocus" },
  Parent: { pkg: "javafx.scene", parent: "Node", methods: "getChildrenUnmodifiable lookup" },
  Scene: { pkg: "javafx.scene", parent: "", methods: "getRoot setRoot getWidth getHeight setOnKeyPressed getOnKeyPressed setOnKeyReleased getOnKeyReleased setOnKeyTyped getOnKeyTyped" },
  Region: { pkg: "javafx.scene.layout", parent: "Parent", methods: "setPadding getPadding setPrefWidth getPrefWidth setPrefHeight getPrefHeight setPrefSize setMinSize setMaxSize" },
  Pane: { pkg: "javafx.scene.layout", parent: "Region", methods: "getChildren" },
  FlowPane: { pkg: "javafx.scene.layout", parent: "Pane", methods: "setHgap getHgap setVgap getVgap setAlignment getAlignment" },
  HBox: { pkg: "javafx.scene.layout", parent: "Pane", methods: "setSpacing getSpacing setAlignment getAlignment" },
  VBox: { pkg: "javafx.scene.layout", parent: "Pane", methods: "setSpacing getSpacing setAlignment getAlignment" },
  StackPane: { pkg: "javafx.scene.layout", parent: "Pane", methods: "setAlignment getAlignment" },
  BorderPane: { pkg: "javafx.scene.layout", parent: "Pane", methods: "setTop getTop setLeft getLeft setCenter getCenter setRight getRight setBottom getBottom" },
  GridPane: { pkg: "javafx.scene.layout", parent: "Pane", methods: "add getColumnIndex getRowIndex setHgap getHgap setVgap getVgap setAlignment getAlignment" },
  Control: { pkg: "javafx.scene.control", parent: "Region", methods: "" },
  Labeled: { pkg: "javafx.scene.control", parent: "Control", methods: "textProperty setText getText setFont getFont setWrapText isWrapText" },
  Label: { pkg: "javafx.scene.control", parent: "Labeled", methods: "" },
  ButtonBase: { pkg: "javafx.scene.control", parent: "Labeled", methods: "setOnAction getOnAction fire" },
  Button: { pkg: "javafx.scene.control", parent: "ButtonBase", methods: "fire" },
  TextInputControl: { pkg: "javafx.scene.control", parent: "Control", methods: "textProperty getText setText appendText clear setPromptText getPromptText setEditable isEditable getLength setFont getFont" },
  TextField: { pkg: "javafx.scene.control", parent: "TextInputControl", methods: "setOnAction getOnAction" },
  PasswordField: { pkg: "javafx.scene.control", parent: "TextField", methods: "" },
  TextArea: { pkg: "javafx.scene.control", parent: "TextInputControl", methods: "setWrapText isWrapText" },
  Slider: { pkg: "javafx.scene.control", parent: "Control", methods: "setMin getMin setMax getMax setValue getValue valueProperty setShowTickLabels isShowTickLabels setShowTickMarks isShowTickMarks setMajorTickUnit getMajorTickUnit setMinorTickCount getMinorTickCount setBlockIncrement getBlockIncrement setSnapToTicks isSnapToTicks" },
  Font: { pkg: "javafx.scene.text", parent: "", methods: "getDefault font getName getFamily getStyle getSize" },
  Text: { pkg: "javafx.scene.text", parent: "Shape", methods: "setText getText setX getX setY getY setFont getFont" },
  Shape: { pkg: "javafx.scene.shape", parent: "Node", methods: "setFill getFill setStroke getStroke setStrokeWidth getStrokeWidth intersect" },
  Polygon: { pkg: "javafx.scene.shape", parent: "Shape", methods: "getPoints" },
  Circle: { pkg: "javafx.scene.shape", parent: "Shape", methods: "setCenterX getCenterX setCenterY getCenterY setRadius getRadius" },
  Rectangle: { pkg: "javafx.scene.shape", parent: "Shape", methods: "setX getX setY getY setWidth getWidth setHeight getHeight" },
  Line: { pkg: "javafx.scene.shape", parent: "Shape", methods: "setStartX getStartX setStartY getStartY setEndX getEndX setEndY getEndY" },
  Path: { pkg: "javafx.scene.shape", parent: "Shape", methods: "" },
  AnimationTimer: { pkg: "javafx.animation", parent: "", methods: "handle start stop" },
  Paint: { pkg: "javafx.scene.paint", parent: "", methods: "" },
  Color: { pkg: "javafx.scene.paint", parent: "Paint", methods: "color rgb web brighter darker grayscale invert getRed getGreen getBlue getOpacity" },
  Canvas: { pkg: "javafx.scene.canvas", parent: "Node", methods: "getGraphicsContext2D setWidth getWidth setHeight getHeight" },
  GraphicsContext: { pkg: "javafx.scene.canvas", parent: "", methods: "getCanvas setFill getFill setStroke getStroke setLineWidth getLineWidth setFont getFont fillRect strokeRect clearRect fillOval strokeOval strokeLine fillText strokeText fillPolygon strokePolygon" },
  InputEvent: { pkg: "javafx.scene.input", parent: "Event", methods: "" },
  MouseEvent: { pkg: "javafx.scene.input", parent: "InputEvent", methods: "getEventType getX getY getSceneX getSceneY" },
  KeyEvent: { pkg: "javafx.scene.input", parent: "InputEvent", methods: "getEventType getCharacter getText getCode isShiftDown isControlDown isAltDown isMetaDown isShortcutDown" },
  KeyCode: { pkg: "javafx.scene.input", parent: "", methods: "getName getCode getChar isFunctionKey isNavigationKey isArrowKey isModifierKey isLetterKey isDigitKey isKeypadKey isWhitespaceKey isMediaKey getKeyCode" },
  Image: { pkg: "javafx.scene.image", parent: "", methods: "getWidth getHeight isError getException getPixelReader" },
  WritableImage: { pkg: "javafx.scene.image", parent: "Image", methods: "getPixelWriter" },
  PixelReader: { pkg: "javafx.scene.image", parent: "", methods: "getArgb getColor" },
  PixelWriter: { pkg: "javafx.scene.image", parent: "", methods: "setArgb setColor" },
  ImageView: { pkg: "javafx.scene.image", parent: "Node", methods: "setImage getImage" },
  Chart: { pkg: "javafx.scene.chart", parent: "Region", methods: "setTitle getTitle setLegendVisible isLegendVisible setAnimated getAnimated" },
  XYChart: { pkg: "javafx.scene.chart", parent: "Chart", methods: "getXAxis getYAxis getData setData" },
  LineChart: { pkg: "javafx.scene.chart", parent: "XYChart", methods: "setCreateSymbols getCreateSymbols" },
  BarChart: { pkg: "javafx.scene.chart", parent: "XYChart", methods: "" },
  ScatterChart: { pkg: "javafx.scene.chart", parent: "XYChart", methods: "" },
  Axis: { pkg: "javafx.scene.chart", parent: "Region", methods: "setLabel getLabel setAutoRanging isAutoRanging" },
  ValueAxis: { pkg: "javafx.scene.chart", parent: "Axis", methods: "setLowerBound getLowerBound setUpperBound getUpperBound setMinorTickVisible isMinorTickVisible" },
  NumberAxis: { pkg: "javafx.scene.chart", parent: "ValueAxis", methods: "setTickUnit getTickUnit setForceZeroInRange isForceZeroInRange" },
  CategoryAxis: { pkg: "javafx.scene.chart", parent: "Axis", methods: "getCategories" },
  Window: { pkg: "javafx.stage", parent: "", methods: "getWidth setWidth getHeight setHeight getScene isShowing hide" },
  Stage: { pkg: "javafx.stage", parent: "Window", methods: "setTitle getTitle setScene show close setResizable isResizable" },
};

/** For the unit test that checks the table against the library's class files. */
export { FX as PRACTICE_JAVAFX };

/** The practice version's packages, in the order of the table. */
const FX_PACKAGES = [...new Set(Object.values(FX).map((c) => c.pkg))];
/** The events the practice version has, in a sentence's words. */
const FX_EVENTS = "setOnAction (a click on a Button, or Enter in a TextField), the mouse events of a Canvas or an ImageView, setOnMousePressed, setOnMouseDragged, setOnMouseReleased and setOnMouseClicked, and the key events of a Scene, setOnKeyPressed, setOnKeyReleased and setOnKeyTyped";
/** The nodes a program creates with new: the controls, the panes and the shapes (not Shape, which is abstract, or Path, which only Shape.intersect gives). */
const FX_NODES = ["Label", "Button", "TextField", "PasswordField", "TextArea", "Slider", "FlowPane", "HBox", "VBox", "StackPane", "BorderPane", "GridPane", "Pane", "Canvas", "ImageView", "Polygon", "Circle", "Rectangle", "Line", "Text", "LineChart", "BarChart", "ScatterChart"];
const FX_CONTROLS = "Label, Button, TextField, PasswordField, TextArea and Slider";
const FX_PANES = "FlowPane, HBox, VBox, StackPane, BorderPane, GridPane and Pane";

/**
 * Classes of real JavaFX that the practice version doesn't have, which programs often use, by their
 * package (each checked against OpenJFX 21.0.12): an explanation can then say that real JavaFX has
 * the class and the practice version doesn't, instead of guessing at a misspelling.
 */
const REAL_FX: Record<string, string> = Object.fromEntries(
  Object.entries({
    "javafx.scene.control": "CheckBox RadioButton ToggleButton ToggleGroup ComboBox ChoiceBox ListView TableView TableColumn Spinner ProgressBar ProgressIndicator Hyperlink MenuBar Menu MenuItem ScrollPane TabPane Tab Separator Tooltip Alert ButtonType Dialog TextInputDialog DatePicker ColorPicker TitledPane SplitPane",
    "javafx.scene.layout": "AnchorPane TilePane Background BackgroundFill Border Priority ColumnConstraints RowConstraints CornerRadii",
    "javafx.scene": "Group Cursor",
    "javafx.scene.shape": "Rectangle Circle Line Ellipse Polygon Polyline Arc Shape Path",
    "javafx.scene.paint": "LinearGradient RadialGradient ImagePattern",
    "javafx.scene.text": "Text TextFlow FontWeight FontPosture TextAlignment",
    "javafx.scene.input": "KeyEvent KeyCode MouseButton ScrollEvent",
    "javafx.scene.image": "PixelFormat",
    "javafx.scene.chart": "PieChart AreaChart StackedBarChart BubbleChart",
    "javafx.scene.media": "AudioClip Media MediaPlayer MediaView",
    "javafx.animation": "Timeline KeyFrame KeyValue AnimationTimer FadeTransition TranslateTransition RotateTransition ScaleTransition FillTransition StrokeTransition PathTransition ParallelTransition SequentialTransition PauseTransition Transition Animation Interpolator",
    "javafx.util": "Duration Pair Callback StringConverter",
    "javafx.geometry": "HPos VPos Orientation Side",
    "javafx.stage": "FileChooser DirectoryChooser Modality StageStyle Screen WindowEvent",
    "javafx.beans.property": "SimpleIntegerProperty IntegerProperty SimpleBooleanProperty BooleanProperty SimpleObjectProperty ObjectProperty ReadOnlyStringProperty",
    "javafx.beans.binding": "Bindings",
    "javafx.beans": "InvalidationListener Observable",
    "javafx.collections": "ListChangeListener ObservableMap",
  }).flatMap(([pkg, names]) => names.split(" ").map((name) => [name, pkg])),
);
/** Packages of real JavaFX (its modules base, graphics, controls, fxml, media, web and swing) that the practice version has nothing of. */
const REAL_FX_PACKAGES = new Set(
  "javafx.beans javafx.beans.binding javafx.beans.property.adapter javafx.collections.transformation javafx.concurrent javafx.css javafx.print javafx.scene.control.cell javafx.scene.effect javafx.scene.robot javafx.scene.transform javafx.util javafx.util.converter javafx.fxml javafx.scene.media javafx.scene.web javafx.embed.swing".split(" "),
);

/** An FX class's parents, nearest first. */
function fxAncestors(name: string): string[] {
  const out: string[] = [];
  for (let t = FX[name]?.parent; t && out.length < 20; t = FX[t]?.parent) out.push(t);
  return out;
}
/** Whether FX class `sub` is `sup` or a kind of it. */
const fxIsKind = (sub: string, sup: string) => sub === sup || fxAncestors(sub).includes(sup);
/** The practice version's methods of an FX class: its own and its parents'. */
const fxMethods = (name: string) => [...new Set([name, ...fxAncestors(name)].flatMap((t) => (FX[t]?.methods ? FX[t].methods.split(" ") : [])))];
/** Whether the program uses JavaFX: one of its files mentions javafx. (as src/grader/javafx.js decides). */
const usesFX = (own: OwnClasses) => [...own.code.values()].some((lines) => lines.some((l) => /\bjavafx\s*\./.test(l)));
/**
 * Whether the program is meant as a JavaFX program: it mentions javafx., or (with every import
 * forgotten) one of its classes extends Application and it has no Application of its own. Only then
 * does a name such as Stage, Button or Node mean JavaFX's class.
 */
const fxProgram = (own: OwnClasses) => usesFX(own) || (!knows(own, "Application") && [...own.types.values()].some((t) => t.extends.includes("Application")));

/** The FX class a type of the program is: the type itself, or the one an own class extends, as VBox for class MenuView extends VBox. */
function fxTypeOf(own: OwnClasses, type: string): string | null {
  if (FX[type] && !knows(own, type)) return type;
  const t = typeNamed(own, type);
  for (const a of t ? [t, ...ancestorsOf(own, t.name)] : []) for (const s of a.extends) if (FX[s] && !knows(own, s)) return s;
  return null;
}

/** Whether one of the program's classes extends Application, itself or through another of its classes. */
const extendsApplication = (own: OwnClasses, t: OwnClass) => [t, ...ancestorsOf(own, t.name)].some((a) => a.extends.includes("Application"));
/** The program's classes that extend Application. */
const fxApps = (own: OwnClasses) => [...own.types.values()].filter((t) => t.kind === "class" && extendsApplication(own, t));
/** Whether a file imports a class of a package, by its name or with the package's *. */
const fxImported = (own: OwnClasses, file: string, pkg: string, name: string) => (own.imports.get(file) ?? []).some((i) => i === `${pkg}.${name}` || i === `${pkg}.*`);
/** " (with import javafx.scene.control.Button;)" when the file doesn't import it yet. */
const importNote = (own: OwnClasses, file: string, name: string) => (FX[name] && !fxImported(own, file, FX[name].pkg, name) ? ` (with import ${FX[name].pkg}.${name};)` : "");

/** What the practice version has instead of a class of real JavaFX in a package, in a sentence. */
function fxInstead(pkg: string, name?: string): string {
  if (pkg === "javafx.scene.control") return `Its controls are ${FX_CONTROLS}.`;
  if (pkg === "javafx.scene.layout" || (pkg === "javafx.scene" && name === "Group")) return `Its panes are ${FX_PANES}.`;
  if (pkg === "javafx.scene.input" || /Event$/.test(name ?? "")) return `Of the events, it has ${FX_EVENTS}.`;
  if (pkg === "javafx.scene.text") return "For text, use a Label, or a Text in a Pane of shapes; of javafx.scene.text it has Font, with a family and a size, as in Font.font(20), and Text, as in new Text(10, 20, \"Points: 0\").";
  if (pkg === "javafx.scene.paint") return "Of javafx.scene.paint, it has Color (and Paint, what a color is).";
  if (pkg === "javafx.scene.image") return "Of javafx.scene.image, it has Image, WritableImage, PixelReader, PixelWriter and ImageView: pixels are read and written one at a time, with getArgb, getColor, setArgb and setColor.";
  if (pkg === "javafx.scene.chart") return "Of the charts, it has LineChart, BarChart and ScatterChart, with NumberAxis and CategoryAxis.";
  if (pkg === "javafx.scene.media") return fxNoSound(name);
  if (pkg === "javafx.scene.shape") return "Of javafx.scene.shape, it has Shape, Polygon, Circle, Rectangle, Line and Path (what Shape.intersect gives).";
  if (/^javafx\.scene\.(?:effect|transform)$/.test(pkg)) return "It has no effects or transforms: a node is moved with setTranslateX and setTranslateY and turned with setRotate, and a Canvas and its GraphicsContext draw (fillRect, fillOval, strokeLine, fillPolygon, fillText).";
  if (pkg === "javafx.animation") return "Of javafx.animation, it has AnimationTimer, a game loop whose handle runs once per frame; Timeline, TranslateTransition and the other animations are part of real JavaFX but not of this version. To move or turn a node over time, change its translate or rotate a little in the timer's handle each frame.";
  if (pkg === "javafx.util" && name === "Duration") return "Duration is the length of time a Timeline or a transition takes, and those animations are part of real JavaFX but not of this version. Of javafx.animation, it has AnimationTimer, a game loop whose handle runs once per frame: to move or turn a node over time, change its translate or rotate a little in handle each frame.";
  if (pkg === "javafx.beans.property" || pkg === "javafx.beans" || pkg === "javafx.beans.binding") return "Of the properties, it has StringProperty and SimpleStringProperty (a label's or a text field's textProperty()) and DoubleProperty and SimpleDoubleProperty (a slider's valueProperty()), with change listeners.";
  if (pkg === "javafx.collections") return "Of javafx.collections, it has ObservableList, the list that getChildren() gives, and FXCollections.observableArrayList(...).";
  if (pkg === "javafx.stage") return "Of javafx.stage, it has Stage, the window.";
  if (pkg === "javafx.geometry") return "Of javafx.geometry, it has Insets, Pos, Point2D, and Bounds with BoundingBox.";
  if (pkg === "javafx.event") return "Of javafx.event, it has Event, ActionEvent, EventHandler and EventType.";
  return `Its packages are ${list(FX_PACKAGES)}.`;
}

/** Why sound (and video, for every class of javafx.scene.media but AudioClip) can't play here, and where it can. */
const fxNoSound = (name?: string) =>
  name === "AudioClip"
    ? "Sound can't play in this page: the browser engine that runs your program here has no way to play it, so the practice version has nothing of javafx.scene.media (AudioClip, Media, MediaPlayer, MediaView). The sound step is for reading; to hear it, run the program with real JavaFX on your own computer."
    : "Sound and video can't play in this page: the browser engine that runs your program here has no way to play them, so the practice version has nothing of javafx.scene.media (AudioClip, Media, MediaPlayer, MediaView). The sound step is for reading; to hear or see it, run the program with real JavaFX on your own computer.";
/** What a class of javafx.scene.media (or the package, without a name) is for: AudioClip plays sound, Media, MediaPlayer and MediaView sound and video. */
const fxMediaFor = (name?: string) => (name === "AudioClip" ? "for sound" : "for sound and video");

/** The start of a note about a class of real JavaFX that the practice version doesn't have. */
const fxMissing = (name: string, pkg: string) =>
  pkg === "javafx.scene.media" ? `${name} is part of real JavaFX (${pkg}.${name}), ${fxMediaFor(name)}. ${fxNoSound(name)}` : `${name} is part of real JavaFX (${pkg}.${name}), but Java Arena's practice version of JavaFX doesn't have it: it has only the classes and methods its lessons use. ${fxInstead(pkg, name)}`;

/** An FX class whose name is close to this one (Buton for Button, Vbox for VBox), or undefined. */
function fxNear(name: string, among = Object.keys(FX)): string | undefined {
  const lower = name.toLowerCase();
  return among.find((k) => k !== name && k.toLowerCase() === lower) ?? among.find((k) => k !== name && name.length >= 3 && editDistance(k.toLowerCase(), lower) <= (name.length > 5 ? 2 : 1));
}

/** "cannot find symbol: class CheckBox" (or variable Color) in a program that uses JavaFX: a class real JavaFX has and the practice version doesn't, or a misspelled one. */
function fxMissingClass(d: Diagnostic, own: OwnClasses): string | null {
  const name = /symbol:\s+(?:variable|class) ([A-Z][\w$]*)/.exec(d.message)?.[1];
  if (!name || knows(own, name) || FX[name] || LIBRARY_PACKAGES[name] || !usesFX(own)) return null;
  const near = fxNear(name);
  if (near) return `There is no class ${name}. Did you mean ${near}? Upper and lower case matter.${fxImported(own, d.file, FX[near].pkg, near) ? "" : ` It also needs import ${FX[near].pkg}.${near}; at the top of the file.`}`;
  if (fxNear(name, ["Parameters"])) return `There is no class ${name}. Did you mean Parameters, the class of what getParameters() gives? Upper and lower case matter. ${FX_PARAMETERS_PLACE}`;
  const real = REAL_FX[name];
  return real ? fxMissing(name, real) : null;
}

/** "cannot find symbol: class CheckBox, location: package javafx.scene.control": an import of a class the practice version doesn't have in that package. */
function fxNotInPackage(d: Diagnostic): string | null {
  const m = /symbol:\s+class ([\w$]+)\n\s*location: package (javafx(?:\.[\w$]+)*)/.exec(d.message);
  if (!m) return null;
  const [, name, pkg] = m;
  if (name === "Parameters") return `Parameters isn't a class of ${pkg} of its own, so this import doesn't compile: it's Application.Parameters, the class of what getParameters() gives. Remove the import. ${FX_PARAMETERS_PLACE}`;
  if (FX[name]) return `${name} isn't in ${pkg}: it's in ${FX[name].pkg}. Write import ${FX[name].pkg}.${name};`;
  const near = fxNear(name);
  if (near) return `There is no class ${name} in ${pkg}. Did you mean ${near}? Upper and lower case matter. Write import ${FX[near].pkg}.${near};`;
  if (REAL_FX[name]) return fxMissing(name, REAL_FX[name]);
  const here = Object.keys(FX).filter((k) => FX[k].pkg === pkg);
  return `Java Arena's practice version of JavaFX has no class ${name} in ${pkg}: it has only the classes and methods its lessons use. ${here.length ? `In ${pkg}, it has ${list(here)}.` : fxInstead(pkg)}`;
}

/** "package javafx.scene.canvas does not exist": a package of real JavaFX that the practice version doesn't have, or a misspelled one. */
function fxPackage(d: Diagnostic): string | null {
  const pkg = /^package (javafx(?:\.[\w$]+)*) does not exist/.exec(d.message)?.[1];
  if (!pkg) return null;
  // The class after the package on the line, as in import javafx.scene.canvas.Canvas;.
  const line = atCaret(d)?.line ?? "";
  const cls = new RegExp(`${escapeRegExp(pkg)}\\s*\\.\\s*([A-Z][\\w$]*)`).exec(line)?.[1];
  const lower = pkg.toLowerCase();
  const near = FX_PACKAGES.find((p) => p.toLowerCase() === lower) ?? FX_PACKAGES.find((p) => editDistance(p, pkg) <= 2);
  if (near) {
    const fix = cls && FX[cls]?.pkg === near ? ` Write import ${near}.${cls};` : "";
    return `There is no package ${pkg}. Did you mean ${near}? Check the spelling: upper and lower case matter.${fix}`;
  }
  // A class of the practice version, imported from the wrong package.
  if (cls && FX[cls]) return `${cls} isn't in ${pkg}: it's in ${FX[cls].pkg}. Write import ${FX[cls].pkg}.${cls};`;
  if (pkg === "javafx.scene.media") return `${cls ? `${cls} (${pkg}.${cls}) is part of real JavaFX` : `The package ${pkg} is part of real JavaFX`}, ${fxMediaFor(cls)}. ${fxNoSound(cls)}`;
  if (REAL_FX_PACKAGES.has(pkg) || (cls && REAL_FX[cls] === pkg)) {
    const what = cls ? `${cls} (${pkg}.${cls}) is part of real JavaFX` : `The package ${pkg} is part of real JavaFX`;
    return `${what}, but Java Arena's practice version of JavaFX doesn't have the package ${pkg}: it has only the classes and methods its lessons use. ${fxInstead(pkg, cls)}`;
  }
  return `Java Arena's practice version of JavaFX has no package ${pkg}. Its packages are ${list(FX_PACKAGES)}.`;
}

/** The bracket that opens the ) or ] at `close` in the code, or -1. */
function openBracket(code: string, close: number): number {
  const [o, c] = code[close] === ")" ? ["(", ")"] : ["[", "]"];
  let depth = 0;
  for (let k = close; k >= 0; k--) {
    if (code[k] === c) depth++;
    else if (code[k] === o && --depth === 0) return k;
  }
  return -1;
}

/** Where the expression that ends right before `end` in the code starts: a name, or a chain such as box.getChildren().get(0). */
function expressionStart(code: string, end: number): number {
  let k = end;
  while (k > 0 && /\s/.test(code[k - 1])) k--;
  for (let n = 0; n < 50; n++) {
    if (k > 0 && (code[k - 1] === ")" || code[k - 1] === "]")) {
      const open = openBracket(code, k - 1);
      if (open < 0) return k;
      k = open;
      continue;
    }
    let j = k;
    while (j > 0 && /[\w$]/.test(code[j - 1])) j--;
    if (j === k) return k;
    k = j;
    let dot = k;
    while (dot > 0 && /\s/.test(code[dot - 1])) dot--;
    if (dot > 0 && code[dot - 1] === ".") {
      k = dot - 1;
      while (k > 0 && /\s/.test(code[k - 1])) k--;
      continue;
    }
    return k;
  }
  return k;
}

type Call = {
  /** The method's name, or the class's of new. */
  name: string;
  newClass: boolean;
  /** The value before the dot, as written: box.getChildren() for box.getChildren().add(...) ("" for none). */
  receiver: string;
  /** The values in the parentheses, as written. */
  args: string[];
  /** Which of them holds javac's caret (-1 when the caret is on the call's dot). */
  index: number;
};

/** The values in the parentheses that open at `open`, split at the commas outside brackets, as written in `text`. */
function argumentsOf(code: string, text: string, open: number): string[] {
  const end = pastClose(code, open);
  if (end < 0) return [];
  const out: string[] = [];
  let depth = 0;
  let from = open + 1;
  for (let k = open + 1; k < end - 1; k++) {
    const ch = code[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) depth--;
    else if (ch === "," && depth === 0) {
      out.push(text.slice(from, k).trim());
      from = k + 1;
    }
  }
  const last = text.slice(from, end - 1).trim();
  return last || out.length ? [...out, last] : [];
}

/**
 * The call javac's caret is about: the one that starts at it (the caret on the dot of box.getChildren().add(...)),
 * or else the innermost one whose parentheses hold it.
 */
function callAt(d: Diagnostic, own: OwnClasses): Call | null {
  const p = caretIn(d, own);
  if (!p) return null;
  const { code, text, at } = p;
  const call = (open: number, nameAt: number, name: string, index: number): Call => {
    const before = code.slice(Math.max(0, nameAt - 300), nameAt);
    const newClass = /\bnew\s+$/.test(before);
    const dot = /\.\s*$/.exec(before);
    const receiver = dot ? text.slice(expressionStart(code, nameAt - dot[0].length), nameAt - dot[0].length).trim() : "";
    return { name, newClass, receiver, args: argumentsOf(code, text, open), index };
  };
  const starts = /^\.\s*([\w$]+)\s*\(/.exec(code.slice(at, at + 200));
  if (starts) return call(at + starts[0].length - 1, at + starts[0].indexOf(starts[1]), starts[1], -1);
  let depth = 0;
  for (let k = at - 1; k >= 0 && k > at - 3000; k--) {
    const ch = code[k];
    if (")]}".includes(ch)) depth++;
    else if ("([{".includes(ch)) {
      if (depth-- > 0) continue;
      if (ch !== "(") return null;
      const m = /([\w$]+)\s*(?:<[^<>()]*>)?\s*$/.exec(code.slice(Math.max(0, k - 200), k));
      if (!m || NOT_A_METHOD.test(m[1])) return null;
      const index = argumentAt(code, k, at).index;
      return call(k, k - (code.slice(Math.max(0, k - 200), k).length - m.index), m[1], index);
    } else if (ch === ";") return null;
  }
  return null;
}

/** The declared type of a plain variable at the caret's place (null for var, an expression, or when no declaration is found). */
function typeOfName(d: Diagnostic, own: OwnClasses, name: string): string | null {
  const p = caretIn(d, own);
  if (!p || !/^(?:this\s*\.\s*)?[\w$]+$/.test(name)) return null;
  const type = changesOf(p.code, name.replace(/^this\s*\.\s*/, ""), p.at).type;
  return type ? simple(type.replace(/<.*$/, "")) : null;
}

/** When an event happens, by the class whose setOnAction gets it. */
const fxWhen = (type: string | null, name: string) =>
  type && fxIsKind(type, "TextField") ? `each time Enter is pressed in ${/^[\w$]+$/.test(name) ? name : "the field"}` : type && fxIsKind(type, "ButtonBase") ? `each time ${/^[\w$]+$/.test(name) ? name : "the button"} is clicked` : "each time the event happens";
/** Methods that get an event handler or a change listener. */
const FX_HANDLER = /^(?:setOn[A-Z][\w$]*|addListener)$/;

/** The FX class's methods for a list in a sentence: its own and those of its parents up to Region, then a word about every node's. */
function fxMethodList(fx: string): string {
  const stop = new Set(["Region", "Parent", "Node"]);
  const mine = [...new Set([fx, ...fxAncestors(fx)].filter((t) => !stop.has(t)).flatMap((t) => (FX[t]?.methods ? FX[t].methods.split(" ") : [])))];
  const node = fxIsKind(fx, "Region") ? `${mine.length ? ", and" : ""} those every control and pane has, such as setPadding, setPrefWidth, setDisable and setVisible` : fxIsKind(fx, "Node") ? `${mine.length ? ", and" : ""} those every node has, such as setDisable and setVisible` : "";
  return `${listed(mine)}${node}`;
}

/** The static methods of the practice version's classes (the others' methods belong to each object). scripts/explanations.test.mjs checks them against the library's class files. */
const FX_STATIC: Record<string, string> = { Application: "launch", Platform: "runLater exit isFxApplicationThread", Font: "getDefault font", GridPane: "getColumnIndex getRowIndex", Color: "color rgb web", FXCollections: "observableArrayList", Shape: "intersect", KeyCode: "getKeyCode" };
export { FX_STATIC as PRACTICE_JAVAFX_STATIC };

/** The methods of a list, such as the children list that getChildren() gives. */
const FX_LIST_METHOD = /^(?:add|addAll|remove|removeAll|clear|size|get|set|setAll|contains|isEmpty|indexOf)$/;
/** Events of real JavaFX's nodes and scenes that the practice version doesn't have. */
const FX_NODE_EVENT = /^setOn(?:Mouse|Key|Scroll|Drag|Touch|Zoom|Rotat|Swipe|ContextMenuRequested|InputMethodTextChanged)/;
/** Events of real JavaFX's windows that the practice version doesn't have. */
const FX_WINDOW_EVENT = /^setOn(?:CloseRequest|Show(?:n|ing)|Hid(?:den|ing))$/;

/** "cannot find symbol: method setOnMouseClicked(...), location: variable button of type Button": a method that the FX class (in the practice version) doesn't have. */
function fxMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type |class |interface )([\w$.]+)(?:<.*>)?$/m.exec(d.message);
  if (!m) return null;
  const [, method, args, variable] = m;
  const type = simple(m[4]);
  if (type === "Parameters") return fxParameters(own, method, args, variable);
  const fx = fxTypeOf(own, type);
  if (!fx) return null;
  const dots = `${method}(${args ? "..." : ""})`;
  const p = caretIn(d, own);
  const qualified = !!variable || (!!p && p.code[p.at] === ".");
  const value = variable ?? (p && p.code[p.at] === "." ? p.text.slice(expressionStart(p.code, p.at), p.at).trim() : "");
  // A static call written on the class's name, as in HBox.setMargin(...) or javafx.scene.layout.HBox.setMargin(...) (not new HBox().setMargin(...)).
  if (!variable && type === fx && /^[\w$]+(?:\s*\.\s*[\w$]+)*$/.test(value) && simple(value.replace(/\s+/g, "")) === type) {
    const statics = FX_STATIC[fx]?.split(" ") ?? [];
    const head = `${fx} has no static method ${dots} in Java Arena's practice version of JavaFX`;
    const nearStatic = fxNear(method, statics);
    if (nearStatic) return `${head}. Did you mean ${nearStatic}? Check the spelling: upper and lower case matter.`;
    // A misspelled method of each object (javac says "non-static method" for one spelled right).
    const nearEach = fxNear(method, fxMethods(fx).filter((x) => !statics.includes(x)));
    if (nearEach) return `${head}. Did you mean ${nearEach}? Check the spelling (upper and lower case matter). ${nearEach} isn't static: it belongs to each ${fx}, so call it on one, as in ${varFor(fx.replace(/^[HV](?=Box$)/, ""))}.${nearEach}(...).`;
    const those = statics.length ? `${fx}'s static methods here are ${listed(statics)}.` : `${fx} has no static methods here: its methods belong to each ${fx}, and are called on one.`;
    return `${head}: it has only the classes and methods its lessons use, so a method of real JavaFX may be missing. Check the spelling (upper and lower case matter). ${those}`;
  }
  const kindOf = type !== fx ? `, which is ${aNode(fx)}` : "";
  const holder = !qualified ? `This code is in ${type}${kindOf}` : variable ? `${variable} is ${aNode(type)}${kindOf}` : `${value.length <= 40 && value ? value : "The value before the dot"} is ${aNode(type)}${kindOf}`;
  const has = `${holder}, and ${fx} has no method ${dots}`;
  const v = value && value.length <= 40 ? value : "pane";
  const list = method === "getChildren" || FX_LIST_METHOD.test(method);
  const rootCall = `root.getChildren().${method === "getChildren" ? "add(...)" : dots}`;
  if (list && fx === "Scene")
    return `${has}: a Scene holds one node, its root, the pane given to new Scene(...), and the other nodes are that pane's children. Keep the pane in a variable of its own type (VBox root = new VBox(); ... new Scene(root)) and add to it: ${rootCall}.`;
  if (list && fxIsKind(fx, "Window"))
    return `${has}: a Stage is the window itself, and its nodes are in the pane at the root of its Scene. Keep that pane in a variable of its own type and add to it: ${rootCall}.`;
  if (list && method !== "getChildren" && fx === "Application")
    return `${has}: the window's nodes go in a pane, the root of its Scene. Keep that pane in a variable of its own type (VBox root = new VBox(); ... stage.setScene(new Scene(root))) and add to it: ${rootCall}.`;
  if (fxIsKind(fx, "Pane") && FX_LIST_METHOD.test(method))
    return `${has}: a pane keeps its nodes in its list of children, which getChildren() gives. Write ${v}.getChildren().${dots}.`;
  const near = fxNear(method, fxMethods(fx));
  if (near) return `${has}. Did you mean ${near}? Check the spelling: upper and lower case matter.`;
  // A method of the kinds of node below this type: Java goes by the variable's type, not by the node in it.
  const below = FX_NODES.filter((k) => k !== fx && fxIsKind(k, fx) && fxMethods(k).includes(method));
  if (below.length) {
    const s = below[0];
    const val = value && value.length <= 40 ? value : "node";
    const x = varFor(s, val);
    const init = variable && p ? localValue(p.code, p.text, variable, p.at) : null;
    const from = /getChildren(?:Unmodifiable)?\s*\(\s*\)\s*\.\s*get\s*\(/.test(init ?? value) ? " getChildren().get(...) gives a Node, since a pane's children can be any kind of node." : /\blookup\s*\(/.test(init ?? value) ? " lookup(...) gives a Node, since the node it finds can be any kind of node." : "";
    return `${has}. ${listed(below)} ${below.length > 1 ? "have" : "has"} it, but Java goes by the ${variable ? "variable's" : "value's"} type, ${type}, not by the node in it, even when that node is ${aNode(s)}.${from} Keep the ${s} in a variable of its own type when you create it (${s} ${varFor(s)} = new ${s}(...);) and use that variable. Or, if the node is ${aNode(s)}, check and cast it: if (${val} instanceof ${s}) { ${s} ${x} = (${s}) ${val}; ${x}.${dots}; }`;
  }
  if (/^setOn[A-Z]/.test(method)) {
    const listener = `${v}.textProperty().addListener((observable, oldValue, newValue) -> ...)`;
    const typing = `To react to typing, a change listener on the text works: ${listener}.`;
    const tip = fxIsKind(fx, "ButtonBase")
      ? `To react to a click, use ${v}.setOnAction(e -> ...).`
      : fxIsKind(fx, "TextField")
        ? `For Enter, use ${v}.setOnAction(e -> ...); to react to typing, a change listener on the text works: ${listener}.`
        : fxIsKind(fx, "TextInputControl")
          ? typing
          : "To react to a click, add a Button and use its setOnAction(e -> ...).";
    // In the practice version only buttons and text fields have setOnAction; the classes that get here (labels, text areas, panes, scenes, windows) don't have it in real JavaFX either.
    if (method === "setOnAction")
      return `${has}: in Java Arena's practice version of JavaFX, only buttons and text fields have setOnAction (a click on a Button, or Enter in a TextField), and in real JavaFX ${aNode(fx)} doesn't have it either. ${tip}`;
    if (FX_WINDOW_EVENT.test(method) && fxIsKind(fx, "Window"))
      return `${holder}, and Java Arena's practice version of JavaFX has no ${method}: its windows have no events of their own, such as setOnCloseRequest and setOnShown, which are part of real JavaFX. To do something as the program ends, after the last window closes, override stop() in your class that extends Application: JavaFX calls it then.`;
    const of = `${holder}, and Java Arena's practice version of JavaFX has no ${method}: of the events, it has ${FX_EVENTS}.`;
    if (FX_NODE_EVENT.test(method) && (fxIsKind(fx, "Node") || fx === "Scene"))
      return `${of} Keyboard, scroll and drag-and-drop events and the other mouse events, such as setOnScroll and setOnMouseMoved, are part of real JavaFX but not of this version, except the key events of a Scene (scene.setOnKeyPressed). ${tip}`;
    return `${of} ${tip}`;
  }
  const elsewhere = FX_NODES.concat(Object.keys(FX).filter((k) => !FX_NODES.includes(k))).filter((k) => !fxIsKind(fx, k) && !fxIsKind(k, fx) && fxMethods(k).includes(method));
  const concrete = elsewhere.filter((k) => !elsewhere.some((o) => o !== k && fxIsKind(o, k)) || FX_NODES.includes(k));
  // A Canvas draws through its GraphicsContext: name that first (the shapes' setFill is no help to a canvas).
  if (fx === "Canvas" && concrete.includes("GraphicsContext"))
    return `${has}: ${method} is a method of GraphicsContext, the canvas's drawing tools. Get them from the canvas and call it on them: GraphicsContext gc = ${v === "pane" ? "canvas" : v}.getGraphicsContext2D(); gc.${dots};`;
  if (concrete.length) {
    const call = fx === "Application" && concrete.includes("Stage") ? ` Call it on the Stage that start gets, as in stage.${dots}.` : "";
    return `${has}: in Java Arena's practice version of JavaFX, ${method} is a method of ${listed(concrete.slice(0, 6))}.${call}`;
  }
  // A class of the program's own that extends a JavaFX class: the method may be meant as one of its own.
  if (type !== fx) return null;
  return `${holder}, and Java Arena's practice version of JavaFX has no method ${dots} in ${fx}: it has only the classes and methods its lessons use, so a method of real JavaFX may be missing. Check the spelling (upper and lower case matter). ${fx}'s methods here are ${fxMethodList(fx)}.`;
}

/**
 * Application.Parameters, what getParameters() gives: a class inside Application, so it isn't in the
 * table of classes (FX), whose package and import sentences would be wrong for it. Its methods are
 * those of real JavaFX's Application.Parameters, all three.
 */
const FX_PARAMETERS = ["getRaw", "getUnnamed", "getNamed"];
/** How a program names Application.Parameters, a class inside Application. */
const FX_PARAMETERS_PLACE = "It is a class inside Application: in a class that extends Application, write Parameters, with no import of its own; elsewhere, write Application.Parameters (with import javafx.application.Application;).";

/** "cannot find symbol: method getNamd(), location: variable p of type Parameters": a method Application.Parameters doesn't have. */
function fxParameters(own: OwnClasses, method: string, args: string, variable: string | undefined): string | null {
  // A class of the program's own called Parameters, or a program that doesn't use JavaFX: not this.
  if (knows(own, "Parameters") || !fxProgram(own)) return null;
  const dots = `${method}(${args ? "..." : ""})`;
  const head = variable ? `${variable} is an Application.Parameters, what getParameters() gives, and it has no method ${dots}.` : `An Application.Parameters, what getParameters() gives, has no method ${dots}.`;
  const near = fxNear(method, FX_PARAMETERS);
  if (near) return `${head} Did you mean ${near}? Check the spelling: upper and lower case matter.`;
  return `${head} It has three methods, as in real JavaFX: getRaw() gives all the arguments, getUnnamed() those that aren't --name=value, and getNamed() the --name=value ones, as a map from name to value.`;
}

/** The value a local variable gets where it's declared before `at` (Node first = box.getChildren().get(0);), as written, or null. */
function localValue(code: string, text: string, name: string, at: number): string | null {
  const n = escapeRegExp(name);
  let found: string | null = null;
  for (const m of code.slice(0, at).matchAll(new RegExp(`(?<![\\w$.])[\\w$.]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*\\s+${n}\\s*=(?!=)([^;]*);`, "g"))) found = text.slice(m.index + m[0].length - 1 - m[1].length, m.index + m[0].length - 1).trim();
  return found;
}

/** "cannot find symbol: variable getChildren, location: variable box of type VBox": a method of an FX class written without its parentheses. */
function fxMethodAsVariable(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+variable ([\w$]+)\n\s*location: variable ([\w$]+) of type ([\w$.]+)/.exec(d.message);
  const fx = m ? fxTypeOf(own, simple(m[3])) : null;
  if (!m || !fx || !fxMethods(fx).includes(m[1])) return null;
  const parens = /^(?:get|is)[A-Z]/.test(m[1]) && !/^get(?:Column|Row)Index$/.test(m[1]) ? "()" : "(...)";
  return `${m[1]} is a method of ${fx}, so it needs parentheses: ${m[2]}.${m[1]}${parens}.${m[1] === "getChildren" ? " To change the children, use the list it gives, as in add, setAll or clear." : ""}`;
}

/** Whether a class that doesn't extend Application has the start(Stage) that JavaFX calls, and extends nothing, so it's meant to extend Application. */
function fxMeantAsApp(own: OwnClasses, cls: string, file: string): boolean {
  const t = typeNamed(own, cls, file);
  return !!t && t.kind === "class" && !t.extends.length && t.members.some((x) => x.method && x.name === "start" && !x.static && x.params != null && /^(?:[\w$]+\.)*Stage$/.test(x.params));
}
/** " Or, to start CounterApp instead, ...": the program's other class that extends Application, as a second choice. */
const fxOtherApp = (apps: OwnClass[]) => (apps.length ? ` Or, to start ${apps[0].name} instead, write Application.launch(${apps[0].name}.class, args).` : "");

/** "no suitable method found for launch(Class<Helper>)": launch with a class that doesn't extend Application. */
function fxLaunchClass(d: Diagnostic, own: OwnClasses): string | null {
  const x = /^no suitable method found for launch\(Class<([\w$.]+)>/.exec(d.message)?.[1];
  if (!x) return null;
  const name = simple(x);
  const apps = fxApps(own).filter((a) => a.name !== name);
  const start = `launch(${name}.class) starts ${name} as a JavaFX program, so ${name} must extend Application, and it doesn't.`;
  if (fxMeantAsApp(own, name, d.file)) return `${start} ${name} has start(Stage), so it's meant as one: write public class ${name} extends Application${importNote(own, d.file, "Application")}.${fxOtherApp(apps)}`;
  if (apps.length) return `${start} Did you mean ${apps[0].name}.class? ${apps[0].name} extends Application.`;
  return `${start} To make it one, write public class ${name} extends Application, with a method @Override public void start(Stage stage) { ... } that builds the window.`;
}

/** "cannot find symbol: method launch(String[]), location: class Main": launch called in a class that doesn't extend Application (or can't find it). */
function fxLaunchMissing(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method launch\((.*)\)\n\s*location: class ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const cls = simple(m[2]);
  const t = typeNamed(own, cls, d.file);
  if (t?.extends.includes("Application"))
    return `${cls} extends Application, but Java can't find Application, so it doesn't know launch, Application's method, either. Add import javafx.application.Application; at the top of ${fileName(d.file)}, and this error goes away with the one about Application.`;
  const start = `launch is a method of Application, and ${cls} doesn't extend Application, so ${cls} can't call it by its name alone.`;
  if (fxMeantAsApp(own, cls, d.file)) return `${start} ${cls} has start(Stage), so it's meant as the JavaFX program: write public class ${cls} extends Application${importNote(own, d.file, "Application")}. Then launch(${cls}.class) in main starts it.${fxOtherApp(fxApps(own).filter((a) => a.name !== cls))}`;
  const app = fxApps(own)[0];
  if (app) return `${start} To start ${app.name}, the class that extends Application, write Application.launch(${app.name}.class, args)${importNote(own, d.file, "Application")}.`;
  return `${start} Make ${cls} a JavaFX program: public class ${cls} extends Application, with a method @Override public void start(Stage stage) { ... } that builds the window. Then launch(${cls}.class) in main starts it.`;
}

/** "Main is not abstract and does not override abstract method start(Stage) in Application". */
function fxNoStart(own: OwnClasses, cls: string, file: string): string {
  const t = typeNamed(own, cls, file);
  const methods = t?.members.filter((x) => x.method) ?? [];
  const stage = (x: OwnMember) => x.params != null && /^(?:[\w$]+\.)*Stage$/.test(x.params);
  const header = `@Override public void start(Stage stage) { ... }${importNote(own, file, "Stage")}`;
  const base = `${cls} extends Application, so it must have the method start: JavaFX calls it with the window, a Stage, and the program builds what the window shows there. Write it as ${header}.`;
  const same = methods.find((x) => x.name === "start");
  if (same && stage(same) && same.type !== "void") return `${cls} has start(Stage), but it gives back ${anWord(same.type)}, and the start that JavaFX calls is void: write public void start(Stage stage).`;
  if (same) return `${cls} has a method start, but it takes ${same.params ? `(${spaced(same.params)})` : "no parameters"}, and the start that JavaFX calls takes one Stage, the window: ${header}.`;
  const near = methods.find((x) => x.name.toLowerCase() === "start" || editDistance(x.name.toLowerCase(), "start") <= 2 || (stage(x) && !x.static));
  if (near) return `${cls} has a method ${near.name}, but JavaFX calls only a method named exactly start (upper and lower case matter): rename ${near.name} to start, as in ${header}.`;
  return base;
}

/** "incompatible types: incompatible parameter types in lambda expression" for a handler or a listener with the wrong number of parameters. */
function fxLambdaParams(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const l = lambdaAt(d, own);
  if (!l?.method) return null;
  const n = l.params.length;
  const count = n === 0 ? "none" : plural(n, "parameter", "parameters");
  const body = l.block ? "{ ... }" : l.body.length <= 50 ? l.body : "...";
  if (/^setOn[A-Z]/.test(l.method) && n !== 1)
    return `${l.method} needs an event handler: a lambda with one parameter, the event (an ActionEvent), which it gets each time the event happens. This lambda has ${count}. Give it exactly one, even when the handler doesn't use it: e -> ${body}`;
  // A slider's listener with Double (or Integer) for its values: its valueProperty() is an ObservableValue<Number>.
  const typed = /\b(Double|Integer|Long|Float)\s+[\w$]+\s*[,)]/.exec(atCaret(d)?.line ?? "");
  if (l.method === "addListener" && n === 3 && typed) return `${FX_NUMBER_LISTENER} ${typed[1]} (Number oldValue, Number newValue). Then newValue.doubleValue() gives the value as a double, and newValue.intValue() as a whole number.`;
  if (l.method === "addListener" && n !== 3) {
    const params = `(${n >= 2 ? l.params[0] : "observable"}, oldValue, ${n >= 1 ? l.params[n - 1] : "newValue"})`;
    const invalidation = n === 1 ? " (Real JavaFX also takes a listener with one parameter, an InvalidationListener, which Java Arena's practice version of JavaFX doesn't have.)" : "";
    return `addListener needs a change listener: a lambda with three parameters, the value it watches, its old value and its new value. This lambda has ${count}. Give it all three, even the ones it doesn't use: ${params} -> ${body}${invalidation}`;
  }
  return null;
}

/** "incompatible types: T cannot be converted to String" inside a listener with the wrong number of parameters: an error that follows from that one. */
function fxListenerFollowOn(d: Diagnostic, own: OwnClasses): string | null {
  if (!/declared in interface ObservableValue/.test(d.formatted)) return null;
  const l = lambdaAt(d, own);
  if (l?.method !== "addListener" || l.params.length === 3) return null;
  return `This error follows from the listener's parameters: a change listener has three, (observable, oldValue, newValue), and with ${plural(l.params.length, "parameter", "parameters")} Java can't tell what each one is. Give the lambda all three, and this error goes away too.`;
}

/** "'void' type not allowed here" in the parentheses of setOnAction or addListener: code that runs right away, not a handler. */
function fxHandlerValue(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const call = callAt(d, own);
  if (!call || !FX_HANDLER.test(call.name) || call.index < 0) return null;
  const arg = call.args[call.index] ?? "...";
  const recv = call.receiver || "button";
  const value = `${arg} isn't one: Java runs it right away, while the window is being built, and it gives back nothing (it's void).`;
  if (call.name === "addListener") return `addListener takes a change listener: code to run each time the value changes. ${value} To run it on each change, make it a lambda with three parameters: ${recv}.addListener((observable, oldValue, newValue) -> ${arg});`;
  return `${call.name} takes an event handler: code to run later, ${fxWhen(typeOfName(d, own, recv), recv)}. ${value} To run it then, make it a lambda: ${recv}.${call.name}(e -> ${arg});`;
}

/** "incompatible types: Label cannot be converted to EventHandler<ActionEvent>": setOnAction (or addListener) given a value that isn't code to run. */
function fxNotHandler(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+(?:<.*?>)?) cannot be converted to (EventHandler|ChangeListener)</.exec(d.message);
  if (!m) return null;
  const from = simple(m[1].replace(/<.*$/, ""));
  const call = callAt(d, own);
  const name = call?.name ?? (m[2] === "EventHandler" ? "setOnAction" : "addListener");
  const recv = call?.receiver || (m[2] === "EventHandler" ? "button" : "field.textProperty()");
  const arg = call && call.index >= 0 ? call.args[call.index] : null;
  const it = arg && arg.length <= 40 ? `${arg} is ${anWord(from)}` : `This is ${anWord(from)}`;
  if (m[2] === "ChangeListener") return `addListener takes a change listener: code to run each time the value changes, written as a lambda with three parameters, as in ${recv}.addListener((observable, oldValue, newValue) -> ...);. ${it}, not code to run.`;
  const label = fxTypeOf(own, from) && arg && /^[\w$]+$/.test(arg) && fxMethods(fxTypeOf(own, from)!).includes("setText") ? ` To change ${arg} then, write the change in the lambda: ${recv}.${name}(e -> ${arg}.setText("..."));` : "";
  return `${name} takes an event handler: code to run ${fxWhen(typeOfName(d, own, recv), recv)}, written as a lambda, as in ${recv}.${name}(e -> ...);. ${it}, not code to run.${label}`;
}

/** "incompatible types: invalid method reference ... method handle in class Main cannot be applied to given types": setOnAction(this::handle) with a method that doesn't take the event. */
function fxMethodRef(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: invalid method reference\n\s*method ([\w$]+) in (?:class|interface) [\w$.<>]+ cannot be applied to given types\n\s*required: (.+)\n\s*found:\s+(.+)/.exec(d.message);
  const call = m && usesFX(own) ? callAt(d, own) : null;
  if (!m || !call || !/^setOn[A-Z]/.test(call.name)) return null;
  const [, method, required, found] = m;
  const ref = call.index >= 0 ? call.args[call.index] : `this::${method}`;
  const takes = required === "no arguments" ? "takes no parameters" : `takes (${spaced(required)})`;
  return `${ref} makes ${method} the event handler, and a handler gets one value, the event (${found.trim()}), but ${method} ${takes}. Give ${method} the event as its only parameter, as in private void ${method}(${found.trim()} event), or call it from a lambda instead: ${call.receiver || "button"}.${call.name}(e -> ${method}());`;
}

/** Methods of the practice version that take text. */
const FX_TEXT = /^(?:setText|setTitle|setPromptText|appendText|setId|setStyle)$/;

/** "incompatible types: VBox cannot be converted to Scene" and the like: a value of the wrong type for a JavaFX method or constructor. */
function fxWrongValue(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+)(?:<.*>)? cannot be converted to ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  if (knows(own, to) || (to === "Node" && !usesFX(own))) return null;
  const call = callAt(d, own);
  if (!call || call.index < 0) return null;
  const arg = call.args[call.index] ?? "";
  const shown = arg && arg.length <= 40 ? arg : null;
  const it = shown ? `${shown} is ${anWord(from)}` : `this is ${anWord(from)}`;
  const recv = call.receiver;
  const target = recv ? `${recv}.${call.name}` : call.name;
  if ((call.newClass || /(?:^|\.)XYChart$/.test(call.receiver.replace(/^new\s+/, ""))) && call.name === "Data" && call.index <= 1 && !knows(own, "Data") && usesFX(own)) return fxDataText(call.index === 0, to, from, arg);
  if (to === "Scene" && call.name === "setScene") {
    const node = fxTypeOf(own, from);
    return `setScene takes a Scene, and ${it}. ${node && fxIsKind(node, "Parent") ? `Put it in a Scene first: ${target}(new Scene(${shown ?? "root"}));` : "Create a Scene with the window's root pane, as in new Scene(root), and give that to setScene."}`;
  }
  if (to === "Parent" && (call.name === "Scene" || call.name === "setRoot")) {
    const other = from === "Stage" ? " It's the other way round: the Stage gets the Scene, stage.setScene(new Scene(root))." : "";
    return `A Scene's root is the node that holds everything the window shows, usually a pane such as a VBox with the other nodes in it, and ${it}.${other}`;
  }
  if (to === "Insets" && call.name === "setPadding")
    return `setPadding takes an Insets, the space inside the edges, and ${it}. Write ${target}(new Insets(${shown && /^\d+(?:\.\d+)?$/.test(shown) ? shown : "10"})) for the same space on every side, or new Insets(top, right, bottom, left)${importNote(own, d.file, "Insets")}.`;
  if (to === "Pos" && call.name === "setAlignment") {
    const constant = /^"([A-Z_]+)"$/.exec(arg)?.[1];
    return `setAlignment takes one of the constants of Pos, and ${it}. Write ${target}(Pos.${constant ?? "CENTER"})${constant ? ", without quotes" : ", or another constant such as Pos.TOP_LEFT"}${importNote(own, d.file, "Pos")}.`;
  }
  if (to === "Font" && call.name === "setFont") return `setFont takes a Font, and ${it}. Font.font(${shown && /^\d+(?:\.\d+)?$/.test(shown) ? shown : "20"}) is the default font in that size, as in ${target}(Font.font(${shown && /^\d+(?:\.\d+)?$/.test(shown) ? shown : "20"}))${importNote(own, d.file, "Font")}.`;
  if (/^(?:int|double)$/.test(to) && call.name === "add" && recv && fxTypeOf(own, typeOfName(d, own, recv) ?? "") === "GridPane")
    return `A GridPane's add takes the node and then its column and its row, as whole numbers, and ${it}. Write them without quotes, as in ${recv}.add(${call.args[0] || "node"}, 0, 1).`;
  if (to === "String" && (FX_TEXT.test(call.name) || (call.newClass && FX[call.name] && fxMethods(call.name).includes("setText")))) {
    const what = call.newClass ? `A ${call.name}'s text is a String` : `${call.name} takes text, a String`;
    const v = shown ?? "value";
    return `${what}, and ${it}. Turn it into text: ${call.newClass ? `new ${call.name}("" + ${v})` : `${target}("" + ${v})`}, or String.valueOf(${v}).`;
  }
  if (to === "Node" && (/^(?:add|addAll|setAll)$/.test(call.name) || (call.newClass && FX[call.name] && fxIsKind(call.name, "Pane")))) {
    const text = from === "String" ? ` To show text, put it in a Label: new Label(${shown ?? '"..."'}).` : "";
    return `A pane holds nodes, such as Labels, Buttons and other panes, and ${it}.${text}`;
  }
  return null;
}

/** add on a pane's children with several values: getChildren().add(button, label), or a GridPane's cell given to getChildren().add. */
function fxChildrenAdd(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const call = callAt(d, own);
  if (!call || call.name !== "add" || !/\bgetChildren\s*\(\s*\)$/.test(call.receiver) || call.args.length < 2) return null;
  const pane = call.receiver.replace(/\s*\.\s*getChildren\s*\(\s*\)$/, "");
  const type = typeOfName(d, own, pane);
  const grid = !!type && fxTypeOf(own, type) === "GridPane";
  const args = call.args.join(", ");
  // A column and a row (and spans) only when javac's types for the values after the node are numbers, as in add(Label,int,int).
  const types = /found for add\(([^)]*)\)/.exec(d.message)?.[1].split(",").map((t) => t.trim());
  const cell = (call.args.length === 3 || call.args.length === 5) && (!types || types.length !== call.args.length || types.slice(1).every((t) => /^(?:int|short|byte|char|long|float|double|Integer|Short|Byte|Character|Long|Float|Double)$/.test(t)));
  if (!cell) return `add puts one node in the list of children (with two values, add(index, node), the first is the position, an int). To add several nodes at once, use addAll: ${pane || "pane"}.getChildren().addAll(${args}).`;
  if (grid) return `A GridPane places a node in a cell with its own add, which takes the column and the row: ${pane}.add(${args}), on the GridPane itself, not on its getChildren().`;
  return `The list of children has add(node) and add(index, node), and nothing with a column and a row: those are for a GridPane's own add, as in grid.add(node, column, row). To add several nodes at once, use addAll(...).`;
}

/** "incompatible types: ObservableList<Node> cannot be converted to ArrayList<Node>" (or List<Button>): the list getChildren() gives in a variable of another type. */
function fxChildrenList(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ObservableList<([\w$.]+)> cannot be converted to ((?:[\w$]+\.)*([\w$]+)(?:<(.+)>)?)$/m.exec(d.message);
  if (!m || simple(m[1]) !== "Node") return null;
  const [, , , base, arg] = m;
  const c = atCaret(d);
  const given = c && /getChildren(?:Unmodifiable)?\s*$/.test(beforeCaret(c)) ? "getChildren() gives" : "This is";
  const declare = `Declare the variable as ObservableList<Node>${importNote(own, d.file, "ObservableList")}, or as List<Node>`;
  if (arg && simple(arg) !== "Node")
    return `${given} a list of Node, since a pane's children can be any kind of node, so it can't go in a variable for a list of ${simple(arg)}. ${declare}. To keep your ${simple(arg)}s apart, keep a list of them yourself, a List<${simple(arg)}>, and add each one to it as you create it.`;
  if (/^(?:ArrayList|LinkedList)$/.test(base))
    return `${given} an ObservableList<Node>, JavaFX's own kind of list (one that tells the pane when it changes), not ${anWord(base)}. ${declare}: it has add, get, remove and size like any list. (new ArrayList<>(...) would make a separate copy, and adding to the copy wouldn't change the window.)`;
  return null;
}

/** "incompatible types: Node cannot be converted to Button": a Node, as getChildren().get(...) or lookup(...) gives, put in a variable of a kind of node. */
function fxNarrowing(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: ([\w$.]+) cannot be converted to ([\w$.]+)$/m.exec(d.message);
  if (!m) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  const toFx = fxTypeOf(own, to);
  if (!FX[from] || knows(own, from) || !toFx || from === to || !fxIsKind(toFx, from)) return null;
  const loop = forEachAt(d, own);
  const x = varFor(to, loop?.variable);
  if (loop) {
    const coll = loop.collection ?? "...";
    return `Each element of ${loop.collection ?? "the list"} is ${anWord(from)} for Java (a pane's children can be any kind of node), so the loop variable can't be ${anWord(to)}. Loop with ${from}, and check and cast each one inside: for (${from} node : ${coll}) { if (node instanceof ${to}) { ${to} ${x} = (${to}) node; ... } }. Or keep your ${to}s in a list of their own, a List<${to}>, as you create them.`;
  }
  const c = atCaret(d);
  const before = c ? beforeCaret(c) : "";
  const source = /getChildren(?:Unmodifiable)?\s*\(\s*\)\s*\.\s*get\s*$/.test(before) ? `getChildren().get(...) gives ${anWord(from)}, since a pane's children can be any kind of node` : /\blookup\s*$/.test(before) ? `lookup(...) gives ${anWord(from)}, since the node it finds can be any kind of node` : `This value is ${anWord(from)} for Java`;
  const value = assignedValue(d, own);
  const cast = value ? `, as in (${to}) ${value}` : "";
  return `${source}, and Java won't put ${anWord(from)} in ${anWord(to)} variable by itself, even when the node is ${anWord(to)}. Keep the ${to} in a variable of its own type when you create it, and use that variable. Or, if the node surely is ${anWord(to)}, cast it${cast} (if it isn't, the cast stops the program with a ClassCastException).`;
}

/** "no suitable constructor found for Scene(no arguments)". */
function fxScene(d: Diagnostic, own: OwnClasses): string | null {
  const got = /^no suitable constructor found for Scene\((.*?)\)/.exec(d.message)?.[1];
  if (got == null || knows(own, "Scene")) return null;
  const given = got === "no arguments" ? " Here it got nothing: give it the pane, as in new Scene(layout)." : "";
  return `new Scene(...) takes the window's root, the pane that holds its nodes, and, if you want, the window's width and height: new Scene(root) or new Scene(root, 300, 200).${given}`;
}

/** "getChildren() has protected access in Parent": getChildren() on a node that isn't a pane, such as a Button, or on what getRoot() gives. */
function fxProtectedChildren(d: Diagnostic, own: OwnClasses): string | null {
  if (!/^getChildren\(\) has protected access in (?:javafx\.scene\.)?Parent$/.test(d.message) || knows(own, "Parent")) return null;
  const p = caretIn(d, own);
  const value = p && p.code[p.at] === "." ? p.text.slice(expressionStart(p.code, p.at), p.at).trim() : "";
  const type = value ? typeOfName(d, own, value) : null;
  const fx = type ? fxTypeOf(own, type) : null;
  const panes = `only the panes (${FX_PANES}) have a list of children to add nodes to, getChildren()`;
  if (fx && fxIsKind(fx, "Control"))
    return `${value} is ${aNode(fx)}, and ${aNode(fx)} can't hold other nodes: ${panes}. To show ${value} together with other nodes, put them all in a pane, as in new HBox(${value}, ...).`;
  const root = /getRoot\s*\(\s*\)$/.test(value) ? "getRoot() gives the root as a Parent, even when it's a VBox, and " : "";
  return `${root}${value ? `${value} has the type ${type ?? "Parent"}, and ` : ""}a Parent doesn't let other code change its children: ${panes}. Keep the pane in a variable of its own type (VBox root = new VBox(); ... new Scene(root)) and use root.getChildren().`;
}

/** "method add in class GridPane cannot be applied to given types": a GridPane's add without the column and the row. */
function fxGridAdd(d: Diagnostic, own: OwnClasses): string | null {
  if (!/^(?:method add in class GridPane cannot be applied|no suitable method found for add\([^)]*\)[\s\S]*method GridPane\.add\()/.test(d.message)) return null;
  const call = callAt(d, own);
  const grid = call?.receiver || "grid";
  const node = call?.args[0] || "node";
  return `A GridPane places each node in a cell: ${grid}.add(${node}, column, row), as in ${grid}.add(${node}, 0, 0) for the top left cell, where the column and the row are whole numbers that start at 0.`;
}

/**
 * A JavaFX event handler or change listener that holds the offset `at`: a lambda given to setOnAction (or
 * another setOn... method) or addListener, or an inner class new EventHandler<...>() { ... } or new
 * ChangeListener<...>() { ... } given to one: the method it's given to, and where it is in the code.
 */
function fxHandlerAround(code: string, at: number, inner: boolean): { method: string; from: number; to: number } | null {
  if (!inner) {
    const l = lambdaAround(code, at);
    if (!l) return null;
    const before = code.slice(Math.max(0, l.arrow - 500), l.arrow);
    const p = /(\([^()]*\)|[\w$]+)\s*$/.exec(before);
    const method = p ? /([\w$]+)\s*\(\s*$/.exec(before.slice(0, p.index))?.[1] : undefined;
    return method && FX_HANDLER.test(method) ? { method, from: l.arrow, to: l.end } : null;
  }
  for (let open = blockAround(code, at); open >= 0; open = blockAround(code, open)) {
    const m = /([\w$]+)\s*\(\s*new\s+(?:[\w$]+\.)*(?:EventHandler|ChangeListener)\s*(?:<[^;{}]*>)?\s*\(\s*\)\s*$/.exec(code.slice(Math.max(0, open - 300), open));
    if (m && FX_HANDLER.test(m[1])) return { method: m[1], from: open, to: closeOf(code, open) };
  }
  return null;
}

/** A local variable that a JavaFX handler changes: keep it in an instance variable instead. */
function fxHandlerChanges(code: string, text: string, name: string, at: number, type: string | null, handler: { method: string }, inner: boolean): string {
  // The declaration: its text, and the method it's in.
  const n = escapeRegExp(name);
  let decl: { index: number; text: string } | null = null;
  for (const m of code.slice(0, at).matchAll(new RegExp(`(?<![\\w$.])(?:final\\s+)?[\\w$.]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*\\s+${n}\\s*(?:=(?!=)[^;]*)?;`, "g")))
    if (!/^(?:return|new|throw|else|case|yield)\b/.test(m[0])) decl = { index: m.index, text: text.slice(m.index, m.index + m[0].length).replace(/\s+/g, " ").trim() };
  const body = decl ? methodBodyAround(code, decl.index) : null;
  const header = body ? HEADER_END.exec(code.slice(Math.max(0, body[0] - 1000), body[0])) : null;
  const method = header?.[1] ?? "the method";
  const headText = body ? code.slice(Math.max(0, body[0] - 1000), body[0]) : "";
  const isStatic = /\bstatic\b[^;{}]*$/.test(headText);
  const listener = handler.method === "addListener";
  const who = `the ${listener ? "change listener" : "event handler"} given to ${handler.method}`;
  const when = listener ? "each time the value changes" : "each time its event happens";
  const declared = decl ? decl.text.replace(/^final\s+/, "") : null;
  const field = declared && type ? `private ${isStatic ? "static " : ""}${declared}` : null;
  const move = field ? `declare ${field} in the class, outside ${method}, and remove ${declared} from ${method}` : `declare ${name} in the class, outside ${method} (with its type, as an instance variable can't use var), and remove its declaration from ${method}`;
  return `${name} is a local variable of ${method}, and ${who} changes it: ${inner ? "code in an inner class" : "a lambda"} can only use local variables that never change after they get their value (Java calls that effectively final). The ${listener ? "listener" : "handler"} runs later, ${when}, after ${method} has ended, so keep the value in ${isStatic ? "a static variable" : "an instance variable"} instead: ${move}. The ${listener ? "listener" : "handler"} can change it there, and it keeps its value from one ${listener ? "change" : "event"} to the next.`;
}

/** A JavaFX class's method that replaces another with a different return type, or a static one: start, init and stop of Application. */
const FX_APP_METHODS = /^(?:start|init|stop)$/;

/** "start(Stage) in Three cannot override start(Stage) in Application; overriding method is static". */
function overrideStatic(d: Diagnostic): string | null {
  const m = /^([\w$]+)\((.*?)\) in ([\w$.]+) cannot (?:override|implement) [\w$]+\(.*?\) in ([\w$.]+)\n\s*overriding method is static$/m.exec(d.message);
  if (!m) return null;
  const [method, cls, parent] = [m[1], simple(m[3]), simple(m[4])];
  const fx = parent === "Application" && FX_APP_METHODS.test(method) ? ` JavaFX calls ${method} on the ${cls} object it creates.` : "";
  return `${method} in ${parent} belongs to each object (it isn't static), and a static method can't replace it. Remove static from ${method} in ${cls}.${fx}`;
}

/** "start(Stage) in Two cannot override start(Stage) in Application; return type int is not compatible with void". */
function overrideReturnType(d: Diagnostic): string | null {
  const m = /^([\w$]+)\((.*?)\) in ([\w$.]+) cannot (?:override|implement) [\w$]+\(.*?\) in ([\w$.]+)\n\s*return type (.+) is not compatible with (.+)$/m.exec(d.message);
  if (!m) return null;
  const [method, cls, parent, mine, theirs] = [m[1], simple(m[3]), simple(m[4]), simple(m[5].trim()), simple(m[6].trim())];
  const gives = theirs === "void" ? "is void: it gives back nothing" : `gives back ${anWord(theirs)}`;
  const must = theirs === "void" ? "be void too" : `give back ${anWord(theirs)} too (or a kind of it)`;
  return `${method} in ${cls} replaces the method ${method} of ${parent}, which ${gives}, so ${method} in ${cls} must ${must}: a method that replaces another must give back the same type. Change ${mine} to ${theirs} in its header.`;
}

/** Where the expression that starts at `from` ends: at the first ), ], ;, comma, && or || (or ? or :) outside its own brackets. */
function expressionEnd(code: string, from: number): number {
  let depth = 0;
  for (let k = from; k < code.length; k++) {
    const ch = code[k];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch)) {
      if (depth-- === 0) return k;
    } else if (depth === 0 && (ch === ";" || ch === "," || ch === "?" || ch === ":" || code.startsWith("&&", k) || code.startsWith("||", k))) return k;
  }
  return code.length;
}

/** Whether the code before `from` makes what starts there a condition or a true/false value: in if (...), while (...) or for (...), after return, in a boolean's initializer, or next to && || ! ?. */
function inCondition(code: string, from: number): boolean {
  const before = code.slice(Math.max(0, from - 300), from);
  if (/(?:\breturn|\bboolean\s+[\w$]+\s*=|&&|\|\||!|\?)\s*$/.test(before)) return true;
  let depth = 0;
  for (let k = from - 1; k >= 0 && k > from - 2000; k--) {
    const ch = code[k];
    if (ch === ")" || ch === "]") depth++;
    else if (ch === "[") depth--;
    else if (ch === "(") {
      if (depth-- > 0) continue;
      return /\b(?:if|while|for)\s*$/.test(code.slice(Math.max(0, k - 20), k));
    } else if (depth === 0 && (ch === "{" || ch === "}" || (ch === ";" && !/\bfor\s*\([^()]*$/.test(code.slice(Math.max(0, k - 200), k))))) return false;
  }
  return false;
}

/**
 * "unexpected type, required: variable, found: value": =, a compound assignment such as +=, or ++ or --
 * on something that isn't a variable: a == written as = (if (list.size() = 0), a + b = 3), a list's get(i)
 * given a value (set(i, v) does that), or a method call's value.
 */
function notAVariable(d: Diagnostic, own: OwnClasses): string | null {
  if (!/required: variable\n\s*found:\s+value/.test(d.message)) return null;
  const children = /getChildren\s*\(\s*\)\s*=(?!=)/.test(atCaret(d)?.line ?? "");
  if (children) return "getChildren() gives the pane's list of children, and a list a method gives can't be replaced with =. Change the list itself: getChildren().setAll(...) puts other nodes in it, getChildren().clear() empties it, and add(...) adds one.";
  const general = "The left side of = must be a variable, and this is a value, such as what a method call gives, so it can't get a new value with =. If the method has a setter to go with it, use that.";
  const p = caretIn(d, own);
  if (!p) return general;
  const { code, text, at } = p;
  // The left side: a call (javac's caret is on its "("), or an operation such as a + b (the caret is on its operator).
  const call = code[at] === "(";
  const from = expressionStart(code, at);
  let to = call ? pastClose(code, at) : at;
  if (to < 0) return general;
  const OP = /^\s*((?:<<|>>>?|[-+*/%&|^])?=(?!=)|\+\+|--)/;
  if (!call) {
    // Past the operation's right side, to the operator after it.
    let depth = 0;
    for (; to < code.length; to++) {
      const ch = code[to];
      if ("([".includes(ch)) depth++;
      else if (")]".includes(ch)) depth--;
      if (depth < 0 || ch === ";" || (depth === 0 && /^(?:(?:<<|>>>?|[-+*/%&|^])?=(?!=)|\+\+|--)/.test(code.slice(to, to + 4)) && !/[=!<>]$/.test(code.slice(0, to)))) break;
    }
  }
  const after = OP.exec(code.slice(to));
  const prefix = /(\+\+|--)\s*$/.exec(code.slice(Math.max(0, from - 10), from));
  const op = after?.[1] ?? prefix?.[1];
  if (!op) return general;
  const left = text.slice(from, to).replace(/\s+/g, " ").trim();
  if (!left || left.length > 60) return general;
  const valueAt = after ? to + after[0].length : -1;
  const right = valueAt >= 0 ? text.slice(valueAt, expressionEnd(code, valueAt)).replace(/\s+/g, " ").trim() : "";
  const get = /^(.+)\.\s*get\s*\((.+)\)$/.exec(left);
  const step = op === "++" || op === "--";
  if (op === "=") {
    const arithmetic = !call && /[-+*/%]/.test(code.slice(at, at + 1));
    const asks = /\.\s*(?:size|length|equals|isEmpty|contains|indexOf|compareTo|charAt)\s*\($/.test(code.slice(from, at + 1));
    if (arithmetic || asks || inCondition(code, from))
      return `To compare, use ==: one = gives a variable a new value, and ${left} is a value, not a variable. Write ${left} == ${right || "..."}.`;
    if (get) return `${left} gives the value at that index, not a place in the list that = can change. To put a value there, use set: ${get[1]}.set(${get[2]}, ${right || "..."});`;
    if (call) return general;
    return `The left side of = must be a variable, and ${left} is a value, so it can't get a new value with =.`;
  }
  if (get) {
    const change = step ? `${left} ${op[0]} 1` : `${left} ${op.slice(0, -1)} ${right || "..."}`;
    return `${left} gives the value at that index, not a place in the list that ${op} can change. To change the value there, use set: ${get[1]}.set(${get[2]}, ${change});`;
  }
  if (step) return `${op} changes a variable, and ${left} is a value${call ? " that a method call gives" : ""}, not a variable that keeps one, so ${op} can't change it. Keep the value in a variable of your own and use ${op} on that variable.`;
  return `The left side of ${op} must be a variable, and ${left} is a value${call ? " that a method call gives" : ""}, so ${op} can't give it a new value.`;
}

/**
 * JavaFX's launch stops the program with a RuntimeException when the application's constructor, init,
 * start or stop throws: which one, from the first line of the trace, with the class for the constructor.
 */
const FX_WRAPPER = /^java\.lang\.RuntimeException: (?:Exception in Application (start|init|stop) method|Unable to construct Application instance: class ([\w$.]+))\s*$/;

/** The start of the note for an exception that JavaFX's launch wrapped: what happened, and where the cause's line is. */
function fxWrapped(c: CrashContext, ownThrow: boolean): string {
  const fx = c.fx!;
  const [first] = c.frames;
  const stageFrame = c.frames.find((f) => (fx.stage === "constructor" ? f.method === "<init>" : f.method === fx.stage));
  const called = first && stageFrame && stageFrame !== first && methodLabel(stageFrame) !== methodLabel(first) ? `, called from ${methodLabel(stageFrame)} on line ${stageFrame.line}` : "";
  const cause = "with a RuntimeException whose cause (after \"Caused by:\") is this exception";
  const real = ownThrow ? " The cause is the real problem." : first ? ` The cause is the real problem, and its first line in your code is ${placeOf(first)}, in ${methodLabel(first)}${called}.` : " The cause is the real problem.";
  if (fx.stage === "constructor") return `JavaFX couldn't create your ${fx.cls ?? "application"} object, so it printed "Exception in Application constructor" and stopped the program ${cause}.${real}`;
  const when = fx.stage === "start" ? " while it built the window" : fx.stage === "init" ? ", before start" : ", as the program ended";
  return `Your ${fx.stage} method threw it${when}, so JavaFX printed "Exception in Application ${fx.stage} method" and stopped the program ${cause}.${real}`;
}

/** NoSuchMethodException "App.<init>()": JavaFX found no public constructor without parameters to create the application with. */
function noSuchMethod(m: string, c: CrashContext): string {
  const cls = /^([\w$.]+)\.<init>\(\)$/.exec(m)?.[1];
  if (!c.fx || !cls) return c.handler ? notCaughtInHandler(m) : `The program stopped with NoSuchMethodException${m ? `: ${m}` : ""}.`;
  const name = binarySimple(cls);
  const t = c.own ? typeNamed(c.own, name) : undefined;
  const start = `To create it, JavaFX calls ${name}'s public constructor without parameters, as new ${name}() would, and ${name} has none`;
  if (t && !t.public) return `${start}: ${name} isn't public, so its constructors aren't either. Write public class ${name} extends Application${fileName(t.file) === `${name}.java` ? "" : `, in a file of its own, ${name}.java`}.`;
  const lines = t ? (c.code.get(t.file) ?? []).slice(t.from - 1, t.to).join("\n") : "";
  const ctor = t ? [...lines.matchAll(new RegExp(`(?:^|[;{}])\\s*((?:(?:public|protected|private)\\s+)?)${escapeRegExp(name)}\\s*\\(([^()]*)\\)\\s*(?:throws\\s[^{]*)?\\{`, "g"))] : [];
  if (ctor.some((x) => !x[2].trim() && !/public/.test(x[1]))) return `${start}: its constructor without parameters isn't public. Write public in front of it: public ${name}() { ... }.`;
  if (ctor.length) return `${start}: its constructor takes (${ctor[0][2].replace(/\s+/g, " ").trim()}). Remove the parameters, or the whole constructor, and set those values up in init or start instead.`;
  return `${start}. Give it one, public ${name}() { ... }, or no constructor at all.`;
}

/** The node and its name, from the learner's line of a "Children:" error: the variable given twice, or what add(...) got. */
function childOnLine(c: CrashContext): string | null {
  const line = lineOf(c, c.frames[0]);
  if (!line) return null;
  const names = [...line.code.matchAll(/[(,]\s*([\w$]+)\s*(?=[,)])/g)].map((x) => x[1]);
  return names.find((n, i) => names.indexOf(n) !== i) ?? /\.\s*add\s*\(\s*([\w$]+)\s*\)/.exec(line.code)?.[1] ?? null;
}

/** "a VBox", "an HBox": a or an before a class's name as it's read aloud. */
const aNode = (name: string) => `${/^(?:[AEIOU]|H[A-Z])/.test(name) ? "an" : "a"} ${name}`;

/** IllegalArgumentException "Children: duplicate children added: parent = HBox@1b6d3586": a node added twice to one pane. */
function fxDuplicate(m: string, c: CrashContext): string {
  // A chart's own panes (as JavaFX names them): the same axis given twice, or the same point in two series.
  if (/\[styleClass=chart-content\]$/.test(m)) return "The program gave a chart the same axis twice, as in new LineChart<>(axis, axis): each axis is a node in the window, in one place only. Give the chart two axes of its own, as in new LineChart<>(new NumberAxis(), new NumberAxis()).";
  if (/\[styleClass=plot-content\]$/.test(m)) return "The program put the same data point in two series of one chart: each XYChart.Data is one point, drawn in one place. Create a new XYChart.Data<>(x, y) for each series, even when the values are the same.";
  const parent = /parent = ([\w$]+)@/.exec(m)?.[1];
  const node = childOnLine(c);
  // The node's class, from where the variable is created with new, for the example.
  const all = [...c.code.values()].map((l) => l.join("\n")).join("\n");
  const cls = node ? new RegExp(`(?<![\\w$.])${escapeRegExp(node)}\\s*=\\s*new\\s+([\\w$]+)`).exec(all)?.[1] : undefined;
  // Only an exception that escaped an event handler (JavaFX printed it and went on): not one in start, nor in a lambda that start runs right away.
  const handler = c.handler ? " This happened in an event handler, which runs again each time its event happens: add the node once, in start, or create a new node in the handler each time." : "";
  return `The program added a node to ${parent ? aNode(parent) : "a pane"} that already holds it: ${node ? `${node} is` : "it's"} already one of its children (from the pane's constructor or an earlier add). A node is one thing on the screen, in one place, so a pane can't have it twice. To show two such things, create two nodes, as in two new ${cls ?? "Button"}(...). To add several nodes at once, list each one once, as in addAll(a, b, c).${handler}`;
}

/** IllegalArgumentException "Children: cycle detected: parent = VBox@..., node = VBox@...": a pane put inside itself. */
function fxCycle(m: string): string {
  const [, parent, node] = /parent = ([\w$]+)@[\s\S]*node = ([\w$]+)@/.exec(m) ?? [];
  return `The program put a pane inside itself: it added ${node ? aNode(node) : "a pane"} to the children of ${parent ? aNode(parent) : "a node"} that is already inside it. A pane can hold other nodes, but not itself, not even through other panes. Check which pane goes inside which: the outer pane's getChildren() gets the inner one, not the other way round.`;
}

/** The class a node's toString starts with (VBox@59721f8[styleClass=root]): VBox, or a class of the program's own. */
const nodeClassIn = (m: string) => binarySimple(/^([\w$.]+)@/.exec(m)?.[1] ?? "");

/** IllegalArgumentException "VBox@59721f8[styleClass=root]is already set as root of another scene": one layout given to two scenes. */
function fxRootOfAnother(m: string, c: CrashContext): string {
  const cls = nodeClassIn(m);
  const layout = cls ? aNode(cls) : "a layout";
  const handler = c.handler ? " This happened in an event handler, which runs again each time its event happens: a new Scene(...) of the same layout there works at the first click and fails at the next." : "";
  return `The program gave a scene a root, ${layout}, that is already the root of another scene. A layout can be the root of only one scene, so new Scene(sameLayout) works the first time and fails the second (and setRoot with it fails the same way). Make each scene once, in start, keep it in a variable, and switch the window to it with stage.setScene(thatScene).${handler}`;
}

/** IllegalArgumentException "VBox@4003b52bis already inside a scene-graph and cannot be set as root": a node in a pane made a scene's root. */
function fxRootInPane(m: string): string {
  const cls = nodeClassIn(m);
  const node = cls ? aNode(cls) : "a node";
  return `The program made ${node} the root of a scene (with new Scene(...) or setRoot), but it is already inside a pane: one of its children, or one of a BorderPane's regions, such as its center. A node is in one place only, so it can't also be a scene's root. Use the pane that holds it as the root, or the scene that pane is in, or remove it from that pane first.`;
}

/** NullPointerException "Children: child node is null": null added to a pane's children. */
function fxNullChild(m: string, c: CrashContext): string {
  const parent = /parent = ([\w$]+)@/.exec(m)?.[1];
  const node = childOnLine(c);
  return `The program added null to the children of ${parent ? aNode(parent) : "a pane"}: ${node ? `${node} holds` : "the value it added holds"} no node yet. Create the node with new before adding it, as in ${node ?? "button"} = new Button("..."). A variable declared without a value, such as an instance variable, is null until the code gives it one.`;
}

/** RuntimeException "Error: class Main is not a subclass of javafx.application.Application": launch(args) in a class that doesn't extend Application. */
function fxNotApplication(cls: string, c: CrashContext): string {
  const name = binarySimple(cls);
  const app = c.own ? fxApps(c.own)[0] : undefined;
  const other = app ? `, or start ${app.name}, which extends Application, with Application.launch(${app.name}.class, args)` : "";
  return `launch(args) starts the class whose main calls it, here ${name}, as a JavaFX program, so ${name} must extend Application, and it doesn't. Make ${name} a JavaFX program, public class ${name} extends Application with a method public void start(Stage stage)${other}.`;
}

// ---- Charts, drawing and images with JavaFX (MOOC part 14, sections 14.1 and 14.2) ----

/** The classes inside a class of the practice version: XYChart.Series and XYChart.Data, with what each is and an example. */
const FX_NESTED: Record<string, { outer: string; what: string; example: string }> = {
  Series: { outer: "XYChart", what: "a line of data points with a name", example: "XYChart.Series<Number, Number> series = new XYChart.Series<>();" },
  Data: { outer: "XYChart", what: "one data point, an x value and a y value", example: "series.getData().add(new XYChart.Data<>(2020, 15));" },
};
/** "XYChart has two classes inside it: ...", for a name that isn't one of them. */
const FX_XYCHART_INSIDE = `XYChart has two classes inside it, Series (${FX_NESTED.Series.what}) and Data (${FX_NESTED.Data.what}), written XYChart.Series and XYChart.Data`;

/**
 * "cannot find symbol: class Series" (or Data) in a JavaFX program: a class inside XYChart written
 * without XYChart in front, or imported from javafx.scene.chart as if it were a class of its own;
 * or a class XYChart doesn't have inside it (XYChart.Point).
 */
function fxNested(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+class ([\w$]+)(?:\n\s*location: (class|interface|package) ([\w$.]+))?/.exec(d.message);
  if (!m || !fxProgram(own)) return null;
  const [, name, kind, where] = m;
  if (kind && kind !== "package" && simple(where) === "XYChart" && !knows(own, "XYChart")) {
    const near = fxNear(name, Object.keys(FX_NESTED));
    return `${FX_XYCHART_INSIDE}, and it has no class ${name}.${near ? ` Did you mean XYChart.${near}? Upper and lower case matter.` : ""}`;
  }
  const nested = FX_NESTED[name];
  if (!nested || knows(own, name)) return null;
  const outer = `${FX[nested.outer].pkg}.${nested.outer}`;
  if (kind === "package")
    return where === FX[nested.outer].pkg
      ? `${name} isn't a class of ${where} of its own: it's a class inside ${nested.outer}, so import ${nested.outer} instead, import ${outer};, and write ${nested.outer}.${name} in the code. (import ${outer}.${name}; works too, and then ${name} alone is enough.)`
      : null;
  const imported = fxImported(own, d.file, FX[nested.outer].pkg, nested.outer) ? "" : ` (with import ${outer}; at the top of the file)`;
  return `${name} is a class inside ${nested.outer}: ${nested.what}. Outside ${nested.outer}, its name is ${nested.outer}.${name}, so write ${nested.outer}.${name}${imported}, as in ${nested.example}`;
}

/** "package XYChart does not exist": XYChart.Series (or another class's name and a dot) when the class isn't imported, so Java reads it as a package. */
function fxOuterAsPackage(d: Diagnostic, own: OwnClasses): string | null {
  const name = /^package ([A-Z][\w$]*) does not exist/.exec(d.message)?.[1];
  if (!name || !FX[name] || knows(own, name) || !fxProgram(own)) return null;
  const inner = new RegExp(`(?<![\\w$.])${escapeRegExp(name)}\\s*\\.\\s*([A-Z][\\w$]*)`).exec(atCaret(d)?.line ?? "")?.[1];
  const what = inner ? `${name}.${inner} is the class ${inner} inside ${name}` : `The name before the dot is the class ${name}`;
  return `${what}, and Java doesn't know ${name} here because it isn't imported, so it reads ${name} as the name of a package, and there is no such package. Import ${name} at the top of the file: import ${FX[name].pkg}.${name};`;
}

/** The charts of the practice version: their axes decide the types of their values. */
const FX_CHART = /^(?:LineChart|BarChart|ScatterChart)$/;
/** The axis class whose values are of a type: CategoryAxis for String, NumberAxis for Number. */
const fxAxisFor = (type: string) => (type === "String" ? "CategoryAxis" : type === "Number" ? "NumberAxis" : null);

/**
 * "cannot infer type arguments for LineChart<> (inference variable X has incompatible equality
 * constraints Number,String)" or "CategoryAxis cannot be converted to Axis<Number>": a chart given
 * an axis for other values than its angle brackets say, as a CategoryAxis where the values are numbers.
 */
function fxChartAxes(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const inferred = /^incompatible types: cannot infer type arguments for (?:[\w$]+\.)*([\w$]+)<>\n\s*reason: inference variable ([XY]) has incompatible equality constraints ([\w$.]+),([\w$.]+)/.exec(d.message);
  const given = /^incompatible types: (CategoryAxis|NumberAxis) cannot be converted to Axis<([\w$.]+)>/.exec(d.message);
  const call = callAt(d, own);
  let chart: string, x: boolean, want: string, axis: string | null;
  if (inferred) [chart, x, want, axis] = [inferred[1], inferred[2] === "X", simple(inferred[3]), fxAxisFor(simple(inferred[4]))];
  else if (given && call?.newClass && call.index >= 0) [chart, x, want, axis] = [call.name, call.index === 0, simple(given[2]), given[1]];
  else return null;
  if (!FX_CHART.test(chart) || knows(own, chart) || !axis || !fxAxisFor(want) || fxAxisFor(want) === axis) return null;
  const has = axis === "CategoryAxis" ? "String" : "Number";
  const which = x ? "x" : "y";
  // The new chart's arguments, when the caret is on its <> (javac's place for a diamond) or in its parentheses.
  const p = caretIn(d, own);
  const open = p ? /^\s*<\s*>\s*\(/.exec(p.code.slice(p.at)) : null;
  const args = open && p ? argumentsOf(p.code, p.text, p.at + open[0].length - 1) : call?.newClass && call.name === chart ? call.args : [];
  const arg = args[x ? 0 : 1];
  const shown = arg && arg.length <= 40 ? ` (${arg})` : "";
  // The chart's angle brackets as the line declares them, with the value type that fits the axis instead.
  const declared = new RegExp(`\\b${chart}\\s*<\\s*([\\w$.]+)\\s*,\\s*([\\w$.]+)\\s*>`).exec(atCaret(d)?.line ?? "");
  const [tx, ty] = declared ? [simple(declared[1]), simple(declared[2])] : [x ? want : "String", x ? "Number" : want];
  const fitting = `${chart}<${x ? has : tx}, ${x ? ty : has}>`;
  const what = has === "String" ? "names, such as \"Helsinki\" or \"2020\" in quotes" : "numbers";
  const series = `XYChart.Series<${x ? has : tx}, ${x ? ty : has}>`;
  const replace = `give the chart a ${fxAxisFor(want)} there: new ${fxAxisFor(want)}()`;
  const head = `A chart's axes decide the types of its values: ${chart}<X, Y> takes an axis for X values first and one for Y values second. A NumberAxis is for numbers (Number), and a CategoryAxis is for names (String). Here the ${which} axis${shown} is a ${axis}, for ${what}, but the angle brackets say the ${which} values are ${want}s.`;
  if (chart !== "BarChart") {
    const fix =
      has === "String"
        ? `If the ${which} values are numbers, ${replace}. If they are names, write String for them in the angle brackets, ${fitting}, and in its series' too, ${series}.`
        : `If the ${which} values are names (text in quotes), ${replace}. If they are numbers, write Number for them in the angle brackets, ${fitting}, and in its series' too, ${series}.`;
    return `${head} ${fix}`;
  }
  // A BarChart needs one axis of each kind: no advice may leave it two of the same, which compiles and then throws.
  const bar = "A BarChart needs one of each: a CategoryAxis for the bars' names and a NumberAxis for their heights.";
  const otherArg = args[x ? 1 : 0];
  const otherAxis = fxAxisOf(d, own, otherArg);
  const otherType = declared ? (x ? ty : tx) : null;
  // The two axes the wrong way round for the angle brackets: each would fit the other place.
  if (otherAxis && otherAxis !== axis && otherType && fxAxisFor(otherType) === axis) {
    const [ax, ay] = x ? [arg, otherArg] : [otherArg, arg];
    const swappedAxes = ax && ay && ax.length <= 40 && ay.length <= 40 ? `new BarChart<>(${ay}, ${ax})` : `new BarChart<>(new ${x ? otherAxis : axis}(), new ${x ? axis : otherAxis}())`;
    const opposite = has === "String" ? "Number" : "String";
    const [kx, ky] = x ? [has, opposite] : [opposite, has];
    const sideways = kx === "Number" ? "lie sideways, with their names on the y axis" : "stand up, with their names on the x axis";
    return `${head} ${bar} Here the two axes are the wrong way round for the angle brackets: swap them so they fit, ${swappedAxes}. Or, if you want the bars to ${sideways}, swap the types in the angle brackets instead so they match the axes: BarChart<${kx}, ${ky}>, and in its series' too, XYChart.Series<${kx}, ${ky}>.`;
  }
  // Another axis there fits only when the other axis isn't of the same kind; other angle brackets only when the other type isn't.
  const byAxis = !otherAxis || otherAxis !== fxAxisFor(want);
  const byTypes = !!declared && fxAxisFor(otherType ?? "") !== axis;
  const fix =
    byAxis && byTypes
      ? `If the ${which} values are ${has === "String" ? "numbers" : "names (text in quotes)"}, ${replace}. If they are ${has === "String" ? "names" : "numbers"}, write ${has} for them in the angle brackets, ${fitting}, and in its series' too, ${series}.`
      : byTypes
        ? `Write ${has} for the ${which} values in the angle brackets, ${fitting}, and in its series' too, ${series}.`
        : byAxis
          ? `As the ${which} values are ${want}s, ${replace}.`
          : `The other axis${otherArg && otherArg.length <= 40 ? ` (${otherArg})` : ""} is already a ${otherAxis}: if the two are the wrong way round, swap them.`;
  return `${head} ${fix} (${bar})`;
}

/** The kind of axis an argument is, as written (new NumberAxis(...), or a variable declared as one), or null. */
function fxAxisOf(d: Diagnostic, own: OwnClasses, arg: string | undefined): string | null {
  if (!arg) return null;
  const made = /^new\s+(?:javafx\.scene\.chart\.)?(CategoryAxis|NumberAxis)\s*\(/.exec(arg)?.[1];
  if (made) return knows(own, made) ? null : made;
  const type = typeOfName(d, own, arg);
  const fx = type ? fxTypeOf(own, type) : null;
  return fx === "CategoryAxis" || fx === "NumberAxis" ? fx : null;
}

/** The values of new XYChart.Data<>(x, y) (or new XYChart.Data<Number, Number>(...)) whose caret is on the class's name or its <>, as written. */
function fxDataArguments(d: Diagnostic, own: OwnClasses): string[] {
  const p = caretIn(d, own);
  if (!p) return [];
  const m = /^(?:\.\s*)?(?:Data\s*)?<[^<>]*>\s*\(/.exec(p.code.slice(p.at));
  return m ? argumentsOf(p.code, p.text, p.at + m[0].length - 1) : [];
}

/** A value of the wrong type for a data point: `x` says which of its two values, `arg` is the value as written. */
function fxDataText(x: boolean, want: string, got: string, arg: string | undefined): string {
  const which = x ? "x" : "y";
  const it = arg && arg.length <= 40 ? `${arg} is ${anWord(got)}` : `it's ${anWord(got)}`;
  const head = `new XYChart.Data<>(x, y) takes the x value first and the y value second, and their types must be the series' types, the ones in its angle brackets. Here the ${which} value must be ${anWord(want)}, and ${it}.`;
  const unquoted = arg && /^"-?\d+(?:\.\d+)?"$/.test(arg) ? arg.slice(1, -1) : null;
  if (got === "String" && want === "Number")
    return `${head} Text in quotes is a String, even when it looks like a number: write the number without quotes${unquoted ? `, ${unquoted}` : ""}.${x ? " If the x values are names, such as years written \"2020\" for a CategoryAxis, write String for them in the series' and the chart's angle brackets: XYChart.Series<String, Number>." : ""}`;
  if (want === "String" && /^(?:Integer|Double|Long|Float|Short|Byte|Number)$/.test(got))
    return `${head} A number isn't text. If the ${which} values are names on a CategoryAxis, write this one in quotes${arg && /^-?\d+(?:\.\d+)?$/.test(arg) ? `, "${arg}"` : ""}. If they are numbers, write Number for them in the series' and the chart's angle brackets, and give the chart a NumberAxis.`;
  return `${head} Pass ${anWord(want)} there, or change the types in the series' angle brackets.`;
}

/** "cannot infer type arguments for Data<> (inference variable Y has incompatible bounds ...)": new XYChart.Data<>(...) with a value of another type than its series'. */
function fxDataDiamond(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: cannot infer type arguments for (?:[\w$]+\.)*Data<>\n\s*reason: inference variable ([XY]) has incompatible bounds\n\s*equality constraints: ([\w$.]+)\n\s*lower bounds: ([\w$.]+)$/m.exec(d.message);
  if (!m || !usesFX(own) || knows(own, "Data")) return null;
  const x = m[1] === "X";
  return fxDataText(x, simple(m[2]), simple(m[3]), fxDataArguments(d, own)[x ? 0 : 1]);
}

/** Whether a piece of code opens as many parentheses and angle brackets as it closes (an argument not cut at a comma inside them). */
const balanced = (code: string) => [..."(<"].every((o, i) => code.split(o).length === code.split(")>"[i]).length);

/** "Series<String,Number> cannot be converted to Series<Number,Number>": a series of other types than the chart's (or a point of other types than the series'). */
function fxSeriesTypes(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: (?:[\w$]+\.)*(Series|Data)<([\w$.]+),\s*([\w$.]+)> cannot be converted to (?:[\w$]+\.)*\1<([\w$.]+),\s*([\w$.]+)>$/m.exec(d.message);
  if (!m || !usesFX(own) || knows(own, m[1])) return null;
  const [, cls, gx, gy, wx, wy] = m.map((s) => simple(s));
  const call = callAt(d, own);
  const arg = call && call.index >= 0 ? call.args[call.index] : "";
  // The argument as split at its commas, which don't skip those inside angle brackets: shown only when whole.
  const it = arg && arg.length <= 40 && balanced(arg) ? `${arg} is` : "This is";
  const series = cls === "Series";
  const holder = series ? "a chart" : "a series";
  const differs = gx !== wx ? `x values (${gx} and ${wx})` : `y values (${gy} and ${wy})`;
  const axes = series ? ` The chart's axes show values of its types: a NumberAxis shows Numbers, a CategoryAxis Strings.` : "";
  return `${it} an XYChart.${cls}<${gx}, ${gy}>, and ${holder} of ${wx} and ${wy} values takes only XYChart.${cls}<${wx}, ${wy}>: the types in the angle brackets must be the same, and here the ${differs} differ.${axes} Declare the ${series ? "series" : "point"} with the same types as the ${series ? "chart" : "series"}, as in XYChart.${cls}<${wx}, ${wy}>, or change the ${series ? "chart's types (and its axis)" : "series' types"} to ${gx} and ${gy}.`;
}

/**
 * A chart class written without its types in angle brackets, as in XYChart.Series series = new
 * XYChart.Series(); (Java calls that a raw type): the first one in the program, as written, or null.
 */
function fxRawChart(own: OwnClasses): { name: string; written: string; variable?: string } | null {
  if (!usesFX(own)) return null;
  const raw = /(?<![\w$.])((?:XYChart\s*\.\s*)?(Series|Data)|(LineChart|BarChart|ScatterChart))(?=\s*(?:\(|[A-Za-z_$]))(?:\s+([\w$]+))?/g;
  for (const lines of own.code.values())
    for (const line of lines)
      for (const m of line.matchAll(raw)) {
        const name = m[2] ?? m[3];
        // XYChart.Series(...) needs new in front, and a class of the program's own of that name isn't JavaFX's.
        if (knows(own, name) || (m[2] && !/XYChart/.test(m[1]) && !FX_NESTED[name]) || /^(?:extends|implements|instanceof)$/.test(m[4] ?? "")) continue;
        const call = line.slice(m.index + m[1].length).trimStart().startsWith("(");
        if (call && !/\bnew\s+$/.test(line.slice(0, m.index))) continue;
        return { name, written: m[1].replace(/\s+/g, ""), variable: call ? undefined : m[4] };
      }
  return null;
}

/** How a chart class is written with its types: the example for the note about raw types. */
function fxWithTypes(name: string): string {
  if (name === "Series") return "XYChart.Series<Number, Number> series = new XYChart.Series<>();";
  if (name === "Data") return "new XYChart.Data<>(2020, 15) in a series of XYChart.Series<Number, Number>";
  return `${name}<Number, Number> chart = new ${name}<>(new NumberAxis(), new NumberAxis());`;
}

/** javac's note about unchecked operations in a JavaFX program with a chart class written without its types, or null. */
function fxRawNote(own: OwnClasses): string | null {
  const raw = fxRawChart(own);
  if (!raw) return null;
  return `This is a note, not an error: the program compiles and runs. Java says it can't check some types for you, and here that's because ${raw.written} is written without its types in angle brackets. Then Java can't check that the values fit the chart, such as a number given to a chart whose x axis is a CategoryAxis. Write the types in, as in ${fxWithTypes(raw.name)} (new ...<>() takes them from the variable), and the note goes away.`;
}

/** "incompatible types: Object cannot be converted to Data<Number,Number>": the data of a series declared without its types. */
function fxRawObject(d: Diagnostic, own: OwnClasses): string | null {
  const to = /^incompatible types: Object cannot be converted to (?:[\w$]+\.)*(Series|Data)<(.*)>$/m.exec(d.message);
  const raw = to ? fxRawChart(own) : null;
  if (!to || !raw) return null;
  const from = /([\w$]+)\s*\.\s*getData\s*\(\s*\)/.exec(atCaret(d)?.line ?? "")?.[1];
  const named = from ?? raw.variable;
  return `${named ? `${named} is` : `${raw.written} is`} declared without its types in angle brackets, so for Java its getData() holds plain Objects, and an Object can't go in a variable of type XYChart.${to[1]}<${to[2].replace(/,(?! )/g, ", ")}>. Declare it with its types, as in ${fxWithTypes(raw.name)}`;
}

/** Methods of the practice version that give a double: sizes, positions and a slider's values. */
const FX_DOUBLE = /\b(getWidth|getHeight|getValue|getX|getY|getSceneX|getSceneY|getMin|getMax|getLowerBound|getUpperBound|getTickUnit|getMajorTickUnit|getLineWidth|getRed|getGreen|getBlue|getOpacity)\s*\(\s*\)/;

/** "possible lossy conversion from double to int" for a JavaFX method that gives a double, such as an image's getWidth() or a slider's getValue(). */
function fxLossy(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const c = atCaret(d);
  if (!c) return null;
  // The call javac means: the last one that ends at the caret or before it (javac's caret is on its parenthesis), or else the first after it.
  const caret = c.line.length - c.at.length;
  const calls = [...c.line.matchAll(new RegExp(FX_DOUBLE.source, "g"))];
  const m = calls.filter((x) => x.index <= caret).pop() ?? calls[0];
  if (!m) return null;
  const method = m[1];
  // A method of the program's own of that name (a Point's getX) may be the one called.
  if ([...own.types.values()].some((t) => t.members.some((x) => x.method && x.name === method))) return null;
  const end = m.index + m[0].length;
  const value = c.line.slice(expressionStart(c.line, end), end).replace(/\s+/g, "");
  const to = /possible lossy conversion from double to (\w+)/.exec(d.message)?.[1] ?? "int";
  // What the method is called on: its declared type (where it's in scope) says whose method it is. An
  // untyped lambda parameter (event -> ...), a chain or a cast leaves it unknown, and then it's JavaFX's.
  const receiver = value.slice(0, value.length - m[0].replace(/\s+/g, "").length).replace(/\.$/, "");
  const type = scopedTypeOf(d, own, receiver);
  const fx = type ? fxTypeOf(own, type) : null;
  const known = type != null;
  // A DoubleProperty's getValue() gives a Double, which a cast to int doesn't take: its get() gives the double.
  const property = method === "getValue" && ((fx && fxIsKind(fx, "DoubleProperty")) || /valueProperty\(\)$/.test(receiver));
  const number = property ? `${receiver}.get()` : value;
  const cast = `(${to}) ${number}`;
  if (/^(?:getWidth|getHeight)$/.test(method) && (!known || fx))
    return `${value} gives a double: JavaFX measures sizes in doubles, even an image's width and height in pixels. Where a whole number is needed, as for a loop's bound, a pixel's x and y or new WritableImage(...), cast it: ${cast}.`;
  if (/^(?:getX|getY|getSceneX|getSceneY)$/.test(method) && (!known || (fx && fxIsKind(fx, "MouseEvent"))))
    return `${value} gives a double: the mouse's position can be between two pixels, such as 12.5. Where a whole number is needed, as for a pixel's x and y, cast it: ${cast} drops the decimals.`;
  if (/^(?:getValue|getMin|getMax)$/.test(method) && (!known || (fx && (fxIsKind(fx, "Slider") || property))))
    return `${value} gives a double, such as 25.0 or 25.4 (a slider moves smoothly between its min and max). For a whole number, cast it: ${cast} drops the decimals, and (${to}) Math.round(${number}) rounds it to the nearest one.`;
  // Not JavaFX's: the method may give a double or a Double (as a Map.Entry<String, Double>'s getValue()), and a cast such as (int) takes only the first.
  if (known && !fx)
    return `${value} gives a decimal number. Where a whole number is needed, round it: (${to}) Math.round(${value}) gives the nearest one, whether ${value} gives a double or a Double.`;
  return `${value} gives a double. Where a whole number is needed, cast it: ${cast} drops the decimals.`;
}

/** The ( or { that the code at `at` is inside, or -1. */
function openAround(code: string, at: number): number {
  let depth = 0;
  for (let k = at - 1; k >= 0; k--) {
    const ch = code[k];
    if (")]}".includes(ch)) depth++;
    else if ("([{".includes(ch) && depth-- === 0) return k;
  }
  return -1;
}

/** Where the bracket that opens at `open` ((, [ or {) closes, or the code's length. */
function bracketClose(code: string, open: number): number {
  const [o, c] = code[open] === "{" ? ["{", "}"] : code[open] === "(" ? ["(", ")"] : ["[", "]"];
  let depth = 0;
  for (let k = open; k < code.length; k++) {
    if (code[k] === o) depth++;
    else if (code[k] === c && --depth === 0) return k;
  }
  return code.length;
}

/**
 * Where the body that starts at `from` ends: a block in { } (after an optional -> or a throws clause),
 * or else one statement or a lambda's expression, up to its ; or , or the bracket that closes around it.
 */
function bodyEnd(code: string, from: number): number {
  const head = /^\s*(?:->\s*)?(?:throws\s+[\w$.\s,]+?(?=\{))?\s*/.exec(code.slice(from));
  const k = from + (head ? head[0].length : 0);
  if (code[k] === "{") return bracketClose(code, k);
  let depth = 0;
  for (let j = k; j < code.length; j++) {
    const ch = code[j];
    if ("([{".includes(ch)) depth++;
    else if (")]}".includes(ch) && depth-- === 0) return j;
    else if ((ch === ";" || ch === ",") && depth === 0) return j;
  }
  return code.length;
}

/** Whether a variable declared at `from` (a local, a field, a parameter of a method, a lambda, a catch or a for) still exists at `at`. */
function inScopeAt(code: string, from: number, at: number): boolean {
  const open = openAround(code, from);
  if (open < 0) return true;
  if (code[open] === "{") return at < bracketClose(code, open);
  if (code[open] === "[") return false;
  const close = bracketClose(code, open);
  return at < close || at < bodyEnd(code, close + 1);
}

/**
 * The declared type of a variable at javac's caret, minding where each declaration of the name holds:
 * the nearest one in scope there, or null when that's var or an untyped lambda parameter (event -> ...),
 * or there is none. (typeOfName takes the last declaration before the caret, wherever its block ended.)
 */
function scopedTypeOf(d: Diagnostic, own: OwnClasses, name: string): string | null {
  const p = caretIn(d, own);
  if (!p || !/^(?:this\s*\.\s*)?[\w$]+$/.test(name)) return null;
  const n = escapeRegExp(name.replace(/^this\s*\.\s*/, ""));
  const before = p.code.slice(0, p.at);
  let best: { at: number; type: string | null } | null = null;
  const typed = new RegExp(`(?<![\\w$.])((?:[\\w$]+\\.)*[\\w$]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*)\\s+${n}(?![\\w$])(?=\\s*[=;:,)])`, "g");
  for (const m of before.matchAll(typed))
    if (!/^(?:return|new|throw|else|case|yield|assert|instanceof)$/.test(m[1]) && inScopeAt(p.code, m.index, p.at)) best = { at: m.index, type: m[1].replace(/\s+/g, "") };
  // Lambda parameters without types: e -> ..., (a, e) -> ...; each holds in its lambda's body.
  const untyped = new RegExp(`(?:(?<![\\w$.])${n}|\\(\\s*(?:[\\w$]+\\s*,\\s*)*${n}\\s*(?:,\\s*[\\w$]+\\s*)*\\))\\s*->`, "g");
  for (const m of before.matchAll(untyped)) {
    const body = m.index + m[0].length;
    if (p.at >= body && p.at < bodyEnd(p.code, body) && (!best || m.index > best.at)) best = { at: m.index, type: null };
  }
  const type = best?.type;
  return type && type !== "var" ? simple(type.replace(/<.*$/, "")) : null;
}

/** What a slider's listener gets, in a sentence, and how to write it. */
const FX_NUMBER_LISTENER =
  "A slider's valueProperty() is a DoubleProperty, and JavaFX makes it an ObservableValue<Number>, not <Double>: its change listeners get Numbers. Write the listener for Number, as in slider.valueProperty().addListener((observable, oldValue, newValue) -> ...) without types, or with Number where this says";

/** "ChangeListener<Double> cannot be converted to ChangeListener<? super Number>": a slider's listener written for Doubles. */
function fxNumberListener(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^incompatible types: (?:<anonymous )?ChangeListener<(Double|Integer|Long|Float)>>? cannot be converted to ChangeListener<\? super Number>$/m.exec(d.message);
  if (!m || !usesFX(own)) return null;
  return `${FX_NUMBER_LISTENER} ${m[1]} (ChangeListener<Number>, ObservableValue<? extends Number> and Number oldValue, Number newValue). Then newValue.doubleValue() gives the value as a double, and newValue.intValue() as a whole number.`;
}

/** The expression that javac's caret marks, as written: a name, or a call (the caret on its parenthesis), or null when it can't tell or it's long. */
function numberAt(d: Diagnostic, own: OwnClasses): { text: string; name: boolean } | null {
  const p = caretIn(d, own);
  if (!p) return null;
  const { code, text, at } = p;
  let end = -1;
  if (code[at] === "(") end = pastClose(code, at);
  else if (code[at] === "[") end = pastClose(code, at);
  else {
    const name = /^[\w$]+/.exec(code.slice(at))?.[0];
    if (name && /^[A-Za-z_$]/.test(name)) end = at + name.length;
  }
  if (end < 0) return null;
  const shown = text.slice(expressionStart(code, end), end).replace(/\s+/g, " ").trim();
  return shown && shown.length <= 40 ? { text: shown, name: /^[\w$]+$/.test(shown) } : null;
}

/** The operand right after a binary operator that ends at `from`, as written: a name, a number or a chain of calls, or null. */
function operandAfter(code: string, text: string, from: number): string | null {
  const head = /^\s*(-?[\w$.]+)/.exec(code.slice(from));
  if (!head) return null;
  let end = from + head[0].length;
  for (let n = 0; n < 20; n++) {
    const next = /^\s*(?:\.\s*[\w$]+|[(\[])/.exec(code.slice(end));
    if (!next) break;
    const last = next[0][next[0].length - 1];
    if (last === "(" || last === "[") {
      const close = pastClose(code, end + next[0].length - 1);
      if (close < 0) return null;
      end = close;
    } else end += next[0].length;
  }
  const shown = text.slice(from, end).replace(/\s+/g, " ").trim();
  return shown.length <= 40 ? shown : null;
}

/** Whether a name is a parameter of a change listener at javac's caret: of a lambda given to addListener, or of an anonymous ChangeListener's changed. */
function listenerParameter(d: Diagnostic, own: OwnClasses, name: string): boolean {
  const p = caretIn(d, own);
  if (!p) return false;
  const names = (list: string) => list.split(",").map((x) => /([\w$]+)\s*$/.exec(x.trim())?.[1]);
  for (const m of p.code.slice(0, p.at).matchAll(/\baddListener\s*\(\s*(?:\(([^()]*)\)|([\w$]+))\s*->/g)) {
    const body = m.index + m[0].length;
    if (names(m[1] ?? m[2]).includes(name) && p.at < bodyEnd(p.code, body)) return true;
  }
  for (const m of p.code.slice(0, p.at).matchAll(/\bchanged\s*\(([^()]*)\)\s*\{/g)) {
    const open = m.index + m[0].length - 1;
    if (names(m[1]).includes(name) && p.at < bracketClose(p.code, open)) return true;
  }
  return false;
}

/** What a slider's change listener gets, in a parenthesis after a Number's name. */
const FX_LISTENER_NUMBERS = "a slider's change listener gets its old and new value as Numbers (a slider's value is a DoubleProperty, an ObservableValue<Number>)";

/** "incompatible types: Number cannot be converted to int": a Number (as a slider listener's newValue) used as a number of a primitive type. */
function fxNumberValue(d: Diagnostic, own: OwnClasses): string | null {
  const to = /^incompatible types: Number cannot be converted to (int|double|long|float|short|byte|Integer|Double|Long|Float)$/m.exec(d.message)?.[1];
  if (!to || !usesFX(own)) return null;
  const v = numberAt(d, own);
  const method = /^(?:double|Double)$/.test(to) ? "doubleValue" : /^(?:long|Long)$/.test(to) ? "longValue" : /^(?:float|Float)$/.test(to) ? "floatValue" : "intValue";
  const why = v?.name && listenerParameter(d, own, v.text) ? `: ${FX_LISTENER_NUMBERS}` : ", an object that holds a number";
  if (!v) return `This is a Number, an object that holds a number, and Java won't turn a Number into ${anWord(to)} by itself: take the number out of it with its ${method}()${method === "intValue" ? ", which drops the decimals (or doubleValue() for the double)" : ""}.`;
  return `${v.text} is a Number${why}. Java won't turn a Number into ${anWord(to)} by itself: write ${v.text}.${method}()${method === "intValue" ? `, which drops the decimals (or ${v.text}.doubleValue() for the double)` : ""}.`;
}

/** "bad operand types for binary operator '*'" with a Number: arithmetic on a Number, such as a slider listener's newValue. */
function fxNumberArithmetic(d: Diagnostic, own: OwnClasses): string | null {
  if (!usesFX(own)) return null;
  const op = /binary operator '([^']+)'/.exec(d.message)?.[1] ?? "+";
  // javac's caret is on the operator; the side whose type is Number is the one to take the number out of.
  const left = /^\s*first type:\s+Number$/m.test(d.message);
  const p = caretIn(d, own);
  const before = p ? p.text.slice(expressionStart(p.code, p.at), p.at).replace(/\s+/g, " ").trim() : "";
  const after = p && p.code.startsWith(op, p.at) ? operandAfter(p.code, p.text, p.at + op.length) : null;
  const v = left ? (before && before.length <= 40 ? before : null) : after;
  if (!v) return `This is a Number, an object that holds a number, and ${op} doesn't work on it. Take the number out of it first: its doubleValue() gives it as a double, and its intValue() as a whole number.`;
  const listener = /^[\w$]+$/.test(v) && listenerParameter(d, own, v) ? ` (${FX_LISTENER_NUMBERS})` : "";
  const other = left ? after : before;
  const example = other && other.length <= 40 ? ` as in ${left ? `${v}.doubleValue() ${op} ${other}` : `${other} ${op} ${v}.doubleValue()`}` : "";
  return `${v} is a Number${listener}, an object that holds a number, and ${op} doesn't work on it. Take the number out of it first: ${v}.doubleValue() gives it as a double, and ${v}.intValue() as a whole number${example ? `,${example}` : ""}.`;
}

// ------------------------------------------------------------------ part 14.3: shapes, keys and a game loop

/**
 * The anonymous class whose body holds `at` in the code, as new AnimationTimer() { ... }: its type as
 * written and where its { is; null when the innermost class body around `at` is a named class's.
 */
function anonymousAt(code: string, at: number): { type: string; open: number } | null {
  let depth = 0;
  for (let k = at - 1; k >= 0; k--) {
    const ch = code[k];
    if (ch === "}") depth++;
    else if (ch === "{") {
      if (depth > 0) {
        depth--;
        continue;
      }
      const before = code.slice(Math.max(0, k - 300), k);
      const anon = /\bnew\s+((?:[\w$]+\s*\.\s*)*[\w$]+)\s*(?:<[^<>;{}]*(?:<[^<>;{}]*>[^<>;{}]*)*>)?\s*\([^;{}]*\)\s*$/.exec(before);
      if (anon) return { type: anon[1].replace(/\s+/g, ""), open: k };
      if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return null;
    }
  }
  return null;
}

/** The methods a class body that opens at `open` declares (not those of classes inside it): name, parameters as written, and whether @Override is above it. */
function methodsIn(code: string, text: string, open: number): { name: string; params: string; override: boolean }[] {
  const close = bracketClose(code, open);
  // The body with every block inside it (method bodies, inner classes) cut down to {}, positions kept.
  let body = code.slice(open + 1, close);
  for (let prev = ""; prev !== body; ) {
    prev = body;
    body = body.replace(/\{[^{}]*\}/g, (b) => `{${" ".repeat(b.length - 2)}}`);
  }
  const out: { name: string; params: string; override: boolean }[] = [];
  for (const m of body.matchAll(/(@\s*(?:java\.lang\.)?Override\s+)?(?:(?:public|protected|private|static|final|synchronized|abstract)\s+)*[\w$<>[\]?,. ]+?\s+([\w$]+)\s*\(([^()]*)\)\s*(?:throws\s[^{;]*)?\{/g)) {
    if (/^(?:if|for|while|switch|catch|return|new|else)$/.test(m[2])) continue;
    const at = open + 1 + m.index + m[0].indexOf("(", m[0].indexOf(m[2]));
    out.push({ name: m[2], params: text.slice(at + 1, at + 1 + m[3].length).replace(/\s+/g, " ").trim(), override: !!m[1] });
  }
  return out;
}

/** How an AnimationTimer's handle is written. */
const FX_HANDLE = "public void handle(long now) { ... }";
/** What handle is, in a sentence's words. */
const FX_HANDLE_IS = "handle(long now), the method JavaFX calls once per frame (about 60 times a second), with exactly one parameter, a long: the time of the frame in nanoseconds";
/** What handle is, in a few words. */
const FX_HANDLE_SHORT = "handle(long now), which JavaFX calls once per frame";

/** "<anonymous Main$1> is not abstract and does not override abstract method handle(long) in AnimationTimer": a timer without its handle(long), or with it misspelled or with other parameters. */
function fxTimerHandle(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^(.+?) is not abstract and does not override abstract method handle\(long\) in AnimationTimer$/.exec(d.message);
  const p = caretIn(d, own);
  if (!m || !p || knows(own, "AnimationTimer")) return null;
  const anonymous = m[1].startsWith("<anonymous ");
  const open = p.code.indexOf("{", p.at);
  if (open < 0) return null;
  const who = anonymous ? "A new AnimationTimer() { ... } must write" : `${simple(m[1])} extends AnimationTimer, so it must write`;
  const head = `${who} ${FX_HANDLE_IS}.`;
  const methods = methodsIn(p.code, p.text, open);
  const same = methods.find((x) => x.name === "handle");
  if (same)
    return `${head} Its handle takes ${same.params ? `(${same.params})` : "no parameter"} instead, so to Java it's another method, and the timer still has no handle(long). Write it as ${FX_HANDLE}${same.params ? "" : ", even when it doesn't use now"}.`;
  const near = methods.find((x) => x.name.toLowerCase() === "handle" || editDistance(x.name.toLowerCase(), "handle") <= 2);
  if (near)
    return `${head} It has ${near.name}(${near.params}) instead: the name must be handle, spelled exactly so, or JavaFX never calls it. Rename it: ${FX_HANDLE}. ${
      near.override
        ? "The @Override above it already makes Java check that the method really replaces one, which is why Java also reports the wrong name at the method itself."
        : "Write @Override above it: then Java checks that the method really replaces one, and says so at the method itself when the name is wrong."
    }`;
  const other = methods.find((x) => /^(?:final\s+)?long\s+[\w$]+$/.test(x.params));
  if (other) return `${head} It has ${other.name}(${other.params}) instead, but JavaFX calls only handle: rename it, ${FX_HANDLE}.`;
  return `${head} It has none yet: add it inside the braces, as in new AnimationTimer() { @Override public void handle(long now) { ... } }.start();`;
}

/**
 * "method does not override or implement a method from a supertype" on a method of an AnimationTimer
 * (an anonymous one or a class that extends it), or in an anonymous class whose JavaFX class isn't imported.
 */
function fxTimerOverride(d: Diagnostic, own: OwnClasses): string | null {
  const lines = own.code.get(d.file);
  const text = own.lines.get(d.file);
  if (!lines || !text) return null;
  const code = lines.join("\n");
  const at = lineStart(lines, d.line);
  const header = /^[^(;{}]*?([\w$]+)\s*\(([^)]*)\)/.exec(code.slice(at).replace(/^\s*@\s*(?:java\.lang\.)?Override\b/, ""));
  if (!header) return null;
  const name = header[1];
  const params = header[2].replace(/\s+/g, " ").trim();
  const anon = anonymousAt(code, at);
  const type = anon ? simple(anon.type) : null;
  const unknown = fxAnonymousUnknown(own, d.file, code, at);
  if (unknown) return `This method is inside new ${unknown.type}() { ... }, and ${unknown.why}. Until Java knows the class, it can't tell what ${name} replaces, so the @Override fails. Add the import, and this error goes away.`;
  const cls = classAt(own, d.file, d.line);
  const timer = anon ? type === "AnimationTimer" : !!cls && cls.extends.includes("AnimationTimer");
  if (!timer || knows(own, "AnimationTimer")) return null;
  if (name === "handle")
    return `@Override says that handle replaces AnimationTimer's handle, but AnimationTimer's takes exactly one parameter, a long (the time of the frame in nanoseconds), and this one takes ${params ? `(${params})` : "none"}. Write it as ${FX_HANDLE}${params ? "" : ", even when it doesn't use now"}: JavaFX calls it once per frame.`;
  const near = editDistance(name.toLowerCase(), "handle") <= 2 ? " Did you mean handle? The name must be spelled exactly so." : "";
  return `@Override says that ${name} replaces a method of AnimationTimer, and the one a timer writes is ${FX_HANDLE_SHORT} (besides it, AnimationTimer has only start and stop).${near} Write it as ${FX_HANDLE}, or, if ${name} is a method of its own, remove @Override.`;
}

/** The JavaFX class of the anonymous class around `at` (new AnimationTimer() { ... }) when the file doesn't import it, and why Java doesn't know it, or null. */
function fxAnonymousUnknown(own: OwnClasses, file: string, code: string, at: number): { type: string; why: string } | null {
  const anon = anonymousAt(code, at);
  const type = anon ? simple(anon.type) : null;
  if (!anon || !type || !FX[type] || knows(own, type) || anon.type.includes(".") || fxImported(own, file, FX[type].pkg, type)) return null;
  return { type, why: `Java doesn't know ${type} here: it needs import ${FX[type].pkg}.${type}; at the top of the file (Java reports that too)` };
}

/** "cannot find symbol: method stop()" (no location) inside new AnimationTimer() { ... } when AnimationTimer isn't imported: the class's own methods are unknown too. */
function fxAnonymousMethod(d: Diagnostic, own: OwnClasses): string | null {
  const method = /symbol:\s+method ([\w$]+)\(/.exec(d.message)?.[1];
  const p = caretIn(d, own);
  if (!method || !p) return null;
  const unknown = fxAnonymousUnknown(own, d.file, p.code, p.at);
  if (!unknown || !fxMethods(unknown.type).includes(method)) return null;
  return `${method} is a method of ${unknown.type}, and this code is inside new ${unknown.type}() { ... }, but ${unknown.why}. Add the import, and this error goes away.`;
}

/** "AnimationTimer is abstract; cannot be instantiated" and "Shape is abstract": new on an abstract class of the practice JavaFX. */
function fxAbstract(d: Diagnostic, own: OwnClasses): string | null {
  const name = simple(/^([\w$.]+) is abstract; cannot be instantiated/.exec(d.message)?.[1] ?? "");
  if (knows(own, name) || !usesFX(own)) return null;
  if (name === "AnimationTimer")
    return `AnimationTimer is abstract: its ${FX_HANDLE_SHORT}, has no body there, since each timer writes its own. Create it with a body of its own, as an anonymous class: new AnimationTimer() { @Override public void handle(long now) { ... } }.start(); Or write a class that extends AnimationTimer and create that.`;
  if (name === "Shape")
    return "Shape is abstract: it's what every shape is, not a shape of its own. Create one of its kinds, a Polygon, a Circle, a Rectangle, a Line or a Text; a variable can still have the type Shape, as in Shape rock = new Circle(30);";
  return null;
}

/** A KeyCode constant's name for a name that isn't one (LEFT for LEFT_ARROW, ESCAPE for ESC, DIGIT1 for 1), and how it was found, or null. */
function keyCodeFor(word: string): { code: string; caps: boolean } | null {
  const upper = word.toUpperCase();
  if (KEY_CODES.includes(word)) return null;
  if (KEY_CODES.includes(upper)) return { code: upper, caps: true };
  const digit = /^(?:(?:KEY|VK|NUM(?:BER)?|DIGIT|D)_?)?([0-9])$/.exec(upper);
  if (digit) return { code: `DIGIT${digit[1]}`, caps: false };
  // KEY_LEFT, VK_LEFT, W_KEY and SPACEKEY name the key without KEY or VK.
  const stem = upper.replace(/^(?:KEY|VK|KC)_/, "").replace(/_?KEY$/, "") || upper;
  const bare = stem.replace(/[_\- ]/g, "");
  // The closest constant: one edit away for short names (a letter swapped for its neighbour counts as one), two for longer ones, then with the same first letter.
  const closest = (word: string, of: (k: string) => string, ok: (k: string) => boolean) => {
    let best: string | undefined;
    let bestDistance = 3;
    for (const k of KEY_CODES) {
      if (!ok(k)) continue;
      const name = of(k);
      const distance = swapDistance(name, word);
      const limit = name.length <= 5 ? 1 : 2;
      if (distance <= limit && (distance < 2 || name[0] === word[0]) && distance < bestDistance) [best, bestDistance] = [k, distance];
    }
    return best;
  };
  const found =
    KEY_CODES.find((k) => k.replace(/_/g, "") === bare) ??
    KEY_ALIASES[bare] ??
    closest(stem, (k) => k, (k) => k.length > 1) ??
    (bare.length > 5 ? closest(bare, (k) => k.replace(/_/g, ""), (k) => k.length > 5) : undefined);
  return found ? { code: found, caps: false } : null;
}

/** The edit distance between two words, where two neighbouring letters swapped count as one edit (RIGTH is one away from RIGHT). */
function swapDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}
/** Other names people give keys, and KeyCode's (as the event lines take them, src/grader/window.ts), with a few more. */
const KEY_ALIASES: Record<string, string> = {
  ESC: "ESCAPE",
  CTRL: "CONTROL",
  SPACEBAR: "SPACE",
  RETURN: "ENTER",
  DEL: "DELETE",
  BACKSPACE: "BACK_SPACE",
  ARROWLEFT: "LEFT",
  ARROWRIGHT: "RIGHT",
  ARROWUP: "UP",
  ARROWDOWN: "DOWN",
  LEFTARROW: "LEFT",
  RIGHTARROW: "RIGHT",
  UPARROW: "UP",
  DOWNARROW: "DOWN",
  PGUP: "PAGE_UP",
  PGDN: "PAGE_DOWN",
  INS: "INSERT",
  CAPSLOCK: "CAPS",
  OPTION: "ALT",
  CMD: "COMMAND",
  WIN: "WINDOWS",
};
/** "KeyCode.LEFT (the key called Left)". */
const keyCodeNamed = (code: string) => `KeyCode.${code} (the key ${/^DIGIT/.test(code) ? "" : "called "}${KEY_NAMES[KEY_CODES.indexOf(code)] ?? code}${/^DIGIT/.test(code) ? " above the letters" : ""})`;
/** KeyCode's names in a sentence, for a name that isn't one. */
const KEY_CODE_NAMES = "KeyCode names the keys as JavaFX does: LEFT, RIGHT, UP and DOWN for the arrow keys, SPACE, ENTER, ESCAPE, SHIFT and CONTROL, A to Z for the letters, and DIGIT0 to DIGIT9 for the digits above them (NUMPAD0 to NUMPAD9 on the number pad).";
/** The sentence that names the closest KeyCode constant to a name, or "". */
function keyCodeHint(word: string): string {
  const k = keyCodeFor(word);
  if (!k) return "";
  if (k.caps) return ` Its constants are written in capital letters: ${keyCodeNamed(k.code)}.`;
  return ` Did you mean ${keyCodeNamed(k.code)}?`;
}

/** "cannot find symbol: variable LEFT_ARROW, location: class KeyCode": a name that isn't one of KeyCode's constants. */
function fxKeyCodeName(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+variable ([\w$]+)\n\s*location: class (?:javafx\.scene\.input\.)?KeyCode$/m.exec(d.message);
  if (!m || knows(own, "KeyCode")) return null;
  return `KeyCode has no constant ${m[1]}.${keyCodeHint(m[1])} ${KEY_CODE_NAMES}`;
}

/** A KeyCode for a piece of text in quotes ("LEFT", "a", "Left"), written as code: KeyCode.LEFT, or null. */
function keyCodeOfText(literal: string | undefined): string | null {
  if (literal == null) return null;
  const word = literal.trim();
  if (KEY_CODES.includes(word)) return `KeyCode.${word}`;
  const named = KEY_NAMES.findIndex((n) => n.toLowerCase() === word.toLowerCase());
  if (named >= 0) return `KeyCode.${KEY_CODES[named]}`;
  const k = /^[\w$ -]+$/.test(word) ? keyCodeFor(word.replace(/[ -]/g, "_")) : null;
  return k ? `KeyCode.${k.code}` : null;
}

/**
 * "incomparable types: KeyCode and String" and "String cannot be converted to KeyCode": a key's code
 * compared with or used as text, as in event.getCode() == "LEFT", case "UP": or map.put("LEFT", true).
 */
function fxKeyCodeText(d: Diagnostic, own: OwnClasses): string | null {
  const compare = /^incomparable types: (KeyCode and String|String and KeyCode)$/.exec(d.message);
  const convert = /^incompatible types: String cannot be converted to KeyCode$/.test(d.message);
  const p = caretIn(d, own);
  if ((!compare && !convert) || !p || knows(own, "KeyCode")) return null;
  const lineText = own.lines.get(d.file)?.[d.line - 1] ?? "";
  const lineCode = own.code.get(d.file)?.[d.line - 1] ?? "";
  const enumIs = "a KeyCode is a constant of an enum, not text";
  if (compare) {
    // The two sides of the == or != at the caret.
    const left = p.text.slice(expressionStart(p.code, p.at), p.at).trim();
    const opEnd = p.at + (/^[=!]=/.exec(p.code.slice(p.at))?.[0].length ?? 0);
    const right = p.text.slice(opEnd, expressionEnd(p.code, opEnd)).trim();
    const [textSide, keySide] = compare[1].startsWith("KeyCode") ? [right, left] : [left, right];
    const literal = /^"((?:[^"\\]|\\.)*)"$/.exec(textSide)?.[1];
    const key = keyCodeOfText(literal);
    if (literal != null) {
      const fix = key ? `${keySide} == ${key}` : `${keySide} == KeyCode.LEFT, with the key's KeyCode constant`;
      return `${keySide} is a KeyCode, and "${literal}" is a String: ${enumIs}, so the two can never be equal, and Java doesn't allow == between them. Compare it with the constant itself: ${fix}.${key ? "" : keyCodeHint(literal)}`;
    }
    if (/\bgetText\s*\(\s*\)$/.test(textSide.replace(/\s+/g, ""))) {
      const event = textSide.replace(/\s*\.\s*getText\s*\(\s*\)$/, "");
      return `${textSide} gives the key's text as a String (such as "a"), and ${keySide} is a KeyCode: they can never be equal. Compare the event's KeyCode instead: ${event}.getCode() == ${keySide}.`;
    }
    return `${keySide} is a KeyCode and ${textSide} is a String: ${enumIs}, so the two can never be equal. Compare KeyCodes with KeyCodes, as in event.getCode() == KeyCode.LEFT.`;
  }
  // case "UP": in a switch on a KeyCode.
  const label = /^\s*case\s+"((?:[^"\\]|\\.)*)"/.exec(lineText);
  if (label && /^\s*case\b/.test(lineCode)) {
    const key = keyCodeOfText(label[1]);
    return `This switch is on a KeyCode, so each case is one of KeyCode's constants, written by its name alone, without quotes: case ${key ? key.slice("KeyCode.".length) : "LEFT"}:${key ? "" : keyCodeHint(label[1])} ("${label[1]}" is text, a String, and ${enumIs}.)`;
  }
  const literal = /^"((?:[^"\\]|\\.)*)"/.exec(p.text.slice(p.at))?.[1];
  if (literal != null) {
    const key = keyCodeOfText(literal);
    return `"${literal}" is text, a String, and here Java needs a KeyCode: ${enumIs}. Write the constant itself: ${key ?? "KeyCode.LEFT"}${key ? "" : ", with the key's name"}.${key ? "" : keyCodeHint(literal)}`;
  }
  // event.getText(), with javac's caret at its start or on its parenthesis.
  const call = /^((?:[\w$]+\s*\.\s*)*[\w$]+)\s*\.\s*getText\s*\(\s*\)/.exec(p.text.slice(p.at)) ?? (p.code[p.at] === "(" ? /((?:[\w$]+\s*\.\s*)*[\w$]+)\s*\.\s*getText\s*$/.exec(p.text.slice(Math.max(0, p.at - 80), p.at)) : null);
  if (call) return `${call[1]}.getText() gives the key's text as a String (such as "a"), and here Java needs a KeyCode. Use ${call[1]}.getCode(), which gives the key's KeyCode (such as KeyCode.A).`;
  return null;
}

/** The value before the dot at the caret (speed in speed.x), as written, and where it starts, or null. */
function receiverBeforeDot(p: { code: string; text: string; at: number }): { value: string; start: number } | null {
  // javac's caret is on the dot (speed.x) or on the name after it.
  const dot = p.code[p.at] === "." ? [""] : /\.\s*$/.exec(p.code.slice(Math.max(0, p.at - 50), p.at));
  if (!dot) return null;
  const end = p.at - (p.code[p.at] === "." ? 0 : dot[0].length);
  let start = expressionStart(p.code, end);
  // new Point2D(1, 2).getX: the new belongs to the value too.
  const created = /\bnew\s+$/.exec(p.code.slice(Math.max(0, start - 20), start));
  if (created) start -= created[0].length;
  const v = p.text.slice(start, end).trim();
  return v && v.length <= 40 ? { value: v, start } : null;
}

/** The value before the dot at the caret (speed in speed.x), as written, or null. */
function valueBeforeDot(p: { code: string; text: string; at: number }): string | null {
  return receiverBeforeDot(p)?.value ?? null;
}

/** Whether a value can be given a new value with =: a name, this.name, fields of fields, and array elements (points[0]), with no call and no new. */
const pointAssignable = (v: string) => !/^new\b/.test(v) && /^[\w$]+(?:\s*\[[^\][()]*\])*(?:\s*\.\s*[\w$]+(?:\s*\[[^\][()]*\])*)*$/.test(v);
/** Whether a value is the class Point2D itself (Point2D.x, Point2D.setX), not a Point2D. */
const isPointClass = (v: string) => /^(?:javafx\s*\.\s*geometry\s*\.\s*)?Point2D$/.test(v);
/** A value that needs no parentheses inside a longer expression: a number, a name, a field or a call. */
const simpleOperand = (s: string) => /^(?:-?\d[\w.]*|[\w$]+(?:\s*(?:\.\s*[\w$]+|\([^()]*\)))*)$/.test(s);
/** The operand in parentheses unless it's simple. */
const grouped = (s: string) => (simpleOperand(s) ? s : `(${s})`);

/** A Point2D never changes: what to write instead, in a sentence. */
const pointNew = (v: string) => `A Point2D never changes once it's created: its methods, such as add and multiply, give a new Point2D, so keep that one in the variable, as in ${v} = ${v}.add(1, 0);`;
/** For a Point2D that a call or new gives (ship.getMovement()), which no variable keeps: where a new one can go instead. */
function pointNotKept(v: string): string {
  const got = /^(.+?)\s*\.\s*get\s*\(([^()]*)\)$/.exec(v);
  const where = got ? `put it back in its place, as in ${got[1]}.set(${got[2]}, ${v}.add(1, 0));` : "give it to the object it belongs to through a setter, or keep it in a variable of your own.";
  return `This Point2D comes from ${/^new\b/.test(v) ? "new" : "a method call"}, not from a variable, so to change it, keep the new one somewhere: ${where}`;
}

/** "x has private access in Point2D": a Point2D's x or y read or changed as a variable. */
function fxPointField(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([xy]) has private access in (?:javafx\.geometry\.)?Point2D$/.exec(d.message);
  const p = caretIn(d, own);
  if (!m || !p || knows(own, "Point2D")) return null;
  const xy = m[1];
  const XY = xy.toUpperCase();
  const v = valueBeforeDot(p) ?? "point";
  if (isPointClass(v))
    return `${v}.${xy} asks the class Point2D for ${xy === "x" ? "an" : "a"} ${xy}, but x and y are private, and each Point2D object has its own: they don't belong to the class. Read them with the methods of a Point2D in a variable, as in point.getX() and point.getY(), and make a new Point2D for other values, as in point = new Point2D(${xy === "x" ? "newX, point.getY()" : "point.getX(), newY"});`;
  const get = (s: string) => s.replace(/\b([\w$]+(?:\s*\.\s*[\w$]+)*)\s*\.\s*([xy])\b(?!\s*\()/g, (_all, obj, f) => `${obj}.get${f.toUpperCase()}()`);
  // The field's name ends after the caret (javac's caret is on the dot before it, or on the name).
  const nameEnd = p.at + (/^\.?\s*[xy]\b/.exec(p.code.slice(p.at))?.[0].length ?? 1);
  const after = p.code.slice(nameEnd);
  const before = p.code.slice(Math.max(0, p.at - 60), p.at + (p.code[p.at] === "." ? 1 : 0));
  const op = /^\s*([-+*/%]?=(?!=)|\+\+|--)/.exec(after)?.[1] ?? (/(\+\+|--)\s*[\w$.\s]*\.\s*$/.test(before) ? /(\+\+|--)\s*[\w$.\s]*\.\s*$/.exec(before)![1] : null);
  const read = `A Point2D's x and y are private: read them with its methods, ${v}.getX() and ${v}.getY().`;
  if (!op) return read;
  const never = "A Point2D's x and y are private, and a Point2D never changes once it's created: its methods, such as add, give a new Point2D.";
  if (!pointAssignable(v)) return `${never} ${pointNotKept(v)} (Read x and y with ${v}.getX() and ${v}.getY().)`;
  // The value after the operator, up to the end of the statement, with any other x or y read through getX() or getY().
  const from = nameEnd + (/^\s*(?:[-+*/%]?=)/.exec(after)?.[0].length ?? 0);
  const rhs = op !== "++" && op !== "--" ? get(p.text.slice(from, expressionEnd(p.code, from)).trim()) : "";
  const other = xy === "x" ? `${v}.getY()` : `${v}.getX()`;
  const at = (val: string) => (xy === "x" ? `${val}, ${other}` : `${other}, ${val}`);
  const scaled = /^[*/%]=$/.test(op) && rhs ? `${v}.get${XY}() ${op[0]} ${grouped(rhs)}` : null;
  const fix =
    op === "++" || op === "--"
      ? `${v} = ${v}.add(${xy === "x" ? `${op === "++" ? 1 : -1}, 0` : `0, ${op === "++" ? 1 : -1}`});`
      : op === "+=" && rhs
        ? `${v} = ${v}.add(${xy === "x" ? `${rhs}, 0` : `0, ${rhs}`});`
        : op === "-=" && rhs
          ? `${v} = ${v}.subtract(${xy === "x" ? `${rhs}, 0` : `0, ${rhs}`});`
          : op === "=" && rhs
            ? `${v} = new Point2D(${at(rhs)});`
            : scaled
              ? `${v} = new Point2D(${at(scaled)});`
              : `${v} = new Point2D(${at(`new${XY}`)});`;
  return `${never} To change it, make a new one and keep it in the variable: ${fix} (Read x and y with ${v}.getX() and ${v}.getY().)`;
}

/** "cannot find symbol: method setX(int), location: variable speed of type Point2D": a method that would change a Point2D, which never changes. */
function fxPointSetter(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ((?:set|move|translate|increase|decrease|change|update|scale|rotate|normali[sz]e|inc|dec)[\w$]*)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type |class )(?:javafx\.geometry\.)?Point2D$/m.exec(d.message);
  const p = caretIn(d, own);
  if (!m || knows(own, "Point2D")) return null;
  const method = m[1];
  const written = p ? receiverBeforeDot(p) : null;
  // The value as written (other.speed, points[0]) when it's the variable javac names, or javac's name.
  const ends = (v: string) => !m[3] || new RegExp(`(?:^|\\.)\\s*${escapeRegExp(m[3])}$`).test(v);
  const v = written && (!pointAssignable(written.value) || ends(written.value)) ? written.value : (m[3] ?? written?.value ?? "point");
  if (isPointClass(v))
    return `${v}.${method}(...) calls ${method} on the class Point2D itself, as a static method, but ${method} isn't a static method of Point2D, and Point2D has no ${method} at all: a Point2D never changes once it's created. Its methods, such as add and multiply, give a new Point2D, so keep that one in a variable of your own, as in point = point.add(1, 0);`;
  const has = `${v} is a Point2D, and a Point2D has no ${method}(...).`;
  // normalise, normalized: normalize, which gives a new Point2D.
  if (/^normali[sz]/.test(method)) {
    // speed.normalise(); on a line of its own: keep what normalize gives in the same variable.
    const statement = !!p && !!written && /(?:^|[;{}])\s*$/.test(p.code.slice(0, written.start)) && /^(?:\.\s*)?[\w$]+\s*\([^()]*\)\s*;/.test(p.code.slice(p.at));
    const keep = statement && pointAssignable(v) ? `, so keep it, as in ${v} = ${v}.normalize();` : `: use what it gives, as in Point2D direction = ${v}.normalize();`;
    return `${has} It's spelled normalize: ${v}.normalize() gives a new Point2D of length 1 pointing the same way${keep}`;
  }
  if (!pointAssignable(v)) return `${has} A Point2D never changes once it's created: its methods, such as add and multiply, give a new Point2D. ${pointNotKept(v)} A call such as ${v}.add(1, 0); on a line of its own changes nothing: the new Point2D it gives is thrown away.`;
  const instead =
    /^setX$/.test(method)
      ? ` To give it another x, write ${v} = new Point2D(newX, ${v}.getY());`
      : /^setY$/.test(method)
        ? ` To give it another y, write ${v} = new Point2D(${v}.getX(), newY);`
        : "";
  return `${has} ${pointNew(v)}${instead} A call such as ${v}.add(1, 0); on a line of its own changes nothing: the new Point2D it gives is thrown away.`;
}

/** "bad operand types for binary operator '+'" with a Point2D: arithmetic on points, which their methods do. */
function fxPointArithmetic(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^bad operand types for binary operator '([^']+)'\n\s*first type:\s+(\S+)\n\s*second type:\s+(\S+)/.exec(d.message);
  const p = caretIn(d, own);
  if (!m || !p || knows(own, "Point2D") || ![m[2], m[3]].includes("Point2D")) return null;
  const [, op, first, second] = m;
  const left = p.text.slice(expressionStart(p.code, p.at), p.at).trim();
  // speed += other: javac names the operator without its =, and the right side is everything after the =.
  const compound = /^[-+*/%]$/.test(op) && p.code[p.at + op.length] === "=";
  const opEnd = p.at + op.length + (compound ? 1 : 0);
  const right = p.text.slice(opEnd, expressionEnd(p.code, opEnd)).trim();
  const number = (t: string) => /^(?:int|long|double|float|short|byte|Integer|Double|Long)$/.test(t);
  const way: Record<string, string | undefined> = {
    "+": first === "Point2D" && second === "Point2D" ? `${left}.add(${right})` : undefined,
    "-": first === "Point2D" && second === "Point2D" ? `${left}.subtract(${right})` : undefined,
    "*": first === "Point2D" && number(second) ? `${left}.multiply(${right})` : second === "Point2D" && number(first) ? `${right}.multiply(${left})` : undefined,
    "/": first === "Point2D" && number(second) ? `${left}.multiply(1.0 / ${grouped(right)})` : undefined,
  };
  // A compound assignment keeps the new point in the variable on the left, which must be the Point2D.
  const fits = left.length <= 40 && right.length <= 40 && (!compound || (first === "Point2D" && pointAssignable(left)));
  const value = fits ? way[op] : undefined;
  const call = value && compound ? `${left} = ${value};` : value;
  const methods = "add and subtract (another Point2D, or an x and a y), multiply (a number), and normalize, magnitude and distance";
  return `Java's ${op}${compound ? "=" : ""} works on numbers, and a Point2D is an object, so it has methods for its arithmetic instead: ${methods}. Each gives a new Point2D${call ? `${compound ? ", so keep it in the variable" : ""}: write ${call}${compound ? "" : "."}` : "."}`;
}

/** "constructor Point2D in class Point2D cannot be applied to given types": new Point2D without its x and y. */
function fxPointNew(d: Diagnostic, own: OwnClasses): string | null {
  if (!/^constructor Point2D in class (?:javafx\.geometry\.)?Point2D cannot be applied[\s\S]*reason: actual and formal argument lists differ in length/.test(d.message) || knows(own, "Point2D")) return null;
  return "A Point2D is a point (or a direction and a speed) with an x and a y, so new Point2D(...) takes both, as in new Point2D(0, 0) (Point2D.ZERO is that point) or new Point2D(1.5, -2).";
}

/** How the MOOC checks two shapes for a collision. */
const FX_COLLIDE = "Shape.intersect(ship, rock).getBoundsInLocal().getWidth() != -1";
/** What Shape.intersect gives, in a sentence. */
const FX_INTERSECT_IS = `Shape.intersect(a, b) doesn't say true or false: it gives a new Shape, the area that a and b have in common, and that shape is empty when they don't overlap (it is never null). Its bounds then have a width of -1, so a collision is ${FX_COLLIDE}, true when the two overlap.`;

/** Whether the statement around the caret calls intersect, or uses a variable that got what intersect gave. */
function nearIntersect(p: { code: string; at: number }): boolean {
  const from = Math.max(p.code.lastIndexOf(";", p.at - 1), p.code.lastIndexOf("{", p.at - 1), p.code.lastIndexOf("}", p.at - 1)) + 1;
  const statement = p.code.slice(from, expressionEnd(p.code, p.at) + 1);
  if (/\bintersect\s*\(/.test(statement)) return true;
  return [...statement.matchAll(/[\w$]+/g)].some((w) => new RegExp(`\\b${escapeRegExp(w[0])}\\s*=\\s*(?:\\(\\s*[\\w$]+\\s*\\)\\s*)?(?:[\\w$]+\\s*\\.\\s*)*intersect\\s*\\(`).test(p.code.slice(0, from)));
}

/** A collision check written another way than the MOOC's: intersect's Shape compared with a number, used as a boolean, or a Bounds compared with a number. */
function fxIntersectValue(d: Diagnostic, own: OwnClasses): string | null {
  const p = caretIn(d, own);
  if (!p || knows(own, "Shape") || !usesFX(own)) return null;
  const operands = /^bad operand types for binary operator '([^']+)'\n\s*first type:\s+(\S+)\n\s*second type:\s+(\S+)/.exec(d.message);
  if (operands && [operands[2], operands[3]].some((t) => /^(?:Bounds|BoundingBox)$/.test(t)))
    return `getBoundsInLocal() gives the bounds of a node, a Bounds: the box around it, not a number. Its width is a number: getBoundsInLocal().getWidth(). For a collision, the MOOC's check is ${FX_COLLIDE}.`;
  const shape = operands ? [operands[2], operands[3]].some((t) => /^(?:Shape|Path)$/.test(t)) : /^incompatible types: (?:Shape|Path) cannot be converted to boolean$/.test(d.message);
  if (!shape || !nearIntersect(p)) return null;
  return FX_INTERSECT_IS;
}

/** "cannot find symbol: method getWidth(), location: class Shape" on what intersect gave: a Bounds method called on the shape. */
function fxIntersectMethod(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ([\w$]+)\((.*)\)\n\s*location: (?:variable [\w$]+ of type |class )(?:javafx\.scene\.shape\.)?(?:Shape|Path)$/m.exec(d.message);
  const p = caretIn(d, own);
  if (!m || !p || knows(own, "Shape") || !fxMethods("Bounds").includes(m[1]) || !nearIntersect(p)) return null;
  return `${FX_INTERSECT_IS} ${m[1]}() is a method of those bounds, so it comes after getBoundsInLocal(): Shape.intersect(ship, rock).getBoundsInLocal().${m[1]}().`;
}

/** "method intersect in class Shape cannot be applied to given types" (ship.intersect(rock)), and intersects or another name on a shape: how two shapes are checked for a collision. */
function fxIntersectCall(d: Diagnostic, own: OwnClasses): string | null {
  if (knows(own, "Shape") || !usesFX(own)) return null;
  const call = callAt(d, own);
  if (/^method intersect in class Shape cannot be applied/.test(d.message)) {
    if (!call || call.args.length !== 1 || !call.receiver || /^(?:javafx\.scene\.shape\.)?Shape$/.test(call.receiver.replace(/\s+/g, ""))) return null;
    return `intersect is a static method of Shape: it belongs to the class, not to one shape, and takes both shapes. Write Shape.intersect(${call.receiver}, ${call.args[0]}) instead of ${call.receiver}.intersect(${call.args[0]}). ${FX_INTERSECT_IS.replace(/Shape\.intersect\(ship, rock\)/, `Shape.intersect(${call.receiver}, ${call.args[0]})`)}`;
  }
  const m = /symbol:\s+method (intersects|collides?(?:With)?|overlaps|hits|touches)\((.*)\)\n\s*location: (?:variable ([\w$]+) of type |class )(?:javafx\.scene\.shape\.)?([\w$]+)$/m.exec(d.message);
  if (!m || !fxIsKind(m[4], "Shape") || !FX[m[4]]) return null;
  const real = m[1] === "intersects" && m[4] !== "Shape" ? ` (A node's intersects(...) of real JavaFX takes a Bounds in the node's own coordinates, not another node, and the practice version doesn't have it; ${m[3] ?? "a"}.getBoundsInParent().intersects(other.getBoundsInParent()) compares only the boxes around two nodes.)` : "";
  return `To check whether two shapes overlap, use Shape.intersect, a static method of Shape that takes both. ${FX_INTERSECT_IS}${real}`;
}

/** "cannot find symbol: variable getWidth, location: class Bounds": a method of a JavaFX class written without its parentheses, after a call. */
function fxMethodAsVariableAfterCall(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+variable ([\w$]+)\n\s*location: (?:class|interface) (?:[\w$]+\.)*([\w$]+)$/m.exec(d.message);
  const p = caretIn(d, own);
  const fx = m ? fxTypeOf(own, m[2]) : null;
  if (!m || !p || !fx || !fxMethods(fx).includes(m[1]) || (FX_STATIC[fx] ?? "").split(" ").includes(m[1])) return null;
  if (p.code[p.at] !== "." && !/\.\s*$/.test(p.code.slice(0, p.at))) return null;
  const v = valueBeforeDot(p);
  if (v && /^[A-Z][\w$]*$/.test(v)) return null;
  const parens = /^(?:get|is)[A-Z]/.test(m[1]) ? "()" : "(...)";
  return `${m[1]} is a method of ${fx}, so it needs parentheses: ${v ? `${v}.` : ""}${m[1]}${parens}.`;
}

/** The classes of java.sql (JDBC) that programs use most, which this page's Java doesn't have. */
const JDBC = /^(?:Connection|DriverManager|PreparedStatement|Statement|ResultSet|SQLException|ResultSetMetaData|DataSource)$/;
/** Why there are no databases here, and where they are. */
const NO_DATABASE =
  "This page has no database: the Java that runs here has only Java's basic classes (java.base), not java.sql, and there's no database or database driver (such as H2's) to connect to. On your own computer, java.sql is part of the JDK and Maven adds H2 to the project; module 54, \"Libraries, Maven and databases\", shows how to run it there. In this page, keep the data in a data access object of your own that stores it in a list or a map.";

/** "package java.sql does not exist", and its classes without their package: no database here. */
function noDatabase(d: Diagnostic, own: OwnClasses): string | null {
  const pkg = /^package ((?:java|javax)\.sql(?:\.[\w$.]+)?|org\.h2(?:\.[\w$.]+)?) does not exist/.exec(d.message)?.[1];
  if (pkg?.startsWith("org.h2")) return `org.h2 is H2, a database written in Java, a library that a project gets through Maven (a dependency in its pom.xml). ${NO_DATABASE}`;
  if (pkg) {
    const name = /^\s*import\s+[\w$.]+\.([A-Z][\w$]*)\s*;/.exec(own.lines.get(d.file)?.[d.line - 1] ?? "")?.[1];
    return `${name ? `${name} (${pkg}.${name})` : `The package ${pkg}`} is part of Java's classes for databases, JDBC. ${NO_DATABASE}`;
  }
  const name = /symbol:\s+(?:class|variable) ([\w$]+)\n\s*location: (?:class|interface|enum|record) /.exec(d.message)?.[1];
  if (!name || !JDBC.test(name) || knows(own, name)) return null;
  // Connection, Statement and DataSource may be classes of the program's own not written yet: only with signs of JDBC around.
  const jdbc = (own.lines.get(d.file) ?? []).some((l) => /\bjava\.sql\b|\bDriverManager\b|"jdbc:/.test(l));
  if (!jdbc && !/^(?:DriverManager|PreparedStatement|ResultSet|SQLException)$/.test(name)) return null;
  return `${name} is part of java.sql, Java's classes for databases (JDBC), as in import java.sql.${name};. ${NO_DATABASE}`;
}

/**
 * "cannot find symbol: class Gson" (or variable StringUtils) when the file imports it from a package
 * that isn't here: a library's, H2's, or a package of real JavaFX that the practice version doesn't have.
 */
function importedFromMissing(d: Diagnostic, own: OwnClasses): string | null {
  const name = /symbol:\s+(?:variable|class) ([A-Z][\w$]*)\n/.exec(d.message)?.[1];
  if (!name || knows(own, name)) return null;
  const full = (own.imports.get(d.file) ?? []).find((i) => i.endsWith(`.${name}`));
  const pkg = full?.slice(0, -name.length - 1);
  if (!pkg) return null;
  if (/^javafx\./.test(pkg) && REAL_FX[name] === pkg && !FX[name]) return fxMissing(name, pkg);
  const roots = ownPackages(own).map((p) => p.split(".")[0]);
  if (!LIBRARY_ROOT.test(pkg) || roots.includes(pkg.split(".")[0])) return null;
  const why = `${name} is the class the file imports from ${pkg}, and that package isn't here (Java reports that at the import too), so Java doesn't know ${name} either.`;
  if (/^org\.h2\b/.test(pkg)) return `${why} ${NO_DATABASE}`;
  if (/^org\.junit\.jupiter\b/.test(pkg)) return `${why} ${pkg} is JUnit 5, and this page has JUnit 4: import ${name === "Test" ? "org.junit.Test;" : `its ${name}`} instead${name === "Test" ? "" : " from org.junit"}.`;
  if (JUNIT5.test(pkg)) return `${why} ${pkg} is part of JUnit 5, and this page has JUnit 4, which doesn't have it.`;
  if (/^org\.junit(?:\.|$)/i.test(pkg)) return `${why} This page has JUnit 4, so ${pkg} is probably a misspelling: ${JUNIT4_PACKAGES}`;
  return `${why} ${pkg} is probably a library, which a project on your own computer gets through Maven; in this page, a program can use Java's own classes, JUnit 4 and Java Arena's practice version of JavaFX, and no other libraries.`;
}

/** JUnit 5's packages (Jupiter, the Platform and Vintage), which this page doesn't have. */
const JUNIT5 = /^org\.junit\.(?:jupiter|platform|vintage)\b/;
/** JUnit 4's packages, for an import of it that's misspelled. */
const JUNIT4_PACKAGES =
  "JUnit 4's classes are in org.junit (Test, Before, After and Assert), org.junit.runner and org.junit.rules, written in small letters, and Test, Before and Assert are classes, not packages. Check the spelling, as in import org.junit.Test; and import static org.junit.Assert.assertEquals;.";

/** Roots of package names that libraries use (org.apache, com.google, io.github), unlike Java's own (java, javax, jdk) and JavaFX's. */
const LIBRARY_ROOT = /^(?:org|com|net|io|edu|dev|me|de|fi|nl|ch|uk|fr|se|no|dk|eu|info|biz)\.[\w$]+/;

/** "package org.apache.commons.lang3 does not exist": a library that a project on your own computer would get through Maven. */
function libraryPackage(d: Diagnostic, own: OwnClasses): string | null {
  const pkg = /^package ([\w$.]+) does not exist/.exec(d.message)?.[1];
  if (!pkg || !LIBRARY_ROOT.test(pkg)) return null;
  const roots = ownPackages(own).map((p) => p.split(".")[0]);
  if (roots.includes(pkg.split(".")[0])) return null;
  const here = "In this page, a program can use Java's own classes (java.base), JUnit 4 and Java Arena's practice version of JavaFX, and no other libraries.";
  if (JUNIT5.test(pkg))
    return `${pkg} is ${/^org\.junit\.jupiter\b/.test(pkg) ? "" : "part of "}JUnit 5, and this page has JUnit 4: write its imports instead, such as import org.junit.Test; and import static org.junit.Assert.assertEquals;. ${here}`;
  // org.Junit, org.junit.asserts: JUnit 4 is here, so a misspelling of its packages.
  if (/^org\.junit(?:\.|$)/i.test(pkg)) return `There is no package ${pkg}: this page has JUnit 4, and that isn't one of its packages. ${JUNIT4_PACKAGES}`;
  return `There is no package ${pkg} here. It isn't part of Java, so it's probably a library: on your own computer, a project gets one through Maven, as a dependency in its pom.xml (module 54, "Libraries, Maven and databases", shows how). ${here} If ${pkg} is meant to be a package of your own, check its spelling and that its files are in the folder ${pkg.replace(/\./g, "/")}/.`;
}

/** Color's errors: a value outside 0 to 255 for Color.rgb, outside 0.0 to 1.0 for Color.color and new Color, and text Color.web can't read. */
function fxColor(m: string, c: CrashContext): string | null {
  // The Color method the program called: the outermost of Color's own frames.
  const called = /^javafx\.scene\.paint\.Color\.([\w<>]+)$/.exec([...c.javaFrames].reverse().find((f) => f.startsWith("javafx.scene.paint.Color.")) ?? "")?.[1];
  if (!called) return null;
  const line = lineOf(c, c.frames[0]);
  const rgb = /^Color\.rgb's (red|green|blue) parameter \((-?\d+)\) expects color values 0-255$/.exec(m);
  const unit = /^Color's (red|green|blue|opacity) value \((.+)\) must be in the range 0\.0-1\.0$/.exec(m);
  if (called === "web") {
    const text = argumentsOn(line, /web/)?.args;
    const shown = text && text.length <= 40 ? ` Here it got ${text}.` : "";
    if (m === "Invalid color specification" || rgb || unit)
      return `Color.web(text) reads a color written as on a web page: a name such as "red" or "darkgreen", or # and hexadecimal digits, as in "#ff0000" (red, green and blue, two digits each, 0 to 9 and a to f) or "#f00", and it couldn't read this text as one.${shown} Check its spelling and its digits.`;
    return null;
  }
  if (rgb) {
    const [, part, value] = rgb;
    const fix = Number(value) > 255 ? " If it's calculated, as when brightening a pixel, keep it at most 255 with Math.min(255, value)." : " If it's calculated, keep it at least 0 with Math.max(0, value).";
    return `Color.rgb(red, green, blue) takes each part of the color as a whole number from 0 to 255, and its ${part} was ${value}.${fix}`;
  }
  if (!unit) return null;
  const [, part, value] = unit;
  const n = Number(value);
  if (part === "opacity")
    return `The opacity, the last value of ${called === "rgb" ? "Color.rgb(red, green, blue, opacity)" : called === "color" ? "Color.color(red, green, blue, opacity)" : "new Color(red, green, blue, opacity)"}, is a decimal number from 0.0 (fully see-through) to 1.0 (solid), and it was ${value}.`;
  const how = called === "<init>" ? "new Color(red, green, blue, opacity)" : "Color.color(red, green, blue)";
  const whole = n > 1 && n <= 255 && Number.isInteger(n) ? ` For parts from 0 to 255, use Color.rgb(...) instead, as in Color.rgb(255, 0, 0) for red.` : " If it's calculated, keep it between 0.0 and 1.0, as with Math.min(1.0, value).";
  return `${how} takes each part of the color as a decimal number from 0.0 to 1.0, not from 0 to 255, and its ${part} was ${value}.${whole}`;
}

/** The text in new Image("...") (or new ImageView("...")) on a line, or null. */
const fxImageUrl = (line: { text: string } | null) => (line ? /\bnew\s+(?:Image|ImageView)\s*\(\s*("(?:[^"\\]|\\.)*")/.exec(line.text)?.[1] ?? null : null);

/** Image's errors: an address without file:, an image of size 0. */
function fxImage(m: string, c: CrashContext): string | null {
  if (!c.javaFrames.some((f) => /^(?:javafx\.scene\.image\.|arena\.fx\.Images\.)/.test(f))) return null;
  const line = lineOf(c, c.frames[0]);
  if (m === "Invalid URL: Invalid URL or resource not found") {
    const url = fxImageUrl(line);
    const name = url ? url.slice(1, -1) : "";
    const fixed = name ? ` For a file in the program's folder, write new Image("file:${name}").` : ` For a file in the program's folder, write file: in front of its name, as in new Image("file:landscape.png").`;
    return `new Image(...) got ${url ? url : "a name"} without file: in front. Without it, JavaFX looks for the image among the program's classes, not in its folder, and throws this when it isn't there.${fixed}`;
  }
  if (/^Invalid URL: /.test(m))
    return `new Image(...) takes the image's address, such as "file:landscape.png" for a file in the program's folder, and it couldn't read ${fxImageUrl(line) ?? "this one"} as one: ${sentence(m.slice("Invalid URL: ".length))}`;
  if (m === "URL must not be empty") return `new Image("") got empty text: give it the image's address, such as "file:landscape.png" for a file in the program's folder.`;
  if (m === "Image dimensions must be positive (w,h > 0)")
    return "new WritableImage(width, height) needs a width and a height of at least 1 pixel. If they come from another image's getWidth() and getHeight(), check that image: they're 0 when it couldn't be loaded (its isError() is true then), as for a file that isn't there.";
  return null;
}

/** IndexOutOfBoundsException "10, 0": a pixel read or written outside an image, its x and y. */
function fxPixel(m: string, c: CrashContext): string | null {
  const xy = /^(-?\d+), (-?\d+)$/.exec(m);
  if (!xy || !c.javaFrames.some((f) => f.startsWith("javafx.scene.image."))) return null;
  const [x, y] = [Number(xy[1]), Number(xy[2])];
  const write = c.javaFrames.some((f) => /Writer\.set\w+$/.test(f));
  const negative = x < 0 || y < 0 ? " Positions start at 0, so a negative x or y is never in the image." : "";
  return `The program ${write ? "wrote" : "read"} the pixel at x ${x}, y ${y}, and that's outside the image. An image's pixels go from x 0 to getWidth() - 1 across and from y 0 to getHeight() - 1 down, so in an image 10 pixels wide, x goes from 0 to 9.${negative} A loop with <= instead of <, or x and y swapped (x goes with the width, y with the height), is a common cause; so is a new image of another size than the one the pixels come from.`;
}

/** Where a chart's series or data are: frames of the practice version's charts, or of real JavaFX's. */
const fxInCharts = (c: CrashContext) => c.stack.some((f) => /\barena\.fx\.Charts\b|\bjavafx\.scene\.chart\./.test(f));

/** IllegalArgumentException from a chart: a series or a point added twice, a bar chart without a category axis, a category twice. */
function fxChartArgument(m: string, c: CrashContext): string | null {
  if (!fxInCharts(c)) return null;
  if (m === "Duplicate series added")
    return `The program added a series to a chart that already has it: the same XYChart.Series twice, with two add calls or twice in one addAll. A series is one line (or one set of bars) of one chart. To show the same values again, create another XYChart.Series; to change a series that's shown, change its getData().`;
  if (m === "Duplicate data added")
    return `The program added a data point to a series that already has it: the same XYChart.Data object twice. Each point of a series is one object: create a new XYChart.Data<>(x, y) for each point, even when two have the same values.`;
  if (m === "Axis type incorrect, one of X,Y should be CategoryAxis and the other NumberAxis")
    return "A BarChart needs one CategoryAxis, for the bars' names, and one NumberAxis, for their heights, as in new BarChart<>(new CategoryAxis(), new NumberAxis()) for bars that stand up (or the other way round for bars that lie down). For numbers on both axes, use a LineChart or a ScatterChart.";
  const category = /^Duplicate category(?: added)? ?; (.*) already present$/.exec(m);
  if (category) return `A CategoryAxis's categories must all be different, and "${category[1]}" is in its list twice. Give each category once.`;
  return null;
}

/** NullPointerException from a chart, a color or an image: a null series, point, value, axis or color. */
function fxNull(m: string, c: CrashContext): string | null {
  if (/^Cannot invoke "(?:[\w$]+\.)*PixelReader\.\w+\(.*?\)" because .+ is null$/.test(m) || m === "Reader cannot be null")
    return `getPixelReader() gave null: the image has no pixels to read, because it couldn't be loaded, for example from a file that isn't there or isn't a PNG image. new Image(...) doesn't throw then: the image is empty (its getWidth() is 0) and its isError() is true. Check the file's name (upper and lower case matter) and that the file is in the program's folder. To see what went wrong, print image.getException() when image.isError() is true.`;
  if (m === "Color cannot be null") {
    const color = argumentsOn(lineOf(c, c.frames[0]), /setColor/)?.args.split(",").pop()?.trim();
    return `The program gave setColor null instead of a color${color && color !== "null" && color.length <= 40 ? `: ${color} holds no Color` : ""}. Give it a color, such as Color.RED or Color.rgb(255, 0, 0).`;
  }
  if (m === "The color components or name must be specified") return "Color.web(text) got null instead of text. Give it a color's name or digits, such as \"red\" or \"#ff0000\".";
  if (!fxInCharts(c)) return null;
  if (/^Cannot read field "setToRemove" because "<local5>" is null$/.test(m))
    return `The program added null to a chart's series, as in chart.getData().add(series) with a series variable that holds no series yet. Create the series first: XYChart.Series<Number, Number> series = new XYChart.Series<>();`;
  if (/^Cannot read field "setToRemove" because "<local6>" is null$|^Cannot invoke "javafx\.scene\.chart\.XYChart\$Data\.setSeries/.test(m))
    return `The program added null to a series' data points, as in series.getData().add(point) with a variable that holds no point yet. Create each point with new XYChart.Data<>(x, y).`;
  if (/^Cannot invoke "java\.lang\.Number\.doubleValue\(\)"/.test(m) || /^Cannot invoke "String\.equals\(Object\)" because the return value of "javafx\.collections\.ObservableList\.get\(int\)" is null$/.test(m))
    return `A data point of the chart has null for its x or y value, so the chart can't place it. A variable of type Integer or Double that was never given a value is null, and so is a map's get(...) for a key that isn't there. Give every new XYChart.Data<>(x, y) both of its values.`;
  if (/^Cannot invoke "javafx\.scene\.chart\.Axis\.getSide\(\)" because "<parameter[12]>" is null$/.test(m))
    return `The program created a chart with null for its ${/parameter1/.test(m) ? "x" : "y"} axis. Give it an axis object, as in new LineChart<>(new NumberAxis(), new NumberAxis()), or create the axis before the chart.`;
  if (/^Cannot invoke "javafx\.collections\.ObservableList\.iterator\(\)" because "<parameter1>" is null$/.test(m))
    return "new XYChart.Series<>(...) got null for its list of data points. Give it a list, as in FXCollections.observableArrayList(), or create it empty, new XYChart.Series<>(), and add the points to its getData().";
  return null;
}

// ---- The extra modules 55 to 59: records, switch, sealed types, patterns, text blocks, var, recursion and linked structures ----

/** "a double", "an int", "an Integer". */
const aType = (t: string) => `${/^[aeiouAEIOU]/.test(t) ? "an" : "a"} ${t}`;

/** A record's components, in order, as name and type (its header's (int x, int y)). */
const componentsOf = (t: OwnClass) => t.members.filter((m) => !m.method && m.private && !m.static && t.members.some((a) => a.method && a.name === m.name && a.params === ""));

/** The record of the program's own named so, when it has a component with this name. */
function recordWith(own: OwnClasses, component: string, file: string, named: string): OwnClass | null {
  const t = typeNamed(own, simple(named.replace(/<.*$/, "")), file);
  return t?.kind === "record" && componentsOf(t).some((m) => m.name === component) ? t : null;
}

/** Whether the method around a position declares a local variable or a parameter of this name before it (one that hides a field of the same name). */
function declaredInMethod(code: string, at: number, name: string): boolean {
  const body = methodBodyAround(code, at);
  if (!body) return false;
  const headerStart = Math.max(code.lastIndexOf(";", body[0] - 1), code.lastIndexOf("}", body[0] - 1), code.lastIndexOf("{", body[0] - 1)) + 1;
  const n = escapeRegExp(name);
  const decl = new RegExp(`(?<![\\w$.])([\\w$.]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*)\\s+${n}(?![\\w$])(?=\\s*[=;:,)])`, "g");
  for (const m of code.slice(headerStart, at).matchAll(decl)) if (!/^(?:return|new|throw|else|case|yield|assert|instanceof)$/.test(m[1])) return true;
  return false;
}

/** The declared type of a variable named at javac's caret: a local, a parameter or a field (var p = new Point(...) gives Point), or null. */
function receiverType(d: Diagnostic, own: OwnClasses, name: string): string | null {
  const typed = scopedTypeOf(d, own, name);
  if (typed) return typed;
  const where = caretIn(d, own);
  const body = where ? methodBodyAround(where.code, where.at) : null;
  if (where && body) {
    const v = new RegExp(`\\bvar\\s+${escapeRegExp(name)}\\s*=\\s*new\\s+([\\w$.]+)`).exec(where.code.slice(body[0], where.at));
    if (v) return simple(v[1]);
  }
  const field = classAt(own, d.file, d.line)?.members.find((m) => !m.method && m.name === name);
  return field ? simple(field.type.replace(/<.*$/, "")) : null;
}

/** new Point(5, p.y()): the record created again with one component changed. `from` reads the others: "p." gives p.y(), "" gives y. */
function newRecord(t: OwnClass, component: string, value: string, from: string): string {
  return `new ${t.name}(${componentsOf(t).map((m) => (m.name === component ? value : from ? `${from}.${m.name}()` : m.name)).join(", ")})`;
}

/** The value after = on a line of code, from the caret on: 5 in "x = 5;" (null for ==, += and the like). */
const valueAfterEquals = (at: string) => /^[^=;]*?(?<![=!<>+\-*/%&|^])=(?!=)\s*([^;]+?)\s*;/.exec(at)?.[1] ?? null;

/** The { of the block around a position whose header (the code before it) is a compact constructor of the record: Range { or public Range {. */
function inCompactConstructor(code: string, at: number, record: string): boolean {
  for (let open = blockAround(code, at); open >= 0; open = blockAround(code, open)) {
    const before = code.slice(Math.max(0, open - 200), open);
    if (new RegExp(`(?:^|[;{}])\\s*(?:(?:public|protected|private)\\s+)?${escapeRegExp(record)}\\s*$`).test(before)) return true;
    if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return false;
  }
  return false;
}

/** "cannot assign a value to final variable x", where x is a record's component: in its compact constructor, in its methods, or from outside. */
function recordFinal(d: Diagnostic, own: OwnClasses): string | null {
  const name = /^cannot assign a value to final variable ([\w$]+)$/.exec(d.message)?.[1];
  const c = atCaret(d);
  const where = caretIn(d, own);
  if (!name || !c || !where) return null;
  const before = beforeCaret(c);
  // The object before the dot (p in p.x = 5), when there is one: a plain variable, or this. Anything else (getP().x) isn't read.
  const dotted = c.at.startsWith(".") || /\.\s*$/.test(before);
  const left = before.replace(/\.\s*$/, "").trimEnd();
  const id = /([\w$]+)$/.exec(left);
  const receiver = dotted ? (id && !/[\w$.)\]]\s*$/.test(left.slice(0, id.index)) ? id[1] : null) : undefined;
  if (receiver === null) return null;
  const here = classAt(own, d.file, d.line);
  let t: OwnClass | null = null;
  if (receiver === undefined || receiver === "this") {
    // A bare name or this.name: the record's own component only inside the record, and a bare name only when no local or parameter hides it.
    t = here?.kind === "record" ? recordWith(own, name, d.file, here.name) : null;
    if (t && receiver === undefined && declaredInMethod(where.code, where.at, name)) return null;
  } else {
    const type = receiverType(d, own, receiver);
    t = type ? recordWith(own, name, d.file, type) : null;
  }
  if (!t) return null;
  const value = valueAfterEquals(c.at);
  const inRecord = here === t && (!receiver || receiver === "this");
  if (inRecord && inCompactConstructor(where.code, where.at, t.name)) {
    const keep = value === name ? ` Here it would give ${name} the value it gets anyway, so remove this line.` : value ? ` Here: ${name} = ${value};` : "";
    return `This is the compact constructor of the record ${t.name} (${t.name} { ... }, without a parameter list). Java assigns the fields itself when it ends, from the parameters, so this.${name} = ... isn't allowed in it. To change the value that is stored, assign the parameter instead, as in ${name} = ...; (without this.).${keep}`;
  }
  if (inRecord) {
    const fresh = value ? newRecord(t, name, value, "") : null;
    return `${name} is a component of the record ${t.name}, and a record's components are final: they get their values once, when the record is created, and can't change after that, not even in ${t.name}'s own methods. Give back a new ${t.name} with the new value instead${fresh ? `, as in return ${fresh};` : ""} (the method's return type then is ${t.name}).`;
  }
  const again = value && receiver && receiver !== "this" ? `, as in ${receiver} = ${newRecord(t, name, value, receiver)};` : ".";
  return `${name} is a component of the record ${t.name}, and a record's components can't change: they get their values once, when the record is created. To get ${aType(t.name)} with another ${name}, create a new one${again}`;
}

/** "x has private access in Point", where Point is a record and x one of its components: read it with x(); it can't be changed. */
function recordPrivate(d: Diagnostic, own: OwnClasses): string | null {
  const m = /^([\w$]+) has private access in ([\w$.]+)$/.exec(d.message);
  const c = atCaret(d);
  if (!m || !c) return null;
  const t = recordWith(own, m[1], d.file, m[2]);
  if (!t) return null;
  const receiver = /([\w$]+)\s*$/.exec(beforeCaret(c).replace(/\.\s*$/, ""))?.[1] ?? "it";
  const value = valueAfterEquals(c.at.replace(/^\.?\s*[\w$]+/, "x"));
  if (value != null) return `${m[1]} is a component of the record ${t.name}, and a record's components can't change after it is created (its fields are private and final). To get ${aType(t.name)} with another ${m[1]}, create a new one: ${receiver} = ${newRecord(t, m[1], value, receiver)};`;
  return `${m[1]} is a component of the record ${t.name}. A record keeps its components in private fields, and gives each a public accessor method with the component's own name: read it with ${receiver}.${m[1]}(), with parentheses.`;
}

/** getX() or isAvailable() called on a record, whose accessors are x() and available(). */
function recordGetter(d: Diagnostic, own: OwnClasses): string | null {
  const m = /symbol:\s+method ((?:get|is)([A-Z][\w$]*))\(\)\n\s*location: (?:variable ([\w$]+) of type|class) ([\w$.]+)(?:<.*>)?$/m.exec(d.message);
  if (!m) return null;
  const t = typeNamed(own, simple(m[4]), d.file);
  if (t?.kind !== "record") return null;
  const parts = componentsOf(t);
  const wanted = m[2][0].toLowerCase() + m[2].slice(1);
  const accessors = listed(parts.map((p) => `${p.name}()`));
  const on = m[3] ? `${m[3]}.` : "";
  const prefix = m[1].startsWith("is") ? "is" : "get";
  if (parts.some((p) => p.name === wanted))
    return `${t.name} is a record, and a record's accessor methods have the components' own names, without ${prefix}: ${on}${wanted}(), not ${on}${m[1]}(). Its accessors are ${accessors}.`;
  return `${t.name} is a record, so its accessor methods are named after its components, without ${prefix}: ${accessors}. It has no ${m[1]}().`;
}

/** "field declaration must be static": an instance variable in a record. */
function recordField(d: Diagnostic, own: OwnClasses): string | null {
  const t = classAt(own, d.file, d.line);
  const name = /^([\w$]+)/.exec(atCaret(d)?.at ?? "")?.[1];
  if (t?.kind !== "record" || !name) return null;
  const type = /([\w$.<>\[\]]+)\s+$/.exec(beforeCaret(atCaret(d)!))?.[1] ?? "int";
  const header = `record ${t.name}(${componentsOf(t).map((m) => `${m.type} ${m.name}`).join(", ")}`;
  const parts = componentsOf(t).length ? `${header}, ${type} ${name})` : `${header}${type} ${name})`;
  return `A record can't have instance variables besides its components: everything ${aType(t.name)} holds is listed in its header. Make ${name} a component, as in ${parts}, or compute it in a method when it's needed. If it belongs to the whole record type rather than to each record, make it static: static ${type} ${name};.`;
}

/** "variable x might not have been initialized" at the end of a record's canonical constructor that doesn't assign x. */
function recordCanonical(d: Diagnostic, own: OwnClasses): string | null {
  const name = /^variable ([\w$]+) might not have been initialized$/.exec(d.message)?.[1];
  const t = classAt(own, d.file, d.line);
  if (!name || t?.kind !== "record" || !componentsOf(t).some((m) => m.name === name) || !/^\}/.test(atCaret(d)?.at ?? "")) return null;
  return `This constructor of the record ${t.name} takes all its components as parameters, so it is the record's canonical constructor, and it must give every field a value itself: ${name} never gets one. Add this.${name} = ${name}; to it. Or write it as a compact constructor, ${t.name} { ... } without the parameter list: Java then assigns all the fields at its end.`;
}

/** "'{' expected" after a record's header, at extends: a record can't extend a class. */
function recordExtends(d: Diagnostic, own: OwnClasses): string | null {
  const c = atCaret(d);
  if (!c || !/^\s*extends\b/.test(c.at) || !/\brecord\s+[\w$]+\s*(?:<[^>]*>)?\s*\(.*\)\s*$/.test(beforeCaret(c))) return null;
  const parent = /^\s*extends\s+([\w$.]+)/.exec(c.at)?.[1] ?? "";
  const name = /\brecord\s+([\w$]+)/.exec(c.line)?.[1] ?? "";
  const header = beforeCaret(c).trim().replace(/^(?:(?:public|private|protected|static|final)\s+)+/, "");
  const p = typeNamed(own, parent, d.file);
  const fix =
    p?.kind === "interface"
      ? `${parent} is an interface, so write implements instead of extends: ${header} implements ${parent}.`
      : `A record can implement interfaces, as in ${header} implements ${parent || "Shape"}. If ${parent || "the parent"} is a class of your own, make it an interface (with the methods every ${parent || "one"} must have), or make ${name || "this"} an ordinary class.`;
  return `A record can't extend a class: every record already extends Java's class Record, and a class has only one parent class. ${fix}`;
}

/** "cannot inherit from final Point", where Point is a record. */
function recordFinalClass(d: Diagnostic, own: OwnClasses): string | null {
  const name = /^cannot inherit from final ([\w$.]+)$/.exec(d.message)?.[1];
  const t = name ? typeNamed(own, simple(name), d.file) : undefined;
  if (t?.kind !== "record") return null;
  return `${t.name} is a record, and records are final: no class can extend one. If several kinds of ${t.name} should share something, let them implement a common interface instead (records can implement interfaces), or make ${t.name} an ordinary class.`;
}

type CaseLabel = {
  /** The label as written, between case and -> or :, such as 1, 2 or String s when s.isEmpty(). */
  text: string;
  /** Its values (1 and 2 for case 1, 2), or one type pattern. */
  values: string[];
  /** A type pattern's type (String for String s, Point for Point(int x, int y)), when it is one. */
  pattern?: string;
  /** It has a when guard. */
  guarded: boolean;
  arrow: boolean;
  /** Its position in the file's text and its line. */
  at: number;
  line: number;
};

type SwitchBlock = {
  open: number;
  close: number;
  selector: string;
  expression: boolean;
  /** Its case labels (case null, default among them), without a plain default: that one is in defaults. */
  labels: CaseLabel[];
  hasDefault: boolean;
  /** Its plain default labels (default -> or default:), with their positions in the file's text. */
  defaults: { at: number; arrow: boolean; line: number }[];
};

/** The switch whose { comes at or after a position on the same statement (javac's caret at switch), or the one whose block is around it. */
function switchBlock(code: string, text: string, at: number, around: boolean): SwitchBlock | null {
  let open = -1;
  let head = "";
  if (!around) {
    const m = /^switch\s*\(/.exec(code.slice(at));
    if (!m) return null;
    open = code.indexOf("{", at);
    head = code.slice(Math.max(0, at - 200), open);
  } else {
    for (let o = blockAround(code, at); o >= 0; o = blockAround(code, o)) {
      const before = code.slice(Math.max(0, o - 400), o);
      if (/\bswitch\s*\([^{};]*\)\s*$/.test(before)) {
        open = o;
        head = before;
        break;
      }
      if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return null;
    }
  }
  if (open < 0) return null;
  const close = closeOf(code, open);
  if (close < 0) return null;
  const sw = /\bswitch\s*\(([^{};]*)\)\s*$/.exec(head);
  if (!sw) return null;
  const startOfSwitch = Math.max(0, open - head.length) + sw.index;
  const expression = /(?:[=(,?:]|->|\breturn|\byield)\s*$/.test(code.slice(Math.max(0, startOfSwitch - 50), startOfSwitch));
  const selectorAt = startOfSwitch + sw[0].indexOf("(") + 1;
  const selector = text.slice(selectorAt, selectorAt + sw[1].length).trim();
  const labels: CaseLabel[] = [];
  let hasDefault = false;
  const defaults: SwitchBlock["defaults"] = [];
  let depth = 0;
  for (let k = open + 1; k < close; k++) {
    const ch = code[k];
    if (ch === "{" || ch === "(") depth++;
    else if (ch === "}" || ch === ")") depth--;
    if (depth !== 0) continue;
    const plainDefault = code.startsWith("default", k) && !/[\w$]/.test(code[k - 1] ?? "") ? /^default\s*(->|:)/.exec(code.slice(k, k + 30)) : null;
    if (plainDefault) {
      hasDefault = true;
      defaults.push({ at: k, arrow: plainDefault[1] === "->", line: code.slice(0, k).split("\n").length });
    }
    if (code.startsWith("case", k) && !/[\w$]/.test(code[k - 1] ?? "") && !/[\w$]/.test(code[k + 4] ?? "")) {
      // The label runs to the first -> or : outside parentheses.
      let j = k + 4;
      let d = 0;
      for (; j < close; j++) {
        if (code[j] === "(") d++;
        else if (code[j] === ")") d--;
        else if (d === 0 && (code.startsWith("->", j) || (code[j] === ":" && code[j + 1] !== ":"))) break;
      }
      const raw = text.slice(k + 4, j).replace(/\s+/g, " ").trim();
      const guard = /\swhen\s/.exec(` ${raw} `);
      const plain = guard ? raw.slice(0, guard.index - 1).trim() : raw;
      const typePattern = /^(?:final\s+)?([A-Z][\w$.]*)(?:<[^>]*>)?\s*(?:\(.*\)|[a-z_$][\w$]*)$/.exec(plain);
      const values = typePattern ? [plain] : splitTopLevel(plain).map((v) => v.trim());
      if (/\bdefault\b/.test(plain)) hasDefault = true;
      labels.push({ text: raw, values, ...(typePattern ? { pattern: typePattern[1] } : {}), guarded: !!guard, arrow: code.startsWith("->", j), at: k, line: code.slice(0, k).split("\n").length });
      k = j;
    }
  }
  return { open, close, selector, expression, labels, hasDefault, defaults };
}

/** The switch for a diagnostic: the one javac's caret is on (at switch) or the one around the caret (at a case). */
function switchFor(d: Diagnostic, own: OwnClasses, around: boolean): SwitchBlock | null {
  const where = caretIn(d, own);
  return where ? switchBlock(where.code, where.text, where.at, around) : null;
}

/** An enum constant written in a case: RED for RED or Light.RED. */
const constantOf = (v: string) => v.split(".").pop()!.trim();

/** The text of a sealed type's header up to its {, on one line, and the classes after permits (none when it lists none). */
function sealedHeader(own: OwnClasses, name: string): { header: string; permits: string[]; kind: string } | null {
  for (const [file, lines] of own.code) {
    const code = lines.join("\n");
    const m = new RegExp(`\\bsealed\\s+(?:(?:abstract|public|static|private|protected)\\s+)*(class|interface)\\s+${escapeRegExp(name)}\\b([^{;]*)\\{`).exec(code);
    if (!m) continue;
    const text = (own.lines.get(file) ?? []).join("\n");
    const start = code.lastIndexOf("\n", m.index) + 1;
    const header = text.slice(start, m.index + m[0].length - 1).replace(/\s+/g, " ").trim();
    const permits = /\bpermits\s+([^{]+)$/.exec(m[2])?.[1].split(",").map((p) => simple(p.trim().replace(/<.*$/, ""))).filter(Boolean) ?? [];
    return { header, permits, kind: m[1] };
  }
  return null;
}

/** A sealed type's permitted subtypes: its permits list, or else the program's types that extend or implement it directly. */
function permittedOf(own: OwnClasses, name: string): string[] {
  const s = sealedHeader(own, name);
  if (!s) return [];
  return s.permits.length ? s.permits : [...own.types.values()].filter((t) => t.supers.includes(name)).map((t) => t.name);
}

/** "the switch expression does not cover all possible input values" (and the same for a switch statement with patterns). */
function notExhaustive(d: Diagnostic, own: OwnClasses): string {
  const statement = d.code === "compiler.err.not.exhaustive.statement";
  const sw = switchFor(d, own, false);
  const what = statement ? "switch statement" : "switch expression";
  const must = statement
    ? "A switch statement that uses patterns (case String s) or case null must handle every possible value, as a switch expression must."
    : "A switch expression must give a value for every possible value of what it switches on.";
  const on = sw?.selector ? ` on ${sw.selector}` : "";
  if (sw) {
    const values = sw.labels.flatMap((l) => (l.pattern || l.guarded ? [] : l.values.map(constantOf))).filter((v) => /^[A-Z_][A-Z0-9_]*$/.test(v));
    // The enum: the selector's type (from its declaration, or from a label such as Light.RED), else the only enum of the program's with every label.
    const qualifiers = [...new Set(sw.labels.flatMap((l) => (l.pattern || l.guarded ? [] : l.values)).filter((v) => /^[\w$.]+\.[A-Z_][A-Z0-9_]*$/.test(v.trim())).map((v) => simple(v.trim().replace(/\.[^.]*$/, ""))))];
    const selectorName = /^(?:this\s*\.\s*)?([\w$]+)$/.exec(sw.selector)?.[1];
    const selectorType = qualifiers[0] ?? (selectorName ? receiverType(d, own, selectorName) : null);
    const candidates = values.length ? [...own.types.values()].filter((t) => t.kind === "enum" && values.every((v) => t.constants.includes(v))) : [];
    const en = selectorType ? candidates.find((t) => t.name === selectorType) : candidates.length === 1 ? candidates[0] : undefined;
    if (en) {
      const missing = en.constants.filter((k) => !values.includes(k));
      if (missing.length)
        return `${must} This ${what}${on} has no case for ${listed(missing)} of the enum ${en.name}. Add ${missing.length === 1 ? "a case" : "cases"} for ${missing.length === 1 ? "it" : "them"}, as in case ${missing[0]} -> ...;, or default -> ... for every constant without a case of its own. (With a case for each constant and no default, Java points out this switch again if ${en.name} ever gets a new constant.)`;
    }
    const covered = sw.labels.filter((l) => l.pattern && !l.guarded).map((l) => simple(l.pattern!));
    const types = sw.labels.filter((l) => l.pattern).map((l) => simple(l.pattern!));
    if (types.length) {
      const sealed = [...own.types.values()].find((t) => sealedHeader(own, t.name) && types.every((p) => p === t.name || isSubtype(own, p, t.name)));
      const permitted = sealed ? permittedOf(own, sealed.name) : [];
      const missing = permitted.filter((p) => !covered.some((c) => c === p || isSubtype(own, p, c)));
      if (sealed && missing.length) {
        const guarded = sw.labels.some((l) => l.guarded && missing.includes(simple(l.pattern ?? ""))) ? " (a case with when doesn't count: its condition may be false)" : "";
        const v = missing[0][0].toLowerCase();
        return `${must} ${sealed.name} is sealed, and the ${sealed.kind === "interface" ? "classes that may implement it" : "classes that may extend it"} are ${listed(permitted)}, but this ${what} has no case for ${listed(missing)}${guarded}. Add ${missing.length === 1 ? "a case" : "cases"} such as case ${missing[0]} ${v} -> ...;, or default -> ... for all the others.`;
      }
      return `${must} This ${what}${on} has cases only for some kinds of objects${sw.labels.some((l) => l.guarded) ? " (and a case with when doesn't count: its condition may be false)" : ""}, so add default -> ... at the end for all the others. (A switch on a sealed type needs no default when it has a case for each permitted class.)`;
    }
    if (sw.labels.length && sw.labels.every((l) => l.values.every((v) => /^-?\d|^'|^"/.test(v.trim())) && !l.pattern)) {
      const values = sw.labels.flatMap((l) => l.values.map((v) => v.trim()));
      const kind = values.every((v) => v.startsWith('"')) ? "a String" : values.every((v) => v.startsWith("'")) ? "a char" : "a number";
      return `${must} This ${what}${on} has cases for only some values, and ${kind} has far more possible values than cases can list, so it needs default -> ... at the end, for all the others.`;
    }
  }
  return `${must} Add default -> ... at the end, for all the values without a case of their own. (For an enum, a case for each constant also works; for a sealed type, a case for each permitted class.)`;
}

/** "duplicate case label": a value that an earlier case of the same switch has. */
function duplicateLabel(d: Diagnostic, own: OwnClasses): string {
  const sw = switchFor(d, own, true);
  const where = caretIn(d, own);
  if (sw && where) {
    const self = sw.labels.find((l) => l.at === where.at);
    const earlier = sw.labels.filter((l) => l.at < where.at);
    const norm = (v: string) => (/^[A-Z_][\w$.]*$/.test(v) ? constantOf(v) : v.replace(/\s+/g, ""));
    for (const v of self?.values ?? []) {
      const first = earlier.find((l) => l.values.some((w) => norm(w) === norm(v)));
      if (first)
        return `This switch already has case ${v} (on line ${first.line}), and each value may have only one case: Java wouldn't know which one to run. Remove one of them, or change the value if it was meant to be another one. To give several values the same code, list them in one case, as in case 1, 2 -> ....`;
    }
  }
  return "Two cases of this switch have the same value, and each value may have only one case. Remove one of them, or change its value. To give several values the same code, list them in one case, as in case 1, 2 -> ....";
}

/** "different case kinds used in the switch": case ... -> and case ...: (or default -> and default:) in one switch. */
function mixedCaseKinds(d: Diagnostic, own: OwnClasses): string {
  const sw = switchFor(d, own, true);
  const where = caretIn(d, own);
  // Every label in order, a plain default among them: "case 1" or "default".
  const all = sw ? [...sw.labels.map((l) => ({ at: l.at, arrow: l.arrow, name: `case ${l.text}` })), ...sw.defaults.map((l) => ({ at: l.at, arrow: l.arrow, name: "default" }))].sort((a, b) => a.at - b.at) : [];
  const self = where ? all.find((l) => l.at === where.at) : undefined;
  const first = all[0];
  const arrowFirst = first ? first.arrow : !self?.arrow;
  const label = self ? self.name : "this case";
  const opening = first?.name === "default" ? "its first label, default," : "its first case";
  const firstName = first?.name ?? "case 1";
  if (arrowFirst)
    return `This switch mixes the two kinds of case: ${opening} uses an arrow (${firstName} -> ...), and ${label} uses a colon (${label}:), as in older Java. One switch must use one kind. With arrows, each case runs only its own code and needs no break: write ${label} -> ... (with { } around several statements).`;
  return `This switch mixes the two kinds of case: ${opening} uses a colon (${firstName}:), and ${label} uses an arrow (${label} -> ...). One switch must use one kind: write ${label}: like the others, or change them all to arrows, which need no break (each arrow case runs only its own code).`;
}

/** "selector type double is not allowed": a switch on a long, float, double or boolean. */
function selectorNotAllowed(d: Diagnostic): string {
  const t = /^selector type ([\w$.]+) is not allowed/.exec(d.message)?.[1] ?? "this type";
  const rule = `switch can't switch on ${aType(t)}. In Java 21 it works on int, char, short and byte values, on Strings and enums, and (with patterns such as case String s) on objects, but not on long, float, double or boolean values.`;
  if (t === "boolean") return `${rule} For a boolean, use if and else: if (on) { ... } else { ... }.`;
  if (t === "long") return `${rule} Use if and else if instead. If the values always fit in an int, you could cast it: switch ((int) value).`;
  return `${rule} Use if and else if instead, as in if (value == 2.5) { ... } else if (...) { ... }. Comparing ${t === "float" || t === "double" ? "decimal numbers with == is fragile anyway: a calculated value is often a tiny bit off, so compare ranges, such as value < 3.0, where you can" : "them works the same way"}.`;
}

/** "incompatible types: char cannot be converted to String" for a case's value: it must have the switch's type. */
function caseValueType(d: Diagnostic): string | null {
  const c = atCaret(d);
  const m = /^incompatible types: ([\w$.]+) cannot be converted to ([\w$.]+)$/.exec(d.message);
  // Only for the label itself: javac's caret right after case, or after a comma in its list of values (not in the case's code).
  if (!c || !m || !/^\s*case\s+(?:[^,:>]+,\s*)*$/.test(beforeCaret(c))) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  const value = /^([^,:\->]+?)\s*(?:,|->|:)/.exec(c.at)?.[1].trim();
  let hint = "";
  if (from === "char" && to === "String") hint = ` Text goes in double quotes: ${value ? value.replace(/^'(.*)'$/, '"$1"') : '"a"'}, not ${value ?? "'a'"}.`;
  else if (from === "String" && /^(int|short|byte|char|Integer)$/.test(to)) hint = ` ${to === "char" ? "A char goes in single quotes, as in 'a'" : `Write the number without quotes${value ? `: ${value.replace(/^"(.*)"$/, "$1")}` : ""}`}.`;
  else if (/^(int|short|byte)$/.test(from) && to === "String") hint = ` Put the text in double quotes${value ? `: "${value}"` : ""}.`;
  return `This case's value is ${aType(from)}, but the switch works on ${aType(to)}, so the case could never match: each case's value must have the type of what the switch works on.${hint}`;
}

/** The label of the case whose block is around a position: case 2 for case 2 -> { ... }. */
function caseOfBlock(code: string, text: string, at: number): string | null {
  const open = blockAround(code, at);
  if (open < 0) return null;
  const m = /\bcase\s+([^;{}]+?)\s*->\s*$/.exec(code.slice(Math.max(0, open - 200), open));
  if (!m) return null;
  const start = open - (code.slice(Math.max(0, open - 200), open).length - m.index);
  return text.slice(start, open).replace(/\s*->\s*$/, "").replace(/\s+/g, " ").trim();
}

/** "switch rule completes without providing a value": a case's block in a switch expression that ends without yield. */
function ruleWithoutValue(d: Diagnostic, own: OwnClasses): string {
  const where = caretIn(d, own);
  const label = where ? caseOfBlock(where.code, where.text, where.at) : null;
  const block = label ? `The block of ${label} -> { ... }` : "This case's block";
  return `${block} ends without giving a value, and in a switch expression every case must give one. End the block with yield and the value, as in yield result; (yield is to a case's block what return is to a method). It may end with throw instead, for a value that shouldn't happen. return doesn't work here: it would leave the whole method.`;
}

/** "switch expression completes without providing a value": a switch expression with case ...: whose last statements give no value. */
function switchWithoutValue(d: Diagnostic, own: OwnClasses): string {
  const first = switchFor(d, own, true)?.labels[0]?.text ?? "1";
  return `This switch expression uses cases with a colon (case ${first}:), and its last group of statements ends without giving a value. In a switch expression, each case's statements must end with yield and its value, as in yield result;, or with throw. Or use arrow cases, which give the value right after the arrow: case ${first} -> ...;.`;
}

/** "switch expression does not have any result expressions": a switch used as a value whose cases give none. */
function switchNoValues(d: Diagnostic): string {
  const c = atCaret(d);
  const target = c ? /([\w$<>\[\]]+\s+[\w$]+\s*=|[\w$]+\s*=|return)\s*$/.exec(beforeCaret(c))?.[1].trim() : undefined;
  const statement = target && target !== "return" ? ` If the switch should only do something (such as print), make it a statement on its own: remove ${target} in front of it.` : "";
  return `None of the cases of this switch expression gives a value, but it is used as a value${target && target !== "return" ? ` (${target} switch ...)` : ""}. With arrow cases, write the value right after the arrow: case 1 -> "one";. With colons, give it with yield: case 1: yield "one";.${statement}`;
}

/** return inside a switch expression. */
function returnInSwitch(d: Diagnostic): string {
  const value = /^return\s+([^;]+?)\s*;/.exec(atCaret(d)?.at ?? "")?.[1];
  return `return can't be used inside a switch expression: the switch is still working out its value, and return would leave the whole method. Give the case's value with yield instead${value ? `: yield ${value};` : ", as in yield \"Monday\";"}. To return that value from the method, return the whole switch: return switch (...) { ... };.`;
}

/** break inside a switch expression. */
function breakInSwitch(): string {
  return "break can't leave a switch expression, because each case must give a value. End the case with yield and its value, as in yield \"Other\";, or with throw. (In a switch statement with case ...:, break ends a case; in a switch expression, yield does.)";
}

/** "not a statement" for a value on its own in a case of a switch expression: it needs yield. */
function valueInSwitch(d: Diagnostic, own: OwnClasses): string | null {
  const where = caretIn(d, own);
  const c = atCaret(d);
  if (!where || !c) return null;
  const sw = switchBlock(where.code, where.text, where.at, true);
  if (!sw?.expression) return null;
  const value = /^([^;]+?)\s*;/.exec(c.at)?.[1];
  if (!value || /=|\+\+|--/.test(value)) return null;
  return `${value} on its own isn't a statement. In a switch expression, a case whose code is a block { } (or that uses a colon, case 1:) gives its value with yield: yield ${value};.`;
}

/** "this case label is dominated by a preceding case label": an earlier case matches everything this one would. */
function dominatedLabel(d: Diagnostic, own: OwnClasses): string {
  const sw = switchFor(d, own, true);
  const where = caretIn(d, own);
  const self = sw && where ? [...sw.labels].reverse().find((l) => l.at < where.at) : undefined;
  const earlier = sw && self ? sw.labels.filter((l) => l.at < self.at && l.pattern && !l.guarded) : [];
  const known: Record<string, string[]> = { CharSequence: ["String", "StringBuilder"], Number: ["Integer", "Long", "Double", "Float", "Short", "Byte"], Comparable: ["String", "Integer", "Long", "Double"] };
  const covers = (sup: string, sub: string) => sup === sub || sup === "Object" || known[sup]?.includes(sub) || isSubtype(own, sub, sup);
  const mine = self?.pattern ? simple(self.pattern) : undefined;
  const by = mine ? earlier.find((l) => covers(simple(l.pattern!), mine)) : earlier[earlier.length - 1];
  if (self && by) {
    const sub = mine && mine !== simple(by.pattern!) ? ` every ${mine} is ${aType(simple(by.pattern!))}.` : "";
    const order = mine ? "Put the more specific case first" : "Put the case for this value first (constants go before the patterns that would match them)";
    return `An earlier case, case ${by.text} (on line ${by.line}), already matches every value this one would:${sub || ` it matches every ${simple(by.pattern!)}.`} Java tries the cases from top to bottom, so case ${self.text} could never be chosen. ${order}: case ${self.text} above case ${by.text}.`;
  }
  return "An earlier case of this switch already matches every value this case would, so this one could never be chosen: Java tries the cases from top to bottom. Put the more specific case first (and a constant before a pattern that would match it).";
}

/** "sealed, non-sealed or final modifiers expected": a class that extends a sealed type without saying how it may be extended in turn. */
function sealedChildModifier(d: Diagnostic, own: OwnClasses): string {
  const line = (own.lines.get(d.file)?.[d.line - 1] ?? atCaret(d)?.line ?? "").replace(/\{.*$/, "").replace(/\s+/g, " ").trim();
  const m = /\b(class|interface)\s+([\w$]+)/.exec(line);
  const t = m ? typeNamed(own, m[2], d.file) : undefined;
  const parent = t?.supers.find((s) => sealedHeader(own, s));
  const p = parent ? sealedHeader(own, parent) : null;
  const linkVerb = p?.kind === "interface" && m?.[1] !== "interface" ? "implements" : "extends";
  const intro = m && parent ? `${m[2]} ${linkVerb} the sealed ${p!.kind} ${parent}, so its` : "A class that extends a sealed class or implements a sealed interface must say in its";
  if (m?.[1] === "interface")
    return `${intro} header must say whether other types may extend ${m ? m[2] : "it"} in turn: sealed (only the ones it lists after permits) or non-sealed (any may). Write ${line.replace(/\binterface\b/, "non-sealed interface")}, or sealed with a permits list.`;
  const abstract = /\babstract\b/.test(line);
  const fixed = abstract ? line.replace(/\babstract\s+class\b/, "non-sealed abstract class") : line.replace(/\bclass\b/, "final class");
  return `${intro} header must say whether other classes may extend ${m ? m[2] : "it"} in turn: final (none may), sealed (only the ones it lists after permits) or non-sealed (any may). ${abstract ? "An abstract class is meant to be extended, so it can't be final: write" : "Usually it's final: write"} ${fixed}. (A record or an enum is final by itself, so it needs none of these words.)`;
}

/** "class is not allowed to extend sealed class: Shape (as it is not listed in its 'permits' clause)". */
function notPermitted(d: Diagnostic, own: OwnClasses): string {
  const parent = /sealed class: ([\w$.]+)/.exec(d.message)?.[1];
  const line = own.lines.get(d.file)?.[d.line - 1] ?? atCaret(d)?.line ?? "";
  const child = /\b(?:class|interface|record|enum)\s+([\w$]+)/.exec(line)?.[1];
  const p = parent ? sealedHeader(own, simple(parent)) : null;
  if (!parent || !child || !p) return `${parent ?? "This type"} is sealed: only the classes listed after permits in its header may extend or implement it, and this one isn't listed. Add it to that list, or don't extend or implement ${parent ?? "it"}.`;
  const name = simple(parent);
  const childKind = typeNamed(own, child, d.file)?.kind;
  const verb = p.kind === "interface" && childKind !== "interface" ? "implement" : "extend";
  const remove = `If not, remove ${verb === "implement" ? "implements" : "extends"} ${name} from ${child}.`;
  if (p.permits.length)
    return `${name} is sealed: only the classes named after permits in its header (${listed(p.permits)}) may ${verb} it, and ${child} isn't one of them. If ${child} should be ${aType(name)}, add it to the list: ${p.header}, ${child}. ${remove}`;
  // No permits list: the subtypes in the sealed type's own file are permitted without one. A list must name them too, a type nested in another by its path (Shape.Circle).
  const sealedType = typeNamed(own, name, d.file);
  const pathOf = (t: OwnClass) => [...typesAround(own, t.file, t.from).filter((x) => x !== t && x.from <= t.from && t.to <= x.to).reverse().map((x) => x.name), t.name].join(".");
  const others = [...new Set(permittedOf(own, name).filter((n) => n !== child).map((n) => {
    const t = typeNamed(own, n, sealedType?.file ?? d.file);
    return t ? pathOf(t) : n;
  }))];
  const now = others.length ? `it has no permits list, so only the classes in its own file (${listed(others)}) may ${verb} it` : `it has no permits list, so only the classes in its own file may ${verb} it`;
  const added = `${p.header} permits ${[...others, child].join(", ")}`;
  return `${name} is sealed: ${now}, and ${child} isn't in that file. If ${child} should be ${aType(name)}, give ${name} a permits list that names ${others.length ? `them and ${child}` : child}: ${added}. ${remove}`;
}

/** A pattern variable (instanceof String text, case Circle c) used where it doesn't exist. */
function patternScope(d: Diagnostic, own: OwnClasses): string | null {
  const name = /symbol:\s+variable ([\w$]+)/.exec(d.message)?.[1];
  const where = caretIn(d, own);
  if (!name || !where || !where.code.startsWith(name, where.at)) return null;
  const { code, at } = where;
  const body = methodBodyAround(code, at);
  if (!body) return null;
  const n = escapeRegExp(name);
  const decl = new RegExp(`\\binstanceof\\s+(?:final\\s+)?([\\w$.]+(?:\\s*<[^>]*>)?)\\s+${n}\\b|\\bcase\\s+([\\w$.]+(?:\\s*<[^>]*>)?)\\s+${n}\\s*(?:->|:|when\\b)`, "g");
  let last: RegExpExecArray | null = null;
  for (let m; (m = decl.exec(code)) && m.index < at; ) if (m.index > body[0]) last = m;
  if (!last) return null;
  // An ordinary variable of the same name created after the pattern (int s = 0;, for (String s : words), catch (Exception s))
  // is the one the name was meant for: leave the error to outOfScope. The slice starts after the pattern so that it isn't matched itself.
  const TYPE = `(?:int|long|short|byte|double|float|boolean|char|var|[A-Z][\\w$.]*)(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*`;
  const local = new RegExp(`\\bcatch\\s*\\([\\w$.|\\s]+?\\s${n}\\s*\\)|(?<=[;{}(]\\s*)(?:final\\s+)?${TYPE}\\s+${n}\\s*[=;:]`);
  if (local.test(code.slice(last.index + last[0].length, at))) return null;
  const line = code.slice(0, last.index).split("\n").length;
  if (last[2]) return `${name} was created by case ${last[2].replace(/\s+/g, "")} ${name} on line ${line}, and it exists only in that case. Use it there.`;
  const type = last[1].replace(/\s+/g, "");
  // !(value instanceof Integer number): the variable exists where the test was false, so not in the if's own block.
  const negated = /!\s*\(\s*[\w$.()\s]*$/.test(code.slice(Math.max(0, last.index - 60), last.index));
  const intro = `${name} is a pattern variable: instanceof ${type} ${name} on line ${line} creates it, and it exists only where Java knows the test was true`;
  // The if whose condition holds the instanceof (none for a ?: or a return with ||).
  let ifOpen = -1;
  for (const m of code.slice(body[0], last.index).matchAll(/\bif\s*\(/g)) {
    const open = body[0] + m.index! + m[0].length - 1;
    if (pastClose(code, open) > last.index) ifOpen = open;
  }
  if (ifOpen < 0) {
    if (negated) return `${intro}, which for !(... instanceof ${type} ${name}) is only where that test was false. Here Java can't be sure of that, so ${name} doesn't exist here. Test with instanceof in an if, and use ${name} where the if knows the result.`;
    return `${intro}: after && in the same condition, and in the part of ? : for true. Here the test may have been false (after ||, or in the part of ? : for false), so ${name} doesn't exist here. Use ${name} only where the test is known to be true, or test with instanceof in an if and use ${name} in its block.`;
  }
  const condEnd = pastClose(code, ifOpen) - 1;
  const thenEnd = statementEnd(code, condEnd + 1);
  const after = code.slice(thenEnd).match(/^\s*else\b/);
  const elseStart = after ? thenEnd + after[0].length : -1;
  const elseEnd = after ? statementEnd(code, elseStart) : -1;
  if (at < condEnd) {
    const between = code.slice(last.index, at);
    if (!negated && /\|\|/.test(between))
      return `${intro}: inside the if's block, and after && in the same condition. After || the test may have been false (the part after || runs only when the part before it was false), so ${name} doesn't exist there. If both must hold, use && instead; otherwise test ${name} inside the if's block.`;
    if (negated && /&&/.test(between))
      return `${intro}. After !(... instanceof ${type} ${name}) && in the same condition, the instanceof test was false (the part after && runs only when the part before it was true), so ${name} doesn't exist there. With || instead, the part after it runs only when the test was true, and ${name} exists there: if (!(... instanceof ${type} ${name}) || ...).`;
    return `${intro}. Here, in the same condition, Java can't be sure the test was true, so ${name} doesn't exist here. Use ${name} after && in the condition, or inside the if's block.`;
  }
  const inThen = condEnd < at && at < thenEnd;
  const inElse = elseStart >= 0 && elseStart <= at && at < elseEnd;
  if (negated && inThen)
    return `${intro}. In if (!(... instanceof ${type} ${name})), the block runs when the test was false, so ${name} doesn't exist in it. Use ${name} in the else block, or after the if when its block always ends with return (or throw).`;
  if (!negated && inElse)
    return `${intro}: inside the if's block (and after && in the same condition). In the else block the test was false, so ${name} doesn't exist there. Move the code that uses ${name} into the if's block. Or turn the test around, if (!(... instanceof ${type} ${name})) { ... } else { ... }, so that the else block is where ${name} exists.`;
  if (negated) return `${intro}, which for !(... instanceof ${type} ${name}) is after the if only when the if's block always leaves (with return or throw). Use it inside an else block, or end the if's block with return.`;
  return `${intro}: inside the if's block (and after && in the same condition). Here, after that block, it doesn't exist. Use ${name} inside the block. Or turn the test around, if (!(... instanceof ${type} ${name})) { return; }, and then ${name} exists after the if.`;
}

/** Where the statement that starts at `from` ends (just past it): a block in { }, an if with its else, a loop with its body, or a statement up to its ;. */
function statementEnd(code: string, from: number): number {
  const k = from + (/^\s*/.exec(code.slice(from))?.[0].length ?? 0);
  if (code[k] === "{") {
    const close = closeOf(code, k);
    return close < 0 ? code.length : close + 1;
  }
  const head = /^(if|while|for|switch|synchronized)\s*\(/.exec(code.slice(k));
  if (head) {
    const close = pastClose(code, k + head[0].length - 1);
    if (close < 0) return code.length;
    const end = statementEnd(code, close);
    const more = head[1] === "if" ? /^\s*else\b/.exec(code.slice(end)) : null;
    return more ? statementEnd(code, end + more[0].length) : end;
  }
  if (/^(?:else|do|try)\b/.test(code.slice(k))) return statementEnd(code, k + /^\w+/.exec(code.slice(k))![0].length);
  let depth = 0;
  for (let j = k; j < code.length; j++) {
    if (code[j] === "(" || code[j] === "{") depth++;
    else if (code[j] === ")" || code[j] === "}") depth--;
    else if (code[j] === ";" && depth === 0) return j + 1;
    if (depth < 0) return j;
  }
  return code.length;
}

/** "illegal text block open delimiter sequence, missing line terminator": text after the opening """ on its line, or a closing """ read as an opening one. */
function textBlockOpen(d: Diagnostic, own: OwnClasses): string {
  const lines = own.lines.get(d.file);
  const c = atCaret(d);
  // An odd number of """ before this line: this one closes a text block that didn't open properly above.
  const before = lines ? lines.slice(0, d.line - 1).join("\n").split('"""').length - 1 : 0;
  if (before % 2 === 1) {
    const opener = lines!.slice(0, d.line - 1).map((l, i) => (/"""[ \t]*\S/.test(l) ? i + 1 : 0)).filter(Boolean).pop();
    return `Java read this """ as the start of another text block, because the text block above${opener ? ` (on line ${opener})` : ""} didn't open properly. Fix that one, and this error goes away too.`;
  }
  const rest = c?.at.trim() ?? "";
  if (/"""/.test(rest)) {
    const one = rest.slice(0, rest.indexOf('"""'));
    return `A text block (between """ and """) can't be on one line: its text starts on the line after the opening """. For one line of text, use an ordinary string in double quotes: "${one}".`;
  }
  const start = c ? beforeCaret(c).trim() : '"""';
  return `A text block's opening """ must end its line: the text starts on the next line. Here text follows the """ on the same line. Put a line break right after the """: keep ${start} on this line, and move the text after it${rest && rest.length <= 40 ? ` (${rest})` : ""} to the next line.`;
}

/** "incompatible types: String cannot be converted to int" when a value goes into a variable created with var: its type came from its first value and stays. */
function varKeepsType(d: Diagnostic, own: OwnClasses): string | null {
  const where = caretIn(d, own);
  const m = /^incompatible types: (\S+) cannot be converted to (\S+)$/.exec(d.message);
  if (!where || !m) return null;
  const lineStart = where.code.lastIndexOf("\n", where.at - 1) + 1;
  const name = /^\s*([\w$]+)\s*=(?!=)/.exec(where.code.slice(lineStart, where.at))?.[1];
  const body = methodBodyAround(where.code, where.at);
  if (!name || !body) return null;
  const decl = new RegExp(`\\bvar\\s+${escapeRegExp(name)}\\s*=\\s*([^;]+?)\\s*;`).exec(where.text.slice(body[0], lineStart));
  if (!decl) return null;
  const [from, to] = [simple(m[1]), simple(m[2])];
  return `${name} was created with var ${name} = ${decl[1]};, so Java gave it the type of that first value, ${to}, and it keeps that type: var doesn't let a variable change type later. So it can't hold ${aType(from)}. Use another variable for the ${from}, or, if ${name} should be ${aType(from)}, give it ${aType(from)} value where it's created.`;
}

/** "cannot infer type for local variable x": var without a value, with null, an array initializer or a lambda. */
function varInfer(d: Diagnostic): string | null {
  const m = /^cannot infer type for local variable ([\w$]+)\n\s*\((.*)\)$/.exec(d.message);
  if (!m) return null;
  const [, name, why] = m;
  if (/without initializer/.test(why))
    return `var lets Java work out a variable's type from the value it starts with, so a var variable needs its value on the same line: var ${name} = 0;. If it gets its value later, write its type instead: int ${name};.`;
  if (/initializer is 'null'/.test(why)) return `var lets Java work out a variable's type from its starting value, but null has no type of its own, so Java can't tell what ${name} should hold. Write the type instead, as in String ${name} = null;.`;
  if (/array initializer/.test(why)) return `Java can't tell the type of ${name} from { ... } alone. Write the array's type, as in int[] ${name} = {1, 2, 3};, or create it with new: var ${name} = new int[] {1, 2, 3};.`;
  if (/lambda expression|method reference/.test(why)) return `A ${/lambda/.test(why) ? "lambda" : "method reference"} has no type of its own: it takes the type of the place it's put in. So var can't work out the type of ${name}: write the interface type instead, such as Comparator<String> or BinaryOperator<Integer>.`;
  return null;
}

/** "'var' is not allowed here": var for an instance variable, a return type or a parameter. */
function varNotAllowed(d: Diagnostic, own: OwnClasses): string {
  const c = atCaret(d);
  const after = c?.at ?? "";
  const before = c ? beforeCaret(c) : "";
  const name = /^var\s+([\w$]+)/.exec(after)?.[1];
  const local = "var works only for local variables (the ones created inside a method, in for loops included), a lambda's parameters and a record pattern's components.";
  if (/^var\s+[\w$]+\s*\(/.test(after)) return `${local} A method's return type must be written out: replace var before ${name}(...) with the type it returns, such as int.`;
  if (/\binstanceof\s+(?:final\s+)?$/.test(before)) return `A pattern after instanceof must name the type it checks for, since that type is the whole question: replace var with it, as in o instanceof String ${name ?? "s"}.`;
  if (/\bcatch\s*\(\s*(?:final\s+)?$/.test(before)) return `${local} A catch must name the type of exception it catches: replace var with it, such as Exception, as in catch (Exception ${name ?? "e"}).`;
  const record = /\brecord\s+([\w$]+)\s*(?:<[^>]*>)?\s*\([^)]*$/.exec(before);
  if (record) return `${local} A record's components are listed in its header with their types written out: replace var${name ? ` before ${name}` : ""} with the type, such as int, as in record ${record[1]}(int ${name ?? "x"}).`;
  if (/[(,]\s*(?:final\s+)?$/.test(before)) return `${local} A method's parameters must have their types written out: replace var${name ? ` before ${name}` : ""} with the type, such as int.`;
  const inMethod = (() => {
    const where = caretIn(d, own);
    return where ? !!methodBodyAround(where.code, where.at) : false;
  })();
  if (!inMethod && name) {
    const value = /=\s*([^;]+?)\s*;/.exec(after)?.[1] ?? "";
    const type = /^-?\d+$/.test(value) ? "int" : /^-?\d*\.\d+$/.test(value) ? "double" : /^"/.test(value) ? "String" : /^(?:true|false)$/.test(value) ? "boolean" : /^new\s+([\w$]+)\s*\(/.exec(value)?.[1];
    // Its modifiers as written (private static final), kept in the example; private when it has none.
    const modifiers = /((?:\b(?:public|protected|private|static|final|transient|volatile)\s+)*)$/.exec(before)?.[1].trim().replace(/\s+/g, " ") || "private";
    const example = type ? `, as in ${modifiers} ${type} ${name}${value ? ` = ${value}` : ""};` : "";
    const what = /\bstatic\b/.test(modifiers) ? "a class variable (it's in the class, not in a method, and static: there is one for the whole class)" : "an instance variable (it's in the class, not in a method)";
    return `${local} ${name} is ${what}, so it needs its type written out: replace var with the type${example}.`;
  }
  return `${local} Write the type here instead of var.`;
}

/** The method a line of the learner's code is in: its name, its parameters' names and its header's line, read from the text above the line. */
function methodHeaderAbove(c: CrashContext, f: Frame): { params: string[]; types: string[]; line: number; returns: string } | null {
  const lines = c.code.get(f.file);
  if (!lines) return null;
  const name = escapeRegExp(f.method);
  const re = new RegExp(`(?:^|[\\s;{}])((?:[\\w$<>\\[\\],.?]+\\s+)+)${name}\\s*\\(([^()]*)\\)\\s*(?:throws\\s[^{]*)?\\{?\\s*$`);
  for (let i = f.line - 1; i >= 0 && i >= f.line - 200; i--) {
    const m = re.exec(lines[i]);
    if (m && !/\b(?:return|new|=)\b/.test(lines[i].slice(0, m.index + 1))) {
      const parts = m[2].trim() ? splitTopLevel(m[2]).map((p) => p.trim()) : [];
      // The return type: the last word before the name (void in "public static void bounce(" and in "static <T> void f(").
      const returns = m[1].trim().split(/\s+/).pop() ?? "";
      return { params: parts.map((p) => /([\w$]+)$/.exec(p)?.[1] ?? ""), types: parts.map((p) => p.replace(/\s*[\w$]+$/, "").replace(/^final\s+/, "").trim()), line: i + 1, returns };
    }
  }
  return null;
}

/** The arguments of the first call of a method on a line of code: ["n - 2"] for countDown(n - 2). */
function argumentsOfCall(code: string, method: string): string[] | null {
  const m = new RegExp(`(?<![\\w$])${escapeRegExp(method)}\\s*\\(`).exec(code);
  if (!m) return null;
  let depth = 0;
  for (let k = m.index + m[0].length - 1; k < code.length; k++) {
    if (code[k] === "(") depth++;
    else if (code[k] === ")" && --depth === 0) {
      const inside = code.slice(m.index + m[0].length, k).trim();
      return inside ? splitTopLevel(inside).map((a) => a.trim()) : [];
    }
  }
  return null;
}

/**
 * The part of a StackOverflowError's trace that repeats: the learner's methods that kept calling each other, by class and method
 * (lines may differ, as in fib(n - 1) + fib(n - 2)), after any frames on top that don't repeat (a helper, or Java's own code).
 * `start` is the index in frames of the cycle's first frame, `period` the number of methods in it; null when nothing repeats.
 */
function repeatingCycle(frames: Frame[]): { start: number; period: number } | null {
  const keys = frames.slice(0, 200).map((f) => `${f.cls}.${f.method}`);
  for (let start = 0; start <= Math.min(10, keys.length); start++)
    for (let period = 1; period <= 4; period++) {
      // Each frame the same as the one a round further in, for at least three rounds, and down to the last few frames (main) or for long.
      let same = 0;
      while (start + same + period < keys.length && keys[start + same] === keys[start + same + period]) same++;
      if (same + period >= 3 * period && (start + same + period >= keys.length - 3 || same >= 30)) return { start, period };
    }
  return null;
}

/** StackOverflowError: recursion that never reaches its base case (or that has none), by the part of the learner's frames that repeats. */
function stackOverflow(_m: string, c: CrashContext): string {
  const plain = "A method kept calling itself (or methods kept calling each other) without stopping, until the call stack ran out of room. Check the stopping condition of the recursion.";
  const cycle = repeatingCycle(c.frames);
  if (!cycle) return plain;
  // The frames of one round, each one stopped at the line where it calls the next (a round further in than the cycle's first frame, whose line may be elsewhere).
  const round = c.frames.slice(cycle.start + cycle.period, cycle.start + 2 * cycle.period);
  const ran = "and those calls never stopped: each call waits for the one it makes, and Java keeps every unfinished call on the call stack, until there was no room left for more. Then Java stopped the program with StackOverflowError.";
  // toString (or equals, hashCode) calling itself through Java's String.valueOf or a StringBuilder: objects that link back to themselves.
  const objectMethod = round.length === 1 && /^(?:toString|equals|hashCode)$/.test(round[0].method);
  if (objectMethod && c.stack.some((s) => /^(?:java\.base\/)?java\.(?:lang\.String\.valueOf|lang\.StringBuilder\.append|lang\.String\.join|util\.Objects\.|util\.Arrays\.|util\.AbstractCollection\.|util\.AbstractMap\.)/.test(s))) {
    const f = round[0];
    return `${binarySimple(f.cls)}'s ${f.method} ended up calling itself again (line ${f.line}, ${f.file}), through Java's own code: an object's ${f.method} uses the ${f.method} of the objects it links to, and here the links went around in a circle (such as a.next = a, or two objects that link to each other), so the calls never came to an end. ${ran.replace(/^and those calls never stopped: each/, "Each")} Check how the objects are linked: a chain that ends with null stops, a circle doesn't. If objects must link back, leave that link out of ${f.method}.`;
  }
  const methods = round.filter((f, i) => round.findIndex((g) => g.cls === f.cls && g.method === f.method) === i);
  if (methods.length > 1) {
    return `${listed(methods.map((f) => methodLabel(f)))} kept calling each other (${listed(methods.map((f) => `line ${f.line}`))}), ${ran} At least one of them needs a base case, an if that returns without calling the other, and the values they pass on must move toward it. Follow a few calls by hand, writing down the value each one gets.`;
  }
  const f = round[0];
  const name = methodLabel(f);
  const head = `${name} calls itself on line ${f.line} (${f.file}), ${ran}`;
  const h = methodHeaderAbove(c, f);
  const call = lineOf(c, f)?.code ?? "";
  const args = argumentsOfCall(call, f.method);
  if (!h) return `${head} Check its base case: the case that stops without calling ${name} again.`;
  const lines = c.code.get(f.file) ?? [];
  const between = lines.slice(h.line, f.line - 1);
  const callAt = call.search(new RegExp(`(?<![\\w$])${escapeRegExp(f.method)}\\s*\\(`));
  const sameLineBase = callAt > 0 && /\bif\b|\?/.test(call.slice(0, callAt));
  const baseIndex = between.findIndex((l) => /\bif\s*\(/.test(l));
  const p = h.params[0];
  const numeric = /^(?:int|long|short|byte|double)$/.test(h.types[0] ?? "");
  if (baseIndex < 0 && !sameLineBase) {
    const test = numeric && p ? `${p} <= 0` : "...";
    // A void method has no answer to give back: its base case just returns.
    if (h.returns === "void") return `${head} ${name} has no base case: a case, checked before the call, that stops without calling ${name} again. Add one at its start, such as if (${test}) { return; }.`;
    return `${head} ${name} has no base case: a case, checked before the call, that gives back its answer without calling ${name} again. Add one at its start, such as if (${test}) { return ...; }, with the answer for the smallest case.`;
  }
  if (args && args.length === h.params.length && args.every((a, i) => a === h.params[i]))
    return `${head} It calls itself with the same value${args.length === 1 ? "" : "s"} it got (${f.method}(${args.join(", ")})), so it never gets any closer to its base case. Change the call so that each call moves toward the base case${numeric && p ? `, for example ${f.method}(${[`${p} - 1`, ...args.slice(1)].join(", ")})` : ""}.`;
  const baseLine = baseIndex >= 0 ? h.line + 1 + baseIndex : f.line;
  const cond = baseIndex >= 0 ? /\bif\s*\((.*)\)/.exec(between[baseIndex])?.[1] ?? "" : "";
  const skip = /==/.test(cond) && p && numeric
    ? ` An == test is missed when the value jumps over it (counting down by 2 from an odd number skips 0): a test such as ${p} <= 0 stops at any value past it.`
    : " Follow a few calls by hand, writing down the value each one gets.";
  return `${head} ${name} has a base case (the if on line ${baseLine}), but the calls never reach it. Check that each call moves its value toward the base case and can't go past it.${skip} (A base case that would be reached only after tens of thousands of calls is too deep as well: then use a loop.)`;
}

/** The program's own classes that link to objects of their own class (Node next; TreeNode left, right): the nodes of a linked list or a tree. */
function nodeClasses(own: OwnClasses | undefined): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const t of own?.types.values() ?? []) {
    const links = t.members.filter((m) => !m.method && !m.static && m.type.replace(/<.*$/, "") === t.name).map((m) => m.name);
    if (links.length) out.set(t.name, links);
  }
  return out;
}

/** Whether the loop around a frame's line moves a variable along one of these links (p = p.mentor;), in its body or its for header. */
function followsInLoop(c: CrashContext, f: Frame, links: string[]): boolean {
  const lines = c.code.get(f.file);
  if (!lines || f.line < 1 || f.line > lines.length) return false;
  const code = lines.join("\n");
  const at = lines.slice(0, f.line - 1).join("\n").length + 1;
  const step = new RegExp(`(?<![\\w$.])([\\w$]+)\\s*=\\s*\\1\\s*\\.\\s*(?:${links.map(escapeRegExp).join("|")})\\b`);
  // The crash's own line (while (p.mentor != null) p = p.mentor;), then each loop around it.
  if (step.test(lines[f.line - 1])) return true;
  for (let open = blockAround(code, at); open >= 0; open = blockAround(code, open)) {
    const before = code.slice(Math.max(0, open - 300), open);
    const loop = /\b(?:while|for)\s*\(([^{};]*(?:;[^{};]*){0,2})\)\s*$|\bdo\s*$/.exec(before);
    if (loop && (step.test(loop[0]) || step.test(code.slice(open, closeOf(code, open))))) return true;
    if (/\b(?:class|interface|enum|record)\s+[\w$]+[^;{}]*$/.test(before)) return false;
  }
  return false;
}

/** NullPointerException on a node of a linked list or a tree: following next past the end, an empty list's head, a leaf's children. */
function linkedNull(m: string, c: CrashContext): string | null {
  const nodes = nodeClasses(c.own);
  if (!nodes.size || !c.own) return null;
  const field = /^Cannot (read|assign) field "([\w$]+)" because "(.+)" is null$/.exec(m);
  const call = /^Cannot invoke "(?:[\w$]+[.$])*([\w$]+)\.([\w$]+)\(.*?\)" because "(.+)" is null$/.exec(m);
  if (!field && !call) return null;
  const member = field ? field[2] : call![2];
  const because = field ? field[3] : call![3];
  // The class of the null object: the one the method belongs to, or the node class with that field, or the type of the field that was null.
  const last = /(?:^|\.)([\w$]+)$/.exec(because)?.[1] ?? "";
  const fieldType = (n: string) => [...c.own!.types.values()].flatMap((t) => t.members).find((x) => !x.method && x.name === n && nodes.has(x.type.replace(/<.*$/, "")))?.type.replace(/<.*$/, "");
  const node = call ? (nodes.has(call[1]) ? call[1] : null) : ([...nodes.keys()].find((n) => c.own!.types.get(n)?.members.some((x) => !x.method && x.name === member)) ?? fieldType(last) ?? null);
  if (!node) return null;
  const f = c.frames[0];
  const line = lineOf(c, f)?.code ?? "";
  // The null expression as written: <local2>.next is current.next on the line.
  const parts = because.split(".");
  const self = parts[0] === "this" ? "(?:this\\s*\\.\\s*)?" : "";
  const pattern = self + (self ? parts.slice(1) : parts).map((part) => (/^<(?:local|parameter)\d+>$/.test(part) ? "[\\w$]+" : escapeRegExp(part))).join("\\s*\\.\\s*");
  const found = new RegExp(`(?<![\\w$.])(${pattern})\\s*\\.\\s*${escapeRegExp(member)}\\b`).exec(line)?.[1].replace(/\s+/g, "");
  const expr = found ?? nullThing(`"${because}"`);
  const named = !!found;
  const used = field ? (field[1] === "read" ? `read ${member} of` : `set ${member} of`) : `called ${member}() on`;
  const start = `The program ${used} ${named ? expr : "a node"}, but ${named ? `${expr} is` : `${expr} was`} null: there is no ${node} there.`;
  const links = nodes.get(node)!;
  const recursive = !!f && c.frames.slice(1).some((g) => g.method === f.method && g.cls === f.cls);
  // Only for a list or a tree: a link named like one (next, left), a class named like a node, recursion, or a loop that follows the link.
  // A Person with a Person mentor (or a Person parent: parent and child name family links too) gets the general note.
  const structural = links.some((l) => /^(?:next|prev|previous|left|right)$/i.test(l)) || /Node|Link/.test(node);
  if (!structural && !recursive && !(f && followsInLoop(c, f, links))) return null;
  // A list's head (or another variable of a class that isn't a node) that is null: the structure is empty.
  const owner = /^this\.([\w$]+)$/.exec(because)?.[1];
  const ownerClass = owner && f ? [...c.own.types.values()].find((t) => t.members.some((x) => x.name === owner && !x.method) && binarySimple(f.cls) === t.name) : undefined;
  if (owner && ownerClass && !nodes.has(ownerClass.name))
    return `${start} ${owner} is null while the ${ownerClass.name} is empty: no node has been added yet. Check for it first, as in if (${owner} == null) { ... }, and handle the empty case there (return a value, or throw an exception that says the ${ownerClass.name} is empty).`;
  if (links.length >= 2) {
    const h = f ? methodHeaderAbove(c, f) : null;
    const param = named && /^[\w$]+$/.test(expr) ? expr : h?.params.find((_p, i) => h.types[i]?.replace(/<.*$/, "") === node) ?? "node";
    const base = recursive
      ? ` A recursive method such as ${methodLabel(f)} reaches null at every leaf, so it needs a base case for it at its start: if (${param} == null) { return ...; }.`
      : ` Check for null before using a node: if (${named ? expr : "node"} != null) { ... }.`;
    return `${start} In a tree, null is where a branch ends: a leaf's ${listed(links)} are null.${base}`;
  }
  const link = links[0];
  const loop = `while (node != null) { ...; node = node.${link}; }`;
  const check = named && expr.endsWith(`.${link}`) ? `check ${expr} != null before using ${expr}.${member}${field ? "" : "()"}` : `check that ${named ? expr : "the node"} isn't null before using it`;
  return `${start} In a linked list, null marks the end: the last node's ${link} is null${named && expr.endsWith(`.${link}`) ? "" : ", and so is a variable that has followed it past the last node"}. Code that follows the links must stop there: ${check}, as in ${loop}.`;
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

function explainNull(m: string, c?: CrashContext): string {
  if (c && /^Children: child node is null/.test(m)) return fxNullChild(m, c);
  const fx = c ? fxNull(m, c) : null;
  if (fx) return fx;
  const linked = c ? linkedNull(m, c) : null;
  if (linked) return linked;
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

/**
 * Where the empty text a NumberFormatException got came from, by the learner's line it was thrown
 * on: a text field (getText(), on the line or in the variable the line turns into a number), read in
 * start (always empty: nobody has typed yet) or in a handler; a piece after split; or the input.
 */
function emptyNumberText(c?: CrashContext): string {
  const empty = "The program tried to turn empty text into a number.";
  const input = `${empty} An empty line read with nextLine(), or an empty piece after split, can cause this.`;
  const f = c?.frames[0];
  const line = c ? lineOf(c, f) : null;
  if (!c || !f || !line) return c?.handler ? `${empty} In an event handler, it often comes from an empty text field: getText() gives "" until something is typed.` : input;
  // The variable the line turns into a number (text, parts[0]), and whether the line or that variable's value (or for-each) has a call.
  const arg = /\b(?:valueOf|parse(?:Int|Double|Long))\s*\(\s*([\w$]+)/.exec(line.code)?.[1];
  const lines = c.code.get(f.file) ?? [];
  const has = (call: string) =>
    new RegExp(call).test(line.code) || (!!arg && lines.slice(0, f.line).some((l) => new RegExp(`(?<![\\w$.])${escapeRegExp(arg)}\\s*(?:=(?!=)|:)[^;]*${call}`).test(l)));
  // A piece after split: in a handler too, a field that isn't empty can give one ("1,,2" split at ",").
  if (has("\\.\\s*split\\s*\\(")) return c.handler || c.fx ? `${empty} An empty piece after split can cause this, as when "1,,2" is split at ",": check each piece, or skip the empty ones.` : input;
  const fromField = has("\\bgetText\\s*\\(\\s*\\)");
  if (fromField && c.fx?.stage === "start")
    return `${empty} The text came from a text field, read in start: start runs before the user types anything, so a field read there is always empty (getText() gives "" until something is typed). Read the field in the event handler instead, as in button.setOnAction(e -> { int number = Integer.valueOf(field.getText()); ... }).`;
  if (fromField) return `${empty} The text came from a text field, and getText() gives "" until something is typed. If the field can be empty, check it first, as in if (!text.isEmpty()) { ... }.`;
  if (c.handler) return `${empty} In an event handler, it often comes from an empty text field: getText() gives "" until something is typed.`;
  return input;
}

function explainNumber(m: string, c?: CrashContext): string {
  if (m === "empty String") return emptyNumberText(c);
  const text = /^For input string: "(.*)"(?: under radix \d+)?$/s.exec(m)?.[1];
  if (text == null) return /null/.test(m) ? "The program tried to turn null into a number." : `The program tried to turn text into a number, but the text isn't a number: ${m}.`;
  if (text === "") return emptyNumberText(c);
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
  /** The lines of the learner's files, by path, when their text is known. */
  texts: Map<string, string[]>;
  /** The same lines with comments and strings blanked out (see codeOnly). */
  code: Map<string, string[]>;
  /** JavaFX's launch wrapped it: it was thrown by the application's constructor (of the class cls), init, start or stop. */
  fx?: { stage: "constructor" | "init" | "start" | "stop"; cls?: string };
  /** It escaped a JavaFX event handler: JavaFX printed it and went on, so the program didn't stop (see explainCrash's options). */
  handler?: boolean;
  /** The program's own classes, when the files' text is known. */
  own?: OwnClasses;
};

type Wrapped = {
  /** The exception it's the cause of: the head just before its "Caused by:" (RuntimeException, ExceptionInInitializerError). */
  wrapper: string;
  /** Whether the wrapper's first stack frame is in the learner's files (their code threw it). */
  ownWrapper: boolean;
  /** The exception that stopped the program, the outermost (the same as wrapper in a chain of two). */
  outer: string;
};

/** How a cause stopped the program (or, in an event handler, left it): wrapped in another exception, which nothing caught. */
function wrappedIn(c: CrashContext): string {
  // JavaFX's launch wrapped it: the start of the note (fxWrapped) says so.
  if (c.fx) return "";
  const w = c.cause!;
  const caught = c.handler ? "nothing in the handler caught" : "nothing caught";
  const end = c.handler ? "." : ", so the program stopped.";
  const stopped = w.outer === w.wrapper ? `, and ${caught} that${end}` : `, in turn the cause of ${w.outer}, and ${caught} ${w.outer}${end}`;
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

/** How an uncaught exception ended: the program stopped, or (in a JavaFX event handler) only the handler did. */
const nothingCaught = (c: CrashContext) => (c.handler ? ", and nothing in the handler caught it." : ", and nothing caught it, so the program stopped.");

/** An exception from Java's own code that escaped an event handler, with its message: JavaFX goes on, so nothing stopped. */
const notCaughtInHandler = (m: string) => `Nothing in the handler caught it${m ? `. Its message: ${sentence(m)}` : "."}`;

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
  if (!caller) return c.cause ? `${intro}.${why}${wrapped}` : `${intro}${nothingCaught(c)}${why}`;
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
    // KeyCode's names (LEFT, not LEFT_ARROW): the closest one.
    const fxKey = e === "KeyCode" && !c.own?.types.has("KeyCode");
    const key = fxKey ? keyCodeFor(name.trim()) : null;
    // A name close to no constant ("Fire", "JUMP"): capitals wouldn't help, so the names themselves.
    const keyHint = key ? ` Did you mean ${key.code}? ${KEY_CODE_NAMES}` : fxKey && name.trim() && name.trim() === name ? ` ${KEY_CODE_NAMES}` : "";
    return `${e}.valueOf gives the constant whose name it gets, and ${e} has no constant named "${name}": the name must match exactly, capital letters included.${keyHint || hint}`;
  }
  if (/^Comparison method violates its general contract/.test(m))
    return "Sorting found that the program's compareTo or Comparator gives answers that contradict each other, such as that a comes before b and also that b comes before a. It must give a negative number when the first comes first, 0 when they're equal and a positive number when the second comes first, the same way every time. For numbers, Integer.compare(first, second) or Double.compare(first, second) does that.";
  const bound = badBound(m, c);
  if (bound) return bound;
  const chart = fxChartArgument(m, c) ?? fxColor(m, c) ?? fxImage(m, c);
  if (chart) return chart;
  if (/^Children: duplicate children added/.test(m)) return fxDuplicate(m, c);
  if (/^Children: cycle detected/.test(m)) return fxCycle(m);
  if (/is already set as root of another scene$/.test(m)) return fxRootOfAnother(m, c);
  if (/is already inside a scene-graph and cannot be set as root$/.test(m)) return fxRootInPane(m);
  if (m === "Application launch must not be called more than once")
    return "launch runs a JavaFX program until its windows close, and it can run only once in a program: JavaFX can't start again after that. Call launch once, as the last thing main does.";
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

/**
 * ConcurrentModificationException in an AnimationTimer's handle (the practice JavaFX's frames called
 * it): a game that removes hit objects from a list while a for-each loop or forEach goes through it.
 */
function fxConcurrent(c: CrashContext): string | null {
  if (!c.stack.some((f) => /\barena\.fx\.Frames\.runOne\b/.test(f)) || c.javaFrames.some((f) => /^java\.util\.(?:Linked)?(?:HashMap|TreeMap)\b/.test(f))) return null;
  const line = lineOf(c, c.frames[0]);
  // for (Circle rock : rocks) or rocks.forEach(rock -> ...) on the line the trace points at.
  const each = line && /\bfor\s*\(\s*(?:final\s+)?[\w$.<>?,\s[\]]+?\s+([\w$]+)\s*:\s*((?:this\s*\.\s*)?[\w$]+)\s*\)/.exec(line.code);
  const forEach = line && /((?:this\s*\.\s*)?[\w$]+)\s*\.\s*forEach\s*\(\s*\(?\s*([\w$]+)/.exec(line.code);
  const list = (each?.[2] ?? forEach?.[1])?.replace(/^this\s*\.\s*/, "").replace(/\s+/g, "");
  const item = each?.[1] ?? forEach?.[2] ?? "item";
  const l = list ?? "list";
  const how = each ? "a for-each loop" : forEach ? "forEach" : "a loop";
  return `The game loop's handle went through ${list ?? "a list"} with ${how} and, inside it, removed or added an element of that same list, as a game does when it removes the objects that were hit: a list must not change while a loop goes through it. Change it after going through it, in one of these ways. Give each object an alive flag (a boolean with isAlive and setAlive), set it to false on a hit inside the loop, and after the loop remove the dead ones, ${l}.removeIf(${item} -> !${item}.isAlive()), and take their shapes out of the pane's children too. Or remove the hit ones with removeIf itself, which goes through the list and then removes each one for which its lambda gives true. Or go through a copy of the list, for (... ${item} : new ArrayList<>(${l})), so that removing from ${l} itself doesn't disturb the loop.`;
}

/** SQLException "No suitable driver found for jdbc:h2:./todo": a database address without its driver on the class path (on your own computer: Java Arena's page has no java.sql). */
function noDriver(m: string): string {
  const url = /^No suitable driver found for (\S+)/.exec(m)?.[1];
  if (!url) return `The database said: ${sentence(m)}`;
  const h2 = /^jdbc:h2:/.test(url) ? " For H2, that's the library com.h2database:h2, a dependency in the project's pom.xml (Maven then puts it on the class path)." : "";
  return `DriverManager.getConnection found no database driver for the address ${url}: a driver for that kind of database must be on the class path.${h2} Module 54, "Libraries, Maven and databases", shows how to run a database program on your own computer; Java Arena's page has no database at all.`;
}

/** The line of the learner's code a frame points at, as written and with comments and strings blanked out (see codeOnly), when its file's text is known. */
function lineOf(c: CrashContext, f: Frame | undefined): { text: string; code: string } | null {
  const text = f && c.texts.get(f.file)?.[f.line - 1];
  const code = f && c.code.get(f.file)?.[f.line - 1];
  return text != null && code != null ? { text, code } : null;
}

/** The array accesses on a line of code: each array's name (without this.) and its indexes, such as grid and [y, x] for grid[y][x]. */
function accessesIn(line: string): { name: string; indexes: string[] }[] {
  const out: { name: string; indexes: string[] }[] = [];
  for (const m of line.matchAll(/(?<![\w$.])((?:this\s*\.\s*)?[\w$]+(?:\s*\.\s*[\w$]+)*)\s*\[/g)) {
    if (/\bnew\s*$/.test(line.slice(0, m.index))) continue;
    const indexes: string[] = [];
    let k = m.index + m[0].length - 1;
    while (line[k] === "[") {
      let depth = 0;
      let end = -1;
      for (let j = k; j < line.length && end < 0; j++) {
        if (line[j] === "[") depth++;
        else if (line[j] === "]" && --depth === 0) end = j;
      }
      if (end < 0) break;
      indexes.push(line.slice(k + 1, end).trim());
      k = end + 1;
      while (line[k] === " ") k++;
    }
    if (indexes.length && indexes.every(Boolean)) out.push({ name: m[1].replace(/^this\s*\.\s*/, "").replace(/\s+/g, ""), indexes: indexes.map((x) => x.replace(/\s+/g, " ")) });
  }
  return out;
}

/** The for loop that counts with the variable `v`, the last one whose header is between `from` and `upTo` in the code: its start value, condition and update, without spaces. */
function counterOf(code: string, upTo: number, v: string, from = 0): { start: string; cond: string; update: string } | null {
  const n = escapeRegExp(v);
  let found: { start: string; cond: string; update: string } | null = null;
  for (const m of code.slice(from, upTo).matchAll(new RegExp(`\\bfor\\s*\\(\\s*(?:int|long|short|byte)\\s+${n}\\s*=\\s*([^;]+);([^;]*);([^)]*)\\)`, "g")))
    found = { start: m[1].replace(/\s+/g, ""), cond: m[2].replace(/\s+|this\./g, ""), update: m[3].replace(/\s+/g, "") };
  return found;
}

/** Whether a counting loop's variable starts at 0 or more and only grows. */
const countsUp = (l: { start: string; update: string } | null, v: string) => !!l && /^\d+$/.test(l.start) && new RegExp(`^(?:${escapeRegExp(v)}\\+\\+|\\+\\+${escapeRegExp(v)}|${escapeRegExp(v)}\\+=\\d+)$`).test(l.update);

/** Where a line of a file's code starts, as an offset in its lines joined with line breaks. */
const lineStart = (lines: string[], line: number) => (line > 1 ? lines.slice(0, line - 1).join("\n").length + 1 : 0);

/** The parameters of the method or constructor whose body opens at `open` in the code, from its header: [{ type: "int", name: "count" }]. */
function paramsBefore(code: string, open: number): { type: string; name: string }[] {
  const h = HEADER_END.exec(code.slice(Math.max(0, open - 1000), open));
  return h && !NOT_A_METHOD.test(h[1]) ? declared(h[2]) : [];
}

/** Whether the method or constructor whose body is `body` declares its own variable `name` (a parameter, or a local variable before `upTo`). */
function declaresOwn(code: string, body: [number, number], name: string, upTo: number): boolean {
  const n = escapeRegExp(name);
  const local = new RegExp(`(?<![\\w$.])((?:[\\w$]+\\.)*[\\w$]+(?:\\s*<[^;{}()=]*>)?(?:\\s*\\[\\s*\\])*)\\s+${n}(?![\\w$])(?=\\s*[=;:])`, "g");
  return paramsBefore(code, body[0]).some((p) => p.name === name) || [...code.slice(body[0], upTo).matchAll(local)].some((m) => !/^(?:return|new|throw|else|case|yield|assert|instanceof)$/.test(m[1]));
}

/** The conditions of the while and for loops in a piece of code (a for's second part), as written. */
function loopConditions(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/\b(while|for)\s*\(/g)) {
    const open = m.index + m[0].length - 1;
    const end = pastClose(text, open);
    if (end < 0) continue;
    const inside = text.slice(open + 1, end - 1);
    const cond = m[1] === "for" ? inside.split(";")[1] : inside;
    if (cond != null) out.push(cond);
  }
  return out;
}

/**
 * An index error on a two-dimensional array, grid[y][x]: which index it was (the row, in the first
 * brackets, or the column, in the second) when the code tells, and the length it went past. Null
 * when the line holds no such access, or other arrays too.
 */
function gridIndex(i: number, n: number, c: CrashContext): string | null {
  const f = c.frames[0];
  const line = lineOf(c, f)?.code;
  const lines = f && c.code.get(f.file);
  if (c.library || !f || !line || !lines) return null;
  const distinct = [...new Map(accessesIn(line).map((a) => [`${a.name}[${a.indexes.join("][")}]`, a])).values()];
  if (!distinct.length || distinct.some((a) => a.indexes.length !== 2) || new Set(distinct.map((a) => a.name)).size !== 1) return null;
  const name = distinct[0].name;
  const past = i !== n ? "" : n > 0 ? ` Index ${n} is one past the end: a loop with <= length instead of < length, or one counting down that starts at length, is a common cause.` : ` Index ${n} is one past the end.`;
  const negative = i < 0 ? " Indexes start at 0, so a negative index never works: at the edge of the grid, check that a neighbor is inside the grid (such as y > 0) before reading it." : "";
  if (distinct.length > 1)
    return `The program asked for index ${i} of an array of length ${n}. This line reads ${name} with two indexes, [row][column]: the row index goes from 0 to ${name}.length - 1, and the column index from 0 to ${name}[row].length - 1.${negative || past}`;
  const [row, col] = distinct[0].indexes;
  const code = lines.join("\n");
  const at = lines.slice(0, f.line - 1).join("\n").length;
  const literal = (x: string) => (/^-?\d+$/.test(x) ? Number(x) : null);
  // Loops and the array's creation count only in the method the line is in (another method may use the same names for other things).
  const body = methodBodyAround(code, lineStart(lines, f.line));
  const [rowLoop, colLoop] = [counterOf(code, at, row, body?.[0]), counterOf(code, at, col, body?.[0])];
  const nm = escapeRegExp(name);
  const bound = (l: { cond: string } | null, v: string) => (l ? new RegExp(`^${escapeRegExp(v)}(<=?)(.+)$`).exec(l.cond) : null);
  const [rb, cb] = [bound(rowLoop, row), bound(colLoop, col)];
  const rowsBound = new RegExp(`^${nm}\\.length$`);
  const rowLength = new RegExp(`^${nm}\\[[^\\]]+\\]\\.length$`);
  let canRow = true;
  let canCol = true;
  if (literal(row) != null && literal(row) !== i) canRow = false;
  if (literal(col) != null && literal(col) !== i) canCol = false;
  // A counter that starts at 0 or more and stays below the right length can't be the one.
  if (rb?.[1] === "<" && rowsBound.test(rb[2]) && countsUp(rowLoop, row)) canRow = false;
  if (cb?.[1] === "<" && cb[2] === `${name}[${row.replace(/\s+/g, "")}].length` && countsUp(colLoop, col)) canCol = false;
  if (i < 0 && countsUp(rowLoop, row)) canRow = false;
  if (i < 0 && countsUp(colLoop, col)) canCol = false;
  // Created with sizes written as numbers, such as new int[3][4] (and no row created on its own): the length tells which.
  // The creations of this array: in the method, when the method has its own variable of that name (a parameter or a local one); otherwise outside every method that does (a field's).
  const local = !!body && declaresOwn(code, body, name, at);
  const sizes = [...code.matchAll(new RegExp(`(?<![\\w$.])${nm}\\s*=\\s*new\\s+[\\w$]+\\s*\\[\\s*(\\d+)\\s*\\]\\s*\\[\\s*(\\d+)\\s*\\]`, "g"))].filter((m) => {
    if (local && body) return m.index > body[0] && m.index < at;
    const where = methodBodyAround(code, m.index);
    return !where || !declaresOwn(code, where, name, m.index);
  });
  if (sizes.length === 1 && !new RegExp(`(?<![\\w$.])${nm}\\s*\\[[^\\]]*\\]\\s*=\\s*new\\b`).test(code)) {
    const [rows, cols] = [Number(sizes[0][1]), Number(sizes[0][2])];
    if (rows !== cols && (n === rows) !== (n === cols) && canRow && canCol) [canRow, canCol] = [n === rows, n === cols];
  }
  const swapped = rb && cb && rowLength.test(rb[2]) && rowsBound.test(cb[2]) ? ` The loops' bounds look swapped: ${row}, the row index, counts up to ${rb[2]}, the length of a row, and ${col}, the column index, counts up to ${cb[2]}, the number of rows. Swap them.` : "";
  const access = `${name}[${row}][${col}]`;
  const lessThan = (b: RegExpExecArray | null, v: string) => (b?.[1] === "<=" && i === n ? ` Its loop runs while ${v} <= ${b[2]}: use < instead of <=, since index ${n} is one past the end.` : "");
  const named = (x: string) => (literal(x) != null ? "" : `, ${x},`);
  if (canRow && !canCol) {
    const has = n === 0 ? `${name} has no rows` : `${name} has ${plural(n, "row", "rows")}, so the row index must be from 0 to ${name}.length - 1, here 0 to ${n - 1}`;
    return `In ${access}, the first index${named(row)} picks the row, and it was ${i}: ${has}.${swapped || lessThan(rb, row) || negative || past}`;
  }
  if (canCol && !canRow) {
    const has = n === 0 ? "that row is empty" : `that row has ${plural(n, "value", "values")}, so the column index must be from 0 to ${name}[${row}].length - 1, here 0 to ${n - 1}`;
    return `In ${access}, the second index${named(col)} picks the column (a value in the row), and it was ${i}: ${has}.${swapped || lessThan(cb, col) || negative || past}`;
  }
  return `${access} has two indexes: the first, ${row}, picks a row, from 0 to ${name}.length - 1, and the second, ${col}, picks a value in that row, from 0 to ${name}[${row}].length - 1. One of them was ${i}, and the array it went into has length ${n}.${swapped || negative || past}`;
}

/** An index error on a one-dimensional array that the line puts a value in at a count, as a list of your own does: the array is full. Also a negative index from hashCode(). */
function arrayIndexHint(i: number, n: number, c: CrashContext): string | null {
  const f = c.frames[0];
  const line = lineOf(c, f)?.code;
  if (c.library || !f || !line) return null;
  const all = [...new Map(accessesIn(line).map((a) => [`${a.name}[${a.indexes.join("][")}]`, a])).values()];
  if (all.length !== 1 || all[0].indexes.length !== 1) return null;
  const [{ name, indexes: [index] }] = all;
  const lines = c.code.get(f.file) ?? [];
  if (i < 0 && lines.slice(Math.max(0, f.line - 6), f.line).some((l) => /\bhashCode\s*\(\s*\)/.test(l)))
    return `The program asked for index ${i} of an array of length ${n}, and indexes start at 0. hashCode() can be negative, and so is the remainder % of a negative number: use Math.abs(key.hashCode() % ${name}.length) as the index, as the course's hash map does.`;
  const assigned = new RegExp(`^\\s*(?:this\\s*\\.\\s*)?${escapeRegExp(name)}\\s*\\[[^\\]]*\\]\\s*=(?!=)`).test(line);
  const counter = /^(?:this\s*\.\s*)?([\w$]+)(?:\s*\+\+)?$/.exec(index)?.[1];
  const code = lines.join("\n");
  const body = methodBodyAround(code, lineStart(lines, f.line));
  if (i !== n || n === 0 || !assigned || !counter || counterOf(code, lines.slice(0, f.line - 1).join("\n").length, counter, body?.[0])) return null;
  // A loop in the method that runs while the count is <= something, or up to <= the array's length: one step too far, not a full array (outOfBounds says so).
  const tooFar = new RegExp(`(?<![\\w$.])(?:this\\s*\\.\\s*)?${escapeRegExp(counter)}\\s*<=|<=\\s*(?:this\\s*\\.\\s*)?${escapeRegExp(name)}\\s*\\.\\s*length\\b`);
  if (body && loopConditions(code.slice(body[0], body[1] + 1)).some((cond) => tooFar.test(cond))) return null;
  return `The program put a value at index ${n} of the array ${name}, whose length is ${n} (indexes 0 to ${n - 1}): the array is full. If it keeps the values of a list of your own, make room first: when ${counter} reaches ${name}.length, create a bigger array, copy the values into it, and keep that one, as the course's grow method does.`;
}

function explainArrayIndex(m: string, c: CrashContext): string {
  const b = /^Index (-?\d+) out of bounds for length (\d+)$/.exec(m);
  const [i, n] = b ? [Number(b[1]), Number(b[2])] : [NaN, NaN];
  return (b && (gridIndex(i, n, c) ?? arrayIndexHint(i, n, c))) || (outOfBounds(m, "array") ?? `The program used an array index that doesn't exist. ${m}. Indexes go from 0 to length - 1.`);
}

/** An index error that the learner's code threw itself, as a list of their own does when asked for an index it doesn't have. */
function indexThrown(m: string, c: CrashContext): string {
  const [thrower] = c.frames;
  const who = methodLabel(thrower);
  const caller = c.frames.slice(1).find((f) => !(thrower.method.startsWith("lambda$") && f.method === who));
  const intro = `Your own code threw it on purpose, with the throw in ${who} (${placeOf(thrower)})`;
  const why = m ? ` Its message says why: ${sentence(m)}` : "";
  if (c.cause) return `${intro}.${why}${wrappedIn(c)}`;
  if (!caller) return `${intro}${nothingCaught(c)}${why}`;
  return `${intro}: the call in ${methodLabel(caller)} (${placeOf(caller)}) asked for an index that ${who} doesn't accept.${why} Check the index before that call: it must be 0 or more, and less than the number of values.`;
}

/** NegativeArraySizeException, whose message is the size: "-3". */
function negativeSize(m: string, c: CrashContext): string {
  const size = /^-\d+$/.test(m.trim()) ? ` of size ${m.trim()}` : " with a negative size";
  const [thrower, caller] = c.frames;
  const line = lineOf(c, thrower);
  const made = line ? [...line.code.matchAll(/\bnew\s+[\w$.]+\s*\[/g)].map((x) => ({ index: x.index, array: newArrayAt(line.code.slice(x.index)) })).filter((x) => x.array) : [];
  const what = made.length === 1 && line ? ` (${line.text.slice(made[0].index, made[0].index + made[0].array!.length).trim()})` : "";
  let from = " Check where the size comes from: a calculation such as count - 1, or a number read from the input, can be negative.";
  // The size names a whole-number parameter of the method: then it came from the call.
  const lines = thrower && c.code.get(thrower.file);
  if (thrower && caller && lines && !c.library && thrower.method !== "main" && made.length === 1) {
    const code = lines.join("\n");
    const body = methodBodyAround(code, lineStart(lines, thrower.line) + made[0].index);
    const numbers = body ? paramsBefore(code, body[0]).filter((p) => /^(?:int|long|short|byte|char|Integer|Long|Short|Byte|Character)$/.test(p.type.trim())) : [];
    const sizes = made[0].array!.sizes;
    const param = numbers.find((p) => sizes.some((x) => new RegExp(`(?<![\\w$.])${escapeRegExp(p.name)}(?![\\w$])`).test(x)));
    const via = `${methodLabel(thrower)} (${placeOf(thrower)}) from the call in ${methodLabel(caller)} (${placeOf(caller)})`;
    if (param)
      from = sizes.includes(param.name)
        ? ` The size came to ${via}: check the value it passes.`
        : ` The size is worked out from ${param.name}, which came to ${via}: check the value it passes, and the calculation.`;
  }
  return `The program tried to create an array${size}${what}, and an array's size must be 0 or more.${from}`;
}

/** Arguments of the first call of a method on a line, as written: "list.size()" for random.nextInt(list.size()). */
function argumentsOn(line: { text: string; code: string } | null, method: RegExp): { method: string; args: string } | null {
  if (!line) return null;
  const m = new RegExp(`\\.\\s*(${method.source})\\s*\\(`).exec(line.code);
  if (!m) return null;
  const open = m.index + m[0].length - 1;
  let depth = 0;
  for (let k = open; k < line.code.length; k++) {
    if (line.code[k] === "(") depth++;
    else if (line.code[k] === ")" && --depth === 0) return { method: m[1], args: line.text.slice(open + 1, k).trim() };
  }
  return null;
}

/** IllegalArgumentException from Random (a bound of 0 or less) or from a list or a map created with a negative capacity. */
function badBound(m: string, c: CrashContext): string | null {
  if (!c.library) return null;
  const line = lineOf(c, c.frames[0]);
  const call = argumentsOn(line, /nextInt|nextLong|nextDouble|ints|longs|doubles/);
  const given = call?.args ? ` Here it was ${call.args}` : "";
  if (m === "bound must be positive") {
    const empty = !call?.args ? "" : /\.size\(\)\s*$/.test(call.args) ? ` Here the bound is ${call.args}, so the list was empty: check that it isn't before picking from it.` : /\.length\s*$/.test(call.args) ? ` Here the bound is ${call.args}, so the array was empty: check that it isn't before picking from it.` : ` Here the bound is ${call.args}, which was 0 or less.`;
    return `${call?.method ?? "nextInt"}(bound) gives a random number from 0 up to bound - 1, so the bound must be 1 or more.${empty || " Check the value the program gives it."}`;
  }
  if (m === "bound must be greater than origin") return `${call?.method ?? "nextInt"}(origin, bound) gives a random number from origin up to bound - 1, so bound must be larger than origin.${call?.args ? ` Here the call is ${call.method}(${call.args}), and the bound wasn't larger.` : ""}`;
  if (m === "bound must be finite and positive") return `nextDouble(bound) gives a random number from 0 up to bound (not bound itself), so the bound must be above 0.${given ? `${given}.` : ""}`;
  if (m === "size must be non-negative") return `${call?.method ?? "ints"}(count) gives a stream of count random numbers, so the count can't be negative.${given ? `${given}.` : ""}`;
  const capacity = /^Illegal (?:Capacity|initial capacity): (-\d+)$/.exec(m);
  if (capacity) {
    // The class the program created: the outermost of Java's own constructors before its code (a HashSet makes a HashMap inside, and a Hashtable says "Capacity" as an ArrayList does).
    const made = /^java\.util\.(\w+)\.<init>$/.exec(c.javaFrames.at(-1) ?? "")?.[1];
    const cls = made ?? (/initial/.test(m) ? "HashMap" : "ArrayList");
    const what = /Set$/.test(cls) ? "a set" : /Map$|^Hashtable$/.test(cls) ? "a map" : "a list";
    return `The program created ${what} with the starting capacity ${capacity[1]}. The number in the parentheses of new ${cls}<>(...) is how many values it has room for at first (it grows by itself), so it can't be negative. Leave it out, as in new ${cls}<>(), or check the number.`;
  }
  return null;
}

/** An array type as Java writes it in a ClassCastException, [Ljava.lang.String; or [[I, as code writes it: String[], int[][]. */
function arrayTypeName(descriptor: string): string | null {
  const m = /^(\[+)(?:L([\w$.]+);|([ZBCSIJFD]))$/.exec(descriptor);
  if (!m) return null;
  const primitive: Record<string, string> = { Z: "boolean", B: "byte", C: "char", S: "short", I: "int", J: "long", F: "float", D: "double" };
  return `${m[2] ? binarySimple(m[2]) : primitive[m[3]]}${"[]".repeat(m[1].length)}`;
}

/**
 * A ClassCastException between array types, such as an Object[] (from (T[]) new Object[10]) used as a
 * String[]. `descriptor` is the type it was cast to as Java writes it ([LOwnMap$Node;), and `c` the
 * crash, when the line that threw is known: a cast on that line such as (String[]) new Object[3] failed there.
 */
function arrayCast(from: string, to: string, descriptor: string, c?: CrashContext): string {
  const base = to.replace(/(\[\])+$/, "");
  const line = c ? lineOf(c, c.frames[0]) : null;
  const cast = line && /^Object(\[\])+$/.test(from) ? /\(\s*([\w$.]+)\s*((?:\[\s*\]\s*)+)\)\s*(new\s+Object\s*\[)/.exec(line.code) : null;
  if (line && cast) {
    const x = simple(cast[1]);
    const pairs = cast[2].replace(/\s+/g, "");
    const created = newArrayAt(line.text.slice(cast.index + cast[0].length - cast[3].length));
    const sizes = created ? sizesText(created) : "[...]";
    const all = [...c!.code.values()].map((l) => l.join("\n")).join("\n");
    const intro = `The program created an array of Objects, new Object${sizes}, and cast it to ${x}${pairs}.`;
    if (x === base) {
      // A class inside a generic class: new Node[16] isn't allowed there, but new OwnMap.Node[16] is.
      const outer = /^\[+L(?:[\w$]+\.)*([\w]+)\$[\w$]+;$/.exec(descriptor)?.[1];
      const generic = !!outer && new RegExp(`\\b(?:class|interface|record)\\s+${escapeRegExp(outer)}\\s*<`).test(all) && !new RegExp(`\\bstatic\\b[^;{}()]*\\bclass\\s+${escapeRegExp(x)}\\b`).test(all);
      const create = generic
        ? `new ${outer}.${x}${sizes} (${x} is a class inside the generic class ${outer}, so new ${x}${sizes} on its own isn't allowed: the outer class's name goes in front, and Java then prints a note about unchecked operations, which is fine)`
        : `new ${x}${sizes}`;
      return `${intro} An array keeps the type it was created with, so this one is an Object[], and it can't be used as ${anWord(to)}: Java checks the cast and stops. Create it as ${anWord(to)} from the start: ${create}.`;
    }
    // (T[]) new Object[10] where T has a bound, such as T extends Comparable<T>: T[] is a Comparable[] when the program runs.
    if (new RegExp(`[<,]\\s*${escapeRegExp(x)}\\s+extends\\s+(?:[\\w$]+\\.)*${escapeRegExp(base)}\\b`).test(all))
      return `${intro} ${x} has a bound, ${x} extends ${base}, so when the program runs ${x}${pairs} is ${anWord(to)}, and an array keeps the type it was created with: an Object[] can't be used as ${anWord(to)}, so Java checks the cast and stops. Create an array of ${base} instead: (${x}${pairs}) new ${base}${sizes}.`;
  }
  if (/^Object(\[\])+$/.test(from))
    return `The program used an array of Objects, ${anWord(from)}, as ${anWord(to)}. An array created with (T[]) new Object[...] in a generic class is an Object[], whatever T is: inside the class that works, but when a method gives the array out and the code that called it wants ${anWord(to)}, Java checks and stops. Don't give the array itself out of the class: give one value at a time, as get(index) does, or copy the values into a new ${base}[...] and give that.`;
  return `The program cast ${anWord(from)} to ${anWord(to)}, but an array cast works only when the array really is of that type. Create a new ${to.replace(/\[\]/, "[...]")} and copy the values into it instead.`;
}

/** Each exception's explanation, from its message and what else is known about it (see CrashContext). */
const EXCEPTIONS: [RegExp, (message: string, c: CrashContext) => string][] = [
  [/ArithmeticException$/, (m) => (/by zero/.test(m) ? "The program divided a whole number by zero (or took % 0)." : "A calculation failed.")],
  [/ArrayIndexOutOfBoundsException$/, explainArrayIndex],
  [/StringIndexOutOfBoundsException$/, (m, c) => explainStringIndex(m, c.library, c.javaFrames)],
  [
    /IndexOutOfBoundsException$/,
    (m, c) => {
      const pixel = fxPixel(m, c);
      if (pixel) return pixel;
      const add = /^Index: (-?\d+), Size: (\d+)$/.exec(m);
      if (add) return `The program used index ${add[1]} of a list with ${plural(Number(add[2]), "value", "values")}. Its indexes go from 0 to size() - 1; add(index, value) can also add at index size(), the end.`;
      return outOfBounds(m, "list") ?? `The program asked a list for an index it doesn't have. ${m}. Indexes go from 0 to size() - 1.`;
    },
  ],
  [/NullPointerException$/, explainNull],
  [/NoSuchMethodException$/, noSuchMethod],
  [/NumberFormatException$/, explainNumber],
  [/InputMismatchException$/, () => "The program asked the Scanner for a number, but the next input wasn't one."],
  [/NoSuchElementException$/, (m, c) => explainNoSuchElement(m, c.library, c.javaFrames)],
  [/ClassCastException$/, (m, c) => explainCast(m, c.library, c)],
  [/ConcurrentModificationException$/, (m, c) => fxConcurrent(c) ?? explainConcurrent(m, c.library, c.javaFrames)],
  [/SQLException$/, noDriver],
  [/PatternSyntaxException$/, (m, c) => explainRegex(m, c.library, c.javaFrames, c.more)],
  [/StackOverflowError$/, stackOverflow],
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
  [/NegativeArraySizeException$/, negativeSize],
  [/ArrayStoreException$/, () => "The program put an object of the wrong type into an array."],
  [/ExceptionInInitializerError$/, () => "Setting up a class failed: code in a static field or static block threw an exception."],
  [/IllegalArgumentException$|IllegalStateException$/, explainIllegal],
];

/** An exception without an explanation of its own: one the learner's code threw (such as their own exception class), or another one. */
function uncaught(short: string, m: string, c: CrashContext): string {
  const notApp = /^Error: class ([\w$.]+) is not a subclass of javafx\.application\.Application$/.exec(m);
  if (notApp && c.library) return fxNotApplication(notApp[1], c);
  const [thrower, caller] = c.frames;
  if (c.library || !thrower) return c.handler ? notCaughtInHandler(m) : `The program stopped with ${short}${m ? ": " + m : ""}.`;
  const message = m ? ` Its message: ${sentence(m)}` : "";
  if (c.cause) return `Your own code threw it in ${methodLabel(thrower)} (${placeOf(thrower)}).${message}${wrappedIn(c)}`;
  const handle = caller ? ` To handle it, put the call in ${methodLabel(caller)} (${placeOf(caller)}) inside try { ... } catch (${short} e) { ... }.` : "";
  return `Your own code threw it in ${methodLabel(thrower)} (${placeOf(thrower)})${nothingCaught(c)}${message}${handle}`;
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
    // The JDK's launcher prints this for a main class that extends Application without a usable main
    // (missing, misspelled, not public or not static, or without the String[] parameter): it then
    // looks for real JavaFX, which isn't there. Java Arena's main class is always Main.
    /^Error: JavaFX runtime components are missing, and are required to run this application/,
    () => ({
      exception: "no main method",
      message: "",
      line: null,
      method: null,
      explanation:
        "Java Arena starts every program at public static void main(String[] args), and your Main class extends Application, so it needs one too, with launch(Main.class) in it: public static void main(String[] args) { launch(Main.class); }. Check the spelling of main, and that it is public static void with a String[] parameter. (Real JavaFX started from the module path can start an Application class without main, so some tutorials leave it out; that doesn't work here.)",
    }),
  ],
  [
    /^Error: Could not find or load main class ([\w.$]+)/,
    (m) => ({ exception: "no main class", message: "", line: null, method: null, explanation: `There is no class called ${m[1]} to start. The class with main must be named ${m[1]} (and the file ${m[1].split(".").pop()}.java).${m[1].includes(".") ? "" : ` It is in no package: if ${m[1]}.java starts with a package line, remove it.`}` }),
  ],
];

/**
 * Reads an uncaught exception (or a launcher error, such as a missing main method) from a Java
 * program's stderr and explains it, or null if there is none. `files` are the learner's files,
 * by path ("Main.java", "library/domain/Book.java") or with their text: the reported line is the
 * first stack frame in one of them, and `file` is its path. With the text, an explanation can
 * look at the line, such as which index of grid[y][x] was out of bounds. When the exception has a cause ("Caused by:"), the
 * innermost cause is explained. `handler`: the exception escaped a JavaFX event handler (given here
 * as if it had ended main), so JavaFX printed it and went on: the explanation doesn't say that the
 * program stopped.
 */
export function explainCrash(stderr: string, files: (string | SourceFile)[] = ["Main.java"], options: { handler?: boolean } = {}): Crash | null {
  const sourceFiles = files.map((f) => (typeof f === "string" ? f : f.path));
  const texts = new Map<string, string[]>();
  const code = new Map<string, string[]>();
  for (const f of files) {
    if (typeof f === "string" || f.text.length > 100_000) continue;
    texts.set(f.path, f.text.split("\n"));
    code.set(f.path, codeOnly(f.text).split("\n"));
  }
  const own = ownClasses(files.filter((f): f is SourceFile => typeof f !== "string"));
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
  // JavaFX's launch stopped the program with a RuntimeException around the exception the application's constructor, init, start or stop threw.
  const wrapper = FX_WRAPPER.exec(lines[start].slice('Exception in thread "main" '.length));
  const fx = wrapper && cause ? { stage: (wrapper[1] ?? "constructor") as "constructor" | "init" | "start" | "stop", ...(wrapper[2] ? { cls: binarySimple(wrapper[2]) } : {}) } : undefined;
  const c: CrashContext = { exception, library, frames, stack, javaFrames, more, caller, ...(cause ? { cause } : {}), texts, code, ...(fx ? { fx } : {}), own, ...(options.handler ? { handler: true } : {}) };
  // An index error the learner's code threw with throw, as a list of their own does when asked for an index it doesn't have.
  // The line must throw this exception with throw new (not merely contain a throw whose message reads an array, as in throw new IllegalArgumentException("..." + limits[0])). A throw at the end of the line goes on on the next one.
  const throwLine = lineOf(c, first)?.code ?? "";
  const throwCode = /\bthrow\s*$/.test(throwLine) ? `${throwLine} ${lineOf(c, first && { ...first, line: first.line + 1 })?.code ?? ""}` : throwLine;
  const thrownIndex = !library && !!first && /IndexOutOfBoundsException$/.test(exception) && new RegExp(`\\bthrow\\s+new\\s+(?:[\\w$.]+\\.)?${escapeRegExp(binarySimple(exception))}\\b`).test(throwCode);
  const rule = thrownIndex ? ([/./, indexThrown] as const) : EXCEPTIONS.find(([re]) => re.test(exception));
  // An exception the learner's code threw itself: its explanation names the throw's file, line and method.
  const ownThrow = !library && !!first && (!rule || rule[1] === explainIllegal || rule[1] === indexThrown);
  const explained = rule ? rule[1](message, c) : uncaught(short, message, c);
  // Wrapped by JavaFX's launch: the note starts with what happened and where the cause's line is (and so names the place itself).
  const explanation = fx ? `${fxWrapped(c, ownThrow)} ${explained}` : explained;
  const placed = ownThrow || !!fx;
  return { exception: short, message, file: first?.file, line: first ? first.line : null, method: first ? methodLabel(first) : null, explanation, ...(placed ? { placed } : {}) };
}
