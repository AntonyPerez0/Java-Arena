// Probe: an exception in start. JavaFX prints its line, stop() still runs, launch throws, no window.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        stage.setScene(new Scene(new VBox(new Label("half built"))));
        stage.show();
        System.out.println("start shows the window, then fails");
        Object nothing = null;
        nothing.toString();
    }

    @Override
    public void stop() {
        System.out.println("stop still runs");
    }

    public static void main(String[] args) {
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println("launch threw " + e.getClass().getName() + ": " + e.getMessage());
            System.out.println("cause " + e.getCause());
        }
        launch(args);
    }
}
