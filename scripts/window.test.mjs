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
import { crc32 } from "node:zlib";
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
  framesInEvents,
  javaNumber,
  keyName,
  keyNameProblem,
  mouseNotices,
  parseEventLine,
  parseWindow,
  TEST_FRAMES_WARN,
  testWindow,
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
  assert.equal(describeEvents([]), "Nothing: the window as it opens");
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
  assert.equal(windowNote(c), "After what the user does here, your window isn't what it should be.");
  const hidden = checkWindow({ events: EVENTS, outline: OUTLINE, window: EXPECTED, hidden: true }, json(other));
  assert.deepEqual(Object.keys(hidden).sort(), ["events", "eventsInWords", "matches", "missing", "mouseNotices", "neverShown", "pass", "problems"]);
  assert.equal(windowNote(hidden, true), "After what the user does in this test, your window isn't what it should be.");
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
  assert.equal(windowNote(c), "One of the things the user does couldn't happen in your window.");
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
  assert.equal(windowNote(closed), "After what the user does here, your window isn't what it should be.");
  // Problems are matched to their lines in order; one that names no line is kept as it is.
  assert.deepEqual(eventProblems(["close", "jump", "close"], ["close: the main window isn't open", "jump: there's no event called jump (the events are click, type, set, enter, close, press, drag, release, press key, release key, key and frames)", "close: the main window isn't open", "odd"]), [
    { event: "close", words: "Close the window", problem: "the main window isn't open" },
    { event: "jump", words: "jump", problem: "there's no event called jump (the events are click, type, set, enter, close, press, drag, release, press key, release key, key and frames)" },
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

// ------------------------------------------------------------------ part 14: canvas, image view, slider, charts, the mouse

test("javaNumber writes a number as Java writes a double, without a trailing .0", () => {
  const cases = [
    [10, "10"],
    [2.5, "2.5"],
    [-0, "-0"],
    [0, "0"],
    [0.001, "0.001"],
    [0.0009, "9.0E-4"],
    [1e7, "1.0E7"],
    [9999999.5, "9999999.5"],
    [123456.789, "123456.789"],
    [1.5e-4, "1.5E-4"],
    [1e21, "1.0E21"],
    [1e10, "1.0E10"],
    [0.1 + 0.2, "0.30000000000000004"],
    [5e-324, "4.9E-324"],
    [-12.25, "-12.25"],
    ["NaN", "NaN"],
    ["-Infinity", "-Infinity"],
  ];
  for (const [v, want] of cases) assert.equal(javaNumber(v), want, String(v));
});

const call = (op, rest) => ({ op, ...rest });
test("the outline of a canvas: its size, then one line per drawing call with the state it used; at most 2000 lines", () => {
  const canvas = node(2, "Canvas", {
    id: "pad",
    width: 300.0,
    height: 200.5,
    onMousePressed: true,
    calls: [
      call("fillRect", { args: [10.0, 10.0, 50.0, 30.0], fill: "#ff0000" }),
      call("strokeRect", { args: [1.0, 1.0, 298.0, 198.0], stroke: "#00008b", lineWidth: 2.5 }),
      call("clearRect", { args: [0.0, 0.0, 300.0, 200.0] }),
      call("fillOval", { args: [-5.0, "NaN", 1.0e10, 0.25], fill: "#ff000080" }),
      call("strokeOval", { args: [2.0, 2.0, 4.0, 4.0], stroke: "#000000", lineWidth: 1.0 }),
      call("strokeLine", { args: [0.0, 0.0, 100.0, 50.0], stroke: "#000000", lineWidth: 2.0 }),
      call("fillText", { text: 'Hi "q"\n', args: [20.0, 40.0], fill: "#000000", font: { family: "System", size: 13.0 } }),
      call("strokeText", { text: "x", args: [3.0, 4.0], stroke: "#0000ff", lineWidth: 2.5, font: { family: "Times New Roman", size: 9.0 } }),
      call("fillPolygon", { xs: [0.0, 10.0, 5.0], ys: [0.0, 0.0, 8.0], fill: "#00ff00" }),
      call("strokePolygon", { xs: [1.0, 2.0], ys: [4.0, 5.0], stroke: "#0000ff", lineWidth: 2.5 }),
    ],
  });
  const w = { windows: [{ title: "Paint", scene: { root: node(1, "VBox", { children: [canvas, node(3, "Canvas", { width: 0.0, height: 0.0, calls: [], visible: false, style: "-fx-x: 1" })] }) } }], problems: [] };
  assert.equal(
    windowOutline(w),
    [
      'Window "Paint"',
      "  VBox",
      "    Canvas #pad 300 x 200.5",
      "      fillRect 10 10 50 30, fill #ff0000",
      "      strokeRect 1 1 298 198, stroke #00008b, width 2.5",
      "      clearRect 0 0 300 200",
      "      fillOval -5 NaN 1.0E10 0.25, fill #ff000080",
      "      strokeOval 2 2 4 4, stroke #000000, width 1",
      "      strokeLine 0 0 100 50, stroke #000000, width 2",
      '      fillText "Hi \\"q\\"\\n" 20 40, fill #000000, font System 13',
      '      strokeText "x" 3 4, stroke #0000ff, width 2.5, font "Times New Roman" 9',
      "      fillPolygon (0, 0) (10, 0) (5, 8), fill #00ff00",
      "      strokePolygon (1, 4) (2, 5), stroke #0000ff, width 2.5",
      '    Canvas 0 x 0, style "-fx-x: 1" (hidden)',
    ].join("\n"),
  );
  // More than 2000 calls: the first 2000, then a count; past the 5000 the library keeps, a note too.
  const rects = (n) => Array.from({ length: n }, (_, i) => call("fillRect", { args: [i, 0.0, 1.0, 1.0], fill: "#000000" }));
  const many = (calls, callCount) => windowOutline({ windows: [{ title: null, scene: { root: node(1, "Canvas", { width: 5.0, height: 5.0, calls, ...(callCount ? { callCount } : {}) }) } }], problems: [] }).split("\n");
  const lines = many(rects(2001));
  assert.equal(lines.length, 2 + 2000 + 1);
  assert.equal(lines[2001], "    fillRect 1999 0 1 1, fill #000000");
  assert.equal(lines[2002], "    ... and 1 more calls");
  assert.equal(many(rects(2000)).length, 2002);
  assert.equal(many(rects(5000), 5005).at(-1), "    ... and 3005 more calls (the drawing shows the first 5000)");
});

test("mouse handlers on a node other than a canvas or an image view are named, since they never run in Java Arena (not in the outline)", () => {
  const w = {
    windows: [
      {
        title: null,
        scene: {
          root: node(1, "BorderPane", {
            top: node(2, "Button", { text: "Hi", onAction: true, onMouseClicked: true }),
            center: node(3, "VBox", {
              onMousePressed: true,
              onMouseReleased: true,
              children: [node(4, "Label", { text: "x", onMouseDragged: true }), node(5, "Canvas", { width: 10.0, height: 10.0, calls: [], onMouseClicked: true }), node(6, "ImageView", { image: null, onMousePressed: true }), node(7, "Button", { text: "Quiet" })],
            }),
          }),
        },
      },
    ],
    problems: [],
  };
  assert.deepEqual(mouseNotices(w), [
    'The button "Hi" has setOnMouseClicked, which never runs in Java Arena: a click on a button here runs its setOnAction, and mouse handlers run only on a Canvas or an ImageView.',
    "The VBox has setOnMousePressed and setOnMouseReleased, which never run in Java Arena: mouse handlers run only on a Canvas or an ImageView.",
    'The label "x" has setOnMouseDragged, which never runs in Java Arena: mouse handlers run only on a Canvas or an ImageView.',
  ]);
  assert.deepEqual(mouseNotices(null), []);
  assert.equal(windowOutline(w).includes("Mouse"), false);
  const outline = windowOutline(w);
  assert.deepEqual(checkWindow({ events: [], outline }, JSON.stringify(w)).mouseNotices.length, 3);
});

test("the outline of image views, sliders and charts", () => {
  const axis = (fields) => ({ type: "NumberAxis", label: null, autoRanging: true, lowerBound: 0.0, upperBound: 100.0, tickUnit: 5.0, forceZeroInRange: true, minorTickVisible: true, ...fields });
  const nodes = [
    node(2, "ImageView", { id: "pic", onMouseClicked: true, image: { width: 64.0, height: 48.0, crc: "3f2a9c1e", pixels: "AAAA" } }),
    node(3, "ImageView", { image: null }),
    node(4, "ImageView", { image: { error: "java.io.FileNotFoundException: nope.png (No such file or directory)" }, visible: false }),
    node(5, "ImageView", { image: { width: 513.0, height: 1.0, crc: "e80f8923" } }),
    node(6, "Slider", { min: 0.0, max: 100.0, value: 25.0, majorTickUnit: 25.0, minorTickCount: 3, blockIncrement: 10.0 }),
    node(7, "Slider", { id: "s", prefWidth: 200.0, disable: true, min: -1.5, max: 1.0e7, value: 0.5, majorTickUnit: 10.0, minorTickCount: 1, blockIncrement: 1.0, showTickLabels: true, showTickMarks: true, snapToTicks: true }),
    node(8, "LineChart", {
      title: "Population",
      createSymbols: false,
      xAxis: axis({ label: "Year", autoRanging: false, lowerBound: 2000.0, upperBound: 2020.0 }),
      yAxis: axis({ label: "People" }),
      series: [
        { name: "Helsinki", data: [[2000, 555], [2005, 560.5], [2010, 1e10], [2015, null], null] },
        { name: null, data: [] },
        { name: "No list", data: null },
        null,
      ],
    }),
    node(9, "BarChart", { prefHeight: 300.0, title: null, legendVisible: false, xAxis: { type: "CategoryAxis", label: "Month", autoRanging: false, categories: ["Jan", "Feb"] }, yAxis: axis({ autoRanging: false, lowerBound: 0.0, upperBound: 30.0, tickUnit: 10.0 }), series: [{ name: "Rain", data: [["Jan", 12.5], ['"Q"', 0]] }] }),
    node(10, "ScatterChart", { title: "", xAxis: axis({ autoRanging: false, lowerBound: -1.0, upperBound: 1.0, tickUnit: 0.5 }), yAxis: { type: "CategoryAxis", label: null, autoRanging: true, categories: ["a"] }, series: null }),
  ];
  const w = { windows: [{ title: "All", scene: { root: node(1, "VBox", { children: nodes }) } }], problems: [] };
  assert.equal(
    windowOutline(w),
    [
      'Window "All"',
      "  VBox",
      "    ImageView #pic 64 x 48, pixels 3f2a9c1e",
      "    ImageView (no image)",
      "    ImageView (image error: java.io.FileNotFoundException: nope.png (No such file or directory)) (hidden)",
      "    ImageView 513 x 1, pixels e80f8923",
      "    Slider 0 to 100, value 25",
      "    Slider #s -1.5 to 1.0E7, value 0.5, tick labels, tick marks, major tick 10, snaps, pref width 200 (disabled)",
      '    LineChart "Population" (no symbols)',
      '      x axis NumberAxis "Year" 2000 to 2020 by 5',
      '      y axis NumberAxis "People"',
      '      series "Helsinki": (2000, 555) (2005, 560.5) (2010, 1.0E10) (2015, null) null',
      "      series without a name: no data",
      '      series "No list": data null',
      "      series null",
      "    BarChart without a title, pref height 300 (no legend)",
      '      x axis CategoryAxis "Month"',
      "      y axis NumberAxis 0 to 30 by 10",
      '      series "Rain": ("Jan", 12.5) ("\\"Q\\"", 0)',
      '    ScatterChart ""',
      "      x axis NumberAxis -1 to 1 by 0.5",
      "      y axis CategoryAxis",
      "      data null",
    ].join("\n"),
  );
  // Not compared: mouse handlers, a slider's minor tick count and block increment, the pixels themselves (the CRC is), the categories an axis took.
  const bare = JSON.parse(JSON.stringify(w));
  delete bare.windows[0].scene.root.children[0].onMouseClicked;
  bare.windows[0].scene.root.children[0].image.pixels = "BBBB";
  bare.windows[0].scene.root.children[4].minorTickCount = 7;
  bare.windows[0].scene.root.children[4].blockIncrement = 3;
  bare.windows[0].scene.root.children[8].yAxis.categories = ["b", "c"];
  assert.equal(windowOutline(bare), windowOutline(w));
});

test("the new event lines in plain words, and as parseEventLine reads them", () => {
  assert.equal(describeEvent("press Canvas 1 at 10 20"), "press the mouse on canvas 1 at (10, 20)");
  assert.equal(describeEvent("drag Canvas 1 to 30 40.5"), "drag the mouse on canvas 1 to (30, 40.5)");
  assert.equal(describeEvent("release #pad at -3 4"), 'release the mouse on the node with the id "pad" at (-3, 4)');
  assert.equal(describeEvent("click ImageView 2 at 1 0"), "click image view 2 at (1, 0)");
  assert.equal(describeEvent("set Slider 1 25"), "move slider 1 to 25");
  assert.equal(describeEvent('set Slider 1 "x"'), 'replace the text in slider 1 with "x"');
  assert.equal(describeEvents(["set Slider 1 37", "click Canvas 1 at 5 5"]), "Move slider 1 to 37, then click canvas 1 at (5, 5)");
  assert.deepEqual(parseEventLine("press Canvas 1 at 10 20.5"), { line: "press Canvas 1 at 10 20.5", command: "press", target: { kind: "index", type: "Canvas", index: 1 }, point: { x: "10", y: "20.5" } });
  assert.deepEqual(parseEventLine("drag #3 to -1 0"), { line: "drag #3 to -1 0", command: "drag", target: { kind: "number", n: 3 }, point: { x: "-1", y: "0" } });
  assert.deepEqual(parseEventLine("click LineChart 1 at 0 0"), { line: "click LineChart 1 at 0 0", command: "click", target: { kind: "index", type: "LineChart", index: 1 }, point: { x: "0", y: "0" } });
  assert.deepEqual(parseEventLine("set Slider 2 -2.75"), { line: "set Slider 2 -2.75", command: "set", target: { kind: "index", type: "Slider", index: 2 }, number: "-2.75" });
  assert.deepEqual(parseEventLine("click ImageView 1"), { line: "click ImageView 1", command: "click", target: { kind: "index", type: "ImageView", index: 1 } });
});

const PART14 = `import javafx.application.Application;
import javafx.collections.FXCollections;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.chart.BarChart;
import javafx.scene.chart.CategoryAxis;
import javafx.scene.chart.LineChart;
import javafx.scene.chart.NumberAxis;
import javafx.scene.chart.XYChart;
import javafx.scene.control.Slider;
import javafx.scene.image.ImageView;
import javafx.scene.image.WritableImage;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

public class Main extends Application {
    private double x;
    private double y;

    @Override
    public void start(Stage stage) {
        Canvas canvas = new Canvas(200, 100);
        GraphicsContext g = canvas.getGraphicsContext2D();
        g.setFill(Color.LIGHTBLUE);
        g.fillRect(0, 0, 200, 100);
        canvas.setOnMousePressed(e -> {
            x = e.getX();
            y = e.getY();
        });
        canvas.setOnMouseDragged(e -> {
            g.strokeLine(x, y, e.getX(), e.getY());
            x = e.getX();
            y = e.getY();
        });
        canvas.setOnMouseClicked(e -> g.fillOval(e.getX() - 2, e.getY() - 2, 4, 4));
        WritableImage image = new WritableImage(3, 2);
        image.getPixelWriter().setColor(1, 1, Color.RED);
        Slider slider = new Slider(0, 10, 2);
        LineChart<Number, Number> chart = new LineChart<>(new NumberAxis("x", 0, 10, 1), new NumberAxis());
        chart.setTitle("Squares");
        XYChart.Series<Number, Number> squares = new XYChart.Series<>();
        squares.setName("n * n");
        chart.getData().add(squares);
        slider.valueProperty().addListener((observable, oldValue, newValue) -> {
            squares.getData().clear();
            for (int n = 0; n <= newValue.intValue(); n++) {
                squares.getData().add(new XYChart.Data<>(n, n * n));
            }
        });
        BarChart<String, Number> bars = new BarChart<>(new CategoryAxis(), new NumberAxis());
        bars.getData().add(new XYChart.Series<>("Votes", FXCollections.observableArrayList(new XYChart.Data<>("yes", 3), new XYChart.Data<>("no", 1.5))));
        stage.setTitle("Part 14");
        stage.setScene(new Scene(new VBox(canvas, new ImageView(image), slider, chart, bars)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
`;

test("the outline of a window the library wrote, after mouse drawing and a slider move", () => {
  const r = runWithEvents("part14", PART14, "press Canvas 1 at 10 20\ndrag Canvas 1 to 30 40\nrelease Canvas 1 at 30 40\nset Slider 1 3\n");
  assert.equal(r.status, 0, r.stderr);
  assert.equal(r.stderr, "");
  const w = parseWindow(r.json);
  assert.deepEqual(w.problems, []);
  assert.equal(
    windowOutline(w),
    [
      'Window "Part 14"',
      "  VBox",
      "    Canvas 200 x 100",
      "      fillRect 0 0 200 100, fill #add8e6",
      "      strokeLine 10 20 30 40, stroke #000000, width 1",
      "      fillOval 28 38 4 4, fill #add8e6",
      "    ImageView 3 x 2, pixels " + w.windows[0].scene.root.children[1].image.crc,
      "    Slider 0 to 10, value 3",
      '    LineChart "Squares"',
      '      x axis NumberAxis "x" 0 to 10 by 1',
      "      y axis NumberAxis",
      '      series "n * n": (0, 0) (1, 1) (2, 4) (3, 9)',
      "    BarChart without a title",
      "      x axis CategoryAxis",
      "      y axis NumberAxis",
      '      series "Votes": ("yes", 3) ("no", 1.5)',
    ].join("\n"),
  );
  // The CRC-32 of the ARGB values row by row (each A, R, G, B): all transparent but one red pixel.
  const argb = Buffer.alloc(24);
  argb.writeUInt32BE(0xffff0000, 16);
  assert.equal(w.windows[0].scene.root.children[1].image.crc, (crc32(argb) >>> 0).toString(16).padStart(8, "0"));
});

test("parseEventLine gives the library's own words for every new line it can't read", () => {
  const unreadable = [
    "press Canvas 1",
    "press Canvas 1 to 1 2",
    "press Canvas 1 at 1",
    "press Canvas 1 at x 2",
    "press Canvas 1 at 1 2 3",
    "press Canvas 1 at 1. 2",
    "press Canvas 1 at .5 2",
    "press Canvas 1 at 1e3 2",
    'press Canvas 1 at "1" 2',
    "drag Canvas 1 at 1 2",
    "drag Canvas 1",
    "release Canvas 1 to 1 2",
    "click Canvas 1 at",
    "click Canvas 1 at 3",
    "click Canvas 1 to 3 4",
    "press Canvsa 1 at 1 2",
    "press",
    "Press Canvas 1 at 1 2",
    "jump Canvas 1 at 1 2",
    "move Canvas 1 to 1 2",
    "set Slider 1",
    "set Slider 1 1.",
    "set Slider 1 x",
    "set #2 7.5 8",
    'set Slider "x" 25',
  ];
  const fromJs = unreadable.map((line) => {
    const e = parseEventLine(line);
    assert.ok(e && e.problem !== undefined, `JavaScript reads ${line}`);
    return `${line}: ${e.problem}`;
  });
  const r = runWithEvents("unreadable-14", PART14, unreadable.join("\n") + "\n");
  assert.equal(r.status, 0, r.stderr);
  assert.deepEqual(parseWindow(r.json).problems, fromJs);
});

// ------------------------------------------------------------------ part 14.3: keys, frames and shapes

test("the key and frames lines as parseEventLine reads them, and in plain words", () => {
  assert.deepEqual(parseEventLine("  press key LEFT "), { line: "press key LEFT", command: "press key", key: "LEFT" });
  assert.deepEqual(parseEventLine("release key DIGIT1"), { line: "release key DIGIT1", command: "release key", key: "DIGIT1" });
  assert.deepEqual(parseEventLine("key SPACE"), { line: "key SPACE", command: "key", key: "SPACE" });
  assert.deepEqual(parseEventLine("frames 030"), { line: "frames 030", command: "frames", number: "30" });
  // press with a target is still the mouse.
  assert.equal(parseEventLine("press Canvas 1 at 1 2").command, "press");
  assert.equal(describeEvent("press key LEFT"), "hold Left");
  assert.equal(describeEvent("release key LEFT"), "let go of Left");
  assert.equal(describeEvent("key SPACE"), "press and release Space");
  assert.equal(describeEvent("key DIGIT1"), "press and release 1");
  assert.equal(describeEvent("frames 1"), "run 1 frame");
  assert.equal(describeEvents(["press key LEFT", "frames 30", "release key LEFT", "key SPACE", "frames 5"]), "Hold Left, run 30 frames, let go of Left, press and release Space, then run 5 frames");
  assert.equal(describeEvents(["press key LEFT", "frames 30"]), "Hold Left, then run 30 frames");
  // How many frames a test runs (the build warns above TEST_FRAMES_WARN), and the window a test keeps: the count of frames, not the frames.
  assert.equal(framesInEvents(["press key LEFT", "frames 30", "// frames 5", "frames 200", "frames x", "key SPACE", "frames 71"]), 301);
  assert.equal(framesInEvents([]), 0);
  assert.equal(TEST_FRAMES_WARN, 300);
  const ran = { windows: [], problems: [], frames: { count: 2, list: [[{ k: 1, tx: 100 }], [{ k: 1, tx: 200 }]] } };
  assert.deepEqual(testWindow(ran), { windows: [], problems: [], frames: { count: 2, list: [] } });
  assert.equal(windowOutline(testWindow(ran)), windowOutline(ran));
  assert.deepEqual(ran.frames.list.length, 2);
  const still = { windows: [], problems: [] };
  assert.equal(testWindow(still), still);
  assert.equal(keyName("BACK_SPACE"), "Backspace");
  // A wrong name names the closest real one; a name KeyCode has in other letters says so.
  assert.equal(keyNameProblem("Left"), "write the key's name in capital letters, as KeyCode names it: LEFT");
  assert.equal(parseEventLine("key BACKSPACE").problem, "there's no key called BACKSPACE (did you mean BACK_SPACE? keys are named as in KeyCode, such as LEFT, UP, SPACE, A and DIGIT1)");
  assert.equal(parseEventLine("press key UPP").problem, "there's no key called UPP (did you mean UP? keys are named as in KeyCode, such as LEFT, UP, SPACE, A and DIGIT1)");
  assert.equal(parseEventLine("frames -2").problem, "frames takes a whole number from 1 to 3600, such as frames 30");
  assert.equal(parseEventLine("Frames 2").problem, "write the event in small letters: frames");
  // A near miss names the event it is one letter off; every word that starts with fram is a frames line.
  const all = "the events are click, type, set, enter, close, press, drag, release, press key, release key, key and frames";
  for (const line of ["frame 3", "fram 3", "fames 3", "framez 3", "framse 3"]) assert.equal(parseEventLine(line).problem, "write frames, such as frames 30", line);
  assert.equal(parseEventLine("keys SPACE").problem, `there's no event called keys (did you mean key? ${all})`);
  assert.equal(parseEventLine("pres key UP").problem, `there's no event called pres (did you mean press? ${all})`);
  assert.equal(parseEventLine("clik \"Add\"").problem, `there's no event called clik (did you mean click? ${all})`);
  assert.equal(parseEventLine("ky A").problem, `there's no event called ky (${all})`);
  assert.equal(parseEventLine("hold key UP").problem, `there's no event called hold (${all})`);
});

test("the outline of shapes, a pane with a preferred size, moved and turned nodes, and the frames that ran", () => {
  const w = {
    windows: [
      {
        title: "Asteroids",
        scene: {
          width: 600,
          height: 400,
          onKeyPressed: true,
          root: node(1, "Pane", {
            prefWidth: 600,
            prefHeight: 400,
            children: [
              node(2, "Polygon", { f: 2, translateX: 300.5, translateY: 200, rotate: 90, points: [0, -10, 10, 10, -10, 10], fill: "#000000" }),
              node(3, "Circle", { centerX: 150, centerY: 100, radius: 20, translateX: 3, fill: "#ff0000", stroke: "#000000", strokeWidth: 2.5 }),
              node(4, "Rectangle", { x: 10, y: 10, width: 40, height: 20, fill: null, visible: false }),
              node(5, "Line", { startX: 0, startY: 0, endX: 100, endY: 50, fill: null, stroke: "#000000" }),
              node(6, "Text", { text: "Points: 30", x: 10, y: 20, fill: "#000000" }),
              node(7, "Button", { text: "Go", layoutX: 5, layoutY: 6, rotate: 1.5e-7 }),
            ],
          }),
        },
      },
    ],
    problems: [],
    frames: { count: 120, list: [] },
  };
  assert.equal(
    windowOutline(w),
    [
      'Window "Asteroids"',
      "  Pane 600 x 400",
      "    Polygon (0, -10) (10, 10) (-10, 10), at (300.5, 200), rotate 90, fill #000000",
      "    Circle radius 20 at (150, 100), translate (3, 0), fill #ff0000, stroke #000000, width 2.5",
      "    Rectangle 40 x 20 at (10, 10), no fill (hidden)",
      "    Line (0, 0) to (100, 50), stroke #000000",
      '    Text "Points: 30" at (10, 20)',
      '    Button "Go", layout (5, 6), rotate 1.5E-7',
      "frames run: 120",
    ].join("\n"),
  );
  // No frames, or none that ran: no line. A window closed after frames: the line follows.
  assert.ok(!windowOutline({ ...w, frames: undefined }).includes("frames run"));
  assert.equal(windowOutline({ windows: [], closed: true, problems: [], frames: { count: 3, list: [] } }), "No window is open: the windows were closed.\nframes run: 3");
});
