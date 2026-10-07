import java.util.ArrayList;
import java.util.List;
import javafx.application.Application;
import javafx.scene.Node;
import javafx.scene.Scene;
import javafx.scene.control.Button;
import javafx.scene.control.Label;
import javafx.scene.layout.GridPane;
import javafx.scene.layout.VBox;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label label = new Label("0");
        Button button = new Button("Add");
        VBox box = new VBox();
        box.getChildren().add(label, button);
        box.add(label);
        box.setPadding(10);
        box.setAlignment("CENTER");
        label.setFont(20);
        label.setText(5);
        GridPane grid = new GridPane();
        grid.getChildren().add(button, 0, 0);
        grid.add(label, "0", 1);
        button.getChildren().add(label);
        ArrayList<Node> copy = box.getChildren();
        List<Button> buttons = box.getChildren();
        box.getChildren() = new ArrayList<>();
        Scene scene = new Scene();
        stage.setScene(box);
        stage.getScene().getChildren().add(label);
        stage.show();
    }

    public static void main(String[] args) {
        launch(args);
    }
}
