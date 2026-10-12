import java.util.Objects;

// Records: a compact constructor that checks and normalizes, generated toString, equals and
// hashCode, an accessor written by hand, static members, a generic record and nested records.
public record Point(int x, int y) {
    static final Point ORIGIN = new Point(0, 0);

    public Point {
        if (x < -1000 || y < -1000) {
            throw new IllegalArgumentException("too far: " + x + ", " + y);
        }
    }

    static Point of(String text) {
        String[] parts = text.split(",");
        return new Point(Integer.parseInt(parts[0].trim()), Integer.parseInt(parts[1].trim()));
    }

    Point plus(Point other) {
        return new Point(x + other.x, y + other.y);
    }

    int manhattan() {
        return Math.abs(x) + Math.abs(y);
    }
}

record Name(String first, String last) {
    Name {
        Objects.requireNonNull(first, "first");
        first = first.strip();
        last = last == null ? "" : last.strip().toUpperCase();
    }

    // An accessor of its own replaces the generated one.
    public String last() {
        return last.isEmpty() ? "(none)" : last;
    }
}

record Pair<A, B>(A first, B second) {
    <C> Pair<A, C> withSecond(C value) {
        return new Pair<>(first, value);
    }
}

record Line(Point from, Point to) {
}

record Measure(String label, double value, int[] counts) {
}
