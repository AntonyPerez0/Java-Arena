// Class diagrams in lesson text. A ```classes block describes classes and how they connect in a few
// lines of text; the build (scripts/build-content.mjs) draws it here as a UML class diagram: an HTML
// <figure> with an inline SVG, colored by the theme (.uml in src/styles.css), and the same content
// as text under it. Both Markdown renderers (src/components/Markdown.tsx and scripts/prerender.mjs)
// pass the HTML through as it is. The format is documented in content/README.md ("Class diagrams").
//
// Layout: one row per level of inheritance (parents above children); within a row, classes in the
// order they're declared; a class outside any inheritance next to a class it's connected to, and
// groups of classes connected to no inheritance at all in the first row with room for them. Small
// diagrams try every order of each row, then (all diagrams) move classes one at a time (a class
// outside any inheritance may also move to another row), and keep the layout with the fewest
// crossing lines, bends and changes to the declared order that fits the lesson column. Lines run
// between boxes and in the gaps between rows, so they never cross a box.
// Tests: class-diagram.test.mjs (npm run test:unit).

const ID = "[A-Za-z_$][\\w$]*";
const MULT = "\\*|\\d+(?:\\.\\.(?:\\d+|\\*))?";
const RELATION = new RegExp(`^(${ID})(?:\\s+(${MULT}))?\\s*(-->|--)\\s*(?:(${MULT})\\s*)?(${ID})(?:\\s*:\\s*(\\S.*))?$`);
const HEADER = /^(abstract\s+class|class|interface)(?=\s|$)\s*(\S*)(.*)$/;
const HEADER_REST = new RegExp(`^(?:extends\\s+(${ID}(?:\\s*,\\s*${ID})*))?\\s*(?:implements\\s+(${ID}(?:\\s*,\\s*${ID})*))?$`);
const IDENT = new RegExp(`^${ID}$`);
const VISIBILITY = { "-": "private", "+": "public", "#": "protected", "~": "package-private" };

// Drawing units: 1 unit is 1 px at the default text size (the SVG is sized in rem).
const FONT = 12;
const CHAR = FONT * 0.6; // the advance of JetBrains Mono, and about that of the usual fallbacks
const LINE = 16;
const PAD_X = 8;
const PAD_Y = 4;
const EMPTY = 8; // an empty compartment
const MIN_BOX = 64;
const GAP_X = 30;
const GAP_Y = 44;
const LEVEL0 = 22; // the first line in a gap, below the row above it
const LEVEL = 12; // between lines in a gap
const LANE = 14; // clearance of a line passing between boxes
const TRI_H = 11;
const TRI_W = 7;
const ARROW = 10;
const MARGIN = 6;
// More classes than this don't fit a phone, and take the layout a long time.
const MAX_CLASSES = 12;
// Layouts tried at most (about a second for the biggest diagrams, a few ms for small ones).
const BUDGET = 8000;
// Wider layouts cost more: the lesson column is about this wide on a laptop.
const TARGET_W = 430;
// The drawing shrinks with the column until its text is 11 px; below that it scrolls.
const MIN_SCALE = 11 / FONT;

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const textWidth = (s) => [...s].length * CHAR;
const round = (v) => Math.round(v * 10) / 10;
const list = (xs) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// ---------------------------------------------------------------- reading the text

/**
 * Reads a ```classes block. Returns { classes, relations, errors }; each error names its line
 * (counted from the first line inside the block).
 */
