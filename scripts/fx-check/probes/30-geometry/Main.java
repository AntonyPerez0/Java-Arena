import java.util.Random;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.BoundingBox;
import javafx.geometry.Bounds;
import javafx.geometry.Point2D;
import javafx.stage.Stage;

/**
 * Point2D and BoundingBox: every method on chosen values (zero vectors, negative and fractional
 * numbers, NaN and infinities, -0.0), toString, equals and hashCode, and every method on 20,000
 * random values, printed as a hash of the exact doubles.
 */
public class Main extends Application {
    static long hash = 17;

    static void mix(double d) {
        hash = hash * 31 + Double.doubleToRawLongBits(d);
    }

    static void mix(long v) {
        hash = hash * 31 + v;
    }

    static void p(String s) {
        System.out.println(s);
    }

    @Override
    public void start(Stage stage) {
        points();
        boxes();
        fuzz();
        Platform.exit();
    }

    static void points() {
        Point2D a = new Point2D(3, 4);
        Point2D b = new Point2D(-1.5, 2.25);
        Point2D zero = new Point2D(0, 0);
        p("ZERO " + Point2D.ZERO + " " + (Point2D.ZERO == Point2D.ZERO) + " " + Point2D.ZERO.equals(zero));
        p("a " + a + " x " + a.getX() + " y " + a.getY());
        p("add " + a.add(b) + " " + a.add(1, -1));
        p("subtract " + a.subtract(b) + " " + a.subtract(1, -1));
        p("multiply " + a.multiply(2.5) + " " + a.multiply(-1) + " " + a.multiply(0));
        p("normalize " + a.normalize() + " " + b.normalize() + " zero " + zero.normalize());
        p("magnitude " + a.magnitude() + " " + b.magnitude() + " " + zero.magnitude());
        p("distance " + a.distance(b) + " " + a.distance(0, 0) + " " + a.distance(a));
        p("midpoint " + a.midpoint(b) + " " + a.midpoint(-3, -4));
        p("dotProduct " + a.dotProduct(b) + " " + a.dotProduct(2, 0.5));
        p("angle " + a.angle(b) + " " + a.angle(1, 0) + " " + a.angle(a) + " " + a.angle(-3, -4) + " zero " + a.angle(zero) + " " + zero.angle(1, 1));
        p("angle of three " + new Point2D(0, 0).angle(new Point2D(1, 0), new Point2D(0, 1)) + " " + a.angle(b, new Point2D(10, -2)) + " " + a.angle(a, b));
        p("equals " + a.equals(new Point2D(3, 4)) + " " + a.equals(b) + " " + a.equals(null) + " " + a.equals("Point2D [x = 3.0, y = 4.0]") + " " + new Point2D(0.0, 0).equals(new Point2D(-0.0, 0)));
        p("NaN equals " + new Point2D(Double.NaN, 1).equals(new Point2D(Double.NaN, 1)));
        p("hashCode " + a.hashCode() + " " + b.hashCode() + " " + zero.hashCode() + " " + new Point2D(-0.0, 0).hashCode() + " " + new Point2D(Double.NaN, Double.POSITIVE_INFINITY).hashCode());
        p("toString " + new Point2D(1e20, -1e-7) + " " + new Point2D(Double.NaN, Double.NEGATIVE_INFINITY) + " " + new Point2D(-0.0, 0.1 + 0.2));
        p("infinite " + new Point2D(Double.POSITIVE_INFINITY, 1).normalize() + " " + new Point2D(Double.MAX_VALUE, Double.MAX_VALUE).magnitude());
        // A ship as the MOOC moves it.
        Point2D movement = new Point2D(0, 0);
        double rotate = 0;
        for (int i = 0; i < 50; i++) {
            rotate += 5;
            double changeX = Math.cos(Math.toRadians(rotate));
            double changeY = Math.sin(Math.toRadians(rotate));
            movement = movement.add(changeX * 0.05, changeY * 0.05);
        }
        p("movement " + movement + " " + movement.magnitude() + " " + movement.normalize().multiply(3));
    }

