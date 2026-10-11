// Part of the real-JavaFX check (npm run fx-check): how a canvas's drawing is compared with real
// JavaFX, which doesn't tell what was drawn on a canvas. The driver (RealFxDriver.java) takes a
// snapshot of the canvas the program drew on with real JavaFX; the calls Java Arena's JavaFX
// recorded are drawn again on a new real canvas (CanvasReplay.java), and the two snapshots are
// compared pixel by pixel. See README.md.
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";

/** A text as CanvasReplay reads it: its UTF-16 code units as four hexadecimal digits each. */
const hexText = (s) => [...Array(s.length).keys()].map((i) => s.charCodeAt(i).toString(16).padStart(4, "0")).join("");

/** One recorded call (a DrawCall of the window JSON) as a line for CanvasReplay.java (see there). */
export const replayLine = (c) =>
  [c.op, c.args?.length ? c.args.join(",") : "-", c.xs?.length ? c.xs.join(",") : "-", c.ys?.length ? c.ys.join(",") : "-", c.fill ?? c.stroke ?? "-", c.lineWidth ?? 0, c.font?.family ?? "-", c.font?.size ?? 0, c.text ? hexText(c.text) : "-", c.font?.style ?? "-"].join("\t");

/**
 * Draws the recorded calls of each canvas of `jobs` ({ name, calls, width, height }) again on real
 * JavaFX (CanvasReplay.java, one JVM for all of them: `args` are its JVM's flags and class path).
 * Returns each one's snapshot (RGBA bytes) by name.
 */
export function replay(jobs, { dir, java, args, env }) {
  const out = new Map();
  if (!jobs.length) return out;
  mkdirSync(dir, { recursive: true });
  const input = jobs.map(({ name, calls, width, height }) => [`canvas ${name} ${width} ${height} ${calls.length}`, ...calls.map(replayLine)].join("\n")).join("\n") + "\n";
  const r = spawnSync(java, [...args, "arena.fxcheck.CanvasReplay", dir], { env, input, encoding: "utf8", maxBuffer: 64 << 20 });
  if (r.status !== 0) throw new Error(`fx-check: CanvasReplay failed:\n${r.stdout}${r.stderr}`);
  for (const { name } of jobs) out.set(name, readFileSync(join(dir, `${name}.rgba`)));
  return out;
}

/**
 * How far apart two pixels are: the largest difference of their opacity and of their premultiplied
 * red, green and blue (0 to 255), so pixels that are both nearly transparent are close.
 */
function distance(a, b, k) {
  const aa = a[k + 3];
  const ba = b[k + 3];
  let d = Math.abs(aa - ba);
  for (let c = 0; c < 3; c++) d = Math.max(d, Math.abs((a[k + c] * aa - b[k + c] * ba) / 255));
  return d;
}

/**
 * How far apart a pixel may be (see README.md). The recorded colors are rounded to 8 bits per
 * channel (#rrggbbaa), so a color a program made from doubles (Color.color(0.1, 0.2, 0.3)) can be
 * drawn up to a step or two away where it is blended; everything else is the same pixels.
 */
export const TOLERANCE = 2;

const hex2 = (v) => v.toString(16).padStart(2, "0");
const rgbaText = (p, k) => `#${hex2(p[k])}${hex2(p[k + 1])}${hex2(p[k + 2])}${hex2(p[k + 3])}`;

/**
 * Compares the snapshot of the program's real canvas with the snapshot of its recorded calls drawn
 * again on real JavaFX (both width x height RGBA, not premultiplied): every pixel must be within
 * `tolerance`. Returns { same, why, over, worst }: why says how many pixels differ and where.
 */
export function compareDrawing({ real, mine, width, height }, tolerance = TOLERANCE) {
  let worst = 0;
  let worstAt = -1;
  let over = 0;
  let first = -1;
  for (let i = 0; i < width * height; i++) {
    const d = distance(real, mine, 4 * i);
    if (d > tolerance) {
      over++;
      if (first < 0) first = i;
      if (d > worst) {
        worst = d;
        worstAt = i;
      }
    }
  }
  if (!over) return { same: true, why: "", over, worst };
  const at = (i) => `(${i % width}, ${Math.floor(i / width)})`;
  const why = `${over} of its ${width * height} pixels differ (the first at ${at(first)}; the most at ${at(worstAt)}: real JavaFX ${rgbaText(real, 4 * worstAt)}, Java Arena's recorded calls drawn on real JavaFX ${rgbaText(mine, 4 * worstAt)})`;
  return { same: false, why, over, worst };
}

