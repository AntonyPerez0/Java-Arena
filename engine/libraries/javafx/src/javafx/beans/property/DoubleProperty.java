// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.property;

import javafx.beans.value.ObservableValue;

/** A number (a double) that can be read, changed and listened to, such as a slider's value. Listeners get Numbers. */
public abstract class DoubleProperty implements ObservableValue<Number> {
    public DoubleProperty() {
    }

    /** The current value. */
    public abstract double get();

    /** Changes the value; listeners are told when it really changes. */
    public abstract void set(double value);

    /** The current value, as a Double. */
    @Override
    public Double getValue() {
        return get();
    }

    /** Changes the value (null sets 0.0, as in JavaFX). */
    public void setValue(Number v) {
        set(v == null ? 0.0 : v.doubleValue());
    }
}
