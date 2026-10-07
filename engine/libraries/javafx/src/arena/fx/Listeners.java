// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.Arrays;
import javafx.beans.value.ChangeListener;
import javafx.beans.value.ObservableValue;

/**
 * The change listeners of one value, told about its changes as JavaFX's ExpressionHelper tells them:
 * in the order they were added (one added twice is called twice), and only when the value differs
 * from the one they were last told about. An exception a listener throws goes to the thread's
 * uncaught exception handler (which prints it), and the other listeners are still called.
 *
 * A listener can change the value while the listeners hear of an earlier change. As in JavaFX, the
 * listeners then hear of the newer change at once, inside that listener's call, and the listeners
 * after it in the earlier round get the earlier old value with the newest value: when the newer
 * change set the value back, their old and new values are equal.
 *
 * The listeners and the value they last heard of are kept together in a Group, as JavaFX keeps them
 * in its helper object: a new one, starting from the value as it is then, for the first listener,
 * the second, and a removal that leaves one. A round that is running keeps its own Group, so after
 * such a change its listeners get the value of their Group, as in JavaFX.
 */
public final class Listeners<T> {
    private final ObservableValue<T> owner;
    /** The listeners and the value they were last told about; null when there are none. */
    private Group<T> group;

    /** The listeners of the value `owner` holds (they are told `owner.getValue()`). */
    public Listeners(ObservableValue<T> owner) {
        this.owner = owner;
    }

    public void add(ChangeListener<? super T> listener) {
        if (listener == null) {
            throw new NullPointerException();
        }
        if (group == null) {
            group = new Group<T>(listOf(listener), owner.getValue());
        } else if (group.list.length == 1) {
            group = new Group<T>(append(group.list, listener), owner.getValue());
        } else {
            group.list = append(group.list, listener);
        }
    }

    public void remove(ChangeListener<? super T> listener) {
        if (listener == null) {
            throw new NullPointerException();
        }
        if (group == null) {
            return;
        }
        ChangeListener<? super T>[] list = group.list;
        for (int i = 0; i < list.length; i++) {
            if (listener.equals(list[i])) {
                ChangeListener<? super T>[] shorter = Arrays.copyOf(list, list.length - 1);
                System.arraycopy(list, i + 1, shorter, i, list.length - i - 1);
                if (shorter.length == 0) {
                    group = null;
                } else if (shorter.length == 1) {
                    group = new Group<T>(shorter, owner.getValue());
                } else {
                    group.list = shorter;
                }
                return;
            }
        }
    }

    /** Tells the listeners that the value may have changed: they hear of it if it really did. */
    public void fire() {
        Group<T> now = group;
        if (now != null) {
            now.fire(owner);
        }
    }

    @SuppressWarnings({ "unchecked", "rawtypes" })
    private static <T> ChangeListener<? super T>[] listOf(ChangeListener<? super T> listener) {
        ChangeListener<? super T>[] list = new ChangeListener[1];
        list[0] = listener;
        return list;
    }

    private static <T> ChangeListener<? super T>[] append(ChangeListener<? super T>[] list, ChangeListener<? super T> listener) {
        ChangeListener<? super T>[] longer = Arrays.copyOf(list, list.length + 1);
        longer[list.length] = listener;
        return longer;
    }

    private static final class Group<T> {
        /** Replaced, never changed, so that a round that is running calls the listeners it started with. */
        ChangeListener<? super T>[] list;
        /** The value the listeners were last told about. */
        T currentValue;

        Group(ChangeListener<? super T>[] list, T value) {
            this.list = list;
            this.currentValue = value;
        }

        void fire(ObservableValue<T> owner) {
            ChangeListener<? super T>[] round = list;
            T oldValue = currentValue;
            currentValue = owner.getValue();
            if (currentValue == null ? oldValue == null : currentValue.equals(oldValue)) {
                return;
            }
            for (ChangeListener<? super T> listener : round) {
                try {
                    // currentValue is read again for each one: a listener may have changed the value.
                    listener.changed(owner, oldValue, currentValue);
                } catch (Exception e) {
                    Session.uncaught(e);
                }
            }
        }
    }
}
