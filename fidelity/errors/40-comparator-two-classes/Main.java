import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Person> people = new ArrayList<>();
        people.add(new Person("Ada", new Pet("Rex")));
        people.sort(Comparator.comparing(p -> p.getName()).reversed());
        people.stream().map(p -> p.getPet()).sorted(Comparator.comparing(a -> a.getName()).reversed()).forEach(System.out::println);
    }
}

class Pet {
    private String name;

    public Pet(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }
}

class Person {
    private String name;
    private Pet pet;

    public Person(String name, Pet pet) {
        this.name = name;
        this.pet = pet;
    }

    public String getName() {
        return name;
    }

    public Pet getPet() {
        return pet;
    }
}
