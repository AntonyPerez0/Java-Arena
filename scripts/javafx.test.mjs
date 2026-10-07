// Tests of Java Arena's practice version of JavaFX (engine/libraries/javafx, built into
// engine/dist/libraries/javafx.bin) and of how the site decides a program uses it.
//
// The library is Java, so its event list (.arena/events.txt: the parser, the targets and the
// problems), its window JSON and its lifecycle are tested by running small programs on the
// reference JDK (JAVA_HOME, or scripts/get-jdk.sh) against the built archive, the same class files
// the browser engine loads, through the launcher the reference build uses. The fidelity suite
// (program 48) checks that the browser engine gives the same bytes. Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, join } from "node:path";
import { EVENTS_FILE, JAVAFX_LIBRARY, WINDOW_FILE, isArenaFile, usesJavaFX, withoutArenaFiles } from "../src/grader/javafx.js";
import { librariesFor } from "../src/grader/libraries.js";
import { changedFiles, dataPathProblem } from "../src/grader/writes.js";
import { REFERENCE_JVM_FLAGS, referenceJavaHome } from "./fidelity/suite.mjs";
import { javaRunArgs, LAUNCHER_CLASS, LAUNCHER_KEY } from "./javafx/reference.mjs";
import { libraryDir } from "./libraries.mjs";

// ------------------------------------------------------------------ the site's side (JavaScript)

const file = (text, path = "Main.java") => ({ path, text });

test("a program uses JavaFX when a file mentions javafx. (an import or a full name)", () => {
  assert.equal(usesJavaFX([file("import javafx.application.Application;\n")]), true);
  assert.equal(usesJavaFX([file("public class Main {}\n"), file("class View extends javafx.scene.layout.VBox {}\n", "View.java")]), true);
  assert.equal(usesJavaFX([file("import javafx . scene . control . Button;\n")]), true);
  assert.equal(usesJavaFX([file('public class Main { String myjavafx = "x"; }\n')]), false);
  assert.equal(usesJavaFX([file("public class Main { int javafx = 1; }\n")]), false);
});

test("javafx. in a comment or a string doesn't make a program a JavaFX program", () => {
  const main = (body) => [file(`public class Main {\n    public static void main(String[] args) {\n        ${body}\n    }\n}\n`)];
  assert.equal(usesJavaFX(main('System.out.println("Real JavaFX is in javafx.scene.control");')), false);
  assert.equal(usesJavaFX(main("// javafx.scene.control.Button comes later")), false);
  assert.equal(usesJavaFX(main("/* import javafx.stage.Stage; */")), false);
  assert.equal(usesJavaFX(main('String text = """\n            javafx.application\n            """;')), false);
  assert.equal(usesJavaFX(main("char c = '.'; String s = \"javafx\" + c;")), false);
  assert.equal(usesJavaFX(main('String quoted = "say \\"javafx.\\" twice";')), false);
  assert.deepEqual(librariesFor(main('System.out.println("javafx.scene");')), []);
  // Real uses still count, also after a comment with an apostrophe or a string with a quote.
  assert.equal(usesJavaFX([file("import javafx.scene.control.Button; // don't forget the import\n")]), true);
  assert.equal(usesJavaFX(main("char q = '\"'; javafx.application.Application.launch(App.class);")), true);
  assert.equal(usesJavaFX([file("// a comment\nimport javafx.stage.Stage;\n")]), true);
});

test("librariesFor puts JUnit and JavaFX on the class path when a program uses them", () => {
  assert.deepEqual(librariesFor([file("public class Main {}\n")]), []);
  assert.deepEqual(librariesFor([file("import javafx.stage.Stage;\n")]), [JAVAFX_LIBRARY]);
  assert.deepEqual(librariesFor([file("import org.junit.Test;\n")]), ["junit4"]);
  assert.deepEqual(librariesFor([file("import org.junit.Test;\nimport javafx.scene.control.Label;\n")]), ["junit4", JAVAFX_LIBRARY]);
});

test("files in .arena/ are Java Arena's own: never shown as written, never usable as test files", () => {
  assert.equal(isArenaFile(WINDOW_FILE), true);
  assert.equal(isArenaFile(EVENTS_FILE), true);
  assert.equal(isArenaFile(".arena"), true);
  assert.equal(isArenaFile("arena/x.txt"), false);
  assert.equal(isArenaFile("notes/.arena/x.txt"), false);
  assert.deepEqual(withoutArenaFiles({ "a.txt": "1", ".arena/window.json": "{}", ".arena/events.txt": "close\n" }), { "a.txt": "1" });
  assert.equal(withoutArenaFiles(undefined), undefined);
  // A free run lists the files a program wrote; the window file isn't one of them.
  assert.deepEqual(changedFiles({ ".arena/events.txt": "close\n" }, { ".arena/events.txt": "close\n", ".arena/window.json": "{}", "out.txt": "hi\n" }), [{ name: "out.txt", text: "hi\n" }]);
  // A test can't give or check a file there.
  assert.match(dataPathProblem(".arena/events.txt"), /folder Java Arena keeps for itself/);
  assert.match(dataPathProblem(".arena/window.json"), /folder Java Arena keeps for itself/);
  assert.equal(dataPathProblem("arena.txt"), null);
});

// ------------------------------------------------------------------ the library (Java, on the reference JDK)

const javaHome = referenceJavaHome();
const env = { ...process.env, LC_ALL: "C.UTF-8" };
delete env.JAVA_TOOL_OPTIONS;
const IMPORTS = ["javafx.application.*", "javafx.beans.property.*", "javafx.beans.value.*", "javafx.collections.*", "javafx.event.*", "javafx.geometry.*", "javafx.scene.*", "javafx.scene.control.*", "javafx.scene.layout.*", "javafx.scene.text.*", "javafx.stage.*", "java.util.*"]
  .map((p) => `import ${p};`)
  .join("\n");

/**
 * The programs, each its own package (p<N>), compiled together and run one JVM each. `events` is
 * the text of .arena/events.txt (none when undefined); `main` is the main class in the package.
 */
const programs = [];
function program(name, source, { events, args = [], main = "Main" } = {}) {
  const id = `p${programs.length + 1}`;
  const p = { id, name, source: `package ${id};\n${IMPORTS}\n${source}`, events, args, main: `${id}.${main}`, result: null };
  programs.push(p);
  return p;
}

