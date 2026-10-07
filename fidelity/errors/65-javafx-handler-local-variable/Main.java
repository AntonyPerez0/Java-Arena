import javafx.application.Application;
import javafx.event.ActionEvent;
import javafx.event.EventHandler;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.control.TextField;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label count = new Label("Clicks: 0");
        Button add = new Button("Add");
        int clicks = 0;
        add.setOnAction(event -> {
            clicks++;
            count.setText("Clicks: " + clicks);
        });
        Button reset = new Button("Reset");
        int resets = 0;
        reset.setOnAction(new EventHandler<ActionEvent>() {
            @Override
            public void handle(ActionEvent event) {
                resets = resets + 1;
            }
        });
        TextField name = new TextField();
        String latest = "";
        name.textProperty().addListener((change, oldValue, newValue) -> {
            latest = newValue;
        });
        String greeting = "Hello";
        greeting = greeting + "!";
        Button greet = new Button("Greet");
        greet.setOnAction(event -> count.setText(greeting));
        stage.setScene(new Scene(new VBox(count, add, reset, name, greet)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
