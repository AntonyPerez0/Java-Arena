// Probe: a thread of the program's own that changes a showing window: JavaFX refuses changes to
// its panes off the JavaFX Application Thread; Platform.runLater is the way. And the numbers of
// threads made without a name (Thread-N) at every stage: JavaFX's own threads take two of them.
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    /** The name a thread made without a name gets now. */
    static String unnamed() {
        return new Thread(() -> { }).getName();
    }

    public Main() {
        System.out.println("constructor: " + unnamed());
    }

    @Override
    public void init() {
        System.out.println("init: " + unnamed());
    }

    @Override
    public void stop() {
        System.out.println("stop: " + unnamed());
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start: " + unnamed());
        VBox box = new VBox();
        Label status = new Label("waiting");
        Button work = new Button("Work");
        work.setOnAction(e -> {
            Thread worker = new Thread(() -> {
                System.out.println("worker: FX thread " + Platform.isFxApplicationThread());
                try {
                    box.getChildren().add(new Label("from the worker"));
                    System.out.println("worker added a label");
                } catch (IllegalStateException ex) {
                    System.out.println("worker: " + ex.getMessage());
                }
                Platform.runLater(() -> {
                    box.getChildren().add(new Label("added by a task"));
                    status.setText("done on " + Thread.currentThread().getName());
                });
            }, "worker");
            worker.start();
            try {
                worker.join();
            } catch (InterruptedException ex) {
                throw new IllegalStateException(ex);
            }
            System.out.println("the worker has ended; a new thread now: " + unnamed());
        });
        Thread before = new Thread(() -> {
            VBox loose = new VBox();
            loose.getChildren().add(new Label("not in a window yet"));
            System.out.println("a pane outside any window can be built on another thread: " + loose.getChildren().size());
        }, "builder");
        before.start();
        try {
            before.join();
        } catch (InterruptedException ex) {
            throw new IllegalStateException(ex);
        }
        stage.setScene(new Scene(new VBox(status, work, box)));
        stage.show();
    }

    public static void main(String[] args) {
        System.out.println("main: " + unnamed());
        launch(args);
        System.out.println("after launch: " + unnamed());
    }
}
