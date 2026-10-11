// Tests of src/components/window-drawing.ts: how a window JSON is drawn (the panes as CSS layouts,
// JavaFX's default sizes, fonts, disabled and hidden nodes), the controls the window panel makes
// usable and their accessible names, and the HTML that lesson text and the pre-rendered pages show;
// and of the nodes of part 14 (window-charts.ts, window-canvas.ts): charts, canvases, image views
// and sliders.
// Run: npm run test:unit
import test from "node:test";
import assert from "node:assert/strict";
import { drawWindows, drawingLabel, outlineLines, sliderPrecision, sliderValueText, windowDrawingHtml, windowFigureHtml, windowTextHtml } from "../src/components/window-drawing.ts";
import { canvasSvg, imageScale, paintCalls, pngDataUrl } from "../src/components/window-canvas.ts";
import { autoRange, tickLabel, tickValues } from "../src/components/window-charts.ts";
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

// ------------------------------------------------------------------ the nodes of part 14

test("charts: a number axis that ranges itself takes the bounds and tick unit headless OpenJFX 21.0.12 gave for the same data and axis length", () => {
  // [data min, max, axis length in px, vertical, the range real JavaFX laid out]
  const cases = [
    [333, 650, 275, true, [0, 700, 100]],
    [7, 30, 299, true, [0, 32.5, 2.5]],
    [-0.2, 1.6, 438, false, [-0.25, 1.75, 0.25]],
    [-0.6000000000000001, 0.59, 319, true, [-0.7000000000000001, 0.7000000000000001, 0.1]],
    [1, 3, 274, false, [0, 3.5, 0.5]],
    [1.25, 1e10, 195, true, [0, 1.25e10, 2.5e9]],
    [-0.001, 0.0005, 311, false, [-0.0015, 0.001, 5e-4]],
    [-0.001, 0.0003, 195, true, [-0.00125, 0.0005, 2.5e-4]],
    [-50, -10, 349, false, [-55, 0, 5]],
    [-7, -1, 195, true, [-8, 0, 1]],
    [5, 5, 335, false, [0, 5.5, 0.5]],
    [0, 0, 195, true, [0, 0, 0.25]],
    [1990, 2025, 346, false, [0, 2250, 250]],
    [41.5, 44.2, 195, true, [0, 50, 10]],
    [3, 9, 148, true, [0, 10, 2.5]],
    [-2, 3, 353, false, [-2.5, 3.5, 0.5]],
  ];
  for (const [min, max, length, vertical, [lower, upper, unit]] of cases) {
    const r = autoRange(min, max, length, vertical);
    assert.deepEqual([r.lower, r.upper, r.unit], [lower, upper, unit], `${min} to ${max} on ${length} px`);
  }
  // Without forceZeroInRange the range stays near the data.
  const r = autoRange(41.5, 44.2, 195, true, false);
  assert.ok(r.lower > 40 && r.upper < 46, JSON.stringify(r));
});

test("charts: tick labels as JavaFX's number axis writes them (the unit's decimals, grouping commas)", () => {
  assert.deepEqual(
    tickValues({ lower: 0, upper: 1.25e10, unit: 2.5e9 }).map((v) => tickLabel(v, 2.5e9)),
    ["0", "2,500,000,000", "5,000,000,000", "7,500,000,000", "10,000,000,000", "12,500,000,000"],
  );
  assert.deepEqual(
    tickValues({ lower: -0.00125, upper: 0.0005, unit: 2.5e-4 }).map((v) => tickLabel(v, 2.5e-4)),
    ["-0.00125", "-0.00100", "-0.00075", "-0.00050", "-0.00025", "0.00000", "0.00025", "0.00050"],
  );
  assert.equal(tickValues({ lower: 0, upper: 32.5, unit: 2.5 }).map((v) => tickLabel(v, 2.5)).join(" "), "0.0 2.5 5.0 7.5 10.0 12.5 15.0 17.5 20.0 22.5 25.0 27.5 30.0 32.5");
  assert.equal(tickValues({ lower: 2000, upper: 2020, unit: 5 }).map((v) => tickLabel(v, 5)).join(" "), "2,000 2,005 2,010 2,015 2,020");
  // 1E21 and more: the shortest digits, then zeros, as DecimalFormat writes them (toFixed would write an exponent).
  assert.equal(tickLabel(1e21, 5e15), "1,000,000,000,000,000,000,000");
  assert.equal(tickLabel(-1.25e22, 2.5), "-12,500,000,000,000,000,000,000.0");
  assert.equal(tickLabel(1e300, 5e15), "1" + ",000".repeat(100));
  assert.deepEqual(tickValues({ lower: 0, upper: 1e6, unit: 1 }), [0, 1e6], "more than 200 ticks: only the ends");
});

