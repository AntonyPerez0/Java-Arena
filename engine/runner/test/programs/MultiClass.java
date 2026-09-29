import java.util.ArrayList;
import java.util.List;

interface Shape {
    double area();

    default String describe() {
        return getClass().getSimpleName() + " with area " + String.format("%.2f", area());
    }
}

record Circle(double radius) implements Shape {
    public double area() {
        return Math.PI * radius * radius;
    }
}

abstract class Polygon implements Shape {
    protected final int sides;

    Polygon(int sides) {
        this.sides = sides;
    }

    @Override
    public String toString() {
        return "Polygon(" + sides + ")";
    }
}

class Rectangle extends Polygon {
    private final double w;
    private final double h;

    Rectangle(double w, double h) {
        super(4);
        this.w = w;
        this.h = h;
    }

    public double area() {
        return w * h;
    }
}

enum Color { RED, GREEN, BLUE }

public class MultiClass {
    static int counter;

    static {
        counter = 10;
    }

    public static void main(String[] args) {
        List<Shape> shapes = new ArrayList<>();
        shapes.add(new Circle(1.5));
        shapes.add(new Rectangle(2, 3.5));
        for (Shape s : shapes) System.out.println(s.describe() + " " + s);
        System.out.println(Color.valueOf("GREEN").ordinal() + " " + java.util.Arrays.toString(Color.values()) + " " + counter);
        Object o = shapes.get(1);
        if (o instanceof Rectangle r && r.sides == 4) System.out.println("pattern ok " + r.area());
        String kind = switch (Color.BLUE) {
            case RED -> "warm";
            case GREEN, BLUE -> "cool";
        };
        System.out.println(kind + " " + new Circle(2).equals(new Circle(2)) + " " + new Circle(2).hashCode());
        var anon = new Object() {
            @Override
            public String toString() {
                return "anonymous " + getClass().getName();
            }
        };
        System.out.println(anon);
        Runnable r = () -> System.out.println("lambda " + counter);
        r.run();
        System.out.println(Shape.class.isInterface() + " " + new Rectangle(1, 1).getClass().getSuperclass().getName());
        char[] chars = {'d', 'a', 'c'};
        java.util.Arrays.sort(chars);
        System.out.println(chars);
        int[][] grid = new int[3][4];
        grid[1][2] = 5;
        System.out.println(java.util.Arrays.deepToString(grid));
        System.out.println(Integer.valueOf(127) == Integer.valueOf(127));
        System.out.println(Integer.valueOf(128) == Integer.valueOf(128));
        String a = "hel";
        String b = a + "lo";
        System.out.println((b == "hello") + " " + b.equals("hello") + " " + (b.intern() == "hello"));
    }
}
