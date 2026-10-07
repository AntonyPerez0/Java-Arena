// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

/** A text area of several lines. */
public class TextArea extends TextInputControl {
    private boolean wrapText;

    public TextArea() {
        super(true);
    }

    public TextArea(String text) {
        super(true);
        setText(text);
    }

    /** Whether a line too long for the area continues on the next line. */
    public final void setWrapText(boolean value) {
        wrapText = value;
    }

    public final boolean isWrapText() {
        return wrapText;
    }
}
