// Probe: an exception that escapes a handler, a runLater task or a change listener is printed as
// the JavaFX Application Thread's uncaught exception, and the session goes on; one in stop().
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private int clicks;

    @Override
    public void start(Stage stage) {
        Label status = new Label("fine");
        Button crash = new Button("Crash");
        crash.setOnAction(e -> {
            clicks++;
            status.setText("crashed " + clicks);
            System.out.println("about to fail");
            throw new IllegalStateException("handler failed after " + clicks + " clicks", new ArithmeticException("the cause"));
        });
        Button later = new Button("Fail later");
        later.setOnAction(e -> {
            Platform.runLater(() -> {
                System.out.println("task runs");
                int[] none = new int[0];
                none[clicks] = 1;
            });
            Platform.runLater(() -> System.out.println("the next task still runs"));
        });
        TextField field = new TextField();
        field.textProperty().addListener((obs, old, now) -> {
            if (now.endsWith("!")) {
                throw new NumberFormatException("listener refuses " + now);
            }
            System.out.println("listener saw " + now);
        });
        field.textProperty().addListener((obs, old, now) -> System.out.println("second listener saw " + now));
        Button checked = new Button("Checked");
        checked.setOnAction(e -> {
            try {
                Integer.parseInt("x1");
            } catch (NumberFormatException ex) {
                System.out.println("caught " + ex.getMessage());
            }
        });
        stage.setScene(new Scene(new VBox(status, crash, later, field, checked)));
        stage.show();
    }

    @Override
    public void stop() {
        // A task queued in a stop() that then fails still runs, as the toolkit exits.
        Platform.runLater(() -> System.out.println("task queued in stop before it failed"));
        System.out.println("stop, then fail");
        throw new UnsupportedOperationException("stop failed");
    }

    public static void main(String[] args) {
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println("launch threw: " + e.getMessage() + ", cause " + e.getCause());
        }
    }
}