const lineChart = (fields = {}) =>
  node(2, "LineChart", {
    title: "Population <&>",
    xAxis: { type: "NumberAxis", label: "Year", autoRanging: false, lowerBound: 2000, upperBound: 2020, tickUnit: 5, forceZeroInRange: true, minorTickVisible: true },
    yAxis: { type: "NumberAxis", label: "People", autoRanging: true, lowerBound: 0, upperBound: 100, tickUnit: 5, forceZeroInRange: true, minorTickVisible: true },
    series: [
      { name: "Helsinki", data: [[2010, 588], [2000, 555], null, [2005, "NaN"], [2020, 650]] },
      { name: null, data: [[2000, 333], [2020, 390]] },
      null,
      { name: "Empty", data: null },
    ],
    ...fields,
  });

test("charts: a line chart as SVG of JavaFX's 500 x 400, its title, axes, legend and lines with a symbol shape of each series' own", () => {
  const d = drawWindows(one(node(1, "VBox", { children: [lineChart()] })))[0].scene.kids[0];
  assert.match(d.cls, /fx-chart/);
  assert.deepEqual([d.style.width, d.style.height], ["500px", "400px"]);
  assert.equal(d.attrs.role, "img");
  assert.equal(d.attrs["aria-label"], 'Line chart "Population <&>": its points are in the window as text');
  const svg = d.markup;
  assert.match(svg, /^<svg class="fx-chart-svg" width="500" height="400" viewBox="0 0 500 400" aria-hidden="true" focusable="false">/);
  assert.ok(svg.includes(">Population &lt;&amp;&gt;</text>"), "the title, escaped");
  for (const t of [">Year</text>", ">People</text>", ">2,000</text>", ">2,020</text>", ">700</text>", ">Helsinki</text>", ">Empty</text>"]) assert.ok(svg.includes(t), t);
  // One line per series with two points or more, joined in x order; null and NaN points left out.
  const lines = [...svg.matchAll(/<polyline points="([^"]*)"/g)].map((m) => m[1].split(" ").length);
  assert.deepEqual(lines, [3, 2]);
  // Series 0's symbol is a ring (as Modena's line symbol), series 1's a square; the legend repeats them.
  assert.equal((svg.match(/<circle[^>]*stroke="#f3622d"/g) ?? []).length, 3 + 1);
  assert.equal((svg.match(/<rect[^>]*stroke="#fba71b"/g) ?? []).length, 2 + 1);
  assert.ok(!/NaN|undefined|Infinity/.test(svg));
  // Without symbols: dashes tell the lines apart (the first is solid).
  const plain = drawWindows(one(lineChart({ createSymbols: false, legendVisible: false })))[0].scene.markup;
  assert.ok(!plain.includes("<circle") && plain.includes('stroke-dasharray="9 5"'));
  assert.ok(!plain.includes(">Helsinki</text>"), "no legend");
  // A pref size is the chart's size.
  const sized = drawWindows(one(lineChart({ prefWidth: 300, prefHeight: 250 })))[0].scene;
  assert.deepEqual([sized.style.width, sized.style.height], ["300px", "250px"]);
  assert.match(sized.markup, /^<svg class="fx-chart-svg" width="300" height="250"/);
});