/** A PNG of RGBA bytes, to look at a canvas (FX_CHECK_SAVE). */
export function png(width, height, rgba) {
  const chunk = (type, data) => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(data.length);
    head.write(type, 4, "latin1");
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])) >>> 0);
    return Buffer.concat([head, data, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

// ---------------------------------------------------------------- the self-test (FX_CHECK_CANVAS_SELFTEST=1)

const shiftColor = (hex, by) => {
  const parts = [1, 3, 5].map((k) => parseInt(hex.slice(k, k + 2), 16));
  // Away from the nearer end, so the change is never clipped away.
  return "#" + parts.map((v) => (v > 127 ? v - by : v + by).toString(16).padStart(2, "0")).join("") + hex.slice(7);
};
const plus = (v, by) => (typeof v === "number" ? v : Number(v)) + by;

/**
 * Deliberately wrong versions of a canvas's recorded calls, as a recording that is off would be:
 * for every call, moved by 1 and by 0.5 pixel, one size 1 bigger, a polygon's point moved, its
 * color off by 8 and by 32 (of 255), its line width off by 1 and by 0.5, left out, a rectangle
 * drawn as an oval and the other way round, a text one letter different, one point bigger or in
 * another family; and the last two calls in the other order. Returns [what, calls] pairs.
 */
export function wrongDrawings(calls) {
  const out = [];
  const changed = (i, what, f) => out.push([what, calls.map((c, j) => (j === i ? f(structuredClone(c)) : c))]);
  calls.forEach((c, i) => {
    const tag = `${c.op} (call ${i + 1})`;
    if (c.op === "clearRect") {
      out.push([`${tag} left out`, calls.filter((_, j) => j !== i)]);
      return;
    }
    if (c.args) {
      changed(i, `${tag} x + 1`, (d) => ((d.args[0] = plus(d.args[0], 1)), d));
      changed(i, `${tag} x + 0.5`, (d) => ((d.args[0] = plus(d.args[0], 0.5)), d));
      changed(i, `${tag} y - 1`, (d) => ((d.args[1] = plus(d.args[1], -1)), d));
      if (/Rect|Oval/.test(c.op)) changed(i, `${tag} width + 1`, (d) => ((d.args[2] = plus(d.args[2], 1)), d));
    }
    if (c.xs?.length) changed(i, `${tag} first point x + 1`, (d) => ((d.xs[0] = plus(d.xs[0], 1)), d));
    const key = c.fill != null ? "fill" : "stroke";
    changed(i, `${tag} color off by 8`, (d) => ((d[key] = shiftColor(d[key], 8)), d));
    changed(i, `${tag} color off by 32`, (d) => ((d[key] = shiftColor(d[key], 32)), d));
    if (c.stroke != null) {
      changed(i, `${tag} line width + 1`, (d) => ((d.lineWidth = plus(d.lineWidth, 1)), d));
      changed(i, `${tag} line width + 0.5`, (d) => ((d.lineWidth = plus(d.lineWidth, 0.5)), d));
    }
    if (c.op === "fillRect" || c.op === "fillOval") changed(i, `${tag} as ${c.op === "fillRect" ? "fillOval" : "fillRect"}`, (d) => ((d.op = c.op === "fillRect" ? "fillOval" : "fillRect"), d));
    if (c.text) {
      changed(i, `${tag} one letter different`, (d) => ((d.text = d.text.slice(0, -1) + (d.text.endsWith("x") ? "y" : "x")), d));
      changed(i, `${tag} font size + 1`, (d) => ((d.font.size = plus(d.font.size, 1)), d));
      changed(i, `${tag} another family`, (d) => ((d.font.family = d.font.family === "Serif" ? "System" : "Serif"), d));
    }
    out.push([`${tag} left out`, calls.filter((_, j) => j !== i)]);
  });
  if (calls.length > 1) out.push(["the last two calls in the other order", [...calls.slice(0, -2), calls[calls.length - 1], calls[calls.length - 2]]]);
  return out;
}
