// Tests of src/grader/window.ts: the canonical outline of a window (what grading and the
// JDK-versus-browser checks compare), event lines in plain words, the event parser (which must read
// a line exactly as Java Arena's JavaFX does), and the check of a test's window. The parts that
// meet the library are checked against real runs on the reference JDK (JAVA_HOME, or
// scripts/get-jdk.sh). Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { EVENTS_FILE, JAVAFX_LIBRARY, WINDOW_FILE } from "../src/grader/javafx.js";
import {
  CLOSED_WINDOW,
  NO_WINDOW,
  checkWindow,
  compareOutlines,
  describeEvent,
  describeEvents,
  eventLines,
  eventProblems,
  eventsFileText,
  parseEventLine,
  parseWindow,
  windowExample,
  windowNote,
  windowOutline,
  withEventsFile,
} from "../src/grader/window.ts";
import { REFERENCE_JVM_FLAGS, referenceJavaHome } from "./fidelity/suite.mjs";
import { javaRunArgs } from "./javafx/reference.mjs";
import { libraryDir } from "./libraries.mjs";

// ------------------------------------------------------------------ the outline

const node = (n, type, fields = {}) => ({ n, type, ...fields });

test("the outline: one line per window and node, two spaces per level, settings and flags only when set", () => {
  const w = {
    windows: [
      {
        title: "Counter",
        width: 300.0,
        height: 200.0,
        scene: {
          width: 300.0,
          height: 200.0,
          root: node(1, "VBox", {
            padding: [10.0, 10.0, 10.0, 10.0],
            spacing: 10.0,
            children: [
              node(2, "Label", { text: "Clicks: 2" }),
              node(3, "HBox", { spacing: 5.0, children: [node(4, "Button", { text: "Add", onAction: true }), node(5, "Button", { text: "Reset", disable: true, onAction: true })] }),
            ],
          }),
        },
      },
    ],
    problems: [],
  };
  assert.equal(windowOutline(w), 'Window "Counter"\n  VBox spacing 10, padding 10\n    Label "Clicks: 2"\n    HBox spacing 5\n      Button "Add"\n      Button "Reset" (disabled)');
});

test("the outline: every field, BorderPane regions, GridPane cells and spans, several windows, odd values", () => {
  const w = {
    windows: [
      {
        title: null,
        scene: {
          root: node(1, "BorderPane", {
            id: "main",
            style: "-fx-background-color: white",
            padding: [2.0, 4.0, 2.0, 4.5],
            top: node(2, "Label", { text: 'Say "hi"\\now', font: { family: "Times New Roman", size: 18.0 }, wrapText: true }),
            left: node(3, "Label", { text: null, font: null }),
            center: node(4, "GridPane", {
              hgap: 4.0,
              vgap: 2.0,
              alignment: "CENTER",
              children: [
                node(5, "TextField", { column: 0, row: 0, text: "", promptText: "Name", prefWidth: 160.0, editable: false, onAction: true }),
                node(6, "TextArea", { column: 1, row: 0, columnSpan: 2, text: "a\tb", prefWidth: "NaN", prefHeight: 60.5 }),
                node(7, "PasswordField", { column: 0, row: 1, rowSpan: 3, text: "s3crét", disable: true, visible: false }),
              ],
            }),
            right: node(8, "StackPane", { alignment: "TOP_RIGHT", children: [] }),
            bottom: node(9, "FlowPane", { hgap: 6.0, alignment: null, children: [node(10, "Button", { text: "OK", font: { family: "Serif", size: 22.0 } })] }),
          }),
        },
      },
      { title: "Empty", scene: null },
    ],
    problems: ["click Button \"x\": there's no button with the text \"x\""],
  };
  assert.equal(
    windowOutline(w),
    [
      "Window without a title",
      '  BorderPane #main, padding 2 4 2 4.5, style "-fx-background-color: white"',
      '    top: Label "Say \\"hi\\"\\\\now", font "Times New Roman" 18 (wraps text)',
      "    left: Label null, font null",
      "    center: GridPane hgap 4, vgap 2, alignment CENTER",
      '      (0, 0) TextField "", prompt "Name", pref width 160 (not editable)',
      '      (1, 0) span 2x1 TextArea "a\\tb", pref width NaN, pref height 60.5',
      '      (0, 1) span 1x3 PasswordField "s3crét" (disabled, hidden)',
      "    right: StackPane alignment TOP_RIGHT",
      '    bottom: FlowPane hgap 6, alignment null',
      '      Button "OK", font Serif 22',
      'Window "Empty"',
      "  (no scene)",
    ].join("\n"),
  );
  // Problems, sizes, node numbers and onAction aren't in it.
  const bare = JSON.parse(JSON.stringify(w));
  bare.problems = [];
  bare.windows[0].scene.root.center.children[0].onAction = undefined;
  bare.windows[0].width = 99;
  assert.equal(windowOutline(bare), windowOutline(w));
});