export function parseClassDiagram(src) {
  const classes = [];
  const relations = [];
  const errors = [];
  const byName = new Map();
  let open = null; // the class whose member lines may follow
  src.split("\n").forEach((raw, i) => {
    const line = raw.trim();
    const at = `line ${i + 1}`;
    if (!line) {
      open = null;
      return;
    }
    if (/^[-+#~]/.test(line) || line === "...") {
      if (!open) errors.push(`${at}: "${line}" is outside a class; a class's lines come right after its header, and a blank line ends the class`);
      else member(open, line, at);
      return;
    }
    const h = HEADER.exec(line);
    if (h) {
      open = null;
      const kind = h[1] === "interface" ? "interface" : "class";
      const name = h[2];
      if (!IDENT.test(name)) return errors.push(`${at}: "${line}" needs a plain Java name after "${h[1].replace(/\s+/g, " ")}", like Person`);
      if (byName.has(name)) return errors.push(`${at}: ${name} is in the diagram twice (also on line ${byName.get(name).line})`);
      const rest = HEADER_REST.exec(h[3].trim());
      const split = (s) => (s ? s.split(",").map((x) => x.trim()) : []);
      if (!rest) return errors.push(`${at}: after the name, a header can only have ${kind === "class" ? '"extends Parent" and "implements Interface, Another"' : '"extends Interface, Another"'}`);
      if (kind === "interface" && rest[2]) return errors.push(`${at}: an interface extends other interfaces ("interface ${name} extends ${split(rest[2]).join(", ")}"); it doesn't implement them`);
      if (kind === "class" && split(rest[1]).length > 1) return errors.push(`${at}: a class extends one class; interfaces go after "implements"`);
      const c = { name, kind, abstract: h[1] !== "class" && kind === "class", extends: split(rest[1]), implements: split(rest[2]), fields: [], methods: [], line: i + 1 };
      classes.push(c);
      byName.set(name, c);
      open = c;
      return;
    }
    const r = RELATION.exec(line);
    if (r) {
      open = null;
      relations.push({ from: r[1], fromMult: r[2] ?? "", directed: r[3] === "-->", toMult: r[4] ?? "", to: r[5], label: r[6]?.trim() ?? "", line: i + 1 });
      return;
    }
    errors.push(`${at}: can't read "${line}". A class starts with "class Name", "abstract class Name" or "interface Name"; its lines start with - + # or ~; a connection is "A --> B", "A --> * B" or "A -- B"`);
  });

  function member(c, line, at) {
    if (line === "...") {
      // "More members": in the compartment of the line before it.
      (c.methods.length ? c.methods : c.fields).push({ kind: "more", vis: "", text: "...", abstract: false });
      return;
    }
    const vis = line[0];
    let text = line.slice(1).trim().replace(/\s+/g, " ");
    let abstract = false;
    if (/\{abstract\}$/.test(text)) {
      abstract = true;
      text = text.replace(/\s*\{abstract\}$/, "");
    }
    const tag = /\{[^}]*\}/.exec(text);
    if (tag) return errors.push(`${at}: ${tag[0]} isn't known; {abstract} (at the end of a method's line) is the only one`);
    const m = new RegExp(`^(${ID})\\s*\\((.*)\\)\\s*(?::\\s*(\\S.*))?$`).exec(text);
    if (m) {
      const ctor = m[1] === c.name;
      if (ctor && m[3]) return errors.push(`${at}: a constructor has no return type: "${vis}${c.name}(${m[2]})"`);
      if (abstract && ctor) return errors.push(`${at}: a constructor can't be {abstract}`);
      if (abstract && !c.abstract && c.kind !== "interface") return errors.push(`${at}: ${m[1]}() is marked {abstract}, but ${c.name} isn't an abstract class: write "abstract class ${c.name}"`);
      c.methods.push({ kind: ctor ? "constructor" : "method", vis, text, abstract });
      return;
    }
    if (!new RegExp(`^${ID}\\s*:\\s*\\S`).test(text)) return errors.push(`${at}: a field is written "${vis}name: Type", a method "${vis}name(parameter: Type): Type"`);
    if (abstract) return errors.push(`${at}: {abstract} marks a method, not a field`);
    if (c.methods.length) return errors.push(`${at}: the field ${text.split(":")[0].trim()} comes after a method; fields come first, then constructors and methods`);
    c.fields.push({ kind: "field", vis, text, abstract: false });
  }

  // A name that isn't in the diagram: "add it", or the class it's probably a typo of.
  const distance = (a, b) => {
    let row = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const next = [i];
      for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      row = next;
    }
    return row[b.length];
  };
  const missing = (name, header) => {
    const near = classes.find((c) => c.name.toLowerCase() === name.toLowerCase()) ?? classes.find((c) => distance(c.name, name) <= Math.min(2, name.length / 3));
    return near ? ` (did you mean ${near.name}?)` : `; add it (a header line alone, like "${header} ${name}", is enough)`;
  };

  // Names, kinds and cycles.
  for (const c of classes) {
    const at = `line ${c.line}`;
    for (const [key, word] of [
      ["extends", "extends"],
      ["implements", "implements"],
    ])
      for (const p of c[key]) {
        const parent = byName.get(p);
        if (p === c.name) errors.push(`${at}: ${c.name} ${word} itself`);
        else if (!parent) errors.push(`${at}: ${c.name} ${word} ${p}, which isn't in the diagram${missing(p, key === "implements" || c.kind === "interface" ? "interface" : "class")}`);
        else if (c.kind === "interface" && parent.kind !== "interface") errors.push(`${at}: interface ${c.name} extends ${p}, which is a class; an interface can only extend interfaces`);
        else if (c.kind === "class" && key === "extends" && parent.kind === "interface") errors.push(`${at}: ${c.name} extends ${p}, which is an interface: write "implements ${p}"`);
        else if (key === "implements" && parent.kind !== "interface") errors.push(`${at}: ${c.name} implements ${p}, which is a class: write "extends ${p}"`);
      }
    const all = [...c.extends, ...c.implements];
    const twice = all.find((p, k) => all.indexOf(p) !== k);
    if (twice) errors.push(`${at}: ${twice} is named twice in the header of ${c.name}`);
  }
  if (!errors.length) {
    const state = new Map();
    const visit = (c, path) => {
      if (state.get(c) === "done") return false;
      if (state.get(c) === "open") {
        const loop = path.slice(path.indexOf(c));
        errors.push(`line ${c.line}: ${list(loop.map((x) => x.name))} extend each other in a circle`);
        return true;
      }
      state.set(c, "open");
      for (const p of [...c.extends, ...c.implements]) if (visit(byName.get(p), [...path, c])) return true;
      state.set(c, "done");
      return false;
    };
    for (const c of classes) if (visit(c, [])) break;
  }
  const pairs = new Map();
  for (const r of relations) {
    const at = `line ${r.line}`;
    const unknown = [...new Set([r.from, r.to].filter((n) => !byName.has(n)))];
    if (unknown.length) {
      for (const n of unknown) errors.push(`${at}: ${n} isn't in the diagram${missing(n, "class")}`);
      continue;
    }
    if (r.from === r.to) {
      errors.push(`${at}: a connection from ${r.from} to itself can't be drawn here; describe it in the text instead`);
      continue;
    }
    const key = [r.from, r.to].sort().join(" ");
    if (pairs.has(key)) errors.push(`${at}: ${r.from} and ${r.to} are already connected on line ${pairs.get(key)}; draw one line per pair ("A -- B" when both know each other)`);
    else pairs.set(key, r.line);
    for (const m of [r.fromMult, r.toMult]) {
      const range = /^(\d+)\.\.(\d+)$/.exec(m);
      if (range && Number(range[1]) > Number(range[2])) errors.push(`${at}: the multiplicity ${m} counts down; write the smaller number first`);
    }
  }
  if (!classes.length && !errors.length) errors.push("the diagram has no classes; start one with a line such as \"class Person\"");
  if (classes.length > MAX_CLASSES) errors.push(`the diagram has ${classes.length} classes; ${MAX_CLASSES} is the most that stays readable on a phone, so split it into smaller diagrams`);
  return { classes, relations, errors };
}

