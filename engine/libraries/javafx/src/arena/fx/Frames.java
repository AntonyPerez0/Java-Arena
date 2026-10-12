// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.List;
import javafx.animation.AnimationTimer;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Labeled;
import javafx.scene.control.TextInputControl;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Paint;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Window;

/**
 * The game loop: the started AnimationTimers, the frames that event lines run (frames 30), and the
 * record of what each frame showed, for the page's animation.
 *
 * <p>In each frame every timer that was started when the frame began has its handle called, in
 * the order the timers were started, even one that an earlier timer stopped in that frame; a
 * timer started during a frame runs from the next one (as in JavaFX 21, checked on OpenJFX
 * 21.0.12 with its own pulses). Frame k of the session (counting from 1) gets
 * now = 1_000_000_000 + k * 16_666_667, a made-up clock of 60 frames a second.
 *
 * <p>After the timers, the frame is recorded: the nodes of the showing windows, each with what a
 * frame can change (see WindowJson for the format), written only when it differs from the frame
 * before, so most frames are a few numbers. The first KEPT frames are kept; after that only the
 * count goes on.
 */
public final class Frames {
    /** The frames the window JSON keeps (one minute at 60 frames a second). */
    public static final int KEPT = 3600;
    /** The made-up clock: frame k gets START + k * STEP. */
    static final long START = 1_000_000_000L;
    static final long STEP = 16_666_667L;

    private static final ArrayList<AnimationTimer> TIMERS = new ArrayList<AnimationTimer>();
    private static long count;

    private Frames() {
    }

    /** AnimationTimer.start(): a timer already started keeps its place. */
    public static void start(AnimationTimer timer) {
        synchronized (TIMERS) {
            for (AnimationTimer t : TIMERS) {
                if (t == timer) {
                    return;
                }
            }
            TIMERS.add(timer);
        }
    }

    public static void stop(AnimationTimer timer) {
        synchronized (TIMERS) {
            for (int i = 0; i < TIMERS.size(); i++) {
                if (TIMERS.get(i) == timer) {
                    TIMERS.remove(i);
                    return;
                }
            }
        }
    }

    /** How many frames have run in this session. */
    static long count() {
        return count;
    }

    /**
     * Runs one frame: every timer started when it begins, in start order. A timer whose handle
     * throws ends the frame's timers there, as in JavaFX (its pulse loops over the timers with no
     * catch): the exception is printed, the timers after it skip this frame, and the next frame
     * runs them all again.
     */
    static void runOne() {
        count++;
        long now = START + count * STEP;
        AnimationTimer[] now0;
        synchronized (TIMERS) {
            now0 = TIMERS.toArray(new AnimationTimer[0]);
        }
        for (AnimationTimer timer : now0) {
            try {
                timer.handle(now);
            } catch (Throwable t) {
                Session.uncaught(t);
                return;
            }
        }
    }

    // ------------------------------------------------------------------ the record

    /** The frames recorded so far, each a JSON array of changes, separated by commas. */
    private static final JsonText RECORD = new JsonText();
    private static int kept;
    private static int lastKey;
    private static int[] lastRoots = new int[0];
    /** Whether a frame has been recorded: from then on, changes to nodes are noted (touch). */
    private static boolean watching;
    /** Whether a children list (or a grid cell) changed since the frame recorded last. */
    private static boolean structure = true;
    /** The nodes changed since the frame recorded last, in the order of their first change. */
    private static final ArrayList<Node> DIRTY = new ArrayList<Node>();
    /** The nodes of the showing windows at the frame recorded last, in outline order. */
    private static List<Node> shown = new ArrayList<Node>();

    /** What changed about a node (touch): bits, one per kind of change. */
    public static final int TRANSLATE_X = 1;
    public static final int TRANSLATE_Y = 2;
    public static final int LAYOUT_X = 4;
    public static final int LAYOUT_Y = 8;
    public static final int ROTATE = 16;
    public static final int VISIBLE = 32;
    /** A shape's fill or stroke. */
    public static final int PAINT = 64;
    /** A shape's own numbers (stroke width, size, center...), its points, a text's text or font. */
    public static final int SHAPE = 128;
    /** A control's or a text's text. */
    public static final int TEXTS = 256;
    private static final int ALL = 511;

