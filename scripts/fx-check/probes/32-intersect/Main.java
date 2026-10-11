import java.util.Random;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.geometry.Bounds;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.stage.Stage;

/**
 * Shape.intersect in every case a game meets: overlapping and separate polygons, one inside the
 * other, edges and corners that touch, turned polygons, translate and layout, convex and concave
 * polygons, rectangles, lines, strokes, circle against polygon and against circle (also nearly
 * touching), shapes without a fill, an empty polygon; the MOOC's test
 * getBoundsInLocal().getWidth() != -1; what the result is; and 6,000 random pairs, whose overlap
 * is printed as a hash (and, for two rectangles without a stroke, the result's box too).
 */
public class Main extends Application {
    static void p(String s) {
        System.out.println(s);
    }

    static String box(Bounds b) {
        return "[" + b.getMinX() + ", " + b.getMinY() + ", " + b.getWidth() + ", " + b.getHeight() + "]";
    }

    /** Whether they overlap as the MOOC asks, and the result's box (exact for polygons and rectangles). */
    static void both(String what, Shape a, Shape b) {
        Shape i = Shape.intersect(a, b);
        p(what + ": " + (i.getBoundsInLocal().getWidth() != -1) + " " + box(i.getBoundsInLocal()));
    }

    /** Only whether they overlap (for circles, whose result box is approximate). */
    static void overlap(String what, Shape a, Shape b) {
        p(what + ": " + (Shape.intersect(a, b).getBoundsInLocal().getWidth() != -1));
    }

    static Polygon square(double x, double y, double size) {
        return new Polygon(x, y, x + size, y, x + size, y + size, x, y + size);
    }

