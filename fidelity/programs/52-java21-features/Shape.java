// A sealed hierarchy: records (final by themselves), a final class, a non-sealed class and a sealed
// subinterface with its own permitted record.
public sealed interface Shape permits Circle, Square, Rect, Triangle, Blob, Polygon {
    double area();
}

record Circle(double radius) implements Shape {
    Circle {
        if (radius < 0) {
            throw new IllegalArgumentException("radius below zero: " + radius);
        }
    }

    public double area() {
        return Math.PI * radius * radius;
    }
}

record Square(double side) implements Shape {
    public double area() {
        return side * side;
    }
}

record Rect(Point corner, Point opposite) implements Shape {
    public double area() {
        return Math.abs(opposite.x() - corner.x()) * Math.abs(opposite.y() - corner.y());
    }
}

final class Triangle implements Shape {
    private final double base;
    private final double height;

    Triangle(double base, double height) {
        this.base = base;
        this.height = height;
    }

    public double area() {
        return base * height / 2;
    }

    @Override
    public String toString() {
        return "Triangle(" + base + ", " + height + ")";
    }
}

non-sealed class Blob implements Shape {
    public double area() {
        return 1.5;
    }

    @Override
    public String toString() {
        return "Blob";
    }
}

sealed interface Polygon extends Shape permits Hexagon {
}

record Hexagon(double side) implements Polygon {
    public double area() {
        return 3 * Math.sqrt(3) / 2 * side * side;
    }
}
