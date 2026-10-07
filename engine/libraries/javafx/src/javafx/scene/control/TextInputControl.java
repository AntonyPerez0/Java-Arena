// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene.control;

import arena.fx.OwnedStringProperty;
import javafx.beans.property.StringProperty;
import javafx.scene.text.Font;

/**
 * A control the user types text in. As in JavaFX, it leaves out characters it can't hold: a text
 * field keeps no control characters (no line breaks or tabs), a text area keeps line breaks and tabs.
 */
public abstract class TextInputControl extends Control {
    private final OwnedStringProperty text;
    private final boolean multiline;
    private String promptText = "";
    private boolean editable = true;
    private Font font = Font.getDefault();

    TextInputControl(final boolean multiline) {
        this.multiline = multiline;
        text = new OwnedStringProperty(this, "text", "") {
            @Override
            protected String accept(String value) {
                return value == null ? null : filter(value, multiline);
            }
        };
    }

    private static String filter(String value, boolean multiline) {
        StringBuilder kept = null;
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            boolean keep = c != 0x7F && (c >= 0x20 || (multiline && (c == '\n' || c == '\t')));
            if (!keep && kept == null) {
                kept = new StringBuilder(value.length());
                kept.append(value, 0, i);
            } else if (keep && kept != null) {
                kept.append(c);
            }
        }
        return kept == null ? value : kept.toString();
    }

    /** The text, as a property that listeners can follow. */
    public final StringProperty textProperty() {
        return text;
    }

    public final String getText() {
        return text.get();
    }

    public final void setText(String value) {
        text.set(value);
    }

    /** Adds the text at the end (one change for listeners). */
    public void appendText(String value) {
        String added = filter(value, multiline);
        if (!added.isEmpty()) {
            String old = text.get();
            text.set((old == null ? "" : old) + added);
        }
    }

    /** Empties the text. */
    public void clear() {
        setText("");
    }

    /** The grey hint shown while the field is empty. */
    public final void setPromptText(String value) {
        promptText = value;
    }

    public final String getPromptText() {
        return promptText;
    }

    /** Whether the user can type in it (the program can always set the text). */
    public final void setEditable(boolean value) {
        editable = value;
    }

    public final boolean isEditable() {
        return editable;
    }

    /** The number of characters in the text. */
    public final int getLength() {
        String t = text.get();
        return t == null ? 0 : t.length();
    }

    public final void setFont(Font value) {
        font = value;
    }

    public final Font getFont() {
        return font;
    }
}
