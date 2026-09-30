import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Person> people = new ArrayList<>();
        people.sort(Comparator.comparing(p -> p.getAge()).reversed());
        people.sort(Comparator.comparing(p -> p.getName()).thenComparing(p -> p.getAge()));
        people.stream().map(Person::getNmae).forEach(System.out::println);
        System.out.println(people.stream().map(Person::getName).collect(Collectors.joining(", ")));
    }
}

class Person {
    private String name;
    private int age;

    public String getName() {
        return name;
    }

    public int getAge() {
        return age;
    }
}
