import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class Main {
    public static void main(String[] args) {
        List<Integer> numbers = new ArrayList<>(List.of(3, 8, 1, 9, 4, 8, 12, 7, 3));
        System.out.println(numbers.stream().filter(n -> n % 2 == 0).map(n -> n * n).collect(Collectors.toList()));
        System.out.println(numbers.stream().mapToInt(Integer::intValue).sum());
        System.out.println(numbers.stream().mapToInt(n -> n).average());
        System.out.println(numbers.stream().mapToInt(n -> n).average().getAsDouble());
        System.out.println(numbers.stream().distinct().sorted().map(String::valueOf).collect(Collectors.joining(", ", "{", "}")));
        System.out.println(numbers.stream().reduce(0, Integer::sum) + " " + numbers.stream().count());
        System.out.println(numbers.stream().collect(Collectors.averagingInt(n -> n)));
        System.out.println(numbers.stream().collect(Collectors.partitioningBy(n -> n > 5)));
        System.out.println(numbers.stream().max(Integer::compare).get() + " " + numbers.stream().min(Integer::compare));
        System.out.println(IntStream.range(0, 5).mapToObj(i -> "i" + i).toList());
        System.out.println(IntStream.rangeClosed(1, 5).map(i -> i * i).sum());
        System.out.println(numbers.stream().limit(3).skip(1).toList() + " " + numbers.stream().anyMatch(n -> n > 10)
                + " " + numbers.stream().allMatch(n -> n > 0) + " " + numbers.stream().noneMatch(n -> n == 5));
        List<String> words = List.of("stream", "lambda", "java", "arena", "map");
        System.out.println(words.stream().sorted().toList());
        System.out.println(words.stream().map(String::length).collect(Collectors.toList()));
        System.out.println(words.stream().filter(w -> w.contains("a")).collect(Collectors.joining("+")));
        System.out.println(words.stream().mapToInt(String::length).summaryStatistics());
        System.out.println(words.stream().collect(Collectors.averagingDouble(w -> w.length() / 2.0)));
    }
}
