import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.layout.VBox;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;
import javafx.stage.Stage;

// Probe: a canvas and its GraphicsContext. Defaults, setters and getters, what a setter ignores
// (null), polygons with too few points and arrays shorter than the count, and canvases with every
// drawing call (whole and fractional coordinates, colors with opacity, line widths, clearRect,
// polygons that cross themselves, texts in JavaFX's own families), which fx-check compares with a
// snapshot of the real canvas.
public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Canvas empty = new Canvas();
        System.out.println("Canvas(): " + empty.getWidth() + " x " + empty.getHeight());
        Canvas shapes = new Canvas(240, 160);
        GraphicsContext g = shapes.getGraphicsContext2D();
        System.out.println("same context: " + (g == shapes.getGraphicsContext2D()) + ", canvas: " + (g.getCanvas() == shapes));
        System.out.println("defaults: fill " + g.getFill() + ", stroke " + g.getStroke() + ", width " + g.getLineWidth() + ", font " + g.getFont());
        g.setFill(null);
        g.setStroke(null);
        g.setFont(null);
        System.out.println("after nulls: fill " + g.getFill() + ", stroke " + g.getStroke() + ", font " + g.getFont());
        g.setLineWidth(0);
        System.out.println("line width 0: " + g.getLineWidth());
        g.setLineWidth(-3);
        System.out.println("line width -3: " + g.getLineWidth());
        g.setLineWidth(Double.NaN);
        System.out.println("line width NaN: " + g.getLineWidth());
        g.setLineWidth(Double.POSITIVE_INFINITY);
        System.out.println("line width Infinity: " + g.getLineWidth());
        g.setLineWidth(1);

        g.setFill(Color.web("#f4efe1"));
        g.fillRect(0, 0, 240, 160);
        g.setFill(Color.CORNFLOWERBLUE);
        g.fillRect(10, 10, 60, 40);
        g.setFill(Color.rgb(200, 30, 30, 0.5));
        g.fillRect(40.5, 30.25, 50.5, 30.75);
        g.setStroke(Color.DARKGREEN);
        g.setLineWidth(3);
        g.strokeRect(100, 10, 50, 40);
        g.setLineWidth(1);
        g.setStroke(Color.BLACK);
        g.strokeRect(160.5, 10.5, 30, 30);
        g.setFill(Color.ORANGE);
        g.fillOval(10, 70, 50, 30);
        g.setStroke(Color.PURPLE);
        g.setLineWidth(2.5);
        g.strokeOval(70, 70, 40, 40);
        g.setStroke(Color.NAVY);
        g.setLineWidth(1);
        g.strokeLine(120, 70, 200, 110);
        g.setLineWidth(4);
        g.strokeLine(120, 120, 220, 120);
        g.setFill(Color.TEAL);
        g.fillPolygon(new double[] { 200, 230, 215 }, new double[] { 20, 20, 50 }, 3);
        g.setFill(Color.GOLD);
        g.fillPolygon(new double[] { 130, 170, 130, 170 }, new double[] { 125, 155, 155, 125 }, 4);
        g.setStroke(Color.CRIMSON);
        g.setLineWidth(2);
        g.strokePolygon(new double[] { 180, 230, 205 }, new double[] { 150, 150, 125 }, 3);
        g.clearRect(5, 120, 30, 30);
        g.setFill(Color.BLACK);
        g.fillPolygon(new double[] { 0, 10 }, new double[] { 0, 10 }, 2);
        g.fillPolygon(new double[] { 0, 10, 5 }, new double[] { 0, 0, 10 }, 0);
        try {
            g.fillPolygon(new double[] { 0, 10 }, new double[] { 0, 10, 20 }, 3);
            System.out.println("short xs: drawn");
        } catch (RuntimeException e) {
            System.out.println("short xs: " + e);
        }
        try {
            g.strokePolygon(null, new double[] { 0 }, 1);
            System.out.println("null xs: drawn");
        } catch (RuntimeException e) {
            System.out.println("null xs: " + e);
        }

        Canvas texts = new Canvas(240, 90);
        GraphicsContext t = texts.getGraphicsContext2D();
        t.setFill(Color.WHITE);
        t.fillRect(0, 0, 240, 90);
        t.setFill(Color.BLACK);
        t.fillText("Hello, canvas", 10, 20);
        t.setFont(Font.font("Serif", 22));
        t.setFill(Color.DARKRED);
        t.fillText("Serif 22", 10, 50);
        t.setFont(new Font("Monospaced", 16));
        t.setStroke(Color.BLUE);
        t.setLineWidth(1);
        t.strokeText("Mono", 130, 50);
        t.setFont(Font.font(30));
        t.fillText("Big", 150, 85);
        System.out.println("font now: " + t.getFont());

        Canvas lines = new Canvas(120.5, 60.5);
        GraphicsContext l = lines.getGraphicsContext2D();
        for (int i = 0; i < 12; i++) {
            l.setStroke(Color.color(i / 11.0, 0.5, 1 - i / 11.0));
            l.setLineWidth(1 + i % 3);
            l.strokeLine(5 + i * 9, 5, 5 + i * 9 + 4.5, 55);
        }
        System.out.println("lines: " + lines.getWidth() + " x " + lines.getHeight());

        VBox root = new VBox(5, shapes, texts, lines);
        stage.setScene(new Scene(root));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