// ---------------------------------------------------------------- the text version

function multWords(m) {
  if (!m || m === "1") return ["one", false];
  if (m === "*" || m === "0..*") return ["any number of", true];
  if (m === "0..1") return ["at most one", false];
  if (m === "1..*") return ["one or more", true];
  const r = /^(\d+)\.\.(\d+|\*)$/.exec(m);
  if (r) return [r[2] === "*" ? `${r[1]} or more` : `${r[1]} to ${r[2]}`, true];
  return [m, m !== "1"];
}
const objects = (m, name) => {
  const [words, many] = multWords(m);
  return `${words} ${name} object${many ? "s" : ""}`;
};

function classWords(c) {
  const what = c.kind === "interface" ? "an interface" : c.abstract ? "an abstract class" : "a class";
  const parts = [];
  if (c.extends.length) parts.push(`extends ${list(c.extends)}`);
  if (c.implements.length) parts.push(`implements ${list(c.implements)}`);
  return `${what}${parts.length ? ` that ${parts.join(" and ")}` : ""}`;
}

function memberWords(m) {
  if (m.kind === "more") return "more members, not shown";
  const kind = m.kind === "field" ? "field" : m.kind === "constructor" ? "constructor" : m.abstract ? "abstract method" : "method";
  return `${VISIBILITY[m.vis]} ${kind} <code>${esc(m.text)}</code>`;
}

function relationWords(r) {
  const label = r.label ? ` (${esc(r.label)})` : "";
  if (!r.directed)
    return `${r.from} and ${r.to} know each other${label}: each ${r.from} has ${objects(r.toMult, r.to)}, and each ${r.to} has ${objects(r.fromMult, r.from)}.`;
  const back = r.fromMult ? `; each ${r.to} belongs to ${objects(r.fromMult, r.from)}` : "";
  return `Each ${r.from} has ${objects(r.toMult, r.to)}${label}${back}.`;
}

function textVersion(model) {
  const items = model.classes.map((c) => {
    const members = [...c.fields, ...c.methods].map((m) => `<li>${memberWords(m)}</li>`).join("");
    return `<li><strong>${c.name}</strong>, ${classWords(c)}${members ? `<ul>${members}</ul>` : ""}</li>`;
  });
  const connections = model.relations.map((r) => `<li>${relationWords(r)}</li>`).join("");
  return `<details class="uml-text"><summary>The diagram as text</summary><ul>${items.join("")}</ul>${connections ? `<p>Connections:</p><ul>${connections}</ul>` : ""}</details>`;
}

// ---------------------------------------------------------------- layout

function boxOf(c) {
  const head = [];
  if (c.kind === "interface") head.push({ text: "«interface»", cls: "u-st" });
  else if (c.abstract) head.push({ text: "«abstract»", cls: "u-st" });
  head.push({ text: c.name, cls: c.abstract ? "u-name u-it" : "u-name" });
  const line = (m) => ({ text: m.kind === "more" ? "..." : m.vis + m.text, cls: m.abstract ? "u-it" : "" });
  const comps = [head];
  // Fields, then constructors and methods; an interface without fields (the usual one) has no empty part for them.
  if (c.kind === "interface" && !c.fields.length) comps.push(...(c.methods.length ? [c.methods.map(line)] : []));
  else if (c.fields.length || c.methods.length) comps.push(c.fields.map(line), c.methods.map(line));
  const w = Math.max(MIN_BOX, Math.ceil(Math.max(...comps.flat().map((l) => textWidth(l.text))) + 2 * PAD_X));
  const heights = comps.map((ls) => (ls.length ? ls.length * LINE + 2 * PAD_Y : EMPTY));
  return { w, h: heights.reduce((a, b) => a + b, 0), comps, heights };
}

/** Least squares placement of values that must not decrease (pool adjacent violators). */
function isotonic(target, weight) {
  const blocks = [];
  target.forEach((t, i) => {
    blocks.push({ s: weight[i] * t, w: weight[i], n: 1 });
    while (blocks.length > 1) {
      const [a, b] = blocks.slice(-2);
      if (a.s / a.w <= b.s / b.w) break;
      blocks.pop();
      a.s += b.s;
      a.w += b.w;
      a.n += b.n;
    }
  });
  return blocks.flatMap((b) => Array(b.n).fill(b.s / b.w));
}

/** The model the layout works on: classes, their boxes, inheritance and association edges, default rows. */
function prepare(parsed) {
  const { classes, relations } = parsed;
  const index = new Map(classes.map((c, i) => [c.name, i]));
  const boxes = classes.map(boxOf);
  const edges = [];
  classes.forEach((c, i) => {
    for (const p of c.extends) edges.push({ kind: "extends", a: index.get(p), b: i, group: `${p} extends` });
    for (const p of c.implements) edges.push({ kind: "implements", a: index.get(p), b: i, group: `${p} implements` });
  });
  for (const r of relations) edges.push({ kind: "assoc", a: index.get(r.from), b: index.get(r.to), rel: r });
  const parents = classes.map((_, i) => edges.filter((e) => e.kind !== "assoc" && e.b === i).map((e) => e.a));
  const inherits = classes.map((_, i) => edges.some((e) => e.kind !== "assoc" && (e.a === i || e.b === i)));
  const depth = [];
  const depthOf = (i) => (depth[i] ??= parents[i].length ? 1 + Math.max(...parents[i].map(depthOf)) : 0);
  const row = classes.map((_, i) => (inherits[i] ? depthOf(i) : -1));
  // A class outside any inheritance goes in the row of the first class it's connected to.
  for (let changed = true; changed; ) {
    changed = false;
    for (const e of edges)
      for (const [x, y] of [
        [e.a, e.b],
        [e.b, e.a],
      ])
        if (row[x] < 0 && row[y] >= 0) {
          row[x] = row[y];
          changed = true;
        }
  }
  // Groups of classes connected to no inheritance at all, in the order they're declared: each in the
  // first row with room for it in the lesson column, or in a new row at the bottom.
  const width = [];
  classes.forEach((_, i) => row[i] >= 0 && (width[row[i]] = (width[row[i]] ?? -GAP_X) + GAP_X + boxes[i].w));
  classes.forEach((_, i) => {
    if (row[i] >= 0) return;
    const group = [i];
    for (let k = 0; k < group.length; k++)
      for (const e of edges)
        for (const [x, y] of [
          [e.a, e.b],
          [e.b, e.a],
        ])
          if (x === group[k] && !group.includes(y)) group.push(y);
    const w = group.reduce((s, c) => s + boxes[c].w + GAP_X, 0);
    let r = width.findIndex((x) => (x ?? -GAP_X) + w <= TARGET_W);
    if (r < 0) r = Math.max(width.length, 0);
    width[r] = (width[r] ?? -GAP_X) + w;
    for (const c of group) row[c] = r;
  });
  const home = row;
  const rowCount = Math.max(...home) + 1;
  return { parsed, classes, boxes, edges, inherits, home, rowCount };
}

