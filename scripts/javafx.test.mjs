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
import { crc32, deflateSync } from "node:zlib";
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
const IMPORTS = ["javafx.application.*", "javafx.beans.property.*", "javafx.beans.value.*", "javafx.collections.*", "javafx.event.*", "javafx.geometry.*", "javafx.scene.*", "javafx.scene.canvas.*", "javafx.scene.chart.*", "javafx.scene.control.*", "javafx.scene.image.*", "javafx.scene.input.*", "javafx.scene.layout.*", "javafx.scene.paint.*", "javafx.scene.text.*", "javafx.stage.*", "java.util.*"]
  .map((p) => `import ${p};`)
  .join("\n");

/**
 * The programs, each its own package (p<N>), compiled together and run one JVM each. `events` is
 * the text of .arena/events.txt (none when undefined); `files` are files (text or bytes) put in its
 * working folder; `main` is the main class in the package.
 */
const programs = [];
function program(name, source, { events, args = [], main = "Main", files = {} } = {}) {
  const id = `p${programs.length + 1}`;
  const p = { id, name, source: `package ${id};\n${IMPORTS}\n${source}`, events, args, files, main: `${id}.${main}`, result: null };
  programs.push(p);
  return p;
}

const tmp = mkdtempSync(join(tmpdir(), "java-arena-javafx-test-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));

function run(p, classPath) {
  return new Promise((resolve) => {
    const cwd = join(tmp, "work", p.id);
    mkdirSync(cwd, { recursive: true });
    for (const [name, content] of Object.entries(p.files)) writeFileSync(join(cwd, name), content);
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

// ------------------------------------------------------------------ part 14: colors, canvas, mouse, images, charts, slider
//
// The programs below that need no events print what they observe; their expected output is what
// the same code printed on real OpenJFX 21.0.12 (run without a screen, as scripts/fx-check runs it),
// so these tests check the library against real JavaFX, not only against itself. The ones with
// events (mouse, slider) follow what real JavaFX did for the same gestures with its Robot and for
// Slider.adjustValue, and the window JSON is the library's own format.

// PNG files of every kind the library reads, and files it must refuse as JavaFX does: our own, made here.
/** A PNG chunk: length, type, data, CRC. */
function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length);
  head.write(type, 4, "latin1");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0);
  return Buffer.concat([head, data, crc]);
}

/**
 * A PNG file: `rows` are its scanlines (or, interlaced, a function (x, y) => samples), filtered
 * with filter(y) (0 to 4, or 5, which isn't a filter), with PLTE and tRNS when given.
 */
function png({ width, height, depth = 8, colorType, rows, pixel, plte, trns, filter = () => 0 }) {
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
  const bpp = Math.max(1, (channels * depth) / 8);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = depth;
  ihdr[9] = colorType;
  ihdr[12] = pixel ? 1 : 0;
  const lines = [];
  const passes = pixel ? [[0, 0, 8, 8], [4, 0, 8, 8], [0, 4, 4, 8], [2, 0, 4, 4], [0, 2, 2, 4], [1, 0, 2, 2], [0, 1, 1, 2]] : [[0, 0, 1, 1]];
  for (const [x0, y0, dx, dy] of passes) {
    let prev = null;
    let index = 0;
    for (let y = y0; y < height; y += dy) {
      let row;
      if (!pixel) row = rows[y];
      else {
        const xs = [];
        for (let x = x0; x < width; x += dx) xs.push(x);
        if (!xs.length) break;
        row = Buffer.alloc(Math.ceil((xs.length * channels * depth) / 8));
        xs.forEach((x, i) => pixel(x, y).forEach((v, k) => (depth < 8 ? (row[(i * depth) >> 3] |= v << (8 - depth - ((i * depth) & 7))) : (row[i * channels + k] = v))));
      }
      prev ??= Buffer.alloc(row.length);
      const f = filter(index++);
      const out = Buffer.alloc(row.length);
      for (let i = 0; i < row.length; i++) {
        const a = i >= bpp ? row[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        const p = a + b - c;
        const paeth = Math.abs(p - a) <= Math.abs(p - b) && Math.abs(p - a) <= Math.abs(p - c) ? a : Math.abs(p - b) <= Math.abs(p - c) ? b : c;
        out[i] = (row[i] - [0, a, b, (a + b) >> 1, paeth][f > 4 ? 0 : f]) & 255;
      }
      lines.push(Buffer.from([f]), out);
      prev = row;
    }
  }
  const z = deflateSync(Buffer.concat(lines));
  const parts = [Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr)];
  if (plte) parts.push(chunk("PLTE", Buffer.from(plte)));
  if (trns) parts.push(chunk("tRNS", Buffer.from(trns)));
  // The data in two IDAT chunks, as a decoder must join them.
  parts.push(chunk("IDAT", z.subarray(0, z.length >> 1)), chunk("IDAT", z.subarray(z.length >> 1)), chunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(parts);
}

/** Rows of `bytes` bytes each, from a function of (x, y) giving one byte. */
const rowsOf = (width, height, bytes, f) => Array.from({ length: height }, (_, y) => Buffer.from(Array.from({ length: bytes }, (_, i) => f(i, y) & 255)));
/** Rows of samples of a few bits, packed. */
const packed = (width, height, depth, f) =>
  Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(Math.ceil((width * depth) / 8));
    for (let x = 0; x < width; x++) row[(x * depth) >> 3] |= f(x, y) << (8 - depth - ((x * depth) & 7));
    return row;
  });
const u16 = (width, height, n, f) =>
  Array.from({ length: height }, (_, y) => {
    const row = Buffer.alloc(width * n * 2);
    for (let i = 0; i < width * n; i++) row.writeUInt16BE(f(i, y) & 0xffff, 2 * i);
    return row;
  });

/** Every kind of PNG the library reads, and files it must refuse as JavaFX does, by name. */
function testImages() {
  const W = 7;
  const H = 5;
  const palette = [0, 255, 0, 50, 215, 99, 100, 175, 198, 150, 135, 41, 200, 95, 140, 250, 55, 239];
  const files = {};
  for (const d of [1, 2, 4]) files[`gray${d}.png`] = png({ width: W, height: H, depth: d, colorType: 0, rows: packed(W, H, d, (x, y) => (x * 3 + y) % (1 << d)) });
  files["gray8.png"] = png({ width: W, height: H, colorType: 0, rows: rowsOf(W, H, W, (x, y) => x * 37 + y * 51), filter: (y) => y % 5 });
  files["gray8trns.png"] = png({ width: W, height: H, colorType: 0, rows: rowsOf(W, H, W, (x, y) => x * 37 + y * 51), trns: [0, 88] });
  files["gray2trns.png"] = png({ width: 4, height: 3, depth: 2, colorType: 0, rows: packed(4, 3, 2, (x, y) => (x + y) % 4), trns: [0, 2] });
  files["gray16trns.png"] = png({ width: 4, height: 3, depth: 16, colorType: 0, rows: u16(4, 3, 1, (x, y) => x * 20000 + y), trns: [0x4e, 0x21] });
  files["grayalpha8.png"] = png({ width: W, height: H, colorType: 4, rows: rowsOf(W, H, 2 * W, (i, y) => (i % 2 ? [0, 255, 128, 1, 254][((i >> 1) + y) % 5] : (i >> 1) * 37 + y * 51)), filter: (y) => (y + 1) % 5 });
  files["grayalpha16.png"] = png({ width: 4, height: 3, depth: 16, colorType: 4, rows: u16(4, 3, 2, (i, y) => (i % 2 ? [0, 65535, 32896, 300][i >> 1] : (i >> 1) * 20000 + y * 100)) });
  files["rgb8.png"] = png({ width: W, height: H, colorType: 2, rows: rowsOf(W, H, 3 * W, (i, y) => [((i / 3) | 0) * 40, y * 60, ((i / 3) | 0) * y * 13][i % 3]), filter: (y) => (y + 2) % 5 });
  files["rgb8trns.png"] = png({ width: W, height: H, colorType: 2, rows: rowsOf(W, H, 3 * W, (i, y) => [((i / 3) | 0) * 40, y * 60, ((i / 3) | 0) * y * 13][i % 3]), trns: [0, 40, 0, 60, 0, 13] });
  files["rgb16.png"] = png({ width: W, height: H, depth: 16, colorType: 2, rows: u16(W, H, 3, (i, y) => [((i / 3) | 0) * 9000 + 77, y * 12000 + 129, 40000][i % 3]) });
  files["rgba8.png"] = png({ width: W, height: H, colorType: 6, rows: rowsOf(W, H, 4 * W, (i, y) => [(i >> 2) * 40, y * 60, 200, [0, 255, 128, 1, 254, 77, 255][((i >> 2) + y) % 7]][i % 4]), filter: (y) => (y + 3) % 5 });
  files["rgba16.png"] = png({ width: 4, height: 3, depth: 16, colorType: 6, rows: u16(4, 3, 4, (i, y) => [(i >> 2) * 20000 + 255, y * 30000, 12345, [0, 65535, 32896, 255][i >> 2]][i % 4]) });
  for (const d of [1, 2, 4, 8]) files[`palette${d}.png`] = png({ width: W, height: H, depth: d, colorType: 3, rows: packed(W, H, d, (x, y) => (x + y) % Math.min(1 << d, 6)), plte: palette.slice(0, 3 * Math.min(1 << d, 6)) });
  files["palette8trns.png"] = png({ width: W, height: H, colorType: 3, rows: packed(W, H, 8, (x, y) => (x + y) % 6), plte: palette, trns: [0, 128, 255] });
  files["palette-badindex.png"] = png({ width: 4, height: 3, colorType: 3, rows: rowsOf(4, 3, 4, (i) => [0, 1, 2, 9][i]), plte: [255, 0, 0, 0, 255, 0, 0, 0, 255] });
  files["interlaced-rgb.png"] = png({ width: 11, height: 9, colorType: 2, pixel: (x, y) => [x * 20, y * 25, (x * y * 7) & 255], filter: () => 1 });
  files["interlaced-gray2.png"] = png({ width: 10, height: 10, depth: 2, colorType: 0, pixel: (x, y) => [(x + y) % 4], filter: () => 4 });
  files["interlaced-rgba.png"] = png({ width: 3, height: 2, colorType: 6, pixel: (x, y) => [x * 80, y * 100, 7, x === 1 ? 0 : 255] });
  files["badfilter.png"] = png({ width: 2, height: 2, colorType: 0, rows: [Buffer.from([1, 2]), Buffer.from([3, 4])], filter: (y) => (y ? 5 : 0) });
  const good = png({ width: 2, height: 2, colorType: 0, rows: [Buffer.from([1, 2]), Buffer.from([3, 4])] });
  const badCrc = Buffer.from(good);
  badCrc[30] ^= 1;
  files["badcrc.png"] = badCrc;
  files["notpng.png"] = Buffer.from("this is not an image\n");
  files["empty.png"] = Buffer.alloc(0);
  files["truncated.png"] = good.subarray(0, good.length - 20);
  files["signature-only.png"] = good.subarray(0, 8);
  const zeroWidth = Buffer.from(good);
  zeroWidth.writeUInt32BE(0, 16);
  files["zerowidth.png"] = zeroWidth;
  files["rgb4.png"] = png({ width: 2, height: 1, depth: 4, colorType: 2, rows: [Buffer.from([1, 2, 3])] });
  files["badzlib.png"] = Buffer.concat([good.subarray(0, 33), chunk("IDAT", Buffer.from([1, 2, 3, 4, 5, 6])), chunk("IEND", Buffer.alloc(0))]);
  // Bad zlib data: an invalid block type (the engine's Inflater throws InternalError, the JDK's DataFormatException; both are a ZipException with zlib's text),
  // a stream cut short in its IDAT ("Unexpected end of ZLIB input stream", as InflaterInputStream says) and a whole stream shorter than the rows (a plain EOFException).
  const rows2x2 = Buffer.from([0, 1, 2, 0, 3, 4]);
  files["badblock.png"] = Buffer.concat([good.subarray(0, 33), chunk("IDAT", Buffer.from([0x78, 0x9c, 0x07, 0, 0, 0])), chunk("IEND", Buffer.alloc(0))]);
  const z2x2 = deflateSync(rows2x2);
  files["zlibcut.png"] = Buffer.concat([good.subarray(0, 33), chunk("IDAT", z2x2.subarray(0, 4)), chunk("IEND", Buffer.alloc(0))]);
  files["shortdata.png"] = Buffer.concat([good.subarray(0, 33), chunk("IDAT", deflateSync(rows2x2.subarray(0, 3))), chunk("IEND", Buffer.alloc(0))]);
  files["noihdr.png"] = Buffer.concat([good.subarray(0, 8), good.subarray(33)]);
  files["noplte.png"] = png({ width: 2, height: 1, colorType: 3, rows: [Buffer.from([0, 1])] });
  files["photo.jpg"] = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70]);
  return files;
}

