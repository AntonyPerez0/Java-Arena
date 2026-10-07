// Probe: Platform.exit() before launch: launch can't start, and there is no window file.
import javafx.application.Application;
import javafx.application.Platform;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        System.out.println("start");
    }

    public static void main(String[] args) {
        Platform.exit();
        System.out.println("exit called");
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println("launch: " + e + ", cause " + e.getCause());
        }
    }
}
