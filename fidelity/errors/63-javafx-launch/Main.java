import javafx.application.Application;
import javafx.stage.Stage;

public class Main {
    @Override
    public void start(Stage stage) {
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
        Application.launch(Main.class, args);
    }
}
