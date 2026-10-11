// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.property;

import arena.fx.Listeners;
import javafx.beans.value.ChangeListener;

/**
 * A number of your own that listeners can follow. Its value starts as 0.0, or as the number given.
 * As in JavaFX, setting the value it has changes nothing (0.0 and -0.0 count as the same, and NaN
 * as itself).
 */
public class SimpleDoubleProperty extends DoubleProperty {
    private final Listeners<Number> listeners = new Listeners<Number>(this);
    private double value;

    public SimpleDoubleProperty() {
    }

    public SimpleDoubleProperty(double initialValue) {
        value = initialValue;
    }

    @Override
    public double get() {
        return value;
    }

    @Override
    public void set(double newValue) {
        if (value != newValue) {
            value = newValue;
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
        return "DoubleProperty [value: " + get() + "]";
    }
}