    static void boxes() {
        BoundingBox b = new BoundingBox(10, 20, 30, 40);
        p("box " + b);
        p("min " + b.getMinX() + " " + b.getMinY() + " " + b.getMinZ() + " max " + b.getMaxX() + " " + b.getMaxY() + " " + b.getMaxZ());
        p("size " + b.getWidth() + " " + b.getHeight() + " " + b.getDepth() + " center " + b.getCenterX() + " " + b.getCenterY() + " " + b.getCenterZ() + " empty " + b.isEmpty());
        p("contains " + b.contains(10, 20) + " " + b.contains(40, 60) + " " + b.contains(40.001, 60) + " " + b.contains(new Point2D(25, 30)) + " " + b.contains(new BoundingBox(10, 20, 30, 40)) + " " + b.contains(new BoundingBox(9, 20, 5, 5)) + " " + b.contains(15, 25, 10, 10) + " " + b.contains(15, 25, 100, 10));
        p("intersects " + b.intersects(new BoundingBox(40, 60, 5, 5)) + " " + b.intersects(new BoundingBox(41, 60, 5, 5)) + " " + b.intersects(0, 0, 10, 20) + " " + b.intersects(0, 0, 9.9, 20) + " " + b.intersects(15, 25, 1, 1));
        BoundingBox empty = new BoundingBox(0, 0, -1, -1);
        p("empty " + empty + " " + empty.isEmpty() + " " + empty.contains(0, 0) + " " + b.contains(empty) + " " + b.intersects(empty) + " " + empty.intersects(b) + " " + empty.contains(empty));
        BoundingBox flat = new BoundingBox(5, 5, 0, 0);
        p("flat " + flat + " " + flat.isEmpty() + " " + flat.contains(5, 5) + " " + b.intersects(flat) + " " + new BoundingBox(1, 1, -1, 3).isEmpty() + " " + new BoundingBox(1, 1, 3, -0.5).isEmpty());
        BoundingBox three = new BoundingBox(1, 2, 3, 4, 5, 6);
        p("3D " + three + " " + three.getMaxZ() + " " + three.getDepth() + " " + three.isEmpty() + " " + new BoundingBox(1, 2, 3, 4, 5, -1).isEmpty());
        Bounds same = new BoundingBox(10, 20, 30, 40);
        p("equals " + b.equals(same) + " " + b.equals(new BoundingBox(10, 20, 30, 41)) + " " + b.equals(null) + " " + b.equals(three) + " hashCode " + b.hashCode() + " " + same.hashCode() + " " + empty.hashCode() + " " + three.hashCode());
        p("NaN " + new BoundingBox(Double.NaN, 0, 1, 1) + " " + new BoundingBox(Double.NaN, 0, 1, 1).isEmpty() + " " + new BoundingBox(0, 0, Double.NaN, 1).isEmpty() + " " + new BoundingBox(0, 0, Double.NaN, 1).contains(0, 0));
    }

    static void fuzz() {
        Random r = new Random(7);
        for (int i = 0; i < 20000; i++) {
            double x1 = value(r), y1 = value(r), x2 = value(r), y2 = value(r), f = value(r);
            Point2D a = new Point2D(x1, y1);
            Point2D b = new Point2D(x2, y2);
            for (Point2D q : new Point2D[] { a.add(b), a.subtract(b), a.multiply(f), a.normalize(), a.midpoint(b), a.add(x2, y2), a.subtract(x2, y2), a.midpoint(x2, y2) }) {
                mix(q.getX());
                mix(q.getY());
            }
            mix(a.magnitude());
            mix(a.distance(b));
            mix(a.distance(x2, y2));
            mix(a.dotProduct(b));
            mix(a.dotProduct(x2, y2));
            mix(a.angle(b));
            mix(a.angle(x2, y2));
            mix(a.angle(b, new Point2D(f, x1)));
            mix(a.hashCode());
            mix(a.equals(b) ? 1 : 0);
            mix(a.toString().hashCode());
            double w = value(r), h = value(r);
            BoundingBox box = new BoundingBox(x1, y1, w, h);
            mix(box.hashCode());
            mix(box.isEmpty() ? 1 : 0);
            mix(box.contains(x2, y2) ? 1 : 0);
            mix(box.contains(b) ? 1 : 0);
            BoundingBox other = new BoundingBox(x2, y2, Math.abs(f), Math.abs(w));
            mix(box.contains(other) ? 1 : 0);
            mix(box.intersects(other) ? 1 : 0);
            mix(box.intersects(x2, y2, f, h) ? 1 : 0);
            mix(box.contains(x2, y2, f, h) ? 1 : 0);
            mix(box.getMaxX());
            mix(box.getCenterY());
            mix(box.toString().hashCode());
        }
        p("20000 random values: hash " + Long.toHexString(hash));
    }

    /** Mostly ordinary numbers, sometimes zero, a whole number, or a tiny or huge one. */
    static double value(Random r) {
        switch (r.nextInt(10)) {
            case 0:
                return 0;
            case 1:
                return r.nextInt(21) - 10;
            case 2:
                return (r.nextDouble() - 0.5) * 1e-9;
            case 3:
                return (r.nextDouble() - 0.5) * 1e12;
            default:
                return (r.nextDouble() - 0.5) * 200;
        }
    }

    public static void main(String[] args) {
        launch(args);
    }
}
