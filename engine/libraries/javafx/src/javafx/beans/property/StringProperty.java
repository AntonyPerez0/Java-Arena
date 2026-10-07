// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.property;

import javafx.beans.value.ObservableValue;

/** A text value that can be read, changed and listened to, such as a label's text. */
public abstract class StringProperty implements ObservableValue<String> {
    public StringProperty() {
    }

    /** The current text. */
    public abstract String get();

    /** Changes the text; listeners are told when it really changes. */
    public abstract void set(String value);

    @Override
    public String getValue() {
        return get();
    }

    public void setValue(String value) {
        set(value);
    }
}