const tmp = mkdtempSync(join(tmpdir(), "java-arena-javafx-test-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));

function run(p, classPath) {
  return new Promise((resolve) => {
    const cwd = join(tmp, "work", p.id);
    mkdirSync(cwd, { recursive: true });
    if (p.events !== undefined) {
      mkdirSync(join(cwd, ".arena"), { recursive: true });
      writeFileSync(join(cwd, EVENTS_FILE), p.events);
    }
    const child = spawn(join(javaHome, "bin", "java"), [...REFERENCE_JVM_FLAGS, ...javaRunArgs({ javaHome, libraries: [JAVAFX_LIBRARY], classPath, mainClass: p.main, args: p.args })], { cwd, env });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d) => (stderr += d));
    const timer = setTimeout(() => child.kill("SIGKILL"), 60_000);
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const windowFile = join(cwd, WINDOW_FILE);
      const json = existsSync(windowFile) ? readFileSync(windowFile, "utf8") : null;
      resolve({ stdout, stderr, exitCode, json, window: json && JSON.parse(json) });
    });
  });
}

/** Compiles every program (once, when the first test needs them: all are defined by then) and runs each. */
let ready = null;
const runAll = () =>
  (ready ??= (async () => {
  const src = join(tmp, "src");
  for (const p of programs) {
    mkdirSync(join(src, p.id), { recursive: true });
    writeFileSync(join(src, p.id, "Main.java"), p.source);
  }
  const lib = libraryDir(JAVAFX_LIBRARY);
  const classes = join(tmp, "classes");
  const r = spawnSync(join(javaHome, "bin", "javac"), ["-encoding", "UTF-8", "-d", classes, "-cp", lib, ...programs.map((p) => join(src, p.id, "Main.java"))], { env, encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const classPath = [classes, lib].join(delimiter);
  // A few JVMs at a time.
  const queue = [...programs];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const p = queue.shift();
        p.result = await run(p, classPath);
      }
    }),
  );
  })());

const COUNTER = `
public class Main extends Application {
    private int clicks;

    @Override
    public void start(Stage stage) {
        Label label = new Label("Clicks: 0");
        Button add = new Button("Add");
        Button reset = new Button("Reset");
        TextField name = new TextField();
        name.setPromptText("Your name");
        name.textProperty().addListener((obs, old, now) -> System.out.println("name " + old + " -> " + now));
        add.setOnAction(e -> label.setText("Clicks: " + ++clicks));
        reset.setOnAction(e -> label.setText("Clicks: " + (clicks = 0)));
        name.setOnAction(e -> System.out.println("enter: " + ((TextField) e.getSource()).getText()));
        VBox root = new VBox(10, label, new HBox(5, add, reset), name);
        root.setPadding(new Insets(10));
        stage.setTitle("Counter");
        stage.setScene(new Scene(root, 300, 200));
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop " + clicks);
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
    }
}
`;

const counter = program("counter", COUNTER, { events: '// a comment\n\nclick Button "Add"\r\nclick #4\r\ntype TextField 1 "Ab"\nset TextField 1 "Grace \\"G\\" H\\u00e4"\nenter TextField 1\n' });
test("the window JSON after clicks, typing (one character at a time), set and enter", async () => {
  await runAll();
  const r = counter.result;
  assert.equal(r.stderr, "");
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, 'name  -> A\nname A -> Ab\nname Ab -> Grace "G" Hä\nenter: Grace "G" Hä\nstop 2\nlaunch returned\n');
  assert.equal(
    r.json,
    '{"windows":[{"title":"Counter","scene":{"width":300.0,"height":200.0,"root":{"n":1,"type":"VBox","padding":[10.0,10.0,10.0,10.0],"spacing":10.0,"children":[' +
      '{"n":2,"type":"Label","text":"Clicks: 2"},{"n":3,"type":"HBox","spacing":5.0,"children":[{"n":4,"type":"Button","text":"Add","onAction":true},{"n":5,"type":"Button","text":"Reset","onAction":true}]},' +
      '{"n":6,"type":"TextField","text":"Grace \\"G\\" H\\u00e4","promptText":"Your name","onAction":true}]}}}],"problems":[]}',
  );
});

const noEvents = program("no events", COUNTER);
const emptyEvents = program("empty events", COUNTER, { events: "" });
test("without events (no file, or an empty one) the window is the one start built", async () => {
  await runAll();
  assert.equal(noEvents.result.json, emptyEvents.result.json);
  assert.equal(noEvents.result.window.windows[0].scene.root.children[0].text, "Clicks: 0");
  assert.deepEqual(noEvents.result.window.problems, []);
  assert.equal(noEvents.result.stdout, "stop 0\nlaunch returned\n");
});

const problems = program("problems", COUNTER, {
  events: [
    'click Button "Nope"',
    'type TextField 2 "x"',
    "type TextField 0 \"x\"",
    'click Label "Clicks: 0"',
    "click #3",
    "type #2 \"x\"",
    "enter #4",
    "click #99",
    "click #0",
    'click #nothing',
    'click #a.b',
    'click Buton "Add"',
    "click Button",
    'type TextField "x"',
    "type TextField 1",
    'click "Add"',
    "click",
    "Click #4",
    "jump #4",
    'type TextField 1 "open',
    'type TextField 1 "bad \\q"',
    'type TextField 1 "bad \\u12"',
    'click #4 "extra"',
    "close now",
    'click VBox "x"',
    "click HBox 3",
    'click Button "Add"',
  ].join("\n"),
});
test("events that can't happen are skipped, each with a problem in plain English", async () => {
  await runAll();
  const r = problems.result;
  assert.equal(r.stderr, "");
  assert.deepEqual(r.window.problems, [
    'click Button "Nope": there\'s no button with the text "Nope"',
    'type TextField 2 "x": there\'s only 1 text field',
    'type TextField 0 "x": the count starts at 1: TextField 1 is the first text field',
    'click Label "Clicks: 0": a label can\'t be clicked (only buttons can)',
    "click #3: an HBox can't be clicked (only buttons can)",
    "type #2 \"x\": you can't type in a label (only in text fields and text areas)",
    "enter #4: Enter can be pressed only in a text field, not in a button",
    "click #99: there's no node #99 (the open window has 6)",
    "click #0: the nodes are numbered from 1",
    'click #nothing: there\'s no node with the id "nothing"',
    "click #a.b: #a.b is neither a node number (such as #3) nor an id (such as #addButton)",
    "click Buton \"Add\": Buton isn't a JavaFX class that Java Arena knows (use Button, Label, TextField, PasswordField, TextArea or a pane such as VBox)",
    'click Button: say which button: Button "its text", or Button 1 for the first one',
    'type TextField "x": say which text field (TextField 1 for the first one, or TextField "its text"), then the text in double quotes',
    'type TextField 1: type needs the text in double quotes after the target, such as type TextField 1 "Ada"',
    'click "Add": the target comes before the text: a class and which one, such as click Button "OK"',
    'click: click needs a target, such as click Button "OK"',
    "Click #4: write the event in small letters: click",
    "jump #4: there's no event called jump (the events are click, type, set, enter and close)",
    'type TextField 1 "open: the text has no closing double quote',
    'type TextField 1 "bad \\q": \\q isn\'t an escape Java knows (use \\" \\\\ \\n \\t or \\uXXXX)',
    'type TextField 1 "bad \\u12": \\u must be followed by four hexadecimal digits, such as \\u00e4',
    'click #4 "extra": there\'s something extra at the end of the line',
    "close now: close takes nothing after it",
    'click VBox "x": there\'s no VBox with the text "x"',
    "click HBox 3: there's only 1 HBox",
  ]);
  // The one event that could happen did.
  assert.equal(r.window.windows[0].scene.root.children[0].text, "Clicks: 1");
});

