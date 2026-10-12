// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.shape;

import javafx.scene.paint.Paint;

/** A rectangle whose top left corner is (x, y). */
public class Rectangle extends Shape {
    private double x;
    private double y;
    private double width;
    private double height;

    public Rectangle() {
    }

    public Rectangle(double width, double height) {
        this.width = width;
        this.height = height;
    }

    public Rectangle(double width, double height, Paint fill) {
        this(width, height);
        setFill(fill);
    }

    public Rectangle(double x, double y, double width, double height) {
        this(width, height);
        this.x = x;
        this.y = y;
    }

    public final void setX(double value) {
        x = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getX() {
        return x;
    }

    public final void setY(double value) {
        y = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getY() {
        return y;
    }

    public final void setWidth(double value) {
        width = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getWidth() {
        return width;
    }

    public final void setHeight(double value) {
        height = value;
        arena.fx.Frames.reshaped(this);
    }

    public final double getHeight() {
        return height;
    }

    @Override
    public String toString() {
        return "Rectangle[" + idText() + "x=" + x + ", y=" + y + ", width=" + width + ", height=" + height + ", fill=" + getFill() + strokeText() + "]";
    }
}
