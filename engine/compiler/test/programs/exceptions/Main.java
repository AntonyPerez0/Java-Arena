import java.io.*;
import java.util.*;

public class Main {
    static class InsufficientFundsException extends Exception {
        InsufficientFundsException(String msg) { super(msg); }
    }

    static class Resource implements AutoCloseable {
        private final String name;
        Resource(String name) { this.name = name; System.out.println("open " + name); }
        @Override public void close() { System.out.println("close " + name); }
    }

    static void withdraw(int balance, int amount) throws InsufficientFundsException {
        if (amount > balance) throw new InsufficientFundsException("need " + (amount - balance) + " more");
        System.out.println("ok " + (balance - amount));
    }

    static int depth(int n) { return n == 0 ? 0 : 1 + depth(n - 1); }

    static int parse(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            System.out.println("bad number: " + e.getMessage());
            return -1;
        } finally {
            System.out.println("parsed " + s);
        }
    }

    public static void main(String[] args) throws Exception {
        try { withdraw(10, 5); withdraw(10, 50); } catch (InsufficientFundsException e) { System.out.println("caught: " + e.getMessage() + " / " + e); }
        try (Resource a = new Resource("a"); Resource b = new Resource("b")) { System.out.println("body"); }
        parse("42"); parse("4x2");
        int[] arr = new int[3];
        try { arr[3] = 1; } catch (ArrayIndexOutOfBoundsException e) { System.out.println(e.getMessage()); }
        try { Object o = "s"; Integer i = (Integer) o; } catch (ClassCastException e) { System.out.println("CCE"); }
        try { String s = null; s.length(); } catch (NullPointerException e) { System.out.println(e.getMessage()); }
        try { List.of(1).add(2); } catch (UnsupportedOperationException | IllegalStateException e) { System.out.println("multi " + e.getClass().getName()); }
        try { new ArrayList<Integer>().iterator().next(); } catch (NoSuchElementException e) { System.out.println("NSEE"); }
        System.out.println(depth(1000));
        try { throw new IOException("disk"); } catch (IOException e) { System.out.println(e); }
        int zero = args.length;
        System.out.println("about to divide");
        System.out.println(10 / zero);
    }
}