const targets = program(
  "targets",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        BorderPane root = new BorderPane();
        root.setBottom(new Label("bottom"));
        root.setCenter(new Label("center"));
        root.setTop(new Label("top"));
        GridPane grid = new GridPane();
        for (String text : new String[] { "b", "a", "d", "c" }) {
            Button b = new Button(text);
            b.setOnAction(e -> System.out.println("clicked " + ((Button) e.getSource()).getText()));
            int i = text.charAt(0) - 'a';
            grid.add(b, i % 2, i / 2);
        }
        root.setLeft(grid);
        Button mine = new Button("mine") {
        };
        mine.setId("my-button");
        mine.setOnAction(e -> System.out.println("clicked mine"));
        root.setRight(new VBox(mine, new PasswordField(), new TextField()));
        stage.setScene(new Scene(root));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: 'click #4\nclick #5\nclick Button 3\nclick Button "d"\nclick #my-button\nclick ButtonBase 5\ntype TextField 1 "s"\ntype TextField 2 "p"\ntype PasswordField 1 "q"\nset TextInputControl 2 "r"\nclick Labeled "a"\nclick Control 1\n' },
);
test("targets: #N and Type K count in outline order (BorderPane: top, left, center, right, bottom; GridPane: by row, then column); a subclass counts as its JavaFX class", async () => {
  await runAll();
  const r = targets.result;
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, "clicked a\nclicked b\nclicked c\nclicked d\nclicked mine\nclicked mine\nclicked a\n");
  const root = r.window.windows[0].scene.root;
  assert.deepEqual(Object.keys(root), ["n", "type", "top", "left", "center", "right", "bottom"]);
  assert.deepEqual([root.top.n, root.left.n, root.center.n, root.right.n, root.bottom.n], [2, 3, 8, 9, 13]);
  assert.deepEqual(
    root.left.children.map((c) => [c.n, c.text, c.column, c.row]),
    [
      [4, "a", 0, 0],
      [5, "b", 1, 0],
      [6, "c", 0, 1],
      [7, "d", 1, 1],
    ],
  );
  // The anonymous subclass of Button is a Button; a PasswordField is also a TextField (TextField 1).
  assert.deepEqual(
    root.right.children.map((c) => [c.n, c.type, c.text]),
    [
      [10, "Button", "mine"],
      [11, "PasswordField", "sq"],
      [12, "TextField", "r"],
    ],
  );
  assert.deepEqual(r.window.problems, ["click Control 1: a label can't be clicked (only buttons can)"]);
});

const disabled = program(
  "disabled and hidden",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Button off = new Button("Off");
        off.setDisable(true);
        off.setOnAction(e -> System.out.println("Off ran"));
        Button inner = new Button("Inner");
        inner.setOnAction(e -> System.out.println("Inner ran"));
        HBox offBox = new HBox(inner);
        offBox.setDisable(true);
        Button hidden = new Button("Hidden");
        hidden.setVisible(false);
        Button deep = new Button("Deep");
        VBox hiddenBox = new VBox(deep);
        hiddenBox.setVisible(false);
        TextField offField = new TextField();
        offField.setDisable(true);
        offField.setOnAction(e -> System.out.println("offField ran"));
        TextField fixed = new TextField("fixed");
        fixed.setEditable(false);
        fixed.setOnAction(e -> System.out.println("Enter works in a field that isn't editable"));
        TextField inOff = new TextField();
        VBox offFields = new VBox(inOff);
        offFields.setDisable(true);
        stage.setScene(new Scene(new VBox(off, offBox, hidden, hiddenBox, offField, fixed, offFields)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: 'click Button "Off"\nclick Button "Inner"\nclick Button "Hidden"\nclick Button "Deep"\ntype TextField 1 "x"\nset TextField 2 "x"\ntype TextField 3 "x"\nenter TextField 1\nenter TextField 2\n' },
);
test("a disabled button or field does nothing (as fire() does in JavaFX); hidden ones, and typing where it can't be done, are problems", async () => {
  await runAll();
  const r = disabled.result;
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, "Enter works in a field that isn't editable\n");
  assert.deepEqual(r.window.problems, [
    'click Button "Hidden": the button is hidden (setVisible(false)), so it can\'t be clicked',
    'click Button "Deep": the button is in a hidden pane (setVisible(false)), so it can\'t be clicked',
    'type TextField 1 "x": the text field is disabled (setDisable(true)), so you can\'t type in it',
    'set TextField 2 "x": the text field isn\'t editable (setEditable(false)), so you can\'t type in it',
    'type TextField 3 "x": the text field is in a disabled pane (setDisable(true)), so you can\'t type in it',
  ]);
  const kids = r.window.windows[0].scene.root.children;
  assert.deepEqual(kids.map((k) => [k.type, k.disable ?? false, k.visible ?? true, k.editable ?? true]), [
    ["Button", true, true, true],
    ["HBox", true, true, true],
    ["Button", false, false, true],
    ["VBox", false, false, true],
    ["TextField", true, true, true],
    ["TextField", false, true, false],
    ["VBox", true, true, true],
  ]);
});