const fxColors = program(
  "colors",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        System.out.println(Color.RED + " " + Color.DARKGREEN + " " + Color.TRANSPARENT + " " + Color.ALICEBLUE.getRed() + " " + Color.LIGHTGOLDENRODYELLOW + " " + Color.GREY + " " + Color.YELLOWGREEN);
        Color c = Color.rgb(200, 100, 50, 0.5);
        System.out.println(c + " " + c.invert() + " " + c.grayscale() + " " + c.brighter() + " " + c.darker() + " " + c.hashCode());
        System.out.println(Color.RED.brighter() + " " + Color.RED.darker() + " " + Color.BLACK.brighter() + " " + Color.WHITE.darker() + " " + Color.GRAY.brighter() + " " + Color.TRANSPARENT.brighter());
        Color d = Color.color(0.1, 0.2, 0.3, 0.4);
        System.out.println(d + " " + d.getRed() + " " + d.brighter().getRed() + " " + d.brighter().getGreen() + " " + d.brighter().getBlue() + " " + d.darker().getRed() + " " + d.grayscale().getRed() + " " + d.invert().getRed());
        System.out.println(new Color(0.1, 0.2, 0.3, 0.4).equals(d) + " " + d.hashCode() + " " + Color.RED.hashCode() + " " + Color.RED.equals(Color.web("red")) + " " + (Color.web("RED") == Color.RED) + " " + (Color.rgb(255, 0, 0) == Color.RED) + " " + Color.rgb(1, 2, 3).getRed() + " " + Color.color(0.1, 0, 0).equals(Color.color(0.1000000001, 0, 0)));
        Color hsl = Color.web("hsl(13.7,77.7%,33.3%)");
        System.out.println(hsl + " " + hsl.getRed() + " " + hsl.getGreen() + " " + hsl.getBlue() + " " + Color.color(0.123, 0.5, 0.9981, 0.002) + " " + new Color(0, 0, 0, Double.NaN) + " " + Color.color(Double.NaN, 0, 0));
        String[] webs = { "#f00", "#ff000080", "0xff0000", "0X112233", "f0a", "#1234", "Red", "transparent", "darkgrey", "rgb(255,0,0)x", "rgb( 255 , 0 , 0 )", "rgb(50%,0,0)", "rgb(300,-5,0)", "rgb(0.5%,0%,0%)", "rgba(255,0,0,-1)", "rgba(10%,20%,30%,0.25)", "RGB(1,2,3)", "rgb(+5,0,0)", "hsl(30,50%,60%)", "hsl(-30,100%,50%)", "hsl(720,100%,50%)", "hsla(120,100%,50%,0.5)", "#-1aabb", "#+1aabb", "ABCDEF12", "", "nope", " red", "#ff00aa8", "rgb(255,0)", "rgb(255,0,0,0)", "rgb (1,2,3)", "rgb(1.5,0,0)", "rgba(255,0,0,50%)", "hsl(120,100,50)", "hsl(120%,100%,50%)", null };
        for (String w : webs) {
            try {
                System.out.println("web(" + w + ") " + Color.web(w));
            } catch (RuntimeException e) {
                System.out.println("web(" + w + ") " + e);
            }
        }
        Runnable[] bad = { () -> Color.rgb(256, 0, 0), () -> Color.rgb(-1, 0, 0), () -> Color.rgb(0, 300, 0), () -> Color.rgb(0, 0, 999), () -> Color.rgb(0, 0, 0, 1.5), () -> Color.rgb(256, 300, 0, 2), () -> Color.color(1.1, 0, 0), () -> Color.color(0, -0.1, 0), () -> Color.color(0, 0, 2), () -> Color.color(0, 0, 0, 2), () -> new Color(2, -1, 0, 2) };
        for (Runnable r : bad) {
            try {
                r.run();
            } catch (IllegalArgumentException e) {
                System.out.println(e.getMessage());
            }
        }
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("colors: every named color, web(...) in all its forms, brighter, darker, grayscale, invert, equals, hashCode, toString and the errors, as real JavaFX gives them", async () => {
  await runAll();
  const r = fxColors.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
      "0xff0000ff 0x006400ff 0x00000000 0.9411764740943909 0xfafad2ff 0x808080ff 0x9acd32ff",
      "0xc8643280 0x379bcd80 0x75757580 0xff804080 0x8c462380 -932957568",
      "0xff0000ff 0xb20000ff 0x121212ff 0xb2b2b2ff 0xb7b7b7ff 0x12121200",
      "0x1a334d66 0.10000000149011612 0.1428571492433548 0.2857142984867096 0.4285714328289032 0.07000000029802322 0.18400000035762787 0.8999999761581421",
      "true 439569766 -16776961 true true false 0.003921568859368563 true",
      "0x552213ff 0.3330000042915344 0.13333819806575775 0.07425899803638458 0x1f80ff01 0x00000000 0x000000ff",
      "web(#f00) 0xff0000ff",
      "web(#ff000080) 0xff000080",
      "web(0xff0000) 0xff0000ff",
      "web(0X112233) 0x112233ff",
      "web(f0a) 0xff00aaff",
      "web(#1234) 0x11223344",
      "web(Red) 0xff0000ff",
      "web(transparent) 0x00000000",
      "web(darkgrey) 0xa9a9a9ff",
      "web(rgb(255,0,0)x) 0xff0000ff",
      "web(rgb( 255 , 0 , 0 )) 0xff0000ff",
      "web(rgb(50%,0,0)) 0x800000ff",
      "web(rgb(300,-5,0)) 0xff0000ff",
      "web(rgb(0.5%,0%,0%)) 0x010000ff",
      "web(rgba(255,0,0,-1)) 0xff000000",
      "web(rgba(10%,20%,30%,0.25)) 0x1a334d40",
      "web(RGB(1,2,3)) 0x010203ff",
      "web(rgb(+5,0,0)) 0x050000ff",
      "web(hsl(30,50%,60%)) 0x99734dff",
      "web(hsl(-30,100%,50%)) 0x800040ff",
      "web(hsl(720,100%,50%)) 0x800000ff",
      "web(hsla(120,100%,50%,0.5)) 0x00800080",
      "web(#-1aabb) java.lang.IllegalArgumentException: Color.rgb's red parameter (-1) expects color values 0-255",
      "web(#+1aabb) 0x01aabbff",
      "web(ABCDEF12) 0xabcdef12",
      "web() java.lang.IllegalArgumentException: Invalid color specification",
      "web(nope) java.lang.IllegalArgumentException: Invalid color specification",
      "web( red) java.lang.IllegalArgumentException: Invalid color specification",
      "web(#ff00aa8) java.lang.IllegalArgumentException: Invalid color specification",
      "web(rgb(255,0)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(rgb(255,0,0,0)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(rgb (1,2,3)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(rgb(1.5,0,0)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(rgba(255,0,0,50%)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(hsl(120,100,50)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(hsl(120%,100%,50%)) java.lang.IllegalArgumentException: Invalid color specification",
      "web(null) java.lang.NullPointerException: The color components or name must be specified",
      "Color.rgb's red parameter (256) expects color values 0-255",
      "Color.rgb's red parameter (-1) expects color values 0-255",
      "Color.rgb's green parameter (300) expects color values 0-255",
      "Color.rgb's blue parameter (999) expects color values 0-255",
      "Color's opacity value (1.5) must be in the range 0.0-1.0",
      "Color.rgb's red parameter (256) expects color values 0-255",
      "Color's red value (1.1) must be in the range 0.0-1.0",
      "Color's green value (-0.1) must be in the range 0.0-1.0",
      "Color's blue value (2.0) must be in the range 0.0-1.0",
      "Color's opacity value (2.0) must be in the range 0.0-1.0",
      "Color's red value (2.0) must be in the range 0.0-1.0",
    ].join("\n") + "\n");
});

