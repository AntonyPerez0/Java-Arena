public class UncaughtNpe {
    static class Node {
        Node next;
        String name;
    }

    public static void main(String[] args) {
        Node node = new Node();
        System.out.println(node.next.name.length());
    }
}
