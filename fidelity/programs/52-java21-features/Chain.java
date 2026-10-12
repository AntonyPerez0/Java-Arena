import java.util.NoSuchElementException;

// A linked list of its own: nodes, adding at both ends, removing, reversing in place, recursion
// over the nodes, and a stack and a queue built on it.
public class Chain<T> {
    private static class Node<T> {
        T value;
        Node<T> next;

        Node(T value, Node<T> next) {
            this.value = value;
            this.next = next;
        }
    }

    private Node<T> head;
    private Node<T> tail;
    private int size;

    void addFirst(T value) {
        head = new Node<>(value, head);
        if (tail == null) {
            tail = head;
        }
        size++;
    }

    void addLast(T value) {
        Node<T> node = new Node<>(value, null);
        if (tail == null) {
            head = node;
        } else {
            tail.next = node;
        }
        tail = node;
        size++;
    }

    T removeFirst() {
        if (head == null) {
            throw new NoSuchElementException("the chain is empty");
        }
        T value = head.value;
        head = head.next;
        if (head == null) {
            tail = null;
        }
        size--;
        return value;
    }

    boolean remove(T value) {
        Node<T> before = null;
        for (Node<T> n = head; n != null; before = n, n = n.next) {
            if (n.value.equals(value)) {
                if (before == null) {
                    head = n.next;
                } else {
                    before.next = n.next;
                }
                if (n == tail) {
                    tail = before;
                }
                size--;
                return true;
            }
        }
        return false;
    }

    void reverse() {
        Node<T> previous = null;
        Node<T> current = head;
        tail = head;
        while (current != null) {
            Node<T> next = current.next;
            current.next = previous;
            previous = current;
            current = next;
        }
        head = previous;
    }

    int size() {
        return size;
    }

    T peekFirst() {
        return head == null ? null : head.value;
    }

    String backwards() {
        return backwards(head);
    }

    private String backwards(Node<T> node) {
        if (node == null) {
            return "";
        }
        String rest = backwards(node.next);
        return rest.isEmpty() ? String.valueOf(node.value) : rest + " " + node.value;
    }

    int countRecursively() {
        return count(head);
    }

    private int count(Node<T> node) {
        return node == null ? 0 : 1 + count(node.next);
    }

    // The next of the last node is null: asking for one past it fails with a NullPointerException.
    T valueAfterLast() {
        Node<T> n = head;
        for (int i = 0; i < size; i++) {
            n = n.next;
        }
        return n.value;
    }

    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder("[");
        for (Node<T> n = head; n != null; n = n.next) {
            sb.append(n.value);
            if (n.next != null) {
                sb.append(" -> ");
            }
        }
        return sb.append("]").toString();
    }
}