const fxLists = program(
  "lists",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        ObservableList<String> ol = FXCollections.observableArrayList("a", "b");
        System.out.println(ol + " " + ol.equals(List.of("a", "b")) + " " + ol.hashCode() + " " + FXCollections.observableArrayList() + " " + FXCollections.observableArrayList(List.of(1, 2)) + " " + FXCollections.observableArrayList("a", null));
        Runnable[] bad = {
            () -> FXCollections.observableArrayList((String[]) null),
            () -> FXCollections.observableArrayList((Collection<String>) null),
            () -> FXCollections.observableArrayList(1, 2, 3).remove(2, 1),
            () -> FXCollections.observableArrayList(1, 2, 3).remove(1, 5),
            () -> FXCollections.observableArrayList(1).add(5, 3),
            () -> FXCollections.observableArrayList(1).get(5),
            () -> FXCollections.observableArrayList(1).remove(5),
            () -> FXCollections.observableArrayList(1).set(5, 1),
            () -> FXCollections.observableArrayList(1).addAll(4, List.of(1)),
            () -> { ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3); for (Integer i : x) { x.add(4); } } };
        for (Runnable r : bad) {
            try {
                r.run();
            } catch (RuntimeException e) {
                System.out.println(e);
            }
        }
        ObservableList<Integer> x = FXCollections.observableArrayList(1, 2, 3, 2);
        x.removeAll(2);
        x.setAll(9, 8, 7);
        x.remove(0, 1);
        x.addAll(5, 6);
        x.sort(null);
        ListIterator<Integer> it = x.listIterator();
        it.next();
        it.set(70);
        System.out.println(x + " " + x.subList(1, 3) + " " + x.contains(6) + " " + x.indexOf(6) + " " + x.removeAll(42) + " " + x.setAll(List.of()) + " " + x);
        // DoubleProperty and SimpleDoubleProperty
        SimpleDoubleProperty d = new SimpleDoubleProperty();
        DoubleProperty e = new SimpleDoubleProperty(2.5);
        System.out.println(d + " " + e + " " + e.get() + " " + e.getValue().getClass().getName());
        List<String> heard = new ArrayList<>();
        ChangeListener<Number> listener = (obs, o, n) -> heard.add(o + "->" + n);
        d.addListener(listener);
        d.set(1);
        d.set(1);
        d.set(Double.NaN);
        d.set(Double.NaN);
        d.set(-0.0);
        d.set(0.0);
        d.setValue(3);
        d.setValue(null);
        heard.add("v=" + d.get());
        d.removeListener(listener);
        d.set(9);
        System.out.println(heard);
        // Slider: defaults, ends, listeners
        Slider s = new Slider();
        System.out.println(s.getMin() + " " + s.getMax() + " " + s.getValue() + " " + s.getMajorTickUnit() + " " + s.getMinorTickCount() + " " + s.getBlockIncrement() + " " + s.isShowTickLabels() + " " + s.isShowTickMarks() + " " + s.isSnapToTicks());
        System.out.println(new Slider(0, 100, 150).getValue() + " " + new Slider(0, 100, -5).getValue() + " " + new Slider(0, 10, Double.NaN).getValue());
        Slider odd = new Slider(50, 10, 20);
        Slider rev = new Slider(10, 0, 0);
        System.out.println(odd.getMin() + " " + odd.getMax() + " " + odd.getValue() + " " + rev.getMin() + " " + rev.getMax() + " " + rev.getValue());
        List<String> log = new ArrayList<>();
        Slider s2 = new Slider(0, 100, 50);
        s2.valueProperty().addListener((obs, o, n) -> log.add(o + "->" + n + " " + n.getClass().getSimpleName()));
        s2.setValue(150);
        s2.setValue(100);
        s2.setValue(-5);
        s2.setMax(10);
        log.add("max10 v=" + s2.getValue());
        s2.setMin(20);
        log.add("min20 v=" + s2.getValue() + " " + s2.getMin() + " " + s2.getMax());
        s2.setValue(Double.NaN);
        System.out.println(log);
        Slider nested = new Slider(0, 10, 5);
        List<String> q = new ArrayList<>();
        nested.valueProperty().addListener((obs, o, n) -> { q.add("A " + o + "->" + n); if (n.doubleValue() > 8) { nested.setValue(1); } });
        nested.valueProperty().addListener((obs, o, n) -> q.add("B " + o + "->" + n));
        nested.setValue(9);
        System.out.println(q + " " + nested.valueProperty().toString().replaceAll("@[0-9a-f]+", "@H") + " " + (nested.valueProperty() == nested.valueProperty()));
        for (double unit : new double[] { 0, -1 }) {
            try {
                new Slider().setMajorTickUnit(unit);
            } catch (IllegalArgumentException ex) {
                System.out.println(ex.getMessage());
            }
        }
        Slider t = new Slider();
        t.setMajorTickUnit(Double.NaN);
        t.setMinorTickCount(-1);
        t.setBlockIncrement(-1);
        t.setShowTickLabels(true);
        t.setShowTickMarks(true);
        t.setSnapToTicks(true);
        System.out.println(t.getMajorTickUnit() + " " + t.getMinorTickCount() + " " + t.getBlockIncrement() + " " + t.isShowTickLabels() + " " + t.isShowTickMarks() + " " + t.isSnapToTicks() + " " + t.toString().replaceAll("@[0-9a-f]+", "@H"));
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("FXCollections lists, DoubleProperty and SimpleDoubleProperty, and Slider (ends, min and max, listeners, a listener that moves it again), as real JavaFX gives them", async () => {
  await runAll();
  const r = fxLists.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
      "[a, b] true 4066 [] [1, 2] [a, null]",
      "java.lang.NullPointerException",
      "java.lang.NullPointerException: Cannot invoke \"java.util.Collection.toArray()\" because \"c\" is null",
      "java.lang.IndexOutOfBoundsException: Range [2, 1) out of bounds for length 3",
      "java.lang.IndexOutOfBoundsException: Range [1, 5) out of bounds for length 3",
      "java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 2",
      "java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 1",
      "java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 1",
      "java.lang.IndexOutOfBoundsException: Index 5 out of bounds for length 1",
      "java.lang.IndexOutOfBoundsException: Index: 4",
      "java.util.ConcurrentModificationException",
      "[70, 6, 7, 8] [6, 7] true 1 false true []",
      "DoubleProperty [value: 0.0] DoubleProperty [value: 2.5] 2.5 java.lang.Double",
      "[0.0->1.0, 1.0->NaN, NaN->-0.0, -0.0->3.0, 3.0->0.0, v=0.0]",
      "0.0 100.0 0.0 25.0 3 10.0 false false false",
      "100.0 0.0 NaN",
      "50.0 50.0 50.0 10.0 10.0 10.0",
      "[50.0->100.0 Double, 100.0->0.0 Double, max10 v=0.0, 0.0->20.0 Double, min20 v=20.0 20.0 20.0, 20.0->NaN Double]",
      "[A 5.0->9.0, A 9.0->1.0, B 9.0->1.0, B 5.0->1.0] DoubleProperty [bean: Slider@H[styleClass=slider], name: value, value: 1.0] true",
      "MajorTickUnit cannot be less than or equal to 0.",
      "MajorTickUnit cannot be less than or equal to 0.",
      "NaN -1 -1.0 true true true Slider@H[styleClass=slider]",
    ].join("\n") + "\n");
});

const fxCanvas = program(
  "canvas",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        Canvas c0 = new Canvas();
        Canvas neg = new Canvas(-5, Double.NaN);
        Canvas c = new Canvas(300, 200);
        GraphicsContext g = c.getGraphicsContext2D();
        System.out.println(c0.getWidth() + " " + c0.getHeight() + " " + neg.getWidth() + " " + neg.getHeight() + " " + (g == c.getGraphicsContext2D()) + " " + (g.getCanvas() == c));
        System.out.println(g.getFill() + " " + g.getStroke() + " " + g.getLineWidth() + " " + g.getFont());
        g.setFill(null);
        g.setStroke(null);
        g.setFont(null);
        StringBuilder widths = new StringBuilder();
        for (double w : new double[] { 0, -1, Double.NaN, Double.POSITIVE_INFINITY, 0.5, 3 }) {
            g.setLineWidth(w);
            widths.append(' ').append(g.getLineWidth());
        }
        g.setFill(Color.RED);
        Font serif = Font.font("Serif", 20);
        g.setFont(serif);
        System.out.println(g.getFill() + " " + g.getStroke() + " " + g.getFont() + widths + " " + (g.getFill() == Color.RED) + " " + (g.getFont() == serif));
        Runnable[] bad = {
            () -> g.fillPolygon(new double[] { 0, 1 }, new double[] { 0, 1 }, 3),
            () -> g.fillPolygon(new double[] { 0, 1, 2 }, new double[] { 0 }, 3),
            () -> g.strokePolygon(new double[] { 0, 1 }, new double[] { 0, 1 }, 3) };
        for (Runnable r : bad) {
            try {
                r.run();
            } catch (ArrayIndexOutOfBoundsException e) {
                System.out.println(e);
            }
        }
        g.fillPolygon(null, new double[] { 1 }, 2);
        g.fillPolygon(new double[] { 1 }, new double[] { 1 }, -1);
        g.fillText(null, 1, 2);
        g.strokeText(null, 1, 2);
        g.fillRect(10, 10, -5, Double.NaN);
        c.setWidth(-3);
        c.setHeight(Double.NaN);
        System.out.println(c.getWidth() + " " + c.getHeight() + " " + c.toString().replaceAll("@[0-9a-f]+", "@H"));
        Canvas named = new Canvas();
        named.setId("pad");
        System.out.println(named + " " + named.getOnMousePressed() + " " + named.getOnMouseDragged() + " " + named.getOnMouseReleased() + " " + named.getOnMouseClicked() + " " + MouseEvent.MOUSE_PRESSED + " " + MouseEvent.MOUSE_DRAGGED.getName() + " " + MouseEvent.MOUSE_RELEASED + " " + MouseEvent.MOUSE_CLICKED);
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("Canvas and GraphicsContext: sizes, the state and what changes nothing, the polygon checks, mouse handlers and event types, as real JavaFX gives them", async () => {
  await runAll();
  const r = fxCanvas.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
      "0.0 0.0 -5.0 NaN true true",
      "0x000000ff 0x000000ff 1.0 Font[name=System Regular, family=System, style=Regular, size=13.0]",
      "0xff0000ff 0x000000ff Font[name=Serif Regular, family=Serif, style=Regular, size=20.0] 1.0 1.0 1.0 1.0 0.5 3.0 true true",
      "java.lang.ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2",
      "java.lang.ArrayIndexOutOfBoundsException: Index 1 out of bounds for length 1",
      "java.lang.ArrayIndexOutOfBoundsException: Index 2 out of bounds for length 2",
      "-3.0 NaN Canvas@H",
      "Canvas[id=pad] null null null null MOUSE_PRESSED MOUSE_DRAGGED MOUSE_RELEASED MOUSE_CLICKED",
    ].join("\n") + "\n");
});