test("charts: a bar chart's bars side by side per category (vertical or across), a scatter chart's symbols; categories that aren't on the axis left out", () => {
  const bar = node(1, "BarChart", {
    title: null,
    xAxis: { type: "CategoryAxis", label: "Month", autoRanging: false, categories: ["Jan", "Feb", "Mar"] },
    yAxis: { type: "NumberAxis", label: null, autoRanging: true, lowerBound: 0, upperBound: 100, tickUnit: 5, forceZeroInRange: true, minorTickVisible: true },
    series: [
      { name: "Rain", data: [["Jan", 12.5], ["Mar", 20], ["Apr", 7]] },
      { name: "Snow", data: [["Jan", 30], ["Feb", -2]] },
    ],
  });
  const svg = drawWindows(one(bar))[0].scene.markup;
  const bars = [...svg.matchAll(/<rect x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)" fill="(#[0-9a-f]+)" stroke="#000000"/g)].map((m) => ({ x: +m[1], y: +m[2], w: +m[3], h: +m[4], fill: m[5] }));
  assert.equal(bars.length, 4, "Apr isn't a category of the axis");
  assert.deepEqual(
    bars.map((b) => b.fill),
    ["#f3622d", "#f3622d", "#fba71b", "#fba71b"],
  );
  const [janRain, marRain, janSnow, febSnow] = bars;
  assert.ok(janRain.x + janRain.w < janSnow.x && janSnow.x - (janRain.x + janRain.w) === 4, "side by side, 4 px apart");
  assert.ok(marRain.x > febSnow.x && janSnow.h > janRain.h);
  // A negative value goes down from zero.
  assert.ok(Math.abs(febSnow.y - (janRain.y + janRain.h)) < 0.02, "the negative bar starts at the zero line");
  assert.ok(svg.includes(">Jan</text>") && svg.includes(">Month</text>") && !svg.includes(">Apr</text>"));
  // Across: numbers on x, categories on y.
  const across = drawWindows(one({ ...bar, xAxis: bar.yAxis, yAxis: bar.xAxis, series: [{ name: "A", data: [[3, "Jan"], [-2, "Feb"]] }] }))[0].scene.markup;
  const h = [...across.matchAll(/<rect x="([^"]*)" y="([^"]*)" width="([^"]*)" height="([^"]*)" fill="#f3622d" stroke/g)].map((m) => ({ x: +m[1], w: +m[3], h: +m[4] }));
  assert.equal(h.length, 2);
  assert.ok(h[0].x + h[0].w <= h[1].x + 0.02 || Math.abs(h[0].x - (h[1].x + h[1].w)) < 0.02, "the negative bar ends where the positive one starts: at zero");
  assert.ok(h[0].w > h[1].w, "3 is longer than -2");
  const scatter = drawWindows(one(node(1, "ScatterChart", { title: "S", xAxis: bar.yAxis, yAxis: bar.yAxis, series: [0, 1, 2, 3, 4, 5].map((k) => ({ name: `S${k}`, data: [[k, k * 2]] })) })))[0].scene.markup;
  // Filled circle, filled square, filled diamond, a cross, a filled triangle, then a ring: each in its color.
  assert.ok(/<circle[^>]*r="5" fill="#f3622d"/.test(scatter) && /<rect[^>]*fill="#fba71b"/.test(scatter) && /<path[^>]*Z" fill="#57b757"/.test(scatter) && /<path[^>]*fill="none" stroke="#41a9c9"/.test(scatter) && /<path[^>]*Z" fill="#4258c9"/.test(scatter) && /<circle[^>]*fill="#ffffff" stroke="#9a42c8"/.test(scatter));
  // Long category names that don't fit their bands read downwards.
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const turned = drawWindows(one({ ...bar, xAxis: { ...bar.xAxis, categories: months }, series: [{ name: "x", data: months.map((m) => [m, m.length]) }] }))[0].scene.markup;
  assert.equal((turned.match(/rotate\(90\)/g) ?? []).length, 12);
});

test("canvas: drawn from its calls, as SVG in HTML (clearRect masks what was drawn before it, a whole clear forgets it), and a control when it has mouse handlers", () => {
  const calls = [
    { op: "fillRect", args: [0, 0, 220, 140], fill: "#ffffe0" },
    { op: "clearRect", args: [5, 5, 10, 10] },
    { op: "strokeRect", args: [1, 1, 218, 138], stroke: "#00008b", lineWidth: 2.5 },
    { op: "fillOval", args: [20, 20, 40, 30], fill: "#ff000080" },
    { op: "fillRect", args: [0, 0, -5, 5], fill: "#000000" },
    { op: "strokeLine", args: [0, 140, 220, "NaN"], stroke: "#008000", lineWidth: 1 },
    { op: "fillText", text: 'Hi <"1">\ntwo', args: [10, 120], fill: "#000000", font: { family: "Serif", size: 18 } },
    { op: "fillPolygon", xs: [120, 160, 140], ys: [100, 100, 70], fill: "#000000" },
    { op: "strokePolygon", xs: [170, 210, 190], ys: [100, 100, 70], stroke: "#008000", lineWidth: 2.5 },
  ];
  const svg = canvasSvg(calls, 220, 140);
  assert.match(svg, /^<svg class="fx-canvas-svg" width="220" height="140" viewBox="0 0 220 140" stroke-linecap="square"/);
  // What came before the clear is masked: a white mask with the cleared rectangle black.
  assert.match(svg, /<mask id="(fx-clear-\d+)"[^>]*><rect width="220" height="140" fill="#fff"\/><rect x="5" y="5" width="10" height="10" fill="#000"\/><\/mask>/);
  assert.match(svg, /<g mask="url\(#fx-clear-\d+\)"><rect x="0" y="0" width="220" height="140" fill="#ffffe0"\/><\/g><rect x="1" y="1" width="218" height="138" fill="none" stroke="#00008b" stroke-width="2.5"\/>/);
  assert.ok(svg.includes('<ellipse cx="40" cy="35" rx="20" ry="15" fill="#ff000080"/>'));
  assert.ok(!svg.includes("-5") && !svg.includes("<line"), "a negative size and a NaN draw nothing");
  // Text on its baseline, a line break drawing the next line 1.2 sizes lower; escaped.
  assert.ok(svg.includes('<text x="10" y="120" font-size="18" font-family="Georgia, &quot;Times New Roman&quot;, serif" fill="#000000">Hi &lt;&quot;1&quot;&gt;</text><text x="10" y="141.6"'));
  assert.ok(svg.includes('<polygon points="120,100 160,100 140,70" fill="#000000"/>') && svg.includes('<polygon points="170,210'.slice(0, 0) + '<polygon points="170,100 210,100 190,70" fill="none" stroke="#008000" stroke-width="2.5"/>'));
  assert.ok(!svg.includes("\n"));
  // A clear of the whole canvas forgets what was drawn.
  assert.ok(!canvasSvg([{ op: "fillRect", args: [0, 0, 9, 9], fill: "#ff0000" }, { op: "clearRect", args: [0, 0, 220, 140] }], 220, 140).includes("#ff0000"));
  const w = one(node(1, "VBox", { children: [node(2, "Canvas", { width: 220, height: 140, calls }), node(3, "Canvas", { id: "pad", width: 10, height: 10, onMouseDragged: true, calls: [] }), node(4, "Canvas", { width: 30, height: 20, onMouseClicked: true, calls: [] })] }));
  const kids = drawWindows(w)[0].scene.kids;
  assert.deepEqual(kids[0].canvas, { width: 220, height: 140, calls });
  assert.deepEqual([kids[0].style.width, kids[0].style.height], ["220px", "140px"]);
  assert.equal(kids[0].control, undefined, "no mouse handlers: nothing to draw on");
  assert.deepEqual(
    controls(w).map((c) => [c.kind, c.target, c.name, c.pointer]),
    [
      ["canvas", "#pad", "Canvas 2, 10 x 10", { width: 10, height: 10, scale: 1, draws: true }],
      ["canvas", "Canvas 3", "Canvas 3, 30 x 20", { width: 30, height: 20, scale: 1, draws: false }],
    ],
  );
  const html = windowDrawingHtml(w);
  assert.ok(html.includes('<span class="fx-canvas" style="width: 220px; height: 140px" data-n="2"><svg class="fx-canvas-svg"') && !html.includes("<canvas"));
});

test("canvas: the calls replayed on an HTML canvas's 2D context, with JavaFX's defaults", () => {
  const log = [];
  const ctx = new Proxy({}, { get: (_, k) => (k in ctx2 ? ctx2[k] : (...a) => log.push(`${String(k)}(${a.join(", ")})`)), set: (_, k, v) => (log.push(`${String(k)}=${v}`), true) });
  const ctx2 = {};
  paintCalls(ctx, [
    { op: "fillOval", args: [20, 20, 40, 30], fill: "#ff000080" },
    { op: "strokeLine", args: [0, 0, 10, 5], stroke: "#000000", lineWidth: 2 },
    { op: "clearRect", args: [1, 2, 3, 4] },
    { op: "strokeText", text: "x", args: [5, 6], stroke: "#008000", lineWidth: 2.5, font: { family: "Monospaced", size: 12 } },
    { op: "fillRect", args: [0, 0, 5, -1], fill: "#000000" },
  ]);
  assert.deepEqual(log.slice(0, 5), ["lineCap=square", "lineJoin=miter", "miterLimit=10", "textAlign=left", "textBaseline=alphabetic"]);
  assert.deepEqual(log.slice(5), [
    "beginPath()",
    `ellipse(40, 35, 20, 15, 0, 0, ${Math.PI * 2})`,
    "fillStyle=#ff000080",
    "fill()",
    "beginPath()",
    "moveTo(0, 0)",
    "lineTo(10, 5)",
    "strokeStyle=#000000",
    "lineWidth=2",
    "stroke()",
    "clearRect(1, 2, 3, 4)",
    'font=12px ui-monospace, Menlo, Consolas, "Liberation Mono", monospace',
    "strokeStyle=#008000",
    "lineWidth=2.5",
    "strokeText(x, 5, 6)",
  ]);
});

test("image views: the pixels as an uncompressed PNG that decodes to the same bytes, drawn larger when small with the scale said; no image, an error and a big image as boxes", async () => {
  const { inflateSync } = await import("node:zlib");
  const rgba = Uint8Array.from({ length: 3 * 2 * 4 }, (_, i) => (i * 37) % 256);
  const url = pngDataUrl(3, 2, Buffer.from(rgba).toString("base64"));
  const png = Buffer.from(url.replace(/^data:image\/png;base64,/, ""), "base64");
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20), png[24], png[25]], [3, 2, 8, 6]);
  const idat = png.subarray(png.indexOf("IDAT") + 4, png.indexOf("IEND") - 8);
  const raw = inflateSync(idat);
  assert.deepEqual([...raw], [0, ...rgba.subarray(0, 12), 0, ...rgba.subarray(12)], "each row: filter 0, then its RGBA bytes");
  assert.equal(pngDataUrl(3, 2, "AAAA"), null, "pixels that aren't the size's");
  // A big image goes over 65535 bytes: several stored blocks.
  const big = pngDataUrl(200, 100, Buffer.alloc(200 * 100 * 4, 7).toString("base64"));
  const bigPng = Buffer.from(big.split(",")[1], "base64");
  assert.equal(inflateSync(bigPng.subarray(bigPng.indexOf("IDAT") + 4, bigPng.indexOf("IEND") - 8)).length, 100 * 801);
  assert.deepEqual([imageScale(12, 8), imageScale(32, 24), imageScale(64, 48), imageScale(300, 200), imageScale(6, 4)], [8, 4, 2, 1, 8]);
  // An image view the learner clicks is drawn larger, so each pixel is a target a finger can hit
  // (the Pixel editor's 8 x 8 at 24 px a pixel, the Eyedropper's 6 x 4 at 32).
  assert.deepEqual([imageScale(8, 8, true), imageScale(6, 4, true), imageScale(32, 24, true), imageScale(64, 48, true), imageScale(300, 200, true)], [24, 32, 6, 3, 1]);
  const image = { width: 3, height: 2, crc: "00000000", pixels: Buffer.from(rgba).toString("base64") };
  const w = one(
    node(1, "HBox", {
      children: [
        node(2, "ImageView", { id: "pic", onMouseClicked: true, image }),
        node(3, "ImageView", { image: null }),
        node(4, "ImageView", { image: { error: "java.io.FileNotFoundException: x.png" } }),
        node(5, "ImageView", { image: { width: 640, height: 480, crc: "12345678" } }),
        node(6, "ImageView", { image }),
      ],
    }),
  );
  const [pic, none, error, huge, still] = drawWindows(w)[0].scene.kids;
  assert.equal(pic.kids[0].tag, "img");
  assert.deepEqual([pic.kids[0].attrs.width, pic.kids[0].attrs.height, pic.kids[0].attrs.src.slice(0, 22)], ["96", "64", "data:image/png;base64,"]);
  assert.equal(pic.kids[1].text, "drawn 32 times larger");
  // The same image in an image view without a mouse handler: 8 times.
  assert.deepEqual([still.kids[0].attrs.width, still.kids[0].attrs.height, still.kids[1].text, still.control], ["24", "16", "drawn 8 times larger", undefined]);
  assert.deepEqual([pic.control.kind, pic.control.target, pic.control.name, pic.control.pointer], ["image", "#pic", "Image view 1, 3 x 2 pixels", { width: 3, height: 2, scale: 32, draws: false }]);
  assert.deepEqual([none.text, error.text, huge.text], ["no image", "image error", "640 x 480 image, too big to draw here"]);
  assert.deepEqual([huge.style.width, huge.style.height], ["512px", "480px"]);
  assert.equal(none.control, undefined);
  const html = windowDrawingHtml(w);
  assert.match(html, /<img class="fx-image" src="data:image\/png;base64,[^"]+" width="96" height="64" alt="Image view 1: an image of 3 x 2 pixels" draggable="false"><span class="fx-image-scale">drawn 32 times larger<\/span>/);
  assert.match(html, /width="24" height="16" alt="Image view 5: an image of 3 x 2 pixels" draggable="false"><span class="fx-image-scale">drawn 8 times larger<\/span>/);
});

