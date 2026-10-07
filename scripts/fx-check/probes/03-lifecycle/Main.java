// Probe: the order of main, the constructor, init, start, the events, runLater tasks and stop; the
// threads they run on; getParameters(); launch called twice; Stage and windows off the JavaFX thread;
// a task queued in stop(), which runs before launch returns.
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import javafx.application.Application;
import javafx.application.Platform;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private Label log;

    public Main() {
        System.out.println("constructor on " + where());
    }

    static String where() {
        return Thread.currentThread().getName() + " (FX thread: " + Platform.isFxApplicationThread() + ")";
    }

    @Override
    public void init() throws Exception {
        System.out.println("init on " + where());
        Parameters p = getParameters();
        List<String> raw = p.getRaw();
        System.out.println("raw " + raw + ", unnamed " + p.getUnnamed() + ", named " + new TreeMap<String, String>(p.getNamed()));
        System.out.println("same object each time: " + (p == getParameters()) + ", named size " + p.getNamed().size());
        try {
            raw.add("more");
            System.out.println("raw can be changed");
        } catch (UnsupportedOperationException e) {
            System.out.println("raw can't be changed");
        }
        try {
            Map<String, String> named = p.getNamed();
            named.put("x", "y");
            System.out.println("named can be changed");
        } catch (UnsupportedOperationException e) {
            System.out.println("named can't be changed");
        }
        try {
            new Stage();
            System.out.println("a stage made in init");
        } catch (IllegalStateException e) {
            System.out.println("no stage in init: " + e.getMessage());
        }
        Platform.runLater(() -> System.out.println("task queued in init runs on " + where()));
    }

    @Override
    public void start(Stage stage) {
        System.out.println("start on " + where() + ", stage showing " + stage.isShowing() + ", title " + stage.getTitle());
        log = new Label("started");
        Button later = new Button("Later");
        later.setOnAction(e -> {
            System.out.println("handler on " + where());
            Platform.runLater(() -> {
                System.out.println("task 1 on " + where());
                Platform.runLater(() -> System.out.println("task 3, queued by task 1"));
            });
            Platform.runLater(() -> System.out.println("task 2"));
            System.out.println("handler done");
        });
        Button quit = new Button("Quit");
        quit.setOnAction(e -> {
            System.out.println("Quit: Platform.exit()");
            // A task queued before exit() runs before stop(). (One queued after it races with
            // stop() in real JavaFX, so its place isn't checked.)
            Platform.runLater(() -> System.out.println("task queued before exit"));
            Platform.exit();
            System.out.println("after Platform.exit() in the handler");
        });
        Button nulls = new Button("Null task");
        nulls.setOnAction(e -> {
            try {
                Platform.runLater(null);
                System.out.println("runLater(null) is fine");
            } catch (NullPointerException ex) {
                System.out.println("runLater(null): NullPointerException");
            }
        });
        stage.setScene(new Scene(new VBox(log, later, quit, nulls)));
        stage.setTitle("Lifecycle");
        stage.show();
        Platform.runLater(() -> System.out.println("task queued in start, showing " + stage.isShowing()));
        System.out.println("start done");
    }

    @Override
    public void stop() {
        System.out.println("stop on " + where());
        // It runs as the toolkit exits, before launch returns. (A task that it queued in turn races
        // with the toolkit's exit in real JavaFX, so there is none.)
        Platform.runLater(() -> System.out.println("task queued in stop runs on " + where()));
    }

    public static void main(String[] args) {
        System.out.println("main on " + where());
        try {
            Platform.runLater(() -> System.out.println("never"));
        } catch (IllegalStateException e) {
            System.out.println("runLater before launch: " + e.getMessage());
        }
        launch(args);
        System.out.println("launch returned on " + where());
        try {
            launch(args);
        } catch (IllegalStateException e) {
            System.out.println("launch again: " + e.getMessage());
        }
        try {
            Application.launch(Main.class);
        } catch (IllegalStateException e) {
            System.out.println("launch(Class) again: " + e.getMessage());
        }
    }
}
