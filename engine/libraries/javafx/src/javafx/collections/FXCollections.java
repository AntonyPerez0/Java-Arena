// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.collections;

import arena.fx.ObservableArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Objects;

/** Makes observable lists, such as the data of a chart. */
public class FXCollections {
    private FXCollections() {
    }

    /** A new, empty observable list. */
    public static <E> ObservableList<E> observableArrayList() {
        return new ObservableArrayList<E>();
    }

    /** A new observable list of these elements. */
    @SuppressWarnings("unchecked")
    public static <E> ObservableList<E> observableArrayList(E... items) {
        return new ObservableArrayList<E>(Arrays.asList(Objects.requireNonNull(items)));
    }

    /** A new observable list of the collection's elements, in its order. */
    public static <E> ObservableList<E> observableArrayList(Collection<? extends E> c) {
        if (c == null) {
            // JavaFX's message for this (a NullPointerException from its own code).
            throw new NullPointerException("Cannot invoke \"java.util.Collection.toArray()\" because \"c\" is null");
        }
        return new ObservableArrayList<E>(c);
    }
}