const fxCharts = program(
  "charts",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        Thread.currentThread().setUncaughtExceptionHandler((th, e) -> System.out.println("   UNCAUGHT: " + e.toString().replaceAll("@[0-9a-f]+", "@H")));
        NumberAxis x = new NumberAxis();
        NumberAxis b = new NumberAxis(1, 9, 2);
        NumberAxis l = new NumberAxis("L", 9, 1, -2);
        System.out.println(x.getLabel() + " " + x.isAutoRanging() + " " + x.getLowerBound() + " " + x.getUpperBound() + " " + x.getTickUnit() + " " + x.isForceZeroInRange() + " " + x.isMinorTickVisible() + " | " + b.isAutoRanging() + " " + b.getLowerBound() + " " + b.getUpperBound() + " " + b.getTickUnit() + " | " + l.getLabel() + " " + l.isAutoRanging() + " " + l.getLowerBound() + " " + l.getUpperBound() + " " + l.getTickUnit());
        CategoryAxis cats = new CategoryAxis();
        ObservableList<String> given = FXCollections.observableArrayList("a", "b");
        CategoryAxis fixed = new CategoryAxis(given);
        given.add("z");
        System.out.println(cats.getLabel() + " " + cats.isAutoRanging() + " " + cats.getCategories() + " | " + fixed.isAutoRanging() + " " + fixed.getCategories() + " " + (fixed.getCategories() == given));
        cats.getCategories().add("a");
        cats.getCategories().add("a");
        CategoryAxis withNull = new CategoryAxis();
        withNull.getCategories().add(null);
        System.out.println(cats.getCategories() + " " + cats.isAutoRanging() + " " + withNull.getCategories());
        LineChart<Number, Number> lc = new LineChart<>(x, new NumberAxis());
        System.out.println(lc.getTitle() + " " + lc.isLegendVisible() + " " + lc.getAnimated() + " " + lc.getCreateSymbols() + " " + lc.getData() + " " + (lc.getXAxis() == x) + " " + lc.toString().replaceAll("@[0-9a-f]+", "@H") + " " + new BarChart<String, Number>(new CategoryAxis(), new NumberAxis()).toString().replaceAll("@[0-9a-f]+", "@H") + " " + x.toString().replaceAll("@[0-9a-f]+", "@H"));
        XYChart.Series<Number, Number> s = new XYChart.Series<>();
        System.out.println(s.getName() + " " + s.getData() + " " + s + " " + new XYChart.Series<>("N", FXCollections.observableArrayList(new XYChart.Data<>(1, 2))) + " " + new XYChart.Data<Number, Number>() + " " + new XYChart.Data<Number, Number>(1, 2.5) + " " + new XYChart.Data<String, Number>("a", null) + " " + new XYChart.Data<>(1, 1).equals(new XYChart.Data<>(1, 1)));
        s.getData().add(new XYChart.Data<>(1, 2));
        lc.getData().add(s);
        lc.getData().add(s);
        lc.getData().add(null);
        System.out.println("series " + lc.getData().size());
        XYChart.Data<Number, Number> d = new XYChart.Data<>(3, 4);
        XYChart.Series<Number, Number> loose = new XYChart.Series<>();
        loose.getData().add(d);
        loose.getData().add(d);
        loose.getData().add(null);
        LineChart<Number, Number> two = new LineChart<>(new NumberAxis(), new NumberAxis());
        XYChart.Series<Number, Number> p = new XYChart.Series<>();
        XYChart.Series<Number, Number> q = new XYChart.Series<>();
        two.getData().addAll(p, q);
        p.getData().add(d);
        q.getData().add(d);
        XYChart.Series<Number, Number> r2 = new XYChart.Series<>();
        two.getData().add(r2);
        r2.getData().add(null);
        System.out.println("data " + loose.getData().size() + " " + p.getData().size() + " " + q.getData().size() + " " + r2.getData().size());
        Runnable[] bad = {
            () -> new LineChart<Number, Number>(null, new NumberAxis()),
            () -> new LineChart<Number, Number>(new NumberAxis(), null),
            () -> { NumberAxis same = new NumberAxis(); new ScatterChart<Number, Number>(same, same); },
            () -> new BarChart<Number, Number>(new NumberAxis(), new NumberAxis()),
            () -> new BarChart<String, Number>(null, new NumberAxis()),
            () -> new CategoryAxis(null),
            () -> new CategoryAxis(FXCollections.observableArrayList("a", "a")),
            () -> new XYChart.Series<Number, Number>(null),
            () -> { XYChart.Data<Number, Number> twice = new XYChart.Data<>(1, 1); new XYChart.Series<>(FXCollections.observableArrayList(twice, twice)); },
            () -> { XYChart.Series<Number, Number> twice = new XYChart.Series<>(); new LineChart<Number, Number>(new NumberAxis(), new NumberAxis()).setData(FXCollections.observableArrayList(twice, twice)); },
            () -> { BarChart<String, Number> bars = new BarChart<>(new CategoryAxis(), new NumberAxis()); XYChart.Series<String, Number> r = new XYChart.Series<>(); XYChart.Data<String, Number> one = new XYChart.Data<>("a", 1); r.getData().add(one); bars.getData().add(r); one.setYValue(null); } };
        for (Runnable r : bad) {
            try {
                r.run();
                System.out.println("no exception");
            } catch (RuntimeException e) {
                System.out.println(e.toString().replaceAll("@[0-9a-f]+", "@H"));
            }
        }
        BarChart<String, Number> bars = new BarChart<>(new CategoryAxis(), new NumberAxis());
        XYChart.Series<String, Number> rain = new XYChart.Series<>();
        rain.getData().add(new XYChart.Data<>("a", null));
        bars.getData().add(rain);
        LineChart<Number, Number> unset = new LineChart<>(new NumberAxis(), new NumberAxis());
        unset.setData(null);
        XYChart.Series<Number, Number> none = new XYChart.Series<>();
        none.setData(null);
        System.out.println(unset.getData() + " " + none.getData());
        // Shown windows: an auto-ranging category axis takes the data's categories; a null value fails show().
        CategoryAxis auto = new CategoryAxis();
        ScatterChart<String, Number> scatter = new ScatterChart<>(auto, new NumberAxis());
        scatter.getData().addAll(new XYChart.Series<>("A", FXCollections.observableArrayList(new XYChart.Data<>("north", 1), new XYChart.Data<>("south", 2))), new XYChart.Series<>("B", FXCollections.observableArrayList(new XYChart.Data<>("east", 3), new XYChart.Data<>("north", 4))));
        CategoryAxis months = new CategoryAxis(FXCollections.observableArrayList("Jan", "Feb"));
        BarChart<String, Number> given2 = new BarChart<>(months, new NumberAxis());
        given2.getData().add(new XYChart.Series<>("R", FXCollections.observableArrayList(new XYChart.Data<>("Jan", 5), new XYChart.Data<>("Mar", 7))));
        Stage shown = new Stage();
        shown.setScene(new Scene(new VBox(scatter, given2), 300, 200));
        shown.show();
        System.out.println(auto.getCategories() + " " + months.getCategories());
        shown.hide();
        for (int which = 0; which < 3; which++) {
            CategoryAxis xs = new CategoryAxis();
            LineChart<String, Number> bad2 = new LineChart<>(xs, new NumberAxis());
            XYChart.Series<String, Number> r = new XYChart.Series<>();
            r.getData().addAll(new XYChart.Data<>("A", 2), which == 0 ? new XYChart.Data<>(null, 3) : which == 1 ? new XYChart.Data<>("B", null) : new XYChart.Data<>("C", 4));
            bad2.getData().add(r);
            Stage st = new Stage();
            st.setScene(new Scene(new VBox(bad2), 300, 200));
            try {
                st.show();
                System.out.println("shown " + xs.getCategories());
            } catch (NullPointerException e) {
                System.out.println(e.getMessage() + " " + xs.getCategories() + " " + st.isShowing());
            }
            st.hide();
        }
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("charts: axes, series and data, JavaFX's checks (duplicates and nulls reported to the uncaught exception handler or thrown), categories from the data and a null value failing show(), as real JavaFX gives them", async () => {
  await runAll();
  const r = fxCharts.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
      "null true 0.0 100.0 5.0 true true | false 1.0 9.0 2.0 | L false 9.0 1.0 -2.0",
      "null true [] | false [a, b, z] true",
      "   UNCAUGHT: java.lang.UnsupportedOperationException",
      "   UNCAUGHT: java.lang.NullPointerException: Cannot invoke \"String.equals(Object)\" because the return value of \"javafx.collections.ObservableList.get(int)\" is null",
      "[a] true [null]",
      "null true true true [] true LineChart@H[styleClass=chart] BarChart@H[styleClass=chart bar-chart] NumberAxis@H[styleClass=axis]",
      "null [] Series[null] Series[N] Data[null,null,null] Data[1,2.5,null] Data[a,null,null] false",
      "   UNCAUGHT: java.lang.IllegalArgumentException: Duplicate series added",
      "   UNCAUGHT: java.lang.NullPointerException: Cannot read field \"setToRemove\" because \"<local5>\" is null",
      "series 3",
      "   UNCAUGHT: java.lang.IllegalArgumentException: Duplicate data added",
      "   UNCAUGHT: java.lang.IllegalArgumentException: Duplicate data added",
      "   UNCAUGHT: java.lang.IllegalArgumentException: Children: duplicate children added: parent = Group@H[styleClass=plot-content]",
      "   UNCAUGHT: java.lang.NullPointerException: Cannot read field \"setToRemove\" because \"<local6>\" is null",
      "data 3 1 1 1",
      "java.lang.NullPointerException: Cannot invoke \"javafx.scene.chart.Axis.getSide()\" because \"<parameter1>\" is null",
      "java.lang.NullPointerException: Cannot invoke \"javafx.scene.chart.Axis.getSide()\" because \"<parameter2>\" is null",
      "java.lang.IllegalArgumentException: Children: duplicate children added: parent = Chart$1@H[styleClass=chart-content]",
      "java.lang.IllegalArgumentException: Axis type incorrect, one of X,Y should be CategoryAxis and the other NumberAxis",
      "java.lang.NullPointerException: Cannot invoke \"javafx.scene.chart.Axis.getSide()\" because \"<parameter1>\" is null",
      "java.lang.NullPointerException: Cannot invoke \"java.util.Collection.toArray()\" because \"c\" is null",
      "java.lang.IllegalArgumentException: Duplicate category added; a already present",
      "java.lang.NullPointerException: Cannot invoke \"javafx.collections.ObservableList.iterator()\" because \"<parameter1>\" is null",
      "java.lang.IllegalArgumentException: Duplicate data added",
      "java.lang.IllegalArgumentException: Duplicate series added",
      "java.lang.NullPointerException: Cannot invoke \"java.lang.Number.doubleValue()\" because the return value of \"javafx.scene.chart.XYChart$Data.getYValue()\" is null",
      "   UNCAUGHT: java.lang.NullPointerException: Cannot invoke \"java.lang.Number.doubleValue()\" because the return value of \"javafx.scene.chart.XYChart$Data.getYValue()\" is null",
      "null null",
      "[north, south, east] [Jan, Feb]",
      "Cannot invoke \"String.equals(Object)\" because the return value of \"javafx.collections.ObservableList.get(int)\" is null [A, null] true",
      "Cannot invoke \"java.lang.Number.doubleValue()\" because \"<local3>\" is null [] true",
      "shown [A, C]",
    ].join("\n") + "\n");
});