const exitInHandler = program(
  "Platform.exit in a handler",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Button quit = new Button("Quit");
        quit.setOnAction(e -> {
            Platform.runLater(() -> System.out.println("queued before exit"));
            Platform.exit();
            Platform.runLater(() -> System.out.println("queued after exit"));
            System.out.println("handler went on after exit");
        });
        Button more = new Button("More");
        more.setOnAction(e -> System.out.println("more"));
        stage.setScene(new Scene(new HBox(quit, more)));
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop");
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
        Platform.runLater(() -> System.out.println("never"));
        Platform.exit();
    }
}
`,
  { events: 'click Button "More"\nclick Button "Quit"\nclick Button "More"\nclick Button "Nope"\njump\n' },
);
test("Platform.exit() ends the session: later events are ignored (with no problems), queued tasks still run, then stop() once", async () => {
  await runAll();
  const r = exitInHandler.result;
  assert.equal(r.stderr, "");
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, "more\nhandler went on after exit\nqueued before exit\nqueued after exit\nstop\nlaunch returned\n");
  assert.equal(r.json, '{"windows":[],"closed":true,"problems":[]}');
});

const closeEvents = program(
  "close and the last window",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Button swap = new Button("Swap");
        swap.setOnAction(e -> {
            Stage other = new Stage();
            other.setTitle("Other");
            Button done = new Button("Done");
            done.setOnAction(d -> {
                other.close();
                Platform.runLater(() -> System.out.println("runs before the session ends"));
            });
            other.setScene(new Scene(new VBox(new Label("other"), done)));
            stage.close();
            other.show();
            System.out.println("closed the main window, showed another");
        });
        stage.setTitle("Main");
        stage.setScene(new Scene(new VBox(swap)));
        stage.show();
    }

    @Override
    public void stop() {
        System.out.println("stop");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: 'click Button "Swap"\nclose\nclick Button "Done"\nclick Button "Swap"\n' },
);
const closeOnly = program("close", COUNTER, { events: 'click Button "Add"\nclose\nclick Button "Add"\n' });
test("close closes the main window; the session ends when no window is left (after the tasks queued), and later events are ignored", async () => {
  await runAll();
  assert.equal(closeOnly.result.json, '{"windows":[],"closed":true,"problems":[]}');
  assert.equal(closeOnly.result.stdout, "stop 1\nlaunch returned\n");
  const r = closeEvents.result;
  assert.equal(r.stderr, "");
  assert.equal(r.stdout, "closed the main window, showed another\nruns before the session ends\nstop\n");
  assert.equal(r.json, '{"windows":[],"closed":true,"problems":["close: the main window isn\'t open"]}');
});

const secondWindow = program(
  "two windows",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Stage later = new Stage();
        later.setTitle("Shown first, made second");
        later.setScene(new Scene(new VBox(new Label("b"))));
        Stage blank = new Stage();
        blank.show();
        later.show();
        stage.setScene(new Scene(new VBox(new Label("a"))));
        stage.show();
        Stage hiddenAgain = new Stage();
        hiddenAgain.show();
        hiddenAgain.hide();
        System.out.println("blank " + blank.getTitle() + " " + blank.getScene() + " " + blank.getWidth());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: "click #2\n" },
);
test("windows: the main one first, then in the order they were first shown; a stage without a scene or title; #N counts across windows", async () => {
  await runAll();
  const r = secondWindow.result;
  assert.equal(r.stdout, "blank null null NaN\n");
  assert.equal(
    r.json,
    '{"windows":[{"title":null,"scene":{"root":{"n":1,"type":"VBox","children":[{"n":2,"type":"Label","text":"a"}]}}},{"title":null,"scene":null},{"title":"Shown first, made second","scene":{"root":{"n":3,"type":"VBox","children":[{"n":4,"type":"Label","text":"b"}]}}}],"problems":["click #2: a label can\'t be clicked (only buttons can)"]}',
  );
});

const fields = program(
  "every field of the window JSON",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label a = new Label("A\\u00e9\\u4e16\\uD83D\\uDE00\\t\\"q\\"\\\\");
        a.setId("a");
        a.setFont(Font.font("Serif", 18));
        a.setStyle("-fx-text-fill: red");
        a.setWrapText(true);
        a.setPrefWidth(120);
        a.setPadding(new Insets(1, 2, 3, 4));
        Label same = new Label();
        same.setFont(new Font(13));
        same.setPrefSize(Region.USE_COMPUTED_SIZE, Double.NaN);
        TextArea area = new TextArea("one\\ntwo");
        area.setWrapText(true);
        area.setPromptText("notes");
        area.setEditable(false);
        area.setFont(Font.font(20));
        StackPane stack = new StackPane(new Label("s"));
        StackPane stackLeft = new StackPane();
        stackLeft.setAlignment(Pos.TOP_LEFT);
        FlowPane flow = new FlowPane(3, 0);
        flow.setAlignment(Pos.CENTER);
        GridPane grid = new GridPane();
        grid.setVgap(2);
        grid.add(new Label("wide"), 1, 0, 3, 1);
        grid.add(new Label("tall"), 0, 0, 1, 2);
        Label loose = new Label("loose");
        grid.getChildren().add(loose);
        HBox row = new HBox();
        row.setAlignment(null);
        Pane plain = new Pane(new Region());
        VBox root = new VBox(-1.5, a, same, area, stack, stackLeft, flow, grid, row, plain);
        stage.setScene(new Scene(root, 1e10, 0));
        stage.setWidth(Double.POSITIVE_INFINITY);
        stage.setTitle("T\\u00e4");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("the window JSON: fields only when not the default, in a fixed order; ASCII only; NaN and the infinities as strings", async () => {
  await runAll();
  const r = fields.result;
  assert.equal(r.stderr, "");
  assert.equal(
    r.json,
    '{"windows":[{"title":"T\\u00e4","width":"Infinity","scene":{"width":1.0E10,"height":0.0,"root":{"n":1,"type":"VBox","spacing":-1.5,"children":[' +
      '{"n":2,"type":"Label","id":"a","text":"A\\u00e9\\u4e16\\ud83d\\ude00\\t\\"q\\"\\\\","wrapText":true,"font":{"family":"Serif","size":18.0},"style":"-fx-text-fill: red","prefWidth":120.0,"padding":[1.0,2.0,3.0,4.0]},' +
      '{"n":3,"type":"Label","text":"","prefHeight":"NaN"},' +
      '{"n":4,"type":"TextArea","text":"one\\ntwo","promptText":"notes","editable":false,"wrapText":true,"font":{"family":"System","size":20.0}},' +
      '{"n":5,"type":"StackPane","children":[{"n":6,"type":"Label","text":"s"}]},' +
      '{"n":7,"type":"StackPane","alignment":"TOP_LEFT","children":[]},' +
      '{"n":8,"type":"FlowPane","hgap":3.0,"alignment":"CENTER","children":[]},' +
      '{"n":9,"type":"GridPane","vgap":2.0,"children":[{"n":10,"type":"Label","column":0,"row":0,"rowSpan":2,"text":"tall"},{"n":11,"type":"Label","column":0,"row":0,"text":"loose"},{"n":12,"type":"Label","column":1,"row":0,"columnSpan":3,"text":"wide"}]},' +
      '{"n":13,"type":"HBox","alignment":null,"children":[]},' +
      '{"n":14,"type":"Pane","children":[{"n":15,"type":"Region"}]}]}}}],"problems":[]}',
  );
});

const handlerException = program(
  "an exception in a handler",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Button bad = new Button("Bad");
        bad.setOnAction(e -> {
            throw new IllegalStateException("boom");
        });
        Button good = new Button("Good");
        good.setOnAction(e -> {
            System.out.println("good");
            Platform.runLater(() -> {
                throw new IllegalArgumentException("task boom");
            });
            Platform.runLater(() -> System.out.println("next task"));
        });
        TextField field = new TextField();
        field.textProperty().addListener((o, old, now) -> {
            throw new UnsupportedOperationException("listener " + now);
        });
        field.textProperty().addListener((o, old, now) -> System.out.println("second listener " + now));
        stage.setScene(new Scene(new VBox(bad, good, field)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
    }
}
`,
  { events: 'click Button "Bad"\nclick Button "Good"\ntype TextField 1 "x"\n' },
);
test("an exception from a handler, a runLater task or a listener is printed as the thread's uncaught exception, and the session goes on", async () => {
  await runAll();
  const r = handlerException.result;
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, "good\nnext task\nsecond listener x\nlaunch returned\n");
  const heads = r.stderr.split("\n").filter((l) => !l.startsWith("\tat "));
  assert.deepEqual(heads, [
    'Exception in thread "JavaFX Application Thread" java.lang.IllegalStateException: boom',
    'Exception in thread "JavaFX Application Thread" java.lang.IllegalArgumentException: task boom',
    'Exception in thread "JavaFX Application Thread" java.lang.UnsupportedOperationException: listener x',
    "",
  ]);
  assert.match(r.stderr, /^Exception in thread "JavaFX Application Thread" java\.lang\.IllegalStateException: boom\n\tat p\d+\.Main\.lambda\$start\$0\(Main\.java:\d+\)\n\tat javafx\.scene\.control\.Button\.fire\(Button\.java:\d+\)\n/);
  assert.equal(r.window.windows[0].scene.root.children[2].text, "x");
});

