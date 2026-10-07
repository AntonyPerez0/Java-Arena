// Probe: an exception in init, uncaught: start and stop aren't called, launch throws, no window. A task
// init queued before it failed still runs, on the JavaFX Application Thread, as the toolkit exits.
// init prints before it queues the task: real JavaFX runs a task queued in init as soon as its
// thread is free, while init goes on, so a line printed after runLater races with it.
import javafx.application.Application;
import javafx.application.Platform;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void init() throws Exception {
        System.out.println("init fails");
        Platform.runLater(() -> System.out.println("task queued in init before it failed runs on " + Thread.currentThread().getName()));
        throw new java.io.IOException("no data file");
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
    }
}
