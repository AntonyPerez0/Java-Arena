import java.util.*;
import java.util.stream.*;

public class Main {
    record Person(String name, String city, int age) {}

    public static void main(String[] args) {
        List<Person> people = List.of(
                new Person("Aino", "Helsinki", 34), new Person("Matti", "Turku", 28),
                new Person("Liisa", "Helsinki", 45), new Person("Pekka", "Oulu", 19),
                new Person("Sanna", "Turku", 52), new Person("Jussi", "Helsinki", 23));
        System.out.println(people.stream().filter(p -> p.age() > 25).map(Person::name).collect(Collectors.toList()));
        System.out.println(people.stream().mapToInt(Person::age).average().getAsDouble());
        TreeMap<String, Long> perCity = people.stream().collect(Collectors.groupingBy(Person::city, TreeMap::new, Collectors.counting()));
        System.out.println(perCity);
        System.out.println(people.stream().collect(Collectors.groupingBy(Person::city)).keySet());
        System.out.println(people.stream().collect(Collectors.partitioningBy(p -> p.age() >= 30, Collectors.mapping(Person::name, Collectors.joining(", ")))));
        System.out.println(IntStream.rangeClosed(1, 10).filter(i -> i % 2 == 1).boxed().collect(Collectors.toList()));
        System.out.println(Stream.iterate(1, x -> x * 3).limit(8).map(String::valueOf).collect(Collectors.joining("-", "[", "]")));
        System.out.println(people.stream().sorted(Comparator.comparing(Person::city).thenComparing(Person::age, Comparator.reverseOrder())).map(Person::name).toList());
        System.out.println(Arrays.stream(new int[] {5, 3, 9, 1}).max().getAsInt() + " " + IntStream.of(3, 1, 2).sum());
        Optional<Person> oldest = people.stream().max(Comparator.comparingInt(Person::age));
        System.out.println(oldest.map(Person::name).orElse("none") + " " + Optional.empty());
        System.out.println(Stream.of("b", "a", "c", "a").distinct().sorted().reduce("", String::concat));
        Map<Boolean, Long> m = IntStream.range(0, 100).boxed().collect(Collectors.partitioningBy(i -> i % 3 == 0, Collectors.counting()));
        System.out.println(m);
        System.out.println(people.stream().collect(Collectors.toMap(Person::name, Person::age)));
    }
}
