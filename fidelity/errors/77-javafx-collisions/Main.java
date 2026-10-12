import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Circle;
import javafx.scene.shape.Polygon;
import javafx.scene.shape.Shape;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        Circle rock = new Circle(10, 10, 5);
        if (Shape.intersect(ship, rock) != 0) {
            System.out.println("hit");
        }
        if (Shape.intersect(ship, rock)) {
            System.out.println("hit");
        }
        Shape overlap = Shape.intersect(ship, rock);
        boolean hit = overlap.getWidth() != -1;
        if (ship.intersect(rock)) {
            System.out.println("hit");
        }
        if (overlap.getBoundsInLocal() != -1) {
            System.out.println("hit");
        }
        if (overlap.getBoundsInLocal().getWidth != -1) {
            System.out.println("hit");
        }
        if (ship.intersects(rock)) {
            System.out.println("hit");
        }
        stage.setScene(new Scene(new Pane(ship, rock), 600, 400));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
