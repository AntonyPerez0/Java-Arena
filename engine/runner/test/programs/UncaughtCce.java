import java.util.*;

public class UncaughtCce {
    static class Animal {}

    public static void main(String[] args) {
        Set<Animal> animals = new TreeSet<>();
        animals.add(new Animal());
    }
}