function simplify(pts) {
  const out = [];
  for (const p of pts) {
    const last = out[out.length - 1];
    if (last && Math.abs(last[0] - p[0]) < 0.01 && Math.abs(last[1] - p[1]) < 0.01) continue;
    const prev = out[out.length - 2];
    if (prev && last && ((Math.abs(prev[0] - last[0]) < 0.01 && Math.abs(last[0] - p[0]) < 0.01) || (Math.abs(prev[1] - last[1]) < 0.01 && Math.abs(last[1] - p[1]) < 0.01))) out.pop();
    out.push(p);
  }
  return out;
}

/** Where everything goes for rows of class indices (in order), and what the layout costs. */
function geometry(model, rowsIn) {
  const { boxes, edges, classes } = model;
  const rows = rowsIn.filter((r) => r.length);
  const n = classes.length;
  const rowOf = [];
  const posOf = [];
  rows.forEach((r, ri) => r.forEach((c, pi) => ((rowOf[c] = ri), (posOf[c] = pi))));
  const routes = edges.map((e) => (rowOf[e.a] === rowOf[e.b] ? (Math.abs(posOf[e.a] - posOf[e.b]) === 1 ? "side" : "under") : "across"));

  // Across: side by side, a gap wide enough for the connection's words.
  const gapBetween = (l, r) => {
    let gap = GAP_X;
    edges.forEach((e, k) => {
      if (routes[k] !== "side" || !((e.a === l && e.b === r) || (e.a === r && e.b === l))) return;
      const [lm, rm] = e.a === l ? [e.rel.fromMult, e.rel.toMult] : [e.rel.toMult, e.rel.fromMult];
      gap = Math.max(gap, 48, 6 + textWidth(lm) + 12 + textWidth(rm) + 6, textWidth(e.rel.label) + 16);
    });
    return gap;
  };
  const gaps = rows.map((r) => r.slice(1).map((c, i) => gapBetween(r[i], c)));
  const cx = [];
  rows.forEach((r, ri) => {
    let x = 0;
    r.forEach((c, i) => {
      if (i) x += boxes[r[i - 1]].w / 2 + gaps[ri][i - 1] + boxes[c].w / 2;
      cx[c] = x;
    });
    r.forEach((c) => (cx[c] -= x / 2));
  });
  // Each box moves toward the boxes it's joined to in other rows, keeping its row's order and gaps:
  // up, down, then up again, so parents end centered over their children.
  const near = Array.from({ length: n }, () => []);
  edges.forEach((e, k) => routes[k] === "across" && (near[e.a].push(e.b), near[e.b].push(e.a)));
  for (const dir of [-1, 1, -1]) {
    const order = rows.map((_, i) => i);
    if (dir < 0) order.reverse();
    for (const ri of order) {
      const r = rows[ri];
      const want = [];
      const weight = [];
      for (const c of r) {
        const others = near[c].filter((o) => (dir > 0 ? rowOf[o] < ri : rowOf[o] > ri));
        want.push(others.length ? others.reduce((s, o) => s + cx[o], 0) / others.length : cx[c]);
        weight.push(others.length || 0.05);
      }
      const off = [0];
      for (let i = 1; i < r.length; i++) off[i] = off[i - 1] + boxes[r[i - 1]].w / 2 + gaps[ri][i - 1] + boxes[r[i]].w / 2;
      isotonic(
        want.map((d, i) => d - off[i]),
        weight,
      ).forEach((v, i) => (cx[r[i]] = v + off[i]));
    }
  }
  const left = (c) => cx[c] - boxes[c].w / 2;
  const right = (c) => cx[c] + boxes[c].w / 2;

  // Ends on the top and bottom of boxes, spread along the side in the order of where they lead.
  const sides = new Map();
  const port = (c, side, id, toward) => {
    const key = `${c} ${side}`;
    if (!sides.has(key)) sides.set(key, []);
    const list = sides.get(key);
    if (!list.some((p) => p.id === id)) list.push({ id, toward });
  };
  const groups = new Map();
  edges.forEach((e, k) => {
    if (e.kind === "assoc") return;
    if (!groups.has(e.group)) groups.set(e.group, { parent: e.a, kind: e.kind, edges: [] });
    groups.get(e.group).edges.push(k);
  });
  const upperOf = (e) => (rowOf[e.a] < rowOf[e.b] ? e.a : e.b);
  edges.forEach((e, k) => {
    if (e.kind !== "assoc") {
      const g = groups.get(e.group);
      port(e.a, "bottom", `g ${e.group}`, g.edges.reduce((s, j) => s + cx[edges[j].b], 0) / g.edges.length);
      port(e.b, "top", `e ${k}`, cx[e.a]);
    } else if (routes[k] === "across") {
      const u = upperOf(e);
      const l = u === e.a ? e.b : e.a;
      port(u, "bottom", `u ${k}`, cx[l]);
      port(l, "top", `l ${k}`, cx[u]);
    } else if (routes[k] === "under") {
      port(e.a, "bottom", `u ${k}`, cx[e.b]);
      port(e.b, "bottom", `l ${k}`, cx[e.a]);
    }
  });
  const px = new Map();
  for (const [key, list] of sides) {
    const c = Number(key.split(" ")[0]);
    list.sort((p, q) => p.toward - q.toward);
    list.forEach((p, i) => px.set(p.id, left(c) + (boxes[c].w * (i + 1)) / (list.length + 1)));
  }
  const upperId = (e, k) => (e.kind === "assoc" ? `u ${k}` : `g ${e.group}`);
  const lowerId = (e, k) => (e.kind === "assoc" ? `l ${k}` : `e ${k}`);
  // A line between neighboring rows, alone on both sides, runs straight when the boxes overlap.
  edges.forEach((e, k) => {
    if (routes[k] !== "across" || Math.abs(rowOf[e.a] - rowOf[e.b]) !== 1) return;
    if (e.kind !== "assoc" && groups.get(e.group).edges.length > 1) return;
    const u = upperOf(e);
    const l = u === e.a ? e.b : e.a;
    if (sides.get(`${u} bottom`).length > 1 || sides.get(`${l} top`).length > 1) return;
    const lo = Math.max(left(u), left(l)) + 12;
    const hi = Math.min(right(u), right(l)) - 12;
    if (lo > hi) return;
    const x = Math.min(hi, Math.max(lo, (px.get(upperId(e, k)) + px.get(lowerId(e, k))) / 2));
    px.set(upperId(e, k), x);
    px.set(lowerId(e, k), x);
  });

  // A line across more than one row passes the rows between in a free lane.
  const lane = new Map();
  const used = rows.map(() => []);
  edges.forEach((e, k) => {
    if (routes[k] !== "across") return;
    const u = upperOf(e);
    const l = u === e.a ? e.b : e.a;
    if (rowOf[l] - rowOf[u] < 2) return;
    const xu = px.get(upperId(e, k));
    const xl = px.get(lowerId(e, k));
    const blocked = [];
    for (let ri = rowOf[u] + 1; ri < rowOf[l]; ri++) {
      for (const c of rows[ri]) blocked.push([left(c) - LANE, right(c) + LANE]);
      blocked.push(...used[ri]);
    }
    blocked.sort((p, q) => p[0] - q[0]);
    const merged = [];
    for (const b of blocked) {
      const last = merged[merged.length - 1];
      if (last && b[0] <= last[1]) last[1] = Math.max(last[1], b[1]);
      else merged.push([...b]);
    }
    const free = (x) => !merged.some(([lo, hi]) => x > lo && x < hi);
    let x;
    if (free(xl)) x = xl;
    else if (free(xu)) x = xu;
    else {
      const mid = (xu + xl) / 2;
      const [lo, hi] = merged.find(([a, b]) => mid > a && mid < b) ?? [mid, mid];
      x = mid - lo <= hi - mid ? lo : hi;
    }
    lane.set(k, x);
    for (let ri = rowOf[u] + 1; ri < rowOf[l]; ri++) used[ri].push([x - 10, x + 10]);
  });

  // Horizontal runs in the gap under each row, each on a level of its own where they overlap.
  const bars = [];
  const bar = (gap, a, b, key) => Math.abs(a - b) > 0.5 && bars.push({ gap, lo: Math.min(a, b), hi: Math.max(a, b), key });
  for (const [key, g] of groups) {
    const xs = g.edges.map((k) => (lane.has(k) ? lane.get(k) : px.get(`e ${k}`)));
    bar(rowOf[g.parent], Math.min(px.get(`g ${key}`), ...xs), Math.max(px.get(`g ${key}`), ...xs), key);
  }
  edges.forEach((e, k) => {
    if (routes[k] === "under") bar(rowOf[e.a], px.get(`u ${k}`), px.get(`l ${k}`), `${k} a`);
    if (routes[k] !== "across") return;
    const u = upperOf(e);
    const l = u === e.a ? e.b : e.a;
    const xl = px.get(lowerId(e, k));
    const turn = lane.has(k) ? lane.get(k) : xl;
    if (e.kind === "assoc") bar(rowOf[u], px.get(upperId(e, k)), turn, `${k} a`);
    if (lane.has(k)) bar(rowOf[l] - 1, turn, xl, `${k} b`);
  });
  const levels = new Map();
  const count = rows.map(() => 0);
  rows.forEach((_, g) => {
    const ends = [];
    for (const b of bars.filter((x) => x.gap === g).sort((p, q) => p.lo - q.lo || p.hi - q.hi)) {
      let lv = ends.findIndex((end) => end + 10 < b.lo);
      if (lv < 0) lv = ends.length;
      ends[lv] = b.hi;
      levels.set(b.key, lv);
    }
    count[g] = ends.length;
  });

  // Rows top to bottom (boxes top-aligned), each gap tall enough for its levels.
  const rowH = rows.map((r) => Math.max(...r.map((c) => boxes[c].h)));
  const top = [];
  let y = 0;
  rows.forEach((_, ri) => {
    top[ri] = y;
    y += rowH[ri];
    const L = count[ri];
    if (ri < rows.length - 1) y += Math.max(GAP_Y, L ? LEVEL0 + (L - 1) * LEVEL + 24 : 0);
    else if (L) y += LEVEL0 + (L - 1) * LEVEL + 10;
  });
  const boxTop = (c) => top[rowOf[c]];
  const boxBottom = (c) => top[rowOf[c]] + boxes[c].h;
  const levelY = (g, key) => top[g] + rowH[g] + LEVEL0 + levels.get(key) * LEVEL;

  // The lines.
  const wires = []; // { pts, cls, wire, end?: {...}, start?: {...}, rel? }
  for (const [key, g] of groups) {
    const x0 = px.get(`g ${key}`);
    const y0 = boxBottom(g.parent);
    for (const k of g.edges) {
      const child = edges[k].b;
      const xl = px.get(`e ${k}`);
      const pts = [[x0, y0 + TRI_H]];
      const turn = lane.has(k) ? lane.get(k) : xl;
      if (levels.has(key)) pts.push([x0, levelY(rowOf[g.parent], key)], [turn, levelY(rowOf[g.parent], key)]);
      if (levels.has(`${k} b`)) pts.push([turn, levelY(rowOf[child] - 1, `${k} b`)], [xl, levelY(rowOf[child] - 1, `${k} b`)]);
      pts.push([xl, boxTop(child)]);
      wires.push({ pts: simplify(pts), cls: g.kind === "implements" ? "u-edge u-dash" : "u-edge", wire: key });
    }
  }
  edges.forEach((e, k) => {
    if (e.kind !== "assoc") return;
    let pts;
    let sa;
    let sb;
    if (routes[k] === "side") {
      const [l, r] = posOf[e.a] < posOf[e.b] ? [e.a, e.b] : [e.b, e.a];
      const yy = top[rowOf[e.a]] + Math.min(boxes[l].h, boxes[r].h) / 2;
      pts = [
        [right(l), yy],
        [left(r), yy],
      ];
      [sa, sb] = ["right", "left"];
      if (l !== e.a) {
        pts.reverse();
        [sa, sb] = ["left", "right"];
      }
    } else if (routes[k] === "under") {
      const yy = levelY(rowOf[e.a], `${k} a`);
      pts = [
        [px.get(`u ${k}`), boxBottom(e.a)],
        [px.get(`u ${k}`), yy],
        [px.get(`l ${k}`), yy],
        [px.get(`l ${k}`), boxBottom(e.b)],
      ];
      [sa, sb] = ["bottom", "bottom"];
    } else {
      const u = upperOf(e);
      const l = u === e.a ? e.b : e.a;
      const xu = px.get(`u ${k}`);
      const xl = px.get(`l ${k}`);
      const turn = lane.has(k) ? lane.get(k) : xl;
      pts = [[xu, boxBottom(u)]];
      if (levels.has(`${k} a`)) pts.push([xu, levelY(rowOf[u], `${k} a`)], [turn, levelY(rowOf[u], `${k} a`)]);
      if (levels.has(`${k} b`)) pts.push([turn, levelY(rowOf[l] - 1, `${k} b`)], [xl, levelY(rowOf[l] - 1, `${k} b`)]);
      pts.push([xl, boxTop(l)]);
      [sa, sb] = ["bottom", "top"];
      if (u !== e.a) {
        pts.reverse();
        [sa, sb] = ["top", "bottom"];
      }
    }
    wires.push({ pts: simplify(pts), cls: "u-edge", wire: `${k}`, rel: e.rel, sides: [sa, sb], route: routes[k] });
  });

  // Arrowheads, triangles and words.
  const marks = [];
  const texts = [];
  for (const [key, g] of groups) {
    const x0 = px.get(`g ${key}`);
    const y0 = boxBottom(g.parent);
    marks.push({ tri: [[x0, y0], [x0 - TRI_W, y0 + TRI_H], [x0 + TRI_W, y0 + TRI_H]] });
  }
  for (const w of wires) {
    if (!w.rel) continue;
    const { pts, rel, sides: sd } = w;
    if (rel.directed) {
      const [tx, ty] = pts[pts.length - 1];
      const [qx, qy] = pts[pts.length - 2];
      const len = Math.hypot(tx - qx, ty - qy) || 1;
      const [dx, dy] = [(tx - qx) / len, (ty - qy) / len];
      const bx = tx - dx * ARROW;
      const by = ty - dy * ARROW;
      marks.push({ arrow: [[bx - dy * 5.5, by + dx * 5.5], [tx, ty], [bx + dy * 5.5, by - dx * 5.5]] });
    }
    const multAt = (m, [x, yy], side) => {
      if (!m) return;
      if (side === "top") texts.push({ x: x + 8, y: yy - 5, text: m, anchor: "start", cls: "u-mult" });
      else if (side === "bottom") texts.push({ x: x + 8, y: yy + 13, text: m, anchor: "start", cls: "u-mult" });
      else if (side === "left") texts.push({ x: x - 6, y: yy - 7, text: m, anchor: "end", cls: "u-mult" });
      else texts.push({ x: x + 6, y: yy - 7, text: m, anchor: "start", cls: "u-mult" });
    };
    multAt(rel.fromMult, pts[0], sd[0]);
    multAt(rel.toMult, pts[pts.length - 1], sd[1]);
    if (rel.label) {
      if (w.route === "side") texts.push({ x: (pts[0][0] + pts[1][0]) / 2, y: pts[0][1] + 15, text: rel.label, anchor: "middle", cls: "u-role" });
      else {
        const [[x0, y0], [, y1]] = pts;
        const dy = Math.sign(y1 - y0) * Math.min(Math.abs(y1 - y0), GAP_Y) / 2;
        texts.push({ x: x0 - 6, y: y0 + dy + 4, text: rel.label, anchor: "end", cls: "u-role" });
      }
    }
  }

  // Bounds, then everything moved so the drawing starts at the margin.
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  const take = (x, yy) => ((minX = Math.min(minX, x)), (maxX = Math.max(maxX, x)), (minY = Math.min(minY, yy)), (maxY = Math.max(maxY, yy)));
  for (let c = 0; c < n; c++) take(left(c), boxTop(c)), take(right(c), boxBottom(c));
  for (const w of wires) for (const [x, yy] of w.pts) take(x, yy);
  for (const m of marks) for (const [x, yy] of m.tri ?? m.arrow) take(x, yy);
  for (const t of texts) {
    const tw = textWidth(t.text);
    const x0 = t.anchor === "start" ? t.x : t.anchor === "end" ? t.x - tw : t.x - tw / 2;
    take(x0, t.y - 10);
    take(x0 + tw, t.y + 3);
  }
  const dx = MARGIN - minX;
  const dy = MARGIN - minY;
  const W = Math.ceil(maxX - minX + 2 * MARGIN);
  const H = Math.ceil(maxY - minY + 2 * MARGIN);
  const at = ([x, yy]) => [round(x + dx), round(yy + dy)];
  const placed = classes.map((_, c) => ({ x: round(left(c) + dx), y: round(boxTop(c) + dy), w: boxes[c].w, h: boxes[c].h }));
  for (const w of wires) w.pts = w.pts.map(at);
  for (const m of marks) for (const key of ["tri", "arrow"]) if (m[key]) m[key] = m[key].map(at);
  for (const t of texts) [t.x, t.y] = at([t.x, t.y]);

  // What the layout costs: lines that cross or run together, bends, length, the declared order.
  const segs = wires.flatMap((w) => w.pts.slice(1).map((p, i) => ({ a: w.pts[i], b: p, wire: w.wire })));
  let crossings = 0;
  for (let i = 0; i < segs.length; i++)
    for (let j = i + 1; j < segs.length; j++) if (segs[i].wire !== segs[j].wire && meet(segs[i], segs[j])) crossings++;
  const bends = wires.reduce((s, w) => s + w.pts.length - 2, 0);
  const length = segs.reduce((s, g) => s + Math.abs(g.a[0] - g.b[0]) + Math.abs(g.a[1] - g.b[1]), 0);
  const notSide = edges.filter((e, k) => e.kind === "assoc" && routes[k] !== "side").length;
  let inversions = 0;
  for (const r of rows) for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) if (r[i] > r[j]) inversions++;
  // Between rows, when nothing else decides: a class declared earlier in the same row or above.
  let below = 0;
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (rowOf[i] > rowOf[j]) below++;
  let moved = 0;
  rowsIn.forEach((r, ri) => r.forEach((c) => !model.inherits[c] && (moved += Math.abs(ri - model.home[c]))));
  const widest = Math.max(...boxes.map((b) => b.w)) + 2 * MARGIN;
  const over = Math.max(0, W - Math.max(TARGET_W, widest));
  const cost = 40 * crossings + 3 * bends + 0.02 * length + 10 * notSide + 6 * inversions + 4 * moved + below + 2 * over + 0.05 * H;
  return { W, H, boxes: placed, wires, marks, texts, cost, crossings };
}

