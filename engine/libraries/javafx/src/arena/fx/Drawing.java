// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.ArrayList;
import java.util.IdentityHashMap;
import java.util.List;
import javafx.scene.paint.Paint;
import javafx.scene.text.Font;

/**
 * The drawing calls made on a canvas's GraphicsContext, in order, each with the state it used. Java
 * Arena doesn't rasterize: the page draws these calls, and the outline lists them. The first
 * KEPT calls are kept; later ones are only counted.
 */
public final class Drawing {
    /**
     * How many calls a canvas keeps for the drawing (the rest are counted, not kept): writing a call
     * into the window JSON takes about 0.2 ms in the browser's interpreter on a desktop, and
     * several times that on a phone, so 5000 calls stay well inside a JavaFX run's time limit.
     */
    public static final int KEPT = 5000;

    private static final IdentityHashMap<Object, Drawing> DRAWINGS = new IdentityHashMap<Object, Drawing>();

    private final List<Call> calls = new ArrayList<Call>();
    private int count;

    private Drawing() {
    }

    /** The drawing of a canvas. */
    public static synchronized Drawing of(Object canvas) {
        Drawing d = DRAWINGS.get(canvas);
        if (d == null) {
            d = new Drawing();
            DRAWINGS.put(canvas, d);
        }
        return d;
    }

    public synchronized void add(Call call) {
        count++;
        if (calls.size() < KEPT) {
            calls.add(call);
        }
    }

    /** The calls kept, in order. */
    public synchronized List<Call> calls() {
        return new ArrayList<Call>(calls);
    }

    /** How many calls were made, also those not kept. */
    public synchronized int count() {
        return count;
    }

    /** One call: its name, its numbers, and the state it used (only what the call uses is set). */
    public static final class Call {
        /** fillRect, strokeRect, clearRect, fillOval, strokeOval, strokeLine, fillText, strokeText, fillPolygon or strokePolygon. */
        public final String op;
        /** The numbers of the call (x, y, width, height; or x1, y1, x2, y2; or a text's x, y). */
        public final double[] args;
        /** The text of fillText and strokeText. */
        public final String text;
        /** The points of a polygon. */
        public final double[] xs;
        public final double[] ys;
        /** The fill of a fill call, the stroke of a stroke call; null for clearRect. */
        public final Paint paint;
        /** The line width of a stroke call (0 for the others). */
        public final double lineWidth;
        /** The font of a text call. */
        public final Font font;

        public Call(String op, double[] args, String text, double[] xs, double[] ys, Paint paint, double lineWidth, Font font) {
            this.op = op;
            this.args = args;
            this.text = text;
            this.xs = xs;
            this.ys = ys;
            this.paint = paint;
            this.lineWidth = lineWidth;
            this.font = font;
        }

        public boolean isStroke() {
            return op.startsWith("stroke");
        }
    }
}
