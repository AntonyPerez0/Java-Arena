import javafx.application.Application;
import javafx.scene.layout.*;
import javafx.stage.Stage;

public class Main extends Application {
    @Override
    public void start(Stage stage) {
        Label title = new Label("Counter");
        Button add = new Button("Add");
        VBox layout = new VBox(10, title, add);
        layout.setPadding(new Insets(10));
        layout.setAlignment(Pos.CENTER);
        add.setOnAction((ActionEvent event) -> title.setText("Clicked"));
        ObservableList<Node> children = layout.getChildren();
        stage.setScene(new Scene(layout));
        stage.show();
    }
}
