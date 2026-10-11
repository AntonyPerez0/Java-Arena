import javafx.animation.KeyFrame;
import javafx.animation.Timeline;
import javafx.animation.TranslateTransition;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.layout.Pane;
import javafx.scene.shape.Circle;
import javafx.stage.Stage;
import javafx.util.Duration;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Circle ball = new Circle(20, 20, 10);
        TranslateTransition move = new TranslateTransition(Duration.seconds(2), ball);
        move.setByX(200);
        move.play();
        Timeline blink = new Timeline(new KeyFrame(Duration.millis(500), event -> ball.setVisible(!ball.isVisible())));
        ScaleTransition grow = new ScaleTransition();
        stage.setScene(new Scene(new Pane(ball), 600, 400));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
