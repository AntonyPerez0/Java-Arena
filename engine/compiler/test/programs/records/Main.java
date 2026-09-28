import java.util.*;

public class Main {
    record Point(int x, int y) {
        Point {
            if (x < 0) throw new IllegalArgumentException("negative x: " + x);
        }
        double distance() { return Math.sqrt(x * x + y * y); }
        static Point origin() { return new Point(0, 0); }
    }

    record Pair<A, B>(A first, B second) {}

    sealed interface Shape permits Circle, Square, Rect {}
    record Circle(double r) implements Shape {}
    record Square(double side) implements Shape {}
    record Rect(double w, double h) implements Shape {}

    static double area(Shape s) {
        return switch (s) {
            case Circle c -> Math.PI * c.r() * c.r();
            case Square sq -> sq.side() * sq.side();
            case Rect(double w, double h) when w == h -> w * w;
            case Rect(double w, double h) -> w * h;
        };
    }

    public static void main(String[] args) {
        Point p = new Point(3, 4);
        System.out.println(p + " " + p.distance() + " " + p.equals(new Point(3, 4)) + " " + p.hashCode());
        System.out.println(Point.origin());
        Pair<String, List<Integer>> pair = new Pair<>("nums", List.of(1, 2, 3));
        System.out.println(pair + " " + pair.second().size());
        for (Shape s : List.of(new Circle(1), new Square(2), new Rect(2, 3), new Rect(3, 3))) {
            System.out.println(s + " area " + area(s));
        }
        Object o = p;
        if (o instanceof Point(int x, int y) && x > 0) {
            System.out.println("x=" + x + " y=" + y);
        }
        try {
            new Point(-1, 0);
        } catch (IllegalArgumentException e) {
            System.out.println("caught " + e.getMessage());
        }
    }
}
