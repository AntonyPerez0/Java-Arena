// The frames of a game's animation (part 14.3), from the window JSON's "frames" block: each frame
// is a list of changes (see FrameChange in src/grader/window.ts), so the window at frame k is the
// first frame's nodes with every change up to frame k applied. FrameStates keeps the state it
// reached and a copy every CHECKPOINT frames, so playing forward applies one frame at a time and
// going back (a step back, the slider) starts again from the nearest copy before it.
//
// The window at a frame (windowAt) is a window JSON, so the same drawing (window-drawing.ts) draws
// it: the nodes the frames record keep everything else (a node's size, font, prompt text...) from
// the node with the same frame number ("f") in the window after the last event, when it has one.
// Node runs this file as it is (types are stripped): no enums, namespaces or JSX.
import type { FrameChange, WindowNode, WindowStage, WindowState } from "../grader/window.ts";

/** A node as the frames left it: its type and the latest value of each key the frames wrote. */
type Rec = Record<string, unknown>;
type State = { roots: number[]; nodes: Map<number, Rec> };

/** A copy of the state every this many frames. */
const CHECKPOINT = 120;

/** The keys a frame writes for a node's move and turn, and the window JSON's names for them. */
const MOVES: Record<string, keyof WindowNode> = {
  tx: "translateX",
  ty: "translateY",
  lx: "layoutX",
  ly: "layoutY",
  r: "rotate",
};

/**
 * The keys of the window JSON that frames record for a node of each kind (besides the move, the
 * turn and visible): a node from the last window has them taken out before the frame's are put in,
 * so a key a frame leaves out (its default) isn't the last window's value.
 */
const RECORDED: Record<string, string[]> = {
  Polygon: ["strokeWidth", "fill", "stroke", "points"],
  Circle: ["strokeWidth", "fill", "stroke", "centerX", "centerY", "radius"],
  Rectangle: ["strokeWidth", "fill", "stroke", "x", "y", "width", "height"],
  Line: ["strokeWidth", "fill", "stroke", "startX", "startY", "endX", "endY"],
  Text: ["strokeWidth", "fill", "stroke", "x", "y", "text", "font"],
  Path: ["strokeWidth", "fill", "stroke"],
};
const REGIONS = ["top", "left", "center", "right", "bottom"] as const;

const copy = (s: State): State => ({
  roots: s.roots,
  nodes: new Map([...s.nodes].map(([k, r]) => [k, { ...r }])),
});

/** The windows a game's frames showed, frame by frame. */
export class FrameStates {
  /** How many frames ran, and how many the JSON kept (the first 3600). */
  readonly count: number;
  readonly kept: number;
  private readonly list: FrameChange[][];
  private readonly last: WindowState;
  /** The last window's nodes by their frame number. */
  private readonly byF = new Map<number, WindowNode>();
  /** checkpoints[i]: the state after frame i * CHECKPOINT + 1. */
  private readonly checkpoints: State[] = [];
  private state: State = { roots: [], nodes: new Map() };
  /** The frame the state is at (1 for the first), 0 before any. */
  private at = 0;

  constructor(w: WindowState) {
    this.last = w;
    this.list = w.frames?.list ?? [];
    this.count = w.frames?.count ?? 0;
    this.kept = this.list.length;
    const walk = (n: WindowNode | null | undefined) => {
      if (!n) return;
      if (typeof n.f === "number") this.byF.set(n.f, n);
      for (const c of n.children ?? []) walk(c);
      for (const r of REGIONS) walk(n[r]);
    };
    for (const s of w.windows) walk(s.scene?.root);
  }

  /** Puts the state at frame k (1 to kept). */
  private goTo(k: number) {
    if (k < this.at) {
      const i = Math.floor((k - 1) / CHECKPOINT);
      if (i < this.checkpoints.length) {
        this.state = copy(this.checkpoints[i]);
        this.at = i * CHECKPOINT + 1;
      } else {
        this.state = { roots: [], nodes: new Map() };
        this.at = 0;
      }
    }
    while (this.at < k) {
      this.apply(this.list[this.at]);
      this.at++;
      if ((this.at - 1) % CHECKPOINT === 0 && this.checkpoints.length === (this.at - 1) / CHECKPOINT) this.checkpoints.push(copy(this.state));
    }
  }

