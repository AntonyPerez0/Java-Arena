import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.paint.Color;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Pane pane = new Pane();
        pane.setPrefSize(600, 400);
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        Circle rock = new Circle(450, 200, 25, Color.GRAY);
        Rectangle wall = new Rectangle(10, 10, 20, 380);
        Line border = new Line(0, 0, 600, 0);
        Text points = new Text(10, 20, "Points: 0");
        Point2D speed = new Point2D(0, 0);
        pane.getChildren().addAll(ship, rock, wall, border, points);
        Scene scene = new Scene(pane);
        scene.setOnKeyPressed((KeyEvent event) -> {
            if (event.getCode() == KeyCode.LEFT) {
                ship.setRotate(ship.getRotate() - 5);
            }
        });
        new AnimationTimer() {
            @Override
            public void handle(long now) {
                if (Shape.intersect(ship, rock).getBoundsInLocal().getWidth() != -1) {
                    stop();
                }
            }
        }.start();
        stage.setScene(scene);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
