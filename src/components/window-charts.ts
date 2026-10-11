// Charts in the drawing of a JavaFX program's windows (see window-drawing.ts): a LineChart,
// BarChart or ScatterChart of the window JSON drawn as inline SVG, in JavaFX's default (Modena)
// look, approximately: the title at the top, the legend at the bottom, the axes with their ticks,
// tick labels and labels, dashed grid lines, and the series in Modena's eight series colors. Each
// series also has a symbol shape of its own (and, in a line chart without symbols, a dash pattern
// of its own), so series differ without color; the window as text lists every point, and is the
// drawing's text alternative.
//
// Sizes follow headless OpenJFX 21 (measured, not read from its code): a chart asks for 500 x 400,
// with 5 px of padding and 10 more around the plot; the title is 24 px tall, the legend 29; tick
// labels are 10.8 px, three away from ticks 8 long; a number axis that ranges itself pads the
// data's range by 2% (keeping zero in it unless told not to), then takes the first tick unit of 1,
// 2.5 or 5 times a power of ten that leaves at least about 21.6 px a tick, at most 21 ticks, and
// room for the labels; tick labels show the unit's decimals, with grouping commas (2,500). The
// outline doesn't include what a chart ranges itself to: only the drawing does.
//
// Node runs this file as it is: types only, nothing that needs compiling.
import type { ChartAxis, ChartSeries, ChartValue, WindowNode, WindowNumber } from "../grader/window.ts";

/** Modena's default series colors (default-color0 to 7), in order; the ninth series starts again. */
export const SERIES_COLORS = ["#f3622d", "#fba71b", "#57b757", "#41a9c9", "#4258c9", "#9a42c8", "#c84164", "#888888"];

const TICK_FONT = 10.8;
const LABEL_FONT = 13;
const TITLE_FONT = 18;
const LEGEND_FONT = 12;
const TEXT = "#333333";
const TICK_TEXT = "#555555";
const AXIS_LINE = "#c3c3c3";
const GRID = "#d9d9d9";

/** About how wide a text is in the window's sans-serif font (no layout to measure with in Node). */
export function textWidth(text: string, size: number): number {
  let w = 0;
  for (const c of text) w += c === "," || c === "." || c === " " || c === "i" || c === "l" || c === "I" || c === "j" ? 0.28 : c === "-" ? 0.34 : /[A-Z]/.test(c) ? 0.66 : /[mwMW]/.test(c) ? 0.83 : 0.56;
  return w * size;
}

