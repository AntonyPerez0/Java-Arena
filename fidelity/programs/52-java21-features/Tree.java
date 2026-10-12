import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;

// A binary search tree: inserting, finding, traversals in three orders (recursive), the height,
// the smallest and largest values, removing a value with two children, and a level-order walk.
public class Tree {
    private record Node(int value, Node left, Node right) {
        Node with(int v) {
            if (v < value) {
                return new Node(value, left == null ? new Node(v, null, null) : left.with(v), right);
            }
            if (v > value) {
                return new Node(value, left, right == null ? new Node(v, null, null) : right.with(v));
            }
            return this;
        }
    }

    private Node root;

    void add(int value) {
        root = root == null ? new Node(value, null, null) : root.with(value);
    }

    boolean contains(int value) {
        Node n = root;
        while (n != null) {
            if (value == n.value()) {
                return true;
            }
            n = value < n.value() ? n.left() : n.right();
        }
        return false;
    }

    int height() {
        return height(root);
    }

    private static int height(Node n) {
        return n == null ? 0 : 1 + Math.max(height(n.left()), height(n.right()));
    }

    void inOrder(Consumer<Integer> visit) {
        inOrder(root, visit);
    }

    private static void inOrder(Node n, Consumer<Integer> visit) {
        if (n == null) {
            return;
        }
        inOrder(n.left(), visit);
        visit.accept(n.value());
        inOrder(n.right(), visit);
    }

    String preOrder() {
        StringBuilder sb = new StringBuilder();
        preOrder(root, sb);
        return sb.toString().trim();
    }

    private static void preOrder(Node n, StringBuilder sb) {
        if (n != null) {
            sb.append(n.value()).append(' ');
            preOrder(n.left(), sb);
            preOrder(n.right(), sb);
        }
    }

    String postOrder() {
        List<Integer> out = new ArrayList<>();
        postOrder(root, out);
        return out.toString();
    }

    private static void postOrder(Node n, List<Integer> out) {
        if (n != null) {
            postOrder(n.left(), out);
            postOrder(n.right(), out);
            out.add(n.value());
        }
    }

    String levels() {
        List<String> rows = new ArrayList<>();
        List<Node> level = root == null ? List.of() : List.of(root);
        while (!level.isEmpty()) {
            List<Node> next = new ArrayList<>();
            StringBuilder row = new StringBuilder();
            for (Node n : level) {
                row.append(n.value()).append(' ');
                if (n.left() != null) {
                    next.add(n.left());
                }
                if (n.right() != null) {
                    next.add(n.right());
                }
            }
            rows.add(row.toString().trim());
            level = next;
        }
        return String.join(" | ", rows);
    }

    void remove(int value) {
        root = remove(root, value);
    }

    private static Node remove(Node n, int value) {
        if (n == null) {
            return null;
        }
        if (value < n.value()) {
            return new Node(n.value(), remove(n.left(), value), n.right());
        }
        if (value > n.value()) {
            return new Node(n.value(), n.left(), remove(n.right(), value));
        }
        if (n.left() == null) {
            return n.right();
        }
        if (n.right() == null) {
            return n.left();
        }
        int smallest = n.right().value();
        for (Node m = n.right(); m != null; m = m.left()) {
            smallest = m.value();
        }
        return new Node(smallest, n.left(), remove(n.right(), smallest));
    }
}