test("the outline without a window: none written, none showing, or the windows closed", () => {
  assert.equal(windowOutline(null), NO_WINDOW);
  assert.equal(windowOutline({ windows: [], problems: [] }), "No window is open.");
  assert.equal(windowOutline({ windows: [], closed: true, problems: [] }), CLOSED_WINDOW);
  assert.equal(parseWindow(null), null);
  assert.equal(parseWindow(""), null);
  assert.equal(parseWindow("{not json"), null);
  assert.equal(parseWindow('{"windows":{}}'), null);
  assert.deepEqual(parseWindow('{"windows":[],"closed":true,"problems":[]}'), { windows: [], closed: true, problems: [] });
});

test("compareOutlines marks the lines that aren't in both", () => {
  const a = 'Window "A"\n  VBox\n    Label "1"\n    Button "Add"';
  const b = 'Window "A"\n  VBox\n    Label "2"\n    Button "Add"\n    Button "Reset"';
  assert.deepEqual(compareOutlines(a, b), {
    expected: [
      { text: 'Window "A"', differs: false },
      { text: "  VBox", differs: false },
      { text: '    Label "1"', differs: true },
      { text: '    Button "Add"', differs: false },
    ],
    got: [
      { text: 'Window "A"', differs: false },
      { text: "  VBox", differs: false },
      { text: '    Label "2"', differs: true },
      { text: '    Button "Add"', differs: false },
      { text: '    Button "Reset"', differs: true },
    ],
  });
  assert.ok(compareOutlines(a, a).expected.every((l) => !l.differs));
});

// ------------------------------------------------------------------ events

test("event lines in plain words, for the task card", () => {
  assert.equal(describeEvent('click Button "Greet"'), 'click "Greet"');
  assert.equal(describeEvent('type TextField 1 "Ada"'), 'type "Ada" in text field 1');
  assert.equal(describeEvent('set TextArea 2 "two\\nlines"'), 'replace the text in text area 2 with "two\\nlines"');
  assert.equal(describeEvent("enter PasswordField 1"), "press Enter in password field 1");
  assert.equal(describeEvent("close"), "close the window");
  assert.equal(describeEvent("click #3"), "click node #3");
  assert.equal(describeEvent("click #add-button"), 'click the node with the id "add-button"');
  assert.equal(describeEvent("click Button 2"), "click button 2");
  assert.equal(describeEvent('click Label "Menu"'), 'click the label "Menu"');
  assert.equal(describeEvent('type TextField "Ada" "!"'), 'type "!" in the text field that holds "Ada"');
  assert.equal(describeEvent("click VBox 1"), "click VBox 1");
  // A line that can't be read stays as it is.
  assert.equal(describeEvent("jump #1"), "jump #1");
  assert.equal(describeEvents(['type TextField 1 "Ada"', 'click Button "Greet"']), 'Type "Ada" in text field 1, then click "Greet"');
  assert.equal(describeEvents(['type TextField 1 "Ada"', "enter TextField 1", "// a comment", "", 'click Button "Greet"']), 'Type "Ada" in text field 1, press Enter in text field 1, then click "Greet"');
  assert.equal(describeEvents(["close"]), "Close the window");
  assert.equal(describeEvents([]), "No clicks or typing: the window as it opens");
});

