import java.util.*;
import java.util.stream.*;

public class Streams {
    record Person(String name, String city, int age) {}

    public static void main(String[] args) {
        List<Person> people = List.of(
            new Person("Aino", "Helsinki", 31), new Person("Eero", "Tampere", 45), new Person("Liisa", "Helsinki", 27),
            new Person("Olli", "Turku", 38), new Person("Sanna", "Tampere", 29), new Person("Ville", "Oulu", 52),
            new Person("Äijä", "Helsinki", 64));
        Map<String, List<String>> byCity = people.stream()
            .collect(Collectors.groupingBy(Person::city, Collectors.mapping(Person::name, Collectors.toList())));
        System.out.println(byCity);
        System.out.println(people.stream().collect(Collectors.groupingBy(Person::city, Collectors.averagingInt(Person::age))));
        TreeMap<String, Long> counts = people.stream().collect(Collectors.groupingBy(Person::city, TreeMap::new, Collectors.counting()));
        System.out.println(counts);
        System.out.println(people.stream().collect(Collectors.partitioningBy(p -> p.age() >= 40)));
        System.out.println(people.stream().map(Person::name).sorted(Comparator.reverseOrder()).collect(Collectors.joining(", ", "[", "]")));
        System.out.println(people.stream().mapToInt(Person::age).summaryStatistics());
        System.out.println(people.stream().mapToInt(Person::age).average().getAsDouble());
        System.out.println(IntStream.rangeClosed(1, 10).filter(i -> i % 2 == 0).map(i -> i * i).boxed().collect(Collectors.toList()));
        System.out.println(Stream.of("b", "a", "c", "a").distinct().sorted().toList());
        System.out.println(people.stream().max(Comparator.comparingInt(Person::age)).map(Person::name).orElse("none"));
        System.out.println(people.get(0));
        System.out.println(Arrays.stream(new int[] {5, 3, 8}).sum() + " " + Stream.iterate(1, x -> x * 3).limit(6).toList());
        System.out.println(people.stream().collect(Collectors.toMap(Person::name, Person::age)));
        Optional<String> none = Optional.empty();
        System.out.println(none + " " + Optional.of(5) + " " + none.orElseGet(() -> "fallback"));
    }
}
