import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label label = new Label("Hello");
        Button button = new Button("Change");
        TextField field = new TextField();
        button.setOnAction(() -> label.setText("Changed"));
        field.setOnAction((first, second) -> label.setText(field.getText()));
        field.textProperty().addListener((change, newValue) -> label.setText(newValue));
        field.textProperty().addListener(newValue -> label.setText(newValue));
        button.setOnAction(label.setText("Changed"));
        button.setOnAction(System.out.println("clicked"));
        button.setOnAction("Changed");
        button.setOnAction(label);
        button.setOnAction(this::changed);
        stage.setScene(new Scene(new VBox(label, button, field)));
        stage.show();
    }

    private void changed() {
        System.out.println("changed");
    }

    public static void main(String[] args) {
        launch(args);
    }
}