    /**
     * Notes a change to what places, turns, shows or shapes a node (its setters call this, saying
     * what changed): its bounds and outline are worked out again, and the next frame records it,
     * looking only at what changed.
     */
    public static void touch(Node node, int what) {
        NodeData d = NodeData.of(node);
        d.version++;
        if (watching) {
            d.changed |= what;
            if (!d.dirty) {
                d.dirty = true;
                DIRTY.add(node);
            }
        }
    }

    /** Notes that a shape's own box may have changed (its fill set to or from null), without a change for the frames. */
    public static void boxChanged(Node node) {
        NodeData.of(node).shapeVersion++;
    }

    /** Notes a change to a shape's own outline (its points, size, text or stroke), then as touch. */
    public static void reshaped(Node node) {
        NodeData.of(node).shapeVersion++;
        touch(node, SHAPE | TEXTS);
    }

    /** Notes a change to a children list (or a grid cell): the next frame goes through every node. */
    public static void structureChanged() {
        structure = true;
    }

    /** What was last written about a node. */
    private static final class Seen {
        final int key;
        /** Its numbers in hundredths (see Hundredths), in the order of numberKeys, and as they were. */
        long[] numbers;
        double[] raw;
        /** A polygon's points, in hundredths and as they were, and the list's change count then. */
        long[] points;
        double[] rawPoints;
        int pointsChanges;
        Object[] texts;
        int[] children;
        boolean visible;

        Seen(int key) {
            this.key = key;
        }
    }

    /** The frame number of a node, when a frame has seen it (for the window JSON's "f"); 0 otherwise. */
    static int keyOf(Node node) {
        NodeData d = NodeData.peek(node);
        return d == null || d.seen == null ? 0 : ((Seen) d.seen).key;
    }

    private static final char[] K_FIRST = "{\"k\":".toCharArray();
    private static final char[] K_NEXT = ",{\"k\":".toCharArray();

    /** ,"key": for each key of a list of keys. */
    private static char[][] prefixes(String[] keys) {
        char[][] p = new char[keys.length][];
        for (int i = 0; i < keys.length; i++) {
            p[i] = (",\"" + keys[i] + "\":").toCharArray();
        }
        return p;
    }

    /** The prefixes of the keys of numberKeys (a list of keys is one of the lists below). */
    private static char[][] numberPrefixes(String[] keys) {
        return keys == POLYGON ? POLYGON_P : keys == CIRCLE ? CIRCLE_P : keys == RECTANGLE ? RECTANGLE_P : keys == LINE ? LINE_P : keys == TEXT ? TEXT_P : COMMON_P;
    }

    /** The key of a shape's stroke width, whose default is 1 (the others' is 0). */
    private static final String STROKE_WIDTH = "strokeWidth";

    /** The keys of the numbers a frame records, by kind of node. */
    private static final String[] COMMON = { "tx", "ty", "lx", "ly", "r" };
    private static final String[] POLYGON = { "tx", "ty", "lx", "ly", "r", STROKE_WIDTH };
    private static final String[] CIRCLE = { "tx", "ty", "lx", "ly", "r", STROKE_WIDTH, "centerX", "centerY", "radius" };
    private static final String[] RECTANGLE = { "tx", "ty", "lx", "ly", "r", STROKE_WIDTH, "x", "y", "width", "height" };
    private static final String[] LINE = { "tx", "ty", "lx", "ly", "r", STROKE_WIDTH, "startX", "startY", "endX", "endY" };
    private static final String[] TEXT = { "tx", "ty", "lx", "ly", "r", STROKE_WIDTH, "x", "y" };
    private static final char[][] COMMON_P = prefixes(COMMON);
    private static final char[][] POLYGON_P = prefixes(POLYGON);
    private static final char[][] CIRCLE_P = prefixes(CIRCLE);
    private static final char[][] RECTANGLE_P = prefixes(RECTANGLE);
    private static final char[][] LINE_P = prefixes(LINE);
    private static final char[][] TEXT_P = prefixes(TEXT);