const startFails = program(
  "start throws",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        stage.show();
        Platform.runLater(() -> System.out.println("task queued in start"));
        throw new IllegalStateException("start boom");
    }

    @Override
    public void stop() {
        System.out.println("stop");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: "close\n" },
);
test("an exception in start: JavaFX's line on stderr, stop() still runs, launch throws it as the cause, no window is written", async () => {
  await runAll();
  const r = startFails.result;
  assert.equal(r.exitCode, 1);
  assert.equal(r.stdout, "task queued in start\nstop\n");
  assert.equal(r.json, null);
  const lines = r.stderr.split("\n");
  assert.equal(lines[0], "Exception in Application start method");
  assert.equal(lines[1], 'Exception in thread "main" java.lang.RuntimeException: Exception in Application start method');
  assert.ok(lines.includes("Caused by: java.lang.IllegalStateException: start boom"), r.stderr);
  assert.match(r.stderr, /Caused by: java\.lang\.IllegalStateException: start boom\n\tat p\d+\.Main\.start\(Main\.java:\d+\)\n/);
});

const constructorFails = program(
  "the constructor throws",
  `
public class Main extends Application {
    public Main() {
        System.out.println("constructor on " + Thread.currentThread().getName());
        throw new IllegalStateException("constructor boom");
    }

    @Override
    public void start(Stage stage) {
        System.out.println("never");
    }

    public static void main(String[] args) {
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println(e.getMessage() + " / " + e.getCause() + " / " + e.getCause().getCause());
        }
    }
}
`,
);
const noConstructor = program(
  "no public constructor",
  `
public class Main extends Application {
    public Main(int x) {
    }

    @Override
    public void start(Stage stage) {
    }

    public static void main(String[] args) {
        try {
            launch(Main.class);
        } catch (RuntimeException e) {
            System.out.println(e.getMessage() + " / " + e.getCause());
        }
    }
}
`,
);
const initFails = program(
  "init throws",
  `
public class Main extends Application {
    @Override
    public void init() {
        throw new IllegalStateException("init boom");
    }

    @Override
    public void start(Stage stage) {
        System.out.println("never");
    }

    @Override
    public void stop() {
        System.out.println("never either");
    }

    public static void main(String[] args) {
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println(e.getMessage() + " / " + e.getCause());
        }
    }
}
`,
);
test("a failing constructor or init: JavaFX's messages, and start and stop aren't called", async () => {
  await runAll();
  assert.equal(constructorFails.result.stderr, "Exception in Application constructor\n");
  assert.match(constructorFails.result.stdout, /^constructor on JavaFX Application Thread\nUnable to construct Application instance: class p\d+\.Main \/ java\.lang\.reflect\.InvocationTargetException \/ java\.lang\.IllegalStateException: constructor boom\n$/);
  assert.equal(noConstructor.result.stderr, "Exception in Application constructor\n");
  assert.match(noConstructor.result.stdout, /^Unable to construct Application instance: class p\d+\.Main \/ java\.lang\.NoSuchMethodException: p\d+\.Main\.<init>\(\)\n$/);
  assert.equal(initFails.result.stderr, "Exception in Application init method\n");
  assert.equal(initFails.result.stdout, "Exception in Application init method / java.lang.IllegalStateException: init boom\n");
  assert.equal(initFails.result.json, null);
});

const launchRules = program(
  "launch rules",
  `
public class Main extends Application {
    @Override
    public void init() {
        System.out.println("init on " + Thread.currentThread().getName() + ", FX thread " + Platform.isFxApplicationThread());
        try {
            new Stage();
        } catch (IllegalStateException e) {
            System.out.println("new Stage in init: " + e.getMessage());
        }
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start on " + Thread.currentThread().getName() + ", FX thread " + Platform.isFxApplicationThread());
        try {
            launch(Main.class);
        } catch (IllegalStateException e) {
            System.out.println("launch in start: " + e.getMessage());
        }
        Thread t = new Thread(() -> {
            try {
                stage.show();
            } catch (IllegalStateException e) {
                System.out.println("show on another thread: " + e.getMessage());
            }
        }, "worker");
        t.start();
        try {
            t.join();
        } catch (InterruptedException e) {
            throw new RuntimeException(e);
        }
    }

    @Override
    public void stop() {
        System.out.println("stop on " + Thread.currentThread().getName());
    }

    public static void main(String[] args) {
        System.out.println("main: FX thread " + Platform.isFxApplicationThread());
        try {
            Platform.runLater(() -> System.out.println("never"));
        } catch (IllegalStateException e) {
            System.out.println("runLater before launch: " + e.getMessage());
        }
        Other.go();
        launch(args);
        try {
            launch(args);
        } catch (IllegalStateException e) {
            System.out.println("launch again: " + e.getMessage());
        }
    }
}

class Other {
    static void go() {
        try {
            Application.launch();
        } catch (RuntimeException e) {
            System.out.println(e.getMessage());
        }
    }
}
`,
);
const exitFirst = program(
  "Platform.exit before launch",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        System.out.println("never");
    }

    public static void main(String[] args) {
        Platform.exit();
        try {
            launch(args);
        } catch (IllegalStateException e) {
            System.out.println(e.getMessage());
        }
    }
}
`,
);
const exitInInit = program(
  "Platform.exit in init",
  `
public class Main extends Application {
    @Override
    public void init() {
        Platform.exit();
    }

    @Override
    public void start(Stage stage) {
        System.out.println("never");
    }

