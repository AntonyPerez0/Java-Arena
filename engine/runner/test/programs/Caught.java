import java.util.*;

class Dog {}

class Cat {}

class InsufficientFundsException extends Exception {
    InsufficientFundsException(String message, Throwable cause) {
        super(message, cause);
    }
}

public class Caught {
    interface Action {
        void run() throws Exception;
    }

    static void attempt(String label, Action action) {
        try {
            action.run();
            System.out.println(label + ": no exception");
        } catch (Exception e) {
            System.out.println(label + ": " + e);
            if (e.getCause() != null) System.out.println("  cause: " + e.getCause());
        }
    }

    static String nothing() {
        return null;
    }

    public static void main(String[] args) {
        int[] array = new int[3];
        List<Integer> list = new ArrayList<>(List.of(1, 2));
        attempt("aioobe", () -> array[3] = 1);
        attempt("aioobe negative", () -> System.out.println(array[-1]));
        attempt("ioobe", () -> list.get(5));
        attempt("sioobe", () -> "abc".charAt(10));
        attempt("substring", () -> "abc".substring(2, 1));
        attempt("npe length", () -> nothing().length());
        attempt("npe field", () -> { int[] a = null; a[0] = 1; });
        attempt("npe unboxing", () -> { Integer i = null; int j = i; });
        attempt("nfe", () -> Integer.parseInt("12a"));
        attempt("nfe empty", () -> Integer.parseInt(""));
        attempt("nfe double", () -> Double.parseDouble("abc"));
        attempt("arithmetic", () -> System.out.println(5 / (array.length - 3)));
        attempt("arithmetic mod", () -> System.out.println(5L % (long) (array.length - 3)));
        attempt("input mismatch", () -> new Scanner("abc").nextInt());
        attempt("no such element", () -> new Scanner("").next());
        attempt("cce jdk", () -> { Object o = "s"; Integer i = (Integer) o; });
        attempt("cce user", () -> { Object o = new Dog(); Cat c = (Cat) o; });
        attempt("cce mixed", () -> { Object o = new Dog(); String s = (String) o; });
        attempt("cce mixed 2", () -> { Object o = 5; Dog d = (Dog) o; });
        attempt("cce arrays", () -> { Object o = new String[1]; Integer[] i = (Integer[]) o; });
        attempt("cce primitive array", () -> { Object o = new int[1]; long[] l = (long[]) o; });
        attempt("cce user arrays", () -> { Object o = new Dog[1]; Cat[] c = (Cat[]) o; });
        attempt("cce comparable", () -> new TreeSet<Object>().add(new Dog()));
        attempt("cce class.cast", () -> Integer.class.cast("x"));
        attempt("ase", () -> { Object[] o = new String[1]; o[0] = 1; });
        attempt("ase user", () -> { Object[] o = new Dog[1]; o[0] = new Cat(); });
        attempt("ase array", () -> { Object[] o = new Integer[1]; o[0] = new int[0]; });
        attempt("ase ok", () -> { Object[] o = new CharSequence[1]; o[0] = "fine"; o[0] = new StringBuilder(); });
        attempt("negative size", () -> { int[] a = new int[array.length - 5]; });
        attempt("unsupported", () -> List.of(1).add(2));
        attempt("concurrent", () -> { for (Integer i : list) list.remove(i); });
        attempt("illegal state", () -> new ArrayList<Integer>().iterator().remove());
        attempt("illegal argument", () -> new ArrayList<Integer>(-1));
        attempt("custom", () -> {
            try {
                throw new IllegalStateException("balance too low");
            } catch (IllegalStateException e) {
                throw new InsufficientFundsException("cannot withdraw 100", e);
            }
        });
        attempt("stack overflow", () -> {
            try {
                recurse(0);
            } catch (StackOverflowError e) {
                System.out.println("caught " + e.getClass().getName() + " message " + e.getMessage());
            }
        });
        try {
            throw new Error("plain error");
        } catch (Error e) {
            System.out.println(e + " " + (e.getStackTrace().length > 0) + " " + e.getStackTrace()[0]);
        }
        Exception trace = new RuntimeException("with trace");
        System.out.println(trace.getStackTrace()[0].getMethodName() + " " + trace.getStackTrace()[0].getLineNumber());
    }

    static int recurse(int depth) {
        return recurse(depth + 1) + 1;
    }
}