test("the events file: one line each, blank lines and comments left out", () => {
  assert.deepEqual(eventLines('  click Button "A"  \n\n// note\r\nclose\r\n'), ['click Button "A"', "close"]);
  assert.equal(eventsFileText(['click Button "A"', "close"]), 'click Button "A"\nclose\n');
  assert.equal(eventsFileText([]), "");
  assert.deepEqual(withEventsFile({ "a.txt": "1\n" }, ["close"]), { "a.txt": "1\n", [EVENTS_FILE]: "close\n" });
  assert.deepEqual(withEventsFile(undefined, []), { [EVENTS_FILE]: "" });
  assert.deepEqual(withEventsFile(null, []), { [EVENTS_FILE]: "" });
});

test("parseEventLine reads targets and text as the library does", () => {
  assert.deepEqual(parseEventLine('  type TextField 1 "a\\"b\\\\c\\u00e4\\uuu0041\\t"  '), { line: 'type TextField 1 "a\\"b\\\\c\\u00e4\\uuu0041\\t"', command: "type", target: { kind: "index", type: "TextField", index: 1 }, text: 'a"b\\cäA\t' });
  assert.deepEqual(parseEventLine('click Button "Add"'), { line: 'click Button "Add"', command: "click", target: { kind: "text", type: "Button", text: "Add" } });
  assert.deepEqual(parseEventLine("click #12"), { line: "click #12", command: "click", target: { kind: "number", n: 12 } });
  assert.deepEqual(parseEventLine("click #ok_2-b"), { line: "click #ok_2-b", command: "click", target: { kind: "id", id: "ok_2-b" } });
  assert.deepEqual(parseEventLine("close"), { line: "close", command: "close" });
  assert.equal(parseEventLine("   "), null);
  assert.equal(parseEventLine("// click Button 1"), null);
});

// ------------------------------------------------------------------ checking a test's window

const EXPECTED = { windows: [{ title: "Hi", scene: { root: node(1, "VBox", { children: [node(2, "Label", { text: "Hello, Ada!" }), node(3, "TextField", { text: "Ada" })] }) } }], problems: [] };
const OUTLINE = windowOutline(EXPECTED);
const EVENTS = ['type TextField 1 "Ada"', "enter TextField 1"];
const json = (w) => JSON.stringify(w);

test("checkWindow: the same outline passes (node numbers and handlers don't count)", () => {
  const same = JSON.parse(json(EXPECTED));
  same.windows[0].scene.root.children[1].onAction = true;
  same.windows[0].width = 500;
  const c = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED }, json(same));
  assert.equal(c.pass, true);
  assert.equal(c.matches, true);
  assert.equal(c.missing, false);
  assert.equal(c.lines, undefined);
  assert.equal(c.eventsInWords, 'Type "Ada" in text field 1, then press Enter in text field 1');
  assert.equal(windowNote(c), undefined);
});

test("checkWindow: a different window gives both outlines and the lines that differ; a hidden test gives neither", () => {
  const other = JSON.parse(json(EXPECTED));
  other.windows[0].scene.root.children[0].text = "Hello, !";
  const c = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED }, json(other));
  assert.equal(c.pass, false);
  assert.equal(c.expectedOutline, OUTLINE);
  assert.equal(c.gotOutline, 'Window "Hi"\n  VBox\n    Label "Hello, !"\n    TextField "Ada"');
  assert.deepEqual(c.expected, EXPECTED);
  assert.deepEqual(
    c.lines.got.filter((l) => l.differs).map((l) => l.text),
    ['    Label "Hello, !"'],
  );
  assert.equal(windowNote(c), "After these clicks and typing, your window isn't what it should be.");
  const hidden = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED, hidden: true }, json(other));
  assert.deepEqual(Object.keys(hidden).sort(), ["events", "eventsInWords", "matches", "missing", "neverShown", "pass", "problems"]);
  assert.equal(windowNote(hidden, true), "After this test's clicks and typing, your window isn't what it should be.");
  assert.equal(windowNote(checkWindow({ events: [], outline: OUTLINE }, json(other))), "When it opens, your window isn't what it should be.");
  // A hidden test without events checks the window as it opens: the note says so, not "this test's clicks and typing".
  assert.equal(windowNote(checkWindow({ events: [], outline: OUTLINE, hidden: true }, json(other)), true), "When it opens, your window isn't what it should be.");
});

