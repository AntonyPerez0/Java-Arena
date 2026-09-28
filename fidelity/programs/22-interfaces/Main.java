import java.util.ArrayList;
import java.util.List;

public class Main {
    interface Shape {
        double area();

        default String describe() {
            return getClass().getSimpleName() + " with area " + String.format("%.2f", area());
        }
    }

    static abstract class Animal {
        protected final String name;

        Animal(String name) {
            this.name = name;
        }

        abstract String sound();

        @Override
        public String toString() {
            return name + " says " + sound();
        }
    }

    static class Dog extends Animal {
        Dog(String name) { super(name); }
        String sound() { return "woof"; }
    }

    static class Cat extends Animal {
        Cat(String name) { super(name); }
        String sound() { return "meow"; }
        @Override
        public String toString() { return "The cat " + super.toString(); }
    }

    record Circle(double r) implements Shape {
        public double area() { return Math.PI * r * r; }
    }

    record Rectangle(double w, double h) implements Shape {
        public double area() { return w * h; }
        public String describe() { return "Rectangle " + w + "x" + h; }
    }

    public static void main(String[] args) {
        List<Animal> animals = new ArrayList<>(List.of(new Dog("Rex"), new Cat("Misu")));
        for (Animal a : animals) {
            System.out.println(a);
            if (a instanceof Dog d) {
                System.out.println(d.name + " is a dog");
            }
        }
        List<Shape> shapes = List.of(new Circle(1.5), new Rectangle(2, 3.5));
        double total = 0;
        for (Shape s : shapes) {
            System.out.println(s.describe());
            total += s.area();
        }
        System.out.println(total);
        Object o = animals.get(1);
        System.out.println(o instanceof Animal);
        System.out.println(o instanceof Dog);
        Comparable<String> c = "abc";
        System.out.println(c.compareTo("abd"));
    }
}
