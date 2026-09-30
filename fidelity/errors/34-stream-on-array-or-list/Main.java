import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        int[] numbers = {3, 1, 2};
        System.out.println(numbers.stream().sum());
        List<Integer> list = new ArrayList<>(List.of(5, 8, 1));
        System.out.println(list.filter(n -> n > 2).count());
        System.out.println(list.sum());
        System.out.println(list.stream().average());
        System.out.println(list.stream().max());
        System.out.println(list.length);
        Map<String, Integer> ages = new HashMap<>();
        System.out.println(ages.stream().count());
        List<Integer> squares = list.stream().map(n -> n * n);
        List<Integer> lengths = List.of("a", "bb").stream().mapToInt(s -> s.length()).collect(Collectors.toList());
        int total = list.stream().mapToInt(n -> n);
        list.stream().forEach(n -> System.out.println(n)).count();
    }
}