test("sliders: the thumb at the value, tick marks every major tick unit with the minor ones between, labels as the axis writes them (fewer when they don't fit); a control named Slider 1", () => {
  const w = one(
    node(1, "VBox", {
      children: [
        node(2, "Slider", { min: 0, max: 100, value: 60, majorTickUnit: 10, minorTickCount: 1, blockIncrement: 10, showTickLabels: true, showTickMarks: true, snapToTicks: true }),
        node(3, "Slider", { id: "speed", min: 1, max: 5, value: 2, majorTickUnit: 25, minorTickCount: 3, blockIncrement: 0.5, prefWidth: 300, disable: true }),
      ],
    }),
  );
  const [a, b] = drawWindows(w)[0].scene.kids;
  assert.match(a.cls, /fx-slider fx-slider-with-marks fx-slider-with-labels/);
  assert.equal(a.style.alignSelf, "stretch", "a slider fills a column's width, as JavaFX's does");
  assert.equal(a.style.minWidth, "140px");
  const thumb = a.kids.find((k) => k.key === "thumb");
  assert.equal(thumb.style.left, "calc(8px + 0.6 * (100% - 16px))");
  const marks = a.kids.find((k) => k.key === "marks").kids;
  assert.equal(marks.filter((m) => m.cls === "fx-tick fx-tick-major").length, 11);
  assert.equal(marks.filter((m) => m.cls === "fx-tick").length, 10, "one minor tick between each two");
  assert.deepEqual(
    a.kids.find((k) => k.key === "labels").kids.map((l) => l.text),
    ["0", "30", "60", "90"],
    "11 labels don't fit 140 px: every third",
  );
  // It snaps to ticks: the range input steps by their spacing (a minor tick between majors: 5), and a value goes to the nearest one.
  assert.deepEqual(a.control.slider, { min: 0, max: 100, value: 60, block: 10, precision: 1, snap: 5 });
  assert.deepEqual([sliderValueText(37, a.control.slider), sliderValueText(37.5, a.control.slider), sliderValueText(98, a.control.slider), sliderValueText(0.4, a.control.slider)], ["35", "40", "100", "0"]);
  const plain = { ...a.control.slider, snap: undefined };
  assert.deepEqual([a.control.kind, a.control.target, a.control.name], ["slider", "Slider 1", "Slider 1"]);
  assert.deepEqual([b.control.target, b.control.disabled, b.control.slider.precision, b.style.minWidth], ["#speed", true, 0.01, "300px"]);
  assert.equal(b.kids.length, 2, "no marks or labels unless shown");
  assert.deepEqual([sliderValueText(37.4, plain), sliderValueText(99.7, plain), sliderValueText(-3, plain)], ["37", "100", "0"]);
  assert.deepEqual([sliderValueText(2.345678, b.control.slider), sliderValueText(0.1 + 0.2 + 1, b.control.slider)], ["2.35", "1.3"]);
  assert.equal(sliderValueText(100.4, { min: 0.5, max: 100.5, precision: sliderPrecision(0.5, 100.5) }), "100");
  assert.equal(sliderValueText(3.3e-7, { min: -1e-6, max: 1e-6, precision: sliderPrecision(-1e-6, 1e-6) }), "0.00000033", "never an exponent: an event line can't read one");
  const html = windowDrawingHtml(w);
  assert.ok(html.includes('<span class="fx-slider-thumb" style="left: calc(8px + 0.6 * (100% - 16px))"></span>') && !html.includes("<input"));
});