test("checkWindow: problems fail the test, each with its event in plain words; no window file is 'missing'", () => {
  const withProblem = { ...EXPECTED, problems: ['type TextField 1 "Ada": the text field isn\'t editable (setEditable(false)), so you can\'t type in it'] };
  const c = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED }, json(withProblem));
  assert.equal(c.matches, true);
  assert.equal(c.pass, false);
  assert.deepEqual(c.problems, [{ event: 'type TextField 1 "Ada"', words: 'Type "Ada" in text field 1', problem: "the text field isn't editable (setEditable(false)), so you can't type in it" }]);
  assert.equal(windowNote(c), "One of the clicks or typing couldn't happen in your window.");
  const none = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED }, undefined);
  assert.equal(none.missing, true);
  assert.equal(none.pass, false);
  assert.equal(none.got, null);
  assert.equal(none.gotOutline, NO_WINDOW);
  assert.match(windowNote(none), /didn't leave a window/);
  // No window file never comes from a start without show() (that run still writes one): the note names what does lead here.
  assert.equal(windowNote(none), "Your program didn't leave a window: main must call launch, as in launch(Main.class), and nothing may end the program before its window is written, such as System.exit in start or in a handler, or an exception from start that main catches.");
  assert.doesNotMatch(windowNote(none), /show/);
  // A window file with no window, not closed: start never called show(). Closed windows are another matter.
  const notShown = checkWindow({ events: [], outline: OUTLINE, window: EXPECTED }, json({ windows: [], problems: [] }));
  assert.equal(notShown.missing, false);
  assert.equal(notShown.neverShown, true);
  assert.equal(windowNote(notShown), "Your program didn't show a window: start must show the stage with stage.show().");
  assert.equal(windowNote(checkWindow({ events: [], outline: OUTLINE, hidden: true }, json({ windows: [], problems: [] })), true), "Your program didn't show a window: start must show the stage with stage.show().");
  const closed = checkWindow({ events: ["close"], outline: OUTLINE, window: EXPECTED }, json({ windows: [], closed: true, problems: [] }));
  assert.equal(closed.neverShown, false);
  assert.equal(windowNote(closed), "After these clicks and typing, your window isn't what it should be.");
  // Problems are matched to their lines in order; one that names no line is kept as it is.
  assert.deepEqual(eventProblems(["close", "jump", "close"], ["close: the main window isn't open", "jump: there's no event called jump (the events are click, type, set, enter and close)", "close: the main window isn't open", "odd"]), [
    { event: "close", words: "Close the window", problem: "the main window isn't open" },
    { event: "jump", words: "jump", problem: "there's no event called jump (the events are click, type, set, enter and close)" },
    { event: "close", words: "Close the window", problem: "the main window isn't open" },
    { event: "", words: "", problem: "odd" },
  ]);
});

test("a java window example's stored block can be read back", () => {
  const data = { events: ["close"], window: { windows: [], closed: true, problems: [] }, outline: CLOSED_WINDOW };
  assert.deepEqual(windowExample(JSON.stringify(data)), data);
  assert.equal(windowExample("{}"), null);
  assert.equal(windowExample("nope"), null);
});

// ------------------------------------------------------------------ against the library (reference JDK)

