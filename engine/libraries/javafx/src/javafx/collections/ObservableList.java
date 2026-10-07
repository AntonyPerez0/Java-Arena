// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.collections;

import java.util.Collection;
import java.util.List;

/** A list with a few extra methods, such as the children of a pane. */
public interface ObservableList<E> extends List<E> {
    /** Adds the elements at the end. */
    @SuppressWarnings("unchecked")
    boolean addAll(E... elements);

    /** Replaces the whole list with these elements. */
    @SuppressWarnings("unchecked")
    boolean setAll(E... elements);

    /** Replaces the whole list with the elements of the collection. */
    boolean setAll(Collection<? extends E> col);

    /** Removes these elements. */
    @SuppressWarnings("unchecked")
    boolean removeAll(E... elements);

    /** Removes the elements from index from (included) to index to (not included). */
    void remove(int from, int to);
}
