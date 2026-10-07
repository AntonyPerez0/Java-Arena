// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import arena.fx.OwnedStringProperty;
import javafx.beans.property.StringProperty;
import javafx.scene.text.Font;

/** A control that shows a text: a label or a button. */
public abstract class Labeled extends Control {
    private final OwnedStringProperty text = new OwnedStringProperty(this, "text", "");
    private Font font = Font.getDefault();
    private boolean wrapText;

    public Labeled() {
    }

    public Labeled(String text) {
        setText(text);
    }

    /** The text, as a property that listeners can follow. */
    public final StringProperty textProperty() {
        return text;
    }

    public final void setText(String value) {
        text.set(value);
    }

    public final String getText() {
        return text.get();
    }

    public final void setFont(Font value) {
        font = value;
    }

    public final Font getFont() {
        return font;
    }

    /** Whether a text too long for the control continues on the next line. */
    public final void setWrapText(boolean value) {
        wrapText = value;
    }

    public final boolean isWrapText() {
        return wrapText;
    }

    /** As JavaFX writes it: the node, then the text in single quotes. */
    @Override
    public String toString() {
        return super.toString() + "'" + getText() + "'";
    }
}
