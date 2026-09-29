import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public class Main {
    public static void main(String[] args) {
        List<String> words = List.of("apple", "avocado", "banana", "blueberry", "cherry", "kiwi",
                "kumquat", "lemon", "lime", "mango", "melon", "nectarine", "orange", "olive");
        Map<Character, List<String>> byLetter = words.stream()
                .collect(Collectors.groupingBy(w -> w.charAt(0)));
        System.out.println(byLetter);
        Map<Integer, Long> byLength = words.stream()
                .collect(Collectors.groupingBy(String::length, Collectors.counting()));
        System.out.println(byLength);
        Map<Boolean, List<String>> longOnes = words.stream()
                .collect(Collectors.partitioningBy(w -> w.length() > 5));
        System.out.println(longOnes);
        Map<String, Integer> lengths = words.stream()
                .collect(Collectors.toMap(w -> w, String::length));
        System.out.println(lengths);
    }
}
