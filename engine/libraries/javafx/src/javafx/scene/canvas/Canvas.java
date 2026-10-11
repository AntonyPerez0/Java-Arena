// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.canvas;

import javafx.scene.Node;

/**
 * A node to draw on, through its GraphicsContext. Java Arena records the drawing calls in order
 * (with the colors, line width and font each used) and the page draws them; it doesn't keep the
 * pixels.
 */
public class Canvas extends Node {
    private double width;
    private double height;
    private final GraphicsContext graphics;

    /** A canvas of size 0 x 0. */
    public Canvas() {
        this(0, 0);
    }

    public Canvas(double width, double height) {
        this.width = width;
        this.height = height;
        graphics = new GraphicsContext(this);
    }

    /** The object that draws on this canvas (always the same one). */
    public GraphicsContext getGraphicsContext2D() {
        return graphics;
    }

    public final void setWidth(double value) {
        width = value;
    }

    public final double getWidth() {
        return width;
    }

    public final void setHeight(double value) {
        height = value;
    }

    public final double getHeight() {
        return height;
    }
}
