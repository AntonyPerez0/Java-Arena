import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;

public class Main {
    public static void main(String[] args) {
        List<Dog> dogs = new ArrayList<>();
        Collections.sort(dogs);
        List<Person> people = new ArrayList<>();
        people.sort();
    }
}

class Person implements Comparable {
    private String name;

    public int compareTo(Person other) {
        return this.name.compareTo(other.name);
    }
}

class Book implements Comparable {
    private int pages;

    @Override
    public int compareTo(Book other) {
        return this.pages - other.pages;
    }
}

class ByName implements Comparator {
    public int compare(Person a, Person b) {
        return 0;
    }
}

class Car implements Comparable<Car> {
    public int compareTo(Object other) {
        return 0;
    }
}

class Dog {
    public String getName() {
        return "Rex";
    }
}
