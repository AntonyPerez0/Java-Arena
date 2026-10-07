// Tests of the notes the grader writes about a run (src/grader/grade.ts): an exception that escaped
// a JavaFX event handler (the program went on, so the note mustn't say it stopped), a JavaFX main
// class without a usable main, and the time limit of a graded JavaFX or JUnit run. The traces are
// the reference JDK's, from a program run with Java Arena's JavaFX and a click on each button. The
// Java engine is replaced by a stand-in that gives a run's result, so grade() runs here without it.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";

/** What the stand-in engine gives each run: set by a test before it calls grade(). */
globalThis.__gradeNotesRun = null;
const engine = {
  name: "engine-stand-in",
  setup(build) {
    build.onResolve({ filter: /\/engine\/client$/ }, () => ({ path: "client", namespace: "stand-in" }));
    build.onLoad({ filter: /.*/, namespace: "stand-in" }, () => ({
      contents: `
        export const DEFAULT_TIME_LIMIT_MS = 10_000;
        export async function compile() { return { ok: true, classes: [], diagnostics: [], output: "", ms: 1 }; }
        export async function runClasses(classes, mainClass, inputs, limitMs, options) { return inputs.map((input) => globalThis.__gradeNotesRun({ input, limitMs, options })); }
      `,
      loader: "js",
    }));
  },
};
// grade.ts is TypeScript that imports other modules: bundle it into one module to import it here.
const bundle = await build({ entryPoints: [new URL("../src/grader/grade.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent", plugins: [engine] });
const { describeRun, grade, timeLimitFor } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const has = (text, ...parts) => {
  for (const p of parts) assert.ok(text?.includes(p), `missing ${JSON.stringify(p)} in: ${text}`);
};
const lacks = (text, ...parts) => {
  for (const p of parts) assert.ok(!text?.includes(p), `${JSON.stringify(p)} shouldn't be in: ${text}`);
};

// ------------------------------------------------------------------ an exception from an event handler

const MAIN = `import java.util.Stack;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Button a = new Button("A");
        a.setOnAction(e -> {
            throw new IllegalStateException("no more clicks");
        });
    }
}
`;
const SOURCES = [{ path: "Main.java", text: MAIN }];

/** The frames under a handler's own: JavaFX's (Java Arena's) call of the handler, on the JavaFX Application Thread. */
const FX_FRAMES = ["\tat javafx.scene.control.Button.fire(Button.java:25)", "\tat arena.fx.Targets.apply(Targets.java:88)", "\tat arena.fx.Session$Replay.apply(Session.java:339)", "\tat arena.fx.Session$Launch$2.run(Session.java:181)", "\tat arena.fx.Session$FxThread.run(Session.java:240)", "\tat java.base/java.lang.Thread.run(Thread.java:1583)"];
const handlerRun = (head, ...rest) => ({ stdout: "", stderr: [`Exception in thread "JavaFX Application Thread" ${head}`, ...rest, ""].join("\n"), output: "", exitCode: 0, timedOut: false, files: {} });

/** The note on a run whose handler threw: it says JavaFX went on, never that the program stopped, and names the line. */
function handlerNote(run, line) {
  const note = describeRun(run, SOURCES);
  has(note, "An event handler threw", "JavaFX printed it and went on with the next click or typing");
  lacks(note, "stopped", "The program stopped");
  assert.match(note, new RegExp(`line ${line}\\b`));
  return note;
}

test("a handler's own throw: the note names the throw's place and says nothing in the handler caught it", () => {
  const note = handlerNote(handlerRun("java.lang.IllegalStateException: no more clicks", "\tat Main.lambda$start$0(Main.java:15)", ...FX_FRAMES), 15);
  has(note, "An event handler threw IllegalStateException.", "with the throw in start (Main.java, line 15), and nothing in the handler caught it.", "Its message says why: no more clicks.");
  const plain = handlerNote(handlerRun("java.lang.RuntimeException: plain", "\tat Main.lambda$start$4(Main.java:36)", ...FX_FRAMES), 36);
  has(plain, "An event handler threw RuntimeException.", "Your own code threw it in start (Main.java, line 36), and nothing in the handler caught it. Its message: plain.");
  // An exception class of the program's own.
  const own = handlerNote(handlerRun("TooMany: count 0", "\tat Main.lambda$start$1(Main.java:19)", ...FX_FRAMES), 19);
  has(own, "An event handler threw TooMany.", "Your own code threw it in start (Main.java, line 19), and nothing in the handler caught it. Its message: count 0.");
});

test("a handler's own throw wrapped in a catch, or while a class is set up: nothing in the handler caught the wrapper", () => {
  const wrapped = handlerNote(
    handlerRun("java.lang.RuntimeException: couldn't add", "\tat Main.lambda$start$2(Main.java:26)", ...FX_FRAMES, "Caused by: java.lang.IllegalArgumentException: negative: -1", "\tat Main.check(Main.java:44)", "\tat Main.lambda$start$2(Main.java:24)", "\t... 6 more"),
    44,
  );
  has(wrapped, "An event handler threw IllegalArgumentException.", "with the throw in check (Main.java, line 44)", "the call in start (Main.java, line 24) passed it", "Your code then threw RuntimeException with it as its cause, and nothing in the handler caught that.");
  const setUp = handlerNote(
    handlerRun("java.lang.ExceptionInInitializerError", "\tat Main.lambda$start$5(Main.java:39)", ...FX_FRAMES, "Caused by: java.lang.IllegalArgumentException: negative limit: -1", "\tat Config.check(Main.java:66)", "\tat Config.<clinit>(Main.java:62)", "\t... 7 more"),
    66,
  );
  has(setUp, "This happened while Java set up the class Config", "so Java threw ExceptionInInitializerError with it as its cause, and nothing in the handler caught that.");
});

test("an exception from Java's own code in a handler, with no rule of its own: the handler's line, and nothing caught it there", () => {
  const note = handlerNote(handlerRun("java.util.EmptyStackException", "\tat java.base/java.util.Stack.peek(Stack.java:103)", "\tat java.base/java.util.Stack.pop(Stack.java:85)", "\tat Main.lambda$start$3(Main.java:32)", ...FX_FRAMES), 32);
  assert.equal(note, "An event handler threw EmptyStackException (line 32). Nothing in the handler caught it. JavaFX printed it and went on with the next click or typing, as it does, so the window shows what the handler had done before it.");
});

test("the same exceptions ending main still say that the program stopped", () => {
  const crash = (head, ...rest) => ({ stdout: "", stderr: [`Exception in thread "main" ${head}`, ...rest, ""].join("\n"), output: "", exitCode: 1, timedOut: false, files: {} });
  has(describeRun(crash("java.lang.RuntimeException: plain", "\tat Main.main(Main.java:36)"), SOURCES), "and nothing caught it, so the program stopped.");
  has(describeRun(crash("java.util.EmptyStackException", "\tat java.base/java.util.Stack.peek(Stack.java:103)", "\tat java.base/java.util.Stack.pop(Stack.java:85)", "\tat Main.main(Main.java:32)"), SOURCES), "The program stopped with EmptyStackException.");
});

// ------------------------------------------------------------------ a JavaFX main class without main

test("a Main that extends Application without a usable main: the program didn't start, and main with launch(Main.class) is what it needs", () => {
  const note = describeRun({ stdout: "", stderr: "Error: JavaFX runtime components are missing, and are required to run this application\n", output: "", exitCode: 1, timedOut: false, files: {} }, SOURCES);
  has(note, "The program didn't start.", "public static void main(String[] args) { launch(Main.class); }", "Check the spelling of main, and that it is public static void with a String[] parameter", "from the module path");
  lacks(note, "System.exit", "crashed");
});

// ------------------------------------------------------------------ the time limit of a graded run

const TIMED_OUT = { stdout: "", stderr: "", output: "", exitCode: null, timedOut: true, files: {} };
const exercise = (tests, solution = MAIN) => ({ kind: "code", seed: solution, solution, tests });

test("a graded JavaFX run that hits its time limit: the note gives its 15 seconds, and the window check says it was stopped", async () => {
  assert.equal(timeLimitFor(["javafx"]), 15_000);
  const limits = [];
  globalThis.__gradeNotesRun = ({ limitMs }) => (limits.push(limitMs), TIMED_OUT);
  const r = await grade(exercise([{ name: "Test 1", events: ['click Button "A"'], outline: 'Window "A"', expect: "" }]), MAIN);
  assert.deepEqual(limits, [15_000]);
  const [t] = r.tests;
  assert.equal(t.pass, false);
  has(t.note, "Time limit: the program ran for more than 15 seconds and was stopped.");
  assert.equal(t.window.missing, true);
  assert.equal(t.window.stopped, true);
  // A run that ended by itself without a window isn't "stopped".
  globalThis.__gradeNotesRun = () => ({ stdout: "", stderr: "", output: "", exitCode: 0, timedOut: false, files: {} });
  const none = await grade(exercise([{ name: "Test 1", events: [], outline: 'Window "A"', expect: "" }]), MAIN);
  assert.equal(none.tests[0].window.missing, true);
  assert.equal(none.tests[0].window.stopped, undefined);
});

test("a graded run of a program that uses JUnit gets 30 seconds, and its note says so", async () => {
  const code = "import org.junit.Test;\n\npublic class Main {\n    public static void main(String[] args) {\n        while (true) {\n        }\n    }\n}\n";
  const limits = [];
  globalThis.__gradeNotesRun = ({ limitMs }) => (limits.push(limitMs), TIMED_OUT);
  const r = await grade(exercise([{ name: "Test 1", expect: "" }], code), code);
  assert.deepEqual(limits, [30_000]);
  has(r.tests[0].note, "more than 30 seconds");
});
