import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label note = new Label(Files.readString(Path.of("note.txt")));
        stage.setScene(new Scene(note));
        stage.show();
    }

    @Override
    public void stop() {
        Files.writeString(Path.of("note.txt"), "closed");
    }

    public static void main(String[] args) {
        launch(args);
    }
}

class Misspelled extends Application {
    public void Start(Stage stage) {
        stage.show();
    }
}

class WrongParameter extends Application {
    @Override
    public void start() {
    }
}

class WrongReturnType extends Application {
    public int start(Stage stage) {
        return 0;
    }
}

class StaticStart extends Application {
    public static void start(Stage stage) {
    }
}

class NoStart extends Application {
}