    @Override
    public void stop() {
        System.out.println("never either");
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
    }
}
`,
);
test("threads and launch rules: init on JavaFX-Launcher, start and stop on the JavaFX Application Thread, launch once, windows only on that thread", async () => {
  await runAll();
  assert.equal(launchRules.result.stderr, "");
  assert.match(
    launchRules.result.stdout,
    /^main: FX thread false\nrunLater before launch: Toolkit not initialized\nError: class p\d+\.Other is not a subclass of javafx\.application\.Application\ninit on JavaFX-Launcher, FX thread false\nnew Stage in init: Not on FX application thread; currentThread = JavaFX-Launcher\nstart on JavaFX Application Thread, FX thread true\nlaunch in start: Application launch must not be called on the JavaFX Application Thread\nshow on another thread: Not on FX application thread; currentThread = worker\nstop on JavaFX Application Thread\nlaunch again: Application launch must not be called more than once\n$/,
  );
  assert.equal(exitFirst.result.stdout, "Platform.exit has been called\n");
  assert.equal(exitInInit.result.stdout, "launch returned\n");
  assert.equal(exitInInit.result.json, '{"windows":[],"closed":true,"problems":[]}');
});

const children = program(
  "children lists",
  `
public class Main extends Application {
    static String texts(List<Node> nodes) {
        StringBuilder sb = new StringBuilder();
        for (Node n : nodes) {
            sb.append(((Labeled) n).getText());
        }
        return sb.toString();
    }

    static void attempt(String what, Runnable r) {
        try {
            r.run();
            System.out.println(what + ": fine");
        } catch (RuntimeException e) {
            String m = String.valueOf(e.getMessage()).replaceAll("@[0-9a-f]+", "@HASH");
            System.out.println(what + ": " + e.getClass().getSimpleName() + ": " + (m.contains(": parent = ") ? m.substring(0, m.indexOf(": parent = ")) : m));
        }
    }