const fxManyPoints = program(
  "many chart points",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Thread.currentThread().setUncaughtExceptionHandler((th, e) -> System.out.println("   UNCAUGHT: " + e));
        // Points added one at a time, to a series alone and to one in a chart with another series,
        // then a sliding window (remove the first, add one): each change costs the same however
        // many points there are (the browser's engine is far slower than the JDK, so checking the
        // whole list on each change made a thousand adds take seconds there).
        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis(), new NumberAxis());
        XYChart.Series<Number, Number> alone = new XYChart.Series<>();
        XYChart.Series<Number, Number> inChart = new XYChart.Series<>();
        XYChart.Series<Number, Number> other = new XYChart.Series<>();
        chart.getData().addAll(inChart, other);
        long t0 = System.nanoTime();
        for (int i = 0; i < 100000; i++) {
            alone.getData().add(new XYChart.Data<>(i, i * i));
            inChart.getData().add(new XYChart.Data<>(i, i));
            other.getData().add(new XYChart.Data<>(i, -i));
        }
        for (int i = 0; i < 100000; i++) {
            alone.getData().remove(0);
            alone.getData().add(new XYChart.Data<>(i, i));
            inChart.getData().remove(0);
            inChart.getData().add(new XYChart.Data<>(i, i));
        }
        long ms = (System.nanoTime() - t0) / 1000000;
        System.out.println(alone.getData().size() + " " + inChart.getData().size() + " " + other.getData().size() + (ms < 10000 ? " quick" : " slow: " + ms + " ms"));
        // A duplicate stays in the list after its add fails, so every later add fails too, until a
        // removal takes it out, as in JavaFX.
        XYChart.Series<Number, Number> s = new XYChart.Series<>();
        XYChart.Data<Number, Number> d = new XYChart.Data<>(1, 1);
        s.getData().add(d);
        s.getData().add(d);
        System.out.println("fresh after the duplicate");
        s.getData().add(new XYChart.Data<>(2, 2));
        s.getData().remove(0);
        System.out.println("fresh after remove(0) " + s.getData().size());
        s.getData().add(new XYChart.Data<>(3, 3));
        System.out.println("done " + s.getData().size());
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("charts: points added and removed one at a time stay quick, and a duplicate left in the list makes later adds fail until it is removed", async () => {
  await runAll();
  const r = fxManyPoints.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
    "100000 100000 100000 quick",
    "   UNCAUGHT: java.lang.IllegalArgumentException: Duplicate data added",
    "fresh after the duplicate",
    "   UNCAUGHT: java.lang.IllegalArgumentException: Duplicate data added",
    "fresh after remove(0) 2",
    "done 3",
  ].join("\n") + "\n");
});

