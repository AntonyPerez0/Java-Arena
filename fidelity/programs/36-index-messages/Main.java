import java.util.ArrayList;
import java.util.List;

public class Main {
    interface Action {
        void run();
    }

    static void attempt(String label, Action action) {
        try {
            action.run();
            System.out.println(label + ": no exception");
        } catch (RuntimeException e) {
            System.out.println(label + ": " + e.getClass().getName() + ": " + e.getMessage());
        }
    }

    public static void main(String[] args) {
        ArrayList<String> list = new ArrayList<>(List.of("a", "b", "c"));
        int[] numbers = {4, 8, 15, 16, 23};
        String word = "hello";
        String nothing = null;
        ArrayList<Integer> none = null;
        attempt("list get 3", () -> list.get(3));
        attempt("list get -1", () -> list.get(-1));
        attempt("empty list get 0", () -> new ArrayList<Integer>().get(0));
        attempt("list remove 5", () -> list.remove(5));
        attempt("list set 9", () -> list.set(9, "x"));
        attempt("list add at 5", () -> list.add(5, "x"));
        attempt("array 5", () -> System.out.println(numbers[5]));
        attempt("array -1", () -> System.out.println(numbers[-1]));
        attempt("array store", () -> numbers[numbers.length] = 1);
        attempt("new array -1", () -> System.out.println(new int[-1].length));
        attempt("charAt 5", () -> word.charAt(5));
        attempt("charAt -1", () -> word.charAt(-1));
        attempt("substring 2 9", () -> word.substring(2, 9));
        attempt("substring 4 2", () -> word.substring(4, 2));
        attempt("substring 6", () -> word.substring(6));
        attempt("valueOf abc", () -> Integer.valueOf("abc"));
        attempt("valueOf empty", () -> Integer.valueOf(""));
        attempt("valueOf space", () -> Integer.valueOf(" 5"));
        attempt("parseInt 5.0", () -> Integer.parseInt("5.0"));
        attempt("parseInt big", () -> Integer.parseInt("3000000000"));
        attempt("Double x", () -> Double.valueOf("x"));
        attempt("null length", () -> System.out.println(nothing.length()));
        attempt("null equals", () -> System.out.println(nothing.equals("a")));
        attempt("null list size", () -> System.out.println(none.size()));
        attempt("null list add", () -> none.add(1));
        attempt("unboxing null", () -> {
            Integer boxed = null;
            int n = boxed;
            System.out.println(n);
        });
        attempt("for-each remove", () -> {
            ArrayList<Integer> values = new ArrayList<>(List.of(1, 2, 3, 4));
            for (int v : values) {
                if (v == 2) {
                    values.remove(Integer.valueOf(v));
                }
            }
        });
        attempt("List.of add", () -> List.of(1, 2).add(3));
        attempt("divide by zero", () -> System.out.println(10 / (numbers.length - 5)));
        attempt("split then index", () -> System.out.println("a,b".split(",")[2]));
    }
}
