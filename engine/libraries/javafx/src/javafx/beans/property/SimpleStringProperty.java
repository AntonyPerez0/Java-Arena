// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.property;

import arena.fx.Listeners;
import java.util.Objects;
import javafx.beans.value.ChangeListener;

/** A text value of your own that listeners can follow. Its value starts as null, or as the text given. */
public class SimpleStringProperty extends StringProperty {
    private final Listeners<String> listeners = new Listeners<String>(this);
    private String value;

    public SimpleStringProperty() {
    }

    public SimpleStringProperty(String initialValue) {
        value = initialValue;
    }

    @Override
    public String get() {
        return value;
    }

    @Override
    public void set(String newValue) {
        if (!Objects.equals(value, newValue)) {
            value = newValue;
            listeners.fire();
        }
    }

    @Override
    public void addListener(ChangeListener<? super String> listener) {
        listeners.add(listener);
    }

    @Override
    public void removeListener(ChangeListener<? super String> listener) {
        listeners.remove(listener);
    }

    @Override
    public String toString() {
        return "StringProperty [value: " + get() + "]";
    }
}