    private static String[] numberKeys(Node node) {
        if (node instanceof Polygon) {
            return POLYGON;
        }
        if (node instanceof Circle) {
            return CIRCLE;
        }
        if (node instanceof Rectangle) {
            return RECTANGLE;
        }
        if (node instanceof Line) {
            return LINE;
        }
        if (node instanceof Text) {
            return TEXT;
        }
        if (node instanceof Shape) {
            return POLYGON;
        }
        return COMMON;
    }

    /** The numbers a frame records of the node, in the order of numberKeys, put in out. */
    private static void numbers(Node node, double[] out) {
        out[0] = node.getTranslateX();
        out[1] = node.getTranslateY();
        out[2] = node.getLayoutX();
        out[3] = node.getLayoutY();
        out[4] = node.getRotate();
        if (!(node instanceof Shape)) {
            return;
        }
        out[5] = ((Shape) node).getStrokeWidth();
        if (node instanceof Circle) {
            Circle c = (Circle) node;
            out[6] = c.getCenterX();
            out[7] = c.getCenterY();
            out[8] = c.getRadius();
        } else if (node instanceof Rectangle) {
            Rectangle c = (Rectangle) node;
            out[6] = c.getX();
            out[7] = c.getY();
            out[8] = c.getWidth();
            out[9] = c.getHeight();
        } else if (node instanceof Line) {
            Line c = (Line) node;
            out[6] = c.getStartX();
            out[7] = c.getStartY();
            out[8] = c.getEndX();
            out[9] = c.getEndY();
        } else if (node instanceof Text) {
            Text c = (Text) node;
            out[6] = c.getX();
            out[7] = c.getY();
        }
    }

    /** Where numbers puts a node's numbers (frames are recorded on the JavaFX Application Thread only). */
    private static final double[] VALUES = new double[10];

    /** The texts a frame records: a shape's fill and stroke (colors), a text's or a control's text, a text's font. */
    private static Object[] texts(Node node) {
        if (node instanceof Text) {
            Text t = (Text) node;
            return new Object[] { t.getFill(), t.getStroke(), t.getText(), t.getFont() };
        }
        if (node instanceof Shape) {
            Shape s = (Shape) node;
            return new Object[] { s.getFill(), s.getStroke() };
        }
        if (node instanceof Labeled || node instanceof TextInputControl) {
            return new Object[] { Outline.textOf(node) };
        }
        return null;
    }

    /**
     * Records the frame that just ran (the first KEPT frames; later ones are only counted). After a
     * change to a children list or to the windows, every node of the showing windows is gone
     * through; otherwise only the nodes changed since the frame before.
     */
    static void record(List<Window> windows) {
        if (kept >= KEPT) {
            // Nothing more is recorded: stop noting changes, and let go of the nodes noted since
            // the last frame recorded (or a game that keeps making nodes would hold on to them all).
            if (watching) {
                watching = false;
                for (int i = 0; i < DIRTY.size(); i++) {
                    NodeData.of(DIRTY.get(i)).dirty = false;
                }
                DIRTY.clear();
            }
            return;
        }
        watching = true;
        JsonText out = RECORD;
        if (kept > 0) {
            out.append(',');
        }
        out.append('[');
        int[] roots = new int[windows.size()];
        for (int i = 0; i < windows.size(); i++) {
            Scene scene = windows.get(i).getScene();
            roots[i] = scene == null ? 0 : seen(scene.getRoot()).key;
        }
        boolean first = true;
        boolean rootsChanged = !sameInts(roots, lastRoots);
        if (rootsChanged) {
            out.append("{\"roots\":");
            ints(out, roots);
            out.append('}');
            first = false;
            lastRoots = roots;
        }
        if (structure || rootsChanged) {
            structure = false;
            for (Node node : shown) {
                NodeData.of(node).inScene = false;
            }
            List<Node> nodes = new ArrayList<Node>();
            for (int i = 0; i < windows.size(); i++) {
                Scene scene = windows.get(i).getScene();
                if (scene != null) {
                    collect(scene.getRoot(), nodes);
                }
            }
            for (Node node : nodes) {
                NodeData.of(node).inScene = true;
                first = change(node, out, first, true);
            }
            shown = nodes;
        } else {
            for (int i = 0; i < DIRTY.size(); i++) {
                Node node = DIRTY.get(i);
                if (NodeData.of(node).inScene) {
                    first = change(node, out, first, false);
                }
            }
        }
        for (int i = 0; i < DIRTY.size(); i++) {
            NodeData.of(DIRTY.get(i)).dirty = false;
        }
        DIRTY.clear();
        out.append(']');
        kept++;
    }

