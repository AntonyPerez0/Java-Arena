import java.util.Random;
import javafx.application.Application;
import javafx.collections.ObservableList;
import javafx.geometry.Bounds;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.scene.paint.Color;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Line;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Rectangle;
import javafx.scene.shape.Shape;
import javafx.scene.text.Font;
import javafx.scene.text.Text;
import javafx.stage.Stage;

/**
 * Every shape's constructors, defaults, setters and toString; a polygon's points list; translate,
 * layout and rotate on every kind of node (rotate about the center of the node's own bounds), the
 * bounds in local and in the parent of polygons, rectangles, lines and circles (turned by
 * multiples of 90 degrees: see the README), with strokes (not of a line of length 0 or a polygon
 * with fewer than two different points: see the README), and 2,000 random turned and moved
 * polygons and rectangles, printed as a hash of their bounds; a scene that takes its pane's
 * preferred size, and a window holding every kind of shape.
 */
public class Main extends Application {
    static void p(String s) {
        System.out.println(s);
    }

    static String b(Node n) {
        Bounds l = n.getBoundsInLocal();
        Bounds q = n.getBoundsInParent();
        return "local [" + l.getMinX() + ", " + l.getMinY() + ", " + l.getWidth() + ", " + l.getHeight() + "] parent [" + q.getMinX() + ", " + q.getMinY() + ", " + q.getWidth() + ", " + q.getHeight() + "]";
    }

    static String shape(Shape s) {
        return s.getFill() + " " + s.getStroke() + " " + s.getStrokeWidth() + " t " + s.getTranslateX() + " " + s.getTranslateY() + " l " + s.getLayoutX() + " " + s.getLayoutY() + " r " + s.getRotate() + " | " + b(s);
    }

