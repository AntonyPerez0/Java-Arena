// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.Objects;
import javafx.beans.property.StringProperty;
import javafx.beans.value.ChangeListener;

/** The text property of a control: it knows its control (its "bean") and its name, as JavaFX's do. */
public class OwnedStringProperty extends StringProperty {
    private final Object bean;
    private final String name;
    private final Listeners<String> listeners = new Listeners<String>(this);
    private String value;

    public OwnedStringProperty(Object bean, String name, String initialValue) {
        this.bean = bean;
        this.name = name;
        this.value = initialValue;
    }

    /** What the property stores for a value it is given (text inputs leave out characters they can't hold). */
    protected String accept(String newValue) {
        return newValue;
    }

    @Override
    public String get() {
        return value;
    }

    @Override
    public void set(String newValue) {
        String stored = accept(newValue);
        if (!Objects.equals(value, stored)) {
            value = stored;
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
        return "StringProperty [bean: " + bean + ", name: " + name + ", value: " + get() + "]";
    }
}
