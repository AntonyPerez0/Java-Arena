// Probe: an Application whose constructor fails, and one without a public constructor. A task the
// constructor queued before it failed still runs, as the toolkit exits.
import javafx.application.Application;
import javafx.application.Platform;
import javafx.stage.Stage;

public class Main extends Application {
    private final String queued = queue();
    private final int[] sizes = new int[-1];

    private static String queue() {
        Platform.runLater(() -> System.out.println("task queued in the constructor before it failed"));
        return "queued";
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start");
    }

    public static void main(String[] args) {
        try {
            launch(args);
        } catch (RuntimeException e) {
            System.out.println(e.getMessage());
            System.out.println("cause " + e.getCause().getClass().getName() + ", its cause " + e.getCause().getCause());
        }
        System.out.println("main ends");
    }
}