    @Override
    public void start(Stage stage) {
        p("Circle() " + new Circle() + " | " + shape(new Circle()));
        p("Circle(5) " + new Circle(5) + " | " + shape(new Circle(5)));
        p("Circle(5, RED) " + new Circle(5, Color.RED) + " | " + shape(new Circle(5, Color.RED)));
        p("Circle(1, 2, 3) " + new Circle(1, 2, 3) + " | " + shape(new Circle(1, 2, 3)));
        p("Circle(1, 2, 3, BLUE) " + new Circle(1, 2, 3, Color.BLUE) + " | " + shape(new Circle(1, 2, 3, Color.BLUE)));
        p("Circle(-5) " + shape(new Circle(-5)) + " Circle(0) " + shape(new Circle(0)));
        Circle c = new Circle();
        c.setCenterX(10);
        c.setCenterY(-20);
        c.setRadius(7.5);
        p("circle set " + c.getCenterX() + " " + c.getCenterY() + " " + c.getRadius() + " " + c);
        p("Rectangle() " + new Rectangle() + " | " + shape(new Rectangle()));
        p("Rectangle(4, 6) " + new Rectangle(4, 6) + " | " + shape(new Rectangle(4, 6)));
        p("Rectangle(4, 6, GREEN) " + new Rectangle(4, 6, Color.GREEN) + " | " + shape(new Rectangle(4, 6, Color.GREEN)));
        p("Rectangle(1, 2, 4, 6) " + new Rectangle(1, 2, 4, 6) + " | " + shape(new Rectangle(1, 2, 4, 6)));
        p("Rectangle(-4, 6) " + shape(new Rectangle(-4, 6)) + " Rectangle(0, 6) " + shape(new Rectangle(0, 6)));
        Rectangle r = new Rectangle();
        r.setX(3);
        r.setY(4);
        r.setWidth(10);
        r.setHeight(0.5);
        p("rectangle set " + r.getX() + " " + r.getY() + " " + r.getWidth() + " " + r.getHeight() + " " + r);
        // A line of length 0 (and a polygon with fewer than two different points) has bounds that real JavaFX
        // works out its own way (see the README): only its properties are printed.
        p("Line() " + new Line() + " | " + new Line().getFill() + " " + new Line().getStroke() + " " + new Line().getStrokeWidth());
        p("Line(1, 2, 30, 40) " + new Line(1, 2, 30, 40) + " | " + shape(new Line(1, 2, 30, 40)));
        Line line = new Line();
        line.setStartX(-1);
        line.setStartY(-2);
        line.setEndX(5);
        line.setEndY(-2);
        p("line set " + line.getStartX() + " " + line.getStartY() + " " + line.getEndX() + " " + line.getEndY() + " " + line + " | " + shape(line));
        line.setStrokeWidth(4);
        p("line width 4 " + b(line));
        line.setStroke(null);
        p("line without stroke " + b(line));
        p("Polygon() " + new Polygon() + " | " + shape(new Polygon()));
        Polygon tri = new Polygon(0, -10, 10, 10, -10, 10);
        p("Polygon(...) " + tri + " | " + shape(tri));
        p("odd points " + new Polygon(1, 2, 3).getPoints() + " one point " + new Polygon(5, 6).getPoints());
        ObservableList<Double> pts = tri.getPoints();
        p("points " + pts + " " + pts.size() + " " + (tri.getPoints() == pts));
        pts.addAll(20.0, 0.0);
        p("points added " + pts + " " + b(tri));
        pts.set(0, -5.0);
        pts.remove(pts.size() - 2, pts.size());
        p("points changed " + pts + " " + b(tri));
        pts.setAll(0.0, 0.0, 4.0, 0.0, 4.0, 3.0);
        p("points setAll " + pts + " " + b(tri));
        p("Polygon(double[]) " + new Polygon(new double[] { 1, 1, 2, 2 }).getPoints());
        p("Text() " + new Text() + " | " + new Text().getText() + " " + new Text().getX() + " " + new Text().getY() + " " + new Text().getFill() + " " + new Text().getStroke() + " " + new Text().getFont());
        Text t = new Text(5, 15, "Points: 0");
        p("Text(5, 15, ...) " + t.getText() + " " + t.getX() + " " + t.getY() + " " + t);
        t.setText("Points: 10");
        t.setX(-2);
        t.setY(30.5);
        t.setFont(Font.font("Monospaced", 18));
        p("text set " + t.getText() + " " + t.getX() + " " + t.getY() + " " + t.getFont() + " " + new Text("a").getText() + " " + new Text(null).getText());
        t.setText(null);
        p("text null " + t.getText());

        Shape s = new Polygon(0, 0, 10, 0, 10, 10);
        s.setFill(Color.web("#123456"));
        s.setStroke(Color.YELLOW);
        s.setStrokeWidth(3);
        p("set " + s.getFill() + " " + s.getStroke() + " " + s.getStrokeWidth());
        s.setStrokeWidth(-2);
        p("negative width " + s.getStrokeWidth());
        s.setFill(null);
        s.setStroke(null);
        p("nulls " + s.getFill() + " " + s.getStroke() + " " + b(s));

        // A shape that covers nothing (no fill, no stroke), moved and turned: its bounds in parent
        // are empty, but after an exact quarter turn JavaFX gives a box of 1 x 1 at the move.
        for (Shape empty : new Shape[] { new Rectangle(10, 20, 30, 40), new Polygon(0, 0, 10, 0, 0, 10), new Circle(5, 5, 3), new Line(0, 0, 10, 10) }) {
            empty.setFill(null);
            empty.setStroke(null);
            empty.setTranslateX(-12.15);
            empty.setLayoutY(3);
            for (double angle : new double[] { 0, 30, 45, 90, 180, 270, -90, 360, 450 }) {
                empty.setRotate(angle);
                p("covers nothing " + empty.getClass().getSimpleName() + " rotate " + angle + " " + b(empty));
            }
        }
        // Transforms and bounds: rotate is about the center of the node's own bounds.
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        for (double angle : new double[] { 0, 30, 45, 90, -90, 180, 270, 360, 725.5, -0.0 }) {
            ship.setRotate(angle);
            p("ship rotate " + angle + " " + ship.getRotate() + " " + b(ship));
        }
        ship.setTranslateX(100);
        ship.setTranslateY(-50.5);
        ship.setLayoutX(7);
        ship.setLayoutY(8);
        p("ship moved " + shape(ship));
        Rectangle rect = new Rectangle(10, 10, 40, 20);
        for (double angle : new double[] { 0, 30, 90, 135 }) {
            rect.setRotate(angle);
            p("rectangle rotate " + angle + " " + b(rect));
        }
        Line l2 = new Line(0, 0, 100, 50);
        l2.setRotate(90);
        l2.setTranslateX(5);
        p("line turned " + b(l2));
        Circle circle = new Circle(30, 40, 20);
        for (double angle : new double[] { 0, 90, 180, 270 }) {
            circle.setRotate(angle);
            circle.setTranslateX(angle);
            p("circle rotate " + angle + " " + b(circle));
        }
        circle.setStroke(Color.RED);
        circle.setStrokeWidth(4);
        p("circle stroked " + b(circle));
        Rectangle stroked = new Rectangle(0, 0, 10, 10);
        stroked.setStroke(Color.BLACK);
        stroked.setStrokeWidth(2);
        p("rectangle stroked " + b(stroked));
        stroked.setRotate(90);
        p("rectangle stroked turned " + b(stroked));
        Text text = new Text(10, 20, "x");
        text.setTranslateX(3);
        text.setRotate(45);
        text.setLayoutY(4);
        p("text moves " + text.getTranslateX() + " " + text.getRotate() + " " + text.getLayoutY());
        Pane inner = new Pane();
        inner.setTranslateX(11);
        inner.setLayoutY(12);
        inner.setRotate(13);
        p("pane moves " + inner.getTranslateX() + " " + inner.getLayoutY() + " " + inner.getRotate() + " " + inner.getTranslateY() + " " + inner.getLayoutX());

        Random random = new Random(3);
        long hash = 17;
        for (int i = 0; i < 2000; i++) {
            Shape shape;
            if (random.nextBoolean()) {
                int n = 3 + random.nextInt(5);
                double[] points = new double[2 * n];
                for (int k = 0; k < points.length; k++) {
                    points[k] = random.nextInt(81) - 40 + (random.nextBoolean() ? 0 : random.nextInt(4) * 0.25);
                }
                shape = new Polygon(points);
            } else {
                shape = new Rectangle(random.nextInt(50) - 25, random.nextInt(50) - 25, random.nextInt(40), random.nextInt(40));
            }
            shape.setRotate(random.nextInt(8) == 0 ? 90 * random.nextInt(4) : random.nextInt(3600) / 10.0);
            shape.setTranslateX(random.nextInt(200) - 100 + random.nextInt(4) * 0.5);
            shape.setTranslateY(random.nextInt(200) - 100);
            shape.setLayoutX(random.nextInt(20));
            shape.setLayoutY(random.nextInt(20) * 0.25);
            for (Bounds bounds : new Bounds[] { shape.getBoundsInLocal(), shape.getBoundsInParent() }) {
                hash = hash * 31 + Double.doubleToLongBits(bounds.getMinX());
                hash = hash * 31 + Double.doubleToLongBits(bounds.getMinY());
                hash = hash * 31 + Double.doubleToLongBits(bounds.getMaxX());
                hash = hash * 31 + Double.doubleToLongBits(bounds.getMaxY());
            }
        }
        p("2000 random turned shapes: hash " + Long.toHexString(hash));

        // The window: a pane with every kind of shape, and a scene that takes the pane's preferred size.
        Pane pane = new Pane();
        pane.setPrefSize(320, 240);
        p("pane " + pane.getPrefWidth() + " " + pane.getPrefHeight());
        Polygon a = new Polygon(0, -10, 10, 10, -10, 10);
        a.setTranslateX(160);
        a.setTranslateY(120);
        a.setRotate(90);
        Circle ring = new Circle(40, 50, 15, Color.TRANSPARENT);
        ring.setStroke(Color.DARKGREEN);
        ring.setStrokeWidth(2.5);
        Rectangle box = new Rectangle(200, 20, 50, 30);
        box.setFill(Color.web("#ff8800"));
        box.setLayoutX(5);
        Line diag = new Line(0, 0, 320, 240);
        diag.setStroke(Color.GRAY);
        Text score = new Text(10, 230, "Points: 30");
        score.setFont(Font.font("SansSerif", 16));
        Pane sub = new Pane(new Circle(5), new Rectangle(3, 3));
        sub.setLayoutX(250);
        sub.setLayoutY(150);
        sub.setRotate(45);
        pane.getChildren().addAll(a, ring, box, diag, score, sub, new Polygon());
        Scene scene = new Scene(pane);
        p("scene before show " + scene.getWidth() + " " + scene.getHeight());
        stage.setScene(scene);
        stage.show();
        p("scene after show " + scene.getWidth() + " " + scene.getHeight());
    }

    public static void main(String[] args) {
        launch(args);
    }
}
