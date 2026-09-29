import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Scanner;

public class Main {
    interface Action {
        void run() throws Exception;
    }

    static void attempt(String label, Action action) {
        try {
            action.run();
            System.out.println(label + ": no exception");
        } catch (Exception e) {
            System.out.println(label + ": " + e);
        } catch (Error e) {
            System.out.println(label + ": error " + e);
        }
    }

    public static void main(String[] args) {
        List<Integer> list = new ArrayList<>(List.of(1, 2, 3));
        int[] array = new int[3];
        attempt("parseInt", () -> Integer.parseInt("abc"));
        attempt("valueOf", () -> Integer.valueOf(" 5"));
        attempt("parseDouble", () -> Double.parseDouble("1,5"));
        attempt("list.get", () -> list.get(5));
        attempt("array index", () -> System.out.println(array[5]));
        attempt("negative index", () -> System.out.println(array[-1]));
        attempt("divide", () -> System.out.println(10 / (list.size() - 3)));
        attempt("modulo", () -> System.out.println(10 % (list.size() - 3)));
        attempt("substring", () -> "abc".substring(5));
        attempt("charAt", () -> "abc".charAt(3));
        attempt("cast", () -> {
            Object o = "text";
            Integer i = (Integer) o;
        });
        attempt("iterator", () -> {
            Iterator<String> it = new ArrayList<String>().iterator();
            it.next();
        });
        attempt("null length", () -> {
            String s = null;
            System.out.println(s.length());
        });
        attempt("null field", () -> {
            int[] data = null;
            System.out.println(data.length);
        });
        attempt("array store", () -> {
            Object[] objects = new String[1];
            objects[0] = Integer.valueOf(1);
        });
        attempt("negative size", () -> System.out.println(new int[list.size() - 5].length));
        attempt("scanner int", () -> new Scanner("abc").nextInt());
        attempt("scanner empty", () -> new Scanner("").nextLine());
        attempt("unmodifiable", () -> List.of(1).add(2));
        attempt("remove during loop", () -> {
            for (Integer n : list) {
                if (n == 2) {
                    list.remove(n);
                }
            }
        });
        attempt("illegal argument", () -> {
            throw new IllegalArgumentException("Grade must be between 0 and 5");
        });
        attempt("checked", () -> {
            throw new Exception("plain checked exception");
        });
        attempt("valueOf enum", () -> Thread.State.valueOf("SLEEPING"));
    }
}