    @Override
    public void start(Stage stage) {
        both("overlapping", square(0, 0, 10), square(5, 5, 10));
        both("separate", square(0, 0, 10), square(20, 20, 10));
        both("inside", square(0, 0, 100), square(40, 40, 10));
        both("inside, other way", square(40, 40, 10), square(0, 0, 100));
        both("the same", square(0, 0, 10), square(0, 0, 10));
        both("edges touch", square(0, 0, 10), square(10, 0, 10));
        both("edges touch in part", square(0, 0, 10), square(10, 5, 10));
        both("corners touch", square(0, 0, 10), square(10, 10, 10));
        both("a corner on an edge", square(0, 0, 10), new Polygon(10, 5, 20, 0, 20, 10));
        both("barely overlap", square(0, 0, 10), square(9.999, 0, 10));
        both("triangles", new Polygon(0, 0, 10, 0, 0, 10), new Polygon(10, 10, 0, 10, 10, 0));
        both("triangles touching on the diagonal", new Polygon(0, 0, 10, 0, 0, 10), new Polygon(10, 0, 10, 10, 0, 10));
        // A triangle with a dent, (4, 4), as its first point, repeated at the end to close it by
        // hand (and once with a point repeated in the middle): the dent's turn sits next to an edge
        // of length 0. A rectangle and a circle over its corner overlap it; a circle in the dent doesn't.
        both("closed by hand, a rectangle over a corner", new Polygon(4, 4, 0, 10, 0, 0, 10, 0, 4, 4), new Rectangle(9, -1, 2, 4));
        overlap("closed by hand, a circle over a corner", new Polygon(4, 4, 0, 10, 0, 0, 10, 0, 4, 4), new Circle(8, 0.5, 0.6));
        overlap("closed by hand, a circle in the dent", new Polygon(4, 4, 0, 10, 0, 0, 10, 0, 4, 4), new Circle(5.5, 4.2, 0.3));
        both("a point repeated in the middle, a rectangle over a corner", new Polygon(4, 4, 0, 10, 0, 10, 0, 0, 10, 0), new Rectangle(9, -1, 2, 4));
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        Polygon rock = new Polygon(-10, -10, 10, -10, 10, 10, -10, 10);
        rock.setTranslateX(30);
        both("ship and rock apart", ship, rock);
        ship.setTranslateX(16);
        both("ship moved into the rock", ship, rock);
        ship.setTranslateX(14);
        ship.setRotate(180);
        both("ship turned away", ship, rock);
        ship.setRotate(0);
        both("ship nose touches", ship, rock);
        ship.setRotate(45);
        both("ship turned 45", ship, rock);
        rock.setRotate(45);
        both("both turned", ship, rock);
        Polygon laid = square(0, 0, 10);
        laid.setLayoutX(50);
        Polygon other = square(55, 5, 10);
        both("layout", laid, other);
        other.setLayoutY(10);
        both("layout apart", laid, other);
        other.setTranslateY(-6);
        both("layout and translate", laid, other);
        Polygon concave = new Polygon(0, 0, 30, 0, 30, 30, 20, 30, 20, 10, 10, 10, 10, 30, 0, 30);
        both("in the notch of a concave polygon", concave, square(12, 15, 6));
        both("over the notch", concave, square(12, 5, 6));
        Polygon star = new Polygon(0, -20, 5, -5, 20, 0, 5, 5, 0, 20, -5, 5, -20, 0, -5, -5);
        both("star and square between its points", star, square(8, 8, 5));
        both("star and square on a point", star, square(15, -2, 10));
        both("rectangles", new Rectangle(0, 0, 10, 10), new Rectangle(5, 5, 10, 10));
        both("rectangles touching", new Rectangle(0, 0, 10, 10), new Rectangle(10, 0, 10, 10));
        both("rectangle and polygon", new Rectangle(0, 0, 10, 10), new Polygon(5, 5, 20, 5, 5, 20));
        Rectangle turned = new Rectangle(0, 0, 20, 10);
        turned.setRotate(90);
        both("turned rectangle", turned, new Rectangle(0, -5, 4, 4));
        both("line through a square", new Line(-5, 5, 15, 5), square(0, 0, 10));
        both("line beside a square", new Line(-5, 12, 15, 12), square(0, 0, 10));
        Line thick = new Line(-5, 12, 15, 12);
        thick.setStrokeWidth(6);
        both("thick line beside a square", thick, square(0, 0, 10));
        Polygon outlined = square(0, 0, 10);
        outlined.setStroke(Color.BLACK);
        outlined.setStrokeWidth(4);
        overlap("stroked square near another", outlined, square(11, 0, 10));
        Polygon unfilled = square(0, 0, 10);
        unfilled.setFill(null);
        both("square without a fill", unfilled, square(5, 5, 10));
        Polygon nothing = square(0, 0, 10);
        nothing.setFill(null);
        nothing.setStroke(null);
        both("square with neither fill nor stroke", nothing, square(5, 5, 10));
        both("a polygon of two points", new Polygon(0, 0, 10, 10), square(0, 0, 10));

        overlap("circle and polygon", new Circle(0, 0, 10), square(5, 5, 10));
        overlap("circle and polygon apart", new Circle(0, 0, 10), square(8, 8, 10));
        overlap("circle and polygon near the corner", new Circle(0, 0, 10), square(7, 7, 10));
        overlap("circle inside a polygon", new Circle(50, 50, 5), square(0, 0, 100));
        overlap("polygon inside a circle", square(-2, -2, 4), new Circle(0, 0, 10));
        overlap("circles", new Circle(0, 0, 10), new Circle(15, 0, 10));
        overlap("circles apart", new Circle(0, 0, 10), new Circle(25, 0, 10));
        overlap("circles touching", new Circle(0, 0, 10), new Circle(20, 0, 10));
        overlap("circles nearly touching", new Circle(0, 0, 10), new Circle(19.99, 0, 10));
        overlap("circles nearly touching on the diagonal", new Circle(0, 0, 10), new Circle(14.13, 14.13, 10));
        overlap("circles just apart on the diagonal", new Circle(0, 0, 10), new Circle(14.15, 14.15, 10));
        overlap("circle in a circle", new Circle(0, 0, 10), new Circle(1, 1, 2));
        Circle moved = new Circle(10);
        moved.setTranslateX(100);
        moved.setLayoutY(50);
        Circle there = new Circle(100, 65, 6);
        overlap("moved circles", moved, there);
        moved.setRotate(90);
        overlap("moved circles, one turned", moved, there);
        Circle ring = new Circle(0, 0, 20);
        ring.setFill(null);
        ring.setStroke(Color.RED);
        ring.setStrokeWidth(2);
        overlap("in a ring", ring, new Circle(0, 0, 5));
        overlap("on a ring", ring, new Circle(20, 0, 2));
        overlap("circle and rectangle", new Circle(0, 0, 10), new Rectangle(9, -1, 5, 2));
        overlap("circle and line", new Circle(0, 0, 10), new Line(-20, 9, 20, 9));
        overlap("circle of radius 0", new Circle(0, 0, 0), square(-5, -5, 10));

        Shape result = Shape.intersect(square(0, 0, 10), square(5, 5, 10));
        Shape none = Shape.intersect(square(0, 0, 10), square(20, 20, 10));
        p("result " + result.getClass().getName() + " " + result.getFill() + " " + result.getStroke() + " " + result.getStrokeWidth() + " " + box(result.getBoundsInParent()) + " " + result.getBoundsInLocal().isEmpty());
        p("empty result " + none.getClass().getName() + " " + none.getBoundsInLocal() + " " + none.getBoundsInLocal().isEmpty() + " " + none.getBoundsInLocal().getWidth() + " " + none.getBoundsInLocal().getHeight());
        Polygon inPane = square(0, 0, 10);
        Pane pane = new Pane(inPane);
        Shape fromPane = Shape.intersect(inPane, square(5, 5, 10));
        p("result has no parent " + (fromPane.getParent() == null) + " " + pane.getChildren().size() + " " + box(fromPane.getBoundsInLocal()));
        try {
            Shape.intersect(new Polygon(), square(0, 0, 10));
            p("empty polygon: no exception");
        } catch (RuntimeException e) {
            p("empty polygon: " + e.getClass().getName());
        }
        try {
            Shape.intersect(null, square(0, 0, 10));
            p("null: no exception");
        } catch (RuntimeException e) {
            p("null: " + e.getClass().getName());
        }

        Random r = new Random(11);
        long overlaps = 17;
        long boxes = 17;
        int count = 0;
        for (int i = 0; i < 6000; i++) {
            Shape a = randomShape(r, i % 3 == 0);
            Shape b = randomShape(r, i % 5 == 0);
            if (i % 2 == 0) {
                // Near each other, so that many pairs touch or nearly touch.
                b.setTranslateX(a.getTranslateX() + (r.nextInt(41) - 20) * 0.5);
                b.setTranslateY(a.getTranslateY() + (r.nextInt(41) - 20) * 0.5);
            }
            Shape i2 = Shape.intersect(a, b);
            boolean hit = i2.getBoundsInLocal().getWidth() != -1;
            if (hit) {
                count++;
            }
            overlaps = overlaps * 31 + (hit ? 1 : 0);
            if (a instanceof Rectangle && b instanceof Rectangle && a.getStroke() == null && b.getStroke() == null) {
                Bounds ib = i2.getBoundsInLocal();
                boxes = boxes * 31 + Double.doubleToLongBits(ib.getMinX());
                boxes = boxes * 31 + Double.doubleToLongBits(ib.getMinY());
                boxes = boxes * 31 + Double.doubleToLongBits(ib.getWidth());
                boxes = boxes * 31 + Double.doubleToLongBits(ib.getHeight());
            }
        }
        p("6000 random pairs: " + count + " overlap, hash " + Long.toHexString(overlaps) + " " + Long.toHexString(boxes));
        Platform.exit();
    }