/** True when two straight segments cross or run along each other (not when they only touch at an end). */
function meet(s, t) {
  const hs = Math.abs(s.a[1] - s.b[1]) < 0.01;
  const ht = Math.abs(t.a[1] - t.b[1]) < 0.01;
  const span = (g, i) => [Math.min(g.a[i], g.b[i]), Math.max(g.a[i], g.b[i])];
  if (hs !== ht) {
    const [h, v] = hs ? [s, t] : [t, s];
    const [x0, x1] = span(h, 0);
    const [y0, y1] = span(v, 1);
    const x = v.a[0];
    const yy = h.a[1];
    return x > x0 + 0.5 && x < x1 - 0.5 && yy > y0 + 0.5 && yy < y1 - 0.5;
  }
  const i = hs ? 1 : 0; // the fixed coordinate
  if (Math.abs(s.a[i] - t.a[i]) > 0.5) return false;
  const [a0, a1] = span(s, 1 - i);
  const [b0, b1] = span(t, 1 - i);
  return Math.min(a1, b1) - Math.max(a0, b0) > 0.5;
}

function permutations(xs) {
  if (xs.length < 2) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]));
}

/** The layout of a parsed diagram: tries orders and rows, keeps the cheapest. */
export function layoutClassDiagram(parsed) {
  const model = prepare(parsed);
  const { classes, inherits, home, rowCount } = model;
  // One more row than the classes need, for moves into a row of their own.
  const start = Array.from({ length: rowCount + 1 }, () => []);
  classes.forEach((_, c) => start[home[c]].push(c));
  let tried = 0;
  const cost = (rows) => (tried++, geometry(model, rows).cost);
  let best = start;
  let bestCost = cost(start);
  // Every order of every row, when there aren't many.
  const factorial = (k) => (k < 2 ? 1 : k * factorial(k - 1));
  if (start.reduce((p, r) => p * factorial(r.length), 1) <= 5040) {
    const perms = start.map(permutations);
    const walk = (ri, acc) => {
      if (ri === perms.length) {
        const c = cost(acc);
        if (c < bestCost - 1e-9) [best, bestCost] = [acc, c];
        return;
      }
      for (const p of perms[ri]) walk(ri + 1, [...acc, p]);
    };
    walk(0, []);
  }
  // Then single moves while one helps: swap two classes of a row, or move one class elsewhere
  // (into another row only when it's outside any inheritance).
  for (let round = 0; round < 40 && tried < BUDGET; round++) {
    if (best[best.length - 1].length) best = [...best, []];
    let next = null;
    let nextCost = bestCost - 1e-9;
    const tryRows = (rows) => {
      const c = cost(rows);
      if (c < nextCost) [next, nextCost] = [rows, c];
    };
    best.forEach((r, ri) => {
      for (let i = 0; i < r.length; i++)
        for (let j = i + 1; j < r.length; j++) {
          const s = [...r];
          [s[i], s[j]] = [s[j], s[i]];
          tryRows(best.map((x, k) => (k === ri ? s : x)));
        }
    });
    for (let c = 0; c < classes.length; c++) {
      const from = best.findIndex((r) => r.includes(c));
      const without = best.map((r) => r.filter((x) => x !== c));
      const targets = inherits[c] ? [from] : best.map((_, i) => i);
      for (const ri of targets)
        for (let p = 0; p <= without[ri].length; p++) {
          if (ri === from && p === best[from].indexOf(c)) continue;
          tryRows(without.map((r, k) => (k === ri ? [...r.slice(0, p), c, ...r.slice(p)] : r)));
        }
    }
    if (!next) break;
    [best, bestCost] = [next, nextCost];
  }
  return { model, rows: best, ...geometry(model, best) };
}

