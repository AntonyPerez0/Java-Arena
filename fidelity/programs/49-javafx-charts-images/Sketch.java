import javafx.scene.canvas.Canvas;
import javafx.scene.canvas.GraphicsContext;
import javafx.scene.input.MouseEvent;
import javafx.scene.paint.Color;
import javafx.scene.text.Font;

/** A canvas with every drawing call, and drawing with the mouse. */
public class Sketch {
    final Canvas canvas;
    private double lastX;
    private double lastY;

    Sketch(double width, double height) {
        canvas = new Canvas(width, height);
        GraphicsContext g = canvas.getGraphicsContext2D();
        System.out.println("defaults " + g.getFill() + " " + g.getStroke() + " " + g.getLineWidth() + " " + g.getFont());
        g.setFill(Color.LIGHTYELLOW);
        g.fillRect(0, 0, width, height);
        g.clearRect(5, 5, 10, 10);
        g.setStroke(Color.DARKBLUE);
        g.setLineWidth(2.5);
        g.strokeRect(1, 1, width - 2, height - 2);
        g.setFill(Color.web("#ff000080"));
        g.fillOval(20, 20, 40, 30);
        g.setLineWidth(-1);
        g.strokeOval(70, 20, 30, 30);
        g.setStroke(Color.GREEN);
        g.strokeLine(0, height, width, 0);
        g.setFont(Font.font("Serif", 18));
        g.setFill(Color.BLACK);
        g.fillText("Hi, canvas \"1\"", 10, 120);
        g.setFont(new Font("Monospaced Bold", 12));
        g.strokeText("x", 200, 130);
        g.fillText(null, 0, 0);
        g.setFill(null);
        g.fillPolygon(new double[] { 120, 160, 140 }, new double[] { 100, 100, 70 }, 3);
        g.strokePolygon(new double[] { 170, 210, 190, 0 }, new double[] { 100, 100, 70, 0 }, 3);
        try {
            g.fillPolygon(new double[] { 1, 2 }, new double[] { 1, 2 }, 3);
        } catch (ArrayIndexOutOfBoundsException e) {
            System.out.println("polygon: " + e.getMessage());
        }
        System.out.println("state " + g.getFill() + " " + g.getStroke() + " " + g.getLineWidth() + " " + g.getFont().getName() + " " + (g.getCanvas() == canvas));
        canvas.setOnMousePressed(e -> {
            report("pressed", e);
            lastX = e.getX();
            lastY = e.getY();
        });
        canvas.setOnMouseDragged(e -> {
            report("dragged", e);
            g.setStroke(Color.CRIMSON);
            g.setLineWidth(3);
            g.strokeLine(lastX, lastY, e.getX(), e.getY());
            lastX = e.getX();
            lastY = e.getY();
        });
        canvas.setOnMouseReleased(e -> report("released", e));
        canvas.setOnMouseClicked(e -> {
            report("clicked", e);
            g.setFill(Color.ORANGE);
            g.fillOval(e.getX() - 4, e.getY() - 4, 8, 8);
        });
    }

    private void report(String what, MouseEvent e) {
        System.out.println(what + " " + e.getX() + " " + e.getY() + " " + e.getEventType() + " " + (e.getSource() == canvas) + " " + (e.getSceneX() == e.getX()));
    }
}
