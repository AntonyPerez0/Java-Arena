// Part of Java Arena's practice version of JavaFX: written for this site, not OpenJFX's code.
package javafx.geometry;

/**
 * A point (or a vector) in two dimensions, which never changes: add, subtract, multiply and
 * normalize give a new one. The formulas are JavaFX 21's, so the results are the same to the last
 * bit (checked on OpenJFX 21.0.12).
 */
public class Point2D {
    /** The point (0, 0). */
    public static final Point2D ZERO = new Point2D(0.0, 0.0);

    private final double x;
    private final double y;

    public Point2D(double x, double y) {
        this.x = x;
        this.y = y;
    }

    public final double getX() {
        return x;
    }

    public final double getY() {
        return y;
    }

    /** The distance from this point to (x1, y1). */
    public double distance(double x1, double y1) {
        double a = getX() - x1;
        double b = getY() - y1;
        return Math.sqrt(a * a + b * b);
    }

    public double distance(Point2D point) {
        return distance(point.getX(), point.getY());
    }

    /** This point moved by (x, y). */
    public Point2D add(double x, double y) {
        return new Point2D(getX() + x, getY() + y);
    }

    public Point2D add(Point2D point) {
        return add(point.getX(), point.getY());
    }

    /** This point moved by (-x, -y). */
    public Point2D subtract(double x, double y) {
        return new Point2D(getX() - x, getY() - y);
    }

    public Point2D subtract(Point2D point) {
        return subtract(point.getX(), point.getY());
    }

    /** This vector made factor times as long. */
    public Point2D multiply(double factor) {
        return new Point2D(getX() * factor, getY() * factor);
    }

    /** This vector made 1 long, in the same direction; (0, 0) stays (0, 0). */
    public Point2D normalize() {
        double mag = magnitude();
        if (mag == 0.0) {
            return new Point2D(0.0, 0.0);
        }
        return new Point2D(getX() / mag, getY() / mag);
    }

    /** The point halfway between this one and (x, y). */
    public Point2D midpoint(double x, double y) {
        return new Point2D(x + (getX() - x) / 2.0, y + (getY() - y) / 2.0);
    }

    public Point2D midpoint(Point2D point) {
        return midpoint(point.getX(), point.getY());
    }

    /** The angle in degrees between this vector and (x, y), from 0 to 180; NaN when either is (0, 0). */
    public double angle(double x, double y) {
        double ax = getX();
        double ay = getY();
        double delta = (ax * x + ay * y) / Math.sqrt((ax * ax + ay * ay) * (x * x + y * y));
        if (delta > 1.0) {
            return 0.0;
        }
        if (delta < -1.0) {
            return 180.0;
        }
        return Math.toDegrees(Math.acos(delta));
    }

    public double angle(Point2D vector) {
        return angle(vector.getX(), vector.getY());
    }

    /** The angle in degrees at this point between the lines to p1 and to p2. */
    public double angle(Point2D p1, Point2D p2) {
        double x = getX();
        double y = getY();
        double ax = p1.getX() - x;
        double ay = p1.getY() - y;
        double bx = p2.getX() - x;
        double by = p2.getY() - y;
        double delta = (ax * bx + ay * by) / Math.sqrt((ax * ax + ay * ay) * (bx * bx + by * by));
        if (delta > 1.0) {
            return 0.0;
        }
        if (delta < -1.0) {
            return 180.0;
        }
        return Math.toDegrees(Math.acos(delta));
    }

    /** The length of this vector. */
    public double magnitude() {
        double x = getX();
        double y = getY();
        return Math.sqrt(x * x + y * y);
    }

    public double dotProduct(double x, double y) {
        return getX() * x + getY() * y;
    }

    public double dotProduct(Point2D vector) {
        return dotProduct(vector.getX(), vector.getY());
    }

    /** The same x and y (compared with ==, so -0.0 equals 0.0 and NaN equals nothing). */
    @Override
    public boolean equals(Object obj) {
        if (obj == this) {
            return true;
        }
        if (obj instanceof Point2D) {
            Point2D other = (Point2D) obj;
            return getX() == other.getX() && getY() == other.getY();
        }
        return false;
    }

    @Override
    public int hashCode() {
        long bits = 7L;
        bits = 31L * bits + Double.doubleToLongBits(getX());
        bits = 31L * bits + Double.doubleToLongBits(getY());
        return (int) (bits ^ (bits >> 32));
    }

    /** As JavaFX writes it: Point2D [x = 1.0, y = 2.0]. */
    @Override
    public String toString() {
        return "Point2D [x = " + getX() + ", y = " + getY() + "]";
    }
}
