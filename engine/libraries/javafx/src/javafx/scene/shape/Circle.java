// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import javafx.scene.paint.Paint;

/** A circle around (centerX, centerY). */
public class Circle extends Shape {
    private double centerX;
    private double centerY;
    private double radius;

    public Circle() {
    }

    public Circle(double radius) {
        this.radius = radius;
    }

    public Circle(double radius, Paint fill) {
        this.radius = radius;
        setFill(fill);
    }

    public Circle(double centerX, double centerY, double radius) {
        this.centerX = centerX;
        this.centerY = centerY;
        this.radius = radius;
    }

    public Circle(double centerX, double centerY, double radius, Paint fill) {
        this(centerX, centerY, radius);
        setFill(fill);
    }

    public final void setCenterX(double value) {
        centerX = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getCenterX() {
        return centerX;
    }

    public final void setCenterY(double value) {
        centerY = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getCenterY() {
        return centerY;
    }

    public final void setRadius(double value) {
        radius = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getRadius() {
        return radius;
    }

    @Override
    public String toString() {
        return "Circle[" + idText() + "centerX=" + centerX + ", centerY=" + centerY + ", radius=" + radius + ", fill=" + getFill() + strokeText() + "]";
    }
}
