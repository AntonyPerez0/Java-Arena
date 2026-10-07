// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.scene;

import arena.fx.Removals;
import arena.fx.Session;
import java.util.AbstractList;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Objects;
import javafx.collections.ObservableList;

/** A node that holds other nodes: its children. */
public abstract class Parent extends Node {
    private final Children children = new Children();
    private final ReadOnly unmodifiable = new ReadOnly();

    protected Parent() {
    }

    /** The children of this node. Panes make this public. */
    protected ObservableList<Node> getChildren() {
        return children;
    }

    /** The children of this node, in a list that can't be changed. */
    public ObservableList<Node> getChildrenUnmodifiable() {
        return unmodifiable;
    }

    /** This node, or the first node in it (depth first) whose id matches "#id". */
    @Override
    public Node lookup(String selector) {
        Node found = super.lookup(selector);
        if (found != null) {
            return found;
        }
        for (Node child : children.list) {
            found = child.lookup(selector);
            if (found != null) {
                return found;
            }
        }
        return null;
    }

    /**
     * The children list, with JavaFX's rules: no null, no node twice, no node inside itself, and a
     * node added here leaves the parent it had. A change to a pane in a showing window must be made
     * on the JavaFX Application Thread.
     */
    private final class Children extends AbstractList<Node> implements ObservableList<Node> {
        final ArrayList<Node> list = new ArrayList<Node>();

        private String problem(String what, Node node) {
            return "Children: " + what + ": parent = " + Parent.this + (node == null ? "" : ", node = " + node);
        }

        private int indexOf(Node node) {
            for (int i = 0; i < list.size(); i++) {
                if (list.get(i) == node) {
                    return i;
                }
            }
            return -1;
        }

        /** Checks that nodes may replace the children from index from (included) to index to (not included). */
        private void check(int from, int to, Node[] nodes) {
            Session.checkSceneThread(Parent.this);
            for (int i = 0; i < nodes.length; i++) {
                Node node = nodes[i];
                if (node == null) {
                    throw new NullPointerException(problem("child node is null", null));
                }
                for (Node p = Parent.this; p != null; p = p.parent) {
                    if (p == node) {
                        throw new IllegalArgumentException(problem("cycle detected", node));
                    }
                }
                for (int j = 0; j < i; j++) {
                    if (nodes[j] == node) {
                        throw new IllegalArgumentException(problem("duplicate children added", null));
                    }
                }
                if (node.parent == Parent.this) {
                    int at = indexOf(node);
                    if (at < from || at >= to) {
                        throw new IllegalArgumentException(problem("duplicate children added", null));
                    }
                }
            }
        }

        /** Replaces the children from index from to index to with nodes (already checked). */
        private void replace(int from, int to, Node[] nodes) {
            for (int k = to - 1; k >= from; k--) {
                Node old = list.remove(k);
                boolean stays = false;
                for (Node n : nodes) {
                    stays |= n == old;
                }
                if (!stays) {
                    detach(old);
                }
            }
            for (int i = 0; i < nodes.length; i++) {
                Node node = nodes[i];
                Parent before = node.parent;
                if (before != null && before != Parent.this) {
                    before.children.removeNode(node);
                }
                list.add(from + i, node);
                node.parent = Parent.this;
            }
            modCount++;
        }

        private void detach(Node old) {
            if (old.parent == Parent.this) {
                old.parent = null;
            }
            Removals.removed(Parent.this, old);
        }

        void removeNode(Node node) {
            int at = indexOf(node);
            if (at >= 0) {
                remove(at);
            }
        }

        private Node[] array(Collection<? extends Node> nodes) {
            return nodes.toArray(new Node[0]);
        }

        @Override
        public Node get(int index) {
            return list.get(index);
        }

        @Override
        public int size() {
            return list.size();
        }

        @Override
        public void add(int index, Node node) {
            // As in JavaFX: the index is checked first (it may be the size, to add at the end).
            Objects.checkIndex(index, list.size() + 1);
            Node[] nodes = { node };
            check(index, index, nodes);
            replace(index, index, nodes);
        }

        @Override
        public Node set(int index, Node node) {
            Node old = list.get(index);
            if (old == node) {
                return old;
            }
            Node[] nodes = { node };
            check(index, index + 1, nodes);
            replace(index, index + 1, nodes);
            return old;
        }

        @Override
        public Node remove(int index) {
            Session.checkSceneThread(Parent.this);
            Node old = list.remove(index);
            modCount++;
            detach(old);
            return old;
        }

        @Override
        protected void removeRange(int from, int to) {
            Session.checkSceneThread(Parent.this);
            for (int k = to - 1; k >= from; k--) {
                remove(k);
            }
        }

        @Override
        public boolean addAll(Collection<? extends Node> nodes) {
            return addAll(list.size(), nodes);
        }

        @Override
        public boolean addAll(int index, Collection<? extends Node> nodes) {
            Objects.checkIndex(index, list.size() + 1);
            Node[] added = array(nodes);
            check(index, index, added);
            replace(index, index, added);
            return added.length > 0;
        }

        @Override
        public boolean addAll(Node... nodes) {
            return addAll(Arrays.asList(nodes));
        }

        @Override
        public boolean setAll(Node... nodes) {
            return setAll(Arrays.asList(nodes));
        }

        @Override
        public boolean setAll(Collection<? extends Node> nodes) {
            Node[] all = array(nodes);
            check(0, list.size(), all);
            replace(0, list.size(), all);
            return true;
        }

        @Override
        public boolean removeAll(Node... nodes) {
            return removeAll(Arrays.asList(nodes));
        }

        @Override
        public void remove(int from, int to) {
            Objects.checkFromToIndex(from, to, list.size());
            removeRange(from, to);
        }
    }

    /**
     * getChildrenUnmodifiable(): the same children, in a list that can't be changed. As in JavaFX,
     * a List method that would change it throws (one that changes nothing, such as clear() on an
     * empty list, doesn't), and the ObservableList methods always throw.
     */
    private final class ReadOnly extends AbstractList<Node> implements ObservableList<Node> {
        @Override
        public Node get(int index) {
            return children.list.get(index);
        }

        @Override
        public int size() {
            return children.list.size();
        }

        @Override
        public boolean addAll(Node... nodes) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean setAll(Node... nodes) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean setAll(Collection<? extends Node> nodes) {
            throw new UnsupportedOperationException();
        }

        @Override
        public boolean removeAll(Node... nodes) {
            throw new UnsupportedOperationException();
        }

        @Override
        public void remove(int from, int to) {
            throw new UnsupportedOperationException();
        }
    }
}
