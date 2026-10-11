import javafx.animation.AnimationTimer;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Polygon;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Polygon ship = new Polygon(-5, -5, 10, 0, -5, 5);
        Pane pane = new Pane(ship);
        new AnimationTimer() {
            public void run(long now) {
                ship.setRotate(ship.getRotate() + 3);
            }
        }.start();
        new AnimationTimer() {
            @Override
            public void handle(int now) {
                ship.setTranslateX(ship.getTranslateX() + 1);
            }
        }.start();
        new AnimationTimer() {
            @Override
            public void handle() {
                ship.setTranslateY(ship.getTranslateY() + 1);
            }
        }.start();
        new AnimationTimer() {
            public void handel(long now) {
                ship.setRotate(ship.getRotate() - 3);
            }
        }.start();
        new AnimationTimer() {
        }.start();
        AnimationTimer timer = new AnimationTimer();
        new Spinner().start();
        stage.setScene(new Scene(pane, 600, 400));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}

class Spinner extends AnimationTimer {
    @Override
    public void handle(double now) {
    }
}