/** Text for SVG: escaped, a line break as a space (SVG text has one line). */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\r\n]+/g, " ");
/** A number for SVG: at most 2 decimals. */
const n2 = (v: number) => String(Math.round(v * 100) / 100);
const finite = (v: WindowNumber | ChartValue | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

// ------------------------------------------------------------------ number axes

/** JavaFX's tick units: 1, 2.5 and 5 times a power of ten, from 1E-10 to 5E15. */
const UNITS = (() => {
  const out: number[] = [];
  for (let e = -10; e <= 15; e++) for (const m of [1, 2.5, 5]) out.push(Number(`${m}e${e}`));
  return out;
})();

/** The decimals a tick unit needs (2.5: 1, 0.25: 2, 5E-4: 4, 100: 0). */
export function unitDecimals(unit: number): number {
  if (!Number.isFinite(unit) || unit <= 0) return 0;
  const s = unit.toFixed(14).replace(/0+$/, "");
  const dot = s.indexOf(".");
  return dot < 0 ? 0 : s.length - dot - 1;
}

/**
 * A number of 1E21 or more written out as Java's DecimalFormat does (toFixed writes an exponent
 * there): its shortest digits, then zeros (1E300: a 1 and 300 zeros), and `d` zero decimals.
 */
function bigFixed(value: number, d: number): string {
  const [mantissa, exp] = value.toExponential().split("e");
  const neg = mantissa.startsWith("-");
  const digits = mantissa.replace(/^-/, "").replace(".", "");
  const whole = digits.padEnd(Number(exp) + 1, "0");
  return (neg ? "-" : "") + whole + (d > 0 ? "." + "0".repeat(d) : "");
}

/** A tick's label as JavaFX's number axis writes it: the unit's decimals, grouping commas (2,500,000; 0.25; -1.5). */
export function tickLabel(value: number, unit: number): string {
  const d = Math.min(unitDecimals(unit), 14);
  let s = Math.abs(value) < 1e21 || !Number.isFinite(value) ? value.toFixed(d) : bigFixed(value, d);
  if (/^-0(\.0*)?$/.test(s)) s = s.slice(1);
  const neg = s.startsWith("-");
  const [whole, frac] = (neg ? s.slice(1) : s).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (neg ? "-" : "") + grouped + (frac != null ? "." + frac : "");
}

/** A number axis's range: its bounds and tick unit. */
export type AxisRange = { lower: number; upper: number; unit: number };

/** The tick values of a range, from its lower bound up (at most 200: else only its ends). */
export function tickValues(r: AxisRange): number[] {
  const { lower, upper, unit } = r;
  if (!(unit > 0) || !(upper >= lower)) return [lower];
  const count = Math.floor((upper - lower) / unit + 1e-9) + 1;
  if (count > 200) return [lower, upper];
  const out: number[] = [];
  for (let i = 0; i < count; i++) out.push(Math.round((lower + i * unit) / unit) * unit);
  return out;
}

/**
 * The range a number axis that ranges itself takes for data from `min` to `max` on an axis
 * `length` px long, as JavaFX's NumberAxis does (approximately): zero kept in the range unless
 * forceZero is false, the range padded by 2% (never across zero), then the first unit that leaves
 * at least about 21.6 px a tick, gives at most 21 ticks, and leaves room for the labels.
 */
export function autoRange(min: number, max: number, length: number, vertical: boolean, forceZero = true): AxisRange {
  if (forceZero) {
    if (max < 0) max = 0;
    else if (min > 0) min = 0;
  }
  const range = max - min;
  const padded = range === 0 ? (min === 0 ? 2 : Math.abs(min) * 0.02) : Math.abs(range) * 1.02;
  const pad = (padded - range) / 2;
  let lo = min - pad;
  let hi = max + pad;
  if ((lo < 0 && min >= 0) || (lo > 0 && min <= 0)) lo = 0;
  if ((hi < 0 && max >= 0) || (hi > 0 && max <= 0)) hi = 0;
  const count = Math.max(2, Math.floor(length / 21.6));
  let i = UNITS.findIndex((u) => u >= padded / count);
  if (i < 0) i = UNITS.length - 1;
  let r: AxisRange = { lower: lo, upper: hi, unit: UNITS[i] };
  for (; i < UNITS.length; i++) {
    const unit = UNITS[i];
    r = { lower: Math.floor(lo / unit) * unit, upper: Math.ceil(hi / unit) * unit, unit };
    const ticks = tickValues(r);
    if (ticks.length > 21) continue;
    const need = vertical ? ticks.length * 13 : ticks.reduce((s, v) => s + textWidth(tickLabel(v, unit), TICK_FONT), 0) + (ticks.length - 1) * 8;
    if (need <= length) break;
  }
  return r;
}

// ------------------------------------------------------------------ an axis on the page

/** An axis as drawn: where a value goes (null: it can't go on this axis), its ticks and their labels. */
type Scale = {
  category: boolean;
  /** Px along the axis (from its start: left, or bottom) of a value. */
  at: (v: ChartValue) => number | null;
  ticks: { at: number; label: string }[];
  minor: number[];
  /** Px along the axis of zero, when zero is inside the range (not at an end). */
  zero: number | null;
  /** A category's band, in px. */
  band: number;
  /** The widest tick label, in px. */
  labelWidth: number;
};

function numberScale(axis: ChartAxis, values: number[], length: number, vertical: boolean): Scale {
  let r: AxisRange;
  if (axis.autoRanging && values.length) r = autoRange(Math.min(...values), Math.max(...values), length, vertical, axis.forceZeroInRange !== false);
  else {
    const lower = finite(axis.lowerBound) ?? 0;
    const upper = finite(axis.upperBound) ?? 100;
    const unit = finite(axis.tickUnit) ?? 5;
    r = axis.autoRanging ? autoRange(lower, upper, length, vertical, false) : { lower, upper, unit };
  }
  const span = r.upper - r.lower;
  const at = (v: number) => (span > 0 ? ((v - r.lower) / span) * length : 0);
  const values2 = tickValues(r);
  const ticks = values2.map((v) => ({ at: at(v), label: tickLabel(v, r.unit) }));
  const minor: number[] = [];
  if (axis.minorTickVisible !== false && values2.length > 1 && length / (values2.length - 1) >= 15) {
    for (let k = 0; k + 1 < values2.length; k++) for (let m = 1; m < 5; m++) minor.push(at(values2[k] + (r.unit * m) / 5));
  }
  return {
    category: false,
    at: (v) => {
      const n = finite(v);
      return n == null ? null : at(n);
    },
    ticks,
    minor,
    zero: r.lower < 0 && r.upper > 0 ? at(0) : null,
    band: 0,
    labelWidth: Math.max(0, ...ticks.map((t) => textWidth(t.label, TICK_FONT))),
  };
}

function categoryScale(axis: ChartAxis, length: number): Scale {
  const names = (axis.categories ?? []).map((c) => (c == null ? "null" : c));
  const band = names.length ? Math.max(0, length - 10) / names.length : 0;
  const center = (i: number) => 5 + (i + 0.5) * band;
  return {
    category: true,
    at: (v) => {
      if (typeof v !== "string") return null;
      const i = names.indexOf(v);
      return i < 0 ? null : center(i);
    },
    ticks: names.map((label, i) => ({ at: center(i), label })),
    minor: [],
    zero: null,
    band,
    labelWidth: Math.max(0, ...names.map((t) => textWidth(t, TICK_FONT))),
  };
}

/** The numbers a series list gives one axis (x: 0, y: 1). */
const axisValues = (series: ChartSeries[], k: 0 | 1) => series.flatMap((s) => (s?.data ?? []).flatMap((d) => (d && finite(d[k]) != null ? [d[k] as number] : [])));

const scaleOf = (axis: ChartAxis, series: ChartSeries[], k: 0 | 1, length: number, vertical: boolean) => (axis.type === "CategoryAxis" ? categoryScale(axis, length) : numberScale(axis, axisValues(series, k), length, vertical));

// ------------------------------------------------------------------ symbols

/**
 * Series k's symbol at (x, y), 10 px across: a circle, square, diamond, cross, triangle, then the
 * circle, square and diamond again in the other style. A scatter chart's are filled first and
 * hollow after (as Modena's are); a line chart's are rings first (Modena's line symbol is a ring
 * with a white middle) and filled after.
 */
export function symbolSvg(k: number, x: number, y: number, chart: "line" | "scatter"): string {
  const c = SERIES_COLORS[k % 8];
  const shape = k % 8;
  const filledFirst = chart === "scatter";
  const filled = shape < 5 ? filledFirst : !filledFirst;
  // A hollow shape is drawn 2 px thick, inside the 10 px.
  const paint = filled ? `fill="${c}"` : `fill="#ffffff" stroke="${c}" stroke-width="2"`;
  const r = filled ? 5 : 4;
  switch (shape % 5) {
    case 0:
      return `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" ${paint}/>`;
    case 1:
      return `<rect x="${n2(x - r + 0.5)}" y="${n2(y - r + 0.5)}" width="${2 * r - 1}" height="${2 * r - 1}" ${paint}/>`;
    case 2:
      return `<path d="M${n2(x)} ${n2(y - r - 1)}L${n2(x + r)} ${n2(y)}L${n2(x)} ${n2(y + r + 1)}L${n2(x - r)} ${n2(y)}Z" ${paint}/>`;
    case 3:
      return `<path d="M${n2(x - 4)} ${n2(y - 4)}L${n2(x + 4)} ${n2(y + 4)}M${n2(x + 4)} ${n2(y - 4)}L${n2(x - 4)} ${n2(y + 4)}" fill="none" stroke="${c}" stroke-width="2.4"/>`;
    default:
      return `<path d="M${n2(x)} ${n2(y - r - 0.5)}L${n2(x + r + 0.5)} ${n2(y + r - 0.5)}L${n2(x - r - 0.5)} ${n2(y + r - 0.5)}Z" ${paint}/>`;
  }
}

/** A line chart without symbols: series k's dash pattern (the first is solid). */
const DASHES = ["", "9 5", "2 4", "12 4 2 4", "5 5", "14 6", "1 5", "8 3 2 3 2 3"];

// ------------------------------------------------------------------ the chart

/** A chart node's size in the drawing: its pref size, else JavaFX's 500 x 400. */
export function chartSize(node: WindowNode): { width: number; height: number } {
  const size = (v: WindowNumber | undefined, d: number) => {
    const n = finite(v);
    return n != null && n > 0 ? Math.max(120, Math.min(n, 2000)) : d;
  };
  return { width: size(node.prefWidth, 500), height: size(node.prefHeight, 400) };
}

/** What kind of chart a node is: line, bar or scatter. */
const kindOf = (type: string) => (type === "BarChart" ? "bar" : type === "ScatterChart" ? "scatter" : "line");

/** A chart node of the window JSON (LineChart, BarChart or ScatterChart) as SVG of its size. */
export function chartSvg(node: WindowNode): string {
  const { width: W, height: H } = chartSize(node);
  const kind = kindOf(node.type);
  const series = (node.series ?? []).filter((s) => s != null) as Exclude<ChartSeries, null>[];
  const xAxis = node.xAxis;
  const yAxis = node.yAxis;
  const out: string[] = [];
  const title = node.title;
  let top = 5;
  if (title != null && title !== "") {
    out.push(`<text class="fx-chart-title" x="${n2(W / 2)}" y="${n2(5 + 18.5)}" text-anchor="middle" font-size="${TITLE_FONT}" fill="${TEXT}">${esc(title)}</text>`);
    top += 24;
  }
  // The legend: one item per series, in rows that fit the chart.
  const symbols = kind !== "line" || node.createSymbols !== false;
  const items = series.map((s, k) => ({ k, name: s.name ?? "", w: (kind === "line" && !symbols ? 22 : kind === "bar" ? 12 : 10) + 5 + textWidth(s.name ?? "", LEGEND_FONT) }));
  const rows: (typeof items)[] = [];
  if (node.legendVisible !== false && items.length) {
    let row: typeof items = [];
    let used = 12;
    for (const it of items) {
      if (row.length && used + it.w > W - 10) {
        rows.push(row);
        row = [];
        used = 12;
      }
      row.push(it);
      used += it.w + (row.length > 1 ? 10 : 0);
    }
    rows.push(row);
  }
  const legendH = rows.length ? rows.length * 16 + (rows.length - 1) * 4 + 13 : 0;
  const left = 15;
  const right = W - 15;
  const plotTop = top + 10;
  const bottom = H - 5 - legendH - 10;
  if (!xAxis || !yAxis) return svgOf(W, H, out.join(""));

  // The axes: the vertical one first (its tick labels' width decides where the plot starts), then
  // the horizontal one; a category axis whose labels don't fit their bands turns them to read down,
  // which makes the horizontal axis taller, so the vertical one is worked out again.
  const xLabel = xAxis.label != null && xAxis.label !== "" ? 20 : 0;
  const yLabel = yAxis.label != null && yAxis.label !== "" ? 20 : 0;
  let xAxisH = 8 + 3 + 13.5 + xLabel;
  let rotate = false;
  let xs!: Scale;
  let ys!: Scale;
  let plotX = 0;
  let plotW = 0;
  let plotH = 0;
  for (let pass = 0; pass < 2; pass++) {
    plotH = Math.max(10, bottom - plotTop - xAxisH);
    ys = scaleOf(yAxis, series, 1, plotH, true);
    const yAxisW = (yLabel ? yLabel + 4 : 0) + ys.labelWidth + 3 + 8;
    plotX = left + yAxisW;
    plotW = Math.max(10, right - plotX);
    xs = scaleOf(xAxis, series, 0, plotW, false);
    const turn = xs.category && xs.ticks.length > 0 && xs.labelWidth > xs.band - 4;
    if (turn === rotate) break;
    rotate = turn;
    xAxisH = 8 + 3 + (rotate ? xs.labelWidth + 4 : 13.5) + xLabel;
  }
  const plotY = plotTop;
  const plotB = plotY + plotH;
  const px = (v: number) => plotX + v;
  const py = (v: number) => plotB - v;

  // Grid lines, zero lines, the plot's edges.
  const grid: string[] = [];
  for (const t of xs.ticks) grid.push(`M${n2(px(t.at))} ${n2(plotY)}V${n2(plotB)}`);
  for (const t of ys.ticks) grid.push(`M${n2(plotX)} ${n2(py(t.at))}H${n2(plotX + plotW)}`);
  if (grid.length) out.push(`<path d="${grid.join("")}" fill="none" stroke="${GRID}" stroke-width="1" stroke-dasharray="3 3"/>`);
  const zero: string[] = [];
  if (xs.zero != null) zero.push(`M${n2(px(xs.zero))} ${n2(plotY)}V${n2(plotB)}`);
  if (ys.zero != null) zero.push(`M${n2(plotX)} ${n2(py(ys.zero))}H${n2(plotX + plotW)}`);
  if (zero.length) out.push(`<path d="${zero.join("")}" fill="none" stroke="#a8a8a8" stroke-width="1"/>`);

  // The axes: their lines, ticks (minor ones shorter), tick labels and labels.
  const marks: string[] = [`M${n2(plotX)} ${n2(plotB + 0.5)}H${n2(plotX + plotW)}`, `M${n2(plotX - 0.5)} ${n2(plotY)}V${n2(plotB)}`];
  for (const t of xs.ticks) marks.push(`M${n2(px(t.at))} ${n2(plotB)}v8`);
  for (const m of xs.minor) marks.push(`M${n2(px(m))} ${n2(plotB)}v5`);
  for (const t of ys.ticks) marks.push(`M${n2(plotX)} ${n2(py(t.at))}h-8`);
  for (const m of ys.minor) marks.push(`M${n2(plotX)} ${n2(py(m))}h-5`);
  out.push(`<path d="${marks.join("")}" fill="none" stroke="${AXIS_LINE}" stroke-width="1"/>`);
  const labels: string[] = [];
  for (const t of xs.ticks) {
    if (rotate) labels.push(`<text x="0" y="0" transform="translate(${n2(px(t.at))} ${n2(plotB + 11)}) rotate(90)" dominant-baseline="central">${esc(t.label)}</text>`);
    else labels.push(`<text x="${n2(px(t.at))}" y="${n2(plotB + 11 + 10)}" text-anchor="middle">${esc(t.label)}</text>`);
  }
  for (const t of ys.ticks) labels.push(`<text x="${n2(plotX - 11)}" y="${n2(py(t.at))}" text-anchor="end" dominant-baseline="central">${esc(t.label)}</text>`);
  out.push(`<g font-size="${TICK_FONT}" fill="${TICK_TEXT}">${labels.join("")}</g>`);
  if (xLabel) out.push(`<text x="${n2(plotX + plotW / 2)}" y="${n2(plotB + xAxisH - 5)}" text-anchor="middle" font-size="${LABEL_FONT}" fill="${TEXT}">${esc(xAxis.label!)}</text>`);
  if (yLabel) out.push(`<text x="0" y="0" transform="translate(${n2(left + 10)} ${n2(plotY + plotH / 2)}) rotate(-90)" text-anchor="middle" dominant-baseline="central" font-size="${LABEL_FONT}" fill="${TEXT}">${esc(yAxis.label!)}</text>`);

  // The data, inside the plot (an inner svg clips what is far outside its bounds).
  const data: string[] = [];
  const at = (d: [ChartValue, ChartValue] | null) => {
    if (!d) return null;
    const x = xs.at(d[0]);
    const y = ys.at(d[1]);
    return x == null || y == null || !Number.isFinite(x) || !Number.isFinite(y) ? null : { x, y: plotH - y };
  };
  if (kind === "bar") {
    // Bars side by side in each category (JavaFX: 10 px between categories, 4 between bars), from zero.
    const across = ys.category && !xs.category;
    const cat = across ? ys : xs;
    const value = across ? xs : ys;
    const n = Math.max(1, series.length);
    const bw = Math.max(1, (cat.band - 10 - (n - 1) * 4 - 8) / n);
    // Bars start at zero, or at the end of the axis nearest to it when zero isn't in the range.
    const z = value.at(0);
    const zeroAt = z == null ? 0 : Math.min(Math.max(z, 0), across ? plotW : plotH);
    series.forEach((s, k) => {
      const color = SERIES_COLORS[k % 8];
      for (const d of s.data ?? []) {
        if (!d) continue;
        const c = cat.at(across ? d[1] : d[0]);
        const v = value.at(across ? d[0] : d[1]);
        if (c == null || v == null || !Number.isFinite(v)) continue;
        const start = c - (n * bw + (n - 1) * 4) / 2 + k * (bw + 4);
        const [a, b] = [Math.min(v, zeroAt), Math.max(v, zeroAt)];
        const rect = across ? { x: a, y: plotH - start - bw, w: b - a, h: bw } : { x: start, y: plotH - b, w: bw, h: b - a };
        data.push(`<rect x="${n2(rect.x)}" y="${n2(rect.y)}" width="${n2(rect.w)}" height="${n2(rect.h)}" fill="${color}" stroke="#000000" stroke-opacity="0.25" stroke-width="1"/>`);
      }
    });
  } else {
    series.forEach((s, k) => {
      const points = (s.data ?? []).map(at).filter((p): p is { x: number; y: number } => p != null);
      if (kind === "line") {
        // JavaFX's line chart joins the points in the order of their x values.
        const line = [...points].sort((p, q) => p.x - q.x);
        if (line.length > 1) data.push(`<polyline points="${line.map((p) => `${n2(p.x)},${n2(p.y)}`).join(" ")}" fill="none" stroke="${SERIES_COLORS[k % 8]}" stroke-width="3" stroke-linejoin="round"${!symbols && DASHES[k % 8] ? ` stroke-dasharray="${DASHES[k % 8]}"` : ""}/>`);
      }
      if (symbols) for (const p of points) data.push(symbolSvg(k, p.x, p.y, kind === "scatter" ? "scatter" : "line"));
    });
  }
  // The clip reaches 6 px past the plot, so a symbol on its edge is drawn whole, as JavaFX draws it.
  out.push(`<svg x="${n2(plotX - 6)}" y="${n2(plotY - 6)}" width="${n2(plotW + 12)}" height="${n2(plotH + 12)}" viewBox="-6 -6 ${n2(plotW + 12)} ${n2(plotH + 12)}" overflow="hidden">${data.join("")}</svg>`);

  // The legend, centered under the chart: a symbol (a bar's color, or a line's dashes) and the series' name.
  if (rows.length) {
    const widest = Math.max(...rows.map((r) => r.reduce((s, it) => s + it.w, 0) + (r.length - 1) * 10));
    const boxW = widest + 12;
    const boxX = (W - boxW) / 2;
    const boxY = H - 5 - legendH + 0.5;
    out.push(`<rect x="${n2(boxX)}" y="${n2(boxY)}" width="${n2(boxW)}" height="${n2(legendH - 1)}" rx="5" fill="#f5f5f5" stroke="#e0e0e0"/>`);
    rows.forEach((row, r) => {
      const rowW = row.reduce((s, it) => s + it.w, 0) + (row.length - 1) * 10;
      let x = (W - rowW) / 2;
      const cy = boxY + 6.5 + r * 20 + 8;
      for (const it of row) {
        const color = SERIES_COLORS[it.k % 8];
        let sw: number;
        if (kind === "bar") {
          out.push(`<rect x="${n2(x)}" y="${n2(cy - 6)}" width="12" height="12" fill="${color}"/>`);
          sw = 12;
        } else if (kind === "line" && !symbols) {
          out.push(`<path d="M${n2(x + 1)} ${n2(cy)}h20" stroke="${color}" stroke-width="3"${DASHES[it.k % 8] ? ` stroke-dasharray="${DASHES[it.k % 8]}"` : ""}/>`);
          sw = 22;
        } else {
          out.push(symbolSvg(it.k, x + 5, cy, kind === "scatter" ? "scatter" : "line"));
          sw = 10;
        }
        out.push(`<text x="${n2(x + sw + 5)}" y="${n2(cy)}" dominant-baseline="central" font-size="${LEGEND_FONT}" fill="${TEXT}">${esc(it.name)}</text>`);
        x += it.w + 10;
      }
    });
  }
  return svgOf(W, H, out.join(""));
}

const svgOf = (w: number, h: number, inner: string) => `<svg class="fx-chart-svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">${inner}</svg>`;
