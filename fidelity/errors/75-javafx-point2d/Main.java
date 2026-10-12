import javafx.application.Application;
import javafx.geometry.Point2D;
import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Polygon;
import javafx.stage.Stage;

public class Main extends Application {
    private Point2D speed = new Point2D(0, 0);

    @Override
    public void start(Stage stage) {
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        speed.x = speed.x + 0.05;
        speed.y += 0.1;
        speed.setX(1);
        ship.setTranslateX(ship.getTranslateX() + speed.x);
        speed = speed + new Point2D(1, 1);
        Point2D start = new Point2D();
        System.out.println(speed.getX + " " + start);
        stage.setScene(new Scene(new Pane(ship), 600, 400));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