const fxImages = program(
  "images",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        String[] names = new java.io.File(".").list((dir, n) -> n.endsWith(".png") || n.endsWith(".jpg"));
        Arrays.sort(names);
        for (String n : names) {
            Image im = new Image("file:" + n);
            String crc = "";
            if (!im.isError()) {
                java.util.zip.CRC32 sum = new java.util.zip.CRC32();
                for (int y = 0; y < im.getHeight(); y++) {
                    for (int x = 0; x < im.getWidth(); x++) {
                        int v = im.getPixelReader().getArgb(x, y);
                        sum.update(new byte[] { (byte) (v >>> 24), (byte) (v >>> 16), (byte) (v >>> 8), (byte) v });
                    }
                }
                crc = String.format("%08x", sum.getValue());
            }
            System.out.println(n + " " + im.isError() + " " + im.getException() + " " + im.getWidth() + " " + im.getHeight() + " " + (im.getPixelReader() != null) + " " + crc);
        }
        Image rgba = new Image("file:rgba8.png");
        PixelReader r = rgba.getPixelReader();
        System.out.println(Integer.toHexString(r.getArgb(2, 0)) + " " + r.getColor(2, 0) + " " + r.getColor(2, 0).getOpacity() + " " + r.getColor(0, 0) + " " + r.getColor(0, 0).equals(Color.TRANSPARENT) + " " + (r == rgba.getPixelReader()));
        for (int[] xy : new int[][] { { -1, 0 }, { 0, -1 }, { 7, 0 }, { 0, 5 } }) {
            try {
                r.getArgb(xy[0], xy[1]);
            } catch (IndexOutOfBoundsException e) {
                System.out.println(e);
            }
        }
        String[] urls = { "missing.png", "", "   ", "x:y", "C:/pic.png", "file:", "FILE:rgb8.png", "file:rgb8.png?x=1", "file:missing.png" };
        for (String u : urls) {
            try {
                Image im = new Image(u);
                System.out.println("[" + u + "] " + im.isError() + " " + im.getException() + " " + im.getWidth());
            } catch (RuntimeException e) {
                System.out.println("[" + u + "] " + e);
            }
        }
        try {
            new Image((String) null);
        } catch (NullPointerException e) {
            System.out.println(e);
        }
        try {
            new Image((java.io.InputStream) null);
        } catch (NullPointerException e) {
            System.out.println(e);
        }
        System.out.println(new Image(new java.io.FileInputStream("gray8.png")).getWidth() + " " + new Image(new java.io.InputStream() {
            @Override
            public int read() throws java.io.IOException {
                throw new java.io.IOException("broken stream");
            }
        }).getException());
        // WritableImage: transparent, pixels written are kept premultiplied, copies, errors.
        WritableImage w = new WritableImage(3, 2);
        PixelWriter pw = w.getPixelWriter();
        pw.setArgb(0, 0, 0x80ff8040);
        pw.setArgb(1, 0, 0x00ff8040);
        pw.setArgb(2, 0, 0x01fefefe);
        pw.setColor(0, 1, Color.web("#3366cc"));
        pw.setColor(1, 1, Color.color(0.3, 0.6, 0.9, 0.25));
        StringBuilder px = new StringBuilder();
        for (int y = 0; y < 2; y++) {
            for (int xx = 0; xx < 3; xx++) {
                px.append(Integer.toHexString(w.getPixelReader().getArgb(xx, y))).append(' ');
            }
        }
        System.out.println(px + "" + w.getPixelReader().getColor(1, 1) + " " + w.isError() + " " + w.getWidth() + " " + (pw == w.getPixelWriter()));
        Runnable[] bad = {
            () -> pw.setArgb(3, 0, 0),
            () -> pw.setColor(0, 2, Color.RED),
            () -> pw.setColor(0, 0, null),
            () -> new WritableImage(0, 3),
            () -> new WritableImage(null, 2, 2),
            () -> new WritableImage(null, 0, 2),
            () -> new WritableImage(new Image("file:missing.png").getPixelReader(), 2, 2),
            () -> new WritableImage(new Image("file:gray8.png").getPixelReader(), 8, 5),
            () -> new WritableImage(new Image("file:rgb8.png").getPixelReader(), 7, 6),
            () -> new WritableImage(new Image("file:palette8trns.png").getPixelReader(), 10, 7),
            () -> new WritableImage(w.getPixelReader(), 4, 2) };
        for (Runnable b : bad) {
            try {
                b.run();
            } catch (RuntimeException e) {
                System.out.println(e);
            }
        }
        WritableImage wide = new WritableImage(new Image("file:rgba8.png").getPixelReader(), 8, 1);
        WritableImage corner = new WritableImage(rgba.getPixelReader(), 3, 2);
        corner.getPixelWriter().setArgb(0, 0, 0xff00ff00);
        System.out.println(Integer.toHexString(wide.getPixelReader().getArgb(7, 0)) + " " + Integer.toHexString(rgba.getPixelReader().getArgb(0, 1)) + " " + Integer.toHexString(corner.getPixelReader().getArgb(0, 0)) + " " + Integer.toHexString(rgba.getPixelReader().getArgb(0, 0)) + " " + Integer.toHexString(corner.getPixelReader().getArgb(2, 1)));
        ImageView view = new ImageView(rgba);
        ImageView named = new ImageView();
        named.setId("pic");
        System.out.println((view.getImage() == rgba) + " " + named.getImage() + " " + named + " " + view.toString().replaceAll("@[0-9a-f]+", "@H") + " " + new ImageView("file:gray8.png").getImage().getWidth() + " " + new ImageView("file:nope.png").getImage().isError());
        try {
            new ImageView("nope.png");
        } catch (IllegalArgumentException e) {
            System.out.println(e);
        }
        Platform.exit();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`, { files: testImages() },
);
test("images: PNG decoding of every kind (gray, gray and alpha, RGB, RGBA, palette, 1 to 16 bits, transparency, interlaced) and the error images, pixel reading and writing with premultiplied alpha, copies and their errors, as real JavaFX gives them", async () => {
  await runAll();
  const r = fxImages.result;
  // Real JavaFX reads a JPEG file too (this broken one gives "Improper call to JPEG library in state 200"); Java Arena reads PNG only.
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, [
      "badblock.png true java.util.zip.ZipException: invalid block type 0.0 0.0 false ",
      "badcrc.png false null 2.0 2.0 true 30441ab3",
      "badfilter.png false null 2.0 2.0 true 30441ab3",
      "badzlib.png true java.util.zip.ZipException: incorrect header check 0.0 0.0 false ",
      "empty.png true com.sun.javafx.iio.ImageStorageException: No loader for image data 0.0 0.0 false ",
      "gray1.png false null 7.0 5.0 true d18e878a",
      "gray16trns.png false null 4.0 3.0 true ca8bd402",
      "gray2.png false null 7.0 5.0 true a5b3b67d",
      "gray2trns.png false null 4.0 3.0 true 845689b0",
      "gray4.png false null 7.0 5.0 true 62c6301d",
      "gray8.png false null 7.0 5.0 true d56bf6da",
      "gray8trns.png false null 7.0 5.0 true d887e676",
      "grayalpha16.png false null 4.0 3.0 true b16e8e2f",
      "grayalpha8.png false null 7.0 5.0 true de011d49",
      "interlaced-gray2.png false null 10.0 10.0 true d15bdb4b",
      "interlaced-rgb.png false null 11.0 9.0 true f5f670e5",
      "interlaced-rgba.png false null 3.0 2.0 true 6757e0b4",
      "noihdr.png true java.io.IOException: Bad PNG header! 0.0 0.0 false ",
      "noplte.png true java.lang.NullPointerException: Cannot load from object array because \"this.palette\" is null 0.0 0.0 false ",
      "notpng.png true com.sun.javafx.iio.ImageStorageException: No loader for image data 0.0 0.0 false ",
      "palette-badindex.png false null 4.0 3.0 true 999d85b3",
      "palette1.png false null 7.0 5.0 true 2f2a1cb2",
      "palette2.png false null 7.0 5.0 true 50fd6de7",
      "palette4.png false null 7.0 5.0 true ba65f899",
      "palette8.png false null 7.0 5.0 true ba65f899",
      "palette8trns.png false null 7.0 5.0 true a870fdd4",
      "photo.jpg true java.io.IOException: Java Arena's JavaFX reads only PNG images, and this is a JPEG image 0.0 0.0 false ",
      "rgb16.png false null 7.0 5.0 true 64afa1e7",
      "rgb4.png true java.io.IOException: Bad color type/bit depth combination! 0.0 0.0 false ",
      "rgb8.png false null 7.0 5.0 true b8b64960",
      "rgb8trns.png false null 7.0 5.0 true 520af2da",
      "rgba16.png false null 4.0 3.0 true f265ac5f",
      "rgba8.png false null 7.0 5.0 true 0c4105e1",
      "shortdata.png true java.io.EOFException 0.0 0.0 false ",
      "signature-only.png true java.io.EOFException 0.0 0.0 false ",
      "truncated.png true java.io.EOFException 0.0 0.0 false ",
      "zerowidth.png true java.io.IOException: Bad PNG image width, must be > 0! 0.0 0.0 false ",
      "zlibcut.png true java.io.EOFException: Unexpected end of ZLIB input stream 0.0 0.0 false ",
      "805000c7 0x5000c780 0.501960813999176 0x00000000 true true",
      "java.lang.IndexOutOfBoundsException: -1, 0",
      "java.lang.IndexOutOfBoundsException: 0, -1",
      "java.lang.IndexOutOfBoundsException: 7, 0",
      "java.lang.IndexOutOfBoundsException: 0, 5",
      "[missing.png] java.lang.IllegalArgumentException: Invalid URL: Invalid URL or resource not found",
      "[] java.lang.IllegalArgumentException: URL must not be empty",
      "[   ] java.lang.IllegalArgumentException: URL must not be empty",
      "[x:y] java.lang.IllegalArgumentException: Invalid URL: unknown protocol: x",
      "[C:/pic.png] java.lang.IllegalArgumentException: Invalid URL: unknown protocol: c",
      "[file:] true java.io.FileNotFoundException:  (No such file or directory) 0.0",
      "[FILE:rgb8.png] false null 7.0",
      "[file:rgb8.png?x=1] false null 7.0",
      "[file:missing.png] true java.io.FileNotFoundException: missing.png (No such file or directory) 0.0",
      "java.lang.NullPointerException: URL must not be null",
      "java.lang.NullPointerException: Input stream must not be null",
      "7.0 java.io.IOException: broken stream",
      "80ff8040 0 1ffffff ff3366cc 404c97e3 0 0x4c97e340 false 3.0 true",
      "java.lang.IndexOutOfBoundsException: 3, 0",
      "java.lang.IndexOutOfBoundsException: 0, 2",
      "java.lang.NullPointerException: Color cannot be null",
      "java.lang.IllegalArgumentException: Image dimensions must be positive (w,h > 0)",
      "java.lang.NullPointerException: Reader cannot be null",
      "java.lang.IllegalArgumentException: Image dimensions must be positive (w,h > 0)",
      "java.lang.NullPointerException: Reader cannot be null",
      "java.lang.ArrayIndexOutOfBoundsException: Index 35 out of bounds for length 35",
      "java.lang.ArrayIndexOutOfBoundsException: Index 107 out of bounds for length 105",
      "java.lang.ArrayIndexOutOfBoundsException: arraycopy: last source index 152 out of bounds for byte[140]",
      "java.lang.ArrayIndexOutOfBoundsException: arraycopy: last source index 28 out of bounds for byte[24]",
      "ff003cc8 ff003cc8 ff00ff00 0 10000ff",
      "true null ImageView[id=pic, styleClass=image-view] ImageView@H[styleClass=image-view] 7.0 true",
      "java.lang.IllegalArgumentException: Invalid URL: Invalid URL or resource not found",
    ].join("\n") + "\n");
});

const fxMouse = program(
  "mouse and slider events",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        Canvas canvas = new Canvas(300, 200);
        canvas.setOnMousePressed(e -> { System.out.println("pressed " + e.getX() + " " + e.getY() + " " + e.getSceneX() + " " + e.getSceneY() + " " + e.getEventType() + " " + (e.getSource() == canvas)); Platform.runLater(() -> System.out.println("  task from press")); });
        canvas.setOnMouseDragged(e -> System.out.println("dragged " + e.getX() + " " + e.getY() + " " + e.getEventType().getName()));
        canvas.setOnMouseReleased(e -> { System.out.println("released " + e.getX() + " " + e.getY()); Platform.runLater(() -> System.out.println("  task from release")); if (e.getX() > 280) { throw new IllegalStateException("release handler fails at " + e.getX()); } });
        canvas.setOnMouseClicked(e -> System.out.println("clicked " + e.getX() + " " + e.getY() + " " + e.getEventType()));
        WritableImage picture = new WritableImage(4, 3);
        for (int y = 0; y < 3; y++) {
            for (int x = 0; x < 4; x++) {
                picture.getPixelWriter().setArgb(x, y, x == 0 && y == 0 ? 0 : 0xff336699);
            }
        }
        ImageView view = new ImageView(picture);
        view.setOnMouseClicked(e -> System.out.println("view clicked " + e.getX() + " " + e.getY()));
        Canvas off = new Canvas(10, 10);
        off.setDisable(true);
        Canvas hidden = new Canvas(10, 10);
        hidden.setVisible(false);
        Slider slider = new Slider(0, 100, 0);
        slider.setSnapToTicks(true);
        slider.setMajorTickUnit(25);
        slider.setMinorTickCount(0);
        slider.valueProperty().addListener((obs, o, n) -> System.out.println("slider " + o + " -> " + n));
        Slider fine = new Slider(3, 50, 3);
        fine.setSnapToTicks(true);
        fine.setMajorTickUnit(10);
        fine.setMinorTickCount(1);
        fine.valueProperty().addListener((obs, o, n) -> System.out.println("fine " + o + " -> " + n));
        Slider free = new Slider(0, 10, 0);
        free.valueProperty().addListener((obs, o, n) -> System.out.println("free " + o + " -> " + n));
        Slider flat = new Slider(5, 5, 5);
        Slider offSlider = new Slider();
        offSlider.setDisable(true);
        Label label = new Label("L");
        label.setOnMouseClicked(e -> System.out.println("never: a label gets no mouse events here"));
        stage.setScene(new Scene(new VBox(canvas, view, off, hidden, slider, fine, free, flat, offSlider, label, new TextField(), new ImageView(new Image("file:none.png")))));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: "click Canvas 1 at 10 20\npress Canvas 1 at 10 20\ndrag Canvas 1 to 15 25\ndrag Canvas 1 to 15 25\ndrag Canvas 1 to 40 30.5\nrelease Canvas 1 at 40 30.5\npress Canvas 1 at 10 20\ndrag Canvas 1 to -20 20\nrelease Canvas 1 at -20 20\npress #1 at 10 20\nrelease Canvas 1 at 30 40\nclick Canvas 1 at 290 20\nclick Canvas 1 at 299.5 199.5\nclick Canvas 1 at 300 10\nclick Canvas 1 at 10 -1\npress Canvas 1 at 1 1\npress Canvas 1 at 2 2\nclick Canvas 1 at 3 3\nrelease Canvas 2 at 1 1\nrelease Canvas 1 at 1 1\ndrag Canvas 1 to 5 5\nrelease Canvas 1 at 5 5\nclick ImageView 1 at 1 0\nclick ImageView 1 at 0 0\nclick ImageView 1 at 4 1\nclick Canvas 2 at 1 1\npress Canvas 3 at 1 1\nclick Label 1 at 1 1\nclick Canvas 1\nclick ImageView 1\nset Slider 1 10\nset Slider 1 12.4\nset Slider 1 12.5\nset Slider 1 37.5\nset Slider 1 62.5\nset Slider 1 99\nset Slider 1 101\nset Slider 1 -3\nset Slider 2 4\nset Slider 2 7.9\nset Slider 2 8.1\nset Slider 2 49\nset Slider 3 3.3\nset Slider 4 5\nset Slider 5 1\nset Slider 1 \"ten\"\nset TextField 1 25\nset Label 1 25\ntype Slider 1 \"x\"\nclick ImageView 2 at 0 0\n" },
);
test("mouse events: press, drag, release and click at a point, in JavaFX's order (a click also after a drag ending on the node, none when the release is off it or its handler threw, no drag to where the mouse is), the tasks between press and release, and every problem", async () => {
  await runAll();
  const r = fxMouse.result;
  assert.equal(r.exitCode, 0);
  assert.equal(r.stdout, [
    "pressed 10.0 20.0 10.0 20.0 MOUSE_PRESSED true",
    "  task from press",
    "released 10.0 20.0",
    "clicked 10.0 20.0 MOUSE_CLICKED",
    "  task from release",
    "pressed 10.0 20.0 10.0 20.0 MOUSE_PRESSED true",
    "  task from press",
    "dragged 15.0 25.0 MOUSE_DRAGGED",
    "dragged 40.0 30.5 MOUSE_DRAGGED",
    "released 40.0 30.5",
    "clicked 40.0 30.5 MOUSE_CLICKED",
    "  task from release",
    "pressed 10.0 20.0 10.0 20.0 MOUSE_PRESSED true",
    "  task from press",
    "dragged -20.0 20.0 MOUSE_DRAGGED",
    "released -20.0 20.0",
    "  task from release",
    "pressed 290.0 20.0 290.0 20.0 MOUSE_PRESSED true",
    "  task from press",
    "released 290.0 20.0",
    "  task from release",
    "pressed 299.5 199.5 299.5 199.5 MOUSE_PRESSED true",
    "  task from press",
    "released 299.5 199.5",
    "  task from release",
    "pressed 1.0 1.0 1.0 1.0 MOUSE_PRESSED true",
    "  task from press",
    "released 1.0 1.0",
    "clicked 1.0 1.0 MOUSE_CLICKED",
    "  task from release",
    "view clicked 1.0 0.0",
    "slider 0.0 -> 25.0",
    "slider 25.0 -> 50.0",
    "slider 50.0 -> 75.0",
    "slider 75.0 -> 100.0",
    "fine 3.0 -> 8.0",
    "fine 8.0 -> 48.0",
    "free 0.0 -> 3.3",
    ].join("\n") + "\n");
  // The two releases at x > 280 throw: printed as uncaught exceptions, and no click follows.
  assert.deepEqual(r.stderr.split("\n").filter((l) => l.startsWith("Exception")), [
    'Exception in thread "JavaFX Application Thread" java.lang.IllegalStateException: release handler fails at 290.0',
    'Exception in thread "JavaFX Application Thread" java.lang.IllegalStateException: release handler fails at 299.5',
  ]);
  assert.deepEqual(r.window.problems, [
    "press #1 at 10 20: the mouse events with a point go to a canvas or an image view, not to a VBox (Java Arena doesn't lay the other nodes out, so it can't tell where a point is on them)",
    "release Canvas 1 at 30 40: the mouse isn't pressed: press it first, such as press Canvas 1 at 10 20",
    "click Canvas 1 at 300 10: (300, 10) isn't on the canvas, which is 300 x 200",
    "click Canvas 1 at 10 -1: (10, -1) isn't on the canvas, which is 300 x 200",
    "press Canvas 1 at 2 2: the mouse is already pressed: release it first, such as release Canvas 1 at 1 1",
    "click Canvas 1 at 3 3: the mouse is already pressed: release it first, such as release Canvas 1 at 1 1",
    "release Canvas 2 at 1 1: the mouse is pressed on another node: release it on the canvas it was pressed on",
    "drag Canvas 1 to 5 5: the mouse isn't pressed: press it first, such as press Canvas 1 at 10 20",
    "release Canvas 1 at 5 5: the mouse isn't pressed: press it first, such as press Canvas 1 at 10 20",
    "click ImageView 1 at 0 0: the image view's image is transparent at (0, 0), so the mouse goes through it",
    "click ImageView 1 at 4 1: (4, 1) isn't on the image view, whose image is 4 x 3",
    "click Canvas 2 at 1 1: the canvas is disabled (setDisable(true)), so it can't be clicked",
    "press Canvas 3 at 1 1: the canvas is hidden (setVisible(false)), so it can't be pressed",
    "click Label 1 at 1 1: the mouse events with a point go to a canvas or an image view, not to a label (Java Arena doesn't lay the other nodes out, so it can't tell where a point is on them)",
    "click Canvas 1: a canvas isn't clicked like a button: give the point, such as click Canvas 1 at 10 20",
    "click ImageView 1: an image view isn't clicked like a button: give the point, such as click ImageView 1 at 10 20",
    "set Slider 1 101: the slider goes from 0 to 100, so it can't be moved to 101",
    "set Slider 1 -3: the slider goes from 0 to 100, so it can't be moved to -3",
    "set Slider 5 1: the slider is disabled (setDisable(true)), so it can't be moved",
    "set Slider 1 \"ten\": a slider is set to a number, not a text, such as set Slider 1 25",
    "set TextField 1 25: the text for a text field goes in double quotes, such as set TextField 1 \"25\"",
    "set Label 1 25: only a slider is set to a number, not a label",
    "type Slider 1 \"x\": you can't type in a slider (set Slider 1 25 moves it)",
    "click ImageView 2 at 0 0: (0, 0) isn't on the image view: its image couldn't be read",
    ]);
  // A mouse handler on a label never runs here: the JSON says it has one, so the page can say so.
  const label = r.window.windows[0].scene.root.children.find((n) => n.type === "Label");
  assert.deepEqual(label, { n: label.n, type: "Label", text: "L", onMouseClicked: true });
});

const fxJson = program(
  "the window JSON of part 14's nodes",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) throws Exception {
        Thread.currentThread().setUncaughtExceptionHandler((th, e) -> System.out.println("UNCAUGHT " + e));
        Canvas canvas = new Canvas(30, 20);
        GraphicsContext g = canvas.getGraphicsContext2D();
        g.fillRect(1, 2, 3, 4.5);
        g.setFill(Color.web("#ff000080"));
        g.fillOval(0, 0, 10, 5);
        g.setStroke(Color.BLUE);
        g.setLineWidth(2.5);
        g.strokeRect(1, 1, 28, 18);
        g.strokeOval(2, 2, 4, 4);
        g.strokeLine(0, 20, 30, 0);
        g.clearRect(0, 0, 3, 3);
        g.setFont(Font.font("Serif", 18));
        g.fillText("Hi \\"q\\"", 1, 2);
        g.setFont(new Font("Times New Roman", 9));
        g.strokeText("x", 3, 4);
        g.fillPolygon(new double[] { 0, 10, 5 }, new double[] { 0, 0, 8 }, 3);
        g.strokePolygon(new double[] { 1, 2, 3 }, new double[] { 4, 5, 6 }, 2);
        g.fillRect(Double.NaN, Double.POSITIVE_INFINITY, -1, 1e10);
        canvas.setOnMousePressed(e -> { });
        canvas.setOnMouseClicked(e -> { });
        Canvas many = new Canvas(5, 5);
        for (int i = 0; i < 5005; i++) {
            many.getGraphicsContext2D().fillRect(i, 0, 1, 1);
        }
        WritableImage small = new WritableImage(2, 1);
        small.getPixelWriter().setArgb(0, 0, 0x80ff0000);
        small.getPixelWriter().setArgb(1, 0, 0xff00ff00);
        ImageView picture = new ImageView(small);
        picture.setOnMouseDragged(e -> { });
        ImageView none = new ImageView();
        ImageView broken = new ImageView("file:nope.png");
        ImageView big = new ImageView(new WritableImage(513, 1));
        Slider slider = new Slider(0, 10, 2.5);
        slider.setSnapToTicks(true);
        slider.setShowTickMarks(true);
        slider.setMajorTickUnit(25);
        slider.setPrefWidth(200);
        Slider plain = new Slider();
        NumberAxis years = new NumberAxis("Year", 2000, 2020, 5);
        LineChart<Number, Number> line = new LineChart<>(years, new NumberAxis());
        line.setTitle("T ä");
        line.setCreateSymbols(false);
        line.setLegendVisible(false);
        XYChart.Series<Number, Number> s = new XYChart.Series<>();
        s.setName("A");
        s.getData().addAll(new XYChart.Data<>(2000, 1), new XYChart.Data<>(2005, 2.5), new XYChart.Data<>(2010, 3.25f), new XYChart.Data<>(2015, 10000000000L), new XYChart.Data<>(2020, -0.0));
        XYChart.Series<Number, Number> empty = new XYChart.Series<>();
        line.getData().addAll(s, empty);
        CategoryAxis months = new CategoryAxis(FXCollections.observableArrayList("Jan", "Feb"));
        BarChart<String, Number> bars = new BarChart<>(months, new NumberAxis());
        XYChart.Series<String, Number> rain = new XYChart.Series<>("Rain", FXCollections.observableArrayList(new XYChart.Data<>("Jan", 5), new XYChart.Data<>("Mar", 7.5)));
        bars.getData().add(rain);
        ScatterChart<String, Number> scatter = new ScatterChart<>(new CategoryAxis(), new NumberAxis());
        scatter.getData().add(new XYChart.Series<>("P", FXCollections.observableArrayList(new XYChart.Data<>("b", 1), new XYChart.Data<>("a", 2), new XYChart.Data<>("b", 3))));
        Button breakIt = new Button("Null");
        breakIt.setOnAction(e -> {
            s.getData().add(new XYChart.Data<>(2025, null));
            System.out.println("added a null value");
        });
        stage.setScene(new Scene(new VBox(canvas, many, picture, none, broken, big, slider, plain, line, bars, scatter, breakIt)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
  { events: 'click Button "Null"\nclick Button "Null"\n' },
);
test("the window JSON of a canvas (every call with its state, the first 5000 calls), image views (CRC and RGBA pixels up to 512 x 512, none, an error), sliders and charts; a null value added after the window shows fails the layout once", async () => {
  await runAll();
  const r = fxJson.result;
  assert.equal(r.exitCode, 0, r.stderr);
  // As in JavaFX, the chart is laid out after the click (its next pulse), fails, and isn't laid out again.
  assert.equal(r.stdout, 'added a null value\nUNCAUGHT java.lang.NullPointerException: Cannot invoke "java.lang.Number.doubleValue()" because "<local3>" is null\nadded a null value\n');
  // The canvas, as the library writes it: keys in a fixed order, numbers as Java writes doubles, NaN and the infinities as strings.
  assert.ok(r.json.includes("{\"n\":2,\"type\":\"Canvas\",\"width\":30.0,\"height\":20.0,\"onMousePressed\":true,\"onMouseClicked\":true,\"calls\":[{\"op\":\"fillRect\",\"args\":[1.0,2.0,3.0,4.5],\"fill\":\"#000000\"},{\"op\":\"fillOval\",\"args\":[0.0,0.0,10.0,5.0],\"fill\":\"#ff000080\"},{\"op\":\"strokeRect\",\"args\":[1.0,1.0,28.0,18.0],\"stroke\":\"#0000ff\",\"lineWidth\":2.5},{\"op\":\"strokeOval\",\"args\":[2.0,2.0,4.0,4.0],\"stroke\":\"#0000ff\",\"lineWidth\":2.5},{\"op\":\"strokeLine\",\"args\":[0.0,20.0,30.0,0.0],\"stroke\":\"#0000ff\",\"lineWidth\":2.5},{\"op\":\"clearRect\",\"args\":[0.0,0.0,3.0,3.0]},{\"op\":\"fillText\",\"text\":\"Hi \\\"q\\\"\",\"args\":[1.0,2.0],\"fill\":\"#ff000080\",\"font\":{\"family\":\"Serif\",\"size\":18.0}},{\"op\":\"strokeText\",\"text\":\"x\",\"args\":[3.0,4.0],\"stroke\":\"#0000ff\",\"lineWidth\":2.5,\"font\":{\"family\":\"Times New Roman\",\"size\":9.0}},{\"op\":\"fillPolygon\",\"xs\":[0.0,10.0,5.0],\"ys\":[0.0,0.0,8.0],\"fill\":\"#ff000080\"},{\"op\":\"strokePolygon\",\"xs\":[1.0,2.0],\"ys\":[4.0,5.0],\"stroke\":\"#0000ff\",\"lineWidth\":2.5},{\"op\":\"fillRect\",\"args\":[\"NaN\",\"Infinity\",-1.0,1.0E10],\"fill\":\"#ff000080\"}]}"));
  const [, many, picture, none, broken, big, slider, plain, line, bars, scatter] = r.window.windows[0].scene.root.children;
  assert.equal(many.calls.length, 5000);
  assert.equal(many.callCount, 5005);
  assert.deepEqual(many.calls[4999], { op: "fillRect", args: [4999, 0, 1, 1], fill: "#000000" });
  // 0x80ff0000 is kept premultiplied, as in JavaFX (it reads back the same); the RGBA bytes aren't premultiplied.
  assert.equal(JSON.stringify(picture), "{\"n\":4,\"type\":\"ImageView\",\"onMouseDragged\":true,\"image\":{\"width\":2,\"height\":1,\"crc\":\"e90eeb00\",\"pixels\":\"/wAAgAD/AP8=\"}}");
  assert.deepEqual([...Buffer.from(picture.image.pixels, "base64")], [255, 0, 0, 128, 0, 255, 0, 255]);
  assert.equal(JSON.stringify(none), "{\"n\":5,\"type\":\"ImageView\",\"image\":null}");
  assert.equal(JSON.stringify(broken), "{\"n\":6,\"type\":\"ImageView\",\"image\":{\"error\":\"java.io.FileNotFoundException: nope.png (No such file or directory)\"}}");
  // Over 512 pixels wide: the size and CRC, no pixels.
  assert.equal(JSON.stringify(big), "{\"n\":7,\"type\":\"ImageView\",\"image\":{\"width\":513,\"height\":1,\"crc\":\"e80f8923\"}}");
  assert.equal(JSON.stringify(slider), "{\"n\":8,\"type\":\"Slider\",\"prefWidth\":200,\"min\":0,\"max\":10,\"value\":2.5,\"majorTickUnit\":25,\"minorTickCount\":3,\"blockIncrement\":10,\"showTickMarks\":true,\"snapToTicks\":true}");
  assert.equal(JSON.stringify(plain), "{\"n\":9,\"type\":\"Slider\",\"min\":0,\"max\":100,\"value\":0,\"majorTickUnit\":25,\"minorTickCount\":3,\"blockIncrement\":10}");
  // Whole numbers as they are (Integer, Long), Float and Double as Java writes them, null values (added by the clicks).
  assert.equal(JSON.stringify(line), "{\"n\":10,\"type\":\"LineChart\",\"title\":\"T \u00e4\",\"legendVisible\":false,\"createSymbols\":false,\"xAxis\":{\"type\":\"NumberAxis\",\"label\":\"Year\",\"autoRanging\":false,\"lowerBound\":2000,\"upperBound\":2020,\"tickUnit\":5,\"forceZeroInRange\":true,\"minorTickVisible\":true},\"yAxis\":{\"type\":\"NumberAxis\",\"label\":null,\"autoRanging\":true,\"lowerBound\":0,\"upperBound\":100,\"tickUnit\":5,\"forceZeroInRange\":true,\"minorTickVisible\":true},\"series\":[{\"name\":\"A\",\"data\":[[2000,1],[2005,2.5],[2010,3.25],[2015,10000000000],[2020,0],[2025,null],[2025,null]]},{\"name\":null,\"data\":[]}]}");
  assert.equal(JSON.stringify(bars), "{\"n\":11,\"type\":\"BarChart\",\"title\":null,\"xAxis\":{\"type\":\"CategoryAxis\",\"label\":null,\"autoRanging\":false,\"categories\":[\"Jan\",\"Feb\"]},\"yAxis\":{\"type\":\"NumberAxis\",\"label\":null,\"autoRanging\":true,\"lowerBound\":0,\"upperBound\":100,\"tickUnit\":5,\"forceZeroInRange\":true,\"minorTickVisible\":true},\"series\":[{\"name\":\"Rain\",\"data\":[[\"Jan\",5],[\"Mar\",7.5]]}]}");
  // An auto-ranging category axis took the data's categories, in order, when the window showed.
  assert.equal(JSON.stringify(scatter), "{\"n\":12,\"type\":\"ScatterChart\",\"title\":null,\"xAxis\":{\"type\":\"CategoryAxis\",\"label\":null,\"autoRanging\":true,\"categories\":[\"b\",\"a\"]},\"yAxis\":{\"type\":\"NumberAxis\",\"label\":null,\"autoRanging\":true,\"lowerBound\":0,\"upperBound\":100,\"tickUnit\":5,\"forceZeroInRange\":true,\"minorTickVisible\":true},\"series\":[{\"name\":\"P\",\"data\":[[\"b\",1],[\"a\",2],[\"b\",3]]}]}");
});

const fxTextStyles = program(
  "a canvas text's font style",
  `
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Canvas canvas = new Canvas(40, 20);
        GraphicsContext g = canvas.getGraphicsContext2D();
        g.fillText("a", 1, 10);
        g.setFont(new Font("Monospaced Bold", 12));
        g.fillText("b", 1, 10);
        g.setFont(new Font("serif italic", 14));
        g.strokeText("c", 1, 10);
        g.setFont(new Font("System Bold Italic", 9));
        g.fillText("d", 1, 10);
        System.out.println(g.getFont().getStyle() + " | " + Font.font("Serif", 5).getStyle() + " | " + Font.getDefault().getStyle());
        stage.setScene(new Scene(new VBox(canvas)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`,
);
test("a canvas text's font has its style when it isn't Regular (new Font(\"Monospaced Bold\", 12)), so it is drawn in it; Font.getStyle as JavaFX's", async () => {
  await runAll();
  const r = fxTextStyles.result;
  assert.equal(r.exitCode, 0, r.stderr);
  assert.equal(r.stdout, "Bold Italic | Regular | Regular\n");
  const fonts = r.window.windows[0].scene.root.children[0].calls.map((c) => JSON.stringify(c.font));
  assert.deepEqual(fonts, ['{"family":"System","size":13}', '{"family":"Monospaced","size":12,"style":"Bold"}', '{"family":"Serif","size":14,"style":"Italic"}', '{"family":"System","size":9,"style":"Bold Italic"}']);
});
