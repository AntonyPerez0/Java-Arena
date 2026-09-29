import java.util.*;

public class Main {
    static class Box<T extends Comparable<T>> {
        private T value;
        Box(T value) { this.value = value; }
        T get() { return value; }
        boolean isBigger(Box<T> other) { return value.compareTo(other.value) > 0; }
    }

    static <T> void swap(T[] arr, int i, int j) { T t = arr[i]; arr[i] = arr[j]; arr[j] = t; }

    static double sum(List<? extends Number> nums) {
        double s = 0;
        for (Number n : nums) s += n.doubleValue();
        return s;
    }

    static <K, V extends Comparable<V>> K maxKey(Map<K, V> map) {
        K best = null; V bestV = null;
        for (Map.Entry<K, V> e : map.entrySet()) {
            if (bestV == null || e.getValue().compareTo(bestV) > 0) { best = e.getKey(); bestV = e.getValue(); }
        }
        return best;
    }

    @SafeVarargs
    static <T> List<T> listOf(T... items) { return new ArrayList<>(Arrays.asList(items)); }

    public static void main(String[] args) {
        Box<Integer> a = new Box<>(5), b = new Box<>(7);
        System.out.println(a.isBigger(b) + " " + b.isBigger(a) + " " + a.get());
        String[] s = {"x", "y", "z"};
        swap(s, 0, 2);
        System.out.println(Arrays.toString(s));
        System.out.println(sum(List.of(1, 2.5, 3L)));
        Map<String, Integer> scores = new TreeMap<>(Map.of("anna", 3, "bert", 9, "cara", 5));
        System.out.println(maxKey(scores) + " " + scores);
        List<Integer> li = listOf(3, 1, 2);
        Collections.sort(li);
        System.out.println(li + " " + Collections.max(li) + " " + Collections.frequency(li, 2));
        Deque<String> stack = new ArrayDeque<>();
        stack.push("a"); stack.push("b");
        System.out.println(stack.pop() + stack.peek());
        PriorityQueue<Integer> pq = new PriorityQueue<>(Comparator.reverseOrder());
        pq.addAll(List.of(4, 9, 1));
        System.out.println(pq.poll() + " " + pq.poll());
        List raw = new ArrayList();
        raw.add("raw");
        System.out.println(raw);
    }
}
