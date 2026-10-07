import javafx.application.Application;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label label = new Label("0");
        Button button = new Button("Add");
        VBox box = new VBox(label, button);
        Node first = box.getChildren().get(0);
        first.setText("Changed");
        box.getChildren().get(1).setOnAction(event -> label.setText("1"));
        Button again = box.getChildren().get(1);
        Label found = box.lookup("#count");
        for (Button each : box.getChildren()) {
            each.setDisable(true);
        }
        stage.setScene(new Scene(box));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
