import javafx.application.Application;
import javafx.stage.Stage;

public class CounterApp extends Application {
    @Override
    public void start(Stage stage) {
        stage.setTitle("Counter");
        stage.show();
    }

    public static void open(String[] args) {
        Application.launch(Helper.class, args);
    }
}

class Helper {
}