  private apply(frame: FrameChange[] | undefined) {
    for (const change of frame ?? []) {
      if (Array.isArray(change.roots)) {
        this.state.roots = change.roots.map(Number);
        continue;
      }
      if (typeof change.k !== "number") continue;
      const rec = this.state.nodes.get(change.k);
      if (rec) Object.assign(rec, change);
      else this.state.nodes.set(change.k, { ...change });
    }
  }

  /**
   * The window at frame k (1 to kept): the frame's nodes, with the titles and sizes of the last
   * event's windows (see stageOf). A window that closed before the last event isn't in it, so its
   * frames are drawn without a title or size, and its nodes keep only what the frames record.
   */
  windowAt(k: number): WindowState {
    const frame = Math.min(Math.max(1, Math.round(k)), this.kept);
    if (frame >= 1) this.goTo(frame);
    const building = new Set<number>();
    const build = (key: number): WindowNode | null => {
      const rec = this.state.nodes.get(key);
      // A node in its own children (it can't be) or missing: left out.
      if (!rec || building.has(key)) return null;
      building.add(key);
      const node = this.node(key, rec, build);
      building.delete(key);
      return node;
    };
    const roots = this.state.roots;
    const windows = roots.map((root, i) => {
      const stage = this.stageOf(roots, root, i);
      const rootNode = root ? build(root) : null;
      return {
        title: stage?.title ?? null,
        width: stage?.width,
        height: stage?.height,
        scene: rootNode
          ? {
              width: stage?.scene?.width,
              height: stage?.scene?.height,
              root: rootNode,
            }
          : null,
      };
    });
    return { windows, problems: [] };
  }

  /**
   * The window of the last event that a frame's root belongs to, for its title and sizes: the one
   * whose scene has that root; else, when the frames show as many windows as the last event, the
   * one at the same place; else none (a window opened or closed while frames ran, so the place
   * could name another window's title and size: the frame is drawn without them).
   */
  private stageOf(roots: number[], root: number, i: number): WindowStage | undefined {
    const last = this.last.windows;
    if (root) {
      const same = last.find((w) => w.scene?.root?.f === root);
      if (same) return same;
    }
    return roots.length === last.length ? last[i] : undefined;
  }

  private node(key: number, rec: Rec, build: (k: number) => WindowNode | null): WindowNode {
    const from = this.byF.get(key);
    const type = typeof rec.type === "string" ? rec.type : (from?.type ?? "Node");
    const node: WindowNode = { ...(from ?? {}), n: key, type, f: key };
    // What the frames record: taken out, then put in from the frame (a key left out is its default).
    for (const k of [...Object.values(MOVES), "visible", ...(RECORDED[type] ?? [])]) delete (node as Record<string, unknown>)[k];
    for (const [k, v] of Object.entries(rec)) {
      if (k === "k" || k === "type" || k === "children") continue;
      if (k in MOVES) {
        if (v !== 0) (node as Record<string, unknown>)[MOVES[k]] = v;
      } else if (k === "visible") {
        if (v === false) node.visible = false;
      } else if (k === "font") {
        // The frames write a text's font every time; the window JSON leaves out JavaFX's default (System 13).
        const font = v as WindowNode["font"];
        if (font && !(font.family === "System" && font.size === 13)) node.font = font;
      } else if (k === "strokeWidth") {
        if (v !== 1) node.strokeWidth = v as number;
      } else (node as Record<string, unknown>)[k] = v;
    }
    if (Array.isArray(rec.children)) {
      const keys = rec.children.map(Number);
      if (from && REGIONS.some((r) => from[r])) {
        // A BorderPane: its regions from the last window, each while the frame still has it.
        for (const r of REGIONS) {
          const f = from[r]?.f;
          const child = f != null && keys.includes(f) ? build(f) : null;
          if (child) node[r] = child;
          else delete node[r];
        }
      } else node.children = keys.map(build).filter((c): c is WindowNode => c != null);
    }
    return node;
  }
}

/** Whether a window has frames to play (a test's stored window has only their count). */
export const hasFrames = (w: WindowState | null | undefined): w is WindowState => !!w && !!w.frames && w.frames.list.length > 0;
