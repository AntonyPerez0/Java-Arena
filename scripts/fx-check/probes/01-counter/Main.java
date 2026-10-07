import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    private int clicks;

    @Override
    public void start(Stage stage) {
        Label count = new Label("Clicks: 0");
        Button add = new Button("Add");
        add.setOnAction(e -> {
            clicks++;
            count.setText("Clicks: " + clicks);
            System.out.println("clicked " + clicks);
        });
        stage.setScene(new Scene(new VBox(10, count, add)));
        stage.setTitle("Counter");
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
        System.out.println("done");
    }
}
