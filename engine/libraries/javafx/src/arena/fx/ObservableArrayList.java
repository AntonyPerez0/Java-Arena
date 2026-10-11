// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package arena.fx;

import java.util.AbstractList;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.RandomAccess;
import javafx.collections.ObservableList;

/**
 * The list FXCollections.observableArrayList() makes, with JavaFX's index checks and messages. The
 * library's own users of a list (a chart's series, a series' data, a category axis's categories)
 * hear of each change through a Hook; as with JavaFX's list listeners, an exception a hook throws
 * goes to the thread's uncaught exception handler, and the change stays made.
 */
public final class ObservableArrayList<E> extends AbstractList<E> implements ObservableList<E>, RandomAccess {
    /** Told about a change after it is made: the elements added and those removed, in order. */
    public interface Hook<E> {
        void changed(ObservableArrayList<E> list, List<E> added, List<E> removed);
    }

    private final ArrayList<E> list = new ArrayList<E>();
    private final List<Hook<E>> hooks = new ArrayList<Hook<E>>();

    public ObservableArrayList() {
    }

    public ObservableArrayList(Collection<? extends E> items) {
        list.addAll(items);
    }

    /** How many changes the list has had (each add, set or remove counts). */
    public int changes() {
        return modCount;
    }

    public synchronized void addHook(Hook<E> hook) {
        hooks.add(hook);
    }

    public synchronized void removeHook(Hook<E> hook) {
        hooks.remove(hook);
    }

    private void changed(List<E> added, List<E> removed) {
        modCount++;
        List<Hook<E>> now;
        synchronized (this) {
            now = new ArrayList<Hook<E>>(hooks);
        }
        for (Hook<E> hook : now) {
            try {
                hook.changed(this, added, removed);
            } catch (RuntimeException e) {
                Session.uncaught(e);
            }
        }
    }

    /** Removes an element without telling the hooks (a hook undoing a change JavaFX refuses). */
    public void removeQuietly(int index) {
        list.remove(index);
        modCount++;
    }

    /** Replaces the elements without telling the hooks (a chart filling its axis's categories, as JavaFX's layout does). */
    public void setAllQuietly(Collection<? extends E> col) {
        list.clear();
        list.addAll(col);
        modCount++;
    }

    @Override
    public E get(int index) {
        Objects.checkIndex(index, list.size());
        return list.get(index);
    }

    @Override
    public int size() {
        return list.size();
    }

    @Override
    public E set(int index, E element) {
        Objects.checkIndex(index, list.size());
        E old = list.set(index, element);
        changed(Collections.singletonList(element), Collections.singletonList(old));
        return old;
    }

    @Override
    public void add(int index, E element) {
        Objects.checkIndex(index, list.size() + 1);
        list.add(index, element);
        changed(Collections.singletonList(element), Collections.<E>emptyList());
    }

    @Override
    public E remove(int index) {
        Objects.checkIndex(index, list.size());
        E old = list.remove(index);
        changed(Collections.<E>emptyList(), Collections.singletonList(old));
        return old;
    }

    @Override
    public boolean addAll(Collection<? extends E> c) {
        return addAll(list.size(), c);
    }

    @Override
    public boolean addAll(int index, Collection<? extends E> c) {
        if (index < 0 || index > list.size()) {
            throw new IndexOutOfBoundsException("Index: " + index);
        }
        List<E> added = new ArrayList<E>(c);
        if (added.isEmpty()) {
            return false;
        }
        list.addAll(index, added);
        changed(added, Collections.<E>emptyList());
        return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public boolean addAll(E... elements) {
        return addAll(Arrays.asList(elements));
    }

    @Override
    @SuppressWarnings("unchecked")
    public boolean setAll(E... elements) {
        return setAll(Arrays.asList(elements));
    }

    @Override
    public boolean setAll(Collection<? extends E> col) {
        List<E> removed = new ArrayList<E>(list);
        List<E> added = new ArrayList<E>(col);
        list.clear();
        list.addAll(added);
        changed(added, removed);
        return true;
    }

    @Override
    @SuppressWarnings("unchecked")
    public boolean removeAll(E... elements) {
        return removeAll(Arrays.asList(elements));
    }

    @Override
    public boolean removeAll(Collection<?> c) {
        return removeWhere(c, true);
    }

    @Override
    public boolean retainAll(Collection<?> c) {
        return removeWhere(c, false);
    }

    private boolean removeWhere(Collection<?> c, boolean inside) {
        Objects.requireNonNull(c);
        List<E> removed = new ArrayList<E>();
        for (int i = list.size() - 1; i >= 0; i--) {
            if (c.contains(list.get(i)) == inside) {
                removed.add(0, list.remove(i));
            }
        }
        if (removed.isEmpty()) {
            return false;
        }
        changed(Collections.<E>emptyList(), removed);
        return true;
    }

    @Override
    public void clear() {
        if (!list.isEmpty()) {
            List<E> removed = new ArrayList<E>(list);
            list.clear();
            changed(Collections.<E>emptyList(), removed);
        }
    }

    @Override
    public void remove(int from, int to) {
        Objects.checkFromToIndex(from, to, list.size());
        removeRange(from, to);
    }

    @Override
    protected void removeRange(int from, int to) {
        if (from < to) {
            List<E> removed = new ArrayList<E>(list.subList(from, to));
            list.subList(from, to).clear();
            changed(Collections.<E>emptyList(), removed);
        }
    }
}
