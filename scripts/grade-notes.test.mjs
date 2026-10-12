// Tests of the notes the grader writes about a run (src/grader/grade.ts): an exception that escaped
// a JavaFX event handler or an AnimationTimer's handle (the program went on, so the note mustn't say it stopped), a JavaFX main
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
const { crashOf, describeRun, grade, selfCallingMethod, timeLimitFor } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const notesBundle = await build({ entryPoints: [new URL("../src/grader/notes.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "node", write: false, logLevel: "silent" });
const { notesShown } = await import(`data:text/javascript;base64,${Buffer.from(notesBundle.outputFiles[0].text).toString("base64")}`);

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

test("an exception a chart's list threw while start added to it, printed on the JavaFX Application Thread: JavaFX reported it, not an event handler, and went on", () => {
  const chart = [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.chart.*;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n    public void start(Stage stage) {\n        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());\n        XYChart.Series<Number, Number> s = new XYChart.Series<>();\n        chart.getData().add(s);\n        chart.getData().add(s);\n    }\n}\n" }];
  const listFrames = ["\tat arena.fx.Charts$2.changed(Charts.java:266)", "\tat arena.fx.ObservableArrayList.changed(ObservableArrayList.java:52)", "\tat arena.fx.ObservableArrayList.add(ObservableArrayList.java:95)", "\tat java.base/java.util.AbstractList.add(AbstractList.java:113)"];
  const note = describeRun(handlerRun("java.lang.IllegalArgumentException: Duplicate series added", ...listFrames, "\tat Main.start(Main.java:10)", "\tat arena.fx.Session$Launch$2.run(Session.java:173)", "\tat arena.fx.Session$FxThread.run(Session.java:253)", "\tat java.base/java.lang.Thread.run(Thread.java:1583)"), chart);
  has(note, "JavaFX reported IllegalArgumentException (line 10).", "The program added a series to a chart that already has it", "JavaFX found it while a list it watches changed, such as a chart's list of series, so it printed the exception and went on with the program");
  lacks(note, "An event handler", "stopped");
  // The same exception from a handler's lambda is the handler's.
  const handler = describeRun(handlerRun("java.lang.IllegalArgumentException: Duplicate series added", ...listFrames, "\tat Main.lambda$start$0(Main.java:10)", ...FX_FRAMES), chart);
  has(handler, "An event handler threw IllegalArgumentException (line 10).", "The program added a series to a chart that already has it", "JavaFX printed it and went on with the next click or typing");
});

/** A run whose stderr is a trace the reference JDK printed (Java Arena's JavaFX, one event applied). */
const tracedRun = (stderr) => ({ stdout: "", stderr, output: "", exitCode: 0, timedOut: false, files: {} });

test("a handler that calls a helper, a method reference as the handler, a slider listener that calls a helper: the outermost of the program's frames says it was a handler", () => {
  // A lambda that calls the helper count, which throws.
  const helper = describeRun(tracedRun("Exception in thread \"JavaFX Application Thread\" java.lang.NumberFormatException: For input string: \"abc\"\n\tat java.base/java.lang.NumberFormatException.forInputString(NumberFormatException.java:67)\n\tat java.base/java.lang.Integer.parseInt(Integer.java:662)\n\tat java.base/java.lang.Integer.parseInt(Integer.java:778)\n\tat Main.count(Main.java:20)\n\tat Main.lambda$start$0(Main.java:14)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n\tat arena.fx.Targets.apply(Targets.java:98)\n\tat arena.fx.Session$Replay.apply(Session.java:355)\n\tat arena.fx.Session$Launch$2.run(Session.java:185)\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\n"), [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.control.TextField;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n    private TextField field;\n    @Override\n    public void start(Stage stage) {\n        field = new TextField(\"abc\");\n        Button b = new Button(\"Count\");\n        b.setOnAction(e -> count());\n        stage.setScene(new Scene(new VBox(field, b)));\n        stage.show();\n    }\n\n    private void count() {\n        int n = Integer.parseInt(field.getText());\n        System.out.println(n);\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n" }]);
  has(helper, "An event handler threw NumberFormatException", "JavaFX printed it and went on with the next click or typing");
  lacks(helper, "JavaFX reported", "chart's list");
  // b.setOnAction(this::clicked): the JDK hides the method reference's own frame, so no lambda$ frame at all.
  const reference = describeRun(tracedRun("Exception in thread \"JavaFX Application Thread\" java.lang.NullPointerException: Cannot invoke \"String.length()\" because \"this.name\" is null\n\tat Main.clicked(Main.java:18)\n\tat javafx.scene.control.Button.fire(Button.java:25)\n\tat arena.fx.Targets.apply(Targets.java:98)\n\tat arena.fx.Session$Replay.apply(Session.java:355)\n\tat arena.fx.Session$Launch$2.run(Session.java:185)\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\n"), [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Button;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n    private String name;\n    @Override\n    public void start(Stage stage) {\n        Button b = new Button(\"Count\");\n        b.setOnAction(this::clicked);\n        stage.setScene(new Scene(new VBox(b)));\n        stage.show();\n    }\n\n    private void clicked(javafx.event.ActionEvent e) {\n        System.out.println(name.length());\n    }\n\n    @Override\n    public void stop() {\n        System.out.println(name.length());\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n" }]);
  has(reference, "An event handler threw NullPointerException", "JavaFX printed it and went on with the next click or typing");
  lacks(reference, "JavaFX reported", "chart's list");
  // A slider's listener that calls redraw, which throws.
  const slider = describeRun(tracedRun("Exception in thread \"JavaFX Application Thread\" java.lang.ArrayIndexOutOfBoundsException: Index 25 out of bounds for length 10\n\tat Main.redraw(Main.java:20)\n\tat Main.lambda$start$0(Main.java:13)\n\tat arena.fx.Listeners$Group.fire(Listeners.java:113)\n\tat arena.fx.Listeners.fire(Listeners.java:75)\n\tat arena.fx.OwnedDoubleProperty.set(OwnedDoubleProperty.java:38)\n\tat javafx.scene.control.Slider.setValue(Slider.java:76)\n\tat arena.fx.Targets.slide(Targets.java:185)\n\tat arena.fx.Targets.apply(Targets.java:121)\n\tat arena.fx.Session$Replay.apply(Session.java:355)\n\tat arena.fx.Session$Launch$2.run(Session.java:185)\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\n"), [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.control.Label;\nimport javafx.scene.control.Slider;\nimport javafx.scene.layout.VBox;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n    private Label label = new Label();\n    @Override\n    public void start(Stage stage) {\n        Slider s = new Slider(0, 100, 50);\n        s.valueProperty().addListener((obs, a, b) -> redraw(b.intValue()));\n        stage.setScene(new Scene(new VBox(s, label)));\n        stage.show();\n    }\n\n    private void redraw(int v) {\n        int[] values = new int[10];\n        label.setText(\"\" + values[v]);\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n" }]);
  has(slider, "An event handler threw ArrayIndexOutOfBoundsException", "JavaFX printed it and went on with the next click or typing");
  lacks(slider, "JavaFX reported", "chart's list");
});

test("a series added twice by a lambda inside start, or by a helper start calls: JavaFX reported it, no event handler threw it", () => {
  const inLambda = describeRun(tracedRun("Exception in thread \"JavaFX Application Thread\" java.lang.IllegalArgumentException: Duplicate series added\n\tat arena.fx.Charts$2.changed(Charts.java:266)\n\tat arena.fx.ObservableArrayList.changed(ObservableArrayList.java:52)\n\tat arena.fx.ObservableArrayList.add(ObservableArrayList.java:95)\n\tat java.base/java.util.AbstractList.add(AbstractList.java:113)\n\tat Main.lambda$start$0(Main.java:12)\n\tat java.base/java.lang.Iterable.forEach(Iterable.java:75)\n\tat Main.start(Main.java:12)\n\tat arena.fx.Session$Launch$2.run(Session.java:173)\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\n"), [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.chart.*;\nimport javafx.stage.Stage;\nimport java.util.List;\n\npublic class Main extends Application {\n    @Override\n    public void start(Stage stage) {\n        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());\n        XYChart.Series<Number, Number> s = new XYChart.Series<>();\n        List.of(s, s).forEach(x -> chart.getData().add(x));\n        stage.setScene(new Scene(chart));\n        stage.show();\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n" }]);
  has(inLambda, "JavaFX reported IllegalArgumentException (line 12).", "JavaFX found it while a list it watches changed, such as a chart's list of series");
  lacks(inLambda, "An event handler", "next click or typing");
  const inHelper = describeRun(tracedRun("Exception in thread \"JavaFX Application Thread\" java.lang.IllegalArgumentException: Duplicate series added\n\tat arena.fx.Charts$2.changed(Charts.java:266)\n\tat arena.fx.ObservableArrayList.changed(ObservableArrayList.java:52)\n\tat arena.fx.ObservableArrayList.add(ObservableArrayList.java:95)\n\tat java.base/java.util.AbstractList.add(AbstractList.java:113)\n\tat Main.addTwice(Main.java:19)\n\tat Main.start(Main.java:12)\n\tat arena.fx.Session$Launch$2.run(Session.java:173)\n\tat arena.fx.Session$FxThread.run(Session.java:253)\n\tat java.base/java.lang.Thread.run(Thread.java:1583)\n"), [{ path: "Main.java", text: "import javafx.application.Application;\nimport javafx.scene.Scene;\nimport javafx.scene.chart.*;\nimport javafx.stage.Stage;\n\npublic class Main extends Application {\n    private LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());\n\n    @Override\n    public void start(Stage stage) {\n        XYChart.Series<Number, Number> s = new XYChart.Series<>();\n        addTwice(s);\n        stage.setScene(new Scene(chart));\n        stage.show();\n    }\n\n    private void addTwice(XYChart.Series<Number, Number> s) {\n        chart.getData().add(s);\n        chart.getData().add(s);\n    }\n\n    public static void main(String[] args) {\n        launch(args);\n    }\n}\n" }]);
  has(inHelper, "JavaFX reported IllegalArgumentException (line 19).", "JavaFX found it while a list it watches changed, such as a chart's list of series");
  lacks(inHelper, "An event handler", "next click or typing");
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

test("an exception in an AnimationTimer's handle: the note says the timer's handle threw it and JavaFX went on with the next frame", () => {
  // The reference JDK's trace of a game whose handle removes a rock from the list its for-each loop goes through.
  const sources = [{ path: "Main.java", text: ["import java.util.List;", "import javafx.animation.AnimationTimer;", "import javafx.scene.shape.Circle;", "", "public class Main {", "    void go(List<Circle> rocks) {", "        new AnimationTimer() {", "            @Override", "            public void handle(long now) {", "                for (Circle rock : rocks) {", "                    rocks.remove(rock);", "                }", "            }", "        }.start();", "    }", "}", ""].join("\n") }];
  const run = handlerRun("java.util.ConcurrentModificationException", "\tat java.base/java.util.ArrayList$Itr.checkForComodification(ArrayList.java:1095)", "\tat java.base/java.util.ArrayList$Itr.next(ArrayList.java:1049)", "\tat Main$1.handle(Main.java:10)", "\tat arena.fx.Frames.runOne(Frames.java:88)", "\tat arena.fx.Session.frames(Session.java:413)", "\tat arena.fx.Session$Replay.apply(Session.java:387)", "\tat arena.fx.Session$Launch$2.run(Session.java:192)", "\tat arena.fx.Session$FxThread.run(Session.java:264)", "\tat java.base/java.lang.Thread.run(Thread.java:1583)");
  const note = describeRun(run, sources);
  has(note, "An AnimationTimer's handle threw ConcurrentModificationException (line 10).", "The game loop's handle went through rocks", "JavaFX printed it and went on with the next frame");
  lacks(note, "An event handler", "click or typing", "stopped");
});

// ------------------------------------------------------------------ output over 64 KB

test("output over 64 KB: a method that calls itself is named as a possible cause, next to a loop; without one, the loop note stays", () => {
  const recursive = {
    path: "Main.java",
    text: [
      "public class Main {",
      "    public static void main(String[] args) {",
      "        // countDown(5) is called below",
      '        System.out.println("countDown(");',
      "        countDown(-3);",
      "    }",
      "",
      "    public static void countDown(int seconds) {",
      "        if (seconds == 0) {",
      "            return;",
      "        }",
      "        System.out.println(seconds);",
      "        countDown(seconds - 1);",
      "    }",
      "}",
    ].join("\n"),
  };
  const looping = {
    path: "Main.java",
    text: ["public class Main {", "    public static void main(String[] args) {", "        int i = 0;", "        while (i >= 0) {", "            System.out.println(i);", "            show(i);", "        }", "    }", "", "    static void show(int i) {", '        System.out.println("show(" + i + ")");', "    }", "}"].join("\n"),
  };
  const run = { stdout: "-3\n-4\n", stderr: "", exitCode: null, truncated: true };
  assert.equal(selfCallingMethod([recursive]), "countDown");
  assert.equal(selfCallingMethod([looping]), null);
  assert.equal(selfCallingMethod(["Main.java"]), null);
  has(describeRun(run, [recursive]), "more than 64 KB", "a loop, or a method that keeps calling itself without reaching its base case", "countDown calls itself");
  const plain = describeRun(run, [looping]);
  has(plain, "Probably a loop that never stops printing.");
  lacks(plain, "calls itself");
  has(describeRun(run), "Probably a loop that never stops printing.");
});

// ------------------------------------------------------------------ the same crash under several tests

test("the same crash under several failed tests is explained once; a crash on another line of the same recursion counts as the same; other notes stay", () => {
  const source = {
    path: "Main.java",
    text: ["public class Main {", "    public static void main(String[] args) {", "        System.out.println(heights(40));", "    }", "", "    public static int heights(int height) {", "        int half = height / 2;", "        return 1 + heights(half);", "    }", "}"].join("\n"),
  };
  // HotSpot's StackOverflowError can stop on another line of the same method from one run to the next.
  const overflow = (top) => ({ stdout: "", stderr: ["Exception in thread \"main\" java.lang.StackOverflowError", `\tat Main.heights(Main.java:${top})`, ...Array.from({ length: 40 }, () => "\tat Main.heights(Main.java:8)"), ""].join("\n"), exitCode: 1, timedOut: false });
  const a = crashOf(overflow(8), [source]);
  const b = crashOf(overflow(7), [source]);
  assert.ok(a && b);
  assert.equal(a.key, b.key);
  assert.notEqual(a.text, b.text);
  const given = "Main.java is checked as given, so changes to it don't count here.";
  const tests = [
    { name: "first", pass: false, hidden: true, note: `${given} ${a.text}`, crash: a },
    { name: "passes", pass: true },
    { name: "second", pass: false, note: b.text, crash: b },
    { name: "third", pass: false, note: `${a.text} The window should show 3 buttons.`, crash: a },
    { name: "timeout", pass: false, note: "Time limit: the program ran for more than 10 seconds and was stopped." },
  ];
  const notes = notesShown(tests);
  assert.equal(notes[0], `${given} ${a.text}`);
  assert.equal(notes[1], undefined);
  assert.equal(notes[2], "Crashed the same way as the test above (StackOverflowError, line 7).");
  assert.equal(notes[3], "Crashed the same way as the test above (StackOverflowError, line 8). The window should show 3 buttons.");
  assert.equal(notes[4], tests[4].note);
  // A different crash keeps its own explanation.
  const npe = crashOf({ stdout: "", stderr: 'Exception in thread "main" java.lang.NullPointerException\n\tat Main.main(Main.java:3)\n', exitCode: 1, timedOut: false }, [source]);
  assert.deepEqual(notesShown([{ name: "x", pass: false, note: a.text, crash: a }, { name: "y", pass: false, note: npe.text, crash: npe }]), [a.text, npe.text]);
});

test("grade() keeps the crash with its note, so that the results list can tell crashes that went the same way", async () => {
  globalThis.__gradeNotesRun = () => ({ stdout: "", stderr: 'Exception in thread "main" java.lang.ArithmeticException: / by zero\n\tat Main.main(Main.java:3)\n', output: "", exitCode: 1, timedOut: false, files: {} });
  const code = ["public class Main {", "    public static void main(String[] args) {", "        System.out.println(1 / 0);", "    }", "}"].join("\n");
  const r = await grade({ id: "x", task: "", seed: code, solution: code, tests: [{ name: "one", expect: "1\n" }, { name: "two", expect: "2\n", hidden: true }] }, code);
  assert.equal(r.tests.length, 2);
  assert.ok(r.tests[0].crash && r.tests[0].note.includes(r.tests[0].crash.text));
  assert.equal(r.tests[0].crash.key, r.tests[1].crash.key);
  const notes = notesShown(r.tests);
  assert.equal(notes[0], r.tests[0].note);
  has(notes[1], "Crashed the same way as the test above (ArithmeticException, line 3).");
});
