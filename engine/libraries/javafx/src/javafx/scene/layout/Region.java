// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.layout;

import javafx.geometry.Insets;
import javafx.scene.Parent;

/**
 * A node with padding and a preferred size. Java Arena doesn't lay windows out: sizes are recorded
 * for the drawing of the window, and minimum and maximum sizes are only stored.
 */
public class Region extends Parent {
    /** A size of -1: let the layout work the size out (the default). */
    public static final double USE_COMPUTED_SIZE = -1;

    private Insets padding = Insets.EMPTY;
    private double prefWidth = USE_COMPUTED_SIZE;
    private double prefHeight = USE_COMPUTED_SIZE;
    private double minWidth = USE_COMPUTED_SIZE;
    private double minHeight = USE_COMPUTED_SIZE;
    private double maxWidth = USE_COMPUTED_SIZE;
    private double maxHeight = USE_COMPUTED_SIZE;

    public Region() {
    }

    /** The space inside the edges, around the contents. Can't be null. */
    public final void setPadding(Insets value) {
        if (value == null) {
            throw new NullPointerException("cannot set padding to null");
        }
        padding = value;
    }

    public final Insets getPadding() {
        return padding;
    }

    public final void setPrefWidth(double value) {
        prefWidth = value;
    }

    public final double getPrefWidth() {
        return prefWidth;
    }

    public final void setPrefHeight(double value) {
        prefHeight = value;
    }

    public final double getPrefHeight() {
        return prefHeight;
    }

    public void setPrefSize(double prefWidth, double prefHeight) {
        setPrefWidth(prefWidth);
        setPrefHeight(prefHeight);
    }

    /** Stored only: Java Arena doesn't lay windows out. */
    public void setMinSize(double minWidth, double minHeight) {
        this.minWidth = minWidth;
        this.minHeight = minHeight;
    }

    /** Stored only: Java Arena doesn't lay windows out. */
    public void setMaxSize(double maxWidth, double maxHeight) {
        this.maxWidth = maxWidth;
        this.maxHeight = maxHeight;
    }
}
