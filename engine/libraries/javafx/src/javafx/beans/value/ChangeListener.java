// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.value;

/** Code called when an observable value changes: usually a lambda, (observable, oldValue, newValue) -> { ... }. */
@FunctionalInterface
public interface ChangeListener<T> {
    void changed(ObservableValue<? extends T> observable, T oldValue, T newValue);
}