const javaHome = referenceJavaHome();
const env = { ...process.env, LC_ALL: "C.UTF-8" };
delete env.JAVA_TOOL_OPTIONS;
const tmp = mkdtempSync(join(tmpdir(), "java-arena-window-test-"));
process.on("exit", () => rmSync(tmp, { recursive: true, force: true }));

/** Compiles and runs a JavaFX program (Main.java) on the reference JDK with these events; its window JSON. */
function runWithEvents(name, source, events) {
  const dir = join(tmp, name);
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(join(dir, "src", "Main.java"), source);
  const lib = libraryDir(JAVAFX_LIBRARY);
  const classes = join(dir, "classes");
  const c = spawnSync(join(javaHome, "bin", "javac"), ["-encoding", "UTF-8", "-d", classes, "-cp", lib, join(dir, "src", "Main.java")], { env, encoding: "utf8" });
  assert.equal(c.status, 0, c.stdout + c.stderr);
  const cwd = join(dir, "run");
  mkdirSync(join(cwd, ".arena"), { recursive: true });
  writeFileSync(join(cwd, EVENTS_FILE), events);
  const r = spawnSync(join(javaHome, "bin", "java"), [...REFERENCE_JVM_FLAGS, ...javaRunArgs({ javaHome, libraries: [JAVAFX_LIBRARY], classPath: [classes, lib].join(delimiter), mainClass: "Main" })], { cwd, env, encoding: "utf8", timeout: 60_000 });
  const file = join(cwd, WINDOW_FILE);
  return { stdout: r.stdout, stderr: r.stderr, status: r.status, json: existsSync(file) ? readFileSync(file, "utf8") : null };
}

const COUNTER = `import javafx.application.Application;
import javafx.geometry.Insets;
import javafx.geometry.Pos;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextArea;
import javafx.scene.control.TextField;
import javafx.scene.layout.BorderPane;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.HBox;
import javafx.scene.layout.VBox;
import javafx.scene.text.Font;
import javafx.stage.Stage;

public class Main extends Application {
    private int clicks;

    @Override
    public void start(Stage stage) {
        Label label = new Label("Clicks: 0");
        Button add = new Button("Add");
        Button reset = new Button("Reset");
        reset.setDisable(true);
        add.setOnAction(e -> {
            label.setText("Clicks: " + ++clicks);
            reset.setDisable(false);
        });
        reset.setOnAction(e -> label.setText("Clicks: " + (clicks = 0)));
        TextField name = new TextField();
        name.setPromptText("Your name");
        Label greeting = new Label();
        greeting.setFont(Font.font("Times New Roman", 18));
        name.setOnAction(e -> greeting.setText("Hello, " + name.getText() + "!"));
        GridPane grid = new GridPane();
        grid.setHgap(4);
        grid.add(new Label("Notes"), 0, 0);
        TextArea notes = new TextArea();
        notes.setWrapText(true);
        grid.add(notes, 1, 0, 2, 1);
        BorderPane border = new BorderPane();
        border.setTop(new Label("Top"));
        border.setCenter(grid);
        VBox root = new VBox(10, label, new HBox(5, add, reset), name, greeting, border);
        root.setPadding(new Insets(10));
        root.setAlignment(Pos.TOP_CENTER);
        stage.setTitle("Counter");
        stage.setScene(new Scene(root, 300, 200));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`;

