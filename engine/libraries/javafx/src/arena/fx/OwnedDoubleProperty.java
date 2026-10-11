// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import javafx.beans.property.DoubleProperty;
import javafx.beans.value.ChangeListener;

/**
 * A number property of a control (a slider's value): it knows its control and its name, as JavaFX's
 * do, and after each change it calls invalidated() before the listeners hear of it, as JavaFX's
 * properties do, so the control can correct the value (a slider keeps it between its ends).
 */
public class OwnedDoubleProperty extends DoubleProperty {
    private final Object bean;
    private final String name;
    private final Listeners<Number> listeners = new Listeners<Number>(this);
    private double value;

    public OwnedDoubleProperty(Object bean, String name, double initialValue) {
        this.bean = bean;
        this.name = name;
        this.value = initialValue;
    }

    /** Called after the value changed, before the listeners hear of it. */
    protected void invalidated() {
    }

    @Override
    public double get() {
        return value;
    }

    @Override
    public void set(double newValue) {
        if (value != newValue) {
            value = newValue;
            invalidated();
            listeners.fire();
        }
    }

    @Override
    public void addListener(ChangeListener<? super Number> listener) {
        listeners.add(listener);
    }

    @Override
    public void removeListener(ChangeListener<? super Number> listener) {
        listeners.remove(listener);
    }

    @Override
    public String toString() {
        return "DoubleProperty [bean: " + bean + ", name: " + name + ", value: " + get() + "]";
    }
}
