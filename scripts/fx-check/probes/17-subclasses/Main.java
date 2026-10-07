// Probe: a program's own classes that extend JavaFX's: the outline names the JavaFX class, and
// targets such as Button "Save" and VBox 2 find them.
import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        MenuView menu = new MenuView();
        stage.setScene(new Scene(new VBox(4, menu, new CounterLabel(), new NameField())));
        stage.setTitle("Own classes");
        stage.show();
        System.out.println("menu is a " + menu.getClass().getSuperclass().getSimpleName());
    }

    public static void main(String[] args) {
        launch(args);
    }
}

class CounterLabel extends Label {
    CounterLabel() {
        super("0");
    }

    void up() {
        setText(String.valueOf(Integer.parseInt(getText()) + 1));
    }
}