// ---------------------------------------------------------------- drawing

function svgOf(layout) {
  const { model, W, H, boxes, wires, marks, texts } = layout;
  const out = [];
  const path = (pts) => `M${pts.map((p) => p.join(" ")).join("L")}`;
  for (const w of wires) out.push(`<path class="${w.cls}" fill="none" d="${path(w.pts)}"/>`);
  for (const m of marks) {
    if (m.tri) out.push(`<path class="u-tri" d="${path(m.tri)}Z"/>`);
    else out.push(`<path class="u-edge" fill="none" d="${path(m.arrow)}"/>`);
  }
  model.boxes.forEach((b, c) => {
    const { x, y, w, h } = boxes[c];
    out.push(`<rect class="u-bg" fill="none" x="${x}" y="${y}" width="${w}" height="${h}"/>`);
    out.push(`<rect class="u-head" fill="none" x="${x}" y="${y}" width="${w}" height="${b.heights[0]}"/>`);
    let yy = y;
    const seps = [];
    b.comps.forEach((lines, i) => {
      if (i) seps.push(`M${x} ${round(yy)}h${w}`);
      lines.forEach((l, j) => {
        const tx = i === 0 ? round(x + w / 2) : round(x + PAD_X);
        const anchor = i === 0 ? ' text-anchor="middle"' : "";
        out.push(`<text x="${tx}" y="${round(yy + PAD_Y + j * LINE + 12)}"${anchor}${l.cls ? ` class="${l.cls}"` : ""}>${esc(l.text)}</text>`);
      });
      yy += b.heights[i];
    });
    if (seps.length) out.push(`<path class="u-sep" fill="none" d="${seps.join("")}"/>`);
    out.push(`<rect class="u-frame" fill="none" x="${x}" y="${y}" width="${w}" height="${h}"/>`);
  });
  for (const t of texts) out.push(`<text x="${t.x}" y="${t.y}"${t.anchor === "start" ? "" : ` text-anchor="${t.anchor}"`} class="${t.cls}">${esc(t.text)}</text>`);
  // Rounded up, so the text is never smaller than 11 px.
  const rem = (v) => Math.ceil((v / 16) * 100) / 100;
  const style = `width:${rem(W)}rem;min-width:${rem(W * MIN_SCALE)}rem;aspect-ratio:${W}/${H}`;
  return `<svg class="uml-svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="${style}" font-size="${FONT}" aria-hidden="true" focusable="false">${out.join("")}</svg>`;
}

