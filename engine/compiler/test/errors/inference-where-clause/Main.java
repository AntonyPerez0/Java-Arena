import java.util.*;

public class Main {
    static <T extends Comparable<T>> T max(List<T> list) {
        return Collections.max(list);
    }

    public static void main(String[] args) {
        List<Object> objects = new ArrayList<>();
        Object m = max(objects);
        List<String> strings = List.of(1, 2);
        Map<String, Integer> map = new HashMap<>();
        map.put(1, "one");
    }
}