test("the outline of a window the library wrote, after clicks, typing, Enter and set", () => {
  const r = runWithEvents("counter", COUNTER, 'click Button "Add"\nclick Button "Add"\ntype TextField 1 "Ada"\nenter TextField 1\nset TextArea 1 "two\\nlines"\n');
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  const w = parseWindow(r.json);
  assert.deepEqual(w.problems, []);
  assert.equal(
    windowOutline(w),
    [
      'Window "Counter"',
      "  VBox spacing 10, padding 10, alignment TOP_CENTER",
      '    Label "Clicks: 2"',
      "    HBox spacing 5",
      '      Button "Add"',
      '      Button "Reset"',
      '    TextField "Ada", prompt "Your name"',
      '    Label "Hello, Ada!", font "Times New Roman" 18',
      "    BorderPane",
      '      top: Label "Top"',
      "      center: GridPane hgap 4",
      '        (0, 0) Label "Notes"',
      '        (1, 0) span 2x1 TextArea "two\\nlines" (wraps text)',
    ].join("\n"),
  );
  // close ends the session with the windows closed.
  const closed = runWithEvents("counter-closed", COUNTER, "close\n");
  assert.equal(windowOutline(parseWindow(closed.json)), CLOSED_WINDOW);
});

test("parseEventLine gives the library's own words for every line it can't read", () => {
  const unreadable = [
    "click #0",
    "click #a.b",
    'click Buton "Add"',
    "click Button",
    'type TextField "x"',
    "type TextField 1",
    'click "Add"',
    "click",
    "Click #4",
    "jump #4",
    '"jump" #4',
    'type TextField 1 "open',
    'type TextField 1 "bad \\q"',
    'type TextField 1 "bad \\u12"',
    'type TextField 1 "bad \\',
    'click #4 "extra"',
    "close now",
    "type TextField 0 \"x\"",
    "click 3",
    "click Button 1 2",
    'set TextArea "a"',
    "enter",
  ];
  const fromJs = unreadable.map((line) => {
    const e = parseEventLine(line);
    assert.ok(e && e.problem !== undefined, `JavaScript reads ${line}`);
    return `${line}: ${e.problem}`;
  });
  const r = runWithEvents("unreadable", COUNTER, unreadable.join("\n") + "\n");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(parseWindow(r.json).problems, fromJs);
});

test("parseEventLine and the library read lines with characters beyond ASCII the same way, with no Unicode tables", () => {
  // Can't be read on either side: a \u escape takes ASCII hexadecimal digits only (not fullwidth or
  // Arabic-Indic ones), a class's name is ASCII letters, digits, _ and $ or any character from
  // U+0080 on (so DEL isn't one, and a name with U+200B, U+00AD or a letter of Unicode 15.1 or 16 is
  // a class Java Arena doesn't know).
  const unreadable = [
    'type TextField 1 "bad \\u\uff10\uff10e4"',
    'type TextField 1 "bad \\u\u0660\u0660e4"',
    "click Bu\u200btton 1",
    "click Bu\u00adtton 1",
    "click Bu\u007ftton 1",
    "click B\u{2ebf0} 1",
    "click \u{10d4a} 1",
    "click B\u0085utton 1",
    'click #a\u007f',
  ];
  const fromJs = unreadable.map((line) => {
    const e = parseEventLine(line);
    assert.ok(e && e.problem !== undefined, `JavaScript reads ${line}`);
    return `${line}: ${e.problem}`;
  });
  // Ids with characters beyond ASCII (supplementary letters, a letter of Unicode 15.1, an Arabic-Indic
  // digit first, Finnish letters, U+200B) are ids on both sides: the window has none of them.
  const ids = ["click #\u{1d400}dd", "click #a\u{1d7ce}", "click #\u{2ebf0}", "click #\u0660", "click #lis\u00e4\u00e4", "click #a\u200b"];
  for (const line of ids) {
    const e = parseEventLine(line);
    assert.equal(e?.problem, undefined, `${line}: ${e?.problem}`);
    assert.equal(e.target.kind, "id", line);
  }
  const r = runWithEvents("beyond-ascii", COUNTER, [...unreadable, ...ids].join("\n") + "\n");
  assert.equal(r.status, 0, r.stderr);
  const problems = parseWindow(r.json).problems;
  assert.deepEqual(problems.slice(0, unreadable.length), fromJs);
  assert.deepEqual(
    problems.slice(unreadable.length),
    ids.map((line) => `${line}: there's no node with the id "${parseEventLine(line).target.id}"`),
  );
});
