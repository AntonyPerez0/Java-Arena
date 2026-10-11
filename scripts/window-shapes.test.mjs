// Tests of the page's part of part 14.3: shapes drawn as SVG (src/components/window-drawing.ts), the
// frames of a game's animation (src/components/window-frames.ts) and the key row of a free run
// (src/components/game-keys.ts). Made-up window JSON only: no build output is read.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { drawWindows, shapeBox, shapeReach, windowDrawingHtml, windowFigureHtml } from "../src/components/window-drawing.ts";
import { FrameStates, hasFrames } from "../src/components/window-frames.ts";
import { BASE_KEYS, hasKeyHandlers, heldAfter, keyCodeOf, nodeKeyHandlers, offeredKeys, runLines } from "../src/components/game-keys.ts";
import { windowOutline } from "../src/grader/window.ts";

const node = (n, type, fields = {}) => ({ n, type, ...fields });
const one = (root, scene = {}) => ({ windows: [{ title: "Asteroids", scene: { root, ...scene } }], problems: [] });
const all = (d) => [d, ...(d.kids ?? []).flatMap(all)];

test("shapes: a plain Pane's shapes are one SVG at the pane's coordinates, each with its fill, stroke, move and turn about its middle", () => {
  const w = one(
    node(1, "Pane", {
      prefWidth: 600.0,
      prefHeight: 400.0,
      children: [
        node(2, "Text", { text: "Points: 30", x: 10.0, y: 20.0, fill: "#000000" }),
        node(3, "Polygon", { points: [-5.0, -5.0, 10.0, 0.0, -5.0, 5.0], translateX: 300.0, translateY: 200.0, rotate: 90.0, fill: "#000000" }),
        node(4, "Circle", { centerX: 150.0, centerY: 100.0, radius: 20.0, fill: "#ff0000", stroke: "#0000ff", strokeWidth: 2.0 }),
        node(5, "Rectangle", { x: 10.0, y: 10.0, width: 40.0, height: 20.0, fill: null, stroke: "#000000", layoutX: 5.0 }),
        node(6, "Line", { startX: 0.0, startY: 0.0, endX: 100.0, endY: 50.0, stroke: "#000000", visible: false }),
      ],
    }),
  );
  const [win] = drawWindows(w);
  const pane = win.scene;
  assert.match(pane.cls, /fx-plain/);
  assert.equal(pane.kids.length, 1, "the shapes next to each other are one SVG");
  const svg = pane.kids[0];
  assert.equal(svg.tag, "svg");
  assert.deepEqual([svg.attrs.width, svg.attrs.height, svg.attrs.viewBox], ["600", "400", "0 0 600 400"], "as big as the pane's preferred size");
  const [text, polygon, circle, rect, line] = svg.kids;
  assert.equal(text.tag, "text");
  assert.equal(text.text, "Points: 30");
  assert.deepEqual([text.attrs.x, text.attrs.y, text.attrs.fill, text.style.fontSize], ["10", "20", "#000000", "13px"]);
  assert.equal(polygon.attrs.points, "-5,-5 10,0 -5,5");
  // Turned about the middle of its points' box (-5 to 10, -5 to 5), then moved.
  assert.equal(polygon.attrs.transform, "translate(300 200) rotate(90 2.5 0)");
  assert.deepEqual([circle.tag, circle.attrs.cx, circle.attrs.cy, circle.attrs.r, circle.attrs.fill, circle.attrs.stroke, circle.attrs["stroke-width"]], ["circle", "150", "100", "20", "#ff0000", "#0000ff", "2"]);
  assert.equal(circle.attrs.transform, undefined);
  assert.deepEqual([rect.tag, rect.attrs.x, rect.attrs.width, rect.attrs.fill, rect.attrs.transform], ["rect", "10", "40", "none", "translate(5 0)"], "a plain Pane places a node at its layout x and y");
  assert.deepEqual([line.tag, line.attrs.x2, line.attrs.y2, line.attrs.fill, line.attrs.visibility], ["line", "100", "50", "none", "hidden"]);
  // The pane's outline is unchanged by all this.
  assert.match(windowOutline(w), /Pane 600 x 400\n {4}Text "Points: 30" at \(10, 20\)\n {4}Polygon \(-5, -5\) \(10, 0\) \(-5, 5\), at \(300, 200\), rotate 90, fill #000000/);
});

test("shapes: a Pane without a size is as big as JavaFX makes it (layout bounds, not translate); controls between shapes keep their order and move with their translate", () => {
  const w = one(
    node(1, "Pane", {
      children: [
        node(2, "Rectangle", { x: 0.0, y: 0.0, width: 50.0, height: 30.0, fill: "#00ff00", translateX: 20.0 }),
        node(3, "Button", { text: "Go", layoutX: 10.0, layoutY: 40.0, rotate: 45.0 }),
        node(4, "Circle", { centerX: 10.0, centerY: 10.0, radius: 10.0, fill: "#000000", translateY: 100.0 }),
      ],
    }),
  );
  const pane = drawWindows(w)[0].scene;
  assert.deepEqual(
    pane.kids.map((k) => k.tag),
    ["svg", "span", "svg"],
  );
  // The translates move the shapes but not the pane's size (JavaFX's Parent.computePrefWidth).
  assert.deepEqual([pane.kids[0].attrs.width, pane.kids[0].attrs.height], ["50", "30"]);
  assert.deepEqual([pane.kids[2].attrs.width, pane.kids[2].attrs.height], ["20", "20"]);
  assert.equal(pane.kids[1].style.transform, "translate(10px, 40px) rotate(45deg)");
});

test("shapes: a shape in a VBox is an SVG of its own box (and stroke); a Text with line breaks has a line each; a Path is the box of its area", () => {
  const w = one(
    node(1, "VBox", {
      children: [
        node(2, "Circle", { centerX: 0.0, centerY: 0.0, radius: 10.0, fill: "#000000", stroke: "#ff0000", strokeWidth: 4.0, translateX: 5.0 }),
        node(3, "Text", { text: "one\ntwo", x: 0.0, y: 0.0, fill: "#000000", font: { family: "Monospaced", size: 20.0 } }),
        node(4, "Path", { area: [5.0, 5.0, 10.0, 12.0], fill: "#000000" }),
        node(5, "Polygon", { points: [], fill: "#000000" }),
      ],
    }),
  );
  const [circle, text, path, empty] = drawWindows(w)[0].scene.kids;
  assert.deepEqual([circle.tag, circle.attrs.width, circle.attrs.viewBox, circle.style.transform], ["svg", "24", "-12 -12 24 24", "translate(5px, 0px)"]);
  assert.equal(circle.kids[0].attrs.transform, undefined, "the CSS moves it, not the SVG");
  const t = text.kids[0];
  assert.deepEqual(
    t.kids.map((k) => [k.text, k.attrs.dy]),
    [
      ["one", "0"],
      ["two", "23.4"],
    ],
  );
  assert.match(t.style.fontFamily, /monospace/);
  assert.deepEqual([path.kids[0].tag, path.kids[0].attrs.x, path.kids[0].attrs.height], ["rect", "5", "7"]);
  assert.equal(empty.kids.length, 0, "a polygon without points draws nothing");
  assert.equal(shapeBox({ type: "Polygon", points: [] }), null);
});

test("shapes: where a shape reaches with its stroke, turned", () => {
  const r = shapeReach({ type: "Rectangle", x: 0, y: 0, width: 20, height: 10, rotate: 90, translateX: 100, stroke: "#000000", strokeWidth: 2 });
  // Turned a quarter about (10, 5): 12 wide by 22 tall around it, then moved 100 right.
  assert.deepEqual(
    Object.values(r).map((v) => Math.round(v * 1000) / 1000),
    [104, -6, 116, 16],
  );
});

test("shapes in HTML (lesson text, pre-rendered pages): inline SVG; a game's example gets the places for its player only when asked", () => {
  const frames = { count: 2, list: [[{ roots: [1] }, { k: 1, type: "Pane", children: [2] }, { k: 2, type: "Circle", radius: 5, fill: "#000000" }], [{ k: 2, tx: 1 }]] };
  const w = { ...one(node(1, "Pane", { f: 1, children: [node(2, "Circle", { f: 2, radius: 5.0, translateX: 1.0, fill: "#000000" })] })), frames };
  const html = windowDrawingHtml(w);
  // As big as JavaFX makes a pane with no size of its own: from -5 to 5 both ways (the circle's
  // layout bounds; its translate doesn't count).
  assert.match(html, /<svg class="fx-shapes" width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><circle class="fx-shape" data-n="2" fill="#000000" transform="translate\(1 0\)" cx="0" cy="0" r="5"><\/circle><\/svg>/);
  assert.doesNotMatch(html, /fx-anim|fx-player-box/, "the pre-rendered page shows only the last window");
  const figure = windowFigureHtml({ events: ["frames 2"], window: w, outline: windowOutline(w) }, 0);
  assert.match(figure, /<div class="fx-scroll"[^>]*><div class="fx-desktop fx-anim"><\/div><div class="fx-desktop" aria-hidden="true">/);
  assert.match(figure, /<\/div><div class="fx-player-box" data-fx-play="0"><\/div>/);
  assert.match(figure, /After: Run 2 frames/);
  // A test's stored window keeps only the count: nothing to play.
  assert.equal(hasFrames({ ...w, frames: { count: 2, list: [] } }), false);
  assert.doesNotMatch(windowFigureHtml({ events: [], window: { ...w, frames: { count: 2, list: [] } }, outline: "" }, 0), /fx-anim/);
});

test("frames: the window at each frame, from the changes; nodes added and removed, hidden and turned; going back from a checkpoint", () => {
  // A ship that moves 1 px a frame for 300 frames; a shot added at frame 2 and removed at frame 4; the text changes at frame 3.
  const list = [
    [
      { roots: [1] },
      { k: 1, type: "Pane", children: [2, 3] },
      { k: 2, type: "Text", x: 10, y: 20, fill: "#000000", text: "Points: 0", font: { family: "System", size: 13.0 } },
      { k: 3, type: "Polygon", tx: 1, points: [-5, -5, 10, 0, -5, 5], fill: "#000000" },
    ],
  ];
  for (let f = 2; f <= 300; f++) {
    const frame = [{ k: 3, tx: f, ...(f === 5 ? { r: 90, fill: "#dc143c" } : {}) }];
    if (f === 2) frame.push({ k: 1, children: [2, 3, 4] }, { k: 4, type: "Circle", radius: 2, fill: "#000000", tx: 50 });
    if (f === 3) frame.push({ k: 2, text: "Points: 10" }, { k: 4, visible: false });
    if (f === 4) frame.push({ k: 1, children: [2, 3] });
    list.push(frame);
  }
  const last = one(
    node(1, "Pane", {
      f: 1,
      prefWidth: 600.0,
      prefHeight: 400.0,
      children: [node(2, "Text", { f: 2, text: "Points: 10", x: 10.0, y: 20.0, fill: "#000000" }), node(3, "Polygon", { f: 3, points: [-5.0, -5.0, 10.0, 0.0, -5.0, 5.0], translateX: 300.0, rotate: 90.0, fill: "#dc143c" })],
    }),
  );
  last.frames = { count: 300, list };
  const states = new FrameStates(last);
  assert.deepEqual([states.count, states.kept], [300, 300]);
  const at = (k) => windowOutline(states.windowAt(k)).split("\n");
  assert.deepEqual(at(1), ["Window \"Asteroids\"", "  Pane 600 x 400", '    Text "Points: 0" at (10, 20)', "    Polygon (-5, -5) (10, 0) (-5, 5), at (1, 0), fill #000000"], "the last window's size stays; a default font is left out");
  assert.deepEqual(at(2).slice(4), ["    Circle radius 2 at (0, 0), translate (50, 0), fill #000000"]);
  assert.deepEqual(at(3).slice(2), ['    Text "Points: 10" at (10, 20)', "    Polygon (-5, -5) (10, 0) (-5, 5), at (3, 0), fill #000000", "    Circle radius 2 at (0, 0), translate (50, 0), fill #000000 (hidden)"]);
  assert.equal(at(4).length, 4, "the shot is gone");
  assert.equal(at(5)[3], "    Polygon (-5, -5) (10, 0) (-5, 5), at (5, 0), rotate 90, fill #dc143c");
  // The last frame is the last window.
  assert.equal(windowOutline(states.windowAt(300)), windowOutline({ ...last, frames: undefined }));
  // Back and forth: the same windows (from the checkpoints every 120 frames).
  for (const k of [250, 2, 130, 121, 120, 3, 299, 1]) assert.equal(windowOutline(states.windowAt(k)), windowOutline(new FrameStates(last).windowAt(k)), `frame ${k}`);
  assert.match(at(250)[3], /at \(250, 0\)/);
});

test("frames: a node the last window doesn't have is drawn from the frames alone; a window shown later; the BorderPane's regions", () => {
  const list = [
    [{ roots: [1] }, { k: 1, type: "BorderPane", children: [2, 3] }, { k: 2, type: "Label", text: "top" }, { k: 3, type: "Button", text: "Go" }],
    [{ roots: [1, 4] }, { k: 4, type: "Pane", children: [5] }, { k: 5, type: "Label", text: "second" }, { k: 1, children: [2] }],
  ];
  const last = {
    windows: [{ title: "Main", scene: { root: node(1, "BorderPane", { f: 1, top: node(2, "Label", { f: 2, text: "top" }), center: node(3, "Button", { f: 3, text: "Go" }) }) } }],
    problems: [],
    frames: { count: 2, list },
  };
  const states = new FrameStates(last);
  assert.deepEqual(windowOutline(states.windowAt(1)).split("\n"), ['Window "Main"', "  BorderPane", '    top: Label "top"', '    center: Button "Go"']);
  assert.deepEqual(windowOutline(states.windowAt(2)).split("\n"), ['Window "Main"', "  BorderPane", '    top: Label "top"', "Window without a title", "  Pane", '    Label "second"']);
});

test("frames: a window that closes while frames run doesn't lend its place to another window's title and size", () => {
  // Frame 1 shows First (root 1) and Second (root 4); in frame 2 First has closed, so the last window is Second alone.
  const list = [
    [{ roots: [1, 4] }, { k: 1, type: "Pane", children: [2] }, { k: 2, type: "Label", text: "one" }, { k: 4, type: "Pane", children: [5] }, { k: 5, type: "Label", text: "two" }],
    [{ roots: [4] }],
  ];
  const last = {
    windows: [{ title: "Second", width: 200, height: 100, scene: { width: 200, height: 100, root: node(4, "Pane", { f: 4, children: [node(5, "Label", { f: 5, text: "two" })] }) } }],
    problems: [],
    frames: { count: 2, list },
  };
  const states = new FrameStates(last);
  const at1 = states.windowAt(1);
  assert.deepEqual(
    at1.windows.map((w) => w.title),
    [null, "Second"],
    "First's root is drawn without a title, and Second keeps its own",
  );
  assert.equal(at1.windows[0].scene.width, undefined);
  assert.equal(at1.windows[1].scene.width, 200);
  assert.deepEqual(windowOutline(states.windowAt(2)).split("\n").slice(0, 1), ['Window "Second"']);
  // The same number of windows, but a root the last window doesn't have: placed by where it is.
  const replaced = { ...last, frames: { count: 1, list: [[{ roots: [7] }, { k: 7, type: "Pane", children: [] }]] } };
  assert.equal(new FrameStates(replaced).windowAt(1).windows[0].title, "Second");
});

test("game keys: the keys offered, the keys held after the events, the lines a run sends and a real keyboard's keys", () => {
  assert.deepEqual(offeredKeys("if (pressed.getOrDefault(KeyCode.LEFT, false)) {}\nif (code == KeyCode.A || code == KeyCode . DIGIT1 || KeyCode.NOPE != null) {}", ["press key Q", "frames 3", "key W"]), [...BASE_KEYS, "A", "DIGIT1", "Q", "W"]);
  // Case labels of a switch on a key's code (arrow and colon labels, a KeyCode variable).
  const game = [
    "import javafx.scene.input.KeyCode;",
    "scene.setOnKeyPressed(e -> { switch (e.getCode()) { case W, S -> go(); case LEFT -> turn(); default -> {} } });",
    "void on(KeyCode k) { switch (k) { case DIGIT2: a(); break; case ENTER: b(); } }",
    "enum Mode { STOP, PLAY } void m(Mode x) { switch (x) { case STOP -> a(); case PLAY -> b(); } }",
  ].join("\n");
  assert.deepEqual(offeredKeys(game), [...BASE_KEYS, "W", "S", "DIGIT2", "ENTER"]);
  assert.deepEqual(offeredKeys("enum Mode { STOP, PLAY, A }\nvoid m(Mode x) { switch (x) { case STOP -> a(); case A: b(); } }"), BASE_KEYS, "a file that doesn't mention KeyCode adds no keys from a switch");
  // Static imports: a single name, and the wildcard only where a name is compared with a key's code.
  assert.deepEqual(offeredKeys("import static javafx.scene.input.KeyCode.W;\nif (e.getCode() == W) {}"), [...BASE_KEYS, "W"]);
  assert.deepEqual(
    offeredKeys("import static javafx.scene.input.KeyCode.*;\nclass Box<T> { static final int ADD = 1; Map<K, V> m; }\nif (e.getCode() == Q || e.getCode().equals(E) || ADD > 0) {}"),
    [...BASE_KEYS, "Q", "E"],
  );
  assert.deepEqual([...heldAfter(["press key UP", "press key LEFT", "frames 30", "release key LEFT", "key SPACE"])], ["UP"]);
  // Held now: UP and RIGHT; the learner let go of UP, holds SPACE too.
  const held = new Set(["UP", "RIGHT"]);
  assert.deepEqual(runLines(BASE_KEYS, new Set(["RIGHT", "SPACE"]), held, 60), ["release key UP", "press key SPACE", "frames 60"]);
  assert.deepEqual(runLines(BASE_KEYS, new Set(), new Set(["Q"]), 30), ["release key Q", "frames 30"], "a held key the row doesn't show is let go too");
  assert.deepEqual(runLines(BASE_KEYS, held, held, 30), ["frames 30"]);
  assert.deepEqual(
    [
      ["ArrowLeft", "ArrowLeft"],
      [" ", "Space"],
      ["a", "KeyA"],
      ["Q", "KeyQ"],
      ["!", "Digit1"],
      ["1", "Numpad1"],
      ["Enter", "Enter"],
      ["F5", "F5"],
      [",", "Comma"],
      ["Dead", "Quote"],
      // AZERTY: a letter by the character it types, the digit row by its place, "," by what it is.
      ["a", "KeyQ"],
      ["&", "Digit1"],
      [",", "KeyM"],
      // Russian: a letter of another alphabet by its place.
      ["ф", "KeyA"],
    ].map(([key, code]) => keyCodeOf(key, code)),
    ["LEFT", "SPACE", "A", "Q", "DIGIT1", "NUMPAD1", "ENTER", "F5", "COMMA", null, "A", "DIGIT1", "COMMA", "A"],
  );
  assert.equal(hasKeyHandlers(one(node(1, "Pane"), { onKeyPressed: true })), true);
  assert.equal(hasKeyHandlers(one(node(1, "Pane", { onKeyPressed: true }))), false, "a node's own key handlers never run here");
  // ... but the page still offers the key row for them, and says that they don't run here.
  assert.equal(nodeKeyHandlers(one(node(1, "Pane", { onKeyPressed: true }))), true);
  assert.equal(nodeKeyHandlers(one(node(1, "Pane", { children: [node(2, "Rectangle", { onKeyTyped: true })] }))), true);
  assert.equal(nodeKeyHandlers(one(node(1, "BorderPane", { center: node(2, "Pane", { onKeyReleased: true }) }))), true);
  assert.equal(nodeKeyHandlers(one(node(1, "Pane", { children: [node(2, "Rectangle")] }), { onKeyPressed: true })), false);
  assert.equal(nodeKeyHandlers(null), false);
});
