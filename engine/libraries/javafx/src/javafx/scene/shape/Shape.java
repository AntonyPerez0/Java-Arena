// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import arena.fx.Frames;
import arena.fx.Overlap;
import javafx.scene.Node;
import javafx.scene.paint.Color;
import javafx.scene.paint.Paint;

/**
 * A shape: a polygon, a circle, a rectangle, a line or a text. It is filled with its fill (black
 * unless set; a Line has none) and outlined with its stroke (none unless set; a Line's is black),
 * strokeWidth wide. Shape.intersect tells whether two shapes overlap, as JavaFX does.
 */
public abstract class Shape extends Node {
    private Paint fill = Color.BLACK;
    private Paint stroke;
    private double strokeWidth = 1.0;

    public Shape() {
    }

    public final void setFill(Paint value) {
        boolean covers = (fill == null) != (value == null);
        fill = value;
        if (covers) {
            // With no fill and no stroke a shape's bounds are empty: they change.
            Frames.boxChanged(this);
        }
        Frames.touch(this, Frames.PAINT);
    }

    public final Paint getFill() {
        return fill;
    }

    public final void setStroke(Paint value) {
        stroke = value;
        Frames.touch(this, Frames.PAINT);
        Frames.reshaped(this);
    }

    public final Paint getStroke() {
        return stroke;
    }

    public final void setStrokeWidth(double value) {
        strokeWidth = value;
        Frames.reshaped(this);
    }

    public final double getStrokeWidth() {
        return strokeWidth;
    }

    /**
     * The area the two shapes have in common, as a new Path: its getBoundsInLocal() is the box
     * around that area, or empty bounds (width and height -1) when the shapes don't overlap.
     * Shapes that only touch (an edge or a corner) don't overlap. Each shape counts with its fill
     * (when it has one) and its stroke (when it has one), placed where its layout, translate and
     * rotate put it in its parent, so the two shapes should be in the same pane.
     */
    public static Shape intersect(Shape shape1, Shape shape2) {
        return Path.result(Overlap.intersect(shape1, shape2));
    }

    /** ", stroke=0xff0000ff, strokeWidth=2.0" when the shape has a stroke, as JavaFX's toString writes it. */
    final String strokeText() {
        return stroke == null ? "" : ", stroke=" + stroke + ", strokeWidth=" + strokeWidth;
    }

    /** "id=ship, " when the shape has an id. */
    final String idText() {
        String id = getId();
        return id == null ? "" : "id=" + id + ", ";
    }
}
