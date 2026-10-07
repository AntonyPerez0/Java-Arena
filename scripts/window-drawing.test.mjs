// Tests of src/components/window-drawing.ts: how a window JSON is drawn (the panes as CSS layouts,
// JavaFX's default sizes, fonts, disabled and hidden nodes), the controls the window panel makes
// usable and their accessible names, and the HTML that lesson text and the pre-rendered pages show.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { drawWindows, drawingLabel, outlineLines, windowDrawingHtml, windowFigureHtml, windowTextHtml } from "../src/components/window-drawing.ts";
import { CLOSED_WINDOW, NO_WINDOW, windowOutline } from "../src/grader/window.ts";

const node = (n, type, fields = {}) => ({ n, type, ...fields });
const one = (root, stage = {}) => ({ windows: [{ title: "Counter", scene: { root }, ...stage }], problems: [] });
/** Every drawn element, depth first. */
const all = (d) => [d, ...(d.kids ?? []).flatMap(all)];
const controls = (w) => drawWindows(w).flatMap((x) => all(x.scene)).filter((d) => d.control).map((d) => d.control);

test("panes: a VBox is a column whose fields and panes fill its width, an HBox a row whose text areas and panes fill its height", () => {
  const w = one(
    node(1, "VBox", {
      spacing: 10.0,
      padding: [10.0, 8.0, 10.0, 8.0],
      alignment: "TOP_CENTER",
      children: [node(2, "Label", { text: "Clicks: 2" }), node(3, "TextField", { text: "" }), node(4, "HBox", { spacing: 5.0, alignment: "CENTER_RIGHT", children: [node(5, "Button", { text: "Add" }), node(6, "TextArea", { text: "" })] })],
    }),
  );
  const [win] = drawWindows(w);
  const root = win.scene;
  assert.match(root.cls, /fx-vbox/);
  assert.equal(root.style.gap, "10px");
  assert.equal(root.style.padding, "10px 8px 10px 8px");
  // TOP_CENTER: down the column from the top, centered across.
  assert.equal(root.style.justifyContent, "flex-start");
  assert.equal(root.style.alignItems, "center");
  const [label, field, row] = root.kids;
  assert.equal(label.style.alignSelf, undefined, "a label keeps its own width");
  assert.equal(field.style.alignSelf, "stretch", "a text field fills the column");
  assert.equal(field.style.minWidth, "170px", "at least JavaFX's 170 px");
  assert.equal(field.style.width, undefined);
  assert.equal(row.style.alignSelf, "stretch");
  assert.equal(row.style.justifyContent, "flex-end");
  assert.equal(row.style.alignItems, "center");
  const [button, area] = row.kids;
  assert.equal(button.style.alignSelf, undefined);
  assert.equal(area.style.alignSelf, "stretch", "a text area fills the row's height");
  assert.equal(area.style.width, "546px", "a text area is 546 px wide in a row");
  assert.equal(area.style.minHeight, "173px");
});