/**
 * A ```classes block as HTML: { html, errors }. The HTML is one <figure> without blank lines, so
 * Markdown keeps it as a single HTML block.
 */
export function classDiagram(src) {
  const parsed = parseClassDiagram(src);
  if (parsed.errors.length) return { html: "", errors: parsed.errors };
  const layout = layoutClassDiagram(parsed);
  const names = parsed.classes.map((c) => c.name);
  const label = `Class diagram of ${list(names)}`;
  // The drawing can scroll sideways on a narrow screen, so it can take the keyboard focus.
  const html = `<figure class="uml"><div class="uml-scroll" tabindex="0" role="group" aria-label="${esc(label)}">\n${svgOf(layout)}\n</div>${textVersion(parsed)}</figure>`;
  return { html, errors: [] };
}

/**
 * Lesson Markdown with every ```classes block drawn; each problem goes to onError ("class diagram 2:
 * line 3: ..."). The HTML gets a blank line before and after it, so Markdown ends the HTML block there.
 */
export function drawClassDiagrams(markdown, onError) {
  let n = 0;
  return markdown.replace(/^```[ \t]*classes[ \t]*\n([\s\S]*?)^```[ \t]*$/gm, (block, src) => {
    n++;
    const r = classDiagram(src);
    for (const e of r.errors) onError(`class diagram ${n}: ${e}`);
    return r.errors.length ? block : `\n${r.html}\n`;
  });
}

/**
 * A ```classes fence left in text after drawClassDiagrams, which draws only a fence of three
 * backticks at the start of a line: one in a list (indented, or after the item's - or 1.), in a quote (> ```classes), with ~~~
 * or with more backticks would show as its raw description. (A block with errors, left as it was,
 * starts at the start of a line and doesn't count: its errors are reported.)
 */
export const UNDRAWN_CLASSES = /^(?:[ \t>]*(?:[-*+]|\d+[.)])[ \t]+(?:`{3,}|~{3,})|[ \t>]+(?:`{3,}|~{3,})|~{3,}|`{4,})[ \t]*classes\b/m;

/** Any ```classes fence, however it's written: in text where diagrams aren't drawn at all (hints, drills). */
export const ANY_CLASSES = /^[ \t>]*(?:(?:[-*+]|\d+[.)])[ \t]+)?(?:`{3,}|~{3,})[ \t]*classes\b/m;

/** Text without the class diagrams drawn in it (for a plain-text summary of a lesson). */
export const withoutClassDiagrams = (text) => text.replace(/<figure class="uml">[\s\S]*?<\/figure>/g, " ");
