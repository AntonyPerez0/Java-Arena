// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.beans.value;

/** A value that tells its listeners when it changes. */
public interface ObservableValue<T> {
    /** Adds a listener, called after every change of the value (the same listener twice is called twice). */
    void addListener(ChangeListener<? super T> listener);

    /** Removes the listener (one time, if it was added several times). */
    void removeListener(ChangeListener<? super T> listener);

    /** The current value. */
    T getValue();
}