test("panes: BorderPane regions, GridPane cells with spans, StackPane, FlowPane and a plain Pane", () => {
  const w = one(
    node(1, "BorderPane", {
      top: node(2, "Label", { text: "Menu" }),
      center: node(3, "GridPane", {
        hgap: 4.0,
        alignment: "CENTER",
        children: [node(4, "Label", { column: 0, row: 0, text: "Name" }), node(5, "TextField", { column: 1, row: 0, text: "" }), node(6, "TextArea", { column: 0, row: 1, columnSpan: 2, text: "" })],
      }),
      right: node(7, "StackPane", { alignment: "TOP_RIGHT", prefWidth: 40.0, prefHeight: 40.0, children: [node(8, "Label", { text: "New" })] }),
      bottom: node(9, "FlowPane", { hgap: 6.0, vgap: 4.0, children: [node(10, "Button", { text: "A" })] }),
      left: node(11, "Pane", { children: [node(12, "Label", { text: "x" })] }),
    }),
  );
  const root = drawWindows(w)[0].scene;
  assert.match(root.cls, /fx-border/);
  assert.deepEqual(
    root.kids.map((k) => k.style.gridArea),
    ["top", "left", "center", "right", "bottom"],
    "regions in outline order",
  );
  const [top, left, center, right, bottom] = root.kids;
  assert.equal(top.style.justifySelf, "start", "a label at the top keeps its size, at the left");
  assert.equal(center.style.justifySelf, "stretch");
  assert.equal(center.style.alignSelf, "stretch");
  // The GridPane's cells: a grid of their own, the last column and row taking a spanning node's extra room.
  const cells = center.kids[0];
  assert.equal(cells.cls, "fx-grid-cells");
  assert.equal(cells.style.columnGap, "4px");
  assert.equal(cells.style.gridTemplateColumns, "repeat(1, auto) 1fr");
  assert.equal(center.style.justifyContent, "center");
  assert.deepEqual(
    cells.kids.map((k) => [k.style.gridColumn, k.style.gridRow, k.style.justifySelf]),
    [
      ["1 / span 1", "1 / span 1", "start"],
      ["2 / span 1", "1 / span 1", "stretch"],
      ["1 / span 2", "2 / span 1", "stretch"],
    ],
  );
  assert.match(right.cls, /fx-stack/);
  assert.equal(right.style.justifyItems, "end");
  assert.equal(right.style.alignItems, "start");
  assert.equal(right.style.minHeight, "40px");
  assert.match(bottom.cls, /fx-flow/);
  assert.equal(bottom.style.columnGap, "6px");
  assert.equal(bottom.style.rowGap, "4px");
  assert.equal(bottom.style.maxWidth, "400px", "a FlowPane wraps at 400 px, as JavaFX's prefWrapLength");
  assert.match(left.cls, /fx-plain/);
});

test("sizes: the scene's and window's sizes are the least, a pref size is exact unless the pane stretches the node; NaN is not a size", () => {
  const root = node(1, "VBox", { prefWidth: 300.0, children: [node(2, "Button", { text: "OK", prefWidth: 80.0, prefHeight: 30.0 }), node(3, "TextField", { text: "", prefWidth: 100.0 })] });
  const w = { windows: [{ title: "Sized", width: 320.0, height: "NaN", scene: { width: 300.0, height: 200.0, root } }], problems: [] };
  const [win] = drawWindows(w);
  assert.deepEqual(win.style, { minWidth: "320px" });
  assert.deepEqual(win.sceneStyle, { minWidth: "300px", minHeight: "200px" });
  assert.equal(win.scene.style.minWidth, "300px", "the root fills the scene");
  assert.equal(win.scene.style.width, undefined);
  const [button, field] = win.scene.kids;
  assert.equal(button.style.width, "80px");
  assert.equal(button.style.height, "30px");
  assert.equal(field.style.minWidth, "100px");
  assert.equal(field.style.width, undefined, "a field in a column is stretched");
});

test("fonts, padding, disabled and hidden: as JavaFX draws them", () => {
  const w = one(
    node(1, "VBox", {
      disable: true,
      children: [
        node(2, "Label", { text: "Title", font: { family: "Serif", size: 22.0 } }),
        node(3, "Label", { text: "Odd", font: { family: "Comic Sans MS", size: 12.0 } }),
        node(4, "Label", { text: "Bad", font: { family: 'x"; color: red', size: "NaN" } }),
        node(5, "Button", { text: "Gone", visible: false, padding: [2.0, 4.0, 2.0, 4.0] }),
        node(6, "TextField", { text: "", font: { family: "System", size: 26.0 } }),
      ],
    }),
  );
  const root = drawWindows(w)[0].scene;
  assert.equal(root.attrs["aria-disabled"], "true");
  const [title, odd, bad, gone, big] = root.kids;
  assert.equal(title.style.fontSize, "22px");
  assert.match(title.style.fontFamily, /serif$/);
  assert.match(odd.style.fontFamily, /^"Comic Sans MS", system-ui/);
  assert.equal(bad.style.fontFamily, undefined, "a family that isn't plain letters stays out of the CSS");
  assert.equal(bad.style.fontSize, undefined);
  assert.equal(gone.style.visibility, "hidden", "a hidden node keeps its place, as in JavaFX");
  assert.equal(gone.style.padding, "2px 4px 2px 4px");
  assert.equal(big.style.minWidth, "340px", "a bigger font asks for a wider field");
  // Every control in a disabled pane is drawn disabled (40% opacity) and marked for screen readers and axe.
  for (const d of [title, odd, bad, gone, big]) {
    assert.match(d.cls, /fx-disabled/);
    assert.equal(d.attrs["aria-disabled"], "true");
  }
});

