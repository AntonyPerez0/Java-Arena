import java.util.*;
import java.util.function.*;

public class Main {
    interface Op { int apply(int a, int b); }

    static int run(Op op, int a, int b) { return op.apply(a, b); }

    public static void main(String[] args) {
        Op add = (a, b) -> a + b;
        Op mul = (a, b) -> a * b;
        System.out.println(run(add, 3, 4) + " " + run(mul, 3, 4) + " " + run(Math::max, 3, 4));
        Function<Integer, Integer> twice = x -> x * 2;
        Function<Integer, Integer> plus3 = x -> x + 3;
        System.out.println(twice.andThen(plus3).apply(5) + " " + twice.compose(plus3).apply(5));
        Supplier<List<String>> sup = ArrayList::new;
        List<String> list = sup.get();
        list.add("c"); list.add("a"); list.add("b");
        list.sort(Comparator.naturalOrder());
        list.forEach(s -> System.out.print(s + " "));
        System.out.println();
        BiFunction<String, Integer, String> rep = String::repeat;
        System.out.println(rep.apply("ab", 3));
        Predicate<String> empty = String::isEmpty;
        System.out.println(empty.negate().test("x") + " " + empty.or(s -> s.startsWith("a")).test("abc"));
        int base = 10;
        IntUnaryOperator addBase = x -> x + base;
        System.out.println(addBase.applyAsInt(5));
        Runnable r = () -> System.out.println("runnable ran");
        r.run();
        Comparator<String> byLen = Comparator.comparingInt(String::length);
        List<String> words = new ArrayList<>(List.of("pear", "fig", "banana", "kiwi"));
        words.sort(byLen.thenComparing(Comparator.reverseOrder()));
        System.out.println(words);
        Map<String, Integer> counts = new HashMap<>();
        for (String w : "a b a c b a".split(" ")) counts.merge(w, 1, Integer::sum);
        System.out.println(counts);
        new Thread(() -> System.out.println("thread says hi")).run();
        Object anon = new Object() { @Override public String toString() { return "anonymous " + base; } };
        System.out.println(anon);
    }
}