    @Override
    public void start(Stage stage) {
        VBox box = new VBox();
        Label a = new Label("a");
        Label b = new Label("b");
        Label c = new Label("c");
        box.getChildren().addAll(a, b);
        attempt("duplicate", () -> box.getChildren().add(a));
        attempt("duplicate in one call", () -> box.getChildren().addAll(c, c));
        attempt("null", () -> box.getChildren().addAll(c, null));
        System.out.println("after refused calls: " + texts(box.getChildren()) + ", c's parent " + c.getParent());
        attempt("cycle", () -> {
            HBox inner = new HBox();
            box.getChildren().add(inner);
            inner.getChildren().add(box);
        });
        attempt("itself", () -> box.getChildren().add(box));
        attempt("set to another child", () -> box.getChildren().set(0, b));
        attempt("set the same", () -> box.getChildren().set(0, a));
        attempt("setAll swapping", () -> box.getChildren().setAll(b, a));
        System.out.println("box: " + box.getChildren().size() + " children");
        HBox other = new HBox(c);
        box.getChildren().add(1, c);
        System.out.println("moved c: other has " + other.getChildren().size() + ", c in box " + (c.getParent() == box));
        box.getChildren().remove(0, 2);
        Iterator<Node> it = box.getChildren().iterator();
        it.next();
        it.remove();
        System.out.println("after remove(0, 2) and an iterator remove: " + box.getChildren().size() + ", b's parent " + b.getParent());
        attempt("clear an empty unmodifiable list", () -> box.getChildrenUnmodifiable().clear());
        attempt("setAll on an unmodifiable list", () -> box.getChildrenUnmodifiable().setAll());

        BorderPane border = new BorderPane(new Label("C"), new Label("T"), new Label("R"), new Label("B"), new Label("L"));
        System.out.println("border children " + texts(border.getChildren()));
        attempt("clear an unmodifiable list", () -> border.getChildrenUnmodifiable().clear());
        Label t2 = new Label("T2");
        border.setTop(t2);
        new VBox(border.getRight());
        border.getChildren().remove(border.getBottom());
        System.out.println("border: top " + ((Label) border.getTop()).getText() + ", right " + border.getRight() + ", bottom " + border.getBottom() + ", children " + texts(border.getChildren()));
        attempt("same node in two regions", () -> border.setLeft(t2));

        GridPane grid = new GridPane();
        Label g = new Label("g");
        grid.add(g, 2, 3);
        new VBox(g);
        System.out.println("grid constraints stay: " + GridPane.getColumnIndex(g) + ", " + GridPane.getRowIndex(g) + "; unset " + GridPane.getColumnIndex(a));
        attempt("negative row", () -> grid.add(new Label(), -1, -1));
        attempt("span 0", () -> grid.add(new Label(), 0, 0, 0, 1));

        Scene scene = new Scene(box);
        attempt("root of two scenes", () -> new Scene(box));
        HBox child = new HBox();
        new VBox(child);
        attempt("a child as a root", () -> new Scene(child));
        attempt("null root", () -> scene.setRoot(null));
        attempt("null root in the constructor", () -> new Scene(null));
        System.out.println("scene of a child: " + (a.getScene() == null) + ", of the root " + (box.getScene() == scene) + ", stage " + stage.getScene());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("children lists follow JavaFX's rules: no null, no node twice, no cycles; a node added elsewhere leaves its old parent; BorderPane and GridPane keep track", async () => {
  await runAll();
  const r = children.result;
  assert.equal(r.stderr, "");
  assert.equal(
    r.stdout,
    [
      "duplicate: IllegalArgumentException: Children: duplicate children added",
      "duplicate in one call: IllegalArgumentException: Children: duplicate children added",
      "null: NullPointerException: Children: child node is null",
      "after refused calls: ab, c's parent null",
      "cycle: IllegalArgumentException: Children: cycle detected",
      "itself: IllegalArgumentException: Children: cycle detected",
      "set to another child: IllegalArgumentException: Children: duplicate children added",
      "set the same: fine",
      "setAll swapping: fine",
      "box: 2 children",
      "moved c: other has 0, c in box true",
      "after remove(0, 2) and an iterator remove: 0, b's parent null",
      "clear an empty unmodifiable list: fine",
      "setAll on an unmodifiable list: UnsupportedOperationException: null",
      "border children CTRBL",
      "clear an unmodifiable list: UnsupportedOperationException: null",
      "border: top T2, right null, bottom null, children CLT2",
      "same node in two regions: IllegalArgumentException: Children: duplicate children added",
      "grid constraints stay: 2, 3; unset null",
      "negative row: IllegalArgumentException: rowIndex must be greater or equal to 0, but was -1",
      "span 0: IllegalArgumentException: columnSpan must be greater or equal to 1, but was 0",
      "root of two scenes: IllegalArgumentException: VBox@HASH[styleClass=root]is already set as root of another scene",
      "a child as a root: IllegalArgumentException: HBox@HASHis already inside a scene-graph and cannot be set as root",
      "null root: NullPointerException: Scene's root cannot be null",
      "null root in the constructor: NullPointerException: Root cannot be null",
      "scene of a child: true, of the root true, stage null",
      "",
    ].join("\n"),
  );
});

const texts = program(
  "text inputs and properties",
  `
public class Main extends Application {
    static String show(String s) {
        return s == null ? "null" : "[" + s.replace("\\n", "\\\\n").replace("\\t", "\\\\t") + "]";
    }

    @Override
    public void start(Stage stage) {
        TextField field = new TextField("a\\tb\\nc\\u0001d\\u007fe");
        TextArea area = new TextArea("a\\tb\\nc\\r\\nd\\u0001");
        PasswordField secret = new PasswordField();
        secret.setText("p\\nw");
        System.out.println("field " + show(field.getText()) + ", area " + show(area.getText()) + ", password " + show(secret.getText()));
        field.textProperty().addListener((o, old, now) -> System.out.println("field " + show(old) + " -> " + show(now) + (o == field.textProperty() ? "" : " (another observable)")));
        field.setText("abcde");
        field.setText("abcde");
        field.appendText("");
        field.appendText("\\n");
        field.setText(null);
        System.out.println("null: " + show(field.getText()) + ", length " + field.getLength());
        field.appendText("x");
        field.textProperty().set("y\\tz");
        field.textProperty().setValue("w");
        field.clear();
        field.clear();
        Label label = new Label("l");
        label.textProperty().addListener((o, old, now) -> System.out.println("label " + show(old) + " -> " + show(now)));
        label.setText("tab\\there");
        label.setText(null);
        System.out.println("label keeps control characters; text property " + new Label("x").textProperty().toString().replaceAll("@[0-9a-f]+", "@HASH"));
        ChangeListener<String> twice = (o, old, now) -> System.out.println("twice " + now);
        SimpleStringProperty p = new SimpleStringProperty();
        System.out.println("simple " + p + ", " + p.get());
        p.addListener(twice);
        p.addListener(twice);
        p.set("one");
        p.removeListener(twice);
        p.set("two");
        p.removeListener(twice);
        p.set("three");
        System.out.println("prompt [" + new TextField().getPromptText() + "], editable " + new TextArea().isEditable() + ", wrap " + new TextArea().isWrapText() + ", font " + new TextField().getFont());
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("text inputs drop the characters JavaFX drops; listeners hear only real changes, in order, as often as they were added", async () => {
  await runAll();
  const r = texts.result;
  assert.equal(r.stderr, "");
  assert.equal(
    r.stdout,
    [
      "field [abcde], area [a\\tb\\nc\\nd], password [pw]",
      "field [abcde] -> null",
      "null: null, length 0",
      "field null -> [x]",
      "field [x] -> [yz]",
      "field [yz] -> [w]",
      "field [w] -> []",
      "label [l] -> [tab\\there]",
      "label [tab\\there] -> null",
      "label keeps control characters; text property StringProperty [bean: Label@HASH[styleClass=label]'x', name: text, value: x]",
      "simple StringProperty [value: null], null",
      "twice one",
      "twice one",
      "twice two",
      "prompt [], editable true, wrap false, font Font[name=System Regular, family=System, style=Regular, size=13.0]",
      "",
    ].join("\n"),
  );
  // A stage shown without a scene.
  assert.equal(r.json, '{"windows":[{"title":null,"scene":null}],"problems":[]}');
});

// What real OpenJFX 21 prints for these (scripts/fx-check/probes/14-properties has the same cases).
const nestedChanges = program(
  "listeners that change the value again",
  `
public class Main extends Application {
    static void removesItself(int count) {
        SimpleStringProperty p = new SimpleStringProperty("a");
        p.addListener(new ChangeListener<String>() {
            @Override
            public void changed(ObservableValue<? extends String> obs, String old, String now) {
                System.out.println("W1 " + old + " -> " + now);
                p.removeListener(this);
                p.set("c");
            }
        });
        for (int i = 2; i <= count; i++) {
            String name = "W" + i;
            p.addListener((obs, old, now) -> System.out.println(name + " " + old + " -> " + now));
        }
        p.set("b");
    }

    @Override
    public void start(Stage stage) {
        SimpleStringProperty back = new SimpleStringProperty("x");
        back.addListener((obs, old, now) -> {
            System.out.println("B1 " + old + " -> " + now);
            if (!now.equals("x")) {
                back.set("x");
            }
        });
        back.addListener((obs, old, now) -> System.out.println("B2 " + old + " -> " + now));
        back.set("y");
        SimpleStringProperty quiet = new SimpleStringProperty("s");
        ChangeListener<String> hear = (obs, old, now) -> System.out.println("quiet " + old + " -> " + now);
        quiet.addListener(hear);
        quiet.removeListener(hear);
        quiet.set("t");
        quiet.addListener(hear);
        quiet.set("t");
        quiet.set("u");
        removesItself(2);
        removesItself(3);
        TextField digits = new TextField();
        Label length = new Label("0");
        digits.textProperty().addListener((obs, old, now) -> {
            if (!now.matches("\\\\d*")) {
                digits.setText(old);
            }
        });
        digits.textProperty().addListener((obs, old, now) -> {
            System.out.println("length hears [" + old + "] -> [" + now + "]");
            length.setText("" + now.length());
        });
        stage.setScene(new Scene(new VBox(digits, length)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: 'set TextField 1 "7x"\ntype TextField 1 "12a"\n' },
);
test("a listener that changes the value again: every listener hears the new change at once, and the later ones the earlier change with the newest value, as JavaFX's ExpressionHelper does", async () => {
  await runAll();
  const r = nestedChanges.result;
  assert.equal(r.stderr, "");
  assert.equal(
    r.stdout,
    [
      // B1 sets the old value back: the listeners hear that change inside B1's call, then B2 hears the first change with the value as it is now.
      "B1 x -> y",
      "B1 y -> x",
      "B2 y -> x",
      "B2 x -> x",
      // A listener added while nobody listened starts from the value as it is then.
      "quiet t -> u",
      // With two listeners, removing one gives the other a list of its own (as JavaFX's helper does), so the round that's running keeps its value.
      "W1 a -> b",
      "W2 b -> c",
      "W2 a -> b",
      "W1 a -> b",
      "W2 b -> c",
      "W3 b -> c",
      "W2 a -> c",
      "W3 a -> c",
      // A text field that keeps only digits: the label shows the length of the text it keeps.
      "length hears [7x] -> []",
      "length hears [] -> []",
      "length hears [] -> [1]",
      "length hears [1] -> [12]",
      "length hears [12a] -> [12]",
      "length hears [12] -> [12]",
      "",
    ].join("\n"),
  );
  assert.equal(r.json, '{"windows":[{"title":null,"scene":{"root":{"n":1,"type":"VBox","children":[{"n":2,"type":"TextField","text":"12"},{"n":3,"type":"Label","text":"2"}]}}}],"problems":[]}');
});

const parameters = program(
  "parameters",
  `
public class Main extends Application {
    public Main() {
        System.out.println("in the constructor: " + getParameters());
    }

    @Override
    public void start(Stage stage) {
        Parameters p = getParameters();
        System.out.println(p.getRaw() + " " + p.getNamed() + " " + p.getUnnamed());
        try {
            p.getRaw().add("x");
        } catch (UnsupportedOperationException e) {
            System.out.println("can't change them");
        }
    }

    public static void main(String[] args) {
        launch(Main.class, "--b=1", "--a=2", "-c=3", "--d", "--=e", "--f=", "--g=h=i", "--a=4", "plain", null, "--1=j", "---k=1", "--_l=m", "--$=n");
    }
}
`,
);
test("parameters: --key=value is named when the key starts with a letter or _ (a key's last value wins), everything else unnamed, null left out, as in JavaFX", async () => {
  await runAll();
  assert.equal(parameters.result.stdout, "in the constructor: null\n[--b=1, --a=2, -c=3, --d, --=e, --f=, --g=h=i, --a=4, plain, --1=j, ---k=1, --_l=m, --$=n] {a=4, b=1, f=, g=h=i, _l=m} [-c=3, --d, --=e, plain, --1=j, ---k=1, --$=n]\ncan't change them\n");
});

const crash = program(
  "an uncaught exception in main",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
    }

    public static void main(String[] args) {
        try {
            Integer.parseInt("x");
        } catch (NumberFormatException e) {
            StackTraceElement[] trace = e.getStackTrace();
            System.out.println("caught, last frame " + trace[trace.length - 1].getClassName() + "." + trace[trace.length - 1].getMethodName());
        }
        System.out.println(new Throwable().getStackTrace().length + " frame below main");
        fail();
    }

    static void fail() {
        throw new IllegalStateException("from main");
    }
}
`,
);
const noMain = program(
  "no main method",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
    }
}
`,
);
const staticInit = program(
  "a failing static initializer",
  `
public class Main extends Application {
    static int x = Integer.parseInt("not a number");

    @Override
    public void start(Stage stage) {
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("the reference JDK runs a program through the launcher as java Main would: the same traces (no launcher frames), messages and exit codes", async () => {
  await runAll();
  assert.equal(LAUNCHER_CLASS, "arena.reference.JavaFxLauncher");
  assert.match(crash.result.stdout, /^caught, last frame p\d+\.Main\.main\n1 frame below main\n$/);
  assert.match(crash.result.stderr, /^Exception in thread "main" java\.lang\.IllegalStateException: from main\n\tat p\d+\.Main\.fail\(Main\.java:\d+\)\n\tat p\d+\.Main\.main\(Main\.java:\d+\)\n$/);
  assert.equal(crash.result.exitCode, 1);
  // Without a main method, the JDK's launcher looks for JavaFX's own launcher, as java Main does with JavaFX on the class path.
  assert.equal(noMain.result.stderr, "Error: JavaFX runtime components are missing, and are required to run this application\n");
  assert.equal(noMain.result.exitCode, 1);
  assert.match(staticInit.result.stderr, /^Exception in thread "main" java\.lang\.ExceptionInInitializerError\nCaused by: java\.lang\.NumberFormatException: For input string: "not a number"\n(\tat java\.base\/.*\n)+\tat p\d+\.Main\.<clinit>\(Main\.java:\d+\)\n$/);
  assert.equal(staticInit.result.exitCode, 1);
});

test("the launcher's key (in the content build's cache key of a JavaFX run) is made from the launcher's source and reference.mjs, not from javaRunArgs (whose paths are temporary)", () => {
  const source = (name) => readFileSync(new URL(`./javafx/${name}`, import.meta.url));
  assert.equal(LAUNCHER_KEY, createHash("sha256").update(source("JavaFxLauncher.java")).update(source("reference.mjs")).digest("hex").slice(0, 16));
});

// Behavior the check against real OpenJFX 21 (scripts/fx-check) found: real JavaFX prints the same
// (its probes cover it), except for a font family the computer doesn't have.
const asReal = program(
  "as on real JavaFX",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        System.out.println(Font.font("Serif", 20) + " | " + Font.font("serif", 20).getName() + " | " + Font.font("Dialog", 9).getFamily() + " | " + Font.font("DialogInput", 9).getFamily() + " | " + Font.font("sans-serif", 9).getFamily() + " | " + Font.font("monospace", 9).getFamily());
        System.out.println(new Font("Serif Bold", 18) + " | " + new Font("system bold italic", 18).getName() + " | " + new Font("Serif", 18).getName() + " | " + new Font("Serif Light", 18).getName() + " | " + Font.font("System Bold", 18).getName());
        System.out.println(Font.font("Arial", 18).getName() + " " + new Font("Arial", 18).getFamily() + " " + Font.font("Serif", 20).equals(new Font("Serif Regular", 20)) + " " + Font.font("Serif", 20).hashCode() + " " + Font.font("Serif", -1).getSize());
        VBox box = new VBox(new Label("a"));
        for (Runnable change : new Runnable[] { () -> box.getChildren().add(5, null), () -> box.getChildren().addAll(-1, List.of()), () -> box.getChildren().remove(1, 0) }) {
            try {
                change.run();
            } catch (RuntimeException e) {
                System.out.println(e);
            }
        }
        Platform.runLater(null);
        Platform.runLater(() -> System.out.println("the next task still runs"));
        System.out.println("a thread made in start: " + new Thread(() -> { }).getName());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("as on real OpenJFX 21: JavaFX's own font families and full names, the children list's index checks first, runLater(null) fails later, thread numbers", async () => {
  await runAll();
  const r = asReal.result;
  assert.equal(
    r.stdout,
    [
      "Font[name=Serif Regular, family=Serif, style=Regular, size=20.0] | Serif Regular | SansSerif | Monospaced | SansSerif | Monospaced",
      "Font[name=Serif Bold, family=Serif, style=Bold, size=18.0] | System Bold Italic | System Regular | System Regular | System Regular",
      // A family that isn't JavaFX's own is kept as asked (real JavaFX: as asked where the computer has it, else System).
      "Arial Arial true -1307695287 13.0",
      "java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 2",
      "java.lang.IndexOutOfBoundsException: Index -1 out of bounds for length 2",
      "java.lang.IndexOutOfBoundsException: Range [1, 0) out of bounds for length 1",
      // JavaFX's launcher and application threads are made without a name, so they took Thread-0 and Thread-1.
      "a thread made in start: Thread-2",
      "the next task still runs",
      "",
    ].join("\n"),
  );
  assert.match(r.stderr, /^Exception in thread "JavaFX Application Thread" java\.lang\.NullPointerException: Cannot invoke "java\.lang\.Runnable\.run\(\)" because "<parameter1>" is null\n\tat /);
});