test("controls: what the window panel makes usable, with names as event lines count them", () => {
  const w = {
    windows: [
      { title: "A", scene: { root: node(1, "VBox", { children: [node(2, "PasswordField", { text: "pw" }), node(3, "TextField", { text: "x", promptText: "Your name", onAction: true }), node(4, "TextField", { text: "", editable: false }), node(5, "Button", { text: "", onAction: true }), node(6, "Button", { text: "Go", disable: true })] }) } },
      { title: null, scene: { root: node(7, "VBox", { children: [node(8, "TextArea", { text: "a\nb", wrapText: true }), node(9, "Button", { text: "Close" })] }) } },
    ],
    problems: [],
  };
  const c = controls(w);
  assert.deepEqual(
    c.map((x) => [x.n, x.kind, x.name, x.disabled, x.editable, x.onAction]),
    [
      [2, "password", "Password field 1", false, true, false],
      [3, "field", "Your name", false, true, true],
      // TextField 3: a password field is a text field too, as `type TextField 3 "x"` counts.
      [4, "field", "Text field 3", false, false, false],
      [5, "button", "Button 1", false, true, true],
      [6, "button", "Go", true, true, false],
      [8, "area", "Text area 1", false, true, false],
      [9, "button", "Close", false, true, false],
    ],
  );
  // Places stay put when nodes are added elsewhere (React keeps the element, and the focus in it).
  assert.deepEqual(
    c.map((x) => x.path),
    ["w0/0", "w0/1", "w0/2", "w0/3", "w0/4", "w1/0", "w1/1"],
  );
  assert.equal(c[5].wrap, true);
  assert.deepEqual(
    drawWindows(w).map((x) => x.label),
    ["Window: A", "Window without a title"],
  );
  // Event lines name a button by its text when no other button has it, else a node by its number.
  assert.deepEqual(
    c.map((x) => x.target),
    ["#2", "#3", "#4", 'Button ""', 'Button "Go"', "#8", 'Button "Close"'],
  );
});

test("controls: a button's text or a node's id names it in event lines only when no other has it, so a click finds it however the nodes are ordered", () => {
  const w = one(
    node(1, "VBox", {
      children: [
        node(2, "Button", { text: "Add", onAction: true }),
        node(3, "Button", { text: "Add", onAction: true }),
        node(4, "Button", { text: 'Say "hi"\n', onAction: true }),
        // A Label with a button's text doesn't count: `Button "Save"` finds buttons only.
        node(5, "Label", { text: "Save" }),
        node(6, "Button", { text: "Save", id: "save", onAction: true }),
        node(7, "TextField", { text: "", id: "name" }),
        node(8, "TextField", { text: "", id: "twice" }),
        node(9, "HBox", { id: "twice", children: [node(10, "TextField", { text: "", id: "has space" }), node(11, "ButtonBase", { text: "Own" })] }),
      ],
    }),
  );
  assert.deepEqual(
    controls(w).map((x) => x.target),
    ["#2", "#3", 'Button "Say \\"hi\\"\\n"', 'Button "Save"', "#name", "#8", "#10", "#11"],
  );
});

