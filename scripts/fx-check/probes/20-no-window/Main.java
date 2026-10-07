// Probe: a start that shows no window: events can't happen, and the windows file lists none.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        stage.setScene(new Scene(new VBox(new Button("Never shown"))));
        stage.setTitle("Not shown");
        System.out.println("start forgets stage.show()");
    }

    @Override
    public void stop() {
        System.out.println("stop");
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("launch returned");
    }
}