    static Shape randomShape(Random r, boolean stroked) {
        Shape s;
        switch (r.nextInt(4)) {
            case 0:
                s = new Circle(r.nextInt(40) - 20, r.nextInt(40) - 20, 1 + r.nextInt(20));
                break;
            case 1:
                s = new Rectangle(r.nextInt(40) - 20, r.nextInt(40) - 20, 1 + r.nextInt(30), 1 + r.nextInt(30));
                break;
            default:
                double[] points;
                do {
                    int n = 3 + r.nextInt(6);
                    points = new double[2 * n];
                    for (int k = 0; k < points.length; k++) {
                        points[k] = r.nextInt(41) - 20;
                    }
                    // A polygon without area (all its points on a line) isn't drawn: see the README.
                } while (Math.abs(area(points)) < 1);
                s = new Polygon(points);
        }
        if (stroked) {
            s.setStroke(Color.BLACK);
            s.setStrokeWidth(1 + r.nextInt(4));
        }
        s.setRotate(r.nextInt(4) == 0 ? 0 : r.nextInt(360));
        s.setTranslateX(r.nextInt(60) - 30);
        s.setTranslateY(r.nextInt(60) - 30);
        s.setLayoutX(r.nextInt(3) * 5);
        return s;
    }

    /** The polygon's area by the shoelace formula (signed; 0 when its points are on a line). */
    static double area(double[] p) {
        double a = 0;
        for (int i = 0; i < p.length; i += 2) {
            int j = (i + 2) % p.length;
            a += p[i] * p[j + 1] - p[j] * p[i + 1];
        }
        return a / 2;
    }

    public static void main(String[] args) {
        launch(args);
    }
}
