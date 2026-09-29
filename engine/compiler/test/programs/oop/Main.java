import java.util.*;

public class Main {
    interface Greeter {
        String name();
        default String greet() { return "Hello from " + name() + suffix(); }
        private String suffix() { return "!"; }
        static Greeter of(String n) { return () -> n; }
    }

    static abstract class Animal implements Comparable<Animal> {
        private static int created = 0;
        protected final String name;
        Animal(String name) { this.name = name; created++; }
        abstract String sound();
        public String toString() { return getClass().getSimpleName() + "(" + name + ") says " + sound(); }
        public int compareTo(Animal o) { return name.compareTo(o.name); }
        static int created() { return created; }
    }

    static class Dog extends Animal {
        Dog(String n) { super(n); }
        String sound() { return "Woof"; }
    }

    static class Puppy extends Dog {
        Puppy(String n) { super(n); }
        @Override String sound() { return super.sound().toLowerCase() + "?"; }
    }

    static class Cat extends Animal {
        Cat(String n) { super(n); }
        String sound() { return "Meow"; }
        @Override public boolean equals(Object o) { return o instanceof Cat c && c.name.equals(name); }
        @Override public int hashCode() { return Objects.hash(name); }
    }

    enum Planet {
        MERCURY(3.303e+23, 2.4397e6), EARTH(5.976e+24, 6.37814e6);
        private final double mass, radius;
        Planet(double mass, double radius) { this.mass = mass; this.radius = radius; }
        double surfaceGravity() { return 6.67300E-11 * mass / (radius * radius); }
    }

    class Inner { int v() { return counter * 2; } }
    int counter = 21;

    static int initOrder = log("static field");
    static { log("static block"); }
    static int log(String s) { System.out.println("init: " + s); return 1; }

    public static void main(String[] args) {
        List<Animal> zoo = new ArrayList<>(List.of(new Dog("Rex"), new Cat("Tom"), new Puppy("Bit")));
        Collections.sort(zoo);
        zoo.forEach(System.out::println);
        System.out.println(Animal.created() + " " + new Cat("Tom").equals(zoo.get(2)) + " " + (zoo.get(0) instanceof Dog));
        System.out.println(Greeter.of("Ada").greet());
        for (Planet p : Planet.values()) System.out.printf("%s %.2f%n", p, p.surfaceGravity());
        Main m = new Main();
        Main.Inner in = m.new Inner();
        System.out.println(in.v());
        Set<Cat> cats = new HashSet<>(List.of(new Cat("a"), new Cat("a"), new Cat("b")));
        System.out.println(cats.size());
    }
}
