sealed interface Shape permits Circle, Square, Triangle {
}

record Circle(double radius) implements Shape {
}

record Square(double side) implements Shape {
}

record Triangle(double base, double height) implements Shape {
}

public class Main {
    enum Light { RED, YELLOW, GREEN }

    static double area(Shape shape) {
        return switch (shape) {
            case Circle c -> Math.PI * c.radius() * c.radius();
            case Square s -> s.side() * s.side();
        };
    }

    static String action(Light light) {
        return switch (light) {
            case RED -> "stop";
            case GREEN -> "go";
        };
    }

    static String dayName(int day) {
        return switch (day) {
            case 1 -> "Monday";
            case 2 -> "Tuesday";
        };
    }

    static String size(int length) {
        return switch (length) {
            case 1 -> "short";
            case 2 -> {
                String word = "medium";
                System.out.println(word);
            }
            default -> "long";
        };
    }

    static String count(int n) {
        return switch (n) {
            case 0:
                yield "none";
            default:
                System.out.println("many");
        };
    }

    static void describe(Object value) {
        switch (value) {
            case String s -> System.out.println("text " + s);
            case Integer i -> System.out.println("number " + i);
        }
    }

    public static void main(String[] args) {
        System.out.println(area(new Circle(1)) + action(Light.RED) + dayName(1) + size(2) + count(3));
        describe("a");
    }
}
