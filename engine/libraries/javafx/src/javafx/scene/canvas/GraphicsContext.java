// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.canvas;

import arena.fx.Drawing;
import javafx.scene.paint.Color;
import javafx.scene.paint.Paint;
import javafx.scene.text.Font;

/**
 * Draws on a canvas. The fill (for fill calls and fillText), the stroke and the line width (for
 * stroke calls and strokeText) and the font (for texts) start as black, black, 1.0 and the default
 * font; as in JavaFX, setting null (or a line width that isn't above 0 and finite) changes nothing.
 * Each drawing call is recorded with the state it uses.
 */
public final class GraphicsContext {
    private final Canvas canvas;
    private final Drawing drawing;
    private Paint fill = Color.BLACK;
    private Paint stroke = Color.BLACK;
    private double lineWidth = 1.0;
    private Font font = Font.getDefault();

    GraphicsContext(Canvas canvas) {
        this.canvas = canvas;
        this.drawing = Drawing.of(canvas);
    }

    /** The canvas this draws on. */
    public Canvas getCanvas() {
        return canvas;
    }

    /** The paint of the fill calls and of fillText (null changes nothing). */
    public void setFill(Paint p) {
        if (p != null) {
            fill = p;
        }
    }

    public Paint getFill() {
        return fill;
    }

    /** The paint of the stroke calls and of strokeText (null changes nothing). */
    public void setStroke(Paint p) {
        if (p != null) {
            stroke = p;
        }
    }

    public Paint getStroke() {
        return stroke;
    }

    /** The width of stroked lines; a width that isn't above 0 and finite changes nothing. */
    public void setLineWidth(double lw) {
        if (lw > 0 && lw < Double.POSITIVE_INFINITY) {
            lineWidth = lw;
        }
    }

    public double getLineWidth() {
        return lineWidth;
    }

    /** The font of the texts (null changes nothing). */
    public void setFont(Font f) {
        if (f != null) {
            font = f;
        }
    }

    public Font getFont() {
        return font;
    }

    private void filled(String op, double... args) {
        drawing.add(new Drawing.Call(op, args, null, null, null, fill, 0, null));
    }

    private void stroked(String op, double... args) {
        drawing.add(new Drawing.Call(op, args, null, null, null, stroke, lineWidth, null));
    }

    /** Fills a rectangle with the fill. */
    public void fillRect(double x, double y, double w, double h) {
        filled("fillRect", x, y, w, h);
    }

    /** Draws the outline of a rectangle with the stroke. */
    public void strokeRect(double x, double y, double w, double h) {
        stroked("strokeRect", x, y, w, h);
    }

    /** Makes a rectangle transparent again. */
    public void clearRect(double x, double y, double w, double h) {
        drawing.add(new Drawing.Call("clearRect", new double[] { x, y, w, h }, null, null, null, null, 0, null));
    }

    /** Fills the oval inside the rectangle x, y, w, h. */
    public void fillOval(double x, double y, double w, double h) {
        filled("fillOval", x, y, w, h);
    }

    /** Draws the outline of the oval inside the rectangle x, y, w, h. */
    public void strokeOval(double x, double y, double w, double h) {
        stroked("strokeOval", x, y, w, h);
    }

    /** Draws a line from (x1, y1) to (x2, y2) with the stroke. */
    public void strokeLine(double x1, double y1, double x2, double y2) {
        stroked("strokeLine", x1, y1, x2, y2);
    }

    /** Draws the text with its baseline starting at (x, y), filled with the fill (null draws nothing). */
    public void fillText(String text, double x, double y) {
        if (text != null) {
            drawing.add(new Drawing.Call("fillText", new double[] { x, y }, text, null, null, fill, 0, font));
        }
    }

    /** Draws the outline of the text's letters with the stroke (null draws nothing). */
    public void strokeText(String text, double x, double y) {
        if (text != null) {
            drawing.add(new Drawing.Call("strokeText", new double[] { x, y }, text, null, null, stroke, lineWidth, font));
        }
    }

    /** Fills the polygon of the first nPoints points; null arrays or no points draw nothing. */
    public void fillPolygon(double[] xPoints, double[] yPoints, int nPoints) {
        polygon("fillPolygon", xPoints, yPoints, nPoints, fill, 0);
    }

    /** Draws the closed outline of the polygon of the first nPoints points; null arrays or no points draw nothing. */
    public void strokePolygon(double[] xPoints, double[] yPoints, int nPoints) {
        polygon("strokePolygon", xPoints, yPoints, nPoints, stroke, lineWidth);
    }

    private void polygon(String op, double[] xPoints, double[] yPoints, int nPoints, Paint paint, double width) {
        if (xPoints == null || yPoints == null || nPoints <= 0) {
            return;
        }
        int n = Math.min(nPoints, Math.min(xPoints.length, yPoints.length));
        if (n < nPoints) {
            // As in JavaFX: the points are read in order, x then y, so the first one missing throws.
            double missing = xPoints[n] + yPoints[n];
            throw new IllegalStateException("point " + missing);
        }
        double[] xs = new double[n];
        double[] ys = new double[n];
        for (int i = 0; i < n; i++) {
            xs[i] = xPoints[i];
            ys[i] = yPoints[i];
        }
        drawing.add(new Drawing.Call(op, null, null, xs, ys, paint, width, null));
    }
}
