// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import javafx.scene.paint.Color;

/** A line from (startX, startY) to (endX, endY), drawn with its stroke (black unless set); it has no fill. */
public class Line extends Shape {
    private double startX;
    private double startY;
    private double endX;
    private double endY;

    public Line() {
        setFill(null);
        setStroke(Color.BLACK);
    }

    public Line(double startX, double startY, double endX, double endY) {
        this();
        this.startX = startX;
        this.startY = startY;
        this.endX = endX;
        this.endY = endY;
    }

    public final void setStartX(double value) {
        startX = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getStartX() {
        return startX;
    }

    public final void setStartY(double value) {
        startY = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getStartY() {
        return startY;
    }

    public final void setEndX(double value) {
        endX = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getEndX() {
        return endX;
    }

    public final void setEndY(double value) {
        endY = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getEndY() {
        return endY;
    }

    @Override
    public String toString() {
        return "Line[" + idText() + "startX=" + startX + ", startY=" + startY + ", endX=" + endX + ", endY=" + endY + strokeText() + "]";
    }
}
