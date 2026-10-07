import javafx.application.Application;
import javafx.scene.Scene;
import javafx.scene.canvas.Canvas;
import javafx.scene.contol.Label;
import javafx.scene.control.*;
import javafx.scene.control.CheckBox;
import javafx.scene.layout.Button;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Slider volume = new Slider(0, 10, 5);
        Buton reset = new Buton("Reset");
        TextField name = new TextField();
        name.setOnKeyPressed(event -> System.out.println(name.getText()));
        TextArea notes = new TextArea();
        name.setOnAcion(event -> notes.clear());
        notes.setMinWidth(200);
        stage.centerOnScreen();
        stage.setScene(new Scene(new VBox(name, notes)));
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
