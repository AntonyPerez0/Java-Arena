// Probe: Platform.exit() in init: start and stop aren't called, and the windows count as closed. A task
// init queued before it called Platform.exit() still runs, on the JavaFX Application Thread, before
// launch returns. init prints before it queues the task: real JavaFX runs a task queued in init as
// soon as its thread is free, while init goes on, so a line printed after runLater races with it.
import javafx.application.Application;
import javafx.application.Platform;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void init() {
        System.out.println("init calls Platform.exit()");
        Platform.runLater(() -> System.out.println("task queued in init before Platform.exit() runs on " + Thread.currentThread().getName()));
        Platform.exit();
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start");
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