    private static void collect(Node node, List<Node> out) {
        out.add(node);
        for (Node child : Outline.children(node)) {
            collect(child, out);
        }
    }

    private static Seen seen(Node node) {
        return seen(NodeData.of(node));
    }

    private static Seen seen(NodeData d) {
        if (d.seen == null) {
            d.seen = new Seen(++lastKey);
        }
        return (Seen) d.seen;
    }

    /**
     * Writes what changed about the node since the last frame that showed it (everything that
     * isn't its default, the first time); whether nothing was written before it in this frame.
     * A pane's children are compared only when full (after a change to a children list).
     */
    private static boolean change(Node node, JsonText out, boolean first, boolean full) {
        NodeData data = NodeData.of(node);
        Seen s = seen(data);
        boolean isNew = s.numbers == null;
        int what = full || isNew ? ALL : data.changed;
        data.changed = 0;
        int mark = out.length();
        out.append(first ? K_FIRST : K_NEXT).append(s.key);
        int start = out.length();
        if (isNew) {
            out.append(",\"type\":\"").append(Outline.typeName(node)).append('"');
        }
        String[] keys = numberKeys(node);
        char[][] prefixes = numberPrefixes(keys);
        double[] values = VALUES;
        if ((what & SHAPE) != 0) {
            numbers(node, values);
        } else {
            // Only the place or turn changed: just those numbers.
            values[0] = (what & TRANSLATE_X) != 0 ? node.getTranslateX() : 0;
            values[1] = (what & TRANSLATE_Y) != 0 ? node.getTranslateY() : 0;
            values[2] = (what & LAYOUT_X) != 0 ? node.getLayoutX() : 0;
            values[3] = (what & LAYOUT_Y) != 0 ? node.getLayoutY() : 0;
            values[4] = (what & ROTATE) != 0 ? node.getRotate() : 0;
        }
        int count = keys.length;
        if (isNew) {
            s.numbers = new long[count];
            s.raw = new double[count];
        }
        for (int i = 0; i < count; i++) {
            if ((what & (i < 5 ? 1 << i : SHAPE)) == 0) {
                continue;
            }
            double v = values[i];
            double was = s.raw[i];
            if (!isNew && (v == was || (v != v && was != was))) {
                // Unchanged (compared without Double.doubleToLongBits, slow in the browser's interpreter).
                continue;
            }
            long h = Hundredths.of(v);
            boolean changed = isNew ? h != (keys[i] == STROKE_WIDTH ? 100 : 0) : h != s.numbers[i] || h == Hundredths.EXACT;
            s.numbers[i] = h;
            s.raw[i] = v;
            if (changed) {
                out.append(prefixes[i]);
                Hundredths.write(out, h, v);
            }
        }
        boolean visible = (what & VISIBLE) == 0 ? s.visible : node.isVisible();
        if (isNew ? !visible : visible != s.visible) {
            out.append(visible ? ",\"visible\":true" : ",\"visible\":false");
        }
        s.visible = visible;
        if ((what & SHAPE) != 0 && node instanceof Polygon) {
            ObservableArrayList<Double> list = (ObservableArrayList<Double>) ((Polygon) node).getPoints();
            if (isNew || list.changes() != s.pointsChanges) {
                s.pointsChanges = list.changes();
                points(list, s, out);
            }
        }
        if ((what & (PAINT | SHAPE | TEXTS)) == 0) {
            // Neither paints nor texts changed.
        } else if (node instanceof Shape && !(node instanceof Text) && s.texts != null) {
            // A shape's fill and stroke, compared without making an array (most frames change neither).
            Shape shape = (Shape) node;
            if (shape.getFill() != s.texts[0] || shape.getStroke() != s.texts[1]) {
                paints(shape, s, out);
            }
        } else {
            texts(node, s, isNew, out);
        }
        if (full && node instanceof Pane) {
            List<Node> children = Outline.children(node);
            int[] keys2 = new int[children.size()];
            for (int i = 0; i < keys2.length; i++) {
                keys2[i] = seen(children.get(i)).key;
            }
            if (isNew || !sameInts(keys2, s.children)) {
                out.append(",\"children\":");
                ints(out, keys2);
            }
            s.children = keys2;
        }
        if (out.length() == start) {
            // Nothing changed.
            out.setLength(mark);
            return first;
        }
        out.append('}');
        return false;
    }

