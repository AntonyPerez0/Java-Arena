// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.text;

import javafx.scene.shape.Shape;

/**
 * A text drawn as a shape, its baseline starting at (x, y): new Text(10, 20, "Points: 0"). It is
 * filled black unless set. Java Arena doesn't measure fonts, so its bounds are an estimate (see
 * getBoundsInLocal()).
 */
public class Text extends Shape {
    private String text = "";
    private double x;
    private double y;
    private Font font = Font.getDefault();

    public Text() {
    }

    public Text(String text) {
        setText(text);
    }

    public Text(double x, double y, String text) {
        this(text);
        this.x = x;
        this.y = y;
    }

    /** The text; null is kept as the empty text, as in JavaFX. */
    public final void setText(String value) {
        text = value == null ? "" : value;
        arena.fx.Frames.reshaped(this);
    }

    public final String getText() {
        return text;
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

    public final void setFont(Font value) {
        font = value;
        arena.fx.Frames.reshaped(this);
    }

    public final Font getFont() {
        return font;
    }

    @Override
    public String toString() {
        return "Text[" + (getId() == null ? "" : "id=" + getId() + ", ") + "text=\"" + text + "\", x=" + x + ", y=" + y + ", alignment=LEFT, origin=BASELINE, boundsType=LOGICAL, font=" + font + ", fontSmoothingType=GRAY, fill=" + getFill()
                + (getStroke() == null ? "" : ", stroke=" + getStroke() + ", strokeWidth=" + getStrokeWidth()) + "]";
    }
}
