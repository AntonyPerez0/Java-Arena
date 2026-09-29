import java.util.*;

public class NpeMessages {
    static class Node {
        Node next;
        String name;
        int value;
        int[] data;

        String getName() {
            return name;
        }
    }

    interface Step {
        void run() throws Exception;
    }

    static Node head;
    static String text;
    Node field;

    static void check(String label, Step step) {
        try {
            step.run();
            System.out.println(label + ": no exception");
        } catch (NullPointerException e) {
            System.out.println(label + ": " + e.getMessage());
        } catch (Exception e) {
            System.out.println(label + ": other " + e);
        }
    }

    static Node make() {
        return null;
    }

    static List<String> list() {
        return null;
    }

    void instance() {
        check("this field invoke", () -> field.getName());
        check("this field field", () -> System.out.println(field.next.name));
        check("this field assign", () -> field.value = 3);
    }

    public static void main(String[] args) {
        Node node = new Node();
        Node nothing = null;
        String s = null;
        Integer boxed = null;
        int[] numbers = null;
        String[] strings = new String[2];
        List<Integer> items = null;
        Map<String, Integer> map = new HashMap<>();
        check("local invoke", () -> nothing.getName());
        check("string length", () -> s.length());
        check("static field invoke", () -> head.getName());
        check("static string", () -> text.trim());
        check("field chain", () -> node.next.getName());
        check("field chain 2", () -> System.out.println(node.next.next.name));
        check("field read", () -> System.out.println(nothing.value));
        check("field assign", () -> nothing.value = 5);
        check("field array", () -> System.out.println(node.data[0]));
        check("method return", () -> make().getName());
        check("method return list", () -> list().size());
        check("list add", () -> items.add(1));
        check("unboxing", () -> { int x = boxed; });
        check("unboxing arithmetic", () -> System.out.println(boxed + 1));
        check("map get unboxing", () -> { int x = map.get("missing"); });
        check("array load", () -> System.out.println(numbers[0]));
        check("array store", () -> numbers[1] = 2);
        check("array length", () -> System.out.println(numbers.length));
        check("array element invoke", () -> strings[1].length());
        check("array element equals", () -> strings[0].equals("x"));
        check("object array store", () -> { String[] a = null; a[0] = "x"; });
        check("long array", () -> { long[] a = null; a[0] = 1L; });
        check("double array load", () -> { double[] a = null; System.out.println(a[0]); });
        check("char array", () -> { char[] a = null; System.out.println(a[0]); });
        check("boolean array", () -> { boolean[] a = null; a[0] = true; });
        check("throw null", () -> { RuntimeException e = null; throw e; });
        check("synchronized", () -> { synchronized (nothing) { System.out.println("in"); } });
        check("string switch", () -> { switch (s) { case "a" -> System.out.println("a"); default -> System.out.println("d"); } });
        check("for each", () -> { for (int i : items) System.out.println(i); });
        check("compare", () -> s.compareTo("x"));
        check("equals arg ok", () -> System.out.println("x".equals(s)));
        check("objects", () -> Objects.requireNonNull(s));
        check("objects message", () -> Objects.requireNonNull(s, "s must not be null"));
        check("method with args", () -> nothing.name.substring(1, 2));
        check("string concat", () -> System.out.println(s.concat("x")));
        check("nested call arg", () -> Math.max(boxed, 3));
        check("list get invoke", () -> Arrays.asList("a", null).get(1).length());
        check("ternary", () -> (args.length > 5 ? "x" : s).length());
        new NpeMessages().instance();
    }
}