test("HTML: the drawing hidden from screen readers in a scrolling frame, a password as dots, text escaped; no window: the outline's sentence", () => {
  const w = one(node(1, "VBox", { children: [node(2, "Label", { text: "<b>&\"" }), node(3, "PasswordField", { text: "s3crét" }), node(4, "TextField", { text: "", promptText: "Name" })] }), { title: 'A "quoted" <title>' });
  const html = windowDrawingHtml(w);
  assert.match(html, /^<div class="fx-frame"><div class="fx-scroll" tabindex="0" role="group" aria-label="Drawing of the window &quot;A \\&quot;quoted\\&quot; &lt;title&gt;&quot;"><div class="fx-desktop" aria-hidden="true">/);
  // The note for a frame too narrow for its windows: after the frame, outside the drawing hidden from screen readers (the page shows it only then).
  assert.ok(html.endsWith('</div></div><p class="fx-wide-note">This window is wider than the screen: scroll it sideways, or read it as text below.</p></div>'), html.slice(-200));
  assert.match(html, /<span class="fx-text">&lt;b&gt;&amp;&quot;<\/span>/);
  assert.ok(html.includes(">••••••</span>"), "six dots for six characters");
  assert.ok(html.includes('class="fx-input fx-field fx-prompt"') && html.includes(">Name</span>"), "an empty field shows its prompt text");
  assert.ok(!/<script|on\w+=/i.test(html));
  assert.equal(windowDrawingHtml(null), `<p class="fx-none">${NO_WINDOW}</p>`);
  assert.equal(windowDrawingHtml({ windows: [], closed: true, problems: [] }), `<p class="fx-none">${CLOSED_WINDOW}</p>`);
  assert.equal(drawingLabel({ windows: [{ title: "A", scene: null }, { title: null, scene: null }], problems: [] }), 'Drawing of 2 windows: the window "A", a window without a title');
  assert.ok(windowDrawingHtml({ windows: [{ title: "Empty", scene: null }], problems: [] }).includes('<p class="fx-no-scene">(no scene)</p>'));
});

test("the window as text: one element per line with its indent, so a long line wraps under its own start; the text between them is the outline", () => {
  const outline = 'Window "Recipe"\n  VBox spacing 10\n    Label "A very long line of text that a phone cuts off" (font Serif 20)\n\n  & <b>';
  const html = windowTextHtml(outline);
  assert.equal(
    html,
    '<details class="fx-astext"><summary>The window as text</summary><pre><code>' +
      '<span class="fx-line" style="--indent: 0">Window &quot;Recipe&quot;</span>\n<span class="fx-line" style="--indent: 2">  VBox spacing 10</span>\n' +
      '<span class="fx-line" style="--indent: 4">    Label &quot;A very long line of text that a phone cuts off&quot; (font Serif 20)</span>\n<span class="fx-line" style="--indent: 0"></span>\n<span class="fx-line" style="--indent: 2">  &amp; &lt;b&gt;</span>' +
      "</code></pre></details>",
  );
  // Without its tags (as the pre-rendered page's check reads it), the text is the outline.
  const decode = (t) => t.replace(/<[^>]*>/g, "").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
  assert.equal(decode(/<code>([\s\S]*)<\/code>/.exec(html)[1]), outline);
  assert.deepEqual(outlineLines(" ".repeat(50) + "x").map((l) => l.indent), [40]);
});

test("a java window example in lesson text: the events in words, the drawing and the window as text, folded", () => {
  const w = one(node(1, "VBox", { children: [node(2, "Label", { text: "Clicks: 2" })] }));
  const html = windowFigureHtml({ events: ['click Button "Add"', 'click Button "Add"'], window: w, outline: windowOutline(w) });
  assert.match(html, /^<figure class="fx-figure"><figcaption>The window<\/figcaption><p class="fx-events">After: Click &quot;Add&quot;, then click &quot;Add&quot;<\/p><div class="fx-frame"><div class="fx-scroll"/);
  assert.ok(html.endsWith(`${windowTextHtml(windowOutline(w))}</figure>\n`));
  // The lesson pipeline adds tabindex="0" to every <pre>, so the figure must not have its own.
  assert.ok(!/<pre[^>]*tabindex/.test(html));
  assert.ok(!html.includes("\n\n"), "one block of HTML, so Markdown leaves it whole");
  assert.ok(!windowFigureHtml({ events: [], window: w, outline: windowOutline(w) }).includes("fx-events"), "no events: no After line");
});