    /** A shape's fill and stroke, those that changed (identity, then equality). */
    private static void paints(Shape shape, Seen s, JsonText out) {
        Paint fill = shape.getFill();
        Paint stroke = shape.getStroke();
        if (!same(fill, s.texts[0])) {
            out.append(",\"fill\":");
            paint(out, fill);
        }
        if (!same(stroke, s.texts[1])) {
            out.append(",\"stroke\":");
            paint(out, stroke);
        }
        s.texts[0] = fill;
        s.texts[1] = stroke;
    }

    private static void paint(JsonText out, Paint p) {
        if (p == null) {
            out.append("null");
        } else {
            out.append('"').append(WindowJson.color(p)).append('"');
        }
    }

    /** The texts of a node (see texts(Node)) that changed, or all that aren't the default the first time. */
    private static void texts(Node node, Seen s, boolean isNew, JsonText out) {
        Object[] texts = texts(node);
        if (texts == null) {
            return;
        }
        if (isNew) {
            s.texts = new Object[texts.length];
        }
        for (int i = 0; i < texts.length; i++) {
            Object v = texts[i];
            if (!isNew && same(v, s.texts[i])) {
                continue;
            }
            s.texts[i] = v;
            if (node instanceof Shape && i < 2) {
                if (isNew && i == 1 && v == null) {
                    continue;
                }
                out.append(i == 0 ? ",\"fill\":" : ",\"stroke\":");
                if (v == null) {
                    out.append("null");
                } else {
                    out.append('"').append(WindowJson.color((Paint) v)).append('"');
                }
            } else if (node instanceof Text && i == 3) {
                StringBuilder font = new StringBuilder(",\"font\":");
                WindowJson.font(font, (Font) v);
                out.append(font.toString());
            } else {
                StringBuilder text = new StringBuilder(",\"text\":");
                WindowJson.string(text, (String) v);
                out.append(text.toString());
            }
        }
    }

    /** A polygon's points, when they differ (in hundredths) from those the frames last wrote. */
    private static void points(List<Double> list, Seen s, JsonText out) {
        int n = list.size() & ~1;
        long[] hs = new long[n];
        double[] raw = new double[n];
        boolean same = s.points != null && s.points.length == n;
        for (int i = 0; i < n; i++) {
            Double p = list.get(i);
            raw[i] = p == null ? Double.NaN : p;
            hs[i] = Hundredths.of(raw[i]);
            if (same && (hs[i] != s.points[i] || hs[i] == Hundredths.EXACT)) {
                same = false;
            }
        }
        if (!same) {
            out.append(",\"points\":[");
            for (int i = 0; i < n; i++) {
                if (i > 0) {
                    out.append(',');
                }
                Hundredths.write(out, hs[i], raw[i]);
            }
            out.append(']');
            s.points = hs;
            s.rawPoints = raw;
        }
    }

    private static boolean same(Object a, Object b) {
        return a == b || (a != null && a.equals(b));
    }

    private static boolean sameInts(int[] a, int[] b) {
        if (a == null || b == null || a.length != b.length) {
            return false;
        }
        for (int i = 0; i < a.length; i++) {
            if (a[i] != b[i]) {
                return false;
            }
        }
        return true;
    }

    private static void ints(JsonText out, int[] values) {
        out.append('[');
        for (int i = 0; i < values.length; i++) {
            if (i > 0) {
                out.append(',');
            }
            out.append(values[i]);
        }
        out.append(']');
    }

    /** Writes ,"frames":{"count":N,"list":[...]} when frames ran. */
    static void write(StringBuilder out) {
        if (count == 0) {
            return;
        }
        out.append(",\"frames\":{\"count\":").append(count).append(",\"list\":[").append(RECORD.toString()).append("]}");
    }
}
